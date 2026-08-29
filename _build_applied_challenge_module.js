#!/usr/bin/env node
/** Build applied_challenge_module.js from applied_challenge_source.jsx. */

const { execFileSync } = require('child_process');
const { transformSync } = require('esbuild');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'applied_challenge_source.jsx');
const OUTPUT = path.join(ROOT, 'applied_challenge_module.js');
const PUBLIC = path.join(ROOT, 'desktop', 'web-app', 'public', 'applied_challenge_module.js');

if (!fs.existsSync(SOURCE)) {
  console.error('[AppliedChallenge] Source not found:', SOURCE);
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
  console.error('[AppliedChallenge] esbuild compilation failed');
  console.error(error && error.message ? error.message : error);
  process.exit(1);
}

const outputCode = [
  '/** AlloFlow Applied Challenge Studio module. Generated from applied_challenge_source.jsx. */',
  '(function() {',
  '\'use strict\';',
  'if (window.AlloModules && window.AlloModules.AppliedChallengeModule) { return; }',
  'var React = window.React;',
  'if (!React) { console.error(\'[AppliedChallenge] React not found on window\'); return; }',
  compiled,
  'window.AlloModules = window.AlloModules || {};',
  'window.AlloModules.AppliedChallengePanel = AppliedChallengePanel;',
  'window.AlloModules.AppliedChallengeView = AppliedChallengeView;',
  'window.AlloModules.AppliedChallenge = {',
  '  APPLIED_CHALLENGE_FAMILIES: APPLIED_CHALLENGE_FAMILIES,',
  '  APPLIED_CHALLENGE_AGENCY_MODES: APPLIED_CHALLENGE_AGENCY_MODES,',
  '  APPLIED_CHALLENGE_SCOPES: APPLIED_CHALLENGE_SCOPES,',
  '  APPLIED_CHALLENGE_WORKSPACE_PHASES: APPLIED_CHALLENGE_WORKSPACE_PHASES,',
  '  _testing: {',
  '    normalizeAppliedChallengeFamily: normalizeAppliedChallengeFamily,',
  '    normalizeAppliedChallengeAgencyMode: normalizeAppliedChallengeAgencyMode,',
  '    normalizeAppliedChallengeScope: normalizeAppliedChallengeScope,',
  '    normalizeAppliedChallengeBrief: normalizeAppliedChallengeBrief,',
  '    normalizeAppliedChallengeSupports: normalizeAppliedChallengeSupports,',
  '    normalizeAppliedChallengeWorkspace: normalizeAppliedChallengeWorkspace,',
  '    normalizeAppliedChallengeData: normalizeAppliedChallengeData,',
  '    appliedChallengeFeedbackReady: appliedChallengeFeedbackReady,',
  '    appliedChallengeWorkspacePromptSnapshot: appliedChallengeWorkspacePromptSnapshot,',
  '    appliedChallengeCoachingFingerprint: appliedChallengeCoachingFingerprint,',
  '    appliedChallengeWorkspaceProgress: appliedChallengeWorkspaceProgress,',
  '    buildAppliedChallengeHintPrompt: buildAppliedChallengeHintPrompt,',
  '    buildAppliedChallengeFeedbackPrompt: buildAppliedChallengeFeedbackPrompt,',
  '    parseAppliedChallengeHint: parseAppliedChallengeHint,',
  '    parseAppliedChallengeFeedback: parseAppliedChallengeFeedback,',
  '    finalizeAppliedChallengeFeedback: finalizeAppliedChallengeFeedback,',
  '    appliedChallengeVisiblePhases: appliedChallengeVisiblePhases',
  '  }',
  '};',
  'window.AlloModules.AppliedChallengeModule = true;',
  '})();',
  '',
].join('\n');

fs.writeFileSync(OUTPUT, outputCode, 'utf8');
fs.mkdirSync(path.dirname(PUBLIC), { recursive: true });
fs.writeFileSync(PUBLIC, outputCode, 'utf8');

try {
  execFileSync(process.execPath, ['-c', OUTPUT], { stdio: 'pipe' });
} catch (error) {
  console.error('[AppliedChallenge] syntax check failed');
  console.error((error.stderr && error.stderr.toString()) || error.message);
  process.exit(1);
}

console.log('[AppliedChallenge] Built root and public modules (' + outputCode.split('\n').length + ' lines)');
