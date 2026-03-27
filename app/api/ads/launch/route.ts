import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const META_API = 'https://graph.facebook.com/v21.0';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, objective, daily_budget, targeting_age_min, targeting_age_max, targeting_genders, targeting_interests, geo, headline, body: adBody, link, cta, image_url } = body;

    // Get Meta connection
    const { data: connection } = await supabase
      .from('ad_connections')
      .select('*')
      .eq('platform', 'meta')
      .eq('status', 'active')
      .single();

    if (!connection) return NextResponse.json({ error: 'No Meta account connected' }, { status: 404 });

    const token = connection.access_token;
    const rawAccountId = connection.account_id;
    const accountId = rawAccountId?.startsWith('act_') ? rawAccountId : `act_${rawAccountId}`;

    // Step 1: Create Campaign
    const campRes = await fetch(`${META_API}/${accountId}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name || 'APEX Campaign',
        objective: objective || 'OUTCOME_LEADS',
        status: 'PAUSED',
        special_ad_categories: [],
        is_adset_budget_sharing_enabled: false,
        access_token: token,
      }),
    });
    const campData = await campRes.json();
    if (campData.error) return NextResponse.json({ error: 'Campaign creation failed: ' + campData.error.message }, { status: 500 });
    const campaignId = campData.id;

    // Step 2: Create Ad Set
    const budgetCents = Math.round(parseFloat(daily_budget || '50') * 100);
    const genders = targeting_genders === 'male' ? [1] : targeting_genders === 'female' ? [2] : [];

    const targeting: any = {
      age_min: parseInt(targeting_age_min || '25'),
      age_max: parseInt(targeting_age_max || '55'),
      geo_locations: { countries: [geo || 'US'] },
      targeting_automation: { advantage_audience: 0 },
    };
    if (genders.length > 0) targeting.genders = genders;
    if (targeting_interests) {
      // Simple interest targeting - user provides comma-separated interests
      const interests = targeting_interests.split(',').map((i: string) => i.trim()).filter(Boolean);
      if (interests.length > 0) {
        targeting.flexible_spec = [{ interests: interests.map((name: string) => ({ name })) }];
      }
    }

    const adsetRes = await fetch(`${META_API}/${accountId}/adsets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `${name} | Ad Set`,
        campaign_id: campaignId,
        daily_budget: budgetCents,
        billing_event: 'IMPRESSIONS',
        optimization_goal: objective === 'OUTCOME_LEADS' ? 'LEAD_GENERATION' : objective === 'OUTCOME_SALES' ? 'OFFSITE_CONVERSIONS' : 'LINK_CLICKS',
        bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
        targeting,
        status: 'PAUSED',
        access_token: token,
      }),
    });
    const adsetData = await adsetRes.json();
    if (adsetData.error) {
      // Cleanup: delete the campaign
      await fetch(`${META_API}/${campaignId}?access_token=${token}`, { method: 'DELETE' });
      return NextResponse.json({ error: 'Ad Set creation failed: ' + adsetData.error.message }, { status: 500 });
    }
    const adsetId = adsetData.id;

    // Step 3: Create Ad Creative
    const creativePayload: any = {
      name: `${name} | Creative`,
      object_story_spec: {
        link_data: {
          message: adBody || '',
          link: link || 'https://example.com',
          name: headline || name,
          call_to_action: { type: cta || 'LEARN_MORE' },
        },
      },
      access_token: token,
    };

    // If image URL provided, add it
    if (image_url) {
      creativePayload.object_story_spec.link_data.image_url = image_url;
    }

    // Get page ID for the creative
    const pagesRes = await fetch(`${META_API}/me/accounts?access_token=${token}`);
    const pagesData = await pagesRes.json();
    const pageId = pagesData.data?.[0]?.id;

    if (pageId) {
      creativePayload.object_story_spec.page_id = pageId;
    }

    const creativeRes = await fetch(`${META_API}/${accountId}/adcreatives`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creativePayload),
    });
    const creativeData = await creativeRes.json();

    let adId = null;
    if (!creativeData.error) {
      // Step 4: Create Ad
      const adRes = await fetch(`${META_API}/${accountId}/ads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${name} | Ad`,
          adset_id: adsetId,
          creative: { creative_id: creativeData.id },
          status: 'PAUSED',
          access_token: token,
        }),
      });
      const adData = await adRes.json();
      adId = adData.id;
    }

    // Save to DB
    await supabase.from('campaigns').insert({
      user_id: user.id,
      connection_id: connection.id,
      platform: 'meta',
      platform_campaign_id: campaignId,
      name: name || 'APEX Campaign',
      status: 'paused',
      platform_data: {
        objective,
        daily_budget,
        adset_id: adsetId,
        ad_id: adId,
        creative_id: creativeData.id || null,
        targeting,
      },
      synced_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      campaign_id: campaignId,
      adset_id: adsetId,
      ad_id: adId,
      status: 'paused',
      message: `Campaign "${name}" created and paused. Toggle it on when ready to go live.`,
    });

  } catch (error: any) {
    console.error('Launch error:', error);
    return NextResponse.json({ error: error.message || 'Launch failed' }, { status: 500 });
  }
}
