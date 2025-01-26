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
        console.log('Webhook payload:', {
            actorRunId: payload.actorRunId,
            dataLength: payload.data?.length,
            timestamp: new Date().toISOString()
        });

        const data = payload.data;
        const actorRunId = payload.actorRunId;

        if (!data || !actorRunId) {
            console.error('Invalid payload structure:', { data: !!data, actorRunId: !!actorRunId });
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

            if (i < 2) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }

        if (!order) {
            console.error('No pending order found after retries');
            return new NextResponse('Order not found', { status: 404 });
        }

        try {
            console.log('Processing order:', {
                orderId: order.id,
                email: order.email,
                actorRunId
            });

            const formattedDataset = await scrapeAndExportToCsv(data);
            console.log('Dataset formatted:', {
                size: formattedDataset.length,
                orderId: order.id
            });

            await sendEmail('dataset', {
                csv: formattedDataset
            }, order.list_name);

            await supabase
                .from('orders')
                .update({ 
                    executed: true,
                    actor_run_id: actorRunId,
                    completed_at: new Date().toISOString()
                })
                .eq('id', order.id);

            console.log('Order completed successfully:', {
                orderId: order.id,
                actorRunId,
                duration: `${Date.now() - new Date(startTime).getTime()}ms`
            });

            return new NextResponse('Success', { status: 200 });
        } catch (error) {
            console.error('Processing error:', {
                error,
                orderId: order.id,
                actorRunId
            });
            return new NextResponse('Processing error', { status: 500 });
        }
    } catch (error) {
        console.error('Webhook error:', {
            error,
            timestamp: new Date().toISOString()
        });
        return new NextResponse('Webhook error', { status: 400 });
    }
}
