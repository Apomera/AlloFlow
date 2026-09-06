#!/usr/bin/env node
'use strict';
// AlloPack quality audit: the checks the vitest shape suite does not make.
// Per pack: reading-level estimate vs stated grade, quiz answer-position spread and
// length tell, glossary terms bolded in the reading, definitions that echo the term,
// concept-sort category balance, FAQ/frames counts, objectives that reference resources,
// standards string format. Prints a table plus per-pack flags. Read-only.
//
//   node dev-tools/audit_allopacks.cjs [--json]
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'allopacks');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.allopack.json')).sort();
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^﻿/, ''));

function syllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const stripped = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const groups = stripped.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}
function fleschKincaid(text) {
  const plain = text.replace(/[*_#>`]/g, ' ').replace(/\s+/g, ' ');
  const sentences = plain.split(/[.!?]+(?:\s|$)/).filter((s) => s.trim().split(/\s+/).length > 1);
  const words = plain.split(/\s+/).filter((w) => /[a-zA-Z]/.test(w));
  const syl = words.reduce((n, w) => n + syllables(w), 0);
  const grade = 0.39 * (words.length / Math.max(1, sentences.length)) + 11.8 * (syl / Math.max(1, words.length)) - 15.59;
  return { grade: +grade.toFixed(1), words: words.length, sentences: sentences.length, wordsPerSentence: +(words.length / Math.max(1, sentences.length)).toFixed(1) };
}
function gradeBand(label) {
  const nums = String(label).match(/\d+/g);
  if (!nums) return null;
  const a = nums.map(Number);
  return { lo: Math.min(...a), hi: Math.max(...a) };
}


// ── GAME PLAYABILITY ──────────────────────────────────────────────────────
// A pack's directions can promise a word game, but the game only sees glossary
// terms it can actually lay out. Rules mirrored from games_source.jsx:
//   gameWordLetters  strips all but letters/marks/numbers (spaces + hyphens vanish)
//   crossword        3 <= cells <= CROSSWORD_MAX_CELLS (15) for latin script
//   wordScramble     cells > 2 AND at least two distinct characters
// matching / memory / bingo pair term with definition and have no length rule.
const CROSSWORD_MAX_CELLS = 15;
const gameLetters = (s) => String(s == null ? '' : s).normalize('NFC').replace(/[^\p{L}\p{M}\p{N}]/gu, '');
const crosswordOk = (t) => { const c = Array.from(gameLetters(t)); return c.length >= 3 && c.length <= CROSSWORD_MAX_CELLS; };
const scrambleOk = (t) => { const c = Array.from(gameLetters(t)); return c.length > 2 && new Set(c.map((x) => x.toLocaleLowerCase())).size > 1; };

const rows = [];
for (const f of files) {
  const pack = read(path.join(dir, f));
  const items = pack.history;
  const by = (t) => items.filter((r) => r.type === t);
  const flags = [];
  const reading = by('simplified')[0];
  const glossary = by('glossary')[0];
  const quiz = by('quiz')[0];
  const sort = by('concept-sort')[0];
  const directions = by('directions')[0];
  const faq = by('faq')[0];
  const frames = by('sentence-frames')[0];

  // Reading level vs stated grade (FK is a proxy; two grades of slack).
  const fk = reading ? fleschKincaid(String(reading.data)) : null;
  const band = gradeBand(pack.allopack.gradeLevel);
  if (fk && band) {
    if (fk.grade > band.hi + 2) flags.push(`reading FK ${fk.grade} above grade band ${band.lo}-${band.hi}`);
    if (fk.grade < band.lo - 2.5) flags.push(`reading FK ${fk.grade} well below grade band ${band.lo}-${band.hi}`);
  }
  // A primary reading is SHORT on purpose: a grade-1 sitting is a page, not an essay.
  // Holding K-2 to the same 350-550 target would push authors into text no six-year-old finishes.
  const lo = band && band.hi <= 2 ? 140 : 300;
  const hi = band && band.hi <= 2 ? 280 : 600;
  if (fk && (fk.words < lo || fk.words > hi)) flags.push(`reading ${fk.words} words (target ${lo + 40}-${hi - 50})`);

  // The reading is not the only thing a student reads. The FAQ especially is where a confused
  // student goes, so companion prose above the reading's own grade band defeats the point of
  // levelling the reading at all. Measured with the same estimator, held to the same band + 2.
  // Short texts make FK wildly noisy, hence the 60-word floor.
  // ── STUDENT-FACING PROSE ─────────────────────────────────────────────────
  // The reading is not the only thing a student reads. Levelling the reading and leaving the
  // FAQ at grade 9 defeats the point: the FAQ is where a student goes once the reading lost
  // them, and the challenge brief is what they must read before they can start the task.
  // Held to the same band + 2 as the reading, with the same estimator.
  //
  // ONLY prose belongs here. Excluded on purpose, each after producing a false flag or on the
  // same reasoning: the directions body (a numbered checklist of resource TITLES — long proper
  // titles inflate FK without making anything harder), anchor-chart bullets and outline items
  // (sentence fragments), and quiz stems (too short to estimate, and a stem quoting a figurative
  // sentence scores high for reasons unrelated to difficulty).
  const memoryAid = by('memory-aid')[0];
  const challenge = by('applied-challenge')[0];
  const brief = challenge && challenge.data && challenge.data.brief;
  const prose = [
    ['faq answers', faq ? faq.data.map((q) => q.answer).join(' ') : ''],
    ['glossary definitions', glossary ? glossary.data.map((g) => g.def).join(' ') : ''],
    ['memory-aid examples', memoryAid ? memoryAid.data.cards.flatMap((c) => [c.aiExample, c.mapping]).join(' ') : ''],
    ['challenge brief', brief ? [brief.context, brief.drivingQuestion, brief.seedDirection || '', ...(brief.openQuestions || []), ...(brief.criteria || []), brief.deliverable].join('. ') : ''],
  ];
  for (const [what, text] of prose) {
    if (!band || text.split(/\s+/).filter(Boolean).length < 60) continue; // short text makes FK wild
    const g = fleschKincaid(text).grade;
    if (g > band.hi + 2) flags.push(`${what} read at FK ${g}, above grade band ${band.lo}-${band.hi}`);
  }

  // Glossary terms bolded on first use in the reading.
  let bolded = 0, missing = [];
  if (reading && glossary) {
    const text = String(reading.data).toLowerCase();
    for (const g of glossary.data) {
      const t = g.term.toLowerCase();
      if (new RegExp('\\*\\*[^*]*' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, Math.max(4, t.length - 2)) + '[^*]*\\*\\*').test(text)) bolded++;
      else missing.push(g.term);
    }
    if (missing.length > Math.ceil(glossary.data.length / 3)) flags.push(`only ${bolded}/${glossary.data.length} glossary terms bolded in reading (missing: ${missing.slice(0, 4).join(', ')}${missing.length > 4 ? '…' : ''})`);
  }
  // Definitions that echo the term (circular).
  if (glossary) {
    for (const g of glossary.data) {
      const stem = g.term.toLowerCase().replace(/(tion|sion|ing|s|e)$/, '');
      if (stem.length >= 5 && g.def.toLowerCase().includes(stem)) flags.push(`glossary "${g.term}" definition echoes the term`);
      if (g.def.split(/\s+/).length > 30) flags.push(`glossary "${g.term}" definition is long (${g.def.split(/\s+/).length} words)`);
    }
    const multi = glossary.data.filter((g) => /\s/.test(g.term.trim())).length;
    if (multi > glossary.data.length / 2) flags.push(`${multi}/${glossary.data.length} glossary terms are multi-word (word games prefer single words)`);
  }
  // Quiz: answer position spread, length tell, misconception distractors, concept labels.
  let posSpread = '', lengthTells = 0;
  if (quiz) {
    const mcq = quiz.data.questions.filter((q) => q.type === 'mcq');
    const pos = [0, 0, 0, 0];
    for (const q of mcq) {
      const i = q.options.indexOf(q.correctAnswer);
      if (i >= 0) pos[i]++;
      const lens = q.options.map((o) => o.length);
      const correct = q.correctAnswer.length;
      const others = q.options.filter((o) => o !== q.correctAnswer).map((o) => o.length);
      if (correct > Math.max(...others) * 1.35 || correct < Math.min(...others) * 0.6) lengthTells++;
    }
    posSpread = pos.join('/');
    if (mcq.length >= 4 && Math.max(...pos) >= Math.ceil(mcq.length * 0.6)) flags.push(`quiz answer position skew ${posSpread}`);
    if (lengthTells) flags.push(`${lengthTells} quiz item(s) with an option-length tell`);
    const labels = new Set(quiz.data.questions.map((q) => q.conceptLabel));
    if (labels.size === quiz.data.questions.length && quiz.data.questions.length > 5) flags.push('every quiz item has a unique conceptLabel (no retention pairing)');
    if (!quiz.data.questions.some((q) => q.type === 'shortAnswer')) flags.push('quiz has no short-answer item');
  }
  // Concept sort balance.
  if (sort) {
    const counts = {};
    for (const i of sort.data.items) counts[i.categoryId] = (counts[i.categoryId] || 0) + 1;
    const vals = Object.values(counts);
    if (Math.min(...vals) === 1) flags.push('concept-sort has a category with a single item');
    const dupes = sort.data.items.map((i) => i.content.toLowerCase()).filter((c, i, a) => a.indexOf(c) !== i);
    if (dupes.length) flags.push('concept-sort duplicate item text');
  }
  // Directions objectives.
  if (directions && directions.data && Array.isArray(directions.data.objectives)) {
    const ids = new Set(items.map((r) => r.id));
    for (const o of directions.data.objectives) if (o.resourceRef && !ids.has(o.resourceRef)) flags.push(`objective ${o.id} references missing ${o.resourceRef}`);
    const body = String(directions.data.body || '');
    const named = items.filter((r) => r.type !== 'directions' && body.includes(r.title.split(/[—:]/)[0].trim())).length;
    if (named < Math.floor((items.length - 1) / 2)) flags.push(`directions body names ${named}/${items.length - 1} resources`);
  }
  // Games the directions promise must have enough eligible terms to be worth playing.
  if (directions && directions.data && Array.isArray(directions.data.objectives)) {
    const practised = new Set(), everSkipped = [];
    for (const o of directions.data.objectives.filter((x) => x.kind === 'game')) {
      const ref = o.resourceRef ? items.find((r) => r.id === o.resourceRef) : glossary;
      const terms = (ref && Array.isArray(ref.data)) ? ref.data.map((g) => g.term) : [];
      let skipped = [];
      if (o.gameType === 'crossword') skipped = terms.filter((t) => !crosswordOk(t));
      else if (o.gameType === 'wordScramble') skipped = terms.filter((t) => !scrambleOk(t));
      const eligible = terms.length - skipped.length;
      if (eligible === 0) flags.push(`${o.gameType} objective has NO playable terms`);
      else if (eligible < 6) flags.push(`${o.gameType} objective has only ${eligible} playable terms`);
      for (const t of terms) if (!skipped.includes(t)) practised.add(t);
      everSkipped.push(...skipped.map((t) => `${t} (${o.gameType})`));
    }
    // A term the grid cannot fit is fine as long as SOME game still drills it;
    // a term no game can reach is vocabulary the student never practises.
    const stranded = [...new Set(everSkipped.map((s) => s.replace(/ \(.*\)$/, '')))].filter((t) => !practised.has(t));
    if (stranded.length) flags.push(`no game can practise: ${stranded.join(', ')} (too long or too short for every game the pack offers)`);
  }
  // Settled 2026-09-05: every pack carries a wall reference. A teacher browsing the catalog
  // expects one, and a pack without it is the odd one out rather than a deliberate choice.
  if (!by('anchor-chart').length) flags.push('no anchor chart (every pack in the catalog has one)');
  // ── CITATION-SHAPED CLAIMS ───────────────────────────────────────────────
  // These packs are AI-authored and the catalog has no sourcing mechanism, so a sentence that
  // LOOKS like a citation is a liability: a reader cannot tell an invented statistic from a real
  // one, and neither can any gate. Found 2026-09-06 in the argument pack, of all places: a
  // concept-sort card read "A 2019 survey found 62 percent of families eat out" — plausible,
  // specific, and entirely made up, in a lesson about evaluating evidence.
  // This flags the SHAPE for a human to look at. Either attach a real source, or reword it as
  // something local and obviously illustrative ("our class survey found 19 of 28 ...").
  const citationShaped = [
    /\b(19|20)\d{2}\b[^.]{0,80}\b\d{1,3}\s*percent/i,
    /\b\d{1,3}\s*percent[^.]{0,80}\b(19|20)\d{2}\b/i,
    /\b(?:a|the)\s+(19|20)\d{2}\s+(?:survey|study|report|poll)/i,
  ];
  const walkStrings = (node, out) => {
    if (Array.isArray(node)) node.forEach((n) => walkStrings(n, out));
    else if (node && typeof node === 'object') Object.values(node).forEach((n) => walkStrings(n, out));
    else if (typeof node === 'string') out.push(node);
    return out;
  };
  for (const text of walkStrings(items, [])) {
    for (const sentence of String(text).split(/(?<=[.!?])\s+/)) {
      if (citationShaped.some((re) => re.test(sentence))) {
        flags.push(`citation-shaped claim needs a real source or rewording: "${sentence.trim().slice(0, 90)}"`);
      }
    }
  }

  if (faq && faq.data.length < 4) flags.push(`faq has ${faq.data.length} questions`);
  if (frames && frames.data.items.length < 4) flags.push(`sentence-frames has ${frames.data.items.length} frames`);
  if (!/[A-Z0-9.-]+\s*\(/.test(pack.allopack.standards || '')) flags.push('standards lack a parenthetical gloss');
  if (!pack.allopack.imageShotList) flags.push('no imageShotList companion');
  const types = items.map((r) => r.type);
  rows.push({ pack: f.replace('.allopack.json', ''), grade: pack.allopack.gradeLevel, fk: fk ? fk.grade : null, words: fk ? fk.words : 0, wps: fk ? fk.wordsPerSentence : 0, quizPos: posSpread, types: types.length, uniqueTypes: new Set(types).size, flags });
}

if (process.argv.includes('--json')) { console.log(JSON.stringify(rows, null, 2)); process.exit(0); }
console.log('pack'.padEnd(36), 'grade'.padEnd(14), 'FK'.padStart(5), 'words'.padStart(6), 'w/sent'.padStart(7), 'quizPos'.padStart(8), 'res', 'flags');
for (const r of rows) console.log(r.pack.padEnd(36), r.grade.padEnd(14), String(r.fk).padStart(5), String(r.words).padStart(6), String(r.wps).padStart(7), r.quizPos.padStart(8), String(r.types).padStart(3), r.flags.length);
console.log('');
for (const r of rows) if (r.flags.length) { console.log('## ' + r.pack); for (const fl of r.flags) console.log('   - ' + fl); }
