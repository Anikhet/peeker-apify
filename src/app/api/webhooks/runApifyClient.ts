import { ApifyClient } from 'apify-client';
import Stripe from 'stripe';

export async function runApifyClient(session: Stripe.Checkout.Session) {
    try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-12-18.acacia' });

        const client = new ApifyClient({
            token: process.env.ANIKHET_APIFY_KEY,
            maxRetries: 8,
            minDelayBetweenRetriesMillis: 500, // 0.5s
            timeoutSecs: 360 // 6 mins
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

        const input = {
            url: apolloURL,
            totalRecords: parseInt(product.metadata.totalRecords),
            getWorkEmails: Boolean(product.metadata.getWorkEmails),
            getPersonalEmails: Boolean(product.metadata.getPersonalEmails),
        };

        const run = await client.actor("jljBwyyQakqrL1wae").call(input);
        console.log('Actor run started:', run.id);

        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        if (!items || items.length === 0) {
            throw new Error('No items found in the dataset');
        }

        return items;
    } catch (error) {
        console.error('Error in runApifyClient:', error);
        throw error; // Re-throw the error to handle it in the calling function
    }
}

