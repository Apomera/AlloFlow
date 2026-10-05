import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMServer } from './helpers/stem_widgets_smoke_harness.js';

let P, entry, entrySample;
beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_moonmission.js', 'moonMission');
  P = window.MoonMissionPure;
  entry = P.entryProfile(-6.5, { plan: P.entryPlan({ mode: 'guided' }) });
  entrySample = P.entrySample(entry, 60);
});

function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) { const result = find(child, predicate); if (result) return result; }
    return null;
  }
  return predicate(node) ? node : find(node.props && node.props.children, predicate);
}
function tree(controls = {}, action = vi.fn()) {
  return P.entryThermalView(React.createElement, entry, entrySample, controls, action);
}
function html(controls = {}) {
  const element = document.createElement('div');
  element.innerHTML = ReactDOMServer.renderToStaticMarkup(tree(controls));
  return element;
}

describe('Moon Mission independent thermal lab presentation', () => {
  it('shows actual full-depth node temperatures on one shared active/baseline scale', () => {
    const plan = P.entryThermalPlan({ conductivity: 1.2 }), baseline = P.entryThermalProfile(entry, P.entryThermalPlan());
    const profile = P.entryThermalProfile(entry, plan), geometry = P.entryThermalVisualGeometry(profile, baseline, profile.summary.peakSurfaceTime, 600, 140);
    expect(geometry.cells).toHaveLength(33);
    expect(geometry.cells[0].depth).toBe(0);
    expect(geometry.cells.at(-1).depth).toBe(plan.thickness);
    expect(geometry.cells[0].temperature).toBe(geometry.sample.surfaceT);
    expect(geometry.cells.at(-1).temperature).toBe(geometry.sample.backT);
    expect(geometry.cells.map((cell) => cell.temperature)).toEqual(geometry.sample.temperatures);
    expect(geometry.base.maxK).toBeGreaterThanOrEqual(Math.max(profile.summary.peakSurfaceT, profile.summary.peakBackT, baseline.summary.peakSurfaceT, baseline.summary.peakBackT));
    for (const key of ['surface', 'back', 'baselineSurface', 'baselineBack']) {
      const points = geometry.base[key];
      expect(points[0].temperature).toBeCloseTo(293.15, 10);
      expect(points[0].y).toBeCloseTo(geometry.base.bottom, 10);
      expect(points.at(-1).x).toBeCloseTo(geometry.base.right, 10);
      for (const point of points) {
        expect(point.y).toBeGreaterThanOrEqual(geometry.base.top - 1e-8);
        expect(point.y).toBeLessThanOrEqual(geometry.base.bottom + 1e-8);
        expect(Number.isFinite(point.x)).toBe(true);
      }
    }
    expect(geometry.surfaceY).toBeLessThan(geometry.backY);
    expect(Object.isFrozen(geometry)).toBe(true);
    expect(Object.isFrozen(geometry.base)).toBe(true);
    expect(Object.isFrozen(geometry.cells)).toBe(true);
    expect(geometry.cells.every(Object.isFrozen)).toBe(true);
  });

  it('starts as a compact closed lab with a valid expansion target', () => {
    const page = html();
    const toggle = page.querySelector('[data-entry-thermal-toggle]');
    expect(toggle.textContent).toBe('Explore heat-shield temperatures');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(page.querySelector('#' + toggle.getAttribute('aria-controls')).hidden).toBe(true);
    expect(page.querySelector('[data-entry-thermal-panel]')).toBeNull();
    expect(page.querySelector('[data-entry-thermal-history]')).toBeNull();
    const current = P.entryThermalSample(P.entryThermalProfile(entry, P.entryThermalPlan()), entrySample.time);
    expect(page.querySelector('[data-entry-thermal-value="surface"]').textContent).toBe((current.surfaceT - 273.15).toFixed(1) + ' °C');
    expect(page.querySelector('[data-entry-thermal-value="back"]').textContent).toBe((current.backT - 273.15).toFixed(1) + ' °C');
  });

  it('forwards each control event through thermal-only actions without mutating flight input', () => {
    const action = vi.fn(), controls = { open: true, plan: P.entryThermalPlan(), follow: true, time: 0 };
    const before = JSON.stringify({ angle: entry.angle, summary: entry.summary, sample: entrySample, controls });
    const ui = tree(controls, action);
    const control = (key, value = true) => find(ui, (node) => node.props && node.props[key] === value).props;
    const click = { currentTarget: { marker: 'thermal action source' } };
    control('data-entry-thermal-preset', 'conductive').onClick(click);
    expect(action.mock.calls.at(-1)).toEqual(['plan', P.entryThermalPlan({ thickness: 0.05, conductivity: 1.2, emissivity: 0.85 }), click]);
    const change = { target: { value: '60' }, currentTarget: click.currentTarget };
    control('data-entry-thermal-parameter', 'thickness').onChange(change);
    expect(action.mock.calls.at(-1)[0]).toBe('plan');
    expect(action.mock.calls.at(-1)[1].thickness).toBeCloseTo(0.06, 12);
    expect(action.mock.calls.at(-1)[2]).toBe(change);
    const seek = { target: { value: '1000.5' }, currentTarget: click.currentTarget };
    control('data-entry-thermal-seek').onChange(seek);
    expect(action.mock.calls.at(-1)).toEqual(['time', 1000.5, seek]);
    control('data-entry-thermal-peak', 'surface').onClick(click);
    expect(action.mock.calls.at(-1)).toEqual(['time', P.entryThermalProfile(entry, controls.plan).summary.peakSurfaceTime, click]);
    control('data-entry-thermal-follow').onClick(click);
    expect(action.mock.calls.at(-1)).toEqual(['follow', true, click]);
    const report = { target: { checked: true }, currentTarget: click.currentTarget };
    control('data-entry-thermal-include-report').onChange(report);
    expect(action.mock.calls.at(-1)).toEqual(['includeReport', true, report]);
    control('data-entry-thermal-toggle').onClick(click);
    expect(action.mock.calls.at(-1)).toEqual(['open', false, click]);
    expect(action.mock.calls.every(([name]) => ['plan', 'time', 'follow', 'includeReport', 'open'].includes(name))).toBe(true);
    expect(JSON.stringify({ angle: entry.angle, summary: entry.summary, sample: entrySample, controls })).toBe(before);
  });

  it('updates only the lab at independent cooling time, then follows the unchanged entry clock', () => {
    const plan = P.entryThermalPlan(), profile = P.entryThermalProfile(entry, plan), controls = { open: true, plan, follow: false, time: profile.summary.duration };
    const page = html(controls), outside = document.createElement('p');
    outside.dataset.flightSentinel = 'true'; outside.textContent = 'Entry clock 60 seconds; original flight receipt and reward';
    page.prepend(outside);
    const before = JSON.stringify({ entrySample, entrySummary: entry.summary });
    P.updateEntryThermal(page, entry, entrySample, controls);
    const lab = page.querySelector('[data-entry-thermal-lab]'), sample = P.entryThermalSample(profile, controls.time);
    expect(Number(lab.dataset.entryThermalTime)).toBe(controls.time);
    expect(lab.dataset.entryThermalPhase).toBe('cooling');
    expect(Number(lab.dataset.entryThermalFluxIn)).toBe(0);
    expect(Number(lab.dataset.entryThermalSurface)).toBe(sample.surfaceT);
    expect(lab.querySelector('[data-entry-thermal-value="phase"]').textContent).toContain('Zero-input cooling');
    const cells = lab.querySelectorAll('[data-entry-thermal-cell]');
    expect(cells).toHaveLength(33);
    for (let index = 0; index < cells.length; index++) expect(Number(cells[index].dataset.entryThermalTemperature)).toBe(sample.temperatures[index]);
    expect(Number(lab.querySelector('[data-entry-thermal-seek]').value)).toBeCloseTo(controls.time, 1);
    const independentCursor = Number(lab.querySelector('[data-entry-thermal-playhead]').getAttribute('x1'));
    P.updateEntryThermal(page, entry, entrySample, { ...controls, follow: true });
    expect(Number(lab.dataset.entryThermalTime)).toBe(entrySample.time);
    expect(lab.dataset.entryThermalFollowing).toBe('true');
    expect(Number(lab.querySelector('[data-entry-thermal-playhead]').getAttribute('x1'))).toBeLessThan(independentCursor);
    expect(lab.querySelector('[data-entry-thermal-follow]').textContent).toBe('Following entry time');
    expect(outside.textContent).toBe('Entry clock 60 seconds; original flight receipt and reward');
    expect(JSON.stringify({ entrySample, entrySummary: entry.summary })).toBe(before);
  });

  it('shows signed conduction and net radiation directions, including heat returning toward the surface', () => {
    expect(P.entryThermalFlow('conducted', 500).label).toBe('Surface → interior');
    expect(P.entryThermalFlow('conducted', -500).label).toBe('Interior → surface');
    expect(P.entryThermalFlow('conducted', -500).direction).toBe('left');
    expect(P.entryThermalFlow('radiated', 500).label).toBe('Surface → environment');
    expect(P.entryThermalFlow('radiated', -500).label).toBe('Environment → surface');
    expect(P.entryThermalFlow('radiated', -500).direction).toBe('right');
    expect(P.entryThermalFlow('conducted', -500).text).toBe('0.50 kW/m²');
    const page = html({ open: true });
    expect(page.querySelector('[data-entry-thermal-boundaries]').textContent).toMatch(/Ablation, pyrolysis, changing properties, cabin heating and survival are omitted/);
    expect(page.querySelector('[data-entry-thermal-advanced]').textContent).toMatch(/Net radiation.*fixed 20 °C.*293.15 K.*back face is insulated/);
    expect(page.querySelector('[data-entry-thermal-clock-note]').textContent).toMatch(/300 seconds with zero heat input.*also applies after a skip-out/);
    expect(page.querySelectorAll('[data-entry-thermal-history-line]')).toHaveLength(4);
    expect(page.querySelectorAll('[data-entry-thermal-chart-axis] svg text')).toHaveLength(0);
    expect(page.querySelector('[data-entry-thermal-comparison] caption').textContent).toContain('Same entry and lab time');
  });
});
