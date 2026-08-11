/**
 * pipeline.mjs
 * -------------------------------------------------------------------------
 * The whole loop, wired together:
 *
 *   photo → callVision (Gemini) → resolve each candidate (GBIF + Wikipedia)
 *         → matchHazards (stakes-not-confidence) → assemble a render model
 *
 * The platform binds `callVision` to callGeminiVision(image, prompt, schema).
 * Here a mock is provided so the full pipeline runs end-to-end offline for the
 * vision step; the resolve step calls GBIF/Wikipedia live (falls back to the
 * model's own name if the network is unavailable).
 * -------------------------------------------------------------------------
 */
import { readFile } from "node:fs/promises";
import { resolveTaxon, getReferences, RANK_ORDER } from "./taxon-resolver.mjs";
import { matchHazards, outputGuards } from "./hazard-matcher.mjs";
import { buildVisionPrompt, parseVisionResponse } from "./vision-prompt.mjs";

/**
 * @param {object}   input
 * @param {Function} input.callVision  async (prompt) => raw JSON text from Gemini
 * @param {object}   input.rules       parsed hazard-rules.json
 * @param {object}   [input.ctx]       grade band / locale / habitat hint
 * @param {Function} [input.resolveOne] async (sciName) => resolved taxon (for tests)
 *
 * INGEST PRECONDITION: the photo must already be scrubbed of EXIF/GPS via
 * image-privacy.sanitizeForUpload() before `callVision` is bound. Location
 * metadata must never reach the vision request.
 */
export async function identify({ callVision, rules, ctx = {}, resolveOne, localBackbone }) {
  const parsed = parseVisionResponse(await callVision(buildVisionPrompt(ctx)));
  if (!parsed.ok) return { ok: false, stage: "vision", error: parsed.error };
  return finishFromVision(parsed.value, { rules, resolveOne, localBackbone });
}

/**
 * Multi-frame / video path (#3). `callVisionFrames(prompt)` returns an array of
 * raw JSON responses (one per sampled frame). Candidates are merged across
 * frames — a species seen confidently in ANY frame counts — then run through
 * the same resolve → hazard core. More frames = more chances to catch a hazard.
 */
export async function identifyMulti({ callVisionFrames, rules, ctx = {}, resolveOne, localBackbone }) {
  const raws = await callVisionFrames(buildVisionPrompt(ctx));
  const visions = (raws || []).map(parseVisionResponse).filter((p) => p.ok).map((p) => p.value);
  if (!visions.length) return { ok: false, stage: "vision", error: "no frame produced a usable response" };
  const merged = {
    ...visions[0], // scaffold/question from the first usable frame
    candidates: mergeCandidates(visions.map((v) => v.candidates)),
  };
  return finishFromVision(merged, { rules, resolveOne, localBackbone });
}

/** Shared core: resolve each candidate, run hazards, assemble the render model. */
export async function finishFromVision(vision, { rules, resolveOne, localBackbone }) {
  const resolveFn = resolveOne || (async (name) => {
    const r = await resolveTaxon(name, { localBackbone });
    r.references = await getReferences(r);
    return r;
  });
  const resolved = [];
  for (const cand of vision.candidates) {
    resolved.push({ ...(await resolveFn(cand.scientificName)), model: cand });
  }
  const [primary, ...candidates] = resolved;
  const hazards = matchHazards({ primary, candidates }, rules);

  return {
    ok: true,
    scaffold: vision.observationScaffold,
    distinguishingQuestion: vision.distinguishingQuestion,
    narrowestConfidentRank: vision.narrowestConfidentRank,
    // If ANY candidate failed to resolve against GBIF, the identity is unverified —
    // the UI must show a "couldn't verify, treat with extra caution" state and never
    // present a confident benign result. Hazards still fire (see matcher fail-safe).
    identityUnverified: resolved.some((r) => !r.matched),
    ladder: buildLadder(primary),
    candidates: resolved.map((r) => ({
      commonName: r.model.commonName,
      scientificName: r.canonicalName || r.model.scientificName,
      matched: !!r.matched,
      verifiedRefs: r.references || null,
      distinguishingFeatures: r.model.distinguishingFeatures,
      confidenceSource: r.model.confidenceSource || "model", // "cv" once a classifier blends in (#4)
    })),
    layer1: hazards.alwaysOn,
    warnings: hazards.warnings,
    groups: hazards.groups,
    guards: outputGuards(hazards),
    reviewPending: hazards.reviewPending,
  };
}

/**
 * Merge candidate lists across frames (or across a CV classifier + the model).
 * Union by scientific name; take the per-rank MAX confidence (a confident sighting
 * in any frame wins); keep the richest distinguishing text. Re-ranked by species
 * confidence. Pure + synchronous.
 */
export function mergeCandidates(lists) {
  const norm = (s) => String(s || "").trim().toLowerCase();
  const byKey = new Map();
  for (const list of lists || []) for (const c of list || []) {
    const k = norm(c.scientificName);
    if (!k) continue;
    if (!byKey.has(k)) { byKey.set(k, { ...c, rankConfidence: { ...(c.rankConfidence || {}) }, frames: 1 }); continue; }
    const m = byKey.get(k);
    m.frames++;
    const rc = c.rankConfidence || {};
    for (const r of Object.keys(rc)) m.rankConfidence[r] = Math.max(m.rankConfidence[r] ?? 0, rc[r] ?? 0);
    if ((c.distinguishingFeatures || "").length > (m.distinguishingFeatures || "").length) m.distinguishingFeatures = c.distinguishingFeatures;
    if (!m.commonName && c.commonName) m.commonName = c.commonName;
  }
  const score = (c) => c.rankConfidence?.species ?? c.rankConfidence?.genus ?? 0;
  return [...byKey.values()].sort((a, b) => score(b) - score(a));
}

/** Merge the GBIF lineage (authoritative names) with the model's per-rank confidence. */
function buildLadder(primary) {
  const conf = primary?.model?.rankConfidence || {};
  const byRank = Object.fromEntries((primary?.lineage || []).map((n) => [n.rank, n.name]));
  let cap = 1; // certainty can only narrow descending the ladder; clamp any model output that widens
  return RANK_ORDER.filter((r) => byRank[r]).map((r) => {
    let c = typeof conf[r] === "number" ? conf[r] : null;
    if (c != null) { c = Math.min(Math.max(c, 0), cap); cap = c; }
    return { rank: r, name: byRank[r], confidence: c };
  });
}

// --------------------------------------------------------------- mock model
/** A canned Gemini response: a photo the model reads as most likely a portobello. */
export function mockCallVision_portobello() {
  return JSON.stringify({
    observationScaffold: "Before the answer: what color are the gills underneath, and is there a ring on the stem or a cup at the very base?",
    candidates: [
      { commonName: "Portobello / button mushroom", scientificName: "Agaricus bisporus",
        rankConfidence: { kingdom: 0.99, phylum: 0.97, class: 0.95, order: 0.9, family: 0.8, genus: 0.7, species: 0.55 },
        distinguishingFeatures: "Brown cap, pink-to-brown gills, a ring on the stem, no cup at the base.",
        whyNotOthers: "A deadly Amanita would show a white cup (volva) at the base and white gills." },
      { commonName: "Meadow mushroom", scientificName: "Agaricus campestris",
        rankConfidence: { kingdom: 0.99, phylum: 0.97, class: 0.95, order: 0.9, family: 0.8, genus: 0.65, species: 0.25 },
        distinguishingFeatures: "Very similar; grows in grass." },
      { commonName: "Destroying angel (must rule out)", scientificName: "Amanita bisporigera",
        rankConfidence: { kingdom: 0.99, phylum: 0.97, class: 0.95, order: 0.9, family: 0.2, genus: 0.12, species: 0.06 },
        distinguishingFeatures: "All white with a sac-like cup at the base — deadly. Included so it is explicitly considered." },
    ],
    narrowestConfidentRank: "genus",
    distinguishingQuestion: "What color is the spore print — chocolate-brown, or white?",
    notes: "Species-level ID is not reliable from this photo.",
  });
}

// --------------------------------------------------------------- runnable
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, "/"))) {
  const rules = JSON.parse(await readFile(new URL("./hazard-rules.json", import.meta.url)));
  const out = await identify({ callVision: async () => mockCallVision_portobello(), rules, ctx: { gradeBand: "6-8" } });

  console.log("\n=== FULL PIPELINE (mock Gemini vision + live GBIF/Wikipedia) ===\n");
  console.log("Observe first:", out.scaffold);
  console.log("\nNarrowing ladder (GBIF names × model confidence):");
  for (const step of out.ladder) {
    const bar = step.confidence == null ? "" : " " + "█".repeat(Math.round(step.confidence * 10)).padEnd(10, "·") + ` ${Math.round(step.confidence * 100)}%`;
    const edge = step.rank === out.narrowestConfidentRank ? "  ← confident to here; finer is a guess" : "";
    console.log(`   ${step.rank.padEnd(7)} ${step.name}${bar}${edge}`);
  }
  console.log("\nCandidates (with verified links):");
  for (const c of out.candidates) {
    const url = c.verifiedRefs?.wikipedia?.url || c.verifiedRefs?.gbif?.url || "(unverified)";
    console.log(`   • ${c.commonName} — ${c.scientificName} ${c.matched ? "✓" : "⚠ unverified"} → ${url}`);
  }
  console.log(`\nDistinguishing question: ${out.distinguishingQuestion}`);
  console.log(`\nSafety: ${out.warnings.length} warning(s); blockingInterstitial=${out.guards.requiresBlockingInterstitial}; reviewPending=${out.reviewPending}`);
  for (const w of out.warnings.filter((x) => x.tier === "DEADLY")) console.log(`   🟥 ${w.message}`);
  console.log();
}
