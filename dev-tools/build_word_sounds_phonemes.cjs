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
// Every app-list word is kept. Common words and attested lexicon words + inflections are added.
const COMMON_WORD_LIMIT = 40000;
const VOCAB_SHARDS = ['packets_vocab/en-1.json', 'packets_vocab/en-2.json'];
const CYPLEX_WORDS = path.join(ROOT, 'data/vendor/cyplex/cyplex79_dictionary_words.tsv');
const VOCAB_VENDOR = path.join(ROOT, 'data/vendor/vocab');
const SUPPLEMENT_ARPABET = {
  cartography: [['K', 'AA0', 'R', 'T', 'AA1', 'G', 'R', 'AH0', 'F', 'IY0']],
  commensalism: [['K', 'AH0', 'M', 'EH1', 'N', 'S', 'AH0', 'L', 'IH2', 'Z', 'AH0', 'M']],
  decomposer: [['D', 'IY2', 'K', 'AH0', 'M', 'P', 'OW1', 'Z', 'ER0']],
  factorial: [['F', 'AE0', 'K', 'T', 'AO1', 'R', 'IY0', 'AH0', 'L']],
  founds: [['F', 'AW1', 'N', 'D', 'Z']],
  mitosis: [['M', 'AY0', 'T', 'OW1', 'S', 'IH0', 'S']],
  omnivore: [['AA1', 'M', 'N', 'IH0', 'V', 'AO2', 'R']],
  parasitism: [
    ['P', 'EH1', 'R', 'AH0', 'S', 'AY2', 'T', 'IH0', 'Z', 'AH0', 'M'],
    ['P', 'AE1', 'R', 'AH0', 'S', 'AY2', 'T', 'IH0', 'Z', 'AH0', 'M'],
  ],
  postgraduate: [
    ['P', 'OW2', 'S', 'T', 'G', 'R', 'AE1', 'JH', 'AH0', 'W', 'AH0', 'T'],
    ['P', 'OW2', 'S', 'T', 'G', 'R', 'AE1', 'JH', 'UW0', 'AH0', 'T'],
  ],
  reactant: [['R', 'IY0', 'AE1', 'K', 'T', 'AH0', 'N', 'T']],
  refraction: [['R', 'IH0', 'F', 'R', 'AE1', 'K', 'SH', 'AH0', 'N']],
  simile: [['S', 'IH1', 'M', 'AH0', 'L', 'IY0']],
  subduction: [['S', 'AH0', 'B', 'D', 'AH1', 'K', 'SH', 'AH0', 'N']],
  transpiration: [['T', 'R', 'AE2', 'N', 'S', 'P', 'ER0', 'EY1', 'SH', 'AH0', 'N']],
  vacuole: [['V', 'AE1', 'K', 'Y', 'UW0', 'OW2', 'L']],
};
// Non-word abbreviations, initialisms, and romanization fragments with 0 CYP-LEX books.
const PRUNE_ABBREVS = new Set(
  'abd acc ala ane ast aug bae bt cac cea cit clo cyr dac dae dak dea duc eda ede edu ems fda feb ftp gib gil har hep hou hoy hr http hui hur hwa ise kao kew kos kuo kut lai lak lal lan leh lev lew lin lun mau mt mun nes nez nov nur oct oop ott pao pei php pia ppm qu ren roi rpm ru sgt sui sus sze tai tet tod tre tso tsu und ur vy wei wy'.split(' ')
);
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
  for (const [word, forms] of Object.entries(SUPPLEMENT_ARPABET)) {
    if (!entries.has(word)) entries.set(word, forms);
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
    coreWords: [...(core.edgeWords || core.knownWords), ...(new Function('return ' + filler[1]))()],
  };
}

function vendoredLexiconWords(dictionary) {
  const words = new Set();
  const stems = new Set();
  const cleanWord = value => String(value || '').normalize('NFC').trim().toLowerCase();
  const isCleanWord = w => /^[a-z]{2,}$/.test(w) && /[aeiouy]/.test(w) && !PRUNE_ABBREVS.has(w) && dictionary.has(w);
  for (const rel of VOCAB_SHARDS) {
    const shard = JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
    for (const row of shard.words || []) {
      const w = cleanWord(Array.isArray(row) ? row[0] : row);
      if (w && /^[a-z][a-z']*$/.test(w) && dictionary.has(w)) {
        words.add(w);
        if (/^[a-z]{3,}$/.test(w) && /[aeiouy]/.test(w)) stems.add(w);
      }
    }
  }
  if (fs.existsSync(CYPLEX_WORDS)) {
    for (const line of fs.readFileSync(CYPLEX_WORDS, 'utf8').split(/\r?\n/)) {
      if (!line || line.startsWith('#')) continue;
      const parts = line.split('\t');
      if (parts[0] === 'word') continue;
      const w = cleanWord(parts[0]);
      if (w && !PRUNE_ABBREVS.has(w) && dictionary.has(w)) words.add(w);
    }
  }
  for (const name of ['simple_wiktionary_en.json', 'wiktionary_en.json', 'wordnet_en.json']) {
    const file = path.join(VOCAB_VENDOR, name);
    if (!fs.existsSync(file)) continue;
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    for (const raw of Object.keys(data.words || data.entries || data)) {
      const trimmed = String(raw || '').normalize('NFC').trim();
      // Keep lowercase lexicon entries (skip capitalized proper nouns from Wiktionary/WordNet).
      if (/^[a-z]{2,}$/.test(trimmed) && isCleanWord(trimmed)) words.add(trimmed);
    }
  }
  const wordlistsFile = path.join(VOCAB_VENDOR, 'wordlists_en.json');
  if (fs.existsSync(wordlistsFile)) {
    const wl = JSON.parse(fs.readFileSync(wordlistsFile, 'utf8'));
    for (const key of ['nawl', 'builtin', 'common']) {
      const src = wl[key];
      const list = Array.isArray(src) ? src : Object.keys(src || {});
      for (const raw of list) {
        const w = cleanWord(raw);
        if (isCleanWord(w)) words.add(w);
        if (/^[a-z]{3,}$/.test(w) && /[aeiouy]/.test(w)) stems.add(w);
      }
    }
    for (const [raw, score] of Object.entries(wl.zipf || {})) {
      const w = cleanWord(raw);
      if (Number(score) >= 2.0 && isCleanWord(w)) words.add(w);
      if (Number(score) >= 2.5 && /^[a-z]{4,}$/.test(w) && /[aeiouy]/.test(w)) stems.add(w);
    }
  }
  for (const stem of stems) {
    if (stem.length < 4 && !words.has(stem)) continue;
    const derived = [
      ...(!/(?:s|x|z|ch|sh|y|man|ss|us|is)$/.test(stem) ? [stem + 's'] : []),
      ...(/(?:s|x|z|ch|sh)$/.test(stem) ? [stem + 'es'] : []),
      ...(!stem.endsWith('e') && !stem.endsWith('y') ? [stem + 'ed', stem + 'ing', stem + 'est'] : []),
      ...(stem.endsWith('e') && !/(?:ee|ye|oe)$/.test(stem) ? [stem + 'd', stem.slice(0, -1) + 'ing'] : []),
      ...(stem.endsWith('y') && !/[aeiou]y$/.test(stem) ? [stem.slice(0, -1) + 'ies', stem.slice(0, -1) + 'ied', stem.slice(0, -1) + 'iest', stem.slice(0, -1) + 'ily'] : []),
      stem + 'ly', stem + 'ness', stem + 'ment', stem + 'ful', stem + 'less',
    ];
    for (const form of derived) if (isCleanWord(form)) words.add(form);
  }
  return words;
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
    if (!word || wanted.has(word) || PRUNE_ABBREVS.has(word) || (!/[aeiouy]/.test(word) && word !== 'nth') || !dictionary.has(word)) continue;
    wanted.add(word); commonAdded++;
  }
  for (const word of vendoredLexiconWords(dictionary)) {
    if (!wanted.has(word)) {
      wanted.add(word);
      commonAdded++;
    }
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
