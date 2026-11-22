import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();

const {
  FIXTURE_IDS,
  materializeGoldenFixtures,
} = require(path.resolve(ROOT, 'dev-tools/build_remediation_golden_fixtures.cjs'));

const {
  DEFAULT_BASELINE_PATH,
  runGoldenBenchmark,
  compareAgainstGolden,
} = require(path.resolve(ROOT, 'dev-tools/remediation_golden_benchmark.cjs'));

describe('Phase 1: Deploy-Safe Real-Document Golden Benchmark Harness', () => {
  it('materializes all 7 realistic golden fixtures deterministically without network calls', () => {
    const dirA = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-golden-a-'));
    const dirB = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-golden-b-'));
    try {
      const runA = materializeGoldenFixtures(dirA);
      const runB = materializeGoldenFixtures(dirB);

      expect(FIXTURE_IDS).toHaveLength(7);
      for (const id of FIXTURE_IDS) {
        expect(fs.existsSync(runA.fixtures[id].path), `${id} should exist`).toBe(true);
        expect(runA.fixtures[id].bytes, `${id} should be non-empty`).toBeGreaterThan(0);
        expect(runA.fixtures[id].sha256, `${id} must be deterministic`).toBe(runB.fixtures[id].sha256);
      }
    } finally {
      fs.rmSync(dirA, { recursive: true, force: true });
      fs.rmSync(dirB, { recursive: true, force: true });
    }
  });

  it('runs the full offline real-code benchmark with zero regressions against golden_baseline.json', async () => {
    expect(fs.existsSync(DEFAULT_BASELINE_PATH), 'golden_baseline.json must exist').toBe(true);
    const baseline = JSON.parse(fs.readFileSync(DEFAULT_BASELINE_PATH, 'utf8'));
    expect(baseline.schemaVersion).toBe(1);

    const report = await runGoldenBenchmark({ mode: 'offline' });
    expect(report.mode).toBe('offline');
    expect(report.failures, JSON.stringify(report.failures)).toEqual([]);
    expect(report.passed).toBe(true);

    const cmp = compareAgainstGolden(report, baseline);
    expect(cmp.regressions, JSON.stringify(cmp.regressions)).toEqual([]);
    expect(cmp.ok).toBe(true);
    expect(cmp.checkedCount).toBeGreaterThan(50);

    // Confirm timings were recorded for all 7 suites
    expect(report.totalDurationMs).toBeGreaterThanOrEqual(0);
    expect(Object.keys(report.timingsMs)).toHaveLength(7);
  }, 60_000);

  it('compareAgainstGolden fails closed when a quality invariant or fixture hash regresses', () => {
    const baseline = JSON.parse(fs.readFileSync(DEFAULT_BASELINE_PATH, 'utf8'));
    const syntheticGoodReport = {
      schemaVersion: 1,
      mode: 'offline',
      passed: true,
      failures: [],
      fixtures: structuredClone(baseline.fixtures),
      metrics: structuredClone(baseline.invariants),
    };
    expect(compareAgainstGolden(syntheticGoodReport, baseline).ok).toBe(true);

    const regressed = structuredClone(syntheticGoodReport);
    regressed.metrics.docxOmmlAndComments.commentsExcludedByDefault = false;
    regressed.metrics.altFormatExports.epubValidationErrorCount = 1;
    regressed.fixtures['xlsx-merged-pipes.xlsx'].sha256 = '0'.repeat(64);

    const badCmp = compareAgainstGolden(regressed, baseline);
    expect(badCmp.ok).toBe(false);
    expect(badCmp.regressions).toHaveLength(3);
    expect(badCmp.regressions.join('\n')).toContain('docxOmmlAndComments.commentsExcludedByDefault');
    expect(badCmp.regressions.join('\n')).toContain('altFormatExports.epubValidationErrorCount');
    expect(badCmp.regressions.join('\n')).toContain('xlsx-merged-pipes.xlsx');
  });
});
