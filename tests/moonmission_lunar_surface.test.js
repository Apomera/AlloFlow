/**
 * Moon Mission: the moonwalk's ground and the way you move across it.
 *
 * The surface was a 2 m grid with five crater "steps" (a rim that jumped straight to
 * a floor), one blurry noise tile repeated 8x, and a Lambert-lit plane under a sun
 * 30 degrees up. Walking moved a fixed distance per FRAME: 3.6 m/s at 60 Hz, twice
 * that at 120 Hz, with instant starts and stops, so the Moon felt like a parking lot.
 *
 * These pin the physics that replaced both: a seeded crater field whose profiles are
 * continuous and within real depth-to-diameter ratios, a sun-clearance bake that puts
 * shadows where the geometry says, and grip-limited suit locomotion that is frame-rate
 * independent, slow to start and stop, ballistic in the air, and slowed by hills.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Overridable so a mutation can run against a COPY; other sessions edit this file.
const FILE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';
const ID = 'moonMission';
let P;

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, ID);
  P = window.MoonMissionPure;
});

describe('the lunar surface field', () => {
  it('is seeded: two builds agree everywhere, whatever Math.random does', () => {
    const real = Math.random;
    try {
      Math.random = () => 0.4133;   // the e2e rock test pins Math.random exactly like this
      const a = P.lunarField(false);
      Math.random = real;
      const b = P.lunarField(false);
      for (const [x, z] of [[3, 3], [-20, -46], [46, -34], [80, -90], [900, 300], [-2500, 1800]]) {
        expect(a.height(x, z)).toBe(b.height(x, z));
      }
      expect(a.rocks.length).toBe(b.rocks.length);
    } finally { Math.random = real; }
  });

  it('keeps the landing site and the spawn smooth enough to stand and hop on', () => {
    const F = P.lunarField(false);
    for (const [x, z] of [[0, 0], [3, 3], [8, -4]]) {
      const gx = (F.height(x + 0.5, z) - F.height(x - 0.5, z));
      const gz = (F.height(x, z + 0.5) - F.height(x, z - 0.5));
      expect(Math.hypot(gx, gz), `slope at ${x},${z}`).toBeLessThan(0.12);
    }
  });

  it('shapes craters with continuous rims and real depth-to-diameter ratios', () => {
    const F = P.lunarField(false);
    const fresh = F.craters.find((c) => c.fresh > 0.9 && c.r > 10 && Math.hypot(c.x, c.z) < 100);
    const old = F.craters.find((c) => c.fresh < 0.3 && c.r > 15 && Math.hypot(c.x, c.z) < 100);
    expect(fresh && old).toBeTruthy();
    for (const c of [fresh, old]) {
      // No step at the rim: inside and outside meet.
      expect(Math.abs(P.craterShape(1 - 1e-7, c) - P.craterShape(1 + 1e-7, c))).toBeLessThan(1e-5);
      // The floor sits below the rim, and ejecta fades out by 2.6 radii.
      expect(P.craterShape(0, c)).toBeLessThan(P.craterShape(1, c));
      expect(Math.abs(P.craterShape(2.6, c))).toBeLessThan(1e-9);
      const dOverD = (P.craterShape(1, c) - P.craterShape(0, c)) / (2 * c.r);
      expect(dOverD).toBeGreaterThan(0.03);
      expect(dOverD).toBeLessThan(0.23);
    }
    // Fresh craters are deeper for their size than degraded ones.
    const ratio = (c) => (P.craterShape(1, c) - P.craterShape(0, c)) / c.r;
    expect(ratio(fresh)).toBeGreaterThan(ratio(old) * 2);
  });

  it('throws boulders out of the fresh crater, not across the landing site', () => {
    const F = P.lunarField(false);
    const fresh = F.craters.find((c) => c.fresh > 0.9 && c.r > 10 && Math.hypot(c.x, c.z) < 100);
    const big = F.rocks.filter((r) => r.s >= 0.35);
    const reach = fresh.r * 2.6;
    const nearFresh = big.filter((r) => Math.hypot(r.x - fresh.x, r.z - fresh.z) < reach);
    // Boulders per square metre around the fresh crater against the rest of the site.
    const nearDensity = nearFresh.length / (Math.PI * reach * reach);
    const elsewhere = (big.length - nearFresh.length) / (194 * 194 - Math.PI * reach * reach);
    expect(nearDensity).toBeGreaterThan(elsewhere * 5);
    expect(big.filter((r) => Math.hypot(r.x, r.z) < 12)).toEqual([]);
  });

  it('drops the far field below the horizon with the Moon\'s curvature', () => {
    const F = P.lunarField(false);
    expect(F.curvature(50, 50)).toBe(0);
    // d^2 / 2R: about 3.3 m at 3.4 km, and the massifs 7+ km out lose tens of metres.
    expect(F.curvature(3400, 0)).toBeGreaterThan(3.2);
    expect(F.curvature(3400, 0)).toBeLessThan(3.4);
    for (const m of F.massifs) expect(Math.hypot(m.x, m.z)).toBeGreaterThan(6500);
  });
});

describe('the sun-clearance bake', () => {
  it('lights open ground and shadows the down-sun side of a fresh crater\'s floor', () => {
    const F = P.lunarField(false);
    const G = P.lunarGrid(F.height, -100, 200, 257);
    const sun = P.evaSun();
    expect(sun.y).toBeCloseTo(Math.sin(17 * Math.PI / 180), 6);
    expect(P.sunClearance(G.at, 3, 3, G.at(3, 3), 60)).toBeGreaterThan(0);
    const c = F.craters.find((k) => k.fresh > 0.9 && k.r > 10 && Math.hypot(k.x, k.z) < 100);
    // The Sun comes from +x: the wall on the Sun's side hides the floor just inside it.
    const hx = sun.x / Math.hypot(sun.x, sun.z), hz = sun.z / Math.hypot(sun.x, sun.z);
    const px = c.x + hx * c.r * 0.6, pz = c.z + hz * c.r * 0.6;
    expect(P.sunClearance(G.at, px, pz, G.at(px, pz), 60)).toBeLessThan(0);
    // ...while the opposite wall faces the Sun and is lit.
    const qx = c.x - hx * c.r * 0.7, qz = c.z - hz * c.r * 0.7;
    expect(P.sunClearance(G.at, qx, qz, G.at(qx, qz), 60)).toBeGreaterThan(0);
  });

  it('lets a solid above the ground cast into the bake', () => {
    const flat = () => 0;
    const sun = P.evaSun();
    const hx = sun.x / Math.hypot(sun.x, sun.z), hz = sun.z / Math.hypot(sun.x, sun.z);
    // A 2 m block 3 m up-sun of the point shades it; nothing there, and it is lit.
    const block = (x, z, y) => Math.hypot(x - hx * 3, z - hz * 3) < 0.8 && y < 2;
    expect(P.sunClearance(flat, 0, 0, 0, 30)).toBeGreaterThan(0);
    expect(P.sunClearance(flat, 0, 0, 0, 30, block)).toBeLessThan(0);
  });

  it('sees less sky from a crater floor than from the open plain', () => {
    const F = P.lunarField(false);
    const G = P.lunarGrid(F.height, -100, 200, 257);
    const c = F.craters.find((k) => k.fresh > 0.9 && k.r > 10 && Math.hypot(k.x, k.z) < 100);
    const floor = P.skyView(G.at, c.x, c.z, G.at(c.x, c.z), 8, 10, 24);
    const plain = P.skyView(G.at, 3, 3, G.at(3, 3), 8, 10, 24);
    expect(floor).toBeLessThan(plain - 0.05);
  });
});

describe('suit locomotion in one-sixth gravity', () => {
  const G = () => P.evaGait();
  // Integrate a fixed wall-clock span at a given frame rate.
  function run(v, secs, hz, wish, opts = {}) {
    const dt = 1 / hz;
    let x = 0;
    for (let t = 0; t < secs - 1e-9; t += dt) {
      P.evaFootVelocity(v, wish[0], wish[1], !!opts.lope, !!opts.comfort, opts.air ? false : true, opts.gx || 0, opts.gz || 0, dt);
      x += Math.hypot(v.x, v.z) * dt;
    }
    return x;
  }

  it('is frame-rate independent', () => {
    const a = { x: 0, z: 0 }, b = { x: 0, z: 0 };
    run(a, 1.0, 144, [0, -1]);
    run(b, 1.0, 12, [0, -1]);
    expect(Math.hypot(a.x, a.z)).toBeCloseTo(Math.hypot(b.x, b.z), 6);
  });

  it('gets going and stops at the grip friction allows, not instantly', () => {
    const v = { x: 0, z: 0 };
    run(v, 0.25, 60, [0, -1]);
    // The old walk jumped straight to 3.6 m/s; boots on regolith cannot push that hard.
    expect(Math.hypot(v.x, v.z)).toBeCloseTo(G().grip * 0.25, 6);
    run(v, 3, 60, [0, -1], { lope: true });
    expect(Math.hypot(v.x, v.z)).toBeCloseTo(G().lope, 6);
    const stopDist = run(v, 4, 60, [0, 0]);
    expect(Math.hypot(v.x, v.z)).toBe(0);
    // v^2 / 2a: well over a metre and a half to stop from a lope.
    expect(stopDist).toBeGreaterThan(1.5);
    expect(stopDist).toBeLessThan(2.2);
  });

  it('holds its arc in the air: no pushing off nothing', () => {
    const v = { x: 1.2, z: 0 };
    run(v, 1, 60, [-1, 0], { air: true });
    // A tenth of a metre per second of drift at most, against 1.9 of grip on the ground.
    expect(v.x).toBeGreaterThan(1.2 - G().air - 1e-9);
  });

  it('slows you uphill and speeds you a little downhill', () => {
    const up = { x: 0, z: 0 }, down = { x: 0, z: 0 }, flat = { x: 0, z: 0 };
    run(up, 4, 60, [1, 0], { gx: 0.25 });
    run(down, 4, 60, [1, 0], { gx: -0.1 });
    run(flat, 4, 60, [1, 0]);
    expect(up.x).toBeLessThan(flat.x * 0.7);
    expect(down.x).toBeGreaterThan(flat.x);
  });

  it('slides on a slope too steep for a boot to hold, and not on a gentle one', () => {
    const steep = { x: 0, z: 0 }, gentle = { x: 0, z: 0 };
    run(steep, 1, 60, [0, 0], { gx: 0.9 });
    run(gentle, 1, 60, [0, 0], { gx: 0.3 });
    expect(steep.x).toBeLessThan(-0.1);    // downhill is -x when the ground rises along +x
    expect(gentle.x).toBe(0);
  });

  it('is gentler in comfort mode', () => {
    const v = { x: 0, z: 0 };
    run(v, 4, 60, [0, -1], { comfort: true });
    expect(Math.hypot(v.x, v.z)).toBeCloseTo(G().walk * G().comfort, 6);
  });
});

describe('the moonwalk loop wiring', () => {
  const src = readFileSync(FILE, 'utf8');
  it('moves the suit through mmEvaFootVelocity on real elapsed time', () => {
    expect(src).toContain('mmEvaFootVelocity(evaVel, evaWishX, evaWishZ, evaLope, comfortMode, !isJumping, evaGx, evaGz, evaMoveDt);');
    expect(src).toContain('playerPos.x += evaVel.x * evaMoveDt;');
    expect(src).not.toContain('multiplyScalar(speed3d)');
    expect(src).toContain("case 'shift': moveState.lope = true; break;");
    expect(src).toContain('if (moveState.turnLeft) yaw += (comfortMode ? 0.72 : 1.68) * evaDt;');
  });
  it('sails you off a crest the ground curves away from faster than 1/6 g', () => {
    expect(src).toContain('if ((evaGFwd - 2 * evaG0 + evaGBack) / (evaLook * evaLook) < -EVA_G * 1.15) {');
  });
  it('keeps you out of the LM, the big boulders and the parked rover', () => {
    expect(src).toContain('var _evaSolids = [[0, 0, 1.8, lmGroup.position.y + 4.6]');
    expect(src).toContain('.concat(_evaRockObstacles);');
    expect(src).toContain('if (!roverBoarded) evaPushOut(roverGrp.position.x, roverGrp.position.z, 0.9');
  });
  it('shades the ground with lunar photometry and the baked terrain shadow', () => {
    expect(src).toContain("float ls = 2.0 * mu0 / max(mu0 + mu, 0.08);");
    expect(src).toContain("float surge = 1.0 + uLunarOpp / (1.0 + tg / 0.07);");
    expect(src).toContain("lunarSunVis = smoothstep(-lunarEdge, lunarEdge, vLunarBake.x);");
    expect(src).toContain("terrainGeo.setAttribute('lunarBake', new THREE.BufferAttribute(terrainBake, 3));");
  });
});
