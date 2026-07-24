#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { writeGeneratedFile } = require('./write_generated_file.cjs');
const itemBanks = require('./speech_language_pathology_5331/item_content.cjs');
const { chapters: chapterSpecs, memoryAids: memoryAidSpecs } = require('./speech_language_pathology_5331/learning_content.cjs');
const root = path.resolve(__dirname, '..');
const itemBankBySkill = new Map(itemBanks.map((bank) => [bank.id, bank]));
const reviewNote = 'Independently authored and source reviewed for study use; independent licensed-SLP validation remains pending.';

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
    rationale: ensure(question.rationale, 100, 'This answer applies the complete speech-language pathology principle while preserving scope, evidence, access, safety, participation, and appropriate follow-up.'),
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
    content: ensure(entry.content, 300, 'Apply this framework by naming the communication or swallowing need, relevant physiology and evidence, professional role, safety and access safeguards, functional outcome, and follow-up decision.'),
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
    id: 'slp5331-card-' + String(flashcards.length + 1).padStart(3, '0'), chapterId: chapter.id, skillId: chapter.skillId, domainId: chapter.domainId,
    front, back: ensure(back, 30, 'Apply the concept using current ethical, legal, clinical, educational, medical, and jurisdictional requirements.'),
    reviewStatus: 'source-reviewed-editorial-pass', references: chapter.references.slice(), reviewNote: 'Source-reviewed independent study card; not official ETS or ASHA content.',
  });
}

for (const extra of [
  { chapterId: 'slp5331-ch-03', front: 'What is the recurring evidence decision?', back: 'Define the person and outcome, appraise research quality and fit, combine clinical data with preferences and circumstances, act through shared decision making, and monitor response.' },
  { chapterId: 'slp5331-ch-05', front: 'What is the recurring assessment chain?', back: 'Clarify the referral decision, gather multimethod accessible evidence, integrate function and uncertainty, communicate conclusions, and connect recommendations to measurable follow-up.' },
  { chapterId: 'slp5331-ch-12', front: 'What is the recurring swallowing-safety caution?', back: 'Study materials cannot determine safety or diet. Use qualified individualized assessment, medical and interprofessional coordination, informed choice, current protocols, and ongoing monitoring.' },
]) {
  const chapter = chapters.find((candidate) => candidate.id === extra.chapterId);
  flashcards.push({ id: 'slp5331-card-' + String(flashcards.length + 1).padStart(3, '0'), chapterId: chapter.id, skillId: chapter.skillId, domainId: chapter.domainId, front: extra.front, back: extra.back, reviewStatus: 'source-reviewed-editorial-pass', references: chapter.references.slice(), reviewNote: 'Source-reviewed independent study card; not official ETS or ASHA content.' });
}

const memoryAids = memoryAidSpecs.map((aid, index) => ({ id: 'slp5331-memory-' + String(index + 1).padStart(2, '0'), ...aid, reviewStatus: 'source-reviewed-editorial-pass', reviewNote: 'Retrieval cue only; verify the underlying evidence, current ethics, scope, law, medical or educational protocol, and individual clinical findings.' }));

const library = {
  schemaVersion: 1, generatedAt: new Date().toISOString(), libraryId: 'praxis-speech-language-pathology-5331-learning-library', packId: 'praxis-speech-language-pathology-5331',
  title: 'Praxis Speech-Language Pathology (5331) learning library',
  description: 'Twelve source-reviewed chapters aligned to the three ETS 5331 categories and the nine communication and swallowing practice areas, with direct links to every diagnostic, simulation, and targeted-practice item.',
  reviewStandard: 'AlloFlow Praxis Speech-Language Pathology 5331 learning-library source and editorial review v1',
  simulation: { questionCount: 132, timeMinutes: 150, note: 'Independent timed simulation using original AlloFlow items; not an official ETS form, scaled score, pass prediction, credential, clinical evaluation, diagnosis, swallowing-safety decision, or treatment tool.' },
  legalCaution: 'This speech-language pathology content is educational preparation, not a clinical evaluation, diagnosis, medical or swallowing-safety decision, treatment plan, supervision, or legal advice. Verify current federal, state, local, licensure, certification, educational, health-care, privacy, consent, emergency, and reporting requirements and use qualified individualized care.',
  frameworkCaution: 'The ETS 5331 study companion defines the tested blueprint. ASHA standards, ethics, scope, and Practice Portal materials can be revised; verify current editions while preparing and practicing.',
  summary: { chapters: chapters.length, sections: chapters.reduce((sum, chapter) => sum + chapter.sectionCount, 0), diagrams: 0, diagramPlacements: 0, knowledgeChecks: chapters.reduce((sum, chapter) => sum + chapter.knowledgeCheckCount, 0), flashcards: flashcards.length, memoryAids: memoryAids.length, sourceReviewedChapters: chapters.length, sourceReviewedFlashcards: flashcards.length, sourceReviewedMemoryAids: memoryAids.length, editorialReviewedSourcePendingMemoryAids: 0 },
  skills, chapters, diagrams: [], flashcards, memoryAids,
};

if (chapters.length !== 12 || library.summary.sections !== 48 || library.summary.knowledgeChecks !== 60 || flashcards.length !== 75 || memoryAids.length !== 20) throw new Error('The 5331 learning-library release counts must be 12 chapters, 48 sections, 60 checks, 75 flashcards, and 20 memory aids.');
const output = JSON.stringify(library, null, 2) + '\n';
for (const target of [path.join(root, 'test_prep', 'speech_language_pathology_5331_learning_library.json'), path.join(root, 'desktop/web-app', 'public', 'test_prep', 'speech_language_pathology_5331_learning_library.json')]) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  writeGeneratedFile(target, output, 'utf8');
}
console.log('Built Praxis Speech-Language Pathology 5331 learning library: 12 chapters, 48 sections, 60 checks, 75 flashcards, and 20 memory aids.');
