import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    case 'customer.subscription.updated': {
      const sub = event.data.object as any;
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', sub.customer)
        .limit(1);

      if (profiles?.[0]) {
        await supabaseAdmin.from('profiles').update({
          plan_status: sub.status === 'active' ? 'active' : 'inactive',
        }).eq('id', profiles[0].id);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as any;
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', sub.customer)
        .limit(1);

      if (profiles?.[0]) {
        await supabaseAdmin.from('profiles').update({
          plan: 'free',
          plan_status: 'cancelled',
          stripe_subscription_id: null,
        }).eq('id', profiles[0].id);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
