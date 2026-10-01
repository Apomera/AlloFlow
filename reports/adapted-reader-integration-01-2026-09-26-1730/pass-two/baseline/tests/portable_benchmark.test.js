import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const RUNNER = resolve(ROOT, 'dev-tools/benchmark_alloflow_portable.cjs');
let scratch;

afterEach(() => {
  if (scratch) rmSync(scratch, { recursive: true, force: true });
  scratch = null;
});

describe('AlloFlow portable structural benchmark', () => {
  it('passes representative structures and the interactive-form safety block', () => {
    scratch = mkdtempSync(join(tmpdir(), 'alloflow-portable-benchmark-test-'));
    const output = join(scratch, 'evidence');
    const result = spawnSync(process.execPath, [RUNNER, '--out-dir', output], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 120000,
      env: { ...process.env },
    });
    expect(result.status, result.stderr || result.stdout).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report).toMatchObject({
      benchmark: 'alloflow-portable-structural',
      networkPolicy: 'deny',
      alloflowServiceUsed: false,
      modelApiKeyRequired: false,
      summary: {
        total: 5,
        passed: 5,
        failed: 0,
        acceptedCases: 4,
        safetyBlocks: 1,
      },
    });
    expect(report.cases.map((item) => item.id)).toEqual([
      'multi-column-reading-order',
      'complex-table',
      'meaningful-image',
      'scanned-page-review',
      'interactive-form-blocked',
    ]);
    for (const item of report.cases) expect(item.passed, item.id).toBe(true);
    for (const item of report.cases.filter((entry) => entry.expected === 'accepted')) {
      expect(item.staticHtmlAuditPassed, item.id).toBe(true);
      expect(item.planInternalTokenRecall, item.id).toBeGreaterThanOrEqual(0.95);
      expect(item.humanReviewRequired, item.id).toBe(true);
    }
    expect(report.limitations.join(' ')).toMatch(/not independent source-PDF fidelity proof/i);
    expect(report.limitations.join(' ')).toMatch(/reviewed, licensed real-world documents/i);
    expect(existsSync(join(output, 'portable-benchmark-report.json'))).toBe(true);
    expect(JSON.parse(readFileSync(join(output, 'portable-benchmark-report.json'), 'utf8'))).toEqual(report);
  });
});