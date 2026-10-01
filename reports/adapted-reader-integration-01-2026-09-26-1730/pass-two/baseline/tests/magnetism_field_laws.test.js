// Magnetism: the physics laws the tool exists to teach (2026-09-21).
//
// The tool has 20 test files and a --deep hostile sweep that now reports zero
// crashes, so it is well covered against BREAKING. What no suite covered is the
// tool being WRONG: the laws themselves.
//
// That distinction matters here more than in most tools. A learner runs a field
// scan, fits a power law, and reads an exponent off the screen -- the number the
// tool prints IS the lesson. If a refactor changed the dipole falloff from 1/r^3
// to 1/r^2, every existing magnetism suite would stay green while the tool taught
// the wrong physics. Spot values do not catch that; the invariants do.
//
// So these tests assert relationships rather than magnitudes wherever possible:
// a ratio, an exponent, a symmetry, a saturation bound. Those survive a change
// of units or scale factor and fail loudly on a change of physics.
//
// Every assertion RUNS the shipped function. None of them restate a formula
// that the tool could drift away from silently.

import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const physics = require(resolve(process.cwd(), 'stem_lab/stem_tool_magnetism.js'));

const DIPOLE = { x: 0, y: 0, angle: 0, polarity: 1, strength: 1 };
const magnitude = (v) => Math.hypot(v.x, v.y);

describe('the dipole field obeys the law the tool draws', () => {
  it('falls off as the cube of distance, not the square', () => {
    // The headline law. r^3 * |B| is constant for a true dipole, so this pins
    // the EXPONENT rather than any particular field value.
    const invariant = [1, 2, 4, 8, 16].map((r) => magnitude(physics.dipoleFieldAt(r, 0, DIPOLE)) * r ** 3);
    for (const value of invariant) expect(value).toBeCloseTo(invariant[0], 9);

    // And state it the way a learner would check it: double the distance,
    // one-eighth the field.
    const near = magnitude(physics.dipoleFieldAt(2, 0, DIPOLE));
    const far = magnitude(physics.dipoleFieldAt(4, 0, DIPOLE));
    expect(near / far).toBeCloseTo(8, 9);
  });

  it('is exactly twice as strong on the axis as on the equator', () => {
    // The classic dipole signature, and the thing a "simplified" rewrite is
    // most likely to flatten to 1:1 without anyone noticing.
    for (const r of [0.5, 1, 3, 7]) {
      const axial = magnitude(physics.dipoleFieldAt(r, 0, DIPOLE));
      const equatorial = magnitude(physics.dipoleFieldAt(0, r, DIPOLE));
      expect(axial / equatorial, 'r=' + r).toBeCloseTo(2, 9);
    }
  });

  it('points along the moment on the axis and against it on the equator', () => {
    // Direction, not just strength: this is what makes the drawn field lines
    // close into loops instead of radiating like a charge.
    const axial = physics.dipoleFieldAt(3, 0, DIPOLE);
    expect(axial.x).toBeGreaterThan(0);
    expect(axial.y).toBeCloseTo(0, 12);

    const equatorial = physics.dipoleFieldAt(0, 3, DIPOLE);
    expect(equatorial.x).toBeLessThan(0);
    expect(equatorial.y).toBeCloseTo(0, 12);
  });

  it('reverses exactly when the magnet is flipped', () => {
    const flipped = Object.assign({}, DIPOLE, { polarity: -1 });
    for (const pair of [[2, 1], [-3, 0.5], [0, 4]]) {
      const forward = physics.dipoleFieldAt(pair[0], pair[1], DIPOLE);
      const reversed = physics.dipoleFieldAt(pair[0], pair[1], flipped);
      expect(forward.x + reversed.x, 'x at ' + pair).toBeCloseTo(0, 12);
      expect(forward.y + reversed.y, 'y at ' + pair).toBeCloseTo(0, 12);
    }
  });

  it('scales linearly with magnet strength', () => {
    const strong = physics.dipoleFieldAt(2, 1, Object.assign({}, DIPOLE, { strength: 3 }));
    const weak = physics.dipoleFieldAt(2, 1, DIPOLE);
    expect(strong.x / weak.x).toBeCloseTo(3, 9);
    expect(strong.y / weak.y).toBeCloseTo(3, 9);
  });

  it('stays finite at the magnet itself instead of dividing by zero', () => {
    // A learner can drag a probe onto the magnet. NaN here would propagate
    // through every downstream readout.
    const atCentre = physics.dipoleFieldAt(0, 0, DIPOLE);
    expect(Number.isFinite(atCentre.x) && Number.isFinite(atCentre.y)).toBe(true);
  });
});

describe('several magnets add up, they do not average', () => {
  it('superposes exactly', () => {
    // Superposition is the reason two magnets can cancel. If fieldAt averaged
    // or clamped, the null point the tool asks learners to find would not exist.
    const a = { x: -1, y: 0, angle: 0, polarity: 1, strength: 2 };
    const b = { x: 1, y: 0.5, angle: 1.1, polarity: -1, strength: 0.7 };
    const total = physics.fieldAt(0.3, 0.4, [a, b]);
    const separate = [physics.dipoleFieldAt(0.3, 0.4, a), physics.dipoleFieldAt(0.3, 0.4, b)];

    expect(total.x).toBeCloseTo(separate[0].x + separate[1].x, 12);
    expect(total.y).toBeCloseTo(separate[0].y + separate[1].y, 12);
  });

  it('cancels to a weaker field between two opposed equal magnets', () => {
    // The teaching payoff of superposition, asserted as a real cancellation
    // rather than as a formula.
    const left = { x: -1, y: 0, angle: 0, polarity: 1, strength: 1 };
    const right = { x: 1, y: 0, angle: 0, polarity: -1, strength: 1 };
    const midpoint = magnitude(physics.fieldAt(0, 0, [left, right]));
    const offCentre = magnitude(physics.fieldAt(0.6, 0, [left, right]));
    expect(midpoint).toBeLessThan(offCentre);
  });

  it('gives no field at all when there are no magnets', () => {
    expect(magnitude(physics.fieldAt(1, 1, []))).toBe(0);
  });
});

describe('a scan-and-fit recovers the exponent it is supposed to teach', () => {
  const DISTANCES = [1, 1.5, 2, 3, 4, 6, 8];

  it('reads back the cube law off clean dipole data', () => {
    // This is the tool's inquiry loop end to end: measure, fit, read the
    // exponent. The number below is what a learner writes in their notebook.
    const fit = physics.fieldPowerLawFit(physics.fieldScanSeries([DIPOLE], 'axial', DISTANCES, 0, 0));
    expect(fit.exponent).toBeCloseTo(-3, 6);
    expect(fit.rSquared).toBeGreaterThan(0.9999);
    expect(fit.count).toBe(DISTANCES.length);
  });

  it('recovers the same law on the equatorial path, at half the strength', () => {
    const axial = physics.fieldPowerLawFit(physics.fieldScanSeries([DIPOLE], 'axial', DISTANCES, 0, 0));
    const equatorial = physics.fieldPowerLawFit(physics.fieldScanSeries([DIPOLE], 'equatorial', DISTANCES, 0, 0));

    expect(equatorial.exponent).toBeCloseTo(-3, 6);
    // Same law, different constant -- the 2:1 axial/equatorial ratio again,
    // this time surfacing through the fitted coefficient.
    expect(axial.coefficient / equatorial.coefficient).toBeCloseTo(2, 6);
  });

  it('stays unbiased when the measurement is noisy', () => {
    // Noise must scatter the estimate, not walk it toward a different law.
    // Averaged over many runs the exponent has to stay at -3.
    const runs = Array.from({ length: 60 }, () =>
      physics.fieldPowerLawFit(physics.fieldScanSeries([DIPOLE], 'axial', DISTANCES, 0, 12)).exponent);
    const mean = runs.reduce((sum, value) => sum + value, 0) / runs.length;
    expect(mean).toBeCloseTo(-3, 1);
    expect(runs.every((value) => Number.isFinite(value))).toBe(true);
  });

  it('reports a lower fit quality on noisy data than on clean data', () => {
    // If rSquared came back 1.0 whatever the data, it would teach learners that
    // a noisy run fits perfectly -- worse than showing no number at all.
    const clean = physics.fieldPowerLawFit(physics.fieldScanSeries([DIPOLE], 'axial', DISTANCES, 0, 0));
    const noisy = Array.from({ length: 40 }, () =>
      physics.fieldPowerLawFit(physics.fieldScanSeries([DIPOLE], 'axial', DISTANCES, 0, 35)).rSquared);
    const meanNoisy = noisy.reduce((sum, value) => sum + value, 0) / noisy.length;
    expect(meanNoisy).toBeLessThan(clean.rSquared);
  });
});

describe('an iron core multiplies the field but cannot exceed saturation', () => {
  const SOFT = 'soft';

  it('multiplies a weak field by the material permeability', () => {
    // At small fields the core is still in its linear region, so the gain IS
    // the quoted initialMu. That number is on screen, so it has to be real.
    for (const key of ['soft', 'steel']) {
      const tiny = 1e-9;
      const gain = physics.coreAdjustedField(tiny, key) / tiny;
      expect(gain, key).toBeCloseTo(physics.CORE_MATERIALS[key].initialMu, 3);
    }
  });

  it('saturates the material contribution at the quoted tesla value', () => {
    // The subtlety worth pinning: saturation caps what the IRON contributes,
    // not total B. Total keeps rising because the vacuum term does -- which is
    // correct physics, and is exactly why a naive "output <= saturationT" check
    // would be wrong here.
    const limit = physics.CORE_MATERIALS[SOFT].saturationT;
    for (const applied of [0.01, 0.1, 1, 10, 1000]) {
      const contributed = physics.coreAdjustedField(applied, SOFT) - applied;
      expect(contributed, 'applied ' + applied).toBeLessThanOrEqual(limit + 1e-9);
    }
    // And it really does reach the limit rather than stalling below it.
    expect(physics.coreAdjustedField(50, SOFT) - 50).toBeCloseTo(limit, 6);
  });

  it('never bends back on itself as the field rises', () => {
    // A non-monotonic core response would show a learner more current giving
    // less field.
    let previous = -Infinity;
    for (let applied = 0; applied <= 5; applied += 0.01) {
      const output = physics.coreAdjustedField(applied, SOFT);
      expect(output).toBeGreaterThanOrEqual(previous - 1e-12);
      previous = output;
    }
  });

  it('leaves air untouched and keeps iron ahead of steel', () => {
    for (const applied of [1e-4, 1, 100]) expect(physics.coreAdjustedField(applied, 'air')).toBe(applied);
    expect(physics.coreAdjustedField(1e-4, 'soft')).toBeGreaterThan(physics.coreAdjustedField(1e-4, 'steel'));
  });

  it('reverses with the field instead of only working one way', () => {
    for (const applied of [1e-3, 0.5, 3]) {
      expect(physics.coreAdjustedField(-applied, SOFT)).toBeCloseTo(-physics.coreAdjustedField(applied, SOFT), 12);
    }
  });
});

describe('the solenoid formula behaves like a real solenoid', () => {
  it('approaches the ideal long-coil field as the coil gets long and thin', () => {
    // The textbook result students are told to expect. The shipped function is
    // the FINITE formula, so this pins that it converges to the ideal one
    // rather than being the ideal one mislabelled.
    const turns = 1000;
    const current = 2;
    const radius = 0.01;
    const ratios = [0.02, 0.2, 2, 20].map((length) => {
      const ideal = physics.MU0 * (turns / length) * current;
      return physics.finiteSolenoidCenterField(turns, current, length, radius, 'air') / ideal;
    });

    // Short coil: measurably below ideal. Long coil: indistinguishable from it.
    expect(ratios[0]).toBeLessThan(0.99);
    expect(ratios[ratios.length - 1]).toBeCloseTo(1, 5);
    // And it closes the gap monotonically as the coil lengthens.
    for (let i = 1; i < ratios.length; i += 1) expect(ratios[i]).toBeGreaterThan(ratios[i - 1]);
  });

  it('is linear in both turns and current', () => {
    const base = physics.finiteSolenoidCenterField(200, 3, 1, 0.001, 'air');
    expect(physics.finiteSolenoidCenterField(400, 3, 1, 0.001, 'air') / base).toBeCloseTo(2, 9);
    expect(physics.finiteSolenoidCenterField(200, 6, 1, 0.001, 'air') / base).toBeCloseTo(2, 9);
    expect(physics.finiteSolenoidCenterField(200, 0, 1, 0.001, 'air')).toBe(0);
  });

  it('charges heating as current squared, so doubling current quadruples it', () => {
    // The cost side of the trade-off the tool asks learners to balance. If this
    // were linear, "more current" would look cheaper than it is.
    const single = physics.solenoidHeatingIndex(100, 1, 0.02, 0.1);
    expect(physics.solenoidHeatingIndex(100, 2, 0.02, 0.1) / single).toBeCloseTo(4, 9);
    expect(physics.solenoidHeatingIndex(100, 3, 0.02, 0.1) / single).toBeCloseTo(9, 9);
  });

  it('needs more wire for more turns, and never negative wire', () => {
    expect(physics.solenoidWireLength(200, 0.02, 0.1))
      .toBeGreaterThan(physics.solenoidWireLength(100, 0.02, 0.1));
    expect(physics.solenoidWireLength(-50, -0.02, -0.1)).toBeGreaterThanOrEqual(0);
  });
});

describe('transmission loss really is the inverse-square law it is labelled', () => {
  // The grid lens prints "inverse square" next to a wire-heat factor and tells
  // the learner current falls as 1/V and heat as 1/V^2. Both are checked here
  // against the shipped model, because that caption is a claim.
  const grid = (voltage) => physics.transformerGridLossState(voltage, true, 1000, 1);

  it('drops wire heat as the inverse square of voltage across the preset range', () => {
    for (const voltage of [60, 120, 240, 480, 1200]) {
      const state = grid(voltage);
      expect(state.lossRatio, voltage + ' V').toBeCloseTo(1 / state.voltageRatio ** 2, 9);
    }
  });

  it('drops current as the inverse of voltage', () => {
    for (const voltage of [60, 240, 480]) {
      const state = grid(voltage);
      expect(state.currentRatio, voltage + ' V').toBeCloseTo(1 / state.voltageRatio, 9);
    }
  });

  it('holds the delivered payload fixed, as the caption promises', () => {
    // "Hold the delivered payload at 1,000 W" -- the whole comparison is void
    // if the lanes quietly deliver different amounts of power.
    for (const voltage of [60, 120, 480]) {
      const state = grid(voltage);
      expect(state.live.current * state.live.voltage, voltage + ' V').toBeCloseTo(state.payloadPower, 6);
    }
  });

  it('keeps the stated law true even at the voltage clamp', () => {
    // A clamped input must not leave the printed ratio describing a voltage the
    // learner did not get. voltageRatio has to come from the CLAMPED value.
    const clamped = grid(99999);
    expect(clamped.lossRatio).toBeCloseTo(1 / clamped.voltageRatio ** 2, 9);
    expect(clamped.live.voltage).toBeLessThanOrEqual(10000);
  });

  it('never claims free power: source always exceeds payload when current flows', () => {
    for (const voltage of [60, 120, 480, 1200]) {
      const state = grid(voltage);
      expect(state.live.sourcePower, voltage + ' V').toBeGreaterThan(state.payloadPower);
      expect(state.live.efficiencyPercent).toBeLessThan(100);
      expect(state.live.efficiencyPercent).toBeGreaterThan(0);
    }
  });

  it('agrees with its own prose about which direction is cooler', () => {
    expect(grid(240).status).toBe('cooler');
    expect(grid(60).status).toBe('hotter');
    expect(grid(120).status).toBe('same');
  });
});

describe('the quiz answer key is internally consistent', () => {
  it('points at a real option for every question, with an explanation', () => {
    // A grader that scores against a bad key teaches the wrong answer with full
    // confidence, and the explanation is what the learner reads afterwards.
    physics.QUIZ.forEach((question, index) => {
      expect(Array.isArray(question.a), 'q' + index + ' options').toBe(true);
      expect(question.a.length, 'q' + index + ' option count').toBeGreaterThan(1);
      expect(Number.isInteger(question.c), 'q' + index + ' key type').toBe(true);
      expect(question.c, 'q' + index + ' key range').toBeGreaterThanOrEqual(0);
      expect(question.c, 'q' + index + ' key range').toBeLessThan(question.a.length);
      expect(new Set(question.a).size, 'q' + index + ' duplicate options').toBe(question.a.length);
      expect(String(question.why || '').trim().length, 'q' + index + ' explanation').toBeGreaterThan(0);
    });
  });

  it('has a topic for every question, so review routes somewhere real', () => {
    expect(physics.QUIZ_TABS.length).toBe(physics.QUIZ.length);
    expect(physics.QUIZ_TABS.every((topic) => typeof topic === 'string' && topic.length > 0)).toBe(true);
  });

  it('sets a pass mark that is reachable and not trivial', () => {
    expect(physics.QUIZ_PASS).toBeGreaterThan(0);
    expect(physics.QUIZ_PASS).toBeLessThanOrEqual(physics.QUIZ.length);
  });
});
