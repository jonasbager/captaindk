// Currency-aware amount formatting.
// Default: Danish formatting in DKK ("kr."). Pass a currency to format other currencies properly.

const CURRENCY_SYMBOLS: Record<string, string> = {
  DKK: "kr.",
  EUR: "€",
  USD: "$",
  GBP: "£",
  SEK: "kr.",
  NOK: "kr.",
};

export const formatAmount = (amount: number, currency: string | null = "DKK"): string => {
  const cur = (currency || "DKK").toUpperCase();
  const num = amount.toLocaleString("da-DK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const symbol = CURRENCY_SYMBOLS[cur] ?? cur;
  // Place € / $ / £ before number, kr-style after.
  if (symbol === "€" || symbol === "$" || symbol === "£") return `${symbol}${num}`;
  return `${num} ${symbol}`;
};

// Fjern markdown-fremhævning (**, __, `) fra AI-svar, så det vises rent i chatten.
export const stripMarkdown = (text: string): string =>
  text.replace(/\*\*(.*?)\*\*/g, "$1").replace(/__(.*?)__/g, "$1").replace(/`(.*?)`/g, "$1");

export const formatAmountShort = (amount: number, currency: string | null = "DKK"): string => {
  const cur = (currency || "DKK").toUpperCase();
  const num = amount.toLocaleString("da-DK", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const symbol = CURRENCY_SYMBOLS[cur] ?? cur;
  if (symbol === "€" || symbol === "$" || symbol === "£") return `${symbol}${num}`;
  return `${num} ${symbol}`;
};
