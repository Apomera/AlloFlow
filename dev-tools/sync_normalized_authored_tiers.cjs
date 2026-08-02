'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'test_prep');
const deployDir = path.join(root, 'desktop', 'web-app', 'public', 'test_prep');
const authoredDir = path.join(__dirname, 'authored');
const manifest = JSON.parse(fs.readFileSync(path.join(authoredDir, 'test_prep_independent_additions_manifest.json'), 'utf8'));
const { writeGeneratedFile } = require('./write_generated_file.cjs');

const canonical = value => String(value == null ? '' : value).normalize('NFKC').toLowerCase()
  .replace(/["']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const contentKernel = item => JSON.stringify({
  answer: canonical(item.choices?.[item.answerIndex]),
  distractors: (item.choices || []).filter((_, index) => index !== item.answerIndex).map(canonical).sort(),
  rationale: canonical(item.rationale),
  references: (item.references || []).map(canonical).sort(),
});
const writeJson = (file, value) => writeGeneratedFile(file, JSON.stringify(value, null, 2) + '\n');

for (const stem of Object.keys(manifest.packs || {})) {
  const packFile = stem + '_pack.json';
  const packPath = path.join(sourceDir, packFile);
  if (!fs.existsSync(packPath)) continue;
  const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
  const authored = [];
  for (const batch of manifest.packs[stem] || []) {
    for (const file of batch.files || []) authored.push(...JSON.parse(fs.readFileSync(path.join(authoredDir, file), 'utf8')));
  }
  const sourceCount = Number(pack.sourceQuestionItems) || 200;
  const expectedCount = Number(pack.assistantAuthoredIndependentItems) || 0;
  if (authored.length !== expectedCount) throw new Error(`${stem}: authored tier has ${authored.length}, expected ${expectedCount}`);
  pack.items = [...pack.items.slice(0, sourceCount), ...authored, ...pack.items.slice(sourceCount + expectedCount)];
  const independentCount = sourceCount + expectedCount;
  const sourceKernels = new Set(pack.items.slice(0, sourceCount).map(contentKernel)).size;
  const independentKernels = new Set(pack.items.slice(0, independentCount).map(contentKernel)).size;
  Object.assign(pack, {
    distinctSourceContentKernels: sourceKernels,
    parallelSourceVariants: sourceCount - sourceKernels,
    distinctIndependentContentKernels: independentKernels,
    parallelIndependentVariants: independentCount - independentKernels,
    newIndependentItemsNeeded: 500 - independentKernels,
  });
  if (pack.assistantReview) Object.assign(pack.assistantReview, {
    distinctSourceContentKernels: sourceKernels,
    parallelSourceVariants: sourceCount - sourceKernels,
    distinctIndependentContentKernels: independentKernels,
    parallelIndependentVariants: independentCount - independentKernels,
    newIndependentItemsNeeded: 500 - independentKernels,
  });
  const packJson = JSON.stringify(pack, null, 2) + '\n';
  writeGeneratedFile(packPath, packJson);
  writeGeneratedFile(path.join(deployDir, packFile), packJson);
  const itemsJson = JSON.stringify(pack.items, null, 2) + '\n';
  writeGeneratedFile(path.join(sourceDir, stem + '_items.json'), itemsJson);
  writeGeneratedFile(path.join(deployDir, stem + '_items.json'), itemsJson);
}
console.log('Synchronized normalized authored tiers into released packs.');
