#!/usr/bin/env node
// check_plugin_reachability.cjs — the "registered but renders nothing" gate.
//
// WHY THIS EXISTS (treeLab, 2026-08-11):
//   stem_lab_module.js has exactly ONE StemLab.renderTool() call site, and it sits
//   behind
//       if (!_pluginOnlyTools[stemLabTool]) return null;
//   A tool with no inline code in the host must be listed there or the hub renders an
//   empty panel. treeLab shipped registered, catalogued, in PLUGIN_FILES, in the ANTI
//   runtime loader, mirrored, indexed, committed AND DEPLOYED — and blank on open.
//
//   Every other gate missed it, and had to: check_stem_render, check_tool_contract,
//   the GL conformance battery, the a11y specs and every unit test call renderTool()
//   DIRECTLY. None of them traverse the hub path that actually gates rendering.
//   Registration is not reachability.
//
// THE INVARIANT
//   A tool with a hub catalogue tile must ALSO be
//     1. in `_pluginOnlyTools` in BOTH copies of stem_lab_module.js, or the hub
//        returns null instead of rendering it, and
//     2. in the `stemToolModules` runtime loader array in AlloFlowANTI.txt, or the
//        plugin file is never fetched in the first place.
//   Tools with no catalogue tile (the Tool Forge's `forge` and `myTool`) are not
//   opened from the palette and are correctly absent from both.
//
//   Measured when written: 121 catalogue tiles, zero false positives.
//
// Usage: node dev-tools/check_plugin_reachability.cjs [--quiet]
// Exit:  0 clean · 1 if any catalogued tool is unreachable.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const QUIET = process.argv.includes('--quiet');
const HOSTS = [
  'stem_lab/stem_lab_module.js',
  'desktop/web-app/public/stem_lab/stem_lab_module.js',
];
const ANTI = 'AlloFlowANTI.txt';

function read(rel) {
  const p = path.join(ROOT, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

function pluginOnlySet(src, label) {
  const start = src.indexOf('_pluginOnlyTools = {');
  if (start === -1) {
    console.error('✗ ' + label + ': _pluginOnlyTools not found — has the hub been restructured?');
    process.exit(1);
  }
  const body = src.slice(start, src.indexOf('};', start));
  return new Set([...body.matchAll(/([a-zA-Z0-9_]+)\s*:\s*true/g)].map((m) => m[1]));
}

const primary = read(HOSTS[0]);
if (!primary) { console.error('✗ ' + HOSTS[0] + ' not found'); process.exit(1); }
const anti = read(ANTI);
if (!anti) { console.error('✗ ' + ANTI + ' not found'); process.exit(1); }

// Catalogue tiles. Category headers use the `_cat_` prefix and are not tools.
const tiles = [...new Set(
  [...primary.matchAll(/id: '([a-zA-Z0-9_]+)', icon:/g)]
    .map((m) => m[1])
    .filter((id) => !id.startsWith('_cat_'))
)];

// Which plugin file registers each id.
const dir = path.join(ROOT, 'stem_lab');
const fileFor = {};
for (const f of fs.readdirSync(dir).filter((f) => /^stem_tool_.*\.js$/.test(f))) {
  const src = fs.readFileSync(path.join(dir, f), 'utf8');
  for (const m of src.matchAll(/registerTool\(\s*['"]([A-Za-z0-9_]+)['"]/g)) fileFor[m[1]] = f;
}

const problems = [];
for (const host of HOSTS) {
  const src = read(host);
  if (!src) continue;                       // the desktop mirror may not exist yet
  const listed = pluginOnlySet(src, host);
  for (const id of tiles) {
    if (!listed.has(id)) {
      problems.push({
        id,
        why: 'missing from _pluginOnlyTools in ' + host + ' — the hub returns null instead of rendering it',
      });
    }
  }
}
for (const id of tiles) {
  const f = fileFor[id];
  if (f && !anti.includes('stem_lab/' + f)) {
    problems.push({ id, why: 'stem_lab/' + f + ' is not in the stemToolModules loader array in ' + ANTI + ' — the plugin is never fetched' });
  }
}

if (!QUIET) {
  console.log('check_plugin_reachability: ' + tiles.length + ' catalogued tool(s)');
}
if (problems.length) {
  console.error('\n✗ ' + problems.length + ' unreachable registration(s):');
  for (const p of problems) console.error('    ' + p.id + ': ' + p.why);
  console.error('\n  A catalogued tool must be reachable through the hub, not merely registered.');
  process.exit(1);
}
console.log('✓ check_plugin_reachability: every catalogued tool is reachable through the hub.');
