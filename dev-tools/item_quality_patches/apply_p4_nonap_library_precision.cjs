#!/usr/bin/env node
'use strict';

/**
 * Formal Wave-3 Moderate Non-AP Learning-Library Precision Patch Module
 * Repairs verified moderate precision issues across:
 *   - eppp_learning_library.json (+ wave 01): SE_pred notation disambiguation + 2 stale rationale openers
 *   - special_education_early_childhood_5692_learning_library.json: 2 IFSP/IEP phrasing repairs + 26-month prematurity cutoff note
 *   - parapro_learning_library.json: 12 possessive apostrophe patterns across prose/rationales/flashcards
 *   - plt_5_9_5623_learning_library.json & plt_7_12_5624_learning_library.json: age-appropriate writing checks/cards + 12th-grade IDEA transition outline
 *   - plt_early_childhood_5621_learning_library.json: restore grade 7.5 decimal-confusion distractor for PR 75
 */

const fs = require('fs');
const path = require('path');
const { writeGeneratedFile } = require('../write_generated_file.cjs');

const root = path.resolve(__dirname, '..', '..');

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(root, relPath), 'utf8'));
}
function writeJson(relPath, obj) {
  writeGeneratedFile(path.join(root, relPath), JSON.stringify(obj, null, 2) + '\n', 'utf8');
}
function replaceIdempotent(text, from, to, label) {
  if (text.includes(to)) return text;
  if (!text.includes(from)) throw new Error(`Expected substring not found for ${label}: ${from.slice(0, 90)}`);
  return text.replace(from, to);
}

let fixedCount = 0;

// 1. EPPP Learning Library + Wave 01 (SE_pred notation + 2 rationale openers)
{
  const libPath = 'test_prep/eppp_learning_library.json';
  const lib = readJson(libPath);
  const pb4 = lib.misconceptionRemediationPlaybooks[4];
  pb4.stages[1].instruction = replaceIdempotent(
    pb4.stages[1].instruction,
    'whereas SEest = SD_y·√(1 − r_xy²) forms an error band around a predicted criterion score',
    'whereas SE_pred = SD_y·√(1 − r_xy²) forms an error band around a predicted criterion score (distinct from CTT SE_est around a regressed true score)',
    'eppp-pb-4'
  );
  fixedCount += 1;

  const wavePath = 'test_prep/eppp_knowledge_check_review_wave_01.json';
  const wave = readJson(wavePath);

  const fixEpppKc = (id, from, to) => {
    const top = lib.knowledgeChecks.find((k) => k.id === id);
    const ch = lib.chapters.flatMap((c) => c.knowledgeChecks || []).find((k) => k.id === id);
    const wv = wave.items.find((k) => k.legacyId === id);
    if (!top || !ch || !wv) throw new Error('Missing EPPP KC ' + id);
    top.rationale = replaceIdempotent(top.rationale, from, to, id + ' top');
    ch.rationale = replaceIdempotent(ch.rationale, from, to, id + ' ch');
    wv.rationale = replaceIdempotent(wv.rationale, from, to, id + ' wave');
    fixedCount += 1;
  };

  fixEpppKc(
    'knowledge-check-67fbaa91b34656d8',
    "The keyed answer identifies Allport's optimal contact conditions: equal status within the situation, common goals, intergroup cooperation, and support from authorities, law, or custom.",
    "The keyed answer accurately interprets Allport's four optimal contact conditions (equal status, common goals, intergroup cooperation, and support from authorities, law, or custom) as facilitative rather than universal guarantees."
  );
  fixEpppKc(
    'knowledge-check-033e8a3e18bf1273',
    "The best answer describes Berry's integration pattern: maintaining meaningful participation in a heritage culture while also engaging with the larger receiving society.",
    "The keyed answer accurately characterizes Berry's four acculturation patterns (integration, assimilation, separation, and marginalization) as descriptive positions across two dimensions rather than fixed traits."
  );

  writeJson(libPath, lib);
  writeJson(wavePath, wave);
  console.log('Patched eppp_learning_library.json (+ wave 01): 3 items');
}

// 2. SPED Early Childhood 5692 (2 broken IFSP/IEP replacements + 26-month prematurity correction nuance)
{
  const libPath = 'test_prep/special_education_early_childhood_5692_learning_library.json';
  const lib = readJson(libPath);
  const qr3 = lib.quickReference.find((r) => r.id === 'ecse5692-reference-04');
  qr3.cautions[1] = replaceIdempotent(
    qr3.cautions[1],
    'to translate legal Part C IFSP outcomes and Part B IEP goals meetings.',
    'to interpret at legal Part C IFSP or Part B IEP meetings.',
    'ecse5692-qr3'
  );
  fixedCount += 1;

  const ws4 = lib.constructedResponseWorkshops.find((w) => w.id === 'ecse5692-workshop-05');
  ws4.sampleOutline[2] = replaceIdempotent(
    ws4.sampleOutline[2],
    "Translate Liam's current Part C IFSP outcomes and Part B IEP goals around",
    "Translate Liam's current Part C IFSP outcomes into Part B IEP goals around",
    'ecse5692-ws4'
  );
  fixedCount += 1;

  const expCase = lib.chapters[0].sections[3].expandableCase;
  expCase.diagnosis = replaceIdempotent(
    expCase.diagnosis,
    'Use corrected age, measure total conceptual vocabulary across both languages',
    'Account for prematurity history alongside the 24-month clinical age-correction cutoff, measure total conceptual vocabulary across both languages',
    'ecse5692-ch0s3'
  );
  fixedCount += 1;
  writeJson(libPath, lib);
  console.log('Patched special_education_early_childhood_5692_learning_library.json: 3 items');
}

// 3. ParaPro 1755 (possessive apostrophe precision across prose/rationales/flashcards)
{
  const libPath = 'test_prep/parapro_learning_library.json';
  let raw = fs.readFileSync(path.join(root, libPath), 'utf8');
  const pairs = [
    [/\bthe authors central point\b/g, "the author's central point"],
    [/\ba readers new judgment\b/g, "a reader's new judgment"],
    [/\bthe learners active role\b/g, "the learner's active role"],
    [/\bthe learners reasoning\b/g, "the learner's reasoning"],
    [/\bthe passage central meaning\b/g, "the passage's central meaning"],
    [/\bA numbers distance from zero\b/g, "A number's distance from zero"],
    [/\bthe students strategy\b/g, "the student's strategy"],
    [/\bthe adults preferences for the students meaning\b/g, "the adult's preferences for the student's meaning"],
    [/\bthe survivor dog\b/g, "the survivor's dog"],
    [/\bthe teacher plan\b/g, "the teacher's plan"],
    [/\bGambler Fallacy\b/g, "Gambler's Fallacy"],
    [/\bthe student paper\b/g, "the student's paper"],
  ];
  let paraChanges = 0;
  for (const [rx, rep] of pairs) {
    const next = raw.replace(rx, () => { paraChanges += 1; return rep; });
    raw = next;
  }
  JSON.parse(raw); // validate JSON syntax before writing
  writeGeneratedFile(path.join(root, libPath), raw, 'utf8');
  fixedCount += paraChanges;
  console.log(`Patched parapro_learning_library.json: ${paraChanges} possessive apostrophe fixes`);
}

// 4. PLT 5-9 5623 (age-appropriate middle-grades writing fluency check & flashcard)
{
  const libPath = 'test_prep/plt_5_9_5623_learning_library.json';
  const lib = readJson(libPath);
  const kc = lib.chapters[1].knowledgeChecks.find((k) => k.id === 'plt5623-ch-02-check-03');
  kc.prompt = 'Two seventh graders of the same age display different handwriting legibility and written-output fluency during timed note-taking. What is the most appropriate teacher conclusion?';
  kc.choices[2] = 'Reduce conceptual writing expectations permanently until the student’s handwriting fluency matches faster peers.';
  const fc = lib.flashcards.find((c) => c.id === 'plt5623-card-009');
  if (fc) fc.front = kc.prompt;
  fixedCount += 2;
  writeJson(libPath, lib);
  console.log('Patched plt_5_9_5623_learning_library.json: 2 items');
}

// 5. PLT 7-12 5624 (age-appropriate secondary writing fluency check/card + 12th-grade IDEA transition outline)
{
  const libPath = 'test_prep/plt_7_12_5624_learning_library.json';
  const lib = readJson(libPath);
  const kc = lib.chapters[1].knowledgeChecks.find((k) => k.id === 'plt5624-ch-02-check-03');
  kc.prompt = 'Two tenth graders of the same age display different graphomotor stamina and written-output fluency during timed essays. What is the most appropriate teacher conclusion?';
  kc.choices[2] = 'Reduce conceptual writing expectations permanently until the student’s handwriting fluency matches faster peers.';
  const fc = lib.flashcards.find((c) => c.id === 'plt5624-card-009');
  if (fc) fc.front = kc.prompt;
  fixedCount += 2;

  const ws7 = lib.constructedResponseWorkshops[6];
  ws7.sampleOutline[0] = replaceIdempotent(
    ws7.sampleOutline[0],
    'to clarify the conflict, goals, home evidence, and agreed classroom and homework supports.',
    'with the student included to align classroom supports, homework accommodations, and IDEA postsecondary transition goals.',
    'plt5624-ws7-0'
  );
  ws7.sampleOutline[2] = replaceIdempotent(
    ws7.sampleOutline[2],
    'review independence, accuracy, transfer, and implementation on a set date.',
    'review self-advocacy, independence toward postsecondary transition goals, accuracy, and implementation on a set date.',
    'plt5624-ws7-2'
  );
  fixedCount += 1;
  writeJson(libPath, lib);
  console.log('Patched plt_7_12_5624_learning_library.json: 3 items');
}

// 6. PLT Early Childhood 5621 (restore decimal-confusion grade 7.5 tie for PR 75)
{
  const libPath = 'test_prep/plt_early_childhood_5621_learning_library.json';
  const lib = readJson(libPath);
  const kc = lib.chapters[8].knowledgeChecks.find((k) => k.id === 'plt5621-ch-09-check-03');
  kc.choices[3] = replaceIdempotent(kc.choices[3], 'performing at grade 2.5 across', 'performing at grade 7.5 across', 'plt5621-ch9-kc3');
  fixedCount += 1;
  writeJson(libPath, lib);
  console.log('Patched plt_early_childhood_5621_learning_library.json: 1 item');
}

console.log(`Total Wave-3 moderate non-AP learning-library precision fixes applied: ${fixedCount}`);
