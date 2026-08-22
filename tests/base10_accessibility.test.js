import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_manipulatives.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_manipulatives.js');

beforeEach(() => resetStemLab());

describe('Base Ten text accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('does not retain persistent seven, eight, or nine pixel labels', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).not.toMatch(/text-\[(?:7|8|9)px\]/);
    expect(source).not.toContain('fontSize: p.w >= 40 ? 12 : 9');
    expect(source).toContain('fontSize: p.w >= 40 ? 12 : 10');
  });

  it('renders the Base Ten surface without tiny utility text', () => {
    loadTool('stem_lab/stem_tool_manipulatives.js', 'base10');
    const html = renderTool('base10', { base10: {} });
    expect(html).not.toMatch(/text-\[(?:7|8|9)px\]/);
    expect(html).toContain('text-[10px]');
  });

  it('provides named, keyboard-operable slide-rule controls', () => {
    loadTool('stem_lab/stem_tool_manipulatives.js', 'base10');
    const html = renderTool('base10', { _manipulatives: { mode: 'slideRule', slideRule: { cOffset: 0, cursorPos: 0 } } });
    expect(html).toContain('role="img"');
    expect(html).toContain('Use the two sliders below for keyboard operation.');
    expect(html).toContain('aria-label="Slide rule keyboard controls"');
    expect(html).toContain('C scale position');
    expect(html).toContain('Red cursor position');
    expect(html).toContain('aria-valuetext="D scale 1.00"');
  });
});
