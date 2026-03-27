import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

const META_API = 'https://graph.facebook.com/v21.0';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { business, goal, budget, website, campaign_name, platform: selectedPlatform } = await request.json();
    const activePlatform = selectedPlatform || 'meta';

    // Get connection for selected platform
    const { data: connection } = await supabase
      .from('ad_connections')
      .select('*')
      .eq('platform', activePlatform)
      .eq('status', 'active')
      .single();

    if (!connection) return NextResponse.json({ error: `Connect your ${activePlatform} ad account in Settings first.` }, { status: 404 });

    // Step 1: Have Wanda build the campaign strategy
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    const aiRes = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: 'You are an expert paid advertising strategist across Meta, Google, and TikTok. Return ONLY valid JSON, no other text.',
      messages: [{
        role: 'user',
        content: `Build a ${activePlatform} ad campaign for this business. Return JSON only.

Platform: ${activePlatform}
Business: ${business}
Goal: ${goal}
Daily Budget: $${budget}
Website: ${website}

Return this exact JSON format:
{
  "campaign_name": "short campaign name",
  "platform": "${activePlatform}",
  "campaign_type": "the best campaign type for this platform and goal (see rules below)",
  "objective": "platform-specific objective (see rules below)",
  "age_min": number,
  "age_max": number,
  "genders": "all" or "male" or "female",
  "country": "US",
  "headline": "compelling ad headline under 40 chars",
  "body": "ad body copy, 2-3 sentences, conversational, direct benefit to customer",
  "cta": "LEARN_MORE or SIGN_UP or SHOP_NOW or BOOK_NOW or GET_QUOTE or CONTACT_US",
  "campaign_type_reason": "one sentence explaining why you picked this campaign type"
}

CAMPAIGN TYPE RULES:

If platform is META:
- Leads goal → campaign_type: "advantage_plus", objective: "OUTCOME_LEADS"
- Sales goal → campaign_type: "advantage_shopping", objective: "OUTCOME_SALES"
- Traffic goal → campaign_type: "standard", objective: "OUTCOME_TRAFFIC"

If platform is GOOGLE:
- Leads goal → campaign_type: "search" (text ads on search results), objective: "LEAD_GENERATION"
- Sales goal for ecom → campaign_type: "shopping" (product listings), objective: "SALES"
- Sales goal for non-ecom → campaign_type: "search", objective: "SALES"
- Traffic goal → campaign_type: "search", objective: "WEBSITE_TRAFFIC"
- If budget > $100/day and sales goal → campaign_type: "pmax" (Performance Max, AI across all surfaces), objective: "SALES"
- Brand awareness → campaign_type: "display", objective: "AWARENESS"
- Video/YouTube → campaign_type: "youtube", objective: "AWARENESS"

If platform is TIKTOK:
- Any goal → campaign_type: "in_feed" (standard TikTok feed ads)
- If business is ecom/product → campaign_type: "spark_ads" (boost organic style)
- High budget awareness → campaign_type: "topview"

Pick the BEST campaign type for their specific business and goal. Write copy that sells. Target the right demo.`
      }],
    });

    const aiText = aiRes.content[0].type === 'text' ? aiRes.content[0].text : '';
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: 'AI failed to generate campaign strategy. Try again.' }, { status: 500 });

    const strategy = JSON.parse(jsonMatch[0]);
    const token = connection.access_token;
    const rawAccountId = connection.account_id;
    const accountId = rawAccountId?.startsWith('act_') ? rawAccountId : `act_${rawAccountId}`;

    // Step 2: Create Campaign on Meta
    const campRes = await fetch(`${META_API}/${accountId}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: campaign_name || strategy.campaign_name,
        objective: strategy.objective,
        status: 'PAUSED',
        special_ad_categories: [],
        is_adset_budget_sharing_enabled: false,
        access_token: token,
      }),
    });
    const campData = await campRes.json();
    if (campData.error) return NextResponse.json({ error: 'Meta error: ' + campData.error.message }, { status: 500 });

    // Step 3: Create Ad Set
    const budgetCents = Math.round(parseFloat(budget) * 100);
    const genders = strategy.genders === 'male' ? [1] : strategy.genders === 'female' ? [2] : undefined;
    const optGoal = strategy.objective === 'OUTCOME_LEADS' ? 'LEAD_GENERATION' : strategy.objective === 'OUTCOME_SALES' ? 'OFFSITE_CONVERSIONS' : 'LINK_CLICKS';

    const targeting: any = {
      age_min: strategy.age_min || 25,
      age_max: strategy.age_max || 55,
      geo_locations: { countries: [strategy.country || 'US'] },
      targeting_automation: { advantage_audience: 0 },
    };
    if (genders) targeting.genders = genders;

    const adsetRes = await fetch(`${META_API}/${accountId}/adsets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `${strategy.campaign_name} | Ad Set`,
        campaign_id: campData.id,
        daily_budget: budgetCents,
        billing_event: 'IMPRESSIONS',
        optimization_goal: optGoal,
        bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
        targeting,
        status: 'PAUSED',
        access_token: token,
      }),
    });
    const adsetData = await adsetRes.json();
    if (adsetData.error) {
      await fetch(`${META_API}/${campData.id}?access_token=${token}`, { method: 'DELETE' });
      return NextResponse.json({ error: 'Ad Set error: ' + adsetData.error.message }, { status: 500 });
    }

    // Step 4: Create Ad Creative + Ad
    let adId = null;
    try {
      const pagesRes = await fetch(`${META_API}/me/accounts?access_token=${token}`);
      const pagesData = await pagesRes.json();
      const pageId = pagesData.data?.[0]?.id;

      if (pageId) {
        const creativeRes = await fetch(`${META_API}/${accountId}/adcreatives`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `${strategy.campaign_name} | Creative`,
            object_story_spec: {
              page_id: pageId,
              link_data: {
                message: strategy.body,
                link: website || 'https://example.com',
                name: strategy.headline,
                call_to_action: { type: strategy.cta || 'LEARN_MORE' },
              },
            },
            access_token: token,
          }),
        });
        const creativeData = await creativeRes.json();

        if (creativeData.id) {
          const adRes = await fetch(`${META_API}/${accountId}/ads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: `${strategy.campaign_name} | Ad`,
              adset_id: adsetData.id,
              creative: { creative_id: creativeData.id },
              status: 'PAUSED',
              access_token: token,
            }),
          });
          const adData = await adRes.json();
          adId = adData.id;
        }
      }
    } catch {}

    // Save to DB
    await supabase.from('campaigns').insert({
      user_id: user.id,
      connection_id: connection.id,
      platform: 'meta',
      platform_campaign_id: campData.id,
      name: strategy.campaign_name,
      status: 'paused',
      platform_data: {
        objective: strategy.objective,
        daily_budget: budget,
        adset_id: adsetData.id,
        ad_id: adId,
        targeting,
        headline: strategy.headline,
        body: strategy.body,
        cta: strategy.cta,
        website,
      },
      synced_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      strategy,
      campaign_id: campData.id,
      adset_id: adsetData.id,
      ad_id: adId,
      message: `Campaign "${strategy.campaign_name}" is live (paused). Flip the switch when you're ready to spend.`,
    });

  } catch (error: any) {
    console.error('Smart launch error:', error);
    return NextResponse.json({ error: error.message || 'Launch failed' }, { status: 500 });
  }
}
