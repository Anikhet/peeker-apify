import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { runApifyClient } from './runApifyClient';

import { scrapeAndExportToCsv } from '@/components/utils/dataset-formatter/apify-formatter/route';
import { sendEmail } from '@/components/utils/emailNotificationService/route';

export async function POST(req: NextRequest) {
	const payload = await req.text();

	const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-12-18.acacia' });
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
			console.log('Session Data:', session);
			const emailType = 'dataset';
			const sessionId = session.id;
			console.log('Session ID:', sessionId);
			try {
			  console.log('Running Apify client...');
			  const dataset = await runApifyClient(session);
		  
			  console.log('Formatting dataset...');
			  const formattedDataset = await scrapeAndExportToCsv(dataset);
		  
			  console.log('Sending email...');
			  const options = { csv: formattedDataset, recepientEmail: session.customer_email };
			  await sendEmail(emailType, options);
		  
			  console.log('Email sent successfully!');
			} catch (error) {
			  console.error('Error during checkout.session.completed:', error);
		  
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
				const options = {refundDetails: { ...refund, status: refund.status ?? 'unknown' }};
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
