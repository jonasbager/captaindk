

# Supabase, Auth & Inbox-scanning — Plan

## Nuværende status
- **Ingen Supabase** er sat op endnu — ingen database, ingen auth, ingen storage
- Alle data er hardcoded demo-data
- Ingen connectors linket til projektet

## Hvad der skal bygges

### 1. Aktivér Lovable Cloud (Supabase)
- Sæt Lovable Cloud op for at få database, auth og storage
- Opret kernetabeller: `profiles`, `user_roles`, `companies`, `journal_entries`, `documents`, `transactions`, `invoices`, `email_connections`

### 2. Google & Microsoft login (SSO)
- Aktivér Google og Apple/Microsoft som OAuth-providere i Lovable Cloud auth
- Byg login-side med "Log ind med Google" og "Log ind med Microsoft" knapper
- Opret `profiles`-tabel med auto-creation trigger ved signup
- Tilføj auth-guard på alle routes undtagen login

**Vigtigt om inbox-scanning:** Google og Microsoft SSO giver kun login-adgang. For at scanne brugeres indbakker (Gmail/Outlook) kræves **udvidede OAuth-scopes** (`gmail.readonly` / `Mail.Read`) — dette er per-bruger OAuth, ikke standard SSO.

### 3. Per-bruger inbox-scanning (kræver custom OAuth)
Lovable's connectors giver kun adgang til *din egen* konto. For at scanne *hver brugers* indbakke skal vi:

- **Google**: Registrere en app i Google Cloud Console med `gmail.readonly` scope, implementere OAuth-flow hvor brugeren giver adgang, gemme refresh-tokens per bruger
- **Microsoft**: Registrere en app i Microsoft Entra med `Mail.Read` scope, samme flow

Dette kræver:
- En `email_connections`-tabel (user_id, provider, access_token, refresh_token, scopes, connected_at)
- Edge functions til: OAuth callback, token refresh, inbox polling
- En edge function der scanner indbakker for kvitteringer og opretter `documents` automatisk

### Spørgsmål før implementering

Inbox-scanning med per-bruger OAuth kræver at du registrerer apps hos Google og Microsoft. Det er et større setup.

**Anbefalet tilgang i to trin:**
1. **Først**: Sæt Lovable Cloud op + Google/Microsoft login + database-tabeller + auth-guard
2. **Derefter**: Implementér inbox-scanning som separat feature (kræver Google Cloud Console + Microsoft Entra opsætning fra din side)

Skal jeg starte med trin 1 (auth + database), og så tager vi inbox-scanning bagefter?

## Tekniske detaljer

### Database-tabeller (trin 1)
```text
profiles (id, user_id FK auth.users, full_name, avatar_url, created_at)
user_roles (id, user_id FK auth.users, role enum(admin/user))
companies (id, owner_id FK auth.users, name, cvr, fiscal_year_start)
documents (id, company_id, vendor, amount, date, file_url, status, source)
journal_entries (id, company_id, date, description, amount, account, status)
transactions (id, company_id, date, description, amount, source, matched_document_id)
invoices (id, company_id, customer, number, date, due_date, total, status)
```

### Auth flow
- Login-side på `/login` med Google + Microsoft knapper
- `AuthProvider` context wrapping hele appen
- Protected routes via `useAuth()` hook
- Auto-redirect til `/login` hvis ikke logget ind

### Inbox-scanning (trin 2, separat)
- Edge function `scan-inbox` kaldt via cron eller manuelt
- Søger efter emails med vedhæftede filer (PDF, billeder)
- Opretter `documents` med `source: 'gmail'` eller `source: 'outlook'`
- Bruger gemte refresh-tokens til at hente emails

