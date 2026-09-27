import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// This helper lives inside the EVA closure. Run the production function without
// building a WebGL scene so different refresh rates use deterministic clocks.
const source = readFileSync('stem_lab/stem_tool_moonmission.js', 'utf8');
const start = source.indexOf('function mmAdvanceEvaResources(');
const end = source.indexOf('\n                    }', start);
if (start < 0 || end < 0) throw new Error('EVA resource clock is missing');
const advance = new Function('return (' + source.slice(start, end + 22) + ');')();
const fresh = () => ({ oxygen: 100, cooldown: 0, elapsed: 0, lastTime: null });

describe('EVA consumables use active elapsed time', () => {
  it.each([12, 30, 60, 144])('gives the same 90-second oxygen budget at %i fps', (fps) => {
    const state = fresh();
    advance(state, 0, false, 0.3);
    for (let frame = 1; frame <= fps * 90; frame++) advance(state, frame * 1000 / fps, false, 0.3);
    expect(state.oxygen).toBeCloseTo(73, 8);
    expect(state.elapsed).toBeCloseTo(90, 8);
  });

  it.each([12, 60, 144])('allows the next sample after one second at %i fps', (fps) => {
    const state = fresh();
    state.cooldown = 1;
    advance(state, 0, false, 0.3);
    for (let frame = 1; frame < fps; frame++) advance(state, frame * 1000 / fps, false, 0.3);
    expect(state.cooldown).toBeGreaterThan(0);
    advance(state, 1000, false, 0.3);
    expect(state.cooldown).toBe(0);
  });

  it('pauses reserve and interaction timers while hidden and resumes without a catch-up charge', () => {
    const state = fresh();
    state.cooldown = 1;
    advance(state, 0, false, 0.6);
    advance(state, 500, false, 0.6);
    advance(state, 1000, true, 0.6);
    advance(state, 120000, true, 0.6);
    advance(state, 121000, false, 0.6);
    expect(state.oxygen).toBeCloseTo(99.7, 8);
    expect(state.cooldown).toBeCloseTo(0.5, 8);
    expect(state.elapsed).toBe(0.5);
    advance(state, 121500, false, 0.6);
    expect(state.oxygen).toBeCloseTo(99.4, 8);
    expect(state.cooldown).toBe(0);
  });

  it('keeps a suspended browser from charging an entire absence when visibility events are missed', () => {
    const state = fresh();
    advance(state, 0, false, 0.3);
    advance(state, 600000, false, 0.3);
    expect(state.oxygen).toBeCloseTo(99.7, 8);
    expect(state.elapsed).toBe(1);
  });

  it('records hop airtime from the same active clock, including a takeoff at time zero', () => {
    const expression = source.match(/var hopSecs = ([^;]+);/)[1];
    const measuredHop = new Function('evaResources', 'evaHopStart', 'return ' + expression);
    const state = fresh();
    advance(state, 0, false, 0.3);
    const takeoff = state.elapsed;
    advance(state, 1000, false, 0.3);
    advance(state, 2000, true, 0.3);
    advance(state, 600000, false, 0.3);
    advance(state, 601000, false, 0.3);
    advance(state, 601100, false, 0.3);
    expect(measuredHop(state, takeoff)).toBe(2.1);
    expect(source).toContain('evaHopStart = evaResources.elapsed');
    expect(source).toContain('evaWasAirborne && evaHopStart !== null');
    expect(source).toContain('var evaHopDt = evaResourceDt');
  });

  it('stops exactly at an empty reserve and never produces a negative cooldown', () => {
    const state = fresh();
    state.oxygen = 0.1;
    state.cooldown = 0.1;
    advance(state, 0, false, 0.6);
    advance(state, 1000, false, 0.6);
    expect(state.oxygen).toBe(0);
    expect(state.cooldown).toBe(0);
  });

  it('uses the clock in the live loop for oxygen and both sample and instrument interactions', () => {
    expect(source).toContain('mmAdvanceEvaResources(evaResources, evaNow, document.hidden, diffSettings.o2Rate)');
    expect(source).toContain('evaO2 = evaResources.oxygen');
    expect(source).toContain('updateGtMission(evaResourceDt)');
    expect(source).not.toContain('evaSampleCooldown');
    expect(source).not.toContain('if (evaTick % 60 === 0) evaO2');
    expect(source.match(/evaResources\.cooldown = 1;/g)).toHaveLength(2);
    expect(source).toContain('if (evaResources) evaResources.lastTime = null;');
  });
});
