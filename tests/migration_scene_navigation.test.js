import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const mounts = new Set();
let tool;
const sourcePath = process.env.MIGRATION_SCENE_NAVIGATION_CANDIDATE || 'stem_lab/stem_tool_migration.js';
const clone = value => JSON.parse(JSON.stringify(value));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function committedProps(element) {
  const key = Object.keys(element).find(name => name.startsWith('__reactProps$'));
  if (!key) throw Error('Expected a committed React action');
  return element[key];
}
function nativeRoot(value) {
  if (value) Object.defineProperty(document, 'fullscreenElement', { configurable: true, value });
  else delete document.fullscreenElement;
}
function fixture(seed = {}) {
  let state = { tab: 'flight3d', flightCamera: 'study', flightPaused: true, flightSpecies: 'canada_goose',
    flightStudyYaw: 35, flightStudyPitch: 15, flightStudyZoom: 1.2,
    flightStudyObservations: { drafts: { 'canada_goose:tail': 'Keep my observation draft.' }, records: {} },
    flightInvestigation: { variable: 'wind', prediction: 'Keep my prediction.', trials: [], evidence: 'Keep my evidence.' },
    inquiry: { hypothesis: 'Keep my inquiry.' }, ...seed }, refresh;
  const writes = [], award = vi.fn(), refs = [];
  const tracedReact = { ...React, useRef(value) { const ref = React.useRef(value); if (!refs.includes(ref)) refs.push(ref); return ref; } };
  const ctx = makeCtx({ React: tracedReact, announceToSR: null, awardXP: award,
    update: (_, key, value) => { writes.push({ [key]: value }); state = { ...state, [key]: value }; refresh(n => n + 1); },
    updateMulti: (_, values) => { writes.push(values); state = { ...state, ...values }; refresh(n => n + 1); }
  });
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); mounts.add(root);
  function Component() { refresh = React.useState(0)[1]; ctx.toolData = { migration: state }; return tool.render(ctx); }
  act(() => root.render(React.createElement(Component)));
  const ui = {
    host, root, writes, award, refs,
    get state() { return state; },
    get stage() { return host.querySelector('[id="migration-flight-stage"]'); },
    get deck() { return host.querySelector('.migration-flight-deck'); },
    get focus() { return host.querySelector('[data-scene-focus]'); },
    get fullscreen() { return host.querySelector('[data-scene-fullscreen]'); },
    get feedback() { return host.querySelector('[data-scene-feedback]'); },
    get live() { return refs.find(ref => ref.current && typeof ref.current === 'object' && 'flightSpeedValues' in ref.current)?.current; },
    click(element = ui.fullscreen) { expect(element).not.toBeNull(); element.focus(); act(() => element.click()); },
    set(values) { act(() => { state = { ...state, ...values }; refresh(n => n + 1); }); },
    unmount() { if (!mounts.has(root)) return; act(() => root.unmount()); mounts.delete(root); host.remove(); }
  };
  return ui;
}
async function settle(callback) { await act(async () => { callback(); await Promise.resolve(); await Promise.resolve(); }); }
function expectPreserved(ui, before) {
  expect(ui.state).toEqual(before); expect(ui.writes).toEqual([]); expect(ui.award).not.toHaveBeenCalled();
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.stubGlobal('matchMedia', query => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {} }));
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(620);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function(kind) {
    if (kind !== '2d') return null;
    if (!this._sceneNavigationContext) this._sceneNavigationContext = new Proxy({ canvas: this,
      measureText: text => ({ width: String(text).length * 6 }),
      createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} })
    }, { get: (target, key) => key in target ? target[key] : () => {}, set: (target, key, value) => { target[key] = value; return true; } });
    return this._sceneNavigationContext;
  });
  resetStemLab(); tool = loadTool(sourcePath, 'migration');
});
afterEach(async () => {
  await act(async () => { mounts.forEach(root => root.unmount()); mounts.clear(); });
  document.body.innerHTML = '';
  delete window.__alloStemFS; delete document.fullscreenElement; delete document.webkitFullscreenElement;
  delete document.exitFullscreen; delete document.webkitExitFullscreen;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('Migration owned scene focus actions', () => {
  it('focuses only the activated instance and reports its local keyboard route', () => {
    const first = fixture(), second = fixture({ flightSpecies: 'monarch' });
    const before = clone(second.state);
    second.click(second.focus);
    expect(document.activeElement).toBe(second.stage);
    expect(second.feedback.textContent).toMatch(/3D scene focused.*keyboard instructions/i);
    expect(first.feedback.textContent).toBe(''); expect(first.writes).toEqual([]);
    expectPreserved(second, before);
  });

  it.each(['hidden', 'inert', 'aria-hidden', 'display', 'disabled'])('rejects an unexposed %s focus action', mode => {
    const ui = fixture(), before = clone(ui.state), action = ui.focus, handler = committedProps(action).onClick;
    if (mode === 'hidden') action.hidden = true;
    else if (mode === 'inert') ui.deck.setAttribute('inert', '');
    else if (mode === 'aria-hidden') ui.deck.setAttribute('aria-hidden', 'true');
    else if (mode === 'display') action.style.display = 'none';
    else action.disabled = true;
    const outside = document.createElement('button'); document.body.append(outside); outside.focus();
    act(() => handler({ currentTarget: action }));
    expect(document.activeElement).toBe(outside); expect(ui.feedback.textContent).toBe(''); expectPreserved(ui, before);
  });

  it('rejects retained handlers after a new commit, wrong-instance events and detached controls', () => {
    const first = fixture(), second = fixture();
    const action = first.focus, old = committedProps(action).onClick;
    first.set({ flightStudyYaw: 45 });
    second.focus.focus();
    act(() => old({ currentTarget: action })); expect(document.activeElement).toBe(second.focus);
    act(() => committedProps(first.focus).onClick({ currentTarget: second.focus }));
    expect(document.activeElement).toBe(second.focus);
    const latest = committedProps(first.focus).onClick, detached = first.focus;
    first.unmount(); act(() => latest({ currentTarget: detached }));
    expect(document.activeElement).toBe(second.focus); expect(second.feedback.textContent).toBe('');
  });

  it('does not focus a hidden scene or a scene outside another fullscreen root', () => {
    const first = fixture(), second = fixture();
    first.stage.hidden = true; first.click(first.focus); expect(document.activeElement).toBe(first.focus);
    expect(first.feedback.textContent).toBe(''); first.stage.hidden = false;
    nativeRoot(second.deck); first.click(first.focus); expect(document.activeElement).toBe(first.focus);
    expect(first.feedback.textContent).toBe('');
    nativeRoot(null); second.deck.setAttribute('data-allo-fullscreen-active', 'true');
    first.click(first.focus); expect(document.activeElement).toBe(first.focus); expect(first.feedback.textContent).toBe('');
  });
});

describe('Migration fullscreen feedback and transition ownership', () => {
  it('uses only the activated deck with a synchronous custom hook and verifies both outcomes', () => {
    const first = fixture(), second = fixture(), before = clone(second.state);
    window.__alloStemFS = vi.fn(deck => deck.toggleAttribute('data-test-hook-called'));
    window.__alloStemFS.mockImplementation(deck => {
      if (deck.getAttribute('data-allo-fullscreen-active') === 'true') deck.removeAttribute('data-allo-fullscreen-active');
      else deck.setAttribute('data-allo-fullscreen-active', 'true');
    });
    second.click(); expect(window.__alloStemFS).toHaveBeenLastCalledWith(second.deck);
    expect(second.feedback.textContent).toBe('3D flight deck entered fullscreen.');
    expect(document.activeElement).toBe(second.fullscreen); expect(first.feedback.textContent).toBe('');
    second.click(); expect(second.feedback.textContent).toBe('3D flight deck left fullscreen.');
    expectPreserved(second, before);
  });

  it('reports unavailable fullscreen locally without a host announcer or saved writes', () => {
    const ui = fixture(), before = clone(ui.state);
    ui.click(); expect(ui.feedback.textContent).toMatch(/Fullscreen is unavailable/);
    expect(document.activeElement).toBe(ui.fullscreen); expectPreserved(ui, before);
  });

  it.each(['throw', 'reject', 'no-op'])('reports %s without claiming a successful native transition', async mode => {
    const ui = fixture(), before = clone(ui.state);
    ui.deck.requestFullscreen = vi.fn(() => mode === 'throw' ? (() => { throw Error('Denied'); })() : mode === 'reject' ? Promise.reject(Error('Denied')) : Promise.resolve());
    ui.click(); await settle(() => {});
    expect(ui.feedback.textContent).toMatch(/Fullscreen could not be changed/);
    expect(ui.feedback.textContent).not.toMatch(/entered|left fullscreen/);
    expect(document.activeElement).toBe(ui.fullscreen); expectPreserved(ui, before);
  });

  it('waits for a deferred native promise and verifies the current fullscreen root', async () => {
    const ui = fixture(), before = clone(ui.state), pending = deferred();
    ui.deck.requestFullscreen = vi.fn(() => pending.promise);
    ui.click(); expect(ui.feedback.textContent).toMatch(/Changing fullscreen view/);
    expect(ui.feedback.textContent).not.toMatch(/entered/);
    await settle(() => { nativeRoot(ui.deck); pending.resolve(); });
    expect(ui.feedback.textContent).toBe('3D flight deck entered fullscreen.');
    expect(document.activeElement).toBe(ui.fullscreen); expectPreserved(ui, before);
  });

  it('observes a legacy void native API and exits only the own root', () => {
    const ui = fixture(); ui.deck.webkitRequestFullscreen = vi.fn();
    ui.click(); expect(ui.feedback.textContent).toMatch(/Changing fullscreen view/);
    act(() => { Object.defineProperty(document, 'webkitFullscreenElement', { configurable: true, value: ui.deck }); document.dispatchEvent(new Event('webkitfullscreenchange')); });
    expect(ui.feedback.textContent).toBe('3D flight deck entered fullscreen.');
    document.webkitExitFullscreen = vi.fn(() => { delete document.webkitFullscreenElement; document.dispatchEvent(new Event('webkitfullscreenchange')); });
    ui.click(); expect(document.webkitExitFullscreen).toHaveBeenCalledOnce();
    expect(ui.feedback.textContent).toBe('3D flight deck left fullscreen.');
  });

  it('observes delayed custom marker changes when the host hook returns void', async () => {
    const ui = fixture(); window.__alloStemFS = vi.fn(); ui.click();
    expect(ui.feedback.textContent).toMatch(/Changing fullscreen view/);
    await settle(() => { ui.deck.setAttribute('data-allo-fullscreen-active', 'true'); });
    expect(ui.feedback.textContent).toBe('3D flight deck entered fullscreen.');
  });

  it('uses an honest unconfirmed message for a void API that never changes fullscreen', () => {
    const ui = fixture(); ui.deck.requestFullscreen = vi.fn(); ui.click();
    act(() => vi.advanceTimersByTime(2000));
    expect(ui.feedback.textContent).toMatch(/change has not been confirmed/);
    expect(ui.feedback.textContent).not.toMatch(/entered|left fullscreen/);
    act(() => { nativeRoot(ui.deck); document.dispatchEvent(new Event('fullscreenchange')); });
    expect(ui.feedback.textContent).toMatch(/change has not been confirmed/);
  });

  it('does not exit an unrelated fullscreen root or pass another deck to the host hook', () => {
    const first = fixture(), second = fixture();
    window.__alloStemFS = vi.fn(); document.exitFullscreen = vi.fn(); nativeRoot(first.deck);
    second.click(); expect(window.__alloStemFS).not.toHaveBeenCalled(); expect(document.exitFullscreen).not.toHaveBeenCalled();
    expect(second.feedback.textContent).toBe('');
    nativeRoot(second.host); second.click();
    expect(window.__alloStemFS).not.toHaveBeenCalled(); expect(document.exitFullscreen).not.toHaveBeenCalled();
    expect(second.feedback.textContent).toMatch(/Fullscreen is unavailable/);
  });

  it('keeps newer request feedback after an older promise rejects or resolves', async () => {
    const ui = fixture(), first = deferred(), second = deferred();
    ui.deck.requestFullscreen = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    ui.click(); ui.click(); await settle(() => second.reject(Error('Newer denied')));
    const message = ui.feedback.textContent; expect(message).toMatch(/could not be changed/);
    await settle(() => { nativeRoot(ui.deck); first.resolve(); });
    expect(ui.feedback.textContent).toBe(message);
  });

  it.each(['hidden', 'inert', 'disabled', 'detached', 'rerender', 'tab'])('suppresses obsolete %s completion and cleanup timers', async mode => {
    const ui = fixture(), pending = deferred(), action = ui.fullscreen;
    ui.deck.requestFullscreen = vi.fn(() => pending.promise); ui.click();
    const feedback = ui.feedback, message = feedback.textContent, deck = ui.deck;
    if (mode === 'hidden') action.hidden = true;
    else if (mode === 'inert') deck.setAttribute('inert', '');
    else if (mode === 'disabled') action.disabled = true;
    else if (mode === 'detached') ui.unmount();
    else if (mode === 'rerender') ui.set({ flightStudyYaw: 90 });
    else ui.set({ tab: 'routes' });
    await settle(() => { nativeRoot(deck); pending.resolve(); });
    act(() => vi.advanceTimersByTime(2000));
    expect(feedback.textContent).toBe(message); expect(ui.writes).toEqual([]);
  });

  it('rejects stale, detached and wrong-instance fullscreen action callbacks', () => {
    const first = fixture(), second = fixture(), action = first.fullscreen, old = committedProps(action).onClick;
    const hook = window.__alloStemFS = vi.fn(); first.set({ flightStudyYaw: 50 });
    act(() => old({ currentTarget: action }));
    act(() => committedProps(first.fullscreen).onClick({ currentTarget: second.fullscreen }));
    const current = committedProps(first.fullscreen).onClick, detached = first.fullscreen;
    first.unmount(); act(() => current({ currentTarget: detached }));
    expect(hook).not.toHaveBeenCalled(); expect(second.feedback.textContent).toBe('');
  });

  it('keeps transient live camera settings and drafts while pending status changes', async () => {
    const ui = fixture(), before = clone(ui.state), live = ui.live, pending = deferred();
    live.flightStudyYaw = 95; live.flightStudyPitch = -20; live.flightStudyZoom = 0.8;
    ui.deck.requestFullscreen = vi.fn(() => pending.promise); ui.click();
    expect(ui.live).toBe(live); expect(live).toMatchObject({ flightStudyYaw: 95, flightStudyPitch: -20, flightStudyZoom: 0.8 });
    await settle(() => pending.reject(Error('Denied')));
    expect(ui.live).toBe(live); expect(live).toMatchObject({ flightStudyYaw: 95, flightStudyPitch: -20, flightStudyZoom: 0.8 });
    expectPreserved(ui, before);
  });
});
