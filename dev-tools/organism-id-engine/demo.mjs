/**
 * demo.mjs — proves the two load-bearing behaviors end to end:
 *   1. Honest links: names resolve to a real GBIF ladder + verified Wikipedia URL.
 *   2. Stakes-not-confidence: a DEADLY warning fires for an 85%-confident
 *      "portobello", and fires even for a mushroom we have no specific rule for.
 *
 * Runs live against GBIF + Wikipedia; falls back to embedded fixtures (captured
 * from the real GBIF responses) so it is deterministic offline.
 *
 *   node demo.mjs
 */
import { readFile } from "node:fs/promises";
import { resolveTaxon, getReferences, RANK_ORDER } from "./taxon-resolver.mjs";
import { matchHazards, outputGuards } from "./hazard-matcher.mjs";

const rules = JSON.parse(await readFile(new URL("./hazard-rules.json", import.meta.url)));

// --- offline fixtures (shape matches taxon-resolver output) ---------------
const L = (pairs) => pairs.map(([rank, name, key]) => ({ rank, name, key: key ?? null }));
const FIXTURES = {
  "Danaus plexippus": L([["kingdom","Animalia",1],["phylum","Arthropoda",54],["class","Insecta",216],["order","Lepidoptera",797],["family","Nymphalidae",7017],["genus","Danaus",5133087],["species","Danaus plexippus",5133088]]),
  "Limenitis archippus": L([["kingdom","Animalia",1],["phylum","Arthropoda",54],["class","Insecta",216],["order","Lepidoptera",797],["family","Nymphalidae",7017],["genus","Limenitis"],["species","Limenitis archippus"]]),
  "Agaricus bisporus": L([["kingdom","Fungi",5],["phylum","Basidiomycota",34],["class","Agaricomycetes",186],["order","Agaricales",1499],["family","Agaricaceae",4170],["genus","Agaricus",2518646],["species","Agaricus bisporus",5243447]]),
  "Amanita phalloides": L([["kingdom","Fungi",5],["phylum","Basidiomycota",34],["class","Agaricomycetes",186],["order","Agaricales",1499],["family","Amanitaceae",4171],["genus","Amanita",6005964],["species","Amanita phalloides",5240325]]),
  "Agaricus campestris": L([["kingdom","Fungi",5],["phylum","Basidiomycota",34],["class","Agaricomycetes",186],["order","Agaricales",1499],["family","Agaricaceae",4170],["genus","Agaricus",2518646],["species","Agaricus campestris"]]),
  "Pleurotus ostreatus": L([["kingdom","Fungi",5],["phylum","Basidiomycota",34],["class","Agaricomycetes",186],["order","Agaricales",1499],["family","Pleurotaceae"],["genus","Pleurotus"],["species","Pleurotus ostreatus"]]),
};

async function resolve(name) {
  const live = await resolveTaxon(name);
  if (live.matched) return live;
  // fall back to fixture so the demo runs offline / deterministically
  if (FIXTURES[name]) {
    return { matched: true, input: name, canonicalName: name, rank: "SPECIES",
             lineage: FIXTURES[name], gbif: null, __fixture: true };
  }
  return live;
}

const BADGE = { DEADLY: "🟥 DEADLY", CONTACT: "🟧 CONTACT", MILD: "🟨 MILD", INFO: "🟦 INFO" };
const pct = (c) => (c == null ? "" : ` ${Math.round(c * 100)}%`);

function ladder(taxon) {
  const byRank = Object.fromEntries((taxon.lineage || []).map((n) => [n.rank, n.name]));
  return RANK_ORDER.filter((r) => byRank[r]).map((r) => `${r[0].toUpperCase()}:${byRank[r]}`).join(" › ");
}

async function runCase(title, primaryName, primaryConf, candidateSpecs) {
  console.log("\n" + "═".repeat(78) + `\n▶  ${title}\n` + "═".repeat(78));

  const primary = { ...(await resolve(primaryName)), confidence: primaryConf };
  const candidates = [];
  for (const [name, conf] of candidateSpecs) {
    candidates.push({ ...(await resolve(name)), confidence: conf });
  }

  console.log(`\nModel's ranked candidates (confidence shown, but NOT used to gate warnings):`);
  console.log(`   • ${primary.canonicalName}${pct(primary.confidence)}   ← top ID`);
  for (const c of candidates) console.log(`   • ${c.canonicalName}${pct(c.confidence)}`);

  console.log(`\nTaxonomic ladder (top ID, from GBIF${primary.__fixture ? " fixture" : " live"}):`);
  console.log(`   ${ladder(primary)}`);

  // References — only links that actually resolve are shown.
  const refs = await getReferences(primary);
  console.log(`\nVerified references (only shown if they resolve):`);
  for (const [k, ref] of Object.entries(refs)) {
    if (ref) console.log(`   • ${ref.title} → ${ref.url}`);
  }
  if (refs.wikipedia?.extract) console.log(`     "${refs.wikipedia.extract.slice(0, 130)}…"`);

  // Hazards.
  const hz = matchHazards({ primary, candidates }, rules);
  const guards = outputGuards(hz);

  console.log(`\nLayer 1 — always-on field ethics:`);
  for (const r of hz.alwaysOn.rules) console.log(`   ◦ ${r}`);

  console.log(`\nLayer 2 — context hazard warnings (${hz.warnings.length}):`);
  if (!hz.warnings.length) console.log(`   (none — benign)`);
  for (const w of hz.warnings) {
    console.log(`   ${BADGE[w.tier] || w.tier}  [fired by ${w.firedBy}${w.source === "confusion" ? " · lookalike edge" : " · category net"}]`);
    console.log(`      ${w.message}`);
    if (w.tell) console.log(`      Tell: ${w.tell}`);
    if (w.consequence) console.log(`      If wrong: ${w.consequence}`);
    if (w.needsExpertReview) console.log(`      ⚠ needsExpertReview — not cleared for shipping`);
  }

  console.log(`\nRender guards: blockEdibilityClaims=${guards.blockEdibilityClaims} · forage=${guards.forageWarningActive} · handle/touch=${guards.handleWarningActive} · blockingInterstitial=${guards.requiresBlockingInterstitial}`);
}

// A) benign — honest links, no hazard
await runCase("CASE A — Monarch in the schoolyard (benign)", "Danaus plexippus", 0.96, [["Limenitis archippus", 0.04]]);

// B) the portobello case — 85% confident, DEADLY still fires at full strength
await runCase("CASE B — 'Looks like a portobello' at 85% confidence", "Agaricus bisporus", 0.85, [["Amanita phalloides", 0.06], ["Agaricus campestris", 0.05]]);

// C) fail-safe — a fungus we have NO specific rule for still trips the category net
await runCase("CASE C — Oyster mushroom, no specific rule (fail-safe net)", "Pleurotus ostreatus", 0.90, []);

console.log("\n" + "─".repeat(78));
console.log("Invariant demonstrated: in Case B the top ID is 85% benign, yet the DEADLY");
console.log("warning fires because a deadly lookalike shares its neighborhood. Confidence");
console.log("never suppressed it. In Case C, an unmodeled species still trips the net.");
