const META_API_VERSION = 'v21.0';
const META_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

export interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget?: string;
  lifetime_budget?: string;
}

export interface MetaAdSet {
  id: string;
  name: string;
  status: string;
  daily_budget?: string;
  lifetime_budget?: string;
  targeting?: Record<string, unknown>;
  optimization_goal?: string;
  billing_event?: string;
}

export interface MetaAd {
  id: string;
  name: string;
  status: string;
  creative?: Record<string, unknown>;
}

export interface MetaInsights {
  campaign_id: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  actions?: { action_type: string; value: string }[];
  cost_per_action_type?: { action_type: string; value: string }[];
  purchase_roas?: { action_type: string; value: string }[];
}

const INSIGHT_FIELDS = 'spend,impressions,clicks,ctr,cpm,reach,frequency,cost_per_unique_click,cpp,actions,cost_per_action_type,purchase_roas';

export async function getMetaAdAccounts(token: string): Promise<{ id: string; name: string; account_status: number }[]> {
  const res = await fetch(`${META_BASE}/me/adaccounts?fields=id,name,account_status&access_token=${token}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data || [];
}

export async function getMetaCampaigns(accountId: string, token: string): Promise<MetaCampaign[]> {
  const id = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
  const res = await fetch(
    `${META_BASE}/${id}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget&limit=50&access_token=${token}`
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data || [];
}

export async function getMetaAdSets(accountId: string, token: string, campaignId: string): Promise<MetaAdSet[]> {
  const res = await fetch(
    `${META_BASE}/${campaignId}/adsets?fields=id,name,status,daily_budget,lifetime_budget,targeting,optimization_goal,billing_event&limit=50&access_token=${token}`
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data || [];
}

export async function getMetaAds(accountId: string, token: string, adsetId: string): Promise<MetaAd[]> {
  const res = await fetch(
    `${META_BASE}/${adsetId}/ads?fields=id,name,status,creative{id,name,object_type,title,body,thumbnail_url}&limit=50&access_token=${token}`
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data || [];
}

export async function getMetaCampaignInsights(
  accountId: string,
  token: string,
  datePreset: string = 'last_30d'
): Promise<any[]> {
  const id = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
  const res = await fetch(
    `${META_BASE}/${id}/insights?fields=campaign_id,campaign_name,${INSIGHT_FIELDS}&level=campaign&date_preset=${datePreset}&limit=50&access_token=${token}`
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data || [];
}

export async function getMetaCampaignInsightsRange(
  accountId: string,
  token: string,
  since: string,
  until: string
): Promise<any[]> {
  const id = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
  const res = await fetch(
    `${META_BASE}/${id}/insights?fields=campaign_id,campaign_name,${INSIGHT_FIELDS}&level=campaign&time_range={"since":"${since}","until":"${until}"}&limit=50&access_token=${token}`
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data || [];
}

export async function getMetaAdSetInsights(
  accountId: string,
  token: string,
  adsetId: string,
  datePreset: string = 'last_30d'
): Promise<any[]> {
  const res = await fetch(
    `${META_BASE}/${adsetId}/insights?fields=${INSIGHT_FIELDS}&date_preset=${datePreset}&limit=1&access_token=${token}`
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data || [];
}

export async function getMetaAdInsights(
  accountId: string,
  token: string,
  adId: string,
  datePreset: string = 'last_30d'
): Promise<any[]> {
  const res = await fetch(
    `${META_BASE}/${adId}/insights?fields=${INSIGHT_FIELDS}&date_preset=${datePreset}&limit=1&access_token=${token}`
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data || [];
}

export async function getMetaDailyInsights(
  accountId: string,
  token: string,
  datePreset: string = 'last_30d'
): Promise<any[]> {
  const id = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
  const res = await fetch(
    `${META_BASE}/${id}/insights?fields=campaign_id,${INSIGHT_FIELDS.split(',').slice(0, 4).join(',')},actions&level=campaign&date_preset=${datePreset}&time_increment=1&limit=500&access_token=${token}`
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.data || [];
}

export async function toggleMetaCampaign(
  campaignId: string,
  status: 'ACTIVE' | 'PAUSED',
  token: string
): Promise<boolean> {
  const res = await fetch(`${META_BASE}/${campaignId}?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.success || true;
}

export function parseMetaInsights(insights: any[]) {
  return insights.map(row => {
    const purchases = row.actions?.find((a: any) => a.action_type === 'purchase')?.value || '0';
    const leads = row.actions?.find((a: any) => a.action_type === 'lead')?.value || '0';
    const roas = row.purchase_roas?.find((a: any) => a.action_type === 'omni_purchase')?.value || '0';
    const cpl = row.cost_per_action_type?.find((a: any) => a.action_type === 'lead')?.value || '0';

    const spendVal = parseFloat(row.spend || '0');
    const clicksVal = parseInt(row.clicks || '0');

    return {
      campaign_id: row.campaign_id,
      campaign_name: row.campaign_name,
      spend: spendVal,
      impressions: parseInt(row.impressions || '0'),
      clicks: clicksVal,
      ctr: parseFloat(row.ctr || '0'),
      cpm: parseFloat(row.cpm || '0'),
      cpc: clicksVal > 0 ? spendVal / clicksVal : 0,
      reach: parseInt(row.reach || '0'),
      frequency: parseFloat(row.frequency || '0'),
      cpp: parseFloat(row.cpp || '0'),
      cost_per_unique_click: parseFloat(row.cost_per_unique_click || '0'),
      purchases: parseInt(purchases),
      leads: parseInt(leads),
      roas: parseFloat(roas),
      cpl: parseFloat(cpl),
      revenue: spendVal * parseFloat(roas),
      date_start: row.date_start,
      date_stop: row.date_stop,
    };
  });
}
