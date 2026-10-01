#!/usr/bin/env node
/**
 * Builder for onboarding_coach_module.js — same pattern as
 * _build_view_visual_supports_modal_module.js. Compiles the JSX source via
 * esbuild and wraps it in the AlloModules registration IIFE.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'onboarding_coach_source.jsx');
const OUTPUT = path.join(ROOT, 'onboarding_coach_module.js');
const MIRROR = path.join(ROOT, 'desktop/web-app', 'public', 'onboarding_coach_module.js');
const TMP = path.join(ROOT, '_tmp_onboarding_coach_entry.jsx');

if (!fs.existsSync(SOURCE)) { console.error('Source not found:', SOURCE); process.exit(1); }
const source = fs.readFileSync(SOURCE, 'utf-8');
const entry = `/* global React */\n\n${source}\n\nwindow.__onboardingCoachExports = { OnboardingCoach };\n`;
fs.writeFileSync(TMP, entry, 'utf-8');
console.log('[OnboardingCoach] Compiling onboarding_coach_source.jsx...');
try {
    execSync(`npx esbuild "${TMP}" --bundle=false --format=esm --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment --outfile="${TMP}.compiled.js" --target=es2020`, { cwd: ROOT, stdio: 'inherit' });
} catch (e) { console.error('esbuild failed'); try { fs.unlinkSync(TMP); } catch(_) {} process.exit(1); }
const compiled = fs.readFileSync(TMP + '.compiled.js', 'utf-8')
    .replace(/\/\*.*global.*\*\/\n/g, '')
    .replace(/window\.__onboardingCoachExports\s*=\s*\{[^}]+\};?\s*/, '')
    .trim();
fs.unlinkSync(TMP);
fs.unlinkSync(TMP + '.compiled.js');
const outputCode = `/**
 * AlloFlow OnboardingCoach Module (Tier 1)
 * Auto-generated. Source: onboarding_coach_source.jsx
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.OnboardingCoach) {
    console.log('[CDN] OnboardingCoach already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[OnboardingCoach] React not found on window'); return; }

${compiled}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.OnboardingCoach = { OnboardingCoach: OnboardingCoach };
  console.log('[CDN] OnboardingCoach loaded');
})();
`;
fs.writeFileSync(OUTPUT, outputCode, 'utf-8');
fs.writeFileSync(MIRROR, outputCode, 'utf-8');
console.log(`[OnboardingCoach] Built ${OUTPUT} (${outputCode.split('\n').length} lines)`);
console.log(`[OnboardingCoach] Mirrored to ${MIRROR}`);
