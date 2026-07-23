import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function scanFixture(source) {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'alloflow-canvas-rule-')
  );
  const fixture = path.join(directory, 'fixture.js');
  fs.writeFileSync(fixture, source, 'utf8');
  try {
    return spawnSync(
      process.execPath,
      ['a11y-audit/static-audit.js', '--file', fixture],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
      }
    ).stdout;
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

describe('static audit canvas rule', () => {
  it('accepts internal canvases hidden with the DOM attribute API', () => {
    const report = scanFixture(
      [
        "const canvas = document.createElement('canvas');",
        "canvas.setAttribute('aria-hidden', 'true');",
      ].join('\n')
    );

    expect(report).not.toContain('CANVAS-001');
  });

  it('still reports an unclassified programmatic canvas', () => {
    const report = scanFixture(
      "const canvas = document.createElement('canvas');"
    );

    expect(report).toContain('CANVAS-001');
  });
});
