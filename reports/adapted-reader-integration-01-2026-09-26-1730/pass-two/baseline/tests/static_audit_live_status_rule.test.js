import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function scanModule(source, filename) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-live-rule-'));
  const fixture = path.join(directory, filename);
  fs.writeFileSync(fixture, source, 'utf8');
  try {
    return spawnSync(process.execPath, ['a11y-audit/static-audit.js', '--file', fixture], {
      cwd: process.cwd(),
      encoding: 'utf8',
    }).stdout;
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

describe('static audit live-status rule', () => {
  it('accepts dynamic modules that report through the shared toast channel', () => {
    const report = scanModule(
      'React.createElement("button", { onClick: () => addToast("Saved", "success") }, "Save");',
      'toast_module.js',
    );
    expect(report).not.toContain('LIVE-001');
  });

  it('still reports dynamic modules with no status channel', () => {
    const report = scanModule(
      'React.createElement("button", { onClick: save }, "Save");',
      'silent_module.js',
    );
    expect(report).toContain('LIVE-001');
  });

  it('accepts alertdialog as an assertive dialog status mechanism', () => {
    const report = scanModule(
      'React.createElement("div", { role: "alertdialog", onClick: close }, "Confirm deletion");',
      'confirm_module.js',
    );
    expect(report).not.toContain('LIVE-001');
  });
});
