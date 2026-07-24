#!/usr/bin/env node
'use strict';
const fs = require('fs');
const { hasChoiceSpecificFeedback } = require('./non_eppp_feedback_checks.cjs');
const { writeGeneratedFile } = require('./write_generated_file.cjs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'test_prep');
const deployDir = path.join(root, 'desktop/web-app', 'public', 'test_prep');
const pack = JSON.parse(fs.readFileSync(path.join(sourceDir, 'early_childhood_5025_pack.json'), 'utf8'));
const lib = JSON.parse(fs.readFileSync(path.join(sourceDir, 'early_childhood_5025_learning_library.json'), 'utf8'));
const findings = [];
const add = (check, message, id = '') => findings.push({ check, id, message });
const counts = { 'language-literacy': 30, mathematics: 25, 'social-studies': 14, science: 14, 'health-physical-arts': 17 };
const official = { 'language-literacy': 36, mathematics: 30, 'social-studies': 17, science: 17, 'health-physical-arts': 20 };
const positionsBySkill = {
  'oral-language-emergent-literacy':[1,2,3,4,5,6,7,8],
  'phonological-phonics-word-reading':[9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,29],
  'comprehension-writing-literature':[28,30],
  'number-operations':[31,32,33,34,35,36,45,47,48,49,51,52,53,54],
  'measurement-data':[41,42,43,44,46,55],
  'geometry-reasoning':[37,38,39,40,50],
  'history-civics-culture':[56,57,59,60,64,65,67,68,69],
  'geography-economics-inquiry':[58,61,62,63,66],
  'physical-earth-science':[70,71,72,73,74,75,76,77,78,79],
  'life-science-engineering':[80,81,82,83],
  'health-physical-development':[84,85,86,87,88,89,90],
  'creative-performing-arts':[91,92,93,94,95,96,97,98,99,100]
};
const expectedSkill = new Map(Object.entries(positionsBySkill).flatMap(([skill, positions]) => positions.map(position => [position, skill])));
const skills = new Map((lib.skills || []).map(skill => [skill.id, skill]));
const chapters = new Map((lib.chapters || []).map(chapter => [chapter.id, chapter]));

if (pack.items?.length !== 200 || pack.id !== 'praxis-early-childhood-5025') add('identity', 'Invalid pack');
for (let batch = 0; batch < 2; batch++) {
  const items = pack.items.slice(batch * 100, batch * 100 + 100);
  for (const [domain, count] of Object.entries(counts)) if (items.filter(item => item.domainId === domain).length !== count) add('blueprint', 'Invalid diagnostic count for ' + domain);
  if ([0,1,2,3].some(answer => items.filter(item => item.answerIndex === answer).length !== 25)) add('balance', 'Invalid answer balance');
}
for (const [domain, count] of Object.entries(official)) if (pack.items.slice(0, 120).filter(item => item.domainId === domain).length !== count) add('simulation', 'Invalid simulation count for ' + domain);
if (new Set(pack.items.map(item => item.prompt)).size !== 200) add('originality', 'Duplicate prompts');

for (const item of pack.items) {
  if (item.choices?.length !== 4 || item.choiceRationales?.length !== 4 || item.rationale?.length < 120 || item.skillIds?.length !== 1 || item.chapterIds?.length !== 1) {
    add('item', 'Invalid item shape', item.id);
    continue;
  }
  const skill = skills.get(item.skillIds[0]);
  const chapter = chapters.get(item.chapterIds[0]);
  const position = Number(item.id.match(/-(\d{3})$/)?.[1]);
  if (!skill || !chapter || skill.domainId !== item.domainId || skill.chapterId !== chapter.id || chapter.skillId !== skill.id || expectedSkill.get(position) !== skill.id) {
    add('semantic-learning-link', 'Item does not map to its item-level concept skill/chapter', item.id);
  }
  if (/^The correct response represents the central disciplinary idea/i.test(item.rationale)) add('generic-rationale', 'Generic concept rationale remains', item.id);
  for (let index = 0; index < 4; index++) {
    if (index === item.answerIndex) continue;
    const feedback = item.choiceRationales[index] || '';
    if (feedback.includes(item.rationale) || !hasChoiceSpecificFeedback(item.choices[index], feedback)) add('option-feedback', 'Wrong-option feedback is not choice-specific or copies the full rationale', item.id);
  }
}
const phonemeItem = pack.items.find(item => item.id === 'ec5025-b1-026');
if (!phonemeItem || !/best instructional response/i.test(phonemeItem.prompt)) add('stem-key-alignment', 'Phoneme-analysis item must ask for the instructional response its key provides', 'ec5025-b1-026');

if (lib.summary?.chapters !== 12 || lib.summary?.sections !== 48 || lib.summary?.knowledgeChecks !== 60 || lib.summary?.flashcards !== 75 || lib.summary?.memoryAids !== 20) add('library', 'Invalid library inventory');
for (const chapter of lib.chapters || []) if (chapter.sections?.length !== 4 || chapter.knowledgeChecks?.length !== 5 || chapter.sections.some(section => section.content.length < 350)) add('chapter', 'Invalid chapter', chapter.id);
for (const name of ['early_childhood_5025_pack.json','early_childhood_5025_items.json','early_childhood_5025_learning_library.json']) {
  const source = path.join(sourceDir, name), deploy = path.join(deployDir, name);
  if (!fs.existsSync(deploy) || !fs.readFileSync(source).equals(fs.readFileSync(deploy))) add('source-deploy-parity', name + ' differs between source and deploy');
}

const status = findings.length ? 'review-required' : 'pass';
const generatedAt = new Date().toISOString();
const standard = { label: 'AlloFlow Early Childhood 5025 source, semantic-link, option-feedback, and learning-library QA v2', limitation: 'Not ETS or standards-organization approval; independent early-childhood, disciplinary, cultural, accessibility, and psychometric validation remain pending.' };
const report = { schemaVersion: 1, generatedAt, packId: pack.id, standard, summary: { totalItems: 200, passedItems: 200 - new Set(findings.filter(finding => finding.id).map(finding => finding.id)).size, findings, status } };
const libraryReport = { schemaVersion: 1, generatedAt, libraryId: lib.libraryId, packId: pack.id, standard, summary: { ...lib.summary, findings, status } };
for (const output of [sourceDir, deployDir]) {
  fs.mkdirSync(output, { recursive: true });
  writeGeneratedFile(path.join(output, 'early_childhood_5025_native_qa.json'), JSON.stringify(report, null, 2) + '\n');
  writeGeneratedFile(path.join(output, 'early_childhood_5025_native_qa.md'), '# Early Childhood 5025 QA\n\n- Status: **' + status.toUpperCase() + '**\n- Items: ' + report.summary.passedItems + '/200\n- EPPP-guided semantic linkage and option-feedback gates: **' + (findings.length ? 'FAIL' : 'PASS') + '**\n\n> ' + standard.limitation + '\n');
  writeGeneratedFile(path.join(output, 'early_childhood_5025_learning_library_qa.json'), JSON.stringify(libraryReport, null, 2) + '\n');
  writeGeneratedFile(path.join(output, 'early_childhood_5025_learning_library_qa.md'), '# Early Childhood 5025 library QA\n\n- Status: **' + status.toUpperCase() + '**\n- Inventory: 12 chapters, 60 checks, 75 flashcards, 20 memory aids\n\n> ' + standard.limitation + '\n');
}
console.log('Early Childhood 5025 QA: ' + status + ' (' + findings.length + ' findings).');
if (findings.length) process.exitCode = 1;