import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const THREE = require(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync('stem_lab/stem_lab_module.js', 'utf8');
const factorySource = source.match(/makeOrbitViewer: (function \(cfg\) \{[\s\S]+?          return api;\r?\n        \})/)[1];

async function viewer(camera) {
  const frames = new Map();
  let nextFrame = 0;
  let state;
  class Renderer {
    constructor() {
      this.domElement = { style: {}, clientWidth: 800, clientHeight: 500,
        setAttribute() {}, addEventListener() {}, removeEventListener() {} };
      this.render = vi.fn();
    }
    setPixelRatio() {}
    setClearColor() {}
    setSize(width, height) { this.domElement.width = width; this.domElement.height = height; }
    forceContextLoss() {}
    dispose() {}
  }
  const context = {
    window: { devicePixelRatio: 1, addEventListener() {}, removeEventListener() {}, console: { error: vi.fn() } },
    document: { hidden: false, addEventListener() {}, removeEventListener() {} },
    console: { error: vi.fn() },
    _disposeOrbitFx() {},
    requestAnimationFrame(callback) { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame(id) { frames.delete(id); }
  };
  const build = vi.fn((three, s) => {
    state = s;
    s.target = new three.Vector3(0, 2, 0);
    s.half = new three.Vector3(10, 4, 3);
  });
  const factory = vm.runInNewContext('(' + factorySource + ')', context);
  const api = factory.call({ ensureThree: () => Promise.resolve({ ...THREE, WebGLRenderer: Renderer }) }, {
    fov: 42, build, camera
  });
  const host = { clientWidth: 800, clientHeight: 500,
    appendChild(node) { node.parentNode = this; }, removeChild(node) { node.parentNode = null; } };
  api.attach(host);
  await Promise.resolve();
  await Promise.resolve();
  function push(extra = {}) {
    api.push({ sig: 'one-geometry', static: true, rotY: 26, rotX: 14, zoom: 1, ...extra });
    const entry = frames.entries().next().value;
    expect(entry, 'a data push schedules rendering').toBeTruthy();
    frames.delete(entry[0]);
    entry[1](1000);
  }
  return { api, push, build, frames, get state() { return state; } };
}

describe('shared orbit viewer optional camera', () => {
  it('keeps orbit behavior unchanged when no override is configured', async () => {
    const v = await viewer();
    v.push();
    expect(v.api.status()).toBe('ready');
    expect(v.state.camera.fov).toBe(42);
    expect(v.state.camera.position.distanceTo(v.state.target)).toBeGreaterThan(10);
    expect(v.state.renderer.render).toHaveBeenCalledOnce();
    expect(v.frames.size).toBe(0);
    v.api.dispose();
  });

  it('applies a viewpoint after orbit fitting and restores the original lens and pose without rebuilding', async () => {
    const camera = vi.fn((three, state, data, now) => {
      expect(now).toBe(1000);
      if (data.view !== 'deck') return;
      state.camera.position.set(3, 1.65, 2);
      state.camera.fov = 72;
      state.camera.up.set(0, 0, 1);
      state.camera.lookAt(10, 1.65, 2);
    });
    const v = await viewer(camera);
    v.push({ view: 'orbit' });
    const originalPosition = v.state.camera.position.clone();
    const originalRotation = v.state.camera.quaternion.clone();
    v.push({ view: 'deck' });
    expect(v.state.camera.position.toArray()).toEqual([3, 1.65, 2]);
    expect(v.state.camera.fov).toBe(72);
    v.push({ view: 'orbit' });
    expect(v.state.camera.position.distanceTo(originalPosition)).toBeLessThan(1e-9);
    expect(v.state.camera.quaternion.angleTo(originalRotation)).toBeLessThan(1e-7);
    expect(v.state.camera.fov).toBe(42);
    expect(v.state.camera.up.toArray()).toEqual([0, 1, 0]);
    expect(v.build).toHaveBeenCalledOnce();
    expect(camera).toHaveBeenCalledTimes(3);
    expect(v.frames.size).toBe(0);
    v.api.dispose();
  });

  it('reports a camera failure through the existing fallback status instead of breaking the frame loop', async () => {
    const v = await viewer(() => { throw new Error('viewpoint failed'); });
    const status = vi.fn();
    v.api.onStatusChange(status);
    v.push();
    expect(v.api.status()).toBe('failed');
    expect(status).toHaveBeenLastCalledWith('failed');
    expect(v.state.renderer.render).not.toHaveBeenCalled();
    expect(v.frames.size).toBe(0);
    v.api.dispose();
  });
});
