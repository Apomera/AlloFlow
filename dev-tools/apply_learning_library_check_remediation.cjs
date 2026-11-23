#!/usr/bin/env node
'use strict';

// Applies hand-authored remediation overrides to non-EPPP learning-library
// knowledgeChecks (eliminating lexical leakage, short prompts, extreme-word
// distractor asymmetry, and severe answer-length cues) and balances the 21
// 60-check Praxis learning libraries from 24/12/12/12 to exact 15/15/15/15
// answer-position distribution via deterministic cyclic choice rotation.
//
//   node dev-tools/apply_learning_library_check_remediation.cjs --check
//   node dev-tools/apply_learning_library_check_remediation.cjs --write

const fs = require('fs');
const path = require('path');
const { writeGeneratedFile } = require('./write_generated_file.cjs');
const { warningCodes, canonical } = require('./non_eppp_warning_checks.cjs');

const root = path.resolve(__dirname, '..');
const testPrepDir = path.join(root, 'test_prep');
const deployDir = path.join(root, 'desktop/web-app', 'public', 'test_prep');
const remDir = path.join(__dirname, 'learning_library_check_remediation');

function normalizeLookup(value) {
  return String(value || '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function rotateChoicesToTarget(ck, targetIndex) {
  const len = ck.choices.length;
  if (len !== 4 || ck.answerIndex === targetIndex) return ck;
  const shift = ((targetIndex - ck.answerIndex) % 4 + 4) % 4;
  const nextChoices = [0, 1, 2, 3].map((i) => ck.choices[(i - shift + 4) % 4]);
  const next = { ...ck, choices: nextChoices, answerIndex: targetIndex };
  if (Array.isArray(ck.choiceRationales) && ck.choiceRationales.length === 4) {
    next.choiceRationales = [0, 1, 2, 3].map((i) => ck.choiceRationales[(i - shift + 4) % 4]);
  }
  return next;
}

function main() {
  const write = process.argv.includes('--write');
  const byStem = {};
  if (fs.existsSync(remDir)) {
    for (const name of fs.readdirSync(remDir).filter((n) => n.endsWith('.cjs') && n !== 'index.cjs').sort()) {
      const mod = require(path.join(remDir, name));
      for (const [stem, checksMap] of Object.entries(mod)) {
        byStem[stem] = { ...(byStem[stem] || {}), ...checksMap };
      }
    }
  }

  const problems = [];
  let totalLibs = 0;
  let totalChecksChanged = 0;
  let totalWarnRemaining = 0;
  let totalSevRemaining = 0;

  const stems = Object.keys(byStem).sort();
  for (const stem of stems) {
    const fileName = stem + '_learning_library.json';
    const filePath = path.join(testPrepDir, fileName);
    if (!fs.existsSync(filePath)) {
      problems.push(`${stem}: missing ${fileName}`);
      continue;
    }
    totalLibs += 1;
    const lib = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const overrides = byStem[stem];
    const seenIds = new Set();
    const isPraxis60 = !stem.startsWith('ap_') && stem !== 'parapro' && stem !== 'eppp';
    const balanceAnswers = isPraxis60 || stem === 'ap_chemistry_foundation_pilot';
    let libChanged = 0;
    let globalIdx = 0;
    const promptSet = new Set();
    const ansDist = [0, 0, 0, 0];

    for (const ch of lib.chapters || []) {
      ch.knowledgeChecks = (ch.knowledgeChecks || []).map((ck) => {
        if (!Array.isArray(ck.choices) || ck.choices.length !== 4) return ck;
        const ov = overrides[ck.id];
        let next = { ...ck, choices: ck.choices.slice() };
        if (ov) {
          seenIds.add(ck.id);
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
              problems.push(`${stem}/${ck.id}: unmatched distractorReplacement(s): ${missing.join(' | ')}`);
            }
          }
        }
        if (balanceAnswers) {
          next = rotateChoicesToTarget(next, globalIdx % 4);
        }
        globalIdx += 1;

        ansDist[next.answerIndex] += 1;
        const canonPrompt = canonical(next.prompt);
        if (promptSet.has(canonPrompt)) problems.push(`${stem}/${next.id}: duplicate canonical prompt`);
        promptSet.add(canonPrompt);
        if (new Set(next.choices).size !== 4) problems.push(`${stem}/${next.id}: duplicate choices`);

        const codes = warningCodes(next);
        const kl = String(next.choices[next.answerIndex] || '').length;
        const md = Math.max(...next.choices.filter((_, i) => i !== next.answerIndex).map((c) => String(c || '').length));
        if (codes.length) {
          totalWarnRemaining += codes.length;
          problems.push(`${stem}/${next.id}: remaining warning(s): ${codes.join(', ')}`);
        }
        if (kl >= md * 1.25) {
          totalSevRemaining += 1;
          problems.push(`${stem}/${next.id}: severe length cue (${kl} vs ${md})`);
        }
        if (JSON.stringify(next) !== JSON.stringify(ck)) {
          libChanged += 1;
          totalChecksChanged += 1;
        }
        return next;
      });
    }

    const unknownIds = Object.keys(overrides).filter((id) => !seenIds.has(id));
    if (unknownIds.length) problems.push(`${stem}: unknown check id(s): ${unknownIds.join(', ')}`);
    if (isPraxis60 && ansDist.join('/') !== '15/15/15/15') {
      problems.push(`${stem}: expected 15/15/15/15 answer balance, got ${ansDist.join('/')}`);
    }
    if (stem === 'ap_chemistry_foundation_pilot' && ansDist.join('/') !== '7/7/7/6') {
      problems.push(`${stem}: expected 7/7/7/6 answer balance, got ${ansDist.join('/')}`);
    }

    console.log(stem.padEnd(48), String(Object.keys(overrides).length).padStart(3) + ' overrides', String(libChanged).padStart(3) + ' changed', 'ansDist:', ansDist.join('/'));

    if (write && libChanged > 0) {
      const json = JSON.stringify(lib, null, 2) + '\n';
      for (const dir of [testPrepDir, deployDir]) {
        writeGeneratedFile(path.join(dir, fileName), json, 'utf8');
      }
    }
  }

  console.log('SUMMARY:', { totalLibs, totalChecksChanged, totalWarnRemaining, totalSevRemaining });
  if (problems.length) {
    console.error('REFUSED (' + problems.length + '):');
    for (const p of problems.slice(0, 40)) console.error('  ' + p);
    process.exit(1);
  }
  if (!write) console.log('Check passed; nothing written.');
}

main();
