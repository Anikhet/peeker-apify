import axios from "axios";
import * as cheerio from 'cheerio';
import { parse } from "json2csv";
// Example JSONB input
// const dataset = require('./dataset2.json');
// Fetch SEO description of the company website
async function fetchSeoDescription(url: string) {
  try {
    const response = await axios.get(url, { timeout: 50000 });
    const $ = cheerio.load(response.data);
    const metaDescription = $('meta[name="description"]').attr("content");
    return metaDescription || "No description available";
  } catch (error) {
    console.error(`Error fetching SEO description for ${url}:`, error);
    return "Error fetching description";
  }
}
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
  // linkedin_url?: string;
  name?: string;
  website_url?: string;
  blog_url?: string;
  twitter_url?: string;
  facebook_url?: string;
  linkedin_url?: string;
  email_status?: string;
  headline?: string;
  // seniority?: string;
  // is_likely_to_engage?: boolean;
  // number_of_retail_locations?: number;
  // company_seo_description?: string;
  // company_founded_year?: number;
  // company_market_cap?: string;

  organization_name?: string;
  organization_website_url?: string;
  organization_linkedin_url?: string;

  // company_seo_description?: string;
  // company_founded_year?: number;
  // company_market_cap?: string;
}

// Main function to process data and export to CSV
export async function scrapeAndExportToCsv(dataset: DatasetItem[]) {
  try {
    const fields = [
      "First Name",
      "Last Name",
      "Full Name",
      "Title",
      "Headline",
      // 'Seniority',
      "Email",
      "Email Status",
      "LinkedIn Link",
      // 'Is Likely To Engage',
      "Lead City",
      "Lead State",
      "Lead Country",
      "Company Name",
      "Cleaned Company Name",

      "Company Website Full",
      "Company Website Short",
      // 'Company Blog Link',
      "Company Twitter Link",
      "Company Facebook Link",
      "Company LinkedIn Link",
      "Company Phone Number",

      "Company Market Cap",

      // 'Number of Retail Locations',
      "Company SEO Description",
      "Company Founded Year",
    ];

    const mappedItems = await Promise.all(
      dataset.map(async (item) => {
        const company = item.organization || {};

        // Fetch SEO description
        const seoDescription = company.website_url
          ? await fetchSeoDescription(company.website_url)
          : "No website available";

        return {
          "First Name": item.first_name || "",
          "Last Name": item.last_name || "",
          "Full Name": item.name || "",
          Title: item.title || "",
          Headline: item.headline || "",
          // 'Seniority': '', // Not available in input
          Email: item.email || "",
          "Email Status": item.email_status || "",
          "LinkedIn Link": item.linkedin_url || "",
          // 'Is Likely To Engage': '', // Placeholder
          "Lead City": item.city || "",
          "Lead State": item.state || "",
          "Lead Country": item.country || "",
          "Company Name": company.name || "",
          "Cleaned Company Name": company.name || "", // Placeholder for cleaned name

          "Company Website Full": company.website_url || "",
          "Company Website Short": company.website_url || "", // Same as full in this case
          // 'Company Blog Link': '', // Placeholder
          "Company Twitter Link": company.twitter_url || "",
          "Company Facebook Link": company.facebook_url || "",
          "Company LinkedIn Link": company.linkedin_url || "",
          "Company Phone Number": company.primary_phone?.sanitized_number || "",

          "Company Market Cap": company.market_cap || "",

          "Company SEO Description": seoDescription,
          // 'Number of Retail Locations': '', // Placeholder
          "Company Founded Year": company.founded_year || "",
        };
      })
    );

    // Convert mapped items to CSV
    const csv = parse(mappedItems, { fields });

    console.log("CSV data prepared successfully.");

    return csv;
  } catch (error) {
    console.error("Error during scraping or exporting:", error);
    throw error;
  }
}
