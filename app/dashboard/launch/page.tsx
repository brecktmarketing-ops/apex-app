'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LaunchPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [campaignName, setCampaignName] = useState('');
  const [platform, setPlatform] = useState('meta');
  const [business, setBusiness] = useState('');
  const [goal, setGoal] = useState('');
  const [budget, setBudget] = useState('');
  const [website, setWebsite] = useState('');
  const [launching, setLaunching] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  async function launch() {
    setLaunching(true);
    setError('');
    try {
      const goalMap: Record<string, string> = {
        leads: 'Get leads (calls, forms, signups)',
        sales: 'Get online sales and purchases',
        traffic: 'Drive website traffic',
      };
      const res = await fetch('/api/ads/smart-launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business, goal: goalMap[goal] || goal, budget, website, campaign_name: campaignName, platform }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
        setStep(5);
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    }
    setLaunching(false);
  }

  const input = { width: '100%', padding: '14px 18px', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 12, fontSize: 15, color: 'var(--text)', outline: 'none', fontFamily: 'inherit' };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', paddingTop: 20 }}>
      {/* Progress */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 40 }}>
        {['Setup', 'Business', 'Goal', 'Budget', 'Website', 'Done'].map((s, i) => (
          <div key={i} style={{ flex: 1 }}>
            <div style={{ height: 4, borderRadius: 2, background: i <= step ? 'var(--accent)' : 'var(--border2)', transition: 'background 0.3s' }} />
          </div>
        ))}
      </div>

      {/* STEP 0: Name + Platform */}
      {step === 0 && (
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, marginBottom: 8 }}>Name your campaign</h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>Give it a name and pick which platform to run on.</p>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 6 }}>Campaign Name</label>
            <input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="e.g. Spring Lead Gen, Summer Sale Push" style={input} autoFocus />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 8 }}>Platform</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { value: 'meta', label: 'Meta Ads', desc: 'Facebook + Instagram', color: '#1877F2' },
                { value: 'google', label: 'Google Ads', desc: 'Search + Display + YouTube', color: '#EA4335' },
                { value: 'tiktok', label: 'TikTok Ads', desc: 'TikTok feed + For You page', color: '#fe2c55' },
              ].map(p => (
                <button key={p.value} onClick={() => setPlatform(p.value)} style={{
                  flex: 1, padding: '16px 16px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
                  background: platform === p.value ? `${p.color}10` : 'var(--card)',
                  border: platform === p.value ? `2px solid ${p.color}` : '1px solid var(--border)',
                  transition: 'all 0.15s',
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: platform === p.value ? p.color : 'var(--text)' }}>{p.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{p.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => { if (campaignName.trim()) setStep(1); }} disabled={!campaignName.trim()} style={{ width: '100%', padding: '14px 0', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginTop: 24, opacity: campaignName.trim() ? 1 : 0.4 }}>
            Next
          </button>
        </div>
      )}


      {/* STEP 1: Business */}
      {step === 1 && (
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, marginBottom: 8 }}>What does your business do?</h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 28 }}>Describe what you sell or what service you offer.</p>
          <input value={business} onChange={e => setBusiness(e.target.value)} placeholder="e.g. We sell research peptides online, We run a med spa in Dallas" style={input} autoFocus />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
            {['Online peptide store', 'Med spa', 'Home remodeling', 'Fitness coaching', 'E-commerce brand', 'Law firm'].map(s => (
              <button key={s} onClick={() => setBusiness(s)} style={{ padding: '6px 12px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit' }}>{s}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button onClick={() => setStep(0)} style={{ padding: '14px 24px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--muted)', fontFamily: 'inherit' }}>Back</button>
            <button onClick={() => { if (business.trim()) setStep(2); }} disabled={!business.trim()} style={{ flex: 1, padding: '14px 0', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: business.trim() ? 1 : 0.4 }}>Next</button>
          </div>
        </div>
      )}

      {/* STEP 2: Goal */}
      {step === 2 && (
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, marginBottom: 8 }}>What's your goal?</h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 28 }}>What do you want from this campaign?</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { value: 'leads', label: 'Get Leads', desc: 'Phone calls, form submissions, booked appointments' },
              { value: 'sales', label: 'Get Sales', desc: 'Online purchases, add to cart, checkout completions' },
              { value: 'traffic', label: 'Get Traffic', desc: 'More people visiting your website' },
            ].map(g => (
              <button key={g.value} onClick={() => { setGoal(g.value); setStep(3); }} style={{
                padding: '20px 24px', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                background: goal === g.value ? 'var(--accent-dim)' : 'var(--card)',
                border: goal === g.value ? '2px solid var(--accent)' : '1px solid var(--border)',
                transition: 'all 0.15s',
              }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{g.label}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{g.desc}</div>
              </button>
            ))}
          </div>
          <button onClick={() => setStep(1)} style={{ width: '100%', padding: '12px 0', background: 'none', border: 'none', fontSize: 13, color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit', marginTop: 16 }}>Back</button>
        </div>
      )}

      {/* STEP 3: Budget */}
      {step === 3 && (
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, marginBottom: 8 }}>Daily budget?</h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 28 }}>How much do you want to spend per day? You can change this anytime.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {[
              { value: '25', label: '$25/day', desc: 'Testing' },
              { value: '50', label: '$50/day', desc: 'Getting started' },
              { value: '100', label: '$100/day', desc: 'Scaling' },
              { value: '250', label: '$250/day', desc: 'Aggressive growth' },
            ].map(b => (
              <button key={b.value} onClick={() => { setBudget(b.value); setStep(4); }} style={{
                padding: '20px 20px', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
                background: budget === b.value ? 'var(--accent-dim)' : 'var(--card)',
                border: budget === b.value ? '2px solid var(--accent)' : '1px solid var(--border)',
                transition: 'all 0.15s',
              }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: -0.5 }}>{b.label}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{b.desc}</div>
              </button>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <input value={!['25','50','100','250'].includes(budget) ? budget : ''} onChange={e => setBudget(e.target.value)} placeholder="Or type a custom amount" style={{ ...input, textAlign: 'center' }} />
            {budget && !['25','50','100','250'].includes(budget) && (
              <button onClick={() => setStep(4)} style={{ width: '100%', padding: '14px 0', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginTop: 10 }}>Next</button>
            )}
          </div>
          <button onClick={() => setStep(2)} style={{ width: '100%', padding: '12px 0', background: 'none', border: 'none', fontSize: 13, color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit', marginTop: 12 }}>Back</button>
        </div>
      )}

      {/* STEP 4: Website + Launch */}
      {step === 4 && (
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, marginBottom: 8 }}>Drop your website</h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 28 }}>Where should people go when they click your ad?</p>
          <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yoursite.com" style={input} autoFocus />

          {/* Summary */}
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginTop: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Campaign Summary</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: 'var(--muted)' }}>Business</span><span style={{ fontSize: 13, fontWeight: 600 }}>{business}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: 'var(--muted)' }}>Goal</span><span style={{ fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>{goal === 'leads' ? 'Get Leads' : goal === 'sales' ? 'Get Sales' : 'Get Traffic'}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: 'var(--muted)' }}>Budget</span><span style={{ fontSize: 13, fontWeight: 600 }}>${budget}/day</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: 'var(--muted)' }}>Website</span><span style={{ fontSize: 13, fontWeight: 600 }}>{website || 'Not set'}</span></div>
            </div>
          </div>

          {error && <div style={{ padding: '10px 14px', background: 'var(--red-dim)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10, fontSize: 13, color: 'var(--red)', marginTop: 12 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button onClick={() => setStep(3)} style={{ padding: '14px 24px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--muted)', fontFamily: 'inherit' }}>Back</button>
            <button onClick={launch} disabled={launching} style={{ flex: 1, padding: '14px 0', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: launching ? 0.6 : 1 }}>
              {launching ? 'Wanda is building your campaign...' : 'Launch with Wanda'}
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 10 }}>Wanda writes the copy, picks the audience, and sets everything up. Launches paused so you can review first.</div>
        </div>
      )}

      {/* STEP 5: Success */}
      {step === 5 && result && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>+</div>
          <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, marginBottom: 8 }}>Campaign Created</h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 28 }}>{result.message}</p>

          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, textAlign: 'left', marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>What Wanda Built</div>
            {result.strategy && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: 'var(--muted)' }}>Campaign</span><span style={{ fontSize: 13, fontWeight: 600 }}>{result.strategy.campaign_name}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: 'var(--muted)' }}>Targeting</span><span style={{ fontSize: 13, fontWeight: 600 }}>{result.strategy.genders === 'all' ? 'Everyone' : result.strategy.genders} {result.strategy.age_min}-{result.strategy.age_max}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: 'var(--muted)' }}>Headline</span><span style={{ fontSize: 13, fontWeight: 600 }}>{result.strategy.headline}</span></div>
                <div><span style={{ fontSize: 13, color: 'var(--muted)' }}>Ad Copy</span><p style={{ fontSize: 13, fontWeight: 500, marginTop: 4, lineHeight: 1.5 }}>{result.strategy.body}</p></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 13, color: 'var(--muted)' }}>CTA</span><span style={{ fontSize: 13, fontWeight: 600 }}>{result.strategy.cta?.replace(/_/g, ' ')}</span></div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => router.push('/dashboard')} style={{ flex: 1, padding: '14px 0', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>View Campaigns</button>
            <button onClick={() => { setStep(0); setBusiness(''); setGoal(''); setBudget(''); setWebsite(''); setResult(null); }} style={{ padding: '14px 24px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--muted)', fontFamily: 'inherit' }}>Launch Another</button>
          </div>
        </div>
      )}
    </div>
  );
}
