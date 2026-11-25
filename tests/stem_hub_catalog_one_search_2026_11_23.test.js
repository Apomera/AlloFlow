// STEM Lab hub catalog, 2026-11-23 (UI complexity review, S5).
//
// The catalog stacked two text boxes that did one job: "Search N tools..." and, under
// the Recent row, "What do you want to learn about?" with a "Suggest tools" button (the
// AI picker). They are one field now: the search field stays the field and "Suggest
// tools" is a button attached to it that asks the picker about the words already typed.
// These tests mount the real hub and check that every state the old box had still has
// a home (thinking, a message, picks, no text, AI off), that the picker is also offered
// when no tile matches, and that the tile entrance stagger is capped.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
// ALLO_STEM_HUB_CANDIDATE: point the same tests at another copy of the hub (used once to
// show they fail against the copy from before this change).
const HUB = process.env.ALLO_STEM_HUB_CANDIDATE || 'stem_lab/stem_lab_module.js';

let React;
let ReactDOMClient;
let act;
let StemLabModal;
let host;
let root;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = React);
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }));
  if (!window.HTMLElement.prototype.scrollTo) window.HTMLElement.prototype.scrollTo = () => {};
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule(HUB);
  StemLabModal = window.AlloModules.StemLabModal || window.AlloModules.StemLab;
});

afterEach(async () => {
  if (root) { await act(async () => root.unmount()); root = null; }
  if (host) { host.remove(); host = null; }
  document.body.innerHTML = '';
  delete window.__alloFocusTrapStack;
  delete window.__alloScrollLockState;
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

async function mountHub(extra = {}) {
  const IconStub = () => null;
  function Wrapper() {
    const [tool, setTool] = React.useState(null);
    const [data, setData] = React.useState({});
    const base = {
      React,
      showStemLab: true,
      setShowStemLab: () => {},
      stemLabTab: 'explore',
      setStemLabTab: () => {},
      stemLabTool: tool,
      setStemLabTool: setTool,
      labToolData: data,
      setLabToolData: setData,
      toolSnapshots: [],
      onClose: () => {},
      addToast: () => {},
      announceToSR: () => {},
      isTeacherMode: false,
      theme: 'light',
      callGemini: null,
      callTTS: null,
      t: (k, fb) => (typeof fb === 'string' ? fb : k),
      ...extra,
    };
    const props = new Proxy(base, {
      get(target, key) {
        if (key in target) return target[key];
        if (typeof key === 'string' && /^[A-Z]/.test(key)) return IconStub;
        if (typeof key === 'string' && /^(set|handle|on)[A-Z]/.test(key)) return () => {};
        return undefined;
      },
    });
    return StemLabModal(props);
  }
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => { root.render(React.createElement(Wrapper)); });
}

async function type(element, value) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value').set.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
async function click(element) {
  await act(async () => { element.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
}

const search = () => host.querySelector('input[aria-label="Search STEAM Lab tools"]');
const suggest = () => host.querySelector('button[data-stem-suggest-tools="true"]');
const panel = () => host.querySelector('#stem-tool-suggest-panel');
const picks = () => [...host.querySelectorAll('#stem-tool-suggest-panel .stem-tool-ai-suggestion')];
const cards = () => [...host.querySelectorAll('.stem-tool-grid [data-stem-tool-id]')];

describe('STEM hub catalog: one field for search and for the AI picker', () => {
  it('has one text field, with Suggest tools attached to it, and no picker box until it is asked', async () => {
    await mountHub();
    expect(search()).toBeTruthy();
    expect(search().getAttribute('placeholder')).toMatch(/^Search \d+ tools\.\.\.$/);
    // The second box is gone, with its field and its label.
    expect(host.querySelector('#stem-tool-interest')).toBeNull();
    expect(host.querySelector('input[aria-label="What do you want to learn about?"]')).toBeNull();
    expect(host.textContent).not.toContain('What do you want to learn about?');
    // The button is in the same row as the field, after it, and is a plain button (Enter in the field does not call AI).
    const row = host.querySelector('[data-stem-search-row="true"]');
    expect(row.contains(search())).toBe(true);
    expect(row.contains(suggest())).toBe(true);
    expect(search().compareDocumentPosition(suggest()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(suggest().getAttribute('type')).toBe('button');
    expect(suggest().closest('form')).toBeNull();
    expect(suggest().textContent).toBe('AISuggest tools');
    expect(suggest().getAttribute('aria-label')).toBe('Suggest tools — with AI');
    expect(panel()).toBeNull();
    expect(host.querySelectorAll('[data-stem-suggest-tools="true"]').length).toBe(1);
  });

  it('asks the picker about the words in the search field, shows it thinking, then its picks, and drops them when the words change', async () => {
    let finish;
    const callGemini = vi.fn(() => new Promise((res) => { finish = res; }));
    await mountHub({ callGemini });
    const first = cards()[0].getAttribute('data-stem-tool-id');
    await type(search(), 'rain and clouds');
    await click(suggest());
    expect(callGemini).toHaveBeenCalledTimes(1);
    expect(callGemini.mock.calls[0][0]).toContain('<UNTRUSTED_STUDENT_INTEREST>\nrain and clouds\n</UNTRUSTED_STUDENT_INTEREST>');
    // Thinking: the button says so and cannot be pressed twice; the panel has the status line.
    expect(suggest().disabled).toBe(true);
    expect(suggest().textContent).toBe('AIThinking...');
    expect(panel().querySelector('[role="status"]').textContent).toBe('Finding tool matches...');
    expect(picks()).toEqual([]);
    await act(async () => { finish(JSON.stringify([{ id: first, reason: 'It fits the topic.', starter: 'Press Start.' }])); });
    expect(suggest().disabled).toBe(false);
    expect(suggest().textContent).toBe('AISuggest tools');
    expect(picks()).toHaveLength(1);
    expect(picks()[0].textContent).toContain('It fits the topic.');
    expect(picks()[0].textContent).toContain('Try: Press Start.');
    expect(picks()[0].getAttribute('aria-label')).toMatch(/^Open suggested STEM tool /);
    expect(panel().getAttribute('aria-label')).toBe('AI STEM tool picker');
    // The picks sit directly under the search row, above the category chips.
    expect(host.querySelector('.stem-tool-searchbar').nextElementSibling).toBe(panel());
    expect(panel().compareDocumentPosition(host.querySelector('[aria-label="Filter tools by category"]')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Other words: the picks were for the old ones, so they go.
    await type(search(), 'rain and clouds and wind');
    expect(panel()).toBeNull();
  });

  it('ignores an answer that arrives after the words changed', async () => {
    let finish;
    const callGemini = vi.fn(() => new Promise((res) => { finish = res; }));
    await mountHub({ callGemini });
    const first = cards()[0].getAttribute('data-stem-tool-id');
    await type(search(), 'magnets');
    await click(suggest());
    await type(search(), 'magnet');
    expect(suggest().disabled).toBe(false);
    await act(async () => { finish(JSON.stringify([{ id: first, reason: 'late', starter: '' }])); });
    expect(panel()).toBeNull();
  });

  it('with no text it says to add some, and does not call AI', async () => {
    const callGemini = vi.fn(() => Promise.resolve('[]'));
    await mountHub({ callGemini });
    await click(suggest());
    expect(callGemini).not.toHaveBeenCalled();
    expect(panel().querySelector('[role="status"]').textContent).toBe('Add a topic, question, or project idea first.');
    expect(picks()).toEqual([]);
  });

  it('with AI off the button is still there and answers from the catalog, as the old box did', async () => {
    await mountHub({ callGemini: null });
    expect(suggest()).toBeTruthy();
    await type(search(), 'water cycle');
    await click(suggest());
    expect(picks().length).toBeGreaterThan(0);
    expect(host.querySelector('#stem-tool-suggest-panel [role="group"]').getAttribute('aria-label')).toBe('Suggested STEM tools');
    // The picks come with the note that says where they are from.
    expect(panel().querySelector('[role="status"]').textContent).toBe('AI suggestions are unavailable right now; showing closest catalog matches.');
  });

  it('offers the picker when no tile matches, and gives its message a home when it has nothing either', async () => {
    await mountHub({ callGemini: null });
    await type(search(), 'zzqqxxyy');
    expect(cards()).toEqual([]);
    expect(host.textContent).toContain('No tools match "zzqqxxyy"');
    const again = host.querySelector('button[data-stem-suggest-tools-empty="true"]');
    expect(again).toBeTruthy();
    expect(again.textContent).toBe('Suggest tools');
    await click(again);
    // Nothing in the catalog either: it must not promise "closest catalog matches".
    expect(panel().querySelector('[role="status"]').textContent).toBe('AI suggestions are unavailable right now. No close matches yet. Try a more specific topic.');
    expect(picks()).toEqual([]);
    // Clear filters is still there beside it.
    expect([...host.querySelectorAll('button')].some((b) => b.textContent === 'Clear filters')).toBe(true);
  });

  it('when the AI call fails it says so (or shows the closest catalog matches)', async () => {
    const callGemini = vi.fn(() => Promise.reject(new Error('offline')));
    await mountHub({ callGemini });
    await type(search(), 'zzqqxxyy');
    await click(suggest());
    await act(async () => { await Promise.resolve(); });
    expect(callGemini).toHaveBeenCalledTimes(1);
    expect(panel().querySelector('[role="status"]').textContent).toBe('AI suggestions hit a snag. No close matches yet. Try a more specific topic.');
    expect(suggest().disabled).toBe(false);
  });
});

describe('STEM hub catalog: the links button and the tile entrance', () => {
  it('keeps the Cloudflare links button for every user, with the station controls after the category chips, not in the search row', async () => {
    await mountHub({ isTeacherMode: false });
    const toggle = host.querySelector('[data-stem-catalog-links-toggle="true"]');
    expect(toggle).toBeTruthy();
    expect(toggle.getAttribute('aria-controls')).toBe('stem-catalog-direct-links');
    expect(host.querySelector('[data-stem-search-row="true"]').contains(toggle)).toBe(false);
    const chips = host.querySelector('[aria-label="Filter tools by category"]');
    const grid = host.querySelector('.stem-tool-grid');
    expect(chips.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(toggle.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(host.querySelector('#stem-catalog-direct-links')).toBeTruthy();
  });

  it('caps the tile entrance stagger so the last tile does not start seconds late, and keeps the reduced-motion branch', async () => {
    await mountHub();
    const delays = cards().map((card) => parseInt(card.style.animationDelay, 10));
    expect(delays.length).toBeGreaterThan(100);
    expect(delays.slice(0, 4)).toEqual([0, 40, 80, 120]);
    expect(Math.max(...delays)).toBe(480);
    // Uncapped, the last of these started (n - 1) * 40 ms late.
    expect((delays.length - 1) * 40).toBeGreaterThan(4000);
    const source = readFileSync(resolve(process.cwd(), HUB), 'utf8');
    expect(source).toMatch(/if \(!_reduceMotion\) \{\s*_cardStyle\.animation = 'stemCardIn 0\.35s ease-out both';/);
    expect(source).toContain("_cardStyle.animationDelay = (Math.min(_ci, 12) * 40) + 'ms';");
  });
});
