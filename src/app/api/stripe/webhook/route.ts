// import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import supabaseAdmin from '@/lib/supabaseAdmin';
// import { runExportApollo } from './runExportApollo';
// import { use } from 'react';
// import { supabaseAdmin } from '@/lib/supabase/supabaseAdmin';

export async function POST(req: Request): Promise<void | Response> {
	const headersList = await headers();
	const signature = headersList.get('stripe-signature');
	const stripe = new Stripe(process.env.STRIPE_API_KEY as string, {
		apiVersion: '2024-12-18.acacia',
		httpClient: Stripe.createFetchHttpClient(),
	});
	const endpointSecret = process.env.STRIPE_WEBHOOK_SIGNING_SECRET;
	let event;

	const supabase = supabaseAdmin;

	// Verify webhook signature and extract the event.
	// See https://stripe.com/docs/webhooks#verify-events for more information.
	try {
		if (!signature || !endpointSecret) throw new Error('No signature/endpointSecret provided');
		event = stripe.webhooks.constructEvent(await req.text(), signature, endpointSecret);

		if (!event) throw new Error('No event found');
		// Secondly, we use this event to query the Stripe API in order to avoid
		// handling any forged event. If available, we use the idempotency key.
		const requestOptions =
			event.request && event.request.idempotency_key
				? {
						idempotencyKey: event.request.idempotency_key,
					}
				: {};

		let retrievedEvent;

		// Retrieve the event from the Stripe API
		// eslint-disable-next-line prefer-const
		retrievedEvent = await stripe.events.retrieve(event.id, requestOptions);

		// if (event === "checkout.session.completed") {
		//   console.log(`🔔  Payment received!`);
		// }
		// Handle the event
		// Review important events for Billing webhooks
		// https://stripe.com/docs/billing/webhooks
		// Remove comment to see the various objects sent for this sample
		switch (retrievedEvent.type) {
			// --------- CASE ---------------------------------------
			case 'checkout.session.completed': {
				console.log('**********checkout.session.completed*************');
				const s = retrievedEvent.data.object as Stripe.Checkout.Session;

				console.log(s);
				if (!s.client_reference_id) {
					throw new Error('Error at checkout.session.completed, ref_id not found');
				}

				const { error: errorUpsertUser } = await supabase
					.from('organization')
					.update({
						stripe_customer_id: s.customer as string | null | undefined,
						product: s.subscription as string | null | undefined,
					})
					.eq('id', s.client_reference_id);
				if (errorUpsertUser) {
					console.error('Error at checkout.session.completed', errorUpsertUser);
				}
				console.log('checkout.session.completed finished');
				break;
			}

			// --------- CASE ---------------------------------------
			// case "payment_method.attached": {
			//   console.log("payment_method.attached");
			//   const s = retrievedEvent.data.object as Stripe.PaymentMethod;
			//   const { error: errorUpsertSub } = await supa
			//     .from("user_profile")
			//     .update({
			//       payment_method_id: s.id,
			//       payment_method_last4: s.card?.last4,
			//     })
			//     .eq("stripe_customer_id", s.customer);
			//   if (errorUpsertSub) {
			//     console.error(
			//       "Error at payment_method.created.attached",
			//       errorUpsertSub.message,
			//     );
			//   }
			//   break;
			// }
			// --------- CASE ---------------------------------------
			case 'customer.subscription.created': {
				console.log('********** customer.subscription.created **********');
				const subscription = retrievedEvent.data.object;

				console.log(subscription);
				const { error: errorUpsertSub } = await supabase
					.from('organization')
					.update({
						// subscription_id: subscription.id,
						product: subscription.items.data[0].id,
						product_status: subscription.status,
					})
					.eq('stripe_customer_id', subscription.customer);

				// Add metered billing to the subscription
				let extraMeterePriceId;
				switch (subscription.items.data[0].price.id) {
					case 'price_1PnrvZHZ7kxD7CPIee82pjDN': //starter
						extraMeterePriceId = 'price_1PnrvZHZ7kxD7CPImyvsmRcd';
						break;
					case 'price_1PnrvWHZ7kxD7CPILJgxTURo': //business
						extraMeterePriceId = 'price_1PnrvWHZ7kxD7CPIWWVqBCkG';
						break;
					case 'price_1PnrvPHZ7kxD7CPIZFIw9t5f': //growth
						extraMeterePriceId = 'price_1PnrvPHZ7kxD7CPIPpXfnTtn';
						break;

					//  DEV KEYS
					case 'price_1Pnjj2HZ7kxD7CPInFPQlRWc': //starter dev
						extraMeterePriceId = 'price_1PnjopHZ7kxD7CPIaKJX9yFa';
						break;
					case 'price_1PnjpxHZ7kxD7CPI4O204HuF': //business dev
						extraMeterePriceId = 'price_1PnjrUHZ7kxD7CPIxhewDpYW';
						break;
					case 'price_1Pnjs5HZ7kxD7CPIDD6Q9xgh': //growth dev
						extraMeterePriceId = 'price_1PnjtzHZ7kxD7CPIDDNFhR4n';
						break;
					default:
						return;
				}

				if (extraMeterePriceId) {
					const meteredItem = await stripe.subscriptionItems.create({
						subscription: subscription.id,
						price: extraMeterePriceId,
					});
					if (!(meteredItem.created > 0)) {
						console.error('Error at customer.subscription.created', meteredItem);
					}
					console.log('Meter priced adeded');
				}

				if (errorUpsertSub) {
					console.error('Error at checkout.session.completed', errorUpsertSub);
				}
				break;
			}

			case 'customer.subscription.updated': {
				console.log('**********checkout.session.updated*************');
				const subscription = retrievedEvent.data.object as Stripe.Subscription;
				console.log(subscription);
				const { error: errorUpsertSub } = await supabase
					.from('organization')
					.update({
						// subscription_id: subscription.id,
						// subscription_item_id: subscription.items.data[0].id,
						// subscription_valid_to: subscription.cancel_at,
						product_status: subscription.status,
					})
					.eq('stripe_customer_id', subscription.customer);
				if (errorUpsertSub) {
					console.error('Error at checkout.session.completed', errorUpsertSub);
				}
				break;
			}

			case 'customer.subscription.deleted': {
				console.log('**********checkout.session.deleted*************');
				const subscription = retrievedEvent.data.object as Stripe.Subscription;
				console.log(subscription);
				const stripe_customer_id = subscription.customer;
				// const valid_to = subscription.cancel_at_period_end ? subscription.current_period_end : subscription.ended_at;
				const { error: errorUpsertSub } = await supabase
					.from('organization')
					.update({
						product_status: subscription.status,
						// subscription_valid_to: valid_to,
					})
					.eq('stripe_customer_id', stripe_customer_id);
				if (errorUpsertSub) {
					console.error('Error at checkout.session.completed', errorUpsertSub);
				}
				break;
			}

			case 'invoice.finalized': {
				console.log('**********invoice.finalized*************');
				// TODO
			}

			case 'invoice.paid': {
				console.log('**********invoice.paid*************');
				const invoice = retrievedEvent.data.object as Stripe.Invoice;
				console.log(invoice);
				if (invoice.billing_reason === 'subscription_create') {
					const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
					const stripe_customer_id = invoice.customer;
					if (stripe_customer_id) {
						const { error: errorUpsertSub } = await supabase
							.from('organization')
							.update({
								product_status: subscription.status,
							})
							.eq('stripe_customer_id', stripe_customer_id);
						if (errorUpsertSub) {
							console.error('Error at checkout.session.completed', errorUpsertSub);
						}
					}
				}
				break;
			}

			case 'invoice.payment_failed': {
				console.log('**********invoice.payment_failed*************');
				const invoice = retrievedEvent.data.object as Stripe.Invoice;
				console.log(invoice);
				const stripe_customer_id = invoice.customer;
				if (stripe_customer_id) {
					const { error: errorUpsertSub } = await supabase
						.from('organization')
						.update({
							product_status: 'incomplete',
						})
						.eq('stripe_customer_id', stripe_customer_id);
					if (errorUpsertSub) {
						console.error('Error at checkout.session.completed', errorUpsertSub);
					}
				}
				break;
			}
		}
	} catch (err) {
		console.error(err);
		return new Response(`Webhook error: ${(err as Error).message}`, {
			status: 400,
		});
	}
	return Response.json('ok');

	// const payload = await req.text();
	// const parsedJson = JSON.parse(payload);

	// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-09-30.acacia' });
	// const apikey = process.env.STRIPE_WEBHOOK_SECRET;
	// const signature = headers().get('stripe-signature') as string;
	// let event: Stripe.Event;

	// try {
	// 	event = stripe.webhooks.constructEvent(payload, signature, apikey!);
	// } catch (error) {
	// 	console.error('Error verifying webhook signature:', error);
	// 	return new NextResponse('Webhook error', { status: 400 });
	// }

	// switch (event.type) {
	// 	case 'checkout.session.completed':
	// 		console.log('Payment successful!');
	// 		const session = event.data.object;
	// 		runExportApollo(session);

	// 		break;

	// 	case 'invoice.payment_succeeded':
	// 		// Handle successful subscription payment
	// 		break;
	// 	// Add more cases for other event types you want to handle
	// 	default:
	// 		console.log(`Unhandled event type: ${event.type}`);
	// }

	// return new NextResponse('Ok', { status: 200 });
}
