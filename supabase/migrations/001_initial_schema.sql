-- APEX Platform Schema

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  company_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Ad Platform Connections
CREATE TABLE ad_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('meta', 'google', 'tiktok')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  account_id TEXT,
  account_name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disconnected', 'error')),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, platform, account_id)
);

-- Campaigns (cached from ad platforms)
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES ad_connections(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  spend NUMERIC(12,2) DEFAULT 0,
  revenue NUMERIC(12,2) DEFAULT 0,
  leads INTEGER DEFAULT 0,
  roas NUMERIC(8,4) DEFAULT 0,
  cpl NUMERIC(8,2) DEFAULT 0,
  ctr NUMERIC(6,4) DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  cpm NUMERIC(8,2) DEFAULT 0,
  hook_rate NUMERIC(5,2),
  platform_data JSONB DEFAULT '{}',
  date_range_start DATE,
  date_range_end DATE,
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, platform, platform_campaign_id)
);

-- Daily campaign metrics (for charts)
CREATE TABLE campaign_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  spend NUMERIC(12,2) DEFAULT 0,
  revenue NUMERIC(12,2) DEFAULT 0,
  leads INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  UNIQUE(campaign_id, date)
);

-- AI Kill/Scale Rules
CREATE TABLE kill_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('kill', 'pause', 'scale')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Wanda AI Conversations
CREATE TABLE wanda_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Wanda AI Messages
CREATE TABLE wanda_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES wanda_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ecom Tracker Metrics
CREATE TABLE tracker_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  revenue NUMERIC(12,2),
  orders INTEGER,
  sessions INTEGER,
  visitors INTEGER,
  product_views INTEGER,
  add_to_cart INTEGER,
  ad_spend NUMERIC(12,2),
  email_subs INTEGER,
  aov NUMERIC(8,2),
  cvr NUMERIC(6,4),
  roas NUMERIC(8,4),
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, period)
);

-- Pipeline Leads
CREATE TABLE pipeline_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  business TEXT,
  location TEXT,
  stage TEXT DEFAULT 'raw' CHECK (stage IN ('raw', 'contacted', 'replied', 'active')),
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_campaigns_user ON campaigns(user_id);
CREATE INDEX idx_campaign_daily_campaign ON campaign_daily(campaign_id);
CREATE INDEX idx_kill_rules_user ON kill_rules(user_id);
CREATE INDEX idx_wanda_messages_conv ON wanda_messages(conversation_id);
CREATE INDEX idx_pipeline_leads_user ON pipeline_leads(user_id);
CREATE INDEX idx_tracker_metrics_user ON tracker_metrics(user_id);
