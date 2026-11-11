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

  it('sends the towhee, chipping sparrow and hermit thrush south in winter, and brings the tree sparrow in', () => {
    const wildlife = makeWildlife();
    try {
      const ids = wildlife.snapshot().map(b => b.id);
      expect(ids).toContain('easternTowhee');
      wildlife.setSeason('winter');
      const winter = wildlife.snapshot().map(b => b.id);
      expect(ids.filter(id => !winter.includes(id))).toEqual(['easternTowhee', 'chippingSparrow', 'hermitThrush']);
      // The American tree sparrow nests in the far north and is here only in winter.
      expect(ids).not.toContain('americanTreeSparrow');
      expect(winter.filter(id => !ids.includes(id))).toEqual(['americanTreeSparrow']);
      expect(wildlife.root.getObjectByName('woodland-americanTreeSparrow').visible).toBe(true);
      for (const season of ['spring', 'autumn', 'summer']) { wildlife.setSeason(season); expect(wildlife.isPresent('americanTreeSparrow'), season).toBe(false); expect(wildlife.root.getObjectByName('woodland-americanTreeSparrow').visible, season).toBe(false); }
      wildlife.setSeason('winter');
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
      for (const bad of ['monsoon', 'toString', undefined]) wildlife.setSeason(bad);
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

// Each print the tracks mesh holds: centre, and the frame it was pressed.
function prints(wildlife, seconds, onFrame) {
  wildlife.setMode('free');
  const out = []; let seen = 0;
  for (let frame = 0; frame < seconds * 30; frame++) {
    wildlife.update(frame / 30, 1 / 30);
    if (onFrame) onFrame(frame);
    const mesh = wildlife.root.getObjectByName('snow-tracks'); if (!mesh) continue;
    const p = mesh.geometry.attributes.position.array, a = mesh.geometry.attributes.blTrackAlpha.array;
    let live = 0; for (let q = 0; q < a.length / 4; q++) if (a[q * 4] > 0) live++;
    for (let q = seen; q < live; q++) out.push({ x: (p[q * 12] + p[q * 12 + 6]) / 2, z: (p[q * 12 + 2] + p[q * 12 + 8]) / 2, frame, birds: wildlife.snapshot() });
    seen = live;
  }
  return out;
}
const nearest = (print) => print.birds.reduce((best, b) => { const d = Math.hypot(b.position[0] - print.x, b.position[2] - print.z); return d < best.d ? { id: b.id, d } : best; }, { id: null, d: 9 }).id;

describe('BirdLab residents in spring', () => {
  it('has every resident back, goldfinches partway into yellow, and no snow tracks', () => {
    const wildlife = makeWildlife();
    try {
      const all = wildlife.snapshot().map(b => b.id);
      wildlife.setSeason('winter'); wildlife.setSeason('spring');
      expect(wildlife.snapshot().map(b => b.id)).toEqual(all);
      const finch = wildlife.root.getObjectByName('woodland-americanGoldfinch'); let material;
      finch.traverse(n => { if (!material && n.material && n.material.vertexColors) material = n.material; });
      const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
      material.onBeforeCompile(shader, {});
      expect(shader.uniforms.blDrab.value).toBeGreaterThan(0);
      expect(shader.uniforms.blDrab.value).toBeLessThan(.55); // brighter than the autumn molt
      expect(prints(wildlife, 20)).toEqual([]);
    } finally { wildlife.dispose(); }
  });
});

describe('BirdLab tracks in the snow', () => {
  it('presses no tracks outside winter', () => {
    const wildlife = makeWildlife();
    try {
      wildlife.setSeason('autumn');
      expect(prints(wildlife, 30)).toEqual([]);
      expect(wildlife.root.getObjectByName('snow-tracks')).toBeUndefined();
    } finally { wildlife.dispose(); }
  });

  it('leaves side-by-side pairs from hoppers and alternating single prints from walkers', () => {
    const wildlife = makeWildlife();
    try {
      wildlife.setSeason('winter');
      const list = prints(wildlife, 60), by = {};
      list.forEach(p => { const id = nearest(p); (by[id] ||= []).push(p); });
      expect(Object.keys(by)).not.toContain('easternTowhee');
      // Hoppers land with both feet at once: their prints come two to a frame.
      const paired = id => { const frames = {}; by[id].forEach(p => { frames[p.frame] = (frames[p.frame] || 0) + 1; }); const counts = Object.values(frames); return counts.filter(n => n === 2).length / counts.length; };
      for (const id of ['darkEyedJunco', 'northernCardinal', 'whiteThroatedSparrow']) { expect(by[id].length, id).toBeGreaterThan(6); expect(paired(id), id).toBeGreaterThan(.8); }
      // Walkers set one foot down at a time after their first stance.
      for (const id of ['mourningDove', 'blueJay']) { expect(by[id].length, id).toBeGreaterThan(6); expect(paired(id), id).toBeLessThan(.5); }
      // Every print is pressed under its bird, not left in the air.
      const gap = p => Math.min(...p.birds.map(b => Math.hypot(b.position[0] - p.x, b.position[2] - p.z)));
      expect(Math.max(...list.map(gap))).toBeLessThan(.12);
    } finally { wildlife.dispose(); }
  });

  it('fades old prints, faster under falling snow, and clears them when the season changes', () => {
    const alphaAt = (wildlife) => Array.from(wildlife.root.getObjectByName('snow-tracks').geometry.attributes.blTrackAlpha.array.filter((_, i) => i % 4 === 0).slice(0, 4));
    const clear = makeWildlife(), snowing = makeWildlife();
    try {
      clear.setSeason('winter'); snowing.setSeason('winter'); snowing.setWeather('rain');
      prints(clear, 70); prints(snowing, 70);
      const fresh = Math.max(...alphaAt(clear));
      expect(fresh).toBeGreaterThan(.8);
      expect(Math.max(...alphaAt(snowing)), 'falling snow fills the first prints in').toBeLessThan(fresh);
      clear.setSeason('summer');
      expect(clear.root.getObjectByName('snow-tracks').visible).toBe(false);
      expect(Math.max(...alphaAt(clear))).toBe(0);
    } finally { clear.dispose(); snowing.dispose(); }
  });
});

describe('BirdLab food through the seasons', () => {
  const SOURCES = [
    { id: 'feeder', kind: 'seed', label: 'Seed', place: 'the feeder', eat: 'Eating seed', x: 2.9, z: -1.9, radius: .55, regrow: .03 },
    { id: 'leaf-litter', kind: 'insect', label: 'Insects', place: 'the leaf litter', eat: 'Scratching leaf litter', x: -2.6, z: 2.6, radius: .6, regrow: .02 },
    { id: 'lawn', kind: 'worm', label: 'Earthworms', place: 'the lawn', eat: 'Pulling earthworms', x: 2.4, z: 2.9, radius: .7, regrow: .015 },
    { id: 'oak', kind: 'acorn', label: 'Acorns', place: 'the oak', eat: 'Taking acorns', x: .6, z: 4.2, radius: .6, regrow: .008 }
  ];
  function feed(season, seconds = 120) {
    const wildlife = makeWildlife();
    try {
      if (season) wildlife.setSeason(season);
      wildlife.setFeedingStudy(SOURCES); wildlife.setMode('free');
      const levels = [], eaten = new Set();
      for (let frame = 0; frame < seconds * 30; frame++) {
        wildlife.update(frame / 30, 1 / 30);
        if (frame % 30 === 0) { levels.push(wildlife.foodLevels().map(s => +s.amount.toFixed(6))); wildlife.snapshot().forEach(b => { if (b.food) eaten.add(b.food.kind); }); }
      }
      return { levels, eaten };
    } finally { wildlife.dispose(); }
  }
  it('keeps summer feeding exactly as it was', () => {
    expect(feed('summer', 60)).toEqual(feed(null, 60));
  });
  it('leaves few acorns in spring, so birds turn to earthworms and insects', () => {
    const spring = feed('spring', 90);
    expect(spring.levels.every(row => row[3] <= .4)).toBe(true);
    expect(spring.eaten.has('worm') || spring.eaten.has('insect')).toBe(true);
    // Soil foods are available again after winter.
    expect(Math.max(...spring.levels.map(row => row[2]))).toBeGreaterThan(.5);
  });
  it('leaves frozen winter ground without earthworms and few insects', () => {
    const winter = feed('winter');
    expect(winter.levels.every(row => row[2] === 0)).toBe(true);
    expect(winter.levels.every(row => row[1] <= .25)).toBe(true);
    expect(winter.eaten.has('worm')).toBe(false);
    expect(winter.eaten.has('seed')).toBe(true);
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
      for (const bad of ['monsoon', 'constructor', undefined, 'summer']) test.controller.setSeason(bad);
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
