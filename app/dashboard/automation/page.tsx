'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Sequence {
  id: string;
  name: string;
  description: string;
  trigger_type: string;
  status: string;
  created_at: string;
  steps?: Step[];
}

interface Step {
  id: string;
  step_order: number;
  step_type: string;
  subject: string | null;
  body: string | null;
  delay_hours: number | null;
}

export default function AutomationPage() {
  const supabase = createClient();
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<{ name: string; description: string; trigger: string; steps: { type: string; subject?: string; body?: string; delay?: number }[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedSeq, setExpandedSeq] = useState<string | null>(null);

  useEffect(() => { loadSequences(); }, []);

  async function loadSequences() {
    const { data } = await supabase.from('sequences').select('*').order('created_at', { ascending: false });
    if (data) {
      for (const seq of data) {
        const { data: steps } = await supabase.from('sequence_steps').select('*').eq('sequence_id', seq.id).order('step_order');
        seq.steps = steps || [];
      }
    }
    setSequences(data || []);
    setLoading(false);
  }

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
  "trigger": "pipeline_stage|tag_added|manual|no_reply|no_purchase",
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
      if (data.error) {
        alert('Error: ' + data.error);
      } else {
        const jsonMatch = data.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setPreview(parsed);
        }
      }
    } catch (e: any) {
      alert('Failed to generate: ' + (e.message || 'Unknown error'));
    }
    setGenerating(false);
  }

  async function saveSequence() {
    if (!preview) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: seq } = await supabase.from('sequences').insert({
      user_id: user.id,
      name: preview.name,
      description: preview.description,
      trigger_type: preview.trigger || 'manual',
      status: 'draft',
    }).select('id').single();

    if (seq) {
      const steps = preview.steps.map((s, i) => ({
        sequence_id: seq.id,
        user_id: user.id,
        step_order: i + 1,
        step_type: s.type,
        subject: s.subject || null,
        body: s.body || null,
        delay_hours: s.delay || null,
      }));
      await supabase.from('sequence_steps').insert(steps);
    }

    setPreview(null);
    setPrompt('');
    setSaving(false);
    loadSequences();
  }

  async function toggleSequence(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    await supabase.from('sequences').update({ status: newStatus }).eq('id', id);
    setSequences(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
  }

  async function deleteSequence(id: string) {
    await supabase.from('sequence_steps').delete().eq('sequence_id', id);
    await supabase.from('sequences').delete().eq('id', id);
    setSequences(prev => prev.filter(s => s.id !== id));
  }

  const card = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 };

  const stepIcon = (type: string) => type === 'email' ? 'E' : type === 'sms' ? 'S' : type === 'delay' ? 'D' : '?';
  const stepColor = (type: string) => type === 'email' ? '#3b82f6' : type === 'sms' ? '#10b981' : type === 'delay' ? '#94a3b8' : '#fbbf24';

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
        {/* LEFT: Create */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={card}>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 14 }}>Create Automation</div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Tell Wanda what you want and she'll build the entire sequence — emails, texts, timing, everything.</p>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="e.g. Set up a follow-up sequence for new leads — email day 1, text day 3, email day 5 if no reply"
              rows={4}
              style={{ width: '100%', padding: '12px 14px', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 10, fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.5 }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {[
                'Follow up sequence for new leads',
                'Re-engage customers who haven\'t ordered in 30 days',
                'Welcome sequence for new signups',
                'Appointment reminder — text 24h before, email 1h before',
                'Win-back sequence for lost deals',
              ].map(q => (
                <button key={q} onClick={() => setPrompt(q)} style={{ padding: '5px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 10, color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit' }}>{q}</button>
              ))}
            </div>
            <button onClick={generateSequence} disabled={generating || !prompt.trim()} style={{ width: '100%', padding: '12px 0', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: generating ? 0.6 : 1, marginTop: 14 }}>
              {generating ? 'Wanda is building your sequence...' : 'Generate with Wanda'}
            </button>
          </div>

          {/* Preview */}
          {preview && (
            <div style={{ ...card, border: '1px solid var(--accent-glow)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Preview</div>
                <span style={{ fontSize: 10, color: 'var(--muted)', background: 'var(--bg)', padding: '3px 8px', borderRadius: 6 }}>Trigger: {preview.trigger}</span>
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{preview.name}</h3>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>{preview.description}</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {preview.steps.map((s, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${stepColor(s.type)}18`, border: `1px solid ${stepColor(s.type)}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{stepIcon(s.type)}</div>
                        {i < preview.steps.length - 1 && <div style={{ width: 2, height: 24, background: 'var(--border2)' }} />}
                      </div>
                      <div style={{ flex: 1, paddingBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: stepColor(s.type), textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                          {s.type === 'delay' ? `Wait ${s.delay}h` : s.type}
                        </div>
                        {s.subject && <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{s.subject}</div>}
                        {s.body && <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{s.body}</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button onClick={() => setPreview(null)} style={{ flex: 1, padding: '10px 0', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--muted)', fontFamily: 'inherit' }}>Discard</button>
                <button onClick={saveSequence} disabled={saving} style={{ flex: 2, padding: '10px 0', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : 'Save & Activate'}</button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Active Sequences */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={card}>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 14 }}>Your Sequences</div>

            {!loading && sequences.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>+</div>
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>No sequences yet. Tell Wanda what you want and she'll build it.</p>
              </div>
            )}

            {sequences.map(seq => (
              <div key={seq.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setExpandedSeq(expandedSeq === seq.id ? null : seq.id)}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{seq.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{seq.description}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6, color: seq.status === 'active' ? 'var(--green)' : seq.status === 'paused' ? 'var(--yellow)' : 'var(--muted)', background: seq.status === 'active' ? 'var(--green-dim)' : 'var(--card2)', textTransform: 'capitalize' }}>{seq.status}</span>
                    <div
                      onClick={() => toggleSequence(seq.id, seq.status)}
                      style={{ width: 38, height: 22, borderRadius: 11, cursor: 'pointer', position: 'relative', background: seq.status === 'active' ? 'var(--green-dim)' : 'var(--red-dim)', border: seq.status === 'active' ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(220,38,38,0.2)' }}>
                      <div style={{ position: 'absolute', top: 3, width: 14, height: 14, borderRadius: '50%', background: seq.status === 'active' ? 'var(--green)' : 'var(--red)', transition: 'all 0.2s', ...(seq.status === 'active' ? { right: 3 } : { left: 3 }) }} />
                    </div>
                    <button onClick={() => deleteSequence(seq.id)} style={{ fontSize: 10, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
                  </div>
                </div>

                {expandedSeq === seq.id && seq.steps && seq.steps.length > 0 && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                    {seq.steps.map((step, i) => (
                      <div key={step.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: `${stepColor(step.step_type)}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>{stepIcon(step.step_type)}</div>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: stepColor(step.step_type), textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            {step.step_type === 'delay' ? `Wait ${step.delay_hours}h` : `Step ${step.step_order}: ${step.step_type}`}
                          </div>
                          {step.subject && <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2 }}>{step.subject}</div>}
                          {step.body && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1, lineHeight: 1.4 }}>{step.body}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>Loading...</div>}
          </div>

          {/* Stats */}
          <div style={card}>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 14 }}>Automation Stats</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Active Sequences', value: sequences.filter(s => s.status === 'active').length.toString(), color: 'var(--accent)' },
                { label: 'Total Sequences', value: sequences.length.toString(), color: '#6366f1' },
                { label: 'Emails Sent', value: '0', color: '#3b82f6' },
                { label: 'SMS Sent', value: '0', color: '#10b981' },
              ].map((s, i) => (
                <div key={i} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
