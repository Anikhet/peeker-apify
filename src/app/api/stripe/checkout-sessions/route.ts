// import Stripe from 'stripe';
import { NextResponse, NextRequest } from 'next/server';
// import { stripe } from '@/lib/stripe';

export async function POST(req: NextRequest) {
	if (req.method === 'POST') {
		try {
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
