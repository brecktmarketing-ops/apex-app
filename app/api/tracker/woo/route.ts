import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWooCommerceMetrics } from '@/lib/platforms/woocommerce';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('woocommerce_url, woocommerce_key, woocommerce_secret')
      .eq('id', user.id)
      .single();

    if (!profile?.woocommerce_url || !profile?.woocommerce_key || !profile?.woocommerce_secret) {
      return NextResponse.json({ error: 'No WooCommerce store connected. Go to Settings to connect.' }, { status: 404 });
    }

    const now = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    const preset = request.nextUrl.searchParams.get('date_preset') || 'last_30d';
    const days: Record<string, number> = { last_7d: 7, last_14d: 14, last_30d: 30, last_90d: 90 };
    const d = new Date(now);
    d.setDate(d.getDate() - (days[preset] || 30));
    const dateRange = { since: fmt(d), until: fmt(now) };

    const metrics = await getWooCommerceMetrics(
      profile.woocommerce_url,
      profile.woocommerce_key,
      profile.woocommerce_secret,
      dateRange
    );

    // Get ad spend
    const { data: campaigns } = await supabase.from('campaigns').select('spend');
    const adSpend = campaigns?.reduce((sum, c) => sum + Number(c.spend), 0) || 0;

    // Save to tracker_metrics
    const period = `${dateRange.since}_${dateRange.until}`;
    await supabase.from('tracker_metrics').upsert({
      user_id: user.id,
      period,
      revenue: metrics.revenue,
      orders: metrics.orders,
      ad_spend: adSpend,
      aov: metrics.aov,
      roas: adSpend > 0 ? metrics.revenue / adSpend : 0,
      data: { topProducts: metrics.topProducts, recentOrders: metrics.recentOrders, source: 'woocommerce' },
    }, { onConflict: 'user_id,period' });

    return NextResponse.json({ metrics: { ...metrics, adSpend }, period: dateRange });

  } catch (error: any) {
    console.error('WooCommerce sync error:', error);
    return NextResponse.json({ error: error.message || 'Failed to sync' }, { status: 500 });
  }
}
