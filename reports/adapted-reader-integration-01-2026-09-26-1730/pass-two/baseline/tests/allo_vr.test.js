// Tests for allo_vr_module.js — the reusable WebXR layer.
//
// jsdom has no WebXR (navigator.xr is undefined) and no WebGL, so the immersive
// session + controller code can't run here — that needs a headset or the WebXR
// emulator. What IS pinned: (1) it registers the AlloVR API; (2) feature-detect
// degrades safely with no navigator.xr — isSupported → false, no button mounted;
// (3) enable() wires a rig into the scene, flips renderer.xr.enabled, and returns
// a handle without throwing (the 2D-safe, not-yet-presenting path).

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let VR;
beforeAll(() => {
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.AlloVR;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'allo_vr_module.js'), 'utf8'))();
  VR = window.AlloModules.AlloVR;
  if (!VR) throw new Error('AlloVR did not register');
});

// Minimal THREE stub — only what enable()'s non-presenting path touches.
function makeTHREE() {
  function Group() {
    this.children = [];
    this.scale = { setScalar() {} };
    this.position = { set() {} };
    this.rotation = { set() {} };
    this.add = function (o) { this.children.push(o); };
  }
  return { Group };
}

describe('AlloVR — registration + API', () => {
  it('exposes the reusable API', () => {
    expect(VR.version).toBe('allovr/1');
    ['isSupported', 'onSupportChange', 'enable', 'mountButton'].forEach((k) => expect(typeof VR[k]).toBe('function'));
  });
});

describe('AlloVR — feature-detect degrades safely without navigator.xr', () => {
  it('isSupported → false when navigator.xr is absent', () => {
    let got = null;
    VR.isSupported((ok) => { got = ok; });
    expect(got).toBe(false);
  });
  it('onSupportChange fires false and returns an unsubscribe fn', () => {
    let got = null;
    const off = VR.onSupportChange((ok) => { got = ok; });
    expect(got).toBe(false);
    expect(typeof off).toBe('function');
    expect(() => off()).not.toThrow();
  });
  it('mountButton adds NO button when unsupported (no UI clutter)', () => {
    const container = document.createElement('div');
    const cleanup = VR.mountButton(container, { enterVR() {} }, (k, f) => f || k);
    expect(container.children.length).toBe(0);
    cleanup();
  });
});

describe('AlloVR.enable — 2D-safe wiring (not presenting)', () => {
  it('flips renderer.xr.enabled, rigs the camera into the scene, returns a handle', () => {
    const THREE = makeTHREE();
    const scene = { children: [], add(o) { this.children.push(o); } };
    const camera = {};
    const renderer = { xr: {} };
    const h = VR.enable({ THREE, renderer, scene, camera, seat: { position: [0, 0, 5], scale: 1 } });
    expect(typeof h.enterVR).toBe('function');
    expect(typeof h.destroy).toBe('function');
    expect(h.isPresenting()).toBe(false);
    expect(renderer.xr.enabled).toBe(true);
    expect(scene.children.length).toBe(1);          // the rig was added to the scene
    expect(h.rig.children.indexOf(camera)).toBeGreaterThanOrEqual(0);  // camera parented to the rig
    expect(() => h.destroy()).not.toThrow();
  });
  it('returns a safe no-op handle when required objects are missing', () => {
    const h = VR.enable({});
    expect(typeof h.enterVR).toBe('function');
    expect(() => { h.enterVR(); h.destroy(); }).not.toThrow();
    expect(h.isPresenting()).toBe(false);
  });
});
