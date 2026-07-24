#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const seedPath = path.join(root, 'test_prep', 'plt_k6_5622_learning_library.json');
const inventory = {
  chapters: 12,
  sections: 48,
  knowledgeChecks: 60,
  flashcards: 75,
  memoryAids: 20,
  constructedResponseWorkshops: 8,
};

function transformStrings(value, transform) {
  if (typeof value === 'string') return transform(value);
  if (Array.isArray(value)) return value.map(item => transformStrings(item, transform));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, transformStrings(item, transform)]));
}

function countReferenceSets(value) {
  if (Array.isArray(value)) return value.reduce((total, item) => total + countReferenceSets(item), 0);
  if (!value || typeof value !== 'object') return 0;
  return Object.entries(value).reduce((total, [key, item]) => total + (key === 'references' && Array.isArray(item) ? 1 : countReferenceSets(item)), 0);
}

function countOfficialReferenceSets(value, officialSource) {
  if (Array.isArray(value)) return value.reduce((total, item) => total + countOfficialReferenceSets(item, officialSource), 0);
  if (!value || typeof value !== 'object') return 0;
  return Object.entries(value).reduce((total, [key, item]) => total + (key === 'references' && Array.isArray(item) && item.includes(officialSource) ? 1 : countOfficialReferenceSets(item, officialSource)), 0);
}

function updateCheck(library, chapterIndex, checkIndex, changes) {
  const check = library.chapters[chapterIndex].knowledgeChecks[checkIndex];
  const card = library.flashcards.find(item => item.front === check.prompt);
  Object.assign(check, changes);
  if (card) {
    card.front = check.prompt;
    card.back = check.choices[check.answerIndex];
  }
}

function normalizeSeedString(input, config) {
  let value = input
    .replaceAll('praxis-plt-k6-5622-learning-library', config.libraryId)
    .replaceAll('praxis-plt-k6-5622', config.packId)
    .replaceAll('https://www.ets.org/pdfs/praxis/5622.pdf', config.officialSource)
    .replaceAll('human-development-k6', config.humanDevelopmentSkillId)
    .replaceAll('plt5622', config.idPrefix)
    .replaceAll('Grades K\u20136', config.bandTitle)
    .replaceAll('Grades K-6', config.bandTitle)
    .replaceAll('grades K\u20136', config.bandLower)
    .replaceAll('grades K-6', config.bandLower)
    .replaceAll('K\u20136', config.bandPhrase)
    .replaceAll('K-6', config.bandPhrase)
    .replace(/\b5622\b/g, config.code);
  for (const [pattern, replacement] of config.stringTransforms) value = value.replace(pattern, replacement);
  return value;
}

function assertLibrary(library, config) {
  for (const [key, count] of Object.entries(inventory)) {
    if (library.summary?.[key] !== count) throw new Error(`${config.outputName}: ${key} must equal ${count}`);
  }
  const text = JSON.stringify(library);
  const foreignCodes = (text.match(/\b562[1-5]\b/g) || []).filter(code => code !== config.code);
  if (foreignCodes.length) throw new Error(`${config.outputName}: foreign PLT codes remain (${[...new Set(foreignCodes)].join(', ')})`);
  if (/praxis-plt-k6|plt[_-]?k6|K\s*[-\u2010-\u2015]\s*6/i.test(text)) throw new Error(`${config.outputName}: K-6 contamination remains`);
  for (const pattern of config.forbiddenPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) throw new Error(`${config.outputName}: forbidden grade-band wording remains (${pattern})`);
  }
  const referenceSets = countReferenceSets(library);
  const officialReferenceSets = countOfficialReferenceSets(library, config.officialSource);
  if (referenceSets !== 223 || officialReferenceSets !== referenceSets) {
    throw new Error(`${config.outputName}: expected official ${config.code} source in all 223 reference sets; found ${officialReferenceSets}/${referenceSets}`);
  }
}

function build(config) {
  if (!fs.existsSync(seedPath)) throw new Error('Build the PLT K-6 seed library first.');
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const library = transformStrings(seed, value => normalizeSeedString(value, config));

  library.generatedAt = new Date().toISOString();
  library.libraryId = config.libraryId;
  library.packId = config.packId;
  library.title = config.title;
  library.description = config.description;
  library.reviewStandard = config.reviewStandard;
  library.simulation = {
    questionCount: 70,
    timeMinutes: 70,
    officialTotalTimeMinutes: 120,
    officialConstructedResponseCount: 4,
    note: 'The selected-response simulation uses 70 minutes and reserves 50 minutes for four written responses related to two case histories. AlloFlow provides planning and self-check criteria but does not score responses.',
  };
  library.legalCaution = config.legalCaution;
  library.frameworkCaution = `The ETS ${config.code} Study Companion defines the tested blueprint, format, and case-history response expectations and states that the test reflects InTASC standards. ETS, InTASC, IES, IDEA, FERPA, civil-rights, English-learner, emergency, state, district, and school materials can be revised; verify current editions and local implementation requirements.`;

  config.customize(library, { updateCheck });

  library.constructedResponseWorkshops = library.constructedResponseWorkshops.map((workshop, index) => ({
    ...workshop,
    id: `${config.idPrefix}-workshop-${String(index + 1).padStart(2, '0')}`,
    reviewNote: config.workshopReviewNote,
  }));
  library.summary.constructedResponseWorkshops = library.constructedResponseWorkshops.length;
  library.summary.sourceReviewedConstructedResponseWorkshops = library.constructedResponseWorkshops.length;

  assertLibrary(library, config);
  for (const output of [path.join(root, 'test_prep'), path.join(root, 'desktop/web-app', 'public', 'test_prep')]) {
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, config.outputName), `${JSON.stringify(library, null, 2)}\n`);
  }
  console.log(`Built ${config.title}: 12 chapters, 48 sections, 60 checks, 75 flashcards, 20 memory aids, 8 case workshops; 223/223 reference sets cite the official ${config.code} companion.`);
}

module.exports = { build };
