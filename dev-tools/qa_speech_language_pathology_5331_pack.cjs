#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { writeGeneratedFile } = require('./write_generated_file.cjs');
const root = path.resolve(__dirname, '..');
const { findResponseFormIssue } = require('./speech_language_pathology_5331/semantic_response_form_gate.cjs');
const pack = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'speech_language_pathology_5331_pack.json'), 'utf8'));
const sourceItems = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'speech_language_pathology_5331_items.json'), 'utf8'));
const library = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'speech_language_pathology_5331_learning_library.json'), 'utf8'));
const blueprintUrl = 'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5331.pdf';
const allowedHosts = new Set(['praxis.ets.org', 'asha.org', 'www.asha.org', 'sites.ed.gov', 'studentprivacy.ed.gov', 'www.hhs.gov']);
const expectedDomains = {
  'foundations-professional-practice': { label: 'Foundations and Professional Practice', weight: 1 / 3, officialQuestions: 44, diagnosticQuestions: 34 },
  'screening-assessment-diagnosis': { label: 'Screening, Assessment, Evaluation, and Diagnosis', weight: 1 / 3, officialQuestions: 44, diagnosticQuestions: 33 },
  'treatment-planning-evaluation': { label: 'Planning, Implementation, and Evaluation of Treatment', weight: 1 / 3, officialQuestions: 44, diagnosticQuestions: 33 },
};
const checks = ['blueprint-alignment', 'learning-linkage', 'authoritative-source', 'one-best-answer', 'response-form', 'distractor-quality', 'clue-resistance', 'rationale-quality', 'originality', 'provenance'];
const officialSampleFragments = ['major physical or organic factor underlying impairment', 'determines the mean length of utterance', 'has targeted the phonological process of stopping', 'spanish speaking parents of a nine year old bilingual child'];
const findings = [];
const itemFindings = new Map();
const add = (item, check, message) => { const finding = { check, message }; if (!item) findings.push(finding); else { if (!itemFindings.has(item.id)) itemFindings.set(item.id, []); itemFindings.get(item.id).push(finding); } };
const clean = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const validReferences = (references) => Array.isArray(references) && references.includes(blueprintUrl) && references.every((reference) => { try { const url = new URL(reference); return url.protocol === 'https:' && allowedHosts.has(url.hostname.toLowerCase()); } catch (_) { return false; } });

if (pack.schemaVersion !== 1 || pack.id !== 'praxis-speech-language-pathology-5331' || pack.status !== 'ready') add(null, 'blueprint-alignment', 'Invalid pack identity, schema, or release status.');
if (pack.version !== '1.0.0' || pack.batchSize !== 100) add(null, 'provenance', 'Release version or batch size is invalid.');
if (!Array.isArray(pack.items) || pack.items.length !== 200 || !Array.isArray(sourceItems) || sourceItems.length !== 200) add(null, 'blueprint-alignment', 'The release must contain 200 generated items.');
if (JSON.stringify(pack.items) !== JSON.stringify(sourceItems)) add(null, 'provenance', 'Pack items do not exactly match the generated item source.');
if (!Array.isArray(pack.sections) || pack.sections.length !== 2 || pack.sections.some((section, index) => section.id !== 'diagnostic-batch-' + (index + 1) || section.timeMinutes !== null)) add(null, 'blueprint-alignment', 'The release must declare two untimed 100-item diagnostic sections.');
if (pack.simulationItemCount !== 132 || pack.simulationTimeMinutes !== 150) add(null, 'blueprint-alignment', 'The official-length simulation must declare 132 questions and 150 minutes.');
const expectedSimulationDomainCounts = Object.fromEntries(Object.entries(expectedDomains).map(([domainId, expected]) => [domainId, expected.officialQuestions]));
if (JSON.stringify(pack.simulationDomainCounts) !== JSON.stringify(expectedSimulationDomainCounts)) add(null, 'blueprint-alignment', 'The official-length simulation must preserve the official 44/44/44 category allocation.');
for (const [domainId, required] of Object.entries(expectedSimulationDomainCounts)) {
  if (pack.items.filter((item) => item.domainId === domainId && item.examItemStatus !== 'not-approved-as-independent-exam-item').length < required) add(null, 'blueprint-alignment', 'The independent item pool cannot supply the official simulation allocation for ' + domainId + '.');
}
if (pack.learningLibraryUrl !== './test_prep/speech_language_pathology_5331_learning_library.json' || pack.learningLibraryQaUrl !== './test_prep/speech_language_pathology_5331_learning_library_qa.json') add(null, 'learning-linkage', 'Learning-library URLs are invalid.');
if (library.libraryId !== 'praxis-speech-language-pathology-5331-learning-library' || library.packId !== pack.id || (library.skills || []).length !== 12 || (library.chapters || []).length !== 12) add(null, 'learning-linkage', 'Learning-library identity or skill inventory is invalid.');
if (!/132 selected-response questions in 150 minutes/i.test(pack.disclaimer || '') || !/not official or scaled Praxis scores/i.test(pack.disclaimer || '') || !/not affiliated with or endorsed by ETS or ASHA/i.test(pack.disclaimer || '') || !/clinical evaluations|swallowing-safety decisions/i.test(pack.disclaimer || '')) add(null, 'provenance', 'The independent-preparation, affiliation, clinical, and safety disclaimer is incomplete.');

const declaredDomains = new Map((pack.domains || []).map((domain) => [domain.id, domain]));
for (const [domainId, expected] of Object.entries(expectedDomains)) { const domain = declaredDomains.get(domainId); if (!domain || domain.label !== expected.label || Math.abs(Number(domain.weight) - expected.weight) > 0.000001) add(null, 'blueprint-alignment', 'Invalid category declaration for ' + domainId + '.'); }
if (declaredDomains.size !== 3) add(null, 'blueprint-alignment', 'Exactly three 5331 categories are required.');
const skillById = new Map((library.skills || []).map((skill) => [skill.id, skill]));
const chapterById = new Map((library.chapters || []).map((chapter) => [chapter.id, chapter]));
if (new Set(pack.items.map((item) => item.id)).size !== pack.items.length) add(null, 'provenance', 'Duplicate item IDs found.');
if (new Set(pack.items.map((item) => clean(item.prompt))).size !== pack.items.length) add(null, 'originality', 'Duplicate prompts found.');

for (const item of pack.items) {
  const choices = Array.isArray(item.choices) ? item.choices : [];
  if (!/^slp5331-b[12]-\d{3}$/.test(item.id || '') || !expectedDomains[item.domainId]) add(item, 'blueprint-alignment', 'ID or category is outside the 5331 blueprint.');
  if (item.type !== 'single-choice' || !item.prompt || choices.length !== 4 || !Number.isInteger(item.answerIndex) || item.answerIndex < 0 || item.answerIndex > 3) add(item, 'one-best-answer', 'Invalid single-choice structure or answer key.');
  const responseFormIssue = findResponseFormIssue(item);
  if (responseFormIssue) add(item, 'response-form', responseFormIssue);
  if (new Set(choices.map(clean)).size !== 4 || choices.some((choice) => !clean(choice))) add(item, 'distractor-quality', 'Choices must be four unique, nonempty responses.');
  if (choices.some((choice) => /\b(?:all|none) of the above\b/i.test(choice))) add(item, 'distractor-quality', 'All/none-of-the-above is not allowed.');
  if (!item.rationale || item.rationale.length < 100 || !Array.isArray(item.choiceRationales) || item.choiceRationales.length !== 4 || item.choiceRationales.some((entry) => String(entry || '').length < 100)) add(item, 'rationale-quality', 'Full and answer-specific rationale floor is not met.');
  if (!validReferences(item.references)) add(item, 'authoritative-source', 'Every item must cite the official ETS blueprint and only allowlisted authoritative sources.');
  if (officialSampleFragments.some((fragment) => clean(item.prompt).includes(clean(fragment)))) add(item, 'originality', 'Prompt contains a distinctive fragment from an official ETS sample item.');
  if (item.reviewStatus !== 'source-reviewed' || item.qaStatus !== 'qa-passed' || !/^\d{4}-\d{2}-\d{2}$/.test(item.qaReviewedAt || '')) add(item, 'provenance', 'Source-review and QA provenance is incomplete.');
  const skillId = Array.isArray(item.skillIds) && item.skillIds.length === 1 ? item.skillIds[0] : '';
  const chapterId = Array.isArray(item.chapterIds) && item.chapterIds.length === 1 ? item.chapterIds[0] : '';
  const skill = skillById.get(skillId); const chapter = chapterById.get(chapterId);
  if (!skill || !chapter || skill.domainId !== item.domainId || skill.chapterId !== chapterId || chapter.skillId !== skillId) add(item, 'learning-linkage', 'Skill and chapter linkage is invalid.');
}

const diagnosticBatches = [0, 1].map((batchIndex) => {
  const subset = pack.items.slice(batchIndex * 100, batchIndex * 100 + 100); const categories = {};
  for (const [domainId, expected] of Object.entries(expectedDomains)) { categories[domainId] = subset.filter((item) => item.domainId === domainId).length; if (categories[domainId] !== expected.diagnosticQuestions) add(null, 'blueprint-alignment', 'Batch ' + (batchIndex + 1) + ' has an invalid ' + domainId + ' count.'); }
  const answerPositions = [0, 1, 2, 3].map((answerIndex) => subset.filter((item) => item.answerIndex === answerIndex).length);
  if (subset.length !== 100) add(null, 'blueprint-alignment', 'Batch ' + (batchIndex + 1) + ' must contain 100 items.');
  if (answerPositions.some((count) => count !== 25)) add(null, 'clue-resistance', 'Batch ' + (batchIndex + 1) + ' answer positions must be 25/25/25/25.');
  return { batchNumber: batchIndex + 1, batchSize: subset.length, firstQuestion: batchIndex * 100 + 1, lastQuestion: batchIndex * 100 + subset.length, categories, answerPositions };
});
const reports = pack.items.map((item) => { const current = itemFindings.get(item.id) || []; return { id: item.id, domainId: item.domainId, skillId: item.skillIds[0], chapterId: item.chapterIds[0], qaStatus: current.length ? 'review-required' : 'pass', checks: checks.map((check) => ({ check, status: current.some((finding) => finding.check === check) ? 'review-required' : 'pass' })), findings: current, references: item.references }; });
const passedItems = reports.filter((report) => report.qaStatus === 'pass').length;
const allFindings = findings.concat(...reports.map((report) => report.findings)); const status = allFindings.length ? 'review-required' : 'pass'; const generatedAt = new Date().toISOString();
const report = { schemaVersion: 1, generatedAt, packId: pack.id, standard: { label: 'AlloFlow independent 5331 source, structure, response-form, feedback, originality, safety, and linkage QA v2', meaning: 'A pass confirms exact near-equal diagnostic allocation, balanced answer positions, independently authored prompts, official-sample fragment screening, authoritative-source allowlisting, substantive feedback, responsive stem-key forms, stable identifiers, and complete learning links.', limitation: 'This is not ETS or ASHA approval, independent licensed-SLP validation, field testing, psychometric calibration, a scaled-score model, clinical evaluation, diagnosis, medical or swallowing-safety decision, treatment, supervision, or legal advice.' }, blueprint: { officialQuestionCount: 132, timeMinutes: 150, selectedResponse: true, simulationDomainCounts: expectedSimulationDomainCounts, categories: Object.fromEntries(Object.entries(expectedDomains).map(([id, entry]) => [id, { questions: entry.officialQuestions, percentage: 33.333333 }])) }, diagnosticBatch: { batchCount: 2, batchSize: 100, categories: Object.fromEntries(Object.entries(expectedDomains).map(([id, entry]) => [id, entry.diagnosticQuestions])), batches: diagnosticBatches }, summary: { totalItems: reports.length, passedItems, reviewRequiredItems: reports.length - passedItems, findings: allFindings.length, status }, findings, items: reports };
const markdown = `# Praxis Speech-Language Pathology (5331) QA report\n\nGenerated: ${generatedAt}\n\n## Result\n\n- Status: **${status.toUpperCase()}**\n- Items: ${reports.length}\n- Passed: ${passedItems}\n- Review required: ${reports.length - passedItems}\n- Diagnostic batches: 2 x 100\n- Optional timed simulation: 132 questions / 150 minutes\n\n> ${report.standard.limitation}\n`;
for (const outputRoot of [path.join(root, 'test_prep'), path.join(root, 'desktop/web-app', 'public', 'test_prep')]) { fs.mkdirSync(outputRoot, { recursive: true }); writeGeneratedFile(path.join(outputRoot, 'speech_language_pathology_5331_native_qa.json'), JSON.stringify(report, null, 2) + '\n', 'utf8'); writeGeneratedFile(path.join(outputRoot, 'speech_language_pathology_5331_native_qa.md'), markdown, 'utf8'); }
console.log('Praxis Speech-Language Pathology 5331 pack QA: ' + status + ' (' + passedItems + '/' + reports.length + ' items passed; ' + allFindings.length + ' findings).');
if (allFindings.length) { for (const finding of allFindings.slice(0, 50)) console.error('- [' + finding.check + '] ' + finding.message); process.exit(1); }
