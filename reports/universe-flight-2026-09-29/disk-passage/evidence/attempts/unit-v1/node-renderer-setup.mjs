// Focused renderer diagnostics use this small Node canvas/event mock. Native
// WebGL and the real DOM are exercised by separate browser checks.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const renderer = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/stem_lab/universe_flight_scene.js';
const expected = '255f57893385f5e0ae1a932d00f3ba8e7e98cacc8851bc6ce8985003bd025a75';
if (createHash('sha256').update(fs.readFileSync(renderer)).digest('hex') !== expected) throw new Error('Unexpected installed59 renderer.');
globalThis.window = globalThis;
Object.defineProperty(globalThis, 'devicePixelRatio', { configurable: true, get() { return 1; } });
globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {};
globalThis.requestAnimationFrame = () => 0; globalThis.cancelAnimationFrame = () => {};
globalThis.document = {
  get hidden() { return false; }, addEventListener() {}, removeEventListener() {},
  createElement(tag) {
    if (tag !== 'canvas') throw new Error('Renderer setup only supports canvas elements.');
    return {
      width: 800, height: 500, clientWidth: 800, clientHeight: 500, style: {},
      getContext() { return null; }, toDataURL() { throw new Error('Canvas capture must be mocked in Node diagnostics.'); },
      getBoundingClientRect() { return { width: 800, height: 500, top: 0, left: 0 }; },
      addEventListener() {}, removeEventListener() {}, setAttribute() {}, removeAttribute() {}, focus() {},
    };
  },
};
