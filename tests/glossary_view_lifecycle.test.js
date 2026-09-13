import { createRequire } from 'node:module';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
const { glossaryMediaProps } = require('./helpers/glossary_media_fixture.cjs');
const cleanups = [];
const deferred = () => { let resolve; const promise = new Promise(yes => { resolve = yes; }); return { promise, resolve }; };
beforeAll(() => { window.React = React; loadAlloModule('view_glossary_module.js'); });
afterEach(() => {
  cleanups.splice(0).reverse().forEach(fn => fn());
  for (const key of ['__alloResolveGlossaryAudio', '__alloRegenerateGlossaryAudio', '__alloInspectGlossaryAudio', '__alloPrepareGlossaryAudio']) delete window[key];
  delete window.AlloDictionary; vi.unstubAllGlobals();
  vi.useRealTimers(); vi.restoreAllMocks();
});
function mount(overrides = {}) {
  let current;
  const container = document.createElement('div'); document.body.append(container);
  const root = ReactDOMClient.createRoot(container);
  function render(next) {
    current = glossaryMediaProps({ setIsFlashcardFlipped: vi.fn(), setFlashcardFeedback: vi.fn(), ...next });
    current.filteredGlossaryData = current.generatedContent.data.map((item, index) => ({ ...item, _originalIdx: index }));
    act(() => root.render(React.createElement(window.AlloModules.GlossaryView, current)));
  }
  render(overrides);
  const unmount = () => { act(() => root.unmount()); container.remove(); };
  cleanups.push(unmount);
  return { container, rerender: render, props: () => current };
}
async function click(element) { expect(element).toBeTruthy(); await act(async () => element.click()); }
function switchToB(view, extra = {}) {
  const old = view.props();
  view.rerender({ ...old, generatedContent: { ...old.generatedContent, id: 'glossary-b', data: [{ ...old.generatedContent.data[0], term: 'Root', entryId: 'root' }] }, ...extra });
}
async function more(view) { await click([...view.container.querySelectorAll('button')].find(button => button.textContent.includes('glossary.more_tools'))); }

describe('glossary media cannot leak across resource transitions', () => {
  it('stops dictionary recordings when another glossary opens', async () => {
    const players = [];
    class FakeAudio { constructor() { this.pause = vi.fn(); players.push(this); } addEventListener() {} play() { return Promise.resolve(); } }
    vi.stubGlobal('Audio', FakeAudio);
    window.AlloDictionary = { getCached: () => ({ word: 'leaf', audio: 'recording.mp3', meanings: [{ definitions: [{ definition: 'A plant part.' }] }] }) };
    const view = mount({ isInteractiveFlashcards: true, isFlashcardFlipped: true, flashcardMode: 'standard' });
    await click(view.container.querySelector('[aria-label="glossary.popups.hear_real"]'));
    expect(players).toHaveLength(1); switchToB(view);
    expect(players[0].pause).toHaveBeenCalled();
  });
  it('drops a delayed audio lookup without playing or falling back in the next glossary', async () => {
    const lookup = deferred(), handleSpeak = vi.fn(), setPlayingContentId = vi.fn();
    window.__alloResolveGlossaryAudio = vi.fn(() => lookup.promise);
    const view = mount({ handleSpeak, setPlayingContentId });
    await click(view.container.querySelector('[aria-label="Read definition for Leaf"]'));
    switchToB(view); handleSpeak.mockClear(); setPlayingContentId.mockClear();
    await act(async () => lookup.resolve(null));
    expect(handleSpeak).not.toHaveBeenCalled(); expect(setPlayingContentId).not.toHaveBeenCalled();
  });
  it('cancels preparation and ignores old progress and completion after switching', async () => {
    const preparation = deferred(), addToast = vi.fn(); let progress, signal;
    window.__alloPrepareGlossaryAudio = vi.fn((config, onProgress, options) => { progress = onProgress; signal = options.signal; return preparation.promise; });
    const view = mount({ addToast }); await more(view);
    await click(view.container.querySelector('[data-help-key="glossary_prepare_audio"]'));
    switchToB(view); expect(signal.aborted).toBe(true); addToast.mockClear();
    await act(async () => { progress({ done: 99, total: 100 }); preparation.resolve({ ok: true, ready: 100, total: 100 }); });
    await more(view);
    expect(view.container.textContent).not.toContain('100/100');
    expect(view.container.querySelector('[data-help-key="glossary_prepare_audio"]').disabled).toBe(false);
    expect(addToast).not.toHaveBeenCalled();
  });
  it('ignores late audio regeneration after the definition was edited', async () => {
    const request = deferred(), addToast = vi.fn();
    window.__alloInspectGlossaryAudio = () => ({ status: 'missing' });
    window.__alloRegenerateGlossaryAudio = vi.fn(() => request.promise);
    const view = mount({ isEditingGlossary: true, addToast });
    const group = [...view.container.querySelectorAll('#glossary-edit-audio-review [role="group"]')].find(el => el.getAttribute('aria-label').includes('flashcards.back_label_def'));
    await click(group.querySelectorAll('button')[1]);
    const old = view.props(); view.rerender({ ...old, generatedContent: { ...old.generatedContent, data: [{ ...old.generatedContent.data[0], def: 'An updated definition.' }] } });
    expect(window.__alloRegenerateGlossaryAudio.mock.calls[0][1].signal.aborted).toBe(true);
    addToast.mockClear(); await act(async () => request.resolve('blob:old-audio'));
    expect(addToast).not.toHaveBeenCalled();
  });
  it('clears the previous glossary’s open tool panel on a resource switch', async () => {
    const view = mount(); await more(view);
    expect(view.container.querySelector('#glossary-teacher-tools')).toBeTruthy();
    switchToB(view);
    expect(view.container.querySelector('#glossary-teacher-tools')).toBeNull();
  });
  it('safely renders a shorter flashcard deck and clamps the stale host index', () => {
    const setFlashcardIndex = vi.fn();
    const view = mount({ isInteractiveFlashcards: true, flashcardIndex: 9, setFlashcardIndex });
    expect(view.container.querySelector('[role="dialog"]')).toBeTruthy();
    expect(setFlashcardIndex).toHaveBeenCalledWith(0);
    expect(view.container.textContent).toContain('Leaf');
  });
  it('cancels delayed flashcard navigation when another resource opens', async () => {
    vi.useFakeTimers();
    const initial = glossaryMediaProps().generatedContent;
    const setFlashcardIndex = vi.fn();
    const view = mount({ isInteractiveFlashcards: true, flashcardIndex: 0, setFlashcardIndex,
      generatedContent: { ...initial, data: [initial.data[0], { ...initial.data[0], entryId: 'second', term: 'Root' }] } });
    const dots = [...view.container.querySelectorAll('button[aria-current],button[aria-label^="common.progress 2:"]')];
    await click(dots.find(button => button.getAttribute('aria-label').includes('2:')));
    switchToB(view, { isInteractiveFlashcards: false, flashcardIndex: 0 }); setFlashcardIndex.mockClear();
    act(() => vi.advanceTimersByTime(500));
    expect(setFlashcardIndex).not.toHaveBeenCalled();
  });
});

describe('glossary reading and editing controls', () => {
  it('keeps media editing out of reading mode and exposes it through one Edit toggle', async () => {
    const toggle = vi.fn(), view = mount({ handleToggleIsEditingGlossary: toggle });
    expect(view.container.querySelector('[data-help-key="glossary_add_term"]')).toBeNull();
    expect(view.container.querySelector('[data-help-key="glossary_regen_image"]').closest('[hidden]').style.display).toBe('none');
    expect(view.container.querySelector('[aria-label="Read definition for Leaf"]')).toBeTruthy();
    await click(view.container.querySelector('[data-help-key="glossary_edit"]'));
    expect(toggle).toHaveBeenCalledOnce();
    view.rerender({ ...view.props(), isEditingGlossary: true });
    expect(view.container.querySelector('[data-help-key="glossary_add_term"]')).toBeTruthy();
    expect(view.container.querySelector('[data-help-key="glossary_regen_image"]').closest('[hidden]')).toBeNull();
  });
  it('provides a named keyboard-scrollable table and a mobile scroll hint', () => {
    const view = mount();
    const region = view.container.querySelector('[role="region"][aria-label="glossary.table_label"]');
    expect(region.tabIndex).toBe(0);
    expect(document.getElementById(region.getAttribute('aria-describedby')).textContent).toBe('glossary.table_scroll_hint');
  });
  it('retains size adjustment and exports without entering edit mode', async () => {
    const view = mount(); await more(view);
    expect(view.container.querySelector('[data-help-key="glossary_image_size"] input')).toBeTruthy();
    expect(view.container.querySelector('[data-help-key="glossary_export_standard"]')).toBeTruthy();
    expect(view.container.querySelector('[data-help-key="glossary_edit"]').getAttribute('aria-pressed')).toBe('false');
  });
  it('does not expose editing to a learner when stale teacher edit state is passed', () => {
    const view = mount({ isTeacherMode: false, isEditingGlossary: true });
    expect(view.container.querySelector('[data-help-key="glossary_edit"]')).toBeNull();
    expect(view.container.querySelector('[data-help-key="glossary_add_term"]')).toBeNull();
    expect(view.container.querySelector('textarea')).toBeNull();
  });
});
