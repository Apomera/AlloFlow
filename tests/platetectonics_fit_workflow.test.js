import fs from 'node:fs';
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

let React, ReactDOM;
const mounted = [];

beforeAll(() => {
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
    return React.createElement(window.AlloTectonicsFitPuzzle, {
      saved, darkMode: false, announceToSR: announce,
      onRecord(patch) { records(patch); setSaved(prev => ({ ...prev, ...patch })); },
      t: (_, fallback) => fallback
    });
  }
  ReactDOM.render(React.createElement(Host), host);
  const map = () => host.querySelector('[data-pt-fit-map]');
  return {
    host, map, records, announce, state: () => state,
    click(selector) { ReactDOM.flushSync(() => host.querySelector(selector).click()); },
    key(key, extra = {}) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extra });
      ReactDOM.flushSync(() => map().dispatchEvent(event)); return event;
    },
    unmount() { ReactDOM.unmountComponentAtNode(host); }
  };
}

describe('Continent puzzle exploration and accepted evidence', () => {
  it('does not record or announce on idle mount or restored completion', () => {
    const t = window.__alloPtFit.best().t;
    const initial = { fitted: true, answer: 'joined', t, draftT: { dx: 0, dy: 0, rot: 0 }, layers: { meso: true }, fine: true };
    const app = mount(initial);
    vi.advanceTimersByTime(60000);
    expect(app.records).not.toHaveBeenCalled(); expect(app.announce).not.toHaveBeenCalled();
    app.unmount();
    const restored = mount(app.state()); vi.advanceTimersByTime(60000);
    expect(restored.records).not.toHaveBeenCalled();
    expect(restored.state()).toEqual(initial);
    expect(restored.host.querySelector('[data-pt-fit-question]')).toBeTruthy();
    expect(restored.host.querySelector('[data-pt-fit-gap]').dataset.ptFitClose).toBe('false');
  });

  it('moves, rotates and resets from the focused map, including Shift bracket keys', () => {
    const app = mount(); app.map().focus();
    expect(document.activeElement).toBe(app.map());
    expect(app.key('ArrowRight').defaultPrevented).toBe(true);
    app.key('ArrowUp'); app.key('['); app.key('}', { shiftKey: true }); app.key('ArrowLeft', { shiftKey: true });
    expect(app.state().draftT).toEqual({ dx: 150, dy: 200, rot: 4 });
    expect(app.state().fitted).toBeUndefined(); expect(app.state().t).toBeUndefined();
    const before = app.records.mock.calls.length;
    expect(app.key('Tab').defaultPrevented).toBe(false);
    expect(app.key('ArrowRight', { ctrlKey: true }).defaultPrevented).toBe(false);
    expect(app.records).toHaveBeenCalledTimes(before);
    app.key('Home'); expect(app.state().draftT).toEqual({ dx: 0, dy: 0, rot: 0 });
  });

  it('keeps unfinished pose, evidence layers and fine steps across remounts', () => {
    const app = mount();
    app.click('[data-pt-fit-fine]'); app.click('[data-pt-fit-toggle="meso"]'); app.click('[data-pt-fit-toggle="rocks"]');
    app.key('ArrowRight'); app.key(']');
    const saved = app.state(); app.unmount();
    const restored = mount(saved);
    expect(restored.host.querySelector('[data-pt-fit-fine]').checked).toBe(true);
    expect(restored.host.querySelector('[data-pt-fit-toggle="rocks"]').checked).toBe(true);
    expect(restored.host.querySelector('[data-pt-fit-move="e"]').getAttribute('aria-label')).toContain('50 km');
    expect(+restored.host.querySelector('[data-pt-fit-gap]').dataset.ptFitGap).toBe(Math.round(window.__alloPtFit.gap({ dx: 50, dy: 0, rot: -1 }).km));
    restored.key('ArrowRight'); expect(restored.state().draftT.dx).toBe(100);
    expect(restored.state().layers).toEqual({ meso: true, glosso: false, rocks: true });
  });

  it('preserves the accepted fit and its rate when resetting and exploring elsewhere', () => {
    const t = window.__alloPtFit.best().t;
    const app = mount({ t, fitted: true, answer: 'joined', layers: { glosso: true } });
    const rate = app.host.querySelector('[data-pt-fit-rate]').dataset.ptFitRate;
    app.click('[data-pt-fit-reset]'); app.key('ArrowRight');
    expect(app.state().t).toEqual(t); expect(app.state().answer).toBe('joined'); expect(app.state().fitted).toBe(true);
    expect(app.state().draftT).toEqual({ dx: 200, dy: 0, rot: 0 });
    expect(app.host.querySelector('[data-pt-fit-rate]').dataset.ptFitRate).toBe(rate);
    expect(app.host.querySelector('[data-pt-fit-rate]').textContent).toContain('not today’s plate speed');
    const saved = app.state(); app.unmount();
    const restored = mount(saved);
    expect(+restored.host.querySelector('[data-pt-fit-gap]').dataset.ptFitGap).toBe(Math.round(window.__alloPtFit.gap(saved.draftT).km));
    expect(restored.host.querySelector('[data-pt-fit-rate]').dataset.ptFitRate).toBe(rate);
  });

  it('accepts a deliberate close fit without losing saved layer settings', () => {
    const best = window.__alloPtFit.best();
    const app = mount({ draftT: { ...best.t, dx: best.t.dx - 200 }, layers: { meso: true } });
    expect(app.records).not.toHaveBeenCalled();
    app.key('ArrowRight');
    expect(app.state()).toMatchObject({ fitted: true, t: best.t, draftT: best.t, layers: { meso: true } });
    expect(app.host.querySelector('[data-pt-fit-status]').textContent).toContain('Some gaps remain');
    expect(app.host.querySelector('[data-pt-fit-accuracy]').textContent).toContain('not fossil or rock agreement');
    app.click('[data-pt-fit-answer="joined"]');
    expect(app.state().answer).toBe('joined');
    expect(app.host.querySelector('[data-pt-fit-feedback]').getAttribute('role')).toBe('status');
  });

  it('keeps evidence and text overlays from intercepting drag and guards invalid poses', () => {
    const app = mount({ draftT: { dx: Infinity, dy: NaN, rot: -Infinity }, layers: { meso: true, glosso: true, rocks: true } });
    expect(app.map().getAttribute('aria-label')).not.toMatch(/NaN|Infinity/);
    expect(app.host.querySelector('[data-pt-fit-sa]').getAttribute('d')).not.toMatch(/NaN|Infinity/);
    for (const node of app.host.querySelectorAll('[data-pt-fit-layer],svg text')) expect(node.getAttribute('pointer-events') || node.parentElement.getAttribute('pointer-events')).toBe('none');
    expect(app.host.querySelectorAll('[data-pt-fit-layer]').length).toBeGreaterThan(4);
    app.click('[data-pt-fit-toggle="meso"]'); expect(app.host.querySelectorAll('[data-pt-fit-layer="meso"]')).toHaveLength(0);
    const edge = mount({ draftT: { dx: 9000, dy: 3500, rot: 120 } });
    edge.key('ArrowRight'); edge.key('ArrowUp'); edge.key('[');
    expect(edge.state().draftT).toEqual({ dx: 9000, dy: 3500, rot: 120 });
  });
});
