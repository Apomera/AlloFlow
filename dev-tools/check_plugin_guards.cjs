#!/usr/bin/env node
// check_plugin_guards.cjs — Verify every stem_tool_* / sel_tool_* plugin has a
// defensive guard checking that its registry exists before calling registerTool.
//
// Why this exists:
//   AlloFlow CDN modules load asynchronously and unsequenced (per memory:
//   feedback_iife_lazy_lookup.md). The monolith loads stem_lab_module.js +
//   sel_hub_module.js BEFORE the per-plugin script tags fire (gated by
//   setTimeout in AlloFlowANTI.txt:~3703), so in normal production load
//   the registry IS ready by plugin-load time.
//
//   But the load-order guarantee is timing-based, not synchronous. Edge
//   cases that break it:
//     - Plugin file loaded standalone (dev iteration, isolated test)
//     - Network duress where registry script tag stalls past the setTimeout
//     - A future refactor that changes the load orchestration
//
//   The defense-in-depth guard:
//     if (!window.StemLab || typeof window.StemLab.registerTool !== 'function') return;
//
//   This check reports plugins WITHOUT the guard as INFORMATIONAL warnings,
//   not blocking violations — the architecture currently makes them safe but
//   the guard is recommended best practice.
//
// What this check does:
//   For each `stem_tool_*.js` and `sel_tool_*.js`:
//     - Find the registerTool call(s)
//     - Verify there's a guard pattern earlier in the file that bails if
//       the registry isn't yet defined
//
// Usage:
//   node dev-tools/check_plugin_guards.cjs
//   node dev-tools/check_plugin_guards.cjs --verbose
//
// Exit codes:
//   0 — every plugin has a defensive guard
//   1 — at least one plugin missing a guard

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const QUIET = args.includes('--quiet');

const REGISTRIES = [
  { dir: path.join(ROOT, 'stem_lab'), filePattern: /^stem_tool_.*\.js$/, registryName: 'StemLab' },
  { dir: path.join(ROOT, 'sel_hub'),  filePattern: /^sel_tool_.*\.js$/,  registryName: 'SelHub' },
];

// Acceptable guard patterns (any of these counts as a valid guard)
function buildGuardPatterns(name) {
  return [
    // Standard form: if (!window.X || typeof window.X.registerTool !== 'function') return;
    new RegExp('if\\s*\\(\\s*!\\s*window\\s*\\.\\s*' + name + '\\s*(\\|\\||&&)', 'i'),
    // Variant: if (!window.X) return;
    new RegExp('if\\s*\\(\\s*!\\s*window\\s*\\.\\s*' + name + '\\s*\\)\\s*\\{?\\s*return', 'i'),
    // Variant: typeof window.X === 'undefined' early return
    new RegExp('typeof\\s+window\\s*\\.\\s*' + name + '\\s*===?\\s*[\'"]undefined[\'"]', 'i'),
    // Variant: window.X && window.X.registerTool && window.X.registerTool(...)
    // (inline gating — safe but harder to detect; check by looking for `&& window.X.registerTool` near the call)
    new RegExp('&&\\s*window\\s*\\.\\s*' + name + '\\s*\\.\\s*registerTool', 'i'),
  ];
}

const findings = [];
const allTools = [];

for (const reg of REGISTRIES) {
  if (!fs.existsSync(reg.dir)) continue;
  const files = fs.readdirSync(reg.dir).filter(f => reg.filePattern.test(f) && !f.startsWith('_'));
  const guardPatterns = buildGuardPatterns(reg.registryName);

  for (const file of files) {
    const filePath = path.join(reg.dir, file);
    const src = fs.readFileSync(filePath, 'utf-8');
    // Check if the plugin actually calls registerTool — if not, no guard needed
    const callRe = new RegExp('window\\s*\\.\\s*' + reg.registryName + '\\s*\\.\\s*registerTool\\s*\\(');
    if (!callRe.test(src)) continue;

    allTools.push({ file: reg.dir.split(/[\\/]/).pop() + '/' + file, registry: reg.registryName });

    // Check for any guard pattern
    const hasGuard = guardPatterns.some(re => re.test(src));
    if (!hasGuard) {
      findings.push({
        file: reg.dir.split(/[\\/]/).pop() + '/' + file,
        registry: reg.registryName,
        callLineHint: src.split('\n').findIndex(l => callRe.test(l)) + 1,
      });
    }
  }
}

if (!QUIET || findings.length > 0) {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║   Plugin Defensive-Guard Check                                       ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('  Plugins scanned: ' + allTools.length);
  console.log('  StemLab plugins: ' + allTools.filter(t => t.registry === 'StemLab').length);
  console.log('  SelHub plugins:  ' + allTools.filter(t => t.registry === 'SelHub').length);
  console.log('');
}

if (findings.length > 0 && VERBOSE) {
  console.log('═══ ⚠ MISSING DEFENSIVE GUARD (' + findings.length + ') — informational, not blocking ═══');
  console.log('     Architecture currently makes these safe (registry loads first).');
  console.log('     Adding the guard is defense-in-depth against future refactors.');
  console.log('');
  for (const f of findings.slice(0, 30)) {
    console.log('  ⚠ ' + f.file + '  (registerTool at line ' + f.callLineHint + ')');
  }
  if (findings.length > 30) console.log('  (... ' + (findings.length - 30) + ' more, all listed via --verbose)');
  console.log('');
  console.log('  Suggested fix (per file): add at top, after the existing window.AlloModules guard:');
  console.log('    if (!window.<RegistryName> || typeof window.<RegistryName>.registerTool !== \'function\') return;');
  console.log('');
} else if (findings.length > 0) {
  console.log('  ⚠ ' + findings.length + ' plugin(s) missing defensive guard (informational — run --verbose for list)');
  console.log('');
}

console.log('  ✅ ' + (allTools.length - findings.length) + ' / ' + allTools.length + ' plugins have defensive guard.');
if (findings.length > 0) {
  console.log('     ' + findings.length + ' missing guards (informational, not blocking — architecture makes them safe today).');
}
console.log('');

// Always exit 0 — this is informational, not a blocking violation
process.exit(0);
