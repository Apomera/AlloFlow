// Tab strip order and reading density (2026-11 review): the strip now follows the section menu's four
// groups, every tab has its own icon, and the longest reference reading is folded into native
// "Go deeper" disclosures so each tab opens on its simulator. Nothing is removed.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));
vi.setConfig({ testTimeout: 60000, hookTimeout: 60000 });
const previousActFlag = globalThis.IS_REACT_ACT_ENVIRONMENT;
const mounts = [];
beforeAll(() => { resetStemLab(); loadTool('stem_lab/stem_tool_astronomy.js', 'astronomy'); });
beforeEach(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
afterEach(() => { for (const view of mounts.splice(0)) view.unmount(); globalThis.IS_REACT_ACT_ENVIRONMENT = previousActFlag; });
const doc = state => new DOMParser().parseFromString(renderTool('astronomy', { astronomy: { observingList: [], ...state } }), 'text/html');

describe('tab strip', () => {
  const ORDER = ['tonight', 'observatory', 'skymap', 'constellations', 'meteors', 'moon', 'eclipses', 'exoplanets', 'seasons', 'hrDiagram', 'planets', 'stars', 'galaxies', 'indigenous', 'history', 'observe', 'quiz', 'print'];
  it('follows the same order as the grouped section menu', () => {
    const d = doc({ tab: 'tonight' });
    const strip = [...d.querySelectorAll('[role="tab"]')].map(tab => tab.id.replace('astronomy-tab-', ''));
    const menu = [...d.querySelectorAll('.astr-section-picker option')].map(option => option.value);
    expect(strip).toEqual(ORDER);
    expect(menu).toEqual(ORDER);
    expect(strip.indexOf('hrDiagram')).toBeLessThan(strip.indexOf('print'));
    expect(strip[strip.length - 1]).toBe('print');
  });
  it('gives every tab its own icon', () => {
    const icons = [...doc({ tab: 'tonight' }).querySelectorAll('[role="tab"]')].map(tab => tab.textContent.trim().split(' ')[0]);
    expect(icons).toHaveLength(ORDER.length);
    expect(new Set(icons).size).toBe(ORDER.length);
  });
});

describe('Go deeper disclosures', () => {
  const FOLDS = [
    { tab: 'galaxies', id: 'astronomy-deeper-galaxies', cards: ['💥 The Big Bang + cosmic microwave background', '🪜 The cosmic distance ladder — how do we know?'], outside: ['🌑 Dark matter + dark energy — the 95% we cannot see', '🌌 Our Milky Way'] },
    { tab: 'observe', id: 'astronomy-deeper-observe', cards: ['🌃 Light pollution + dark-sky preservation', '🛰️ The instruments of modern astronomy', '📷 Astrophotography — how to capture what you see', '⏱️ How we tell time — UTC, leap seconds, and GPS relativity', '🔭 Buying a telescope — the honest student/family guide'], outside: ['🔭 Tools for observing', '🌒 Light pollution: the Bortle scale'] },
    { tab: 'stars', id: 'astronomy-deeper-stars-life', cards: ['☁️ Nebulae + star formation — where stars are born', '☀️ Our Sun — closest, most important star', '💀 Compact objects — what stars become'], outside: ['🌟 The Hertzsprung-Russell Diagram', '🔆 The magnitude scale: how bright is bright?'] },
    { tab: 'stars', id: 'astronomy-deeper-stars-more', cards: ['☀️ Solar physics + space weather', '⚛️ Where every atom in your body came from', '🌠 Star clusters — open + globular', '🌟 Variable stars — the changeable sky'], outside: [] },
  ];
  for (const fold of FOLDS) {
    it(fold.id + ' holds exactly its ' + fold.cards.length + ' reading cards, closed, and nothing was removed', () => {
      const d = doc({ tab: fold.tab });
      const details = d.querySelector('details#' + fold.id);
      expect(details.hasAttribute('open')).toBe(false);
      const summary = details.querySelector(':scope > summary');
      expect(summary.textContent).toContain('Go deeper:');
      expect(summary.textContent).toContain('(' + fold.cards.length + ' topics)');
      const inside = [...details.querySelectorAll(':scope > div > [role="region"]')].map(card => card.getAttribute('aria-label'));
      expect(inside).toEqual(fold.cards);
      for (const title of fold.outside) {
        const card = [...d.querySelectorAll('[role="region"]')].find(region => region.getAttribute('aria-label') === title);
        expect(card, title).toBeTruthy();
        expect(card.closest('details.astr-go-deeper')).toBeNull();
      }
      for (const card of details.querySelectorAll(':scope > div > [role="region"]')) expect(card.textContent.length).toBeGreaterThan(400);
    });
  }
  it('leaves every simulator and control outside the folds (a still illustration may stay)', () => {
    for (const tab of ['galaxies', 'observe', 'stars']) {
      for (const details of doc({ tab }).querySelectorAll('details.astr-go-deeper')) {
        expect(details.querySelector('canvas, input[type="range"], input[type="number"], select')).toBeNull();
      }
    }
  });
  it('a jump link to something inside a fold opens the fold first', () => {
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    function App() { const [data, setData] = React.useState({ astronomy: { observingList: [], tab: 'stars' } }); return window.StemLab._registry.astronomy.render(makeCtx({ toolData: data, setToolData: setData })); }
    act(() => root.render(React.createElement(App)));
    mounts.push({ unmount() { act(() => root.unmount()); host.remove(); } });
    const details = host.querySelector('#astronomy-deeper-stars-more');
    const target = details.querySelector('[role="region"]'); target.id = 'fold-target-for-test';
    const link = document.createElement('a'); link.href = '#fold-target-for-test'; link.textContent = 'jump';
    host.querySelector('.selh-astronomy').appendChild(link);
    expect(details.open).toBe(false);
    act(() => { link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); });
    expect(details.open).toBe(true);
    expect(host.querySelector('#astronomy-deeper-stars-life').open).toBe(false);
  });
});
