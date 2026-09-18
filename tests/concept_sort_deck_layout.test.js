// Concept Sort unsorted deck — REAL-REACT mount.
//
// Two shipping defects are pinned here:
//   1. The deck is position:fixed, so it is out of the document flow. The
//      scrolling board above it reserved NO space, and the last row of sorted
//      cards rendered underneath the bar — the "I can't see what I sorted"
//      report. The board must carry a non-zero bottom reservation.
//   2. With many (or large) images there was no way to get the bar out of the
//      way. A collapse toggle hides the CARD ROW only: the heading, the
//      remaining count and the drop target all survive, so a collapsed deck
//      still tells you how much is left and still accepts a dropped card.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require2 = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require2(resolve(MODULES_DIR, 'react'));
const ReactDOMClient = require2(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require2(resolve(MODULES_DIR, 'react-dom/test-utils'));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
class RO { observe() {} unobserve() {} disconnect() {} }
const roots = [];

const DATA = {
  categories: [{ id: 'c1', label: 'Producers' }, { id: 'c2', label: 'Consumers' }],
  items: Array.from({ length: 12 }, (_, i) => ({
    id: 'i' + i,
    content: 'Item ' + i,
    categoryId: i % 2 ? 'c2' : 'c1',
    image: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
  })),
};

function mount(extra = {}) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  roots.push({ root, host });
  act(() => {
    root.render(React.createElement(window.AlloModules.ConceptSortGame, {
      data: DATA,
      onClose: () => {},
      playSound: () => {},
      onScoreUpdate: () => {},
      onGameComplete: () => {},
      imageScale: 2.0,
      ...extra,
    }));
  });
  return host;
}

const toggleOf = (host) => host.querySelector('[aria-controls="concept-sort-deck-cards"]');
const click = (el) => act(() => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });

beforeAll(() => {
  globalThis.ResizeObserver = RO;
  window.ResizeObserver = RO;
  window.React = React;
  globalThis.React = React;
  window.AlloModules = window.AlloModules || {};
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'games_module.js'), 'utf8'))();
});

afterEach(() => {
  while (roots.length) {
    const { root, host } = roots.pop();
    act(() => root.unmount());
    host.remove();
  }
});

describe('Concept Sort unsorted deck', () => {
  it('registers ConceptSortGame', () => {
    // React.memo() yields an object, not a function — assert it is renderable.
    const C = window.AlloModules.ConceptSortGame;
    expect(C).toBeTruthy();
    expect(['function', 'object']).toContain(typeof C);
  });

  it('reserves bottom space so the fixed deck cannot cover sorted cards', () => {
    const host = mount();
    const board = host.querySelector('.flex-grow.overflow-y-auto');
    expect(board).toBeTruthy();
    const reserved = parseInt(board.style.paddingBottom, 10);
    expect(Number.isFinite(reserved)).toBe(true);
    expect(reserved).toBeGreaterThan(0);
  });

  it('exposes a collapse toggle bound to the card row', () => {
    const host = mount();
    const btn = toggleOf(host);
    expect(btn).toBeTruthy();
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(host.querySelector('#concept-sort-deck-cards').hasAttribute('hidden')).toBe(false);
  });

  it('collapsing hides the cards but keeps the count and the drop target', () => {
    const host = mount();
    click(toggleOf(host));
    expect(host.querySelector('#concept-sort-deck-cards').hasAttribute('hidden')).toBe(true);
    expect(toggleOf(host).getAttribute('aria-expanded')).toBe('false');
    expect(host.textContent).toMatch(/\(12\)/);
    const deck = host.querySelector('[data-help-key="concept_sort_deck"]');
    expect(deck).toBeTruthy();
    expect(deck.hasAttribute('hidden')).toBe(false);
  });

  it('expanding restores the cards', () => {
    const host = mount();
    click(toggleOf(host));
    click(toggleOf(host));
    expect(host.querySelector('#concept-sort-deck-cards').hasAttribute('hidden')).toBe(false);
    expect(toggleOf(host).getAttribute('aria-expanded')).toBe('true');
  });
});
