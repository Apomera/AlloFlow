// BirdLab 3D woodland sounds: every resident calls from one acoustic sketch,
// and where a call seems to come from is derived from the camera and the bird.
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const RESIDENTS = ['robin', 'chickadee', 'mourningDove', 'grouse', 'blueJay', 'northernCardinal', 'darkEyedJunco',
  'tuftedTitmouse', 'easternTowhee', 'americanGoldfinch', 'easternBluebird', 'whiteThroatedSparrow'];
let p;
beforeAll(() => {
  resetStemLab(); loadTool('stem_lab/stem_tool_birdlab.js', 'birdLab');
  p = window.__alloBirdLabPure;
  if (!p || !p.WOODLAND_CALLS) throw new Error('woodland sound helpers missing after load');
});

describe('BirdLab woodland sounds', () => {
  it('gives every woodland resident a playable call with a label and a calling rate', () => {
    expect(Object.keys(p.WOODLAND_CALLS).sort()).toEqual([...RESIDENTS].sort());
    for (const id of RESIDENTS) {
      const entry = p.WOODLAND_CALLS[id], tones = p.callTones({ sketch: entry.sketch });
      expect(entry.sketch.label, id).toMatch(/\w/);
      expect(entry.every, id).toBeGreaterThan(5);
      expect(tones.length, id).toBeGreaterThan(0);
      for (const tone of tones) expect(Number.isFinite(tone.freq) && tone.freq > 40 && tone.dur > 0, id).toBe(true);
    }
    // Reuses the trainer's sketches rather than a second copy of each call.
    expect(p.WOODLAND_CALLS.robin.sketch).toBe(p.CALL_SKETCHES.robin_call);
    expect(p.WOODLAND_CALLS.blueJay.sketch).toBe(p.CALL_SKETCHES.jay_call);
  });

  it('drums the grouse low and accelerating, trills the junco on one pitch', () => {
    const drum = p.callTones({ sketch: p.WOODLAND_CALLS.grouse.sketch });
    expect(Math.max(...drum.map(t => t.freq))).toBeLessThan(150);
    const gaps = drum.map(t => t.gap);
    for (let i = 1; i < gaps.length - 1; i++) expect(gaps[i]).toBeLessThanOrEqual(gaps[i - 1]);
    expect(gaps[0] / gaps[gaps.length - 2]).toBeGreaterThan(8);
    expect(p.WOODLAND_CALLS.grouse.every).toBeGreaterThan(p.WOODLAND_CALLS.chickadee.every);
    const trill = p.callTones({ sketch: p.WOODLAND_CALLS.darkEyedJunco.sketch });
    expect(trill).toHaveLength(1); expect(trill[0].trill).toBeGreaterThan(8); expect(trill[0].endFreq).toBe(trill[0].freq);
  });

  it('places a call ahead, beside or behind the listener and pans it to match', () => {
    const camera = [0, 1.6, 0], target = [0, 1.4, -4]; // looking toward -Z
    const at = (x, z) => p.soundBearing(camera, target, x, z);
    expect(at(0, -5).words).toBe('ahead'); expect(Math.abs(at(0, -5).pan)).toBeLessThan(.01);
    expect(at(5, 0).words).toBe('to your right'); expect(at(5, 0).pan).toBeGreaterThan(.95);
    expect(at(-5, 0).words).toBe('to your left'); expect(at(-5, 0).pan).toBeLessThan(-.95);
    expect(at(0, 5).words).toBe('behind you');
    expect(at(3, -3).words).toBe('ahead and to your right');
    expect(at(-3, 3).words).toBe('behind and to your left');
    expect(at(3, -4).distance).toBeCloseTo(5, 10);
    // Turning the head turns the sound: the same bird is now ahead.
    expect(p.soundBearing(camera, [4, 1.4, 0], 5, 0).words).toBe('ahead');
  });

  it('makes nearer calls louder, within bounds', () => {
    const levels = [0, 1, 3, 6, 12, 40].map(p.callLevel);
    for (let i = 1; i < levels.length; i++) expect(levels[i]).toBeLessThanOrEqual(levels[i - 1]);
    expect(levels[0]).toBe(1); expect(levels.at(-1)).toBeGreaterThanOrEqual(.06); expect(levels[3]).toBeLessThan(.4);
  });
});
