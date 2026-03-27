const GOOGLE_ADS_API = 'https://googleads.googleapis.com/v18';

export interface GoogleCampaign {
  id: string;
  name: string;
  status: string;
  advertisingChannelType: string;
  biddingStrategyType: string;
}

export interface GoogleMetrics {
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
}

export async function getGoogleCampaigns(
  customerId: string,
  accessToken: string,
  developerToken: string
): Promise<GoogleCampaign[]> {
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      campaign.bidding_strategy_type
    FROM campaign
    WHERE campaign.status != 'REMOVED'
    ORDER BY campaign.name
  `;

  const res = await fetch(
    `${GOOGLE_ADS_API}/customers/${customerId}/googleAds:searchStream`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  );

  const data = await res.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

  const results = data[0]?.results || [];
  return results.map((r: any) => ({
    id: r.campaign.id,
    name: r.campaign.name,
    status: r.campaign.status,
    advertisingChannelType: r.campaign.advertisingChannelType,
    biddingStrategyType: r.campaign.biddingStrategyType,
  }));
}

export async function getGoogleCampaignMetrics(
  customerId: string,
  accessToken: string,
  developerToken: string,
  dateRange: { since: string; until: string }
): Promise<GoogleMetrics[]> {
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.conversions_value,
      metrics.ctr,
      metrics.average_cpc,
      metrics.average_cpm
    FROM campaign
    WHERE campaign.status != 'REMOVED'
      AND segments.date BETWEEN '${dateRange.since}' AND '${dateRange.until}'
    ORDER BY metrics.cost_micros DESC
  `;

  const res = await fetch(
    `${GOOGLE_ADS_API}/customers/${customerId}/googleAds:searchStream`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  );

  const data = await res.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

  const results = data[0]?.results || [];
  return results.map((r: any) => {
    const spend = (r.metrics.costMicros || 0) / 1_000_000;
    const convValue = r.metrics.conversionsValue || 0;
    return {
      campaignId: r.campaign.id,
      campaignName: r.campaign.name,
      spend,
      impressions: r.metrics.impressions || 0,
      clicks: r.metrics.clicks || 0,
      conversions: r.metrics.conversions || 0,
      conversionValue: convValue,
      ctr: (r.metrics.ctr || 0) * 100,
      cpc: (r.metrics.averageCpc || 0) / 1_000_000,
      cpm: (r.metrics.averageCpm || 0) / 1_000_000,
      roas: spend > 0 ? convValue / spend : 0,
    };
  });
}

export async function toggleGoogleCampaign(
  customerId: string,
  campaignId: string,
  status: 'ENABLED' | 'PAUSED',
  accessToken: string,
  developerToken: string
): Promise<boolean> {
  const res = await fetch(
    `${GOOGLE_ADS_API}/customers/${customerId}/campaigns:mutate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operations: [{
          update: {
            resourceName: `customers/${customerId}/campaigns/${campaignId}`,
            status,
          },
          updateMask: 'status',
        }],
      }),
    }
  );

  const data = await res.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return true;
}

export function getDateRange(preset: string): { since: string; until: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const today = fmt(now);

  switch (preset) {
    case 'today': return { since: today, until: today };
    case 'yesterday': {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      return { since: fmt(y), until: fmt(y) };
    }
    case 'last_7d': {
      const d = new Date(now); d.setDate(d.getDate() - 7);
      return { since: fmt(d), until: today };
    }
    case 'last_14d': {
      const d = new Date(now); d.setDate(d.getDate() - 14);
      return { since: fmt(d), until: today };
    }
    case 'last_30d': {
      const d = new Date(now); d.setDate(d.getDate() - 30);
      return { since: fmt(d), until: today };
    }
    case 'last_90d': {
      const d = new Date(now); d.setDate(d.getDate() - 90);
      return { since: fmt(d), until: today };
    }
    case 'this_month': {
      return { since: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, until: today };
    }
    case 'last_month': {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lme = new Date(now.getFullYear(), now.getMonth(), 0);
      return { since: fmt(lm), until: fmt(lme) };
    }
    default: {
      const d = new Date(now); d.setDate(d.getDate() - 30);
      return { since: fmt(d), until: today };
    }
  }
}
