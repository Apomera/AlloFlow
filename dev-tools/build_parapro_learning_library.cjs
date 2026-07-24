#!/usr/bin/env node
'use strict';

const fs = require('fs');
const { writeGeneratedFile } = require('./write_generated_file.cjs');
const path = require('path');
const reading = require('./parapro_learning/reading.cjs');
const mathematics = require('./parapro_learning/mathematics.cjs');
const writing = require('./parapro_learning/writing.cjs');
const memoryAids = require('./parapro_learning/memory_aids.cjs');

const root = path.resolve(__dirname, '..');
const chaptersSource = [...reading, ...mathematics, ...writing];
const ETS = 'https://www.ets.org/pdfs/parapro/1755.pdf';
const SUPPLEMENTAL_SOURCES = [
  {
    "url": "https://ies.ed.gov/ncee/wwc/PracticeGuide/14",
    "title": "Improving Reading Comprehension in Kindergarten Through 3rd Grade",
    "organization": "What Works Clearinghouse (WWC), Institute of Education Sciences (IES), U.S. Department of Education",
    "summary": "Five evidence-rated recommendations address comprehension strategies, text structure, high-quality discussion, purposeful text selection, and an engaging reading context.",
    "credibility": "An IES/WWC government practice guide developed through expert-panel analysis and systematic evidence review; retain its recommendation-specific evidence ratings when applying it."
  },
  {
    "url": "https://ies.ed.gov/ncee/wwc/PracticeGuide/29",
    "title": "Providing Reading Interventions for Students in Grades 4–9",
    "organization": "What Works Clearinghouse (WWC), Institute of Education Sciences (IES), U.S. Department of Education",
    "summary": "Evidence-based intervention recommendations cover decoding, fluency, comprehension-building practices, and supported work with challenging text.",
    "credibility": "An IES/WWC government practice guide developed through expert-panel analysis and systematic evidence review; retain its recommendation-specific evidence ratings when applying it."
  },
  {
    "url": "https://data.census.gov/",
    "title": "Explore Census Data",
    "organization": "U.S. Census Bureau, U.S. Department of Commerce",
    "summary": "The Census Bureau’s centralized data platform supports searches across demographic and economic tables, profiles, maps, and public-use data.",
    "credibility": "A primary federal statistical source; verify the dataset, year, table, geography, estimates, and margins of error when applicable."
  }
];
let checkCursor = 0;

function makeCheck(chapter, seed, index) {
  const answerIndex = checkCursor % 4;
  checkCursor += 1;
  const choices = [];
  let distractorIndex = 0;
  for (let choiceIndex = 0; choiceIndex < 4; choiceIndex += 1) {
    if (choiceIndex === answerIndex) choices.push(seed.correct);
    else { choices.push(seed.distractors[distractorIndex]); distractorIndex += 1; }
  }
  return {
    id: chapter.id + '-check-' + (index + 1),
    skillId: chapter.skillId,
    prompt: seed.prompt,
    choices,
    answerIndex,
    rationale: seed.rationale,
    reviewStatus: 'source-reviewed-editorial-pass',
    references: chapter.references,
  };
}

const chapters = chaptersSource.map((source, chapterIndex) => {
  if (!source || !source.id || !source.skillId || !Array.isArray(source.sections) || source.sections.length !== 4 || !Array.isArray(source.checks) || source.checks.length !== 5 || !Array.isArray(source.flashcards) || source.flashcards.length !== 6) {
    throw new Error('Invalid ParaPro chapter source at index ' + chapterIndex + '.');
  }
  const references = Array.from(new Set([ETS, ...(source.references || [])]));
  const chapter = {
    id: source.id,
    title: source.title,
    domainId: source.domainId,
    domain: source.domain,
    skillId: source.skillId,
    summary: source.summary,
    objectives: source.objectives,
    sectionCount: source.sections.length,
    diagramCount: 0,
    knowledgeCheckCount: source.checks.length,
    referenceCount: references.length,
    reviewStatus: 'source-reviewed-editorial-pass',
    reviewNote: 'Independently authored for AlloFlow and reviewed against the cited ParaPro blueprint and instructional references; independent educator validation remains pending.',
    reviewReferences: references,
    sections: source.sections.map((section, sectionIndex) => ({
      id: source.id + '-section-' + (sectionIndex + 1),
      heading: section.heading,
      preview: section.content.slice(0, 280),
      content: section.content,
      keyTerms: section.keyTerms || [],
      hasDiagram: false,
      diagramDescription: '',
      hasKnowledgeCheck: sectionIndex < source.checks.length,
      hasExpandableCase: false,
      reviewStatus: 'source-reviewed-editorial-pass',
    })),
    references,
  };
  chapter.knowledgeChecks = source.checks.map((seed, index) => makeCheck(chapter, seed, index));
  return chapter;
});

const flashcards = chaptersSource.flatMap((source) => source.flashcards.map(([front, back], index) => ({
  id: 'parapro-card-' + source.skillId + '-' + String(index + 1).padStart(2, '0'),
  skillId: source.skillId,
  chapterId: source.id,
  domainId: source.domainId,
  domain: source.domain,
  front,
  back,
  reviewStatus: 'source-reviewed-editorial-pass',
  references: Array.from(new Set([ETS, ...(source.references || [])])),
  reviewNote: 'Source-reviewed independent study card; not official ETS content.',
})));

flashcards.push(
  { id: 'parapro-card-general-01', skillId: 'reading-main-evidence', chapterId: 'parapro-ch-01', domainId: 'reading', domain: 'Reading', front: 'What makes a ParaPro practice result diagnostic rather than official?', back: 'It describes performance on independent practice items; it is not an ETS scaled score, pass prediction, or credential decision.', reviewStatus: 'source-reviewed-editorial-pass', references: [ETS], reviewNote: 'Source-reviewed independent study card; not official ETS content.' },
  { id: 'parapro-card-general-02', skillId: 'mathematics-number-operations', chapterId: 'parapro-ch-05', domainId: 'mathematics', domain: 'Mathematics', front: 'What should you do before accepting a numerical answer?', back: 'Estimate or use an inverse operation to check whether the magnitude and units are reasonable.', reviewStatus: 'source-reviewed-editorial-pass', references: [ETS, 'https://openstax.org/details/books/prealgebra-2e/'], reviewNote: 'Source-reviewed independent study card; not official ETS content.' },
  { id: 'parapro-card-general-03', skillId: 'writing-revision-clarity', chapterId: 'parapro-ch-10', domainId: 'writing', domain: 'Writing', front: 'How are revising and editing different?', back: 'Revising improves ideas, organization, evidence, and clarity; editing corrects sentence-level grammar, usage, mechanics, and format.', reviewStatus: 'source-reviewed-editorial-pass', references: [ETS, 'https://openstax.org/books/writing-guide/pages/16-5-writing-process-thinking-critically-about-text'], reviewNote: 'Source-reviewed independent study card; not official ETS content.' },
);

const skills = chapters.map((chapter) => ({
  id: chapter.skillId,
  label: chapter.title,
  domainId: chapter.domainId,
  domain: chapter.domain,
  chapterId: chapter.id,
  description: chapter.summary,
}));

const aids = memoryAids.map((aid, index) => ({
  id: 'parapro-memory-' + String(index + 1).padStart(2, '0'),
  ...aid,
  reviewStatus: 'source-reviewed-editorial-pass',
  references: aid.references || [ETS],
  reviewNote: 'A retrieval cue, not a replacement for understanding or current official guidance.',
}));

const library = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  libraryId: 'parapro-1755-learning-library',
  packId: 'parapro-1755-practice-1',
  title: 'ParaPro learning library',
  description: 'Twelve concise, independently authored chapters connected to the Reading, Mathematics, and Writing skills practiced in the ParaPro diagnostic bank.',
  reviewStandard: 'AlloFlow ParaPro learning-library source and editorial review v1',
  simulation: { questionCount: 90, timeMinutes: 150, note: 'Independent timed simulation using original AlloFlow items; not an official ETS form or score.' },
  supplementalSources: SUPPLEMENTAL_SOURCES,
  summary: {
    chapters: chapters.length,
    sections: chapters.reduce((sum, chapter) => sum + chapter.sectionCount, 0),
    diagrams: 0,
    diagramPlacements: 0,
    knowledgeChecks: chapters.reduce((sum, chapter) => sum + chapter.knowledgeCheckCount, 0),
    flashcards: flashcards.length,
    memoryAids: aids.length,
    sourceReviewedChapters: chapters.length,
    sourceReviewedFlashcards: flashcards.length,
    sourceReviewedMemoryAids: aids.length,
    editorialReviewedSourcePendingMemoryAids: 0,
  },
  skills,
  chapters,
  diagrams: [],
  flashcards,
  memoryAids: aids,
};

if (chapters.length !== 12 || flashcards.length !== 75 || aids.length !== 20 || library.summary.knowledgeChecks !== 60) throw new Error('ParaPro learning-library release counts are invalid.');

const output = JSON.stringify(library, null, 2) + '\n';
for (const target of [
  path.join(root, 'test_prep', 'parapro_learning_library.json'),
  path.join(root, 'desktop/web-app', 'public', 'test_prep', 'parapro_learning_library.json'),
]) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  writeGeneratedFile(target, output, 'utf8');
}
console.log('Built ParaPro learning library: 12 chapters, 60 checks, 75 flashcards, and 20 memory aids.');
