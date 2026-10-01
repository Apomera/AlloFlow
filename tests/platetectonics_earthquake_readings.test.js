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

function change(app, selector, value) {
  const node = app.host.querySelector(selector);
  ReactDOM.flushSync(() => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(node, String(value));
    node.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}
const readings = app => Object.fromEntries([...app.host.querySelectorAll('[data-pt-eq-arrival]')].map(node => [node.dataset.ptEqArrival, Number(node.dataset.seconds)]));

describe('Earthquake size, station distance and arrival measurements', () => {
  it('reports matching model times at minimum, default and maximum station distances', () => {
    const app = mount({ ptShelfTopics: { earthquake: false } });
    for (const distance of [100, 600, 2000]) {
      change(app, '#pt-eq-distance', distance);
      expect(app.state().eqDistKm).toBe(distance);
      const values = readings(app);
      expect(values.p).toBeCloseTo(distance / 6, 8);
      expect(values.s).toBeCloseTo(distance / 3.5, 8);
      expect(values.gap).toBeCloseTo(distance / 3.5 - distance / 6, 8);
      const canvas = app.host.querySelector('[data-pt-earthquake-lab] canvas');
      expect(canvas._seisLive.eqDistKm).toBe(distance);
      expect(canvas.getAttribute('aria-label')).toContain(values.gap.toFixed(1) + ' seconds');
      expect(app.host.querySelector('[data-pt-eq-gap-distance]').textContent).toContain(distance.toLocaleString() + ' km');
    }
    expect(app.xp).not.toHaveBeenCalled();
    expect(app.snapshot).not.toHaveBeenCalled();
  });

  it('keeps arrival times and station distance unchanged when magnitude changes', () => {
    const app = mount({ eqMagnitude: 5, eqDistKm: 600, ptShelfTopics: { earthquake: false } });
    const before = readings(app);
    change(app, '#pt-eq-magnitude', 7.2);
    expect(readings(app)).toEqual(before);
    expect(app.state()).toMatchObject({ eqMagnitude: 7.2, eqDistKm: 600 });
    const canvas = app.host.querySelector('[data-pt-earthquake-lab] canvas');
    expect(canvas._seisLive.eqMagnitude).toBe(7.2);
    expect(canvas.getAttribute('aria-label')).toContain('magnitude 7.2 at 600 km');
    expect(app.host.querySelector('[data-pt-eq-intensity-note]').textContent).toMatch(/do not predict damage/);
  });

  it('highlights exactly one numeric band at every shared boundary without naming damage', () => {
    const app = mount({ eqMagnitude: 9.1, ptShelfTopics: { earthquake: false } });
    // A simulator observation can be larger than the manual slider maximum.
    expect(app.host.querySelector('output[for="pt-eq-magnitude"]').textContent).toBe('9.1');
    expect(app.host.querySelector('[data-pt-damage-active="true"]').textContent).toContain('M8.0+');
    for (const [value, band] of [[1, '1-3'], [3.9, '1-3'], [4, '4-5'], [5.9, '4-5'], [6, '6-7'], [7.9, '6-7'], [8, '8-9'], [9, '8-9']]) {
      change(app, '#pt-eq-magnitude', value);
      const active = app.host.querySelectorAll('[data-pt-damage-active="true"]');
      expect(active.length).toBe(1);
      expect(active[0].dataset.ptDamageTier).toBe(band);
      expect(active[0].textContent).toMatch(/^M[0-9]/);
      expect(active[0].textContent).not.toMatch(/damage|Megathrust|Strong|Light|Great/);
    }
  });

  it('links controls and trace to readable guidance while keeping model limits optional', () => {
    const app = mount({ ptShelfTopics: { earthquake: false } });
    const panel = app.host.querySelector('[data-pt-earthquake-lab]');
    for (const id of ['pt-eq-magnitude', 'pt-eq-distance']) {
      const control = panel.querySelector('#' + id);
      expect(panel.querySelector('label[for="' + id + '"]')).not.toBeNull();
      expect(panel.querySelector('#' + control.getAttribute('aria-describedby')).textContent.length).toBeGreaterThan(20);
    }
    const limits = panel.querySelector('[data-pt-eq-model-limits]');
    expect(limits.open).toBe(false);
    expect(limits.textContent).toContain('P = 6.0 km/s and S = 3.5 km/s');
    expect(limits.textContent).toContain('One station constrains distance, not direction');
    expect(panel.textContent).toContain('The time axis resizes');
    expect(panel.textContent).not.toContain('which is why they do most of the damage');
    expect(app.xp).not.toHaveBeenCalled();
  });
});
