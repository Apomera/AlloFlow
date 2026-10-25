// fix1025 (coordinator): the review panel lists the words the student player
// skips in Sound Sort and Sound Swap, as it already did for Word Families.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const act = React.act || require(resolve('desktop/web-app/node_modules/react-dom/test-utils')).act;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const MODULE = process.env.FIX1025_COORD_MISC || 'misc_components_module.js';
let Panel, root, container;

beforeAll(() => {
  window.React = React;
  window.AlloModules ||= {};
  globalThis.Volume2 = () => null;
  delete window.AlloModules.MiscComponentsModule;
  new Function(readFileSync(MODULE, 'utf8'))();
  Panel = window.WordSoundsReviewPanel;
});

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  container?.remove();
  vi.useRealTimers();
});

async function mount(props) {
  vi.useFakeTimers();
  container = document.createElement('div'); document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(React.createElement(Panel, {
    preloadedWords: [{ word: 'ship', phonemes: [], ttsReady: true }],
    t: () => '', onClose: () => {}, onStartActivity: () => {},
    ...props,
  })));
  await act(async () => vi.advanceTimersByTime(0));
}

const note = activity => container.querySelector('[data-ws-activity-skips="' + activity + '"]');

describe('Sound Sort and Sound Swap skips are shown to the teacher', () => {
  it('lists the skipped words for the selected activities', async () => {
    await mount({ activitySequence: ['sound_sort', 'manipulation'], soundSortSkips: ['ship'], soundSwapSkips: ['ship', 'moon'] });
    expect(note('sound_sort').textContent).toBe('1 skipped for students in Sound Sort (no word set for that sound): ship');
    expect(note('manipulation').textContent).toBe('2 skipped for students in Sound Swap (no checked one-sound change): ship, moon');
  });

  it('stays quiet for activities outside the lesson or with nothing skipped', async () => {
    await mount({ activitySequence: ['sound_sort'], soundSortSkips: [], soundSwapSkips: ['ship'] });
    expect(note('sound_sort')).toBeNull();
    expect(note('manipulation')).toBeNull();
  });
});
