export const company = {
  name: "Bager Consulting",
  cvr: "41679182",
  fiscalYear: 2025,
  vatPeriod: "halvår" as const,
};

export const formatAmount = (amount: number): string => {
  return amount.toLocaleString("da-DK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kr";
};

export const formatAmountShort = (amount: number): string => {
  return amount.toLocaleString("da-DK", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " kr";
};

export const kpiData = {
  revenueYTD: 411397,
  resultYTD: 171287,
  vatOwed: -1257,
  bankBalance: 127423,
};

export const inboxCounts = {
  unmatchedDocuments: 8,
  unmatchedTransactions: 12,
  pendingSuggestions: 6,
};

export interface JournalEntry {
  id: string;
  date: string;
  description: string;
  amount: number;
  account: string;
  accountNumber: number;
  status: "godkendt" | "ai-forslag" | "afventer";
  hasDocument: boolean;
}

export const recentEntries: JournalEntry[] = [
  { id: "1", date: "2025-04-15", description: "Elgiganten — Skærm", amount: -3499, account: "Småanskaffelser", accountNumber: 3615, status: "godkendt", hasDocument: true },
  { id: "2", date: "2025-04-14", description: "Adobe Creative Cloud", amount: -449, account: "Software", accountNumber: 3630, status: "godkendt", hasDocument: true },
  { id: "3", date: "2025-04-12", description: "Faktura #2025-047 — Designprojekt", amount: 28500, account: "Nettoomsætning", accountNumber: 1000, status: "ai-forslag", hasDocument: false },
  { id: "4", date: "2025-04-10", description: "DSB — Transport", amount: -342, account: "Rejseudgifter", accountNumber: 3680, status: "godkendt", hasDocument: true },
  { id: "5", date: "2025-04-09", description: "Kontorland — Kontorartikler", amount: -1287, account: "Kontorartikler", accountNumber: 3620, status: "afventer", hasDocument: false },
  { id: "6", date: "2025-04-07", description: "Faktura #2025-046 — Konsulenthonorar", amount: 45000, account: "Nettoomsætning", accountNumber: 1000, status: "godkendt", hasDocument: true },
  { id: "7", date: "2025-04-05", description: "Mobilepay — Frokost kundemøde", amount: -385, account: "Repræsentation", accountNumber: 3670, status: "ai-forslag", hasDocument: false },
];

export interface UnmatchedDocument {
  id: string;
  vendor: string;
  amount: number;
  date: string;
  type: "kvittering" | "faktura";
}

export const unmatchedDocuments: UnmatchedDocument[] = [
  { id: "d1", vendor: "Elgiganten", amount: 3499, date: "2025-04-15", type: "kvittering" },
  { id: "d2", vendor: "Kontorland", amount: 1287, date: "2025-04-09", type: "kvittering" },
  { id: "d3", vendor: "Adobe", amount: 449, date: "2025-04-14", type: "faktura" },
  { id: "d4", vendor: "Proshop", amount: 2199, date: "2025-04-08", type: "kvittering" },
  { id: "d5", vendor: "Wolt", amount: 187, date: "2025-04-06", type: "kvittering" },
  { id: "d6", vendor: "Amazon", amount: 799, date: "2025-04-03", type: "kvittering" },
  { id: "d7", vendor: "IKEA", amount: 3450, date: "2025-04-01", type: "kvittering" },
  { id: "d8", vendor: "Coolshop", amount: 549, date: "2025-03-28", type: "kvittering" },
];

export interface UnmatchedTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
}

export const unmatchedTransactions: UnmatchedTransaction[] = [
  { id: "t1", date: "2025-04-15", description: "ELGIGANTEN AALBORG", amount: -3499 },
  { id: "t2", date: "2025-04-14", description: "ADOBE SYSTEMS", amount: -449 },
  { id: "t3", date: "2025-04-13", description: "OVERFØRSEL FRA KUNDE", amount: 28500 },
  { id: "t4", date: "2025-04-10", description: "DSB MOBILBILLET", amount: -342 },
  { id: "t5", date: "2025-04-09", description: "KONTORLAND.DK", amount: -1287 },
  { id: "t6", date: "2025-04-08", description: "PROSHOP.DK", amount: -2199 },
  { id: "t7", date: "2025-04-07", description: "OVERFØRSEL FRA KUNDE", amount: 45000 },
  { id: "t8", date: "2025-04-06", description: "WOLT TECHNOLOGY", amount: -187 },
  { id: "t9", date: "2025-04-05", description: "MOBILEPAY SEND", amount: -385 },
  { id: "t10", date: "2025-04-03", description: "AMAZON EU SARL", amount: -799 },
  { id: "t11", date: "2025-04-01", description: "IKEA AARHUS", amount: -3450 },
  { id: "t12", date: "2025-03-28", description: "COOLSHOP A/S", amount: -549 },
];

export interface MatchSuggestion {
  id: string;
  documentId: string;
  transactionId: string;
  vendor: string;
  amount: number;
  documentDate: string;
  transactionDate: string;
  confidence: number;
  reason: string;
}

export const matchSuggestions: MatchSuggestion[] = [
  { id: "m1", documentId: "d1", transactionId: "t1", vendor: "Elgiganten", amount: 3499, documentDate: "2025-04-15", transactionDate: "2025-04-15", confidence: 99, reason: "Samme beløb, samme dato, leverandør matcher" },
  { id: "m2", documentId: "d2", transactionId: "t5", vendor: "Kontorland", amount: 1287, documentDate: "2025-04-09", transactionDate: "2025-04-09", confidence: 98, reason: "Samme beløb, samme dato, leverandør matcher" },
  { id: "m3", documentId: "d3", transactionId: "t2", vendor: "Adobe", amount: 449, documentDate: "2025-04-14", transactionDate: "2025-04-14", confidence: 97, reason: "Samme beløb, samme dato, leverandør matcher" },
  { id: "m4", documentId: "d4", transactionId: "t6", vendor: "Proshop", amount: 2199, documentDate: "2025-04-08", transactionDate: "2025-04-08", confidence: 95, reason: "Samme beløb, samme dato" },
  { id: "m5", documentId: "d5", transactionId: "t8", vendor: "Wolt", amount: 187, documentDate: "2025-04-06", transactionDate: "2025-04-06", confidence: 92, reason: "Samme beløb, dato ±1 dag" },
  { id: "m6", documentId: "d6", transactionId: "t10", vendor: "Amazon", amount: 799, documentDate: "2025-04-03", transactionDate: "2025-04-03", confidence: 88, reason: "Samme beløb, leverandør matcher" },
];

export interface TaxRubrik {
  number: number;
  name: string;
  amount: number;
  explanation: string;
}

export const taxRubrikker: TaxRubrik[] = [
  { number: 320, name: "Nettoomsætning", amount: 411397, explanation: "Samlet omsætning ekskl. moms for regnskabsåret. Beregnet som summen af alle posteringer på konto 1000 (Nettoomsætning)." },
  { number: 321, name: "Vareforbrug", amount: 32728, explanation: "Forbrug af materialer og varer indkøbt til videresalg eller forbrug i produktionen." },
  { number: 322, name: "Fremmed arbejde/underleverandører", amount: 207382, explanation: "Udgifter til underleverandører og freelancere der har udført arbejde for virksomheden." },
  { number: 325, name: "Resultat før afskrivninger", amount: 1672, explanation: "Omsætning fratrukket alle driftsudgifter eksklusive afskrivninger. Beregnet: 411.397 - 32.728 - 207.382 - øvrige driftsudgifter." },
  { number: 331, name: "Egenkapital ultimo", amount: 21106, explanation: "Virksomhedens egenkapital ved regnskabsårets slutning. Primo egenkapital + årets resultat - private hævninger." },
  { number: 332, name: "Balancesum", amount: 127423, explanation: "Summen af alle aktiver (eller passiver) i balancen pr. 31. december." },
  { number: 638, name: "Skyldig moms ultimo", amount: -1257, explanation: "Moms der ikke var forfalden pr. 31/12. Din H2-moms på -1.257 kr var ikke indberettet ved årets udgang, derfor er dette et tilgodehavende." },
];

export const chatMessages = [
  { id: "c1", role: "user" as const, content: "Jeg har købt en skærm til 3.499 kr hos Elgiganten" },
  {
    id: "c2",
    role: "system" as const,
    content: "",
    booking: {
      date: "15. april 2025",
      amountInclVat: 3499,
      amountExclVat: 2799.20,
      vat: 699.80,
      account: "3615 — Småanskaffelser",
      counterAccount: "Bankkonto",
    },
  },
  { id: "c3", role: "user" as const, content: "Godkendt. Her er kvitteringen.", hasAttachment: true },
  { id: "c4", role: "system" as const, content: "Bilag modtaget. Jeg kan se det er en kvittering fra Elgiganten på 3.499 kr dateret 15. april 2025. Det matcher posteringen ovenfor — skal jeg tilknytte det?" },
  { id: "c5", role: "user" as const, content: "Ja, gør det" },
  { id: "c6", role: "system" as const, content: "Bilag tilknyttet postering. Alt er bogført og matchet ✓" },
];
