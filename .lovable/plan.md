

# Captain — Full Polish & Feature Plan

This is a large 10-point update touching nearly every file. Here's how I'll execute it.

## Files to modify

### 1. Rebrand to "Captain"
- **index.html**: Title → "Captain — Din AI-kaptajn til bogføring", update all og/twitter meta tags
- **src/lib/demo-data.ts**: No "Bogføring" text here, but update `chatMessages` dates and add "Nav" label support
- **src/pages/Bilag.tsx**: Change email from `bilag.bogforing.dk` → `bilag.captain.dk`
- **src/pages/Bogfoer.tsx**: Add "Nav" label above system message bubbles
- **src/components/AppSidebar.tsx**: Replace "Bogføring" header text with Captain logo/icon + "Captain" text. Use Lucide `Compass` icon as the logo mark.
- **README.md**: Full replacement (point 10)

### 2. Update all dates to 2026
- **src/lib/demo-data.ts**: `fiscalYear: 2026`, all entry dates → `2026-04-xx`, all document/transaction dates → `2026-04-xx`, match suggestion dates → `2026-04-xx`, chat booking date → "15. april 2026"
- **src/pages/Moms.tsx**: Restructure periods: H1 2025 betalt, H2 2025 betalt, H1 2026 åben (frist 2026-09-01)
- **src/pages/Skat.tsx**: Reference "Regnskabsår 2025" (filing previous year)
- **src/pages/Indstillinger.tsx**: Default date → "2026-01-01"
- **src/pages/Posteringer.tsx**: Update hardcoded entry dates to 2026
- **src/pages/Bogfoer.tsx**: Context panel dates → 2026
- **src/pages/Import.tsx**: Preview row dates → 2026-04-xx

### 3. Fix Kontoplan
- **src/pages/Kontoplan.tsx**: Complete rewrite with full account structure as specified (1000-6999 range with all accounts, SKAT-rubrik mappings, realistic balances, expandable rows showing recent posteringer)

### 4. Build out CSV Import flow
- **src/pages/Import.tsx**: Add multi-step flow (step 1: upload, step 2: preview + column mapping with dropdowns, step 3: review + approval with 4 items needing manual review)

### 5. Refine Settings
- **src/pages/Indstillinger.tsx**: Add three new sections: Nav assistant toggles, notification toggles, plan/billing placeholder

### 6. Posteringer tweaks
- **src/pages/Posteringer.tsx**: Add count header "247 posteringer i alt · 12 venter på godkendelse", ensure status badge colors are consistent

### 7. Indbakke polish
- **src/pages/Indbakke.tsx**: Style keyboard hint with border/bg, add hover highlighting linking AI-forslag to matching doc/tx, update empty state to "Alle forslag behandlet. Kom tilbage senere ⚓"

### 8. New Faktura page
- **src/pages/Faktura.tsx**: New page with invoice creation form (kunde, fakturanr auto-increment, dato/forfaldsdato, line items with beskrivelse/antal/pris/moms, auto-total) + list of previous invoices with status badges (kladde/sendt/betalt/forfalden) + "Send via email" / "Download PDF" buttons

### 9. Sidebar reorder
- **src/components/AppSidebar.tsx**: Reorder nav items + add Faktura with `FileText` icon between Bogfør and Indbakke

### 10. README
- **README.md**: Replace with the specified content

### Routing
- **src/App.tsx**: Add `/faktura` route

## Execution order
I'll work through all 10 points in a single pass, editing files in dependency order: demo-data first, then shared components (sidebar, layout), then individual pages, then README.

