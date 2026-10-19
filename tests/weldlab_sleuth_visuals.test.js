import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const require = createRequire(import.meta.url);
const { act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));
const mounted = [];

beforeEach(() => {
  delete window.__alloflowWeldLab;
  try { localStorage.clear(); } catch (_) {}
  resetStemLab();
  loadTool(SRC, 'weldLab');
});
afterEach(() => mounted.splice(0).forEach((ui) => ui.unmount()));

function fragment(state, options) {
  const host = document.createElement('div');
  host.innerHTML = renderTool('weldLab', { weldLab: Object.assign({ view: 'processSleuth', psIdx: 0, psShown: [0] }, state) }, options);
  return host;
}
function mount(state) {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const store = { td: null };
  const tool = window.StemLab._registry.weldLab;
  function App() {
    const s = React.useState({ weldLab: Object.assign({ view: 'processSleuth', psIdx: 0, psShown: [0] }, state) });
    store.td = s[0];
    return tool.render({
      React, toolData: s[0], setToolData: s[1], t: (_, fallback) => fallback, isContrast: false,
      addToast: () => {},
      update: (id, key, value) => s[1]((previous) => Object.assign({}, previous, {
        [id]: Object.assign({}, previous[id], { [key]: value })
      }))
    });
  }
  act(() => root.render(React.createElement(App)));
  const ui = { host, store, click: (button) => act(() => button.click()), unmount: () => { act(() => root.unmount()); host.remove(); } };
  mounted.push(ui);
  return ui;
}

describe('Process Sleuth illustrated evidence', () => {
  it('draws every scenario and includes its deciding, neutral and background observations alike', () => {
    const cases = window.__WeldLabCore.proc.PS_V;
    cases.forEach((v, i) => {
      const host = fragment({ psIdx: i, psShown: [i] });
      const scene = host.querySelector('[data-sleuth-scene]');
      expect(scene.getAttribute('data-sleuth-scene')).toBe(String(v.id));
      expect(scene.querySelector('svg')).not.toBeNull();
      const pins = Array.from(scene.querySelectorAll('[data-sleuth-hotspot]'));
      expect(pins.map((pin) => pin.dataset.sleuthHotspot)).toEqual(Object.keys(v.clues));
      pins.forEach((pin) => {
        expect(pin.tagName).toBe('BUTTON');
        expect(pin.getAttribute('aria-label')).toMatch(/^Observation \d+: .+/);
        expect(pin.getAttribute('aria-pressed')).toBe('false');
      });
      expect(host.querySelector('[data-sleuth-evidence-kind]')).toBeNull();
      expect(host.querySelector('[data-proc2="ps-feedback"]')).toBeNull();
    });
  });

  it('shares one selection across scene, original prose and removable evidence cards', () => {
    const ui = mount({ psIdx: 4, psShown: [4] });
    const pin = () => ui.host.querySelector('[data-sleuth-hotspot="3"]');
    const phrase = () => ui.host.querySelector('[data-sleuth-phrase="3"]');
    ui.click(pin());
    expect(ui.store.td.weldLab.proc2_psClues).toEqual([3]);
    expect(phrase().getAttribute('aria-pressed')).toBe('true');
    expect(ui.host.querySelector('[data-sleuth-evidence="3"]').textContent).toContain('on a tight budget');
    ui.click(phrase());
    expect(pin().getAttribute('aria-pressed')).toBe('false');
    expect(ui.host.querySelector('[data-sleuth-evidence="3"]')).toBeNull();
    ui.click(phrase());
    ui.click(ui.host.querySelector('[data-sleuth-evidence="3"] button'));
    expect(pin().getAttribute('aria-pressed')).toBe('false');
    expect(ui.store.td.weldLab.proc2_psClues).toEqual([]);
    expect(ui.store.td.weldLab.psRounds || 0).toBe(0);
  });

  it('locks both visual controls and evidence cards and only classifies context after an answer', () => {
    const ui = mount({ psIdx: 4, psShown: [4] });
    ui.click(ui.host.querySelector('[data-sleuth-hotspot="4"]'));
    expect(ui.host.querySelector('[data-sleuth-evidence-kind]')).toBeNull();
    ui.click(Array.from(ui.host.querySelectorAll('button')).find((button) => /^Done marking/.test(button.textContent)));
    expect(ui.host.querySelector('[data-sleuth-hotspot="4"]').disabled).toBe(true);
    expect(ui.host.querySelector('[data-sleuth-evidence="4"] button').disabled).toBe(true);
    expect(ui.host.querySelector('[data-sleuth-evidence-kind]')).toBeNull();
    ui.click(ui.host.querySelector('[role="radio"][aria-label="MIG (GMAW)"]'));
    expect(ui.store.td.weldLab.psScore).toBe(1);
    expect(ui.store.td.weldLab.psRounds).toBe(1);
    expect(ui.host.querySelector('[data-sleuth-evidence-kind="noise"]').textContent).toBe('Background context');
    ui.click(ui.host.querySelector('[data-sleuth-hotspot="1"]'));
    expect(ui.store.td.weldLab.proc2_psClues).toEqual([4]);
    expect(ui.store.td.weldLab.psRounds).toBe(1);
  });

  it('provides an explicit high-contrast scene palette and native focusable controls', () => {
    const scene = fragment({}, { isContrast: true }).querySelector('[data-sleuth-scene]');
    expect(scene.style.background).toBe('rgb(0, 0, 0)');
    const pin = scene.querySelector('[data-sleuth-hotspot]');
    expect(pin.style.color).toBe('rgb(255, 255, 0)');
    expect(pin.disabled).toBe(false);
    expect(pin.tabIndex).toBe(0);
    expect(scene.innerHTML).not.toContain('linear-gradient');
  });
});
