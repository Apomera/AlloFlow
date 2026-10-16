import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const PASSAGE = 'The heron walked slowly in the shallow water.';
let React, createRoot, act, contract, View, registry;
const readers = [];

beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('alt_text_module.js');
  loadAlloModule('pure_helpers_module.js');
  loadAlloModule('phase_n_misc_helpers_module.js');
  loadAlloModule('view_simplified_module.js');
  contract = window.AlloModules.InstructionalContext;
  View = window.AlloModules.SimplifiedView;
});

beforeEach(() => {
  vi.useFakeTimers();
  registry = new Map();
  vi.stubGlobal('CSS', { highlights: registry });
  vi.stubGlobal('Highlight', class extends Set {
    constructor(...ranges) { super(ranges); }
  });
});

afterEach(() => {
  readers.splice(0).forEach(reader => reader.dispose());
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function adaptedItem({ shown = true, empty = false, stale = false } = {}) {
  const item = {
    id: 'adapted-idle', type: 'simplified', data: PASSAGE,
    instructionalText: { form: 'adapted', role: 'supplemental' },
    config: { language: 'English' }
  };
  const start = PASSAGE.indexOf('heron');
  let supports = empty ? contract.clearAdaptedReadingSupports(item)
    : contract.upsertAdaptedReadingSupport(item, null, {
      id: 'heron-help', start, end: start + 5, quote: 'heron', text: 'A long-legged bird.'
    });
  supports = contract.setAdaptedReadingSupportsShown(item, supports, shown);
  return { ...item, data: stale ? 'An egret stood in the shallow water.' : PASSAGE, adaptedReadingSupports: supports };
}

function mountReader(strict, initial = {}) {
  const surface = document.createElement('div');
  surface.setAttribute('data-adapted-reader', '');
  const passage = document.createElement('p');
  passage.setAttribute('data-reading-passage', '');
  passage.textContent = PASSAGE;
  const mount = document.createElement('div');
  surface.append(passage, mount);
  document.body.append(surface);
  // Only passage reads count; React's UI text and test assertions are unrelated.
  const reads = vi.spyOn(passage, 'textContent', 'get');
  const root = createRoot(mount);
  let props = { item: adaptedItem(), teacher: true, language: 'English', ...initial };
  let disposed = false;
  const render = () => {
    const help = React.createElement(View.AdaptedWordHelp, props);
    root.render(strict ? React.createElement(React.StrictMode, null, help) : help);
  };
  const reader = {
    surface, passage, reads,
    update(next = {}) { props = { ...props, ...next }; act(render); },
    spot() {
      const button = surface.querySelector('[data-adapted-word-help-spot]');
      expect(button).not.toBeNull();
      act(() => button.click());
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      act(() => root.unmount());
      surface.remove();
    }
  };
  readers.push(reader);
  act(render);
  return reader;
}

const ownRanges = (name, reader) => [...(registry.get(name) || [])]
  .filter(range => reader.passage.contains(range.startContainer));
const spotNotice = reader => reader.surface.querySelector('[data-adapted-word-help-spot-notice]')?.textContent || '';
const tick = milliseconds => act(() => vi.advanceTimersByTime(milliseconds));

for (const strict of [false, true]) {
  describe(`adapted word-help lifecycle${strict ? ' in StrictMode' : ''}`, () => {
    it.each([
      ['hidden help', () => ({ item: adaptedItem({ shown: false }) })],
      ['empty help', () => ({ item: adaptedItem({ empty: true }) })],
      ['stale help', () => ({ item: adaptedItem({ stale: true }) })],
      ['quiet reading', () => ({ quiet: true })],
      ['an unmatched language pane', () => ({ markWords: false })]
    ])('does not read the passage for %s', (_name, options) => {
      const timers = vi.spyOn(globalThis, 'setTimeout');
      const reader = mountReader(strict, options());
      reader.update({ listening: true });
      reader.update({ listening: false });
      expect(reader.reads).not.toHaveBeenCalled();
      expect(ownRanges('allo-word-help', reader)).toHaveLength(0);
      expect(timers.mock.calls.filter(([, delay]) => delay === 4000)).toHaveLength(0);
    });

    it('keeps initial underlines after effect setup and cleanup replay', () => {
      const reader = mountReader(strict);
      expect(reader.reads).toHaveBeenCalled();
      expect(ownRanges('allo-word-help', reader).map(range => range.toString())).toEqual(['heron']);
      reader.update({ listening: true });
      expect(ownRanges('allo-word-help', reader).map(range => range.toString())).toEqual(['heron']);
    });

    it('clears only its own marks and spot timer when hidden or unmounted', () => {
      const main = mountReader(strict);
      const preview = mountReader(strict);
      expect(ownRanges('allo-word-help', main).map(range => range.toString())).toEqual(['heron']);
      const previewUnderlines = ownRanges('allo-word-help', preview);
      expect(previewUnderlines).toHaveLength(1);
      main.spot();
      preview.spot();
      const previewSpot = ownRanges('allo-word-help-focus', preview);
      expect(previewSpot).toHaveLength(1);
      expect(vi.getTimerCount()).toBe(2);

      main.reads.mockClear();
      main.update({ quiet: true });
      expect(main.reads).not.toHaveBeenCalled();
      expect(ownRanges('allo-word-help', main)).toHaveLength(0);
      expect(ownRanges('allo-word-help-focus', main)).toHaveLength(0);
      expect(ownRanges('allo-word-help', preview)).toEqual(previewUnderlines);
      expect(ownRanges('allo-word-help-focus', preview)).toEqual(previewSpot);
      expect(vi.getTimerCount()).toBe(1);

      main.update({ quiet: false });
      expect(main.reads).toHaveBeenCalled();
      expect(ownRanges('allo-word-help', main).map(range => range.toString())).toEqual(['heron']);
      main.dispose();
      expect(ownRanges('allo-word-help', preview)).toEqual(previewUnderlines);
      expect(ownRanges('allo-word-help-focus', preview)).toEqual(previewSpot);
      expect(vi.getTimerCount()).toBe(1);
      preview.dispose();
      expect(registry.has('allo-word-help')).toBe(false);
      expect(registry.has('allo-word-help-focus')).toBe(false);
      expect(vi.getTimerCount()).toBe(0);
    });

    it('expires its highlight notice without removing another reader\'s active spotlight', () => {
      const main = mountReader(strict);
      const preview = mountReader(strict);
      const underlines = [...registry.get('allo-word-help')];
      main.spot();
      expect(spotNotice(main)).toContain('"heron" is highlighted');
      tick(1000);
      main.update({ listening: true });
      expect(spotNotice(main)).toContain('"heron" is highlighted');
      expect(ownRanges('allo-word-help-focus', main)).toHaveLength(1);
      preview.spot();
      const previewSpot = ownRanges('allo-word-help-focus', preview);
      tick(3000);
      expect(spotNotice(main)).toBe('');
      expect(ownRanges('allo-word-help-focus', main)).toHaveLength(0);
      expect(spotNotice(preview)).toContain('"heron" is highlighted');
      expect(ownRanges('allo-word-help-focus', preview)).toEqual(previewSpot);
      expect([...registry.get('allo-word-help')]).toEqual(underlines);
      expect(vi.getTimerCount()).toBe(1);
      tick(1000);
      expect(spotNotice(preview)).toBe('');
      expect(registry.has('allo-word-help-focus')).toBe(false);
      expect(vi.getTimerCount()).toBe(0);
    });

    it.each([
      ['marks are disabled', () => ({ markWords: false }), () => ({ markWords: true })],
      ['quiet reading starts', () => ({ quiet: true }), () => ({ quiet: false })],
      ['word help is hidden', () => ({ item: adaptedItem({ shown: false }) }), () => ({ item: adaptedItem() })],
      ['word help becomes empty', () => ({ item: adaptedItem({ empty: true }) }), () => ({ item: adaptedItem() })],
      ['word help becomes stale', () => ({ item: adaptedItem({ stale: true }) }), () => ({ item: adaptedItem() })]
    ])('does not revive a spotlight notice after %s', (_label, hide, restore) => {
      const main = mountReader(strict);
      const preview = mountReader(strict);
      main.spot(); preview.spot();
      const previewSpot = ownRanges('allo-word-help-focus', preview);
      const previewUnderlines = ownRanges('allo-word-help', preview);
      expect(spotNotice(main)).toContain('"heron" is highlighted');
      main.update(hide());
      tick(0); // Ignore the details element's queued toggle event.
      expect(spotNotice(main)).toBe('');
      expect(ownRanges('allo-word-help-focus', main)).toHaveLength(0);
      expect(ownRanges('allo-word-help-focus', preview)).toEqual(previewSpot);
      expect(ownRanges('allo-word-help', preview)).toEqual(previewUnderlines);
      expect(spotNotice(preview)).toContain('"heron" is highlighted');
      expect(vi.getTimerCount()).toBe(1);
      main.update(restore());
      tick(0);
      expect(spotNotice(main)).toBe('');
      expect(ownRanges('allo-word-help-focus', main)).toHaveLength(0);
      expect(ownRanges('allo-word-help', main).map(range => range.toString())).toEqual(['heron']);
      main.spot();
      expect(spotNotice(main)).toContain('"heron" is highlighted');
      expect(ownRanges('allo-word-help-focus', main)).toHaveLength(1);
    });

    it('resets a learner spotlight while preserving another reader\'s ranges and timer', () => {
      const main = mountReader(strict, { actionScope: 'learner-a' });
      const preview = mountReader(strict, { actionScope: 'preview' });
      main.spot(); preview.spot();
      const previewSpot = ownRanges('allo-word-help-focus', preview);
      const previewUnderlines = ownRanges('allo-word-help', preview);
      main.update({ actionScope: 'learner-b' });
      expect(spotNotice(main)).toBe('');
      expect(ownRanges('allo-word-help-focus', main)).toHaveLength(0);
      expect(ownRanges('allo-word-help', main).map(range => range.toString())).toEqual(['heron']);
      expect(ownRanges('allo-word-help-focus', preview)).toEqual(previewSpot);
      expect(ownRanges('allo-word-help', preview)).toEqual(previewUnderlines);
      expect(spotNotice(preview)).toContain('"heron" is highlighted');
      expect(vi.getTimerCount()).toBe(1);
      main.update({ actionScope: 'learner-a' });
      expect(spotNotice(main)).toBe('');
      main.spot();
      expect(spotNotice(main)).toContain('"heron" is highlighted');
      expect(ownRanges('allo-word-help-focus', main)).toHaveLength(1);
    });

    it.each([
      ['the learner changes', () => ({ actionScope: 'learner-b' }), () => ({ actionScope: 'learner-a' })],
      ['marks are disabled', () => ({ markWords: false }), () => ({ markWords: true })],
      ['word help is hidden', () => ({ item: adaptedItem({ shown: false }) }), () => ({ item: adaptedItem() })]
    ])('clears a locator message without CSS Highlight support when %s', (_label, change, restore) => {
      vi.stubGlobal('CSS', undefined);
      vi.stubGlobal('Highlight', undefined);
      const reader = mountReader(strict, { actionScope: 'learner-a' });
      reader.spot();
      expect(spotNotice(reader)).toContain('Located "heron" in the passage.');
      expect(registry.size).toBe(0);
      reader.update(change());
      expect(spotNotice(reader)).toBe('');
      reader.update(restore());
      expect(spotNotice(reader)).toBe('');
      reader.spot();
      expect(spotNotice(reader)).toContain('Located "heron" in the passage.');
      expect(registry.size).toBe(0);
      expect(vi.getTimerCount()).toBe(0);
    });

    it('invalidates marks when the existing passage text node changes', () => {
      const reader = mountReader(strict);
      expect(ownRanges('allo-word-help', reader)).toHaveLength(1);
      const originalNode = reader.passage.firstChild;
      originalNode.data = PASSAGE.replace('heron', 'egret');
      reader.update();
      expect(reader.passage.firstChild).toBe(originalNode);
      expect(ownRanges('allo-word-help', reader)).toHaveLength(0);
    });

    it('rebuilds underlines after an identical passage replaces its text nodes', () => {
      const reader = mountReader(strict);
      const originalNode = reader.passage.firstChild;
      expect(ownRanges('allo-word-help', reader).map(range => range.toString())).toEqual(['heron']);
      reader.passage.textContent = PASSAGE;
      expect(reader.passage.firstChild).not.toBe(originalNode);
      reader.update();
      const ranges = ownRanges('allo-word-help', reader);
      expect(ranges.map(range => range.toString())).toEqual(['heron']);
      expect(ranges.every(range => !range.collapsed)).toBe(true);
      expect(ranges[0].startContainer).toBe(reader.passage.firstChild);
      expect(ranges[0].endContainer).toBe(reader.passage.firstChild);
    });

    it('moves marks to a replacement passage while the old passage remains connected', () => {
      const reader = mountReader(strict);
      expect(ownRanges('allo-word-help', reader).map(range => range.toString())).toEqual(['heron']);
      const replacement = document.createElement('p');
      replacement.setAttribute('data-reading-passage', '');
      replacement.textContent = PASSAGE;
      reader.passage.removeAttribute('data-reading-passage');
      reader.surface.insertBefore(replacement, reader.passage);
      expect(reader.passage.isConnected).toBe(true);
      reader.update();
      const ranges = [...(registry.get('allo-word-help') || [])];
      expect(ranges.map(range => range.toString())).toEqual(['heron']);
      expect(ranges[0].startContainer).toBe(replacement.firstChild);
      expect(ranges[0].endContainer).toBe(replacement.firstChild);
      expect(ownRanges('allo-word-help', reader)).toHaveLength(0);
    });
  });
}
