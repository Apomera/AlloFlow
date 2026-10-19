// Scale Explorer Eiffel evening (2026-10-18): one switch lights the city at
// blue hour, and it follows the same 140-degree threshold as the tower lamps.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { createRequire } from 'node:module';
import { sliceBetween } from './helpers/anchored_slice.js';

const FILE = process.env.SCALE_EVENING_SOURCE || 'stem_lab/stem_tool_scaleexplorer.js';
const src = fs.readFileSync(FILE, 'utf8');
const T = createRequire(import.meta.url)(path.resolve('vendor/three-r128/three.min.js'));

function build() {
  const resources = new Set(), context = { T, track: (value) => (resources.add(value), value), eiffelRailAt: () => [0, 0, 0] };
  context.material = (color, options) => { const m = context.track(new T.MeshStandardMaterial(Object.assign({ color, roughness: .78, metalness: 0 }, options || {}))); m.color.convertSRGBToLinear(); m.emissive.convertSRGBToLinear(); return m; };
  context.mesh = (g, geo, mat, x, y, z, sx, sy, sz) => { const m = new T.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); m.scale.set(sx || 1, sy || sx || 1, sz || sx || 1); g.add(m); return m; };
  vm.runInNewContext(sliceBetween(src, '  function eiffelPaint(data,detailId,sunAngle) {', '  // A composed archaeological section', { file: FILE }), context);
  return { plaza: context.buildEiffelPlaza(), paint: context.eiffelPaint };
}
// The fragment as three.js hands it to onBeforeCompile, reduced to the hooks the plaza uses.
const compile = (mat) => { const shader = { uniforms: {}, vertexShader: '#include <common>\n#include <begin_vertex>', fragmentShader: '#include <common>\nvoid main(){\n#include <color_fragment>\n}' }; mat.onBeforeCompile(shader); return shader; };
const byName = (root, name) => { let hit = null; root.traverse((o) => { if (o.name === name) hit = o; }); return hit; };

describe('Scale Explorer Eiffel evening', () => {
  it('lights the windows and the river only through the shared evening switch', () => {
    const { plaza } = build(), night = plaza.userData.parisNight;
    expect(night.value).toBe(0);
    for (const name of ['distant Paris windowed facades', 'the Seine']) {
      const mesh = byName(plaza, name);
      expect(mesh, name).toBeTruthy();
      const shader = compile(mesh.material), frag = shader.fragmentShader;
      expect(shader.uniforms.uParisNight, name).toBe(night);
      expect(frag.includes('uniform float uParisNight;'), name + ' declares the uniform').toBe(true);
      // Every added glow is scaled by the switch, so daylight adds nothing.
      const glows = frag.split('\n').filter((line) => line.includes('totalEmissiveRadiance+='));
      expect(glows.length, name).toBe(1);
      expect(glows[0].includes('*uParisNight*'), name).toBe(true);
      expect(frag.indexOf('totalEmissiveRadiance+='), name + ' glows after the colour pass').toBeGreaterThan(frag.indexOf('diffuseColor.rgb*='));
    }
  });

  it('turns the tower gold and the city on at the same angle the button calls evening', () => {
    const atlas = sliceBetween(src, '      if(focal&&focal.id===\'eiffel\'){', '      if(focal&&focal.id===\'sequoia\'){', { file: FILE });
    expect(atlas.includes('var towerNight=state.sunAngle>=140;'), 'scene threshold').toBe(true);
    expect(atlas.includes("if(state.contrast)scene.background.set('#000000');else scene.background=skyGradient(towerNight?'paris-dusk':'paris-day');"), 'contrast keeps a plain background').toBe(true);
    expect(src.includes('eiffelPlaza.userData.parisNight.value=state.sunAngle>=140&&!state.contrast?1:0;'), 'plaza switch').toBe(true);
    expect(src.includes("data.night=typeof sunAngle==='number'&&isFinite(sunAngle)&&sunAngle>=140;"), 'tower threshold').toBe(true);
    expect(src.includes("canvas.dataset.atlasEiffelLight=state.sunAngle>=140?'evening':'daylight';"), 'reported light').toBe(true);
  });

  it('floodlights the ironwork at night and returns it to bare paint by day', () => {
    // eiffelPaint only needs the meshes and the cabin; a stand-in tower keeps this test off the full model.
    const { paint } = build(), iron = new T.MeshStandardMaterial(), lamp = new T.MeshStandardMaterial();
    iron.userData.eiffelIron = true; lamp.userData.eiffelLamp = true;
    const tower = { meshes: [new T.Mesh(new T.BufferGeometry(), iron), new T.Mesh(new T.BufferGeometry(), lamp)], routePattern: /^tower-\d+$/, cabin: new T.Object3D() };
    paint(tower, '', 45);
    expect(iron.emissiveIntensity).toBe(0);
    paint(tower, '', 160);
    expect(iron.emissiveIntensity).toBeGreaterThanOrEqual(.3);
    expect(lamp.emissiveIntensity).toBeGreaterThan(iron.emissiveIntensity);
    paint(tower, '', 139);
    expect(iron.emissiveIntensity).toBe(0);
  });
});
