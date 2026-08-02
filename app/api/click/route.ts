import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const targetUrl = url.searchParams.get('to');
  const userId = url.searchParams.get('id');

  if (!targetUrl) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (userId) {
    // Fetch current clicks and increment asynchronously
    supabase
      .from('profiles')
      .select('total_clicks')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        const currentClicks = data?.total_clicks || 0;
        supabase
          .from('profiles')
          .update({ total_clicks: currentClicks + 1 })
          .eq('id', userId);
      });
  }

  // Ensure targetUrl is a valid absolute URL
  try {
    const absoluteUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
    return NextResponse.redirect(absoluteUrl);
  } catch (e) {
    return NextResponse.redirect(new URL('/', req.url));
  }
}