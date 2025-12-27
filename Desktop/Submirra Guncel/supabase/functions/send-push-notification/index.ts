// Supabase Edge Function for sending push notifications via FCM V1 API
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PushNotification {
  id: string
  user_id: string
  title: string
  body: string
  data: Record<string, any>
}

// Get OAuth2 access token from Firebase Service Account
async function getAccessToken(serviceAccount: any): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  }

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }

  // Create JWT
  const encoder = new TextEncoder()
  const headerB64 = btoa(JSON.stringify(header))
  const payloadB64 = btoa(JSON.stringify(payload))
  const unsignedToken = `${headerB64}.${payloadB64}`

  // Import private key
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    encoder.encode(serviceAccount.private_key),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  )

  // Sign the token
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    encoder.encode(unsignedToken)
  )

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
  const jwt = `${unsignedToken}.${signatureB64}`

  // Exchange JWT for access token
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  const result = await response.json()
  return result.access_token
}

// Send notification via FCM V1 API
async function sendFCMNotification(
  token: string,
  title: string,
  body: string,
  data: Record<string, any>,
  accessToken: string,
  projectId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`
    
    const response = await fetch(fcmUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        message: {
          token: token,
          notification: {
            title,
            body,
          },
          data: {
            ...data,
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
          },
          android: {
            priority: 'HIGH',
            notification: {
              sound: 'default',
              channel_id: 'submirra_notifications',
              icon: 'ic_notification',
              color: '#A855F7',
            },
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
                alert: {
                  title,
                  body,
                },
              },
            },
          },
          webpush: {
            notification: {
              title,
              body,
              icon: '/icons/icon-192x192.png',
              badge: '/icons/icon-72x72.png',
            },
            fcm_options: {
              link: 'https://submirra.com',
            },
          },
        },
      }),
    })

    if (response.ok) {
      return { success: true }
    } else {
      const error = await response.text()
      return { success: false, error: error || 'Unknown FCM error' }
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

serve(async (req: any) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Firebase Service Account JSON from environment
    const firebaseServiceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
    if (!firebaseServiceAccountJson) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT not configured')
    }

    const serviceAccount = JSON.parse(firebaseServiceAccountJson)
    const projectId = serviceAccount.project_id

    // Get access token
    const accessToken = await getAccessToken(serviceAccount)

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get pending notifications from queue
    const { data: pendingNotifications, error: fetchError } = await supabase
      .from('push_notification_queue')
      .select('*')
      .eq('status', 'pending')
      .limit(100)

    if (fetchError) {
      throw fetchError
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending notifications', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let successCount = 0
    let failCount = 0

    // Process each notification
    for (const notification of pendingNotifications as PushNotification[]) {
      // Get user's device tokens
      const { data: tokens, error: tokensError } = await supabase
        .rpc('get_user_device_tokens', { target_user_id: notification.user_id })

      if (tokensError || !tokens || tokens.length === 0) {
        // No tokens, mark as failed
        await supabase
          .from('push_notification_queue')
          .update({ 
            status: 'failed', 
            error_message: 'No device tokens found',
            sent_at: new Date().toISOString()
          })
          .eq('id', notification.id)
        failCount++
        continue
      }

      // Send to all user's devices
      let sentToAny = false
      const errors: string[] = []

      for (const { token, platform } of tokens) {
        const result = await sendFCMNotification(
          token,
          notification.title,
          notification.body,
          notification.data,
          accessToken,
          projectId
        )

        if (result.success) {
          sentToAny = true
        } else {
          errors.push(`${platform}: ${result.error}`)
          
          // If token is invalid, mark it as inactive
          if (result.error === 'NotRegistered' || result.error === 'InvalidRegistration') {
            await supabase
              .from('device_tokens')
              .update({ is_active: false })
              .eq('token', token)
          }
        }
      }

      // Update notification status
      if (sentToAny) {
        await supabase
          .from('push_notification_queue')
          .update({ 
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', notification.id)
        successCount++
      } else {
        await supabase
          .from('push_notification_queue')
          .update({ 
            status: 'failed',
            error_message: errors.join('; '),
            sent_at: new Date().toISOString()
          })
          .eq('id', notification.id)
        failCount++
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Push notifications processed',
        processed: pendingNotifications.length,
        success: successCount,
        failed: failCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing push notifications:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
