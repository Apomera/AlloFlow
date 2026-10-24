import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const BASE = { view: 'consumables', cons_sect: 'gases', cons_mode: 'browse' };
const MODES = ['low', 'recommended', 'high'];
const REFERENCE = 'Typical: 20-35 CFH (cubic feet/hour) for MIG. 15-25 CFH for TIG. Too low = porosity. Too high = turbulent flow that SUCKS atmosphere in = porosity. Both extremes cause same defect. Sweet spot is your machine\'s recommended range adjusted for breeze + nozzle distance.';
let root, host;
const explorer = (node = host) => node.querySelector('[data-cons-shield]');
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab');
});
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); });
function render(extra = {}, contrast = false) {
  const node = document.createElement('div');
  node.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }, { isContrast: contrast });
  return node;
}
async function mount(extra = {}, contrast = false) {
  let latest; const writes = [];
  function App() {
    const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } }); latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData, isContrast: contrast,
      update: (id, key, value) => { writes.push([key, value]); setData(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } })); },
    }));
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App))); return { latest: () => latest, writes };
}
async function click(node) { expect(node).toBeTruthy(); await React.act(() => node.click()); }
async function mode(id) { await click(host.querySelector('[data-cons-shield-mode="' + id + '"]')); }
async function buttonText(text) { await click([...host.querySelectorAll('button')].find(n => n.textContent.trim() === text)); }

describe('Qualitative shielding-gas explorer', () => {
  it('replaces the flow-rate card only in gas browsing and preserves the original reference verbatim', () => {
    const node = render(), section = explorer(node);
    expect(section.dataset.consShield).toBe('recommended');
    expect(section.querySelectorAll('[data-cons-shield-mode]')).toHaveLength(3);
    expect(section.querySelector('[data-cons-shield-reference]').textContent).toBe(REFERENCE);
    expect(node.textContent).toContain('Oxygen + acetylene (oxy-fuel, not a shielding gas)');
    expect(node.querySelector('[aria-label="Gas colours in the mix bars"]')).toBeTruthy();
    for (const sect of ['overview', 'sticks', 'mig_wires', 'decoder', 'tig_rods', 'storage', 'cost', 'invalid']) expect(explorer(render({ cons_sect: sect }))).toBeNull();
    expect(explorer(render({ cons_mode: 'scenarios' }))).toBeNull();
  });

  it('keeps the torch, joint and pool geometry identical while showing distinct envelope and atmosphere paths', async () => {
    await mount();
    const objects = Object.fromEntries(['torch', 'joint', 'pool'].map(id => [id, explorer().querySelector('[data-cons-shield-object="' + id + '"]').outerHTML]));
    const expected = { low: 'partial', recommended: 'continuous', high: 'turbulent' };
    const gasPaths = new Set();
    for (const id of MODES) {
      await mode(id); const section = explorer();
      expect(section.dataset.consShield).toBe(id);
      expect(section.querySelector('[data-cons-shield-diagram]').dataset.consShieldDiagram).toBe(id);
      expect(section.querySelector('[data-cons-shield-envelope]').dataset.coverage).toBe(expected[id]);
      for (const object of Object.keys(objects)) expect(section.querySelector('[data-cons-shield-object="' + object + '"]').outerHTML).toBe(objects[object]);
      gasPaths.add(section.querySelector('[data-cons-shield-gas]').innerHTML);
      const inflow = section.querySelector('[data-cons-shield-inflow]');
      expect(inflow !== null).toBe(id !== 'recommended');
      if (inflow) {
        expect(inflow.querySelectorAll('path')).toHaveLength(2);
        for (const path of inflow.querySelectorAll('path')) expect(path.getAttribute('stroke-dasharray')).toBe('7 6');
        expect(inflow.querySelector('path').getAttribute('d')).toContain(id === 'low' ? 'L' : 'Q');
      }
      expect(section.querySelector('[data-cons-shield-atmosphere]').dataset.qualitative).toBe('true');
    }
    expect(gasPaths.size).toBe(3);
  });

  it('links selection, HTML explanation and named diagram without generating a quality verdict or CFH value', async () => {
    await mount();
    for (const id of MODES) {
      await mode(id); const section = explorer(), reading = section.querySelector('[data-cons-shield-reading]');
      expect(section.querySelectorAll('button[aria-pressed="true"]')).toHaveLength(1);
      expect(section.querySelector('[data-cons-shield-mode="' + id + '"]').getAttribute('aria-pressed')).toBe('true');
      expect(reading.dataset.consShieldReading).toBe(id);
      expect(reading.getAttribute('aria-live')).toBe('polite');
      expect(reading.getAttribute('aria-atomic')).toBe('true');
      expect(section.querySelector('[data-cons-shield-diagram]').getAttribute('aria-label').length).toBeGreaterThan(80);
      expect(section.querySelector('[data-cons-shield-reference]').textContent).toBe(REFERENCE);
      expect(section.querySelector('input,output,meter,progress')).toBeNull();
      expect(reading.textContent).not.toMatch(/\d|passed|failed|accept|reject|safe|approved|CFH/i);
    }
    await mode('low'); expect(explorer().querySelector('[data-cons-shield-reading]').textContent).toContain('porosity');
    await mode('high'); expect(explorer().querySelector('[data-cons-shield-reading]').textContent).toContain('porosity');
    await mode('recommended'); expect(explorer().querySelector('[data-cons-shield-reading]').textContent).toContain('breeze and nozzle distance');
    expect(explorer().querySelector('[data-cons-shield-note]').textContent).toContain('not a flow simulation');
    expect(explorer().querySelector('[data-cons-shield-note]').textContent).toContain('not amounts or particle counts');
  });

  it('keeps categorical exploration local and leaves saved calculator inputs, scenario scores and answers untouched', async () => {
    const app = await mount({ tech2_cons_code: 'E6010', tech2_cons_proc: 'tig', tech2_cons_leg: 0.25, tech2_cons_rate: 85, cons_sc_idx: 2, cons_sc_score: 1, cons_sc_picked: 1 });
    const before = JSON.stringify(app.latest()), writes = app.writes.length;
    for (const id of MODES) await mode(id);
    expect(JSON.stringify(app.latest())).toBe(before); expect(app.writes).toHaveLength(writes);
    await buttonText('📦 Storage + handling');
    expect(explorer()).toBeNull();
    await buttonText('💨 Shielding gases');
    expect(explorer().dataset.consShield).toBe('high');
    expect(JSON.stringify(app.latest())).toBe(before);
  });

  it('provides readable HTML legends and captions independently of SVG text', async () => {
    await mount(); const section = explorer(), diagram = section.querySelector('[data-cons-shield-diagram]');
    expect(diagram.getAttribute('role')).toBe('img'); expect(diagram.querySelector('text')).toBeNull();
    expect(diagram.style.width).toBe('100%'); expect(diagram.style.height).toBe('auto');
    const legend = section.querySelector('[data-cons-shield-legend]');
    expect(legend.className).toContain('grid-cols-1'); expect(legend.querySelectorAll('li')).toHaveLength(3);
    expect(legend.textContent).toContain('Solid cyan arrows: shielding gas');
    expect(legend.textContent).toContain('Pink dots: atmosphere; dashed arrows: inward movement');
    expect(legend.textContent).toContain('Amber oval: molten pool');
    for (const icon of legend.querySelectorAll('svg')) expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(section.querySelector('[data-cons-shield-reading] p').className).toContain('text-sm');
    expect(section.querySelector('[role="group"]').className).toContain('flex-wrap');
    expect(section.querySelector('animate,animateTransform,canvas,[style*="animation"]')).toBeNull();
  });

  it('uses native full-size controls, independent legend styles and explicit selected contrast states', async () => {
    await mount({}, true); const section = explorer();
    expect(section.style.background).toBe('rgb(0, 0, 0)'); expect(section.style.color).toBe('rgb(255, 255, 255)');
    expect(section.querySelector('h4').style.color).toBe('rgb(255, 255, 0)');
    for (const button of section.querySelectorAll('button')) {
      expect(button.tagName).toBe('BUTTON'); expect(button.type).toBe('button'); expect(button.style.minHeight).toBe('44px');
      expect(button.className).toContain('focus:ring-4'); expect(button.getAttribute('aria-controls')).toBe('cons7-shield-reading');
      const selected = button.getAttribute('aria-pressed') === 'true';
      expect(button.style.background).toBe(selected ? 'rgb(255, 255, 0)' : 'rgb(0, 0, 0)');
      expect(button.style.color).toBe(selected ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 0)');
    }
    for (const item of section.querySelectorAll('[data-cons-shield-legend] li')) expect(item.style.color).toBe('rgb(255, 255, 255)');
    for (const icon of section.querySelectorAll('[data-cons-shield-legend] svg')) expect(icon.style.background).toBe('rgb(15, 23, 42)');
    await React.act(() => section.querySelector('[data-cons-shield-mode="low"]').focus());
    expect(section.dataset.consShield).toBe('recommended');
    await mode('low');
    expect(section.querySelector('[data-cons-shield-mode="low"]').style.background).toBe('rgb(255, 255, 0)');
    expect(section.querySelector('[data-cons-shield-mode="recommended"]').style.background).toBe('rgb(0, 0, 0)');
  });
});
