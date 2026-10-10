import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function recorder() {
  const calls = [];
  let gradientId = 0;
  const gradient = () => ({ gradientId: ++gradientId, addColorStop: (...args) => calls.push(['stop', ...args]) });
  const known = { createLinearGradient: gradient, createRadialGradient: gradient, measureText: text => ({ width: String(text).length * 6 }) };
  const ctx = new Proxy({}, {
    get: (target, key) => known[key] || target[key] || ((...args) => {
      for (const value of args) if (typeof value === 'number') expect(Number.isFinite(value), String(key)).toBe(true);
      calls.push([key, ...args]);
    }),
    set: (target, key, value) => { target[key] = value; calls.push(['set', key, value?.gradientId ? 'gradient:' + value.gradientId : value]); return true; },
  });
  return { ctx, calls };
}

let P;
beforeEach(() => {
  resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  loadTool(process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js', 'moonMission');
  P = window.MoonMissionPure;
});
afterEach(() => vi.restoreAllMocks());
const state = extra => ({ ...P.dockingState(), ...extra });

describe('Moon Mission docking port close-up', () => {
  it('keeps a four-metre radial field, equal physical axes and a true 0.60 m contact corridor', () => {
    for (const width of [250, 320, 1100]) {
      for (const height of [280, 320]) {
        const initial = Object.freeze(state({ x: 0.4, y: -1.25 })), before = { ...initial };
        const g = P.dockingCloseupGeometry(width, height, initial);
        expect(g.view).toBe('closeup');
        expect(g.plot).toEqual({ left: 32, right: width - 24, top: 76, bottom: height - 66 });
        expect(g.pictureScale).toBe((g.plot.bottom - g.plot.top) / 4);
        expect((g.plot.right - g.portX) / g.pictureScale).toBeCloseTo(1, 12);
        expect((g.plot.bottom - g.portY) / g.pictureScale).toBeCloseTo(2, 12);
        expect((g.eaglePortX - g.portX) / g.pictureScale).toBeCloseTo(initial.y, 12);
        expect((g.portY - g.eaglePortY) / g.pictureScale).toBeCloseTo(initial.x, 12);
        expect(g.corridorHalfWidth / g.pictureScale).toBeCloseTo(0.6, 12);
        expect(initial).toEqual(before);
      }
    }
  });

  it('uses the same metres per pixel as width changes and maps outward motion upward', () => {
    const s = state({ x: 0, y: -1 }), base = P.dockingCloseupGeometry(320, 280, s);
    const wide = P.dockingCloseupGeometry(1100, 280, s);
    const up = P.dockingCloseupGeometry(320, 280, { ...s, x: 1 });
    const right = P.dockingCloseupGeometry(320, 280, { ...s, y: 0 });
    expect(wide.pictureScale).toBe(base.pictureScale);
    expect(base.eaglePortY - up.eaglePortY).toBe(base.pictureScale);
    expect(right.eaglePortX - base.eaglePortX).toBe(base.pictureScale);
    expect(up.eaglePortX).toBe(base.eaglePortX);
    expect(right.eaglePortY).toBe(base.eaglePortY);
    expect(wide.eaglePortX - wide.portX).toBe(base.eaglePortX - base.portX);
  });

  it('includes exact plot boundaries without moving visible port markers', () => {
    const base = P.dockingCloseupGeometry(320, 280, state({ x: 0, y: 0 }));
    for (const [px, py] of [[base.portX, base.portY], [base.plot.left, base.portY], [base.plot.right, base.portY], [base.portX, base.plot.top], [base.portX, base.plot.bottom]]) {
      const s = state({ x: (base.portY - py) / base.pictureScale, y: (px - base.portX) / base.pictureScale });
      const g = P.dockingCloseupGeometry(320, 280, s);
      expect(g.portVisible).toBe(true);
      expect(g.indicatorX).toBe(g.eaglePortX);
      expect(g.indicatorY).toBe(g.eaglePortY);
      expect(g.eaglePortX).toBeCloseTo(px, 12);
      expect(g.eaglePortY).toBeCloseTo(py, 12);
    }
  });

  it('preserves true off-screen coordinates and places only the direction indicator on the inset boundary', () => {
    for (const [x, y] of [[8, -120], [-8, -120], [8, 120], [-8, 120], [20, 0], [-20, 0], [0, -120], [0, 120]]) {
      const g = P.dockingCloseupGeometry(320, 280, state({ x, y }));
      expect(g.portVisible).toBe(false);
      expect((g.eaglePortX - g.portX) / g.pictureScale).toBeCloseTo(y, 10);
      expect((g.portY - g.eaglePortY) / g.pictureScale).toBeCloseTo(x, 10);
      const dx = g.eaglePortX - g.portX, dy = g.eaglePortY - g.portY;
      const ix = g.indicatorX - g.portX, iy = g.indicatorY - g.portY;
      expect(Math.abs(ix * dy - iy * dx)).toBeLessThan(1e-7);
      expect(ix * dx + iy * dy).toBeGreaterThan(0);
      expect(Math.hypot(ix, iy)).toBeLessThan(Math.hypot(dx, dy));
      expect(g.indicatorX).toBeGreaterThanOrEqual(g.plot.left + 10 - 1e-9);
      expect(g.indicatorX).toBeLessThanOrEqual(g.plot.right - 10 + 1e-9);
      expect(g.indicatorY).toBeGreaterThanOrEqual(g.plot.top + 10 - 1e-9);
      expect(g.indicatorY).toBeLessThanOrEqual(g.plot.bottom - 10 + 1e-9);
      expect(Math.min(Math.abs(g.indicatorX - g.plot.left - 10), Math.abs(g.indicatorX - g.plot.right + 10), Math.abs(g.indicatorY - g.plot.top - 10), Math.abs(g.indicatorY - g.plot.bottom + 10))).toBeLessThan(1e-9);
    }
  });

  it('renders deterministic finite close-ups from the same geometry without adding thrust depictions', () => {
    for (const width of [250, 1100]) {
      for (const extra of [{ x: 8, y: -120 }, { x: -0.6, y: -1, ax: 0.03, ay: 0.03 }, { x: 0, y: 0, status: 'docked' }, { x: 1, y: 0, vy: 0.8, status: 'collision' }]) {
        const s = Object.freeze(state(extra)), before = { ...s }, a = recorder(), b = recorder();
        const first = P.drawDockingPractice(a.ctx, width, 280, s, { view: 'closeup' });
        const second = P.drawDockingPractice(b.ctx, width, 280, s, { view: 'closeup' });
        expect(first).toEqual(P.dockingCloseupGeometry(width, 280, s));
        expect(second).toEqual(first);
        expect(a.calls).toEqual(b.calls);
        expect(a.calls.some(row => row[0] === 'fillText')).toBe(true);
        expect(a.calls.some(row => row[0] === 'stroke')).toBe(true);
        expect(first.rcsVisible).toBe(false);
        expect(first.engineVisible).toBe(false);
        expect(first.plumeVisible).toBe(false);
        expect(s).toEqual(before);
      }
    }
  });

  it('keeps the existing overview output when no close-up view is selected', () => {
    const s = state({ x: 0.3, y: -15, ax: 0.03 });
    const implicit = recorder(), explicit = recorder();
    const a = P.drawDockingPractice(implicit.ctx, 390, 320, s);
    const b = P.drawDockingPractice(explicit.ctx, 390, 320, s, { view: 'overview' });
    expect(a).toEqual(b);
    expect(implicit.calls).toEqual(explicit.calls);
    expect(a.rcsVisible).toBe(true);
    expect((a.eaglePortX - a.portX) / a.pictureScale).toBeCloseTo(s.y, 10);
    expect((a.portY - a.eaglePortY) / a.pictureScale).toBeCloseTo(s.x, 10);
  });

  it('distinguishes safe and unsafe actual contacts without changing their physical result or receipt', () => {
    for (const [extra, status] of [[{ x: 0, vy: 0.1 }, 'docked'], [{ x: 1, vy: 0.1 }, 'collision'], [{ x: 0, vy: 0.8 }, 'collision'], [{ x: 5, vy: 0.1 }, 'missed']]) {
      const contact = P.dockingStep(state({ y: -0.001, vx: 0, ...extra }), 1, {});
      const before = { ...contact }, receipt = P.cleanDockingPlayback({ dockingRun: contact }).dockingResult;
      const g = P.drawDockingPractice(recorder().ctx, 320, 280, contact, { view: 'closeup' });
      expect(contact.status).toBe(status);
      expect(contact.y).toBe(0);
      expect(g.eaglePortX).toBe(g.portX);
      expect((g.portY - g.eaglePortY) / g.pictureScale).toBeCloseTo(contact.x, 10);
      expect(contact).toEqual(before);
      expect(P.cleanDockingPlayback({ dockingRun: contact }).dockingResult).toEqual(receipt);
      expect(P.dockingStep(contact, 10, 'guided')).toEqual(before);
    }
  });
});
