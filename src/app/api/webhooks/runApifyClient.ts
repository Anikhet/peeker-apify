import { ApifyClient } from "apify-client";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// import { scrapeAndExportToCsv, sendEmail } from './your-utils'; // <--- If you have these utilities

export async function runApifyClient(session: Stripe.Checkout.Session) {
  console.log("Payment successful!");
  console.log("Session Data:", session);

  //   const emailType = 'dataset';
  const sessionId = session.id;
  console.log("Session ID:", sessionId);

//   const metadata = session.metadata;
  //   const listName = metadata?.listName; // Retrieve listName if present

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-12-18.acacia",
  });

  // Initialize Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY!
  );

  const lineItems = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ["line_items"],
  });
  const productId = lineItems.line_items?.data?.[0]?.price?.product;

  if (!productId || typeof productId !== "string") {
    throw new Error("Invalid Product ID");
  }

  const product = await stripe.products.retrieve(productId);
  if (!product || !product.description) {
    throw new Error("Product description is missing or invalid.");
  }

  const description = product.description;
  const urlMatch = description.match(/(https?:\/\/[^\s]+)/g);
  const apolloURL = urlMatch?.[0] || null;

  if (!apolloURL) {
    throw new Error("Invalid or missing URL in product description.");
  }

  try {
    // Create order record in Supabase
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        session_id: sessionId,
        email: session.customer_details?.email,
        list_name: product.name,
        executed: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (orderError) {
      console.error('Failed to create order:', orderError);
      throw new Error('Failed to create order in database');
    }

    console.log('Order created successfully:', {
      orderId: order.id,
      sessionId,
      email: order.email
    });

    // ------------------------------------------------------------------------------
    // If you intended to scrape data with an Actor and then use that data,
    // you could do so AFTER the Actor run finishes, or via the webhook callback.
    // For now, we'll keep the invocation straightforward.
    // -----------------------------------------------------------------------------

    // 1. Initialize Apify client
    const client = new ApifyClient({ token: process.env.ANIKHET_APIFY_KEY });

    // 2. Define any specific input your Actor needs
    const input = {
      url: apolloURL,
      totalRecords: parseInt(product.metadata.totalRecords),
      getWorkEmails: Boolean(product.metadata.getWorkEmails),
      getPersonalEmails: Boolean(product.metadata.getPersonalEmails),
    };

    console.log("Starting Apify client for session:", sessionId);

    // 3. Configure the webhook
    const webhookUrl = "https://peeker-apify.vercel.app/api/apify-webhook";
    const webhookToken = process.env.APIFY_WEBHOOK_TOKEN;
    if (!webhookToken) {
      throw new Error("APIFY_WEBHOOK_TOKEN is not configured");
    }
    console.log("Webhook configuration:", {
      url: webhookUrl,
      token: webhookToken ? "present" : "missing",
      sessionId,
    });

    console.log("Starting Apify actor with configuration:", {
      actorId: "jljBwyyQakqrL1wae",
      input,
      webhookUrl,
      sessionId,
    });

    // 4. Call the Actor with the webhook settings
    const run = await client.actor("jljBwyyQakqrL1wae").call(input, {
      webhooks: [
        {
          eventTypes: ["ACTOR.RUN.SUCCEEDED"],
          requestUrl: webhookUrl,
          payloadTemplate: JSON.stringify({
            eventType: "{{eventType}}",
            actorRunId: "{{actorRunId}}",
            datasetId: "{{defaultDatasetId}}",
            sessionId: sessionId,
            data: "{{resource.defaultDataset.items}}",
            token: webhookToken,
          }),
        },
      ],
    });

    console.log("Apify run started successfully:", {
      runId: run.id,
      sessionId: sessionId,
      timestamp: new Date().toISOString(),
    });

    // ------------------------------------------------------------------------------
    // 5. (Optional) If you need to process data immediately *after* the run completes,
    //    you'd typically wait for it to finish and then download the results.
    //    For example (pseudo-code):
    //
    //    const { defaultDatasetId } = run;
    //    const records = await client.dataset(defaultDatasetId).listItems();
    //    const formattedDataset = await scrapeAndExportToCsv(records.items);
    //    const options = { csv: formattedDataset, recepientEmail: session.customer_email };
    //    await sendEmail(emailType, options, listName || 'defaultListName');
    // ------------------------------------------------------------------------------

    return run.id;
  } catch (error) {
    console.error("Error in runApifyClient:", {
      error: error instanceof Error ? error.message : "Unknown error",
      sessionId: sessionId,
      timestamp: new Date().toISOString(),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}
// https://peeker-apify.vercel.app/api/apify-webhook/hbZg0Kb01Zti3AFQU9WPjjkeuevMJe5SXEGZemfFBVQDRxJSOfI8CTvtVHIm3hIB
