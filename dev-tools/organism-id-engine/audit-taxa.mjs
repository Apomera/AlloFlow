/**
 * audit-taxa.mjs — validate the hazard data against the GBIF backbone.
 *
 * A deadly rule keyed to a misspelled/synonymized name, or to a rank GBIF's
 * lineage never exposes, would SILENTLY NEVER FIRE — a catastrophic, invisible
 * failure. This script confirms every trigger names a real GBIF backbone taxon
 * AT A RANK THE MATCHER CAN SEE, so those get fixed before an expert sign-off.
 *
 *   node audit-taxa.mjs
 *
 * Kept OUT of the unit suite (it hits the network). The pure structural check —
 * "no trigger uses a non-lineage rank" — lives in test.mjs as a hard gate.
 *
 * NOTE ON METHOD: we query GBIF's species SEARCH restricted to the Backbone
 * dataset and look for an exact canonicalName + rank match. (A bare genus like
 * "Conus" against species/MATCH returns HIGHERRANK because that endpoint is
 * tuned for binomials — a false alarm. The matcher never does that: it checks
 * whether the trigger appears in a resolved species' lineage, which it will.)
 */
import { readFile } from "node:fs/promises";

const BACKBONE = "d7dddbf4-2cf0-4f39-9b2a-bb099caae36c"; // GBIF Backbone Taxonomy
const STD = new Set(["kingdom", "phylum", "class", "order", "family", "genus", "species"]);
const rules = JSON.parse(await readFile(new URL("./hazard-rules.json", import.meta.url)));

const triggers = [];
for (const r of rules.categoryRules) triggers.push({ ...r.match, from: `category:${r.id}` });
for (const c of rules.confusions) for (const t of c.triggerTaxa || []) triggers.push({ ...t, from: `confusion:${c.id}` });
for (const h of rules.directHazards) for (const t of h.taxa || []) triggers.push({ ...t, from: `direct:${h.id}` });

const uniq = new Map();
for (const t of triggers) {
  const k = `${t.rank}|${t.name}`.toLowerCase();
  if (!uniq.has(k)) uniq.set(k, { rank: t.rank, name: t.name, from: [t.from] });
  else uniq.get(k).from.push(t.from);
}

async function check(rank, name) {
  if (!STD.has(rank.toLowerCase())) return { status: "DEAD_RANK", note: `rank '${rank}' is not in the GBIF lineage — this rule can never fire` };
  const url = `https://api.gbif.org/v1/species/search?q=${encodeURIComponent(name)}&rank=${rank.toUpperCase()}&datasetKey=${BACKBONE}&limit=40`;
  const res = await fetch(url, { headers: { "User-Agent": "AlloFlow-OrganismID-audit/0.2" } });
  if (!res.ok) return { status: "ERROR", note: `HTTP ${res.status}` };
  const j = await res.json();
  // A bare higher-taxon name can return several backbone entries (homonyms, doubtful
  // duplicates). Prefer an ACCEPTED one — that is what real species lineages carry.
  const matches = (j.results || []).filter((r) => (r.canonicalName || "").toLowerCase() === name.toLowerCase() && String(r.rank).toUpperCase() === rank.toUpperCase());
  if (!matches.length) return { status: "NOT_FOUND", note: `no backbone ${rank} '${name}'` };
  const accepted = matches.find((r) => String(r.taxonomicStatus).toUpperCase() === "ACCEPTED");
  if (accepted) return { status: "OK", note: `${accepted.rank} key ${accepted.key}` };
  return { status: "SYNONYM", note: `only ${matches[0].taxonomicStatus} found (key ${matches[0].key}) — prefer the accepted name` };
}

const items = [...uniq.values()];
const results = [];
let i = 0;
async function worker() { while (i < items.length) { const idx = i++; results[idx] = { ...items[idx], ...(await check(items[idx].rank, items[idx].name)) }; } }
await Promise.all(Array.from({ length: 6 }, worker));

const order = { ERROR: 0, DEAD_RANK: 1, NOT_FOUND: 2, SYNONYM: 3, OK: 4 };
results.sort((a, b) => order[a.status] - order[b.status]);

console.log(`\n=== GBIF hazard-trigger audit — ${results.length} unique triggers ===\n`);
const tally = {};
for (const r of results) {
  tally[r.status] = (tally[r.status] || 0) + 1;
  if (r.status !== "OK") {
    console.log(`  ${r.status.padEnd(9)} ${r.rank}:${r.name.padEnd(16)} ${r.note}`);
    console.log(`            used by: ${r.from.join(", ")}`);
  }
}
console.log("\nSummary:", Object.entries(tally).map(([k, v]) => `${k}=${v}`).join("  "));
const blocking = results.filter((r) => ["DEAD_RANK", "NOT_FOUND", "ERROR"].includes(r.status));
console.log(blocking.length
  ? `\n⚠ ${blocking.length} trigger(s) can't fire and need a fix.`
  : "\n✓ Every trigger resolves to a real GBIF backbone taxon at a rank the matcher can see. No silently-dead rules.");
if (tally.SYNONYM) console.log("  (SYNONYM = the name is a GBIF synonym; it still appears in lineages, but worth an expert glance to prefer the accepted name.)");
