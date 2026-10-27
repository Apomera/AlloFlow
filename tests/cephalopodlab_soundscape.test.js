import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// The Hunter Sim drone was identical at 5 m and 3000 m and jetting made no
// sound. Levels now come from one pure function that follows the light reaching
// the animal; these checks run that production function.
const source = readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js', 'utf8').replace(/\r\n/g, '\n');

function braced(start) {
  let depth = 0, quote = '';
  for (let i = start; i < source.length; i++) {
    const c = source[i];
    if (quote) { if (c === '\\') { i++; continue; } if (c === quote) quote = ''; continue; }
    if (c === '\'' || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    if (c === '}' && !--depth) return source.slice(start, i + 1);
  }
  throw new Error('Unterminated block');
}
const levels = new Function(braced(source.indexOf('function clHuntSoundscapeLevels(')) + ';return clHuntSoundscapeLevels;')();
const block = (() => {
  const start = source.indexOf('        // ─── Soundscape that follows the water ───');
  const end = source.indexOf('function updateHuntSoundscape(', start);
  return source.slice(start, end) + braced(end);
})();

describe('Cephalopod Hunter soundscape', () => {
  it('keeps the reef drone exactly as it was and adds a reef shrimp crackle', () => {
    const reef = levels(1, false);
    expect(reef.drone).toBeCloseTo(0.55, 6);
    expect(reef.cutoff).toBeCloseTo(320, 6);
    expect(reef.shrimp).toBeGreaterThan(0.05);
    expect(reef.jet).toBe(0);
  });

  it('darkens and quiets the water with depth and silences the reef shrimp where there is no reef light', () => {
    const reef = levels(1, false), twilight = levels(0.2, false), dark = levels(0, false);
    expect(twilight.drone).toBeLessThan(reef.drone); expect(dark.drone).toBeLessThan(twilight.drone);
    expect(twilight.cutoff).toBeLessThan(reef.cutoff); expect(dark.cutoff).toBeLessThan(twilight.cutoff);
    expect(dark.shrimp).toBe(0);
    expect(dark.drone).toBeGreaterThan(0.2);
    for (const v of [levels(-1, true), levels(2, true)]) for (const k of ['shrimp', 'jet', 'drone']) { expect(v[k]).toBeGreaterThanOrEqual(0); expect(v[k]).toBeLessThanOrEqual(0.6); }
  });

  it('plays the jet only while jetting, quieter than the predator and bite cues', () => {
    expect(levels(1, true).jet).toBeGreaterThan(0);
    expect(levels(1, false).jet).toBe(0);
    expect(levels(0, true).jet).toBe(levels(1, true).jet);
    expect(levels(1, true).jet).toBeLessThan(0.18); // sfxPredatorAlert peaks at 0.18, sfxBite at 0.3
  });

  it('routes every new source through masterGain and never draws from world randomness', () => {
    expect(block).not.toMatch(/Math\.random/);
    expect(block).not.toMatch(/\.connect\(audioCtx\.destination\)/);
    expect((block.match(/\.connect\(masterGain\)/g) || []).length).toBe(2);
    expect(source).toMatch(/updateHuntSoundscape\(depthLight, !!gameState\.isJetting\);/);
  });
});
