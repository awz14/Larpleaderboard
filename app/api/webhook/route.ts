import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia' as any,
});

// Initialize Supabase admin client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const headerPayload = await headers();
  const signature = headerPayload.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    console.error('❌ Webhook signature verification failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const amountPaid = session.amount_total || 0; // Amount in cents

    console.log(`💰 [WEBHOOK] Payment received! User: ${userId} | Amount: £${amountPaid / 100}`);

    if (userId) {
      // 1. Fetch current total_spent
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('total_spent')
        .eq('id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('❌ Error fetching user profile:', fetchError.message);
      }

      const currentSpent = profile?.total_spent || 0;
      const newTotal = currentSpent + amountPaid;

      // 2. Update profile with new total_spent
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          total_spent: newTotal,
        });

      if (updateError) {
        console.error('❌ Supabase update failed:', updateError.message);
      } else {
        console.log(`✅ [WEBHOOK SUCCESS] Updated ${userId} total_spent to £${newTotal / 100}!`);
      }
    } else {
      console.warn('⚠️ No userId found in Stripe session metadata.');
    }
  }

  return NextResponse.json({ received: true });
}