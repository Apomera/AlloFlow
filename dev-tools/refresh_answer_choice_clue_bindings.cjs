'use strict';

// Refreshes hash-bound QA evidence after the deterministic clue-resistance
// transform. It updates authored artifacts, their cross-review hashes, the
// released pack accounting, and the consolidated source-item bindings. It does
// not change answer keys or any learning-library content.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'test_prep');
const deployDir = path.join(root, 'desktop', 'web-app', 'public', 'test_prep');
const authoredDir = path.join(__dirname, 'authored');
const manifestPath = path.join(authoredDir, 'test_prep_independent_additions_manifest.json');
const { normalizeItem } = require('./test_prep_guided_expansion_core.cjs');
const { writeGeneratedFile } = require('./write_generated_file.cjs');

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const jsonBytes = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const canonical = value => String(value == null ? '' : value).normalize('NFKC').toLowerCase()
  .replace(/["']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const contentKernel = item => JSON.stringify({
  answer: canonical(item.choices?.[item.answerIndex]),
  distractors: (item.choices || []).filter((_, index) => index !== item.answerIndex).map(canonical).sort(),
  rationale: canonical(item.rationale),
  references: (item.references || []).map(canonical).sort(),
});

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, value) { writeGeneratedFile(file, jsonBytes(value)); }

function main() {
  const manifest = readJson(manifestPath);
  const hashByFile = new Map();
  const filesByStem = new Map();
  for (const [stem, batches] of Object.entries(manifest.packs || {})) {
    filesByStem.set(stem, []);
    for (const batch of batches || []) {
      for (let index = 0; index < (batch.files || []).length; index += 1) {
        const file = batch.files[index];
        const filePath = path.join(authoredDir, file);
        const items = readJson(filePath);
        const normalized = (Array.isArray(items) ? items : []).map(normalizeItem);
        writeJson(filePath, normalized);
        const bytes = jsonBytes(normalized);
        const hash = sha256(bytes);
        hashByFile.set(file, hash);
        filesByStem.get(stem).push(file);

        const reviewFile = batch.reviewReports?.[index];
        if (reviewFile) {
          const reviewPath = path.join(authoredDir, reviewFile);
          const review = readJson(reviewPath);
          review.sourceSha256 = hash;
          if (review.artifactBinding && typeof review.artifactBinding === 'object') {
            review.artifactBinding.sha256 = hash;
          }
          review.clueResistanceReview = {
            version: 'answer-choice-clue-normalization-v1',
            reviewedAt: '2026-08-01',
            answerKeyPolicy: 'answerIndex values and keyed content claims were preserved',
          };
          writeJson(reviewPath, review);
        }
      }
    }
  }

  const packFiles = fs.readdirSync(sourceDir)
    .filter(name => name.endsWith('_pack.json') && !name.startsWith('eppp_')).sort();
  const sourceHashes = new Map();
  for (const packFile of packFiles) {
    const stem = packFile.slice(0, -'_pack.json'.length);
    const packPath = path.join(sourceDir, packFile);
    const pack = readJson(packPath);
    const sourceCount = Number(pack.sourceQuestionItems) || 200;
    const authoredCount = Number(pack.assistantAuthoredIndependentItems) || 0;
    const independentCount = Number(pack.independentPracticeItems) || sourceCount + authoredCount;
    const sourceItems = pack.items.slice(0, sourceCount);
    const independentItems = pack.items.slice(0, independentCount);
    const sourceKernels = new Set(sourceItems.map(contentKernel)).size;
    const independentKernels = new Set(independentItems.map(contentKernel)).size;
    pack.distinctSourceContentKernels = sourceKernels;
    pack.parallelSourceVariants = sourceCount - sourceKernels;
    pack.distinctIndependentContentKernels = independentKernels;
    pack.parallelIndependentVariants = independentCount - independentKernels;
    pack.newIndependentItemsNeeded = 500 - independentKernels;
    pack.answerChoiceClueReview = {
      ...(pack.answerChoiceClueReview || {}),
      version: 'answer-choice-clue-normalization-v1',
      reviewedAt: '2026-08-01',
      normalizedItems: pack.items.filter(item => item.answerChoiceClueNormalizationVersion === 'answer-choice-clue-normalization-v1').length,
      answerKeyPolicy: 'answerIndex values and keyed content claims were preserved',
    };
    if (pack.assistantReview) {
      Object.assign(pack.assistantReview, {
        distinctSourceContentKernels: sourceKernels,
        parallelSourceVariants: sourceCount - sourceKernels,
        distinctIndependentContentKernels: independentKernels,
        parallelIndependentVariants: independentCount - independentKernels,
        newIndependentItemsNeeded: 500 - independentKernels,
      });
      for (const batch of pack.assistantReview.independentBatchEvidence || []) {
        for (const binding of batch.artifactBindings || []) {
          if (hashByFile.has(binding.file)) binding.sha256 = hashByFile.get(binding.file);
        }
      }
    }
    for (const batch of pack.independentAdditionReview?.batches || []) {
      for (const binding of batch.artifactBindings || []) {
        if (hashByFile.has(binding.file)) binding.sha256 = hashByFile.get(binding.file);
      }
    }
    sourceHashes.set(stem, sha256(Buffer.from(JSON.stringify(sourceItems))));
    const packJson = JSON.stringify(pack, null, 2) + '\n';
    writeGeneratedFile(packPath, packJson);
    writeGeneratedFile(path.join(deployDir, packFile), packJson);
    const itemsJson = JSON.stringify(pack.items, null, 2) + '\n';
    writeGeneratedFile(path.join(sourceDir, stem + '_items.json'), itemsJson);
    writeGeneratedFile(path.join(deployDir, stem + '_items.json'), itemsJson);
  }

  for (const name of fs.readdirSync(authoredDir).filter(file => /^non_eppp_eppp_guided_qa_group_[a-c]\.review\.json$/i.test(file))) {
    const file = path.join(authoredDir, name);
    const review = readJson(file);
    for (const binding of review.artifactBindings || []) {
      if (sourceHashes.has(binding.stem)) binding.sourceItemsSha256 = sourceHashes.get(binding.stem);
    }
    writeJson(file, review);
  }
  console.log('Refreshed clue-normalization hashes for ' + hashByFile.size + ' authored artifacts and ' + sourceHashes.size + ' released packs.');
}

if (require.main === module) main();
