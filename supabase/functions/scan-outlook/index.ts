import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
const GRAPH_API = 'https://graph.microsoft.com/v1.0'

const ALLOWED_MIME = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/heic',
]

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
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } })

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: connection, error: connError } = await supabase
      .from('email_connections').select('*').eq('user_id', user.id).eq('provider', 'outlook').single()

    if (connError || !connection) {
      return new Response(JSON.stringify({ error: 'Outlook not connected' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

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
        await supabase.from('email_connections').update({
          encrypted_access_token: accessToken,
          encrypted_refresh_token: refreshData.refresh_token || connection.encrypted_refresh_token,
          updated_at: new Date().toISOString(),
        }).eq('id', connection.id)
      }
    }

    const { data: company } = await supabase
      .from('companies').select('id').eq('owner_id', user.id).single()

    if (!company) {
      return new Response(JSON.stringify({ error: 'No company found' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse mode from request body: "incremental" (default), "full" (90 days), or "all" (no date filter)
    let mode: 'incremental' | 'full' | 'all' = 'incremental'
    try {
      const body = await req.json()
      if (body?.mode === 'full' || body?.mode === 'all') mode = body.mode
    } catch { /* no body */ }

    // Determine date cutoff
    let sinceIso: string | null = null
    const nowIso = new Date().toISOString()
    if (mode === 'incremental') {
      // Use last_scanned_at, fallback to 90 days if never scanned
      sinceIso = connection.last_scanned_at
        ? new Date(connection.last_scanned_at).toISOString()
        : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    } else if (mode === 'full') {
      sinceIso = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    }
    // mode === 'all' → sinceIso stays null

    // Microsoft Graph rejects contains() + $orderby + date filter combined ("InefficientFilter").
    // Strategy: filter only by hasAttachments + date on the server, sort by date, then filter
    // keywords client-side. Page through results to find enough keyword matches.
    const keywords = ['kvittering', 'receipt', 'faktura', 'invoice', 'bon', 'order', 'ordre', 'betalt']
    let filter = `hasAttachments eq true`
    if (sinceIso) filter += ` and receivedDateTime ge ${sinceIso}`

    const pageSize = mode === 'all' ? 100 : 50
    const maxPages = mode === 'all' ? 10 : 4
    let url: string | null = `${GRAPH_API}/me/messages?$filter=${encodeURIComponent(filter)}&$top=${pageSize}&$orderby=receivedDateTime desc&$select=id,subject,from,receivedDateTime,hasAttachments`

    const allMessages: any[] = []
    let pages = 0
    while (url && pages < maxPages) {
      console.log('Outlook scan page', pages + 1, 'url:', url)
      const searchRes = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
      const searchData = await searchRes.json()
      if (!searchRes.ok) {
        console.error('Outlook search failed:', searchData)
        return new Response(JSON.stringify({ error: 'Outlook API error', details: searchData }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const matched = (searchData.value || []).filter((m: any) => {
        if (!m.hasAttachments) return false
        const subj = (m.subject || '').toLowerCase()
        return keywords.some(k => subj.includes(k))
      })
      allMessages.push(...matched)
      url = searchData['@odata.nextLink'] || null
      pages++
    }
    console.log('Outlook scan mode:', mode, 'since:', sinceIso, 'matched:', allMessages.length)
    const results: any[] = []

    for (const msg of allMessages) {
      const subject = msg.subject || 'Ingen emne'
      const from = msg.from?.emailAddress?.address || 'Ukendt'
      const receivedAt = msg.receivedDateTime

      // Fetch attachments for this message
      const attRes = await fetch(
        `${GRAPH_API}/me/messages/${msg.id}/attachments?$select=id,name,contentType,size,@odata.type`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      const attData = await attRes.json()
      if (!attRes.ok) {
        console.error('Attachment list failed for', msg.id, attData)
        results.push({ messageId: msg.id, subject, status: 'error_listing_attachments' })
        continue
      }

      const fileAttachments = (attData.value || []).filter((a: any) =>
        a['@odata.type'] === '#microsoft.graph.fileAttachment' &&
        ALLOWED_MIME.includes((a.contentType || '').toLowerCase())
      )

      if (fileAttachments.length === 0) {
        results.push({ messageId: msg.id, subject, status: 'no_supported_attachment' })
        continue
      }

      for (const att of fileAttachments) {
        // Dedup
        const { data: existing } = await supabase
          .from('documents').select('id')
          .eq('company_id', company.id)
          .eq('outlook_message_id', msg.id)
          .eq('attachment_id', att.id)
          .maybeSingle()

        if (existing) {
          results.push({ messageId: msg.id, attachmentId: att.id, status: 'already_imported' })
          continue
        }

        // Get attachment binary content
        const contentRes = await fetch(
          `${GRAPH_API}/me/messages/${msg.id}/attachments/${att.id}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )
        const contentJson = await contentRes.json()
        const contentBytesB64: string | undefined = contentJson.contentBytes
        if (!contentBytesB64) {
          results.push({ messageId: msg.id, attachmentId: att.id, status: 'no_content' })
          continue
        }

        const binary = Uint8Array.from(atob(contentBytesB64), c => c.charCodeAt(0))
        const ext = (att.name || '').split('.').pop()?.toLowerCase() || 'bin'

        // Insert document row first to get id
        const { data: insertedDoc, error: insertError } = await supabase
          .from('documents').insert({
            company_id: company.id,
            vendor: from,
            date: receivedAt ? new Date(receivedAt).toISOString().split('T')[0] : null,
            source: 'outlook',
            status: 'pending',
            ocr_status: 'pending',
            outlook_message_id: msg.id,
            attachment_id: att.id,
            mime_type: att.contentType,
            subject,
            received_at: receivedAt,
            file_url: `outlook:${msg.id}:${att.id}`,
          })
          .select('id').single()

        if (insertError || !insertedDoc) {
          console.error('Insert failed:', insertError)
          results.push({ messageId: msg.id, attachmentId: att.id, status: 'insert_error' })
          continue
        }

        const storagePath = `${company.id}/${insertedDoc.id}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('receipts').upload(storagePath, binary, {
            contentType: att.contentType,
            upsert: true,
          })

        if (uploadError) {
          console.error('Upload failed:', uploadError)
          results.push({ messageId: msg.id, attachmentId: att.id, status: 'upload_error' })
          continue
        }

        await supabase.from('documents').update({ storage_path: storagePath }).eq('id', insertedDoc.id)

        // Trigger OCR (fire-and-forget) so scan returns quickly
        supabase.functions.invoke('extract-receipt', {
          body: { document_id: insertedDoc.id },
        }).catch(e => console.error('extract-receipt invoke failed:', e))

        results.push({ messageId: msg.id, attachmentId: att.id, status: 'imported', documentId: insertedDoc.id })
      }
    }

    // Update last_scanned_at on success
    await supabase.from('email_connections')
      .update({ last_scanned_at: nowIso, updated_at: nowIso })
      .eq('id', connection.id)

    return new Response(JSON.stringify({
      mode,
      since: sinceIso,
      scanned: allMessages.length,
      imported: results.filter(r => r.status === 'imported').length,
      results,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in scan-outlook:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
