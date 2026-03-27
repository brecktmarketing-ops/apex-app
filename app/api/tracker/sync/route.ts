import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getShopifyMetrics } from '@/lib/platforms/shopify';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get user's Shopify connection from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('shopify_domain, shopify_token')
      .eq('id', user.id)
      .single();

    if (!profile?.shopify_domain || !profile?.shopify_token) {
      return NextResponse.json({ error: 'No Shopify store connected. Go to Settings to connect.' }, { status: 404 });
    }

    const datePreset = request.nextUrl.searchParams.get('date_preset') || 'last_30d';
    const since = request.nextUrl.searchParams.get('since');
    const until = request.nextUrl.searchParams.get('until');

    // Calculate date range
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    let dateRange: { since: string; until: string };

    if (since && until) {
      dateRange = { since, until };
    } else {
      const days: Record<string, number> = { today: 0, yesterday: 1, last_7d: 7, last_14d: 14, last_30d: 30, last_90d: 90 };
      const d = new Date(now);
      d.setDate(d.getDate() - (days[datePreset] || 30));
      dateRange = { since: fmt(d), until: fmt(now) };
    }

    const metrics = await getShopifyMetrics(profile.shopify_domain, profile.shopify_token, dateRange);

    // Get ad spend from campaigns for the same period
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('spend')
      .eq('user_id', user.id);

    const adSpend = campaigns?.reduce((sum, c) => sum + Number(c.spend), 0) || 0;

    // Save to tracker_metrics
    const period = `${dateRange.since}_${dateRange.until}`;
    await supabase.from('tracker_metrics').upsert({
      user_id: user.id,
      period,
      revenue: metrics.revenue,
      orders: metrics.orders,
      sessions: metrics.sessions,
      visitors: metrics.visitors,
      product_views: metrics.productViews,
      add_to_cart: metrics.addToCart,
      ad_spend: adSpend,
      aov: metrics.aov,
      cvr: metrics.cvr,
      roas: adSpend > 0 ? metrics.revenue / adSpend : 0,
      data: {
        topProducts: metrics.topProducts,
        recentOrders: metrics.recentOrders,
      },
    }, { onConflict: 'user_id,period' });

    return NextResponse.json({
      metrics: {
        ...metrics,
        adSpend,
        roas: adSpend > 0 ? (metrics.revenue / adSpend).toFixed(2) : '0',
      },
      period: dateRange,
    });

  } catch (error: any) {
    console.error('Tracker sync error:', error);
    return NextResponse.json({ error: error.message || 'Failed to sync tracker data' }, { status: 500 });
  }
}
