import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_coordgrid.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_coordgrid.js');

beforeEach(() => resetStemLab());

describe('Coordinate Grid text accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('does not retain persistent text below ten pixels', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).not.toMatch(/text-\[(?:[0-9])px\]/);
    expect(source).not.toMatch(/fontSize:\s*(?:[0-9](?:\.[0-9]+)?)\b/);
  });

  it('renders the Coordinate Grid surface without tiny utility or SVG text', () => {
    loadTool('stem_lab/stem_tool_coordgrid.js', 'coordinate');
    const html = renderTool('coordinate', { coordinate: {} });
    expect(html).not.toMatch(/text-\[(?:[0-9])px\]/);
    expect(html).not.toMatch(/font-size="(?:[0-9](?:\.[0-9]+)?)"/);
    expect(html).toContain('text-[10px]');
  });

  it('names the grid visualization and exposes a keyboard coordinate-entry path', () => {
    loadTool('stem_lab/stem_tool_coordgrid.js', 'coordinate');
    const html = renderTool('coordinate', { _coordGrid: { cgTab: 'explore', coordinateInputX: 2, coordinateInputY: -3 } });
    expect(html).toContain('role="img"');
    expect(html).toContain('Use the X and Y controls below for keyboard operation.');
    expect(html).toContain('aria-label="Coordinate entry"');
    expect(html).toContain('value="2"');
    expect(html).toContain('value="-3"');
    expect(html).toContain('Plot or remove point');
  });
});
