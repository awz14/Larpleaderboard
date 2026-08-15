import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Use the Service Role Key to bypass RLS and securely write to the database
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const params = await req.json();
    const signature = req.headers.get('x-nowpayments-sig');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify cryptographic signature via NOWPayments exact Node.js specifications
    const sortedKeys = Object.keys(params).sort();
    const sortedParamsString = JSON.stringify(params, sortedKeys);
    
    const hmac = crypto.createHmac('sha512', process.env.NOWPAYMENTS_IPN_SECRET!);
    hmac.update(sortedParamsString);
    const computedSignature = hmac.digest('hex');

    if (computedSignature !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    // 'finished' means the crypto is 100% confirmed and sitting in your wallet
    if (params.payment_status === 'finished') {
      const userId = params.order_id;
      
      // Convert the GBP fiat value back into cents for Supabase math
      const paidAmountCents = Math.round(parseFloat(params.price_amount) * 100);

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('total_spent')
        .eq('id', userId)
        .single();

      const newTotal = (profile?.total_spent || 0) + paidAmountCents;

      // Update their leaderboard score instantly
      await supabaseAdmin
        .from('profiles')
        .update({ total_spent: newTotal })
        .eq('id', userId);
    }

    // Respond 200 OK so NOWPayments stops pinging your server
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}