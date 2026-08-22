#!/usr/bin/env node
// check_da_clinical_isolation.cjs — clinical-validity gate enforcing that
// Dynamic Assessment supports inherit NO ambient lesson context.
//
// Background:
//   A DA probe measures one student's MODIFIABILITY on one construct. DA
//   supports (visual organizers, sentence frames) are generated through the
//   SHARED dispatcher that the main lesson app uses, and the lazy DA host
//   adapter callbacks opt out of ambient context by passing
//   { isolatedContext: true } into handleGenerate. If that opt-out does not
//   work, the support teaches outside
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
const HOST_SHELLS = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];
const HOST_ADAPTERS = [
  'dynamic_assessment_module.js',
  'desktop/web-app/public/dynamic_assessment_module.js',
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

// ── 4. The app shell must still wire the extracted host adapter. ──
// The resource callbacks moved out of AlloFlowANTI.txt in August 2026 so the
// Dynamic Assessment gate would remain a compact lazy-module seam. The shell
// now owns only dependency injection; the adapter module owns the callbacks.
for (const rel of HOST_SHELLS) {
  const text = read(rel);
  if (!text) continue;
  if (!text.includes('DA && DA.HostAdapter')) {
    errors.push(`${rel} no longer resolves DA.HostAdapter at the lazy-module boundary.`);
  }
  if (!text.includes('DynamicAssessment: DA')) {
    errors.push(`${rel} no longer passes the loaded DynamicAssessment component into its host adapter.`);
  }
  if (!/host:\s*\{[\s\S]{0,1600}\bhandleGenerate,/.test(text)) {
    errors.push(`${rel} no longer injects handleGenerate into the Dynamic Assessment host contract.`);
  }
  if (text.includes('onGenerateVisualOrganizer: async') || text.includes('onGenerateSentenceFrames: async')) {
    errors.push(`${rel} contains inline DA generation callbacks again; keep clinical-isolation ownership in the lazy host adapter.`);
  }
}

// ── 5. Each extracted callback must opt in independently. ──
// A total token count alone is insufficient: both flags could accidentally land
// in one callback while the other silently resumes inheriting ambient context.
for (const rel of HOST_ADAPTERS) {
  const text = read(rel);
  if (!text) continue;
  if (!text.includes('function DynamicAssessmentHostAdapter(props)') ||
      !text.includes('DynamicAssessment.HostAdapter = DynamicAssessmentHostAdapter')) {
    errors.push(`${rel} does not publish the extracted DynamicAssessmentHostAdapter.`);
    continue;
  }

  const visualStart = text.indexOf('onGenerateVisualOrganizer: async');
  const sentenceComment = text.indexOf('// Sentence-frames host callback', visualStart);
  const sentenceStart = text.indexOf('onGenerateSentenceFrames: async', sentenceComment);
  const resourceStart = text.indexOf('onOpenResource:', sentenceStart);
  if (visualStart < 0 || sentenceComment < 0 || sentenceStart < 0 || resourceStart < 0) {
    errors.push(`${rel} is missing a bounded visual-organizer or sentence-frames host callback.`);
    continue;
  }

  const visualCallback = text.slice(visualStart, sentenceComment);
  const sentenceCallback = text.slice(sentenceStart, resourceStart);
  if (!/const cfg\s*=\s*\{\s*isolatedContext:\s*true\s*\}/.test(visualCallback) ||
      !/handleGenerate\([\s\S]*?\bcfg\b[\s\S]*?\)/.test(visualCallback)) {
    errors.push(`${rel} visual-organizer callback no longer passes isolatedContext: true to handleGenerate.`);
  }
  if (!/handleGenerate\([\s\S]*isolatedContext:\s*true/.test(sentenceCallback)) {
    errors.push(`${rel} sentence-frames callback no longer passes isolatedContext: true to handleGenerate.`);
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

console.log(`✓ check_da_clinical_isolation: ${GUARDS.length} ambient channels guarded on _isolatedContext, ${COPIES.length} dispatcher copies carry it, ${HOST_SHELLS.length} host shells wire ${HOST_ADAPTERS.length} isolated adapter copies.`);
