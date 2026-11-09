// BirdLab 3D seasons: summer is the woodland as built; winter sends the
// Eastern towhee south (no mesh, shadow, binocular subject or camera) and puts
// goldfinches in drab plumage; residents sit tight "in the snow"; the engine
// keeps the light palette, brightens the ground bounce off snow and leaves an
// absent bird's camera.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 120_000 });
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const anatomy = readFileSync('stem_lab/avian_woodland_birds.js', 'utf8');
const behavior = readFileSync('stem_lab/birdlab_3d_wildlife.js', 'utf8');
const engineSource = readFileSync('stem_lab/birdlab_3d_engine.js', 'utf8');

function makeWildlife() {
  const local = {};
  new Function('window', anatomy)(local); new Function('window', behavior)(local);
  return local.BirdLab3DWildlife.create(THREE, new THREE.Scene(), { quality: 'low', seed: 57 });
}
function roam(wildlife, seconds, weather) {
  wildlife.setMode('free'); if (weather) wildlife.setWeather(weather);
  const frames = [];
  for (let frame = 0; frame < seconds * 30; frame++) {
    wildlife.update(frame / 30, 1 / 30);
    if (frame % 30 === 0) frames.push(wildlife.snapshot().map(b => [b.id, b.behavior, ...b.position.map(v => +v.toFixed(5))]));
  }
  return frames;
}

describe('BirdLab woodland residents by season', () => {
  it('leaves summer free roam exactly as it was', () => {
    const plain = makeWildlife(), summer = makeWildlife();
    try {
      summer.setSeason('summer');
      expect(roam(summer, 40)).toEqual(roam(plain, 40));
    } finally { plain.dispose(); summer.dispose(); }
  });

  it('sends only the towhee south in winter and brings it back in summer', () => {
    const wildlife = makeWildlife();
    try {
      const ids = wildlife.snapshot().map(b => b.id);
      expect(ids).toContain('easternTowhee');
      wildlife.setSeason('winter');
      const winter = wildlife.snapshot().map(b => b.id);
      expect(ids.filter(id => !winter.includes(id))).toEqual(['easternTowhee']);
      // Robins, bluebirds and white-throated sparrows partly stay in Maine.
      for (const id of ['robin', 'easternBluebird', 'whiteThroatedSparrow', 'americanGoldfinch', 'chickadee', 'darkEyedJunco']) expect(winter).toContain(id);
      expect(wildlife.isPresent('easternTowhee')).toBe(false);
      expect(wildlife.isPresent('chickadee')).toBe(true);
      expect(wildlife.getFocus('easternTowhee', new THREE.Vector3())).toBeNull();
      expect(wildlife.root.getObjectByName('woodland-easternTowhee').visible).toBe(false);
      expect(wildlife.cueSong('easternTowhee', [{ at: 0, duration: .2, frequency: 3000 }], 0)).toBe(false);
      // Its contact shadow is cleared too.
      const shadow = wildlife.root.getObjectByName('resident-contact-shadows');
      const alpha = shadow.geometry.attributes.blShadowAlpha.array, index = ids.indexOf('easternTowhee');
      wildlife.update(3, 1 / 30);
      expect(Math.max(...alpha.slice(index * 4, index * 4 + 4))).toBe(0);
      for (const bad of ['spring', 'toString', undefined]) wildlife.setSeason(bad);
      expect(wildlife.isPresent('easternTowhee')).toBe(false);
      wildlife.setSeason('summer');
      expect(wildlife.snapshot().map(b => b.id)).toEqual(ids);
      expect(wildlife.root.getObjectByName('woodland-easternTowhee').visible).toBe(true);
      expect(wildlife.getFocus('easternTowhee', new THREE.Vector3())).not.toBeNull();
    } finally { wildlife.dispose(); }
  });

  it('dresses goldfinches for winter only once a season other than summer is chosen', () => {
    const wildlife = makeWildlife();
    try {
      const finch = wildlife.root.getObjectByName('woodland-americanGoldfinch');
      const keys = () => { const out = new Set(); finch.traverse(n => { if (n.material && n.material.vertexColors) out.add(n.material.customProgramCacheKey()); }); return [...out]; };
      wildlife.setSeason('summer');
      expect(keys().some(key => key.includes('goldfinch-drab'))).toBe(false);
      wildlife.setSeason('autumn');
      expect(keys().length).toBeGreaterThan(0);
      expect(keys().every(key => key.includes('goldfinch-drab'))).toBe(true);
      // The drab colour is applied in the shader before lighting.
      const material = []; finch.traverse(n => { if (n.material && n.material.vertexColors) material.push(n.material); });
      const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
      material[0].onBeforeCompile(shader, {});
      expect(shader.uniforms.blDrab.value).toBeCloseTo(.55, 10);
      expect(shader.fragmentShader.indexOf('blDrab*yellow')).toBeGreaterThan(-1);
      expect(shader.fragmentShader.indexOf('blDrab*yellow')).toBeLessThan(shader.fragmentShader.indexOf('#include <lights_physical_fragment>'));
      wildlife.setSeason('winter'); expect(shader.uniforms.blDrab.value).toBe(1);
      wildlife.setSeason('summer'); expect(shader.uniforms.blDrab.value).toBe(0);
      // Other residents keep their programs.
      const jay = wildlife.root.getObjectByName('woodland-blueJay'); let wrapped = false;
      jay.traverse(n => { if (n.material && n.material.customProgramCacheKey && /goldfinch-drab/.test(n.material.customProgramCacheKey())) wrapped = true; });
      expect(wrapped).toBe(false);
    } finally { wildlife.dispose(); }
  });

  it('keeps the absent towhee out of the winter woods and says residents sit tight in the snow', () => {
    const wildlife = makeWildlife();
    try {
      wildlife.setSeason('winter');
      const frames = roam(wildlife, 120, 'rain');
      expect(frames.every(frame => frame.every(row => row[0] !== 'easternTowhee'))).toBe(true);
      const labels = new Set(frames.flat().map(row => row[1]));
      expect(labels.has('Sitting tight in the snow')).toBe(true);
      expect(labels.has('Sitting tight in the rain')).toBe(false);
    } finally { wildlife.dispose(); }
  });
});

function engine() {
  const frames = new Map(), seasons = [], wildSeasons = []; let sequence = 0, scene;
  const present = { easternTowhee: true };
  class Renderer {
    constructor() { this.shadowMap = {}; this.info = { render: { calls: 1, triangles: 1 } }; }
    setPixelRatio() {} setSize() {} dispose() {} forceContextLoss() {}
    render(value) { scene = value; }
  }
  const residents = () => [{ id: 'chickadee', name: 'Chickadee', behavior: 'Scanning', position: [1, 0, 1], heading: 0 }].concat(present.easternTowhee ? [{ id: 'easternTowhee', name: 'Eastern towhee', behavior: 'Scanning', position: [2, 0, 1], heading: 0 }] : []);
  const local = {
    THREE: { ...THREE, WebGLRenderer: Renderer }, innerWidth: 900, devicePixelRatio: 1,
    addEventListener() {}, removeEventListener() {},
    requestAnimationFrame(callback) { const id = ++sequence; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    AvianWoodlandBirds: { create() {}, supports: () => true },
    BirdLab3DBird: { create: () => ({ root: new THREE.Group(), update() {}, dispose() {} }) },
    BirdLab3DHabitat: { create: () => ({ root: new THREE.Group(), perch: new THREE.Vector3(0, 3.2, 0),
      groundHeight: () => 0, update() {}, dispose() {}, setSeason: value => seasons.push(value) }) },
    BirdLab3DWildlife: { create: () => ({ root: new THREE.Group(), snapshot: residents, update() {}, dispose() {}, isShared: () => true,
      getFocus: () => new THREE.Vector3(1, .2, 1), setSeason(value) { wildSeasons.push(value); present.easternTowhee = value !== 'winter'; },
      isPresent: id => id !== 'easternTowhee' || present.easternTowhee }) }
  };
  Function('window', engineSource)(local);
  const canvas = document.createElement('canvas');
  canvas.getBoundingClientRect = () => ({ width: 800, height: 500 });
  document.body.appendChild(canvas);
  const controller = local.BirdLab3D.mount(canvas, { reducedMotion: true, quality: 'low' });
  const hemi = () => scene.children.find(o => o.isHemisphereLight);
  return { controller, seasons, wildSeasons, hemi, scene: () => scene, dispose() { controller.dispose(); canvas.remove(); } };
}

describe('BirdLab 3D engine seasons', () => {
  it('passes the season on, brightens the snow bounce and keeps the light palette', () => {
    const test = engine();
    try {
      expect(test.controller.getState().season).toBe('summer');
      const before = test.hemi().groundColor.clone(), sun = test.scene().getObjectByName('birdlab-key-sun').intensity;
      test.controller.setSeason('winter');
      expect(test.controller.getState().season).toBe('winter');
      expect(test.seasons.at(-1)).toBe('winter'); expect(test.wildSeasons.at(-1)).toBe('winter');
      const snow = test.hemi().groundColor;
      expect(snow.r + snow.g + snow.b).toBeGreaterThan(before.r + before.g + before.b + .5);
      expect(test.scene().getObjectByName('birdlab-key-sun').intensity).toBe(sun);
      expect(test.controller.getState().lighting).toBe('daylight');
      test.controller.setLighting('golden');
      expect(test.controller.getState().season).toBe('winter');
      test.controller.setSeason('summer'); test.controller.setLighting('daylight');
      expect(test.hemi().groundColor.getHexString()).toBe(before.getHexString());
      const calls = test.seasons.length;
      for (const bad of ['spring', 'constructor', undefined, 'summer']) test.controller.setSeason(bad);
      expect(test.seasons.length).toBe(calls);
    } finally { test.dispose(); }
  });

  it('leaves an absent bird’s camera and refuses to return to it', () => {
    const test = engine();
    try {
      test.controller.setCamera('easternTowhee');
      expect(test.controller.getState().camera).toBe('easternTowhee');
      test.controller.setSeason('winter');
      expect(test.controller.getState().camera).toBe('orbit');
      test.controller.setCamera('easternTowhee');
      expect(test.controller.getState().camera).toBe('orbit');
      test.controller.setCamera('chickadee');
      expect(test.controller.getState().camera).toBe('chickadee');
      test.controller.setSeason('autumn');
      test.controller.setCamera('easternTowhee');
      expect(test.controller.getState().camera).toBe('easternTowhee');
    } finally { test.dispose(); }
  });

  it('keeps a custom light direction through a change of season', () => {
    const test = engine();
    try {
      test.controller.setLightStudy(true);
      test.controller.setLightDirection({ azimuth: 40, elevation: 25 });
      const sun = () => test.scene().getObjectByName('birdlab-key-sun').position.toArray();
      const before = sun();
      test.controller.setSeason('winter');
      expect(sun()).toEqual(before);
      expect(test.controller.getState().lightingDirectionCustom).toBe(true);
    } finally { test.dispose(); }
  });
});
