import Stripe from 'stripe';
import { NextResponse, NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
	const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);


	try {
		// if (!user) throw new Error('User not found');
		
		const data = await req.json();

		const lineItemsData = {
			quantity: 1, // Always set quantity to 1 because we'll dynamically calculate the price
			price_data: {
			  currency: 'usd',
			  product_data: {
				name: 'Apollo lead list by Apollo Scraper',
				description: `Get ${data.formData.leadCount} scraped leads from apollo for your url ${data.formData.apolloURL}`,
				metadata: {
					totalRecords: data.formData.leadCount,
					getPersonalEmails: data.formData.personalEmails,
					getWorkEmails: data.formData.workEmails,
					listName: data.formData.listName, // Include listName here
				}
			  },
			  unit_amount: Math.round(data.formData.leadCount * 0.005 * 100), // Calculate total price in cents
			},
		};

		const session = await stripe.checkout.sessions.create({
			payment_method_types: ['card'],
			line_items: [lineItemsData],
			mode: 'payment',
			success_url: `${data.returnUrl}/payment-session/success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${data.returnUrl}/payment-session/failure`,
		  });
		  
		console.log('Success URL:', `${data.returnUrl}/payment-session/success?session_id={CHECKOUT_SESSION_ID}`);
		console.log('Cancel URL:', `${data.returnUrl}/payment-session/failure`);


		// Return a response with the session ID
		return NextResponse.json({ sessionId: session.id }, { status: 200 });
	} catch (error) {
		console.error('Error creating checkout session:', error);
		return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
	}
}

