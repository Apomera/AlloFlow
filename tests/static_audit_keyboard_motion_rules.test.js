import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function scanFixture(source) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-a11y-rules-'));
  const fixture = path.join(directory, 'fixture.js');
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

describe('static audit keyboard and motion rules', () => {
  it('still reports an unprotected dialog backdrop and animation', () => {
    const report = scanFixture([
      'React.createElement("div", { role: "presentation", onClick: closeDialog }, "Backdrop");',
      'React.createElement("div", { role: "dialog", "aria-label": "Example" }, "Dialog");',
      'if (event.key === "Escape") closeDialog();',
      'React.createElement("div", { className: "animate-pulse" }, "Animated");',
    ].join('\n'));

    expect(report).toContain('KEYBOARD-001');
    expect(report).toContain('MOTION-001');
  });

  it('accepts Tailwind reduced-motion overrides', () => {
    const report = scanFixture('const visual = "animate-pulse motion-reduce:animate-none";');
    expect(report).not.toContain('[MAJOR] MOTION-001');
  });

  it('accepts the level-up backdrop with equivalent keyboard close paths', () => {
    const result = spawnSync(process.execPath, ['a11y-audit/static-audit.js', '--file', 'view_global_level_up_module.js'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Total findings:\s+0/);
  });
});
