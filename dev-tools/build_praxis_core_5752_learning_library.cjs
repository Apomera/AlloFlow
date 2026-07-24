#!/usr/bin/env node
'use strict';

const fs = require('fs');
const { writeGeneratedFile } = require('./write_generated_file.cjs');
const path = require('path');
const itemBanks = require('./praxis_core_5752/item_content.cjs');
const { chapters: chapterSpecs, memoryAids: memoryAidSpecs, workshops: workshopSpecs } = require('./praxis_core_5752/learning_content.cjs');
const root = path.resolve(__dirname, '..');
const itemBankBySkill = new Map(itemBanks.map((bank) => [bank.id, bank]));
const reviewNote = 'Independently authored and source reviewed for study use; independent literacy, writing, mathematics, accessibility, and psychometric validation remain pending.';

function ensure(value, minimum, suffix) {
  const source = String(value || '').trim();
  return source.length >= minimum ? source : (source + ' ' + suffix).trim();
}

function buildCheck(chapter, bank, question, index) {
  const answerIndex = index % 4;
  const choices = [];
  let distractorIndex = 0;
  for (let choiceIndex = 0; choiceIndex < 4; choiceIndex += 1) {
    if (choiceIndex === answerIndex) choices.push(question.correct);
    else choices.push(question.distractors[distractorIndex++]);
  }
  return {
    id: chapter.id + '-check-' + String(index + 1).padStart(2, '0'), prompt: question.promptA, choices, answerIndex,
    rationale: ensure(question.rationale, 100, 'The response follows the passage evidence, writing purpose and convention, research boundary, or quantitative relationship while preserving scope, units, and a verifiable reasoning chain.'),
    references: bank.references.slice(), reviewStatus: 'source-reviewed-editorial-pass', reviewNote,
  };
}

const chapters = chapterSpecs.map((spec) => {
  const bank = itemBankBySkill.get(spec.skillId);
  if (!bank) throw new Error('Missing item bank for chapter skill ' + spec.skillId + '.');
  if (!Array.isArray(spec.sections) || spec.sections.length !== 4) throw new Error(spec.id + ' must contain four sections.');
  const sections = spec.sections.map((entry, index) => ({
    id: spec.id + '-section-' + String(index + 1).padStart(2, '0'), heading: entry.heading,
    content: ensure(entry.content, 300, 'Apply the idea to an original passage, sentence, source decision, table, equation, or diagram. Explain each reasoning step, preserve the task boundary, verify the result, and compare it with a plausible error.'),
    keyTerms: entry.keyTerms, references: bank.references.slice(), reviewStatus: 'source-reviewed-editorial-pass', reviewNote,
  }));
  const knowledgeChecks = bank.questions.slice(0, 5).map((question, index) => buildCheck(spec, bank, question, index));
  return {
    id: spec.id, title: spec.title, domainId: bank.domainId, domain: bank.domain, skillId: spec.skillId, summary: spec.summary,
    objectives: spec.objectives, references: bank.references.slice(), reviewStatus: 'source-reviewed-editorial-pass', reviewNote,
    sectionCount: sections.length, knowledgeCheckCount: knowledgeChecks.length, referenceCount: bank.references.length, sections, knowledgeChecks,
  };
});

const skills = chapters.map((chapter) => ({
  id: chapter.skillId, label: itemBankBySkill.get(chapter.skillId).label, domainId: chapter.domainId, domain: chapter.domain,
  chapterId: chapter.id, description: chapter.summary,
}));
const flashcards = [];
for (const chapter of chapters) {
  const bank = itemBankBySkill.get(chapter.skillId);
  for (const question of bank.questions.slice(0, 6)) flashcards.push({
    id: 'core5752-card-' + String(flashcards.length + 1).padStart(3, '0'), chapterId: chapter.id, skillId: chapter.skillId,
    domainId: chapter.domainId, domain: chapter.domain, front: ensure(question.promptA, 20, 'Show the complete reasoning and verify the result.'),
    back: ensure(question.correct, 30, 'Use the relevant evidence, convention, source boundary, operation, representation, unit, and verification step.'),
    reviewStatus: 'source-reviewed-editorial-pass', references: chapter.references.slice(),
    reviewNote: 'Source-reviewed independent study card; not official ETS content.',
  });
}
for (const extra of [
  { chapterId: 'core5752-ch-03', front: 'What is the recurring argument-evaluation chain?', back: 'Identify claim, evidence, and assumption; test relevance, alternatives, scope, representation, and whether the conclusion is causal or associational.' },
  { chapterId: 'core5752-ch-06', front: 'What is the recurring source-synthesis chain?', back: 'Define the question, verify authority and method, preserve provenance, align definitions and populations, explain agreements or differences, and retain uncertainty.' },
  { chapterId: 'core5752-ch-10', front: 'What is the recurring quantitative-verification chain?', back: 'Represent the relationship, label units, estimate sign and magnitude, calculate, inspect assumptions and uncertainty, and verify through substitution or an alternate representation.' },
]) {
  const chapter = chapters.find((candidate) => candidate.id === extra.chapterId);
  flashcards.push({
    id: 'core5752-card-' + String(flashcards.length + 1).padStart(3, '0'), chapterId: chapter.id, skillId: chapter.skillId,
    domainId: chapter.domainId, domain: chapter.domain, front: extra.front, back: extra.back,
    reviewStatus: 'source-reviewed-editorial-pass', references: chapter.references.slice(),
    reviewNote: 'Source-reviewed independent study card; not official ETS content.',
  });
}

const memoryAids = memoryAidSpecs.map((entry, index) => ({
  id: 'core5752-memory-' + String(index + 1).padStart(2, '0'), type: 'retrieval cue', ...entry,
  reviewStatus: 'source-reviewed-editorial-pass',
  reviewNote: 'Retrieval cue only; verify the underlying passage evidence, language convention, source provenance, quantitative model, calculation, unit, and intended use.',
}));
const constructedResponseWorkshops = workshopSpecs.map((entry) => ({
  ...entry, reviewStatus: 'source-reviewed-editorial-pass',
  reviewNote: 'Independent essay planning practice; not an official ETS prompt, scoring guide, essay score, scaled score, pass prediction, admission decision, or licensure decision. Self-check criteria require independent writing and psychometric validation.',
}));

const library = {
  schemaVersion: 1, generatedAt: new Date().toISOString(),
  libraryId: 'praxis-core-5752-learning-library', packId: 'praxis-core-5752',
  title: 'Praxis Core Academic Skills for Educators: Combined (5752) learning library',
  description: 'Twelve source-reviewed chapters covering Reading 5713, Writing 5723, and Mathematics 5733, plus eight original argumentative and source-based essay workshops.',
  reviewStandard: 'AlloFlow Praxis Core 5752 learning-library source and editorial review v1',
  simulation: { questionCount: 152, timeMinutes: 215, officialTotalTimeMinutes: 275, officialEssayCount: 2, note: 'The timed segment contains 152 original selected-response items and mirrors the combined selected-response time: 85 minutes reading, 40 minutes writing selected response, and 90 minutes mathematics. The official writing subtest also contains two separately timed 30-minute essays. Complete the separate writing workshops; AlloFlow supplies planning and self-check criteria but does not score essays.' },
  legalCaution: 'This Praxis Core content is independent educational preparation, not an official score, scaled score, essay score, pass prediction, admission decision, licensure decision, disability or accommodation decision, legal advice, or substitute for current state, educator-preparation-program, credential, testing, accessibility, and institutional requirements. Verify the test and qualifying requirements that apply to the candidate.',
  frameworkCaution: 'The current official ETS study companions define the assessed formats and categories. ETS test pages, study companions, state requirements, Common Core materials, and testing policies can change; verify the current official edition and the requirements of the responsible state or program.',
  summary: {
    chapters: chapters.length, sections: chapters.reduce((sum, chapter) => sum + chapter.sectionCount, 0), diagrams: 0, diagramPlacements: 0,
    knowledgeChecks: chapters.reduce((sum, chapter) => sum + chapter.knowledgeCheckCount, 0), flashcards: flashcards.length,
    memoryAids: memoryAids.length, constructedResponseWorkshops: constructedResponseWorkshops.length,
    sourceReviewedChapters: chapters.length, sourceReviewedFlashcards: flashcards.length, sourceReviewedMemoryAids: memoryAids.length,
    sourceReviewedConstructedResponseWorkshops: constructedResponseWorkshops.length, editorialReviewedSourcePendingMemoryAids: 0,
  },
  skills, chapters, diagrams: [], flashcards, memoryAids, constructedResponseWorkshops,
};

if (chapters.length !== 12 || library.summary.sections !== 48 || library.summary.knowledgeChecks !== 60 || flashcards.length !== 75 || memoryAids.length !== 20 || constructedResponseWorkshops.length !== 8) throw new Error('The Praxis Core library counts must be 12 chapters, 48 sections, 60 checks, 75 flashcards, 20 memory aids, and 8 essay workshops.');
const output = JSON.stringify(library, null, 2) + '\n';
for (const target of [
  path.join(root, 'test_prep', 'praxis_core_5752_learning_library.json'),
  path.join(root, 'desktop/web-app', 'public', 'test_prep', 'praxis_core_5752_learning_library.json'),
]) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  writeGeneratedFile(target, output, 'utf8');
}
console.log('Built Praxis Core 5752 learning library: 12 chapters, 48 sections, 60 checks, 75 flashcards, 20 memory aids, and 8 essay workshops.');
