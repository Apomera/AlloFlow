/**
 * hazard-matcher.mjs
 * -------------------------------------------------------------------------
 * Given a resolved primary ID plus its candidate list, decide which safety
 * warnings must appear.
 *
 * THE ONE INVARIANT: a candidate's confidence is NEVER consulted to decide
 * whether a DEADLY/CONTACT warning fires. Confidence may only ORDER the
 * teaching content. A rule fires if ANY in-play taxon (top ID OR any
 * candidate, at any confidence) matches its trigger. We warn on the
 * NEIGHBORHOOD of the ID, not just the winner.
 *
 * This module is pure and synchronous: feed it taxa already resolved by
 * taxon-resolver.mjs and the rules from hazard-rules.json. No network, so it
 * is trivially unit-testable and deterministic.
 * -------------------------------------------------------------------------
 */

const norm = (s) => String(s || "").trim().toLowerCase();

/** Collect a de-duplicated set of "rank|name" keys from every in-play taxon's lineage. */
function lineageKeySet(taxa) {
  const set = new Set();
  for (const t of taxa) {
    for (const node of t?.lineage || []) {
      set.add(`${norm(node.rank)}|${norm(node.name)}`);
    }
    // Also index the taxon's own rank/name in case it is finer than its lineage array.
    if (t?.rank && t?.canonicalName) {
      set.add(`${norm(t.rank)}|${norm(t.canonicalName)}`);
    }
    // FAIL-SAFE: even if GBIF never resolved this taxon (network error, odd name),
    // derive a genus/species key from whatever name we have, so a deadly rule can
    // still fire on an unresolved name. Resolution failure must not silence safety.
    const rawName = t?.canonicalName || t?.scientificName || t?.model?.scientificName || t?.input;
    if (rawName) {
      const toks = String(rawName).trim().split(/\s+/);
      if (/^[A-Z][a-zë-]+$/.test(toks[0] || "")) set.add(`genus|${norm(toks[0])}`);
      if (toks.length >= 2 && /^[a-z]/.test(toks[1])) set.add(`species|${norm(toks[0] + " " + toks[1])}`);
    }
  }
  return set;
}

const triggerHit = (keys, trigger) => keys.has(`${norm(trigger.rank)}|${norm(trigger.name)}`);

/**
 * @param {object} input
 * @param {object} input.primary      resolved top ID (from resolveTaxon)
 * @param {Array}  input.candidates   resolved candidates (confidence is IGNORED for gating)
 * @param {object} rules              parsed hazard-rules.json
 * @returns {{ alwaysOn, warnings, maxSeverity, reviewPending }}
 */
export function matchHazards({ primary, candidates = [] }, rules) {
  // Include UNMATCHED taxa too: lineageKeySet derives a fail-safe genus key from
  // their name, so a GBIF miss can never drop a deadly organism out of matching.
  const inPlay = [primary, ...candidates].filter(Boolean);
  const keys = lineageKeySet(inPlay);
  const tierSeverity = (tier) => rules.tiers?.[tier]?.severity ?? 0;

  const fired = [];

  // 1) Category fail-safes — the safety net that guarantees coverage.
  for (const rule of rules.categoryRules || []) {
    if (triggerHit(keys, rule.match)) {
      fired.push({
        source: "category",
        id: rule.id,
        tier: rule.tier,
        domain: rule.domain,
        message: rule.message,
        needsExpertReview: !!rule.needsExpertReview,
        firedBy: `${rule.match.rank}:${rule.match.name}`,
      });
    }
  }

  // 2) Confusion graph — the specific "deadly lookalike" edges.
  for (const c of rules.confusions || []) {
    const hitTrigger = (c.triggerTaxa || []).find((t) => triggerHit(keys, t));
    if (hitTrigger) {
      fired.push({
        source: "confusion",
        id: c.id,
        tier: c.tier,
        group: c.group || null,
        benign: c.benign,
        danger: c.danger,
        tell: c.tell,
        consequence: c.consequence,
        message: c.message,
        needsExpertReview: !!c.needsExpertReview,
        firedBy: `${hitTrigger.rank}:${hitTrigger.name}`,
      });
    }
  }

  // 3) Direct hazards — the organism IS a known-dangerous species (not a lookalike).
  for (const h of rules.directHazards || []) {
    const hit = (h.taxa || []).find((t) => triggerHit(keys, t));
    if (hit) {
      fired.push({
        source: "direct",
        id: h.id,
        tier: h.tier,
        domain: h.domain,
        common: h.common,
        tell: h.tell,
        message: h.message,
        needsExpertReview: !!h.needsExpertReview,
        firedBy: `${hit.rank}:${hit.name}`,
      });
    }
  }

  // De-dupe by id, then sort most-severe first.
  const seen = new Set();
  const warnings = fired
    .filter((w) => (seen.has(w.id) ? false : seen.add(w.id)))
    .sort((a, b) => tierSeverity(b.tier) - tierSeverity(a.tier));

  const maxSeverity = warnings.reduce((m, w) => Math.max(m, tierSeverity(w.tier)), 0);
  const reviewPending = warnings.some((w) => w.needsExpertReview);

  return {
    alwaysOn: rules.alwaysOn, // Layer 1 field ethics — attached to EVERY result
    warnings, // Layer 2 context hazards (flat, source of truth)
    groups: groupWarnings(warnings, tierSeverity), // display-oriented: same-danger edges collapsed
    maxSeverity,
    reviewPending,
  };
}

/**
 * Collapse warnings that share a `group` (e.g. three Amanita lookalike edges)
 * into one primary + related list, so a single deadly-fungus result shows ONE
 * strong banner instead of four near-identical ones (alarm fatigue). The flat
 * `warnings` array is left intact; this is purely for rendering. Warnings are
 * pre-sorted most-severe-first, so the first member of a group is its primary.
 */
function groupWarnings(warnings, severityOf) {
  const groups = [];
  const byKey = new Map();
  for (const w of warnings) {
    if (!w.group) { groups.push({ key: null, primary: w, related: [] }); continue; }
    const existing = byKey.get(w.group);
    if (!existing) {
      const g = { key: w.group, primary: w, related: [] };
      byKey.set(w.group, g);
      groups.push(g);
    } else if (severityOf(w.tier) > severityOf(existing.primary.tier)) {
      existing.related.push(existing.primary);
      existing.primary = w;
    } else {
      existing.related.push(w);
    }
  }
  return groups;
}

/**
 * Guard for the render layer: an output must never read as an edibility or
 * safe-to-handle clearance. Returns the hard gate flags the UI should honor.
 */
export function outputGuards(hazardResult) {
  const domains = new Set(hazardResult.warnings.map((w) => w.domain).filter(Boolean));
  return {
    blockEdibilityClaims: true, // ALWAYS true — the tool never clears anything to eat
    forageWarningActive: domains.has("forage"),
    handleWarningActive: domains.has("handle") || domains.has("touch"),
    requiresBlockingInterstitial: hazardResult.maxSeverity >= 4, // DEADLY
  };
}
