// Printing Press core modules: regressions for the 2026-11-04 independent audits of
// Set Type, Casting, Economics, Before & After, Typography, People, Broadside, Same Fears,
// Day in the Shop, the cumulative quiz, the Apprentice Journey and the Type Foundry.
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
const noop = () => {};
let mounted = null;

function mount(initial) {
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
  new Function(readFileSync(resolve(process.cwd(), SOURCE), 'utf8'))();
  const cfg = reg._registry.printingPress;
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  function Harness() {
    const [toolData, setToolData] = React.useState({ printingPress: initial || {} });
    const update = (toolId, key, val) => setToolData((prev) => ({ ...prev, [toolId]: { ...(prev[toolId] || {}), [key]: val } }));
    const updateMulti = (toolId, obj) => setToolData((prev) => ({ ...prev, [toolId]: { ...(prev[toolId] || {}), ...obj } }));
    return cfg.render({ React, toolData, setToolData, update, updateMulti, addToast: noop, announceToSR: noop,
      awardXP: noop, callGemini: null, gradeLevel: '7th Grade', t: (k, f) => f || k, icons: new Proxy({}, { get: () => () => null }) });
  }
  act(() => { root.render(React.createElement(Harness)); });
  mounted = { host, root };
  return host;
}
afterEach(() => { if (mounted) { act(() => mounted.root.unmount()); mounted.host.remove(); mounted = null; } });

const lab = (host) => {
  const el = host.querySelector('.printingpress-lab');
  expect(el, 'the module shows its lab').toBeTruthy();
  return el;
};
const btns = (scope) => Array.from(scope.querySelectorAll('button'));
const byText = (scope, text) => btns(scope).find((b) => b.textContent.includes(text));
const click = (el) => act(() => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); });
function slide(host, id, value) {
  const input = host.querySelector('#' + id);
  expect(input, id).toBeTruthy();
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  act(() => { setter.call(input, String(value)); input.dispatchEvent(new window.Event('input', { bubbles: true })); });
}

const src = () => readFileSync(resolve(process.cwd(), SOURCE), 'utf8');
const setRange = (input, v) => act(() => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, String(v)); input.dispatchEvent(new window.Event('input', { bubbles: true })); });

describe('Set Type', () => {
  it('gives every challenge exactly one slot per character, so each can be solved', () => {
    const s = src();
    const start = s.indexOf('var CHALLENGES = [');
    const block = s.slice(start, s.indexOf('\n        ];', start));
    const rows = [...block.matchAll(/phrase: ('(?:[^'\\]|\\.)*'), slotCount: (\d+)/g)];
    expect(rows.length).toBeGreaterThanOrEqual(5);
    rows.forEach((m) => expect(Function('return ' + m[1])().length, m[1]).toBe(Number(m[2])));
    expect(block).not.toMatch(/phrase: 'F\x01/);
  });
  it('resets the composing stick to the challenge length, not a fixed 8', () => {
    expect(src()).not.toContain("setSt({ slots: ['', '', '', '', '', '', '', ''], picked: null });");
  });
});

describe('Casting Type', () => {
  it('keeps the alloy at exactly 100% when antimony moves', () => {
    const host = mount({ view: 'castingType' });
    setRange(host.querySelector('input[aria-label="Antimony (Sb) percentage"]'), 30);
    const sum = ['Lead (Pb)', 'Tin (Sn)', 'Antimony (Sb)'].reduce((t, n) => t + parseInt(host.querySelector('input[aria-label="' + n + ' percentage"]').getAttribute('aria-valuetext'), 10), 0);
    expect(sum).toBe(100);
  });
  it('grades a 15,000-sort guess as within an order of magnitude, and allows another guess', () => {
    const host = mount({ view: 'castingType' });
    const guess = host.querySelector('#pp-sort-guess');
    setRange(guess, 15000);
    click(byText(host, 'Reveal the answer'));
    expect(host.textContent).toContain('low, but within an order of magnitude');
    expect(guess.disabled).toBe(false);
    setRange(guess, 95000);
    expect(byText(host, 'Reveal the answer')).toBeTruthy();
  });
  it('keeps focus on the page when the pressed button disappears', async () => {
    const host = mount({ view: 'castingType' });
    const reveal = byText(host, 'Reveal the answer');
    reveal.focus();
    click(reveal);
    await act(() => new Promise((r) => setTimeout(r, 120)));
    expect(document.activeElement).not.toBe(document.body);
    expect(host.contains(document.activeElement)).toBe(true);
  });
});

describe('Economics', () => {
  it('uses the singular for one copy', () => {
    const host = mount({ view: 'economics' });
    setRange(host.querySelector('#pp-copies'), 1);
    expect(host.textContent).toContain('1 scribe working');
    expect(host.textContent).not.toContain('1 scribes');
  });
});

describe('Facts and keys fixed in the audits', () => {
  it('matches the printers to their mottos and quotes Paine correctly', () => {
    const s = src();
    const motto = /q: __alloT\('[^']*', 'Pick a motto:'\),\s*opts: \[\s*__alloT\('[^']*', ('(?:[^'\\]|\\.)*')\),\s*__alloT\('[^']*', ('(?:[^'\\]|\\.)*')\)/.exec(s);
    expect(Function('return ' + motto[2])()).toBe('Make haste slowly');   // index 1 = Aldus
    expect(s).toContain('shrink from the service\\nof their country.');
    expect(s).not.toContain('of his country.');
    expect(s).not.toContain("'About 150,000'");
    expect(s).not.toContain('dropped the second E in FOREVER');
    expect(s).not.toContain('Strasbourg shop trade work');
    expect(s).not.toContain('dies in 1502');
    expect(s).not.toContain("year: '1500',\n");
  });
  it('lists the timeline in date order', () => {
    const s = src();
    const start = s.indexOf('var PRINT_EVENTS = [');
    const years = [...s.slice(start, s.indexOf('\n        ];', start)).matchAll(/\{ year: (\d+),/g)].map((m) => Number(m[1]));
    expect(years).toEqual([...years].sort((a, b) => a - b));
  });
});

describe('Type Foundry', () => {
  it('classifies its own Helvetica and Garamond presets as their families', () => {
    const host = mount({ view: 'typeFoundry' });
    click(byText(host, 'Type designer'));
    click(byText(host, 'Helvetica-like (1957)'));
    expect(host.textContent).toContain('Neo-grotesque sans');
    click(byText(host, 'Garamond-like (1530)'));
    expect(host.textContent).toContain('Old Style (Garamond');
    expect(host.textContent).toContain('(old style)');
    expect(host.textContent).not.toContain('(transitional)');
  });
});

// Pass 20: what axe cannot see, plus search and quiz retakes.
describe('Deep WCAG fixes', () => {
  it('gives every page one h1 and never skips a heading level', () => {
    const SOURCE_VIEWS = [...src().matchAll(/view === '([A-Za-z0-9]+)'\)\s+content = h\(_ViewWrapper/g)].map((m) => m[1]);
    expect(SOURCE_VIEWS.length).toBeGreaterThanOrEqual(100);
    const problems = [];
    SOURCE_VIEWS.forEach((v) => {
      const host = mount({ view: v });
      const levels = Array.from(host.querySelectorAll('h1,h2,h3,h4,h5,h6')).map((x) => Number(x.tagName[1]));
      if (levels.filter((n) => n === 1).length !== 1) problems.push(v + ': ' + levels.join(''));
      levels.forEach((n, i) => { if (i && n > levels[i - 1] + 1) problems.push(v + ' skip: ' + levels.join('')); });
      act(() => mounted.root.unmount()); mounted.host.remove(); mounted = null;
    });
    expect(problems).toEqual([]);
  }, 180000);
  it('keeps a drop-capped paragraph as one unbroken text run', () => {
    const host = mount({ view: 'genreRomance' });
    const p = host.querySelector('p.pp-dropcap');
    expect(p).toBeTruthy();
    expect(p.textContent.startsWith('Romance is the largest')).toBe(true);
    expect(p.firstChild.nodeType).toBe(3);
  });
  it('moves focus to the new page title when navigating', async () => {
    const host = mount({});
    click(byText(host, 'Next lab to try:'));
    await act(() => new Promise((r) => setTimeout(r, 120)));
    expect(document.activeElement.tagName).toBe('H1');
    expect(host.contains(document.activeElement)).toBe(true);
  });
  it('marks Latin as Latin and shows motto meanings without a hover', () => {
    const host = mount({ view: 'bookplates' });
    expect(host.querySelector('.printingpress-lab button span[lang="la"]').textContent).toBe('Festina lente');
    const s = src();
    expect(s.includes('title: m.en,')).toBe(false);
    expect(s.includes('ease-in-out infinite reverse')).toBe(false);
  });
});

describe('Menu search and jump links', () => {
  const search = (host, v) => typeIn(host.querySelector('#pp-menu-search'), v);
  const typeIn = (el, v) => act(() => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new window.Event('input', { bubbles: true })); });
  const tiles = (host) => Array.from(host.querySelectorAll('.printingpress-tile'));
  it('filters all modules, reports the count, keeps focus, and clears', () => {
    const host = mount({});
    const box = host.querySelector('#pp-menu-search');
    box.focus();
    search(host, 'tarot');
    expect(tiles(host).map((t) => t.getAttribute('aria-label'))).toEqual([expect.stringMatching(/^Tarot/)]);
    expect(host.querySelector('[role="status"]#pp-menu-search-status').textContent).toBe('1 module matches "tarot".');
    expect(document.activeElement).toBe(box);
    search(host, 'zzzznothing');
    expect(tiles(host)).toHaveLength(0);
    expect(host.textContent).toContain('No modules match "zzzznothing".');
    click(byText(host, 'Clear search'));
    expect(tiles(host).length).toBeGreaterThan(10);
  });
  it('clears with Escape and matches every word', () => {
    const host = mount({});
    search(host, 'paper maine');
    const n = tiles(host).length;
    expect(n).toBeGreaterThan(0);
    tiles(host).forEach((t) => expect(t.textContent.toLowerCase()).toMatch(/paper[\s\S]*maine|maine[\s\S]*paper/));
    act(() => { host.querySelector('#pp-menu-search').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    expect(host.querySelector('#pp-menu-search').value).toBe('');
  });
  it('jumps to a section heading', () => {
    const host = mount({});
    const nav = host.querySelector('nav[aria-label="Jump to a section of the menu"]');
    expect(nav).toBeTruthy();
    window.HTMLElement.prototype.scrollIntoView = () => {};
    click(btns(nav)[1]);
    expect(document.activeElement.tagName).toBe('H2');
  });
});

describe('Graphics that blended into their background', () => {
  it("prints the printer's mark preview in a dark ink on parchment", () => {
    const s = src();
    expect(s.includes('sym.svg(fin.ink)')).toBe(true);
    expect(s.includes("color: T.accentHi, ink: '#7d5a0a'")).toBe(true);
  });
  it('hides the progress card and dashboard during a search so results come first', () => {
    const host = mount({});
    expect(host.querySelector('[data-printingpress-command]')).toBeTruthy();
    const box = host.querySelector('#pp-menu-search');
    act(() => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(box, 'maps'); box.dispatchEvent(new window.Event('input', { bubbles: true })); });
    expect(host.querySelector('[data-printingpress-command]')).toBeNull();
    expect(host.querySelector('h1')).toBeTruthy();
  });
});

describe('Serif styles are drawn as named', () => {
  it('draws different shapes for each style', () => {
    const host = mount({ view: 'typeFoundry' });
    click(byText(host, 'Type designer'));
    const shape = () => { const el = host.querySelector('[data-serif]'); return el ? el.tagName.toLowerCase() + ':' + el.getAttribute('data-serif') : null; };
    expect(shape()).toBe('path:bracketed');
    expect(host.querySelector('[data-serif]').getAttribute('fill')).toBe('#1a1410');   // cream on cream before
    const pick = (t) => click(btns(host).find((b) => b.textContent.toLowerCase().includes(t)));
    pick('wedge');
    expect(shape()).toBe('polygon:wedge');
    pick('hairline');
    expect(shape()).toBe('rect:hairline');
    const hairH = Number(host.querySelector('[data-serif]').getAttribute('height'));
    pick('slab');
    expect(shape()).toBe('rect:slab');
    expect(Number(host.querySelector('[data-serif]').getAttribute('height'))).toBeGreaterThan(hairH * 2);
  });
});

describe('Cumulative quiz retake', () => {
  const MARK = '✓ Correct answer: ';
  const options = (host) => btns(host).filter((b) => b.getAttribute('data-pp-quiz-option') === 'true');
  const leave = () => { act(() => mounted.root.unmount()); mounted.host.remove(); mounted = null; };
  it('moves the answers on a retake, and the moved key still scores', () => {
    let host = mount({ view: 'cumulative' });
    const before = options(host).map((b) => b.textContent);
    expect(before.length).toBe(4);
    click(options(host)[0]);   // any answer reveals the key
    const key = options(host).find((b) => b.textContent.includes(MARK)).textContent.split(MARK)[1];
    leave();
    host = mount({ view: 'cumulative', bigQuizState: { idx: 16, score: 16, answered: false, lastChoice: null, picks: {} } });
    click(byText(host, 'Retake quiz'));
    const after = options(host).map((b) => b.textContent);
    expect(after).not.toEqual(before);
    const hit = (text) => before.some((b) => b.includes(text)) && after.some((a) => a.includes(text));
    expect(hit(key)).toBe(true);
    click(options(host).find((b) => b.textContent.includes(key)));
    expect(options(host).find((b) => b.textContent.includes(key)).textContent).toContain(MARK);
  });
});
