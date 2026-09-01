import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { resetStemLab, loadTool, renderTool, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
import { runIsolatedAxe } from './helpers/isolated_axe_harness.js';

const require = createRequire(import.meta.url);
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const TOOL_PATH = resolve(process.cwd(), 'stem_lab/stem_tool_magnetism.js');
const physics = require(TOOL_PATH);

function forceSeed(extra = {}) {
  return Object.assign({
    tab: 'field', fieldView: '2d', learningMode: 'guided',
    pairDistance: 70, pairStrength1: 1, pairStrength2: 1, pairAttract: true,
    forceBenchBaseline: null, forceBenchPrediction: null, forceBenchResultSeen: false,
    forceBenchChallengeRuns: 0, forceBenchUsed: false, notebookOpen: false,
  }, extra);
}

function mountInteractive(cfg, seed, callbacks = {}) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  function Harness() {
    const [toolData, setToolData] = React.useState({ magnetism: seed });
    return cfg.render({
      React, toolData, setToolData,
      addToast: callbacks.addToast || (() => {}),
      announceToSR: callbacks.announceToSR || (() => {}),
      awardXP: callbacks.awardXP || (() => {}),
      callGemini: null, aiHintsEnabled: false, gradeLevel: '7th Grade', t: (key, fallback) => fallback || key,
    });
  }
  act(() => { root.render(React.createElement(Harness)); });
  return {
    host,
    close() {
      try { act(() => root.unmount()); } catch (_) {}
      host.remove();
    },
  };
}

function withForceHost(seed, callback) {
  resetStemLab();
  loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
  const html = renderTool('magnetism', { magnetism: forceSeed(seed) });
  const host = document.createElement('main');
  host.innerHTML = html;
  document.body.appendChild(host);
  try {
    return callback(host, html);
  } finally {
    host.remove();
  }
}

describe('magnetism Force Bench distance detective', () => {
  it('derives a defensive three-step comparison from the existing inverse-fourth-power force law', () => {
    expect(physics.FORCE_BENCH_PREDICTIONS.map((option) => option.factor)).toEqual([2, 4, 8, 16]);

    const initial = physics.forceBenchEvidenceState('bad', 99, 999, false, { distance: 100, strength1: 'bad', strength2: 1 }, '16', true);
    expect(initial).toMatchObject({
      strength1: 1, strength2: 3, distance: 140, direction: 'repulsion',
      baseline: null, phase: 'setup', completedCount: 0, currentIndex: 0,
    });
    expect(Number.isFinite(initial.force)).toBe(true);

    const baseline = { distance: 60, strength1: 2, strength2: 1.5 };
    const ready = physics.forceBenchEvidenceState(2, 1.5, 60, true, baseline, 16, false);
    expect(ready).toMatchObject({ phase: 'ready', completedCount: 2, resultCaptured: false });
    expect(ready.baseline.force).toBeCloseTo(3, 8);
    expect(ready.baseline.targetDistance).toBe(120);
    expect(ready.baseline.targetForce).toBeCloseTo(0.1875, 8);
    expect(ready.observedWeakerFactor).toBeCloseTo(16, 8);

    const matched = physics.forceBenchEvidenceState(2, 1.5, 120, true, baseline, 16, true);
    const differed = physics.forceBenchEvidenceState(2, 1.5, 120, false, baseline, 4, true);
    expect(matched).toMatchObject({ phase: 'matched', predictionCorrect: true, estimateMatched: true, complete: true, completedCount: 3 });
    expect(differed).toMatchObject({ phase: 'different', predictionCorrect: false, estimateMatched: false, direction: 'repulsion', complete: true });
    expect(differed.force).toBeCloseTo(matched.force, 10);
    expect(differed.predictions.find((option) => option.factor === 16).state).toBe('model');
    expect(differed.predictions.find((option) => option.factor === 4).state).toBe('different');
  });

  it('carries controlled gap, strength, baseline, and doubled-gap evidence into the notebook', () => {
    const state = forceSeed({
      pairDistance: 120, pairStrength1: 1, pairStrength2: 1,
      forceBenchBaseline: { distance: 60, strength1: 1, strength2: 1 },
      forceBenchPrediction: 16, forceBenchResultSeen: true, notebookOpen: true, labShellPanel: 'evidence',
    });
    const metrics = physics.notebookMetricSnapshot({ magnetism: state });
    expect(metrics.find((metric) => metric.key === 'force_rel')).toMatchObject({ value: 0.0625, unit: 'relative' });
    expect(metrics.find((metric) => metric.key === 'force_gap')).toMatchObject({ value: 120, unit: 'distance units' });
    expect(metrics.find((metric) => metric.key === 'force_strength_product')).toMatchObject({ value: 1, unit: '×' });
    expect(metrics.find((metric) => metric.key === 'force_baseline')).toMatchObject({ value: 1, unit: 'relative' });
    expect(metrics.find((metric) => metric.key === 'force_doubled_gap')).toMatchObject({ value: 120 });
    expect(metrics.find((metric) => metric.key === 'force_drop_factor')).toMatchObject({ value: 16, unit: '× weaker' });

    withForceHost(state, (_host, html) => {
      expect(html).toContain('controlled baseline 60 → doubled gap 120');
      expect(html).toContain('observed 16× weaker');
      expect(html).toContain('ungraded estimate 16× matched the evidence');
    });
  });

  it('renders a scannable evidence trail, prediction deck, live HUD, comparison, and labeled graph', () => {
    withForceHost({ pairDistance: 60, forceBenchBaseline: { distance: 60, strength1: 1, strength2: 1 } }, (host) => {
      expect(host.querySelector('.mag-force-challenge').getAttribute('data-phase')).toBe('predict');
      expect(host.querySelectorAll('.mag-force-step')).toHaveLength(3);
      expect(host.querySelectorAll('.mag-force-step[data-state="done"]')).toHaveLength(1);
      expect(host.querySelectorAll('.mag-force-step[data-state="current"]')).toHaveLength(1);
      expect(host.querySelector('.mag-force-progress').value).toBe(1);
      expect(host.querySelectorAll('.mag-force-prediction')).toHaveLength(4);
      expect(host.querySelectorAll('.mag-force-metric')).toHaveLength(3);
      expect(host.querySelector('[data-metric="comparison"]')).toBeNull();
      expect(host.querySelectorAll('.mag-force-reading')).toHaveLength(2);
      expect(host.querySelector('.mag-force-bridge').textContent).toContain('force ÷ ?');
      expect(host.querySelector('.mag-force-figure svg').getAttribute('aria-label')).toContain('Arrow length and thickness show force magnitude');
      expect(host.querySelector('.mag-force-figure polyline')).toBeNull();
      expect(host.querySelectorAll('.mag-force-legend span')).toHaveLength(2);
      const lockedGap = [...host.querySelectorAll('input[type="range"]')]
        .find((input) => input.getAttribute('aria-valuetext')?.startsWith('Gap between magnets'));
      expect(lockedGap).toBeTruthy();
      expect(lockedGap.disabled).toBe(true);
      expect(host.querySelector('.mag-force-controls').open).toBe(true);
      expect(host.querySelector('[data-magnetism-estimation-inquiry="true"]')).toBeTruthy();
      expect(host.textContent).toContain('Make an ungraded estimate');
      expect(host.textContent).toContain('60-unit baseline');
      expect(host.textContent).not.toContain('fourth power');
      expect(host.textContent).not.toContain('inverse-fourth-power');
      expect(host.textContent).not.toContain('2⁴ = 16');
    });
  });

  it('guides a live 60-to-120 run from an ungraded estimate to revealed evidence', () => {
    resetStemLab();
    const cfg = loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const announcements = [];
    const live = mountInteractive(cfg, forceSeed(), { announceToSR: (message) => announcements.push(message) });
    const click = (element) => act(() => { element.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    try {
      click(live.host.querySelector('.mag-force-next button'));
      expect(live.host.querySelector('.mag-force-challenge').getAttribute('data-phase')).toBe('predict');
      expect(live.host.querySelector('.mag-force-progress').value).toBe(1);
      expect(live.host.querySelectorAll('.mag-force-prediction')).toHaveLength(4);
      expect(live.host.querySelectorAll('.mag-force-metric b')[0].textContent).toBe('60');

      const predicted16 = [...live.host.querySelectorAll('.mag-force-prediction')].find((button) => button.textContent.includes('16× weaker'));
      click(predicted16);
      expect(live.host.querySelector('.mag-force-challenge').getAttribute('data-phase')).toBe('ready');
      expect(live.host.querySelector('.mag-force-prediction[data-state="selected"]')).toBe(predicted16);
      expect(live.host.querySelector('.mag-force-progress').value).toBe(2);

      click(live.host.querySelector('.mag-force-next button'));
      expect(live.host.querySelector('.mag-force-challenge').getAttribute('data-phase')).toBe('matched');
      expect(live.host.querySelector('.mag-force-progress').value).toBe(3);
      expect(live.host.querySelector('.mag-force-verdict').getAttribute('data-result')).toBe('matched');
      expect(live.host.querySelector('.mag-force-prediction[data-state="model"]')).toBeTruthy();
      expect(live.host.querySelector('.mag-force-bridge').textContent).toContain('force ÷16');
      expect(live.host.querySelector('.mag-force-reading[data-reading="test"] strong').textContent).toBe('0.0625 force');
      expect(live.host.querySelectorAll('.mag-force-metric b')[0].textContent).toBe('120');
      expect(live.host.querySelector('.mag-force-figure polyline')).toBeTruthy();
      expect(live.host.querySelectorAll('.mag-force-legend span')).toHaveLength(3);
      expect(live.host.querySelector('[data-metric="comparison"] b').textContent).toContain('16.0× weaker');
      const revealedGap = [...live.host.querySelectorAll('input[type="range"]')]
        .find((input) => input.getAttribute('aria-valuetext')?.startsWith('Gap between magnets'));
      expect(revealedGap).toBeTruthy();
      expect(revealedGap.disabled).toBe(false);
      expect(live.host.textContent).toContain('2⁴ = 16× weaker force');
      expect(live.host.textContent).toContain('Completion counts the controlled comparison');
      expect(announcements.filter((message) => message.includes('Doubled-gap result captured'))).toHaveLength(1);
      expect(announcements.at(-1)).toContain('evidence matched your estimate');
    } finally {
      live.close();
    }
  });

  it('treats a differing estimate as useful evidence and resets cleanly for another direction', () => {
    resetStemLab();
    const cfg = loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const live = mountInteractive(cfg, forceSeed());
    const click = (element) => act(() => { element.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    try {
      click(live.host.querySelector('.mag-force-next button'));
      const predicted4 = [...live.host.querySelectorAll('.mag-force-prediction')].find((button) => button.textContent.includes('4× weaker'));
      click(predicted4);
      click(live.host.querySelector('.mag-force-next button'));

      expect(live.host.querySelector('.mag-force-challenge').getAttribute('data-phase')).toBe('different');
      expect(live.host.querySelector('.mag-force-verdict').getAttribute('data-result')).toBe('different');
      expect(live.host.querySelector('.mag-force-prediction[data-state="different"]').textContent).toContain('4× weaker');
      expect(live.host.querySelector('.mag-force-prediction[data-state="model"]').textContent).toContain('16× weaker');
      expect(live.host.textContent).toContain('Evidence differed from your estimate');
      expect(live.host.textContent).toContain('Completion counts the controlled comparison');

      click(live.host.querySelector('.mag-force-next button'));
      expect(live.host.querySelector('.mag-force-challenge').getAttribute('data-phase')).toBe('setup');
      expect(live.host.querySelector('.mag-force-progress').value).toBe(0);
      expect(live.host.querySelectorAll('.mag-force-prediction')).toHaveLength(0);
      expect(live.host.querySelectorAll('.mag-force-metric b')[0].textContent).toBe('60');

      const repel = [...live.host.querySelectorAll('.mag-force-direction button')].find((button) => button.textContent.includes('Repel'));
      click(repel);
      expect(repel.getAttribute('aria-pressed')).toBe('true');
      expect(live.host.querySelectorAll('.mag-force-metric')[2].textContent).toContain('repulsion');
    } finally {
      live.close();
    }
  });

  it('keeps the challenge responsive, motion-safe, and free of automated WCAG violations', async () => {
    const source = readFileSync(TOOL_PATH, 'utf8');
    expect(source).toContain('.mag-force-prediction-grid{grid-template-columns:1fr}');
    expect(source).toContain('.mag-force-hud{grid-template-columns:repeat(2,minmax(0,1fr))}');
    expect(source).toContain('.mag-force-comparison{grid-template-columns:1fr}');
    expect(source).toContain('@keyframes mag-force-current');
    expect(source).toContain('@keyframes mag-force-point');
    expect(source).toContain('@media(prefers-reduced-motion:reduce)');

    const html = renderTool('magnetism', { magnetism: forceSeed({
      pairDistance: 120, pairStrength1: 2, pairStrength2: 1.5, pairAttract: false,
      forceBenchBaseline: { distance: 60, strength1: 2, strength2: 1.5 },
      forceBenchPrediction: 4, forceBenchResultSeen: true,
    }) });
    const host = document.createElement('main');
    host.innerHTML = html;
    document.body.appendChild(host);
    try {
      const results = await runIsolatedAxe(host.querySelector('.mag-force-challenge').outerHTML);
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    } finally {
      host.remove();
    }
  }, 15000);
});
