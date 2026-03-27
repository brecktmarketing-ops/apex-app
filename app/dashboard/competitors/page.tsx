'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface CompetitorData {
  landscape: string;
  competitors: { name: string; strategy: string; strengths: string; weaknesses: string }[];
  adPatterns: { formats: string; hooks: string; ctas: string };
  creativeGaps: string[];
  winningHooks: string[];
}

function stripDashes(text: string): string {
  return text.replace(/—/g, ', ').replace(/–/g, ', ');
}

function parseCompetitorResponse(raw: string): CompetitorData | null {
  try {
    const cleaned = stripDashes(raw);

    // Extract landscape
    const landscapeMatch = cleaned.match(/COMPETITIVE LANDSCAPE[:\s]*\n([\s\S]*?)(?=\n\s*(?:TOP|COMPETITOR|AD PATTERN|$))/i);
    const landscape = landscapeMatch?.[1]?.replace(/^[-*\d.]+\s*/gm, '').trim() || '';

    // Extract competitors
    const competitors: CompetitorData['competitors'] = [];
    const compSection = cleaned.match(/(?:TOP\s*(?:4|COMPETITORS)|COMPETITOR(?:S)?)[:\s]*\n([\s\S]*?)(?=\n\s*(?:AD\s*(?:CREATIVE|COPY)|CREATIVE\s*GAP|WINNING|$))/i);
    if (compSection) {
      const compBlocks = compSection[1].split(/\n(?=\d+\.\s|[A-Z][a-zA-Z\s&']+(?:\n|\s*[-,]))/);
      for (const block of compBlocks) {
        const nameMatch = block.match(/(?:\d+\.\s*)?([A-Z][a-zA-Z\s&'.]+?)(?:\n|[-,])/);
        if (!nameMatch) continue;
        const name = nameMatch[1].trim();
        if (name.length < 2 || name.length > 60) continue;
        const strategyMatch = block.match(/(?:strategy|approach)[:\s]*(.*?)(?:\n|$)/i);
        const strengthMatch = block.match(/(?:strength|strong|pros)[:\s]*(.*?)(?:\n|$)/i);
        const weakMatch = block.match(/(?:weakness|weak|cons|vulnerabilit)[:\s]*(.*?)(?:\n|$)/i);
        competitors.push({
          name,
          strategy: strategyMatch?.[1]?.trim() || 'See full analysis',
          strengths: strengthMatch?.[1]?.trim() || 'See full analysis',
          weaknesses: weakMatch?.[1]?.trim() || 'See full analysis',
        });
        if (competitors.length >= 4) break;
      }
    }

    // Extract ad patterns
    const adSection = cleaned.match(/(?:AD\s*(?:CREATIVE|COPY)\s*PATTERN|AD\s*PATTERN)[:\s]*\n([\s\S]*?)(?=\n\s*(?:CREATIVE\s*GAP|WINNING|$))/i);
    const adText = adSection?.[1] || '';
    const formatMatch = adText.match(/(?:format|type|creative)[:\s]*(.*?)(?:\n|$)/i);
    const hookMatch = adText.match(/(?:hook|headline|opening)[:\s]*(.*?)(?:\n|$)/i);
    const ctaMatch = adText.match(/(?:cta|call.to.action|action)[:\s]*(.*?)(?:\n|$)/i);

    // Extract creative gaps
    const gapSection = cleaned.match(/CREATIVE\s*GAP[:\s]*\n([\s\S]*?)(?=\n\s*(?:WINNING|$))/i);
    const gaps = gapSection?.[1]?.split('\n')
      .map(l => l.replace(/^[-*\d.)\s]+/, '').trim())
      .filter(l => l.length > 5)
      .slice(0, 5) || [];

    // Extract winning hooks
    const hookSection = cleaned.match(/WINNING\s*HOOK[:\s]*\n([\s\S]*?)$/i);
    const hooks = hookSection?.[1]?.split('\n')
      .map(l => l.replace(/^[-*\d.)""\s]+/, '').replace(/[""]$/g, '').trim())
      .filter(l => l.length > 5)
      .slice(0, 10) || [];

    return {
      landscape,
      competitors,
      adPatterns: {
        formats: formatMatch?.[1]?.trim() || adText.split('\n').filter(l => l.trim()).slice(0, 2).join('. ') || '',
        hooks: hookMatch?.[1]?.trim() || '',
        ctas: ctaMatch?.[1]?.trim() || '',
      },
      creativeGaps: gaps,
      winningHooks: hooks,
    };
  } catch {
    return null;
  }
}

export default function CompetitorsPage() {
  const [niche, setNiche] = useState('');
  const [detectedNiche, setDetectedNiche] = useState('');
  const [location, setLocation] = useState('US');
  const [competitorUrl, setCompetitorUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [deepLoading, setDeepLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(true);
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState<CompetitorData | null>(null);
  const [adLibraryUrl, setAdLibraryUrl] = useState('');
  const [campaignNames, setCampaignNames] = useState<string[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [manualOverride, setManualOverride] = useState(false);

  const activeNiche = manualOverride && niche.trim() ? niche.trim() : detectedNiche;

  const buildAdLibraryUrl = useCallback((query: string, loc: string) => {
    const searchQuery = encodeURIComponent(query);
    return `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${loc}&q=${searchQuery}&search_type=keyword_unordered`;
  }, []);

  const runAnalysis = useCallback(async (nicheText: string, campNames: string[], deep = false) => {
    if (!nicheText.trim()) return;
    if (deep) setDeepLoading(true); else setLoading(true);
    setRawText('');
    setParsed(null);

    const adUrl = buildAdLibraryUrl(nicheText, location);
    setAdLibraryUrl(adUrl);

    const depthInstructions = deep
      ? `This is a DEEP RESEARCH request. Be extremely thorough and specific. Include real brand names where possible, specific ad copy examples, exact hook formulas, and detailed competitive positioning analysis. Go deeper than surface-level.`
      : '';

    const campaignContext = campNames.length
      ? `\nThe user's active campaigns: ${campNames.join(', ')}`
      : '';

    try {
      const res = await fetch('/api/wanda/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Analyze competitors in this niche using the Meta Ad Library and give me actionable intelligence.

${depthInstructions}

Niche: ${nicheText}
Location: ${location}
Competitor website: ${competitorUrl || 'N/A'}
Meta Ad Library search: ${adUrl}${campaignContext}

Based on common patterns in the ${nicheText} niche, give me:

1. COMPETITIVE LANDSCAPE: 2-3 sentence overview of what the ad landscape looks like in this niche
2. TOP 4 COMPETITORS: For each, provide on separate labeled lines:
   Name: [competitor name]
   Strategy: [their ad strategy]
   Strengths: [what they do well]
   Weaknesses: [where they're vulnerable]
3. AD CREATIVE PATTERNS:
   Formats: [dominant formats like UGC, static, video, carousel]
   Hooks: [common hook patterns]
   CTAs: [common CTA styles]
4. CREATIVE GAPS: 5 creative angles or formats that are underused (opportunities to stand out), one per line
5. WINNING HOOKS: 10 hooks specifically designed to beat the current competition, one per line, numbered
${competitorUrl ? `6. COMPETITOR WEBSITE ANALYSIS: Based on ${competitorUrl}, what are they doing well and where are they weak in their funnel` : ''}

Be specific to the ${nicheText} niche. Reference real patterns. No generic advice.`,
        }),
      });

      const data = await res.json();
      if (data.error) {
        setRawText('Error: ' + data.error);
      } else {
        const clean = stripDashes(data.text || '');
        setRawText(clean);
        setParsed(parseCompetitorResponse(data.text || ''));
      }
    } catch (e: any) {
      setRawText('Failed to analyze: ' + (e.message || 'Unknown error'));
    }
    setLoading(false);
    setDeepLoading(false);
  }, [location, competitorUrl, buildAdLibraryUrl]);

  // Auto-detect niche from campaigns on mount
  useEffect(() => {
    let cancelled = false;
    async function detectNiche() {
      try {
        const supabase = createClient();
        const { data: campaigns } = await supabase
          .from('campaigns')
          .select('name, platform, status, spend')
          .order('spend', { ascending: false });

        if (cancelled) return;

        if (campaigns && campaigns.length > 0) {
          const names = campaigns.map(c => c.name);
          setCampaignNames(names);

          // Build niche string from campaign names
          const nicheKeywords = names
            .slice(0, 5)
            .map(n => n.replace(/[-_|]/g, ' ').replace(/\b(campaign|cbo|abo|ad set|adset|test|v\d+|round\s*\d+)\b/gi, '').trim())
            .filter(n => n.length > 2);

          const detected = nicheKeywords.length > 0
            ? nicheKeywords[0]
            : campaigns[0]?.name || '';

          if (detected && !cancelled) {
            setDetectedNiche(detected);
            setAdLibraryUrl(
              `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=${encodeURIComponent(detected)}&search_type=keyword_unordered`
            );
            setAutoLoading(false);
            // Auto-run initial analysis
            runAnalysis(detected, names);
          } else {
            setAutoLoading(false);
          }
        } else {
          setAutoLoading(false);
        }
      } catch {
        if (!cancelled) setAutoLoading(false);
      }
    }
    detectNiche();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function copyHook(hook: string, idx: number) {
    navigator.clipboard.writeText(hook);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  }

  const card: React.CSSProperties = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 };
  const lbl: React.CSSProperties = { fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 14 };
  const input: React.CSSProperties = { width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 10, fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'inherit' };
  const accentBtn: React.CSSProperties = { padding: '12px 0', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', width: '100%' };
  const tagStyle: React.CSSProperties = { display: 'inline-block', padding: '4px 10px', background: 'var(--accent)', borderRadius: 6, fontSize: 11, fontWeight: 600, color: '#fff', opacity: 0.85 };

  const isLoading = loading || deepLoading || autoLoading;

  // Loading skeleton
  if (autoLoading) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 1.2s infinite' }} />
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Detecting your niche from campaign data...</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ ...card, height: 120, opacity: 0.5 }}>
              <div style={{ width: '60%', height: 12, background: 'var(--border)', borderRadius: 4, marginBottom: 10 }} />
              <div style={{ width: '90%', height: 10, background: 'var(--border)', borderRadius: 4, marginBottom: 6 }} />
              <div style={{ width: '75%', height: 10, background: 'var(--border)', borderRadius: 4 }} />
            </div>
          ))}
        </div>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
      </div>
    );
  }

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Competitor Intelligence</h2>
            {detectedNiche && !manualOverride && (
              <span style={tagStyle}>Auto-detected</span>
            )}
          </div>
          {activeNiche && (
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
              Analyzing: <strong style={{ color: 'var(--text)' }}>{stripDashes(activeNiche)}</strong>
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {adLibraryUrl && (
            <a href={adLibraryUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '8px 16px', background: '#1877f218', border: '1px solid #1877f230', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#1877f2', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              Meta Ad Library
            </a>
          )}
          <button
            onClick={() => runAnalysis(activeNiche, campaignNames, true)}
            disabled={isLoading || !activeNiche}
            style={{ ...accentBtn, width: 'auto', padding: '8px 20px', fontSize: 12, opacity: isLoading ? 0.6 : 1 }}
          >
            {deepLoading ? 'Running Deep Research...' : 'Deep Research'}
          </button>
        </div>
      </div>

      {/* Manual override toggle */}
      <div style={{ ...card, padding: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={manualOverride}
            onChange={e => setManualOverride(e.target.checked)}
            style={{ accentColor: 'var(--accent)' }}
          />
          Manual niche override
        </label>
        {manualOverride && (
          <div style={{ display: 'flex', gap: 8, flex: 1 }}>
            <input
              value={niche}
              onChange={e => setNiche(e.target.value)}
              placeholder="e.g. Peptide ecom, Med spa, Home remodeling"
              style={{ ...input, flex: 1 }}
            />
            <select value={location} onChange={e => setLocation(e.target.value)} style={{ ...input, width: 140, cursor: 'pointer' }}>
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="GB">United Kingdom</option>
              <option value="AU">Australia</option>
              <option value="BR">Brazil</option>
              <option value="DE">Germany</option>
              <option value="FR">France</option>
              <option value="ALL">All Countries</option>
            </select>
            <input
              value={competitorUrl}
              onChange={e => setCompetitorUrl(e.target.value)}
              placeholder="competitor.com (optional)"
              style={{ ...input, width: 180 }}
            />
            <button
              onClick={() => runAnalysis(niche, campaignNames)}
              disabled={isLoading || !niche.trim()}
              style={{ ...accentBtn, width: 'auto', padding: '8px 20px', fontSize: 12, whiteSpace: 'nowrap', opacity: isLoading || !niche.trim() ? 0.6 : 1 }}
            >
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
        )}
      </div>

      {/* Loading state */}
      {(loading || deepLoading) && !parsed && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse 1.2s infinite' }} />
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
            {deepLoading ? 'Running deep competitor research...' : 'Wanda is analyzing your competitive landscape...'}
          </span>
          <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
        </div>
      )}

      {/* Results */}
      {parsed ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Row 1: Landscape */}
          {parsed.landscape && (
            <div style={card}>
              <p style={lbl}>Competitive Landscape</p>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)' }}>{stripDashes(parsed.landscape)}</p>
            </div>
          )}

          {/* Row 2: Top Competitors Grid */}
          {parsed.competitors.length > 0 && (
            <>
              <p style={{ ...lbl, marginBottom: 0 }}>Top Competitors</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                {parsed.competitors.map((comp, i) => (
                  <div key={i} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {i + 1}
                      </div>
                      <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{stripDashes(comp.name)}</h3>
                    </div>
                    <div>
                      <p style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Strategy</p>
                      <p style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>{stripDashes(comp.strategy)}</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div style={{ padding: '8px 10px', background: '#10b98110', border: '1px solid #10b98120', borderRadius: 8 }}>
                        <p style={{ fontSize: 9, color: '#10b981', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Strengths</p>
                        <p style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.4 }}>{stripDashes(comp.strengths)}</p>
                      </div>
                      <div style={{ padding: '8px 10px', background: '#ef444410', border: '1px solid #ef444420', borderRadius: 8 }}>
                        <p style={{ fontSize: 9, color: '#ef4444', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Weaknesses</p>
                        <p style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.4 }}>{stripDashes(comp.weaknesses)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Row 3: Ad Creative Patterns + Creative Gaps */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Ad Creative Patterns */}
            <div style={card}>
              <p style={lbl}>Ad Creative Patterns</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {parsed.adPatterns.formats && (
                  <div>
                    <p style={{ fontSize: 10, color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Formats</p>
                    <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{stripDashes(parsed.adPatterns.formats)}</p>
                  </div>
                )}
                {parsed.adPatterns.hooks && (
                  <div>
                    <p style={{ fontSize: 10, color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Hook Patterns</p>
                    <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{stripDashes(parsed.adPatterns.hooks)}</p>
                  </div>
                )}
                {parsed.adPatterns.ctas && (
                  <div>
                    <p style={{ fontSize: 10, color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>CTAs</p>
                    <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{stripDashes(parsed.adPatterns.ctas)}</p>
                  </div>
                )}
                {!parsed.adPatterns.formats && !parsed.adPatterns.hooks && !parsed.adPatterns.ctas && (
                  <p style={{ fontSize: 12, color: 'var(--muted)' }}>Pattern data included in full report below.</p>
                )}
              </div>
            </div>

            {/* Creative Gaps */}
            <div style={card}>
              <p style={lbl}>Creative Gaps (Opportunities)</p>
              {parsed.creativeGaps.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {parsed.creativeGaps.map((gap, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
                      <span style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>{stripDashes(gap)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>Gap analysis included in full report below.</p>
              )}
            </div>
          </div>

          {/* Row 4: Winning Hooks */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <p style={{ ...lbl, marginBottom: 0 }}>Winning Hooks</p>
              <button
                onClick={() => navigator.clipboard.writeText(parsed.winningHooks.join('\n'))}
                style={{ fontSize: 10, color: 'var(--muted)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Copy All
              </button>
            </div>
            {parsed.winningHooks.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {parsed.winningHooks.map((hook, i) => (
                  <div
                    key={i}
                    onClick={() => copyHook(hook, i)}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', transition: 'border-color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <span style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
                    <span style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5, flex: 1 }}>{stripDashes(hook)}</span>
                    <span style={{ fontSize: 9, color: copiedIdx === i ? 'var(--accent)' : 'var(--muted)', flexShrink: 0, marginTop: 2 }}>
                      {copiedIdx === i ? 'Copied!' : 'Click to copy'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>Hooks included in full report below.</p>
            )}
          </div>

          {/* Full Report (collapsible fallback) */}
          <details style={card}>
            <summary style={{ ...lbl, cursor: 'pointer', marginBottom: 0, userSelect: 'none' }}>Full Report (Raw Text)</summary>
            <div style={{ marginTop: 14, fontSize: 13, lineHeight: 1.7, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{rawText}</div>
          </details>
        </div>
      ) : rawText && !loading && !deepLoading ? (
        // Fallback: couldn't parse, show raw
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <p style={{ ...lbl, marginBottom: 0 }}>Intelligence Report</p>
            <button onClick={() => navigator.clipboard.writeText(rawText)} style={{ fontSize: 10, color: 'var(--muted)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>Copy All</button>
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{rawText}</div>
        </div>
      ) : !loading && !deepLoading && !activeNiche ? (
        // No campaigns, no niche
        <div style={{ ...card, textAlign: 'center', padding: '80px 24px' }}>
          <div style={{ fontSize: 32, marginBottom: 12, color: 'var(--muted)' }}>+</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>No Campaign Data Found</h3>
          <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 400, margin: '0 auto', marginBottom: 16 }}>
            Connect your ad accounts or use the manual override above to enter your niche and get competitor intelligence.
          </p>
          <button
            onClick={() => setManualOverride(true)}
            style={{ ...accentBtn, width: 'auto', padding: '10px 24px', display: 'inline-block' }}
          >
            Enter Niche Manually
          </button>
        </div>
      ) : null}
    </div>
  );
}
