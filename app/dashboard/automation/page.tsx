'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

/* ── types ── */
interface Step {
  id: string;
  sequence_id: string;
  step_order: number;
  step_type: string;
  subject: string | null;
  body: string | null;
  delay_hours: number | null;
}

interface Enrollment {
  id: string;
  sequence_id: string;
  lead_id: string;
  lead_name?: string;
  lead_email?: string;
  lead_phone?: string;
  current_step: number;
  status: string;
  enrolled_at: string;
}

interface MessageLog {
  id: string;
  step_id: string;
  enrollment_id: string;
  channel: string;
  status: string;
  sent_at: string;
}

interface Sequence {
  id: string;
  name: string;
  description: string;
  trigger_type: string;
  status: string;
  created_at: string;
  steps?: Step[];
  enrollments?: Enrollment[];
  logs?: MessageLog[];
  emails_sent?: number;
  sms_sent?: number;
}

interface DraftStep {
  type: 'email' | 'sms' | 'delay';
  subject?: string;
  body?: string;
  delay?: number;
}

interface PipelineLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  stage: string;
}

const TRIGGER_TYPES = [
  { key: 'pipeline_stage', label: 'Pipeline Stage Change', icon: '>' },
  { key: 'tag_added', label: 'Tag Added', icon: '#' },
  { key: 'manual', label: 'Manual', icon: '+' },
  { key: 'no_reply', label: 'No Reply', icon: '?' },
  { key: 'no_purchase', label: 'No Purchase', icon: '$' },
  { key: 'form_submission', label: 'Form Submission', icon: '=' },
  { key: 'new_lead', label: 'New Lead', icon: '*' },
];

/* ── reusable styles ── */
const card: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 10, fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'inherit' };
const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 };
const sectionTitle: React.CSSProperties = { fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontWeight: 700, marginBottom: 14 };
const btnPrimary: React.CSSProperties = { padding: '10px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };
const btnSecondary: React.CSSProperties = { padding: '8px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--muted)', fontFamily: 'inherit' };
const btnSmall: React.CSSProperties = { fontSize: 10, padding: '4px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit' };
const badgeStyle = (color: string): React.CSSProperties => ({ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6, color, background: `${color}18`, textTransform: 'capitalize' as const });

const stepIcon = (type: string) => type === 'email' ? 'E' : type === 'sms' ? 'S' : type === 'delay' ? 'D' : '?';
const stepColor = (type: string) => type === 'email' ? '#3b82f6' : type === 'sms' ? '#10b981' : type === 'delay' ? '#94a3b8' : '#fbbf24';
const statusColor = (s: string) => s === 'sent' ? '#3b82f6' : s === 'delivered' ? '#10b981' : s === 'opened' ? 'var(--accent)' : s === 'failed' ? '#ef4444' : 'var(--muted)';

export default function AutomationPage() {
  const supabase = createClient();

  /* ── state ── */
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ active: 0, total: 0, emails: 0, sms: 0 });

  // create mode
  const [createMode, setCreateMode] = useState<'wanda' | 'manual'>('wanda');
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<{ name: string; description: string; trigger: string; steps: DraftStep[] } | null>(null);

  // manual builder
  const [manualName, setManualName] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [manualTrigger, setManualTrigger] = useState('manual');
  const [manualSteps, setManualSteps] = useState<DraftStep[]>([{ type: 'email', subject: '', body: '' }]);

  // sequence list
  const [expandedSeq, setExpandedSeq] = useState<string | null>(null);
  const [editingSeq, setEditingSeq] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editTrigger, setEditTrigger] = useState('');
  const [editSteps, setEditSteps] = useState<DraftStep[]>([]);
  const [saving, setSaving] = useState(false);

  // enrollment
  const [enrollSeqId, setEnrollSeqId] = useState<string | null>(null);
  const [pipelineLeads, setPipelineLeads] = useState<PipelineLead[]>([]);
  const [enrollSearch, setEnrollSearch] = useState('');
  const [showEnrollments, setShowEnrollments] = useState<string | null>(null);

  // sending
  const [sendingStep, setSendingStep] = useState<string | null>(null);

  /* ── load data ── */
  const loadSequences = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('sequences').select('*').order('created_at', { ascending: false });
    if (data) {
      for (const seq of data) {
        const { data: steps } = await supabase.from('sequence_steps').select('*').eq('sequence_id', seq.id).order('step_order');
        seq.steps = steps || [];
        const { data: enrollments } = await supabase.from('sequence_enrollments').select('*').eq('sequence_id', seq.id);
        seq.enrollments = enrollments || [];
        const { data: logs } = await supabase.from('message_log').select('*').eq('sequence_id', seq.id);
        seq.logs = logs || [];
        seq.emails_sent = (logs || []).filter((l: MessageLog) => l.channel === 'email').length;
        seq.sms_sent = (logs || []).filter((l: MessageLog) => l.channel === 'sms').length;
      }
    }
    setSequences(data || []);
    setLoading(false);
  }, []);

  const loadStats = useCallback(async () => {
    const { count: emailCount } = await supabase.from('message_log').select('*', { count: 'exact', head: true }).eq('channel', 'email');
    const { count: smsCount } = await supabase.from('message_log').select('*', { count: 'exact', head: true }).eq('channel', 'sms');
    setStats(prev => ({ ...prev, emails: emailCount || 0, sms: smsCount || 0 }));
  }, []);

  useEffect(() => { loadSequences(); loadStats(); }, []);
  useEffect(() => {
    setStats(prev => ({
      ...prev,
      active: sequences.filter(s => s.status === 'active').length,
      total: sequences.length,
    }));
  }, [sequences]);

  /* ── Wanda generate ── */
  async function generateSequence() {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setPreview(null);
    try {
      const res = await fetch('/api/wanda/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Create an automation sequence based on this request: "${prompt}"

Return ONLY valid JSON in this exact format, no other text:
{
  "name": "sequence name",
  "description": "what this sequence does",
  "trigger": "pipeline_stage|tag_added|manual|no_reply|no_purchase|form_submission|new_lead",
  "steps": [
    {"type": "email", "subject": "subject line", "body": "email body text (2-3 sentences, conversational, no fluff)"},
    {"type": "delay", "delay": 48},
    {"type": "sms", "body": "short text message"},
    {"type": "delay", "delay": 24},
    {"type": "email", "subject": "follow up subject", "body": "follow up email body"}
  ]
}

Write the actual copy for each email and SMS. Make it conversational, direct, no corporate speak. Use {{name}} and {{business}} as merge fields. Keep SMS under 160 chars.`
        }),
      });
      const data = await res.json();
      if (data.error) { alert('Error: ' + data.error); }
      else {
        const jsonMatch = data.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) setPreview(JSON.parse(jsonMatch[0]));
        else alert('Wanda returned an unexpected format. Try rephrasing.');
      }
    } catch (e: any) {
      alert('Failed to generate: ' + (e.message || 'Unknown error'));
    }
    setGenerating(false);
  }

  /* ── save sequence (from preview or manual) ── */
  async function saveSequence(name: string, description: string, trigger: string, steps: DraftStep[]) {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { data: seq } = await supabase.from('sequences').insert({
      user_id: user.id,
      name,
      description,
      trigger_type: trigger || 'manual',
      status: 'active',
    }).select('id').single();

    if (seq) {
      const rows = steps.map((s, i) => ({
        sequence_id: seq.id,
        user_id: user.id,
        step_order: i + 1,
        step_type: s.type,
        subject: s.subject || null,
        body: s.body || null,
        delay_hours: s.delay || null,
      }));
      await supabase.from('sequence_steps').insert(rows);
    }

    setPreview(null);
    setPrompt('');
    setManualName('');
    setManualDesc('');
    setManualTrigger('manual');
    setManualSteps([{ type: 'email', subject: '', body: '' }]);
    setSaving(false);
    loadSequences();
  }

  /* ── update sequence ── */
  async function updateSequence(id: string) {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    await supabase.from('sequences').update({
      name: editName,
      description: editDesc,
      trigger_type: editTrigger,
    }).eq('id', id);

    // replace steps
    await supabase.from('sequence_steps').delete().eq('sequence_id', id);
    const rows = editSteps.map((s, i) => ({
      sequence_id: id,
      user_id: user.id,
      step_order: i + 1,
      step_type: s.type,
      subject: s.subject || null,
      body: s.body || null,
      delay_hours: s.delay || null,
    }));
    if (rows.length > 0) await supabase.from('sequence_steps').insert(rows);

    setEditingSeq(null);
    setSaving(false);
    loadSequences();
  }

  /* ── toggle / delete ── */
  async function toggleSequence(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    await supabase.from('sequences').update({ status: newStatus }).eq('id', id);
    setSequences(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
  }

  async function deleteSequence(id: string) {
    if (!confirm('Delete this sequence and all its steps?')) return;
    await supabase.from('sequence_enrollments').delete().eq('sequence_id', id);
    await supabase.from('sequence_steps').delete().eq('sequence_id', id);
    await supabase.from('sequences').delete().eq('id', id);
    setSequences(prev => prev.filter(s => s.id !== id));
    if (expandedSeq === id) setExpandedSeq(null);
  }

  /* ── enrollment ── */
  async function openEnrollModal(seqId: string) {
    setEnrollSeqId(seqId);
    setEnrollSearch('');
    const { data } = await supabase.from('pipeline_leads').select('id, name, email, phone, stage');
    setPipelineLeads(data || []);
  }

  async function enrollLead(leadId: string, lead: PipelineLead) {
    if (!enrollSeqId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('sequence_enrollments').insert({
      sequence_id: enrollSeqId,
      lead_id: leadId,
      lead_name: lead.name,
      lead_email: lead.email,
      lead_phone: lead.phone,
      user_id: user.id,
      current_step: 1,
      status: 'active',
    });
    setEnrollSeqId(null);
    loadSequences();
  }

  async function unenrollLead(enrollmentId: string) {
    await supabase.from('sequence_enrollments').delete().eq('id', enrollmentId);
    loadSequences();
  }

  /* ── send / test send ── */
  async function sendStep(stepId: string, toEmail?: string, toPhone?: string) {
    setSendingStep(stepId);
    try {
      const res = await fetch('/api/automation/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step_id: stepId, to_email: toEmail || undefined, to_phone: toPhone || undefined }),
      });
      const data = await res.json();
      if (data.error) alert('Send failed: ' + data.error);
      else alert('Sent successfully');
      loadSequences();
      loadStats();
    } catch (e: any) {
      alert('Send failed: ' + (e.message || 'Unknown error'));
    }
    setSendingStep(null);
  }

  async function testSendFirstStep(seqId: string) {
    const seq = sequences.find(s => s.id === seqId);
    if (!seq?.steps?.length) return;
    const firstReal = seq.steps.find(s => s.step_type !== 'delay');
    if (!firstReal) { alert('No email/sms step found'); return; }
    const target = window.prompt(`Enter ${firstReal.step_type === 'email' ? 'email address' : 'phone number'} for test send:`);
    if (!target) return;
    if (firstReal.step_type === 'email') await sendStep(firstReal.id, target);
    else await sendStep(firstReal.id, undefined, target);
  }

  /* ── manual step helpers ── */
  function addManualStep() {
    setManualSteps(prev => [...prev, { type: 'email', subject: '', body: '' }]);
  }
  function updateManualStep(index: number, patch: Partial<DraftStep>) {
    setManualSteps(prev => prev.map((s, i) => i === index ? { ...s, ...patch } : s));
  }
  function removeManualStep(index: number) {
    setManualSteps(prev => prev.filter((_, i) => i !== index));
  }
  function moveManualStep(index: number, dir: -1 | 1) {
    setManualSteps(prev => {
      const arr = [...prev];
      const target = index + dir;
      if (target < 0 || target >= arr.length) return arr;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
  }

  // same helpers for edit mode
  function addEditStep() { setEditSteps(prev => [...prev, { type: 'email', subject: '', body: '' }]); }
  function updateEditStep(index: number, patch: Partial<DraftStep>) {
    setEditSteps(prev => prev.map((s, i) => i === index ? { ...s, ...patch } : s));
  }
  function removeEditStep(index: number) { setEditSteps(prev => prev.filter((_, i) => i !== index)); }
  function moveEditStep(index: number, dir: -1 | 1) {
    setEditSteps(prev => {
      const arr = [...prev];
      const target = index + dir;
      if (target < 0 || target >= arr.length) return arr;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
  }

  function startEditing(seq: Sequence) {
    setEditingSeq(seq.id);
    setEditName(seq.name);
    setEditDesc(seq.description);
    setEditTrigger(seq.trigger_type);
    setEditSteps((seq.steps || []).map(s => ({
      type: s.step_type as DraftStep['type'],
      subject: s.subject || undefined,
      body: s.body || undefined,
      delay: s.delay_hours || undefined,
    })));
  }

  /* ── step builder component (shared between manual + edit) ── */
  function renderStepBuilder(steps: DraftStep[], update: (i: number, p: Partial<DraftStep>) => void, remove: (i: number) => void, move: (i: number, d: -1 | 1) => void, add: () => void) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {steps.map((step, i) => (
          <div key={i} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: 6, background: `${stepColor(step.type)}18`, border: `1px solid ${stepColor(step.type)}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: stepColor(step.type) }}>{stepIcon(step.type)}</div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>Step {i + 1}</span>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => move(i, -1)} disabled={i === 0} style={{ ...btnSmall, opacity: i === 0 ? 0.3 : 1 }} title="Move up">^</button>
                <button onClick={() => move(i, 1)} disabled={i === steps.length - 1} style={{ ...btnSmall, opacity: i === steps.length - 1 ? 0.3 : 1 }} title="Move down">v</button>
                <button onClick={() => remove(i)} style={{ ...btnSmall, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}>x</button>
              </div>
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={labelStyle}>Type</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['email', 'sms', 'delay'] as const).map(t => (
                  <button key={t} onClick={() => update(i, { type: t, subject: t === 'email' ? '' : undefined, body: t !== 'delay' ? '' : undefined, delay: t === 'delay' ? 24 : undefined })} style={{ ...btnSmall, background: step.type === t ? `${stepColor(t)}18` : 'var(--bg)', color: step.type === t ? stepColor(t) : 'var(--muted)', borderColor: step.type === t ? `${stepColor(t)}40` : 'var(--border)', fontWeight: step.type === t ? 700 : 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t}</button>
                ))}
              </div>
            </div>

            {step.type === 'email' && (
              <div style={{ marginBottom: 8 }}>
                <label style={labelStyle}>Subject</label>
                <input value={step.subject || ''} onChange={e => update(i, { subject: e.target.value })} placeholder="Email subject line" style={inputStyle} />
              </div>
            )}

            {(step.type === 'email' || step.type === 'sms') && (
              <div>
                <label style={labelStyle}>Body</label>
                <textarea value={step.body || ''} onChange={e => update(i, { body: e.target.value })} placeholder={step.type === 'sms' ? 'SMS body (keep under 160 chars)' : 'Email body — use {{name}} and {{business}} for merge fields'} rows={step.type === 'sms' ? 2 : 4} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
                {step.type === 'sms' && <div style={{ fontSize: 10, color: (step.body?.length || 0) > 160 ? '#ef4444' : 'var(--muted)', marginTop: 4 }}>{step.body?.length || 0}/160</div>}
              </div>
            )}

            {step.type === 'delay' && (
              <div>
                <label style={labelStyle}>Delay (hours)</label>
                <input type="number" min={1} value={step.delay || 24} onChange={e => update(i, { delay: parseInt(e.target.value) || 1 })} style={{ ...inputStyle, width: 120 }} />
              </div>
            )}
          </div>
        ))}

        <button onClick={add} style={{ ...btnSecondary, width: '100%', textAlign: 'center' }}>+ Add Step</button>
      </div>
    );
  }

  /* ── render ── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── STATS BAR ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          { label: 'Active Sequences', value: stats.active, color: 'var(--accent)' },
          { label: 'Total Sequences', value: stats.total, color: '#6366f1' },
          { label: 'Emails Sent', value: stats.emails, color: '#3b82f6' },
          { label: 'SMS Sent', value: stats.sms, color: '#10b981' },
        ].map((s, i) => (
          <div key={i} style={{ ...card, padding: 16 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
        {/* ── LEFT: CREATE ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={sectionTitle}>Create Sequence</div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => setCreateMode('wanda')} style={{ ...btnSmall, background: createMode === 'wanda' ? 'var(--accent)' : 'var(--bg)', color: createMode === 'wanda' ? '#fff' : 'var(--muted)', borderColor: createMode === 'wanda' ? 'var(--accent)' : 'var(--border)' }}>Ask Wanda</button>
                <button onClick={() => setCreateMode('manual')} style={{ ...btnSmall, background: createMode === 'manual' ? 'var(--accent)' : 'var(--bg)', color: createMode === 'manual' ? '#fff' : 'var(--muted)', borderColor: createMode === 'manual' ? 'var(--accent)' : 'var(--border)' }}>Manual</button>
              </div>
            </div>

            {/* ── ASK WANDA MODE ── */}
            {createMode === 'wanda' && (
              <>
                <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Describe what you want and Wanda builds the entire sequence — emails, texts, timing, everything.</p>
                <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="e.g. Set up a follow-up sequence for new leads — email day 1, text day 3, email day 5 if no reply" rows={4} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                  {[
                    'Follow up sequence for new leads',
                    'Re-engage customers who haven\'t ordered in 30 days',
                    'Welcome sequence for new signups',
                    'Appointment reminder — text 24h before, email 1h before',
                    'Win-back sequence for lost deals',
                  ].map(q => (
                    <button key={q} onClick={() => setPrompt(q)} style={{ padding: '4px 8px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 10, color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit' }}>{q}</button>
                  ))}
                </div>
                <button onClick={generateSequence} disabled={generating || !prompt.trim()} style={{ ...btnPrimary, width: '100%', marginTop: 14, opacity: generating ? 0.6 : 1 }}>
                  {generating ? 'Wanda is building your sequence...' : 'Generate with Wanda'}
                </button>
              </>
            )}

            {/* ── MANUAL MODE ── */}
            {createMode === 'manual' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Sequence Name</label>
                  <input value={manualName} onChange={e => setManualName(e.target.value)} placeholder="e.g. New Lead Follow-Up" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Description</label>
                  <input value={manualDesc} onChange={e => setManualDesc(e.target.value)} placeholder="What does this sequence do?" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Trigger</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {TRIGGER_TYPES.map(t => (
                      <button key={t.key} onClick={() => setManualTrigger(t.key)} style={{ ...btnSmall, background: manualTrigger === t.key ? 'var(--accent)' : 'var(--bg)', color: manualTrigger === t.key ? '#fff' : 'var(--muted)', borderColor: manualTrigger === t.key ? 'var(--accent)' : 'var(--border)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 11 }}>{t.icon}</span> {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 4 }}>
                  <label style={{ ...labelStyle, marginBottom: 10 }}>Steps</label>
                  {renderStepBuilder(manualSteps, updateManualStep, removeManualStep, moveManualStep, addManualStep)}
                </div>

                <button onClick={() => {
                  if (!manualName.trim()) { alert('Enter a sequence name'); return; }
                  if (manualSteps.length === 0) { alert('Add at least one step'); return; }
                  saveSequence(manualName, manualDesc, manualTrigger, manualSteps);
                }} disabled={saving} style={{ ...btnPrimary, width: '100%', opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Saving...' : 'Save Sequence'}
                </button>
              </div>
            )}
          </div>

          {/* ── AI PREVIEW ── */}
          {preview && (
            <div style={{ ...card, border: '1px solid var(--accent)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ ...sectionTitle, color: 'var(--accent)', marginBottom: 0 }}>Preview</div>
                <span style={{ ...badgeStyle('var(--muted)') }}>Trigger: {preview.trigger}</span>
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>{preview.name}</h3>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>{preview.description}</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {preview.steps.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${stepColor(s.type)}18`, border: `1px solid ${stepColor(s.type)}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: stepColor(s.type) }}>{stepIcon(s.type)}</div>
                      {i < preview.steps.length - 1 && <div style={{ width: 2, height: 24, background: 'var(--border2)' }} />}
                    </div>
                    <div style={{ flex: 1, paddingBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: stepColor(s.type), textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                        {s.type === 'delay' ? `Wait ${s.delay}h` : s.type}
                      </div>
                      {s.subject && <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2, color: 'var(--text)' }}>{s.subject}</div>}
                      {s.body && <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{s.body}</div>}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button onClick={() => setPreview(null)} style={{ ...btnSecondary, flex: 1 }}>Discard</button>
                <button onClick={() => saveSequence(preview.name, preview.description, preview.trigger, preview.steps)} disabled={saving} style={{ ...btnPrimary, flex: 2, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : 'Save & Activate'}</button>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: SEQUENCE LIST ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={card}>
            <div style={sectionTitle}>Your Sequences</div>

            {!loading && sequences.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 12, color: 'var(--muted)' }}>+</div>
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>No sequences yet. Tell Wanda what you want or build one manually.</p>
              </div>
            )}

            {loading && <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)', fontSize: 13 }}>Loading sequences...</div>}

            {sequences.map(seq => (
              <div key={seq.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, marginBottom: 10 }}>
                {/* ── header row ── */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => { setExpandedSeq(expandedSeq === seq.id ? null : seq.id); setEditingSeq(null); }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{seq.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{seq.description}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                      <span style={{ ...badgeStyle('var(--muted)') }}>Trigger: {seq.trigger_type}</span>
                      <span style={{ ...badgeStyle('#6366f1') }}>{(seq.steps || []).length} steps</span>
                      {(seq.emails_sent || 0) > 0 && <span style={{ ...badgeStyle('#3b82f6') }}>{seq.emails_sent} emails</span>}
                      {(seq.sms_sent || 0) > 0 && <span style={{ ...badgeStyle('#10b981') }}>{seq.sms_sent} sms</span>}
                      {(seq.enrollments || []).length > 0 && <span style={{ ...badgeStyle('var(--accent)') }}>{seq.enrollments!.length} enrolled</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={badgeStyle(seq.status === 'active' ? '#10b981' : seq.status === 'paused' ? '#f59e0b' : 'var(--muted)')}>{seq.status}</span>
                    <div onClick={() => toggleSequence(seq.id, seq.status)} style={{ width: 38, height: 22, borderRadius: 11, cursor: 'pointer', position: 'relative', background: seq.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(220,38,38,0.1)', border: seq.status === 'active' ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(220,38,38,0.2)' }}>
                      <div style={{ position: 'absolute', top: 3, width: 14, height: 14, borderRadius: '50%', background: seq.status === 'active' ? '#10b981' : '#ef4444', transition: 'all 0.2s', ...(seq.status === 'active' ? { right: 3 } : { left: 3 }) }} />
                    </div>
                  </div>
                </div>

                {/* ── expanded view ── */}
                {expandedSeq === seq.id && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                    {/* action buttons */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                      <button onClick={() => startEditing(seq)} style={btnSmall}>Edit</button>
                      <button onClick={() => testSendFirstStep(seq.id)} style={{ ...btnSmall, color: '#3b82f6', borderColor: 'rgba(59,130,246,0.3)' }}>Test Send</button>
                      <button onClick={() => openEnrollModal(seq.id)} style={{ ...btnSmall, color: 'var(--accent)', borderColor: 'var(--accent)' }}>+ Enroll Lead</button>
                      <button onClick={() => setShowEnrollments(showEnrollments === seq.id ? null : seq.id)} style={{ ...btnSmall, color: '#6366f1', borderColor: 'rgba(99,102,241,0.3)' }}>
                        {showEnrollments === seq.id ? 'Hide Enrollments' : `Enrollments (${(seq.enrollments || []).length})`}
                      </button>
                      <button onClick={() => deleteSequence(seq.id)} style={{ ...btnSmall, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}>Delete</button>
                    </div>

                    {/* ── EDIT MODE ── */}
                    {editingSeq === seq.id && (
                      <div style={{ background: 'var(--card)', border: '1px solid var(--accent)', borderRadius: 12, padding: 16, marginBottom: 14 }}>
                        <div style={{ ...sectionTitle, color: 'var(--accent)', marginBottom: 12 }}>Edit Sequence</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div>
                            <label style={labelStyle}>Name</label>
                            <input value={editName} onChange={e => setEditName(e.target.value)} style={inputStyle} />
                          </div>
                          <div>
                            <label style={labelStyle}>Description</label>
                            <input value={editDesc} onChange={e => setEditDesc(e.target.value)} style={inputStyle} />
                          </div>
                          <div>
                            <label style={labelStyle}>Trigger</label>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {TRIGGER_TYPES.map(t => (
                                <button key={t.key} onClick={() => setEditTrigger(t.key)} style={{ ...btnSmall, background: editTrigger === t.key ? 'var(--accent)' : 'var(--bg)', color: editTrigger === t.key ? '#fff' : 'var(--muted)', borderColor: editTrigger === t.key ? 'var(--accent)' : 'var(--border)' }}>{t.label}</button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label style={{ ...labelStyle, marginBottom: 10 }}>Steps</label>
                            {renderStepBuilder(editSteps, updateEditStep, removeEditStep, moveEditStep, addEditStep)}
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => setEditingSeq(null)} style={{ ...btnSecondary, flex: 1 }}>Cancel</button>
                            <button onClick={() => updateSequence(seq.id)} disabled={saving} style={{ ...btnPrimary, flex: 2, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : 'Save Changes'}</button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── ENROLLMENT LIST ── */}
                    {showEnrollments === seq.id && (
                      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                        <div style={{ ...sectionTitle, marginBottom: 10 }}>Enrolled Leads</div>
                        {(!seq.enrollments || seq.enrollments.length === 0) && (
                          <p style={{ fontSize: 12, color: 'var(--muted)' }}>No leads enrolled in this sequence yet.</p>
                        )}
                        {(seq.enrollments || []).map(en => {
                          const enrollmentLogs = (seq.logs || []).filter(l => l.enrollment_id === en.id);
                          return (
                            <div key={en.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 10, marginBottom: 6 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{en.lead_name || 'Unknown'}</div>
                                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                                    {en.lead_email && <span>{en.lead_email}</span>}
                                    {en.lead_email && en.lead_phone && <span> | </span>}
                                    {en.lead_phone && <span>{en.lead_phone}</span>}
                                  </div>
                                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                    <span style={badgeStyle(en.status === 'active' ? '#10b981' : en.status === 'completed' ? '#3b82f6' : '#f59e0b')}>{en.status}</span>
                                    <span style={badgeStyle('var(--muted)')}>Step {en.current_step}/{(seq.steps || []).length}</span>
                                  </div>
                                </div>
                                <button onClick={() => unenrollLead(en.id)} style={{ ...btnSmall, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}>Remove</button>
                              </div>
                              {/* delivery status per step */}
                              {enrollmentLogs.length > 0 && (
                                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                                  <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>DELIVERY LOG</div>
                                  {enrollmentLogs.map(log => (
                                    <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor(log.status) }} />
                                      <span style={{ fontSize: 10, color: 'var(--muted)' }}>{log.channel.toUpperCase()}</span>
                                      <span style={{ fontSize: 10, color: statusColor(log.status), fontWeight: 600 }}>{log.status}</span>
                                      <span style={{ fontSize: 10, color: 'var(--muted)' }}>{new Date(log.sent_at).toLocaleString()}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* ── STEPS (read-only view) ── */}
                    {editingSeq !== seq.id && seq.steps && seq.steps.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        {seq.steps.map((step, i) => (
                          <div key={step.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <div style={{ width: 28, height: 28, borderRadius: 7, background: `${stepColor(step.step_type)}18`, border: `1px solid ${stepColor(step.step_type)}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: stepColor(step.step_type) }}>{stepIcon(step.step_type)}</div>
                              {i < (seq.steps!.length - 1) && <div style={{ width: 2, height: 20, background: 'var(--border2)' }} />}
                            </div>
                            <div style={{ flex: 1, paddingBottom: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: stepColor(step.step_type), textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                  {step.step_type === 'delay' ? `Wait ${step.delay_hours}h` : `Step ${step.step_order}: ${step.step_type}`}
                                </span>
                                {step.step_type !== 'delay' && (
                                  <button onClick={() => {
                                    const target = window.prompt(`Enter ${step.step_type === 'email' ? 'email address' : 'phone number'} to send to:`);
                                    if (!target) return;
                                    if (step.step_type === 'email') sendStep(step.id, target);
                                    else sendStep(step.id, undefined, target);
                                  }} disabled={sendingStep === step.id} style={{ ...btnSmall, color: '#3b82f6', borderColor: 'rgba(59,130,246,0.3)', opacity: sendingStep === step.id ? 0.5 : 1 }}>
                                    {sendingStep === step.id ? 'Sending...' : 'Send Now'}
                                  </button>
                                )}
                              </div>
                              {step.subject && <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2, color: 'var(--text)' }}>{step.subject}</div>}
                              {step.body && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1, lineHeight: 1.4 }}>{step.body}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ENROLL LEAD MODAL ── */}
      {enrollSeqId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => setEnrollSeqId(null)}>
          <div style={{ ...card, width: 440, maxHeight: '70vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={sectionTitle}>Enroll Lead</div>
              <button onClick={() => setEnrollSeqId(null)} style={{ ...btnSmall, color: 'var(--muted)' }}>Close</button>
            </div>
            <input value={enrollSearch} onChange={e => setEnrollSearch(e.target.value)} placeholder="Search leads by name or email..." style={{ ...inputStyle, marginBottom: 12 }} />
            {pipelineLeads
              .filter(l => {
                const q = enrollSearch.toLowerCase();
                return !q || (l.name || '').toLowerCase().includes(q) || (l.email || '').toLowerCase().includes(q);
              })
              .map(lead => (
                <div key={lead.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 6, cursor: 'pointer' }} onClick={() => enrollLead(lead.id, lead)}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{lead.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{lead.email}{lead.phone ? ` | ${lead.phone}` : ''}</div>
                  </div>
                  <span style={badgeStyle('var(--muted)')}>{lead.stage}</span>
                </div>
              ))}
            {pipelineLeads.length === 0 && <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: 20 }}>No leads found in your pipeline.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
