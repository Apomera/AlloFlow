import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const start = source.indexOf('  function issMomentumTrial(');
const end = source.indexOf('  var ISS_SIDEREAL_DAY_S', start);
const trial = new Function(source.slice(start, end) + '\nreturn issMomentumTrial;')();

describe('space station microgravity contact experiment', () => {
  it('turns a rail impulse into mass-dependent coasting velocity', () => {
    const light = trial({ mass: 50, impulse: 10 }, 5);
    const heavy = trial({ mass: 100, impulse: 10 }, 5);
    expect(light.crewV).toBeCloseTo(0.2, 12);
    expect(heavy.crewV).toBeCloseTo(0.1, 12);
    expect(light.crewX).toBeCloseTo(1, 12);
    expect(heavy.crewX).toBeCloseTo(0.5, 12);
  });

  it.each(['catch', 'elastic'])('conserves signed momentum during %s contact', (mode) => {
    for (const drift of [-0.1, 0, 0.1]) {
      const settings = { mass: 70, cargo: 40, impulse: 20, drift, mode };
      const before = trial(settings, 0);
      const after = trial(settings, before.contactTime + 4);
      expect(after.contacted).toBe(true);
      expect(after.mass * after.crewV + after.cargo * after.cargoV).toBeCloseTo(before.momentum, 12);
      if (mode === 'catch') {
        expect(after.crewV).toBe(after.cargoV);
        expect(after.crewX).toBeCloseTo(after.cargoX, 12);
        expect(after.energyLost).toBeGreaterThan(0);
      } else {
        expect(after.energy).toBeCloseTo(before.initialEnergy, 12);
        expect(after.cargoV - after.crewV).toBeCloseTo(before.crewV - before.cargoV, 12);
      }
    }
  });

  it('keeps position continuous through the collision event', () => {
    const before = trial({}, 0);
    const contact = trial({}, before.contactTime);
    expect(contact.crewX).toBeCloseTo(before.initialSpeed * before.contactTime, 10);
    expect(contact.crewX).toBeCloseTo(contact.cargoX, 10);
    const justAfter = trial({}, before.contactTime + 0.00001);
    expect(justAfter.crewX - contact.crewX).toBeCloseTo(contact.crewV * 0.00001, 10);
  });

  it('never invents a collision when cargo recedes faster than the crew', () => {
    const result = trial({ mass: 110, impulse: 4, drift: 0.1 }, 120);
    expect(result.contacted).toBe(false);
    expect(result.contactTime).toBe(Infinity);
    expect(result.energyLost).toBe(0);
    expect(result.cargoX).toBeGreaterThan(result.crewX);
  });

  it('bounds invalid restored settings and returns finite displayed values', () => {
    const result = trial({ mass: 'bad', cargo: Infinity, impulse: -5, drift: NaN, mode: 'bad' }, Infinity);
    expect(result.mass).toBe(70);
    expect(result.cargo).toBe(15);
    expect(result.impulse).toBe(4);
    expect(result.mode).toBe('catch');
    for (const key of ['time', 'crewX', 'cargoX', 'crewV', 'cargoV', 'energy', 'energyLost', 'momentum']) {
      expect(Number.isFinite(result[key]), key).toBe(true);
    }
  });
});
