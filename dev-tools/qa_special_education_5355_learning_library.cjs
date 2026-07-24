#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const library = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'special_education_5355_learning_library.json'), 'utf8'));
const allowedHosts = new Set(['praxis.ets.org', 'sites.ed.gov', 'ies.ed.gov', 'www.ed.gov']);
const domainIds = new Set(['development-differences', 'planning-instruction-environment', 'assessment', 'professional-practice-collaboration']);
const findings = [];
const add = (message) => findings.push(message);
const validReferences = (references) => Array.isArray(references) && references.length > 0 && references.every((reference) => {
  try { const url = new URL(reference); return url.protocol === 'https:' && allowedHosts.has(url.hostname.toLowerCase()); } catch (_) { return false; }
});

if (library.schemaVersion !== 1 || library.libraryId !== 'praxis-special-education-5355-learning-library' || library.packId !== 'praxis-special-education-5355') add('Invalid library identity or schema.');
if (!library.summary || library.summary.chapters !== 12 || library.summary.sections !== 48 || library.summary.knowledgeChecks !== 60 || library.summary.flashcards !== 75 || library.summary.memoryAids !== 20) add('Release counts must be 12 chapters, 48 sections, 60 checks, 75 flashcards, and 20 memory aids.');
if (!Array.isArray(library.skills) || library.skills.length !== 12 || new Set(library.skills.map((skill) => skill.id)).size !== 12) add('Skill catalog must contain 12 unique skills.');
if (!library.simulation || library.simulation.questionCount !== 120 || library.simulation.timeMinutes !== 120) add('Timed simulation declaration must be 120 questions and 120 minutes.');
if (!/not legal advice/i.test(library.legalCaution || '')) add('Federal, state, and local legal caution is missing.');

const chapterIds = new Set();
const checkIds = new Set();
for (const chapter of library.chapters || []) {
  if (chapterIds.has(chapter.id)) add('Duplicate chapter ID: ' + chapter.id);
  chapterIds.add(chapter.id);
  if (!domainIds.has(chapter.domainId)) add('Invalid chapter domain: ' + chapter.id);
  if (!chapter.title || !chapter.summary || !Array.isArray(chapter.objectives) || chapter.objectives.length < 3) add('Incomplete chapter overview: ' + chapter.id);
  if (chapter.reviewStatus !== 'source-reviewed-editorial-pass' || !/independent educator validation remains pending/i.test(chapter.reviewNote || '') || !validReferences(chapter.references)) add('Invalid chapter review metadata: ' + chapter.id);
  if (!Array.isArray(chapter.sections) || chapter.sections.length !== 4 || chapter.sectionCount !== 4) add('Chapter must contain four sections: ' + chapter.id);
  for (const section of chapter.sections || []) {
    if (!section.heading || String(section.content || '').length < 300 || !Array.isArray(section.keyTerms) || section.keyTerms.length < 3 || section.reviewStatus !== 'source-reviewed-editorial-pass' || !validReferences(section.references)) add('Incomplete or unsourced section: ' + section.id);
  }
  if (!Array.isArray(chapter.knowledgeChecks) || chapter.knowledgeChecks.length !== 5 || chapter.knowledgeCheckCount !== 5) add('Chapter must contain five checks: ' + chapter.id);
  for (const check of chapter.knowledgeChecks || []) {
    if (checkIds.has(check.id)) add('Duplicate check ID: ' + check.id);
    checkIds.add(check.id);
    if (!check.prompt || !Array.isArray(check.choices) || check.choices.length !== 4 || new Set(check.choices).size !== 4 || !Number.isInteger(check.answerIndex) || check.answerIndex < 0 || check.answerIndex > 3 || String(check.rationale || '').length < 80) add('Invalid knowledge check: ' + check.id);
    if (!validReferences(check.references)) add('Invalid check references: ' + check.id);
  }
}

const skillById = new Map((library.skills || []).map((skill) => [skill.id, skill]));
for (const chapter of library.chapters || []) {
  const skill = skillById.get(chapter.skillId);
  if (!skill || skill.chapterId !== chapter.id || skill.domainId !== chapter.domainId) add('Chapter-skill linkage is invalid: ' + chapter.id);
}

const flashcardIds = new Set();
for (const card of library.flashcards || []) {
  if (flashcardIds.has(card.id)) add('Duplicate flashcard ID: ' + card.id);
  flashcardIds.add(card.id);
  if (!card.front || String(card.back || '').length < 30 || !chapterIds.has(card.chapterId) || !skillById.has(card.skillId) || card.reviewStatus !== 'source-reviewed-editorial-pass' || !validReferences(card.references)) add('Invalid flashcard: ' + card.id);
}

const memoryIds = new Set();
for (const aid of library.memoryAids || []) {
  if (memoryIds.has(aid.id)) add('Duplicate memory-aid ID: ' + aid.id);
  memoryIds.add(aid.id);
  if (!aid.title || String(aid.content || '').length < 80 || !Array.isArray(aid.tags) || aid.tags.length < 2 || aid.reviewStatus !== 'source-reviewed-editorial-pass' || !validReferences(aid.references)) add('Invalid memory aid: ' + aid.id);
}

const status = findings.length ? 'review-required' : 'pass';
const generatedAt = new Date().toISOString();
const report = {
  schemaVersion: 1,
  generatedAt,
  libraryId: library.libraryId,
  standard: {
    label: library.reviewStandard,
    meaning: 'A pass confirms release counts, stable identifiers, authoritative-source allowlisting, substantive native lessons, one-best-answer knowledge checks, complete card and aid metadata, and item-compatible skills.',
    limitation: 'This is not ETS approval, independent educator validation, psychometric validation, legal advice, or a substitute for current federal, state, and local requirements.',
  },
  summary: { ...library.summary, findings, status },
  chapters: library.chapters.map((chapter) => ({ id: chapter.id, title: chapter.title, domainId: chapter.domainId, skillId: chapter.skillId, sections: chapter.sectionCount, knowledgeChecks: chapter.knowledgeCheckCount, references: chapter.referenceCount, status: chapter.reviewStatus })),
};
const markdown = `# Praxis Special Education: Foundational Knowledge (5355) learning library QA report\n\nGenerated: ${generatedAt}\n\n## Result\n\n- Status: **${status.toUpperCase()}**\n- Chapters: ${library.summary.chapters}\n- Sections: ${library.summary.sections}\n- Knowledge checks: ${library.summary.knowledgeChecks}\n- Flashcards: ${library.summary.flashcards}\n- Memory aids: ${library.summary.memoryAids}\n\n> ${report.standard.limitation}\n\n## Chapter matrix\n\n| Chapter | Domain | Sections | Checks | Sources |\n| --- | --- | ---: | ---: | ---: |\n${report.chapters.map((chapter) => `| ${chapter.title} | ${chapter.domainId} | ${chapter.sections} | ${chapter.knowledgeChecks} | ${chapter.references} |`).join('\n')}\n`;

for (const outputRoot of [path.join(root, 'test_prep'), path.join(root, 'desktop/web-app', 'public', 'test_prep')]) {
  fs.mkdirSync(outputRoot, { recursive: true });
  fs.writeFileSync(path.join(outputRoot, 'special_education_5355_learning_library_qa.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(outputRoot, 'special_education_5355_learning_library_qa.md'), markdown, 'utf8');
}

console.log('Praxis Special Education 5355 learning-library QA: ' + status + ' (' + findings.length + ' finding' + (findings.length === 1 ? '' : 's') + ').');
if (findings.length) {
  findings.slice(0, 50).forEach((finding) => console.error('- ' + finding));
  process.exit(1);
}
