#!/usr/bin/env node
'use strict';

// Builds word_sounds_wordlist_en.js: one compact row per word of the Word Sounds
// sound dictionary, for choosing practice words without AI (the packet maker).
// Row = word, frequency rank, sound shape, clip flags, blocked flags.
// Inputs are all in the repo; nothing downloads. --check compares without writing.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'word_sounds_wordlist_en.js');
const BLOCKLIST = path.join(ROOT, 'data/word_sounds_blocklist_en.txt');
const COMMON = path.join(ROOT, 'data/syllables/en_common_words.txt');
const FLAGS = { recorded: 1, kokoro: 2, blocked: 4, nearBlocked: 8, known: 16, dropBlocked: 32 };
const compare = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const clean = word => String(word || '').normalize('NFC').trim().toLowerCase();
const json = file => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/^﻿/, ''));

// Sections are "## name" lines; a section marked [derive] also blocks words that sound the same as
// one of its words (nearBlocked) and flags words that become one when the first or last sound is
// dropped (dropBlocked: for sound-deletion activities; not a block).
function readBlocklist() {
  const sections = [];
  let current = null;
  for (const raw of fs.readFileSync(BLOCKLIST, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    const head = /^##\s*(.+?)\s*(\[derive\])?\s*$/.exec(line);
    if (head) { current = { name: head[1], derive: !!head[2], words: [] }; sections.push(current); continue; }
    if (!line || line[0] === '#') continue;
    if (!current) throw new Error('Blocklist word before the first section: ' + line);
    for (const piece of line.split(/[\s,]+/)) {
      const word = clean(piece);
      if (!word) continue;
      if (!/^[a-z][a-z']*$/.test(word)) throw new Error('Blocklist entry is not a plain word: ' + piece);
      current.words.push(word);
    }
  }
  return sections;
}

function build() {
  const phonemes = require(path.join(ROOT, 'word_sounds_phonemes_en.js'));
  const lists = require('./build_word_sounds_phonemes.cjs').appWordLists(
    new Function(fs.readFileSync(path.join(ROOT, 'word_sounds_core.js'), 'utf8') + ';return createWordSoundsCore();')());
  const source = fs.readFileSync(path.join(ROOT, 'word_sounds_phonemes_en.js'), 'utf8');
  const text = /var text = ("(?:[^"\\]|\\.)*");/.exec(source);
  if (!text) throw new Error('Could not read the word list of the sound dictionary');
  const words = JSON.parse(text[1]).split(' ').map(entry => entry.slice(0, entry.indexOf(':')));
  if (words.length !== phonemes.wordCount) throw new Error('Sound dictionary word count differs: ' + words.length + ' vs ' + phonemes.wordCount);
  // The first 22 labels are the vowel sounds (r-controlled vowels and schwa included).
  const vowels = new Set(phonemes.labels.slice(0, 22));
  const rank = new Map();
  fs.readFileSync(COMMON, 'utf8').split(/\r?\n/).forEach((line, index) => { const word = clean(line); if (word && !rank.has(word)) rank.set(word, index + 1); });
  const recorded = new Set(Object.keys(json('audio_bank/words.json')).map(clean));
  const kokoro = new Set(Object.keys(json('word_audio_kokoro_bank.json').words).map(clean));
  const known = new Set([...lists.soundMatchPool, ...lists.rimeFamilies, ...lists.sightWords, ...lists.wordFamilies, ...lists.coreWords].map(clean));
  const sections = readBlocklist();
  const blocked = new Set(sections.flatMap(section => section.words));
  const sounds = word => phonemes.lookup(word)[0] || [];
  const derive = new Set();
  for (const section of sections) if (section.derive) for (const word of section.words) { const s = sounds(word); if (s.length) derive.add(s.join(' ')); }
  const shapes = [], shapeIndex = new Map();
  const rows = [];
  const counts = { blocked: 0, nearBlocked: 0, dropBlocked: 0, recorded: 0, kokoro: 0, known: 0, ranked: 0 };
  const nearExamples = [], dropExamples = [];
  for (const word of words.slice().sort(compare)) {
    const s = sounds(word);
    const shape = s.map(label => vowels.has(label) ? 'V' : 'C').join('');
    if (!shapeIndex.has(shape)) { shapeIndex.set(shape, shapes.length); shapes.push(shape); }
    let flags = 0;
    if (recorded.has(word)) { flags |= FLAGS.recorded; counts.recorded++; }
    if (kokoro.has(word)) { flags |= FLAGS.kokoro; counts.kokoro++; }
    if (known.has(word)) { flags |= FLAGS.known; counts.known++; }
    if (blocked.has(word)) { flags |= FLAGS.blocked; counts.blocked++; }
    else if (derive.has(s.join(' '))) { flags |= FLAGS.nearBlocked; counts.nearBlocked++; nearExamples.push(word); }
    else if (s.length > 2 && (derive.has(s.slice(1).join(' ')) || derive.has(s.slice(0, -1).join(' ')))) {
      flags |= FLAGS.dropBlocked; counts.dropBlocked++;
      if (rank.has(word) && rank.get(word) <= 10000) dropExamples.push(word);
    }
    const r = rank.get(word) || 0;
    if (r) counts.ranked++;
    rows.push(word + ',' + r.toString(36) + ',' + shapeIndex.get(shape).toString(36) + ',' + flags.toString(36));
  }
  const inDictionary = new Set(words);
  const extraBlocked = [...blocked].filter(word => !inDictionary.has(word)).sort(compare);
  return { rows, shapes, extraBlocked, counts, sections, nearExamples, dropExamples, total: words.length, blockedTotal: blocked.size, dictionary: phonemes.source };
}

function render(built) {
  const header = { version: 1, language: 'en', words: built.total, blocklistEntries: built.blockedTotal,
    dictionary: { id: built.dictionary.id, commit: built.dictionary.commit, sha256: built.dictionary.sha256 },
    note: 'rank = place in the reading-library frequency list (0 = not in it). The blocklist is a first pass that needs human review.' };
  return `// Generated by dev-tools/build_word_sounds_wordlist.cjs. Do not edit.
// Words of the Word Sounds sound dictionary with what a word picker needs: frequency rank,
// sound shape, whether a recording exists, and whether the word is on the blocklist
// (data/word_sounds_blocklist_en.txt: a first pass that needs human review).
var createWordSoundsWordlist = (function () {
  'use strict';
  var cached;
  return function createWordSoundsWordlist() {
    if (cached) return cached;
    var meta = Object.freeze(${JSON.stringify(header)});
    var FLAGS = Object.freeze(${JSON.stringify(FLAGS)});
    var shapes = Object.freeze(${JSON.stringify(built.shapes)});
    // "word,rank,shape,flags" entries; rank, shape index and flags are base 36.
    var text = ${JSON.stringify(built.rows.join(' '))};
    var extraBlocked = Object.freeze(${JSON.stringify(built.extraBlocked)});
    var list = null, index = null;
    function rows() {
      if (list) return list;
      index = new Map();
      list = text.split(' ').map(function (entry) {
        var p = entry.split(','), flags = parseInt(p[3], 36), shape = shapes[parseInt(p[2], 36)];
        var row = Object.freeze({ word: p[0], rank: parseInt(p[1], 36), shape: shape, sounds: shape.length,
          recorded: !!(flags & FLAGS.recorded), kokoro: !!(flags & FLAGS.kokoro), hasClip: !!(flags & (FLAGS.recorded | FLAGS.kokoro)),
          blocked: !!(flags & FLAGS.blocked), nearBlocked: !!(flags & FLAGS.nearBlocked), dropBlocked: !!(flags & FLAGS.dropBlocked), known: !!(flags & FLAGS.known) });
        index.set(row.word, row);
        return row;
      });
      extraBlocked.forEach(function (word) { index.set(word, Object.freeze({ word: word, rank: 0, shape: '', sounds: 0, recorded: false, kokoro: false, hasClip: false, blocked: true, nearBlocked: false, dropBlocked: false, known: false, notInDictionary: true })); });
      text = '';
      return list;
    }
    function get(value) {
      rows();
      return index.get(String(value == null ? '' : value).normalize('NFC').trim().toLowerCase()) || null;
    }
    function isBlocked(value) { var row = get(value); return !!row && row.blocked; }
    cached = Object.freeze({ version: 1, meta: meta, FLAGS: FLAGS, shapes: shapes, rows: rows, get: get, isBlocked: isBlocked });
    return cached;
  };
})();
(function (root) {
  var api = createWordSoundsWordlist();
  if (root) {
    root.AlloModules = root.AlloModules || {};
    root.AlloModules.WordSoundsWordlist = api;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
`;
}

function main(args) {
  for (const arg of args) if (arg !== '--check') throw new Error(`Unknown argument: ${arg}`);
  const built = build();
  const output = render(built);
  const c = built.counts;
  const size = `${built.total} words (${c.ranked} with a frequency rank, ${c.known} on the app lists); clips: ${c.recorded} recorded, ${c.kokoro} Kokoro bank; ` +
    `blocklist ${built.blockedTotal} entries in ${built.sections.length} sections (${c.blocked} in the dictionary, ${built.extraBlocked.length} outside it), ${c.nearBlocked} more blocked as sound-alikes, ${c.dropBlocked} flagged as one dropped sound away; ` +
    `${Buffer.byteLength(output)} bytes (${zlib.gzipSync(output, { level: 9 }).length} gzip)`;
  if (args.includes('--check')) {
    if (!fs.existsSync(OUTPUT) || fs.readFileSync(OUTPUT, 'utf8') !== output) throw new Error('Stale word list: ' + path.relative(ROOT, OUTPUT) + ' (run node dev-tools/build_word_sounds_wordlist.cjs)');
    console.log('Verified word list: ' + size + '.');
    return;
  }
  if (!fs.existsSync(OUTPUT) || fs.readFileSync(OUTPUT, 'utf8') !== output) {
    const temporary = OUTPUT + '.wordlist-build-' + process.pid + '.tmp';
    fs.writeFileSync(temporary, output);
    // A full disk truncates in-place writes: check the bytes before replacing the file.
    if (fs.readFileSync(temporary, 'utf8') !== output) { fs.unlinkSync(temporary); throw new Error('Short write: ' + path.relative(ROOT, OUTPUT)); }
    fs.renameSync(temporary, OUTPUT);
  }
  console.log('Built word list: ' + size + '.');
  if (built.nearExamples.length) console.log('Blocked as sound-alikes: ' + built.nearExamples.join(' '));
  if (built.dropExamples.length) console.log('Flagged, one dropped sound away (10,000 most frequent): ' + built.dropExamples.join(' '));
}

module.exports = { OUTPUT, BLOCKLIST, FLAGS, readBlocklist, build, render };
if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
