import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
const GRAPH_API = 'https://graph.microsoft.com/v1.0'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const MICROSOFT_CLIENT_ID = Deno.env.get('MICROSOFT_CLIENT_ID')
    const MICROSOFT_CLIENT_SECRET = Deno.env.get('MICROSOFT_CLIENT_SECRET')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables')
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUser = createClient(
      SUPABASE_URL,
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: connection, error: connError } = await supabase
      .from('email_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'outlook')
      .single()

    if (connError || !connection) {
      return new Response(JSON.stringify({ error: 'Outlook not connected' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Refresh access token
    let accessToken = connection.encrypted_access_token

    if (connection.encrypted_refresh_token) {
      const refreshRes = await fetch(MICROSOFT_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: MICROSOFT_CLIENT_ID,
          client_secret: MICROSOFT_CLIENT_SECRET,
          refresh_token: connection.encrypted_refresh_token,
          grant_type: 'refresh_token',
          scope: 'openid email Mail.Read offline_access',
        }),
      })

      const refreshData = await refreshRes.json()
      if (refreshRes.ok && refreshData.access_token) {
        accessToken = refreshData.access_token
        await supabase
          .from('email_connections')
          .update({
            encrypted_access_token: accessToken,
            encrypted_refresh_token: refreshData.refresh_token || connection.encrypted_refresh_token,
            updated_at: new Date().toISOString(),
          })
          .eq('id', connection.id)
      }
    }

    // Get user's company
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!company) {
      return new Response(JSON.stringify({ error: 'No company found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Search Outlook for receipt-like emails from last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const filter = `receivedDateTime ge ${sevenDaysAgo} and hasAttachments eq true`
    const search = '"kvittering" OR "receipt" OR "invoice" OR "faktura" OR "rechnung" OR "order"'

    const searchRes = await fetch(
      `${GRAPH_API}/me/messages?$filter=${encodeURIComponent(filter)}&$search=${encodeURIComponent(search)}&$top=20&$select=id,subject,from,receivedDateTime&$orderby=receivedDateTime desc`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    const searchData = await searchRes.json()

    if (!searchRes.ok) {
      console.error('Outlook search failed:', searchData)
      return new Response(JSON.stringify({ error: 'Outlook API error', details: searchData }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const messages = searchData.value || []
    const results: Array<{ messageId: string; subject: string; from: string; status: string }> = []

    for (const msg of messages) {
      const subject = msg.subject || 'Ingen emne'
      const from = msg.from?.emailAddress?.address || 'Ukendt'
      const dateStr = msg.receivedDateTime

      // Check if already imported
      const { data: existing } = await supabase
        .from('documents')
        .select('id')
        .eq('company_id', company.id)
        .eq('source', 'outlook')
        .eq('vendor', `outlook:${msg.id}`)
        .single()

      if (existing) {
        results.push({ messageId: msg.id, subject, from, status: 'already_imported' })
        continue
      }

      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          company_id: company.id,
          vendor: from,
          date: dateStr ? new Date(dateStr).toISOString().split('T')[0] : null,
          source: 'outlook',
          status: 'pending',
          file_url: `outlook:${msg.id}`,
        })

      results.push({
        messageId: msg.id,
        subject,
        from,
        status: insertError ? 'error' : 'imported',
      })
    }

    return new Response(JSON.stringify({
      scanned: messages.length,
      results,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in scan-outlook:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
