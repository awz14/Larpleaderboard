import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { amountInCents, userId } = await req.json();
    const amountInGBP = amountInCents / 100;

    // Self-healing URL check: Forces 'https://' and removes trailing slashes
    let baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://larpleaderboardbeta.vercel.app';
    if (!baseUrl.startsWith('http')) {
      baseUrl = `https://${baseUrl}`;
    }
    baseUrl = baseUrl.replace(/\/$/, ''); 

    const payload = {
      price_amount: amountInGBP,
      price_currency: 'gbp',
      pay_currency: 'sol', // Forces the gateway to request Solana (SOL)
      order_id: userId,
      order_description: 'LarpLeaderboard Spot Claim',
      ipn_callback_url: `${baseUrl}/api/crypto-webhook`,
      success_url: `${baseUrl}/?payment=success`,
      cancel_url: `${baseUrl}/?payment=cancel`,
    };

    const response = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.NOWPAYMENTS_API_KEY!,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    // If NOWPayments throws an error, grab their EXACT error message to pass to the frontend
    if (!response.ok) {
      const errorMessage = data.message || data.error || JSON.stringify(data);
      return NextResponse.json({ error: `NOWPayments: ${errorMessage}` }, { status: 400 });
    }

    // Success! Send the hosted Solana checkout link back to the frontend
    return NextResponse.json({ url: data.invoice_url });
    
  } catch (error: any) {
    console.error('Crypto checkout error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}