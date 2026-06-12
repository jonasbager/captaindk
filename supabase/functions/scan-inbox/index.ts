import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const GOOGLE_GMAIL_CLIENT_ID = Deno.env.get('GOOGLE_GMAIL_CLIENT_ID')
    const GOOGLE_GMAIL_CLIENT_SECRET = Deno.env.get('GOOGLE_GMAIL_CLIENT_SECRET')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!GOOGLE_GMAIL_CLIENT_ID || !GOOGLE_GMAIL_CLIENT_SECRET || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables')
    }

    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUser = createClient(
      SUPABASE_URL,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get user's Gmail connection using service role
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: connection, error: connError } = await supabase
      .from('email_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'gmail')
      .single()

    if (connError || !connection) {
      return new Response(JSON.stringify({ error: 'Gmail not connected' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Refresh the access token
    let accessToken = connection.encrypted_access_token

    if (connection.encrypted_refresh_token) {
      const refreshRes = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_GMAIL_CLIENT_ID,
          client_secret: GOOGLE_GMAIL_CLIENT_SECRET,
          refresh_token: connection.encrypted_refresh_token,
          grant_type: 'refresh_token',
        }),
      })

      const refreshData = await refreshRes.json()
      if (refreshRes.ok && refreshData.access_token) {
        accessToken = refreshData.access_token
        // Update stored access token
        await supabase
          .from('email_connections')
          .update({
            encrypted_access_token: accessToken,
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

    // Mode fra request body: incremental (default, siden sidste scan), full (90 dage), all (alt)
    let mode: 'incremental' | 'full' | 'all' = 'incremental'
    try {
      const body = await req.json()
      if (body?.mode === 'full' || body?.mode === 'all') mode = body.mode
    } catch { /* no body */ }

    const nowIso = new Date().toISOString()
    let afterEpoch: number | null = null
    if (mode === 'incremental') {
      const sinceMs = connection.last_scanned_at
        ? new Date(connection.last_scanned_at).getTime()
        : Date.now() - 90 * 24 * 60 * 60 * 1000
      afterEpoch = Math.floor(sinceMs / 1000)
    } else if (mode === 'full') {
      afterEpoch = Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000)
    }

    const subjectQ = '(subject:kvittering OR subject:receipt OR subject:invoice OR subject:faktura OR subject:rechnung OR subject:order OR subject:ordre OR subject:bon OR subject:betalt OR subject:betaling OR subject:payment OR subject:bekræftelse OR subject:confirmation)'
    const query = `${subjectQ} has:attachment${afterEpoch ? ` after:${afterEpoch}` : ''}`

    // Gennemløb hele vinduet med pagination (Gmail filtrerer keywords/attachments server-side)
    const messages: any[] = []
    let pageToken: string | null = null
    let pages = 0
    const maxPages = mode === 'all' ? 20 : 10
    do {
      const pageParam: string = pageToken ? `&pageToken=${pageToken}` : ''
      const searchRes = await fetch(
        `${GMAIL_API}/users/me/messages?q=${encodeURIComponent(query)}&maxResults=100${pageParam}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      const searchData = await searchRes.json()
      if (!searchRes.ok) {
        console.error('Gmail search failed:', searchData)
        return new Response(JSON.stringify({ error: 'Gmail API error', details: searchData }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      messages.push(...(searchData.messages || []))
      pageToken = searchData.nextPageToken || null
      pages++
    } while (pageToken && pages < maxPages)
    const results: Array<{ messageId: string; subject: string; from: string; status: string }> = []

    for (const msg of messages) {
      // Get message details
      const msgRes = await fetch(
        `${GMAIL_API}/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )

      const msgData = await msgRes.json()
      if (!msgRes.ok) continue

      const headers = msgData.payload?.headers || []
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'Ingen emne'
      const from = headers.find((h: any) => h.name === 'From')?.value || 'Ukendt'
      const dateStr = headers.find((h: any) => h.name === 'Date')?.value

      // Check if already imported — file_url bærer message-id (vendor er afsenderen)
      const { data: existing } = await supabase
        .from('documents')
        .select('id')
        .eq('company_id', company.id)
        .eq('source', 'gmail')
        .eq('file_url', `gmail:${msg.id}`)
        .maybeSingle()

      if (existing) {
        results.push({ messageId: msg.id, subject, from, status: 'already_imported' })
        continue
      }

      // Create document
      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          company_id: company.id,
          vendor: from,
          date: dateStr ? new Date(dateStr).toISOString().split('T')[0] : null,
          source: 'gmail',
          status: 'pending',
          file_url: `gmail:${msg.id}`,
        })

      results.push({
        messageId: msg.id,
        subject,
        from,
        status: insertError ? 'error' : 'imported',
      })
    }

    // Opdater last_scanned_at så incremental-mode virker
    await supabase.from('email_connections')
      .update({ last_scanned_at: nowIso, updated_at: nowIso })
      .eq('id', connection.id)

    return new Response(JSON.stringify({
      mode,
      examined: messages.length,
      scanned: messages.length,
      imported: results.filter(r => r.status === 'imported').length,
      results
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in scan-inbox:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
