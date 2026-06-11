import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ebFetch } from '../_shared/enablebanking.ts'

// Redirect target after the user authenticates at their bank.
// verify_jwt = false (set in config.toml) — the bank redirects the browser here without our JWT.
// Security comes from the one-time `state` row created by bank-connect.

const APP_URL = Deno.env.get('APP_URL') || 'https://gocaptain.dk'

function redirect(params: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: `${APP_URL}/integrationer?${params}` },
  })
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    if (error) return redirect(`bank=error&reason=${encodeURIComponent(error)}`)
    if (!code || !state) return redirect('bank=error&reason=missing_code_or_state')

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Consume the state (one-time use)
    const { data: stateRow } = await admin
      .from('bank_auth_states').select('*').eq('state', state).single()
    if (!stateRow) return redirect('bank=error&reason=invalid_state')
    await admin.from('bank_auth_states').delete().eq('state', state)

    // Reject stale states (older than 30 min)
    if (Date.now() - new Date(stateRow.created_at).getTime() > 30 * 60 * 1000) {
      return redirect('bank=error&reason=state_expired')
    }

    // Exchange the code for a session — this is where accounts become available
    const session = await ebFetch('/sessions', {
      method: 'POST',
      body: JSON.stringify({ code }),
    })

    const accounts: any[] = session.accounts || []
    if (accounts.length === 0) return redirect('bank=error&reason=no_accounts')

    for (const acc of accounts) {
      // Accounts may come as plain uid strings or objects depending on API version
      const uid = typeof acc === 'string' ? acc : (acc.uid || acc.identification_hash)
      let name: string | null = null
      let iban: string | null = null
      let currency = 'DKK'

      try {
        const details = await ebFetch(`/accounts/${uid}/details`)
        name = details.name || details.product || null
        iban = details.account_id?.iban || null
        currency = details.currency || 'DKK'
      } catch (_) { /* details are nice-to-have */ }

      await admin.from('bank_connections').upsert({
        company_id: stateRow.company_id,
        user_id: stateRow.user_id,
        provider: 'enablebanking',
        session_id: session.session_id,
        account_uid: uid,
        account_name: name,
        iban,
        currency,
        aspsp_name: stateRow.aspsp_name,
        aspsp_country: 'DK',
        valid_until: session.access?.valid_until || null,
        status: 'active',
      }, { onConflict: 'company_id,account_uid' })
    }

    // Kick off the initial sync, but don't block the redirect on it
    fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/bank-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({ company_id: stateRow.company_id }),
    }).catch((e) => console.error('initial sync trigger failed:', e))

    return redirect('bank=success')
  } catch (err: any) {
    console.error('bank-callback error:', err)
    return redirect(`bank=error&reason=${encodeURIComponent(err.message?.slice(0, 80) || 'unknown')}`)
  }
})
