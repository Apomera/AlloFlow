import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, act, mountGame } from './helpers/games_live_harness.js';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const { glossaryMediaProps } = require('./helpers/glossary_media_fixture.cjs');
const cleanups = [];
beforeAll(() => { window.React = React; loadAlloModule('view_glossary_module.js'); loadAlloModule('read_aloud_audio_service_module.js'); });
afterEach(() => {
  cleanups.splice(0).reverse().forEach(fn => fn());
  delete window.__alloResolveGlossaryAudio;
  delete window.__alloInspectGlossaryAudio;
  delete window.__alloRegenerateGlossaryAudio;
  vi.restoreAllMocks();
});
function mount(overrides) {
  const props = glossaryMediaProps(overrides);
  const container = document.createElement('div'); document.body.append(container);
  const root = ReactDOMClient.createRoot(container);
  act(() => root.render(React.createElement(window.AlloModules.GlossaryView, props)));
  cleanups.push(() => { act(() => root.unmount()); container.remove(); });
  return {
    container, props,
    rerender: extra => {
      Object.assign(props, extra);
      act(() => root.render(React.createElement(window.AlloModules.GlossaryView, props)));
    },
  };
}
async function click(container, label) {
  const button = container.querySelector('[aria-label="' + label + '"]');
  expect(button).toBeTruthy();
  await act(async () => button.click());
}

describe('glossary audio icon labels', () => {
  const labels = [
    'Read term: Leaf', 'Download audio for term: Leaf',
    'Read definition for Leaf', 'Download definition audio for Leaf',
    'Read French translation of Leaf', 'Download French translation audio for Leaf',
  ];
  it.each([
    ['idle', {}],
    ['downloading audio', { downloadingContentId: 'dl-term-0' }],
  ])('gives each %s icon a contextual accessible name and matching tooltip', (_state, extra) => {
    const { container } = mount(extra);
    for (const label of labels) {
      const control = [...container.querySelectorAll('[data-glossary-word-list] button')].find(button => button.getAttribute('aria-label') === label);
      expect(control, label).toBeTruthy();
      expect(control.title).toBe(label);
      expect(control.type).toBe('button');
      expect(control.getAttribute('aria-label')).not.toMatch(/^glossary\./);
    }
  });

  const playbackControls = [
    ['term-0', 'Read term: Leaf', 'Stop reading term: Leaf'],
    ['def-0', 'Read definition for Leaf', 'Stop reading definition for Leaf'],
    ['trans-0-French', 'Read French translation of Leaf', 'Stop reading French translation of Leaf'],
  ];
  describe.each([
    ['playing', false],
    ['preparing', true],
  ])('%s audio', (_state, isGeneratingAudio) => {
    it.each(playbackControls)('changes %s to an enabled Stop action and restores Read afterward', async (playingContentId, readLabel, stopLabel) => {
      const stopPlayback = vi.fn(), handleSpeak = vi.fn();
      const setPlayingContentId = vi.fn(), setIsGeneratingAudio = vi.fn();
      const { container, rerender } = mount({ stopPlayback, handleSpeak, setPlayingContentId, setIsGeneratingAudio });
      const button = [...container.querySelectorAll('button')].find(control => control.getAttribute('aria-label') === readLabel);
      button.focus();
      rerender({ playingContentId, isGeneratingAudio });
      expect(button.getAttribute('aria-label')).toBe(stopLabel);
      expect(button.title).toBe(stopLabel);
      expect(button.disabled).toBe(false);
      expect(document.activeElement).toBe(button);
      expect(button.hasAttribute('aria-pressed')).toBe(false);
      for (const [otherId, otherLabel] of playbackControls) {
        if (otherId === playingContentId) continue;
        const otherButton = [...container.querySelectorAll('button')].find(control => control.getAttribute('aria-label') === otherLabel);
        expect(otherButton.disabled).toBe(isGeneratingAudio);
      }
      await click(container, stopLabel);
      expect(stopPlayback).toHaveBeenCalledOnce();
      expect(setPlayingContentId).toHaveBeenCalledWith(null);
      expect(setIsGeneratingAudio).toHaveBeenCalledWith(false);
      expect(handleSpeak).not.toHaveBeenCalled();
      rerender({ playingContentId: null, isGeneratingAudio: false });
      expect(button.getAttribute('aria-label')).toBe(readLabel);
      expect(button.title).toBe(readLabel);
      expect(document.activeElement).toBe(button);
    });
  });

  it.each([null, 'blob:prepared-audio'])('does not restart stopped audio when a pending saved-audio lookup returns %s', async resolvedAudio => {
    let finishLookup;
    window.__alloResolveGlossaryAudio = vi.fn(() => new Promise(resolve => { finishLookup = resolve; }));
    const audioConstructor = vi.spyOn(globalThis, 'Audio');
    const handleSpeak = vi.fn(), stopPlayback = vi.fn();
    const { container, rerender } = mount({ handleSpeak, stopPlayback });
    await click(container, 'Read term: Leaf');
    expect(window.__alloResolveGlossaryAudio).toHaveBeenCalledOnce();
    rerender({ playingContentId: 'term-0', isGeneratingAudio: true });
    stopPlayback.mockClear();
    await click(container, 'Stop reading term: Leaf');
    expect(stopPlayback).toHaveBeenCalledOnce();
    rerender({ playingContentId: null, isGeneratingAudio: false });
    await act(async () => { finishLookup(resolvedAudio); });
    expect(audioConstructor).not.toHaveBeenCalled();
    expect(handleSpeak).not.toHaveBeenCalled();
    expect(container.querySelector('[aria-label="Read term: Leaf"]').title).toBe('Read term: Leaf');
  });

  it('uses translated labels with the actual term and translation language in both name and tooltip', () => {
    const translations = {
      'glossary.read_term_aria': 'Lire le terme : {term}',
      'glossary.download_term_audio_aria': 'Télécharger le son du terme : {term}',
      'glossary.read_definition_aria': 'Lire la définition de {term}',
      'glossary.download_definition_audio_aria': 'Télécharger la définition audio de {term}',
      'glossary.read_translation_aria': 'Lire la traduction {lang} de {term}',
      'glossary.download_translation_audio_aria': 'Télécharger la traduction audio {lang} de {term}',
    };
    const { container } = mount({ t: key => translations[key] || key });
    for (const template of Object.values(translations)) {
      const label = template.replace('{term}', 'Leaf').replace('{lang}', 'French');
      const control = [...container.querySelectorAll('[data-glossary-word-list] button')].find(button => button.getAttribute('aria-label') === label);
      expect(control, label).toBeTruthy();
      expect(control.title).toBe(label);
    }
  });

  it('identifies the download icon next to each word as an audio action', async () => {
    const handleDownloadAudio = vi.fn();
    const { container } = mount({ handleDownloadAudio });
    await click(container, 'Download audio for term: Leaf');
    expect(handleDownloadAudio).toHaveBeenCalledWith('Leaf', 'term-0-audio', 'dl-term-0');
  });

  it.each([
    ['term-0', 'glossary.stop_term_aria', 'Arrêter la lecture du terme : {term}'],
    ['def-0', 'glossary.stop_definition_aria', 'Arrêter la lecture de la définition de {term}'],
    ['trans-0-French', 'glossary.stop_translation_aria', 'Arrêter la lecture de la traduction {lang} de {term}'],
  ])('uses the translated Stop label for %s', (playingContentId, key, template) => {
    const { container } = mount({ playingContentId, t: requestedKey => requestedKey === key ? template : requestedKey });
    const expected = template.replace('{term}', 'Leaf').replace('{lang}', 'French');
    const button = [...container.querySelectorAll('button')].find(control => control.getAttribute('aria-label') === expected);
    expect(button).toBeTruthy();
    expect(button.title).toBe(expected);
  });
});

describe('glossary definition speech', () => {
  it('starts live fallback speech and downloads with the term', async () => {
    const handleSpeak = vi.fn(), handleDownloadAudio = vi.fn();
    const { container } = mount({ handleSpeak, handleDownloadAudio });
    await click(container, 'Read definition for Leaf');
    expect(handleSpeak).toHaveBeenCalledWith('Leaf: A plant part that captures sunlight.', 'def-0');
    await click(container, 'Download definition audio for Leaf');
    expect(handleDownloadAudio).toHaveBeenCalledWith('Leaf: A plant part that captures sunlight.', 'def-0-audio', 'dl-def-0');
  });
  it('uses the same term-first text for saved audio lookup and fallback', async () => {
    const handleSpeak = vi.fn();
    window.__alloResolveGlossaryAudio = vi.fn(async () => null);
    const { container } = mount({ handleSpeak });
    await click(container, 'Read definition for Leaf');
    expect(window.__alloResolveGlossaryAudio).toHaveBeenCalledWith(expect.objectContaining({ entryId: 'leaf', field: 'definition', language: 'English', spokenText: 'Leaf: A plant part that captures sunlight.' }), expect.any(Object));
    expect(handleSpeak).toHaveBeenCalledWith('Leaf: A plant part that captures sunlight.', 'def-0');
  });
  it('keeps edit-review inspection and regeneration consistent with prepared text', async () => {
    window.__alloInspectGlossaryAudio = vi.fn(() => ({ status: 'missing' }));
    window.__alloRegenerateGlossaryAudio = vi.fn(async () => 'blob:prepared');
    const { container } = mount({ isEditingGlossary: true });
    const requests = window.__alloInspectGlossaryAudio.mock.calls.map(([request]) => request);
    expect(requests).toContainEqual(expect.objectContaining({ field: 'definition', spokenText: 'Leaf: A plant part that captures sunlight.' }));
    const definitionGroup = [...container.querySelectorAll('#glossary-edit-audio-review [role="group"]')].find(el => el.getAttribute('aria-label').includes('flashcards.back_label_def'));
    expect(definitionGroup).toBeTruthy();
    await act(async () => definitionGroup.querySelectorAll('button')[1].click());
    expect(window.__alloRegenerateGlossaryAudio).toHaveBeenCalledWith(expect.objectContaining({ field: 'definition', spokenText: 'Leaf: A plant part that captures sunlight.' }), expect.any(Object));
  });
  it.each([
    ['Leaf', 'Leaf: A plant part.', 'Leaf: A plant part.'],
    ['Leaf', 'Leaf is part of a plant.', 'Leaf is part of a plant.'],
    ['Cell', 'Cellular structures have different jobs.', 'Cell: Cellular structures have different jobs.'],
    ['Feuille', 'Une partie de la plante.', 'Feuille: Une partie de la plante.'],
    ['Leaf', '', ''],
  ])('formats %s / %s without repeating an existing term prefix', (term, definition, expected) => {
    expect(window.AlloModules.formatGlossaryDefinitionSpeech(term, definition)).toBe(expected);
  });
  it('enumerates term-first prepared audio without changing translations', () => {
    const segments = window.AlloModules.enumerateGlossaryReadAloudSegments(glossaryMediaProps().generatedContent);
    expect(segments.find(item => item.field === 'definition').spokenText).toBe('Leaf: A plant part that captures sunlight.');
    expect(segments.find(item => item.field === 'translation').spokenText).toBe('Feuille: Une partie de la plante qui capte la lumière.');
  });
});

describe('larger adjustable glossary and concept-sort visuals', () => {
  it('renders 192px glossary visuals and honors a smaller chosen size', () => {
    expect(mount().container.querySelector('td img').style.width).toBe('192px');
    expect(mount({ glossaryImageSize: 96 }).container.querySelector('td img').style.width).toBe('96px');
  });
  it('renders 128px concept-sort game images by default and honors custom scaling', () => {
    const data = { categories: [{ id: 'plants', label: 'Plants' }], items: [{ id: 'leaf', content: 'Leaf', categoryId: 'plants', image: glossaryMediaProps().generatedContent.data[0].image }] };
    const game = mountGame('ConceptSortGame', { data, onClose: vi.fn() }); cleanups.push(game.unmount);
    expect(game.container.querySelector('[data-help-key="concept_sort_card_item"] img').style.width).toBe('128px');
    game.rerender({ data, onClose: vi.fn(), imageScale: 0.75 });
    expect(game.container.querySelector('[data-help-key="concept_sort_card_item"] img').style.width).toBe('48px');
  });
  it('preserves an existing concept-sort size preference while increasing the new-user default', () => {
    const host = readFileSync('AlloFlowANTI.txt', 'utf8');
    const start = host.indexOf('const [conceptSortImageScale, setConceptSortImageScale] = useState(() => {');
    const body = host.slice(start, host.indexOf('\n  });', start)).split('useState(() => {')[1];
    const initialSize = value => new Function('localStorage', body)({ getItem: () => value });
    expect(initialSize(null)).toBe(2);
    expect(initialSize('1.25')).toBe(1.25);
    expect(initialSize('bad')).toBe(2);
  });
});
