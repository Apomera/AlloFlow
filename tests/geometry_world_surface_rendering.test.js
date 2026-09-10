import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_geometryworld.js', 'utf8');
let THREE;
beforeAll(() => {
  const exports = {};
  new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(exports, { exports });
  THREE = exports;
});
function engineFunction(name) {
  const start = source.indexOf('        engine.' + name + ' = function(');
  if (start < 0) throw Error('Missing function ' + name);
  return source.slice(start, source.indexOf('\n        };', start) + '\n        };'.length);
}

describe('shared material roughness', () => {
  for (const kind of ['wood', 'stone', 'brick', 'sand']) {
    it(kind + ' uses bounded linear data and shares one map across blocks', () => {
      const pixels = new Uint8ClampedArray(128 * 128 * 4);
      for (let i = 0; i < pixels.length; i += 4) {
        const v = (i / 4) % 256;
        pixels[i] = pixels[i + 1] = pixels[i + 2] = v;
        pixels[i + 3] = 255;
      }
      const context = { drawImage: vi.fn(), getImageData: () => ({ data: pixels }), putImageData: vi.fn() };
      const spy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
      try {
        const cache = {};
        const start = source.indexOf('        function makeSurfaceRoughnessTexture(');
        const end = source.indexOf('        // Block material cache', start);
        const make = new Function('THREE', '_procTexCache', source.slice(start, end) + '\nreturn makeSurfaceRoughnessTexture;')(THREE, cache);
        const first = make(kind, { image: {} });
        expect(make(kind, { image: {} })).toBe(first);
        expect(context.drawImage).toHaveBeenCalledTimes(1);
        expect(first.encoding).toBe(THREE.LinearEncoding);
        expect(first.wrapS).toBe(THREE.RepeatWrapping);
        expect(first.wrapT).toBe(THREE.RepeatWrapping);
        const values = Array.from(pixels).filter((_, i) => i % 4 === 1);
        expect(Math.min(...values)).toBeGreaterThanOrEqual(200);
        expect(Math.max(...values)).toBe(255);
        expect(new Set(values).size).toBeGreaterThan(10);
        first.dispose();
      } finally { spy.mockRestore(); }
    });
  }

  it('Saver drops surface maps and Balanced restores the same shared maps', () => {
    const normal = new THREE.Texture(), roughness = new THREE.Texture();
    const template = new THREE.MeshStandardMaterial({ normalMap: normal, roughnessMap: roughness });
    template.userData.gwSurfaceKey = 'wood';
    const block = template.clone();
    const engine = {
      _renderProfile: { tier: 'balanced' }, _procTexCache: { woodSurfaceNormal: normal, woodSurfaceRoughness: roughness },
      _matCache: { wood: template }, blocks: { a: { material: block } },
      renderer: { setPixelRatio: vi.fn(), shadowMap: {} },
      _currentLesson: { ground: { x: 10, z: 10 } }, refreshLandscape: vi.fn()
    };
    const resolve = preference => ({ tier: preference, postFx: false, ambientMotion: false, maxPixelRatio: 1, shadows: preference !== 'saver' });
    new Function('engine', 'isMobile', 'container', 'resolveGeometryRenderProfile', engineFunction('applyRenderQuality'))(engine, false, {}, resolve);
    engine.applyRenderQuality('saver');
    for (const material of [template, block]) { expect(material.normalMap).toBeNull(); expect(material.roughnessMap).toBeNull(); }
    engine.applyRenderQuality('balanced');
    for (const material of [template, block]) { expect(material.normalMap).toBe(normal); expect(material.roughnessMap).toBe(roughness); }
    expect(engine.refreshLandscape).toHaveBeenCalledTimes(2);
    engine.applyRenderQuality('balanced');
    expect(engine.refreshLandscape).toHaveBeenCalledTimes(2);
    template.dispose(); block.dispose(); normal.dispose(); roughness.dispose();
  });
});

describe('history keeps rendered corner shading current', () => {
  for (const action of ['undo', 'redo']) {
    it(action + ' removes stale occlusion while preserving the remaining geometry', () => {
      const engine = { blocks: {}, scene: new THREE.Scene(), _undoStack: [], _redoStack: [] };
      const make = (x, y, z) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
        mesh.position.set(x + .5, y + .5, z + .5);
        mesh.userData = { blockType: 'stone', shape: 'cube', gridPos: { x, y, z } };
        engine.blocks[[x, y, z].join(',')] = mesh; engine.scene.add(mesh); return mesh;
      };
      const floor = make(0, 0, 0); make(1, 1, 0);
      const helperStart = source.indexOf('  var GEOMETRY_WORLD_AO_LEVELS');
      const helperEnd = source.indexOf('  window.StemLab.GeometryWorldVertexAo', helperStart);
      const vertexAo = new Function(source.slice(helperStart, helperEnd) + '\nreturn geometryWorldVertexAo;')();
      const aoStart = source.indexOf('        var _aoSeeThrough');
      const aoEnd = source.indexOf('        // Block operations', aoStart);
      const historyStart = source.indexOf('        var MAX_UNDO = 200;');
      const historyEnd = source.indexOf('        // ── Ambient occlusion', historyStart);
      new Function('engine', 'THREE', 'geometryWorldVertexAo', 'upd',
        engineFunction('_disposeBlockMesh') + source.slice(aoStart, aoEnd) + source.slice(historyStart, historyEnd)
      )(engine, THREE, vertexAo, () => {});
      engine.refreshAllAO();
      const before = Array.from(floor.geometry.attributes.color.array);
      expect(Math.min(...before)).toBeLessThan(1);
      const positions = Array.from(floor.geometry.attributes.position.array), indices = Array.from(floor.geometry.index.array);
      const entry = { action: action === 'undo' ? 'place' : 'remove', x: 1, y: 1, z: 0, type: 'stone', shape: 'cube', rotation: 0 };
      engine[action === 'undo' ? '_undoStack' : '_redoStack'].push(entry);
      expect(engine[action]()).toBe(true);
      expect(Array.from(floor.geometry.attributes.color.array).every(v => v === 1)).toBe(true);
      expect(Array.from(floor.geometry.attributes.position.array)).toEqual(positions);
      expect(Array.from(floor.geometry.index.array)).toEqual(indices);
      expect(engine.blocks['1,1,0']).toBeUndefined();
      engine._disposeBlockMesh(floor);
    });
  }
});
