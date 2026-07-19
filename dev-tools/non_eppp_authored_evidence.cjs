'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const HASH_BOUND_REVIEW_PROFILE = 'hash-bound-independent-cross-review-v1';
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

function safeAuthoredPath(authoredDir, file, label, findings) {
  if (!file || path.basename(file) !== file || !/^[A-Za-z0-9_.-]+$/.test(file)) {
    findings.push(`${label}: unsafe authored evidence path ${String(file)}`);
    return null;
  }
  return path.join(authoredDir, file);
}

function comparableItem(item) {
  return {
    id: item.id,
    type: item.type,
    domainId: item.domainId,
    prompt: item.prompt,
    choices: item.choices,
    answerIndex: item.answerIndex,
    rationale: item.rationale,
    choiceRationales: item.choiceRationales,
    skillIds: item.skillIds,
    chapterIds: item.chapterIds,
    references: item.references,
    difficulty: item.difficulty,
    cognitiveLevel: item.cognitiveLevel,
  };
}

function validateAuthoredEvidence({ pack, stem, root }) {
  const findings = [];
  const snapshotPaths = [];
  const authoredDir = path.join(root, 'dev-tools', 'authored');
  const sourceCount = Number(pack.sourceQuestionItems) || 200;
  const authoredCount = Number(pack.assistantAuthoredIndependentItems) || 0;
  const independentCount = Number(pack.independentPracticeItems) || sourceCount + authoredCount;
  const batches = pack.assistantReview?.independentBatchEvidence;

  if (!authoredCount) {
    if (Array.isArray(batches) && batches.length) findings.push(`${stem}: zero authored items but authored review evidence is present`);
    return { findings, snapshotPaths };
  }
  if (!Array.isArray(batches) || !batches.length) {
    findings.push(`${stem}: authored items lack independent batch review evidence`);
    return { findings, snapshotPaths };
  }

  const loadedItems = [];
  const seenFiles = new Set();
  for (const batch of batches) {
    const label = `${stem}/${String(batch?.id || 'unnamed-batch')}`;
    const files = Array.isArray(batch?.files) ? batch.files : [];
    const reports = Array.isArray(batch?.reviewReports) ? batch.reviewReports : [];
    const bindings = Array.isArray(batch?.artifactBindings) ? batch.artifactBindings : [];
    if (!files.length || files.length !== bindings.length || !reports.length) {
      findings.push(`${label}: file, binding, or review-report inventory is incomplete`);
      continue;
    }

    const bindingByFile = new Map(bindings.map((binding) => [binding.file, binding]));
    const fileItems = new Map();
    for (const file of files) {
      if (seenFiles.has(file)) findings.push(`${label}: duplicate authored file ${file}`);
      seenFiles.add(file);
      const filePath = safeAuthoredPath(authoredDir, file, label, findings);
      if (!filePath || !fs.existsSync(filePath)) {
        findings.push(`${label}: missing authored file ${file}`);
        continue;
      }
      snapshotPaths.push(filePath);
      const bytes = fs.readFileSync(filePath);
      let items;
      try { items = JSON.parse(bytes); } catch { findings.push(`${label}: invalid JSON in ${file}`); continue; }
      const binding = bindingByFile.get(file);
      if (!Array.isArray(items) || !binding || binding.algorithm !== 'sha256'
          || binding.sha256 !== sha256(bytes) || binding.itemCount !== items.length) {
        findings.push(`${label}: stale or invalid artifact binding for ${file}`);
        continue;
      }
      fileItems.set(file, items);
      loadedItems.push(...items);
    }

    for (const reportFile of reports) {
      const reportPath = safeAuthoredPath(authoredDir, reportFile, label, findings);
      if (!reportPath || !fs.existsSync(reportPath)) {
        findings.push(`${label}: missing review report ${reportFile}`);
        continue;
      }
      snapshotPaths.push(reportPath);
      let report;
      try { report = JSON.parse(fs.readFileSync(reportPath)); } catch { findings.push(`${label}: invalid review JSON in ${reportFile}`); continue; }
      if (!/^pass\b/i.test(String(report.verdict || '')) || !/OpenAI Codex/i.test(String(report.reviewer || ''))
          || report.reviewedAt !== batch.reviewedAt || (report.blockers || []).length) {
        findings.push(`${label}: review report ${reportFile} is not a current, blocker-free passing review`);
      }
      if (batch.reviewEvidenceProfile === HASH_BOUND_REVIEW_PROFILE) {
        const reviewedFile = path.basename(String(report.reviewedFile || ''));
        const binding = bindingByFile.get(reviewedFile);
        const reviewedItems = fileItems.get(reviewedFile);
        const lineReview = Object.entries(report.checks || {})
          .find(([key, value]) => /^lineByLine.*Review$/.test(key) && value?.status === 'pass')?.[1];
        if (!binding || !reviewedItems || report.itemCount !== reviewedItems.length
            || report.artifactBinding?.algorithm !== 'sha256'
            || report.artifactBinding?.sha256 !== binding.sha256 || !lineReview) {
          findings.push(`${label}: hash-bound cross-review ${reportFile} does not match its authored artifact`);
        }
      }
    }
  }

  if (loadedItems.length !== authoredCount) {
    findings.push(`${stem}: evidence covers ${loadedItems.length} authored items, expected ${authoredCount}`);
  } else {
    const released = pack.items.slice(sourceCount, independentCount).map(comparableItem);
    const authored = loadedItems.map(comparableItem);
    if (JSON.stringify(released) !== JSON.stringify(authored)) {
      findings.push(`${stem}: released authored tier does not match the hash-bound authored files`);
    }
  }
  return { findings, snapshotPaths: [...new Set(snapshotPaths)] };
}

module.exports = { HASH_BOUND_REVIEW_PROFILE, comparableItem, validateAuthoredEvidence };
