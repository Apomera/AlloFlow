#!/usr/bin/env node
/**
 * Build teacher_module.js -- preserves the hand-written IIFE setup header
 * (icon/React/Firebase shims) and replaces only the body (between header
 * end and registration tail) with esbuild-compiled output of teacher_source.jsx.
 *
 * Header-boundary contract (May 12 2026 fix):
 *   The hand-written header ends with this exact line (in a comment block
 *   that the build NEVER moves or modifies):
 *     // TEACHER COMPONENTS (JSX pre-transformed by esbuild)
 *   Everything BEFORE that line is the preserved header.
 *   Everything AFTER it gets replaced with the freshly compiled source.
 *
 *   Previous versions used `var|const|let RosterKeyPanel` as the marker.
 *   That regex matched the FIRST occurrence in the existing module — but
 *   each rebuild appended a copy of the source's top-of-file declarations
 *   (alloSaveFocus / alloRestoreFocus / _alloFocusTrigger) into the
 *   "header" because those decls live in source.jsx BEFORE RosterKeyPanel.
 *   Result: each rebuild grew the file by ~13 lines of duplicates. Six
 *   accumulated copies were detected on May 12 2026 and removed in the
 *   same commit that landed this marker change.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'teacher_source.jsx');
const OUTPUT = path.join(ROOT, 'teacher_module.js');
const DEPLOY_OUT = path.join(ROOT, 'prismflow-deploy', 'public', 'teacher_module.js');
const TMP = path.join(ROOT, '_tmp_teacher_entry.jsx');
const TMP_COMPILED = TMP + '.compiled.js';

const existingModule = fs.readFileSync(OUTPUT, 'utf-8');
// Stable boundary marker — see header comment for why.
const headerEndMarker = /^\s*\/\/ TEACHER COMPONENTS \(JSX pre-transformed by esbuild\)\s*$/m;
const m = headerEndMarker.exec(existingModule);
if (!m) {
  console.error('Could not locate "// TEACHER COMPONENTS" header/body boundary marker.');
  console.error('teacher_module.js must contain this line verbatim somewhere in its header:');
  console.error('  // TEACHER COMPONENTS (JSX pre-transformed by esbuild)');
  process.exit(1);
}
// Header = everything up to and including the marker line + trailing newline.
const markerEnd = existingModule.indexOf('\n', m.index + m[0].length);
const header = existingModule.slice(0, markerEnd === -1 ? m.index + m[0].length : markerEnd + 1);
// Tail: registration + IIFE close
const tailMatch = existingModule.match(/window\.AlloModules\.TeacherModule = true;[\s\S]*$/);
if (!tailMatch) {
  console.error('Could not locate registration tail in teacher_module.js');
  process.exit(1);
}
const tail = '\n' + tailMatch[0];

const source = fs.readFileSync(SOURCE, 'utf-8');
const entry = `\n/* global React, useState, useEffect, useRef, useCallback, useMemo, useContext */\n${source}\n`;
fs.writeFileSync(TMP, entry, 'utf-8');

console.log('Compiling teacher_source.jsx with esbuild...');
try {
  execSync(
    `npx esbuild "${TMP}" --bundle=false --format=esm --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment --outfile="${TMP_COMPILED}" --target=es2020`,
    { cwd: ROOT, stdio: 'inherit' }
  );
} catch (e) {
  console.error('esbuild compilation failed');
  try { fs.unlinkSync(TMP); } catch (_) {}
  process.exit(1);
}

const compiled = fs.readFileSync(TMP_COMPILED, 'utf-8')
  .replace(/\/\*.*global.*\*\/\n/g, '')
  .trim();

try { fs.unlinkSync(TMP); } catch (_) {}
try { fs.unlinkSync(TMP_COMPILED); } catch (_) {}

const outputCode = header + compiled + tail;

fs.writeFileSync(OUTPUT, outputCode, 'utf-8');
try {
  if (!fs.existsSync(path.dirname(DEPLOY_OUT))) fs.mkdirSync(path.dirname(DEPLOY_OUT), { recursive: true });
  fs.writeFileSync(DEPLOY_OUT, outputCode, 'utf-8');
} catch (e) { console.warn('Sync failed:', e.message); }

try {
  execSync('node -c "' + OUTPUT + '"', { stdio: 'pipe' });
} catch (e) {
  console.error('[TeacherModule] Syntax check failed:');
  console.error((e.stderr && e.stderr.toString()) || e.message);
  process.exit(1);
}

console.log('[TeacherModule] Built ' + OUTPUT + ' (' + outputCode.split('\n').length + ' lines)');
