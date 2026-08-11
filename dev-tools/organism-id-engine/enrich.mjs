/**
 * enrich.mjs
 * -------------------------------------------------------------------------
 * The ONLY place Google Search grounding is used — and it is deliberately
 * walled off from the core.
 *
 * WHY A SEPARATE CALL: on this platform google_search grounding is
 * incompatible with JSON/response-schema mode. The core ID runs in JSON mode
 * (reliable, structured), so grounding cannot ride along. Enrichment is
 * therefore a SECOND, on-demand call: JSON mode OFF, parse the text (the same
 * pattern the Timeline tool uses). It is fired only when a student taps
 * "Is this local? / Tell me more" — never automatically per observation
 * (grounded calls are slower and cost more).
 *
 * WHAT IT'S FOR: the jurisdictional / time-sensitive context that has no clean
 * API — invasive & reportable status in *this* state, current local advisories.
 * (Range/season → GBIF/iNat occurrence; conservation → IUCN. Those are better
 * as structured APIs; grounding is the fallback for the long local tail.)
 *
 * THE FIREWALL (the important part): web-sourced context may only make the
 * tool MORE cautious, never less.
 *   1. It can never remove, downgrade, or gate a deterministic hazard warning.
 *   2. It can never emit an all-clear. A web "this is harmless / safe to eat"
 *      is a false-negative machine; such phrasing is stripped, never shown.
 *   3. Web advisories are capped at CONTACT — the DEADLY tier belongs only to
 *      the vetted, expert-reviewed deterministic layer.
 *   4. Everything is provenance-tagged "web — verify", visually distinct from
 *      the authoritative GBIF/Wikipedia facts.
 * -------------------------------------------------------------------------
 */

/** Phrases that assert safety. A web/model source is NEVER allowed to clear an organism. */
const REASSURANCE = [
  /\b(safe|ok|fine|okay|good)\s+to\s+(eat|taste|touch|handle|forage|consume|pick|be around)\b/i,
  /\byou\s+can\s+(safely\s+)?(eat|taste|touch|handle|pick|forage)\b/i,
  /\b(edible|non-?toxic|non-?poisonous|harmless|innocuous)\b/i,
  /\bnot\s+(toxic|poisonous|dangerous|harmful|deadly)\b/i,
  /\b(no|poses?\s+no)\s+(known\s+)?(hazard|danger|risk|threat|harm)s?\b/i,
  /\b(perfectly|generally|completely|totally|entirely|considered|regarded\s+as|widely\s+considered)\s+safe\b/i,
  /\bsafe\s+for\s+(human\s+)?consumption\b/i,
  /\bwon'?t\s+(hurt|harm)\s+you\b/i,
  /\b(nothing|no\s+need)\s+to\s+worry\b/i,
];
/** A negator immediately before a "safe" phrase flips it to a CAUTION — keep, don't strip. */
const NEGATOR = /(?:\b(?:not|never|avoid|cannot)\b|n'?t)\W*$/i;

/** Signals that an advisory is a genuine caution worth surfacing (additively). */
const HAZARD_HINT = /\b(toxic|poison|venom|sting|rash|dermatit|irritant|allerg|blister|caustic|caution|warning|do not (touch|eat|handle))\b/i;
/** Signals a reportable-invasive / regulatory note. */
const INVASIVE_HINT = /\b(invasive|report(?:able)?|quarantine|regulated|do not (transport|move)|spotted lanternfly|notify)\b/i;

export function buildEnrichmentPrompt(taxon, ctx = {}) {
  const where = ctx.region ? `the student's region (${ctx.region})` : "the student's region";
  return [
    `Using up-to-date web search, give LOCAL and TIME-SENSITIVE context for the organism "${taxon.canonicalName || taxon}" relevant to ${where}.`,
    `Report only factual status and CAUTIONS:`,
    `- invasive / reportable / regulated status in that region, and who to report to;`,
    `- any CURRENT local advisories (outbreaks, seasonal toxins, closures);`,
    `- conservation status; typical range and season.`,
    ``,
    `HARD RULES:`,
    `- Do NOT say anything is safe, edible, harmless, or safe to touch/handle. Report cautions only; never all-clears.`,
    `- Prefer official/government and museum sources; include source URLs.`,
    ``,
    `Return a JSON object with keys: invasiveStatus, conservationNote, rangeSeason, advisories (array of short strings), sources (array of {title,url}). Return JSON only.`,
  ].join("\n");
}

/** Tolerant parse — grounding runs with JSON mode OFF, so the text may be fenced. */
export function parseEnrichment(text) {
  try {
    const cleaned = String(text).replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const value = JSON.parse(cleaned);
    return { ok: true, value };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}

/**
 * Redact EVERY safety-reassurance clause — but NOT when it is negated ("not safe
 * to eat" is a warning, not an all-clear, and must survive intact).
 */
export function sanitizeReassurance(text) {
  let out = String(text), hit = false;
  for (const re of REASSURANCE) {
    const g = new RegExp(re.source, "gi"); // global: strip all occurrences, not just the first
    out = out.replace(g, (match, ...args) => {
      const str = args[args.length - 1];           // the string being searched (current `out`)
      const offset = args[args.length - 2];        // match offset within it
      const before = str.slice(Math.max(0, offset - 16), offset);
      if (NEGATOR.test(before)) return match;      // negated → genuine caution; keep verbatim
      hit = true;
      return "[unverifiable safety claim removed]";
    });
  }
  return { text: out, wasRedacted: hit };
}

/**
 * Merge enrichment into a render model under the firewall. Pure; returns a NEW
 * model — the authoritative `warnings` array is cloned untouched.
 */
export function applyEnrichment(renderModel, enrichment, tiers) {
  const severity = (t) => (tiers?.[t]?.severity ?? 0);
  const CONTACT = severity("CONTACT") || 3;

  const advisoriesIn = Array.isArray(enrichment?.advisories) ? enrichment.advisories : [];
  const webAdvisories = [];
  let redactions = 0;

  for (const raw of advisoriesIn) {
    const { text, wasRedacted } = sanitizeReassurance(raw);
    if (wasRedacted) redactions++;
    // Classify on the SANITIZED text, so a stripped reassurance (e.g. "non-toxic",
    // whose "toxic" substring would otherwise read as a hazard) can't sneak back
    // in. A redacted note with no genuine caution/status left is dropped.
    const isHazard = HAZARD_HINT.test(text);
    const isInvasive = INVASIVE_HINT.test(text);
    if (wasRedacted && !isHazard && !isInvasive) continue;
    webAdvisories.push({
      text,
      tier: isHazard ? "CONTACT" : "INFO", // web can never assert DEADLY
      kind: isInvasive ? "invasive/report" : isHazard ? "local hazard" : "context",
      provenance: "web — verify",
    });
  }
  // Belt-and-suspenders: nothing web-sourced may exceed CONTACT.
  for (const a of webAdvisories) if (severity(a.tier) > CONTACT) a.tier = "CONTACT";

  const sanitizeField = (s) => (s ? sanitizeReassurance(String(s)).text : null);

  return {
    ...renderModel,
    warnings: renderModel.warnings.map((w) => ({ ...w })), // deterministic layer: cloned, never altered
    guards: { ...renderModel.guards, blockEdibilityClaims: true }, // stays true no matter what the web said
    webContext: {
      provenance: "web — verify",
      invasiveStatus: sanitizeField(enrichment?.invasiveStatus),
      conservationNote: sanitizeField(enrichment?.conservationNote),
      rangeSeason: sanitizeField(enrichment?.rangeSeason),
      advisories: webAdvisories,
      sources: Array.isArray(enrichment?.sources) ? enrichment.sources : [],
      redactions, // how many reassurance clauses were stripped (auditable)
    },
  };
}

/**
 * On-demand enrichment. `callGrounded(prompt)` binds to a SECOND Gemini call
 * with google_search on and JSON mode off (returns raw text).
 */
export async function enrich(renderModel, { callGrounded, taxon, ctx = {}, tiers }) {
  const prompt = buildEnrichmentPrompt(taxon, ctx);
  const raw = await callGrounded(prompt);
  const parsed = parseEnrichment(raw);
  if (!parsed.ok) return { ...renderModel, webContext: { provenance: "web — verify", error: parsed.error, advisories: [], sources: [] } };
  return applyEnrichment(renderModel, parsed.value, tiers);
}

// --------------------------------------------------------------- mock
/**
 * A canned grounded response for a browntail-moth photo taken in Maine.
 * Deliberately includes ONE hallucinated reassurance ("generally safe to
 * handle") so the firewall can be seen stripping it — browntail hairs actually
 * cause a serious rash, which is exactly why a web all-clear must never pass.
 */
export function mockGroundedCall_browntail() {
  return JSON.stringify({
    invasiveStatus: "Established and expanding in Maine and coastal New England; a tracked public-health pest. Report sightings to the Maine Forest Service.",
    conservationNote: "Not of conservation concern (an invasive pest).",
    rangeSeason: "Caterpillars active spring through June; toxic hairs persist in the environment afterward.",
    advisories: [
      "Maine Forest Service advisory: browntail moth caterpillars have toxic hairs that cause a poison-ivy-like rash and respiratory irritation — do not touch, and avoid disturbing nests.",
      "These caterpillars are generally safe to handle for a curious student.",
      "If found, report the location to the Maine Forest Service / cooperative extension."
    ],
    sources: [
      { title: "Maine Forest Service — Browntail Moth", url: "https://www.maine.gov/dacf/mfs/forest_health/insects/browntail_moth.htm" },
      { title: "University of Maine Cooperative Extension", url: "https://extension.umaine.edu/" }
    ],
  });
}

// --------------------------------------------------------------- runnable
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))) {
  const { readFile } = await import("node:fs/promises");
  const rules = JSON.parse(await readFile(new URL("./hazard-rules.json", import.meta.url)));

  // pretend the core already identified a browntail moth (a real CONTACT organism)
  const coreModel = {
    warnings: [
      { source: "category", id: "example-contact", tier: "CONTACT", message: "Some caterpillars have stinging or irritating hairs — don't touch.", needsExpertReview: true },
    ],
    guards: { blockEdibilityClaims: true, requiresBlockingInterstitial: false },
  };

  const out = await enrich(coreModel, {
    callGrounded: async () => mockGroundedCall_browntail(),
    taxon: { canonicalName: "Euproctis chrysorrhoea" },
    ctx: { region: "Maine, USA" },
    tiers: rules.tiers,
  });

  console.log("\n=== ENRICHMENT (separate grounded call, firewalled) ===\n");
  console.log("Deterministic warnings (unchanged):", out.warnings.map((w) => `${w.tier}:${w.id}`).join(", "));
  console.log("blockEdibilityClaims still:", out.guards.blockEdibilityClaims);
  console.log("\nWeb context —", out.webContext.provenance);
  console.log("  invasive:", out.webContext.invasiveStatus);
  console.log("  reassurance clauses stripped by firewall:", out.webContext.redactions);
  console.log("  advisories kept (additive only):");
  for (const a of out.webContext.advisories) console.log(`    • [${a.tier} · ${a.kind}] ${a.text}`);
  console.log("  sources:", out.webContext.sources.map((s) => s.url).join(", "));
  console.log("\nNote: the 'generally safe to handle' line was removed — a web all-clear never reaches the student.\n");
}
