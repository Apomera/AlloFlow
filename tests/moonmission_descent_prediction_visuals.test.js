import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, newStore, resetStemLab, React, ReactDOMServer } from './helpers/stem_widgets_smoke_harness.js';

let P;
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_moonmission.js', 'moonMission'); P = window.MoonMissionPure; });
const state = extra => ({ alt: 300, vVel: -9, hVel: 4, fuel: 110, thrust: 0, tilt: 0, elapsed: 8, x: 100, ...extra });
function page(open = true) {
  const root = document.createElement('div');
  root.innerHTML = ReactDOMServer.renderToStaticMarkup(P.descentPredictionView(React.createElement, open, vi.fn())); return root;
}
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const r = find(child, predicate); if (r) return r; } return null; }
  return predicate(node) ? node : find(node.props?.children, predicate);
}

describe('landing prediction view and preference', () => {
  it('starts compact with a keyboard button and no projected diagrams', () => {
    const root = page(false), button = root.querySelector('button');
    expect(button.getAttribute('aria-expanded')).toBe('false'); expect(button.style.minHeight).toBe('44px');
    expect(root.querySelector('#' + button.getAttribute('aria-controls')).hidden).toBe(true);
    expect(root.querySelector('[data-descent-prediction-panel]')).toBeNull(); expect(root.querySelector('svg')).toBeNull();
  });

  it('normalizes only a strict open preference', () => {
    expect(P.cleanDescentPredictionState({ descentPredictionOpen: true, predictedLanding: true })).toEqual({ descentPredictionOpen: true });
    for (const raw of [null, [], 'true', {}, { descentPredictionOpen: 'true' }, { descentPredictionOpen: 1 }]) {
      expect(P.cleanDescentPredictionState(raw)).toEqual({ descentPredictionOpen: false });
    }
  });

  it('uses equal metre axes for both full projected histories and their exact endpoints', () => {
    const p = P.descentPredictionProfile(state(), {}), g = P.descentPredictionGeometry(p);
    const root = page(); P.updateDescentPrediction(root, p, { paused: true });
    const svg = root.querySelector('svg'); expect(svg.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
    for (const key of ['held', 'burn']) {
      const points = root.querySelector('[data-descent-prediction-path="' + key + '"]').getAttribute('points')
        .split(' ').map(pair => pair.split(',').map(Number));
      expect(points).toHaveLength(p[key].samples.length);
      for (let i = 1; i < points.length; i++) {
        const a = p[key].samples[i - 1], b = p[key].samples[i];
        expect(points[i][0] - points[i - 1][0]).toBeCloseTo((b.x - a.x) * g.scale, 3);
        expect(points[i - 1][1] - points[i][1]).toBeCloseTo((b.alt - a.alt) * g.scale, 3);
      }
      const end = root.querySelector('[data-descent-prediction-end="' + key + '"]');
      expect(Number(end.getAttribute('cx'))).toBe(g[key + 'End'].x);
      expect(Number(end.getAttribute('cy'))).toBe(g[key + 'End'].y);
      expect(end.dataset.endpoint).toBe(p[key].summary.kind);
    }
    expect(root.querySelector('[data-descent-prediction-end="held"]').getAttribute('fill')).toBe('#67e8f9');
    expect(root.querySelector('[data-descent-prediction-end="burn"]').getAttribute('fill')).toBe('none');
    expect(root.querySelectorAll('svg text')).toHaveLength(0);
    expect(root.querySelector('[data-descent-prediction-scale]').textContent).toContain('Shared metre scale');
  });

  it('reports snapshot time, controls and finite propellant with honest arrest language', () => {
    const p = P.descentPredictionProfile(state(), { throttle: .3, left: true }), root = page();
    P.updateDescentPrediction(root, p, { paused: true });
    expect(root.querySelector('[data-descent-prediction]').dataset.descentPredictionTime).toBe('8');
    expect(root.querySelector('[data-descent-prediction-source]').textContent).toContain('flight paused');
    expect(root.querySelector('[data-descent-prediction-command="held"]').textContent).toContain('30% commanded throttle · left');
    expect(root.querySelector('[data-descent-prediction-value="burn-altitude"]').textContent).toBe(p.burn.summary.altitude.toFixed(1) + ' m');
    expect(root.querySelector('[data-descent-prediction-value="burn-propellant"]').textContent).toContain('kg');
    expect(root.querySelector('[data-descent-prediction-status]').textContent).toContain('Lateral drift remains');
    expect(root.querySelector('[data-descent-prediction-note]').textContent).toContain('does not operate the lander or change its score');
  });

  it('distinguishes inspected actual throttle from unknown original recorded commands', () => {
    const p = P.descentPredictionProfile(state({ thrust: .45, tilt: .2 }), { throttle: .45 }), root = page();
    P.updateDescentPrediction(root, p, { recorded: true });
    expect(root.querySelector('[data-descent-prediction-source]').textContent).toContain('Recorded state');
    expect(root.querySelector('[data-descent-prediction-label="held"]').textContent).toBe('Hold inspected throttle, center tilt');
    expect(root.querySelector('[data-descent-prediction-command="held"]').textContent).toContain('hypothetical future command');
    expect(root.querySelector('[data-descent-prediction]').dataset.descentPredictionTilt).toBe('center');
  });

  it('clears unavailable projections instead of reconstructing legacy percentage fuel', () => {
    const root = page(); P.updateDescentPrediction(root, P.descentPredictionProfile(state(), {}), {});
    P.updateDescentPrediction(root, null, { unavailable: 'Older percentage fuel was not recorded as propellant.' });
    expect(root.querySelector('[data-descent-prediction]').dataset.descentPredictionAvailable).toBe('false');
    expect(root.querySelector('[data-descent-prediction-plot]').style.display).toBe('none');
    expect(root.querySelector('[data-descent-prediction-cases]').style.display).toBe('none');
    expect(root.querySelector('[data-descent-prediction-status]').textContent).toBe('No forecast is calculated.');
    expect(root.querySelector('[data-descent-prediction-source]').textContent).toContain('Older percentage fuel');
  });

  it('resets the panel preference for a new mission', () => {
    const store = newStore({ moonMission: { missionPhase: 10, descentPredictionOpen: true, soundOff: true,
      missionXP: 42, lunarSamples: [], earnedBadges: { first_step: true, mission_complete: true } } });
    const tree = window.StemLab._registry.moonMission.render(makeCtx({ toolData: store.toolData }, store));
    const again = find(tree, node => node.type === 'button' && /Reset and start a new Moon mission/.test(node.props?.title || ''));
    expect(again).not.toBeNull(); again.props.onClick();
    expect(store.toolData.moonMission.missionPhase).toBe(0);
    expect(store.toolData.moonMission.descentPredictionOpen).toBe(false);
  });

  it('opens from the mission view by changing only its preference', () => {
    const store = newStore({ moonMission: { missionPhase: 5, descentStarted: true, animPaused: true, soundOff: true,
      missionXP: 42, landingRewarded: true, lunarSamples: [] } });
    const tree = window.StemLab._registry.moonMission.render(makeCtx({ toolData: store.toolData }, store));
    const toggle = find(tree, node => node.props?.['data-descent-prediction-toggle']);
    const before = JSON.parse(JSON.stringify(store.toolData.moonMission));
    toggle.props.onClick({ currentTarget: { closest: () => null } });
    const after = { ...store.toolData.moonMission }; delete before.descentPredictionOpen; delete after.descentPredictionOpen;
    expect(after).toEqual(before); expect(store.toolData.moonMission.descentPredictionOpen).toBe(true);
  });
});
