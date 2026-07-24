#!/usr/bin/env node
'use strict';

const fs = require('fs');
const { writeGeneratedFile } = require('./write_generated_file.cjs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const pack = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'praxis_core_5752_pack.json'), 'utf8'));
const sourceItems = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'praxis_core_5752_items.json'), 'utf8'));
const library = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'praxis_core_5752_learning_library.json'), 'utf8'));
const blueprintUrls = {
  reading: 'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5713.pdf',
  writing: 'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5723.pdf',
  mathematics: 'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5733.pdf',
};
const allowedHosts = new Set(['praxis.ets.org', 'thecorestandards.org', 'www.thecorestandards.org']);
const expectedDomains = {
  'reading-key-ideas-details': 13,
  'reading-craft-structure-language': 11,
  'reading-integration-knowledge-ideas': 13,
  'writing-text-types-production': 8,
  'writing-language-research': 18,
  'math-number-quantity': 13,
  'math-data-statistics-probability': 12,
  'math-algebra-geometry': 12,
};
const expectedSimulationDomainCounts = {
  'reading-key-ideas-details': 20,
  'reading-craft-structure-language': 16,
  'reading-integration-knowledge-ideas': 20,
  'writing-text-types-production': 10,
  'writing-language-research': 30,
  'math-number-quantity': 20,
  'math-data-statistics-probability': 18,
  'math-algebra-geometry': 18,
};
const officialSimulationRanges = {
  'reading-key-ideas-details': [17, 22],
  'reading-craft-structure-language': [14, 19],
  'reading-integration-knowledge-ideas': [17, 22],
  'writing-text-types-production': [6, 12],
  'writing-language-research': [28, 34],
  'math-number-quantity': [20, 20],
  'math-data-statistics-probability': [18, 18],
  'math-algebra-geometry': [18, 18],
};
const officialSampleFragments = [
  'marguerite duras achievement as a filmmaker',
  'one promising energy source is sophisticated development',
  'when michelangelo began painting the sistine chapel ceiling',
  'alice fletcher the margaret mead of her day',
];
const findings = [];
const itemReports = [];
const add = (item, check, message) => {
  const finding = { itemId: item ? item.id : '', check, message };
  findings.push(finding);
  if (item) itemReports.find((report) => report.id === item.id)?.findings.push({ check, message });
};

if (pack.id !== 'praxis-core-5752' || pack.batchSize !== 100 || pack.simulationItemCount !== 152 || pack.simulationTimeMinutes !== 215) add(null, 'blueprint-alignment', 'Pack identity, diagnostic size, or selected-response simulation metadata is invalid.');
if (pack.officialSelectedResponseCount !== 152 || pack.officialConstructedResponseCount !== 2 || pack.officialTotalTimeMinutes !== 275) add(null, 'blueprint-alignment', 'Official combined response counts or total timed-section minutes are invalid.');
if (!/152 selected-response questions plus two essays across 275 minutes/i.test(pack.disclaimer || '') || !/not affiliated with or endorsed by ETS/i.test(pack.disclaimer || '') || !/not official Praxis forms, scaled scores, essay scores, pass predictions/i.test(pack.disclaimer || '')) add(null, 'provenance', 'The format, score, and affiliation disclaimer is incomplete.');
if (!/85 minutes reading, 40 minutes writing selected response, and 90 minutes mathematics/i.test(pack.simulationNote || '') || !/two essay sections/i.test(pack.simulationNote || '') || !/total 275 minutes/i.test(pack.simulationNote || '') || !/exact official subject totals/i.test(pack.simulationNote || '') || !/stable product allocation/i.test(pack.simulationNote || '') || !/within the published ETS ranges/i.test(pack.simulationNote || '') || !/not an official fixed-form allocation/i.test(pack.simulationNote || '')) add(null, 'blueprint-alignment', 'Selected-response timing and fixed-within-range allocation boundaries are incomplete.');
if (pack.learningLibraryUrl !== './test_prep/praxis_core_5752_learning_library.json' || pack.learningLibraryQaUrl !== './test_prep/praxis_core_5752_learning_library_qa.json') add(null, 'learning-linkage', 'Learning-library URLs are invalid.');
if (!Array.isArray(sourceItems) || sourceItems.length !== 200 || !Array.isArray(pack.items) || pack.items.length !== 200 || JSON.stringify(sourceItems) !== JSON.stringify(pack.items)) add(null, 'release-structure', 'Pack and source arrays must be identical and contain 200 items.');
if (!library || library.packId !== pack.id || !Array.isArray(library.skills) || library.skills.length !== 12 || !Array.isArray(library.chapters) || library.chapters.length !== 12 || !Array.isArray(library.constructedResponseWorkshops) || library.constructedResponseWorkshops.length !== 8) add(null, 'learning-linkage', 'The learning library is missing or incomplete.');

const declaredDomains = new Map(pack.domains.map((domain) => [domain.id, domain]));
for (const [id, count] of Object.entries(expectedDomains)) if (!declaredDomains.has(id) || declaredDomains.get(id).weight !== count / 100) add(null, 'blueprint-alignment', 'Invalid diagnostic domain declaration for ' + id + '.');
const skillById = new Map(library.skills.map((skill) => [skill.id, skill]));
const chapterById = new Map(library.chapters.map((chapter) => [chapter.id, chapter]));
const promptSet = new Set();
const idSet = new Set();

for (const item of pack.items) {
  const report = { id: item.id, findings: [] };
  itemReports.push(report);
  if (!/^core5752-b[12]-\d{3}$/.test(item.id || '') || idSet.has(item.id)) add(item, 'release-structure', 'ID is invalid or duplicated.');
  idSet.add(item.id);
  const prompt = String(item.prompt || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (prompt.length < 35 || promptSet.has(prompt)) add(item, 'originality', 'Prompt is too short or duplicated.');
  promptSet.add(prompt);
  if (officialSampleFragments.some((fragment) => prompt.includes(fragment))) add(item, 'originality', 'Prompt overlaps a screened official-sample fragment.');
  if (!expectedDomains[item.domainId]) add(item, 'blueprint-alignment', 'Domain is outside the Praxis Core diagnostic blueprint.');
  if (item.type !== 'single-choice' || !Array.isArray(item.choices) || item.choices.length !== 4 || new Set(item.choices).size !== 4 || !Number.isInteger(item.answerIndex) || item.answerIndex < 0 || item.answerIndex > 3) add(item, 'one-best-answer', 'Single-choice structure is invalid.');
  if (String(item.rationale || '').length < 100 || !Array.isArray(item.choiceRationales) || item.choiceRationales.length !== 4 || item.choiceRationales.some((entry) => String(entry).length < 100)) add(item, 'rationale-quality', 'General or option-specific feedback is not substantive.');
  if (!Array.isArray(item.references) || item.references.length < 2 || !item.references.some((url) => Object.values(blueprintUrls).includes(url)) || item.references.some((url) => { try { return !allowedHosts.has(new URL(url).hostname); } catch (_) { return true; } })) add(item, 'authoritative-source', 'References are missing an official subtest blueprint or include a non-allowlisted host.');
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
  for (const [id, expected] of Object.entries(expectedDomains)) if (domains[id] !== expected) add(null, 'blueprint-alignment', 'Batch ' + (batchIndex + 1) + ' has an invalid ' + id + ' allocation.');
  if (answerPositions.some((count) => count !== 25)) add(null, 'clue-resistance', 'Batch ' + (batchIndex + 1) + ' answer positions are not exactly balanced.');
  if (batch.filter((item) => item.domainId.startsWith('reading-')).length !== 37 || batch.filter((item) => item.domainId.startsWith('writing-')).length !== 26 || batch.filter((item) => item.domainId.startsWith('math-')).length !== 37) add(null, 'blueprint-alignment', 'Batch ' + (batchIndex + 1) + ' must contain 37 reading, 26 writing, and 37 mathematics items.');
}

const simulationCounts = pack.simulationDomainCounts && typeof pack.simulationDomainCounts === 'object' ? pack.simulationDomainCounts : {};
if (JSON.stringify(simulationCounts) !== JSON.stringify(expectedSimulationDomainCounts)) add(null, 'blueprint-alignment', 'The fixed Core simulation allocation must be 20/16/20 Reading, 10/30 Writing selected response, and 20/18/18 Mathematics.');
if (pack.simulationDomainCountsBasis !== 'fixed-product-allocation-within-official-ranges') add(null, 'blueprint-alignment', 'The Core simulation must identify its Reading/Writing subdomain counts as a fixed product allocation within official ranges.');
const simulationSubjects = {
  reading: Number(simulationCounts['reading-key-ideas-details'] || 0) + Number(simulationCounts['reading-craft-structure-language'] || 0) + Number(simulationCounts['reading-integration-knowledge-ideas'] || 0),
  writing: Number(simulationCounts['writing-text-types-production'] || 0) + Number(simulationCounts['writing-language-research'] || 0),
  mathematics: Number(simulationCounts['math-number-quantity'] || 0) + Number(simulationCounts['math-data-statistics-probability'] || 0) + Number(simulationCounts['math-algebra-geometry'] || 0),
};
if (simulationSubjects.reading !== 56 || simulationSubjects.writing !== 40 || simulationSubjects.mathematics !== 56) add(null, 'blueprint-alignment', 'The metadata must preserve the exact 56 Reading, 40 Writing selected-response, and 56 Mathematics subject totals.');
for (const [domainId, [minimum, maximum]] of Object.entries(officialSimulationRanges)) {
  const declared = Number(simulationCounts[domainId] || 0);
  if (declared < minimum || declared > maximum) add(null, 'blueprint-alignment', 'Simulation count for ' + domainId + ' is outside the published ETS range.');
  const available = pack.items.filter((item) => item.domainId === domainId && item.examItemStatus !== 'not-approved-as-independent-exam-item').length;
  if (available < declared) add(null, 'blueprint-alignment', 'Simulation count for ' + domainId + ' exceeds the independent item supply.');
}

const equationA = pack.items.find((item) => item.id === 'core5752-b1-089');
const equationB = pack.items.find((item) => item.id === 'core5752-b2-089');
if (!equationA || !/3x = 18/i.test(equationA.rationale || '') || /5x = 30/i.test(equationA.rationale || '')) add(equationA || null, 'rationale-accuracy', 'The 3x + 7 = 25 item must explain only its own equation.');
if (!equationB || !/5x = 30/i.test(equationB.rationale || '') || /3x = 18/i.test(equationB.rationale || '')) add(equationB || null, 'rationale-accuracy', 'The 5x - 12 = 18 item must explain only its own equation.');

const passedItems = itemReports.filter((report) => report.findings.length === 0).length;
const status = findings.length === 0 && passedItems === 200 ? 'pass' : 'review-required';
const generatedAt = new Date().toISOString();
const report = {
  schemaVersion: 1, generatedAt, packId: pack.id,
  standard: {
    label: 'AlloFlow independent Praxis Core 5752 source, structure, feedback, originality, and linkage QA v1',
    meaning: 'A pass confirms exact diagnostic allocation, balanced answer positions, independently authored prompts, official-sample fragment screening, authoritative sources, substantive feedback, stable identifiers, and complete learning links.',
    limitation: 'This is not ETS approval, independent literacy, writing, mathematics, accessibility, or psychometric validation, field testing, a scaled-score model, official essay scoring, a pass prediction, an admission or licensure decision, or an accommodation decision.',
  },
  blueprint: {
    officialSelectedResponseCount: 152, officialEssayCount: 2, officialTotalTimeMinutes: 275, selectedResponseMinutes: 215, simulationSubjects, simulationDomainCounts: expectedSimulationDomainCounts, simulationDomainCountsBasis: pack.simulationDomainCountsBasis,
    subtests: { reading5713: { questions: 56, minutes: 85 }, writing5723: { selectedResponseQuestions: 40, selectedResponseMinutes: 40, essays: 2, essayMinutesEach: 30 }, mathematics5733: { questions: 56, minutes: 90 } },
  },
  diagnosticBatch: { batchCount: 2, batchSize: 100, subjectAllocation: { reading: 37, writing: 26, mathematics: 37 }, categories: expectedDomains, batches: diagnosticBatches },
  summary: { totalItems: itemReports.length, passedItems, reviewRequiredItems: itemReports.length - passedItems, findings: findings.length, status },
  findings, items: itemReports,
};
const markdown = `# Praxis Core Combined (5752) QA report\n\nGenerated: ${generatedAt}\n\n## Result\n\n- Status: **${status.toUpperCase()}**\n- Items: ${itemReports.length}\n- Passed: ${passedItems}\n- Review required: ${itemReports.length - passedItems}\n- Diagnostic banks: 2 x 100\n- Selected-response simulation: 152 questions / 215 minutes\n- Official combined timed sections represented: 152 selected responses + 2 essays / 275 minutes\n\n> ${report.standard.limitation}\n`;
for (const outputRoot of [path.join(root, 'test_prep'), path.join(root, 'desktop/web-app', 'public', 'test_prep')]) {
  fs.mkdirSync(outputRoot, { recursive: true });
  writeGeneratedFile(path.join(outputRoot, 'praxis_core_5752_native_qa.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
  writeGeneratedFile(path.join(outputRoot, 'praxis_core_5752_native_qa.md'), markdown, 'utf8');
}
console.log('Praxis Core 5752 pack QA: ' + status + ' (' + passedItems + '/200 items passed; ' + findings.length + ' findings).');
if (status !== 'pass') {
  for (const finding of findings.slice(0, 40)) console.error('- [' + finding.check + '] ' + (finding.itemId ? finding.itemId + ': ' : '') + finding.message);
  process.exitCode = 1;
}
