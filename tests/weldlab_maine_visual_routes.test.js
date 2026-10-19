import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const PATHS = { biw_internal: 'biw', emcc_boatyard: 'emcc', ua_apprentice: 'ua', cte_smallshop: 'cte' };
const BASE = { view: 'maineEcosystem' };
let root, host;
const core = () => window.__WeldLabCore;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.__alloflowWeldLab;
  localStorage.clear();
  resetStemLab();
  loadTool(SRC, 'weldLab');
});
afterEach(async () => {
  if (root) await React.act(() => root.unmount());
  root = null;
  host?.remove();
});

function render(extra = {}, contrast = false) {
  const el = document.createElement('div');
  el.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }, { isContrast: contrast });
  return el;
}
async function mount(extra = {}) {
  let latest;
  function App() {
    const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } });
    latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({
      toolData: data, setToolData: setData,
      update: (id, key, value) => setData(prev => ({ ...prev, [id]: { ...prev[id], [key]: value } })),
    }));
  }
  host = document.createElement('div');
  document.body.append(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App)));
  return () => latest;
}
async function click(selector) {
  const button = host.querySelector(selector);
  expect(button, selector).toBeTruthy();
  await React.act(() => button.click());
}
async function decision(number, text) {
  const group = [...host.querySelectorAll('[role="radiogroup"]')].find(el => el.getAttribute('aria-label').startsWith('Decision ' + number));
  expect(group).toBeTruthy();
  const button = [...group.querySelectorAll('button')].find(el => el.textContent.includes(text));
  expect(button).toBeTruthy();
  await React.act(() => button.click());
}
function assertTimeline(el, expected) {
  const timeline = el.querySelector('[data-maine-timeline]');
  expect(Number(timeline.dataset.availableYears)).toBe(expected.steps.length);
  expect(Number(timeline.querySelector('progress').value)).toBe(expected.steps.length);
  for (let i = 0; i < 8; i++) {
    const button = timeline.querySelector(`[data-maine-year-node="${i}"]`);
    expect(button.disabled).toBe(i >= expected.steps.length);
    if (i < expected.steps.length) expect(Number(button.dataset.yearPay)).toBe(expected.years[i]);
    else {
      expect(button.hasAttribute('data-year-pay')).toBe(false);
      expect(button.textContent).toContain('Decision ahead');
    }
  }
}

describe('Maine career route visuals', () => {
  it('inspects every authored entry route without committing a branch, then opens that same roadmap', async () => {
    const latest = await mount({ car2_road: { d1: 'pipeline', d2: 'shop' } });
    for (const [id, start] of Object.entries(PATHS)) {
      await click(`[data-maine-route-node="${id}"]`);
      expect(host.querySelector('[data-maine-network]').dataset.maineNetwork).toBe(id);
      expect(host.querySelector('[data-maine-network-detail]').dataset.maineNetworkDetail).toBe(id);
      expect(Number(host.querySelector('[data-maine-entry-total]').dataset.maineEntryTotal)).toBe(core().car2RoadTotals(start, null, null).total);
      expect(host.querySelectorAll('[data-maine-route-node][aria-pressed="true"]')).toHaveLength(1);
      expect(latest().me_road_path).toBeUndefined();
      expect(latest().car2_road).toEqual({ d1: 'pipeline', d2: 'shop' });
    }
    await click('[data-maine-open-route="cte_smallshop"]');
    expect(latest()).toMatchObject({ me_road_path: 'cte_smallshop', me_mode: 'roadmap', car2_road: { d1: 'pipeline', d2: 'shop' } });
    expect(host.querySelector('[data-maine-timeline]').dataset.maineTimeline).toBe('cte');
    assertTimeline(host, core().car2RoadTotals('cte', 'pipeline', 'shop'));
  });

  it.each(Object.entries(PATHS))('uses the existing model for %s and hides unchosen future pay', (id, start) => {
    for (const [d1, d2] of [[null, null], ['cianbro', null], ['pipeline', 'cwi'], ['stay', 'keep']]) {
      const el = render({ me_mode: 'roadmap', me_road_path: id, car2_road: { d1, d2 } });
      const expected = core().car2RoadTotals(start, d1, d2);
      assertTimeline(el, expected);
      const detail = el.querySelector('[data-maine-year-detail]');
      expect(Number(detail.dataset.yearPay)).toBe(expected.years[0]);
      expect(Number(detail.dataset.runningPay)).toBe(expected.running[0]);
    }
  });

  it('unlocks the timeline in the same stages as the two decisions and selection changes only the inspected year', async () => {
    const latest = await mount({ me_mode: 'roadmap', me_road_path: 'emcc_boatyard' });
    assertTimeline(host, core().car2RoadTotals('emcc', null, null));
    await click('[data-maine-year-node="6"]');
    expect(host.querySelector('[data-maine-year-detail]').dataset.maineYearDetail).toBe('0');
    await decision(1, 'Stay on this track');
    assertTimeline(host, core().car2RoadTotals('emcc', 'stay', null));
    await decision(2, 'Take CWI prep');
    const expected = core().car2RoadTotals('emcc', 'stay', 'cwi');
    assertTimeline(host, expected);
    await click('[data-maine-year-node="4"]');
    expect(latest().car2_road).toEqual({ d1: 'stay', d2: 'cwi' });
    const detail = host.querySelector('[data-maine-year-detail]');
    expect(detail.dataset.maineYearDetail).toBe('4');
    expect(Number(detail.dataset.yearPay)).toBe(expected.years[4]);
    expect(Number(detail.dataset.runningPay)).toBe(expected.running[4]);
    expect(detail.querySelector('[data-maine-year-credentials]').dataset.maineYearCredentials).toBe(expected.steps[4].creds.join(','));
    expect(detail.textContent).toContain('CWI exam');
    expect(host.querySelector('[data-maine-route-choices]').textContent).toContain('Take CWI prep');
  });

  it('clearing choices closes future nodes and safely clamps a previously inspected future year', async () => {
    const latest = await mount({ me_mode: 'roadmap', me_road_path: 'ua_apprentice', car2_road: { d1: 'stay', d2: 'keep' } });
    await click('[data-maine-year-node="7"]');
    const clear = [...host.querySelectorAll('button')].find(el => el.textContent.includes('Clear my two choices'));
    await React.act(() => clear.click());
    expect(latest().car2_road).toBeNull();
    assertTimeline(host, core().car2RoadTotals('ua', null, null));
    expect(host.querySelector('[data-maine-year-detail]').dataset.maineYearDetail).toBe('1');
    expect(host.querySelectorAll('[data-maine-year-node][aria-pressed="true"]')).toHaveLength(1);
  });

  it('does not let an orphan second choice reveal future steps and normalizes hostile saved paths', () => {
    const orphan = render({ me_mode: 'roadmap', me_road_path: 'biw_internal', car2_road: { d1: 'constructor', d2: 'robotics' } });
    assertTimeline(orphan, core().car2RoadTotals('biw', null, null));
    expect(orphan.querySelector('[data-maine-route-choices]').textContent).not.toContain('Move into robotics');
    const invalid = render({ me_road_path: '__proto__', car2_road: [] });
    expect(invalid.querySelector('[data-maine-network]').dataset.maineNetwork).toBe('biw_internal');
    expect(invalid.innerHTML).not.toMatch(/(?:NaN|Infinity|undefined)/);
  });

  it('keeps pay bars tied to actual cost-year magnitudes and exposes their minus sign in HTML', () => {
    const el = render({ me_mode: 'roadmap', me_road_path: 'emcc_boatyard' });
    const expected = core().car2RoadTotals('emcc', null, null), button = el.querySelector('[data-maine-year-node="0"]');
    expect(expected.years[0]).toBeLessThan(0);
    expect(button.textContent).toContain('-');
    const bar = button.querySelector('rect');
    expect(bar.getAttribute('stroke-dasharray')).toBe('3 2');
    const max = Math.max(...expected.years.map(Math.abs));
    expect(Number(bar.getAttribute('height'))).toBeCloseTo(Math.abs(expected.years[0]) / max * 36, 8);
    expect(el.querySelector('[data-maine-timeline]').textContent).toContain('bar heights compare magnitudes');
  });

  it('has responsive native controls, explicit contrasting text and no motion or geographic claims', () => {
    const el = render({}, true), network = el.querySelector('[data-maine-network]');
    expect(network.style.background).toBe('rgb(0, 0, 0)');
    expect(network.style.color).toBe('rgb(255, 255, 255)');
    expect(network.querySelector('h3').style.color).toBe('rgb(255, 255, 0)');
    expect(network.textContent).toContain('not a geographic map or a list of open jobs');
    for (const button of network.querySelectorAll('button')) {
      expect(button.tagName).toBe('BUTTON');
      expect(button.style.minHeight).toBe('44px');
      expect(button.querySelector('button,a')).toBeNull();
      expect(button.className).toContain('focus:ring-4');
    }
    expect(network.querySelector('animate,animateTransform')).toBeNull();
    const road = render({ me_mode: 'roadmap', me_road_path: 'cte_smallshop' }, true).querySelector('[data-maine-timeline]');
    expect(road.style.background).toBe('rgb(0, 0, 0)');
    const active = road.querySelector('[data-maine-year-node="0"]');
    expect(active.style.background).toBe('rgb(255, 255, 0)');
    expect(active.style.color).toBe('rgb(0, 0, 0)');
    expect(road.querySelector('[data-maine-year-detail]').style.color).toBe('rgb(255, 255, 255)');
  });
});
