#!/usr/bin/env node
// dev-tools/verapdf_diff.cjs — SOURCE-vs-TAGGED veraPDF clause diff.
//
// "Fully leveraging veraPDF" means more than validating one file: AlloFlow's
// honest claim is "the tagged output is substantially MORE conformant than
// the source, and tagging never INTRODUCES failures." This harness proves or
// refutes exactly that, per ISO 14289-1 rule:
//
//   fixedByUs          — rules failing in the SOURCE that pass in the TAGGED
//   introducedByUs     — rules passing in the SOURCE that fail in the TAGGED
//                        (the regression class; --gate makes these exit 1)
//   inheritedRemaining — rules failing in BOTH (e.g. non-embedded fonts in
//                        the source — honest scope: tagging can't fix these)
//
// Input pairs come from the tag-tree golden master, which saves its produced
// fixtures to tests/e2e/artifacts/ as <stem>.source.pdf + <stem>.tagged.pdf
// on every Playwright run. Re-generate with:
//   npx playwright test tests/e2e/pdf_tag_tree_golden.spec.ts
//
// Usage:
//   node dev-tools/verapdf_diff.cjs                  # human report, informational
//   node dev-tools/verapdf_diff.cjs --json           # machine-readable
//   node dev-tools/verapdf_diff.cjs --gate           # exit 1 on introducedByUs
//   node dev-tools/verapdf_diff.cjs --dir <path>     # custom artifacts dir
//   node dev-tools/verapdf_diff.cjs --quiet          # skip-friendly (verify_all)
//
// When veraPDF/Java aren't installed this SKIPS with exit 0 and a pointer at
// docs/verapdf_install.md — the harness is ready the moment the CLI exists.

'use strict';

const fs = require('fs');
const path = require('path');
const { findVeraPdf, runVeraPdf } = require('./demo/verapdf_check.cjs');

const args = process.argv.slice(2);
const JSON_OUT = args.includes('--json');
const GATE = args.includes('--gate');
const QUIET = args.includes('--quiet');
const dirIdx = args.indexOf('--dir');
const ART_DIR = dirIdx !== -1 ? args[dirIdx + 1] : path.join(process.cwd(), 'tests', 'e2e', 'artifacts');

function failedRuleKeys(report) {
  // key = specification/clause/testNumber — stable identity for an ISO rule.
  const out = new Map();
  const job = (report.jobs || [])[0];
  const rules = ((job && job.validationResult && job.validationResult.details) || {}).ruleSummaries || [];
  for (const r of rules) {
    if (r.ruleStatus !== 'FAILED') continue;
    const key = (r.specification || 'spec') + ' ' + (r.clause || '?') + ' t' + (r.testNumber || '?');
    out.set(key, { clause: r.clause, test: r.testNumber, desc: (r.description || '').slice(0, 160), checks: r.failedChecks || 1 });
  }
  return out;
}

function main() {
  const binary = findVeraPdf();
  if (!binary) {
    if (!QUIET) {
      console.log('[verapdf_diff] SKIPPED — veraPDF not installed (this is informational, not a failure).');
      console.log('[verapdf_diff] One-time setup: docs/verapdf_install.md (Java 11+ + veraPDF; ~5 min).');
    } else {
      console.log('[verapdf_diff] SKIPPED — veraPDF not installed (see docs/verapdf_install.md).');
    }
    process.exit(0);
  }
  if (!fs.existsSync(ART_DIR)) {
    console.log('[verapdf_diff] SKIPPED — no artifacts at ' + ART_DIR);
    console.log('[verapdf_diff] Generate them: npx playwright test tests/e2e/pdf_tag_tree_golden.spec.ts');
    process.exit(0);
  }
  const files = fs.readdirSync(ART_DIR);
  const stems = [...new Set(files.filter(f => /\.source\.pdf$/.test(f)).map(f => f.replace(/\.source\.pdf$/, '')))]
    .filter(stem => files.includes(stem + '.tagged.pdf'));
  if (!stems.length) {
    console.log('[verapdf_diff] SKIPPED — no <stem>.source.pdf + <stem>.tagged.pdf pairs in ' + ART_DIR);
    process.exit(0);
  }

  const results = [];
  let regressions = 0;
  for (const stem of stems) {
    const srcPath = path.join(ART_DIR, stem + '.source.pdf');
    const tagPath = path.join(ART_DIR, stem + '.tagged.pdf');
    const src = runVeraPdf(binary, srcPath, 'ua1');
    const tag = runVeraPdf(binary, tagPath, 'ua1');
    if (src.error || tag.error) {
      results.push({ stem, error: src.error || tag.error });
      continue;
    }
    const srcFails = failedRuleKeys(src.report);
    const tagFails = failedRuleKeys(tag.report);
    const fixedByUs = [...srcFails.keys()].filter(k => !tagFails.has(k)).map(k => ({ key: k, ...srcFails.get(k) }));
    const introducedByUs = [...tagFails.keys()].filter(k => !srcFails.has(k)).map(k => ({ key: k, ...tagFails.get(k) }));
    const inheritedRemaining = [...tagFails.keys()].filter(k => srcFails.has(k)).map(k => ({ key: k, ...tagFails.get(k) }));
    regressions += introducedByUs.length;
    results.push({
      stem,
      sourceFailedRules: srcFails.size,
      taggedFailedRules: tagFails.size,
      fixedByUs,
      introducedByUs,
      inheritedRemaining,
    });
  }

  if (JSON_OUT) {
    console.log(JSON.stringify({ artifactsDir: ART_DIR, pairs: results, regressions }, null, 2));
  } else {
    console.log('');
    console.log('═'.repeat(72));
    console.log('  veraPDF source→tagged clause diff (ISO 14289-1 / PDF-UA-1)');
    console.log('═'.repeat(72));
    for (const r of results) {
      if (r.error) { console.log('  ✗ ' + r.stem + ' — ' + r.error); continue; }
      console.log('');
      console.log('  ' + r.stem + ':  source ' + r.sourceFailedRules + ' failed rules → tagged ' + r.taggedFailedRules);
      console.log('    ✓ fixed by tagging:      ' + r.fixedByUs.length + (r.fixedByUs.length ? '  (' + r.fixedByUs.slice(0, 4).map(x => x.clause).join(', ') + (r.fixedByUs.length > 4 ? ', …' : '') + ')' : ''));
      console.log('    ' + (r.introducedByUs.length ? '✗' : '✓') + ' INTRODUCED by tagging:  ' + r.introducedByUs.length);
      for (const x of r.introducedByUs.slice(0, 6)) console.log('        ⚠ clause ' + x.clause + ' t' + x.test + ' — ' + x.desc);
      console.log('    · inherited from source: ' + r.inheritedRemaining.length + ' (honest scope — tagging can\'t fix e.g. source font embedding)');
    }
    console.log('');
    console.log('  ' + (regressions === 0 ? '✓ NO regressions — tagging never introduced an ISO failure.' : '✗ ' + regressions + ' regression rule(s) introduced by tagging — fix before claiming improvement.'));
    console.log('═'.repeat(72));
  }
  process.exit(GATE && regressions > 0 ? 1 : 0);
}

main();
