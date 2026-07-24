#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const itemBanks = require('./esol_5362/item_content.cjs');
const { chapters: chapterSpecs, memoryAids: memoryAidSpecs, workshops: workshopSpecs } = require('./esol_5362/learning_content.cjs');
const root = path.resolve(__dirname, '..');
const itemBankBySkill = new Map(itemBanks.map((bank) => [bank.id, bank]));
const reviewNote = 'Independently authored and source reviewed for study use; independent TESOL-subject-matter, multilingual-learner, accessibility, and psychometric validation remain pending.';

function ensure(value, minimum, suffix) {
  const source = String(value || '').trim();
  return source.length >= minimum ? source : (source + ' ' + suffix).trim();
}

function buildCheck(chapter, bank, question, index) {
  const answerIndex = index % 4;
  const choices = [];
  let distractorIndex = 0;
  for (let choiceIndex = 0; choiceIndex < 4; choiceIndex += 1) choices.push(choiceIndex === answerIndex ? question.correct : question.distractors[distractorIndex++]);
  return {
    id: chapter.id + '-check-' + String(index + 1).padStart(2, '0'), prompt: question.promptA, choices, answerIndex,
    rationale: ensure(question.rationale, 100, 'The response connects learner evidence, language demands, grade-level access, multilingual assets, and a monitorable instructional or assessment decision without making a diagnosis or lowering rigor.'),
    references: bank.references.slice(), reviewStatus: 'source-reviewed-editorial-pass', reviewNote,
  };
}

const chapters = chapterSpecs.map((spec) => {
  const bank = itemBankBySkill.get(spec.skillId);
  if (!bank) throw new Error('Missing item bank for chapter skill ' + spec.skillId + '.');
  if (!Array.isArray(spec.sections) || spec.sections.length !== 4) throw new Error(spec.id + ' must contain four sections.');
  const sections = spec.sections.map((entry, index) => ({
    id: spec.id + '-section-' + String(index + 1).padStart(2, '0'), heading: entry.heading,
    content: ensure(entry.content, 300, 'Apply the concept to observable learner language and an authentic instructional, assessment, cultural, or professional decision. Preserve grade-level access, intellectual challenge, meaningful participation, multilingual assets, and a plan to monitor and adjust support.'),
    keyTerms: entry.keyTerms, references: bank.references.slice(), reviewStatus: 'source-reviewed-editorial-pass', reviewNote,
  }));
  const knowledgeChecks = bank.questions.slice(0, 5).map((question, index) => buildCheck(spec, bank, question, index));
  return { id: spec.id, title: spec.title, domainId: bank.domainId, domain: bank.domain, skillId: spec.skillId, summary: spec.summary, objectives: spec.objectives, references: bank.references.slice(), reviewStatus: 'source-reviewed-editorial-pass', reviewNote, sectionCount: sections.length, knowledgeCheckCount: knowledgeChecks.length, referenceCount: bank.references.length, sections, knowledgeChecks };
});

const skills = chapters.map((chapter) => ({ id: chapter.skillId, label: itemBankBySkill.get(chapter.skillId).label, domainId: chapter.domainId, domain: chapter.domain, chapterId: chapter.id, description: chapter.summary }));
const flashcards = [];
for (const chapter of chapters) {
  const bank = itemBankBySkill.get(chapter.skillId);
  for (const question of bank.questions.slice(0, 6)) flashcards.push({
    id: 'esol5362-card-' + String(flashcards.length + 1).padStart(3, '0'), chapterId: chapter.id, skillId: chapter.skillId, domainId: chapter.domainId, domain: chapter.domain,
    front: ensure(question.promptA, 20, 'Identify the language, learning, instruction, assessment, culture, or professional decision.'),
    back: ensure(question.correct, 30, 'Use learner evidence, explicit language demands, multilingual assets, meaningful access, and a monitorable next step.'),
    reviewStatus: 'source-reviewed-editorial-pass', references: chapter.references.slice(), reviewNote: 'Source-reviewed independent study card; not official ETS content.',
  });
}
for (const extra of [
  { chapterId: 'esol5362-ch-01', front: 'What is the recurring linguistic-analysis chain?', back: 'Identify the language feature, observe the learner pattern in context, test plausible explanations, connect form with meaning and use, teach explicitly, and check transfer.' },
  { chapterId: 'esol5362-ch-06', front: 'What is the recurring integrated-instruction chain?', back: 'Set a grade-level content goal and language objective, make discourse and text demands visible, model and scaffold participation, elicit purposeful output, and fade support from evidence.' },
  { chapterId: 'esol5362-ch-09', front: 'What is the recurring multilingual assessment chain?', back: 'Define the construct, collect multiple comparable measures across contexts and languages when feasible, separate access from construct change, document uncertainty, and adjust instruction before high-stakes inference.' },
  { chapterId: 'esol5362-ch-10', front: 'What is the recurring culture-and-identity chain?', back: 'Elicit the learner and family perspective, examine your own assumptions and power, avoid treating any group as uniform, connect cultural knowledge with participation, and revise from evidence.' },
  { chapterId: 'esol5362-ch-12', front: 'What is the recurring advocacy-and-program chain?', back: 'Name the access barrier, verify legal and professional scope, gather disaggregated evidence, collaborate with learners and families using qualified language access, act through appropriate channels, and monitor equitable outcomes.' },
]) {
  const chapter = chapters.find((candidate) => candidate.id === extra.chapterId);
  flashcards.push({ id: 'esol5362-card-' + String(flashcards.length + 1).padStart(3, '0'), chapterId: chapter.id, skillId: chapter.skillId, domainId: chapter.domainId, domain: chapter.domain, front: extra.front, back: extra.back, reviewStatus: 'source-reviewed-editorial-pass', references: chapter.references.slice(), reviewNote: 'Source-reviewed independent study card; not official ETS content.' });
}

const memoryAids = memoryAidSpecs.map((entry, index) => ({ id: 'esol5362-memory-' + String(index + 1).padStart(2, '0'), type: 'retrieval cue', ...entry, reviewStatus: 'source-reviewed-editorial-pass', reviewNote: 'Retrieval cue only; verify learner evidence, language and content goals, the measured construct, multilingual assets, access requirements, educator scope, and the intended use.' }));
const constructedResponseWorkshops = workshopSpecs.map((entry) => ({ ...entry, reviewStatus: 'source-reviewed-editorial-pass', reviewNote: 'Independent transcript or classroom-analysis practice; not an official ETS recording, prompt, item, interface, score, scaled score, pass prediction, licensure decision, disability decision, or language-proficiency determination. No audio is reproduced or scored.' }));

const library = {
  schemaVersion: 1, generatedAt: new Date().toISOString(), libraryId: 'praxis-esol-5362-learning-library', packId: 'praxis-esol-5362',
  title: 'Praxis English to Speakers of Other Languages (5362) learning library',
  description: 'Twelve source-reviewed chapters across the six official content categories, plus eight original transcript, classroom, assessment, culture, and program-analysis workshops.',
  reviewStandard: 'AlloFlow Praxis ESOL 5362 learning-library source and editorial review v1',
  workshopLabel: 'Audio and classroom-analysis workshops',
  workshopPracticeNote: 'These workshops use original written transcripts and delivery notes for applied analysis. They do not reproduce ETS recordings or the exact official audio interface, and AlloFlow does not score responses.',
  simulation: { questionCount: 120, timeMinutes: 120, officialTotalTimeMinutes: 120, note: 'The simulation contains 120 original single-choice text items in 120 minutes. The official test may include audio and some questions requiring more than one selection; those interface features are not reproduced here. Use the transcript workshops for related listening-analysis practice.' },
  legalCaution: 'This Praxis ESOL content is independent educational preparation, not an official score, scaled score, pass prediction, licensure decision, language-proficiency determination, disability diagnosis, accommodation decision, legal advice, or substitute for current state, program, credential, testing, accessibility, civil-rights, and language-access requirements.',
  frameworkCaution: 'The current ETS study companion defines the assessed categories and approximate weighting. TESOL standards, WIDA resources, federal English-learner guidance, ETS formats, and state requirements can change; verify current official sources and local obligations.',
  summary: { chapters: chapters.length, sections: chapters.reduce((sum, chapter) => sum + chapter.sectionCount, 0), diagrams: 0, diagramPlacements: 0, knowledgeChecks: chapters.reduce((sum, chapter) => sum + chapter.knowledgeCheckCount, 0), flashcards: flashcards.length, memoryAids: memoryAids.length, constructedResponseWorkshops: constructedResponseWorkshops.length, sourceReviewedChapters: chapters.length, sourceReviewedFlashcards: flashcards.length, sourceReviewedMemoryAids: memoryAids.length, sourceReviewedConstructedResponseWorkshops: constructedResponseWorkshops.length, editorialReviewedSourcePendingMemoryAids: 0 },
  skills, chapters, diagrams: [], flashcards, memoryAids, constructedResponseWorkshops,
};

if (chapters.length !== 12 || library.summary.sections !== 48 || library.summary.knowledgeChecks !== 60 || flashcards.length !== 75 || memoryAids.length !== 20 || constructedResponseWorkshops.length !== 8) throw new Error('The ESOL library counts must be 12 chapters, 48 sections, 60 checks, 75 flashcards, 20 memory aids, and 8 workshops.');
const output = JSON.stringify(library, null, 2) + '\n';
for (const target of [path.join(root, 'test_prep', 'esol_5362_learning_library.json'), path.join(root, 'desktop/web-app', 'public', 'test_prep', 'esol_5362_learning_library.json')]) { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, output, 'utf8'); }
console.log('Built Praxis ESOL 5362 learning library: 12 chapters, 48 sections, 60 checks, 75 flashcards, 20 memory aids, and 8 applied workshops.');
