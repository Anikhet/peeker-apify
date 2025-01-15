import sgMail, { MailDataRequired } from '@sendgrid/mail';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Set up SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

// Types for the `options` parameter
interface DatasetOptions {
  csv: string; // CSV content as a string
}

interface RefundDetails {
  id: string;
  amount: number; // Amount in cents
  currency: string;
  status: string;
}

interface RefundOptions {
  refundDetails: RefundDetails;
}

type EmailOptions = DatasetOptions | RefundOptions;

// Union type for the supported email types
type EmailType = 'dataset' | 'refund';

// Send email with the CSV attachment
export async function sendEmail(type: EmailType, options: EmailOptions, listName : string): Promise<void> {
  try {
    let msg: MailDataRequired;

    switch (type) {
      case 'dataset': {
        // Validate options type for dataset
        if (!('csv' in options)) {
          throw new Error('Invalid options for dataset email. Missing "csv" property.');
        }

        const datasetOptions = options as DatasetOptions;

        // Define a platform-independent temporary file path
        const tempFilePath = path.join(os.tmpdir(), 'dataset.csv');

        // Write CSV data to the temporary file
        await fs.writeFile(tempFilePath, datasetOptions.csv, { encoding: 'utf8' });

        // Read file content and encode it in base64
        const fileContent = await fs.readFile(tempFilePath, { encoding: 'base64' });

        msg = {
          to: 'animulky@gmail.com', // Replace with dynamic email
          from: 'team@peeker.ai', // Change to your verified sender
          subject: 'Here is your dataset!',
          text: 'Please find the requested dataset attached. Download and enjoy!',
          html: '<strong>Powered by Peeker.ai</strong>',
          attachments: [
            {
              content: fileContent,
              filename: listName+'.csv',
              type: 'text/csv',
              disposition: 'attachment',
            },
          ],
        };
        break;
      }

      case 'refund': {
        // Validate options type for refund
        if (!('refundDetails' in options)) {
          throw new Error('Invalid options for refund email. Missing "refundDetails" property.');
        }

        const refundOptions = options as RefundOptions;

        const refundMessage = `
          Dear User,
          
          We regret to inform you that we encountered an issue while generating your dataset.
          As a result, we have issued a refund to your payment method.

          Refund Details:
          Refund ID: ${refundOptions.refundDetails.id}
          Amount: ${(refundOptions.refundDetails.amount / 100).toFixed(2)} ${refundOptions.refundDetails.currency.toUpperCase()}
          Status: ${refundOptions.refundDetails.status}

          We sincerely apologize for the inconvenience caused.

          Best regards,
          The Peeker.ai Team
        `;

        msg = {
          to: 'animulky@gmail.com', // Replace with dynamic email
          from: 'team@peeker.ai', // Change to your verified sender
          subject: 'Refund Issued for Your Payment',
          text: refundMessage,
          html: `<p>${refundMessage.replace(/\n/g, '<br>')}</p>`,
        };
        break;
      }

      default: {
        throw new Error(`Unsupported email type: ${type}`);
      }
    }

    // Send the email
    await sgMail.send(msg);
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}
