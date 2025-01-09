import sgMail from '@sendgrid/mail';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Set up SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

// Send email with the CSV attachment
export async function sendEmail(type: string, options: any) {
    try {

        let msg: any = {
            from: 'team@peeker.ai',
        };

        switch (type) {
            
            case 'dataset': {
                // Handle dataset email
                // Read file content and encode it in base64
                // Define a platform-independent temporary file path
                const tempFilePath = path.join(os.tmpdir(), 'dataset.csv');

                // Write CSV data to the temporary file
                await fs.writeFile(tempFilePath, options.csv, { encoding: 'utf8' });

                // Read file content and encode it in base64
                const fileContent = await fs.readFile(tempFilePath, { encoding: 'base64' });

                
                msg = {
                    to: 'animulky@gmail.com', // Retrieve from session object that is in options
                    from: 'team@peeker.ai', // Change to your verified sender
                    subject: 'Here is your dataset!',
                    text: 'Please find the requested dataset attached. Download and enjoy!',
                    html: '<strong>Powered by Peeker.ai</strong>',
                    attachments: [
                        {
                            content: fileContent,
                            filename: 'dataset.csv',
                            type: 'text/csv',
                            disposition: 'attachment',
                        },
                    ],
                };

                await sgMail.send(msg);
                console.log('Email sent successfully');
            }

            
            case 'refund': {
                const refundMessage = `
                    Dear User,
                    
                    We regret to inform you that we encountered an issue while generating your dataset.
                    As a result, we have issued a refund to your payment method.

                    Refund Details:
                    Refund ID: ${options.refundDetails.id}
                    Amount: ${options.refundDetails.amount / 100} ${options.refundDetails.currency.toUpperCase()}
                    Status: ${options.refundDetails.status}

                    We sincerely apologize for the inconvenience caused.

                    Best regards,
                    The Peeker.ai Team
                `;

                msg = {
                    to: 'animulky@gmail.com', // Retrieve from session object that is in options
                    from: 'team@peeker.ai', // Change to your verified sender
                    subject: 'Refund Issued for Your Payment',
                    text: refundMessage,
                    html: `<p>${refundMessage.replace(/\n/g, '<br>')}</p>`,
                };
                break;
            }

            default: {
                throw new Error(`Unsupported email type: ${options.type}`);
            }
                
        }
        await sgMail.send(msg);
        console.log('Email sent successfully');

    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}

