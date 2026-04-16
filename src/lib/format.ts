export const formatAmount = (amount: number): string => {
  return amount.toLocaleString("da-DK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kr";
};

export const formatAmountShort = (amount: number): string => {
  return amount.toLocaleString("da-DK", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " kr";
};
