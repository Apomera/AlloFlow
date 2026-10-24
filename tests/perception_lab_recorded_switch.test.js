import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const MODES = [
  { id: 'brightness', starts: [16, 240, 109], values: [121, 134, 146], settings: { target: 136, contrast: 63 }, other: { contrast: 22 } },
  { id: 'ebbinghaus', starts: [32, 72, 51], values: [44, 50, 53], settings: { surround: 42, gap: 19 }, other: { surround: 35 } },
  { id: 'mullerLyer', starts: [250, 550, 411], values: [380, 410, 425], settings: { angle: 55, fin: 61 }, other: { angle: 25 } },
];
let engine, config, host, root, latest, latestAll, replaceState, changeProfile, writes;
const query = selector => host.querySelector(selector);
const dialog = () => query('[data-perception-drawing-viewer]');
const pair = () => query('[data-perception-viewer-pair]');
const switchLayout = () => query('[data-perception-viewer-switch]');
const stackLayout = () => query('[data-perception-viewer-stack]');
const switchControls = () => query('[data-perception-viewer-switch-controls]');
const show = side => query('[data-perception-viewer-show="' + side + '"]');
const panel = side => query('[data-perception-recorded-preview="viewer-' + side + '"]');
const scene = side => query('[data-perception-recorded-scene="viewer-' + side + '"]');
const trial = slot => query('[data-perception-preview-trial="' + slot + '"]');
const guides = slot => query('[data-perception-preview-guides="' + slot + '"]');

function group(id, experiment = 'brightness', changes = {}) {
  const mode = MODES.find(item => item.id === experiment);
  return engine.normalize({ studies: mode.values.map((matchValue, index) => ({
    id: id + '-record-' + (index + 1), experiment, date: '2026-10-04T12:0' + index + ':00.000Z',
    model: { matching: true, reveal: true, swap: true, ...mode.settings, matchValue, prediction: 'Same', note: id + ' trial ' + (index + 1) + ' <em>literal note</em>', ...changes },
    repeat: { id, trial: index + 1, startValue: mode.starts[index] },
  })) }).studies;
}
function seed(studies) {
  return engine.normalize({ experiment: 'moire', expanded: true, studies,
    models: { moire: { angle: 13.2, spacing: 18, prediction: 'Both', note: 'current draft' } },
    comparison: { experiment: 'necker', model: { depth: 75, cue: 'front', note: 'saved pin' } },
  });
}
async function mount(value, strict = false) {
  writes = 0;
  function Harness() {
    const [data, setData] = React.useState({ perceptionLab: value, otherTool: { preserved: 37 } });
    const [profile, setProfile] = React.useState('recorded-switch-learner');
    latest = engine.normalize(data.perceptionLab); latestAll = data; changeProfile = setProfile;
    replaceState = update => setData(previous => ({ ...previous, perceptionLab: typeof update === 'function' ? update(previous.perceptionLab) : update }));
    return config.render(makeCtx({ toolData: data, setToolData: update => { writes++; setData(update); }, activeProfileId: profile }));
  }
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  const content = React.createElement(Harness);
  await act(async () => root.render(strict ? React.createElement(React.StrictMode, null, content) : content));
}
function button(label, scope = host) {
  const node = [...scope.querySelectorAll('button')].find(item => (item.getAttribute('aria-label') || item.textContent).trim() === label);
  expect(node, label).toBeTruthy(); return node;
}
async function click(node) { expect(node).toBeTruthy(); await act(async () => node.click()); }
async function input(node, value) {
  expect(node).toBeTruthy();
  const isSelect = node instanceof HTMLSelectElement;
  const prototype = isSelect ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, String(value));
    node.dispatchEvent(new Event(isSelect ? 'change' : 'input', { bubbles: true }));
  });
}
async function key(node, value, modifiers = {}) {
  const event = new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true, ...modifiers });
  await act(async () => node.dispatchEvent(event)); return event;
}
const open = () => click(button('Compare enlarged drawings'));
const close = () => click(button('Close enlarged drawing', dialog()));
async function selectPair() {
  const row = [...host.querySelectorAll('[data-perception-study]')].find(item => item.dataset.perceptionStudy === 'first-record-1');
  await click(button('Review study', row)); await input(query('[data-perception-study-selector]'), 'second');
}
async function pairMount(experiment = 'brightness', strict = false) {
  const mode = MODES.find(item => item.id === experiment);
  await mount(seed([...group('first', experiment), ...group('second', experiment, mode.other)]), strict);
  await selectPair(); await open();
}
function expectLocalOnly(before, beforeWrites) {
  expect(latest).toEqual(before); expect(writes).toBe(beforeWrites); expect(latestAll.otherTool).toEqual({ preserved: 37 });
}
function expectShowing(side) {
  expect(pair().dataset.layout).toBe('switch');
  for (const value of ['a', 'b']) {
    const inactive = value !== side;
    expect(panel(value).parentElement).toBe(pair());
    expect(panel(value).dataset.viewerInactive).toBe(String(inactive));
    expect(panel(value).getAttribute('aria-hidden')).toBe(inactive ? 'true' : null);
    expect(panel(value).hasAttribute('inert')).toBe(inactive);
    expect(show(value).getAttribute('aria-pressed')).toBe(String(!inactive));
  }
}
function flatten(nodes) {
  return (Array.isArray(nodes) ? nodes : [nodes]).flatMap(node => node && typeof node === 'object' ? [node, ...flatten(node.children || [])] : []);
}
function expectTargets(svg, experiment, model) {
  const expected = flatten(engine.scene(experiment, model)).filter(node => node.props['data-perception-target']);
  const actual = [...svg.querySelectorAll('[data-perception-target]')]; expect(actual).toHaveLength(expected.length);
  expected.forEach((node, index) => {
    expect(actual[index].tagName.toLowerCase()).toBe(node.tag);
    for (const [name, value] of Object.entries(node.props)) expect(actual[index].getAttribute(name === 'strokeWidth' ? 'stroke-width' : name)).toBe(String(value));
  });
}
const blobText = blob => new Promise((resolve, reject) => {
  const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsText(blob);
});

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab(); config = loadTool('stem_lab/stem_tool_perception.js', 'perceptionLab'); engine = window.StemLab.PerceptionEngine;
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
  vi.stubGlobal('HTMLDialogElement', window.HTMLDialogElement);
  Object.defineProperty(window.HTMLDialogElement.prototype, 'showModal', { configurable: true, writable: true, value: function () { this.open = true; } });
  Object.defineProperty(window.HTMLDialogElement.prototype, 'close', { configurable: true, writable: true, value: function () { this.open = false; } });
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1); vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('Stationary switching of enlarged recorded drawings', () => {
  it.each(MODES.map(mode => mode.id))('keeps actual %s trials and independent guides intact across modes', async experiment => {
    await pairMount(experiment); const before = structuredClone(latest), beforeWrites = writes;
    await input(trial('viewer-a'), 2); await input(trial('viewer-b'), 3); await click(guides('viewer-b'));
    const originalA = scene('a').innerHTML, originalB = scene('b').innerHTML;
    await click(switchLayout()); expectShowing('a');
    expect(scene('a').innerHTML).toBe(originalA); expect(scene('b').innerHTML).toBe(originalB);
    for (const [side, id, selection, reveal] of [['a', 'first', 2, true], ['b', 'second', 3, false]]) {
      await click(show(side)); expectShowing(side);
      const record = engine.recordedTrial(latest, id, selection);
      expect(scene(side).getAttribute('viewBox')).toBe('0 0 800 480');
      expectTargets(scene(side), experiment, { ...record.model, reveal });
      expect(panel(side).textContent).toContain(record.model.note); expect(panel(side).querySelector('em')).toBeNull();
      expect(show(side).textContent).toContain('Trial ' + selection);
    }
    expect(scene('b').querySelector('[data-perception-guide]')).toBeNull();
    await input(trial('viewer-b'), 1); await click(guides('viewer-b')); await click(stackLayout());
    expect(pair().dataset.layout).toBe('stacked'); expect(trial('viewer-a').value).toBe('2'); expect(trial('viewer-b').value).toBe('1');
    expect(guides('viewer-a').getAttribute('aria-pressed')).toBe('true'); expect(guides('viewer-b').getAttribute('aria-pressed')).toBe('true');
    await click(switchLayout()); expectShowing('a'); await close();
    expect(trial('a').value).toBe('2'); expect(trial('b').value).toBe('1'); expectLocalOnly(before, beforeWrites);
  });

  it('restores the prior layout on switch exit and always honors an explicit Stack action', async () => {
    await pairMount(); const before = structuredClone(latest), beforeWrites = writes;
    expect(pair().dataset.layout).toBe('auto'); expect(pair().dataset.stacked).toBe('false');
    await click(switchLayout()); await click(show('b')); await click(switchLayout());
    expect(pair().dataset.layout).toBe('auto'); expect(switchControls()).toBeNull();
    for (const side of ['a', 'b']) { expect(panel(side).hasAttribute('inert')).toBe(false); expect(panel(side).hasAttribute('aria-hidden')).toBe(false); }
    await click(stackLayout()); expect(pair().dataset.layout).toBe('stacked');
    await click(switchLayout()); expectShowing('a'); expect(stackLayout().getAttribute('aria-pressed')).toBe('false');
    await click(switchLayout()); expect(pair().dataset.layout).toBe('stacked');
    await click(switchLayout()); await click(stackLayout()); expect(pair().dataset.layout).toBe('stacked'); expect(stackLayout().getAttribute('aria-pressed')).toBe('true');
    await click(stackLayout()); expect(pair().dataset.layout).toBe('auto'); expectLocalOnly(before, beforeWrites);
  });

  it.each([['ArrowRight', 'b'], ['End', 'b'], ['ArrowLeft', 'a'], ['Home', 'a']])('uses %s only on a drawing button to choose and focus %s', async (value, side) => {
    await pairMount(); await click(switchLayout()); const opposite = side === 'a' ? 'b' : 'a'; await click(show(opposite)); show(opposite).focus();
    const event = await key(show(opposite), value);
    expect(event.defaultPrevented).toBe(true); expectShowing(side); expect(document.activeElement).toBe(show(side));
  });

  it.each(['ctrlKey', 'altKey', 'metaKey', 'shiftKey'])('preserves browser or assistive shortcuts using %s', async modifier => {
    await pairMount(); await click(switchLayout()); show('a').focus();
    for (const value of ['ArrowRight', 'End', 'ArrowLeft', 'Home']) {
      const event = await key(show('a'), value, { [modifier]: true });
      expect(event.defaultPrevented).toBe(false); expectShowing('a'); expect(document.activeElement).toBe(show('a'));
    }
  });

  it('does not intercept native trial selection or keys elsewhere in the modal', async () => {
    await pairMount(); await click(switchLayout());
    for (const node of [trial('viewer-a'), guides('viewer-a'), dialog()]) {
      const event = await key(node, 'ArrowRight'); expect(event.defaultPrevented).toBe(false); expectShowing('a');
    }
    await input(trial('viewer-a'), 3); expect(trial('viewer-a').value).toBe('3'); expect(show('a').textContent).toContain('Trial 3');
  });

  it.each(['a', 'b'])('excludes inactive controls from the modal focus trap while showing %s', async side => {
    await pairMount(); await click(switchLayout()); await click(show(side)); const first = button('Close enlarged drawing', dialog());
    // 79e3e5eae: the shown panel's Inspect/Fit frame action is its last control.
    first.focus(); await key(first, 'Tab', { shiftKey: true }); expect(document.activeElement).toBe(query('[data-perception-recorded-frame-action="viewer-' + side + '"]'));
    await key(document.activeElement, 'Tab'); expect(document.activeElement).toBe(first);
    await key(first, 'Escape'); expect(dialog().open).toBe(false); expect(document.activeElement).toBe(button('Compare enlarged drawings'));
  });

  it('moves focus to the active drawing button when a programmatic mode change hides the focused panel', async () => {
    await pairMount(); guides('viewer-b').focus(); await click(switchLayout()); expectShowing('a'); expect(document.activeElement).toBe(show('a'));
    trial('viewer-a').focus(); await click(show('b')); expectShowing('b'); expect(document.activeElement).toBe(show('b'));
  });

  it('keeps controls out of the single drawing viewer and survives StrictMode cleanup', async () => {
    await pairMount('brightness', true); await click(switchLayout()); await click(show('b')); await close();
    await click(query('[data-perception-enlarge="a"]'));
    expect(pair()).toBeNull(); expect(switchLayout()).toBeNull(); expect(switchControls()).toBeNull();
    expect(query('[data-perception-recorded-scene="viewer"]')).toBeTruthy(); await close();
    await open(); await click(switchLayout()); expectShowing('a');
    await act(async () => root.unmount()); root = null; expect(host.querySelector('dialog')).toBeNull();
  });

  it('reopens in automatic layout with A selected while preserving trial and guide choices', async () => {
    await pairMount(); const before = structuredClone(latest), beforeWrites = writes;
    await input(trial('viewer-a'), 3); await click(guides('viewer-a')); await click(stackLayout()); await click(switchLayout()); await click(show('b'));
    await close(); await open(); expect(pair().dataset.layout).toBe('auto'); expect(pair().dataset.stacked).toBe('false'); expect(switchControls()).toBeNull();
    expect(trial('viewer-a').value).toBe('3'); expect(guides('viewer-a').getAttribute('aria-pressed')).toBe('false');
    await click(switchLayout()); expectShowing('a'); expectLocalOnly(before, beforeWrites);
  });

  it.each(['hidden-a', 'hidden-b', 'notebook', 'profile'])('closes and removes both drawings when the session is invalidated by %s', async reason => {
    await pairMount(); await click(switchLayout()); await click(show('b'));
    await act(async () => {
      if (reason === 'profile') changeProfile('different-learner');
      else replaceState(previous => {
        const next = structuredClone(previous);
        if (reason === 'notebook') next.studies = group('replacement');
        else next.studies.find(record => record.id === (reason === 'hidden-a' ? 'first' : 'second') + '-record-1').model.reveal = false;
        return next;
      });
    });
    expect(dialog().open).toBe(false); expect(pair()).toBeNull(); expect(switchControls()).toBeNull(); expect(dialog().querySelector('svg')).toBeNull();
    expect(dialog().textContent).not.toContain('literal note');
  });

  it('retains the visible drawing through notebook filtering and unrelated live draft changes', async () => {
    await pairMount(); await input(trial('viewer-b'), 3); await click(switchLayout()); await click(show('b'));
    const before = structuredClone(latest), beforeWrites = writes;
    await input(query('[data-perception-notebook-search]'), 'no matching record');
    await act(async () => replaceState(previous => ({ ...previous, models: { ...previous.models, moire: { ...previous.models.moire, note: 'Changed live draft' } } })));
    expect(dialog().open).toBe(true); expectShowing('b'); expect(trial('viewer-b').value).toBe('3');
    expect(latest.studies).toEqual(before.studies); expect(latest.comparison).toEqual(before.comparison); expect(writes).toBe(beforeWrites);
  });

  it('keeps live SVG, saved notebook, and comparison report exports unchanged after switching', async () => {
    const blobs = []; vi.stubGlobal('URL', { createObjectURL: vi.fn(blob => { blobs.push(blob); return 'blob:recorded-switch-' + blobs.length; }), revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await pairMount(); await close(); const before = structuredClone(latest), beforeWrites = writes;
    const exportAll = async () => { await click(button('Export SVG')); await click(button('Export notebook')); await click(query('[data-perception-report-comparison]')); };
    await exportAll(); await open(); await click(switchLayout()); await click(show('b')); await input(trial('viewer-b'), 3); await click(guides('viewer-b')); await close(); await exportAll();
    expect(blobs).toHaveLength(6);
    for (let index = 0; index < 2; index++) expect(await blobText(blobs[index + 3])).toBe(await blobText(blobs[index]));
    const reports = await Promise.all([blobs[2], blobs[5]].map(async blob => new DOMParser().parseFromString(await blobText(blob), 'text/html')));
    for (const report of reports) { expect(report.querySelectorAll('[data-perception-report-drawing]')).toHaveLength(6); report.querySelector('.report-created').remove(); }
    expect(reports[1].documentElement.outerHTML).toBe(reports[0].documentElement.outerHTML);
    const svg = new DOMParser().parseFromString(await blobText(blobs[3]), 'image/svg+xml');
    expect(svg.querySelector('parsererror')).toBeNull(); expect(svg.documentElement.getAttribute('viewBox')).toBe('0 0 800 480');
    expect(svg.querySelector('[data-perception-viewer-show]')).toBeNull(); expectLocalOnly(before, beforeWrites);
  });

  it('provides distinct native drawing controls and valid relationships without duplicate IDs', async () => {
    await pairMount(); await click(switchLayout());
    expect(switchLayout().tagName).toBe('BUTTON'); expect(switchControls().getAttribute('role')).toBe('group');
    expect(switchControls().getAttribute('aria-label')).toBeTruthy(); expect(switchControls().querySelectorAll('button')).toHaveLength(2);
    for (const side of ['a', 'b']) {
      expect(show(side).tagName).toBe('BUTTON'); expect(show(side).textContent).toContain('Drawing ' + side.toUpperCase());
      expect(document.getElementById(show(side).getAttribute('aria-controls'))).toBe(panel(side));
    }
    const ids = [...host.querySelectorAll('[id]')].map(node => node.id); expect(new Set(ids).size).toBe(ids.length);
    for (const name of ['aria-labelledby', 'aria-describedby', 'aria-controls']) for (const node of dialog().querySelectorAll('[' + name + ']')) for (const id of node.getAttribute(name).split(/\s+/)) expect(document.getElementById(id)).toBeTruthy();
  });

  it.each(['first', 'second'])('never offers switching when the %s study still hides recorded values', async id => {
    const studies = [...group('first'), ...group('second', 'brightness', { contrast: 22 })]; studies.find(record => record.id === id + '-record-1').model.reveal = false;
    await mount(seed(studies)); await selectPair();
    expect(query('[data-perception-enlarge-pair]')).toBeNull(); expect(dialog().open).toBe(false); expect(switchLayout()).toBeNull(); expect(dialog().querySelector('svg')).toBeNull();
  });
});
