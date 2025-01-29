export const maxDuration = 60; // This function can run for a maximum of 60 seconds
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';

import { sendEmail } from '@/components/utils/emailNotificationService/emailNotif';
import { runApifyClient } from '@/components/utils/ApifyClient/runApifyClient';

export async function POST(req: NextRequest) {
	const payload = await req.text();
	const headersList = await headers();
	
	// Handle Stripe webhook
	const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-12-18.acacia' });
	const apikey = process.env.STRIPE_WEBHOOK_SECRET;
	const signature = headersList.get('stripe-signature') as string;
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
			const session = event.data.object as Stripe.Checkout.Session;
			console.log('Session Data:', session);
			
			try {
				console.log('Starting Apify client with session:', {
					sessionId: session.id,
					paymentStatus: session.payment_status,
					timestamp: new Date().toISOString()
				});
				
				// Wait for runApifyClient to complete instead of fire-and-forget
				await runApifyClient(session).then((runId) => {
					console.log('Apify client started successfully:', {
						runId,
						sessionId: session.id,
						timestamp: new Date().toISOString()
					});
				}).catch(async (error) => {
					console.error('Error in Apify client:', error);
					try {
						const refund = await stripe.refunds.create({
							payment_intent: session.payment_intent as string,
							reason: 'requested_by_customer',
						});
						console.log('Refund issued:', refund.id);
					} catch (refundError) {
						console.error('Error issuing refund:', refundError);
					}
					throw error; // Re-throw to trigger the outer catch block
				});
				
				return new NextResponse('Ok', { status: 200 });
			} catch (error) {
				console.error('Error initiating Apify client:', error);
				return new NextResponse('Error initiating Apify client', { status: 500 });
			}
		}
		
		case 'refund.created': {
			const refund = event.data.object;
			const metadata = refund.metadata;
			const listName = metadata?.listName;
			
			console.log('Processing refund:', refund.id);
			try {
				await sendEmail('refund', {
					refundDetails: { 
						...refund, 
						status: refund.status ?? 'unknown'
						 
						
					}
				}, listName || 'defaultListName');
				console.log('Refund notification sent successfully');
			} catch (error) {
				console.error('Error sending refund notification:', error);
			}
			break;
		}
		
		default:
			console.log(`Unhandled event type: ${event.type}`);
	}
	return new NextResponse('Ok', { status: 200 });
}