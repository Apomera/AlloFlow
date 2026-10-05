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

const focusDialog = () => host.querySelector('[data-perception-focus-dialog]');
const enter = () => click('Focus experiment');
const leave = () => click('Back to workspace', focusDialog());
const live = () => host.querySelector('#perception-stage-current');
const key = async (node, key, shiftKey = false) => {
  const event = new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true });
  await act(async () => node.dispatchEvent(event)); return event;
};
describe('Focused live experiment workspace', () => {
  it.each(['brightness', 'ebbinghaus', 'mullerLyer', 'cafeWall', 'necker', 'moire'])('moves the actual %s drawing into one modal without saved-state writes', async experiment => {
    await mount(engine.normalize({ experiment, models: { [experiment]: { note: 'Draft stays here', prediction: 'Unsure' } }, studies: group('saved') }));
    const before = latest, beforeWrites = writes, geometry = live().innerHTML;
    await enter(); expect(focusDialog().open).toBe(true);
    expect(document.activeElement).toBe(focusDialog().querySelector('h2'));
    expect(focusDialog().contains(live())).toBe(true);
    expect(live().innerHTML).toBe(geometry);
    expect(host.querySelectorAll('#perception-stage-current')).toHaveLength(1);
    expect(host.querySelectorAll('#perception-note')).toHaveLength(1);
    expect(host.querySelectorAll('[role="status"]')).toHaveLength(1);
    expectLocalOnly(before, beforeWrites);
    await leave(); expect(focusDialog().open).toBe(false); expect(focusDialog().textContent).toBe('');
    expect(document.activeElement).toBe(button('Focus experiment')); expect(live().innerHTML).toBe(geometry);
    expectLocalOnly(before, beforeWrites);
  });
  it('keeps live changes, full notes, and saved observations when returning', async () => {
    await mount(engine.normalize({ experiment: 'ebbinghaus' })); await enter();
    await input(host.querySelector('#perception-surround'), 47); await click('Left');
    await input(host.querySelector('#perception-note'), 'A full note\nwith <literal> text.'); await click('Save observation');
    expect(latest.studies).toHaveLength(1); expect(focusDialog().querySelector('[role="status"]').textContent).toContain('saved');
    const before = latest, beforeWrites = writes; await leave(); expectLocalOnly(before, beforeWrites);
    expect(latest.models.ebbinghaus.surround).toBe(47); expect(latest.studies[0].model.note).toBe('A full note\nwith <literal> text.');
  });
  it('pins, compares, and clears the current settings inside the focused workspace', async () => {
    await mount(engine.normalize({ experiment: 'ebbinghaus' })); await enter(); await click('Pin comparison');
    const pinned = latest.comparison; await input(host.querySelector('#perception-surround'), 43);
    expect(latest.comparison).toEqual(pinned); expect(focusDialog().querySelector('#perception-stage-reference')).toBeTruthy();
    expect(host.querySelector('[data-perception-change="surround"]')).toBeTruthy();
    await click('Clear comparison'); expect(latest.comparison).toBeNull();
    expect(document.activeElement.textContent).toBe('Current experiment'); await leave();
  });
  it.each(['Escape', 'cancel'])('closes on %s without collapsing the expanded layout', async kind => {
    await mount(seed()); await enter(); const before = latest, beforeWrites = writes;
    if (kind === 'Escape') expect((await key(focusDialog(), 'Escape')).defaultPrevented).toBe(true);
    else await act(async () => focusDialog().dispatchEvent(new Event('cancel', { bubbles: true, cancelable: true })));
    expect(focusDialog().open).toBe(false); expect(latest.expanded).toBe(true);
    expect(document.activeElement).toBe(button('Focus experiment')); expectLocalOnly(before, beforeWrites);
  });
  it('keeps an intentionally changed layout after closing', async () => {
    await mount(engine.normalize({})); await enter(); await click('Expand viewing area');
    expect(latest.expanded).toBe(true); await leave(); expect(latest.expanded).toBe(true);
    expect(button('Compact viewing area')).toBeTruthy();
  });
  it('keeps three matches masked and locked across entering, leaving, and recording', async () => {
    await mount(engine.normalize({ models: { brightness: { matching: true } }, studies: group('old'), comparison: { experiment: 'brightness', model: {} } }));
    await click('Start three matches'); await enter();
    expect(button('Reveal measurements').disabled).toBe(true); expect(button('Pin comparison').disabled).toBe(true);
    expect(host.querySelector('#perception-stage-reference')).toBeNull(); expect(host.querySelector('[data-perception-recorded-preview]')).toBeNull();
    expect(live().querySelector('[data-perception-guide]')).toBeNull();
    await recordUI(120, 'One'); await leave(); await enter();
    await recordUI(132, 'Two'); await recordUI(144, 'Three');
    expect(latest.studies).toHaveLength(6); expect(latest.studies.slice(-3).every(row => !row.model.reveal)).toBe(true);
    expect(host.querySelector('[data-perception-recorded-preview]')).toBeNull();
    await click('Reveal study results'); expect(focusDialog().querySelector('[data-perception-recorded-preview="active"]')).toBeTruthy();
    const before = latest, beforeWrites = writes; await leave(); expectLocalOnly(before, beforeWrites);
  });
  it('returns from a nested recorded viewer to the still-open live workspace', async () => {
    await mount(engine.normalize({ models: { brightness: { matching: true } } })); await enter();
    await click('Start three matches'); for (const value of [120, 132, 144]) await recordUI(value); await click('Reveal study results');
    await open('active'); expect(dialog().open).toBe(true); expect(focusDialog().open).toBe(true);
    await key(dialog(), 'Escape'); expect(dialog().open).toBe(false); expect(focusDialog().open).toBe(true);
    expect(document.activeElement).toBe(enlarge('active')); await leave();
  });
  it('closes the modal before moving to a full notebook', async () => {
    const studies = Array.from({ length: 24 }, (_, i) => ({ id: 'record-' + i, experiment: 'brightness', model: {}, date: '' }));
    await mount(engine.normalize({ studies, models: { brightness: { matching: true } } })); await enter();
    expect(button('Start three matches').disabled).toBe(true); await click('Review notebook');
    expect(focusDialog().open).toBe(false); expect(document.activeElement.textContent).toBe('Observation notebook'); expect(latest.studies).toHaveLength(24);
  });
  it('stops rotation when entering and leaving focus', async () => {
    await mount(engine.normalize({ experiment: 'moire' })); await click('Play slow rotation'); await enter();
    expect(button('Play slow rotation').getAttribute('aria-pressed')).toBe('false');
    await click('Play slow rotation'); await leave(); expect(button('Play slow rotation').getAttribute('aria-pressed')).toBe('false');
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });
  it('closes on an external experiment change and removes the previous drawing', async () => {
    await mount(engine.normalize({ experiment: 'necker' })); await enter();
    await act(async () => externalState(previous => ({ ...previous, experiment: 'moire' })));
    expect(focusDialog().open).toBe(false); expect(focusDialog().textContent).toBe('');
    expect(live().querySelector('[data-perception-grid="base"]')).toBeTruthy();
  });
  it('clears the focused view when the learner profile changes', async () => {
    await mount(seed()); await enter(); await act(async () => changeProfile('another-profile'));
    expect(focusDialog().open).toBe(false); expect(focusDialog().textContent).toBe('');
  });
  it('falls back to the normal workspace if the native dialog cannot open', async () => {
    await mount(seed()); focusDialog().showModal = () => { throw new Error('Unavailable'); }; const before = latest, beforeWrites = writes;
    await enter(); expect(focusDialog().open).toBe(false); expect(live()).toBeTruthy();
    expect(document.activeElement).toBe(button('Focus experiment')); expect(announce).toHaveBeenCalledWith(expect.stringContaining('could not open'));
    expectLocalOnly(before, beforeWrites);
  });
  it('wraps keyboard focus through live controls and excludes collapsed fields', async () => {
    await mount(engine.normalize({ models: { brightness: { reveal: true } } })); await enter();
    const first = button('Back to workspace'), last = focusDialog().querySelector('a[href]');
    await key(document.activeElement, 'Tab', true); expect(document.activeElement).toBe(last);
    await key(last, 'Tab'); expect(document.activeElement).toBe(first);
    await act(async () => { const details=focusDialog().querySelector('details'); details.open=false; details.dispatchEvent(new Event('toggle')); });
    await key(first, 'Tab', true); expect(document.activeElement).toBe(last);
    expect(host.querySelectorAll('[id]').length).toBe(new Set([...host.querySelectorAll('[id]')].map(node=>node.id)).size);
  });
  it('supports StrictMode without duplicate dialogs or state writes', async () => {
    await mount(seed(), { strict: true }); const before = latest, beforeWrites = writes; await enter(); await leave(); await enter();
    expect(host.querySelectorAll('[data-perception-focus-dialog]')).toHaveLength(1); expectLocalOnly(before, beforeWrites);
  });
});
