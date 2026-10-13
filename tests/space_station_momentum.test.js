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

  it('resolves a partial rebound with equal opposite impulses and the correct energy loss', () => {
    const settings = { mass: 60, cargo: 20, impulse: 12, drift: -0.1, mode: 'cushioned', restitution: 0.5 };
    const before = trial(settings, 0);
    const after = trial(settings, before.contactTime);
    expect(after.mode).toBe('cushioned');
    expect(after.crewV).toBeCloseTo(0.0875, 12);
    expect(after.cargoV).toBeCloseTo(0.2375, 12);
    expect(after.crewImpulse).toBeCloseTo(-6.75, 12);
    expect(after.cargoImpulse).toBeCloseTo(6.75, 12);
    expect(after.energyLost).toBeCloseTo(0.50625, 12);
    expect(after.energy + after.energyLost).toBeCloseTo(1.3, 12);
    expect(after.crewImpulse).toBeCloseTo(after.mass * (after.crewV - before.crewV), 12);
    expect(after.cargoImpulse).toBeCloseTo(after.cargo * (after.cargoV - before.cargoV), 12);
  });

  it.each([0, 0.25, 0.5, 0.75, 1])('conserves momentum and accounts for energy across masses and drifts at e=%s', (restitution) => {
    for (const mass of [50, 110]) for (const cargo of [5, 40]) for (const impulse of [4, 22]) for (const drift of [-0.1, 0, 0.1]) {
      const settings = { mass, cargo, impulse, drift, mode: 'cushioned', restitution };
      const first = trial(settings, 0);
      const last = trial(settings, first.duration);
      expect(mass * last.crewV + cargo * last.cargoV).toBeCloseTo(first.momentum, 11);
      expect(last.crewEnergy + last.cargoEnergy + last.energyLost).toBeCloseTo(first.initialEnergy, 11);
      expect(last.crewImpulse + last.cargoImpulse).toBe(0);
      expect(last.energyLost).toBeGreaterThanOrEqual(0);
      expect(last.gap).toBeGreaterThanOrEqual(0);
      if (last.contacted) {
        expect(last.cargoV - last.crewV).toBeCloseTo(restitution * first.closingSpeed, 12);
        const energyAvailable = 0.5 * mass * cargo / (mass + cargo) * first.closingSpeed ** 2;
        expect(last.energyLost).toBeCloseTo(energyAvailable * (1 - restitution ** 2), 12);
      } else {
        expect(last.energyLost).toBe(0);
        expect(last.cargoImpulse).toBe(0);
      }
    }
  });

  it.each(['catch', 'cushioned', 'elastic'])('keeps the center of mass on a straight constant-speed path through %s contact', (mode) => {
    const settings = { mass: 50, cargo: 40, impulse: 8, drift: -0.1, mode, restitution: 0.6 };
    const first = trial(settings, 0);
    for (const time of [first.contactTime - 0.000001, first.contactTime, first.contactTime + 0.000001, first.duration]) {
      const current = trial(settings, time);
      expect(current.centerV).toBeCloseTo(first.momentum / 90, 12);
      expect(current.centerX).toBeCloseTo(first.centerX + first.centerV * time, 12);
      expect(current.crewX * 50 + current.cargoX * 40).toBeCloseTo(current.centerX * 90, 12);
    }
  });

  it('leaves a zero-momentum pair at rest after a catch and reverses it after an elastic bounce', () => {
    const settings = { mass: 50, cargo: 40, impulse: 4, drift: -0.1 };
    const caught = trial(settings, 30);
    const bounced = trial({ ...settings, mode: 'elastic' }, 30);
    expect(caught.centerV).toBe(0);
    expect(caught.crewV).toBe(0);
    expect(caught.cargoV).toBe(0);
    expect(caught.energyLost).toBeCloseTo(caught.initialEnergy, 12);
    expect(bounced.crewV).toBeCloseTo(-0.08, 12);
    expect(bounced.cargoV).toBeCloseTo(0.1, 12);
    expect(bounced.centerX).toBeCloseTo(caught.centerX, 12);
  });

  it('has no contact impulse before contact, on a backward seek, or beyond the observation window', () => {
    const settings = { mode: 'cushioned', restitution: 0.7 };
    const first = trial(settings, 0);
    expect(trial(settings, first.contactTime + 2).cargoImpulse).toBeGreaterThan(0);
    const rewound = trial(settings, first.contactTime - 0.1);
    expect(rewound.cargoImpulse).toBe(0);
    expect(rewound.energyLost).toBe(0);
    const late = trial({ mass: 100, cargo: 20, impulse: 11, drift: 0.1, mode: 'cushioned' }, 120);
    expect(late.contactTime).toBeCloseTo(250, 9);
    expect(late.contacted).toBe(false);
    expect(late.cargoImpulse).toBe(0);
    expect(late.energyLost).toBe(0);
  });

  it('preserves the catch and elastic presets regardless of the saved rebound value', () => {
    expect(trial({ mode: 'catch', restitution: 0.8 }, 0).restitution).toBe(0);
    expect(trial({ mode: 'elastic', restitution: 0.2 }, 0).restitution).toBe(1);
    expect(trial({ mode: 'cushioned' }, 0).restitution).toBe(0.5);
  });

  it.each([[null, 0.5], [NaN, 0.5], [Infinity, 0.5], ['bad', 0.5], [-1, 0], [2, 1], ['0.3', 0.3]])('bounds a restored rebound value of %s', (value, expected) => {
    expect(trial({ mode: 'cushioned', restitution: value }, 0).restitution).toBe(expected);
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
    for (const key of ['time', 'crewX', 'cargoX', 'crewV', 'cargoV', 'energy', 'energyLost', 'momentum', 'centerX', 'centerV', 'crewImpulse', 'cargoImpulse', 'crewEnergy', 'cargoEnergy', 'gap']) {
      expect(Number.isFinite(result[key]), key).toBe(true);
    }
  });
});
