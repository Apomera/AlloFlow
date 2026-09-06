// Operate every control on every tab of a STEM tool and report handler crashes.
//
//   node dev-tools/stem_interact_fuzz.mjs <toolId> [tab,tab,...]
//   node dev-tools/stem_interact_fuzz.mjs migration flight3d,vformation,wind,routes,world,aero,navigate,inquiry
//
// Why: state fuzzing (stem_state_fuzz.mjs) exercises what a tool READS. This
// exercises what it DOES -- every onClick, onChange and onKeyDown a student can
// trigger, plus mouse and touch gestures on each canvas. A handler that throws
// is a crash the student caused by clicking, which is the worst kind, and in a
// normal test suite almost none of them ever run.
//
// Two things this probe had to learn:
//  - The tab bar is rendered on every tab, and clicking it NAVIGATES. Left
//    alone, every run drifted onto whichever tab button was clicked last and
//    the per-tab counts came out identical. Writes to `tab` are dropped so a
//    run stays on the tab it was given.
//  - "0 crashes" is only meaningful if the handlers ran. Store mutations are
//    counted per tab and a tab whose controls changed nothing is reported as a
//    probe failure, not a pass.
import path from 'node:path';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const TOOL_ID = args[0];
if (!TOOL_ID) { console.error('usage: node dev-tools/stem_interact_fuzz.mjs <toolId> [tab,tab,...]'); process.exit(2); }
const ROOT = process.cwd();
const toolPath = path.join(ROOT, 'stem_lab', 'stem_tool_' + TOOL_ID + '.js');
if (!existsSync(toolPath)) { console.error('no such tool: ' + toolPath); process.exit(2); }
const WEBAPP = path.join(ROOT, 'desktop/web-app', 'node_modules');

const React = require_(path.join(WEBAPP, 'react'));
const ReactDOM = require_(path.join(WEBAPP, 'react-dom/client'));
const { act } = React;
const { JSDOM } = require_(path.join(ROOT, 'node_modules/jsdom'));

const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
global.window = dom.window; global.document = dom.window.document;
try { Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true, writable: true }); } catch (e) { /* writable */ }
global.Blob = dom.window.Blob; global.URL = dom.window.URL; global.HTMLElement = dom.window.HTMLElement;
global.IS_REACT_ACT_ENVIRONMENT = true;
global.MutationObserver = dom.window.MutationObserver || class { observe() {} disconnect() {} };
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
dom.window.ResizeObserver = global.ResizeObserver;
dom.window.matchMedia = (q) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
dom.window.URL.createObjectURL = () => 'blob:x';
dom.window.URL.revokeObjectURL = () => {};
const noop = () => {};
dom.window.HTMLCanvasElement.prototype.getContext = function (k) {
  if (k !== '2d') return null;
  if (!this.__c) {
    const st = { fillStyle: '#000', font: '10px x', globalAlpha: 1 };
    this.__c = new Proxy({
      measureText: (s) => ({ width: String(s).length * 6 }),
      createLinearGradient: () => ({ addColorStop: noop }),
      createRadialGradient: () => ({ addColorStop: noop }),
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
      getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), canvas: this
    }, { get(t, key) { return key in t ? t[key] : (key in st ? st[key] : noop); }, set(t, key, v) { st[key] = v; return true; } });
  }
  return this.__c;
};
dom.window.HTMLCanvasElement.prototype.getBoundingClientRect = function () { return { left: 0, top: 0, width: 620, height: 400, right: 620, bottom: 400 }; };
Object.defineProperty(dom.window.HTMLElement.prototype, 'clientWidth', { get() { return 620; }, configurable: true });
const pending = [];
dom.window.requestAnimationFrame = (cb) => { pending.push(cb); return pending.length; };
dom.window.cancelAnimationFrame = () => {};
global.requestAnimationFrame = dom.window.requestAnimationFrame;
global.cancelAnimationFrame = dom.window.cancelAnimationFrame;
const realErr = console.error;
console.error = () => {};

require_(toolPath);
const reg = (window.StemLab && window.StemLab._registry) || {};
const ids = Object.keys(reg);
const KEY = reg[TOOL_ID] ? TOOL_ID : ids.find((k) => k.toLowerCase() === String(TOOL_ID).toLowerCase()) || (ids.length === 1 ? ids[0] : null);
const tool = KEY && reg[KEY];
if (!tool) { console.error = realErr; console.error('tool did not register (registry has: ' + (ids.join(', ') || 'nothing') + ')'); process.exit(2); }
const TABS = args[1] ? args[1].split(',') : [null];

const findings = [];
let actions = 0;
let mutations = 0;
const perTab = {};

function mount(tab) {
  let store = { [KEY]: Object.assign({}, tab ? { tab } : {}) };
  let rerender = null;
  const ctx = {
    React, get toolData() { return store; },
    update: (t, k, v) => { if (k === 'tab') return; mutations++; store = { ...store, [t]: { ...store[t], [k]: v } }; rerender && rerender(); },
    updateMulti: (t, o) => { const { tab: _d, ...rest } = o || {}; if (!Object.keys(rest).length) return; mutations++; store = { ...store, [t]: { ...store[t], ...rest } }; rerender && rerender(); },
    addToast: noop, announceToSR: noop, t: (k, fb) => (fb == null ? k : fb),
    isDark: true, setStemLabTool: noop, awardXP: noop, celebrate: noop, beep: noop, callTTS: noop,
    icons: new Proxy({}, { get: () => function Icon() { return null; }, has: () => true })
  };
  function Host() { const [, f] = React.useState(0); rerender = () => f((n) => n + 1); return tool.render(ctx); }
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOM.createRoot(host);
  act(() => { root.render(React.createElement(Host)); });
  return { host, teardown: () => { try { act(() => root.unmount()); } catch (e) { /* teardown */ } host.remove(); } };
}
function drive(n) { for (let i = 0; i < n && pending.length; i++) { const cb = pending.shift(); try { act(() => cb(i * 16)); } catch (e) { /* frame */ } } }
const ev = (type, init) => new dom.window.MouseEvent(type, Object.assign({ bubbles: true, cancelable: true }, init || {}));
function safe(tab, what, fn) {
  actions++;
  try { act(fn); drive(2); }
  catch (e) { findings.push((tab || 'default') + ': ' + what + ' -> ' + String(e.message).slice(0, 90)); }
}

for (const tab of TABS) {
  const m = mount(tab);
  drive(3);
  const seen = new Set();
  for (let round = 0; round < 3; round++) {
    for (const b of Array.from(m.host.querySelectorAll('button'))) {
      if (!b.isConnected) continue;
      const label = ((b.textContent || b.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ')).slice(0, 40) || '<unnamed>';
      const key = round + ':' + label;
      if (seen.has(key)) continue;
      seen.add(key);
      safe(tab, 'click "' + label + '"', () => b.dispatchEvent(ev('click')));
    }
  }
  for (const inp of Array.from(m.host.querySelectorAll('input, select, textarea'))) {
    if (!inp.isConnected) continue;
    const name = (inp.getAttribute('aria-label') || inp.id || inp.type || inp.tagName).slice(0, 40);
    const fire = (val) => {
      const proto = inp.tagName === 'SELECT' ? dom.window.HTMLSelectElement.prototype : inp.tagName === 'TEXTAREA' ? dom.window.HTMLTextAreaElement.prototype : dom.window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value');
      try { setter.set.call(inp, String(val)); } catch (e) { inp.value = String(val); }
      inp.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      inp.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    };
    if (inp.tagName === 'SELECT') {
      for (const opt of Array.from(inp.options)) safe(tab, 'select "' + name + '" = ' + opt.value, () => fire(opt.value));
    } else if (inp.type === 'checkbox' || inp.type === 'radio') {
      safe(tab, 'toggle "' + name + '"', () => inp.dispatchEvent(ev('click')));
      safe(tab, 'toggle "' + name + '" back', () => inp.dispatchEvent(ev('click')));
    } else if (inp.type === 'range' || inp.type === 'number') {
      const lo = inp.min !== '' ? Number(inp.min) : 0, hi = inp.max !== '' ? Number(inp.max) : 100;
      for (const v of [lo, hi, (lo + hi) / 2]) safe(tab, 'set "' + name + '" = ' + v, () => fire(v));
    } else {
      safe(tab, 'type into "' + name + '"', () => fire('fuzz <b>bold</b> & "quotes"'));
    }
  }
  for (const el of Array.from(m.host.querySelectorAll('[tabindex], [role="tab"], canvas, [role="button"]'))) {
    if (!el.isConnected) continue;
    const name = (el.getAttribute('aria-label') || el.id || el.tagName).slice(0, 36);
    for (const key of ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter', ' ', '1', '2', '3', 'v', 's', 'r', 'Escape']) {
      safe(tab, 'key ' + JSON.stringify(key) + ' on "' + name + '"', () =>
        el.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })));
    }
  }
  for (const cv of Array.from(m.host.querySelectorAll('canvas'))) {
    safe(tab, 'mouse drag on canvas', () => {
      cv.dispatchEvent(ev('mousedown', { clientX: 100, clientY: 100 }));
      cv.dispatchEvent(ev('mousemove', { clientX: 300, clientY: 200 }));
      cv.dispatchEvent(ev('mousemove', { clientX: 900, clientY: -50 }));
      cv.dispatchEvent(ev('mouseup', { clientX: 900, clientY: -50 }));
      cv.dispatchEvent(ev('click', { clientX: 200, clientY: 150 }));
    });
    safe(tab, 'touch drag on canvas', () => {
      const t = (type, x, y) => new dom.window.TouchEvent(type, { bubbles: true, cancelable: true, touches: type === 'touchend' ? [] : [{ clientX: x, clientY: y }] });
      cv.dispatchEvent(t('touchstart', 100, 100)); cv.dispatchEvent(t('touchmove', 250, 180)); cv.dispatchEvent(t('touchend', 250, 180));
    });
  }
  perTab[tab || 'default'] = mutations; mutations = 0;
  try { drive(4); if (m.host.innerHTML.length < 300) findings.push((tab || 'default') + ': tab is nearly empty after interaction'); }
  catch (e) { findings.push((tab || 'default') + ': render after interaction threw: ' + e.message.slice(0, 80)); }
  m.teardown();
}

console.error = realErr;
const distinct = Array.from(new Set(findings));
for (const f of distinct) console.log('! ' + f);
console.log('\nstate mutations per tab (proof the handlers ran): ' + Object.entries(perTab).map(([k, v]) => k + '=' + v).join('  '));
const dead = Object.entries(perTab).filter(([, v]) => v === 0).map(([k]) => k);
if (dead.length) console.log('!! tabs whose controls changed NOTHING: ' + dead.join(', ') + ' -- the probe did not reach their handlers');
console.log('\n' + actions + ' interactions across ' + TABS.length + ' tab(s), ' + distinct.length + ' handler crash(es).');
process.exit(distinct.length || dead.length ? 1 : 0);
