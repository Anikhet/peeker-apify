import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-01-27.acacia',
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const session_id = searchParams.get('session_id');

  console.log('Received session_id:', session_id); // Debugging

  if (!session_id) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    console.log('Stripe session:', session); // Debugging
    return NextResponse.json(session, { status: 200 });
  } catch (error) {
    console.error('Error fetching Stripe session:', error); // Debugging
    return NextResponse.json({ error: 'Failed to fetch payment session details' }, { status: 500 });
  }
}

