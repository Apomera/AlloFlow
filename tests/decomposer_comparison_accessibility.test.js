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

function mountTool(path, seed = {}) {
  resetStemLab();
  const config = loadTool(path, 'decomposer');
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), award = vi.fn();
  let current, setCurrent;
  function Host() {
    const [data, setData] = React.useState({ decomposer: {
      tab: 'explore', selected: 'Water', materialsExplored: ['Water'], comparisons: 0, ...seed,
    } });
    current = data.decomposer;
    setCurrent = patch => setData(previous => ({ ...previous, decomposer: { ...previous.decomposer, ...patch } }));
    return config.render(makeCtx({ toolData: data, setToolData: setData, t: translate, awardXP: award }));
  }
  act(() => root.render(React.createElement(Host)));
  disposers.push(() => { act(() => root.unmount()); host.remove(); });
  return { host, award, state: () => current, patch: patch => act(() => setCurrent(patch)),
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
function select(view, name) {
  const control = view.one('#stem-decomposer-compare-select');
  control.focus();
  act(() => {
    control.value = name;
    control.dispatchEvent(new Event('change', { bubbles: true }));
  });
  return control;
}
function assertComparison(view, primary, comparison) {
  const control = view.one('#stem-decomposer-compare-select');
  expect(control.tagName).toBe('SELECT');
  expect(control.value).toBe(comparison);
  expect(control.selectedOptions).toHaveLength(1);
  expect(control.selectedOptions[0].textContent).toContain(comparison);
  expect([...control.options].some(option => option.value === primary)).toBe(false);
  expect(view.all('[data-decomposer-comparison-material]').map(card => card.getAttribute('data-decomposer-comparison-material'))).toEqual([primary, comparison]);
  const status = view.one('#stem-decomposer-comparison-status');
  expect(status.getAttribute('role')).toBe('status');
  expect(status.getAttribute('aria-live')).toBe('polite');
  expect(status.getAttribute('aria-atomic')).toBe('true');
  expect(status.textContent).toBe('Comparing ' + primary + ' with ' + comparison + '.');
  expect(control.getAttribute('aria-describedby').split(/\s+/)).toContain(status.id);
  return control;
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  frames = [];
  vi.stubGlobal('requestAnimationFrame', callback => { frames.push(callback); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const gradient = { addColorStop() {} };
  const context = new Proxy({ createLinearGradient: () => gradient, createRadialGradient: () => gradient,
    measureText: text => ({ width: String(text).length * 6 }) }, { get: (target, key) => key in target ? target[key] : () => {} });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
});
afterEach(() => {
  disposers.splice(0).forEach(dispose => dispose());
  frames.splice(0).forEach(callback => callback(16));
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe.each(paths)('Decomposer comparison accessibility: %s', path => {
  it('opens Table Salt with a distinct valid comparison and focuses the matching native control', () => {
    const view = mountTool(path, { selected: 'Table Salt', materialsExplored: ['Table Salt'] });
    activate(view.one('#stem-decomposer-compare-open')); nextFrame();
    const control = assertComparison(view, 'Table Salt', 'Water');
    expect(document.activeElement).toBe(control);
    expect(view.state()).toMatchObject({ compareMode: true, compareTo: 'Water', comparisons: 0 });
    expect(view.award).not.toHaveBeenCalled();
  });

  it('swaps the previous primary into the comparison when its partner becomes the primary', () => {
    const view = mountTool(path, { compareMode: true, compareTo: 'Table Salt' });
    const chip = view.all('[data-decomposer-material]').find(button => button.getAttribute('data-decomposer-material') === 'Table Salt');
    activate(chip); nextFrame();
    assertComparison(view, 'Table Salt', 'Water');
    expect(view.state()).toMatchObject({ selected: 'Table Salt', compareTo: 'Water', comparisons: 0 });
    expect(document.activeElement).toBe(chip);
    expect(chip.getAttribute('aria-pressed')).toBe('true');
    expect(view.award).not.toHaveBeenCalled();
  });

  it('preserves an already distinct partner when changing the primary without stealing focus', () => {
    const view = mountTool(path, { compareMode: true, compareTo: 'Methane' });
    const chip = view.all('[data-decomposer-material]').find(button => button.getAttribute('data-decomposer-material') === 'Table Salt');
    activate(chip); nextFrame();
    const control = assertComparison(view, 'Table Salt', 'Methane');
    expect(document.activeElement).toBe(chip);
    expect(view.state()).toMatchObject({ compareTo: 'Methane', comparisons: 0 });
    control.focus(); view.patch({ _factIdx: 1 }); nextFrame();
    expect(view.one('#stem-decomposer-compare-select')).toBe(control);
    expect(document.activeElement).toBe(control);
    expect(view.award).not.toHaveBeenCalled();
  });

  it.each([
    ['Table Salt', 'Table Salt', 'Water'],
    ['Water', 'Unknown saved material', 'Table Salt'],
    ['Water', undefined, 'Table Salt'],
    ['Table Salt', undefined, 'Water'],
  ])('restores %s / %s to a coherent control and card pair without automatic credit', (primary, stored, expected) => {
    const view = mountTool(path, { selected: primary, materialsExplored: [primary], compareMode: true, compareTo: stored });
    assertComparison(view, primary, expected);
    expect(view.state().comparisons).toBe(0);
    expect(view.award).not.toHaveBeenCalled();
    const tab = view.one('#stem-decomposer-tab-explore');
    tab.focus(); view.patch({ _factIdx: 1 }); nextFrame();
    assertComparison(view, primary, expected);
    expect(document.activeElement).toBe(tab);
    expect(view.state().comparisons).toBe(0);
    expect(view.award).not.toHaveBeenCalled();
  });

  it('counts a genuine comparison selection once and updates the described pair while retaining control focus', () => {
    const view = mountTool(path, { compareMode: true, compareTo: 'Table Salt', comparisons: 1 });
    const status = view.one('#stem-decomposer-comparison-status');
    const control = select(view, 'Methane'); nextFrame();
    assertComparison(view, 'Water', 'Methane');
    expect(view.state()).toMatchObject({ compareTo: 'Methane', comparisons: 2 });
    expect(view.one('#stem-decomposer-comparison-status')).toBe(status);
    expect(document.activeElement).toBe(control);
  });

  it('returns focus on close and preserves a distinct previous comparison on reopen', () => {
    const view = mountTool(path, { compareMode: true, compareTo: 'Methane' });
    const control = view.one('#stem-decomposer-compare-select');
    const close = view.all('button').find(button => button.getAttribute('aria-label') === 'Close');
    activate(close); nextFrame();
    const open = view.one('#stem-decomposer-compare-open');
    expect(document.activeElement).toBe(open);
    expect(view.one('#stem-decomposer-comparison-status')).toBeNull();
    activate(open); nextFrame();
    const reopened = assertComparison(view, 'Water', 'Methane');
    expect(reopened).not.toBe(control);
    expect(document.activeElement).toBe(reopened);
    expect(view.state()).toMatchObject({ compareTo: 'Methane', comparisons: 0 });
  });

  it('uses a labelled native selector and leaves its navigation keys available to the browser', () => {
    const view = mountTool(path, { compareMode: true, compareTo: 'Table Salt' });
    const control = assertComparison(view, 'Water', 'Table Salt');
    expect(control.getAttribute('aria-label')).toBe('Compare with material');
    control.focus();
    for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'End']) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      act(() => control.dispatchEvent(event));
      expect(event.defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(control);
    }
    expect(view.state().comparisons).toBe(0);
  });
});
