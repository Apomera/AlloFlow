import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const mounts = new Set();
let tool;
const clone = value => JSON.parse(JSON.stringify(value));
// Canonical saved snapshots keep normalization separate from focus assertions.
const starts = {
  wind: { speciesId: 'monarch', season: 'fall', wind: -15, formationMode: 'natural', formation: 'swarm', groundSpeed: 0, benefit: 0 },
  formation: { speciesId: 'canada_goose', season: 'fall', wind: 0, formationMode: 'solo', formation: 'solo', groundSpeed: 40, benefit: 0 },
  season: { speciesId: 'canada_goose', season: 'fall', wind: 8, formationMode: 'natural', formation: 'v', groundSpeed: 58, benefit: 22 }
};
function attempt(goal = 'wind') {
  const change = goal === 'wind' ? { wind: 4, groundSpeed: 21 } : goal === 'formation' ? { formationMode: 'v', formation: 'v', benefit: 22 } : { season: 'spring' };
  return { baseline: { ...starts[goal] }, snapshot: { ...starts[goal], ...change }, prediction: 'Recorded prediction.', notes: 'Original explanation.', reflection: 'Saved later reflection.' };
}
function challenges(selectedId = 'wind') {
  return { selectedId, work: Object.fromEntries(Object.keys(starts).map(id => [id, {
    prediction: 'Current ' + id + ' prediction.', notes: 'Current ' + id + ' notes.', setup: { ...starts[id] }, attempts: [attempt(id)]
  }])) };
}
function trial(prediction = 'Recorded trial prediction.') {
  return { variable: 'wind', prediction, baseline: { speciesId: 'canada_goose', season: 'fall', wind: -4, formationMode: 'natural' },
    snapshot: { speciesId: 'canada_goose', season: 'fall', wind: 10, formationMode: 'natural' } };
}
function notebook() {
  return { variable: 'wind', prediction: 'Current investigation prediction.', baseline: { ...trial().baseline }, trials: [trial()], evidence: 'My saved evidence.', explanation: 'My saved reasoning.' };
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function committedProps(element) {
  const key = Object.keys(element).find(name => name.startsWith('__reactProps$'));
  if (!key) throw new Error('Expected a committed React control.');
  return element[key];
}
function enterText(element, value) {
  Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
}
function work(state) {
  return clone(Object.fromEntries(['flightChallenges', 'flightInvestigation', 'flightStudyObservations', 'inquiry'].map(key => [key, state[key]])));
}
function fixture(seed = {}) {
  let state = { tab: 'flight3d', flightCamera: 'study', flightPaused: true, flightSpecies: 'canada_goose', flightSeason: 'fall', flightFormation: 'natural', flightWind: 8,
    flightChallenges: challenges(), flightInvestigation: notebook(), flightStudyObservations: { drafts: { 'canada_goose:tail': 'Keep my Study draft.' }, records: {} },
    inquiry: { hypothesis: 'Keep my independent inquiry.' }, ...seed }, refresh;
  const refs = [], writes = [], award = vi.fn();
  const tracedReact = { ...React, useRef(value) { const ref = React.useRef(value); if (!refs.includes(ref)) refs.push(ref); return ref; } };
  const ctx = makeCtx({ React: tracedReact, awardXP: award, announceToSR: vi.fn(),
    update: (_, key, value) => { writes.push({ [key]: value }); state = { ...state, [key]: value }; refresh(n => n + 1); },
    updateMulti: (_, patch) => { writes.push(patch); state = { ...state, ...patch }; refresh(n => n + 1); }
  });
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); mounts.add(root);
  function Component() { refresh = React.useState(0)[1]; ctx.toolData = { migration: state }; return tool.render(ctx); }
  act(() => root.render(React.createElement(Component)));
  const stage = host.querySelector("[data-migration-id=\"migration-flight-stage\"]");
  const engineRef = refs[refs.findIndex(ref => ref.current === stage) + 1];
  const outside = document.createElement('button'); outside.type = 'button'; outside.textContent = 'Continue elsewhere'; document.body.append(outside);
  const ui = {
    host, root, stage, engineRef, writes, award, outside,
    get state() { return state; },
    panel() { return host.querySelector('[data-migration-flight-challenges]'); },
    row() { return host.querySelector('[data-flight-challenge-attempt="1"]'); },
    reflection() { return ui.row()?.querySelector('[data-flight-challenge-reflection]'); },
    edit() { return ui.row()?.querySelector('[data-flight-reflection-action="edit"]'); },
    input() { return ui.row()?.querySelector('[data-flight-reflection-input]'); },
    reflectionAction(name) { return ui.row()?.querySelector('[data-flight-reflection-action="' + name + '"]'); },
    back() { return host.querySelector('[data-flight-challenge-return]'); },
    evidenceReturn() { return host.querySelector('[data-trial-evidence-return]'); },
    evidence() { return host.querySelector("[data-migration-id=\"migration-experiment-evidence\"]"); },
    notebook() { return host.querySelector('.migration-experiment'); },
    click(element) { expect(element).not.toBeNull(); element.focus(); act(() => element.click()); },
    openReflection() {
      ui.panel().open = true; host.querySelector('[data-flight-challenge-history]').open = true; ui.reflection().open = true;
      ui.click(ui.edit()); expect(ui.input()).not.toBeNull();
    },
    type(value) { act(() => enterText(ui.input(), value)); },
    set(patch) { act(() => { state = { ...state, ...patch }; refresh(n => n + 1); }); },
    async prepare(kind) {
      if (kind === 'challenge') {
        ui.openReflection(); ui.type('Keep my unsaved later reflection.');
        ui.click(ui.row().querySelector('[data-flight-challenge-inspect="snapshot"]'));
        const owner = refs.find(ref => ref.current?.panel && ref.current?.challenges)?.current;
        const request = owner.inspection;
        engineRef.current = { host: stage, speciesId: state.flightSpecies, formationMode: state.flightFormation, season: state.flightSeason,
          challengeInspectionFrame: request, contextLost: false };
        await act(async () => {
          stage.setAttribute('data-flight-ready', 'true'); stage.setAttribute('data-flight-challenge-frame', String(request.serial));
          await Promise.resolve(); await Promise.resolve();
        });
        expect(ui.back()).not.toBeNull();
      } else {
        ui.click(host.querySelector('[data-experiment-revisit="1"]'));
        expect(ui.evidenceReturn()).not.toBeNull();
      }
      writes.length = 0;
    },
    action(kind) { return kind === 'challenge' ? ui.back() : ui.evidenceReturn(); },
    target(kind) { return kind === 'challenge' ? ui.input() : ui.evidence(); },
    unmount() { if (!mounts.has(root)) return; act(() => root.unmount()); mounts.delete(root); host.remove(); }
  };
  return ui;
}
function nativeExit(ui, responses = [deferred()]) {
  const deck = ui.stage.closest('.migration-flight-deck');
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: deck });
  let index = 0;
  document.exitFullscreen = vi.fn(() => responses[index++].promise);
  return {
    deck, responses,
    async resolve(index = 0, clear = true) {
      await act(async () => { if (clear) delete document.fullscreenElement; responses[index].resolve(); await Promise.resolve(); await Promise.resolve(); });
    },
    async reject(index = 0) {
      await act(async () => { responses[index].reject(new Error('Fullscreen exit rejected.')); await Promise.resolve(); await Promise.resolve(); });
    }
  };
}
function assertViewingOnly(ui, before) {
  expect(work(ui.state)).toEqual(before); expect(ui.writes).toEqual([]); expect(ui.award).not.toHaveBeenCalled();
}
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('matchMedia', query => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function() {
    const noop = () => {};
    return new Proxy({ canvas: this, measureText: value => ({ width: String(value).length * 6 }),
      createLinearGradient: () => ({ addColorStop: noop }), createRadialGradient: () => ({ addColorStop: noop })
    }, { get: (target, key) => key in target ? target[key] : noop });
  });
  resetStemLab(); tool = loadTool('stem_lab/stem_tool_migration.js', 'migration');
});
afterEach(() => {
  act(() => { mounts.forEach(root => root.unmount()); mounts.clear(); });
  window.dispatchEvent(new Event('blur')); document.body.innerHTML = '';
  delete document.fullscreenElement; delete document.webkitFullscreenElement; delete document.exitFullscreen; delete document.webkitExitFullscreen;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('Reflection focus respects the learner’s latest intent', () => {
  it.each(['cancel', 'save'])('returns to its own Edit control after %s without changing unrelated work', action => {
    const ui = fixture(); ui.openReflection(); ui.type('A later observation.'); const before = work(ui.state);
    ui.click(ui.reflectionAction(action));
    expect(document.activeElement).toBe(ui.edit()); expect(ui.input()).toBeNull();
    if (action === 'save') {
      const expected = clone(before); expected.flightChallenges.work.wind.attempts[0].reflection = 'A later observation.';
      expect(work(ui.state)).toEqual(expected); expect(ui.writes).toHaveLength(1);
    } else { expect(work(ui.state)).toEqual(before); expect(ui.writes).toEqual([]); }
    expect(ui.award).not.toHaveBeenCalled();
  });
  it.each(['cancel', 'save'])('does not pull focus back after another control is chosen during %s', action => {
    const ui = fixture(); ui.openReflection(); ui.type('Another reflection.'); const button = ui.reflectionAction(action); button.focus();
    act(() => { button.click(); ui.outside.focus(); });
    expect(document.activeElement).toBe(ui.outside); expect(ui.input()).toBeNull();
  });
  it.each(['closed', 'inert'])('does not focus a %s reflection destination', condition => {
    const ui = fixture(); ui.openReflection(); const button = ui.reflectionAction('cancel'); button.focus();
    act(() => { button.click(); if (condition === 'closed') ui.reflection().open = false; else ui.panel().setAttribute('inert', ''); });
    expect(document.activeElement).not.toBe(ui.edit());
  });
  it('cancels reflection focus on unmount and retains the saved reflection', () => {
    const ui = fixture(); ui.openReflection(); ui.type('Do not save this.'); const before = work(ui.state), button = ui.reflectionAction('cancel'); button.focus();
    act(() => { button.click(); ui.unmount(); });
    expect(work(ui.state)).toEqual(before); expect(ui.writes).toEqual([]); expect(document.activeElement).toBe(document.body);
  });
});

for (const kind of ['challenge', 'trial']) describe(kind + ' fullscreen focus intent', () => {
  it('returns to the intended field after the fullscreen exit finishes', async () => {
    const ui = fixture(); await ui.prepare(kind); const before = work(ui.state), action = ui.action(kind), target = ui.target(kind), exit = nativeExit(ui);
    ui.click(action); expect(document.activeElement).toBe(action); expect(document.exitFullscreen).toHaveBeenCalledOnce();
    await exit.resolve(); expect(document.activeElement).toBe(target); assertViewingOnly(ui, before);
  });
  it('cancels permanently after focus leaves and comes back to the action', async () => {
    const ui = fixture(); await ui.prepare(kind); const before = work(ui.state), action = ui.action(kind), exit = nativeExit(ui);
    ui.click(action); ui.outside.focus(); action.focus(); await exit.resolve();
    expect(document.activeElement).toBe(action); assertViewingOnly(ui, before);
  });
  it('cleans up a rejected exit so a later explicit return can succeed', async () => {
    const ui = fixture(); await ui.prepare(kind); const action = ui.action(kind), before = work(ui.state), rejected = nativeExit(ui);
    ui.click(action); await rejected.reject(); expect(document.activeElement).toBe(action);
    const retry = nativeExit(ui); ui.click(action); await retry.resolve(); expect(document.activeElement).toBe(ui.target(kind)); assertViewingOnly(ui, before);
  });
  it('rejects a changed saved context while the exit is pending', async () => {
    const ui = fixture(); await ui.prepare(kind); const action = ui.action(kind), exit = nativeExit(ui); ui.click(action);
    if (kind === 'challenge') ui.set({ flightChallenges: challenges('formation') });
    else ui.set({ flightInvestigation: { ...ui.state.flightInvestigation, trials: [trial('A different captured prediction.')] } });
    const after = work(ui.state), writes = ui.writes.length; ui.outside.focus(); await exit.resolve();
    expect(document.activeElement).toBe(ui.outside); expect(work(ui.state)).toEqual(after); expect(ui.writes).toHaveLength(writes);
  });
  it.each(['hidden', 'inert'])('rejects a target whose containing panel becomes %s', async attribute => {
    const ui = fixture(); await ui.prepare(kind); const before = work(ui.state), action = ui.action(kind), exit = nativeExit(ui); ui.click(action);
    const panel = kind === 'challenge' ? ui.panel() : ui.notebook(); panel.setAttribute(attribute, '');
    await exit.resolve(); expect(document.activeElement).toBe(action); assertViewingOnly(ui, before);
  });
  it('ignores an exit callback after the tool has unmounted', async () => {
    const ui = fixture(); await ui.prepare(kind); const before = work(ui.state), target = ui.target(kind), focus = vi.spyOn(target, 'focus'), exit = nativeExit(ui);
    ui.click(ui.action(kind)); ui.unmount(); ui.outside.focus(); await exit.resolve();
    expect(document.activeElement).toBe(ui.outside); expect(focus).not.toHaveBeenCalled(); assertViewingOnly(ui, before);
  });
  it('does not focus outside a native fullscreen container that has not actually exited', async () => {
    const ui = fixture(); await ui.prepare(kind); const before = work(ui.state), action = ui.action(kind), exit = nativeExit(ui);
    ui.click(action); await exit.resolve(0, false); expect(document.activeElement).toBe(action); assertViewingOnly(ui, before);
  });
  it('lets only the latest of two pending return actions transfer focus', async () => {
    const ui = fixture(); await ui.prepare(kind); const before = work(ui.state), action = ui.action(kind), target = ui.target(kind), focus = vi.spyOn(target, 'focus');
    const exit = nativeExit(ui, [deferred(), deferred()]); ui.click(action); ui.click(action);
    expect(document.exitFullscreen).toHaveBeenCalledTimes(2); await exit.resolve(0);
    expect(document.activeElement).toBe(action); expect(focus).not.toHaveBeenCalled(); await exit.resolve(1);
    expect(document.activeElement).toBe(target); expect(focus).toHaveBeenCalledOnce(); assertViewingOnly(ui, before);
  });
  it('does not reuse a detached destination field', async () => {
    const ui = fixture(); await ui.prepare(kind); const before = work(ui.state), action = ui.action(kind), target = ui.target(kind), focus = vi.spyOn(target, 'focus'), exit = nativeExit(ui);
    ui.click(action); target.remove(); await exit.resolve(); expect(document.activeElement).toBe(action); expect(focus).not.toHaveBeenCalled(); assertViewingOnly(ui, before);
  });
  it('requires the custom fullscreen hook to expose the destination before focusing', async () => {
    const ui = fixture(); await ui.prepare(kind); const before = work(ui.state), action = ui.action(kind), target = ui.target(kind), deck = ui.stage.closest('.migration-flight-deck');
    deck.setAttribute('data-allo-fullscreen-active', 'true'); vi.stubGlobal('__alloStemFS', vi.fn(() => {}));
    ui.click(action); expect(document.activeElement).toBe(action);
    window.__alloStemFS.mockImplementation(node => node.removeAttribute('data-allo-fullscreen-active'));
    ui.click(action); expect(document.activeElement).toBe(target); assertViewingOnly(ui, before);
  });
});

describe('Shared pending focus intent cancellation', () => {
  it.each(['pointer', 'keyboard', 'window blur'])('cancels a trial return on %s even without a focus change', async type => {
    const ui = fixture(); await ui.prepare('trial'); const before = work(ui.state), action = ui.action('trial'), exit = nativeExit(ui); ui.click(action);
    act(() => {
      if (type === 'pointer') ui.outside.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 }));
      else if (type === 'keyboard') action.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Tab' }));
      else window.dispatchEvent(new Event('blur'));
    });
    await exit.resolve(); expect(document.activeElement).toBe(action); assertViewingOnly(ui, before);
  });
  it('accepts same-workspace AT activation but cancels a later return to that initial focus', async () => {
    const ui = fixture(); await ui.prepare('trial'); const before = work(ui.state), action = ui.action('trial'), exit = nativeExit(ui);
    ui.stage.focus();
    act(() => action.click());
    expect(document.exitFullscreen).toHaveBeenCalledOnce(); expect(document.activeElement).toBe(ui.stage);
    act(() => { action.focus(); ui.stage.focus(); });
    await exit.resolve(); expect(document.activeElement).toBe(ui.stage); assertViewingOnly(ui, before);
  });
  it('does not acquire focus from another instance at activation', async () => {
    const first = fixture(), second = fixture(); await second.prepare('trial'); const action = second.action('trial'), before = work(second.state), exit = nativeExit(second);
    const other = first.host.querySelector("[data-migration-id=\"migration-experiment-evidence\"]"); other.focus();
    act(() => action.click()); await exit.resolve(); expect(document.activeElement).toBe(other); assertViewingOnly(second, before);
  });
  it('uses its own instance’s evidence field instead of a duplicate global ID', async () => {
    const first = fixture(), second = fixture(); await second.prepare('trial'); const before = work(second.state), exit = nativeExit(second);
    second.click(second.action('trial')); await exit.resolve();
    expect(document.activeElement).toBe(second.evidence()); expect(document.activeElement).not.toBe(first.evidence()); assertViewingOnly(second, before);
  });
});
