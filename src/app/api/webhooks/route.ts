import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { runApifyClient } from './runApifyClient';
import { scrapeAndExportToCsv } from '@/components/utils/dataset-formatter/apify-formatter/route';
import { sendEmail } from '@/components/utils/emailNotificationService/route';

export async function POST(req: NextRequest) {
  const payload = await req.text();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-12-18.acacia',
  });
  const apikey = process.env.STRIPE_WEBHOOK_SECRET;
  const headersList = await headers();
  const signature = headersList.get('stripe-signature') as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, apikey!);
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return new NextResponse('Webhook error', { status: 400 });
  }

  // Respond to Stripe immediately
  new Promise(() => {
    switch (event.type) {
      case 'checkout.session.completed': {
        console.log('Payment successful!');
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata;
        const listName = metadata?.listName || 'defaultListName';

        console.log('Session ID:', session.id);

        process.nextTick(async () => {
          try {
            console.log('Running Apify client...');
            const dataset = await runApifyClient(session);

            console.log('Formatting dataset...');
            const formattedDataset = await scrapeAndExportToCsv(dataset);

            console.log('Sending email...');
            const options = {
              csv: formattedDataset,
              recepientEmail: session.customer_email,
            };
            await sendEmail('dataset', options, listName);

            console.log('Email sent successfully!');
          } catch (error) {
            console.error('Error during processing:', error);

            try {
              const refund = await stripe.refunds.create({
                payment_intent: session.payment_intent as string,
                reason: 'requested_by_customer',
              });
              console.log('Refund issued:', refund.id);
            } catch (refundError) {
              console.error('Error issuing refund:', refundError);
            }
          }
        });

        break;
      }

      case 'refund.created': {
        console.log('Refund created');
        const refund = event.data.object as Stripe.Refund;
        const listName = refund.metadata?.listName || 'defaultListName';

        process.nextTick(async () => {
          try {
            const options = {
              refundDetails: {
                ...refund,
                status: refund.status ?? 'unknown',
              },
            };
            await sendEmail('refund', options, listName);
            console.log('Refund email sent successfully!');
          } catch (refundEmailError) {
            console.error('Error sending refund email:', refundEmailError);
          }
        });

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  });

  return new NextResponse('Ok', { status: 200 });
}
