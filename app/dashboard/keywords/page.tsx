'use client';

import { useState } from 'react';

interface KeywordData {
  keyword: string;
  volume: string;
  difficulty: string;
  intent: string;
  cpc: string;
  opportunity: string;
}

interface LongTail {
  keyword: string;
  intent: string;
  opportunity: string;
}

interface ContentIdea {
  title: string;
  target_keyword: string;
  type: string;
}

interface KeywordResult {
  seed: string;
  keywords: KeywordData[];
  long_tail: LongTail[];
  questions: string[];
  content_ideas: ContentIdea[];
}

const difficultyColors: Record<string, string> = {
  low: '#34d399',
  medium: '#fbbf24',
  high: '#f87171',
};

const intentColors: Record<string, string> = {
  transactional: '#34d399',
  commercial: '#3b82f6',
  informational: '#fbbf24',
  navigational: '#9ca3af',
};

export default function KeywordsPage() {
  const [keyword, setKeyword] = useState('');
  const [business, setBusiness] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<KeywordResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function research() {
    if (!keyword.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/seo/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed_keyword: keyword, business }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'No results returned. Try a different keyword.');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to connect. Check your internet and try again.');
    }
    setLoading(false);
  }

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px' };

  if (!result) {
    return (
      <div style={{ maxWidth: 600, margin: '40px auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>K</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Keyword Research</h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>
            Enter a seed keyword and Wanda generates keyword ideas with volume, difficulty, intent, and content opportunities.
          </p>
        </div>

        <div style={card}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 8 }}>Seed Keyword</label>
            <input
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && research()}
              placeholder="e.g. peptides, roofing, dental implants"
              style={{
                width: '100%', padding: '14px 16px', background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 12, fontSize: 15, color: 'var(--text)', outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 8 }}>
              Business/Niche <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span>
            </label>
            <input
              value={business}
              onChange={e => setBusiness(e.target.value)}
              placeholder="e.g. ecom peptide store, local roofing company"
              style={{
                width: '100%', padding: '14px 16px', background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 12, fontSize: 14, color: 'var(--text)', outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>
          <button
            onClick={research}
            disabled={loading || !keyword.trim()}
            style={{
              width: '100%', padding: '14px', borderRadius: 12, border: 'none',
              background: keyword.trim() ? 'var(--accent)' : 'var(--border)',
              color: '#fff', fontSize: 15, fontWeight: 700, cursor: keyword.trim() ? 'pointer' : 'default',
              fontFamily: 'inherit', opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Researching...' : 'Find Keywords'}
          </button>
          {error && (
            <div style={{
              marginTop: 12, padding: '12px 16px', borderRadius: 10,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171', fontSize: 13, lineHeight: 1.5,
            }}>
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>Keywords: "{result.seed}"</h2>
          <p style={{ fontSize: 12, color: 'var(--muted)' }}>{result.keywords.length} keywords, {result.long_tail.length} long-tail, {result.questions.length} questions</p>
        </div>
        <button onClick={() => { setResult(null); setKeyword(''); }} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          New Research
        </button>
      </div>

      {/* Main Keywords Table */}
      <div style={{ ...card, marginBottom: 16, overflowX: 'auto' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 0.5, marginBottom: 14, textTransform: 'uppercase' }}>
          Keyword Ideas ({result.keywords.length})
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--muted)', fontWeight: 600, fontSize: 11 }}>Keyword</th>
              <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--muted)', fontWeight: 600, fontSize: 11 }}>Volume</th>
              <th style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--muted)', fontWeight: 600, fontSize: 11 }}>Difficulty</th>
              <th style={{ textAlign: 'center', padding: '8px 12px', color: 'var(--muted)', fontWeight: 600, fontSize: 11 }}>Intent</th>
              <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--muted)', fontWeight: 600, fontSize: 11 }}>CPC</th>
              <th style={{ padding: '8px 12px' }}></th>
            </tr>
          </thead>
          <tbody>
            {result.keywords.map((kw, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 12px', color: 'var(--text)', fontWeight: 500 }}>{kw.keyword}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text)' }}>{kw.volume}</td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, color: difficultyColors[kw.difficulty] || '#9ca3af', background: `${difficultyColors[kw.difficulty] || '#9ca3af'}15`, textTransform: 'uppercase' }}>{kw.difficulty}</span>
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6, color: intentColors[kw.intent] || '#9ca3af', background: `${intentColors[kw.intent] || '#9ca3af'}15` }}>{kw.intent}</span>
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--muted)' }}>{kw.cpc}</td>
                <td style={{ padding: '10px 12px' }}>
                  <button onClick={() => copy(kw.keyword, `kw-${i}`)} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)', background: copied === `kw-${i}` ? 'var(--accent)' : 'var(--bg)', color: copied === `kw-${i}` ? '#fff' : 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {copied === `kw-${i}` ? 'Copied' : 'Copy'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Long Tail + Questions side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 0.5, marginBottom: 14, textTransform: 'uppercase' }}>
            Long-Tail Keywords ({result.long_tail.length})
          </div>
          {result.long_tail.map((lt, i) => (
            <div key={i} style={{ padding: '8px 0', borderBottom: i < result.long_tail.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text)' }}>{lt.keyword}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{lt.opportunity}</div>
              </div>
              <button onClick={() => copy(lt.keyword, `lt-${i}`)} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)', background: copied === `lt-${i}` ? 'var(--accent)' : 'var(--bg)', color: copied === `lt-${i}` ? '#fff' : 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                {copied === `lt-${i}` ? 'Copied' : 'Copy'}
              </button>
            </div>
          ))}
        </div>

        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 0.5, marginBottom: 14, textTransform: 'uppercase' }}>
            People Also Ask ({result.questions.length})
          </div>
          {result.questions.map((q, i) => (
            <div key={i} style={{ padding: '8px 0', borderBottom: i < result.questions.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, color: 'var(--text)' }}>{q}</div>
              <button onClick={() => copy(q, `q-${i}`)} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)', background: copied === `q-${i}` ? 'var(--accent)' : 'var(--bg)', color: copied === `q-${i}` ? '#fff' : 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                {copied === `q-${i}` ? 'Copied' : 'Copy'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Content Ideas */}
      <div style={card}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 0.5, marginBottom: 14, textTransform: 'uppercase' }}>
          Content Ideas ({result.content_ideas.length})
        </div>
        {result.content_ideas.map((idea, i) => (
          <div key={i} style={{ padding: '12px 0', borderBottom: i < result.content_ideas.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{idea.title}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: 'var(--accent-dim)', color: 'var(--accent)' }}>{idea.target_keyword}</span>
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: 'var(--bg)', color: 'var(--muted)', textTransform: 'capitalize' }}>{idea.type.replace('_', ' ')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
