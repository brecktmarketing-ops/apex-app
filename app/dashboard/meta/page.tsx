'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Campaign } from '@/lib/types';

export default function MetaPage() {
  const supabase = createClient();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('campaigns').select('*').eq('platform', 'meta').order('spend', { ascending: false });
      setCampaigns(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const totalSpend = campaigns.reduce((s, c) => s + Number(c.spend), 0);
  const totalRevenue = campaigns.reduce((s, c) => s + Number(c.revenue), 0);
  const roas = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : '0';
  const totalLeads = campaigns.reduce((s, c) => s + c.leads, 0);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Meta Spend', value: `$${totalSpend.toLocaleString()}` },
          { label: 'Revenue', value: `$${totalRevenue.toLocaleString()}` },
          { label: 'ROAS', value: `${roas}x` },
          { label: 'Leads', value: `${totalLeads}` },
        ].map((k, i) => (
          <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, boxShadow: 'var(--shadow)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -1, color: 'var(--text)' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {!loading && campaigns.length === 0 && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>◉</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>No Meta campaigns</h3>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Connect your Meta ad account in Settings to start syncing campaigns.</p>
          <a href="/dashboard/settings" style={{ display: 'inline-block', padding: '10px 20px', background: 'var(--accent)', color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Connect Meta</a>
        </div>
      )}

      {campaigns.length > 0 && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '44px 2fr 1fr 1fr 1fr 1fr 80px', padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--card2)' }}>
            {['', 'Campaign', 'Spend', 'Revenue', 'ROAS', 'CTR', 'Status'].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 0.6 }}>{h}</div>
            ))}
          </div>
          {campaigns.map(c => (
            <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '44px 2fr 1fr 1fr 1fr 1fr 80px', padding: '12px 16px', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
              <div onClick={async () => { const s = c.status === 'active' ? 'paused' : 'active'; await supabase.from('campaigns').update({ status: s }).eq('id', c.id); setCampaigns(p => p.map(x => x.id === c.id ? { ...x, status: s } : x)); }}
                style={{ width: 38, height: 22, borderRadius: 11, cursor: 'pointer', position: 'relative', background: c.status === 'active' ? 'var(--green-dim)' : 'var(--red-dim)', border: c.status === 'active' ? '1px solid rgba(22,163,74,0.3)' : '1px solid rgba(220,38,38,0.2)' }}>
                <div style={{ position: 'absolute', top: 3, width: 14, height: 14, borderRadius: '50%', background: c.status === 'active' ? 'var(--green)' : 'var(--red)', ...(c.status === 'active' ? { right: 3 } : { left: 3 }) }} />
              </div>
              <div><div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div></div>
              <div style={{ fontSize: 13 }}>${Number(c.spend).toLocaleString()}</div>
              <div style={{ fontSize: 13 }}>${Number(c.revenue).toLocaleString()}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: Number(c.roas) > 2 ? 'var(--green)' : 'var(--text)' }}>{c.roas}x</div>
              <div style={{ fontSize: 13 }}>{c.ctr}%</div>
              <div><span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, color: c.status === 'active' ? 'var(--green)' : 'var(--muted)', background: c.status === 'active' ? 'var(--green-dim)' : 'var(--card2)', textTransform: 'capitalize' }}>{c.status}</span></div>
            </div>
          ))}
        </div>
      )}
      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Loading...</div>}
    </div>
  );
}
