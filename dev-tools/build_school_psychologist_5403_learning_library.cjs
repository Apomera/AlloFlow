#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const itemBanks = require('./school_psychologist_5403/item_content.cjs');
const { chapters: chapterSpecs, memoryAids: memoryAidSpecs } = require('./school_psychologist_5403/learning_content.cjs');

const root = path.resolve(__dirname, '..');
const itemBankBySkill = new Map(itemBanks.map((bank) => [bank.id, bank]));
const reviewNote = 'Independently authored and source reviewed for study use; independent school-psychologist validation remains pending.';

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
    id: chapter.id + '-check-' + String(index + 1).padStart(2, '0'),
    prompt: question.promptA,
    choices,
    answerIndex,
    rationale: ensure(question.rationale, 100, 'This answer applies the complete school-psychology principle while preserving assessment, access, safety, and decision quality.'),
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
    content: ensure(entry.content, 300, 'Apply this framework by naming the learner need, evidence, professional role, action, access safeguards, and follow-up decision required in the school context.'),
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
      id: 'sp5403-card-' + String(flashcards.length + 1).padStart(3, '0'),
      chapterId: chapter.id,
      skillId: chapter.skillId,
      domainId: chapter.domainId,
      front,
      back: ensure(back, 30, 'Apply the concept using current ethical, legal, professional, and district requirements.'),
      reviewStatus: 'source-reviewed-editorial-pass',
      references: chapter.references.slice(),
      reviewNote: 'Source-reviewed independent study card; not official ETS or NASP content.',
    });
  }
}

for (const extra of [
  { chapterId: 'sp5403-ch-01', front: 'What is the recurring school-psychology problem-solving cycle?', back: 'Define an observable concern, analyze alterable causes, implement a matched strategy, and evaluate outcome plus fidelity using an advance decision rule.' },
  { chapterId: 'sp5403-ch-02', front: 'What makes an evaluation decision defensible?', back: 'Use multiple relevant, technically sound and accessible sources; integrate context and uncertainty; and never use one measure as the sole criterion.' },
  { chapterId: 'sp5403-ch-12', front: 'What is the recurring professional-practice caution?', back: 'Verify current federal, state, local, credential, ethical, district, consent, privacy, crisis, and reporting requirements before applying a study principle.' },
]) {
  const chapter = chapters.find((candidate) => candidate.id === extra.chapterId);
  flashcards.push({
    id: 'sp5403-card-' + String(flashcards.length + 1).padStart(3, '0'),
    chapterId: chapter.id,
    skillId: chapter.skillId,
    domainId: chapter.domainId,
    front: extra.front,
    back: extra.back,
    reviewStatus: 'source-reviewed-editorial-pass',
    references: chapter.references.slice(),
    reviewNote: 'Source-reviewed independent study card; not official ETS or NASP content.',
  });
}

const memoryAids = memoryAidSpecs.map((aid, index) => ({
  id: 'sp5403-memory-' + String(index + 1).padStart(2, '0'),
  ...aid,
  reviewStatus: 'source-reviewed-editorial-pass',
  reviewNote: 'Retrieval cue only; apply the underlying concept and verify current law, ethics, standards, crisis procedures, and district requirements.',
}));

const library = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  libraryId: 'praxis-school-psychologist-5403-learning-library',
  packId: 'praxis-school-psychologist-5403',
  title: 'Praxis School Psychologist (5403) learning library',
  description: 'Twelve source-reviewed chapters aligned to the four ETS 5403 categories and ten NASP practice domains, with direct links to every diagnostic, simulation, and targeted-practice item.',
  reviewStandard: 'AlloFlow Praxis School Psychologist 5403 learning-library source and editorial review v1',
  simulation: { questionCount: 125, timeMinutes: 125, note: 'Independent timed simulation using original AlloFlow items; not an official ETS form, scaled score, pass prediction, credential, psychological evaluation, diagnosis, or treatment tool.' },
  legalCaution: 'This school-psychology content is educational preparation, not a psychological evaluation, diagnosis, mental-health treatment, or legal advice. Verify current federal, state, local, district, credential, ethical, crisis, consent, privacy, and mandated-reporting requirements for practice.',
  frameworkCaution: 'The ETS 5403 study companion defines the tested blueprint. NASP standards, ethics, and practice materials can be revised; verify current editions while preparing and practicing.',
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
  throw new Error('The 5403 learning-library release counts must be 12 chapters, 48 sections, 60 checks, 75 flashcards, and 20 memory aids.');
}

const output = JSON.stringify(library, null, 2) + '\n';
for (const target of [
  path.join(root, 'test_prep', 'school_psychologist_5403_learning_library.json'),
  path.join(root, 'desktop/web-app', 'public', 'test_prep', 'school_psychologist_5403_learning_library.json'),
]) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, output, 'utf8');
}

console.log('Built Praxis School Psychologist 5403 learning library: 12 chapters, 48 sections, 60 checks, 75 flashcards, and 20 memory aids.');
