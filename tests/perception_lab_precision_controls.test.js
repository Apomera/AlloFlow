import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const { act } = React;
const settings = [
  ['brightness', 'contrast', 61, 80], ['brightness', 'target', 117, 128],
  ['ebbinghaus', 'surround', 43, 36], ['ebbinghaus', 'gap', 19, 12],
  ['mullerLyer', 'angle', 54, 30], ['mullerLyer', 'fin', 63, 42],
  ['cafeWall', 'offset', 72, 50], ['cafeWall', 'mortar', 11, 5],
  ['necker', 'depth', 73, 95], ['moire', 'angle', 13.7, 5], ['moire', 'spacing', 17, 12],
];
let engine, config, root, host, latest, editState, changeProfile, writes, announce, frames, frameId;
const exact = key => host.querySelector('[data-perception-exact="' + key + '"]');
const slider = key => host.querySelector('#perception-' + key);
const reset = key => host.querySelector('[data-perception-reset-setting="' + key + '"]');
const model = () => latest.perceptionLab.models[latest.perceptionLab.experiment];
const button = name => { const result = [...host.querySelectorAll('button')].find(node => node.textContent.trim() === name); expect(result, name).toBeTruthy(); return result; };
async function click(target) { await act(async () => (typeof target === 'string' ? button(target) : target).click()); }
async function focus(node) { await act(async () => node.focus()); }
async function input(node, value) { await act(async () => { Object.getOwnPropertyDescriptor(node instanceof HTMLSelectElement ? HTMLSelectElement.prototype : node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set.call(node, String(value)); node.dispatchEvent(new Event(node instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true })); }); }
async function key(node, name) { const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }); await act(async () => node.dispatchEvent(event)); return event; }
async function blur(node, relatedTarget = null) { await act(async () => node.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget }))); }
async function type(keyName, value) { await focus(exact(keyName)); await input(exact(keyName), value); }
async function tick(time) { const next = frames.entries().next().value; expect(next).toBeTruthy(); frames.delete(next[0]); await act(async () => next[1](time)); }
async function mount(raw = {}, { strict = false, translate } = {}) {
  function Harness() {
    const [data, setData] = React.useState({ perceptionLab: engine.normalize(raw), otherTool: { retained: 37 } });
    const [profile, setProfile] = React.useState('precision-learner'); latest = data; changeProfile = setProfile;
    editState = fn => setData(previous => ({ ...previous, perceptionLab: fn(previous.perceptionLab) }));
    return config.render(makeCtx({ toolData: data, setToolData: fn => { writes++; setData(fn); }, activeProfileId: profile, announceToSR: announce, ...(translate ? { t: translate } : {}) }));
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await act(async () => root.render(strict ? React.createElement(React.StrictMode, null, React.createElement(Harness)) : React.createElement(Harness)));
}
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; resetStemLab(); config = loadTool('stem_lab/stem_tool_perception.js', 'perceptionLab'); engine = window.StemLab.PerceptionEngine;
  writes = 0; announce = vi.fn(); frames = new Map(); frameId = 0;
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
  vi.stubGlobal('HTMLDialogElement', window.HTMLDialogElement);
  Object.defineProperty(window.HTMLDialogElement.prototype, 'showModal', { configurable: true, writable: true, value() { this.open = true; } });
  Object.defineProperty(window.HTMLDialogElement.prototype, 'close', { configurable: true, value() { this.open = false; } });
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.set(++frameId, callback); return frameId; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => frames.delete(id));
});
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; vi.restoreAllMocks(); vi.unstubAllGlobals(); delete globalThis.IS_REACT_ACT_ENVIRONMENT; });

describe('Precise experiment adjustments', () => {
  it.each(settings)('applies and individually resets %s.%s without losing the rest of the experiment', async (experiment, setting, value, defaultValue) => {
    await mount({ experiment, models: { [experiment]: { reveal: true, context: false, note: 'Keep this note', prediction: 'Unsure' } }, comparison: { experiment, model: { note: 'Pinned' } }, studies: [{ id: 'saved', experiment, model: { note: 'Saved' } }] });
    const before = structuredClone(latest), startModel = structuredClone(model());
    expect(reset(setting).disabled).toBe(true); await type(setting, value);
    expect(writes).toBe(0); expect(model()).toEqual(startModel); expect(exact(setting).value).toBe(String(value));
    expect((await key(exact(setting), 'Enter')).defaultPrevented).toBe(true);
    expect(model()).toEqual({ ...startModel, [setting]: value }); expect(Number(slider(setting).value)).toBe(value);
    expect(latest.perceptionLab.comparison).toEqual(before.perceptionLab.comparison); expect(latest.perceptionLab.studies).toEqual(before.perceptionLab.studies); expect(latest.otherTool).toEqual(before.otherTool);
    await click(reset(setting)); expect(model()).toEqual({ ...startModel, [setting]: defaultValue }); expect(document.activeElement).toBe(exact(setting)); expect(reset(setting).disabled).toBe(true);
    expect(announce).toHaveBeenCalledWith(expect.stringContaining('reset to ' + defaultValue));
  });
  it.each(['', '-1', '101', '30.5', '1e309', 'not a number'])('rejects invalid background difference %j and retains the drawing', async raw => {
    await mount(); const before = structuredClone(latest), svg = host.querySelector('#perception-stage-current').innerHTML;
    await type('contrast', raw); await key(exact('contrast'), 'Enter');
    expect(exact('contrast').getAttribute('aria-invalid')).toBe('true'); expect(host.querySelector('[role="alert"]').textContent).toContain('0 to 100');
    expect(host.querySelector('#perception-stage-current').innerHTML).toBe(svg); expect(latest).toEqual(before); expect(writes).toBe(0);
    await input(exact('contrast'), '47'); await key(exact('contrast'), 'Enter'); expect(model().contrast).toBe(47); expect(exact('contrast').hasAttribute('aria-invalid')).toBe(false); expect(host.querySelector('[role="alert"]')).toBeNull();
  });
  it.each([0, 0.1, 13.1, 29.9, 30])('accepts valid 0.1 degree angle %s without floating point drift', async value => {
    await mount({ experiment: 'moire' }); await type('angle', value); await key(exact('angle'), 'Enter');
    expect(model().angle).toBe(value); expect(exact('angle').value).toBe(String(value)); expect(slider('angle').value).toBe(String(value));
    expect(host.querySelector('[data-perception-grid="overlay"]').getAttribute('transform')).toBe('rotate(' + value + ' 400 240)');
  });
  it('rejects an off-step decimal instead of silently rounding it', async () => {
    await mount({ experiment: 'moire' }); await type('angle', '13.15'); await blur(exact('angle'));
    expect(model().angle).toBe(5); expect(exact('angle').getAttribute('aria-invalid')).toBe('true'); expect(writes).toBe(0);
  });
  it('applies on blur once and avoids saving an unchanged value', async () => {
    await mount({}, { strict: true }); await type('contrast', 62); await blur(exact('contrast')); expect(model().contrast).toBe(62); expect(writes).toBe(1);
    await type('contrast', '62.0'); await key(exact('contrast'), 'Enter'); await blur(exact('contrast')); expect(writes).toBe(1);
  });
  it('cancels a draft with Escape without collapsing the expanded or focused workspace', async () => {
    await mount({ expanded: true }); await click('Focus experiment'); const before = structuredClone(latest);
    await type('contrast', 61); expect((await key(exact('contrast'), 'Escape')).defaultPrevented).toBe(true);
    expect(exact('contrast').value).toBe('80'); expect(latest).toEqual(before); expect(host.querySelector('[data-perception-focus-dialog]').open).toBe(true);
    await key(exact('contrast'), 'Escape'); expect(host.querySelector('[data-perception-focus-dialog]').open).toBe(false); expect(latest.perceptionLab.expanded).toBe(true);
  });
  it.each(['62', '999'])('reset discards draft %s without committing it first', async value => {
    await mount({ models: { brightness: { contrast: 48 } } }); await type('contrast', value);
    const pointer = new MouseEvent('pointerdown', { button: 0, bubbles: true, cancelable: true }); await act(async () => reset('contrast').dispatchEvent(pointer)); expect(pointer.defaultPrevented).toBe(true); expect(writes).toBe(0);
    await click(reset('contrast')); expect(model().contrast).toBe(80); expect(writes).toBe(1); expect(host.querySelector('[role="alert"]')).toBeNull(); expect(exact('contrast').value).toBe('80');
  });
  it('applies a valid value when keyboard focus moves to Reset without activating it', async () => {
    await mount(); await type('contrast',62); await blur(exact('contrast'),reset('contrast'));
    expect(model().contrast).toBe(62); expect(exact('contrast').value).toBe('62'); expect(writes).toBe(1);
  });
  it('allows reset to discard an invalid draft at the default without a saved-state write', async () => {
    await mount(); await type('contrast', 999); await key(exact('contrast'), 'Enter'); expect(reset('contrast').disabled).toBe(false);
    await click(reset('contrast')); expect(exact('contrast').value).toBe('80'); expect(writes).toBe(0); expect(document.activeElement).toBe(exact('contrast'));
  });
  it('lets slider edits supersede a numeric draft', async () => {
    await mount(); await type('contrast', 999); await key(exact('contrast'), 'Enter'); await input(slider('contrast'), 43);
    expect(exact('contrast').value).toBe('43'); expect(model().contrast).toBe(43); expect(host.querySelector('[role="alert"]')).toBeNull();
  });
  it('discards stale drafts when the setting changes externally, including after it returns to its original value', async () => {
    await mount(); await type('contrast', 63);
    await act(async () => editState(previous => ({ ...previous, models: { ...previous.models, brightness: { ...previous.models.brightness, contrast: 25 } } })));
    expect(exact('contrast').value).toBe('25');
    await act(async () => editState(previous => ({ ...previous, models: { ...previous.models, brightness: { ...previous.models.brightness, contrast: 80 } } })));
    await key(exact('contrast'), 'Enter'); expect(model().contrast).toBe(80); expect(writes).toBe(0);
  });
  it('does not carry same-named angle drafts to another experiment or learner', async () => {
    await mount({ experiment: 'moire' }); await type('angle', '12.7');
    await click(host.querySelector('[data-perception-experiment="mullerLyer"]')); expect(exact('angle').value).toBe('30');
    await type('angle', 57); await act(async () => changeProfile('another-learner')); expect(exact('angle').value).toBe('30'); await key(exact('angle'), 'Enter'); expect(model().angle).toBe(30);
  });
  it('keeps drafts across unrelated note edits', async () => {
    await mount(); await type('contrast', 61); await input(host.querySelector('#perception-note'), 'Changed note'); expect(exact('contrast').value).toBe('61'); expect(model().contrast).toBe(80);
    await key(exact('contrast'), 'Enter'); expect(model().contrast).toBe(61); expect(model().note).toBe('Changed note');
  });
  it.each(['brightness','ebbinghaus','mullerLyer'])('locks precision controls throughout a %s study and never exposes an exact comparison target', async experiment => {
    await mount({ experiment, models: { [experiment]: { matching: true } } });
    expect(exact('matchValue')).toBeNull(); if (experiment === 'brightness') expect(exact('target')).toBeNull();
    const setting = engine.experiments.find(item => item.id === experiment).controls[0].key, original = model()[setting];
    await type(setting, '999'); await click('Start three matches'); expect(exact(setting).disabled).toBe(true); expect(exact(setting).value).toBe(String(original));
    for (const input of host.querySelectorAll('[data-perception-exact]')) expect(input.disabled).toBe(true);
    for (let trial=0;trial<3;trial++) { await click('Same'); await click('Record match'); }
    await click('Reveal study results'); expect(exact(setting).disabled).toBe(true); await click('End repeated study'); expect(exact(setting).disabled).toBe(false); expect(exact(setting).value).toBe(String(original));
  });
  it('shows current after a committed precise change while preserving the pinned drawing', async () => {
    await mount({ comparison: { experiment:'brightness', model:{contrast:20} } }); const pinned = structuredClone(latest.perceptionLab.comparison);
    await input(host.querySelector('[data-perception-comparison-layout]'), 'switch'); await click(host.querySelector('[data-perception-show-pinned]'));
    await type('contrast', 63); expect(host.querySelector('[data-perception-show-pinned]').getAttribute('aria-pressed')).toBe('true');
    await key(exact('contrast'),'Enter'); expect(host.querySelector('[data-perception-show-current]').getAttribute('aria-pressed')).toBe('true'); expect(latest.perceptionLab.comparison).toEqual(pinned);
  });
  it('pauses moiré at its visible angle before exact editing', async () => {
    await mount({ experiment:'moire' }); await click('Play slow rotation'); await tick(0); await tick(800);
    const visible = Number(slider('angle').value); expect(visible).not.toBe(5); await focus(exact('angle'));
    expect(button('Play slow rotation').getAttribute('aria-pressed')).toBe('false'); expect(model().angle).toBe(visible); expect(Number(exact('angle').value)).toBe(visible);
    await input(exact('angle'),13.7); await key(exact('angle'),'Enter'); expect(model().angle).toBe(13.7); expect(frames.size).toBe(0);
  });
  it('resets a rotating angle to its default without focus restoring the animation frame', async () => {
    await mount({ experiment:'moire' }); await click('Play slow rotation'); await tick(0); await tick(800); expect(reset('angle').disabled).toBe(false);
    await click(reset('angle')); expect(model().angle).toBe(5); expect(exact('angle').value).toBe('5'); expect(document.activeElement).toBe(exact('angle')); expect(frames.size).toBe(0);
  });
  it('labels the two inputs distinctly and localizes range, reset, and error messages', async () => {
    const strings={'stem.perception.exact_setting':'Exact: {setting}','stem.perception.reset_setting':'Restore: {setting}','stem.perception.reset_setting_short':'Restore','stem.perception.setting_range':'Bounds {min}–{max}{unit}; {step}','stem.perception.setting_invalid':'Invalid: {min}–{max}; {step}'};
    await mount({}, { translate:(key,fallback)=>strings[key]||fallback });
    expect(exact('contrast').getAttribute('aria-label')).toBe('Exact: Background difference'); expect(slider('contrast').getAttribute('aria-label')).toBe('Background difference'); expect(reset('contrast').getAttribute('aria-label')).toBe('Restore: Background difference');
    for(const id of exact('contrast').getAttribute('aria-describedby').split(' ')) expect(document.getElementById(id)).toBeTruthy();
    await type('contrast',999); await key(exact('contrast'),'Enter'); expect(host.querySelector('[role="alert"]').textContent).toBe('Invalid: 0–100; 1');
  });
});
