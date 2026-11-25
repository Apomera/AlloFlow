#!/usr/bin/env node
'use strict';

/**
 * Formal Priority-1 Non-AP Learning-Library Re-Review Patch Module
 * Repairs 15 directly-editable critical defects across 10 non-AP learning libraries
 * (plus adds the explicit Standard 10.07/10.08 distinction in eppp-reference-08
 * while preserving the immutable eppp_migration_source_archive section contract).
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
function assertReplace(text, from, to, label) {
  if (text.includes(to)) return text;
  if (!text.includes(from)) throw new Error(`Expected substring not found for ${label}: ${from.slice(0, 80)}`);
  return text.replace(from, to);
}

let fixedCount = 0;

// 1. EPPP Learning Library + Wave 01 Review Artifact (eppp-crit-01 & eppp-crit-03 + 10.07 clarification)
{
  const libPath = 'test_prep/eppp_learning_library.json';
  const lib = readJson(libPath);
  const newChoices = [
    'Mesolimbic pathway; tardive dyskinesia',
    'Mesocortical pathway; galactorrhea',
    'Nigrostriatal pathway; akathisia',
    'Tuberoinfundibular pathway; acute dystonia',
  ];
  const chKc = lib.chapters[20].knowledgeChecks.find((k) => k.id === 'knowledge-check-c14f59ac2954d022');
  const topKc = lib.knowledgeChecks.find((k) => k.id === 'knowledge-check-c14f59ac2954d022');
  if (!chKc || !topKc) throw new Error('Missing knowledge-check-c14f59ac2954d022 in EPPP library');
  chKc.choices = newChoices.slice();
  topKc.choices = newChoices.slice();
  fixedCount += 1;

  const wavePath = 'test_prep/eppp_knowledge_check_review_wave_01.json';
  const wave = readJson(wavePath);
  const waveItem = wave.items.find((k) => k.legacyId === 'knowledge-check-c14f59ac2954d022');
  if (!waveItem) throw new Error('Missing knowledge-check-c14f59ac2954d022 in wave 01');
  waveItem.choices = newChoices.slice();
  writeJson(wavePath, wave);

  const qr = lib.quickReference.find((r) => r.id === 'eppp-reference-08');
  if (!qr) throw new Error('Missing eppp-reference-08');
  qr.formulas[2] = assertReplace(
    qr.formulas[2],
    'Standards 10.05/10.07/10.08 strictly prohibit sexual intimacies with current clients, their close relatives, and former clients for at least 2 years (and after 2 years only in the most unusual circumstances, with burden of proof on the psychologist).',
    'Standards 10.05/10.06/10.08 strictly prohibit sexual intimacies with current clients, their close relatives/significant others, and former clients for at least 2 years (and after 2 years only in the most unusual circumstances, with burden of proof on the psychologist), while Standard 10.07 unconditionally prohibits accepting former sexual partners as therapy clients with no 2-year exception.',
    'eppp-crit-03'
  );
  fixedCount += 1;
  writeJson(libPath, lib);
  console.log('Patched eppp_learning_library.json (+ wave 01): 2 critical items');
}

// 2. Audiology 5343 (aud5343-crit-01: WDRC mapping direction)
{
  const libPath = 'test_prep/audiology_5343_learning_library.json';
  const lib = readJson(libPath);
  const sec = lib.chapters[8].sections[2];
  sec.content = assertReplace(
    sec.content,
    'maps a reduced input range into the listener’s usable output range',
    'maps a broad input range into the listener’s reduced usable output range',
    'aud5343-crit-01'
  );
  if (typeof sec.preview === 'string' && sec.preview.includes('maps a reduced input range')) {
    sec.preview = sec.preview.replace(
      'maps a reduced input range into the listener’s usable output range',
      'maps a broad input range into the listener’s reduced usable output range'
    );
  }
  fixedCount += 1;
  writeJson(libPath, lib);
  console.log('Patched audiology_5343_learning_library.json: 1 critical item');
}

// 3. SPED Early Childhood 5692 (5692-CRIT-01: IDEA Part B Section 619 age scope 3-5, not 3-8)
{
  const libPath = 'test_prep/special_education_early_childhood_5692_learning_library.json';
  const lib = readJson(libPath);
  const qr = lib.quickReference.find((r) => r.id === 'ecse5692-reference-02');
  if (!qr) throw new Error('Missing ecse5692-reference-02');
  qr.checklist[0] = assertReplace(
    qr.checklist[0],
    'ages 3 through 8 under IDEA Part B Section 619',
    'ages 3 through 5 under IDEA Part B Section 619 (preschool) and ages 6 through 8 under IDEA Part B Section 611 (school-age)',
    '5692-CRIT-01'
  );
  fixedCount += 1;
  writeJson(libPath, lib);
  console.log('Patched special_education_early_childhood_5692_learning_library.json: 1 critical item');
}

// 4. Teaching Reading 5205 (5205-CRIT-01 & 5205-CRIT-02: inverted validity KC & flashcard)
{
  const libPath = 'test_prep/teaching_reading_5205_learning_library.json';
  const lib = readJson(libPath);
  const kc = lib.chapters[11].knowledgeChecks.find((k) => k.id === 'tr5205-ch-12-check-04');
  if (!kc) throw new Error('Missing tr5205-ch-12-check-04');
  kc.prompt = 'A writing screener yields consistent scores across sessions, but it samples isolated mechanics unrelated to the instructional decision being made. What validity problem exists?';
  fixedCount += 1;

  const fc = lib.flashcards.find((c) => c.id === 'tr5205-card-068');
  if (!fc) throw new Error('Missing tr5205-card-068');
  fc.back = 'Validity is the degree to which evidence supports a specific intended interpretation and use of writing scores for a defined population and instructional purpose—not a permanent property of the test itself.';
  fixedCount += 1;
  writeJson(libPath, lib);
  console.log('Patched teaching_reading_5205_learning_library.json: 2 critical items');
}

// 5. ESOL 5362 (5362-CRIT-01: workshop-03 syllable-stress contradiction)
{
  const libPath = 'test_prep/esol_5362_learning_library.json';
  const lib = readJson(libPath);
  const ws = lib.constructedResponseWorkshops.find((w) => w.id === 'esol5362-workshop-03');
  if (!ws) throw new Error('Missing esol5362-workshop-03');
  ws.stimulus = assertReplace(
    ws.stimulus,
    'The learner places stress on the first syllable in both uses of the spelled form',
    'The learner stresses the first syllable in the noun (CONtent) and the second syllable in the intended verb phrase (conTENT the solution)',
    '5362-CRIT-01 stimulus'
  );
  ws.planningFrame[0].guidance = assertReplace(
    ws.planningFrame[0].guidance,
    'Separate first-syllable stress on both "content" uses',
    'Separate the noun-verb stress contrast ("CONtent" vs. "conTENT")',
    '5362-CRIT-01 planningFrame'
  );
  fixedCount += 1;
  writeJson(libPath, lib);
  console.log('Patched esol_5362_learning_library.json: 1 critical item');
}

// 6. Praxis Core 5752 (core5752-crit-01 truncated axis ratio 5/3 ~ 1.67x; core5752-crit-02 "leggy" KC & flashcard)
{
  const libPath = 'test_prep/praxis_core_5752_learning_library.json';
  const lib = readJson(libPath);
  const pb = lib.misconceptionRemediationPlaybooks[5];
  pb.stages[2].requiredOutput = assertReplace(
    pb.stages[2].requiredOutput,
    '2.5× bar height for a 2% numeric gap',
    '5/3 ≈ 1.67× bar height for a ~2% numeric gap',
    'core5752-crit-01'
  );
  fixedCount += 1;

  const kc = lib.chapters[1].knowledgeChecks.find((k) => k.id === 'core5752-ch-02-check-03');
  if (!kc) throw new Error('Missing core5752-ch-02-check-03');
  kc.prompt = 'Read the original passage: "To keep the seedlings from becoming leggy, the gardener moved them closer to the lamp." What does the word "leggy" mean in context?';
  kc.choices[1] = 'Streamlined or narrowed deliberately for faster movement through water.';
  kc.choices[3] = 'Tall, thin, and weak from stretching toward insufficient light.';
  kc.rationale = 'Moving the seedlings closer to the lamp supplies the context clue: "leggy" describes seedlings growing tall, spindly, and weak from insufficient light.';
  const fc = lib.flashcards.find((c) => c.id === 'core5752-card-009');
  if (!fc) throw new Error('Missing core5752-card-009');
  fc.front = kc.prompt;
  fc.back = 'Tall, thin, and weak from stretching toward insufficient light.';
  fixedCount += 1;
  writeJson(libPath, lib);
  console.log('Patched praxis_core_5752_learning_library.json: 2 critical items');
}

// 7. Early Childhood 5025 (ec5025-crit-01: restore missing vignette in KC & flashcard)
{
  const libPath = 'test_prep/early_childhood_5025_learning_library.json';
  const lib = readJson(libPath);
  const kc = lib.chapters[2].knowledgeChecks.find((k) => k.id === 'ec5025-ch-03-check-4');
  if (!kc) throw new Error('Missing ec5025-ch-03-check-4');
  const promptWithVignette = 'In an early-childhood language and literacy context, a first grader repeatedly drops the second sound in words such as plan, stop, and frog when reading aloud and writing. Which error analysis best guides phonics instruction?';
  kc.prompt = promptWithVignette;
  const fc = lib.flashcards.find((c) => c.id === 'ec5025-card-016');
  if (!fc) throw new Error('Missing ec5025-card-016');
  fc.front = promptWithVignette;
  fixedCount += 1;
  writeJson(libPath, lib);
  console.log('Patched early_childhood_5025_learning_library.json: 1 critical item');
}

// 8. ParaPro 1755 (parapro-crit-01: missing apostrophe in "they're")
{
  const libPath = 'test_prep/parapro_learning_library.json';
  const lib = readJson(libPath);
  const sec = lib.chapters[8].sections[2];
  sec.content = assertReplace(sec.content, 'contracts to theyre.', "contracts to they're.", 'parapro-crit-01');
  if (typeof sec.preview === 'string' && sec.preview.includes('theyre')) {
    sec.preview = sec.preview.replace('theyre', "they're");
  }
  fixedCount += 1;
  writeJson(libPath, lib);
  console.log('Patched parapro_learning_library.json: 1 critical item');
}

// 9. PLT Early Childhood 5621 (plt5621-crit-01: GE 3.2 distractors)
{
  const libPath = 'test_prep/plt_early_childhood_5621_learning_library.json';
  const lib = readJson(libPath);
  const kc = lib.chapters[8].knowledgeChecks.find((k) => k.id === 'plt5621-ch-09-check-04');
  if (!kc) throw new Error('Missing plt5621-ch-09-check-04');
  kc.choices[0] = assertReplace(kc.choices[0], 'skip two full grade levels', 'skip a full grade level', 'plt5621-crit-01 c0');
  kc.choices[2] = assertReplace(kc.choices[2], 'national percentile rank of 62', 'national percentile rank of 32', 'plt5621-crit-01 c2');
  fixedCount += 1;
  writeJson(libPath, lib);
  console.log('Patched plt_early_childhood_5621_learning_library.json: 1 critical item');
}

// 10. PLT 5-9 5623 (plt5623-crit-01: GE 9.2 percentile distractor)
{
  const libPath = 'test_prep/plt_5_9_5623_learning_library.json';
  const lib = readJson(libPath);
  const kc = lib.chapters[8].knowledgeChecks.find((k) => k.id === 'plt5623-ch-09-check-04');
  if (!kc) throw new Error('Missing plt5623-ch-09-check-04');
  kc.choices[2] = assertReplace(kc.choices[2], 'national percentile rank of 62', 'national percentile rank of 92', 'plt5623-crit-01 c2');
  fixedCount += 1;
  writeJson(libPath, lib);
  console.log('Patched plt_5_9_5623_learning_library.json: 1 critical item');
}

// 11. PLT 7-12 5624 (plt5624-crit-01 GE 11.2 distractors + plt5624-crit-02 concrete-operational card)
{
  const libPath = 'test_prep/plt_7_12_5624_learning_library.json';
  const lib = readJson(libPath);
  const kc = lib.chapters[8].knowledgeChecks.find((k) => k.id === 'plt5624-ch-09-check-04');
  if (!kc) throw new Error('Missing plt5624-ch-09-check-04');
  kc.choices[0] = assertReplace(kc.choices[0], 'skip two full grade levels', 'skip a full grade level', 'plt5624-crit-01 c0');
  kc.choices[2] = assertReplace(kc.choices[2], 'national percentile rank of 62', 'national percentile rank of 11', 'plt5624-crit-01 c2');
  fixedCount += 1;

  const fc = lib.flashcards.find((c) => c.id === 'plt5624-card-006');
  if (!fc) throw new Error('Missing plt5624-card-006');
  fc.front = 'Which mathematics experience best scaffolds secondary learners transitioning from concrete models to formal-operational symbolic reasoning?';
  fixedCount += 1;
  writeJson(libPath, lib);
  console.log('Patched plt_7_12_5624_learning_library.json: 2 critical items');
}

console.log(`Total Priority-1 non-AP learning-library critical fixes applied: ${fixedCount}`);
