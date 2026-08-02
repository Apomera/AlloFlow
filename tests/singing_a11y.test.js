import fs from 'node:fs';
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';

const sourcePath = 'stem_lab/stem_tool_singing.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_singing.js';

describe('Singing Lab canvas and motion semantics', () => {
  it('keeps source and public mirrors identical', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const mirror = fs.readFileSync(publicPath, 'utf8');
    expect(crypto.createHash('sha256').update(source).digest('hex'))
      .toBe(crypto.createHash('sha256').update(mirror).digest('hex'));
  });

  it('names the interactive vocal-range keyboard canvas', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("h('canvas', { role: 'img'");
    expect(source).toContain('stem.singing.piano_keyboard_showing_vocal_range_use');
  });

  it('gates listening pulse indicators for reduced-motion users', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain('var reducedMotion =');
    expect((source.match(/reducedMotion \? '' : ' animate-pulse'/g) || []).length).toBe(2);
  });
});
