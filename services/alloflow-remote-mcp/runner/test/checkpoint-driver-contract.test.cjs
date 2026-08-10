'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..', '..', '..', '..');
const driver = fs.readFileSync(
  path.join(repoRoot, 'desktop', 'mcp', 'remediation_headless_driver.cjs'),
  'utf8',
);
const pipeline = fs.readFileSync(
  path.join(repoRoot, 'doc_pipeline_module.js'),
  'utf8',
);

test('canonical extraction checkpoint is awaited before downstream image work', () => {
  const hook = pipeline.indexOf(
    "const _onCheckpoint = batchOverrides && typeof batchOverrides.onCheckpoint === 'function'",
  );
  const extraction = pipeline.indexOf('await _onCheckpoint({', hook);
  const stage = pipeline.indexOf("stage: 'extraction'", extraction);
  const imageWork = pipeline.indexOf('_extractPdfImages(', extraction);

  assert.ok(hook >= 0, 'canonical fix pipeline must accept the optional hook');
  assert.ok(extraction > hook, 'extraction snapshot must await the host commit');
  assert.ok(stage > extraction, 'extraction snapshot must identify its stage');
  assert.ok(
    imageWork > stage,
    'snapshot commit must finish before downstream image/model work',
  );
  const snapshot = pipeline.slice(extraction, imageWork);
  for (const field of [
    'documentDigest',
    'groundTruthCharCount',
    'groundTruthPages',
    'ocrTesseractText',
    'ocrVisionText',
    'ocrPageErrors',
    'ocrLowConfidencePages',
    'visionStripTrail',
  ]) {
    assert.match(snapshot, new RegExp('\\b' + field + '\\b'));
  }
});

test('driver restores extraction evidence, reruns full audit, and emits bound states', () => {
  assert.match(
    driver,
    /if \(typeof runOpts\.onCheckpoint === 'function'\)[\s\S]*page\.exposeFunction\('__mcpCheckpoint'/,
  );
  assert.match(
    driver,
    /page\.evaluate\(async \(\{[^}]*resumeCheckpoint[^}]*\}\) =>/,
  );
  assert.match(
    driver,
    /if \(!auditView\) throw new Error\('checkpoint_snapshot_invalid'\)/,
  );
  assert.match(
    driver,
    /typeof snapshot\.extraction\.text !== 'string'\) throw new Error\('checkpoint_snapshot_invalid'\)/,
  );

  const extractionResume = driver.indexOf("resume.stage === 'extraction'");
  const extractionEnd = driver.indexOf(
    "} else if (resume && resume.schema === 1",
    extractionResume,
  );
  const extractionBranch = driver.slice(extractionResume, extractionEnd);
  assert.match(extractionBranch, /window\.__resumeExtractedText =/);
  const seedStart = extractionBranch.indexOf('window.__resumeExtractedText =');
  const seedEnd = extractionBranch.indexOf('resumeExtractionApplied = true', seedStart);
  const seed = extractionBranch.slice(seedStart, seedEnd);
  for (const field of [
    'groundTruthCharCount',
    'groundTruthPages',
    'groundTruthMethod',
    'ocrMethod',
    'ocrTesseractText',
    'ocrVisionText',
    'ocrDisagreements',
    'ocrPageErrors',
    'ocrLowConfidencePages',
    'detectedFolios',
    'ocrDupeCollapses',
    'ocrColumnReorders',
    'strippedEdgeLines',
    'visionStripTrail',
  ]) {
    assert.match(seed, new RegExp('\\b' + field + '\\b'));
  }
  assert.doesNotMatch(
    extractionBranch,
    /window\.__last(?:GroundTruth|Ocr)|window\.__allo(?:DetectedFolios|Ocr|StrippedEdgeLines)/,
    'evidence must travel in the seed because the canonical fix resets globals',
  );
  assert.doesNotMatch(
    extractionBranch,
    /audit = restoredAudit/,
    'bounded audit summary must never replace the full baseline audit',
  );

  const fullAudit = driver.indexOf(
    'audit = await pipeline.runPdfAccessibilityAudit',
    extractionEnd,
  );
  const fix = driver.indexOf(
    'cur = await pipeline.fixAndVerifyPdf(fixOptions)',
    fullAudit,
  );
  assert.ok(fullAudit > extractionEnd);
  assert.ok(fix > fullAudit);

  const canonicalFix = pipeline.indexOf('const fixAndVerifyPdf = async');
  const evidenceReset = pipeline.indexOf('window.__lastGroundTruthPageMap = null', canonicalFix);
  const identityGate = pipeline.indexOf('const _seedKeyMismatch', evidenceReset);
  const garbageGate = pipeline.indexOf('_textLayerLooksGarbage(_seed.text)', identityGate);
  const seedAccepted = pipeline.indexOf('extractedText = _seed.text', garbageGate);
  const evidenceRestore = pipeline.indexOf('_restoreOcrEvidenceGlobals(_seed)', seedAccepted);
  assert.ok(canonicalFix >= 0);
  assert.ok(evidenceReset > canonicalFix);
  assert.ok(identityGate > evidenceReset);
  assert.ok(garbageGate > identityGate);
  assert.ok(seedAccepted > garbageGate);
  assert.ok(
    evidenceRestore > seedAccepted,
    'accepted resume seed must restore its OCR/page evidence after the reset',
  );

  const rebind = driver.indexOf(
    'cur = await pipeline.rehydrateVerificationHtmlBinding(cur)',
    fix,
  );
  const bindingGate = driver.indexOf(
    'Canonical verification binding could not be restored.',
    rebind,
  );
  const primary = driver.indexOf("stage: 'primary'", bindingGate);
  assert.ok(rebind > fix);
  assert.ok(bindingGate > rebind);
  assert.ok(primary > bindingGate);
});

test('driver checkpoints only an accepted finalized round and resumes after it', () => {
  const finalized = driver.indexOf(
    'merged = await pipeline.finalizeRemediationRound',
  );
  const regressionGate = driver.indexOf(
    'if (!roundOut._auditOnly && _regressed)',
    finalized,
  );
  const accepted = driver.indexOf('cur = merged', regressionGate);
  const roundCheckpoint = driver.indexOf("stage: 'round'", accepted);
  const nextRound = driver.indexOf('nextRound: round + 1', roundCheckpoint);
  const awaited = driver.lastIndexOf('await emitCheckpoint({', roundCheckpoint);
  const auditOnlyBreak = driver.indexOf(
    'if (roundOut._auditOnly) break',
    roundCheckpoint,
  );

  assert.ok(finalized >= 0);
  assert.ok(regressionGate > finalized);
  assert.ok(accepted > regressionGate);
  assert.ok(roundCheckpoint > accepted);
  assert.ok(awaited > accepted && awaited < roundCheckpoint);
  assert.ok(nextRound > roundCheckpoint);
  assert.ok(auditOnlyBreak > nextRound);
});

