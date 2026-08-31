import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { resetStemLab, loadTool, renderTool, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const axe = require(resolve(MODULES_DIR, 'axe-core'));
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const TOOL_PATH = resolve(process.cwd(), 'stem_lab/stem_tool_magnetism.js');
const physics = require(TOOL_PATH);

function readingsFor(target, points) {
  return points.map(([x, y], index) => {
    const reading = physics.fieldProbeReading(x, y, [target], 0);
    return { id: index + 1, x, y, bx: reading.bx, by: reading.by, magnitude: reading.magnitude };
  });
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

describe('magnetism inverse magnetometer investigation', () => {
  it('exposes independent, cyclic hidden-source presets', () => {
    const first = physics.fieldHuntTarget(0);
    const wrapped = physics.fieldHuntTarget(physics.FIELD_HUNT_ROUNDS.length);
    expect(wrapped).toEqual(first);
    wrapped.x = 999;
    expect(physics.fieldHuntTarget(0).x).toBe(first.x);
    expect(physics.FIELD_HUNT_ROUNDS.length).toBeGreaterThanOrEqual(3);
  });

  it('recovers each preset from spatial vector evidence', () => {
    const pointSets = [
      [[100, 0], [60, -20], [20, 0], [-20, 80]],
      [[120, 20], [0, 0], [100, -80], [-80, 60]],
      [[110, 0], [-60, -50], [0, 90], [100, 80]],
    ];

    physics.FIELD_HUNT_ROUNDS.forEach((round, index) => {
      const target = physics.fieldHuntTarget(index);
      const fit = physics.fieldHuntEstimate(readingsFor(target, pointSets[index]));
      expect(fit.count).toBe(4);
      expect(fit.x).toBe(target.x);
      expect(fit.y).toBe(target.y);
      expect(fit.error).toBeLessThan(1e-8);
      expect(fit.confidence).toBeGreaterThan(0.99);
      expect(physics.fieldHuntEvaluation(target, target, fit)).toMatchObject({
        readingCount: 4,
        hasUsableFit: true,
        solved: true,
      });
    });
  });

  it('rejects unusable evidence without producing NaN coordinates', () => {
    const fit = physics.fieldHuntEstimate([
      { x: 1, y: 2, bx: 0, by: 0 },
      { x: 'not-a-number', y: 2, bx: 1, by: 1 },
      null,
    ]);
    expect(fit).toMatchObject({ count: 1, x: null, y: null, error: null, confidence: 0 });
    expect(physics.fieldHuntEvaluation({ x: 0, y: 0 }, physics.fieldHuntTarget(0), fit).solved).toBe(false);
    expect(physics.fieldHuntEstimate({})).toMatchObject({ count: 0, x: null, error: null, confidence: 0 });
    expect(physics.fieldHuntEvaluation({ x: 0, y: 0 }, physics.fieldHuntTarget(0), { count: 3, error: null }).hasUsableFit).toBe(false);
  });

  it('keeps the estimate separate from the model-assisted fit', () => {
    const target = physics.fieldHuntTarget(1);
    const fit = physics.fieldHuntEstimate(readingsFor(target, [[120, 20], [0, 0], [100, -80], [-80, 60]]));
    const near = physics.fieldHuntEvaluation({ x: target.x + 29, y: target.y }, target, fit);
    const far = physics.fieldHuntEvaluation({ x: target.x + 30.1, y: target.y }, target, fit);
    expect(near.solved).toBe(true);
    expect(far.solved).toBe(false);
    expect(far.hasUsableFit).toBe(true);
  });

  it('scores survey geometry and blocks a precise-looking clustered claim', () => {
    const broad = physics.fieldHuntSurveyQuality([{ x: 100, y: 0 }, { x: 20, y: 0 }, { x: 0, y: 80 }, { x: -20, y: -40 }]);
    const clustered = physics.fieldHuntSurveyQuality([{ x: 10, y: 10 }, { x: 20, y: 20 }, { x: 30, y: 30 }, { x: 30, y: 30 }]);
    expect(broad).toMatchObject({ uniqueCount: 4, ready: true });
    expect(broad.score).toBeGreaterThan(clustered.score);
    expect(clustered).toMatchObject({ uniqueCount: 3, ready: false });
    expect(physics.fieldHuntEvaluation({ x: -80, y: 40 }, physics.fieldHuntTarget(0), {
      count: 3, error: 0, survey: clustered,
    })).toMatchObject({ surveyReady: false, hasUsableFit: false, solved: false });
  });

  it('turns survey spread into a deterministic footprint, next region, and fit zone', () => {
    const samples = [{ x: -100, y: -60 }, { x: 100, y: -60 }, { x: 100, y: 60 }, { x: -100, y: 60 }, { x: 0, y: 0 }];
    expect(physics.fieldHuntCoverageHull(samples)).toEqual([
      { x: -100, y: -60 }, { x: 100, y: -60 }, { x: 100, y: 60 }, { x: -100, y: 60 },
    ]);
    expect(physics.fieldHuntCoverageHull(samples.concat(samples[0]))).toHaveLength(4);

    const next = physics.fieldHuntNextSample([{ x: 120, y: 70 }]);
    expect(next).toMatchObject({ x: -120, y: -70 });
    expect(next.distance).toBeGreaterThan(200);

    const broad = physics.fieldHuntUncertainty({ x: 0, y: 0, confidence: 0.9 }, { spanX: 120, spanY: 80 });
    const weak = physics.fieldHuntUncertainty({ x: 0, y: 0, confidence: 0.2 }, { spanX: 20, spanY: 10 });
    expect(weak.rx).toBeGreaterThan(broad.rx);
    expect(weak.ry).toBeGreaterThan(broad.ry);
    expect(physics.fieldHuntUncertainty(null, {})).toBeNull();
  });

  it('turns Hunt evidence into a clear four-step next-action sequence', () => {
    const broad = [{ x: 100, y: 0 }, { x: 20, y: 0 }, { x: 0, y: 80 }, { x: -20, y: -40 }];
    expect(physics.fieldHuntProgressState([], {})).toMatchObject({
      currentIndex: 0, estimatePlaced: false, nextAction: { key: 'sample', label: 'Record the first vector' },
    });
    expect(physics.fieldHuntProgressState([broad[0]], {})).toMatchObject({
      currentIndex: 1, nextAction: { key: 'sample', label: 'Spread the survey' },
    });
    expect(physics.fieldHuntProgressState(broad, {})).toMatchObject({
      currentIndex: 2, nextAction: { key: 'estimate', label: 'Place your source estimate' },
    });
    expect(physics.fieldHuntProgressState(broad, { estimatePlaced: true })).toMatchObject({
      currentIndex: 3, nextAction: { key: 'check', label: 'Commit your estimate' },
    });
    expect(physics.fieldHuntProgressState(broad, { estimatePlaced: true, checked: true })).toMatchObject({
      currentIndex: 3, nextAction: { key: 'revise', label: 'Revise from the evidence' },
    });
    const complete = physics.fieldHuntProgressState(broad, { estimatePlaced: true, checked: true, solved: true });
    expect(complete).toMatchObject({ currentIndex: -1, nextAction: { key: 'next', label: 'Try a new hidden source' } });
    expect(complete.steps.every((step) => step.done)).toBe(true);
  });

  it('carries survey quality into notebook metrics', () => {
    const metrics = physics.notebookMetricSnapshot({ magnetism: {
      tab: 'field', fieldView: 'hunt', fieldHuntSamples: [{ x: 100, y: 0 }, { x: 20, y: 0 }, { x: 0, y: 80 }],
    } });
    expect(metrics.find((metric) => metric.key === 'hunt_survey_score')).toMatchObject({ value: 90, unit: '/100' });
  });

  it('wires the inverse investigation into the field station and notebook', () => {
    const source = readFileSync(TOOL_PATH, 'utf8');
    expect(source).toContain("fieldMode = ['2d', '3d', 'map', 'hunt']");
    expect(source).toContain('function fieldHuntCard()');
    expect(source).toContain("'Magnetometer Hunt inverse investigation selected.'");
    expect(source).toContain("station: 'Magnetometer hunt'");
    expect(source).toContain("'hunt_fit_error'");
    expect(source).toContain('Record vector reading');
    expect(source).toContain('Move the probe to a new position before recording another vector.');
    expect(source).toContain('s.field3dUsed || s.fieldHuntSolved');
    expect(source).toContain('function fieldHuntSurveyQuality(samples)');
    expect(source).toContain('Coverage quality');
    expect(source).toContain('function fieldHuntCoverageHull(samples)');
    expect(source).toContain('function fieldHuntNextSample(samples)');
    expect(source).toContain('function fieldHuntUncertainty(analysis, survey)');
    expect(source).toContain('function fieldHuntProgressState(samples, options)');
    expect(source).toContain("fieldHuntMapMode: nextSurvey.ready ? 'estimate' : 'probe'");
    expect(source).toContain("fieldHuntEstimatePlaced: true");
    expect(source).toContain("icon: '\\uD83E\\uDDED'");
    expect(source).toContain("'\\u2192'");
    expect(source).not.toContain('\u00f0\u0178\u00a7\u00ad');
  });

  it('renders the hidden-source station and reveals the source only after a check', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const base = {
      tab: 'field', fieldView: 'hunt', magnets: [{ x: -70, y: 0, angle: 0, polarity: 1 }],
      fieldHuntRound: 0, fieldHuntProbe: { x: 100, y: 0 }, fieldHuntGuess: { x: 0, y: 0 },
      fieldHuntSamples: [], fieldHuntAnalysis: null, fieldHuntChecked: false, fieldHuntSolved: false,
    };
    const hidden = renderTool('magnetism', { magnetism: base });
    expect(hidden).toContain('Magnetometer Hunt');
    expect(hidden).toContain('Infer a hidden source');
    expect(hidden).toContain('Record vector reading');
    expect(hidden).toContain('The source is not drawn');
    expect(hidden).toContain('Coverage quality');
    expect(hidden).toContain('0/100');
    expect(hidden).toContain('Map click moves');
    expect(hidden).toContain('Swipe horizontally to inspect the full map');
    expect(hidden).toContain('HIDDEN-SOURCE MAP');
    expect(hidden).toContain('relative units');
    expect(hidden).not.toContain('source revealed');

    const revealed = renderTool('magnetism', { magnetism: Object.assign({}, base, {
      fieldHuntGuess: { x: -80, y: 40 }, fieldHuntSamples: [{ id: 1, x: 100, y: 0, bx: 1, by: 0 }, { id: 2, x: 20, y: 0, bx: 1, by: 0 }, { id: 3, x: 0, y: 80, bx: 1, by: 0 }],
      fieldHuntAnalysis: { count: 3, x: -80, y: 40, angle: 0, polarity: 1, strength: 1.2, error: 0, confidence: 1 },
      fieldHuntChecked: true, fieldHuntSolved: true,
    }) });
    expect(revealed).toContain('source revealed');
    expect(revealed).toContain('The hidden source is revealed after the check');
    expect(revealed).toContain('Coverage quality');
    expect(revealed).toContain('90/100');
  });

  it('renders one unmistakable next action as the Hunt advances', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const target = physics.fieldHuntTarget(0);
    const samples = readingsFor(target, [[100, 0], [20, 0], [0, 80], [-20, -40]]);
    const analysis = physics.fieldHuntEstimate(samples);
    const base = {
      tab: 'field', fieldView: 'hunt', learningMode: 'challenge', fieldHuntRound: 0,
      fieldHuntProbe: { x: 100, y: 0 }, fieldHuntGuess: { x: 0, y: 0 },
      fieldHuntSamples: samples, fieldHuntAnalysis: analysis, fieldHuntChecked: false, fieldHuntSolved: false,
    };

    const needsEstimate = renderTool('magnetism', { magnetism: base });
    expect(needsEstimate).toContain('Hunt workflow: step 3 of four');
    expect(needsEstimate).toContain('Next · Place your source estimate');
    expect(needsEstimate).toContain('Place estimate before checking');

    const readyToCheck = renderTool('magnetism', { magnetism: Object.assign({}, base, {
      fieldHuntGuess: { x: -60, y: 40 }, fieldHuntEstimatePlaced: true,
    }) });
    expect(readyToCheck).toContain('Hunt workflow: step 4 of four');
    expect(readyToCheck).toContain('Next · Commit your estimate');
    expect(readyToCheck).toContain('Commit &amp; check estimate');

    const revise = renderTool('magnetism', { magnetism: Object.assign({}, base, {
      fieldHuntGuess: { x: -60, y: 40 }, fieldHuntEstimatePlaced: true, fieldHuntChecked: true,
    }) });
    expect(revise).toContain('Next · Revise from the evidence');
    expect(revise).toContain('Revise estimate to retry');

    const solved = renderTool('magnetism', { magnetism: Object.assign({}, base, {
      fieldHuntGuess: { x: target.x, y: target.y }, fieldHuntEstimatePlaced: true,
      fieldHuntChecked: true, fieldHuntSolved: true, fieldHuntWins: 2,
    }) });
    expect(solved).toContain('Hunt workflow complete: four of four steps');
    expect(solved).toContain('Next · Try a new hidden source');
    expect(solved).toContain('2 sources found');
    expect(solved).toContain('Next hidden source');
    expect(solved).not.toContain('Add another vector');
    expect(solved).not.toContain('Coordinate controls');
  });

  it('hands the map from surveying to estimating when coverage becomes ready', () => {
    resetStemLab();
    const cfg = loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const target = physics.fieldHuntTarget(0);
    const firstTwo = readingsFor(target, [[100, 0], [20, 0]]);
    expect(physics.fieldHuntSurveyQuality(firstTwo.concat(readingsFor(target, [[0, 80]]))).ready).toBe(true);
    const live = mountInteractive(cfg, {
      tab: 'field', fieldView: 'hunt', learningMode: 'challenge', fieldHuntRound: 0,
      fieldHuntProbe: { x: 0, y: 80 }, fieldHuntGuess: { x: 0, y: 0 },
      fieldHuntSamples: firstTwo, fieldHuntAnalysis: null, fieldHuntMapMode: 'probe',
      fieldHuntEstimatePlaced: false, fieldHuntChecked: false, fieldHuntSolved: false,
    });
    try {
      const buttonByText = (text) => [...live.host.querySelectorAll('button')].find((button) => button.textContent.trim() === text);
      act(() => { buttonByText('Record vector reading').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(buttonByText('Source estimate').getAttribute('aria-pressed')).toBe('true');
      expect(live.host.textContent).toContain('Next · Place your source estimate');
      expect(buttonByText('Add another vector')).toBeTruthy();
      expect(buttonByText('Place estimate before checking').disabled).toBe(true);
    } finally {
      live.close();
    }
  });

  it('keeps Challenge estimates independent until the learner checks', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const target = physics.fieldHuntTarget(0);
    const samples = readingsFor(target, [[100, 0], [20, 0], [0, 80], [-20, -40]]);
    const analysis = physics.fieldHuntEstimate(samples);
    const base = {
      tab: 'field', fieldView: 'hunt', learningMode: 'challenge', magnets: [{ x: -70, y: 0, angle: 0, polarity: 1 }],
      fieldHuntRound: 0, fieldHuntProbe: { x: 100, y: 0 }, fieldHuntGuess: { x: -60, y: 40 },
      fieldHuntSamples: samples, fieldHuntAnalysis: analysis, fieldHuntChecked: false, fieldHuntSolved: false,
    };
    const committedOnly = renderTool('magnetism', { magnetism: base });
    expect(committedOnly).toContain('Independent estimate first');
    expect(committedOnly).toContain('Commit &amp; check estimate');
    expect(committedOnly).not.toContain('Fit hidden source');
    expect(committedOnly).not.toContain('Inverse-model comparison:');
    expect(committedOnly).not.toContain('inverse-model fit zone');
    expect(committedOnly).toContain('A shaded polygon shows the survey footprint');

    const postCheck = renderTool('magnetism', { magnetism: Object.assign({}, base, { fieldHuntChecked: true }) });
    expect(postCheck).toContain('Inverse-model comparison:');
    expect(postCheck).toContain('inverse-model fit zone');
    expect(postCheck).toContain('qualitative fit-quality zone');

    const revising = renderTool('magnetism', { magnetism: Object.assign({}, base, {
      fieldHuntChecked: false, fieldHuntModelRevealed: true,
    }) });
    expect(revising).toContain('Inverse-model comparison:');
    expect(revising).toContain('inverse-model fit zone');
  });

  it('uses a compact simulation-first shell and offers an optional wide focus mode', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const base = { tab: 'field', fieldView: 'hunt', learningMode: 'guided', magnets: [{ x: -70, y: 0, angle: 0, polarity: 1 }] };
    const standard = renderTool('magnetism', { magnetism: base });
    expect(standard).toContain('Mission details');
    expect(standard).toContain('id="mag-mission-details"');
    expect(standard).toContain('hidden=""');
    expect(standard).toContain('Focus Lab');
    expect(standard).toContain('class="mag-guide"');
    expect(standard).toContain('Learning guide');
    expect(standard).toContain('Predict → test → explain');
    expect(standard.indexOf('role="tabpanel"')).toBeLessThan(standard.indexOf('Journey 0/21'));

    const shell = document.createElement('div');
    shell.innerHTML = standard;
    expect(shell.querySelector('.mag-guide').open).toBe(false);

    const focused = renderTool('magnetism', { magnetism: Object.assign({}, base, { labFocus: true }) });
    expect(focused).toContain('Exit Focus Lab');
    expect(focused).toContain('max-width:1040px');
    expect(focused).not.toContain('Mission Control');
    expect(focused).not.toContain('Journey 0/21');
    expect(focused).toContain('Magnetism &amp; Electromagnetism · Focus Lab');

    const changed = renderTool('magnetism', { magnetism: {
      tab: 'electro', learningMode: 'guided', magLastChange: 'turns', magChangeSeq: 2,
    } });
    expect(changed).toContain('What changed: Coil turns changed');
    expect(changed).toContain('field strength and wire-length tradeoffs update together');
  });

  it('keeps the enhanced Hunt shell free of automated WCAG A/AA violations', async () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const target = physics.fieldHuntTarget(0);
    const samples = readingsFor(target, [[100, 0], [20, 0], [0, 80], [-20, -40]]);
    const html = renderTool('magnetism', { magnetism: {
      tab: 'field', fieldView: 'hunt', learningMode: 'challenge', fieldHuntRound: 0,
      fieldHuntProbe: { x: 100, y: 0 }, fieldHuntGuess: { x: -60, y: 40 },
      fieldHuntSamples: samples, fieldHuntAnalysis: physics.fieldHuntEstimate(samples), fieldHuntChecked: true,
    } });
    const host = document.createElement('main');
    host.innerHTML = html;
    document.body.appendChild(host);
    try {
      const results = await axe.run(host, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
        rules: { 'color-contrast': { enabled: false } },
      });
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    } finally {
      host.remove();
    }
  }, 60000);
});

describe('magnetism electromagnet fair-test evidence', () => {
  const baseline = { turns: 20, current: 2, core: false, currentDir: 1, windingDir: 1 };

  it('classifies unchanged, single-variable, direction, and confounded trials', () => {
    expect(physics.electromagnetFairTestState(null, baseline)).toMatchObject({
      status: 'empty', fair: false, changed: [], trialField: expect.any(Number),
    });
    expect(physics.electromagnetFairTestState(baseline, baseline)).toMatchObject({
      status: 'unchanged', fair: false, changed: [], ratio: 1,
    });

    const turns = physics.electromagnetFairTestState(baseline, { ...baseline, turns: 40 });
    expect(turns).toMatchObject({ status: 'fair', fair: true, changedKey: 'turns', changedLabels: ['turns'], directionFlipped: false });
    expect(turns.ratio).toBeCloseTo(2, 12);

    const reversed = physics.electromagnetFairTestState(baseline, { ...baseline, currentDir: -1 });
    expect(reversed).toMatchObject({ status: 'fair', changedKey: 'currentDir', directionFlipped: true });
    expect(reversed.ratio).toBeCloseTo(1, 12);

    const off = physics.electromagnetFairTestState(baseline, { ...baseline, current: 0 });
    expect(off).toMatchObject({ status: 'fair', changedKey: 'current', ratio: 0, trialField: 0 });

    const confounded = physics.electromagnetFairTestState(baseline, { ...baseline, turns: 40, current: 4 });
    expect(confounded).toMatchObject({ status: 'confounded', fair: false, changed: ['turns', 'current'] });
    expect(confounded.ratio).toBeCloseTo(4, 12);

    const malformed = physics.electromagnetFairTestState({ ...baseline, turns: Infinity }, { ...baseline, current: Number.NaN });
    expect(Number.isFinite(malformed.baselineField)).toBe(true);
    expect(Number.isFinite(malformed.trialField)).toBe(true);
  });

  it('carries the A/B evidence and fairness into notebook metrics', () => {
    const metrics = physics.notebookMetricSnapshot({ magnetism: {
      tab: 'electro', ...baseline, turns: 40, electroBaseline: baseline,
    } });
    expect(metrics.find((metric) => metric.key === 'electro_baseline_mT')).toMatchObject({ label: 'Baseline field', unit: 'mT' });
    expect(metrics.find((metric) => metric.key === 'electro_changed_controls')).toMatchObject({ value: 1, unit: 'controls' });
    expect(metrics.find((metric) => metric.key === 'electro_field_ratio')).toMatchObject({ value: 2, unit: '×' });
  });

  it('renders a compact A/B comparison with a single dominant recovery action', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const ready = renderTool('magnetism', { magnetism: { tab: 'electro', electroView: '2d' } });
    expect(ready).toContain('A/B fair-test evidence');
    expect(ready).toContain('Lock this setup as A');
    expect(ready).toContain('Start with evidence, not memory');

    const fair = renderTool('magnetism', { magnetism: {
      tab: 'electro', electroView: '2d', ...baseline, current: 4, electroBaseline: baseline,
    } });
    expect(fair).toContain('A · locked baseline');
    expect(fair).toContain('B · live trial');
    expect(fair).toContain('Fair test');
    expect(fair).toContain('Field rose to 2.00× the baseline');
    expect(fair).toContain('Keep B as the new A');
    expect(fair).toContain('bars share a linear scale');

    const confounded = renderTool('magnetism', { magnetism: {
      tab: 'electro', electroView: '2d', ...baseline, turns: 40, current: 4, electroBaseline: baseline,
    } });
    expect(confounded).toContain('Too many changes');
    expect(confounded).toContain('2 controls changed: turns, current');
    expect(confounded).toContain('Restore baseline A');

    const zeroBaseline = { ...baseline, current: 0 };
    const zeroField = renderTool('magnetism', { magnetism: {
      tab: 'electro', electroView: '2d', ...zeroBaseline, turns: 40, electroBaseline: zeroBaseline,
    } });
    expect(zeroField).toContain('The field stayed at zero even though only turns changed');
    expect(zeroField).toContain('Turns and core material cannot strengthen an electromagnet until charge is moving');
    expect(zeroField).not.toContain('The field fell to zero when only turns changed');
  });

  it('updates the fair-test evidence live when one direction control changes', () => {
    resetStemLab();
    const cfg = loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const live = mountInteractive(cfg, { tab: 'electro', electroView: '2d', ...baseline, electroBaseline: null });
    try {
      const buttonContaining = (text) => [...live.host.querySelectorAll('button')].find((button) => button.textContent.includes(text));
      act(() => { buttonContaining('Lock this setup as A').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(live.host.textContent).toContain('Baseline locked');
      act(() => { buttonContaining('Reverse current').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(live.host.querySelector('.mag-fair-badge').textContent).toBe('Fair test');
      expect(live.host.textContent).toContain('Direction flipped while field strength stayed');
      expect(live.host.textContent).toContain('Keep B as the new A');
    } finally {
      live.close();
    }
  });

  it('keeps the A/B evidence panel responsive and free of automated WCAG A/AA violations', async () => {
    const source = readFileSync(TOOL_PATH, 'utf8');
    expect(source).toContain('.mag-fair-flow{grid-template-columns:1fr}');
    resetStemLab();
    loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const html = renderTool('magnetism', { magnetism: {
      tab: 'electro', electroView: '2d', ...baseline, current: 4, electroBaseline: baseline,
    } });
    const host = document.createElement('main');
    host.innerHTML = html;
    document.body.appendChild(host);
    try {
      const results = await axe.run(host, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
        rules: { 'color-contrast': { enabled: false } },
      });
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    } finally {
      host.remove();
    }
  }, 60000);
});

describe('magnetism generator speed evidence', () => {
  function completeSpeedTrials(turns = 50) {
    const slow = Math.abs(physics.induceEMF(turns, -60, -20, 1, 40) * 0.04);
    const fast = Math.abs(physics.induceEMF(turns, -60, -20, 0.25, 40) * 0.04);
    return {
      slow: { kind: 'slow', duration: 1, voltage: slow, turns, start: -60, finish: -20 },
      fast: { kind: 'fast', duration: 0.25, voltage: fast, turns, start: -60, finish: -20 },
      still: { kind: 'still', duration: 0, voltage: 0, turns, start: -20, finish: -20 },
    };
  }

  it('turns slow, fast, and still runs into a validated evidence sequence', () => {
    const full = completeSpeedTrials();
    expect(physics.inductionSpeedEvidenceState({})).toMatchObject({
      completedCount: 0, complete: false, status: 'collecting', nextAction: { key: 'slow', label: 'Run the slow trial' },
    });
    expect(physics.inductionSpeedEvidenceState({ slow: full.slow })).toMatchObject({
      completedCount: 1, nextAction: { key: 'fast', label: 'Run the fast trial' },
    });
    const valid = physics.inductionSpeedEvidenceState(full);
    expect(valid).toMatchObject({
      completedCount: 3, complete: true, controlled: true, ratioMatches: true,
      stillZero: true, valid: true, status: 'complete', nextAction: { key: 'explain' },
    });
    expect(valid.ratio).toBeCloseTo(4, 12);
    expect(valid.expectedRatio).toBeCloseTo(4, 12);

    const mismatched = completeSpeedTrials();
    mismatched.fast = { ...mismatched.fast, turns: 100 };
    const confounded = physics.inductionSpeedEvidenceState(mismatched);
    expect(confounded).toMatchObject({ valid: false, status: 'confounded', nextAction: { key: 'reset' } });
    expect(confounded.issues).toContain('coil turns changed between slow and fast');

    const malformed = physics.inductionSpeedEvidenceState({ slow: { voltage: Number.NaN, turns: Infinity } });
    expect(malformed).toMatchObject({ completedCount: 0, status: 'collecting' });
  });

  it('adds the persistent speed comparison to notebook metrics', () => {
    const metrics = physics.notebookMetricSnapshot({ magnetism: {
      tab: 'induce', induceMode: 'hand', induceSpeedTrials: completeSpeedTrials(), lastEMF: 0, peakEMF: 2,
    } });
    expect(metrics.find((metric) => metric.key === 'speed_trial_count')).toMatchObject({ value: 3, unit: '/3' });
    expect(metrics.find((metric) => metric.key === 'fast_slow_ratio')).toMatchObject({ value: 4, unit: '×' });
    expect(metrics.find((metric) => metric.key === 'still_voltage')).toMatchObject({ value: 0, unit: 'V' });
  });

  it('renders collecting, complete, and confounded evidence states clearly', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const base = { tab: 'induce', induceMode: 'hand', induceTurns: 50, induceSpeedTrials: {} };
    const collecting = renderTool('magnetism', { magnetism: base });
    expect(collecting).toContain('Controlled speed evidence');
    expect(collecting).toContain('0/3 runs');
    expect(collecting).toContain('Next · Run the slow trial');
    expect(collecting).toContain('Shared-scale voltage comparison');

    const firstRun = completeSpeedTrials(50);
    const changedCoil = renderTool('magnetism', { magnetism: {
      ...base, induceTurns: 100, induceSpeedTrials: { slow: firstRun.slow },
    } });
    expect(changedCoil).toContain('Restore the locked coil before the next run');
    expect(changedCoil).toContain('saved evidence used N 50, but the live coil is N 100');
    expect(changedCoil).toContain('Restore N 50');

    const complete = renderTool('magnetism', { magnetism: { ...base, induceSpeedTrials: completeSpeedTrials() } });
    expect(complete).toContain('3/3 runs');
    expect(complete).toContain('Evidence complete · rate of change controls voltage');
    expect(complete).toContain('produced 4.00× the slow voltage');
    expect(complete).toContain('Holding still produced 0.00 V');
    expect(complete).toContain('Record evidence in notebook');

    const mismatched = completeSpeedTrials();
    mismatched.fast = { ...mismatched.fast, turns: 100 };
    const confounded = renderTool('magnetism', { magnetism: { ...base, induceSpeedTrials: mismatched } });
    expect(confounded).toContain('Fair-test reset needed');
    expect(confounded).toContain('coil turns changed between slow and fast');
    expect(confounded).toContain('Reset mismatched runs');
    expect(confounded).not.toContain('Record evidence in notebook');
  });

  it('advances the recommended action through all three live generator runs', () => {
    resetStemLab();
    const cfg = loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const live = mountInteractive(cfg, {
      tab: 'induce', induceMode: 'hand', induceTurns: 50, induceX: -100, inducePrevX: -100,
      induceSpeedTrials: {}, emfTrace: [], lastEMF: 0, peakEMF: 0,
    });
    try {
      const buttonByText = (text) => [...live.host.querySelectorAll('button')].find((button) => button.textContent.trim() === text);
      act(() => { buttonByText('Slow · 1.00 s').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(live.host.textContent).toContain('1/3 runs');
      expect(live.host.textContent).toContain('Next · Run the fast trial');
      act(() => { buttonByText('Fast · 0.25 s').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(live.host.textContent).toContain('2/3 runs');
      expect(live.host.textContent).toContain('Next · Run the still trial');
      act(() => { buttonByText('Hold still').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(live.host.textContent).toContain('3/3 runs');
      expect(live.host.textContent).toContain('Evidence complete · rate of change controls voltage');
      expect(buttonByText('Record evidence in notebook')).toBeTruthy();
      const fills = [...live.host.querySelectorAll('.mag-speed-fill')];
      expect(fills).toHaveLength(3);
      expect(fills[1].style.width).toBe('100%');
      expect(fills[2].style.width).toBe('0%');
    } finally {
      live.close();
    }
  });

  it('keeps the evidence board responsive and free of automated WCAG A/AA violations', async () => {
    const source = readFileSync(TOOL_PATH, 'utf8');
    expect(source).toContain('.mag-speed-grid{grid-template-columns:1fr 1fr}');
    resetStemLab();
    loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const html = renderTool('magnetism', { magnetism: {
      tab: 'induce', induceMode: 'hand', induceTurns: 50, induceSpeedTrials: completeSpeedTrials(),
    } });
    const host = document.createElement('main');
    host.innerHTML = html;
    document.body.appendChild(host);
    try {
      const results = await axe.run(host, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
        rules: { 'color-contrast': { enabled: false } },
      });
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    } finally {
      host.remove();
    }
  }, 60000);
});

describe('magnetism transformer engineering briefs', () => {
  const solutions = [
    { mission: 0, n1: 125, n2: 25, load: 60, efficiency: 0.94 },
    { mission: 1, n1: 100, n2: 50, load: 120, efficiency: 0.94 },
    { mission: 2, n1: 100, n2: 200, load: 240, efficiency: 0.94 },
  ];

  it('scores three solvable briefs and points to the control that needs attention', () => {
    expect(physics.TRANSFORMER_DESIGN_MISSIONS).toHaveLength(3);
    expect(new Set(physics.TRANSFORMER_DESIGN_MISSIONS.map((mission) => mission.id)).size).toBe(3);

    solutions.forEach((solution) => {
      const state = physics.transformerDesignState(120, solution.n1, solution.n2, true, solution.load, solution.efficiency, solution.mission);
      expect(state).toMatchObject({ index: solution.mission, active: true, metCount: 3, allMet: true, status: 'ready', nextAction: { key: 'validate' } });
      expect(state.criteria.every((criterion) => criterion.met)).toBe(true);
    });

    const highVoltage = physics.transformerDesignState(120, 100, 200, true, 120, 0.94, 0);
    expect(highVoltage).toMatchObject({ voltageMet: false, nextAction: { key: 'voltage', label: 'Lower the turns ratio' } });

    const lowPower = physics.transformerDesignState(120, 100, 50, true, 240, 0.94, 1);
    expect(lowPower).toMatchObject({ voltageMet: true, powerMet: false, lossMet: true, nextAction: { key: 'power', label: 'Lower load resistance' } });

    const hot = physics.transformerDesignState(120, 100, 50, true, 120, 0.8, 1);
    expect(hot).toMatchObject({ voltageMet: true, powerMet: true, lossMet: false, nextAction: { key: 'loss', label: 'Reduce the heat loss' } });

    const dc = physics.transformerDesignState(120, 100, 50, false, 120, 0.94, 1);
    expect(dc).toMatchObject({ active: false, metCount: 0, allMet: false, status: 'inactive', nextAction: { key: 'ac', label: 'Switch the input to AC' } });
  });

  it('adds power, heat, and constraint evidence to the notebook snapshot', () => {
    const metrics = physics.notebookMetricSnapshot({ magnetism: {
      tab: 'transformer', xfmrN1: 125, xfmrN2: 25, xfmrAC: true,
      xfmrLoad: 60, xfmrEfficiency: 94, xfmrMission: 0,
    } });
    expect(metrics.find((metric) => metric.key === 'output_V')).toMatchObject({ value: 24, unit: 'V' });
    expect(metrics.find((metric) => metric.key === 'useful_power_W')).toMatchObject({ value: 9.600000000000001, unit: 'W' });
    expect(metrics.find((metric) => metric.key === 'heat_loss_W')).toMatchObject({ unit: 'W' });
    expect(metrics.find((metric) => metric.key === 'design_constraints')).toMatchObject({ value: 3, unit: '/3' });
  });

  it('renders target bands, live constraint states, and actionable recovery feedback', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const solved = renderTool('magnetism', { magnetism: {
      tab: 'transformer', xfmrN1: 125, xfmrN2: 25, xfmrAC: true,
      xfmrLoad: 60, xfmrEfficiency: 94, xfmrMission: 0, xfmrMissionWins: {},
    } });
    expect(solved).toContain('Engineering power-delivery challenge');
    expect(solved).toContain('Choose an engineering brief');
    expect(solved).toContain('0/3 missions solved');
    expect(solved).toContain('24 V device charger');
    expect(solved).toContain('Target 21\u201327 V \u00b7 blue band');
    expect(solved).toContain('Target 8\u201312 W \u00b7 blue band');
    expect(solved).toContain('Target \u2264 0.8 W \u00b7 blue band');
    expect(solved).toContain('All targets aligned \u00b7 ready to validate');
    expect(solved).toContain('Lock in design');
    expect((solved.match(/role="meter"/g) || [])).toHaveLength(3);

    const needsWork = renderTool('magnetism', { magnetism: {
      tab: 'transformer', xfmrN1: 100, xfmrN2: 200, xfmrAC: true,
      xfmrLoad: 120, xfmrEfficiency: 94, xfmrMission: 0, xfmrChecked: true,
    } });
    expect(needsWork).toContain('0/3 constraints met');
    expect(needsWork).toContain('Lower the turns ratio');
    expect(needsWork).toContain('Tune N2/N1 toward 0.20');
    expect(needsWork).toContain('Next focus: Lower the turns ratio');

    const dc = renderTool('magnetism', { magnetism: {
      tab: 'transformer', xfmrN1: 125, xfmrN2: 25, xfmrAC: false,
      xfmrLoad: 60, xfmrEfficiency: 94, xfmrMission: 0, xfmrChecked: true,
    } });
    expect(dc).toContain('Switch the input to AC');
    expect(dc).toContain('no delivery target can be met');
  });

  it('locks a valid design once and advances to an unsolved mission', () => {
    resetStemLab();
    const cfg = loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const live = mountInteractive(cfg, {
      tab: 'transformer', xfmrN1: 125, xfmrN2: 25, xfmrAC: true,
      xfmrLoad: 60, xfmrEfficiency: 94, xfmrMission: 0, xfmrChecked: false, xfmrMissionWins: {},
    });
    try {
      const buttonByText = (text) => [...live.host.querySelectorAll('button')].find((button) => button.textContent.includes(text));
      expect(buttonByText('Lock in design')).toBeTruthy();
      act(() => { buttonByText('Lock in design').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(live.host.textContent).toContain('1/3 missions solved');
      expect(live.host.textContent).toContain('Mission secured \u00b7 replay still meets the brief');
      expect(buttonByText('Next unsolved mission')).toBeTruthy();
      act(() => { buttonByText('Next unsolved mission').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(live.host.textContent).toContain('60 V workshop lamp');
      expect(live.host.textContent).toContain('Target 56\u201364 V');
    } finally {
      live.close();
    }
  });

  it('keeps the challenge responsive and free of automated WCAG A/AA violations', async () => {
    const source = readFileSync(TOOL_PATH, 'utf8');
    expect(source).toContain('.mag-xfmr-goals{grid-template-columns:1fr}');
    expect(source).toContain('.mag-xfmr-missions button{flex:1 1 135px}');
    resetStemLab();
    loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const html = renderTool('magnetism', { magnetism: {
      tab: 'transformer', xfmrN1: 125, xfmrN2: 25, xfmrAC: true,
      xfmrLoad: 60, xfmrEfficiency: 94, xfmrMission: 0, xfmrMissionWins: {},
    } });
    const host = document.createElement('main');
    host.innerHTML = html;
    document.body.appendChild(host);
    try {
      const results = await axe.run(host, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
        rules: { 'color-contrast': { enabled: false } },
      });
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    } finally {
      host.remove();
    }
  }, 60000);
});

describe('magnetism Field Walk navigation evidence', () => {
  function needleTrail(roundIndex) {
    const round = physics.MAZE_ROUNDS[roundIndex];
    const magnet = { x: round.x, y: round.y, angle: round.angle, polarity: round.polarity };
    const south = physics.mazePoles(roundIndex).s;
    let [gx, gy] = round.start;
    const trail = [];
    for (let step = 0; step < 100; step++) {
      const point = physics.mazeCellToField(gx, gy);
      if (Math.hypot(point.x - south.x, point.y - south.y) < 22 * 1.2) break;
      const field = physics.fieldAt(point.x, point.y, [magnet]);
      let dx = 0;
      let dy = 0;
      if (Math.abs(field.x) >= Math.abs(field.y)) dx = field.x >= 0 ? 1 : -1;
      else dy = field.y >= 0 ? 1 : -1;
      gx = Math.max(0, Math.min(10, gx + dx));
      gy = Math.max(0, Math.min(7, gy + dy));
      trail.push(`${gx},${gy}`);
    }
    return trail;
  }

  it('derives a winnable benchmark and a rising signal trail for every round', () => {
    expect(physics.MAZE_ROUNDS.map((_, index) => physics.fieldWalkReferenceSteps(index))).toEqual([11, 12, 10, 11]);
    physics.MAZE_ROUNDS.forEach((_, index) => {
      const trail = needleTrail(index);
      const evidence = physics.fieldWalkEvidenceState(index, trail);
      expect(evidence).toMatchObject({
        round: index, moveCount: trail.length, alignedCount: trail.length,
        alignmentPercent: 100, lastMoveAligned: true, revisits: 0,
        uniqueCount: trail.length + 1, referenceSteps: trail.length,
      });
      expect(evidence.signalRatio).toBeGreaterThan(200);
      expect(evidence.signalTrend).toBe('rising');
      expect(evidence.samples).toHaveLength(trail.length + 1);
      expect(evidence.samples[0]).toMatchObject({ ratio: 1, signalPercent: 12 });
      expect(evidence.samples.at(-1).signalPercent).toBeGreaterThan(95);
    });
  });

  it('scores cross-field moves and revisits while ignoring malformed saved cells', () => {
    const aligned = physics.fieldWalkEvidenceState(0, ['0,6']);
    expect(aligned).toMatchObject({ moveCount: 1, alignedCount: 1, alignmentPercent: 100, lastMoveAligned: true, uniqueCount: 2, revisits: 0 });

    const cross = physics.fieldWalkEvidenceState(0, ['0,6', '0,7']);
    expect(cross).toMatchObject({ moveCount: 2, alignedCount: 1, alignmentPercent: 50, lastMoveAligned: false, uniqueCount: 2, revisits: 1, signalTrend: 'falling' });

    const recovered = physics.fieldWalkEvidenceState(0, ['0,6', '0,7', '0,6']);
    expect(recovered).toMatchObject({ moveCount: 3, alignedCount: 2, alignmentPercent: 67, lastMoveAligned: true, uniqueCount: 2, revisits: 2, signalTrend: 'rising' });

    const malformed = physics.fieldWalkEvidenceState(-1, [null, 'bad', '99,99', { x: 9, y: 7 }]);
    expect(malformed.round).toBe(3);
    expect(malformed.cells.every((cell) => Number.isFinite(cell.x) && Number.isFinite(cell.y))).toBe(true);
    expect(Number.isFinite(malformed.signalRatio)).toBe(true);
  });

  it('adds signal, alignment, coverage, and loop evidence to notebook metrics', () => {
    const metrics = physics.notebookMetricSnapshot({ magnetism: {
      tab: 'maze', mazeRound: 0, mazeTrail: ['0,6', '1,6', '1,5'],
    } });
    expect(metrics.find((metric) => metric.key === 'walk_signal_gain')).toMatchObject({ unit: '×' });
    expect(metrics.find((metric) => metric.key === 'walk_alignment')).toMatchObject({ value: 100, unit: '%' });
    expect(metrics.find((metric) => metric.key === 'walk_unique_cells')).toMatchObject({ value: 4, unit: 'squares' });
    expect(metrics.find((metric) => metric.key === 'walk_revisits')).toMatchObject({ value: 0, unit: 'squares' });
  });

  it('renders a signal chart, retrospective feedback, and a post-win benchmark', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const initial = renderTool('magnetism', { magnetism: { tab: 'maze', mazeRound: 0, mazePx: 0, mazePy: 7, mazeTrail: [] } });
    expect(initial).toContain('Navigation evidence');
    expect(initial).toContain('Magnetic signal trail across 1 sampled position');
    expect(initial).toContain('Signal gain');
    expect(initial).toContain('1.00×');
    expect(initial).toContain('Start the evidence trail');
    expect(initial).toContain('log signal scale');

    const cross = renderTool('magnetism', { magnetism: {
      tab: 'maze', mazeRound: 0, mazePx: 0, mazePy: 7, mazeSteps: 2,
      mazeTrail: ['0,6', '0,7'], learningMode: 'challenge',
    } });
    expect(cross).toContain('Cross-field move');
    expect(cross).toContain('50%');
    expect(cross).toContain('1 revisit recorded');
    expect(cross).toContain('useful evidence, not a penalty');
    expect(cross).toContain('No path hint is shown');
    expect(cross).not.toContain('closest to the red needle direction');

    const trail = needleTrail(0);
    const [lastX, lastY] = trail.at(-1).split(',').map(Number);
    const won = renderTool('magnetism', { magnetism: {
      tab: 'maze', mazeRound: 0, mazePx: lastX, mazePy: lastY,
      mazeSteps: trail.length, mazeTrail: trail, mazeWon: true, mazeWins: 1,
    } });
    expect(won).toContain('Found in 11 steps');
    expect(won).toContain('Route evidence: 100% field-aligned');
    expect(won).toContain('needle-following benchmark 11 steps');
    expect(won).toContain('very strong');
  });

  it('updates alignment and loop evidence through real D-pad moves and restart', () => {
    resetStemLab();
    const cfg = loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const live = mountInteractive(cfg, {
      tab: 'maze', mazeRound: 0, mazePx: 0, mazePy: 7, mazeSteps: 0,
      mazeTrail: [], mazeWon: false, mazeWins: 0, learningMode: 'guided',
    });
    try {
      const buttonByLabel = (label) => [...live.host.querySelectorAll('button')].find((button) => (button.getAttribute('aria-label') || '').startsWith(label));
      const buttonByText = (text) => [...live.host.querySelectorAll('button')].find((button) => button.textContent.includes(text));
      act(() => { buttonByLabel('Walk up').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(live.host.textContent).toContain('Aligned with the field');
      expect(live.host.textContent).toContain('1/1 moves matched the red tip');
      expect(live.host.textContent).toContain('100%');

      act(() => { buttonByLabel('Walk down').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(live.host.textContent).toContain('Cross-field move');
      expect(live.host.textContent).toContain('1/2 moves matched the red tip');
      expect(live.host.textContent).toContain('1 revisit recorded');

      act(() => { buttonByText('Restart this route').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(live.host.textContent).toContain('1 sampled position');
      expect(live.host.textContent).toContain('Start the evidence trail');
      expect(buttonByText('Restart this route')).toBeFalsy();
    } finally {
      live.close();
    }
  });

  it('keeps navigation evidence responsive and free of automated WCAG A/AA violations', async () => {
    const source = readFileSync(TOOL_PATH, 'utf8');
    expect(source).toContain('.mag-maze-metrics{grid-template-columns:1fr 1fr}');
    expect(source).toContain('.mag-maze-metric:last-child{grid-column:1/-1}');
    resetStemLab();
    loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const html = renderTool('magnetism', { magnetism: {
      tab: 'maze', mazeRound: 0, mazePx: 1, mazePy: 5,
      mazeSteps: 3, mazeTrail: ['0,6', '1,6', '1,5'], mazeWon: false,
    } });
    const host = document.createElement('main');
    host.innerHTML = html;
    document.body.appendChild(host);
    try {
      const results = await axe.run(host, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
        rules: { 'color-contrast': { enabled: false } },
      });
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    } finally {
      host.remove();
    }
  }, 60000);
});

describe('magnetism Junkyard Crane prediction evidence', () => {
  function craneSeed(extra = {}) {
    return Object.assign({
      tab: 'crane', learningMode: 'guided', craneSlot: 0, cranePower: false, craneHolding: null,
      craneItems: { 0: 'nail', 1: 'foil', 2: 'clip', 3: 'penny', 4: 'nickel', 5: 'ruler', 6: 'cobalt', 7: 'pencil' },
      craneDeposited: {}, cranePredictions: {}, craneTests: {}, craneMsg: '', craneDone: false,
      craneRewarded: false, craneBestEvidence: null,
    }, extra);
  }

  it('derives prediction, result, accuracy, and recycling states without mutating input', () => {
    const predictions = { nail: true, foil: true };
    const tests = {
      nail: { predicted: true, lifted: true },
      foil: { predicted: true, lifted: false },
    };
    const evidence = physics.craneEvidenceState(predictions, tests, { nail: true });
    expect(evidence).toMatchObject({
      predictionCount: 2, testedCount: 2, correctCount: 1, accuracy: 50,
      liftedCount: 1, noPullCount: 1, recycledCount: 1, complete: false, perfect: false,
    });
    expect(evidence.items[0]).toMatchObject({ id: 'nail', predicted: true, tested: true, lifted: true, correct: true, recycled: true });
    expect(evidence.items[1]).toMatchObject({ id: 'foil', predicted: true, tested: true, lifted: false, correct: false });
    expect(evidence.items[2]).toMatchObject({ id: 'clip', predicted: null, tested: false, correct: null });
    expect(predictions).toEqual({ nail: true, foil: true });
    expect(tests.foil).toEqual({ predicted: true, lifted: false });

    const allPredictions = Object.fromEntries(physics.CRANE_ORDER.map((id) => [id, physics.MATERIALS.find((item) => item.id === id).magnetic]));
    const allTests = Object.fromEntries(physics.CRANE_ORDER.map((id) => [id, { predicted: allPredictions[id], lifted: allPredictions[id] }]));
    expect(physics.craneEvidenceState(allPredictions, allTests, {})).toMatchObject({ testedCount: 8, correctCount: 8, accuracy: 100, complete: true, perfect: true });
    expect(physics.craneEvidenceState(null, { foil: { lifted: 'bad' } }, null)).toMatchObject({ predictionCount: 0, testedCount: 0, accuracy: null });
  });

  it('carries crane evidence into notebook metrics and preserves the best cleared run for Mission Control', () => {
    const metrics = physics.notebookMetricSnapshot({ magnetism: craneSeed({
      cranePredictions: { nail: true, foil: true },
      craneTests: { nail: { predicted: true, lifted: true }, foil: { predicted: true, lifted: false } },
      craneDeposited: { nail: true },
    }) });
    expect(metrics.find((metric) => metric.key === 'crane_tests')).toMatchObject({ value: 2, unit: '/8' });
    expect(metrics.find((metric) => metric.key === 'crane_accuracy')).toMatchObject({ value: 50, unit: '%' });
    expect(metrics.find((metric) => metric.key === 'crane_lifts')).toMatchObject({ value: 1, unit: 'objects' });
    expect(metrics.find((metric) => metric.key === 'crane_recycled')).toMatchObject({ value: 1, unit: '/4' });

    const review = physics.missionEvidenceReviewState('shield_path', { magnetism: {
      matPerfect: true, domainsFull: true, earthSeen: true, craneRewarded: true,
      cranePredictions: {}, craneTests: {}, craneDeposited: {},
      craneBestEvidence: { recycledCount: 4, testedCount: 7, accuracy: 86 },
    } });
    const craneStep = review.steps.find((step) => step.questId === 'mag_crane');
    expect(craneStep.done).toBe(true);
    expect(craneStep.evidence).toContain('4/4 recycled; 7/8 objects tested at 86% prediction accuracy');
  });

  it('renders a scannable ledger, progress meter, current sample, and non-color result states', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const html = renderTool('magnetism', { magnetism: craneSeed({
      craneSlot: 1, cranePredictions: { nail: true, foil: true },
      craneTests: { nail: { predicted: true, lifted: true }, foil: { predicted: true, lifted: false } },
      craneDeposited: { nail: true },
    }) });
    expect(html).toContain('Prediction → test evidence');
    expect(html).toContain('2/8 objects tested');
    expect(html).toContain('aria-valuenow="2"');
    expect(html).toContain('data-state="recycled"');
    expect(html).toContain('data-state="revised"');
    expect(html).toContain('Recycled · lifted · confirmed');
    expect(html).toContain('No pull · prediction revised');
    expect(html).toContain('Next action · Evidence recorded');
    expect(html).toContain('aria-label="Aluminum foil: No pull · prediction revised"');
  });

  it('gates the field behind a prediction, confirms a lift, and carries it to the bin', () => {
    resetStemLab();
    const cfg = loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const live = mountInteractive(cfg, craneSeed());
    try {
      const buttonByText = (text) => [...live.host.querySelectorAll('button')].find((button) => button.textContent.includes(text));
      const buttonByLabel = (label) => [...live.host.querySelectorAll('button')].find((button) => button.getAttribute('aria-label') === label);
      expect(buttonByText('Power ON').disabled).toBe(true);
      expect(live.host.textContent).toContain('Next action · Predict before testing');

      act(() => { buttonByText('Will lift').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(buttonByText('Power ON').disabled).toBe(false);
      expect(live.host.textContent).toContain('Next action · Test the prediction');

      act(() => { buttonByText('Power ON').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(live.host.textContent).toContain('Prediction confirmed');
      expect(live.host.textContent).toContain('Lifted · confirmed');
      expect(live.host.textContent).toContain('100%');
      expect(live.host.textContent).toContain('Next action · Carry the lifted item');
      expect(live.host.querySelector('.mag-crane-scene.is-powered')).toBeTruthy();

      for (let move = 0; move < 8; move++) {
        act(() => { buttonByLabel('Move crane right').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      }
      expect(live.host.textContent).toContain('Next action · Release into the bin');
      act(() => { buttonByText('Power OFF').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(live.host.textContent).toContain('1 / 4');
      expect(live.host.textContent).toContain('Recycled · lifted · confirmed');
    } finally {
      live.close();
    }
  });

  it('treats a mistaken nonmagnetic prediction as revision evidence and locks movement while powered', () => {
    resetStemLab();
    const cfg = loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const live = mountInteractive(cfg, craneSeed({ craneSlot: 1 }));
    try {
      const buttonByText = (text) => [...live.host.querySelectorAll('button')].find((button) => button.textContent.includes(text));
      const buttonByLabel = (label) => [...live.host.querySelectorAll('button')].find((button) => button.getAttribute('aria-label') === label);
      expect(buttonByText('Power ON').disabled).toBe(true);
      act(() => { buttonByText('Will lift').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      act(() => { buttonByText('Power ON').dispatchEvent(new MouseEvent('click', { bubbles: true })); });

      expect(live.host.textContent).toContain('Evidence revised the prediction');
      expect(live.host.textContent).toContain('No pull · prediction revised');
      expect(live.host.textContent).toContain('0%');
      expect(live.host.textContent).toContain('Next action · Switch the field off');
      expect(buttonByLabel('Move crane left').disabled).toBe(true);
      expect(buttonByLabel('Move crane right').disabled).toBe(true);

      act(() => { buttonByText('Power OFF').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(live.host.textContent).toContain('Field off');
      expect(buttonByLabel('Move crane left').disabled).toBe(false);
      expect(buttonByLabel('Move crane right').disabled).toBe(false);
    } finally {
      live.close();
    }
  });

  it('keeps the evidence board responsive and free of automated WCAG A/AA violations', async () => {
    const source = readFileSync(TOOL_PATH, 'utf8');
    expect(source).toContain('.mag-crane-ledger{grid-template-columns:repeat(2,minmax(0,1fr))}');
    expect(source).toContain('.mag-crane-metric:last-child{grid-column:1/-1}');
    expect(source).toContain('@keyframes mag-crane-flow');
    expect(source).toContain('@media(prefers-reduced-motion:reduce)');
    resetStemLab();
    loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const html = renderTool('magnetism', { magnetism: craneSeed({
      craneSlot: 1, cranePredictions: { nail: true, foil: true, clip: false },
      craneTests: { nail: { predicted: true, lifted: true }, foil: { predicted: true, lifted: false } },
      craneDeposited: { nail: true },
      craneItems: { 1: 'foil', 2: 'clip', 3: 'penny', 4: 'nickel', 5: 'ruler', 6: 'cobalt', 7: 'pencil' },
    }) });
    const host = document.createElement('main');
    host.innerHTML = html;
    document.body.appendChild(host);
    try {
      const results = await axe.run(host, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
        rules: { 'color-contrast': { enabled: false } },
      });
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    } finally {
      host.remove();
    }
  }, 60000);
});

describe('magnetism Materials visual pattern sorter', () => {
  const perfectGuesses = {
    nail: true, foil: false, clip: true, penny: false,
    nickel: true, ruler: false, cobalt: true, pencil: false,
  };

  function materialSeed(extra = {}) {
    return Object.assign({
      tab: 'materials', learningMode: 'guided', matGuesses: {}, matRevealed: false,
      matPerfect: false, matRewarded: false, matBest: 0,
      domainAlign: 0, domainField: 0, domainBranch: 1, domainMaterial: 'soft', domainHistory: false,
    }, extra);
  }

  it('interleaves samples and distinguishes readiness, metal traps, family misses, and perfect evidence', () => {
    const empty = physics.materialSortEvidenceState({}, false);
    expect(empty.items.map((item) => item.id)).toEqual(['nail', 'foil', 'clip', 'penny', 'nickel', 'ruler', 'cobalt', 'pencil']);
    expect(empty).toMatchObject({ answeredCount: 0, unansweredCount: 8, allAnswered: false, status: 'collecting' });
    expect(empty.predictionGroups).toMatchObject({ lift: [], noPull: [] });
    expect(empty.predictionGroups.waiting).toHaveLength(8);

    const ready = physics.materialSortEvidenceState(perfectGuesses, false);
    expect(ready).toMatchObject({ answeredCount: 8, correctCount: 8, wrongCount: 0, allAnswered: true, perfect: true, status: 'ready' });
    expect(ready.predictionGroups.lift.map((item) => item.id)).toEqual(['nail', 'clip', 'nickel', 'cobalt']);
    expect(physics.materialSortEvidenceState(perfectGuesses, true)).toMatchObject({ status: 'perfect', correctCount: 8, perfect: true });

    const metalTrap = physics.materialSortEvidenceState({ ...perfectGuesses, foil: true }, true);
    expect(metalTrap).toMatchObject({ status: 'metal-trap', correctCount: 7, wrongCount: 1 });
    expect(metalTrap.metalFalsePositives.map((item) => item.id)).toEqual(['foil']);
    expect(metalTrap.ferromagneticMisses).toEqual([]);

    const familyMiss = physics.materialSortEvidenceState({ ...perfectGuesses, cobalt: false }, true);
    expect(familyMiss).toMatchObject({ status: 'family-miss', correctCount: 7 });
    expect(familyMiss.ferromagneticMisses.map((item) => item.id)).toEqual(['cobalt']);
    expect(physics.materialSortEvidenceState({ unknown: true }, false).answeredCount).toBe(0);
  });

  it('records lane, misconception, and family evidence in the notebook and mission review', () => {
    const metrics = physics.notebookMetricSnapshot({ magnetism: materialSeed({
      matGuesses: { ...perfectGuesses, foil: true }, matRevealed: true, matBest: 7,
    }) });
    expect(metrics.find((metric) => metric.key === 'material_predictions')).toMatchObject({ value: 8, unit: '/8' });
    expect(metrics.find((metric) => metric.key === 'material_score')).toMatchObject({ value: 7, unit: '/8' });
    expect(metrics.find((metric) => metric.key === 'material_metal_traps')).toMatchObject({ value: 1, unit: 'samples' });
    expect(metrics.find((metric) => metric.key === 'material_family_misses')).toMatchObject({ value: 0, unit: 'samples' });

    const review = physics.missionEvidenceReviewState('shield_path', { magnetism: {
      matPerfect: true, matBest: 8, domainsFull: true, earthSeen: true, craneRewarded: true,
    } });
    const materialStep = review.steps.find((step) => step.questId === 'mag_materials');
    expect(materialStep.done).toBe(true);
    expect(materialStep.evidence).toContain('best sort 8/8');
    expect(materialStep.evidence).toContain('iron, nickel, cobalt, and iron-rich steel');
  });

  it('renders an interleaved prediction board and advances to a clear test-ready state', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const initial = renderTool('magnetism', { magnetism: materialSeed() });
    expect(initial).toContain('Live prediction board');
    expect(initial).toContain('0/8 predictions');
    expect(initial).toContain('Predicts lift');
    expect(initial).toContain('Awaiting choice');
    expect(initial).toContain('Predicts no pull');
    expect(initial).toContain('Next action · Keep classifying');
    expect(initial).toContain('Try aluminum foil next');
    expect(initial).toContain('Optional theory preview · magnetic domains');
    expect(initial).not.toContain('Pattern found:');
    expect(initial.indexOf('Iron nail')).toBeLessThan(initial.indexOf('Aluminum foil'));
    expect(initial.indexOf('Aluminum foil')).toBeLessThan(initial.indexOf('Steel paperclip'));

    const ready = renderTool('magnetism', { magnetism: materialSeed({ matGuesses: perfectGuesses }) });
    expect(ready).toContain('8/8 predictions');
    expect(ready).toContain('aria-valuenow="8"');
    expect(ready).toContain('Next action · Ready for the field test');
    expect(ready).toContain('🧲 Run magnet test');
    expect(ready).toContain('aria-label="Predict Aluminum foil will show no pull"');
  });

  it('makes perfect and revised reveals scannable through named response groups and symbols', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const perfect = renderTool('magnetism', { magnetism: materialSeed({
      matGuesses: perfectGuesses, matRevealed: true, matPerfect: true, matRewarded: true, matBest: 8,
    }) });
    expect(perfect).toContain('Observed magnet response');
    expect(perfect).toContain('Lifted · ferromagnetic');
    expect(perfect).toContain('No pull · other metals');
    expect(perfect).toContain('No pull · nonmetals');
    expect(perfect).toContain('Next action · Pattern secured · 8/8');
    expect(perfect).toContain('data-result="confirmed"');
    expect(perfect).toContain('Prediction confirmed · observed');
    expect(perfect).toContain('Pattern found:');
    expect(perfect).toContain('“Metal” alone was not enough');

    const revised = renderTool('magnetism', { magnetism: materialSeed({
      matGuesses: { ...perfectGuesses, foil: true }, matRevealed: true, matBest: 7,
    }) });
    expect(revised).toContain('Next action · Revise “all metals”');
    expect(revised).toContain('data-result="revised"');
    expect(revised).toContain('Prediction revised · observed — no pull');
    expect(revised).toContain('Why this result?');
    expect(revised).toContain('Aluminum is a metal, but NOT ferromagnetic');
  });

  it('updates live prediction lanes, runs the magnet test, and resets while retaining mastery', () => {
    resetStemLab();
    const cfg = loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const live = mountInteractive(cfg, materialSeed());
    try {
      const tile = (id) => live.host.querySelector('[data-material-id="' + id + '"]');
      const runButton = () => [...live.host.querySelectorAll('button')].find((button) => button.textContent.includes('Run magnet test') || button.textContent.includes('/8 predicted'));
      expect(runButton().disabled).toBe(true);
      physics.CRANE_ORDER.forEach((id) => {
        const material = physics.MATERIALS.find((item) => item.id === id);
        const label = material.magnetic ? 'will lift' : 'will show no pull';
        const button = tile(id).querySelector('button[aria-label="Predict ' + material.name + ' ' + label + '"]');
        act(() => { button.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      });
      expect(live.host.textContent).toContain('8/8 predictions');
      expect(runButton().disabled).toBe(false);
      act(() => { runButton().dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(live.host.textContent).toContain('Observed magnet response');
      expect(live.host.textContent).toContain('Pattern secured · 8/8');
      expect(live.host.querySelectorAll('[data-result="confirmed"]')).toHaveLength(8);

      const reset = [...live.host.querySelectorAll('button')].find((button) => button.textContent.includes('Sort again'));
      act(() => { reset.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(live.host.textContent).toContain('Live prediction board');
      expect(live.host.textContent).toContain('0/8 predictions');
      expect(runButton().disabled).toBe(true);
    } finally {
      live.close();
    }
  });

  it('keeps the sorter responsive, motion-safe, reward-safe, and free of automated WCAG violations', async () => {
    const source = readFileSync(TOOL_PATH, 'utf8');
    expect(source).toContain('.mag-material-flow,.mag-root .mag-material-rule,.mag-root .mag-material-grid{grid-template-columns:1fr}');
    expect(source).toContain('@keyframes mag-material-test');
    expect(source).toContain('@media(prefers-reduced-motion:reduce)');
    expect(source).toContain('evidence.perfect && !d.matRewarded');
    resetStemLab();
    loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const html = renderTool('magnetism', { magnetism: materialSeed({
      matGuesses: { ...perfectGuesses, foil: true }, matRevealed: true, matBest: 7,
    }) });
    const host = document.createElement('main');
    host.innerHTML = html;
    document.body.appendChild(host);
    try {
      const results = await axe.run(host, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
        rules: { 'color-contrast': { enabled: false } },
      });
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    } finally {
      host.remove();
    }
  }, 60000);
});

describe('magnetism Quiz visual evidence journey', () => {
  function quizSeed(extra = {}) {
    return Object.assign({
      tab: 'quiz', learningMode: 'guided',
      quizIdx: 0, quizScore: 0, quizPicked: null, quizDone: false,
      quizBest: 0, quizMissed: [], quizRewarded: false,
    }, extra);
  }

  function withRenderedHtml(html, callback) {
    const host = document.createElement('main');
    host.innerHTML = html;
    document.body.appendChild(host);
    try {
      return callback(host);
    } finally {
      host.remove();
    }
  }

  it('sanitizes restored history and derives streak, trail, and topic evidence once', () => {
    const state = physics.quizEvidenceState(6, 4, null, [1, 4, 4, -1, 99, 'bad'], false);
    expect(state).toMatchObject({
      total: 22, index: 6, score: 4, answeredCount: 6,
      missed: [1, 4], missedCount: 2, historyComplete: true,
      progressPercent: 27, currentStreak: 1, bestStreak: 2,
      pass: false, neededForPass: 11,
    });
    expect(state.progress.slice(0, 8).map((step) => step.state)).toEqual([
      'confirmed', 'revised', 'confirmed', 'confirmed',
      'revised', 'confirmed', 'current', 'upcoming',
    ]);
    expect(state.topics.map((topic) => topic.id)).toEqual([
      'field', 'electro', 'motor', 'earth',
      'induce', 'materials', 'transformer', 'maze',
    ]);
    expect(state.topics.find((topic) => topic.id === 'field')).toMatchObject({
      total: 4, answered: 3, correct: 2, missed: 1, status: 'review',
    });
    expect(state.topics.find((topic) => topic.id === 'electro')).toMatchObject({
      total: 4, answered: 3, correct: 2, missed: 1, status: 'review',
    });

    const pickedWrong = physics.quizEvidenceState(4, 3, (physics.QUIZ[4].c + 1) % 4, [], false);
    expect(pickedWrong.missed).toEqual([4]);
    expect(pickedWrong.progress[4].state).toBe('revised');
    expect(physics.quizEvidenceState('bad', 999, undefined, 'bad', false)).toMatchObject({
      index: 0, score: 22, answeredCount: 0, missed: [], progressPercent: 0,
    });
  });

  it('renders a lettered claim deck, live HUD, and a 22-step color-independent trail', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const html = renderTool('magnetism', { magnetism: quizSeed() });
    withRenderedHtml(html, (host) => {
      expect(host.textContent).toContain('Live quiz evidence');
      expect(host.textContent).toContain('Current streak');
      expect(host.textContent).toContain('Mastery target');
      expect(host.textContent).toContain('Build the strongest claim');
      expect(host.textContent).toContain('Choose one answer. Your evidence locks after selection.');
      expect(host.querySelectorAll('.mag-quiz-step')).toHaveLength(22);
      expect(host.querySelectorAll('.mag-quiz-step[data-state="current"]')).toHaveLength(1);
      expect(host.querySelectorAll('.mag-quiz-step[data-state="upcoming"]')).toHaveLength(21);
      expect(host.querySelector('.mag-quiz-step').getAttribute('aria-label')).toContain('current question');
      expect(host.querySelectorAll('.mag-quiz-option')).toHaveLength(4);
      expect(host.querySelector('.mag-quiz-option').getAttribute('aria-label')).toMatch(/^Option A:/);
      expect([...host.querySelectorAll('.mag-quiz-letter')].map((node) => node.textContent)).toEqual(['A', 'B', 'C', 'D']);
      expect(host.querySelector('.mag-quiz-progress').getAttribute('aria-valuenow')).toBe('0');
    });
  });

  it('updates the evidence trail through a confirmed answer, next question, and revision', () => {
    resetStemLab();
    const cfg = loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const live = mountInteractive(cfg, quizSeed());
    try {
      const options = () => [...live.host.querySelectorAll('.mag-quiz-option')];
      const buttonContaining = (text) => [...live.host.querySelectorAll('button')].find((button) => button.textContent.includes(text));
      act(() => { options()[physics.QUIZ[0].c].dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(live.host.textContent).toContain('Evidence confirmed');
      expect(live.host.textContent).toContain('Next: carry this model into the next question.');
      expect(live.host.querySelectorAll('.mag-quiz-step[data-state="confirmed"]')).toHaveLength(1);
      expect(live.host.querySelector('.mag-quiz-progress').getAttribute('aria-valuenow')).toBe('1');
      expect(options().every((button) => button.disabled)).toBe(true);

      act(() => { buttonContaining('Next question').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(live.host.textContent).toContain('Question 2 / 22');
      expect(live.host.textContent).toContain('1claim confirmed');
      const wrongIndex = [0, 1, 2, 3].find((index) => index !== physics.QUIZ[1].c);
      act(() => { options()[wrongIndex].dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(live.host.textContent).toContain('Claim revised');
      expect(live.host.textContent).toContain('is saved for review');
      expect(live.host.querySelectorAll('.mag-quiz-step[data-state="revised"]')).toHaveLength(1);
      expect(live.host.querySelectorAll('.mag-quiz-option[data-state="correct"]')).toHaveLength(1);
      expect(live.host.querySelectorAll('.mag-quiz-option[data-state="revised"]')).toHaveLength(1);
      expect(live.host.textContent).toContain('0claims confirmed');
    } finally {
      live.close();
    }
  });

  it('turns results into a score ring and an eight-topic mastery map with direct study routes', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const misses = [0, 3, 7, 12, 14];
    const html = renderTool('magnetism', { magnetism: quizSeed({
      quizIdx: 21, quizDone: true, quizScore: 17, quizBest: 18,
      quizMissed: misses, quizRewarded: true,
    }) });
    withRenderedHtml(html, (host) => {
      expect(host.querySelector('.mag-quiz-results').getAttribute('data-pass')).toBe('true');
      expect(host.querySelector('.mag-quiz-ring').getAttribute('aria-label')).toBe('Quiz score 17 out of 22');
      expect(host.textContent).toContain('Field mastery unlocked');
      expect(host.textContent).toContain('Best score18/22');
      expect(host.textContent).toContain('Topic mastery map');
      expect(host.querySelectorAll('.mag-quiz-topic-card')).toHaveLength(8);
      expect(host.querySelectorAll('.mag-quiz-topic-card[data-status="review"]')).toHaveLength(5);
      expect(host.querySelectorAll('.mag-quiz-topic-card[data-status="secure"]')).toHaveLength(3);
      expect(host.querySelectorAll('.mag-quiz-topic-track[role="progressbar"]')).toHaveLength(8);
      expect(host.textContent).toContain('Study: 🧭 Field Explorer');
      expect(host.textContent).toContain('Study: 🔌 Electromagnet');
      expect(host.textContent).toContain('Study: 🌍 Earth’s Field');
      expect(host.textContent).toContain('Study: 🔁 Transformer');
      expect(host.textContent).toContain('Study: 🔩 Materials');
      expect(host.textContent).not.toContain('Partial response history');
    });

    const perfect = renderTool('magnetism', { magnetism: quizSeed({
      quizIdx: 21, quizDone: true, quizScore: 22, quizBest: 22,
      quizMissed: [], quizRewarded: true,
    }) });
    withRenderedHtml(perfect, (host) => {
      expect(host.querySelectorAll('.mag-quiz-topic-card[data-status="secure"]')).toHaveLength(8);
      expect(host.textContent).toContain('All topics secure');
      expect(host.textContent).not.toContain('Study:');
      expect(host.textContent).not.toContain('missed questions came from');
    });
  });

  it('awards quiz XP once and treats a legacy passing best as already rewarded', () => {
    resetStemLab();
    const cfg = loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const awards = [];
    const finalAnswer = physics.QUIZ[21].c;
    const fresh = mountInteractive(cfg, quizSeed({
      quizIdx: 21, quizScore: 15, quizPicked: finalAnswer,
      quizBest: 14, quizMissed: [0, 1, 2, 3, 4, 5, 6],
    }), { awardXP: (amount) => awards.push(amount) });
    try {
      const results = [...fresh.host.querySelectorAll('button')].find((button) => button.textContent.includes('See mastery map'));
      act(() => { results.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(awards).toEqual([20]);
      expect(fresh.host.textContent).toContain('Quiz complete');
    } finally {
      fresh.close();
    }

    const legacyAwards = [];
    const legacy = mountInteractive(cfg, quizSeed({
      quizIdx: 21, quizScore: 15, quizPicked: finalAnswer,
      quizBest: 15, quizMissed: [0, 1, 2, 3, 4, 5, 6],
    }), { awardXP: (amount) => legacyAwards.push(amount) });
    try {
      const results = [...legacy.host.querySelectorAll('button')].find((button) => button.textContent.includes('See mastery map'));
      act(() => { results.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(legacyAwards).toEqual([]);
    } finally {
      legacy.close();
    }

    const source = readFileSync(TOOL_PATH, 'utf8');
    expect(source).toContain('quizPassed && !d.quizRewarded && previousBest < QUIZ_PASS');
    expect(source).toContain('quizRewarded: !!d.quizRewarded || quizPassed || previousBest >= QUIZ_PASS');
  });

  it('keeps active and result views responsive, motion-safe, and free of automated WCAG violations', async () => {
    const source = readFileSync(TOOL_PATH, 'utf8');
    expect(source).toContain('.mag-quiz-trail{grid-template-columns:repeat(6,minmax(0,1fr))}');
    expect(source).toContain('.mag-quiz-topics{grid-template-columns:1fr}');
    expect(source).toContain('.mag-quiz-results-hero{grid-template-columns:1fr;justify-items:center;text-align:center}');
    expect(source).toContain('@keyframes mag-quiz-current');
    expect(source).toContain('@media(prefers-reduced-motion:reduce)');

    resetStemLab();
    loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const states = [
      quizSeed({ quizIdx: 1, quizScore: 1, quizPicked: 0, quizMissed: [1] }),
      quizSeed({ quizIdx: 21, quizDone: true, quizScore: 17, quizBest: 17, quizMissed: [0, 3, 7, 12, 14], quizRewarded: true }),
    ];
    for (const seed of states) {
      const html = renderTool('magnetism', { magnetism: seed });
      const host = document.createElement('main');
      host.innerHTML = html;
      document.body.appendChild(host);
      try {
        const results = await axe.run(host, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
          rules: { 'color-contrast': { enabled: false } },
        });
        expect(results.violations.map((violation) => violation.id)).toEqual([]);
      } finally {
        host.remove();
      }
    }
  }, 60000);
});

describe('magnetism Magnetic memory visual experiment', () => {
  function domainSeed(extra = {}) {
    return Object.assign({
      tab: 'materials', learningMode: 'guided',
      matGuesses: {
        nail: true, foil: false, clip: true, penny: false,
        nickel: true, ruler: false, cobalt: true, pencil: false,
      },
      matRevealed: true, matPerfect: true, matRewarded: true, matBest: 8,
      domainAlign: 0, domainField: 0, domainBranch: 1, domainMaterial: 'soft', domainHistory: false,
      domainsFull: false, domainSaturatedSeen: false, domainRemanenceSeen: false,
      domainReversedSeen: false, domainErasedSeen: false,
    }, extra);
  }

  function withDomainHost(seed, callback) {
    resetStemLab();
    loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const html = renderTool('magnetism', { magnetism: domainSeed(seed) });
    const host = document.createElement('main');
    host.innerHTML = html;
    document.body.appendChild(host);
    try {
      return callback(host, html);
    } finally {
      host.remove();
    }
  }

  it('derives a defensive three-moment evidence story from the signed hysteresis model', () => {
    const initial = physics.domainMemoryEvidenceState('unknown', 'bad', 0, false, 'bad', {});
    expect(initial).toMatchObject({
      materialKey: 'soft', field: 0, branch: 1, magnetization: 0,
      phase: 'scrambled', completedCount: 0, currentIndex: 0,
      nextAction: { key: 'magnetize', label: 'Stroke with magnet' },
    });

    const saturated = physics.domainMemoryEvidenceState('soft', 4, 1, true, 0, {});
    expect(saturated).toMatchObject({
      field: 1, phase: 'saturated', saturatedSeen: true,
      completedCount: 1, currentIndex: 1, nextAction: { key: 'remove' },
    });
    expect(saturated.signedPercent).toBeGreaterThan(95);

    const remanence = physics.domainMemoryEvidenceState('soft', 0, 1, true, 0, { saturated: true });
    expect(remanence).toMatchObject({
      phase: 'remanence', memoryAtZeroPercent: 49,
      completedCount: 2, currentIndex: 2, nextAction: { key: 'reverse' },
    });
    expect(remanence.magnetization).toBeGreaterThan(0);

    const coerciveBattle = physics.domainMemoryEvidenceState('hard', -0.3, 1, true, 0, { saturated: true, remanence: true });
    expect(coerciveBattle.phase).toBe('coercive');
    expect(coerciveBattle.magnetization).toBeGreaterThan(0);

    const reversed = physics.domainMemoryEvidenceState('hard', -1, 1, true, 0, { saturated: true, remanence: true });
    expect(reversed).toMatchObject({
      phase: 'reversed', reversedSeen: true, completedCount: 3,
      complete: true, currentIndex: -1, nextAction: { key: 'compare' },
    });
    expect(reversed.comparisons.find((item) => item.id === 'hard').remanencePercent)
      .toBeGreaterThan(reversed.comparisons.find((item) => item.id === 'soft').remanencePercent);
  });

  it('carries signed field, remanence, and reversal evidence into notebook and Mission Control', () => {
    const state = domainSeed({
      domainMaterial: 'hard', domainField: 0, domainBranch: 1, domainHistory: true, domainAlign: 0.95,
      domainsFull: true, domainSaturatedSeen: true, domainRemanenceSeen: true, domainReversedSeen: true,
      earthSeen: true, craneRewarded: true,
    });
    const metrics = physics.notebookMetricSnapshot({ magnetism: state });
    expect(metrics.find((metric) => metric.key === 'domain_field')).toMatchObject({ value: 0, unit: 'relative H' });
    const signedMetric = metrics.find((metric) => metric.key === 'domain_signed_m');
    expect(signedMetric).toMatchObject({ unit: '%' });
    expect(Math.round(signedMetric.value)).toBe(95);
    expect(metrics.find((metric) => metric.key === 'domain_remanence')).toMatchObject({ value: 95, unit: '%' });

    const review = physics.missionEvidenceReviewState('shield_path', { magnetism: state });
    const step = review.steps.find((entry) => entry.questId === 'mag_domains');
    expect(step.done).toBe(true);
    expect(step.evidence).toContain('Domain evidence: saturation reached');
    expect(step.evidence).toContain('Hard steel retains about 95% modeled magnetization at H = 0');
    expect(step.evidence).toContain('reverse saturation observed');
  });

  it('renders a scannable comparison, evidence trail, live HUD, and two labeled visual models', () => {
    withDomainHost({}, (host) => {
      expect(host.querySelectorAll('.mag-domain-material')).toHaveLength(2);
      expect(host.querySelector('.mag-domain-material[data-active="true"] b').textContent).toBe('Soft iron');
      expect(host.querySelectorAll('.mag-domain-step')).toHaveLength(3);
      expect(host.querySelectorAll('.mag-domain-step[data-state="current"]')).toHaveLength(1);
      expect(host.querySelectorAll('.mag-domain-step[data-state="upcoming"]')).toHaveLength(2);
      expect(host.querySelector('.mag-domain-progress').value).toBe(0);
      expect(host.querySelectorAll('.mag-domain-metric')).toHaveLength(4);
      expect(host.querySelectorAll('.mag-domain-figure')).toHaveLength(2);
      expect(host.querySelectorAll('.mag-domain-figure svg')).toHaveLength(2);
      expect(host.querySelector('.mag-domain-phase').getAttribute('data-phase')).toBe('scrambled');
      expect(host.querySelector('.mag-domain-next').textContent).toContain('Next action');
      expect(host.querySelector('.mag-domain-next').textContent).toContain('Stroke with magnet');
      expect(host.textContent).toContain('Memory at H = 0');
      expect(host.textContent).toContain('Coercive threshold');
      expect(host.textContent).toContain('Mixed = cancels');
    });
  });

  it('guides magnetize, remanence, and reversal live while awarding saturation only once', () => {
    resetStemLab();
    const cfg = loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const awards = [];
    const announcements = [];
    const live = mountInteractive(cfg, domainSeed(), {
      awardXP: (amount) => awards.push(amount),
      announceToSR: (message) => announcements.push(message),
    });
    try {
      const next = () => live.host.querySelector('.mag-domain-next button');
      const phase = () => live.host.querySelector('.mag-domain-phase');
      const progress = () => live.host.querySelector('.mag-domain-progress').value;
      const action = (label) => [...live.host.querySelectorAll('.mag-domain-actions button')].find((button) => button.textContent.trim() === label);

      act(() => { next().dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(phase().getAttribute('data-phase')).toBe('saturated');
      expect(progress()).toBe(1);
      expect(awards).toEqual([10]);

      act(() => { next().dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(phase().getAttribute('data-phase')).toBe('remanence');
      expect(progress()).toBe(2);
      expect(live.host.querySelectorAll('.mag-domain-metric b')[1].textContent).toBe('+49%');
      expect(announcements.at(-1)).toContain('Signed net magnetization 49 percent');

      act(() => { next().dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(phase().getAttribute('data-phase')).toBe('reversed');
      expect(progress()).toBe(3);
      expect(live.host.querySelector('.mag-domain-next').getAttribute('data-complete')).toBe('true');
      expect(awards).toEqual([10]);

      act(() => { action('Heat it').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(phase().getAttribute('data-phase')).toBe('scrambled');
      expect(progress()).toBe(3);
      expect(live.host.textContent).toContain('Extra evidence captured');
      act(() => { action('Stroke with magnet').dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      expect(awards).toEqual([10]);
    } finally {
      live.close();
    }
  });

  it('resets the evidence run when comparing materials but preserves the earned reward', () => {
    resetStemLab();
    const cfg = loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const awards = [];
    const live = mountInteractive(cfg, domainSeed({
      domainField: -1, domainBranch: 1, domainHistory: true, domainAlign: 0.95, domainsFull: true,
      domainSaturatedSeen: true, domainRemanenceSeen: true, domainReversedSeen: true,
    }), { awardXP: (amount) => awards.push(amount) });
    try {
      expect(live.host.querySelector('.mag-domain-progress').value).toBe(3);
      const compare = live.host.querySelector('.mag-domain-next button');
      act(() => { compare.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
      const active = live.host.querySelector('.mag-domain-material[data-active="true"]');
      expect(active.textContent).toContain('Hard steel');
      expect(active.textContent).toContain('95%');
      expect(live.host.querySelector('.mag-domain-progress').value).toBe(0);
      expect(live.host.querySelectorAll('.mag-domain-step[data-state="done"]')).toHaveLength(0);
      expect(live.host.querySelector('.mag-domain-phase').getAttribute('data-phase')).toBe('scrambled');
      expect(live.host.querySelector('.mag-domain-next').textContent).toContain('Stroke with magnet');
      expect(awards).toEqual([]);
    } finally {
      live.close();
    }
  });

  it('keeps the experiment responsive, motion-safe, and free of automated WCAG violations', async () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const source = readFileSync(TOOL_PATH, 'utf8');
    expect(source).toContain('.mag-domain-materials{grid-template-columns:1fr}');
    expect(source).toContain('.mag-domain-visuals{grid-template-columns:1fr}');
    expect(source).toContain('.mag-domain-hud{grid-template-columns:repeat(2,minmax(0,1fr))}');
    expect(source).toContain('@keyframes mag-domain-current');
    expect(source).toContain('@media(prefers-reduced-motion:reduce)');

    const html = renderTool('magnetism', { magnetism: domainSeed({
      domainMaterial: 'hard', domainField: -0.3, domainBranch: 1, domainHistory: true, domainAlign: 0.73,
      domainSaturatedSeen: true, domainRemanenceSeen: true,
    }) });
    const host = document.createElement('main');
    host.innerHTML = html;
    document.body.appendChild(host);
    try {
      const results = await axe.run(host, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
        rules: { 'color-contrast': { enabled: false } },
      });
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    } finally {
      host.remove();
    }
  }, 60000);
});
