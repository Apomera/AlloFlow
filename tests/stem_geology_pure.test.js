// Pure-logic tests for stem_tool_geologyexplorer.js (the WebGL is Canvas-smoke-only).
// Pins the strata generator (a CHARACTERIZATION baseline to lock current behavior before
// the upcoming resolution/world-voxel refactor) and the new ambient-occlusion helper.

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let P;
beforeAll(() => {
  window.StemLab = { registerTool: function () {}, isRegistered: function () { return false; } };
  delete window.__alloGeologyPure;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_geologyexplorer.js'), 'utf8'))();
  P = window.__alloGeologyPure;
  if (!P) throw new Error('geology pure hook not exposed (window.__alloGeologyPure)');
});
beforeEach(() => { if (P.setScene) P.setScene('crust'); P.setGrid('standard'); });   // every test starts at the default scene + detail

describe('Geology Explorer — strata generator (characterization lock)', () => {
  it('default grid is 14×12×14 with 0.9 km/voxel', () => {
    expect(P.grid()).toMatchObject({ NX: 14, NY: 12, NZ: 14, KM_PER_VOXEL: 0.9, VOXEL: 1 });
    expect(P.grid().NY * P.grid().KM_PER_VOXEL).toBeCloseTo(10.8); // total crust depth — invariant the refactor must preserve
  });

  it('rockKeyAt lays the expected vertical sequence away from the pluton', () => {
    expect(P.rockKeyAt(1, 0, 1)).toBe('soil');
    expect(P.rockKeyAt(1, 2, 1)).toBe('sandstone');
    expect(P.rockKeyAt(1, 4, 1)).toBe('shale');
    expect(P.rockKeyAt(1, 6, 1)).toBe('limestone');
    expect(P.rockKeyAt(1, 8, 1)).toBe('basement');
    expect(P.rockKeyAt(1, 11, 1)).toBe('magma');
  });

  it('rockKeyAt places the cross-cutting pluton + contact aureole at the centre', () => {
    expect(P.rockKeyAt(7, 7, 7)).toBe('intrusion');  // pluton core
    expect(P.rockKeyAt(10, 7, 7)).toBe('marble');    // baked limestone rim (y in 6..8)
  });

  it('computeCore merges the column into ordered bands (oldest deepest)', () => {
    const segs = P.computeCore(1, 1);
    expect(segs[0].key).toBe('soil');
    expect(segs[segs.length - 1].key).toBe('magma');
    expect(segs.every((s) => s.y1 >= s.y0)).toBe(true);
  });
});

describe('Geology Explorer — resolution / detail refactor (world↔voxel decouple)', () => {
  it('Standard detail is byte-identical to the original grid (14×12×14 @0.9, voxel 1)', () => {
    P.setGrid('standard');
    expect(P.grid()).toEqual({ NX: 14, NY: 12, NZ: 14, KM_PER_VOXEL: 0.9, VOXEL: 1 });
    // and the strata generator is unchanged at Standard
    expect(P.rockKeyAt(1, 0, 1)).toBe('soil');
    expect(P.rockKeyAt(7, 7, 7)).toBe('intrusion');
    expect(P.rockKeyAt(10, 7, 7)).toBe('marble');
  });

  it('total crust depth (NY × km/voxel) stays physically constant across every detail level', () => {
    ['low', 'standard', 'high'].forEach((r) => {
      P.setGrid(r);
      expect(P.grid().NY * P.grid().KM_PER_VOXEL).toBeCloseTo(10.8, 5);   // depth invariant
    });
  });

  it('higher detail = more, smaller voxels — but stays under the ~12k Chromebook ceiling', () => {
    const counts = {};
    ['low', 'standard', 'high'].forEach((r) => { P.setGrid(r); const g = P.grid(); counts[r] = g.NX * g.NY * g.NZ; expect(g.NX * g.NY * g.NZ).toBeLessThanOrEqual(12000); });
    expect(counts.high).toBeGreaterThan(counts.standard);
    expect(counts.standard).toBeGreaterThan(counts.low);
    expect(counts.standard).toBe(2352);                                   // unchanged default
  });

  it('the generalized strata generator still reads soil→…→magma top-to-bottom at High detail', () => {
    P.setGrid('high');
    const g = P.grid();
    expect(P.rockKeyAt(1, 0, 1)).toBe('soil');                            // top
    expect(P.rockKeyAt(1, g.NY - 1, 1)).toBe('magma');                    // bottom
    const cx = Math.round((g.NX - 1) / 2);
    expect(P.rockKeyAt(cx, Math.round(g.NY * 0.6), cx)).toBe('intrusion'); // pluton still down the centre
  });
});

describe('Geology Explorer — scene registry + Crystal Cavern (geode)', () => {
  it('crust stays the default scene and its generator is unchanged (registry is behavior-preserving)', () => {
    expect(P.sceneId()).toBe('crust');
    expect(P.scenes()).toEqual(['crust', 'geode', 'deepEarth']);
    P.setScene('crust');
    expect(P.rockKeyAt(1, 0, 1)).toBe('soil');
    expect(P.rockKeyAt(7, 7, 7)).toBe('intrusion');
    P.setScene('crust');
  });

  it('crust geotherm matches the original linear shallow-crust model (no regression)', () => {
    // tempC = 15 + depthKm*25, presMPa = depthKm*27
    expect(P.crustGeotherm(2.7, 'shale')).toEqual({ tempC: 83, presMPa: 73, state: 'solid' });
    expect(P.crustGeotherm(10, 'magma').tempC).toBe('≈ 1000+');
  });

  it('geode generator carves a hollow void, lines it with crystal, and hosts it in limestone', () => {
    P.setScene('geode'); P.setGrid('standard');
    const g = P.grid();
    const cx = Math.round((g.NX - 1) / 2), cy = Math.round((g.NY - 1) / 2), cz = Math.round((g.NZ - 1) / 2);
    expect(P.geodeKeyAt(cx, cy, cz)).toBe('void');                 // hollow centre
    const corner = P.geodeKeyAt(0, 0, 0);
    expect(corner).toBe('limestone');                              // host rock at the edges
    // some crystal/rind exists between the void and the host
    const keys = {};
    for (let x = 0; x < g.NX; x++) for (let y = 0; y < g.NY; y++) for (let z = 0; z < g.NZ; z++) keys[P.geodeKeyAt(x, y, z)] = 1;
    expect(keys.void && keys.limestone && (keys.amethyst || keys.quartz) && (keys.agate || keys.chalcedony)).toBeTruthy();
    P.setScene('crust');
  });

  it('the geode scene uses a shallower depth scale than the crust', () => {
    P.setScene('geode'); P.setGrid('standard');
    const geodeKm = P.grid().KM_PER_VOXEL;
    P.setScene('crust'); P.setGrid('standard');
    expect(geodeKm).toBeLessThan(P.grid().KM_PER_VOXEL);   // 2.0/NY < 10.8/NY
    P.setScene('crust');
  });
});

describe('Geology Explorer — Deep Earth scene (radial structure + honest geotherm)', () => {
  it('is registered as a third scene without disturbing the crust default', () => {
    expect(P.scenes()).toEqual(['crust', 'geode', 'deepEarth']);
    expect(P.sceneId()).toBe('crust');                       // still the default after beforeEach
  });

  it('classifies a radial shell sequence from the centre outward', () => {
    P.setScene('deepEarth'); P.setGrid('standard');
    const g = P.grid();
    const cx = Math.round((g.NX - 1) / 2), cy = Math.round((g.NY - 1) / 2), cz = Math.round((g.NZ - 1) / 2);
    expect(P.deepEarthKeyAt(cx, cy, cz)).toBe('innerCore');  // centre
    expect(P.deepEarthKeyAt(0, 0, 0)).toBe('crust');         // surface corner
    // every shell is reachable somewhere in the grid
    const keys = {};
    for (let x = 0; x < g.NX; x++) for (let y = 0; y < g.NY; y++) for (let z = 0; z < g.NZ; z++) keys[P.deepEarthKeyAt(x, y, z)] = 1;
    ['crust', 'upperMantle', 'lowerMantle', 'outerCore', 'innerCore'].forEach((k) => expect(keys[k]).toBe(1));
    P.setScene('crust');
  });

  it('uses a NON-linear geotherm — no ~160,000°C extrapolation artifact', () => {
    ['crust', 'upperMantle', 'lowerMantle', 'outerCore', 'innerCore'].forEach((k) => {
      const g = P.deepEarthGeotherm(0, k);
      expect(g.tempC).toBeLessThan(6000);                    // linear 25°C/km would read ~160,000°C at the core
      expect(g.tempC).toBeGreaterThan(0);
    });
  });

  it('teaches the two core misconceptions: liquid outer core, solid-yet-hottest inner core', () => {
    const outer = P.deepEarthGeotherm(0, 'outerCore');
    const inner = P.deepEarthGeotherm(0, 'innerCore');
    expect(outer.state).toBe('liquid');                      // liquid iron–nickel = the geodynamo
    expect(inner.state).toBe('solid');                       // solid despite being hotter (pressure)
    expect(inner.tempC).toBeGreaterThan(outer.tempC);        // inner core IS hotter
  });

  it('the mantle is modelled as SOLID (convecting), not molten', () => {
    expect(P.deepEarthGeotherm(0, 'upperMantle').state).toMatch(/solid/);
    expect(P.deepEarthGeotherm(0, 'lowerMantle').state).toMatch(/solid/);
  });

  it('rockFacts reads radial per-layer depth in Deep Earth, not row depth', () => {
    P.setScene('deepEarth'); P.setGrid('standard');
    const f = P.rockFacts('innerCore', 0);                   // y=0 but depth must come from the layer (5500 km)
    expect(Number(f.depthKm)).toBeGreaterThan(5000);
    expect(f.state).toBe('solid');
    expect(f.tempC).toBeGreaterThan(5000);
    P.setScene('crust');
  });
});

describe('Geology Explorer — ambient occlusion (the de-Minecrafting shade)', () => {
  it('counts present face-neighbours (more enclosed → higher → darker)', () => {
    expect(P.aoCount({}, 5, 5, 5)).toBe(0);                                   // fully exposed
    expect(P.aoCount({ '6,5,5': 1, '4,5,5': 1 }, 5, 5, 5)).toBe(2);
    const full = {}; ['6,5,5', '4,5,5', '5,6,5', '5,4,5', '5,5,6', '5,5,4'].forEach((k) => { full[k] = 1; });
    expect(P.aoCount(full, 5, 5, 5)).toBe(6);                                 // fully enclosed
  });
});

describe('Geology Explorer — first-person explorer (pure flight + you-are-here HUD)', () => {
  // worldPos mirror (engine line ~351) for the round-trip lock
  const wp = (x, y, z) => [(x - (14 - 1) / 2) * 1, ((12 - 1) / 2 - y) * 1, (z - (14 - 1) / 2) * 1];

  it('fpForward gives a unit look vector with the documented axis convention', () => {
    const f0 = P.fpForward(0, 0);
    expect(f0.x).toBeCloseTo(0, 6); expect(f0.y).toBeCloseTo(0, 6); expect(f0.z).toBeCloseTo(-1, 6);  // yaw0,pitch0 → -Z
    const fy = P.fpForward(Math.PI / 2, 0);
    expect(fy.x).toBeCloseTo(-1, 6); expect(fy.z).toBeCloseTo(0, 6);
    const fp = P.fpForward(0, Math.PI / 4);
    expect(Math.hypot(fp.x, fp.y, fp.z)).toBeCloseTo(1, 6);                                            // always unit length
  });

  it('fpClampPitch prevents gimbal flip', () => {
    expect(P.fpClampPitch(5)).toBeLessThan(Math.PI / 2);
    expect(P.fpClampPitch(-5)).toBeGreaterThan(-Math.PI / 2);
    expect(P.fpClampPitch(0)).toBe(0);
  });

  it('fpWorldToVoxel is the exact inverse of worldPos, and clamps out-of-block points to the nearest edge', () => {
    [[7, 6, 7], [0, 0, 0], [13, 11, 13], [1, 4, 1]].forEach(([x, y, z]) => {
      const [wx, wy, wz] = wp(x, y, z);
      expect(P.fpWorldToVoxel(wx, wy, wz)).toEqual({ x, y, z });
    });
    expect(P.fpWorldToVoxel(1000, 1000, 1000)).toEqual({ x: 13, y: 0, z: 13 });    // +worldY = shallow → voxel y 0
    expect(P.fpWorldToVoxel(-1000, -1000, -1000)).toEqual({ x: 0, y: 11, z: 0 });
  });

  it('fpBounds is detail-invariant (WORLD-based) and contains the default camera pose', () => {
    const b = {};
    ['low', 'standard', 'high'].forEach((r) => { P.setGrid(r); b[r] = P.fpBounds(); });
    expect(b.high).toEqual(b.standard); expect(b.standard).toEqual(b.low);          // same at every detail
    const W = P.WORLD, pose = [W.w * 1.15, W.h * 1.05, W.d * 1.4];
    pose.forEach((c, i) => { expect(b.standard.max[i]).toBeGreaterThanOrEqual(c); expect(b.standard.min[i]).toBeLessThanOrEqual(-c + 0.001); });
  });

  it('fpStep flies along the look basis, clamps dt, clamps to bounds, and is pure', () => {
    const bounds = { min: [-100, -100, -100], max: [100, 100, 100] };
    const pos = { x: 0, y: 0, z: 0 };
    const np = P.fpStep(pos, { x: 0, y: 0, z: -1 }, { fwd: 1, strafe: 0, vert: 0 }, 0.5, 2, bounds);  // dt 0.5 → clamped to 0.05
    expect(np.z).toBeCloseTo(-0.1, 6); expect(np.x).toBeCloseTo(0, 6);
    expect(pos).toEqual({ x: 0, y: 0, z: 0 });                                       // input not mutated
    const far = P.fpStep({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -1 }, { fwd: 1, strafe: 0, vert: 0 }, 0.016, 1e6, bounds);
    expect(far.z).toBe(-100);                                                        // pinned at the wall, never escapes
  });

  it('fpProbe HUD stays scene-correct: crust linear, deepEarth radial non-linear (no ~160,000°C leak)', () => {
    P.setScene('crust'); P.setGrid('standard');
    const c = P.fpProbe(-5.5, 1.5, -5.5);                                            // maps to voxel (1,4,1) = shale
    expect(c.key).toBe('shale');
    expect(c.tempC).toBe(105);                                                       // 15 + 3.6km*25 — linear crust geotherm
    expect(c.layerName).toBeTruthy();

    P.setScene('deepEarth'); P.setGrid('standard');
    const core = P.fpProbe(0, 0, 0);                                                 // geometric centre
    expect(core.key).toBe('innerCore');
    expect(core.tempC).toBe(5200);                                                   // non-linear table, NOT ~159,000
    expect(core.tempC).toBeLessThan(6000);
    expect(core.state).toBe('solid');
    P.setScene('crust');
  });

  it('fpBust surfaces the misconception busts only inside the mantle/core layers', () => {
    expect(P.fpBust('upperMantle')).toMatch(/solid/i); expect(P.fpBust('upperMantle')).toMatch(/not/i);
    expect(P.fpBust('lowerMantle')).toMatch(/solid/i);
    expect(P.fpBust('outerCore')).toMatch(/liquid/i); expect(P.fpBust('outerCore')).toMatch(/geodynamo|magnetic/i);
    expect(P.fpBust('innerCore')).toMatch(/hotter/i); expect(P.fpBust('innerCore')).toMatch(/solid/i);
    expect(P.fpBust('crust')).toBeNull(); expect(P.fpBust('sandstone')).toBeNull(); expect(P.fpBust('quartz')).toBeNull();
  });

  it('every voxel layer in every scene has a you-are-here blurb', () => {
    const KEYS = {
      crust: ['soil', 'sandstone', 'shale', 'limestone', 'basement', 'intrusion', 'marble', 'hornfels', 'magma'],
      geode: ['limestone', 'chalcedony', 'agate', 'quartz', 'amethyst'],
      deepEarth: ['crust', 'upperMantle', 'lowerMantle', 'outerCore', 'innerCore'],
    };
    Object.keys(KEYS).forEach((sid) => KEYS[sid].forEach((k) => {
      const b = P.fpBlurb(sid, k);
      expect(typeof b).toBe('string'); expect(b.length).toBeGreaterThan(0);
    }));
  });

  it('layerChanged fires once per entry, never on staying put or entering void', () => {
    expect(P.layerChanged(null, 'soil')).toBe(true);
    expect(P.layerChanged('soil', 'soil')).toBe(false);
    expect(P.layerChanged('soil', 'shale')).toBe(true);
    expect(P.layerChanged('shale', null)).toBe(false);
  });

  it('fpBob respects reduced-motion and only oscillates while moving', () => {
    expect(P.fpBob(1.0, true, true, 0.05)).toBe(0);     // reduced-motion → no bob
    expect(P.fpBob(1.0, false, false, 0.05)).toBe(0);   // stationary → no bob
    const b = P.fpBob(0.3, true, false, 0.05);
    expect(Math.abs(b)).toBeLessThanOrEqual(0.05);
  });

  it('fpAnnounceText composes depth+temp+state and appends a bust only when present', () => {
    P.setScene('deepEarth'); P.setGrid('standard');
    const core = P.fpProbe(0, 0, 0);
    const a = P.fpAnnounceText(core);
    expect(a).toMatch(/5200/); expect(a).toMatch(/solid/); expect(a).toMatch(/pressure/i);   // inner-core bust tail
    P.setScene('crust'); P.setGrid('standard');
    const shale = P.fpProbe(-5.5, 1.5, -5.5);
    const s = P.fpAnnounceText(shale);
    expect(s).toMatch(/105/); expect(s).not.toMatch(/Myth-bust/);                             // crust → no bust
    P.setScene('crust');
  });

  it('fpSeedPose drops you in near the surface for crust and at mid-depth for deep Earth', () => {
    const crust = P.fpSeedPose('crust'), deep = P.fpSeedPose('deepEarth');
    expect(crust.pos.y).toBeGreaterThan(0);            // just under the surface
    expect(deep.pos.y).toBe(0);                        // mid-globe for the radial scene
    expect(crust.pos.y).not.toBe(deep.pos.y);
  });

  it('flying into the geode hollow resolves to the real crystal lining — never a fabricated "void" readout', () => {
    ['low', 'standard', 'high'].forEach((r) => {
      P.setScene('geode'); P.setGrid(r);
      const c = P.fpProbe(0, 0, 0);                    // the centre of the hollow cavity
      expect(c).not.toBeNull();
      expect(c.key).not.toBe('void');                  // single-step escape used to leave this as 'void'
      expect(c.layerName).not.toBe('void');
      expect(c.blurb.length).toBeGreaterThan(0);       // a real crystal/host layer always has a you-are-here line
      expect(typeof c.depthKm).toBe('string');
    });
    P.setScene('crust'); P.setGrid('standard');
  });

  it('fpAnnounceText keeps the °C unit even for the string-valued magma temperature', () => {
    P.setScene('crust'); P.setGrid('standard');
    const magma = P.fpProbe(-5.5, -5.5, -5.5);         // edge column, bottom row → magma
    expect(magma.key).toBe('magma');
    const a = P.fpAnnounceText(magma);
    expect(a).toMatch(/1000/);
    expect(a).toMatch(/degrees Celsius/);              // unit must not be dropped for the string temp
    P.setScene('crust');
  });
});
