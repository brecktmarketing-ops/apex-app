-- Add billing columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_status TEXT DEFAULT 'none';

-- Add integration columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_provider TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_api_key TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sms_provider TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sms_api_key TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sms_phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shopify_domain TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shopify_token TEXT;

-- Add message_log table for email/SMS tracking
CREATE TABLE IF NOT EXISTS message_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  enrollment_id UUID,
  step_id UUID,
  channel TEXT NOT NULL, -- 'email' or 'sms'
  recipient TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'delivered', 'opened', 'clicked'
  error TEXT,
  external_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_log_user ON message_log(user_id);

ALTER TABLE message_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages" ON message_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages" ON message_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);
