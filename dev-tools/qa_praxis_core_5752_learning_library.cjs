#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const library = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'praxis_core_5752_learning_library.json'), 'utf8'));
const pack = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'praxis_core_5752_pack.json'), 'utf8'));
const allowedHosts = new Set(['praxis.ets.org', 'thecorestandards.org', 'www.thecorestandards.org']);
const findings = [];
const add = (check, message, id = '') => findings.push({ check, id, message });

if (library.libraryId !== 'praxis-core-5752-learning-library' || library.packId !== pack.id) add('identity', 'Library identity or pack link is invalid.');
if (library.simulation?.questionCount !== 152 || library.simulation?.timeMinutes !== 215 || library.simulation?.officialTotalTimeMinutes !== 275 || library.simulation?.officialEssayCount !== 2) add('blueprint', 'Simulation metadata must distinguish selected-response timing from the complete combined timed sections and two essays.');
if (!/not an official score, scaled score, essay score, pass prediction, admission decision, licensure decision, disability or accommodation decision/i.test(library.legalCaution || '')) add('boundary', 'The score, credential, and accommodation boundary is incomplete.');
if (!Array.isArray(library.chapters) || library.chapters.length !== 12 || library.summary?.sections !== 48 || library.summary?.knowledgeChecks !== 60 || library.summary?.flashcards !== 75 || library.summary?.memoryAids !== 20 || library.summary?.constructedResponseWorkshops !== 8) add('inventory', 'Required counts are 12 chapters, 48 sections, 60 checks, 75 flashcards, 20 memory aids, and 8 essay workshops.');
if (!Array.isArray(library.skills) || library.skills.length !== 12 || !Array.isArray(library.flashcards) || library.flashcards.length !== 75 || !Array.isArray(library.memoryAids) || library.memoryAids.length !== 20 || !Array.isArray(library.constructedResponseWorkshops) || library.constructedResponseWorkshops.length !== 8) add('inventory', 'Skills, cards, aids, or workshops are incomplete.');

const validUrls = (urls) => Array.isArray(urls) && urls.length >= 2 && urls.every((url) => { try { return allowedHosts.has(new URL(url).hostname); } catch (_) { return false; } });
const skillById = new Map((library.skills || []).map((skill) => [skill.id, skill]));
const chapterById = new Map((library.chapters || []).map((chapter) => [chapter.id, chapter]));
for (const chapter of library.chapters || []) {
  if (!chapter.id || !chapter.skillId || chapter.reviewStatus !== 'source-reviewed-editorial-pass' || !/validation remain pending/i.test(chapter.reviewNote || '')) add('chapter-review', 'Chapter review metadata is incomplete.', chapter.id);
  if (!Array.isArray(chapter.objectives) || chapter.objectives.length < 3 || !Array.isArray(chapter.sections) || chapter.sections.length !== 4 || !Array.isArray(chapter.knowledgeChecks) || chapter.knowledgeChecks.length !== 5) add('chapter-structure', 'Chapter objectives, sections, or checks are incomplete.', chapter.id);
  if (!validUrls(chapter.references)) add('source', 'Chapter references are invalid.', chapter.id);
  for (const section of chapter.sections || []) if (String(section.content || '').length < 300 || !Array.isArray(section.keyTerms) || section.keyTerms.length < 3 || section.reviewStatus !== 'source-reviewed-editorial-pass') add('section-quality', 'Section content, terms, or review status is incomplete.', section.id);
  for (const check of chapter.knowledgeChecks || []) if (!Array.isArray(check.choices) || check.choices.length !== 4 || !Number.isInteger(check.answerIndex) || check.answerIndex < 0 || check.answerIndex > 3 || String(check.rationale || '').length < 100 || !validUrls(check.references)) add('check-quality', 'Knowledge check is invalid.', check.id);
  const skill = skillById.get(chapter.skillId);
  if (!skill || skill.chapterId !== chapter.id || skill.domainId !== chapter.domainId) add('skill-linkage', 'Chapter and skill linkage is inconsistent.', chapter.id);
}
for (const card of library.flashcards || []) {
  const chapter = chapterById.get(card.chapterId);
  if (!chapter || card.skillId !== chapter.skillId || card.domainId !== chapter.domainId || String(card.front || '').length < 20 || String(card.back || '').length < 30 || card.reviewStatus !== 'source-reviewed-editorial-pass' || !validUrls(card.references)) add('flashcard-quality', 'Flashcard content, linkage, references, or review status is invalid.', card.id);
}
for (const aid of library.memoryAids || []) if (!aid.id || String(aid.title || '').length < 5 || String(aid.content || '').length < 45 || !Array.isArray(aid.tags) || aid.tags.length < 2 || !aid.domain || aid.reviewStatus !== 'source-reviewed-editorial-pass' || !validUrls(aid.references)) add('memory-aid-quality', 'Memory aid is incomplete.', aid.id);
for (const workshop of library.constructedResponseWorkshops || []) {
  if (!/^core5752-cr-\d{2}$/.test(workshop.id || '') || String(workshop.title || '').length < 15 || !['Argumentative Essay', 'Informative/Explanatory Source-Based Essay'].includes(workshop.taskType) || String(workshop.prompt || '').length < 100 || String(workshop.stimulus || '').length < 300) add('workshop-structure', 'Workshop identity, type, prompt, or stimulus is incomplete.', workshop.id);
  if (!Array.isArray(workshop.taskParts) || workshop.taskParts.length !== 3 || !Array.isArray(workshop.planningFrame) || workshop.planningFrame.length !== 4 || workshop.planningFrame.some((entry) => !entry.label || String(entry.guidance || '').length < 25)) add('workshop-planning', 'Workshop task parts or planning frame are incomplete.', workshop.id);
  if (!Array.isArray(workshop.successCriteria) || workshop.successCriteria.length !== 4 || !Array.isArray(workshop.commonPitfalls) || workshop.commonPitfalls.length !== 4 || !Array.isArray(workshop.sampleOutline) || workshop.sampleOutline.length !== 3) add('workshop-feedback', 'Workshop self-check criteria, pitfalls, or outline are incomplete.', workshop.id);
  if (workshop.reviewStatus !== 'source-reviewed-editorial-pass' || !/not an official ETS prompt, scoring guide, essay score, scaled score, pass prediction/i.test(workshop.reviewNote || '') || !validUrls(workshop.references)) add('workshop-review', 'Workshop source or review boundary is invalid.', workshop.id);
}

const taskTypes = (library.constructedResponseWorkshops || []).reduce((counts, workshop) => { counts[workshop.taskType] = (counts[workshop.taskType] || 0) + 1; return counts; }, {});
if (taskTypes['Argumentative Essay'] !== 4 || taskTypes['Informative/Explanatory Source-Based Essay'] !== 4) add('workshop-balance', 'The library must include four argumentative and four source-based workshops.');
const equationCheck = (library.chapters || []).flatMap((chapter) => chapter.knowledgeChecks || []).find((check) => check.id === 'core5752-ch-11-check-01');
if (!equationCheck || !/3x = 18/i.test(equationCheck.rationale || '') || /5x = 30/i.test(equationCheck.rationale || '')) add('check-accuracy', 'The 3x + 7 = 25 knowledge check must explain only its own equation.', 'core5752-ch-11-check-01');
const packSkillIds = new Set(pack.items.flatMap((item) => item.skillIds || []));
const packChapterIds = new Set(pack.items.flatMap((item) => item.chapterIds || []));
if (packSkillIds.size !== 12 || packChapterIds.size !== 12 || [...packSkillIds].some((id) => !skillById.has(id)) || [...packChapterIds].some((id) => !chapterById.has(id))) add('pack-linkage', 'Pack does not link across all 12 skills and chapters.');

const status = findings.length ? 'review-required' : 'pass';
const generatedAt = new Date().toISOString();
const report = {
  schemaVersion: 1, generatedAt, libraryId: library.libraryId, packId: library.packId,
  standard: {
    label: 'AlloFlow Praxis Core 5752 learning-library QA v1',
    meaning: 'A pass confirms complete chapter and essay-workshop inventories, substantive lessons and checks, authoritative references, stable linkage, review metadata, and explicit score, admission, licensure, and accommodation boundaries.',
    limitation: 'This is not ETS approval, independent literacy, writing, mathematics, accessibility, or psychometric validation, official essay scoring, a scaled score, pass prediction, admission or licensure decision, or accommodation decision.',
  },
  summary: { ...library.summary, findings, status },
};
const markdown = `# Praxis Core Combined (5752) learning-library QA\n\nGenerated: ${generatedAt}\n\n- Status: **${status.toUpperCase()}**\n- Chapters: ${library.summary.chapters}\n- Sections: ${library.summary.sections}\n- Knowledge checks: ${library.summary.knowledgeChecks}\n- Flashcards: ${library.summary.flashcards}\n- Memory aids: ${library.summary.memoryAids}\n- Essay workshops: ${library.summary.constructedResponseWorkshops}\n\n> ${report.standard.limitation}\n`;
for (const outputRoot of [path.join(root, 'test_prep'), path.join(root, 'desktop/web-app', 'public', 'test_prep')]) {
  fs.mkdirSync(outputRoot, { recursive: true });
  fs.writeFileSync(path.join(outputRoot, 'praxis_core_5752_learning_library_qa.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(outputRoot, 'praxis_core_5752_learning_library_qa.md'), markdown, 'utf8');
}
console.log('Praxis Core 5752 learning-library QA: ' + status + ' (' + findings.length + ' findings).');
if (status !== 'pass') {
  for (const finding of findings.slice(0, 40)) console.error('- [' + finding.check + '] ' + (finding.id ? finding.id + ': ' : '') + finding.message);
  process.exitCode = 1;
}
