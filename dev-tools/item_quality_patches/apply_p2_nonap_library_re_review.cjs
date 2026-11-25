#!/usr/bin/env node
'use strict';

/**
 * Formal Moderate-Priority Non-AP Learning-Library Precision Patch Module
 * Repairs 18 verified clinical, legal, regulatory, psychometric, and pedagogical
 * moderate precision notes across 13 non-AP learning libraries.
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

// 1. EPPP Learning Library (3 moderate items: MAOI/fluoxetine washout direction, 2007 Record Keeping Guidelines archived note, MMPI-3 F scale label)
{
  const libPath = 'test_prep/eppp_learning_library.json';
  const lib = readJson(libPath);
  const qr0 = lib.quickReference.find((r) => r.id === 'eppp-reference-01');
  qr0.formulas[2] = replaceIdempotent(
    qr0.formulas[2],
    'MAOI-to-SSRI washout typically >=14 days (>=5 weeks after fluoxetine due to norfluoxetine half-life)',
    'MAOI-to-SSRI and standard SSRI-to-MAOI washout typically >=14 days (and >=5 weeks when switching FROM fluoxetine TO an MAOI due to norfluoxetine half-life)',
    'eppp-mod-01'
  );
  fixedCount += 1;

  const qr7 = lib.quickReference.find((r) => r.id === 'eppp-reference-08');
  qr7.formulas[3] = replaceIdempotent(
    qr7.formulas[3],
    'APA Record Keeping Guidelines recommend >=7 years past last service for adults or >=3 years past age of majority for minors (whichever is later, subject to stricter state law)',
    'the 2007 APA Record Keeping Guidelines (archived 2019; defer to current state law and institutional policy) historically cited >=7 years past last service for adults or >=3 years past age of majority for minors',
    'eppp-mod-05'
  );
  fixedCount += 1;

  const ws5 = lib.constructedResponseWorkshops.find((w) => w.id === 'eppp-workshop-05');
  const replaceFr = (s) => (typeof s === 'string' ? s.replace(/\bF-r\b/g, 'F') : s);
  ws5.stimulus = replaceFr(ws5.stimulus);
  ws5.planningFrame = ws5.planningFrame.map((p) => ({ ...p, guidance: replaceFr(p.guidance) }));
  ws5.successCriteria = ws5.successCriteria.map(replaceFr);
  ws5.commonPitfalls = ws5.commonPitfalls.map(replaceFr);
  ws5.sampleOutline = ws5.sampleOutline.map(replaceFr);
  fixedCount += 1;
  writeJson(libPath, lib);
  console.log('Patched eppp_learning_library.json: 3 moderate items');
}

// 2. Audiology 5343 (21 CFR 800.30 OTC vs 21 CFR 801.422 prescription hearing aids)
{
  const libPath = 'test_prep/audiology_5343_learning_library.json';
  const lib = readJson(libPath);
  const qr = lib.quickReference.find((r) => r.id === 'aud5343-reference-05');
  qr.formulas[0] = replaceIdempotent(
    qr.formulas[0],
    'FDA 21 CFR 801.422 hearing-aid rules: OTC devices apply only to adults 18 and older with perceived mild-to-moderate loss; red flags requiring medical referral include',
    'FDA hearing-aid rules (21 CFR 800.30 OTC; 21 CFR 801.422 prescription): OTC devices apply only to adults 18 and older with perceived mild-to-moderate loss; red flags requiring medical referral include',
    'aud5343-mod-01'
  );
  fixedCount += 1;
  writeJson(libPath, lib);
  console.log('Patched audiology_5343_learning_library.json: 1 moderate item');
}

// 3. Speech-Language Pathology 5331 (Hustad et al., 2021 contemporary intelligibility norms alongside legacy clinical rule)
{
  const libPath = 'test_prep/speech_language_pathology_5331_learning_library.json';
  const lib = readJson(libPath);
  const qr = lib.quickReference.find((r) => r.id === 'slp5331-reference-01');
  qr.formulas[1] = replaceIdempotent(
    qr.formulas[1],
    'and intelligibility to unfamiliar listeners near 50% at age 2, 75% at age 3, and 90 to 100% by age 4.',
    'and contemporary empirical speech intelligibility norms to unfamiliar listeners (Hustad et al., 2021 / ASHA Practice Portal) reaching ~50% around 36 months, ~75% around 48 months, and ~90%+ by 60 months (whereas older clinical rules of thumb cited 50%/75%/90% a year earlier).',
    'slp5331-mod-01'
  );
  fixedCount += 1;
  writeJson(libPath, lib);
  console.log('Patched speech_language_pathology_5331_learning_library.json: 1 moderate item');
}

// 4. School Psychologist 5403 (BASC-3 Clinical vs inverted Adaptive T-score direction)
{
  const libPath = 'test_prep/school_psychologist_5403_learning_library.json';
  const lib = readJson(libPath);
  const qr = lib.quickReference.find((r) => r.id === 'sp5403-reference-01');
  qr.formulas[0] = replaceIdempotent(
    qr.formulas[0],
    'BASC-3 60 to 69 At-Risk, 70+ Clinically Significant',
    'BASC-3 Clinical scales: 60 to 69 At-Risk, 70+ Clinically Significant; Adaptive scales inverted: 31 to 40 At-Risk, <=30 Clinically Significant',
    'sp5403-mod-01'
  );
  fixedCount += 1;
  writeJson(libPath, lib);
  console.log('Patched school_psychologist_5403_learning_library.json: 1 moderate item');
}

// 5. School Counselor 5422 (2022 ASCA A.12 child abuse reporting vs 2016 A.11)
{
  const libPath = 'test_prep/school_counselor_5422_learning_library.json';
  const lib = readJson(libPath);
  const ws = lib.constructedResponseWorkshops.find((w) => w.id === 'sc5422-workshop-01');
  ws.planningFrame[1].guidance = replaceIdempotent(
    ws.planningFrame[1].guidance,
    'A.11 abuse reporting',
    'A.12 child abuse reporting',
    'sc5422-mod-01'
  );
  fixedCount += 1;
  writeJson(libPath, lib);
  console.log('Patched school_counselor_5422_learning_library.json: 1 moderate item');
}

// 6. Educational Leadership 5412 (ESSA methodology-based Title I SNS test)
{
  const libPath = 'test_prep/educational_leadership_5412_learning_library.json';
  const lib = readJson(libPath);
  const pb = lib.misconceptionRemediationPlaybooks.find((p) => p.id === 'lead5412-playbook-title-i-supplanting-and-procurement-conflicts');
  pb.stages[1].instruction = replaceIdempotent(
    pb.stages[1].instruction,
    '(1) Would the district have to fund this core cost anyway without federal dollars? If yes, Title I cannot pay for it (supplement, never supplant);',
    '(1) Under ESSA (20 U.S.C. § 6321(b)), does the district allocate state and local funds to Title I schools using a Title I-neutral methodology (supplement, not supplant) rather than reducing state/local support because a school receives Title I?;',
    'lead5412-mod-01'
  );
  fixedCount += 1;
  writeJson(libPath, lib);
  console.log('Patched educational_leadership_5412_learning_library.json: 1 moderate item');
}

// 7. School Librarian 5312 (FERPA patron-record boundary + Pico 4-1-4 plurality precision)
{
  const libPath = 'test_prep/school_librarian_5312_learning_library.json';
  const lib = readJson(libPath);
  const sec = lib.chapters[1].sections[1];
  sec.content = replaceIdempotent(
    sec.content,
    'Before any clerk, student helper, or volunteer interacts with patron records, the librarian must provide explicit training on student confidentiality and FERPA expectations.',
    'Student helpers and parent volunteers should not access confidential patron circulation or academic records under FERPA; any authorized staff clerk with a legitimate educational interest must receive explicit confidentiality and FERPA training before handling records.',
    'sl5312-mod-01'
  );
  if (typeof sec.preview === 'string' && sec.preview.includes('Before any clerk, student helper')) {
    sec.preview = sec.content.slice(0, sec.preview.length);
  }
  fixedCount += 1;

  const fc = lib.flashcards.find((c) => c.id === 'sl5312-card-034');
  fc.back = replaceIdempotent(
    fc.back,
    'The Court ruled that school boards may not remove library books simply because they dislike the ideas inside them',
    'In a 4-1-4 plurality decision (not a binding majority opinion), Justice Brennan wrote that school boards may not remove library books simply because they dislike the ideas inside them',
    'sl5312-mod-02'
  );
  fixedCount += 1;
  writeJson(libPath, lib);
  console.log('Patched school_librarian_5312_learning_library.json: 2 moderate items');
}

// 8. SPED 5372, 5322, 5547 learning libraries (cleanup distorted IDEA "individual/eventual support profile" phrases)
for (const rel of [
  'test_prep/special_education_behavior_emotional_5372_learning_library.json',
  'test_prep/special_education_intellectual_disabilities_5322_learning_library.json',
  'test_prep/special_education_severe_profound_5547_learning_library.json',
]) {
  let raw = fs.readFileSync(path.join(root, rel), 'utf8');
  const next = raw
    .replace(/not commonly linked to the eventual (?:individual )?(?:support|learning) profile/gi, 'not commonly linked to the eventual disability category')
    .replace(/\beventual support profile\b/gi, 'eventual disability category')
    .replace(/\bA individual support profile\b/g, 'An individualized support profile')
    .replace(/\ban individual support profile\b/g, 'an individualized support profile')
    .replace(/\bindividual support profile\b/g, 'individualized support profile');
  if (next !== raw) {
    writeGeneratedFile(path.join(root, rel), next, 'utf8');
    fixedCount += 1;
    console.log('Cleaned IDEA profile phrasing in', rel);
  }
}

// 9. Early Childhood 5025 (ec5025-workshop-01 semiphonetic consonant frames)
{
  const libPath = 'test_prep/early_childhood_5025_learning_library.json';
  const lib = readJson(libPath);
  const ws = lib.constructedResponseWorkshops.find((w) => w.id === 'ec5025-workshop-01');
  ws.stimulus = replaceIdempotent(
    ws.stimulus,
    'write initial-consonant strings ("D G R N" for "The dog ran")',
    'write semiphonetic initial-and-final consonant frames ("D G R N" for "The dog ran")',
    'ec5025-mod-05'
  );
  fixedCount += 1;
  writeJson(libPath, lib);
  console.log('Patched early_childhood_5025_learning_library.json: 1 moderate item');
}

// 10. ParaPro 1755 (parapro-ch-12-check-3 restore missing draft sentence)
{
  const libPath = 'test_prep/parapro_learning_library.json';
  const lib = readJson(libPath);
  const kc = lib.chapters[11].knowledgeChecks.find((k) => k.id === 'parapro-ch-12-check-3');
  kc.prompt = 'When coaching a young writer who drafted the bare sentence "The room was messy," which question best supports elaboration?';
  fixedCount += 1;
  writeJson(libPath, lib);
  console.log('Patched parapro_learning_library.json: 1 moderate item');
}

// 11. PLT 5-9 5623 (negative reinforcement vs coercive threat + middle-grades recess carryover)
{
  const libPath = 'test_prep/plt_5_9_5623_learning_library.json';
  const lib = readJson(libPath);
  const pb = lib.misconceptionRemediationPlaybooks.find((p) => p.id === 'plt5623-playbook-extrinsic-compliance-vs-autonomy-belonging');
  pb.stages[0].requiredOutput = replaceIdempotent(
    pb.stages[0].requiredOutput,
    'overjustification effect, negative reinforcement, or social-comparison threat',
    'overjustification effect, controlling punishment threat, or social-comparison threat',
    'plt5623-mod-03'
  );
  fixedCount += 1;

  const kc = lib.chapters[3].knowledgeChecks.find((k) => k.id === 'plt5623-ch-04-check-04');
  kc.choices[1] = replaceIdempotent(
    kc.choices[1],
    'assign a whole-class loss of recess',
    'assign whole-class after-class detention',
    'plt5623-mod-01'
  );
  fixedCount += 1;
  writeJson(libPath, lib);
  console.log('Patched plt_5_9_5623_learning_library.json: 2 moderate items');
}

// 12. PLT 7-12 5624 (secondary recess carryover)
{
  const libPath = 'test_prep/plt_7_12_5624_learning_library.json';
  const lib = readJson(libPath);
  const kc = lib.chapters[3].knowledgeChecks.find((k) => k.id === 'plt5624-ch-04-check-04');
  kc.choices[1] = replaceIdempotent(
    kc.choices[1],
    'assign a whole-class loss of recess',
    'assign whole-class after-school detention',
    'plt5624-mod-01'
  );
  fixedCount += 1;
  writeJson(libPath, lib);
  console.log('Patched plt_7_12_5624_learning_library.json: 1 moderate item');
}

console.log(`Total moderate non-AP learning-library precision fixes applied: ${fixedCount}`);
