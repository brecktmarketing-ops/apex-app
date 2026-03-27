'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Legend,
} from 'recharts';

/* ── design tokens ── */
const accent = '#10b981';
const platformColors: Record<string, string> = {
  meta: '#6366f1',
  google: '#fbbf24',
  tiktok: '#f472b6',
  facebook: '#6366f1',
  other: '#60a5fa',
};
const card: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 };
const lbl: React.CSSProperties = { fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 14 };
const emptyBox: React.CSSProperties = { ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 40, color: 'var(--muted)', fontSize: 13 };

/* ── helpers ── */
const fmt = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
};
const fmtNum = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};
const pct = (n: number) => `${(n * 100).toFixed(2)}%`;
const roasColor = (r: number) => r >= 3 ? 'var(--green)' : r >= 1.5 ? 'var(--yellow)' : 'var(--red)';
const ctrColor = (c: number) => c >= 2 ? 'var(--green)' : c >= 1 ? 'var(--yellow)' : 'var(--red)';
const daysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
};
const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

/* ── types ── */
interface Campaign {
  id: string;
  name: string;
  platform: string;
  spend: number;
  revenue: number;
  roas: number;
  leads: number;
  clicks: number;
  impressions: number;
  ctr: number;
  cpm: number;
  status?: string;
}
interface DailyRow {
  date: string;
  spend: number;
  revenue: number;
  leads: number;
  clicks: number;
  impressions: number;
}
interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  stage: string;
  source: string;
  platform: string;
  campaign_name: string;
  purchase_amount: number;
  created_at: string;
}
interface TrackerMetric {
  period: string;
  revenue: number;
  orders: number;
  sessions: number;
  visitors: number;
  product_views: number;
  add_to_cart: number;
  ad_spend: number;
  aov: number;
  cvr: number;
  roas: number;
  data: any;
}
interface MsgLog {
  channel: string;
  status: string;
  created_at: string;
}

const DATE_RANGES = [
  { label: '7d', days: 7 },
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
] as const;

export default function TrackerPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);

  /* data state */
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [messages, setMessages] = useState<MsgLog[]>([]);
  const [shopify, setShopify] = useState<TrackerMetric | null>(null);
  const [syncing, setSyncing] = useState(false);

  /* ── fetch all data ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    const since = daysAgo(range);

    const [campRes, dailyRes, leadRes, msgRes, shopRes] = await Promise.all([
      supabase.from('campaigns').select('*'),
      supabase.from('campaign_daily').select('*').gte('date', since).order('date'),
      supabase.from('pipeline_leads').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('message_log').select('*'),
      supabase.from('tracker_metrics').select('*').eq('period', 'latest').maybeSingle(),
    ]);

    if (campRes.data) setCampaigns(campRes.data);
    if (dailyRes.data) setDaily(dailyRes.data);
    if (leadRes.data) setLeads(leadRes.data);
    if (msgRes.data) setMessages(msgRes.data);
    if (shopRes.data) setShopify(shopRes.data);

    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── computed KPIs ── */
  const totalSpend = campaigns.reduce((s, c) => s + (c.spend || 0), 0);
  const totalRevenue = campaigns.reduce((s, c) => s + (c.revenue || 0), 0);
  const blendedRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const totalLeads = campaigns.reduce((s, c) => s + (c.leads || 0), 0);
  const totalClicks = campaigns.reduce((s, c) => s + (c.clicks || 0), 0);
  const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions || 0), 0);
  const avgCtr = campaigns.length > 0 ? campaigns.reduce((s, c) => s + (c.ctr || 0), 0) / campaigns.length : 0;
  const cpl = totalLeads > 0 ? totalSpend / totalLeads : 0;

  const kpis = [
    { icon: '⊕', label: 'Ad Spend', value: fmt(totalSpend), color: '#fb923c' },
    { icon: '◈', label: 'Revenue', value: fmt(totalRevenue), color: accent },
    { icon: '⊛', label: 'ROAS', value: `${blendedRoas.toFixed(2)}x`, color: '#6366f1' },
    { icon: '↑', label: 'Leads', value: fmtNum(totalLeads), color: '#60a5fa' },
    { icon: '◎', label: 'Clicks', value: fmtNum(totalClicks), color: '#a78bfa' },
    { icon: '◐', label: 'CTR', value: pct(avgCtr / 100), color: '#fbbf24' },
    { icon: '✦', label: 'CPL', value: fmt(cpl), color: '#f472b6' },
    { icon: '◉', label: 'Impressions', value: fmtNum(totalImpressions), color: '#22c55e' },
  ];

  /* ── chart data: group daily by date ── */
  const chartData = Object.values(
    daily.reduce<Record<string, { date: string; spend: number; revenue: number }>>((acc, r) => {
      if (!acc[r.date]) acc[r.date] = { date: r.date, spend: 0, revenue: 0 };
      acc[r.date].spend += r.spend || 0;
      acc[r.date].revenue += r.revenue || 0;
      return acc;
    }, {})
  ).sort((a, b) => a.date.localeCompare(b.date));

  /* ── platform breakdown ── */
  const platformMap = campaigns.reduce<Record<string, { spend: number; revenue: number }>>((acc, c) => {
    const p = (c.platform || 'other').toLowerCase();
    if (!acc[p]) acc[p] = { spend: 0, revenue: 0 };
    acc[p].spend += c.spend || 0;
    acc[p].revenue += c.revenue || 0;
    return acc;
  }, {});
  const platformData = Object.entries(platformMap).map(([platform, v]) => ({
    platform: platform.charAt(0).toUpperCase() + platform.slice(1),
    spend: v.spend,
    revenue: v.revenue,
    roas: v.spend > 0 ? v.revenue / v.spend : 0,
    color: platformColors[platform] || platformColors.other,
  }));

  /* ── lead stage counts ── */
  const stageCounts = leads.reduce<Record<string, number>>((acc, l) => {
    const stage = l.stage || 'Raw';
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {});
  const stageLabels = ['Raw', 'Contacted', 'Replied', 'Active'];

  /* ── message stats ── */
  const emailsSent = messages.filter(m => m.channel === 'email').length;
  const smsSent = messages.filter(m => m.channel === 'sms').length;
  const emailDelivered = messages.filter(m => m.channel === 'email' && m.status === 'delivered').length;
  const emailOpened = messages.filter(m => m.channel === 'email' && m.status === 'opened').length;
  const deliveryRate = emailsSent > 0 ? ((emailDelivered + emailOpened) / emailsSent * 100).toFixed(1) : '0';

  /* ── sorted campaigns ── */
  const sortedCampaigns = [...campaigns].sort((a, b) => (b.spend || 0) - (a.spend || 0));

  /* ── sync shopify ── */
  const syncShopify = async () => {
    setSyncing(true);
    try {
      await fetch('/api/tracker/sync', { method: 'POST' });
      const { data } = await supabase.from('tracker_metrics').select('*').eq('period', 'latest').maybeSingle();
      if (data) setShopify(data);
    } catch (e) {
      console.error('Shopify sync failed', e);
    }
    setSyncing(false);
  };

  /* ── loading state ── */
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, color: 'var(--muted)', fontSize: 14 }}>
        Loading tracker data...
      </div>
    );
  }

  const noData = campaigns.length === 0;

  return (
    <div>
      {/* ═══ KPI STRIP ═══ */}
      <div style={{ borderBottom: '1px solid var(--border)', padding: '0 0 14px', marginBottom: 16, overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 32, minWidth: 'max-content' }}>
          {kpis.map((k, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 11, color: k.color }}>{k.icon}</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em' }}>{k.value}</span>
              </div>
              <span style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>{k.label}</span>
            </div>
          ))}
        </div>
      </div>

      {noData && (
        <div style={emptyBox}>
          <span style={{ fontSize: 28 }}>◎</span>
          <span>No campaign data yet. Connect your ad accounts in Settings to start tracking.</span>
        </div>
      )}

      {!noData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ═══ PERFORMANCE CHART ═══ */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div>
                <p style={{ ...lbl, marginBottom: 2 }}>Performance Over Time</p>
                <p style={{ fontSize: 11, color: 'var(--muted)' }}>Spend vs Revenue</p>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {DATE_RANGES.map(r => (
                  <button key={r.days} onClick={() => setRange(r.days)} style={{
                    background: range === r.days ? 'var(--accent-dim)' : 'none',
                    border: range === r.days ? '1px solid var(--accent-glow)' : '1px solid var(--border)',
                    borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    color: range === r.days ? 'var(--accent)' : 'var(--muted)', fontFamily: 'inherit',
                  }}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            {chartData.length === 0 ? (
              <div style={{ height: 190, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>No daily data for this range</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fb923c" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#fb923c" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={accent} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)' }} formatter={(v) => fmt(Number(v ?? 0))} />
                  <Area type="monotone" dataKey="spend" name="Spend" stroke="#fb923c" strokeWidth={2} fill="url(#spendGrad)" dot={false} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke={accent} strokeWidth={2} fill="url(#revGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8 }}>
              {[{ c: '#fb923c', l: 'Spend' }, { c: accent, l: 'Revenue' }].map(({ c, l }) => (
                <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: c, display: 'inline-block' }} />{l}
                </span>
              ))}
            </div>
          </div>

          {/* ═══ TWO COLUMN: Platform Breakdown + Email/SMS ═══ */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* Platform Breakdown */}
            <div style={card}>
              <p style={lbl}>Platform Breakdown</p>
              {platformData.length === 0 ? (
                <div style={{ color: 'var(--muted)', fontSize: 13, padding: 20, textAlign: 'center' }}>No platform data</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={platformData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="platform" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)' }} formatter={(v) => fmt(Number(v ?? 0))} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="spend" name="Spend" fill="#fb923c" fillOpacity={0.5} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="revenue" name="Revenue" fill={accent} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
                    {platformData.map((p, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < platformData.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{p.platform}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 16 }}>
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Spend: {fmt(p.spend)}</span>
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Rev: {fmt(p.revenue)}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: roasColor(p.roas) }}>{p.roas.toFixed(2)}x</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Email/SMS Stats */}
            <div style={card}>
              <p style={lbl}>Email / SMS Stats</p>
              {messages.length === 0 ? (
                <div style={{ color: 'var(--muted)', fontSize: 13, padding: 20, textAlign: 'center' }}>No message data yet</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { label: 'Emails Sent', value: fmtNum(emailsSent), color: '#6366f1' },
                    { label: 'SMS Sent', value: fmtNum(smsSent), color: accent },
                    { label: 'Delivery Rate', value: `${deliveryRate}%`, color: '#fbbf24' },
                    { label: 'Opens', value: fmtNum(emailOpened), color: '#f472b6' },
                  ].map((s, i) => (
                    <div key={i} style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 6 }}>{s.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ═══ CAMPAIGN PERFORMANCE TABLE ═══ */}
          <div style={card}>
            <p style={lbl}>Campaign Performance</p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {['Campaign', 'Platform', 'Spend', 'Revenue', 'ROAS', 'Leads', 'CTR', 'Status'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedCampaigns.map((c, i) => (
                    <tr key={c.id || i} style={{ borderBottom: i < sortedCampaigns.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td style={{ padding: '10px 10px', fontWeight: 600, color: 'var(--text)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</td>
                      <td style={{ padding: '10px 10px' }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: platformColors[(c.platform || '').toLowerCase()] || 'var(--muted)', background: `${platformColors[(c.platform || '').toLowerCase()] || '#666'}18`, borderRadius: 6, padding: '2px 8px' }}>
                          {c.platform || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 10px', fontWeight: 700, color: 'var(--text)' }}>{fmt(c.spend || 0)}</td>
                      <td style={{ padding: '10px 10px', fontWeight: 700, color: accent }}>{fmt(c.revenue || 0)}</td>
                      <td style={{ padding: '10px 10px', fontWeight: 700, color: roasColor(c.roas || 0) }}>{(c.roas || 0).toFixed(2)}x</td>
                      <td style={{ padding: '10px 10px', color: 'var(--text)' }}>{c.leads || 0}</td>
                      <td style={{ padding: '10px 10px', fontWeight: 600, color: ctrColor(c.ctr || 0) }}>{(c.ctr || 0).toFixed(2)}%</td>
                      <td style={{ padding: '10px 10px' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 600, borderRadius: 6, padding: '2px 8px',
                          color: (c.status || '').toLowerCase() === 'active' ? 'var(--green)' : 'var(--muted)',
                          background: (c.status || '').toLowerCase() === 'active' ? 'var(--green)18' : 'var(--border)',
                        }}>
                          {c.status || 'Unknown'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ═══ TWO COLUMN: Lead Activity + Shopify ═══ */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* Lead Activity */}
            <div style={card}>
              <p style={lbl}>Lead Activity</p>
              {/* Stage counts */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {stageLabels.map(s => {
                  const count = stageCounts[s] || 0;
                  const colors: Record<string, string> = { Raw: '#60a5fa', Contacted: '#fbbf24', Replied: '#6366f1', Active: accent };
                  return (
                    <div key={s} style={{ flex: 1, background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: colors[s] || 'var(--text)' }}>{count}</div>
                      <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginTop: 2 }}>{s}</div>
                    </div>
                  );
                })}
              </div>
              {/* Recent leads list */}
              {leads.length === 0 ? (
                <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 16 }}>No leads yet</div>
              ) : (
                <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                  {leads.slice(0, 15).map((l, i) => (
                    <div key={l.id || i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < Math.min(leads.length, 15) - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{l.name || 'Unknown'}</div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>
                          {l.source || l.platform || '—'} {l.platform ? `· ${l.platform}` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 600, borderRadius: 6, padding: '2px 7px',
                          color: l.stage === 'Active' ? 'var(--green)' : l.stage === 'Replied' ? '#6366f1' : 'var(--muted)',
                          background: l.stage === 'Active' ? 'var(--green)14' : l.stage === 'Replied' ? '#6366f114' : 'var(--border)',
                        }}>
                          {l.stage || 'Raw'}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--muted)' }}>{l.created_at ? timeAgo(l.created_at) : ''}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Shopify Section */}
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <p style={{ ...lbl, marginBottom: 0 }}>Shopify</p>
                <button onClick={syncShopify} disabled={syncing} style={{
                  background: 'var(--accent-dim)', border: '1px solid var(--accent-glow)', borderRadius: 8,
                  padding: '5px 14px', fontSize: 11, fontWeight: 600, color: 'var(--accent)', cursor: 'pointer',
                  fontFamily: 'inherit', opacity: syncing ? 0.6 : 1,
                }}>
                  {syncing ? 'Syncing...' : 'Sync Shopify'}
                </button>
              </div>

              {!shopify ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 30, color: 'var(--muted)', fontSize: 13 }}>
                  <span style={{ fontSize: 28 }}>◈</span>
                  <span>Connect Shopify in Settings</span>
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                    {[
                      { label: 'Orders', value: fmtNum(shopify.orders || 0), color: '#6366f1' },
                      { label: 'Revenue', value: fmt(shopify.revenue || 0), color: accent },
                      { label: 'AOV', value: fmt(shopify.aov || 0), color: '#fbbf24' },
                      { label: 'CVR', value: `${((shopify.cvr || 0) * 100).toFixed(1)}%`, color: '#f472b6' },
                    ].map((s, i) => (
                      <div key={i} style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 4 }}>{s.label}</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                  {shopify.data?.top_products && Array.isArray(shopify.data.top_products) && (
                    <>
                      <p style={{ ...lbl, marginTop: 8 }}>Top Products</p>
                      {shopify.data.top_products.slice(0, 5).map((p: any, i: number) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < Math.min(shopify.data.top_products.length, 5) - 1 ? '1px solid var(--border)' : 'none' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{p.name || p.title || 'Product'}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: accent }}>{p.revenue ? fmt(p.revenue) : `${p.quantity || 0} sold`}</span>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
