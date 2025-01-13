'use server';

import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
// import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function portal(id: string) {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
	const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
		const supabase = createClient(supabaseUrl, supabaseKey);
	const { data: customer, error: customerError } = await supabase.from('user').select('*').eq('id', id).limit(1).single();
	if (customerError) throw customerError;

	if (!customer.stripe_customer_id) {
		throw new Error('Customer not found');
	}
	const customerId = customer.stripe_customer_id;

	const portalSession = await stripe.billingPortal.sessions.create({
		customer: customerId,
		// return_url: returnUrl,
		// flow_data: {
		//   type: "payment_method_update",
		//   after_completion: {
		//     type: "redirect",
		//     redirect: {
		//       return_url: returnUrl,
		//     },
		//   },
		// },
	});

	redirect(portalSession.url);

	return portalSession.url;
}
