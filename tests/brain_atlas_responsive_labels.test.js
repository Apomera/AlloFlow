import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const strings = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const translate = (key, fallback) => key.split('.').reduce((value, part) => value?.[part], strings) || fallback || key;
const flatten = node => !node || typeof node !== 'object' ? [] : (Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)]);
let observers, hidden;
function context2d() {
  const stack = [];
  const state = { font: '10px sans-serif', globalAlpha: 1, clearRect: vi.fn(), fillText: vi.fn(), lineTo: vi.fn(), textRecords: [] };
  state.fillText.mockImplementation((text, x, y) => state.textRecords.push({ text, x, y, font: state.font, color: state.fillStyle }));
  state.clearRect.mockImplementation(() => { state.textRecords = []; });
  state.save = () => stack.push({ font: state.font, globalAlpha: state.globalAlpha, fillStyle: state.fillStyle, strokeStyle: state.strokeStyle, textAlign: state.textAlign, textBaseline: state.textBaseline });
  state.restore = () => Object.assign(state, stack.pop() || {});
  state.measureText = text => ({ width: String(text).length * (parseFloat(/([\d.]+)px/.exec(state.font)?.[1]) || 10) * 0.56 });
  state.createLinearGradient = state.createRadialGradient = () => ({ addColorStop() {} });
  return new Proxy(state, { get: (target, key) => key in target ? target[key] : () => {} });
}
function setup(width = 280, state = {}, overrides = {}) {
  const tool = loadTool('stem_lab/stem_tool_brainatlas.js', 'brainAtlas');
  const store = newStore({ brainAtlas: { view: 'lateral', ...state } });
  const canvas = document.createElement('canvas');
  const ctx = context2d();
  let displayWidth = width, canvasNode, nodes;
  canvas.getContext = () => ctx;
  Object.defineProperties(canvas, {
    clientWidth: { get: () => displayWidth }, clientHeight: { get: () => displayWidth * canvas.height / canvas.width },
    clientLeft: { value: 2 }, clientTop: { value: 2 },
    offsetWidth: { get: () => canvas.clientWidth + 4 }, offsetHeight: { get: () => canvas.clientHeight + 4 }
  });
  canvas.getBoundingClientRect = () => ({ left: 20, top: 30, width: canvas.offsetWidth, height: canvas.offsetHeight });
  document.body.appendChild(canvas);
  const render = () => {
    nodes = flatten(tool.render(makeCtx({ t: translate, ...overrides }, store)));
    canvasNode = nodes.find(node => node.props?.['data-brainatlas-canvas'] === 'true');
    canvas.width = canvasNode.props.width; canvas.height = canvasNode.props.height;
    canvasNode.ref(canvas);
  };
  render();
  const click = (x, y) => canvasNode.props.onClick({ currentTarget: canvas, target: canvas, clientX: 22 + x * canvas.clientWidth, clientY: 32 + y * canvas.clientHeight });
  const resize = next => { displayWidth = next; observers.at(-1).callback([{ target: canvas }]); };
  return { canvas, ctx, store, render, click, resize, targets: () => canvas._brainLabelTargets, keyButtons: () => nodes.filter(node => node.props?.['data-brainatlas-key-region']) };
}
beforeEach(() => {
  resetStemLab(); vi.useFakeTimers(); observers = [];
  hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback) { this.callback = callback; this.disconnect = vi.fn(); observers.push(this); }
    observe() {}
  });
});
afterEach(() => {
  window.__alloBrainAtlasCanvasCleanup?.();
  document.querySelectorAll('canvas, #allo-live-brainatlas').forEach(el => el.remove());
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Brain Atlas readable and directly selectable callouts', () => {
  it.each([
    ['lateral', ['frontal','parietal','temporal','occipital','cerebellum','brainstem']],
    ['medial', ['corpus_callosum','thalamus','hypothalamus','cingulate','hippocampus','ventricles']],
    ['superior', ['longitudinal','central_sulcus','frontal_sup','parietal_sup','sma']],
    ['inferior', ['olfactory','optic_chiasm','temporal_inf','cerebellum_inf','medulla_inf','circle_willis_brain']]
  ])('prioritizes the main %s landmarks in both diagram labels and the key', (view, ids) => {
    const s = setup(280, {view, diagramLabelDensity:'standard'});
    for (const width of [280,390,1160]) {
      s.resize(width);
      expect(s.targets().map(t=>t.id).sort()).toEqual([...ids].sort());
      expect(s.keyButtons().map(b=>b.props['data-brainatlas-key-region']).sort()).toEqual([...ids].sort());
      expect(s.canvas._brainLabelMetrics.skipped).toBe(0);
    }
  });
  it('adds a selected secondary region without dropping the major landmarks', () => {
    const s = setup(280, {view:'lateral', selectedRegion:'brocas'});
    expect(s.targets().map(t=>t.id).sort()).toEqual(['frontal','parietal','temporal','occipital','cerebellum','brainstem','brocas'].sort());
    expect(s.keyButtons().some(b=>b.props['data-brainatlas-key-region']==='brocas')).toBe(true);
  });
  it('labels a matching smaller structure when the directory is filtered', () => {
    const s = setup(280, {view:'lateral', search:'supramarginal'});
    expect(s.targets().map(t=>t.id)).toEqual(['supramarginal']);
    expect(s.keyButtons().map(b=>b.props['data-brainatlas-key-region'])).toEqual(['supramarginal']);
  });
  it.each(['small', 'medium', 'large'])('keeps the action-potential plot free of text with %s labels', diagramLabelSize => {
    const s = setup(1160, { view: 'neuron', diagramLabelSize });
    const chart = s.canvas._brainActionPotential;
    expect(chart.panel.w).toBeGreaterThan(s.canvas.width * .9);
    expect(chart.phaseCards.x).toBeGreaterThan(chart.plot.x + chart.plot.w + 20);
    expect(chart.phaseCards.x + chart.phaseCards.w).toBeLessThan(chart.panel.x + chart.panel.w);
    const records = s.ctx.textRecords.filter(r => r.y > chart.panel.y && r.y < chart.panel.y + chart.panel.h);
    expect(records.some(r => r.text === '1  Depolarization')).toBe(true);
    expect(records.some(r => r.text === '2  Repolarization')).toBe(true);
    expect(records.some(r => r.text === '3  Hyperpolarization')).toBe(true);
    for (const record of records) {
      expect(parseFloat(/([\d.]+)px/.exec(record.font)[1])).toBeGreaterThanOrEqual(12);
      expect(record.x > chart.plot.x && record.x < chart.plot.x + chart.plot.w && record.y > chart.plot.y && record.y < chart.plot.y + chart.plot.h).toBe(false);
      expect(record.text).not.toContain('\u2026');
    }
    // The threshold and resting reference lines use the same linear voltage axis as the trace.
    expect(chart.restingY - chart.thresholdY).toBeCloseTo(chart.plot.h * 15 / 130, 6);
    expect(chart.samples[0][1]).toBe(-70);
    expect(chart.samples.at(-1)[1]).toBe(-70);
    expect(Math.max(...chart.samples.map(p => p[1]))).toBe(30);
    expect(Math.min(...chart.samples.map(p => p[1]))).toBe(-80);
  });

  it.each([['small', 12], ['medium', 14], ['large', 17]])('keeps %s labels readable across phone and desktop widths', (size, minimum) => {
    const s = setup(280, { diagramLabelSize: size });
    for (const width of [280, 390, 640, 1160, 1740]) {
      s.resize(width);
      expect(s.canvas._brainLabelMetrics.fontPx).toBeGreaterThanOrEqual(minimum - 0.01);
      expect(s.canvas._brainLabelMetrics.skipped).toBe(0);
      expect(s.targets().length).toBeGreaterThan(0);
      for (const target of s.targets()) {
        expect(target.h * s.canvas.clientHeight).toBeGreaterThanOrEqual(s.canvas._brainLabelMetrics.layout === 'key' ? 19.99 : 31.99);
        expect(target.x).toBeGreaterThanOrEqual(0); expect(target.y).toBeGreaterThanOrEqual(0);
        expect(target.x + target.w).toBeLessThanOrEqual(1); expect(target.y + target.h).toBeLessThanOrEqual(1);
      }
    }
    // Fifteen full canvas renders per size. This sits above the 5s default on a
    // cold run, so give it room rather than reading the timeout as a failure.
  }, 30000);
  it.each(['lateral', 'medial', 'superior', 'inferior'])('keeps %s labels separate and the selected region visible', view => {
    const s = setup(280, { view, diagramLabelDensity: 'all', diagramLabelSize: 'large' });
    const selected = s.targets()[0].id;
    s.store.toolData.brainAtlas.selectedRegion = selected; s.render();
    expect(s.targets().some(target => target.id === selected)).toBe(true);
    for (const [index, a] of s.targets().entries()) {
      for (const b of s.targets().slice(index + 1)) {
        expect(a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y).toBe(false);
      }
    }
  });
  it.each(['lateral', 'medial', 'superior', 'inferior'])('preserves every %s full name in the phone all-label key', view => {
    const s = setup(280, { view, diagramLabelDensity: 'all', diagramLabelSize: 'large' });
    expect(s.canvas._brainLabelMetrics).toMatchObject({ layout: 'key', skipped: 0 });
    expect(s.targets()).toHaveLength(s.keyButtons().length);
    for (const button of s.keyButtons()) {
      const id = button.props['data-brainatlas-key-region'];
      const marker = s.targets().find(target => target.id === id);
      const children = button.props.children;
      expect(children[0].props.children).toBe(marker.number);
      expect(children[1].props.children).toBe(marker.label);
      expect(marker.label).not.toContain('\u2026');
      button.props.onClick();
      expect(s.store.toolData.brainAtlas.selectedRegion).toBe(id);
    }
  });
  it('keeps a selected name available when resizing between a key and a spacious callout', () => {
    const s = setup(280, { diagramLabelDensity: 'essential', selectedRegion: 'frontal' });
    expect(s.canvas._brainLabelMetrics.layout).toBe('key');
    const requested = s.canvas._brainLabelMetrics.requested;
    s.resize(1160);
    expect(s.canvas._brainLabelMetrics).toMatchObject({ layout: 'callouts', requested, skipped: 0 });
    s.resize(280);
    expect(s.canvas._brainLabelMetrics).toMatchObject({ layout: 'key', requested, skipped: 0 });
  });
  it.each(['lateral', 'medial', 'superior', 'inferior'])('keeps the selected %s label available without collisions on desktop', view => {
    const s = setup(1160, { view, diagramLabelSize: 'large' });
    const selected = s.targets().at(-1).id;
    s.store.toolData.brainAtlas.selectedRegion = selected;
    s.render();
    expect(s.canvas._brainLabelMetrics).toMatchObject({ skipped: 0 });
    expect(s.targets().some(target => target.id === selected)).toBe(true);
    for (const [index, a] of s.targets().entries()) {
      for (const b of s.targets().slice(index + 1)) {
        expect(a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y).toBe(false);
      }
    }
  });
  it('selects the named label even at an edge far from its anatomical dot', () => {
    const s = setup(280, { diagramLabelDensity: 'all' });
    const targets = [...s.targets()];
    expect(targets.length).toBeGreaterThan(1);
    for (const target of targets) {
      s.click(target.x + target.w * 0.9, target.y + target.h * 0.5);
      expect(s.store.toolData.brainAtlas.selectedRegion).toBe(target.id);
    }
  });
  it('keeps precise label selection after resizing and preserves learning answers', () => {
    const s = setup(1160, { plainCheckAnswers: { frontal: 0 }, keyWordsOpen: true });
    s.resize(280);
    const target = s.targets().at(-1); s.click(target.x + target.w / 2, target.y + target.h / 2);
    expect(s.store.toolData.brainAtlas).toMatchObject({ selectedRegion: target.id, plainCheckAnswers: { frontal: 0 }, keyWordsOpen: true });
  });
  it('ignores old-view and filtered-out callouts', () => {
    const s = setup(280, { search: 'vision' });
    s.canvas._brainLabelTargets = [{ id: 'frontal', x: 0, y: 0, w: 1, h: 1 }];
    s.click(0.98, 0.98); expect(s.store.toolData.brainAtlas.selectedRegion).toBeUndefined();
    s.canvas._brainLabelTargets = [{ id: 'occipital', x: 0, y: 0, w: 1, h: 1 }];
    s.canvas._brainLabelView = 'medial';
    s.click(0.98, 0.98); expect(s.store.toolData.brainAtlas.selectedRegion).toBeUndefined();
  });
  it('selects moved diagram nodes through their current rendered rectangle', () => {
    const s = setup(280);
    s.canvas._brainDiagramTargets = [{ id: 'frontal', x: 0.9, y: 0.9, w: 0.08, h: 0.08 }];
    s.click(0.94, 0.94);
    expect(s.store.toolData.brainAtlas.selectedRegion).toBe('frontal');
    s.store.toolData.brainAtlas.selectedRegion = '';
    s.canvas._brainDiagramView = 'medial';
    s.click(0.94, 0.94);
    expect(s.store.toolData.brainAtlas.selectedRegion).toBe('');
  });
  it.each(['visualPathway', 'limbicPapezLoop'])('keeps moved %s nodes separate and selectable at their rendered positions', view => {
    const s = setup(760, { view });
    const targets = s.canvas._brainDiagramTargets;
    expect(targets.length).toBeGreaterThan(5);
    for (const [index, target] of targets.entries()) {
      expect(target.x).toBeGreaterThanOrEqual(0);
      expect(target.y).toBeGreaterThanOrEqual(0);
      expect(target.x + target.w).toBeLessThanOrEqual(1);
      expect(target.y + target.h).toBeLessThanOrEqual(1);
      for (const other of targets.slice(index + 1)) {
        expect(target.x < other.x + other.w && target.x + target.w > other.x && target.y < other.y + other.h && target.y + target.h > other.y).toBe(false);
      }
      s.click(target.x + target.w / 2, target.y + target.h / 2);
      expect(s.store.toolData.brainAtlas.selectedRegion).toBe(target.id);
    }
  });
  it('keeps the crossing landmarks above a separate, selectable fixation experiment', () => {
    const s = setup(1160, { view: 'crossLateral' });
    const targets = s.canvas._brainDiagramTargets;
    const experiment = targets.find(target => target.id === 'fixation_task_cross');
    expect(targets).toHaveLength(8);
    const medulla = s.ctx.fillText.mock.calls.find(call => call[0] === 'Medulla Pyramids');
    const caption = s.ctx.fillText.mock.calls.find(call => call[0] === 'FIXATION TASK');
    expect(medulla[2] + 20).toBeLessThan(experiment.y * s.canvas.height);
    expect(caption[2]).toBeGreaterThan(experiment.y * s.canvas.height);
    for (const target of targets) {
      expect(target.y + target.h).toBeLessThan(1);
      if (target !== experiment) expect(target.y + target.h).toBeLessThan(experiment.y);
      s.click(target.x + target.w / 2, target.y + target.h / 2);
      expect(s.store.toolData.brainAtlas.selectedRegion).toBe(target.id);
    }
  });
  it('anchors the nodal leader in the axon gap and paints its label after the leader', () => {
    const s = setup(1160, { view: 'neuron' });
    const { width: w, height: h } = s.canvas;
    const gap = s.canvas._brainDiagramTargets.find(target => target.id === 'node_ranvier' && target.y < 0.5);
    const anchorX = (gap.x + gap.w / 2) * w;
    const lineIndex = s.ctx.lineTo.mock.calls.findIndex(([x, y]) => Math.abs(x - anchorX) < 0.01 && Math.abs(y - h * 0.48) < 0.01);
    const labelIndex = s.ctx.fillText.mock.calls.findIndex(([text]) => text === 'Nodes of Ranvier');
    expect(gap.x).toBeGreaterThan(0.53);
    expect(gap.x + gap.w).toBeLessThanOrEqual(0.544001);
    expect(lineIndex).toBeGreaterThanOrEqual(0);
    expect(s.ctx.lineTo.mock.invocationCallOrder[lineIndex]).toBeLessThan(s.ctx.fillText.mock.invocationCallOrder[labelIndex]);
    s.click(gap.x + gap.w / 2, gap.y + gap.h / 2);
    expect(s.store.toolData.brainAtlas.selectedRegion).toBe('node_ranvier');
    s.click(0.50, 0.575);
    expect(s.store.toolData.brainAtlas.selectedRegion).toBe('node_ranvier');
  });
  it.each([
    ['prenatal_neural_tube', 'approximately the fifth and sixth weeks of obstetric gestation.'],
    ['prenatal_brain_regions', 'the basic brain plan takes shape.'],
    ['prenatal_neuron_production', 'developing cortex is still relatively smooth.'],
    ['prenatal_cortical_migration', 'helping build the layered cerebral cortex.'],
    ['prenatal_connections', 'incoming signals find developing cortical targets.'],
    ['prenatal_folding_networks', 'synapses, dendrites, and long-range networks grow.']
  ])('shows the complete %s milestone copy at readable size inside its card', (id, ending) => {
    const s = setup(1160, { view: 'prenatalDevelopment', selectedRegion: id });
    const body = s.ctx.textRecords.filter(record => record.font.startsWith('13px') && record.x > s.canvas.width * 0.57);
    expect(body.length).toBeGreaterThan(2);
    expect(body.map(record => record.text).join(' ')).toContain(ending);
    for (const record of body) {
      expect(record.text).not.toContain('\u2026');
      expect(record.y).toBeGreaterThan(s.canvas.height * 0.225 + 12);
      expect(record.y).toBeLessThan(s.canvas.height * 0.525 - 12);
    }
  });
  it.each([
    ['languageNetwork', 'semantic_language', 'Semantic hub', '#115e59'],
    ['basalGangliaLoop', 'striatum_d1_bg', 'Striatum D1', '#166534'],
    ['limbicPapezLoop', 'mammillothalamic_limbic', 'Mammillothal.', '#9a3412']
  ])('keeps %s semantic node text dark in both default and selected states', (view, id, label, ink) => {
    const s = setup(1160, { view });
    expect(s.ctx.textRecords.find(record => record.text === label)?.color).toBe(ink);
    s.store.toolData.brainAtlas.selectedRegion = id; s.render();
    expect(s.ctx.textRecords.find(record => record.text === label)?.color).toBe(ink);
    const target = s.canvas._brainDiagramTargets.find(target => target.id === id);
    s.click(target.x + target.w / 2, target.y + target.h / 2);
    expect(s.store.toolData.brainAtlas.selectedRegion).toBe(id);
  });
  it('keeps lifespan chart axes readable against the dark plot', () => {
    const s = setup(1160, { view: 'synapses' });
    for (const label of ['0.25', 'peak', 'Age (years)']) {
      const record = s.ctx.textRecords.find(record => record.text === label);
      expect(record.font).toBe('11px Inter,system-ui,sans-serif');
      expect(record.color).toBe('#cbd5e1');
    }
  });
  it('keeps marker selection available when optional labels are hidden', () => {
    const s = setup(280, { diagramLabelDensity: 'essential' });
    expect(s.targets()).toHaveLength(0);
    s.click(0.28, 0.32);
    expect(s.store.toolData.brainAtlas.selectedRegion).toBe('frontal');
    s.render(); expect(s.targets().map(target => target.id)).toEqual(['frontal']);
  });
  it('redraws reduced-motion diagrams once per size change without animation', () => {
    const s = setup(); const initial = s.ctx.clearRect.mock.calls.length;
    s.resize(390); expect(s.ctx.clearRect.mock.calls.length).toBe(initial + 1);
    s.resize(390); expect(s.ctx.clearRect.mock.calls.length).toBe(initial + 1);
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });
  it('defers hidden-tab painting and refreshes labels when visible again', () => {
    const s = setup(1160); const initial = s.ctx.clearRect.mock.calls.length;
    hidden.mockReturnValue(true); s.resize(280);
    expect(s.ctx.clearRect.mock.calls.length).toBe(initial);
    hidden.mockReturnValue(false); document.dispatchEvent(new Event('visibilitychange'));
    expect(s.canvas._brainLabelMetrics.displayScale).toBeCloseTo(280 / s.canvas.width);
    expect(s.ctx.clearRect.mock.calls.length).toBe(initial + 1);
  });
  it('disconnects old observers and clears obsolete targets on cleanup', () => {
    const s = setup(); const oldObserver = observers.at(-1);
    s.render(); expect(oldObserver.disconnect).toHaveBeenCalledTimes(1);
    const observer = observers.at(-1), draws = s.ctx.clearRect.mock.calls.length;
    s.canvas._brainCleanup(); s.resize(390);
    expect(observer.disconnect).toHaveBeenCalledTimes(1);
    expect(s.targets()).toEqual([]); expect(s.canvas._brainLabelView).toBeNull();
    expect(s.ctx.clearRect.mock.calls.length).toBe(draws);
  });
  it('does not expose anatomical callout targets in specialty diagrams', () => {
    const s = setup(280, { view: 'prenatalDevelopment' });
    expect(s.canvas._brainLabelMetrics.supported).toBe(false); expect(s.targets()).toEqual([]);
  });
  it('ignores clicks outside the content area and zero-sized canvases', () => {
    const s = setup(); s.click(-0.01, -0.01);
    expect(s.store.toolData.brainAtlas.selectedRegion).toBeUndefined();
    s.canvas.getBoundingClientRect = () => ({ left: 20, top: 30, width: 0, height: 0 });
    s.click(0.3, 0.4); expect(s.store.toolData.brainAtlas.selectedRegion).toBeUndefined();
  });
});
