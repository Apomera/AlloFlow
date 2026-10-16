import { createRequire } from 'node:module';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const { glossaryMediaProps } = require('./helpers/glossary_media_fixture.cjs');
const cleanups = [];
const words = [
  { entryId: 'leaf', term: 'Leaf', def: 'A plant part.', tier: 'Domain-Specific', isSelected: true },
  { entryId: 'root', term: 'Root', def: 'Another plant part.', tier: 'Domain-Specific', isSelected: false },
  { entryId: 'compare', term: 'Compare', def: 'Find similarities.', tier: 'Academic', isSelected: false },
];

beforeAll(() => { window.React = React; loadAlloModule('view_glossary_module.js'); });
afterEach(() => {
  cleanups.splice(0).reverse().forEach(fn => fn());
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function mount(overrides = {}) {
  const container = document.createElement('div'); document.body.append(container);
  const root = ReactDOMClient.createRoot(container);
  const setQuery = vi.fn(), clearTier = vi.fn(), selectAll = vi.fn();
  let update;
  function App() {
    const [state, setState] = React.useState({ data: words, query: '', tier: 'all', id: 'search-selection', ...overrides });
    update = patch => setState(previous => ({ ...previous, ...patch }));
    const filtered = state.data.map((word, index) => ({ ...word, _originalIdx: index })).filter(word => (
      (state.tier === 'all' || word.tier === (state.tier === 'academic' ? 'Academic' : 'Domain-Specific')) &&
      word.term.toLowerCase().includes(state.query.trim().toLowerCase())
    ));
    return React.createElement(window.AlloModules.GlossaryView, glossaryMediaProps({
      isEditingGlossary: true, isTeacherMode: state.isTeacherMode !== false,
      generatedContent: { id: state.id, type: 'glossary', data: state.data },
      filteredGlossaryData: filtered, glossarySearchTerm: state.query, glossaryFilter: state.tier,
      ...(state.t ? { t: state.t } : {}),
      setGlossarySearchTerm: value => { setQuery(value); update({ query: value }); },
      handleSetGlossaryFilterToAll: () => { clearTier(); update({ tier: 'all' }); },
      handleGlossarySelectAll: event => {
        const selected = event.target.checked;
        selectAll(selected);
        update({ data: state.data.map(word => ({ ...word, isSelected: selected })) });
      },
    }));
  }
  act(() => root.render(React.createElement(App)));
  cleanups.push(() => { act(() => root.unmount()); container.remove(); });
  return {
    container, setQuery, clearTier, selectAll,
    update: patch => act(() => update(patch)),
    count: () => container.querySelector('[data-glossary-result-count]').textContent,
    announcement: () => container.querySelector('[data-glossary-search-announcement]'),
    search: () => container.querySelector('input[type="search"]'),
    all: () => container.querySelector('[data-glossary-selection] input'),
  };
}

const button = (view, label) => [...view.container.querySelectorAll('button')].find(el => el.textContent === label || el.getAttribute('aria-label') === label);
const click = element => { expect(element).toBeTruthy(); act(() => element.click()); };
const advance = ms => act(() => vi.advanceTimersByTime(ms));

describe('glossary search feedback', () => {
  it.each([true, false])('shows immediate results with teacher mode %s, including zero matches', isTeacherMode => {
    const view = mount({ isTeacherMode });
    expect(view.count()).toBe('3 of 3 words');
    expect(button(view, 'Clear filters')).toBeUndefined();
    view.update({ query: 'Leaf' });
    expect(view.count()).toBe('1 of 3 words');
    expect(button(view, 'Clear filters')).toBeTruthy();
    view.update({ query: 'nothing matches' });
    expect(view.count()).toBe('0 of 3 words');
  });

  it('announces settled counts politely without announcing intermediate typing', () => {
    vi.useFakeTimers();
    const view = mount();
    expect(view.announcement().textContent).toBe('');
    advance(300);
    expect(view.announcement().textContent).toBe('3 of 3 words');
    expect(view.announcement().getAttribute('role')).toBe('status');
    expect(view.announcement().getAttribute('aria-live')).toBe('polite');
    expect(view.announcement().getAttribute('aria-atomic')).toBe('true');
    view.update({ query: 'l' });
    expect(view.count()).toBe('1 of 3 words');
    advance(200);
    view.update({ query: 'lz' });
    expect(view.count()).toBe('0 of 3 words');
    advance(299);
    expect(view.announcement().textContent).toBe('3 of 3 words');
    advance(1);
    expect(view.announcement().textContent).toBe('0 of 3 words');
  });

  it('clears query and vocabulary filter together, restores rows, and focuses search', () => {
    const view = mount({ query: 'Leaf', tier: 'domain' });
    const clear = button(view, 'Clear filters'); clear.focus();
    click(clear);
    expect(view.setQuery).toHaveBeenCalledWith('');
    expect(view.clearTier).toHaveBeenCalledOnce();
    expect(view.count()).toBe('3 of 3 words');
    expect(view.search().value).toBe('');
    expect(document.activeElement).toBe(view.search());
    expect(button(view, 'Clear filters')).toBeUndefined();
  });

  it('clears only the query from its icon and preserves keyboard focus and the tier filter', () => {
    const view = mount({ query: 'Leaf', tier: 'domain' });
    const clear = button(view, 'Clear search'); clear.focus();
    click(clear);
    expect(view.setQuery).toHaveBeenCalledWith('');
    expect(view.clearTier).not.toHaveBeenCalled();
    expect(view.count()).toBe('2 of 3 words');
    expect(document.activeElement).toBe(view.search());
    expect(button(view, 'Clear filters')).toBeTruthy();
  });

  it('cancels the old result announcement when another glossary replaces it', () => {
    vi.useFakeTimers();
    const view = mount({ query: 'Leaf' });
    advance(200);
    view.update({ id: 'another-glossary', data: [], query: '' });
    expect(view.count()).toBe('0 of 0 words');
    advance(100);
    expect(view.announcement().textContent).toBe('');
    advance(200);
    expect(view.announcement().textContent).toBe('0 of 0 words');
  });

  it('interpolates translated result count text', () => {
    const view = mount({ query: 'Leaf', t: key => key === 'glossary.result_count' ? '{shown} sur {total} mots' : key });
    expect(view.count()).toBe('1 sur 3 mots');
  });
});

describe('glossary selection scope', () => {
  it('shows a mixed state even when every visible word is selected and includes hidden rows when toggled', () => {
    const view = mount({ query: 'Leaf' });
    expect(view.count()).toBe('1 of 3 words');
    expect(view.all().checked).toBe(false);
    expect(view.all().indeterminate).toBe(true);
    expect(view.all().getAttribute('aria-checked')).toBe('mixed');
    expect(view.all().getAttribute('aria-label')).toBe('Include all terms');
    expect(view.all().getAttribute('aria-describedby')).toBe('glossary-selection-scope');
    expect(view.container.querySelector('#glossary-selection-scope').textContent).toBe('Selection applies to all 3 words, including words hidden by filters.');
    click(view.all());
    expect(view.selectAll).toHaveBeenLastCalledWith(true);
    expect(view.all().checked).toBe(true);
    expect(view.all().indeterminate).toBe(false);
    expect(view.all().getAttribute('aria-checked')).toBe('true');
    view.update({ query: '' });
    expect([...view.container.querySelectorAll('tbody input[type="checkbox"]')].every(input => input.checked)).toBe(true);
    click(view.all());
    expect(view.selectAll).toHaveBeenLastCalledWith(false);
    expect(view.all().checked).toBe(false);
    expect(view.all().indeterminate).toBe(false);
    expect(view.all().getAttribute('aria-checked')).toBe('false');
  });

  it('treats entries without an explicit selection value as selected', () => {
    const view = mount({ data: words.map(({ isSelected, ...word }) => word) });
    expect(view.all().checked).toBe(true);
    expect(view.all().indeterminate).toBe(false);
  });

  it('keeps selecting all available with no matching rows and disables it only for an empty glossary', () => {
    const view = mount({ query: 'no match' });
    expect(view.all().disabled).toBe(false);
    expect(view.all().indeterminate).toBe(true);
    view.update({ data: [] });
    expect(view.all().disabled).toBe(true);
    expect(view.all().checked).toBe(false);
    expect(view.all().indeterminate).toBe(false);
    expect(view.all().getAttribute('aria-checked')).toBe('false');
  });
});
