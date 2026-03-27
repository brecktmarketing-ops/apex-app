-- Automation Sequences
CREATE TABLE sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('pipeline_stage', 'tag_added', 'manual', 'schedule', 'no_reply', 'no_purchase')),
  trigger_config JSONB DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Sequence Steps (email, sms, delay, condition)
CREATE TABLE sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_type TEXT NOT NULL CHECK (step_type IN ('email', 'sms', 'delay', 'condition')),
  subject TEXT,
  body TEXT,
  delay_hours INTEGER,
  condition_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sequence Enrollments (which leads are in which sequences)
CREATE TABLE sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES pipeline_leads(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'replied')),
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  next_action_at TIMESTAMPTZ,
  UNIQUE(sequence_id, lead_id)
);

-- Message Log (every email/sms sent)
CREATE TABLE message_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sequence_id UUID REFERENCES sequences(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES pipeline_leads(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  to_address TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed')),
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own sequences" ON sequences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE sequence_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own steps" ON sequence_steps FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE sequence_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own enrollments" ON sequence_enrollments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE message_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own messages" ON message_log FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_sequence_steps_seq ON sequence_steps(sequence_id);
CREATE INDEX idx_enrollments_seq ON sequence_enrollments(sequence_id);
CREATE INDEX idx_enrollments_lead ON sequence_enrollments(lead_id);
CREATE INDEX idx_message_log_user ON message_log(user_id);
