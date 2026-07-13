#!/usr/bin/env node
// stem_extract_batch.cjs <tool1> <tool2> ... — run the extraction codemod +
// node --check gate + ui_strings injection for each tool. If a tool fails
// node --check, its .bak.extract is restored (tool untouched) and it's reported.
// Render-scope only (codemod); static module-level strings are reported, not wrapped.
'use strict';
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const tools = process.argv.slice(2);
if (!tools.length) { console.error('Usage: stem_extract_batch.cjs <tool>...'); process.exit(2); }

function sh(cmd) { return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }); }
const results = [];
for (const tool of tools) {
  const file = path.join(ROOT, 'stem_lab', 'stem_tool_' + tool + '.js');
  if (!fs.existsSync(file)) { results.push({ tool, status: 'not-found' }); continue; }
  let wrapped = 0, skipped = 0;
  try {
    const out = sh('node dev-tools/stem_extract_tool.cjs ' + tool + ' --write');
    const wm = out.match(/WRAPPED\): (\d+)/); const sm = out.match(/SKIPPED[^)]*\): (\d+)/);
    wrapped = wm ? +wm[1] : 0; skipped = sm ? +sm[1] : 0;
  } catch (e) { results.push({ tool, status: 'codemod-error', err: String(e.message).slice(0, 120) }); continue; }
  // node --check gate
  try { sh('node --check stem_lab/stem_tool_' + tool + '.js'); }
  catch (e) {
    const bak = file + '.bak.extract';
    if (fs.existsSync(bak)) { fs.copyFileSync(bak, file); fs.unlinkSync(bak); }
    results.push({ tool, status: 'check-failed-REVERTED', wrapped, skipped });
    continue;
  }
  // inject ui_strings
  try { sh('node dev-tools/inject_stem_keys.cjs ' + tool); }
  catch (e) { results.push({ tool, status: 'inject-error', wrapped, skipped, err: String(e.message).slice(0, 120) }); continue; }
  // clean backup on success
  const bak = file + '.bak.extract'; if (fs.existsSync(bak)) fs.unlinkSync(bak);
  results.push({ tool, status: 'ok', wrapped, skipped });
}

console.log('\n── Batch result ──');
let totW = 0, totS = 0;
results.forEach(r => {
  console.log('  ' + r.tool.padEnd(20) + (r.status === 'ok' ? `ok   wrapped=${r.wrapped} static-skipped=${r.skipped}` : r.status) + (r.err ? ' — ' + r.err : ''));
  if (r.status === 'ok') { totW += r.wrapped; totS += r.skipped; }
});
const ok = results.filter(r => r.status === 'ok').length;
console.log(`\n${ok}/${results.length} tools extracted. wrapped=${totW}, static-skipped=${totS}.`);
const bad = results.filter(r => r.status !== 'ok');
if (bad.length) console.log('Needs attention: ' + bad.map(r => r.tool + '(' + r.status + ')').join(', '));
