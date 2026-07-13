#!/usr/bin/env node
/**
 * assign_levels.js — honest reading levels for open-catalog items that have
 * REAL mirrored text (contentType: public-domain-full-text, science-article,
 * nonfiction-excerpt, primary-source-excerpt). The importers hardcode level
 * '6' (or '5'), so Aesop's Fables and Leviathan land on the same shelf; this
 * script computes a Flesch-Kincaid grade from the actual mirrored prose and
 * maps it onto the library's level bands:
 *
 *   FK grade ≤ 4.6  → level 4  (≈ Gr 3–5)
 *   FK grade ≤ 8.6  → level 5  (≈ Gr 6–8)
 *   otherwise       → level 6  (≈ Gr 9–12)
 *
 * Link-out stub cards (contentType *card*) are left alone on purpose: their
 * level describes the AUDIENCE of the linked work, and we have no text to
 * measure. (A future AI pass could estimate those; deterministic-only here.)
 *
 * Run AFTER import_gutenberg_full_texts.js (which resets level to '6'), then
 * rebuild the index:  node reading_library/mirror_books.js --fetch
 *
 * Usage:
 *   node reading_library/assign_levels.js            # write levels
 *   node reading_library/assign_levels.js --dry-run  # report only
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const BOOKS_DIR = path.join(ROOT, 'books');
const OPEN_CATALOG_PATH = path.join(ROOT, 'open_catalog.json');
const dryRun = process.argv.includes('--dry-run');

const MEASURABLE = new Set([
  'public-domain-full-text',
  'science-article',
  'nonfiction-excerpt',
  'primary-source-excerpt',
]);

// ---------------------------------------------------------- FK machinery
function countSyllables(word) {
  var w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  // Silent-e and common suffix adjustments, then vowel-group count.
  w = w.replace(/(?:[^laeiouy]e|ed|es)$/, '').replace(/^y/, '');
  var groups = w.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

function fkGrade(text) {
  // Sentences: ., !, ? runs; guard tiny denominators.
  var sentences = (text.match(/[.!?]+(?:\s|$)/g) || []).length || 1;
  var words = text.split(/\s+/).filter(function (t) { return /[a-zA-Z]/.test(t); });
  if (words.length < 100) return null; // too little text to measure honestly
  var syllables = 0;
  for (var i = 0; i < words.length; i++) syllables += countSyllables(words[i]);
  var grade = 0.39 * (words.length / sentences) + 11.8 * (syllables / words.length) - 15.59;
  return Math.round(grade * 10) / 10;
}

// Sample up to ~6000 words: skip the leading "Source note" page the full-text
// importer prepends, then take pages from the front and the middle so a hard
// preface or an easy opening chapter doesn't skew the whole book.
function sampleText(book) {
  var pages = (book.pages || []).filter(function (p) { return p && p.text; });
  if (pages.length > 1 && /^Source note:/.test(pages[0].text)) pages = pages.slice(1);
  if (!pages.length) return '';
  var texts = [];
  var budget = 6000;
  var take = function (page) {
    if (budget <= 0 || !page) return;
    var w = page.text.split(/\s+/).slice(0, budget);
    budget -= w.length;
    texts.push(w.join(' '));
  };
  var mid = Math.floor(pages.length / 2);
  for (var i = 0; i < Math.min(4, pages.length); i++) take(pages[i]);
  for (var j = mid; j < Math.min(mid + 4, pages.length); j++) { if (j >= 4) take(pages[j]); }
  return texts.join(' ');
}

function levelForGrade(grade) {
  if (grade <= 4.6) return '4';
  if (grade <= 8.6) return '5';
  return '6';
}

// ------------------------------------------------------------------ main
const catalog = JSON.parse(fs.readFileSync(OPEN_CATALOG_PATH, 'utf8'));
const rows = [];
let changed = 0;
let skipped = 0;

for (const item of catalog.items || []) {
  const file = path.join(ROOT, item.file);
  if (!fs.existsSync(file)) { skipped++; continue; }
  const book = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!MEASURABLE.has(book.contentType)) { skipped++; continue; }
  // Flesch-Kincaid is calibrated for English; don't apply it to other
  // languages (the syllable/word heuristics would be meaningless). Non-English
  // full texts keep the importer's default level.
  if (book.langCode && book.langCode !== 'en') { skipped++; continue; }
  const grade = fkGrade(sampleText(book));
  if (grade == null) { skipped++; continue; }
  const level = levelForGrade(grade);
  const before = String(book.level);
  if (before !== level || !book.readability || book.readability.grade !== grade) {
    book.level = level;
    book.readability = { method: 'flesch-kincaid-grade', grade: grade, note: 'computed from mirrored text by assign_levels.js' };
    if (!dryRun) fs.writeFileSync(file, JSON.stringify(book));
    if (before !== level) changed++;
  }
  rows.push({ slug: book.slug, grade: grade, level: before + (before !== level ? ' → ' + level : ' (kept)') });
}

rows.sort(function (a, b) { return a.grade - b.grade; });
for (const r of rows) console.log(String(r.grade).padStart(5), ' L' + r.level, ' ', r.slug);
console.log('\n' + (dryRun ? '[dry-run] ' : '') + rows.length + ' measurable items, ' + changed + ' level changes, ' + skipped + ' skipped (cards/missing/too short).');
if (!dryRun && changed) console.log('Now rebuild the index: node reading_library/mirror_books.js --fetch');
