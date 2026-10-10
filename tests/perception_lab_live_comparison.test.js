import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
let engine, config, host, root, latest, replaceState, setProfile, writes;
const ids = ['brightness', 'ebbinghaus', 'mullerLyer', 'cafeWall', 'necker', 'moire'];
const query = selector => host.querySelector(selector);
const pair = () => query('.perception-live-pair');
const current = () => query('.perception-live-stage');
const pinned = () => query('.perception-comparison');
const layout = () => query('[data-perception-comparison-layout]');
const showCurrent = () => query('[data-perception-show-current]');
const showPinned = () => query('[data-perception-show-pinned]');
function button(name) { const node = [...host.querySelectorAll('button')].find(node => node.textContent.trim() === name); expect(node, name).toBeTruthy(); return node; }
async function click(node) { await act(async () => (typeof node === 'string' ? button(node) : node).click()); }
async function input(node, value) {
  expect(node).toBeTruthy();
  await act(async () => {
    const prototype = node instanceof HTMLSelectElement ? HTMLSelectElement.prototype : node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, String(value));
    node.dispatchEvent(new Event(node instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
  });
}
function seed(experiment = 'brightness') {
  return engine.normalize({ experiment, models: { [experiment]: { note: 'Keep my draft', prediction: 'Unsure' } }, comparison: { experiment, model: { context: false, note: 'Pinned note' } }, studies: [{ id: 'saved', experiment, model: { note: 'Saved observation' } }] });
}
async function mount(value = seed(), strict = false) {
  writes = 0;
  function Harness() {
    const [data, setData] = React.useState({ perceptionLab: value, otherTool: { untouched: 37 } });
    const [profile, changeProfile] = React.useState('comparison-profile');
    latest = data; replaceState = update => setData(previous => ({ ...previous, perceptionLab: typeof update === 'function' ? update(previous.perceptionLab) : update })); setProfile = changeProfile;
    return config.render(makeCtx({ toolData: data, setToolData: update => { writes++; setData(update); }, activeProfileId: profile }));
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await act(async () => root.render(strict ? React.createElement(React.StrictMode, null, React.createElement(Harness)) : React.createElement(Harness)));
}
function expectVisible(reference) {
  expect(current().dataset.comparisonInactive).toBe(String(reference));
  expect(pinned().dataset.comparisonInactive).toBe(String(!reference));
  expect(showCurrent().getAttribute('aria-pressed')).toBe(String(!reference));
  expect(showPinned().getAttribute('aria-pressed')).toBe(String(reference));
  expect((reference ? current() : pinned()).getAttribute('aria-hidden')).toBe('true');
  expect((reference ? current() : pinned()).hasAttribute('inert')).toBe(true);
  expect((reference ? pinned() : current()).hasAttribute('aria-hidden')).toBe(false);
}
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab(); config = loadTool('stem_lab/stem_tool_perception.js', 'perceptionLab'); engine = window.StemLab.PerceptionEngine;
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
  vi.stubGlobal('HTMLDialogElement', window.HTMLDialogElement);
  Object.defineProperty(window.HTMLDialogElement.prototype, 'showModal', { configurable: true, writable: true, value() { this.open = true; } });
  Object.defineProperty(window.HTMLDialogElement.prototype, 'close', { configurable: true, value() { this.open = false; } });
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1); vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
});
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; vi.restoreAllMocks(); vi.unstubAllGlobals(); delete globalThis.IS_REACT_ACT_ENVIRONMENT; });

describe('Live drawing comparison layouts', () => {
  it.each(ids)('switches %s without editing or blending either drawing', async id => {
    await mount(seed(id)); const before = structuredClone(latest), currentSVG = query('#perception-stage-current'), pinnedSVG = query('#perception-stage-reference');
    const drawing = currentSVG.innerHTML, reference = pinnedSVG.innerHTML;
    await input(layout(), 'stacked'); expect(pair().dataset.layout).toBe('stacked');
    await input(layout(), 'switch'); expectVisible(false);
    await click(showPinned()); expectVisible(true);
    await click(showCurrent()); expectVisible(false);
    await input(layout(), 'auto'); expect(pair().dataset.layout).toBe('auto');
    expect(current().hasAttribute('aria-hidden')).toBe(false); expect(pinned().hasAttribute('aria-hidden')).toBe(false);
    expect(query('#perception-stage-current')).toBe(currentSVG); expect(query('#perception-stage-reference')).toBe(pinnedSVG);
    expect(currentSVG.innerHTML).toBe(drawing); expect(pinnedSVG.innerHTML).toBe(reference);
    expect(latest).toEqual(before); expect(writes).toBe(0);
  });
  it('returns to current after drawing edits and does not resurrect an old pinned selection', async () => {
    await mount(); await input(layout(), 'switch'); await click(showPinned());
    const original = latest.perceptionLab.models.brightness.contrast;
    await input(query('#perception-contrast'), 45); expectVisible(false);
    await input(query('#perception-contrast'), original); expectVisible(false);
    await click(showPinned()); await click('Remove surroundings'); expectVisible(false);
    await click(showPinned()); await click('Reveal measurements'); expectVisible(false);
  });
  it('keeps a pinned view selected while writing a note or prediction', async () => {
    await mount(); await input(layout(), 'switch'); await click(showPinned());
    await input(query('#perception-note'), 'New draft\nwith <literal> words'); await click('Same'); expectVisible(true);
    expect(latest.perceptionLab.models.brightness.note).toBe('New draft\nwith <literal> words');
    expect(latest.perceptionLab.comparison.model.note).toBe('Pinned note');
  });
  it('clears a visible pinned view and restores keyboard focus to the current drawing', async () => {
    await mount(); await input(layout(), 'switch'); await click(showPinned());
    const clear = query('[data-perception-clear-comparison]'); clear.focus(); await click(clear);
    expect(latest.perceptionLab.comparison).toBeNull(); expect(pinned()).toBeNull(); expect(layout()).toBeNull();
    expect(current().getAttribute('aria-hidden')).toBeNull(); expect(pair().dataset.layout).toBe('auto');
    expect(document.activeElement.textContent).toBe('Current experiment');
  });
  it('starts from current when replacing or repinning a comparison', async () => {
    await mount(); await input(layout(), 'switch'); await click(showPinned()); await click('Pin comparison'); expectVisible(false);
    await click(showPinned()); await act(async () => replaceState(previous => ({ ...previous, comparison: { experiment: 'necker', model: {} } }))); expectVisible(false);
    expect(showPinned().textContent).toContain('Ambiguous cube'); await click(showPinned()); expectVisible(true);
  });
  it('keeps layout preferences through focus mode and restores one active workspace', async () => {
    await mount(seed('necker'), true); await input(layout(), 'switch'); await click(showPinned());
    const before = structuredClone(latest), beforeWrites = writes;
    await click('Focus experiment'); const dialog = query('[data-perception-focus-dialog]'); expect(dialog.open).toBe(true); expect(dialog.contains(pair())).toBe(true); expectVisible(true);
    await click('Back to workspace'); expectVisible(true);
    expect(host.querySelectorAll('#perception-stage-current')).toHaveLength(1); expect(host.querySelectorAll('[data-perception-comparison-layout]')).toHaveLength(1);
    expect(document.activeElement).toBe(button('Focus experiment')); expect(latest).toEqual(before); expect(writes).toBe(beforeWrites);
  });
  it('removes pinned views and layout controls during collecting, then returns to current', async () => {
    const value = seed(); value.models.brightness.matching = true;
    await mount(value); await input(layout(), 'switch'); await click(showPinned()); await click('Start three matches');
    expect(pinned()).toBeNull(); expect(layout()).toBeNull(); expect(current().hasAttribute('inert')).toBe(false);
    expect(button('Pin comparison').disabled).toBe(true); expect(button('Export PNG').disabled).toBe(true);
    for (let i = 0; i < 3; i++) { await click('Same'); await click('Record match'); }
    expectVisible(false); expect(button('Export PNG').disabled).toBe(true);
    expect(query('[data-perception-result]')).toBeNull();
    await click('Reveal study results'); expectVisible(false); expect(button('Export PNG').disabled).toBe(false);
  });
  it('resets view selection for another experiment and all preferences for another learner', async () => {
    await mount(); await input(layout(), 'switch'); await click(showPinned());
    await click(query('[data-perception-experiment="necker"]')); expectVisible(false); expect(layout().value).toBe('switch');
    await click(showPinned()); await act(async () => setProfile('another-learner')); expect(layout().value).toBe('auto');
    expect(current().hasAttribute('inert')).toBe(false); expect(pinned().hasAttribute('inert')).toBe(false);
  });
  it('pauses rotation on entering switch views and while selecting a pinned drawing', async () => {
    await mount(seed('moire')); await click('Play slow rotation'); await input(layout(), 'switch'); expect(button('Play slow rotation').getAttribute('aria-pressed')).toBe('false');
    await click('Play slow rotation'); await click(showPinned()); expectVisible(true); expect(button('Play slow rotation').getAttribute('aria-pressed')).toBe('false');
  });
  it('exports the current drawing when the pinned comparison is visible', async () => {
    const blobs=[]; vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => { blobs.push(blob); return 'blob:comparison'; });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {}); vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await mount(); await input(layout(), 'switch'); await click(showPinned()); const before=structuredClone(latest);
    await click('Export SVG'); expect(blobs).toHaveLength(1);
    const markup = await new Promise(resolve => { const reader=new FileReader(); reader.onload=()=>resolve(reader.result); reader.readAsText(blobs[0]); });
    const parsed = new DOMParser().parseFromString(markup, 'image/svg+xml');
    expect(parsed.querySelector('parsererror')).toBeNull(); expect(parsed.querySelector('[data-perception-context]')).toBeTruthy();
    expect(query('#perception-stage-reference [data-perception-context]')).toBeNull(); expectVisible(true); expect(latest).toEqual(before);
  });
});
