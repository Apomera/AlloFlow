/**
 * The moonwalk, against the Apollo 11 site and the physics of walking in one-sixth g.
 *
 * The horizon carried 1-2 km massifs (the valley walls of Apollo 15 and 17, not the
 * flat Sea of Tranquility); stars shone in full daylight; the Sun was a soft glow five
 * degrees wide; samples were glowing crystals; and the suit walked at 1.25 m/s, above
 * the speed where a person on the Moon changes from walking to loping.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Overridable so a mutation can run against a COPY; other sessions edit this file.
const FILE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';
const src = readFileSync(FILE, 'utf8');
let P;
beforeEach(() => { resetStemLab(); loadTool(FILE, 'moonMission'); P = window.MoonMissionPure; });

const g = 1.62, L = 0.9;

describe('moonwalk gait', () => {
  it('walks under the Froude walk-run switch and lopes well above it', () => {
    // People change from walking to running near Froude number v^2 / (g L) = 0.5.
    const G = P.evaGait();
    expect(G.switchSpeed, 'the lunar switch speed').toBeCloseTo(Math.sqrt(0.5 * g * L), 9);
    expect(G.switchSpeed).toBeGreaterThan(0.8);
    expect(G.switchSpeed).toBeLessThan(0.9);
    expect(Math.sqrt(0.5 * 9.81 * L), 'the same switch on Earth').toBeGreaterThan(2);
    expect(G.walk, 'a walk is a walk').toBeLessThan(G.switchSpeed);
    expect(G.walk).toBeGreaterThan(G.switchSpeed * 0.8);
    expect(G.lope * G.lope / (g * L), 'a lope is a bounding gait').toBeGreaterThan(1);
  });

  it('pushes off and brakes no harder than boot-on-regolith friction allows', () => {
    const G = P.evaGait();
    expect(G.grip, 'mu g').toBeCloseTo(0.9 * g, 9);
    expect(G.brake, 'mu g').toBeCloseTo(0.9 * g, 9);
    // So a stop from the lope takes v^2 / (2 mu g), nearly two metres.
    expect(G.lope * G.lope / (2 * G.brake)).toBeGreaterThan(1.6);
  });

  it('tells weight from mass on the cuff, and names the gait from the switch speed', () => {
    expect(src).toMatch(/var MM_EVA_MASS = 166,/);
    expect(src).toContain("like ' + Math.round(MM_EVA_MASS * MM_EVA_GAIT.g / 9.81) + ' kg");
    expect(Math.round(166 * g / 9.81), '166 kg in one-sixth g').toBe(27);
    expect(src).toContain("gaitV > MM_EVA_GAIT.switchSpeed ? 'Lope' : 'Walk'");
  });
});

describe('the Apollo 11 horizon', () => {
  it('has no mountains: the distant relief barely lifts the skyline', () => {
    const F = P.lunarField(false), R = 1737400, eye = 1.8;
    let highest = -90;
    F.massifs.forEach((m) => {
      const d = Math.hypot(m.x, m.z);
      expect(d).toBeGreaterThan(6500);
      // Highest point of the ridge, seen from eye height, against the true horizon.
      let top = 0;
      for (let a = 0; a < 16; a++) for (let t = 0; t <= 1; t += 0.05) {
        const x = m.x + Math.cos(a * Math.PI / 8) * m.r * t, z = m.z + Math.sin(a * Math.PI / 8) * m.r * t;
        top = Math.max(top, F.massifHeight(m, x, z));
      }
      expect(top, 'a ridge (100-300 m), not a massif (700-1,900 m)').toBeLessThan(350);
      const elev = Math.atan((top - d * d / (2 * R) - eye) / d) * 180 / Math.PI;
      highest = Math.max(highest, elev);
    });
    expect(highest, 'degrees above level, at most').toBeLessThan(2);
    expect(highest, 'but some relief does show').toBeGreaterThan(0.3);
  });
});

describe('the sky of a sunlit moonwalk', () => {
  it('draws the Sun as a hard disc under a degree across, not a glow', () => {
    expect(src).toContain('var sunSpan = 2 * 170 * Math.tan(4 * Math.PI / 180);');
    const disc = src.match(/var discR = 128 \* ([\d.]+) \/ 8;/);
    expect(disc, 'disc radius in the 8-degree sprite').toBeTruthy();
    const diameterDeg = Number(disc[1]);
    expect(diameterDeg, 'real Sun 0.53 degrees').toBeGreaterThanOrEqual(0.53);
    expect(diameterDeg).toBeLessThanOrEqual(1);
  });

  it('blooms only what glares, and hides the stars until the eye is off the ground', () => {
    expect(src).toMatch(/UnrealBloomPass\([^;]*, 0\.35, 1\.0\)\);/);
    expect(src).toContain('vertexColors: true, depthWrite: false, toneMapped: false, transparent: true, opacity: 0 });');
    expect(src).toContain('var starGround = Math.max(0, Math.min(1, 0.5 - starPitchTan / (2 * Math.tan(camera.fov * Math.PI / 360))));');
    expect(src).toContain('var starWant = mmSmooth(0.3, 0.02, starGround) * (1 - mmSmooth(0.55, 0.85, _starFwd.dot(_sunDir)));');
  });
});

describe('bootprints', () => {
  it('are Apollo prints: a 33 x 14 cm depression, a ribbed floor, a rim of pushed-up soil', () => {
    // They were flat dark rectangles at 30% opacity.
    const M = P.bootprintMaps(64, 128), at = (i, j) => M.height[j * 64 + i];
    const W = 0.2, L = 0.38, ground = at(0, 0);
    // The print's extent, from where the alpha is solid.
    let x0 = 64, x1 = -1, y0 = 128, y1 = -1;
    for (let j = 0; j < 128; j++) for (let i = 0; i < 64; i++) {
      if (at(i, j) < ground - 0.1) { x0 = Math.min(x0, i); x1 = Math.max(x1, i); y0 = Math.min(y0, j); y1 = Math.max(y1, j); }
    }
    const width = (x1 - x0 + 1) / 64 * W, length = (y1 - y0 + 1) / 128 * L;
    expect(length, 'print length (m)').toBeGreaterThan(0.3);
    expect(length).toBeLessThan(0.36);
    expect(width, 'print width (m)').toBeGreaterThan(0.12);
    expect(width).toBeLessThan(0.16);
    // A depression, with the sole's transverse bars ribbing its floor.
    expect(at(32, 64), 'floor below the ground').toBeLessThan(ground - 0.2);
    let bars = 0;
    for (let j = y0 + 3; j < y1 - 3; j++) if (at(32, j) > at(32, j - 1) && at(32, j) >= at(32, j + 1)) bars++;
    expect(bars, 'tread bars along the floor').toBeGreaterThanOrEqual(11);
    expect(bars).toBeLessThanOrEqual(14);
    // A low rim just outside the wall, and a soft edge where the decal meets the ground.
    let rim = 0;
    for (let i = x1 + 1; i < 64; i++) rim = Math.max(rim, at(i, 64));
    expect(rim, 'rim above the ground').toBeGreaterThan(ground + 0.03);
    expect(M.alpha[64 * 64 + 32], 'solid inside').toBe(1);
    expect(M.alpha[0], 'clear at the decal corner').toBe(0);
  });

  it('share the ground\'s lunar shading and regolith, so there is no seam, and take shadows', () => {
    const prints = src.slice(src.indexOf('var EVA_BOOTPRINT_CAP'), src.indexOf('function emitEvaBootprint('));
    expect(prints).toMatch(/mmLunarShade\(THREE, new THREE\.MeshStandardMaterial\(\{[\s\S]*?map: terrainTex, bumpMap: evaPrintHeightTex[\s\S]*?alphaMap: evaPrintAlphaTex[\s\S]*?\}\), 'print', _evaLowPower\)/);
    expect(prints).toContain('evaBootprints.receiveShadow = true;');
    // Only the ground swaps the bump for world-space regolith; a print keeps its own relief.
    expect(src).toContain("if (kind === 'ground') {   // a 'print' keeps the standard UV bump: its own relief");
    expect(src).toContain('evaPrintHeightTex.dispose(); evaPrintAlphaTex.dispose();');
  });
});

describe('your own shadow', () => {
  it('is the whole suited figure, helmet and backpack included, not a pair of legs', () => {
    // The upper body sat on layer 1 for the shadow camera; three r128's shadow pass draws
    // only the main camera's layers, so it cast nothing and the Sun threw two legs.
    expect(src).not.toMatch(/layers\.set\(1\)/);
    expect(src).not.toMatch(/shadow\.camera\.layers\.enable\(1\)/);
    const body = src.slice(src.indexOf('var suitShadowOnly'), src.indexOf('scene.add(suitGroup);', src.indexOf('var suitShadowOnly')));
    expect(body).toContain('new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })');
    expect(body).toContain('.forEach(function (m) { if (m) m.material = suitShadowOnly; });');
    for (const part of ['shadowHelmet', 'shadowOps', 'shadowArm', 'shadowHips']) {
      expect(body, part).toMatch(new RegExp('var ' + part + ' = new THREE\\.Mesh\\([^;]*, suitShadowOnly\\);'));
    }
    // The helmet sits at the eye, so the figure stands its full height (eye at 1.8 m).
    const helmet = body.match(/shadowHelmet\.position\.set\(0, (-?[\d.]+), /);
    expect(Number(helmet[1]), 'helmet centre near the eye').toBeGreaterThan(-0.15);
    // Every shadow part must cast after it is added, or it is never drawn at all.
    expect(body.lastIndexOf('n.castShadow = !_evaLowPower')).toBeGreaterThan(body.lastIndexOf('suitGroup.add('));
    expect(src).toContain('suitShadowOnly.dispose();');
  });

  it('gathers a tight glow round the helmet: the opposition effect\'s narrow core', () => {
    // Shadow hiding brightens the regolith over several degrees round the anti-solar point;
    // coherent backscatter adds a much tighter core, about a degree across.
    const broad = src.match(/float surge = 1\.0 \+ uLunarOpp \/ \(1\.0 \+ tg \/ ([\d.]+)\);/);
    const core = src.match(/surge \+= uLunarCbs \/ \(1\.0 \+ tg \/ ([\d.]+)\);/);
    expect(broad && core, 'both surge terms in the lunar shader').toBeTruthy();
    const hwhm = (w) => 2 * Math.atan(Number(w)) * 180 / Math.PI;   // tg = tan(phase / 2)
    expect(hwhm(core[1]), 'core half-width (deg)').toBeLessThan(2);
    expect(hwhm(broad[1]) / hwhm(core[1]), 'core far narrower than the broad surge').toBeGreaterThan(4);
    const amp = src.match(/shader\.uniforms\.uLunarCbs = \{ value: rock \? ([\d.]+) : ([\d.]+) \};/);
    expect(Number(amp[2]), 'the ground shows it').toBeGreaterThan(0.2);
    expect(src).toContain('uniform float uLunarCbs;');
  });
});

describe('dust in a vacuum', () => {
  const grid = (f) => { for (let a = 0; a <= 20; a++) for (let b = 0; b <= 4; b++) for (let c = 0; c <= 4; c++) f(a / 20, b / 4, c / 4); };
  const apex = (up) => up * up / (2 * g);

  it('a rolling wheel throws a rooster tail: steep grains, still moving forward, about a metre high at 11 km/h', () => {
    // Grains flew back at 0.2-0.4 m/s and rose 5 cm, whatever the speed.
    const v = 11 / 3.6;
    let top = 0;
    grid((u1, u2) => {
      const d = P.dustGrain('tread', v, u1, u2, 0);
      // It leaves at the tread's own speed: v relative to the hub, when rolling without slip.
      expect(Math.hypot(d.fwd - v, d.up), 'tread speed = rim speed').toBeCloseTo(v, 9);
      expect(d.fwd, 'over the ground a grain still moves forward').toBeGreaterThanOrEqual(0);
      expect(d.fwd, 'but slower than the rover, so it streams behind').toBeLessThan(v);
      expect(Math.abs(d.side)).toBeLessThan(0.1 * v);
      top = Math.max(top, apex(d.up));
    });
    expect(top, 'the tallest arcs (m)').toBeGreaterThan(0.8);
    expect(top).toBeLessThan(1.4);
    let crawl = 0;
    grid((u1, u2) => { crawl = Math.max(crawl, apex(P.dustGrain('tread', 1, u1, u2, 0).up)); });
    expect(crawl, 'at walking pace the spray stays low').toBeLessThan(0.15);
  });

  it('a toe-off kicks a fan ahead; a landing splashes low and all round', () => {
    const quads = new Set();
    grid((u1, u2, u3) => {
      const k = P.dustGrain('kick', 2.3, u1, u2, u3);
      expect(k.fwd, 'kicked ahead').toBeGreaterThan(0);
      expect(Math.abs(k.side) / k.fwd, 'within about 30 degrees of the stride').toBeLessThan(Math.tan(0.51));
      expect(apex(k.up)).toBeLessThan(0.7);
      const range = 2 * k.up / g * k.fwd;
      expect(range, 'lands within a few strides').toBeLessThan(3.5);
      const s = P.dustGrain('splash', 1.7, u1, u2, u3);
      expect(apex(s.up), 'a landing splash stays low').toBeLessThan(0.2);
      if (Math.hypot(s.fwd, s.side) > 1e-6) quads.add((s.fwd >= 0 ? 'f' : 'b') + (s.side >= 0 ? 'r' : 'l'));
    });
    expect(quads.size, 'splash goes all round').toBe(4);
    let reach = 0;
    grid((u1, u2, u3) => { const k = P.dustGrain('kick', 2.3, u1, u2, u3); reach = Math.max(reach, 2 * k.up / g * k.fwd); });
    expect(reach, 'the longest kicks land a stride or more ahead (m)').toBeGreaterThan(1);
  });

  it('every grain flies until it lands, and the pool outlasts the spray at top speed', () => {
    // A timer used to retire grains after about half a second, in mid-air.
    const lives = src.match(/lrvDustLife\[dustI\] = [^;]+;/g);
    expect(lives.length).toBe(2);
    for (const l of lives) expect(l, 'a backstop longer than the flight').toMatch(/= 2 \* (grain|dustGrain)\.up \/ 1\.62 \+ 1;$/);
    expect(src).toContain("var dustGrain = mmDustGrain('tread', Math.abs(roverSpeed), lrvDustRand(), lrvDustRand(), 0);");
    expect(src).toContain("emitDustGrains('kick', playerPos.x, playerPos.z, evaVel.x / evaSpdH, evaVel.z / evaSpdH,");
    expect(src).toContain("emitDustGrains('splash', x, z, forwardX, forwardZ, 1 + 1.5 * strength, count, 0.24);");
    // Drawn at all: the pool's bounding sphere is computed once, around the idle grains
    // parked 100 m underground, so a culled pool vanished whenever that point was off-screen.
    const pts = src.indexOf('var lrvDust = new THREE.Points(lrvDustGeo, lrvDustMat);');
    expect(src.slice(pts, src.indexOf('scene.add(lrvDust);', pts))).toContain('lrvDust.frustumCulled = false;');
    // Grains in the air at once, driving flat out without slip, must fit the pool, or a
    // grain in flight is recycled and jumps back to a wheel.
    const pool = src.match(/var LRV_DUST_COUNT = _evaLowPower \? (\d+) : (\d+);/);
    const rate = src.match(/\(_evaLowPower \? ([\d.]+) : ([\d.]+)\) \* \(1 \+ lrvSlipSignal \* 2\.2\)/);
    const top = 6.2;
    let flight = 0, n = 0;
    for (let a = 0; a <= 200; a++) { flight += 2 * P.dustGrain('tread', top, a / 200, 0.5, 0).up / g; n++; }
    flight /= n;
    expect(Number(rate[2]) * top * flight, 'aloft at once').toBeLessThan(Number(pool[2]) / 1.5);
    expect(Number(rate[1]) * top * flight, 'aloft at once, low power').toBeLessThan(Number(pool[1]));
  });
});

describe('the ground at your feet', () => {
  // The shader's own lunarTexB, run in JavaScript: its declaration lines and its return
  // expression are lifted from the source, with vec2 as {x, y}.
  const body = src.slice(src.indexOf('float lunarTexB(vec2 uv) {'), src.indexOf('float lunarBumpH(vec2 p) {'));
  const glsl = [...body.matchAll(/'([^']*)\\n'/g)].map((m) => m[1]).join('\n');
  const decls = [...glsl.matchAll(/vec2 ([^;]+);/g)].map((m) => 'let ' + m[1].replace(/floor\(/g, 'Math.floor(') + ';');
  const names = ['g0', 'g1', 'h0', 'h1'];
  const axis = new Function('uv', 'uLunarBumpRes', decls.join('\n') + '\nreturn [' + names.join(', ') + '];');
  const ret = glsl.slice(glsl.indexOf('return ') + 7, glsl.lastIndexOf(';'))
    .replace(/texture2D\(bumpMap, ([^)]*\)?)\)\.x/g, 'T($1)').replace(/vec2\(/g, 'V(');
  const combine = new Function('g0', 'g1', 'h0', 'h1', 'T', 'V', 'return ' + ret + ';');
  const V = (x, y) => ({ x, y });
  const R = 16;
  const texel = (tex, i, j) => tex[((j % R) + R) % R][((i % R) + R) % R];
  const bilinear = (tex) => (p) => {   // GL_LINEAR with repeat: texel centres at (k + 0.5) / R
    const sx = p.x * R - 0.5, sy = p.y * R - 0.5, i = Math.floor(sx), j = Math.floor(sy), fx = sx - i, fy = sy - j;
    return (1 - fy) * ((1 - fx) * texel(tex, i, j) + fx * texel(tex, i + 1, j)) + fy * ((1 - fx) * texel(tex, i, j + 1) + fx * texel(tex, i + 1, j + 1));
  };
  const shader = (tex, u, v) => {
    const [gx0, gx1, hx0, hx1] = axis(u, R), [gy0, gy1, hy0, hy1] = axis(v, R);
    return combine(V(gx0, gy0), V(gx1, gy1), V(hx0, hy0), V(hx1, hy1), bilinear(tex), V);
  };
  const B = [(t) => (1 - t) ** 3 / 6, (t) => (4 - 6 * t * t + 3 * t ** 3) / 6, (t) => (1 + 3 * t + 3 * t * t - 3 * t ** 3) / 6, (t) => t ** 3 / 6];
  const bspline = (tex, u, v) => {     // the definition: 4 x 4 texels, cubic B-spline weights
    const sx = u * R - 0.5, sy = v * R - 0.5, i = Math.floor(sx), j = Math.floor(sy);
    let s = 0;
    for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) s += B[a](sx - i) * B[b](sy - j) * texel(tex, i - 1 + a, j - 1 + b);
    return s;
  };
  const rng = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const tex = Array.from({ length: R }, () => Array.from({ length: R }, rng));

  it('filters the relief with a cubic B-spline from four bilinear taps', () => {
    expect(decls.length, 'the shader declarations were found').toBeGreaterThanOrEqual(5);
    for (let k = 0; k < 200; k++) {
      const u = rng() * 3 - 1, v = rng() * 3 - 1;
      expect(shader(tex, u, v)).toBeCloseTo(bspline(tex, u, v), 9);
    }
    expect(src).toContain("shader.uniforms.uLunarBumpRes = { value: (mat.bumpMap && mat.bumpMap.image && mat.bumpMap.image.width) || 512 };");
    expect(src).toContain("return lunarTexB(p * 0.29)' +");
    expect(src).toContain("' + 1.6 * lunarTexB(mat2(0.8, -0.6, 0.6, 0.8) * p * 0.083 + 0.21)'");
  });

  it('so its slope does not jump at texel edges, where bilinear facets did', () => {
    // Bump shading follows the slope; a jump at every texel edge drew a 2 cm checkerboard.
    // Compare the slope just either side of a texel centre, at two gaps. A true jump stays
    // the same size as the gap shrinks; a smooth slope still bends (curvature x gap, about
    // 0.05 at a 1e-4 gap on this 16-texel tile), so its change shrinks with the gap.
    const slope = (f, u, v) => (f(u + 1e-8, v) - f(u - 1e-8, v)) / 2e-8;
    const jumps = (e) => {
      let jumpShader = 0, jumpBilinear = 0;
      const r = (() => { let s = 11; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
      for (let k = 0; k < 40; k++) {
        const u = (Math.floor(r() * R) + 0.5) / R, v = r();   // a texel centre: bilinear's slope changes there
        jumpShader = Math.max(jumpShader, Math.abs(slope((a, b) => shader(tex, a, b), u + e, v) - slope((a, b) => shader(tex, a, b), u - e, v)));
        jumpBilinear = Math.max(jumpBilinear, Math.abs(slope((a, b) => bilinear(tex)(V(a, b)), u + e, v) - slope((a, b) => bilinear(tex)(V(a, b)), u - e, v)));
      }
      return { jumpShader, jumpBilinear };
    };
    const wide = jumps(1e-4), narrow = jumps(1e-5);
    expect(wide.jumpBilinear, 'bilinear jumps (the facets)').toBeGreaterThan(1);
    expect(narrow.jumpBilinear, 'and its jump does not shrink with the gap').toBeGreaterThan(0.9 * wide.jumpBilinear);
    expect(narrow.jumpShader, 'the shader has no jump').toBeLessThan(0.01);
    expect(narrow.jumpShader, 'its slope only bends, so the change shrinks with the gap').toBeLessThan(0.2 * wide.jumpShader);
  });
});

describe('samples on the ground', () => {
  it('are rocks (and a core tube), one look per sample, none of them glowing', () => {
    const table = src.slice(src.indexOf('var MM_EVA_SAMPLE_LOOK = ['), src.indexOf('];', src.indexOf('var MM_EVA_SAMPLE_LOOK = [')));
    const looks = table.match(/\{ (tube: true, )?color: 0x[0-9a-f]{6}/g) || [];
    const samples = src.slice(src.indexOf('var LUNAR_SAMPLES_DATA = ['), src.indexOf('];', src.indexOf('var LUNAR_SAMPLES_DATA = [')));
    expect(looks.length).toBe((samples.match(/\{ name: /g) || []).length);
    expect(table).toContain('tube: true');
    const build = src.slice(src.indexOf('var lunarSampleOrbs = [];'), src.indexOf('lunarSampleOrbs.push(orbGroup);'));
    expect(build).not.toMatch(/emissive/);
    expect(build).toContain('MM_EVA_SAMPLE_LOOK[sdi % MM_EVA_SAMPLE_LOOK.length]');
  });
});
