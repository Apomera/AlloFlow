import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = resolve(process.cwd());
const AUDIT = resolve(ROOT, 'dev-tools', 'audit_command_coverage.cjs');

function runAudit(...args) {
  return spawnSync(process.execPath, [AUDIT, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
}

describe('voice command coverage regression gate', () => {
  it('passes the reviewed repository baseline and exposes machine-readable evidence', () => {
    const result = runAudit('--check', '--json');

    expect(result.status, result.stderr).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.check?.ok).toBe(true);
    expect(report.registryCommands).toBeGreaterThanOrEqual(174);
    expect(report.helpKeySurfaces).toBeGreaterThanOrEqual(545);
    // 327 as of 2026-08-16 evening: six new surfaces landed in one day (the AI
    // Backend Canvas card, brainstorm discussion/jigsaw modes, doc-builder block
    // suggestions, collapsed header jump). The audit tool itself says to treat
    // this list as a menu, not a debt register.
    expect(report.uncoveredCount).toBeLessThanOrEqual(327);
  });

  it('fails when a surface becomes newly uncovered', () => {
    const currentResult = runAudit('--json');
    expect(currentResult.status, currentResult.stderr).toBe(0);
    const current = JSON.parse(currentResult.stdout);
    const newlyUncovered = current.uncovered[0];
    expect(newlyUncovered?.key).toBeTruthy();

    const scratch = mkdtempSync(join(tmpdir(), 'alloflow-voice-coverage-'));
    const baselinePath = join(scratch, 'strict-baseline.json');
    try {
      writeFileSync(baselinePath, JSON.stringify({
        schemaVersion: 1,
        minRegistryCommands: current.registryCommands,
        minHelpKeySurfaces: current.helpKeySurfaces,
        maxUncovered: current.uncoveredCount,
        knownUncovered: current.uncovered.slice(1).map((item) => item.key),
      }), 'utf8');

      const result = runAudit('--check', '--baseline', baselinePath);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('new uncovered surfaces:');
      expect(result.stderr).toContain(newlyUncovered.key);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
});
