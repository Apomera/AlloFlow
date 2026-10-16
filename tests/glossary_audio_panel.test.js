import { createRequire } from 'node:module';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const { glossaryMediaProps } = require('./helpers/glossary_media_fixture.cjs');
const cleanups = [];
beforeAll(() => { window.React = React; loadAlloModule('view_glossary_module.js'); });
afterEach(() => {
  cleanups.splice(0).reverse().forEach(fn => fn());
  for (const key of ['__alloInspectGlossaryAudio', '__alloResolveGlossaryAudio', '__alloRegenerateGlossaryAudio']) delete window[key];
  vi.restoreAllMocks();
});

function mount(overrides = {}) {
  const seed = glossaryMediaProps();
  const data = [seed.generatedContent.data[0],
    { entryId: 'stem', term: 'Stem', def: 'Supports a plant.', translations: { French: 'Tige' } },
    { entryId: 'root', term: 'Root', def: 'Absorbs water.', translations: { French: 'Racine' } }];
  const props = glossaryMediaProps({ isEditingGlossary: true,
    generatedContent: { ...seed.generatedContent, data },
    filteredGlossaryData: data.map((item, index) => ({ ...item, _originalIdx: index })), ...overrides });
  const container = document.createElement('div'); document.body.append(container);
  const root = ReactDOMClient.createRoot(container);
  const render = () => act(() => root.render(React.createElement(window.AlloModules.GlossaryView, props)));
  render();
  cleanups.push(() => { act(() => root.unmount()); container.remove(); });
  return { container, props, rerender: next => { Object.assign(props, next); render(); } };
}
const toggle = view => view.container.querySelector('button[aria-controls="glossary-edit-audio-review-content"]');
const panel = view => view.container.querySelector('#glossary-edit-audio-review-content');
async function click(button) { expect(button).toBeTruthy(); await act(async () => button.click()); }
const deferred = () => { let resolve; const promise = new Promise(yes => { resolve = yes; }); return { promise, resolve }; };

describe('glossary audio review disclosure', () => {
  it('starts collapsed without inspecting every entry, and exposes a named toggle', async () => {
    window.__alloInspectGlossaryAudio = vi.fn(() => ({ status: 'ready' }));
    const view = mount();
    expect(toggle(view).textContent).toBe('Review and prepare audio');
    expect(toggle(view).getAttribute('aria-expanded')).toBe('false');
    expect(panel(view).hidden).toBe(true);
    expect(panel(view).querySelectorAll('article')).toHaveLength(0);
    expect(window.__alloInspectGlossaryAudio).not.toHaveBeenCalled();
    const help = view.container.querySelector('#' + toggle(view).getAttribute('aria-describedby'));
    expect(help.textContent).toContain('terms, definitions, and translations');
    expect(help.textContent).toContain('Search and filters');
    toggle(view).focus(); await click(toggle(view));
    expect(toggle(view).getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(toggle(view));
    expect(panel(view).hidden).toBe(false);
    expect(panel(view).querySelectorAll('article')).toHaveLength(3);
    expect(panel(view).textContent).toContain('Showing 3 of 3 words.');
    window.__alloInspectGlossaryAudio.mockClear();
    await click(toggle(view));
    expect(panel(view).hidden).toBe(true);
    expect(panel(view).querySelectorAll('article')).toHaveLength(0);
    expect(window.__alloInspectGlossaryAudio).not.toHaveBeenCalled();
  });

  it('reviews only filtered words and keeps their original audio action indices', async () => {
    window.__alloInspectGlossaryAudio = vi.fn(() => ({ status: 'ready' }));
    window.__alloResolveGlossaryAudio = vi.fn(async () => null);
    const handleSpeak = vi.fn();
    const view = mount({ handleSpeak });
    view.rerender({ filteredGlossaryData: [view.props.filteredGlossaryData[2]], glossarySearchTerm: 'root' });
    await click(toggle(view));
    const articles = panel(view).querySelectorAll('article');
    expect(articles).toHaveLength(1);
    expect(articles[0].querySelector('h4').textContent).toBe('Root');
    expect(panel(view).textContent).toContain('Showing 1 of 3 words.');
    expect(window.__alloInspectGlossaryAudio.mock.calls.every(([request]) => request.entryId === 'root')).toBe(true);
    const groups = articles[0].querySelectorAll('[role="group"]');
    expect(groups).toHaveLength(3);
    await click(groups[0].querySelector('button'));
    expect(handleSpeak).toHaveBeenLastCalledWith('Root', 'audio-review-term-2');
    await click(groups[1].querySelector('button'));
    expect(handleSpeak).toHaveBeenLastCalledWith('Root: Absorbs water.', 'audio-review-definition-2');
    await click(groups[2].querySelector('button'));
    expect(handleSpeak).toHaveBeenLastCalledWith('Racine', 'audio-review-translation-2-French');
  });

  it('stays expanded across edits and filter changes, and explains an empty result', async () => {
    window.__alloInspectGlossaryAudio = vi.fn(() => ({ status: 'missing' }));
    const view = mount(); await click(toggle(view));
    const edited = { ...view.props.generatedContent.data[0], def: 'An edited definition.' };
    view.rerender({ generatedContent: { ...view.props.generatedContent, data: [edited, ...view.props.generatedContent.data.slice(1)] },
      filteredGlossaryData: [{ ...edited, _originalIdx: 0 }] });
    expect(toggle(view).getAttribute('aria-expanded')).toBe('true');
    expect(panel(view).textContent).toContain('An edited definition.');
    window.__alloInspectGlossaryAudio.mockClear();
    view.rerender({ filteredGlossaryData: [], glossarySearchTerm: 'no-match' });
    expect(toggle(view).getAttribute('aria-expanded')).toBe('true');
    expect(panel(view).textContent).toContain('Showing 0 of 3 words.');
    expect(panel(view).textContent).toContain('No words match the current search and filters.');
    expect(panel(view).querySelectorAll('article')).toHaveLength(0);
    expect(window.__alloInspectGlossaryAudio).not.toHaveBeenCalled();
  });

  it.each(['collapsed', 'filtered out'])('keeps an active clip cancelable when its normal control is %s', async hiddenBy => {
    const pending = deferred(), addToast = vi.fn(); let signal;
    window.__alloInspectGlossaryAudio = vi.fn(() => ({ status: 'missing' }));
    window.__alloRegenerateGlossaryAudio = vi.fn((_request, options) => { signal = options.signal; return pending.promise; });
    const view = mount({ addToast }); await click(toggle(view));
    const allWords = view.props.filteredGlossaryData;
    const clipButton = () => panel(view).querySelector('article [role="group"]')?.querySelectorAll('button')[1];
    const fallback = () => [...view.container.querySelectorAll('button')].find(button => button.textContent === 'Cancel audio preparation') || null;
    const region = view.container.querySelector('#glossary-edit-audio-review');
    async function hideActiveClip() {
      if (hiddenBy === 'collapsed') await click(toggle(view));
      else view.rerender({ filteredGlossaryData: [allWords[2]], glossarySearchTerm: 'root' });
    }
    async function showActiveClip() {
      if (hiddenBy === 'collapsed') await click(toggle(view));
      else view.rerender({ filteredGlossaryData: allWords, glossarySearchTerm: '' });
    }

    await click(clipButton());
    expect(signal.aborted).toBe(false);
    expect(clipButton().textContent).toContain('Cancel');
    expect(fallback()).toBeTruthy();
    await hideActiveClip();
    expect(fallback()).toBeTruthy();
    expect(fallback().textContent).toBe('Cancel audio preparation');
    expect(fallback().disabled).toBe(false);
    expect(panel(view).contains(fallback())).toBe(false);
    const message = [...region.querySelectorAll('[role="status"]')].find(element => element.textContent.includes('Leaf'));
    expect(message).toBeTruthy();
    expect(panel(view).contains(message)).toBe(false);

    await showActiveClip();
    expect(fallback()).toBeTruthy();
    expect(clipButton().textContent).toContain('Cancel');
    expect(clipButton().disabled).toBe(false);
    expect(signal.aborted).toBe(false);
    await hideActiveClip();
    fallback().focus();
    await click(fallback());
    expect(signal.aborted).toBe(true);
    expect(fallback()).toBeNull();
    expect(document.activeElement).toBe(toggle(view));
    await showActiveClip();
    expect(clipButton().textContent).toContain('Generate');
    expect(clipButton().disabled).toBe(false);
    const stoppedMessage = [...region.querySelectorAll('[role="status"]')].map(element => element.textContent).join(' ');
    addToast.mockClear();
    await act(async () => pending.resolve('blob:cancelled-hidden-clip'));
    expect(addToast).not.toHaveBeenCalled();
    expect([...region.querySelectorAll('[role="status"]')].map(element => element.textContent).join(' ')).toBe(stoppedMessage);
    expect(clipButton().textContent).toContain('Generate');
  });

  it.each(['resource', 'role', 'editing'])('resets the disclosure after changing %s', async change => {
    const view = mount(); await click(toggle(view));
    if (change === 'resource') {
      view.rerender({ generatedContent: { ...view.props.generatedContent, id: 'another-glossary' } });
    } else if (change === 'role') {
      view.rerender({ isTeacherMode: false });
      expect(toggle(view)).toBeNull();
      view.rerender({ isTeacherMode: true });
    } else {
      view.rerender({ isEditingGlossary: false });
      expect(toggle(view)).toBeNull();
      view.rerender({ isEditingGlossary: true });
    }
    expect(toggle(view).getAttribute('aria-expanded')).toBe('false');
    expect(panel(view).hidden).toBe(true);
    expect(panel(view).querySelectorAll('article')).toHaveLength(0);
  });
});
