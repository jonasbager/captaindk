# Captain — UX-audit: Er det chat-first?

## Kort svar: Nej. Ikke endnu. Skelettet er rigtigt, men hjernen mangler.

## Hvad der ER på plads (og er rigtigt)

- Chat er fane #1 i mobilnavigationen, historik persisteres pr. virksomhed, MessageCard understøtter strukturerede svar-kort. Arkitekturen VIL det rigtige.
- Indbakke-flowet (godkend/afvis med keyboard shortcuts) og Snap er stærke — det er de rigtige "detaljearbejde"-flader.
- Designretningen holder: mørkt tema, monospace-tal, ingen AI-glitter.

## Hvorfor det IKKE er chat-first endnu — tre beviser fra koden

**1. Captain har ingen hænder.** `captain-chat` er ét enkelt completion-kald uden tool use. Konteksten er fire COUNT-forespørgsler ("14 bilag, 3 umatchede transaktioner"). Captain kan tale OM regnskabet, men kan ikke røre det: ikke bogføre en postering, ikke godkende et match, ikke beregne moms, ikke oprette en faktura.

**2. Systemprompten siger det selv.** Den instruerer bogstaveligt Captain i at sende brugeren væk fra chatten: *"sig at de kan finde det under den relevante side (Bilag, Posteringer, Moms, Kontoplan)"*. Det er en hjælpe-widget-prompt, ikke en agent-prompt. Chatten er i dag en FAQ ovenpå appen — det modsatte af visionen.

**3. Tal-siderne er tomme skaller.** `Skat.tsx` har `taxRubrikker = []` hardkodet. Moms-siden har ingen beregning. Så selv "detaljearbejdet på desktop" viser ingenting endnu. 90/10-fordelingen kan ikke måles, for ingen af delene producerer tal.

## Vejen til ægte chat-first (prioriteret)

**P0 — Giv Captain værktøjer.** Skat-enginens funktioner ER tool-definitionerne:
`compute_moms(period)`, `compute_oplysningsskema(year)`, `compute_selskabsskat(year)`,
`book_entry(account, amount, vat_code, date)`, `approve_match(id)`, `reject_match(id)`,
`create_invoice(...)`, `search_entries(...)`, `get_deadlines()`.
Flyt samtidig fra Lovable-gatewayen til Claude API direkte (tool use + streaming) — det var allerede planen. Det er én fokuseret Claude Code-session.

**P1 — Vend prompten om.** Ny regel: Captain UDFØRER og viser resultatet som kort i chatten ("Booket: 1.250 kr. på 3630 Software, 250 kr. købsmoms ✓ [Fortryd]"). Siderne nævnes kun når brugeren beder om overblik. Hver tool-handling renderes som MessageCard med fortryd — tillid kommer af synlighed + reversibilitet, ikke af bekræftelses-dialoger.

**P2 — Lad tallene bo begge steder.** Moms- og Skat-siderne kalder samme engine som chatten. Chatten svarer "Du skylder 4.312 kr. i moms for H1 — vil du se grundlaget?" → link til siden med drill-down. Det er præcis 90/10-modellen: svaret i chatten, revisionssporet på desktop.

**P3 — Proaktivitet.** complianceCalendar + cron → Captain åbner samtalen: "Momsfristen er om 14 dage. Jeg har gjort H1 klar — 4.312 kr. Vil du se tallene?" Chat-first er ikke kun at brugeren skriver først; det er at Captain gør.

## Målepunkt

Når en bruger kan fotografere en kvittering, skrive "bogfør den" og indberette moms uden at forlade chat-fanen — så er det chat-first. Alt i P0+P1 er forudsætningen; P2/P3 er forskellen på "AI-feature" og "AI-produkt".
