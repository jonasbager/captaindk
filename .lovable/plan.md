

# Status og næste skridt

## Hvad er bygget og fungerer
Alle 11 sider er oprettet med demo-data, navigation, tema-skifter, og det grundlæggende design-system. Appen er funktionel som prototype.

## Prioriteret rækkefølge for forbedringer

### 1. Polish og UX-forbedringer på kernesiderne
- **Indbakke**: Drag-and-drop fra kolonne 1 til kolonne 2 for manuel matching (specificeret i planen men mangler). Items bør forsvinde fra kolonne 1/2 når de godkendes i kolonne 3.
- **Bogfør**: Chat-input gør ingenting — tilføj mulighed for at skrive en besked og få et simuleret svar (hardcoded demo-flow). Godkend/Ret-knapperne på BookingCard bør have visuel feedback (f.eks. kort bliver grønt/checkmarked).
- **Dashboard**: KPI-kort mangler responsivitet — 4 kolonner bryder på smallere skærme. Tilføj `grid-cols-2 md:grid-cols-4`.
- **Posteringer**: Tilføj periode-filter (dato-range) og bulk-actions (marker flere → godkend/slet) som beskrevet i planen.

### 2. Indbakke-reaktivitet
Når et AI-forslag godkendes, bør det tilsvarende bilag og den tilsvarende transaktion fjernes fra kolonne 1 og 2. Lige nu er de tre kolonner uafhængige.

### 3. Moms-side: Breakdown-view
Planen specificerer at klik på en momsperiode viser breakdown af alle momsposter. Lige nu er det bare et statisk kort. Tilføj expand/collapse med individuelle posteringer.

### 4. Light theme polish
Lys-temaet er defineret i CSS-variabler, men siderne er primært designet til mørkt tema. Gennemgå at alle sider ser korrekte ud i light mode — specielt borders, badge-farver og kontrast.

### 5. Responsivitet
Flere sider (Indbakke 3-kolonne, Bogfør 70/30 split, Dashboard KPI-grid) bryder på tablet/mobil. Tilføj breakpoints så de stacker pænt.

### 6. Mobil-scanner (/snap)
Planen beskriver en dedikeret mobil-first kamera-side med auto-detect, haptic feedback og batch-mode. Denne side er slet ikke bygget endnu. Den kræver MediaDevices API og er et selvstændigt stykke arbejde.

### 7. Supabase-integration
Alle data er hardcoded. Næste store skridt er at forbinde Lovable Cloud med database-tabeller, auth og storage, så data persisterer og flere brugere kan logge ind.

---

**Anbefalet startpunkt**: Punkt 1 og 2 — de gør den eksisterende prototype markant mere overbevisende som demo uden at tilføje nye sider. Derefter punkt 3-5 for polish, og til sidst punkt 6-7 som større features.

Skal jeg gå i gang med punkt 1 og 2?

