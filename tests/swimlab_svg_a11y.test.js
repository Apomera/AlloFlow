import fs from 'node:fs';
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';

const sourcePath = 'stem_lab/stem_tool_swimlab.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_swimlab.js';

describe('Swim Lab stroke diagrams', () => {
  it('keeps source and public mirrors identical', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const mirror = fs.readFileSync(publicPath, 'utf8');
    expect(crypto.createHash('sha256').update(source).digest('hex'))
      .toBe(crypto.createHash('sha256').update(mirror).digest('hex'));
  });

  it('names generated SVG stroke-phase diagrams from their captions', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'img'");
    expect(source).toContain('stem.swimlab.stroke_phase_diagram');
    expect(source).toContain("(opts.caption ? ': ' + opts.caption : '')");
  });
});
