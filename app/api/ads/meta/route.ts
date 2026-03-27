import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMetaCampaigns, getMetaCampaignInsights, parseMetaInsights, toggleMetaCampaign } from '@/lib/platforms/meta';

// GET - Sync Meta campaigns for logged-in user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get user's Meta connection
    const { data: connection } = await supabase
      .from('ad_connections')
      .select('*')
      .eq('platform', 'meta')
      .eq('status', 'active')
      .single();

    if (!connection) {
      return NextResponse.json({ error: 'No Meta account connected. Go to Settings to connect.' }, { status: 404 });
    }

    const token = connection.access_token;
    const accountId = connection.account_id;

    if (!accountId) {
      return NextResponse.json({ error: 'No Meta account ID configured. Update in Settings.' }, { status: 400 });
    }

    // Pull campaigns
    const campaigns = await getMetaCampaigns(accountId, token);

    // Pull insights
    const datePreset = request.nextUrl.searchParams.get('date_preset') || 'last_30d';
    const rawInsights = await getMetaCampaignInsights(accountId, token, datePreset);
    const insights = parseMetaInsights(rawInsights);

    // Upsert campaigns into database
    for (const camp of campaigns) {
      const insight = insights.find(i => i.campaign_id === camp.id);

      await supabase.from('campaigns').upsert({
        user_id: user.id,
        connection_id: connection.id,
        platform: 'meta',
        platform_campaign_id: camp.id,
        name: camp.name,
        status: camp.status === 'ACTIVE' ? 'active' : camp.status === 'PAUSED' ? 'paused' : 'killed',
        spend: insight?.spend || 0,
        revenue: insight?.revenue || 0,
        leads: insight?.leads || 0,
        roas: insight?.roas || 0,
        cpl: insight?.cpl || 0,
        ctr: insight?.ctr || 0,
        impressions: insight?.impressions || 0,
        clicks: insight?.clicks || 0,
        cpm: insight?.cpm || 0,
        platform_data: {
          objective: camp.objective,
          daily_budget: camp.daily_budget,
          purchases: insight?.purchases || 0,
          reach: insight?.reach || 0,
          frequency: insight?.frequency || 0,
          cpc: insight?.cpc || 0,
          cpp: insight?.cpp || 0,
          cost_per_unique_click: insight?.cost_per_unique_click || 0,
        },
        date_range_start: insight?.date_start || null,
        date_range_end: insight?.date_stop || null,
        synced_at: new Date().toISOString(),
      }, { onConflict: 'user_id,platform,platform_campaign_id' });
    }

    // Update last synced
    await supabase.from('ad_connections').update({ last_synced_at: new Date().toISOString() }).eq('id', connection.id);

    // Return fresh data
    const { data: savedCampaigns } = await supabase
      .from('campaigns')
      .select('*')
      .eq('platform', 'meta')
      .order('spend', { ascending: false });

    return NextResponse.json({
      campaigns: savedCampaigns || [],
      synced_at: new Date().toISOString(),
      account: { id: accountId, name: connection.account_name },
    });

  } catch (error: any) {
    console.error('Meta sync error:', error);
    return NextResponse.json({ error: error.message || 'Failed to sync Meta data' }, { status: 500 });
  }
}

// POST - Toggle a campaign on/off
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { campaign_id, action } = await request.json();

    // Get the campaign
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('*, ad_connections(*)')
      .eq('id', campaign_id)
      .single();

    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

    const token = campaign.ad_connections?.access_token;
    if (!token) return NextResponse.json({ error: 'No access token found' }, { status: 400 });

    // Call Meta API to toggle
    const metaStatus = action === 'pause' ? 'PAUSED' : 'ACTIVE';
    await toggleMetaCampaign(campaign.platform_campaign_id, metaStatus, token);

    // Update local DB
    const newStatus = action === 'pause' ? 'paused' : 'active';
    await supabase.from('campaigns').update({ status: newStatus }).eq('id', campaign_id);

    return NextResponse.json({ success: true, status: newStatus });

  } catch (error: any) {
    console.error('Meta toggle error:', error);
    return NextResponse.json({ error: error.message || 'Failed to toggle campaign' }, { status: 500 });
  }
}
