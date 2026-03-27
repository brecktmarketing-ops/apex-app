'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { PipelineLead } from '@/lib/types';

const STAGES = [
  { key: 'raw', label: 'Raw Leads', color: 'var(--muted)' },
  { key: 'contacted', label: 'Contacted', color: 'var(--yellow)' },
  { key: 'replied', label: 'Replied', color: 'var(--accent)' },
  { key: 'active', label: 'Active Clients', color: 'var(--green)' },
] as const;

export default function PipelinePage() {
  const supabase = createClient();
  const [leads, setLeads] = useState<PipelineLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newLead, setNewLead] = useState({ name: '', business: '', stage: 'raw' as string });

  useEffect(() => {
    loadLeads();
  }, []);

  async function loadLeads() {
    const { data } = await supabase.from('pipeline_leads').select('*').order('created_at', { ascending: false });
    setLeads(data || []);
    setLoading(false);
  }

  async function addLead() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !newLead.name) return;
    await supabase.from('pipeline_leads').insert({ user_id: user.id, name: newLead.name, business: newLead.business, stage: newLead.stage });
    setNewLead({ name: '', business: '', stage: 'raw' });
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
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--green)', background: 'var(--green-dim)', padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(22,163,74,0.2)' }}>CRM Synced</span>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>+ Add Lead</button>
      </div>

      {showAdd && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Name</label>
            <input value={newLead.name} onChange={e => setNewLead({ ...newLead, name: e.target.value })} placeholder="Lead name" style={{ width: '100%', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 8, fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Business</label>
            <input value={newLead.business} onChange={e => setNewLead({ ...newLead, business: e.target.value })} placeholder="Company" style={{ width: '100%', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 8, fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }} />
          </div>
          <select value={newLead.stage} onChange={e => setNewLead({ ...newLead, stage: e.target.value })} style={{ padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 8, fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'inherit' }}>
            {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <button onClick={addLead} style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>Save</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {STAGES.map(stage => {
          const stageLeads = leads.filter(l => l.stage === stage.key);
          return (
            <div key={stage.key} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: stage.color }}>{stage.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{stageLeads.length}</span>
              </div>
              <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 200 }}>
                {stageLeads.map(l => (
                  <div key={l.id} style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{l.name}</div>
                    {l.business && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{l.business}</div>}
                    <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                      {STAGES.filter(s => s.key !== stage.key).map(s => (
                        <button key={s.key} onClick={() => moveStage(l.id, s.key)} style={{ fontSize: 9, padding: '2px 6px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit' }}>{s.label}</button>
                      ))}
                      <button onClick={() => deleteLead(l.id)} style={{ fontSize: 9, padding: '2px 6px', background: 'var(--red-dim)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 4, color: 'var(--red)', cursor: 'pointer', fontFamily: 'inherit', marginLeft: 'auto' }}>X</button>
                    </div>
                  </div>
                ))}
                {stageLeads.length === 0 && <div style={{ fontSize: 11, color: 'var(--dim)', textAlign: 'center', padding: 20 }}>No leads</div>}
              </div>
            </div>
          );
        })}
      </div>
      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>Loading...</div>}
    </div>
  );
}
