// Deterministic fake-data generator for Demo Mode.
// Given a stable seed (usually the entity's ID), always returns the same
// fake value — so the UI looks consistent across renders and page switches.

// ─── Seeded hash ─────────────────────────────────────────────
function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// ─── Pools of realistic fake data (Malaysian flavour) ───────
const FIRST_NAMES = [
  "Alex", "Sarah", "Ahmad", "Mei", "Daniel", "Priya", "Zaid", "Chen",
  "Farah", "Rohan", "Nurul", "Ming", "Hafiz", "Lila", "Kiran", "Wei",
  "Amira", "Jason", "Siti", "Ryan", "Aisha", "Vincent", "Hana", "Kevin",
];

const LAST_NAMES = [
  "Wong", "Lim", "Tan", "Abdullah", "Razak", "Kumar", "Cheng", "Ng",
  "Ibrahim", "Lee", "Chong", "Yap", "Hussein", "Goh", "Raj", "Chua",
  "Othman", "Koh", "Ahmad", "Ho", "Mansor", "Liew", "Nair", "Teo",
];

const BUSINESS_PREFIXES = [
  "Orchid", "Banyan", "Sunrise", "Harbour", "Summit", "Mosaic",
  "Verdant", "Crescent", "Lantern", "Pelangi", "Teratai", "Nova",
  "Atlas", "Kinta", "Saga", "Altitude", "Palm", "Gemilang",
];

const BUSINESS_SUFFIXES = [
  "Holdings", "Digital", "Group", "Studios", "Tech", "Resources",
  "Ventures", "Solutions", "Co", "Sdn Bhd", "Enterprise", "Labs",
  "Partners", "Industries", "Consulting", "Media",
];

const INDUSTRY_HINTS: Record<string, string[]> = {
  "F&B": ["Kitchen", "Bistro", "Cafe", "Dining"],
  "Real Estate": ["Properties", "Realty", "Estates", "Spaces"],
  "Hair & Beauty": ["Studio", "Salon", "Beauty", "Style"],
  Healthcare: ["Clinic", "Health", "Wellness", "Medical"],
  Education: ["Academy", "Learning", "Institute", "Education"],
  "E-commerce": ["Store", "Shop", "Market", "Retail"],
  Finance: ["Capital", "Partners", "Advisory", "Holdings"],
  Tech: ["Tech", "Labs", "Systems", "Digital"],
};

// ─── Fake generators ─────────────────────────────────────────

export function censorName(original: string, seed?: string): string {
  if (!original) return original;
  const key = seed || original;
  const h = hash(key);
  const first = FIRST_NAMES[h % FIRST_NAMES.length];
  const last = LAST_NAMES[(h >> 3) % LAST_NAMES.length];
  // Preserve "Dr." / "Mr." / "Mrs." / "Ms." prefixes if present
  const titleMatch = original.match(/^(Dr\.?|Mr\.?|Mrs\.?|Ms\.?)\s+/i);
  const title = titleMatch ? titleMatch[0] : "";
  return `${title}${first} ${last}`;
}

export function censorBusiness(
  original: string,
  seed?: string,
  industry?: string | null
): string {
  if (!original) return original;
  const key = seed || original;
  const h = hash(key);
  const prefix = BUSINESS_PREFIXES[h % BUSINESS_PREFIXES.length];
  const suffix = BUSINESS_SUFFIXES[(h >> 3) % BUSINESS_SUFFIXES.length];

  // If we know the industry, sprinkle an industry-flavoured word sometimes
  if (industry && INDUSTRY_HINTS[industry] && h % 2 === 0) {
    const hint =
      INDUSTRY_HINTS[industry][
        (h >> 5) % INDUSTRY_HINTS[industry].length
      ];
    return `${prefix} ${hint}`;
  }
  return `${prefix} ${suffix}`;
}

export function censorEmail(original: string, seed?: string): string {
  if (!original) return original;
  const key = seed || original;
  const h = hash(key);
  const first = FIRST_NAMES[h % FIRST_NAMES.length].toLowerCase();
  const last = LAST_NAMES[(h >> 3) % LAST_NAMES.length].toLowerCase();
  return `${first}.${last}@example.com`;
}

export function censorPhone(original: string, seed?: string): string {
  if (!original) return original;
  const key = seed || original;
  const h = hash(key);
  // Malaysian mobile-ish format
  const mid = String(1000 + (h % 9000)).padStart(4, "0");
  const end = String(1000 + ((h >> 4) % 9000)).padStart(4, "0");
  return `+60 12-${mid} ${end}`;
}

export function censorAmount(original: string | number): string {
  if (original == null || original === "") return String(original ?? "");
  const str = String(original);
  // Preserve currency symbols + non-digit chars, replace digits with X
  return str.replace(/\d/g, "X");
}

export function censorUrl(original: string): string {
  if (!original) return original;
  try {
    const u = new URL(
      original.startsWith("http") ? original : `https://${original}`
    );
    return `${u.protocol}//example.com${u.pathname === "/" ? "" : "/***"}`;
  } catch {
    return "example.com";
  }
}

// Short truncation with dots — for things like notes/summaries in cards
export function censorShort(original: string, keep = 6): string {
  if (!original) return original;
  return original.slice(0, keep) + "••••••••••";
}

// Generic blur CSS class — components apply this when demo mode is on.
// Uses tailwind-compatible className; real blur rule lives in globals.css.
export const BLUR_CLASS = "demo-blur";
