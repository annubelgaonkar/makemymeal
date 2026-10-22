// Menu, prices and nutrition. Shared by the browser and the server; the server always recomputes totals.
// Bread: The Health Factory Zero Maida (Simply Whole Wheat), 27 g slice.
// Peanut butter: Pintola All Natural Crunchy Unsweetened, label per 100 g scaled to a 16 g tbsp.
// Banana: USDA medium (118 g).
export const INGREDIENTS = [
  { key: "bread", name: "Bread slices", brand: "The Health Factory Zero Maida", unit: "slices", price: 5, min: 2, max: 12, def: 2,
    per: "slice (27 g)", n: { kcal: 65, p: 3.6, c: 11.9, f: 0.4, fib: 1.7, sug: 1.1 } },
  { key: "pb", name: "Peanut butter", brand: "Pintola Crunchy, unsweetened", unit: "tbsp", price: 15, min: 0, max: 8, def: 2,
    per: "tbsp (16 g)", n: { kcal: 97, p: 4.0, c: 3.5, f: 8.0, fib: 1.5, sug: 0.5 } },
  { key: "banana", name: "Banana", unit: "whole", price: 10, min: 0, max: 6, def: 1,
    per: "medium banana (118 g)", n: { kcal: 105, p: 1.3, c: 27.0, f: 0.4, fib: 3.1, sug: 14.4 } },
];

export const NUTRIENTS = [
  { k: "kcal", label: "Calories", u: "kcal" }, { k: "p", label: "Protein", u: "g" }, { k: "c", label: "Carbohydrates", u: "g" },
  { k: "f", label: "Fat", u: "g" }, { k: "fib", label: "Fibre", u: "g" }, { k: "sug", label: "Sugars", u: "g" },
];

export const DELIVERY_FEE = 30; // flat delivery charge in rupees

export const STATUSES = [
  { key: "placed", label: "Placed" },
  { key: "preparing", label: "Preparing" },
  { key: "out", label: "Out for delivery" },
  { key: "delivered", label: "Delivered" },
];

export const r1 = (x) => Math.round(x * 10) / 10;

export function defaultQty() {
  return Object.fromEntries(INGREDIENTS.map((i) => [i.key, i.def]));
}

/** Returns clean integer quantities, or null if anything is out of range. */
export function cleanItems(items) {
  if (!items || typeof items !== "object") return null;
  const out = {};
  for (const i of INGREDIENTS) {
    const v = Number(items[i.key]);
    if (!Number.isInteger(v) || v < i.min || v > i.max) return null;
    out[i.key] = v;
  }
  if (out.pb === 0 && out.banana === 0) return null;
  return out;
}

export function itemTotal(q) {
  return INGREDIENTS.reduce((s, i) => s + (q?.[i.key] || 0) * i.price, 0);
}

export function nutrition(q) {
  const t = {};
  NUTRIENTS.forEach((n) => { t[n.k] = r1(INGREDIENTS.reduce((s, i) => s + (q?.[i.key] || 0) * i.n[n.k], 0)); });
  t.kcal = Math.round(t.kcal);
  return t;
}
