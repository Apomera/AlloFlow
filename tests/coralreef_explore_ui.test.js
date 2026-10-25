import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

// Exercise the accessible UI around the explore controller. Real geometry and
// movement are covered by reef_3d_explore; this checks the learner's workflow.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const mounted = [];
let engines;

beforeEach(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  window.THREE = { stub: true };
  window.Reef3DSpecies = { version: '1.0.0', create: () => ({}) };
  engines = [];
  window.Reef3DExplore = {
    version: '1.0.0',
    mount: vi.fn((canvas, options) => {
      let state = { ready: true, paused: false, view: 'third', diver: { depthM: 8 }, focused: null,
        nearby: [
          { uid: 'o1', speciesId: 'clownfish', distanceM: 3, inView: true },
          { uid: 'o2', speciesId: 'blue_tang', distanceM: 3, inView: true }
        ] };
      const controller = {
        canvas, options, dispose: vi.fn(), setInput: vi.fn(), resize: vi.fn(),
        getState: () => state,
        emit(patch) { state = { ...state, ...patch }; options.onState(state); },
        focus: vi.fn(uid => { const found = state.nearby.find(n => n.uid === uid); if (found) controller.emit({ focused: found }); }),
        swimTo: vi.fn(), focusNext: vi.fn(), focusPrevious: vi.fn(), clearFocus: vi.fn(),
        setView: vi.fn(view => controller.emit({ view })),
        setPaused: vi.fn(paused => controller.emit({ paused }))
      };
      engines.push(controller);
      options.onState(state);
      return controller;
    })
  };
  loadTool(TOOL, 'coralReef');
});

afterEach(async () => {
  while (mounted.length) {
    const item = mounted.pop();
    await act(async () => item.root.unmount());
    item.host.remove();
  }
  delete window.Reef3DExplore;
  delete window.Reef3DSpecies;
  delete window.THREE;
  vi.restoreAllMocks();
  vi.useRealTimers();
});

async function mountTool(seed = {}) {
  let data = { coralReef: { section: 'explore', ...seed } };
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const cfg = window.StemLab._registry.coralReef;
  const announcements = [];
  function Shell() {
    const [toolData, setToolData] = React.useState(data);
    data = toolData;
    return cfg.render({ React, toolData, setToolData, t: (key, fallback) => fallback || key,
      announceToSR: message => announcements.push(message) });
  }
  const item = { host, root, announcements, get data() { return data; } };
  mounted.push(item);
  await act(async () => root.render(React.createElement(Shell)));
  return item;
}

function button(host, label) {
  const found = [...host.querySelectorAll('button')].find(b => b.textContent.trim() === label);
  expect(found, 'button: ' + label).toBeTruthy();
  return found;
}

async function click(buttonNode) {
  await act(async () => { buttonNode.click(); await Promise.resolve(); });
}

function logSummary(host) {
  return host.textContent.match(/Species log: (\d+) of (\d+) found\./)?.slice(1).map(Number);
}

describe('coral reef exploration workflow', () => {
  it('keeps structures in the discovery log without counting them as living species', async () => {
    const t = await mountTool({ speciesLog: { clownfish: {}, reef_star: {}, reef_ball: {}, coral_tree_nursery: {} } });
    const total = window.__RR_TEST_EXPORTS__.coralReef.SPECIES_META.filter(m => m.group !== 'structure').length;
    expect(logSummary(t.host)).toEqual([1, total]);
    await click(button(t.host, 'Open the species guide'));
    expect(logSummary(t.host)).toEqual([1, total]);
    expect(Object.keys(t.data.coralReef.speciesLog)).toHaveLength(4);
  });

  it('gives nearby actions distinct accessible names without revealing unidentified species', async () => {
    const t = await mountTool();
    await click(button(t.host, 'Start the dive'));
    expect(engines).toHaveLength(1);
    const TX = window.__RR_TEST_EXPORTS__.coralReef.speciesText((key, fallback) => fallback);
    for (const action of ['Look', 'Swim to']) {
      const actions = [...t.host.querySelectorAll('button')].filter(b => b.textContent.trim() === action);
      expect(actions).toHaveLength(2);
      const labels = actions.map(b => b.getAttribute('aria-label') || b.textContent.trim());
      expect(new Set(labels).size, action + ' must distinguish equal-distance unknown organisms').toBe(2);
      for (const label of labels) {
        expect(label).toContain(action);
        expect(label).toContain('3 m');
        expect(label).not.toContain(TX.clownfish.name);
        expect(label).not.toContain(TX.blue_tang.name);
      }
    }
    const look = [...t.host.querySelectorAll('button')].filter(b => b.textContent.trim() === 'Look');
    await click(look[1]);
    expect(engines[0].focus).toHaveBeenCalledWith('o2');
  });

  it('identifies an organism, persists its discovery, and releases the dive when opening the guide', async () => {
    const t = await mountTool();
    await click(button(t.host, 'Start the dive'));
    const engine = engines[0];
    await act(async () => engine.focus('o1'));
    const choices = t.host.querySelector('[role="group"][aria-label="Identify it"]');
    expect(choices).toBeTruthy();
    const TX = window.__RR_TEST_EXPORTS__.coralReef.speciesText((key, fallback) => fallback);
    const wrong = [...choices.querySelectorAll('button')].find(b => b.textContent !== TX.clownfish.name);
    await click(wrong);
    expect(t.data.coralReef.speciesLog).toBeUndefined();
    expect(t.host.textContent).toContain('Not quite.');
    await click(button(choices, TX.clownfish.name));
    expect(t.data.coralReef.speciesLog.clownfish.site).toBe('healthy');
    expect(logSummary(t.host)?.[0]).toBe(1);
    expect(t.announcements.some(message => message.includes('Added to your species log'))).toBe(true);
    await click(button(t.host, 'Open the species guide'));
    expect(t.data.coralReef.section).toBe('guide');
    expect(logSummary(t.host)?.[0]).toBe(1);
    expect(engine.dispose).toHaveBeenCalledTimes(1);
  });

  it('keeps the guide reachable after a graphics failure and can retry the dive', async () => {
    window.Reef3DExplore.mount.mockImplementationOnce(() => { throw new Error('WebGL unavailable'); });
    const t = await mountTool();
    await click(button(t.host, 'Start the dive'));
    expect(t.host.querySelector('[role="alert"]')?.textContent).toContain('could not start');
    expect([...t.host.querySelectorAll('button')].some(b => b.textContent === 'Open the species guide')).toBe(true);
    await click(button(t.host, 'Try the 3D view again'));
    expect(window.Reef3DExplore.mount).toHaveBeenCalledTimes(2);
    expect(t.host.querySelector('[role="alert"]')).toBeNull();
    expect(t.host.querySelector('[role="group"][aria-label="Swim controls"]')).toBeTruthy();
  });

  it('settles every species picture after the graphics renderer is unavailable', async () => {
    window.THREE.WebGLRenderer = class { constructor() { throw new Error('WebGL unavailable'); } };
    const t = await mountTool({ section: 'guide', guidePictures: true });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    const total = window.__RR_TEST_EXPORTS__.coralReef.SPECIES_META.length;
    expect(t.host.textContent).not.toContain('Drawing the picture...');
    expect(t.host.textContent.match(/No picture on this device\./g)).toHaveLength(total);
    expect(t.host.textContent).toContain('Field marks');
  });

  it('loads static species portraits without WebGL and offers a graceful fallback for a missing picture', async () => {
    const renderer = vi.fn(function () { throw new Error('WebGL unavailable'); });
    window.THREE.WebGLRenderer = renderer;
    const t = await mountTool({ section: 'guide' });
    const X = window.__RR_TEST_EXPORTS__.coralReef;
    const total = X.SPECIES_META.length;
    const pictures = [...t.host.querySelectorAll('img')];
    expect(total).toBeGreaterThan(0);
    expect(pictures).toHaveLength(total);
    expect(renderer).not.toHaveBeenCalled();
    expect(t.host.querySelector('canvas')).toBeNull();
    expect([...t.host.querySelectorAll('button')].some(b => b.textContent === 'Show 3D pictures')).toBe(false);
    // The guide groups cards by habitat/type; catalog append order is not display order.
    const picturedIds = pictures.map(picture => picture.closest('[data-species]').dataset.species);
    expect(picturedIds.slice().sort()).toEqual(X.SPECIES_META.map(meta => meta.id).sort());
    for (const picture of pictures) {
      const id = picture.closest('[data-species]').dataset.species;
      const portrait = 'stem_lab/assets/coralreef/species/' + id + '.webp';
      expect(existsSync(portrait), portrait + ' is shipped').toBe(true);
      expect(existsSync('desktop/web-app/public/' + portrait), portrait + ' desktop mirror is shipped').toBe(true);
      expect(picture.getAttribute('loading')).toBe('lazy');
      expect(picture.getAttribute('decoding')).toBe('async');
      expect(picture.getAttribute('alt')).toMatch(/^3D model of a /);
      expect(picture.getAttribute('src')).toContain('/assets/coralreef/species/' + id + '.webp');
    }
    const brokenCard = pictures[0].closest('li');
    await act(async () => pictures[0].dispatchEvent(new Event('error')));
    expect(brokenCard.querySelector('img')).toBeNull();
    expect(brokenCard.querySelector('svg')).toBeTruthy();
    expect(brokenCard.textContent).toContain('Field marks');
    expect(t.host.querySelectorAll('img')).toHaveLength(total - 1);
    expect(renderer).not.toHaveBeenCalled();
    await click(button(t.host, 'Show 3D pictures'));
    expect(renderer).toHaveBeenCalledTimes(1);
    expect(t.host.textContent).not.toContain('Drawing the picture...');
    expect(t.host.textContent.match(/No picture on this device\./g)).toHaveLength(total);
    expect(t.host.querySelector('img')).toBeNull();
  });

  it('refreshes a reopened guide when the existing picture job finishes', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const created = [], freed = [];
    let renderers = 0, disposed = 0;
    window.THREE = { ...THREE, WebGLRenderer: class {
      constructor() { renderers++; }
      setPixelRatio() {} setSize() {} render() {}
      dispose() { disposed++; } forceContextLoss() {}
    } };
    window.Reef3DSpecies = {
      version: '1.0.0', info: () => ({ group: 'fish' }),
      create(T, id) { created.push(id); return { root: new T.Group(), radius: 0.3, dispose: () => freed.push(id) }; }
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,iVBORw0KGgo=');
    const t = await mountTool({ section: 'guide', guidePictures: true });
    expect(t.host.querySelectorAll('img')).toHaveLength(1);
    expect(t.host.textContent).toContain('Drawing the picture...');
    await click(button(t.host, 'Dive and explore'));
    await click(button(t.host, 'Species guide'));
    await act(async () => vi.runAllTimersAsync());
    const total = window.__RR_TEST_EXPORTS__.coralReef.SPECIES_META.length;
    expect(t.host.querySelectorAll('img')).toHaveLength(total);
    expect(t.host.textContent).not.toContain('Drawing the picture...');
    expect(new Set(created).size).toBe(total);
    expect(created).toHaveLength(total);
    expect(freed).toEqual(created);
    expect(renderers).toBe(1);
    expect(disposed).toBe(1);
  });
});
