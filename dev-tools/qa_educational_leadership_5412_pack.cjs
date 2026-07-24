#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const pack = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'educational_leadership_5412_pack.json'), 'utf8'));
const sourceItems = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'educational_leadership_5412_items.json'), 'utf8'));
const library = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'educational_leadership_5412_learning_library.json'), 'utf8'));
const blueprintUrl = 'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5412.pdf';
const allowedHosts = new Set(['praxis.ets.org', 'npbea.org', 'www.npbea.org', 'ies.ed.gov', 'studentprivacy.ed.gov', 'sites.ed.gov', 'ed.gov', 'www.ed.gov', 'cisa.gov', 'www.cisa.gov']);
const expectedDomains = {
  'strategic-leadership': { label: 'Strategic Leadership', weight: 0.17, officialQuestions: 20, officialPercentage: 17, diagnosticQuestions: 17 },
  'instructional-leadership': { label: 'Instructional Leadership', weight: 0.23, officialQuestions: 27, officialPercentage: 23, diagnosticQuestions: 23 },
  'climate-cultural-leadership': { label: 'Climate and Cultural Leadership', weight: 0.18, officialQuestions: 22, officialPercentage: 18, diagnosticQuestions: 18 },
  'ethical-leadership': { label: 'Ethical Leadership', weight: 0.16, officialQuestions: 19, officialPercentage: 16, diagnosticQuestions: 16 },
  'organizational-leadership': { label: 'Organizational Leadership', weight: 0.13, officialQuestions: 16, officialPercentage: 13, diagnosticQuestions: 13 },
  'community-engagement-leadership': { label: 'Community Engagement Leadership', weight: 0.13, officialQuestions: 16, officialPercentage: 13, diagnosticQuestions: 13 },
};
const officialSampleFragments = [
  'newly appointed school leader of an elementary school',
  'long-standing pattern of high rates of disciplinary referrals',
  'local pastor seeks approval from the school leader',
  'developing professional learning communities within each content department',
];
const findings = [];
const itemReports = [];
const add = (item, check, message) => {
  const finding = { itemId: item ? item.id : '', check, message };
  findings.push(finding);
  if (item) itemReports.find((report) => report.id === item.id)?.findings.push({ check, message });
};

if (pack.id !== 'praxis-educational-leadership-5412' || pack.batchSize !== 100 || pack.simulationItemCount !== 120 || pack.simulationTimeMinutes !== 165) add(null, 'blueprint-alignment', 'Pack identity, diagnostic size, or 120-question/165-minute simulation declaration is invalid.');
if (pack.officialSelectedResponseCount !== 120 || pack.officialConstructedResponseCount !== 0) add(null, 'blueprint-alignment', 'The official response-format declaration is invalid.');
if (!/120 selected-response questions in 165 minutes/i.test(pack.disclaimer || '') || !/not official or scaled Praxis scores/i.test(pack.disclaimer || '') || !/not affiliated with or endorsed by ETS or NPBEA/i.test(pack.disclaimer || '')) add(null, 'provenance', 'The format, score, and affiliation disclaimer is incomplete.');
if (pack.learningLibraryUrl !== './test_prep/educational_leadership_5412_learning_library.json' || pack.learningLibraryQaUrl !== './test_prep/educational_leadership_5412_learning_library_qa.json') add(null, 'learning-linkage', 'Learning-library URLs are invalid.');
if (!Array.isArray(sourceItems) || sourceItems.length !== 200 || !Array.isArray(pack.items) || pack.items.length !== 200 || JSON.stringify(sourceItems) !== JSON.stringify(pack.items)) add(null, 'release-structure', 'Pack and source item arrays must be identical and contain 200 items.');
if (!library || library.packId !== pack.id || !Array.isArray(library.skills) || !Array.isArray(library.chapters)) add(null, 'learning-linkage', 'Learning library is missing or targets another pack.');

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
  if (!/^lead5412-b[12]-\d{3}$/.test(item.id || '') || idSet.has(item.id)) add(item, 'release-structure', 'ID is invalid or duplicated.');
  idSet.add(item.id);
  const prompt = String(item.prompt || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (prompt.length < 35 || promptSet.has(prompt)) add(item, 'originality', 'Prompt is too short or duplicated.');
  promptSet.add(prompt);
  if (officialSampleFragments.some((fragment) => prompt.includes(fragment))) add(item, 'originality', 'Prompt overlaps a screened official-sample fragment.');
  if (!expectedDomains[item.domainId]) add(item, 'blueprint-alignment', 'Domain is outside the 5412 blueprint.');
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
  [/must not delay or deny a full individual evaluation/i, 'MTSS/evaluation safeguard'],
  [/minimum necessary information/i, 'student-record privacy safeguard'],
  [/multifactor authentication/i, 'cybersecurity safeguard'],
  [/emergency operations plan/i, 'emergency-planning safeguard'],
  [/protect against retaliation/i, 'civil-rights retaliation safeguard'],
  [/disclose the interest/i, 'conflict-of-interest safeguard'],
]) if (!pattern.test(answerText)) add(null, 'safety-boundary', 'Missing ' + label + '.');

const passedItems = itemReports.filter((report) => report.findings.length === 0).length;
const status = findings.length === 0 && passedItems === 200 ? 'pass' : 'review-required';
const generatedAt = new Date().toISOString();
const report = {
  schemaVersion: 1, generatedAt, packId: pack.id,
  standard: {
    label: 'AlloFlow independent 5412 source, structure, feedback, originality, safety, and linkage QA v1',
    meaning: 'A pass confirms exact diagnostic allocation, balanced answer positions, independently authored prompts, official-sample fragment screening, allowlisted sources, substantive feedback, stable identifiers, safety boundaries, and complete learning links.',
    limitation: 'This is not ETS or NPBEA approval, independent practicing-school-leader validation, field testing, psychometric calibration, a scaled-score model, legal or personnel advice, an employment or licensure decision, or an emergency directive.',
  },
  blueprint: { officialQuestionCount: 120, timeMinutes: 165, selectedResponse: true, categories: Object.fromEntries(Object.entries(expectedDomains).map(([id, entry]) => [id, { questions: entry.officialQuestions, percentage: entry.officialPercentage }])) },
  diagnosticBatch: { batchCount: 2, batchSize: 100, categories: Object.fromEntries(Object.entries(expectedDomains).map(([id, entry]) => [id, entry.diagnosticQuestions])), batches: diagnosticBatches },
  summary: { totalItems: itemReports.length, passedItems, reviewRequiredItems: itemReports.length - passedItems, findings: findings.length, status },
  findings, items: itemReports,
};
const markdown = `# Praxis Educational Leadership (5412) QA report\n\nGenerated: ${generatedAt}\n\n## Result\n\n- Status: **${status.toUpperCase()}**\n- Items: ${itemReports.length}\n- Passed: ${passedItems}\n- Review required: ${itemReports.length - passedItems}\n- Diagnostic batches: 2 x 100\n- Optional simulation: 120 questions / 165 minutes\n\n> ${report.standard.limitation}\n`;
for (const outputRoot of [path.join(root, 'test_prep'), path.join(root, 'desktop/web-app', 'public', 'test_prep')]) {
  fs.mkdirSync(outputRoot, { recursive: true });
  fs.writeFileSync(path.join(outputRoot, 'educational_leadership_5412_native_qa.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(outputRoot, 'educational_leadership_5412_native_qa.md'), markdown, 'utf8');
}
console.log('Praxis Educational Leadership 5412 pack QA: ' + status + ' (' + passedItems + '/200 items passed; ' + findings.length + ' findings).');
if (status !== 'pass') {
  for (const finding of findings.slice(0, 30)) console.error('- [' + finding.check + '] ' + (finding.itemId ? finding.itemId + ': ' : '') + finding.message);
  process.exitCode = 1;
}
