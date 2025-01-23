import { ApifyClient } from 'apify-client';
import Stripe from 'stripe';

export async function runApifyClient(session: Stripe.Checkout.Session) {
    console.log('Starting Apify client for session:', session.id);
    try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-12-18.acacia' });

        const client = new ApifyClient({
            token: process.env.ANIKHET_APIFY_KEY,
        });

        const lineItems = await stripe.checkout.sessions.retrieve(session.id, { expand: ['line_items'] });
        const productId = lineItems.line_items?.data?.[0]?.price?.product;

        if (!productId || typeof productId !== 'string') {
            throw new Error('Invalid Product ID');
        }

        const product = await stripe.products.retrieve(productId);
        if (!product || !product.description) {
            throw new Error('Product description is missing or invalid.');
        }

        const description = product.description;
        const urlMatch = description.match(/(https?:\/\/[^\s]+)/g);
        const apolloURL = urlMatch?.[0] || null;

        if (!apolloURL) {
            throw new Error('Invalid or missing URL in product description.');
        }

        console.log('Retrieved product details:', {
            productId,
            description: product.description,
            metadata: product.metadata
        });

        console.log('Parsed Apollo URL:', apolloURL);

        const input = {
            url: apolloURL,
            totalRecords: parseInt(product.metadata.totalRecords),
            getWorkEmails: Boolean(product.metadata.getWorkEmails),
            getPersonalEmails: Boolean(product.metadata.getPersonalEmails),
        };
        console.log('Apify input configuration:', input);

        // Configure webhook URL with session ID
        const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/apify-webhook`;
        console.log('Configuring webhook URL:', webhookUrl);
        
        console.log('Starting Apify actor with configuration:', {
            actorId: "jljBwyyQakqrL1wae",
            input,
            webhookUrl,
            sessionId: session.id
        });

        const run = await client.actor("jljBwyyQakqrL1wae").call(input, {
            webhooks: [{
                eventTypes: ['ACTOR.RUN.SUCCEEDED'],
                requestUrl: webhookUrl,
                payloadTemplate: JSON.stringify({
                    eventType: '{{eventType}}',
                    actorRunId: '{{actorRunId}}',
                    datasetId: '{{defaultDatasetId}}',
                    sessionId: session.id,
                    data: '{{resource.defaultDataset.items}}'
                })
            }]
        });

        console.log('Apify run started successfully:', {
            runId: run.id,
            sessionId: session.id,
            timestamp: new Date().toISOString()
        });

        return run.id;
    } catch (error) {
        console.error('Error in runApifyClient:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            sessionId: session.id,
            timestamp: new Date().toISOString(),
            stack: error instanceof Error ? error.stack : undefined
        });
        throw error;
    }
}

