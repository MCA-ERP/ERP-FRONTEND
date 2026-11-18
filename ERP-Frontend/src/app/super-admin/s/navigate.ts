import { MENU, sectionHref } from "./menu";

interface Target { href: string; label: string; depth: number; segments: Set<string>[] }

const norm = (t: string) => t.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const stem = (w: string) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w);
const words = (t: string) => norm(t).split(" ").filter(Boolean).map(stem);
const FILLER = new Set(["the", "a", "an", "page", "pages", "screen", "section", "menu", "please", "me", "to", "in", "of", "my", "tab", "module", "management", "and", "for", "on", "it", "now", "option", "list"]);

const LEAD = "(?:please\\s+|just\\s+|can\\s+you\\s+|could\\s+you\\s+|would\\s+you\\s+|i\\s+want\\s+to\\s+|i\\s+would\\s+like\\s+to\\s+|i'd\\s+like\\s+to\\s+|let\\s+me\\s+|i\\s+need\\s+to\\s+)*";
/** "how can I open the roles page", "where is audit logs": asks the way instead of going there. */
const ASK = new RegExp(`^${LEAD}(?:how\\s+(?:can|do|to|should|could)\\s*(?:i|we|you)?\\s*(?:open|find|get\\s+to|go\\s+to|reach|access|see|view|check|visit)|where\\s+(?:is|are|can\\s+i\\s+find|can\\s+i\\s+see|do\\s+i\\s+find|do\\s+i\\s+see)|show\\s+me\\s+where\\s+(?:is|are)|which\\s+page\\s+(?:is|has|shows))\\s+(.+)$`, "i");
const VERB = new RegExp(`^${LEAD}(?:open|go\\s*to|goto|take\\s+me\\s+to|navigate\\s+to|navigate|visit|launch|switch\\s+to|jump\\s+to|show\\s+me\\s+the|bring\\s+up)\\s+(.+)$`, "i");

let cache: Target[] | null = null;
function targets(): Target[] {
  if (cache) return cache;
  const out: Target[] = [];
  const set = (t: string) => new Set(words(t));
  for (const [mkey, mod] of Object.entries(MENU) as [string, { label: string; sections: { key: string; label: string; pages: { key: string; title: string }[] }[] }][]) {
    const first = mod.sections[0];
    if (!first) continue;
    const landing = mod.sections.find((x) => x.key === "directory") ?? first;
    out.push({ href: sectionHref(mkey, landing.key), label: mod.label, depth: 0, segments: [set(mod.label)] });
    for (const sec of mod.sections) {
      out.push({ href: sectionHref(mkey, sec.key), label: `${mod.label} › ${sec.label}`, depth: 1, segments: [set(mod.label), set(sec.label)] });
      if (sec.pages.length > 1) for (const p of sec.pages) out.push({ href: `${sectionHref(mkey, sec.key)}?tab=${p.key}`, label: `${mod.label} › ${sec.label} › ${p.title}`, depth: 2, segments: [set(mod.label), set(sec.label), set(p.title)] });
    }
  }
  cache = out;
  return out;
}

/** One edit apart (a typo like "pemission"). Only for longer words, so short words are not confused. */
function near(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 5 || b.length < 5 || Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}
const has = (seg: Set<string>, w: string) => seg.has(w) || [...seg].some((x) => near(x, w));

function match(query: string): { href: string; label: string } | null {
  const q = words(query).filter((w) => !FILLER.has(w));
  if (!q.length) return null;
  let named: { t: Target; extra: number } | null = null; // pages whose own name is exactly what was typed
  let loose: { t: Target; score: number } | null = null;
  for (const t of targets()) {
    const all = new Set(t.segments.flatMap((s) => [...s]));
    const hit = q.filter((w) => has(all, w)).length;
    if (hit < q.length) continue; // every word the person said must be on the page's path
    const own = [...t.segments[t.segments.length - 1]].filter((w) => !FILLER.has(w));
    if (own.length && own.every((w) => q.some((x) => x === w || near(x, w)))) {
      const before = new Set(t.segments.slice(0, -1).flatMap((x) => [...x]));
      // a page only counts when its name adds something the path above does not already say ("plan list" after "plan management" does not)
      const adds = t.depth < 2 || own.some((w) => !before.has(w));
      const extra = all.size - hit;
      const better = !named || (q.length > 1 ? t.depth > named.t.depth : t.depth < named.t.depth) || (t.depth === named.t.depth && extra < named.extra);
      if (adds && better) named = { t, extra };
    }
    const score = hit * 10 - (all.size - hit) - t.depth * 0.5;
    if (!loose || score > loose.score) loose = { t, score };
  }
  // "roles and permission" names the Permissions page inside Role & Permissions; "open roles" only names the module
  const pick = named?.t ?? loose?.t;
  return pick ? { href: pick.href, label: pick.label } : null;
}

/** "open payment gateway" → the page it names. Returns null unless the message is an open / go-to or a "how do I open" question that matches a page. */
export function findNavigation(message: string): { href: string; label: string; how: boolean } | null {
  const text = message.trim().replace(/[.!?]+$/, "");
  const ask = ASK.exec(text);
  const m = ask ?? VERB.exec(text);
  if (!m) return null;
  const found = match(m[1]);
  return found ? { ...found, how: !!ask } : null;
}
