import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let BH;
beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool('stem_lab/stem_tool_beehive.js', 'beehive'); BH = window.__RR_TEST_EXPORTS__.beehive; });
const flight = (patch = {}) => ({ phase: 'flight', y: 70, vy: 0, speed: 1.8, energy: 80, difficulty: 'normal', pacing: 'live', paused: false, stallWarning: false, ...patch });
const conditions = patch => BH.bhDroneFlightConditions(flight(patch));

describe('Drone flight conditions', () => {
  it('keeps an ordinary flight quiet while exposing its reading context', () => {
    expect(conditions()).toEqual({ context: 'Live readings · pause to plan a correction.', ground: false, climb: false, energy: false, items: [], announcement: '' });
  });

  it('requires both low height and downward motion past the exact ground thresholds', () => {
    expect(conditions({ y: 29.999, vy: -.5001 }).ground).toBe(true);
    for (const patch of [{ y: 30, vy: -1 }, { y: 10, vy: -.5 }, { y: 10, vy: 0 }, { y: 10, vy: .8 }]) expect(conditions(patch).ground).toBe(false);
    expect(conditions({ y: 29.999, vy: -.5001 }).items[0]).toMatchObject({ id: 'ground', evidence: '30 model ft high. Downward motion detected.', tone: 'danger' });
  });

  it('keeps ground guidance out of launch but retains its applicable climb and energy flags', () => {
    const result = conditions({ phase: 'launch', y: 8, vy: -1, stallWarning: true, energy: 12 });
    expect(result).toMatchObject({ ground: false, climb: true, energy: true });
    expect(result.items.map(item => item.id)).toEqual(['climb', 'energy']);
  });

  it('allows the same supported conditions in flight and congregation', () => {
    for (const phase of ['flight', 'congregation']) expect(conditions({ phase, y: 15, vy: -.7, stallWarning: true, energy: 10 })).toMatchObject({ ground: true, climb: true, energy: true });
  });

  it('suppresses stale flags after mating, completion, or an unknown phase', () => {
    for (const phase of ['mating', 'end', 'setup', undefined, null, '']) {
      expect(conditions({ phase, y: 10, vy: -1, stallWarning: true, energy: 5 })).toMatchObject({ ground: false, climb: false, energy: false, items: [], announcement: '' });
    }
  });

  it('uses the physics-owned climb flag without recomputing it from speed or controls', () => {
    expect(conditions({ speed: 0, controlPitch: 1, stallWarning: false }).climb).toBe(false);
    expect(conditions({ speed: 3, controlPitch: 0, stallWarning: true }).climb).toBe(true);
    expect(conditions({ stallWarning: true }).items[0].advice).toBe('Ease the climb and build forward speed before trying another short climb.');
    for (const stallWarning of [1, 'true', undefined, null]) expect(conditions({ stallWarning }).climb).toBe(false);
    expect(conditions({ speed: .84, stallWarning: true }).items[0].evidence).toBe('Model speed 0.8. The current climb has little forward speed.');
  });

  it.each([['easy', 125], ['hard', 82], ['normal', 105], ['unrecognized', 105]])('uses the actual %s difficulty reserve and raw quarter-reserve boundary', (difficulty, reserve) => {
    const below = conditions({ difficulty, energy: reserve * .25 - .001 });
    expect(below.energy).toBe(true);
    expect(below.items[0].evidence).toBe('25% of the full reserve for this difficulty remains.');
    expect(conditions({ difficulty, energy: reserve * .25 }).energy).toBe(false);
    expect(conditions({ difficulty, energy: reserve * .25 + .001 }).energy).toBe(false);
    expect(conditions({ difficulty, energy: reserve * .12 }).items[0].evidence).toBe('12% of the full reserve for this difficulty remains.');
  });

  it('rejects unavailable, nonfinite, or numeric-looking values instead of inventing ground or energy readings', () => {
    for (const invalid of [undefined, null, NaN, Infinity, -Infinity, '12', '', false]) {
      expect(conditions({ y: invalid, vy: -1 }).ground).toBe(false);
      expect(conditions({ y: 12, vy: invalid }).ground).toBe(false);
      expect(conditions({ energy: invalid }).energy).toBe(false);
    }
    expect(BH.bhDroneFlightConditions(null)).toMatchObject({ ground: false, climb: false, energy: false, items: [], announcement: '' });
  });

  it('states that a missing climb speed is unavailable while preserving a known zero', () => {
    for (const speed of [undefined, null, NaN, Infinity, '0']) expect(conditions({ stallWarning: true, speed }).items[0].evidence).toBe('Model speed unavailable. The current climb has little forward speed.');
    expect(conditions({ stallWarning: true, speed: 0 }).items[0].evidence).toBe('Model speed 0.0. The current climb has little forward speed.');
  });

  it('orders simultaneous guidance by ground, climb, then energy and gives concrete advice', () => {
    const result = conditions({ y: 12.4, vy: -1, stallWarning: true, speed: .6, energy: 10.5 });
    expect(result.items.map(item => item.id)).toEqual(['ground', 'climb', 'energy']);
    expect(result.items.map(item => item.title)).toEqual(['Descending near the ground', 'Slow climb', 'Low energy reserve']);
    expect(result.items.map(item => item.advice)).toEqual([
      'Use a short climb input, then check height and downward motion again.',
      'First address the descent near the ground. Once clear, build forward speed before another climb.',
      'Use short thrust bursts and glide when possible. There is no in-flight refueling.'
    ]);
  });

  it('puts pause and plan context before paused or live context', () => {
    expect(conditions({ pacing: 'steps', paused: false }).context).toBe('Pause & plan · readings update after a maneuver.');
    expect(conditions({ pacing: 'steps', paused: true }).context).toBe('Pause & plan · readings update after a maneuver.');
    expect(conditions({ paused: true }).context).toBe('Paused readings · plan before resuming.');
    expect(conditions({ paused: false }).context).toBe('Live readings · pause to plan a correction.');
  });

  it('keeps announcements stable as current numbers change within the same conditions', () => {
    const first = conditions({ y: 24, vy: -.6, stallWarning: true, speed: .8, energy: 20 });
    const next = conditions({ y: 12, vy: -2, stallWarning: true, speed: .2, energy: 5 });
    expect(first.items.map(item => item.evidence)).not.toEqual(next.items.map(item => item.evidence));
    expect(first.announcement).toBe(next.announcement);
    for (const item of first.items) {
      expect(first.announcement).toContain(item.title);
      expect(first.announcement).toContain(item.advice);
      expect(first.announcement).not.toContain(item.evidence);
    }
    expect(conditions({ y: 24, vy: -.6, stallWarning: true, speed: .8, energy: 20, paused: true }).announcement).not.toBe(first.announcement);
    expect(conditions({ y: 24, vy: -.6, stallWarning: false, speed: .8, energy: 20 }).announcement).not.toBe(first.announcement);
  });

  it('does not mutate frozen flight inputs or retain mutable result objects', () => {
    const state = Object.freeze(flight({ y: 16, vy: -1, speed: .5, stallWarning: true, energy: 12 }));
    const snapshot = { ...state };
    const first = BH.bhDroneFlightConditions(state);
    first.items[0].title = 'changed by caller';
    const next = BH.bhDroneFlightConditions(state);
    expect(state).toEqual(snapshot);
    expect(next.items[0].title).toBe('Descending near the ground');
    expect(next.announcement).toBe(first.announcement);
  });
});
