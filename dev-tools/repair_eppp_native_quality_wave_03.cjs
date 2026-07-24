#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'test_prep', 'eppp_native_items.json');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'test_prep', 'eppp_native_items.json');
const outputRoots = [path.join(root, 'test_prep'), path.join(root, 'desktop/web-app', 'public', 'test_prep')];
const targetId = 'eppp-b006-biological-2';
const reviewedAt = '2026-07-16';

const replacement = {
  difficulty: 'intermediate',
  prompt: 'Following a focal central nervous system injury, which response most specifically reflects microglial rather than astrocytic, oligodendroglial, or neuronal function?',
  choices: [
    'Buffering extracellular potassium and taking up glutamate near synapses',
    'Forming compact myelin around segments of multiple CNS axons',
    'Generating action potentials in cortical projection pathways',
    'Migrating toward damaged tissue and phagocytosing cellular debris',
  ],
  answerIndex: 3,
  rationale: 'Microglia are resident immune-effector cells of the central nervous system that respond to injury, move toward damaged tissue, and phagocytose cellular debris. Astrocytes help maintain extracellular ionic and neurotransmitter homeostasis, oligodendrocytes form CNS myelin, and neurons generate action potentials.',
  choiceRationales: [
    'This describes an astrocytic homeostatic role. Astrocytes help regulate extracellular potassium and clear neurotransmitters such as glutamate; that function does not most specifically identify microglia.',
    'This describes oligodendrocyte function. A single oligodendrocyte can form myelin around segments of multiple axons in the central nervous system; it is not the resident phagocyte in this scenario.',
    'This describes neuronal excitability. Cortical projection neurons generate action potentials, whereas microglia are non-neuronal resident immune-effector cells that respond to tissue damage.',
    'Microglia are resident immune-effector cells of the central nervous system that respond to injury, move toward damaged tissue, and phagocytose cellular debris. Astrocytes help maintain extracellular ionic and neurotransmitter homeostasis, oligodendrocytes form CNS myelin, and neurons generate action potentials.',
  ],
  references: [
    'https://www.ncbi.nlm.nih.gov/books/NBK10869/',
    'https://pubmed.ncbi.nlm.nih.gov/18567623/',
  ],
  sourceDetails: [
    {
      url: 'https://www.ncbi.nlm.nih.gov/books/NBK10869/',
      title: 'Neuroglial Cells, in Neuroscience (2nd edition)',
      organization: 'National Center for Biotechnology Information, U.S. National Library of Medicine',
      summary: 'This neuroscience textbook chapter distinguishes astrocyte, oligodendrocyte, and microglial functions, including ionic homeostasis, CNS myelination, and debris removal after injury.',
      credibility: 'NCBI Bookshelf is maintained by the U.S. National Library of Medicine and preserves the complete scholarly textbook chapter, its authorship, edition, publisher, and references for verification.',
    },
    {
      url: 'https://pubmed.ncbi.nlm.nih.gov/18567623/',
      title: 'Debris clearance by microglia: an essential link between degeneration and regeneration',
      organization: 'PubMed, U.S. National Library of Medicine',
      summary: 'This peer-reviewed review describes microglial recruitment to injured CNS tissue and the phagocytic clearance of cellular debris.',
      credibility: 'PubMed is maintained by the U.S. National Library of Medicine and provides traceable journal, author, abstract, and publication metadata; the cited article synthesizes experimental evidence specifically about microglial debris clearance.',
    },
  ],
  learningObjectiveId: 'biological-glial-function-discrimination',
  cognitiveProcess: 'application',
  distractorDesign: [
    'adjacent-cell-function-astrocyte',
    'adjacent-cell-function-oligodendrocyte',
    'adjacent-cell-function-neuron',
  ],
  qaReviewedAt: reviewedAt,
  wordingReviewStatus: 'editorial-deep-rewrite-pass',
  wordingReviewWave: 'eppp-native-quality-wave-03',
};

function writeFileWithRetry(filePath, contents) {
  let lastError;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      fs.writeFileSync(filePath, contents);
      return;
    } catch (error) {
      lastError = error;
      if (!['EBUSY', 'EPERM', 'EACCES', 'UNKNOWN'].includes(error.code)) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
  throw lastError;
}

const bank = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
if (!Array.isArray(bank) || bank.length !== 1500) throw new Error('Expected the 1,500-item EPPP native bank.');
const matches = bank.filter((item) => item.id === targetId);
if (matches.length !== 1) throw new Error('Expected exactly one ' + targetId + ' item, found ' + matches.length + '.');
const item = matches[0];
if (item.domainId !== 'biological' || item.answerIndex !== 3) throw new Error('The target item changed domain or key position; review this repair before applying it.');
Object.assign(item, replacement);

if (new Set(item.choices.map((choice) => choice.toLowerCase())).size !== 4) throw new Error('Replacement choices must be distinct.');
if (item.choices.some((choice) => /\b(?:all|none) of the above\b/i.test(choice))) throw new Error('Aggregate response options are not permitted.');
if (item.choiceRationales.length !== item.choices.length || item.choiceRationales.some((feedback) => feedback.length < 80)) throw new Error('Every replacement choice needs extended, option-specific feedback.');
if (item.references.length !== item.sourceDetails.length || item.sourceDetails.some((detail) => !item.references.includes(detail.url) || detail.title.length < 12 || detail.credibility.length < 80)) throw new Error('Every replacement source needs a full title and credibility explanation.');

const audit = {
  schemaVersion: 1,
  reviewWave: 'eppp-native-quality-wave-03',
  reviewedAt,
  scope: 'Targeted deep rewrite of a learner-reported answer-word giveaway, with adjacent-concept distractors and source-specific option feedback.',
  summary: {
    totalItems: bank.length,
    rewrittenItems: 1,
    aggregateResponseOptionsAdded: 0,
    optionSpecificExplanations: item.choiceRationales.length,
    fullSourceRecords: item.sourceDetails.length,
    status: 'pass',
  },
  items: [{
    id: item.id,
    learningObjectiveId: item.learningObjectiveId,
    cognitiveProcess: item.cognitiveProcess,
    keyPositionPreserved: item.answerIndex === 3,
    distractorDesign: item.distractorDesign,
  }],
  limitations: ['Editorial and source review is not psychometric calibration or independent licensed-psychologist validation.'],
};
const markdown = '# EPPP native quality repair - wave 03\n\nReviewed: ' + reviewedAt + '\n\n## Result\n\n- Replaced the reported answer-word giveaway with an application-level CNS injury scenario.\n- All four options now represent authentic, adjacent CNS-cell functions.\n- Preserved the original D key position and overall bank answer balance.\n- Added four option-specific explanations and two fully named source records.\n- Added no all/none-of-the-above response options.\n\n> Editorial and source review is not psychometric calibration or independent licensed-psychologist validation.\n';
const json = JSON.stringify(bank, null, 2) + '\n';
writeFileWithRetry(sourcePath, json);
writeFileWithRetry(deployPath, json);
for (const outputRoot of outputRoots) {
  writeFileWithRetry(path.join(outputRoot, 'eppp_native_quality_audit_wave_03.json'), JSON.stringify(audit, null, 2) + '\n');
  writeFileWithRetry(path.join(outputRoot, 'eppp_native_quality_audit_wave_03.md'), markdown);
}
console.log('EPPP quality wave 03: replaced 1 answer-word giveaway with adjacent-concept distractors.');
