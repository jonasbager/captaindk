import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ebFetch } from '../_shared/enablebanking.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Two modes (POST body):
//   { action: "list" }                          -> Danish banks the user can pick from
//   { action: "start", aspsp_name, company_id } -> { url } to redirect the user to their bank
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()

    if (body.action === 'list') {
      const data = await ebFetch('/aspsps?country=DK')
      const banks = (data.aspsps || []).map((a: any) => ({
        name: a.name,
        country: a.country,
        logo: a.logo ?? null,
      }))
      return new Response(JSON.stringify({ banks }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (body.action === 'start') {
      const { aspsp_name, company_id } = body
      if (!aspsp_name || !company_id) {
        return new Response(JSON.stringify({ error: 'aspsp_name and company_id required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Verify the caller owns the company (RLS does this implicitly via user client)
      const { data: company } = await userClient
        .from('companies').select('id').eq('id', company_id).single()
      if (!company) {
        return new Response(JSON.stringify({ error: 'Company not found' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Persist state with service role so bank-callback can correlate the redirect
      const admin = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
      const { data: stateRow, error: stateErr } = await admin
        .from('bank_auth_states')
        .insert({ user_id: user.id, company_id, aspsp_name })
        .select('state').single()
      if (stateErr) throw stateErr

      const validUntil = new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString()
      const auth = await ebFetch('/auth', {
        method: 'POST',
        body: JSON.stringify({
          access: { valid_until: validUntil },
          aspsp: { name: aspsp_name, country: 'DK' },
          state: stateRow.state,
          redirect_url: `${SUPABASE_URL}/functions/v1/bank-callback`,
          psu_type: 'business',
        }),
      })

      return new Response(JSON.stringify({ url: auth.url }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('bank-connect error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
