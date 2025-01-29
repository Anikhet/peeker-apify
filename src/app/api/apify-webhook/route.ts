import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { dataFormatterTask } from "@/trigger/dataFormatter";

// Increase timeout for webhook processing
export const maxDuration = 60; 
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const startTime = new Date().toISOString();
  console.log("Production Apify webhook received at:", startTime);

  try {
    const payload = await req.json();
    console.log("Full webhook payload:", JSON.stringify(payload, null, 2));

    const eventType = payload.eventType;
    const actorRunId = payload.eventData?.actorRunId;

    if (eventType !== "ACTOR.RUN.SUCCEEDED") {
      console.log("Ignoring non-success event:", eventType);
      return new NextResponse("Not a success event", { status: 200 });
    }

    // Initialize Supabase with error handling
    let supabase;
    try {
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY!
      );
      console.log("Supabase initialized successfully");
    } catch (dbError) {
      console.error("Supabase initialization failed:", dbError);
      return new NextResponse("Database connection failed", { status: 500 });
    }

    // Get the pending order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("executed", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (orderError || !order?.dataset_id) {
      console.error("Failed to retrieve order:", orderError);
      return new NextResponse("Failed to retrieve order", { status: 404 });
    }

    // Fetch dataset from Apify
    console.log("Fetching dataset items...", { datasetId: order.dataset_id });
    const response = await fetch(
      `https://api.apify.com/v2/datasets/${order.dataset_id}/items`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch dataset: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Dataset fetched successfully, items:", data.length);

    try {
      // Trigger the task asynchronously
      console.log("Triggering data formatting task...");
      await dataFormatterTask.trigger({
        dataset: data,
        email: order.email,
        listName: order.list_name
      });

      // Update order status to processing
      console.log("Updating order status...");
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          executed: true,
          run_id: actorRunId,
        })
        .eq("id", order.id);

      if (updateError) {
        throw new Error(`Failed to update order status: ${updateError.message}`);
      }

      console.log("Webhook handled successfully, data processing started");
      return new NextResponse("Processing started", { status: 200 });
    } catch (processError) {
      const errorMessage = processError instanceof Error 
        ? processError.message 
        : "Unknown processing error";
      
      console.error("Failed to trigger processing:", {
        error: errorMessage,
        stack: processError instanceof Error ? processError.stack : undefined,
        orderId: order.id,
      });
      
      return new NextResponse(`Failed to trigger processing: ${errorMessage}`, { status: 500 });
    }
  } catch (error) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : "Unknown error";
      
    console.error("Webhook handler failed:", {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return new NextResponse(`Webhook handler failed: ${errorMessage}`, { status: 500 });
  }
}
