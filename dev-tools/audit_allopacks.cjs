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
  if (fk && (fk.words < 300 || fk.words > 600)) flags.push(`reading ${fk.words} words (target 350-550)`);

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
