import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { amountInCents, userId } = await req.json();
    const amountInGBP = amountInCents / 100;

    // Grab the URL from Vercel
    let rawUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://larpleaderboardbeta.vercel.app';
    
    // BULLETPROOFING: Strip out accidental Markdown brackets, parentheses, and spaces
    let cleanUrl = rawUrl.replace(/[\[\]\(\)\s]/g, '');
    
    // BULLETPROOFING: Fix accidental duplicate prefixes like "https://https://"
    cleanUrl = cleanUrl.replace(/^(https?:\/\/)+/, 'https://');
    
    // Ensure it has the protocol and remove any trailing slashes
    if (!cleanUrl.startsWith('http')) cleanUrl = `https://${cleanUrl}`;
    const baseUrl = cleanUrl.replace(/\/$/, '');

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

    console.log("SENDING CLEAN PAYLOAD TO NOWPAYMENTS:", JSON.stringify(payload));

    const response = await fetch('https://api.nowpayments.io/v1/invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.NOWPAYMENTS_API_KEY || '',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
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