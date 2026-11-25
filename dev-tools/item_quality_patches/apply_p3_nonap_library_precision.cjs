#!/usr/bin/env node
'use strict';

/**
 * Formal Wave-2 Moderate Non-AP Learning-Library Precision Patch Module
 * Repairs 23 verified moderate math, statutory, and clinical precision notes across:
 *   - praxis_core_5752_learning_library.json (14 phantom-sibling math rationales & missing units)
 *   - special_education_learning_disabilities_5383_learning_library.json (3 phantom-sibling math rationales + IDEA category)
 *   - esol_5362_learning_library.json (ESSA Section 1112(e)(3)(A) 30-day/2-week parent notification rule)
 *   - special_education_5355_learning_library.json (2 IDEA 34 CFR 300.301(c)(1) state timeline nuances)
 *   - teaching_reading_5205_learning_library.json (TRN/BIK Gentry spelling-stage precision)
 *   - plt_early_childhood_5621_learning_library.json (IDEA Part C->B eligibility/transition nuance)
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

// 1. Praxis Core 5752 (14 phantom-sibling math rationales & missing units)
{
  const libPath = 'test_prep/praxis_core_5752_learning_library.json';
  const lib = readJson(libPath);
  const byId = new Map(lib.chapters.flatMap((c) => c.knowledgeChecks || []).map((k) => [k.id, k]));

  const coreFixes = [
    ['core5752-ch-07-check-01', (kc) => {
      kc.rationale = replaceIdempotent(kc.rationale, 'Multiplication represents equal groups: 18 times 24 and 27 times 16 both equal 432.', 'Multiplication represents equal groups: 18 times 24 equals 432.', kc.id);
    }],
    ['core5752-ch-07-check-02', (kc) => {
      kc.rationale = replaceIdempotent(kc.rationale, 'Using eighths, 3/4 + 5/8 = 6/8 + 5/8 = 11/8, and 1 7/8 - 4/8 = 1 3/8.', 'Using eighths, 3/4 + 5/8 = 6/8 + 5/8 = 11/8, which simplifies to 1 3/8.', kc.id);
    }],
    ['core5752-ch-07-check-03', (kc) => {
      kc.rationale = replaceIdempotent(kc.rationale, 'Division finds how many equal-sized units fit in the total: 12.5 divided by 0.5 and 7.5 divided by 0.3 both equal 25.', 'Division finds how many equal-sized units fit in the total: 12.5 divided by 0.5 equals 25.', kc.id);
    }],
    ['core5752-ch-08-check-02', (kc) => {
      kc.rationale = replaceIdempotent(kc.rationale, 'The remaining fraction is 75% of $80, or 50% of $120; each calculation gives $60.', 'The remaining price after a 25% discount is 75% of $80, which equals $60.', kc.id);
    }],
    ['core5752-ch-08-check-03', (kc) => {
      kc.choices = ['120 miles per hour', '60 miles per hour', '540 miles per hour', '45 miles per hour'];
      kc.rationale = replaceIdempotent(kc.rationale, 'A constant unit rate is total quantity divided by time: 180/3 and 240/4 both equal 60 per hour.', 'A constant unit rate is total distance divided by time: 180 miles divided by 3 hours equals 60 miles per hour.', kc.id);
    }],
    ['core5752-ch-08-check-04', (kc) => {
      kc.rationale = replaceIdempotent(kc.rationale, 'There are 100 centimeters per meter and 1,000 meters per kilometer, so both conversions produce 240 in the requested unit.', 'There are 100 centimeters per meter, so multiplying 2.4 meters by 100 produces 240 centimeters.', kc.id);
    }],
    ['core5752-ch-08-check-05', (kc) => {
      kc.choices = ['15.5 miles', '36 miles', '48 miles', '42 miles'];
      kc.rationale = replaceIdempotent(kc.rationale, 'Multiply the scale value, 12, by the measured length, 3.5, to obtain 42 actual units.', 'Multiply the scale value of 12 miles per inch by the measured length of 3.5 inches to obtain 42 miles.', kc.id);
    }],
    ['core5752-ch-09-check-01', (kc) => {
      kc.rationale = replaceIdempotent(kc.rationale, 'With five ordered values, the median is the third value, which is 15 in both sets.', 'With five ordered values (12, 15, 15, 18, 20), the median is the middle (third) value, which is 15.', kc.id);
    }],
    ['core5752-ch-09-check-02', (kc) => {
      kc.rationale = replaceIdempotent(kc.rationale, 'The required total is mean times count. Subtracting the known values gives 72 - 52 = 20 and 100 - 80 = 20.', 'The required total is mean times count (4 × 18 = 72). Subtracting the three known scores (14 + 17 + 21 = 52) gives 72 - 52 = 20.', kc.id);
    }],
    ['core5752-ch-10-check-01', (kc) => {
      kc.rationale = replaceIdempotent(kc.rationale, 'Range is maximum minus minimum: 18 - 4 and 36 - 22 both equal 14.', 'Range is maximum minus minimum: 18 - 4 equals 14.', kc.id);
    }],
    ['core5752-ch-11-check-02', (kc) => {
      kc.rationale = replaceIdempotent(kc.rationale, 'Distribute and combine constants: 8x - 12 + 5 and 8x + 2 - 9 both simplify to 8x - 7.', 'Distribute 4 across (2x - 3) and combine constants: 8x - 12 + 5 simplifies to 8x - 7.', kc.id);
    }],
    ['core5752-ch-11-check-05', (kc) => {
      kc.rationale = replaceIdempotent(kc.rationale, 'Slope is change in y divided by change in x: (13 - 5)/(4 - 0) and (15 - 7)/(6 - 2) both equal 2.', 'Slope is change in y divided by change in x: (13 - 5)/(4 - 0) = 8/4 = 2.', kc.id);
    }],
    ['core5752-ch-12-check-01', (kc) => {
      kc.rationale = 'Rectangle area is length times width: multiplying 9 units by 6 units equals 54 square units, whereas 30 is the perimeter 2(9 + 6).';
    }],
    ['core5752-ch-12-check-05', (kc) => {
      kc.rationale = replaceIdempotent(kc.rationale, 'Volume is the product of length, width, and height: 3 x 4 x 7 and 2 x 6 x 7 both equal 84.', 'Volume is the product of length, width, and height: 3 × 4 × 7 equals 84 cubic units.', kc.id);
    }],
  ];

  for (const [id, fn] of coreFixes) {
    const kc = byId.get(id);
    if (!kc) throw new Error('Missing ' + id);
    fn(kc);
    fixedCount += 1;
  }
  writeJson(libPath, lib);
  console.log('Patched praxis_core_5752_learning_library.json: 14 math checks');
}

// 2. SPED Learning Disabilities 5383 (3 phantom-sibling math rationales + IDEA category phrasing)
{
  const libPath = 'test_prep/special_education_learning_disabilities_5383_learning_library.json';
  const lib = readJson(libPath);
  const byId = new Map(lib.chapters.flatMap((c) => c.knowledgeChecks || []).map((k) => [k.id, k]));

  const kc1 = byId.get('ld5383-ch-08-check-01');
  kc1.rationale = replaceIdempotent(kc1.rationale, 'Multiplication represents equal groups: 18 times 24 and 27 times 16 both equal 432.', 'Multiplication represents equal groups: 18 times 24 equals 432.', 'ld5383-ch8-1');
  fixedCount += 1;

  const kc2 = byId.get('ld5383-ch-08-check-02');
  kc2.rationale = replaceIdempotent(kc2.rationale, 'Using eighths, 3/4 + 5/8 = 6/8 + 5/8 = 11/8, and 1 7/8 - 4/8 = 1 3/8.', 'Using eighths, 3/4 + 5/8 = 6/8 + 5/8 = 11/8, which simplifies to 1 3/8.', 'ld5383-ch8-2');
  fixedCount += 1;

  const kc3 = byId.get('ld5383-ch-08-check-03');
  kc3.rationale = replaceIdempotent(kc3.rationale, 'Division finds how many equal-sized units fit in the total: 12.5 divided by 0.5 and 7.5 divided by 0.3 both equal 25.', 'Division finds how many equal-sized units fit in the total: 12.5 divided by 0.5 equals 25.', 'ld5383-ch8-3');
  fixedCount += 1;

  const kc5 = byId.get('ld5383-ch-10-check-05');
  kc5.choices[2] = replaceIdempotent(kc5.choices[2], 'under an IDEA individual learning profile.', 'under an IDEA disability category.', 'ld5383-ch10-5');
  fixedCount += 1;

  writeJson(libPath, lib);
  console.log('Patched special_education_learning_disabilities_5383_learning_library.json: 4 items');
}

// 3. ESOL 5362 (ESSA Section 1112(e)(3)(A) parent notification timeline)
{
  const libPath = 'test_prep/esol_5362_learning_library.json';
  const lib = readJson(libPath);
  const qr = lib.quickReference.find((r) => r.id === 'esol5362-reference-06');
  qr.formulas[3] = replaceIdempotent(
    qr.formulas[3],
    'parent notification within 30 days of enrollment',
    'parent notification within 30 days after the beginning of the school year (or within 2 weeks of placement for students identified mid-year under ESSA Section 1112(e)(3)(A))',
    'esol5362-mod-01'
  );
  fixedCount += 1;
  writeJson(libPath, lib);
  console.log('Patched esol_5362_learning_library.json: 1 item');
}

// 4. Special Education 5355 (IDEA 34 CFR 300.301(c)(1) state timeline precision)
{
  const libPath = 'test_prep/special_education_5355_learning_library.json';
  const lib = readJson(libPath);
  lib.misconceptionFamilies[2].remediationMove = replaceIdempotent(
    lib.misconceptionFamilies[2].remediationMove,
    '(unless state law sets a shorter window)',
    '(unless the state establishes a different timeframe under 34 CFR § 300.301(c)(1))',
    'sp5355-mf-2'
  );
  fixedCount += 1;

  lib.misconceptionRemediationPlaybooks[2].stages[1].instruction = replaceIdempotent(
    lib.misconceptionRemediationPlaybooks[2].stages[1].instruction,
    '(unless state law is shorter)',
    '(unless the state establishes a different timeframe under 34 CFR § 300.301(c)(1))',
    'sp5355-pb-2'
  );
  fixedCount += 1;
  writeJson(libPath, lib);
  console.log('Patched special_education_5355_learning_library.json: 2 items');
}

// 5. Teaching Reading 5205 (TRN/BIK Gentry spelling-stage precision)
{
  const libPath = 'test_prep/teaching_reading_5205_learning_library.json';
  const lib = readJson(libPath);
  const qr = lib.quickReference.find((r) => r.id === 'tr5205-reference-05');
  qr.decisionRules[0] = replaceIdempotent(
    qr.decisionRules[0],
    'recognize phonetic-stage mastery of consonants and teach long-vowel VCe and vowel-team word sorts.',
    'recognize emerging phonetic consonant-and-vowel representation (e.g., consonant skeleton in TRN progressing toward full phonetic vowel mapping in BIK) and teach long-vowel VCe and vowel-team word sorts.',
    'tr5205-qr-05'
  );
  fixedCount += 1;
  writeJson(libPath, lib);
  console.log('Patched teaching_reading_5205_learning_library.json: 1 item');
}

// 6. PLT Early Childhood 5621 (IDEA Part C -> Part B transition eligibility nuance)
{
  const libPath = 'test_prep/plt_early_childhood_5621_learning_library.json';
  const lib = readJson(libPath);
  const qr = lib.quickReference.find((r) => r.id === 'plt5621-reference-04');
  qr.formulas[1] = replaceIdempotent(
    qr.formulas[1],
    'at least 90 days before age 3 to ensure a seamless shift to preschool IEP services without a gap in support.',
    'at least 90 days before age 3 to coordinate Part B eligibility determination and, when eligible, a seamless transition to preschool IEP or community supports without a gap.',
    'plt5621-qr-04'
  );
  fixedCount += 1;
  writeJson(libPath, lib);
  console.log('Patched plt_early_childhood_5621_learning_library.json: 1 item');
}

console.log(`Total Wave-2 moderate non-AP learning-library precision fixes applied: ${fixedCount}`);
