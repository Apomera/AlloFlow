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
const sourcePath = path.join(root, 'stem_lab', 'stem_tool_geologyexplorer.js');
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
    const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} });
    const node = (kind, extra) => { const n = Object.assign({ kind, connect() {}, start() { n.started = true; }, stop() { n.stopped = true; } }, extra); nodes.push(n); return n; };
    class FakeAC {
      constructor() { this.currentTime = 0; this.sampleRate = 8000; this.destination = {}; this.state = 'running'; }
      createBuffer(ch, len, rate) { const data = new Float32Array(len); return { sampleRate: rate, getChannelData: () => data }; }
      createBufferSource() { return node('noise', { buffer: null, loop: false }); }
      createBiquadFilter() { return node('filter', { type: '', frequency: param(), Q: param() }); }
      createGain() { return node('gain', { gain: param() }); }
      createOscillator() { return node('osc', { type: '', frequency: param() }); }
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
  const HOSTS = { skarnGarnet: 'marble', quartzVein: 'intrusion', schistGarnet: 'schist', summitFossil: 'summitLimestone' };
  function scan(sceneId, res) {
    P.setScene(sceneId); P.setGrid(res);
    const g = P.grid(), gen = sceneId === 'crust' ? P.rockKeyAt : P.collisionKeyAt, found = [];
    const keyAt = (a, b, c) => (a < 0 || b < 0 || c < 0 || a >= g.NX || b >= g.NY || c >= g.NZ) ? null : gen(a, b, c);
    for (let y = 0; y < g.NY; y++) for (let x = 0; x < g.NX; x++) for (let z = 0; z < g.NZ; z++) {
      const key = gen(x, y, z), s = P.specimenForCell(sceneId, key, x, y, z, keyAt);
      if (s) found.push({ key, x, y, z, s, keyAt });
    }
    return found;
  }

  it('skarn garnet grows only where the marble touches the granite', () => {
    ['low', 'standard', 'high'].forEach((res) => {
      const skarn = scan('crust', res).filter(({ s }) => s.kind === 'skarnGarnet');
      expect(skarn.length, res).toBeGreaterThan(0);
      skarn.forEach(({ x, y, z, keyAt }) => {
        const touches = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].some(([dx, dy, dz]) => keyAt(x + dx, y + dy, z + dz) === 'intrusion');
        expect(touches, `${res} ${x},${y},${z}`).toBe(true);
      });
    });
  });

  it('each specimen forms only in its own host rock, in every detail level, and every kind is findable', () => {
    ['low', 'standard', 'high'].forEach((res) => {
      const crust = scan('crust', res), collision = scan('collision', res);
      [...crust, ...collision].forEach(({ key, s }) => {
        if (s.crustFossil) { expect(['sandstone', 'shale', 'limestone'], res).toContain(key); expect(s.kind).toBe('fossil-' + key); }
        else expect(key, `${res} ${s.kind}`).toBe(HOSTS[s.kind]);
      });
      const kinds = new Set([...crust, ...collision].map(({ s }) => s.kind));
      ['fossil-sandstone', 'fossil-shale', 'fossil-limestone', 'skarnGarnet', 'quartzVein', 'schistGarnet', 'summitFossil'].forEach((k) => {
        expect(kinds.has(k), `${res}: ${k}`).toBe(true);
      });
    });
    expect(P.specimenKinds().sort()).toEqual(Object.keys(HOSTS).sort());
  });

  it('no other scene hides anything (their rock does not hold these)', () => {
    ['geode', 'deepEarth', 'subduction', 'ridge', 'hotspot'].forEach((id) => {
      ['marble', 'intrusion', 'schist', 'summitLimestone', 'sandstone', 'shale', 'limestone'].forEach((key) => {
        for (let x = 0; x < 6; x++) expect(P.specimenForCell(id, key, x, 3, x)).toBeNull();
      });
    });
  });

  it('a specimen sits in an inner small voxel, so it cannot show before the cell is dug into', () => {
    for (let x = 0; x < 22; x++) for (let z = 0; z < 22; z += 3) for (let y = 0; y < 19; y += 2) {
      const l = P.specimenSubOf(x, y, z);
      l.forEach((c) => { expect(c).toBeGreaterThanOrEqual(1); expect(c).toBeLessThanOrEqual(P.DIG_SUB - 2); });
      expect(P.specimenSubOf(x, y, z)).toEqual(l);
    }
  });

  it('the finds teach where they formed: contact for skarn garnet, regional for schist garnet', () => {
    P.setScene('crust'); P.setGrid('standard');
    const crust = scan('crust', 'standard'), collision = scan('collision', 'standard');
    const skarn = crust.find(({ s }) => s.kind === 'skarnGarnet').s, vein = crust.find(({ s }) => s.kind === 'quartzVein').s;
    const schist = collision.find(({ s }) => s.kind === 'schistGarnet').s, summit = collision.find(({ s }) => s.kind === 'summitFossil').s;
    expect(skarn.tells).toMatch(/skarn/i); expect(skarn.tells).toMatch(/granite/i); expect(skarn.tells).toMatch(/limestone/i);
    expect(schist.tells).toMatch(/regional metamorphism/i); expect(schist.tells).toMatch(/without melting/i);
    expect(vein.tells).toMatch(/younger than the rock it cuts/i);
    expect(summit.tells).toMatch(/sea floor/i); expect(summit.tells).toMatch(/millions of years/i);
  });

  it('ripple marks are never presented as a fossil', () => {
    const sand = scan('crust', 'standard').find(({ s }) => s.kind === 'fossil-sandstone').s;
    expect(sand.name).not.toMatch(/ripple/i);
    expect(sand.tells).toMatch(/ripple marks[^.]*not fossils/i);
  });
});

describe('mirror', () => {
  it('keeps both app mirrors identical', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });
});
