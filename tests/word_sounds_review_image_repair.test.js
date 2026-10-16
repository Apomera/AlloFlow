import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { transformSync } from '@babel/core';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const act = React.act || require(resolve('desktop/web-app/node_modules/react-dom/test-utils')).act;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let Panel, root, container, state;

beforeAll(() => {
  // Run canonical JSX so these behavior checks do not require generated files.
  const source = transformSync(readFileSync('misc_components_source.jsx', 'utf8'), {
    plugins: ['@babel/plugin-transform-react-jsx'], configFile: false, babelrc: false,
  }).code;
  Panel = new Function('React', `
    const Ban = () => null, CheckCircle2 = Ban, ChevronDown = Ban, ChevronLeft = Ban,
      ImageIcon = Ban, Play = Ban, RefreshCw = Ban, Send = Ban, Sparkles = Ban, Volume2 = Ban;
    ${source}
    return WordSoundsReviewPanel;
  `)(React);
});

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  container?.remove();
  vi.clearAllTimers();
  vi.useRealTimers();
});

const originalImage = 'data:image/png;base64,original-cat';
const originalChoice = 'data:image/png;base64,original-bird';
const lessonWord = (word = 'cat', choices = ['cat', 'dog', 'fish', 'dog']) => ({
  id: 'row-' + word, word, phonemes: ['k', 'a', 't'], ttsReady: true,
  image: word === 'cat' ? originalImage : 'data:image/png;base64,' + word,
  _decodingAssets: { bird: originalChoice }, activityItems: { decoding: { choices } },
});
const gap = () => container.querySelector('[data-review-gap="images"]');
const wait = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

async function mount(words, generate, props = {}) {
  vi.useFakeTimers();
  state = {};
  state.generate = vi.fn((...args) => generate(...args));
  function Host() {
    const [items, setItems] = React.useState(words);
    state.words = items; state.replace = setItems;
    return React.createElement(Panel, {
      preloadedWords: items, onGenerateImage: state.generate, activitySequence: ['decoding'],
      t: () => '', onClose: () => {}, onStartActivity: () => {}, ...props,
    });
  }
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  await act(async () => root.render(React.createElement(Host)));
  await act(async () => vi.advanceTimersByTime(0));
}

const saveChoice = (index, choice) => {
  state.replace(previous => previous.map((item, currentIndex) => currentIndex === index ? {
    ...item, _packEdited: true, _decodingAssets: { ...item._decodingAssets, [choice]: 'data:image/png;base64,' + choice },
  } : item));
  return true;
};
async function flushRepair() {
  for (let step = 0; step < 12; step++) await act(async () => vi.advanceTimersByTimeAsync(1));
}
async function startRepair() { await act(async () => gap().querySelector('button').click()); }

describe('Read & Match picture repairs in the review panel', () => {
  it('requests only missing unique choices, preserves existing art, and clears the warning with an accurate result', async () => {
    await mount([lessonWord()], async (index, choice, options) => {
      expect(options).toEqual({ purpose: 'decoding-choice' });
      return saveChoice(index, choice);
    });
    expect(gap().textContent).toContain('pictures missing: 2');
    await startRepair();
    await flushRepair();
    expect(state.generate.mock.calls.map(([index, choice]) => [index, choice])).toEqual([[0, 'dog'], [0, 'fish']]);
    expect(state.words[0].image).toBe(originalImage);
    expect(state.words[0]._decodingAssets).toMatchObject({ bird: originalChoice, dog: expect.any(String), fish: expect.any(String) });
    expect(gap()).toBeNull();
    expect(container.textContent).toContain('1 fixed');
    expect(container.textContent).not.toContain('unchanged');
  });

  it('reuses a choice prepared for an earlier row instead of generating it again', async () => {
    await mount([lessonWord('cat', ['cat', 'dog']), lessonWord('sun', ['sun', 'dog'])], async (index, choice) => saveChoice(index, choice));
    await startRepair();
    await flushRepair();
    expect(state.generate.mock.calls.map(([, choice]) => choice)).toEqual(['dog']);
    expect(gap()).toBeNull();
    expect(container.textContent).toContain('2 fixed');
  });

  it.each(['failed', 'cancelled'])('stops a %s request without overwriting existing assets or queuing later choices', async outcome => {
    const initial = lessonWord();
    await mount([initial], async () => {
      if (outcome === 'failed') throw new Error('Image unavailable');
      return false;
    });
    await startRepair();
    await flushRepair();
    expect(state.generate).toHaveBeenCalledTimes(1);
    expect(state.words[0]).toBe(initial);
    expect(state.words[0].image).toBe(originalImage);
    expect(state.words[0]._decodingAssets).toEqual({ bird: originalChoice });
    expect(gap().textContent).toContain('pictures missing: 2');
    expect(container.textContent).toContain('1 unchanged');
  });

  it('finds the same reviewed row after reordering before requesting its next missing choice', async () => {
    const first = wait();
    await mount([lessonWord(), lessonWord('sun', ['sun'])], async (index, choice) => {
      if (choice === 'dog') {
        await first.promise;
        return saveChoice(state.words.findIndex(item => item.word === 'cat'), choice);
      }
      return saveChoice(index, choice);
    });
    await startRepair();
    await act(async () => state.replace(previous => [...previous].reverse()));
    await act(async () => first.resolve());
    await flushRepair();
    expect(state.generate.mock.calls.map(([index, choice]) => [index, choice])).toEqual([[0, 'dog'], [1, 'fish']]);
    expect(state.words[0]._decodingAssets).toEqual({ bird: originalChoice });
    expect(state.words[1].image).toBe(originalImage);
    expect(gap()).toBeNull();
    expect(container.textContent).toContain('1 fixed');
  });

  it('stops when the reviewed choice board changes while a request is pending', async () => {
    const pending = wait();
    await mount([lessonWord()], async () => pending.promise);
    await startRepair();
    await act(async () => state.replace(previous => previous.map(item => ({ ...item,
      activityItems: { decoding: { choices: ['cat', 'owl'] } },
    }))));
    await act(async () => pending.resolve(true));
    await flushRepair();
    expect(state.generate).toHaveBeenCalledTimes(1);
    expect(state.words[0].image).toBe(originalImage);
    expect(state.words[0]._decodingAssets).toEqual({ bird: originalChoice });
    expect(gap().textContent).toContain('pictures missing: 1');
  });

  it('does not queue another choice after the review closes', async () => {
    const pending = wait();
    await mount([lessonWord()], async () => pending.promise);
    const generate = state.generate;
    await startRepair();
    act(() => root.unmount()); root = null;
    await act(async () => pending.resolve(true));
    await flushRepair();
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('marks every concurrently generating row busy instead of just the latest row', async () => {
    await mount([lessonWord(), lessonWord('sun', ['sun']), lessonWord('moon', ['moon'])], async () => true,
      { generatingImageSet: new Set([0, 1]), generatingImageIndex: 1 });
    const busy = [...container.querySelectorAll('button[aria-label="Generating image"]')];
    expect(busy).toHaveLength(2);
    expect(busy.every(button => button.disabled && button.getAttribute('aria-busy') === 'true')).toBe(true);
  });
});
