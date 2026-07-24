#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const pack = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'reading_specialist_5302_pack.json'), 'utf8'));
const sourceItems = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'reading_specialist_5302_items.json'), 'utf8'));
const library = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'reading_specialist_5302_learning_library.json'), 'utf8'));
const blueprintUrl = 'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5302.pdf';
const allowedHosts = new Set(['praxis.ets.org', 'literacyworldwide.org', 'www.literacyworldwide.org', 'ies.ed.gov', 'dyslexiaida.org', 'www.dyslexiaida.org', 'intensiveintervention.org', 'www.intensiveintervention.org', 'wida.wisc.edu', 'studentprivacy.ed.gov', 'sites.ed.gov']);
const expectedDomains = {
  'curriculum-instruction': { label: 'Curriculum and Instruction', weight: 0.37, officialQuestions: 47, officialPercentage: 37, diagnosticQuestions: 49 },
  assessment: { label: 'Assessment', weight: 0.23, officialQuestions: 29, officialPercentage: 23, diagnosticQuestions: 31 },
  'professional-leadership': { label: 'Professional Leadership and Specialized Roles', weight: 0.15, officialQuestions: 19, officialPercentage: 15, diagnosticQuestions: 20 },
};
const checks = ['blueprint-alignment', 'learning-linkage', 'authoritative-source', 'one-best-answer', 'distractor-quality', 'clue-resistance', 'rationale-quality', 'originality', 'provenance'];
const officialSampleFragments = ['science teacher asks the school reading specialist', 'accuracy fluency and comprehension are at an end of first grade level', 'concept of fairness in educational measurement', 'verbally replace the first letter of the word pill'];
const findings = [];
const itemFindings = new Map();
const add = (item, check, message) => { const finding = { check, message }; if (!item) findings.push(finding); else { if (!itemFindings.has(item.id)) itemFindings.set(item.id, []); itemFindings.get(item.id).push(finding); } };
const clean = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const validReferences = (references) => Array.isArray(references) && references.includes(blueprintUrl) && references.every((reference) => { try { const url = new URL(reference); return url.protocol === 'https:' && allowedHosts.has(url.hostname.toLowerCase()); } catch (_) { return false; } });

if (pack.schemaVersion !== 1 || pack.id !== 'praxis-reading-specialist-5302' || pack.status !== 'ready') add(null, 'blueprint-alignment', 'Invalid pack identity, schema, or release status.');
if (pack.version !== '1.0.0' || pack.batchSize !== 100) add(null, 'provenance', 'Release version or batch size is invalid.');
if (!Array.isArray(pack.items) || pack.items.length !== 200 || !Array.isArray(sourceItems) || sourceItems.length !== 200) add(null, 'blueprint-alignment', 'The release must contain 200 generated items.');
if (JSON.stringify(pack.items) !== JSON.stringify(sourceItems)) add(null, 'provenance', 'Pack items do not exactly match the generated item source.');
if (!Array.isArray(pack.sections) || pack.sections.length !== 2 || pack.sections.some((section, index) => section.id !== 'diagnostic-batch-' + (index + 1) || section.timeMinutes !== null)) add(null, 'blueprint-alignment', 'The release must declare two untimed 100-item diagnostic sections.');
if (pack.simulationItemCount !== 95 || pack.simulationTimeMinutes !== 150 || pack.officialSelectedResponseCount !== 95 || pack.officialConstructedResponseCount !== 2) add(null, 'blueprint-alignment', 'The format declaration must distinguish 95 selected-response and 2 constructed-response questions in 150 minutes.');
if (!/selected-response items only/i.test(pack.simulationNote || '') || !/does not score constructed responses/i.test(pack.simulationNote || '')) add(null, 'provenance', 'The selected-response simulation limitation is missing.');
if (pack.learningLibraryUrl !== './test_prep/reading_specialist_5302_learning_library.json' || pack.learningLibraryQaUrl !== './test_prep/reading_specialist_5302_learning_library_qa.json') add(null, 'learning-linkage', 'Learning-library URLs are invalid.');
if (library.libraryId !== 'praxis-reading-specialist-5302-learning-library' || library.packId !== pack.id || (library.skills || []).length !== 12 || (library.chapters || []).length !== 12 || (library.constructedResponseWorkshops || []).length !== 6) add(null, 'learning-linkage', 'Learning-library identity, skill inventory, or response-workshop inventory is invalid.');
if (!/95 selected-response and 2 constructed-response questions in 150 minutes/i.test(pack.disclaimer || '') || !/not official or scaled Praxis scores/i.test(pack.disclaimer || '') || !/not affiliated with or endorsed by ETS or the International Literacy Association/i.test(pack.disclaimer || '') || !/diagnoses of dyslexia or disability/i.test(pack.disclaimer || '')) add(null, 'provenance', 'The independent-preparation, format, affiliation, diagnostic, and safety disclaimer is incomplete.');

const declaredDomains = new Map((pack.domains || []).map((domain) => [domain.id, domain]));
for (const [domainId, expected] of Object.entries(expectedDomains)) { const domain = declaredDomains.get(domainId); if (!domain || domain.label !== expected.label || Math.abs(Number(domain.weight) - expected.weight) > 0.000001) add(null, 'blueprint-alignment', 'Invalid category declaration for ' + domainId + '.'); }
if (declaredDomains.size !== 3) add(null, 'blueprint-alignment', 'Exactly three selected-response 5302 categories are required.');
const skillById = new Map((library.skills || []).map((skill) => [skill.id, skill]));
const chapterById = new Map((library.chapters || []).map((chapter) => [chapter.id, chapter]));
if (new Set(pack.items.map((item) => item.id)).size !== pack.items.length) add(null, 'provenance', 'Duplicate item IDs found.');
if (new Set(pack.items.map((item) => clean(item.prompt))).size !== pack.items.length) add(null, 'originality', 'Duplicate prompts found.');

for (const item of pack.items) {
  const choices = Array.isArray(item.choices) ? item.choices : [];
  if (!/^read5302-b[12]-\d{3}$/.test(item.id || '') || !expectedDomains[item.domainId]) add(item, 'blueprint-alignment', 'ID or category is outside the selected-response 5302 blueprint.');
  if (item.type !== 'single-choice' || !item.prompt || choices.length !== 4 || !Number.isInteger(item.answerIndex) || item.answerIndex < 0 || item.answerIndex > 3) add(item, 'one-best-answer', 'Invalid single-choice structure or answer key.');
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
const report = { schemaVersion: 1, generatedAt, packId: pack.id, standard: { label: 'AlloFlow independent 5302 source, structure, feedback, originality, format, safety, and linkage QA v1', meaning: 'A pass confirms exact selected-response diagnostic allocation, balanced answer positions, independently authored prompts, official-sample fragment screening, authoritative-source allowlisting, substantive feedback, stable identifiers, complete learning links, and explicit written-response limitations.', limitation: 'This is not ETS or ILA approval, independent reading-specialist validation, field testing, psychometric calibration, an official constructed-response score, a scaled-score model, diagnosis, eligibility decision, supervision, or legal advice.' }, blueprint: { officialQuestionCount: 97, selectedResponseCount: 95, constructedResponseCount: 2, timeMinutes: 150, categories: { ...Object.fromEntries(Object.entries(expectedDomains).map(([id, entry]) => [id, { questions: entry.officialQuestions, percentage: entry.officialPercentage }])), application: { questions: 2, percentage: 25, responseType: 'constructed-response' } } }, diagnosticBatch: { batchCount: 2, batchSize: 100, categories: Object.fromEntries(Object.entries(expectedDomains).map(([id, entry]) => [id, entry.diagnosticQuestions])), batches: diagnosticBatches }, summary: { totalItems: reports.length, passedItems, reviewRequiredItems: reports.length - passedItems, findings: allFindings.length, status }, findings, items: reports };
const markdown = `# Praxis Reading Specialist (5302) QA report\n\nGenerated: ${generatedAt}\n\n## Result\n\n- Status: **${status.toUpperCase()}**\n- Selected-response items: ${reports.length}\n- Passed: ${passedItems}\n- Review required: ${reports.length - passedItems}\n- Diagnostic batches: 2 x 100\n- Optional timed segment: 95 selected-response questions / 150-minute shared official window\n- Separate constructed-response workshops: 6\n\n> ${report.standard.limitation}\n`;
for (const outputRoot of [path.join(root, 'test_prep'), path.join(root, 'desktop/web-app', 'public', 'test_prep')]) { fs.mkdirSync(outputRoot, { recursive: true }); fs.writeFileSync(path.join(outputRoot, 'reading_specialist_5302_native_qa.json'), JSON.stringify(report, null, 2) + '\n', 'utf8'); fs.writeFileSync(path.join(outputRoot, 'reading_specialist_5302_native_qa.md'), markdown, 'utf8'); }
console.log('Praxis Reading Specialist 5302 pack QA: ' + status + ' (' + passedItems + '/' + reports.length + ' items passed; ' + allFindings.length + ' findings).');
if (allFindings.length) { for (const finding of allFindings.slice(0, 50)) console.error('- [' + finding.check + '] ' + finding.message); process.exit(1); }
