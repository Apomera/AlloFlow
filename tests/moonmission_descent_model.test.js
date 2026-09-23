// Moon Mission — the powered descent flies honest, real-time physics.
//
// The graded landing used to integrate altitude ~31x faster than vertical speed
// (alt += vVel * 0.5 per 1/60 s step while vVel used 0.016), so "100 m, down 3 m/s"
// was followed by touchdown 1.1 s later. Sideways control was free (+-0.5 m/s a step,
// no thrust, no fuel) and drift decayed like air drag on an airless Moon, which made
// declining the mid-course correction cost nothing: the same pilot touched down with
// the same fuel either way while the debrief said "cheap early, expensive late".
// These fly mmDescentStep, the exact function the game loop calls.
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_moonmission.js';
let P;
const DT = 1 / 60;

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, 'moonMission');
  P = window.MoonMissionPure;
});

function start(extra = {}) {
  const D = P.descent;
  return Object.assign({ alt: D.handoverAlt, vVel: D.handoverVv, hVel: D.handoverHv, fuel: D.pilotFuel, thrust: 0, tilt: 0 }, extra);
}
// A sensible student: faster high up, slow near the ground, cancel drift on the way.
function pilot(st) {
  const target = -Math.max(0.8, Math.min(7, st.alt / 12));
  const inp = { thrust: st.vVel < target };
  if (Math.abs(st.hVel) > 0.4) {
    inp.thrust = inp.thrust || st.vVel < target + 1.5;
    if (st.hVel > 0) inp.left = true; else inp.right = true;
  }
  return inp;
}
function fly(st, ctl, maxSeconds = 600) {
  let t = 0;
  while (st.alt > 0 && t < maxSeconds) { P.descentStep(st, ctl ? ctl(st) : {}, DT); t += DT; }
  const D = P.descent;
  return { t, st, landed: Math.abs(st.vVel) < D.landV && Math.abs(st.hVel) < D.landH };
}

describe('Moon Mission descent model', () => {
  it('altitude changes at the speed the HUD shows', () => {
    const st = start();
    const a0 = st.alt;
    let vSum = 0;
    for (let i = 0; i < 60; i++) { vSum += st.vVel; P.descentStep(st, {}, DT); }
    const predicted = (vSum / 60) * 1.0;             // mean shown speed x one second
    expect(Math.abs((st.alt - a0) - predicted)).toBeLessThan(Math.abs(predicted) * 0.02);
  });

  it('there is no free sideways control and no drag on the Moon', () => {
    const coast = start({ hVel: 6 });
    for (let i = 0; i < 120; i++) P.descentStep(coast, { right: true }, DT);   // tilt, engine off
    expect(coast.hVel, 'tilting with the engine off changed drift').toBeCloseTo(6, 6);
    expect(coast.fuel).toBe(P.descent.pilotFuel);

    const burn = start({ hVel: 6 });
    for (let i = 0; i < 120; i++) P.descentStep(burn, { left: true, thrust: true }, DT);
    expect(burn.hVel, 'a tilted burn did not cancel drift').toBeLessThan(5);
    expect(burn.fuel, 'cancelling drift was free').toBeLessThan(P.descent.pilotFuel);
  });

  it('a careful pilot lands; doing nothing crashes quickly', () => {
    expect(fly(start(), pilot).landed).toBe(true);
    const idle = fly(start(), null);
    expect(idle.landed).toBe(false);
    expect(idle.t).toBeLessThan(30);
  });

  it('skipping the mid-course correction costs the landing clearly more than correcting', () => {
    const D = P.descent;
    const corrected = fly(start(), pilot);
    const skipped = fly(start({ fuel: D.pilotFuel - D.skipFuel, hVel: D.handoverHv + D.skipDrift }), pilot);
    expect(corrected.landed).toBe(true);
    expect(corrected.st.fuel - skipped.st.fuel, 'declining the correction was not expensive').toBeGreaterThan(20);
    // and the tilted burns it forces cost fuel beyond the hand-over deficit itself
    expect(corrected.st.fuel - skipped.st.fuel).toBeGreaterThan(D.skipFuel);
  });

  it('the landing score breakdown is the score', () => {
    const rough = P.landingScore(2.5, 4.5, 15);
    expect(rough.parts.reduce((a, p) => a + p.pts, 0)).toBe(rough.total);
    expect(rough.total).toBeLessThan(50);
    expect(rough.grade).toBe('D');
    const clean = P.landingScore(0.6, 0.3, 60);
    expect(clean.total).toBe(100);
    expect(clean.grade).toBe('A+');
    expect(rough.parts.map((p) => p.pts)).not.toEqual(clean.parts.map((p) => p.pts));
  });

  it('every mode flies the same Moon', () => {
    // Executable code only: the comments quote the old formulas on purpose.
    const src = fs.readFileSync(FILE, 'utf8').split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
    expect(src).not.toMatch(/gravity:\s*0\.5/);
    expect(src).not.toMatch(/alt \+= vVel \* 0\.5/);
    expect(src).not.toMatch(/hVel \*= 0\.999/);
    expect(src).toMatch(/mmDescentStep\(_st, _in, PHYS_STEP_MS \/ 1000\)/);
  });
});
