import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const STATIONS = {
  fume: ['lev', 'stainless_ev', 'papr'],
  eyes: ['screens', 'helmet', 'safety_glasses'],
  hearing: ['hp_available', 'hp_required', 'hp_double'],
  electrical: ['cables_inspected', 'dry_gloves', 'work_clamp'],
  fire: ['fire_ext', 'hot_work_watch', 'cylinder_secured'],
  ergo: ['positioner', 'mat', 'breaks'],
};
const IDS = Object.values(STATIONS).flat();
const state = (extra = {}) => ({ view: 'safetyHealth', sh_mode: 'audit', ...extra });
let root, host;

beforeEach(() => {
  delete window.__alloflowWeldLab;
  localStorage.clear();
  resetStemLab();
  loadTool(SRC, 'weldLab');
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(async () => {
  if (root) await React.act(() => root.unmount());
  root = null;
  host?.remove();
});

function render(extra = {}, contrast = false) {
  const node = document.createElement('div');
  node.innerHTML = renderTool('weldLab', { weldLab: state(extra) }, { isContrast: contrast });
  return node;
}
async function mount(extra = {}) {
  let latest;
  function App() {
    const [data, setData] = React.useState({ weldLab: state(extra) });
    latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({
      toolData: data, setToolData: setData,
      update: (tool, key, value) => setData(prev => ({ ...prev, [tool]: { ...prev[tool], [key]: value } })),
    }));
  }
  host = document.createElement('div');
  document.body.append(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App)));
  return () => latest;
}
async function click(selector) {
  const button = typeof selector === 'string' ? host.querySelector(selector) : selector;
  expect(button).toBeTruthy();
  await React.act(() => button.click());
}
const scene = (node = host) => node.querySelector('[data-shop-inspection]');
const control = (id, node = host) => node.querySelector(`[data-shop-control="${id}"]`);
const answer = (id, val) => `[data-shop-answer="${id}:${val}"]`;
const checklist = (id, val) => `[data-audit-answer="${id}:${val}"]`;

describe('Illustrated shop inspection', () => {
  it('connects six native station selectors and all 18 physical controls to the original checklist', () => {
    const node = render();
    expect(node.querySelectorAll('[data-shop-bay]')).toHaveLength(6);
    expect(node.querySelectorAll('[data-shop-hotspot]')).toHaveLength(6);
    expect(node.querySelectorAll('[data-shop-control]')).toHaveLength(18);
    expect(node.querySelectorAll('[data-shop-checklist-item]')).toHaveLength(18);
    IDS.forEach(id => {
      expect(control(id, node).dataset.state).toBe('unanswered');
      expect(control(id, node).getAttribute('opacity')).toBe('0.23');
      expect(node.querySelectorAll(`[data-shop-checklist-item="${id}"] [data-audit-answer]`)).toHaveLength(3);
    });
    for (const button of node.querySelectorAll('[data-shop-hotspot]')) {
      expect(button.tagName).toBe('BUTTON');
      expect(button.getAttribute('aria-label')).toMatch(/^Station [1-6]: /);
      expect(button.style.width).toBe('44px');
      expect(button.style.height).toBe('44px');
    }
    const svg = node.querySelector('[data-shop-scene]');
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toContain('recorded Yes');
    expect(svg.style.width).toBe('100%');
    expect(svg.querySelector('animate, animateTransform, image')).toBeNull();
  });

  it('uses precisely the original questions and No-answer explanations at each selected station', () => {
    for (const [station, ids] of Object.entries(STATIONS)) {
      const node = render({ sh_shop_station: station, sh_audit: Object.fromEntries(ids.map(id => [id, 'no'])) });
      const panel = node.querySelector('[data-shop-station-panel]');
      expect(panel.dataset.shopStationPanel).toBe(station);
      expect(panel.querySelectorAll('[data-shop-observation]')).toHaveLength(3);
      ids.forEach(id => {
        const observation = panel.querySelector(`[data-shop-observation="${id}"]`);
        const original = node.querySelector(`[data-shop-checklist-item="${id}"]`);
        expect(observation.querySelector('h4').textContent).toBe(original.querySelector('p').textContent);
        expect(observation.textContent).toContain(original.querySelector('p:last-child').textContent);
        expect(observation.querySelector('[data-shop-reading]').dataset.state).toBe('no');
      });
    }
  });

  it('synchronizes scene answers with original buttons without counting answer changes twice', async () => {
    const current = await mount();
    await click(answer('lev', 'yes'));
    expect(current().sh_audit).toEqual({ lev: 'yes' });
    expect(control('lev').dataset.state).toBe('yes');
    expect(control('lev').getAttribute('opacity')).toBe('1');
    expect(host.querySelector(checklist('lev', 'yes')).getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('[data-shop-progress]').dataset.shopProgress).toBe('1');
    await click(checklist('lev', 'no'));
    expect(host.querySelector(answer('lev', 'no')).getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector(answer('lev', 'yes')).getAttribute('aria-pressed')).toBe('false');
    expect(control('lev').dataset.state).toBe('no');
    expect(scene().querySelector('[data-shop-observation="lev"]').textContent).toContain('Fix: put a fume extractor');
    expect(host.querySelector('[data-shop-progress]').dataset.shopProgress).toBe('1');
    expect(host.querySelector('[data-shop-progress]').dataset.gaps).toBe('1');
    await click(answer('lev', 'na'));
    expect(current().sh_audit).toEqual({ lev: 'na' });
    expect(control('lev').dataset.state).toBe('na');
    expect(control('lev').getAttribute('opacity')).toBe('0.23');
    expect(host.querySelector('[data-shop-progress]').dataset.gaps).toBe('0');
    expect(host.querySelector('[data-shop-progress]').dataset.na).toBe('1');
    expect(host.querySelector('[data-shop-progress]').dataset.shopProgress).toBe('1');
  });

  it('lets either station selector navigate without fabricating audit observations', async () => {
    const current = await mount({ sh_audit: { lev: 'no' } });
    await click('[data-shop-hotspot="fire"]');
    expect(current().sh_shop_station).toBe('fire');
    expect(scene().dataset.shopInspection).toBe('fire');
    expect(host.querySelector('[data-shop-station="fire"]').getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('[data-shop-hotspot="fume"]').getAttribute('aria-pressed')).toBe('false');
    await click('[data-shop-station="ergo"]');
    expect(current().sh_shop_station).toBe('ergo');
    expect(host.querySelector('[data-shop-station-panel]').dataset.shopStationPanel).toBe('ergo');
    expect(current().sh_audit).toEqual({ lev: 'no' });
    expect(host.querySelector('[data-shop-progress]').dataset.shopProgress).toBe('1');
  });

  it('updates unselected station artwork from original checklist answers', async () => {
    await mount();
    await click(checklist('cylinder_secured', 'yes'));
    expect(scene().dataset.shopInspection).toBe('fume');
    expect(control('cylinder_secured').dataset.state).toBe('yes');
    expect(host.querySelector('[data-shop-station="fire"]').textContent).toContain('1/3');
    await click('[data-shop-hotspot="fire"]');
    expect(host.querySelector(answer('cylinder_secured', 'yes')).getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('[data-shop-reading="cylinder_secured"]').textContent).toBe('Recorded Yes');
    await click('[data-shop-hotspot="electrical"]');
    await click(answer('cables_inspected', 'yes'));
    expect(host.querySelector('[data-shop-lead-route]').dataset.shopLeadRoute).toBe('reported-inspected');
    await click(checklist('cables_inspected', 'no'));
    expect(host.querySelector('[data-shop-lead-route]').dataset.shopLeadRoute).toBe('unconfirmed');
  });

  it('keeps N/A and unfinished evidence distinct from recorded Yes and avoids a visual safety certificate', () => {
    for (const value of ['yes', 'na']) {
      const node = render({ sh_audit: Object.fromEntries(IDS.map(id => [id, value])) });
      const workbench = scene(node), progress = node.querySelector('[data-shop-progress]');
      expect(progress.dataset.shopProgress).toBe('18');
      expect(progress.dataset.na).toBe(value === 'na' ? '18' : '0');
      expect(workbench.textContent).toContain('not verified protection');
      expect(workbench.textContent).toContain('does not approve a shop or measure exposure');
      expect(workbench.textContent).not.toMatch(/shop is safe|passed|certified|100% safe|strong safety culture/i);
      IDS.forEach(id => expect(control(id, node).getAttribute('opacity')).toBe(value === 'yes' ? '1' : '0.23'));
    }
    expect(scene(render()).querySelector('[data-shop-progress]').textContent).toContain('0 of 18 observations recorded');
  });

  it('resets the shared observations while retaining the station, calculators and hierarchy work', async () => {
    const current = await mount({ sh_shop_station: 'fire', sh_audit: { fire_ext: 'yes', lev: 'no', mat: 'na' }, safe2_noise: [{ db: 95, h: 2 }], safe2_hoc: { lev: 2 } });
    const reset = [...host.querySelectorAll('button')].find(button => button.textContent === '↺ Reset audit');
    await click(reset);
    expect(current().sh_audit).toEqual({});
    expect(current().sh_shop_station).toBe('fire');
    expect(current().safe2_noise).toEqual([{ db: 95, h: 2 }]);
    expect(current().safe2_hoc).toEqual({ lev: 2 });
    IDS.forEach(id => expect(control(id).dataset.state).toBe('unanswered'));
    expect(host.querySelector('[data-shop-progress]').dataset.shopProgress).toBe('0');
    expect(host.querySelector('[data-shop-progress]').dataset.gaps).toBe('0');
  });

  it('normalizes hostile selection and observation values without giving them inspection credit', () => {
    const node = render({ sh_shop_station: { bad: 'fire' }, sh_audit: { lev: 'true', screens: { yes: true }, made_up: 'yes', fire_ext: 'no', mat: 'na' } });
    expect(scene(node).dataset.shopInspection).toBe('fume');
    expect(control('lev', node).dataset.state).toBe('unanswered');
    expect(control('screens', node).dataset.state).toBe('unanswered');
    expect(node.querySelector('[data-shop-progress]').dataset.shopProgress).toBe('2');
    expect(node.querySelector('[data-shop-progress]').dataset.gaps).toBe('1');
    expect(node.querySelector('[data-shop-progress]').dataset.na).toBe('1');
    expect(scene(node).innerHTML).not.toMatch(/NaN|Infinity|\[object Object\]/);
  });

  it('keeps the existing browse tools separate and supplies explicit contrast colours and native controls', () => {
    const browse = render({ sh_mode: 'browse', sh_sect: 'noise' });
    expect(browse.querySelector('[data-shop-inspection]')).toBeNull();
    expect(browse.textContent).toContain('NIOSH');
    expect(browse.querySelectorAll('input').length).toBeGreaterThan(0);
    const node = render({ sh_audit: { lev: 'yes' } }, true);
    expect(scene(node).style.background).toBe('rgb(0, 0, 0)');
    expect(scene(node).style.color).toBe('rgb(255, 255, 255)');
    expect(node.querySelector('[data-shop-scene]').style.background).toBe('rgb(0, 0, 0)');
    for (const button of node.querySelectorAll('[data-shop-answer]')) {
      expect(button.tagName).toBe('BUTTON');
      expect(button.style.minHeight).toBe('44px');
      expect(button.style.color).toBe('rgb(255, 255, 255)');
      expect(button.style.background).toBe('rgb(0, 0, 0)');
    }
  });
});
