import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const entry = (classifiedCount = 0) => ({ foundCount: 2, classifiedCount, missCount: 0, sampleIds: ['sampleA'] });
const state = (extra = {}) => ({ view: 'defectCatalog', ...extra });
const specimens = { porosity: entry(1), undercut: entry() };
let root, drawCalls;

beforeEach(() => {
  delete window.__alloflowWeldLab;
  localStorage.clear();
  resetStemLab();
  loadTool(SRC, 'weldLab');
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  drawCalls = [];
  const gradient = { addColorStop() {} };
  const drawing = new Proxy({}, {
    get: (target, key) => key in target ? target[key]
      : key === 'createLinearGradient' || key === 'createRadialGradient' ? () => gradient
      : key === 'measureText' ? () => ({ width: 20 })
      : (...args) => { drawCalls.push([key, ...args]); }
  });
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(drawing);
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
});
afterEach(async () => {
  if (root) { await React.act(() => root.unmount()); root = null; }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function render(extra = {}, contrast = false) {
  const host = document.createElement('div');
  host.innerHTML = renderTool('weldLab', { weldLab: state(extra) }, { isContrast: contrast });
  return host;
}
async function mount(extra = {}) {
  document.body.innerHTML = '<div id="catalog-visual-root"></div>';
  let latest;
  const updates = [];
  function App() {
    const [data, setData] = React.useState({ weldLab: state(extra) });
    latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({
      toolData: data, setToolData: setData,
      update: (tool, key, value) => { updates.push([key, value]); setData(prev => ({ ...prev, [tool]: { ...prev[tool], [key]: value } })); }
    }));
  }
  root = ReactDOMClient.createRoot(document.getElementById('catalog-visual-root'));
  await React.act(() => root.render(React.createElement(App)));
  return { state: () => latest, updates };
}
const atlas = (host = document) => host.querySelector('[data-catalog-atlas]');
const btn = (text, scope = document) => [...scope.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(text));
async function click(button) { expect(button).toBeTruthy(); await React.act(() => button.click()); }
async function select(slot, value) {
  const input = document.querySelector(`[data-catalog-select="${slot}"]`);
  await React.act(() => { input.value = value; input.dispatchEvent(new Event('change', { bubbles: true })); });
}

describe('Found-specimen atlas', () => {
  it('keeps unknown types locked and opens comparison only after two types are found', () => {
    const locked = render({ defectCatalog: { bogus: entry(), spatter: entry() } });
    expect(locked.querySelector('[data-catalog-atlas-locked]')).toBeTruthy();
    expect(atlas(locked)).toBeNull();
    const one = render({ defectCatalog: { undercut: entry() } });
    expect(atlas(one).dataset.catalogAtlas).toBe('single');
    expect([...one.querySelectorAll('[data-catalog-specimen]')].map(el => el.dataset.catalogSpecimen)).toEqual(['undercut']);
    expect(one.querySelector('[data-catalog-mode="compare"]').disabled).toBe(true);
    expect([...one.querySelector('[data-catalog-select="primary"]').options].map(o => o.value)).toEqual(['undercut']);
    expect(one.querySelector('[data-catalog-select="secondary"]')).toBeNull();
  });

  it('pairs existing surface and section observations with the same unlocked specimen and its real mastery', () => {
    const host = render({ defectCatalog: specimens, dh2_diag: { 1: { tries: 1, best: 1 } }, dh2_review: { porosity: { seen: 1, named: 1, cause: 1, fix: 1 } } });
    const specimen = atlas(host).querySelector('[data-catalog-specimen="porosity"]');
    expect(specimen.querySelector('[data-catalog-surface="porosity"] p').textContent).toContain('Small round dark holes');
    expect(specimen.querySelector('[data-catalog-section="porosity"] p').textContent).toBe('Round dark voids inside the weld metal.');
    expect(specimen.querySelector('[data-catalog-location]').textContent).toContain('bead crown');
    for (const level of ['found', 'identified', 'diagnosed', 'reviewed']) {
      expect(specimen.querySelector(`[data-catalog-mastery="${level}"]`).dataset.complete).toBe('true');
    }
    expect(specimen.querySelector('[data-catalog-section] canvas').getAttribute('aria-label')).toContain('1, weld toe; 2, root');
    expect(atlas(host).textContent).toContain('each view fits its own frame');
  });

  it('supports two distinct selected specimens and synchronized loupe controls without awarding mastery', async () => {
    const app = await mount({ defectCatalog: { ...specimens, overlap: entry() } });
    app.updates.length = 0;
    await click(document.querySelector('[data-catalog-mode="compare"]'));
    expect(atlas().dataset.catalogAtlas).toBe('compare');
    expect([...document.querySelectorAll('[data-catalog-specimen]')].map(el => el.dataset.catalogSpecimen)).toEqual(['porosity', 'undercut']);
    expect([...document.querySelector('[data-catalog-select="secondary"]').options].map(o => o.value)).toEqual(['undercut', 'overlap']);
    await select('secondary', 'overlap');
    await select('primary', 'overlap');
    const pair = [...document.querySelectorAll('[data-catalog-specimen]')].map(el => el.dataset.catalogSpecimen);
    expect(new Set(pair).size).toBe(2);
    expect(pair[0]).toBe('overlap');
    expect(pair.every(type => Object.keys(app.state().defectCatalog).includes(type))).toBe(true);
    await click(document.querySelector('[data-catalog-loupe="context"]'));
    expect(atlas().dataset.catalogZoom).toBe('context');
    expect(document.querySelector('[data-catalog-loupe="context"]').getAttribute('aria-pressed')).toBe('true');
    await click(document.querySelector('[data-catalog-loupe="detail"]'));
    expect(atlas().dataset.catalogZoom).toBe('detail');
    expect(app.updates).toEqual([]);
    expect(app.state().defectCatalog).toEqual({ ...specimens, overlap: entry() });
    expect(app.state().dh2_review).toBeUndefined();
    expect(app.state().dh2_diag).toBeUndefined();
    expect(drawCalls.some(call => call[0] === 'scale' && call[1] === 1.4)).toBe(true);
    expect(drawCalls.some(call => call[0] === 'fillText' && call[1] === '1')).toBe(true);
    expect(drawCalls.some(call => call[0] === 'fillText' && call[1] === '2')).toBe(true);
  });

  it('shows the internal clue for incomplete fusion without claiming its surface proves the diagnosis', () => {
    const host = render({ defectCatalog: { lackOfFusion: entry() } });
    expect(atlas(host).querySelector('[data-catalog-surface] p').textContent).toContain('Nothing you can name from the surface');
    expect(atlas(host).querySelector('[data-catalog-section] p').textContent).toContain('sharp dark line between the weld and the plate');
  });

  it('removes reference labels, causes and prevention text throughout recall, then restores selected references', async () => {
    const app = await mount({ defectCatalog: specimens });
    await click(document.querySelector('[data-catalog-mode="compare"]'));
    await select('primary', 'undercut');
    await click(btn('🃏 Start a 2-card review'));
    for (const name of ['Porosity', 'Undercut']) {
      expect(atlas()).toBeNull();
      expect(document.querySelector('[data-catalog-review-active]')).toBeTruthy();
      expect(document.querySelector('[data-catalog-specimen]')).toBeNull();
      expect(document.querySelector('[data-catalog-select]')).toBeNull();
      expect(document.querySelector('[aria-labelledby="wl-found-h"]')).toBeNull();
      expect(document.querySelector('[aria-labelledby="wl-unfound-h"]')).toBeNull();
      expect([...document.querySelectorAll('canvas')].every(c => !c.getAttribute('aria-label').includes(name))).toBe(true);
      const radio = [...document.querySelectorAll('button[role="radio"]')].find(b => b.textContent.endsWith(name));
      await click(radio);
      await click(btn('Check'));
      await click(btn('Next: the cause'));
      expect(atlas()).toBeNull();
      expect(document.body.textContent).not.toContain(name === 'Porosity' ? 'Gas trapped while the weld froze: oil' : 'Too much current or voltage together with travel');
      await click(btn('🔄 Flip the card'));
      await click(btn('✓ I had it'));
      expect(atlas()).toBeNull();
      expect(document.body.textContent).not.toContain(name === 'Porosity' ? 'Clean the joint to bright metal and block drafts.' : 'Turn the current down about 10 percent, slow down slightly');
      await click(btn('🔄 Flip the card'));
      await click(btn('✓ I had it'));
    }
    expect(atlas().dataset.catalogAtlas).toBe('compare');
    expect(document.querySelector('[data-catalog-select="primary"]').value).toBe('undercut');
    expect(app.state().dh2_review.porosity).toMatchObject({ named: 1, cause: 1, fix: 1 });
    expect(app.state().dh2_review.undercut).toMatchObject({ named: 1, cause: 1, fix: 1 });
    expect(app.state().defectCatalog).toEqual(specimens);
  });

  it('keeps controls native and labeled, with explicit dark image grounds in contrast mode', () => {
    const host = render({ defectCatalog: specimens }, true);
    const a = atlas(host);
    for (const button of a.querySelectorAll('button')) {
      expect(button.tagName).toBe('BUTTON');
      expect(button.style.minHeight).toBe('44px');
    }
    const input = a.querySelector('select');
    expect(a.style.background).toBe('rgb(0, 0, 0)');
    for (const label of a.querySelectorAll('h2,h3,label,[data-catalog-location]')) expect(label.style.color).toBe('rgb(255, 255, 0)');
    expect(input.style.background).toBe('rgb(0, 0, 0)');
    expect(input.style.color).toBe('rgb(255, 255, 0)');
    expect(a.style.background).toBe('rgb(0, 0, 0)');
    for (const label of a.querySelectorAll('h2,h3,label,[data-catalog-location]')) expect(label.style.color).toBe('rgb(255, 255, 0)');
    expect(input.style.background).toBe('rgb(0, 0, 0)');
    expect(input.style.color).toBe('rgb(255, 255, 0)');
    expect(host.querySelector(`label[for="${input.id}"]`).textContent).toBe('First specimen');
    for (const figure of a.querySelectorAll('figure')) {
      expect(figure.style.background).toBe('rgb(0, 0, 0)');
      expect(figure.style.color).toBe('rgb(255, 255, 0)');
      expect(figure.querySelector('canvas').getAttribute('role')).toBe('img');
    }
    expect(a.innerHTML).not.toMatch(/NaN|Infinity/);
  });
});
