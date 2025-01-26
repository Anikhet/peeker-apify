import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { scrapeAndExportToCsv } from '@/components/utils/dataset-formatter/apify-formatter/route';
import { sendEmail } from '@/components/utils/emailNotificationService/route';

// Increase timeout for webhook processing
export const maxDuration = 60; // 5 minutes
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const startTime = new Date().toISOString();
    console.log('Production Apify webhook received at:', startTime);

    try {
        const payload = await req.json();
        console.log('Full webhook payload:', JSON.stringify(payload, null, 2));

        const data = payload.data;
        const actorRunId = payload.actorRunId;

        if (!data || !actorRunId) {
            console.error('Invalid payload structure:', { 
                hasData: !!data, 
                dataType: typeof data,
                hasActorRunId: !!actorRunId,
                payloadKeys: Object.keys(payload)
            });
            return new NextResponse('Invalid payload structure', { status: 400 });
        }

        // Initialize Supabase
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY!
        );

        // Get the pending order with retry
        let order;
        for (let i = 0; i < 3; i++) {
            try {
                const { data: orderData } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('executed', false)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (orderData) {
                    order = orderData;
                    break;
                }
            } catch (e) {
                console.error(`Retry ${i + 1} failed:`, e);
            }

            if (i < 2) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }

        if (!order) {
            console.error('No pending order found after retries');
            return new NextResponse('Order not found', { status: 404 });
        }

        try {
            console.log('Starting to process order:', {
                orderId: order.id,
                email: order.email,
                actorRunId,
                dataLength: data.length
            });

            // Try formatting the dataset
            let formattedDataset;
            try {
                formattedDataset = await scrapeAndExportToCsv(data);
                console.log('Dataset formatted successfully:', {
                    size: formattedDataset.length,
                    orderId: order.id
                });
            } catch (formatError) {
                console.error('Dataset formatting failed:', formatError);
                throw formatError;
            }

            // Try sending email
            try {
                await sendEmail('dataset', { csv: formattedDataset }, order.list_name);
                console.log('Email sent successfully');
            } catch (emailError) {
                console.error('Email sending failed:', emailError);
                throw emailError;
            }

            // Try updating order status
            try {
                await supabase
                    .from('orders')
                    .update({ 
                        executed: true,
                        actor_run_id: actorRunId,
                        completed_at: new Date().toISOString()
                    })
                    .eq('id', order.id);
                console.log('Order status updated successfully');
            } catch (updateError) {
                console.error('Order status update failed:', updateError);
                throw updateError;
            }

            return new NextResponse('Success', { status: 200 });
        } catch (error) {
            console.error('Processing error details:', {
                error: error instanceof Error ? error.message : error,
                stack: error instanceof Error ? error.stack : undefined,
                orderId: order.id,
                actorRunId
            });
            return new NextResponse('Processing error', { status: 500 });
        }
    } catch (error) {
        console.error('Webhook error details:', {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString()
        });
        return new NextResponse('Webhook error', { status: 400 });
    }
}
