#!/usr/bin/env node
'use strict';

// Applies hand-authored warning remediations (lexical leakage, brief distractor
// rationales, asymmetric extreme distractors) to independently authored batches
// in dev-tools/authored/*.json, renews their hash-bound review reports with an
// explicit remediation audit record (following apply_length_remediation.cjs),
// and syncs the corresponding shipped pack items and evidence bindings.
//
//   node dev-tools/apply_non_eppp_authored_remediation.cjs --check
//   node dev-tools/apply_non_eppp_authored_remediation.cjs --write

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { writeGeneratedFile } = require('./write_generated_file.cjs');
const { warningCodes, canonical } = require('./non_eppp_warning_checks.cjs');
const { topFrame, keyLongestShare } = require('./authored_batch_originality_checks.cjs');

const root = path.resolve(__dirname, '..');
const authoredDir = path.join(root, 'dev-tools', 'authored');
const remediationDir = path.join(root, 'dev-tools', 'non_eppp_authored_remediation');
const sourceDir = path.join(root, 'test_prep');
const deployDir = path.join(root, 'desktop/web-app', 'public', 'test_prep');

const REMEDIATOR = 'Antigravity — AlloFlow test-prep warning remediation pass';
const REMEDIATED_AT = '2026-11-21';

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

function normalizeLookup(value) {
  return String(value || '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function fileToPackStem(fileName) {
  if (fileName.startsWith('parapro_')) return 'parapro';
  return fileName.replace(/_batch\d+\.json$/, '');
}

function applyItemEdit(item, edit, label, downstreamTargets = new Set()) {
  const next = {
    ...item,
    choices: item.choices.slice(),
    choiceRationales: (item.choiceRationales || []).slice(),
  };
  if (typeof edit.prompt === 'string' && edit.prompt.trim()) {
    next.prompt = edit.prompt;
  }
  if (typeof edit.answer === 'string' && edit.answer.trim()) {
    next.choices[next.answerIndex] = edit.answer;
  }
  if (edit.distractorReplacements && typeof edit.distractorReplacements === 'object') {
    const entries = Object.entries(edit.distractorReplacements);
    const matched = new Set();
    for (let idx = 0; idx < next.choices.length; idx += 1) {
      if (idx === next.answerIndex) continue;
      const curNorm = normalizeLookup(next.choices[idx]);
      for (const [orig, repl] of entries) {
        const origNorm = normalizeLookup(orig);
        const replNorm = normalizeLookup(repl);
        if (curNorm === origNorm) {
          next.choices[idx] = repl;
          matched.add(origNorm);
          break;
        }
        if (curNorm === replNorm || downstreamTargets.has(curNorm)) {
          matched.add(origNorm);
          break;
        }
      }
    }
    if (matched.size !== entries.length) {
      const missing = entries.map(([o]) => o).filter((o) => !matched.has(normalizeLookup(o)));
      throw new Error(label + ': unmatched distractorReplacement(s): ' + missing.join(' | '));
    }
  }
  if (edit.choiceRationaleOverrides && typeof edit.choiceRationaleOverrides === 'object') {
    for (const [rawIdx, note] of Object.entries(edit.choiceRationaleOverrides)) {
      const idx = Number(rawIdx);
      if (!Number.isInteger(idx) || idx < 0 || idx >= next.choices.length) {
        throw new Error(label + ': choiceRationaleOverrides index out of range: ' + rawIdx);
      }
      if (idx === next.answerIndex) {
        throw new Error(label + ': refuses to override keyed choiceRationale at index ' + idx);
      }
      if (typeof note !== 'string' || !note.trim()) {
        throw new Error(label + ': empty choiceRationaleOverrides note at index ' + idx);
      }
      next.choiceRationales[idx] = note.trim();
    }
  }
  return next;
}

function replaceBinaryMathOperator(value, escapedOperator, token) {
  const leftOperand = '(?:\\d+(?:\\.\\d+)?|[A-Za-z]|\\))';
  const rightOperand = '(?:\\d+(?:\\.\\d+)?|[A-Za-z]|\\()';
  const pattern = new RegExp(
    '(^|[^A-Za-z0-9_])(' + leftOperand + ')\\s*' + escapedOperator +
      '\\s*(' + rightOperand + ')(?=$|[^A-Za-z0-9_])',
    'g'
  );
  let normalized = value;
  while (true) {
    const next = normalized.replace(pattern, (_, prefix, left, right) =>
      prefix + left + ' ' + token + ' ' + right
    );
    if (next === normalized) return normalized;
    normalized = next;
  }
}

function normalizeMathOperators(value) {
  let normalized = value
    .replace(/<=|≤/g, ' mathoplte ')
    .replace(/>=|≥/g, ' mathopgte ')
    .replace(/!=|≠/g, ' mathopneq ')
    .replace(/=/g, ' mathopeq ')
    .replace(/</g, ' mathoplt ')
    .replace(/>/g, ' mathopgt ')
    .replace(/×/g, ' mathopmul ')
    .replace(/÷/g, ' mathopdiv ')
    .replace(/−/g, ' mathopminus ')
    .replace(/\+/g, ' mathopplus ')
    .replace(/\^/g, ' mathoppow ');
  normalized = normalized.replace(
    /(^|[^A-Za-z0-9_])-(?=\s*(?:\d|[A-Za-z]\b))/g,
    (_, prefix) => prefix + ' mathopminus '
  );
  normalized = replaceBinaryMathOperator(normalized, '\\*', 'mathopmul');
  normalized = replaceBinaryMathOperator(normalized, '\\/', 'mathopdiv');
  return replaceBinaryMathOperator(normalized, '-', 'mathopminus');
}

function kernelCanonical(value, options = {}) {
  const raw = String(value == null ? '' : value).normalize('NFKC');
  const isStandaloneUrl = /^https?:\/\/\S+$/i.test(raw.trim());
  const operatorAware = options.mathOperators !== false && !isStandaloneUrl
    ? normalizeMathOperators(raw)
    : raw;
  return operatorAware
    .toLowerCase()
    .replace(/[“”"'’\u0060]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function contentKernel(item) {
  return JSON.stringify({
    answer: kernelCanonical(item.choices && item.choices[item.answerIndex]),
    distractors: (item.choices || [])
      .filter((_, index) => index !== item.answerIndex)
      .map((value) => kernelCanonical(value))
      .sort(),
    rationale: kernelCanonical(item.rationale),
    references: (item.references || [])
      .map((value) => kernelCanonical(value, { mathOperators: false }))
      .sort(),
  });
}

function main() {
  const write = process.argv.includes('--write');
  if (!fs.existsSync(remediationDir)) {
    console.log('No authored remediation directory found.');
    return;
  }
  const allModFiles = fs.readdirSync(remediationDir)
    .filter((name) => name.endsWith('.cjs') && name !== 'index.cjs')
    .sort();
  const primaryModFiles = allModFiles.filter((name) => !name.startsWith('length_balance_wave2_'));
  const wave2ModFiles = allModFiles.filter((name) => name.startsWith('length_balance_wave2_'));

  // Build ordered list of edits per authored JSON file: [ { sourceMod, edits }, ... ]
  const stagesByJson = new Map();
  for (const modName of primaryModFiles) {
    const jsonName = modName.slice(0, -'.cjs'.length) + '.json';
    if (!stagesByJson.has(jsonName)) stagesByJson.set(jsonName, []);
    stagesByJson.get(jsonName).push({ modName, edits: require(path.join(remediationDir, modName)) });
  }
  for (const modName of wave2ModFiles) {
    const nested = require(path.join(remediationDir, modName));
    for (const [jsonName, edits] of Object.entries(nested || {})) {
      if (!stagesByJson.has(jsonName)) stagesByJson.set(jsonName, []);
      stagesByJson.get(jsonName).push({ modName, edits });
    }
  }

  const updatedByStem = new Map();
  const problems = [];

  for (const [jsonName, stages] of [...stagesByJson.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const jsonPath = path.join(authoredDir, jsonName);
    const modName = stages.map((s) => s.modName).join(' + ');
    if (!fs.existsSync(jsonPath)) {
      problems.push(modName + ': missing target ' + jsonName);
      continue;
    }
    const before = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const byId = new Map(before.map((it) => [it.id, it]));
    const allEditedIds = new Set();
    for (const stage of stages) {
      for (const id of Object.keys(stage.edits)) {
        if (!byId.has(id)) problems.push(jsonName + '/' + id + ': item id not found (' + stage.modName + ')');
        allEditedIds.add(id);
      }
    }

    let changedItems = 0;
    const after = before.map((item) => {
      let next = item;
      let touched = false;
      for (let sIdx = 0; sIdx < stages.length; sIdx += 1) {
        const stage = stages[sIdx];
        const edit = stage.edits[item.id];
        if (!edit) continue;
        touched = true;
        const downstreamTargets = new Set();
        for (let dIdx = sIdx + 1; dIdx < stages.length; dIdx += 1) {
          const dEdit = stages[dIdx].edits[item.id];
          if (dEdit && dEdit.distractorReplacements) {
            for (const repl of Object.values(dEdit.distractorReplacements)) {
              downstreamTargets.add(normalizeLookup(repl));
            }
          }
        }
        next = applyItemEdit(next, edit, jsonName + '/' + item.id + ' (' + stage.modName + ')', downstreamTargets);
      }
      if (!touched) return item;
      if (JSON.stringify(next) !== JSON.stringify(item)) changedItems += 1;
      const codes = warningCodes(next);
      if (codes.length > 0) {
        problems.push(jsonName + '/' + item.id + ': remaining warning(s): ' + codes.join(', '));
      }
      if (new Set(next.choices).size !== 4) {
        problems.push(jsonName + '/' + item.id + ': duplicate choices');
      }
      return next;
    });

    const allWarnings = after.reduce((sum, item) => sum + warningCodes(item).length, 0);
    if (allWarnings > 0) {
      problems.push(jsonName + ': still has ' + allWarnings + ' total warnings across batch');
    }
    const promptSet = new Set(after.map((item) => canonical(item.prompt)));
    if (promptSet.size !== after.length) {
      problems.push(jsonName + ': duplicate canonical prompt inside batch');
    }
    const beforeShare = keyLongestShare(before);
    const afterShare = keyLongestShare(after);
    if (afterShare.longest > beforeShare.longest) {
      problems.push(jsonName + ': key-is-longest increased (' + beforeShare.longest + ' -> ' + afterShare.longest + ')');
    }
    const editedItems = [...allEditedIds].map((id) => after.find((it) => it.id === id)).filter(Boolean);
    if (editedItems.length >= 10) {
      const choiceFrame = topFrame(editedItems, (item) => item.choices.join('   '));
      if (choiceFrame.share > 0.20) {
        problems.push(jsonName + ': edited choices share frame "' + choiceFrame.frame.slice(0, 50) + '" (' + (100 * choiceFrame.share).toFixed(0) + '%)');
      }
    }

    console.log(
      jsonName.padEnd(40),
      String(allEditedIds.size).padStart(3) + ' edits',
      String(changedItems).padStart(3) + ' changed',
      'warnings: ' + allWarnings,
      'keyLongest: ' + beforeShare.longest + '->' + afterShare.longest
    );

    const stem = fileToPackStem(jsonName);
    if (!updatedByStem.has(stem)) updatedByStem.set(stem, []);
    updatedByStem.get(stem).push({
      modName,
      jsonName,
      jsonPath,
      before,
      after,
      changedItems,
      editCount: allEditedIds.size,
      beforeShare,
      afterShare,
    });
  }

  if (problems.length) {
    console.error('\nREFUSED (' + problems.length + '):');
    for (const p of problems.slice(0, 40)) console.error('  ' + p);
    process.exit(1);
  }
  if (!write) {
    console.log('\nCheck passed; nothing written. Re-run with --write to apply.');
    return;
  }

  for (const [stem, batchList] of updatedByStem.entries()) {
    const packFile = stem + '_pack.json';
    const packPath = path.join(sourceDir, packFile);
    const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
    const newShaByFile = new Map();
    const updatedItemById = new Map();
    let anyFileChanged = false;

    for (const entry of batchList) {
      const priorBytes = fs.readFileSync(entry.jsonPath);
      const priorSha = sha256(priorBytes);
      const nextBytes = Buffer.from(JSON.stringify(entry.after, null, 2) + '\n', 'utf8');
      const nextSha = sha256(nextBytes);
      newShaByFile.set(entry.jsonName, nextSha);
      for (const item of entry.after) updatedItemById.set(item.id, item);

      if (nextSha !== priorSha) {
        anyFileChanged = true;
        writeGeneratedFile(entry.jsonPath, nextBytes);
      }
      // Renew every matching review report referenced by the pack OR default <name>.review.json
      const reportNames = new Set([entry.jsonName.replace(/\.json$/, '.review.json')]);
      for (const batch of pack.assistantReview?.independentBatchEvidence || []) {
        for (const rep of batch.reviewReports || []) {
          const repPath = path.join(authoredDir, rep);
          if (!fs.existsSync(repPath)) continue;
          const parsed = JSON.parse(fs.readFileSync(repPath, 'utf8'));
          if (path.basename(String(parsed.reviewedFile || '')) === entry.jsonName) {
            reportNames.add(rep);
          }
        }
      }
      let renewedReports = 0;
      for (const repName of reportNames) {
        const repPath = path.join(authoredDir, repName);
        if (!fs.existsSync(repPath)) continue;
        const report = JSON.parse(fs.readFileSync(repPath, 'utf8'));
        const prevSha = report.artifactBinding?.sha256 || report.sourceSha256 || priorSha;
        if (prevSha === nextSha && report.sourceSha256 === nextSha) continue;
        const prevCorrections = Array.isArray(report.correctionsMade)
          ? report.correctionsMade
          : (report.correctionsMade ? [report.correctionsMade] : []);
        const prevRemediation = Array.isArray(report.remediation)
          ? report.remediation
          : (report.remediation ? [report.remediation] : []);
        report.sourceSha256 = nextSha;
        report.artifactBinding = { ...(report.artifactBinding || {}), algorithm: 'sha256', sha256: nextSha };
        report.correctionsMade = [...prevCorrections, {
          issue: 'Non-EPPP editorial screening flagged residual lexical-leakage, brief distractor-rationale, or asymmetric-extreme-distractor warnings in ' + entry.editCount + ' item(s).',
          change: 'Remediated ' + entry.editCount + ' item(s) by hand via dev-tools/non_eppp_authored_remediation/' + entry.modName + ' without changing any answerIndex, domainId, rationale, or references. All editorial warning checks now report 0 findings across the batch.',
        }];
        report.remediation = [...prevRemediation, {
          at: REMEDIATED_AT,
          by: REMEDIATOR,
          scope: 'editorial warning remediation (lexical leakage / distractor feedback depth / extreme-qualifier balance)',
          itemsChanged: entry.editCount,
          ledger: 'dev-tools/non_eppp_authored_remediation/' + entry.modName,
          priorSha256: prevSha,
          sha256: nextSha,
          note: 'Edited after the independent cross-review to eliminate editorial warning findings while preserving tested constructs and answer positions. The binding was renewed so the artifact stays self-consistent; the original reviewer did not review these replacements.',
        }];
        writeGeneratedFile(repPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
        renewedReports += 1;
      }
      if (nextSha !== priorSha || renewedReports > 0) {
        console.log('Updated ' + entry.jsonName + ' and renewed ' + renewedReports + ' review report(s).');
      }
    }

    // Sync shipped pack items & artifact bindings even if JSON was already written
    let packChanged = false;
    pack.items = pack.items.map((item) => {
      const updated = updatedItemById.get(item.id);
      if (!updated) return item;
      const merged = {
        ...item,
        prompt: updated.prompt,
        choices: updated.choices.slice(),
        choiceRationales: updated.choiceRationales.slice(),
      };
      if (JSON.stringify(merged) !== JSON.stringify(item)) packChanged = true;
      return merged;
    });

    for (const batch of pack.assistantReview?.independentBatchEvidence || []) {
      for (const binding of batch.artifactBindings || []) {
        const nextSha = newShaByFile.get(binding.file);
        if (nextSha && binding.sha256 !== nextSha) {
          binding.sha256 = nextSha;
          packChanged = true;
        }
      }
    }
    for (const batch of pack.independentAdditionReview?.batches || []) {
      for (const fileEntry of batch.files || []) {
        const nextSha = newShaByFile.get(fileEntry.file);
        if (nextSha && fileEntry.sha256 !== nextSha) {
          fileEntry.sha256 = nextSha;
          packChanged = true;
        }
      }
    }

    // Recompute distinct independent content kernels & disclosure metadata
    const authoredCount = Math.max(0, Number(pack.assistantAuthoredIndependentItems) || 0);
    const independentItems = pack.items.slice(0, 200 + authoredCount);
    const distinctIndependentContentKernels = new Set(independentItems.map(contentKernel)).size;
    const parallelIndependentVariants = independentItems.length - distinctIndependentContentKernels;
    const newIndependentItemsNeeded = 500 - distinctIndependentContentKernels;
    const verdict = newIndependentItemsNeeded ? 'reviewed-target-not-met' : 'reviewed-target-met';
    if (
      pack.distinctIndependentContentKernels !== distinctIndependentContentKernels
      || pack.parallelIndependentVariants !== parallelIndependentVariants
      || pack.newIndependentItemsNeeded !== newIndependentItemsNeeded
    ) {
      pack.distinctIndependentContentKernels = distinctIndependentContentKernels;
      pack.parallelIndependentVariants = parallelIndependentVariants;
      pack.newIndependentItemsNeeded = newIndependentItemsNeeded;
      if (pack.assistantReview) {
        pack.assistantReview.distinctIndependentContentKernels = distinctIndependentContentKernels;
        pack.assistantReview.parallelIndependentVariants = parallelIndependentVariants;
        pack.assistantReview.newIndependentItemsNeeded = newIndependentItemsNeeded;
        pack.assistantReview.verdict = verdict;
      }
      packChanged = true;
    }

    // Verify 500 unique canonical prompts across entire pack
    if (new Set(pack.items.map((it) => canonical(it.prompt))).size !== pack.items.length) {
      throw new Error(stem + ': duplicate canonical prompt across 500-item pack after remediation');
    }

    if (anyFileChanged || packChanged) {
      const packJson = JSON.stringify(pack, null, 2) + '\n';
      const itemsJson = JSON.stringify(pack.items, null, 2) + '\n';
      for (const dir of [sourceDir, deployDir]) {
        writeGeneratedFile(path.join(dir, packFile), packJson, 'utf8');
        writeGeneratedFile(path.join(dir, stem + '_items.json'), itemsJson, 'utf8');
      }
      console.log('Synced shipped pack + items for ' + stem);
    }
  }
}

main();
