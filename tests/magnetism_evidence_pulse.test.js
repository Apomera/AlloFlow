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

function electroSeed(extra = {}) {
  return Object.assign({
    tab: 'electro', learningMode: 'guided', electroView: '2d',
    turns: 100, current: 2, core: false, currentDir: 1, windingDir: 1,
    electroBaseline: null, notebookOpen: false, notebookPrediction: '',
    notebookClaim: '', notebookTrials: [], missionId: 'power_path',
    missionStarted: false, missionPanelOpen: false, labFocus: false,
  }, extra);
}

function withPulseHost(seed, callback) {
  resetStemLab();
  loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
  const html = renderTool('magnetism', { magnetism: electroSeed(seed) });
  const host = document.createElement('main');
  host.innerHTML = html;
  document.body.appendChild(host);
  let result;
  try {
    result = callback(host, html);
  } catch (error) {
    host.remove();
    throw error;
  }
  if (result && typeof result.then === 'function') return result.finally(() => host.remove());
  host.remove();
  return result;
}

function mountInteractive(cfg, seed, announceToSR = () => {}) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  function Harness() {
    const [toolData, setToolData] = React.useState({ magnetism: seed });
    return cfg.render({
      React, toolData, setToolData,
      addToast: () => {}, announceToSR, awardXP: () => {},
      callGemini: null, aiHintsEnabled: false, gradeLevel: '7th Grade',
      t: (key, fallback) => fallback || key,
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

describe('magnetism Live Evidence Pulse', () => {
  it('builds a baseline pulse from the station’s existing structured measurements', () => {
    const pulse = physics.liveEvidencePulseState(electroSeed(), 3);
    expect(pulse).toMatchObject({
      status: 'baseline', statusLabel: 'Baseline ready', trialCount: 0,
      comparableCount: 0, changedCount: 0, totalLiveMetrics: 3,
      hiddenMetricCount: 0, canRecord: true,
    });
    expect(pulse.station).toMatchObject({ id: 'electro', label: 'Electromagnet', chapterId: 'motion' });
    expect(pulse.metrics.map((metric) => metric.key)).toEqual(['field_mT', 'turns', 'current_A']);
    expect(pulse.metrics.every((metric) => metric.trend === 'baseline' && !metric.comparable)).toBe(true);

    const challenge = physics.liveEvidencePulseState(electroSeed({ learningMode: 'challenge' }), 3);
    expect(challenge.canRecord).toBe(false);
    expect(physics.liveEvidencePulseState(electroSeed({ learningMode: 'challenge', notebookPrediction: 'More turns increase B.' }), 3).canRecord).toBe(true);
  });

  it('reconstructs steady and changed signals from persisted notebook metrics', () => {
    const baseline = electroSeed();
    const savedMetrics = physics.notebookMetricSnapshot(baseline);
    const savedTrial = { station: 'Electromagnet', setup: '100 turns, 2 A', result: 'baseline field', prediction: 'More turns increase B.', metrics: savedMetrics };

    const steady = physics.liveEvidencePulseState(electroSeed({ notebookTrials: [savedTrial] }), 3);
    expect(steady).toMatchObject({ status: 'steady', comparableCount: 3, changedCount: 0, trialCount: 1 });
    expect(steady.metrics.map((metric) => metric.trend)).toEqual(['same', 'same', 'same']);
    expect(steady.metrics.every((metric) => metric.deltaDisplay === 'No measurable change')).toBe(true);

    const changed = physics.liveEvidencePulseState(electroSeed({ turns: 200, notebookTrials: [savedTrial] }), 3);
    expect(changed).toMatchObject({ status: 'changed', statusLabel: 'New signal', comparableCount: 3, changedCount: 2 });
    expect(changed.metrics.map((metric) => metric.trend)).toEqual(['up', 'up', 'same']);
    expect(changed.metrics[0].deltaDisplay).toBe('+2.51 mT');
    expect(changed.metrics[1].deltaDisplay).toBe('+100 turns');

    const legacy = physics.liveEvidencePulseState(electroSeed({ notebookTrials: [{ station: 'Older trial', setup: 'text only', result: 'observed', prediction: 'legacy' }] }), 3);
    expect(legacy).toMatchObject({ status: 'baseline', trialCount: 1, comparableCount: 0 });
  });

  it('renders three clear readouts and comparison-ready capture guidance', () => {
    withPulseHost({}, (host, html) => {
      const pulse = host.querySelector('[data-magnetism-evidence-pulse="true"]');
      expect(pulse).toBeTruthy();
      expect(pulse.tagName).toBe('SECTION');
      expect(pulse.getAttribute('data-status')).toBe('baseline');
      expect(pulse.querySelectorAll('.mag-evidence-metric')).toHaveLength(3);
      expect(pulse.querySelectorAll('.mag-evidence-metric[data-trend="baseline"]')).toHaveLength(3);
      expect(pulse.textContent).toContain('Live evidence pulse');
      expect(pulse.textContent).toContain('🔌 Electromagnet readout');
      expect(pulse.textContent).toContain('Baseline ready');
      expect(pulse.textContent).toContain('Center field');
      expect(pulse.textContent).toContain('Turns');
      expect(pulse.textContent).toContain('Current');
      expect(pulse.textContent).toContain('Capture a baseline, then change one variable');
      expect(pulse.querySelector('button').textContent).toBe('Capture baseline →');
      expect(pulse.querySelector('.mag-evidence-metric').getAttribute('aria-label')).toContain('no saved comparison');
      expect(html.indexOf('data-magnetism-evidence-pulse="true"')).toBeLessThan(html.indexOf('role="tabpanel"'));
    });
  });

  it('supports the full baseline → record → one-variable comparison loop', () => {
    resetStemLab();
    const cfg = loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const announcements = [];
    const live = mountInteractive(cfg, electroSeed(), (message) => announcements.push(message));
    const click = (element) => act(() => { element.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const button = (text) => [...live.host.querySelectorAll('button')].find((item) => item.textContent.includes(text));
    try {
      click(button('Capture baseline'));
      expect(live.host.querySelector('#mag-notebook-prediction')).toBeTruthy();
      expect(announcements[0]).toBe('Lab notebook opened. Baseline ready.');

      click(button('Record current trial'));
      expect(live.host.textContent).toContain('Prediction: No prediction recorded');
      expect(announcements[1]).toBe('Trial recorded in the lab notebook.');
      click(button('Close notebook'));

      let pulse = live.host.querySelector('[data-magnetism-evidence-pulse="true"]');
      expect(pulse.getAttribute('data-status')).toBe('steady');
      expect(pulse.querySelectorAll('.mag-evidence-metric[data-trend="same"]')).toHaveLength(3);
      expect(pulse.querySelector('.mag-evidence-count').textContent).toBe('1 trial');

      const turnsLabel = [...live.host.querySelectorAll('label')].find((label) => label.textContent.includes('Turns of wire'));
      const turnsInput = live.host.querySelector(`#${turnsLabel.htmlFor}`);
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      act(() => {
        valueSetter.call(turnsInput, '200');
        turnsInput.dispatchEvent(new Event('input', { bubbles: true }));
        turnsInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      pulse = live.host.querySelector('[data-magnetism-evidence-pulse="true"]');
      expect(pulse.getAttribute('data-status')).toBe('changed');
      expect(pulse.querySelectorAll('.mag-evidence-metric[data-trend="up"]')).toHaveLength(2);
      expect(pulse.querySelectorAll('.mag-evidence-metric[data-trend="same"]')).toHaveLength(1);
      expect(pulse.textContent).toContain('New signal');
      expect(pulse.querySelector('button').textContent).toBe('Record this change →');
    } finally {
      live.close();
    }
  });

  it('adapts at two narrow breakpoints and has no automated WCAG A/AA violations', async () => {
    const source = readFileSync(TOOL_PATH, 'utf8');
    expect(source).toContain('@media(max-width:520px){.mag-root .mag-evidence-grid{grid-template-columns:repeat(2,minmax(0,1fr))}');
    expect(source).toContain('@media(max-width:370px){.mag-root .mag-evidence-grid{grid-template-columns:1fr}');
    expect(source).toContain('@keyframes mag-evidence-arrive');
    expect(source).toContain('@media(prefers-reduced-motion:reduce)');

    const savedMetrics = physics.notebookMetricSnapshot(electroSeed());
    await withPulseHost({ turns: 200, notebookTrials: [{ metrics: savedMetrics }] }, async (host) => {
      const pulse = host.querySelector('[data-magnetism-evidence-pulse="true"]');
      expect(pulse.getAttribute('data-status')).toBe('changed');
      expect(pulse.querySelectorAll('.mag-evidence-metric[data-trend="up"]')).toHaveLength(2);
      const results = await axe.run(pulse, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
        rules: { 'color-contrast': { enabled: false } },
      });
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    });
  }, 15000);
});
