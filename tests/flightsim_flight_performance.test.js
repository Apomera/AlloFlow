// SkySchool flight performance against published figures. Steady flight is
// solved from the simulator's own force functions (sampleAerodynamics,
// thrustAvailable), then checked against the time-stepped integrator.
//   Cessna 172S POH (2,550 lb, ISA): Vs 48 KIAS, Vy 74 KIAS / 730 fpm, service
//   ceiling 14,000 ft, 126 KTAS at sea level, best glide 68 KIAS (about 9:1).
//   Boeing 737-800: ceiling 41,000 ft, MMO 0.82, L/D about 17-18.
//   ASK 21: L/D 34, minimum sink 0.65 m/s. F-16: Mach 2.05, no supercruise.
//   SR-71: Mach 3.2-3.3 at 80,000-85,000 ft.
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const KT = 0.5924838;
let FS, P;

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  FS = window.__RR_TEST_EXPORTS__.flightSim;
  P = FS.Physics;
});

const use = (id) => {
  const aircraft = FS.AIRCRAFT.find((a) => a.id === id);
  P.configureAircraft(aircraft);
  P.SPRINT_MODE = false;
  return aircraft;
};
const sigma = (alt) => P.airDensity(alt) / P.RHO_SL;

// Steady straight flight at true airspeed v and a lever setting:
//   L(AoA) + T sin(AoA) = W cos(gamma),  sin(gamma) = (T cos(AoA) - D) / W
function trim(v, alt, lever) {
  let gamma = 0, aoa = 0, thrust = 0, sample = null;
  for (let pass = 0; pass < 30; pass++) {
    thrust = P.thrustAvailable(v, alt, lever);
    const normal = (a) => P.sampleAerodynamics(v, alt, a, 0).lift + thrust * Math.sin(a * Math.PI / 180) - P.WEIGHT * Math.cos(gamma);
    let lo = -10, hi = P.CRITICAL_AOA - 1e-6;
    if (normal(hi) < 0) return null;
    for (let k = 0; k < 44; k++) { const m = (lo + hi) / 2; if (normal(m) < 0) lo = m; else hi = m; }
    aoa = (lo + hi) / 2;
    sample = P.sampleAerodynamics(v, alt, aoa, 0);
    const sinGamma = (thrust * Math.cos(aoa * Math.PI / 180) - sample.drag) / P.WEIGHT;
    if (Math.abs(sinGamma) > 0.99) return null;
    const next = Math.asin(sinGamma);
    const settled = Math.abs(next - gamma) < 1e-10;
    gamma = next;
    if (settled) break;
  }
  return { v, aoa, gamma, pitch: aoa + gamma * 180 / Math.PI, vsi: v * Math.sin(gamma),
    load: (sample.lift + thrust * Math.sin(aoa * Math.PI / 180)) / P.WEIGHT,
    kias: v * KT * Math.sqrt(sigma(alt)), mach: P.mach(v, alt) };
}
// Coarse sweep then a fine sweep around the best point.
function best(alt, lever, score) {
  const top = Math.min(P.speedLimit(alt), 4000);
  let pick = null;
  const scan = (from, to, n) => {
    for (let i = 0; i <= n; i++) {
      const r = trim(from + (to - from) * i / n, alt, lever);
      if (r && (!pick || score(r) > score(pick))) pick = r;
    }
  };
  scan(25, top, 80);
  if (pick) { const step = (top - 25) / 80; scan(Math.max(25, pick.v - step), Math.min(top, pick.v + step), 40); }
  return pick;
}
const climb = (alt) => best(alt, 1, (r) => r.vsi);
const glide = (alt) => best(alt, 0, (r) => (r.vsi < 0 ? Math.cos(r.gamma) / -Math.sin(r.gamma) : -1));
const glideRatio = (r) => Math.cos(r.gamma) / -Math.sin(r.gamma);
// Fastest steady level flight: the highest speed whose path is still level or climbing.
function topSpeed(alt, lever) {
  const top = Math.min(P.speedLimit(alt), 4000);
  let lo = null;
  for (let i = 0; i <= 400; i++) {
    const v = 25 + (top - 25) * i / 400, r = trim(v, alt, lever);
    if (r && r.vsi >= 0) lo = r;
  }
  return lo;
}
function serviceCeiling() {
  let lo = 0, hi = 120000;
  for (let k = 0; k < 14; k++) {
    const mid = (lo + hi) / 2, c = climb(mid);
    if (c && c.vsi * 60 > 100) lo = mid; else hi = mid;
  }
  return lo;
}
// Hold an attitude and lever with the real integrator at a fixed altitude band.
function hold(alt, v, pitch, lever, seconds, dt) {
  let s = { speed: v, altitude: alt, vsi: 0, heading: 90, lat: 0, lon: 0, onGround: false, fieldElev: -1e6 };
  for (let t = 0; t < seconds; t += dt) {
    s = { ...s, ...P.step(s, dt, { throttle: lever, pitch, bank: 0, flaps: 0, brake: 0 }) };
    s.altitude = alt; s.fieldElev = -1e6;
  }
  return s;
}

describe('Cessna 172S against its pilot operating handbook', () => {
  it('stalls, climbs, cruises and glides like the real aircraft', () => {
    use('cessna172');
    expect(P.stallSpeed(0) * KT).toBeGreaterThan(45);
    expect(P.stallSpeed(0) * KT).toBeLessThan(52);
    const sl = climb(0);
    expect(sl.vsi * 60).toBeGreaterThan(650);
    expect(sl.vsi * 60).toBeLessThan(800);
    expect(sl.kias).toBeGreaterThan(68);
    expect(sl.kias).toBeLessThan(84);
    // Power falls with altitude, so the climb rate does too.
    const high = climb(8000);
    expect(high.vsi * 60).toBeGreaterThan(300);
    expect(high.vsi * 60).toBeLessThan(470);
    const fast = topSpeed(0, 1);
    expect(fast.v * KT).toBeGreaterThan(120);
    expect(fast.v * KT).toBeLessThan(133);
    const g = glide(5000);
    expect(glideRatio(g)).toBeGreaterThan(8.5);
    expect(glideRatio(g)).toBeLessThan(10.5);
    expect(g.kias).toBeGreaterThan(60);
    expect(g.kias).toBeLessThan(75);
  }, 60000);

  it('reaches its service ceiling near 14,000 ft', () => {
    use('cessna172');
    const ceiling = serviceCeiling();
    expect(ceiling).toBeGreaterThan(13000);
    expect(ceiling).toBeLessThan(16500);
  }, 60000);

  it('reads about 1 G in a steady climb and a steady glide, as a real G meter does', () => {
    use('cessna172');
    for (const [point, alt, lever] of [[climb(0), 0, 1], [glide(5000), 5000, 0]]) {
      // In steady flight lift is about W cos(path angle): just under 1 G.
      expect(point.load).toBeGreaterThan(0.97);
      expect(point.load).toBeLessThanOrEqual(1.0001);
      const flown = hold(alt, point.v, point.pitch, lever, 90, 1 / 60);
      expect(flown.vsi).toBeCloseTo(point.vsi, 1);
      expect(flown.forces.normal / P.WEIGHT).toBeCloseTo(point.load, 2);
    }
  }, 60000);

  it('needs about the published ground roll to lift off', () => {
    use('cessna172');
    // Full power from a standstill; ease the nose up to 10 degrees from 55 KIAS.
    let s = { speed: 0, altitude: 0, vsi: 0, heading: 90, lat: 0, lon: 0, onGround: true, fieldElev: 0 };
    const ctrl = { throttle: 1, pitch: 0, bank: 0, flaps: 0, brake: 0 };
    let roll = 0;
    for (let t = 0; t < 60 && s.onGround; t += 1 / 60) {
      if (s.speed * KT >= 55) ctrl.pitch = Math.min(10, ctrl.pitch + 3 / 60);
      const next = { ...s, ...P.step(s, 1 / 60, ctrl), fieldElev: 0 };
      roll += (s.speed + next.speed) / 2 / 60;
      s = next;
    }
    // POH: 960 ft with 10 degrees of flap; this is a clean-wing departure.
    expect(s.onGround).toBe(false);
    expect(roll).toBeGreaterThan(850);
    expect(roll).toBeLessThan(1150);
  }, 60000);

  it('grips the runway less as the wing takes over the weight', () => {
    use('cessna172');
    // Braking at 50 kt: with the nose up the wing carries most of the weight,
    // so the tires press down less and brake less, even though drag rises.
    const rolling = { speed: 50 / KT, altitude: 0, vsi: 0, heading: 90, lat: 0, lon: 0, onGround: true, fieldElev: 0 };
    const decel = (pitch) => rolling.speed - P.step(rolling, 1 / 60, { throttle: 0, pitch, bank: 0, flaps: 0, brake: 1 }).speed;
    const level = decel(0), noseUp = decel(10);
    expect(P.step(rolling, 1 / 60, { throttle: 0, pitch: 10, bank: 0, flaps: 0, brake: 1 }).onGround).toBe(true);
    expect(noseUp).toBeLessThan(level * 0.75);
    expect(noseUp).toBeGreaterThan(0);
  });

  it('settles on the same path at 30, 60 and 144 frames per second', () => {
    use('cessna172');
    const runs = [30, 60, 144].map((fps) => hold(3000, 180, 4, 0.75, 120, 1 / fps));
    for (const run of runs) {
      expect(run.speed).toBeCloseTo(runs[1].speed, 1);
      expect(run.vsi).toBeCloseTo(runs[1].vsi, 1);
    }
  }, 60000);
});

describe('fleet performance', () => {
  it('the glider out-glides every powered aircraft at idle', () => {
    const ratios = {};
    for (const id of ['glider', 'cessna172', 'boeing737', 'f16', 'sr71']) {
      use(id);
      ratios[id] = glideRatio(glide(id === 'glider' ? 3000 : 5000));
    }
    expect(ratios.glider).toBeGreaterThan(31);
    expect(ratios.glider).toBeLessThan(38);
    expect(ratios.boeing737).toBeGreaterThan(15);
    expect(ratios.boeing737).toBeLessThan(21);
    for (const id of ['cessna172', 'boeing737', 'f16', 'sr71']) expect(ratios.glider, id).toBeGreaterThan(ratios[id] * 1.5);
  }, 60000);

  it('the 737-800 tops out near 41,000 ft and cruises at its Mach 0.82 limit', () => {
    use('boeing737');
    const ceiling = serviceCeiling();
    expect(ceiling).toBeGreaterThan(39000);
    expect(ceiling).toBeLessThan(44000);
    expect(topSpeed(35000, 1).mach).toBeCloseTo(0.82, 2);
    // Compressibility: drag climbs steeply past the critical Mach number.
    expect(P.waveDragCoefficient(0.70)).toBe(0);
    expect(P.waveDragCoefficient(0.90)).toBeGreaterThan(P.waveDragCoefficient(0.82) * 4);
  }, 60000);

  it('the F-16 needs its afterburner for supersonic flight and reaches Mach 2 at 40,000 ft', () => {
    use('f16');
    expect(topSpeed(40000, 0.85).mach).toBeLessThan(1.15);
    expect(topSpeed(40000, 1).mach).toBeGreaterThanOrEqual(2.0);
    expect(P.thrustAvailable(400, 0, 0.85)).toBeLessThan(P.thrustAvailable(400, 0, 1) * 0.7);
  }, 60000);

  it('the SR-71 cruises above Mach 3 at 80,000 ft and its ceiling is near 85,000 ft', () => {
    use('sr71');
    const cruise = trim(3.2 * P.speedOfSound(80000), 80000, 1);
    expect(cruise).not.toBeNull();
    expect(cruise.vsi).toBeGreaterThan(0);
    const ceiling = serviceCeiling();
    expect(ceiling).toBeGreaterThan(80000);
    expect(ceiling).toBeLessThan(90000);
  }, 60000);

  it('engines lose thrust as the air thins', () => {
    for (const id of ['cessna172', 'boeing737', 'f16']) {
      use(id);
      expect(P.thrustAvailable(250, 20000, 1), id).toBeLessThan(P.thrustAvailable(250, 0, 1) * 0.8);
    }
  });
});
