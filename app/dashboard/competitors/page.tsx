'use client';

import { useState } from 'react';

export default function CompetitorsPage() {
  const [niche, setNiche] = useState('');
  const [location, setLocation] = useState('US');
  const [competitorUrl, setCompetitorUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [rawText, setRawText] = useState('');
  const [adLibraryUrl, setAdLibraryUrl] = useState('');

  async function analyze() {
    if (!niche.trim()) return;
    setLoading(true);
    setRawText('');

    // Build Meta Ad Library URL
    const searchQuery = encodeURIComponent(niche);
    const adUrl = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${location}&q=${searchQuery}&search_type=keyword_unordered`;
    setAdLibraryUrl(adUrl);

    try {
      const res = await fetch('/api/wanda/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Analyze competitors in this niche using the Meta Ad Library and give me actionable intelligence.

Niche: ${niche}
Location: ${location}
Competitor website: ${competitorUrl || 'N/A'}
Meta Ad Library search: ${adUrl}

Based on common patterns in the ${niche} niche, give me:

1. COMPETITIVE LANDSCAPE: 2-3 sentence overview of what the ad landscape looks like in this niche
2. TOP AD PATTERNS: What types of ads dominate this niche (UGC, static, video, carousel), what hooks work, what CTAs convert
3. TOP 4 LIKELY COMPETITORS: Based on the niche, name 4 businesses likely running ads, their probable strategy, strengths, and weaknesses
4. AD COPY PATTERNS: The most common headline formulas, body copy structures, and CTA styles in this niche
5. CREATIVE GAPS: 5 creative angles or formats that are underused in this niche (opportunities to stand out)
6. WINNING HOOKS: 10 hooks specifically designed to beat the current competition in this niche
${competitorUrl ? `7. COMPETITOR WEBSITE ANALYSIS: Based on ${competitorUrl}, what are they doing well and where are they weak in their funnel` : ''}

Be specific to the ${niche} niche. Reference real patterns. No generic advice.`,
        }),
      });

      const data = await res.json();
      if (data.error) {
        setRawText('Error: ' + data.error);
      } else {
        setRawText(data.text);
      }
    } catch (e: any) {
      setRawText('Failed to analyze: ' + (e.message || 'Unknown error'));
    }
    setLoading(false);
  }

  const card = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 };
  const lbl = { fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontWeight: 700, marginBottom: 14 };
  const input = { width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 10, fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'inherit' };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16, alignItems: 'start' }}>
        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={card}>
            <p style={lbl}>Competitor Intelligence</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Niche / Industry</label>
                <input value={niche} onChange={e => setNiche(e.target.value)} placeholder="e.g. Peptide ecom, Med spa, Home remodeling" style={input} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Country</label>
                <select value={location} onChange={e => setLocation(e.target.value)} style={{ ...input, cursor: 'pointer' }}>
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="GB">United Kingdom</option>
                  <option value="AU">Australia</option>
                  <option value="BR">Brazil</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                  <option value="ALL">All Countries</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Competitor Website (optional)</label>
                <input value={competitorUrl} onChange={e => setCompetitorUrl(e.target.value)} placeholder="e.g. competitor.com" style={input} />
              </div>
              <button onClick={analyze} disabled={loading || !niche.trim()} style={{ padding: '12px 0', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: loading ? 0.6 : 1, marginTop: 4 }}>
                {loading ? 'Analyzing...' : 'Analyze Competitors'}
              </button>
            </div>
          </div>

          {/* Ad Library Link */}
          {adLibraryUrl && (
            <div style={card}>
              <p style={lbl}>Meta Ad Library</p>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>View all active ads in your niche directly on Meta's Ad Library.</p>
              <a href={adLibraryUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block', padding: '10px 0', background: '#1877f218', border: '1px solid #1877f230', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#1877f2', textAlign: 'center', textDecoration: 'none' }}>
                Open Ad Library for "{niche}"
              </a>
            </div>
          )}

          <div style={card}>
            <p style={lbl}>What You Get</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                'Meta Ad Library search link for your niche',
                'Top ad patterns and creative formats dominating your space',
                'Competitor breakdown with strengths and weaknesses',
                'Ad copy formulas and CTA styles that convert',
                'Creative gaps you can exploit to stand out',
                '10 winning hooks to beat the competition',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ color: 'var(--accent)', fontSize: 12, marginTop: 1 }}>+</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div>
          {rawText ? (
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <p style={{ ...lbl, marginBottom: 0 }}>Intelligence Report</p>
                <button onClick={() => navigator.clipboard.writeText(rawText)} style={{ fontSize: 10, color: 'var(--muted)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>Copy All</button>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{rawText}</div>
            </div>
          ) : (
            <div style={{ ...card, textAlign: 'center', padding: '80px 24px' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>+</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Competitor Intelligence</h3>
              <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 400, margin: '0 auto' }}>Enter your niche and Wanda will pull competitive intelligence from the Meta Ad Library and give you winning hooks to outperform them.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
