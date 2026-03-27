import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getMetaAdSets,
  getMetaAds,
  getMetaAdSetInsights,
  getMetaAdInsights,
} from '@/lib/platforms/meta';

// GET - Fetch ad sets or ads for drill-down
// Query params:
//   level: 'adsets' | 'ads'
//   parent_id: campaign ID (for adsets) or adset ID (for ads)
//   date_preset: Meta date preset (default: last_30d)
//   since/until: custom date range
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: connection } = await supabase
      .from('ad_connections')
      .select('*')
      .eq('platform', 'meta')
      .eq('status', 'active')
      .single();

    if (!connection) {
      return NextResponse.json({ error: 'No Meta account connected' }, { status: 404 });
    }

    const token = connection.access_token;
    const accountId = connection.account_id;
    if (!accountId) {
      return NextResponse.json({ error: 'No Meta account ID configured' }, { status: 400 });
    }

    const level = request.nextUrl.searchParams.get('level');
    const parentId = request.nextUrl.searchParams.get('parent_id');
    const datePreset = request.nextUrl.searchParams.get('date_preset') || 'last_30d';
    const since = request.nextUrl.searchParams.get('since');
    const until = request.nextUrl.searchParams.get('until');

    if (!level || !parentId) {
      return NextResponse.json({ error: 'Missing level or parent_id' }, { status: 400 });
    }

    if (level === 'adsets') {
      // Fetch ad sets for a campaign
      const adsets = await getMetaAdSets(accountId, token, parentId);

      // Fetch insights for each ad set
      const items = await Promise.all(
        adsets.map(async (adset) => {
          try {
            let insightsArr;
            if (since && until) {
              // Use time_range for custom dates
              const res = await fetch(
                `https://graph.facebook.com/v21.0/${adset.id}/insights?fields=spend,impressions,clicks,ctr,cpm,reach,frequency,cost_per_unique_click,cpp,actions,cost_per_action_type,purchase_roas&time_range={"since":"${since}","until":"${until}"}&limit=1&access_token=${token}`
              );
              const data = await res.json();
              insightsArr = data.data || [];
            } else {
              insightsArr = await getMetaAdSetInsights(accountId, token, adset.id, datePreset);
            }
            return { ...adset, insights: insightsArr[0] || null };
          } catch {
            return { ...adset, insights: null };
          }
        })
      );

      return NextResponse.json({ items });

    } else if (level === 'ads') {
      // Fetch ads for an ad set
      const ads = await getMetaAds(accountId, token, parentId);

      // Fetch insights for each ad
      const items = await Promise.all(
        ads.map(async (ad) => {
          try {
            let insightsArr;
            if (since && until) {
              const res = await fetch(
                `https://graph.facebook.com/v21.0/${ad.id}/insights?fields=spend,impressions,clicks,ctr,cpm,reach,frequency,cost_per_unique_click,cpp,actions,cost_per_action_type,purchase_roas&time_range={"since":"${since}","until":"${until}"}&limit=1&access_token=${token}`
              );
              const data = await res.json();
              insightsArr = data.data || [];
            } else {
              insightsArr = await getMetaAdInsights(accountId, token, ad.id, datePreset);
            }
            return { ...ad, insights: insightsArr[0] || null };
          } catch {
            return { ...ad, insights: null };
          }
        })
      );

      return NextResponse.json({ items });

    } else {
      return NextResponse.json({ error: 'Invalid level. Use "adsets" or "ads"' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Meta drilldown error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch drill-down data' }, { status: 500 });
  }
}
