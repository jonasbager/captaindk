import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Auto-match a document to a transaction when:
// - amount matches exactly (rounded to 2 decimals)
// - date is within ±3 days
// - exactly ONE candidate exists (otherwise leave for manual review)
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { document_id, company_id } = await req.json()
    if (!company_id) {
      return new Response(JSON.stringify({ error: 'company_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Batch-tilstand: ingen document_id → match alle bilag uden tilknyttet transaktion
    // (bruges efter CSV-import af kontoudtog). Genbruger samme matchregel pr. bilag.
    if (!document_id) {
      const { data: docs } = await supabase
        .from('documents')
        .select('id, amount, date')
        .eq('company_id', company_id)
        .not('amount', 'is', null)
        .not('date', 'is', null)
      let matched = 0
      for (const d of docs || []) {
        const r = await matchOne(supabase, company_id, d)
        if (r) matched++
      }
      return new Response(JSON.stringify({ matched }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: doc } = await supabase
      .from('documents').select('id, amount, date, vendor').eq('id', document_id).single()

    if (!doc || !doc.amount || !doc.date) {
      return new Response(JSON.stringify({ matched: false, reason: 'missing_amount_or_date' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const docAmt = Math.abs(Number(doc.amount))
    const docDate = new Date(doc.date)
    const minDate = new Date(docDate); minDate.setDate(minDate.getDate() - 3)
    const maxDate = new Date(docDate); maxDate.setDate(maxDate.getDate() + 3)

    const { data: candidates } = await supabase
      .from('transactions')
      .select('id, amount, date, description')
      .eq('company_id', company_id)
      .is('matched_document_id', null)
      .gte('date', minDate.toISOString().split('T')[0])
      .lte('date', maxDate.toISOString().split('T')[0])

    if (!candidates || candidates.length === 0) {
      return new Response(JSON.stringify({ matched: false, reason: 'no_candidates' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const exact = candidates.filter(t => Math.abs(Math.abs(Number(t.amount)) - docAmt) < 0.01)
    if (exact.length === 1) {
      await supabase.from('transactions')
        .update({ matched_document_id: document_id })
        .eq('id', exact[0].id)
      return new Response(JSON.stringify({ matched: true, transaction_id: exact[0].id }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({
      matched: false,
      reason: exact.length === 0 ? 'no_amount_match' : 'multiple_candidates',
      candidate_count: exact.length,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('auto-match error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// Match ét bilag mod præcis én ledig transaktion (±3 dage, eksakt beløb).
// Springer over hvis bilaget allerede er matchet. Returnerer true ved match.
async function matchOne(
  supabase: any,
  company_id: string,
  doc: { id: string; amount: number | null; date: string | null },
): Promise<boolean> {
  if (!doc.amount || !doc.date) return false

  const { data: already } = await supabase
    .from('transactions').select('id').eq('matched_document_id', doc.id).limit(1)
  if (already && already.length > 0) return false

  const docAmt = Math.abs(Number(doc.amount))
  const docDate = new Date(doc.date)
  const minDate = new Date(docDate); minDate.setDate(minDate.getDate() - 3)
  const maxDate = new Date(docDate); maxDate.setDate(maxDate.getDate() + 3)

  const { data: candidates } = await supabase
    .from('transactions')
    .select('id, amount')
    .eq('company_id', company_id)
    .is('matched_document_id', null)
    .gte('date', minDate.toISOString().split('T')[0])
    .lte('date', maxDate.toISOString().split('T')[0])

  const exact = (candidates || []).filter((t: any) => Math.abs(Math.abs(Number(t.amount)) - docAmt) < 0.01)
  if (exact.length === 1) {
    await supabase.from('transactions')
      .update({ matched_document_id: doc.id }).eq('id', exact[0].id)
    return true
  }
  return false
}
