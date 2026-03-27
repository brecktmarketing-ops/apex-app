'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

const PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    price: 497,
    desc: 'For solo advertisers ready to scale',
    features: [
      'Up to 3 ad accounts',
      'Wanda AI (unlimited)',
      'Campaign sync & management',
      'Performance scoring',
      'Creative studio',
      'Pipeline CRM',
      'Email automation',
    ],
    cta: 'Start Free Trial',
  },
  {
    key: 'growth',
    name: 'Growth',
    price: 997,
    desc: 'For growing businesses and teams',
    popular: true,
    features: [
      'Up to 10 ad accounts',
      'Everything in Starter',
      'Competitor intelligence',
      'SMS automation',
      'Shopify data sync',
      'Priority support',
      'Advanced kill/scale rules',
    ],
    cta: 'Start Free Trial',
  },
  {
    key: 'agency',
    name: 'Agency',
    price: null,
    desc: 'For agencies managing multiple clients',
    features: [
      'Unlimited ad accounts',
      'Everything in Growth',
      'White-label dashboard',
      'Client sub-accounts',
      'Custom integrations',
      'Dedicated account manager',
    ],
    cta: 'Contact Us',
  },
];

export default function BillingPage() {
  const supabase = createClient();
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [planStatus, setPlanStatus] = useState<string>('none');
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  useEffect(() => {
    async function loadBilling() {
      try {
        const res = await fetch('/api/billing');
        const data = await res.json();
        setCurrentPlan(data.plan || 'free');
        setPlanStatus(data.status || 'none');
      } catch {}
      setLoading(false);
    }
    loadBilling();
  }, []);

  async function handleCheckout(planKey: string) {
    if (planKey === 'agency') {
      window.open('mailto:brecken@backendbranding.com?subject=APEX Agency Plan Inquiry', '_blank');
      return;
    }

    setCheckingOut(planKey);
    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to create checkout session');
      }
    } catch (e: any) {
      alert('Checkout error: ' + e.message);
    }
    setCheckingOut(null);
  }

  async function handleManage() {
    // Redirect to Stripe customer portal
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {}
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>Billing</h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Manage your subscription and plan</p>
      </div>

      {/* Current Plan Banner */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Current Plan</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, textTransform: 'capitalize' }}>
            {loading ? '...' : currentPlan === 'free' ? 'Free Trial' : currentPlan}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            {planStatus === 'active' ? 'Active subscription' : planStatus === 'cancelled' ? 'Cancelled — access until period end' : 'No active subscription'}
          </div>
        </div>
        {planStatus === 'active' && (
          <button onClick={handleManage} style={{ padding: '10px 20px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text)' }}>
            Manage Subscription
          </button>
        )}
      </div>

      {/* Plan Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        {PLANS.map(plan => {
          const isCurrent = currentPlan === plan.key;
          return (
            <div key={plan.key} style={{
              background: 'var(--card)', border: plan.popular ? '2px solid var(--accent)' : '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: 28, position: 'relative',
              boxShadow: plan.popular ? '0 0 40px rgba(16,185,129,0.08)' : 'var(--shadow)',
            }}>
              {plan.popular && (
                <div style={{
                  position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--accent)', color: '#fff', fontSize: 11, fontWeight: 700,
                  padding: '4px 14px', borderRadius: 20, letterSpacing: 0.3,
                }}>Most Popular</div>
              )}

              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{plan.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>{plan.desc}</div>

              <div style={{ marginBottom: 20 }}>
                {plan.price !== null ? (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>$</span>
                    <span style={{ fontSize: 40, fontWeight: 900, letterSpacing: -2, color: plan.popular ? 'var(--accent)' : 'var(--text)' }}>{plan.price}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>/mo</span>
                  </div>
                ) : (
                  <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -1 }}>Custom</div>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginBottom: 20 }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0' }}>
                    <span style={{ color: 'var(--accent)', fontSize: 14, fontWeight: 700 }}>+</span>
                    <span style={{ fontSize: 13, color: 'var(--text)' }}>{f}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => !isCurrent && handleCheckout(plan.key)}
                disabled={isCurrent || checkingOut === plan.key}
                style={{
                  width: '100%', padding: '14px 0', borderRadius: 10, fontSize: 14, fontWeight: 700,
                  cursor: isCurrent ? 'default' : 'pointer', fontFamily: 'inherit', border: 'none',
                  background: isCurrent ? 'var(--card2)' : plan.popular ? 'var(--accent)' : 'var(--bg)',
                  color: isCurrent ? 'var(--muted)' : plan.popular ? '#fff' : 'var(--text)',
                  opacity: checkingOut === plan.key ? 0.6 : 1,
                  boxShadow: plan.popular && !isCurrent ? '0 4px 20px rgba(16,185,129,0.25)' : 'none',
                }}
              >
                {isCurrent ? 'Current Plan' : checkingOut === plan.key ? 'Redirecting...' : plan.cta}
              </button>
            </div>
          );
        })}
      </div>

      {/* 14-day guarantee */}
      <div style={{ textAlign: 'center', marginTop: 32, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>14-Day Free Trial</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Try APEX risk-free. Cancel anytime — no questions asked.</div>
      </div>
    </div>
  );
}
