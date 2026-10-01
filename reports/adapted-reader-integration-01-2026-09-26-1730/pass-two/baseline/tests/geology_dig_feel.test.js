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
    const param = () => { const pr = { value: 0, targets: [], sets: [], setValueAtTime(v, at) { pr.sets.push([v, at]); }, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime(v) { pr.targets.push(v); }, cancelScheduledValues() {} }; return pr; };
    const node = (kind, extra) => { const n = Object.assign({ kind, to: [], connect(x) { n.to.push(x); }, start(at) { n.started = true; n.startAt = at; }, stop() { n.stopped = true; } }, extra); nodes.push(n); return n; };
    class FakeAC {
      constructor() { this.currentTime = 0; this.sampleRate = 8000; this.destination = {}; this.state = 'running'; }
      createBuffer(ch, len, rate) { const data = new Float32Array(len); return { sampleRate: rate, getChannelData: () => data }; }
      createBufferSource() { return node('noise', { buffer: null, loop: false }); }
      createBiquadFilter() { return node('filter', { type: '', frequency: param(), Q: param() }); }
      createGain() { return node('gain', { gain: param() }); }
      createOscillator() { return node('osc', { type: '', frequency: param() }); }
      createDelay() { return node('delay', { delayTime: param() }); }
      createStereoPanner() { return node('panner', { pan: param() }); }
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

  it('near molten rock a low rumble swells: one looping voice, louder closer, gone at a distance or on mute', () => {
    const nodes = installFakeAudio();
    P.sfx.rumble(0.3); const first = nodes.splice(0);
    const v = P.sfx.rumbleVoice();
    expect(v).toBeTruthy();
    expect(first.filter((n) => n.kind === 'noise' && n.loop)).toHaveLength(1);
    expect(first.some((n) => n.kind === 'filter' && n.type === 'lowpass' && n.frequency.value <= 200)).toBe(true);   // felt more than heard
    expect(v.g.to).toContain(P.sfx.bus().input);
    const quiet = v.g.gain.targets.slice(-1)[0];
    P.sfx.rumble(0.9); expect(nodes.splice(0)).toHaveLength(0);                     // the same voice, not a new one
    expect(v.g.gain.targets.slice(-1)[0]).toBeGreaterThan(quiet * 3);
    P.sfx.rumble(0); expect(v.n.stopped && v.o.stopped).toBe(true); expect(P.sfx.rumbleVoice()).toBe(null);
    P.sfx.rumble(0.8); expect(P.sfx.rumbleVoice()).toBeTruthy();
    P.sfx.setMuted(true); P.sfx.rumble(0.8); expect(P.sfx.rumbleVoice()).toBe(null);   // mute silences it at once
  });

  it('the survey pulse pings toward its target: panned that way, higher above, lower below, a later echo when farther', () => {
    const nodes = installFakeAudio();
    const ping = (d, pan, v) => { nodes.length = 0; P.sfx.surveyPing(d, pan, v); return nodes.splice(0); };
    const oscs = (l) => l.filter((n) => n.kind === 'osc');
    const echoGap = (l) => oscs(l)[1].startAt - oscs(l)[0].startAt;
    const near = ping(2, 0.8, 'above you'), far = ping(12, -0.6, 'below you'), level = ping(5, 0, 'near your level');
    expect(oscs(near)).toHaveLength(2);                                             // the ping, then its echo
    expect(near.find((n) => n.kind === 'panner').pan.value).toBeCloseTo(0.8, 9);
    expect(far.find((n) => n.kind === 'panner').pan.value).toBeCloseTo(-0.6, 9);
    const pitch = (l) => oscs(l)[0].frequency.sets[0][0];
    expect(pitch(near)).toBeGreaterThan(pitch(level)); expect(pitch(level)).toBeGreaterThan(pitch(far));
    expect(echoGap(far)).toBeGreaterThan(echoGap(near) + 0.4);                      // 10 blocks further: the echo comes back later
    const panner = near.find((n) => n.kind === 'panner'), bus = P.sfx.bus();
    expect(panner.to).toContain(bus.input);
    const voices = near.filter((n) => n.kind === 'gain' && n !== bus.input && n !== bus.wet && !n.to.some((x) => x && x.kind === 'delay'));   // not the bus's own gains
    expect(voices).toHaveLength(2);
    voices.forEach((g) => expect(g.to).toContain(panner));
    P.sfx.setMuted(true); expect(ping(3, 0, 'below you')).toHaveLength(0);
  });

  it('every survey pulse pings, panned from where the view faced before it turns', () => {
    const src = fs.readFileSync(sourcePath, 'utf8');
    expect(src).toMatch(/function fpSurveyMark\(cell, wp, distanceSq, now\) \{[\s\S]{0,2000}geoSfxSurveyPing\(reading\.distanceBlocks, -Math\.sin\(dYaw\), reading\.vertical\);/);
  });

  it('the rumble follows the heat warning, and stops on leaving first person, unmount and mute', () => {
    const src = fs.readFileSync(sourcePath, 'utf8');
    expect(src).toMatch(/var level = Math\.round\(fpHazardProximity\([^)]*\) \* 20\) \/ 20;\s*geoSfxRumble\(level\);/);
    expect(src).toMatch(/if \(!fp\.active \|\| fp\.mode !== 'mine'\) \{ if \(heatVignette\) heatVignette\.style\.opacity = '0'; geoSfxRumble\(0\); return; \}/);
    expect(src).toMatch(/fpCancelMining\(\); geoSfxDrill\(false\); geoSfxRumble\(0\);/);
    expect(src).toMatch(/exitFP\(true\); \} catch \(e\) \{\}[^\n]*\n\s*geoSfxDrill\(false\); geoSfxRumble\(0\);/);
    expect(src).toContain('if (mute) { geoSfxDrill(false); geoSfxRumble(0); }');
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

  it('one-button climb: faces the nearest rock face; among equal faces, the one needing the least turn', () => {
    const P0 = { x: 0, y: -3 + B.eye, z: 0 };
    const box = (x, y, z) => y < -3 || ((Math.abs(x) > 0.5 || Math.abs(z) > 0.5) && y < 0);     // a square shaft, walls 0.5 away
    const facing = (yaw) => P.fpClimbOutHeading(P0, yaw, B, box, 3);
    expect(facing(0).yaw).toBeCloseTo(0, 9);                                        // already facing a wall: no turn
    expect(facing(Math.PI / 2 + 0.2).yaw).toBeCloseTo(Math.PI / 2, 9);              // the wall nearest the view
    expect(facing(-Math.PI / 2 - 0.2).yaw).toBeCloseTo(3 * Math.PI / 2, 9);         // wraps round, not the long way
    expect(facing(0).distance).toBeCloseTo(0.52, 9);                                // first probe past the 0.5 face
    const off = { x: 0, y: -3 + B.eye, z: 0.15 };                                   // nearer the +z wall (0.35) than the others
    expect(P.fpClimbOutHeading(off, 0, B, box, 3).yaw).toBeCloseTo(Math.PI, 9);     // turns right round to the NEAREST face
    expect(P.fpClimbOutHeading(off, 0, B, box, 3).distance).toBeCloseTo(0.37, 9);
  });

  it('one-button climb: finds a far wall across a wide pit, but not one out of range or across open ground', () => {
    const P0 = { x: 0, y: -3 + B.eye, z: 0 };
    const pit = (x, y, z) => y < -3 || (x > 2.5 && y < 0);                           // one wall, 2.5 away to +x
    expect(P.fpClimbOutHeading(P0, 0, B, pit, 3).yaw).toBeCloseTo(3 * Math.PI / 2, 9);   // yaw 3π/2 faces +x
    expect(P.fpClimbOutHeading(P0, 0, B, pit, 2)).toBe(null);
    expect(P.fpClimbOutHeading(P0, 0, B, (x, y) => y < -3, 3)).toBe(null);
    expect(P.fpClimbOutHeading(P0, 0, B, (x, y, z) => y < -3 || (z < -0.5 && y < -2.6), 3)).toBe(null);   // a step, not a wall
  });

  it('one-button climb: only ever a grid direction (at an angle the 5-point body slips into the wall and wedges)', () => {
    const P0 = { x: 0, y: -3 + B.eye, z: 0 };
    const corner = (x, y, z) => y < -3 || (x < -0.4 && z < -0.4 && y < 0);         // rock only off the diagonal
    expect(P.fpClimbOutHeading(P0, 5 * Math.PI / 4, B, corner, 3)).toBe(null);
    let seed = 11;
    const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let n = 0; n < 40; n++) {                                                  // lopsided shafts, any starting view
      const w = [0.35 + rand(), 0.35 + rand(), 0.35 + rand(), 0.35 + rand()];
      const shaft = (x, y, z) => y < -3 || ((x < -w[0] || x > w[1] || z < -w[2] || z > w[3]) && y < 0);
      const h = P.fpClimbOutHeading(P0, rand() * 6.28, B, shaft, 3);
      expect(h).not.toBe(null);
      expect(Math.abs(Math.sin(h.yaw * 2))).toBeLessThan(1e-9);                   // a multiple of 90 degrees
    }
  });

  it('the one-button climb is wired: C and the 🧗 button, the same physics, handed back on any key, cleared by H', () => {
    const src = fs.readFileSync(sourcePath, 'utf8');
    expect(src).toContain('fpClimbOutHeading(fp.pos, fp.yaw, FP_BODY, fpRockSolid, VOXEL * 3)');
    expect(src).toMatch(/fp\.climbAssist = \{[^}]*\};\s*fp\.input\.fwd = 1; fp\.input\.strafe = 0; fp\.input\.jump = true;/);   // drives the SAME inputs as keys
    expect(src).toMatch(/if \(!\(fp\.input\.fwd > 0 && fp\.input\.jump\)\) fp\.climbAssist = null;/);                           // a key press takes over
    expect(src).toMatch(/fp\.climbAssist\.elapsed \+= dt;[\s\S]{0,160}fp\.climbAssist\.elapsed > 12\) fpEndClimbAssist\('gave-up'\)/);   // play time, not wall time
    expect(src).toMatch(/if \(fp\.climbAssist && fp\.onGround && holeDepthNow < VOXEL \* 0\.3\) fpEndClimbAssist\('out'\)/);  // out = on the surface
    expect(src).toMatch(/function fpRespawn\(home\) \{\s*if \(fp\.climbAssist\) \{ fp\.climbAssist = null;/);
    expect(src).toMatch(/key === 'c' && fpExplorerMode\(scene\) === 'mine'\)[\s\S]{0,80}climbOutAction\(\);/);
    expect(src).toMatch(/\(fpWalkScene && !rigDeployed && fpInHole\) \? h\('button', \{ type: 'button', 'data-geology-climb-out': 'true', onClick: function \(\) \{ fpAction\('climb-out'\); \}/);
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

describe('measuring the tilt of a layer (strike and dip)', () => {
  // A synthetic block: grid y runs DOWN; 'air' above the layer, 'sand' 3 thick, 'shale' below.
  const block = (topAt) => (x, y, z) => {
    if (x < 0 || y < 0 || z < 0 || x >= 21 || y >= 34 || z >= 21) return null;
    const top = topAt(x, z);
    return y < top ? 'air' : (y < top + 3 ? 'sand' : 'shale');
  };
  const near = (a, b, tol) => Math.abs(((a - b + 540) % 360) - 180) <= tol;

  it('flat layers measure flat', () => {
    const t = P.fpLayerTilt(block(() => 10), 10, 11, 10);
    expect(t.dip).toBeCloseTo(0, 9); expect(t.rms).toBeCloseTo(0, 9); expect(t.surface).toBe('top');
  });

  it('a layer rising to the east dips west; one rising to the north dips south (even stair-stepped)', () => {
    const east = P.fpLayerTilt(block((x) => 20 - Math.floor(0.5 * x)), 10, 16, 10);
    expect(east.dip).toBeGreaterThan(26.57 - 3); expect(east.dip).toBeLessThan(26.57 + 3);
    expect(near(east.dipBearing, 270, 10)).toBe(true);
    expect(P.fpCompassWord(east.dipBearing)).toBe('west');
    const north = P.fpLayerTilt(block((x, z) => 6 + Math.round(Math.tan(Math.PI / 6) * z)), 10, 13, 10);
    expect(north.dip).toBeGreaterThan(27); expect(north.dip).toBeLessThan(33);
    expect(P.fpCompassWord(north.dipBearing)).toBe('south');
    expect(north.rms).toBeLessThan(0.5);
  });

  it('a fold has no single tilt; a lone cell has too little to measure; a top at the land surface falls back to the base', () => {
    const fold = P.fpLayerTilt(block((x) => 10 + Math.abs(x - 10)), 10, 11, 10);
    expect(fold.rms).toBeGreaterThan(0.75);
    expect(P.fpLayerTilt((x, y, z) => (x === 5 && y === 5 && z === 5 ? 'sand' : (x >= 0 && x < 11 && y >= 0 && y < 11 && z >= 0 && z < 11 ? 'air' : null)), 5, 5, 5)).toBe(null);
    const toTop = (x, y, z) => (x < 0 || y < 0 || z < 0 || x >= 21 || y >= 34 || z >= 21) ? null : (y <= 15 - Math.floor(0.5 * x) ? 'sand' : 'shale');
    const base = P.fpLayerTilt(toTop, 10, 5, 10);
    expect(base.surface).toBe('base');
    expect(P.fpCompassWord(base.dipBearing)).toBe('west');
    expect(base.dip).toBeGreaterThan(23);
  });

  it('only layered rock is measured: layers, the sinking slab, collision foliation; not plutons, magma, cones or baked rock', () => {
    expect(P.fpTiltKind('crust', 'Sedimentary')).toBe('layer');
    expect(P.fpTiltKind('subduction', 'Subducting plate')).toBe('slab');
    expect(P.fpTiltKind('collision', 'Metamorphic')).toBe('foliation');
    expect(P.fpTiltKind('crust', 'Metamorphic')).toBe(null);                          // marble and hornfels baked by the pluton
    expect(P.fpTiltKind('ridge', 'Igneous (extrusive)')).toBe('layer');
    expect(P.fpTiltKind('hotspot', 'Igneous (extrusive)')).toBe(null);               // a volcano cone
    ['Igneous (intrusive)', 'Molten', 'Surface', 'Water', 'Mantle (rigid)'].forEach((type) => expect(P.fpTiltKind('crust', type)).toBe(null));
  });

  it('in the worlds themselves: crust layers lie flat, the subducting slab dives steeply one way, collision rock is tilted', () => {
    P.setGrid('standard');
    const g = P.grid();
    const measureAll = (id, gen) => {
      P.setScene(id);
      const keyAt = (x, y, z) => (x < 0 || y < 0 || z < 0 || x >= g.NX || y >= g.NY || z >= g.NZ) ? null : gen(x, y, z);
      const types = Object.fromEntries(P.sceneMaterials(id).map((m) => [m.key, m.type]));
      const out = {};
      for (let x = 0; x < g.NX; x += 2) for (let z = 0; z < g.NZ; z += 2) for (let y = 0; y < g.NY; y++) {
        const k = keyAt(x, y, z); if (!P.fpTiltKind(id, types[k])) continue;
        const t = P.fpLayerTilt(keyAt, x, y, z); if (t) (out[k] = out[k] || []).push(t);
      }
      return out;
    };
    const median = (arr) => arr.map((t) => t.dip).sort((a, b) => a - b)[Math.floor(arr.length / 2)];
    const crust = measureAll('crust', P.rockKeyAt);
    ['sandstone', 'shale', 'limestone'].forEach((k) => { expect(crust[k].length).toBeGreaterThan(20); crust[k].forEach((t) => expect(t.dip).toBeLessThan(1)); });
    const sub = measureAll('subduction', P.subductionKeyAt);
    expect(median(sub.slab)).toBeGreaterThan(30);
    expect(new Set(sub.slab.filter((t) => t.dip > 10).map((t) => P.fpCompassWord(t.dipBearing))).size).toBe(1);   // one way: under the other plate
    const col = measureAll('collision', P.collisionKeyAt);
    ['foldedStrata', 'schist', 'gneiss'].forEach((k) => expect(median(col[k])).toBeGreaterThan(10));
  });

  it('the engine measures the ORIGINAL rock at the reticle, draws the fitted plane, and explains what the tilt means', () => {
    const src = fs.readFileSync(sourcePath, 'utf8');
    expect(src).toContain('var tilt = fpLayerTilt(function (x, y, z) { var c = cellAt(x, y, z); return c ? c.key : null; }, v.x, v.y, v.z);');
    expect(src).toContain('tiltPlane3d.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(-tilt.a, 1, -tilt.b).normalize());');
    expect(src).toContain('folded: tilt.rms > 0.75, flat: tilt.dip < 4 };');                 // the thresholds the pure tests calibrate
    expect(src).toMatch(/key === 't' && fpExplorerMode\(scene\) === 'mine'\)[\s\S]{0,80}measureTiltAction\(\);/);
    expect(src).toContain("else if (name === 'tilt') result = measureTiltAction();");
    expect(src).toMatch(/'data-geology-measure-tilt': 'true', onClick: function \(\) \{ fpAction\('tilt'\); \}/);
    expect(src).toMatch(/'stem\.geology\.sr\.tilt_flat', '[^']*as it was laid down/);                 // original horizontality
    expect(src).toMatch(/'stem\.geology\.sr\.tilt_tilted', '[^']*tilted after it formed/);
    expect(src).toMatch(/'stem\.geology\.sr\.tilt_slab', '[^']*diving beneath the other plate/);
  });
});

describe('the first-person HUD keeps every control clickable', () => {
  // A browser audit found the science card drawn OVER the action column (Home unclickable at every
  // width; undo, redo and the rig too once the column grew). These pin the stacking and placement.
  it('controls draw above the science card, which sits beside the column and below the middle of the view', () => {
    const src = fs.readFileSync(sourcePath, 'utf8');
    expect(src).toContain("'data-geology-mining-actions': 'true', className: 'absolute right-2 top-14 flex flex-col gap-1', style: { zIndex: 20, flexWrap: 'wrap-reverse', alignContent: 'flex-start', maxHeight: 'calc(100% - 64px)' }");
    expect(src).toContain("'data-geology-science-card': 'true', style: { maxWidth: 'min(220px, 48%)', maxHeight: '50%', overflowY: 'auto' }, className: 'absolute bottom-2 right-14 z-10 ");
    ['data-geology-mining-target', 'data-geology-mining-progress-shell', 'data-geology-key-legend', 'data-geology-key-legend-toggle'].forEach((attr) => {
      // (the key legend's style is Object.assign({ zIndex: 20 }, beside-the-card offsets))
      expect(src).toMatch(new RegExp("'" + attr + "': 'true',[^{}]{0,120}style: (Object\\.assign\\()?\\{ zIndex: 20 \\}"));
    });
  });
});

describe('the compass ribbon', () => {
  it('bearings run clockwise from north, where the view faces', () => {
    expect(P.fpBearingOfYaw(0)).toBeCloseTo(0, 9);
    expect(P.fpBearingOfYaw(-Math.PI / 2)).toBeCloseTo(90, 9);
    expect(P.fpBearingOfYaw(Math.PI)).toBeCloseTo(180, 9);
    expect(P.fpBearingOfYaw(Math.PI / 2)).toBeCloseTo(270, 9);
    expect(P.fpBearingOfYaw(7 * Math.PI)).toBeCloseTo(180, 6);                    // any number of turns
    [[1, 0, 90], [0, 1, 180], [-1, 0, 270], [0, -1, 0]].forEach(([dx, dz, b]) => expect(P.fpBearingTo(dx, dz)).toBeCloseTo(b, 9));
  });

  it('agrees with the compass words the survey speaks (its "east" is the ribbon\'s E)', () => {
    const src = fs.readFileSync(sourcePath, 'utf8');
    const rule = "direction: Math.abs(deltaX) > Math.abs(deltaZ) ? (deltaX >= 0 ? 'east' : 'west') : (deltaZ >= 0 ? 'south' : 'north'),";
    expect(src).toContain(rule);                                                    // the rule below is the survey's own
    const word = (dx, dz) => (Math.abs(dx) > Math.abs(dz) ? (dx >= 0 ? 'east' : 'west') : (dz >= 0 ? 'south' : 'north'));
    const at = { north: 0, east: 90, south: 180, west: 270 };
    let seed = 5;
    const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff * 2 - 1; };
    for (let i = 0; i < 400; i++) {
      const dx = rand(), dz = rand(), b = P.fpBearingTo(dx, dz), off = Math.abs(((b - at[word(dx, dz)] + 540) % 360) - 180);
      expect(off).toBeLessThanOrEqual(45 + 1e-9);
    }
  });

  it('is visual only, and the engine moves it every frame', () => {
    const src = fs.readFileSync(sourcePath, 'utf8');
    expect(src).toContain("h('div', { 'data-geology-compass': 'true', 'aria-hidden': 'true',");
    expect(src).toContain('fpUpdatePlayerStatus(); fpUpdateCompass();');
    expect(src).toMatch(/compassEls3d\.strip\.style\.transform = 'translateX\(' \+ \(-bearing \* COMPASS_PX_PER_DEG\)/);
    expect(src).toMatch(/style: \{ left: \(deg \* 1\.5\) \+ 'px' \}/);                     // marks placed at the SAME scale the engine slides by
    expect(src).toContain('COMPASS_PX_PER_DEG = 1.5');
  });

  it('steps aside when the view is too narrow for it (measured, not guessed from the window width)', () => {
    const src = fs.readFileSync(sourcePath, 'utf8');
    expect(src).toContain("root.querySelectorAll('[data-geology-view-buttons], [data-geology-tool-selector], [data-geology-fullscreen-toggle]')");
    expect(src).toContain("compassEls3d.ribbon.style.visibility = clear ? '' : 'hidden';");
    expect(src).toContain("h('div', { 'data-geology-view-buttons': 'true', className: 'absolute top-2 left-2 z-10 flex gap-1' },");
  });
});

describe('surveying for hidden finds outside a Field Run', () => {
  let src, body;
  beforeAll(() => {
    src = fs.readFileSync(sourcePath, 'utf8');
    body = src.slice(src.indexOf('function fpSurveyFind()'), src.indexOf('function updateSurveyMarker3d'));
  });

  it('G and 📡 survey for the nearest hidden find instead of refusing, and a Field Run keeps its own survey', () => {
    expect(src).toContain('if (!entry || !entry.active) return surveyHiddenFind();');
    expect(src).not.toContain("'Start a Field Run before using the specimen survey.'");
    expect(src).toMatch(/\(!rigDeployed && sceneFindCatalog\.length && !\(fieldBook && fieldBook\.byScene && fieldBook\.byScene\[scene\] && fieldBook\.byScene\[scene\]\.active\)\) \? h\('button', \{ type: 'button', 'data-geology-find-survey': 'true', onClick: function \(\) \{ fpAction\('survey'\); \}/);
    expect(src).toContain('var targetKey = contract && contract.targets ? contract.targets[(entry.collected || []).length] : null;');   // the run survey is untouched
  });

  it('only finds still in the rock, in this cutaway and this moment in time, count', () => {
    expect(body.length).toBeGreaterThan(400);
    expect(body).toContain('if (sp.taken || sp.cell.z >= NZ - sliceZ || formedAt > showStage) continue;');
    expect(body).toMatch(/if \(distanceSq < nearestDistanceSq\) \{ nearest = sp;/);                        // the NEAREST
  });

  it('the reading gives the host rock, the sign, how far and which way, never what the find is', () => {
    expect(body).toContain('hostName: host.name, sign: specimenSign(nearest.info.kind, geoT)');
    expect(body).not.toMatch(/\.info\.name|SPECIMENS\[|FOSSILS\[|fieldSpecimenName/);
    const reading = src.match(/'stem\.geology\.sr\.survey_find_reading', '([^']+)'/);
    expect(reading).not.toBe(null);
    expect(reading[1]).toMatch(/\{host\}/); expect(reading[1]).toMatch(/\{sign\}/); expect(reading[1]).not.toMatch(/\{name\}|\{kind\}/);
  });

  it('the rock-type survey still reports the same reading after sharing the aim-and-mark step', () => {
    expect(src).toContain('return Object.assign({ key: key, name: material.name, found: true }, fpSurveyMark(nearest, nearestWorld, nearestDistanceSq, now));');
    expect(src).toMatch(/function fpSurveyMark\(cell, wp, distanceSq, now\) \{[\s\S]{0,1600}distanceBlocks: Math\.max\(1, Math\.round\(Math\.sqrt\(distanceSq\) \/ VOXEL\)\),[\s\S]{0,200}direction:[\s\S]{0,200}vertical:/);
  });
});

describe('what the app actually says (registered strings win over the code)', () => {
  // The app's t() returns the ui_strings.js value whenever the key is registered, so a fallback
  // edited in the code never reaches an English user. Resolve text the way the app does.
  let reg, src;
  beforeAll(() => { reg = JSON.parse(fs.readFileSync(path.join(root, 'ui_strings.js'), 'utf8')); src = fs.readFileSync(sourcePath, 'utf8'); });
  const registered = (key) => key.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), reg);
  const appT = (key, fallback) => { const v = registered(key); return typeof v === 'string' && v !== key ? v : fallback; };

  it('walk mode speaks and shows the walking controls, not the older flight text', () => {
    expect(src).toContain("fpExplorerMode(scene) === 'mine' ? t('stem.geology.fp_on_walk', fpInstructions) : t('stem.geology.fp_on', fpInstructions)");
    const legend = src.match(/fpWalkScene \? t\('stem\.geology\.fp_keys_walk', '([^']+)'\)/);
    expect(legend).not.toBe(null);
    const shown = appT('stem.geology.fp_keys_walk', legend[1]);
    expect(shown).toBe(legend[1]);
    expect(shown).toMatch(/walk/); expect(shown).not.toMatch(/\bfly\b|Q E/);
    const walkText = src.match(/\? '(Mine mode on\. W A S D[^']+)'/)[1];            // the walking instructions in the code
    const spoken = appT('stem.geology.fp_on_walk', walkText);
    expect(spoken).toBe(walkText);                                                  // registered (09-24) AS the walking text
    expect(spoken).toMatch(/walk/); expect(spoken).not.toMatch(/Q and E|\bfly\b/);
  });

  it('no registered stem.geology string hides a changed fallback (two known, harmless exceptions)', () => {
    const drift = [];
    const re = /\bt\(\s*'(stem\.geology\.[A-Za-z0-9_.]+)'\s*,\s*'((?:[^'\\]|\\.)*)'/g;
    let m, checked = 0;
    while ((m = re.exec(src))) {
      const v = registered(m[1]); if (typeof v !== 'string') continue;
      checked++;
      if (v !== m[2].replace(/\\'/g, "'")) drift.push(m[1]);
    }
    expect(checked).toBeGreaterThan(60);                                          // the scan really saw the registered calls
    expect(drift.sort()).toEqual(['stem.geology.fp_keys', 'stem.geology.schematic_note']);   // flight legend (brief but right); a dash vs hyphen
  });

  it('a registered key never takes a fallback that varies (one key cannot say two things)', () => {
    const varying = [];
    const re = /\bt\(\s*'(stem\.geology\.[A-Za-z0-9_.]+)'\s*,\s*(?![\s'"])/g;       // [\s] too, or \s* backtracks onto the quote
    let m;
    while ((m = re.exec(src))) if (typeof registered(m[1]) === 'string') varying.push(m[1]);
    // fp_on: flight mode only; fp_on_walk: walk mode only, its variable IS the walking text (checked above);
    // quiz_title: the crust only, whose bank title IS the registered text
    expect([...new Set(varying)].sort()).toEqual(['stem.geology.fp_on', 'stem.geology.fp_on_walk', 'stem.geology.quiz_title']);
  });

  it('each world titles its own quiz (not every world "relative dating")', () => {
    const banks = [...src.matchAll(/^\s{4}(\w+):\s*\{ title: '(Test yourself[^']+)'/gm)].map((b) => ({ id: b[1], title: b[2] }));
    expect(banks.length).toBe(7);
    const shown = banks.map((b) => appT(b.id === 'crust' ? 'stem.geology.quiz_title' : 'stem.geology.quiz_title_' + b.id, b.title));
    banks.forEach((b, i) => expect(shown[i], b.id).toBe(b.title));
    expect(new Set(shown).size).toBe(7);
    expect(src).toContain("var quizTitle = SCENE.id === 'crust' ? t('stem.geology.quiz_title', _bank.title) : t('stem.geology.quiz_title_' + SCENE.id, _bank.title);");
    expect(src).toContain("'🧠 ' + quizTitle");
    expect(src).not.toContain('Relative dating quiz');                           // the region label read "relative dating" in every world
  });
});

describe('mirror', () => {
  it('keeps both app mirrors identical', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  }, 60000);
});

// Visual pass (09-24): the walk-mode sky, the orbit view's light pool, and view buttons that frame the
// model the same way at every detail level.
describe('sky, stage light and camera framing', () => {
  const src = fs.readFileSync(sourcePath, 'utf8');
  it('walk mode gets a gradient sky that follows the camera, dims underground and restores the orbit fog', () => {
    expect(src).toContain('var sky3d = new THREE.Mesh(skyGeo3d, skyMat3d);');
    expect(src).toContain("var skyMat3d = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false });");
    expect(src).toContain('sky3d.position.copy(camera.position);');
    expect(src).toContain('skyMat3d.color.setScalar(1 - 0.88 * underground3d);');
    expect(src).toContain("fogBaseColor3d.setHex(0x0a1322); scene.fog.color.copy(fogBaseColor3d);");   // leaving walk mode: dark studio fog again
    expect(src).toContain('try { updateSky3d(); } catch (e) {}');
  });
  it('the orbit view sits the block on a light pool, but not in first person or under the round Earth', () => {
    expect(src).toContain("contactShadow3d.visible = !fp.active && SCENE.id !== 'deepEarth';");
    expect(src).toContain('scene.remove(contactShadow3d); shadowGeo3d.dispose(); shadowMat3d.dispose(); shadowTex3d.dispose();');
  });
  it('view buttons use world units, not voxel counts (High detail used to shrink the model ~1.6x)', () => {
    const setView = src.slice(src.indexOf('eng.setView = function'), src.indexOf('eng.setSlice = function'));
    expect(setView).toContain('WORLD.w * 1.15 * isoSideX3d * k');
    expect(setView).not.toMatch(/\bN[XYZ] \*/);
  });
});
