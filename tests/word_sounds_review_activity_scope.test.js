import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const act = React.act || require(resolve('desktop/web-app/node_modules/react-dom/test-utils')).act;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let Panel, root, container;

beforeAll(() => {
  window.React = React;
  window.AlloModules ||= {};
  globalThis.Volume2 = () => null;
  delete window.AlloModules.MiscComponentsModule;
  new Function(readFileSync('misc_components_module.js', 'utf8'))();
  Panel = window.WordSoundsReviewPanel;
});

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  container?.remove();
  vi.clearAllTimers();
  vi.useRealTimers();
});

const wordWithUnrelatedGaps = () => ({
  word: 'apple', phonemes: [], ttsReady: true, _fallbackUsed: true,
  _unverifiedWords: ['zapple'],
  activityItems: {
    decoding: { choices: ['apple', 'pear'] },
    read_sentence: { sentence: 'I see an apple.' },
    read_passage: { story: 'There is an apple in the bag.' },
    sentence_match: { sentence: 'The apple is red.', sequence: ['apple'], extras: ['pear'] },
  },
});

async function mount(props = {}) {
  vi.useFakeTimers();
  container = document.createElement('div'); document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(React.createElement(Panel, {
    preloadedWords: [wordWithUnrelatedGaps()], wordFamilySkips: ['apple'],
    t: () => '', onClose: () => {}, onStartActivity: () => {},
    ...props,
  })));
  await act(async () => vi.advanceTimersByTime(0));
}

const gap = name => container.querySelector('[data-review-gap="' + name + '"]');

describe('review readiness follows the selected activities', () => {
  it.each([['syllable_counting'], ['syllable_blending'], ['syllable_counting', 'syllable_blending']])('omits unrelated warnings for %j', async (...activities) => {
    await mount({ activitySequence: activities });
    expect(container.querySelectorAll('[data-review-gap]')).toHaveLength(0);
    expect(container.querySelector('[data-ws-word-family-skips]')).toBeNull();
  });

  it('keeps missing whole-word audio visible for a syllable lesson', async () => {
    await mount({ activitySequence: ['syllable_counting'], preloadedWords: [{ ...wordWithUnrelatedGaps(), ttsReady: false }] });
    expect(gap('audio').textContent).toContain('Words without portable audio: 1');
    expect(gap('rhyme')).toBeNull();
    expect(gap('task')).toBeNull();
  });

  it('uses the standalone activity when there is no selected sequence', async () => {
    await mount({ activitySequence: [], currentActivity: 'syllable_counting' });
    expect(container.querySelectorAll('[data-review-gap]')).toHaveLength(0);
  });

  it('uses the selected sequence instead of a stale standalone activity', async () => {
    await mount({ activitySequence: ['syllable_counting'], currentActivity: 'manipulation' });
    expect(gap('task')).toBeNull();
  });

  it('retains relevant mixed-lesson warnings without offering audio repair for a missing rhyme', async () => {
    const regenerateAudio = vi.fn();
    await mount({ activitySequence: ['rhyming', 'manipulation'], onRegenerateWord: regenerateAudio, onRegenerateManipulationTask: vi.fn() });
    expect(gap('rhyme').textContent).toContain('board is built on-device');
    expect(gap('rhyme').querySelector('button')).toBeNull();
    expect(gap('task').querySelector('button').textContent).toContain('Build tasks');
    expect(gap('images')).toBeNull();
    expect(regenerateAudio).not.toHaveBeenCalled();
  });

  it('checks only the selected connected-text board audio', async () => {
    const word = wordWithUnrelatedGaps();
    word._ttsAssets = { 'i see an apple.': { base64: 'saved' } };
    await mount({ activitySequence: ['read_sentence'], preloadedWords: [word] });
    expect(gap('sentence_audio')).toBeNull();
    expect(gap('tile_images')).toBeNull();
    await act(async () => root.render(React.createElement(Panel, { preloadedWords: [word], activitySequence: ['read_passage'], t: () => '' })));
    expect(gap('sentence_audio')).not.toBeNull();
  });

  it('retains the legacy overview when an older host provides no activity scope', async () => {
    await mount();
    expect(gap('rhyme')).not.toBeNull();
    expect(gap('task')).not.toBeNull();
    expect(gap('images')).not.toBeNull();
    expect(container.querySelector('[data-ws-word-family-skips]')).not.toBeNull();
  });
});
