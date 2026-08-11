import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_machinelab.js';

let M;

function state(overrides = {}) {
  return { machineLab: Object.assign({ view: 'build' }, overrides) };
}

function torsion(overrides = {}) {
  return Object.assign({
    machine: 'ballista', g: 9.81,
    bundleTurns: 12, armLength: 1.1, drawLength: 0.85, armMass: 6, stringMass: 0.35,
    projMass: 4, projDiameter: 0.12,
    releaseAngle: 45, launchElevation: 2,
    winchHandleR: 0.45, winchDrumR: 0.08, winchPulleys: 2,
    etaMech: 0.85, drag: true
  }, overrides);
}

beforeEach(() => {
  resetStemLab();
  M = loadTool(FILE, 'machineLab')._math;
});

describe('Machine Lab: torsion springs', () => {
  it('stiffens as more turns are wound in', () => {
    const loose = M.torsionStiffness(2);
    const tight = M.torsionStiffness(24);
    expect(tight).toBeGreaterThan(loose);
    expect(M.torsionStiffness(0)).toBeNull();
  });

  it('stores energy as one half k theta squared, per bundle', () => {
    const k = M.torsionStiffness(12);
    const theta = M.torsionAngle(0.85, 1.1);
    const one = M.torsionEnergy(12, 0.85, 1.1, 1);
    expect(one).toBeCloseTo(0.5 * k * theta * theta, 9);
  });

  it('gives a two-bundle ballista exactly twice a one-bundle onager', () => {
    const two = M.torsionEnergy(12, 0.85, 1.1, 2);
    const one = M.torsionEnergy(12, 0.85, 1.1, 1);
    expect(two / one).toBeCloseTo(2, 12);
  });

  it('clamps an absurd draw rather than inventing unbounded energy', () => {
    expect(M.torsionAngle(50, 1.1)).toBe(2.0);
    expect(M.torsionAngle(0, 1.1)).toBeNull();
  });

  it('rejects a bundle count that is not one or two', () => {
    expect(M.torsionEnergy(12, 0.85, 1.1, 3)).toBeNull();
    expect(M.torsionEnergy(12, 0.85, 1.1, 0)).toBeNull();
  });

  it('grows energy with draw length and with winding', () => {
    const base = M.torsionEnergy(12, 0.85, 1.1, 2);
    expect(M.torsionEnergy(12, 1.2, 1.1, 2)).toBeGreaterThan(base);
    expect(M.torsionEnergy(20, 0.85, 1.1, 2)).toBeGreaterThan(base);
  });
});

describe('Machine Lab: torsion effective mass', () => {
  it('counts both ballista arms plus part of the string', () => {
    expect(M.ballistaEffectiveMass(6, 0.35)).toBeCloseTo(2 * (6 / 3) + 0.5 * 0.35, 9);
  });

  it('falls as the onager sling lengthens, the same lever argument as the trebuchet', () => {
    const short = M.onagerEffectiveMass(6, 1.1, 0.2);
    const long = M.onagerEffectiveMass(6, 1.1, 2.0);
    expect(long).toBeLessThan(short);
  });

  it('rises with a heavier onager arm', () => {
    expect(M.onagerEffectiveMass(30, 1.1, 1.0)).toBeGreaterThan(M.onagerEffectiveMass(3, 1.1, 1.0));
  });

  it('returns null rather than NaN for impossible geometry', () => {
    expect(M.onagerEffectiveMass(6, 0, 1.0)).toBeNull();
    expect(M.ballistaEffectiveMass(-1, 0.35)).toBeNull();
  });
});

describe('Machine Lab: shot() dispatches on machine type', () => {
  it('still defaults to the trebuchet when no machine is named', () => {
    // Backward compatibility: the P2 tests call shot() without a machine key.
    const implicit = M.shot({
      g: 9.81, cwMass: 1200, cwDrop: 3.2, beamLong: 4.5, beamShort: 1.2,
      slingLength: 2.0, armMass: 60, projMass: 25, projDiameter: 0.24,
      releaseAngle: 45, launchElevation: 2,
      winchHandleR: 0.45, winchDrumR: 0.08, winchPulleys: 2, etaMech: 0.85, drag: true
    });
    const explicit = M.shot({
      machine: 'trebuchet',
      g: 9.81, cwMass: 1200, cwDrop: 3.2, beamLong: 4.5, beamShort: 1.2,
      slingLength: 2.0, armMass: 60, projMass: 25, projDiameter: 0.24,
      releaseAngle: 45, launchElevation: 2,
      winchHandleR: 0.45, winchDrumR: 0.08, winchPulleys: 2, etaMech: 0.85, drag: true
    });
    expect(implicit.stored).toBe(explicit.stored);
    expect(implicit.range).toBe(explicit.range);
  });

  it('stores twice as much in a ballista as in an onager wound the same', () => {
    const b = M.shot(torsion({ machine: 'ballista' }));
    const o = M.shot(torsion({ machine: 'onager', slingLength: 1.0 }));
    expect(b.stored / o.stored).toBeCloseTo(2, 12);
  });

  it('runs the same energy chain for every machine', () => {
    for (const machine of ['trebuchet', 'ballista', 'onager']) {
      const s = machine === 'trebuchet'
        ? M.shot({
            machine, g: 9.81, cwMass: 1200, cwDrop: 3.2, beamLong: 4.5, beamShort: 1.2,
            slingLength: 2.0, armMass: 60, projMass: 25, projDiameter: 0.24,
            releaseAngle: 45, launchElevation: 2,
            winchHandleR: 0.45, winchDrumR: 0.08, winchPulleys: 2, etaMech: 0.85, drag: true
          })
        : M.shot(torsion({ machine, slingLength: 1.0 }));
      expect(s).not.toBeNull();
      expect(s.crankWork).toBeGreaterThan(s.stored);
      expect(s.stored).toBeGreaterThan(s.muzzleKE);
      // NOT muzzleKE > impactKE. These machines launch from 2 m up, and the
      // stone gains m g h falling back to the ground. The invariant that does
      // hold is that the drop and the drag exactly account for the difference.
      expect(s.impactKE).toBeCloseTo(s.muzzleKE + s.dropGain - s.dragLoss, 6);
      expect(s.dragLoss).toBeGreaterThan(0);
      expect(s.eta).toBeGreaterThan(0);
      expect(s.eta).toBeLessThan(1);
    }
  });

  it('loses energy from muzzle to impact only when launched from the ground', () => {
    const ground = M.shot(torsion({ launchElevation: 0 }));
    expect(ground.dropGain).toBe(0);
    expect(ground.impactKE).toBeLessThan(ground.muzzleKE);
  });

  it('credits the launch height as an energy input rather than a negative loss', () => {
    // Before this was accounted for, the ledger's "lost to air resistance" row
    // went negative on a machine standing on a tower.
    const tower = M.shot(torsion({ launchElevation: 20 }));
    expect(tower.dropGain).toBeCloseTo(4 * 9.81 * 20, 6);
    expect(tower.dragLoss).toBeGreaterThanOrEqual(0);
  });

  it('gives the onager a better share of a smaller store than the ballista', () => {
    // Two bundles store twice as much, but there are two arms to accelerate.
    // Store and efficiency move in opposite directions here, which is the
    // comparison the Compare view exists to surface.
    const b = M.shot(torsion({ machine: 'ballista', projMass: 4 }));
    const o = M.shot(torsion({ machine: 'onager', projMass: 4, slingLength: 0.2 }));
    expect(o.stored).toBeLessThan(b.stored);
    expect(o.eta).toBeGreaterThan(b.eta);
  });

  it('returns null for a torsion machine that cannot be wound', () => {
    expect(M.shot(torsion({ bundleTurns: 0 }))).toBeNull();
    expect(M.shot(torsion({ armLength: 0 }))).toBeNull();
  });
});

describe('Machine Lab: the build view carries all three machines', () => {
  for (const machine of ['trebuchet', 'ballista', 'onager']) {
    it(`renders the ${machine} without blanking`, () => {
      const html = renderTool('machineLab', state({ machine }));
      expect(html).not.toContain('NaN');
      expect(html).not.toContain('undefined');
      expect(html).toContain('Energy ledger');
    });
  }

  it('shows counterweight controls only for the trebuchet', () => {
    const treb = renderTool('machineLab', state({ machine: 'trebuchet' }));
    const ball = renderTool('machineLab', state({ machine: 'ballista' }));
    expect(treb).toContain('Counterweight mass');
    expect(ball).not.toContain('Counterweight mass');
    expect(ball).toContain('Turns of twist in the bundle');
  });

  it('gives the onager a sling control and the ballista a string control', () => {
    const ona = renderTool('machineLab', state({ machine: 'onager' }));
    const ball = renderTool('machineLab', state({ machine: 'ballista' }));
    expect(ona).toContain('Sling length');
    expect(ona).not.toContain('String mass');
    expect(ball).toContain('String mass');
  });
});

describe('Machine Lab: the compare view', () => {
  it('lists all three machines with their energy stores', () => {
    const html = renderTool('machineLab', state({ view: 'compare' }));
    expect(html).toContain('Trebuchet');
    expect(html).toContain('Ballista');
    expect(html).toContain('Onager');
    expect(html).toContain('falling weight');
    expect(html).toContain('twisted rope');
  });

  it('reports stored energy and efficiency as separate columns', () => {
    const html = renderTool('machineLab', state({ view: 'compare' }));
    expect(html).toContain('Stored');
    expect(html).toContain('To the stone');
    expect(html).toContain('Range');
    expect(html).not.toContain('NaN');
  });

  it('captions the table for screen readers', () => {
    const html = renderTool('machineLab', state({ view: 'compare' }));
    expect(html).toContain('Stored energy, transfer efficiency, launch speed and range for each machine');
  });

  it('says so rather than printing junk when a machine cannot be built', () => {
    const html = renderTool('machineLab', state({ view: 'compare', torsionTurns: 0 }));
    expect(html).toContain('not a working machine at these settings');
    expect(html).not.toContain('NaN');
  });
});

describe('Machine Lab: the Field Manual', () => {
  const topics = ['energy', 'machines', 'history', 'model'];

  for (const manualTopic of topics) {
    it(`renders the ${manualTopic} topic`, () => {
      const html = renderTool('machineLab', state({ view: 'learn', manualTopic }));
      expect(html).toBeTruthy();
      expect(html).not.toContain('undefined');
    });
  }

  it('names its sources for the well-documented claims', () => {
    const html = renderTool('machineLab', state({ view: 'learn', manualTopic: 'history' }));
    expect(html).toContain('Marsden');
    expect(html).toContain('Vitruvius');
    expect(html).toContain('Ammianus Marcellinus');
  });

  it('hedges the contested claims instead of stating them as fact', () => {
    // The scientific-integrity constraint, pinned. If someone later "tightens"
    // this prose into confident assertions, this test should fail.
    const html = renderTool('machineLab', state({ view: 'learn', manualTopic: 'history' }));
    expect(html).toContain('actively debated');
    expect(html).toContain('rather than picking a side');
    // The women's-hair story is presented as something sources say, not as fact.
    expect(html).toContain('a different claim from something that routinely happened');
  });

  it('corrects the walls-came-down myth rather than repeating it', () => {
    const html = renderTool('machineLab', state({ view: 'learn', manualTopic: 'history' }));
    expect(html).toContain('overstates');
    expect(html).toContain('blockade and starvation');
  });

  it('warns that range figures come from reconstructions, not records', () => {
    const html = renderTool('machineLab', state({ view: 'learn', manualTopic: 'history' }));
    expect(html).toContain('modern reconstruction');
    expect(html).toContain('are not evidence about any real machine');
  });

  it('states its own modelling limits plainly', () => {
    const html = renderTool('machineLab', state({ view: 'learn', manualTopic: 'model' }));
    expect(html).toContain('double pendulum');
    expect(html).toContain('nonlinear');
    expect(html).toContain('not predictions about any real machine');
  });

  it('offers the AI tutor with a level defaulting to the current band', () => {
    const g912 = renderTool('machineLab', state({ view: 'learn', bandOverride: 'g912' }));
    expect(g912).toContain('Explain at:');
    expect(g912).toMatch(/aria-pressed="true"[^>]*>High school</);

    const k2 = renderTool('machineLab', state({ view: 'learn', bandOverride: 'k2' }));
    expect(k2).toMatch(/aria-pressed="true"[^>]*>Grade 2</);
  });
});
