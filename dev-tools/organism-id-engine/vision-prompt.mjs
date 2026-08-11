/**
 * vision-prompt.mjs
 * -------------------------------------------------------------------------
 * The CONTRACT between the platform's Gemini vision call and the rest of the
 * pipeline. This module owns the prompt and the JSON shape; it does not call
 * Gemini itself (the platform's callGeminiVision does that).
 *
 * Design decisions baked in:
 *  - JSON mode ON, no Google-Search grounding (the two are incompatible on
 *    this platform, and links are resolved deterministically downstream, so
 *    grounding isn't needed here).
 *  - The model NEVER states edibility, toxicity, or safety. Those come only
 *    from the vetted hazard layer. The prompt forbids it explicitly.
 *  - Confidence is QUALITATIVE and per-rank, to drive the narrowing ladder —
 *    never a single false-precision species percentage.
 *  - Observation-first: the model returns a "look before you're told" scaffold
 *    and a distinguishing question, so the tool coaches observation instead of
 *    being an answer machine.
 * -------------------------------------------------------------------------
 */

export const VISION_SCHEMA = {
  type: "object",
  required: ["observationScaffold", "candidates", "narrowestConfidentRank", "distinguishingQuestion"],
  properties: {
    observationScaffold: {
      type: "string",
      description: "One question inviting the student to observe key features BEFORE seeing the ID (e.g. 'Count the legs and note where the wings attach.').",
    },
    candidates: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: {
        type: "object",
        required: ["commonName", "scientificName", "rankConfidence", "distinguishingFeatures"],
        properties: {
          commonName: { type: "string" },
          scientificName: { type: "string", description: "Binomial (or genus) for authoritative resolution downstream. Leave genus-only if unsure of species." },
          rankConfidence: {
            type: "object",
            description: "Qualitative 0..1 confidence at each rank. Should be non-increasing down the ladder.",
            properties: {
              kingdom: { type: "number" }, phylum: { type: "number" }, class: { type: "number" },
              order: { type: "number" }, family: { type: "number" }, genus: { type: "number" }, species: { type: "number" },
            },
          },
          distinguishingFeatures: { type: "string", description: "The visible features that place it here — the teaching content." },
          whyNotOthers: { type: "string", description: "Optional: how to tell this from the next candidate." },
        },
      },
    },
    narrowestConfidentRank: {
      type: "string",
      enum: ["kingdom", "phylum", "class", "order", "family", "genus", "species"],
      description: "The finest rank the model is genuinely confident about. Below this it is guessing — the UI should show the ladder narrowing here.",
    },
    distinguishingQuestion: {
      type: "string",
      description: "What single observation would most narrow the ID (e.g. 'What color is the spore print?').",
    },
    notes: { type: "string" },
  },
};

const FORBIDDEN = [
  "Do NOT state whether anything is edible, poisonous, safe to touch, or safe to handle.",
  "Do NOT recommend eating, tasting, foraging, or handling.",
  "Do NOT invent URLs, citations, or taxonomic authorities — downstream code resolves those.",
];

/**
 * Build the text prompt for callGeminiVision.
 * @param {object} ctx  { gradeBand?: 'K-2'|'3-5'|'6-8'|'9-12', locale?: string, habitatHint?: string }
 */
export function buildVisionPrompt(ctx = {}) {
  const grade = ctx.gradeBand || "3-5";
  const locale = ctx.locale || "en";
  const habitat = ctx.habitatHint ? `\nObserved context (use with caution, may be wrong): ${ctx.habitatHint}.` : "";
  return [
    `You are a careful field biologist helping a ${grade} student classify an organism from a photo.`,
    `Return ranked identification CANDIDATES with per-rank qualitative confidence, so the tool can show how certainty narrows down the taxonomic ladder.`,
    `Give the scientific name (binomial, or genus-only if you are not sure of the species) so downstream code can verify it against a taxonomy database.`,
    `Confidence at each rank must be non-increasing as ranks get finer, and honest: if you cannot get below family, say so via narrowestConfidentRank.`,
    `Frame everything to build observation skill — features first, answers second.`,
    `Write student-facing text in locale "${locale}" at a ${grade} reading level.`,
    "",
    "HARD RULES:",
    ...FORBIDDEN.map((r) => "- " + r),
    "",
    "Respond with ONLY a JSON object matching the provided schema. No prose outside the JSON.",
  ].join("\n");
}

/** Defensive parse of the model's JSON text. Returns {ok, value|error}. */
export function parseVisionResponse(text) {
  try {
    // tolerate a ```json fence if the model adds one despite instructions
    const cleaned = String(text).replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const value = JSON.parse(cleaned);
    if (!value || !Array.isArray(value.candidates) || !value.candidates.length) {
      return { ok: false, error: "no candidates in response" };
    }
    return { ok: true, value };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}
