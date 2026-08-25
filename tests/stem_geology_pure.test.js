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
    expect(P.scenes()).toEqual(['crust', 'geode', 'deepEarth', 'subduction', 'ridge', 'hotspot']);
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
    expect(P.scenes()).toEqual(['crust', 'geode', 'deepEarth', 'subduction', 'ridge', 'hotspot']);
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

describe('Geology Explorer — first-person explorer (grounded mining + Deep Earth flight + you-are-here HUD)', () => {
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

  it('chooses grounded mining for surface scenes and flight only for radial Deep Earth', () => {
    ['crust', 'geode', 'subduction', 'ridge', 'hotspot'].forEach((sceneId) => {
      expect(P.fpExplorerMode(sceneId)).toBe('mine');
    });
    expect(P.fpExplorerMode('deepEarth')).toBe('fly');
  });

  it('fpSeedPose starts surface walkers above the terrain and Deep Earth at mid-depth', () => {
    const crust = P.fpSeedPose('crust'), geode = P.fpSeedPose('geode'), deep = P.fpSeedPose('deepEarth');
    expect(crust.pos.y).toBeGreaterThan(P.WORLD.h * 0.5); // eye starts above the top face so gravity can settle it
    expect(crust.pitch).toBeLessThan(0);                  // the first reticle already points toward a mineable block
    expect(geode.pos).toEqual({ x: 0, y: 0, z: 0 });      // center of the pre-carved cavern
    expect(deep.pos.y).toBe(0);                           // mid-globe for radial flight
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

  it('classifies water as swimmable, molten rock as hazardous, and solid mantle as ground', () => {
    expect(P.fpMaterialPhysics('oceanWater')).toMatchObject({ kind: 'fluid', speed: expect.any(Number), buoyancy: expect.any(Number) });
    expect(P.fpMaterialPhysics('outerCore')).toMatchObject({ kind: 'fluid', buoyancy: expect.any(Number) });
    ['magma', 'arcMagma', 'axialMagma', 'conduit'].forEach((key) => expect(P.fpMaterialPhysics(key).kind).toBe('hazard'));
    expect(P.fpMaterialPhysics('plume').kind).toBe('solid');       // solid-but-flowing mantle is not mislabelled as lava
    expect(P.fpMaterialPhysics('asthenosphere').kind).toBe('solid');
  });

  it('gives progressively harder materials longer mining times and protects fluids/hazards', () => {
    const loose = P.fpMiningProfile('soil', 'Surface');
    const layered = P.fpMiningProfile('sandstone', 'Sedimentary');
    const crystal = P.fpMiningProfile('quartz', 'Mineral');
    const hard = P.fpMiningProfile('basement', 'Igneous (intrusive)');
    expect(loose.ms).toBeLessThan(layered.ms);
    expect(layered.ms).toBeLessThan(crystal.ms);
    expect(crystal.ms).toBeLessThan(hard.ms);
    expect(P.fpMiningProfile('oceanWater', 'Water').mineable).toBe(false);
    expect(P.fpMiningProfile('magma', 'Molten').mineable).toBe(false);
  });

  it('makes the drill faster while preserving hardness and increasing heat load', () => {
    const loose = P.fpMiningProfile('soil', 'Surface');
    const hard = P.fpMiningProfile('basement', 'Igneous (intrusive)');
    expect(P.fpToolMiningDuration(loose, 'pick')).toBe(loose.ms);
    expect(P.fpToolMiningDuration(loose, 'drill')).toBeLessThan(loose.ms);
    expect(P.fpToolMiningDuration(hard, 'drill')).toBeGreaterThan(P.fpToolMiningDuration(loose, 'drill'));
    expect(P.fpToolMiningDuration({ ms: 1 }, 'drill')).toBe(90);
    expect(P.fpDrillHeatRate(hard)).toBeGreaterThan(P.fpDrillHeatRate(loose));
  });

  it('maps mining progress to stable visual crack stages', () => {
    expect(P.fpMiningStage(0, 8)).toBe(0);
    expect(P.fpMiningStage(0.01, 8)).toBe(1);
    expect(P.fpMiningStage(0.5, 8)).toBe(4);
    expect(P.fpMiningStage(1, 8)).toBe(8);
    expect(P.fpMiningStage(4, 8)).toBe(8);
  });

  it('uses stable scene/detail keys so each voxel world can restore its own tunnel', () => {
    expect(P.excavationWorldKey('crust', 'standard')).toBe('crust@standard');
    expect(P.excavationWorldKey('crust', 'high')).not.toBe(P.excavationWorldKey('crust', 'standard'));
    expect(P.excavationWorldKey('ridge', 'standard')).not.toBe(P.excavationWorldKey('crust', 'standard'));
  });
});

describe('Geology Explorer — directional core rig', () => {
  const bounds = { minX: 0, maxX: 13, minY: 0, maxY: 11, minZ: 0, maxZ: 13 };
  const evaluationReport = (sampleCount, uniqueCount, targetDepth = sampleCount, stopReason = null) => {
    const keys = Array.from({ length: Math.max(1, uniqueCount) }, (_, index) => 'material-' + (index + 1));
    return {
      targetDepth,
      stopReason,
      samples: Array.from({ length: sampleCount }, (_, index) => ({ key: keys[index % keys.length], depth: index + 1 })),
    };
  };

  it('exposes safe surface-only angle and depth presets as defensive copies', () => {
    expect(P.coreRigAngles()).toEqual({ vertical: 90, slant: 60, shallow: 35 });
    expect(P.coreRigDepths()).toEqual([6, 9, 12]);
    const angles = P.coreRigAngles(); angles.vertical = 0;
    const depths = P.coreRigDepths(); depths.push(99);
    expect(P.coreRigAngles().vertical).toBe(90);
    expect(P.coreRigDepths()).toEqual([6, 9, 12]);
    ['crust', 'geode', 'subduction', 'ridge', 'hotspot'].forEach((sceneId) => expect(P.coreRigSupported(sceneId)).toBe(true));
    expect(P.coreRigSupported('deepEarth')).toBe(false);
  });

  it('plans bounded vertical and directional bore paths using the voxel y-down convention', () => {
    expect(P.coreRigPath({ x: 7, y: 0, z: 7 }, 0, 'vertical', 6, bounds)).toEqual([
      { x: 7, y: 1, z: 7, distance: 1, depth: 1 },
      { x: 7, y: 2, z: 7, distance: 2, depth: 2 },
      { x: 7, y: 3, z: 7, distance: 3, depth: 3 },
      { x: 7, y: 4, z: 7, distance: 4, depth: 4 },
      { x: 7, y: 5, z: 7, distance: 5, depth: 5 },
      { x: 7, y: 6, z: 7, distance: 6, depth: 6 },
    ]);
    expect(P.coreRigPath({ x: 7, y: 10, z: 7 }, 0, 'vertical', 6, bounds)).toEqual([
      { x: 7, y: 11, z: 7, distance: 1, depth: 1 },
    ]);

    const slant = P.coreRigPath({ x: 7, y: 0, z: 7 }, 0, 'slant', 6, bounds);
    const shallow = P.coreRigPath({ x: 7, y: 0, z: 7 }, 0, 'shallow', 6, bounds);
    [slant, shallow].forEach((path) => {
      expect(new Set(path.map((cell) => `${cell.x},${cell.y},${cell.z}`)).size).toBe(path.length);
      path.forEach((cell) => {
        expect(cell.x).toBeGreaterThanOrEqual(bounds.minX); expect(cell.x).toBeLessThanOrEqual(bounds.maxX);
        expect(cell.y).toBeGreaterThanOrEqual(bounds.minY); expect(cell.y).toBeLessThanOrEqual(bounds.maxY);
        expect(cell.z).toBeGreaterThanOrEqual(bounds.minZ); expect(cell.z).toBeLessThanOrEqual(bounds.maxZ);
      });
      expect(path[path.length - 1].y).toBeGreaterThan(path[0].y);
      expect(path[path.length - 1].z).toBeLessThan(path[0].z);
    });
    const reach = (path) => Math.abs(path[path.length - 1].z - 7);
    expect(reach(shallow)).toBeGreaterThan(reach(slant));
  });

  it('stops before unsafe materials and gives harder cores a longer cut time', () => {
    expect(P.coreRigStopReason(null)).toBe('blocked');
    expect(P.coreRigStopReason('void')).toBe('blocked');
    expect(P.coreRigStopReason('magma', 'Molten')).toBe('hazard');
    expect(P.coreRigStopReason('oceanWater', 'Water')).toBe('fluid');
    expect(P.coreRigStopReason('outerCore')).toBe('fluid');
    expect(P.coreRigStopReason('sandstone', 'Sedimentary')).toBeNull();
    expect(P.coreRigDrillDuration('soil', 'Surface')).toBe(240);
    expect(P.coreRigDrillDuration('basement', 'Igneous (intrusive)')).toBe(600);
    expect(P.coreRigDrillDuration('oceanWater', 'Water')).toBe(0);
    expect(P.coreRigDrillDuration('magma', 'Molten')).toBe(0);
  });

  it('summarizes the recovered column for the journal and safe-stop readout', () => {
    expect(P.coreRigReportSummary({ stopReason: 'fluid', samples: [
      { key: 'sandstone', depth: 1 }, { key: 'shale', depth: 3 }, { key: 'shale', depth: 6 },
    ] })).toEqual({ sampleCount: 3, uniqueMaterials: 2, deepest: 6, stopReason: 'fluid' });
    expect(P.coreRigReportSummary()).toEqual({ sampleCount: 0, uniqueMaterials: 0, deepest: 0, stopReason: null });
  });

  it('grades full and partial columns from recovery, diversity, and depth without mutating the report', () => {
    const complete = evaluationReport(6, 3, 6);
    const before = JSON.parse(JSON.stringify(complete));
    expect(P.coreRigEvaluation(complete)).toEqual({
      score: 126, grade: 'B', label: 'Strong recovery', fullCore: true, safeBoundary: false, recoveryRatio: 1,
    });
    expect(complete).toEqual(before);

    const partial = P.coreRigEvaluation(evaluationReport(1, 1, 12));
    expect(partial).toMatchObject({ score: 24, grade: 'D', label: 'Partial recovery', fullCore: false, safeBoundary: false });
    expect(partial.recoveryRatio).toBeCloseTo(1 / 12, 8);

    expect(P.coreRigEvaluation()).toEqual({
      score: 0, grade: 'D', label: 'Partial recovery', fullCore: false, safeBoundary: false, recoveryRatio: 0,
    });
  });

  it('rewards a protected fluid or thermal stop but never mistakes blocked or cancelled work for a safe boundary', () => {
    const fluid = P.coreRigEvaluation(evaluationReport(6, 3, 9, 'fluid'));
    expect(fluid).toMatchObject({ score: 118, grade: 'B', fullCore: false, safeBoundary: true });
    expect(fluid.recoveryRatio).toBeCloseTo(2 / 3, 8);
    expect(P.coreRigEvaluation(evaluationReport(6, 3, 9, 'hazard'))).toMatchObject({ score: 118, safeBoundary: true });
    expect(P.coreRigEvaluation(evaluationReport(6, 3, 9, 'blocked'))).toMatchObject({ score: 102, fullCore: false, safeBoundary: false });
    expect(P.coreRigEvaluation(evaluationReport(6, 3, 9, 'cancelled'))).toMatchObject({ score: 102, fullCore: false, safeBoundary: false });
    expect(P.coreRigEvaluation({ targetDepth: 6, stopReason: 'fluid', samples: [] })).toMatchObject({ score: 0, safeBoundary: false });
  });

  it('keeps every grade boundary stable, caps exceptional cores, and clamps over-recovery', () => {
    [
      [1, 1, 1, 48, 'D'],
      [2, 2, 2, 72, 'C'],
      [5, 2, 5, 102, 'B'],
      [7, 3, 7, 136, 'A'],
      [10, 4, 10, 180, 'S'],
    ].forEach(([count, unique, target, score, grade]) => {
      expect(P.coreRigEvaluation(evaluationReport(count, unique, target))).toMatchObject({ score, grade, fullCore: true, recoveryRatio: 1 });
    });
    expect(P.coreRigEvaluation(evaluationReport(12, 12, 12))).toMatchObject({ score: 200, grade: 'S' });
    expect(P.coreRigEvaluation(evaluationReport(12, 4, 9)).recoveryRatio).toBe(1);
    expect(P.coreRigGradeForScore(64)).toBe('D');
    expect(P.coreRigGradeForScore(65)).toBe('C');
    expect(P.coreRigGradeForScore(100)).toBe('B');
    expect(P.coreRigGradeForScore(135)).toBe('A');
    expect(P.coreRigGradeForScore(175)).toBe('S');
    expect(P.coreRigGradeForScore(999)).toBe('S');
  });

  it('awards research XP only for a new best and telescopes to the same 100 XP maximum', () => {
    expect(P.coreRigResearchReward(0, 126)).toBe(63);
    expect(P.coreRigResearchReward(126, 126)).toBe(0);
    expect(P.coreRigResearchReward(140, 126)).toBe(0);
    expect(P.coreRigResearchReward(126, 127)).toBe(1);
    expect(P.coreRigResearchReward(126, 128)).toBe(1);
    expect(P.coreRigResearchReward(126, 129)).toBe(2);
    expect(P.coreRigResearchReward(1, 2)).toBe(0);
    expect(P.coreRigResearchReward(2, 3)).toBe(1);
    expect(P.coreRigResearchReward(0, 200)).toBe(100);
    expect(P.coreRigResearchReward(undefined, undefined)).toBe(0);

    let incremental = 0;
    for (let score = 1; score <= 200; score += 1) {
      const reward = P.coreRigResearchReward(score - 1, score);
      expect([0, 1]).toContain(reward);
      incremental += reward;
    }
    expect(incremental).toBe(P.coreRigResearchReward(0, 200));
  });

  it('advances immutable research records while separating best and latest bore results', () => {
    const first = P.advanceCoreRigResearch(undefined, { score: 126 }, 1000, 'rig-1');
    expect(first).toEqual({
      entry: {
        bestScore: 126, bestGrade: 'B', totalBores: 1, lastScore: 126, lastGrade: 'B',
        lastCompletedAt: 1000, reportIds: ['rig-1'],
      },
      researchReward: 63, newBest: true, duplicate: false,
    });

    const firstSnapshot = JSON.parse(JSON.stringify(first.entry));
    const same = P.advanceCoreRigResearch(first.entry, { score: 126 }, 1001, 'rig-2');
    expect(same).toMatchObject({
      entry: { bestScore: 126, bestGrade: 'B', totalBores: 2, lastScore: 126, lastGrade: 'B', lastCompletedAt: 1001 },
      researchReward: 0, newBest: false, duplicate: false,
    });
    expect(first.entry).toEqual(firstSnapshot);

    const lower = P.advanceCoreRigResearch(same.entry, { score: 118 }, 1002, 'rig-3');
    expect(lower).toMatchObject({
      entry: { bestScore: 126, bestGrade: 'B', totalBores: 3, lastScore: 118, lastGrade: 'B', lastCompletedAt: 1002 },
      researchReward: 0, newBest: false, duplicate: false,
    });

    const higher = P.advanceCoreRigResearch(lower.entry, { score: 136 }, 1003, 'rig-4');
    expect(higher).toMatchObject({
      entry: { bestScore: 136, bestGrade: 'A', totalBores: 4, lastScore: 136, lastGrade: 'A', lastCompletedAt: 1003 },
      researchReward: 5, newBest: true, duplicate: false,
    });
    expect(higher.entry.reportIds).toEqual(['rig-1', 'rig-2', 'rig-3', 'rig-4']);
  });

  it('makes repeated completion callbacks idempotent and normalizes corrupt saved research safely', () => {
    const original = {
      bestScore: 126, bestGrade: 'B', totalBores: 3, lastScore: 118, lastGrade: 'B',
      lastCompletedAt: 1002, reportIds: ['rig-1', 'rig-2', 'rig-3'], customSavedField: 'keep',
    };
    const snapshot = JSON.parse(JSON.stringify(original));
    const duplicate = P.advanceCoreRigResearch(original, { score: 200 }, 9999, 'rig-2');
    expect(duplicate).toMatchObject({
      entry: { bestScore: 126, bestGrade: 'B', totalBores: 3, lastScore: 118, lastCompletedAt: 1002, customSavedField: 'keep' },
      researchReward: 0, newBest: false, duplicate: true,
    });
    expect(duplicate.entry.reportIds).toEqual(['rig-1', 'rig-2', 'rig-3']);
    expect(original).toEqual(snapshot);

    const corrupt = { bestScore: Infinity, bestGrade: 'spoofed', totalBores: -9, reportIds: Array.from({ length: 14 }, (_, index) => 'old-' + index) };
    const normalized = P.advanceCoreRigResearch(corrupt, { score: 65 }, -50, 'fresh');
    expect(normalized).toMatchObject({
      entry: { bestScore: 200, bestGrade: 'S', totalBores: 1, lastScore: 65, lastGrade: 'C', lastCompletedAt: 0 },
      researchReward: 0, newBest: false, duplicate: false,
    });
    expect(normalized.entry.reportIds).toHaveLength(12);
    expect(normalized.entry.reportIds.at(-1)).toBe('fresh');
    expect(corrupt.reportIds).toHaveLength(14);
  });
});

describe('Geology Explorer — Subduction zone scene (convergent margin + thermal anomaly)', () => {
  it('is registered as a fourth scene and leaves crust the default', () => {
    expect(P.scenes()).toEqual(['crust', 'geode', 'deepEarth', 'subduction', 'ridge', 'hotspot']);
    expect(P.sceneId()).toBe('crust');
  });

  it('lays out an ocean plate, a descending slab, an overriding continent, and an arc', () => {
    P.setScene('subduction'); P.setGrid('standard');
    expect(P.subductionKeyAt(1, 0, 7)).toBe('oceanWater');     // sea over the ocean plate
    expect(P.subductionKeyAt(1, 1, 7)).toBe('oceanCrust');     // dense ocean crust below it
    expect(P.subductionKeyAt(12, 0, 7)).toBe('contCrust');     // buoyant continent (right)
    expect(P.subductionKeyAt(8, 0, 7)).toBe('arcVolcano');     // the arc volcano at the surface
    expect(P.subductionKeyAt(8, 2, 7)).toBe('arcMagma');       // magma conduit rising under it
    expect(P.subductionKeyAt(5, 2, 7)).toBe('slab');           // the subducting slab
    expect(P.subductionKeyAt(12, 7, 7)).toBe('wedge');         // hot mantle wedge above the slab
    expect(P.subductionKeyAt(1, 8, 7)).toBe('asthenosphere');  // ductile mantle below
    // every modelled layer is reachable somewhere in the section
    const g = P.grid(), keys = {};
    for (let x = 0; x < g.NX; x++) for (let y = 0; y < g.NY; y++) keys[P.subductionKeyAt(x, y, 7)] = 1;
    ['oceanWater', 'oceanCrust', 'contCrust', 'slab', 'lithMantle', 'wedge', 'asthenosphere', 'arcMagma', 'arcVolcano'].forEach((k) => expect(keys[k]).toBe(1));
    P.setScene('crust');
  });

  it('the slab descends to the right as you go deeper (a dipping plate, not a vertical wall)', () => {
    P.setScene('subduction'); P.setGrid('standard');
    const slabX = (y) => { for (let x = 0; x < P.grid().NX; x++) if (P.subductionKeyAt(x, y, 7) === 'slab') return x; return -1; };
    expect(slabX(2)).toBeGreaterThan(0);
    expect(slabX(8)).toBeGreaterThan(slabX(2));                // deeper slab is further right (dipping)
    P.setScene('crust');
  });

  it('its geotherm encodes the COLD slab vs HOT wedge anomaly (honest, not depth-linear)', () => {
    const slab = P.subductionGeotherm(120, 'slab');
    const wedge = P.subductionGeotherm(110, 'wedge');
    const asth = P.subductionGeotherm(200, 'asthenosphere');
    expect(slab.tempC).toBeLessThan(wedge.tempC);              // the slab is the cold anomaly
    expect(slab.tempC).toBeLessThan(asth.tempC);
    expect(slab.state).toMatch(/cold/);
    expect(wedge.state).toMatch(/melt/);                       // wedge partially melts → arc magma
    expect(asth.state).toMatch(/solid/);                      // asthenosphere is SOLID (flows), not liquid
    expect(P.subductionGeotherm(30, 'arcMagma').state).toBe('molten');
    ['slab', 'wedge', 'asthenosphere', 'arcMagma', 'contCrust', 'oceanCrust'].forEach((k) => expect(P.subductionGeotherm(100, k).tempC).toBeLessThan(2000));
    P.setScene('crust');
  });

  it('fpProbe reads the wedge as a hot partial-melt zone (scene-aware HUD)', () => {
    P.setScene('subduction'); P.setGrid('standard');
    const w = P.fpProbe(5.5, -1.5, 0.5);                       // world coords mapping to voxel (12,7,7) = wedge
    expect(w.key).toBe('wedge');
    expect(w.tempC).toBe(1300);
    expect(w.state).toMatch(/melt/);
    expect(w.bust).toMatch(/water|wedge/i);                    // the flux-melting bust surfaces here
    P.setScene('crust');
  });

  it('every subduction layer has a you-are-here blurb, and the key myths carry busts', () => {
    ['oceanWater', 'oceanCrust', 'contCrust', 'slab', 'lithMantle', 'wedge', 'asthenosphere', 'arcMagma', 'arcVolcano'].forEach((k) => {
      expect(P.fpBlurb('subduction', k).length).toBeGreaterThan(0);
    });
    expect(P.fpBust('wedge')).toMatch(/water|melt/i);          // magma from the fluxed wedge, not the slab
    expect(P.fpBust('asthenosphere')).toMatch(/solid|flow/i);  // not a liquid the plates float on
    expect(P.fpBust('slab')).toMatch(/cold/i);
    expect(P.fpBust('oceanWater')).toBeNull();
  });
});

describe('Geology Explorer — Mid-ocean ridge scene (divergent boundary)', () => {
  const NX = 14, NY = 12;
  const col = (x) => Array.from({ length: NY }, (_, y) => P.ridgeKeyAt(x, y, 0));

  it('is registered as a fifth scene and leaves crust the default', () => {
    expect(P.scenes()).toContain('ridge');
    expect(P.sceneId()).toBe('crust');
  });

  it('lays the ophiolite sequence down a flank column: water → sediment → basalt → dikes → gabbro → mantle', () => {
    const c = col(0);                                          // far flank (oldest crust)
    const order = ['oceanWater', 'sediment', /basalt[NR]/, 'dikes', 'gabbro', 'lithMantle', 'asthenosphere'];
    let oi = 0;
    for (const key of c) {
      while (oi < order.length && !(order[oi] instanceof RegExp ? order[oi].test(key) : key === order[oi])) oi += 1;
      expect(oi, `unexpected key ${key} out of ophiolite order in ${c.join(',')}`).toBeLessThan(order.length);
    }
  });

  it('magnetic stripes are SYMMETRIC about the axis (the 1963 spreading evidence)', () => {
    // Mirror columns x and NX-1-x sit at equal distance from the axis → same polarity.
    for (let x = 0; x < 5; x++) {
      const y = 4;                                             // a row inside the pillow-basalt band on the flanks
      const left = P.ridgeKeyAt(x, y, 0);
      const right = P.ridgeKeyAt(NX - 1 - x, y, 0);
      if (/^basalt[NR]$/.test(left) || /^basalt[NR]$/.test(right)) {
        expect(left).toBe(right);
      }
    }
    // And both polarities genuinely occur somewhere.
    const all = [];
    for (let x = 0; x < NX; x++) for (let y = 0; y < NY; y++) all.push(P.ridgeKeyAt(x, y, 0));
    expect(all).toContain('basaltN');
    expect(all).toContain('basaltR');
  });

  it('sediment thickens with age (distance) and the axis is bare', () => {
    const count = (x, key) => col(x).filter((k) => k === key).length;
    expect(count(6, 'sediment')).toBe(0);                      // axial column: brand-new crust
    expect(count(0, 'sediment')).toBeGreaterThanOrEqual(count(4, 'sediment')); // older ≥ younger
    expect(count(0, 'sediment')).toBeGreaterThan(0);
  });

  it('has an axial magma lens with upwelling mantle beneath, and a vent on the right flank', () => {
    const axis = col(6);
    expect(axis).toContain('axialMagma');
    expect(axis[NY - 1]).toBe('asthenosphere');                // mantle rises right under the axis
    const all = [];
    for (let x = 0; x < NX; x++) for (let y = 0; y < NY; y++) all.push(P.ridgeKeyAt(x, y, 0));
    expect(all).toContain('vent');
    // The vent sits off-axis on the RIGHT flank only.
    for (let x = 0; x < 7; x++) for (let y = 0; y < NY; y++) expect(P.ridgeKeyAt(x, y, 0)).not.toBe('vent');
  });

  it('geotherm tracks crust AGE: young basalt warmer than old, vent 350°C, no linear-depth artifacts', () => {
    const g = (key) => P.ridgeGeotherm(5, key);
    expect(g('basaltN').tempC).toBeGreaterThan(g('basaltR').tempC);  // young > old at like depth
    expect(g('vent').tempC).toBe(350);                                // black-smoker fluid
    expect(g('axialMagma').state).toBe('molten');
    expect(g('asthenosphere').state).toMatch(/solid/i);               // ductile but SOLID
    for (const k of ['oceanWater', 'sediment', 'basaltN', 'basaltR', 'dikes', 'gabbro', 'axialMagma', 'vent', 'lithMantle', 'asthenosphere']) {
      expect(g(k).tempC).toBeLessThan(6000);
    }
  });

  it('busts the right myths', () => {
    expect(P.fpBust('basaltR')).toMatch(/stripe|revers/i);
    expect(P.fpBust('axialMagma')).toMatch(/underwater|unseen/i);
    expect(P.fpBust('vent')).toMatch(/chemistry|sunlight/i);
  });
});

describe('Geology Explorer — Hotspot chain scene (intraplate volcanism)', () => {
  const NX = 14, NY = 12;
  const all = () => {
    const out = [];
    for (let x = 0; x < NX; x++) for (let y = 0; y < NY; y++) out.push(P.hotspotKeyAt(x, y, 0));
    return out;
  };

  it('is registered as a sixth scene and leaves crust the default', () => {
    expect(P.scenes()).toContain('hotspot');
    expect(P.sceneId()).toBe('crust');
  });

  it('shows the age progression: active island above water, extinct island, drowned seamount', () => {
    const keys = all();
    for (const k of ['activeVolcano', 'oldIsland', 'seamount', 'oceanCrust', 'lithMantle', 'conduit', 'plume', 'asthenosphere', 'oceanWater']) {
      expect(keys, `${k} reachable`).toContain(k);
    }
    // The seamount is DROWNED: water sits above its apex; the active island is not.
    const topRow = (key) => {
      for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) if (P.hotspotKeyAt(x, y, 0) === key) return y;
      return -1;
    };
    expect(topRow('activeVolcano')).toBe(0);                   // breaks the surface
    expect(topRow('seamount')).toBeGreaterThan(0);             // submerged below at least one water row
  });

  it('the conduit feeds ONLY the volcano currently over the plume', () => {
    // Every conduit voxel sits in the plume-aligned column band, none under the old island.
    for (let x = 0; x < NX; x++) for (let y = 0; y < NY; y++) {
      if (P.hotspotKeyAt(x, y, 0) === 'conduit') {
        expect(Math.abs(x / (NX - 1) - 0.70)).toBeLessThan(0.05);
      }
    }
  });

  it('the plume rises from the bottom of the grid to the base of the plate', () => {
    const plumeCol = Math.round(0.70 * (NX - 1));
    expect(P.hotspotKeyAt(plumeCol, NY - 1, 0)).toBe('plume'); // tail reaches the bottom
    const keys = [];
    for (let y = 0; y < NY; y++) keys.push(P.hotspotKeyAt(plumeCol, y, 0));
    expect(keys.filter((k) => k === 'plume').length).toBeGreaterThanOrEqual(3);
  });

  it('geotherm: plume is HOTTER than ambient mantle but still SOLID (the honest anomaly)', () => {
    const g = (key) => P.hotspotGeotherm(100, key);
    expect(g('plume').tempC).toBeGreaterThan(g('asthenosphere').tempC);
    expect(g('plume').state).toMatch(/solid/i);                // hot rock, not a lava pipe
    expect(g('conduit').state).toBe('molten');                 // only the melt fraction is molten
    for (const k of ['oceanWater', 'activeVolcano', 'oldIsland', 'seamount', 'oceanCrust', 'lithMantle', 'conduit', 'plume', 'asthenosphere']) {
      expect(g(k).tempC).toBeLessThan(6000);
    }
  });

  it('busts the right myths', () => {
    expect(P.fpBust('plume')).toMatch(/plate moves|fixed/i);
    expect(P.fpBust('oldIsland')).toMatch(/off the plume|carried/i);
    expect(P.fpBust('activeVolcano')).toMatch(/shield|runny/i);
  });
});

describe('Geology Explorer — Field Runs gameplay loop', () => {
  it('offers two safe, three-specimen geology contracts in every scene', () => {
    const contracts = P.fieldExpeditions();
    const unsafe = new Set(['oceanWater', 'arcMagma', 'axialMagma', 'conduit', 'outerCore']);
    for (const id of P.scenes()) {
      expect(contracts[id], `contracts for ${id}`).toHaveLength(2);
      const valid = new Set(P.sceneVoxelKeys(id));
      for (const contract of contracts[id]) {
        expect(contract.label.length).toBeGreaterThan(0);
        expect(contract.brief.length).toBeGreaterThan(20);
        expect(contract.targets).toHaveLength(3);
        expect(contract.reward).toBeGreaterThan(0);
        for (const key of contract.targets) {
          expect(valid.has(key), `${key} belongs to ${id}`).toBe(true);
          expect(unsafe.has(key), `${key} is safe to collect`).toBe(false);
        }
      }
    }
  });

  it('rotates contracts and wraps after the second completed run', () => {
    expect(P.fieldExpeditionFor('crust', 0).id).toBe('strata');
    expect(P.fieldExpeditionFor('crust', 1).id).toBe('contact');
    expect(P.fieldExpeditionFor('crust', 2).id).toBe('strata');
    expect(P.fieldExpeditionFor('missing', 0)).toBeNull();
  });

  it('turns accumulated XP into clear, stable field ranks', () => {
    expect(P.fieldRankForXp(0)).toMatchObject({ label: 'Trail Scout', nextLabel: 'Field Geologist', remaining: 300 });
    expect(P.fieldRankForXp(300)).toMatchObject({ label: 'Field Geologist', nextLabel: 'Senior Geologist', remaining: 450 });
    expect(P.fieldRankForXp(1499)).toMatchObject({ label: 'Senior Geologist', remaining: 1 });
    expect(P.fieldRankForXp(1500)).toMatchObject({ label: 'Expedition Lead', nextLabel: null, remaining: 0 });
    expect(P.fieldRankForXp(-20).label).toBe('Trail Scout');
  });

  it('logs each mineable specimen once without mutating prior field-book data', () => {
    const original = {};
    const first = P.recordFieldDiscovery(original, 'crust', 'sandstone');
    expect(first.added).toBe(true);
    expect(first.keys).toEqual(['sandstone']);
    expect(original).toEqual({});

    const duplicate = P.recordFieldDiscovery(first.discoveredByScene, 'crust', 'sandstone');
    expect(duplicate.added).toBe(false);
    expect(duplicate.keys).toEqual(['sandstone']);

    const unsafe = P.recordFieldDiscovery(duplicate.discoveredByScene, 'subduction', 'oceanWater');
    expect(unsafe.added).toBe(false);
    expect(unsafe.keys).toEqual([]);
  });

  it('reports scene-journal completion against only collectible materials', () => {
    for (const id of P.scenes()) {
      const available = P.fieldCollectibleKeys(id);
      expect(available.length).toBeGreaterThan(0);
      expect(available).not.toContain('oceanWater');
      expect(available).not.toContain('outerCore');
      const complete = P.fieldDiscoveryProgress(id, { [id]: available });
      expect(complete).toMatchObject({ found: available.length, total: available.length, percent: 100, complete: true });
    }
    expect(P.fieldDiscoveryProgress('crust', { crust: ['sandstone'] })).toMatchObject({ found: 1, complete: false });
  });

  it('builds ordered journal cards and summarizes discovery across every world', () => {
    const geodeKeys = P.fieldCollectibleKeys('geode');
    const entries = P.fieldJournalEntries('geode', { geode: ['quartz'] });
    expect(entries.map((entry) => entry.key)).toEqual(geodeKeys);
    expect(entries.find((entry) => entry.key === 'quartz')).toMatchObject({ discovered: true, name: expect.any(String), type: expect.any(String) });
    expect(entries.find((entry) => entry.key === 'agate').discovered).toBe(false);

    const empty = P.fieldJournalSummary({});
    expect(empty).toMatchObject({ found: 0, percent: 0, scenesComplete: 0, sceneTotal: 6 });
    expect(empty.total).toBeGreaterThan(0);

    const completeBook = {};
    for (const id of P.scenes()) completeBook[id] = P.fieldCollectibleKeys(id);
    expect(P.fieldJournalSummary(completeBook)).toMatchObject({ found: empty.total, total: empty.total, percent: 100, scenesComplete: 6, sceneTotal: 6 });
  });

  it('starts either chosen assignment and retires it without losing completed-run history', () => {
    const previous = { active: false, completed: 3, contractIndex: 0, collected: ['old'], ready: false };
    const rotated = P.beginFieldRun(previous, 'crust');
    expect(rotated).toMatchObject({ active: true, completed: 3, contractIndex: 1, collected: [], ready: false });

    const chosen = P.beginFieldRun(previous, 'crust', 0);
    expect(chosen).toMatchObject({ active: true, completed: 3, contractIndex: 0, collected: [], ready: false });
    expect(previous.collected).toEqual(['old']);

    const retired = P.retireFieldRunEntry({ active: true, completed: 3, contractIndex: 1, collected: ['hornfels'], ready: false });
    expect(retired).toEqual({ active: false, completed: 3, contractIndex: 1, collected: [], ready: false });
  });

  it('advances only the requested sequence and never mutates saved progress', () => {
    const contract = P.fieldExpeditionFor('ridge', 0);
    const original = { active: true, ready: false, collected: [], completed: 0, contractIndex: 0 };
    const miss = P.advanceFieldRun(original, contract, 'gabbro');
    expect(miss.matched).toBe(false);
    expect(miss.entry.collected).toEqual([]);
    expect(original.collected).toEqual([]);

    const first = P.advanceFieldRun(original, contract, 'basaltN');
    const second = P.advanceFieldRun(first.entry, contract, 'dikes');
    const third = P.advanceFieldRun(second.entry, contract, 'gabbro');
    expect(first.expectedKey).toBe('dikes');
    expect(second.expectedKey).toBe('gabbro');
    expect(third.entry.collected).toEqual(['basaltN', 'dikes', 'gabbro']);
    expect(third.ready).toBe(true);
    expect(P.fieldRunReward(contract)).toBe(150);
    expect(original.collected).toEqual([]);
  });
});

describe('Geology Explorer — scene-aware quiz banks', () => {
  it('every scene has a bank of well-formed questions', () => {
    const banks = P.quizBanks();
    for (const id of P.scenes()) {
      const bank = banks[id];
      expect(bank, `bank for ${id}`).toBeTruthy();
      expect(bank.title.length).toBeGreaterThan(0);
      expect(bank.items.length).toBeGreaterThanOrEqual(3);
      for (const item of bank.items) {
        expect(item.q.length).toBeGreaterThan(0);
        expect(item.opts.length).toBeGreaterThanOrEqual(2);
        expect(item.correct).toBeGreaterThanOrEqual(0);
        expect(item.correct).toBeLessThan(item.opts.length);
        expect(item.why.length, `explanation for "${item.q}"`).toBeGreaterThan(20);
      }
    }
  });

  it('pins the science of the key answers', () => {
    const b = P.quizBanks();
    const answer = (id, i) => b[id].items[i].opts[b[id].items[i].correct];
    expect(answer('deepEarth', 0)).toMatch(/solid/i);            // mantle is solid
    expect(answer('deepEarth', 1)).toMatch(/s-wave/i);           // liquid outer core evidence
    expect(answer('subduction', 0)).toMatch(/wedge/i);           // magma from the wedge
    expect(answer('ridge', 0)).toMatch(/spread/i);               // stripes prove spreading
    expect(answer('hotspot', 0)).toMatch(/plate/i);              // the plate moves
    expect(answer('geode', 0)).toMatch(/slow/i);                 // slow growth = big crystals
  });
});
