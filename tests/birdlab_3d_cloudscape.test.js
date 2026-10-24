import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/birdlab_3d_engine.js', 'utf8');

function runtime(reducedMotion = false, quality = 'low') {
  const frames = new Map(); let sequence = 0, stamp = 0, scene;
  class Renderer {
    constructor() { this.shadowMap = {}; this.info = { render: { calls: 1, triangles: 1 } }; }
    setPixelRatio() {} setSize() {} dispose() {} forceContextLoss() {}
    render(value) { scene = value; }
  }
  const local = {
    THREE: { ...THREE, WebGLRenderer: Renderer }, innerWidth: 900, devicePixelRatio: 1,
    addEventListener() {}, removeEventListener() {},
    requestAnimationFrame(callback) { const id = ++sequence; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    AvianWoodlandBirds: { create() {}, supports: () => true },
    BirdLab3DBird: { create: () => ({ root: new THREE.Group(), update() {}, dispose() {} }) },
    BirdLab3DHabitat: { create: () => ({ root: new THREE.Group(), perch: new THREE.Vector3(0, 3.2, 0),
      groundHeight: () => 0, update() {}, dispose() {} }) },
    BirdLab3DWildlife: { create: () => ({ snapshot: () => [], update() {}, dispose() {} }) }
  };
  Function('window', source)(local);
  const canvas = document.createElement('canvas');
  canvas.getBoundingClientRect = () => ({ width: 800, height: 500 });
  document.body.appendChild(canvas);
  const controller = local.BirdLab3D.mount(canvas, { reducedMotion, quality });
  const sky = scene.getObjectByName('birdlab-sky');
  return { controller, sky, scene, frames,
    step(seconds = .05) {
      stamp += seconds * 1000;
      const queued = [...frames.values()]; frames.clear(); queued.forEach(callback => callback(stamp));
    },
    dispose() { controller.dispose(); canvas.remove(); }
  };
}

describe('BirdLab moving cloud canopy', () => {
  it('freezes with playback and resumes from the same weather state, including seek and restart', () => {
    const test = runtime(), uniforms = test.sky.material.uniforms;
    try {
      for (let frame = 0; frame < 20; frame++) test.step();
      expect(uniforms.cloudOffset.value.length()).toBeGreaterThan(0);
      test.controller.setPaused(true);
      const held = uniforms.cloudOffset.value.toArray();
      for (let frame = 0; frame < 40; frame++) test.step();
      expect(uniforms.cloudOffset.value.toArray()).toEqual(held);
      expect(test.frames.size).toBe(0);
      test.controller.setPaused(false); test.step(); test.step();
      expect(uniforms.cloudOffset.value.x).toBeGreaterThan(held[0]);
      test.controller.seek(12);
      expect(uniforms.cloudOffset.value.toArray()).toEqual([12 * .00045, 12 * .00019]);
      test.controller.restart(); expect(uniforms.cloudOffset.value.toArray()).toEqual([0, 0]);
    } finally { test.dispose(); }
  });

  it('keeps decorative weather still with reduced motion even when the lesson is played', () => {
    const test = runtime(true);
    try {
      test.controller.setPaused(false);
      for (let frame = 0; frame < 20; frame++) test.step();
      expect(test.controller.getState().time).toBeGreaterThan(0);
      expect(test.sky.material.uniforms.cloudOffset.value.toArray()).toEqual([0, 0]);
      test.controller.seek(38); expect(test.sky.material.uniforms.cloudOffset.value.toArray()).toEqual([0, 0]);
    } finally { test.dispose(); }
  });

  it('matches sunlight and horizon to the selected lighting without rebuilding the sky', () => {
    const test = runtime(), uniforms = test.sky.material.uniforms, weather = uniforms.cloudField.value;
    try {
      const day = uniforms.cloudLight.value.getHexString();
      for (const [preset, position] of [['golden', [-30, 16, 25]], ['daylight', [-18, 31, 14]]]) {
        test.controller.setLighting(preset);
        expect(uniforms.sunDirection.value.distanceTo(new THREE.Vector3(...position).normalize())).toBeLessThan(1e-12);
        expect(uniforms.bottom.value.equals(test.scene.fog.color)).toBe(true);
        expect(uniforms.cloudField.value).toBe(weather);
        expect(uniforms.cloudLight.value.getHexString() === day).toBe(preset === 'daylight');
      }
      expect(test.sky.material.fog).toBe(false); expect(test.sky.material.depthWrite).toBe(false);
    } finally { test.dispose(); }
  });

  it('owns and releases its weather texture exactly once, with no render work left behind', () => {
    const test = runtime(); let textures = 0, geometries = 0, materials = 0;
    test.sky.material.uniforms.cloudField.value.addEventListener('dispose', () => textures++);
    test.sky.geometry.addEventListener('dispose', () => geometries++);
    test.sky.material.addEventListener('dispose', () => materials++);
    test.dispose(); test.controller.dispose();
    expect([textures, geometries, materials]).toEqual([1, 1, 1]);
    expect(test.frames.size).toBe(0);
  });

  it.each(['low', 'high'])('creates a deterministic continuous repeating weather field in %s quality', quality => {
    const first = runtime(true, quality), second = runtime(true, quality);
    try {
      const texture = first.sky.material.uniforms.cloudField.value, { data, width, height } = texture.image;
      expect(Buffer.from(data).equals(Buffer.from(second.sky.material.uniforms.cloudField.value.image.data))).toBe(true);
      expect(width).toBe(quality === 'low' ? 128 : 256); expect(height).toBe(width);
      expect(texture.wrapS).toBe(THREE.RepeatWrapping); expect(texture.wrapT).toBe(THREE.RepeatWrapping);
      expect(texture.generateMipmaps).toBe(true);
      // Adjacent samples across both wrap boundaries must stay as smooth as
      // the interior, including the independently packed wispy cloud layer.
      let maximumSeam = 0, maximumInteriorStep = 0, minimum = 255, maximum = 0;
      for (let row = 0; row < height; row++) for (const channel of [0, 1]) {
        maximumSeam = Math.max(maximumSeam,
          Math.abs(data[row * width * 4 + channel] - data[(row * width + width - 1) * 4 + channel]),
          Math.abs(data[row * 4 + channel] - data[((height - 1) * width + row) * 4 + channel]));
      }
      for (let index = 0; index < data.length; index += 4) {
        minimum = Math.min(minimum, data[index]); maximum = Math.max(maximum, data[index]);
        const column = (index / 4) % width, row = Math.floor(index / 4 / width);
        for (const channel of [0, 1]) {
          if (column + 1 < width) maximumInteriorStep = Math.max(maximumInteriorStep, Math.abs(data[index + channel] - data[index + 4 + channel]));
          if (row + 1 < height) maximumInteriorStep = Math.max(maximumInteriorStep, Math.abs(data[index + channel] - data[index + width * 4 + channel]));
        }
      }
      expect(maximumSeam).toBeLessThanOrEqual(maximumInteriorStep);
      expect(minimum).toBeLessThan(80); expect(maximum).toBeGreaterThan(170);
    } finally { first.dispose(); second.dispose(); }
  });
});
