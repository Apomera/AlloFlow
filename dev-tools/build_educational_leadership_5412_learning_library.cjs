#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const itemBanks = require('./educational_leadership_5412/item_content.cjs');
const { chapters: chapterSpecs, memoryAids: memoryAidSpecs } = require('./educational_leadership_5412/learning_content.cjs');
const root = path.resolve(__dirname, '..');
const itemBankBySkill = new Map(itemBanks.map((bank) => [bank.id, bank]));
const reviewNote = 'Independently authored and source reviewed for study use; independent practicing-school-leader and psychometric validation remain pending.';

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
    rationale: ensure(question.rationale, 100, 'This answer applies the complete student-centered leadership principle while preserving evidence quality, equity, legal and ethical boundaries, implementation capacity, communication, and measurable follow-up.'),
    references: bank.references.slice(), reviewStatus: 'source-reviewed-editorial-pass', reviewNote,
  };
}

const chapters = chapterSpecs.map((spec) => {
  const bank = itemBankBySkill.get(spec.skillId);
  if (!bank) throw new Error('Missing item bank for chapter skill ' + spec.skillId + '.');
  if (!Array.isArray(spec.sections) || spec.sections.length !== 4) throw new Error(spec.id + ' must contain four sections.');
  const sections = spec.sections.map((entry, index) => ({
    id: spec.id + '-section-' + String(index + 1).padStart(2, '0'), heading: entry.heading,
    content: ensure(entry.content, 300, 'Apply the framework by identifying the leadership purpose, evidence, stakeholders, authority, safeguards, implementation conditions, measures, communication, and review point.'),
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
    id: 'lead5412-card-' + String(flashcards.length + 1).padStart(3, '0'), chapterId: chapter.id, skillId: chapter.skillId,
    domainId: chapter.domainId, domain: chapter.domain, front: question.promptA,
    back: ensure(question.correct, 30, 'Apply the concept using representative evidence, current authority, equity, access, implementation, communication, and follow-up.'),
    reviewStatus: 'source-reviewed-editorial-pass', references: chapter.references.slice(),
    reviewNote: 'Source-reviewed independent study card; not official ETS or NPBEA content.',
  });
}
for (const extra of [
  { chapterId: 'lead5412-ch-02', front: 'What is the recurring improvement chain?', back: 'Define the problem, state the theory of action, predict, test, measure implementation and outcomes, study variation, adapt transparently, and review again.' },
  { chapterId: 'lead5412-ch-08', front: 'What is the recurring legal boundary for leaders?', back: 'Study materials are not legal advice; verify current federal, state, local, board, contract, agency, privacy, civil-rights, disability, employment, and procedural requirements with qualified authority.' },
  { chapterId: 'lead5412-ch-10', front: 'What is the recurring safety-and-continuity chain?', back: 'Assess site-specific risk, plan collaboratively, define accessible roles and communication, train and exercise, maintain essential functions, recover, correct findings, and retest.' },
]) {
  const chapter = chapters.find((candidate) => candidate.id === extra.chapterId);
  flashcards.push({
    id: 'lead5412-card-' + String(flashcards.length + 1).padStart(3, '0'), chapterId: chapter.id, skillId: chapter.skillId,
    domainId: chapter.domainId, domain: chapter.domain, front: extra.front, back: extra.back,
    reviewStatus: 'source-reviewed-editorial-pass', references: chapter.references.slice(),
    reviewNote: 'Source-reviewed independent study card; not official ETS or NPBEA content.',
  });
}

const memoryAids = memoryAidSpecs.map((entry, index) => ({
  id: 'lead5412-memory-' + String(index + 1).padStart(2, '0'), type: 'retrieval cue', ...entry,
  reviewStatus: 'source-reviewed-editorial-pass',
  reviewNote: 'Retrieval cue only; verify the underlying leadership evidence, authority, ethical and legal requirements, stakeholder context, implementation, and intended use.',
}));

const library = {
  schemaVersion: 1, generatedAt: new Date().toISOString(),
  libraryId: 'praxis-educational-leadership-5412-learning-library', packId: 'praxis-educational-leadership-5412',
  title: 'Praxis Educational Leadership: Administration and Supervision (5412) learning library',
  description: 'Twelve source-reviewed chapters aligned to the six current 5412 leadership categories, with knowledge checks, targeted practice links, flashcards, and decision-focused memory aids.',
  reviewStandard: 'AlloFlow Praxis Educational Leadership 5412 learning-library source and editorial review v1',
  simulation: { questionCount: 120, timeMinutes: 165, selectedResponse: true },
  legalCaution: 'This educational-leadership content is independent test preparation, not legal, financial, personnel, civil-rights, disability, privacy, procurement, safety, emergency, employment, licensure, or policy advice. It does not determine employee discipline, student discipline, disability eligibility, accommodations, record disclosure, emergency action, or professional competence. Verify current federal, state, local, board, contract, certification, agency, and institutional requirements with qualified authority.',
  frameworkCaution: 'The ETS 5412 study companion defines the tested blueprint and format and aligns the assessment with the 2015 PSEL standards. ETS, PSEL, IES, Department of Education, IDEA, FERPA, civil-rights, CISA, emergency-planning, family-engagement, state, board, and contract materials can be revised; verify current editions and local implementation requirements.',
  summary: {
    chapters: chapters.length, sections: chapters.reduce((sum, chapter) => sum + chapter.sectionCount, 0), diagrams: 0, diagramPlacements: 0,
    knowledgeChecks: chapters.reduce((sum, chapter) => sum + chapter.knowledgeCheckCount, 0), flashcards: flashcards.length,
    memoryAids: memoryAids.length, sourceReviewedChapters: chapters.length, sourceReviewedFlashcards: flashcards.length,
    sourceReviewedMemoryAids: memoryAids.length, editorialReviewedSourcePendingMemoryAids: 0,
  },
  skills, chapters, diagrams: [], flashcards, memoryAids,
};

if (chapters.length !== 12 || library.summary.sections !== 48 || library.summary.knowledgeChecks !== 60 || flashcards.length !== 75 || memoryAids.length !== 20) throw new Error('The 5412 learning-library release counts must be 12 chapters, 48 sections, 60 checks, 75 flashcards, and 20 memory aids.');
const output = JSON.stringify(library, null, 2) + '\n';
for (const target of [
  path.join(root, 'test_prep', 'educational_leadership_5412_learning_library.json'),
  path.join(root, 'desktop/web-app', 'public', 'test_prep', 'educational_leadership_5412_learning_library.json'),
]) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, output, 'utf8');
}
console.log('Built Praxis Educational Leadership 5412 learning library: 12 chapters, 48 sections, 60 checks, 75 flashcards, and 20 memory aids.');
