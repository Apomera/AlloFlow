#!/usr/bin/env node
// verify_all.cjs — Run every static + structural check in sequence and report a unified summary.
//
// Why this exists:
//   The dev-tools/ folder has 14+ verifier/audit scripts. Running them one
//   at a time before a deploy is friction. This orchestrator runs them all,
//   captures pass/fail per check, and prints a consolidated table.
//
// Categories run by default:
//   1. Module registry contract (V1 static)
//   2. Translation key coverage (t() and HELP_STRINGS)
//   3. Tool registry contract (StemLab + SelHub registerTool schemas)
//   4. Source/module pair drift
//   5. Source-pair drift (root vs prismflow-deploy/src/)
//   6. Pipeline integrity (_docPipeline.X UI calls vs exports)
//
// Categories NOT run by default (slow, optional):
//   - Module registry runtime (V2, ~4 sec, requires chromium) — pass --runtime
//   - WCAG axe-core static + runtime (a11y-audit/) — pass --a11y
//   - Phase 2 source/module compile-diff (informational, often noisy) — pass --phase2
//   - Vitest unit tests — run separately via `npm test`
//
// Usage:
//   node dev-tools/verify_all.cjs                    (fast checks only)
//   node dev-tools/verify_all.cjs --runtime          (+ V2 runtime check)
//   node dev-tools/verify_all.cjs --a11y             (+ WCAG static audit)
//   node dev-tools/verify_all.cjs --all              (everything)
//   node dev-tools/verify_all.cjs --verbose          (show full output of each check)
//
// Exit codes:
//   0 — all checks passed
//   1 — one or more checks failed
//   2 — orchestrator setup error

'use strict';
const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const RUN_RUNTIME = args.includes('--runtime') || args.includes('--all');
const RUN_A11Y = args.includes('--a11y') || args.includes('--all');
const RUN_PHASE2 = args.includes('--phase2') || args.includes('--all');

// ──────────────────────────────────────────────────────────────────────────
// Define checks. Each has: name, command, cwd, optional skip predicate.
// ──────────────────────────────────────────────────────────────────────────
const checks = [
  {
    name: 'Module registry (V1 static)',
    cmd: ['node', 'dev-tools/verify_module_registry.cjs', '--quiet'],
    description: 'window.AlloModules.X consumer/producer contract',
  },
  {
    name: 'Translation key coverage',
    cmd: ['node', 'dev-tools/check_translation_keys.cjs', '--quiet'],
    description: 't() and HELP_STRINGS keys all defined',
  },
  {
    name: 'Tool registry contract',
    cmd: ['node', 'dev-tools/check_tool_registry.cjs', '--quiet'],
    description: 'StemLab + SelHub registerTool schemas',
  },
  {
    name: 'Source/module pair drift',
    cmd: ['node', 'dev-tools/audit_pair_drift.js'],
    description: 'Declaration-level diff between *_source.jsx and *_module.js',
  },
  {
    name: 'Source-pair drift',
    cmd: ['node', 'dev-tools/check_source_pair_drift.js'],
    description: 'Root *_source.jsx vs prismflow-deploy/src/ duplicates',
  },
  {
    name: 'Pipeline integrity',
    cmd: ['node', 'dev-tools/check_pipeline_integrity.js'],
    description: '_docPipeline.X UI calls all map to exports',
  },
  {
    name: 'Build pipeline smoke',
    cmd: ['node', 'dev-tools/check_build_smoke.cjs', '--quiet'],
    description: 'AlloFlowANTI.txt + App.jsx parse cleanly as JSX',
  },
  {
    name: 'Deploy mirror sync',
    cmd: ['node', 'dev-tools/check_deploy_mirror.cjs', '--quiet'],
    description: 'Root *_module.js matches prismflow-deploy/public/ mirror',
  },
  {
    name: 'Sample lesson smoke',
    cmd: ['node', 'dev-tools/check_sample_lessons.cjs', '--quiet'],
    description: 'examples/*.json parse + have valid history shape',
  },
  {
    name: 'CSS-in-template backticks',
    cmd: ['node', 'dev-tools/check_css_template_literals.cjs', '--quiet'],
    description: 'Catches stray backticks inside CSS template literals (April 2026 production bug class)',
  },
  {
    name: 'callGemini jsonMode/HTML mismatch',
    cmd: ['node', 'dev-tools/check_callgemini_jsonmode.cjs', '--quiet'],
    description: 'Flags callGemini(htmlPrompt, jsonMode=true) — produces JSON-wrapped HTML',
  },
  {
    name: 'Plugin defensive guards',
    cmd: ['node', 'dev-tools/check_plugin_guards.cjs', '--quiet'],
    description: 'Plugins have if (!window.Registry) return; guards (informational)',
    informational: true,
  },
  {
    name: 'Firebase functions surface',
    cmd: ['node', 'dev-tools/check_firebase_functions.cjs', '--quiet'],
    description: '12 expected Firebase function exports present + well-shaped',
  },
  {
    name: 'PDF audit pipeline contract',
    cmd: ['node', 'dev-tools/check_pdf_pipeline.cjs', '--quiet'],
    description: '29 critical doc_pipeline functions present in source + module',
  },
  {
    name: 'LTI 1.3 surface',
    cmd: ['node', 'dev-tools/check_lti_surface.cjs', '--quiet'],
    description: 'LTI endpoints + OIDC params + JWT verification + secrets',
  },
  // ── Security checks ─────────────────────────────────────────────
  {
    name: 'Secret leak scan',
    cmd: ['node', 'dev-tools/check_secrets.cjs', '--quiet'],
    description: 'Scan for hardcoded API keys, tokens, passwords, private keys',
  },
  {
    name: 'CORS strict origin',
    cmd: ['node', 'dev-tools/check_cors_strict.cjs', '--quiet'],
    description: 'Flag CORS wildcards on Firebase Functions (informational)',
    informational: true,
  },
  {
    name: 'XSS surface',
    cmd: ['node', 'dev-tools/check_xss_surface.cjs', '--quiet'],
    description: 'dangerouslySetInnerHTML uses with non-sanitized input (informational)',
    informational: true,
  },
  {
    name: 'eval / Function(string)',
    cmd: ['node', 'dev-tools/check_eval.cjs', '--quiet'],
    description: 'eval / new Function(string) / setTimeout(string) usage (informational)',
    informational: true,
  },
  {
    name: 'npm audit (HIGH+CRITICAL)',
    cmd: ['node', 'dev-tools/check_npm_audit.cjs', '--quiet'],
    description: 'Dependency vulnerabilities at root + functions/',
  },
  // ── Bug-class checks ─────────────────────────────────────────────
  {
    name: 'Source/compiled freshness',
    cmd: ['node', 'dev-tools/check_source_freshness.cjs', '--quiet'],
    description: 'Compiled *_module.js newer than *_source.jsx (manual-edit risk; informational)',
    informational: true,
  },
  {
    name: '@main URL placeholders',
    cmd: ['node', 'dev-tools/check_main_placeholder.cjs', '--quiet'],
    description: '@main loadModule URLs registered in build.js MODULES (else ship to prod broken)',
  },
  {
    name: 'Silent catch blocks',
    cmd: ['node', 'dev-tools/check_silent_catch.cjs', '--quiet'],
    description: 'Truly-empty catch(e){} blocks (informational; many are legitimate cleanup)',
    informational: true,
  },
  {
    name: 'STEM tile catalog coverage',
    cmd: ['node', 'dev-tools/check_stem_tile_catalog.cjs', '--quiet'],
    description: 'Every registerTool(id) has a matching tile in _allStemTools (BirdLab bug class)',
  },
  {
    name: 'window.* icon assignment',
    cmd: ['node', 'dev-tools/check_window_icons.cjs', '--quiet'],
    description: 'Every lucide import is assigned to window for CDN modules (HeaderBar bug class)',
  },
];

if (RUN_RUNTIME) {
  checks.push({
    name: 'Module registry (V2 runtime)',
    cmd: ['node', 'dev-tools/verify_module_registry_runtime.cjs', '--quiet'],
    description: 'Headless-browser runtime introspection of window.AlloModules',
  });
}

if (RUN_A11Y) {
  const a11yDir = path.join(ROOT, 'a11y-audit');
  if (fs.existsSync(path.join(a11yDir, 'static-audit.js'))) {
    checks.push({
      name: 'WCAG static audit (a11y-audit)',
      cmd: ['node', 'static-audit.js'],
      cwd: a11yDir,
      description: 'Static scan for known accessibility anti-patterns',
    });
  }
}

if (RUN_PHASE2) {
  checks.push({
    name: 'Phase 2 compile diff (informational)',
    cmd: ['node', 'dev-tools/phase2_diff_audit.js'],
    description: 'Source.jsx → compiled JS vs module.js drift (often noisy)',
    informational: true,
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Run each check, collect results
// ──────────────────────────────────────────────────────────────────────────
console.log('');
console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║   AlloFlow Verify-All Orchestrator                                   ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝');
console.log('  Running ' + checks.length + ' checks. Pass --runtime / --a11y / --phase2 / --all to add more.');
console.log('');

const results = [];
for (const check of checks) {
  const start = Date.now();
  const result = spawnSync(check.cmd[0], check.cmd.slice(1), {
    cwd: check.cwd || ROOT,
    encoding: 'utf-8',
    shell: false,
  });
  const elapsedMs = Date.now() - start;
  const passed = result.status === 0;
  results.push({
    name: check.name,
    description: check.description,
    informational: check.informational || false,
    passed,
    exitCode: result.status,
    elapsedMs,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  });
  const icon = passed ? '✓' : (check.informational ? '⊙' : '✗');
  const time = '(' + (elapsedMs / 1000).toFixed(1) + 's)';
  console.log('  ' + icon + ' ' + check.name.padEnd(40) + ' ' + time);
  if (VERBOSE || (!passed && !check.informational)) {
    const out = (result.stdout || '').trim();
    if (out) {
      console.log('');
      for (const line of out.split('\n')) console.log('      │ ' + line);
      console.log('');
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Summary
// ──────────────────────────────────────────────────────────────────────────
const passed = results.filter(r => r.passed);
const failed = results.filter(r => !r.passed && !r.informational);
const informational = results.filter(r => !r.passed && r.informational);

console.log('');
console.log('  ──────────────────────────────────────────');
console.log('  Passed:        ' + passed.length + ' / ' + checks.length);
console.log('  Failed:        ' + failed.length);
console.log('  Informational: ' + informational.length);
console.log('  Total time:    ' + (results.reduce((s, r) => s + r.elapsedMs, 0) / 1000).toFixed(1) + 's');
console.log('');

if (failed.length === 0) {
  console.log('  ✅ All blocking checks passed.');
} else {
  console.log('  ❌ ' + failed.length + ' blocking check' + (failed.length === 1 ? '' : 's') + ' failed:');
  for (const r of failed) {
    console.log('     - ' + r.name + '  (re-run: ' + r.exitCode + ')');
  }
  console.log('');
  console.log('  Run individual check with --verbose for full output, or:');
  console.log('     node dev-tools/verify_all.cjs --verbose');
}
console.log('');

process.exit(failed.length > 0 ? 1 : 0);
