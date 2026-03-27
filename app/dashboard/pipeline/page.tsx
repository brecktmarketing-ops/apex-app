'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { PipelineLead } from '@/lib/types';

const STAGES = [
  { key: 'raw', label: 'Raw Leads', color: 'var(--muted)', icon: '◯' },
  { key: 'contacted', label: 'Contacted', color: 'var(--yellow)', icon: '◑' },
  { key: 'replied', label: 'Replied', color: 'var(--accent)', icon: '◕' },
  { key: 'active', label: 'Active Clients', color: 'var(--green)', icon: '●' },
] as const;

type StageKey = typeof STAGES[number]['key'];

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: 'var(--bg)',
  border: '1px solid var(--border2)',
  borderRadius: 8,
  fontSize: 13,
  color: 'var(--text)',
  outline: 'none',
  fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--muted)',
  display: 'block',
  marginBottom: 4,
};

const btnSmall: React.CSSProperties = {
  fontSize: 9,
  padding: '2px 6px',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  color: 'var(--muted)',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

export default function PipelinePage() {
  const supabase = createClient();
  const [leads, setLeads] = useState<PipelineLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [newLead, setNewLead] = useState({
    name: '',
    business: '',
    email: '',
    phone: '',
    source: '',
    platform: '',
    stage: 'raw' as string,
  });

  useEffect(() => {
    loadLeads();
  }, []);

  async function loadLeads() {
    setLoading(true);
    const { data } = await supabase
      .from('pipeline_leads')
      .select('*')
      .order('created_at', { ascending: false });
    setLeads(data || []);
    setLoading(false);
  }

  async function addLead() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !newLead.name) return;
    await supabase.from('pipeline_leads').insert({
      user_id: user.id,
      name: newLead.name,
      business: newLead.business || null,
      email: newLead.email || null,
      phone: newLead.phone || null,
      source: newLead.source || null,
      platform: newLead.platform || null,
      stage: newLead.stage,
    });
    setNewLead({ name: '', business: '', email: '', phone: '', source: '', platform: '', stage: 'raw' });
    setShowAdd(false);
    loadLeads();
  }

  async function moveStage(id: string, stage: string) {
    await supabase.from('pipeline_leads').update({ stage }).eq('id', id);
    setLeads(prev => prev.map(l => l.id === id ? { ...l, stage: stage as PipelineLead['stage'] } : l));
  }

  async function deleteLead(id: string) {
    await supabase.from('pipeline_leads').delete().eq('id', id);
    setLeads(prev => prev.filter(l => l.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  // Filter logic
  const filtered = leads.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      l.name.toLowerCase().includes(q) ||
      (l.business || '').toLowerCase().includes(q) ||
      (l.email || '').toLowerCase().includes(q) ||
      (l.phone || '').toLowerCase().includes(q) ||
      (l.source || '').toLowerCase().includes(q) ||
      (l.campaign_name || '').toLowerCase().includes(q) ||
      (l.platform || '').toLowerCase().includes(q);
    const matchStage = filterStage === 'all' || l.stage === filterStage;
    return matchSearch && matchStage;
  });

  // KPIs
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const totalLeads = leads.length;
  const newThisWeek = leads.filter(l => new Date(l.created_at) >= weekAgo).length;
  const contactedCount = leads.filter(l => l.stage === 'contacted').length;
  const activeCount = leads.filter(l => l.stage === 'active').length;

  const kpis = [
    { label: 'Total Leads', value: totalLeads, color: 'var(--text)' },
    { label: 'New This Week', value: newThisWeek, color: 'var(--accent)' },
    { label: 'Contacted', value: contactedCount, color: 'var(--yellow)' },
    { label: 'Active Clients', value: activeCount, color: 'var(--green)' },
  ];

  // Drag handlers
  function handleDragStart(id: string) {
    setDragId(id);
  }
  function handleDragOver(e: React.DragEvent, stageKey: string) {
    e.preventDefault();
    setDragOver(stageKey);
  }
  function handleDragLeave() {
    setDragOver(null);
  }
  function handleDrop(stageKey: string) {
    if (dragId) {
      moveStage(dragId, stageKey);
    }
    setDragId(null);
    setDragOver(null);
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function platformBadge(platform: string | null) {
    if (!platform) return null;
    const colors: Record<string, string> = {
      meta: '#1877F2',
      google: '#EA4335',
      tiktok: '#00f2ea',
      facebook: '#1877F2',
      instagram: '#E4405F',
    };
    const bg = colors[platform.toLowerCase()] || 'var(--accent)';
    return (
      <span style={{
        fontSize: 9,
        fontWeight: 700,
        padding: '1px 6px',
        borderRadius: 4,
        background: `${bg}22`,
        color: bg,
        border: `1px solid ${bg}33`,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}>
        {platform}
      </span>
    );
  }

  // Expanded lead detail modal
  function renderDetail(lead: PipelineLead) {
    return (
      <div
        onClick={() => setExpandedId(null)}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: 28,
            width: '100%',
            maxWidth: 520,
            maxHeight: '80vh',
            overflowY: 'auto',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{lead.name}</h2>
              {lead.business && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{lead.business}</div>}
            </div>
            <button onClick={() => setExpandedId(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 20, cursor: 'pointer', padding: 4 }}>x</button>
          </div>

          {/* Stage badge */}
          <div style={{ marginBottom: 16 }}>
            {(() => {
              const s = STAGES.find(s => s.key === lead.stage);
              return (
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: `color-mix(in srgb, ${s?.color || 'var(--muted)'} 15%, transparent)`,
                  color: s?.color || 'var(--muted)',
                  border: `1px solid color-mix(in srgb, ${s?.color || 'var(--muted)'} 25%, transparent)`,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                }}>
                  {s?.icon} {s?.label}
                </span>
              );
            })()}
          </div>

          {/* Info grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            marginBottom: 20,
          }}>
            {[
              { label: 'Email', value: lead.email },
              { label: 'Phone', value: lead.phone },
              { label: 'Location', value: lead.location },
              { label: 'Source', value: lead.source },
              { label: 'Platform', value: lead.platform },
              { label: 'Campaign', value: lead.campaign_name },
              { label: 'Added', value: lead.created_at ? formatDate(lead.created_at) : null },
              { label: 'Updated', value: lead.updated_at ? formatDate(lead.updated_at) : null },
            ].filter(r => r.value).map((row, i) => (
              <div key={i} style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 14px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>{row.label}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', wordBreak: 'break-all' }}>{row.value}</div>
              </div>
            ))}
          </div>

          {/* Purchase info */}
          {(lead.purchase_amount || lead.purchase_date) && (
            <div style={{
              background: 'color-mix(in srgb, var(--green) 8%, transparent)',
              border: '1px solid color-mix(in srgb, var(--green) 20%, transparent)',
              borderRadius: 10,
              padding: '12px 16px',
              marginBottom: 20,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Purchase Info</div>
              <div style={{ display: 'flex', gap: 20 }}>
                {lead.purchase_amount != null && (
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>Amount: </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>${lead.purchase_amount.toLocaleString()}</span>
                  </div>
                )}
                {lead.purchase_date && (
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>Date: </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{formatDate(lead.purchase_date)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {lead.notes && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Notes</div>
              <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{lead.notes}</div>
            </div>
          )}

          {/* Tags */}
          {lead.tags && lead.tags.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Tags</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {lead.tags.map((t, i) => (
                  <span key={i} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)' }}>{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {STAGES.filter(s => s.key !== lead.stage).map(s => (
              <button
                key={s.key}
                onClick={() => { moveStage(lead.id, s.key); setExpandedId(null); }}
                style={{
                  fontSize: 11,
                  padding: '6px 14px',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: s.color,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontWeight: 600,
                }}
              >
                Move to {s.label}
              </button>
            ))}
            <button
              onClick={() => { deleteLead(lead.id); setExpandedId(null); }}
              style={{
                fontSize: 11,
                padding: '6px 14px',
                background: 'var(--red-dim)',
                border: '1px solid rgba(220,38,38,0.2)',
                borderRadius: 6,
                color: 'var(--red)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: 600,
                marginLeft: 'auto',
              }}
            >
              Delete Lead
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* KPI Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12,
        marginBottom: 16,
      }}>
        {kpis.map((kpi, i) => (
          <div key={i} style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '14px 18px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: kpi.color, fontVariantNumeric: 'tabular-nums' }}>{kpi.value}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 2 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Search/Filter + Add */}
      <div style={{
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        marginBottom: 16,
        flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search leads by name, business, email, campaign..."
            style={{
              ...inputStyle,
              paddingLeft: 34,
            }}
          />
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--muted)', pointerEvents: 'none' }}>
            &#x1F50D;
          </span>
        </div>
        <select
          value={filterStage}
          onChange={e => setFilterStage(e.target.value)}
          style={{
            padding: '8px 12px',
            background: 'var(--bg)',
            border: '1px solid var(--border2)',
            borderRadius: 8,
            fontSize: 12,
            color: 'var(--text)',
            outline: 'none',
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          <option value="all">All Stages</option>
          {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--green)',
            background: 'var(--green-dim)',
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid rgba(22,163,74,0.2)',
          }}>
            CRM Synced
          </span>
          <button
            onClick={async () => {
              try {
                const res = await fetch('/api/ads/meta/leads');
                const data = await res.json();
                if (data.newLeads > 0) {
                  alert(`Synced ${data.newLeads} new leads from Meta!`);
                  loadLeads();
                } else {
                  alert(data.error || 'No new leads found');
                }
              } catch { alert('Failed to sync leads'); }
            }}
            style={{
              padding: '6px 16px',
              background: 'var(--card)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Sync Meta Leads
          </button>
          <button
            onClick={() => setShowAdd(!showAdd)}
            style={{
              padding: '6px 16px',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            + Add Lead
          </button>
        </div>
      </div>

      {/* Add Lead Form */}
      {showAdd && (
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: 18,
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>New Lead</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={labelStyle}>Name *</label>
              <input
                value={newLead.name}
                onChange={e => setNewLead({ ...newLead, name: e.target.value })}
                placeholder="Full name"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Business</label>
              <input
                value={newLead.business}
                onChange={e => setNewLead({ ...newLead, business: e.target.value })}
                placeholder="Company name"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                value={newLead.email}
                onChange={e => setNewLead({ ...newLead, email: e.target.value })}
                placeholder="email@example.com"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input
                value={newLead.phone}
                onChange={e => setNewLead({ ...newLead, phone: e.target.value })}
                placeholder="(555) 123-4567"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Source</label>
              <input
                value={newLead.source}
                onChange={e => setNewLead({ ...newLead, source: e.target.value })}
                placeholder="e.g. Meta Lead Ad"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Platform</label>
              <select
                value={newLead.platform}
                onChange={e => setNewLead({ ...newLead, platform: e.target.value })}
                style={inputStyle}
              >
                <option value="">Select...</option>
                <option value="meta">Meta</option>
                <option value="google">Google</option>
                <option value="tiktok">TikTok</option>
                <option value="organic">Organic</option>
                <option value="referral">Referral</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <select
              value={newLead.stage}
              onChange={e => setNewLead({ ...newLead, stage: e.target.value })}
              style={{ ...inputStyle, width: 'auto' }}
            >
              {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => { setShowAdd(false); setNewLead({ name: '', business: '', email: '', phone: '', source: '', platform: '', stage: 'raw' }); }}
              style={{
                padding: '8px 16px',
                background: 'var(--bg)',
                color: 'var(--muted)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Cancel
            </button>
            <button
              onClick={addLead}
              style={{
                padding: '8px 20px',
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Save Lead
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 13 }}>Loading pipeline...</div>
      )}

      {/* Kanban Board */}
      {!loading && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          alignItems: 'flex-start',
        }}>
          {STAGES.map(stage => {
            const stageLeads = filtered.filter(l => l.stage === stage.key);
            const isDragTarget = dragOver === stage.key;
            return (
              <div
                key={stage.key}
                onDragOver={e => handleDragOver(e, stage.key)}
                onDragLeave={handleDragLeave}
                onDrop={() => handleDrop(stage.key)}
                style={{
                  background: 'var(--card)',
                  border: `1px solid ${isDragTarget ? stage.color : 'var(--border)'}`,
                  borderRadius: 'var(--radius)',
                  overflow: 'hidden',
                  transition: 'border-color 0.15s',
                  boxShadow: isDragTarget ? `0 0 0 1px ${stage.color}` : 'none',
                }}
              >
                {/* Column Header */}
                <div style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: stage.color }}>{stage.icon}</span>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: 0.8,
                      color: stage.color,
                    }}>
                      {stage.label}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--text)',
                    background: 'var(--bg)',
                    padding: '2px 8px',
                    borderRadius: 10,
                    minWidth: 20,
                    textAlign: 'center',
                  }}>
                    {stageLeads.length}
                  </span>
                </div>

                {/* Cards */}
                <div style={{
                  padding: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  minHeight: 200,
                }}>
                  {stageLeads.map(l => (
                    <div
                      key={l.id}
                      draggable
                      onDragStart={() => handleDragStart(l.id)}
                      onClick={() => setExpandedId(l.id)}
                      style={{
                        background: 'var(--card2)',
                        border: `1px solid ${dragId === l.id ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: 10,
                        padding: '10px 12px',
                        cursor: 'grab',
                        opacity: dragId === l.id ? 0.5 : 1,
                        transition: 'opacity 0.15s, border-color 0.15s',
                      }}
                    >
                      {/* Name + platform badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</div>
                        {platformBadge(l.platform)}
                      </div>

                      {/* Business */}
                      {l.business && (
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.business}</div>
                      )}

                      {/* Source / campaign */}
                      {(l.source || l.campaign_name) && (
                        <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {l.campaign_name || l.source}
                        </div>
                      )}

                      {/* Contact row */}
                      <div style={{ display: 'flex', gap: 8, fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>
                        {l.phone && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.phone}</span>}
                        {l.email && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{l.email}</span>}
                      </div>

                      {/* Purchase badge */}
                      {l.purchase_amount != null && (
                        <div style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: 'var(--green)',
                          marginBottom: 4,
                        }}>
                          ${l.purchase_amount.toLocaleString()} purchased
                        </div>
                      )}

                      {/* Date + actions */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                        <span style={{ fontSize: 9, color: 'var(--dim)' }}>{formatDate(l.created_at)}</span>
                        <div style={{ display: 'flex', gap: 3 }} onClick={e => e.stopPropagation()}>
                          {STAGES.filter(s => s.key !== stage.key).map(s => (
                            <button
                              key={s.key}
                              onClick={() => moveStage(l.id, s.key)}
                              title={`Move to ${s.label}`}
                              style={{ ...btnSmall, color: s.color }}
                            >
                              {s.icon}
                            </button>
                          ))}
                          <button
                            onClick={() => deleteLead(l.id)}
                            title="Delete"
                            style={{
                              ...btnSmall,
                              background: 'var(--red-dim)',
                              border: '1px solid rgba(220,38,38,0.2)',
                              color: 'var(--red)',
                              marginLeft: 2,
                            }}
                          >
                            X
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {stageLeads.length === 0 && (
                    <div style={{
                      fontSize: 11,
                      color: 'var(--dim)',
                      textAlign: 'center',
                      padding: 30,
                      borderRadius: 8,
                      border: '1px dashed var(--border)',
                    }}>
                      {isDragTarget ? 'Drop here' : 'No leads'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Expanded Lead Detail Modal */}
      {expandedId && leads.find(l => l.id === expandedId) && renderDetail(leads.find(l => l.id === expandedId)!)}
    </div>
  );
}
