'use client';

import { useState, useEffect } from 'react';

interface AutopilotAction {
  action: 'kill' | 'scale' | 'hold' | 'alert';
  campaign: string;
  reason: string;
  details: string;
}

interface AutopilotResult {
  campaigns_checked: number;
  actions: AutopilotAction[];
  executed: string[];
  summary: string;
  auto_execute: boolean;
}

const actionColors = {
  kill: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', text: '#f87171', icon: '!!' },
  scale: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', text: '#34d399', icon: '+' },
  hold: { bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.2)', text: '#9ca3af', icon: '~' },
  alert: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', text: '#fbbf24', icon: '!' },
};

interface CampaignOption {
  id: string;
  name: string;
}

export default function AutopilotDashboard() {
  const [result, setResult] = useState<AutopilotResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [pendingActions, setPendingActions] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');

  useEffect(() => {
    loadPending();
    loadCampaigns();
  }, []);

  async function loadPending() {
    try {
      const res = await fetch('/api/autopilot');
      if (res.ok) {
        const data = await res.json();
        setPendingActions(data.pending_actions || []);
      }
    } catch {
      setPendingActions([]);
    }
  }

  async function loadCampaigns() {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { data } = await supabase
        .from('campaigns')
        .select('id, name')
        .in('status', ['active', 'paused'])
        .order('name');
      setCampaigns(data || []);
    } catch {
      setCampaigns([]);
    }
  }

  async function runScan() {
    setLoading(true);
    try {
      const res = await fetch('/api/autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_execute: autoMode, campaign_id: selectedCampaign !== 'all' ? selectedCampaign : undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        setLastScan(new Date().toLocaleTimeString());
        loadPending();
      } else {
        const err = await res.json().catch(() => ({ error: 'Scan failed' }));
        setResult({ campaigns_checked: 0, actions: [], executed: [], summary: err.error || 'Scan failed', auto_execute: false });
      }
    } catch {
      setResult({ campaigns_checked: 0, actions: [], executed: [], summary: 'Connection error. Try again.', auto_execute: false });
    }
    setLoading(false);
  }

  const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px' };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Autopilot</h2>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            {lastScan ? `Last scan: ${lastScan}` : 'Wanda monitors your campaigns and takes action automatically'}
          </p>
        </div>
        <button
          onClick={runScan}
          disabled={loading}
          style={{
            padding: '12px 24px', borderRadius: 12, border: 'none',
            background: 'var(--accent)', color: '#fff', fontSize: 14,
            fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
            fontFamily: 'inherit', opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Scanning...' : 'Run Scan'}
        </button>
      </div>

      {/* Campaign Selector */}
      {campaigns.length > 0 && (
        <div style={{ ...card, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Campaign</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              Select which campaign to scan, or run against all
            </div>
          </div>
          <select
            value={selectedCampaign}
            onChange={e => setSelectedCampaign(e.target.value)}
            style={{
              padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 10, fontSize: 13, color: 'var(--text)', outline: 'none',
              fontFamily: 'inherit', cursor: 'pointer', minWidth: 220,
            }}
          >
            <option value="all">All Campaigns ({campaigns.length})</option>
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Auto-execute toggle */}
      <div style={{
        ...card, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Auto-Execute</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            {autoMode
              ? 'Wanda will automatically kill and scale campaigns based on rules'
              : 'Wanda will recommend actions but wait for your approval'}
          </div>
        </div>
        <div
          onClick={() => setAutoMode(!autoMode)}
          style={{
            width: 48, height: 26, borderRadius: 13, position: 'relative', cursor: 'pointer',
            background: autoMode ? 'var(--accent)' : 'var(--border)', transition: 'background 0.2s',
          }}
        >
          <div style={{
            width: 20, height: 20, borderRadius: 10, background: '#fff',
            position: 'absolute', top: 3,
            left: autoMode ? 25 : 3, transition: 'left 0.2s',
          }} />
        </div>
      </div>

      {/* Kill/Scale Rules Reference */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 0.5, marginBottom: 12, textTransform: 'uppercase' }}>
          Traffic Command Rules
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12 }}>
          <div style={{ padding: 12, background: 'rgba(239,68,68,0.05)', borderRadius: 10, border: '1px solid rgba(239,68,68,0.15)' }}>
            <div style={{ fontWeight: 700, color: '#f87171', marginBottom: 6 }}>KILL CONDITIONS</div>
            <div style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
              Spend {'>'} $500 + ROAS {'<'} 1.5x for 72h+<br />
              CPM {'>'} 3x benchmark + 0 conversions<br />
              CPA {'>'} 2x target for 5+ days<br />
              Frequency {'>'} 3.0 + declining CTR
            </div>
          </div>
          <div style={{ padding: 12, background: 'rgba(16,185,129,0.05)', borderRadius: 10, border: '1px solid rgba(16,185,129,0.15)' }}>
            <div style={{ fontWeight: 700, color: '#34d399', marginBottom: 6 }}>SCALE CONDITIONS</div>
            <div style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
              ROAS {'>'} 2x for 7+ days stable<br />
              ROAS {'>'} 3x for 5+ days<br />
              Frequency {'<'} 2.5<br />
              Scale max 20% at a time
            </div>
          </div>
        </div>
      </div>

      {/* Scan Results */}
      {result && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 0.5, marginBottom: 12, textTransform: 'uppercase' }}>
            Scan Results — {result.campaigns_checked} campaigns checked
          </div>

          {result.executed.length > 0 && (
            <div style={{
              padding: '14px 20px', borderRadius: 12, marginBottom: 12,
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
              color: '#34d399', fontSize: 13, fontWeight: 600,
            }}>
              Actions executed: {result.executed.join(' | ')}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {result.actions.map((action, i) => {
              const colors = actionColors[action.action];
              return (
                <div key={i} style={{
                  background: colors.bg, border: `1px solid ${colors.border}`,
                  borderRadius: 14, padding: '16px 20px',
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: colors.border, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 16, fontWeight: 800,
                    color: colors.text, flexShrink: 0,
                  }}>
                    {colors.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                        background: colors.border, color: colors.text, textTransform: 'uppercase',
                      }}>
                        {action.action}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{action.campaign}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>{action.reason}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{action.details}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending Actions */}
      {pendingActions.length > 0 && !result && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 0.5, marginBottom: 12, textTransform: 'uppercase' }}>
            Pending Actions ({pendingActions.length})
          </div>
          {pendingActions.map((rule: any) => (
            <div key={rule.id} style={{
              ...card, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{rule.title}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{rule.description}</div>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                background: rule.rule_type === 'kill' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                color: rule.rule_type === 'kill' ? '#f87171' : '#34d399',
                textTransform: 'uppercase',
              }}>
                {rule.rule_type}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!result && pendingActions.length === 0 && (
        <div style={{ ...card, textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>~</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>No Scans Yet</h3>
          <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
            Click "Run Scan" to have Wanda analyze your campaigns against Traffic Command kill/scale rules.
          </p>
        </div>
      )}
    </div>
  );
}
