#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { writeGeneratedFile } = require('./write_generated_file.cjs');
const { warningCodes } = require('./non_eppp_warning_checks.cjs');

const root = path.resolve(__dirname, '..');
const testPrepDir = path.join(root, 'test_prep');
const deployDir = path.join(root, 'desktop/web-app', 'public', 'test_prep');
const remDir = path.join(__dirname, 'eppp_kc_remediation');

function normalizeLookup(value) {
  return String(value || '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function main() {
  const write = process.argv.includes('--write');
  const overrides = {};
  for (const name of fs.readdirSync(remDir).filter((n) => n.endsWith('.cjs') && n !== 'index.cjs').sort()) {
    Object.assign(overrides, require(path.join(remDir, name)));
  }

  const seenIds = new Set();
  const problems = [];
  let totalItems = 0, totalChanged = 0, totalTied = 0, totalStrict = 0, totalSev = 0, totalWarn = 0;

  for (let w = 1; w <= 9; w += 1) {
    const fileName = `eppp_knowledge_check_review_wave_0${w}.json`;
    const filePath = path.join(testPrepDir, fileName);
    const wave = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let waveChanged = 0;

    wave.items = wave.items.map((item) => {
      totalItems += 1;
      const ov = overrides[item.legacyId];
      if (!ov) {
        const kl = item.choices[item.answerIndex].length;
        const md = Math.max(...item.choices.filter((_, i) => i !== item.answerIndex).map((c) => c.length));
        if (kl >= md) totalTied += 1;
        if (kl > md) totalStrict += 1;
        if (kl >= md * 1.25) totalSev += 1;
        totalWarn += warningCodes(item).length;
        return item;
      }
      seenIds.add(item.legacyId);
      const next = { ...item, choices: item.choices.slice() };
      if (typeof ov.prompt === 'string' && ov.prompt.trim()) next.prompt = ov.prompt.trim();
      if (typeof ov.answer === 'string' && ov.answer.trim()) next.choices[next.answerIndex] = ov.answer.trim();
      if (ov.distractorReplacements && typeof ov.distractorReplacements === 'object') {
        const entries = Object.entries(ov.distractorReplacements);
        const matched = new Set();
        for (let idx = 0; idx < next.choices.length; idx += 1) {
          if (idx === next.answerIndex) continue;
          const curNorm = normalizeLookup(next.choices[idx]);
          for (const [orig, repl] of entries) {
            const origNorm = normalizeLookup(orig);
            const replNorm = normalizeLookup(repl);
            if (curNorm === origNorm) {
              next.choices[idx] = repl.trim();
              matched.add(origNorm);
              break;
            }
            if (curNorm === replNorm) {
              matched.add(origNorm);
              break;
            }
          }
        }
        if (matched.size !== entries.length) {
          const missing = entries.map(([o]) => o).filter((o) => !matched.has(normalizeLookup(o)));
          problems.push(`${fileName}/${item.legacyId}: unmatched distractorReplacement(s): ${missing.join(' | ')}`);
        }
      }

      if (next.prompt.length <= 70) problems.push(`${fileName}/${item.legacyId}: prompt <= 70 chars`);
      if (next.choices.some((c) => c.length <= 55)) problems.push(`${fileName}/${item.legacyId}: choice <= 55 chars`);
      if (new Set(next.choices).size !== 4) problems.push(`${fileName}/${item.legacyId}: duplicate choices`);
      const codes = warningCodes(next);
      if (codes.length) problems.push(`${fileName}/${item.legacyId}: warnings: ${codes.join(', ')}`);

      const kl = next.choices[next.answerIndex].length;
      const md = Math.max(...next.choices.filter((_, i) => i !== next.answerIndex).map((c) => c.length));
      if (kl >= md) totalTied += 1;
      if (kl > md) totalStrict += 1;
      if (kl >= md * 1.25) totalSev += 1;
      totalWarn += codes.length;

      if (JSON.stringify(next) !== JSON.stringify(item)) {
        waveChanged += 1;
        totalChanged += 1;
      }
      return next;
    });

    if (write && waveChanged > 0) {
      const json = JSON.stringify(wave, null, 2) + '\n';
      writeGeneratedFile(filePath, json, 'utf8');
      const deployPath = path.join(deployDir, fileName);
      if (fs.existsSync(deployPath)) writeGeneratedFile(deployPath, json, 'utf8');
      console.log(`Updated ${fileName} (${waveChanged} items)`);
    }
  }

  const missingIds = Object.keys(overrides).filter((id) => !seenIds.has(id));
  if (missingIds.length) problems.push(`Unknown legacyId(s): ${missingIds.join(', ')}`);

  console.log('SUMMARY:', { totalItems, totalChanged, totalTied, totalStrict, totalSev, totalWarn });
  if (problems.length) {
    console.error('REFUSED (' + problems.length + '):');
    for (const p of problems.slice(0, 30)) console.error('  ' + p);
    process.exit(1);
  }
  if (!write) console.log('Check passed; nothing written.');
}

main();
