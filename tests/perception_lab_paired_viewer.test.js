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

const openPairViewer = () => click('Compare enlarged drawings');
const pairLayout = () => host.querySelector('[data-perception-viewer-pair]');
async function pairMount(experiment = 'brightness', strict = false) {
  const other = { brightness: { contrast: 22 }, ebbinghaus: { surround: 35 }, mullerLyer: { angle: 25 } }[experiment];
  await mount(seed([...group('first', experiment), ...group('second', experiment, other)]), { strict });
  await review('first'); await compare('second');
}

describe('Enlarged A/B recorded drawings', () => {
  it.each(MODES.map(mode => mode.id))('renders the actual %s trials independently at the same SVG scale', async experiment => {
    await pairMount(experiment); await selectTrial('a', 2); await selectTrial('b', 3); await toggleGuides('b');
    const before = latest, beforeWrites = writes; await openPairViewer();
    expect(dialog().open).toBe(true); expect(dialog().querySelector('h2').textContent).toBe('Compare recorded drawings');
    expect(selector('viewer-a').value).toBe('2'); expect(selector('viewer-b').value).toBe('3');
    expect(guides('viewer-b').getAttribute('aria-pressed')).toBe('false');
    for (const trial of [1, 2, 3]) {
      await selectTrial('viewer-a', trial); await selectTrial('viewer-b', 4 - trial);
      for (const [slot, id, value, reveal] of [['viewer-a', 'first', trial, true], ['viewer-b', 'second', 4 - trial, false]]) {
        const record = recorded(latest, id, value);
        expect(scene(slot).getAttribute('viewBox')).toBe('0 0 800 480');
        expectTargets(scene(slot), experiment, { ...record.model, reveal });
        expect(preview(slot).textContent).toContain(record.model.note);
        expect(preview(slot).querySelector('time').dateTime).toBe(record.date);
      }
    }
    await toggleGuides('viewer-a'); expect(guides('a').getAttribute('aria-pressed')).toBe('false');
    expect(selector('a').value).toBe('3'); expect(selector('b').value).toBe('1');
    expectLocalOnly(before, beforeWrites); await close(); expectLocalOnly(before, beforeWrites);
    expect(document.activeElement).toBe(button('Compare enlarged drawings'));
    await openPairViewer(); expect(selector('viewer-a').value).toBe('3'); expect(selector('viewer-b').value).toBe('1');
  });

  it('stacks both drawings locally, retains control focus, and reopens with automatic layout', async () => {
    await pairMount(); await openPairViewer(); const before = latest, beforeWrites = writes;
    const control = button('Stack drawings for more space'); control.focus();
    await click('Stack drawings for more space');
    expect(pairLayout().dataset.stacked).toBe('true'); expect(control.getAttribute('aria-pressed')).toBe('true'); expect(document.activeElement).toBe(control);
    expect(control.getAttribute('aria-controls')).toBe(pairLayout().id);
    await click('Stack drawings for more space'); expect(pairLayout().dataset.stacked).toBe('false');
    await click('Stack drawings for more space'); await close(); await openPairViewer(); expect(pairLayout().dataset.stacked).toBe('false'); expectLocalOnly(before, beforeWrites);
  });

  it('wraps keyboard focus across both studies and closes without collapsing the workspace', async () => {
    await pairMount(); await openPairViewer(); const before = latest, beforeWrites = writes;
    const tab = async shiftKey => act(async () => document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true })));
    // 79e3e5eae added an Inspect/Fit frame action after B's guides toggle; it is now the last stop.
    const frameAction = host.querySelector('[data-perception-recorded-frame-action="viewer-b"]');
    await tab(true); expect(document.activeElement).toBe(frameAction);
    await tab(false); expect(document.activeElement).toBe(button('Close enlarged drawing'));
    await tab(true); expect(document.activeElement).toBe(frameAction);
    await act(async () => document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    expect(dialog().open).toBe(false); expect(pairLayout()).toBeNull(); expectLocalOnly(before, beforeWrites);
    expect(document.activeElement).toBe(button('Compare enlarged drawings'));
  });

  it('labels both drawings distinctly and preserves literal authored notes', async () => {
    const records = [...group('first'), ...group('second', 'brightness', { contrast: 22 })].map(record => ({ ...record, model: { ...record.model, note: '<img src=x onerror=alert(1)> & full note' } }));
    await mount(seed(records)); await review('first'); await compare('second');
    await openPairViewer();
    const ids = [...host.querySelectorAll('[id]')].map(node => node.id); expect(new Set(ids).size).toBe(ids.length);
    for (const attribute of ['aria-labelledby', 'aria-describedby', 'aria-controls']) for (const node of dialog().querySelectorAll('[' + attribute + ']')) for (const id of node.getAttribute(attribute).split(/\s+/)) expect(document.getElementById(id)).toBeTruthy();
    expect(preview('viewer-a').querySelector('h3').textContent).toBe('Study A · reviewed');
    expect(preview('viewer-b').querySelector('h3').textContent).toBe('Study B · selected');
    expect(dialog().querySelectorAll('.perception-recorded-note')).toHaveLength(2); expect(dialog().querySelector('img')).toBeNull();
    expect(dialog().querySelector('[data-perception-enlarge]')).toBeNull();
  });

  it.each(['hidden', 'partial', 'inconsistent', 'reference', 'experiment'])('does not offer a %s comparison', async reason => {
    const first = group('first'), second = group('second', reason === 'experiment' ? 'ebbinghaus' : 'brightness');
    if (reason === 'hidden') second[0].model.reveal = false;
    if (reason === 'partial') second.pop();
    if (reason === 'inconsistent') second[0].model.contrast = 4;
    if (reason === 'reference') second.forEach(record => record.model.target = 200);
    await mount(seed([...first, ...second])); await review('first'); await compare('second');
    expect(host.querySelector('[data-perception-enlarge-pair]')).toBeNull(); expect(dialog().open).toBe(false);
  });

  it.each(['first', 'second'].flatMap(id => ['remove', 'hide', 'note', 'settings'].map(reason => [id, reason])))('closes both drawings when %s changes through %s', async (id, reason) => {
    await pairMount(); await openPairViewer();
    await act(async () => externalState(previous => {
      const next = JSON.parse(JSON.stringify(previous)), record = next.studies.find(item => item.id === id + '-record-2');
      if (reason === 'remove') next.studies = next.studies.filter(item => item !== record);
      if (reason === 'hide') record.model.reveal = false;
      if (reason === 'note') record.model.note = 'Changed saved observation';
      if (reason === 'settings') record.model.contrast = 7;
      return next;
    }));
    expect(dialog().open).toBe(false); expect(dialog().querySelector('svg')).toBeNull();
  });

  it('closes when the comparison selection changes and opens only the new pair', async () => {
    await mount(seed([...group('first'), ...group('second', 'brightness', { contrast: 22 }), ...group('third', 'brightness', { contrast: 41 })])); await review('first'); await compare('second');
    await openPairViewer(); await compare('third'); expect(dialog().open).toBe(false);
    await openPairViewer(); expectTargets(scene('viewer-b'), 'brightness', recorded(latest, 'third', 1).model);
    await click('Clear study comparison'); expect(dialog().open).toBe(false); expect(pairLayout()).toBeNull();
  });

  it('closes on profile changes without leaking either study', async () => {
    await pairMount(); await openPairViewer(); await act(async () => changeProfile('another-learner'));
    expect(dialog().open).toBe(false); expect(dialog().querySelector('svg')).toBeNull();
  });

  it('retains choices through finder changes and unrelated draft edits', async () => {
    await pairMount(); await openPairViewer(); await selectTrial('viewer-b', 3); await click('Stack drawings for more space');
    await input(notebook('search'), 'no matching record');
    await act(async () => externalState(previous => ({ ...previous, models: { ...previous.models, moire: { ...previous.models.moire, note: 'Changed live draft' } } })));
    expect(dialog().open).toBe(true); expect(selector('viewer-b').value).toBe('3'); expect(pairLayout().dataset.stacked).toBe('true');
  });

  it('keeps single and paired viewers isolated through StrictMode and unmount', async () => {
    await pairMount('brightness', true); await openPairViewer(); await selectTrial('viewer-b', 3); await close();
    await open('a'); expect(pairLayout()).toBeNull(); expect(scene('viewer')).toBeTruthy(); expect(scene('viewer-b')).toBeNull(); await close();
    await openPairViewer(); expect(selector('viewer-b').value).toBe('3');
    await act(async () => root.unmount()); root = null; expect(host.querySelector('dialog')).toBeNull();
  });
});
