import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, PLANS } from '@/lib/stripe';

// POST - Create checkout session
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { plan } = await request.json();
    const planData = PLANS[plan as keyof typeof PLANS];

    if (!planData || !planData.priceId) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Check if user already has a Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://apex-app-ecru.vercel.app';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: planData.priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard/billing?billing=success`,
      cancel_url: `${appUrl}/dashboard/billing?billing=cancelled`,
      subscription_data: {
        trial_period_days: 14,
        metadata: { user_id: user.id, plan },
      },
      payment_method_collection: 'if_required',
      metadata: { user_id: user.id, plan },
    }, {
      idempotencyKey: `checkout_${user.id}_${plan}_${Date.now()}`,
    });

    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error('Billing error:', error);
    return NextResponse.json({ error: error.message || 'Billing error' }, { status: 500 });
  }
}

// GET - Get current subscription status
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, plan, plan_status')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ plan: 'free', status: 'none' });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: 'active',
      limit: 1,
    });

    const sub = subscriptions.data[0];
    if (!sub) {
      return NextResponse.json({ plan: profile.plan || 'free', status: 'inactive' });
    }

    return NextResponse.json({
      plan: profile.plan || 'starter',
      status: sub.status,
      currentPeriodEnd: (sub as any).current_period_end,
      cancelAtPeriodEnd: (sub as any).cancel_at_period_end,
    });

  } catch (error: any) {
    console.error('Billing status error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
