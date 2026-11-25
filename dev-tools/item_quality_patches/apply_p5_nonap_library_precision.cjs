#!/usr/bin/env node
'use strict';

/**
 * Wave-4 moderate non-AP learning-library precision pass:
 * - teaching_reading_5205 (4 checks + 4 matching flashcards): restore missing vignettes
 *   and fix screening sensitivity/specificity stem alignment.
 * - reading_specialist_5302 (4 checks): mirror matching vignettes & screening stem alignment.
 * - early_childhood_5025 (2 checks + 2 matching flashcards): fix dangling "They" pronoun
 *   in orthographic mapping and disambiguate "2a squared - 3b" -> "2a² - 3b".
 * - special_education_early_childhood_5692 (4 checks + 4 matching flashcards): replace
 *   grade-4/middle-school algebra & 120-WCPM clones with developmentally appropriate
 *   birth-through-age-8 ECSE scenarios and clarify age-respectful materials for age 7.
 * - plt_early_childhood_5621 & plt_k6_5622 (2 checks + 2 cards): clarify federal Equal
 *   Access Act (20 U.S.C. § 4071, public secondary schools) vs. First Amendment
 *   viewpoint-neutrality principles across grade levels.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const TEST_PREP_DIR = path.join(ROOT, 'test_prep');

function loadLib(filename) {
  const fullPath = path.join(TEST_PREP_DIR, filename);
  return { fullPath, data: JSON.parse(fs.readFileSync(fullPath, 'utf8')) };
}

function saveLib(fullPath, data) {
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function findCheck(lib, id) {
  for (const ch of lib.chapters || []) {
    for (const chk of ch.knowledgeChecks || []) {
      if (chk.id === id) return chk;
    }
  }
  throw new Error(`Check not found: ${id}`);
}

function findCard(lib, id) {
  const card = (lib.flashcards || []).find((c) => c.id === id);
  if (!card) throw new Error(`Card not found: ${id}`);
  return card;
}

const summary = [];

// 1. teaching_reading_5205_learning_library.json
{
  const file = 'teaching_reading_5205_learning_library.json';
  const { fullPath, data } = loadLib(file);
  const p01 = 'A first grader blends spoken phonemes into words accurately but struggles to break three- and four-phoneme words apart during decoding and spelling checks. Which instructional next step best addresses this pattern?';
  const p04 = 'After administering a developmental spelling inventory, an elementary teacher sees missed words across several early-grade skills. What is the most informative way to analyze those student responses?';
  const p05 = 'A third grader meets the fall words-correct-per-minute benchmark on a timed passage, yet moves through the text in a monotone, ignores punctuation, and struggles to retell key events. Which interpretation is best?';
  const p12 = 'When an elementary literacy team evaluates a universal screening tool, what do sensitivity and specificity measure?';

  findCheck(data, 'tr5205-ch-04-check-01').prompt = p01;
  findCheck(data, 'tr5205-ch-04-check-04').prompt = p04;
  findCheck(data, 'tr5205-ch-04-check-05').prompt = p05;
  findCheck(data, 'tr5205-ch-12-check-05').prompt = p12;

  findCard(data, 'tr5205-card-019').front = p01;
  findCard(data, 'tr5205-card-022').front = p04;
  findCard(data, 'tr5205-card-023').front = p05;
  findCard(data, 'tr5205-card-069').front = p12;

  saveLib(fullPath, data);
  summary.push(`${file}: 8 updates (4 checks, 4 cards)`);
}

// 2. reading_specialist_5302_learning_library.json
{
  const file = 'reading_specialist_5302_learning_library.json';
  const { fullPath, data } = loadLib(file);

  findCheck(data, 'read5302-ch-07-check-05').prompt =
    'When a reading specialist evaluates a universal screening tool, what do sensitivity and specificity measure?';
  findCheck(data, 'read5302-ch-08-check-01').prompt =
    'A first grader blends spoken phonemes into words accurately but struggles to break three- and four-phoneme words apart during decoding and spelling checks. Which instructional next step best addresses this pattern?';
  findCheck(data, 'read5302-ch-08-check-04').prompt =
    'After administering a developmental spelling inventory, a reading specialist sees missed words across several early-grade skills. What is the most informative way to analyze those student responses?';
  findCheck(data, 'read5302-ch-08-check-05').prompt =
    'A third grader meets the fall words-correct-per-minute benchmark on a timed passage, yet moves through the text in a monotone, ignores punctuation, and struggles to retell key events. Which interpretation is best?';

  saveLib(fullPath, data);
  summary.push(`${file}: 4 updates (4 checks)`);
}

// 3. early_childhood_5025_learning_library.json
{
  const file = 'early_childhood_5025_learning_library.json';
  const { fullPath, data } = loadLib(file);

  const c03 = findCheck(data, 'ec5025-ch-03-check-2');
  c03.choices = [
    'Readers memorize the word’s recurring physical position on a familiar classroom chart or storybook page.',
    'Readers predict the word repeatedly from surrounding illustrations and sentence context without inspecting letters.',
    'Readers store the outer visual silhouette of the entire printed word as an unanalyzed photographic picture.',
    'Readers bond a word’s phonemes, graphemes, and meaning in memory through accurate decoding and retrieval.',
  ];
  findCard(data, 'ec5025-card-014').back =
    'Readers bond a word’s phonemes, graphemes, and meaning in memory through accurate decoding and retrieval.';

  const exprPrompt =
    'Without using a calculator, solve or interpret this early-childhood content-knowledge problem: Evaluate 2a² - 3b when a = 4 and b = 5.';
  findCheck(data, 'ec5025-ch-06-check-1').prompt = exprPrompt;
  findCard(data, 'ec5025-card-031').front = exprPrompt;

  saveLib(fullPath, data);
  summary.push(`${file}: 4 updates (2 checks, 2 cards)`);
}

// 4. special_education_early_childhood_5692_learning_library.json
{
  const file = 'special_education_early_childhood_5692_learning_library.json';
  const { fullPath, data } = loadLib(file);

  const p01 =
    'A seven-year-old child with a disability is embarrassed when an adult uses infant or toddler materials for a functional routine. What principle should guide revision?';
  findCheck(data, 'se5692-ch-01-check-05').prompt = p01;
  findCard(data, 'se5692-card-005').front = p01;

  const c04 = findCheck(data, 'se5692-ch-04-check-02');
  const measurableGoal =
    'Given a 6-step picture sequence during morning arrival, the child will complete 5 of 6 arrival steps independently on four of five school days.';
  c04.choices = [
    measurableGoal,
    'During daily classroom transition routines, the child will sustain consistent effort while following teacher directions.',
    'Across independent classroom center blocks, the child will develop greater confidence and enjoyment during group routines.',
    'With continued early childhood special education support, the child will demonstrate stronger morning independence by spring.',
  ];
  findCard(data, 'se5692-card-020').back = measurableGoal;

  const p05 =
    'A young child completes a four-step hand-washing routine accurately using a picture-sequence strip. What should happen next?';
  const c05 = findCheck(data, 'se5692-ch-05-check-03');
  c05.prompt = p05;
  c05.choices[1] =
    'Keep the full picture-sequence strip in place indefinitely so the young child never experiences reduced support.';
  findCard(data, 'se5692-card-027').front = p05;

  const p08 =
    'An expressive picture-naming test is used to decide whether a preschooler has mastered one-to-one counting and cardinality. What is the primary concern?';
  const c08 = findCheck(data, 'se5692-ch-08-check-01');
  c08.prompt = p08;
  c08.choices[0] =
    'Reliability, because numerical test scores fluctuate whenever brief picture-naming tasks are short.';
  findCard(data, 'se5692-card-043').front = p08;

  saveLib(fullPath, data);
  summary.push(`${file}: 8 updates (4 checks, 4 cards)`);
}

// 5. plt_early_childhood_5621 & plt_k6_5622
for (const [file, checkId, cardId] of [
  ['plt_early_childhood_5621_learning_library.json', 'plt5621-ch-12-check-05', 'plt5621-card-071'],
  ['plt_k6_5622_learning_library.json', 'plt5622-ch-12-check-05', 'plt5622-card-071'],
]) {
  const { fullPath, data } = loadLib(file);
  findCheck(data, checkId).rationale =
    'School speech and forum questions are fact specific; educators use current policy and qualified authority while avoiding viewpoint discrimination and protecting lawful safety boundaries. Note that the federal Equal Access Act (20 U.S.C. § 4071) specifically governs public secondary schools, whereas First Amendment viewpoint-neutrality principles govern public school facilities opened to outside or noncurricular groups at any grade level.';
  findCard(data, cardId).back =
    'Apply current viewpoint-neutral school policy, protect safety and nondiscrimination, and consult leadership (First Amendment viewpoint-neutrality principles apply across grade levels; the federal Equal Access Act specifically covers public secondary schools).';
  saveLib(fullPath, data);
  summary.push(`${file}: 2 updates (1 check, 1 card)`);
}

console.log('Wave-4 non-AP learning-library precision pass complete:');
for (const line of summary) console.log(' -', line);
