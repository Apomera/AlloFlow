#!/usr/bin/env node
'use strict';

// Builds the Word Sounds sound dictionary: word -> the app's sound labels, so
// "Prepare lesson" needs no AI call for a word's sounds. Sources are pinned and
// offline: the vendored CMUdict snapshot, the app's own word lists and the
// reading library's frequency list. The conversion rules live in
// word_sounds_core.js (arpabetEntry), where the unit tests run them; this
// script only applies them. --check compares without writing.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { COMMIT, SOURCE_HASHES } = require('./build_word_sounds_pronunciations.cjs');

const ROOT = path.resolve(__dirname, '..');
const VENDOR = path.join(ROOT, 'data/vendor/cmudict');
const COMMON = path.join(ROOT, 'data/syllables/en_common_words.txt');
const OUTPUTS = [
  path.join(ROOT, 'word_sounds_phonemes_en.js'),
  path.join(ROOT, 'desktop/web-app/public/word_sounds_phonemes_en.js'),
];
// Every app-list word is kept. Common words are added most frequent first.
const COMMON_WORD_LIMIT = 40000;
// One character per sound label keeps the file small. Order is part of the format.
const LABELS = ['a', 'e', 'i', 'o', 'u', 'ay', 'ee', 'ie', 'oa', 'oo', 'oo_short', 'oy', 'ow', 'aw', 'ar', 'or', 'er', 'ir', 'ur', 'air', 'ear', 'schwa',
  'b', 'ch', 'd', 'dh', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'ng', 'p', 'r', 's', 'sh', 't', 'th', 'v', 'w', 'y', 'z', 'zh'];
const CODE_OF = new Map(LABELS.map((label, index) => [label, String.fromCharCode(index < 26 ? 97 + index : 65 + index - 26)]));

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const compare = (left, right) => left < right ? -1 : left > right ? 1 : 0;

function loadCore() {
  const source = fs.readFileSync(path.join(ROOT, 'word_sounds_core.js'), 'utf8');
  return new Function(source + ';return createWordSoundsCore();')();
}

function readPinned(name) {
  const bytes = fs.readFileSync(path.join(VENDOR, name));
  if (sha256(bytes) !== SOURCE_HASHES[name]) throw new Error(`Pinned CMUdict source differs: ${name}`);
  return bytes.toString('utf8');
}

function readDictionary() {
  const entries = new Map();
  for (const line of readPinned('cmudict.dict').split(/\r?\n/)) {
    const text = line.replace(/\s*#.*$/, '').trim();
    if (!text) continue;
    const pieces = text.split(/\s+/);
    const word = pieces.shift().replace(/\(\d+\)$/, '').normalize('NFC').toLowerCase();
    if (!/^[a-z][a-z']*$/.test(word)) continue;
    if (!entries.has(word)) entries.set(word, []);
    entries.get(word).push(pieces);
  }
  return entries;
}

// The app's own word lists, read from their sources so a new list word is picked up.
function appWordLists(core) {
  const data = fs.readFileSync(path.join(ROOT, 'allo_data_source.jsx'), 'utf8');
  const grab = name => {
    const lead = 'const ' + name + ' = ';
    const start = data.indexOf(lead);
    if (start < 0) throw new Error('Missing word list: ' + name);
    const open = data[start + lead.length];
    const end = data.indexOf(open === '{' ? '\n};' : '\n];', start);
    return (new Function('return ' + data.slice(start + lead.length, end + 2)))();
  };
  const flat = value => Array.isArray(value) ? value : Object.values(value).flatMap(list => Array.isArray(list) ? list : (list && list.words) || []);
  const setup = fs.readFileSync(path.join(ROOT, 'word_sounds_setup_source.jsx'), 'utf8');
  const filler = setup.match(/const PACK_COMMON_WORDS = (\[[^\]]*\]);/);
  if (!filler) throw new Error('Missing PACK_COMMON_WORDS');
  const bank = JSON.parse(fs.readFileSync(path.join(ROOT, 'word_audio_kokoro_bank.json'), 'utf8'));
  return {
    wordFamilies: flat(grab('WORD_FAMILY_PRESETS')),
    sightWords: flat(grab('SIGHT_WORD_PRESETS')),
    soundMatchPool: flat(grab('SOUND_MATCH_POOL')),
    rimeFamilies: flat(grab('RIME_FAMILIES')),
    compounds: [...core.compoundWords(), ...core.compoundPartWords(), ...core.syllableCountWords()],
    recordedBank: Object.keys(bank.words || {}),
    coreWords: [...core.knownWords, ...(new Function('return ' + filler[1]))()],
  };
}

function buildEntries() {
  const core = loadCore();
  const dictionary = readDictionary();
  const lists = appWordLists(core);
  const clean = word => String(word || '').normalize('NFC').trim().toLowerCase();
  const wanted = new Set();
  const missing = {};
  for (const [name, words] of Object.entries(lists)) {
    for (const raw of words) {
      const word = clean(raw);
      if (!word) continue;
      if (dictionary.has(word)) wanted.add(word);
      else (missing[name] = missing[name] || []).push(word);
    }
  }
  const appWordCount = wanted.size;
  let commonAdded = 0;
  for (const raw of fs.readFileSync(COMMON, 'utf8').split(/\r?\n/)) {
    if (commonAdded >= COMMON_WORD_LIMIT) break;
    const word = clean(raw);
    if (!word || wanted.has(word) || !dictionary.has(word)) continue;
    wanted.add(word); commonAdded++;
  }
  const labelSet = new Set(LABELS);
  const entries = new Map();
  let alternateWords = 0;
  for (const word of [...wanted].sort(compare)) {
    const forms = core.arpabetEntry(word, dictionary.get(word));
    if (!forms.length) continue;
    for (const sounds of forms) for (const label of sounds) if (!labelSet.has(label)) throw new Error(`Unknown sound label ${label} for ${word}`);
    if (forms.length > 1) alternateWords++;
    entries.set(word, forms);
  }
  return { core, lists, entries, missing, appWordCount, commonAdded, alternateWords };
}

function renderModule(built) {
  const license = readPinned('LICENSE').replace(/\r\n/g, '\n').trim().replace(/\*\//g, '* /');
  const text = [...built.entries].map(([word, forms]) =>
    word + ':' + forms.map(sounds => sounds.map(label => CODE_OF.get(label)).join('')).join(',')).join(' ');
  const source = {
    id: 'cmudict', name: 'Carnegie Mellon Pronouncing Dictionary', language: 'en-US', commit: COMMIT,
    sha256: SOURCE_HASHES['cmudict.dict'], license: 'Carnegie Mellon University permissive license',
    conventions: 'Orton-Gillingham sound labels; see OG_CONVENTIONS in word_sounds_core.js',
    scope: 'The app word lists plus the most frequent reading-library words. First form is the taught one; later forms are other pronunciations.',
    wordCount: built.entries.size, appListWords: built.appWordCount, commonWords: built.commonAdded, wordsWithAlternates: built.alternateWords,
  };
  return `// Generated by dev-tools/build_word_sounds_phonemes.cjs. Do not edit.
// Word -> sound labels for Word Sounds, converted from CMUdict by the rules in word_sounds_core.js.
/*!
${license}
*/
var createWordSoundsPhonemeData = (function () {
  'use strict';
  var cached;
  return function createWordSoundsPhonemeData() {
    if (cached) return cached;
    var source = Object.freeze(${JSON.stringify(source)});
    var labels = Object.freeze(${JSON.stringify(LABELS)});
    // "word:form,form" entries; each character of a form is one sound label.
    var text = ${JSON.stringify(text)};
    var index = null;
    var missing = Object.freeze([]);
    function decode(form) {
      var out = [];
      for (var i = 0; i < form.length; i++) {
        var code = form.charCodeAt(i);
        out.push(labels[code >= 97 ? code - 97 : code - 65 + 26]);
      }
      return Object.freeze(out);
    }
    function lookup(value) {
      if (typeof value !== 'string') return missing;
      var word = value.normalize('NFC').trim().toLowerCase().replace(/[\\u2018\\u2019]/g, "'");
      if (!word) return missing;
      if (!index) {
        index = new Map();
        text.split(' ').forEach(function (entry) {
          var at = entry.indexOf(':');
          index.set(entry.slice(0, at), entry.slice(at + 1));
        });
        text = '';
      }
      var found = index.get(word);
      if (typeof found === 'string') {
        found = Object.freeze(found.split(',').map(decode));
        index.set(word, found);
      }
      return found || missing;
    }
    cached = Object.freeze({ version: 1, source: source, labels: labels, lookup: lookup, wordCount: ${built.entries.size} });
    return cached;
  };
})();
(function (root) {
  var api = createWordSoundsPhonemeData();
  if (root) {
    root.AlloModules = root.AlloModules || {};
    root.AlloModules.WordSoundsPhonemes = api;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
`;
}

function main(args) {
  for (const arg of args) if (arg !== '--check') throw new Error(`Unknown argument: ${arg}`);
  const built = buildEntries();
  const output = renderModule(built);
  const size = `${built.entries.size} words (${built.appWordCount} from the app lists, ${built.commonAdded} common); ${built.alternateWords} with other pronunciations; ${Buffer.byteLength(output)} bytes (${zlib.gzipSync(output, { level: 9 }).length} gzip)`;
  if (args.includes('--check')) {
    const stale = OUTPUTS.filter(file => !fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== output);
    if (stale.length) throw new Error('Stale sound dictionary: ' + stale.map(file => path.relative(ROOT, file)).join(', '));
    console.log('Verified sound dictionary: ' + size + '.');
    return;
  }
  for (const file of OUTPUTS) {
    if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === output) continue;
    const temporary = file + '.phonemes-build-' + process.pid + '.tmp';
    fs.writeFileSync(temporary, output);
    // A full disk truncates in-place writes: check the bytes before replacing the file.
    if (fs.readFileSync(temporary, 'utf8') !== output) { fs.unlinkSync(temporary); throw new Error('Short write: ' + path.relative(ROOT, file)); }
    fs.renameSync(temporary, file);
  }
  console.log('Built sound dictionary: ' + size + '.');
}

module.exports = { LABELS, COMMON_WORD_LIMIT, OUTPUTS, readDictionary, appWordLists, buildEntries, renderModule };
if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
