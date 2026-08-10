import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'symbol_studio_module.js'), 'utf8');
const mirror = fs.readFileSync(path.join(root, 'desktop/web-app/public/symbol_studio_module.js'), 'utf8');

describe('Symbol Studio accessible control names', () => {
  it('keeps the deploy mirror byte-identical', () => {
    expect(mirror).toBe(source);
  });

  it('leaves Reset progress only on the control that visibly resets progress', () => {
    expect(source.match(/'aria-label': 'Reset progress'/g)).toHaveLength(1);
    expect(source).toContain("}, '↻ Reset progress')");
  });

  it('does not use emoji-only or malformed variation-selector names', () => {
    expect(source).not.toMatch(/'aria-label': '[^A-Za-z0-9']*'/);
    expect(source).not.toMatch(/'aria-label': '[^A-Za-z0-9']+Print/);
  });

  it('names quick-board image actions by purpose and target', () => {
    expect(source).toContain("function qbUploadBtn(target, accessibleName)");
    expect(source).toContain("'Generate image for ' + (which === 'first'");
    expect(source).toContain("'Upload image for choice ' + (idx + 1)");
    expect(source).toContain("'Generate token board reward image'");
  });

  it('exposes choice count as a named pressed-state control', () => {
    expect(source).toContain("'aria-label': n + ' choices', 'aria-pressed': cbCount === n");
  });

  it('uses the canonical product and workspace names', () => {
    expect(source).toContain("'Symbol Studio'");
    expect(source).not.toContain('Visual Supports Studio');
    expect(source).toContain("label: 'Symbol Bank'");
    expect(source).toContain("label: 'Sequences'");
  });

  it('uses item-specific names for destructive, export, print, and scan actions', () => {
    expect(source).toContain("'Delete profile ' + (activeProfile.name || 'student')");
    expect(source).toContain("'Remove IEP goal: ' + g.text");
    expect(source).toContain("'Delete saved board ' + (b.title || 'Untitled Board')");
    expect(source).toContain("'Delete saved sequence ' + (s.title || 'Untitled Sequence')");
    expect(source).toContain("'Print all boards in ' + (activeBook.title || 'Visual Pack')");
    expect(source).toContain("'Export shareable Visual Pack ' + (activeBook.title || 'Untitled')");
    expect(source).toContain("'Delete Visual Pack ' + (activeBook.title || 'Untitled')");
    expect(source).toContain("'Exit scanning mode'");
  });
});
