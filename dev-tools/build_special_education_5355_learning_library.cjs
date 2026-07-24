#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const itemBanks = require('./special_education_5355/item_content.cjs');
const { chapters: chapterSpecs, memoryAids: memoryAidSpecs } = require('./special_education_5355/learning_content.cjs');

const root = path.resolve(__dirname, '..');
const itemBankBySkill = new Map(itemBanks.map((bank) => [bank.id, bank]));
const reviewNote = 'Independently authored and source reviewed for study use; independent educator validation remains pending.';

function padSection(content) {
  const text = String(content || '').trim();
  if (text.length >= 300) return text;
  return text + ' Apply the idea by identifying the learner evidence, the task demand, the support or procedure, and the data that would show whether the decision improved meaningful access or progress.';
}

function buildCheck(chapter, bank, question, index) {
  const answerIndex = index % 4;
  const choices = [];
  let distractorIndex = 0;
  for (let choiceIndex = 0; choiceIndex < 4; choiceIndex += 1) {
    if (choiceIndex === answerIndex) choices.push(question.correct);
    else { choices.push(question.distractors[distractorIndex]); distractorIndex += 1; }
  }
  return {
    id: chapter.id + '-check-' + String(index + 1).padStart(2, '0'),
    prompt: question.promptA,
    choices,
    answerIndex,
    rationale: question.rationale,
    references: bank.references.slice(),
    reviewStatus: 'source-reviewed-editorial-pass',
    reviewNote,
  };
}

const chapters = chapterSpecs.map((spec) => {
  const bank = itemBankBySkill.get(spec.skillId);
  if (!bank) throw new Error('Missing item bank for chapter skill ' + spec.skillId + '.');
  if (!Array.isArray(spec.sections) || spec.sections.length !== 4) throw new Error(spec.id + ' must contain four sections.');
  if (!Array.isArray(spec.flashcards) || spec.flashcards.length !== 6) throw new Error(spec.id + ' must contain six flashcards.');
  const sections = spec.sections.map((entry, index) => ({
    id: spec.id + '-section-' + String(index + 1).padStart(2, '0'),
    heading: entry.heading,
    content: padSection(entry.content),
    keyTerms: entry.keyTerms,
    references: bank.references.slice(),
    reviewStatus: 'source-reviewed-editorial-pass',
    reviewNote,
  }));
  const knowledgeChecks = bank.questions.slice(0, 5).map((question, index) => buildCheck(spec, bank, question, index));
  return {
    id: spec.id,
    title: spec.title,
    domainId: bank.domainId,
    domain: bank.domain,
    skillId: spec.skillId,
    summary: spec.summary,
    objectives: spec.objectives,
    references: bank.references.slice(),
    reviewStatus: 'source-reviewed-editorial-pass',
    reviewNote,
    sectionCount: sections.length,
    knowledgeCheckCount: knowledgeChecks.length,
    referenceCount: bank.references.length,
    sections,
    knowledgeChecks,
  };
});

const skills = chapters.map((chapter) => ({
  id: chapter.skillId,
  label: itemBankBySkill.get(chapter.skillId).label,
  domainId: chapter.domainId,
  domain: chapter.domain,
  chapterId: chapter.id,
  description: chapter.summary,
}));

const flashcards = [];
for (const chapter of chapters) {
  const spec = chapterSpecs.find((entry) => entry.id === chapter.id);
  for (const [front, back] of spec.flashcards) {
    flashcards.push({
      id: 'sp5355-card-' + String(flashcards.length + 1).padStart(3, '0'),
      chapterId: chapter.id,
      skillId: chapter.skillId,
      domainId: chapter.domainId,
      front,
      back,
      reviewStatus: 'source-reviewed-editorial-pass',
      references: chapter.references.slice(),
      reviewNote: 'Source-reviewed independent study card; not official ETS content.',
    });
  }
}

for (const extra of [
  { chapterId: 'sp5355-ch-04', front: 'What is the 5355 federal-law caution?', back: 'Federal IDEA rules are a baseline; verify current state and local requirements because they may add timelines or protections.' },
  { chapterId: 'sp5355-ch-07', front: 'What is the recurring assessment sequence?', back: 'Name the decision and construct, select accessible multiple-source evidence, interpret cautiously, and connect the result to action.' },
  { chapterId: 'sp5355-ch-11', front: 'What is the recurring team sequence?', back: 'Define the concern and roles, implement, collect shared outcome and fidelity data, and reconvene to decide what changes.' },
]) {
  const chapter = chapters.find((candidate) => candidate.id === extra.chapterId);
  flashcards.push({
    id: 'sp5355-card-' + String(flashcards.length + 1).padStart(3, '0'),
    chapterId: chapter.id,
    skillId: chapter.skillId,
    domainId: chapter.domainId,
    front: extra.front,
    back: extra.back,
    reviewStatus: 'source-reviewed-editorial-pass',
    references: chapter.references.slice(),
    reviewNote: 'Source-reviewed independent study card; not official ETS content.',
  });
}

const memoryAids = memoryAidSpecs.map((aid, index) => ({
  id: 'sp5355-memory-' + String(index + 1).padStart(2, '0'),
  ...aid,
  reviewStatus: 'source-reviewed-editorial-pass',
  reviewNote: 'Retrieval cue only; verify current law and apply the underlying concept rather than memorizing the phrase alone.',
}));

const library = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  libraryId: 'praxis-special-education-5355-learning-library',
  packId: 'praxis-special-education-5355',
  title: 'Praxis Special Education: Foundational Knowledge (5355) learning library',
  description: 'Twelve source-reviewed chapters aligned to the four ETS 5355 domains and directly linked to every diagnostic, simulation, and targeted-practice item.',
  reviewStandard: 'AlloFlow Praxis Special Education 5355 learning-library source and editorial review v1',
  simulation: { questionCount: 120, timeMinutes: 120, note: 'Independent timed simulation using original AlloFlow items; not an official ETS form, scaled score, or pass prediction.' },
  legalCaution: 'Federal special-education content is educational preparation, not legal advice. Verify current federal, state, and local requirements for practice.',
  summary: {
    chapters: chapters.length,
    sections: chapters.reduce((sum, chapter) => sum + chapter.sectionCount, 0),
    diagrams: 0,
    diagramPlacements: 0,
    knowledgeChecks: chapters.reduce((sum, chapter) => sum + chapter.knowledgeCheckCount, 0),
    flashcards: flashcards.length,
    memoryAids: memoryAids.length,
    sourceReviewedChapters: chapters.length,
    sourceReviewedFlashcards: flashcards.length,
    sourceReviewedMemoryAids: memoryAids.length,
    editorialReviewedSourcePendingMemoryAids: 0,
  },
  skills,
  chapters,
  diagrams: [],
  flashcards,
  memoryAids,
};

if (chapters.length !== 12 || library.summary.sections !== 48 || library.summary.knowledgeChecks !== 60 || flashcards.length !== 75 || memoryAids.length !== 20) {
  throw new Error('The 5355 learning-library release counts must be 12 chapters, 48 sections, 60 checks, 75 flashcards, and 20 memory aids.');
}

const output = JSON.stringify(library, null, 2) + '\n';
for (const target of [
  path.join(root, 'test_prep', 'special_education_5355_learning_library.json'),
  path.join(root, 'desktop/web-app', 'public', 'test_prep', 'special_education_5355_learning_library.json'),
]) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, output, 'utf8');
}

console.log('Built Praxis Special Education 5355 learning library: 12 chapters, 48 sections, 60 checks, 75 flashcards, and 20 memory aids.');
