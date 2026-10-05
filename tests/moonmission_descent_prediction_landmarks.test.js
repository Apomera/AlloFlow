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
  expect(Object.isFrozen(value)).toBe(true); Object.values(value).forEach(frozenTree);
}

describe('physical landing chart landmarks', () => {
  it('omits landmarks for unavailable histories', () => {
    for (const value of [null, undefined, {}, { held: { samples: [] }, burn: { samples: [] } }]) expect(P.descentPredictionLandmarks(value)).toBeNull();
  });

  it('derives a frozen presentation without altering either forecast or source state', () => {
    const s = state(), before = JSON.stringify(s), p = P.descentPredictionProfile(s, {}), history = JSON.stringify(p);
    const marks = P.descentPredictionLandmarks(p); frozenTree(marks);
    expect(JSON.stringify(s)).toBe(before); expect(JSON.stringify(p)).toBe(history);
  });

  it.each(['main', 'detail'])('places altitude ticks on the physical grid in the %s view', name => {
    const p = forecast(), f = P.descentPredictionVisuals(p)[name], ticks = P.descentPredictionLandmarks(p)[name].altitude;
    expect(ticks).toHaveLength(5); expect(ticks[0].value).toBeCloseTo(f.maxAltitude, 10); expect(ticks[4].value).toBeCloseTo(f.minAltitude, 10);
    for (const tick of ticks) expect(324 - (tick.value - f.minAltitude) * f.scale).toBeCloseTo(tick.coordinate, 9);
    for (let i = 1; i < ticks.length; i++) expect((ticks[i - 1].value - ticks[i].value) * f.scale).toBeCloseTo(72, 9);
  });

  it.each(['main', 'detail'])('places signed displacement ticks on the same metre scale in the %s view', name => {
    const p = forecast(), f = P.descentPredictionVisuals(p)[name], ticks = P.descentPredictionLandmarks(p)[name].displacement;
    expect(ticks).toHaveLength(5); expect(ticks[0].value).toBeCloseTo(f.leftMetres, 10); expect(ticks[4].value).toBeCloseTo(f.rightMetres, 10);
    for (const tick of ticks) {
      expect(300 + (tick.value - f.centerX) * f.scale).toBeCloseTo(tick.coordinate, 9);
      if (Number(tick.label) > 0) expect(tick.label.startsWith('+')).toBe(true);
    }
    for (let i = 1; i < ticks.length; i++) expect((ticks[i].value - ticks[i - 1].value) * f.scale).toBeCloseTo(132, 9);
  });

  it.each([-4, 4])('anchors the dotted reference to the inspected position with lateral speed %s', hVel => {
    const p = forecast({ hVel }), v = P.descentPredictionVisuals(p), m = P.descentPredictionLandmarks(p);
    for (const name of ['main', 'detail']) {
      expect(m[name].origin.visible).toBe(true); expect(m[name].origin.x).toBeCloseTo(v[name].initial.x, 10);
      expect((m[name].origin.x - 300) / v[name].scale + v[name].centerX).toBeCloseTo(0, 10);
    }
  });

  it('keeps local displacement landmarks independent of saved track and elapsed origins', () => {
    const local = P.descentPredictionLandmarks(forecast({ x: 0, elapsed: 0 }));
    const remote = P.descentPredictionLandmarks(forecast({ x: 1e9, elapsed: 1e9 }));
    expect(remote).toEqual(local);
  });

  it('distinguishes real contact and arrest endpoints from the omitted endpoint of a cropped path', () => {
    const p = forecast(), m = P.descentPredictionLandmarks(p);
    expect(m.main.events.held.label).toBe('● Contact'); expect(m.main.events.burn.label).toBe('○ Arrest');
    expect(m.detail.events.held.label).toBe('… Outside view'); expect(m.detail.events.held.context).toBe('Endpoint in surface view');
    expect(m.detail.events.held.time).toBe(p.held.summary.time); expect(m.detail.events.held.altitude).toBe(p.held.summary.altitude);
    expect(m.detail.events.burn.visible).toBe(true); expect(m.detail.events.burn.label).toBe('○ Arrest');
  });

  it('describes specified braking controls using their own event rather than the comparison event', () => {
    const p = forecast({}, { throttle: .65 }), m = P.descentPredictionLandmarks(p);
    expect(m.main.events.held.kind).toBe('arrest'); expect(m.main.events.held.label).toBe('○ Arrest');
    expect(m.main.events.held.time).toBe(p.held.summary.time); expect(m.main.events.held.time).not.toBe(m.main.events.burn.time);
    const root = view(p);
    expect(root.querySelector('[data-descent-event="main-held"]').dataset.time).toBe(String(p.held.summary.time));
    expect(root.querySelector('[data-descent-event="detail-held"]').dataset.endpointVisible).toBe(String(m.detail.events.held.visible));
  });

  it('preserves first contact events when fuel cannot arrest the descent', () => {
    const p = forecast({ fuel: .01 }), m = P.descentPredictionLandmarks(p);
    expect(m.detail).toBeNull(); expect(m.main.events.burn.label).toBe('● Contact');
    expect(m.main.events.burn.time).toBe(p.burn.summary.time); expect(m.main.events.burn.altitude).toBe(0);
  });

  it('shows a compact terminal inspection with zero future time and the original physical scale', () => {
    const p = forecast({ alt: 0, contact: true }), geometry = P.descentPredictionGeometry(p), root = view(p);
    expect(root.querySelector('[data-descent-visual-caption="main"]').textContent).toBe('Contact inspection');
    expect(root.querySelector('[data-descent-visual-rulers="main"]').style.maxWidth).toBe('360px');
    expect(root.querySelector('[data-descent-prediction-detail]').style.display).toBe('none');
    expect(root.querySelector('[data-descent-prediction]').dataset.descentPredictionInspectionContact).toBe('true');
    expect(root.querySelector('[data-descent-prediction-scale]').textContent).toContain('Both paths end at the inspected contact position');
    expect(Number(root.querySelector('[data-descent-prediction-diagram]').dataset.metreScale)).toBe(geometry.scale);
    for (const key of ['held', 'burn']) {
      const badge = root.querySelector('[data-descent-event="main-' + key + '"]');
      expect(badge.dataset.time).toBe('0'); expect(badge.dataset.altitude).toBe('0');
      expect(badge.querySelector('[data-descent-event-label]').textContent).toBe('● Contact');
    }
  });

  it('reports existing arrest and the forecast time limit without calling either a landing', () => {
    const arrested = P.descentPredictionLandmarks(forecast({ vVel: 2 })), horizon = P.descentPredictionLandmarks(forecast({ alt: 15000, fuel: 0, vVel: -2 }));
    expect(arrested.main.events.held.label).toBe('○ Already arrested'); expect(arrested.main.events.held.time).toBe(0);
    expect(horizon.main.events.burn.label).toBe('○ Time limit'); expect(horizon.main.events.burn.time).toBeCloseTo(90, 10);
    expect(horizon.main.events.burn.altitude).toBeGreaterThan(0);
  });

  it('avoids negative zero labels and gives large signed ticks a compact readable form', () => {
    const zero = P.descentPredictionLandmarks(forecast({ hVel: 0 }));
    expect(zero.main.displacement[2].label).toBe('0');
    const large = P.descentPredictionLandmarks(forecast({ alt: 100000, vVel: -2, hVel: 5000, fuel: 0 }));
    expect(large.main.displacement.some(t => t.label.endsWith('k'))).toBe(true);
    for (const tick of [...zero.main.altitude, ...zero.main.displacement, ...large.main.displacement]) expect(tick.label).not.toMatch(/^-0(?:\.0+)?$/);
  });

  it('keeps fractional altitude and displacement graduations within displayed rounding precision', () => {
    const s = state({ elapsed: 0, x: 0 }); P.descentStep(s, {}, 5);
    const marks = P.descentPredictionLandmarks(P.descentPredictionProfile(s, {}));
    expect(marks.detail).not.toBeNull();
    for (const name of ['main', 'detail']) for (const tick of [...marks[name].altitude, ...marks[name].displacement]) {
      expect(Math.abs(Number(tick.label) - tick.value)).toBeLessThanOrEqual(.050000001);
    }
  });

  it('shows hundredths of a second for contact approaching within one second', () => {
    const p = forecast({ alt: 1, vVel: -20 }), event = P.descentPredictionLandmarks(p).main.events.held;
    expect(event.time).toBeGreaterThan(.04); expect(event.time).toBeLessThan(.06); expect(event.reading).toMatch(/^0\.05 s/);
  });

  it('distinguishes imminent subcentisecond contact from an inspection already at contact', () => {
    const p = forecast({ alt: .001, vVel: -20 }), event = P.descentPredictionLandmarks(p).main.events.held;
    expect(event.time).toBeGreaterThan(0); expect(event.time).toBeLessThan(.005); expect(event.reading).toMatch(/^<0\.01 s/);
    expect(P.descentPredictionLandmarks(forecast({ alt: 0, contact: true })).main.events.held.reading).toMatch(/^0\.0 s/);
  });

  it('updates every HTML ruler and event badge while keeping numeric labels outside the clipped SVG', () => {
    const p = forecast(), m = P.descentPredictionLandmarks(p), root = view(p);
    for (const name of ['main', 'detail']) {
      for (const axis of ['altitude', 'displacement']) for (let i = 0; i < 5; i++) {
        const node = root.querySelector('[data-descent-ruler="' + name + '-' + axis + '"][data-tick="' + i + '"]');
        expect(Number(node.dataset.value)).toBe(m[name][axis][i].value); expect(node.textContent).toBe(m[name][axis][i].label);
        expect(node.getAttribute('aria-label')).toContain('m'); expect(node.closest('svg')).toBeNull();
      }
      const svg = root.querySelector(name === 'main' ? '[data-descent-prediction-diagram]' : '[data-descent-prediction-detail-diagram]');
      expect(Number(svg.querySelector('[data-descent-visual-origin]').getAttribute('x1'))).toBe(m[name].origin.x);
    }
    expect(root.querySelectorAll('svg text')).toHaveLength(0);
  });

  it('resets the terminal size and caption when inspecting an earlier state in the same view', () => {
    const root = view(forecast({ alt: 0, contact: true })); P.updateDescentPrediction(root, forecast(), { recorded: true, time: 5 });
    expect(root.querySelector('[data-descent-visual-rulers="main"]').style.maxWidth).toBe('');
    expect(root.querySelector('[data-descent-visual-caption="main"]').textContent).toBe('Surface reference');
    expect(root.querySelector('[data-descent-prediction-detail]').style.display).toBe('');
    expect(root.querySelector('[data-descent-event="main-held"]').dataset.time).not.toBe('0');
  });
});
