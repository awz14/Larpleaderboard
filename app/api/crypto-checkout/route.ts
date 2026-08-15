import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { amountInCents, userId } = await req.json();
    
    // Convert cents back to flat GBP for NOWPayments
    const amountInGBP = amountInCents / 100;

    const response = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.NOWPAYMENTS_API_KEY!,
      },
      body: JSON.stringify({
        price_amount: amountInGBP,
        price_currency: 'gbp', 
        pay_currency: 'sol', // Forces the gateway to request Solana (SOL)
        order_id: userId,
        order_description: 'LarpLeaderboard Spot Claim',
        ipn_callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/crypto-webhook`,
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/?payment=success`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/?payment=cancel`,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data.message || 'Error generating invoice' }, { status: 400 });
    }

    // Sends the hosted Solana checkout link back to the frontend
    return NextResponse.json({ url: data.invoice_url });
  } catch (error: any) {
    console.error('Crypto checkout error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}