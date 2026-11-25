#!/usr/bin/env node
'use strict';

/**
 * Formal Priority-1 Source Re-Review Patch Module
 * Repairs 27 verified Priority-1 source/Batch-3 accuracy defects across:
 *   - PLT 5621 / 5623 / 5624 (8 items: GE contradictions + developmental stage mismatches)
 *   - Teaching Reading 5205 (5 items: validity inversion + 4 stripped-vignette stems)
 *   - Reading Specialist 5302 (4 items: 4 stripped-vignette stems)
 *   - ESOL 5362 (9 items: phonetic accuracy + 8 b1->b2 cross-item carryover mismatches)
 *   - School Counselor 5422 Batch-3 (sc5422-b3-079: distractor transplant from b3-083)
 *
 * Updates canonical test_prep/<stem>_pack.json, test_prep/<stem>_items.json,
 * and dev-tools/authored/school_counselor_5422_batch3.json (+ review sha256 binding).
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { writeGeneratedFile } = require('../write_generated_file.cjs');

const root = path.resolve(__dirname, '..', '..');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
function canonical(value) {
  return String(value == null ? '' : value).normalize('NFKC').toLowerCase()
    .replace(/["']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
function contentKernel(item) {
  return JSON.stringify({
    answer: canonical(item.choices && item.choices[item.answerIndex]),
    distractors: (item.choices || []).filter((_, index) => index !== item.answerIndex).map(canonical).sort(),
    rationale: canonical(item.rationale),
    references: (item.references || []).map(canonical).sort(),
  });
}

const PATCHES = {
  plt_early_childhood_5621: {
    'plt5621-b1-012': {
      prompt: 'In a preschool–grade 3 setting, which classroom condition best supports primary-grade learners transitioning into the task of industry versus inferiority in Erikson’s original framework?',
      rationale: 'Primary-grade learners develop a sense of competence through purposeful work, supported mastery, contribution, and credible feedback rather than humiliation or empty praise. The response must fit young children’s development, play, relationships, language, access, safety, family context, and observable learning evidence.',
      choiceRationales: {
        3: 'Correct. Primary-grade learners develop a sense of competence through purposeful work, supported mastery, contribution, and credible feedback rather than humiliation or empty praise. The response must fit young children’s development, play, relationships, language, access, safety, family context, and observable learning evidence.',
      },
    },
  },

  plt_5_9_5623: {
    'plt5623-b1-074': {
      prompt: 'In a grades 5–9 setting, an eighth grader receives a grade-equivalent score of 9.2 on a standardized test. What is a defensible interpretation?',
      choices: {
        0: 'The student should skip a full grade level next fall because the standardized score confirms full academic and developmental readiness for accelerated placement.',
        3: 'The score carries the exact same statistical interpretation as earning a national percentile rank of 92 when comparing performance against same-age peer norm groups.',
      },
    },
    'plt5623-b1-012': {
      prompt: 'In a grades 5–9 setting, which classroom condition best supports upper-elementary and early middle-grades learners navigating the transition from industry versus inferiority toward identity in Erikson’s framework?',
      rationale: 'Middle-grades learners strengthen competence and emerging identity through purposeful work, supported mastery, contribution, and credible feedback rather than humiliation or empty praise. The response should account for early-adolescent development, increasing disciplinary complexity, identity and peer context, learner agency, equitable access, and evidence of independent transfer.',
      choiceRationales: {
        3: 'Correct. Middle-grades learners strengthen competence and emerging identity through purposeful work, supported mastery, contribution, and credible feedback rather than humiliation or empty praise. The response should account for early-adolescent development, increasing disciplinary complexity, identity and peer context, learner agency, equitable access, and evidence of independent transfer.',
      },
    },
    'plt5623-b2-006': {
      prompt: 'In a middle-grades classroom, a teacher introduces algebraic equivalence and proportional transformations to middle-grades learners. Which design best connects with their developing reasoning?',
      choices: {
        2: 'Ask learners to accept the equivalence rule on teacher authority without testing physical examples first.',
        3: 'Postpone algebraic classification and equivalence reasoning until later grades when abstract thought matures.',
      },
      rationale: 'Middle-grades learners often reason more successfully about logical relationships when unfamiliar abstractions are grounded in observable models and actions before symbolic abstraction is increased. The response should account for early-adolescent development, increasing disciplinary complexity, identity and peer context, learner agency, equitable access, and evidence of independent transfer.',
      choiceRationales: {
        1: 'Correct. Middle-grades learners often reason more successfully about logical relationships when unfamiliar abstractions are grounded in observable models and actions before symbolic abstraction is increased. The response should account for early-adolescent development, increasing disciplinary complexity, identity and peer context, learner agency, equitable access, and evidence of independent transfer.',
        2: 'Requiring acceptance of a rule on teacher authority without hands-on evidence bypasses active reasoning about observable transformations and mathematical equivalence.',
      },
    },
  },

  plt_7_12_5624: {
    'plt5624-b1-074': {
      prompt: 'In a grades 7–12 setting, an eleventh grader receives a grade-equivalent score of 12.2 on a standardized test. What is a defensible interpretation?',
      choices: {
        0: 'The student should skip a full grade level next fall because the standardized score confirms full academic and developmental readiness for accelerated placement.',
        3: 'The score carries the exact same statistical interpretation as earning a national percentile rank of 12 when comparing performance against same-age peer norm groups.',
      },
    },
    'plt5624-b1-012': {
      prompt: 'In a grades 7–12 setting, which classroom condition best supports adolescents navigating Erikson’s stage of identity versus role confusion while building academic competence?',
      rationale: 'Secondary learners build coherent academic identity and competence through purposeful work, supported mastery, valued roles, and credible self-referenced feedback rather than humiliation or empty praise. The response should account for adolescent development, disciplinary literacy and advanced content, identity and peer context, learner agency, equitable access, independent transfer, and preparation for college, career, and civic life.',
      choiceRationales: {
        0: 'Limiting valued classroom leadership roles to top scorers undermines emerging academic identity and discourages peers who are still developing proficiency.',
        2: 'Eliminating genuine academic challenge deprives adolescents of authentic mastery experiences needed to build durable self-efficacy and academic identity.',
        3: 'Correct. Secondary learners build coherent academic identity and competence through purposeful work, supported mastery, valued roles, and credible self-referenced feedback rather than humiliation or empty praise. The response should account for adolescent development, disciplinary literacy and advanced content, identity and peer context, learner agency, equitable access, independent transfer, and preparation for college, career, and civic life.',
      },
    },
    'plt5624-b1-006': {
      prompt: 'In a grades 7–12 setting, which mathematics experience best scaffolds adolescents transitioning from concrete models to formal-operational symbolic reasoning?',
      choices: {
        2: 'Ask learners to accept the algebraic rule on teacher authority without testing physical or visual examples first.',
        3: 'Postpone algebraic equivalence reasoning until students demonstrate fluent mastery of abstract formal notation alone.',
      },
      rationale: 'Secondary learners often reason more successfully about unfamiliar abstract relationships when ideas are grounded in visual or tangible models before formal symbolic abstraction is increased. The response should account for adolescent development, disciplinary literacy and advanced content, identity and peer context, learner agency, equitable access, independent transfer, and preparation for college, career, and civic life.',
      choiceRationales: {
        1: 'Correct. Secondary learners often reason more successfully about unfamiliar abstract relationships when ideas are grounded in visual or tangible models before formal symbolic abstraction is increased. The response should account for adolescent development, disciplinary literacy and advanced content, identity and peer context, learner agency, equitable access, independent transfer, and preparation for college, career, and civic life.',
        2: 'Requiring acceptance of a rule on teacher authority without model-based evidence bypasses active reasoning about observable transformations and algebraic equivalence.',
      },
    },
    'plt5624-b2-006': {
      prompt: 'In a secondary classroom, a teacher introduces symbolic functions and algebraic equivalence to secondary learners. Which design best connects with their developing reasoning?',
      choices: {
        2: 'Ask learners to accept the equivalence rule on teacher authority without testing visual or physical models first.',
        3: 'Postpone algebraic equivalence reasoning until students demonstrate fluent mastery of abstract formal notation alone.',
      },
      rationale: 'Secondary learners often reason more successfully about unfamiliar abstract relationships when ideas are grounded in visual or tangible models before formal symbolic abstraction is increased. The response should account for adolescent development, disciplinary literacy and advanced content, identity and peer context, learner agency, equitable access, independent transfer, and preparation for college, career, and civic life.',
      choiceRationales: {
        1: 'Correct. Secondary learners often reason more successfully about unfamiliar abstract relationships when ideas are grounded in visual or tangible models before formal symbolic abstraction is increased. The response should account for adolescent development, disciplinary literacy and advanced content, identity and peer context, learner agency, equitable access, independent transfer, and preparation for college, career, and civic life.',
        2: 'Requiring acceptance of a rule on teacher authority without model-based evidence bypasses active reasoning about observable transformations and algebraic equivalence.',
      },
    },
  },

  teaching_reading_5205: {
    'tr5205-b1-094': {
      prompt: 'A writing screener yields consistent scores across sessions, but it samples isolated mechanics unrelated to the instructional decision being made. What validity problem exists?',
    },
    'tr5205-b1-024': {
      prompt: 'During systematic K–6 phonics instruction, a student repeatedly omits the second sound in consonant blends such as pl and st in both reading and spelling. Which error analysis best guides phonics instruction?',
    },
    'tr5205-b1-026': {
      prompt: 'When an elementary teacher analyzes decoding evidence, a student blends spoken phonemes accurately but struggles to segment spoken words into individual sounds. What instructional focus does this error pattern indicate?',
    },
    'tr5205-b1-030': {
      prompt: 'When an elementary teacher analyzes oral-reading-fluency evidence, a student meets the grade-level words-correct-per-minute benchmark yet reads monotonically with choppy phrasing and weak comprehension. How should the score be interpreted?',
    },
    'tr5205-b1-032': {
      prompt: 'When an elementary teacher analyzes assessment data, a student decodes grade-level words accurately and fluently yet struggles to understand both listened-to and read passages. How should these oral-language and decoding data guide instruction?',
    },
  },

  reading_specialist_5302: {
    'read5302-b1-024': {
      prompt: 'A student repeatedly omits the second sound in consonant blends such as pl and st in both oral reading and spelling. Which error analysis best guides phonics instruction?',
    },
    'read5302-b1-060': {
      prompt: 'A student blends spoken sounds accurately but struggles to segment spoken words into individual phonemes during spelling and decoding. What instructional focus does this error pattern indicate?',
    },
    'read5302-b1-064': {
      prompt: 'A student meets the grade-level words-correct-per-minute benchmark on an oral-reading-fluency check, yet reads word-by-word with poor phrasing and misses comprehension questions. How should the score be interpreted?',
    },
    'read5302-b1-066': {
      prompt: 'Assessment data show that a student decodes grade-level words accurately and fluently yet struggles to comprehend both listened-to and read texts. How should these oral-language and decoding data guide instruction?',
    },
  },

  esol_5362: {
    'esol5362-b1-001': {
      choices: {
        0: 'Contrast the two phonemes by place of articulation, build perception before production, and check meaning in context.',
      },
    },
    'esol5362-b2-002': {
      choices: [
        'Each of the three words follows its own irregular past-tense rule, so the endings show no predictable pattern at all.',
        'The regular past-tense morpheme has predictable allomorphs conditioned by the final sound of the verb stem.',
        'The learner is shifting the word class of each verb, turning it into a noun when the ending is pronounced differently.',
        'Written punctuation and spelling conventions determine how the -ed ending is pronounced when the text is read aloud.',
      ],
      choiceRationales: [
        'The /t/, /d/, and /ɪd/ past-tense endings follow a regular phonological rule conditioned by the stem-final sound, so the variation is systematic rather than irregular.',
        'Correct. English inflectional morphemes have phonologically conditioned surface forms; recognizing the pattern supports explicit, efficient instruction.',
        'Adding the regular -ed inflection preserves verb tense marking rather than changing the word into a noun; the pronunciation shift reflects phonological conditioning.',
        'Pronunciation of regular -ed depends on the preceding spoken phoneme (voiceless, voiced, or /t/ and /d/), whereas spelling -ed alone does not determine the spoken allomorph.',
      ],
    },
    'esol5362-b2-009': {
      choices: [
        'An articulatory diagram or mirror comparing lip-teeth contact and airflow, practiced with meaningful minimal pairs.',
        'Color coding the letters b and v with different colors that are unrelated to how either sound is produced in speech.',
        'A description of b and v as having identical articulation, with the difference explained as a spelling convention.',
        'Repetition of the target words at a louder volume, with the learner continuing until the sound seems correct.',
      ],
      choiceRationales: [
        'Correct. Articulatory features plus perception and meaningful production can make an unfamiliar contrast observable and actionable.',
        'Colors can mark letters visually but provide no information about the bilabial stop versus labiodental fricative articulation that distinguishes /b/ and /v/.',
        'The sounds /b/ (bilabial stop) and /v/ (labiodental fricative) differ in lip-teeth contact and continuous airflow, so describing them as identical misinforms the learner.',
        'Volume does not change articulation, and repetition without feedback gives the learner no guidance about what to adjust.',
      ],
    },
    'esol5362-b2-041': {
      choices: [
        'Students will use causal connectors and evidence phrases to explain two historical causes orally and in writing.',
        'Students will understand the historical era deeply and appreciate how historians explain major historical causes.',
        'Students will complete the cause-and-effect worksheet on two historical events with partners during the class period.',
        'Students will learn English vocabulary related to history so they can participate more in social studies discussions.',
      ],
      choiceRationales: [
        'Correct. A usable objective names an observable language function, relevant forms or discourse features, meaningful content context, and evidence of performance.',
        'Understanding and appreciation are not observable behaviors, so the objective gives no clear target for planning or scoring.',
        'Completing a worksheet describes an activity rather than the language and content learning the lesson is meant to produce.',
        'Learning English vocabulary is too broad to guide assessment and does not name the causal explanation language students will use.',
      ],
    },
    'esol5362-b2-058': {
      choices: [
        'Correct each accent difference in the learner’s speech with equal attention, including those that do not matter.',
        'Prioritize the final-consonant contrasts affecting meaning through perception and production work, respecting accent.',
        'Ignore listener difficulty with final consonants, since accent is part of identity and should be left alone.',
        'Assign silent tasks until the learner’s pronunciation matches a native model, avoiding listener confusion.',
      ],
      choiceRationales: [
        'Treating all accent features equally dilutes attention from the word-final consonant contrasts that actually obscure grammatical and lexical meaning for listeners.',
        'Correct. Pronunciation instruction is most equitable and efficient when it targets intelligibility, communicative load, learner goals, and meaningful use.',
        'Respecting identity does not mean ignoring comprehension problems, and omitted or neutralized final consonants directly obscure tense, plural, and lexical contrasts.',
        'Silencing the learner removes practice opportunities and sets an inappropriate native-speaker standard as the measure of success.',
      ],
    },
    'esol5362-b2-064': {
      choices: [
        'A high-stakes summative score from last year’s test, which measured a different construct than comparison language.',
        'An attendance record from the previous unit, used as an indicator of students’ academic language engagement.',
        'An end-of-course comprehensive exam, given after the unit so results reflect the full range of language skills.',
        'A brief task eliciting the target comparison language, analyzed formatively to plan the next instructional step.',
      ],
      choiceRationales: [
        'A summative score from last year on a different construct cannot show how students are currently using comparison language during instruction.',
        'Attendance shows presence, not use of comparison language, so it provides no formative information to guide instructional adjustments.',
        'Assessing after the course ends is too late to inform ongoing instruction, which is the stated purpose of monitoring during the unit.',
        'Correct. Assessment design begins with purpose, construct, evidence, and intended use; formative evidence must be timely enough to guide instruction.',
      ],
    },
    'esol5362-b2-065': {
      choices: {
        0: 'The score may reflect construct-irrelevant language barriers rather than the science reasoning construct being measured.',
      },
      choiceRationales: {
        2: 'Clock type may affect pacing slightly, but validity here concerns whether the items actually measure science content reasoning rather than opaque wording.',
        3: 'Seat color is irrelevant to the meaning of scores, whereas avoidably opaque wording introduces construct-irrelevant language barriers into the science scores.',
      },
    },
    'esol5362-b2-069': {
      choices: [
        'Elicit the written source-based historical argument, scoring content and academic language criteria against the target.',
        'Use an isolated word-matching quiz on the history vocabulary that appears in the source-based argument readings.',
        'Measure silent reading speed on a textbook chapter as the main outcome for the historical argument writing task.',
        'Ask students to rate how much they enjoyed the history unit and use the ratings as evidence of argument writing.',
      ],
      choiceRationales: [
        'Correct. Performance assessment is appropriate when the construct involves integrated language use in a meaningful disciplinary task.',
        'Word matching checks isolated vocabulary recognition but does not show whether students can write a source-based historical argument for an academic audience.',
        'The objective is writing a source-based historical argument, so silent reading speed measures an unrelated skill and misrepresents the construct.',
        'Enjoyment ratings reflect attitudes and provide no evidence of the historical argument writing skills named in the objective.',
      ],
    },
    'esol5362-b2-091': {
      choices: [
        'Adopt a popular writing template from social media without first analyzing the specific genre features students miss.',
        'Attribute the pattern to students’ lack of motivation for writing and continue instruction without any changes.',
        'Frame a focused inquiry question, examine student writing samples, consult genre research and colleagues, and test a change.',
        'Treat one student paper as conclusive proof of the problem and redesign the entire course around it.',
      ],
      choiceRationales: [
        'Without defining the specific genre gap first, a popular template may not address the discourse features students need to produce.',
        'Blaming learners ignores how explicit genre modeling and scaffolding shape academic writing production, which the teacher can change.',
        'Correct. Reflective inquiry links a specific problem, evidence, research, implementation, and outcome review rather than chasing techniques.',
        'One paper is weak evidence, so systematic examination of student writing samples is needed before making large instructional changes.',
      ],
    },
  },

  school_counselor_5422: {
    'sc5422-b3-079': {
      choices: {
        0: 'Compare only the selected group’s post-intervention attendance against that peak flu month and attribute all gains to counseling.',
        1: 'Keep the single flu-month cutoff but shorten the intervention window so attendance rebounds before seasonal illness shifts again.',
        3: 'Drop students whose attendance improves early in the semester and count only remaining participants when evaluating program effects.',
      },
      choiceRationales: {
        0: 'Not the best answer. Comparing post-intervention attendance to a single extreme flu month mistakes natural regression to the mean and seasonal recovery for an intervention effect. Recheck the scenario\'s purpose, evidence, student access, professional role, and safest appropriate next step.',
        1: 'Not the best answer. Shortening the program without fixing the single extreme baseline leaves the regression-to-the-mean and seasonal-confounding threat unresolved. Recheck the scenario\'s purpose, evidence, student access, professional role, and safest appropriate next step.',
        3: 'Not the best answer. Dropping improving students introduces severe attrition bias and distorts evaluation evidence rather than fixing extreme-score selection bias. Recheck the scenario\'s purpose, evidence, student access, professional role, and safest appropriate next step.',
      },
    },
  },
};

function applyPatchToItem(item, patch) {
  if (typeof patch.prompt === 'string') item.prompt = patch.prompt;
  if (typeof patch.rationale === 'string') item.rationale = patch.rationale;
  if (Array.isArray(patch.choices)) {
    item.choices = patch.choices.slice();
  } else if (patch.choices && typeof patch.choices === 'object') {
    for (const [idx, text] of Object.entries(patch.choices)) {
      item.choices[Number(idx)] = text;
    }
  }
  if (Array.isArray(patch.choiceRationales)) {
    item.choiceRationales = patch.choiceRationales.slice();
  } else if (patch.choiceRationales && typeof patch.choiceRationales === 'object') {
    for (const [idx, text] of Object.entries(patch.choiceRationales)) {
      item.choiceRationales[Number(idx)] = text;
    }
  }
}

let totalPatched = 0;

for (const [stem, itemPatches] of Object.entries(PATCHES)) {
  const packPath = path.join(root, 'test_prep', `${stem}_pack.json`);
  const itemsPath = path.join(root, 'test_prep', `${stem}_items.json`);
  const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
  const itemsArr = JSON.parse(fs.readFileSync(itemsPath, 'utf8'));

  for (const [id, patch] of Object.entries(itemPatches)) {
    const pItem = pack.items.find((x) => x.id === id);
    const iItem = itemsArr.find((x) => x.id === id);
    if (!pItem || !iItem) throw new Error(`Missing item ${id} in ${stem}`);
    applyPatchToItem(pItem, patch);
    applyPatchToItem(iItem, patch);
    totalPatched += 1;
  }

  const independentCount = Number(pack.independentPracticeItems) || ((Number(pack.sourceQuestionItems) || 200) + (Number(pack.assistantAuthoredIndependentItems) || 0));
  const kernels = new Set(pack.items.slice(0, independentCount).map(contentKernel)).size;
  const gap = 500 - kernels;
  if ('distinctIndependentContentKernels' in pack) pack.distinctIndependentContentKernels = kernels;
  if ('distinctSourceContentKernels' in pack) pack.distinctSourceContentKernels = kernels;
  if ('newIndependentItemsNeeded' in pack) pack.newIndependentItemsNeeded = gap;
  if (pack.assistantReview && typeof pack.assistantReview === 'object') {
    if ('distinctIndependentContentKernels' in pack.assistantReview) pack.assistantReview.distinctIndependentContentKernels = kernels;
    if ('newIndependentItemsNeeded' in pack.assistantReview) pack.assistantReview.newIndependentItemsNeeded = gap;
  }

  writeGeneratedFile(packPath, JSON.stringify(pack, null, 2) + '\n', 'utf8');
  writeGeneratedFile(itemsPath, JSON.stringify(itemsArr, null, 2) + '\n', 'utf8');
  console.log(`Patched ${stem}: ${Object.keys(itemPatches).length} source/batch3 items (kernels=${kernels}, gap=${gap})`);
}

// Keep dev-tools/authored/school_counselor_5422_batch3.json, its review binding, and pack artifactBindings in sync
const scB3Path = path.join(root, 'dev-tools', 'authored', 'school_counselor_5422_batch3.json');
const scB3ReviewPath = path.join(root, 'dev-tools', 'authored', 'school_counselor_5422_batch3.review.json');
const scB3 = JSON.parse(fs.readFileSync(scB3Path, 'utf8'));
const scB3List = Array.isArray(scB3) ? scB3 : scB3.items;
const b3Item = scB3List.find((x) => x.id === 'sc5422-b3-079');
if (!b3Item) throw new Error('Missing sc5422-b3-079 in school_counselor_5422_batch3.json');
applyPatchToItem(b3Item, PATCHES.school_counselor_5422['sc5422-b3-079']);
const scB3Text = JSON.stringify(scB3, null, 2) + '\n';
writeGeneratedFile(scB3Path, scB3Text, 'utf8');

const scB3Sha = sha256(Buffer.from(scB3Text, 'utf8'));
const scB3Review = JSON.parse(fs.readFileSync(scB3ReviewPath, 'utf8'));
if (scB3Review.artifactBinding && typeof scB3Review.artifactBinding === 'object') {
  scB3Review.artifactBinding.sha256 = scB3Sha;
}
if ('sourceSha256' in scB3Review) {
  scB3Review.sourceSha256 = scB3Sha;
}
writeGeneratedFile(scB3ReviewPath, JSON.stringify(scB3Review, null, 2) + '\n', 'utf8');

const scPackPath = path.join(root, 'test_prep', 'school_counselor_5422_pack.json');
const scPack = JSON.parse(fs.readFileSync(scPackPath, 'utf8'));
for (const batch of (scPack.assistantReview?.independentBatchEvidence || [])) {
  for (const binding of (batch.artifactBindings || [])) {
    if (binding.file === 'school_counselor_5422_batch3.json') {
      binding.sha256 = scB3Sha;
    }
  }
}
writeGeneratedFile(scPackPath, JSON.stringify(scPack, null, 2) + '\n', 'utf8');
console.log(`Updated school_counselor_5422_batch3.json, review & pack artifactBinding sha256 -> ${scB3Sha.slice(0, 12)}...`);
console.log(`Total Priority-1 frozen/batch3 exam items repaired: ${totalPatched}`);
