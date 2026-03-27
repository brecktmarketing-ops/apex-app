import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function updateUserPlan(stripeCustomerId: string, updates: Record<string, any>) {
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', stripeCustomerId)
    .limit(1);

  if (profiles?.[0]) {
    await supabaseAdmin.from('profiles').update(updates).eq('id', profiles[0].id);
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature')!;

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    // Checkout completed — user just subscribed
    case 'checkout.session.completed': {
      const session = event.data.object as any;
      const userId = session.metadata?.user_id;
      const plan = session.metadata?.plan;

      if (userId && plan) {
        await supabaseAdmin.from('profiles').update({
          plan,
          plan_status: 'active',
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
        }).eq('id', userId);
      }
      break;
    }

    // Subscription updated (plan change, renewal, trial end)
    case 'customer.subscription.updated': {
      const sub = event.data.object as any;
      const status = sub.status;

      // Map Stripe statuses to our plan_status
      let planStatus = 'active';
      if (status === 'past_due') planStatus = 'past_due';
      else if (status === 'unpaid') planStatus = 'unpaid';
      else if (status === 'canceled') planStatus = 'cancelled';
      else if (status === 'trialing') planStatus = 'trialing';
      else if (status === 'active') planStatus = 'active';

      await updateUserPlan(sub.customer, { plan_status: planStatus });
      break;
    }

    // Subscription cancelled
    case 'customer.subscription.deleted': {
      const sub = event.data.object as any;
      await updateUserPlan(sub.customer, {
        plan: 'free',
        plan_status: 'cancelled',
        stripe_subscription_id: null,
      });
      break;
    }

    // Payment failed — dunning
    case 'invoice.payment_failed': {
      const invoice = event.data.object as any;
      const attemptCount = invoice.attempt_count || 0;

      await updateUserPlan(invoice.customer, {
        plan_status: attemptCount >= 3 ? 'unpaid' : 'past_due',
      });
      break;
    }

    // Payment succeeded after dunning — reactivate
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as any;
      if (invoice.billing_reason === 'subscription_cycle' || invoice.billing_reason === 'subscription_update') {
        await updateUserPlan(invoice.customer, { plan_status: 'active' });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
