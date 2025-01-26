import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { scrapeAndExportToCsv } from '@/components/utils/dataset-formatter/apify-formatter/route';
import { sendEmail } from '@/components/utils/emailNotificationService/route';
import { ApifyClient } from 'apify-client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const startTime = new Date().toISOString();
    console.log('Apify webhook received at:', startTime);

    try {
        const payload = await req.json();
        console.log('Apify webhook payload:', JSON.stringify(payload, null, 2));

        // Get the actorRunId and datasetId from the payload
        const actorRunId = payload.actorRunId || payload.data?.actId;
        const datasetId = payload.datasetId || payload.data?.defaultDatasetId;

        if (!actorRunId || !datasetId) {
            console.error('Missing required fields in payload');
            return new NextResponse('Missing required fields', { status: 400 });
        }

        // Initialize Apify client to get the dataset
        const client = new ApifyClient({
            token: process.env.ANIKHET_APIFY_KEY,
        });

        // Get the dataset items
        const { items: data } = await client.dataset(datasetId).listItems();

        // Initialize Supabase
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY!
        );

        // Get the pending order
        const { data: order } = await supabase
            .from('orders')
            .select('*')
            .eq('executed', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (!order) {
            console.error('Order not found');
            return new NextResponse('Order not found', { status: 404 });
        }

        try {
            // Format the dataset
            console.log('Starting dataset formatting for run:', actorRunId);
            const formattedDataset = await scrapeAndExportToCsv(data);
            console.log('Dataset formatting completed, size:', formattedDataset.length);

            // Send email
            console.log('Preparing email for:', order.email);
            await sendEmail('dataset', {
                csv: formattedDataset
            }, order.list_name);

            // Update order status
            await supabase
                .from('orders')
                .update({ 
                    executed: true,
                    dataset_id: datasetId,
                    actor_run_id: actorRunId
                })
                .eq('id', order.id);

            return new NextResponse('Success', { status: 200 });
        } catch (error) {
            console.error('Error processing webhook:', error);
            return new NextResponse('Error processing webhook', { status: 500 });
        }
    } catch (error) {
        console.error('Error parsing webhook payload:', error);
        return new NextResponse('Error parsing webhook payload', { status: 400 });
    }
}
