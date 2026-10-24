import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { sliceBetween } from './helpers/anchored_slice.js';

// The 3-D map's planet and truss hardware, checked on the real painter, the
// real r128 Phong shader source and the real geometry builders. The GL suite
// proves the scene renders; these pin what it is supposed to show.
const FILES = ['stem_lab/stem_tool_spacestation.js', 'desktop/web-app/public/stem_lab/stem_tool_spacestation.js'];
// The tool files use CRLF; anchors below are written with LF.
// Read once per file: each copy is 2 MB, and per-test re-reads timed out under load.
const cache = new Map();
const read = (file) => { if (!cache.has(file)) cache.set(file, readFileSync(file, 'utf8').replace(/\r\n/g, '\n')); return cache.get(file); };
const source = read(FILES[0]);
const vendor = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendor);
const THREE = vendor.THREE;

// Everything from the land mask to the glow canvas is declarations only, so
// it evaluates on its own. The stub canvas keeps each map's last ImageData.
function stubDocument() {
  return { createElement() {
    const canvas = { width: 0, height: 0, setAttribute() {}, getContext() {
      const ctx = {
        fillStyle: '#000000',
        createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
        putImageData(img) { canvas.img = img; },
        fillRect(x, y, w, h) {
          if (!canvas.img) canvas.img = ctx.createImageData(canvas.width, canvas.height);
          const hex = /^#([0-9a-f]{6})$/i.exec(ctx.fillStyle), rgb = /^rgb\((\d+),(\d+),(\d+)\)$/.exec(ctx.fillStyle);
          const c = hex ? [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)) : rgb.slice(1).map(Number);
          for (let row = Math.max(0, Math.round(y)); row < Math.min(canvas.height, Math.round(y + h)); row++) {
            for (let col = Math.max(0, Math.round(x)); col < Math.min(canvas.width, Math.round(x + w)); col++) {
              const i = (row * canvas.width + col) * 4;
              canvas.img.data[i] = c[0]; canvas.img.data[i + 1] = c[1]; canvas.img.data[i + 2] = c[2]; canvas.img.data[i + 3] = 255;
            }
          }
        }
      };
      return ctx;
    } };
    return canvas;
  } };
}
const helpers = new Function('document',
  sliceBetween(source, '  var ISS_LAND_W = 720', '  function issGlowCanvas()', { label: 'planet helpers' }) +
  '\nreturn { paint: issEarthCanvases, mask: issLandMask, patch: issPatchPlanetLayer, truss: issTrussHardwareGeometry, milkyWay: issMilkyWay, milkyWayCanvas: issMilkyWayCanvas, track: issMapGroundTrack, aurora: issAuroraCanvas, rosa: issRosaCanvas, moon: issMoonCanvas, cupolaView: issCupolaViewCanvas, fbm: issFbm, W: ISS_LAND_W, H: ISS_LAND_H };'
)(stubDocument());

function compiled(kind) {
  const material = helpers.patch(new THREE.MeshPhongMaterial(), kind);
  const shader = { vertexShader: THREE.ShaderLib.phong.vertexShader, fragmentShader: THREE.ShaderLib.phong.fragmentShader, uniforms: {} };
  material.onBeforeCompile(shader);
  return { material, fs: shader.fragmentShader };
}
function between(text, start, end) { return sliceBetween(text, start, end); }
const mapLighting = new Function(sliceBetween(source, '  var ISS_GM =', '  function issTransferPlan(', { label: 'map lighting' }) + '\nreturn issMapLighting;')();
// MODULES entries, as data: id -> { pos, axis }.
const TRUSS_Y = Number(/var ISS_TRUSS_Y = ([\d.]+);/.exec(source)[1]);
const modules = Object.fromEntries([...source.matchAll(/\{ id: '([a-z]+)',[^\n]*?pos: \[([^\]]*)\], size: \[([^\]]*)\], axis: '([xyz])'/g)].map((m) => [m[1], {
  pos: m[2].split(',').map((v) => (v.trim() === 'ISS_TRUSS_Y' ? TRUSS_Y : Number(v))), radius: Number(m[3].split(',')[0]), length: Number(m[3].split(',')[1]), axis: m[4]
}]));
// includes() rather than toContain(): a failing toContain on a 2 MB source diffs
// the whole file and stalls the worker.
function has(text, needle) { expect(text.includes(needle), needle).toBe(true); }

describe('space station 3-D map planet', () => {
  const maps = helpers.paint(512);
  const mask = helpers.mask();

  it('draws city lights as clustered towns over land on a map at least 1024 texels wide', () => {
    const night = maps.night.img, width = night.width, height = night.height, data = night.data;
    // City lights are points: the lowest tier still gets a 1024-wide map.
    expect(width).toBe(1024);
    expect(height).toBe(512);
    let lit = 0, overLand = 0, peaks = 0;
    for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
      const value = data[(y * width + x) * 4];
      if (value <= 40) continue;
      lit++;
      if (mask[Math.floor(y / height * helpers.H) * helpers.W + Math.floor(x / width * helpers.W)]) overLand++;
      let peak = value > 60;
      for (let dy = -1; dy <= 1 && peak; dy++) for (let dx = -1; dx <= 1; dx++) {
        if ((dx || dy) && data[((y + dy) * width + x + dx) * 4] > value) { peak = false; break; }
      }
      if (peak) peaks++;
    }
    expect(lit).toBeGreaterThan(800);
    // One wide disc per metro spilled a quarter of its light onto the sea
    // (74% over land) and gave about one peak per city (105-194). Satellite
    // towns are only stamped on land and each is its own point of light.
    expect(overLand / lit).toBeGreaterThan(0.9);
    expect(peaks).toBeGreaterThan(300);
  });

  it('stores clouds as a coverage field for the shader to cut, not finished alpha', () => {
    const data = maps.cloud.img.data, count = data.length / 4;
    let saturated = 0, sum = 0;
    for (let i = 0; i < data.length; i += 4) { if (data[i] === 0 || data[i] === 255) saturated++; sum += data[i]; }
    // Finished alpha baked here was 62% exact zeros: a steep ramp a 512-texel
    // map cannot hold without square blocks once the globe is magnified.
    expect(saturated / count).toBeLessThan(0.35);
    expect(sum / count / 255).toBeGreaterThan(0.35);
    expect(sum / count / 255).toBeLessThan(0.65);
  });

  it('antialiases shorelines instead of stepping cell by cell', () => {
    const spec = maps.spec.img, width = spec.width, height = spec.height;
    let blended = 0;
    // Below 50 deg there is no ice, so cell-by-cell painting leaves only the
    // two pure values: 14 for land and 80 for open water.
    for (let y = 0; y < height; y++) {
      if (Math.abs(90 - 180 * (y + 0.5) / height) >= 50) continue;
      for (let x = 0; x < width; x++) { const value = spec.data[(y * width + x) * 4]; if (value > 14 && value < 80) blended++; }
    }
    expect(blended).toBeGreaterThan(500);
  });

  it('gates city lights by the ground\'s own Sun and adds sunlit air on the planet surface', () => {
    const { material, fs } = compiled('surface');
    expect(material.customProgramCacheKey()).toBe('iss-planet-surface');
    const emissive = between(fs, '#include <emissivemap_fragment>', '#include <lights_phong_fragment>');
    expect(emissive).toContain('#if NUM_DIR_LIGHTS > 0');
    expect(emissive).toContain('float issSunNL = dot(normal, directionalLights[0].direction);');
    // Lit only past the local terminator, whatever the station's own phase.
    expect(emissive).toContain('totalEmissiveRadiance *= smoothstep(0.06, -0.14, issSunNL);');
    expect(between(fs, '#include <lights_fragment_end>', '#include <aomap_fragment>')).toContain('reflectedLight.directDiffuse *= mix(vec3(1.0), vec3(1.0, 0.62, 0.36), issDusk);');
    const air = between(fs, '#include <envmap_fragment>', 'gl_FragColor');
    expect(air).toContain('float issFres = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);');
    expect(air).toContain('outgoingLight = outgoingLight * (1.0 - 0.45 * issFres * issDay) + issAir;');
    // The surface keeps its own alpha path untouched.
    expect(fs).toContain('#include <alphamap_fragment>');
    expect(fs).not.toContain('issField');
  });

  it('cuts crisp cloud decks from the field and keeps night cloud dark', () => {
    const { material, fs } = compiled('cloud');
    expect(material.customProgramCacheKey()).toBe('iss-planet-cloud');
    expect(fs).not.toContain('#include <alphamap_fragment>');
    expect(fs).toContain('float issField = texture2D(alphaMap, vUv).g;');
    expect(fs).toContain('diffuseColor.a *= max(smoothstep(0.5, 0.6, issField), smoothstep(0.38, 0.52, issField) * 0.36);');
    // Seamless at the antimeridian: the detail lattice wraps every 720 cells.
    expect(fs).toContain('p.x = mod(p.x, 720.0);');
    expect(between(fs, '#include <lights_fragment_end>', '#include <aomap_fragment>')).toContain('reflectedLight.indirectDiffuse *= 0.3;');
    expect(fs).not.toContain('totalEmissiveRadiance *= smoothstep');
  });

  it('gives the interior Cupola\'s distant planet only its soft veil, with no planet-scene lighting', () => {
    const { material, fs } = compiled('veil');
    expect(material.customProgramCacheKey()).toBe('iss-planet-veil');
    expect(fs).toContain('float issVeil = clamp((texture2D(alphaMap, vUv).g - 0.5) * 1.44 + 0.046, 0.0, 1.0);');
    // The interior scene's first directional light is not the Sun.
    for (const term of ['directionalLights[0]', 'issAir', 'issDusk', 'indirectDiffuse *=']) expect(fs).not.toContain(term);
    has(source, "issPatchPlanetLayer(new THREE.MeshPhongMaterial(earthCloudMaterialOptions), 'veil')");
  });

  it('leaves a shader missing any expected chunk exactly as it was, never half-patched', () => {
    // Every chunk but one: a partial patch would declare issSunNL with no
    // lighting code after it, or air light with no Sun term before it.
    const chunks = ['#include <alphamap_pars_fragment>', '#include <alphamap_fragment>', '#include <emissivemap_fragment>', '#include <lights_fragment_end>', '#include <envmap_fragment>'];
    for (const kind of ['surface', 'cloud', 'veil', 'glow']) {
      for (let missing = 0; missing < chunks.length; missing++) {
        const fragmentShader = 'void main() {\n' + chunks.filter((_, i) => i !== missing).join('\n') + '\ngl_FragColor = vec4(1.0);\n}';
        const shader = { vertexShader: 'void main() {}', fragmentShader, uniforms: {} };
        helpers.patch(new THREE.MeshPhongMaterial(), kind).onBeforeCompile(shader);
        expect(shader.fragmentShader, kind + ' without ' + chunks[missing]).toBe(fragmentShader);
      }
    }
  });

  it('wires both map layers through the patch and paints night cloud from the same Sun', () => {
    for (const file of FILES) {
      const text = read(file);
      has(text, "issPatchPlanetLayer(new THREE.MeshPhongMaterial(earthMatOpts), 'surface')");
      has(text, "issPatchPlanetLayer(new THREE.MeshPhongMaterial(cloudMatOpts), 'cloud')");
      has(text, 'planetScene.add(earthSun, planetFill);');
    }
  }, 30000);   // reads the 2 MB mirror copy; slow only under machine load

  it('flies a 51.6 deg ground track that starts over subtropical coasts, camera looking toward the equator', () => {
    const latitudes = [];
    for (let p = 0; p < 360; p += 0.5) latitudes.push(helpers.track(p).lat);
    expect(Math.max(...latitudes)).toBeCloseTo(51.6, 1);
    expect(Math.min(...latitudes)).toBeCloseTo(-51.6, 1);
    const start = helpers.track(35);
    expect(start.lat).toBeGreaterThan(25);
    expect(start.lat).toBeLessThan(40);
    expect(start.ascending).toBe(true);
    // The overview camera sits on the station's +z (aft) side; the ground it
    // looks across must run toward the equator, not over the Arctic.
    const m = start.meshToWorld, basis = new THREE.Matrix4().set(m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0, 0, 0, 0, 1);
    const toMesh = (v) => new THREE.Vector3(v[0], v[2], -v[1]);   // Earth frame -> sphere mesh axes
    const phi = start.lat * Math.PI / 180, lam = start.lon * Math.PI / 180;
    const north = toMesh([-Math.sin(phi) * Math.cos(lam), -Math.sin(phi) * Math.sin(lam), Math.cos(phi)]).applyMatrix4(basis);
    expect(north.dot(new THREE.Vector3(0, 0, 1))).toBeLessThan(-0.5);
  });

  it('turns the globe so the sub-station point is straight below and the track runs forward', () => {
    // Checked against three's own sphere: the texel the painter put at the
    // sub-station latitude and longitude must land directly under the station.
    const sphere = new THREE.SphereGeometry(1, 144, 72), pos = sphere.attributes.position, uv = sphere.attributes.uv;
    for (const p of [0, 35, 90, 123.4, 200, 248, 359.5]) {
      const t = helpers.track(p), m = t.meshToWorld;
      const basis = new THREE.Matrix4().set(m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0, 0, 0, 0, 1);
      expect(basis.determinant()).toBeCloseTo(1, 9);
      const toMesh = (v) => new THREE.Vector3(v[0], v[2], -v[1]);
      expect(toMesh(t.position).applyMatrix4(basis).distanceTo(new THREE.Vector3(0, 1, 0))).toBeLessThan(1e-9);
      expect(toMesh(t.velocity).applyMatrix4(basis).distanceTo(new THREE.Vector3(0, 0, -1))).toBeLessThan(1e-9);
      expect(toMesh(t.normal).applyMatrix4(basis).distanceTo(new THREE.Vector3(-1, 0, 0))).toBeLessThan(1e-9);
      const target = { u: (t.lon + 180) / 360, v: (t.lat + 90) / 180 };
      let best = -1, bestDistance = Infinity;
      for (let i = 0; i < uv.count; i++) {
        const du = Math.min(Math.abs(uv.getX(i) - target.u), 1 - Math.abs(uv.getX(i) - target.u)), dv = uv.getY(i) - target.v;
        const dist = du * du + dv * dv;
        if (dist < bestDistance) { bestDistance = dist; best = i; }
      }
      const texel = new THREE.Vector3(pos.getX(best), pos.getY(best), pos.getZ(best)).normalize().applyMatrix4(basis);
      expect(texel.y, 'phase ' + p).toBeGreaterThan(Math.cos(3 * Math.PI / 180));
    }
  });

  it('carries the night pass to the auroral latitudes and keeps the globe on that track every frame', () => {
    let north = -90, south = 90, nights = 0;
    for (let p = 0; p < 360; p += 0.5) {
      if (!mapLighting({ phase: p }).eclipse) continue;
      nights++;
      const lat = helpers.track(p).lat;
      north = Math.max(north, lat); south = Math.min(south, lat);
    }
    expect(nights).toBeGreaterThan(100);
    expect(north).toBeGreaterThan(40);
    expect(south).toBeLessThan(-45);
    has(source, 'orientEarth(lighting.phase);');
    has(source, 'earth.quaternion.copy(_trackQ);');
    has(source, 'if (aurora) aurora.quaternion.copy(_trackQ);');
    has(source, 'cloudShell.quaternion.copy(_trackQ).multiply(');
    expect(source.includes('earth.rotation.y = lighting.phase'), 'the old once-per-orbit spin').toBe(false);
  });

  it('rings the geomagnetic poles with aurorae, lower over Canada than over Siberia, and never at low latitude', () => {
    const img = helpers.aurora().img, W = img.width, H = img.height, d = img.data;
    const green = (row, col) => d[(row * W + col) * 4 + 1];
    const colOf = (lon) => Math.floor(((lon + 180) / 360) * W) % W;
    function peakLat(lon, north) {
      let best = -1, value = -1;
      for (let row = 0; row < H; row++) {
        const lat = 90 - 180 * (row + 0.5) / H;
        if (north ? lat < 40 : lat > -40) continue;
        // Smooth the curtain structure: average three neighbouring columns.
        const c = colOf(lon), g = green(row, c) + green(row, (c + 1) % W) + green(row, (c + W - 1) % W);
        if (g > value) { value = g; best = lat; }
      }
      return best;
    }
    // On the meridian through the geomagnetic pole (72.7 W) the 67 deg oval
    // sits 23 deg from the pole: ~57.7 N on the near side, ~76.3 N beyond it.
    expect(Math.abs(peakLat(-72.7, true) - 57.7)).toBeLessThan(2.5);
    expect(Math.abs(peakLat(107.3, true) - 76.3)).toBeLessThan(2.5);
    expect(Math.abs(peakLat(107.3, false) + 57.7)).toBeLessThan(2.5);
    expect(Math.abs(peakLat(-72.7, false) + 76.3)).toBeLessThan(2.5);
    let lowLatitudeLight = 0;
    for (let row = 0; row < H; row++) {
      if (Math.abs(90 - 180 * (row + 0.5) / H) >= 40) continue;
      for (let col = 0; col < W; col++) lowLatitudeLight += d[(row * W + col) * 4] + green(row, col) + d[(row * W + col) * 4 + 2];
    }
    expect(lowLatitudeLight).toBe(0);
    // The poleward fringe is redder than the green core.
    const coreRow = Math.round((90 - 57.7) / 180 * H), fringeRow = Math.round((90 - 60.5) / 180 * H), col = colOf(-72.7);
    const redness = (row) => d[(row * W + col) * 4] / Math.max(1, green(row, col));
    expect(green(fringeRow, col)).toBeGreaterThan(0);
    expect(redness(fringeRow)).toBeGreaterThan(redness(coreRow) * 2);
    // No seam at the antimeridian. A pixel check cannot see one here (the
    // oval's own slope swamps it), so check the cause: every noise field's x
    // scale is its wrap period, and the noise really repeats at that period.
    const painter = sliceBetween(source, '  function issAuroraCanvas()', '  // The Milky Way behind the map', { label: 'aurora painter' });
    const fields = [...painter.matchAll(/issFbm\(x \/ W \* (\d+), [^,]+, (\d+), (\d)\)/g)];
    expect(fields.length).toBe(2);
    for (const [, scale, period, octaves] of fields) {
      expect(period).toBe(scale);
      for (const y of [0.3, 41.7]) expect(helpers.fbm(Number(scale), y, Number(period), Number(octaves))).toBeCloseTo(helpers.fbm(0, y, Number(period), Number(octaves)), 12);
    }
  });

  it('lights the aurora only well past dusk, with no haze or cloud terms', () => {
    const { material, fs } = compiled('glow');
    expect(material.customProgramCacheKey()).toBe('iss-planet-glow');
    expect(fs).toContain('totalEmissiveRadiance *= smoothstep(-0.1, -0.32, issSunNL);');
    for (const term of ['issAir', 'issField', 'issVeil', 'directDiffuse *=', 'smoothstep(0.06, -0.14']) expect(fs).not.toContain(term);
    has(source, "}), 'glow'));");
    has(source, 'new THREE.SphereGeometry(30.45, 96, 48)');
  });

  it('paints a green oxygen airglow on the night limb only', () => {
    const fn = new Function('THREE', 'earth', 'limbShells',
      sliceBetween(source, '          function makeLimbShell(', '          var atmo = makeLimbShell(', { label: 'limb shell' }) +
      '\nreturn makeLimbShell;');
    const shells = [];
    const make = fn(THREE, { position: new THREE.Vector3(0, -34.5, 0) }, shells);
    const call = /var airglow = makeLimbShell\(30\.12, 0x8fdcff, 0xffb056, 0\.38, (0x[0-9a-f]{6})\);/.exec(source);
    expect(call).not.toBeNull();
    const night = new THREE.Color(Number(call[1]));
    expect(night.g).toBeGreaterThan(night.r * 2);
    expect(night.g).toBeGreaterThan(night.b * 2);
    make(30.12, 0x8fdcff, 0xffb056, 0.38, Number(call[1]));
    make(30.12, 0x8fdcff, 0xffb056, 0.38);
    const sun = new THREE.Vector3(0, 1, 0);
    shells.forEach((shell) => shell.update(sun));
    const [glow, plain] = shells.map((shell) => shell.mesh.geometry);
    const pos = glow.attributes.position, a = glow.attributes.color, b = plain.attributes.color;
    let nightSeen = 0, daySeen = 0;
    for (let i = 0; i < pos.count; i++) {
      const facing = pos.getY(i) / 30.12;
      if (facing < -0.5) {
        nightSeen++;
        expect(a.getY(i) - b.getY(i)).toBeCloseTo(night.g, 6);
        expect(a.getY(i)).toBeGreaterThan(a.getZ(i));
      } else if (facing > 0.4) {
        daySeen++;
        expect([a.getX(i), a.getY(i), a.getZ(i)]).toEqual([b.getX(i), b.getY(i), b.getZ(i)]);
      }
    }
    expect(nightSeen).toBeGreaterThan(100);
    expect(daySeen).toBeGreaterThan(100);
  });
});

describe('space station 3-D map Milky Way', () => {
  function frame(group) {
    const pole = new THREE.Vector3().fromArray(group.userData.pole), core = new THREE.Vector3().fromArray(group.userData.core);
    const side = new THREE.Vector3().crossVectors(pole, core);
    return (x, y, z) => {
      const d = new THREE.Vector3(x, y, z).normalize();
      return { b: Math.asin(Math.max(-1, Math.min(1, d.dot(pole)))), l: Math.atan2(d.dot(side), d.dot(core)) };
    };
  }

  it('builds the same band on every mount without touching Math.random', () => {
    const real = Math.random;
    let calls = 0;
    Math.random = () => { calls++; return real(); };
    try {
      const a = helpers.milkyWay(THREE), b = helpers.milkyWay(THREE);
      expect(calls).toBe(0);
      const stars = (group) => Array.from(group.getObjectByName('iss-milky-way-stars').geometry.attributes.position.array);
      expect(stars(a)).toEqual(stars(b));
    } finally { Math.random = real; }
    has(source, 'var milkyWay = issMilkyWay(THREE, milkyWaySkin ? issTexture(milkyWaySkin, true) : null);');
    has(source, 'skyGroup.add(milkyWay);');
  });

  it('packs its stars along one great circle and brightens the glow toward the galactic centre', () => {
    const group = helpers.milkyWay(THREE), toBand = frame(group);
    const stars = group.getObjectByName('iss-milky-way-stars').geometry.attributes.position;
    expect(stars.count).toBe(group.userData.starCount);
    let inBand = 0, coreSide = 0;
    for (let i = 0; i < stars.count; i++) {
      const { b, l } = toBand(stars.getX(i), stars.getY(i), stars.getZ(i));
      if (Math.abs(b) < 0.5) inBand++;
      if (Math.abs(l) < Math.PI / 2) coreSide++;
    }
    expect(inBand / stars.count).toBeGreaterThan(0.98);
    // Weighted toward the bulge: well over half face the centre's hemisphere.
    expect(coreSide / stars.count).toBeGreaterThan(0.6);
  });

  it('paints the glow in galactic coordinates on a sphere turned to the band', () => {
    const canvas = helpers.milkyWayCanvas(), img = canvas.img, W = img.width, H = img.height;
    const group = helpers.milkyWay(THREE, new THREE.Texture()), toBand = frame(group);
    const glow = group.getObjectByName('iss-milky-way-glow');
    expect(glow.material.side).toBe(THREE.BackSide);
    expect(glow.material.fog).toBe(false);
    expect(group.userData.glowMaterial).toBe(glow.material);
    // Every vertex's texture coordinate must name its own sky direction:
    // u is galactic longitude from the centre, v is latitude from the plane.
    const pos = glow.geometry.attributes.position, uv = glow.geometry.attributes.uv;
    let checked = 0;
    for (let i = 0; i < pos.count; i++) {
      const u = uv.getX(i), v = uv.getY(i);
      if (u < 0.02 || u > 0.98 || v < 0.1 || v > 0.9) continue;
      const world = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyQuaternion(glow.quaternion);
      const { b, l } = toBand(world.x, world.y, world.z);
      expect(Math.abs(l - (u * 2 * Math.PI - Math.PI))).toBeLessThan(1e-4);
      expect(Math.abs(b - (v - 0.5) * Math.PI)).toBeLessThan(1e-4);
      checked++;
    }
    expect(checked).toBeGreaterThan(1000);
    // Canvas row 0 is the band's north pole (texture flipY), column 0 is l = -pi.
    const at = (l, b) => { const d = img.data, i = (Math.min(H - 1, Math.floor((0.5 - b / Math.PI) * H)) * W + Math.min(W - 1, Math.floor((l + Math.PI) / (2 * Math.PI) * W))) * 4; return d[i] + d[i + 1] + d[i + 2]; };
    const mean = (pred) => { let sum = 0, n = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const l = (x + 0.5) / W * 2 * Math.PI - Math.PI, b = (0.5 - (y + 0.5) / H) * Math.PI; if (pred(l, b)) { sum += at(l, b); n++; } } expect(n).toBeGreaterThan(0); return sum / n; };
    const core = mean((l, b) => Math.abs(b) < 0.12 && Math.abs(l) < 0.4), anti = mean((l, b) => Math.abs(b) < 0.12 && Math.abs(l) > 2.8);
    expect(core).toBeGreaterThan(anti * 1.8);
    // The dust lane darkens the band's own centre line near the bulge.
    expect(mean((l, b) => Math.abs(b) < 0.015 && Math.abs(l) < 0.6)).toBeLessThan(mean((l, b) => Math.abs(b) > 0.06 && Math.abs(b) < 0.1 && Math.abs(l) < 0.6));
    expect(mean((l, b) => Math.abs(b) > 0.7)).toBe(0);
    // The two edges of the map meet: no seam at the anticentre.
    let seam = 0;
    for (let y = 0; y < H; y++) seam = Math.max(seam, Math.abs(img.data[(y * W) * 4 + 1] - img.data[(y * W + W - 1) * 4 + 1]));
    expect(seam).toBeLessThanOrEqual(6);
  });

  it('builds without a glow when there is no 2-D canvas, and fades with daylight', () => {
    const group = helpers.milkyWay(THREE, null);
    expect(group.getObjectByName('iss-milky-way-glow')).toBeUndefined();
    expect(group.userData.glowMaterial).toBeNull();
    has(source, 'milkyWay.userData.starMaterial.opacity = 0.62 * (0.3 + 0.7 * lampOn);');
    has(source, 'if (milkyWay.userData.glowMaterial) milkyWay.userData.glowMaterial.opacity = 0.12 + 0.88 * lampOn;');
  });
});

describe('space station 3-D map assembly accuracy', () => {
  it('docks each module on its real side of the station', () => {
    has(source, '// Station frame: -z forward, +y zenith (away from Earth), +x starboard.');
    has(source, 'earth.position.set(0, -34.5, 0);');
    // The frame's own anchors: Quest is starboard of Unity, Tranquility port.
    expect(modules.quest.pos[0]).toBeGreaterThan(0);
    expect(modules.tranquility.pos[0]).toBeLessThan(0);
    // Harmony carries Columbus on its starboard side and Kibo on its port side.
    expect(modules.columbus.pos[0]).toBeGreaterThan(0);
    expect(modules.kibo.pos[0]).toBeLessThan(0);
    for (const id of ['columbus', 'kibo']) { expect(modules[id].pos[2]).toBe(modules.harmony.pos[2]); expect(modules[id].axis).toBe('x'); }
    // Nauka docked to Zvezda's Earth-facing (nadir) port in 2021.
    expect(modules.nauka.pos[1]).toBeLessThan(0);
    expect(modules.nauka.axis).toBe('y');
    expect(Math.abs(modules.nauka.pos[2] - modules.zvezda.pos[2])).toBeLessThan(1.6);
    // The Cupola looks down at Earth from Tranquility's nadir port.
    expect(modules.cupola.pos[1]).toBeLessThan(0);
    expect(modules.cupola.pos[0]).toBe(modules.tranquility.pos[0]);
    // Leonardo moved to Tranquility's forward port in May 2015: its aft end
    // sits on Tranquility's forward face, clear of Destiny beside it.
    const leo = modules.leonardo, node3 = modules.tranquility, lab = modules.destiny;
    expect(leo.axis).toBe('z');
    expect(leo.pos[0]).toBe(node3.pos[0]);
    expect(leo.pos[1]).toBe(node3.pos[1]);
    expect(leo.pos[2] + leo.length / 2).toBeCloseTo(node3.pos[2] - node3.radius, 6);
    expect(Math.abs(leo.pos[0] - lab.pos[0]) - leo.radius - lab.radius).toBeGreaterThan(0.05);
  });

  it('berths a Cygnus at Unity\'s Earth-facing port, at true proportions and clear of the Cupola', () => {
    const block = sliceBetween(source, '          // Cygnus: berthed, not docked.', '          // Capture only hardware', { label: 'Cygnus' });
    const unity = modules.unity, cupola = modules.cupola;
    const top = Number(/var cygnusTop = (-?[\d.]+)/.exec(block)[1]);
    // Bolted to Unity's nadir face, on Unity's own axis.
    expect(top).toBeCloseTo(unity.pos[1] - unity.radius, 9);
    expect(block.includes('0.2); addVisitor(cygnusCargo, \'unity\');')).toBe(true);
    expect(unity.pos[2]).toBe(0.2);
    // A 3.07 m cargo module under a 4.57 m node.
    const cargoRadius = Number(/new THREE\.CylinderGeometry\(([\d.]+), \1, ([\d.]+), 20\), hullMat\)/.exec(block)[1]);
    expect(cargoRadius / unity.radius).toBeCloseTo(3.07 / 4.57, 1);
    // Every part rides Unity in the cutaway and dims with it.
    const visitors = block.match(/addVisitor\([a-zA-Z]+, '([a-z]+)'\)/g);
    expect(visitors.length).toBeGreaterThanOrEqual(6);
    visitors.forEach((call) => expect(call).toMatch(/'unity'\)$/));
    // Two ten-gore UltraFlex fans, below the Cupola's dome on Tranquility.
    expect(block.includes('new THREE.CircleGeometry(0.5, 10)')).toBe(true);
    const fanCentre = top - 0.08 - 1.5 - 0.21, cupolaBottom = cupola.pos[1] - cupola.radius;
    expect(fanCentre + 0.5).toBeLessThan(cupolaBottom);
    // Nothing reaches the planet's air (r 30.32 around y = -34.5).
    expect(fanCentre - 0.5).toBeGreaterThan(-34.5 + 30.32);
  });

  it('carries the truss above Destiny instead of through it, with everything it holds at its height', () => {
    const truss = modules.truss, lab = modules.destiny;
    expect(truss.pos[1]).toBe(TRUSS_Y);
    expect(truss.pos[2]).toBe(lab.pos[2]);
    // The lattice's lower face (half-depth = its size radius) clears the lab.
    expect(TRUSS_Y - truss.radius - (lab.pos[1] + lab.radius)).toBeGreaterThan(0.05);
    has(source, 'wingGroup.position.set(tx, ISS_TRUSS_Y, -1.6);');
    has(source, 'hardware.position.set(tx, ISS_TRUSS_Y - .9, -1.6);');
    has(source, 'var armBase = new THREE.Vector3(1.251, ISS_TRUSS_Y - .035, -1.6);');
    expect(/0\.35, -1\.6\)|\.62, -1\.6\)|-\.55, -1\.6\)/.test(source), 'a hard-coded old truss height').toBe(false);
    // The struts actually span the gap: from the hull up to the truss.
    const geometry = helpers.truss(THREE, TRUSS_Y), pos = geometry.attributes.position;
    let low = Infinity;
    for (let i = 0; i < pos.count; i++) if (Math.abs(pos.getX(i)) < 0.4 && Math.abs(pos.getZ(i)) < 0.6) low = Math.min(low, pos.getY(i));
    // Truss-local y: the hull top under a strut at x = 0.3 is sqrt(0.58^2 - 0.3^2).
    expect(low + TRUSS_Y).toBeCloseTo(Math.sqrt(lab.radius * lab.radius - 0.3 * 0.3), 2);
  });

  it('mounts the six iROSA roll-out arrays on the wings that carry them', () => {
    const xs = /\[(-?[\d.]+), (-?[\d.]+), (-?[\d.]+), (-?[\d.]+)\]\.forEach\(function \(tx, wi\)/.exec(source).slice(1).map(Number);
    // +x is starboard: negative x is the port (P) truss; the outer pair is 6.
    const names = xs.map((x) => (x < 0 ? 'P' : 'S') + (Math.abs(x) > 4.3 ? '6' : '4'));
    expect(names).toEqual(['P6', 'P4', 'S4', 'S6']);
    const wings = JSON.parse(/var ISS_IROSA_WINGS = (\[[^;]*\]);/.exec(source)[1]);
    const count = Object.fromEntries(names.map((name, i) => [name, wings[i].length]));
    // Channels 2B + 4B (P6), 4A (P4), 1A + 3A (S4), 1B (S6): six arrays.
    expect(count).toEqual({ P6: 2, P4: 1, S4: 2, S6: 1 });
    has(source, '2B and 4B on P6, 4A on P4, 1A and 3A on S4, 1B on S6');
    wings.flat().forEach((side) => expect([1, -1]).toContain(side));
    // 63 x 20 ft over a 112 x 39 ft legacy wing, canted 10 deg above it.
    const dims = (text) => /new THREE\.BoxGeometry\(([\d.]+), ([\d.]+), ([\d.]+)\)/.exec(text).slice(1).map(Number);
    const legacy = dims(sliceBetween(source, "var panel = new THREE.Mesh(", "panel.name = 'iss-solar-blanket-'")), rosa = dims(sliceBetween(source, 'var cells = new THREE.Mesh(', "cells.name = 'iss-irosa-blanket'"));
    expect(rosa[2] / legacy[2]).toBeCloseTo(63 / 112, 1);
    expect(rosa[0] / legacy[0]).toBeCloseTo(20 / 39, 1);
    has(source, 'var ROSA_CANT = 10 * Math.PI / 180;');
    // Riding the wing group is what makes them turn and feather with it.
    has(source, 'wingGroup.add(rosa);');
    has(source, "cells.name = 'iss-irosa-blanket'; cells.position.set(0, 0, side * .955); cells.castShadow = true;");
  });

  it('paints the iROSA cells darker than the legacy wings, the same on every mount', () => {
    const rosa = helpers.rosa().img;
    let sum = 0;
    for (let i = 0; i < rosa.data.length; i += 4) sum += (rosa.data[i] + rosa.data[i + 1] + rosa.data[i + 2]) / 3;
    expect(sum / (rosa.data.length / 4)).toBeLessThan(70);
    has(source, 'var n = Math.sin((r * 31 + c * 7 + 1) * 12.9898) * 43758.5453');
  });
});

describe('space station 3-D map inertial sky', () => {
  it('turns the stars, Milky Way and Moon with the orbit, by the same angle the Sun turns', () => {
    // issMapLighting's Sun is [sin b, cos b cos p, cos b sin p]: the p = 0
    // direction rotated about +x by the phase. The sky group gets that turn.
    for (const phase of [0, 35, 123, 250]) {
      const sky = new THREE.Object3D();
      sky.rotation.x = phase * Math.PI / 180;
      sky.updateMatrixWorld(true);
      const sun0 = mapLighting({ phase: 0, beta: 33 }).sun, sunP = mapLighting({ phase, beta: 33 }).sun;
      const turned = new THREE.Vector3(...sun0).applyMatrix4(sky.matrixWorld);
      expect(turned.distanceTo(new THREE.Vector3(...sunP))).toBeLessThan(1e-9);
    }
    has(source, 'skyGroup.rotation.x = moonGroup.rotation.x = track.phase * Math.PI / 180;');
    has(source, 'skyGroup.add(milkyWay);');
    has(source, 'skyGroup.add(new THREE.Points(starGeo');
    // Stars cover the whole sphere now: no half of a turning sky is spare.
    has(source, 'new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5))');
  });

  it('shows the Moon at its true size, near side to Earth, north up, in the open sky above the default view', () => {
    const size = /var MOON_DISTANCE = (\d+), MOON_RADIUS = MOON_DISTANCE \* Math\.tan\(([\d.]+) \* Math\.PI \/ 180\)/.exec(source);
    expect(size).not.toBeNull();
    expect(Number(size[2]) * 2).toBeCloseTo(0.52, 2);
    const dir = /var moonDirection = new THREE\.Vector3\((-?[\d.]+), (-?[\d.]+), (-?[\d.]+)\)\.normalize\(\);/.exec(source).slice(1).map(Number);
    const moonDir = new THREE.Vector3(...dir).normalize();
    // At the default phase the Moon sits about 120 deg from the Sun (gibbous).
    const sky = new THREE.Object3D(); sky.rotation.x = 35 * Math.PI / 180; sky.updateMatrixWorld(true);
    const moonNow = moonDir.clone().applyMatrix4(sky.matrixWorld), sun = new THREE.Vector3(...mapLighting({}).sun);
    expect(Math.acos(moonNow.dot(sun)) * 180 / Math.PI).toBeGreaterThan(100);
    expect(Math.acos(moonNow.dot(sun)) * 180 / Math.PI).toBeLessThan(140);
    // In view of the overview camera and not behind the planet.
    const cam = new THREE.PerspectiveCamera(46, 1126 / 501, 0.1, 220);
    cam.fov = Math.min(80, 2 * Math.atan(Math.tan(23 * Math.PI / 180) * Math.max(1, 1.3 / cam.aspect)) * 180 / Math.PI);
    cam.updateProjectionMatrix(); cam.position.set(8.2, 4.8, 10.4); cam.lookAt(0, 0, 1); cam.updateMatrixWorld(true);
    const moonAt = moonNow.clone().multiplyScalar(Number(size[1]));
    const ndc = moonAt.clone().project(cam);
    expect(Math.abs(ndc.x)).toBeLessThan(0.95);
    expect(Math.abs(ndc.y)).toBeLessThan(0.95);
    const ray = new THREE.Ray(cam.position.clone(), moonAt.clone().sub(cam.position).normalize());
    expect(ray.intersectsSphere(new THREE.Sphere(new THREE.Vector3(0, -34.5, 0), 30.32))).toBe(false);
    has(source, 'moon.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(moonFace, moonNorth,');
    has(source, 'moonGroup.add(moon); planetScene.add(moonGroup);');
  });

  it('paints the near side with its maria at their real places', () => {
    const moon = helpers.moon().img, W = moon.width, H = moon.height, d = moon.data;
    const tone = (lat, lon) => d[(Math.floor((90 - lat) / 180 * H) * W + Math.floor((lon + 180) / 360 * W)) * 4];
    // Mare Imbrium, Serenitatis, Tranquillitatis, Crisium, Oceanus Procellarum
    // are dark; the southern highlands and the far side are bright.
    const maria = [[33, -16], [28, 17.5], [8.5, 31], [17, 59], [18, -55]].map(([a, b]) => tone(a, b));
    const highlands = [[-50, 15], [-35, 60], [0, 150], [30, -130]].map(([a, b]) => tone(a, b));
    expect(Math.max(...maria)).toBeLessThan(Math.min(...highlands) - 30);
    // Tycho and Copernicus are bright young craters: each centre outshines a
    // 5 deg ring of the terrain around it by a clear margin.
    for (const [lat, lon] of [[-43.3, -11.2], [9.6, -20.1]]) {
      const ring = [];
      for (let a = 0; a < 360; a += 30) ring.push(tone(lat + 5 * Math.sin(a * Math.PI / 180), lon + 5 * Math.cos(a * Math.PI / 180) / Math.cos(lat * Math.PI / 180)));
      expect(tone(lat, lon) - ring.reduce((x, y) => x + y) / ring.length, lat + ',' + lon).toBeGreaterThan(30);
    }
    expect(source.includes('var ISS_MOON_MARIA = ['), 'maria table').toBe(true);
  });
});

describe('space station interior Cupola window views', () => {
  // The seven windows' centres (cluster offsets) and pane radii, as built.
  const windows = [[0, 0, 0.4 * 0.91]].concat([0, 1, 2, 3, 4, 5].map((k) => [Math.cos(k * Math.PI / 3) * 0.76, Math.sin(k * Math.PI / 3) * 0.76, 0.29 * 0.91]));
  const SPAN = Number(/var ISS_CUPOLA_VIEW_SPAN = ([\d.]+);/.exec(source)[1]);
  // Canvas fraction (x right, y down) -> cluster offset (x, z), as the pane UVs map it.
  const offset = (u, v) => [(u - 0.5) * SPAN, (v - 0.5) * SPAN];
  const inWindow = ([x, z]) => windows.findIndex(([wx, wz, r]) => Math.hypot(x - wx, z - wz) < r);
  function sampler(target) {
    const img = helpers.cupolaView(target).img, W = img.width, d = img.data;
    return (u, v) => { const i = (Math.floor(v * W) * W + Math.floor(u * W)) * 4; return [d[i], d[i + 1], d[i + 2]]; };
  }
  const lum = (c) => c[0] + c[1] + c[2];
  // Where a place lands on a scene's canvas, from the scene's own centre,
  // span and rotation as written in the source.
  function project(target, lat, lon) {
    const m = new RegExp(target + ': \\{ lat: ([\\d.-]+), lon: ([\\d.-]+), km: (\\d+), rotate: (-?\\d+)').exec(source);
    const [lat0, lon0, km, rot] = m.slice(1).map(Number), r = Math.PI / 180;
    const spanLat = km / 111.2, spanLon = spanLat / Math.cos(lat0 * r), e = (lon - lon0) / spanLon, n = (lat - lat0) / spanLat;
    return [0.5 + Math.cos(rot * r) * e - Math.sin(rot * r) * n, 0.5 - (Math.sin(rot * r) * e + Math.cos(rot * r) * n)];
  }
  const peakNear = (at, [u, v], reach) => {
    let best = 0;
    for (let du = -reach; du <= reach; du += 0.003) for (let dv = -reach; dv <= reach; dv += 0.003) best = Math.max(best, lum(at(u + du, v + dv)));
    return best;
  };

  it('paints three scenes at 384 texels, once each, and keeps the flat pane where there is no real canvas', () => {
    for (const target of ['day', 'night', 'aurora']) {
      const canvas = helpers.cupolaView(target);
      expect(canvas.width, target).toBe(384);
      expect(helpers.cupolaView(target)).toBe(canvas);   // painted once, then cached
    }
    expect(helpers.cupolaView('nonsense')).toBeNull();
    // jsdom's stand-in context has no pixel buffer: no texture, flat pane.
    const fake = new Function('document', sliceBetween(source, '  var ISS_LAND_W = 720', '  function issGlowCanvas()', { label: 'helpers' }) + '\nreturn issCupolaViewCanvas;')({
      createElement: () => ({ width: 0, height: 0, setAttribute() {}, getContext: () => ({ createImageData: () => ({ data: () => 0 }), putImageData() {} }) })
    });
    expect(fake('day')).toBeNull();
  });

  it('puts a hurricane eye, clear and walled by cloud, in the centre window, over a real Caribbean', () => {
    const at = sampler('day');
    expect(inWindow(offset(0.5, 0.5))).toBe(0);
    const eye = lum(at(0.5, 0.5));
    let wall = 0;
    for (let a = 0; a < 360; a += 30) wall += lum(at(0.5 + Math.cos(a * Math.PI / 180) * 45 / 1400, 0.5 + Math.sin(a * Math.PI / 180) * 45 / 1400));
    // A clear eye: under half the eyewall's brightness (measured 0.31; 0.64
    // with the eye clouded over).
    expect(eye).toBeLessThan(wall / 12 * 0.45);
    // Hispaniola is land (greener) against the open Atlantic to the north-east (bluer).
    const hisp = at(...project('day', 19, -71)), sea = at(...project('day', 26.5, -66));
    expect(hisp[1] - hisp[2]).toBeGreaterThan(sea[1] - sea[2] + 15);
  });

  it('shows Cairo in the window behind the night reticle and the Nile running south into the centre window', () => {
    const at = sampler('night');
    const cairo = project('night', 30.04, 31.24);
    expect(Math.hypot(cairo[0] - 0.319, cairo[1] - 0.814)).toBeLessThan(0.01);
    expect(inWindow(offset(...cairo))).toBe(3);
    expect(lum(at(...cairo))).toBeGreaterThan(600);
    // The valley's towns light a thread south to Luxor, in the centre window.
    expect(inWindow(offset(...project('night', 25.69, 32.64)))).toBe(0);
    const valley = [[28.11, 30.74], [27.18, 31.18], [26.56, 31.70], [25.69, 32.64]].map(([lat, lon]) => peakNear(at, project('night', lat, lon), 0.008));
    // Each town is its own blaze, well above the thread between towns
    // (measured 1.6x; the thread alone gives 1.1x).
    const thread = [[[28.11, 30.74], [27.18, 31.18]], [[27.18, 31.18], [26.56, 31.70]]].map(([p, q]) => {
      const a = project('night', ...p), b = project('night', ...q);
      return peakNear(at, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], 0.004);
    });
    expect(Math.min(...thread)).toBeGreaterThan(150);
    valley.forEach((peak) => expect(peak).toBeGreaterThan(Math.max(...thread) * 1.4));
    // Coasts are softened, not stepped cell by cell: dark night ground has
    // shoreline pixels between sea and land (764 measured; 0 if left raw).
    const night = helpers.cupolaView('night').img.data, toLinear = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    let shore = 0;
    for (let i = 0; i < night.length; i += 4) {
      if (night[i] > 26) continue;   // lit pixels
      const ratio = toLinear(night[i + 2]) / toLinear(28);
      if (ratio > 1.15 && ratio < 1.45) shore++;
    }
    expect(shore).toBeGreaterThan(200);
    // The desert either side is only the moonlit ground: the lit valley stands out.
    expect(peakNear(at, project('night', 27.5, 28.0), 0.01)).toBeLessThan(Math.min(...valley) * 0.7);
  });

  it('runs a thin green auroral ribbon through the windows either side of the aurora reticle', () => {
    const at = sampler('aurora');
    for (const k of [1, 6]) {
      const [wx, wz, r] = windows[k];
      let green = 0;
      for (let a = 0; a < 360; a += 6) for (const rr of [0.2, 0.5, 0.8]) {
        const c = at(0.5 + (wx + Math.cos(a * Math.PI / 180) * r * rr) / SPAN, 0.5 + (wz + Math.sin(a * Math.PI / 180) * r * rr) / SPAN);
        if (c[1] > 150 && c[1] > c[0] * 1.6) green++;
      }
      expect(green, 'window ' + k).toBeGreaterThan(3);
    }
    // Thin: most of the view stays dark.
    let dark = 0, n = 0;
    for (let u = 0.02; u < 1; u += 0.04) for (let v = 0.02; v < 1; v += 0.04) { n++; if (lum(at(u, v)) < 120) dark++; }
    expect(dark / n).toBeGreaterThan(0.75);
  });

  it('maps each pane to its own patch of one scene and follows the observation target', () => {
    has(source, 'paneUv.setXY(uvIndex, 0.5 + (offset[0] + panePos.getX(uvIndex)) / ISS_CUPOLA_VIEW_SPAN, 0.5 - (offset[1] - panePos.getY(uvIndex)) / ISS_CUPOLA_VIEW_SPAN);');
    has(source, 'observationTargetPoint: (setCupolaView(persistedObservationTarget), cupolaTargetPoints[persistedObservationTarget]), observationActive: false,');
    has(source, 'if (cupolaViewTarget !== state.observationTarget) { setCupolaView(state.observationTarget); dirty = true; }');
    has(source, 'cupolaPaneMat.color.setHex(viewTexture ? 0xffffff : 0x0a3466);');
    has(source, 'if (viewCanvas) cupolaViewTextures[target] = interiorEarthTexture(viewCanvas, true);');
    // The panes stay below the shutters, so a closed shutter still covers them.
    has(source, 'pane.position.set(-6.25 + offset[0], -4.4, -0.25 + offset[1]);');
  });
});

describe('space station 3-D map truss hardware', () => {
  it('builds rotary joints, equipment boxes, pallets and AMS-02 as one vertex-coloured mesh', () => {
    const geometry = helpers.truss(THREE, TRUSS_Y);
    expect(geometry.userData.partCount).toBe(49);
    expect(geometry.attributes.color.count).toBe(geometry.attributes.position.count);
    const box = geometry.boundingBox;
    // Inside the 11-unit backbone, close around its 0.4 square section.
    expect(box.min.x).toBeGreaterThanOrEqual(-5.5);
    expect(box.max.x).toBeLessThanOrEqual(5.5);
    for (const axis of ['y', 'z']) { expect(box.min[axis]).toBeGreaterThan(-0.5); expect(box.max[axis]).toBeLessThan(0.5); }
    // Each Solar Alpha Rotary Joint is a round drum on the truss axis.
    const pos = geometry.attributes.position;
    for (const side of [-1, 1]) {
      let rim = 0;
      for (let i = 0; i < pos.count; i++) {
        if (Math.abs(pos.getX(i) - side * 3.08) > 0.081) continue;
        if (Math.abs(Math.hypot(pos.getY(i), pos.getZ(i)) - 0.215) < 1e-4) rim++;
      }
      expect(rim).toBeGreaterThan(40);
    }
  });

  it('rides the truss selection, cutaway and picking like the other module details', () => {
    for (const file of FILES) {
      const text = read(file);
      const block = sliceBetween(text, '            if (m.id === \'truss\') {\n              var trussHardware', '            }\n', { label: 'truss hardware wiring', includeEnd: true });
      expect(block).toContain('trussHardware._issParentId = m.id;');
      expect(block).toContain('moduleDetails.push(trussHardware);');
      expect(block).toContain('moduleCapPickers.push(trussHardware);');
      expect(block).toContain('vertexColors: true');
      expect(block).toContain('transparent: true');
    }
  });
});
