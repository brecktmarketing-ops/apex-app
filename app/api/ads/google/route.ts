import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getGoogleCampaigns, getGoogleCampaignMetrics, toggleGoogleCampaign, getDateRange } from '@/lib/platforms/google';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: connection } = await supabase
      .from('ad_connections')
      .select('*')
      .eq('platform', 'google')
      .eq('status', 'active')
      .single();

    if (!connection) {
      return NextResponse.json({ error: 'No Google Ads account connected. Go to Settings to connect.' }, { status: 404 });
    }

    const token = connection.access_token;
    const customerId = connection.account_id;
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '';

    if (!customerId) {
      return NextResponse.json({ error: 'No Google Ads customer ID configured.' }, { status: 400 });
    }

    const datePreset = request.nextUrl.searchParams.get('date_preset') || 'last_30d';
    const since = request.nextUrl.searchParams.get('since');
    const until = request.nextUrl.searchParams.get('until');
    const dateRange = since && until ? { since, until } : getDateRange(datePreset);

    const [campaigns, metrics] = await Promise.all([
      getGoogleCampaigns(customerId, token, developerToken),
      getGoogleCampaignMetrics(customerId, token, developerToken, dateRange),
    ]);

    for (const camp of campaigns) {
      const m = metrics.find(met => met.campaignId === camp.id);

      await supabase.from('campaigns').upsert({
        user_id: user.id,
        connection_id: connection.id,
        platform: 'google',
        platform_campaign_id: camp.id,
        name: camp.name,
        status: camp.status === 'ENABLED' ? 'active' : camp.status === 'PAUSED' ? 'paused' : 'killed',
        spend: m?.spend || 0,
        revenue: m?.conversionValue || 0,
        leads: m?.conversions || 0,
        roas: m?.roas || 0,
        cpl: m?.conversions ? (m.spend / m.conversions) : 0,
        ctr: m?.ctr || 0,
        impressions: m?.impressions || 0,
        clicks: m?.clicks || 0,
        cpm: m?.cpm || 0,
        platform_data: {
          channel_type: camp.advertisingChannelType,
          bidding_strategy: camp.biddingStrategyType,
          cpc: m?.cpc || 0,
        },
        date_range_start: dateRange.since,
        date_range_end: dateRange.until,
        synced_at: new Date().toISOString(),
      }, { onConflict: 'user_id,platform,platform_campaign_id' });
    }

    await supabase.from('ad_connections').update({ last_synced_at: new Date().toISOString() }).eq('id', connection.id);

    const { data: savedCampaigns } = await supabase
      .from('campaigns')
      .select('*')
      .eq('platform', 'google')
      .order('spend', { ascending: false });

    return NextResponse.json({
      campaigns: savedCampaigns || [],
      synced_at: new Date().toISOString(),
      account: { id: customerId, name: connection.account_name },
    });

  } catch (error: any) {
    console.error('Google sync error:', error);
    return NextResponse.json({ error: error.message || 'Failed to sync Google data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { campaign_id, action } = await request.json();

    const { data: campaign } = await supabase
      .from('campaigns')
      .select('*, ad_connections(*)')
      .eq('id', campaign_id)
      .single();

    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

    const token = campaign.ad_connections?.access_token;
    const customerId = campaign.ad_connections?.account_id;
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '';

    const googleStatus = action === 'pause' ? 'PAUSED' : 'ENABLED';
    await toggleGoogleCampaign(customerId, campaign.platform_campaign_id, googleStatus, token, developerToken);

    const newStatus = action === 'pause' ? 'paused' : 'active';
    await supabase.from('campaigns').update({ status: newStatus }).eq('id', campaign_id);

    return NextResponse.json({ success: true, status: newStatus });

  } catch (error: any) {
    console.error('Google toggle error:', error);
    return NextResponse.json({ error: error.message || 'Failed to toggle campaign' }, { status: 500 });
  }
}
