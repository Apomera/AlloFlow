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
//   5. Source-pair drift (root vs desktop/web-app/src/)
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
    name: 'Adventure module rebuild-diff',
    cmd: ['node', '_build_adventure_module.js', '--check'],
    description: 'adventure_source.jsx deterministically rebuilds to both committed Adventure runtime copies',
  },
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
    description: 'Root *_source.jsx vs desktop/web-app/src/ duplicates',
  },
  {
    name: 'Research Hub rebuild-diff',
    cmd: ['node', 'dev-tools/check_research_drift.cjs', '--quiet'],
    description: 'TRUE rebuild-diff: each research_*_source.jsx recompiled via esbuild must byte-match its committed *_module.js + prismflow mirror (catches the hand-patched-artifact P0 class the heuristic pair-drift + mtime checks miss)',
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
    name: 'Render-path free vars (CDN modules)',
    cmd: ['node', 'dev-tools/check_render_refs.cjs', '--quiet'],
    description: 'Undeclared identifiers in hook dep arrays of *_module.js (data/onPlayAudio/isEscaped render-crash class)',
  },
  {
    name: 'Group-level t() calls (i18n group → React-child crash)',
    cmd: ['node', 'dev-tools/scan_group_t_calls.cjs', '--quiet'],
    description: 'A t("group.path") call without {returnObjects:true} returns an i18n GROUP OBJECT; rendering it crashes the whole app ("Objects are not valid as a React child") — the pdf_audit.fidelity key-collision regression (2026-06-20).',
  },
  {
    name: 'FERPA — discrepancyReport persistence gate',
    cmd: ['node', 'dev-tools/check_no_discrepancy_persistence.cjs'],
    description: 'discrepancyReport must NEVER appear as a property key in any object literal in report_writer_module.js (psycheck verifier state — render-only)',
  },
  {
    name: 'STEM Lab — .find().field deref gate',
    cmd: ['node', 'dev-tools/check_find_deref.cjs', '--quiet', '--blocking'],
    description: '`ARR.find(arrow).field` immediate-deref chains in stem_lab/ crash tools on data drift (renamed id, i18n filter, stale state). BLOCKING as of 2026-06-07 — all 11 audit-named tools converted to window.StemLab.findById; new findings must use the helper or extract-and-guard.',
  },
  {
    name: 'Keyless list children (CDN modules + STEM tools)',
    cmd: ['node', 'dev-tools/check_keyless_map.cjs', '--quiet'],
    description: 'React "unique key" warning class: elements from .map()/array children without a key (the StemPluginBridge warning)',
  },
  {
    name: 'STEM tool render-smoke',
    cmd: ['node', 'dev-tools/check_stem_render.cjs', '--quiet'],
    description: 'Headlessly renders every STEM tool with a stub ctx; catches the render-phase TypeError class static gates miss (undefined.map, mis-shaped data literals — the 2026-06-05 protractor crash). Skips if React/jsdom absent.',
  },
  {
    name: 'SEL Hub tool render-smoke',
    cmd: ['node', 'dev-tools/check_sel_render.cjs', '--quiet'],
    description: 'Headlessly renders every SEL Hub tool (window.SelHub plugin bridge) with a stub ctx; catches the render-phase crash class static gates miss. Found 3 first-render crashes (journal/mindfulness/safety) on first run 2026-06-07. Skips if React/jsdom absent.',
  },
  {
    name: 'Non-STEM module render-smoke',
    cmd: ['node', 'dev-tools/check_module_render.cjs', '--quiet'],
    description: 'Curated render-smoke for non-STEM CDN view modules (annotation suite Toolbar/Overlay/nodes + more); catches the render-phase crash class (the 2026-06-05 annotation bare-`t` crash). Skips if React/jsdom absent.',
  },
  {
    name: 'aria-label / handler-deref static lint',
    cmd: ['node', 'dev-tools/check_aria_handler.cjs', '--quiet'],
    description: 'AST lint for two crash classes the render-smoke misses: must-be-string attrs (aria-label/title/alt) given an object/array value (the 2026-06-07 SEL `aria-label: x||{}` class), and unguarded array-spreads of tool-state members `[...d.results]` (the 2026-06-07 probability/runTrial first-interaction class).',
  },
  {
    name: 'Arc City gauntlet stages',
    cmd: ['node', 'dev-tools/check_gauntlet_stages.cjs'],
    description: 'The Gauntlet only stages real function-family levels — never a Transformations (goal:match) level',
  },
  {
    name: 'Lang pack JSON validity',
    cmd: ['node', 'dev-tools/check_lang_json.cjs', '--quiet'],
    description: 'Every lang/*.js parses as JSON (catches corruption before deploy)',
  },
  {
    name: 'Ctrl+K command palette i18n drift',
    cmd: ['node', 'dev-tools/check_cmd_i18n.cjs', '--quiet'],
    description: 'cmd_keys_en.json matches the source AND every lang pack has all cmd.*/palette.* keys — catches a new command silently regressing the palette to English-only. Fix: extract_cmd_keys.cjs then merge_cmd_keys.cjs.',
  },
  {
    name: 'Translation quality (i18n CI guard)',
    cmd: ['node', 'dev-tools/i18n/check_translation_quality.cjs', '--quiet'],
    description: 'Contraction stubs / compound stubs / Matter-calque / ASCII-density in non-Latin packs. Informational — promote to blocking after a future Spanglish sweep drives ascii-density to ~0.',
    informational: true,
  },
  {
    name: 'Safety-string Spanglish (alerts/confirms)',
    cmd: ['node', 'dev-tools/i18n/check_safety_string_spanglish.cjs', '--quiet'],
    description: 'BLOCKING. Catches HALF-translated alerts.*/confirms.* (incl. destructive-action confirms) that the passthrough metric misses — the 2026-06-08 Finding-1 regression class. Source-relative + script-aware + cognate-safe; at 0 after the fix, so it only fires on a new regression.',
  },
  {
    name: 'Deploy mirror sync',
    cmd: ['node', 'dev-tools/check_deploy_mirror.cjs', '--quiet'],
    description: 'Root *_module.js matches desktop/web-app/public/ mirror',
  },
  {
    name: 'Sample lesson smoke',
    cmd: ['node', 'dev-tools/check_sample_lessons.cjs', '--quiet'],
    description: 'examples/*.json parse + have valid history shape',
  },
  {
    name: 'PD catalog publishability',
    cmd: ['node', 'dev-tools/check_pd_publish.cjs', '--catalog', '--quiet'],
    description: 'Approved PD modules pass PdCore schema/readiness checks and immutable catalog bindings',
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
    name: 'Dead-code / fossil audit',
    cmd: ['node', 'dev-tools/check_dead_modules.cjs', '--strict', '--quiet'],
    description: 'Unreferenced PascalCase components / cross-file fossils / orphaned modules (informational; allowlist = triage ledger)',
    informational: true,
  },
  {
    name: 'veraPDF source→tagged clause diff',
    cmd: ['node', 'dev-tools/verapdf_diff.cjs', '--quiet', '--gate'],
    description: 'ISO 14289-1 ground truth on golden artifacts: tagging must FIX rules, never INTRODUCE failures (--gate exits 1 on regressions). Skips cleanly when veraPDF/Java or artifacts are absent — docs/verapdf_install.md.',
    informational: true,
  },
  {
    name: 'WCAG-SC coverage doc freshness',
    cmd: ['node', 'dev-tools/gen_wcag_coverage.cjs', '--check'],
    description: 'The reviewer-facing docs/wcag_sc_coverage.md is generated from the live SURGICAL_TOOL_REGISTRY wcag: tags; --check exits 1 when it drifts (e.g. after adding a fix_* tool). Regenerate with `node dev-tools/gen_wcag_coverage.cjs`. Informational — a stale public honesty artifact, not a build break.',
    informational: true,
  },
  {
    name: 'Help-mode coverage (data-help-key ↔ help_strings)',
    cmd: ['node', '_audit_help_keys.cjs'],
    description: 'Every data-help-key anchor must have a help_strings.js entry — a missing one means help-mode clicks silently do nothing. Backfilled to 0 missing 2026-06-12; BLOCKING so the invariant holds (the audit went stale once and hid a 73-key deficit).',
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
    name: 'Pipeline + Doc-Builder vitest gate',
    cmd: ['node', 'dev-tools/check_pipeline_tests.cjs', '--quiet'],
    description: 'Runs the remediation-pipeline + Document-Builder + scoring + security vitest suites (~137 files, ~28s) as a BLOCKING gate. Closes the "green-when-run yet ships" gap the 2026-06-21 reports flagged: the ~230 vitest files were excluded from verify_all, so a phase regression could deploy unnoticed (acute with concurrent multi-session edits on one tree). Allowlist by domain keyword — deliberately EXCLUDES the volatile STEM/SEL/lang/lab/game suites owned by other tracks (so their transient golden churn can never block a pipeline deploy). Skips cleanly if vitest is not installed.',
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
    name: 'Lumen honesty floor',
    cmd: ['node', 'dev-tools/check_lumen_floor.cjs', '--quiet'],
    description: 'Lumen integrity invariants: ladder, amber-only-L3, small-n + AI n-floor, L2 whitelist, L3 non-effect, escHtml XSS, IEP sign-off block',
  },
  {
    name: 'window.* icon assignment',
    cmd: ['node', 'dev-tools/check_window_icons.cjs', '--quiet'],
    description: 'Every lucide import is assigned to window for CDN modules (HeaderBar bug class)',
  },
  {
    name: 'View module missing props',
    cmd: ['node', 'dev-tools/check_view_props.cjs'],
    description: 'view_*_source.jsx references a useState name not in its destructured props (ExportPreviewView history bug class)',
  },
  {
    name: 'IIFE lazy lookup',
    cmd: ['node', 'dev-tools/check_iife_lazy_lookup.cjs', '--quiet'],
    description: 'Top-level snapshots of window.AlloModules.X in CDN IIFEs (QuickStart Fetch bug class)',
  },
  {
    name: 'Em / en dashes (outbound prose)',
    cmd: ['node', 'dev-tools/check_em_en_dashes.cjs', '--quiet'],
    description: 'Em + en dashes in emails / letters / proposals (Aaron preference; informational)',
    informational: true,
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
