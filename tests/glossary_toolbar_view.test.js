// Lane A1 (2026-10-20): the compact glossary toolbar. Search, vocabulary
// filter, sort and one Tools disclosure share a row; practice, games and the
// teacher tools open below it. Mounted from the built view module.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';

const require = createRequire(import.meta.url);
const { glossaryMediaProps } = require('./helpers/glossary_media_fixture.cjs');
const DIR = process.env.LANE_DIR || '.';

beforeAll(() => {
  window.React = React;
  new Function(readFileSync(DIR + '/view_glossary_module.js', 'utf8'))();
});
const cleanups = [];
afterEach(() => { cleanups.splice(0).reverse().forEach((fn) => fn()); vi.restoreAllMocks(); });

function mount(overrides = {}) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = ReactDOMClient.createRoot(container);
  const props = glossaryMediaProps({ ErrorBoundary: ({ children }) => children, setGlossarySort: vi.fn(), glossarySort: 'lesson', ...overrides });
  act(() => root.render(React.createElement(window.AlloModules.GlossaryView, props)));
  cleanups.push(() => { act(() => root.unmount()); container.remove(); });
  return { container, props, section: container.querySelector('section[aria-label="glossary.title"]') };
}
const click = (el) => { expect(el, 'element to click').toBeTruthy(); act(() => el.click()); };
const toolsToggle = (view) => view.container.querySelector('[data-glossary-tools-toggle]');
const region = (view) => view.container.querySelector('[id="glossary-toolbar-tools"]');
const shown = (el) => { for (let node = el; node; node = node.parentElement) { if (node.hidden || node.style.display === 'none') return false; } return true; };
const controls = (root) => [...root.querySelectorAll('button, select, input, textarea')];
const name = (el) => el.getAttribute('data-help-key') || el.getAttribute('aria-label') || el.textContent.trim();
const visibleNames = (view) => new Set(controls(view.section).filter(shown).map(name));

describe('compact glossary toolbar', () => {
  it('puts search, vocabulary filter, sort and the Tools toggle in one row, in reading order', () => {
    const view = mount();
    const row = view.section.querySelector('[data-glossary-compact-toolbar]');
    const items = [...row.children];
    expect(items.map((el) => el.getAttribute('data-help-key') || el.getAttribute('role') || (el.hasAttribute('data-glossary-sort') ? 'sort' : el.hasAttribute('data-glossary-tools-toggle') ? 'tools' : el.tagName))).toEqual(['glossary_search', 'group', 'sort', 'tools']);
    for (const el of controls(row).filter(shown)) expect(el.className.includes('min-h-11'), name(el) + ' is 44 px tall').toBe(true);
  });

  it('wraps the skip link and the toolbar together so the parent spacing adds no gap above it', () => {
    const view = mount();
    const wrapper = view.container.querySelector('[data-glossary-toolbar]');
    expect(wrapper.parentElement.firstElementChild).toBe(wrapper);
    expect(wrapper.firstElementChild.hasAttribute('data-glossary-skip')).toBe(true);
    expect(view.section.parentElement).toBe(wrapper);
    expect(view.container.querySelector('button, input, select, a[href], [tabindex="0"]').hasAttribute('data-glossary-skip')).toBe(true);
  });

  it('keeps the vocabulary filter state, help keys and its explanation', () => {
    const view = mount({ glossaryFilter: 'academic' });
    const group = view.section.querySelector('[role="group"][aria-label="glossary.title"]');
    expect([...group.querySelectorAll('button')].map((b) => [b.getAttribute('data-help-key'), b.getAttribute('aria-pressed')])).toEqual([
      ['glossary_filter_all', 'false'], ['glossary_filter_tier2', 'true'], ['glossary_filter_tier3', 'false'],
    ]);
    const help = view.container.querySelector('[id="' + group.getAttribute('aria-describedby') + '"]');
    expect(help.textContent).toBe('Academic vocabulary appears across subjects; subject vocabulary is specific to this topic.');
  });
});

describe('glossary sort control', () => {
  it('shows the current sort and asks the host to change it', () => {
    const setGlossarySort = vi.fn();
    const view = mount({ glossarySort: 'tier', setGlossarySort });
    const select = view.section.querySelector('[data-glossary-sort] select');
    expect(select.closest('label').firstChild.textContent).toBe('Sort');
    expect([...select.options].map((o) => [o.value, o.textContent])).toEqual([
      ['lesson', 'Lesson order'], ['az', 'A to Z'], ['za', 'Z to A'], ['tier', 'By vocabulary tier'],
    ]);
    expect(select.value).toBe('tier');
    act(() => { select.value = 'az'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(setGlossarySort).toHaveBeenCalledWith('az');
  });

  it('falls back to lesson order for an unknown value and is offered to students', () => {
    const setGlossarySort = vi.fn();
    const view = mount({ glossarySort: 'bogus', setGlossarySort, isTeacherMode: false });
    const select = view.section.querySelector('[data-glossary-sort] select');
    expect(select.value).toBe('lesson');
    act(() => { select.value = 'za'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(setGlossarySort).toHaveBeenCalledWith('za');
  });

  it('is left out when an older host cannot sort', () => {
    const view = mount({ setGlossarySort: undefined });
    expect(view.section.querySelector('[data-glossary-sort]')).toBeNull();
    expect(view.section.querySelector('input[type="search"]')).toBeTruthy();
  });

  it('is not a filter: no "Clear filters" and the count is unchanged', () => {
    const view = mount({ glossarySort: 'za' });
    expect(controls(view.section).some((b) => b.textContent === 'Clear filters')).toBe(false);
    expect(view.section.querySelector('[data-glossary-result-count]').textContent).toBe('1 of 1 words');
  });
});

describe('Tools disclosure', () => {
  it('starts closed and opens the practice, game and teacher toggles', () => {
    const view = mount();
    const toggle = toolsToggle(view);
    expect(toggle.textContent.trim()).toBe('Tools');
    expect(toggle.getAttribute('aria-controls')).toBe('glossary-toolbar-tools');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(shown(region(view))).toBe(false);
    click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(shown(region(view))).toBe(true);
    for (const selector of ['#glossary-study-tools-title', '[data-help-key="glossary_standard_flashcards"]', '[data-help-key="glossary_language_flashcards"]', 'button[aria-describedby="glossary-presentation-help"]', '[aria-controls="glossary-games-tools"]', '[data-help-key="glossary_edit"]', '[aria-controls="glossary-teacher-tools"]', '[data-glossary-udl-goal]']) {
      const el = region(view).querySelector(selector);
      expect(el && shown(el), selector).toBe(true);
    }
  });

  it('closing it also closes the game and teacher panels', () => {
    const view = mount();
    click(toolsToggle(view));
    click(view.section.querySelector('[aria-controls="glossary-games-tools"]'));
    click(view.section.querySelector('[aria-controls="glossary-teacher-tools"]'));
    expect(view.container.querySelector('[id="glossary-games-tools"]')).toBeTruthy();
    expect(view.container.querySelector('[id="glossary-teacher-tools"]')).toBeTruthy();
    click(toolsToggle(view));
    expect(view.container.querySelector('[id="glossary-games-tools"]')).toBeNull();
    expect(view.container.querySelector('[id="glossary-teacher-tools"]')).toBeNull();
    click(toolsToggle(view));
    expect(view.section.querySelector('[aria-controls="glossary-games-tools"]').getAttribute('aria-expanded')).toBe('false');
  });

  it('every toolbar control is reachable in at most two activations', () => {
    const openPanel = (controlsId) => {
      const view = mount();
      click(toolsToggle(view));
      click(view.section.querySelector('[aria-controls="' + controlsId + '"]'));
      return view;
    };
    const first = mount();
    const level0 = visibleNames(first);
    for (const key of ['glossary.search_placeholder', 'glossary_filter_all', 'glossary_filter_tier2', 'glossary_filter_tier3', 'Tools']) expect(level0.has(key), key).toBe(true);
    expect([...first.section.querySelectorAll('select')].filter(shown)).toHaveLength(1);
    click(toolsToggle(first));
    const level1 = visibleNames(first);
    const games = visibleNames(openPanel('glossary-games-tools'));
    const teacher = visibleNames(openPanel('glossary-teacher-tools'));
    const all = openPanel('glossary-games-tools');
    click(all.section.querySelector('[aria-controls="glossary-teacher-tools"]'));
    const everything = controls(all.section);
    const reachable = new Set([...level0, ...level1, ...games, ...teacher]);
    expect(everything.length).toBeGreaterThan(20);
    for (const el of everything) expect(reachable.has(name(el)), name(el)).toBe(true);
    // Game cards need Tools + Start game; the teacher panel needs Tools + More tools.
    expect(level1.has('glossary_word_search')).toBe(false);
    expect(games.has('glossary_word_search')).toBe(true);
    expect(teacher.has('glossary_export_standard')).toBe(true);
  });

  it('students get a Practice toggle without the teacher controls', () => {
    const view = mount({ isTeacherMode: false });
    expect(toolsToggle(view).textContent.trim()).toBe('Practice');
    click(toolsToggle(view));
    expect(region(view).querySelector('[data-help-key="glossary_standard_flashcards"]')).toBeTruthy();
    expect(region(view).querySelector('[aria-controls="glossary-games-tools"]')).toBeTruthy();
    expect(view.container.querySelector('[data-help-key="glossary_edit"]')).toBeNull();
    expect(view.container.querySelector('[aria-controls="glossary-teacher-tools"]')).toBeNull();
    expect(view.container.querySelector('[data-glossary-udl-goal]')).toBeNull();
  });

  it('keeps the existing ids, panel wiring and search feedback hooks', () => {
    const view = mount();
    for (const selector of ['[data-help-key="glossary_search"] input[type="search"]', '[data-glossary-result-count]', '[data-glossary-search-announcement]', '#glossary-study-tools-title', 'button[aria-controls="glossary-games-tools"][aria-expanded="false"]', 'button[aria-controls="glossary-teacher-tools"][aria-expanded="false"]']) {
      expect(view.container.querySelector(selector), selector).toBeTruthy();
    }
  });

  it('clears the search from its own button and keeps focus in the field', () => {
    const setGlossarySearchTerm = vi.fn();
    const view = mount({ glossarySearchTerm: 'leaf', setGlossarySearchTerm });
    const field = view.section.querySelector('input[type="search"]');
    const clear = view.section.querySelector('button[aria-label="Clear search"]');
    expect(clear.parentElement).toBe(field.parentElement);
    click(clear);
    expect(setGlossarySearchTerm).toHaveBeenCalledWith('');
    expect(document.activeElement).toBe(field);
  });
});
