import fs from 'node:fs';
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';

const sourcePath = 'stem_lab/stem_tool_wave.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_wave.js';

describe('Wave Lab visual semantics and motion', () => {
  it('keeps source and public mirrors identical', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const mirror = fs.readFileSync(publicPath, 'utf8');
    expect(crypto.createHash('sha256').update(source).digest('hex'))
      .toBe(crypto.createHash('sha256').update(mirror).digest('hex'));
  });

  it('names the simulator canvas and standing-wave snapshot', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain('role: "application", "aria-label": __alloT(\'stem.wave.aria_canvas\'');
    expect(source).toContain('stem.wave.standing_wave_snapshot');
  });

  it('scopes Wave Lab table headers and gates pulse classes', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect((source.match(/scope: 'col'/g) || []).length).toBeGreaterThanOrEqual(16);
    expect(source).toContain('var reducedMotion =');
    expect(source).toContain("reducedMotion ? '' : 'animate-pulse '");
    expect(source).toContain("var anim = reducedMotion ? '' : 'animate-pulse'");
  });
});
