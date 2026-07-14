import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('visual_panel_source.jsx', 'utf8');

describe('visual panel WCAG 2.5.8 target sizes', () => {
  it('uses 24 by 24 drawing color targets', () => {
    expect(source).toContain("width: 24, height: 24, borderRadius: '50%', background: c");
    expect(source).not.toContain("width: 16, height: 16, borderRadius: '50%', background: c");
  });

  it('gives animation playback controls a 24 pixel minimum target', () => {
    expect(source.match(/minWidth: 24, minHeight: 24, padding: '2px 6px'/g)?.length).toBe(2);
    expect(source).toContain("minHeight: 24, padding: '2px 8px'");
  });

  it('gives frame delete, reorder, and duplicate actions 24 pixel targets', () => {
    expect(source).toContain('top: -8, right: -8, width: 24, height: 24');
    expect(source.match(/minWidth: 24, minHeight: 24, padding: '2px 4px'/g)?.length).toBe(3);
  });
});
