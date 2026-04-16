

# Gmail Sync — Implementeringsplan

## Oversigt

Brugeren har oprettet en Google Cloud app med Gmail API-adgang og har client ID + secret klar. Vi skal nu bygge per-bruger Gmail OAuth-flow og inbox-scanning.

## Arkitektur

```text
Bruger klikker "Forbind Gmail"
  → Edge function (gmail-auth) genererer Google OAuth URL med gmail.readonly scope
  → Bruger autoriserer i Google
  → Callback til edge function (gmail-callback) → gemmer tokens i email_connections
  → Edge function (scan-inbox) poller Gmail for kvitteringer → opretter documents
```

## Trin

### 1. Gem Google OAuth credentials som secrets
- Brug `add_secret` til at bede brugeren indtaste `GOOGLE_GMAIL_CLIENT_ID` og `GOOGLE_GMAIL_CLIENT_SECRET`

### 2. Opret 3 edge functions

**`gmail-auth`** — Genererer Google OAuth consent URL
- Bygger authorize-URL med scopes: `gmail.readonly`
- Redirect URI: `https://oxxioffwasbwbsinbowi.supabase.co/functions/v1/gmail-callback`
- Returnerer URL til frontend

**`gmail-callback`** — OAuth callback handler
- Modtager authorization code fra Google
- Udveksler til access_token + refresh_token
- Gemmer krypteret i `email_connections` tabellen
- Redirecter bruger tilbage til `/integrationer` med success-besked

**`scan-inbox`** — Scanner Gmail for kvitteringer
- Henter emails med vedhæftede filer (PDF, billeder) fra de seneste 7 dage
- Bruger refresh_token til at forny access_token
- Opretter `documents` med `source: 'gmail'`
- Kan kaldes manuelt eller via cron

### 3. Opdater frontend

**`Integrationer.tsx`** — "Forbind Gmail" knap kalder `gmail-auth` og åbner OAuth-vindue. Viser "Forbundet" status når `email_connections` har en Gmail-række.

**`Bilag.tsx`** — "Forbind Gmail" knap bruger samme flow. Viser synkroniserede emails fra `documents` tabellen.

### 4. Tilføj `deno.json` import map
- Opsæt import map for edge functions med nødvendige dependencies

## Filer der oprettes/ændres

| Fil | Handling |
|-----|---------|
| `supabase/functions/gmail-auth/index.ts` | Ny |
| `supabase/functions/gmail-callback/index.ts` | Ny |
| `supabase/functions/scan-inbox/index.ts` | Ny |
| `src/pages/Integrationer.tsx` | Opdater — forbind-knap + status |
| `src/pages/Bilag.tsx` | Opdater — forbind Gmail-knap |

## Sikkerhed
- Tokens gemmes krypteret i `email_connections` (tabellen har RLS: kun egen bruger)
- Edge functions validerer JWT fra Supabase session
- Refresh tokens bruges server-side, aldrig eksponeret til frontend

