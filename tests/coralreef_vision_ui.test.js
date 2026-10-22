import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
let engines, withVision;
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.THREE = { stub: true };
  window.Reef3DSpecies = { version: '1.0.0', create: () => ({}) };
  engines = []; withVision = true;
  window.Reef3DExplore = { version: '1.0.0', mount: vi.fn((canvas, options) => {
    let state = { ready: true, paused: false, view: 'third', vision: options.vision || 'natural', nearby: [], focused: null, diver: { x: 3, y: -8, z: 4, depthM: 8, headingDeg: 90 } };
    const c = { canvas, options, getState: () => state, dispose: vi.fn(), setInput: vi.fn(), resize: vi.fn(), focusNext: vi.fn(), clearFocus: vi.fn(),
      emit(patch) { state = { ...state, ...patch }; options.onState(state); }, setView: vi.fn(), setPaused: vi.fn(), swimTo: vi.fn() };
    if (withVision) c.setVision = vi.fn((vision) => { if (state.vision !== vision) c.emit({ vision }); });
    engines.push(c); options.onState(state); return c;
  }) };
  loadTool('stem_lab/stem_tool_coralreef.js', 'coralReef');
});
afterEach(async () => {
  while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); }
  delete window.Reef3DExplore; delete window.Reef3DSpecies; delete window.THREE; vi.restoreAllMocks();
});
async function mount() {
  let data = { coralReef: { section: 'explore' } };
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  function Shell() { const [value, setValue] = React.useState(data); data = value; return cfg.render({ React, toolData: value, setToolData: setValue, t: (key, fallback) => fallback || key }); }
  const t = { host, root, get data() { return data.coralReef; } }; mounted.push(t);
  await React.act(async () => root.render(React.createElement(Shell)));
  await click([...host.querySelectorAll('button')].find(b => b.textContent.trim() === 'Start the dive'));
  return t;
}
async function click(element) { expect(element).toBeTruthy(); await React.act(async () => { element.click(); await Promise.resolve(); }); }
async function choose(t, mode) { const select = t.host.querySelector('[data-reef-vision-select]'); await React.act(async () => { select.focus(); select.value = mode; select.dispatchEvent(new Event('change', { bubbles: true })); }); }

describe('optional reef viewing modes', () => {
  it('starts natural, changes only the renderer mode, and preserves position, pause, canvas and persistent data', async () => {
    const t = await mount(), engine = engines[0], canvas = t.host.querySelector('canvas'), saved = JSON.stringify(t.data), diver = engine.getState().diver;
    expect(t.host.querySelector('[data-reef-vision-select]').value).toBe('natural');
    await React.act(async () => engine.emit({ paused: true }));
    for (const mode of ['vivid', 'fluorescence', 'natural']) {
      await choose(t, mode);
      expect(engine.setVision).toHaveBeenLastCalledWith(mode);
      expect(engines).toHaveLength(1); expect(engine.dispose).not.toHaveBeenCalled();
      expect(t.host.querySelector('canvas')).toBe(canvas);
      expect(engine.getState().diver).toBe(diver); expect(engine.getState().paused).toBe(true);
      expect(JSON.stringify(t.data)).toBe(saved);
      expect(document.activeElement).toBe(t.host.querySelector('[data-reef-vision-select]'));
      expect(t.host.querySelector('[data-reef-vision-badge]')?.dataset.reefVisionBadge || 'natural').toBe(mode);
    }
  });
  it('applies the session choice after site changes, errors and retry without saving it', async () => {
    const t = await mount(); await choose(t, 'fluorescence');
    await click(t.host.querySelector('[data-site="damaged"]'));
    expect(engines).toHaveLength(2); expect(engines[1].options.vision).toBe('fluorescence');
    expect(engines[1].setVision).toHaveBeenCalledWith('fluorescence');
    await React.act(async () => engines[1].options.onError());
    await click([...t.host.querySelectorAll('button')].find(b => b.textContent.trim() === 'Try the 3D view again'));
    expect(engines).toHaveLength(3); expect(engines[2].options.vision).toBe('fluorescence');
    expect(t.host.querySelector('[data-reef-vision-select]').value).toBe('fluorescence');
    expect(t.data.vision).toBeUndefined(); expect(t.data.diveVision).toBeUndefined();
  });
  it('provides named, linked controls and explains artistic color, fluorescence and UV separately', async () => {
    const t = await mount(), select = t.host.querySelector('[data-reef-vision-select]');
    expect(select.labels[0].textContent).toBe('Reef view');
    for (const mode of ['vivid', 'fluorescence']) {
      await choose(t, mode);
      const description = t.host.querySelector('#' + select.getAttribute('aria-describedby'));
      expect(description.textContent).toMatch(mode === 'vivid' ? /artistic enhancement/ : /not measurements/);
    }
    const panel = t.host.querySelector('[data-reef-vision-panel]');
    expect(panel.textContent).toContain('UV reflection is different from fluorescence');
    expect(panel.textContent).toContain('bioluminescence');
    expect(panel.querySelectorAll('a')).toHaveLength(3);
  });
  it('keeps separate tool instances independent with unique select labels', async () => {
    const a = await mount(), b = await mount(); await choose(a, 'vivid');
    const sa = a.host.querySelector('[data-reef-vision-select]'), sb = b.host.querySelector('[data-reef-vision-select]');
    expect(sa.id).not.toBe(sb.id); expect(sb.value).toBe('natural');
    expect(engines[0].getState().vision).toBe('vivid'); expect(engines[1].getState().vision).toBe('natural');
  });
  it('keeps older renderer controls usable when the vision API is unavailable', async () => {
    withVision = false; const t = await mount();
    expect(t.host.querySelector('[data-reef-vision-select]')).toBeNull();
    expect(t.host.querySelector('.cr-dive-controls').textContent).toContain('Mask view');
    expect(t.host.querySelector('.cr-dive-controls').textContent).toContain('Pause the reef');
  });
});
