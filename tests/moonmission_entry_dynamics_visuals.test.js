import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMServer } from './helpers/stem_widgets_smoke_harness.js';

let P, entry, sample;
beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_moonmission.js', 'moonMission');
  P = window.MoonMissionPure;
  entry = P.entryProfile(-6.5, { plan: P.entryPlan({ mode: 'guided' }) });
  sample = P.entrySample(entry, 60);
});

function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) { const result = find(child, predicate); if (result) return result; }
    return null;
  }
  return predicate(node) ? node : find(node.props && node.props.children, predicate);
}
function tree(controls = {}, action = vi.fn(), source = entry, row = sample) {
  return P.entryDynamicsView(React.createElement, source, row, controls, action);
}
function html(controls = {}, source = entry, row = sample) {
  const page = document.createElement('div');
  page.innerHTML = ReactDOMServer.renderToStaticMarkup(tree(controls, vi.fn(), source, row));
  return page;
}

describe('Moon Mission force and mechanical-energy inspection', () => {
  it('uses isotropic acceleration axes and one source-history scale across time and display size', () => {
    const profile = P.entryDynamicsProfile(entry);
    for (const [width, height] of [[600, 360], [320, 240]]) {
      const first = P.entryDynamicsGeometry(profile, 0, width, height);
      for (const time of [0, 30, 60, profile.summary.duration]) {
        const geometry = P.entryDynamicsGeometry(profile, time, width, height);
        expect(geometry.base).toBe(first.base);
        expect(geometry.base.maxAcceleration).toBeGreaterThanOrEqual(profile.summary.maxPlaneAcceleration);
        for (const key of ['drag', 'lift', 'gravity', 'netPlane']) {
          const arrow = geometry.vectors[key], vector = geometry.sample.forces[key];
          expect(arrow.endX - arrow.startX).toBeCloseTo(vector.x * geometry.base.accelerationScale, 9);
          expect(arrow.startY - arrow.endY).toBeCloseTo(vector.y * geometry.base.accelerationScale, 9);
          expect(Math.hypot(arrow.endX - arrow.startX, arrow.endY - arrow.startY)).toBeCloseTo(vector.magnitude * geometry.base.accelerationScale, 7);
          expect(arrow.forceMagnitude).toBe(vector.forceMagnitude);
          expect(Object.isFrozen(arrow)).toBe(true);
        }
        expect(Object.isFrozen(geometry)).toBe(true);
        expect(Object.isFrozen(geometry.base.chart.histories)).toBe(true);
      }
    }
    expect(P.entryDynamicsGeometry(profile, 60, 320, 240).base.maxAcceleration).toBe(P.entryDynamicsGeometry(profile, 60, 600, 360).base.maxAcceleration);
  });

  it('keeps short gravity arrows above the vehicle marker without enlarging their physical length', () => {
    const source = P.entryProfile(-6.5, { plan: P.entryPlan({ mode: 'bank', bank: 180 }) });
    const profile = P.entryDynamicsProfile(source), time = profile.summary.peakDragPowerTime;
    const page = html({ open: true }, source, P.entrySample(source, time));
    const svg = page.querySelector('[data-entry-dynamics-diagram="forces"]');
    const origin = svg.querySelector('[data-entry-dynamics-origin]');
    const gravity = svg.querySelector('[data-entry-dynamics-vector="gravity"]');
    expect(origin.compareDocumentPosition(gravity) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(Number(origin.getAttribute('r'))).toBe(3);
    const line = gravity.querySelector('line'), row = P.entryDynamicsSample(profile, time);
    const length = Math.hypot(Number(line.getAttribute('x2')) - Number(line.getAttribute('x1')),
      Number(line.getAttribute('y2')) - Number(line.getAttribute('y1')));
    expect(length).toBeCloseTo(row.forces.gravity.magnitude * Number(svg.dataset.accelerationScale), 8);
    expect(length).toBeGreaterThan(0); expect(length).toBeLessThan(3);
  });

  it('keeps drag opposite velocity, lift normal to velocity, and net equal to the plane components', () => {
    const profile = P.entryDynamicsProfile(entry), geometry = P.entryDynamicsGeometry(profile, 60, 600, 360), row = geometry.sample;
    const velocity = row.velocity, drag = geometry.vectors.drag, lift = geometry.vectors.lift, gravity = geometry.vectors.gravity, net = geometry.vectors.netPlane;
    expect(drag.x * velocity.x + drag.y * velocity.y).toBeLessThan(0);
    expect(drag.x * velocity.y - drag.y * velocity.x).toBeCloseTo(0, 6);
    expect(lift.x * velocity.x + lift.y * velocity.y).toBeCloseTo(0, 6);
    expect(gravity.x).toBe(0);
    expect(gravity.y).toBeLessThan(0);
    expect(net.x).toBeCloseTo(drag.x + lift.x + gravity.x, 10);
    expect(net.y).toBeCloseTo(drag.y + lift.y + gravity.y, 10);
    for (const arrow of Object.values(geometry.vectors)) {
      if (!arrow.visible) continue;
      const head = arrow.head.split(' ').map((point) => point.split(',').map(Number));
      expect(head[0]).toEqual([arrow.endX, arrow.endY]);
      const baseX = (head[1][0] + head[2][0]) / 2, baseY = (head[1][1] + head[2][1]) / 2;
      expect((arrow.endX - baseX) * (arrow.endX - arrow.startX) + (arrow.endY - baseY) * (arrow.endY - arrow.startY)).toBeGreaterThan(0);
    }
    expect(geometry.velocity.magnitude).toBeCloseTo(1, 10);
    expect(Math.hypot(geometry.velocity.endX - geometry.velocity.startX, geometry.velocity.endY - geometry.velocity.startY)).toBeCloseTo(54, 10);
  });

  it('shows full banked lift separately from its plane projection and safely hides zero lift', () => {
    for (const bank of [0, 90, 180]) {
      const source = P.entryProfile(-6.5, { plan: P.entryPlan({ mode: 'bank', bank }) });
      const profile = P.entryDynamicsProfile(source), geometry = P.entryDynamicsGeometry(profile, 60, 600, 360), row = geometry.sample;
      expect(row.liftMagnitude).toBeGreaterThan(0);
      expect(geometry.bank.x).toBe(row.liftLateral);
      expect(geometry.bank.y).toBe(row.liftPlane);
      expect(geometry.bank.magnitude).toBeCloseTo(row.liftMagnitude, 8);
      expect(geometry.bank.endX - geometry.bank.startX).toBeCloseTo(row.liftLateral * geometry.base.bankScale, 9);
      expect(geometry.bank.startY - geometry.bank.endY).toBeCloseTo(row.liftPlane * geometry.base.bankScale, 9);
      if (bank === 90) {
        expect(Math.abs(geometry.vectors.lift.magnitude)).toBeLessThan(1e-8);
        expect(geometry.bank.x).toBeGreaterThan(0);
        expect(geometry.bank.visible).toBe(true);
      }
      if (bank === 180) expect(geometry.bank.endY).toBeGreaterThan(geometry.bank.startY);
    }
    const ballistic = P.entryProfile(-6.5, { plan: P.entryPlan({ mode: 'ballistic' }) });
    const zero = P.entryDynamicsGeometry(P.entryDynamicsProfile(ballistic), 60, 600, 360);
    expect(zero.vectors.lift.visible).toBe(false);
    expect(zero.vectors.lift.head).toBe('');
    expect(zero.bank.visible).toBe(false);
    expect(zero.bank.head).toBe('');
  });

  it('charts kinetic, surface-relative potential and drag work on common dimensions and fixed source-time bounds', () => {
    const profile = P.entryDynamicsProfile(entry), geometry = P.entryDynamicsGeometry(profile, 60, 600, 360), chart = geometry.base.chart;
    expect(chart.histories.kinetic[0].value).toBe(profile.samples[0].energy.kinetic);
    expect(chart.histories.potential[0].value).toBe(profile.samples[0].energy.potential);
    expect(chart.histories.dragWork[0].value).toBe(0);
    expect(chart.histories.dragWork.at(-1).value).toBe(profile.summary.finalDragWork);
    for (const [key, points] of Object.entries(chart.histories)) {
      expect(points[0].x).toBe(chart.left);
      expect(points.at(-1).x).toBeCloseTo(chart.right, 9);
      for (const point of points) {
        expect(point.x).toBeGreaterThanOrEqual(chart.left);
        expect(point.x).toBeLessThanOrEqual(chart.right + 1e-8);
        expect(point.y).toBeGreaterThanOrEqual(chart.top - 1e-8);
        expect(point.y).toBeLessThanOrEqual(chart.bottom + 1e-8);
        expect(point.y).toBeCloseTo(chart.bottom - (chart.bottom - chart.top) * (point.value - chart.min) / (chart.max - chart.min), 9);
      }
      expect(geometry.markers[key].y).toBeCloseTo(chart.bottom - (chart.bottom - chart.top) * (geometry.sample.energy[key] - chart.min) / (chart.max - chart.min), 9);
    }
    expect(geometry.cursorX).toBeCloseTo(chart.left + (chart.right - chart.left) * 60 / chart.duration, 9);
    expect(chart.initialY).toBeCloseTo(chart.bottom - (chart.bottom - chart.top) * (profile.summary.initialEnergy - chart.min) / (chart.max - chart.min), 9);
    expect(P.entryDynamicsGeometry(profile, profile.summary.duration, 600, 360).base.chart).toBe(chart);
  });

  it('starts compact, forwards only open/view actions, and does not mutate trajectory or controls', () => {
    const closed = html(), toggle = closed.querySelector('[data-entry-dynamics-toggle]');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(closed.querySelector('#' + toggle.getAttribute('aria-controls')).hidden).toBe(true);
    expect(closed.querySelector('[data-entry-dynamics-panel]')).toBeNull();
    expect(closed.querySelector('svg')).toBeNull();
    expect(toggle.style.minHeight).toBe('44px');
    const controls = { open: true, view: 'forces' }, action = vi.fn(), before = JSON.stringify({ entry, sample, controls });
    const ui = tree(controls, action), event = { currentTarget: { marker: 'source control' } };
    find(ui, (node) => node.props && node.props['data-entry-dynamics-tab'] === 'energy').props.onClick(event);
    expect(action.mock.calls.at(-1)).toEqual(['view', 'energy', event]);
    find(ui, (node) => node.props && node.props['data-entry-dynamics-toggle']).props.onClick(event);
    expect(action.mock.calls.at(-1)).toEqual(['open', false, event]);
    expect(action.mock.calls.every(([name]) => ['open', 'view'].includes(name))).toBe(true);
    expect(JSON.stringify({ entry, sample, controls })).toBe(before);
    const page = html(controls);
    expect(page.querySelector('[data-entry-dynamics-diagram="forces"]').getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
    expect(page.querySelector('[data-entry-dynamics-diagram="bank"]').getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
    expect(page.querySelectorAll('svg text')).toHaveLength(0);
    expect(page.querySelectorAll('input')).toHaveLength(0);
    expect(page.querySelector('[data-entry-dynamics-load-note]').textContent).toContain('Gravity is excluded from sensed load');
    expect(page.querySelector('[data-entry-dynamics-force-scale]').textContent).toContain('velocity direction only');
  });

  it('labels an earlier source without invented bank and explains unresolved lateral flight', () => {
    const old = P.entryProfile(-6.5), page = html({ open: true }, old, P.entrySample(old, 60));
    expect(page.querySelector('[data-entry-dynamics-source]').textContent).toContain('model v1');
    expect(page.querySelector('[data-entry-dynamics-value="bank"]').textContent).toBe('Earlier signed in-plane lift');
    expect(page.querySelector('[data-entry-dynamics-diagram="bank"]').dataset.bank).toBe('');
    expect(page.querySelector('[data-entry-dynamics-diagram="bank"]').getAttribute('aria-label')).toContain('no bank angle');
    expect(page.textContent).toContain('Crossrange motion is omitted');
  });

  it('labels inactive v2 lift without inventing a zero bank angle or drawing a false arrow', () => {
    const end = P.entrySample(entry, entry.summary.duration), page = html({ open: true }, entry, end);
    expect(page.querySelector('[data-entry-dynamics-value="bank"]').textContent).toBe('Lift inactive');
    expect(page.querySelector('[data-entry-dynamics-diagram="bank"]').dataset.bank).toBe('');
    expect(page.querySelector('[data-entry-dynamics-vector="fullLift"]').getAttribute('visibility')).toBe('hidden');
    expect(page.querySelector('[data-entry-dynamics-vector="fullLift"] polygon').getAttribute('points')).toBe('');
  });

  it('updates the same entry clock in an isolated force panel without touching surrounding recorder or thermal data', () => {
    const controls = { open: true, view: 'forces' }, page = html(controls), outside = document.createElement('p');
    outside.dataset.entryRecorderSentinel = 'true'; outside.textContent = 'Immutable flight reward and separate thermal clock'; page.prepend(outside);
    const next = P.entrySample(entry, 90), before = JSON.stringify({ entry, next, controls });
    P.updateEntryDynamics(page, entry, next, controls);
    const lab = page.querySelector('[data-entry-dynamics]'), geometry = P.entryDynamicsGeometry(P.entryDynamicsProfile(entry), 90, 600, 360);
    expect(Number(lab.dataset.entryDynamicsTime)).toBe(90);
    expect(lab.querySelector('[data-entry-dynamics-value="time"]').textContent).toBe('90.0 s');
    for (const key of ['drag', 'lift', 'gravity', 'netPlane']) {
      const group = lab.querySelector('[data-entry-dynamics-vector="' + key + '"]'), arrow = geometry.vectors[key];
      expect(Number(group.dataset.x)).toBe(arrow.x);
      expect(Number(group.dataset.y)).toBe(arrow.y);
      expect(Number(group.querySelector('line').getAttribute('x2'))).toBe(arrow.endX);
      expect(Number(group.querySelector('line').getAttribute('y2'))).toBe(arrow.endY);
      expect(group.querySelector('polygon').getAttribute('points')).toBe(arrow.head);
    }
    expect(Number(lab.querySelector('[data-entry-dynamics-diagram="bank"]').dataset.plane)).toBe(geometry.sample.liftPlane);
    expect(outside.textContent).toBe('Immutable flight reward and separate thermal clock');
    expect(JSON.stringify({ entry, next, controls })).toBe(before);
  });

  it('updates energy readings and cursor with dimensional separation from heat load and terminal forces', () => {
    const controls = { open: true, view: 'energy' }, page = html(controls), profile = P.entryDynamicsProfile(entry), time = profile.summary.duration;
    P.updateEntryDynamics(page, entry, P.entrySample(entry, time), controls);
    const row = P.entryDynamicsSample(profile, time), chart = P.entryDynamicsGeometry(profile, time, 600, 360);
    expect(page.querySelectorAll('[data-entry-dynamics-trace]')).toHaveLength(3);
    expect(page.querySelector('[data-entry-dynamics-diagram="forces"]')).toBeNull();
    expect(page.querySelector('[data-entry-dynamics-value="kinetic"]').textContent).toBe((row.energy.kinetic / 1e6).toFixed(3) + ' MJ/kg');
    expect(page.querySelector('[data-entry-dynamics-value="potential"]').textContent).toBe((row.energy.potential / 1e6).toFixed(3) + ' MJ/kg');
    expect(page.querySelector('[data-entry-dynamics-value="totalDragWork"]').textContent).toBe((row.energy.totalDragWork / 1e9).toFixed(3) + ' GJ');
    expect(page.querySelector('[data-entry-dynamics-value="residual"]').textContent).toMatch(/^[+-].* J\/kg$/);
    expect(Number(page.querySelector('[data-entry-dynamics-playhead]').getAttribute('x1'))).toBe(chart.base.chart.right);
    expect(page.querySelector('[data-entry-dynamics-energy-note]').textContent).toContain('it is not the vehicle’s absorbed heat');
    expect(page.querySelector('[data-entry-dynamics-energy-note]').textContent).toContain('interpolation error');
    expect(page.querySelector('[data-entry-dynamics-endpoint-note]').textContent).toContain('immediately before water contact');
    const skip = P.entryProfile(-3), skipEnd = P.entrySample(skip, skip.summary.duration), skipPage = html(controls, skip, skipEnd);
    expect(skipPage.querySelector('[data-entry-dynamics-endpoint-note]').textContent).toContain('outgoing atmospheric interface');
  });
});
