import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 45000 });
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const SOURCE = readFileSync(process.env.REEF3D_EXPLORE_SOURCE || 'stem_lab/reef_3d_explore.js', 'utf8');

function causticMap(quality) {
  let renderer;
  class Renderer {
    constructor() { renderer = this; this.shadowMap = {}; this.info = { render: { calls: 1, triangles: 1 } }; this.capabilities = { isWebGL2: true }; this.extensions = { has: () => true }; }
    setPixelRatio() {} setSize() {} dispose() {} forceContextLoss() {}
    render(scene) { this.scene = scene; }
  }
  const local = {
    innerWidth: 1280, devicePixelRatio: 1, console: { warn() {}, error() {} },
    performance: { now: () => 1000 }, requestAnimationFrame: () => 1, cancelAnimationFrame() {},
    setTimeout: () => 1, clearTimeout() {}, addEventListener() {}, removeEventListener() {},
    ResizeObserver: class { observe() {} disconnect() {} }
  };
  new Function('window', SOURCE)(local);
  const canvas = document.createElement('canvas');
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 500 });
  const errors = [];
  const controller = local.Reef3DExplore.mount(canvas, {
    THREE: { ...THREE, WebGLRenderer: Renderer }, quality, onError: (e) => errors.push(e),
    site: { seed: 5101, depthM: 9, health: { coralCover: 0.55, bleaching: 0, algae: 0.05 }, population: [], restoration: null }
  });
  try {
    expect(errors).toEqual([]);
    expect(controller.getState().ready).toBe(true);
    const floor = renderer.scene.getObjectByName('reef-explore-floor');
    const library = THREE.ShaderLib.standard;
    const shader = { uniforms: {}, vertexShader: library.vertexShader, fragmentShader: library.fragmentShader };
    floor.material.onBeforeCompile(shader, renderer);
    return shader.uniforms.reefCausticMap.value;
  } finally { controller.dispose(); canvas.remove(); }
}
function channelStats(texture, channel) {
  const { data, width, height } = texture.image;
  let sum = 0, squares = 0, seamX = 0, seamY = 0, neighborX = 0, neighborY = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const at = (y * width + x) * 4 + channel, value = data[at] / 255;
    sum += value; squares += value * value;
    if (x === 0) seamX += Math.abs(data[at] - data[(y * width + width - 1) * 4 + channel]);
    else neighborX += Math.abs(data[at] - data[at - 4]);
    if (y === 0) seamY += Math.abs(data[at] - data[((height - 1) * width + x) * 4 + channel]);
    else neighborY += Math.abs(data[at] - data[at - width * 4]);
  }
  return { mean: sum / (width * height), rms: Math.sqrt(squares / (width * height)), seamX: seamX / height, seamY: seamY / width, neighborX: neighborX / (height * (width - 1)), neighborY: neighborY / (width * (height - 1)) };
}

describe('reef caustic optics', () => {
  it('binds focused and depth-softened irradiance with equal energy in both quality tiers', () => {
    for (const quality of ['low', 'high']) {
      const texture = causticMap(quality), sharp = channelStats(texture, 0), soft = channelStats(texture, 1);
      expect(texture.isDataTexture).toBe(true);
      expect(texture.image.width).toBe(quality === 'high' ? 256 : 128);
      expect(texture.wrapS).toBe(THREE.RepeatWrapping);
      expect(texture.wrapT).toBe(THREE.RepeatWrapping);
      expect(texture.minFilter).toBe(THREE.LinearMipmapLinearFilter);
      expect(texture.generateMipmaps).toBe(true);
      // A missing green channel would make the reef darken as the shader
      // shifts to its depth-softened field. Blurring must preserve energy.
      expect(sharp.mean).toBeGreaterThan(0.05);
      expect(sharp.mean).toBeLessThan(0.2);
      expect(Math.abs(soft.mean - sharp.mean)).toBeLessThan(0.003);
      expect(soft.rms).toBeLessThan(sharp.rms * 0.93);
      expect(soft.rms).toBeGreaterThan(soft.mean * 1.3);
      for (const stats of [sharp, soft]) {
        // Adjacent texel centers across the repeat boundary need not match;
        // their change must remain comparable to the interior gradients.
        expect(stats.seamX).toBeLessThan(stats.neighborX * 2.5 + 1);
        expect(stats.seamY).toBeLessThan(stats.neighborY * 2.5 + 1);
      }
    }
  });

  it('repeats the same irradiance bake exactly without consuming a site placement stream', () => {
    // Capture the actual private bake in its original closure; this avoids
    // mounting another complete reef solely to compare a small data map.
    const marker = 'function createCausticTexture(T, size) {';
    expect(SOURCE).toContain(marker);
    const local = {};
    new Function('window', SOURCE.replace(marker, 'global.__testCausticBake = createCausticTexture;\n  ' + marker))(local);
    for (const size of [128, 256]) {
      const first = local.__testCausticBake(THREE, size), second = local.__testCausticBake(THREE, size);
      try { expect(second.image.data).toEqual(first.image.data); }
      finally { first.dispose(); second.dispose(); }
    }
  });
});
