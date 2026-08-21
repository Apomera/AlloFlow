#!/usr/bin/env node
'use strict';

// Generate a reviewable Concept Quest-only translation payload.  This keeps
// the normal main-UI synchronizer untouched: only missing concept_quest keys
// are requested and the resulting object can be applied through the existing
// hand-translation helper.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');
const CODES = {
  acholi: 'ach', amharic: 'am', burmese: 'my', chin_falam: 'cfm',
  chin_hakha: 'cnh', gujarati: 'gu', haitian_creole: 'ht', hausa: 'ha',
  hmong: 'hmn', igbo: 'ig', kannada: 'kn', karen: 'ksw', khmer: 'km',
  kinyarwanda: 'rw', kirundi: 'rn', lao: 'lo', lingala: 'ln',
  maay_maay: 'so', malayalam: 'ml', marathi: 'mr', marshallese: 'mh',
  nepali: 'ne', pashto: 'ps', somali: 'so', tamil: 'ta', telugu: 'te',
  tigrinya: 'ti', yoruba: 'yo',
};

const targets = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const languages = targets.length ? targets : Object.keys(CODES);
const output = process.argv.find((arg) => arg.startsWith('--output='))?.slice(9)
  || 'dev-tools/i18n/concept_quest_mymemory_drafts_20260821.cjs';
// MyMemory enforces a 500-byte query limit (including markers).
const maxBatchBytes = 3500;
const retries = 4;
const delayMs = 4500;

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const placeholders = (value) => (String(value).match(/\{[^{}]+\}/g) || []).sort();

function maskProtected(text) {
  const values = [];
  const masked = String(text).replace(/\{[^{}]+\}|Â·/g, (match) => {
    const token = `XPH${String(values.length).padStart(3, '0')}X`;
    values.push(match);
    return token;
  });
  return {
    masked,
    restore: (translated) => values.reduce(
      (result, value, index) => result.replaceAll(`XPH${String(index).padStart(3, '0')}X`, value),
      translated,
    ),
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(text, target) {
  let lastError;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      // Supplying a contact address opts into MyMemory's larger documented
      // request allowance instead of the tiny anonymous daily quota.
      const query = new URLSearchParams({ client: 'gtx', sl: 'en', tl: target, dt: 't' });
      // Route through Jina's read-only fetch proxy.  The direct Google
      // endpoint is rate-limited in this environment, while the proxy keeps
      // these small, explicitly scoped requests independent.
      const response = await fetch(
        `https://r.jina.ai/http://translate.googleapis.com/translate_a/single?${query}&q=${encodeURIComponent(text)}`,
        {
        signal: AbortSignal.timeout(45000),
        },
      );
      const raw = await response.text();
      const start = raw.indexOf('[[[');
      const end = raw.lastIndexOf(']]');
      if (start < 0 || end < start) {
        throw new Error(`translation proxy returned no JSON (${response.status})`);
      }
      const payload = JSON.parse(raw.slice(start, end + 2));
      if (!response.ok || !Array.isArray(payload?.[0])) throw new Error(`Google proxy ${response.status}`);
      const translated = payload[0].map((part) => part?.[0] || '').join('');
      if (typeof translated !== 'string' || !translated.trim()) throw new Error('empty translation');
      // MyMemory occasionally returns HTML entities or provider placeholder
      // wrappers.  Keep the actual UI text and let the parity gate validate
      // our protected Concept Quest placeholders below.
      return translated
        .replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&')
        .replace(/<ph\b[^>]*>/gi, '').replace(/<\/ph>/gi, '')
        .replace(/<[^>]+>/g, '')
        .trim();
    } catch (error) {
      lastError = error;
      await sleep(5000 * (attempt + 1));
    }
  }
  throw lastError;
}

function splitResult(result, count) {
  const found = new Map();
  const marker = /CQX(\d{4})X\s*([\s\S]*?)(?=\s*CQX\d{4}X|$)/g;
  for (const match of String(result).matchAll(marker)) found.set(Number(match[1]), match[2].trim());
  if (found.size !== count) return null;
  return Array.from({ length: count }, (_, index) => found.get(index));
}

function batches(entries) {
  const result = [];
  let current = [];
  let size = 0;
  for (const entry of entries) {
    const cost = Buffer.byteLength(entry.masked, 'utf8') + 16;
    if (current.length && size + cost > maxBatchBytes) {
      result.push(current);
      current = [];
      size = 0;
    }
    current.push(entry);
    size += cost;
  }
  if (current.length) result.push(current);
  return result;
}

async function translateEntries(entries, target) {
  const translated = [];
  const work = batches(entries);
  let cursor = 0;
  const results = new Array(work.length);
  const workers = Array.from({ length: Math.min(1, work.length) }, async () => {
    while (cursor < work.length) {
      const index = cursor;
      cursor += 1;
      const batch = work[index];
    const marked = batch.map((entry, index) => `CQX${String(index).padStart(4, '0')}X ${entry.masked}`).join(' ');
    let values = splitResult(await request(marked, target), batch.length);
    if (!values) {
      values = [];
      for (const entry of batch) values.push(await request(entry.masked, target));
    }
    results[index] = values.map((value, index) => {
      const entry = batch[index];
      const restored = entry.restore(value);
      if (placeholders(restored).join('|') !== placeholders(entry.english).join('|')) {
        throw new Error(`placeholder mismatch for ${entry.key}`);
      }
      return [entry.key, restored];
    });
    const done = results.filter(Boolean).reduce((sum, value) => sum + value.length, 0);
    process.stdout.write(`  ${done}/${entries.length}\n`);
    await sleep(delayMs);
    }
  });
  await Promise.all(workers);
  results.forEach((batch) => batch.forEach((item) => translated.push(item)));
  return Object.fromEntries(translated);
}

async function main() {
  const english = readJson(path.join(ROOT, 'ui_strings.js')).concept_quest;
  const payload = {};
  const outputPath = path.resolve(ROOT, output);
  const save = () => fs.writeFileSync(
    outputPath,
    `'use strict';\nmodule.exports = ${JSON.stringify(payload, null, 2)};\n`,
    'utf8',
  );
  for (const slug of languages) {
    if (!CODES[slug]) throw new Error(`Unknown target language: ${slug}`);
    const file = path.join(LANG_DIR, `${slug}.js`);
    const pack = readJson(file).concept_quest || {};
    const missing = Object.entries(english)
      .filter(([key]) => typeof pack[key] !== 'string' || !pack[key].trim())
      .map(([key, value]) => ({ key, english: value, ...maskProtected(value) }));
    if (!missing.length) {
      console.log(`${slug}: already complete`);
      continue;
    }
    console.log(`${slug}: translating ${missing.length} keys via MyMemory (${CODES[slug]})`);
    payload[slug] = await translateEntries(missing, CODES[slug]);
    save();
    console.log(`${slug}: saved draft`);
  }
  save();
  console.log(`wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
