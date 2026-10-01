import fs from 'node:fs';
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';

const sourcePath = 'stem_lab/stem_tool_fireecology.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_fireecology.js';

describe('Fire Ecology forest canvas semantics', () => {
  it('keeps source and public mirrors identical', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const mirror = fs.readFileSync(publicPath, 'utf8');
    expect(crypto.createHash('sha256').update(source).digest('hex'))
      .toBe(crypto.createHash('sha256').update(mirror).digest('hex'));
  });

  it('exposes the forest visualization as a named image', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'img', 'aria-label': t('stem.fireecology.fireecology_visualization'");
    expect(source).toContain("'aria-label': t('stem.fireecology.forest_visualization_showing_current_f'");
  });
});
