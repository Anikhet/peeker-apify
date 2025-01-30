import { logger, task } from "@trigger.dev/sdk/v3";
import { scrapeAndExportToCsv } from "../components/utils/dataset-formatter/exportCsv";
import { DatasetItem } from "../components/utils/dataset-formatter/exportCsv";
import { sendEmail } from "../components/utils/emailNotificationService/emailNotif";

interface DataFormatterPayload {
  dataset: DatasetItem[];
  email: string;
  listName: string;
}

export const dataFormatterTask = task({
  id: "data-formatter",
  maxDuration: 3600, // 60 minutes
  machine: "medium-2x",
  run: async (payload: unknown) => {
    try {
      // Type check and validate payload
      if (!payload || typeof payload !== 'object') {
        throw new Error(`Invalid payload: expected object, got ${typeof payload}`);
      }

      const typedPayload = payload as DataFormatterPayload;
      if (!typedPayload.dataset) {
        throw new Error('Missing dataset in payload');
      }

      if (!Array.isArray(typedPayload.dataset)) {
        throw new Error(`Invalid dataset: expected array, got ${typeof typedPayload.dataset}`);
      }

      if (!typedPayload.email) {
        throw new Error('Missing email in payload');
      }

      if (!typedPayload.listName) {
        throw new Error('Missing listName in payload');
      }

      logger.log("Processing dataset", { 
        itemCount: typedPayload.dataset.length,
        email: typedPayload.email,
        listName: typedPayload.listName
      });

      // Process the dataset
      const csvData = await scrapeAndExportToCsv(typedPayload.dataset);
      
      logger.log("Data formatting completed", {
        csvLength: csvData.length
      });

      // Send email
      logger.log("Sending email...");
      await sendEmail(
        'dataset',
        { csv: csvData },
        typedPayload.listName,
        typedPayload.email
      );
      
      logger.log("Email sent successfully");
      
      return {
        success: true,
        emailSent: true
      };
    } catch (error) {
      logger.error("Task failed", {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },
});
