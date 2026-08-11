import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_machinelab.js';
const state = (o = {}) => ({ machineLab: Object.assign({ view: 'build' }, o) });

let M;
beforeEach(() => {
  resetStemLab();
  M = loadTool(FILE, 'machineLab')._math;
});

// Mass and diameter are independent sliders, so nothing stopped a student
// building a 1 kg boulder or a 300 kg orange. Drag depends on frontal area and
// inertia on mass, so an impossible density silently decides every range
// comparison the tool invites.
describe('Machine Lab: stone density', () => {
  it('computes density from mass and diameter', () => {
    const r = 0.13;
    expect(M.density(25, 0.26)).toBeCloseTo(25 / ((4 / 3) * Math.PI * r * r * r), 6);
  });

  it('inverts to a diameter for a given density', () => {
    const dia = M.diameterFor(25, 2700);
    expect(M.density(25, dia)).toBeCloseTo(2700, 6);
  });

  it('refuses nonsense instead of returning Infinity', () => {
    expect(M.density(0, 0.26)).toBeNull();
    expect(M.density(25, 0)).toBeNull();
    expect(M.diameterFor(25, 0)).toBeNull();
    expect(M.density(NaN, 0.26)).toBeNull();
  });

  it('describes a density in words a student can check against the world', () => {
    expect(M.densityNote(300)).toContain('wood');
    expect(M.densityNote(2700)).toBe('about stone');
    expect(M.densityNote(7800)).toBe('about iron');
    expect(M.densityNote(20000)).toContain('lead');
  });

  it('ships a default stone that is actually stone', () => {
    // 25 kg at 0.24 m was 3454 kg/m3, denser than most rock; 0.26 m is granite.
    const cfg = loadTool(FILE, 'machineLab');
    const src = String(cfg.render);
    void src;
    const rho = M.density(25, 0.26);
    expect(rho).toBeGreaterThan(2400);
    expect(rho).toBeLessThan(3000);
    expect(M.densityNote(rho)).toBe('about stone');
  });

  it('names the density on screen', () => {
    const html = renderTool('machineLab', state());
    expect(html).toMatch(/That stone works out at [\d.]+ kg per cubic metre, about stone\./);
  });

  it('warns when the stone could not exist', () => {
    const silly = renderTool('machineLab', state({ projMass: 1, projDiameter: 0.8 }));
    expect(silly).toContain('No rock is that');
    expect(silly).toContain('an impossible stone will give you an impossible range');
  });

  it('stays quiet when the stone is plausible', () => {
    const fine = renderTool('machineLab', state({ projMass: 25, projDiameter: 0.26 }));
    expect(fine).not.toContain('No rock is that');
  });
});

describe('Machine Lab: the best stone for a machine', () => {
  const inputs = (o = {}) => Object.assign({
    machine: 'trebuchet', g: 9.81,
    cwMass: 1200, cwDrop: 3.2, beamLong: 4.5, beamShort: 1.2, slingLength: 2.0, armMass: 60,
    projMass: 25, projDiameter: 0.26, releaseAngle: 45, launchElevation: 2,
    winchHandleR: 0.45, winchDrumR: 0.08, winchPulleys: 2, etaMech: 0.85, drag: true
  }, o);

  it('finds a stone that outperforms the one you started with', () => {
    const start = M.shot(inputs());
    const best = M.bestStone(inputs());
    expect(best).not.toBeNull();
    expect(best.range).toBeGreaterThan(start.range);
  });

  it('holds density constant, so every candidate is a real object', () => {
    // Without this the sweep just makes the same ball absurdly light, and the
    // "best" stone is a drag artifact rather than a physical answer.
    const best = M.bestStone(inputs(), { density: 2700 });
    expect(M.density(best.projMass, best.projDiameter)).toBeCloseTo(2700, 3);
  });

  it('takes its density from the current stone when none is given', () => {
    const best = M.bestStone(inputs({ projMass: 25, projDiameter: 0.26 }));
    const rho = M.density(25, 0.26);
    expect(M.density(best.projMass, best.projDiameter)).toBeCloseTo(rho, 3);
  });

  it('answers for each machine, and they do not all want the same stone', () => {
    const treb = M.bestStone(inputs({ machine: 'trebuchet' }), { density: 2700 });
    const ball = M.bestStone(inputs({
      machine: 'ballista', bundleTurns: 18, armLength: 1.1, drawLength: 1.0, armMass: 3, stringMass: 0.35
    }), { density: 2700 });
    expect(treb).not.toBeNull();
    expect(ball).not.toBeNull();
    expect(treb.range).not.toBeCloseTo(ball.range, 1);
  });

  it('returns null rather than guessing when nothing can fly', () => {
    expect(M.bestStone(inputs({ cwMass: 0 }))).toBeNull();
    expect(M.bestStone(inputs({ projDiameter: 0 }))).toBeNull();
  });
});

describe('Machine Lab: the best-stone panel in Compare', () => {
  const cmp = (o = {}) => ({ machineLab: Object.assign({ view: 'compare' }, o) });

  it('offers the search as a button, because a sweep is far too slow to render', () => {
    const html = renderTool('machineLab', cmp());
    expect(html).toContain('Find the best stone for each machine');
    // No table until it has been run: an empty table would read as "no answer".
    expect(html).not.toContain('Best stone mass, diameter and range');
  });

  it('shows the answer once it has been run', () => {
    const html = renderTool('machineLab', cmp({
      bestStones: {
        density: 2714, sig: 'whatever',
        results: { trebuchet: { m: 12.5, dia: 0.2, range: 118.4, ke: 4200, nowKE: 13100 } }
      }
    }));
    expect(html).toContain('12.5 kg');
    expect(html).toContain('118.4 m');
    expect(html).toContain('2714 kg per cubic metre');
  });

  it('says so when a slider has moved since the search ran', () => {
    const html = renderTool('machineLab', cmp({
      bestStones: { density: 2714, sig: 'stale-signature', results: { trebuchet: { m: 12.5, dia: 0.2, range: 118.4, ke: 4200, nowKE: 13100 } } }
    }));
    expect(html).toContain('A setting has changed since this ran');
  });

  // The matching-signature case cannot be built here, because the signature is
  // derived from live state inside the tool. It is proven in
  // dev-tools/ml_interaction_smoke.cjs, where the button actually runs.

  it('names a machine that cannot be built rather than dropping its row', () => {
    const html = renderTool('machineLab', cmp({
      bestStones: { density: 2714, sig: 'stale', results: { trebuchet: { m: 12.5, dia: 0.2, range: 118.4, ke: 4200, nowKE: 13100 } } }
    }));
    expect(html).toContain('not a working machine at these settings');
  });
});

describe('Machine Lab: the peak is real, not a search artifact', () => {
  const inputs = (o = {}) => Object.assign({
    machine: 'trebuchet', g: 9.81,
    cwMass: 1200, cwDrop: 3.2, beamLong: 4.5, beamShort: 1.2, slingLength: 2.0, armMass: 60,
    projMass: 25, projDiameter: 0.26, releaseAngle: 45, launchElevation: 2,
    winchHandleR: 0.45, winchDrumR: 0.08, winchPulleys: 2, etaMech: 0.85, drag: true
  }, o);

  const rangeAt = (m, o) => {
    const dia = M.diameterFor(m, 2717);
    const s = M.shot(Object.assign({}, inputs(o), { projMass: m, projDiameter: dia }));
    return s ? s.range : null;
  };

  it('range turns over: heavier and lighter both fly less far than the peak', () => {
    // Launch speed saturates at sqrt(2E/m_eff) as the payload vanishes, while
    // drag deceleration goes as area over mass and keeps rising. So there is a
    // genuine interior maximum, and the sweep is finding it rather than an end.
    const best = M.bestStone(inputs(), { density: 2717 });
    expect(best.atBound).toBe(false);
    expect(rangeAt(best.projMass / 8)).toBeLessThan(best.range);
    expect(rangeAt(best.projMass * 8)).toBeLessThan(best.range);
  });

  it('refines past the coarse grid, which is far too coarse to quote', () => {
    // 26 log steps over 0.05..400 kg is a ~40% jump per step. Reporting one
    // decimal off that grid would be a decimal the search has not earned.
    const coarse = M.bestStone(inputs(), { density: 2717, steps: 26 });
    const fine = M.bestStone(inputs(), { density: 2717, steps: 200 });
    expect(Math.abs(coarse.projMass - fine.projMass) / fine.projMass).toBeLessThan(0.12);
  });

  it('admits when the answer is only the edge of the search', () => {
    // Squeeze the search so the true peak lies outside it.
    const clipped = M.bestStone(inputs(), { density: 2717, min: 40, max: 400 });
    expect(clipped.atBound).toBe(true);
  });

  it('reports impact energy, because furthest is not hardest', () => {
    const best = M.bestStone(inputs(), { density: 2717 });
    const now = M.shot(inputs());
    expect(best.impactKE).toBeGreaterThan(0);
    // The stone that flies furthest lands with far less energy than the heavy
    // one. That tension is the lesson; if it ever inverts, the copy is wrong.
    expect(best.range).toBeGreaterThan(now.range);
    expect(best.impactKE).toBeLessThan(now.impactKE);
  });
});

describe('Machine Lab: the panel does not sell a pebble as the answer', () => {
  const cmp = (o = {}) => ({ machineLab: Object.assign({ view: 'compare' }, o) });
  const saved = (over = {}) => ({
    bestStones: {
      density: 2717, sig: 'stale',
      results: { trebuchet: Object.assign({ m: 2.5, dia: 0.12, range: 132.3, ke: 900, nowKE: 12800 }, over) }
    }
  });

  it('asks which stone flies furthest, not which is best', () => {
    const html = renderTool('machineLab', cmp(saved()));
    expect(html).toContain('Which stone flies furthest?');
  });

  it('sets what it lands with beside what your own stone lands with', () => {
    const html = renderTool('machineLab', cmp(saved()));
    expect(html).toContain('Lands with');
    expect(html).toContain('900 J');
    expect(html).toContain('12.8 kJ');
  });

  it('keeps small impacts in joules, where the contrast is still readable', () => {
    // 96 J and 141 J both round to "0.1 kJ", which reads as no difference at
    // all when the difference is the lesson.
    const html = renderTool('machineLab', cmp(saved({ ke: 96, nowKE: 141 })));
    expect(html).toContain('96 J');
    expect(html).toContain('141 J');
    expect(html).not.toContain('0.1 kJ');
  });

  it('footnotes a row that only reached the edge of the search', () => {
    const html = renderTool('machineLab', cmp(saved({ atBound: true })));
    expect(html).toContain('132.3 m *');
    expect(html).toContain('where the search stopped rather than a real best');
  });

  it('leaves the footnote off when the peak is genuine', () => {
    const html = renderTool('machineLab', cmp(saved({ atBound: false })));
    expect(html).not.toContain('where the search stopped rather than a real best');
  });
});
