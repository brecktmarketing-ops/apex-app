import { NextRequest, NextResponse } from 'next/server';

const META_APP_ID = process.env.META_APP_ID!;
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/meta/callback`
  : 'https://apex-app-dusky.vercel.app/api/auth/meta/callback';

// GET - Redirect user to Facebook OAuth
export async function GET() {
  const scopes = [
    'ads_management',
    'ads_read',
    'business_management',
    'pages_show_list',
    'pages_read_engagement',
  ].join(',');

  const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${scopes}&response_type=code`;

  return NextResponse.redirect(authUrl);
}
