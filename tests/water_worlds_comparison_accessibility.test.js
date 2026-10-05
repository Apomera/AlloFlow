import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
// Run the same mounted regression against the captured source before the fix.
const viewPath = process.env.WATER_WORLDS_VIEW_SOURCE || 'stem_lab/water_worlds_view.js';
let container, root, K, saved, latest;

function load(path) { new Function('window', readFileSync(path, 'utf8'))(window); }
function comparisonButtons() { return [...container.querySelectorAll('.ww-observation-card button[aria-pressed]')]; }
function click(button) { button.focus(); act(() => button.click()); }
function expectNamed(button, pressed, number) {
  // This button contains plain text and an accessible visually hidden number.
  // aria-label overrides contents in the baseline; otherwise native name is contents.
  const name = button.getAttribute('aria-label') || button.textContent.trim();
  expect(name.toLowerCase()).toContain(button.firstChild.textContent.trim().toLowerCase());
  expect(name).toContain('observation ' + number);
  expect(button.getAttribute('aria-pressed')).toBe(String(pressed));
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  // jsdom has no drawing context; these checks exercise native DOM controls.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  load('stem_lab/water_worlds_kernel.js');
  load(viewPath);
  K = window.WaterWorldsKernel;
  saved = K.begin(K.initial(), false);
  for (let i = 0; i < 3; i++) {
    saved = K.advance(saved, 5);
    saved = K.observe(saved, undefined, 'Recorded note ' + (i + 1));
  }
  saved = { ...saved, running: false };
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(React.createElement(window.WaterWorldsView, {
    React, saved, onSave: state => { latest = state; }
  })));
});

afterEach(() => {
  if (root) act(() => root.unmount());
  container?.remove();
  document.getElementById('water-worlds-style')?.remove();
  vi.restoreAllMocks();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('Water Worlds saved-observation comparison access', () => {
  it('includes the visible label in the accessible name before and after selection', () => {
    const buttons = comparisonButtons();
    expect(buttons).toHaveLength(3);
    buttons.forEach((button, i) => expectNamed(button, false, i + 1));
    click(buttons[0]);
    expectNamed(buttons[0], true, 1);
    expect(document.activeElement).toBe(buttons[0]);
    click(buttons[1]);
    expectNamed(buttons[1], true, 2);
    expect(document.activeElement).toBe(buttons[1]);
    expect(buttons[2].disabled).toBe(true);
    expect(container.querySelector('.ww-observation-comparison')).not.toBeNull();
  });

  it('keeps focus and recorded evidence during repeated deselection and reselection', () => {
    const before = JSON.stringify(K.evidence(latest));
    const buttons = comparisonButtons();
    click(buttons[0]);
    click(buttons[1]);
    for (let repeat = 0; repeat < 3; repeat++) {
      click(buttons[0]);
      expectNamed(buttons[0], false, 1);
      expect(document.activeElement).toBe(buttons[0]);
      expect(buttons[2].disabled).toBe(false);
      expect(container.querySelector('.ww-observation-comparison')).toBeNull();
      click(buttons[0]);
      expectNamed(buttons[0], true, 1);
      expect(document.activeElement).toBe(buttons[0]);
      expect(buttons[2].disabled).toBe(true);
    }
    click(buttons[0]);
    click(buttons[2]);
    expectNamed(buttons[2], true, 3);
    expect(document.activeElement).toBe(buttons[2]);
    expect(buttons[0].disabled).toBe(true);
    expect(JSON.stringify(K.evidence(latest))).toBe(before);
  });
});