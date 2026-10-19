import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { sliceBetween } from './helpers/anchored_slice.js';

// The 3-D map's planet and truss hardware, checked on the real painter, the
// real r128 Phong shader source and the real geometry builders. The GL suite
// proves the scene renders; these pin what it is supposed to show.
const FILES = ['stem_lab/stem_tool_spacestation.js', 'desktop/web-app/public/stem_lab/stem_tool_spacestation.js'];
// The tool files use CRLF; anchors below are written with LF.
const read = (file) => readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const source = read(FILES[0]);
const vendor = {};
runInNewContext(readFileSync('vendor/three-r128/three.min.js', 'utf8'), vendor);
const THREE = vendor.THREE;

// Everything from the land mask to the glow canvas is declarations only, so
// it evaluates on its own. The stub canvas keeps each map's last ImageData.
function stubDocument() {
  return { createElement() {
    const canvas = { width: 0, height: 0, setAttribute() {}, getContext() {
      return { createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }), putImageData(img) { canvas.img = img; } };
    } };
    return canvas;
  } };
}
const helpers = new Function('document',
  sliceBetween(source, '  var ISS_LAND_W = 720', '  function issGlowCanvas()', { label: 'planet helpers' }) +
  '\nreturn { paint: issEarthCanvases, mask: issLandMask, patch: issPatchPlanetLayer, truss: issTrussHardwareGeometry, milkyWay: issMilkyWay, milkyWayCanvas: issMilkyWayCanvas, W: ISS_LAND_W, H: ISS_LAND_H };'
)(stubDocument());

function compiled(kind) {
  const material = helpers.patch(new THREE.MeshPhongMaterial(), kind);
  const shader = { vertexShader: THREE.ShaderLib.phong.vertexShader, fragmentShader: THREE.ShaderLib.phong.fragmentShader, uniforms: {} };
  material.onBeforeCompile(shader);
  return { material, fs: shader.fragmentShader };
}
function between(text, start, end) { return sliceBetween(text, start, end); }
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
    for (const kind of ['surface', 'cloud', 'veil']) {
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
  });

  it('flies the overview over subtropical coasts looking toward the equator, not the pole', () => {
    const block = sliceBetween(source, 'var earth = new THREE.Mesh(new THREE.SphereGeometry(30, 64, 40)', 'scene.add(earth);', { label: 'map Earth' });
    const tilt = Number(/earth\.rotation\.x = (-?[\d.]+);/.exec(block)[1]);
    const globe = new THREE.Object3D();
    globe.rotation.x = tilt;
    globe.updateMatrixWorld(true);
    const inverse = globe.quaternion.clone().invert();
    // Earth sits straight below the station, so world +y is the sub-station point.
    const under = new THREE.Vector3(0, 1, 0).applyQuaternion(inverse);
    const latitude = Math.asin(under.y) * 180 / Math.PI;
    expect(latitude).toBeGreaterThan(25);
    expect(latitude).toBeLessThan(40);
    // The overview camera sits on the +z side; the ground it looks across
    // must run toward the equator (south), not over the Arctic.
    const towardCamera = new THREE.Vector3(0, 0, 1).applyQuaternion(inverse);
    const north = new THREE.Vector3(0, 1, 0).sub(under.clone().multiplyScalar(under.y)).normalize();
    expect(towardCamera.dot(north)).toBeLessThan(-0.5);
    has(source, 'cloudShell.rotation.x = earth.rotation.x;');
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
    has(source, 'scene.add(milkyWay);');
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

describe('space station 3-D map truss hardware', () => {
  it('builds rotary joints, equipment boxes, pallets and AMS-02 as one vertex-coloured mesh', () => {
    const geometry = helpers.truss(THREE);
    expect(geometry.userData.partCount).toBe(45);
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
