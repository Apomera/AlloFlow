import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './stem_widgets_smoke_harness.js';
const require = createRequire(resolve('desktop/web-app/package.json'));
export const { Simulate } = require('react-dom/test-utils');
export const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
let host, root;
export const node = () => host;
export function freshTool() {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab');
}
export function renderState(state, contrast = false) {
  const element = document.createElement('div');
  element.innerHTML = renderTool('weldLab', { weldLab: state }, { isContrast: contrast }); return element;
}
export async function mountState(state, contrast = false) {
  let latest; const writes = [];
  function App() {
    const [data, setData] = React.useState({ weldLab: state }); latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData, isContrast: contrast,
      update: (bucket, key, value) => { writes.push([key, value]); setData(prev => ({ ...prev, [bucket]: { ...prev[bucket], [key]: value } })); } }));
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App))); return { latest: () => latest, writes };
}
export async function unmountState() { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); host = null; }
export async function click(element) { if (!element) throw Error('Missing click target'); await React.act(() => element.click()); }
export async function change(element, value) { if (!element) throw Error('Missing change target'); await React.act(() => Simulate.change(element, { target: { value } })); }
export async function pointer(element, event, data) { await React.act(() => Simulate[event](element, data)); }
export const button = text => [...host.querySelectorAll('button')].find(element => element.textContent.trim() === text);
