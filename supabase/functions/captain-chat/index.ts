import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured')

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } })
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { messages } = await req.json()
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'messages array required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Build context: company + simple counts
    const { data: company } = await supabase
      .from('companies').select('id, name, cvr, fiscal_year_start').eq('owner_id', user.id).single()

    let context = 'No company yet.'
    if (company) {
      const [{ count: docTotal }, { count: docPending }, { count: txTotal }, { count: txUnmatched }] =
        await Promise.all([
          supabase.from('documents').select('*', { count: 'exact', head: true }).eq('company_id', company.id),
          supabase.from('documents').select('*', { count: 'exact', head: true }).eq('company_id', company.id).eq('status', 'pending'),
          supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('company_id', company.id),
          supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('company_id', company.id).is('matched_document_id', null),
        ])

      context = `Company: ${company.name} (CVR ${company.cvr || 'ikke angivet'}). Fiscal year start: ${company.fiscal_year_start}.
Documents: ${docTotal} total, ${docPending} pending.
Transactions: ${txTotal} total, ${txUnmatched} without matched document.`
    }

    const systemPrompt = `Du er Captain — en venlig dansk bogføringsassistent for små virksomheder. 
Svar altid på dansk, kort og præcist. Brug danske bogføringstermer (moms, bilag, postering, kontoplan).
Når du nævner tal, brug dansk format (1.000,00 DKK).
Du har følgende live data om brugerens virksomhed:

${context}

Hvis brugeren spørger om noget der kræver konkrete poster du ikke har, sig at de kan finde det under den relevante side (Bilag, Posteringer, Moms, Kontoplan).`

    const aiRes = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        stream: true,
      }),
    })

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: 'For mange forespørgsler. Prøv igen om lidt.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: 'AI-credits opbrugt.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const t = await aiRes.text()
      console.error('AI gateway error:', aiRes.status, t)
      return new Response(JSON.stringify({ error: 'AI error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(aiRes.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    })
  } catch (error) {
    console.error('captain-chat error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
