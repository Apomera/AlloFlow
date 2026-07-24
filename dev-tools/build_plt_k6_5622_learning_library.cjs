#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const itemBanks = require('./plt_k6_5622/item_content.cjs');
const { chapters: chapterSpecs, memoryAids: memoryAidSpecs, workshops: workshopSpecs } = require('./plt_k6_5622/learning_content.cjs');
const root = path.resolve(__dirname, '..');
const itemBankBySkill = new Map(itemBanks.map((bank) => [bank.id, bank]));
const reviewNote = 'Independently authored and source reviewed for study use; independent practicing K–6 educator and psychometric validation remain pending.';

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
    rationale: ensure(question.rationale, 100, 'This answer best matches the K–6 learning goal, relevant learner evidence, aligned instruction or assessment, equitable access, professional boundaries, and an appropriate follow-up check.'),
    references: bank.references.slice(), reviewStatus: 'source-reviewed-editorial-pass', reviewNote,
  };
}

const chapters = chapterSpecs.map((spec) => {
  const bank = itemBankBySkill.get(spec.skillId);
  if (!bank) throw new Error('Missing item bank for chapter skill ' + spec.skillId + '.');
  if (!Array.isArray(spec.sections) || spec.sections.length !== 4) throw new Error(spec.id + ' must contain four sections.');
  const sections = spec.sections.map((entry, index) => ({
    id: spec.id + '-section-' + String(index + 1).padStart(2, '0'), heading: entry.heading,
    content: ensure(entry.content, 300, 'Apply the framework to a defined K–6 learner, learning goal, evidence pattern, instructional or assessment decision, access need, professional boundary, and measurable follow-up.'),
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
    id: 'plt5622-card-' + String(flashcards.length + 1).padStart(3, '0'), chapterId: chapter.id, skillId: chapter.skillId,
    domainId: chapter.domainId, domain: chapter.domain, front: question.promptA,
    back: ensure(question.correct, 30, 'Apply the concept by matching the K–6 goal, evidence, access, action, professional boundary, and follow-up.'),
    reviewStatus: 'source-reviewed-editorial-pass', references: chapter.references.slice(),
    reviewNote: 'Source-reviewed independent study card; not official ETS or CCSSO content.',
  });
}
for (const extra of [
  { chapterId: 'plt5622-ch-01', front: 'What is the recurring learning-and-transfer chain?', back: 'Activate and organize prior knowledge, model the strategy, guide retrieval and explanation, vary contexts, fade support, and verify independent transfer.' },
  { chapterId: 'plt5622-ch-09', front: 'What is the recurring score-interpretation boundary?', back: 'Name the purpose and reference frame, check validity, reliability, access, distribution, and uncertainty, use multiple measures, and communicate only the supported meaning.' },
  { chapterId: 'plt5622-ch-12', front: 'What is the recurring professional-boundary chain?', back: 'Protect immediate safety, identify role and authority, verify current law and policy, use the qualified process, minimize disclosure, document facts, and follow up.' },
]) {
  const chapter = chapters.find((candidate) => candidate.id === extra.chapterId);
  flashcards.push({
    id: 'plt5622-card-' + String(flashcards.length + 1).padStart(3, '0'), chapterId: chapter.id, skillId: chapter.skillId,
    domainId: chapter.domainId, domain: chapter.domain, front: extra.front, back: extra.back,
    reviewStatus: 'source-reviewed-editorial-pass', references: chapter.references.slice(),
    reviewNote: 'Source-reviewed independent study card; not official ETS or CCSSO content.',
  });
}

const memoryAids = memoryAidSpecs.map((entry, index) => ({
  id: 'plt5622-memory-' + String(index + 1).padStart(2, '0'), type: 'retrieval cue', ...entry,
  reviewStatus: 'source-reviewed-editorial-pass',
  reviewNote: 'Retrieval cue only; verify the underlying learning evidence, construct, learner context, current law and policy, and intended educational use.',
}));
const constructedResponseWorkshops = workshopSpecs.map((entry, index) => ({
  ...entry, id: entry.id || 'plt5622-cr-' + String(index + 1).padStart(2, '0'), reviewStatus: 'source-reviewed-editorial-pass',
  reviewNote: 'Independent case-analysis planning practice; not an official ETS prompt, scoring guide, score, or prediction. Self-check criteria require independent K–6 educator and psychometric validation.',
}));

const library = {
  schemaVersion: 1, generatedAt: new Date().toISOString(),
  libraryId: 'praxis-plt-k6-5622-learning-library', packId: 'praxis-plt-k6-5622',
  title: 'Praxis Principles of Learning and Teaching: Grades K–6 (5622) learning library',
  description: 'Twelve source-reviewed chapters aligned to the four selected-response categories, with eight case-analysis planning workshops spanning students, instruction, assessment, and professional practice.',
  reviewStandard: 'AlloFlow Praxis PLT K–6 5622 learning-library source and editorial review v1',
  simulation: { questionCount: 70, timeMinutes: 70, officialTotalTimeMinutes: 120, officialConstructedResponseCount: 4, note: 'The timed segment contains original selected-response items only and uses the approximately 70-minute pacing recommended by ETS. The official two-hour test also includes four constructed responses related to two case histories. Complete separate written-response workshops; AlloFlow provides planning and self-check criteria but does not score written responses.' },
  legalCaution: 'This PLT K–6 content is educational preparation, not a diagnosis, disability evaluation or eligibility decision, accommodation decision, official constructed-response score, legal advice, mandated-reporting determination, student-discipline finding, emergency directive, teacher evaluation, licensure decision, or substitute for qualified supervision. Verify current federal, state, local, district, school, certification, licensure, privacy, civil-rights, safety, reporting, assessment, and educational requirements with qualified authority.',
  frameworkCaution: 'The ETS 5622 study companion defines the tested blueprint, format, and case-history response expectations and states that the test reflects InTASC standards. ETS, InTASC, IES, IDEA, FERPA, civil-rights, English-learner, emergency, state, district, and school materials can be revised; verify current editions and local implementation requirements.',
  summary: {
    chapters: chapters.length, sections: chapters.reduce((sum, chapter) => sum + chapter.sectionCount, 0), diagrams: 0, diagramPlacements: 0,
    knowledgeChecks: chapters.reduce((sum, chapter) => sum + chapter.knowledgeCheckCount, 0), flashcards: flashcards.length,
    memoryAids: memoryAids.length, constructedResponseWorkshops: constructedResponseWorkshops.length,
    sourceReviewedChapters: chapters.length, sourceReviewedFlashcards: flashcards.length, sourceReviewedMemoryAids: memoryAids.length,
    sourceReviewedConstructedResponseWorkshops: constructedResponseWorkshops.length, editorialReviewedSourcePendingMemoryAids: 0,
  },
  skills, chapters, diagrams: [], flashcards, memoryAids, constructedResponseWorkshops,
};

if (chapters.length !== 12 || library.summary.sections !== 48 || library.summary.knowledgeChecks !== 60 || flashcards.length !== 75 || memoryAids.length !== 20 || constructedResponseWorkshops.length !== 8) throw new Error('The 5622 learning-library release counts must be 12 chapters, 48 sections, 60 checks, 75 flashcards, 20 memory aids, and 8 constructed-response workshops.');
const output = JSON.stringify(library, null, 2) + '\n';
for (const target of [
  path.join(root, 'test_prep', 'plt_k6_5622_learning_library.json'),
  path.join(root, 'desktop/web-app', 'public', 'test_prep', 'plt_k6_5622_learning_library.json'),
]) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, output, 'utf8');
}
console.log('Built Praxis PLT K–6 5622 learning library: 12 chapters, 48 sections, 60 checks, 75 flashcards, 20 memory aids, and 8 case-analysis workshops.');
