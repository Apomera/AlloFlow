#!/usr/bin/env node
// stem_tdecl_batch.cjs <tool>... — for tools WITHOUT a render-scope t-decl:
// add-tdecl --write → node --check (revert .bak.tdecl on fail) → extract --write
// → node --check (revert both backups on fail) → inject → clean backups.
// Render-scope only; static module-level strings reported, not wrapped.
'use strict';
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const tools = process.argv.slice(2);
if (!tools.length) { console.error('Usage: stem_tdecl_batch.cjs <tool>...'); process.exit(2); }
function sh(cmd) { return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }); }
function restore(file, ext) { const b = file + ext; if (fs.existsSync(b)) { fs.copyFileSync(b, file); fs.unlinkSync(b); } }
function rm(file, ext) { const b = file + ext; if (fs.existsSync(b)) fs.unlinkSync(b); }

const results = [];
for (const tool of tools) {
  const file = path.join(ROOT, 'stem_lab', 'stem_tool_' + tool + '.js');
  if (!fs.existsSync(file)) { results.push({ tool, status: 'not-found' }); continue; }
  // 1. add t-decl
  try { sh('node dev-tools/stem_add_tdecl.cjs ' + tool + ' --write'); }
  catch (e) { results.push({ tool, status: 'tdecl-error', err: String(e.message).split('\n').slice(-2)[0].slice(0, 80) }); continue; }
  try { sh('node --check stem_lab/stem_tool_' + tool + '.js'); }
  catch (e) { restore(file, '.bak.tdecl'); results.push({ tool, status: 'tdecl-check-REVERTED' }); continue; }
  // 2. extract
  let wrapped = 0, skipped = 0;
  try {
    const out = sh('node dev-tools/stem_extract_tool.cjs ' + tool + ' --write');
    const wm = out.match(/WRAPPED\): (\d+)/); const sm = out.match(/SKIPPED[^)]*\): (\d+)/);
    wrapped = wm ? +wm[1] : 0; skipped = sm ? +sm[1] : 0;
  } catch (e) { restore(file, '.bak.tdecl'); results.push({ tool, status: 'extract-error', err: String(e.message).split('\n').slice(-2)[0].slice(0, 80) }); continue; }
  try { sh('node --check stem_lab/stem_tool_' + tool + '.js'); }
  catch (e) {
    // revert extract first (newest backup), then tdecl
    restore(file, '.bak.extract'); restore(file, '.bak.tdecl');
    results.push({ tool, status: 'extract-check-REVERTED', wrapped, skipped }); continue;
  }
  // 3. inject
  try { sh('node dev-tools/inject_stem_keys.cjs ' + tool); }
  catch (e) { results.push({ tool, status: 'inject-error', wrapped, skipped, err: String(e.message).slice(0, 80) }); continue; }
  rm(file, '.bak.extract'); rm(file, '.bak.tdecl');
  results.push({ tool, status: 'ok', wrapped, skipped });
}

console.log('\n── tdecl-batch result ──');
let totW = 0, totS = 0;
results.forEach(r => {
  console.log('  ' + r.tool.padEnd(20) + (r.status === 'ok' ? `ok   wrapped=${r.wrapped} static-skipped=${r.skipped}` : r.status) + (r.err ? ' — ' + r.err : ''));
  if (r.status === 'ok') { totW += r.wrapped; totS += r.skipped; }
});
const ok = results.filter(r => r.status === 'ok').length;
console.log(`\n${ok}/${results.length} tools extracted. wrapped=${totW}, static-skipped=${totS}.`);
const bad = results.filter(r => r.status !== 'ok');
if (bad.length) console.log('Needs attention: ' + bad.map(r => r.tool + '(' + r.status + ')').join(', '));
