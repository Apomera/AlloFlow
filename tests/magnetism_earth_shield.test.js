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

function earthSeed(extra = {}) {
  return Object.assign({
    tab: 'earth', learningMode: 'guided', declination: 12,
    earthSolarWind: 5, earthShieldBaseline: null, earthShieldPrediction: null,
    earthShieldResultSeen: false, earthShieldRuns: 0, earthSeen: true,
    earthView: '2d', earth3dStatus: 'loading', earth3dAttempt: 0,
    earth3dUsed: false, earth3dFieldLines: true, earth3dBoundary: true,
    earth3dBelts: true, earth3dWind: true, earth3dReference: true,
    earth3dMotion: false, notebookOpen: false,
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

function withEarthHost(seed, callback) {
  resetStemLab();
  loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
  const html = renderTool('magnetism', { magnetism: earthSeed(seed) });
  const host = document.createElement('main');
  host.innerHTML = html;
  document.body.appendChild(host);
  try {
    return callback(host, html);
  } finally {
    host.remove();
  }
}

describe('magnetism Earth Shield Watch investigation', () => {
  it('derives a defensive three-step quiet-to-storm evidence signature from the existing model', () => {
    expect(physics.EARTH_SHIELD_PREDICTIONS.map((option) => option.id)).toEqual([
      'compress_stretch_equatorward', 'expand_shorten_poleward', 'compress_shorten_poleward', 'unchanged',
    ]);

    const invalid = physics.earthShieldEvidenceState('bad', { pressure: 3 }, 'compress_stretch_equatorward', true);
    expect(invalid).toMatchObject({ baseline: null, prediction: null, resultCaptured: false, phase: 'setup', completedCount: 0, currentIndex: 0 });
    expect(invalid.current).toMatchObject({ pressure: 5, activity: 'active' });

    const baseline = physics.earthShieldEvidenceState(2, { pressure: 2 }, null, false);
    expect(baseline).toMatchObject({ phase: 'predict', completedCount: 1, currentIndex: 1, currentMatchesExpected: true });
    const ready = physics.earthShieldEvidenceState(5, { pressure: 2 }, 'unchanged', false);
    expect(ready).toMatchObject({ phase: 'ready', completedCount: 2, resultCaptured: false, currentMatchesExpected: false });
    expect(ready.currentComparison).toContain('restore the controlled path');

    const confirmed = physics.earthShieldEvidenceState(10, { pressure: 2 }, 'compress_stretch_equatorward', true);
    expect(confirmed).toMatchObject({ phase: 'confirmed', predictionCorrect: true, complete: true, completedCount: 3, currentMatchesExpected: true });
    expect(confirmed.daysideCompressionRE).toBeCloseTo(3.7333333333, 8);
    expect(confirmed.tailExtensionRE).toBeCloseTo(13.3333333333, 8);
    expect(confirmed.auroralEquatorwardShift).toBe(8);
    expect(confirmed.storm.daysideRadiusRE).toBeLessThan(confirmed.baseline.daysideRadiusRE);
    expect(confirmed.storm.tailReachRE).toBeGreaterThan(confirmed.baseline.tailReachRE);
    expect(confirmed.storm.auroralLatitude).toBeLessThan(confirmed.baseline.auroralLatitude);

    const revised = physics.earthShieldEvidenceState(10, { pressure: 2 }, 'unchanged', true);
    expect(revised).toMatchObject({ phase: 'revised', predictionCorrect: false, complete: true });
    expect(revised.predictions.find((option) => option.id === 'compress_stretch_equatorward').state).toBe('model');
    expect(revised.predictions.find((option) => option.id === 'unchanged').state).toBe('revised');
  });

  it('preserves default Earth metrics and adds completed Shield Watch deltas to the notebook', () => {
    const defaults = physics.notebookMetricSnapshot({ magnetism: { tab: 'earth', earthSolarWind: 8 } });
    expect(defaults.map((metric) => metric.key)).toEqual(['solar_wind', 'dayside_RE']);

    const state = earthSeed({
      earthSolarWind: 10, earthShieldBaseline: { pressure: 2 },
      earthShieldPrediction: 'compress_stretch_equatorward', earthShieldResultSeen: true,
      notebookOpen: true,
    });
    const metrics = physics.notebookMetricSnapshot({ magnetism: state });
    expect(metrics.map((metric) => metric.key)).toEqual([
      'solar_wind', 'dayside_RE', 'shield_dayside_compression', 'shield_tail_extension', 'shield_aurora_shift',
    ]);
    const daysideMetric = metrics.find((metric) => metric.key === 'shield_dayside_compression');
    const tailMetric = metrics.find((metric) => metric.key === 'shield_tail_extension');
    const auroraMetric = metrics.find((metric) => metric.key === 'shield_aurora_shift');
    expect(daysideMetric).toMatchObject({ unit: 'R_E inward', display: '3.7 R_E inward' });
    expect(daysideMetric.value).toBeCloseTo(3.7333333333, 8);
    expect(tailMetric).toMatchObject({ unit: 'R_E longer', display: '13.3 R_E longer' });
    expect(tailMetric.value).toBeCloseTo(13.3333333333, 8);
    expect(auroraMetric).toMatchObject({ value: 8, unit: 'deg equatorward', display: '8 deg equatorward' });

    withEarthHost(state, (_host, html) => {
      expect(html).toContain('Shield Watch: dayside 3.7 R⊕ inward');
      expect(html).toContain('tail 13.3 R⊕ longer');
      expect(html).toContain('aurora 8° equatorward');
    });
  });

  it('renders a clear visual trail, prediction deck, hidden comparison, live HUD, and existing 2D model', () => {
    withEarthHost({ earthSolarWind: 2, earthShieldBaseline: { pressure: 2 } }, (host) => {
      expect(host.querySelector('.mag-earth-stage').getAttribute('data-activity')).toBe('quiet');
      expect(host.querySelector('.mag-earth-shield').getAttribute('data-phase')).toBe('predict');
      expect(host.querySelector('[data-magnetism-shield-inquiry="true"]')).toBeTruthy();
      expect(host.querySelectorAll('.mag-earth-shield-step')).toHaveLength(3);
      expect(host.querySelectorAll('.mag-earth-shield-step[data-state="done"]')).toHaveLength(1);
      expect(host.querySelectorAll('.mag-earth-shield-step[data-state="current"]')).toHaveLength(1);
      expect(host.querySelector('.mag-earth-shield-progress').value).toBe(1);
      expect(host.querySelectorAll('.mag-earth-prediction')).toHaveLength(4);
      expect(host.querySelectorAll('.mag-earth-reading')).toHaveLength(2);
      expect(host.querySelector('.mag-earth-change').textContent).toContain('dayside ?');
      expect(host.querySelector('.mag-earth-reading[data-reading="storm"]').textContent).toContain('result hidden');
      expect(host.querySelectorAll('.mag-earth-metric')).toHaveLength(4);
      expect(host.querySelectorAll('.mag-earth-metric b')[0].textContent).toBe('2/10');
      expect(host.querySelector('.mag-earth-controls').open).toBe(true);
      expect(host.querySelector('svg[aria-label*="solar-wind pressure 2 of 10"]')).toBeTruthy();
      expect(host.textContent).toContain('Choose one response signature');
      expect(host.textContent).not.toContain('dayside −3.7 R⊕');
    });
  });

  it('guides a live quiet-to-storm run from prediction to confirmed evidence', () => {
    resetStemLab();
    const cfg = loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const announcements = [];
    const live = mountInteractive(cfg, earthSeed(), { announceToSR: (message) => announcements.push(message) });
    const click = (element) => act(() => { element.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    try {
      click(live.host.querySelector('.mag-earth-shield-next button'));
      expect(live.host.querySelector('.mag-earth-shield').getAttribute('data-phase')).toBe('predict');
      expect(live.host.querySelector('.mag-earth-stage').getAttribute('data-activity')).toBe('quiet');
      expect(live.host.querySelectorAll('.mag-earth-metric b')[0].textContent).toBe('2/10');

      const correct = [...live.host.querySelectorAll('.mag-earth-prediction')]
        .find((button) => button.textContent.includes('Inward · longer · lower'));
      click(correct);
      expect(live.host.querySelector('.mag-earth-shield').getAttribute('data-phase')).toBe('ready');
      expect(live.host.querySelector('.mag-earth-prediction[data-state="selected"]')).toBe(correct);
      expect(live.host.querySelector('.mag-earth-shield-progress').value).toBe(2);

      click(live.host.querySelector('.mag-earth-shield-next button'));
      expect(live.host.querySelector('.mag-earth-shield').getAttribute('data-phase')).toBe('confirmed');
      expect(live.host.querySelector('.mag-earth-stage').getAttribute('data-activity')).toBe('storm-level');
      expect(live.host.querySelector('.mag-earth-verdict').getAttribute('data-result')).toBe('confirmed');
      expect(live.host.querySelector('.mag-earth-prediction[data-state="model"]')).toBeTruthy();
      expect(live.host.querySelector('.mag-earth-change').textContent).toContain('dayside −3.7 R⊕');
      expect(live.host.querySelector('.mag-earth-change').textContent).toContain('tail +13.3 R⊕');
      expect(live.host.querySelector('.mag-earth-change').textContent).toContain('aurora −8° lat');
      expect(live.host.querySelectorAll('.mag-earth-metric b')[0].textContent).toBe('10/10');
      expect(live.host.querySelector('.mag-earth-reading[data-reading="storm"]').textContent).toContain('5.6 R⊕');
      expect(live.host.textContent).toContain('Completion counts the controlled comparison');
      expect(announcements.filter((message) => message.startsWith('Storm pulse captured.'))).toHaveLength(1);
      expect(announcements.at(-1)).toContain('evidence confirmed your prediction');
    } finally {
      live.close();
    }
  });

  it('treats revision as useful evidence, resets cleanly, and flags free exploration after baseline', () => {
    resetStemLab();
    const cfg = loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const live = mountInteractive(cfg, earthSeed());
    const click = (element) => act(() => { element.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    try {
      click(live.host.querySelector('.mag-earth-shield-next button'));
      const unchanged = [...live.host.querySelectorAll('.mag-earth-prediction')]
        .find((button) => button.textContent.includes('No linked change'));
      click(unchanged);
      click(live.host.querySelector('.mag-earth-shield-next button'));

      expect(live.host.querySelector('.mag-earth-shield').getAttribute('data-phase')).toBe('revised');
      expect(live.host.querySelector('.mag-earth-verdict').getAttribute('data-result')).toBe('revised');
      expect(live.host.querySelector('.mag-earth-prediction[data-state="revised"]').textContent).toContain('No linked change');
      expect(live.host.querySelector('.mag-earth-prediction[data-state="model"]').textContent).toContain('Inward · longer · lower');
      expect(live.host.textContent).toContain('Evidence revised your response signature');

      click(live.host.querySelector('.mag-earth-shield-next button'));
      expect(live.host.querySelector('.mag-earth-shield').getAttribute('data-phase')).toBe('setup');
      expect(live.host.querySelector('.mag-earth-shield-progress').value).toBe(0);
      expect(live.host.querySelectorAll('.mag-earth-prediction')).toHaveLength(0);
      expect(live.host.querySelectorAll('.mag-earth-metric b')[0].textContent).toBe('2/10');

      click(live.host.querySelector('.mag-earth-shield-next button'));
      const correct = [...live.host.querySelectorAll('.mag-earth-prediction')]
        .find((button) => button.textContent.includes('Inward · longer · lower'));
      click(correct);
      const activePreset = [...live.host.querySelectorAll('[aria-label="Solar-wind comparison presets"] button')]
        .find((button) => button.textContent.includes('Active · 5'));
      click(activePreset);
      expect(live.host.querySelector('.mag-earth-control-note').textContent).toContain('restore the controlled path');
      expect(live.host.querySelector('.mag-earth-stage').getAttribute('data-activity')).toBe('active');
      click(live.host.querySelector('.mag-earth-shield-next button'));
      expect(live.host.querySelector('.mag-earth-shield').getAttribute('data-phase')).toBe('confirmed');
      expect(live.host.querySelectorAll('.mag-earth-metric b')[0].textContent).toBe('10/10');
    } finally {
      live.close();
    }
  });

  it('keeps Shield Watch responsive, motion-safe, honest, and free of automated WCAG violations', async () => {
    const source = readFileSync(TOOL_PATH, 'utf8');
    expect(source).toContain('.mag-earth-comparison{grid-template-columns:1fr}');
    expect(source).toContain('.mag-earth-hud{grid-template-columns:repeat(2,minmax(0,1fr))}');
    expect(source).toContain('.mag-earth-prediction-grid{grid-template-columns:1fr}');
    expect(source).toContain('@keyframes mag-earth-current');
    expect(source).toContain('@keyframes mag-earth-live');
    expect(source).toContain('@media(prefers-reduced-motion:reduce)');
    expect(source).toContain('schematic teaching models, not to scale or suitable for forecasting');
    expect(source).toContain('There is no simple countdown to the next one.');
    expect(source).toContain("h('b', null, 'geodynamo')");

    resetStemLab();
    loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const html = renderTool('magnetism', { magnetism: earthSeed({
      earthSolarWind: 10, earthShieldBaseline: { pressure: 2 },
      earthShieldPrediction: 'unchanged', earthShieldResultSeen: true,
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
  }, 15000);
});
