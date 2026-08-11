import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_machinelab.js';
const BANDS = ['k2', 'g35', 'g68', 'g912'];
const VIEWS = ['machines', 'build', 'range', 'siege', 'compare', 'learn'];

function state(overrides = {}) {
  return { machineLab: Object.assign({ view: 'machines' }, overrides) };
}

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, 'machineLab');
});

describe('Machine Lab: every view renders at every band', () => {
  for (const view of VIEWS) {
    for (const band of BANDS) {
      it(`renders ${view} at ${band}`, () => {
        const html = renderTool('machineLab', state({ view, bandOverride: band }));
        expect(html).toBeTruthy();
        expect(html).not.toContain('undefined');
        expect(html).not.toContain('NaN');
        expect(html).not.toContain('Infinity');
      });
    }
  }

  it('offers navigation to every view', () => {
    const html = renderTool('machineLab', state());
    expect(html).toContain('Machine Shop');
    expect(html).toContain('Build');
    expect(html).toContain('Test Range');
    expect(html).toContain('Target Wall');
    expect(html).toContain('Compare');
    expect(html).toContain('Field Manual');
  });
});

describe('Machine Lab: the siege view', () => {
  it('offers all four built-in targets, with no import required', () => {
    const html = renderTool('machineLab', state({ view: 'siege' }));
    expect(html).toContain('Curtain wall');
    expect(html).toContain('Gatehouse');
    expect(html).toContain('Keep');
    expect(html).toContain('Motte and tower');
  });

  it('draws the wall and reports its condition', () => {
    const html = renderTool('machineLab', state({ view: 'siege' }));
    expect(html).toContain('<rect');
    expect(html).toContain('intact 72');      // fresh curtain wall, 12 x 6
    expect(html).toContain('Loose!');
    expect(html).toContain('Rebuild the wall');
  });

  it('ships the course-by-course table even while it is visually collapsed', () => {
    // Same accessibility contract as the energy ledger: the picture is never
    // the only carrier of the information.
    const html = renderTool('machineLab', state({ view: 'siege', wallAsTable: false }));
    expect(html).toContain('Condition of each course, counting up from the ground');
    expect(html).toContain('<table');
    expect(html).toContain('Cracked');
  });

  it('describes the wall state in the image label', () => {
    const html = renderTool('machineLab', state({ view: 'siege' }));
    expect(html).toMatch(/aria-label="Curtain wall\. 72 blocks intact, 0 cracked, 0 gone\./);
  });

  it('shows standoff against what this machine can actually reach', () => {
    const html = renderTool('machineLab', state({ view: 'siege' }));
    expect(html).toContain('Standoff');
    expect(html).toContain('This machine reaches');
    expect(html).not.toContain('NaN');
  });

  it('reports a breach with the shot count and the crank work spent', () => {
    const blocks = [];
    for (let c = 0; c < 12; c++) {
      for (let r = 0; r < 6; r++) {
        blocks.push({
          id: c + ',' + r, col: c, row: r, x: c, y: r, z: 0,
          mat: 'limestone', absorbed: 0,
          state: c === 4 ? 'breached' : 'intact'
        });
      }
    }
    const html = renderTool('machineLab', state({
      view: 'siege', wallBlocks: blocks, breached: true, shotsFired: 4, totalCrankWork: 180000
    }));
    expect(html).toContain('Breached in 4 shots');
    expect(html).toContain('180 kJ');
  });

  it('offers a 3D wall and degrades to the diagram when WebGL is absent', () => {
    const html = renderTool('machineLab', state({ view: 'siege' }));
    expect(html).toContain('3D wall unavailable');
    // The 2D diagram and the course table are unaffected by the 3D failing.
    expect(html).toContain('<rect');
    expect(html).toContain('Condition of each course');
  });

  it('states that the block budgets are classroom values, not a prediction', () => {
    const html = renderTool('machineLab', state({
      view: 'siege',
      lastImpact: { outcome: 'hit', ke: 14000, energyDensity: 310000, col: 5, row: 1 }
    }));
    expect(html).toContain('order-of-magnitude classroom values');
    expect(html).toContain('not a prediction of how real masonry fails');
  });
});

describe('Machine Lab: the build view', () => {
  it('shows the 3D container and degrades honestly when WebGL is absent', () => {
    // The smoke harness does not stub makeOrbitViewer, so the tool takes its
    // host-too-old path. That is exactly the degradation students on a locked
    // down Chromebook get, and every number must survive it.
    const html = renderTool('machineLab', state({ view: 'build' }));
    expect(html).toContain('3D view unavailable');
    expect(html).toContain('Energy ledger');
    expect(html).toContain('Stored in the raised counterweight');
  });

  it('offers Test fire beside the 3D machine, so the swing is reachable', () => {
    // The only Fire control used to live in the Test Range, which has no 3D
    // view, so the machine's animation could not be watched by anyone.
    const html = renderTool('machineLab', state({ view: 'build' }));
    expect(html).toContain('Test fire');
    expect(html).toContain('Watch the arm');
  });

  it('shows the winch panel with the numbers that move and the one that does not', () => {
    const html = renderTool('machineLab', state({ view: 'build' }));
    expect(html).toContain('Winch mechanical advantage');
    expect(html).toContain('Crank force');
    expect(html).toContain('Turns of the crank');
    expect(html).toContain('Launch speed');
  });

  it('reports the same launch speed regardless of winch gearing', () => {
    // The UI-level restatement of the invariance the math tests pin. If the
    // ledger ever started reading gearing into the shot, this catches it.
    const light = renderTool('machineLab', state({ view: 'build', winchPulleys: 1 }));
    const heavy = renderTool('machineLab', state({ view: 'build', winchPulleys: 6 }));
    const speedOf = (html) => (html.match(/Launch speed: ([\d.]+) m\/s/) || [])[1];
    expect(speedOf(light)).toBeDefined();
    expect(speedOf(light)).toBe(speedOf(heavy));
  });
});

describe('Machine Lab: the energy ledger', () => {
  it('names every stage from crank to impact', () => {
    const html = renderTool('machineLab', state({ view: 'build' }));
    expect(html).toContain('Work you do at the crank');
    expect(html).toContain('Stored in the raised counterweight');
    expect(html).toContain('Kinetic energy of the stone at release');
    expect(html).toContain('Kinetic energy at impact');
  });

  it('attributes each loss to a named cause', () => {
    const html = renderTool('machineLab', state({ view: 'build' }));
    expect(html).toContain('winch friction');
    expect(html).toContain('energy left in the moving arm and counterweight');
    expect(html).toContain('air resistance');
  });

  it('always ships the table equivalent, even while showing bars', () => {
    // The accessibility claim the whole machine-first design rests on: a
    // screen-reader user gets the identical content, not a summary of a picture.
    const bars = renderTool('machineLab', state({ view: 'build', ledgerAsTable: false }));
    expect(bars).toContain('Energy ledger from crank to impact');   // table caption
    expect(bars).toContain('% of input');
    expect(bars).toContain('<table');
  });

  it('shows the table on its own when toggled', () => {
    const table = renderTool('machineLab', state({ view: 'build', ledgerAsTable: true }));
    expect(table).toContain('<table');
    expect(table).toContain('Show bars');
  });

  it('reports transfer efficiency as a percentage', () => {
    const html = renderTool('machineLab', state({ view: 'build' }));
    expect(html).toMatch(/Transfer efficiency: [\d.]+%/);
  });

  it('shows the effective mass that produces that percentage, from g68 up', () => {
    // The efficiency is m_p/(m_p + m_eff), and the g9-12 copy quotes that
    // formula. m_eff was computed and returned by shot() and then never shown,
    // so the arithmetic the student was handed could not be checked.
    const g68 = renderTool('machineLab', state({ view: 'build', bandOverride: 'g68' }));
    expect(g68).toContain('of effective mass');
    expect(g68).toMatch(/The stone is [\d.]+ kg, and the moving parts of the machine add another [\d.]+ kg/);
    expect(g68).toMatch(/= [\d.]+%\./);

    // Lower bands get the percentage without the algebra behind it.
    const g35 = renderTool('machineLab', state({ view: 'build', bandOverride: 'g35' }));
    expect(g35).toContain('Transfer efficiency');
    expect(g35).not.toContain('of effective mass');
  });

  it('states an effective mass consistent with the efficiency it quotes', () => {
    const html = renderTool('machineLab', state({ view: 'build', bandOverride: 'g912', projMass: 25 }));
    const m = html.match(/The stone is ([\d.]+) kg, and the moving parts of the machine add another ([\d.]+) kg/);
    const pct = html.match(/Transfer efficiency: ([\d.]+)%/);
    expect(m).toBeTruthy();
    expect(pct).toBeTruthy();
    const mp = parseFloat(m[1]), me = parseFloat(m[2]);
    expect(100 * (mp / (mp + me))).toBeCloseTo(parseFloat(pct[1]), 0);
  });

  it('refuses to draw a ledger for a machine that cannot store energy', () => {
    const html = renderTool('machineLab', state({ view: 'build', cwMass: 0 }));
    expect(html).toContain('do not describe a working machine');
    expect(html).not.toContain('NaN');
  });
});

describe('Machine Lab: the range view', () => {
  it('asks for a prediction before offering the release', () => {
    const html = renderTool('machineLab', state({ view: 'range' }));
    expect(html).toContain('Predict, then fire');
    expect(html).toContain('Fire');
  });

  it('offers gravity presets and an air-resistance switch', () => {
    const html = renderTool('machineLab', state({ view: 'range' }));
    expect(html).toContain('Earth');
    expect(html).toContain('Moon');
    expect(html).toContain('Mars');
    expect(html).toContain('Air resistance on');
  });

  it('draws the flight path and its numbers once a shot exists', () => {
    const shot = {
      range: 120.5, apex: 30.2, flightTime: 5.1, impactSpeed: 33.3,
      crankWork: 44000, stored: 37700, muzzleKE: 20000, impactKE: 14000, eta: 0.53,
      path: [
        { t: 0, x: 0, y: 2, z: 0, v: 40 },
        { t: 2, x: 60, y: 30, z: 0, v: 30 },
        { t: 5.1, x: 120.5, y: 0, z: 0, v: 33.3 }
      ]
    };
    const html = renderTool('machineLab', state({ view: 'range', lastShot: shot }));
    expect(html).toContain('Flight path');
    expect(html).toContain('<polyline');
    expect(html).toContain('Range: 120.5 m');
    expect(html).toContain('Apex: 30.2 m');
  });

  it('gives the trajectory graph a text alternative', () => {
    const shot = {
      range: 100, apex: 25, flightTime: 4, impactSpeed: 30,
      crankWork: 44000, stored: 37700, muzzleKE: 20000, impactKE: 14000, eta: 0.53,
      path: [{ t: 0, x: 0, y: 0, z: 0, v: 40 }, { t: 4, x: 100, y: 0, z: 0, v: 30 }]
    };
    const html = renderTool('machineLab', state({ view: 'range', lastShot: shot }));
    expect(html).toContain('aria-label="Trajectory. Range 100 metres');
  });

  it('shows the shot log only once there is something to compare', () => {
    const one = renderTool('machineLab', state({
      view: 'range', shotHistory: [{ range: 100, projMass: 25, muzzleV: 40, eta: 0.5 }]
    }));
    expect(one).not.toContain('Shot log');

    const two = renderTool('machineLab', state({
      view: 'range',
      shotHistory: [
        { range: 100, projMass: 25, muzzleV: 40, eta: 0.5 },
        { range: 140, projMass: 50, muzzleV: 32, eta: 0.7 }
      ]
    }));
    expect(two).toContain('Shot log');
    expect(two).toContain('140 m');
  });

  it('adds the vacuum-sweep note only for the highest band', () => {
    const g68 = renderTool('machineLab', state({ view: 'range', bandOverride: 'g68' }));
    const g912 = renderTool('machineLab', state({ view: 'range', bandOverride: 'g912' }));
    expect(g68).not.toContain('a fact about drag, not about levers');
    expect(g912).toContain('a fact about drag, not about levers');
  });
});
