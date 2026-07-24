#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { writeGeneratedFile } = require('./write_generated_file.cjs');
const root = path.resolve(__dirname, '..');
const pack = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'special_education_5355_pack.json'), 'utf8'));
const sourceItems = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'special_education_5355_items.json'), 'utf8'));
const library = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'special_education_5355_learning_library.json'), 'utf8'));

const blueprintUrl = 'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/dwa68a3c59/pdfs/5355.pdf';
const allowedHosts = new Set(['praxis.ets.org', 'sites.ed.gov', 'ies.ed.gov', 'www.ed.gov']);
const expectedDomains = {
  'development-differences': { label: 'Human Development and Individual Learning Differences', weight: 0.26, officialQuestions: 32, diagnosticQuestions: 26 },
  'planning-instruction-environment': { label: 'Effective Planning and Instruction and Productive Learning Environments', weight: 0.32, officialQuestions: 38, diagnosticQuestions: 32 },
  assessment: { label: 'Assessment', weight: 0.23, officialQuestions: 27, diagnosticQuestions: 23 },
  'professional-practice-collaboration': { label: 'Professional Learning, Practice, and Collaboration', weight: 0.19, officialQuestions: 23, diagnosticQuestions: 19 },
};
const checks = ['blueprint-alignment', 'learning-linkage', 'authoritative-source', 'one-best-answer', 'distractor-quality', 'clue-resistance', 'rationale-quality', 'provenance'];
const findings = [];
const itemFindings = new Map();
const add = (item, check, message) => {
  const finding = { check, message };
  if (!item) findings.push(finding);
  else {
    if (!itemFindings.has(item.id)) itemFindings.set(item.id, []);
    itemFindings.get(item.id).push(finding);
  }
};
const clean = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const validReferences = (references) => Array.isArray(references) && references.includes(blueprintUrl) && references.every((reference) => {
  try { const url = new URL(reference); return url.protocol === 'https:' && allowedHosts.has(url.hostname.toLowerCase()); } catch (_) { return false; }
});

if (pack.schemaVersion !== 1 || pack.id !== 'praxis-special-education-5355' || pack.status !== 'ready') add(null, 'blueprint-alignment', 'Invalid pack identity, schema, or release status.');
if (pack.version !== '1.0.0') add(null, 'provenance', 'Release version must be 1.0.0.');
if (pack.batchSize !== 100) add(null, 'blueprint-alignment', 'Diagnostic batch size must be 100.');
if (!Array.isArray(pack.items) || pack.items.length !== 200 || !Array.isArray(sourceItems) || sourceItems.length !== 200) add(null, 'blueprint-alignment', 'The release must contain 200 generated items.');
if (JSON.stringify(pack.items) !== JSON.stringify(sourceItems)) add(null, 'provenance', 'Pack items do not exactly match the generated item source.');
if (!Array.isArray(pack.sections) || pack.sections.length !== 2 || pack.sections.some((section, index) => section.id !== 'diagnostic-batch-' + (index + 1) || section.timeMinutes !== null)) add(null, 'blueprint-alignment', 'The release must declare two untimed 100-item diagnostic sections.');
if (pack.simulationItemCount !== 120 || pack.simulationTimeMinutes !== 120) add(null, 'blueprint-alignment', 'The optional official-length simulation must declare 120 questions and 120 minutes.');
const expectedSimulationDomainCounts = Object.fromEntries(Object.entries(expectedDomains).map(([domainId, expected]) => [domainId, expected.officialQuestions]));
if (JSON.stringify(pack.simulationDomainCounts) !== JSON.stringify(expectedSimulationDomainCounts)) add(null, 'blueprint-alignment', 'The optional official-length simulation must preserve the official 32/38/27/23 domain allocation.');
for (const [domainId, required] of Object.entries(expectedSimulationDomainCounts)) {
  if (pack.items.filter((item) => item.domainId === domainId && item.examItemStatus !== 'not-approved-as-independent-exam-item').length < required) add(null, 'blueprint-alignment', 'The independent item pool cannot supply the official simulation allocation for ' + domainId + '.');
}
if (pack.learningLibraryUrl !== './test_prep/special_education_5355_learning_library.json' || pack.learningLibraryQaUrl !== './test_prep/special_education_5355_learning_library_qa.json') add(null, 'learning-linkage', 'Learning-library URLs are invalid.');
if (library.libraryId !== 'praxis-special-education-5355-learning-library' || library.packId !== pack.id || (library.skills || []).length !== 12 || (library.chapters || []).length !== 12) add(null, 'learning-linkage', 'Learning-library identity or skill inventory is invalid.');
if (!/120 selected-response questions in two hours/i.test(pack.disclaimer || '') || !/not official or scaled Praxis scores/i.test(pack.disclaimer || '') || !/federal, state, and local requirements/i.test(pack.disclaimer || '')) add(null, 'provenance', 'The independent-preparation and legal disclaimer is incomplete.');

const declaredDomains = new Map((pack.domains || []).map((domain) => [domain.id, domain]));
for (const [domainId, expected] of Object.entries(expectedDomains)) {
  const domain = declaredDomains.get(domainId);
  if (!domain || domain.label !== expected.label || Math.abs(Number(domain.weight) - expected.weight) > 0.000001) add(null, 'blueprint-alignment', 'Invalid domain declaration for ' + domainId + '.');
}
if (declaredDomains.size !== 4) add(null, 'blueprint-alignment', 'Exactly four 5355 domains are required.');

const skillById = new Map((library.skills || []).map((skill) => [skill.id, skill]));
const chapterById = new Map((library.chapters || []).map((chapter) => [chapter.id, chapter]));
if (new Set(pack.items.map((item) => item.id)).size !== pack.items.length) add(null, 'provenance', 'Duplicate item IDs found.');
if (new Set(pack.items.map((item) => clean(item.prompt))).size !== pack.items.length) add(null, 'provenance', 'Duplicate prompts found.');

for (const item of pack.items) {
  const itemChecks = itemFindings.get(item.id) || [];
  const choices = Array.isArray(item.choices) ? item.choices : [];
  if (!/^sp5355-b[12]-\d{3}$/.test(item.id || '') || !expectedDomains[item.domainId]) add(item, 'blueprint-alignment', 'ID or domain is outside the 5355 blueprint.');
  if (item.type !== 'single-choice' || !item.prompt || choices.length !== 4 || !Number.isInteger(item.answerIndex) || item.answerIndex < 0 || item.answerIndex > 3) add(item, 'one-best-answer', 'Invalid single-choice structure or answer key.');
  if (new Set(choices.map(clean)).size !== 4 || choices.some((choice) => !clean(choice))) add(item, 'distractor-quality', 'Choices must be four unique, nonempty responses.');
  if (choices.some((choice) => /\b(?:all|none) of the above\b/i.test(choice))) add(item, 'distractor-quality', 'All/none-of-the-above is not allowed.');
  if (!item.rationale || item.rationale.length < 100 || !Array.isArray(item.choiceRationales) || item.choiceRationales.length !== 4 || item.choiceRationales.some((entry) => String(entry || '').length < 100)) add(item, 'rationale-quality', 'Full and answer-specific rationale floor is not met.');
  if (!validReferences(item.references)) add(item, 'authoritative-source', 'Every item must cite the official ETS blueprint and only allowlisted authoritative sources.');
  if (item.reviewStatus !== 'source-reviewed' || item.qaStatus !== 'qa-passed' || !/^\d{4}-\d{2}-\d{2}$/.test(item.qaReviewedAt || '')) add(item, 'provenance', 'Source-review and QA provenance is incomplete.');
  const skillId = Array.isArray(item.skillIds) && item.skillIds.length === 1 ? item.skillIds[0] : '';
  const chapterId = Array.isArray(item.chapterIds) && item.chapterIds.length === 1 ? item.chapterIds[0] : '';
  const skill = skillById.get(skillId);
  const chapter = chapterById.get(chapterId);
  if (!skill || !chapter || skill.domainId !== item.domainId || skill.chapterId !== chapterId || chapter.skillId !== skillId) add(item, 'learning-linkage', 'Skill and chapter linkage is invalid.');
  if (itemChecks.length) continue;
}

const diagnosticBatches = [0, 1].map((batchIndex) => {
  const subset = pack.items.slice(batchIndex * 100, batchIndex * 100 + 100);
  const categories = {};
  for (const [domainId, expected] of Object.entries(expectedDomains)) {
    categories[domainId] = subset.filter((item) => item.domainId === domainId).length;
    if (categories[domainId] !== expected.diagnosticQuestions) add(null, 'blueprint-alignment', 'Batch ' + (batchIndex + 1) + ' has an invalid ' + domainId + ' count.');
  }
  const answerPositions = [0, 1, 2, 3].map((answerIndex) => subset.filter((item) => item.answerIndex === answerIndex).length);
  if (subset.length !== 100) add(null, 'blueprint-alignment', 'Batch ' + (batchIndex + 1) + ' must contain 100 items.');
  if (answerPositions.some((count) => count !== 25)) add(null, 'clue-resistance', 'Batch ' + (batchIndex + 1) + ' answer positions must be 25/25/25/25.');
  return { batchNumber: batchIndex + 1, batchSize: subset.length, firstQuestion: batchIndex * 100 + 1, lastQuestion: batchIndex * 100 + subset.length, categories, answerPositions };
});

const reports = pack.items.map((item) => {
  const current = itemFindings.get(item.id) || [];
  return { id: item.id, domainId: item.domainId, skillId: item.skillIds[0], chapterId: item.chapterIds[0], qaStatus: current.length ? 'review-required' : 'pass', checks: checks.map((check) => ({ check, status: current.some((finding) => finding.check === check) ? 'review-required' : 'pass' })), findings: current, references: item.references };
});
const passedItems = reports.filter((report) => report.qaStatus === 'pass').length;
const reviewRequiredItems = reports.length - passedItems;
const allFindings = findings.concat(...reports.map((report) => report.findings));
const status = allFindings.length ? 'review-required' : 'pass';
const generatedAt = new Date().toISOString();
const report = {
  schemaVersion: 1,
  generatedAt,
  packId: pack.id,
  standard: {
    label: 'AlloFlow independent 5355 source, structure, feedback, and linkage QA v1',
    meaning: 'A pass confirms exact blueprint allocation, balanced answer positions, unique original prompts, authoritative-source allowlisting, substantive feedback, stable identifiers, and complete learning links.',
    limitation: 'This is not ETS approval, independent expert validation, field testing, psychometric calibration, a scaled-score model, or legal advice.',
  },
  blueprint: { officialQuestionCount: 120, timeMinutes: 120, selectedResponse: true, simulationDomainCounts: expectedSimulationDomainCounts, categories: Object.fromEntries(Object.entries(expectedDomains).map(([id, entry]) => [id, { questions: entry.officialQuestions, percentage: Math.round(entry.weight * 100) }])) },
  diagnosticBatch: { batchCount: 2, batchSize: 100, categories: Object.fromEntries(Object.entries(expectedDomains).map(([id, entry]) => [id, entry.diagnosticQuestions])), batches: diagnosticBatches },
  summary: { totalItems: reports.length, passedItems, reviewRequiredItems, findings: allFindings.length, status },
  findings,
  items: reports,
};
const markdown = `# Praxis Special Education: Foundational Knowledge (5355) QA report\n\nGenerated: ${generatedAt}\n\n## Result\n\n- Status: **${status.toUpperCase()}**\n- Items: ${reports.length}\n- Passed: ${passedItems}\n- Review required: ${reviewRequiredItems}\n- Diagnostic batches: 2 x 100\n- Optional timed simulation: 120 questions / 120 minutes\n\n> ${report.standard.limitation}\n`;

for (const outputRoot of [path.join(root, 'test_prep'), path.join(root, 'desktop/web-app', 'public', 'test_prep')]) {
  fs.mkdirSync(outputRoot, { recursive: true });
  writeGeneratedFile(path.join(outputRoot, 'special_education_5355_native_qa.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
  writeGeneratedFile(path.join(outputRoot, 'special_education_5355_native_qa.md'), markdown, 'utf8');
}

console.log('Praxis Special Education 5355 pack QA: ' + status + ' (' + passedItems + '/' + reports.length + ' items passed; ' + allFindings.length + ' findings).');
if (allFindings.length) {
  for (const finding of allFindings.slice(0, 50)) console.error('- [' + finding.check + '] ' + finding.message);
  process.exit(1);
}
