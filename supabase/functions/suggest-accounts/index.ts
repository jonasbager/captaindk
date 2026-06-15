import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = Deno.env.get('CAPTAIN_MODEL') || 'claude-opus-4-8'

const TOOL = {
  name: 'suggest_accounts',
  description: 'Foreslå den bedste kontoplan-konto for hver banktransaktion',
  input_schema: {
    type: 'object',
    properties: {
      suggestions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            index: { type: 'integer', description: 'Rækkens index (0-baseret) fra input' },
            account_number: { type: 'integer', description: 'Bedst matchende kontonummer fra kontoplanen' },
            reason: { type: 'string', description: 'Kort begrundelse (få ord)' },
          },
          required: ['index', 'account_number'],
        },
      },
    },
    required: ['suggestions'],
  },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
    if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not configured')

    const { company_id, rows } = await req.json()
    if (!company_id || !Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ error: 'company_id og rows kræves' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const { data: accounts } = await supabase
      .from('accounts')
      .select('number, name, kind, vat_code')
      .eq('company_id', company_id)
      .order('number')

    if (!accounts || accounts.length === 0) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const kontoplan = accounts.map((a) => `${a.number} ${a.name} [${a.kind}, ${a.vat_code}]`).join('\n')
    // Begræns til 200 rækker pr. kald for at holde os under token-loftet
    const batch = rows.slice(0, 200).map((r: any, i: number) =>
      `${i}: "${(r.description || '').slice(0, 120)}" beløb ${r.amount}`)
      .join('\n')

    const aiRes = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        system: `Du konterer danske banktransaktioner. For hver transaktion: vælg det bedst matchende kontonummer fra kontoplanen. Positivt beløb = typisk indtægt (revenue-konto), negativt = typisk udgift (expense-konto). Brug kun numre der findes i kontoplanen.\n\nKontoplan:\n${kontoplan}`,
        messages: [{ role: 'user', content: `Kontér disse transaktioner:\n${batch}` }],
        tools: [TOOL],
        tool_choice: { type: 'tool', name: 'suggest_accounts' },
      }),
    })

    if (!aiRes.ok) {
      const errText = await aiRes.text()
      console.error('Anthropic error:', aiRes.status, errText)
      return new Response(JSON.stringify({ error: 'AI-fejl', suggestions: [] }), {
        status: aiRes.status === 429 ? 429 : 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const aiData = await aiRes.json()
    const toolUse = aiData.content?.find((b: any) => b.type === 'tool_use')
    const suggestions = toolUse?.input?.suggestions || []

    return new Response(JSON.stringify({ suggestions }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('suggest-accounts error:', error)
    return new Response(JSON.stringify({ error: error.message, suggestions: [] }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
