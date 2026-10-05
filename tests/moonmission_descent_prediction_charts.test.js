import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMServer } from './helpers/stem_widgets_smoke_harness.js';

let P;
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_moonmission.js', 'moonMission'); P = window.MoonMissionPure; });
const state = extra => ({ alt: 300, vVel: -9, hVel: 4, fuel: 110, thrust: 0, tilt: 0, elapsed: 8, x: 100, ...extra });
const forecast = (extra = {}, commands = {}) => P.descentPredictionProfile(state(extra), commands);
function view(profile) {
  const root = document.createElement('div');
  root.innerHTML = ReactDOMServer.renderToStaticMarkup(P.descentPredictionView(React.createElement, true, () => {}));
  P.updateDescentPrediction(root, profile, { paused: true }); return root;
}
function frozenTree(value) {
  if (!value || typeof value !== 'object') return;
  expect(Object.isFrozen(value)).toBe(true);
  Object.values(value).forEach(frozenTree);
}

describe('landing path charts', () => {
  it('keeps the exact established surface view and frozen forecasts while adding detached chart geometry', () => {
    const p = forecast(), before = JSON.stringify(p), old = P.descentPredictionGeometry(p), visual = P.descentPredictionVisuals(p);
    for (const key of ['scale', 'initial', 'heldPoints', 'burnPoints', 'heldEnd', 'burnEnd', 'leftMetres', 'rightMetres']) expect(visual.main[key]).toEqual(old[key]);
    expect(JSON.stringify(p)).toBe(before); frozenTree(visual); expect(visual.detail).not.toBeNull(); expect(visual.zoom).toBeGreaterThan(10);
  });

  it('shows complete braking motion in a close view with equal metre scales and absolute altitude bounds', () => {
    const p = forecast(), d = P.descentPredictionVisuals(p).detail;
    expect(d.minAltitude).toBeGreaterThan(0); expect(d.maxAltitude).toBeGreaterThan(p.initial.alt);
    for (const key of ['held', 'burn']) {
      const points = d[key + 'Points'].split(' ').map(pair => pair.split(',').map(Number)), rows = p[key].samples;
      expect(points).toHaveLength(rows.length);
      for (let i = 1; i < rows.length; i++) {
        expect(points[i][0] - points[i - 1][0]).toBeCloseTo((rows[i].x - rows[i - 1].x) * d.scale, 3);
        expect(points[i - 1][1] - points[i][1]).toBeCloseTo((rows[i].alt - rows[i - 1].alt) * d.scale, 3);
      }
    }
    for (const point of [d.initial, d.burnEnd]) {
      expect(point.x).toBeGreaterThanOrEqual(36); expect(point.x).toBeLessThanOrEqual(564);
      expect(point.y).toBeGreaterThanOrEqual(36); expect(point.y).toBeLessThanOrEqual(324);
    }
    expect(d.burnEndVisible).toBe(true); expect(d.heldEndVisible).toBe(false);
  });

  it('maps the close-view locator to the same physical window in the surface view', () => {
    const p = forecast(), { main, detail, window, zoom } = P.descentPredictionVisuals(p);
    expect(window.width / main.scale).toBeCloseTo(detail.rightMetres - detail.leftMetres, 10);
    expect(window.height / main.scale).toBeCloseTo(detail.maxAltitude - detail.minAltitude, 10);
    expect((324 - window.y) / main.scale).toBeCloseTo(detail.maxAltitude, 10);
    expect((window.x - 300) / main.scale + main.centerX).toBeCloseTo(detail.leftMetres, 10);
    expect(zoom).toBeCloseTo(detail.scale / main.scale, 10);
  });

  it.each([
    { alt: 0, contact: true }, { vVel: 2 }, { fuel: 0 }, { fuel: .01 }, { alt: 1, vVel: -20 },
    { alt: 15000, vVel: -2, fuel: 0 }, { alt: 1, vVel: -.001, fuel: .001, thrust: 1 }
  ])('omits a misleading close view when braking motion is absent or too small: %s', extra => {
    const v = P.descentPredictionVisuals(forecast(extra));
    expect(v.detail).toBeNull(); expect(v.window).toBeNull(); expect(v.zoom).toBe(1);
  });

  it('places time dots at shared elapsed intervals on the original plotted segments', () => {
    const p = forecast(), v = P.descentPredictionVisuals(p);
    for (const frame of [v.main, v.detail]) for (const key of ['held', 'burn']) {
      const rows = p[key].samples, marks = frame[key + 'Marks']; expect(marks.length).toBeLessThanOrEqual(8);
      for (let i = 0; i < marks.length; i++) {
        const dot = marks[i], endIndex = rows.findIndex(row => row.time >= dot.time), a = rows[endIndex - 1], b = rows[endIndex];
        const t = (dot.time - a.time) / (b.time - a.time);
        expect(dot.time).toBeCloseTo((i + 1) * frame.interval, 10); expect(dot.time).toBeLessThan(p[key].summary.time);
        expect(dot.x).toBeCloseTo(300 + (a.x + (b.x - a.x) * t - frame.centerX) * frame.scale, 8);
        expect(dot.y).toBeCloseTo(324 - (a.alt + (b.alt - a.alt) * t - frame.minAltitude) * frame.scale, 8);
      }
    }
  });

  it.each([-4, 4])('uses actual travel direction for lateral velocity %s', hVel => {
    const p = forecast({ hVel }), v = P.descentPredictionVisuals(p);
    for (const arrow of [v.main.heldDirection, v.detail.burnDirection]) {
      expect(arrow).not.toBeNull(); expect(Math.sign(arrow.dx)).toBe(Math.sign(hVel)); expect(arrow.dy).toBeGreaterThan(0);
      expect(arrow.dx * arrow.dx + arrow.dy * arrow.dy).toBeCloseTo(1, 12);
      expect(arrow.time).toBeGreaterThan(0); expect(arrow.points.split(' ')).toHaveLength(3);
    }
  });

  it('clips paths while leaving actual endpoint markers complete and labels omitted endpoints honestly', () => {
    const p = forecast(), root = view(p), detail = root.querySelector('[data-descent-prediction-detail]');
    expect(root.querySelectorAll('[data-descent-prediction-detail]')).toHaveLength(1);
    const viewport = detail.querySelector('[data-descent-visual-viewport]'); expect(viewport.style.overflow).toBe('hidden');
    expect(detail.querySelector('[data-descent-visual-end="held"]').style.display).toBe('none');
    expect(detail.querySelector('[data-descent-visual-end="burn"]').style.display).toBe('');
    expect(viewport.querySelector('[data-descent-visual-end]')).toBeNull();
    expect(detail.querySelector('[data-descent-visual-ground]').style.display).toBe('none');
    expect(root.querySelector('[data-descent-prediction-detail-context]').textContent).toContain('surface at 0 m is outside');
    expect(root.querySelector('[data-descent-prediction-detail-context]').textContent).toContain('solid path continues outside');
    expect(root.querySelectorAll('svg text')).toHaveLength(0);
  });

  it('uses distinguishable paths and concentric terminal markers without inventing future motion at contact', () => {
    const root = view(forecast({ alt: 0, contact: true }));
    expect(root.querySelector('[data-descent-prediction-path="burn"]').getAttribute('stroke-dasharray')).toBe('7 5');
    expect(root.querySelector('[data-descent-prediction-path="held"]').hasAttribute('stroke-dasharray')).toBe(false);
    expect(root.querySelector('[data-descent-prediction-detail]').style.display).toBe('none');
    for (const node of root.querySelectorAll('[data-descent-visual-direction], [data-descent-visual-time]')) expect(node.style.display).toBe('none');
    const svg = root.querySelector('[data-descent-prediction-diagram]'), held = svg.querySelector('[data-descent-visual-ring="held"]'), burn = svg.querySelector('[data-descent-visual-end="burn"]');
    expect(held.getAttribute('cx')).toBe(burn.getAttribute('cx')); expect(held.getAttribute('cy')).toBe(burn.getAttribute('cy'));
    expect(Number(held.getAttribute('r'))).toBeGreaterThan(Number(burn.getAttribute('r')));
  });
});
