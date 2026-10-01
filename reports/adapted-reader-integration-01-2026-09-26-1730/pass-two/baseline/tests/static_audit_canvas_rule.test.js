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
    expect(report).toContain('Critical:     0');
  });

  it('keeps an appended programmatic canvas actionable', () => {
    const report = scanFixture([
      "const canvas = document.createElement('canvas');",
      'host.appendChild(canvas);',
    ].join('\n'));

    expect(report).toContain('CANVAS-001');
    expect(report).toContain('Critical:     1');
  });

  it('keeps a returned programmatic canvas actionable', () => {
    const report = scanFixture([
      'function makeCanvas() {',
      "  const canvas = document.createElement('canvas');",
      '  return canvas;',
      '}',
    ].join('\n'));

    expect(report).toContain('CANVAS-001');
    expect(report).toContain('Critical:     1');
  });

  it('recognizes a canvas label after a nested ref callback closes', () => {
    const report = scanFixture([
      "h('canvas', {",
      '  ref: function (canvas) {',
      '    items.forEach(function (item) {',
      '      bind(item);',
      '    });',
      '  },',
      "  role: 'application',",
      "  'aria-label': 'Interactive station interior'",
      '});',
    ].join('\n'));

    expect(report).not.toContain('CANVAS-001');
  });

  it('does not borrow a label and role from a following sibling', () => {
    const report = scanFixture([
      "h('canvas', {",
      '  ref: function (canvas) {',
      '    items.forEach(bind);',
      '  }',
      '});',
      "h('div', { role: 'application', 'aria-label': 'Sibling control' });",
    ].join('\n'));

    expect(report).toContain('CANVAS-001');
  });

  it('ignores comment-only canvas examples', () => {
    const report = scanFixture(
      "// Example: h('canvas', {}) needs a text alternative when rendered."
    );

    expect(report).not.toContain('CANVAS-001');
  });

  it('ignores a renderer canvas used only as a console probe', () => {
    const report = scanFixture([
      'function probe() {',
      "  const testElement = h('canvas', { 'aria-label': 'test' });",
      "  DEBUG && console.log('probe', testElement && testElement.type);",
      '}',
    ].join('\n'));

    expect(report).not.toContain('CANVAS-001');
  });

  it('still reports an assigned renderer canvas that is returned', () => {
    const report = scanFixture([
      'function view() {',
      "  const chart = h('canvas', { 'aria-label': 'Chart' });",
      '  return chart;',
      '}',
    ].join('\n'));

    expect(report).toContain('CANVAS-001');
  });

  it('ignores a renderer canvas used only by a multiline console probe', () => {
    const report = scanFixture([
      'function probe() {',
      "  const testElement = h('canvas', { 'aria-label': 'test' });",
      "  DEBUG && console.log('probe:',",
      '    testElement ? testElement.type : null);',
      '}',
    ].join('\n'));

    expect(report).not.toContain('CANVAS-001');
  });

  it('shows actionable examples before detached canvas noise', () => {
    const report = scanFixture([
      ...Array.from({ length: 6 }, (_, index) =>
        "const detached" + index + " = document.createElement('canvas');"
      ),
      "const liveCanvas = document.createElement('canvas');",
      'host.appendChild(liveCanvas);',
    ].join('\n'));

    expect(report).toContain("const liveCanvas = document.createElement('canvas');");
  });
});
