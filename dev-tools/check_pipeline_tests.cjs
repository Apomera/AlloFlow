#!/usr/bin/env node
// check_pipeline_tests.cjs — Run the PIPELINE + DOCUMENT-BUILDER + scoring + security vitest suite as a
// BLOCKING pre-deploy gate.
//
// Why this exists (2026-06-22):
//   The ~230 vitest files were explicitly EXCLUDED from verify_all ("run separately via npm test"), so a
//   regression in a remediation-pipeline phase could be green-when-run yet still SHIP through deploy.sh.
//   Both 2026-06-21 hand-off reports flagged this as the highest-leverage gap, especially because multiple
//   Claude sessions share one working tree and a phase regression can land unnoticed.
//
// Why an ALLOWLIST (not "run everything"):
//   The STEM / SEL / lang / games / science-lab suites are owned by OTHER tracks and are frequently
//   mid-rebaseline in the shared tree (their goldens go red transiently). Running them here would couple
//   the DEPLOY gate to unrelated concurrent edits. This gate runs ONLY the remediation-pipeline +
//   Document-Builder + scoring + security tests — stable, fast, and the surface we actually ship from.
//   New tests in those domains are auto-included by keyword; new STEM/etc. tests are not.
//
// Skips cleanly (exit 0) if vitest can't run (no node_modules) — like the render-smoke checks.
// Exit: 0 = all selected tests passed (or skipped), 1 = a selected test failed, 2 = setup error.
'use strict';
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TESTS = path.join(ROOT, 'tests');
const QUIET = process.argv.includes('--quiet');

// Filename substrings that mark a test as belonging to the remediation pipeline / Document Builder /
// scoring / security / export surface. Broad on purpose so new tests in these domains gate automatically.
const INCLUDE = [
  'doc_pipeline', 'pdf', 'pdfua', 'view_pdf_audit', 'audit_', 'audit_trail', 'scoring', 'ocr_', 'table_',
  'export_css', 'export_odt', 'epub', 'rawhtml', 'expert_direct', 'skip_link', 'contrast_pair', 'footnote', 'sanitize_style', 'brand_profile', 'verapdf',
  'live_chunk', 'live_polling', 'issue_locator', 'issue_source', 'tag_inspector', 'recov', 'reliability_',
  'chunk_', 'pipeline_', 'redaction', 'multisession', 'degraded', 'conformance_banner', 'document_builder',
  'heading_', 'th_scope', 'reading_order', 'form_field', 'figure_caption', 'image_placeholder',
  'decorative_image', 'value_fidelity', 'numeric_fidelity', 'structural_fidelity', 'roundtrip_coverage',
  'integrity_recovery', 'make_accessible', 'handsoff', 'throttle_', 'watchdog_', 'vision_chunk',
  'mini_audit', 'no_mean_blend', 'no_dangling_refs', 'auto_verapdf', 'auto_restore', 'autofix_loop',
  'prompt_fence', 'writing_check', 'text_pipeline', 'review_queue', 'recon_note', 'start_new_audit',
  'batch_report', 'placeholder_chrome', 'compare_popup', 'compare_tagged', 'crop_sparse', 'force_reocr',
  'sentence_restore', 'tier3_locator', 'verify_recovery', 'run_outcome', 'gemini_api_build',
  'gemini_auth', 'submission_crypto', 'scan_score', 'heading_demote', 'heading_skip',
];
// Safety denylist: other-track suites that could substring-match an INCLUDE keyword (kept explicit so the
// gate can never be coupled to STEM/SEL/lang/lab/game churn even if a name overlaps).
const EXCLUDE = /^(stem_|sel_|lang_|i18n|brain_atlas|arc_city|dino_lab|lumen_|games_|symbol_studio|story_forge|throughline|research_|behavior_lens|word_sounds|coding_|concept_|anchor_|note_taking|cinematic|allohaven|accessibility_lab|beehive|echolocation|circuit_|wave_|dynamic_assessment|archaeology|chem_balance|optics_lab|punnett|stats_lab|titration|safety_golden|safety_checker|safety_layer|math_helpers|math_fluency)/;

let files;
try {
  files = fs.readdirSync(TESTS)
    .filter((f) => f.endsWith('.test.js'))
    .filter((f) => INCLUDE.some((k) => f.includes(k)) && !EXCLUDE.test(f))
    .sort();
} catch (e) {
  console.error('[pipeline-tests] could not read tests/ — ' + (e && e.message)); process.exit(2);
}

if (files.length === 0) { console.error('[pipeline-tests] selected 0 files — INCLUDE patterns drifted?'); process.exit(2); }
// Floor: this surface has dozens of suites; a sudden tiny count means the filter broke, not that coverage shrank.
if (files.length < 40) { console.error('[pipeline-tests] only ' + files.length + ' files matched (expected 40+) — INCLUDE patterns likely drifted'); process.exit(2); }

// Bail cleanly if vitest isn't installed (CI without devDeps) — don't fail the deploy for a missing tool.
if (!fs.existsSync(path.join(ROOT, 'node_modules', 'vitest'))) {
  console.log('[pipeline-tests] vitest not installed — skipping (run `npm test` locally).');
  process.exit(0);
}

if (!QUIET) console.log('[pipeline-tests] running ' + files.length + ' pipeline/doc-builder/scoring/security suites…');
const res = spawnSync('npx', ['vitest', 'run', '--reporter=dot', ...files.map((f) => 'tests/' + f)], {
  cwd: ROOT, encoding: 'utf-8', shell: true,
});
const out = (res.stdout || '') + (res.stderr || '');
if (res.status === 0) {
  // Surface the one-line tally on success too.
  const m = out.match(/Tests\s+.*$/m);
  console.log('[pipeline-tests] ✓ ' + files.length + ' suites passed' + (m ? ' — ' + m[0].trim() : ''));
  process.exit(0);
}
// On failure, show the failing portion so the gate is actionable.
console.error('[pipeline-tests] ✗ a pipeline/doc-builder test failed:');
const lines = out.split('\n').filter((l) => /FAIL|×|AssertionError|Error:|failed|Expected|Received/.test(l));
console.error(lines.slice(0, 40).join('\n') || out.slice(-2000));
process.exit(1);
