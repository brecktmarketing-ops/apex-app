-- WooCommerce integration
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS woocommerce_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS woocommerce_key TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS woocommerce_secret TEXT;

-- Stripe revenue tracking (separate from billing key)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_revenue_key TEXT;

-- Business type for customizing the dashboard experience
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT 'ecom';
