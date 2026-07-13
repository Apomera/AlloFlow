#!/usr/bin/env node
// stem_static_batch.cjs <tool>... — static-config consumption wrap + node --check
// gate (revert .bak.static on fail) + inject. Self-skips tools with no safe wraps.
'use strict';
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const tools = process.argv.slice(2);
if (!tools.length) { console.error('Usage: stem_static_batch.cjs <tool>...'); process.exit(2); }
function sh(c) { return execSync(c, { cwd: ROOT, encoding: 'utf8' }); }
const results = [];
for (const tool of tools) {
  const file = path.join(ROOT, 'stem_lab', 'stem_tool_' + tool + '.js');
  if (!fs.existsSync(file)) { results.push({ tool, status: 'not-found' }); continue; }
  let keys = 0;
  // 0. ensure __alloT is declared in render (idempotent; compat/curated tools have only `t`)
  try { sh('node dev-tools/stem_add_tdecl.cjs ' + tool + ' --write'); } catch (e) { /* may fail on odd render; codemod falls back to `t` or skips */ }
  if (fs.existsSync(file + '.bak.tdecl')) { try { sh('node --check stem_lab/stem_tool_' + tool + '.js'); } catch (e) { fs.copyFileSync(file + '.bak.tdecl', file); fs.unlinkSync(file + '.bak.tdecl'); } }
  try {
    const out = sh('node dev-tools/stem_extract_static.cjs ' + tool + ' --write');
    const m = out.match(/keys=(\d+)/); keys = m ? +m[1] : 0;
    if (!/WROTE/.test(out)) {
      // no static wraps — undo any t-decl we added so we don't leave an unused decl
      if (fs.existsSync(file + '.bak.tdecl')) { fs.copyFileSync(file + '.bak.tdecl', file); fs.unlinkSync(file + '.bak.tdecl'); }
      results.push({ tool, status: 'skip-no-wraps' }); continue;
    }
  } catch (e) { if (fs.existsSync(file + '.bak.tdecl')) { fs.copyFileSync(file + '.bak.tdecl', file); fs.unlinkSync(file + '.bak.tdecl'); } results.push({ tool, status: 'codemod-error', err: String(e.message).slice(0, 80) }); continue; }
  try { sh('node --check stem_lab/stem_tool_' + tool + '.js'); }
  catch (e) { if (fs.existsSync(file + '.bak.static')) { fs.copyFileSync(file + '.bak.static', file); fs.unlinkSync(file + '.bak.static'); } if (fs.existsSync(file + '.bak.tdecl')) { fs.copyFileSync(file + '.bak.tdecl', file); fs.unlinkSync(file + '.bak.tdecl'); } results.push({ tool, status: 'check-REVERTED', keys }); continue; }
  try { sh('node dev-tools/inject_stem_keys.cjs ' + tool); }
  catch (e) { results.push({ tool, status: 'inject-error', keys, err: String(e.message).slice(0, 80) }); continue; }
  for (const ext of ['.bak.static', '.bak.tdecl']) { const b = file + ext; if (fs.existsSync(b)) fs.unlinkSync(b); }
  results.push({ tool, status: 'ok', keys });
}
console.log('\n── static-batch result ──');
let tot = 0, ok = 0;
results.forEach(r => { console.log('  ' + r.tool.padEnd(20) + (r.status === 'ok' ? 'ok   keys=' + r.keys : r.status) + (r.err ? ' — ' + r.err : '')); if (r.status === 'ok') { tot += r.keys; ok++; } });
console.log('\n' + ok + ' tools wrapped, ' + tot + ' static keys.');
const bad = results.filter(r => !['ok', 'skip-no-wraps', 'not-found'].includes(r.status));
if (bad.length) console.log('Needs attention: ' + bad.map(r => r.tool + '(' + r.status + ')').join(', '));
