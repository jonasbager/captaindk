# Flyt dit regnskab + CSV-import — design

Date: 2026-06-15
Status: approved (design), pending implementation plan

## Goal

Two related features, built on a shared CSV foundation:

1. **Bank-sync alternative** — finish the existing CSV transaction importer
   (`src/pages/Import.tsx`) so it's a genuine, discoverable alternative to the
   Enable Banking integration (which is still in sandbox). For users who can't
   or won't connect their bank.
2. **"Flyt dit regnskab"** — a migration wizard that lets users coming from
   Dinero or Billy bring their existing books into Captain via CSV exports:
   customers, products, open invoices, and opening balances (saldobalance).

Both are CSV-driven (upload → map columns → review → commit), so they share one
parsing/mapping core.

## Recommended approach

One shared CSV core, two consumers. Extract the proven parsing/mapping/review
logic out of `Import.tsx` into a reusable module + component, then build both
features on top. Avoids divergent CSV parsers and is the smaller total build.

Rejected alternatives: four standalone importers (less guided, worse conversion
for switchers); overloading `Import.tsx` with an import-type dropdown (one page
doing too much).

## Shared foundation

### `src/lib/csv.ts`
Pure helpers extracted from `Import.tsx` (no behavioural change):
- `splitCsvLine(line, delimiter)`, `detectDelimiter(lines)`
- `parseLocalizedAmount(value)` (Danish `1.234,56` handling)
- `parseDate(raw)` (ISO + `dd-mm-yyyy` + fallback)
- `parseCsv(text)` → `{ headers, rows }`

### `<CsvImporter>` component
Reusable upload → preview → column-mapping UI driven by a config:
- `columns`: the target fields this import expects (label + optional matcher
  regex for auto-mapping + required flag)
- `onCommit(mappedRows)`: consumer-supplied commit handler
- optional `renderReviewRow` for custom review (e.g. AI suggestion badge)

`Import.tsx` is refactored to consume `<CsvImporter>` with no UX regression.

### `suggest-accounts` edge function (new)
Batch account suggestion via the Claude API (same pattern as `extract-receipt`,
direct Anthropic Messages API, `ANTHROPIC_API_KEY`, tool use):
- Input: `{ company_id, rows: [{ description, amount }] }`
- Loads the company's kontoplan (accounts), asks Claude to pick the best
  `account_number` per row, returns `[{ index, account_number, reason }]`.
- `verify_jwt` stays true (called from the authenticated frontend).

## Feature 1 — Bank-sync alternative

- **Surface on Integrationer**: add a card "Importér kontoudtog (CSV)" next to
  "Forbind bank", framed as an equal alternative, linking to `/import`.
- **Auto-match**: after inserting rows into `transactions`, invoke the existing
  `auto-match` edge function (the way `bank-sync` matches transactions to
  receipts). Currently the importer inserts but never matches.
- **Real AI suggestions**: replace the stubbed `noSuggestion` in the review step
  with a `suggest-accounts` call; show the suggested konto as an editable badge
  per row. Failure degrades gracefully to "ikke foreslået" (no hard error).

No schema change. Transactions already carry `source` (set to the chosen bank /
"andet").

## Feature 2 — "Flyt dit regnskab" migration wizard

New page `src/pages/Migrer.tsx` (route `/migrer`), linked from Integrationer and
offered as an optional step at the end of onboarding. Four **independent,
skippable** steps, each a CSV upload through `<CsvImporter>`. A single
**cutover date** (default = company `fiscal_year_start`) applies to the
saldobalance step.

### Step 1 — Kunder → `customers`
Map: name (required), cvr, email, address, payment terms. Dedup by CVR (else by
name, case-insensitive) — existing customer is updated, not duplicated.

### Step 2 — Produkter → `products` (new table)
Map: name (required), description, unit_price, vat_rate (default 25), unit.
Dedup by name.

### Step 3 — Åbne fakturaer → `invoices`
Map: invoice number, customer (matched to `customers` by name/CVR; created if
missing), date, due_date, total. Inserted with `status = 'sendt'`. A single
summary line is synthesised into `lines` so the invoice renders. **These do NOT
post their own AR journal entries** — see Accounting rule.

### Step 4 — Saldobalance → opening-balance `journal_entries`
Map each CSV row: source account (Dinero/Billy konto number/name) + balance.
User maps each source account to a Captain kontoplan account (row-level mapping
UI; `suggest-accounts`-style name matching may assist later, not required for
v1). For each mapped row, insert a `journal_entries` row dated at the cutover
date: `account_id` set, `vat_code='NONE'`, `net_amount = amount`,
`description = "Primo (overført fra <kilde>)"`, `status='godkendt'`. These feed
the engine's balance/oplysningsskema as the opening position.

## New schema — `products`

```sql
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  vat_rate INTEGER NOT NULL DEFAULT 25,
  unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company owners can manage products" ON public.products
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies WHERE id = products.company_id AND owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.companies WHERE id = products.company_id AND owner_id = auth.uid()));
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

**Faktura wiring**: in invoice creation, line description gets an optional
product picker that prefills price + vat_rate. Free-text entry still works.

## Accounting rule (confirmed with user)

The saldobalance is the **single source of opening balances**, including the
debitor (5100) and any kreditor totals. Open invoices imported in Step 3 are
**records only** — for tracking and collection — and do **not** create AR
journal entries, to avoid double-counting the debitor opening balance. When an
imported invoice is later marked paid, the normal bank↔debitor payment posting
draws down the opening balance correctly.

The wizard shows a **reconciliation check**: sum of imported open-invoice totals
vs. the debitor opening balance, flagged if they differ so the user can fix the
source data before committing.

## CSV format expectations

Dinero and Billy both export the relevant lists as CSV/Excel (kontakter,
produkter, fakturaliste, saldobalance). Column names vary, so every step relies
on the `<CsvImporter>` mapping UI with best-effort auto-mapping via header
regex; the user can always correct the mapping. No hard dependency on an exact
Dinero/Billy schema.

## Error handling

- Invalid/empty CSV, wrong delimiter, unmapped required column → inline error,
  no commit.
- Per-row validation (missing date/amount/account mapping) → row excluded with a
  visible count, rest proceeds.
- Edge-function failures (`suggest-accounts`) degrade gracefully; commits never
  depend on AI.
- All commits are scoped by `company_id`; RLS enforces ownership.

## Testing

- Unit tests for `src/lib/csv.ts` (delimiter detection, Danish number/date
  parsing, quoted fields) — vitest.
- Unit test for the reconciliation calc (open-invoice sum vs. debitor balance).
- Manual: import a sample Dinero export through each wizard step on the live app.

## Scope boundaries

- **In scope**: shared CSV core, bank importer finish (surface + auto-match +
  AI), migration wizard (4 steps), `products` table + Faktura picker,
  reconciliation check, `suggest-accounts` function.
- **Out of scope (v1)**: direct Billy/Dinero API/OAuth integration; importing
  full historical posting detail (kontospecifikation); supplier bills / AP
  (only mentioned as future symmetry); multi-currency opening balances.

## Phasing

Can ship in two phases sharing the foundation:
- Phase A: `src/lib/csv.ts` + `<CsvImporter>` refactor + Feature 1.
- Phase B: `products` table, migration wizard, Faktura picker.
