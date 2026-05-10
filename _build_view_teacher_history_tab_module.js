#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'view_teacher_history_tab_source.jsx');
const OUTPUT = path.join(ROOT, 'view_teacher_history_tab_module.js');
const TMP = path.join(ROOT, '_tmp_teacher_history_tab_entry.jsx');
if (!fs.existsSync(SOURCE)) { console.error('Source not found:', SOURCE); process.exit(1); }
const source = fs.readFileSync(SOURCE, 'utf-8');
const entry = `/* global React */\n\n${source}\n\nwindow.__teacherHistoryTabExports = { TeacherHistoryTab };\n`;
fs.writeFileSync(TMP, entry, 'utf-8');
console.log('Compiling view_teacher_history_tab_source.jsx...');
try {
    execSync(`npx esbuild "${TMP}" --bundle=false --format=esm --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment --outfile="${TMP}.compiled.js" --target=es2020`, { cwd: ROOT, stdio: 'inherit' });
} catch (e) { console.error('esbuild failed'); try { fs.unlinkSync(TMP); } catch(_) {} process.exit(1); }
const compiled = fs.readFileSync(TMP + '.compiled.js', 'utf-8')
    .replace(/\/\*.*global.*\*\/\n/g, '')
    .replace(/window\.__teacherHistoryTabExports\s*=\s*\{[^}]+\};?\s*/, '')
    .trim();
fs.unlinkSync(TMP);
fs.unlinkSync(TMP + '.compiled.js');
const outputCode = `/**
 * AlloFlow Teacher History Tab Module
 * Auto-generated. Source: view_teacher_history_tab_source.jsx
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.TeacherHistoryTab) {
    console.log('[CDN] TeacherHistoryTab already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[TeacherHistoryTab] React not found on window'); return; }

${compiled}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.TeacherHistoryTab = { TeacherHistoryTab: TeacherHistoryTab };
  console.log('[CDN] TeacherHistoryTab loaded');
})();
`;
fs.writeFileSync(OUTPUT, outputCode, 'utf-8');
console.log(`Built ${OUTPUT} (${outputCode.split('\n').length} lines)`);
