# Captain — Implementeringsguide

Tre pakker, én rækkefølge. Alt køres i Claude Code i repoet (git pull fra Lovable først,
og slå Lovables auto-sync fra mens du arbejder, så den ikke overskriver).

**Samlet realistisk tidsforbrug: 2-3 aftener.**

---

## Fase 0 — Forberedelse (15 min)

1. `git clone` / pull `jonasbager/captaindk` lokalt, åbn i Claude Code.
2. Tilføj `.env` til `.gitignore` og fjern den fra git-historik fremadrettet
   (`git rm --cached .env`). Anon-nøglen er designet til at være offentlig,
   men kun hvis RLS er vandtæt — og der er ingen grund til at friste.
3. Hav Supabase CLI logget ind og linket: `supabase link --project-ref cevmfwrcpwnyijqabspx`

---

## Fase 1 — SKAT-engine (fundamentet — SKAL først, chatten afhænger af den)

Fra `captain-skat-engine.zip`:

1. Kopiér `supabase/migrations/20260610130000_skat_engine.sql` ind → `supabase db push`
2. Kopiér `src/lib/skat/engine.ts` ind, og lav Deno-kopien:
   `cp src/lib/skat/engine.ts supabase/functions/_shared/skat-engine.ts`
   (ren TS uden node-APIs — kører uændret i Deno)
3. Seed kontoplanen for din virksomhed (SQL editor):
   `select seed_default_kontoplan('<dit company_id>');`
   Og kald den fremover fra onboarding-flowet for nye brugere.
4. Sæt din virksomhedstype: `update companies set company_type='enkeltmandsvirksomhed', vat_period='halvaarlig' where id='<id>';`
5. Regenerér typer: `supabase gen types typescript --linked > src/integrations/supabase/types.ts`

**Claude Code-opgaver i denne fase** (giv den COMPLIANCE.md som kontekst):
- Skriv Kontoplan.tsx om til at læse fra `accounts`-tabellen i stedet for det hardkodede array
- Byg Moms.tsx og Skat.tsx på `computeMoms`/`computeOplysningsskema` med drill-down til posteringer
- Opdatér extract-receipt/booking-flowet til at sætte `account_id`, `net_amount`, `vat_amount`, `vat_code` ved bogføring
- Skriv unit tests på engine.ts (vitest er allerede sat op) — test mod dine EGNE 2025-tal fra Dinero; du kender facit fra din egen indberetning

**Verifikation:** computeOplysningsskema på dine 2025-posteringer skal ramme de tal,
du faktisk indberettede i april. Det er din gyldne test.

---

## Fase 2 — captain-chat v2 (chat-first-skiftet)

Fra `captain-chat-v2.zip`:

1. Erstat `supabase/functions/captain-chat/index.ts`
2. Secrets:
   ```
   supabase secrets set ANTHROPIC_API_KEY="sk-ant-..."
   ```
   (API-nøgle fra console.anthropic.com — model er claude-sonnet-4-6 som default,
   kan overstyres med CAPTAIN_MODEL. Docs: https://docs.claude.com/en/api/overview)
3. `supabase functions deploy captain-chat`
4. Frontend-tilpasning (lille): Chat.tsx sender allerede `{ messages }` og forventer
   `{ content, structured_data }` — tjek at message-historikken sendes som ren
   `[{role, content}]` uden system-beskeder, og at `structured_data` gemmes i chat_messages.

**Claude Code-opgaver:**
- Tilføj "Fortryd"-handler på PostingCard (slet journal_entry via id i structured_data — udvid card-data med entry_id)
- Test-samtaler: "bogfør 500 kr. taxa i går", "hvad skylder jeg i moms for H1?",
  "vis mine umatchede transaktioner", "hvad bliver min rubrik 111?"
- Streaming (valgfrit, senere): v2 er bevidst non-streaming — tool-loopet skal være
  korrekt før det skal være flot. SSE-streaming af sluttsvaret er en isoleret upgrade.

**Verifikation:** Du skal kunne tage en kvittering med /snap, skrive "bogfør den"
og få momstallet — uden at forlade chat-fanen. Det er chat-first-testen.

---

## Fase 3 — Bank-sync (fra captain-bank-sync.zip, kan køre parallelt med fase 2)

1. Opret konto på enablebanking.com, registrér applikation:
   - `openssl genrsa -out eb_private.pem 2048 && openssl rsa -in eb_private.pem -pubout -out eb_public.pem`
   - Upload public key, notér application ID
   - Redirect URL: `https://cevmfwrcpwnyijqabspx.supabase.co/functions/v1/bank-callback`
   - Start i sandbox ("Mock ASPSP"); søg produktionsadgang når flowet virker
2. Kopiér migration + de tre functions + `_shared/enablebanking.ts` ind
3. ```
   supabase secrets set ENABLEBANKING_APP_ID="..." ENABLEBANKING_PRIVATE_KEY="$(cat eb_private.pem)" APP_URL="https://gocaptain.dk"
   ```
4. Tilføj til config.toml:
   ```toml
   [functions.bank-callback]
   verify_jwt = false
   [functions.bank-sync]
   verify_jwt = false
   ```
5. `supabase db push && supabase functions deploy bank-connect bank-callback bank-sync`
6. Erstat `src/pages/Integrationer.tsx`
7. Natlig sync via pg_cron (SQL i pakkens README)

**Verifikation:** Mock ASPSP-flow ender med transaktioner i Posteringer/Indbakke,
og en kvittering med samme beløb ±3 dage matcher automatisk.

---

## Fase 4 — Sammenbinding & beta

- Onboarding: spørg om virksomhedstype (enkeltmand/ApS) og momsperiode, kald seed_default_kontoplan
- Proaktive nudges: pg_cron der tjekker complianceCalendar og skriver en Captain-besked
  i chat_messages ("Momsfristen er om 14 dage — H1 er klar: 4.312 kr.")
- Migrér login fra Lovable Cloud til direkte Supabase (din udskudte Microsoft SSO-plan hører til her)
- Beta-test med dine egne rigtige 2026-tal i en måned før andre brugere

## Rækkefølgens logik

Engine → chat → bank. Chatten uden engine kan ikke regne; banken uden engine kan
synce men ikke bogføre korrekt. Fase 1 låser alt andet op.

## Hvad der bevidst IKKE er med (sig nej til det i v1)

Lønindberetning/eIndkomst, VSO, XBRL-generering af årsrapporten (tal ja, indsendelse nej),
Booksmate (afventer partner-API), SKAT TastSelv-automatik. Hver af dem er et produkt i sig selv.
