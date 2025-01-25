import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { scrapeAndExportToCsv } from '@/components/utils/dataset-formatter/apify-formatter/route';
import { sendEmail } from '@/components/utils/emailNotificationService/route';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const startTime = new Date().toISOString();
    console.log('Apify webhook received at:', startTime);

    try {
        const payload = await req.json();
        console.log('Apify webhook payload:', JSON.stringify(payload, null, 2));

        // Verify webhook token
        const expectedToken = process.env.APIFY_WEBHOOK_TOKEN;
        if (expectedToken && payload.token !== expectedToken) {
            console.error('Invalid webhook token');
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // Verify this is a successful run completion
        if (payload.eventType !== 'ACTOR.RUN.SUCCEEDED') {
            console.log('Ignoring non-success event:', payload.eventType);
            return new NextResponse('Not a successful run completion', { status: 200 });
        }

        const { actorRunId, datasetId, sessionId } = payload;
        if (!sessionId) {
            console.error('Missing sessionId in payload');
            return new NextResponse('Missing sessionId', { status: 400 });
        }

        console.log('Processing webhook for:', {
            actorRunId,
            datasetId,
            sessionId,
            timestamp: new Date().toISOString()
        });

        // Initialize Supabase
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY!
        );

        // Get the pending order associated with this session
        console.log('Fetching order from Supabase for session:', sessionId);
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('*')
            .eq('executed', false)
            .eq('session_id', sessionId)
            .single();

        if (orderError || !order) {
            console.error('Order lookup failed:', {
                error: orderError,
                sessionId,
                timestamp: new Date().toISOString()
            });
            return new NextResponse('Order not found', { status: 404 });
        }

        console.log('Found matching order:', {
            orderId: order.id,
            email: order.email,
            listName: order.list_name
        });

        try {
            // Format the dataset
            console.log('Starting dataset formatting for run:', actorRunId);
            const formattedDataset = await scrapeAndExportToCsv(payload.data);
            console.log('Dataset formatting completed, size:', formattedDataset.length);

            // Send email
            console.log('Preparing email for:', order.email);
            const emailType = 'dataset';
            const options = {
                csv: formattedDataset,
                recepientEmail: order.email
            };
            
            console.log('Sending email notification...');
            await sendEmail(emailType, options, order.list_name || 'defaultListName');
            console.log('Email sent successfully to:', order.email);

            // Update order status
            console.log('Updating order status in Supabase...');
            const { error: updateError } = await supabase
                .from('orders')
                .update({ executed: true })
                .eq('id', order.id);

            if (updateError) {
                console.error('Failed to update order status:', {
                    error: updateError,
                    orderId: order.id,
                    timestamp: new Date().toISOString()
                });
                return new NextResponse('Error updating order status', { status: 500 });
            }

            const endTime = new Date().toISOString();
            console.log('Webhook processing completed successfully:', {
                sessionId,
                orderId: order.id,
                startTime,
                endTime,
                duration: new Date(endTime).getTime() - new Date(startTime).getTime() + 'ms'
            });

            return new NextResponse('Success', { status: 200 });

        } catch (error) {
            console.error('Error processing webhook:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                sessionId,
                orderId: order.id,
                timestamp: new Date().toISOString(),
                stack: error instanceof Error ? error.stack : undefined
            });
            return new NextResponse('Error processing webhook', { status: 500 });
        }
    } catch (error) {
        console.error('Error parsing webhook payload:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
            stack: error instanceof Error ? error.stack : undefined
        });
        return new NextResponse('Error parsing webhook payload', { status: 400 });
    }
}
