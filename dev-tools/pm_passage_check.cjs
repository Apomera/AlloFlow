// Machine gate for PM_BANK ORF passage drafts (PM_BANK_FORM_SPEC.md §2-3).
//
//   node dev-tools/pm_passage_check.cjs pm_bank/PM_PASSAGES_DRAFT_WAVE1.json
//   node dev-tools/pm_passage_check.cjs <file> --spache-list=<path> --dalechall-list=<path>
//
// WHY. The spec's rule is "run every batch through the readability check
// before human review; discard misses, do not repair them." This is that
// check, plus every constraint in §2 that a machine can screen:
//   - word count inside the grade band
//   - proper-noun budget (≤3 distinct, counted off-sentence-start)
//   - dialogue share (quotation-heavy text distorts rate)
//   - banned-content keyword screen (human confirms; this only flags)
//   - topic uniqueness within a grade (the ledger travels with the bank)
//   - grades 1-2 decodability screen against the PROVISIONAL inventory
//     (pm_bank/DECODABILITY_INVENTORY_PROVISIONAL.md — reviewers may swap it)
//
// READABILITY HONESTY. Spache and Dale-Chall are the spec's named checks, and
// both are list-based formulas: without the published word lists the score
// cannot be computed, only imitated. This tool implements BOTH formulas and
// computes them ONLY when a list file is supplied (--spache-list /
// --dalechall-list, one word per line); until then it reports Flesch-Kincaid
// (list-free, exact formula, heuristic syllables) as a PROVISIONAL band proxy
// and stamps the passage 'pending-verified-wordlist'. A number produced from
// a from-memory word list would be fiction wearing a citation.
'use strict';

const fs = require('fs');

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
if (!file || !fs.existsSync(file)) {
  console.error('usage: node dev-tools/pm_passage_check.cjs <draft.json> [--spache-list=f] [--dalechall-list=f]');
  process.exit(2);
}
const listArg = (name) => {
  const a = args.find((x) => x.startsWith('--' + name + '='));
  if (!a) return null;
  const p = a.slice(name.length + 3);
  if (!fs.existsSync(p)) { console.error('list not found: ' + p); process.exit(2); }
  return new Set(fs.readFileSync(p, 'utf8').split(/\r?\n/).map((w) => w.trim().toLowerCase()).filter(Boolean));
};
const SPACHE_LIST = listArg('spache-list');
const DALECHALL_LIST = listArg('dalechall-list');

// Difficulty bands. FK is the provisional proxy for grades 3-6 ONLY: below
// grade ~2 the FK formula bottoms out (well-formed primer text scores
// NEGATIVE), so grades 1-2 are banded on the structure the formula would
// have measured — mean sentence length and syllables per word — which is
// also what Spache actually weighs. Verified Spache replaces this when the
// word list is supplied.
const BANDS = {
  '1': { min: 80, max: 120, asl: [4.5, 7.5], asw: [1.0, 1.18] },
  '2': { min: 120, max: 180, asl: [6.5, 10.0], asw: [1.0, 1.28] },
  '3': { min: 150, max: 220, fk: [2.6, 4.0] },
  '4': { min: 180, max: 250, fk: [3.8, 5.3] },
  '5': { min: 200, max: 250, fk: [4.8, 6.3] },
  '6': { min: 220, max: 280, fk: [5.8, 7.3] },
};

// Banned-content screen (spec §2): flags for HUMAN review, does not clear it.
// ★Stems expand with \w* — a stem like "war" would match "warm" and "wound"
// (past tense of wind) is not "wounded", so those are matched as exact words.
const BANNED = /\b(?:die|died|dies|dying|death|dead|kill\w*|hurt\w*|injur\w*|wounded|blood\w*|bleed\w*|hungry|hunger|starv\w*|famine|church\w*|mosque\w*|temple\w*|pray|prayer\w*|god|gods|bible|christmas|easter|hanukkah|ramadan|divorce\w*|funeral\w*|grave|graves|storm\w*|hurricane\w*|tornado\w*|flood\w*|earthquake\w*|wildfire\w*|blizzard\w*|drought\w*|war|wars|warfare|battle\w*|gun|guns|knife|knives|weapon\w*|sick\w*|hospital\w*|cancer|drown\w*)\b/gi;

// ── Provisional decodability inventory (grades 1-2) ─────────────────────────
// Mirrors pm_bank/DECODABILITY_INVENTORY_PROVISIONAL.md. Reviewers may swap
// the reference; this classifier is a MACHINE SCREEN, not the final word.
// Core high-frequency list plus a SMALL documented schoolroom annex (school,
// teacher, book, friend, paper, write) — flagged in the provisional inventory
// doc for reviewer approval alongside the pattern rules.
const SIGHT_WORDS = new Set(('the a and to of in is you that it he she was for on are as with his her they i at be this have from or one had by but not what all were we when your can said there an each which do how their if will up other about out many then them these so some would make like him into time has look two more go see no way could my than first been who its now find down day did get come made may part over new take only little work know place year live me back give most very after thing our just name good man think say great where help much before too old any same tell boy follow came want show also around three small set put end does another well large must big even such because turn here why ask went read need land different home us move try kind hand again change off play away animal house point mother father answer found still learn should water long oil sit people sound school teacher book friend paper write').split(/\s+/));
// Inflected forms are checked as every plausible base: "trees" must resolve
// via "tree", not via a blind suffix-strip that leaves "tre".
function baseCandidates(w) {
  const out = [w];
  for (const e of ["'s", 'ing', 'ed', 'es', 's']) {
    if (w.endsWith(e) && w.length - e.length >= 3) out.push(w.slice(0, -e.length));
  }
  if (w.endsWith('ing') && w.length >= 6) out.push(w.slice(0, -3) + 'e'); // riding -> ride
  return out;
}
function g1Core(w) {
  // CVC / CCVC / CVCC with short vowel; digraphs sh ch th wh ck; ll ss ff zz.
  const dig = w.replace(/sh|ch|th|wh|ck|ll|ss|ff|zz|qu/g, 'D');
  return /^[^aeiou]{0,2}[aeiou][^aeiou]{1,2}$/.test(dig.replace(/D/g, 'd')) && !/[aeiou]{2}/.test(w);
}
function g2Core(w) {
  if (g1Core(w)) return true;
  if (/^[^aeiou]{0,3}[aeiou][^aeiou]{1,3}$/.test(w) && !/[aeiou]{2}/.test(w)) return true; // CCC blends on closed syllable (string, splash)
  if (/^[^aeiou]{0,3}[aeiou][^aeiou]{1,2}e$/.test(w)) return true;                    // silent-e
  if (/(ai|ay|ee|ea|oa|ow|oo|ue|ew|igh|ind|old|olt)/.test(w) && w.length <= 7) return true; // vowel teams
  if (/(ar|or|er|ir|ur)/.test(w) && w.length <= 7) return true;                       // r-controlled
  if (/^[^aeiou]{0,3}[aeiou]?[^aeiou]{0,2}(y|le)$/.test(w)) return true;              // -y / -le (fly, sky, little)
  if (/^[^aeiou]{0,3}[aeiou][^aeiou]{1,2}[aeiou][^aeiou]{1,2}$/.test(w) && !/[aeiou]{2}/.test(w)) return true; // two closed syllables (mitten, until)
  return false;
}
function decodableFor(grade, word) {
  const core = grade === '1' ? g1Core : g2Core;
  return baseCandidates(word).some((b) => SIGHT_WORDS.has(b) || core(b));
}

function syllables(word) {
  let w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed)$/, '').replace(/^y/, '');
  const m = w.match(/[aeiouy]{1,2}/g);
  return Math.max(1, m ? m.length : 1);
}

function analyze(p, grade) {
  const issues = [];
  const text = p.text.trim();
  const sentences = text.split(/[.!?]+\s/).filter((s) => s.trim().length > 0);
  const tokens = text.split(/\s+/);
  const words = tokens.map((t) => t.replace(/^["'“”(]+|["'“”),.!?;:]+$/g, '')).filter(Boolean);
  const band = BANDS[grade];

  if (words.length < band.min || words.length > band.max) {
    issues.push(`word count ${words.length} outside ${band.min}-${band.max}`);
  }

  // Flesch-Kincaid (exact formula; syllable heuristic — provisional proxy).
  const syl = words.reduce((a, w) => a + syllables(w), 0);
  const asl = words.length / sentences.length;
  const asw = syl / words.length;
  const fk = 0.39 * asl + 11.8 * asw - 15.59;
  if (band.fk) {
    if (fk < band.fk[0] || fk > band.fk[1]) {
      issues.push(`FK ${fk.toFixed(2)} outside provisional band ${band.fk[0]}-${band.fk[1]}`);
    }
  } else {
    if (asl < band.asl[0] || asl > band.asl[1]) {
      issues.push(`mean sentence length ${asl.toFixed(1)} outside ${band.asl[0]}-${band.asl[1]}`);
    }
    if (asw < band.asw[0] || asw > band.asw[1]) {
      issues.push(`syllables/word ${asw.toFixed(2)} outside ${band.asw[0]}-${band.asw[1]}`);
    }
  }

  // Proper-noun budget: capitalized tokens that do not open a sentence.
  const sentenceStarts = new Set();
  let idx = 0;
  for (const s of sentences) { sentenceStarts.add(idx); idx += s.trim().split(/\s+/).length; }
  const proper = new Set();
  words.forEach((w, i) => {
    if (/^[A-Z][a-z]/.test(w) && !sentenceStarts.has(i) && w !== 'I') proper.add(w.replace(/'s$/, ''));
  });
  if (proper.size > 3) issues.push(`proper nouns ${proper.size} > 3 (${[...proper].join(', ')})`);

  // Dialogue share.
  const quoted = (text.match(/"[^"]*"|“[^”]*”/g) || []).join(' ').split(/\s+/).filter(Boolean).length;
  const dlgShare = quoted / words.length;
  if (dlgShare > 0.15) issues.push(`dialogue share ${(dlgShare * 100).toFixed(0)}% > 15%`);

  // Banned-content flags (human confirms).
  const banned = [...new Set((text.match(BANNED) || []).map((w) => w.toLowerCase()))];
  if (banned.length) issues.push(`banned-content flags: ${banned.join(', ')}`);

  // Decodability screen (grades 1-2 only).
  let decodability = null;
  if (grade === '1' || grade === '2') {
    const out = [];
    for (const w of words) {
      const lw = w.toLowerCase().replace(/[^a-z']/g, '');
      if (!lw) continue;
      if (decodableFor(grade, lw)) continue;
      if (/^[A-Z]/.test(w)) continue; // proper nouns budgeted separately
      out.push(lw);
    }
    const pct = out.length / words.length;
    decodability = { outside: [...new Set(out)], pct: +(pct * 100).toFixed(1) };
    if (pct > 0.05) issues.push(`decodability: ${(pct * 100).toFixed(1)}% outside provisional inventory (max 5%): ${[...new Set(out)].join(', ')}`);
  }

  // List-based readability, only when a verified list is supplied.
  let spache = null, daleChall = null;
  if (SPACHE_LIST && (grade === '1' || grade === '2' || grade === '3')) {
    const unfamiliar = new Set(words.map((w) => w.toLowerCase().replace(/[^a-z']/g, '')).filter((w) => w && !baseCandidates(w).some((b) => SPACHE_LIST.has(b))));
    spache = +(0.141 * (words.length / sentences.length) + 0.086 * (unfamiliar.size / words.length * 100) + 0.839).toFixed(2);
  }
  if (DALECHALL_LIST && Number(grade) >= 4) {
    const hard = words.map((w) => w.toLowerCase().replace(/[^a-z']/g, '')).filter((w) => w && !baseCandidates(w).some((b) => DALECHALL_LIST.has(b)));
    const pdw = hard.length / words.length * 100;
    let raw = 0.1579 * pdw + 0.0496 * (words.length / sentences.length);
    if (pdw > 5) raw += 3.6365;
    daleChall = +raw.toFixed(2);
  }

  return {
    wordCount: words.length, sentenceCount: sentences.length,
    meanSentenceLen: +(words.length / sentences.length).toFixed(1),
    fkGrade: +fk.toFixed(2),
    readabilityStatus: (SPACHE_LIST || DALECHALL_LIST) ? 'verified-list-run' : 'pending-verified-wordlist',
    spache, daleChall,
    properNouns: [...proper], dialogueShare: +(dlgShare * 100).toFixed(1),
    decodability, issues,
  };
}

const bank = JSON.parse(fs.readFileSync(file, 'utf8'));
let totalIssues = 0;
for (const grade of Object.keys(bank.passages)) {
  const list = bank.passages[grade];
  console.log(`\n=== Grade ${grade} (${list.length} passages) ===`);
  const topics = new Map();
  for (const p of list) {
    const r = analyze(p, grade);
    p.metrics = r; // written back so provenance ships with the passage
    const t = (p.topic || '').toLowerCase();
    if (topics.has(t)) r.issues.push(`topic collides with ${topics.get(t)}`);
    topics.set(t, p.id);
    const flag = r.issues.length ? 'FAIL' : 'ok  ';
    console.log(`${flag} ${p.id}  ${r.wordCount}w  FK ${r.fkGrade}` +
      (r.spache != null ? `  Spache ${r.spache}` : '') +
      (r.daleChall != null ? `  DC ${r.daleChall}` : '') +
      (r.decodability ? `  decod-out ${r.decodability.pct}%` : '') +
      `  "${p.title}"`);
    r.issues.forEach((i) => console.log('       - ' + i));
    totalIssues += r.issues.length;
  }
}
fs.writeFileSync(file, JSON.stringify(bank, null, 2) + '\n');
console.log(`\n${totalIssues === 0 ? 'ALL PASS' : totalIssues + ' issue(s)'} — metrics written back to ${file}`);
process.exit(totalIssues === 0 ? 0 : 1);
