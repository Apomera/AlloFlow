import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const source = readFileSync('stem_lab/avian_feather_art.js', 'utf8');
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');

// Canvas is the boundary here, not the implementation under test. Vector
// painting is recorded for deterministic ownership checks; the data-texture
// tests below use actual input and output pixels without a GPU dependency.
function canvasBoundary() {
  const created = [];
  const document = {
    createElement(tag) {
      if (tag !== 'canvas') throw new Error(`Unexpected DOM allocation: ${tag}`);
      const commands = createHash('sha256');
      let pixels;
      const canvas = { width: 300, height: 150 };
      const record = (operation, args) => commands.update(JSON.stringify([operation, args]));
      const context = {
        canvas,
        createImageData(width, height) {
          return { width, height, data: new Uint8ClampedArray(width * height * 4) };
        },
        getImageData(x, y, width, height) {
          if (x || y || width !== canvas.width || height !== canvas.height) {
            throw new Error('Fixture expects a complete image read');
          }
          return { width, height, data: pixels ? pixels.slice() : new Uint8ClampedArray(width * height * 4) };
        },
        putImageData(image, x, y) {
          if (x || y || image.width !== canvas.width || image.height !== canvas.height) {
            throw new Error('Fixture expects a complete image write');
          }
          pixels = image.data.slice();
        },
      };
      for (const operation of ['save', 'restore', 'translate', 'rotate', 'beginPath', 'closePath', 'rect', 'clip',
        'fillRect', 'clearRect', 'moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'stroke', 'fill']) {
        context[operation] = (...args) => record(operation, args);
      }
      for (const operation of ['createLinearGradient', 'createRadialGradient']) {
        context[operation] = (...args) => {
          const gradient = { operation, args, stops: [] };
          record(operation, args);
          gradient.addColorStop = (offset, color) => {
            gradient.stops.push([offset, color]);
            record('addColorStop', [offset, color]);
          };
          return gradient;
        };
      }
      const recordedContext = new Proxy(context, {
        set(target, property, value) {
          record(`set:${property}`, value);
          target[property] = value;
          return true;
        },
      });
      canvas.getContext = (kind) => {
        if (kind !== '2d') throw new Error(`Unexpected graphics context: ${kind}`);
        return recordedContext;
      };
      canvas.commandDigest = () => commands.copy().digest('hex');
      created.push(canvas);
      return canvas;
    },
  };
  const window = {};
  new Function('window', 'document', source)(window, document);
  return { api: window.AvianFeatherArt, window, document, created };
}

function fixtureCanvas(document, width, height, valueAt) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  const image = context.createImageData(width, height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const offset = (y * width + x) * 4;
    image.data.fill(valueAt(x, y), offset, offset + 3);
    image.data[offset + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

const pixelsOf = (canvas) => canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
const digest = (data) => createHash('sha256').update(data).digest('hex');

describe('Shared avian feather artwork', () => {
  it('loads independently of Three.js and allocates graphics only when requested', () => {
    const { api, window, created } = canvasBoundary();
    expect(Object.keys(window)).toEqual(['AvianFeatherArt']);
    expect(typeof api.createFlightFeatherCanvas).toBe('function');
    expect(typeof api.createVaneDetailCanvases).toBe('function');
    expect(typeof api.applyVaneGrain).toBe('function');
    expect(typeof api.vaneGrainCacheKey).toBe('function');
    expect(created).toHaveLength(0);
  });

  it('gives each consumer fresh canvases and supports both atlas and single-feather UVs', () => {
    const { api } = canvasBoundary();
    const atlas = api.createFlightFeatherCanvas();
    const anotherAtlas = api.createFlightFeatherCanvas();
    const singleFeather = api.createFlightFeatherCanvas({ variants: 1 });
    expect([atlas.width, atlas.height]).toEqual([1024, 512]);
    expect([singleFeather.width, singleFeather.height]).toEqual([256, 512]);
    expect(atlas).not.toBe(anotherAtlas);
    atlas.width = 1;
    expect(anotherAtlas.width).toBe(1024);
    expect(singleFeather.width).toBe(256);
  });

  it('repaints deterministically after other consumers request different feather types', () => {
    const { api } = canvasBoundary();
    const first = api.createFlightFeatherCanvas().commandDigest();
    const tail = api.createFlightFeatherCanvas({ tail: true }).commandDigest();
    const contour = api.createFlightFeatherCanvas({ contourFeather: true }).commandDigest();
    api.createFlightFeatherCanvas({ variants: 1, tail: true });
    expect(api.createFlightFeatherCanvas().commandDigest()).toBe(first);
    expect(new Set([first, tail, contour]).size).toBe(3);
  });

  it('does not sample neighboring atlas tiles while constructing normals', () => {
    const { api, document } = canvasBoundary();
    const canvas = fixtureCanvas(document, 8, 5, (x) => x < 4 ? 0 : 255);
    const detail = api.createVaneDetailCanvases(canvas, { tileWidth: 4, curveStrength: 0 });
    const normal = pixelsOf(detail.normal);
    // A stark seam between two individually flat vanes must not become a
    // false ridge at either side of their boundary.
    for (let offset = 0; offset < normal.length; offset += 4) {
      expect([...normal.subarray(offset, offset + 4)]).toEqual([128, 128, 255, 255]);
    }
    const changedNeighbor = fixtureCanvas(document, 8, 5, (x, y) => x < 4 ? 0 : ((x + y) % 2) * 255);
    const changed = pixelsOf(api.createVaneDetailCanvases(changedNeighbor, { tileWidth: 4, curveStrength: 0 }).normal);
    for (let y = 0; y < 5; y++) {
      const start = y * 8 * 4;
      expect(changed.subarray(start, start + 16)).toEqual(normal.subarray(start, start + 16));
    }
  });

  it('encodes signed, normalized vectors directly in linear data channels', () => {
    const { api, document } = canvasBoundary();
    const ramp = fixtureCanvas(document, 9, 9, (x, y) => 16 * x + 8 * y);
    const normal = pixelsOf(api.createVaneDetailCanvases(ramp, { tileWidth: 9, curveStrength: 0 }).normal);
    const center = (4 * 9 + 4) * 4;
    expect(normal[center]).toBeLessThan(128);
    expect(normal[center + 1]).toBeGreaterThan(128);
    for (let offset = 0; offset < normal.length; offset += 4) {
      const decoded = [...normal.subarray(offset, offset + 3)].map((value) => value / 255 * 2 - 1);
      expect(Math.hypot(...decoded)).toBeCloseTo(1, 2);
      expect(decoded[2]).toBeGreaterThan(0);
      expect(normal[offset + 3]).toBe(255);
    }
  });

  it('produces opaque, matte roughness with bounded and configurable values', () => {
    const { api, document } = canvasBoundary();
    const source = fixtureCanvas(document, 256, 1, (x) => x);
    const defaults = pixelsOf(api.createVaneDetailCanvases(source).roughness);
    expect([...defaults.subarray(0, 4)]).toEqual([252, 252, 252, 255]);
    expect([...defaults.subarray(255 * 4)]).toEqual([230, 230, 230, 255]);
    for (let offset = 0; offset < defaults.length; offset += 4) {
      expect(defaults[offset]).toBeGreaterThanOrEqual(230);
      expect(defaults[offset]).toBeLessThanOrEqual(252);
      expect(defaults[offset + 1]).toBe(defaults[offset]);
      expect(defaults[offset + 2]).toBe(defaults[offset]);
      expect(defaults[offset + 3]).toBe(255);
    }
    const configured = pixelsOf(api.createVaneDetailCanvases(source, { roughnessBase: 20, roughnessRange: 50 }).roughness);
    expect([...configured.subarray(0, 4)]).toEqual([70, 70, 70, 255]);
    expect([...configured.subarray(255 * 4)]).toEqual([20, 20, 20, 255]);
  });

  it('creates independent detail maps without modifying source art or previous results', () => {
    const { api, document } = canvasBoundary();
    const source = fixtureCanvas(document, 8, 8, (x, y) => x * 15 + y * 9);
    const before = digest(pixelsOf(source));
    const first = api.createVaneDetailCanvases(source, { tileWidth: 4 });
    const repeated = api.createVaneDetailCanvases(source, { tileWidth: 4 });
    expect(new Set([source, first.normal, first.roughness, repeated.normal, repeated.roughness]).size).toBe(5);
    expect(digest(pixelsOf(first.normal))).toBe(digest(pixelsOf(repeated.normal)));
    expect(digest(pixelsOf(first.roughness))).toBe(digest(pixelsOf(repeated.roughness)));
    const previousNormal = digest(pixelsOf(first.normal));
    const previousRoughness = digest(pixelsOf(first.roughness));
    api.createVaneDetailCanvases(source, { tileWidth: 4, reliefStrength: 0, curveStrength: 0, roughnessBase: 5 });
    expect(digest(pixelsOf(first.normal))).toBe(previousNormal);
    expect(digest(pixelsOf(first.roughness))).toBe(previousRoughness);
    expect(digest(pixelsOf(source))).toBe(before);
  });
});

function standardShader() {
  return {
    uniforms: { speciesPigment: { value: 'consumer-owned' } },
    vertexShader: THREE.ShaderLib.standard.vertexShader,
    fragmentShader: THREE.ShaderLib.standard.fragmentShader,
  };
}

describe('Shared avian feather shader detail', () => {
  it('supports the atlas and whole-vane UV layouts with distinct contour and flight programs', () => {
    const { api } = canvasBoundary();
    const programs = new Map();
    for (const variants of [1, 4]) for (const contourFeather of [false, true]) {
      const shader = standardShader();
      const options = { variants, contourFeather };
      expect(api.applyVaneGrain(shader, options)).toBe(shader);
      const key = api.vaneGrainCacheKey(options);
      expect(shader.fragmentShader).toContain(`avian-vane-grain:${key}`);
      // The two consumers lay out their vanes differently; deriving local
      // coordinates with the wrong tile count would paint four shafts on a
      // Raptor feather, or stretch one shaft across BirdLab's whole atlas.
      expect(shader.fragmentShader).toContain(`fract(vUv.x*${variants}.0)`);
      programs.set(key, shader.fragmentShader);
    }
    expect(programs.size).toBe(4);
    expect(new Set(programs.values()).size).toBe(4);
    expect(api.vaneGrainCacheKey()).toBe(api.vaneGrainCacheKey({ variants: 4, contourFeather: false }));
    expect(api.vaneGrainCacheKey({ contourFeather: true, variants: 1 }))
      .toBe(api.vaneGrainCacheKey({ variants: 1, contourFeather: true }));
  });

  it('is deterministic, allocates no resources and leaves shared shader state untouched', () => {
    const { api, created } = canvasBoundary();
    const chunks = { ...THREE.ShaderChunk };
    const template = { ...THREE.ShaderLib.standard };
    const random = vi.spyOn(Math, 'random');
    try {
      const first = standardShader(), uniforms = first.uniforms;
      const vertex = first.vertexShader;
      api.applyVaneGrain(first, { variants: 1 });
      api.applyVaneGrain(standardShader(), { variants: 4, contourFeather: true });
      const repeated = standardShader();
      api.applyVaneGrain(repeated, { variants: 1 });
      expect(first.fragmentShader).toBe(repeated.fragmentShader);
      expect(first.vertexShader).toBe(vertex);
      expect(first.uniforms).toBe(uniforms);
      expect(first.uniforms).toEqual({ speciesPigment: { value: 'consumer-owned' } });
      expect(created).toHaveLength(0);
      expect(random).not.toHaveBeenCalled();
      expect(THREE.ShaderChunk).toEqual(chunks);
      expect(THREE.ShaderLib.standard).toEqual(template);
    } finally { random.mockRestore(); }
  });

  it('applies once to a program and refuses an incompatible second UV layout', () => {
    const { api } = canvasBoundary(), shader = standardShader();
    api.applyVaneGrain(shader, { variants: 1, contourFeather: true });
    const first = shader.fragmentShader;
    api.applyVaneGrain(shader, { contourFeather: true, variants: 1 });
    expect(shader.fragmentShader).toBe(first);
    expect(shader.fragmentShader.match(/avian-vane-grain:/g)).toHaveLength(1);
    expect(() => api.applyVaneGrain(shader, { variants: 4, contourFeather: true })).toThrow();
    expect(shader.fragmentShader).toBe(first);
  });

  it('keeps consumer pigment, deformation and downstream lighting while filtering fine detail', () => {
    const { api } = canvasBoundary(), shader = standardShader();
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n// existing articulated feather deformation');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <map_fragment>', '#include <map_fragment>\n// existing species atlas sampling')
      .replace('#include <color_fragment>', '// existing chest and underwing field marks\n#include <color_fragment>')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n// existing scene contrast');
    api.applyVaneGrain(shader, { variants: 1 });
    expect(shader.vertexShader).toContain('existing articulated feather deformation');
    for (const text of ['existing species atlas sampling', 'existing chest and underwing field marks', 'existing scene contrast']) {
      expect(shader.fragmentShader).toContain(text);
    }
    // Both fine barbs and broader bundles fade with pixel footprint; the
    // shader should not leave an unfiltered periodic pattern at a distance.
    expect(shader.fragmentShader).toMatch(/fwidth\(blBarb\)/);
    expect(shader.fragmentShader).toMatch(/fwidth\(blBundle\)/);
    expect(shader.fragmentShader).toMatch(/fwidth\(blAcross\)/);
    expect(shader.fragmentShader.match(/#include <color_fragment>/g)).toHaveLength(1);
    expect(shader.fragmentShader.indexOf('existing chest and underwing field marks'))
      .toBeLessThan(shader.fragmentShader.indexOf('float blFiber='));
    expect(shader.fragmentShader.indexOf('float blFiber='))
      .toBeLessThan(shader.fragmentShader.indexOf('existing scene contrast'));
  });

  it('rejects invalid layouts and incompatible shader inputs without partially changing the program', () => {
    const { api } = canvasBoundary();
    for (const variants of [0, 2, -1, NaN, '4']) {
      const shader = standardShader(), before = { ...shader };
      expect(() => api.vaneGrainCacheKey({ variants })).toThrow();
      expect(() => api.applyVaneGrain(shader, { variants })).toThrow();
      expect(shader).toEqual(before);
    }
    for (const shader of [null, {}, { fragmentShader: 'void main() {}' }]) {
      expect(() => api.applyVaneGrain(shader)).toThrow();
    }
  });
});
