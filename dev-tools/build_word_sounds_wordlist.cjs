#!/usr/bin/env node
'use strict';

// Builds word_sounds_wordlist_en.js: one compact row per word of the Word Sounds
// sound dictionary, for choosing practice words without AI (the packet maker).
// Row = word, frequency rank, sound shape, flags, child-book Zipf frequency, child-book count.
// It also carries the stage table (data/word_sounds_stages_en.json) so a page needs no fetch.
// Inputs are all in the repo; nothing downloads. --check compares without writing.
//
// --cyplex <main_cyplex79.csv> re-makes the vendored child-book file (data/vendor/cyplex/) from the
// original download: it checks the download's sha256 against source.json, keeps three of its
// columns for the words of the sound dictionary, and prints the new file's sha256 for source.json.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'word_sounds_wordlist_en.js');
const BLOCKLIST = path.join(ROOT, 'data/word_sounds_blocklist_en.txt');
const BRITISH = path.join(ROOT, 'data/word_sounds_british_en.txt');
const STAGES = path.join(ROOT, 'data/word_sounds_stages_en.json');
const COMMON = path.join(ROOT, 'data/syllables/en_common_words.txt');
const CYPLEX_SOURCE = path.join(ROOT, 'data/vendor/cyplex/source.json');
const CYPLEX_DATA = path.join(ROOT, 'data/vendor/cyplex/cyplex79_dictionary_words.tsv');
const FLAGS = { recorded: 1, kokoro: 2, blocked: 4, nearBlocked: 8, known: 16, dropBlocked: 32, british: 64 };
const compare = (left, right) => left < right ? -1 : left > right ? 1 : 0;
const clean = word => String(word || '').normalize('NFC').trim().toLowerCase();
const json = file => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/^﻿/, ''));
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

// Sections are "## name" lines; a section marked [derive] also blocks words that sound the same as
// one of its words (nearBlocked) and flags words that become one when the first or last sound is
// dropped (dropBlocked: for sound-deletion activities; not a block).
function readSections(file, label) {
  const sections = [];
  let current = null;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    const head = /^##\s*(.+?)\s*(\[derive\])?\s*$/.exec(line);
    if (head) { current = { name: head[1], derive: !!head[2], words: [] }; sections.push(current); continue; }
    if (!line || line[0] === '#') continue;
    if (!current) throw new Error(label + ' word before the first section: ' + line);
    for (const piece of line.split(/[\s,]+/)) {
      const word = clean(piece);
      if (!word) continue;
      if (!/^[a-z][a-z']*$/.test(word)) throw new Error(label + ' entry is not a plain word: ' + piece);
      current.words.push(word);
    }
  }
  return sections;
}
function readBlocklist() { return readSections(BLOCKLIST, 'Blocklist'); }
// Spellings and words a US teacher would not expect (colour, mum): the picker leaves them out by default.
function readBritish() { return readSections(BRITISH, 'British list'); }

// The words of the sound dictionary, in its own order.
function dictionaryWords() {
  const phonemes = require(path.join(ROOT, 'word_sounds_phonemes_en.js'));
  const source = fs.readFileSync(path.join(ROOT, 'word_sounds_phonemes_en.js'), 'utf8');
  const text = /var text = ("(?:[^"\\]|\\.)*");/.exec(source);
  if (!text) throw new Error('Could not read the word list of the sound dictionary');
  const words = JSON.parse(text[1]).split(' ').map(entry => entry.slice(0, entry.indexOf(':')));
  if (words.length !== phonemes.wordCount) throw new Error('Sound dictionary word count differs: ' + words.length + ' vs ' + phonemes.wordCount);
  return { phonemes, words };
}

// Child-book familiarity: CYP-LEX ages 7-9 (see data/vendor/cyplex/source.json). word -> { zipf, books }.
// The file must be the one source.json describes, byte for byte.
function readFamiliarity() {
  const source = JSON.parse(fs.readFileSync(CYPLEX_SOURCE, 'utf8'));
  const bytes = fs.readFileSync(CYPLEX_DATA);
  const digest = sha256(bytes);
  if (digest !== source.filtered.sha256) throw new Error('data/vendor/cyplex/' + path.basename(CYPLEX_DATA) + ' is not the file source.json describes (sha256 ' + digest + ')');
  const map = new Map();
  for (const line of bytes.toString('utf8').split('\n')) {
    if (!line || line[0] === '#') continue;
    const parts = line.split('\t');
    const zipf = Number(parts[1]), books = Number(parts[2]);
    if (parts.length !== 3 || !/^[a-z][a-z']*$/.test(parts[0]) || !(zipf > 0) || !(books >= 0)) throw new Error('Bad child-book row: ' + line);
    map.set(parts[0], { zipf: Math.round(zipf * 100), books });
  }
  return { map, source };
}

// Re-makes the vendored file from the original CYP-LEX download (a comma-separated file with no quoting).
function importCyplex(csvPath) {
  const source = JSON.parse(fs.readFileSync(CYPLEX_SOURCE, 'utf8'));
  const bytes = fs.readFileSync(csvPath);
  const digest = sha256(bytes);
  if (digest !== source.sha256) throw new Error('This is not the file source.json names (' + source.file + '): sha256 ' + digest);
  const lines = bytes.toString('utf8').replace(/^﻿/, '').split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(',');
  const at = name => { const i = header.indexOf(name); if (i < 0) throw new Error('Missing column: ' + name); return i; };
  const iWord = at('Word'), iZipf = at('Zipf_freq'), iBooks = at('CD_book_count_raw');
  const wanted = new Set(dictionaryWords().words);
  const rows = [];
  for (const line of lines.slice(1)) {
    if (line.includes('"')) throw new Error('Quoted field: this reader expects none');
    const parts = line.split(',');
    if (parts.length !== header.length) throw new Error('Column count differs: ' + line.slice(0, 60));
    const word = parts[iWord];
    if (!wanted.has(word) || !/^[a-z][a-z']*$/.test(word)) continue;
    rows.push(word + '\t' + Number(parts[iZipf]).toFixed(2) + '\t' + Number(parts[iBooks]));
  }
  rows.sort(compare);
  const output = source.filtered.header.map(line => '# ' + line).join('\n') + '\n' + rows.join('\n') + '\n';
  const temporary = CYPLEX_DATA + '.build-' + process.pid + '.tmp';
  fs.writeFileSync(temporary, output);
  if (fs.readFileSync(temporary, 'utf8') !== output) { fs.unlinkSync(temporary); throw new Error('Short write: ' + path.relative(ROOT, CYPLEX_DATA)); }
  fs.renameSync(temporary, CYPLEX_DATA);
  console.log('Wrote ' + path.relative(ROOT, CYPLEX_DATA) + ': ' + rows.length + ' words of ' + (lines.length - 1) + ', ' + Buffer.byteLength(output) + ' bytes, sha256 ' + sha256(Buffer.from(output)));
  console.log('Put words, bytes and sha256 in "filtered" of data/vendor/cyplex/source.json, then run this tool with no arguments.');
}

// The stage table is data: checked here so a broken edit fails the build, not the page.
function readStages() {
  const table = JSON.parse(fs.readFileSync(STAGES, 'utf8'));
  const ids = new Set();
  if (!Array.isArray(table.frameworks) || !table.frameworks.length) throw new Error('Stage table: no frameworks');
  for (const framework of table.frameworks) {
    if (!framework.id || !Array.isArray(framework.stages) || !framework.stages.length) throw new Error('Stage table: a framework needs an id and stages');
    for (const stage of framework.stages) {
      const key = String(stage.id || '').toLowerCase();
      if (!key || ids.has(key)) throw new Error('Stage table: missing or repeated stage id: ' + stage.id);
      ids.add(key);
      if (!stage.limits || !Array.isArray(stage.groups)) throw new Error('Stage table: ' + stage.id + ' needs limits and groups');
      for (const group of [...stage.groups, stage.limits]) {
        if (group.basis !== 'standard' && group.basis !== 'common practice') throw new Error('Stage table: ' + stage.id + ': basis must be "standard" or "common practice"');
        if (group.basis === 'standard' && !(group.sources && group.sources.length)) throw new Error('Stage table: ' + stage.id + ': a "standard" entry needs a source');
        for (const source of group.sources || []) if (!table.documents[source.document] || !source.code || !source.url) throw new Error('Stage table: ' + stage.id + ': a source needs a known document, a code and a url');
      }
      for (const group of stage.groups) for (const unit of String(group.units || '').split(' ')) if (unit && unit !== '*' && !/^[a-z]+>[a-z_+]+(\/[a-z_]+)?$/.test(unit)) throw new Error('Stage table: ' + stage.id + ': not a unit: ' + unit);
    }
  }
  return table;
}

function build() {
  const { phonemes, words } = dictionaryWords();
  const lists = require('./build_word_sounds_phonemes.cjs').appWordLists(
    new Function(fs.readFileSync(path.join(ROOT, 'word_sounds_core.js'), 'utf8') + ';return createWordSoundsCore();')());
  // The first 22 labels are the vowel sounds (r-controlled vowels and schwa included).
  const vowels = new Set(phonemes.labels.slice(0, 22));
  const rank = new Map();
  fs.readFileSync(COMMON, 'utf8').split(/\r?\n/).forEach((line, index) => { const word = clean(line); if (word && !rank.has(word)) rank.set(word, index + 1); });
  const recorded = new Set(Object.keys(json('audio_bank/words.json')).map(clean));
  const kokoro = new Set(Object.keys(json('word_audio_kokoro_bank.json').words).map(clean));
  const known = new Set([...lists.soundMatchPool, ...lists.rimeFamilies, ...lists.sightWords, ...lists.wordFamilies, ...lists.coreWords].map(clean));
  const sections = readBlocklist();
  const blocked = new Set(sections.flatMap(section => section.words));
  const british = new Set(readBritish().flatMap(section => section.words));
  const familiarity = readFamiliarity();
  const stages = readStages();
  const sounds = word => phonemes.lookup(word)[0] || [];
  const derive = new Set();
  for (const section of sections) if (section.derive) for (const word of section.words) { const s = sounds(word); if (s.length) derive.add(s.join(' ')); }
  const shapes = [], shapeIndex = new Map();
  const rows = [];
  const counts = { blocked: 0, nearBlocked: 0, dropBlocked: 0, recorded: 0, kokoro: 0, known: 0, ranked: 0, british: 0, childBook: 0 };
  const nearExamples = [], dropExamples = [];
  for (const word of words.slice().sort(compare)) {
    const s = sounds(word);
    const shape = s.map(label => vowels.has(label) ? 'V' : 'C').join('');
    if (!shapeIndex.has(shape)) { shapeIndex.set(shape, shapes.length); shapes.push(shape); }
    let flags = 0;
    if (recorded.has(word)) { flags |= FLAGS.recorded; counts.recorded++; }
    if (kokoro.has(word)) { flags |= FLAGS.kokoro; counts.kokoro++; }
    if (known.has(word)) { flags |= FLAGS.known; counts.known++; }
    if (british.has(word)) { flags |= FLAGS.british; counts.british++; }
    if (blocked.has(word)) { flags |= FLAGS.blocked; counts.blocked++; }
    else if (derive.has(s.join(' '))) { flags |= FLAGS.nearBlocked; counts.nearBlocked++; nearExamples.push(word); }
    else if (s.length > 2 && (derive.has(s.slice(1).join(' ')) || derive.has(s.slice(0, -1).join(' ')))) {
      flags |= FLAGS.dropBlocked; counts.dropBlocked++;
      if (rank.has(word) && rank.get(word) <= 10000) dropExamples.push(word);
    }
    const r = rank.get(word) || 0;
    if (r) counts.ranked++;
    const child = familiarity.map.get(word);
    if (child) counts.childBook++;
    rows.push(word + ',' + r.toString(36) + ',' + shapeIndex.get(shape).toString(36) + ',' + flags.toString(36) + (child ? ',' + child.zipf.toString(36) + ',' + child.books.toString(36) : ''));
  }
  const inDictionary = new Set(words);
  const extraBlocked = [...blocked].filter(word => !inDictionary.has(word)).sort(compare);
  return { rows, shapes, extraBlocked, counts, sections, nearExamples, dropExamples, total: words.length, blockedTotal: blocked.size, britishTotal: british.size,
    dictionary: phonemes.source, familiarity: familiarity.source, stages };
}

function render(built) {
  const child = built.familiarity;
  const header = { version: 2, language: 'en', words: built.total, blocklistEntries: built.blockedTotal,
    dictionary: { id: built.dictionary.id, commit: built.dictionary.commit, sha256: built.dictionary.sha256 },
    childBooks: { id: child.id, name: child.name, band: child.band, citation: child.citation, doi: child.doi, license: child.license, licenseUrl: child.licenseUrl,
      sha256: child.filtered.sha256, changes: child.filtered.changes },
    note: 'rank = place in the reading-library frequency list (0 = not in it). zipf = Zipf frequency in CYP-LEX books for ages 7-9 (0 = not in it); books = how many of its 400 books hold the word. The blocklist is a first pass that needs human review.' };
  return `// Generated by dev-tools/build_word_sounds_wordlist.cjs. Do not edit.
// Words of the Word Sounds sound dictionary with what a word picker needs: frequency rank,
// sound shape, whether a recording exists, whether the word is on the blocklist
// (data/word_sounds_blocklist_en.txt: a first pass that needs human review), and how common
// the word is in children's books (CYP-LEX ages 7-9, CC BY 4.0: data/vendor/cyplex/source.json).
// It also carries the stage table of data/word_sounds_stages_en.json.
var createWordSoundsWordlist = (function () {
  'use strict';
  var cached;
  return function createWordSoundsWordlist() {
    if (cached) return cached;
    var meta = Object.freeze(${JSON.stringify(header)});
    var FLAGS = Object.freeze(${JSON.stringify(FLAGS)});
    var shapes = Object.freeze(${JSON.stringify(built.shapes)});
    var stages = ${JSON.stringify(built.stages)};
    // "word,rank,shape,flags[,zipf,books]" entries, all numbers base 36; zipf is times 100.
    var text = ${JSON.stringify(built.rows.join(' '))};
    var extraBlocked = Object.freeze(${JSON.stringify(built.extraBlocked)});
    var list = null, index = null;
    function rows() {
      if (list) return list;
      index = new Map();
      list = text.split(' ').map(function (entry) {
        var p = entry.split(','), flags = parseInt(p[3], 36), shape = shapes[parseInt(p[2], 36)];
        var row = Object.freeze({ word: p[0], rank: parseInt(p[1], 36), shape: shape, sounds: shape.length, syllables: shape.split('V').length - 1,
          zipf: p[4] ? parseInt(p[4], 36) / 100 : 0, books: p[5] ? parseInt(p[5], 36) : 0,
          recorded: !!(flags & FLAGS.recorded), kokoro: !!(flags & FLAGS.kokoro), hasClip: !!(flags & (FLAGS.recorded | FLAGS.kokoro)),
          blocked: !!(flags & FLAGS.blocked), nearBlocked: !!(flags & FLAGS.nearBlocked), dropBlocked: !!(flags & FLAGS.dropBlocked), known: !!(flags & FLAGS.known),
          british: !!(flags & FLAGS.british) });
        index.set(row.word, row);
        return row;
      });
      extraBlocked.forEach(function (word) { index.set(word, Object.freeze({ word: word, rank: 0, shape: '', sounds: 0, syllables: 0, zipf: 0, books: 0, recorded: false, kokoro: false, hasClip: false, blocked: true, nearBlocked: false, dropBlocked: false, known: false, british: false, notInDictionary: true })); });
      text = '';
      return list;
    }
    function get(value) {
      rows();
      return index.get(String(value == null ? '' : value).normalize('NFC').trim().toLowerCase()) || null;
    }
    function isBlocked(value) { var row = get(value); return !!row && row.blocked; }
    cached = Object.freeze({ version: 2, meta: meta, FLAGS: FLAGS, shapes: shapes, stages: stages, rows: rows, get: get, isBlocked: isBlocked });
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
  const cyplex = args.indexOf('--cyplex');
  if (cyplex >= 0) {
    if (args.length !== 2 || cyplex !== 0) throw new Error('Use: --cyplex <path to main_cyplex79.csv>');
    importCyplex(args[1]);
    return;
  }
  for (const arg of args) if (arg !== '--check') throw new Error(`Unknown argument: ${arg}`);
  const built = build();
  const output = render(built);
  const c = built.counts;
  const size = `${built.total} words (${c.ranked} with a frequency rank, ${c.childBook} in the child-book list, ${c.known} on the app lists); clips: ${c.recorded} recorded, ${c.kokoro} Kokoro bank; ` +
    `blocklist ${built.blockedTotal} entries in ${built.sections.length} sections (${c.blocked} in the dictionary, ${built.extraBlocked.length} outside it), ${c.nearBlocked} more blocked as sound-alikes, ${c.dropBlocked} flagged as one dropped sound away; ` +
    `British list ${built.britishTotal} entries (${c.british} in the dictionary); ${built.stages.frameworks.map(f => f.stages.length + ' stages ' + f.id).join(', ')}; ` +
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

module.exports = { OUTPUT, BLOCKLIST, BRITISH, STAGES, CYPLEX_SOURCE, CYPLEX_DATA, FLAGS, readBlocklist, readBritish, readStages, readFamiliarity, build, render };
if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
