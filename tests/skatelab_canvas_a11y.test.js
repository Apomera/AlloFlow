import fs from 'node:fs';
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';

const sourcePath = 'stem_lab/stem_tool_skatelab.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_skatelab.js';

describe('Skate Lab motion canvas semantics', () => {
  it('keeps source and public mirrors identical', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const mirror = fs.readFileSync(publicPath, 'utf8');
    expect(crypto.createHash('sha256').update(source).digest('hex'))
      .toBe(crypto.createHash('sha256').update(mirror).digest('hex'));
  });

  it('names the simulation canvas and retains its dynamic scene label', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'img', 'aria-label': 'Interactive skate motion simulation canvas'");
    expect(source).toContain("'aria-label': (function() {");
    expect(source).toContain("'aria-describedby': 'sk-canvas-summary'");
  });
});
