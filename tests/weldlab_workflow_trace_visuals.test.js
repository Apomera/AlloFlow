import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
let root, host;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.__alloflowWeldLab;
  localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab');
});
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); });
async function mount(extra = {}, contrast = false) {
  let latest;
  function App() {
    const [data, setData] = React.useState({ weldLab: { view: 'codes', insp2_codesTab: 'flow', ...extra } });
    latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({
      toolData: data, setToolData: setData, isContrast: contrast,
      update: (id, key, value) => setData(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } })),
    }));
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App))); return () => latest;
}
const tracer = () => host.querySelector('[data-codes-workflow]');
const connection = () => tracer().querySelector('[data-codes-flow-connection]');
async function click(selector) { const b = host.querySelector(selector); expect(b, selector).toBeTruthy(); await React.act(() => b.click()); }
async function step(n) { await click('[data-codes-flow-step="' + n + '"]'); }
const selected = () => [...tracer().querySelectorAll('[data-codes-flow-node][data-selected="true"]')].map(n => Number(n.dataset.codesFlowNode));
const highlighted = () => [...tracer().querySelectorAll('[data-codes-flow-edge][data-highlight="true"]')].map(n => n.dataset.codesFlowEdge);
const FULL = [
  'Draft WPS (often called a pWPS): the engineer writes the proposed settings.',
  'Weld a test coupon following the draft, recording the actual values used.',
  'Test the coupon: tension and bend tests, plus impact or hardness tests when the job requires them. A failed test sends you back to step 1.',
  'PQR: the record of what was actually welded and the test results, certified by the employer.',
  'Qualified WPS: the instructions welders follow, with ranges the PQR supports.',
  'A welder welds a test coupon following the WPS.',
  'The coupon is bend-tested or radiographed, as the code allows. A failure means retraining and a retest.',
  'WPQ: the record that this welder is qualified, for that process, position and thickness range.',
];

describe('Procedure and welder workflow path tracer', () => {
  it('keeps all authored explanations available and synchronizes every inspected step with the same exact text', async () => {
    await mount();
    const all = tracer().querySelector('[data-codes-flow-all]');
    expect([...all.querySelectorAll('[data-codes-flow-full-step]')].map(n => n.textContent)).toEqual(FULL);
    await React.act(() => all.querySelector('summary').click()); expect(all.open).toBe(true);
    for (let n = 1; n <= 8; n++) {
      await step(n);
      expect(tracer().dataset.step).toBe(String(n));
      expect(selected()).toEqual([n]);
      expect(tracer().dataset.lane).toBe(n <= 4 ? 'procedure' : 'welder');
      expect(tracer().querySelector('[data-codes-flow-reading]').textContent).toBe(FULL[n - 1]);
      expect(tracer().querySelector('[data-codes-flow-step="' + n + '"]').getAttribute('aria-pressed')).toBe('true');
      expect([...tracer().querySelectorAll('[data-codes-flow-step][aria-pressed="true"]')]).toHaveLength(1);
      expect(tracer().querySelector('svg').getAttribute('aria-label')).toContain('Selected step ' + n + ':');
    }
    expect(all.open).toBe(true);
  });

  it('follows the authored forward chain once and never advances beyond step eight', async () => {
    await mount();
    expect(tracer().querySelector('[data-codes-flow-prev]').disabled).toBe(true);
    for (let from = 1; from < 8; from++) {
      await click('[data-codes-flow-next]');
      expect(tracer().dataset.step).toBe(String(from + 1));
      expect(connection().dataset).toMatchObject({ from: String(from), to: String(from + 1), path: 'forward', status: 'followed' });
      expect(highlighted()).toEqual([from + ':' + (from + 1)]);
    }
    expect(tracer().querySelector('[data-codes-flow-next]').disabled).toBe(true);
    expect(tracer().querySelector('[data-codes-flow-next-target]').textContent).toContain('End of the numbered sequence');
    await click('[data-codes-flow-next]'); expect(tracer().dataset.step).toBe('8');
  });

  it('previews the procedure-test retry then follows only the authored 3-to-1 loop', async () => {
    await mount(); await step(3);
    expect(connection().dataset).toMatchObject({ from: '3', to: '4', status: 'preview', path: 'forward' });
    await click('[data-codes-flow-route="retry"]');
    expect(tracer().dataset.step).toBe('3');
    expect(connection().dataset).toMatchObject({ from: '3', to: '1', status: 'preview', path: 'retry' });
    expect(highlighted()).toEqual(['3:1']);
    expect(tracer().querySelector('[data-codes-flow-edge="3:1"] path').getAttribute('stroke-dasharray')).toBe('5 4');
    await click('[data-codes-flow-next]');
    expect(tracer().dataset.step).toBe('1');
    expect(connection().dataset).toMatchObject({ from: '3', to: '1', status: 'followed', path: 'retry' });
    expect(tracer().querySelector('[data-codes-flow-next-target]').textContent).toBe('Next connection: step 1 → step 2.');
    expect(tracer().querySelector('[data-codes-flow-route]')).toBeNull();
    await click('[data-codes-flow-next]');
    expect(tracer().dataset.step).toBe('2');
    expect(connection().dataset).toMatchObject({ from: '1', to: '2', path: 'forward' });
  });

  it('keeps the welder-test retry distinct and can restore its forward route to WPQ', async () => {
    await mount(); await step(7);
    expect(tracer().querySelector('[data-codes-flow-route="retry"]').textContent).toBe('Welder retest → step 6');
    await click('[data-codes-flow-route="retry"]');
    expect(connection().dataset).toMatchObject({ from: '7', to: '6', path: 'retry', status: 'preview' });
    expect(highlighted()).toEqual(['7:6']);
    await click('[data-codes-flow-next]');
    expect(tracer().dataset.step).toBe('6'); expect(tracer().dataset.lane).toBe('welder');
    expect(connection().dataset).toMatchObject({ from: '7', to: '6', path: 'retry', status: 'followed' });
    await step(7); await click('[data-codes-flow-route="retry"]'); await click('[data-codes-flow-route="forward"]');
    expect(connection().dataset).toMatchObject({ from: '7', to: '8', path: 'forward', status: 'preview' });
    await click('[data-codes-flow-next]'); expect(tracer().dataset.step).toBe('8');
  });

  it('clears a traced connection when manually inspecting or using numbered-step navigation', async () => {
    await mount(); await click('[data-codes-flow-next]');
    expect(connection().dataset.status).toBe('followed');
    await step(7);
    expect(connection().dataset).toMatchObject({ from: '7', to: '8', status: 'preview', path: 'forward' });
    expect(connection().textContent).toBe('Connection to explore: step 7 → step 8.');
    expect(tracer().querySelector('[data-codes-flow-next-target]')).toBeNull();
    await click('[data-codes-flow-prev]');
    expect(tracer().dataset.step).toBe('6');
    expect(connection().dataset).toMatchObject({ from: '6', to: '7', status: 'preview', path: 'forward' });
    await step(8);
    expect(connection().dataset).toMatchObject({ from: '8', to: '', status: 'end', path: '' });
    expect(highlighted()).toEqual([]);
    expect(tracer().textContent).toContain('Choosing any numbered step starts the trace there');
    expect(tracer().textContent).not.toMatch(/Steps completed|qualification issued|test passed/i);
  });

  it('leaves written WPS values, saved field selection and both quiz histories untouched', async () => {
    const saved = { insp2_wpsField: 'pos', insp2_sort: { fno: 'req', amps: 'ok' }, insp2_clause: { 0: 0 }, codes_pick: 'asme9' };
    const latest = await mount(saved);
    const originalWps = host.querySelector('[data-wps-field-value]').textContent;
    await step(3); await click('[data-codes-flow-route="retry"]'); await click('[data-codes-flow-next]');
    await step(7); await click('[data-codes-flow-route="retry"]'); await click('[data-codes-flow-next]');
    await step(8); await click('[data-codes-flow-prev]');
    expect(latest()).toEqual({ view: 'codes', insp2_codesTab: 'flow', ...saved });
    expect(host.querySelector('[data-wps-workbench]').dataset.wpsWorkbench).toBe('pos');
    expect(host.querySelector('[data-wps-field-value]').textContent).toBe(originalWps);
    expect(host.querySelector('[aria-label="WPS fields"]').querySelectorAll('[role="radio"]')).toHaveLength(11);
  });

  it('retains exploration across tab changes without leaking it into the sorter or clause quiz', async () => {
    const latest = await mount({ insp2_sort: { amps: 'ok' } });
    await step(3); await click('[data-codes-flow-route="retry"]');
    const tab = text => [...host.querySelectorAll('button')].find(b => b.textContent.trim() === text);
    await React.act(() => tab('🗂 Essential Variable Sorter').click());
    expect(tracer()).toBeNull(); expect(host.querySelector('[data-codes-change-bench]')).toBeTruthy();
    expect(latest().insp2_sort).toEqual({ amps: 'ok' });
    await React.act(() => tab('🔁 WPS → PQR → WPQ').click());
    expect(tracer().dataset.step).toBe('3');
    expect(connection().dataset).toMatchObject({ from: '3', to: '1', path: 'retry', status: 'preview' });
    expect(latest().insp2_sort).toEqual({ amps: 'ok' });
  });

  it('normalizes malformed saved tabs without changing the flow defaults or quiz records', async () => {
    const latest = await mount({ insp2_wpsField: '__proto__', insp2_sort: { process: 'invalid' }, codes_pick: '__proto__' });
    expect(tracer().dataset.step).toBe('1'); expect(highlighted()).toEqual(['1:2']);
    await step(7); await click('[data-codes-flow-route="retry"]');
    expect(latest().insp2_wpsField).toBe('__proto__'); expect(latest().codes_pick).toBe('__proto__');
    expect(tracer().innerHTML).not.toMatch(/NaN|Infinity|undefined/);
  });

  it('uses native large controls and explicit contrast ink for the diagram, selected reading and full explanations', async () => {
    await mount({}, true); await step(7); await click('[data-codes-flow-route="retry"]');
    expect(tracer().style.background).toBe('rgb(0, 0, 0)'); expect(tracer().style.color).toBe('rgb(255, 255, 255)');
    for (const b of tracer().querySelectorAll('button')) {
      expect(b.tagName).toBe('BUTTON'); expect(b.style.minHeight).toBe('44px'); expect(b.className).toContain('focus:ring-4');
      expect(['rgb(255, 255, 255)', 'rgb(0, 0, 0)']).toContain(b.style.color);
    }
    const route = tracer().querySelector('[data-codes-flow-route="retry"]');
    expect(route.style.background).toBe('rgb(255, 255, 0)'); expect(route.style.color).toBe('rgb(0, 0, 0)');
    expect(tracer().querySelector('[data-codes-flow-reading]').style.color).toBe('rgb(255, 255, 255)');
    for (const text of tracer().querySelectorAll('[data-codes-flow-full-step]')) expect(text.style.color).toBe('rgb(255, 255, 255)');
    const edge = tracer().querySelector('[data-codes-flow-edge="7:6"] path');
    expect(edge.getAttribute('stroke')).toBe('#ffff00');
    const scene = tracer().querySelector('svg'); expect(scene.getAttribute('viewBox')).toBe('0 0 404 240');
    expect(scene.querySelector('animate,animateTransform')).toBeNull();
    expect(tracer().textContent).toContain('Top row: the procedure. Bottom row: the welder.');
  });
});
