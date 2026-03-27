'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const STEPS = ['Welcome', 'Business Info', 'Connect Ads', 'Quick Tour', 'Ready'];

export default function OnboardingPage() {
  const supabase = createClient();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Business info
  const [companyName, setCompanyName] = useState('');
  const [businessType, setBusinessType] = useState('ecom');
  const [website, setWebsite] = useState('');
  const [monthlySpend, setMonthlySpend] = useState('');

  // Ad connections
  const [metaToken, setMetaToken] = useState('');
  const [metaAccountId, setMetaAccountId] = useState('');
  const [googleToken, setGoogleToken] = useState('');
  const [googleAccountId, setGoogleAccountId] = useState('');
  const [tiktokToken, setTiktokToken] = useState('');
  const [tiktokAccountId, setTiktokAccountId] = useState('');

  async function saveBusinessInfo() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({
        company_name: companyName,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id);
    }
    setSaving(false);
    setStep(2);
  }

  async function saveConnections() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const connections = [];
    if (metaToken) connections.push({ user_id: user.id, platform: 'meta', access_token: metaToken, account_id: metaAccountId || null, account_name: 'Meta Ads', status: 'active' });
    if (googleToken) connections.push({ user_id: user.id, platform: 'google', access_token: googleToken, account_id: googleAccountId || null, account_name: 'Google Ads', status: 'active' });
    if (tiktokToken) connections.push({ user_id: user.id, platform: 'tiktok', access_token: tiktokToken, account_id: tiktokAccountId || null, account_name: 'TikTok Ads', status: 'active' });

    if (connections.length > 0) {
      await supabase.from('ad_connections').upsert(connections, { onConflict: 'user_id,platform,account_id' });
    }
    setSaving(false);
    setStep(3);
  }

  async function finishOnboarding() {
    router.push('/dashboard');
  }

  const card = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 };
  const input = { width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 10, fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'inherit' };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* Progress bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ height: 4, borderRadius: 2, background: i <= step ? 'var(--accent)' : 'var(--border2)', transition: 'background 0.3s' }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: i <= step ? 'var(--accent)' : 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s}</span>
          </div>
        ))}
      </div>

      {/* STEP 0: Welcome */}
      {step === 0 && (
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 24, color: '#fff', margin: '0 auto 20px' }}>A</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, letterSpacing: -0.5 }}>Welcome to APEX</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>Let's get your account set up. This takes about 2 minutes. We'll connect your ad accounts and show you around the dashboard.</p>
          <button onClick={() => setStep(1)} style={{ padding: '12px 32px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Let's Go</button>
        </div>
      )}

      {/* STEP 1: Business Info */}
      {step === 1 && (
        <div style={card}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4, letterSpacing: -0.3 }}>Tell us about your business</h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>This helps APEX and Wanda AI give you better recommendations.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Company Name</label>
              <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Your business name" style={input} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Business Type</label>
              <select value={businessType} onChange={e => setBusinessType(e.target.value)} style={{ ...input, cursor: 'pointer' }}>
                <option value="ecom">E-Commerce</option>
                <option value="leadgen">Lead Generation</option>
                <option value="saas">SaaS</option>
                <option value="local">Local Business</option>
                <option value="agency">Agency</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Website (optional)</label>
              <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="yoursite.com" style={input} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Monthly Ad Spend</label>
              <select value={monthlySpend} onChange={e => setMonthlySpend(e.target.value)} style={{ ...input, cursor: 'pointer' }}>
                <option value="">Select range</option>
                <option value="0-1k">$0 - $1,000</option>
                <option value="1k-5k">$1,000 - $5,000</option>
                <option value="5k-20k">$5,000 - $20,000</option>
                <option value="20k-50k">$20,000 - $50,000</option>
                <option value="50k+">$50,000+</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button onClick={() => setStep(0)} style={{ flex: 1, padding: '11px 0', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--muted)', fontFamily: 'inherit' }}>Back</button>
              <button onClick={saveBusinessInfo} disabled={saving} style={{ flex: 2, padding: '11px 0', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : 'Continue'}</button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Connect Ad Accounts */}
      {step === 2 && (
        <div style={card}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4, letterSpacing: -0.3 }}>Connect your ad accounts</h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>Paste your API tokens so APEX can pull your campaign data. You can skip this and add them later in Settings.</p>

          {/* Meta */}
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: '#1877f218', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#1877f2' }}>f</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Meta Ads</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Facebook + Instagram campaigns</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={metaAccountId} onChange={e => setMetaAccountId(e.target.value)} placeholder="Account ID (act_123...)" style={{ ...input, flex: 1 }} />
              <input value={metaToken} onChange={e => setMetaToken(e.target.value)} placeholder="Access token" type="password" style={{ ...input, flex: 2 }} />
            </div>
          </div>

          {/* Google */}
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: '#ea433518', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#ea4335' }}>G</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Google Ads</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>Search, PMax, Display, YouTube</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={googleAccountId} onChange={e => setGoogleAccountId(e.target.value)} placeholder="Customer ID (123-456-7890)" style={{ ...input, flex: 1 }} />
              <input value={googleToken} onChange={e => setGoogleToken(e.target.value)} placeholder="Access token" type="password" style={{ ...input, flex: 2 }} />
            </div>
          </div>

          {/* TikTok */}
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: '#fe2c5518', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fe2c55' }}>T</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>TikTok Ads</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>TikTok campaign management</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={tiktokAccountId} onChange={e => setTiktokAccountId(e.target.value)} placeholder="Advertiser ID" style={{ ...input, flex: 1 }} />
              <input value={tiktokToken} onChange={e => setTiktokToken(e.target.value)} placeholder="Access token" type="password" style={{ ...input, flex: 2 }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep(1)} style={{ flex: 1, padding: '11px 0', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--muted)', fontFamily: 'inherit' }}>Back</button>
            <button onClick={() => setStep(3)} style={{ padding: '11px 20px', background: 'none', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--muted)', fontFamily: 'inherit' }}>Skip for now</button>
            <button onClick={saveConnections} disabled={saving} style={{ flex: 2, padding: '11px 0', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>{saving ? 'Connecting...' : 'Connect & Continue'}</button>
          </div>
        </div>
      )}

      {/* STEP 3: Quick Tour */}
      {step === 3 && (
        <div style={card}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4, letterSpacing: -0.3 }}>Quick tour</h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>Here's what you can do with APEX.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { icon: '◈', title: 'All Campaigns', desc: 'See every campaign across Meta, Google, and TikTok in one view. Toggle campaigns on/off instantly.' },
              { icon: '✦', title: 'Wanda AI', desc: 'Your AI ad strategist. Ask her to diagnose performance, suggest kill/scale rules, generate hooks, or analyze competitors. She only sees YOUR data.' },
              { icon: '◆', title: 'Creatives', desc: 'Generate ad hooks, headlines, and body copy for any platform. Powered by AI, customized to your product and audience.' },
              { icon: '⊘', title: 'Competitors', desc: 'Enter your niche and get a full competitor breakdown: their ad strategies, weaknesses, and opportunities you can exploit.' },
              { icon: '⊞', title: 'Pipeline', desc: 'Track leads from raw to active client. Drag between stages, add notes, syncs with your CRM.' },
              { icon: '⊛', title: 'Data Tracker', desc: 'Ecom metrics dashboard: revenue, orders, LTV, inventory alerts, channel performance, and goals.' },
              { icon: '⊕', title: 'Settings', desc: 'Manage your ad account connections, API keys, and preferences anytime.' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, padding: '12px 0', borderBottom: i < 6 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-dim)', border: '1px solid var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'var(--accent)', flexShrink: 0 }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button onClick={() => setStep(2)} style={{ flex: 1, padding: '11px 0', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--muted)', fontFamily: 'inherit' }}>Back</button>
            <button onClick={() => setStep(4)} style={{ flex: 2, padding: '11px 0', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Got it, let's go</button>
          </div>
        </div>
      )}

      {/* STEP 4: Ready */}
      {step === 4 && (
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>+</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, letterSpacing: -0.5 }}>You're all set</h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>Your APEX account is ready. Head to your dashboard to start managing your ads with AI.</p>
          <button onClick={finishOnboarding} style={{ padding: '14px 40px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Go to Dashboard</button>
        </div>
      )}
    </div>
  );
}
