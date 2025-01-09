import Stripe from 'stripe';
import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest, res: NextResponse) {
	const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

	// const supabase = createClient();

	// const {
	// 	data: { user },
	// } = await supabase.auth.getUser();

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
				}
			  },
			  unit_amount: Math.round(data.formData.leadCount * 0.005 * 100), // Calculate total price in cents
			},
		};

		const session = await stripe.checkout.sessions.create({
			payment_method_types: ['card'],
			line_items: [lineItemsData],
			mode: 'payment',
			success_url: `${data.returnUrl}/payment-status/success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${data.returnUrl}/payment-status/failure`,
		});

		// Return a response with the session ID
		return NextResponse.json({ sessionId: session.id }, { status: 200 });
	} catch (error) {
		console.error('Error creating checkout session:', error);
		return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
	}
}





// Old code by Oliver with 'splitting url into chunks' logic to handle stripe 500 character limit edge case 

// import Stripe from 'stripe';
// import { NextResponse, NextRequest } from 'next/server';
// import { createClient } from '@/lib/supabase/server';
// import { splitTextIntoKeyValuePairs } from '@/components/utils/textSplitter';

// export async function POST(req: NextRequest, res: NextResponse) {
// 	const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
// 	const supabase = createClient();

// 	const {
// 		data: { user },
// 	} = await supabase.auth.getUser();

// 	try {
// 		if (!user) throw new Error('User not found');

// 		const data = await req.json();

// 		const metadata = {
// 			...splitTextIntoKeyValuePairs(JSON.stringify(data.form)),
// 			userId: user.id,
// 		};

// 		const session = await stripe.checkout.sessions.create({
// 			payment_method_types: ['card'],
// 			line_items: [
// 				{
// 					price: 'price_1Q5Hv6HZ7kxD7CPIHoXQcnL8',
// 					quantity: data.form.leadCount,
// 				},
// 			],
// 			mode: 'payment',
// 			success_url: `${data.returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
// 			cancel_url: `${data.returnUrl}`,
// 			metadata: metadata,
// 		});

// 		// Return a response with the session ID
// 		return NextResponse.json({ sessionId: session.id }, { status: 200 });
// 	} catch (error) {
// 		console.error('Error creating checkout session:', error);
// 		return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
// 	}
// }