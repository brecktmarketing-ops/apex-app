'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
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

// Generic row data for ad sets and ads (same metric shape as Campaign)
interface DrillRow {
  id: string;
  name: string;
  status: string;
  spend: number;
  revenue: number;
  leads: number;
  roas: number;
  cpl: number;
  ctr: number;
  impressions: number;
  clicks: number;
  cpm: number;
  hook_rate: number | null;
  platform_data: Record<string, unknown>;
  // extra drill-down fields
  meta_label?: string; // targeting summary, creative type, etc
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

// Helper to parse insights into a DrillRow-compatible metric shape
function insightToMetrics(row: any) {
  const purchases = row.actions?.find((a: any) => a.action_type === 'purchase')?.value || '0';
  const leads = row.actions?.find((a: any) => a.action_type === 'lead')?.value || '0';
  const roas = row.purchase_roas?.find((a: any) => a.action_type === 'omni_purchase')?.value || '0';
  const cpl = row.cost_per_action_type?.find((a: any) => a.action_type === 'lead')?.value || '0';
  const spendVal = parseFloat(row.spend || '0');
  const clicksVal = parseInt(row.clicks || '0');

  return {
    spend: spendVal,
    impressions: parseInt(row.impressions || '0'),
    clicks: clicksVal,
    ctr: parseFloat(row.ctr || '0'),
    cpm: parseFloat(row.cpm || '0'),
    cpc: clicksVal > 0 ? spendVal / clicksVal : 0,
    reach: parseInt(row.reach || '0'),
    frequency: parseFloat(row.frequency || '0'),
    cpp: parseFloat(row.cpp || '0'),
    cost_per_unique_click: parseFloat(row.cost_per_unique_click || '0'),
    purchases: parseInt(purchases),
    leads: parseInt(leads),
    roas: parseFloat(roas),
    cpl: parseFloat(cpl),
    revenue: spendVal * parseFloat(roas),
  };
}

// Build a fake Campaign-shaped object so COLUMNS format/getValue/rating work
function makeCampaignLike(id: string, name: string, status: string, metrics: ReturnType<typeof insightToMetrics>, extra: Record<string, unknown> = {}): Campaign & { meta_label?: string } {
  return {
    id,
    user_id: '',
    connection_id: '',
    platform: 'meta',
    platform_campaign_id: id,
    name,
    status: status === 'ACTIVE' ? 'active' : status === 'PAUSED' ? 'paused' : 'killed',
    spend: metrics.spend,
    revenue: metrics.revenue,
    leads: metrics.leads,
    roas: metrics.roas,
    cpl: metrics.cpl,
    ctr: metrics.ctr,
    impressions: metrics.impressions,
    clicks: metrics.clicks,
    cpm: metrics.cpm,
    hook_rate: null,
    platform_data: {
      purchases: metrics.purchases,
      reach: metrics.reach,
      frequency: metrics.frequency,
      cpc: metrics.cpc,
      cpp: metrics.cpp,
      cost_per_unique_click: metrics.cost_per_unique_click,
      ...extra,
    },
    date_range_start: null,
    date_range_end: null,
    synced_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    meta_label: extra.meta_label as string | undefined,
  } as Campaign & { meta_label?: string };
}

// Chevron SVG component
function Chevron({ expanded, size = 14 }: { expanded: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transition: 'transform 0.2s ease',
        transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
        flexShrink: 0,
      }}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
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

  // Drill-down state
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [expandedAdSets, setExpandedAdSets] = useState<Set<string>>(new Set());
  const [adSetsByCampaign, setAdSetsByCampaign] = useState<Record<string, (Campaign & { meta_label?: string })[]>>({});
  const [adsByAdSet, setAdsByAdSet] = useState<Record<string, (Campaign & { meta_label?: string })[]>>({});
  const [loadingAdSets, setLoadingAdSets] = useState<Set<string>>(new Set());
  const [loadingAds, setLoadingAds] = useState<Set<string>>(new Set());

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
        // Clear drill-down cache on new sync
        setAdSetsByCampaign({});
        setAdsByAdSet({});
        setExpandedCampaigns(new Set());
        setExpandedAdSets(new Set());
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

  // Fetch ad sets for a campaign
  const fetchAdSets = useCallback(async (campaignPlatformId: string) => {
    if (adSetsByCampaign[campaignPlatformId]) return; // already cached
    setLoadingAdSets(prev => new Set(prev).add(campaignPlatformId));
    try {
      const dp = customStart && customEnd ? '' : (datePreset || 'last_30d');
      const dateParams = customStart && customEnd
        ? `&since=${customStart}&until=${customEnd}`
        : `&date_preset=${dp}`;
      const res = await fetch(`/api/ads/meta/drilldown?level=adsets&parent_id=${campaignPlatformId}${dateParams}`);
      const data = await res.json();
      if (data.error) {
        console.error('Failed to fetch ad sets:', data.error);
      } else {
        const rows = (data.items || []).map((item: any) => {
          const metrics = item.insights ? insightToMetrics(item.insights) : insightToMetrics({});
          const targeting = item.targeting;
          let targetingSummary = '';
          if (targeting) {
            const parts: string[] = [];
            if (targeting.age_min || targeting.age_max) parts.push(`${targeting.age_min || '?'}-${targeting.age_max || '?'}`);
            if (targeting.genders?.length) parts.push(targeting.genders.map((g: number) => g === 1 ? 'M' : g === 2 ? 'F' : 'All').join('/'));
            if (targeting.geo_locations?.countries?.length) parts.push(targeting.geo_locations.countries.join(', '));
            if (targeting.flexible_spec?.length) {
              const interests = targeting.flexible_spec.flatMap((s: any) => s.interests?.map((i: any) => i.name) || []);
              if (interests.length) parts.push(interests.slice(0, 3).join(', ') + (interests.length > 3 ? '...' : ''));
            }
            targetingSummary = parts.join(' | ') || 'Broad';
          }
          const optGoal = (item.optimization_goal || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase());
          return makeCampaignLike(item.id, item.name, item.status, metrics, {
            daily_budget: item.daily_budget,
            lifetime_budget: item.lifetime_budget,
            optimization_goal: optGoal,
            targeting_summary: targetingSummary,
            meta_label: [targetingSummary, optGoal].filter(Boolean).join(' -- '),
          });
        });
        setAdSetsByCampaign(prev => ({ ...prev, [campaignPlatformId]: rows }));
      }
    } catch (err) {
      console.error('Error fetching ad sets:', err);
    }
    setLoadingAdSets(prev => { const n = new Set(prev); n.delete(campaignPlatformId); return n; });
  }, [adSetsByCampaign, datePreset, customStart, customEnd]);

  // Fetch ads for an ad set
  const fetchAds = useCallback(async (adsetId: string) => {
    if (adsByAdSet[adsetId]) return;
    setLoadingAds(prev => new Set(prev).add(adsetId));
    try {
      const dp = customStart && customEnd ? '' : (datePreset || 'last_30d');
      const dateParams = customStart && customEnd
        ? `&since=${customStart}&until=${customEnd}`
        : `&date_preset=${dp}`;
      const res = await fetch(`/api/ads/meta/drilldown?level=ads&parent_id=${adsetId}${dateParams}`);
      const data = await res.json();
      if (data.error) {
        console.error('Failed to fetch ads:', data.error);
      } else {
        const rows = (data.items || []).map((item: any) => {
          const metrics = item.insights ? insightToMetrics(item.insights) : insightToMetrics({});
          const creative = item.creative;
          let creativeLabel = '';
          if (creative) {
            const parts: string[] = [];
            if (creative.name) parts.push(creative.name);
            if (creative.object_type) parts.push(creative.object_type.replace(/_/g, ' '));
            if (creative.title) parts.push(`"${creative.title}"`);
            creativeLabel = parts.join(' -- ') || 'Unknown Creative';
          }
          return makeCampaignLike(item.id, item.name, item.status, metrics, {
            creative_name: creative?.name || '',
            creative_type: creative?.object_type || '',
            meta_label: creativeLabel,
          });
        });
        setAdsByAdSet(prev => ({ ...prev, [adsetId]: rows }));
      }
    } catch (err) {
      console.error('Error fetching ads:', err);
    }
    setLoadingAds(prev => { const n = new Set(prev); n.delete(adsetId); return n; });
  }, [adsByAdSet, datePreset, customStart, customEnd]);

  function toggleExpandCampaign(platformCampaignId: string) {
    setExpandedCampaigns(prev => {
      const n = new Set(prev);
      if (n.has(platformCampaignId)) {
        n.delete(platformCampaignId);
      } else {
        n.add(platformCampaignId);
        fetchAdSets(platformCampaignId);
      }
      return n;
    });
  }

  function toggleExpandAdSet(adsetId: string) {
    setExpandedAdSets(prev => {
      const n = new Set(prev);
      if (n.has(adsetId)) {
        n.delete(adsetId);
      } else {
        n.add(adsetId);
        fetchAds(adsetId);
      }
      return n;
    });
  }

  function expandAll() {
    const campaignIds = campaigns.map(c => c.platform_campaign_id);
    setExpandedCampaigns(new Set(campaignIds));
    campaignIds.forEach(id => fetchAdSets(id));
  }

  function collapseAll() {
    setExpandedCampaigns(new Set());
    setExpandedAdSets(new Set());
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

  // Row renderer for any level
  function renderMetricRow(
    item: Campaign & { meta_label?: string },
    level: 'campaign' | 'adset' | 'ad',
    isExpanded: boolean,
    onToggleExpand?: () => void,
    onToggleStatus?: () => void,
  ) {
    const indent = level === 'campaign' ? 0 : level === 'adset' ? 28 : 56;
    const bgMap = {
      campaign: 'transparent',
      adset: 'rgba(var(--accent-rgb, 16,185,129), 0.02)',
      ad: 'rgba(var(--accent-rgb, 16,185,129), 0.04)',
    };
    const canExpand = level !== 'ad';

    return (
      <div
        key={item.id}
        style={{
          display: 'grid',
          gridTemplateColumns: gridTemplate,
          padding: `10px 16px 10px ${16 + indent}px`,
          alignItems: 'center',
          borderBottom: '1px solid var(--border)',
          cursor: canExpand ? 'pointer' : 'default',
          transition: 'background 0.15s',
          background: bgMap[level],
          overflowX: 'auto',
        }}
        onClick={canExpand ? onToggleExpand : undefined}
        onMouseEnter={e => { if (canExpand) (e.currentTarget as HTMLDivElement).style.background = 'var(--card2)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = bgMap[level]; }}
      >
        {/* Toggle (campaign only) / Chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {level === 'campaign' && onToggleStatus ? (
            <div
              onClick={e => { e.stopPropagation(); onToggleStatus(); }}
              style={{
                width: 38, height: 22, borderRadius: 11, cursor: 'pointer', position: 'relative', transition: 'all 0.2s',
                background: item.status === 'active' ? 'var(--green-dim)' : 'var(--red-dim)',
                border: item.status === 'active' ? '1px solid rgba(22,163,74,0.3)' : '1px solid rgba(220,38,38,0.2)',
              }}
            >
              <div style={{
                position: 'absolute', top: 3, width: 14, height: 14, borderRadius: '50%', transition: 'all 0.2s',
                background: item.status === 'active' ? 'var(--green)' : 'var(--red)',
                ...(item.status === 'active' ? { right: 3 } : { left: 3 }),
              }} />
            </div>
          ) : canExpand ? (
            <span style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
              <Chevron expanded={isExpanded} size={12} />
            </span>
          ) : (
            <span style={{ width: 12 }} />
          )}
        </div>

        {/* Name + label */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {level === 'campaign' && (
              <span style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
                <Chevron expanded={isExpanded} />
              </span>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: level === 'campaign' ? 600 : 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.name}
              </div>
              {item.meta_label && (
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.meta_label}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Columns */}
        {activeColumns.map(col => {
          const val = col.getValue(item);
          const rating = col.rating ? col.rating(val) : null;
          return (
            <div key={col.key} style={{ fontSize: 13 }} onClick={e => e.stopPropagation()}>
              <span style={ratingStyle(rating)}>{col.format(item)}</span>
            </div>
          );
        })}

        {/* Status Badge */}
        <div onClick={e => e.stopPropagation()}>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
            color: item.status === 'active' ? 'var(--green)' : item.status === 'killed' ? 'var(--red)' : 'var(--muted)',
            background: item.status === 'active' ? 'var(--green-dim)' : item.status === 'killed' ? 'var(--red-dim)' : 'var(--card2)',
            textTransform: 'capitalize',
          }}>{item.status}</span>
        </div>
      </div>
    );
  }

  // Loading row spinner
  function renderLoadingRow(indent: number) {
    return (
      <div style={{ padding: `10px 16px 10px ${16 + indent}px`, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 14, height: 14, border: '2px solid var(--border2)', borderTopColor: 'var(--accent)',
          borderRadius: '50%', animation: 'spin 0.6s linear infinite',
        }} />
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>Loading...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Spin animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

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

          {/* Expand/Collapse All */}
          {campaigns.length > 0 && (
            <>
              <button
                onClick={expandAll}
                style={{
                  padding: '7px 12px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--muted)',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="7 13 12 18 17 13"/><polyline points="7 6 12 11 17 6"/></svg>
                Expand All
              </button>
              <button
                onClick={collapseAll}
                style={{
                  padding: '7px 12px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--muted)',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 11 12 6 7 11"/><polyline points="17 18 12 13 7 18"/></svg>
                Collapse All
              </button>
            </>
          )}

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

      {/* Campaign Table with Drill-Down */}
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

          {/* Rows - Campaign > Ad Set > Ad */}
          {campaigns.map(c => {
            const campExpanded = expandedCampaigns.has(c.platform_campaign_id);
            const adSets = adSetsByCampaign[c.platform_campaign_id] || [];
            const isLoadingAdSets = loadingAdSets.has(c.platform_campaign_id);

            return (
              <div key={c.id}>
                {/* Campaign Row */}
                {renderMetricRow(
                  { ...c, meta_label: undefined } as Campaign & { meta_label?: string },
                  'campaign',
                  campExpanded,
                  () => toggleExpandCampaign(c.platform_campaign_id),
                  () => toggleCampaign(c.id, c.status),
                )}

                {/* Ad Sets */}
                {campExpanded && (
                  <div style={{ overflow: 'hidden' }}>
                    {isLoadingAdSets && adSets.length === 0 && renderLoadingRow(28)}
                    {adSets.map(adset => {
                      const adsetExpanded = expandedAdSets.has(adset.id);
                      const ads = adsByAdSet[adset.id] || [];
                      const isLoadingTheseAds = loadingAds.has(adset.id);

                      return (
                        <div key={adset.id}>
                          {/* Ad Set Row */}
                          {renderMetricRow(
                            adset,
                            'adset',
                            adsetExpanded,
                            () => toggleExpandAdSet(adset.id),
                          )}

                          {/* Ads */}
                          {adsetExpanded && (
                            <div style={{ overflow: 'hidden' }}>
                              {isLoadingTheseAds && ads.length === 0 && renderLoadingRow(56)}
                              {ads.map(ad => (
                                <div key={ad.id}>
                                  {renderMetricRow(ad, 'ad', false)}
                                </div>
                              ))}
                              {!isLoadingTheseAds && ads.length === 0 && (
                                <div style={{ padding: '8px 16px 8px 72px', fontSize: 12, color: 'var(--dim)', borderBottom: '1px solid var(--border)' }}>
                                  No ads found in this ad set
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {!isLoadingAdSets && adSets.length === 0 && (
                      <div style={{ padding: '8px 16px 8px 44px', fontSize: 12, color: 'var(--dim)', borderBottom: '1px solid var(--border)' }}>
                        No ad sets found in this campaign
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Loading Meta campaigns...</div>}
    </div>
  );
}
