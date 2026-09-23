// Geology Explorer first-person "dig feel": the drop-in view, solid walkable props, and
// the particle-size cap. The WebGL itself is verified by the real-browser harness; these
// pin the pure pieces the engine is built on.
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const THREE = require('../vendor/three-r128/three.min.js');
const root = path.resolve(import.meta.dirname, '..');
// GEO_TEST_SOURCE lets a mutation check load a scratch copy instead of rewriting the shared file.
const sourcePath = process.env.GEO_TEST_SOURCE || path.join(root, 'stem_lab', 'stem_tool_geologyexplorer.js');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_geologyexplorer.js');

let P;
beforeAll(() => {
  window.StemLab = { registerTool() {}, isRegistered() { return false; } };
  delete window.__alloGeologyPure;
  // eslint-disable-next-line no-new-func
  new Function(fs.readFileSync(sourcePath, 'utf8'))();
  P = window.__alloGeologyPure;
  if (!P) throw new Error('geology pure hook not exposed');
});
beforeEach(() => { P.setScene('crust'); P.setGrid('standard'); });

describe('drop-in view', () => {
  it('the crust explorer looks across open ground, not into the volcano', () => {
    const seed = P.fpSeedPose('crust');
    const f = P.fpForward(seed.yaw, seed.pitch);
    const len = Math.hypot(f.x, f.z), dx = f.x / len, dz = f.z / len;
    // closest approach of the horizontal line of sight to the volcano axis (x=0, z=0, radius 2.3)
    const t = -(seed.pos.x * dx + seed.pos.z * dz);
    const cx = seed.pos.x + dx * Math.max(0, t), cz = seed.pos.z + dz * Math.max(0, t);
    expect(Math.hypot(cx, cz)).toBeGreaterThan(2.3);
  });

  it('the first reticle still lands on ground within reach', () => {
    const seed = P.fpSeedPose('crust'), g = P.grid();
    const eyeAboveGround = 1.55 * g.VOXEL;               // FP_EYE_HEIGHT once gravity settles the walker
    const groundDistance = eyeAboveGround / Math.tan(-seed.pitch);
    expect(seed.pitch).toBeLessThan(0);
    expect(groundDistance).toBeLessThan(6 * g.VOXEL);    // FP_REACH
  });

  it('only the crust seed changed; other surface scenes keep their pose', () => {
    ['subduction', 'ridge', 'hotspot', 'collision'].forEach((id) => {
      expect(P.fpSeedPose(id)).toMatchObject({ yaw: 0, pitch: -0.42 });
    });
  });
});

describe('walkable props', () => {
  const cone = { kind: 'cone', x: 0, z: 0, r: 2.3, rTop: 0.276, h: 2.4, base: 6, crater: 0.252 };
  it('is empty outside the footprint', () => {
    expect(P.fpPropSurfaceY(cone, 2.31, 0)).toBeNull();
    expect(P.fpPropSurfaceY(cone, 5, 5)).toBeNull();
  });
  it('rises from the base ring to the summit ring along a straight flank', () => {
    expect(P.fpPropSurfaceY(cone, 2.3, 0)).toBeCloseTo(6, 6);
    const mid = P.fpPropSurfaceY(cone, (2.3 + 0.276) / 2, 0);
    expect(mid).toBeCloseTo(6 + 1.2, 6);
    expect(P.fpPropSurfaceY(cone, 0.276, 0)).toBeCloseTo(8.4, 6);
    // monotone up the flank
    let last = -Infinity;
    for (let d = 2.3; d >= 0.3; d -= 0.1) { const y = P.fpPropSurfaceY(cone, d, 0); expect(y).toBeGreaterThanOrEqual(last); last = y; }
  });
  it('dips into a caldera inside the summit ring', () => {
    expect(P.fpPropSurfaceY(cone, 0, 0)).toBeCloseTo(8.4 - 0.252, 6);
    expect(P.fpPropSurfaceY(cone, 0, 0)).toBeLessThan(P.fpPropSurfaceY(cone, 0.27, 0));
  });
  it('a cylinder prop is a flat top over its footprint', () => {
    const boulder = { kind: 'cyl', x: 1, z: 1, r: 0.3, h: 0.25, base: 6 };
    expect(P.fpPropSurfaceY(boulder, 1.2, 1)).toBeCloseTo(6.25, 6);
    expect(P.fpPropSurfaceY(boulder, 1.31, 1)).toBeNull();
  });
  it('the volcano flank is climbable in one frame step at walking speed', () => {
    // walk speed WORLD.h*0.5 per second, dt capped at 0.05 s → the rise per frame must stay under FP_STEP (0.55 voxel)
    const step = P.WORLD.h * 0.5 * 0.05, rise = step * cone.h / (cone.r - cone.rTop);
    expect(rise).toBeLessThan(0.55 * P.grid().VOXEL);
  });
});

describe('particle size cap', () => {
  it('injects the cap after the size-attenuation line of the real r128 points shader', () => {
    const material = P.capPointSize3d(new THREE.PointsMaterial({ size: 0.42 }), 44);
    const shader = { vertexShader: THREE.ShaderLib.points.vertexShader };
    material.onBeforeCompile(shader);
    const text = shader.vertexShader;
    expect(text).toContain('gl_PointSize = min( gl_PointSize, 44.0 );');
    expect(text.indexOf('gl_PointSize = min(')).toBeGreaterThan(text.indexOf('gl_PointSize *= ( scale / - mvPosition.z )'));
  });
  it('the engine caps dust, chips and atmosphere motes', () => {
    const src = fs.readFileSync(sourcePath, 'utf8');
    ['excavationDustMaterial3d', 'excavationChipMaterial3d', 'atmosphereMoteMaterial3d'].forEach((name) => {
      expect(src).toMatch(new RegExp('capPointSize3d\\(' + name + ', \\d+\\)'));
    });
  });
});

describe('rebuild ambient occlusion on a flat grid', () => {
  it('aoCountGrid agrees with aoCount at every cell, including the edges', () => {
    const nx = 5, ny = 4, nz = 6;
    let seed = 7;
    const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let trial = 0; trial < 6; trial++) {
      const grid = new Uint8Array(nx * ny * nz), map = {};
      for (let z = 0; z < nz; z++) for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
        if (rand() < 0.55) { grid[x + nx * (y + ny * z)] = 1; map[x + ',' + y + ',' + z] = 1; }
      }
      for (let z = 0; z < nz; z++) for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
        expect(P.aoCountGrid(grid, nx, ny, nz, x, y, z), `${x},${y},${z}`).toBe(P.aoCount(map, x, y, z));
      }
    }
  });
});

describe('dig sound', () => {
  function installFakeAudio() {
    const nodes = [];
    const param = () => { const pr = { value: 0, targets: [], setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime(v) { pr.targets.push(v); }, cancelScheduledValues() {} }; return pr; };
    const node = (kind, extra) => { const n = Object.assign({ kind, to: [], connect(x) { n.to.push(x); }, start() { n.started = true; }, stop() { n.stopped = true; } }, extra); nodes.push(n); return n; };
    class FakeAC {
      constructor() { this.currentTime = 0; this.sampleRate = 8000; this.destination = {}; this.state = 'running'; }
      createBuffer(ch, len, rate) { const data = new Float32Array(len); return { sampleRate: rate, getChannelData: () => data }; }
      createBufferSource() { return node('noise', { buffer: null, loop: false }); }
      createBiquadFilter() { return node('filter', { type: '', frequency: param(), Q: param() }); }
      createGain() { return node('gain', { gain: param() }); }
      createOscillator() { return node('osc', { type: '', frequency: param() }); }
      createDelay() { return node('delay', { delayTime: param() }); }
    }
    window.AudioContext = FakeAC; window.StemLab.audioContext = undefined;
    P.sfx.reset();
    return nodes;
  }
  beforeEach(() => { P.sfx.setMuted(false); try { localStorage.removeItem('alloflow-global-muted'); } catch (e) {} });

  it('every mineable material in every scene has its own hardness voice', () => {
    const labels = new Set();
    let mineable = 0;
    P.scenes().forEach((id) => {
      P.sceneMaterials(id).forEach(({ key, type }) => {
        const profile = P.fpMiningProfile(key, type);
        if (profile.mineable) { mineable++; labels.add(profile.label); }
      });
    });
    expect(mineable).toBeGreaterThan(30);                                    // the loop really visited the 7 palettes
    expect([...labels].sort()).toEqual(['Crystalline', 'Dense', 'Hard', 'Layered', 'Loose']);
    labels.forEach((label) => { expect(P.digSound(label), label).toBeTruthy(); expect(P.digSound(label).band).toBeGreaterThan(0); });
    // softer rock sounds lower; crystalline rock rings
    expect(P.digSound('Loose').band).toBeLessThan(P.digSound('Layered').band);
    expect(P.digSound('Layered').band).toBeLessThan(P.digSound('Hard').band);
    expect(P.digSound('Crystalline').ring).toBeGreaterThan(0);
    expect(P.digSound('Loose').ring).toBe(0);
  });

  it('a strike builds a noise grain, and a ringing tone only for crystalline rock', () => {
    const nodes = installFakeAudio();
    P.sfx.strike('Loose');
    const loose = nodes.splice(0);
    expect(loose.some((n) => n.kind === 'noise' && n.started)).toBe(true);
    expect(loose.filter((n) => n.kind === 'osc')).toHaveLength(1);            // the thud only
    P.sfx.strike('Crystalline');
    expect(nodes.filter((n) => n.kind === 'osc').map((n) => n.type)).toEqual(['triangle']);   // the ring, no thud
  });

  it('the tool mute and the app-wide mute both silence it completely', () => {
    const nodes = installFakeAudio();
    P.sfx.setMuted(true);
    P.sfx.strike('Hard'); P.sfx.crumble('Hard', 1); P.sfx.chip('Hard'); P.sfx.denied('hazard'); P.sfx.drill(true, 'Hard', 0.5);
    expect(nodes).toHaveLength(0);
    P.sfx.setMuted(false);
    localStorage.setItem('alloflow-global-muted', 'true');
    P.sfx.strike('Hard'); P.sfx.drill(true, 'Hard', 0.5);
    expect(nodes).toHaveLength(0);
    expect(P.sfx.drillVoice()).toBeNull();
  });

  it('every sound goes through one bus whose echo follows how deep underground the explorer is', () => {
    const nodes = installFakeAudio();
    P.sfx.strike('Hard'); P.sfx.step('Layered');
    const bus = P.sfx.bus();
    expect(bus && bus.input && bus.wet).toBeTruthy();
    expect(nodes.filter((n) => n.kind === 'delay')).toHaveLength(1);                 // one bus, not one per sound
    const voices = nodes.filter((n) => n.kind === 'gain' && n !== bus.input && n !== bus.wet && !n.to.some((x) => x && x.kind === 'delay'));
    expect(voices.length).toBeGreaterThan(2);
    voices.forEach((g) => expect(g.to).toContain(bus.input));                        // never straight to the speakers
    expect(bus.wet.gain.value).toBe(0);                                             // daylight: dry
    P.sfx.setEcho(1); expect(bus.wet.gain.targets.slice(-1)[0]).toBeCloseTo(0.45, 6);
    const calls = bus.wet.gain.targets.length; P.sfx.setEcho(0.995); expect(bus.wet.gain.targets.length).toBe(calls);   // tiny changes are ignored
    P.sfx.setEcho(0); expect(bus.wet.gain.targets.slice(-1)[0]).toBe(0);
  });

  it('footsteps are voiced by the rock underfoot; a hard landing thumps; climbing scrapes', () => {
    const nodes = installFakeAudio();
    P.sfx.step('Loose'); const soft = nodes.splice(0);
    expect(soft.filter((n) => n.kind === 'osc')).toHaveLength(0);
    expect(soft.some((n) => n.kind === 'filter' && n.type === 'lowpass')).toBe(true);
    P.sfx.step('Hard', 1.8); const land = nodes.splice(0);
    expect(land.filter((n) => n.kind === 'osc')).toHaveLength(1);
    P.sfx.step('Hard', 1, true); const scrape = nodes.splice(0);
    expect(scrape.some((n) => n.kind === 'filter' && n.type === 'bandpass')).toBe(true);
    expect(scrape.filter((n) => n.kind === 'osc')).toHaveLength(0);
  });

  it('water: a harder fall splashes with more bubbles; a flooding hole gurgles; both through the bus', () => {
    const nodes = installFakeAudio();
    P.sfx.splash(0.3); const soft = nodes.splice(0);
    P.sfx.splash(1.5); const hard = nodes.splice(0);
    const oscs = (list) => list.filter((n) => n.kind === 'osc').length;
    expect(oscs(soft)).toBeGreaterThan(0);
    expect(oscs(hard)).toBeGreaterThan(oscs(soft));
    P.sfx.seep(); const seep = nodes.splice(0);
    expect(oscs(seep)).toBeGreaterThan(1);
    expect(seep.some((n) => n.kind === 'noise')).toBe(true);
    const bus = P.sfx.bus();
    const voices = [...soft, ...hard, ...seep].filter((n) => n.kind === 'gain' && n !== bus.input && n !== bus.wet && !n.to.some((x) => x && x.kind === 'delay'));
    expect(voices.length).toBeGreaterThan(4);
    voices.forEach((g) => expect(g.to).toContain(bus.input));
  });

  it('water sounds are wired: entering water by falling splashes, and the first flood gurgles', () => {
    const src = fs.readFileSync(sourcePath, 'utf8');
    expect(src).toMatch(/fp\.medium === 'fluid' && mediumBefore !== 'fluid' && -entryVy > VOXEL \* 1\.5\)[\s\S]{0,260}geoSfxSplash\(-entryVy \/ FP_JUMP_SPEED\)/);
    expect(src).toMatch(/onGroundwater: function \(\) \{[^}]*geoSfxSeep\(\);[^}]*\}/);   // inside the handler, however long its message
  });

  it('the drill hum is one looping voice, reused while held and stopped on release', () => {
    const nodes = installFakeAudio();
    P.sfx.drill(true, 'Layered', 0.1);
    const first = nodes.length;
    P.sfx.drill(true, 'Layered', 0.6); P.sfx.drill(true, 'Hard', 0.9);
    expect(nodes.length).toBe(first);                                        // no new nodes per frame
    const voice = P.sfx.drillVoice();
    expect(voice && voice.n.loop).toBe(true);
    P.sfx.drill(false);
    expect(P.sfx.drillVoice()).toBeNull();
    expect(voice.o.stopped && voice.n.stopped).toBe(true);
  });
});

describe('sub-voxel digging', () => {
  let seed = 11;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const S = () => P.DIG_SUB;

  it('a cell mask survives the 16-hex save format, and its state reads intact / dug out / partial', () => {
    expect(S()).toBe(4);
    for (let trial = 0; trial < 20; trial++) {
      const mask = new Uint8Array(64); for (let i = 0; i < 64; i++) mask[i] = rand() < 0.5 ? 1 : 0;
      const hex = P.digMaskHex(mask);
      expect(hex).toMatch(/^[0-9a-f]{16}$/);
      expect(Array.from(P.digMaskFromHex(hex))).toEqual(Array.from(mask));
    }
    expect(P.digCellState(null)).toBe('F');
    expect(P.digCellState(new Uint8Array(64).fill(1))).toBe('F');
    expect(P.digCellState(new Uint8Array(64))).toBe('0');
    const one = new Uint8Array(64).fill(1); one[5] = 0;
    expect(P.digCellState(one)).toMatch(/^[0-9a-f]{16}$/);
  });

  it('a crater stays within its ragged radius, takes the voxel it was aimed at, and only takes rock', () => {
    const cx = 10.3, cy = 6.8, cz = 9.1, r = 1.65;
    const all = P.digCrater(cx, cy, cz, r, () => true);
    all.forEach(([x, y, z]) => { expect(Math.hypot(x + 0.5 - cx, y + 0.5 - cy, z + 0.5 - cz)).toBeLessThanOrEqual(r * 1.2 + 1e-9); });
    expect(all.some(([x, y, z]) => x === 10 && y === 6 && z === 9)).toBe(true);
    const onlyEven = P.digCrater(cx, cy, cz, r, (x) => x % 2 === 0);
    expect(onlyEven.every(([x]) => x % 2 === 0)).toBe(true);
    expect(P.digCrater(cx, cy, cz, r, () => true)).toEqual(all);            // deterministic: same aim, same crater
  });

  it('soft rock goes in bigger, faster bites than hard rock; the drill is quicker and narrower', () => {
    const vol = (label) => P.digCrater(20.5, 20.5, 20.5, P.digStrike(label, 'pick').r, () => true).length;
    expect(vol('Loose')).toBeGreaterThan(vol('Layered'));
    expect(vol('Layered')).toBeGreaterThan(vol('Hard'));
    expect(P.digStrike('Loose', 'pick').ms).toBeLessThan(P.digStrike('Hard', 'pick').ms);
    ['Loose', 'Layered', 'Dense', 'Crystalline', 'Hard'].forEach((label) => {
      const pick = P.digStrike(label, 'pick'), drill = P.digStrike(label, 'drill');
      expect(drill.ms, label).toBeLessThan(pick.ms);
      expect(drill.r, label).toBeLessThan(pick.r);
      expect(pick.r * 2, label).toBeLessThan(P.DIG_SUB * 1.1);                 // a single bite never swallows a whole cell
    });
  });

  it('digging down clears every row of the shaft across the whole footprint', () => {
    const footR = 0.27 * P.DIG_SUB, r = footR + 0.9;                           // FP_RADIUS in small voxels, as the engine uses
    for (let trial = 0; trial < 12; trial++) {
      const cx = 20 + rand() * 4, cz = 30 + rand() * 4, top = 3 + Math.floor(rand() * 5), rows = 1 + Math.floor(rand() * 3);
      const got = new Set(P.digShaft(cx, cz, top, rows, r, () => true).map((g) => g.join(',')));
      for (let gy = top; gy < top + rows; gy++) {
        // each of the capsule's five ground samples must lose its small voxel in every shaft row
        [[0, 0], [footR, 0], [-footR, 0], [0, footR], [0, -footR]].forEach(([ox, oz]) => {
          const key = Math.floor(cx + ox) + ',' + gy + ',' + Math.floor(cz + oz);
          expect(got.has(key), `row ${gy} sample ${ox},${oz}`).toBe(true);
        });
      }
      P.digShaft(cx, cz, top, rows, r, () => true).forEach(([, gy]) => { expect(gy >= top && gy < top + rows).toBe(true); });
    }
  });

  it('the reticle ray finds the first rock, the face it entered, and nothing past its reach', () => {
    const wall = (x) => x >= 10;                                              // solid for gx >= 10
    const hit = P.digRayMarch(2.5, 5.5, 5.5, 1, 0, 0, 20, (x) => wall(x));
    expect(hit.g).toEqual([10, 5, 5]);
    expect(hit.normal).toEqual([-1, 0, 0]);
    expect(hit.t).toBeCloseTo(7.5, 9);
    expect(P.digRayMarch(2.5, 5.5, 5.5, 1, 0, 0, 7, (x) => wall(x))).toBeNull();
    const down = P.digRayMarch(4.5, 0.5, 4.5, 0, 1, 0, 20, (x, y) => y >= 3);     // sub-grid y grows downward
    expect(down.g).toEqual([4, 3, 4]); expect(down.normal).toEqual([0, -1, 0]);
    const diag = P.digRayMarch(0.5, 0.5, 0.5, Math.SQRT1_2, Math.SQRT1_2, 0, 20, (x, y) => x + y >= 6);
    expect(diag.g[0] + diag.g[1]).toBe(6);
    expect(P.digRayMarch(3.2, 3.2, 3.2, 0, 0, 1, 5, () => true).t).toBe(0);    // eye inside rock
  });

  it('folding old history into a snapshot never changes the dug world it replays to', () => {
    const history = [];
    for (let i = 0; i < 230; i++) {
      if (i % 17 === 0) { history.push(`${i % 14},0,${(i * 3) % 14}`); continue; }        // legacy whole-cell ids mixed in
      const id = `${i % 14},${1 + (i % 5)},${(i * 7) % 14}`, before = rand() < 0.3 ? 'F' : P.digMaskHex(new Uint8Array(64).map(() => (rand() < 0.7 ? 1 : 0)));
      const after = rand() < 0.2 ? '0' : P.digMaskHex(new Uint8Array(64).map(() => (rand() < 0.5 ? 1 : 0)));
      history.push({ c: { [id]: [before, after] } });
    }
    const folded = P.digFoldHistory(history, 160, 120);
    expect(folded).toHaveLength(121);
    expect(folded[0].b).toBeTruthy();
    expect(folded.slice(1)).toEqual(history.slice(-120));
    expect(P.digReplay(folded)).toEqual(Object.fromEntries(Object.entries(P.digReplay(history)).filter(([, v]) => v !== 'F')));
    expect(P.digFoldHistory(history.slice(0, 100), 160, 120)).toEqual(history.slice(0, 100));   // under the cap: untouched
  });

  it('a partly-dug mesh that starts empty can still hold a colour for every instance', () => {
    window.THREE = THREE;
    const geo = new THREE.BoxGeometry(1, 1, 1), mat = new THREE.MeshStandardMaterial();
    const plain = new THREE.InstancedMesh(geo, mat, 50); plain.count = 0; plain.setColorAt(0, new THREE.Color(1, 0, 0));
    expect(plain.instanceColor.array.length).toBe(0);                          // the r128 trap: sized from count, not capacity
    const fixed = P.withInstanceColors3d(new THREE.InstancedMesh(geo, mat, 50), 50); fixed.count = 0;
    fixed.setColorAt(40, new THREE.Color(0.2, 0.4, 0.6));
    expect(fixed.instanceColor.array.length).toBe(150);
    expect(Array.from(fixed.instanceColor.array.slice(120, 123)).map((v) => +v.toFixed(2))).toEqual([0.2, 0.4, 0.6]);
    const src = fs.readFileSync(sourcePath, 'utf8');
    expect(src).toMatch(/var subMeshNew3d = withInstanceColors3d\(new THREE\.InstancedMesh\(subGeo3d, mat, capacity3d\), capacity3d\)/);
    expect(src).toMatch(/var debrisMesh3d = withInstanceColors3d\(new THREE\.InstancedMesh\(debrisGeo3d, debrisMat3d, DEBRIS_MAX3d\), DEBRIS_MAX3d\)/);
  });
});

describe('specimens hidden in the rock', () => {
  // Hand-written from the geology (not read back from the tool): where each find really forms.
  const HOSTS = {
    skarnGarnet: ['marble'], quartzVein: ['intrusion'], schistGarnet: ['schist'], summitFossil: ['summitLimestone'],
    amethystPoint: ['amethyst'], agateSlice: ['agate'],
    diamond: ['upperMantle'], mantleOlivine: ['upperMantle'], bridgmanite: ['lowerMantle'],
    eclogiteGarnet: ['slab'], wedgeOlivine: ['wedge'], pumice: ['arcVolcano'],
    sulfideChimney: ['vent'], basaltRecord: ['basaltN', 'basaltR'], oozeMicrofossils: ['sediment'],
    islandOlivine: ['activeVolcano', 'oldIsland'], reefCoral: ['seamount']
  };
  const SCENE_OF = {
    skarnGarnet: 'crust', quartzVein: 'crust', schistGarnet: 'collision', summitFossil: 'collision', amethystPoint: 'geode', agateSlice: 'geode',
    diamond: 'deepEarth', mantleOlivine: 'deepEarth', bridgmanite: 'deepEarth', eclogiteGarnet: 'subduction', wedgeOlivine: 'subduction', pumice: 'subduction',
    sulfideChimney: 'ridge', basaltRecord: 'ridge', oozeMicrofossils: 'ridge', islandOlivine: 'hotspot', reefCoral: 'hotspot'
  };
  const GEN = { crust: 'rockKeyAt', geode: 'geodeKeyAt', deepEarth: 'deepEarthKeyAt', subduction: 'subductionKeyAt', ridge: 'ridgeKeyAt', hotspot: 'hotspotKeyAt', collision: 'collisionKeyAt' };
  const SCENES = Object.keys(GEN), scanned = new Map();
  function scan(sceneId, res) {
    const memo = scanned.get(sceneId + '@' + res); if (memo) return memo;
    P.setScene(sceneId); P.setGrid(res);
    const g = P.grid(), gen = P[GEN[sceneId]], found = [];
    const keyAt = (a, b, c) => (a < 0 || b < 0 || c < 0 || a >= g.NX || b >= g.NY || c >= g.NZ) ? null : gen(a, b, c);
    for (let y = 0; y < g.NY; y++) for (let x = 0; x < g.NX; x++) for (let z = 0; z < g.NZ; z++) {
      const key = gen(x, y, z), s = P.specimenForCell(sceneId, key, x, y, z, keyAt);
      if (s) found.push({ key, x, y, z, s, neighbours: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].map(([dx, dy, dz]) => keyAt(x + dx, y + dy, z + dz)) });
    }
    scanned.set(sceneId + '@' + res, found);
    P.setScene('crust'); P.setGrid('standard');
    return found;
  }
  const at = (sceneId, kind) => scan(sceneId, 'standard').find(({ s }) => s.kind === kind).s;

  it('skarn garnet grows only where the marble touches the granite', () => {
    ['low', 'standard', 'high'].forEach((res) => {
      const skarn = scan('crust', res).filter(({ s }) => s.kind === 'skarnGarnet');
      expect(skarn.length, res).toBeGreaterThan(0);
      skarn.forEach(({ x, y, z, neighbours }) => {
        const touches = neighbours.includes('intrusion');
        expect(touches, `${res} ${x},${y},${z}`).toBe(true);
      });
    });
  }, 60000);

  it('in every scene and detail level, each find sits only in its own host rock, and every kind is findable', () => {
    expect(P.specimenKinds().sort()).toEqual(Object.keys(HOSTS).sort());
    ['low', 'standard', 'high'].forEach((res) => {
      SCENES.forEach((sceneId) => {
        const found = scan(sceneId, res), kinds = new Set(found.map(({ s }) => s.kind));
        found.forEach(({ key, s }) => {
          if (s.crustFossil) { expect(sceneId).toBe('crust'); expect(['sandstone', 'shale', 'limestone']).toContain(key); expect(s.kind).toBe('fossil-' + key); }
          else { expect(SCENE_OF[s.kind], `${res} ${sceneId} ${s.kind}`).toBe(sceneId); expect(HOSTS[s.kind], `${res} ${s.kind}`).toContain(key); }
        });
        const expected = Object.keys(SCENE_OF).filter((k) => SCENE_OF[k] === sceneId).concat(sceneId === 'crust' ? ['fossil-sandstone', 'fossil-shale', 'fossil-limestone'] : []);
        expected.forEach((k) => expect(kinds.has(k), `${res} ${sceneId}: ${k}`).toBe(true));
      });
    });
  }, 120000);

  it('the collection panel lists exactly what each scene hides, each with a place to look', () => {
    SCENES.forEach((sceneId) => {
      const catalog = P.sceneSpecimenCatalog(sceneId), hidden = new Set(scan(sceneId, 'standard').map(({ s }) => s.kind));
      expect(catalog.length, sceneId).toBeGreaterThanOrEqual(2);
      expect(new Set(catalog.map((c) => c.kind))).toEqual(hidden);
      catalog.forEach((c) => { expect(c.hint, c.kind).toBeTruthy(); expect(c.name, c.kind).toBeTruthy(); });
    });
  }, 60000);

  it('a specimen sits in an inner small voxel, so it cannot show before the cell is dug into', () => {
    for (let x = 0; x < 22; x++) for (let z = 0; z < 22; z += 3) for (let y = 0; y < 19; y += 2) {
      const l = P.specimenSubOf(x, y, z);
      l.forEach((c) => { expect(c).toBeGreaterThanOrEqual(1); expect(c).toBeLessThanOrEqual(P.DIG_SUB - 2); });
      expect(P.specimenSubOf(x, y, z)).toEqual(l);
    }
  }, 60000);

  it('the finds teach where they formed (and avoid the misconceptions the science review flagged)', () => {
    expect(at('crust', 'skarnGarnet').tells).toMatch(/skarn/i);
    expect(at('crust', 'quartzVein').tells).toMatch(/younger than the rock it cuts/i);
    expect(at('collision', 'schistGarnet').tells).toMatch(/regional metamorphism/i); expect(at('collision', 'schistGarnet').tells).toMatch(/without melting/i);
    expect(at('collision', 'summitFossil').tells).toMatch(/millions of years/i);
    expect(at('deepEarth', 'mantleOlivine').tells).toMatch(/solid rock/i);        // the mantle is not molten…
    expect(at('deepEarth', 'mantleOlivine').tells).toMatch(/flows slowly/i);      // …yet it flows (convection)
    expect(at('deepEarth', 'diamond').tells).toMatch(/kimberlite/i);
    expect(at('deepEarth', 'bridgmanite').tells).toMatch(/most common mineral/i);
    expect(at('subduction', 'eclogiteGarnet').tells).toMatch(/without melting/i);  // the slab does not melt
    expect(at('subduction', 'wedgeOlivine').tells).toMatch(/wedge/i);
    expect(at('ridge', 'sulfideChimney').tells).toMatch(/seawater seeps down/i);   // the water is seawater, not magma
    const record = at('ridge', 'basaltRecord');
    expect(record.name).toMatch(/basalt sample/i);
    expect(record.tells).not.toMatch(/lined up/i);                                  // grains do not swing like compass needles
    expect(record.tells).toMatch(/recorded/i);
    expect(at('hotspot', 'reefCoral').tells).toMatch(/reef-building/i);             // deep-sea corals exist
  }, 60000);

  it('ripple marks are never presented as a fossil', () => {
    const sand = at('crust', 'fossil-sandstone');
    expect(sand.name).not.toMatch(/ripple/i);
    expect(sand.tells).toMatch(/ripple marks[^.]*not fossils/i);
  });

  it('the crystal cavern is a gas bubble in old lava, not a dissolved limestone cave', () => {
    P.setScene('geode'); P.setGrid('standard');
    expect(P.geodeKeyAt(0, 0, 0)).toBe('hostBasalt');
    const q = P.quizBanks().geode.items.find((item) => /original hollow/.test(item.q));
    expect(q.opts[q.correct]).toMatch(/gas bubble trapped in cooling lava/i);
    const src = fs.readFileSync(sourcePath, 'utf8');
    expect(src).not.toMatch(/dissolved a VOID in limestone/);
    expect(src).not.toMatch(/Groundwater dissolves a cavity/);
  });
});

describe('underground light', () => {
  it('daylight holds at the surface and fades to full dark a couple of voxels down', () => {
    const V = 1;
    expect(P.undergroundDarkness(0, V)).toBe(0);
    expect(P.undergroundDarkness(0.2, V)).toBe(0);
    expect(P.undergroundDarkness(-3, V)).toBe(0);                                   // above the ground (on a peak or the volcano)
    expect(P.undergroundDarkness(1.3, V)).toBeGreaterThan(0.4); expect(P.undergroundDarkness(1.3, V)).toBeLessThan(0.6);
    expect(P.undergroundDarkness(2.4, V)).toBeCloseTo(1, 9); expect(P.undergroundDarkness(9, V)).toBe(1);
    let last = -1; for (let d = 0; d <= 3; d += 0.1) { const v = P.undergroundDarkness(d, V); expect(v).toBeGreaterThanOrEqual(last); last = v; }
    expect(P.undergroundDarkness(1.3 * 0.64, 0.64)).toBeCloseTo(P.undergroundDarkness(1.3, 1), 9);   // same feel at every detail level
  });
});

describe('climbing out of a dug hole', () => {
  // A shaft 3 deep: ground at y=0 for z<0, the shaft floor at y=-3 for z>=0. Facing -z, the wall is at z=0.
  const B = { eye: 1.55, radius: 0.27, step: 0.55, voxel: 1 };
  const rock = (x, y, z) => y < -3 || (z < 0 && y < 0);
  const tops = (x, z) => (z < 0 ? [0] : [-3]);
  const groundAt = (x, z, maxFeetY) => {           // the engine's rule: highest top under the 5 foot samples, up to a step above
    let best = null;
    for (const [ox, oz] of [[0, 0], [B.radius, 0], [-B.radius, 0], [0, B.radius], [0, -B.radius]]) {
      for (const t of tops(x + ox, z + oz)) if (t <= maxFeetY + B.step && (best == null || t > best)) best = t;
    }
    return best == null ? null : best + B.eye;
  };
  const open = () => false;
  const bounds = { minX: -9, maxX: 9, minZ: -9, maxZ: 9 };
  const at = (feetY, z) => ({ x: 0, y: feetY + B.eye, z });

  it('grips a dug wall half a voxel ahead (where a lip stops the body), but not across open air', () => {
    expect(P.fpClimbGrip(at(-3, 0.5), 0, -1, B, rock)).toBe(true);
    expect(P.fpClimbGrip(at(-3, 0.75), 0, -1, B, rock)).toBe(false);                // out of arm's reach
    expect(P.fpClimbGrip(at(-3, 0.5), 0, 1, B, rock)).toBe(false);                  // facing into the open shaft
    expect(P.fpClimbGrip(at(-1.2, 0.5), 0, -1, B, rock)).toBe(true);                // partway up, still on the face
    expect(P.fpClimbGrip(at(-3, 0.5), 0, -1, B, (x, y, z) => y < -3 || (z < 0 && y < -2.6))).toBe(false);   // a step, walked over
  });

  it('hauls up onto the rim at the nearest spot a foot reaches it, once the rim is within an arm of the feet', () => {
    const to = P.fpMantleTarget(at(-0.9, 0.5), 0, -1, B, bounds, groundAt, open);
    expect(to).not.toBe(null);
    expect(to.y).toBeCloseTo(B.eye, 9);                                             // standing on the ground at y=0
    expect(to.z).toBeCloseTo(0.2, 9);                                               // the first spot whose front foot is on the rim
    expect(P.fpMantleTarget(at(-1.3, 0.5), 0, -1, B, bounds, groundAt, open)).toBe(null);   // still too far below: keep climbing
    expect(P.fpMantleTarget(at(-3, 0.5), 0, 1, B, bounds, groundAt, open)).toBe(null);      // the floor never counts as a rim
  });

  it('moves along to where the body fits under an overhang, and never past the world edge', () => {
    const roof = (x, eyeY, z) => z > -0.2 + 1e-9;
    const to = P.fpMantleTarget(at(-0.9, 0.5), 0, -1, B, bounds, groundAt, roof);
    expect(to.z).toBeCloseTo(-0.2, 9);
    expect(P.fpMantleTarget(at(-0.9, 0.5), 0, -1, B, bounds, groundAt, () => true)).toBe(null);
    const edge = P.fpMantleTarget(at(-0.9, 0.5), 0, -1, B, { minX: -9, maxX: 9, minZ: 0.25, maxZ: 9 }, groundAt, open);
    expect(edge.z).toBeCloseTo(0.25, 9);                                            // the nearest rim spot (0.2) lies past the edge: held at it
  });

  it('the engine climbs rock only, and mantles with its own ground and body tests', () => {
    const src = fs.readFileSync(sourcePath, 'utf8');
    expect(src).toContain('fpClimbGrip(fp.pos, fx, fz, FP_BODY, fpRockSolid)');
    expect(src).toContain('fpMantleTarget(fp.pos, fx, fz, FP_BODY, { minX: -hw, maxX: hw, minZ: -hd, maxZ: hd }, fpGroundEyeY, fpBodyBlocked)');
  });
});

describe('diggable relief (peaks and volcanoes)', () => {
  // a cone 2 tall on a base at y=5, footprint radius 1.5, centred at the origin
  const cone = () => ({ kind: 'cone', x: 0, z: 0, r: 1.5, rTop: 0.2, h: 2, base: 5, crater: 0 });
  const surfaceOf = (rel, prop) => (x, z, cell) => { const p = P.fpPropSurfaceY(prop, x, z); return p == null ? null : Math.min(p, rel.cut[cell]); };

  it('starts uncut, above the whole cone', () => {
    const prop = cone(), rel = P.reliefCreate(prop);
    expect(rel.cut.every((h) => h === rel.top)).toBe(true);
    expect(rel.top).toBeGreaterThan(prop.base + prop.h);
    expect(P.reliefSample(rel, 0, 0)).toBeCloseTo(rel.top, 6);
    expect(P.reliefThroughAt(rel, 0, 0)).toBe(false);
  });

  it('a bite lowers a ragged bowl around the aim point, never below the base', () => {
    const prop = cone(), rel = P.reliefCreate(prop);
    const ch = P.reliefBite(rel, 0, 6.2, 0, 0.5, 0.3);
    expect(ch.length).toBeGreaterThan(4);
    ch.forEach(([i, before, after]) => { expect(after).toBeLessThan(before); expect(after).toBeGreaterThanOrEqual(prop.base); expect(rel.cut[i]).toBe(after); });
    expect(P.reliefSample(rel, 0, 0)).toBeLessThan(6.2 - 0.3);                 // deepest in the middle
    expect(P.reliefSample(rel, 1.2, 0)).toBeCloseTo(rel.top, 6);                 // untouched outside the bowl
    for (let k = 0; k < 20; k++) P.reliefBite(rel, 0, P.reliefSample(rel, 0, 0), 0, 0.5, 0.3);
    expect(Math.min(...rel.cut)).toBeCloseTo(prop.base, 6);                       // dug right down to the base, not past it
    expect(P.reliefThroughAt(rel, 0, 0)).toBe(true);
  });

  it('never slices a slot to the summit when swung at sideways', () => {
    // Each swing lands where a level ray at eye height (aimY) first meets the current surface,
    // coming in from +x, exactly as the reticle does; 14 swings in a row.
    const prop = cone(), aimY = P.fpPropSurfaceY(prop, 1.0, 0);
    const swing = (rel, capped) => {
      const surf = capped ? surfaceOf(rel, prop) : null;
      for (let k = 0; k < 14; k++) {
        let hitX = null;
        for (let x = 1.5; x >= -1.5; x -= 0.01) { const top = Math.min(P.fpPropSurfaceY(prop, x, 0) ?? -1, P.reliefSample(rel, x, 0)); if (top >= aimY) { hitX = x; break; } }
        if (hitX == null) break;
        P.reliefBite(rel, hitX, aimY, 0, 0.4, 0.2, surf, capped ? 0.36 : 0);
      }
      return Math.min(P.fpPropSurfaceY(prop, 0, 0), P.reliefSample(rel, 0, 0));
    };
    const capped = P.reliefCreate(prop);
    expect(swing(capped, true)).toBeCloseTo(P.fpPropSurfaceY(prop, 0, 0), 6);    // the summit keeps its height
    expect(P.reliefSample(capped, 1.0, 0)).toBeLessThan(aimY - 0.2);              // but the flank is scooped
    expect(swing(P.reliefCreate(prop), false)).toBeLessThan(aimY);                 // uncapped, the swings cut through the middle
  });

  it('bites are deterministic and stored to the millimetre (they save and replay exactly)', () => {
    const a = P.reliefCreate(cone()), b = P.reliefCreate(cone());
    const ca = P.reliefBite(a, 0.3, 6, -0.2, 0.45, 0.4), cb = P.reliefBite(b, 0.3, 6, -0.2, 0.45, 0.4);
    expect(ca).toEqual(cb);
    ca.forEach(([, , after]) => expect(Math.round(after * 1000) / 1000).toBeCloseTo(after, 9));
  });

  it('folding old history keeps every dig into a peak (replay gives the same heights)', () => {
    const history = [];
    for (let i = 0; i < 210; i++) {
      if (i % 3 === 0) history.push({ r: i % 4, h: [[i % 50, null, 6 - (i % 7) * 0.1], [(i + 9) % 50, 6.3, 5.5 + (i % 5) * 0.05]] });
      else history.push({ c: { [`${i % 9},1,${i % 7}`]: ['F', '0'] } });
    }
    const folded = P.digFoldHistory(history, 160, 120);
    expect(folded[0].rb).toBeTruthy();
    expect(P.digReliefReplay(folded)).toEqual(P.digReliefReplay(history));
    expect(P.digReplay(folded)).toEqual(Object.fromEntries(Object.entries(P.digReplay(history)).filter(([, v]) => v !== 'F')));
    const again = P.digFoldHistory(folded.concat(history.slice(0, 60)), 160, 120);  // folding a fold keeps it too
    expect(P.digReliefReplay(again)).toEqual(P.digReliefReplay(folded.concat(history.slice(0, 60))));
  });

  it('relief strikes never masquerade as voxel digs in the history', () => {
    expect(P.digReplay([{ r: 2, h: [[0, null, 5], [1, null, 5.2]] }])).toEqual({});
    expect(P.digReliefReplay([{ c: { '1,1,1': ['F', '0'] } }, '2,0,2'])).toEqual({});
  });
});

describe('groundwater in the dig', () => {
  it('the water table sits in the sandstone aquifer, above the shale aquitard, at every detail level', () => {
    ['low', 'standard', 'high'].forEach((res) => {
      P.setScene('crust'); P.setGrid(res);
      const g = P.grid(), wy = P.waterTableY(g.NY, g.VOXEL);
      const row = Math.floor(g.NY / 2 - wy / g.VOXEL);                             // the cell row the engine floods at
      expect(P.rockKeyAt(1, row, 1), res).toBe('sandstone');
      let shaleBelow = false; for (let y = row + 1; y < g.NY && !shaleBelow; y++) shaleBelow = P.rockKeyAt(1, y, 1) === 'shale';
      expect(shaleBelow, res).toBe(true);
      expect(P.rockKeyAt(1, row - 1, 1) === 'soil' || P.rockKeyAt(1, row - 1, 1) === 'sandstone', res).toBe(true);   // dry rock above it
    });
    P.setScene('crust'); P.setGrid('standard');
  });
  it('the engine floods at that table and tells the student why, in words', () => {
    const src = fs.readFileSync(sourcePath, 'utf8');
    expect(src).toContain('var WATER_Y = waterTableY(NY, VOXEL);');
    expect(src).toMatch(/fills your hole up to the water table/);
    expect(src).toMatch(/Groundwater seeps out of the sandstone \(an aquifer\)/);
  });
});

describe('field guide: what each find tells you, and how hard it is', () => {
  const ALL_SCENES = ['crust', 'geode', 'deepEarth', 'subduction', 'ridge', 'hotspot', 'collision'];

  it('every find in every scene has a reviewed hardness entry, and no entry is orphaned', () => {
    const catalogKinds = new Set(ALL_SCENES.flatMap((id) => P.sceneSpecimenCatalog(id).map((c) => c.kind)));
    const tableKinds = new Set(Object.keys(P.specimenMohs()));
    expect([...catalogKinds].filter((k) => !tableKinds.has(k))).toEqual([]);
    expect([...tableKinds].filter((k) => !catalogKinds.has(k))).toEqual([]);
    ALL_SCENES.forEach((id) => P.sceneSpecimenCatalog(id).forEach((c) => {
      expect(c.tells, c.kind).toBeTruthy();
      expect(c.hardness && c.hardness.text, c.kind).toBeTruthy();
    }));
  });

  it('compares with a steel pick (~5.5) by the reviewed rule: lowest ≥ 6 harder, highest ≤ 5 softer, else about', () => {
    expect(P.mohsVsSteel([6.5, 7.5])).toBe('harder');
    expect(P.mohsVsSteel([6, 6.5])).toBe('harder');
    expect(P.mohsVsSteel([3, 3])).toBe('softer');
    expect(P.mohsVsSteel([3.5, 4])).toBe('softer');
    expect(P.mohsVsSteel([5, 6])).toBe('about');
    expect(P.mohsVsSteel([5.5, 6])).toBe('about');
    expect(P.mohsVsSteel(null)).toBeNull();
  });

  it('gets the classroom science right', () => {
    const line = (k) => P.mohsLine(k);
    expect(line('diamond').vs).toBe('harder');
    expect(line('quartzVein').text).toMatch(/Quartz: hardness 7 \(Mohs\), harder than steel/);
    expect(line('pumice').vs).toBe('about');                                      // glass walls ~5.5, not "harder than steel"
    expect(line('pumice').text).toMatch(/full of gas holes, not because it is soft/);
    expect(line('sulfideChimney').text).toMatch(/^Pyrite:/);                        // the mineral, not the chimney
    expect(line('fossil-shale').text).toMatch(/Graptolites are a carbon film/);
    expect(line('reefCoral').text).toMatch(/^Calcite: hardness 3/);                 // an old fossil reef is calcite, not aragonite
    expect(line('basaltRecord').vs).toBeNull();                                     // a rock has no single Mohs value
    expect(line('bridgmanite').vs).toBeNull();
    expect(line('bridgmanite').text).toMatch(/stable only at lower-mantle pressure/);
    expect(line('bridgmanite').text).not.toMatch(/exists only/);
  });

  it('the panel says Mohs is a ranking and that hard is not tough (so a slow dig never implies a high number)', () => {
    const src = fs.readFileSync(sourcePath, 'utf8');
    expect(src).toMatch(/a ranking, not a ruler/);
    expect(src).toMatch(/Hard is not the same as tough/);
    expect(src).toMatch(/how fast rock digs depends on how tough and cemented it is/);
  });
});

describe('signs on the rock: a block that still hides a find', () => {
  const ALL_SCENES = ['crust', 'geode', 'deepEarth', 'subduction', 'ridge', 'hotspot', 'collision'];
  // the distinctive word of each find's name; a sign must describe the rock, never name what is inside
  const NAME_WORDS = /garnet|quartz|amethyst|agate|diamond|olivine|bridgmanite|eclogite|pumice|pyrite|sulfide|magnet|plankton|ooze|trilobite|graptolite|brachiopod|crinoid|plant/i;
  it('every find has a sign, and no sign names the find', () => {
    ALL_SCENES.forEach((id) => P.sceneSpecimenCatalog(id).forEach((c) => {
      const sign = P.specimenSign(c.kind);
      expect(sign, c.kind).toBeTruthy();
      expect(sign.toLowerCase(), c.kind).not.toContain(c.name.toLowerCase());
      expect(sign, c.kind).not.toMatch(NAME_WORDS);
    }));
  });
  it('an unknown or future find still gets a sensible sign', () => {
    expect(P.specimenSign('fossil-newlayer')).toMatch(/fossil traces/);
    expect(P.specimenSign('somethingNew')).toMatch(/glints/);
  });
});

describe('your digs: each descent saved as a column', () => {
  const crustDig = [
    { key: 'soil', name: 'Soil / Regolith', depthKm: 0 }, { key: 'sandstone', name: 'Sandstone', depthKm: 0.9 },
    { key: 'shale', name: 'Shale', depthKm: 2.7 }, { key: 'limestone', name: 'Limestone', depthKm: 4.5 }
  ];
  it('lists the layers top to bottom with their depths', () => {
    expect(P.digLogSummary(crustDig, 'crust')).toMatch(/^Soil \/ Regolith \(≈ 0 km\) → Sandstone \(≈ 0\.9 km\) → Shale \(≈ 2\.7 km\) → Limestone \(≈ 4\.5 km\)/);
  });
  it('reads superposition only where it applies: two or more sedimentary layers in the crust', () => {
    expect(P.digLogSummary(crustDig, 'crust')).toMatch(/formed first.*superposition/);
    expect(P.digLogSummary(crustDig.slice(0, 2), 'crust')).not.toMatch(/superposition/);   // one sedimentary layer is not a sequence
    expect(P.digLogSummary([{ key: 'crust', name: 'Crust', depthKm: 10 }, { key: 'upperMantle', name: 'Upper mantle', depthKm: 200 }], 'deepEarth')).not.toMatch(/superposition/);
    expect(P.digLogSummary(crustDig, 'collision')).not.toMatch(/superposition/);     // thrust stacks can put older rock on top
  });
  it('the journal saves a descent when first person ends, and keeps the last four', () => {
    const src = fs.readFileSync(sourcePath, 'utf8');
    expect(src).toContain('if (fpShaftLog.length > 1) saveDigLog(scene, fpShaftLog);');
    expect(src).toMatch(/all\[sceneId\] = \(all\[sceneId\] \|\| \[\]\)\.slice\(-3\)\.concat\(\[entry\]\)/);
  });
});

describe('eclogite forms only deep in the sinking slab', () => {
  it('every eclogite garnet sits at least 50 km down (true cell depth), at every detail level, and some remain', () => {
    ['low', 'standard', 'high'].forEach((res) => {
      P.setScene('subduction'); P.setGrid(res);
      const g = P.grid(), keyAt = (a, b, c) => (a < 0 || b < 0 || c < 0 || a >= g.NX || b >= g.NY || c >= g.NZ) ? null : P.subductionKeyAt(a, b, c);
      let placed = 0;
      for (let x = 0; x < g.NX; x++) for (let y = 0; y < g.NY; y++) for (let z = 0; z < g.NZ; z++) {
        const s = P.specimenForCell('subduction', P.subductionKeyAt(x, y, z), x, y, z, keyAt);
        if (s && s.kind === 'eclogiteGarnet') { placed++; expect((y + 0.5) * g.KM_PER_VOXEL, `${res} row ${y}`).toBeGreaterThanOrEqual(50); }
      }
      expect(placed, res).toBeGreaterThan(5);
    });
    P.setScene('crust'); P.setGrid('standard');
  }, 60000);
});

describe('field-guide progress across the seven worlds', () => {
  const SCENE_IDS = ['crust', 'geode', 'deepEarth', 'subduction', 'ridge', 'hotspot', 'collision'];
  it('starts empty, with every world counted', () => {
    const expectedTotal = SCENE_IDS.reduce((n, id) => n + P.sceneSpecimenCatalog(id).length, 0);
    const pr = P.findsProgress({});
    expect(pr.found).toBe(0);
    expect(pr.total).toBe(expectedTotal);
    expect(Object.keys(pr.byScene).sort()).toEqual([...SCENE_IDS].sort());
    SCENE_IDS.forEach((id) => expect(pr.byScene[id].complete, id).toBe(false));
  });
  it('counts a kind once however many were dug, and knows when a world is complete', () => {
    const geode = P.sceneSpecimenCatalog('geode').map((c) => c.kind);
    const pr = P.findsProgress({ geode: { [geode[0]]: 5 }, ridge: { oozeMicrofossils: 1, notARealFind: 3 } });
    expect(pr.byScene.geode).toEqual({ found: 1, total: geode.length, complete: false });
    expect(pr.byScene.ridge.found).toBe(1);                                          // unknown kinds are ignored
    const all = P.findsProgress({ geode: Object.fromEntries(geode.map((k) => [k, 1])) });
    expect(all.byScene.geode.complete).toBe(true);
    expect(all.found).toBe(geode.length);
  });
  it('the completion message fires only on the find that completes a world', () => {
    const src = fs.readFileSync(sourcePath, 'utf8');
    expect(src).toMatch(/if \(firstOfKind && progressNow && progressNow\.complete\)/);
    expect(src).toMatch(/you dug free every find this world hides/);
  });
});

describe('mirror', () => {
  it('keeps both app mirrors identical', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  }, 60000);
});
