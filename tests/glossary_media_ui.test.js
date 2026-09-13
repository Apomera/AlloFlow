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
  return { container, props };
}
async function click(container, label) {
  const button = container.querySelector('[aria-label="' + label + '"]');
  expect(button).toBeTruthy();
  await act(async () => button.click());
}

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
