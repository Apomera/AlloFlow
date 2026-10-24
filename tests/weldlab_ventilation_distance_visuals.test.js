import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const BASE = { view: 'ppeSafety', ps_view: 'reference' };
const SOURCE = 'https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.252';
const REFERENCE = 'Capture hood as close to the arc as practical: OSHA sizes the airflow for 100 ft/min at the arc (150 cfm at 4-6 in., 600 cfm at 10-12 in.). Required in confined spaces.';
const BANDS = { near: { lo: 4, hi: 6, midpoint: 5, flow: 150 }, far: { lo: 10, hi: 12, midpoint: 11, flow: 600 } };
let root, host;
const bench = (node = host) => node.querySelector('[data-ppe-ventilation]');
const n = (node, key) => Number(node.getAttribute(key));
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab');
});
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); });
function render(extra = {}, contrast = false) {
  const node = document.createElement('div'); node.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }, { isContrast: contrast }); return node;
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
async function band(id) { await click(bench().querySelector('[data-ppe-vent-band="' + id + '"]')); }
async function named(text) { await click([...host.querySelectorAll('button')].find(node => node.textContent.trim() === text)); }

describe('PPE capture-hood distance reference inspector', () => {
  it('replaces only the ventilation reference tile and preserves the original specification, citation and other gear tiles', () => {
    const node = render(), section = bench(node);
    expect(section.dataset.ppeVentilation).toBe('near');
    expect(section.querySelectorAll('[data-ppe-vent-band]')).toHaveLength(2);
    expect(section.querySelector('[data-ppe-vent-reference]').textContent).toBe(REFERENCE);
    expect(section.querySelector('[data-ppe-vent-reference-citation]').textContent).toBe('29 CFR 1910.252(c)(3)');
    expect(section.querySelector('[data-ppe-vent-source]').href).toBe(SOURCE);
    expect(section.querySelector('[data-ppe-vent-source-context]').textContent).toContain('3-inch-wide flanged suction opening');
    expect(section.querySelector('[data-ppe-vent-source-context]').textContent).toContain('100 ft/min toward the hood in the welding zone');
    for (const title of ['Auto-darkening welding helmet', 'Flame-resistant (FR) jacket / coveralls', 'Leather welding gloves', 'Respirator (when required)', 'Fire watch + extinguisher', 'Steel-toe high-top boots']) expect(node.textContent).toContain(title);
    expect(node.textContent).toContain('During hot work and at least 30 minutes after');
    for (const view of ['gear', 'shade', 'floor', 'scenarios', 'invalid']) expect(bench(render({ ps_view: view }))).toBeNull();
  });

  it('uses the selected band midpoint only as illustrative geometry on a shared distance scale with a fixed arc', async () => {
    await mount();
    const arc = bench().querySelector('[data-ppe-vent-arc]').outerHTML, torch = bench().querySelector('[data-ppe-vent-torch]').outerHTML, workpiece = bench().querySelector('[data-ppe-vent-workpiece]').outerHTML;
    for (const [id, row] of Object.entries(BANDS)) {
      await band(id); const section = bench(), hood = section.querySelector('[data-ppe-vent-hood]');
      expect(n(hood, 'data-midpoint')).toBe(row.midpoint);
      expect(n(hood, 'data-min')).toBe(row.lo); expect(n(hood, 'data-max')).toBe(row.hi);
      expect(n(hood, 'data-x')).toBe(100 + 36 * row.midpoint); expect(n(hood, 'data-y')).toBe(140);
      expect(hood.getAttribute('transform')).toBe('translate(' + (100 + 36 * row.midpoint) + ' 140)');
      expect(section.querySelector('[data-ppe-vent-arc]').outerHTML).toBe(arc);
      expect(section.querySelector('[data-ppe-vent-torch]').outerHTML).toBe(torch);
      expect(section.querySelector('[data-ppe-vent-workpiece]').outerHTML).toBe(workpiece);
      for (const [otherId, other] of Object.entries(BANDS)) {
        const plot = section.querySelector('[data-ppe-vent-distance-band="' + otherId + '"]');
        expect(n(plot, 'x')).toBe(100 + 36 * other.lo);
        expect(n(plot, 'width')).toBe(36 * (other.hi - other.lo));
        expect(n(plot, 'data-min')).toBe(other.lo); expect(n(plot, 'data-max')).toBe(other.hi);
      }
      expect(section.querySelector('figcaption').textContent).toContain('midpoint to illustrate the band, not a measured position');
    }
  });

  it('aligns distance ticks and full-size HTML labels using the same ruler coordinates', () => {
    const section = bench(render());
    expect(section.querySelector('[data-ppe-vent-distance]').getAttribute('viewBox')).toBe('0 0 640 250');
    for (const tick of section.querySelectorAll('[data-ppe-vent-distance-tick]')) {
      const value = n(tick, 'data-ppe-vent-distance-tick'); expect(n(tick, 'x1')).toBe(100 + 36 * value); expect(n(tick, 'x2')).toBe(100 + 36 * value);
    }
    for (const label of section.querySelectorAll('[data-ppe-vent-distance-label]')) {
      const value = n(label, 'data-ppe-vent-distance-label'); expect(parseFloat(label.style.left)).toBe((100 + 36 * value) / 640 * 100);
      expect(label.style.transform).toBe('translateX(-50%)');
    }
    expect(section.querySelectorAll('[data-ppe-vent-distance-label]')).toHaveLength(4);
    expect(section.querySelector('[data-ppe-vent-distance]').querySelector('text')).toBeNull();
  });

  it('shows exact authored airflow values on one common scale, without interpolated rows or a fan control', async () => {
    await mount();
    for (const [id, row] of Object.entries(BANDS)) {
      await band(id); const section = bench(), reading = section.querySelector('[data-ppe-vent-reading]');
      expect(reading.dataset).toMatchObject({ ppeVentReading: id, min: String(row.lo), max: String(row.hi), cfm: String(row.flow) });
      expect(reading.textContent).toContain(row.flow + ' cfm');
      expect(reading.textContent).toContain('table minimum airflow');
      expect(section.querySelectorAll('[data-ppe-vent-flow-row]')).toHaveLength(2);
      for (const [otherId, other] of Object.entries(BANDS)) {
        const flow = section.querySelector('[data-ppe-vent-flow-bar="' + otherId + '"]'), plot = section.querySelector('[data-ppe-vent-flow-plot="' + otherId + '"]');
        expect(n(flow, 'data-value')).toBe(other.flow); expect(n(flow, 'x')).toBe(20); expect(n(flow, 'width')).toBe(other.flow);
        expect(plot.getAttribute('viewBox')).toBe('0 0 640 32'); expect(plot.getAttribute('preserveAspectRatio')).toBe('none'); expect(plot.style.width).toBe('100%');
      }
      expect(n(section.querySelector('[data-ppe-vent-flow-bar="far"]'), 'width') / n(section.querySelector('[data-ppe-vent-flow-bar="near"]'), 'width')).toBe(4);
      expect(section.querySelector('input,select,meter,progress')).toBeNull();
      expect(reading.textContent).not.toMatch(/adequate|approved|pass|fail|safe|release|exposure/i);
      expect(section.querySelector('[data-ppe-vent-note]').textContent).toContain('no interpolation, fume-removal or exposure calculation');
      expect(section.querySelector('[data-ppe-vent-note]').textContent).toContain('does not assess ventilation adequacy or prescribe a fan setting or procedure');
    }
  });

  it('keeps reference exploration local and preserves existing gear, floor-plan, shade and scenario data', async () => {
    const app = await mount({ safe2_job: 'migIndoor', safe2_worn: ['adfHelmet', 'safetyGlasses'], safe2_adf: 12, safe2_shProc: 'gmaw', safe2_shAmps: 180, safe2_shThick: 0.375, safe2_plan: { custom: 'retain' }, safe2_scIdx: 1, safe2_scPick: { 0: 1 } });
    const before = JSON.stringify(app.latest()), writes = app.writes.length;
    await band('far'); await band('near'); await band('far');
    expect(JSON.stringify(app.latest())).toBe(before); expect(app.writes).toHaveLength(writes);
    await named('2. Lens Shade'); expect(bench()).toBeNull();
    await named('5. Quick Reference'); expect(bench().dataset.ppeVentilation).toBe('far');
    expect(JSON.stringify(app.latest())).toBe(before);
    expect(bench().querySelector('[data-ppe-vent-reference]').textContent).toBe(REFERENCE);
  });

  it('preserves the scenario first-answer lock while the reference lens remains outside the scored case', async () => {
    const app = await mount({ safe2_scIdx: 0 });
    await band('far'); await named('4. Hazard Scenarios');
    expect(bench()).toBeNull();
    expect(host.textContent).not.toContain('Anyone with a line of sight to the arc needs protection');
    const choices = () => [...host.querySelectorAll('[aria-label="Response choices"] button')];
    await click(choices()[0]); expect(app.latest().safe2_scPick).toEqual({ 0: 0 });
    await named('5. Quick Reference'); await band('near'); await named('4. Hazard Scenarios');
    await click(choices()[2]); expect(app.latest().safe2_scPick).toEqual({ 0: 0 });
    expect(host.textContent).toContain('Score: 0 / 1 answered');
  });

  it('uses native full-size choices, responsive full-width plots and explicit contrast without motion', async () => {
    await mount({}, true); const section = bench();
    expect(section.style.background).toBe('rgb(0, 0, 0)'); expect(section.style.color).toBe('rgb(255, 255, 255)');
    expect(section.querySelector('h4').style.color).toBe('rgb(255, 255, 0)');
    expect(section.className).toContain('md:col-span-2');
    expect(section.querySelector('[role="group"]').className).toContain('flex-wrap');
    for (const button of section.querySelectorAll('button')) {
      expect(button.type).toBe('button'); expect(button.style.minHeight).toBe('44px'); expect(button.className).toContain('focus:ring-4');
      expect(button.getAttribute('aria-controls')).toBe('safe5-vent-reading'); const on = button.getAttribute('aria-pressed') === 'true';
      expect(button.style.background).toBe(on ? 'rgb(255, 255, 0)' : 'rgb(0, 0, 0)');
      expect(button.style.color).toBe(on ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 0)');
    }
    expect(section.querySelector('[data-ppe-vent-source]').style.minHeight).toBe('44px');
    expect(section.querySelector('[data-ppe-vent-distance]').style.width).toBe('100%');
    expect(section.querySelector('[data-ppe-vent-distance]').style.height).toBe('auto');
    expect(section.querySelector('[data-ppe-vent-reading]').getAttribute('aria-live')).toBe('polite');
    await React.act(() => section.querySelector('[data-ppe-vent-band="far"]').focus()); expect(section.dataset.ppeVentilation).toBe('near');
    await band('far');
    expect(section.querySelector('[data-ppe-vent-band="far"]').style.background).toBe('rgb(255, 255, 0)');
    expect(section.querySelector('[data-ppe-vent-band="near"]').style.background).toBe('rgb(0, 0, 0)');
    expect(section.querySelector('animate,animateTransform,canvas,[style*="animation"]')).toBeNull();
  });
});
