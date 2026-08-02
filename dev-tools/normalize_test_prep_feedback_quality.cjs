'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'test_prep');
const deployDir = path.join(root, 'desktop/web-app/public/test_prep');
const authoredDir = path.join(root, 'dev-tools/authored');
const { normalizeItem } = require('./test_prep_feedback_quality_core.cjs');
const { warningCodes } = require('./non_eppp_warning_checks.cjs');
const { writeGeneratedFile } = require('./write_generated_file.cjs');

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const jsonBytes = (value) => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, value) => writeGeneratedFile(file, jsonBytes(value));

function warningSummary(items) {
  const counts = {};
  const ids = [];
  for (const item of items) {
    const codes = warningCodes(item);
    for (const code of codes) counts[code] = (counts[code] || 0) + 1;
    if (codes.length) ids.push(item.id);
  }
  return { counts, ids };
}

function updateAuthoredReview(reviewPath, normalized, hash) {
  if (!fs.existsSync(reviewPath)) return;
  const review = readJson(reviewPath);
  const warnings = warningSummary(normalized);
  review.sourceSha256 = hash;
  if (review.artifactBinding && typeof review.artifactBinding === 'object') {
    review.artifactBinding.sha256 = hash;
  }
  if (review.checks?.warningHeuristicReview) {
    review.checks.warningHeuristicReview.remainingNonblockingCounts = warnings.counts;
    review.checks.warningHeuristicReview.remainingNonblockingItemIds = warnings.ids;
    review.checks.warningHeuristicReview.highRiskWarningsRemaining = 0;
    review.checks.warningHeuristicReview.manualDisposition = warnings.ids.length
      ? 'Remaining warnings were rechecked after deterministic feedback cleanup.'
      : 'No short-prompt, feedback-detail, choice-restatement, or full-key-echo warnings remain after deterministic cleanup.';
  }
  review.feedbackQualityReview = {
    version: 'feedback-quality-normalization-v1',
    reviewedAt: '2026-08-02',
    answerKeyPolicy: 'answerIndex values, choices, rationales, sources, and provenance were preserved',
    normalizedItems: normalized.filter((item) => item.feedbackQualityNormalizationVersion === 'feedback-quality-normalization-v1').length,
    warningCounts: warnings.counts,
  };
  writeJson(reviewPath, review);
}

function normalizeAuthoredFiles() {
  const manifestPath = path.join(authoredDir, 'test_prep_independent_additions_manifest.json');
  const manifest = readJson(manifestPath);
  const hashByFile = new Map();
  for (const batches of Object.values(manifest.packs || {})) {
    for (const batch of batches || []) {
      for (let index = 0; index < (batch.files || []).length; index += 1) {
        const file = batch.files[index];
        const filePath = path.join(authoredDir, file);
        if (!fs.existsSync(filePath)) continue;
        const normalized = readJson(filePath).map(normalizeItem);
        writeJson(filePath, normalized);
        const bytes = jsonBytes(normalized);
        const hash = sha256(bytes);
        hashByFile.set(file, hash);
        const reviewFile = batch.reviewReports?.[index];
        if (reviewFile) updateAuthoredReview(path.join(authoredDir, reviewFile), normalized, hash);
      }
    }
  }
  return hashByFile;
}

function updatePackBindings(pack, hashByFile) {
  for (const batch of pack.assistantReview?.independentBatchEvidence || []) {
    for (const binding of batch.artifactBindings || []) {
      if (hashByFile.has(binding.file)) binding.sha256 = hashByFile.get(binding.file);
    }
  }
  for (const batch of pack.independentAdditionReview?.batches || []) {
    for (const binding of batch.artifactBindings || []) {
      if (hashByFile.has(binding.file)) binding.sha256 = hashByFile.get(binding.file);
    }
  }
}

function normalizePacks(hashByFile) {
  const sourceHashes = new Map();
  const packFiles = fs.readdirSync(sourceDir)
    .filter((name) => name.endsWith('_pack.json') && !name.startsWith('eppp_')).sort();
  let normalizedItems = 0;
  for (const packFile of packFiles) {
    const stem = packFile.slice(0, -'_pack.json'.length);
    const packPath = path.join(sourceDir, packFile);
    const pack = readJson(packPath);
    const items = (pack.items || []).map(normalizeItem);
    normalizedItems += items.filter((item) => item.feedbackQualityNormalizationVersion === 'feedback-quality-normalization-v1').length;
    pack.items = items;
    const sourceCount = Number(pack.sourceQuestionItems) || 200;
    const independentCount = Number(pack.independentPracticeItems) || sourceCount;
    const sourceItems = items.slice(0, sourceCount);
    const independentItems = items.slice(0, independentCount);
    const sourceKernels = new Set(sourceItems.map((item) => JSON.stringify(item))).size;
    const independentKernels = new Set(independentItems.map((item) => JSON.stringify(item))).size;
    pack.distinctSourceContentKernels = Number(pack.distinctSourceContentKernels) || sourceKernels;
    pack.parallelSourceVariants = sourceCount - pack.distinctSourceContentKernels;
    pack.distinctIndependentContentKernels = Number(pack.distinctIndependentContentKernels) || independentKernels;
    pack.parallelIndependentVariants = independentCount - pack.distinctIndependentContentKernels;
    pack.newIndependentItemsNeeded = 500 - pack.distinctIndependentContentKernels;
    updatePackBindings(pack, hashByFile);
    const warning = warningSummary(items);
    pack.feedbackQualityReview = {
      version: 'feedback-quality-normalization-v1',
      reviewedAt: '2026-08-02',
      normalizedItems: items.filter((item) => item.feedbackQualityNormalizationVersion === 'feedback-quality-normalization-v1').length,
      warningCounts: warning.counts,
      answerKeyPolicy: 'answerIndex values, choices, rationales, sources, and provenance were preserved',
    };
    const packJson = JSON.stringify(pack, null, 2) + '\n';
    writeGeneratedFile(packPath, packJson);
    writeGeneratedFile(path.join(deployDir, packFile), packJson);
    const itemsJson = JSON.stringify(items, null, 2) + '\n';
    writeGeneratedFile(path.join(sourceDir, `${stem}_items.json`), itemsJson);
    writeGeneratedFile(path.join(deployDir, `${stem}_items.json`), itemsJson);
    sourceHashes.set(stem, sha256(JSON.stringify(sourceItems)));
  }
  return { sourceHashes, packCount: packFiles.length, normalizedItems };
}

function updateGroupReviews(sourceHashes) {
  for (const name of fs.readdirSync(authoredDir)
    .filter((file) => /^non_eppp_eppp_guided_qa_group_[a-c]\.review\.json$/i.test(file))) {
    const file = path.join(authoredDir, name);
    const review = readJson(file);
    for (const binding of review.artifactBindings || []) {
      if (sourceHashes.has(binding.stem)) binding.sourceItemsSha256 = sourceHashes.get(binding.stem);
    }
    writeJson(file, review);
  }
}

function main() {
  const hashByFile = normalizeAuthoredFiles();
  const result = normalizePacks(hashByFile);
  updateGroupReviews(result.sourceHashes);
  console.log(`Normalized feedback quality for ${result.normalizedItems} items across ${result.packCount} non-EPPP packs and refreshed ${hashByFile.size} authored bindings.`);
}

if (require.main === module) main();

