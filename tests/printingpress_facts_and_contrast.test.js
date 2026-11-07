// Printing Press, pass 3 (2026-11-03): content corrections, the recalibrated
// alloy model, and the app's high-contrast theme.
//
// A six-way fact-check found ~350 claims a student would learn wrong. Some
// were arithmetic the tool contradicted itself on (a hand press pulls ~250
// impressions an HOUR, not a day; an octavo sheet is 16 pages). Some were
// anachronisms (italic type and the Aldine Press in a 1455 Mainz shop). The
// Alloy Designer called 54/28/18 "historical" with tin and antimony swapped,
// and its own model rated every real type metal below "Excellent" (only a
// 0%-lead, 78%-tin mix scored that high). The real-browser contrast check is
// tests/e2e/115-printingpress-views-a11y.spec.ts; this file pins the opt-in.
// PP_SRC points the suite at another copy (used to confirm it fails pre-fix).
import { describe, it, expect, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const MODULES_DIR = ['desktop/web-app/node_modules', 'node_modules']
  .map((p) => resolve(process.cwd(), p))
  .find((p) => existsSync(resolve(p, 'react')));
const React = require(resolve(MODULES_DIR, 'react'));
const ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require(resolve(MODULES_DIR, 'react-dom/test-utils'));

const SOURCE = process.env.PP_SRC || 'stem_lab/stem_tool_printingpress.js';
const SRC = readFileSync(resolve(process.cwd(), SOURCE), 'utf8');
const noop = () => {};
let mounted = null;

function loadTool() {
  const reg = {
    _registry: {}, _order: [],
    registerTool(id, config) { config.id = id; this._registry[id] = config; this._order.push(id); },
    isRegistered(id) { return !!this._registry[id]; },
    getRegisteredTools() { return this._order.map((id) => this._registry[id]); },
    renderTool(id, ctx) { const t = this._registry[id]; return t && t.render ? t.render(ctx) : null; },
  };
  window.StemLab = reg;
  globalThis.StemLab = reg;
  if (!window.React) window.React = React;
  // eslint-disable-next-line no-new-func
  new Function(SRC)();
  return reg._registry.printingPress;
}

function mount(initial, extraCtx) {
  const cfg = loadTool();
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  function Harness() {
    const [toolData, setToolData] = React.useState({ printingPress: initial || {} });
    const update = (toolId, key, val) => setToolData((prev) => ({ ...prev, [toolId]: { ...(prev[toolId] || {}), [key]: val } }));
    const updateMulti = (toolId, obj) => setToolData((prev) => ({ ...prev, [toolId]: { ...(prev[toolId] || {}), ...obj } }));
    return cfg.render(Object.assign({
      React, toolData, setToolData, update, updateMulti, addToast: noop, announceToSR: noop,
      awardXP: noop, callGemini: null, gradeLevel: '7th Grade', t: (k, f) => f || k,
      icons: new Proxy({}, { get: () => () => null }),
    }, extraCtx || {}));
  }
  act(() => { root.render(React.createElement(Harness)); });
  mounted = { host, root };
  return host;
}

afterEach(() => {
  if (mounted) { act(() => mounted.root.unmount()); mounted.host.remove(); mounted = null; }
});

function setSlider(host, label, value) {
  const input = host.querySelector('input[type="range"][aria-label="' + label + ' percentage"]');
  expect(input, label + ' slider').toBeTruthy();
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  act(() => { setter.call(input, String(value)); input.dispatchEvent(new window.Event('input', { bubbles: true })); });
}
const has = (s) => SRC.includes(s);

describe('Printing Press content corrections', () => {
  it('teaches hand-press speed per hour, consistently', () => {
    expect(/impressions (per|a) day/i.test(SRC), 'no "250 impressions a day"').toBe(false);
    expect(has('250/day')).toBe(false);
    expect(has('~250 impressions per hour')).toBe(true);
  });

  it('says compositors set type left to right, as the composing-stick game itself works', () => {
    // "right-to-left" may appear only as the misconception, never as the explanation.
    expect(/right-to-left in the stick|right-to-left in a composing stick|Right-to-left, mirror-reversed, so when printed|right: 'Type was set right-to-left|composing stick — right-to-left/.test(SRC)).toBe(false);
    expect(has('Left-to-right, with each sort upside down')).toBe(true);
  });

  it('dates the 1517 printings of the Theses and the fate of the Hussites correctly', () => {
    expect(has('locally suppressed')).toBe(false);
    expect(has("'Three: Leipzig, Nuremberg and Basel'")).toBe(true);
  });

  it('keeps a 1455 shop free of later inventions', () => {
    for (const later of ['Aldine Press in Venice', 'foremost italic shop in Mainz', 'flee to a Protestant city', 'Guild of Printers']) {
      expect(has(later), later).toBe(false);
    }
  });

  it('drops invented or misattributed names and dates', () => {
    for (const wrong of ["The Sheppard\\'s Bible", 'Mrs. Doubtfire', 'Bass family', 'Designed by Henry Cole', 'Univeral mainframe',
      'mainemmorynetwork', 'Harvard (1638)', 'in Antwerp (1536)', "King Bidgood\\'s in the Bathtub illustrator", '1500-year cat-and-mouse',
      'Desiderius Erasmus, ~1500', 'Korea casting metal type 78 years', 'Tin (~28%)']) {
      expect(has(wrong), wrong).toBe(false);
    }
    expect(has('Towle-Warren family')).toBe(true);
    expect(has('Vilvoorde')).toBe(true);
  });
});

describe('Alloy Designer', () => {
  const verdict = (host) => {
    const labels = ['Excellent', 'Acceptable', 'Marginal', 'Too soft', 'Costly tin', 'Failed cast', 'Brittle', 'Expensive and impractical', 'Mold fill problem'];
    const text = host.textContent;
    return labels.filter((l) => text.includes(l));
  };

  it('starts at real foundry type (54 lead / 18 tin / 28 antimony) and rates it excellent', () => {
    const host = mount({ view: 'castingType' });
    expect(host.textContent).toContain('Tin (~18%)');
    expect(host.textContent).toContain('Antimony (~28%)');
    expect(host.textContent).toContain('Reset to foundry type (54 lead / 18 tin / 28 antimony)');
    expect(verdict(host)).toContain('Excellent');
  });

  it('ranks Monotype metal workable and a tin-rich mix as too costly', () => {
    const host = mount({ view: 'castingType' });
    setSlider(host, 'Lead (Pb)', 75);
    setSlider(host, 'Tin (Sn)', 8);
    expect(verdict(host)).toContain('Acceptable');
    expect(verdict(host)).not.toContain('Excellent');
    setSlider(host, 'Lead (Pb)', 30);
    setSlider(host, 'Tin (Sn)', 50);
    expect(verdict(host)).toContain('Costly tin');
  });
});

describe('High-contrast theme', () => {
  it('marks the tool root and installs the scoped stylesheet only for the contrast theme', () => {
    let host = mount({ view: 'menu' }, { isContrast: true, theme: 'contrast' });
    expect(host.querySelectorAll('[data-pp-contrast="true"]').length).toBe(1);
    const css = document.getElementById('pp-contrast-css');
    expect(css && css.textContent).toContain('[aria-pressed="true"]');
    act(() => mounted.root.unmount()); mounted.host.remove(); mounted = null;
    host = mount({ view: 'menu' }, { isDark: false, theme: 'light' });
    expect(host.querySelectorAll('[data-pp-contrast]').length).toBe(0);
  });

  it('keeps the paper-contrast sample in its own colours', () => {
    const host = mount({ view: 'pressInquiry' }, { isContrast: true, theme: 'contrast' });
    const sample = host.querySelector('[data-pp-keep-color]');
    expect(sample, 'the legibility sample opts out of the flattening').toBeTruthy();
    expect(sample.style.getPropertyValue('--pp-fg')).toBe('#000');
  });
});

// Pass 4: the Linotype keyboard, the nick game, the economics model, Europe on
// the global timeline, and Maine businesses that could not be verified.
describe('Printing Press pass 4 corrections', () => {
  it('draws the Linotype lowercase keys as columns, ETAOIN down the first one', () => {
    const host = mount({ view: 'beforeAfter' });
    const kb = host.querySelector('[role="img"][aria-label^="Linotype lowercase keys"]');
    expect(kb, 'keyboard is one labelled image').toBeTruthy();
    const keys = Array.from(kb.children).map((c) => c.textContent);
    expect(keys.slice(0, 4).join('')).toBe('escv');
    expect([0, 4, 8, 12, 16, 20].map((i) => keys[i]).join('')).toBe('etaoin');
    expect([1, 5, 9, 13, 17, 21].map((i) => keys[i]).join('')).toBe('shrdlu');
  });

  it('gives every wrong sort in the nick game a real meaning', () => {
    const host = mount({ view: 'castingType' });
    const labels = Array.from(host.querySelectorAll('button[aria-label^="Sort "]')).map((b) => b.getAttribute('aria-label'));
    expect(labels.length).toBe(4);
    expect(labels.some((l) => /near top|absent/.test(l)), 'no "nick near top = upside down"').toBe(false);
    expect(labels.some((l) => l.includes('high on the body'))).toBe(true);
    expect(host.textContent).toContain('a sort from the wrong font stood out');
  });

  it('models a one-time setup plus a per-copy cost, so long runs pay and one copy does not', () => {
    const host = mount({ view: 'economics' });
    const slider = host.querySelector('#pp-copies');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    const set = (n) => act(() => { setter.call(slider, String(n)); slider.dispatchEvent(new window.Event('input', { bubbles: true })); });
    set(1);
    expect(host.textContent).toContain('hand-copying is cheaper');
    set(180);
    expect(host.textContent).toContain('roughly 5.1 times faster');
    set(1000);
    expect(host.textContent).toContain('roughly 7.5 times faster');
    expect(host.textContent).toContain('break-even is about 16 copies');
    expect(has('50-100 copies'), 'quizzes agree with the calculator').toBe(false);
  });

  it('puts Gutenberg in a Europe region the timeline can reach by keyboard', () => {
    const host = mount({ view: 'globalPrinting' });
    const click = (el) => act(() => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
    click(Array.from(host.querySelectorAll('button')).find((b) => b.textContent.includes('Global timeline')));
    const ev = Array.from(host.querySelectorAll('button')).find((b) => b.textContent.includes('Gutenberg Bible (B42) printed'));
    expect(ev, 'timeline events are buttons').toBeTruthy();
    click(ev);
    expect(host.textContent).toContain('Flagship: 1455 — Gutenberg Bible (Mainz)');
    expect(host.textContent).toContain('Europe is the story the rest of this tool tells');
  });

  it('lists only Maine print businesses that are on record', () => {
    for (const unverified of ['Anvil Press Poetry (Brunswick)', 'Curlew Press', 'Saltbox Press', 'Mary Beauregard', 'Centro Stampa']) {
      expect(has(unverified), unverified).toBe(false);
    }
    expect(has('Wolfe Editions (Portland)')).toBe(true);
  });
});
