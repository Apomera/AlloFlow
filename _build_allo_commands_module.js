#!/usr/bin/env node
/**
 * Builder for allo_commands_module.js — same pattern as
 * _build_onboarding_coach_module.js. Compiles the JSX source via esbuild
 * and wraps it in the AlloModules registration IIFE.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'allo_commands_source.jsx');
const OUTPUT = path.join(ROOT, 'allo_commands_module.js');
const MIRROR = path.join(ROOT, 'desktop/web-app', 'public', 'allo_commands_module.js');
const TMP = path.join(ROOT, '_tmp_allo_commands_entry.jsx');

if (!fs.existsSync(SOURCE)) { console.error('Source not found:', SOURCE); process.exit(1); }
const source = fs.readFileSync(SOURCE, 'utf-8');
const entry = `/* global React */\n\n${source}\n\nwindow.__alloCommandsExports = { AlloCommandPalette, AlloCommandProgress, buildAlloCommands, getCommandAudience, getCommandAvailability, getLocalCommandInsights, mergeCommandProgressItems, scoreCommand, routeUtterance, executeCommand, runCommandById, findReadingMatches, normalizeReadingRequest, readingMatchReasons, readingMatchWhyText, createVoiceLoop, looksMultiStep, getCommandContract, sanitizeCommandParams, validatePlan, planUtterance, runPlan };\n`;
fs.writeFileSync(TMP, entry, 'utf-8');
console.log('[AlloCommands] Compiling allo_commands_source.jsx...');
try {
    execSync(`npx esbuild "${TMP}" --bundle=false --format=esm --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment --outfile="${TMP}.compiled.js" --target=es2020`, { cwd: ROOT, stdio: 'inherit' });
} catch (e) { console.error('esbuild failed'); try { fs.unlinkSync(TMP); } catch(_) {} process.exit(1); }
const compiled = fs.readFileSync(TMP + '.compiled.js', 'utf-8')
    .replace(/\/\*.*global.*\*\/\n/g, '')
    .replace(/window\.__alloCommandsExports\s*=\s*\{[^}]+\};?\s*/, '')
    .trim();
fs.unlinkSync(TMP);
fs.unlinkSync(TMP + '.compiled.js');
const outputCode = `/**
 * AlloFlow AlloCommands Module (Agentic AlloBot S0)
 * Auto-generated. Source: allo_commands_source.jsx
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.AlloCommands) {
    console.log('[CDN] AlloCommands already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[AlloCommands] React not found on window'); return; }

${compiled}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.AlloCommands = { AlloCommandPalette: AlloCommandPalette, AlloCommandProgress: AlloCommandProgress, buildAlloCommands: buildAlloCommands, getCommandAudience: getCommandAudience, getCommandAvailability: getCommandAvailability, getLocalCommandInsights: getLocalCommandInsights, mergeCommandProgressItems: mergeCommandProgressItems, scoreCommand: scoreCommand, routeUtterance: routeUtterance, executeCommand: executeCommand, runCommandById: runCommandById, findReadingMatches: findReadingMatches, normalizeReadingRequest: normalizeReadingRequest, readingMatchReasons: readingMatchReasons, readingMatchWhyText: readingMatchWhyText, createVoiceLoop: createVoiceLoop, looksMultiStep: looksMultiStep, getCommandContract: getCommandContract, sanitizeCommandParams: sanitizeCommandParams, validatePlan: validatePlan, planUtterance: planUtterance, runPlan: runPlan };
  console.log('[CDN] AlloCommands loaded');
})();
`;
fs.writeFileSync(OUTPUT, outputCode, 'utf-8');
fs.writeFileSync(MIRROR, outputCode, 'utf-8');
console.log(`[AlloCommands] Built ${OUTPUT} (${outputCode.split('\n').length} lines)`);
console.log(`[AlloCommands] Mirrored to ${MIRROR}`);
