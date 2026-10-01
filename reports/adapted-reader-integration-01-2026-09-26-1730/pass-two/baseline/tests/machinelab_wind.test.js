import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_machinelab.js';

let M;
const state = (o = {}) => ({ machineLab: Object.assign({ view: 'range' }, o) });

function machine(overrides = {}) {
  return Object.assign({
    g: 9.81, cwMass: 1200, cwDrop: 3.2,
    beamLong: 4.5, beamShort: 1.2, slingLength: 2.0, armMass: 60,
    projMass: 25, projDiameter: 0.24,
    releaseAngle: 45, launchElevation: 2,
    winchHandleR: 0.45, winchDrumR: 0.08, winchPulleys: 2,
    etaMech: 0.85, drag: true
  }, overrides);
}

beforeEach(() => {
  resetStemLab();
  M = loadTool(FILE, 'machineLab')._math;
});

// The integrator has always modelled crosswind and the wall damage has always
// used lateral drift to pick which column is struck, but nothing in the UI could
// change it, so it sat at zero forever. The siege view was even telling students
// to "check the wind" about a control that did not exist.
describe('Machine Lab: crosswind reaches the shot', () => {
  it('carries drift out of shot(), not just out of the integrator', () => {
    const calm = M.shot(machine({ windZ: 0 }));
    const blown = M.shot(machine({ windZ: 14 }));
    expect(calm.drift).toBeDefined();
    expect(Math.abs(calm.drift)).toBeLessThan(1e-6);
    expect(blown.drift).toBeGreaterThan(1);
  });

  it('blows the stone downwind, and the other way for the other wind', () => {
    expect(M.shot(machine({ windZ: 12 })).drift).toBeGreaterThan(0);
    expect(M.shot(machine({ windZ: -12 })).drift).toBeLessThan(0);
  });

  it('drifts further the longer the stone is in the air', () => {
    const short = M.shot(machine({ windZ: 12, releaseAngle: 20 }));
    const long = M.shot(machine({ windZ: 12, releaseAngle: 60 }));
    expect(long.flightTime).toBeGreaterThan(short.flightTime);
    expect(Math.abs(long.drift)).toBeGreaterThan(Math.abs(short.drift));
  });

  it('blows a light stone further off course than a heavy one', () => {
    const light = M.shot(machine({ windZ: 12, projMass: 4 }));
    const heavy = M.shot(machine({ windZ: 12, projMass: 200 }));
    expect(Math.abs(light.drift)).toBeGreaterThan(Math.abs(heavy.drift));
  });

  it('does nothing at all with the air switched off', () => {
    // Wind acts through the drag term. No air, no sideways push.
    const s = M.shot(machine({ windZ: 18, drag: false }));
    expect(Math.abs(s.drift)).toBeLessThan(1e-9);
  });

  it('still reports a sensible downrange distance when blown sideways', () => {
    const s = M.shot(machine({ windZ: 16 }));
    expect(s.downrange).toBeGreaterThan(0);
    // range is the ground distance to the landing point, so it is at least the
    // downrange component and no less.
    expect(s.range).toBeGreaterThanOrEqual(s.downrange - 1e-9);
  });
});

describe('Machine Lab: the wind control exists where it matters', () => {
  it('appears in the Test Range conditions', () => {
    const html = renderTool('machineLab', state({ view: 'range' }));
    expect(html).toContain('Crosswind');
    expect(html).toMatch(/aria-label="Crosswind"/);
  });

  it('appears at the Target Wall, where aiming off matters most', () => {
    const html = renderTool('machineLab', state({ view: 'siege' }));
    expect(html).toContain('Crosswind');
    expect(html).toMatch(/aria-label="Crosswind"/);
  });

  it('explains itself differently at each band', () => {
    const k2 = renderTool('machineLab', state({ view: 'range', bandOverride: 'k2' }));
    const g912 = renderTool('machineLab', state({ view: 'range', bandOverride: 'g912' }));
    expect(k2).toContain('pushes the stone sideways');
    expect(g912).toContain('relative to the air mass');
    expect(k2).not.toContain('ballistic coefficient');
  });

  it('reports the drift alongside the other flight numbers', () => {
    const shot = {
      range: 100, downrange: 98, drift: 12.5, apex: 25, flightTime: 4.4, impactSpeed: 30,
      crankWork: 44000, stored: 37700, muzzleKE: 20000, impactKE: 14000, eta: 0.53,
      dropGain: 0, dragLoss: 6000,
      path: [{ t: 0, x: 0, y: 2, z: 0, v: 40 }, { t: 4.4, x: 98, y: 0, z: 12.5, v: 30 }]
    };
    const html = renderTool('machineLab', state({ view: 'range', lastShot: shot }));
    expect(html).toContain('Blown sideways: 12.5 m');
  });

  it('says nothing about drift on a calm day', () => {
    const shot = {
      range: 100, downrange: 100, drift: 0, apex: 25, flightTime: 4.4, impactSpeed: 30,
      crankWork: 44000, stored: 37700, muzzleKE: 20000, impactKE: 14000, eta: 0.53,
      dropGain: 0, dragLoss: 6000,
      path: [{ t: 0, x: 0, y: 2, z: 0, v: 40 }, { t: 4.4, x: 100, y: 0, z: 0, v: 30 }]
    };
    const html = renderTool('machineLab', state({ view: 'range', lastShot: shot }));
    expect(html).not.toContain('Blown sideways');
  });
});
