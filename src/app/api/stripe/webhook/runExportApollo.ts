import { glueKeyValuePairs } from '@/components/utils/textSplitter';
import Stripe from 'stripe';

export async function runExportApollo(session: Stripe.Checkout.Session) {
	const metadata = session.metadata;
	if (metadata) {
		const payload = glueKeyValuePairs(metadata);
		console.log(payload);

		const response = await fetch('https://api.exportapollo.com/v1/request_list', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: payload,
		});

		// Check if the response is OK
		if (response.ok) {
			const responseData = await response.json();

			// Log the result and list_id from the response
			console.log('Response Data:', responseData);
			console.log('Result:', responseData.result);
			console.log('List ID:', responseData.list_id);
		} else {
			// Handle errors here
			console.error('Error fetching from Export Apollo API:', response.status, response.statusText);
			const errorResponse = await response.text(); // You might want to log the text response for more context
			console.error('Error Response:', errorResponse);
		}
	}
}
