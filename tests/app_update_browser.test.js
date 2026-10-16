import { test, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

test('real browser update lifecycle preserves genuine updates and suppresses false positives', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-update-regression-'));
  const report = path.join(directory, 'results.json');
  try {
    const result = await promisify(execFile)(process.execPath, ['dev-tools/check_app_update_browser.cjs'], {
      cwd: process.cwd(),
      env: { ...process.env, ALLO_UPDATE_REPORT: report },
      timeout: 180000,
      maxBuffer: 1024 * 1024
    });
    const evidence = JSON.parse(fs.readFileSync(report, 'utf8'));
    expect(evidence.passed, result.stdout + result.stderr).toBe(true);
    expect(evidence.records).toHaveLength(10);
    expect(evidence.records.every(record => record.passed)).toBe(true);
  } finally {
    if (!path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep)
      || !path.basename(directory).startsWith('alloflow-update-regression-')) throw new Error('Unexpected fixture directory');
    fs.rmSync(directory, { recursive: true, force: true });
  }
}, 190000);
