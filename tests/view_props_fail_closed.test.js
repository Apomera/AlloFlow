import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = process.cwd();
const CHECKER = path.join(ROOT, 'dev-tools', 'check_view_props.cjs');

describe('view-props verifier fail-closed behavior', () => {
  it.each([
    ['fatal syntax errors', 'const deliberatelyBrokenView = "unterminated;\n', 'Unterminated string constant'],
    ['recoverable parser errors', 'const missingInitializer;\n', 'Missing initializer in const declaration'],
  ])('returns nonzero for %s', (_label, source, expectedError) => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-view-props-'));
    const malformedView = path.join(tempDir, 'view_parse_failure_source.jsx');
    fs.writeFileSync(malformedView, source, 'utf8');

    try {
      const result = spawnSync(process.execPath, [CHECKER, '--view', malformedView], {
        cwd: ROOT,
        encoding: 'utf8',
      });
      const output = `${result.stdout || ''}\n${result.stderr || ''}`;

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(output).toContain('parse failed:');
      expect(output).toContain(expectedError);
      expect(output).toContain('Views with parse failures: 1');
      expect(output).toContain('Analysis was incomplete');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
