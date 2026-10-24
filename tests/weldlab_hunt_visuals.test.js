import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
let root, host;
const core = () => window.__WeldLabCore;
const query = (hook) => host.querySelector(`[data-hunt-review${hook ? '-' + hook : ''}]`);
const byText = (text) => [...host.querySelectorAll('button')].find(button => button.textContent.trim().startsWith(text));
const surface = () => host.querySelector('[aria-roledescription="inspection surface"]');
const geom = (id = 'sampleA') => core().DH_SAMPLE_GEOM[id];
const mark = (id, sample = 'sampleA') => geom(sample).marks.find(m => m.id === id);

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  delete window.__alloflowWeldLab;
  localStorage.clear();
  resetStemLab();
  loadTool(SRC, 'weldLab');
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () {
    if (this._testDrawing) return this._testDrawing;
    this._drawnTexts = [];
    const texts = this._drawnTexts;
    this._testDrawing = new Proxy({}, {
      get: (target, key) => key in target ? target[key]
        : key === 'fillText' ? (text) => texts.push(String(text))
        : key === 'measureText' ? () => ({ width: 20 })
        : /create.*Gradient/.test(String(key)) ? () => ({ addColorStop() {} }) : () => {},
    });
    return this._testDrawing;
  });
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
});
afterEach(async () => {
  if (root) await React.act(() => root.unmount());
  root = null;
  host?.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
async function mount(extra = {}, contrast = false) {
  let latest;
  function App() {
    const [data, setData] = React.useState({ weldLab: { view: 'defectHunt', ...extra } });
    latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({
      isContrast: contrast, toolData: data, setToolData: setData,
      update: (tool, key, value) => setData(prev => ({ ...prev, [tool]: { ...prev[tool], [key]: value } })),
    }));
  }
  host = document.createElement('div');
  document.body.append(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App)));
  return () => latest;
}
async function click(node) { expect(node).toBeTruthy(); await React.act(() => node.click()); }
async function change(node, value) { expect(node).toBeTruthy(); await React.act(() => Simulate.change(node, { target: { value: String(value) } })); }
async function key(keyName) { await React.act(() => surface().dispatchEvent(new KeyboardEvent('keydown', { key: keyName, bubbles: true }))); }
async function probe(m, sample = 'sampleA') {
  const canvas = surface().querySelector('canvas');
  const frame = core().dhFrame(geom(sample), canvas._logicalW || canvas.width || 900, canvas._logicalH || canvas.height || 280);
  const at = core().dhToPx(frame, m.u, m.v);
  await React.act(() => Simulate.click(canvas, { clientX: at.x, clientY: at.y }));
}
async function classify(cls) {
  const radios = host.querySelectorAll('[aria-label="Classify the selected spot"] button[role="radio"]');
  const index = cls === 'ok' ? core().DH_DEFECT_TYPES.length : core().DH_DEFECT_TYPES.indexOf(cls);
  expect(index).toBeGreaterThanOrEqual(0);
  await click(radios[index]);
  await click(byText('Confirm classification'));
}
async function commit(id, cls, sample = 'sampleA') { await probe(mark(id, sample), sample); await classify(cls); }
async function cutAt(u) {
  if (!byText('Hide the cutting tools')) await click(byText('Open the cutting tools'));
  const input = [...host.querySelectorAll('input[type="range"]')].find(node => node.getAttribute('aria-label') === 'Cut position');
  await change(input, u);
  await click(byText('✂️ Cut here'));
}
const snapshotCatalog = (latest) => JSON.parse(JSON.stringify(latest().defectCatalog || {}));

describe('Defect Hunt committed-evidence notebook', () => {
  it('keeps initial and pending inspections out of the review map and does not expose feature answers', async () => {
    const latest = await mount();
    expect(query().dataset.huntReview).toBe('empty');
    expect(query('map')).toBeNull();
    expect(query('truth')).toBeNull();
    await probe(mark('A1'));
    expect(host.querySelector('#dh2-cls-h')).toBeTruthy();
    expect(query().dataset.huntReview).toBe('empty');
    expect(query('pick')).toBeNull();
    expect(latest().defectCatalog).toBeUndefined();
    await click(byText('Cancel'));
    expect(query().dataset.huntReview).toBe('empty');
    await click(byText('👁️ Reveal all'));
    expect(query().dataset.huntReview).toBe('empty');
    expect(query('map')).toBeNull();
    expect(latest().defectCatalog).toBeUndefined();
  });

  it('records the already-unlocked truth and original first call only after confirmation', async () => {
    const latest = await mount();
    await commit('A1', 'porosity');
    expect(query().dataset.huntReview).toBe('A1');
    expect(query().dataset.reviewCount).toBe('1');
    expect(query('first-call').dataset.huntReviewFirstCall).toBe('porosity');
    expect(query('truth').dataset.huntReviewTruth).toBe('porosity');
    expect(query('observation').dataset.huntReviewObservation).toBe('surface');
    expect(query('map').getAttribute('data-hunt-review-map')).toBe('A1');
    expect(query('section')).toBeNull();
    expect(host.querySelector('[data-hunt-review-view="section"]')).toBeNull();
    expect(latest().defectCatalog.porosity).toMatchObject({ foundCount: 1, classifiedCount: 1, sampleIds: ['sampleA'] });
    await click(query('open'));
    expect(document.activeElement).toBe(query());
  });

  it('retains mistaken calls and normal features while review navigation makes no new catalog or scoring events', async () => {
    const latest = await mount();
    await commit('A1', 'undercut');
    await commit('A5', 'undercut');
    expect(query().dataset.huntReview).toBe('A5');
    expect(query().dataset.reviewCount).toBe('2');
    expect(query('truth').dataset.huntReviewTruth).toBe('ok');
    expect(query('first-call').dataset.huntReviewFirstCall).toBe('undercut');
    expect(query('map').getAttribute('data-hunt-review-map')).toBe('A1,A5');
    const catalog = snapshotCatalog(latest);
    expect(catalog.porosity).toMatchObject({ foundCount: 1, classifiedCount: 0, missCount: 1 });
    expect(catalog.undercut).toBeUndefined();
    const stats = [...host.querySelectorAll('canvas')][0].getAttribute('aria-label');
    expect(stats).toContain('Located so far: 1. Classified correctly: 0 of 2.');
    await click(query('prev'));
    expect(query().dataset.huntReview).toBe('A1');
    expect(query('prev').disabled).toBe(true);
    expect(query('first-call').dataset.huntReviewFirstCall).toBe('undercut');
    await click(query('next'));
    expect(query().dataset.huntReview).toBe('A5');
    expect(query('next').disabled).toBe(true);
    await click(host.querySelector('[data-hunt-review-pick="A1"]'));
    expect(snapshotCatalog(latest)).toEqual(catalog);
    expect([...host.querySelectorAll('canvas')][0].getAttribute('aria-label')).toBe(stats);
  });

  it('locks reviewed evidence independently of the live reticle and compares existing renderer light angles manually', async () => {
    const latest = await mount();
    await commit('A1', 'porosity');
    const catalog = snapshotCatalog(latest), observation = query('observation').textContent;
    const before = host.querySelector('#dh2-readout').textContent;
    await key('ArrowRight');
    await key('ArrowDown');
    expect(host.querySelector('#dh2-readout').textContent).not.toBe(before);
    expect(query().dataset.huntReview).toBe('A1');
    expect(query('observation').textContent).toBe(observation);
    await click(host.querySelector('[data-hunt-review-view="lighting"]'));
    expect(query().dataset.reviewMode).toBe('lighting');
    expect([...query('evidence').querySelectorAll('[data-hunt-review-light]')].map(node => Number(node.dataset.huntReviewLight))).toEqual([10, 90]);
    expect(query('evidence').querySelectorAll('canvas')).toHaveLength(2);
    const light = [...host.querySelectorAll('input[type="range"]')].find(node => node.getAttribute('aria-label') === 'Light angle');
    await change(light, 25);
    await click(host.querySelector('[data-hunt-review-view="surface"]'));
    expect(Number(query('light').dataset.huntReviewLight)).toBe(25);
    expect(latest().dh2_light).toBe(25);
    expect(snapshotCatalog(latest)).toEqual(catalog);
  });

  it('does not expand committed findings from reveal-only labels or later probe attempts', async () => {
    const latest = await mount();
    await commit('A1', 'porosity');
    const catalog = snapshotCatalog(latest);
    await probe(mark('A5'));
    expect(host.querySelector('#dh2-cls-h')).toBeTruthy();
    await click(byText('👁️ Reveal all'));
    expect(host.querySelector('#dh2-cls-h')).toBeNull();
    expect(query().dataset.reviewCount).toBe('1');
    expect(host.querySelectorAll('[data-hunt-review-pick]')).toHaveLength(1);
    expect(query('map').getAttribute('data-hunt-review-map')).toBe('A1');
    await probe(mark('A5'));
    expect(host.querySelector('#dh2-cls-h')).toBeNull();
    expect(query().dataset.reviewCount).toBe('1');
    expect(snapshotCatalog(latest)).toEqual(catalog);
    // The unchanged reducer also refuses a deliberately stale pending call.
    const revealed = { ...core().dhHuntInit('sampleA'), revealed: true, pending: 'A5', pendingVia: 'surface' };
    const result = core().dhHuntReduce(revealed, { type: 'classify', cls: 'ok' }, geom());
    expect(result.state.picks).toEqual({});
    expect(result.state.order).toEqual([]);
    expect(result.events).toEqual([]);
  });

  it('replays the actual recorded section rather than creating a new section at the feature centre', async () => {
    const latest = await mount({ dh_sampleIdx: 1 });
    // B1 will be committed finding #2, although it is local section feature #1.
    await commit('B5', 'ok', 'sampleB');
    await probe(mark('B1', 'sampleB'), 'sampleB');
    expect(host.querySelector('#dh2-cls-h')).toBeNull();
    expect(query().dataset.huntReview).toBe('B5');
    await cutAt(0.14);
    const features = core().dhSectionMarks(geom('sampleB'), 0.14);
    const index = features.findIndex(feature => feature.id === 'B1');
    expect(index).toBeGreaterThanOrEqual(0);
    await click(host.querySelectorAll('[aria-label="Features in this section"] button')[index]);
    expect(host.querySelector('#dh2-cls-h').textContent).toContain('Feature in the section');
    expect(query().dataset.huntReview).toBe('B5');
    // Existing inspection allows changing the active cut with the classifier
    // still open. The notebook must retain the plane that located this feature.
    await cutAt(0.75);
    expect(host.querySelector('#dh2-cls-h')).toBeTruthy();
    await classify('lackOfFusion');
    expect(query().dataset.huntReview).toBe('B1');
    expect(query().dataset.reviewMode).toBe('section');
    expect(Number(query('section').dataset.huntReviewSection)).toBe(0.14);
    expect(Number(query('section-number').dataset.huntReviewSectionNumber)).toBe(2);
    expect(host.querySelector('[data-hunt-review-pick="B1"]').textContent).toMatch(/^2\./);
    const replay = query('section').querySelector('canvas');
    expect(replay._drawnTexts.length).toBeGreaterThan(0);
    expect([...new Set(replay._drawnTexts)]).toEqual(['2']);
    expect(Number(query('section').dataset.huntReviewSection)).not.toBe(mark('B1', 'sampleB').u);
    expect(query('observation').dataset.huntReviewObservation).toBe('section');
    expect(latest().defectCatalog.lackOfFusion).toMatchObject({ foundCount: 1, classifiedCount: 1 });
    const left = byText('✂️ Cut here').textContent;
    expect(Number(query('section').dataset.huntReviewSection)).toBe(0.14);
    await click(host.querySelector('[data-hunt-review-view="lighting"]'));
    await click(host.querySelector('[data-hunt-review-view="section"]'));
    expect(byText('✂️ Cut here').textContent).toBe(left);
    expect(Number(query('section').dataset.huntReviewSection)).toBe(0.14);
    expect(query('section').querySelector('canvas').getAttribute('aria-label')).toContain('already-cut section at 14 percent');
  });

  it('cannot unlock section replay for a surface finding even when unrelated cuts exist', async () => {
    await mount();
    await cutAt(0.5);
    await commit('A1', 'porosity');
    expect(query().dataset.reviewMode).toBe('surface');
    expect(host.querySelector('[data-hunt-review-view="section"]')).toBeNull();
    expect(query('section')).toBeNull();
  });

  it('clears notebook findings on sample reset or switch while preserving the earned catalog', async () => {
    const latest = await mount();
    await commit('A1', 'porosity');
    const catalog = snapshotCatalog(latest);
    await click(byText('👁️ Reveal all'));
    await click(byText('🔄 Reset sample'));
    expect(query().dataset.huntReview).toBe('empty');
    expect(query('map')).toBeNull();
    expect(snapshotCatalog(latest)).toEqual(catalog);
    await commit('A1', 'porosity');
    await click(host.querySelectorAll('[aria-label="Select sample to inspect"] button')[1]);
    expect(latest().dh_sampleIdx).toBe(1);
    expect(query().dataset.huntReview).toBe('empty');
    expect(query('map')).toBeNull();
    expect(query('truth')).toBeNull();
    expect(latest().defectCatalog.porosity.foundCount).toBe(2);
  });

  it('shows distinct selected finding and evidence-view states in contrast mode with native 44px controls', async () => {
    await mount({}, true);
    await commit('A1', 'porosity');
    await commit('A5', 'ok');
    expect(query().style.background).toBe('rgb(0, 0, 0)');
    expect(query().style.color).toBe('rgb(255, 255, 255)');
    const selectedFinding = host.querySelector('[data-hunt-review-pick="A5"]');
    const otherFinding = host.querySelector('[data-hunt-review-pick="A1"]');
    expect(selectedFinding.style.background).toBe('rgb(255, 255, 0)');
    expect(selectedFinding.style.color).toBe('rgb(0, 0, 0)');
    expect(otherFinding.style.background).toBe('rgb(0, 0, 0)');
    expect(otherFinding.style.color).toBe('rgb(255, 255, 255)');
    const surfaceMode = host.querySelector('[data-hunt-review-view="surface"]');
    const lightingMode = host.querySelector('[data-hunt-review-view="lighting"]');
    expect(surfaceMode.style.background).toBe('rgb(255, 255, 0)');
    expect(surfaceMode.style.color).toBe('rgb(0, 0, 0)');
    expect(lightingMode.style.background).toBe('rgb(0, 0, 0)');
    await click(lightingMode);
    expect(lightingMode.getAttribute('aria-pressed')).toBe('true');
    expect(lightingMode.style.background).toBe('rgb(255, 255, 0)');
    expect(lightingMode.style.color).toBe('rgb(0, 0, 0)');
    expect(surfaceMode.style.background).toBe('rgb(0, 0, 0)');
    for (const button of query().querySelectorAll('button')) {
      expect(button.tagName).toBe('BUTTON');
      expect(button.style.minHeight).toBe('44px');
    }
    expect(query().querySelector('animate, animateTransform')).toBeNull();
  });
});
