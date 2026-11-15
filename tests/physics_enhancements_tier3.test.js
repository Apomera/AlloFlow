import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

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

function findAll(node, pred, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const child of node) findAll(child, pred, out);
    return out;
  }
  if (node.props && pred(node)) out.push(node);
  if (node.props && node.props.children) findAll(node.props.children, pred, out);
  return out;
}

function textOf(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  return node.props && node.props.children ? textOf(node.props.children) : '';
}

function mountPhysics(initialPhysics, ctxOverrides = {}) {
  const cfg = loadTool('stem_lab/stem_tool_physics.js', 'physics');
  let state = initialPhysics === null ? {} : { physics: { ...initialPhysics } };
  const setToolData = (arg) => {
    state = typeof arg === 'function' ? arg(state) : arg;
  };
  const awardStemXP = ctxOverrides.awardStemXP || vi.fn();
  const stemCelebrate = ctxOverrides.stemCelebrate || vi.fn();
  const addToast = ctxOverrides.addToast || vi.fn();
  const setStemLabTool = ctxOverrides.setStemLabTool || vi.fn();

  const renderNow = () => cfg.render({
    React,
    toolData: state,
    setToolData,
    labToolData: state,
    setLabToolData: setToolData,
    setToolSnapshots: vi.fn(),
    addToast,
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
    gradeLevel: '6th Grade',
    props: {},
    t: (_k, fb) => fb || _k,
    ...ctxOverrides,
  });

  const wasEmpty = !state.physics;
  let tree = renderNow();
  if (wasEmpty) tree = renderNow();

  return {
    cfg,
    awardStemXP,
    stemCelebrate,
    addToast,
    setStemLabTool,
    get tree() { return tree; },
    rerender() { tree = renderNow(); return tree; },
    state() { return state.physics; },
    allState() { return state; },
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
  const awardStemXP = ctxOverrides.awardStemXP || vi.fn();
  const stemCelebrate = ctxOverrides.stemCelebrate || vi.fn();
  const addToast = ctxOverrides.addToast || vi.fn();

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
      addToast,
      announceToSR: vi.fn(),
      awardXP: awardStemXP,
      awardStemXP,
      stemBeep: vi.fn(),
      celebrate: stemCelebrate,
      stemCelebrate,
      setStemLabTool: vi.fn(),
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
  }

  React.act(() => {
    root.render(React.createElement(Harness));
  });

  return {
    host,
    awardStemXP,
    stemCelebrate,
    state: () => state.physics,
    unmount: () => React.act(() => { root.unmount(); }),
  };
}

describe('Projectile Lab Tier 3 & Polish Enhancements', () => {
  const origGetContext = HTMLCanvasElement.prototype.getContext;
  const origCreateObjectURL = URL.createObjectURL;
  const origRevokeObjectURL = URL.revokeObjectURL;
  const origAnchorClick = HTMLAnchorElement.prototype.click;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    resetStemLab();
    document.body.innerHTML = '';
    HTMLCanvasElement.prototype.getContext = function () {
      return {
        canvas: this,
        save() {}, restore() {}, clearRect() {}, fillRect() {}, strokeRect() {},
        beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {},
        ellipse() {}, quadraticCurveTo() {}, bezierCurveTo() {}, stroke() {}, fill() {},
        fillText() {}, strokeText() {}, setLineDash() {}, translate() {}, scale() {},
        rotate() {}, rect() {}, clip() {},
        measureText: () => ({ width: 42 }),
        createLinearGradient: () => ({ addColorStop() {} }),
        createRadialGradient: () => ({ addColorStop() {} }),
      };
    };
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = origGetContext;
    URL.createObjectURL = origCreateObjectURL;
    URL.revokeObjectURL = origRevokeObjectURL;
    HTMLAnchorElement.prototype.click = origAnchorClick;
  });

  it('supports Challenge toggle-off, Leave Challenge button, baseline restore, and cross-mode mutual exclusion', () => {
    const baseline = {
      angle: 33, velocity: 28, gravity: 1.6, mass: 4, launchHeight: 15, airResist: false,
      workspaceTab: 'missions',
    };
    const app = mountPhysics(baseline);

    // 1. Enter Challenge Tier 3 (Mars gravity 3.7, height 0), then click Leave Challenge to restore baseline
    const challengeBtns = findAll(app.tree, (n) => n.type === 'button' && textOf(n).includes('200m on Mars'));
    expect(challengeBtns.length).toBe(1);
    challengeBtns[0].props.onClick();
    app.rerender();

    expect(app.state().challengeActive).toBe(true);
    expect(app.state().challengeTier).toBe(3);
    expect(app.state().gravity).toBe(3.7);
    expect(app.state().launchHeight).toBe(0);

    const leaveChallengeBtn = find(app.tree, (n) => n.props['data-physics-leave-challenge']);
    expect(leaveChallengeBtn).not.toBeNull();
    leaveChallengeBtn.props.onClick();
    app.rerender();

    expect(app.state().challengeActive).toBe(false);
    expect(app.state().challengeTier).toBe(0);
    expect(app.state().gravity).toBe(1.6);
    expect(app.state().launchHeight).toBe(15);
    expect(app.state().angle).toBe(33);
    expect(find(app.tree, (n) => n.props['data-physics-leave-challenge'])).toBeNull();

    // 2. Active challenge toggles OFF when clicking the same tier button again
    const tier2Btn = find(app.tree, (n) => n.type === 'button' && textOf(n).includes('Tier 2'));
    expect(tier2Btn).not.toBeNull();
    tier2Btn.props.onClick();
    app.rerender();
    expect(app.state().challengeActive).toBe(true);
    expect(app.state().challengeTier).toBe(2);
    expect(app.state().airResist).toBe(true);

    find(app.tree, (n) => n.type === 'button' && textOf(n).includes('Tier 2')).props.onClick();
    app.rerender();
    expect(app.state().challengeActive).toBe(false);
    expect(app.state().airResist).toBe(false);
    expect(app.state().launchHeight).toBe(15);

    // 3. Atomic mutual exclusion: Target -> Challenge -> Obstacle -> Battle -> Target
    const startTargetBtn = find(app.tree, (n) => n.type === 'button' && n.props['aria-label'] === 'Start Mission');
    startTargetBtn.props.onClick();
    app.rerender();
    expect(app.state().targetMode).toBe(true);

    find(app.tree, (n) => n.type === 'button' && textOf(n).includes('200m on Mars')).props.onClick();
    app.rerender();
    expect(app.state().targetMode).toBe(false);
    expect(app.state().challengeActive).toBe(true);
    expect(app.state().challengeTier).toBe(3);

    find(app.tree, (n) => n.props['data-physics-obstacle'] === 'wall').props.onClick();
    app.rerender();
    expect(app.state().challengeActive).toBe(false);
    expect(app.state().obstacleMode).toBe(true);
    expect(app.state().obstacleId).toBe('wall');
    expect(app.state().gravity).toBe(9.8); // Restored pre-challenge baseline 1.6 -> obstacle fixedGravity 9.8

    find(app.tree, (n) => n.props['data-physics-battle-start'] === 'coach').props.onClick();
    app.rerender();
    expect(app.state().obstacleMode).toBe(false);
    expect(app.state().battleMode).toBe(true);

    find(app.tree, (n) => n.type === 'button' && n.props['aria-label'] === 'Start Mission').props.onClick();
    app.rerender();
    expect(app.state().battleMode).toBe(false);
    expect(app.state().targetMode).toBe(true);

    // Ending Target restores true baseline (not intermediate challenge gravity)
    find(app.tree, (n) => n.type === 'button' && n.props['aria-label'] === 'End').props.onClick();
    app.rerender();
    expect(app.state().targetMode).toBe(false);
    expect(app.state().gravity).toBe(1.6);
    expect(app.state().launchHeight).toBe(15);
  });

  it('renders pre-launch Range vs Angle card when showGraphs is open with 0 launches', () => {
    const app = mountPhysics({
      angle: 35, velocity: 25, gravity: 9.8, launchHeight: 0, airResist: false,
      showGraphs: true, showRangeExplorer: false, workspaceTab: 'analyze',
    });

    const card = find(app.tree, (n) => n.props['data-physics-range-card']);
    expect(card).not.toBeNull();
    const svg = find(card, (n) => n.props['data-physics-graph'] === 'range');
    expect(svg).not.toBeNull();
    expect(svg.props['data-air-drag']).toBe('false');
    expect(svg.props['data-optimum-angle']).toBe(45);

    // Enabling air drag before any launch switches the pre-launch curve to drag + dashed vacuum ref
    app.setState({ airResist: true });
    const dragCard = find(app.tree, (n) => n.props['data-physics-range-card']);
    expect(dragCard.props['data-air-drag']).toBe('true');
    expect(find(dragCard, (n) => n.props['data-physics-vacuum-ref'])).not.toBeNull();

    // Still suppresses duplicate when Range Explorer is open
    app.setState({ showRangeExplorer: true });
    expect(find(app.tree, (n) => n.props['data-physics-range-card'])).toBeNull();
  });

  it('wires complete Artillery Duel (coach vs bot and 2P pass & play, HP, difficulty, XP, Leave Duel)', async () => {
    const dom = mountPhysicsDom({
      angle: 45, velocity: 25, gravity: 3.7, launchHeight: 20, airResist: true,
      workspaceTab: 'missions',
    });

    const diffSelect = dom.host.querySelector('[data-physics-battle-difficulty]');
    expect(diffSelect).not.toBeNull();
    React.act(() => {
      diffSelect.value = 'hard';
      diffSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(dom.state().aiDifficulty).toBe('hard');

    // Start Duel vs Bot
    const botBtn = dom.host.querySelector('[data-physics-battle-start="coach"]');
    React.act(() => { botBtn.click(); });
    expect(dom.state().battleMode).toBe(true);
    expect(dom.state().battleType).toBe('coach');
    expect(dom.state().playerHP).toBe(3);
    expect(dom.state().enemyHP).toBe(3);
    expect(dom.state().gravity).toBe(9.8);
    expect(dom.state().launchHeight).toBe(0);
    expect(dom.state().airResist).toBe(false);
    expect(dom.host.querySelector('[data-physics-battle-hud]')).not.toBeNull();

    const cv = dom.host.querySelector('#physicsCanvas');
    expect(typeof cv._onAnyLand).toBe('function');

    const enemyDist = dom.state().enemyDist;
    // Land direct hit on Bot Outpost 3 times
    for (let hit = 1; hit <= 3; hit++) {
      await React.act(async () => {
        dom.host.querySelector('#physicsCanvas')._onAnyLand(enemyDist, {
          n: hit, angle: 45, vel: Math.sqrt(enemyDist * 9.8), grav: 9.8,
          drag: false, mass: 1, launchHeight: 0, range: enemyDist, maxH: enemyDist / 4, time: 4,
          modelVersion: window.StemLab._physics.MODEL_VERSION,
        }, { battleMission: { round: dom.state().battleRound } });
        await new Promise((r) => setTimeout(r, 10));
      });
    }
    expect(dom.state().enemyHP).toBe(0);
    expect(dom.awardStemXP).toHaveBeenCalled();
    expect(dom.stemCelebrate).toHaveBeenCalled();
    expect(dom.host.querySelector('[data-physics-battle-feedback]').textContent).toContain('Victory');

    // Leave duel restores baseline, then start 2P Pass & Play and verify alternating turn transitions
    React.act(() => { dom.host.querySelector('[data-physics-leave-battle]').click(); });
    expect(dom.state().battleMode).toBe(false);
    expect(dom.state().gravity).toBe(3.7);
    expect(dom.state().launchHeight).toBe(20);
    expect(dom.state().airResist).toBe(true);

    React.act(() => { dom.host.querySelector('[data-physics-battle-start="pass"]').click(); });
    expect(dom.state().battleType).toBe('pass');
    expect(dom.state().isPlayerTurn).toBe(true);

    const passDist = dom.state().enemyDist;
    await React.act(async () => {
      dom.host.querySelector('#physicsCanvas')._onAnyLand(passDist, {
        n: 10, angle: 45, vel: 30, grav: 9.8, drag: false, mass: 1, launchHeight: 0,
        range: passDist, maxH: 22, time: 4.3, modelVersion: window.StemLab._physics.MODEL_VERSION,
      }, { battleMission: { round: dom.state().battleRound } });
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(dom.state().enemyHP).toBe(2);
    expect(dom.state().isPlayerTurn).toBe(false);

    dom.unmount();
  });

  it('evaluates 2D Obstacle & Platform Engineering missions purely and enforces mission locks in UI', async () => {
    loadTool('stem_lab/stem_tool_physics.js', 'physics');
    const P = window.StemLab._physics;

    // Wall mission: wall x=50 h=18, target x=85 ±8
    expect(P.evaluateObstacleMission([
      [0, 0, 0], [1, 40, 14], [2, 60, 12], [3, 85, 0],
    ], 'wall')).toMatchObject({ cleared: false, outcome: 'wall-blocked', hitX: 50 });

    expect(P.evaluateObstacleMission([
      [0, 0, 0], [1, 40, 26], [2, 60, 24], [3, 85, 0],
    ], 'wall')).toMatchObject({ cleared: true, outcome: 'hit-target', landX: 85 });

    // Rooftop mission: pad xMin=62..78 y=15
    expect(P.evaluateObstacleMission([
      [0, 0, 0], [1, 50, 10], [2, 70, 8],
    ], 'rooftop')).toMatchObject({ cleared: false, outcome: 'blocked-front', hitX: 62 });

    expect(P.evaluateObstacleMission([
      [0, 0, 0], [1, 45, 28], [2, 66, 20], [3, 72, 12],
    ], 'rooftop')).toMatchObject({ cleared: true, outcome: 'landed-pad', landY: 15 });

    // Cliff & Canyon Drag specs + locks in live DOM
    const dom = mountPhysicsDom({
      angle: 45, velocity: 25, gravity: 3.7, launchHeight: 12, airResist: false,
      workspaceTab: 'missions',
    });

    React.act(() => { dom.host.querySelector('[data-physics-obstacle="canyon_drag"]').click(); });
    expect(dom.state().obstacleMode).toBe(true);
    expect(dom.state().obstacleId).toBe('canyon_drag');
    expect(dom.state().launchHeight).toBe(25);
    expect(dom.state().gravity).toBe(9.8);
    expect(dom.state().airResist).toBe(true);

    expect(dom.host.querySelector('[data-physics-air-drag]').disabled).toBe(true);
    expect(dom.host.querySelector('[data-physics-parameter="launchHeight"]').disabled).toBe(true);
    expect(dom.host.querySelector('[data-physics-parameter="gravity"]').disabled).toBe(true);
    expect(dom.host.querySelector('[data-physics-model-comparison-start]').disabled).toBe(true);
    expect(dom.host.querySelector('[data-object-preset="cannonball"]').disabled).toBe(true);

    // Simulate blocked then cleared canyon_drag landings
    await React.act(async () => {
      const blockedTrail = [{ t: 0, mX: 0, mY: 25, mVx: 20, mVy: 5 }, { t: 2, mX: 50, mY: 12, mVx: 18, mVy: -10 }, { t: 3, mX: 65, mY: 0, mVx: 16, mVy: -18 }];
      blockedTrail.obstacleId = 'canyon_drag';
      dom.host.querySelector('#physicsCanvas')._onAnyLand(65, { n: 1, angle: 15, vel: 21, grav: 9.8, drag: true, mass: 1, launchHeight: 25, range: 65, maxH: 26, time: 3, modelVersion: P.MODEL_VERSION }, blockedTrail);
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(dom.state().obstacleDone.canyon_drag).toBeUndefined();
    expect(dom.host.querySelector('[data-physics-obstacle-feedback]').textContent).toContain('Blocked');

    await React.act(async () => {
      const clearTrail = [{ t: 0, mX: 0, mY: 25, mVx: 18, mVy: 22 }, { t: 1.5, mX: 40, mY: 32, mVx: 16, mVy: 5 }, { t: 2.2, mX: 55, mY: 26, mVx: 15, mVy: -6 }, { t: 3.4, mX: 75, mY: 0, mVx: 14, mVy: -22 }];
      clearTrail.obstacleId = 'canyon_drag';
      dom.host.querySelector('#physicsCanvas')._onAnyLand(75, { n: 2, angle: 50, vel: 28, grav: 9.8, drag: true, mass: 1, launchHeight: 25, range: 75, maxH: 34, time: 3.4, modelVersion: P.MODEL_VERSION }, clearTrail);
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(dom.state().obstacleDone.canyon_drag).toBe(true);
    expect(dom.awardStemXP).toHaveBeenCalled();

    React.act(() => { dom.host.querySelector('[data-physics-leave-obstacle]').click(); });
    expect(dom.state().obstacleMode).toBe(false);
    expect(dom.state().gravity).toBe(3.7);
    expect(dom.state().launchHeight).toBe(12);
    expect(dom.state().airResist).toBe(false);

    dom.unmount();
  });

  it('provides Object Presets and Aerodynamic Drag Profiles Explorer without altering canonical PHYS_DRAG_K', () => {
    const app = mountPhysics({ angle: 45, velocity: 25, gravity: 9.8, mass: 1, airResist: false, workspaceTab: 'analyze' });
    const P = window.StemLab._physics;

    expect(P.DRAG_K).toBe(0.004);

    // Object preset switches mass [1..10] and enables air drag
    const presetButtons = findAll(app.tree, (n) => n.props['data-object-preset']);
    expect(presetButtons.map((b) => b.props['data-object-preset'])).toEqual(['foam', 'medicine', 'shotput', 'cannonball']);
    find(app.tree, (n) => n.props['data-object-preset'] === 'shotput').props.onClick();
    app.rerender();
    expect(app.state().mass).toBe(7);
    expect(app.state().airResist).toBe(true);

    // Real-world drag profile physics ordering
    const shuttle = P.simulateDragProfile('shuttlecock', 45, 25, 9.8, 0);
    const ping = P.simulateDragProfile('pingpong', 45, 25, 9.8, 0);
    const baseball = P.simulateDragProfile('baseball', 45, 25, 9.8, 0);
    const cannon = P.simulateDragProfile('iron_cannonball', 45, 25, 9.8, 0);

    for (const r of [shuttle, ping, baseball, cannon]) {
      expect(r.status).toBe('landed');
      expect(r.terminalVelocity).toBeGreaterThan(0);
      expect(r.range).toBeLessThan(r.vacuumRange);
    }
    expect(shuttle.rangeLossPct).toBeGreaterThan(baseball.rangeLossPct);
    expect(ping.rangeLossPct).toBeGreaterThan(baseball.rangeLossPct);
    expect(baseball.rangeLossPct).toBeGreaterThan(cannon.rangeLossPct);

    // Explorer UI panel renders all 4 profiles and updates dragProfileId
    const dragPanel = find(app.tree, (n) => n.props['data-physics-learning-panel'] === 'drag-profiles');
    expect(dragPanel).not.toBeNull();
    const profileCards = findAll(dragPanel, (n) => n.props['data-physics-drag-profile']);
    expect(profileCards.map((c) => c.props['data-physics-drag-profile'])).toEqual(['shuttlecock', 'pingpong', 'baseball', 'iron_cannonball']);
    find(dragPanel, (n) => n.props['data-physics-drag-profile'] === 'shuttlecock').props.onClick();
    app.rerender();
    expect(app.state().dragProfileId).toBe('shuttlecock');
  });

  it('supports direct CSV downloads and Data Studio scatter/trendline handoff', () => {
    const downloads = [];
    URL.createObjectURL = vi.fn(() => 'blob:mock-csv');
    URL.revokeObjectURL = vi.fn();
    HTMLAnchorElement.prototype.click = function () {
      downloads.push({ download: this.download, href: this.href });
    };

    const cv = document.createElement('canvas');
    cv.id = 'physicsCanvas';
    cv._trails = [[{ t: 0, mX: 0, mY: 0, mVx: 17.6, mVy: 17.6 }, { t: 3.6, mX: 63.7, mY: 0, mVx: 17.6, mVy: -17.6 }]];
    document.body.appendChild(cv);

    const app = mountPhysics({
      workspaceTab: 'all',
      showFlightData: true,
      runLog: [
        { n: 1, angle: 30, vel: 25, grav: 9.8, drag: false, mass: 1, launchHeight: 0, range: 55.2, maxH: 7.9, time: 2.55, modelVersion: 'projectile-v3' },
        { n: 2, angle: 45, vel: 25, grav: 9.8, drag: false, mass: 1, launchHeight: 0, range: 63.8, maxH: 15.9, time: 3.61, modelVersion: 'projectile-v3' },
      ],
    });

    const flightDlBtn = find(app.tree, (n) => n.props['data-physics-download-flight-csv']);
    expect(flightDlBtn).not.toBeNull();
    flightDlBtn.props.onClick();

    const runLogDlBtn = find(app.tree, (n) => n.props['data-physics-download-runlog-csv']);
    expect(runLogDlBtn).not.toBeNull();
    runLogDlBtn.props.onClick();

    expect(downloads.map((d) => d.download)).toEqual([
      'projectile-flight-data.csv',
      'projectile-experiment-log.csv',
    ]);

    const handoffBtn = find(app.tree, (n) => n.props['data-physics-handoff-datastudio']);
    expect(handoffBtn).not.toBeNull();
    handoffBtn.props.onClick();

    expect(app.allState()._dataStudio).toMatchObject({
      studioMode: 'graph',
      chartType: 'scatter',
      dataSource: 'physics-runlog',
      showStats: true,
      showTrendline: true,
      dataRows: [
        { label: 'Run 1', x: 30, value: 55.2 },
        { label: 'Run 2', x: 45, value: 63.8 },
      ],
    });
    expect(app.setStemLabTool).toHaveBeenCalledWith('dataStudio');
  });

  it('syncs hostile-fuzzer d.tab with d.workspaceTab and clears stale tab via updTab', () => {
    for (const [tabId, expectedAttr] of [
      ['missions', 'mission'],
      ['analyze', 'drag-profiles'],
      ['learn', 'quiz'],
    ]) {
      resetStemLab();
      const app = mountPhysics({ tab: tabId });
      expect(window.StemLab._physics.normalizeState({ tab: tabId }).workspaceTab).toBe(tabId);
      expect(find(app.tree, (n) => n.props['data-physics-learning-panel'] === expectedAttr)).not.toBeNull();
    }

    resetStemLab();
    const notebookApp = mountPhysics({ tab: 'notebook' });
    expect(window.StemLab._physics.normalizeState({ tab: 'notebook' }).workspaceTab).toBe('notebook');
    expect(find(notebookApp.tree, (n) => n.props['data-physics-investigations'])).not.toBeNull();

    // Clicking a workspace tab updates workspaceTab and clears transient tab key
    const analyzeTabBtn = find(notebookApp.tree, (n) => n.props['data-physics-workspace-tab'] === 'analyze');
    analyzeTabBtn.props.onClick();
    notebookApp.rerender();
    expect(notebookApp.state().workspaceTab).toBe('analyze');
    expect(notebookApp.state().tab).toBeUndefined();
  });
});
