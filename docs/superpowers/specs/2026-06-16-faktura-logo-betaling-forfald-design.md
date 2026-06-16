# Faktura: logo, betalingsoplysninger og forfaldsdatoer — design

Date: 2026-06-16
Status: approved (design), pending implementation

## Goal

Make Captain's invoices professional and self-sufficient:
1. Company **logo** on the invoice PDF.
2. **Payment details** on the invoice: bank reg.nr + kontonr, MobilePay, IBAN + SWIFT/BIC (company-level; shown if filled).
3. **Due dates** with a 3-level default hierarchy: company default → per-customer override → per-invoice override.

## Data model

### `companies` — new columns (migration)
- `logo_url TEXT` — storage path in the `branding` bucket
- `bank_reg TEXT`, `bank_konto TEXT`
- `mobilepay TEXT`
- `iban TEXT`, `swift TEXT`
- `default_payment_terms INTEGER NOT NULL DEFAULT 8`

`Company` type in `src/hooks/useCompany.tsx` extended to match.

### `customers`
No change — `default_payment_terms` already exists.

### `invoices`
No change — `due_date` already exists.

## Logo storage

New **private** storage bucket `branding`, owner-scoped RLS (mirrors `receipts`/`invoices`):
- objects under `<company_id>/...`; owner can read/insert/update/delete.
Uploaded from Indstillinger; path saved to `companies.logo_url`. Max ~1MB, PNG/JPG only.

Because the PDF is generated client-side, at generation time we download the logo
bytes from storage and embed them with pdf-lib (`embedPng`/`embedJpg`, chosen by
file extension). If the download or embed fails, the PDF renders without the logo
(non-fatal).

## Indstillinger — company settings

Extend the existing "Virksomhed" card:
- **Logo**: upload (PNG/JPG), preview current logo, remove. Upload writes to
  `branding/<company_id>/logo.<ext>` (upsert) and sets `companies.logo_url`.
- **Betalingsoplysninger**: inputs for bank reg.nr, kontonr, MobilePay, IBAN, SWIFT.
- **Standard betalingsfrist (dage)**: integer input → `default_payment_terms`.

The existing `save()` already updates `companies`; extend its `update({...})` with
the new fields. Logo upload is handled separately (storage + a `logo_url` update)
so a large file doesn't block the text save.

## Due-date resolution (3-level)

`resolveTerms(customer, company) = customer.default_payment_terms ?? company.default_payment_terms ?? 8`

In `Faktura.tsx`:
- When the selected customer **or** the invoice date changes, set
  `dueDate = invoiceDate + resolveTerms(...) days`.
- The due-date field stays editable — the user can override it for that one invoice.
  (Track a `dueDateTouched` flag so auto-fill doesn't clobber a manual edit on
  subsequent date changes.)
- The customer create/edit form gets a **Betalingsfrist (dage)** input writing
  `customers.default_payment_terms`.

## Invoice PDF (`src/lib/invoice-pdf.ts`)

Extend `Args.company` with the payment fields + an optional `logo?: { bytes: Uint8Array; type: "png" | "jpg" }` and `paymentTerms?: number`.
- **Logo**: embedded top-left, scaled to max height ~40px; company name/CVR sits
  to the right of (or just below) the logo. Falls back to text-only header if no logo.
- **Betaling block** (above the footer): renders the filled-in payment lines —
  `Reg. <reg> Konto <konto>`, `MobilePay: <nr>`, `IBAN <iban> SWIFT <swift>` — plus
  `Betalingsbetingelser: netto <terms> dage`.
- Closing line "Tak for handlen." stays.

The caller in `Faktura.tsx` (`saveInvoice`) downloads the logo bytes (if
`logo_url` set) and passes company payment fields + resolved terms into
`generateInvoicePdf`.

## Error handling

- Logo: wrong type/oversize → inline error, no upload. Download/embed failure at
  PDF time → render without logo, no hard failure.
- Payment fields are all optional; the Betaling block only shows filled lines.
- Due date always has a value (falls back to invoice date + 8).

## Testing

- Unit test for `resolveTerms` (customer override, company fallback, hard default).
- Manual: upload a logo, set payment details, create an invoice for a customer with
  custom terms, confirm the PDF shows logo + payment block + correct due date.

## Scope boundaries

- **In**: logo upload + render, three payment methods (company-level), 3-level due
  dates, customer terms input, PDF rendering, Indstillinger fields.
- **Out (YAGNI)**: free-text custom footer, per-invoice payment-method overrides,
  brand-color theming, multiple/segmented logos, FIK/giro line.
