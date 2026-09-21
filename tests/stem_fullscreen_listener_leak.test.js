import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Two leaks in the shared fullscreen helpers, which 56 tools bind a button to
// and 31 more call directly:
//
//   __alloStemFsBind attached a MutationObserver on the stage plus two
//   document listeners, and released none of them. Its guard only skips
//   re-binding the SAME button to the SAME stage, and a React remount hands
//   over a fresh pair every time, so ten tool opens left ten live observers
//   watching detached stages and twenty document listeners still running sync.
//
//   __alloStemFS's CSS-fullscreen mode added a document keydown handler that
//   only _stemFsExit removes. A tool can unmount while still in CSS
//   fullscreen -- the hub's "all tools" button does not exit first -- and the
//   handler then stayed on the document referencing a detached node, firing a
//   spurious window resize on every later Escape.

const HUB = 'stem_lab/stem_lab_module.js';
const source = () => readFileSync(HUB, 'utf8');

function bindBlock() {
  const src = source();
  const at = src.indexOf("if (typeof window !== 'undefined' && !window.__alloStemFsBind) {");
  expect(at, '__alloStemFsBind moved').toBeGreaterThanOrEqual(0);
  const end = src.indexOf('\n    }', src.indexOf('sync();\n      };', at));
  return src.slice(at, end + 6);
}

function fsBlock() {
  const src = source();
  const at = src.indexOf("if (typeof window !== 'undefined' && !window.__alloStemFS) {");
  expect(at, '__alloStemFS moved').toBeGreaterThanOrEqual(0);
  const end = src.indexOf('\n    }', src.indexOf('window.__alloStemFS = function(el)', at));
  return src.slice(at, end + 6);
}

function loadBinder() {
  const counts = { docListeners: 0, observers: 0, disconnected: 0 };
  const doc = {
    fullscreenElement: null, webkitFullscreenElement: null,
    addEventListener: () => { counts.docListeners++; },
    removeEventListener: () => { counts.docListeners--; }
  };
  function MutationObserver() {
    counts.observers++;
    this.observe = () => {};
    this.disconnect = () => { counts.disconnected++; };
  }
  const sandbox = { window: {}, document: doc, MutationObserver, Object };
  runInNewContext(bindBlock() + '\nthis.bind = window.__alloStemFsBind;', sandbox);
  return { sandbox, counts };
}

const makeEl = (connected = true) => ({
  attrs: {}, isConnected: connected,
  hasAttribute(k) { return k in this.attrs; },
  setAttribute(k, v) { this.attrs[k] = v; },
  getAttribute(k) { return this.attrs[k] || null; },
  addEventListener() {},
  firstElementChild: { textContent: '' }
});

function loadFs() {
  const keyListeners = [];
  const doc = {
    fullscreenElement: null, webkitFullscreenElement: null, mozFullScreenElement: null,
    fullscreenEnabled: false, webkitFullscreenEnabled: false,
    addEventListener: (t, fn) => keyListeners.push({ t, fn }),
    removeEventListener: (t, fn) => {
      const i = keyListeners.findIndex((l) => l.fn === fn);
      if (i >= 0) keyListeners.splice(i, 1);
    }
  };
  const sandbox = { window: { dispatchEvent: () => {}, Event: function () {} }, document: doc, Object, Event: function () {} };
  runInNewContext(fsBlock() + '\nthis.fs = window.__alloStemFS;', sandbox);
  return { sandbox, keyListeners };
}

const makeStage = () => {
  const props = {};
  return {
    isConnected: true, attrs: {},
    style: {
      setProperty: (p, v) => { props[p] = v; },
      removeProperty: (p) => { delete props[p]; },
      getPropertyValue: (p) => props[p] || ''
    },
    setAttribute(k, v) { this.attrs[k] = v; },
    removeAttribute(k) { delete this.attrs[k]; }
  };
};

describe('the fullscreen binder releases detached stages', () => {
  function openTools(n) {
    const { sandbox, counts } = loadBinder();
    const stages = [];
    for (let i = 0; i < n; i++) {
      stages.forEach((s) => { s.isConnected = false; }); // previous tool unmounted
      const stage = makeEl();
      stages.push(stage);
      sandbox.bind(makeEl(), stage);
    }
    return { sandbox, counts, stages };
  }

  it('leaves one live observer after ten tool opens, not ten', () => {
    const { counts } = openTools(10);
    expect(counts.observers).toBe(10);
    expect(counts.observers - counts.disconnected).toBe(1);
  });

  it('leaves two document listeners, not twenty', () => {
    const { counts } = openTools(10);
    // fullscreenchange + webkitfullscreenchange for the live binding only.
    expect(counts.docListeners).toBe(2);
  });

  it('never releases the stage that is still on the page', () => {
    const { sandbox, stages } = openTools(5);
    const current = stages[stages.length - 1];
    expect(current.isConnected).toBe(true);
    expect(sandbox.window.__alloStemFsBindings.some((b) => b.stage === current)).toBe(true);
  });

  it('does not grow its tracking list without bound', () => {
    const { sandbox } = openTools(20);
    expect(sandbox.window.__alloStemFsBindings.length).toBeLessThanOrEqual(2);
  });

  it('still skips a repeat bind of the same button and stage', () => {
    const { sandbox, counts } = loadBinder();
    const btn = makeEl(), stage = makeEl();
    sandbox.bind(btn, stage);
    const after = counts.observers;
    sandbox.bind(btn, stage);
    sandbox.bind(btn, stage);
    expect(counts.observers).toBe(after);
  });

  it('keeps every binding whose stage is still connected', () => {
    const { sandbox, counts } = loadBinder();
    // Two live stages at once (a tool with two fullscreen stages).
    sandbox.bind(makeEl(), makeEl());
    sandbox.bind(makeEl(), makeEl());
    expect(counts.disconnected).toBe(0);
    expect(counts.docListeners).toBe(4);
  });
});

describe('CSS fullscreen drops its Escape handler when the stage goes', () => {
  it('attaches exactly one keydown handler on enter', () => {
    const { sandbox, keyListeners } = loadFs();
    sandbox.fs(makeStage());
    expect(keyListeners).toHaveLength(1);
  });

  it('removes it on a normal exit', () => {
    const { sandbox, keyListeners } = loadFs();
    const stage = makeStage();
    sandbox.fs(stage);
    sandbox.fs(stage);
    expect(keyListeners).toHaveLength(0);
    expect(stage.__alloFsOn).toBe(false);
  });

  it('self-removes after the stage is detached', () => {
    const { sandbox, keyListeners } = loadFs();
    const stage = makeStage();
    sandbox.fs(stage);
    stage.isConnected = false;                       // tool unmounted
    keyListeners.slice().forEach((l) => l.fn({ key: 'Escape' }));
    expect(keyListeners).toHaveLength(0);
  });

  it('does not act on a detached stage', () => {
    const { sandbox, keyListeners } = loadFs();
    const stage = makeStage();
    sandbox.fs(stage);
    stage.isConnected = false;
    let resizes = 0;
    sandbox.window.dispatchEvent = () => { resizes++; };
    keyListeners.slice().forEach((l) => l.fn({ key: 'Escape' }));
    // The leaked handler used to fire a resize that made every live canvas
    // re-measure, once per leaked stage per Escape.
    expect(resizes).toBe(0);
  });

  it('a connected stage still exits on Escape', () => {
    const { sandbox, keyListeners } = loadFs();
    const stage = makeStage();
    sandbox.fs(stage);
    expect(stage.__alloFsOn).toBe(true);
    keyListeners.slice().forEach((l) => l.fn({ key: 'Escape' }));
    expect(stage.__alloFsOn).toBe(false);
    expect(keyListeners).toHaveLength(0);
  });

  it('ignores keys other than Escape', () => {
    const { sandbox, keyListeners } = loadFs();
    const stage = makeStage();
    sandbox.fs(stage);
    keyListeners.slice().forEach((l) => l.fn({ key: 'a' }));
    expect(stage.__alloFsOn).toBe(true);
  });
});
