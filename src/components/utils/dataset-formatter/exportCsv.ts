import axios from "axios";
import * as cheerio from "cheerio";
import { AsyncParser } from "@json2csv/node";

// ---------------------------------------
// 1) Helper Function to Fetch SEO Description
// ---------------------------------------
async function fetchSeoDescription(url: string, retries = 2): Promise<string> {
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
      const seoDescription = $('meta[name="description"]').attr("content") || "No description available";

      console.log(`🔍 [SEO Found] ${url} → "${seoDescription}"`);
      return seoDescription;
    } catch (error) {
      console.error(`⚠️ [Attempt ${attempt + 1}] SEO Fetch Failed for ${url}: ${error}`);

      if (attempt < retries - 1) {
        console.log(`🔄 Retrying in 3s...`);
        await new Promise((resolve) => setTimeout(resolve, 3000)); // Retry delay
      }
    }
  }

  return "Error fetching description"; // Final fallback
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
  raw_address?: string;
  state?: string;
  keywords?: string;

}

export interface DatasetItem {
  organization?: Organization;
  first_name?: string;
  last_name?: string;
  email?: string;
  personal_emails?: string[];
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
  estimated_num_employees?: number;
  industry?: string;

}

// ---------------------------------------
// 3) Batching & Processing Function
// ---------------------------------------
async function processDataset(dataset: DatasetItem[], batchSize = 200) {
  console.log(`🚀 Processing dataset with ${dataset.length} rows...`);

  for (let i = 0; i < dataset.length; i += batchSize) {
    const batch = dataset.slice(i, i + batchSize);

    console.log(`🔄 Processing batch ${i / batchSize + 1} / ${Math.ceil(dataset.length / batchSize)}`);

    await Promise.all(
      batch.map(async (item) => {
        if (item.organization?.website_url) {
          item.organization.seo_description = await fetchSeoDescription(item.organization.website_url);
        } else {
          item.organization = {
            ...item.organization,
            seo_description: "No website available",
          };
        }
      })
    );

    console.log(`✅ Processed ${Math.min(i + batchSize, dataset.length)} / ${dataset.length} rows`);
    await new Promise((res) => setTimeout(res, 200)); // 200ms delay
  }

  // 🚀 Debugging: Log first few items after processing
  console.log("📊 Sample Processed Data:", JSON.stringify(dataset.slice(0, 5), null, 2));
}


// ---------------------------------------
// 4) Main Function to Export CSV
// ---------------------------------------
export async function scrapeAndExportToCsv(dataset: DatasetItem[]) {
  try {
    await processDataset(dataset, 200); // Process dataset

    console.log("📊 Sample Data Before CSV Export:", JSON.stringify(dataset.slice(0, 5), null, 2));

    const fields = [
      "First Name",
      "Last Name",
      "Full Name",
      "Title",
      "Headline",
      "Email",
      "Email Status",
      "Personal Emails",
      "LinkedIn Link",
      "Lead City",
      "Lead State",
      "Lead Country",
      "Company Name",
      "Company Website",
      "Company Facebook",
      "Company Twitter",
      "Company LinkedIn",
      "Company Phone",
      "Company Market Cap",
      "Company SEO Description",
      "Company Founded Year",
      "Number of Employees",
      "Industry",
      "Company Address",
      "Company State",
      "Company Keywords",

    ];

    // 🔹 Explicitly map dataset to CSV format
    const formattedData = dataset.map((item) => ({
      "First Name": item.first_name || "",
      "Last Name": item.last_name || "",
      "Full Name": item.name || "",
      "Title": item.title || "",
      "Headline": item.headline || "",
      "Email": item.email || "",
      "Email Status": item.email_status || "",
      "Personal Emails": item.personal_emails || "",
      "LinkedIn Link": item.linkedin_url || "",
      "Lead City": item.city || "",
      "Lead State": item.state || "",
      "Lead Country": item.country || "",
      "Company Name": item.organization?.name || "",
      "Company Website": item.organization?.website_url || "",
      "Company Facebook": item.organization?.facebook_url || "",
      "Company Twitter": item.organization?.twitter_url || "",
      "Company LinkedIn": item.organization?.linkedin_url || "",
      "Company Phone": item.organization?.primary_phone?.sanitized_number || "",
      "Company Market Cap": item.organization?.market_cap || "",
      "Company SEO Description": item.organization?.seo_description || "",  // 🔹 Ensure this is included
      "Company Founded Year": item.organization?.founded_year || "",
      "Number of Employees": item.estimated_num_employees || "",
      "Industry": item.industry || "",
      "Company Address": item.organization?.raw_address || "",
      "Company State" : item.organization?.state || "",
      "Company Keywords": item.organization?.keywords || "",

    }));

    const opts = { fields };
    const parser = new AsyncParser(opts);
    const csv = await parser.parse(formattedData).promise();

    console.log("✅ CSV Data Generated Successfully!");
    return csv;
  } catch (error) {
    console.error("❌ Error during scraping or exporting:", error);
    throw error;
  }
}





