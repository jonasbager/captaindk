import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  computeMoms, computeOplysningsskema, computeSelskabsskat, computeAarsrapportB,
  complianceCalendar, type EngineEntry, type CompanyType,
} from '../_shared/skat-engine.ts'

// captain-chat v2 — Claude API direct, full tool use.
// The agent ACTS and shows the result as a card. Pages are for drill-down, not deflection.
//
// Secrets: ANTHROPIC_API_KEY (and optionally CAPTAIN_MODEL, default claude-sonnet-4-6)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = Deno.env.get('CAPTAIN_MODEL') || 'claude-sonnet-4-6'
const MAX_TOOL_ITERATIONS = 8

// ---------- Tool definitions (Anthropic tool-use schema) ----------
const tools = [
  {
    name: 'get_overview',
    description: 'Hent live overblik: afventende bilag, umatchede transaktioner, seneste posteringer, kommende frister. Brug ved åbne spørgsmål om status.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'search_entries',
    description: 'Søg i posteringer. Brug til "hvad har jeg brugt på X", "vis posteringer fra marts" osv.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Fritekst-match på beskrivelse (valgfri)' },
        date_from: { type: 'string', description: 'ISO-dato (valgfri)' },
        date_to: { type: 'string', description: 'ISO-dato (valgfri)' },
        account_number: { type: 'integer', description: 'Begræns til konto (valgfri)' },
      },
    },
  },
  {
    name: 'book_entry',
    description: 'Bogfør en postering. Beløb angives BRUTTO (inkl. moms); moms beregnes automatisk ud fra kontoens momskode. Vis altid resultatet og nævn at den kan fortrydes.',
    input_schema: {
      type: 'object',
      properties: {
        account_number: { type: 'integer', description: 'Kontonummer fra kontoplanen' },
        gross_amount: { type: 'number', description: 'Bruttobeløb i DKK (inkl. moms)' },
        date: { type: 'string', description: 'ISO-dato' },
        description: { type: 'string' },
      },
      required: ['account_number', 'gross_amount', 'date', 'description'],
    },
  },
  {
    name: 'list_unmatched',
    description: 'List banktransaktioner uden matchet bilag og afventende bilag, så brugeren kan rydde op via chatten.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'approve_match',
    description: 'Match et bilag til en banktransaktion (brug id\'er fra list_unmatched). Bekræft kun ud fra hvad brugeren har sagt ja til.',
    input_schema: {
      type: 'object',
      properties: {
        transaction_id: { type: 'string' },
        document_id: { type: 'string' },
      },
      required: ['transaction_id', 'document_id'],
    },
  },
  {
    name: 'compute_moms',
    description: 'Beregn momsangivelsen for en periode (alle felter: salgsmoms, købsmoms, udenlandske køb, rubrik A/B/C, momstilsvar).',
    input_schema: {
      type: 'object',
      properties: {
        date_from: { type: 'string', description: 'Periodens start, ISO-dato' },
        date_to: { type: 'string', description: 'Periodens slut, ISO-dato' },
      },
      required: ['date_from', 'date_to'],
    },
  },
  {
    name: 'compute_skat',
    description: 'Beregn årets skattetal. Enkeltmandsvirksomhed: oplysningsskemaets rubrikker. ApS: skattepligtig indkomst, selskabsskat og årsrapport-tal.',
    input_schema: {
      type: 'object',
      properties: { year: { type: 'integer', description: 'Indkomstår, fx 2025' } },
      required: ['year'],
    },
  },
  {
    name: 'get_deadlines',
    description: 'Kommende compliance-frister for virksomheden (moms, oplysningsskema, acontoskat, årsrapport).',
    input_schema: { type: 'object', properties: {} },
  },
]

// ---------- Data loading ----------
async function loadEntries(supabase: any, companyId: string): Promise<EngineEntry[]> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('date, amount, net_amount, vat_amount, vat_code, accounts:account_id (kind, tax_line, energy_levy)')
    .eq('company_id', companyId)
    .eq('status', 'godkendt')
  if (error) throw error
  return (data || [])
    .filter((e: any) => e.accounts)
    .map((e: any) => ({
      date: e.date,
      net_amount: Number(e.net_amount ?? e.amount),
      vat_amount: Number(e.vat_amount ?? 0),
      vat_code: e.vat_code || 'NONE',
      account_kind: e.accounts.kind,
      tax_line: e.accounts.tax_line,
      energy_levy: e.accounts.energy_levy,
    }))
}

const VAT_IN_GROSS: Record<string, number> = { U25: 0.25, I25: 0.25, REP: 0.25 }

// ---------- Tool execution ----------
async function runTool(name: string, input: any, ctx: {
  supabase: any; company: any;
}): Promise<{ result: any; card?: any }> {
  const { supabase, company } = ctx

  switch (name) {
    case 'get_overview': {
      const [{ count: docPending }, { count: txUnmatched }, { data: recent }] = await Promise.all([
        supabase.from('documents').select('*', { count: 'exact', head: true }).eq('company_id', company.id).eq('status', 'pending'),
        supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('company_id', company.id).is('matched_document_id', null),
        supabase.from('journal_entries').select('date, description, amount').eq('company_id', company.id).order('date', { ascending: false }).limit(5),
      ])
      return { result: { afventende_bilag: docPending, umatchede_transaktioner: txUnmatched, seneste_posteringer: recent, frister: complianceCalendar(company.company_type as CompanyType, company.vat_period) } }
    }

    case 'search_entries': {
      let q = supabase.from('journal_entries')
        .select('id, date, description, amount, net_amount, vat_amount, account, account_number')
        .eq('company_id', company.id).order('date', { ascending: false }).limit(50)
      if (input.query) q = q.ilike('description', `%${input.query}%`)
      if (input.date_from) q = q.gte('date', input.date_from)
      if (input.date_to) q = q.lte('date', input.date_to)
      if (input.account_number) q = q.eq('account_number', input.account_number)
      const { data, error } = await q
      if (error) throw error
      return { result: { count: data.length, entries: data } }
    }

    case 'book_entry': {
      const { data: account } = await supabase.from('accounts')
        .select('id, number, name, vat_code, kind')
        .eq('company_id', company.id).eq('number', input.account_number).single()
      if (!account) return { result: { error: `Konto ${input.account_number} findes ikke i kontoplanen` } }

      const rate = VAT_IN_GROSS[account.vat_code] ?? 0
      const gross = Number(input.gross_amount)
      const net = rate > 0 ? Math.round((gross / (1 + rate)) * 100) / 100 : gross
      const vat = Math.round((gross - net) * 100) / 100

      const { data: entry, error } = await supabase.from('journal_entries').insert({
        company_id: company.id,
        date: input.date,
        description: input.description,
        amount: gross,
        net_amount: net,
        vat_amount: vat,
        vat_code: account.vat_code,
        account: account.name,
        account_number: account.number,
        account_id: account.id,
        status: 'godkendt',
      }).select('id').single()
      if (error) throw error

      return {
        result: { booked: true, entry_id: entry.id, net, vat, account: `${account.number} ${account.name}` },
        card: {
          kind: 'posting', date: input.date, description: input.description,
          amount: gross, account: `${account.number} ${account.name}`,
          counter_account: 'Bank', vat_rate: rate > 0 ? 25 : 0,
          entry_id: entry.id,
        },
      }
    }

    case 'list_unmatched': {
      const [{ data: txs }, { data: docs }] = await Promise.all([
        supabase.from('transactions').select('id, date, description, amount').eq('company_id', company.id).is('matched_document_id', null).order('date', { ascending: false }).limit(20),
        supabase.from('documents').select('id, date, vendor, amount').eq('company_id', company.id).eq('status', 'pending').order('date', { ascending: false }).limit(20),
      ])
      return { result: { umatchede_transaktioner: txs, afventende_bilag: docs } }
    }

    case 'approve_match': {
      const { error } = await supabase.from('transactions')
        .update({ matched_document_id: input.document_id })
        .eq('id', input.transaction_id).eq('company_id', company.id)
      if (error) throw error
      await supabase.from('documents').update({ status: 'approved' })
        .eq('id', input.document_id).eq('company_id', company.id)
      return { result: { matched: true } }
    }

    case 'compute_moms': {
      const entries = await loadEntries(supabase, company.id)
      const moms = computeMoms(entries, input.date_from, input.date_to)
      return {
        result: moms,
        card: {
          kind: 'vat', period: `${input.date_from} – ${input.date_to}`,
          sales_vat: moms.salgsmoms + moms.moms_varekoeb_udland + moms.moms_ydelseskoeb_udland,
          purchase_vat: moms.koebsmoms, net: moms.momstilsvar, deadline: '',
        },
      }
    }

    case 'compute_skat': {
      const entries = await loadEntries(supabase, company.id)
      const y = input.year
      const from = `${y}-01-01`, to = `${y}-12-31`
      if (company.company_type === 'aps') {
        const skat = computeSelskabsskat(entries, from, to)
        const rapport = computeAarsrapportB(entries, from, to, skat.selskabsskat)
        return { result: { selskabsskat: skat, aarsrapport: rapport } }
      }
      return { result: computeOplysningsskema(entries, from, to) }
    }

    case 'get_deadlines':
      return { result: complianceCalendar(company.company_type as CompanyType, company.vat_period) }

    default:
      return { result: { error: `Ukendt værktøj: ${name}` } }
  }
}

// ---------- System prompt: agent, not help widget ----------
function systemPrompt(company: any): string {
  return `Du er Captain — en dansk AI-bogholder. Du UDFØRER bogføringsarbejdet gennem dine værktøjer; du henviser ikke brugeren til at gøre det selv.

Virksomhed: ${company.name} (CVR ${company.cvr || 'ikke angivet'}), type: ${company.company_type === 'aps' ? 'ApS' : 'enkeltmandsvirksomhed'}, regnskabsår fra ${company.fiscal_year_start}, momsperiode: ${company.vat_period}.

Principper:
1. HANDL FØRST. "Bogfør 500 kr. taxa i går" → book_entry med det samme, vis resultatet, nævn at det kan fortrydes. Spørg kun hvis noget væsentligt er tvetydigt (fx hvilken konto ved uklare køb).
2. Vis tal, ikke henvisninger. Spørger brugeren om moms, så BEREGN den. Siderne (Moms, Posteringer) nævnes kun som drill-down: "Du kan se grundlaget under Moms."
3. Svar på dansk, kort og konkret. Dansk talformat (1.234,56 kr.). Brug danske bogføringstermer. Skriv i ren tekst UDEN markdown — ingen ** til fed, ingen # overskrifter, ingen markdown-lister. Fremhæv i stedet med korte sætninger.
4. Vær ærlig om grænser: VSO/kapitalafkastordning, lønindberetning og skattemæssige afskrivninger er ikke understøttet — anbefal revisor dér. Videregiv altid warnings fra beregningerne.
5. Ved skattetal: vis rubrik-for-rubrik så brugeren kan taste dem direkte i TastSelv.
6. Du er bogføringsassistent, ikke skatterådgiver — ved tvivlsspørgsmål om fortolkning, sig det.`
}

// ---------- Main handler ----------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
    if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not configured')

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

    const supabase = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: company } = await supabase
      .from('companies')
      .select('id, name, cvr, fiscal_year_start, company_type, vat_period')
      .eq('owner_id', user.id).single()
    if (!company) {
      return new Response(JSON.stringify({ content: 'Opret din virksomhed under Indstillinger først, så er jeg klar.' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Agentic loop
    const convo: any[] = messages.map((m: any) => ({ role: m.role, content: m.content }))
    let lastCard: any = null

    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const aiRes = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 2000,
          system: systemPrompt(company),
          tools,
          messages: convo,
        }),
      })
      if (!aiRes.ok) throw new Error(`Anthropic API ${aiRes.status}: ${(await aiRes.text()).slice(0, 200)}`)
      const data = await aiRes.json()

      if (data.stop_reason !== 'tool_use') {
        const text = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')
        return new Response(JSON.stringify({ content: text, structured_data: lastCard }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Execute every tool call in this turn
      convo.push({ role: 'assistant', content: data.content })
      const toolResults: any[] = []
      for (const block of data.content.filter((b: any) => b.type === 'tool_use')) {
        try {
          const { result, card } = await runTool(block.name, block.input, { supabase, company })
          if (card) lastCard = card
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) })
        } catch (e: any) {
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify({ error: e.message }), is_error: true })
        }
      }
      convo.push({ role: 'user', content: toolResults })
    }

    return new Response(JSON.stringify({ content: 'Det blev for mange skridt på én gang — prøv at dele opgaven op.' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('captain-chat error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
