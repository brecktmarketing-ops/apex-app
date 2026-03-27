'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

const navItems = [
  { label: 'All Campaigns', path: '/dashboard', icon: '◈' },
  { label: 'Launch Campaign', path: '/dashboard/launch', icon: '>' },
  { section: 'Platforms' },
  { label: 'Meta', path: '/dashboard/meta', icon: '◉' },
  { label: 'Google', path: '/dashboard/google', icon: '◎' },
  { label: 'TikTok', path: '/dashboard/tiktok', icon: '◐' },
  { section: 'Tools' },
  { label: 'Wanda AI', path: '/dashboard/wanda', icon: '✦' },
  { label: 'Creatives', path: '/dashboard/creatives', icon: '◆' },
  { label: 'Competitors', path: '/dashboard/competitors', icon: '⊘' },
  { label: 'Automation', path: '/dashboard/automation', icon: '↻' },
  { label: 'Pipeline', path: '/dashboard/pipeline', icon: '⊞' },
  { label: 'Data Tracker', path: '/dashboard/tracker', icon: '⊛' },
  { label: 'Settings', path: '/dashboard/settings', icon: '⊕' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<{ email?: string; full_name?: string } | null>(null);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser({ email: data.user.email, full_name: data.user.user_metadata?.full_name });
    });
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{ width: 'var(--sidebar-w)', minWidth: 'var(--sidebar-w)', height: '100vh', background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '0 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 8px 16px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
          <div style={{ width: 30, height: 30, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13, color: '#fff', letterSpacing: -0.5 }}>A</div>
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: -0.5, color: 'var(--text)' }}>APEX</span>
          <span style={{ fontSize: 9, fontWeight: 700, background: 'var(--accent-dim)', color: 'var(--accent)', padding: '2px 6px', borderRadius: 100, marginLeft: 'auto', border: '1px solid var(--accent-glow)', letterSpacing: 0.5 }}>BETA</span>
        </div>

        {navItems.map((item, i) => {
          if ('section' in item) {
            return <div key={i} style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.8, color: 'var(--dim)', padding: '12px 8px 4px', textTransform: 'uppercase' }}>{item.section}</div>;
          }
          const active = pathname === item.path;
          return (
            <div
              key={item.path}
              onClick={() => router.push(item.path!)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10,
                cursor: 'pointer', transition: 'all 0.15s',
                color: active ? 'var(--accent)' : 'var(--muted)',
                background: active ? 'var(--accent-dim)' : 'transparent',
                fontWeight: active ? 600 : 500, fontSize: 13.5, marginBottom: 1,
              }}
            >
              <span style={{ fontSize: 14, opacity: active ? 1 : 0.7, width: 16 }}>{item.icon}</span>
              {item.label}
            </div>
          );
        })}

        <div style={{ padding: '12px 0', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, cursor: 'pointer' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, var(--accent), var(--accent2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>
              {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>{user?.full_name || 'User'}</div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{user?.email}</div>
            </div>
          </div>
          <div onClick={handleLogout} style={{ fontSize: 12, color: 'var(--muted)', padding: '6px 10px', cursor: 'pointer', marginTop: 4 }}>Sign out</div>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <header style={{ height: 'var(--header-h)', minHeight: 'var(--header-h)', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>
              {navItems.find(n => 'path' in n && n.path === pathname)?.label || 'Dashboard'}
            </h1>
          </div>
          <div style={{ flex: 1 }} />
          <select style={{ padding: '7px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12.5, color: 'var(--muted)', cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}>
            <option>Last 7 days</option>
            <option>Last 14 days</option>
            <option selected>Last 30 days</option>
            <option>Last 60 days</option>
            <option>Last 90 days</option>
          </select>
          <button onClick={() => setDarkMode(!darkMode)} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--muted)', fontSize: 15 }}>
            {darkMode ? '☀' : '☾'}
          </button>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: 'var(--bg)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
