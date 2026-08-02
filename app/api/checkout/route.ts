import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const { amountInCents, userId } = await req.json();

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'gbp',
        product_data: { name: 'Leaderboard Promotion' },
        unit_amount: amountInCents, 
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: 'http://localhost:3000/?success=true',
    cancel_url: 'http://localhost:3000/?canceled=true',
    client_reference_id: userId,
    metadata: { userId: userId }, 
  });

  return NextResponse.json({ url: session.url });
}