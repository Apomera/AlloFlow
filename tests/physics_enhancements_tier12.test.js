import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { React, loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const root = process.cwd();

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
  const renderNow = () => cfg.render({
    React,
    toolData: state,
    setToolData,
    setToolSnapshots: vi.fn(),
    addToast: vi.fn(),
    announceToSR: vi.fn(),
    awardXP: vi.fn(),
    awardStemXP: vi.fn(),
    stemBeep: vi.fn(),
    stemCelebrate: vi.fn(),
    canvasNarrate: vi.fn(),
    canvasA11yDesc: vi.fn(),
    srOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden' },
    a11yClick: (fn) => ({ onClick: fn, role: 'button', tabIndex: 0 }),
    icons: new Proxy({}, { get: () => () => React.createElement('span') }),
    gradeLevel: '5th Grade',
    props: {},
    t: (k, fb) => fb || k,
    ...ctxOverrides,
  });

  // Settle initial placeholder pass if starting completely empty
  const wasEmpty = !state.physics;
  let tree = renderNow();
  if (wasEmpty) tree = renderNow();
  return {
    cfg,
    get tree() { return tree; },
    rerender() { tree = renderNow(); return tree; },
    state() { return state.physics; },
    setState(patch) {
      state = { physics: { ...(state.physics || {}), ...patch } };
      tree = renderNow();
      return tree;
    },
  };
}

describe('Projectile Lab Tier 1 + Tier 2 Enhancements', () => {
  beforeEach(() => {
    resetStemLab();
    document.body.innerHTML = '';
  });

  it('fixes tutorial steps (no phantom wind, documents Shift+Arrow & workspace tabs) and registers catalog aliases', () => {
    const modSrc = fs.readFileSync(path.join(root, 'stem_lab/stem_lab_module.js'), 'utf8');
    const tutMatch = modSrc.match(/var _tutPhysics = \[[\s\S]*?\];/);
    expect(tutMatch).not.toBeNull();
    const tutBlock = tutMatch[0];
    expect(tutBlock).not.toMatch(/\bwind\b/i);
    expect(tutBlock).toContain('Shift+Arrow');
    expect(tutBlock).toContain('workspace tabs');
    expect(tutBlock).toContain("t('stem.physics.tut_step_1')");

    const catMatch = modSrc.match(/\/\/ @tool physics[\s\S]*?ready: true/);
    expect(catMatch).not.toBeNull();
    expect(catMatch[0]).toContain("aliases: ['Projectile Lab'");
    expect(catMatch[0]).toContain('ballistics');

    const cfg = loadTool('stem_lab/stem_tool_physics.js', 'physics');
    expect(cfg.desc).toContain("Newton's laws");
  });

  it('locks gravity slider and presets in real Target Destruction rounds with fixedGravity while keeping synthetic constraints backward compatible', () => {
    const app = mountPhysics({ angle: 45, velocity: 25, gravity: 9.8, workspaceTab: 'missions' });
    const startBtn = find(app.tree, (n) => n.type === 'button' && n.props['aria-label'] === 'Start Mission');
    expect(startBtn).not.toBeNull();
    startBtn.props.onClick();
    app.rerender();
    expect(app.state().targetConstraint).toMatchObject({ type: 'fixedAngle', value: 45, fixedGravity: 9.8 });

    // Round 5 Moon round locks gravity at 1.6 m/s^2
    app.setState({
      targetMode: true,
      targetRound: 5,
      gravity: 1.6,
      targetList: [{ x: 100, y: 0, radius: 12, destroyed: false, id: 0 }],
      targetConstraint: { type: 'fixedAngle', value: 55, fixedGravity: 1.6 },
    });

    const gravSlider = find(app.tree, (n) => n.props['data-physics-parameter'] === 'gravity');
    expect(gravSlider.props.disabled).toBe(true);
    const presets = findAll(app.tree, (n) => n.props['data-gravity-preset'] != null);
    expect(presets.length).toBeGreaterThanOrEqual(4);
    for (const p of presets) expect(p.props.disabled).toBe(true);

    // Attempted tampering with gravity while fixedGravity is set is normalized back to 1.6
    const normalized = window.StemLab._physics.normalizeState({
      targetMode: true,
      targetRound: 5,
      gravity: 24.8,
      targetConstraint: { type: 'fixedAngle', value: 55, fixedGravity: 1.6 },
    });
    expect(normalized.gravity).toBe(1.6);

    // Backward compatibility: omitted fixedGravity preserves synthetic gravity (physics_saved_records contract)
    const legacy = mountPhysics({
      targetMode: true,
      gravity: 3.7,
      targetConstraint: { type: 'fixedAngle', value: 45 },
    });
    expect(legacy.state().gravity).toBe(3.7);
    const legacySlider = find(legacy.tree, (n) => n.props['data-physics-parameter'] === 'gravity');
    expect(legacySlider.props.disabled).toBe(false);
  });

  it('supports Shift+Arrow fine stepping (±1) alongside plain Arrow (±5) on canvas', () => {
    const app = mountPhysics({ angle: 45, velocity: 25, gravity: 9.8 });
    const cv = find(app.tree, (n) => n.props.id === 'physicsCanvas');
    expect(cv).not.toBeNull();
    const ev = (key, shiftKey = false) => ({ key, shiftKey, preventDefault: vi.fn() });

    cv.props.onKeyDown(ev('ArrowUp', true));
    expect(app.state().angle).toBe(46);

    app.rerender();
    find(app.tree, (n) => n.props.id === 'physicsCanvas').props.onKeyDown(ev('ArrowLeft', true));
    expect(app.state().velocity).toBe(24);

    app.rerender();
    find(app.tree, (n) => n.props.id === 'physicsCanvas').props.onKeyDown(ev('ArrowRight', false));
    expect(app.state().velocity).toBe(29);
  });

  it('wires ctx.gradeBand, manual userBand override, clean saveSnapshot, and callTTS/stopTTS read-aloud', async () => {
    const saveSnapshot = vi.fn();
    const stopTTS = vi.fn();
    const callTTS = vi.fn(() => new Promise(() => {}));
    const app = mountPhysics(
      { angle: 45, velocity: 25, workspaceTab: 'learn', showLearn: true, speakingId: null, liveTick: 9 },
      { gradeBand: 'g912', gradeLevel: '', saveSnapshot, callTTS, stopTTS },
    );

    // g912 shows 9-12 air resistance concept without userBand override
    expect(textOf(app.tree)).toContain('Air Resistance');

    // Manual override to 3-5 hides 9-12 card
    const band35Btn = find(app.tree, (n) => n.props['data-physics-band-btn'] === '3-5');
    band35Btn.props.onClick();
    app.rerender();
    expect(app.state().userBand).toBe('3-5');
    expect(textOf(app.tree)).not.toContain('Air Resistance');

    // Snapshot delegates to saveSnapshot and strips transient UI fields
    const snapBtn = find(app.tree, (n) => n.props['data-physics-snapshot']);
    snapBtn.props.onClick();
    expect(saveSnapshot).toHaveBeenCalledTimes(1);
    const [toolId, label, savedData] = saveSnapshot.mock.calls[0];
    expect(toolId).toBe('physics');
    expect(label).toContain('45°');
    expect(savedData).not.toHaveProperty('liveTick');
    expect(savedData).not.toHaveProperty('speakingId');

    // Read-aloud button toggles callTTS and stopTTS
    const ttsBtn = find(app.tree, (n) => n.props['data-physics-tts'] === 'learn-panel');
    expect(ttsBtn).not.toBeNull();
    expect(ttsBtn.props.style.minHeight).toBeGreaterThanOrEqual(44);
    ttsBtn.props.onClick();
    expect(stopTTS).toHaveBeenCalledTimes(1);
    expect(callTTS).toHaveBeenCalledTimes(1);
    expect(app.state().speakingId).toBe('learn-panel');

    app.rerender();
    find(app.tree, (n) => n.props['data-physics-tts'] === 'learn-panel').props.onClick();
    expect(stopTTS).toHaveBeenCalledTimes(2);
    expect(app.state().speakingId).toBeNull();
  });

  it('defaults fresh sessions to missions workspace tab, keeps normalizeState partial compatibility, and auto-switches tabs on view cards', () => {
    const fresh = mountPhysics(null);
    expect(fresh.state().workspaceTab).toBe('missions');
    expect(find(fresh.tree, (n) => n.props['data-physics-learning-panel'] === 'mission')).not.toBeNull();
    expect(find(fresh.tree, (n) => n.props['data-physics-learning-panel'] === 'quiz')).toBeNull();

    // Normalized partial object without workspaceTab defaults to 'all'
    expect(window.StemLab._physics.normalizeState({ angle: 40 }).workspaceTab).toBe('all');

    // Clicking Physics guide view card while in 'missions' enables showLearn and switches tab to 'learn'
    const guideCard = find(fresh.tree, (n) => n.props['data-physics-view'] === 'guide');
    guideCard.props.onClick();
    fresh.rerender();
    expect(fresh.state().showLearn).toBe(true);
    expect(fresh.state().workspaceTab).toBe('learn');
    expect(find(fresh.tree, (n) => n.props['data-physics-learning-panel'] === 'quiz')).not.toBeNull();
  });

  it('makes Range vs Angle card drag-aware, hides duplicate when Range Explorer is open, and syncs Equations & Discovery widgets', () => {
    const cv = document.createElement('canvas');
    cv.id = 'physicsCanvas';
    const trail = [{ t: 0, mX: 0, mY: 0, mVx: 30, mVy: 25 }, { t: 4.1, mX: 98, mY: 0, mVx: 18, mVy: -20 }];
    trail.drag = true;
    cv._trails = [trail];
    document.body.appendChild(cv);
    const app = mountPhysics({ angle: 40, velocity: 40, gravity: 9.8, mass: 1, airResist: true, showGraphs: true, workspaceTab: 'analyze' });
    const rangeCard = find(app.tree, (n) => n.props['data-physics-range-card']);
    expect(rangeCard).not.toBeNull();
    expect(rangeCard.props['data-air-drag']).toBe('true');
    const svg = find(rangeCard, (n) => n.props['data-physics-graph'] === 'range');
    expect(svg.props['data-air-drag']).toBe('true');
    expect(svg.props['data-optimum-angle']).toBeLessThan(45);
    expect(find(rangeCard, (n) => n.props['data-physics-vacuum-ref'])).not.toBeNull();

    // Consolidates duplicate chart when showRangeExplorer is open
    app.setState({ showRangeExplorer: true, workspaceTab: 'all' });
    expect(find(app.tree, (n) => n.props['data-physics-range-explorer'])).not.toBeNull();
    expect(find(app.tree, (n) => n.props['data-physics-range-card'])).toBeNull();

    // Equations step-by-step numbers toggle syncs showFormulas
    const workBtn = find(app.tree, (n) => n.props['data-physics-toggle-work']);
    expect(workBtn).not.toBeNull();
    workBtn.props.onClick();
    app.rerender();
    expect(app.state().showFormulas).toBe(true);
    expect(find(app.tree, (n) => n.props['data-physics-formulas'])).not.toBeNull();

    // H7b'' Sync from launcher copies current launcher settings
    app.setState({ angle: 62, velocity: 33, gravity: 3.7, workspaceTab: 'notebook' });
    const syncBtn = find(app.tree, (n) => n.props['data-physics-sync-inquiry']);
    expect(syncBtn).not.toBeNull();
    syncBtn.props.onClick();
    expect(app.state().gravityHunt).toMatchObject({ angle: 62, velocity: 33, gravity: 3.7 });
  });

  it('supports grade-banded multi-concept Quiz with topic filter, getHint/formula fallback, and Load in Simulator', async () => {
    const getHint = vi.fn(async () => 'Check the vertical initial speed vy0 = v sin(theta).');
    const app = mountPhysics(
      { angle: 45, velocity: 25, workspaceTab: 'learn', quizTopic: 'height' },
      { gradeBand: 'g68', aiHintsEnabled: true, getHint },
    );

    // Generate height question
    find(app.tree, (n) => n.props['data-physics-quiz-start']).props.onClick();
    app.rerender();
    expect(app.state().quizActive).toBe(true);
    expect(app.state().quizItem.type).toBe('height');
    expect(app.state().quizItem.options.length).toBe(4);
    expect(textOf(find(app.tree, (n) => n.props['data-physics-quiz-prompt']))).toContain('maximum height');

    // Click Hint button (uses host getHint when enabled)
    find(app.tree, (n) => n.props['data-physics-quiz-hint']).props.onClick();
    await Promise.resolve();
    await Promise.resolve();
    app.rerender();
    expect(getHint).toHaveBeenCalledTimes(1);
    expect(app.state().quizHint).toContain('vy0');
    expect(textOf(find(app.tree, (n) => n.props['data-physics-quiz-hint-text']))).toContain('vy0');

    // Load in Simulator applies scenario settings
    const preset = app.state().quizItem.simPreset;
    find(app.tree, (n) => n.props['data-physics-quiz-load']).props.onClick();
    expect(app.state().angle).toBe(preset.angle);
    expect(app.state().velocity).toBe(preset.velocity);
    expect(app.state().gravity).toBe(preset.gravity);

    // Verify conceptual topic + fallback formula hint when getHint is absent
    const offline = mountPhysics({ workspaceTab: 'learn', quizTopic: 'conceptual' }, { gradeBand: 'g912' });
    find(offline.tree, (n) => n.props['data-physics-quiz-start']).props.onClick();
    offline.rerender();
    expect(offline.state().quizItem.type).toBe('conceptual');
    find(offline.tree, (n) => n.props['data-physics-quiz-hint']).props.onClick();
    offline.rerender();
    expect(offline.state().quizHint).toContain(offline.state().quizItem.formula);
  });
});
