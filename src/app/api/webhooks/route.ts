import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { runApifyClient } from './runApifyClient';
import { scrapeAndExportToCsv } from '../dataset-formatter/apify-formatter/route';
import { sendEmail } from '../emailNotificationService/route';

export async function POST(req: NextRequest, res: NextResponse) {
	const payload = await req.text();

	const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-09-30.acacia' });
	const apikey = process.env.STRIPE_WEBHOOK_SECRET;
	const signature = headers().get('stripe-signature') as string;
	let event: Stripe.Event;

	try {
		event = stripe.webhooks.constructEvent(payload, signature, apikey!);
	} catch (error) {
		console.error('Error verifying webhook signature:', error);
		return new NextResponse('Webhook error', { status: 400 });
	}

	switch (event.type) {
		case 'checkout.session.completed': {

			console.log('Payment successful!');
			const session = event.data.object;
			const emailType = 'dataset';

			try{
				const dataset = await runApifyClient(session);
				const formatedDataset = await scrapeAndExportToCsv(dataset);
				const options = {csv: formatedDataset, recepientEmail: session.customer_email};
				await sendEmail(emailType, options);
			}
			catch(error){
				console.error('Error running Apify client:', error);

				//Attempt refund
				try {
                    const refund = await stripe.refunds.create({
                        payment_intent: session.payment_intent as string,
                        reason: 'requested_by_customer',
                    });
                    console.log('Refund issued:', refund.id);
                } catch (refundError) {
                    console.error('Error issuing refund:', refundError);
                }

                return new NextResponse('Apify client error; refund issued.', { status: 500 });
			}

			break;
		}

		case 'invoice.payment_succeeded':
			// Handle successful subscription payment
			break;
		
		case 'refund.created': {

			console.log('Refund created');
			const refund = event.data.object;
			const emailType = 'refund';

			try{
				const options = {refundDetails: refund};
				sendEmail(emailType, options);
			}
			catch (refundEmailError){
				console.error('Error sending refund email', refundEmailError);
			}
			break;

		}

		// Add more cases for other event types you want to handle
		default:
			console.log(`Unhandled event type: ${event.type}`);
	}

	return new NextResponse('Ok', { status: 200 });
}
