import Stripe from 'stripe';
import { NextResponse, NextRequest } from 'next/server';
import { splitTextIntoKeyValuePairs } from '@/components/utils/textSplitter';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest, res: NextResponse) {
	const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
	const supabase = createClient( process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

	const {
		data: { user },
	} = await supabase.auth.getUser();

	try {
		const data = await req.json();
		const quantity = 0;

		const metadata = {
			...splitTextIntoKeyValuePairs(data.form.url),
			userId: user?.id,
			...data,
		};

		const session = await stripe.checkout.sessions.create({
			payment_method_types: ['card'],
			line_items: [
				{
					price: 'price_1Q5Hv6HZ7kxD7CPIHoXQcnL8',
					quantity: quantity,
				},
			],
			mode: 'payment',
			success_url: `${data.checkoutSessionData.returnUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${data.checkoutSessionData.returnUrl}`,
			metadata: metadata,
		});

		// Return a response with the session ID
		return NextResponse.json({ sessionId: session.id }, { status: 200 });
	} catch (error) {
		console.error('Error creating checkout session:', error);
		return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
	}
}
