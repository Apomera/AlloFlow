import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { execFileSync } from 'node:child_process';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const { cases, makeFixture } = require('../dev-tools/reader-performance/fixtures.cjs');
const source = readFileSync(resolve('dev-tools/reader-performance/instrumentation.js'), 'utf8');

function fixture(enabled = true) {
  let id = 0, now = 0;
  const timers = new Map(), frames = new Map();
  class Audio {
    paused = true;
    ended = false;
    addEventListener() {}
  }
  class MutationObserver {
    observe(target) { if (!target) throw new TypeError('Missing target'); }
    disconnect() {}
  }
  class DOMParser {
    parseFromString(input) {
      const value = String(input);
      if (value === 'fail') throw new Error('Parser failed');
      return { value, parser: this };
    }
  }
  class Document { createTreeWalker() { return {}; } }
  class Node { get textContent() { return this.value || ''; } }
  class Storage { setItem() {} }
  class PerformanceObserver { static supportedEntryTypes = []; }
  const context = {
    URLSearchParams, WeakRef, Audio, MutationObserver, DOMParser, Document, Node, Storage, PerformanceObserver,
    CSS: { highlights: new Map() }, location: { search: enabled ? '?instrument=1' : '' },
    performance: { now: () => ++now },
    setTimeout: callback => { const next = ++id; timers.set(next, callback); return next; },
    clearTimeout: timer => timers.delete(timer),
    requestAnimationFrame: callback => { const next = ++id; frames.set(next, callback); return next; },
    cancelAnimationFrame: frame => frames.delete(frame)
  };
  context.window = context;
  runInNewContext(source, context);
  return { context, metrics: context.readerMetrics, timers, frames, NativeObserver: MutationObserver };
}

describe('reader performance instrumentation', () => {
  it('counts actual parser attempts and string input without hiding failures', () => {
    const { context, metrics } = fixture();
    const parser = new context.DOMParser();
    expect(parser.parseFromString('<b>Hi</b>').parser).toBe(parser);
    expect(() => parser.parseFromString('fail')).toThrow('Parser failed');
    const result = metrics.snapshot();
    expect(result.counts.domParses).toBe(2);
    expect(result.counts.domParseInputChars).toBe(13);
    expect(result.milliseconds.domParses).toBeGreaterThan(0);
  });

  it('does not add an extra conversion of non-string parser arguments', () => {
    const { context, metrics } = fixture();
    let conversions = 0;
    const input = { toString() { conversions++; return 'trusted'; } };
    expect(new context.DOMParser().parseFromString(input).value).toBe('trusted');
    expect(conversions).toBe(1);
    expect(metrics.snapshot().counts.domParses).toBe(1);
    expect(metrics.snapshot().counts.domParseInputChars).toBeUndefined();
  });

  it('labels full-input operations separately and preserves their receiver', () => {
    const { metrics } = fixture();
    const parser = { suffix: '!', plain(text) { return text + this.suffix; } };
    metrics.wrap(parser, 'plain', 'readingTextPlain');
    expect(parser.plain('one two')).toBe('one two!');
    expect(metrics.snapshot().counts.readingTextPlain).toBe(1);
    expect(metrics.snapshot().counts.readingTextPlainInputChars).toBe(7);
    expect(metrics.snapshot().counts.domParses).toBeUndefined();
  });

  it('counts one active observer per instance and supports disconnect and reuse', () => {
    const { context, metrics, NativeObserver } = fixture();
    const observer = new context.MutationObserver(() => {});
    expect(observer).toBeInstanceOf(NativeObserver);
    observer.observe({}); observer.observe({});
    expect(metrics.snapshot().activeMutationObservers).toBe(1);
    observer.disconnect(); observer.disconnect();
    expect(metrics.snapshot().activeMutationObservers).toBe(0);
    observer.observe({});
    expect(metrics.snapshot().activeMutationObservers).toBe(1);
  });

  it('does not count a failed observe call as active', () => {
    const { context, metrics } = fixture();
    expect(() => new context.MutationObserver(() => {}).observe(null)).toThrow();
    expect(metrics.snapshot().activeMutationObservers).toBe(0);
  });

  it('resets work counters without forgetting outstanding resources', () => {
    const { context, metrics } = fixture();
    new context.DOMParser().parseFromString('text');
    context.setTimeout(() => {}, 1000); context.requestAnimationFrame(() => {});
    const observer = new context.MutationObserver(() => {}); observer.observe({});
    metrics.reset();
    const result = metrics.snapshot();
    expect(Object.keys(result.counts)).toHaveLength(0);
    expect(result.outstandingTimers).toBe(1);
    expect(result.outstandingFrames).toBe(1);
    expect(result.activeMutationObservers).toBe(1);
  });

  it('detects a timer that would be hidden by a delayed cleanup sample', () => {
    const { context, metrics, timers } = fixture();
    const baseline = metrics.lifecycleSnapshot();
    const timer = context.setTimeout(() => {}, 1000);
    expect(() => metrics.assertCleanup(baseline)).toThrow('outstandingTimers');
    timers.get(timer)();
    expect(() => metrics.assertCleanup(baseline)).not.toThrow();
  });

  it('requires owned animation frames to be cancelled', () => {
    const { context, metrics } = fixture();
    const baseline = metrics.lifecycleSnapshot();
    const frame = context.requestAnimationFrame(() => {});
    expect(() => metrics.assertCleanup(baseline)).toThrow('outstandingFrames');
    context.cancelAnimationFrame(frame);
    expect(() => metrics.assertCleanup(baseline)).not.toThrow();
  });

  it('allows fixture infrastructure present before the reader mounted', () => {
    const { context, metrics } = fixture();
    const infrastructure = context.setTimeout(() => {}, 1000);
    context.CSS.highlights.set('fixture', new Set([{}]));
    const baseline = metrics.lifecycleSnapshot();
    expect(() => metrics.assertCleanup(baseline)).not.toThrow();
    context.clearTimeout(infrastructure);
    expect(() => metrics.assertCleanup(baseline)).not.toThrow();
  });

  it('detects playing audio and leftover highlight ranges immediately', () => {
    const { context, metrics } = fixture();
    const baseline = metrics.lifecycleSnapshot();
    const audio = new context.Audio(); audio.paused = false;
    expect(() => metrics.assertCleanup(baseline)).toThrow('playingAudio');
    audio.paused = true;
    context.CSS.highlights.set('reader', new Set([{}, {}]));
    expect(() => metrics.assertCleanup(baseline)).toThrow('highlightRanges');
    context.CSS.highlights.delete('reader');
    expect(() => metrics.assertCleanup(baseline)).not.toThrow();
  });

  it('leaves parser and timer instrumentation disabled in timing-only runs', () => {
    const { context, metrics } = fixture(false);
    const baseline = metrics.lifecycleSnapshot();
    new context.DOMParser().parseFromString('text'); context.setTimeout(() => {}, 1000);
    expect(metrics.snapshot().counts.domParses).toBeUndefined();
    expect(metrics.snapshot().outstandingTimers).toBeNull();
    expect(metrics.snapshot().activeMutationObservers).toBeNull();
    expect(() => metrics.assertCleanup(baseline)).not.toThrow();
  });
});

describe('reader performance fixture coverage', () => {
  it('adds distinct crawl and original/comparison support workloads without losing existing cases', () => {
    expect(cases).toHaveLength(22);
    expect(new Set(cases.map(item => item.name)).size).toBe(cases.length);
    expect(cases.find(item => item.name === 'crawl-long')).toMatchObject({ crawl: true, immersive: true });
    expect(cases.some(item => item.name === 'unique-navigation')).toBe(true);
    for (const name of ['original-supports-200', 'comparison-supports-200']) {
      const spec = cases.find(item => item.name === name), adapted = makeFixture(spec);
      const original = makeFixture({ sentences: spec.sentences, supports: spec.originalSupports });
      expect(original.data).toBe(adapted.originalText);
      expect(original.annotations).toHaveLength(200);
      expect(adapted.annotations).toHaveLength(30);
      for (const entry of original.annotations) expect(adapted.originalText.slice(entry.start, entry.end)).toBe(entry.quote);
    }
  });

  it('adds separate protected-original desktop and narrow-screen cases', () => {
    const originals = cases.filter(spec => spec.protectedOriginal);
    expect(originals.map(spec => spec.name)).toEqual(['protected-original-supports-200', 'protected-original-phone']);
    expect(originals[1]).toMatchObject({ width: 320, fontSize: 24 });
    for (const spec of originals) {
      expect(spec.originalSupports).toBe(200);
      expect(spec.immersive || spec.compare).toBeFalsy();
      expect(makeFixture(spec).annotations).toHaveLength(0);
    }
  });

  it('adds heading-only navigation cases without changing the existing passage fixtures', () => {
    const navigation = cases.filter(spec => spec.leadingTitle);
    expect(navigation.map(spec => spec.name)).toEqual(['section-prompts', 'section-prompts-phone']);
    expect(navigation[1]).toMatchObject({ width: 320, fontSize: 24 });
    for (const spec of navigation) {
      const reading = makeFixture(spec), original = makeFixture({ ...spec, leadingTitle: false });
      expect(reading.data).toBe('# Water study\n\n' + original.data);
      expect(reading.data.startsWith('# Water study\n\n## Observations 1\n\n')).toBe(true);
    }
  });
});

describe('reader performance harness mounting', () => {
  let React, act, createRoot, compiledHarness, root, host;
  beforeAll(() => {
    React = require(resolve('desktop/web-app/node_modules/react'));
    ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
    act = React.act;
    global.React = window.React = React;
    global.IS_REACT_ACT_ENVIRONMENT = true;
    window.AlloIcons = new Proxy({}, { get: () => () => null });
    window.AlloLanguageContext = React.createContext({ t: key => key });
    for (const file of ['text_pipeline_helpers_module.js', 'instructional_context_module.js',
      'phase_n_misc_helpers_module.js', 'immersive_reader_module.js', process.env.ALLO_VIEW_CANDIDATE || 'view_simplified_module.js']) loadAlloModule(file);
    // Compile outside jsdom so esbuild uses Node's matching TextEncoder/Uint8Array realm.
    compiledHarness = execFileSync(process.execPath, ['-e',
      "process.stdout.write(require('esbuild').buildSync({entryPoints:[process.argv[1]],bundle:true,write:false,platform:'browser',format:'iife'}).outputFiles[0].text)",
      resolve('dev-tools/reader-performance/harness.jsx')], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  });
  afterEach(() => {
    if (root) act(() => root.unmount());
    host?.remove(); root = null;
    vi.unstubAllGlobals();
    for (const key of ['readerFixture', 'readerMetrics', 'fixtureSpec', 'fixtureStrings', 'createRoot',
      '__alloResolveReadAloudAudio', '__alloCaptureKaraokeAudio']) delete window[key];
  });
  function mount(spec) {
    host = document.createElement('main'); host.id = 'root'; document.body.appendChild(host);
    window.createRoot = element => (root = createRoot(element));
    window.fixtureSpec = spec; window.fixtureStrings = {};
    window.readerMetrics = { wrap() {}, onRender() {}, lifecycleSnapshot: () => ({}) };
    act(() => new Function(compiledHarness)());
    expect(window.readerFixture.ready).toBe(true);
  }
  const source = () => host.querySelector('[data-original-source]');
  function passageText() {
    const copy = source().cloneNode(true);
    copy.querySelectorAll('[data-reading-gloss], [data-sentence-read], .sr-only').forEach(node => node.remove());
    return copy.textContent;
  }
  function expectOriginal() {
    const { item, expectedOriginalText, inventory } = window.readerFixture;
    expect(window.AlloModules.InstructionalContext.isSupportedOriginal(item)).toBe(true);
    expect(inventory).toMatchObject({ readingForm: 'same-text-supported', sourcePreserved: true,
      acceptedSupports: 0, displayedOriginalSupports: 200, acceptedOriginalSupports: 200 });
    expect(item.data).toBe(expectedOriginalText);
    expect(item.sourceSnapshot.text).toBe(expectedOriginalText);
    expect(passageText()).toBe(expectedOriginalText);
    expect(host.querySelectorAll('[data-original-source]')).toHaveLength(1);
    expect(host.querySelector('[data-original-reading-controls]')).not.toBeNull();
    expect(host.querySelector('[data-adapted-word-help]')).toBeNull();
  }
  it('limits media navigation content to the opt-in check and restores the measured reading', () => {
    mount(cases.find(spec => spec.name === 'section-prompts'));
    const originalData = window.readerFixture.item.data;
    const originalInventory = window.readerFixture.inventory;
    expect(host.querySelector('[data-reading-table], [data-reading-chart]')).toBeNull();
    act(() => window.readerFixture.patch({ mediaReading: true }));
    expect(window.readerFixture.item.data).not.toBe(originalData);
    expect(host.querySelector('[data-reading-table] table')).not.toBeNull();
    expect(host.querySelector('[data-reading-chart] svg')).not.toBeNull();
    expect(host.querySelector('[data-reading-table]').hasAttribute('data-reading-paragraph')).toBe(true);
    expect(host.querySelector('[data-reading-chart]').hasAttribute('data-reading-paragraph')).toBe(true);
    act(() => window.readerFixture.patch({ mediaReading: false }));
    expect(window.readerFixture.item.data).toBe(originalData);
    expect(window.readerFixture.inventory).toEqual(originalInventory);
    expect(host.querySelector('[data-reading-table], [data-reading-chart]')).toBeNull();
  });
  it('opens the selected Crawl workload with all 300 sentences and preserves the immersive reader on close', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const spec = cases.find(item => item.name === 'crawl-long');
    mount(spec);
    const dialog = host.querySelector('[data-help-key="perspective_crawl_overlay_panel"]');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.closest('[hidden], [aria-hidden="true"]')).toBeNull();
    expect(getComputedStyle(dialog).display).not.toBe('none');
    expect(getComputedStyle(dialog).visibility).toBe('visible');
    const surface = dialog.querySelector('[role="button"][aria-pressed]');
    expect(surface.getAttribute('aria-pressed')).toBe('true');
    const normalize = text => text.replace(/\s+/g, ' ').trim();
    const crawlText = [...surface.querySelectorAll('p')].map(node => node.textContent).join(' ');
    const expectedText = window.AlloModules.TextPipelineHelpers.parseTaggedContent(makeFixture(spec).data)
      .filter(word => word.pos !== 'newline').map(word => word.text).join(' ');
    expect(normalize(crawlText)).toBe(normalize(expectedText));
    expect(crawlText.match(/term\d{5}/g)).toHaveLength(300);
    expect(window.readerFixture.inventory.canonicalSentences).toBe(300);
    const passage = host.querySelector('[data-immersive-passage]');
    expect(passage).not.toBeNull();
    expect(passage.textContent).toContain('term00300');
    act(() => window.readerFixture.patch({ crawl: false }));
    expect(host.querySelector('[data-help-key="perspective_crawl_overlay_panel"]')).toBeNull();
    expect(window.readerFixture.state).toMatchObject({ crawl: false, immersive: true });
    expect(host.querySelector('[data-immersive-passage]')).toBe(passage);
    expect(passage.textContent.match(/term\d{5}/g)).toHaveLength(300);
  });
  it.each(cases.filter(spec => spec.protectedOriginal))('renders actual source and all 200 inline supports for $name', spec => {
    mount(spec); expectOriginal();
    expect(window.readerFixture.inventory.canonicalSentences).toBe(300);
    const glosses = [...source().querySelectorAll('[data-reading-gloss]')];
    expect(glosses).toHaveLength(200);
    for (const [index, node] of glosses.entries()) {
      const term = 'term' + String(index + 1).padStart(5, '0');
      expect(node.textContent).toContain('A prepared explanation for ' + term + '. Version 0');
      expect(node.previousSibling.textContent.endsWith(term)).toBe(true);
    }
  });
  it('keeps source text exact when word-help density and visibility change', () => {
    mount(cases.find(spec => spec.name === 'protected-original-supports-200'));
    const select = host.querySelector('[data-original-support-settings] select');
    act(() => { select.value = 'light'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    const { item } = window.readerFixture;
    const lighter = window.AlloModules.InstructionalContext.selectReadingSupports(item, item.readingSupports, { density: 'light' });
    expect(lighter.length).toBeGreaterThan(0); expect(lighter.length).toBeLessThan(200);
    expect(source().querySelectorAll('[data-reading-gloss]')).toHaveLength(lighter.length);
    expectOriginal();
    const checkbox = host.querySelector('[data-original-support-settings] input[type="checkbox"]');
    act(() => checkbox.click());
    expect(source().querySelectorAll('[data-reading-gloss]')).toHaveLength(0); expectOriginal();
    act(() => checkbox.click());
    expect(source().querySelectorAll('[data-reading-gloss]')).toHaveLength(lighter.length); expectOriginal();
  });
  it('refreshes the protected snapshot and explanations without turning it into adapted text', () => {
    mount(cases.find(spec => spec.name === 'protected-original-supports-200'));
    act(() => window.readerFixture.patch({ resource: 'fixture-next', revision: 1, supportVersion: 1 }));
    expectOriginal();
    expect(window.readerFixture.item.id).toBe('fixture-next');
    expect(passageText()).toContain('This reading changed 1 times.');
    expect(source().querySelectorAll('[data-reading-gloss]')).toHaveLength(200);
    expect(source().querySelector('[data-reading-gloss]').textContent).toContain('Version 1');
  });
});
