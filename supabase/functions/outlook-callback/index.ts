import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'

function getAppUrl(): string {
  return Deno.env.get('APP_URL') || 'https://captaindk.lovable.app'
}

Deno.serve(async (req) => {
  try {
    const MICROSOFT_CLIENT_ID = Deno.env.get('MICROSOFT_CLIENT_ID')
    const MICROSOFT_CLIENT_SECRET = Deno.env.get('MICROSOFT_CLIENT_SECRET')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response('Missing environment variables', { status: 500 })
    }

    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state') // user id
    const error = url.searchParams.get('error')

    if (error) {
      const desc = url.searchParams.get('error_description') || error
      console.error('Microsoft OAuth error:', desc)
      return Response.redirect(`${getAppUrl()}/integrationer?outlook=error&reason=${encodeURIComponent(desc)}`)
    }

    if (!code || !state) {
      return Response.redirect(`${getAppUrl()}/integrationer?outlook=error&reason=missing_code`)
    }

    const redirectUri = `${SUPABASE_URL}/functions/v1/outlook-callback`

    // Exchange code for tokens
    const tokenRes = await fetch(MICROSOFT_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID,
        client_secret: MICROSOFT_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        scope: 'openid email Mail.Read offline_access',
      }),
    })

    const tokenData = await tokenRes.json()

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('Token exchange failed:', tokenData)
      return Response.redirect(`${getAppUrl()}/integrationer?outlook=error&reason=token_exchange_failed`)
    }

    // Store tokens
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { error: upsertError } = await supabase
      .from('email_connections')
      .upsert({
        user_id: state,
        provider: 'outlook',
        encrypted_access_token: tokenData.access_token,
        encrypted_refresh_token: tokenData.refresh_token || null,
        scopes: ['Mail.Read'],
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,provider' })

    if (upsertError) {
      console.error('Upsert error:', upsertError)
      return Response.redirect(`${getAppUrl()}/integrationer?outlook=error&reason=db_error`)
    }

    return Response.redirect(`${getAppUrl()}/integrationer?outlook=success`)
  } catch (error) {
    console.error('Error in outlook-callback:', error)
    return Response.redirect(`${getAppUrl()}/integrationer?outlook=error&reason=server_error`)
  }
})
