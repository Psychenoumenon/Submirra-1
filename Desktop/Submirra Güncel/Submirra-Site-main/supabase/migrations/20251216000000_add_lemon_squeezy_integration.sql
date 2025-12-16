/*
  # Add Lemon Squeezy Integration
  
  This migration adds Lemon Squeezy payment integration fields to subscriptions table
*/

-- Add Lemon Squeezy fields to subscriptions table
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS lemon_squeezy_subscription_id text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS lemon_squeezy_customer_id text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS lemon_squeezy_variant_id text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS lemon_squeezy_product_id text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS subscription_ends_at timestamptz;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS is_paused boolean DEFAULT false;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_failed boolean DEFAULT false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_lemon_subscription_id ON subscriptions(lemon_squeezy_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_lemon_customer_id ON subscriptions(lemon_squeezy_customer_id);

-- Add comments
COMMENT ON COLUMN subscriptions.lemon_squeezy_subscription_id IS 'Lemon Squeezy subscription ID';
COMMENT ON COLUMN subscriptions.lemon_squeezy_customer_id IS 'Lemon Squeezy customer ID';
COMMENT ON COLUMN subscriptions.lemon_squeezy_variant_id IS 'Lemon Squeezy product variant ID';
COMMENT ON COLUMN subscriptions.lemon_squeezy_product_id IS 'Lemon Squeezy product ID';
COMMENT ON COLUMN subscriptions.subscription_ends_at IS 'Subscription end date (for cancelled subscriptions)';
COMMENT ON COLUMN subscriptions.is_paused IS 'Whether subscription is paused';
COMMENT ON COLUMN subscriptions.payment_failed IS 'Whether last payment failed';
