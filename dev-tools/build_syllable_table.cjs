#!/usr/bin/env node
'use strict';

// Builds the English syllable table the reader and teacher review use on the device.
// Sources are pinned and offline. A word is only "sure" when a dictionary division
// (Moby) agrees with the sounds (CMUdict), or when a person or review pass checked it.
// Anything else is written as "check" so it stays undivided for students until a
// teacher confirms it. Flags: --check compares without writing; --review writes a
// JSON list of words worth a review pass to the path given after it.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const MOBY = path.join(ROOT, 'data/vendor/moby-hyphenator/mhyph.txt');
const MOBY_SHA = 'eeb30474c86b8af3469035ec1a0913e35905325ca885290db9dfed9881e230ac';
const CMU = path.join(ROOT, 'data/vendor/cmudict/cmudict.dict');
const CMU_LICENSE = path.join(ROOT, 'data/vendor/cmudict/LICENSE');
const COMMON = path.join(ROOT, 'data/syllables/en_common_words.txt');
const REVIEWED = path.join(ROOT, 'data/syllables/en_reviewed.json');
const OUTPUTS = [
  path.join(ROOT, 'syllable_table_en.js'),
  path.join(ROOT, 'desktop/web-app/public/syllable_table_en.js'),
];

const SHORT_VOWELS = new Set(['AE', 'EH', 'IH', 'AA', 'AH', 'UH']);
const ONSETS = new Set(('b bl br c ch cl cr d dr dw f fl fr g gh gl gn gr h j k kl kn kr l m n p ph pl pn pr ps q qu r rh s sc sch scr sh shr sk sl sm sn sp spl spr squ st str sw t th thr tr ts tw v w wh wr x y z').split(' '));
const VOWEL_TEAMS = /^(ea|ee|oo|ou|ai|ay|oa|oi|oy|au|aw|ei|ey|ie|ue|ow|ew)$/;
const hasVowel = part => /[aeiouy]/.test(part);

function readMoby() {
  const bytes = fs.readFileSync(MOBY);
  const sha = crypto.createHash('sha256').update(bytes).digest('hex');
  if (sha !== MOBY_SHA) throw new Error('Pinned Moby Hyphenator source differs: ' + sha);
  const moby = new Map();
  for (const line of bytes.toString('latin1').split(/\r?\n/)) {
    const entry = line.trim();
    if (!entry || /[ -]/.test(entry)) continue;
    const parts = entry.split('¥').map(part => part.toLowerCase());
    const word = parts.join('');
    if (/^[a-z]+$/.test(word) && !moby.has(word)) moby.set(word, parts);
  }
  return moby;
}

function readCmu() {
  const cmu = new Map();
  for (const line of fs.readFileSync(CMU, 'utf8').split(/\r?\n/)) {
    const text = line.split('#')[0].trim();
    if (!text) continue;
    const pieces = text.split(/\s+/);
    const word = pieces.shift().replace(/\(\d+\)$/, '');
    if (!/^[a-z]+$/.test(word)) continue;
    if (!cmu.has(word)) cmu.set(word, []);
    cmu.get(word).push(pieces);
  }
  return cmu;
}

const syllableCount = phones => phones.filter(phone => /\d$/.test(phone)).length;
const isVowelAt = (word, i) => /[aeiou]/.test(word[i]) || (word[i] === 'y' && i > 0 && !/[aeiou]/.test(word[i - 1]));

function nuclei(word) {
  const groups = [];
  let i = 0;
  while (i < word.length) {
    if (isVowelAt(word, i) && !(word[i] === 'u' && word[i - 1] === 'q')) {
      let j = i + 1;
      while (j < word.length && isVowelAt(word, j)) j++;
      groups.push([i, j]);
      i = j;
    } else i++;
  }
  return groups;
}

// Letters to syllables, led by the known syllable count and the stress of each vowel.
function derive(word, phones) {
  const target = syllableCount(phones);
  if (target <= 1) return [word];
  let groups = nuclei(word);
  while (groups.length > target) {
    const last = groups[groups.length - 1];
    const tail = word.slice(last[0]);
    if (!/^(e|es|ed)$/.test(tail) || groups.length < 2) break;
    groups = groups.slice(0, -1);
  }
  let guard = 0;
  while (groups.length < target && guard++ < 6) {
    let at = groups.findIndex(([a, b]) => b - a >= 2 && !VOWEL_TEAMS.test(word.slice(a, b)));
    if (at < 0) at = groups.findIndex(([a, b]) => b - a >= 2);
    if (at < 0) break;
    const [a, b] = groups[at];
    groups.splice(at, 1, [a, a + 1], [a + 1, b]);
  }
  if (groups.length !== target) return null;
  const vowels = phones.filter(phone => /\d$/.test(phone));
  const parts = [];
  let start = 0;
  for (let k = 0; k < groups.length - 1; k++) {
    const cluster = word.slice(groups[k][1], groups[k + 1][0]);
    let cut = groups[k][1];
    if (cluster.length) {
      let onset = cluster.length;
      while (onset > 0 && !ONSETS.has(cluster.slice(cluster.length - onset))) onset--;
      cut = groups[k + 1][0] - onset;
      if (onset === cluster.length) {
        const vowel = vowels[k] || '';
        // A stressed short vowel keeps the next consonant: pres-i-dent, an-i-mal.
        if (vowel.endsWith('1') && SHORT_VOWELS.has(vowel.slice(0, 2))) {
          cut = /^(th|ch|sh|ph|wh)$/.test(cluster) ? groups[k + 1][0] : groups[k][1] + 1;
        }
      }
      if (/^(ck|x)$/.test(cluster)) cut = groups[k + 1][0];
    }
    parts.push(word.slice(start, cut));
    start = cut;
  }
  parts.push(word.slice(start));
  return parts.every(hasVowel) ? parts : null;
}

// Inflections Moby leaves out: look+ing, an-i-mal+s, re-gret+ted.
function fromStem(word, allowed, moby, counts) {
  const rules = [['ing', ['', 'e']], ['ed', ['', 'e']], ['es', ['', 'e']], ['s', ['']], ['er', ['', 'e']], ['est', ['', 'e']], ['ly', ['']]];
  for (const [suffix, adds] of rules) {
    if (!word.endsWith(suffix)) continue;
    const base = word.slice(0, -suffix.length);
    const bases = adds.map(add => [base + add, false]);
    if (/(.)\1$/.test(base)) bases.push([base.slice(0, -1), true]);
    if (/i$/.test(base)) bases.push([base.slice(0, -1) + 'y', false]);
    for (const [candidate, doubled] of bases) {
      const stem = moby.get(candidate);
      if (!stem || !counts(candidate).has(stem.length)) continue;
      const head = stem.slice(0, -1);
      const tail = word.slice(head.join('').length);
      if (suffix !== 's' && allowed.has(stem.length + 1)) {
        const cut = tail.length - suffix.length - (doubled ? 1 : 0);
        if (cut > 0) return head.concat(tail.slice(0, cut), tail.slice(cut));
      }
      if (allowed.has(stem.length)) return head.concat(tail);
    }
  }
  return null;
}

function buildEntries() {
  const moby = readMoby();
  const cmu = readCmu();
  const counts = word => new Set((cmu.get(word) || []).map(syllableCount));
  const common = fs.readFileSync(COMMON, 'utf8').split(/\r?\n/).filter(Boolean);
  const commonSet = new Set(common);
  const reviewed = fs.existsSync(REVIEWED) ? JSON.parse(fs.readFileSync(REVIEWED, 'utf8')) : { corrected: {}, confirmed: [] };
  const confirmed = new Set(reviewed.confirmed || []);
  const entries = new Map();
  const tiers = { single: 0, dictionary: 0, stem: 0, reviewed: 0, check: 0, skipped: 0 };
  const put = (word, parts, sure, tier) => { entries.set(word, { parts, sure, tier }); tiers[tier]++; };

  for (const [word, prons] of cmu) {
    if (word.length < 2 && word !== 'a' && word !== 'i') continue;
    const allowed = counts(word);
    if (allowed.size === 1 && allowed.has(1)) { put(word, [word], true, 'single'); continue; }
    const division = moby.get(word);
    // CMUdict counts the -ire of "desire" as two syllables; dictionaries divide it as one.
    const ireOk = division && /ire(d|s|ly|ment|ments)?$/.test(word) && allowed.has(division.length + 1);
    if (division && (allowed.has(division.length) || ireOk) && division.every(hasVowel)) { put(word, division, true, 'dictionary'); continue; }
    const stem = fromStem(word, allowed, moby, counts);
    if (stem && stem.join('') === word && allowed.has(stem.length) && stem.every(hasVowel)) { put(word, stem, true, 'stem'); continue; }
    if (!commonSet.has(word)) { tiers.skipped++; continue; }
    let derived = null;
    for (const phones of prons) {
      derived = derive(word, phones);
      if (derived && derived.join('') === word && allowed.has(derived.length)) break;
      derived = null;
    }
    // "us" and "am" have a one-syllable reading, so nothing here can divide them wrongly.
    if (derived && derived.length === 1) put(word, derived, true, 'single');
    else if (derived) put(word, derived, false, 'check');
    else tiers.skipped++;
  }
  // Common words the sound dictionary lacks: a division exists but nothing confirms it.
  for (const word of common) {
    if (entries.has(word) || cmu.has(word)) continue;
    const division = moby.get(word);
    if (division && division.length > 1 && division.every(hasVowel)) put(word, division, false, 'check');
  }
  for (const word of confirmed) {
    const entry = entries.get(word);
    if (entry && !entry.sure) { entry.sure = true; tiers.check--; tiers.reviewed++; entry.tier = 'reviewed'; }
  }
  for (const [word, division] of Object.entries(reviewed.corrected || {})) {
    const parts = String(division).split('|');
    if (parts.join('') !== word) throw new Error('Reviewed division changes the letters: ' + word);
    const previous = entries.get(word);
    if (previous) tiers[previous.tier]--;
    entries.set(word, { parts, sure: true, tier: 'reviewed' });
    tiers.reviewed++;
  }
  return { entries, tiers, common };
}

function renderModule({ entries, tiers }) {
  const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  const sure = [], check = [], single = [];
  for (const [word, entry] of [...entries.entries()].sort((a, b) => compare(a[0], b[0]))) {
    if (entry.parts.length === 1) { if (entry.sure) single.push(word); continue; }
    (entry.sure ? sure : check).push(entry.parts.join('|'));
  }
  const license = fs.readFileSync(CMU_LICENSE, 'utf8').replace(/\r\n/g, '\n').trim().replace(/\*\//g, '* /');
  const source = { moby: 'Moby Hyphenator II, Grady Ward, public domain by grant of the author (2001)', cmudict: 'CMUdict, Carnegie Mellon University', counts: { sure: sure.length, check: check.length, single: single.length, reviewed: tiers.reviewed } };
  return `// Generated by dev-tools/build_syllable_table.cjs. Do not edit.
// English syllable divisions checked against pronunciation data. See data/syllables/README.md.
/*!
${license}
*/
(function (root) {
  'use strict';
  var sureText = ${JSON.stringify(sure.join(' '))};
  var checkText = ${JSON.stringify(check.join(' '))};
  var singleText = ${JSON.stringify(single.join(' '))};
  var index = null;
  function build() {
    index = new Map();
    function add(text, sure) {
      if (!text) return;
      text.split(' ').forEach(function (entry) {
        var parts = entry.split('|');
        index.set(parts.join(''), { parts: parts, check: !sure });
      });
    }
    add(singleText, true); add(sureText, true); add(checkText, false);
    sureText = checkText = singleText = '';
  }
  var api = Object.freeze({
    source: Object.freeze(${JSON.stringify(source)}),
    lookup: function (word) {
      if (typeof word !== 'string') return null;
      if (!index) build();
      var found = index.get(word);
      return found ? { parts: found.parts.slice(), check: found.check } : null;
    }
  });
  if (root) { root.AlloModules = root.AlloModules || {}; root.AlloModules.SyllableTableEn = api; }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
`;
}

function main() {
  const args = process.argv.slice(2);
  const built = buildEntries();
  const output = renderModule(built);
  console.log('tiers', JSON.stringify(built.tiers), 'bytes', Buffer.byteLength(output));
  if (args[0] === '--review') {
    const list = [];
    built.common.forEach((word, rank) => {
      const entry = built.entries.get(word);
      if (entry && entry.parts.length > 1) list.push({ word, division: entry.parts.join('|'), sure: entry.sure, rank });
    });
    fs.writeFileSync(args[1], JSON.stringify(list));
    console.log('review list', list.length);
    return;
  }
  if (args[0] === '--check') {
    const stale = OUTPUTS.filter(file => !fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== output);
    if (stale.length) { console.error('Syllable table differs from sources: ' + stale.join(', ')); process.exitCode = 1; }
    else console.log('Syllable table matches its sources; no files written.');
    return;
  }
  for (const file of OUTPUTS) {
    const temporary = file + '.syllable-build-' + process.pid + '.tmp';
    fs.writeFileSync(temporary, output);
    fs.renameSync(temporary, file);
  }
  console.log('Wrote ' + OUTPUTS.length + ' copies');
}

if (require.main === module) main();
module.exports = { buildEntries, renderModule };
