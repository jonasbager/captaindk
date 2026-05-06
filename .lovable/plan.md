## Plan

### 1. Admin-rolle til jonas@bager.dk
Jeg kan ikke oprette selve auth-brugeren fra koden (Supabase kræver at brugeren selv signer up med password). Løsningen bliver derfor todelt:

- **Migration**: Indsæt admin-rolle i `user_roles` for den bruger i `auth.users` der har email `jonas@bager.dk`, hvis den allerede findes.
- **Trigger**: Udvid `handle_new_user` (eller tilføj en separat trigger) så hvis en ny bruger signer up med `jonas@bager.dk`, får de automatisk `admin` i `user_roles`.

Du logger derefter ind / signer up én gang med `jonas@bager.dk` på `/login`, og er admin med det samme.

### 2. Diskret login på landing page
I `src/pages/Landing.tsx` toppen højre erstattes "Få adgang →" med to små links side om side:
- "Log ind" → `/login`
- "Få adgang →" → `/waitlist`

Holdes i `text-xs text-muted-foreground` så det er diskret og passer til designet.

### 3. Sidebar-link til waitlist-admin
I `src/components/AppSidebar.tsx` tilføjes et menupunkt "Venteliste" (icon: `Users` eller `ListChecks`) der peger på `/waitlist-admin`. Kun synligt hvis brugeren har admin-rolle - jeg laver et lille `useIsAdmin` hook der kalder `has_role` via `user_roles`-tabellen, så ikke-admins ikke ser punktet.

### Tekniske detaljer
- Migration: `INSERT INTO user_roles (user_id, role) SELECT id, 'admin' FROM auth.users WHERE email = 'jonas@bager.dk' ON CONFLICT DO NOTHING;`
- Trigger på `auth.users` (after insert) der tilføjer admin-rolle hvis `NEW.email = 'jonas@bager.dk'`.
- `useIsAdmin`: `supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role','admin').maybeSingle()`.

### Hvad jeg IKKE rører
- Waitlist-formular, landing-tekst, eller eksisterende sidebar-punkter.
