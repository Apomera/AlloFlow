import fs from 'node:fs';
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

let React, ReactDOM, config, now, frameId = 0;
const frames = new Map(), mounted = [];
const noop = () => {};

beforeAll(() => {
  const context = new Proxy({}, { get: (_, key) => key === 'measureText'
    ? () => ({ width: 10 }) : () => ({ addColorStop() {} }) });
  window.HTMLCanvasElement.prototype.getContext = () => context;
  for (const [key, value] of [['offsetWidth', 540], ['offsetHeight', 400]]) {
    Object.defineProperty(window.HTMLElement.prototype, key, { configurable: true, get: () => value });
  }
  window.HTMLElement.prototype.scrollIntoView = noop;
  window.requestAnimationFrame = globalThis.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
  window.cancelAnimationFrame = globalThis.cancelAnimationFrame = id => frames.delete(id);
  window.ResizeObserver = globalThis.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} };
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  window.StemLab = {
    registerTool(id, value) { if (id === 'plateTectonics') config = value; },
    ensureThree: () => Promise.reject(new Error('No GPU needed for observation state tests')),
    makeBayViewer: () => ({})
  };
  for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js', 'stem_lab/stem_tool_platetectonics.js']) {
    (0, eval)(fs.readFileSync(file, 'utf8'));
  }
  React = window.React; ReactDOM = window.ReactDOM;
});
beforeEach(() => {
  frames.clear(); now = 0;
  // Model initialization and controlled frames must use the same clock even
  // when mounting the complete tool takes longer on a loaded test machine.
  vi.spyOn(performance, 'now').mockImplementation(() => now);
});
afterEach(async () => {
  while (mounted.length) { const host = mounted.pop(); ReactDOM.unmountComponentAtNode(host); host.remove(); }
  frames.clear(); vi.restoreAllMocks();
  await new Promise(resolve => setTimeout(resolve, 0));
});

function mount(initial = {}) {
  const host = document.createElement('div'); document.body.appendChild(host); mounted.push(host);
  let state, update;
  const xp = vi.fn(), announce = vi.fn(), snapshot = vi.fn();
  function Host() {
    const [data, setData] = React.useState({ plateTectonics: { simTab: 'earthquake', _ptPicked: true, ...initial } });
    state = data.plateTectonics;
    update = patch => ReactDOM.flushSync(() => setData(prev => ({ ...prev, plateTectonics: { ...prev.plateTectonics, ...patch } })));
    return config.render({
      React, toolData: data, setToolData: setData, setStemLabTool: noop, setStemLabTab: noop,
      setToolSnapshots: snapshot, toolSnapshots: [], addToast: noop, announceToSR: announce,
      awardXP: xp, getXP: () => 0, beep: noop, celebrate: noop, canvasNarrate: noop, canvasA11yDesc: noop,
      gradeLevel: '7th', stemLabTab: 'explore', stemLabTool: 'plateTectonics',
      props: {}, srOnly: {}, isDark: true, isContrast: false, pal: null,
      icons: new Proxy({}, { get: () => () => React.createElement('span') }),
      a11yClick: fn => ({ onClick: fn }), t: (_key, fallback) => fallback
    });
  }
  ReactDOM.render(React.createElement(Host), host);
  const click = selector => ReactDOM.flushSync(() => host.querySelector(selector).click());
  return { host, click, state: () => state, update: patch => update(patch), xp, announce, snapshot };
}
function advance() {
  now += 1000;
  ReactDOM.flushSync(() => {
    for (const [id, callback] of [...frames]) if (frames.delete(id)) callback(now);
  });
}
function sample(mode, zs) {
  return window.__alloPtDepthTrials.capture({ mode, qlog: zs.map(z => ({ z })), rate: 5, years: 60000 });
}

describe('Recorded earthquake depth evidence', () => {
  it('derives counts and ranges from actual sample data while rejecting invalid depths', () => {
    const trial = sample('convergent', [5, 70, 299, 300, 650, NaN, -1, 701]);
    expect(trial).toMatchObject({ events: 5, minKm: 5, maxKm: 650, shallow: 1, intermediate: 2, deep: 2 });
    expect(window.__alloPtDepthTrials.valid(trial, 'convergent')).toBe(true);
    expect(sample('divergent', [])).toBeNull();
    expect(sample('unknown', [10])).toBeNull();
    expect(window.__alloPtDepthTrials.records({ convergent: { ...trial, events: 0 } })).toEqual({});
    expect(window.__alloPtDepthTrials.valid({ ...sample('convergent', [10]), shallow: 0, deep: 1 }, 'convergent')).toBe(false);
    expect(window.__alloPtDepthTrials.valid({ ...sample('convergent', [400]), shallow: 1, deep: 0 }, 'convergent')).toBe(false);
  });

  it('records generated events only on deliberate capture and keeps each mode through resets', () => {
    const app = mount();
    const record = () => app.host.querySelector('[data-pt-depth-record]');
    expect(record().disabled).toBe(true);
    expect(app.state().ptDepthTrials).toBeUndefined();
    const play = Array.from(app.host.querySelectorAll('#pt-boundary-simulator button')).find(b => /Play$/.test(b.textContent));
    ReactDOM.flushSync(() => play.click());
    const sequence = [0, 0.2, 0.8, 0.9, 0.5, 0.5]; let next = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => sequence[(next++) % sequence.length]);
    advance();
    expect(record().disabled).toBe(false);
    expect(app.state().ptDepthTrials).toBeUndefined();
    app.click('[data-pt-depth-record]');
    expect(app.state().ptDepthTrials.convergent).toMatchObject({ events: 1, maxKm: 592, deep: 1 });
    const saved = app.state().ptDepthTrials.convergent;
    app.click('[data-tect-mode="divergent"]');
    expect(record().disabled).toBe(true);
    expect(app.state().ptDepthTrials.convergent).toEqual(saved);
    next = 0; advance();
    app.click('[data-pt-depth-record]');
    expect(app.state().ptDepthTrials.divergent.maxKm).toBeLessThan(70);
    expect(app.host.querySelector('[data-pt-depth-sample="convergent"]').textContent).toContain('592 km');
    expect(window.__alloPtEvidenceFrom(app.state())).toContain('depths');
    app.click('[data-pt-depth-clear]');
    expect(app.state().ptDepthTrials).toEqual({});
    expect(window.__alloPtEvidenceFrom(app.state())).not.toContain('depths');
    expect(app.xp).not.toHaveBeenCalled();
  });

  it('requires both the deep convergent and shallow divergent observations for the evidence card', () => {
    const convergent = sample('convergent', [20, 510]), divergent = sample('divergent', [5, 25]);
    expect(window.__alloPtEvidenceFrom({ ptDepthTrials: { convergent } })).not.toContain('depths');
    expect(window.__alloPtEvidenceFrom({ ptDepthTrials: { convergent: sample('convergent', [10]), divergent } })).not.toContain('depths');
    const app = mount({ simTab: 'explain', ptDepthTrials: { convergent, divergent } });
    const card = app.host.querySelector('[data-pt-evidence="depths"]');
    expect(card.dataset.ptEvidenceHave).toBe('true');
    ReactDOM.flushSync(() => card.querySelector('button').click());
    expect(app.state().ptCERDraft.evidence).toContain('510 km');
    expect(app.state().ptCERDraft.evidence).toContain('25 km');
    expect(app.state().ptCER).toBeUndefined();
  });

  it('shows saved depth-band counts and bar proportions independently of the live boundary', () => {
    const convergent = sample('convergent', [10, 50, 100, 400]);
    const divergent = sample('divergent', [5, 20]);
    const app = mount({ ptDepthTrials: { convergent, divergent } });
    const group = app.host.querySelector('[data-pt-depth-bands="convergent"]');
    expect(group.textContent).toContain('Recorded earthquakes: 4');
    const counts = Array.from(group.querySelectorAll('[data-pt-depth-band-count] dd')).map(node => Number(node.textContent));
    expect(counts).toEqual([2, 1, 1]);
    const widths = Array.from(group.querySelectorAll('[data-pt-depth-segment]')).map(node => node.style.width);
    expect(widths).toEqual(['50%', '25%', '25%']);
    expect(group.querySelector('[data-pt-depth-segment]').parentElement.getAttribute('aria-hidden')).toBe('true');
    expect(group.textContent).toContain('70–<300 km');
    expect(group.textContent).toContain('300–700 km');
    app.click('[data-tect-mode="transform"]');
    expect(app.host.querySelector('[data-pt-depth-bands="convergent"]').textContent).toContain('Recorded earthquakes: 4');
    expect(app.host.querySelector('[data-pt-depth-bands="transform"]')).toBeNull();
    expect(app.xp).not.toHaveBeenCalled();
  });

  it('keeps zero depth-band counts visible and explains the limits of a single-event sample', () => {
    const app = mount({ ptDepthTrials: { divergent: sample('divergent', [24]) } });
    const group = app.host.querySelector('[data-pt-depth-bands="divergent"]');
    expect(Array.from(group.querySelectorAll('[data-pt-depth-band-count] dd')).map(node => node.textContent)).toEqual(['1', '0', '0']);
    expect(Array.from(group.querySelectorAll('[data-pt-depth-segment]')).map(node => node.style.width)).toEqual(['100%', '0%', '0%']);
    expect(app.host.querySelector('[data-pt-depth-sampling-note]').textContent).toContain('A small sample can miss a depth band');
    expect(app.host.querySelector('[data-pt-depth-sampling-note]').textContent).toContain('do not measure real earthquake probabilities');
    app.click('[data-pt-depth-clear]');
    expect(app.host.querySelector('[data-pt-depth-distribution]')).toBeNull();
    expect(app.xp).not.toHaveBeenCalled();
  });

  it('omits misleading distributions for malformed saved samples', () => {
    const trial = sample('convergent', [10, 400]);
    const app = mount({ ptDepthTrials: { convergent: { ...trial, deep: 20 } } });
    expect(app.host.querySelector('[data-pt-depth-distribution]')).toBeNull();
    expect(app.host.querySelector('[data-pt-depth-sample="convergent"]').textContent).toContain('Not recorded');
  });

  it('opens the boundary simulator from missing depth evidence and focuses its visible view', () => {
    const app = mount({ simTab: 'explain', _ptSearch: 'old query', ptShelfTopics: { sim: false } });
    app.click('[data-pt-evidence="depths"] button');
    expect(app.state()).toMatchObject({ simTab: 'sim', _ptCategory: 'sim_quiz', _ptPicked: true, _ptSearch: '' });
    expect(app.state().ptShelfTopics.sim).toBe(true);
    advance();
    expect(document.activeElement).toBe(app.host.querySelector('[data-tect-section]'));
  });

  it('preserves a writing draft across contextual activity navigation and keeps links out of an unfinished quiz', () => {
    const draft = { claim: 'A cold slab carries earthquakes deeper.', evidence: 'My observations compare the sinking and separating plates.', reasoning: 'The depth pattern follows the sinking plate through the mantle.' };
    const app = mount({ simTab: 'explain', ptCERDraft: draft });
    app.click('[data-pt-journey-go="quiz"]');
    expect(app.state().ptCERDraft).toEqual(draft);
    expect(app.host.querySelector('[data-pt-journey]')).toBeNull();
    app.update({ quizIdx: 8, quizScore: 7, quizBand: '6-8', ptQuizResult: { total: 8, score: 7, band: '6-8', missed: [] } });
    expect(app.host.querySelector('[data-pt-journey="quiz"]')).toBeTruthy();
    app.click('[data-pt-journey-go="explain"]');
    expect(app.host.querySelector('[data-pt-cer="claim"]').value).toBe(draft.claim);
    expect(app.state().ptCER).toBeUndefined();
  });
});
