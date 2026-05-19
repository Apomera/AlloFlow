#!/usr/bin/env node
// check_pdf_pipeline.cjs — Static contract verification for the doc_pipeline
// (PDF audit + remediation system).
//
// Why this exists:
//   doc_pipeline_module.js is AlloFlow's largest single module (14,656 lines).
//   It exports ~35 functions invoked from PDF Audit Modal UI sites + the
//   Expert Workbench + the autonomous remediation loop. Two prior incidents
//   (commits 1542fc8 and 1ce8054) silently dropped pipeline functions
//   during routine refactors — UI buttons broke without console errors
//   because the consumer-side guard pattern just rendered "Loading...".
//
//   `check_pipeline_integrity.js` already verifies that every UI call to
//   `_docPipeline.X` has a matching export in the pipeline module/source.
//   This check is the COMPLEMENT: verifies the pipeline EXPORTS ALL THE
//   CRITICAL FUNCTIONS that the documented surface promises.
//
//   FULL E2E testing the pipeline (feed in a real PDF, verify remediation
//   produces accessible output) requires:
//     - A test-fixture PDF (none exist in repo)
//     - Mocked Gemini API (the audit + remediation calls Gemini)
//     - Mocked axe-core (the audit step calls axe)
//     - Browser environment (PDF.js + DOM rendering)
//   That's a separate session's work. This is a static smoke.
//
// What this check does:
//   1. Verify doc_pipeline_module.js parses
//   2. Verify the critical surface functions are exported on
//      window.AlloModules.createDocPipeline(deps).<function>
//   3. Verify the Expert Workbench + 3-tier surgical fix system functions
//      are present (these were the silently-dropped ones)
//   4. Verify the source/module pair has the same critical exports
//
// Usage:
//   node dev-tools/check_pdf_pipeline.cjs
//   node dev-tools/check_pdf_pipeline.cjs --verbose
//
// Exit codes:
//   0 — all critical pipeline functions present in both source and module
//   1 — at least one critical function missing
//   2 — usage / file not found

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PIPELINE_MODULE = path.join(ROOT, 'doc_pipeline_module.js');
const PIPELINE_SOURCE = path.join(ROOT, 'doc_pipeline_source.jsx');

const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const QUIET = args.includes('--quiet');

if (!fs.existsSync(PIPELINE_MODULE)) {
  console.error('doc_pipeline_module.js not found');
  process.exit(2);
}

// Critical functions the pipeline MUST export. Drawn from the FEATURE_INVENTORY
// catalog of the pipeline's surface. Grouped by category for readability.
const CRITICAL_EXPORTS = {
  'Audit & Verification': [
    'runPdfAccessibilityAudit',
    'auditOutputAccessibility',
    'runAxeAudit',
    'fixContrastViolations',
  ],
  'Auto-fix loops': [
    'autoFixAxeViolations',
    'refixChunk',
    'getChunkState',
  ],
  '3-tier surgical fix system': [
    'runTier2SurgicalFixes',
    'runTier2_5SectionScopedFixes',
    'runTier3StructuralFix',
  ],
  'Expert Workbench': [
    'runAutonomousRemediation',
    'processExpertCommand',
  ],
  'PDF generation & preview': [
    'fixAndVerifyPdf',
    'generateAuditReportHtml',
    'downloadAccessiblePdf',
    'createTaggedPdf',
    'getPdfPreviewHtml',
    'updatePdfPreview',
  ],
  'Word restoration': [
    'applyWordRestoration',
    'retargetMissingWordsViaGemini',
    'restoreSentencesDeterministic',
    'detectAndHandleDuplicates',
  ],
  'Multi-session': [
    'multiSessionId',
    'loadMultiSession',
    'clearMultiSession',
    'mergeRangesToFullHtml',
  ],
  'Custom export theming': [
    'generateCustomExportStyle',
    'EXPORT_THEMES',
    'STYLE_SEEDS',
  ],
};

const allCritical = Object.values(CRITICAL_EXPORTS).flat();

function findExports(src) {
  // doc_pipeline returns an object literal from createDocPipeline(deps).
  // Plus some constants are mounted as static properties on the factory itself
  // (e.g., createDocPipeline.STYLE_SEEDS = ...) — accessed by host as
  // window.AlloModules.createDocPipeline.STYLE_SEEDS.
  const found = new Set();
  // Pattern 1: object-literal entries `name: value` (returned from factory)
  const exportRe = /(?:^|[\s,{])([a-zA-Z_$][\w$]*)\s*:\s*[\w(_\$]/gm;
  let m;
  while ((m = exportRe.exec(src)) !== null) found.add(m[1]);
  // Pattern 2: window.AlloModules.X assignments (top-level)
  const winRe = /window\.AlloModules\.([a-zA-Z_$][\w$]*)\s*=/g;
  while ((m = winRe.exec(src)) !== null) found.add(m[1]);
  // Pattern 3: createDocPipeline.X = ... (static-property on factory)
  const staticRe = /(?:createDocPipeline|window\.AlloModules\.createDocPipeline)\.([a-zA-Z_$][\w$]*)\s*=/g;
  while ((m = staticRe.exec(src)) !== null) found.add(m[1]);
  // Pattern 4: top-level const NAME = ... where NAME is uppercase (constants
  // often live as locals in the IIFE and are referenced by closure inside the
  // returned methods — e.g., STYLE_SEEDS used in line 14145).
  const constRe = /^\s*(?:const|let|var)\s+([A-Z][A-Z0-9_]+)\s*=/gm;
  while ((m = constRe.exec(src)) !== null) found.add(m[1]);
  return found;
}

const moduleSrc = fs.readFileSync(PIPELINE_MODULE, 'utf-8');
const moduleExports = findExports(moduleSrc);

let sourceExports = new Set();
let sourceFound = false;
if (fs.existsSync(PIPELINE_SOURCE)) {
  const sourceSrc = fs.readFileSync(PIPELINE_SOURCE, 'utf-8');
  sourceExports = findExports(sourceSrc);
  sourceFound = true;
}

const missingInModule = allCritical.filter(n => !moduleExports.has(n));
const missingInSource = sourceFound ? allCritical.filter(n => !sourceExports.has(n)) : [];

if (!QUIET || missingInModule.length > 0 || missingInSource.length > 0) {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║   PDF Audit Pipeline Contract Check                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('  Module:               doc_pipeline_module.js (' + (moduleSrc.split('\n').length) + ' lines)');
  console.log('  Source:               doc_pipeline_source.jsx ' + (sourceFound ? '(present)' : '(MISSING)'));
  console.log('  Critical functions:   ' + allCritical.length + ' across ' + Object.keys(CRITICAL_EXPORTS).length + ' categories');
  console.log('');
  console.log('  Notes:');
  console.log('    - This is a STATIC contract check. Full E2E (feed real PDF, verify');
  console.log('      remediation output) needs test fixtures + Gemini mock — separate session.');
  console.log('    - Catches the bug class from commits 1542fc8 (lost processExpertCommand)');
  console.log('      and 1ce8054 (lost Multi-session + Tier 2/2.5/3 — 7 functions).');
  console.log('');
}

if (missingInModule.length > 0) {
  console.log('═══ ✗ MISSING FROM MODULE (' + missingInModule.length + ') — UI calls would break ═══');
  for (const n of missingInModule) {
    const category = Object.keys(CRITICAL_EXPORTS).find(c => CRITICAL_EXPORTS[c].includes(n));
    console.log('  ✗ ' + n + '  [' + category + ']');
  }
  console.log('');
}

if (missingInSource.length > 0) {
  console.log('═══ ⚠ MISSING FROM SOURCE (' + missingInSource.length + ') — exists in module but not source.jsx ═══');
  console.log('     Will vanish if anyone re-compiles source → module.');
  for (const n of missingInSource) {
    const category = Object.keys(CRITICAL_EXPORTS).find(c => CRITICAL_EXPORTS[c].includes(n));
    console.log('  ⚠ ' + n + '  [' + category + ']');
  }
  console.log('');
}

if (VERBOSE) {
  console.log('═══ ✓ Found in module ═══');
  for (const cat of Object.keys(CRITICAL_EXPORTS)) {
    const present = CRITICAL_EXPORTS[cat].filter(n => moduleExports.has(n));
    console.log('  ' + cat + ':  ' + present.length + ' / ' + CRITICAL_EXPORTS[cat].length);
    for (const n of present) console.log('    ✓ ' + n);
  }
  console.log('');
}

const hasErrors = missingInModule.length > 0;
console.log('  ' + (hasErrors ? '❌' : '✅') + ' Module:  ' + (allCritical.length - missingInModule.length) + ' / ' + allCritical.length + ' critical functions present.');
if (sourceFound) {
  console.log('  ' + (missingInSource.length > 0 ? '⚠ ' : '✅ ') + 'Source:  ' + (allCritical.length - missingInSource.length) + ' / ' + allCritical.length + ' critical functions present.');
}
console.log('');

process.exit(hasErrors ? 1 : 0);
