#!/usr/bin/env node
// check_da_clinical_isolation.cjs — clinical-validity gate enforcing that
// Dynamic Assessment supports inherit NO ambient lesson context.
//
// Background:
//   A DA probe measures one student's MODIFIABILITY on one construct. DA
//   supports (visual organizers, sentence frames) are generated through the
//   SHARED dispatcher that the main lesson app uses, and the DA host callbacks
//   opt out of ambient context by passing { isolatedContext: true } into
//   handleGenerate. If that opt-out does not work, the support teaches outside
//   content — different topic, different vocabulary, the teacher's lesson
//   standards, the roster's differentiation groups, the student's declared
//   interests — and the assessment is confounded. That is a validity failure,
//   not a cosmetic one.
//
// The defect this gate exists to prevent (found 2026-07-27):
//   The host had passed { isolatedContext: true } since the Phase-4 visual
//   organizer work, under a comment promising the dispatcher "suppresses ALL
//   ambient lesson context (Lesson DNA, standards, differentiation, selected
//   concepts, source topic)". The token `isolatedContext` appeared ZERO times
//   in generate_dispatcher_source.jsx. The flag was passed and read by nobody.
//   Every DA support silently inherited the open lesson. Nothing failed, no
//   test went red, and the prose comment asserted the opposite of the truth.
//
// The rule:
//   Each ambient channel must be suppressed at its SINGLE computation point in
//   generate_dispatcher_source.jsx, guarded on _isolatedContext. Suppressing at
//   the ~20 prompt-template sites instead would be unenforceable — missing one
//   is invisible. A value that is empty at the source cannot leak downstream.
//
// Why a deploy gate and not just the vitest suite:
//   tests/da_clinical_isolation.test.js drives the real dispatcher and is the
//   substantive proof. But this repo carries a large pre-existing red-test
//   population, so a red vitest run does not block a deploy. This does.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'generate_dispatcher_source.jsx');
const COPIES = [
  'generate_dispatcher_source.jsx',
  'generate_dispatcher_module.js',
  'desktop/web-app/public/generate_dispatcher_module.js',
];
const HOSTS = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];

const errors = [];
const read = (rel) => {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) { errors.push(`missing file: ${rel}`); return ''; }
  return fs.readFileSync(p, 'utf8');
};

// ── 1. The flag must be read, and every ambient channel guarded on it. ──
// Each entry: [human name, regex that must match in the source].
const GUARDS = [
  ['isolation flag is derived from configOverride',
    /_isolatedContext\s*=\s*!!\(\s*configOverride\s*&&\s*configOverride\.isolatedContext\s*\)/],
  ['lesson DNA (golden thread)', /_isolatedContext \? '' : formatLessonDNA/],
  ['lesson DNA value', /_isolatedContext \? null :/],
  ['target standards', /_isolatedContext \? '' : _ambientStandardsPromptString/],
  ['selected concepts', /_isolatedContext \? \[\] : _ambientSelectedConcepts/],
  ['student interests', /_isolatedContext \? \[\] : _ambientStudentInterests/],
  ['roster differentiation', /_isolatedContext \? '' : getGroupDifferentiationContext/],
  ["main-app per-tool custom instructions", /\?\s*configOverride\.customInstructions\s*\n?\s*:\s*_isolatedContext \? '' :/],
];

const src = read(COPIES[0]);
for (const [name, re] of GUARDS) {
  if (!re.test(src)) {
    errors.push(`ambient channel NOT guarded: ${name}\n      expected to match: ${re}`);
  }
}

// The timeline branch reaches for the open lesson's topic TWICE — once in the
// effCustomInstructions ternary and again in `effectiveTopic`, which re-derives
// it from scratch. Guarding only the first leaves the leak wide open (that is
// exactly what happened on the first pass at this fix), and a presence-only
// check cannot tell the two apart. Require both.
const timelineGuards = (src.match(/_isolatedContext \? '' : \(timelineTopic \|\| sourceTopic\)/g) || []).length;
if (timelineGuards < 2) {
  errors.push(`timeline ambient topic fallback guarded ${timelineGuards}/2 times. Both the effCustomInstructions ternary AND the effectiveTopic line must be guarded — each independently re-derives the open lesson's topic.`);
}

// ── 2. The renamed raw deps must be read EXACTLY once each — in their guard. ──
// A second read would be an ungated path back to the ambient value.
for (const raw of ['_ambientStandardsPromptString', '_ambientSelectedConcepts', '_ambientStudentInterests']) {
  const n = src.split(raw).length - 1;
  if (n !== 2) {
    errors.push(`${raw} appears ${n}x in the source (expected 2: the destructure alias + its single guarded read). A third occurrence is an ungated path to ambient context.`);
  }
}

// ── 3. Every shipped copy must carry the guard. ──
for (const rel of COPIES) {
  const text = read(rel);
  if (text && !text.includes('_isolatedContext')) {
    errors.push(`${rel} does NOT carry the isolation guard — rebuild with 'node _build_generate_dispatcher_module.js' and sync the public copy.`);
  }
}

// ── 4. The host must still opt in. A guard nobody triggers is decorative. ──
for (const rel of HOSTS) {
  const text = read(rel);
  if (!text) continue;
  const n = (text.match(/isolatedContext: true/g) || []).length;
  if (n < 2) {
    errors.push(`${rel} passes isolatedContext only ${n}x (expected >= 2: the visual-organizer and sentence-frames DA callbacks). If a DA support kind stopped opting in, it is now inheriting the open lesson.`);
  }
}

if (errors.length) {
  console.error('\n✗ check_da_clinical_isolation FAILED\n');
  for (const e of errors) console.error('  • ' + e);
  console.error('\n  DA supports must not inherit the open lesson (topic, vocabulary,');
  console.error('  standards, differentiation, interests). See the header of this file');
  console.error('  and tests/da_clinical_isolation.test.js.\n');
  process.exit(1);
}

console.log(`✓ check_da_clinical_isolation: ${GUARDS.length} ambient channels guarded on _isolatedContext, ${COPIES.length} dispatcher copies carry it, ${HOSTS.length} hosts still opt in.`);
