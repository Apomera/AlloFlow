#!/usr/bin/env node
// stem_extract_plan.cjs — read-only: classify every stem tool into DONE /
// DIRTY (concurrent uncommitted WIP — skip) / CLEAN+compatible (var t=ctx.t →
// codemod-ready) / CLEAN-no-tdecl (needs a t-decl added first). Picks the next
// safe extraction batch (clean + compatible only).
'use strict';
const fs = require('fs'), cp = require('child_process'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const all = fs.readdirSync(path.join(ROOT, 'stem_lab'))
  .filter(f => /^stem_tool_.+\.js$/.test(f)).map(f => f.replace(/^stem_tool_|\.js$/g, ''));
const dirty = new Set(cp.execSync('git status --short', { cwd: ROOT, encoding: 'utf8' }).split('\n')
  .map(l => l.slice(3).trim()).filter(Boolean)
  .map(p => { const m = p.match(/stem_tool_(.+)\.js$/); return m ? m[1] : null; }).filter(Boolean));
const ui = JSON.parse(fs.readFileSync(path.join(ROOT, 'ui_strings.js'), 'utf8')).stem;
const done = new Set(Object.keys(ui));
const out = { clean_compat: [], clean_no_tdecl: [], dirty: [], done: [] };
for (const t of all) {
  if (done.has(t)) { out.done.push(t); continue; }
  if (dirty.has(t)) { out.dirty.push(t); continue; }
  const src = fs.readFileSync(path.join(ROOT, 'stem_lab', 'stem_tool_' + t + '.js'), 'utf8');
  (/\bt\s*=\s*ctx\.t\b/.test(src) ? out.clean_compat : out.clean_no_tdecl).push(t);
}
console.log('DONE (' + out.done.length + '): ' + out.done.join(' '));
console.log('\nDIRTY-WIP (' + out.dirty.length + ') AVOID: ' + out.dirty.join(' '));
console.log('\nCLEAN+compat (' + out.clean_compat.length + '): ' + out.clean_compat.join(' '));
console.log('\nCLEAN no-tdecl (' + out.clean_no_tdecl.length + '): ' + out.clean_no_tdecl.join(' '));
