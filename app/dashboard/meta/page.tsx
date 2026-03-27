'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Campaign } from '@/lib/types';

const DATE_PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7d', value: 'last_7d' },
  { label: 'Last 14d', value: 'last_14d' },
  { label: 'Last 30d', value: 'last_30d' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'Last 90d', value: 'last_90d' },
];

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// --- Column definitions with performance thresholds ---
interface ColumnDef {
  key: string;
  label: string;
  format: (c: Campaign) => string;
  getValue: (c: Campaign) => number;
  rating?: (val: number) => 'good' | 'mid' | 'bad' | null;
  defaultVisible: boolean;
  width: string;
}

const COLUMNS: ColumnDef[] = [
  {
    key: 'spend', label: 'Spend', width: '1fr', defaultVisible: true,
    format: c => `$${Number(c.spend).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    getValue: c => Number(c.spend),
  },
  {
    key: 'revenue', label: 'Revenue', width: '1fr', defaultVisible: true,
    format: c => `$${Number(c.revenue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    getValue: c => Number(c.revenue),
  },
  {
    key: 'roas', label: 'ROAS', width: '80px', defaultVisible: true,
    format: c => `${Number(c.roas).toFixed(2)}x`,
    getValue: c => Number(c.roas),
    rating: v => v >= 2 ? 'good' : v >= 1 ? 'mid' : v > 0 ? 'bad' : null,
  },
  {
    key: 'ctr', label: 'CTR', width: '80px', defaultVisible: true,
    format: c => `${Number(c.ctr).toFixed(2)}%`,
    getValue: c => Number(c.ctr),
    rating: v => v >= 2 ? 'good' : v >= 1 ? 'mid' : v > 0 ? 'bad' : null,
  },
  {
    key: 'impressions', label: 'Impressions', width: '1fr', defaultVisible: true,
    format: c => Number(c.impressions).toLocaleString(),
    getValue: c => Number(c.impressions),
  },
  {
    key: 'clicks', label: 'Clicks', width: '90px', defaultVisible: false,
    format: c => Number(c.clicks).toLocaleString(),
    getValue: c => Number(c.clicks),
  },
  {
    key: 'cpm', label: 'CPM', width: '80px', defaultVisible: false,
    format: c => `$${Number(c.cpm).toFixed(2)}`,
    getValue: c => Number(c.cpm),
    rating: v => v > 0 && v <= 15 ? 'good' : v <= 30 ? 'mid' : v > 30 ? 'bad' : null,
  },
  {
    key: 'cpc', label: 'CPC', width: '80px', defaultVisible: false,
    format: c => {
      const clicks = Number(c.clicks);
      const cpc = clicks > 0 ? Number(c.spend) / clicks : (c.platform_data as any)?.cpc || 0;
      return `$${Number(cpc).toFixed(2)}`;
    },
    getValue: c => {
      const clicks = Number(c.clicks);
      return clicks > 0 ? Number(c.spend) / clicks : Number((c.platform_data as any)?.cpc || 0);
    },
    rating: v => v > 0 && v <= 2 ? 'good' : v <= 5 ? 'mid' : v > 5 ? 'bad' : null,
  },
  {
    key: 'leads', label: 'Leads', width: '80px', defaultVisible: false,
    format: c => c.leads.toString(),
    getValue: c => c.leads,
  },
  {
    key: 'cpl', label: 'CPL', width: '80px', defaultVisible: false,
    format: c => `$${Number(c.cpl).toFixed(2)}`,
    getValue: c => Number(c.cpl),
    rating: v => v > 0 && v <= 20 ? 'good' : v <= 50 ? 'mid' : v > 50 ? 'bad' : null,
  },
  {
    key: 'purchases', label: 'Purchases', width: '90px', defaultVisible: false,
    format: c => ((c.platform_data as any)?.purchases || 0).toString(),
    getValue: c => Number((c.platform_data as any)?.purchases || 0),
  },
  {
    key: 'reach', label: 'Reach', width: '1fr', defaultVisible: false,
    format: c => Number((c.platform_data as any)?.reach || 0).toLocaleString(),
    getValue: c => Number((c.platform_data as any)?.reach || 0),
  },
  {
    key: 'frequency', label: 'Frequency', width: '90px', defaultVisible: false,
    format: c => Number((c.platform_data as any)?.frequency || 0).toFixed(2),
    getValue: c => Number((c.platform_data as any)?.frequency || 0),
    rating: v => v > 0 && v <= 3 ? 'good' : v <= 5 ? 'mid' : v > 5 ? 'bad' : null,
  },
  {
    key: 'hook_rate', label: 'Hook Rate', width: '90px', defaultVisible: false,
    format: c => c.hook_rate != null ? `${c.hook_rate.toFixed(1)}%` : '--',
    getValue: c => c.hook_rate || 0,
    rating: v => v >= 30 ? 'good' : v >= 15 ? 'mid' : v > 0 ? 'bad' : null,
  },
  {
    key: 'objective', label: 'Objective', width: '1fr', defaultVisible: false,
    format: c => {
      const obj = (c.platform_data as any)?.objective || '--';
      return obj.replace('OUTCOME_', '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase());
    },
    getValue: () => 0,
  },
  {
    key: 'daily_budget', label: 'Daily Budget', width: '100px', defaultVisible: false,
    format: c => {
      const b = (c.platform_data as any)?.daily_budget;
      return b ? `$${(Number(b) / 100).toFixed(0)}/d` : '--';
    },
    getValue: c => Number((c.platform_data as any)?.daily_budget || 0) / 100,
  },
];

const STORAGE_KEY = 'apex_meta_columns';

function getInitialColumns(): string[] {
  if (typeof window === 'undefined') return COLUMNS.filter(c => c.defaultVisible).map(c => c.key);
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return COLUMNS.filter(c => c.defaultVisible).map(c => c.key);
}

function ratingStyle(rating: 'good' | 'mid' | 'bad' | null): React.CSSProperties {
  if (!rating) return {};
  const map = {
    good: { color: 'var(--green)', background: 'var(--green-dim)', fontWeight: 600 as const },
    mid: { color: 'var(--yellow)', background: 'var(--yellow-dim)', fontWeight: 600 as const },
    bad: { color: 'var(--red)', background: 'var(--red-dim)', fontWeight: 600 as const },
  };
  return { ...map[rating], padding: '2px 8px', borderRadius: 6, display: 'inline-block' };
}

export default function MetaPage() {
  const supabase = createClient();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState('last_30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [pickingStart, setPickingStart] = useState(true);
  const calRef = useRef<HTMLDivElement>(null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(getInitialColumns);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('campaigns').select('*').eq('platform', 'meta').order('spend', { ascending: false });
      setCampaigns(data || []);
      setLoading(false);
      const { data: conn } = await supabase.from('ad_connections').select('last_synced_at').eq('platform', 'meta').eq('status', 'active').limit(1).single();
      if (conn?.last_synced_at) setLastSync(conn.last_synced_at);
    }
    load();
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowColumnPicker(false);
      if (calRef.current && !calRef.current.contains(e.target as Node)) setShowCalendar(false);
    }
    if (showColumnPicker || showCalendar) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showColumnPicker, showCalendar]);

  function toggleColumn(key: string) {
    setVisibleColumns(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function syncAds(preset?: string, since?: string, until?: string) {
    setSyncing(true);
    setSyncMsg('');
    try {
      const params = since && until
        ? `since=${since}&until=${until}`
        : `date_preset=${preset || datePreset}`;
      const res = await fetch(`/api/ads/meta?${params}`);
      const data = await res.json();
      if (data.error) {
        setSyncMsg(data.error);
      } else {
        const metaCampaigns = (data.campaigns || []).filter((c: Campaign) => c.platform === 'meta');
        setCampaigns(metaCampaigns);
        setLastSync(data.synced_at);
        setSyncMsg(`Synced ${metaCampaigns.length} Meta campaigns`);
      }
    } catch (e: any) {
      setSyncMsg('Sync failed: ' + e.message);
    }
    setSyncing(false);
    setTimeout(() => setSyncMsg(''), 5000);
  }

  async function toggleCampaign(id: string, currentStatus: string) {
    const action = currentStatus === 'active' ? 'pause' : 'unpause';
    const res = await fetch('/api/ads/meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign_id: id, action }),
    });
    const data = await res.json();
    if (data.success) {
      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: data.status } : c));
    } else {
      alert('Toggle failed: ' + (data.error || 'Unknown error'));
    }
  }

  const activeColumns = COLUMNS.filter(col => visibleColumns.includes(col.key));
  const gridTemplate = `44px 2fr ${activeColumns.map(c => c.width).join(' ')} 80px`;

  const totalSpend = campaigns.reduce((s, c) => s + Number(c.spend), 0);
  const totalRevenue = campaigns.reduce((s, c) => s + Number(c.revenue), 0);
  const roas = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : '0';
  const totalLeads = campaigns.reduce((s, c) => s + c.leads, 0);

  const kpis = [
    { label: 'Meta Spend', value: `$${totalSpend.toLocaleString()}` },
    { label: 'Revenue', value: `$${totalRevenue.toLocaleString()}` },
    { label: 'ROAS', value: `${roas}x` },
    { label: 'Leads', value: `${totalLeads}` },
  ];

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => syncAds()} disabled={syncing} style={{ padding: '8px 18px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: syncing ? 0.6 : 1 }}>
            {syncing ? 'Syncing...' : 'Sync Meta Ads'}
          </button>
          {lastSync && <span style={{ fontSize: 11, color: 'var(--muted)' }}>Last sync: {new Date(lastSync).toLocaleString()}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {syncMsg && <span style={{ fontSize: 12, color: syncMsg.includes('Synced') ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{syncMsg}</span>}

          {/* Column Picker */}
          <div ref={pickerRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowColumnPicker(!showColumnPicker)}
              style={{
                padding: '7px 14px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--muted)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              Columns ({activeColumns.length})
            </button>
            {showColumnPicker && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 6, width: 240, zIndex: 50,
                background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
                boxShadow: 'var(--shadow-lg)', padding: '8px 0', maxHeight: 400, overflowY: 'auto',
              }}>
                <div style={{ padding: '8px 14px 6px', fontSize: 11, fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Toggle Columns</div>
                {COLUMNS.map(col => (
                  <button
                    key={col.key}
                    onClick={() => toggleColumn(col.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 14px',
                      background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: 13, color: visibleColumns.includes(col.key) ? 'var(--text)' : 'var(--muted)',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                      border: visibleColumns.includes(col.key) ? '2px solid var(--accent)' : '2px solid var(--border2)',
                      background: visibleColumns.includes(col.key) ? 'var(--accent)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}>
                      {visibleColumns.includes(col.key) && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      )}
                    </div>
                    {col.label}
                    {col.rating && <span style={{ fontSize: 10, color: 'var(--dim)', marginLeft: 'auto' }}>scored</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Date Picker Row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        {DATE_PRESETS.map(d => (
          <button key={d.value} onClick={() => { setDatePreset(d.value); setCustomStart(''); setCustomEnd(''); syncAds(d.value); }} style={{
            padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: datePreset === d.value && !customStart ? 700 : 500,
            cursor: 'pointer', fontFamily: 'inherit', border: 'none', whiteSpace: 'nowrap',
            background: datePreset === d.value && !customStart ? 'var(--accent-dim)' : 'var(--card)',
            color: datePreset === d.value && !customStart ? 'var(--accent)' : 'var(--muted)',
          }}>{d.label}</button>
        ))}

        {/* Custom Date Picker */}
        <div ref={calRef} style={{ position: 'relative', marginLeft: 4 }}>
          <button
            onClick={() => { setShowCalendar(!showCalendar); setPickingStart(true); }}
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: customStart ? 700 : 500,
              cursor: 'pointer', fontFamily: 'inherit', border: 'none', whiteSpace: 'nowrap',
              background: customStart ? 'var(--accent-dim)' : 'var(--card)',
              color: customStart ? 'var(--accent)' : 'var(--muted)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            {customStart && customEnd ? `${customStart} — ${customEnd}` : 'Custom'}
          </button>

          {showCalendar && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 6, zIndex: 50,
              background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
              boxShadow: 'var(--shadow-lg)', padding: 16, width: 280,
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 10 }}>
                {pickingStart ? 'Select start date' : 'Select end date'}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else setCalMonth(calMonth - 1); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 16, fontFamily: 'inherit', padding: '4px 8px' }}>&#8249;</button>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{MONTH_NAMES[calMonth]} {calYear}</span>
                <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else setCalMonth(calMonth + 1); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 16, fontFamily: 'inherit', padding: '4px 8px' }}>&#8250;</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                  <div key={d} style={{ fontSize: 10, fontWeight: 600, color: 'var(--dim)', textAlign: 'center', padding: 4 }}>{d}</div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                {Array.from({ length: getFirstDayOfMonth(calYear, calMonth) }).map((_, i) => (
                  <div key={`e${i}`} />
                ))}
                {Array.from({ length: getDaysInMonth(calYear, calMonth) }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = formatDate(new Date(calYear, calMonth, day));
                  const isStart = dateStr === customStart;
                  const isEnd = dateStr === customEnd;
                  const inRange = customStart && customEnd && dateStr >= customStart && dateStr <= customEnd;
                  const isToday = dateStr === formatDate(new Date());
                  return (
                    <button
                      key={day}
                      onClick={() => {
                        if (pickingStart) {
                          setCustomStart(dateStr);
                          setCustomEnd('');
                          setDatePreset('');
                          setPickingStart(false);
                        } else {
                          const endDate = dateStr < customStart ? customStart : dateStr;
                          const startDate = dateStr < customStart ? dateStr : customStart;
                          setCustomStart(startDate);
                          setCustomEnd(endDate);
                          setDatePreset('');
                          setShowCalendar(false);
                          syncAds(undefined, startDate, endDate);
                        }
                      }}
                      style={{
                        width: '100%', aspectRatio: '1', border: 'none', borderRadius: 8, cursor: 'pointer',
                        fontFamily: 'inherit', fontSize: 12, fontWeight: isStart || isEnd ? 700 : 500,
                        background: isStart || isEnd ? 'var(--accent)' : inRange ? 'var(--accent-dim)' : 'transparent',
                        color: isStart || isEnd ? '#fff' : inRange ? 'var(--accent)' : isToday ? 'var(--accent)' : 'var(--text)',
                        transition: 'all 0.1s',
                      }}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              {customStart && (
                <button onClick={() => { setCustomStart(''); setCustomEnd(''); setDatePreset('last_30d'); setShowCalendar(false); syncAds('last_30d'); }}
                  style={{ marginTop: 10, width: '100%', padding: '8px 0', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Clear custom dates
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, boxShadow: 'var(--shadow)', transition: 'all 0.2s' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -1, color: 'var(--text)', lineHeight: 1 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Performance Legend */}
      {campaigns.length > 0 && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 12, paddingLeft: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} />
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Good</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--yellow)' }} />
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Mid</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)' }} />
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Bad</span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && campaigns.length === 0 && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>&#9673;</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>No Meta campaigns</h3>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Connect your Meta ad account in Settings to start syncing campaigns.</p>
          <a href="/dashboard/settings" style={{ display: 'inline-block', padding: '10px 20px', background: 'var(--accent)', color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Connect Meta</a>
        </div>
      )}

      {/* Campaign Table */}
      {campaigns.length > 0 && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: gridTemplate, padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--card2)', overflowX: 'auto' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 0.6 }}></div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Campaign</div>
            {activeColumns.map(col => (
              <div key={col.key} style={{ fontSize: 10, fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 0.6 }}>{col.label}</div>
            ))}
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: 0.6 }}>Status</div>
          </div>

          {/* Rows */}
          {campaigns.map(c => (
            <div key={c.id} style={{ display: 'grid', gridTemplateColumns: gridTemplate, padding: '12px 16px', alignItems: 'center', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s', overflowX: 'auto' }}>
              {/* Toggle */}
              <div
                onClick={() => toggleCampaign(c.id, c.status)}
                style={{
                  width: 38, height: 22, borderRadius: 11, cursor: 'pointer', position: 'relative', transition: 'all 0.2s',
                  background: c.status === 'active' ? 'var(--green-dim)' : 'var(--red-dim)',
                  border: c.status === 'active' ? '1px solid rgba(22,163,74,0.3)' : '1px solid rgba(220,38,38,0.2)',
                }}
              >
                <div style={{
                  position: 'absolute', top: 3, width: 14, height: 14, borderRadius: '50%', transition: 'all 0.2s',
                  background: c.status === 'active' ? 'var(--green)' : 'var(--red)',
                  ...(c.status === 'active' ? { right: 3 } : { left: 3 }),
                }} />
              </div>

              {/* Campaign Name */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{c.name}</div>
              </div>

              {/* Dynamic Columns */}
              {activeColumns.map(col => {
                const val = col.getValue(c);
                const rating = col.rating ? col.rating(val) : null;
                return (
                  <div key={col.key} style={{ fontSize: 13 }}>
                    <span style={ratingStyle(rating)}>{col.format(c)}</span>
                  </div>
                );
              })}

              {/* Status Badge */}
              <div>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                  color: c.status === 'active' ? 'var(--green)' : c.status === 'killed' ? 'var(--red)' : 'var(--muted)',
                  background: c.status === 'active' ? 'var(--green-dim)' : c.status === 'killed' ? 'var(--red-dim)' : 'var(--card2)',
                  textTransform: 'capitalize',
                }}>{c.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Loading Meta campaigns...</div>}
    </div>
  );
}
