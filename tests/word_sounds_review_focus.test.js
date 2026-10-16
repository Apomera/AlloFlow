import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const act = React.act || require(resolve('desktop/web-app/node_modules/react-dom/test-utils')).act;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const runtime = readFileSync('word_sounds_module.js', 'utf8');
const start = runtime.indexOf('    const WordSoundsSyllableReviewDetails =');
const end = runtime.indexOf('    // Maps each phoneme/letter', start);
const Details = new Function('React', runtime.slice(start, end) + '\nreturn WordSoundsSyllableReviewDetails;')(React);
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

async function mount() {
  vi.useFakeTimers();
  const words = ['fire', 'apple'].map(word => ({ word, phonemes: [], ttsReady: true }));
  const api = {};
  function Host() {
    const [request, setRequest] = React.useState(null);
    api.request = (index, kind) => setRequest(previous => ({ index, kind, nonce: (previous?.nonce || 0) + 1 }));
    return React.createElement(Panel, {
      preloadedWords: words, syllableReviewRequest: request, activitySequence: ['syllable_counting'],
      t: () => '', onClose: () => {}, onStartActivity: () => {},
      renderSyllableEditor: (word, index) => React.createElement(Details, {
        id: 'ws-syllables-' + index, title: 'Review ' + word.word,
        reviewRequest: request?.index === index ? request : null,
      }, () => React.createElement(React.Fragment, null,
        React.createElement('button', { 'data-syllable-count-listen': true }, 'Listen to ' + word.word),
        React.createElement('details', { id: 'ws-recordings-' + index },
          React.createElement('summary', null, 'Record ' + word.word),
          React.createElement('input', { 'aria-label': 'Syllable label' })),
      )),
    });
  }
  container = document.createElement('div'); document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(React.createElement(Host)));
  // Settle the dialog's initial focus separately from a teacher's review request.
  await act(async () => vi.advanceTimersByTime(0));
  return api;
}

describe('the real review panel and production syllable disclosure focus', () => {
  it.each(['count', 'recording'])('keeps the %s destination focused after the parent expands and scrolls the row', async kind => {
    const api = await mount();
    expect(container.querySelector('#ws-syllables-0')).toBeNull();
    await act(async () => api.request(0, kind));
    const outer = container.querySelector('#ws-syllables-0');
    outer.scrollIntoView = vi.fn();
    const destination = kind === 'recording' ? outer.querySelector('#ws-recordings-0 summary') : outer.querySelector('[data-syllable-count-listen]');
    expect(outer.open).toBe(true);
    if (kind === 'recording') expect(container.querySelector('#ws-recordings-0').open).toBe(true);
    expect(document.activeElement).toBe(destination);
    await act(async () => vi.advanceTimersByTime(0));
    expect(outer.scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
    expect(document.activeElement).toBe(destination);
  });

  it('honors a new recording destination when a second word is requested before a pending scroll', async () => {
    const api = await mount();
    await act(async () => api.request(0, 'count'));
    await act(async () => api.request(1, 'recording'));
    await act(async () => vi.advanceTimersByTime(0));
    expect(container.querySelector('#ws-syllables-0')).toBeNull();
    expect(document.activeElement).toBe(container.querySelector('#ws-recordings-1 summary'));
  });

  it('does not steal focus if the teacher moves to another control before the deferred scroll', async () => {
    const api = await mount();
    await act(async () => api.request(0, 'recording'));
    const input = container.querySelector('#ws-recordings-0 input');
    input.focus();
    await act(async () => vi.advanceTimersByTime(0));
    expect(document.activeElement).toBe(input);
  });
});
