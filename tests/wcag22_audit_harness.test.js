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
  it('checks the actual focused state rather than unfocused outlines', () => {
    const source = read('a11y-audit/runtime-audit.js');
    expect(source).toContain("el.focus({ preventScroll: true })");
    expect(source).toContain('noVisibleFocusCount');
    expect(source).not.toContain('outlineNoneCount');
  });
  it('checks target-size and redundant-entry criteria', () => {
    const source = read('a11y-audit/runtime-audit.js');
    expect(source).toContain('2.5.8 Target Size (Minimum)');
    expect(source).toContain('3.3.7 Redundant Entry');
  });
  it('maps drag-and-drop to the WCAG 2.2 criterion', () => {
    const source = read('a11y-audit/static-audit.js');
    expect(source).toContain('2.5.7 Dragging Movements');
    expect(source).toContain("const STANDARD = 'WCAG 2.2 AA'");
  });
});
