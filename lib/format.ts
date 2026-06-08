const SYMBOLS: Record<string, string> = {
  LKR: "Rs ",
  USD: "$",
  GBP: "£",
  EUR: "€",
  AUD: "A$",
  CAD: "C$",
};

export function formatMoney(amount: number | null | undefined, currency = "LKR"): string {
  if (amount == null) return "Price on request";
  const sym = SYMBOLS[currency] ?? currency + " ";
  const rounded = Number.isInteger(amount) ? amount : Math.round(amount * 100) / 100;
  const grouped = rounded.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(rounded) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${sym}${grouped}`;
}

export function cartTotal(items: { price: number | null; quantity: number }[]): number {
  return items.reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0);
}

export function cartCount(items: { quantity: number }[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}
