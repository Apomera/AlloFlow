/**
 * allo-adapter.mjs
 * -------------------------------------------------------------------------
 * The drop-in adapter that binds this standalone prototype to the AlloFlow
 * STEM Lab. Everything platform-specific is INJECTED, so this file makes no
 * assumptions about exact signatures — the integrator supplies the real
 * functions (see INTEGRATION.md for the binding points).
 *
 * It wires, in order:
 *   1. EXIF/GPS scrub on ingest  (image-privacy) — BEFORE anything sees the image
 *   2. the vision call            (callGeminiVision, JSON mode + VISION_SCHEMA)
 *   3. the pipeline               (resolve → hazards → render model)
 *   4. localization               (UI chrome via t(); safety copy stays as the
 *                                  expert-reviewed English unless a reviewed
 *                                  translation key exists — see note below)
 *   5. optional grounded enrichment (a SEPARATE, on-demand call)
 *
 * ⚠ SAFETY-COPY i18n POLICY: deadly/contact hazard messages are life-safety
 * text signed off by an expert (REVIEW.md). They must NOT be machine-translated
 * on the fly. localize() looks up `hazard.<id>.message` via t() and FALLS BACK
 * to the reviewed English if no key exists — so an unreviewed locale shows
 * English (safe) rather than an unverified machine translation (dangerous).
 * A translated safety string is only correct once a native-speaking expert has
 * signed it off, exactly like the English.
 * -------------------------------------------------------------------------
 */
import { identify, identifyMulti } from "./pipeline.mjs";
import { identifyBlended } from "./cv-classifier.mjs";
import { enrich } from "./enrich.mjs";
import { buildGuidedObservation } from "./guided-key.mjs";
import { VISION_SCHEMA } from "./vision-prompt.mjs";
import { sanitizeForUpload } from "./image-privacy.mjs";

const RANK_LABEL = { kingdom: "Kingdom", phylum: "Phylum", class: "Class", order: "Order", family: "Family", genus: "Genus", species: "Species" };

/**
 * @param {object} deps
 * @param {Function} deps.callGeminiVision  async (imageBlob, prompt, schema) => JSON text
 * @param {Function} deps.callGemini        async (prompt, opts) => text  (opts.grounding=true, jsonMode=false for enrichment)
 * @param {object}   deps.rules             parsed hazard-rules.json
 * @param {Function} [deps.t]               i18n: (key, fallback) => string
 * @param {Function} [deps.sanitizeImage]   (file) => {blob}; defaults to EXIF scrub via canvas
 * @param {Function} [deps.resolveOne]      test/offline hook passed through to the pipeline
 */
export function createOrganismTool({ callGeminiVision, callGemini, classifyImage, rules, t = (k, f) => f, sanitizeImage = sanitizeForUpload, resolveOne, localBackbone }) {
  if (typeof callGeminiVision !== "function") throw new Error("createOrganismTool: callGeminiVision binding is required");

  async function identifyFromImage(file, ctx = {}) {
    const { blob } = await sanitizeImage(file);                       // 1. scrub EXIF/GPS FIRST
    const callVision = (prompt) => callGeminiVision(blob, prompt, VISION_SCHEMA); // 2. JSON-mode vision
    // 3. pipeline — blend a CV classifier's calibrated scores if one is bound (#4)
    const model = classifyImage
      ? await identifyBlended({ callVision, classify: () => classifyImage(blob), rules, ctx, resolveOne, localBackbone })
      : await identify({ callVision, rules, ctx, resolveOne, localBackbone });
    return localize(model, t);                                        // 4. localize chrome
  }

  // Multi-frame / video (#3): scrub every frame, run vision per frame, merge candidates.
  async function identifyFromFrames(files, ctx = {}) {
    const blobs = await Promise.all([...files].map(async (f) => (await sanitizeImage(f)).blob));
    const callVisionFrames = (prompt) => Promise.all(blobs.map((b) => callGeminiVision(b, prompt, VISION_SCHEMA)));
    return localize(await identifyMulti({ callVisionFrames, rules, ctx, resolveOne, localBackbone }), t);
  }

  async function enrichResult(model, taxon, ctx = {}) {              // 5. opt-in grounded call
    if (typeof callGemini !== "function") throw new Error("enrichResult: callGemini binding is required");
    const callGrounded = (prompt) => callGemini(prompt, { grounding: true, jsonMode: false });
    return enrich(model, { callGrounded, taxon, ctx, tiers: rules.tiers });
  }

  // Build the "observe before you decide" guide from any render model (UI-layer helper).
  const guideFor = (model) => buildGuidedObservation(model);

  return { identifyFromImage, identifyFromFrames, enrichResult, guideFor };
}

/** Localize UI chrome via t(); keep expert-reviewed safety copy (English fallback). */
export function localize(model, t = (k, f) => f) {
  if (!model?.ok) return model;
  return {
    ...model,
    // scaffold + distinguishingQuestion are already produced by the model in the
    // requested locale (the vision prompt carries locale), so they pass through.
    ladder: (model.ladder || []).map((s) => ({ ...s, rankLabel: t(`rank.${s.rank}`, RANK_LABEL[s.rank] || s.rank) })),
    warnings: (model.warnings || []).map((w) => ({
      ...w,
      // reviewed translation if present; otherwise the reviewed English (never a guess)
      messageLocalized: t(`hazard.${w.id}.message`, w.message),
      tellLocalized: w.tell ? t(`hazard.${w.id}.tell`, w.tell) : undefined,
    })),
    fieldEthics: {
      title: t("fieldEthics.title", "Field rules — every observation"),
      rules: (model.layer1?.rules || []).map((r, i) => t(`fieldEthics.rule.${i}`, r)),
    },
    safetyBanner: t("safety.neverEatHandle", "Never eat, taste, or handle a wild organism based on this app. When in doubt, ask a human expert."),
  };
}
