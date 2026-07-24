#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const pack = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'plt_k6_5622_pack.json'), 'utf8'));
const sourceItems = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'plt_k6_5622_items.json'), 'utf8'));
const library = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'plt_k6_5622_learning_library.json'), 'utf8'));
const blueprintUrl = 'https://www.ets.org/pdfs/praxis/5622.pdf';
const allowedHosts = new Set(['ets.org', 'www.ets.org', 'ccsso.org', 'www.ccsso.org', 'ies.ed.gov', 'studentprivacy.ed.gov', 'sites.ed.gov', 'ed.gov', 'www.ed.gov']);
const expectedDomains = {
  'students-as-learners': { label: 'Students as Learners', weight: 0.30, officialQuestions: 21, officialPercentage: 22.5, diagnosticQuestions: 30 },
  'instructional-process': { label: 'Instructional Process', weight: 0.30, officialQuestions: 21, officialPercentage: 22.5, diagnosticQuestions: 30 },
  assessment: { label: 'Assessment', weight: 0.20, officialQuestions: 14, officialPercentage: 15, diagnosticQuestions: 20 },
  'professional-development-leadership-community': { label: 'Professional Development, Leadership, and Community', weight: 0.20, officialQuestions: 14, officialPercentage: 15, diagnosticQuestions: 20 },
};
const officialSampleFragments = [
  'maximize the amount of time elementary school children',
  'frequently contrasted with discovery learning',
  'six-year-old sara lives with her mother',
  'daryl’s grade-equivalent score',
];
const findings = [];
const itemReports = [];
const add = (item, check, message) => {
  const finding = { itemId: item ? item.id : '', check, message };
  findings.push(finding);
  if (item) itemReports.find((report) => report.id === item.id)?.findings.push({ check, message });
};

if (pack.id !== 'praxis-plt-k6-5622' || pack.batchSize !== 100 || pack.simulationItemCount !== 70 || pack.simulationTimeMinutes !== 70) add(null, 'blueprint-alignment', 'Pack identity, diagnostic size, or 70-question/70-minute selected-response simulation declaration is invalid.');
if (pack.officialSelectedResponseCount !== 70 || pack.officialConstructedResponseCount !== 4) add(null, 'blueprint-alignment', 'The official response-format declaration must be 70 selected responses and four constructed responses.');
if (!/70 selected-response questions and four constructed-response questions in 120 minutes/i.test(pack.disclaimer || '') || !/not official or scaled Praxis scores/i.test(pack.disclaimer || '') || !/not affiliated with or endorsed by ETS or CCSSO/i.test(pack.disclaimer || '')) add(null, 'provenance', 'The format, score, and affiliation disclaimer is incomplete.');
if (!/approximately 70 minutes for selected response and 50 minutes for constructed response/i.test(pack.simulationNote || '') || !/separate case-analysis workshops/i.test(pack.simulationNote || '')) add(null, 'blueprint-alignment', 'The pacing-simulation boundary is incomplete.');
if (pack.learningLibraryUrl !== './test_prep/plt_k6_5622_learning_library.json' || pack.learningLibraryQaUrl !== './test_prep/plt_k6_5622_learning_library_qa.json') add(null, 'learning-linkage', 'Learning-library URLs are invalid.');
if (!Array.isArray(sourceItems) || sourceItems.length !== 200 || !Array.isArray(pack.items) || pack.items.length !== 200 || JSON.stringify(sourceItems) !== JSON.stringify(pack.items)) add(null, 'release-structure', 'Pack and source item arrays must be identical and contain 200 items.');
if (!library || library.packId !== pack.id || !Array.isArray(library.skills) || !Array.isArray(library.chapters) || !Array.isArray(library.constructedResponseWorkshops) || library.constructedResponseWorkshops.length !== 8) add(null, 'learning-linkage', 'Learning library is missing, targets another pack, or omits the case-analysis workshops.');

const declaredDomains = new Map(pack.domains.map((domain) => [domain.id, domain]));
for (const [id, expected] of Object.entries(expectedDomains)) {
  const actual = declaredDomains.get(id);
  if (!actual || actual.label !== expected.label || actual.weight !== expected.weight) add(null, 'blueprint-alignment', 'Invalid domain declaration for ' + id + '.');
}
const skillById = new Map(library.skills.map((skill) => [skill.id, skill]));
const chapterById = new Map(library.chapters.map((chapter) => [chapter.id, chapter]));
const promptSet = new Set();
const idSet = new Set();

for (const item of pack.items) {
  const report = { id: item.id, findings: [] };
  itemReports.push(report);
  if (!/^plt5622-b[12]-\d{3}$/.test(item.id || '') || idSet.has(item.id)) add(item, 'release-structure', 'ID is invalid or duplicated.');
  idSet.add(item.id);
  const prompt = String(item.prompt || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (prompt.length < 35 || promptSet.has(prompt)) add(item, 'originality', 'Prompt is too short or duplicated.');
  promptSet.add(prompt);
  if (officialSampleFragments.some((fragment) => prompt.includes(fragment))) add(item, 'originality', 'Prompt overlaps a screened official-sample fragment.');
  if (!expectedDomains[item.domainId]) add(item, 'blueprint-alignment', 'Domain is outside the 5622 selected-response blueprint.');
  if (item.type !== 'single-choice' || !Array.isArray(item.choices) || item.choices.length !== 4 || new Set(item.choices).size !== 4 || !Number.isInteger(item.answerIndex) || item.answerIndex < 0 || item.answerIndex > 3) add(item, 'one-best-answer', 'Single-choice structure is invalid.');
  if (String(item.rationale || '').length < 100 || !Array.isArray(item.choiceRationales) || item.choiceRationales.length !== 4 || item.choiceRationales.some((entry) => String(entry).length < 100)) add(item, 'rationale-quality', 'General or option-specific feedback is not substantive.');
  if (!Array.isArray(item.references) || !item.references.includes(blueprintUrl) || item.references.some((url) => { try { return !allowedHosts.has(new URL(url).hostname); } catch (_) { return true; } })) add(item, 'authoritative-source', 'References are missing the blueprint or include a non-allowlisted host.');
  if (item.reviewStatus !== 'source-reviewed' || item.qaStatus !== 'qa-passed' || !/^\d{4}-\d{2}-\d{2}$/.test(item.qaReviewedAt || '')) add(item, 'provenance', 'Review metadata is incomplete.');
  if (!Array.isArray(item.skillIds) || item.skillIds.length !== 1 || !Array.isArray(item.chapterIds) || item.chapterIds.length !== 1) add(item, 'learning-linkage', 'Exactly one skill and chapter link are required.');
  else {
    const skill = skillById.get(item.skillIds[0]);
    const chapter = chapterById.get(item.chapterIds[0]);
    if (!skill || !chapter || skill.domainId !== item.domainId || skill.chapterId !== chapter.id || chapter.skillId !== skill.id) add(item, 'learning-linkage', 'Skill, chapter, and domain linkage is inconsistent.');
  }
}

const diagnosticBatches = [];
for (let batchIndex = 0; batchIndex < 2; batchIndex += 1) {
  const batch = pack.items.slice(batchIndex * 100, batchIndex * 100 + 100);
  const domains = Object.fromEntries(Object.keys(expectedDomains).map((id) => [id, batch.filter((item) => item.domainId === id).length]));
  const answerPositions = [0, 1, 2, 3].map((index) => batch.filter((item) => item.answerIndex === index).length);
  diagnosticBatches.push({ batchNumber: batchIndex + 1, domains, answerPositions });
  for (const [id, expected] of Object.entries(expectedDomains)) if (domains[id] !== expected.diagnosticQuestions) add(null, 'blueprint-alignment', 'Batch ' + (batchIndex + 1) + ' has an invalid ' + id + ' allocation.');
  if (answerPositions.some((count) => count !== 25)) add(null, 'clue-resistance', 'Batch ' + (batchIndex + 1) + ' answer positions are not exactly balanced.');
}

const answerText = pack.items.map((item) => item.choices[item.answerIndex]).join(' ');
for (const [pattern, label] of [
  [/MTSS must not delay or deny a full individual evaluation/i, 'MTSS/evaluation safeguard'],
  [/legitimate educational interest tied to professional responsibility/i, 'student-record privacy safeguard'],
  [/qualified accessible language support/i, 'family language-access safeguard'],
  [/promptly follow current mandated-reporting law and school procedure/i, 'mandated-reporting safeguard'],
  [/current viewpoint-neutral school policy/i, 'student-expression safeguard'],
  [/remove an access barrier without changing the essential construct/i, 'assessment-accommodation safeguard'],
]) if (!pattern.test(answerText)) add(null, 'safety-boundary', 'Missing ' + label + '.');

const passedItems = itemReports.filter((report) => report.findings.length === 0).length;
const status = findings.length === 0 && passedItems === 200 ? 'pass' : 'review-required';
const generatedAt = new Date().toISOString();
const report = {
  schemaVersion: 1, generatedAt, packId: pack.id,
  standard: {
    label: 'AlloFlow independent 5622 source, structure, feedback, originality, safety, and linkage QA v1',
    meaning: 'A pass confirms exact diagnostic allocation, balanced answer positions, independently authored prompts, official-sample fragment screening, allowlisted sources, substantive feedback, stable identifiers, professional safeguards, and complete learning links.',
    limitation: 'This is not ETS or CCSSO approval, independent practicing K–6 educator validation, field testing, psychometric calibration, a scaled-score model, official constructed-response scoring, legal advice, a mandated-reporting or disability determination, a licensure decision, or an emergency directive.',
  },
  blueprint: {
    officialSelectedResponseCount: 70, officialConstructedResponseCount: 4, officialTotalTimeMinutes: 120,
    recommendedSelectedResponseMinutes: 70, recommendedConstructedResponseMinutes: 50,
    categories: Object.fromEntries(Object.entries(expectedDomains).map(([id, entry]) => [id, { selectedResponseQuestions: entry.officialQuestions, percentageOfExam: entry.officialPercentage }])),
    caseAnalysis: { constructedResponseQuestions: 4, percentageOfExam: 25, caseHistories: 2 },
  },
  diagnosticBatch: { batchCount: 2, batchSize: 100, categories: Object.fromEntries(Object.entries(expectedDomains).map(([id, entry]) => [id, entry.diagnosticQuestions])), batches: diagnosticBatches },
  summary: { totalItems: itemReports.length, passedItems, reviewRequiredItems: itemReports.length - passedItems, findings: findings.length, status },
  findings, items: itemReports,
};
const markdown = `# Praxis PLT K–6 (5622) QA report\n\nGenerated: ${generatedAt}\n\n## Result\n\n- Status: **${status.toUpperCase()}**\n- Items: ${itemReports.length}\n- Passed: ${passedItems}\n- Review required: ${itemReports.length - passedItems}\n- Diagnostic batches: 2 x 100\n- Selected-response pacing simulation: 70 questions / 70 minutes\n- Official full test represented: 70 selected responses + 4 constructed responses / 120 minutes\n\n> ${report.standard.limitation}\n`;
for (const outputRoot of [path.join(root, 'test_prep'), path.join(root, 'desktop/web-app', 'public', 'test_prep')]) {
  fs.mkdirSync(outputRoot, { recursive: true });
  fs.writeFileSync(path.join(outputRoot, 'plt_k6_5622_native_qa.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(outputRoot, 'plt_k6_5622_native_qa.md'), markdown, 'utf8');
}
console.log('Praxis PLT K–6 5622 pack QA: ' + status + ' (' + passedItems + '/200 items passed; ' + findings.length + ' findings).');
if (status !== 'pass') {
  for (const finding of findings.slice(0, 40)) console.error('- [' + finding.check + '] ' + (finding.itemId ? finding.itemId + ': ' : '') + finding.message);
  process.exitCode = 1;
}
