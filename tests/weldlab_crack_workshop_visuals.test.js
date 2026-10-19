import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const BASE = { view: 'metallurgy', met_sect: 'cracking', met2_cdIdx: 0 };
const sketches = ['centerline', 'toe', 'lamellar', 'decay', 'crater', 'underbead'];
const points = [
  [[120, 50], [117, 62], [122, 74], [118, 86], [121, 100]],
  [[96, 60], [93, 68], [96, 76], [92, 86]],
  [[84, 95], [106, 95], [106, 101], [134, 101], [134, 107], [160, 107]],
  [[64, 61], [82, 61], [158, 61], [176, 61]],
  [[186, 72], [199, 73], [200, 85], [186, 88], [193, 69]],
  [[139, 72], [141, 82], [138, 92], [141, 102]],
];
let host, root;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; delete window.__alloflowWeldLab; localStorage.clear(); resetStemLab(); loadTool(SRC, 'weldLab');
});
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; host?.remove(); });
function render(extra = {}, contrast = false) { const node = document.createElement('div'); node.innerHTML = renderTool('weldLab', { weldLab: { ...BASE, ...extra } }, { isContrast: contrast }); return node; }
async function mount(extra = {}, contrast = false) {
  let latest; const writes = [];
  function App() {
    const [data, setData] = React.useState({ weldLab: { ...BASE, ...extra } }); latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({ toolData: data, setToolData: setData, isContrast: contrast,
      update: (bucket, key, value) => { writes.push([key, value]); setData(prev => ({ ...prev, [bucket]: { ...prev[bucket], [key]: value } })); } }));
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App))); return { latest: () => latest, writes };
}
const evidence = node => (node || host).querySelector('[data-met-crack-evidence]');
async function click(selector) { await React.act(() => host.querySelector(selector).click()); }
async function textButton(text) { const button = [...host.querySelectorAll('button')].find(el => el.textContent.trim() === text); expect(button, text).toBeTruthy(); await React.act(() => button.click()); }

describe('Crack Detective observation microscope', () => {
  it('starts all six cases on their actual observation with the original location and reported time', () => {
    const times = ['solid', 'delayed', 'fab', 'service', 'solid', 'delayed'];
    const targets = [[121, 74], [94, 70], [150, 107], [73, 62], [194, 76], [140, 86]];
    for (let index = 0; index < 6; index++) {
      const node = render({ met2_cdIdx: index }), panel = evidence(node), svg = panel.querySelector('svg'), focus = panel.querySelector('[data-met-crack-focus]');
      expect(panel.dataset).toMatchObject({ metCrackEvidence: sketches[index], part: '3', view: 'context' });
      expect(svg.getAttribute('viewBox')).toBe('0 0 240 130'); expect(svg.getAttribute('role')).toBe('img');
      expect(Number(focus.dataset.x)).toBe(targets[index][0]); expect(Number(focus.dataset.y)).toBe(targets[index][1]);
      expect(panel.querySelector('[data-met-crack-when]').dataset.metCrackWhen).toBe(times[index]);
      expect(panel.querySelector('[data-met-crack-observation]').textContent).toBe(svg.getAttribute('aria-label'));
    }
  });

  it('zooms the original geometry without cropping any of the authored crack or attack evidence', async () => {
    await mount();
    for (let index = 0; index < 6; index++) {
      await click('[data-met-crack-view="detail"]');
      const svg = evidence().querySelector('svg'), [x, y, width, height] = svg.getAttribute('viewBox').split(' ').map(Number);
      expect(width).toBeLessThan(240); expect(height).toBeLessThan(130);
      for (const [px, py] of points[index]) { expect(px).toBeGreaterThanOrEqual(x); expect(px).toBeLessThanOrEqual(x + width); expect(py).toBeGreaterThanOrEqual(y); expect(py).toBeLessThanOrEqual(y + height); }
      const paths = svg.querySelectorAll('path,polyline,polygon,rect').length;
      await click('[data-met-crack-view="context"]'); expect(evidence().querySelector('svg').getAttribute('viewBox')).toBe('0 0 240 130');
      expect(evidence().querySelectorAll('path,polyline,polygon,rect').length).toBe(paths);
      if (index < 5) await textButton('Next case →');
    }
  });

  it('links every numbered part to the original leader target in context and detail without score writes', async () => {
    const app = await mount(), before = JSON.stringify(app.latest()), writes = app.writes.length;
    for (const part of [1, 2, 3, 4]) {
      await click(`[data-met-crack-part="${part}"]`); await click('[data-met-crack-view="detail"]');
      const panel = evidence(), focus = panel.querySelector('[data-met-crack-focus]'), [x, y, width, height] = panel.querySelector('svg').getAttribute('viewBox').split(' ').map(Number);
      expect(focus.dataset.metCrackFocus).toBe(String(part)); expect(panel.dataset.part).toBe(String(part));
      expect(Number(focus.dataset.x)).toBeGreaterThanOrEqual(x); expect(Number(focus.dataset.x)).toBeLessThanOrEqual(x + width);
      expect(Number(focus.dataset.y)).toBeGreaterThanOrEqual(y); expect(Number(focus.dataset.y)).toBeLessThanOrEqual(y + height);
      expect(panel.querySelector(`[data-met-crack-part="${part}"]`).getAttribute('aria-pressed')).toBe('true');
    }
    expect(JSON.stringify(app.latest())).toBe(before); expect(app.writes).toHaveLength(writes);
  });

  it('keeps mechanism explanations gated and preserves the locked first answer during exploration', async () => {
    const app = await mount(), original = evidence().innerHTML;
    expect(original).not.toMatch(/low-melting films|martensitic|chromium carbides|shrinkage pulls/i);
    const options = host.querySelectorAll('[aria-label="Which cracking mechanism is it?"] button');
    await React.act(() => options[0].click()); expect(app.latest().met2_cdPicks).toMatchObject({ 0: 0 });
    expect(evidence().innerHTML).toBe(original); expect([...host.querySelectorAll('[aria-label="Which cracking mechanism is it?"] button')].every(button => button.disabled)).toBe(true);
    const scored = JSON.stringify(app.latest().met2_cdPicks);
    await click('[data-met-crack-part="2"]'); await click('[data-met-crack-view="detail"]');
    expect(JSON.stringify(app.latest().met2_cdPicks)).toBe(scored); expect(host.textContent).toContain('Score 0 / 1');
    await textButton('Next case →'); expect(evidence().dataset).toMatchObject({ caseIndex: '1', part: '3', view: 'context' });
    expect(evidence().textContent).not.toMatch(/martensitic|cellulosic|hydrogen/);
  });

  it('scopes evidence state to the case and leaves empty or hostile answer records uncommitted', () => {
    for (const met2_cdPicks of [null, {}, { 0: 99 }, ['bad'], 'bad']) {
      const node = render({ met2_cdPicks });
      expect(evidence(node).dataset.view).toBe('context');
      expect(node.querySelector('[aria-label="Which cracking mechanism is it?"] button').disabled).toBe(false);
      expect(evidence(node).textContent).not.toMatch(/NaN|undefined|Infinity/);
    }
  });

  it('offers native manual controls, explicit contrast selection and a text equivalent of the observed feature', async () => {
    await mount({}, true); const panel = evidence();
    expect(panel.style.background).toBe('rgb(0, 0, 0)'); expect(panel.style.color).toBe('rgb(255, 255, 255)');
    for (const button of panel.querySelectorAll('button')) { expect(button.type).toBe('button'); expect(button.style.minHeight).toBe('44px'); }
    const selected = panel.querySelector('[data-met-crack-part="3"]'); expect(selected.style.background).toBe('rgb(255, 255, 0)'); expect(selected.style.color).toBe('rgb(0, 0, 0)');
    expect(panel.querySelector('animate,animateTransform')).toBeNull(); expect(panel.textContent).toContain('not crack-growth or inspection simulations');
  });

  it('keeps a dark outline behind light crack strokes when they cross pale weld metal', () => {
    for (const index of [0, 1, 2, 5]) {
      const svg = evidence(render({ met2_cdIdx: index })).querySelector('svg'), outline = svg.querySelector('[data-met-crack-outline]');
      expect(outline).toBeTruthy(); expect(outline.getAttribute('stroke')).toBe('#0f172a');
      const core = outline.nextElementSibling;
      expect(core.getAttribute('points')).toBe(outline.getAttribute('points'));
      expect(Number(outline.getAttribute('stroke-width'))).toBeGreaterThan(Number(core.getAttribute('stroke-width')));
    }
  });
});
