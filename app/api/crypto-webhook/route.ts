import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-nowpayments-sig');

  // Verify HMAC signature for security
  const hmac = crypto.createHmac('sha512', process.env.NOWPAYMENTS_IPN_SECRET!);
  const sortedParams = JSON.stringify(JSON.parse(rawBody), Object.keys(JSON.parse(rawBody)).sort());
  const computedSignature = hmac.update(sortedParams).digest('hex');

  if (signature !== computedSignature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const payment = JSON.parse(rawBody);

  if (payment.payment_status === 'finished') {
    const userId = payment.order_id;
    const paidAmountCents = Math.round(parseFloat(payment.price_amount) * 100);

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('total_spent')
      .eq('id', userId)
      .single();

    const newTotal = (profile?.total_spent || 0) + paidAmountCents;

    await supabaseAdmin
      .from('profiles')
      .update({ total_spent: newTotal })
      .eq('id', userId);
  }

  return NextResponse.json({ success: true });
}