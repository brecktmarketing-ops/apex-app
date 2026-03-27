import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2026-03-25.dahlia',
});

export const PLANS = {
  starter: {
    name: 'Starter',
    price: 497,
    priceId: process.env.STRIPE_STARTER_PRICE_ID!,
    features: [
      'Up to 3 ad accounts',
      'Wanda AI (unlimited)',
      'Campaign sync & management',
      'Performance scoring',
      'Creative studio',
      'Pipeline CRM',
      'Email automation',
    ],
  },
  growth: {
    name: 'Growth',
    price: 997,
    priceId: process.env.STRIPE_GROWTH_PRICE_ID!,
    features: [
      'Up to 10 ad accounts',
      'Everything in Starter',
      'Competitor intelligence',
      'SMS automation',
      'Data tracker + Shopify sync',
      'Priority support',
      'Advanced kill/scale rules',
    ],
  },
  agency: {
    name: 'Agency',
    price: 0,
    priceId: process.env.STRIPE_AGENCY_PRICE_ID || '',
    features: [
      'Unlimited ad accounts',
      'Everything in Growth',
      'White-label dashboard',
      'Client sub-accounts',
      'Custom integrations',
      'Dedicated account manager',
    ],
  },
} as const;
