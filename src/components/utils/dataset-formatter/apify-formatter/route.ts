import { parse } from 'json2csv';
// import { type } from 'node:os';

// Scraping and exporting to CSV
export interface DatasetItem {
    website: string;
    first_name: string;
    last_name: string;
    city: string;
    seniority: string;
    state: string;
    linkedin_url: string;
    name: string;
    organization: {
        name: string;
        website_url: string;
        linkedin_url: string;
    };
    email: string;
    title: string;
    country: string;
}

export async function scrapeAndExportToCsv(dataset: any ) {
    try {
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
        const mappedItems = dataset.map((item: DatasetItem) => {
            const reorderedItem: Record<string, string> = {};

            // Add primary fields first
            primaryFields.forEach((field) => {
                const key = field
                    .replace(/ /g, '_') // Convert field names to match original keys
                    .toLowerCase()
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
                    .replace('website', 'organization_website_url') as keyof DatasetItem;

                const value = item[key];
                reorderedItem[field] = typeof value === 'object' ? JSON.stringify(value) : (value || '');
            });

            // Add the remaining fields
            Object.entries(item).forEach(([key, value]) => {
                if (!Object.keys(reorderedItem).includes(key)) {
                    reorderedItem[key] = String(value || '');
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
