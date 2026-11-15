import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function find(node, pred) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = find(child, pred);
      if (hit) return hit;
    }
    return null;
  }
  if (node.props && pred(node)) return node;
  return node.props && node.props.children ? find(node.props.children, pred) : null;
}

function setNativeInput(el, val) {
  const proto = HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, String(val));
  else el.value = String(val);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function mountPhysics(initialPhysics, ctxOverrides = {}) {
  const cfg = loadTool('stem_lab/stem_tool_physics.js', 'physics');
  let state = { physics: { ...initialPhysics } };
  const setStemLabTool = ctxOverrides.setStemLabTool || vi.fn();
  const addToast = ctxOverrides.addToast || vi.fn();
  const setToolData = (arg) => {
    state = typeof arg === 'function' ? arg(state) : arg;
  };
  const renderNow = () => cfg.render({
    React,
    toolData: state,
    setToolData,
    labToolData: state,
    setLabToolData: setToolData,
    setToolSnapshots: vi.fn(),
    addToast,
    announceToSR: vi.fn(),
    awardXP: vi.fn(),
    awardStemXP: vi.fn(),
    stemBeep: vi.fn(),
    celebrate: vi.fn(),
    stemCelebrate: vi.fn(),
    setStemLabTool,
    canvasNarrate: vi.fn(),
    canvasA11yDesc: vi.fn(),
    srOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden' },
    a11yClick: (fn) => ({ onClick: fn, role: 'button', tabIndex: 0 }),
    icons: new Proxy({}, { get: () => () => React.createElement('span') }),
    gradeLevel: '6th Grade',
    props: {},
    t: (_k, fb) => fb || _k,
    ...ctxOverrides,
  });
  let tree = renderNow();
  return {
    cfg,
    get tree() { return tree; },
    rerender() { tree = renderNow(); return tree; },
    state() { return state.physics; },
    setStemLabTool,
    setState(patch) {
      state = { ...state, physics: { ...(state.physics || {}), ...patch } };
      tree = renderNow();
      return tree;
    },
  };
}

function mountPhysicsDom(initialPhysics, ctxOverrides = {}) {
  const cfg = loadTool('stem_lab/stem_tool_physics.js', 'physics');
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);

  let state = { physics: { ...initialPhysics } };
  const setStemLabTool = ctxOverrides.setStemLabTool || vi.fn();
  const awardStemXP = ctxOverrides.awardStemXP || vi.fn();
  const stemCelebrate = ctxOverrides.stemCelebrate || vi.fn();

  function Harness() {
    const [data, setData] = React.useState(state);
    state = data;
    return cfg.render({
      React,
      toolData: data,
      setToolData: setData,
      labToolData: data,
      setLabToolData: setData,
      setToolSnapshots: vi.fn(),
      addToast: vi.fn(),
      announceToSR: vi.fn(),
      awardXP: awardStemXP,
      awardStemXP,
      stemBeep: vi.fn(),
      celebrate: stemCelebrate,
      stemCelebrate,
      setStemLabTool,
      canvasNarrate: vi.fn(),
      canvasA11yDesc: vi.fn(),
      srOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden' },
      a11yClick: (fn) => ({ onClick: fn, role: 'button', tabIndex: 0 }),
      icons: new Proxy({}, { get: () => () => React.createElement('span') }),
      gradeLevel: '8th Grade',
      props: {},
      t: (_k, fb) => fb || _k,
      ...ctxOverrides,
    });
  }

  React.act(() => {
    root.render(React.createElement(Harness));
  });

  return {
    cfg,
    host,
    setStemLabTool,
    state: () => state.physics,
    unmount: () => React.act(() => { root.unmount(); }),
  };
}

describe('Projectile Lab Tier 3 Wave 2 Enhancements', () => {
  const origGetContext = HTMLCanvasElement.prototype.getContext;
  const domMounts = [];

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    resetStemLab();
    delete window.__alloflowPhysics;
    try { localStorage.removeItem('physics.state.v1'); } catch {}
    document.body.innerHTML = '';
    HTMLCanvasElement.prototype.getContext = function () {
      return {
        canvas: this,
        save() {}, restore() {}, clearRect() {}, fillRect() {}, strokeRect() {},
        beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {},
        ellipse() {}, quadraticCurveTo() {}, bezierCurveTo() {}, stroke() {}, fill() {},
        fillText() {}, strokeText() {}, setLineDash() {}, translate() {}, scale() {},
        rotate() {}, rect() {}, roundRect() {}, clip() {},
        measureText: (s) => ({ width: String(s || '').length * 7 }),
        createLinearGradient: () => ({ addColorStop() {} }),
        createRadialGradient: () => ({ addColorStop() {} }),
      };
    };
  });

  afterEach(() => {
    while (domMounts.length) {
      try { domMounts.pop().unmount(); } catch {}
    }
    HTMLCanvasElement.prototype.getContext = origGetContext;
    delete window.__alloflowPhysics;
    try { localStorage.removeItem('physics.state.v1'); } catch {}
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('supports direct-manipulation canvas handler for angle, height (with h0=0 clamp), tape, and mission locks', () => {
    const dom = mountPhysicsDom({ angle: 45, velocity: 25, gravity: 9.8, launchHeight: 10, airResist: false });
    domMounts.push(dom);
    const cv = dom.host.querySelector('#physicsCanvas');
    expect(typeof cv._onDirectManipulate).toBe('function');

    React.act(() => { cv._onDirectManipulate({ kind: 'angle', angle: 62.4 }); });
    expect(dom.state().angle).toBe(62);

    React.act(() => { cv._onDirectManipulate({ kind: 'height', launchHeight: 18.2 }); });
    expect(dom.state().launchHeight).toBe(18);

    // Lowering angle below 5 when launchHeight > 0 is allowed; lowering height to 0 clamps angle to >= 5
    React.act(() => { cv._onDirectManipulate({ kind: 'angle', angle: 2 }); });
    expect(dom.state().angle).toBe(2);
    React.act(() => { cv._onDirectManipulate({ kind: 'height', launchHeight: 0 }); });
    expect(dom.state().launchHeight).toBe(0);
    expect(dom.state().angle).toBe(5);

    // Tape drag enables probe and preserves 0.1 m precision
    React.act(() => { cv._onDirectManipulate({ kind: 'tape', x: 42.34, y: 11.76 }); });
    expect(dom.state().showTapeMeasure).toBe(true);
    expect(dom.state().tapeMeasure).toEqual({ x: 42.3, y: 11.8 });

    dom.unmount();
    document.body.innerHTML = '';

    // fixedAngle lock prevents angle drag while Target/Obstacle/Battle modes lock height
    const domLockedAngle = mountPhysicsDom({
      angle: 45, velocity: 25, gravity: 9.8, launchHeight: 0,
      targetMode: true, targetRound: 1, targetList: [{ x: 60, y: 0, radius: 10, destroyed: false, id: 0 }],
      targetConstraint: { type: 'fixedAngle', value: 45 },
    });
    domMounts.push(domLockedAngle);
    const cvLocked = domLockedAngle.host.querySelector('#physicsCanvas');
    React.act(() => {
      cvLocked._onDirectManipulate({ kind: 'angle', angle: 70 });
      cvLocked._onDirectManipulate({ kind: 'height', launchHeight: 12 });
    });
    expect(domLockedAngle.state().angle).toBe(45);
    expect(domLockedAngle.state().launchHeight).toBe(0);
    domLockedAngle.unmount();
    document.body.innerHTML = '';

    for (const modePatch of [
      { obstacleMode: true, obstacleId: 'wall', gravity: 9.8, launchHeight: 0 },
      { battleMode: true, battleType: 'coach', enemyDist: 90, launchHeight: 0 },
    ]) {
      const dMode = mountPhysicsDom({ angle: 45, velocity: 25, gravity: 9.8, ...modePatch });
      domMounts.push(dMode);
      React.act(() => {
        dMode.host.querySelector('#physicsCanvas')._onDirectManipulate({ kind: 'height', launchHeight: 15 });
      });
      expect(dMode.state().launchHeight).toBe(0);
      dMode.unmount();
      document.body.innerHTML = '';
    }
  });

  it('toggles Crosshair Tape-Measure Probe, edits X/Y inputs, snaps to apex & landing, and evaluates trajectoryHeightAtX', () => {
    const dom = mountPhysicsDom({ angle: 45, velocity: 25, gravity: 9.8, mass: 1, launchHeight: 0, airResist: false });
    domMounts.push(dom);
    const { trajectoryHeightAtX } = window.StemLab._physics;

    // Unit checks on trajectoryHeightAtX (vacuum and drag)
    const vacApexY = trajectoryHeightAtX(31.8878, 45, 25, 9.8, 1, 0, false);
    expect(vacApexY).toBeCloseTo(15.94, 1);
    expect(trajectoryHeightAtX(63.8, 45, 25, 9.8, 1, 0, false)).toBe(0); // rounded landing spot within 0.06 m tolerance
    expect(trajectoryHeightAtX(80, 45, 25, 9.8, 1, 0, false)).toBeNull();
    const dragY = trajectoryHeightAtX(20, 45, 25, 9.8, 1, 0, true);
    expect(dragY).toBeGreaterThan(8);
    expect(dragY).toBeLessThan(vacApexY);

    expect(dom.host.querySelector('[data-physics-tape-panel]')).toBeNull();
    React.act(() => { dom.host.querySelector('[data-physics-tape-toggle]').click(); });
    expect(dom.state().showTapeMeasure).toBe(true);

    const panel = dom.host.querySelector('[data-physics-tape-panel]');
    expect(panel).not.toBeNull();

    const inputX = panel.querySelector('[data-physics-tape-x]');
    const inputY = panel.querySelector('[data-physics-tape-y]');
    React.act(() => { setNativeInput(inputX, '20.4'); });
    React.act(() => { setNativeInput(inputY, '12.3'); });
    expect(dom.state().tapeMeasure).toEqual({ x: 20.4, y: 12.3 });

    // Snap to apex (~31.9 m, 15.9 m)
    React.act(() => { panel.querySelector('[data-physics-tape-snap="apex"]').click(); });
    expect(dom.state().tapeMeasure.x).toBeCloseTo(31.9, 1);
    expect(dom.state().tapeMeasure.y).toBeCloseTo(15.9, 1);

    // Snap to landing (~63.8 m, 0 m) and show Arc y(x) = 0.0 m
    React.act(() => { panel.querySelector('[data-physics-tape-snap="landing"]').click(); });
    expect(dom.state().tapeMeasure.x).toBeCloseTo(63.8, 1);
    expect(dom.state().tapeMeasure.y).toBe(0);
    expect(panel.querySelector('[data-physics-tape-readout]').textContent).toContain('Arc y(x) = 0.0 m');
  });

  it('guards against Moon + Air Drag contradictions and drives Planetary Atmosphere & Wind Explorer', () => {
    const dom = mountPhysicsDom({
      angle: 45, velocity: 25, gravity: 1.6, mass: 1, launchHeight: 0, airResist: true, workspaceTab: 'all',
    });
    domMounts.push(dom);

    const moonWarn = dom.host.querySelector('[data-physics-moon-drag-warning]');
    expect(moonWarn).not.toBeNull();
    const fixBtn = moonWarn.querySelector('[data-physics-moon-vacuum-fix]');
    expect(fixBtn.disabled).toBe(false);

    React.act(() => { fixBtn.click(); });
    expect(dom.state().airResist).toBe(false);
    expect(dom.host.querySelector('[data-physics-moon-drag-warning]')).toBeNull();

    // Physics invariants for simulateAtmosphereWind
    const { simulateAtmosphereWind } = window.StemLab._physics;
    const moonNeg = simulateAtmosphereWind(45, 25, 1.6, 1, 0, 0, -20);
    const moonZero = simulateAtmosphereWind(45, 25, 1.6, 1, 0, 0, 0);
    const moonPos = simulateAtmosphereWind(45, 25, 1.6, 1, 0, 0, 20);
    expect(moonNeg.range).toBeCloseTo(moonZero.range, 6);
    expect(moonPos.range).toBeCloseTo(moonZero.range, 6);

    const earthVac = simulateAtmosphereWind(45, 25, 9.8, 1, 0, 0, 0);
    const earthHead = simulateAtmosphereWind(45, 25, 9.8, 1, 0, 1.0, -15);
    const earthCalm = simulateAtmosphereWind(45, 25, 9.8, 1, 0, 1.0, 0);
    const earthTail = simulateAtmosphereWind(45, 25, 9.8, 1, 0, 1.0, 15);
    expect(earthCalm.range).toBeLessThan(earthVac.range);
    expect(earthHead.range).toBeLessThan(earthCalm.range);
    expect(earthTail.range).toBeGreaterThan(earthCalm.range);

    const marsVac = simulateAtmosphereWind(45, 25, 3.7, 1, 0, 0, 0);
    const marsCalm = simulateAtmosphereWind(45, 25, 3.7, 1, 0, 0.016, 0);
    const titanVac = simulateAtmosphereWind(45, 25, 1.35, 1, 0, 0, 0);
    const titanCalm = simulateAtmosphereWind(45, 25, 1.35, 1, 0, 4.4, 0);
    const marsLoss = (marsVac.range - marsCalm.range) / marsVac.range;
    const titanLoss = (titanVac.range - titanCalm.range) / titanVac.range;
    expect(titanLoss).toBeGreaterThan(marsLoss * 5);

    // UI interactions in Atmosphere & Wind panel
    const atmoPanel = dom.host.querySelector('[data-physics-learning-panel="atmosphere-wind"]');
    expect(atmoPanel).not.toBeNull();
    React.act(() => { atmoPanel.querySelector('[data-atmo-planet="titan"]').click(); });
    expect(dom.state().atmoPlanet).toBe('titan');

    const slider = atmoPanel.querySelector('[data-physics-wind-slider]');
    React.act(() => { setNativeInput(slider, '12'); });
    expect(dom.state().windSpeed).toBe(12);

    React.act(() => { atmoPanel.querySelector('[data-physics-wind-reset]').click(); });
    expect(dom.state().windSpeed).toBe(0);

    React.act(() => { atmoPanel.querySelector('[data-physics-apply-planet]').click(); });
    expect(dom.state().gravity).toBe(1.35);
    expect(dom.state().airResist).toBe(true);
    dom.unmount();
    document.body.innerHTML = '';

    // Drag-required obstacle mission ('canyon_drag') normalizes gravity to 9.8 and locks airResist ON, clearing Moon contradiction
    const domObs = mountPhysicsDom({
      angle: 45, velocity: 25, gravity: 1.6, airResist: true, obstacleMode: true, obstacleId: 'canyon_drag', workspaceTab: 'all',
    });
    domMounts.push(domObs);
    const normObs = window.StemLab._physics.normalizeState(domObs.state());
    expect(normObs.gravity).toBe(9.8);
    expect(normObs.airResist).toBe(true);
    expect(domObs.host.querySelector('#physicsCanvas').dataset.gravity).toBe('9.8');
    expect(domObs.host.querySelector('#physicsCanvas').dataset.airResist).toBe('true');
    expect(domObs.host.querySelector('[data-physics-moon-drag-warning]')).toBeNull();
    expect(domObs.host.querySelector('[data-physics-air-drag]').disabled).toBe(true);
    domObs.unmount();
    document.body.innerHTML = '';

    // Target mode disables Apply Planet button
    const domTarget = mountPhysicsDom({
      angle: 45, velocity: 25, gravity: 9.8, airResist: false, targetMode: true, targetRound: 1,
      targetList: [{ x: 60, y: 0, radius: 10, destroyed: false, id: 0 }], workspaceTab: 'analyze',
    });
    domMounts.push(domTarget);
    expect(domTarget.host.querySelector('[data-physics-apply-planet]').disabled).toBe(true);
    domTarget.unmount();
    document.body.innerHTML = '';
  });

  it('computes & syncs 18-item STEAM Atlas mastery, hydrates on alloflow-state-restored, navigates bridges, and triggers questHooks + duelWins', async () => {
    loadTool('stem_lab/stem_tool_physics.js', 'physics');
    const { MASTERY_TOTAL, computeMastery } = window.StemLab._physics;
    expect(MASTERY_TOTAL).toBe(18);

    const computed = computeMastery({
      targetRound: 4,
      challenge1Done: true,
      obstacleDone: { wall: true, bogus_unknown: true },
      duelWins: 1,
      physicsMastery: { fake_key: true, obs_rooftop: true },
    });
    expect(computed).toEqual({
      target_1: true,
      target_2: true,
      target_3: true,
      challenge_1: true,
      obs_wall: true,
      obs_rooftop: true,
      duel_victor: true,
    });

    // Hub atlas exposes matching 'physics' card with total 18
    const hubSrc = readFileSync('stem_lab/stem_lab_module.js', 'utf8');
    expect(hubSrc).toContain("id: 'physics'");
    expect(hubSrc).toContain("slot: '__alloflowPhysics'");
    expect(hubSrc).toContain("lsKey: 'physics.state.v1'");

    // Mount DOM and check window.__alloflowPhysics + localStorage sync & bridges
    const setStemLabTool = vi.fn();
    const dom = mountPhysicsDom({
      angle: 45, velocity: 25, gravity: 9.8, launchHeight: 0, workspaceTab: 'all', duelWins: 0,
    }, { setStemLabTool });
    domMounts.push(dom);

    expect(window.__alloflowPhysics.physicsMastery).toEqual({});
    expect(JSON.parse(localStorage.getItem('physics.state.v1')).physicsMastery).toEqual({});

    // Simulate cloud restore updating window slot & firing alloflow-state-restored
    window.__alloflowPhysics = { physicsMastery: { target_1: true, challenge_1: true } };
    React.act(() => { window.dispatchEvent(new Event('alloflow-state-restored')); });
    expect(dom.state().physicsMastery).toEqual({ target_1: true, challenge_1: true });
    expect(dom.host.querySelector('[data-physics-mastery-count]').textContent).toContain('2 / 18');

    // Bridge buttons call setStemLabTool with expected IDs
    for (const targetId of ['throwlab', 'trajectoryComputing', 'machineLab']) {
      React.act(() => { dom.host.querySelector(`[data-physics-bridge="${targetId}"]`).click(); });
      expect(setStemLabTool).toHaveBeenCalledWith(targetId);
    }

    // Quest hooks verification
    const hooks = dom.cfg.questHooks;
    const obsHook = hooks.find((q) => q.id === 'clear_2_obstacles');
    const duelHook = hooks.find((q) => q.id === 'win_artillery_duel');
    const streakHook = hooks.find((q) => q.id === 'quiz_streak_3');
    expect(obsHook && duelHook && streakHook).toBeTruthy();
    expect(obsHook.check({ obstacleDone: { wall: true } })).toBe(false);
    expect(obsHook.check({ obstacleDone: { wall: true, canyon_drag: true } })).toBe(true);
    expect(streakHook.check({ quizStreak: 2 })).toBe(false);
    expect(streakHook.check({ quizStreak: 3 })).toBe(true);
    expect(duelHook.check({ duelWins: 0 })).toBe(false);

    // Winning an Artillery Duel increments duelWins & unlocks duel_victor mastery
    React.act(() => { dom.host.querySelector('[data-physics-battle-start="coach"]').click(); });
    const enemyDist = dom.state().enemyDist;
    for (let hit = 1; hit <= 3; hit++) {
      await React.act(async () => {
        dom.host.querySelector('#physicsCanvas')._onAnyLand(enemyDist, {
          n: hit, angle: 45, vel: Math.sqrt(enemyDist * 9.8), grav: 9.8,
          drag: false, mass: 1, launchHeight: 0, range: enemyDist, maxH: enemyDist / 4, time: 4,
          modelVersion: window.StemLab._physics.MODEL_VERSION,
        }, { battleMission: { round: dom.state().battleRound } });
        await new Promise((r) => setTimeout(r, 15));
      });
    }
    expect(dom.state().duelWins).toBe(1);
    expect(dom.state().physicsMastery.duel_victor).toBe(true);
    expect(duelHook.check(dom.state())).toBe(true);
    expect(window.__alloflowPhysics.physicsMastery.duel_victor).toBe(true);

    // Sanity check shallow render mountPhysics works too
    const shallow = mountPhysics({ workspaceTab: 'learn', duelWins: 1 });
    const countNode = find(shallow.tree, (n) => n.props['data-physics-mastery-count']);
    expect(countNode).not.toBeNull();
  });
});
