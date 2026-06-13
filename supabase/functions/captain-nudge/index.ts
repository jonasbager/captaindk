import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { computeMoms, complianceCalendar, type EngineEntry, type VatCode } from '../_shared/skat-engine.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MONTHS: Record<string, number> = {
  januar: 0, februar: 1, marts: 2, april: 3, maj: 4, juni: 5,
  juli: 6, august: 7, september: 8, oktober: 9, november: 10, december: 11,
}

// "1. september" → {day:1, month:8}. Returnerer null for ikke-fastdato-frister.
function parseFixedDate(when: string): { day: number; month: number } | null {
  const m = when.match(/^(\d{1,2})\.\s+([a-zæøå]+)$/i)
  if (!m) return null
  const month = MONTHS[m[2].toLowerCase()]
  if (month === undefined) return null
  return { day: parseInt(m[1], 10), month }
}

function nextOccurrence(day: number, month: number, today: Date): Date {
  const y = today.getFullYear()
  let d = new Date(Date.UTC(y, month, day))
  if (d < today) d = new Date(Date.UTC(y + 1, month, day))
  return d
}

const fmtDk = (d: Date) => d.toISOString().slice(0, 10)
const kr = (n: number) => `${Math.round(n).toLocaleString('da-DK')} kr.`

// Momsperioden en frist dækker, ud fra fristens label + årstal
function momsPeriod(label: string, deadlineYear: number): { from: string; to: string } | null {
  const Y = deadlineYear
  switch (label) {
    case 'Momsindberetning H1': return { from: `${Y}-01-01`, to: `${Y}-06-30` }
    case 'Momsindberetning H2': return { from: `${Y - 1}-07-01`, to: `${Y - 1}-12-31` }
    case 'Moms Q1': return { from: `${Y}-01-01`, to: `${Y}-03-31` }
    case 'Moms Q2': return { from: `${Y}-04-01`, to: `${Y}-06-30` }
    case 'Moms Q3': return { from: `${Y}-07-01`, to: `${Y}-09-30` }
    case 'Moms Q4': return { from: `${Y - 1}-10-01`, to: `${Y - 1}-12-31` }
    default: return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const horizon = new Date(today)
    horizon.setUTCDate(horizon.getUTCDate() + 14)

    const { data: companies } = await supabase
      .from('companies').select('id, owner_id, name, company_type, vat_period')
    if (!companies) return json({ inserted: 0 })

    let inserted = 0

    for (const co of companies) {
      const deadlines = complianceCalendar(co.company_type, co.vat_period)

      // Indlæs posteringer én gang pr. virksomhed (kun hvis der er momsfrister forude)
      let entries: EngineEntry[] | null = null
      const loadEntries = async () => {
        if (entries) return entries
        const { data } = await supabase
          .from('journal_entries')
          .select('date, net_amount, vat_amount, vat_code, amount, accounts:account_id (kind, tax_line, energy_levy)')
          .eq('company_id', co.id).eq('status', 'godkendt')
        entries = (data || []).filter((e: any) => e.accounts).map((e: any) => ({
          date: e.date,
          net_amount: Number(e.net_amount ?? e.amount),
          vat_amount: Number(e.vat_amount ?? 0),
          vat_code: (e.vat_code || 'NONE') as VatCode,
          account_kind: e.accounts.kind,
          tax_line: e.accounts.tax_line,
          energy_levy: e.accounts.energy_levy,
        }))
        return entries
      }

      for (const dl of deadlines) {
        const parsed = parseFixedDate(dl.when)
        if (!parsed) continue
        const date = nextOccurrence(parsed.day, parsed.month, today)
        if (date > horizon) continue

        const daysLeft = Math.round((date.getTime() - today.getTime()) / 86400000)
        const nudgeKey = `${dl.label}-${fmtDk(date)}`

        // Dedup: er denne frist allerede varslet?
        const { data: existing } = await supabase
          .from('chat_messages').select('id')
          .eq('company_id', co.id).eq('role', 'assistant')
          .contains('tool_calls', { nudge_key: nudgeKey }).limit(1)
        if (existing && existing.length > 0) continue

        let content = `⏰ ${dl.label} har frist ${fmtDk(date)} — om ${daysLeft} dage.`
        let structured: any = { kind: 'alert', title: `${dl.label} om ${daysLeft} dage`, description: `Frist ${fmtDk(date)}` }

        const period = momsPeriod(dl.label, date.getFullYear())
        if (period) {
          const es = await loadEntries()
          const moms = computeMoms(es, period.from, period.to)
          const skyldig = moms.momstilsvar
          content = skyldig >= 0
            ? `⏰ ${dl.label} har frist ${fmtDk(date)} (om ${daysLeft} dage). Jeg har gjort perioden klar: du skal betale ${kr(skyldig)} i moms (salgsmoms ${kr(moms.salgsmoms)} − købsmoms ${kr(moms.koebsmoms)}). Vil du se grundlaget?`
            : `⏰ ${dl.label} har frist ${fmtDk(date)} (om ${daysLeft} dage). Du har ${kr(-skyldig)} til gode i moms. Vil du se grundlaget?`
          structured = {
            kind: 'vat', period: `${period.from} – ${period.to}`,
            sales_vat: moms.salgsmoms, purchase_vat: moms.koebsmoms,
            net: skyldig, deadline: fmtDk(date),
          }
        }

        const { error } = await supabase.from('chat_messages').insert({
          company_id: co.id,
          user_id: co.owner_id,
          role: 'assistant',
          content,
          structured_data: structured,
          tool_calls: { nudge_key: nudgeKey },
        })
        if (!error) inserted++
      }
    }

    return json({ inserted })
  } catch (error) {
    console.error('captain-nudge error:', error)
    return json({ error: error.message }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
