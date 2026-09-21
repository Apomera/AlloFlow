import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// `var _stemAudioCtx = null;` lived INSIDE StemLabModal, so it was re-declared
// on every RENDER of the hub -- not merely every mount -- and the next beep
// constructed a fresh AudioContext that nothing ever closed. The hub
// re-renders on search input, catalog filter, XP award, quest tick and theme
// toggle, so this was reached in ordinary use. WebKit refuses a fifth live
// context and Chromium a seventh; past that the constructor throws, stemBeep's
// bare catch swallows it, and the XP chime and celebration fanfare go silent
// for the rest of the session with nothing reported.
//
// The 2026-09-14 tool sweep added window.StemLab.audioContext() for exactly
// this problem across 80 tools. The hub's own helper was missed by it.

const HUB = 'stem_lab/stem_lab_module.js';
const source = () => readFileSync(HUB, 'utf8');

function extractBalanced(src, openAt, openChar, closeChar) {
  let depth = 0, quote = null, lineComment = false, blockComment = false;
  for (let i = openAt; i < src.length; i++) {
    const char = src[i], next = src[i + 1];
    if (lineComment) { if (char === '\n') lineComment = false; continue; }
    if (blockComment) { if (char === '*' && next === '/') { blockComment = false; i++; } continue; }
    if (quote) { if (char === '\\') { i++; continue; } if (char === quote) quote = null; continue; }
    if (char === '/' && next === '/') { lineComment = true; i++; continue; }
    if (char === '/' && next === '*') { blockComment = true; i++; continue; }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue; }
    if (char === openChar) depth++;
    if (char === closeChar) { depth--; if (depth === 0) return src.slice(openAt, i + 1); }
  }
  throw new Error('Could not find balanced ' + openChar + closeChar);
}

function extractFunction(src, name) {
  const declaration = new RegExp('function ' + name + '\\s*\\(').exec(src);
  expect(declaration, 'hub no longer declares ' + name).not.toBeNull();
  const openAt = src.indexOf('{', declaration.index);
  return src.slice(declaration.index, openAt) + extractBalanced(src, openAt, '{', '}');
}

function audioContextSource(src) {
  const at = src.indexOf('audioContext: function () {');
  expect(at, 'shared audioContext getter is gone').toBeGreaterThanOrEqual(0);
  return 'function audioContext() ' + extractBalanced(src, src.indexOf('{', at + 24), '{', '}');
}

// A fake AudioContext with a browser-style cap.
function makeCtor(cap, counters) {
  return function FakeCtx() {
    if (counters.live >= cap) {
      const e = new Error('max instances');
      e.name = 'NotSupportedError';
      throw e;
    }
    counters.created++; counters.live++;
    this.state = 'running';
    this.currentTime = 0;
    this.destination = {};
    this.createOscillator = () => ({ connect() {}, frequency: {}, start() {}, stop() {} });
    this.createGain = () => ({ connect() {}, gain: { value: 0, exponentialRampToValueAtTime() {} } });
    this.resume = () => { this.state = 'running'; };
    this.close = () => { counters.live--; return Promise.resolve(); };
  };
}

function loadWithGetter(cap = 6) {
  const counters = { created: 0, live: 0 };
  const src = source();
  const sandbox = { window: { AudioContext: makeCtor(cap, counters), StemLab: {} }, Promise };
  runInNewContext([
    audioContextSource(src),
    'window.StemLab.audioContext = audioContext;',
    extractFunction(src, 'stemBeep'),
    'this.beep = stemBeep;'
  ].join('\n'), sandbox);
  return { sandbox, counters };
}

describe('the hub beep uses one shared AudioContext', () => {
  it('creates exactly one across many renders', () => {
    const { sandbox, counters } = loadWithGetter();
    for (let i = 0; i < 20; i++) sandbox.beep(523, 0.08, 0.1);
    expect(counters.created).toBe(1);
  });

  it('never exceeds the browser cap, so the chime keeps playing', () => {
    // The regression: the 7th render went silent and stayed silent.
    const { sandbox, counters } = loadWithGetter(6);
    for (let i = 0; i < 30; i++) sandbox.beep(523, 0.08, 0.1);
    expect(counters.live).toBeLessThanOrEqual(6);
    expect(counters.created).toBe(1);
  });

  it('resumes a suspended context instead of replacing it', () => {
    const { sandbox, counters } = loadWithGetter();
    sandbox.beep(523, 0.08, 0.1);
    const shared = sandbox.window.StemLab._sharedAudioContext;
    shared.state = 'suspended';
    let resumed = false;
    shared.resume = () => { resumed = true; };
    sandbox.beep(440, 0.1, 0.1);
    expect(resumed).toBe(true);
    expect(counters.created).toBe(1);
  });

  it('no longer holds a context in a component-scoped variable', () => {
    // Assert against the FUNCTION, not the whole file: the comment above
    // stemBeep quotes the old declaration to explain the bug, and a
    // whole-file search would match that prose forever.
    const fn = extractFunction(source(), 'stemBeep');
    const code = fn.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    expect(code).not.toContain('_stemAudioCtx');
  });

  it('asks the host getter before constructing anything', () => {
    const fn = extractFunction(source(), 'stemBeep');
    const getterAt = fn.indexOf('window.StemLab.audioContext()');
    const newAt = fn.indexOf('new (window.AudioContext');
    expect(getterAt).toBeGreaterThanOrEqual(0);
    // The bare `new` must only be the fallback arm.
    expect(getterAt).toBeLessThan(newAt);
  });
});

describe('the beep still works without the host getter', () => {
  it('falls back for a stub harness that defines no getter', () => {
    const counters = { created: 0, live: 0 };
    const sandbox = { window: { AudioContext: makeCtor(6, counters), StemLab: {} }, Promise };
    runInNewContext(extractFunction(source(), 'stemBeep') + '\nthis.beep = stemBeep;', sandbox);
    sandbox.beep(523, 0.08, 0.1);
    expect(counters.created).toBe(1);
  });

  it('stays silent rather than throwing when Web Audio is missing', () => {
    const sandbox = { window: { StemLab: {} }, Promise };
    runInNewContext(extractFunction(source(), 'stemBeep') + '\nthis.beep = stemBeep;', sandbox);
    // A tool calling celebrate() must not take the hub down on a browser
    // without Web Audio.
    expect(() => sandbox.beep(523, 0.08, 0.1)).not.toThrow();
  });

  it('survives a getter that throws', () => {
    const src = source();
    const sandbox = {
      window: { StemLab: { audioContext: () => { throw new Error('nope'); } } },
      Promise
    };
    runInNewContext(extractFunction(src, 'stemBeep') + '\nthis.beep = stemBeep;', sandbox);
    expect(() => sandbox.beep(523, 0.08, 0.1)).not.toThrow();
  });
});

describe('the celebration fanfare rides on the same context', () => {
  it('plays three notes without creating three contexts', () => {
    const { sandbox, counters } = loadWithGetter();
    // stemCelebrate schedules its 2nd and 3rd notes on timers; call the
    // underlying beep directly for the same effect.
    sandbox.beep(523, 0.15, 0.14);
    sandbox.beep(659, 0.15, 0.14);
    sandbox.beep(784, 0.25, 0.16);
    expect(counters.created).toBe(1);
  });
});
