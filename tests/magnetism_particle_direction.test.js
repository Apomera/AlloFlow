import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { resetStemLab, loadTool, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const physics = require(resolve('stem_lab/stem_tool_magnetism.js'));
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function mount(extra = {}) {
  resetStemLab();
  const cfg = loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  let latest;
  function Harness() {
    const [toolData, setToolData] = React.useState({ magnetism: {
      tab: 'motor', motorMode: 'particle', chargeView: '2d', chargeSign: 1, chargeField: 1,
      chargeSpeed: 5, chargeB: 4, learningMode: 'guided', notebookTrials: [],
      notebookOpen: true, labShellPanel: 'evidence', ...extra,
    } });
    latest = toolData.magnetism;
    return cfg.render({ React, toolData, setToolData, addToast() {}, announceToSR() {}, awardXP() {},
      aiHintsEnabled: false, callGemini: null, t: (key, fallback) => fallback || key });
  }
  act(() => root.render(React.createElement(Harness)));
  return {
    host,
    state: () => latest,
    capture() {
      const button = [...host.querySelectorAll('button')].find((item) => item.textContent.trim() === 'Record current trial');
      expect(button).toBeTruthy();
      act(() => button.click());
    },
    close() { act(() => root.unmount()); host.remove(); },
  };
}

describe('planar Lorentz force uses the right-hand rule in every representation', () => {
  // +x right, +y up, +z out: (+x) × (+z) = −y.
  // OpenStax Physics 20.1 explicitly gives downward force for this case.
  it.each([
    [1, 1, 'down'],
    [-1, 1, 'up'],
    [1, -1, 'up'],
    [-1, -1, 'down'],
  ])('charge %s and field %s curve %s in Cartesian coordinates, SVG, and notebook', (charge, field, direction) => {
    expect(physics.chargedParticleBendDirection(charge, field)).toBe(direction);
    const physicalPath = physics.chargedParticleTrajectory(charge, field, 5, 4, 36);
    expect(Math.sign(physicalPath.at(-1).y)).toBe(direction === 'down' ? -1 : 1);
    const live = mount({ chargeSign: charge, chargeField: field });
    try {
      const diagram = [...live.host.querySelectorAll('svg[role="img"]')]
        .find((item) => item.getAttribute('aria-label').includes('particle moving right'));
      expect(diagram).toBeTruthy();
      expect(diagram.getAttribute('aria-label')).toContain('curving ' + direction);
      const renderedPath = diagram.querySelector('polyline').getAttribute('points').split(' ')
        .map((point) => point.split(',').map(Number));
      expect(Math.sign(renderedPath.at(-1)[1] - renderedPath[0][1])).toBe(direction === 'down' ? 1 : -1);
      const forceArrow = [...diagram.querySelectorAll('line')]
        .find((line) => line.getAttribute('x1') === '52' && line.getAttribute('x2') === '52');
      expect(Math.sign(Number(forceArrow.getAttribute('y2')) - Number(forceArrow.getAttribute('y1'))))
        .toBe(direction === 'down' ? 1 : -1);
      expect(live.host.textContent).toContain('Path bends ' + direction);
      live.capture();
      expect(live.state().notebookTrials[0].result).toContain('path bends ' + direction);
    } finally { live.close(); }
  });

  it('keeps zero-field paths straight and double reversals identical', () => {
    expect(physics.chargedParticleTrajectory(1, 1, 5, 0, 36).every((point) => point.y === 0)).toBe(true);
    expect(physics.chargedParticleTrajectory(-1, -1, 5, 4, 36))
      .toEqual(physics.chargedParticleTrajectory(1, 1, 5, 4, 36));
  });

  it.each([[1, 1], [-1, 1], [1, -1], [-1, -1]])('keeps the 3D +y-axis convention correct for q=%s, B=%s', (charge, field) => {
    const { points } = physics.chargedParticleHelix(charge, field, 5, 4, 45, 121, 1);
    // The helix enters with positive x velocity. For B along +y,
    // q(v × B) starts along +z, opposite to the planar −y force axis.
    const initialAccelerationZ = points[2].z - 2 * points[1].z + points[0].z;
    expect(points[1].x).toBeGreaterThan(points[0].x);
    expect(Math.sign(initialAccelerationZ)).toBe(charge * field);
  });
});

describe('eddy-current notebook metrics describe the active brake bench', () => {
  const state = {
    tab: 'induce', induceMode: 'eddy', eddyMaterial: 'aluminum', eddyThickness: 4,
    eddySlit: false, eddySpeed: 6, eddyField: 5,
    lastEMF: 123, peakEMF: 999, induceSpeedTrials: {},
  };

  it('records the same drag, stopping distance and heat as the visible model', () => {
    const metrics = physics.notebookMetricSnapshot(state);
    const values = Object.fromEntries(metrics.map((item) => [item.key, item.value]));
    const brake = physics.eddyBrakeState(0.62, 4, false, 6, 5);
    expect(values).toEqual({ eddy_drag_percent: brake.forcePercent, eddy_stop_distance: brake.stoppingDistance,
      eddy_heat_share: brake.heatShare, eddy_tube_braking: 100 * brake.brakeFactor });
    expect(metrics.every((item) => item.model === 'induce:eddy')).toBe(true);
    expect(metrics.some((item) => item.key === 'voltage_V' || item.key === 'peak_V')).toBe(false);
  });

  it('preserves meaningful field-off and stationary controls while separating tube braking', () => {
    const fieldOff = Object.fromEntries(physics.notebookMetricSnapshot({ ...state, eddyField: 0 })
      .map((item) => [item.key, item.value]));
    expect(fieldOff.eddy_drag_percent).toBe(0);
    expect(fieldOff.eddy_heat_share).toBe(0);
    expect(fieldOff.eddy_stop_distance).toBeGreaterThan(0);
    expect(fieldOff.eddy_tube_braking).toBeGreaterThan(0);
    const stationary = Object.fromEntries(physics.notebookMetricSnapshot({ ...state, eddySpeed: 0 })
      .map((item) => [item.key, item.value]));
    expect(stationary.eddy_drag_percent).toBe(0);
    expect(stationary.eddy_stop_distance).toBe(0);
    expect(stationary.eddy_heat_share).toBe(0);
  });

  it('captures the eddy values and model in the actual notebook record', () => {
    const live = mount(state);
    try {
      live.capture();
      const saved = live.state().notebookTrials[0];
      expect(saved.station).toBe('Eddy-current brake bench');
      expect(saved.metrics).toEqual(physics.notebookMetricSnapshot(state));
      expect(saved.result).toContain('relative drag');
      expect(saved.metrics.some((item) => item.label.includes('voltage'))).toBe(false);
    } finally { live.close(); }
  });

  it('keeps hand-induction voltage measurements in their own mode', () => {
    const metrics = physics.notebookMetricSnapshot({ ...state, induceMode: 'hand' });
    expect(metrics.find((item) => item.key === 'voltage_V')).toMatchObject({ value: 123, model: 'induce:hand' });
    expect(metrics.find((item) => item.key === 'peak_V')).toMatchObject({ value: 999, model: 'induce:hand' });
    expect(metrics.some((item) => item.key.startsWith('eddy_'))).toBe(false);
  });
});
