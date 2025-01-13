import { ApifyClient } from 'apify-client';
import Stripe from 'stripe';

export async function runApifyClient(session: Stripe.Checkout.Session) {
    try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-12-18.acacia' });

        const client = new ApifyClient({
            token: process.env.MOHIT_APIFY_KEY,
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




// import { ApifyApiError, ApifyClient } from 'apify-client';
// import Stripe from 'stripe';
// import { headers } from 'next/headers';

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-09-30.acacia' });

// export async function runApifyClient(session: Stripe.Checkout.Session){

//     // Initialize the ApifyClient with API token
//     const client = new ApifyClient({
//         token: process.env.MOHIT_APIFY_KEY,
//         maxRetries: 8,
//         minDelayBetweenRetriesMillis: 500, // 0.5s
//         timeoutSecs: 360 // 6 mins
//     });
    
//     // Extract relevant data from session object for the actor input
//     const lineItems = await stripe.checkout.sessions.retrieve(
//         session.id,
//         { expand: ['line_items'] }
//     );
//     const productId = lineItems.line_items?.data?.[0]?.price?.product;
 
//     let product; 

//     // Ensure productId is a string before calling stripe.products.retrieve
//     if (typeof productId === 'string') {
//         product = await stripe.products.retrieve(productId);
//         //console.log('Product Description (apolloURL):', product.description);
//     } else {
//         console.error('Product ID is not a string or does not exist.');
//         throw new Error('Invalid Product ID');
//     }

//     if (!product || !product.description) {
//         throw new Error('Product description is missing or invalid.');
//     }

//     // Preparing url for the actor input
//     const description = product.description;
//     let url = description.match(/(https?:\/\/[^\s]+)/g);
//     let apolloURL;
//     if (url) {
//         apolloURL = url[0].slice(2, -1); // Remove `${` and `}`
//     }

//     // Prepare Actor input
//     const input = {
//         "url": apolloURL,
//         "totalRecords": parseInt(product.metadata.totalRecords),
//         "getWorkEmails": Boolean(product.metadata.getWorkEmails),
//         "getPersonalEmails": Boolean(product.metadata.getPersonalEmails)
//     };

//     console.log("Here I am ");

//     (async () => {
//         try {
//             // Run the Actor and wait for it to finish
//             const run = await client.actor("jljBwyyQakqrL1wae").call(input);

//             // Fetch and print Actor results from the run's dataset (if any)
//             console.log('Results from dataset');

//             const { items } = await client.dataset(run.defaultDatasetId).listItems();
//             items.forEach((item) => {
//                 console.dir(item);
//             });

//         } catch (error) {
//             // The error is an instance of ApifyApiError
//             const { message, type, statusCode, clientMethod, path } = error as ApifyApiError;
//             // Log error for easier debugging 
//             console.log({ message, statusCode, clientMethod, path, type });
//         }
//     })();
// }









