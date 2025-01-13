// import { loadStripe } from "@stripe/stripe-js";
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.NEXT_STRIPE_SECRET_KEY ?? '', {
	apiVersion: '2024-12-18.acacia',
});
