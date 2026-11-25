#!/usr/bin/env node
'use strict';

// Builds syllable_stress_en.js: which syllable of a word carries the main stress, for the
// words syllable_table_en.js divides with confidence. It lets the glossary bold a·NAL·y·sis
// without downloading word_sounds_pronunciations.js (126k words) only for stress.
//
// Rules, per multi-syllable "sure" word of the syllable table:
// - CMUdict must give every pronunciation exactly one primary stress (1), all on the same
//   syllable index. Words whose stress moves with meaning (REC-ord / re-CORD) are left out.
// - At least one CMUdict pronunciation must have as many syllables as the table's split, and
//   the stressed index must fall inside the split.
// Words that fail either rule are stored as "no stress", so they show syllables only.
//
// Format: the table's word order is private to its closure, so the add-on cannot align a digit
// string with it. Instead each word's answer is kept in a small static function (three hashed
// cells XORed together, 2 bits per cell, cascaded for the rare stress on the 3rd+ syllable).
// It is only asked about words the table itself reports as sure, and it switches itself off
// when the loaded table's counts or probe words differ from the table it was built against.
// Flags: --check compares without writing.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const vm = require('node:vm');
const { SOURCE_HASHES } = require('./build_word_sounds_pronunciations.cjs');

const ROOT = path.resolve(__dirname, '..');
const CMU = path.join(ROOT, 'data/vendor/cmudict/cmudict.dict');
const CMU_LICENSE = path.join(ROOT, 'data/vendor/cmudict/LICENSE');
const TABLE = path.join(ROOT, 'syllable_table_en.js');
const OUTPUTS = [
  path.join(ROOT, 'syllable_stress_en.js'),
  path.join(ROOT, 'desktop/web-app/public/syllable_stress_en.js'),
];
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const PROBES = 24;
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

// Shared with the generated file (embedded through toString), so build and lookup agree.
function cellsOf(word, seed, size) {
  var h = (2166136261 ^ seed) >>> 0;
  for (var i = 0; i < word.length; i++) h = Math.imul(h ^ word.charCodeAt(i), 16777619) >>> 0;
  function mix(x) {
    x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
    x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
    return (x ^ (x >>> 16)) >>> 0;
  }
  var a = mix(h ^ 0x9e3779b9), b = mix((a + 0x7f4a7c15) >>> 0), c = mix((b + 0x7f4a7c15) >>> 0);
  return [a % size, size + (b % size), 2 * size + (c % size)];
}

function readPinned(file, name) {
  const bytes = fs.readFileSync(file);
  if (sha256(bytes) !== SOURCE_HASHES[name]) throw new Error('Pinned CMUdict source differs: ' + name);
  return bytes.toString('utf8');
}

function readCmuStress() {
  const cmu = new Map();
  for (const line of readPinned(CMU, 'cmudict.dict').split(/\r?\n/)) {
    const text = line.split('#')[0].trim();
    if (!text) continue;
    const pieces = text.split(/\s+/);
    const word = pieces.shift().replace(/\(\d+\)$/, '');
    if (!/^[a-z]+$/.test(word)) continue;
    if (!cmu.has(word)) cmu.set(word, []);
    cmu.get(word).push(pieces.filter(phone => /\d$/.test(phone)).map(phone => phone.slice(-1)).join(''));
  }
  return cmu;
}

function readTable(tableSource) {
  const match = tableSource.match(/\n {2}var sureText = ("(?:[^"\\]|\\.)*");\n/);
  if (!match) throw new Error('syllable_table_en.js: sureText not found');
  const sandbox = { module: { exports: {} } };
  vm.runInNewContext(tableSource, sandbox);
  const api = sandbox.module.exports;
  return { sure: JSON.parse(match[1]).split(' ').filter(Boolean).map(entry => entry.split('|')), counts: api.source.counts, api };
}

// Stress index for one word, or -1 with the reason it was left out.
function stressFor(parts, patterns) {
  if (!patterns || !patterns.length) return { index: -1, reason: 'no-pronunciation' };
  const indexes = new Set();
  for (const pattern of patterns) {
    if (pattern.split('1').length !== 2) return { index: -1, reason: 'not-one-primary' };
    indexes.add(pattern.indexOf('1'));
  }
  if (indexes.size !== 1) return { index: -1, reason: 'stress-moves' };
  if (!patterns.some(pattern => pattern.length === parts.length)) return { index: -1, reason: 'count-mismatch' };
  const index = [...indexes][0];
  return index < parts.length ? { index, reason: 'covered' } : { index: -1, reason: 'count-mismatch' };
}

// One 2-bit static function over the given words (values 0..3); deterministic seed search.
function buildLevel(words, values) {
  const n = words.length;
  for (let grow = 0; grow < 8; grow++) {
    const size = Math.ceil((Math.floor(n * (1.23 + grow * 0.05)) + 32) / 3);
    for (let seed = 1; seed <= 64; seed++) {
      const cells = words.map(word => cellsOf(word, seed, size));
      const count = new Int32Array(size * 3), xor = new Int32Array(size * 3);
      cells.forEach((c, k) => c.forEach(at => { count[at]++; xor[at] ^= k; }));
      const queue = [], order = [];
      for (let at = 0; at < size * 3; at++) if (count[at] === 1) queue.push(at);
      while (queue.length) {
        const at = queue.pop();
        if (count[at] !== 1) continue;
        const k = xor[at];
        order.push([k, at]);
        cells[k].forEach(other => { count[other]--; xor[other] ^= k; if (count[other] === 1) queue.push(other); });
      }
      if (order.length !== n) continue;
      const table = new Uint8Array(size * 3);
      for (let i = order.length - 1; i >= 0; i--) {
        const [k, at] = order[i];
        const c = cells[k];
        table[at] = values[k] ^ table[c[0]] ^ table[c[1]] ^ table[c[2]] ^ table[at];
      }
      let text = '';
      for (let at = 0; at < table.length; at += 3) text += ALPHABET[(table[at] | 0) + 4 * (table[at + 1] | 0) + 16 * (table[at + 2] | 0)];
      return { seed, size, text };
    }
  }
  throw new Error('Could not build a stress level for ' + n + ' words');
}

function buildArtifacts() {
  const tableSource = fs.readFileSync(TABLE, 'utf8');
  const table = readTable(tableSource);
  const cmu = readCmuStress();
  const reasons = { covered: 0, 'no-pronunciation': 0, 'not-one-primary': 0, 'stress-moves': 0, 'count-mismatch': 0 };
  const byIndex = {};
  const words = [], codes = [];
  for (const parts of table.sure) {
    if (parts.length < 2) continue;
    const word = parts.join('');
    const { index, reason } = stressFor(parts, cmu.get(word));
    reasons[reason]++;
    if (index >= 0) byIndex[index] = (byIndex[index] || 0) + 1;
    words.push(word);
    codes.push(index + 1);
  }
  const levels = [];
  let keys = words.map((word, k) => k);
  for (let depth = 0; keys.length; depth++) {
    const levelWords = keys.map(k => words[k]);
    const values = keys.map(k => Math.min(codes[k] - 3 * depth, 3));
    levels.push(buildLevel(levelWords, values));
    keys = keys.filter(k => codes[k] - 3 * depth >= 3);
  }
  const step = Math.max(1, Math.floor(table.sure.length / PROBES));
  const probes = [];
  for (let k = 0; k < table.sure.length && probes.length < PROBES; k += step) probes.push(table.sure[k].join('|'));
  const source = {
    cmudict: 'CMUdict, Carnegie Mellon University',
    rule: 'Main stress only when every CMUdict pronunciation has one primary stress on the same syllable and a pronunciation has as many syllables as the table split.',
    covered: reasons.covered,
    table: { file: 'syllable_table_en.js', sha256: sha256(tableSource).slice(0, 8), counts: table.counts, words: words.length },
  };
  const license = readPinned(CMU_LICENSE, 'LICENSE').replace(/\r\n/g, '\n').trim().replace(/\*\//g, '* /');
  const moduleSource = renderModule({ source, levels, probes, license });
  return { moduleSource, reasons, byIndex, words, codes, table, levels };
}

function renderModule({ source, levels, probes, license }) {
  return `// Generated by dev-tools/build_syllable_stress_en.cjs. Do not edit.
// Main-stress syllable for words syllable_table_en.js divides; works only beside that table.
/*!
${license}
*/
(function (root) {
  'use strict';
  var source = ${JSON.stringify(source)};
  var levels = ${JSON.stringify(levels.map(level => [level.seed, level.size, level.text]))};
  var probes = ${JSON.stringify(probes.join(' '))}.split(' ');
  var alphabet = ${JSON.stringify(ALPHABET)};
  var digits = null, checked = null, checkedOk = false;
  ${cellsOf.toString().replace(/\n/g, '\n  ')}
  function cell(text, at) { return (digits[text.charCodeAt((at / 3) | 0)] >> (2 * (at % 3))) & 3; }
  function tableOk(table) {
    if (table === checked) return checkedOk;
    checked = table; checkedOk = false;
    try {
      var counts = table.source && table.source.counts, want = source.table.counts;
      if (!counts || Object.keys(want).some(function (key) { return counts[key] !== want[key]; })) return false;
      checkedOk = probes.every(function (entry) {
        var found = table.lookup(entry.split('|').join(''));
        return !!found && !found.check && found.parts.join('|') === entry;
      });
    } catch (_) { checkedOk = false; }
    return checkedOk;
  }
  function stressIndex(word, tableOverride) {
    if (typeof word !== 'string') return -1;
    var w = word.trim().toLowerCase();
    if (!/^[a-z]{2,}$/.test(w)) return -1;
    var table = tableOverride || (root && root.AlloModules && root.AlloModules.SyllableTableEn);
    if (!table || typeof table.lookup !== 'function' || !tableOk(table)) return -1;
    var found = table.lookup(w);
    if (!found || found.check || !found.parts || found.parts.length < 2) return -1;
    if (!digits) { digits = {}; for (var d = 0; d < alphabet.length; d++) digits[alphabet.charCodeAt(d)] = d; }
    var code = 0;
    for (var depth = 0; depth < levels.length; depth++) {
      var level = levels[depth], at = cellsOf(w, level[0], level[1]);
      var value = cell(level[2], at[0]) ^ cell(level[2], at[1]) ^ cell(level[2], at[2]);
      code += value;
      if (value < 3) break;
    }
    var index = code - 1;
    return index >= 0 && index < found.parts.length ? index : -1;
  }
  function usable(tableOverride) {
    var table = tableOverride || (root && root.AlloModules && root.AlloModules.SyllableTableEn);
    return !!table && typeof table.lookup === 'function' && tableOk(table);
  }
  var api = Object.freeze({ source: source, stressIndex: stressIndex, usable: usable });
  if (root) { root.AlloModules = root.AlloModules || {}; root.AlloModules.SyllableStressEn = api; }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
`;
}

// Loads the generated text beside the real table and asks it about every word.
function verify(built) {
  const sandbox = { module: { exports: {} } };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(built.moduleSource, sandbox);
  const api = sandbox.module.exports;
  if (typeof api.usable !== 'function' || api.usable(built.table.api) !== true) throw new Error('Stress add-on does not accept the table it was built against');
  built.words.forEach((word, k) => {
    const got = api.stressIndex(word, built.table.api);
    if (got !== built.codes[k] - 1) throw new Error('Stress lookup disagrees for ' + word + ': ' + got + ' vs ' + (built.codes[k] - 1));
  });
}

function main() {
  const args = process.argv.slice(2);
  for (const arg of args) if (arg !== '--check') throw new Error('Unknown argument: ' + arg);
  const built = buildArtifacts();
  verify(built);
  const output = built.moduleSource;
  const gzip = zlib.gzipSync(output, { level: 9 }).length;
  const brotli = zlib.brotliCompressSync(output, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length;
  console.log('words', built.words.length, 'reasons', JSON.stringify(built.reasons), 'byIndex', JSON.stringify(built.byIndex));
  console.log('levels', built.levels.map(level => level.text.length).join('+'), 'bytes', Buffer.byteLength(output), 'gzip', gzip, 'brotli', brotli);
  if (args[0] === '--check') {
    const stale = OUTPUTS.filter(file => !fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== output);
    if (stale.length) { console.error('Syllable stress add-on differs from sources: ' + stale.join(', ')); process.exitCode = 1; }
    else console.log('Syllable stress add-on matches its sources; no files written.');
    return;
  }
  for (const file of OUTPUTS) {
    const temporary = file + '.stress-build-' + process.pid + '.tmp';
    fs.writeFileSync(temporary, output);
    fs.renameSync(temporary, file);
  }
  console.log('Wrote ' + OUTPUTS.length + ' copies');
}

if (require.main === module) main();
module.exports = { cellsOf, stressFor, readCmuStress, readTable, buildLevel, buildArtifacts, renderModule, verify };
