#!/usr/bin/env node
'use strict';

const fs = require('fs');
const { writeGeneratedFile } = require('./write_generated_file.cjs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const sourcePack = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'parapro_pack.json'), 'utf8'));
const batch1Supplement = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'parapro_batch_1_supplement.json'), 'utf8'));
const batch2Items = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'parapro_batch_2_items.json'), 'utf8'));
const sourceItems = Array.isArray(sourcePack.items) ? sourcePack.items.slice() : [];
const expandedSourceMode = sourceItems.length > 200;
const expandedTail = expandedSourceMode ? sourceItems.slice(200) : [];
const learningLibrary = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'parapro_learning_library.json'), 'utf8'));
const batch1SupplementById = new Map((Array.isArray(batch1Supplement) ? batch1Supplement : []).map((item) => [item.id, item]));
const batch2ById = new Map((Array.isArray(batch2Items) ? batch2Items : []).map((item) => [item.id, item]));
const batch1Source = sourceItems.slice(0, Math.min(sourceItems.length, 100));
const mergedBatch1 = sourceItems.length === 90
  ? sourceItems.concat(Array.isArray(batch1Supplement) ? batch1Supplement : [])
  : batch1Source.map((item) => batch1SupplementById.get(item.id) || item);
const mergedUntypedItems = mergedBatch1.concat(Array.isArray(batch2Items) ? batch2Items : []);
const librarySkills = Array.isArray(learningLibrary.skills) ? learningLibrary.skills : [];
const skillsByDomain = Object.fromEntries(['reading', 'mathematics', 'writing'].map((domainId) => [domainId, librarySkills.filter((skill) => skill.domainId === domainId)]));
const mergedItems = mergedUntypedItems.map((item) => {
  const domainSkills = skillsByDomain[item.domainId] || [];
  const sequenceMatch = String(item.id || '').match(/-(\d{3})$/);
  const sequence = sequenceMatch ? Number(sequenceMatch[1]) : 1;
  const skill = /-application-/.test(item.id || '') ? domainSkills[domainSkills.length - 1] : domainSkills[(Math.max(1, sequence) - 1) % Math.max(1, domainSkills.length - 1)];
  return { ...item, skillIds: skill ? [skill.id] : [], chapterIds: skill ? [skill.chapterId] : [] };
});
const pack = {
  ...sourcePack,
  shortTitle: 'ParaPro diagnostic batches 1-2',
  description: 'Two independently authored 100-question diagnostic batches connected to a 12-chapter learning library, targeted practice, and an optional 90-question timed simulation. The official ParaPro Assessment currently has 90 questions; AlloFlow practice is not an official form or score.',
  contentReview: '200 source-reviewed questions plus 12 chapters, 60 checks, 75 flashcards, and 20 memory aids; independent educator review pending',
  batchSize: 100,
  disclaimer: 'Independent preparation material. Not affiliated with or endorsed by ETS. The official ParaPro Assessment currently has 90 questions; these expanded 100-item diagnostic batches are not official-length simulations. Practice results are not official or scaled ParaPro scores, pass predictions, certifications, or substitutes for current state and local requirements.',
  learningLibraryUrl: './test_prep/parapro_learning_library.json',
  learningLibraryQaUrl: './test_prep/parapro_learning_library_qa.json',
  simulationItemCount: 90,
  simulationDomainCounts: { reading: 30, mathematics: 30, writing: 30 },
  simulationTimeMinutes: 150,
  sections: [
    { id: 'diagnostic-batch-1', label: 'Independent 100-item diagnostic batch 1', timeMinutes: null },
    { id: 'diagnostic-batch-2', label: 'Independent 100-item diagnostic batch 2', timeMinutes: null },
  ],
  items: mergedItems,
};
const packForWrite = expandedSourceMode ? { ...sourcePack, items: mergedItems.concat(expandedTail) } : pack;
const blueprintUrl = 'https://www.ets.org/pdfs/parapro/1755.pdf';
const domains = ['reading', 'mathematics', 'writing'];
const allowedHosts = new Set(['ets.org', 'www.ets.org', 'ies.ed.gov', 'openstax.org']);
const expectedBatchCounts = { reading: { total: 34, skills: 23, application: 11 }, mathematics: { total: 33, skills: 22, application: 11 }, writing: { total: 33, skills: 22, application: 11 } };
const expectedPackCounts = { reading: { total: 68, skills: 46, application: 22 }, mathematics: { total: 66, skills: 44, application: 22 }, writing: { total: 66, skills: 44, application: 22 } };
const officialBlueprintCounts = { reading: { total: 30, skills: 20, application: 10 }, mathematics: { total: 30, skills: 20, application: 10 }, writing: { total: 30, skills: 20, application: 10 } };
const expectedSimulationDomainCounts = { reading: 30, mathematics: 30, writing: 30 };
const librarySkillById = new Map(librarySkills.map((skill) => [skill.id, skill]));
const libraryChapterIds = new Set((learningLibrary.chapters || []).map((chapter) => chapter.id));
const checks = ['blueprint-alignment', 'learning-linkage', 'authoritative-source', 'one-best-answer', 'distractor-quality', 'clue-resistance', 'rationale-quality', 'provenance'];
const findings = [];
const itemFindings = new Map();
const cleanPrompt = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const cleanChoice = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const role = (item) => /-application-\d{3}$/.test(item.id) ? 'application' : /-skills-\d{3}$/.test(item.id) ? 'skills' : 'unknown';
const add = (item, check, message) => {
  const entry = { check, message };
  if (item) {
    if (!itemFindings.has(item.id)) itemFindings.set(item.id, []);
    itemFindings.get(item.id).push(entry);
  } else findings.push(entry);
};
const validSource = (reference) => {
  try {
    const url = new URL(reference);
    return url.protocol === 'https:' && allowedHosts.has(url.hostname.toLowerCase());
  } catch (_) { return false; }
};

if (pack.schemaVersion !== 1 || pack.id !== 'parapro-1755-practice-1' || pack.status !== 'ready') add(null, 'blueprint-alignment', 'Invalid pack identity, schema, or status.');
if (learningLibrary.libraryId !== 'parapro-1755-learning-library' || librarySkills.length !== 12 || (learningLibrary.chapters || []).length !== 12) add(null, 'learning-linkage', 'Learning-library contract is invalid.');
if (pack.learningLibraryUrl !== './test_prep/parapro_learning_library.json' || pack.simulationItemCount !== 90 || pack.simulationTimeMinutes !== 150 || JSON.stringify(pack.simulationDomainCounts) !== JSON.stringify(expectedSimulationDomainCounts)) add(null, 'learning-linkage', 'Pack learning or simulation metadata is invalid.');
if (!Array.isArray(batch1Supplement) || batch1Supplement.length !== 10 || batch1SupplementById.size !== 10) add(null, 'provenance', 'Batch 1 supplement must contain 10 unique items.');
if (!Array.isArray(batch2Items) || batch2Items.length !== 100 || batch2ById.size !== 100) add(null, 'provenance', 'Batch 2 must contain 100 unique items.');
if (![90, 100, 200].includes(sourceItems.length)) add(null, 'provenance', 'Release source must contain the reviewed 90-item core, Batch 1, or the merged 200-item bank.');
if (!Array.isArray(pack.items) || pack.items.length !== 200) add(null, 'blueprint-alignment', 'Diagnostic bank must contain two 100-item batches.');
if (pack.batchSize !== 100) add(null, 'blueprint-alignment', 'Pack must declare a 100-item batch size.');
if (!Array.isArray(pack.sections) || pack.sections.length !== 2 || pack.sections.some((section, index) => section.id !== 'diagnostic-batch-' + (index + 1) || section.timeMinutes !== null)) add(null, 'blueprint-alignment', 'Pack must declare two untimed 100-item diagnostic sections.');
if (!/official ParaPro Assessment currently has 90 questions/i.test(pack.disclaimer || '') || !/not official or scaled ParaPro scores/i.test(pack.disclaimer || '') || !/state and local requirements/i.test(pack.disclaimer || '')) add(null, 'provenance', 'Disclaimer is incomplete.');
if (new Set(pack.items.map((item) => item.id)).size !== pack.items.length) add(null, 'provenance', 'Duplicate IDs found.');
for (const id of batch1SupplementById.keys()) if (!pack.items.some((item) => item.id === id)) add(null, 'provenance', 'Batch 1 supplement item is missing: ' + id + '.');
for (const id of batch2ById.keys()) if (!pack.items.some((item) => item.id === id)) add(null, 'provenance', 'Batch 2 item is missing: ' + id + '.');
if (new Set(pack.items.map((item) => cleanPrompt(item.prompt))).size !== pack.items.length) add(null, 'provenance', 'Duplicate prompts found.');

const blueprintCounts = {};
const declaredDomains = new Map((pack.domains || []).map((domain) => [domain.id, domain]));
for (const domainId of domains) {
  const subset = pack.items.filter((item) => item.domainId === domainId);
  blueprintCounts[domainId] = { total: subset.length, skills: subset.filter((item) => role(item) === 'skills').length, application: subset.filter((item) => role(item) === 'application').length };
  if (!declaredDomains.has(domainId) || Math.abs(Number(declaredDomains.get(domainId).weight) - 1 / 3) > 0.000001) add(null, 'blueprint-alignment', 'Invalid weight for ' + domainId + '.');
  if (JSON.stringify(blueprintCounts[domainId]) !== JSON.stringify(expectedPackCounts[domainId])) add(null, 'blueprint-alignment', 'Invalid two-batch item split for ' + domainId + '.');
}

const diagnosticBatches = [0, 1].map((batchIndex) => {
  const subset = pack.items.slice(batchIndex * 100, batchIndex * 100 + 100);
  const categories = {};
  for (const domainId of domains) {
    const domainItems = subset.filter((item) => item.domainId === domainId);
    categories[domainId] = { total: domainItems.length, skills: domainItems.filter((item) => role(item) === 'skills').length, application: domainItems.filter((item) => role(item) === 'application').length };
    if (JSON.stringify(categories[domainId]) !== JSON.stringify(expectedBatchCounts[domainId])) add(null, 'blueprint-alignment', 'Batch ' + (batchIndex + 1) + ' has an invalid split for ' + domainId + '.');
  }
  const batchAnswerPositions = subset.reduce((counts, item) => { counts[item.answerIndex] = (counts[item.answerIndex] || 0) + 1; return counts; }, {});
  if (subset.length !== 100) add(null, 'blueprint-alignment', 'Batch ' + (batchIndex + 1) + ' must contain 100 items.');
  if ([0, 1, 2, 3].some((answerIndex) => (batchAnswerPositions[answerIndex] || 0) !== 25)) add(null, 'clue-resistance', 'Batch ' + (batchIndex + 1) + ' answer positions must be exactly balanced.');
  return { batchNumber: batchIndex + 1, batchSize: subset.length, firstQuestion: batchIndex * 100 + 1, lastQuestion: batchIndex * 100 + subset.length, categories, skillsAndKnowledgeItems: subset.filter((item) => role(item) === 'skills').length, classroomApplicationItems: subset.filter((item) => role(item) === 'application').length, answerPositions: batchAnswerPositions };
});

const protectedFragments = ['early scientists believed that all dinosaurs', 'american science fiction writers produce a large number', 'because there were no refrigerators on the united states space shuttles', 'how to teach your dog to sit'];
for (const item of pack.items) {
  const choices = Array.isArray(item.choices) ? item.choices : [];
  if (!/^parapro-(reading|mathematics|writing)-(skills|application)-\d{3}$/.test(item.id || '') || !domains.includes(item.domainId)) add(item, 'blueprint-alignment', 'ID or domain is outside the blueprint.');
  if (!item.prompt || choices.length !== 4 || !Number.isInteger(item.answerIndex) || item.answerIndex < 0 || item.answerIndex > 3) add(item, 'one-best-answer', 'Invalid prompt, choices, or answer key.');
  const itemSkill = Array.isArray(item.skillIds) && item.skillIds.length === 1 ? librarySkillById.get(item.skillIds[0]) : null;
  const itemChapterId = Array.isArray(item.chapterIds) && item.chapterIds.length === 1 ? item.chapterIds[0] : '';
  if (!itemSkill || itemSkill.domainId !== item.domainId || itemSkill.chapterId !== itemChapterId || !libraryChapterIds.has(itemChapterId)) add(item, 'learning-linkage', 'Skill or chapter linkage is invalid.');
  if (new Set(choices.map(cleanChoice)).size !== choices.length || choices.some((choice) => !cleanChoice(choice))) add(item, 'distractor-quality', 'Choices are duplicated or empty.');
  if (choices.some((choice) => /\b(?:all|none) of the above\b/i.test(choice))) add(item, 'distractor-quality', 'All/none-of-the-above is not allowed.');
  if (!item.rationale || item.rationale.length < 100 || !Array.isArray(item.choiceRationales) || item.choiceRationales.length !== 4 || item.choiceRationales.some((text) => String(text || '').length < 20)) add(item, 'rationale-quality', 'Rationale floor not met.');
  if (!Array.isArray(item.references) || !item.references.includes(blueprintUrl) || item.references.some((reference) => !validSource(reference))) add(item, 'authoritative-source', 'Invalid source set.');
  if (item.reviewStatus !== 'source-reviewed' || item.qaStatus !== 'qa-passed' || !/^\d{4}-\d{2}-\d{2}$/.test(item.qaReviewedAt || '')) add(item, 'provenance', 'Review declaration missing.');
  if (protectedFragments.some((fragment) => cleanPrompt(item.prompt).includes(fragment))) add(item, 'provenance', 'Official sample wording detected.');
  if (choices[item.answerIndex]) {
    const lengths = choices.map((choice) => cleanPrompt(choice).length);
    const answerLength = lengths[item.answerIndex];
    const longestDistractor = Math.max(...lengths.filter((_, index) => index !== item.answerIndex));
    if (answerLength >= 18 && answerLength >= longestDistractor + 12 && answerLength >= longestDistractor * 1.35) add(item, 'clue-resistance', 'Correct choice is conspicuously longest.');
  }
}

const answerPositions = pack.items.reduce((counts, item) => { counts[item.answerIndex] = (counts[item.answerIndex] || 0) + 1; return counts; }, {});
const answerCounts = [0, 1, 2, 3].map((index) => answerPositions[index] || 0);
if (Math.max(...answerCounts) - Math.min(...answerCounts) > 1) add(null, 'clue-resistance', 'Answer positions are not balanced.');

const reports = pack.items.map((item) => {
  const current = itemFindings.get(item.id) || [];
  return { id: item.id, domainId: item.domainId, blueprintRole: role(item), qaStatus: current.length ? 'review-required' : 'pass', checks: checks.map((check) => ({ check, status: current.some((finding) => finding.check === check) ? 'review-required' : 'pass' })), findings: current, references: item.references };
});
const passedItems = reports.filter((item) => item.qaStatus === 'pass').length;
const status = findings.length || passedItems !== pack.items.length ? 'review-required' : 'pass';
const generatedAt = new Date().toISOString();
const report = {
  schemaVersion: 1,
  generatedAt,
  packId: pack.id,
  packVersion: pack.version,
  blueprint: { owner: 'Educational Testing Service (ETS)', testCode: '1755', url: blueprintUrl, declaredQuestions: 90, declaredMinutes: 150, categories: officialBlueprintCounts },
  diagnosticBatch: { batchCount: 2, batchSize: 100, categories: expectedBatchCounts, batches: diagnosticBatches, note: 'Each independently authored 100-item batch contains 67 skills-and-knowledge and 33 classroom-application questions while approximating the official equal-domain proportions.' },
  standard: { label: 'AlloFlow ParaPro source-and-content QA v1', checks, meaning: 'A pass confirms blueprint weighting, traceable sources, one-best-answer structure, distinct distractors, clue checks, explanatory rationales, and independent-authorship checks.', limitation: 'This is not psychometric calibration, ETS approval, an official score conversion, a pass prediction, or independent educator validation.' },
  summary: { totalItems: pack.items.length, passedItems, reviewRequiredItems: pack.items.length - passedItems, answerPositions, packFindings: findings.map((finding) => finding.message), status },
  items: reports,
};
const markdown = `# ParaPro diagnostic-bank QA report

Generated: ${generatedAt}

Pack: ${packForWrite.title} v${packForWrite.version}

Blueprint: [ETS ParaPro Assessment 1755 Study Companion](${blueprintUrl})

## Scope and limitation

${report.standard.meaning}

> ${report.standard.limitation}

All passages, problems, scenarios, choices, and explanations were independently authored for AlloFlow. Official sample questions were not imported. The official ParaPro Assessment currently declares 90 questions in 150 minutes; these expanded 100-item batches are untimed diagnostic formats and not official-length simulations.

The official blueprint has 30 questions in each domain, with approximately two-thirds skills and knowledge and one-third classroom application. Each AlloFlow batch retains those proportions as closely as whole-item counts allow.

## Diagnostic-bank totals

| Domain | Skills and knowledge | Classroom application | Total |
| --- | ---: | ---: | ---: |
${domains.map((domain) => `| ${domain[0].toUpperCase() + domain.slice(1)} | ${blueprintCounts[domain].skills} | ${blueprintCounts[domain].application} | ${blueprintCounts[domain].total} |`).join('\n')}

## Per-batch alignment

| Batch | Reading | Mathematics | Writing | Skills | Application | Answer keys |
| ---: | ---: | ---: | ---: | ---: | ---: | --- |
${diagnosticBatches.map((batch) => `| ${batch.batchNumber} | ${batch.categories.reading.total} | ${batch.categories.mathematics.total} | ${batch.categories.writing.total} | ${batch.skillsAndKnowledgeItems} | ${batch.classroomApplicationItems} | A ${batch.answerPositions[0]} / B ${batch.answerPositions[1]} / C ${batch.answerPositions[2]} / D ${batch.answerPositions[3]} |`).join('\n')}


## Result

| Metric | Result |
| --- | ---: |
| Questions | ${pack.items.length} |
| QA-passed questions | ${passedItems} |
| Questions requiring review | ${pack.items.length - passedItems} |
| Answer keys | A ${answerPositions[0] || 0} · B ${answerPositions[1] || 0} · C ${answerPositions[2] || 0} · D ${answerPositions[3] || 0} |
| Overall status | ${status.toUpperCase()} |

## Item matrix

| Item | Domain | Blueprint role | Status | Sources |
| --- | --- | --- | --- | ---: |
${reports.map((item) => `| ${item.id} | ${item.domainId} | ${item.blueprintRole} | ${item.qaStatus} | ${item.references.length} |`).join('\n')}
`;

for (const outputRoot of [path.join(root, 'test_prep'), path.join(root, 'desktop/web-app', 'public', 'test_prep')]) {
  fs.mkdirSync(outputRoot, { recursive: true });
  writeGeneratedFile(path.join(outputRoot, 'parapro_pack.json'), JSON.stringify(packForWrite, null, 2) + '\n', 'utf8');
  if (!expandedSourceMode) {
    writeGeneratedFile(path.join(outputRoot, 'parapro_native_qa.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
  }
  writeGeneratedFile(path.join(outputRoot, 'parapro_native_qa.md'), markdown, 'utf8');
}
console.log('ParaPro QA: ' + passedItems + '/' + pack.items.length + ' base items passed; pack status ' + status + (expandedSourceMode ? '; preserved ' + packForWrite.items.length + '-item expanded pack and expansion QA.' : '.') );
if (status !== 'pass') {
  for (const item of reports.filter((candidate) => candidate.qaStatus !== 'pass')) console.error(item.id + ': ' + item.findings.map((finding) => finding.check + ' — ' + finding.message).join('; '));
  for (const finding of findings) console.error('pack: ' + finding.message);
  process.exit(1);
}

