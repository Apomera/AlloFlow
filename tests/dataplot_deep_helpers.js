// Shared mount helpers for tests/dataplot_deep_*.test.js (Data Plot deep enhancement, 2026-11-03).
import { vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

export const FILE = process.env.DATAPLOT_DEEP_SRC || 'stem_lab/stem_tool_dataplot.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root = null;
export function setup() {
  resetStemLab();
  loadTool(FILE, 'dataPlot');
  document.body.innerHTML = '<div id="root"></div>';
}
export async function teardown() {
  if (root) await React.act(() => root.unmount());
  root = null;
  document.body.innerHTML = '';
}
// Mount the real tool through React with a 3-argument update like the host's.
export async function mount(seed, extra) {
  if (root) { await React.act(() => root.unmount()); root = null; document.body.innerHTML = '<div id="root"></div>'; }
  const out = { latest: null, lab: null, award: vi.fn(), say: vi.fn(), toasts: [], setTool: vi.fn() };
  function App() {
    const [state, setState] = React.useState(Object.assign({ dataPlot: seed || {} }, (extra && extra.lab) || {}));
    out.latest = state.dataPlot; out.lab = state;
    const ctx = makeCtx(Object.assign({
      toolData: state, setToolData: setState, awardXP: out.award, announceToSR: out.say,
      addToast: (m, k) => out.toasts.push(k + ':' + m), setStemLabTool: out.setTool,
      update: (id, k, v) => setState((p) => { const s = Object.assign({}, p[id] || {}); s[k] = v; const n = Object.assign({}, p); n[id] = s; return n; }),
      updateMulti: (id, o) => setState((p) => { const n = Object.assign({}, p); n[id] = Object.assign({}, p[id] || {}, o); return n; }),
      setToolSnapshots: () => {}, callGemini: undefined,
    }, (extra && extra.ctx) || {}));
    return window.StemLab._registry.dataPlot.render(ctx);
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => root.render(React.createElement(App)));
  await flush();
  return out;
}
export const flush = () => React.act(async () => { await new Promise((r) => setTimeout(r, 5)); });
export async function click(el) { if (!el) throw new Error('click: element missing'); await React.act(async () => { el.click(); }); await flush(); }
export function byText(sel, re, scope) { return Array.from((scope || document).querySelectorAll(sel)).find((b) => re.test(b.textContent)); }
export function setValue(el, value) {
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
}
export async function typeInto(el, value) {
  await React.act(async () => { setValue(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });
  await flush();
}
export async function key(el, k, opts) {
  await React.act(async () => { el.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, opts || {}))); });
  await flush();
}
export const pts = (ys) => ys.map((y, i) => ({ x: i + 1, y }));
export function M() { return window.StemLab._registry.dataPlot._math; }
export { React, ReactDOMClient, loadTool, makeCtx, resetStemLab };
