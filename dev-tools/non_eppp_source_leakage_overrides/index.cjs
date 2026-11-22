'use strict';

const fs = require('fs');
const path = require('path');

function normalizeLookup(value) {
  return String(value || '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

const cache = new Map();

function listCoveredStems() {
  return fs.readdirSync(__dirname)
    .filter((name) => name.endsWith('.cjs') && name !== 'index.cjs')
    .map((name) => name.slice(0, -'.cjs'.length))
    .sort();
}

function loadOverridesForStem(stem) {
  if (cache.has(stem)) return cache.get(stem);
  const filePath = path.join(__dirname, stem + '.cjs');
  if (!fs.existsSync(filePath)) {
    cache.set(stem, null);
    return null;
  }
  const mod = require(filePath);
  cache.set(stem, mod);
  return mod;
}

function applySourceLeakageOverride(stem, item) {
  const stemOverrides = loadOverridesForStem(stem);
  if (!stemOverrides) return item;
  const ov = stemOverrides[item.id];
  if (!ov) return item;
  const next = { ...item, choices: item.choices.slice() };
  if (typeof ov.prompt === 'string' && ov.prompt.trim()) {
    next.prompt = ov.prompt;
  }
  if (typeof ov.answer === 'string' && ov.answer.trim()) {
    next.choices[next.answerIndex] = ov.answer;
  }
  if (ov.distractorReplacements && typeof ov.distractorReplacements === 'object') {
    const entries = Object.entries(ov.distractorReplacements);
    const matched = new Set();
    for (let idx = 0; idx < next.choices.length; idx += 1) {
      if (idx === next.answerIndex) continue;
      const currentNorm = normalizeLookup(next.choices[idx]);
      for (const [orig, repl] of entries) {
        const origNorm = normalizeLookup(orig);
        const replNorm = normalizeLookup(repl);
        if (currentNorm === origNorm) {
          next.choices[idx] = repl;
          matched.add(origNorm);
          break;
        }
        if (currentNorm === replNorm) {
          matched.add(origNorm);
          break;
        }
      }
    }
    if (matched.size !== entries.length) {
      const missing = entries
        .map(([orig]) => orig)
        .filter((orig) => !matched.has(normalizeLookup(orig)));
      throw new Error(stem + '/' + item.id + ': unmatched distractorReplacement(s): ' + missing.join(' | '));
    }
  }
  return next;
}

module.exports = {
  normalizeLookup,
  listCoveredStems,
  loadOverridesForStem,
  applySourceLeakageOverride,
};
