// @vitest-environment jsdom
//
// STEM Lab: a tool that creates an AudioContext either closes it or takes the host's shared one.
//
// WebKit (Safari, so every iPad) refuses a fifth live AudioContext with QuotaExceededError, and a context a tool
// creates and never closes stays live for the rest of the session. 80 STEM tools create one; 69 never closed it,
// each caching its own per page (Universe made a fresh one per beep). A student who visited four sound-making
// tools lost sound in every later one: the creation threw inside try/catch and the click went silent (Echo
// Navigator and Road Ready each hit this and fixed only themselves). Chrome has no cap but keeps every leaked
// context's audio thread running. The host now owns one shared context; the 69 tools take it through
// `window.StemLab.audioContext()`, and the 11 that close their own keep their own.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const DIRS = ['stem_lab', 'desktop/web-app/public/stem_lab'];
const HELPER_CALL = 'window.StemLab.audioContext ? window.StemLab.audioContext() : new (window.AudioContext || window.webkitAudioContext)()';
const CREATE = /new\s*\(?\s*(?:window\.)?(?:webkit)?AudioContext/g;
const ASSIGN = /([A-Za-z_$][\w$.]*)\s*=\s*new\s*\(?\s*(?:window\.)?(?:webkit)?AudioContext[A-Za-z]*(?:\s*\|\|\s*window\.webkitAudioContext\s*\))?\s*\(\)/g;
const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A tool "closes its own" when some reference it assigned the context to is closed, or a close() lands on an
// audio-named receiver (refs and runtime bags carry the context under another name).
function closesItsOwn(source) {
  const idents = new Set(); let m;
  const assign = new RegExp(ASSIGN.source, 'g');
  while ((m = assign.exec(source))) idents.add(m[1]);
  for (const id of idents) {
    const base = id.replace(/\.current$/, '');
    if (new RegExp(esc(id) + '(\\.current)?\\.close\\(').test(source) || new RegExp(esc(base) + '(\\.current)?\\.close\\(').test(source)) return true;
  }
  return (source.match(/[\w$.]+\.close\(\)/g) || []).some((x) => /ctx|Ctx|AC\b|audio|Audio|Context/.test(x));
}

describe('STEM Lab AudioContext sharing (sweep)', () => {
  const tools = readdirSync(resolve(ROOT, 'stem_lab')).filter((name) => /^stem_tool_.*\.js$/.test(name));

  it('every tool that creates an AudioContext shares the host one or closes its own, in root and in the desktop mirror', { timeout: 60000 }, () => {
    const leaking = [];
    let shared = 0, own = 0;
    for (const dir of DIRS) {
      for (const name of tools) {
        const source = readFileSync(resolve(ROOT, dir, name), 'utf8');
        const creates = (source.match(CREATE) || []).length;
        if (!creates) continue;
        const viaHelper = source.split(HELPER_CALL).length - 1;
        if (viaHelper === creates) { if (dir === 'stem_lab') shared += 1; continue; }
        if (closesItsOwn(source)) { if (dir === 'stem_lab') own += 1; continue; }
        leaking.push(dir + '/' + name + ' (' + (creates - viaHelper) + ' private, never closed)');
      }
    }
    expect(leaking, 'replace new (window.AudioContext || window.webkitAudioContext)() with (window.StemLab && ' + HELPER_CALL + ')').toEqual([]);
    expect(shared, 'tools on the shared context').toBeGreaterThanOrEqual(69);
    expect(own, 'tools closing their own').toBeGreaterThanOrEqual(11);
  });

  it('the host helper is present in all three host-module copies', () => {
    for (const hostPath of ['stem_lab/stem_lab_module.js', 'desktop/web-app/public/stem_lab/stem_lab_module.js', 'desktop/web-app/public/stem_lab_module.js']) {
      const host = readFileSync(resolve(ROOT, hostPath), 'utf8');
      const at = host.indexOf('audioContext: function () {');
      expect(at, hostPath + ' exposes audioContext').toBeGreaterThan(-1);
      const body = host.slice(at, at + 900);
      expect(body).toContain("shared.state !== 'closed'");
      expect(body).toContain("shared.state === 'suspended'");
      expect(body).toContain('shared.close = function () { return Promise.resolve(); }');
    }
  });
});

describe('window.StemLab.audioContext', () => {
  const MODULE = readFileSync(resolve(ROOT, 'stem_lab/stem_lab_module.js'), 'utf8');
  const REACT = readFileSync(resolve(ROOT, 'desktop/web-app/node_modules/react/umd/react.production.min.js'), 'utf8');
  let made;
  class FakeAudioContext {
    constructor() { made.push(this); this.state = 'running'; this.resumed = 0; }
    resume() { this.resumed += 1; this.state = 'running'; return Promise.resolve(); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
    close() { this.state = 'closed'; return Promise.resolve(); }
  }
  beforeAll(() => {
    delete window.StemLab;
    window.AlloModules = {};
    window.__alloT = (k, fb) => fb || k;
    new Function(REACT)();
    window.React = window.React || globalThis.React;
    new Function(MODULE)();
  });
  afterEach(() => {
    delete window.AudioContext;
    delete window.webkitAudioContext;
    delete window.StemLab._sharedAudioContext;
  });

  it('hands every caller the same context', () => {
    made = [];
    window.AudioContext = FakeAudioContext;
    const a = window.StemLab.audioContext();
    const b = window.StemLab.audioContext();
    expect(a).toBe(b);
    expect(made.length).toBe(1);
  });

  it('makes close() a no-op on the shared instance so one tool cannot silence the rest', async () => {
    made = [];
    window.AudioContext = FakeAudioContext;
    const shared = window.StemLab.audioContext();
    await shared.close();
    expect(shared.state).toBe('running');
    expect(window.StemLab.audioContext()).toBe(shared);
  });

  it('resumes a context another tool suspended, because the caller is about to play', () => {
    made = [];
    window.AudioContext = FakeAudioContext;
    const shared = window.StemLab.audioContext();
    shared.suspend();
    expect(window.StemLab.audioContext()).toBe(shared);
    expect(shared.state).toBe('running');
    expect(shared.resumed).toBe(1);
  });

  it('replaces a context that really did close (a page-level teardown), and honours the webkit prefix', () => {
    made = [];
    window.webkitAudioContext = FakeAudioContext;
    const first = window.StemLab.audioContext();
    FakeAudioContext.prototype.close.call(first); // bypass the guard: the platform closed it
    expect(first.state).toBe('closed');
    const second = window.StemLab.audioContext();
    expect(second).not.toBe(first);
    expect(made.length).toBe(2);
  });

  it('throws what a tool\'s own `new` would when Web Audio is missing, so existing try/catch paths keep their meaning', () => {
    expect(() => window.StemLab.audioContext()).toThrow();
  });
});

describe('tools that used to suspend "their" context', () => {
  it('Geometry World mutes with a flag every sound helper reads, not by suspending the shared context', () => {
    // Suspending the shared context would silence every other tool, and any other tool's sound would undo the mute.
    for (const dir of DIRS) {
      const source = readFileSync(resolve(ROOT, dir, 'stem_tool_geometryworld.js'), 'utf8');
      expect(source).toContain('function getAC() { if (_gwMuted) return null;');
      expect(source).toContain('_gwMuted = !!soundMuted;');
      expect(source).toContain('_gwMuted = newMuted;');
      expect(source).not.toContain('ac.suspend()');
    }
  });
});
