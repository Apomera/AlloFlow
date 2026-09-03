#!/usr/bin/env node
/**
 * Build memory_aid_module.js from memory_aid_source.jsx.
 *
 * The module owns both the sidebar configuration panel and the interactive
 * resource view so the AlloFlow host only carries registration and state.
 */

const { execSync } = require('child_process');
const { transformSync } = require('esbuild');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'memory_aid_source.jsx');
const OUTPUT = path.join(ROOT, 'memory_aid_module.js');
const PUBLIC = path.join(ROOT, 'desktop', 'web-app', 'public', 'memory_aid_module.js');
const CHECK_ONLY = process.argv.includes('--check');

if (!fs.existsSync(SOURCE)) {
  console.error('[MemoryAid] Source not found:', SOURCE);
  process.exit(1);
}

let compiled = '';
try {
  compiled = transformSync('/* global React */\n' + fs.readFileSync(SOURCE, 'utf8'), {
    loader: 'jsx',
    format: 'esm',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    target: 'es2020',
  }).code.replace(/\/\*.*global.*\*\/\n/g, '').trim();
} catch (error) {
  console.error('[MemoryAid] esbuild compilation failed');
  console.error(error && error.message ? error.message : error);
  process.exit(1);
}

const outputCode = [
  '/** AlloFlow Memory Aid Studio module. Generated from memory_aid_source.jsx. */',
  '(function() {',
  "'use strict';",
  "if (window.AlloModules && window.AlloModules.MemoryAidModule) { console.log('[CDN] MemoryAidModule already loaded, skipping'); return; }",
  'var React = window.React;',
  "if (!React) { console.error('[MemoryAid] React not found on window'); return; }",
  compiled,
  'window.AlloModules = window.AlloModules || {};',
  'window.AlloModules.MemoryAidPanel = MemoryAidPanel;',
  'window.AlloModules.MemoryAidView = MemoryAidView;',
  'window.AlloModules.MemoryAid = {',
  '  MEMORY_AID_TYPES: MEMORY_AID_TYPES,',
  '  MEMORY_AID_MODES: MEMORY_AID_MODES,',
  '  MEMORY_AID_REFLECTION_LEVELS: MEMORY_AID_REFLECTION_LEVELS,',
  '  MEMORY_AID_VISUAL_REVIEW_STATUSES: MEMORY_AID_VISUAL_REVIEW_STATUSES,',
  '  MEMORY_AID_VISUAL_SOURCES: MEMORY_AID_VISUAL_SOURCES,',
  '  MEMORY_AID_PRACTICE_CONFIDENCE: MEMORY_AID_PRACTICE_CONFIDENCE,',
  '  MEMORY_AID_PRACTICE_CHECKS: MEMORY_AID_PRACTICE_CHECKS,',
  '  MEMORY_AID_PRACTICE_RESPONSE_MODES: MEMORY_AID_PRACTICE_RESPONSE_MODES,',
  '  exportRules: MEMORY_AID_EXPORT_RULES,',
  '  _testing: {',
  '    normalizeMemoryAidTypes: normalizeMemoryAidTypes,',
  '    normalizeMemoryAidCard: normalizeMemoryAidCard,',
  '    normalizeMemoryAidCards: normalizeMemoryAidCards,',
  '    normalizeMemoryAidData: normalizeMemoryAidData,',
  '    normalizeMemoryAidImage: normalizeMemoryAidImage,',
  '    normalizeMemoryAidVisualSource: normalizeMemoryAidVisualSource,',
  '    memoryAidImageBase64: memoryAidImageBase64,',
  '    memoryAidImageMime: memoryAidImageMime,',
  '    buildMemoryAidVisualPrompt: buildMemoryAidVisualPrompt,',
  '    normalizeMemoryAidHookFact: normalizeMemoryAidHookFact,',
  '    normalizeMemoryAidFactCheck: normalizeMemoryAidFactCheck,',
  '    buildMemoryAidFactCheckPrompt: buildMemoryAidFactCheckPrompt,',
  '    parseMemoryAidFactCheck: parseMemoryAidFactCheck,',
  '    buildMemoryAidVisualEditPrompt: buildMemoryAidVisualEditPrompt,',
  '    buildMemoryAidVisualCheckPrompt: buildMemoryAidVisualCheckPrompt,',
  '    normalizeMemoryAidVisualCheck: normalizeMemoryAidVisualCheck,',
  '    parseMemoryAidVisualCheck: parseMemoryAidVisualCheck,',
  '    normalizeMemoryAidVisualReview: normalizeMemoryAidVisualReview,',
  '    buildMemoryAidVisualAlt: buildMemoryAidVisualAlt,',
  '    memoryAidVisualAltReady: memoryAidVisualAltReady,',
  '    buildMemoryAidReadAloudText: buildMemoryAidReadAloudText,',
  '    memoryAidAudioFilename: memoryAidAudioFilename,',
  '    memoryAidFeedbackReady: memoryAidFeedbackReady,',
  '    memoryAidPracticeCue: memoryAidPracticeCue,',
  '    memoryAidPracticeCueKey: memoryAidPracticeCueKey,',
  '    memoryAidPracticeFactKey: memoryAidPracticeFactKey,',
  '    memoryAidPracticeBasis: memoryAidPracticeBasis,',
  '    normalizeMemoryAidPracticeAttempt: normalizeMemoryAidPracticeAttempt,',
  '    normalizeMemoryAidPracticeAttempts: normalizeMemoryAidPracticeAttempts,',
  '    memoryAidPracticeReady: memoryAidPracticeReady,',
  '    createMemoryAidPracticeAttempt: createMemoryAidPracticeAttempt,',
  '    memoryAidPracticeSummary: memoryAidPracticeSummary,',
  '    stripMemoryAidPracticeEvidence: stripMemoryAidPracticeEvidence,',
  '    memoryAidPracticeResourceKey: memoryAidPracticeResourceKey,',
  '    memoryAidPrivatePracticeKey: memoryAidPrivatePracticeKey,',
  '    loadMemoryAidPrivatePractice: loadMemoryAidPrivatePractice,',
  '    saveMemoryAidPrivatePractice: saveMemoryAidPrivatePractice,',
  '    mutateMemoryAidPrivatePractice: mutateMemoryAidPrivatePractice,',
  '    applyPrivatePracticeMutation: _maApplyPrivatePracticeMutation,',
  '    normalizePrivatePracticePayload: _maNormalizePrivatePracticePayload,',
  '    memoryAidLastPracticeSaveScope: memoryAidLastPracticeSaveScope,',
  '    memoryAidPracticeRevisionState: memoryAidPracticeRevisionState,',
  '    buildMemoryAidPracticeCueText: buildMemoryAidPracticeCueText,',
  '    applyMemoryAidCardPatch: applyMemoryAidCardPatch,',
  '    buildMemoryAidFeedbackPrompt: buildMemoryAidFeedbackPrompt,',
  '    parseMemoryAidFeedback: parseMemoryAidFeedback,',
  '    messageKeys: MEMORY_AID_MESSAGE_KEYS,',
  '    modeForIndex: _maModeForIndex',
  '  }',
  '};',
  'window.AlloModules.MemoryAidModule = true;',
  "console.log('[CDN] MemoryAidModule loaded');",
  '})();',
  '',
].join('\n');

if (CHECK_ONLY) {
  const stale = [OUTPUT, PUBLIC].filter(file => {
    try { return fs.readFileSync(file, 'utf8') !== outputCode; } catch (_) { return true; }
  });
  if (stale.length) {
    console.error('[MemoryAid] Generated module is stale: ' + stale.map(file => path.relative(ROOT, file)).join(', '));
    console.error('[MemoryAid] Run: node _build_memory_aid_module.js');
    process.exit(1);
  }
  console.log('[MemoryAid] Source and generated modules are byte-for-byte fresh.');
  process.exit(0);
}

fs.writeFileSync(OUTPUT, outputCode, 'utf8');
fs.mkdirSync(path.dirname(PUBLIC), { recursive: true });
fs.writeFileSync(PUBLIC, outputCode, 'utf8');

try {
  execSync('node -c "' + OUTPUT + '"', { stdio: 'pipe' });
} catch (error) {
  console.error('[MemoryAid] syntax check failed');
  console.error((error.stderr && error.stderr.toString()) || error.message);
  process.exit(1);
}

console.log('[MemoryAid] Built root and public modules (' + outputCode.split('\n').length + ' lines)');
