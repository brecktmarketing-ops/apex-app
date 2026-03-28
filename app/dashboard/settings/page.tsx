'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AdConnection } from '@/lib/types';

type Tab = 'accounts' | 'ecom' | 'email' | 'profile' | 'notifications';

export default function SettingsPage() {
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>('accounts');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [connections, setConnections] = useState<AdConnection[]>([]);
  const [testing, setTesting] = useState<string | null>(null);

  // Ad account forms
  const [showForm, setShowForm] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [accountId, setAccountId] = useState('');
  const [accountName, setAccountName] = useState('');
  // Google extra fields
  const [googleDevToken, setGoogleDevToken] = useState('');

  // Ecom & Revenue
  const [shopifyDomain, setShopifyDomain] = useState('');
  const [shopifyToken, setShopifyToken] = useState('');
  const [wooUrl, setWooUrl] = useState('');
  const [wooKey, setWooKey] = useState('');
  const [wooSecret, setWooSecret] = useState('');
  const [stripeRevenueKey, setStripeRevenueKey] = useState('');
  const [manualRevenue, setManualRevenue] = useState('');
  const [ecomSaved, setEcomSaved] = useState(false);

  // Email/SMS
  const [emailProvider, setEmailProvider] = useState('');
  const [emailApiKey, setEmailApiKey] = useState('');
  const [smsProvider, setSmsProvider] = useState('');
  const [smsApiKey, setSmsApiKey] = useState('');
  const [smsPhone, setSmsPhone] = useState('');
  const [emailSaved, setEmailSaved] = useState(false);
  const [emailStats, setEmailStats] = useState({ emails: 0, sms: 0 });
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingSms, setTestingSms] = useState(false);

  // Profile
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [website, setWebsite] = useState('');
  const [monthlySpend, setMonthlySpend] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [profileSaved, setProfileSaved] = useState(false);

  // Notifications
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifSms, setNotifSms] = useState(false);

  useEffect(() => {
    loadAll();
    const params = new URLSearchParams(window.location.search);
    const metaSuccess = params.get('meta_success');
    const metaError = params.get('meta_error');
    if (metaSuccess) {
      flash('success', `Connected ${metaSuccess} Meta ad account(s) successfully.`);
      window.history.replaceState({}, '', '/dashboard/settings');
    }
    if (metaError) {
      flash('error', `Meta connection issue: ${metaError}`);
      window.history.replaceState({}, '', '/dashboard/settings');
    }
  }, []);

  function flash(type: 'success' | 'error', msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  }

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
      setShopifyDomain(profile.shopify_domain || '');
      setShopifyToken(profile.shopify_token || '');
      setWooUrl(profile.woocommerce_url || '');
      setWooKey(profile.woocommerce_key || '');
      setWooSecret(profile.woocommerce_secret || '');
      setStripeRevenueKey(profile.stripe_revenue_key || '');
      setManualRevenue(profile.manual_revenue || '');
    }

    // Load send stats
    const { count: emailCount } = await supabase
      .from('message_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('channel', 'email');
    const { count: smsCount } = await supabase
      .from('message_log')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('channel', 'sms');
    setEmailStats({ emails: emailCount || 0, sms: smsCount || 0 });
  }

  // --- AD ACCOUNTS ---

  async function saveConnection(platform: string) {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    if (!token.trim()) {
      flash('error', 'Access token is required.');
      setSaving(false);
      return;
    }

    const extra: Record<string, string> = {};
    if (platform === 'google' && googleDevToken) {
      extra.developer_token = googleDevToken;
    }

    const { error } = await supabase.from('ad_connections').upsert({
      user_id: user.id,
      platform,
      access_token: token,
      account_id: accountId || null,
      account_name: accountName || platform + ' Account',
      status: 'active',
      ...(Object.keys(extra).length ? { platform_data: extra } : {}),
    }, { onConflict: 'user_id,platform,account_id' });

    if (error) {
      flash('error', 'Failed to save: ' + error.message);
    } else {
      flash('success', `${platform} account connected.`);
      setToken(''); setAccountId(''); setAccountName(''); setGoogleDevToken('');
      setShowForm(null);
      const { data: conns } = await supabase.from('ad_connections').select('*').order('created_at');
      setConnections(conns || []);
    }
    setSaving(false);
  }

  async function testConnection(conn: AdConnection) {
    setTesting(conn.id);
    try {
      if (conn.platform === 'meta') {
        const aid = conn.account_id?.startsWith('act_') ? conn.account_id : `act_${conn.account_id}`;
        const res = await fetch(`https://graph.facebook.com/v21.0/${aid}?fields=name,account_status&access_token=${conn.access_token}`);
        const data = await res.json();
        if (data.error) { flash('error', `Meta: ${data.error.message}`); }
        else { flash('success', `Meta connected: ${data.name}`); }
      } else if (conn.platform === 'google') {
        flash('success', 'Google credentials saved. Verification happens on first sync.');
      } else if (conn.platform === 'tiktok') {
        flash('success', 'TikTok credentials saved. Verification happens on first sync.');
      }
    } catch {
      flash('error', 'Connection test failed. Check your credentials.');
    }
    setTesting(null);
  }

  async function disconnect(id: string) {
    await supabase.from('ad_connections').delete().eq('id', id);
    const { data: conns } = await supabase.from('ad_connections').select('*').order('created_at');
    setConnections(conns || []);
    flash('success', 'Disconnected.');
  }

  // --- ECOM & REVENUE ---

  async function saveEcom() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    await supabase.from('profiles').update({
      shopify_domain: shopifyDomain,
      shopify_token: shopifyToken,
      woocommerce_url: wooUrl,
      woocommerce_key: wooKey,
      woocommerce_secret: wooSecret,
      stripe_revenue_key: stripeRevenueKey,
      manual_revenue: manualRevenue,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id);
    setSaving(false);
    setEcomSaved(true);
    flash('success', 'Ecom & revenue settings saved.');
    setTimeout(() => setEcomSaved(false), 3000);
  }

  // --- EMAIL / SMS ---

  async function saveEmailSms() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    await supabase.from('profiles').update({
      email_provider: emailProvider, email_api_key: emailApiKey,
      sms_provider: smsProvider, sms_api_key: smsApiKey, sms_phone: smsPhone,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id);
    setSaving(false);
    setEmailSaved(true);
    flash('success', 'Email / SMS settings saved.');
    setTimeout(() => setEmailSaved(false), 3000);
  }

  async function testEmail() {
    setTestingEmail(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) { flash('error', 'No email on file.'); setTestingEmail(false); return; }
      const res = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: emailProvider, apiKey: emailApiKey, to: user.email }),
      });
      if (res.ok) flash('success', `Test email sent to ${user.email}`);
      else flash('error', 'Test email failed. Check your API key.');
    } catch { flash('error', 'Test email request failed.'); }
    setTestingEmail(false);
  }

  async function testSms() {
    setTestingSms(true);
    try {
      const res = await fetch('/api/test-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: smsProvider, apiKey: smsApiKey, phone: smsPhone }),
      });
      if (res.ok) flash('success', `Test SMS sent to ${smsPhone}`);
      else flash('error', 'Test SMS failed. Check your credentials.');
    } catch { flash('error', 'Test SMS request failed.'); }
    setTestingSms(false);
  }

  // --- PROFILE ---

  async function saveProfile() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    await supabase.from('profiles').update({
      full_name: fullName, company_name: companyName, business_type: businessType,
      website, monthly_spend: monthlySpend, timezone, updated_at: new Date().toISOString(),
    }).eq('id', user.id);
    setSaving(false);
    setProfileSaved(true);
    flash('success', 'Profile saved.');
    setTimeout(() => setProfileSaved(false), 3000);
  }

  // --- NOTIFICATIONS ---

  async function saveNotifications() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').update({
      notifications_email: notifEmail, notifications_sms: notifSms,
    }).eq('id', user.id);
  }

  // --- STYLES ---

  const card: React.CSSProperties = {
    background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: 16, padding: 24,
  };
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', background: 'var(--bg)',
    border: '1px solid var(--border)', borderRadius: 10, fontSize: 13,
    color: 'var(--text)', outline: 'none', fontFamily: 'inherit',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: 'var(--muted)',
    display: 'block', marginBottom: 4,
  };
  const btnPrimary: React.CSSProperties = {
    padding: '10px 20px', background: 'var(--accent)', color: '#fff',
    border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
  };
  const btnOutline: React.CSSProperties = {
    padding: '8px 14px', background: 'transparent',
    border: '1px solid var(--border)', borderRadius: 8, fontSize: 12,
    fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text)',
  };
  const dot = (active: boolean): React.CSSProperties => ({
    width: 8, height: 8, borderRadius: '50%',
    background: active ? '#10b981' : '#ef4444',
    flexShrink: 0,
  });
  const statusPill = (active: boolean): React.CSSProperties => ({
    fontSize: 11, fontWeight: 600,
    color: active ? '#10b981' : '#ef4444',
    background: active ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
    padding: '3px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6,
  });

  const tabs: { key: Tab; label: string }[] = [
    { key: 'accounts', label: 'Ad Accounts' },
    { key: 'ecom', label: 'Ecom & Revenue' },
    { key: 'email', label: 'Email & SMS' },
    { key: 'profile', label: 'Profile' },
    { key: 'notifications', label: 'Notifications' },
  ];

  const platforms = [
    {
      id: 'meta', name: 'Meta Ads', desc: 'Facebook + Instagram',
      color: '#1877F2', hasOAuth: true,
      fields: [
        { key: 'accountId', label: 'Account ID', placeholder: 'act_123456789', setter: setAccountId, value: accountId },
        { key: 'token', label: 'Access Token', placeholder: 'System user or long-lived token', setter: setToken, value: token, password: true },
      ],
    },
    {
      id: 'google', name: 'Google Ads', desc: 'Search, PMax, Display, YouTube',
      color: '#EA4335', hasOAuth: false,
      fields: [
        { key: 'accountId', label: 'Customer ID', placeholder: '123-456-7890', setter: setAccountId, value: accountId },
        { key: 'token', label: 'Access Token', placeholder: 'OAuth access token', setter: setToken, value: token, password: true },
        { key: 'devToken', label: 'Developer Token', placeholder: 'Developer token from Google Ads', setter: setGoogleDevToken, value: googleDevToken, password: true },
      ],
    },
    {
      id: 'tiktok', name: 'TikTok Ads', desc: 'TikTok campaign management',
      color: '#fe2c55', hasOAuth: false,
      fields: [
        { key: 'accountId', label: 'Advertiser ID', placeholder: 'Your TikTok Advertiser ID', setter: setAccountId, value: accountId },
        { key: 'token', label: 'Access Token', placeholder: 'TikTok Marketing API token', setter: setToken, value: token, password: true },
      ],
    },
  ];

  return (
    <div style={{ maxWidth: 740 }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 999,
          padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          background: toast.type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
          border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
          color: toast.type === 'success' ? '#10b981' : '#ef4444',
          maxWidth: 400,
        }}>
          {toast.msg}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 16px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
            fontFamily: 'inherit', border: 'none',
            fontWeight: tab === t.key ? 700 : 500,
            background: tab === t.key ? 'var(--accent)' : 'var(--card)',
            color: tab === t.key ? '#fff' : 'var(--muted)',
            transition: 'all 0.15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ==================== TAB 1: AD ACCOUNTS ==================== */}
      {tab === 'accounts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {platforms.map(p => {
            const conn = connections.find(c => c.platform === p.id);
            const isConnected = conn?.status === 'active';

            return (
              <div key={p.id} style={card}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12,
                      background: p.color + '15', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 17, fontWeight: 800, color: p.color,
                    }}>
                      {p.name[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.desc}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {conn ? (
                      <>
                        <span style={statusPill(isConnected)}>
                          <span style={dot(isConnected)} />
                          {isConnected ? 'Connected' : 'Error'}
                        </span>
                        <button onClick={() => testConnection(conn)}
                          disabled={testing === conn.id}
                          style={{ ...btnOutline, opacity: testing === conn.id ? 0.5 : 1 }}>
                          {testing === conn.id ? 'Testing...' : 'Test'}
                        </button>
                        <button onClick={() => disconnect(conn.id)}
                          style={{ ...btnOutline, color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}>
                          Disconnect
                        </button>
                      </>
                    ) : (
                      <span style={statusPill(false)}>
                        <span style={dot(false)} />
                        Not connected
                      </span>
                    )}
                  </div>
                </div>

                {/* OAuth quick connect for Meta */}
                {p.hasOAuth && !conn && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                    <a href="/api/auth/meta" style={{
                      display: 'block', padding: '12px 0', background: p.color,
                      color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 700,
                      textAlign: 'center', textDecoration: 'none',
                    }}>
                      Quick Connect with Facebook
                    </a>
                    <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: 8 }}>
                      Or enter credentials manually below
                    </div>
                  </div>
                )}

                {/* Connect / Manual entry */}
                {!conn && (
                  <div style={{ marginTop: p.hasOAuth ? 8 : 16 }}>
                    {showForm !== p.id ? (
                      <button onClick={() => { setShowForm(p.id); setToken(''); setAccountId(''); setAccountName(''); setGoogleDevToken(''); }}
                        style={{ ...btnPrimary, width: '100%', marginTop: p.hasOAuth ? 0 : 0 }}>
                        {p.hasOAuth ? 'Enter Manually Instead' : 'Connect'}
                      </button>
                    ) : (
                      <div style={{ paddingTop: 12, borderTop: p.hasOAuth ? 'none' : '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div>
                          <label style={labelStyle}>Account Name (optional)</label>
                          <input value={accountName} onChange={e => setAccountName(e.target.value)}
                            placeholder="e.g. My Business" style={inputStyle} />
                        </div>
                        {p.fields.map(f => (
                          <div key={f.key}>
                            <label style={labelStyle}>{f.label}</label>
                            <input value={f.value}
                              onChange={e => f.setter(e.target.value)}
                              placeholder={f.placeholder}
                              type={f.password ? 'password' : 'text'}
                              style={inputStyle} />
                          </div>
                        ))}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => saveConnection(p.id)} disabled={!token || saving}
                            style={{ ...btnPrimary, flex: 1, opacity: (!token || saving) ? 0.5 : 1 }}>
                            {saving ? 'Connecting...' : 'Connect Account'}
                          </button>
                          <button onClick={() => setShowForm(null)} style={btnOutline}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ==================== TAB 2: ECOM & REVENUE ==================== */}
      {tab === 'ecom' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Shopify */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(149,191,71,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 800, color: '#95bf47' }}>S</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Shopify</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Sync orders, revenue, and customer data</div>
              </div>
              <span style={statusPill(!!shopifyDomain && !!shopifyToken)}>
                <span style={dot(!!shopifyDomain && !!shopifyToken)} />
                {shopifyDomain && shopifyToken ? 'Connected' : 'Not connected'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={labelStyle}>Store Domain</label>
                <input value={shopifyDomain} onChange={e => setShopifyDomain(e.target.value)}
                  placeholder="your-store.myshopify.com" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Access Token</label>
                <input value={shopifyToken} onChange={e => setShopifyToken(e.target.value)}
                  placeholder="shpat_xxxx..." type="password" style={inputStyle} />
              </div>
            </div>
          </div>

          {/* WooCommerce */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(150,88,178,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 800, color: '#9658b2' }}>W</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>WooCommerce</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>WordPress ecommerce integration</div>
              </div>
              <span style={statusPill(!!wooUrl && !!wooKey)}>
                <span style={dot(!!wooUrl && !!wooKey)} />
                {wooUrl && wooKey ? 'Connected' : 'Not connected'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={labelStyle}>Site URL</label>
                <input value={wooUrl} onChange={e => setWooUrl(e.target.value)}
                  placeholder="https://yoursite.com" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Consumer Key</label>
                <input value={wooKey} onChange={e => setWooKey(e.target.value)}
                  placeholder="ck_xxxx..." type="password" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Consumer Secret</label>
                <input value={wooSecret} onChange={e => setWooSecret(e.target.value)}
                  placeholder="cs_xxxx..." type="password" style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Stripe Revenue */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(99,91,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 800, color: '#635bff' }}>$</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Stripe Revenue</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Track revenue for ROAS calculations</div>
              </div>
              <span style={statusPill(!!stripeRevenueKey)}>
                <span style={dot(!!stripeRevenueKey)} />
                {stripeRevenueKey ? 'Connected' : 'Not connected'}
              </span>
            </div>
            <div>
              <label style={labelStyle}>Secret Key (for revenue tracking, not billing)</label>
              <input value={stripeRevenueKey} onChange={e => setStripeRevenueKey(e.target.value)}
                placeholder="sk_live_xxxx..." type="password" style={inputStyle} />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                This is separate from your billing Stripe key. Used only to read payment data for ROAS.
              </div>
            </div>
          </div>

          {/* Manual Revenue */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(234,179,8,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 800, color: '#eab308' }}>#</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Manual Revenue</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>No ecom platform? Enter your monthly revenue here</div>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Monthly Revenue ($)</label>
              <input value={manualRevenue} onChange={e => setManualRevenue(e.target.value)}
                placeholder="10000" type="number" style={inputStyle} />
            </div>
          </div>

          <button onClick={saveEcom} disabled={saving}
            style={{ ...btnPrimary, width: '100%', padding: '12px 0', fontSize: 14, opacity: saving ? 0.5 : 1 }}>
            {ecomSaved ? 'Saved' : saving ? 'Saving...' : 'Save Ecom & Revenue Settings'}
          </button>
        </div>
      )}

      {/* ==================== TAB 3: EMAIL & SMS ==================== */}
      {tab === 'email' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Send stats */}
          {(emailStats.emails > 0 || emailStats.sms > 0) && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 2 }}>
              <div style={{ ...card, flex: 1, padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>{emailStats.emails.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Emails Sent</div>
              </div>
              <div style={{ ...card, flex: 1, padding: 16, textAlign: 'center' as const }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)' }}>{emailStats.sms.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>SMS Sent</div>
              </div>
            </div>
          )}

          {/* Email */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 800, color: '#3b82f6' }}>@</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Email Provider</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Send automated emails from sequences</div>
              </div>
              <span style={statusPill(!!emailApiKey)}>
                <span style={dot(!!emailApiKey)} />
                {emailApiKey ? 'Connected' : 'Not connected'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={labelStyle}>Provider</label>
                <select value={emailProvider} onChange={e => setEmailProvider(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Select provider</option>
                  <option value="resend">Resend</option>
                  <option value="sendgrid">SendGrid</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>API Key</label>
                <input value={emailApiKey} onChange={e => setEmailApiKey(e.target.value)}
                  placeholder="Your email API key" type="password" style={inputStyle} />
              </div>
              {emailProvider && emailApiKey && (
                <button onClick={testEmail} disabled={testingEmail}
                  style={{ ...btnOutline, alignSelf: 'flex-start', opacity: testingEmail ? 0.5 : 1 }}>
                  {testingEmail ? 'Sending...' : 'Send Test Email'}
                </button>
              )}
            </div>
          </div>

          {/* SMS */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(168,85,247,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 800, color: '#a855f7' }}>T</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>SMS Provider</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>Send automated texts via Twilio</div>
              </div>
              <span style={statusPill(!!smsApiKey)}>
                <span style={dot(!!smsApiKey)} />
                {smsApiKey ? 'Connected' : 'Not connected'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={labelStyle}>Provider</label>
                <select value={smsProvider} onChange={e => setSmsProvider(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Select provider</option>
                  <option value="twilio">Twilio</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Account SID : Auth Token</label>
                <input value={smsApiKey} onChange={e => setSmsApiKey(e.target.value)}
                  placeholder="ACXXXXXXX:your_auth_token" type="password" style={inputStyle} />
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                  Format: Account SID, then colon, then Auth Token
                </div>
              </div>
              <div>
                <label style={labelStyle}>Sending Phone Number</label>
                <input value={smsPhone} onChange={e => setSmsPhone(e.target.value)}
                  placeholder="+1234567890" style={inputStyle} />
              </div>
              {smsProvider && smsApiKey && smsPhone && (
                <button onClick={testSms} disabled={testingSms}
                  style={{ ...btnOutline, alignSelf: 'flex-start', opacity: testingSms ? 0.5 : 1 }}>
                  {testingSms ? 'Sending...' : 'Send Test SMS'}
                </button>
              )}
            </div>
          </div>

          <button onClick={saveEmailSms} disabled={saving}
            style={{ ...btnPrimary, width: '100%', padding: '12px 0', fontSize: 14, opacity: saving ? 0.5 : 1 }}>
            {emailSaved ? 'Saved' : saving ? 'Saving...' : 'Save Email & SMS Settings'}
          </button>
        </div>
      )}

      {/* ==================== TAB 4: PROFILE ==================== */}
      {tab === 'profile' && (
        <div style={card}>
          <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 18 }}>Profile</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Full Name</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Company Name</label>
              <input value={companyName} onChange={e => setCompanyName(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Business Type</label>
              <select value={businessType} onChange={e => setBusinessType(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Select type</option>
                <option value="ecom">Ecom</option>
                <option value="leadgen">Lead Gen</option>
                <option value="saas">SaaS</option>
                <option value="agency">Agency</option>
                <option value="local">Local Business</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Website</label>
              <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="yoursite.com" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Monthly Ad Spend</label>
              <select value={monthlySpend} onChange={e => setMonthlySpend(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Select range</option>
                <option value="0-1k">$0 - $1,000</option>
                <option value="1k-5k">$1,000 - $5,000</option>
                <option value="5k-20k">$5,000 - $20,000</option>
                <option value="20k-50k">$20,000 - $50,000</option>
                <option value="50k+">$50,000+</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Timezone</label>
              <select value={timezone} onChange={e => setTimezone(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
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
            <button onClick={saveProfile} disabled={saving}
              style={{ ...btnPrimary, width: '100%', padding: '12px 0', fontSize: 14, opacity: saving ? 0.5 : 1, marginTop: 4 }}>
              {profileSaved ? 'Saved' : saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>
      )}

      {/* ==================== TAB 5: NOTIFICATIONS ==================== */}
      {tab === 'notifications' && (
        <div style={card}>
          <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 18 }}>Notifications</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Email Notifications', desc: 'Kill rule alerts, scale opportunities, weekly reports', value: notifEmail, set: setNotifEmail },
              { label: 'SMS Notifications', desc: 'Urgent alerts only (kill rules, budget overruns)', value: notifSms, set: setNotifSms },
            ].map((n, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 0', borderBottom: i === 0 ? '1px solid var(--border)' : 'none',
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{n.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{n.desc}</div>
                </div>
                <div
                  onClick={() => { n.set(!n.value); setTimeout(saveNotifications, 100); }}
                  style={{
                    width: 44, height: 24, borderRadius: 12, cursor: 'pointer', position: 'relative',
                    background: n.value ? 'rgba(16,185,129,0.15)' : 'var(--card)',
                    border: n.value ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--border)',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%',
                    background: n.value ? '#10b981' : 'var(--muted)',
                    transition: 'all 0.2s',
                    ...(n.value ? { right: 3 } : { left: 3 }),
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
