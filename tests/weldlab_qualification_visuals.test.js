import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const state = (extra = {}) => ({ view: 'qualPrep', qp_view: 'bend', ...extra });
let root;

beforeEach(() => {
  delete window.__alloflowWeldLab;
  localStorage.clear();
  resetStemLab();
  loadTool(SRC, 'weldLab');
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(async () => {
  if (root) { await React.act(() => root.unmount()); root = null; }
});

function render(extra = {}, contrast = false) {
  const host = document.createElement('div');
  host.innerHTML = renderTool('weldLab', { weldLab: state(extra) }, { isContrast: contrast });
  return host;
}
async function mount(extra = {}) {
  document.body.innerHTML = '<div id="qualification-visual-root"></div>';
  let latest;
  function App() {
    const [data, setData] = React.useState({ weldLab: state(extra) });
    latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({
      toolData: data, setToolData: setData,
      update: (tool, key, value) => setData(prev => ({ ...prev, [tool]: { ...prev[tool], [key]: value } }))
    }));
  }
  root = ReactDOMClient.createRoot(document.getElementById('qualification-visual-root'));
  await React.act(() => root.render(React.createElement(App)));
  return () => latest;
}
const journey = (host = document) => host.querySelector('[data-pipe2-journey-stage]');
async function stage(id) {
  await React.act(() => document.querySelector(`[data-pipe2-journey-step="${id}"]`).click());
}
async function type(id) {
  const label = { face: 'Face bend', root: 'Root bend', side: 'Side bend' }[id];
  const button = [...document.querySelectorAll('button[role="radio"]')].find(b => b.textContent.trim() === label);
  expect(button, label).toBeTruthy();
  await React.act(() => button.click());
}
async function inputFlaw(value) {
  const input = document.querySelector('input[type="range"]');
  await React.act(() => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, String(value));
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('Qualification coupon journey', () => {
  it.each(['face', 'root', 'side'])('adds a schematic %s orientation without replacing the measured finished bend', (id) => {
    const host = render({ pipe2_bend: id });
    const section = journey(host);
    expect(section.dataset.pipe2JourneyStage).toBe('coupon');
    expect(section.dataset.pipe2JourneyType).toBe(id);
    expect(section.querySelector('[data-pipe2-coupon-band]')).toBeTruthy();
    expect(section.textContent).toContain('not a cutting layout');
    expect(section.querySelector('[data-pipe2-outside-label]').dataset.pipe2OutsideLabel).toBe(id);
    const oldImage = host.querySelector(`[data-pipe2-finished-bend="${id}"]`);
    expect(oldImage).toBeTruthy();
    expect(oldImage.getAttribute('aria-label')).toContain('1/8 in. limit');
    expect(host.querySelector('[data-pipe2-bend-result]').dataset.pipe2BendResult).toBe('accept');
  });

  it('provides manual native stage controls and preserves stage when choosing another specimen type', async () => {
    const current = await mount();
    for (const id of ['orient', 'bend', 'coupon']) {
      await stage(id);
      expect(journey().dataset.pipe2JourneyStage).toBe(id);
      expect(document.querySelector(`[data-pipe2-journey-step="${id}"]`).getAttribute('aria-pressed')).toBe('true');
      expect([...document.querySelectorAll('[data-pipe2-journey-step]')].filter(b => b.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
      expect(document.querySelector('[data-pipe2-finished-bend]')).toBeTruthy();
    }
    await stage('bend');
    for (const id of ['root', 'side', 'face']) {
      await type(id);
      expect(current().pipe2_bend).toBe(id);
      expect(journey().dataset.pipe2JourneyStage).toBe('bend');
      expect(journey().dataset.pipe2JourneyType).toBe(id);
      expect(journey().querySelector('[data-pipe2-selected-surface]').dataset.pipe2SelectedSurface).toBe(id);
      expect(journey().querySelector('[data-pipe2-neutral-axis]')).toBeTruthy();
      expect(journey().textContent).toContain('outside surface stretches.');
      expect(journey().textContent).toContain('inside surface shortens.');
    }
    expect(current().qp_ans).toBeUndefined();
    expect(current().pipe2_scn).toBeUndefined();
    for (const button of document.querySelectorAll('[data-pipe2-journey-step]')) {
      expect(button.tagName).toBe('BUTTON');
      expect(button.style.minHeight).toBe('44px');
    }
  });

  it('carries cap, root and full thickness cut-face orientation into the specimen', async () => {
    await mount();
    await stage('orient');
    const paths = {};
    for (const id of ['face', 'root', 'side']) {
      await type(id);
      const image = journey().querySelector('svg');
      paths[id] = image.querySelector('[data-pipe2-selected-surface]').getAttribute('d');
      expect(image.getAttribute('aria-label')).toContain('outside of the U');
      expect(journey().querySelector('[data-pipe2-outside-label]').dataset.pipe2OutsideLabel).toBe(id);
    }
    expect(new Set(Object.values(paths)).size).toBe(3);
    // Face marks the upper plane, root the lower edge, side the full thickness.
    expect(paths.face).toContain('108');
    expect(paths.root).toContain('172');
    expect(paths.side).toContain('V172');
    expect(journey().textContent).toContain('from root through the passes to the cap');
  });

  it.each(['face', 'root', 'side'])('keeps the existing 1/8 inch criterion for %s bends', (id) => {
    for (const [flaw, result] of [[0, 'accept'], [3, 'accept'], [4, 'accept'], [5, 'reject'], [8, 'reject']]) {
      const host = render({ pipe2_bend: id, pipe2_flaw: flaw });
      expect(host.querySelector('[data-pipe2-bend-result]').dataset.pipe2BendResult).toBe(result);
      expect(journey(host).dataset.pipe2JourneyFlaw).toBe(String(flaw / 32));
      expect(host.querySelector('[data-pipe2-finished-bend]').getAttribute('aria-label')).toContain('1/8 in. limit');
    }
  });

  it('follows the live flaw slider without changing the stage or the acceptance rule', async () => {
    const current = await mount({ pipe2_bend: 'side', pipe2_flaw: 4 });
    await stage('bend');
    expect(journey().querySelector('[data-pipe2-journey-opening]').dataset.pipe2JourneyOpening).toBe('0.125');
    expect(journey().textContent).toContain('Current opening: 1/8 in.');
    await inputFlaw(5);
    expect(current().pipe2_flaw).toBe(5);
    expect(journey().dataset.pipe2JourneyStage).toBe('bend');
    expect(journey().querySelector('[data-pipe2-journey-opening]').dataset.pipe2JourneyOpening).toBe('0.15625');
    expect(document.querySelector('[data-pipe2-bend-result]').dataset.pipe2BendResult).toBe('reject');
    expect(journey().textContent).toContain('Current opening: 5/32 in.');
    await inputFlaw(0);
    expect(journey().querySelector('[data-pipe2-journey-opening]')).toBeNull();
    expect(document.querySelector('[data-pipe2-bend-result]').dataset.pipe2BendResult).toBe('accept');
    expect(journey().innerHTML).not.toMatch(/NaN|Infinity/);
  });

  it('keeps the conceptual drawing contrast safe and repeats its meaning in HTML', () => {
    const section = journey(render({ pipe2_bend: 'root' }, true));
    expect(section.querySelector('svg').style.background).toBe('rgb(0, 0, 0)');
    expect(section.querySelector('svg').getAttribute('role')).toBe('img');
    expect(section.querySelector('svg').getAttribute('aria-label')).toContain('Geometry is schematic and not to scale');
    expect(section.querySelector('[data-pipe2-outside-label]').textContent).toContain('Root face');
    expect(section.textContent).toContain('base metal on both sides');
  });
});
