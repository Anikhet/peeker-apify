// import Stripe from 'stripe';
import { NextResponse, NextRequest } from 'next/server';
// import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
	if (req.method === 'POST') {
		try {
			//const data = req.body;
			// const data = await req.json();

			// Map cart items to the Stripe line_items format
			// const lineItemsData = {
			// 	price: 'price_1Q5Hv6HZ7kxD7CPIHoXQcnL8',
			// 	quantity: data.checkoutSessionData.leadCount,
			// };

			// console.log('PAYLOAD ' + JSON.stringify(data.modifiedFormData));

			// const api_key = process.env.CONRAD_EXPORTAPOLLO_API_KEY;

			// const formDataWithApiKey = {
			// 	api_key,
			// 	...data.modifiedFormData,
			// };

			// const session = await stripe.checkout.sessions.create({  //
			// 	payment_method_types: ['card'],
			// 	line_items: [lineItemsData],
			// 	mode: 'payment',
			// 	success_url: `${data.checkoutSessionData.returnUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
			// 	cancel_url: `${data.checkoutSessionData.returnUrl}`,
			// 	metadata: {
			// 		formDetails: JSON.stringify(formDataWithApiKey),
			// 	},
			// });

			// Return a response with the session ID
			// session.id
			return NextResponse.json({ sessionId: '' }, { status: 200 });
		} catch (error) {
			console.error('Error creating checkout session:', error);
			return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
		}
	} else {
		// Given an incoming request...
		const newHeaders = new Headers(req.headers);

		// Add a new header
		newHeaders.set('Allow', 'POST');
		return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
	}
}
