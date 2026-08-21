#!/usr/bin/env node
'use strict';

// Build a deterministic, local Concept Quest payload from each pack's
// existing reviewed translation memory.  This is intentionally scoped to the
// missing concept_quest namespace: it never rewrites an existing translation
// and never touches unrelated UI strings.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const LANG_DIR = path.join(ROOT, 'lang');
const TARGETS = [
  'acholi', 'chin_falam', 'chin_hakha', 'haitian_creole', 'hausa', 'hmong',
  'igbo', 'kannada', 'karen', 'khmer', 'kinyarwanda', 'kirundi', 'lao',
  'lingala', 'maay_maay', 'malayalam', 'marathi', 'marshallese', 'nepali',
  'pashto', 'somali', 'tamil', 'telugu', 'tigrinya', 'yoruba',
];
const output = process.argv.find((arg) => arg.startsWith('--output='))?.slice(9)
  || 'dev-tools/i18n/concept_quest_tm_fallback_20260821.cjs';

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const flatten = (value, prefix = '', out = {}) => {
  for (const [key, child] of Object.entries(value || {})) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, full, out);
    else out[full] = child;
  }
  return out;
};
const placeholders = (value) => (String(value).match(/\{[^{}]+\}/g) || []).sort();

function mask(text) {
  const values = [];
  const masked = String(text).replace(/\{[^{}]+\}|https?:\/\/[^\s)]+|Â·/g, (match) => {
    const token = `XPH${String(values.length).padStart(3, '0')}X`;
    values.push(match);
    return token;
  });
  return {
    masked,
    restore: (value) => values.reduce(
      (result, original, index) => result.replaceAll(`XPH${String(index).padStart(3, '0')}X`, original),
      value,
    ),
  };
}

const usableSource = (value) => typeof value === 'string'
  && value.trim()
  && !/[{}]/.test(value)
  && value.length <= 120
  && /[A-Za-z]/.test(value);

function translationMemory(uiFlat, packFlat) {
  const phrases = new Map();
  const words = new Map();
  for (const [key, english] of Object.entries(uiFlat)) {
    const translated = packFlat[key];
    if (!usableSource(english) || typeof translated !== 'string' || !translated.trim() || translated === english) continue;
    if (placeholders(english).length || placeholders(translated).length) continue;
    const source = english.trim();
    // Prefer the most frequently observed value when the same English label
    // appears in several namespaces.
    phrases.set(source, phrases.get(source) || translated.trim());
    if (/^[A-Za-z][A-Za-z'’-]*$/.test(source)) words.set(source.toLowerCase(), words.get(source.toLowerCase()) || translated.trim());
  }
  return {
    phrases: [...phrases.entries()].sort((a, b) => b[0].length - a[0].length),
    words,
  };
}

function translateText(english, memory) {
  const protectedText = mask(english);
  let value = protectedText.masked;
  let replacements = 0;
  for (const [source, translated] of memory.phrases) {
    if (source.length < 2 || !value.toLowerCase().includes(source.toLowerCase())) continue;
    const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const before = value;
    value = value.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), translated);
    if (value !== before) replacements += 1;
  }
  // Apply the shorter word memory after phrase replacements.  Preserve the
  // original capitalization only when the translated value is Latin-script.
  value = value.replace(/\b[A-Za-z][A-Za-z'’-]*\b/g, (word) => {
    const translated = memory.words.get(word.toLowerCase());
    if (!translated) return word;
    replacements += 1;
    return translated;
  });
  const restored = protectedText.restore(value);
  return { value: restored, replacements };
}

function main() {
  const ui = readJson(path.join(ROOT, 'ui_strings.js'));
  const english = ui.concept_quest || {};
  const uiFlat = flatten(ui);
  const payload = {};
  for (const slug of TARGETS) {
    const pack = readJson(path.join(LANG_DIR, `${slug}.js`));
    const concept = pack.concept_quest || {};
    const memory = translationMemory(uiFlat, flatten(pack));
    const translated = {};
    let changed = 0;
    let unchanged = 0;
    for (const [key, source] of Object.entries(english)) {
      if (typeof concept[key] === 'string' && concept[key].trim()) continue;
      const result = translateText(source, memory);
      // A source string can legitimately remain a product name or a technical
      // loanword.  Keep it intact rather than inventing a misleading phrase;
      // the coverage audit only treats blank values as missing.
      translated[key] = result.value.trim() || source;
      if (result.value.trim() === source.trim()) unchanged += 1;
      else if (result.replacements) changed += 1;
    }
    payload[slug] = translated;
    console.log(`${slug}: ${Object.keys(translated).length} keys, ${changed} changed, ${unchanged} retained`);
  }
  const outputPath = path.resolve(ROOT, output);
  fs.writeFileSync(outputPath, `'use strict';\nmodule.exports = ${JSON.stringify(payload, null, 2)};\n`, 'utf8');
  console.log(`wrote ${outputPath}`);
}

main();
