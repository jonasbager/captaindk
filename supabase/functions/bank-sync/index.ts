import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ebFetch } from '../_shared/enablebanking.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Sync bank transactions into public.transactions.
// Body (all optional): { company_id } — limit to one company; otherwise sync every active connection.
// Call it three ways:
//   1. From the UI ("Synk nu") with the user's JWT
//   2. From bank-callback with the service role key (initial import)
//   3. From pg_cron / scheduled invocation (nightly)
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    let companyId: string | null = null
    try { companyId = (await req.json())?.company_id ?? null } catch (_) { /* empty body ok */ }

    let q = admin.from('bank_connections').select('*').eq('status', 'active')
    if (companyId) q = q.eq('company_id', companyId)
    const { data: connections, error } = await q
    if (error) throw error

    const summary: any[] = []

    for (const conn of connections || []) {
      // Consent expired? Flag it so the UI can ask the user to renew.
      if (conn.valid_until && new Date(conn.valid_until) < new Date()) {
        await admin.from('bank_connections').update({ status: 'expired' }).eq('id', conn.id)
        summary.push({ connection: conn.id, status: 'expired' })
        continue
      }

      // Incremental: from last sync minus 5 days overlap (dedup handles repeats); first run: 90 days back
      const from = conn.last_synced_at
        ? new Date(new Date(conn.last_synced_at).getTime() - 5 * 24 * 3600 * 1000)
        : new Date(Date.now() - 90 * 24 * 3600 * 1000)
      const dateFrom = from.toISOString().split('T')[0]

      let inserted = 0
      let continuationKey: string | null = null

      do {
        const qs = new URLSearchParams({ date_from: dateFrom })
        if (continuationKey) qs.set('continuation_key', continuationKey)
        const page = await ebFetch(`/accounts/${conn.account_uid}/transactions?${qs}`)
        continuationKey = page.continuation_key || null

        const rows = (page.transactions || []).map((t: any) => {
          const raw = Number(t.transaction_amount?.amount ?? 0)
          // DBIT = money out -> negative, CRDT = money in -> positive
          const amount = t.credit_debit_indicator === 'DBIT' ? -Math.abs(raw) : Math.abs(raw)
          const counterparty = t.creditor?.name || t.debtor?.name || null
          const remittance = Array.isArray(t.remittance_information)
            ? t.remittance_information.join(' ')
            : (t.remittance_information || '')
          const date = t.booking_date || t.value_date
          const externalId = t.entry_reference
            || `${conn.account_uid}:${date}:${amount}:${remittance.slice(0, 40)}`

          return {
            company_id: conn.company_id,
            date,
            description: remittance || counterparty || 'Banktransaktion',
            amount,
            source: 'bank',
            bank_connection_id: conn.id,
            external_id: externalId,
            counterparty,
            currency: t.transaction_amount?.currency || conn.currency,
            status: t.status === 'PDNG' ? 'pending' : 'booked',
          }
        }).filter((r: any) => r.date)

        if (rows.length > 0) {
          const { data: upserted, error: upErr } = await admin
            .from('transactions')
            .upsert(rows, { onConflict: 'company_id,external_id', ignoreDuplicates: true })
            .select('id, amount, date')
          if (upErr) throw upErr
          inserted += upserted?.length || 0

          // Reverse auto-match: same rule as auto-match fn — exact amount, ±3 days, exactly one candidate
          for (const tx of upserted || []) {
            const txAmt = Math.abs(Number(tx.amount))
            const d = new Date(tx.date)
            const min = new Date(d); min.setDate(min.getDate() - 3)
            const max = new Date(d); max.setDate(max.getDate() + 3)

            const { data: docs } = await admin
              .from('documents')
              .select('id, amount')
              .eq('company_id', conn.company_id)
              .gte('date', min.toISOString().split('T')[0])
              .lte('date', max.toISOString().split('T')[0])

            const candidates = (docs || []).filter(doc =>
              doc.amount != null && Math.abs(Math.abs(Number(doc.amount)) - txAmt) < 0.01)

            if (candidates.length === 1) {
              await admin.from('transactions')
                .update({ matched_document_id: candidates[0].id })
                .eq('id', tx.id)
                .is('matched_document_id', null)
            }
          }
        }
      } while (continuationKey)

      await admin.from('bank_connections')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', conn.id)

      summary.push({ connection: conn.id, account: conn.account_name, inserted })
    }

    return new Response(JSON.stringify({ synced: summary }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('bank-sync error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
