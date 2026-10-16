import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const { glossaryMediaProps } = require('./helpers/glossary_media_fixture.cjs');
const createHostHandlers = new Function(readFileSync('host_handlers_source.jsx', 'utf8') + '\nreturn createHostHandlers;')();
let cleanup;
beforeAll(() => { window.React = React; loadAlloModule('view_glossary_module.js'); });
afterEach(() => { cleanup?.(); cleanup = null; vi.restoreAllMocks(); });

function mount(options = {}) {
  const base = glossaryMediaProps();
  const initial = { ...base.generatedContent, data: [
    { ...base.generatedContent.data[0], imageAlt: 'Green leaf', imageDecorative: false },
    { entryId: 'root', term: 'Root', def: 'Takes up water.', translations: {} },
  ] };
  const api = {};
  function App() {
    const [resource, setResource] = React.useState(initial);
    const [history, setHistory] = React.useState([initial]);
    const [teacher, setTeacher] = React.useState(true);
    const live = React.useRef({});
    live.current = { generatedContent: resource, history, isTeacherMode: teacher };
    const handlers = createHostHandlers({
      get generatedContent() { return live.current.generatedContent; },
      get isTeacherMode() { return live.current.isTeacherMode; },
      _resourceMutationStateRef: live, setGeneratedContent: setResource, setHistory,
      addToast: () => {}, t: key => key,
    });
    api.resource = resource; api.history = history;
    api.setResource = setResource; api.setTeacher = setTeacher;
    api.edit = update => {
      setResource(previous => update(previous));
      setHistory(previous => previous.map(item => item.id === live.current.generatedContent.id ? update(item) : item));
    };
    return React.createElement(window.AlloModules.GlossaryView, glossaryMediaProps({
      ...base, generatedContent: resource, isEditingGlossary: true, isTeacherMode: teacher,
      filteredGlossaryData: resource.data.map((item, index) => ({ ...item, _originalIdx: index })).filter(item => !options.onlyTerm || item.term === options.onlyTerm),
      handleDeleteGlossaryItem: handlers.handleDeleteGlossaryItem,
      handleDeleteTermImage: handlers.handleDeleteTermImage,
      ...options.props,
    }));
  }
  const container = document.createElement('div'); document.body.append(container);
  const root = ReactDOMClient.createRoot(container);
  act(() => root.render(React.createElement(App)));
  cleanup = () => { act(() => root.unmount()); container.remove(); };
  return { container, api };
}
const named = (view, name) => [...view.container.querySelectorAll('button')].find(button => button.getAttribute('aria-label') === name);
const undo = view => view.container.querySelector('[data-glossary-undo-action]');
async function click(button) { expect(button).toBeTruthy(); await act(async () => button.click()); }

describe('glossary deletion recovery through the actual host', () => {
  it('moves focus to Undo and restores a deleted word without losing later edits', async () => {
    const view = mount();
    const deletion = named(view, 'Delete term: Leaf'); deletion.focus();
    await click(deletion);
    expect(view.api.resource.data.map(item => item.term)).toEqual(['Root']);
    expect(document.activeElement).toBe(undo(view));
    expect(view.container.querySelector('[data-glossary-undo-status]').textContent).toContain('Undo is available');
    await act(async () => view.api.edit(resource => ({ ...resource, data: resource.data.map(item => ({ ...item, def: 'Edited after deletion.' })) })));
    await click(undo(view));
    expect(view.api.resource.data.map(item => item.term)).toEqual(['Leaf', 'Root']);
    expect(view.api.resource.data[1].def).toBe('Edited after deletion.');
    expect(view.api.history[0].data).toEqual(view.api.resource.data);
    expect(undo(view)).toBeNull();
    expect(view.container.querySelector('[data-glossary-entry-key="entry:leaf"]').contains(document.activeElement)).toBe(true);
    expect(view.container.querySelector('[data-glossary-undo-status]').textContent).toBe('Restored Leaf.');
  });

  it('restores an image and then a deleted word in reverse order', async () => {
    const view = mount();
    await click(named(view, 'Delete term: Root'));
    await click(named(view, 'Delete image for Leaf'));
    expect(view.api.resource.data[0].image).toBeUndefined();
    expect(view.api.resource.data[0].imageAlt).toBeUndefined();
    expect(undo(view).getAttribute('aria-label')).toBe('Undo image removal for Leaf');
    await click(undo(view));
    expect(view.api.resource.data[0].imageAlt).toBe('Green leaf');
    expect(undo(view).getAttribute('aria-label')).toBe('Undo deletion of Root');
    await click(undo(view));
    expect(view.api.resource.data.map(item => item.term)).toEqual(['Leaf', 'Root']);
    expect(undo(view)).toBeNull();
  });

  it('deletes the correct original row when filtered and restores it to its original position', async () => {
    const view = mount({ onlyTerm: 'Root' });
    await click(named(view, 'Delete term: Root'));
    expect(view.api.resource.data.map(item => item.term)).toEqual(['Leaf']);
    await click(undo(view));
    expect(view.api.resource.data.map(item => item.term)).toEqual(['Leaf', 'Root']);
    expect(view.container.querySelectorAll('[data-glossary-entry-key]')).toHaveLength(1);
  });

  it('keeps a replacement image and explains why the older removal cannot be undone', async () => {
    const view = mount();
    await click(named(view, 'Delete image for Leaf'));
    await act(async () => view.api.edit(resource => ({ ...resource, data: resource.data.map(item => item.entryId === 'leaf' ? { ...item, image: 'new-image.png', imageAlt: 'Replacement' } : item) })));
    await click(undo(view));
    expect(view.api.resource.data[0].image).toBe('new-image.png');
    expect(view.container.querySelector('[data-glossary-undo-status]').textContent).toContain('could not be undone');
    expect(document.activeElement).toBe(view.container.querySelector('[data-glossary-word-list]'));
  });

  it('clears recovery when changing glossary or leaving teacher mode', async () => {
    const view = mount();
    await click(named(view, 'Delete term: Root'));
    const before = view.api.resource;
    await act(async () => view.api.setResource({ ...before, id: 'another-glossary' }));
    expect(undo(view)).toBeNull();
    expect(view.container.querySelector('[data-glossary-undo-status]').textContent).toBe('');
    await click(named(view, 'Delete image for Leaf'));
    expect(undo(view)).toBeTruthy();
    await act(async () => view.api.setTeacher(false));
    expect(view.container.querySelector('[data-glossary-undo]')).toBeNull();
    await act(async () => view.api.setTeacher(true));
    expect(undo(view)).toBeNull();
  });

  it('dismisses recovery and leaves focus on the word list', async () => {
    const view = mount();
    await click(named(view, 'Delete term: Root'));
    await click(named(view, 'Dismiss undo'));
    expect(undo(view)).toBeNull();
    expect(document.activeElement).toBe(view.container.querySelector('[data-glossary-word-list]'));
    expect(view.api.resource.data.map(item => item.term)).toEqual(['Leaf']);
  });

  it('does not claim an undo exists when an older host returns no receipt', async () => {
    const remove = vi.fn();
    const view = mount({ props: { handleDeleteGlossaryItem: remove } });
    await click(named(view, 'Delete term: Root'));
    expect(remove).toHaveBeenCalledWith(1);
    expect(undo(view)).toBeNull();
  });

  it('bounds recovery to the latest ten deletions', async () => {
    const view = mount();
    const entries = Array.from({ length: 11 }, (_, index) => ({ entryId: 'word-' + index, term: 'Word ' + index, def: 'Definition', translations: {} }));
    await act(async () => view.api.edit(resource => ({ ...resource, data: entries })));
    for (const entry of entries) await click(named(view, 'Delete term: ' + entry.term));
    expect(view.api.resource.data).toHaveLength(0);
    for (let index = 0; index < 10; index++) await click(undo(view));
    expect(undo(view)).toBeNull();
    expect(view.api.resource.data.map(item => item.term)).toEqual(entries.slice(1).map(item => item.term));
  });
});
