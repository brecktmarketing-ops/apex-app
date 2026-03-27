'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Campaign } from '@/lib/types';

export default function TikTokPage() {
  const supabase = createClient();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('campaigns').select('*').eq('platform', 'tiktok').order('spend', { ascending: false });
      setCampaigns(data || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div>
      {!loading && campaigns.length === 0 && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>◐</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>No TikTok campaigns</h3>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Connect your TikTok Ads account in Settings to start syncing.</p>
          <a href="/dashboard/settings" style={{ display: 'inline-block', padding: '10px 20px', background: 'var(--accent)', color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Connect TikTok</a>
        </div>
      )}
      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Loading...</div>}
    </div>
  );
}
