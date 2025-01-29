import axios from "axios";
import * as cheerio from "cheerio";
import { AsyncParser } from "@json2csv/node";

// ---------------------------------------
// 1) Helper Function to Fetch SEO Description
// ---------------------------------------
async function fetchSeoDescription(url: string, retries = 3): Promise<string> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await axios.get(url, {
        timeout: 10000, // 10s timeout
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Referer": "https://www.google.com/",
        },
      });

      const $ = cheerio.load(response.data);
      return $('meta[name="description"]').attr("content") || "No description available";
    } catch (error: any) {
      console.error(
        `⚠️ [Attempt ${attempt + 1} of ${retries}] Failed to fetch SEO for ${url} - ${error.message}`
      );

      // Wait 3s before the next retry
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  // If all retries fail, return a fallback
  return "Error fetching description";
}

// ---------------------------------------
// 2) Type Definitions
// ---------------------------------------
export interface Organization {
  name?: string;
  website_url?: string;
  linkedin_url?: string;
  twitter_url?: string;
  facebook_url?: string;
  primary_phone?: {
    sanitized_number?: string;
  };
  market_cap?: string;
  founded_year?: number;
  // We'll store the fetched SEO description here:
  seo_description?: string;
}

export interface DatasetItem {
  organization?: Organization;
  first_name?: string;
  last_name?: string;
  email?: string;
  title?: string;
  country?: string;
  city?: string;
  state?: string;
  name?: string;
  website_url?: string;
  blog_url?: string;
  twitter_url?: string;
  facebook_url?: string;
  linkedin_url?: string;
  email_status?: string;
  headline?: string;
  organization_name?: string;
  organization_website_url?: string;
  organization_linkedin_url?: string;
}

// ---------------------------------------
// 3) Batching & Processing Function
// ---------------------------------------
async function processDataset(dataset: DatasetItem[], batchSize = 200) {
  for (let i = 0; i < dataset.length; i += batchSize) {
    const batch = dataset.slice(i, i + batchSize);

    // Fetch SEO descriptions in parallel for items in this batch
    await Promise.all(
      batch.map(async (item) => {
        if (item.organization?.website_url) {
          item.organization.seo_description = await fetchSeoDescription(
            item.organization.website_url
          );
        } else {
          // If no website URL, just store a default message
          item.organization = {
            ...item.organization,
            seo_description: "No website available",
          };
        }
        return item;
      })
    );

    console.log(`✅ Processed ${Math.min(i + batchSize, dataset.length)} / ${dataset.length} rows`);

    // 200ms delay before processing the next batch to avoid rate limits
    await new Promise((res) => setTimeout(res, 200));
  }
}

// ---------------------------------------
// 4) Main Function to Export CSV
// ---------------------------------------
export async function scrapeAndExportToCsv(dataset: DatasetItem[]) {
  try {
    // 1) Process the dataset to populate SEO descriptions
    await processDataset(dataset, 200); // Use batchSize = 200 for large volumes

    // 2) Define CSV fields
    const fields = [
      "First Name",
      "Last Name",
      "Full Name",
      "Title",
      "Headline",
      "Email",
      "Email Status",
      "LinkedIn Link",
      "Lead City",
      "Lead State",
      "Lead Country",
      "Company Name",
      "Cleaned Company Name",
      "Company Website Full",
      "Company Website Short",
      "Company Twitter Link",
      "Company Facebook Link",
      "Company LinkedIn Link",
      "Company Phone Number",
      "Company Market Cap",
      "Company SEO Description",
      "Company Founded Year",
    ];

    // 3) Convert the final dataset to CSV
    //    We assume you've populated dataset with correct keys for each field
    const opts = { fields };
    const parser = new AsyncParser(opts);
    const csv = await parser.parse(dataset).promise();

    console.log("✅ CSV data prepared successfully.");
    return csv;
  } catch (error) {
    console.error("❌ Error during scraping or exporting:", error);
    throw error;
  }
}
