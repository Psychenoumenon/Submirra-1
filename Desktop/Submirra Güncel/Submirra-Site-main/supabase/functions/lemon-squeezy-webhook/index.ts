import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const LEMON_SQUEEZY_WEBHOOK_SECRET = Deno.env.get('LEMON_SQUEEZY_WEBHOOK_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  try {
    const signature = req.headers.get('x-signature')
    const rawBody = await req.text()
    
    if (!signature) {
      return new Response(JSON.stringify({ error: 'Missing signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const hmac = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(LEMON_SQUEEZY_WEBHOOK_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signature_bytes = await crypto.subtle.sign(
      'HMAC',
      hmac,
      new TextEncoder().encode(rawBody)
    )

    const computed_signature = Array.from(new Uint8Array(signature_bytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    if (computed_signature !== signature) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const event = JSON.parse(rawBody)
    const eventName = event.meta?.event_name
    const customData = event.meta?.custom_data
    const userId = customData?.user_id

    console.log('Webhook event:', eventName, 'User ID:', userId)

    switch (eventName) {
      case 'subscription_created':
        await handleSubscriptionCreated(event, userId)
        break
      
      case 'subscription_updated':
        await handleSubscriptionUpdated(event, userId)
        break
      
      case 'subscription_cancelled':
        await handleSubscriptionCancelled(event, userId)
        break
      
      case 'subscription_payment_failed':
        await handlePaymentFailed(event, userId)
        break
      
      case 'subscription_payment_success':
        await handlePaymentSuccess(event, userId)
        break
      
      default:
        console.log('Unhandled event:', eventName)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

async function handleSubscriptionCreated(event: any, userId: string) {
  const subscription = event.data
  const attributes = subscription.attributes
  const variantId = attributes.variant_id.toString()
  const productId = attributes.product_id.toString()
  
  // Live mode Product IDs
  const STANDARD_PRODUCT_ID = '733207'
  const PREMIUM_PRODUCT_ID = '733209'
  
  const planType = productId === STANDARD_PRODUCT_ID 
    ? 'standard' 
    : productId === PREMIUM_PRODUCT_ID 
      ? 'premium' 
      : 'standard'

  const { error } = await supabase
    .from('subscriptions')
    .update({
      plan_type: planType,
      lemon_squeezy_subscription_id: subscription.id,
      lemon_squeezy_customer_id: attributes.customer_id.toString(),
      lemon_squeezy_variant_id: variantId,
      lemon_squeezy_product_id: productId,
      status: 'active',
      subscription_start_date: new Date(attributes.created_at).toISOString(),
      subscription_ends_at: attributes.ends_at ? new Date(attributes.ends_at).toISOString() : null,
      payment_failed: false,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) {
    console.error('Error updating subscription:', error)
    throw error
  }

  console.log(`Subscription created for user ${userId}, plan: ${planType}`)
}

async function handleSubscriptionUpdated(event: any, userId: string) {
  const subscription = event.data
  const attributes = subscription.attributes
  const variantId = attributes.variant_id.toString()
  
  const planType = variantId === Deno.env.get('VITE_LEMON_VARIANT_ID_STANDARD')
    ? 'standard'
    : 'premium'

  const updateData: any = {
    plan_type: planType,
    lemon_squeezy_variant_id: variantId,
    status: attributes.status === 'cancelled' ? 'cancelled' : 'active',
    subscription_ends_at: attributes.ends_at ? new Date(attributes.ends_at).toISOString() : null,
    is_paused: attributes.status === 'paused',
    payment_failed: false,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('subscriptions')
    .update(updateData)
    .eq('lemon_squeezy_subscription_id', subscription.id)

  if (error) {
    console.error('Error updating subscription:', error)
    throw error
  }

  console.log(`Subscription updated for subscription ${subscription.id}`)
}

async function handleSubscriptionCancelled(event: any, userId: string) {
  const subscription = event.data
  const attributes = subscription.attributes

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      plan_type: 'free',
      subscription_ends_at: attributes.ends_at ? new Date(attributes.ends_at).toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('lemon_squeezy_subscription_id', subscription.id)

  if (error) {
    console.error('Error cancelling subscription:', error)
    throw error
  }

  const { data: subData } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('lemon_squeezy_subscription_id', subscription.id)
    .single()

  if (subData) {
    await supabase
      .from('notifications')
      .insert({
        user_id: subData.user_id,
        type: 'subscription_cancelled',
        actor_id: null,
        dream_id: null,
      })
  }

  console.log(`Subscription cancelled for subscription ${subscription.id}`)
}

async function handlePaymentFailed(event: any, userId: string) {
  const subscription = event.data
  
  const { error } = await supabase
    .from('subscriptions')
    .update({
      payment_failed: true,
      updated_at: new Date().toISOString(),
    })
    .eq('lemon_squeezy_subscription_id', subscription.id)

  if (error) {
    console.error('Error marking payment as failed:', error)
    throw error
  }

  const { data: subData } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('lemon_squeezy_subscription_id', subscription.id)
    .single()

  if (subData) {
    await supabase
      .from('notifications')
      .insert({
        user_id: subData.user_id,
        type: 'payment_failed',
        actor_id: null,
        dream_id: null,
      })

    await supabase
      .from('subscriptions')
      .update({
        plan_type: 'free',
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', subData.user_id)
  }

  console.log(`Payment failed for subscription ${subscription.id}`)
}

async function handlePaymentSuccess(event: any, userId: string) {
  const subscription = event.data
  
  const { error } = await supabase
    .from('subscriptions')
    .update({
      payment_failed: false,
      updated_at: new Date().toISOString(),
    })
    .eq('lemon_squeezy_subscription_id', subscription.id)

  if (error) {
    console.error('Error marking payment as success:', error)
    throw error
  }

  console.log(`Payment success for subscription ${subscription.id}`)
}
