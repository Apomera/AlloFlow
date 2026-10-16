import { createRequire } from 'node:module';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const { glossaryMediaProps } = require('./helpers/glossary_media_fixture.cjs');
const cleanups = [];
const translations = {
  'common.enter_new_glossary_term': 'New glossary term',
  'glossary.add_term': 'Add term', 'glossary.defining': 'Defining…',
};
const translate = key => translations[key] || key;
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

beforeAll(() => { window.React = React; loadAlloModule('view_glossary_module.js'); });
afterEach(() => {
  cleanups.splice(0).reverse().forEach(cleanup => cleanup());
  vi.restoreAllMocks();
});

function mount(overrides = {}) {
  const props = glossaryMediaProps({
    t: translate, isEditingGlossary: true, showHealthCheckPanel: true,
    handleAddGlossaryTerm: vi.fn(), handleRefineGlossaryImage: vi.fn(),
    handleQuickAddGlossary: vi.fn(async () => true), fetchReplacementSuggestion: vi.fn(async () => null),
    ...overrides,
  });
  const container = document.createElement('div'); document.body.append(container);
  const root = ReactDOMClient.createRoot(container);
  const render = () => {
    props.filteredGlossaryData = props.generatedContent.data.map((item, _originalIdx) => ({ ...item, _originalIdx }));
    root.render(React.createElement(window.AlloModules.GlossaryView, props));
  };
  props.setGlossaryHealthCheck = vi.fn(update => {
    props.glossaryHealthCheck = typeof update === 'function' ? update(props.glossaryHealthCheck) : update;
    render();
  });
  act(render);
  cleanups.push(() => { act(() => root.unmount()); container.remove(); });
  return { container, props, rerender: extra => { Object.assign(props, extra); act(render); } };
}
const byName = (view, name) => [...view.container.querySelectorAll('[aria-label]')]
  .find(element => element.getAttribute('aria-label') === name);
const suggestionStatus = view => view.container.querySelector('[data-glossary-suggestion-status]');
const healthReport = (terms = ['Stem']) => ({
  summary: 'A few related words would help.', coverageGaps: terms.map(term => ({ term, reason: 'Related to the source.' })),
});
async function click(button) {
  expect(button).toBeTruthy();
  await act(async () => button.click());
}
async function key(input, extra = {}) {
  expect(input).toBeTruthy(); input.focus();
  const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, ...extra });
  await act(async () => input.dispatchEvent(event));
  return event;
}

describe('glossary editing keyboard controls', () => {
  const fields = [
    { title: 'new term', name: 'New glossary term', value: { newGlossaryTerm: 'Stem' }, callback: 'handleAddGlossaryTerm', empty: { newGlossaryTerm: '   ' }, busy: { isAddingTerm: true } },
    { title: 'image instructions', name: 'Image edit instructions for Leaf', value: { glossaryRefinementInputs: { 'entry:leaf': 'Use a green background' } }, callback: 'handleRefineGlossaryImage', empty: { glossaryRefinementInputs: { 'entry:leaf': '   ' } }, busy: { isGeneratingTermImage: { 'entry:leaf': true } } },
  ];
  it.each(fields)('submits $title once on Enter while preserving ordinary keys and composition', async field => {
    const view = mount(field.value), input = byName(view, field.name), callback = view.props[field.callback];
    for (const extra of [{ key: 'a' }, { isComposing: true }, { keyCode: 229 }]) {
      const event = await key(input, extra);
      expect(event.defaultPrevented).toBe(false);
    }
    expect(callback).not.toHaveBeenCalled();
    await key(input, { repeat: true });
    expect(callback).not.toHaveBeenCalled();
    const event = await key(input);
    expect(event.defaultPrevented).toBe(true);
    expect(callback).toHaveBeenCalledOnce();
    if (field.callback === 'handleRefineGlossaryImage') expect(callback).toHaveBeenCalledWith(0);
  });

  it.each(fields)('rejects blank and busy $title submissions and becomes usable again', async field => {
    const view = mount(field.empty), callback = view.props[field.callback];
    await key(byName(view, field.name));
    expect(callback).not.toHaveBeenCalled();
    view.rerender({ ...field.value, ...field.busy });
    await key(byName(view, field.name));
    expect(callback).not.toHaveBeenCalled();
    view.rerender({ isAddingTerm: false, isGeneratingTermImage: {} });
    await key(byName(view, field.name));
    expect(callback).toHaveBeenCalledOnce();
  });

  it('disables blank image edits and exposes progress while an edit is running', async () => {
    const view = mount({ glossaryRefinementInputs: { 'entry:leaf': '   ' } });
    const button = byName(view, 'Apply image edit for Leaf');
    expect(button.disabled).toBe(true);
    expect(button.type).toBe('button');
    await click(button);
    expect(view.props.handleRefineGlossaryImage).not.toHaveBeenCalled();
    view.rerender({ glossaryRefinementInputs: { 'entry:leaf': 'Add a border' }, isGeneratingTermImage: { 'entry:leaf': true } });
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    await click(button);
    expect(view.props.handleRefineGlossaryImage).not.toHaveBeenCalled();
    view.rerender({ isGeneratingTermImage: {} });
    expect(button.disabled).toBe(false);
    await click(button);
    expect(view.props.handleRefineGlossaryImage).toHaveBeenCalledWith(0);
  });

  it('identifies each definition, language, and image action with its word', () => {
    const initial = glossaryMediaProps().generatedContent;
    const data = [initial.data[0], { ...initial.data[0], entryId: 'stem', term: 'Stem', def: 'Supports the plant.' }]
      .map(item => ({ ...item, translations: { French: 'Partie de la plante', Arabic: 'جزء من النبات' } }));
    const view = mount({ generatedContent: { ...initial, data }, displayLanguages: ['French', 'Arabic'], selectedLanguages: ['French', 'Arabic'] });
    for (const term of ['Leaf', 'Stem']) {
      expect(byName(view, 'Edit definition for ' + term)?.tagName).toBe('TEXTAREA');
      expect(byName(view, 'Image edit instructions for ' + term)?.tagName).toBe('INPUT');
      expect(byName(view, 'Apply image edit for ' + term)?.tagName).toBe('BUTTON');
      for (const language of ['French', 'Arabic']) {
        expect(byName(view, 'Edit ' + language + ' translation for ' + term)?.tagName).toBe('TEXTAREA');
      }
    }
  });
});

describe('glossary suggested-term feedback and lifecycle', () => {
  it('prevents duplicate activation, announces progress, and replaces a successfully added suggestion', async () => {
    const request = deferred();
    const handleQuickAddGlossary = vi.fn(() => request.promise);
    const fetchReplacementSuggestion = vi.fn(async () => ({ term: 'Root', reason: 'Another plant part.' }));
    const view = mount({ glossaryHealthCheck: healthReport(), handleQuickAddGlossary, fetchReplacementSuggestion });
    const button = byName(view, 'Add Stem');
    expect(button).toBeTruthy();
    await act(async () => { button.click(); button.click(); });
    expect(handleQuickAddGlossary).toHaveBeenCalledOnce();
    expect(handleQuickAddGlossary).toHaveBeenCalledWith('Stem', true);
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Adding Stem');
    expect(suggestionStatus(view).getAttribute('role')).toBe('status');
    expect(suggestionStatus(view).textContent).toContain('Stem');
    await act(async () => request.resolve(true));
    expect(view.props.glossaryHealthCheck.coverageGaps.map(gap => gap.term)).toEqual(['Root']);
    expect(byName(view, 'Add Stem')).toBeUndefined();
    expect(byName(view, 'Add Root')).toBeTruthy();
    expect(fetchReplacementSuggestion).toHaveBeenCalledOnce();
    expect(suggestionStatus(view).textContent).toContain('Stem');
  });

  it.each(['false result', 'rejection'])('keeps a failed suggestion available to retry after a %s', async failure => {
    const request = deferred();
    const handleQuickAddGlossary = vi.fn().mockImplementationOnce(() => request.promise).mockResolvedValueOnce(true);
    const view = mount({ glossaryHealthCheck: healthReport(), handleQuickAddGlossary });
    await click(byName(view, 'Add Stem'));
    await act(async () => {
      if (failure === 'rejection') request.reject(new Error('Private provider payload that should not enter the UI'));
      else request.resolve(false);
    });
    expect(view.props.glossaryHealthCheck.coverageGaps.map(gap => gap.term)).toEqual(['Stem']);
    const retry = byName(view, 'Add Stem');
    expect(retry.disabled).toBe(false);
    expect(suggestionStatus(view).textContent).toMatch(/try again/i);
    expect(suggestionStatus(view).textContent).not.toContain('Private provider payload');
    expect(view.props.fetchReplacementSuggestion).not.toHaveBeenCalled();
    await click(retry);
    expect(handleQuickAddGlossary).toHaveBeenCalledTimes(2);
    expect(view.props.glossaryHealthCheck.coverageGaps).toEqual([]);
  });

  it('shares the pending guard across suggestions for the same word', async () => {
    const request = deferred();
    const view = mount({ glossaryHealthCheck: healthReport(['Stem', 'stem']), handleQuickAddGlossary: vi.fn(() => request.promise) });
    const first = byName(view, 'Add Stem'), duplicate = byName(view, 'Add stem');
    expect(first).toBeTruthy(); expect(duplicate).toBeTruthy();
    await act(async () => { first.click(); duplicate.click(); });
    expect(view.props.handleQuickAddGlossary).toHaveBeenCalledOnce();
    expect(first.disabled).toBe(true); expect(duplicate.disabled).toBe(true);
    await act(async () => request.resolve(true));
    expect(view.props.glossaryHealthCheck.coverageGaps).toEqual([]);
  });

  it('preserves a successful addition when refreshing the next suggestion fails', async () => {
    const view = mount({ glossaryHealthCheck: healthReport(), fetchReplacementSuggestion: vi.fn(async () => { throw new Error('Provider private payload'); }) });
    await click(byName(view, 'Add Stem'));
    expect(view.props.glossaryHealthCheck.coverageGaps).toEqual([]);
    expect(suggestionStatus(view).textContent).toContain('Added Stem');
    expect(suggestionStatus(view).textContent).toMatch(/suggestions.*refreshed/i);
    expect(suggestionStatus(view).textContent).not.toContain('private payload');
  });

  it.each(['resource', 'view', 'teacher role'])('ignores a pending suggestion after changing the %s', async change => {
    const request = deferred();
    const view = mount({ glossaryHealthCheck: healthReport(), handleQuickAddGlossary: vi.fn(() => request.promise) });
    await click(byName(view, 'Add Stem'));
    const next = change === 'resource' ? { generatedContent: { ...view.props.generatedContent, id: 'different-glossary' } }
      : change === 'view' ? { activeView: 'history' } : { isTeacherMode: false };
    view.rerender({ ...next, glossaryHealthCheck: healthReport(['Flower']) });
    view.props.setGlossaryHealthCheck.mockClear();
    await act(async () => request.resolve(true));
    expect(view.props.setGlossaryHealthCheck).not.toHaveBeenCalled();
    expect(view.props.fetchReplacementSuggestion).not.toHaveBeenCalled();
    expect(view.props.glossaryHealthCheck.coverageGaps.map(gap => gap.term)).toEqual(['Flower']);
  });

  it('ignores a replacement that arrives after a different glossary opens', async () => {
    const replacement = deferred();
    const view = mount({ glossaryHealthCheck: healthReport(), fetchReplacementSuggestion: vi.fn(() => replacement.promise) });
    await click(byName(view, 'Add Stem'));
    expect(view.props.glossaryHealthCheck.coverageGaps).toEqual([]);
    view.rerender({ generatedContent: { ...view.props.generatedContent, id: 'different-glossary' }, glossaryHealthCheck: healthReport(['Flower']) });
    view.props.setGlossaryHealthCheck.mockClear();
    await act(async () => replacement.resolve({ term: 'Root', reason: 'From the previous glossary.' }));
    expect(view.props.setGlossaryHealthCheck).not.toHaveBeenCalled();
    expect(view.props.glossaryHealthCheck.coverageGaps.map(gap => gap.term)).toEqual(['Flower']);
  });
});
