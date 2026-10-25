import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const paths = ['stem_lab/stem_tool_decomposer.js', 'desktop/web-app/public/stem_lab/stem_tool_decomposer.js'];
const catalog = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const translate = (key, fallback) => key.split('.').reduce((value, part) => value?.[part], catalog) ?? fallback ?? key;
const disposers = [];
let frames;

// Exercise the shipped React render and handlers. Canvas calls are harmless
// stand-ins; native QA checks drawing and geometry. DOM focus and state are real.
function mountTool(path, seed = {}) {
  resetStemLab();
  const config = loadTool(path, 'decomposer');
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  let current, setCurrent;
  function Host() {
    const [data, setData] = React.useState({ decomposer: {
      tab: 'states', selected: 'Water', materialsExplored: ['Water'], ...seed,
    } });
    current = data.decomposer;
    setCurrent = patch => setData(prev => ({ ...prev, decomposer: { ...prev.decomposer, ...patch } }));
    return config.render(makeCtx({ toolData: data, setToolData: setData, t: translate }));
  }
  act(() => root.render(React.createElement(Host)));
  disposers.push(() => { act(() => root.unmount()); host.remove(); });
  return { host, state: () => current, patch: patch => act(() => setCurrent(patch)),
    one: selector => host.querySelector(selector), all: selector => [...host.querySelectorAll(selector)] };
}

function activate(button) {
  expect(button).toBeTruthy();
  button.focus();
  act(() => button.click());
}

function nextFrame() {
  const pending = frames.splice(0);
  act(() => pending.forEach(callback => callback(16)));
}

function fill(input, value) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(value));
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function references(view, element, attribute) {
  const ids = (element.getAttribute(attribute) || '').split(/\s+/).filter(Boolean);
  expect(ids.length).toBeGreaterThan(0);
  return ids.map(id => {
    const node = view.one('#' + id);
    expect(node, attribute + ': ' + id).not.toBeNull();
    return node;
  });
}

function controlName(view, element) {
  if (element.hasAttribute('aria-label')) return element.getAttribute('aria-label');
  if (element.hasAttribute('aria-labelledby')) return references(view, element, 'aria-labelledby').map(node => node.textContent).join(' ');
  return element.textContent.trim();
}

function stateParts(view) {
  return {
    range: view.one('input[type="range"]'),
    summary: view.one('#stem-decomposer-state-summary'),
    description: view.one('#stem-decomposer-state-description'),
    canvas: view.one('[data-decomposer-state-canvas]'),
  };
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  frames = [];
  vi.stubGlobal('requestAnimationFrame', callback => { frames.push(callback); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const gradient = { addColorStop() {} };
  const context = new Proxy({
    createLinearGradient: () => gradient, createRadialGradient: () => gradient,
    measureText: text => ({ width: String(text).length * 6 }),
  }, { get: (target, key) => key in target ? target[key] : () => {} });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
});

afterEach(() => {
  disposers.splice(0).forEach(dispose => dispose());
  frames.splice(0).forEach(callback => callback(16));
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe.each(paths)('Material Decomposer particle accessibility: %s', path => {
  it('keeps the visible phase, text alternative, and particle model consistent at water’s boundaries', () => {
    const view = mountTool(path, { _simTemp: -5, motionPaused: true });
    const initial = stateParts(view);
    expect(initial.summary.getAttribute('role')).toBe('status');
    expect(initial.summary.getAttribute('aria-live')).toBe('polite');
    expect(initial.summary.getAttribute('aria-atomic')).toBe('true');
    expect(controlName(view, initial.canvas)).toContain('Water');
    expect(initial.canvas.getAttribute('role')).toBe('img');
    expect(references(view, initial.canvas, 'aria-describedby')).toEqual(expect.arrayContaining([initial.summary, initial.description]));
    initial.range.focus();
    for (const [temperature, phase] of [[-5, 'solid'], [0, 'liquid'], [5, 'liquid'], [100, 'gas']]) {
      fill(initial.range, temperature);
      const current = stateParts(view);
      expect(current.summary).toBe(initial.summary);
      expect(current.canvas._prevState).toBe(phase);
      expect(current.summary.textContent).toMatch(new RegExp('Water.*' + phase, 'i'));
      expect(current.range.getAttribute('aria-valuetext')).toBe(temperature + ' degrees Celsius');
      expect(current.description.textContent).toContain(String(temperature));
      expect(current.description.textContent).toMatch(/particle|arrang|clos|spread|move|motion/i);
      expect(document.activeElement).toBe(initial.range);
    }
  });

  it.each([[-9999, -200, 'solid'], [9999, 500, 'gas'], [Number.NaN, 25, 'liquid']])('uses a consistent derived temperature for saved value %s', (saved, expected, phase) => {
    const view = mountTool(path, { _simTemp: saved, motionPaused: true });
    const { range, summary, description, canvas } = stateParts(view);
    expect(Number(range.value)).toBe(expected);
    expect(range.getAttribute('aria-valuetext')).toBe(expected + ' degrees Celsius');
    expect(description.textContent).toContain(String(expected));
    expect(summary.textContent).toMatch(new RegExp(phase, 'i'));
    expect(canvas._prevState).toBe(phase);
  });

  it('does not mutate the phase live status for temperature changes within the same phase', () => {
    const view = mountTool(path, { _simTemp: 25, motionPaused: true });
    const { range, summary } = stateParts(view);
    const originalText = summary.textContent;
    const observer = new MutationObserver(() => {});
    observer.observe(summary, { childList: true, characterData: true, subtree: true });
    try {
      range.focus();
      fill(range, 30);
      expect(stateParts(view).summary).toBe(summary);
      expect(summary.textContent).toBe(originalText);
      expect(observer.takeRecords()).toHaveLength(0);
      fill(range, 100);
      expect(summary.textContent).not.toBe(originalText);
      expect(observer.takeRecords().length).toBeGreaterThan(0);
      expect(document.activeElement).toBe(range);
    } finally { observer.disconnect(); }
  });

  it('reports paused motion separately from phase and preserves the active control’s focus', () => {
    const view = mountTool(path, { _simTemp: 25 });
    const { summary, description, range } = stateParts(view);
    const phaseText = summary.textContent;
    const pause = view.one('[data-decomposer-motion-control]');
    activate(pause);
    expect(document.activeElement).toBe(pause);
    expect(pause.getAttribute('aria-pressed')).toBe('true');
    expect(view.state().motionPaused).toBe(true);
    expect(description.textContent).toMatch(/paused|still/i);
    expect(summary.textContent).toBe(phaseText);
    range.focus();
    fill(range, 0);
    expect(document.activeElement).toBe(range);
    expect(stateParts(view).canvas._prevState).toBe('liquid');
    expect(description.textContent).toMatch(/paused|still/i);
  });

  it('explains unavailable phase data instead of presenting an invented model for Rust', () => {
    const view = mountTool(path, { selected: 'Rust', _simTemp: 25 });
    const { range, summary, description, canvas } = stateParts(view);
    expect(summary.textContent).toContain('Rust');
    expect(summary.textContent).toMatch(/unavailable|not modeled|cannot predict/i);
    expect(description.textContent).toMatch(/catalog|room.temperature/i);
    expect(description.textContent).toMatch(/solid/i);
    expect(range.disabled).toBe(true);
    expect(canvas).toBeNull();
    expect(view.one('[data-decomposer-motion-control]')).toBeNull();
  });

  it('exposes Baking Soda’s model limit and restores the model below that limit without losing range focus', () => {
    const view = mountTool(path, { selected: 'Baking Soda', _simTemp: 45, motionPaused: true });
    const initial = stateParts(view);
    expect(initial.canvas._prevState).toBe('solid');
    expect(initial.range.disabled).toBe(false);
    initial.range.focus();
    fill(initial.range, 50);
    const limited = stateParts(view);
    expect(limited.summary).toBe(initial.summary);
    expect(limited.summary.textContent).toMatch(/unavailable|not modeled|cannot predict/i);
    expect(limited.description.textContent).toMatch(/decompos|model.*limit|not.*predict/i);
    expect(limited.canvas).toBeNull();
    expect(limited.range.disabled).toBe(false);
    expect(view.one('[data-decomposer-motion-control]')).toBeNull();
    expect(document.activeElement).toBe(initial.range);
    fill(initial.range, 25);
    const restored = stateParts(view);
    expect(restored.canvas._prevState).toBe('solid');
    expect(restored.summary.textContent).toMatch(/Baking Soda.*solid/i);
    expect(restored.range).toBe(initial.range);
    expect(document.activeElement).toBe(initial.range);
    expect(view.state().motionPaused).toBe(true);
  });

  it('describes atom groups, formula, counts, arrangement, and paused motion alongside the Atoms canvas', () => {
    const view = mountTool(path, { tab: 'visualize', selected: 'Water' });
    const canvas = view.one('[data-decomposer-atom-canvas]');
    const description = view.one('#stem-decomposer-atom-description');
    expect(controlName(view, canvas)).toContain('Water');
    expect(canvas.getAttribute('role')).toBe('img');
    expect(references(view, canvas, 'aria-describedby')).toContain(description);
    const assembled = description.textContent;
    expect(assembled).toContain('H₂O');
    expect(assembled).toMatch(/hydrogen.*(?:2|two|₂)|(?:2|two|₂).*hydrogen/i);
    expect(assembled).toMatch(/oxygen.*(?:1|one)|(?:1|one).*oxygen/i);
    expect(assembled).toMatch(/circle.*(?:group|element)|(?:group|element).*circle/i);
    expect(assembled).toMatch(/count|represent|relative/i);
    expect(assembled).toMatch(/assembled|joined|bonded|connected/i);
    activate(view.one('[data-decomposer-transform]'));
    expect(description.textContent).toMatch(/separated|apart|decomposed/i);
    expect(description.textContent).toContain('H₂O');
    activate(view.one('[data-decomposer-motion-control]'));
    expect(description.textContent).toMatch(/paused|still/i);
    expect(view.one('[data-decomposer-atom-canvas]')).toBe(canvas);
  });

  it.each([['a', 'A', 'Water', 'Table Salt'], ['b', 'B', 'Table Salt', 'Water']])('names reaction slot %s and restores palette focus after removing its material', (key, label, material, retained) => {
    const view = mountTool(path, { tab: 'reactions', reactantA: 'Water', reactantB: 'Table Salt',
      quizScore: 2, huntScore: 7,
      activeReaction: { name: 'Dissolving Salt', desc: 'Salt dissolves in water.', equation: 'NaCl + H₂O', type: 'Dissolution' } });
    const remove = view.one('[data-decomposer-remove="' + key + '"]');
    expect(controlName(view, remove)).toBe('Remove Material ' + label + ': ' + material);
    const slot = remove.closest('[role="group"]');
    expect(slot).not.toBeNull();
    expect(slot.id).toBeTruthy();
    expect(controlName(view, slot)).toContain('Material ' + label);
    activate(remove);
    nextFrame();
    const paletteButton = view.one('[data-decomposer-reactant="' + material + '"]');
    expect(document.activeElement).toBe(paletteButton);
    expect(paletteButton.getAttribute('aria-pressed')).toBe('false');
    expect(view.state()[key === 'a' ? 'reactantA' : 'reactantB']).toBeNull();
    expect(view.state()[key === 'a' ? 'reactantB' : 'reactantA']).toBe(retained);
    expect(view.state()).toMatchObject({ activeReaction: null, quizScore: 2, huntScore: 7 });
  });
});
