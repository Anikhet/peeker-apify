import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { ApifyClient } from 'apify-client';


export async function runApifyClient(session: Stripe.Checkout.Session) {
  console.log("Payment successful!");
  // console.log("Full Session Data:", JSON.stringify(session, null, 2));


  const sessionId = session.id;
  const customerEmail = session.customer_details?.email;

  console.log("Session details:", {
    sessionId,
    customerEmail,
    timestamp: new Date().toISOString()
  });



  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-01-27.acacia",
  });

  // Initialize Supabase with logging
  console.log("Initializing Supabase with URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
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

  try {
    console.log("Attempting to create order with:", {
      session_id: sessionId,
      email: customerEmail,
      list_name: product.name
    });

    const { data: order } = await supabase
      .from('orders')
      .insert({
        session_id: sessionId,
        email: customerEmail,
        list_name: product.name,
        executed: false,
        created_at: new Date().toISOString(),
        records: product.metadata.totalRecords,
        url: product.description,
        price: lineItems.line_items?.data[0]?.amount_total || 0
      })
      .select()
      .single();

    if (!order) {
      throw new Error("Failed to create order");
    }

    console.log('Order created successfully:', {
      orderId: order?.id,
      sessionId,
      email: order?.email
    });

    const apifyClient = new ApifyClient({
      token: process.env.ANIKHET_APIFY_KEY,
      timeoutSecs: 0,
    });

    const run = await apifyClient    
      .task("GWKway1i5CFDcfgy3")
      .start({ 
        url: product.description,
        totalRecords: parseInt(product.metadata.totalRecords),
        getWorkEmails: Boolean(product.metadata.getWorkEmails),
        getPersonalEmails: Boolean(product.metadata.getPersonalEmails)
      });

    console.log("Apify run started successfully:", run);



    // Update order with run ID
    await supabase
      .from('orders')
      .update({ 
        run_id: run.id,
        dataset_id: run.defaultDatasetId
      })
      .eq('id', order.id);

    return run.id;

  } catch (error) {
    console.error("Error in runApifyClient:", error);
    throw error;
  }
}
// https://peeker-apify.vercel.app/api/apify-webhook/hbZg0Kb01Zti3AFQU9WPjjkeuevMJe5SXEGZemfFBVQDRxJSOfI8CTvtVHIm3hIB
