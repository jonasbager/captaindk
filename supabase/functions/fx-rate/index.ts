import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Frankfurter = ECB's daglige referencekurser (samme grundlag som Nationalbanken,
// der peger DKK fast mod EUR). Returnerer kursen for den ønskede dato eller den
// seneste bankdag før — vi gemmer den faktiske dato kursen stammer fra.
const FRANKFURTER = 'https://api.frankfurter.app'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const { currency, date } = await req.json()
    if (!currency || !date) {
      return new Response(JSON.stringify({ error: 'currency og date kræves' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const cur = String(currency).toUpperCase()
    const day = String(date).slice(0, 10)

    if (cur === 'DKK') {
      return new Response(JSON.stringify({ currency: 'DKK', date: day, rate: 1, source: 'identity' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // 1. Cache-opslag på den ønskede dato
    const { data: cached } = await supabase
      .from('fx_rates').select('rate, source').eq('date', day).eq('currency', cur).maybeSingle()
    if (cached) {
      return new Response(JSON.stringify({ currency: cur, date: day, rate: Number(cached.rate), source: cached.source, cached: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Hent fra ECB (Frankfurter) — kurs = DKK pr. 1 enhed 'cur'
    const url = `${FRANKFURTER}/${day}?from=${cur}&to=DKK`
    const res = await fetch(url)
    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'Kursopslag mislykkedes', status: res.status }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const body = await res.json()
    const rate = body?.rates?.DKK
    const actualDate = body?.date || day
    if (typeof rate !== 'number' || !isFinite(rate) || rate <= 0) {
      return new Response(JSON.stringify({ error: 'Ugyldig kurs returneret', currency: cur }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Cache på BÅDE den ønskede dato (så vi ikke slår op igen) og den faktiske kursdato
    await supabase.from('fx_rates').upsert([
      { date: day, currency: cur, rate, source: `ecb:${actualDate}` },
      { date: actualDate, currency: cur, rate, source: 'ecb' },
    ], { onConflict: 'date,currency' })

    return new Response(JSON.stringify({ currency: cur, date: actualDate, requested_date: day, rate, source: 'ecb' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('fx-rate error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
