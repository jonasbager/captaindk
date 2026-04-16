import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

Deno.serve(async (req) => {
  try {
    const GOOGLE_GMAIL_CLIENT_ID = Deno.env.get('GOOGLE_GMAIL_CLIENT_ID')
    const GOOGLE_GMAIL_CLIENT_SECRET = Deno.env.get('GOOGLE_GMAIL_CLIENT_SECRET')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!GOOGLE_GMAIL_CLIENT_ID || !GOOGLE_GMAIL_CLIENT_SECRET || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables')
    }

    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const userId = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    if (error) {
      return Response.redirect(`${getAppUrl()}/integrationer?gmail=error&reason=${error}`, 302)
    }

    if (!code || !userId) {
      return Response.redirect(`${getAppUrl()}/integrationer?gmail=error&reason=missing_params`, 302)
    }

    const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/gmail-callback`

    // Exchange code for tokens
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_GMAIL_CLIENT_ID,
        client_secret: GOOGLE_GMAIL_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json()

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('Token exchange failed:', tokenData)
      return Response.redirect(`${getAppUrl()}/integrationer?gmail=error&reason=token_exchange_failed`, 302)
    }

    // Store tokens in email_connections using service role
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Upsert: update if gmail connection exists for this user, else insert
    const { error: dbError } = await supabase
      .from('email_connections')
      .upsert(
        {
          user_id: userId,
          provider: 'gmail',
          encrypted_access_token: tokenData.access_token,
          encrypted_refresh_token: tokenData.refresh_token || null,
          scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,provider' }
      )

    if (dbError) {
      console.error('DB insert error:', dbError)
      return Response.redirect(`${getAppUrl()}/integrationer?gmail=error&reason=db_error`, 302)
    }

    return Response.redirect(`${getAppUrl()}/integrationer?gmail=success`, 302)
  } catch (error) {
    console.error('Error in gmail-callback:', error)
    return Response.redirect(`${getAppUrl()}/integrationer?gmail=error&reason=server_error`, 302)
  }
})

function getAppUrl(): string {
  // Use the published app URL or preview URL
  return Deno.env.get('APP_URL') || 'https://captaindk.lovable.app'
}
