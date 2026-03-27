'use client';

import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const accent = '#ef4444';

const growthData = [
  { month: 'Oct', revenue: 48, orders: 320, sessions: 11 },
  { month: 'Nov', revenue: 72, orders: 480, sessions: 18 },
  { month: 'Dec', revenue: 96, orders: 640, sessions: 24 },
  { month: 'Jan', revenue: 124, orders: 820, sessions: 31 },
];

const topProducts = [
  { name: 'Premium Service Package', cat: 'Services', rev: '$48.2K', cvr: '4.2%', color: '#ef4444' },
  { name: 'Starter Plan', cat: 'Subscriptions', rev: '$38.4K', cvr: '3.8%', color: '#6366f1' },
  { name: 'Growth Bundle', cat: 'Bundles', rev: '$31.1K', cvr: '3.5%', color: '#60a5fa' },
  { name: 'Enterprise License', cat: 'Enterprise', rev: '$28.7K', cvr: '3.2%', color: '#fbbf24' },
  { name: 'Add-on Pack', cat: 'Add-ons', rev: '$24.9K', cvr: '2.9%', color: '#34d399' },
  { name: 'Consultation Session', cat: 'Services', rev: '$19.2K', cvr: '2.6%', color: '#fb923c' },
];

const recentOrders = [
  { id: '#4821', product: 'Premium Service Package', amount: '$184', status: 'Fulfilled', time: '2m ago', color: '#22c55e' },
  { id: '#4820', product: 'Starter Plan', amount: '$210', status: 'Processing', time: '14m ago', color: '#fbbf24' },
  { id: '#4819', product: 'Growth Bundle', amount: '$149', status: 'Fulfilled', time: '31m ago', color: '#22c55e' },
  { id: '#4818', product: 'Enterprise License', amount: '$467', status: 'Fulfilled', time: '1h ago', color: '#22c55e' },
  { id: '#4817', product: 'Add-on Pack', amount: '$89', status: 'Fulfilled', time: '1h ago', color: '#22c55e' },
  { id: '#4816', product: 'Consultation Session', amount: '$98', status: 'Refunded', time: '2h ago', color: '#ef4444' },
  { id: '#4815', product: 'Premium Service Package', amount: '$184', status: 'Fulfilled', time: '3h ago', color: '#22c55e' },
];

const trafficSources = [
  { source: 'Meta Ads', sessions: '22.1K', pct: 46, change: '+12%', color: '#6366f1' },
  { source: 'Organic Search', sessions: '11.1K', pct: 23, change: '+4%', color: '#22c55e' },
  { source: 'Google Ads', sessions: '8.7K', pct: 18, change: '+8%', color: '#fbbf24' },
  { source: 'Direct', sessions: '2.4K', pct: 5, change: '-2%', color: '#60a5fa' },
  { source: 'Email', sessions: '1.9K', pct: 4, change: '+21%', color: '#f472b6' },
  { source: 'Referral', sessions: '1.9K', pct: 4, change: '+6%', color: '#fb923c' },
];

const results = [
  { label: 'Monthly Revenue', before: '$61K', after: '$124K', color: '#ef4444' },
  { label: 'ROAS', before: '1.9x', after: '4.8x', color: '#6366f1' },
  { label: 'Conversion Rate', before: '1.9%', after: '3.5%', color: '#60a5fa' },
  { label: 'Top Product Rev', before: '$18K', after: '$48.2K', color: '#fbbf24' },
];

const inventoryAlerts = [
  { product: 'Starter Plan Licenses', stock: 4, threshold: 10, status: 'CRITICAL', color: '#ef4444' },
  { product: 'Premium Service Slots', stock: 11, threshold: 15, status: 'LOW', color: '#fbbf24' },
  { product: 'Consultation Slots', stock: 7, threshold: 10, status: 'LOW', color: '#fbbf24' },
  { product: 'Enterprise Seats', stock: 18, threshold: 20, status: 'WATCH', color: '#60a5fa' },
];

const ltvData = [
  { label: 'Avg Order Value', value: '$147', sub: '+$23 vs last Q', color: '#ef4444' },
  { label: 'Repeat Purchase', value: '38%', sub: '2.4x avg per year', color: '#6366f1' },
  { label: 'Customer LTV', value: '$612', sub: '12-month window', color: '#fbbf24' },
  { label: 'Churn Rate', value: '14%', sub: '-3% vs last Q', color: '#f472b6' },
];

const goals = [
  { label: 'Q1 Revenue', progress: 87, target: '$850K / $1M', color: '#ef4444' },
  { label: 'ROAS Target', progress: 96, target: '4.8x / 5.0x', color: '#6366f1' },
  { label: 'CVR Goal', progress: 70, target: '3.5% / 5%', color: '#60a5fa' },
  { label: 'Active Ads', progress: 80, target: '12 / 15', color: '#fbbf24' },
  { label: 'Email Subscribers', progress: 58, target: '2.3K / 4K', color: '#f472b6' },
  { label: 'Products $100K+', progress: 33, target: '1 / 3', color: '#fb923c' },
];

const channelPerf = [
  { label: 'Meta Ads', pct: 86, roas: 'ROAS 4.8x', color: '#6366f1' },
  { label: 'Email / SMS', pct: 58, roas: 'ROAS 3.1x', color: '#fbbf24' },
  { label: 'Organic/SEO', pct: 36, roas: 'Free', color: '#f472b6' },
];

const TABS = ['Overview', 'Products', 'Ads', 'Goals'] as const;
type Tab = typeof TABS[number];

const kpis = [
  { icon: '◈', label: 'Revenue', value: '$124K', color: accent },
  { icon: '↑', label: 'Orders', value: '820', color: '#6366f1' },
  { icon: '◎', label: 'Sessions', value: '31.2K', color: '#60a5fa' },
  { icon: '◉', label: 'Visitors', value: '24.8K', color: '#a78bfa' },
  { icon: '◐', label: 'Prod. Views', value: '18.4K', color: '#fbbf24' },
  { icon: '✦', label: 'Add-to-Cart', value: '2.1K', color: '#f472b6' },
  { icon: '⊕', label: 'Ad Spend', value: '$9.4K', color: '#fb923c' },
  { icon: '⊛', label: 'Email Subs', value: '2.3K', color: '#22c55e' },
];

const card = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 };
const lbl = { fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontWeight: 700, marginBottom: 14 };

export default function TrackerPage() {
  const [tab, setTab] = useState<Tab>('Overview');

  return (
    <div>
      {/* KPI Strip */}
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

      {/* Tabs + Content */}
      <div style={{ display: 'flex', gap: 0 }}>
        {/* Tab Nav */}
        <div style={{ width: 160, flexShrink: 0, paddingRight: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <p style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, paddingLeft: 10 }}>Navigation</p>
          {TABS.map(t => {
            const icon = t === 'Overview' ? '◈' : t === 'Products' ? '▦' : t === 'Ads' ? '◎' : '◐';
            const active = tab === t;
            return (
              <button key={t} onClick={() => setTab(t)} style={{
                background: active ? 'var(--accent-dim)' : 'none',
                border: active ? '1px solid var(--accent-glow)' : '1px solid transparent',
                borderRadius: 10, cursor: 'pointer', padding: '10px 12px', fontSize: 13,
                fontWeight: active ? 700 : 500, color: active ? 'var(--accent)' : 'var(--muted)',
                textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, width: '100%', fontFamily: 'inherit',
              }}>
                <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{icon}</span>
                {t}
                {active && <span style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* OVERVIEW */}
          {tab === 'Overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Growth Chart */}
                <div style={card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div>
                      <p style={{ ...lbl, marginBottom: 2 }}>Growth Trend</p>
                      <p style={{ fontSize: 11, color: 'var(--muted)' }}>Revenue (K) | Orders | Sessions (K)</p>
                    </div>
                    <div style={{ display: 'flex', gap: 14 }}>
                      {[{ c: accent, l: 'Revenue' }, { c: '#6366f1', l: 'Orders' }, { c: '#60a5fa', l: 'Sessions' }].map(({ c, l }) => (
                        <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted)' }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: c, display: 'inline-block' }} />{l}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={190}>
                    <AreaChart data={growthData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        {[['ag', accent], ['og', '#6366f1'], ['sg', '#60a5fa']].map(([id, c]) => (
                          <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={c} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={c} stopOpacity={0} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)' }} />
                      <Area type="monotone" dataKey="revenue" stroke={accent} strokeWidth={2} fill="url(#ag)" dot={false} />
                      <Area type="monotone" dataKey="orders" stroke="#6366f1" strokeWidth={2} fill="url(#og)" dot={false} />
                      <Area type="monotone" dataKey="sessions" stroke="#60a5fa" strokeWidth={2} fill="url(#sg)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Transformation Results */}
                <div style={card}>
                  <p style={lbl}>Transformation Results</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {results.map((r, i) => (
                      <div key={i} style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
                        <p style={{ fontSize: 11, color: 'var(--muted)', margin: '0 0 6px' }}>{r.label}</p>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                          <span style={{ fontSize: 11, color: 'var(--dim)', textDecoration: 'line-through' }}>{r.before}</span>
                          <span style={{ fontSize: 20, fontWeight: 900, color: r.color, letterSpacing: '-0.03em' }}>{r.after}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Orders */}
                <div style={card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <p style={{ ...lbl, marginBottom: 0 }}>Recent Orders</p>
                    <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', boxShadow: '0 0 6px var(--accent)' }} />LIVE
                    </span>
                  </div>
                  {recentOrders.map((o, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '48px 1fr 56px 76px 52px', gap: '0 8px', alignItems: 'center', padding: '9px 0', borderBottom: i < recentOrders.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>{o.id}</span>
                      <span style={{ fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.product}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{o.amount}</span>
                      <span style={{ fontSize: 10, color: o.color, background: `${o.color}14`, borderRadius: 6, padding: '2px 7px', fontWeight: 600, textAlign: 'center' }}>{o.status}</span>
                      <span style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'right' }}>{o.time}</span>
                    </div>
                  ))}
                </div>

                {/* Traffic Sources */}
                <div style={card}>
                  <p style={lbl}>Top Traffic Sources</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 40px 44px', gap: '0 10px', paddingBottom: 8, borderBottom: '1px solid var(--border)', marginBottom: 2 }}>
                    {['Source', 'Sessions', '%', 'Trend'].map(h => (
                      <span key={h} style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
                    ))}
                  </div>
                  {trafficSources.map((s, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 40px 44px', gap: '0 10px', alignItems: 'center', padding: '9px 0', borderBottom: i < trafficSources.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: 'var(--text)' }}>{s.source}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{s.sessions}</span>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{s.pct}%</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: s.change.startsWith('+') ? 'var(--green)' : 'var(--red)' }}>{s.change}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* LTV */}
                <div style={card}>
                  <p style={lbl}>Customer LTV</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {ltvData.map((l, i) => (
                      <div key={i} style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
                        <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 6 }}>{l.label}</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: l.color }}>{l.value}</div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{l.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Inventory Alerts */}
                <div style={card}>
                  <p style={lbl}>Inventory Alerts</p>
                  {inventoryAlerts.map((a, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < inventoryAlerts.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{a.product}</div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{a.stock} left | reorder at {a.threshold}</div>
                      </div>
                      <span style={{ fontSize: 10, color: a.color, background: `${a.color}14`, borderRadius: 6, padding: '3px 8px', fontWeight: 700, letterSpacing: '0.04em' }}>{a.status}</span>
                    </div>
                  ))}
                </div>

                {/* Channel Performance */}
                <div style={card}>
                  <p style={lbl}>Channel Performance</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {channelPerf.map((ch, i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{ch.label}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: ch.color }}>{ch.roas}</span>
                        </div>
                        <div style={{ height: 6, background: 'var(--card2)', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border)' }}>
                          <div style={{ height: '100%', width: `${ch.pct}%`, background: ch.color, borderRadius: 4 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Goals */}
                <div style={card}>
                  <p style={lbl}>Goals</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {goals.map((g, i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{g.label}</span>
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{g.target}</span>
                        </div>
                        <div style={{ height: 6, background: 'var(--card2)', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border)' }}>
                          <div style={{ height: '100%', width: `${g.progress}%`, background: g.color, borderRadius: 4 }} />
                        </div>
                        <div style={{ textAlign: 'right', fontSize: 10, fontWeight: 700, color: g.color, marginTop: 3 }}>{g.progress}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PRODUCTS */}
          {tab === 'Products' && (
            <div style={card}>
              <p style={lbl}>Top Products</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 60px', gap: '0 10px', paddingBottom: 8, borderBottom: '1px solid var(--border)', marginBottom: 2 }}>
                {['Product', 'Revenue', 'CVR'].map(h => (
                  <span key={h} style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
                ))}
              </div>
              {topProducts.map((p, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 60px', gap: '0 10px', alignItems: 'center', padding: '12px 0', borderBottom: i < topProducts.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: p.color, fontWeight: 600, marginTop: 2 }}>{p.cat}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{p.rev}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.cvr}</div>
                </div>
              ))}
            </div>
          )}

          {/* ADS */}
          {tab === 'Ads' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Ad Spend', value: '$9,400', color: '#fb923c' },
                  { label: 'ROAS', value: '4.8x', color: '#6366f1' },
                  { label: 'Active Ads', value: '12', color: 'var(--accent)' },
                ].map((m, i) => (
                  <div key={i} style={{ ...card, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 6 }}>{m.label}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: m.color }}>{m.value}</div>
                  </div>
                ))}
              </div>
              <div style={card}>
                <p style={lbl}>Channel Breakdown</p>
                {channelPerf.map((ch, i) => (
                  <div key={i} style={{ marginBottom: i < channelPerf.length - 1 ? 14 : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{ch.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: ch.color }}>{ch.roas}</span>
                    </div>
                    <div style={{ height: 8, background: 'var(--card2)', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border)' }}>
                      <div style={{ height: '100%', width: `${ch.pct}%`, background: ch.color, borderRadius: 4 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GOALS */}
          {tab === 'Goals' && (
            <div style={card}>
              <p style={lbl}>Goal Progress</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {goals.map((g, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{g.label}</span>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{g.target}</span>
                    </div>
                    <div style={{ height: 10, background: 'var(--card2)', borderRadius: 5, overflow: 'hidden', border: '1px solid var(--border)' }}>
                      <div style={{ height: '100%', width: `${g.progress}%`, background: g.color, borderRadius: 5, transition: 'width 0.8s ease' }} />
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 11, fontWeight: 700, color: g.color, marginTop: 4 }}>{g.progress}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
