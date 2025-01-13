/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { ChangeEvent, useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Info } from 'lucide-react';

import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';

export default function BuyApollo() {
	const [, setLoading] = useState<boolean>(false);
	const [isSuccess, setIsSuccess] = useState(false);

	// Individual states for every toggle switch
	const [personalEmails, setPersonalEmails] = useState<boolean>(false);
	const [workEmails, setWorkEmails] = useState<boolean>(false);
	// const [isExtraColumns, setExtraColumns] = useState<boolean>(false);
	// const [usePeekerCredits, setUsePeekerCredits] = useState<boolean>(false);

	// State for form data
	// const [listName, setListName] = useState<string>();
	const [apolloURL, setApolloURL] = useState<string>();
	const [leadCount, setLeadCount] = useState<number>();

	// Validation error states for input fields
	// const [isListNameInvalid, setIsListNameInvalid] = useState(false);
	const [isApolloURLInvalid, setIsApolloURLInvalid] = useState(false);
	const [isLeadCountInvalid, setIsLeadCountInvalid] = useState(false);

	// State for the price
	const [price, setPrice] = useState(0);

	// // State for leads downloading instructions
	// const [leadsToInbox, setleadsToInbox] = useState(false);
	// // const [addLeadsToCampaign, setaddLeadsToCampaign] = useState(false);

	const handleLeadCountChange = (e: ChangeEvent<HTMLInputElement>) => {
		const value = parseInt(e.target.value);
		setLeadCount(value);

		if (value >= 100 && value <= 1000000) {
			setIsLeadCountInvalid(false); // Valid input
			const newPrice = Math.ceil(value / 200);
			setPrice(newPrice);
		} else {
			setPrice(0);
			setIsLeadCountInvalid(true); // Invalid input, turns red
		}
	};

	// // Real-time validation for List Name
	// const handleListNameChange = (e: ChangeEvent<HTMLInputElement>) => {
	// 	const value = e.target.value;
	// 	setListName(value);

	// 	// Validate List Name in real time
	// 	if (value.trim() === '') {
	// 		setIsListNameInvalid(true);
	// 	} else {
	// 		setIsListNameInvalid(false); // Reset if valid
	// 	}
	// };

	// Real-time validation for Apollo URL
	const handleURLChange = (e: ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setApolloURL(value);

		// Validate Apollo URL in real time
		// const isValidURL = /^https:\/\/app\.apollo\.io\/$/.test(value.trim());
		// if (!isValidURL) {
		// 	setIsApolloURLInvalid(true);
		// } else {
		// 	setIsApolloURLInvalid(false); // Reset if valid
		// }
	};

	const handleSubmit = async (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
		event.preventDefault();

		setLoading(true);

		// Basic validation checks
		let isValid = true;

		// if (!listName) {
		// 	toast.error('Invalid Input', {
		// 		description: 'Please enter a valid list name.',
		// 	});
		// 	isValid = false;
		// }

	
		// if (!apolloURL || !/^https:\/\/app\.apollo\.io(\/.*)?$/.test(apolloURL.trim())) {
		// 	toast.error('Invalid Apollo URL', {
		// 		description: 'Please enter the correct Apollo URL starting with: https://app.apollo.io/',
		// 	});
		// 	isValid = false;
		// }
		

		if (!leadCount || leadCount < 100 || leadCount > 1000000) {
			setIsLeadCountInvalid(true);
			toast.error('Invalid Lead Count', {
				description: 'Lead count must be between 100 and 1,000,000.',
			});
			isValid = false;
		}

	

		if (!isValid) return; // Stop if validation fails

		const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY ?? '');

		if (!stripe) {
			toast.error('We cannot proceed');
			return;
		}

		// Payload for list processing
		const formData = {
			apolloURL,
			leadCount,
			personalEmails,
			workEmails
		};

		const payload = {
			formData,
			//returnUrl: window.location.href,
			returnUrl: 'http://localhost:3000/',
		};

		console.log("return url "+window.location.href);

		// Calling backend API to create a checkout session
		const response = await fetch('/api/stripe/checkout/datalist', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});

		if (response.ok) {
			const { sessionId } = await response.json();
			await stripe.redirectToCheckout({ sessionId });
		} else {
			toast.error('Checkout failed', { description: 'Failed to create checkout session. Please try again.' });
		}

		setLoading(false);
	};
	const searchParams = useSearchParams();
	useEffect(() => {
		// Check if we have a success paramter in the URL
		
		const session = searchParams.get('session');
		if (session) {
			setIsSuccess(true);
		}
	}, [searchParams]);

	return (
		<div className='w-full'>
			<div className='w-full border-b py-4'>
				<div className='mx-auto max-w-sm'>
					<h1 className='pointer-events-none mx-auto text-4xl font-bold'>Apollo Scraper</h1>
				</div>
			</div>

			{isSuccess ? (
				<div className='mx-auto mt-10 flex max-w-sm items-center justify-center overflow-auto'></div>
			) : (
				<div className='mx-auto h-[70%] mt-10 flex max-w-sm items-center justify-center overflow-auto'>
					<form className='flex flex-col gap-4' method='POST'>
						<section className='flex flex-col gap-2'>
							{/* <div>
								<Label>What would you like to name your list?</Label>
								<Input
									type='text'
									value={listName}
									name='List Name'
									onChange={handleListNameChange}
									className={cn({ 'border-destructive': isListNameInvalid })}
								/>
							</div> */}

							<div>
								<Label>Your Apollo Search URL</Label>
								<Input
									type='text'
									value={apolloURL}
									name='Apollo URL'
									onChange={handleURLChange}
									className={cn({ 'border-destructive': isApolloURLInvalid })}
								/>
							</div>

							<div>
								<Label>Number of contacts (100 min - 100K max)</Label>
								<Input
									type='number'
									name='Lead count'
									value={leadCount}
									onChange={handleLeadCountChange}
									className={cn({ 'border-destructive': isLeadCountInvalid })}
								/>
							</div>
						</section>

						{/* Toggle Buttons */}
						<div className='flex flex-col gap-5 font-semibold'>
							<section className='flex flex-col gap-4'>
								<div className='mt-2 rounded-md bg-muted p-2'>
									<span className='flex items-center gap-2 text-muted-foreground'>
										<Info className='size-4' /> Good to know
									</span>
									<Label className='text-muted-foreground'>
										Set the Apollo link to only scrape leads with emails available. Ignore if you&apos;ve already set email
										status filter in Apollo
									</Label>
								</div>

								<div className='flex flex-row items-center justify-between'>
									<Label>Get Work Emails</Label>
									<Switch
										// Reflect the current visibility of the column
										onCheckedChange={() => setWorkEmails((prev) => !prev)} // Handle switch toggle
									/>
								</div>

								<div className='flex flex-row items-center justify-between'>
									<Label>Get Personal Emails</Label>
									<Switch
										onCheckedChange={() => setPersonalEmails((prev) => !prev)} // Handle switch toggle
									/>
								</div>

								{/* <div className='flex flex-row items-center justify-between'>
									<Label>Get extra columns like SEO Description, Industry, Employee Count, etc.</Label>
									<Switch
										onCheckedChange={() => setExtraColumns((prev) => !prev)} // Handle switch toggle
									/>
								</div>

								<div className='flex flex-row items-center justify-between'>
									<Label>Send leads to my inbox</Label>
									<Switch
										checked={leadsToInbox}
										onCheckedChange={() => setleadsToInbox(!leadsToInbox)} // Handle switch toggle
									/>
								</div> */}

								{/* <div className='flex flex-row gap-5'>
							<Switch
								checked={addLeadsToCampaign}
								onCheckedChange={() => setaddLeadsToCampaign(!addLeadsToCampaign)} // Handle switch toggle
							/>
							<label>Add leads directly to my campaign</label>
						</div> */}
							</section>
						</div>

						{/* Dynamic Pricing Box */}
						{/* <div className='h-11 w-auto rounded-lg bg-black p-2 px-8 text-lg font-semibold text-white'>
							<p>Price: ${price}</p>
						</div> */}

						<Button className='mt-2' onClick={handleSubmit}>
							Pay and Scrape
						</Button>
					</form>
				</div>
			)}
		</div>
	);
}




