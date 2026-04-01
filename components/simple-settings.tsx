'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AdConnection } from '@/lib/types';

const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID || '1325802426269036';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://apex-app-ecru.vercel.app';
const REDIRECT_URI = `${APP_URL}/api/auth/meta/callback`;

function getMetaOAuthUrl() {
  return `https://www.facebook.com/v21.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=ads_management,ads_read,business_management,pages_show_list,pages_read_engagement,leads_retrieval&response_type=code`;
}

export default function SimpleSettings() {
  const supabase = createClient();
  const [connections, setConnections] = useState<AdConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [saving, setSaving] = useState(false);
  const [productCatalog, setProductCatalog] = useState('');
  const [complianceRules, setComplianceRules] = useState('');
  const [brandVoice, setBrandVoice] = useState('');
  const [savingBrain, setSavingBrain] = useState(false);
  const [brainSaved, setBrainSaved] = useState(false);

  useEffect(() => {
    loadData();
    // Handle Meta OAuth redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get('meta_success')) {
      setToast({ type: 'success', msg: `Connected ${params.get('meta_success')} Meta ad account(s)!` });
      window.history.replaceState({}, '', '/dashboard/settings');
    }
    if (params.get('meta_error')) {
      setToast({ type: 'error', msg: `Meta connection issue: ${params.get('meta_error')}` });
      window.history.replaceState({}, '', '/dashboard/settings');
    }
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: conns } = await supabase.from('ad_connections').select('*').order('created_at');
    setConnections(conns || []);
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (profile) {
      setFullName(profile.full_name || '');
      setCompanyName(profile.company_name || '');
    }
    setLoading(false);
  }

  async function saveProfile() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ full_name: fullName, company_name: companyName }).eq('id', user.id);
      setToast({ type: 'success', msg: 'Profile saved!' });
    }
    setSaving(false);
  }

  async function trainWanda() {
    setSavingBrain(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSavingBrain(false); return; }

    const entries: { category: string; fact: string }[] = [];

    if (productCatalog.trim()) {
      // Split by lines or commas for multiple products
      const products = productCatalog.split('\n').filter(l => l.trim());
      for (const p of products) {
        entries.push({ category: 'products', fact: p.trim() });
      }
    }

    if (complianceRules.trim()) {
      const rules = complianceRules.split('\n').filter(l => l.trim());
      for (const r of rules) {
        entries.push({ category: 'compliance', fact: r.trim() });
      }
    }

    if (brandVoice.trim()) {
      entries.push({ category: 'brand_voice', fact: brandVoice.trim() });
    }

    if (entries.length === 0) { setSavingBrain(false); return; }

    // Clear old entries in these categories and insert new
    await supabase.from('wanda_brain').delete().eq('user_id', user.id).in('category', ['products', 'compliance', 'brand_voice']);

    const rows = entries.map(e => ({
      user_id: user.id,
      category: e.category,
      fact: e.fact,
      source: 'settings',
    }));

    await supabase.from('wanda_brain').insert(rows);
    setBrainSaved(true);
    setToast({ type: 'success', msg: `Wanda trained on ${entries.length} items!` });
    setSavingBrain(false);
  }

  async function disconnect(id: string) {
    await supabase.from('ad_connections').delete().eq('id', id);
    const { data: conns } = await supabase.from('ad_connections').select('*').order('created_at');
    setConnections(conns || []);
    setToast({ type: 'success', msg: 'Disconnected.' });
  }

  const metaConnections = connections.filter(c => c.platform === 'meta' && c.status === 'active');
  const googleConnections = connections.filter(c => c.platform === 'google' && c.status === 'active');
  const tiktokConnections = connections.filter(c => c.platform === 'tiktok' && c.status === 'active');

  const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px' };
  const input = { width: '100%', padding: '12px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 14, color: 'var(--text)', outline: 'none', fontFamily: 'inherit' };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Loading settings...</div>;
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      {toast && (
        <div style={{
          padding: '14px 20px', borderRadius: 12, marginBottom: 16,
          background: toast.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: toast.type === 'success' ? '#34d399' : '#f87171',
          fontSize: 14, fontWeight: 600,
        }}>
          {toast.msg}
        </div>
      )}

      {/* Profile */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Your Profile</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Name</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" style={input} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Business Name</label>
            <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Your business name" style={input} />
          </div>
          <button onClick={saveProfile} disabled={saving} style={{
            padding: '12px', borderRadius: 10, border: 'none', background: 'var(--accent)',
            color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            opacity: saving ? 0.6 : 1,
          }}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>

      {/* Connect Ad Accounts */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Ad Accounts</div>

        {/* Meta */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>◉</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Meta (Facebook & Instagram)</span>
            </div>
            {metaConnections.length > 0 ? (
              <span style={{ fontSize: 11, fontWeight: 600, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '3px 8px', borderRadius: 6 }}>
                {metaConnections.length} connected
              </span>
            ) : null}
          </div>
          {metaConnections.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {metaConnections.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg)', borderRadius: 10 }}>
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>{c.account_name} ({c.account_id})</span>
                  <button onClick={() => disconnect(c.id)} style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Disconnect</button>
                </div>
              ))}
              <a href={getMetaOAuthUrl()} style={{
                display: 'block', textAlign: 'center', padding: '10px', borderRadius: 10,
                border: '1px solid var(--border)', color: 'var(--muted)', fontSize: 13,
                textDecoration: 'none', marginTop: 4,
              }}>
                + Connect another account
              </a>
            </div>
          ) : (
            <a href={getMetaOAuthUrl()} style={{
              display: 'block', textAlign: 'center', padding: '14px', borderRadius: 12,
              background: '#1877f2', color: '#fff', fontSize: 14, fontWeight: 600,
              textDecoration: 'none',
            }}>
              Connect with Facebook
            </a>
          )}
        </div>

        {/* Google */}
        <div style={{ marginBottom: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>◎</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Google Ads</span>
            </div>
            {googleConnections.length > 0 ? (
              <span style={{ fontSize: 11, fontWeight: 600, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '3px 8px', borderRadius: 6 }}>Connected</span>
            ) : null}
          </div>
          {googleConnections.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {googleConnections.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg)', borderRadius: 10 }}>
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>{c.account_name}</span>
                  <button onClick={() => disconnect(c.id)} style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Disconnect</button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '14px', borderRadius: 12, background: 'var(--bg)', border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>Google Ads requires a manual setup.</div>
              <a href="/dashboard/wanda" style={{
                fontSize: 13, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none',
              }}>
                Ask Wanda to help you connect →
              </a>
            </div>
          )}
        </div>

        {/* TikTok */}
        <div style={{ paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>◐</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>TikTok Ads</span>
            </div>
            {tiktokConnections.length > 0 ? (
              <span style={{ fontSize: 11, fontWeight: 600, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '3px 8px', borderRadius: 6 }}>Connected</span>
            ) : null}
          </div>
          {tiktokConnections.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {tiktokConnections.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg)', borderRadius: 10 }}>
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>{c.account_name}</span>
                  <button onClick={() => disconnect(c.id)} style={{ fontSize: 11, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Disconnect</button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '14px', borderRadius: 12, background: 'var(--bg)', border: '1px solid var(--border)', textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>TikTok Ads requires a manual setup.</div>
              <a href="/dashboard/wanda" style={{
                fontSize: 13, fontWeight: 600, color: 'var(--accent)', textDecoration: 'none',
              }}>
                Ask Wanda to help you connect →
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Train Your AI */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, color: '#fff', fontWeight: 700,
          }}>W</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Train Your AI</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Teach Wanda about your business so she can help you better</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
              Your Products <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(one per line)</span>
            </label>
            <textarea
              value={productCatalog}
              onChange={e => setProductCatalog(e.target.value)}
              placeholder={"BPC-157 5mg - $89 - Recovery peptide for gut and tissue repair\nTB-500 5mg - $79 - Healing and flexibility peptide\nSemaglutide 5mg - $149 - GLP-1 for weight management"}
              style={{ ...input, minHeight: 100, resize: 'vertical' as const }}
            />
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Include product name, price, and a short description</div>
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
              Compliance Rules <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(one per line, optional)</span>
            </label>
            <textarea
              value={complianceRules}
              onChange={e => setComplianceRules(e.target.value)}
              placeholder={"All products are for research purposes only\nNever claim FDA approval\nDon't use words: cure, treat, diagnose, prevent\nAlways include research disclaimer"}
              style={{ ...input, minHeight: 80, resize: 'vertical' as const }}
            />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
              Brand Voice <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span>
            </label>
            <textarea
              value={brandVoice}
              onChange={e => setBrandVoice(e.target.value)}
              placeholder="e.g. We're science-first but approachable. No bro-science. Use data and research to back claims. Tone is confident but not pushy. We educate, not sell."
              style={{ ...input, minHeight: 60, resize: 'vertical' as const }}
            />
          </div>

          <button
            onClick={trainWanda}
            disabled={savingBrain || (!productCatalog.trim() && !complianceRules.trim() && !brandVoice.trim())}
            style={{
              padding: '14px', borderRadius: 12, border: 'none',
              background: (productCatalog.trim() || complianceRules.trim() || brandVoice.trim()) ? 'var(--accent)' : 'var(--border)',
              color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              opacity: savingBrain ? 0.6 : 1,
            }}
          >
            {savingBrain ? 'Training Wanda...' : brainSaved ? 'Update Training' : 'Train Wanda'}
          </button>
        </div>
      </div>

      {/* Need Help */}
      <div style={{ ...card, textAlign: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Need help setting up?</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Wanda can walk you through connecting any platform step by step.</div>
        <a href="/dashboard/wanda" style={{
          display: 'inline-block', padding: '12px 24px', borderRadius: 10, background: 'var(--accent)',
          color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none',
        }}>
          Ask Wanda for Help
        </a>
      </div>
    </div>
  );
}
