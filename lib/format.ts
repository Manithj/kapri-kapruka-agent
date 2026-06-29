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

// Heuristic: is this product a cake (so we can offer an icing message + preview)?
export function isCake(p: { name?: string; category?: { name?: string } }): boolean {
  const hay = `${p.name ?? ""} ${p.category?.name ?? ""}`.toLowerCase();
  if (/cake|gateau|gâteau|cheesecake/.test(hay)) return true;
  return false;
}

type CustomizableInput = {
  name?: string;
  category?: { name?: string };
  description?: string;
  summary?: string;
};

function customHay(p: CustomizableInput): string {
  return `${p.name ?? ""} ${p.category?.name ?? ""} ${p.summary ?? ""} ${p.description ?? ""}`.toLowerCase();
}

// Heuristic: does this product need a custom photo from the buyer (photo mug,
// photo frame, collage…)? The MCP exposes no personalization metadata, so we
// sniff name/category/description. Photo items imply personalizable too.
export function needsPhoto(p: CustomizableInput): boolean {
  const hay = customHay(p);
  return /\bphoto\b|picture|collage|photo[\s-]?frame|photo[\s-]?mug/.test(hay);
}

// Heuristic: is this a personalizable product (name to print, custom message,
// dedication, photo…) — excluding cakes, which already have their own icing flow.
export function isPersonalizable(p: CustomizableInput): boolean {
  if (isCake(p)) return false;
  if (needsPhoto(p)) return true;
  const hay = customHay(p);
  return /personali[sz]ed|custom(?:i[sz]ed)?\b|your name|name (?:mug|print|gift)|add your|engrav|monogram/.test(hay);
}

// Adaptive label for the text input based on what the product seems to want.
export function customTextLabel(p: CustomizableInput): string {
  const hay = customHay(p);
  if (/\bcard\b|greeting/.test(hay)) return "Your message";
  if (/name/.test(hay)) return "Name to print";
  return "Personalization";
}
