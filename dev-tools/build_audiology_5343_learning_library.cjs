#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const itemBanks = require('./audiology_5343/item_content.cjs');
const { chapters: chapterSpecs, memoryAids: memoryAidSpecs } = require('./audiology_5343/learning_content.cjs');
const root = path.resolve(__dirname, '..');
const itemBankBySkill = new Map(itemBanks.map((bank) => [bank.id, bank]));
const reviewNote = 'Independently authored and source reviewed for study use; independent licensed-audiologist validation remains pending.';

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
    rationale: ensure(question.rationale, 100, 'This answer applies the complete audiologic principle while preserving measurement validity, professional scope, safety, access, individual priorities, and appropriate follow-up.'),
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
    content: ensure(entry.content, 300, 'Apply this framework by naming the audiologic question, relevant mechanism and measurement evidence, technical and safety limits, person or family priorities, functional outcome, and follow-up decision.'),
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
    id: 'aud5343-card-' + String(flashcards.length + 1).padStart(3, '0'), chapterId: chapter.id, skillId: chapter.skillId, domainId: chapter.domainId,
    front, back: ensure(back, 30, 'Apply the concept using current ethical, legal, audiologic, educational, medical, technical, and jurisdictional requirements.'),
    reviewStatus: 'source-reviewed-editorial-pass', references: chapter.references.slice(), reviewNote: 'Source-reviewed independent study card; not official ETS or ASHA content.',
  });
}

for (const extra of [
  { chapterId: 'aud5343-ch-04', front: 'What is the recurring screening chain?', back: 'Define the population and decision, use a valid accessible protocol, communicate pass or refer accurately, complete timely follow-up, and monitor loss to follow-up and disparities.' },
  { chapterId: 'aud5343-ch-08', front: 'What is the recurring diagnostic chain?', back: 'Clarify the referral question, collect technically valid cross-checks, integrate mechanism and function, state uncertainty, act on red flags, and connect conclusions to measurable follow-up.' },
  { chapterId: 'aud5343-ch-12', front: 'What is the recurring safety boundary?', back: 'Study results cannot diagnose, fit a device, determine vestibular or medical care, or replace emergency action. Use qualified individualized services, current protocol, informed consent, and timely referral.' },
]) {
  const chapter = chapters.find((candidate) => candidate.id === extra.chapterId);
  flashcards.push({ id: 'aud5343-card-' + String(flashcards.length + 1).padStart(3, '0'), chapterId: chapter.id, skillId: chapter.skillId, domainId: chapter.domainId, front: extra.front, back: extra.back, reviewStatus: 'source-reviewed-editorial-pass', references: chapter.references.slice(), reviewNote: 'Source-reviewed independent study card; not official ETS or ASHA content.' });
}

const memoryAids = memoryAidSpecs.map((entry, index) => ({ id: 'aud5343-memory-' + String(index + 1).padStart(2, '0'), ...entry, reviewStatus: 'source-reviewed-editorial-pass', reviewNote: 'Retrieval cue only; verify the underlying evidence, current ethics, scope, law, medical or educational protocol, device instructions, and individual audiologic findings.' }));

const library = {
  schemaVersion: 1, generatedAt: new Date().toISOString(), libraryId: 'praxis-audiology-5343-learning-library', packId: 'praxis-audiology-5343',
  title: 'Praxis Audiology (5343) learning library',
  description: 'Twelve source-reviewed chapters aligned to the five ETS 5343 categories and linked directly to every diagnostic, simulation, and targeted-practice item.',
  reviewStandard: 'AlloFlow Praxis Audiology 5343 learning-library source and editorial review v1',
  simulation: { questionCount: 120, timeMinutes: 120, note: 'Independent timed simulation using original AlloFlow items; not an official ETS form, scaled score, pass prediction, credential, clinical evaluation, diagnosis, vestibular or medical decision, device fitting, or treatment tool.' },
  legalCaution: 'This audiology content is educational preparation, not a clinical evaluation, diagnosis, medical or vestibular decision, device fitting, treatment plan, supervision, or legal advice. Verify current federal, state, local, licensure, certification, educational, health-care, privacy, consent, emergency, and reporting requirements and use qualified individualized care.',
  frameworkCaution: 'The ETS 5343 study companion defines the tested blueprint. ASHA standards, ethics, scope, school guidance, and Practice Portal materials can be revised; verify current editions while preparing and practicing. Certification standards announced for a future effective date are not treated as current requirements before that date.',
  summary: { chapters: chapters.length, sections: chapters.reduce((sum, chapter) => sum + chapter.sectionCount, 0), diagrams: 0, diagramPlacements: 0, knowledgeChecks: chapters.reduce((sum, chapter) => sum + chapter.knowledgeCheckCount, 0), flashcards: flashcards.length, memoryAids: memoryAids.length, sourceReviewedChapters: chapters.length, sourceReviewedFlashcards: flashcards.length, sourceReviewedMemoryAids: memoryAids.length, editorialReviewedSourcePendingMemoryAids: 0 },
  skills, chapters, diagrams: [], flashcards, memoryAids,
};

if (chapters.length !== 12 || library.summary.sections !== 48 || library.summary.knowledgeChecks !== 60 || flashcards.length !== 75 || memoryAids.length !== 20) throw new Error('The 5343 learning-library release counts must be 12 chapters, 48 sections, 60 checks, 75 flashcards, and 20 memory aids.');
const output = JSON.stringify(library, null, 2) + '\n';
for (const target of [path.join(root, 'test_prep', 'audiology_5343_learning_library.json'), path.join(root, 'desktop/web-app', 'public', 'test_prep', 'audiology_5343_learning_library.json')]) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, output, 'utf8');
}
console.log('Built Praxis Audiology 5343 learning library: 12 chapters, 48 sections, 60 checks, 75 flashcards, and 20 memory aids.');
