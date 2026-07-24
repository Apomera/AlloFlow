#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const library = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'esol_5362_learning_library.json'), 'utf8'));
const pack = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'esol_5362_pack.json'), 'utf8'));
const allowedHosts = new Set(['praxis.ets.org', 'tesol.org', 'www.tesol.org', 'wida.wisc.edu', 'ncela.ed.gov', 'ed.gov', 'www.ed.gov']);
const findings = [];
const add = (check, message, id = '') => findings.push({ check, id, message });
const validUrls = (urls) => Array.isArray(urls) && urls.length >= 2 && urls.every((url) => { try { return allowedHosts.has(new URL(url).hostname); } catch (_) { return false; } });
if (library.libraryId !== 'praxis-esol-5362-learning-library' || library.packId !== pack.id) add('identity', 'Library identity or pack link is invalid.');
if (library.simulation?.questionCount !== 120 || library.simulation?.timeMinutes !== 120 || library.simulation?.officialTotalTimeMinutes !== 120 || !/official test may include audio/i.test(library.simulation?.note || '')) add('blueprint', 'Simulation or audio boundary is invalid.');
if (library.workshopLabel !== 'Audio and classroom-analysis workshops' || !/do not reproduce ETS recordings/i.test(library.workshopPracticeNote || '')) add('workshop-boundary', 'Workshop label or recording boundary is invalid.');
if (!Array.isArray(library.chapters) || library.chapters.length !== 12 || library.summary?.sections !== 48 || library.summary?.knowledgeChecks !== 60 || library.summary?.flashcards !== 75 || library.summary?.memoryAids !== 20 || library.summary?.constructedResponseWorkshops !== 8) add('inventory', 'Required 12/48/60/75/20/8 inventory is incomplete.');
if (library.skills?.length !== 12 || library.flashcards?.length !== 75 || library.memoryAids?.length !== 20 || library.constructedResponseWorkshops?.length !== 8) add('inventory', 'Skill, card, aid, or workshop arrays are incomplete.');
const skills = new Map((library.skills || []).map((entry) => [entry.id, entry]));
const chapters = new Map((library.chapters || []).map((entry) => [entry.id, entry]));
for (const chapter of library.chapters || []) {
  if (chapter.reviewStatus !== 'source-reviewed-editorial-pass' || !/validation remain pending/i.test(chapter.reviewNote || '') || !validUrls(chapter.references)) add('chapter-review', 'Review metadata or sources are invalid.', chapter.id);
  if (chapter.objectives?.length < 3 || chapter.sections?.length !== 4 || chapter.knowledgeChecks?.length !== 5) add('chapter-structure', 'Objectives, sections, or checks are incomplete.', chapter.id);
  for (const section of chapter.sections || []) if (String(section.content || '').length < 300 || section.keyTerms?.length < 3 || section.reviewStatus !== 'source-reviewed-editorial-pass') add('section-quality', 'Section is incomplete.', section.id);
  for (const check of chapter.knowledgeChecks || []) if (check.choices?.length !== 4 || !Number.isInteger(check.answerIndex) || String(check.rationale || '').length < 100 || !validUrls(check.references)) add('check-quality', 'Knowledge check is invalid.', check.id);
  const skill = skills.get(chapter.skillId); if (!skill || skill.chapterId !== chapter.id || skill.domainId !== chapter.domainId) add('skill-linkage', 'Skill link is invalid.', chapter.id);
}
for (const card of library.flashcards || []) { const chapter = chapters.get(card.chapterId); if (!chapter || card.skillId !== chapter.skillId || card.domainId !== chapter.domainId || String(card.front || '').length < 20 || String(card.back || '').length < 30 || card.reviewStatus !== 'source-reviewed-editorial-pass' || !validUrls(card.references)) add('flashcard-quality', 'Flashcard is invalid.', card.id); }
for (const aid of library.memoryAids || []) if (!aid.id || String(aid.title || '').length < 5 || String(aid.content || '').length < 45 || aid.tags?.length < 2 || !aid.domain || aid.reviewStatus !== 'source-reviewed-editorial-pass' || !validUrls(aid.references)) add('memory-aid-quality', 'Memory aid is incomplete.', aid.id);
for (const workshop of library.constructedResponseWorkshops || []) {
  if (!/^esol5362-workshop-\d{2}$/.test(workshop.id || '') || String(workshop.title || '').length < 15 || String(workshop.prompt || '').length < 100 || String(workshop.stimulus || '').length < 300) add('workshop-structure', 'Workshop identity or content is incomplete.', workshop.id);
  if (workshop.taskParts?.length !== 3 || workshop.planningFrame?.length !== 4 || workshop.successCriteria?.length !== 4 || workshop.commonPitfalls?.length !== 4 || workshop.sampleOutline?.length !== 3) add('workshop-feedback', 'Workshop planning or feedback is incomplete.', workshop.id);
  if (workshop.reviewStatus !== 'source-reviewed-editorial-pass' || !/not an official ETS recording, prompt, item, interface, score/i.test(workshop.reviewNote || '') || !validUrls(workshop.references)) add('workshop-review', 'Workshop sources or boundaries are invalid.', workshop.id);
}
const types = library.constructedResponseWorkshops.reduce((counts, entry) => { counts[entry.taskType] = (counts[entry.taskType] || 0) + 1; return counts; }, {});
if (Object.keys(types).length !== 8 || Object.values(types).some((count) => count !== 1)) add('workshop-balance', 'Eight distinct applied workshop types are required.');
const status = findings.length ? 'review-required' : 'pass';
const generatedAt = new Date().toISOString();
const report = { schemaVersion: 1, generatedAt, libraryId: library.libraryId, packId: library.packId, standard: { label: 'AlloFlow Praxis ESOL 5362 learning-library QA v1', meaning: 'A pass confirms complete learning and applied-workshop inventories, substantive lessons and checks, authoritative references, stable links, and explicit format and decision boundaries.', limitation: 'This is not ETS, TESOL, WIDA, NCELA, or U.S. Department of Education approval, official audio delivery or scoring, a scaled score, pass prediction, licensure decision, language-proficiency decision, disability decision, or independent subject-matter, family, accessibility, linguistic, civil-rights, or psychometric validation.' }, summary: { ...library.summary, findings, status } };
const markdown = `# Praxis ESOL (5362) learning-library QA\n\nGenerated: ${generatedAt}\n\n- Status: **${status.toUpperCase()}**\n- Chapters / sections / checks: ${library.summary.chapters} / ${library.summary.sections} / ${library.summary.knowledgeChecks}\n- Flashcards / memory aids / applied workshops: ${library.summary.flashcards} / ${library.summary.memoryAids} / ${library.summary.constructedResponseWorkshops}\n\n> ${report.standard.limitation}\n`;
for (const outputRoot of [path.join(root, 'test_prep'), path.join(root, 'desktop/web-app', 'public', 'test_prep')]) { fs.mkdirSync(outputRoot, { recursive: true }); fs.writeFileSync(path.join(outputRoot, 'esol_5362_learning_library_qa.json'), JSON.stringify(report, null, 2) + '\n'); fs.writeFileSync(path.join(outputRoot, 'esol_5362_learning_library_qa.md'), markdown); }
console.log('Praxis ESOL 5362 learning-library QA: ' + status + ' (' + findings.length + ' findings).');
if (status !== 'pass') { for (const finding of findings.slice(0, 40)) console.error('- [' + finding.check + '] ' + (finding.id ? finding.id + ': ' : '') + finding.message); process.exitCode = 1; }
