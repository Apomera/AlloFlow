import { execFileSync } from 'node:child_process';
import {
  copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(process.cwd());

describe('document pipeline generated artifacts', function () {
  // 120s, not the 5s default: this test runs the REAL builder, which takes
  // ~28s cold (and more under a loaded machine). The missing per-test timeout
  // kept this file red since it was written (X8, 2026-08-17).
  it('match a fresh source build byte for byte in both shipping locations', { timeout: 120000 }, function () {
    const scratch = mkdtempSync(join(tmpdir(), 'alloflow-doc-pipeline-build-'));
    try {
      mkdirSync(join(scratch, 'desktop', 'web-app', 'public'), { recursive: true });
      for (const name of [
        '_build_doc_pipeline_module.js',
        '_build_simple_iife_module.js',
        'doc_pipeline_source.jsx',
        'remediation_review_helpers.js',
      ]) copyFileSync(join(ROOT, name), join(scratch, name));

      execFileSync(process.execPath, [join(scratch, '_build_doc_pipeline_module.js')], {
        cwd: scratch,
        stdio: 'pipe',
      });
      const expected = readFileSync(join(scratch, 'doc_pipeline_module.js'));
      // Compare bytes natively; structural Buffer equality walks millions of properties.
      expect(readFileSync(join(ROOT, 'doc_pipeline_module.js')).equals(expected)).toBe(true);
      expect(readFileSync(join(ROOT, 'desktop', 'web-app', 'public', 'doc_pipeline_module.js')).equals(expected))
        .toBe(true);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  // The test above only ever ran the per-module builder, so it could not see the
  // defect that actually kept shipping: build.js (the DEPLOY path) carried its own
  // hand-maintained copy of the IIFE wrapper that omitted the
  // remediation_review_helpers.js footer. Every deploy touching the module dropped
  // the ~13 KB AlloModules.RemediationReview block; the next real rebuild put it
  // back. The artifact oscillated (a3a2b8473 full -> 4000c4527 short, and the same
  // at f5b045fc9 -> c1bd2e5cf), and a 2026-09-13 rebuild "fixed" it without
  // touching the cause, so it returned. Both paths now share one wrapper; this
  // pins that they keep producing the same bytes.
  it('compiles identically through the deploy path and the per-module builder', function () {
    const { wrapSimpleIife } = require(join(ROOT, '_build_simple_iife_module.js'));
    const source = readFileSync(join(ROOT, 'doc_pipeline_source.jsx'), 'utf-8');
    const footer = readFileSync(join(ROOT, 'remediation_review_helpers.js'), 'utf-8');

    const viaSharedWrapper = wrapSimpleIife({ source, guardKey: 'DocPipelineModule', footer });
    expect(Buffer.from(readFileSync(join(ROOT, 'doc_pipeline_module.js'))).equals(Buffer.from(viaSharedWrapper, 'utf-8')))
      .toBe(true);

    // And the deploy table really does delegate rather than re-implement: its wrap()
    // must round-trip the footer. A wrapper that drops it fails here even if the
    // committed artifact happens to be freshly rebuilt.
    expect(viaSharedWrapper).toContain('AlloModules.RemediationReview = api');
    expect(readFileSync(join(ROOT, 'build.js'), 'utf-8'))
      .toMatch(/wrapSimpleIife\(\{[\s\S]{0,400}?remediation_review_helpers\.js/);
  });
});
