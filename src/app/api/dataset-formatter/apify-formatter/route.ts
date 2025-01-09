import { parse } from 'json2csv';
import { type } from 'node:os';

// Scraping and exporting to CSV
export async function scrapeAndExportToCsv(dataset: any) {
    try {
        // // Convert normalized JSON items to CSV
        // const fields = Object.keys(items[0]);
        // const csv = parse(items, { fields });

        // Define the fields to appear at the front
        const primaryFields = [
            'Website',
            'First Name',
            'Last Name',
            'City',
            'Seniority',
            'State',
            'Personal Linkedin',
            'Full Name',
            'Company Name',
            'Email',
            'Title',
            'Country',
            'Company Linkedin',
        ];

        // Extract and reorder fields
        const mappedItems = dataset.map((item: { [x: string]: any; }) => {
            const reorderedItem : Record<string, any> = {};

            // Add primary fields first
            primaryFields.forEach(field => {
                // Map each field to its respective property in the original data
                reorderedItem[field] = item[
                    field.replace(/ /g, '_').toLowerCase() // Convert field names to match original keys
                        .replace('full_name', 'name')
                        .replace('company_name', 'organization/name')
                        .replace('company_linkedin', 'organization_linkedin_url')
                        .replace('personal_linkedin', 'linkedin_url')
                        .replace('first_name', 'first_name')
                        .replace('last_name', 'last_name')
                        .replace('title', 'title')
                        .replace('city', 'city')
                        .replace('state', 'state')
                        .replace('country', 'country')
                        .replace('email', 'email')
                        .replace('website', 'organization_website_url')
                ] || '';
            });

            // Add the remaining fields
            Object.keys(item).forEach(key => {
                if (!Object.keys(reorderedItem).includes(key)) {
                    reorderedItem[key] = item[key];
                }
            });

            return reorderedItem;
        });

        // Convert mapped items to CSV
        const csv = parse(mappedItems);

        console.log('CSV data prepared successfully.');
        
        return csv;
    } catch (error) {
        console.error('Error during scraping or exporting:', error);
        throw error;
    }
}