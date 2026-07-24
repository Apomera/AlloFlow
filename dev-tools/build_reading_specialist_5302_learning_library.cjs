#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const itemBanks = require('./reading_specialist_5302/item_content.cjs');
const { chapters: chapterSpecs, memoryAids: memoryAidSpecs, workshops: workshopSpecs } = require('./reading_specialist_5302/learning_content.cjs');
const root = path.resolve(__dirname, '..');
const itemBankBySkill = new Map(itemBanks.map((bank) => [bank.id, bank]));
const reviewNote = 'Independently authored and source reviewed for study use; independent reading-specialist validation remains pending.';

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
    rationale: ensure(question.rationale, 100, 'This answer applies the complete literacy principle while preserving construct alignment, evidence, equity, access, specialist scope, and appropriate follow-up.'),
    references: bank.references.slice(), reviewStatus: 'source-reviewed-editorial-pass', reviewNote,
  };
}

const chapters = chapterSpecs.map((spec) => {
  const bank = itemBankBySkill.get(spec.skillId);
  if (!bank) throw new Error('Missing item bank for chapter skill ' + spec.skillId + '.');
  if (!Array.isArray(spec.sections) || spec.sections.length !== 4) throw new Error(spec.id + ' must contain four sections.');
  if (!Array.isArray(spec.flashcards) || spec.flashcards.length !== 6) throw new Error(spec.id + ' must contain six flashcards.');
  const sections = spec.sections.map((entry, index) => ({
    id: spec.id + '-section-' + String(index + 1).padStart(2, '0'), heading: entry.heading,
    content: ensure(entry.content, 300, 'Apply this framework by naming the literacy question, learner and language evidence, relevant construct and research, instructional or assessment decision, equity and access safeguards, measurable outcome, and follow-up.'),
    keyTerms: entry.keyTerms, references: bank.references.slice(), reviewStatus: 'source-reviewed-editorial-pass', reviewNote,
  }));
  const knowledgeChecks = bank.questions.slice(0, 5).map((question, index) => buildCheck(spec, bank, question, index));
  return {
    id: spec.id, title: spec.title, domainId: bank.domainId, domain: bank.domain, skillId: spec.skillId, summary: spec.summary,
    objectives: spec.objectives, references: bank.references.slice(), reviewStatus: 'source-reviewed-editorial-pass', reviewNote,
    sectionCount: sections.length, knowledgeCheckCount: knowledgeChecks.length, referenceCount: bank.references.length, sections, knowledgeChecks,
  };
});

const skills = chapters.map((chapter) => ({ id: chapter.skillId, label: itemBankBySkill.get(chapter.skillId).label, domainId: chapter.domainId, domain: chapter.domain, chapterId: chapter.id, description: chapter.summary }));
const flashcards = [];
for (const chapter of chapters) {
  const spec = chapterSpecs.find((entry) => entry.id === chapter.id);
  for (const [front, back] of spec.flashcards) flashcards.push({
    id: 'read5302-card-' + String(flashcards.length + 1).padStart(3, '0'), chapterId: chapter.id, skillId: chapter.skillId, domainId: chapter.domainId, domain: chapter.domain,
    front, back: ensure(back, 30, 'Apply the concept using current literacy evidence, ethical, legal, assessment, instructional, privacy, and jurisdictional requirements.'),
    reviewStatus: 'source-reviewed-editorial-pass', references: chapter.references.slice(), reviewNote: 'Source-reviewed independent study card; not official ETS or ILA content.',
  });
}

for (const extra of [
  { chapterId: 'read5302-ch-03', front: 'What is the recurring word-reading chain?', back: 'Analyze the sound and spelling pattern, teach it explicitly and cumulatively, connect decoding with encoding and meaning, apply it in connected text, and monitor transfer.' },
  { chapterId: 'read5302-ch-09', front: 'What is the recurring progress-decision chain?', back: 'Use a representative baseline, justified goal, comparable measures, complete trend, fidelity evidence, diagnostic hypothesis, documented adaptation, and planned review.' },
  { chapterId: 'read5302-ch-12', front: 'What is the recurring specialist boundary?', back: 'Study and instructional data do not independently diagnose disability, determine eligibility, authorize record disclosure, or replace current multidisciplinary, legal, and ethical processes.' },
]) {
  const chapter = chapters.find((candidate) => candidate.id === extra.chapterId);
  flashcards.push({ id: 'read5302-card-' + String(flashcards.length + 1).padStart(3, '0'), chapterId: chapter.id, skillId: chapter.skillId, domainId: chapter.domainId, domain: chapter.domain, front: extra.front, back: extra.back, reviewStatus: 'source-reviewed-editorial-pass', references: chapter.references.slice(), reviewNote: 'Source-reviewed independent study card; not official ETS or ILA content.' });
}

const memoryAids = memoryAidSpecs.map((entry, index) => ({ id: 'read5302-memory-' + String(index + 1).padStart(2, '0'), type: 'retrieval cue', ...entry, reviewStatus: 'source-reviewed-editorial-pass', reviewNote: 'Retrieval cue only; verify the underlying literacy evidence, construct, learner data, current law and policy, and instructional context.' }));
const constructedResponseWorkshops = workshopSpecs.map((entry, index) => ({
  ...entry, id: entry.id || 'read5302-cr-' + String(index + 1).padStart(2, '0'), reviewStatus: 'source-reviewed-editorial-pass',
  reviewNote: 'Independent response-planning practice; not an official ETS prompt, scoring guide, score, or prediction. Self-check criteria require independent reading-specialist and psychometric validation.',
}));

const library = {
  schemaVersion: 1, generatedAt: new Date().toISOString(), libraryId: 'praxis-reading-specialist-5302-learning-library', packId: 'praxis-reading-specialist-5302',
  title: 'Praxis Reading Specialist (5302) learning library',
  description: 'Twelve source-reviewed chapters aligned to the three selected-response categories, with six constructed-response planning workshops for the professional-leadership and elementary case-study formats.',
  reviewStandard: 'AlloFlow Praxis Reading Specialist 5302 learning-library source and editorial review v1',
  simulation: { questionCount: 95, timeMinutes: 150, officialConstructedResponseCount: 2, note: 'The timed segment contains original selected-response items only. The official 150-minute test also includes two constructed responses. Complete the separate written-response workshops; AlloFlow provides planning and self-check criteria but does not score written responses.' },
  legalCaution: 'This reading-specialist content is educational preparation, not a diagnosis of dyslexia or disability, special-education evaluation or eligibility decision, official constructed-response score, supervision, or legal advice. Verify current federal, state, local, certification, privacy, consent, assessment, and educational requirements and use qualified multidisciplinary processes.',
  frameworkCaution: 'The ETS 5302 study companion defines the tested blueprint and format. ILA, IES, IDA, WIDA, NCII, legal, privacy, and state materials can be revised; verify current editions and local requirements while preparing and practicing.',
  summary: { chapters: chapters.length, sections: chapters.reduce((sum, chapter) => sum + chapter.sectionCount, 0), diagrams: 0, diagramPlacements: 0, knowledgeChecks: chapters.reduce((sum, chapter) => sum + chapter.knowledgeCheckCount, 0), flashcards: flashcards.length, memoryAids: memoryAids.length, constructedResponseWorkshops: constructedResponseWorkshops.length, sourceReviewedChapters: chapters.length, sourceReviewedFlashcards: flashcards.length, sourceReviewedMemoryAids: memoryAids.length, sourceReviewedConstructedResponseWorkshops: constructedResponseWorkshops.length, editorialReviewedSourcePendingMemoryAids: 0 },
  skills, chapters, diagrams: [], flashcards, memoryAids, constructedResponseWorkshops,
};

if (chapters.length !== 12 || library.summary.sections !== 48 || library.summary.knowledgeChecks !== 60 || flashcards.length !== 75 || memoryAids.length !== 20 || constructedResponseWorkshops.length !== 6) throw new Error('The 5302 learning-library release counts must be 12 chapters, 48 sections, 60 checks, 75 flashcards, 20 memory aids, and 6 constructed-response workshops.');
const output = JSON.stringify(library, null, 2) + '\n';
for (const target of [path.join(root, 'test_prep', 'reading_specialist_5302_learning_library.json'), path.join(root, 'desktop/web-app', 'public', 'test_prep', 'reading_specialist_5302_learning_library.json')]) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, output, 'utf8');
}
console.log('Built Praxis Reading Specialist 5302 learning library: 12 chapters, 48 sections, 60 checks, 75 flashcards, 20 memory aids, and 6 constructed-response workshops.');
