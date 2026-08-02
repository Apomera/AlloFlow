import fs from 'node:fs';
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';

const sourcePath = 'stem_lab/stem_tool_platetectonics.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_platetectonics.js';

describe('Plate Tectonics Lab navigation and search controls', () => {
  it('keeps source and public mirrors identical', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const mirror = fs.readFileSync(publicPath, 'utf8');
    expect(crypto.createHash('sha256').update(source).digest('hex'))
      .toBe(crypto.createHash('sha256').update(mirror).digest('hex'));
  });

  it('names the 3D canvas and all text search controls', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("'aria-label': tectGlAlt");
    expect((source.match(/stem\.platetectonics\.search_input/g) || []).length).toBeGreaterThanOrEqual(7);
  });

  it('exposes the category tool strip as a selectable tablist', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain('role: "tablist"');
    expect(source).toContain('role: "tab"');
    expect(source).toContain('"aria-selected": isActive');
    expect(source).toContain('tabIndex: isActive ? 0 : -1');
  });
});
