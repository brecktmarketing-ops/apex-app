import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_revenue_key')
      .eq('id', user.id)
      .single();

    const stripeKey = profile?.stripe_revenue_key || process.env.STRIPE_SECRET_KEY;
    if (!stripeKey || stripeKey === 'sk_test_placeholder') {
      return NextResponse.json({ error: 'No Stripe key configured for revenue tracking.' }, { status: 404 });
    }

    const stripe = new Stripe(stripeKey);

    const now = new Date();
    const preset = request.nextUrl.searchParams.get('date_preset') || 'last_30d';
    const days: Record<string, number> = { last_7d: 7, last_14d: 14, last_30d: 30, last_90d: 90 };
    const since = new Date(now);
    since.setDate(since.getDate() - (days[preset] || 30));

    // Get charges
    const charges = await stripe.charges.list({
      created: { gte: Math.floor(since.getTime() / 1000) },
      limit: 100,
    });

    const successfulCharges = charges.data.filter(c => c.status === 'succeeded');
    const revenue = successfulCharges.reduce((sum, c) => sum + (c.amount / 100), 0);
    const orderCount = successfulCharges.length;
    const aov = orderCount > 0 ? revenue / orderCount : 0;

    // Recent orders
    const recentOrders = successfulCharges.slice(0, 20).map(c => ({
      id: c.id.substring(0, 12),
      customer: c.billing_details?.name || c.billing_details?.email || 'Customer',
      total: c.amount / 100,
      items: 1,
      date: new Date(c.created * 1000).toISOString(),
      status: c.refunded ? 'Refunded' : 'Paid',
    }));

    // Get ad spend
    const { data: campaigns } = await supabase.from('campaigns').select('spend');
    const adSpend = campaigns?.reduce((sum, c) => sum + Number(c.spend), 0) || 0;

    // Save to tracker_metrics
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    const period = `${fmt(since)}_${fmt(now)}`;
    await supabase.from('tracker_metrics').upsert({
      user_id: user.id,
      period,
      revenue,
      orders: orderCount,
      ad_spend: adSpend,
      aov,
      roas: adSpend > 0 ? revenue / adSpend : 0,
      data: { recentOrders, source: 'stripe' },
    }, { onConflict: 'user_id,period' });

    return NextResponse.json({
      metrics: { revenue, orders: orderCount, aov, recentOrders, adSpend },
      period: { since: fmt(since), until: fmt(now) },
    });

  } catch (error: any) {
    console.error('Stripe revenue sync error:', error);
    return NextResponse.json({ error: error.message || 'Failed to sync' }, { status: 500 });
  }
}
