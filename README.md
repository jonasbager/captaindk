# Captain — Bank Sync (Enable Banking / PSD2)

Drop-in bank transaction sync. Files mirror the repo structure — copy them straight in.

## Why Enable Banking (not Aiia, not GoCardless)

- GoCardless Bank Account Data stopped accepting new accounts in July 2025. Dead end.
- You can't get your own AISP licence from Finanstilsynet as a solo builder. Enable Banking
  lets you operate under THEIR licence — that's the whole unlock.
- Nordic-first coverage: Danske Bank, Nordea, Jyske, Sydbank, Lunar, Arbejdernes Landsbank, etc.
- Pay-per-active-connection pricing, free sandbox, no enterprise sales call required
  (Aiia/Mastercard is the fallback if their terms change — same PSD2 flow, swap the _shared client).

## Setup (≈30 min)

1. **Register** at enablebanking.com → create an application.
   - Generate an RSA keypair: `openssl genrsa -out eb_private.pem 2048 && openssl rsa -in eb_private.pem -pubout -out eb_public.pem`
   - Upload the PUBLIC key to the EB control panel. Note your application ID.
   - Register the redirect URL: `https://oxxioffwasbwbsinbowi.supabase.co/functions/v1/bank-callback`
   - Start in sandbox; request production access when the flow works (they verify your use case — "bookkeeping SaaS, AIS only" is standard).

2. **Secrets**:
   ```
   supabase secrets set ENABLEBANKING_APP_ID="<app-id>"
   supabase secrets set ENABLEBANKING_PRIVATE_KEY="$(cat eb_private.pem)"
   supabase secrets set APP_URL="https://gocaptain.dk"
   ```

3. **Migration**: copy `supabase/migrations/20260610120000_bank_sync.sql` in, run `supabase db push`.
   Then regenerate types: `supabase gen types typescript --linked > src/integrations/supabase/types.ts`
   (until then the frontend casts `bank_connections` queries to `any` — works fine).

4. **config.toml** — add:
   ```toml
   [functions.bank-callback]
   verify_jwt = false

   [functions.bank-sync]
   verify_jwt = false
   ```
   (bank-sync needs to accept service-role calls from bank-callback and cron; it does its own scoping.)

5. **Deploy**: `supabase functions deploy bank-connect bank-callback bank-sync`

6. **Frontend**: replace `src/pages/Integrationer.tsx` with the one in this package.

7. **Nightly sync** (optional, recommended) — pg_cron in the SQL editor:
   ```sql
   select cron.schedule('bank-sync-nightly', '0 5 * * *', $$
     select net.http_post(
       url := 'https://oxxioffwasbwbsinbowi.supabase.co/functions/v1/bank-sync',
       headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || current_setting('app.service_role_key')),
       body := '{}'::jsonb
     );
   $$);
   ```

## How it works

```
UI "Forbind bank" → bank-connect {list}  → bank picker dialog
pick bank         → bank-connect {start} → state row + EB /auth → redirect to bank (MitID)
bank redirects    → bank-callback        → EB /sessions → store accounts → fire bank-sync
bank-sync         → EB /transactions (paginated) → upsert with dedup → auto-match vs documents
```

- **Dedup**: unique index on `(company_id, external_id)`; re-syncs are idempotent, 5-day overlap window catches late-booking transactions.
- **Matching**: mirrors your existing `auto-match` rule (exact amount, ±3 days, exactly one candidate). Bank-sync matches transaction→document; the existing function matches document→transaction. Together they cover both arrival orders.
- **PSD2 consent expires** (90 days, SCA requirement — every provider has this). Expired connections flip to `status='expired'`, the card shows "Forny forbindelse", and renewal is the same flow again.

## Verify against current EB docs before production

This was written against Enable Banking's documented API (JWT RS256 auth, /aspsps, /auth,
/sessions, /accounts/{uid}/transactions). Field names like `entry_reference`,
`credit_debit_indicator`, and the shape of `session.accounts` are the ones to sanity-check
in their docs/sandbox — run the flow once in Claude Code with the sandbox ASPSP
("Mock ASPSP") before touching a real bank.
