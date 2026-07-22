import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('WCAG 2.2 audit harness', () => {
  it('runs axe rules for WCAG 2.2 A and AA', () => {
    const source = read('a11y-audit/runtime-audit.js');
    expect(source).toContain("'wcag22a'");
    expect(source).toContain("'wcag22aa'");
  });
  it('waits for the application loader to clear before auditing', () => {
    const source = read('a11y-audit/runtime-audit.js');
    expect(source).toContain("document.querySelector('#alloflow-loader')");
    expect(source).toContain('APP_READY_TIMEOUT_MS');
    expect(source).toContain("waitUntil: 'domcontentloaded', timeout: 60000");
  });
  it('checks the actual focused state rather than unfocused outlines', () => {
    const source = read('a11y-audit/runtime-audit.js');
    expect(source).toContain("el.focus({ preventScroll: true })");
    expect(source).toContain('noVisibleFocusCount');
    expect(source).toContain("input.getAttribute('aria-hidden') === 'true'");
    expect(source).not.toContain('outlineNoneCount');
  });
  it('delegates target-size exceptions to axe and checks redundant entry', () => {
    const source = read('a11y-audit/runtime-audit.js');
    expect(source).toContain("'wcag22aa'");
    expect(source).toContain("axe's wcag22aa target-size rule");
    expect(source).toContain('3.3.7 Redundant Entry');
    expect(source).not.toContain('undersizedTargets');
  });
  it('maps drag-and-drop to the WCAG 2.2 criterion', () => {
    const source = read('a11y-audit/static-audit.js');
    expect(source).toContain('2.5.7 Dragging Movements');
    expect(source).toContain("const STANDARD = 'WCAG 2.2 AA'");
  });

  it('accepts alertdialog semantics and reports zero-finding scans honestly', () => {
    const source = read('a11y-audit/static-audit.js');
    expect(source).toContain("(?:alert)?dialog");
    expect(source).toContain('lineNum + 12');
    expect(source).toContain('generateReport(allFindings, outputJson, files.length)');
    expect(source).toContain('NO HEURISTIC FINDINGS');
    expect(source).toContain('does not determine WCAG conformance');
  });

});
