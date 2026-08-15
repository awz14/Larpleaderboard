import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { amountInCents, userId } = await req.json();
    const priceInUSD = amountInCents / 100;

    const response = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.NOWPAYMENTS_API_KEY!,
      },
      body: JSON.stringify({
        price_amount: priceInUSD,
        price_currency: 'usd',
        pay_currency: 'usdt', // Or let user choose on gateway
        order_id: userId,
        ipn_callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/crypto-webhook`,
      }),
    });

    const data = await response.json();
    return NextResponse.json({ url: data.invoice_url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}