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
  '  _testing: {',
  '    normalizeMemoryAidTypes: normalizeMemoryAidTypes,',
  '    normalizeMemoryAidCard: normalizeMemoryAidCard,',
  '    normalizeMemoryAidData: normalizeMemoryAidData,',
  '    normalizeMemoryAidImage: normalizeMemoryAidImage,',
  '    normalizeMemoryAidVisualSource: normalizeMemoryAidVisualSource,',
  '    memoryAidImageBase64: memoryAidImageBase64,',
  '    memoryAidImageMime: memoryAidImageMime,',
  '    buildMemoryAidVisualPrompt: buildMemoryAidVisualPrompt,',
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
  '    memoryAidPracticeBasis: memoryAidPracticeBasis,',
  '    normalizeMemoryAidPracticeAttempt: normalizeMemoryAidPracticeAttempt,',
  '    normalizeMemoryAidPracticeAttempts: normalizeMemoryAidPracticeAttempts,',
  '    memoryAidPracticeReady: memoryAidPracticeReady,',
  '    createMemoryAidPracticeAttempt: createMemoryAidPracticeAttempt,',
  '    memoryAidPracticeSummary: memoryAidPracticeSummary,',
  '    buildMemoryAidPracticeCueText: buildMemoryAidPracticeCueText,',
  '    applyMemoryAidCardPatch: applyMemoryAidCardPatch,',
  '    buildMemoryAidFeedbackPrompt: buildMemoryAidFeedbackPrompt,',
  '    parseMemoryAidFeedback: parseMemoryAidFeedback,',
  '    modeForIndex: _maModeForIndex',
  '  }',
  '};',
  'window.AlloModules.MemoryAidModule = true;',
  "console.log('[CDN] MemoryAidModule loaded');",
  '})();',
  '',
].join('\n');

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
