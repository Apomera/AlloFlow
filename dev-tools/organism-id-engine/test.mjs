/**
 * test.mjs — zero-dependency suite (node:test).  Run: node --test  (or: node test.mjs)
 *
 * The crown-jewel test is `invariant`: a DEADLY warning fires identically no
 * matter the confidence, and fires when a deadly organism is merely a
 * low-confidence candidate. If a refactor ever lets confidence gate a warning,
 * this suite goes red.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolveTaxon, getReferences, lineageFromGbif, resolveFromBackbone } from "./taxon-resolver.mjs";
import { matchHazards, outputGuards } from "./hazard-matcher.mjs";
import { applyEnrichment, sanitizeReassurance } from "./enrich.mjs";
import { identify, identifyMulti, mergeCandidates, mockCallVision_portobello } from "./pipeline.mjs";
import { stripJpegMetadata, listMetadataSegments, containsExif, looksLikeJpeg } from "./image-privacy.mjs";
import { createOrganismTool, localize } from "./allo-adapter.mjs";
import { blendCvWithModel, identifyBlended } from "./cv-classifier.mjs";
import { coarsenLocation, journalEntry } from "./geo-privacy.mjs";
import { TREE, EDGES } from "./taxonomy-data.mjs";
import { buildGuidedObservation } from "./guided-key.mjs";

const rules = JSON.parse(await readFile(new URL("./hazard-rules.json", import.meta.url)));

// ---- fixture taxa (resolver-shaped), no network ----
const node = (rank, name) => ({ rank, name, key: null });
const fungus = (genus, species, family) => ({
  matched: true, canonicalName: species, rank: "SPECIES",
  lineage: [node("kingdom", "Fungi"), node("phylum", "Basidiomycota"), node("class", "Agaricomycetes"),
    node("order", "Agaricales"), node("family", family), node("genus", genus), node("species", species)],
});
const portobello = fungus("Agaricus", "Agaricus bisporus", "Agaricaceae");
const deathcap = fungus("Amanita", "Amanita phalloides", "Amanitaceae");
const oyster = fungus("Pleurotus", "Pleurotus ostreatus", "Pleurotaceae");
const monarch = {
  matched: true, canonicalName: "Danaus plexippus", rank: "SPECIES",
  lineage: [node("kingdom", "Animalia"), node("phylum", "Arthropoda"), node("class", "Insecta"),
    node("order", "Lepidoptera"), node("family", "Nymphalidae"), node("genus", "Danaus"), node("species", "Danaus plexippus")],
};
const oleander = {
  matched: true, canonicalName: "Nerium oleander", rank: "SPECIES",
  lineage: [node("kingdom", "Plantae"), node("family", "Apocynaceae"), node("genus", "Nerium"), node("species", "Nerium oleander")],
};
const ids = (r) => r.warnings.map((w) => w.id).sort();

// ---------------------------------------------------------------- INVARIANT
test("INVARIANT: confidence never changes which warnings fire", () => {
  const at = (conf) => matchHazards(
    { primary: { ...portobello, confidence: conf }, candidates: [{ ...deathcap, confidence: 1 - conf }] },
    rules,
  );
  const a = at(0.01), b = at(0.5), c = at(0.99);
  assert.deepEqual(ids(a), ids(b), "0.01 vs 0.5 differ");
  assert.deepEqual(ids(b), ids(c), "0.5 vs 0.99 differ");
  assert.equal(a.maxSeverity, 4, "should be DEADLY at every confidence");
  assert.ok(ids(a).includes("agaricus-amanita"));
});

test("INVARIANT: a deadly organism as a 0.1%-confidence candidate still fires DEADLY", () => {
  // Top ID is a harmless butterfly; a death cap is a near-zero candidate.
  const r = matchHazards(
    { primary: { ...monarch, confidence: 0.999 }, candidates: [{ ...deathcap, confidence: 0.001 }] },
    rules,
  );
  assert.equal(r.maxSeverity, 4, "neighborhood contains a death cap → must be DEADLY");
  assert.ok(ids(r).includes("cat-fungi"));
});

// ---------------------------------------------------------------- MATCHER
test("neighborhood: benign Agaricus with no Amanita candidate still warns", () => {
  const r = matchHazards({ primary: { ...portobello, confidence: 0.9 }, candidates: [] }, rules);
  assert.equal(r.maxSeverity, 4);
  assert.ok(ids(r).includes("agaricus-amanita"), "lookalike edge fires from genus Agaricus alone");
  assert.ok(ids(r).includes("cat-fungi"), "category net also fires");
});

test("fail-safe: an unmodeled fungus still trips the category net", () => {
  const r = matchHazards({ primary: { ...oyster, confidence: 0.95 }, candidates: [] }, rules);
  assert.ok(ids(r).includes("cat-fungi"));
  assert.equal(r.maxSeverity, 4);
});

test("direct hazard: an oleander ID fires DEADLY", () => {
  const r = matchHazards({ primary: { ...oleander, confidence: 0.8 }, candidates: [] }, rules);
  const w = r.warnings.find((x) => x.id === "oleander");
  assert.ok(w, "oleander direct hazard should fire");
  assert.equal(w.source, "direct");
  assert.equal(r.maxSeverity, 4);
});

test("benign: a monarch fires no DEADLY/CONTACT warning", () => {
  const r = matchHazards({ primary: { ...monarch, confidence: 0.96 }, candidates: [] }, rules);
  assert.ok(r.maxSeverity < 3, "no hazard tiers for a monarch");
  for (const w of r.warnings) assert.equal(w.tier, "INFO");
});

test("outputGuards: edibility is always blocked; interstitial only for DEADLY", () => {
  const deadly = outputGuards(matchHazards({ primary: { ...portobello, confidence: 0.9 }, candidates: [] }, rules));
  const benign = outputGuards(matchHazards({ primary: { ...monarch, confidence: 0.9 }, candidates: [] }, rules));
  assert.equal(deadly.blockEdibilityClaims, true);
  assert.equal(benign.blockEdibilityClaims, true, "never clears anything to eat, even for a butterfly");
  assert.equal(deadly.requiresBlockingInterstitial, true);
  assert.equal(benign.requiresBlockingInterstitial, false);
});

// ---------------------------------------------------------------- RESOLVER (injected fetch, no network)
const fakeFetch = (byUrlIncludes) => async (url) => {
  const key = Object.keys(byUrlIncludes).find((k) => url.includes(k));
  if (!key) return { ok: false, status: 404 };
  return { ok: true, status: 200, json: async () => byUrlIncludes[key] };
};

test("resolver: lineageFromGbif returns Kingdom→Species order", () => {
  const rec = { kingdom: "Fungi", genus: "Agaricus", species: "Agaricus bisporus", order: "Agaricales", kingdomKey: 5 };
  const lin = lineageFromGbif(rec);
  assert.deepEqual(lin.map((n) => n.rank), ["kingdom", "order", "genus", "species"]);
  assert.equal(lin[0].key, 5);
});

test("resolver: an unmatched name is flagged unverified, not faked", async () => {
  const fetchImpl = fakeFetch({ "species/match": { matchType: "NONE" } });
  const r = await resolveTaxon("Notarealus fakename", { fetchImpl });
  assert.equal(r.matched, false);
  assert.match(r.note, /unverified/i);
});

test("resolver: a matched name yields a canonical ladder + separated match-confidence", async () => {
  const fetchImpl = fakeFetch({ "species/match": {
    usageKey: 5243447, canonicalName: "Agaricus bisporus", rank: "SPECIES", matchType: "EXACT",
    confidence: 97, kingdom: "Fungi", genus: "Agaricus", species: "Agaricus bisporus",
  } });
  const r = await resolveTaxon("Agaricus bisporus", { fetchImpl });
  assert.equal(r.matched, true);
  assert.equal(r.gbifNameMatchConfidence, 97, "name-match confidence, exposed separately from photo-ID confidence");
  assert.equal(r.gbif.url, "https://www.gbif.org/species/5243447");
});

test("references: only links that resolve are returned", async () => {
  const resolved = { matched: true, canonicalName: "Agaricus bisporus", gbif: { key: 1, url: "https://www.gbif.org/species/1" } };
  const good = await getReferences(resolved, { fetchImpl: fakeFetch({ "page/summary": {
    type: "standard", title: "Agaricus bisporus", extract: "x", content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/Agaricus_bisporus" } },
  } }) });
  assert.ok(good.wikipedia && good.wikipedia.url.includes("/wiki/"));
  // disambiguation page → wikipedia link suppressed
  const bad = await getReferences(resolved, { fetchImpl: fakeFetch({ "page/summary": { type: "disambiguation", content_urls: { desktop: { page: "x" } } } }) });
  assert.equal(bad.wikipedia, null, "disambiguation pages are not surfaced");
  assert.ok(bad.gbif, "gbif link still present");
});

// ---------------------------------------------------------------- DATA INTEGRITY (protects the hazard file)
test("data: every hazard entry is well-formed", () => {
  const validTier = (t) => Object.prototype.hasOwnProperty.call(rules.tiers, t);
  for (const c of rules.confusions) {
    assert.ok(c.id && c.message, `confusion ${c.id} needs id+message`);
    assert.ok(validTier(c.tier), `confusion ${c.id} bad tier ${c.tier}`);
    assert.ok(Array.isArray(c.triggerTaxa) && c.triggerTaxa.length, `confusion ${c.id} needs triggerTaxa`);
  }
  for (const h of rules.directHazards) {
    assert.ok(h.id && h.message && validTier(h.tier), `directHazard ${h.id} malformed`);
    assert.ok(Array.isArray(h.taxa) && h.taxa.length, `directHazard ${h.id} needs taxa`);
  }
  for (const r of rules.categoryRules) {
    assert.ok(r.id && r.message && r.match?.rank && r.match?.name, `categoryRule ${r.id} malformed`);
  }
});

test("data GATE: every hazard trigger uses a rank GBIF's lineage exposes (else it can never fire)", () => {
  const STD = new Set(["kingdom", "phylum", "class", "order", "family", "genus", "species"]);
  const triggers = [
    ...rules.categoryRules.map((r) => r.match),
    ...rules.confusions.flatMap((c) => c.triggerTaxa || []),
    ...rules.directHazards.flatMap((h) => h.taxa || []),
  ];
  const dead = triggers.filter((t) => !STD.has(String(t.rank).toLowerCase()));
  assert.equal(dead.length, 0,
    `triggers on a rank not in the GBIF lineage would silently never fire: ${dead.map((t) => t.rank + ":" + t.name).join(", ")}`);
});

test("data GATE: every DEADLY/CONTACT entry is either review-pending or signed off (never in limbo)", () => {
  // Supports the review workflow (see REVIEW.md): an entry is "accounted for" if it is
  // still flagged pending OR carries a named reviewer + date. Flipping needsExpertReview
  // to false WITHOUT adding reviewedBy+reviewedDate fails this gate — no silent clearing.
  const all = [...rules.categoryRules, ...rules.confusions, ...rules.directHazards];
  const limbo = all.filter((e) => (e.tier === "DEADLY" || e.tier === "CONTACT")
    && e.needsExpertReview !== true && !(e.reviewedBy && e.reviewedDate));
  assert.equal(limbo.length, 0,
    `lethal/contact entries in limbo — flip needsExpertReview→false only together with reviewedBy+reviewedDate: ${limbo.map((e) => e.id).join(", ")}`);
});

// ---------------------------------------------------------------- ENRICHMENT FIREWALL (grounding, walled off)
const deadlyModel = () => ({
  warnings: [{ source: "confusion", id: "agaricus-amanita", tier: "DEADLY", message: "death cap lookalike", needsExpertReview: true }],
  guards: { blockEdibilityClaims: true, requiresBlockingInterstitial: true },
});
const sev = (t) => rules.tiers[t].severity;

test("FIREWALL: web enrichment cannot remove or downgrade a deterministic DEADLY warning", () => {
  const out = applyEnrichment(deadlyModel(), {
    invasiveStatus: "none", advisories: ["This is edible and perfectly safe to eat."], sources: [],
  }, rules.tiers);
  assert.equal(out.warnings.length, 1);
  assert.equal(out.warnings[0].tier, "DEADLY", "deterministic warning must survive untouched");
  assert.equal(out.warnings[0].id, "agaricus-amanita");
});

test("FIREWALL: a web all-clear is stripped and never surfaces", () => {
  const out = applyEnrichment(deadlyModel(), {
    advisories: ["Completely harmless and safe to touch.", "Non-toxic and edible."], sources: [],
  }, rules.tiers);
  assert.ok(out.webContext.redactions >= 1, "reassurances should be counted as redactions");
  const blob = JSON.stringify(out.webContext.advisories).toLowerCase();
  assert.ok(!/safe to (eat|touch)|edible|harmless|non-?toxic/.test(blob), "no reassurance text may reach the student");
  assert.equal(out.guards.blockEdibilityClaims, true);
});

test("FIREWALL: real cautions pass as additive, web-tagged, capped at CONTACT", () => {
  const out = applyEnrichment(deadlyModel(), {
    advisories: [
      "Toxic hairs cause a poison-ivy-like rash — do not touch.",
      "Invasive in Maine; report the sighting to the state forest service.",
    ], sources: [{ title: "x", url: "https://example.gov" }],
  }, rules.tiers);
  const hazard = out.webContext.advisories.find((a) => a.kind === "local hazard");
  const invasive = out.webContext.advisories.find((a) => a.kind === "invasive/report");
  assert.ok(hazard && hazard.tier === "CONTACT" && hazard.provenance === "web — verify");
  assert.ok(invasive && invasive.kind === "invasive/report");
  for (const a of out.webContext.advisories) assert.ok(sev(a.tier) <= sev("CONTACT"), "web context can never assert DEADLY");
});

test("FIREWALL: sanitizeReassurance flags all-clears but leaves genuine cautions", () => {
  assert.equal(sanitizeReassurance("This mushroom is edible.").wasRedacted, true);
  assert.equal(sanitizeReassurance("Perfectly safe to handle.").wasRedacted, true);
  assert.equal(sanitizeReassurance("Toxic — do not touch.").wasRedacted, false);
});

// ---------------------------------------------------------------- GROUPING (alarm-fatigue fix)
test("grouping: same-danger Amanita edges collapse to one primary + related", () => {
  const r = matchHazards({ primary: { ...portobello, confidence: 0.85 }, candidates: [{ ...deathcap, confidence: 0.06 }] }, rules);
  assert.ok(r.warnings.length >= 4, "flat list keeps every fired warning (source of truth)");
  const amanita = r.groups.find((g) => g.key === "amanita");
  assert.ok(amanita, "an 'amanita' group should exist");
  assert.equal(amanita.primary.tier, "DEADLY");
  assert.ok(amanita.related.length >= 2, "the other Amanita edges are collapsed under the primary");
  assert.ok(r.groups.length < r.warnings.length, "grouping reduces the number of banners shown");
});

test("snakes: a coral snake fires the venomous-family DEADLY and the squamate handle-warning", () => {
  // GBIF places snakes at class=Squamata with an EMPTY order — the reason the
  // original suborder/order rule was dead. This locks the class:Squamata fix.
  const coral = { matched: true, canonicalName: "Micrurus fulvius", rank: "SPECIES",
    lineage: [node("kingdom", "Animalia"), node("phylum", "Chordata"), node("class", "Squamata"),
      node("family", "Elapidae"), node("genus", "Micrurus"), node("species", "Micrurus fulvius")] };
  const ids = matchHazards({ primary: { ...coral, confidence: 0.8 }, candidates: [] }, rules).warnings.map((w) => w.id);
  assert.ok(ids.includes("cat-elapidae"), "venomous-family DEADLY must fire");
  assert.ok(ids.includes("cat-squamata"), "squamate never-handle rule must fire (was dead before class:Squamata fix)");
});

// ---------------------------------------------------------------- RESOLVER MATCH QUALITY (honesty)
test("resolver: a FUZZY match is flagged approximate, not presented as certain", async () => {
  const fetchImpl = fakeFetch({ "species/match": {
    usageKey: 1, canonicalName: "Agaricus bisporus", rank: "SPECIES", matchType: "FUZZY", confidence: 88, kingdom: "Fungi", genus: "Agaricus",
  } });
  const r = await resolveTaxon("Agaricus bisporuss", { fetchImpl });
  assert.equal(r.matched, true);
  assert.equal(r.approximate, true);
  assert.match(r.matchNote, /approximate|tentative/i);
});

test("resolver: an EXACT match is not flagged approximate", async () => {
  const fetchImpl = fakeFetch({ "species/match": {
    usageKey: 1, canonicalName: "Agaricus bisporus", rank: "SPECIES", matchType: "EXACT", confidence: 97, kingdom: "Fungi", genus: "Agaricus",
  } });
  const r = await resolveTaxon("Agaricus bisporus", { fetchImpl });
  assert.equal(r.approximate, false);
  assert.equal(r.matchNote, null);
});

// ---------------------------------------------------------------- LADDER MONOTONICITY (robustness)
test("ladder: a widening model response is clamped to non-increasing confidence", async () => {
  const widening = JSON.stringify({
    observationScaffold: "x", distinguishingQuestion: "y", narrowestConfidentRank: "genus",
    candidates: [{ commonName: "Test", scientificName: "Testus specus",
      rankConfidence: { kingdom: .5, phylum: .9, class: .7, order: .95, family: .6, genus: .99, species: .4 },
      distinguishingFeatures: "z" }],
  });
  const resolveOne = async (name) => ({ matched: true, canonicalName: name, rank: "SPECIES",
    lineage: [node("kingdom", "Animalia"), node("phylum", "Chordata"), node("class", "Mammalia"),
      node("order", "Carnivora"), node("family", "Felidae"), node("genus", "Testus"), node("species", "Testus specus")] });
  const out = await identify({ callVision: async () => widening, rules, resolveOne });
  assert.equal(out.ok, true);
  const cs = out.ladder.map((s) => s.confidence);
  for (let i = 1; i < cs.length; i++) assert.ok(cs[i] <= cs[i - 1] + 1e-9, `rung ${i} widened: ${cs[i - 1]} -> ${cs[i]}`);
});

// ---------------------------------------------------------------- IMAGE PRIVACY (EXIF/GPS scrub)
const seg = (marker, payload) => { const len = payload.length + 2; return [0xFF, marker, (len >> 8) & 0xFF, len & 0xFF, ...payload]; };
const ascii = (s) => [...s].map((c) => c.charCodeAt(0));
const sampleJpeg = () => new Uint8Array([
  0xFF, 0xD8,
  ...seg(0xE0, ascii("JFIF\0\x01\x01\0\0\x01\0\x01\0\0")),        // APP0 (keep)
  ...seg(0xE1, ascii("Exif\0\0II*\0 GPS 44.9012,-68.6704 iPhone")), // APP1 EXIF w/ GPS + device (drop)
  ...seg(0xFE, ascii("shot at Room 214")),                          // COM (drop)
  0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00,       // SOS
  0x12, 0x34, 0xFF, 0x00, 0x56, 0x78,                               // entropy (pixels)
  0xFF, 0xD9,                                                       // EOI
]);

test("privacy: EXIF/GPS and comments are stripped; JFIF, orientation-safe frame, and pixels survive", () => {
  const j = sampleJpeg();
  assert.equal(containsExif(j), true, "sample should start with EXIF present");
  const { data, jpeg, removed } = stripJpegMetadata(j);
  assert.equal(jpeg, true);
  assert.deepEqual(removed.map((r) => r.name).sort(), ["APP1", "COM"]);
  assert.equal(containsExif(data), false, "EXIF must be gone");
  const text = String.fromCharCode(...data);
  assert.ok(!/44\.9012/.test(text), "GPS coordinates must not survive");
  assert.ok(!/Room 214/.test(text), "comment location must not survive");
  assert.deepEqual(listMetadataSegments(data).map((s) => s.name), ["APP0"], "only JFIF remains");
  assert.ok(data[0] === 0xFF && data[1] === 0xD8 && data.at(-2) === 0xFF && data.at(-1) === 0xD9, "still a valid JPEG frame");
  assert.ok(text.includes(String.fromCharCode(0x12, 0x34, 0xFF, 0x00, 0x56, 0x78)), "pixel/entropy data preserved (lossless)");
});

test("privacy: a non-JPEG is passed through untouched, not corrupted", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3]);
  assert.equal(looksLikeJpeg(png), false);
  const { data, jpeg } = stripJpegMetadata(png);
  assert.equal(jpeg, false);
  assert.deepEqual([...data], [...png], "bytes unchanged");
});

// ---------------------------------------------------------------- FAIL-SAFE RESOLUTION (safety can't be silenced by a GBIF miss)
test("fail-safe: an UNRESOLVED deadly name still fires DEADLY from the parsed genus", () => {
  const unresolved = { matched: false, canonicalName: "Amanita phalloides" }; // GBIF didn't resolve, but we have the name
  const r = matchHazards({ primary: { ...unresolved, confidence: 0.9 }, candidates: [] }, rules);
  assert.ok(r.warnings.some((w) => w.tier === "DEADLY"), "genus parsed from the name must still trip the Amanita rule");
});

test("fail-safe pipeline: a candidate GBIF can't resolve is flagged unverified but still warned", async () => {
  const vision = JSON.stringify({ observationScaffold: "x", distinguishingQuestion: "y", narrowestConfidentRank: "genus",
    candidates: [{ commonName: "maybe a death cap", scientificName: "Amanita phalloides", rankConfidence: { genus: .5 }, distinguishingFeatures: "z" }] });
  const resolveOne = async () => ({ matched: false, input: "Amanita phalloides", canonicalName: "Amanita phalloides", lineage: [] });
  const out = await identify({ callVision: async () => vision, rules, resolveOne });
  assert.equal(out.identityUnverified, true, "unresolved identity must be flagged for the UI");
  assert.ok(out.warnings.some((w) => w.tier === "DEADLY"), "still warns despite the failed resolution");
});

// ---------------------------------------------------------------- FIREWALL, ADVERSARIAL (negation-aware)
test("FIREWALL: a battery of all-clear phrasings are all stripped", () => {
  const clears = [
    "It is edible.", "This is safe to eat.", "You can safely handle it.", "Completely safe.",
    "It poses no danger.", "It won't hurt you.", "It is non-toxic.", "Good to eat raw.",
    "Widely considered safe.", "Safe for human consumption.", "Not toxic at all.",
  ];
  for (const c of clears) assert.equal(sanitizeReassurance(c).wasRedacted, true, `should strip: "${c}"`);
});

test("FIREWALL: NEGATED safety claims are preserved as warnings, not gutted", () => {
  const cautions = ["This is not safe to eat.", "Never safe to handle.", "This is not edible.", "It isn't safe to touch."];
  for (const c of cautions) {
    const { text, wasRedacted } = sanitizeReassurance(c);
    assert.equal(wasRedacted, false, `must NOT redact a negated caution: "${c}"`);
    assert.ok(!/removed/.test(text), `caution text must survive intact: "${c}" -> "${text}"`);
  }
});

// ---------------------------------------------------------------- ADAPTER (STEM Lab wiring)
test("adapter: identifyFromImage scrubs the image BEFORE vision, passes the schema, and localizes", async () => {
  const seen = {};
  const callGeminiVision = async (blob, prompt, schema) => { seen.blob = blob; seen.schema = schema; return mockCallVision_portobello(); };
  const sanitizeImage = async () => ({ blob: "SCRUBBED-BLOB", method: "mock" });
  const resolveOne = async (name) => ({
    "Agaricus bisporus": fungus("Agaricus", "Agaricus bisporus", "Agaricaceae"),
    "Agaricus campestris": fungus("Agaricus", "Agaricus campestris", "Agaricaceae"),
    "Amanita bisporigera": fungus("Amanita", "Amanita bisporigera", "Amanitaceae"),
  }[name] || { matched: false, input: name, canonicalName: name, lineage: [] });
  const tool = createOrganismTool({ callGeminiVision, callGemini: async () => "{}", rules, sanitizeImage, resolveOne });
  const model = await tool.identifyFromImage("ORIGINAL-FILE-WITH-EXIF", { gradeBand: "6-8" });
  assert.equal(seen.blob, "SCRUBBED-BLOB", "vision must receive the scrubbed blob, never the original file");
  assert.ok(seen.schema && seen.schema.properties, "vision must be called with VISION_SCHEMA (JSON mode)");
  assert.ok(model.warnings.some((w) => w.tier === "DEADLY"), "produces the deadly Amanita warning");
  assert.ok(model.ladder[0].rankLabel, "ladder rank labels are localized");
  assert.ok(model.safetyBanner.length > 0 && model.fieldEthics.rules.length > 0);
});

test("adapter: safety copy uses a reviewed translation when present, else falls back to reviewed English (never a machine guess)", () => {
  const t = (k, f) => (k === "hazard.agaricus-amanita.message" ? "TRADUCCION REVISADA" : f);
  const model = { ok: true, ladder: [{ rank: "genus", name: "Agaricus", confidence: .7 }], layer1: { rules: ["a", "b"] },
    warnings: [{ id: "agaricus-amanita", tier: "DEADLY", message: "ENGLISH REVIEWED", tell: "x" }, { id: "cat-fungi", tier: "DEADLY", message: "NO KEY" }] };
  const L = localize(model, t);
  assert.equal(L.warnings[0].messageLocalized, "TRADUCCION REVISADA", "uses the reviewed translation when the key exists");
  assert.equal(L.warnings[1].messageLocalized, "NO KEY", "falls back to reviewed English when no key — never machine-translates safety copy");
});

// ---------------------------------------------------------------- MULTI-FRAME / VIDEO (#3)
test("multi-frame: mergeCandidates unions species and keeps the max per-rank confidence + richest teaching", () => {
  const f1 = [{ commonName: "portobello", scientificName: "Agaricus bisporus", rankConfidence: { genus: .7, species: .5 }, distinguishingFeatures: "short" }];
  const f2 = [{ commonName: "portobello", scientificName: "Agaricus bisporus", rankConfidence: { genus: .6, species: .8 }, distinguishingFeatures: "a much longer description" },
              { commonName: "death cap?", scientificName: "Amanita phalloides", rankConfidence: { species: .1 }, distinguishingFeatures: "white volva" }];
  const merged = mergeCandidates([f1, f2]);
  const ag = merged.find((c) => c.scientificName === "Agaricus bisporus");
  assert.equal(ag.rankConfidence.species, .8, "max confidence across frames");
  assert.equal(ag.distinguishingFeatures, "a much longer description", "richest teaching text kept");
  assert.ok(merged.some((c) => c.scientificName === "Amanita phalloides"), "unions a species only one frame saw");
  assert.equal(merged[0].scientificName, "Agaricus bisporus", "re-ranked by species confidence");
});

test("multi-frame: a deadly organism seen in only ONE frame still fires DEADLY", async () => {
  const frame = (sci, sp, tell) => JSON.stringify({ observationScaffold: "s", distinguishingQuestion: "q", narrowestConfidentRank: "genus",
    candidates: [{ commonName: "c", scientificName: sci, rankConfidence: { species: sp }, distinguishingFeatures: tell }] });
  const callVisionFrames = async () => [frame("Pleurotus ostreatus", .9, "oyster"), frame("Amanita phalloides", .1, "white volva")];
  const resolveOne = async (n) => ({ "Pleurotus ostreatus": fungus("Pleurotus", "Pleurotus ostreatus", "Pleurotaceae"),
    "Amanita phalloides": fungus("Amanita", "Amanita phalloides", "Amanitaceae") }[n] || { matched: false, canonicalName: n, lineage: [] });
  const out = await identifyMulti({ callVisionFrames, rules, resolveOne });
  assert.ok(out.warnings.some((w) => w.tier === "DEADLY"), "the Amanita from frame 2 must raise a deadly warning");
});

// ---------------------------------------------------------------- CV CLASSIFIER BLEND (#4)
test("CV blend: classifier owns the calibrated score, model owns the teaching, union keeps hazards", () => {
  const vision = [
    { commonName: "portobello", scientificName: "Agaricus bisporus", rankConfidence: { species: .55 }, distinguishingFeatures: "brown gills, no cup" },
    { commonName: "death cap (rule out)", scientificName: "Amanita phalloides", rankConfidence: { species: .06 }, distinguishingFeatures: "white volva" },
  ];
  const cv = { candidates: [{ scientificName: "Agaricus bisporus", score: .82 }] }; // CV ranked only the benign one
  const blended = blendCvWithModel(cv, vision);
  const ag = blended.find((c) => c.scientificName === "Agaricus bisporus");
  assert.equal(ag.rankConfidence.species, .82, "CV calibrated score replaces the model's self-reported number");
  assert.equal(ag.confidenceSource, "cv");
  assert.equal(ag.distinguishingFeatures, "brown gills, no cup", "model's teaching preserved");
  const am = blended.find((c) => c.scientificName === "Amanita phalloides");
  assert.ok(am && am.confidenceSource === "model", "a deadly candidate the CV missed is kept (union, not intersection)");
});

test("CV blend: identifyBlended still fires DEADLY when the classifier omits the death cap", async () => {
  const callVision = async () => JSON.stringify({ observationScaffold: "s", distinguishingQuestion: "q", narrowestConfidentRank: "genus",
    candidates: [{ commonName: "portobello", scientificName: "Agaricus bisporus", rankConfidence: { species: .55 }, distinguishingFeatures: "x" },
                 { commonName: "death cap", scientificName: "Amanita phalloides", rankConfidence: { species: .06 }, distinguishingFeatures: "white volva" }] });
  const classify = async () => ({ candidates: [{ scientificName: "Agaricus bisporus", score: .9 }] });
  const resolveOne = async (n) => ({ "Agaricus bisporus": fungus("Agaricus", "Agaricus bisporus", "Agaricaceae"),
    "Amanita phalloides": fungus("Amanita", "Amanita phalloides", "Amanitaceae") }[n] || { matched: false, canonicalName: n, lineage: [] });
  const out = await identifyBlended({ callVision, classify, rules, resolveOne });
  assert.ok(out.warnings.some((w) => w.tier === "DEADLY"), "union keeps the Amanita → deadly still fires");
  assert.equal(out.candidates[0].confidenceSource, "cv", "top candidate now carries a CV-sourced confidence");
});

// ---------------------------------------------------------------- GEO-PRIVACY / JOURNAL (#5)
test("geo-privacy: coordinates are coarsened to a cell and never stored precisely", () => {
  const precise = { lat: 44.90123, lng: -68.67041 };
  const c = coarsenLocation(precise, { gridDeg: 0.1 });
  assert.equal(c.precise, false);
  assert.ok(Math.abs(c.lat - 44.9) < 1e-9 && Math.abs(c.lng - (-68.7)) < 1e-9, "snapped to the 0.1° grid");
  assert.notEqual(c.lat, precise.lat, "precise latitude never survives");
  assert.ok(c.precisionKm >= 10, "cell is neighbourhood-scale, not a point");
});

test("geo-privacy: a journal entry strips time-of-day and precise location", () => {
  const e = journalEntry({ taxon: { canonicalName: "Amanita phalloides" }, tier: "DEADLY", coord: { lat: 44.90123, lng: -68.67 }, date: "2026-07-11T14:32:07Z" });
  assert.equal(e.date, "2026-07-11", "time of day stripped");
  assert.equal(e.hasPreciseLocation, false);
  assert.ok(e.location && e.location.precise === false);
  assert.equal(journalEntry({ taxon: { scientificName: "Danaus plexippus" } }).location, null, "no coord ⇒ no location");
});

// ---------------------------------------------------------------- TAXONOMY EXPLORER DATA (#1 drift guard)
test("explorer data: every hazard-tiered taxon in the map is grounded in a real rule trigger", () => {
  const triggerNames = new Set([
    ...rules.categoryRules.map((r) => r.match.name),
    ...rules.confusions.flatMap((c) => (c.triggerTaxa || []).map((t) => t.name)),
    ...rules.directHazards.flatMap((h) => (h.taxa || []).map((t) => t.name)),
  ].map((s) => s.toLowerCase()));
  const orphans = [];
  (function walk(node, ancestors) {
    const chain = [...ancestors, String(node.n).toLowerCase()];
    if (["DEADLY", "CONTACT", "MILD"].includes(node.tier) && !chain.some((n) => triggerNames.has(n))) orphans.push(node.n);
    (node.kids || []).forEach((k) => walk(k, chain));
  })(TREE, []);
  assert.deepEqual(orphans, [], `map shows hazards with no backing rule (drift): ${orphans.join(", ")}`);
});

test("explorer data: marquee deadly taxa present + lookalike edges well-formed", () => {
  const names = new Set();
  (function walk(n) { names.add(n.n); (n.kids || []).forEach(walk); })(TREE);
  for (const must of ["Amanita", "Cicuta", "Nerium", "Micrurus", "Conus", "Digitalis"]) assert.ok(names.has(must), `map missing ${must}`);
  for (const e of EDGES) assert.equal(e.length, 4, "each lookalike edge is [tier, benign, danger, tell]");
});

// ---------------------------------------------------------------- GUIDED OBSERVATION (pedagogy)
test("guided observation: confusion tells become compare-steps tied to candidates; the category blanket is not a step", () => {
  const model = {
    distinguishingQuestion: "What color is the spore print?",
    warnings: [
      { source: "confusion", tier: "DEADLY", tell: "Spore print: Agaricus brown vs Amanita white; a deadly Amanita has a volva.", benign: { common: "portobello" }, danger: { common: "death cap" }, consequence: "amatoxin liver failure" },
      { source: "category", tier: "DEADLY", message: "no wild mushroom is safe from a photo" },
      { source: "direct", tier: "CONTACT", tell: "Milky toxin behind the eyes.", common: "cane toad" },
    ],
    candidates: [{ commonName: "portobello", scientificName: "Agaricus bisporus", distinguishingFeatures: "brown gills, no cup" }],
  };
  const g = buildGuidedObservation(model);
  assert.equal(g.leadQuestion, "What color is the spore print?");
  assert.equal(g.steps.length, 2, "confusion + direct become steps; the category blanket is not one");
  const compare = g.steps.find((s) => s.kind === "compare");
  assert.match(compare.look, /spore print/i);
  assert.equal(compare.distinguishes, "portobello vs death cap");
  assert.match(compare.ifWrong, /amatoxin/);
  assert.ok(g.candidateFeatures[0].features.includes("brown gills"));
  assert.ok(g.hasHazardSteps);
  assert.match(g.stop, /No observation.*safe/i, "the hard stop never clears anything");
});

test("guided observation: a benign result yields no hazard steps but still ends with the hard stop", () => {
  const g = buildGuidedObservation({ distinguishingQuestion: "extra hindwing line?",
    warnings: [{ source: "confusion", tier: "INFO", tell: "the viceroy has an extra hindwing line", benign: { common: "monarch" }, danger: null }], candidates: [] });
  assert.equal(g.hasHazardSteps, false);
  assert.equal(g.steps[0].distinguishes, "monarch and its lookalike");
  assert.ok(g.stop.length > 0);
});

// ---------------------------------------------------------------- OFFLINE SAFETY BACKBONE
const backboneFixture = {
  genera: { amanita: { lineage: [node("kingdom", "Fungi"), node("phylum", "Basidiomycota"), node("class", "Agaricomycetes"), node("order", "Agaricales"), node("family", "Amanitaceae"), node("genus", "Amanita")] } },
  species: { "amanita phalloides": { canonicalName: "Amanita phalloides", rank: "SPECIES", key: 5240325, lineage: [node("kingdom", "Fungi"), node("genus", "Amanita"), node("species", "Amanita phalloides")] } },
};

test("offline backbone: exact species and genus fallback both resolve from bundled data", () => {
  const s = resolveFromBackbone("Amanita phalloides", backboneFixture);
  assert.equal(s.matched, true);
  assert.equal(s.source, "local-backbone");
  assert.ok(s.gbif.url.includes("5240325"));
  const g = resolveFromBackbone("Amanita muscaria", backboneFixture); // unknown species, known genus
  assert.equal(g.matched, true);
  assert.ok(g.lineage.some((n) => n.rank === "genus" && n.name === "Amanita"));
  assert.ok(g.lineage.some((n) => n.rank === "species" && n.name === "Amanita muscaria"));
  assert.equal(resolveFromBackbone("Nothing here at all", backboneFixture), null);
});

test("offline safety: GBIF unreachable → hazard taxon still resolves AND the category net fires", async () => {
  const deadFetch = async () => { throw new Error("ENOTFOUND api.gbif.org"); };
  const r = await resolveTaxon("Amanita phalloides", { fetchImpl: deadFetch, localBackbone: backboneFixture });
  assert.equal(r.matched, true, "resolves offline from the backbone");
  assert.equal(r.source, "local-backbone");
  const haz = matchHazards({ primary: { ...r, confidence: .5 }, candidates: [] }, rules);
  assert.ok(haz.warnings.some((w) => w.id === "cat-fungi"),
    "the Fungi category net fires OFFLINE — needs the backbone lineage, not just a parsed genus");
});

test("offline safety: with no backbone, GBIF-down resolves unverified (matcher's name-parse fail-safe still applies)", async () => {
  const r = await resolveTaxon("Amanita phalloides", { fetchImpl: async () => { throw new Error("ENOTFOUND"); } });
  assert.equal(r.matched, false);
});

test("offline backbone data: the generated file covers marquee hazard genera with a kingdom in lineage", async () => {
  const b = JSON.parse(await readFile(new URL("./local-backbone.json", import.meta.url)));
  for (const g of ["amanita", "cicuta", "nerium", "micrurus", "conus", "takifugu"]) {
    assert.ok(b.genera[g], `backbone missing ${g}`);
    assert.ok(b.genera[g].lineage.some((n) => n.rank === "kingdom"), `${g} lineage has no kingdom`);
  }
});

test("guided observation: end to end from a real portobello identification", async () => {
  const resolveOne = async (name) => ({
    "Agaricus bisporus": fungus("Agaricus", "Agaricus bisporus", "Agaricaceae"),
    "Agaricus campestris": fungus("Agaricus", "Agaricus campestris", "Agaricaceae"),
    "Amanita bisporigera": fungus("Amanita", "Amanita bisporigera", "Amanitaceae"),
  }[name] || { matched: false, canonicalName: name, lineage: [] });
  const model = await identify({ callVision: async () => mockCallVision_portobello(), rules, resolveOne });
  const g = buildGuidedObservation(model);
  assert.ok(g.hasHazardSteps, "the Amanita confusion should produce a hazard observation step");
  assert.ok(g.leadQuestion && /spore print/i.test(g.leadQuestion));
});
