import fs from 'node:fs';
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

let React, ReactDOM;
const mounted = [];
beforeAll(() => {
  const context = new Proxy({}, { get: (_, key) => key === 'measureText' ? () => ({ width: 10 }) : () => ({ addColorStop() {} }) });
  window.HTMLCanvasElement.prototype.getContext = () => context;
  window.requestAnimationFrame = globalThis.requestAnimationFrame = () => 0;
  window.cancelAnimationFrame = globalThis.cancelAnimationFrame = () => {};
  window.ResizeObserver = class { observe() {} disconnect() {} };
  window.StemLab = { registerTool() {}, makeBayViewer: () => ({}) };
  for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js', 'stem_lab/stem_tool_platetectonics.js']) {
    (0, eval)(fs.readFileSync(file, 'utf8'));
  }
  React = window.React; ReactDOM = window.ReactDOM;
});
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  while (mounted.length) { const host = mounted.pop(); ReactDOM.unmountComponentAtNode(host); host.remove(); }
  vi.clearAllTimers(); vi.useRealTimers();
});

function mount(initial = {}) {
  const host = document.createElement('div'); document.body.appendChild(host); mounted.push(host);
  let state;
  const records = vi.fn(), announce = vi.fn();
  function Host() {
    const [saved, setSaved] = React.useState(initial); state = saved;
    return React.createElement(window.AlloTectonicsForces, {
      saved, darkMode: false, announceToSR: announce, t: (_, fallback) => fallback,
      onRecord(patch) { records(patch); setSaved(prev => ({ ...prev, ...patch })); }
    });
  }
  React.act(() => ReactDOM.flushSync(() => ReactDOM.render(React.createElement(Host), host)));
  const app = {
    host, records, announce, state: () => state,
    click(selector) { React.act(() => ReactDOM.flushSync(() => host.querySelector(selector).click())); },
    start(kind, choice = 1) {
      app.click('[data-pt-forces-' + kind + ']');
      React.act(() => ReactDOM.flushSync(() => host.querySelectorAll('[data-pt-forces-predict] input')[choice].click()));
      app.click('[data-pt-forces-lock]');
    },
    pause() { if (host.querySelector('[data-pt-forces-run]').dataset.ptForcesRun === 'true') app.click('[data-pt-forces-run]'); },
    step(n = 1) { for (let i = 0; i < n; i++) app.click('[data-pt-forces-step]'); },
    unmount() { ReactDOM.unmountComponentAtNode(host); }
  };
  return app;
}

describe('Forces prediction, observation and comparison', () => {
  it('focuses the prediction baseline and restores focus on cancel without recording', () => {
    const app = mount();
    app.click('[data-pt-forces-cut]');
    expect(document.activeElement).toBe(app.host.querySelector('[data-pt-forces-predict]'));
    expect(+app.host.querySelector('[data-pt-forces-baseline]').dataset.ptForcesBaseline).toBeCloseTo(window.__alloPtForces.make().vA, 1);
    expect(app.host.querySelector('[data-pt-forces-lock]').disabled).toBe(true);
    app.click('[data-pt-forces-cancel]');
    expect(document.activeElement).toBe(app.host.querySelector('[data-pt-forces-cut]'));
    expect(app.records).toHaveBeenCalledTimes(2);
    expect(app.records.mock.calls[0][0]).toMatchObject({ draft: { pending: 'cut', choice: null, watch: null } });
    expect(app.records.mock.calls[1][0]).toEqual({ draft: null });
    expect(app.records.mock.calls.every(([patch]) => !patch.preds && !patch.observations)).toBe(true);
    expect(app.state().preds).toBeUndefined();
    expect(app.state().observations).toBeUndefined();
  });

  it('serializes rapid actions and cannot replace an unfinished observation', () => {
    const app = mount();
    React.act(() => ReactDOM.flushSync(() => { app.host.querySelector('[data-pt-forces-cut]').click(); app.host.querySelector('[data-pt-forces-continent]').click(); }));
    expect(app.host.querySelector('[data-pt-forces-predict]').dataset.ptForcesPredict).toBe('cut');
    React.act(() => ReactDOM.flushSync(() => app.host.querySelectorAll('[data-pt-forces-predict] input')[1].click()));
    const lock = app.host.querySelector('[data-pt-forces-lock]');
    React.act(() => ReactDOM.flushSync(() => { lock.click(); lock.click(); }));
    expect(app.state().preds).toHaveLength(1);
    expect(app.host.querySelector('[data-pt-forces-watch]').dataset.ptForcesWatch).toBe('cut');
    expect(document.activeElement).toBe(app.host.querySelector('[data-pt-forces-watch]'));
    expect(app.host.querySelector('[data-pt-forces-continent]').disabled).toBe(true);
    app.pause(); app.step();
    expect(app.host.querySelector('[data-pt-forces-cut]').disabled).toBe(true);
    expect(app.host.querySelector('[data-pt-forces-watch]').textContent).toContain('Time is paused');
    expect(app.state().observations).toBeUndefined();
  });

  it('records the immediate cut comparison exactly once and pauses at its completed outcome', () => {
    const app = mount(); const model = window.__alloPtForces.make(), before = model.vA;
    window.__alloPtForces.cut(model); const immediatelyAfter = model.vA;
    app.start('cut', 0); app.pause(); app.step(4);
    expect(app.state().observations).toHaveLength(1);
    expect(app.state().observations[0]).toMatchObject({ a: 'cut', vBefore: before, vAfter: immediatelyAfter, choice: 0, matched: false });
    expect(app.host.querySelector('[data-pt-forces-run]').dataset.ptForcesRun).toBe('false');
    expect(app.host.querySelector('[data-pt-forces-result]').dataset.ptForcesResult).toBe('different');
    const card = app.host.querySelector('[data-pt-forces-observation="cut"]');
    expect(card.textContent).toContain('Immediately after the cut');
    expect(+card.querySelector('[data-pt-forces-before]').dataset.ptForcesBefore).toBe(before);
    expect(+card.querySelector('[data-pt-forces-after]').dataset.ptForcesAfter).toBe(immediatelyAfter);
    app.click('[data-pt-forces-run]'); app.pause(); app.step(4);
    expect(app.records.mock.calls.filter(([patch]) => patch.observations)).toHaveLength(1);
  });

  it('keeps the continent approach separate from its collision result and records actual mountain growth', () => {
    const app = mount(); app.start('continent');
    expect(app.host.querySelector('[data-pt-forces-watch-progress]').textContent).toContain('900 km');
    app.pause();
    for (let i = 0; i < 120 && !app.state().observations?.length; i++) app.step();
    expect(app.state().observations).toHaveLength(1);
    const observed = app.state().observations[0];
    expect(observed).toMatchObject({ a: 'continent', choice: 1, matched: true });
    expect(observed.vBefore).toBeGreaterThan(observed.vAfter); expect(observed.vAfter).toBeGreaterThan(0); expect(observed.mountainKm).toBeGreaterThan(0);
    expect(app.host.querySelector('[data-pt-forces-observation="continent"]').textContent).toContain(observed.mountainKm.toFixed(1) + ' km');
    expect(app.host.querySelector('[data-pt-forces-run]').dataset.ptForcesRun).toBe('false');
    app.step(2); expect(app.records.mock.calls.filter(([patch]) => patch.observations)).toHaveLength(1);
  });

  it('reset cancels an unfinished test while completed evidence survives reset and remount without new records', () => {
    const prior = { a: 'cut', vBefore: 6, vAfter: 1, t: 3, mountainKm: null };
    const app = mount({ observations: [prior] });
    expect(app.records).not.toHaveBeenCalled();
    app.start('continent'); app.click('[data-pt-forces-reset]'); app.step(6);
    expect(app.host.querySelector('[data-pt-forces-watch]')).toBeNull();
    expect(app.state().observations).toEqual([prior]);
    expect(app.records.mock.calls.filter(([patch]) => patch.observations)).toHaveLength(0);
    const saved = app.state(); app.unmount();
    const restored = mount(saved); vi.advanceTimersByTime(60000);
    expect(restored.records).not.toHaveBeenCalled(); expect(restored.announce).not.toHaveBeenCalled();
    expect(restored.host.querySelector('[data-pt-forces-observation="cut"]')).toBeTruthy();
    expect(restored.host.querySelector('[data-pt-forces-run]').dataset.ptForcesRun).toBe('false');
  });

  it('shows only finite recorded outcomes, using the latest result for each intervention', () => {
    const app = mount({ preds: [{ a: 'continent', c: 1, ok: true }], observations: [
      { a: 'cut', vBefore: 6, vAfter: 1 }, { a: 'cut', vBefore: 7, vAfter: 2 },
      { a: 'cut', vBefore: Infinity, vAfter: 3 }, { a: 'continent', vBefore: 4, vAfter: 1, mountainKm: 0 }
    ] });
    expect(app.host.querySelectorAll('[data-pt-forces-observation]')).toHaveLength(1);
    expect(app.host.querySelector('[data-pt-forces-before]').dataset.ptForcesBefore).toBe('7');
    expect(app.host.querySelector('[data-pt-forces-after]').dataset.ptForcesAfter).toBe('2');
    expect(app.host.querySelector('[data-pt-forces-recorded-prediction]')).toBeNull();
    expect(app.records).not.toHaveBeenCalled();
  });

  it('retains the other completed experiment when repeated tests roll over the ten-result log', () => {
    const continent = { a: 'continent', vBefore: 7.5, vAfter: 1.1, mountainKm: 3.3, t: 21 };
    const app = mount({ observations: [continent, ...Array.from({ length: 9 }, (_, i) => ({ a: 'cut', vBefore: 8, vAfter: 1.3, t: i + 3 }))] });
    app.start('cut'); app.pause(); app.step(4);
    expect(app.state().observations).toHaveLength(10);
    expect(app.state().observations).toContainEqual(continent);
    expect(app.state().observations.at(-1)).toMatchObject({ a: 'cut', choice: 1 });
    expect(app.host.querySelectorAll('[data-pt-forces-observation]')).toHaveLength(2);
    expect(window.__alloPtEvidenceFrom({ ptForce: app.state() })).toContain('continent');
  });
});
