export interface Profile {
  id: string;
  full_name: string | null;
  company_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdConnection {
  id: string;
  user_id: string;
  platform: 'meta' | 'google' | 'tiktok';
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  account_id: string | null;
  account_name: string | null;
  status: 'active' | 'disconnected' | 'error';
  last_synced_at: string | null;
  created_at: string;
}

export interface Campaign {
  id: string;
  user_id: string;
  connection_id: string;
  platform: 'meta' | 'google' | 'tiktok';
  platform_campaign_id: string;
  name: string;
  status: 'active' | 'paused' | 'killed';
  spend: number;
  revenue: number;
  leads: number;
  roas: number;
  cpl: number;
  ctr: number;
  impressions: number;
  clicks: number;
  cpm: number;
  hook_rate: number | null;
  platform_data: Record<string, unknown>;
  date_range_start: string | null;
  date_range_end: string | null;
  synced_at: string;
  created_at: string;
}

export interface CampaignDaily {
  id: string;
  user_id: string;
  campaign_id: string;
  date: string;
  spend: number;
  revenue: number;
  leads: number;
  clicks: number;
  impressions: number;
}

export interface KillRule {
  id: string;
  user_id: string;
  campaign_id: string | null;
  rule_type: 'kill' | 'pause' | 'scale';
  title: string;
  description: string;
  status: 'pending' | 'applied' | 'dismissed';
  created_at: string;
}

export interface WandaConversation {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface WandaMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface TrackerMetrics {
  id: string;
  user_id: string;
  period: string;
  revenue: number | null;
  orders: number | null;
  sessions: number | null;
  visitors: number | null;
  product_views: number | null;
  add_to_cart: number | null;
  ad_spend: number | null;
  email_subs: number | null;
  aov: number | null;
  cvr: number | null;
  roas: number | null;
  data: Record<string, unknown>;
  created_at: string;
}

export interface PipelineLead {
  id: string;
  user_id: string;
  name: string;
  business: string | null;
  location: string | null;
  stage: 'raw' | 'contacted' | 'replied' | 'active';
  tags: string[];
  notes: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}
