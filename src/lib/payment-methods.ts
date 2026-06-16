// Betalingsmetoder der kan vises på fakturaer. Holdes ét sted så Indstillinger,
// Faktura og PDF bruger samme nøgler.
export type PaymentMethodKey = "bank" | "mobilepay" | "iban";

export const PAYMENT_METHODS: { key: PaymentMethodKey; label: string }[] = [
  { key: "bank", label: "Bankoverførsel (reg.nr. + konto)" },
  { key: "mobilepay", label: "MobilePay" },
  { key: "iban", label: "IBAN / SWIFT" },
];

type PaymentFields = {
  bank_reg?: string | null;
  bank_konto?: string | null;
  mobilepay?: string | null;
  iban?: string | null;
  swift?: string | null;
};

// Er metoden udfyldt på virksomheden (kan den overhovedet vises)?
export function methodIsFilled(key: PaymentMethodKey, c: PaymentFields): boolean {
  switch (key) {
    case "bank": return !!(c.bank_reg || c.bank_konto);
    case "mobilepay": return !!c.mobilepay;
    case "iban": return !!(c.iban || c.swift);
  }
}

// Metoder virksomheden faktisk har udfyldt (i fast rækkefølge)
export function filledMethods(c: PaymentFields): PaymentMethodKey[] {
  return PAYMENT_METHODS.map((m) => m.key).filter((k) => methodIsFilled(k, c));
}
