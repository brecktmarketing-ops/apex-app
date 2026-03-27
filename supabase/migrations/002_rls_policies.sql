-- Row Level Security: Every user can ONLY access their own data

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Ad Connections
ALTER TABLE ad_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own connections" ON ad_connections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own connections" ON ad_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own connections" ON ad_connections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own connections" ON ad_connections FOR DELETE USING (auth.uid() = user_id);

-- Campaigns
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own campaigns" ON campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own campaigns" ON campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own campaigns" ON campaigns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own campaigns" ON campaigns FOR DELETE USING (auth.uid() = user_id);

-- Campaign Daily
ALTER TABLE campaign_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own daily" ON campaign_daily FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own daily" ON campaign_daily FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Kill Rules
ALTER TABLE kill_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own rules" ON kill_rules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own rules" ON kill_rules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own rules" ON kill_rules FOR UPDATE USING (auth.uid() = user_id);

-- Wanda Conversations
ALTER TABLE wanda_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own convos" ON wanda_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own convos" ON wanda_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own convos" ON wanda_conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own convos" ON wanda_conversations FOR DELETE USING (auth.uid() = user_id);

-- Wanda Messages
ALTER TABLE wanda_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own messages" ON wanda_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own messages" ON wanda_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Tracker Metrics
ALTER TABLE tracker_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own metrics" ON tracker_metrics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own metrics" ON tracker_metrics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own metrics" ON tracker_metrics FOR UPDATE USING (auth.uid() = user_id);

-- Pipeline Leads
ALTER TABLE pipeline_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own leads" ON pipeline_leads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own leads" ON pipeline_leads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own leads" ON pipeline_leads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own leads" ON pipeline_leads FOR DELETE USING (auth.uid() = user_id);
