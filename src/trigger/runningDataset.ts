import { logger, task } from "@trigger.dev/sdk/v3";
import { dataFormatterTask } from "./dataFormatter";
import { createClient } from "@supabase/supabase-js";



interface DatasetRunPayload {
  run_id: string;
}

export const processDatasetRun = task({
  id: "dataset-run-processor",
  maxDuration: 3600,
  machine: "medium-2x",
  run: async (payload: unknown) => {
    try {
      // Type check and validate payload
      if (!payload || typeof payload !== 'object') {
        throw new Error(`Invalid payload: expected object, got ${typeof payload}`);
      }

      const typedPayload = payload as DatasetRunPayload;
      
      if (!typedPayload.run_id) {
        throw new Error('Missing required fields in payload');
      }

      // Initialize Supabase
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY!
      );

      // Get order details from Supabase
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("run_id", typedPayload.run_id)
        .single();

      if (orderError || !order) {
        throw new Error(`Failed to retrieve order: ${orderError?.message || 'Order not found'}`);
      }

      logger.info("Fetching dataset items...", { 
        datasetId: order.dataset_id,
        runId: typedPayload.run_id
      });

      // Fetch dataset from Apify
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
      logger.info("Dataset fetched successfully", { itemCount: data.length });

      // Process the dataset using dataFormatter
      await dataFormatterTask.trigger({
        dataset: data,
        email: order.email,
        listName: order.list_name
      });

      // Update order status
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          executed: true
        })
        .eq("run_id", typedPayload.run_id);

      if (updateError) {
        throw new Error(`Failed to update order status: ${updateError.message}`);
      }

      logger.info("Dataset processing triggered successfully");
      return { 
        success: true, 
        message: "Processing started",
        order: {
          id: order.id,
          email: order.email,
          listName: order.list_name
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("Dataset processing failed", {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },
});
