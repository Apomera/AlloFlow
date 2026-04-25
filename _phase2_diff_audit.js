#!/usr/bin/env node
/**
 * Phase 2 audit: for each JSX source/module pair, compile source via Babel,
 * auto-detect the wrapper from module.js, compose the expected module output,
 * and report the diff. Tells us which modules can be safely auto-compiled
 * today vs which need manual drift back-port first.
 *
 * Wrapper detection strategy:
 *   - module.js = PREFIX + COMPILED_BODY + SUFFIX
 *   - Find where the source's first non-trivial line appears in module.js → split there
 *   - Find where source's last non-trivial line appears → split the suffix
 *
 * No files modified; purely informational.
 */
const babel = require('@babel/core');
const fs = require('fs');
const path = require('path');

const MODULES = [
  'adventure', 'allobot', 'content_engine', 'games', 'immersive_reader',
  'persona_ui', 'quickstart', 'story_forge', 'student_interaction',
  'teacher', 'ui_modals', 'visual_panel', 'word_sounds_setup',
];

// Babel-compile a source with classic JSX transform. Returns the compiled code
// (no wrapper).
function compileJsx(src) {
  const r = babel.transformSync(src, {
    plugins: ['@babel/plugin-transform-react-jsx'],
    configFile: false,
    babelrc: false,
  });
  return r.code;
}

// Best-effort wrapper detector. Finds where the source's code appears within
// the module and computes prefix+suffix by surrounding-content.
function detectWrapper(modContent, compiledBody) {
  // Walk the compiled body line-by-line; find the first distinctive line that
  // appears in modContent, then the last. That gives us prefix/suffix bounds.
  const modLines = modContent.split('\n');
  const bodyLines = compiledBody.split('\n');
  // Pick a distinctive-looking line (length > 30, not empty, not just braces)
  const distinctive = (l) => l.length > 30 && /[a-zA-Z]/.test(l);
  let firstIdx = -1, lastIdx = -1;
  for (let i = 0; i < bodyLines.length; i++) {
    if (!distinctive(bodyLines[i])) continue;
    const modIdx = modLines.findIndex(m => m.trim() === bodyLines[i].trim());
    if (modIdx >= 0) { firstIdx = modIdx; break; }
  }
  for (let i = bodyLines.length - 1; i >= 0; i--) {
    if (!distinctive(bodyLines[i])) continue;
    const modIdx = modLines.map((m, ix) => ({ m, ix })).reverse().find(x => x.m.trim() === bodyLines[i].trim());
    if (modIdx) { lastIdx = modIdx.ix; break; }
  }
  if (firstIdx < 0 || lastIdx < 0) return null;
  return {
    prefix: modLines.slice(0, firstIdx).join('\n'),
    suffix: modLines.slice(lastIdx + 1).join('\n'),
    bodyStart: firstIdx,
    bodyEnd: lastIdx,
  };
}

const results = [];
for (const mod of MODULES) {
  const srcPath = mod + '_source.jsx';
  const modPath = mod + '_module.js';
  if (!fs.existsSync(srcPath) || !fs.existsSync(modPath)) {
    results.push({ mod, status: 'skip', reason: 'file missing' });
    continue;
  }
  const src = fs.readFileSync(srcPath, 'utf-8');
  const modContent = fs.readFileSync(modPath, 'utf-8').replace(/\r\n/g, '\n');
  let compiledBody;
  try { compiledBody = compileJsx(src); }
  catch (e) { results.push({ mod, status: 'compile-error', reason: e.message.split('\n')[0] }); continue; }
  const wrapper = detectWrapper(modContent, compiledBody);
  if (!wrapper) {
    results.push({ mod, status: 'no-wrapper-match', reason: 'source body not locatable in module' });
    continue;
  }
  const reconstructed = wrapper.prefix + '\n' + compiledBody + '\n' + wrapper.suffix;
  if (reconstructed === modContent) {
    results.push({ mod, status: 'PERFECT', prefixLines: wrapper.bodyStart, suffixLines: modContent.split('\n').length - wrapper.bodyEnd - 1 });
    continue;
  }
  // Quick drift characterisation: count lines in each only
  const rLines = reconstructed.split('\n');
  const mLines = modContent.split('\n');
  const rSet = new Set(rLines), mSet = new Set(mLines);
  const onlyR = rLines.filter(l => !mSet.has(l)).length;
  const onlyM = mLines.filter(l => !rSet.has(l)).length;
  results.push({ mod, status: 'drift', onlyCompiled: onlyR, onlyModule: onlyM });
}

// Print results sorted by status
console.log('\n─── Phase 2 compile-diff audit ───\n');
const printers = { PERFECT: '✓', drift: '⚠', 'compile-error': '❌', 'no-wrapper-match': '❓', skip: '↩' };
for (const r of results) {
  const icon = printers[r.status] || '?';
  let detail = '';
  if (r.status === 'PERFECT') detail = `prefix ${r.prefixLines} / suffix ${r.suffixLines}`;
  else if (r.status === 'drift') detail = `compiled-only ${r.onlyCompiled} lines · module-only ${r.onlyModule} lines`;
  else detail = r.reason || '';
  console.log(`  ${icon} ${r.mod.padEnd(22)} ${r.status.padEnd(17)} ${detail}`);
}

const perfect = results.filter(r => r.status === 'PERFECT').length;
const drifted = results.filter(r => r.status === 'drift').length;
console.log(`\n${perfect}/${results.length} modules compile to byte-identical output; ${drifted} have drift.\n`);
