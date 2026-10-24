import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sliceBetween } from './helpers/anchored_slice.js';

const source = readFileSync('stem_lab/stem_tool_birdlab.js', 'utf8');
const block = sliceBetween(source, '  var BIRDLAB_CHORUS_VOICES =', '  function BirdlabChorusTimelineStudy(', { file: 'stem_tool_birdlab.js' });
const { windows, at, boundaries, authored } = new Function(block + '\nreturn {windows:birdlabChorusWindows,at:birdlabChorusAt,boundaries:birdlabChorusBoundaries,authored:BIRDLAB_CHORUS_SCORE};')();
const voices = ['robin', 'chickadee', 'redwingBlackbird', 'bluejay'];
const phases = [[0], [0, 1, 2], [0, 1, 2, 3], [1, 3]];
// Integer twentieth-second fixtures: a separate discrete interval oracle.
const score = [
  [[8, 32], [64, 88], [136, 160], [200, 224]],
  [[20, 30], [44, 56], [100, 112], [168, 180]],
  [[56, 80], [120, 146], [194, 214]],
  [[36, 48], [96, 116], [174, 192], [226, 238]],
];
const offsets = values => Object.fromEntries(voices.map((voice, i) => [voice, values[i]]));
function oracle(phase, shifts) {
  return phases[phase].flatMap(voice => score[voice].flatMap(([a, b], index) => {
    const shift = Math.round(shifts[voices[voice]] * 20), start = Math.max(0, a + shift), end = Math.min(240, b + shift);
    return end > start ? [{ voice: voices[voice], index, start: start / 20, end: end / 20 }] : [];
  }));
}

describe('BirdLab authored chorus interval geometry', () => {
  it.each([0, 1, 2, 3])('clips every eligible phrase exactly in phase %s', phase => {
    for (const values of [[0, 0, 0, 0], [-2, -2, -2, -2], [2, 2, 2, 2], [1, -2, -1.1, 2], [-2, .7, 2, -1]]) {
      const shifts = offsets(values), result = windows(phase, shifts);
      expect(result).toEqual(oracle(phase, shifts));
      for (const window of result) { expect(window.start).toBeGreaterThanOrEqual(0); expect(window.end).toBeLessThanOrEqual(12); expect(window.end).toBeGreaterThan(window.start); }
    }
  });
  it.each([0, 1, 2, 3])('uses half-open membership at every 50 ms tick in phase %s', phase => {
    for (const shifts of [offsets([0, 0, 0, 0]), offsets([1, -2, -1.1, 2]), offsets([-2, .7, 2, -1])]) {
      const intervals = oracle(phase, shifts);
      for (let tick = 0; tick <= 240; tick++) {
        const expected = voices.filter(voice => intervals.some(w => w.voice === voice && tick >= Math.round(w.start * 20) && tick < Math.round(w.end * 20)));
        expect(at(phase, shifts, tick / 20)).toEqual(expected);
      }
    }
  });
  it('includes each unique event boundary once in chronological order with both window endpoints', () => {
    const shifts = offsets([1, -2, -1.1, 2]);
    for (const phase of [0, 1, 2, 3]) {
      const expected = [...new Set([0, 12, ...oracle(phase, shifts).flatMap(w => [w.start, w.end])])].sort((a, b) => a - b);
      expect(boundaries(phase, shifts)).toEqual(expected);
    }
  });
  it('keeps authored windows and caller offsets immutable across repeated investigations', () => {
    const original = JSON.stringify(authored), shifts = Object.freeze(offsets([1, -2, -.7, 2]));
    for (const phase of [0, 1, 2, 3]) { windows(phase, shifts); at(phase, shifts, 5); boundaries(phase, shifts); }
    expect(JSON.stringify(authored)).toBe(original); expect(shifts).toEqual(offsets([1, -2, -.7, 2]));
  });
  it('clips away phrases beyond the window without wrapping them or changing another lane', () => {
    const shifted = windows(2, offsets([0, 0, 0, 2])), base = windows(2, offsets([0, 0, 0, 0]));
    expect(shifted.filter(w => w.voice !== 'bluejay')).toEqual(base.filter(w => w.voice !== 'bluejay'));
    expect(shifted.filter(w => w.voice === 'bluejay').map(w => w.index)).toEqual([0, 1, 2]);
    expect(at(2, offsets([0, 0, 0, 2]), 12)).toEqual([]);
  });
  it('uses zero for nonfinite offsets, bounds finite shifts and returns no voices for invalid time', () => {
    expect(windows(2, offsets([NaN, Infinity, undefined, -Infinity]))).toEqual(windows(2, offsets([0, 0, 0, 0])));
    expect(windows(2, offsets([-9, 9, 100, -100]))).toEqual(windows(2, offsets([-2, 2, 2, -2])));
    for (const time of [NaN, Infinity, -Infinity, -1, 13]) expect(at(2, {}, time)).toEqual([]);
    expect(windows(-1, {})).toEqual([]); expect(boundaries(-1, {})).toEqual([0, 12]);
  });
});
