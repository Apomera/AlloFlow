// Focused Node renderer diagnostics. Native WebGL and the real DOM use a
// separate browser harness; this file intentionally supplies only mock APIs.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const stage = 'C:/Users/cabba/Documents/Codex/2026-09-29/new-chat-3/universe-close-projection58';
const candidate = fs.readFileSync(path.join(repo, 'stem_lab/universe_flight_scene.js'));
const expected = '6f1267255407b7de52bb685922281301fef58de9c91cc8a036577a7c317e56e8';
if (createHash('sha256').update(candidate).digest('hex') !== expected) throw new Error('Unexpected candidate renderer.');
globalThis.__universeCloseBaselineSource = fs.readFileSync(path.join(stage, 'baseline-renderer.js'), 'utf8');
globalThis.window = globalThis;
Object.defineProperty(globalThis, 'devicePixelRatio', { configurable: true, get() { return 1; } });
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};
globalThis.document = {
  get hidden() { return false; }, addEventListener() {}, removeEventListener() {},
  createElement(tag) {
    if (tag !== 'canvas') throw new Error('Renderer setup only supports canvas elements.');
    return {
      width: 800, height: 500, clientWidth: 800, clientHeight: 500, style: {},
      getContext() { return null; },
      toDataURL() { throw new Error('Canvas capture must be mocked in Node diagnostics.'); },
      getBoundingClientRect() { return { width: 800, height: 500, top: 0, left: 0 }; },
      addEventListener() {}, removeEventListener() {}, setAttribute() {}, removeAttribute() {}, focus() {},
    };
  },
};
