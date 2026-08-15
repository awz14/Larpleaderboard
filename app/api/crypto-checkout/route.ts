import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { amountInCents, userId } = await req.json();
    const amountInGBP = amountInCents / 100;

    let baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://larpleaderboardbeta.vercel.app';
    if (!baseUrl.startsWith('http')) baseUrl = `https://${baseUrl}`;
    baseUrl = baseUrl.replace(/\/$/, '');

    const payload = {
      price_amount: amountInGBP,
      price_currency: 'gbp',
      pay_currency: 'sol', 
      order_id: userId,
      order_description: 'LarpLeaderboard Spot Claim',
      ipn_callback_url: `${baseUrl}/api/crypto-webhook`,
      success_url: `${baseUrl}/?payment=success`,
      cancel_url: `${baseUrl}/?payment=cancel`,
    };

    // THIS WILL PRINT THE EXACT DATA WE ARE SENDING IN VERCEL LOGS
    console.log("SENDING PAYLOAD TO NOWPAYMENTS:", JSON.stringify(payload));

    const response = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.NOWPAYMENTS_API_KEY || '',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    
    // THIS WILL PRINT THE EXACT REJECTION MESSAGE IN VERCEL LOGS
    console.log("NOWPAYMENTS RESPONSE:", JSON.stringify(data));

    if (!response.ok) {
      const errorMessage = data.message || data.error || JSON.stringify(data);
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    return NextResponse.json({ url: data.invoice_url });
    
  } catch (error: any) {
    console.error('Crypto checkout error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}