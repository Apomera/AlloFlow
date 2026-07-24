#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const pack = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'esol_5362_pack.json'), 'utf8'));
const library = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'esol_5362_learning_library.json'), 'utf8'));
const expectedBank = { 'foundations-linguistics': 18, 'foundations-language-learning': 22, 'planning-implementing-instruction': 23, 'assessment-evaluation': 15, culture: 11, 'professionalism-advocacy': 11 };
const expectedSimulation = { 'foundations-linguistics': 22, 'foundations-language-learning': 26, 'planning-implementing-instruction': 28, 'assessment-evaluation': 18, culture: 13, 'professionalism-advocacy': 13 };
const allowedHosts = new Set(['praxis.ets.org', 'tesol.org', 'www.tesol.org', 'wida.wisc.edu', 'ncela.ed.gov', 'ed.gov', 'www.ed.gov']);
const findings = [];
const add = (check, message, id = '') => findings.push({ check, id, message });
const validUrls = (urls) => Array.isArray(urls) && urls.length >= 2 && urls.every((url) => { try { return allowedHosts.has(new URL(url).hostname); } catch (_) { return false; } });

if (pack.id !== 'praxis-esol-5362' || pack.items?.length !== 200 || pack.batchSize !== 100) add('identity', 'Pack identity or 200-item inventory is invalid.');
if (pack.simulationItemCount !== 120 || pack.simulationTimeMinutes !== 120 || pack.officialSelectedResponseCount !== 120 || pack.officialTotalTimeMinutes !== 120) add('blueprint', 'Official and simulation question/time metadata must be 120/120.');
if (!/may include audio(?: questions)? and select-more-than-one/i.test(pack.simulationNote || '') || !/does not reproduce ETS recordings/i.test(pack.simulationNote || '')) add('format-boundary', 'Audio and multiple-selection boundaries are incomplete.');
if (!/not official forms, scaled scores, pass predictions, licenses, language-proficiency determinations/i.test(pack.disclaimer || '')) add('decision-boundary', 'Score, credential, and learner-decision boundaries are incomplete.');
if (new Set(pack.items.map((item) => item.id)).size !== 200 || new Set(pack.items.map((item) => item.prompt.toLowerCase().replace(/\s+/g, ' ').trim())).size !== 200) add('originality', 'Identifiers or prompts are duplicated.');

for (let index = 0; index < 2; index += 1) {
  const bank = pack.items.slice(index * 100, index * 100 + 100);
  for (const [domain, expected] of Object.entries(expectedBank)) if (bank.filter((item) => item.domainId === domain).length !== expected) add('bank-blueprint', 'Bank ' + (index + 1) + ' has an invalid ' + domain + ' count.');
  for (let answer = 0; answer < 4; answer += 1) if (bank.filter((item) => item.answerIndex === answer).length !== 25) add('answer-balance', 'Bank ' + (index + 1) + ' answer position ' + answer + ' is not 25.');
}
for (const [domain, expected] of Object.entries(expectedSimulation)) if (pack.items.slice(0, 120).filter((item) => item.domainId === domain).length !== expected) add('simulation-blueprint', 'Simulation has an invalid ' + domain + ' count.');

for (const item of pack.items || []) {
  if (item.type !== 'single-choice' || !Array.isArray(item.choices) || item.choices.length !== 4 || new Set(item.choices).size !== 4 || !Number.isInteger(item.answerIndex) || item.answerIndex < 0 || item.answerIndex > 3) add('item-structure', 'Choice structure is invalid.', item.id);
  if (String(item.prompt || '').length < 45 || String(item.rationale || '').length < 120 || !Array.isArray(item.choiceRationales) || item.choiceRationales.length !== 4 || item.choiceRationales.some((entry) => String(entry).length < 100)) add('feedback', 'Prompt or feedback is not substantive.', item.id);
  if (!validUrls(item.references) || item.reviewStatus !== 'source-reviewed' || item.qaStatus !== 'qa-passed' || item.qaReviewedAt !== '2026-07-14') add('review', 'Sources or review metadata are invalid.', item.id);
  if (!Array.isArray(item.skillIds) || item.skillIds.length !== 1 || !Array.isArray(item.chapterIds) || item.chapterIds.length !== 1) add('linkage', 'Exactly one skill and chapter are required.', item.id);
}

const allText = JSON.stringify(pack).toLowerCase();
for (const [check, pattern, message] of [
  ['language-access', /qualified (?:interpreter|language access|accessible interpretation)|qualified language access/, 'Qualified language access safeguard is absent.'],
  ['difference-disability', /language difference|confus(?:e|ing) language difference with disability|not.*diagnos/, 'Language-difference/disability safeguard is absent.'],
  ['evaluation-access', /evaluation.*(?:not|never).*delay|do not delay.*evaluation/, 'Evaluation must not be delayed for language development.'],
  ['privacy', /privacy|confidential/, 'Privacy safeguard is absent.'],
  ['meaningful-access', /meaningful access|meaningful participation/, 'Meaningful-access safeguard is absent.'],
  ['opt-out', /opt(?:ing)? out|declin(?:e|ing).*service/, 'Opt-out access safeguard is absent.'],
]) if (!pattern.test(allText)) add(check, message);

if (library.packId !== pack.id || library.skills?.length !== 12 || library.chapters?.length !== 12 || library.constructedResponseWorkshops?.length !== 8) add('learning-linkage', 'Learning library is missing or incomplete.');
const skillById = new Map(library.skills.map((entry) => [entry.id, entry]));
const chapterById = new Map(library.chapters.map((entry) => [entry.id, entry]));
for (const item of pack.items) { const skill = skillById.get(item.skillIds[0]); const chapter = chapterById.get(item.chapterIds[0]); if (!skill || !chapter || skill.chapterId !== chapter.id || skill.domainId !== item.domainId || chapter.skillId !== skill.id) add('learning-linkage', 'Item linkage is incompatible.', item.id); }

const status = findings.length ? 'review-required' : 'pass';
const generatedAt = new Date().toISOString();
const report = { schemaVersion: 1, generatedAt, packId: pack.id, standard: { label: 'AlloFlow independent Praxis ESOL 5362 source, structure, feedback, originality, safety, and linkage QA v1', meaning: 'A pass confirms the specified inventory, blueprint allocations, feedback, authoritative-source allowlist, safeguards, and native learning links.', limitation: 'This is not ETS, TESOL, WIDA, NCELA, or U.S. Department of Education approval; independent ESOL educator, multilingual-family, accessibility, linguistic, civil-rights, and psychometric validation remain pending.' }, summary: { totalItems: pack.items.length, passedItems: pack.items.length - new Set(findings.filter((entry) => entry.id).map((entry) => entry.id)).size, diagnosticBanks: 2, bankSize: 100, simulationItems: 120, findings, status } };
const markdown = `# Praxis ESOL (5362) native QA\n\nGenerated: ${generatedAt}\n\n- Status: **${status.toUpperCase()}**\n- Items: ${report.summary.passedItems}/${report.summary.totalItems} passed item-level checks\n- Diagnostic banks: 2 × 100\n- Simulation: 120 questions / 120 minutes\n\n> ${report.standard.limitation}\n`;
for (const outputRoot of [path.join(root, 'test_prep'), path.join(root, 'desktop/web-app', 'public', 'test_prep')]) { fs.mkdirSync(outputRoot, { recursive: true }); fs.writeFileSync(path.join(outputRoot, 'esol_5362_native_qa.json'), JSON.stringify(report, null, 2) + '\n'); fs.writeFileSync(path.join(outputRoot, 'esol_5362_native_qa.md'), markdown); }
console.log('Praxis ESOL 5362 pack QA: ' + status + ' (' + report.summary.passedItems + '/200 items passed; ' + findings.length + ' findings).');
if (status !== 'pass') { for (const finding of findings.slice(0, 40)) console.error('- [' + finding.check + '] ' + (finding.id ? finding.id + ': ' : '') + finding.message); process.exitCode = 1; }
