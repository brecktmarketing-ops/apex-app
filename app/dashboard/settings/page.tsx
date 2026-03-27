'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { AdConnection } from '@/lib/types';

export default function SettingsPage() {
  const supabase = createClient();
  const [connections, setConnections] = useState<AdConnection[]>([]);
  const [showForm, setShowForm] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [accountId, setAccountId] = useState('');
  const [accountName, setAccountName] = useState('');
  const [saving, setSaving] = useState(false);
  const [connError, setConnError] = useState('');
  const [connSuccess, setConnSuccess] = useState('');
  const [tab, setTab] = useState<'accounts' | 'email' | 'profile' | 'notifications'>('accounts');

  // Profile
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [website, setWebsite] = useState('');
  const [monthlySpend, setMonthlySpend] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [profileSaved, setProfileSaved] = useState(false);

  // Email/SMS
  const [emailProvider, setEmailProvider] = useState('');
  const [emailApiKey, setEmailApiKey] = useState('');
  const [smsProvider, setSmsProvider] = useState('');
  const [smsApiKey, setSmsApiKey] = useState('');
  const [smsPhone, setSmsPhone] = useState('');
  const [emailSaved, setEmailSaved] = useState(false);

  // Notifications
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifSms, setNotifSms] = useState(false);

  useEffect(() => {
    loadAll();
    // Check for OAuth results in URL
    const params = new URLSearchParams(window.location.search);
    const metaSuccess = params.get('meta_success');
    const metaError = params.get('meta_error');
    if (metaSuccess) {
      setConnSuccess(`Connected ${metaSuccess} Meta ad account(s) successfully.`);
      window.history.replaceState({}, '', '/dashboard/settings');
    }
    if (metaError) {
      setConnError(`Meta connection issue: ${metaError}`);
      window.history.replaceState({}, '', '/dashboard/settings');
    }
  }, []);

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: conns } = await supabase.from('ad_connections').select('*').order('created_at');
    setConnections(conns || []);
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (profile) {
      setFullName(profile.full_name || '');
      setCompanyName(profile.company_name || '');
      setBusinessType(profile.business_type || '');
      setWebsite(profile.website || '');
      setMonthlySpend(profile.monthly_spend || '');
      setTimezone(profile.timezone || 'America/New_York');
      setEmailProvider(profile.email_provider || '');
      setEmailApiKey(profile.email_api_key || '');
      setSmsProvider(profile.sms_provider || '');
      setSmsApiKey(profile.sms_api_key || '');
      setSmsPhone(profile.sms_phone || '');
      setNotifEmail(profile.notifications_email ?? true);
      setNotifSms(profile.notifications_sms ?? false);
    }
  }

  async function saveConnection(platform: string) {
    setSaving(true);
    setConnError('');
    setConnSuccess('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (!token.trim()) {
      setConnError('Access token is required.');
      setSaving(false);
      return;
    }

    // Validate Meta token
    if (platform === 'meta' && token.trim()) {
      try {
        const aid = accountId ? (accountId.startsWith('act_') ? accountId : `act_${accountId}`) : null;
        const testUrl = aid
          ? `https://graph.facebook.com/v21.0/${aid}?fields=name,account_status&access_token=${token}`
          : `https://graph.facebook.com/v21.0/me?fields=name&access_token=${token}`;
        const res = await fetch(testUrl);
        const data = await res.json();
        if (data.error) {
          // Save anyway but warn
          setConnSuccess('Saved, but could not verify token. Double check your Account ID starts with act_ (e.g. act_123456789) and your token is a system user token, not a personal token.');
        }
      } catch {
        // Save anyway
      }
    }

    const { error } = await supabase.from('ad_connections').upsert({
      user_id: user.id,
      platform,
      access_token: token,
      account_id: accountId || null,
      account_name: accountName || platform + ' Account',
      status: 'active',
    }, { onConflict: 'user_id,platform,account_id' });

    if (error) {
      setConnError('Failed to save: ' + error.message);
    } else {
      setConnSuccess(`${platform} account connected successfully.`);
      setToken('');
      setAccountId('');
      setAccountName('');
      setShowForm(null);
      const { data: conns } = await supabase.from('ad_connections').select('*').order('created_at');
      setConnections(conns || []);
    }
    setSaving(false);
    setTimeout(() => { setConnError(''); setConnSuccess(''); }, 5000);
  }

  async function disconnect(id: string) {
    await supabase.from('ad_connections').delete().eq('id', id);
    const { data: conns } = await supabase.from('ad_connections').select('*').order('created_at');
    setConnections(conns || []);
  }

  async function saveProfile() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').update({
      full_name: fullName, company_name: companyName, business_type: businessType,
      website, monthly_spend: monthlySpend, timezone, updated_at: new Date().toISOString(),
    }).eq('id', user.id);
    setSaving(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  }

  async function saveEmailSms() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').update({
      email_provider: emailProvider, email_api_key: emailApiKey,
      sms_provider: smsProvider, sms_api_key: smsApiKey, sms_phone: smsPhone,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id);
    setSaving(false);
    setEmailSaved(true);
    setTimeout(() => setEmailSaved(false), 3000);
  }

  async function saveNotifications() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').update({
      notifications_email: notifEmail, notifications_sms: notifSms,
    }).eq('id', user.id);
  }

  const card = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 };
  const input = { width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 10, fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'inherit' };
  const label = { fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block' as const, marginBottom: 4 };

  const platforms = [
    { id: 'meta', name: 'Meta Ads', desc: 'Facebook + Instagram', color: '#1877F2', idPlaceholder: 'Account ID (act_123...)', tokenHelp: 'System user token or long-lived token from Business Manager' },
    { id: 'google', name: 'Google Ads', desc: 'Search, PMax, Display, YouTube', color: '#EA4335', idPlaceholder: 'Customer ID (123-456-7890)', tokenHelp: 'OAuth token or API key from Google Ads' },
    { id: 'tiktok', name: 'TikTok Ads', desc: 'TikTok campaign management', color: '#fe2c55', idPlaceholder: 'Advertiser ID', tokenHelp: 'Access token from TikTok Marketing API' },
  ];

  const tabs = [
    { key: 'accounts', label: 'Ad Accounts' },
    { key: 'email', label: 'Email / SMS' },
    { key: 'profile', label: 'Profile' },
    { key: 'notifications', label: 'Notifications' },
  ] as const;

  return (
    <div style={{ maxWidth: 740 }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: tab === t.key ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', border: 'none',
            background: tab === t.key ? 'var(--accent-dim)' : 'var(--card)', color: tab === t.key ? 'var(--accent)' : 'var(--muted)',
          }}>{t.label}</button>
        ))}
      </div>

      {/* AD ACCOUNTS */}
      {tab === 'accounts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {connSuccess && <div style={{ padding: '10px 14px', background: 'var(--green-dim)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, fontSize: 13, color: 'var(--green)' }}>{connSuccess}</div>}
          {connError && <div style={{ padding: '10px 14px', background: 'var(--red-dim)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10, fontSize: 13, color: 'var(--red)' }}>{connError}</div>}

          {/* One-Click Facebook Connect */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 4 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Quick Connect</div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>Click the button below to connect your Meta ad account instantly. No tokens or IDs needed.</p>
            <a href="/api/auth/meta" style={{ display: 'block', padding: '12px 0', background: '#1877F2', color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 700, textAlign: 'center', textDecoration: 'none', letterSpacing: -0.2 }}>Connect with Facebook</a>
          </div>

          <div style={{ fontSize: 11, color: 'var(--dim)', textAlign: 'center', marginBottom: 4 }}>Or connect manually below</div>

          {platforms.map(p => {
            const conn = connections.find(c => c.platform === p.id);
            return (
              <div key={p.id} style={card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: p.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: p.color }}>{p.name[0]}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.desc}</div>
                    </div>
                  </div>
                  {conn ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: conn.status === 'active' ? 'var(--green)' : 'var(--red)', background: conn.status === 'active' ? 'var(--green-dim)' : 'var(--red-dim)', padding: '3px 8px', borderRadius: 6 }}>{conn.status === 'active' ? 'Connected' : 'Error'}</span>
                      <button onClick={() => disconnect(conn.id)} style={{ fontSize: 11, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Disconnect</button>
                    </div>
                  ) : (
                    <button onClick={() => { setShowForm(showForm === p.id ? null : p.id); setConnError(''); }} style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Connect</button>
                  )}
                </div>
                {showForm === p.id && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <label style={label}>Account Name</label>
                      <input value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="e.g. My Business" style={input} />
                    </div>
                    <div>
                      <label style={label}>Account ID</label>
                      <input value={accountId} onChange={e => setAccountId(e.target.value)} placeholder={p.idPlaceholder} style={input} />
                    </div>
                    <div>
                      <label style={label}>Access Token</label>
                      <input value={token} onChange={e => setToken(e.target.value)} placeholder="Paste your access token" type="password" style={input} />
                      <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 4 }}>{p.tokenHelp}</div>
                    </div>
                    <button onClick={() => saveConnection(p.id)} disabled={!token || saving} style={{ padding: '10px 0', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>
                      {saving ? 'Verifying & connecting...' : 'Connect Account'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* EMAIL / SMS */}
      {tab === 'email' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={card}>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 14 }}>Email Provider</div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>Connect your email service to send automated emails from sequences.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={label}>Provider</label>
                <select value={emailProvider} onChange={e => setEmailProvider(e.target.value)} style={{ ...input, cursor: 'pointer' }}>
                  <option value="">Select provider</option>
                  <option value="resend">Resend</option>
                  <option value="sendgrid">SendGrid</option>
                  <option value="postmark">Postmark</option>
                  <option value="mailgun">Mailgun</option>
                  <option value="smtp">Custom SMTP</option>
                </select>
              </div>
              <div>
                <label style={label}>API Key</label>
                <input value={emailApiKey} onChange={e => setEmailApiKey(e.target.value)} placeholder="Your email provider API key" type="password" style={input} />
              </div>
            </div>
          </div>
          <div style={card}>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 14 }}>SMS Provider</div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>Connect your SMS service to send automated texts.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={label}>Provider</label>
                <select value={smsProvider} onChange={e => setSmsProvider(e.target.value)} style={{ ...input, cursor: 'pointer' }}>
                  <option value="">Select provider</option>
                  <option value="twilio">Twilio</option>
                  <option value="vonage">Vonage</option>
                  <option value="messagebird">MessageBird</option>
                </select>
              </div>
              <div>
                <label style={label}>API Key / Auth Token</label>
                <input value={smsApiKey} onChange={e => setSmsApiKey(e.target.value)} placeholder="Your SMS provider API key" type="password" style={input} />
              </div>
              <div>
                <label style={label}>Sending Phone Number</label>
                <input value={smsPhone} onChange={e => setSmsPhone(e.target.value)} placeholder="+1234567890" style={input} />
              </div>
            </div>
          </div>
          <button onClick={saveEmailSms} disabled={saving} style={{ padding: '12px 0', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>
            {emailSaved ? 'Saved' : saving ? 'Saving...' : 'Save Email / SMS Settings'}
          </button>
        </div>
      )}

      {/* PROFILE */}
      {tab === 'profile' && (
        <div style={card}>
          <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 14 }}>Profile</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div><label style={label}>Full Name</label><input value={fullName} onChange={e => setFullName(e.target.value)} style={input} /></div>
            <div><label style={label}>Company Name</label><input value={companyName} onChange={e => setCompanyName(e.target.value)} style={input} /></div>
            <div>
              <label style={label}>Business Type</label>
              <select value={businessType} onChange={e => setBusinessType(e.target.value)} style={{ ...input, cursor: 'pointer' }}>
                <option value="">Select type</option>
                <option value="ecom">E-Commerce</option>
                <option value="leadgen">Lead Generation</option>
                <option value="saas">SaaS</option>
                <option value="local">Local Business</option>
                <option value="agency">Agency</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div><label style={label}>Website</label><input value={website} onChange={e => setWebsite(e.target.value)} placeholder="yoursite.com" style={input} /></div>
            <div>
              <label style={label}>Monthly Ad Spend</label>
              <select value={monthlySpend} onChange={e => setMonthlySpend(e.target.value)} style={{ ...input, cursor: 'pointer' }}>
                <option value="">Select range</option>
                <option value="0-1k">$0 - $1,000</option>
                <option value="1k-5k">$1,000 - $5,000</option>
                <option value="5k-20k">$5,000 - $20,000</option>
                <option value="20k-50k">$20,000 - $50,000</option>
                <option value="50k+">$50,000+</option>
              </select>
            </div>
            <div>
              <label style={label}>Timezone</label>
              <select value={timezone} onChange={e => setTimezone(e.target.value)} style={{ ...input, cursor: 'pointer' }}>
                <option value="America/New_York">Eastern (ET)</option>
                <option value="America/Chicago">Central (CT)</option>
                <option value="America/Denver">Mountain (MT)</option>
                <option value="America/Los_Angeles">Pacific (PT)</option>
                <option value="America/Phoenix">Arizona (MST)</option>
                <option value="Pacific/Honolulu">Hawaii (HST)</option>
                <option value="Europe/London">London (GMT)</option>
                <option value="Europe/Berlin">Central Europe (CET)</option>
              </select>
            </div>
            <button onClick={saveProfile} disabled={saving} style={{ padding: '12px 0', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1, marginTop: 4 }}>
              {profileSaved ? 'Saved' : saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS */}
      {tab === 'notifications' && (
        <div style={card}>
          <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 14 }}>Notifications</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Email Notifications', desc: 'Kill rule alerts, scale opportunities, weekly reports', value: notifEmail, set: setNotifEmail },
              { label: 'SMS Notifications', desc: 'Urgent alerts only (kill rules, budget overruns)', value: notifSms, set: setNotifSms },
            ].map((n, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i === 0 ? '1px solid var(--border)' : 'none' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{n.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{n.desc}</div>
                </div>
                <div onClick={() => { n.set(!n.value); setTimeout(saveNotifications, 100); }}
                  style={{ width: 44, height: 24, borderRadius: 12, cursor: 'pointer', position: 'relative', background: n.value ? 'var(--green-dim)' : 'var(--card2)', border: n.value ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--border2)', transition: 'all 0.2s' }}>
                  <div style={{ position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%', background: n.value ? 'var(--green)' : 'var(--dim)', transition: 'all 0.2s', ...(n.value ? { right: 3 } : { left: 3 }) }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
