import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { sendEmail } from '@/components/utils/emailNotificationService/emailNotif';
import { scrapeAndExportToCsv } from "@/components/utils/dataset-formatter/exportCsv";
// import { scrapeAndExportToCsv } from '@/components/utils/dataset-formatter/exportCsv';

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

    const { data: datasetData, error: datasetError } = await supabase
      .from("orders")
      .select("dataset_id")
      .eq("run_id", actorRunId)
      .single();

    if (datasetError || !datasetData?.dataset_id) {
      console.error("Failed to retrieve dataset_id:", datasetError);
      return new NextResponse("Failed to retrieve dataset_id", { status: 404 });
    }

    const datasetId = datasetData.dataset_id;

    // Then fetch the dataset items
    console.log("Fetching dataset items...", { datasetId });
    const response = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items`,
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

    // Get the pending order with detailed logging
    let order;
    try {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("executed", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (orderError) {
        console.error("Order query failed:", orderError);
        return new NextResponse("Order query failed", { status: 500 });
      }

      if (!orderData) {
        console.error("No pending order found");
        return new NextResponse("No pending order found", { status: 404 });
      }

      order = orderData;
      console.log("Found order:", {
        orderId: order.id,
        email: order.email,
        created_at: order.created_at,
      });
    } catch (orderError) {
      console.error("Order retrieval failed:", orderError);
      return new NextResponse("Order retrieval failed", { status: 500 });
    }

    // Process the data
    try {
      // Format dataset
      console.log("Starting data formatting...");
      const formattedDataset = await scrapeAndExportToCsv(data);
      console.log(
        "Data formatted successfully, length:",
        formattedDataset.length
      );

      // Skip email for now
      console.log("Would send email to:", order.email);
      await sendEmail('dataset', {
          csv: formattedDataset
      }, order.list_name, order.email);

      // Update order status
      console.log("Attempting to update order status...");
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          executed: true,
          run_id: actorRunId,
          // completed_at: new Date().toISOString()
        })
        .eq("id", order.id);

      if (updateError) {
        console.error("Update error:", updateError);
        throw updateError;
      }

      console.log("Order updated successfully");
      return new NextResponse("Success", { status: 200 });
    } catch (processError) {
      console.error("Processing failed:", {
        error:
          processError instanceof Error ? processError.message : processError,
        stack: processError instanceof Error ? processError.stack : undefined,
        orderId: order?.id,
      });
      return new NextResponse(
        `Processing failed: ${
          processError instanceof Error
            ? processError.message
            : JSON.stringify(processError)
        }`,
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Webhook handler failed:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return new NextResponse("Webhook handler failed", { status: 500 });
  }
}
