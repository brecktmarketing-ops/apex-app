const TIKTOK_API = 'https://business-api.tiktok.com/open_api/v1.3';

export interface TikTokCampaign {
  campaign_id: string;
  campaign_name: string;
  operation_status: string;
  objective_type: string;
  budget: number;
  budget_mode: string;
}

export interface TikTokMetrics {
  campaignId: string;
  campaignName: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  conversionValue: number;
  ctr: number;
  cpc: number;
  cpm: number;
  roas: number;
  reach: number;
  frequency: number;
  videoViews: number;
  videoWatched6s: number;
}

export async function getTikTokCampaigns(
  advertiserId: string,
  accessToken: string
): Promise<TikTokCampaign[]> {
  const res = await fetch(
    `${TIKTOK_API}/campaign/get/?advertiser_id=${advertiserId}&page_size=50`,
    {
      headers: { 'Access-Token': accessToken },
    }
  );

  const data = await res.json();
  if (data.code !== 0) throw new Error(data.message || 'TikTok API error');

  return (data.data?.list || []).map((c: any) => ({
    campaign_id: c.campaign_id,
    campaign_name: c.campaign_name,
    operation_status: c.operation_status,
    objective_type: c.objective_type,
    budget: c.budget || 0,
    budget_mode: c.budget_mode,
  }));
}

export async function getTikTokCampaignMetrics(
  advertiserId: string,
  accessToken: string,
  dateRange: { since: string; until: string }
): Promise<TikTokMetrics[]> {
  const params = new URLSearchParams({
    advertiser_id: advertiserId,
    report_type: 'BASIC',
    data_level: 'AUCTION_CAMPAIGN',
    dimensions: JSON.stringify(['campaign_id']),
    metrics: JSON.stringify([
      'campaign_name', 'spend', 'impressions', 'clicks', 'conversion',
      'total_complete_payment_rate', 'ctr', 'cpc', 'cpm', 'reach',
      'frequency', 'video_play_actions', 'video_watched_6s',
      'total_purchase_value',
    ]),
    start_date: dateRange.since,
    end_date: dateRange.until,
    page_size: '50',
  });

  const res = await fetch(
    `${TIKTOK_API}/report/integrated/get/?${params}`,
    {
      headers: { 'Access-Token': accessToken },
    }
  );

  const data = await res.json();
  if (data.code !== 0) throw new Error(data.message || 'TikTok API error');

  return (data.data?.list || []).map((r: any) => {
    const m = r.metrics;
    const spend = parseFloat(m.spend || '0');
    const purchaseValue = parseFloat(m.total_purchase_value || '0');
    return {
      campaignId: r.dimensions.campaign_id,
      campaignName: m.campaign_name || '',
      spend,
      impressions: parseInt(m.impressions || '0'),
      clicks: parseInt(m.clicks || '0'),
      conversions: parseInt(m.conversion || '0'),
      conversionValue: purchaseValue,
      ctr: parseFloat(m.ctr || '0') * 100,
      cpc: parseFloat(m.cpc || '0'),
      cpm: parseFloat(m.cpm || '0'),
      roas: spend > 0 ? purchaseValue / spend : 0,
      reach: parseInt(m.reach || '0'),
      frequency: parseFloat(m.frequency || '0'),
      videoViews: parseInt(m.video_play_actions || '0'),
      videoWatched6s: parseInt(m.video_watched_6s || '0'),
    };
  });
}

export async function toggleTikTokCampaign(
  advertiserId: string,
  campaignId: string,
  status: 'ENABLE' | 'DISABLE',
  accessToken: string
): Promise<boolean> {
  const res = await fetch(`${TIKTOK_API}/campaign/status/update/`, {
    method: 'POST',
    headers: {
      'Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      advertiser_id: advertiserId,
      campaign_ids: [campaignId],
      operation_status: status,
    }),
  });

  const data = await res.json();
  if (data.code !== 0) throw new Error(data.message || 'TikTok API error');
  return true;
}
