import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('stem_lab/birdlab_3d_engine.js', 'utf8');
const start = source.indexOf('  function selectQuality('), end = source.indexOf('  function mount(', start);
if (start < 0 || end < 0) throw new Error('Missing BirdLab scene quality selector');
const selectorFor = new Function('global', `${source.slice(start, end)};return selectQuality;`);

function device(width, pointer) {
  return { innerWidth: width, matchMedia(query) {
    expect(query).toBe('(pointer: fine)');
    return { matches: pointer === 'fine' };
  } };
}

describe('BirdLab input-aware scene quality', () => {
  it.each([320, 390, 558, 639])('retains full woodland detail in a %spx desktop panel', width => {
    expect(selectorFor(device(width, 'fine'))()).toBe('high');
  });

  it.each(['coarse', 'none'])('uses the lighter woodland for narrow %s input devices', pointer => {
    for (const width of [320, 390, 558, 639]) expect(selectorFor(device(width, pointer))()).toBe('low');
  });

  it('safely falls back for unavailable or unusable input detection on narrow displays', () => {
    for (const matchMedia of [undefined, null, true, () => null, () => { throw new Error('Unavailable input query'); }]) {
      expect(selectorFor({ innerWidth: 558, matchMedia })()).toBe('low');
    }
  });

  it.each([640, 768, 1280])('keeps full detail for a %spx viewport regardless of pointer capability', width => {
    for (const pointer of ['fine', 'coarse', 'none']) expect(selectorFor(device(width, pointer))()).toBe('high');
    expect(selectorFor({ innerWidth: width })()).toBe('high');
  });

  it('honors both explicit modes before inspecting the viewport or querying its pointer', () => {
    for (const width of [320, 558, 1280]) {
      let queries = 0;
      const choose = selectorFor({ innerWidth: width, matchMedia() { queries++; return { matches: false }; } });
      expect(choose('low')).toBe('low'); expect(choose('high')).toBe('high');
      expect(queries).toBe(0);
    }
    for (const pointer of ['fine', 'coarse', 'none']) {
      expect(selectorFor(device(558, pointer))('high')).toBe('high');
      expect(selectorFor(device(1280, pointer))('low')).toBe('low');
    }
  });

  it('treats unrecognized modes as automatic without changing the public API', () => {
    for (const requested of [undefined, null, 'auto', 'medium']) {
      expect(selectorFor(device(558, 'fine'))(requested)).toBe('high');
      expect(selectorFor(device(558, 'coarse'))(requested)).toBe('low');
    }
    const window = {};
    new Function('window', source)(window);
    expect(window.BirdLab3D.selectQuality).toBeUndefined();
    expect(Object.keys(window)).toEqual(['BirdLab3D']);
  });
});
