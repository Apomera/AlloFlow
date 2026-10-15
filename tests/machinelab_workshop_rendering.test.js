import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const THREE = require('../vendor/three-r128/three.min.js');
const source = fs.readFileSync('stem_lab/stem_tool_machinelab.js', 'utf8');
const viewers = {};
vm.runInNewContext(source, {
  window: { StemLab: {
    registerTool() {},
    makeOrbitViewer(options) {
      viewers[options.attr] = options;
      return { attach() {}, push() {}, status() { return 'ready'; }, onStatusChange() {} };
    }
  } },
  console, setTimeout, clearTimeout
});
const workshop = viewers['data-machinelab-shop-gl'];

function makeScene(theme) {
  const renderer = {
    shadowMap: {},
    domElement: { clientWidth: 800, clientHeight: 440 },
    setClearColor(color, alpha) { this.clearColor = new THREE.Color(color); this.clearAlpha = alpha; }
  };
  const state = {
    renderer, model: new THREE.Group(), scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(42, 800 / 440, 0.1, 100),
    data: { demoId: 0, motionProgress: 0.5, rotY: 28, rotX: 16 }
  };
  workshop.lights(THREE, state.scene, state);
  workshop.build(THREE, state, { kind: 'windlass', params: {}, ...theme });
  return state;
}

describe('Machine Lab: clear workshop rendering', () => {
  it('keeps the pale workshop background out of bloom while retaining lit, reflective materials', () => {
    // A whole-scene bloom pass also amplifies the light theme's background,
    // clipping its backdrop, labels and distance rails to white.
    expect(workshop.bloom).toBeFalsy();
    expect(workshop.env).toBe(true);
    const state = makeScene({ dark: false, contrast: false });
    const lights = state.scene.children.filter(child => child.isLight);
    expect(lights.some(light => light.isAmbientLight && light.intensity > 0)).toBe(true);
    expect(lights.some(light => light.isDirectionalLight && light.intensity > 0 && light.castShadow)).toBe(true);
    expect(lights.every(light => Number.isFinite(light.intensity))).toBe(true);
    expect(state.renderer.shadowMap.enabled).toBe(true);
    const materials = [];
    state.model.traverse(child => { if (child.material) materials.push(child.material); });
    expect(materials.some(material => material.isMeshStandardMaterial && material.metalness > 0)).toBe(true);
  });

  for (const theme of [
    { name: 'light', dark: false, contrast: false, background: 0xeaf0f6 },
    { name: 'dark', dark: true, contrast: false, background: 0x07111f },
    { name: 'high contrast', dark: true, contrast: true, background: 0x000000 }
  ]) {
    it(`preserves the ${theme.name} backdrop when inspecting and restoring the room`, () => {
      const state = makeScene(theme);
      for (const focused of [false, true, false]) {
        state.data.focusMechanism = focused;
        state.tick(0);
        expect(state.renderer.clearColor.getHex()).toBe(theme.background);
        expect(state.renderer.clearAlpha).toBe(1);
        expect(state.mlDemo.room.visible).toBe(!focused);
        if (theme.contrast) expect(state.scene.fog).toBeNull();
        else {
          expect(state.scene.fog.color.getHex()).toBe(theme.background);
          expect(state.scene.fog.near).toBeGreaterThan(0);
          expect(state.scene.fog.far).toBeGreaterThan(state.scene.fog.near);
        }
      }
    });
  }

  for (const dark of [false, true]) {
    it(`clears ${dark ? 'dark' : 'light'} theme haze when the existing viewer switches to high contrast`, () => {
      const state = makeScene({ dark, contrast: false });
      expect(state.scene.fog).not.toBeNull();
      // The viewer rebuilds its model while retaining the scene and renderer.
      // A fresh high-contrast mount would miss stale fog from a previous theme.
      state.model.clear();
      workshop.build(THREE, state, { kind: 'windlass', params: {}, dark: true, contrast: true });
      state.tick(0);
      expect(state.scene.fog).toBeNull();
      expect(state.renderer.clearColor.getHex()).toBe(0x000000);
      expect(state.renderer.clearAlpha).toBe(1);
      state.model.clear();
      workshop.build(THREE, state, { kind: 'windlass', params: {}, dark, contrast: false });
      state.tick(0);
      expect(state.scene.fog.color.getHex()).toBe(dark ? 0x07111f : 0xeaf0f6);
      expect(state.renderer.clearColor.getHex()).toBe(dark ? 0x07111f : 0xeaf0f6);
    });
  }
});
