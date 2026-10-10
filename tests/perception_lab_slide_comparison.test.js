import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const IDS = ['brightness', 'ebbinghaus', 'mullerLyer', 'cafeWall', 'necker', 'moire', 'ponzo'];
const MATCHING = IDS.slice(0, 3);
let engine, config, host, root, latest, replaceState, changeProfile, writes;
const query = selector => host.querySelector(selector);
const current = () => query('#perception-stage-current');
const reference = () => query('#perception-stage-reference');
const layout = () => query('[data-perception-comparison-layout]');
const position = () => query('[data-perception-slide-position]');
const stage = () => query('[data-perception-slide-stage]');
const show = view => query('[data-perception-slide-show="' + view + '"]');
const layer = view => query('[data-perception-slide-layer="' + view + '"]');
function button(label) {
  const node = [...host.querySelectorAll('button')].find(item => (item.getAttribute('aria-label') || item.textContent).trim() === label);
  expect(node, label).toBeTruthy(); return node;
}
async function click(node) { expect(node).toBeTruthy(); await act(async () => (typeof node === 'string' ? button(node) : node).click()); }
async function input(node, value) {
  expect(node).toBeTruthy();
  const prototype = node instanceof HTMLSelectElement ? HTMLSelectElement.prototype : node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, String(value));
    node.dispatchEvent(new Event(node instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
  });
}
function seed(experiment = 'brightness') {
  return engine.normalize({ experiment, expanded: true,
    models: { [experiment]: { note: 'Keep my current draft', prediction: engine.experiments.find(item => item.id === experiment).choices[0], cue: 'front' } },
    comparison: { experiment, model: { context: false, cue: 'back', note: 'Keep my pinned note' } },
    studies: [{ id: 'saved', experiment: 'brightness', date: '2026-10-07T12:00:00.000Z', model: { note: 'Keep my notebook observation' } }],
  });
}
async function mount(value = seed(), strict = false) {
  writes = 0;
  function Harness() {
    const [data, setData] = React.useState({ perceptionLab: value, otherTool: { untouched: 37 } });
    const [profile, setProfile] = React.useState('slide-learner');
    latest = data; changeProfile = setProfile;
    replaceState = update => setData(previous => ({ ...previous, perceptionLab: typeof update === 'function' ? update(previous.perceptionLab) : update }));
    return config.render(makeCtx({ toolData: data, activeProfileId: profile, setToolData: update => { writes++; setData(update); } }));
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  const content = React.createElement(Harness);
  await act(async () => root.render(strict ? React.createElement(React.StrictMode, null, content) : content));
}
async function slide() { await input(layout(), 'slide'); expect(query('.perception-live-pair').dataset.layout).toBe('slide'); expect(position()).toBeTruthy(); }
function expectPosition(value) {
  expect(position().value).toBe(String(value)); expect(stage().dataset.position).toBe(String(value));
  expect(layer('current').style.clipPath).toBe('inset(0 ' + (100 - value) + '% 0 0)');
  expect(layer('reference').style.clipPath).toBe('');
  for (const [view, endpoint] of [['current', 100], ['reference', 0], ['center', 50]]) expect(show(view).getAttribute('aria-pressed')).toBe(String(value === endpoint));
}
function expectHidden(svg) {
  expect(svg.querySelector('[data-perception-guide]')).toBeNull();
  expect(svg.querySelector('desc').textContent).not.toMatch(/Reference:|Left RGB|Difference:/);
  expect(svg.querySelectorAll('text')).toHaveLength(0);
}
async function beginInquiry() {
  const card = query('[data-perception-inquiry]');
  await act(async () => { card.open = true; card.dispatchEvent(new Event('toggle')); });
  const capture = query('[data-perception-inquiry-start]');
  await act(async () => capture.focus()); await click(capture);
  expect(query('[data-perception-inquiry-comparison]')).toBeTruthy();
}
async function blobText(blob) { return new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsText(blob); }); }

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab(); config = loadTool('stem_lab/stem_tool_perception.js', 'perceptionLab'); engine = window.StemLab.PerceptionEngine;
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
  vi.stubGlobal('HTMLDialogElement', window.HTMLDialogElement);
  Object.defineProperty(window.HTMLDialogElement.prototype, 'showModal', { configurable: true, writable: true, value() { this.open = true; } });
  Object.defineProperty(window.HTMLDialogElement.prototype, 'close', { configurable: true, writable: true, value() { this.open = false; } });
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1); vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
});
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; vi.restoreAllMocks(); vi.unstubAllGlobals(); delete globalThis.IS_REACT_ACT_ENVIRONMENT; });

describe('Slide drawing comparison', () => {
  it.each(IDS)('preserves the full %s drawings and their scale at every divider position', async id => {
    await mount(seed(id)); const drawing = current().innerHTML, pinnedDrawing = reference().innerHTML, before = structuredClone(latest);
    await slide();
    expect(position().tagName).toBe('INPUT'); expect(position().type).toBe('range');
    expect(position().min).toBe('0'); expect(position().max).toBe('100'); expect(position().step).toBe('1');
    expect(query('label[for="' + position().id + '"]')).toBeTruthy();
    expect(document.getElementById(position().getAttribute('aria-controls'))).toBe(query('.perception-live-pair'));
    for (const value of [0, 17, 50, 83, 100]) {
      await input(position(), value); expectPosition(value);
      expect(current().getAttribute('viewBox')).toBe('0 0 800 480'); expect(reference().getAttribute('viewBox')).toBe('0 0 800 480');
      expect(current().innerHTML).toBe(drawing); expect(reference().innerHTML).toBe(pinnedDrawing);
      expect(current().closest('[data-perception-slide-layer]')).toBe(layer('current')); expect(reference().closest('[data-perception-slide-layer]')).toBe(layer('reference'));
      for (const svg of [current(), reference()]) { expect(svg.hasAttribute('clip-path')).toBe(false); expect(svg.hasAttribute('transform')).toBe(false); }
      expect(host.querySelectorAll('#perception-stage-current')).toHaveLength(1); expect(host.querySelectorAll('#perception-stage-reference')).toHaveLength(1);
    }
    expect(latest).toEqual(before); expect(writes).toBe(0);
  });

  it('provides complete current/reference views and a centered divider with meaningful pressed state', async () => {
    await mount(); await slide(); expectPosition(50);
    await click(show('current')); expectPosition(100); expect(position().getAttribute('aria-valuetext')).toContain('Current experiment');
    await click(show('reference')); expectPosition(0); expect(position().getAttribute('aria-valuetext')).toContain('Pinned comparison');
    await click(show('center')); expectPosition(50);
    await input(position(), 34); expectPosition(34);
    expect(position().getAttribute('aria-valuetext')).toContain('34%'); expect(position().getAttribute('aria-valuetext')).toContain('66%');
    expect(writes).toBe(0);
  });

  it('exports the same complete current SVG before and after local divider changes', async () => {
    const blobs = [];
    vi.stubGlobal('URL', { createObjectURL: vi.fn(blob => { blobs.push(blob); return 'blob:slide-' + blobs.length; }), revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await mount(); const before = structuredClone(latest); await click('Export SVG');
    await slide(); await input(position(), 13); await click(show('reference')); await click('Export SVG');
    expect(blobs).toHaveLength(2);
    const original = await blobText(blobs[0]), after = await blobText(blobs[1]); expect(after).toBe(original);
    const exported = new DOMParser().parseFromString(after, 'image/svg+xml');
    expect(exported.querySelector('parsererror')).toBeNull(); expect(exported.documentElement.getAttribute('viewBox')).toBe('0 0 800 480');
    expect(exported.querySelector('[data-perception-context]')).toBeTruthy(); expect(reference().querySelector('[data-perception-context]')).toBeNull();
    expect(latest).toEqual(before); expect(writes).toBe(0); expectPosition(0);
  });

  it('keeps the divider while the current drawing, note, prediction, or reveal changes', async () => {
    await mount(); await slide(); await input(position(), 23);
    const before = structuredClone(latest), pinnedDrawing = reference().innerHTML, drawing = current().innerHTML;
    await input(query('#perception-contrast'), 45); expectPosition(23); expect(current().innerHTML).not.toBe(drawing);
    await input(query('#perception-note'), 'Updated current note'); await click('Same'); await click('Reveal measurements'); expectPosition(23);
    expect(reference().innerHTML).toBe(pinnedDrawing); expect(latest.perceptionLab.comparison).toEqual(before.perceptionLab.comparison);
    expect(latest.perceptionLab.studies).toEqual(before.perceptionLab.studies); expect(latest.otherTool).toEqual(before.otherTool);
    expect(latest.perceptionLab.models.brightness.note).toBe('Updated current note'); expect(latest.perceptionLab.models.brightness.reveal).toBe(true);
  });

  it('resets for a replacement reference and when returning to a previously used pair', async () => {
    await mount(); await slide(); await input(position(), 19);
    const oldReference = structuredClone(latest.perceptionLab.comparison);
    await act(async () => replaceState(previous => ({ ...previous, comparison: { experiment: 'brightness', model: { contrast: 11, context: true } } })));
    expectPosition(50); await input(position(), 71);
    await act(async () => replaceState(previous => ({ ...previous, comparison: oldReference }))); expectPosition(50);
    await input(position(), 8); await click('Pin comparison'); expectPosition(50);
  });

  it('supports a live surroundings reference, keeps its split through edits, and resets between comparison modes', async () => {
    await mount(); await slide(); await input(position(), 27);
    const before = structuredClone(latest);
    await click(query('[data-perception-compare-context]')); expectPosition(50);
    expect(query('[data-perception-context-comparison]')).toBeTruthy(); expect(writes).toBe(0);
    await input(position(), 39); await input(query('#perception-contrast'), 51); expectPosition(39);
    expect(current().querySelector('[data-perception-context]')).toBeTruthy(); expect(reference().querySelector('[data-perception-context]')).toBeNull();
    await click(query('[data-perception-context-toggle]')); expectPosition(39);
    expect(current().querySelector('[data-perception-context]')).toBeNull(); expect(reference().querySelector('[data-perception-context]')).toBeTruthy();
    await click(query('[data-perception-compare-context]')); expectPosition(50);
    expect(latest.perceptionLab.comparison).toEqual(before.perceptionLab.comparison); expect(latest.perceptionLab.studies).toEqual(before.perceptionLab.studies);
  });

  it('supports an inquiry starting view and resets when that starting view is replaced', async () => {
    await mount(seed('cafeWall')); await beginInquiry(); await slide(); await input(position(), 29);
    const startingDrawing = reference().innerHTML, beforePin = structuredClone(latest.perceptionLab.comparison);
    await input(query('#perception-offset'), 72); expectPosition(29); expect(reference().innerHTML).toBe(startingDrawing);
    await click(query('[data-perception-inquiry-start]')); expectPosition(50);
    expect(reference().innerHTML).not.toBe(startingDrawing); expect(latest.perceptionLab.comparison).toEqual(beforePin);
  });

  it('disables slide for a different experiment and resets after leaving and returning to the old pair', async () => {
    await mount(); await slide(); await input(position(), 76);
    await click(query('[data-perception-experiment="necker"]'));
    expect(layout().querySelector('option[value="slide"]').disabled).toBe(true); expect(query('.perception-live-pair').dataset.layout).toBe('auto'); expect(position()).toBeNull();
    await input(layout(), 'slide'); expect(query('.perception-live-pair').dataset.layout).toBe('auto'); expect(stage()).toBeNull();
    await click(query('[data-perception-experiment="brightness"]')); await slide(); expectPosition(50);
  });

  it('resets local layout and divider preferences when changing learners', async () => {
    await mount(); await slide(); await input(position(), 12); const before = structuredClone(latest);
    await act(async () => changeProfile('another-learner'));
    expect(layout().value).toBe('auto'); expect(position()).toBeNull(); await slide(); expectPosition(50);
    expect(latest).toEqual(before); expect(writes).toBe(0);
  });

  it('keeps a single pair and its divider through focus mode', async () => {
    await mount(seed('ponzo'), true); await slide(); await input(position(), 68); const before = structuredClone(latest);
    await click('Focus experiment'); const dialog = query('[data-perception-focus-dialog]');
    expect(dialog.open).toBe(true); expect(dialog.contains(stage())).toBe(true); expectPosition(68);
    await click('Back to workspace'); expectPosition(68);
    expect(host.querySelectorAll('[data-perception-slide-position]')).toHaveLength(1); expect(host.querySelectorAll('#perception-stage-current')).toHaveLength(1);
    expect(document.activeElement).toBe(button('Focus experiment')); expect(latest).toEqual(before); expect(writes).toBe(0);
  });

  it.each(MATCHING)('keeps hidden %s measurements secret independently in both slide drawings', async id => {
    const value = seed(id), match = id === 'brightness' ? 153 : id === 'ebbinghaus' ? 67 : 437;
    value.models[id] = engine.normalizeModel(id, { ...value.models[id], matching: true, matchValue: match, reveal: false });
    value.comparison.model = engine.normalizeModel(id, { ...value.comparison.model, matching: true, matchValue: match + 1, reveal: false });
    await mount(value); await slide(); await click(show('reference'));
    expectHidden(current()); expectHidden(reference()); expect(query('[data-perception-result]')).toBeNull();
    await click('Reveal measurements'); expectPosition(0); expect(current().querySelector('[data-perception-guide]')).toBeTruthy(); expectHidden(reference());
    expect(query('[data-perception-result]')).toBeTruthy(); expect(latest.perceptionLab.comparison.model.reveal).toBe(false);
  });

  it('removes slide controls while collecting matches and returns with a centered divider', async () => {
    const value = seed(); value.models.brightness.matching = true;
    await mount(value); await slide(); await input(position(), 91); await click('Start three matches');
    expect(position()).toBeNull(); expect(stage()).toBeNull(); expect(reference()).toBeNull(); expect(layout()).toBeNull();
    expect(button('Pin comparison').disabled).toBe(true); expect(button('Export SVG').disabled).toBe(true); expect(query('[data-perception-result]')).toBeNull();
    await click('End repeated study'); await slide(); expectPosition(50);
  });

  it('keeps physical current-left/reference-right captions and native range direction in an RTL workspace', async () => {
    await mount(); host.dir = 'rtl'; await slide();
    const caption = stage().closest('figure').querySelector('figcaption');
    expect(caption.getAttribute('dir')).toBe('ltr'); expect(caption.children).toHaveLength(2);
    expect([...caption.children].map(child => child.getAttribute('dir'))).toEqual(['auto', 'auto']);
    expect(caption.children[0].textContent).toContain('Current experiment'); expect(caption.children[1].textContent).toContain('Pinned comparison');
    expect(position().getAttribute('dir')).toBe('ltr'); await input(position(), 16); expectPosition(16);
  });
});
