#!/usr/bin/env node
'use strict';
/*
 * Ratchet over SEL research-framed claims.
 *
 * WHY THIS EXISTS (2026-09-21)
 * The SEL tools tell students things like "research shows X". Nothing checked
 * them. Three shipped presenting contested or WITHDRAWN findings as settled:
 *
 *   mindfulness      Carney et al. 2010 (power posing) cited as showing that
 *                    standing tall "reduces self-reported stress". Ranehill et
 *                    al. 2015 found no hormonal or behavioural effect and the
 *                    FIRST AUTHOR publicly withdrew support in 2016. The same
 *                    file framed power posing honestly 130 lines later — two
 *                    epistemic standards for one paper.
 *   mindfulness      Enclothed cognition (Adam & Galinsky 2012) cited as
 *                    established; it failed a high-powered replication and a
 *                    2023 z-curve/meta-analysis.
 *   digitalwellbeing "3+ hours daily increases depression risk" stated as
 *                    settled causation; Orben & Przybylski 2019 put screen
 *                    time at <1% of variance in adolescent well-being.
 *
 * This matters more than a wrong number in a STEM tool. Aaron is a school
 * psychologist; if the hub teaches failed-replication psychology as fact, it
 * becomes a vector for exactly the misinformation it exists to counter.
 *
 * WHAT THIS GATE CAN AND CANNOT DO
 * It cannot decide whether a claim is TRUE — most cite outside literature.
 * What it can do:
 *   1. RATCHET the population of bare claim frames ("research shows" with no
 *      author, org or year), so a new unsourced claim has to be noticed.
 *   2. BLOCK a known-retracted finding being reasserted as settled. The
 *      DISCREDITED list below pairs a finding with the hedging language that
 *      must appear near it.
 *
 * Deliberately NOT flagged:
 *   - named attributions (Putwain & Daly 2014, Shaywitz 2003, Steel 2007,
 *     Olweus, Sue 2007, Pew) — that is the pattern we want;
 *   - hypothetical ETHICS SCENARIOS, where "police say it will reduce crime by
 *     40%" is a debate premise in a `background:` field, not a claim;
 *   - claims that already carry honest framing.
 *
 * Usage:  node dev-tools/check_sel_research_claims.cjs [--update] [--selftest]
 * Exit:   non-zero if the bare-claim count rises above the baseline, or a
 *         discredited finding is asserted without hedging.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DIR = path.join(ROOT, 'sel_hub');
const BASELINE = path.join(ROOT, 'dev-tools', 'sel_research_claims_baseline.json');
const UPDATE = process.argv.includes('--update');
const SELFTEST = process.argv.includes('--selftest');

/** Language that asserts empirical backing. */
const FRAMES = [
  /\bresearch (?:shows|finds|suggests|indicates|says)\b/i,
  /\bstudies (?:show|find|suggest|indicate)\b/i,
  /\bstudy (?:shows|found|finds)\b/i,
  /\bevidence (?:shows|suggests)\b/i,
  /\bdata shows?\b/i,
  /\bproven to\b/i,
  /\bclinically proven\b/i,
];

/** An attribution a reader could actually chase. */
const ATTRIBUTED = /\b[A-Z][A-Za-z\-]+(?:\s*(?:&|and|et al\.?)\s*[A-Z][A-Za-z\-]+)?\s*\(\d{4}\)|\b(?:Pew|CDC|NIH|WHO|SAMHSA|JAMA|NEJM|Trevor Project|American Test Anxieties|Common Sense Media|Gilovich|Neff|Pennebaker|Bowlby|Olweus|Dweck)\b|doi|PubMed/;

/** A field that holds a debate premise, not a factual assertion. */
const SCENARIO_FIELD = /^\s*(?:background|scenario|prompt|vignette|story|premise)\s*:/;

/**
 * Findings that did not survive replication. If the finding is named, hedging
 * language must appear within the same string, or the gate blocks.
 */
const DISCREDITED = [
  { name: 'power posing / expansive posture (Carney 2010)',
    finding: /\b(?:power pos\w+|expansive posture|Carney)\b/i,
    hedge: /did not hold up|did not replicate|mixed replication|failed to replicate|withdrew support|no hormonal|only the felt|disavow/i },
  { name: 'enclothed cognition (Adam & Galinsky 2012)',
    finding: /\benclothed cognition\b/i,
    hedge: /failed a high-powered replication|did not replicate|not settled science|personal experiment|personal observation/i },
  { name: 'learning styles', finding: /\blearning styles?\b/i,
    hedge: /myth|not supported|debunked|no evidence|commonly taught but/i },
  { name: 'left-brain / right-brain', finding: /\b(?:left[- ]brained?|right[- ]brained?)\b/i,
    hedge: /myth|oversimplif|not how|debunked/i },
];

/**
 * A discredited finding needs a hedge wherever the line presents it as
 * SUPPORT, not only after "research shows". Added 2026-09-22: five power-posing
 * citations passed because they sat in `research:` / `evidence:` fields
 * ("Carney postural feedback", "embodied cognition (Carney on power posing)")
 * or split the frame with a citation ("research (Carney, Riskind) shows ...
 * cortisol"), which the adjacent-word FRAMES never match.
 */
const CITATION_FIELD = /^\s*(?:research|evidence)\s*:/;
const LOOSE_FRAME = /\b(?:research|studies|evidence)\b[^.'"]{0,60}?\b(?:shows?|finds?|found|suggests?|indicates?)\b/i;
const presentsAsSupport = (line) => FRAMES.some((rx) => rx.test(line)) || CITATION_FIELD.test(line) || LOOSE_FRAME.test(line);

function scan() {
  const bare = [];
  const violations = [];
  for (const name of fs.readdirSync(DIR).filter((f) => /^sel_tool_.*\.js$/.test(f))) {
    const lines = fs.readFileSync(path.join(DIR, name), 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (SCENARIO_FIELD.test(line)) return;

      if (FRAMES.some((rx) => rx.test(line)) && !ATTRIBUTED.test(line)) {
        bare.push(`${name}:${i + 1}`);
      }
      for (const d of DISCREDITED) {
        if (d.finding.test(line) && presentsAsSupport(line) && !d.hedge.test(line)) {
          violations.push({ where: `${name}:${i + 1}`, what: d.name, text: line.trim().slice(0, 150) });
        }
      }
    });
  }
  return { bare, violations };
}

if (SELFTEST) {
  // The gate must fire on a discredited finding asserted as settled.
  const probe = "  research: 'Power posing studies show expansive postures raise testosterone.',";
  const d = DISCREDITED[0];
  const violates = (line) => d.finding.test(line) && presentsAsSupport(line) && !d.hedge.test(line);
  // A citation field names the finding as support with no "shows" verb, and a
  // citation can split the frame. Both shipped until 2026-09-22.
  const fieldProbe = "      evidence: 'Yoga research on postural alignment; embodied cognition (Carney on power posing).',";
  const splitProbe = "        high: 'Embodied cognition research (Carney, Riskind) shows postural feedback affects affect and cortisol.',";
  const fires = violates(probe) && violates(fieldProbe) && violates(splitProbe);
  // ...and must NOT fire once the hedge is present.
  const hedged = "  research: 'Power posing did not hold up; only the felt-confidence part replicated.',";
  const quiet = !violates(hedged);
  console.log(`SELFTEST: unhedged ${fires ? 'CAUGHT ✓' : 'MISSED ✗'} · hedged ${quiet ? 'allowed ✓' : 'false-positive ✗'}`);
  process.exit(fires && quiet ? 0 : 1);
}

const { bare, violations } = scan();

if (UPDATE) {
  fs.writeFileSync(BASELINE, JSON.stringify({ count: bare.length, sites: bare.sort() }, null, 1));
  console.log(`baseline written: ${bare.length} bare claim frame(s)`);
  process.exit(0);
}

let prior = { count: Infinity, sites: [] };
if (fs.existsSync(BASELINE)) prior = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));

console.log(`bare claim frames : ${bare.length} (baseline ${prior.count})`);
console.log(`discredited-finding violations: ${violations.length}\n`);

for (const v of violations) {
  console.log(`  ✗ ${v.where}  ${v.what}`);
  console.log(`      ${v.text}`);
  console.log('      A finding that did not replicate must say so where it is taught.');
}

const added = bare.filter((b) => !prior.sites.includes(b));
if (added.length && bare.length > prior.count) {
  console.log(`\n  ✗ ${added.length} NEW unsourced claim frame(s):`);
  for (const a of added.slice(0, 12)) console.log(`      ${a}`);
  console.log('      Add an attribution a reader can chase (Author, YEAR / org),');
  console.log('      or rewrite so it does not assert research backing.');
}

const fail = violations.length > 0 || (bare.length > prior.count && added.length > 0);
if (!fail) {
  console.log(`✓ check_sel_research_claims: no discredited findings asserted, and no new unsourced claims (${bare.length} ≤ ${prior.count}).`);
}
process.exit(fail ? 1 : 0);
