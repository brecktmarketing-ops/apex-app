import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const META_APP_ID = process.env.META_APP_ID!;
const META_APP_SECRET = process.env.META_APP_SECRET!;
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/meta/callback`
  : 'https://apex-app-dusky.vercel.app/api/auth/meta/callback';

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    const error = request.nextUrl.searchParams.get('error');

    if (error || !code) {
      return NextResponse.redirect(new URL('/dashboard/settings?meta_error=denied', request.url));
    }

    // Exchange code for short-lived token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_secret=${META_APP_SECRET}&code=${code}`
    );
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      return NextResponse.redirect(new URL(`/dashboard/settings?meta_error=${encodeURIComponent(tokenData.error.message)}`, request.url));
    }

    const shortToken = tokenData.access_token;

    // Exchange for long-lived token (60 days)
    const longRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${shortToken}`
    );
    const longData = await longRes.json();
    const longToken = longData.access_token || shortToken;

    // Get user's ad accounts
    const accountsRes = await fetch(
      `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_status&access_token=${longToken}`
    );
    const accountsData = await accountsRes.json();
    const accounts = accountsData.data || [];

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Save all ad accounts
    for (const acc of accounts) {
      if (acc.account_status === 1) { // Only active accounts
        await supabase.from('ad_connections').upsert({
          user_id: user.id,
          platform: 'meta',
          access_token: longToken,
          account_id: acc.id,
          account_name: acc.name || 'Meta Ad Account',
          status: 'active',
          last_synced_at: new Date().toISOString(),
        }, { onConflict: 'user_id,platform,account_id' });
      }
    }

    const count = accounts.filter((a: any) => a.account_status === 1).length;

    return NextResponse.redirect(
      new URL(`/dashboard/settings?meta_success=${count}`, request.url)
    );

  } catch (error: any) {
    console.error('Meta OAuth error:', error);
    return NextResponse.redirect(
      new URL(`/dashboard/settings?meta_error=${encodeURIComponent(error.message || 'Connection failed')}`, request.url)
    );
  }
}
