/**
 * guided-key.mjs
 * -------------------------------------------------------------------------
 * The tool's pedagogical promise made concrete: coach observation, don't just
 * answer. Given a finished render model, this builds a "look before you decide"
 * guide from the material already in it — the model's distinguishing question,
 * the confusion warnings' tells (which describe exactly the feature that
 * separates a safe organism from its deadly twin), and each candidate's
 * distinguishing features.
 *
 * It is a pure re-framing of existing text: it turns a verdict into a sequence
 * of observations tied to what each outcome would mean. It can only ever tell a
 * student what to LOOK AT — never that anything is safe. The mandatory hard stop
 * is not optional and not derived from the model.
 * -------------------------------------------------------------------------
 */

const HARD_STOP =
  "No observation here can make a wild organism safe to eat or handle. Use this to sharpen your eye — then confirm any high-stakes identification with a human expert.";

/**
 * @param {object} model  a render model from the pipeline / adapter
 * @returns {{ intro, leadQuestion, steps, candidateFeatures, stop, hasHazardSteps }}
 */
export function buildGuidedObservation(model) {
  const warnings = model?.warnings || [];
  const steps = [];

  for (const w of warnings) {
    if (w.source === "confusion" && w.tell) {
      // a "compare" step: this feature separates the safe candidate from the deadly one
      steps.push({
        kind: "compare",
        tier: w.tier,
        look: w.tell,
        distinguishes: w.danger?.common
          ? `${w.benign?.common || "the safe one"} vs ${w.danger.common}`
          : (w.benign?.common ? `${w.benign.common} and its lookalike` : "the candidates"),
        ifWrong: w.consequence || null,
      });
    } else if (w.source === "direct" && w.tell) {
      // a "confirm" step: if this IS the dangerous organism, here's what you'd see
      steps.push({ kind: "confirm", tier: w.tier, look: w.tell, distinguishes: w.common || null, ifWrong: null });
    }
  }

  return {
    intro: "Observe before you decide — the tool gives you candidates to weigh, not a verdict to accept.",
    leadQuestion: model?.distinguishingQuestion || null,
    steps,
    candidateFeatures: (model?.candidates || [])
      .map((c) => ({ name: c.commonName, sci: c.scientificName, features: c.distinguishingFeatures }))
      .filter((c) => c.features),
    stop: HARD_STOP,
    hasHazardSteps: steps.some((s) => s.tier === "DEADLY" || s.tier === "CONTACT"),
  };
}
