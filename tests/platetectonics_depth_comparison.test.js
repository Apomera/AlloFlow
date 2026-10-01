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


function generate(app, count) {
  const sequence = [0, 0.2, 0.8, 0.9, 0.5, 0.5]; let at = 0;
  vi.spyOn(Math, 'random').mockImplementation(() => sequence[at++ % sequence.length]);
  app.click('[data-pt-model-play]');
  for (let index=0; index<count; index++) advance();
  app.click('[data-pt-model-play]');
}

describe('Saved depth sample context and comparisons', () => {
  it('previews the current sample but changes saved evidence only on explicit record or replace', () => {
    const app=mount();
    expect(app.host.querySelector('[data-pt-depth-preview-count]').textContent).toContain('Press Play');
    generate(app,1);
    expect(app.host.querySelector('[data-pt-depth-preview-count]').dataset.ptDepthPreviewCount).toBe('1');
    expect(app.state().ptDepthTrials).toBeUndefined();
    app.click('[data-pt-depth-record]');
    const saved=app.state().ptDepthTrials.convergent;
    expect(saved.events).toBe(1);
    expect(app.host.querySelector('[data-pt-depth-record]').textContent).toBe('Replace saved Convergent sample');
    generate(app,2);
    expect(app.host.querySelector('[data-pt-depth-preview-count]').dataset.ptDepthPreviewCount).toBe('3');
    expect(app.state().ptDepthTrials.convergent).toEqual(saved);
    expect(app.host.querySelector('[data-pt-depth-preview-saved]').textContent).toContain('earthquake count 1');
    app.click('[data-pt-depth-record]');
    expect(app.state().ptDepthTrials.convergent.events).toBe(3);
    app.click('[data-pt-model-reset]');
    expect(app.state().ptDepthTrials.convergent.events).toBe(3);
    expect(app.host.querySelector('[data-pt-depth-record]').disabled).toBe(true);
    expect(app.xp).not.toHaveBeenCalled();
    expect(app.snapshot).not.toHaveBeenCalled();
  });

  it('maps saved minimum and maximum depths to the same 0–700 scale, including single-event ranges', () => {
    const app=mount({ptDepthTrials:{convergent:sample('convergent',[0,700]),divergent:sample('divergent',[24])}});
    const complete=app.host.querySelector('[data-pt-depth-range-bar="convergent"]');
    expect(complete.style.left).toBe('0%');expect(complete.style.width).toBe('100%');
    const singleton=app.host.querySelector('[data-pt-depth-range-bar="divergent"]');
    expect(parseFloat(singleton.style.left)).toBeCloseTo(24/700*100,6);
    expect(singleton.style.width).toBe('0%');
    expect(singleton.parentElement.getAttribute('aria-hidden')).toBe('true');
    expect(app.host.querySelector('[data-pt-depth-sample="convergent"]').textContent).toContain('Events: 2 · 0–700 km');
    expect(app.host.querySelector('[data-pt-depth-sample="divergent"]').textContent).toContain('Events: 1 · 24–24 km');
    expect(app.host.querySelector('[data-pt-depth-sample="transform"]').textContent).toContain('Not recorded');
    expect(app.host.querySelector('[data-pt-depth-ranges]').textContent).toContain('does not mean earthquakes were observed at every depth');
    expect(app.xp).not.toHaveBeenCalled();
  });

  it('compares actual maxima and counts without assuming the convergent sample is deeper', () => {
    const app=mount({ptDepthTrials:{convergent:sample('convergent',[10,400]),divergent:sample('divergent',[5,20,30])}});
    const compare=()=>app.host.querySelector('[data-pt-depth-comparison="divergent"]').textContent;
    expect(compare()).toContain('deepest 400 km; sample size 2');
    expect(compare()).toContain('deepest 30 km; sample size 3');
    expect(compare()).toContain('Convergent sample reaches 370 km deeper than the Divergent sample');
    app.update({ptDepthTrials:{convergent:sample('convergent',[5,10]),divergent:sample('divergent',[20,30])}});
    expect(compare()).toContain('Divergent sample reaches 20 km deeper than the Convergent sample');
    app.update({ptDepthTrials:{convergent:sample('convergent',[5,30]),divergent:sample('divergent',[30])}});
    expect(compare()).toContain('two saved samples reach the same maximum depth');
    expect(app.host.querySelector('[data-pt-depth-comparisons]').textContent).toContain('does not establish a rule for every earthquake');
    expect(app.xp).not.toHaveBeenCalled();
  });

  it('labels saved capture metadata without treating it as a constant-rate experiment', () => {
    const current=sample('divergent',[5,25]);
    const legacy={...sample('convergent',[10,400]),years:'60000',rate:null};
    const app=mount({ptDepthTrials:{convergent:legacy,divergent:current}});
    expect(app.host.querySelector('[data-pt-depth-capture-details]').open).toBe(false);
    expect(app.host.querySelector('[data-pt-depth-capture="convergent"]').textContent).toContain('was not stored');
    expect(app.host.querySelector('[data-pt-depth-capture="divergent"]').textContent).toContain('60,000 model years since reset; rate at capture 5');
    const note=app.host.querySelector('[data-pt-depth-capture-details]').textContent;
    expect(note).toContain('may have changed during the run');
    expect(note).toContain('latest 200');
  });

  it('discloses the 200-event log window without passively recording the accumulated run', () => {
    const app=mount();generate(app,205);
    expect(app.host.querySelector('[data-pt-depth-preview-count]').dataset.ptDepthPreviewCount).toBe('200');
    expect(app.host.querySelector('[data-pt-depth-window]').textContent).toContain('latest 200 of 205');
    expect(app.state().ptDepthTrials).toBeUndefined();
    app.click('[data-pt-depth-record]');
    expect(app.state().ptDepthTrials.convergent.events).toBe(200);
    expect(app.xp).not.toHaveBeenCalled();
  });
});
