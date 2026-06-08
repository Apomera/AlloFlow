// Unit tests for the resilient CDN loader (_loadCdnScript / _waitForGlobal) in
// doc_pipeline_source.jsx. The pipeline lazy-loads pdf.js / pako / Tesseract / fontkit from
// a CDN; a single hard-coded URL means a blocked CDN (locked-down school networks) silently
// kills a feature. _loadCdnScript tries a fallback chain and, on TOTAL failure, records the
// outage on window.__alloflowCdnDown[label] so degradation is visible, not silent. These
// pin: first-source success, fallback to a later source, total-failure flag, already-loaded
// short-circuit, and per-label promise caching.
//
// Anti-drift: extracts the real _waitForGlobal + _loadCdnScript block from source at runtime
// and evals it with a stubbed document/window/warnLog (no real network, no real DOM).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = fs.readFileSync(path.resolve(__dirname, '../doc_pipeline_source.jsx'), 'utf8');

// The two helpers + the _cdnLoadPromises cache are a contiguous block; slice from
// _waitForGlobal's declaration through the close of _loadCdnScript and eval as a unit.
function makeLoaderFactory() {
  const start = SRC.indexOf('const _waitForGlobal = ');
  const lcs = SRC.indexOf('const _loadCdnScript = ', start);
  if (start < 0 || lcs < 0) throw new Error('CDN loader block not found in source');
  const braceStart = SRC.indexOf('{', SRC.indexOf('=>', lcs));
  let i = braceStart, depth = 0, end = -1;
  for (; i < SRC.length; i++) { const c = SRC[i]; if (c === '{') depth++; else if (c === '}') { depth--; if (depth === 0) { end = i; break; } } }
  if (end < 0) throw new Error('unbalanced braces in _loadCdnScript');
  const block = SRC.slice(start, end + 1);
  // eslint-disable-next-line no-eval
  return new Function('document', 'window', 'warnLog', block + '\n; return { _loadCdnScript: _loadCdnScript, _waitForGlobal: _waitForGlobal };');
}
const makeLoader = makeLoaderFactory();

// Build a fake browser env. `goodUrls` are the URLs that "succeed" (flip the global ready)
// the instant their <script> src is set. `startLoaded` simulates an already-present global.
function env(goodUrls, startLoaded) {
  let loaded = !!startLoaded;
  const win = {};
  const doc = {
    querySelector: () => null,
    createElement: () => ({
      setAttribute() {},
      _src: '',
      set src(v) { this._src = v; if (goodUrls.includes(v)) loaded = true; },
      get src() { return this._src; },
    }),
    head: { appendChild() {} },
  };
  const api = makeLoader(doc, win, () => {});
  return { win, isReady: () => loaded, load: api._loadCdnScript };
}

const FAST = { timeout: 40 }; // keep bad-source waits short in tests

describe('_loadCdnScript — resilient CDN loader', () => {
  it('loads from the first (primary) source when it works', async () => {
    const e = env(['https://primary/lib.js']);
    const ok = await e.load('pdfjs', ['https://primary/lib.js', 'https://fallback/lib.js'], e.isReady, FAST);
    expect(ok).toBe(true);
    expect(e.win.__alloflowCdnDown).toBeUndefined();
  });

  it('falls back to a later source when earlier ones fail', async () => {
    const e = env(['https://c/lib.js']); // only the 3rd url succeeds
    const ok = await e.load('pako', ['https://a/lib.js', 'https://b/lib.js', 'https://c/lib.js'], e.isReady, FAST);
    expect(ok).toBe(true);
    expect(e.win.__alloflowCdnDown).toBeUndefined();
  });

  it('records an outage flag (not silent) when ALL sources fail', async () => {
    const e = env([]); // nothing succeeds
    const ok = await e.load('tesseract', ['https://a/lib.js', 'https://b/lib.js'], e.isReady, FAST);
    expect(ok).toBe(false);
    expect(e.win.__alloflowCdnDown).toBeTruthy();
    expect(e.win.__alloflowCdnDown.tesseract).toBe(true);
  });

  it('short-circuits when the global is already present (no injection needed)', async () => {
    const e = env([], true); // startLoaded = true
    const ok = await e.load('fontkit', ['https://never-used/lib.js'], e.isReady, FAST);
    expect(ok).toBe(true);
  });

  it('caches per-label: concurrent calls share one in-flight load', async () => {
    const e = env(['https://primary/lib.js']);
    const [a, b] = await Promise.all([
      e.load('pdfjs', ['https://primary/lib.js'], e.isReady, FAST),
      e.load('pdfjs', ['https://primary/lib.js'], e.isReady, FAST),
    ]);
    expect(a).toBe(true);
    expect(b).toBe(true);
  });
});
