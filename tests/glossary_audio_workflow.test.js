import { createRequire } from 'node:module';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const { glossaryMediaProps } = require('./helpers/glossary_media_fixture.cjs');
const cleanups = [];
const translations = {
  'common.listen': 'Listen', 'common.stop': 'Stop', 'common.generate': 'Generate',
  'common.regenerate': 'Regenerate', 'common.error': 'Error', 'common.cancel': 'Cancel',
  'flashcards.front_label_term': 'Term', 'flashcards.back_label_def': 'Definition',
  'glossary.more_tools': 'More tools', 'glossary.edit_translation': 'Translation',
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
  for (const key of ['__alloResolveGlossaryAudio', '__alloInspectGlossaryAudio', '__alloRegenerateGlossaryAudio', '__alloPrepareGlossaryAudio']) delete window[key];
  vi.restoreAllMocks();
});

function mount(overrides = {}) {
  const props = glossaryMediaProps({ t: translate, isEditingGlossary: true, ...overrides });
  props.filteredGlossaryData = props.generatedContent.data.map((item, _originalIdx) => ({ ...item, _originalIdx }));
  const container = document.createElement('div'); document.body.append(container);
  const root = ReactDOMClient.createRoot(container);
  act(() => root.render(React.createElement(window.AlloModules.GlossaryView, props)));
  cleanups.push(() => { act(() => root.unmount()); container.remove(); });
  return { container, props };
}
async function click(button) {
  expect(button).toBeTruthy();
  await act(async () => button.click());
}
async function openReview(view) {
  await click(view.container.querySelector('[data-glossary-audio-review-toggle]'));
}
async function openTools(view) {
  await click([...view.container.querySelectorAll('button')].find(button => button.textContent.includes('More tools')));
}
function audioGroup(view, field = 'Term') {
  const group = [...view.container.querySelectorAll('#glossary-edit-audio-review [role="group"]')]
    .find(element => element.getAttribute('aria-label')?.includes(field + ' Leaf'));
  expect(group, 'audio group for ' + field).toBeTruthy();
  return group;
}
const generationButton = group => group.querySelectorAll('button')[1];
const preparationButton = view => view.container.querySelector('[data-help-key="glossary_prepare_audio"]');
const preparationStatus = view => view.container.querySelector('#glossary-audio-prep-status')?.textContent || '';

describe('glossary audio preparation feedback and cancellation', () => {
  it.each([
    ['missing', 'Not prepared', false],
    ['ready', 'Ready', true],
    ['stale', 'Needs update', false],
    ['corrupt', 'Audio unavailable', false],
  ])('describes %s audio without implying an active operation', async (status, label, playable) => {
    window.__alloInspectGlossaryAudio = vi.fn(() => ({ status }));
    const view = mount(); await openReview(view);
    const group = audioGroup(view);
    expect(group.textContent).toContain(label);
    expect(group.textContent).not.toContain('Processing');
    expect(group.querySelector('button').disabled).toBe(!playable);
    expect(generationButton(group).disabled).toBe(false);
  });

  it('explains empty fields and disables their audio actions', async () => {
    const initial = glossaryMediaProps().generatedContent;
    const view = mount({ generatedContent: { ...initial, data: [{ ...initial.data[0], def: '  ' }] } });
    await openReview(view);
    const group = audioGroup(view, 'Definition');
    expect(group.textContent).toContain('No text');
    expect([...group.querySelectorAll('button')].every(button => button.disabled)).toBe(true);
  });

  it('names translation actions with their language', async () => {
    const initial = glossaryMediaProps().generatedContent;
    const view = mount({
      generatedContent: { ...initial, data: [{ ...initial.data[0], translations: { French: 'Feuille', Arabic: 'ورقة' } }] },
      selectedLanguages: ['French', 'Arabic'], displayLanguages: ['French', 'Arabic'],
    });
    await openReview(view);
    for (const language of ['French', 'Arabic']) {
      const group = audioGroup(view, language + ' translation');
      for (const button of group.querySelectorAll('button')) {
        expect(button.getAttribute('aria-label')).toContain(language + ' translation');
        expect(button.getAttribute('aria-label')).toContain('Leaf');
      }
    }
  });

  it('preserves partial preparation counts and explains retry', async () => {
    const addToast = vi.fn();
    window.__alloPrepareGlossaryAudio = vi.fn(async () => ({ ok: false, ready: 2, total: 3, generated: 2, failed: 1, remaining: 1, error: 'Provider unavailable' }));
    const view = mount({ addToast }); await openTools(view);
    const button = preparationButton(view);
    expect(button.getAttribute('aria-label')).toBe('Prepare audio');
    await click(button);
    expect(preparationStatus(view)).toBe('2 of 3 audio clips ready. Some clips could not be prepared. Try again to finish.');
    expect(button.disabled).toBe(false);
    expect(addToast).not.toHaveBeenCalledWith(expect.any(String), 'success');
  });

  it('keeps the preparation control focused and rejects stale progress and completion after stop and retry', async () => {
    const requests = [];
    window.__alloPrepareGlossaryAudio = vi.fn((_config, progress, options) => {
      const request = { ...deferred(), progress, signal: options.signal }; requests.push(request); return request.promise;
    });
    const view = mount(); await openTools(view);
    const button = preparationButton(view); button.focus();
    await click(button);
    expect(preparationButton(view)).toBe(button);
    expect(button.getAttribute('aria-label')).toBe('Stop preparing audio');
    expect(document.activeElement).toBe(button);
    await act(async () => requests[0].progress({ done: 1, total: 3 }));
    await click(button);
    expect(requests[0].signal.aborted).toBe(true);
    expect(button.getAttribute('aria-label')).toBe('Prepare audio');
    const stoppedMessage = preparationStatus(view);
    await act(async () => requests[0].progress({ done: 99, total: 100 }));
    expect(preparationStatus(view)).toBe(stoppedMessage);

    await click(button);
    expect(requests).toHaveLength(2);
    const retryMessage = preparationStatus(view);
    await act(async () => requests[0].resolve({ ok: true, ready: 100, total: 100 }));
    expect(preparationStatus(view)).toBe(retryMessage);
    expect(button.getAttribute('aria-label')).toBe('Stop preparing audio');
    await act(async () => requests[1].resolve({ ok: true, ready: 3, total: 3, generated: 2 }));
    expect(preparationStatus(view)).toContain('3');
    expect(preparationStatus(view)).not.toContain('100');
    expect(button.getAttribute('aria-label')).toBe('Prepare audio');
  });

  it('cancels a single clip and ignores its late completion while a retry is active', async () => {
    const requests = [], addToast = vi.fn();
    window.__alloInspectGlossaryAudio = vi.fn(() => ({ status: 'missing' }));
    window.__alloRegenerateGlossaryAudio = vi.fn((_request, options) => {
      const request = { ...deferred(), signal: options.signal }; requests.push(request); return request.promise;
    });
    const view = mount({ addToast }); await openReview(view);
    const group = audioGroup(view), button = generationButton(group); button.focus();
    await click(button);
    expect(generationButton(group)).toBe(button);
    expect(button.textContent).toContain('Cancel');
    expect(button.disabled).toBe(false);
    expect(group.textContent).toContain('Preparing audio');
    await click(button);
    expect(requests[0].signal.aborted).toBe(true);
    expect(button.textContent).toContain('Generate');
    await click(button);
    expect(requests).toHaveLength(2); addToast.mockClear();
    await act(async () => requests[0].resolve('blob:cancelled-audio'));
    expect(button.textContent).toContain('Cancel');
    expect(addToast).not.toHaveBeenCalled();
    await act(async () => requests[1].resolve('blob:current-audio'));
    expect(button.textContent).not.toContain('Cancel');
    expect(addToast).toHaveBeenCalledWith(expect.any(String), 'success');
  });

  it('prevents clip generation during batch preparation and restores controls after stopping', async () => {
    const request = deferred();
    window.__alloPrepareGlossaryAudio = vi.fn(() => request.promise);
    window.__alloRegenerateGlossaryAudio = vi.fn();
    const view = mount(); await openTools(view); await openReview(view);
    const generate = generationButton(audioGroup(view));
    await click(preparationButton(view));
    expect(generate.disabled).toBe(true);
    await click(generate);
    expect(window.__alloRegenerateGlossaryAudio).not.toHaveBeenCalled();
    await click(preparationButton(view));
    expect(generate.disabled).toBe(false);
    await act(async () => request.resolve({ ok: false, cancelled: true }));
  });

  it('prevents batch preparation during clip generation and restores controls after cancellation', async () => {
    const request = deferred();
    window.__alloRegenerateGlossaryAudio = vi.fn(() => request.promise);
    window.__alloPrepareGlossaryAudio = vi.fn();
    const view = mount(); await openTools(view); await openReview(view);
    const generate = generationButton(audioGroup(view));
    await click(generate);
    expect(preparationButton(view).disabled).toBe(true);
    await click(preparationButton(view));
    expect(window.__alloPrepareGlossaryAudio).not.toHaveBeenCalled();
    await click(generate);
    expect(preparationButton(view).disabled).toBe(false);
    await act(async () => request.resolve(null));
  });
});
