import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const MODES = [
  { id: 'brightness', starts: [16, 240, 109], values: [121, 134, 146], controls: { target: 136, contrast: 63 }, choices: ['Left', 'Same', 'Right'] },
  { id: 'ebbinghaus', starts: [32, 72, 51], values: [44, 50, 53], controls: { surround: 42, gap: 19 }, choices: ['Left', 'Same', 'Right'] },
  { id: 'mullerLyer', starts: [250, 550, 411], values: [380, 410, 425], controls: { angle: 55, fin: 61 }, choices: ['Top', 'Same', 'Bottom'] },
];
const DATES = ['2026-10-04T12:00:00.000Z', '2026-10-04T12:01:00.000Z', '2026-10-04T12:02:00.000Z'];
const FULL_NOTE = 'Trial three observation\n' + 'This is a complete learner note. '.repeat(13) + '<em>literal note ending</em>';
let engine, config, host, root, latest, latestAll, externalState, changeProfile, announce, writes;

function group(id, experiment = 'brightness', changes = {}) {
  const mode = MODES.find(item => item.id === experiment);
  return engine.normalize({ studies: mode.values.map((matchValue, index) => ({
    id: id + '-record-' + (index + 1), experiment, date: DATES[index],
    model: { matching: true, reveal: true, swap: true, ...mode.controls, matchValue, prediction: mode.choices[index], note: index === 2 ? FULL_NOTE : 'Trial ' + (index + 1) + ' note', ...changes },
    repeat: { id, trial: index + 1, startValue: mode.starts[index] },
  })) }).studies;
}
function seed(studies = []) {
  return engine.normalize({
    experiment: 'moire', studies, expanded: true,
    models: { moire: { angle: 13.2, spacing: 18, prediction: 'Both', note: 'current draft' } },
    comparison: { experiment: 'necker', model: { depth: 75, cue: 'front', note: 'pinned cube' } },
  });
}
const recorded = (state, id = 'study', trial = 1) => engine.recordedTrial(state, id, trial);
function expectUnavailable(result, status, count) {
  expect(result).toEqual({ status, count, experiment: null, trial: null, recordId: null, date: '', model: null, startValue: null });
}
function flatten(nodes) {
  return (Array.isArray(nodes) ? nodes : [nodes]).flatMap(node => node && typeof node === 'object' ? [node, ...flatten(node.children || [])] : []);
}
function targetValue(svg, experiment) {
  const target = svg.querySelector('[data-perception-target="right"]');
  expect(target).toBeTruthy();
  if (experiment === 'brightness') return Number(target.getAttribute('fill').match(/^rgb\((\d+),/)[1]);
  if (experiment === 'ebbinghaus') return Number(target.getAttribute('r')) * 2;
  return Number(target.getAttribute('x2')) - Number(target.getAttribute('x1'));
}
function expectedTargets(experiment, model) {
  return flatten(engine.scene(experiment, model)).filter(node => node.props['data-perception-target']).map(node => ({ tag: node.tag, props: node.props }));
}
function expectTargets(svg, experiment, model) {
  const actual = [...svg.querySelectorAll('[data-perception-target]')];
  const expected = expectedTargets(experiment, model);
  expect(actual).toHaveLength(expected.length);
  expected.forEach((item, index) => {
    expect(actual[index].tagName.toLowerCase()).toBe(item.tag);
    for (const [key, value] of Object.entries(item.props)) {
      const attribute = key === 'strokeWidth' ? 'stroke-width' : key;
      expect(actual[index].getAttribute(attribute), attribute).toBe(String(value));
    }
  });
}
async function mount(value = seed(), { strict = false, translate } = {}) {
  writes = 0;
  function Harness() {
    const [data, setData] = React.useState({ perceptionLab: value, otherTool: { preserved: 37 } });
    const [profile, setProfile] = React.useState('recorded-preview-learner');
    latest = engine.normalize(data.perceptionLab); latestAll = data; changeProfile = setProfile;
    externalState = update => setData(previous => ({ ...previous, perceptionLab: typeof update === 'function' ? update(previous.perceptionLab) : update }));
    return config.render(makeCtx({ toolData: data, setToolData: update => { writes++; setData(update); }, activeProfileId: profile, announceToSR: announce, ...(translate ? { t: translate } : {}) }));
  }
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  const content = React.createElement(Harness);
  await act(async () => root.render(strict ? React.createElement(React.StrictMode, null, content) : content));
}
function button(label, scope = host) {
  const found = [...scope.querySelectorAll('button')].find(node => (node.getAttribute('aria-label') || node.textContent).trim() === label);
  expect(found, label).toBeTruthy(); return found;
}
const click = async (label, scope = host) => act(async () => button(label, scope).click());
const row = id => [...host.querySelectorAll('[data-perception-study]')].find(node => node.dataset.perceptionStudy === id);
const preview = slot => host.querySelector('[data-perception-recorded-preview="' + slot + '"]');
const scene = slot => host.querySelector('[data-perception-recorded-scene="' + slot + '"]');
const selector = slot => host.querySelector('[data-perception-preview-trial="' + slot + '"]');
const guides = slot => host.querySelector('[data-perception-preview-guides="' + slot + '"]');
const notebook = field => host.querySelector('[data-perception-notebook-' + field + ']');
async function input(node, value) {
  expect(node).toBeTruthy();
  const isSelect = node instanceof HTMLSelectElement;
  const prototype = isSelect ? HTMLSelectElement.prototype : node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, String(value));
    node.dispatchEvent(new Event(isSelect ? 'change' : 'input', { bubbles: true }));
  });
}
const selectTrial = (slot, trial) => input(selector(slot), trial);
const toggleGuides = slot => act(async () => guides(slot).click());
async function review(id) { await click('Review study', row(id + '-record-1')); }
async function compare(id) { await input(host.querySelector('[data-perception-study-selector]'), id); }
async function recordUI(value, note = '') {
  await input(host.querySelector('#perception-match-value'), value);
  if (note) await input(host.querySelector('.perception-note'), note);
  await click('Same'); await click('Record match');
}
function expectLocalOnly(baseline, beforeWrites) {
  expect(latest).toEqual(baseline);
  expect(latestAll.otherTool).toEqual({ preserved: 37 });
  expect(writes).toBe(beforeWrites);
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab(); config = loadTool('stem_lab/stem_tool_perception.js', 'perceptionLab');
  engine = window.StemLab.PerceptionEngine; announce = vi.fn();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
  vi.stubGlobal('HTMLDialogElement', window.HTMLDialogElement);
  Object.defineProperty(window.HTMLDialogElement.prototype, 'showModal', { configurable: true, writable: true, value: function () { this.open = true; } });
  Object.defineProperty(window.HTMLDialogElement.prototype, 'close', { configurable: true, value: function () { this.open = false; } });
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

const dialog = () => host.querySelector('[data-perception-drawing-viewer]');
const enlarge = slot => host.querySelector('[data-perception-enlarge="' + slot + '"]');
const open = async slot => act(async () => enlarge(slot).click());
const close = () => click('Close enlarged drawing', dialog());

describe('Enlarged recorded drawings', () => {
  it.each(MODES.map(mode => mode.id))('shows all actual %s trials and shares local choices without changing saved data', async experiment => {
    await mount(seed(group('study', experiment))); await review('study');
    await selectTrial('review', 2); await toggleGuides('review');
    const before = latest, beforeWrites = writes;
    await open('review');
    expect(dialog().open).toBe(true);
    expect(document.activeElement).toBe(dialog().querySelector('h2'));
    const tab = async shiftKey => {
      const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true });
      await act(async () => document.activeElement.dispatchEvent(event));
      expect(event.defaultPrevented).toBe(true);
    };
    // 79e3e5eae added an Inspect/Fit frame action after the guides toggle; it is now the last stop.
    const frameAction = host.querySelector('[data-perception-recorded-frame-action="viewer"]');
    await tab(true); expect(document.activeElement).toBe(frameAction);
    await tab(false); expect(document.activeElement).toBe(button('Close enlarged drawing', dialog()));
    await tab(true); expect(document.activeElement).toBe(frameAction);
    expect(selector('viewer').value).toBe('2');
    expect(guides('viewer').getAttribute('aria-pressed')).toBe('false');
    for (const trial of [1, 2, 3]) {
      await selectTrial('viewer', trial);
      const record = recorded(latest, 'study', trial);
      expectTargets(scene('viewer'), experiment, { ...record.model, reveal: false });
      expect(targetValue(scene('viewer'), experiment)).toBe(record.model.matchValue);
      expect(preview('viewer').textContent).toContain(record.model.note);
      expect(preview('viewer').querySelector('time').dateTime).toBe(record.date);
      expect(selector('review').value).toBe(String(trial));
    }
    await toggleGuides('viewer');
    expect(scene('viewer').querySelectorAll('[data-perception-guide]').length).toBeGreaterThan(0);
    expect(guides('review').getAttribute('aria-pressed')).toBe('true');
    expectLocalOnly(before, beforeWrites);
    await close(); expect(dialog().open).toBe(false);
    expect(preview('viewer')).toBeNull(); expect(document.activeElement).toBe(enlarge('review'));
    await open('review'); expect(selector('viewer').value).toBe('3'); expectLocalOnly(before, beforeWrites);
  });

  it.each(['a', 'b'])('enlarges %s independently of the other comparison preview', async slot => {
    await mount(seed([...group('first'), ...group('second', 'brightness', { contrast: 22 })]));
    await review('first'); await compare('second');
    await selectTrial('a', 2); await selectTrial('b', 3); await toggleGuides('b');
    const before = latest, beforeWrites = writes;
    await open(slot); expect(selector('viewer').value).toBe(slot === 'a' ? '2' : '3');
    await selectTrial('viewer', 1); await toggleGuides('viewer');
    expect(selector(slot === 'a' ? 'b' : 'a').value).toBe(slot === 'a' ? '3' : '2');
    expect(dialog().textContent).toContain(slot === 'a' ? 'Study A' : 'Study B');
    await close(); expectLocalOnly(before, beforeWrites);
  });

  it('supports an active revealed study and preserves expanded workspace on Escape', async () => {
    await mount({ expanded: true, models: { brightness: { matching: true } } });
    await click('Start three matches'); for (const value of [112, 138, 143]) await recordUI(value);
    await click('Reveal study results'); await open('active');
    const before = latest, beforeWrites = writes;
    await act(async () => dialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    expect(dialog().open).toBe(false); expect(latest.expanded).toBe(true); expectLocalOnly(before, beforeWrites);
  });

  it('handles native cancellation and close events', async () => {
    await mount(seed(group('study'))); await review('study'); await open('review');
    const cancellation = new Event('cancel', { bubbles: false, cancelable: true });
    await act(async () => dialog().dispatchEvent(cancellation));
    expect(cancellation.defaultPrevented).toBe(true); expect(dialog().open).toBe(false);
    await open('review'); await act(async () => { dialog().open = false; dialog().dispatchEvent(new Event('close')); });
    expect(preview('viewer')).toBeNull(); expect(document.activeElement).toBe(enlarge('review'));
  });

  it.each(['hidden', 'partial', 'conflict'])('provides no enlarge action for a %s study', async kind => {
    const records = group('study');
    if (kind === 'hidden') records[1].model.reveal = false;
    if (kind === 'partial') records.pop();
    if (kind === 'conflict') records[1].model.contrast = 7;
    await mount(seed(records)); await review('study');
    expect(enlarge('review')).toBeNull(); expect(dialog().open).toBe(false); expect(dialog().querySelector('svg')).toBeNull();
  });

  it.each(['remove', 'hide', 'note', 'start', 'settings', 'profile'])('closes and removes stale drawing content after a %s change', async kind => {
    await mount(seed(group('study'))); await review('study'); await open('review');
    await act(async () => {
      if (kind === 'profile') changeProfile('another-learner');
      else externalState(previous => {
        const changed = JSON.parse(JSON.stringify(previous));
        if (kind === 'remove') changed.studies.pop();
        if (kind === 'hide') changed.studies[0].model.reveal = false;
        if (kind === 'note') changed.studies[0].model.note = 'Updated note';
        if (kind === 'start') changed.studies[0].repeat.startValue = 88;
        if (kind === 'settings') changed.studies[1].model.contrast = 3;
        return changed;
      });
    });
    expect(dialog().open).toBe(false); expect(dialog().querySelector('svg')).toBeNull();
    expect(preview('viewer')).toBeNull();
  });

  it('closes an enlarged A trial when B becomes incompatible', async () => {
    await mount(seed([...group('first'), ...group('second')])); await review('first'); await compare('second'); await open('a');
    await act(async () => externalState(previous => ({ ...previous, studies: previous.studies.filter(record => record.id !== 'second-record-3') })));
    expect(dialog().open).toBe(false); expect(dialog().querySelector('svg')).toBeNull();
  });

  it('keeps the viewer open through finder filters and unrelated live draft edits', async () => {
    await mount(seed(group('study'))); await review('study'); await open('review'); await selectTrial('viewer', 3);
    await input(notebook('search'), 'not present');
    await act(async () => externalState(previous => ({ ...previous, models: { ...previous.models, moire: { ...previous.models.moire, note: 'Another draft note' } } })));
    expect(dialog().open).toBe(true); expect(selector('viewer').value).toBe('3'); expect(preview('viewer').textContent).toContain(FULL_NOTE);
  });

  it('uses distinct SVG and control labels and renders authored HTML as text', async () => {
    const records = group('study'); records[0].model.note = '<img src=x onerror=alert(1)> & literal';
    await mount(seed(records)); await review('study'); await open('review');
    const ids = [...host.querySelectorAll('[id]')].map(node => node.id); expect(new Set(ids).size).toBe(ids.length);
    for (const attribute of ['aria-labelledby', 'aria-describedby']) {
      for (const node of dialog().querySelectorAll('[' + attribute + ']')) for (const id of node.getAttribute(attribute).split(/\s+/)) expect(host.querySelector('[id="' + id + '"]')).toBeTruthy();
    }
    expect(dialog().textContent).toContain(records[0].model.note); expect(dialog().querySelector('img')).toBeNull();
    expect(dialog().querySelector('[data-perception-enlarge]')).toBeNull();
  });

  it('announces unsupported dialog opening without changing data or losing the preview', async () => {
    await mount(seed(group('study'))); await review('study');
    dialog().showModal = () => { throw new Error('Unavailable'); };
    const before = latest, beforeWrites = writes; await open('review');
    expect(dialog().open).toBe(false); expect(preview('review')).toBeTruthy(); expect(preview('viewer')).toBeNull();
    expect(announce).toHaveBeenCalledWith('The enlarged drawing could not open. You can still inspect it in the recorded drawing panel.'); expectLocalOnly(before, beforeWrites);
  });

  it.each([false, true])('inspects, zooms, nudges and fits an enlarged recorded drawing (StrictMode %s)', async strict => {
    // StrictMode replays state updaters after render has replaced the camera ref; an updater
    // that re-read it dropped every recorded camera change, so Inspect drawing did nothing.
    await mount(seed(group('study')), { strict }); await review('study'); await open('review');
    const before = latest, beforeWrites = writes;
    const frame = () => host.querySelector('[data-perception-recorded-frame-action="viewer"]');
    const viewport = () => host.querySelector('[data-perception-recorded-viewport="viewer"]');
    const inspector = () => host.querySelector('[data-perception-recorded-inspector]');
    expect(frame().dataset.action).toBe('inspect'); expect(inspector().hidden).toBe(true);
    // jsdom has no scrollIntoView; Inspect moves focus to the zoom control and scrolls it into view.
    const scrolled = vi.fn();
    Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', { configurable: true, writable: true, value: scrolled });
    try { await act(async () => frame().click()); } finally { delete window.HTMLElement.prototype.scrollIntoView; }
    const zoom = host.querySelector('[data-perception-recorded-zoom]');
    expect(inspector().hidden).toBe(false); expect(host.querySelector('[data-perception-recorded-inspect]').getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(zoom); expect(scrolled).toHaveBeenCalled();
    await input(zoom, 2);
    expect(viewport().dataset.cameraZoom).toBe('2'); expect(frame().dataset.action).toBe('fit');
    await act(async () => viewport().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })));
    expect(Number(viewport().dataset.cameraX)).toBeCloseTo(.55, 10);
    await act(async () => frame().click());
    expect(viewport().dataset.cameraZoom).toBe('1'); expect(viewport().dataset.cameraX).toBe('0.5'); expect(frame().dataset.action).toBe('inspect');
    expectLocalOnly(before, beforeWrites);
  });

  it('is stable through StrictMode and unmounts without retained drawing content', async () => {
    await mount(seed(group('study')), { strict: true }); await review('study'); await open('review'); await selectTrial('viewer', 3);
    const before = latest, beforeWrites = writes; await close(); await open('review'); expect(selector('viewer').value).toBe('3'); expectLocalOnly(before, beforeWrites);
    await act(async () => root.unmount()); root = null; expect(host.querySelector('dialog')).toBeNull();
  });
});
