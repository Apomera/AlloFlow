#!/usr/bin/env node
// Build test_prep_hub_module.js from test_prep_hub_source.jsx.
//
//   node _build_test_prep_hub_module.js                 # compile the source (default)
//   node _build_test_prep_hub_module.js --compile-only  # esbuild + writes only
//   node _build_test_prep_hub_module.js --skip-eppp-refresh
//   node _build_test_prep_hub_module.js --full          # also rebuild all 22 packs
//
// THIS IS A DELEGATOR, deliberately. It used to be a 430-line second copy of the
// release pipeline, and maintaining two pipelines for one module cost real
// damage on 2026-08-16:
//
//   * It never ran apply_test_prep_independent_additions.cjs. Its own pack
//     builders reset every pack to the 200-item base, nothing re-integrated the
//     staged additions, and expand_test_prep_packs_to_500 then threw AFTER the
//     packs on disk had already been rewritten - leaving test_prep/ half-built
//     at 5,600 activities instead of 11,000, and 206 hard QA findings.
//   * It emitted a DIFFERENT public API than the release builder: two exports
//     (parsePracticeVoiceCommand, practiceVoiceHelpText) existed only here, so
//     rebuilding through the sanctioned path silently removed them and took a
//     12-assertion suite down with it.
//   * It never ran bind_non_eppp_native_qa.cjs, so running it stripped the QA
//     contentBinding and the next review reported 44 findings.
//
// Those are three faces of one bug: a module's contents must not depend on which
// builder last ran. RULES.md tells contributors to run `node _build_<name>_module.js`
// after editing a source, so this entry point has to keep working - it just must
// not be a second implementation. Everything below forwards to
// dev-tools/build_test_prep_hub_release.cjs, which is the maintained pipeline.
//
// The ONLY thing kept locally is the EPPP Part 1 refresh. Those three scripts
// have no equivalent in the release builder, which is correct: the release build
// asserts the source does NOT embed the Part 1 bank (it is lazy-loaded from
// test_prep/eppp_part_one_pack.json), so it never needs to regenerate it.
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'test_prep_hub_source.jsx');
const RELEASE_BUILDER = path.join(ROOT, 'dev-tools', 'build_test_prep_hub_release.cjs');

if (!fs.existsSync(SOURCE)) {
  console.error('Source not found:', SOURCE);
  process.exit(1);
}

const args = process.argv.slice(2);
const compileOnly = args.includes('--compile-only');
const skipEpppRefresh = args.includes('--skip-eppp-refresh');
const full = args.includes('--full');

function run(script, extra) {
  execFileSync(process.execPath, [path.join(ROOT, 'dev-tools', script)].concat(extra || []), {
    cwd: ROOT,
    stdio: 'inherit',
  });
}

// EPPP Part 1 is lazy, so a plain source edit does not need it regenerated;
// refresh it only for a full build, and never for --compile-only.
if (full && !skipEpppRefresh && !compileOnly) {
  run('build_eppp_1500_expansion.cjs');
  run('build_eppp_part_one_pack.cjs');
  run('qa_eppp_native_pack.cjs');
}

// Map this entry point's flags onto the release builder's. --compile-only means
// "read the existing validated assets, do not touch packs or reviews", which is
// exactly the three skip flags together.
const forwarded = args.filter((arg) => !['--compile-only', '--skip-eppp-refresh', '--full'].includes(arg));
if (compileOnly) {
  forwarded.push('--skip-pack-rebuild', '--skip-review-refresh', '--skip-eppp-preview-rebuild');
} else if (!full) {
  // Default: compile the source against the packs already on disk. Rebuilding
  // all 22 packs is a ten-minute operation nobody wants after a one-line source
  // edit, and it is what corrupted the tree when this file did it implicitly.
  forwarded.push('--skip-pack-rebuild');
}

run('build_test_prep_hub_release.cjs', forwarded);
