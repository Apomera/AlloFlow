#!/usr/bin/env node
'use strict';

// Gemini Canvas compiles AlloFlowANTI.txt with esbuild and, on 2026-11-07, would not run the file
// while esbuild reported a single WARNING (a duplicate object key): every fresh paste was a white
// screen whose console held only that warning. A clean parse is not enough; the host must compile
// with zero warnings. Usage: node dev-tools/check_anti_canvas_compile.cjs [file]

const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const DEFAULT_HOST = path.join(__dirname, '..', 'AlloFlowANTI.txt');

function canvasCompileWarnings(source) {
  try {
    const result = esbuild.transformSync(source, { loader: 'jsx', format: 'esm', logLevel: 'silent' });
    return result.warnings.map((w) => ({ kind: 'warning', id: w.id || '', text: w.text,
      line: w.location ? w.location.line : 0, lineText: w.location ? w.location.lineText.trim().slice(0, 160) : '' }));
  } catch (error) {
    return (error.errors || [{ text: error.message }]).map((e) => ({ kind: 'error', id: e.id || '', text: e.text,
      line: e.location ? e.location.line : 0, lineText: e.location ? e.location.lineText.trim().slice(0, 160) : '' }));
  }
}

function main() {
  const file = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_HOST;
  const problems = canvasCompileWarnings(fs.readFileSync(file, 'utf8'));
  if (!problems.length) {
    console.log('✓ ' + path.basename(file) + ' compiles with no esbuild warnings (Gemini Canvas runs only a clean compile).');
    return;
  }
  console.error('✗ ' + path.basename(file) + ': ' + problems.length + ' esbuild diagnostic(s). Gemini Canvas will show a white screen:');
  for (const p of problems) console.error('  ' + p.kind + ' line ' + p.line + ': ' + p.text + (p.id ? ' [' + p.id + ']' : '') + '\n      ' + p.lineText);
  process.exit(1);
}

if (require.main === module) main();
module.exports = { canvasCompileWarnings };
