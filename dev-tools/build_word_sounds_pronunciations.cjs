#!/usr/bin/env node
'use strict';

// Derive syllable counts/stress from a pinned CMUdict snapshot. Normal builds
// and --check are entirely offline. --refresh re-downloads only this exact pin.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');

const ROOT = path.resolve(__dirname, '..');
const VENDOR = path.join(ROOT, 'data/vendor/cmudict');
const COMMIT = '74790861f652b15e4ac49015a90074ad62a27690';
const BASE_URL = `https://raw.githubusercontent.com/cmusphinx/cmudict/${COMMIT}/`;
const SOURCE_HASHES = Object.freeze({
  'cmudict.dict': '81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22',
  LICENSE: 'bd4ce8e44170a5f9f481310ca85c51de3c4f851a65e679b40e603b143bd3542a',
  README: '00c34e7564f1f6a68de02e12c123d801471da92bc3091f7d89b605f238bf8554',
  'cmudict.phones': 'ffb588a5e55684723582c7256e1d2f9fadb130011392d9e59237c76e34c2cfd6',
});
const OUTPUTS = [
  path.join(ROOT, 'word_sounds_pronunciations.js'),
  path.join(ROOT, 'desktop/web-app/public/word_sounds_pronunciations.js'),
];
const METADATA_PATH = path.join(VENDOR, 'source.json');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const compare = (left, right) => left < right ? -1 : left > right ? 1 : 0;

function readPinnedSources() {
  return Object.fromEntries(Object.entries(SOURCE_HASHES).map(([name, expected]) => {
    const bytes = fs.readFileSync(path.join(VENDOR, name));
    if (sha256(bytes) !== expected) throw new Error(`Pinned CMUdict source differs: ${name}`);
    return [name, bytes.toString('utf8')];
  }));
}

function parseDictionary(dictionary, phoneTable) {
  const phones = new Map(phoneTable.trim().split(/\r?\n/).map(line => line.trim().split(/\s+/)));
  const entries = new Map();
  const excluded = [];
  let pronunciationCount = 0;
  dictionary.split(/\r?\n/).forEach((line, index) => {
    const text = line.replace(/\s*#.*$/, '').trim();
    if (!text || text.startsWith(';;;')) return;
    const match = text.match(/^(\S+)\s+(.+)$/);
    if (!match) throw new Error(`Invalid CMUdict row ${index + 1}`);
    const word = match[1].replace(/\(\d+\)$/, '').normalize('NFC').toLowerCase();
    const stresses = [];
    for (const phone of match[2].split(/\s+/)) {
      const base = phone.replace(/[012]$/, '');
      if (!phones.has(base)) throw new Error(`Unknown CMUdict phone at row ${index + 1}: ${phone}`);
      if (phones.get(base) === 'vowel') {
        if (!/[012]$/.test(phone)) throw new Error(`Unstressed vowel metadata at row ${index + 1}: ${phone}`);
        stresses.push(phone.slice(-1));
      } else if (/[012]$/.test(phone)) throw new Error(`Stress on consonant at row ${index + 1}: ${phone}`);
    }
    if (!stresses.length) {
      excluded.push(word);
      return;
    }
    const pattern = stresses.join('');
    if (!entries.has(word)) entries.set(word, new Set());
    // Keep source pronunciation order. Duplicate stress patterns can be merged
    // because this API provides counts/stress, not complete pronunciations.
    entries.get(word).add(pattern);
    pronunciationCount++;
  });
  const groups = new Map();
  for (const [word, variants] of entries) {
    const key = [...variants].join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(word);
  }
  return {
    entries,
    groups: [...groups].sort(([a], [b]) => compare(a, b)).map(([pattern, words]) => [pattern, words.sort(compare).join(' ')]),
    wordCount: entries.size,
    pronunciationCount,
    distinctStressPatternCount: [...entries.values()].reduce((sum, variants) => sum + variants.size, 0),
    countVariantWordCount: [...entries.values()].filter(variants => new Set([...variants].map(value => value.length)).size > 1).length,
    excluded: [...new Set(excluded)].sort(compare),
  };
}

function sourceMetadata(parsed) {
  return {
    id: 'cmudict',
    name: 'Carnegie Mellon Pronouncing Dictionary',
    language: 'en-US',
    repository: 'https://github.com/cmusphinx/cmudict',
    commit: COMMIT,
    url: `https://github.com/cmusphinx/cmudict/blob/${COMMIT}/cmudict.dict`,
    sha256: SOURCE_HASHES['cmudict.dict'],
    license: 'Carnegie Mellon University permissive license',
    licenseUrl: `https://github.com/cmusphinx/cmudict/blob/${COMMIT}/LICENSE`,
    format: 'One stress digit per vowel phone: 0 unstressed, 1 primary, 2 secondary. Pattern length is the syllable count.',
    scope: 'US English pronunciation baseline. Alternatives retain upstream order and are not tagged by dialect, context, or chosen voice.',
    limitations: 'Provides count and stress evidence, not written syllable boundaries, audio, pronunciation verification, or a reviewed stimulus. Words without vowel phones are unresolved.',
    wordCount: parsed.wordCount,
    pronunciationCount: parsed.pronunciationCount,
    distinctStressPatternCount: parsed.distinctStressPatternCount,
    countVariantWordCount: parsed.countVariantWordCount,
  };
}

function buildModule(parsed, license) {
  const source = sourceMetadata(parsed);
  return `// Generated by dev-tools/build_word_sounds_pronunciations.cjs. Do not edit.
// Offline word-specific count/stress evidence; no syllable-boundary or audio claims.
/*!
${license.trim().replace(/\*\//g, '* /')}
*/
var createWordSoundsPronunciationData = (function () {
  'use strict';
  var cached;
  return function createWordSoundsPronunciationData() {
    if (cached) return cached;
    var source = Object.freeze(${JSON.stringify(source)});
    // Group identical complete variant lists, so each spelling occurs once.
    // The large lookup index is built only when a word is first requested.
    var groups = ${JSON.stringify(parsed.groups)};
    var index = null;
    var missing = Object.freeze([]);
    function lookup(value) {
      if (typeof value !== 'string') return missing;
      var word = value.normalize('NFC').trim().toLowerCase().replace(/[\u2018\u2019]/g, "'");
      if (!word) return missing;
      if (!index) {
        index = new Map();
        groups.forEach(function (group) {
          var patterns = Object.freeze(group[0].split('|'));
          group[1].split(' ').forEach(function (spelling) { index.set(spelling, patterns); });
        });
        groups = null;
      }
      return index.get(word) || missing;
    }
    cached = Object.freeze({ version: 1, source: source, lookup: lookup, wordCount: ${parsed.wordCount} });
    return cached;
  };
})();
(function (root) {
  var api = createWordSoundsPronunciationData();
  if (root) {
    root.AlloModules = root.AlloModules || {};
    root.AlloModules.WordSoundsPronunciations = api;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
`;
}

function buildArtifacts() {
  const sources = readPinnedSources();
  const parsed = parseDictionary(sources['cmudict.dict'], sources['cmudict.phones']);
  const moduleSource = buildModule(parsed, sources.LICENSE);
  const metadata = {
    ...sourceMetadata(parsed),
    sourceFiles: SOURCE_HASHES,
    excludedNoVowelWords: parsed.excluded,
    generatedModuleSha256: sha256(moduleSource),
    generatedModuleBytes: Buffer.byteLength(moduleSource),
    generatedModuleGzipBytes: zlib.gzipSync(moduleSource, { level: 9 }).length,
  };
  return { parsed, moduleSource, metadataSource: JSON.stringify(metadata, null, 2) + '\n', metadata };
}

async function refreshSources() {
  const downloaded = [];
  // Validate every source before replacing any vendored input.
  for (const [name, expected] of Object.entries(SOURCE_HASHES)) {
    const response = await fetch(BASE_URL + name, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`CMUdict download failed: ${name} HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (sha256(bytes) !== expected) throw new Error(`Downloaded CMUdict source differs from pinned hash: ${name}`);
    downloaded.push([name, bytes]);
  }
  fs.mkdirSync(VENDOR, { recursive: true });
  downloaded.forEach(([name, bytes]) => fs.writeFileSync(path.join(VENDOR, name), bytes));
}

async function main(args) {
  for (const arg of args) if (!['--check', '--refresh'].includes(arg)) throw new Error(`Unknown argument: ${arg}`);
  if (args.includes('--check') && args.includes('--refresh')) throw new Error('--check is offline; use --refresh separately.');
  if (args.includes('--refresh')) await refreshSources();
  const result = buildArtifacts();
  for (const [filename, content] of [...OUTPUTS.map(file => [file, result.moduleSource]), [METADATA_PATH, result.metadataSource]]) {
    if (args.includes('--check')) {
      if (!fs.existsSync(filename) || fs.readFileSync(filename, 'utf8') !== content) throw new Error(`Stale pronunciation artifact: ${path.relative(ROOT, filename)}`);
    } else {
      fs.mkdirSync(path.dirname(filename), { recursive: true });
      if (!fs.existsSync(filename) || fs.readFileSync(filename, 'utf8') !== content) fs.writeFileSync(filename, content);
    }
  }
  console.log(`${args.includes('--check') ? 'Verified' : 'Built'} CMUdict count/stress data: ${result.parsed.wordCount} spellings; ${result.parsed.countVariantWordCount} with alternative counts; ${result.metadata.generatedModuleBytes} bytes (${result.metadata.generatedModuleGzipBytes} gzip).`);
}

module.exports = { COMMIT, SOURCE_HASHES, parseDictionary, sourceMetadata, buildModule, buildArtifacts };
if (require.main === module) main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
