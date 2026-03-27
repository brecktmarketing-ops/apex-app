-- Wanda Brain: persistent per-user memory
CREATE TABLE wanda_brain (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'business', 'goals', 'pain_points', 'wins', 'preferences', 'context'
  fact TEXT NOT NULL,
  source TEXT, -- which conversation it came from
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_wanda_brain_user ON wanda_brain(user_id);

-- RLS
ALTER TABLE wanda_brain ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own brain" ON wanda_brain
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own brain" ON wanda_brain
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own brain" ON wanda_brain
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own brain" ON wanda_brain
  FOR DELETE USING (auth.uid() = user_id);

-- Service role bypass for API
CREATE POLICY "Service role full access brain" ON wanda_brain
  FOR ALL USING (true) WITH CHECK (true);
