import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, makeCtx, newStore, ReactDOMServer, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Independent task fixtures. Expected distances do not call production math.
const BENCHES = [
  { id: 'lever', settings: { leverEffortArm: 2, leverLoadArm: 1, leverLoad: 400 }, ratio: 2 },
  { id: 'pulley', settings: { pulleySegments: 2, pulleyLoad: 400 }, ratio: 2 },
  { id: 'windlass', settings: { windlassHandleR: 0.45, windlassDrumR: 0.1, windlassLoad: 400 }, ratio: 4.5 },
  { id: 'ramp', settings: { rampLength: 4, rampHeight: 1, rampLoad: 400 }, ratio: 4 },
  { id: 'wedge', settings: { wedgeLength: 0.3, wedgeThickness: 0.06, wedgeLoad: 800 }, ratio: 5 },
  { id: 'screw', settings: { screwHandleR: 0.15, screwPitch: 0.005, screwLoad: 2000 }, ratio: 60 * Math.PI }
];
const CASES = BENCHES.flatMap(bench => [0, 0.37, 1].map(progress => ({ bench, progress, name: bench.id + ' at ' + progress })));
let tool, viewer, viewerStatus;
beforeEach(() => {
  const host = resetStemLab(); viewerStatus = 'ready'; viewer = {};
  host.makeOrbitViewer = config => ({
    attach() {}, dispose() {}, onStatusChange() {}, status() { return viewerStatus; },
    push(data) { if (config.attr === 'data-machinelab-shop-gl') viewer.data = data; }
  });
  tool = loadTool('stem_lab/stem_tool_machinelab.js', 'machineLab');
});
afterEach(() => { document.body.replaceChildren(); });
function nodes(node) { return Array.isArray(node) ? node.flatMap(nodes) : node && typeof node === 'object' ? [node, ...nodes(node.props?.children)] : []; }
function text(node) { return Array.isArray(node) ? node.map(text).join('') : node == null || typeof node === 'boolean' ? '' : typeof node === 'object' ? text(node.props?.children) : String(node); }
function panelFrom(tree) { return nodes(tree).find(node => node.props?.className === 'ml-task-distances'); }
function pathToPanel(node, parents = []) {
  if (Array.isArray(node)) { for (const child of node) { const result = pathToPanel(child, parents); if (result) return result; } return null; }
  if (!node || typeof node !== 'object') return null;
  const path = [...parents, node];
  return node.props?.className === 'ml-task-distances' ? path : pathToPanel(node.props?.children, path);
}
function session(bench = BENCHES[0], extra = {}) {
  const store = newStore({ machineLab: { view: 'machines', bench: bench.id, bandOverride: 'g68', loadDistance: 0.5, ...bench.settings, ...extra } });
  const render = () => tool.render(makeCtx({}, store));
  return { store, render, state: () => store.toolData.machineLab,
    patch(patch) { store.toolData = { ...store.toolData, machineLab: { ...store.toolData.machineLab, ...patch } }; },
    html() { const panel = panelFrom(render()); return new DOMParser().parseFromString(panel ? ReactDOMServer.renderToStaticMarkup(panel) : '', 'text/html'); },
    mount() {
      const tree = render(), section = panelFrom(tree);
      document.body.innerHTML = section ? ReactDOMServer.renderToStaticMarkup(section) : '';
      const panel = document.querySelector('.ml-task-distances');
      if (section) section.ref(panel);
      return { tree, panel, onPose: viewer.data.onPose };
    }
  };
}
function expectRounded(actual, expected) {
  expect(Number.isFinite(actual)).toBe(true);
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(Math.max(1e-12, Math.abs(expected) * 0.000005));
}
function checkPanel(panel, ratio, movement, fraction) {
  expect(panel).toBeTruthy();
  expect(panel.querySelector('[data-ml-task-position]').textContent).toBe(Math.round(fraction * 100) + '%');
  expect(parseFloat(panel.style.getPropertyValue('--ml-task-position'))).toBeCloseTo(fraction * 100, 10);
  const scale = Math.max(movement * ratio, movement);
  for (const [id, total] of [['effort', movement * ratio], ['load', movement]]) {
    const reading = panel.querySelector('[data-ml-task-distance-value=' + id + ']');
    expect(reading.textContent.endsWith(' m')).toBe(true);
    expectRounded(parseFloat(reading.textContent), total * fraction);
    const full = panel.querySelector('[data-ml-task-distance-total=' + id + ']');
    expect(full.textContent).toMatch(/^Full task: .+ m$/);
    expectRounded(parseFloat(full.textContent.slice('Full task: '.length)), total);
    const extent = panel.querySelector('[data-ml-task-distance-extent=' + id + ']');
    expect(parseFloat(extent.style.width)).toBeCloseTo(total / scale * 100, 10);
    expect(extent.closest('[aria-hidden=true]')).toBeTruthy();
    expect(extent.querySelector('[data-ml-task-distance-fill]').style.width).toBe('var(--ml-task-position)');
  }
}

describe('Machine Lab: scaled task-distance display', () => {
  it.each(CASES)('shows independent task totals and proportional readings for $name', ({ bench, progress }) => {
    const s = session(bench, { shopMotionProgress: progress }), before = s.state();
    checkPanel(s.html().querySelector('.ml-task-distances'), bench.ratio, 0.5, progress);
    expect(s.state()).toBe(before);
  });
  it.each([
    { name: 'small lever ratio', settings: { leverEffortArm: 0.2, leverLoadArm: 4 }, ratio: 0.05 },
    { name: 'equal lever arms', settings: { leverEffortArm: 2, leverLoadArm: 2 }, ratio: 1 },
    { name: 'large screw ratio', bench: BENCHES[5], settings: { screwHandleR: 0.5, screwPitch: 0.001 }, ratio: 1000 * Math.PI }
  ])('retains a common scale without inflating $name', fixture => {
    const s = session(fixture.bench || BENCHES[0], { ...fixture.settings, loadDistance: 3, shopMotionProgress: 0.37 });
    checkPanel(s.html().querySelector('.ml-task-distances'), fixture.ratio, 3, 0.37);
  });
  it.each(['k2', 'g35'])('omits quantitative task readings for %s', bandOverride => {
    expect(session(BENCHES[0], { bandOverride }).html().querySelector('.ml-task-distances')).toBeNull();
  });
  it('retains task readings in the advanced grade band', () => {
    checkPanel(session(BENCHES[0], { bandOverride: 'g912', shopMotionProgress: 0.37 }).html().querySelector('.ml-task-distances'), 2, 0.5, 0.37);
  });
  it.each([
    ['zero task distance', { loadDistance: 0 }], ['negative task distance', { loadDistance: -1 }],
    ['string task distance', { loadDistance: '0.5' }], ['nonfinite task distance', { loadDistance: Infinity }],
    ['NaN task distance', { loadDistance: NaN }], ['null task distance', { loadDistance: null }],
    ['out-of-range task distance', { loadDistance: 4 }], ['zero geometry', { leverEffortArm: 0 }],
    ['string geometry', { leverEffortArm: '2' }], ['nonfinite load', { leverLoad: NaN }]
  ])('withholds meter readings for %s instead of using a fallback', (_name, extra) => {
    expect(session(BENCHES[0], extra).html().querySelector('.ml-task-distances')).toBeNull();
  });
  it('names ramp output as vertical rise and wedge output as load-side task distance', () => {
    expect(session(BENCHES[3]).html().querySelector('[data-ml-task-distance-row=load] dt').textContent).toContain('Vertical load rise');
    expect(session(BENCHES[4]).html().querySelector('[data-ml-task-distance-row=load] dt').textContent).toContain('Load-side task distance');
  });
  it('keeps changing numbers outside live regions while giving the section a heading', () => {
    const s = session(), doc = s.html(), panel = doc.querySelector('.ml-task-distances');
    const ledgers = [...panel.querySelectorAll('dl')];
    expect(ledgers).toHaveLength(2);
    for (const ledger of ledgers) expect([...ledger.children].map(node => node.tagName)).toEqual(['DT', 'DD']);
    for (const ancestor of pathToPanel(s.render())) {
      expect(ancestor.props['aria-live']).toBeUndefined();
      expect(['status', 'alert', 'log']).not.toContain(ancestor.props.role);
    }
    expect(doc.getElementById(panel.getAttribute('aria-labelledby')).textContent).toBe('Task distances at this stroke position');
    for (const value of panel.querySelectorAll('[data-ml-task-distance-value],[data-ml-task-position]')) {
      expect(value.closest('[aria-live],[role=status],[role=alert],[role=log]')).toBeNull();
    }
  });
  it('explains task scaling, illustrative motion, common zero scale and noncumulative return', () => {
    const copy = session(BENCHES[5]).html().querySelector('.ml-task-distances').textContent;
    expect(copy).toContain('scale your selected task');
    expect(copy).toContain('a full stroke does not show every turn needed');
    expect(copy).toContain('start at zero and share one distance scale');
    expect(copy).toContain('Readings decrease'); expect(copy).toContain('not cumulative travel');
  });
  it('preserves guided-investigation predictions, evidence and unfinished writing through inspection', () => {
    const before = { ...BENCHES[0].settings, loadDistance: 0.5 };
    const investigations = { lever: { id: 'lever-one-change-v1', force: 'less', distance: 'more', tested: true } };
    const experiments = { lever: { benchId: 'lever', before: { settings: before }, after: { settings: { ...before, leverEffortArm: 4 } }, note: 'Keep my explanation.' } };
    const references = { lever: before };
    const s = session(BENCHES[0], { benchInvestigations: investigations, benchExperiments: experiments, benchReferences: references, benchPrediction: 'unfinished' });
    const slider = nodes(s.render()).find(node => node.props?.id === 'ml-shop-stroke');
    slider.props.onChange({ target: { value: '37' } });
    expect(s.state().shopMotionProgress).toBe(0.37); expect(s.state().shopAnimating).toBe(false);
    expect(s.state().benchInvestigations).toBe(investigations); expect(s.state().benchExperiments).toBe(experiments);
    expect(s.state().benchReferences).toBe(references); expect(s.state().benchPrediction).toBe('unfinished');
    const doc = s.html(); checkPanel(doc.querySelector('.ml-task-distances'), 2, 0.5, 0.37);
    expect(nodes(s.render()).filter(node => node.props?.['data-ml-investigation-outcome'])).toHaveLength(2);
  });
  it('omits live task readings when the 3D viewer failed', () => {
    viewerStatus = 'failed'; expect(session().html().querySelector('.ml-task-distances')).toBeNull();
  });
});

describe('Machine Lab: live task-distance synchronization', () => {
  it.each(BENCHES)('updates $id from rendered fractions through work and return without storing telemetry', bench => {
    const s = session(bench, { shopAnimating: true, shopDemoId: 17 }), before = s.state(), { panel, onPose } = s.mount();
    for (const fraction of [0, 0.373456, 1, 0.6, 0]) {
      onPose(fraction, 17, bench.id, fraction === 0.6 ? 'return' : 'work');
      checkPanel(panel, bench.ratio, 0.5, fraction); expect(s.state()).toBe(before);
    }
  });
  it('ignores mismatched run and station callbacks and clamps valid pose endpoints', () => {
    const s = session(BENCHES[0], { shopAnimating: true, shopDemoId: 17 }), { panel, onPose } = s.mount();
    onPose(0.37, 17, 'lever', 'work'); const before = panel.outerHTML;
    onPose(1, 16, 'lever', 'return'); expect(panel.outerHTML).toBe(before);
    onPose(1, 17, 'pulley', 'work'); expect(panel.outerHTML).toBe(before);
    onPose(NaN, 17, 'lever', 'work'); expect(panel.outerHTML).toBe(before);
    onPose(-0.1, 17, 'lever', 'work'); checkPanel(panel, 2, 0.5, 0);
    onPose(1.1, 17, 'lever', 'work'); checkPanel(panel, 2, 0.5, 1);
  });
  it('resets imperatively changed readings when playback ends and disconnects stale refs', () => {
    const s = session(BENCHES[0], { shopAnimating: true, shopDemoId: 17 }), old = s.mount();
    old.onPose(0.73, 17, 'lever', 'work'); checkPanel(old.panel, 2, 0.5, 0.73);
    s.patch({ shopAnimating: false, shopMotionProgress: null });
    const current = s.mount(); checkPanel(current.panel, 2, 0.5, 0);
    old.onPose(1, 17, 'lever', 'work'); checkPanel(current.panel, 2, 0.5, 0);
  });
});
