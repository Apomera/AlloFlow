/**
 * cv-classifier.mjs  (phase 2)
 * -------------------------------------------------------------------------
 * Back the confidence numbers with a purpose-built computer-vision classifier
 * (iNaturalist's CV model or Pl@ntNet), instead of the vision model's
 * un-calibrated self-reported percentages.
 *
 * Division of labor — each system does what it is actually good at:
 *   • the CV classifier owns the NUMBERS  — real calibrated top-k scores from a
 *     model trained on 100M+ verified observations.
 *   • Gemini owns the TEACHING            — the distinguishing features, the
 *     "look for the spore print" coaching, the observation scaffold.
 *
 * The classifier is INJECTED (`classify()` returns { candidates:[{scientificName,
 * commonName?, score}] }), so real iNat/Pl@ntNet API calls are the integrator's
 * to bind. See INTEGRATION.md.
 *
 * SAFETY INVARIANT: the blend is a UNION, never an intersection. A candidate the
 * VISION model proposed — e.g. a deadly lookalike to rule out — is kept even if
 * the CV classifier didn't rank it. The classifier may make us more precise; it
 * must never make us drop a hazard.
 * -------------------------------------------------------------------------
 */
import { finishFromVision } from "./pipeline.mjs";
import { buildVisionPrompt, parseVisionResponse } from "./vision-prompt.mjs";

const norm = (s) => String(s || "").trim().toLowerCase();
const score = (c) => c.rankConfidence?.species ?? c.rankConfidence?.genus ?? 0;

/**
 * Merge a CV classifier's calibrated candidates with the vision model's.
 * @returns candidate objects in the vision-candidate shape (feeds the pipeline).
 */
export function blendCvWithModel(cvResult, visionCandidates = []) {
  const model = new Map(visionCandidates.map((c) => [norm(c.scientificName), c]));
  const used = new Set();
  const out = [];

  for (const cv of cvResult?.candidates || []) {
    const k = norm(cv.scientificName);
    const m = model.get(k);
    if (m) used.add(k);
    out.push({
      commonName: cv.commonName || m?.commonName,
      scientificName: cv.scientificName,
      // the CV score is a calibrated probability → it becomes the species confidence
      rankConfidence: { ...(m?.rankConfidence || {}), species: cv.score },
      distinguishingFeatures: m?.distinguishingFeatures, // teaching stays with the model
      confidenceSource: "cv",
    });
  }
  // Keep every vision-proposed candidate the CV missed — a deadly lookalike the
  // classifier didn't surface must still reach the hazard matcher.
  for (const [k, m] of model) if (!used.has(k)) out.push({ ...m, confidenceSource: "model" });

  return out.sort((a, b) => score(b) - score(a));
}

/**
 * Full blended identification: Gemini vision (teaching + candidates) + a CV
 * classifier (calibrated scores) → the same resolve → hazard core.
 * `classify()` is already bound to the image by the caller.
 */
export async function identifyBlended({ callVision, classify, rules, ctx = {}, resolveOne, localBackbone }) {
  const parsed = parseVisionResponse(await callVision(buildVisionPrompt(ctx)));
  if (!parsed.ok) return { ok: false, stage: "vision", error: parsed.error };
  let cv = { candidates: [] };
  try { cv = (await classify()) || cv; } catch { /* classifier down ⇒ fall back to model-only, never fail the ID */ }
  const candidates = blendCvWithModel(cv, parsed.value.candidates);
  return finishFromVision({ ...parsed.value, candidates }, { rules, resolveOne, localBackbone });
}
