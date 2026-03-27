'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UserProfile {
  id: string;
  full_name: string;
  company_name: string;
  email?: string;
  role: string;
  business_type: string;
  website: string;
  monthly_spend: string;
  onboarded: boolean;
  created_at: string;
  connections: { platform: string; status: string; account_name: string }[];
  stats: {
    campaigns: number;
    activeCampaigns: number;
    totalSpend: number;
    totalRevenue: number;
    roas: string;
    sequences: number;
    activeSequences: number;
    platforms: string[];
  };
}

const light = {
  bg: '#f5f5f5', card: '#ffffff', card2: '#fafafa', border: 'rgba(0,0,0,0.06)',
  border2: 'rgba(0,0,0,0.1)', text: '#1a1a1a', muted: '#6b7280', dim: '#9ca3af',
  accent: '#dc2626', accent2: '#ef4444', accentDim: 'rgba(220,38,38,0.06)',
  accentGlow: 'rgba(220,38,38,0.12)', green: '#16a34a', greenDim: 'rgba(22,163,74,0.08)',
  red: '#dc2626', redDim: 'rgba(220,38,38,0.08)',
};

const dark = {
  bg: '#0a0a0c', card: '#111114', card2: '#16161a', border: 'rgba(255,255,255,0.06)',
  border2: 'rgba(255,255,255,0.1)', text: '#f5f5f7', muted: 'rgba(255,255,255,0.5)', dim: 'rgba(255,255,255,0.25)',
  accent: '#ef4444', accent2: '#f87171', accentDim: 'rgba(239,68,68,0.08)',
  accentGlow: 'rgba(239,68,68,0.15)', green: '#22c55e', greenDim: 'rgba(34,197,94,0.1)',
  red: '#f87171', redDim: 'rgba(248,113,113,0.1)',
};

export default function AdminPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(true);

  const T = isDark ? dark : light;

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profile?.role !== 'admin') { setIsAdmin(false); setLoading(false); return; }
      setIsAdmin(true);
      const res = await fetch('/api/admin/users', { headers: { 'x-user-id': user.id } });
      const data = await res.json();
      setUsers(data.users || []);
      setLoading(false);
    }
    load();
  }, []);

  const card = { background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20 };

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg }}><p style={{ color: T.muted }}>Loading...</p></div>;

  if (!isAdmin) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: T.text, marginBottom: 8 }}>Access Denied</h1>
        <p style={{ color: T.muted }}>Admin access required.</p>
        <a href="/dashboard" style={{ color: T.accent, fontSize: 13, fontWeight: 600, textDecoration: 'none', marginTop: 16, display: 'inline-block' }}>Back to Dashboard</a>
      </div>
    </div>
  );

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.stats.campaigns > 0).length;
  const totalSpend = users.reduce((s, u) => s + u.stats.totalSpend, 0);
  const totalRevenue = users.reduce((s, u) => s + u.stats.totalRevenue, 0);

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: 'Inter, system-ui, sans-serif', color: T.text, padding: 24, transition: 'all 0.2s' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 30, height: 30, background: T.accent, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13, color: '#fff' }}>A</div>
              <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>APEX Admin</h1>
              <span style={{ fontSize: 9, fontWeight: 700, background: T.accentDim, color: T.accent, padding: '2px 6px', borderRadius: 100, border: `1px solid ${T.accentGlow}`, letterSpacing: 0.5 }}>ADMIN</span>
            </div>
            <p style={{ fontSize: 13, color: T.muted }}>Manage all user accounts and platform activity</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setIsDark(!isDark)} style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${T.border}`, background: T.card, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: T.muted, fontSize: 15 }}>
              {isDark ? 'L' : 'D'}
            </button>
            <a href="/dashboard" style={{ padding: '8px 16px', background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12, fontWeight: 600, color: T.muted, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>Dashboard</a>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
          {[
            { label: 'Total Users', value: totalUsers, color: T.accent },
            { label: 'Active Users', value: activeUsers, color: T.green },
            { label: 'Total Ad Spend', value: `$${totalSpend.toLocaleString()}`, color: T.accent },
            { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, color: T.green },
          ].map((k, i) => (
            <div key={i} style={card}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>{k.label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -1, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Users Table */}
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>All Users ({users.length})</span>
            <span style={{ fontSize: 11, color: T.accent, fontWeight: 600 }}>{activeUsers} active</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px', padding: '10px 20px', borderBottom: `1px solid ${T.border}`, background: T.card2 }}>
            {['User', 'Business Type', 'Platforms', 'Campaigns', 'Spend', 'Role'].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 700, color: T.dim, textTransform: 'uppercase', letterSpacing: 0.6 }}>{h}</div>
            ))}
          </div>
          {users.map(u => (
            <div key={u.id}>
              <div onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px', padding: '12px 20px', alignItems: 'center', borderBottom: `1px solid ${T.border}`, cursor: 'pointer', transition: 'background 0.15s' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{u.full_name || 'No name'}</div>
                  <div style={{ fontSize: 11, color: T.muted }}>{u.company_name || 'No company'}</div>
                </div>
                <div style={{ fontSize: 12, color: T.muted, textTransform: 'capitalize' }}>{u.business_type || 'N/A'}</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {u.stats.platforms.length > 0 ? u.stats.platforms.map(p => (
                    <span key={p} style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: T.accentDim, color: T.accent, textTransform: 'capitalize' }}>{p}</span>
                  )) : <span style={{ fontSize: 11, color: T.dim }}>None</span>}
                </div>
                <div style={{ fontSize: 13 }}>{u.stats.activeCampaigns} / {u.stats.campaigns}</div>
                <div style={{ fontSize: 13 }}>${u.stats.totalSpend.toLocaleString()}</div>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6, color: u.role === 'admin' ? T.accent : T.muted, background: u.role === 'admin' ? T.accentDim : T.card2, textTransform: 'capitalize' }}>{u.role}</span>
                </div>
              </div>
              {expandedUser === u.id && (
                <div style={{ padding: '16px 20px', background: T.card2, borderBottom: `1px solid ${T.border}` }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                    {[
                      { label: 'Website', val: u.website || 'N/A' },
                      { label: 'Monthly Spend', val: u.monthly_spend || 'N/A' },
                      { label: 'ROAS', val: u.stats.roas + 'x' },
                      { label: 'Revenue', val: '$' + u.stats.totalRevenue.toLocaleString() },
                      { label: 'Sequences', val: u.stats.activeSequences + ' active / ' + u.stats.sequences + ' total' },
                      { label: 'Onboarded', val: u.onboarded ? 'Yes' : 'No' },
                    ].map((d, i) => (
                      <div key={i}>
                        <div style={{ fontSize: 10, color: T.muted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{d.label}</div>
                        <div style={{ fontSize: 12, color: T.text }}>{d.val}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: T.muted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Connected Accounts</div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    {u.connections.length > 0 ? u.connections.map((c, i) => (
                      <div key={i} style={{ padding: '6px 10px', background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 11 }}>
                        <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{c.platform}</span> - {c.account_name || 'No name'} - <span style={{ color: c.status === 'active' ? T.green : T.red }}>{c.status}</span>
                      </div>
                    )) : <span style={{ fontSize: 11, color: T.dim }}>No accounts connected</span>}
                  </div>
                  <div style={{ fontSize: 10, color: T.dim }}>Joined: {new Date(u.created_at).toLocaleDateString()}</div>
                </div>
              )}
            </div>
          ))}
          {users.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: T.muted }}>No users yet</div>}
        </div>
      </div>
    </div>
  );
}
