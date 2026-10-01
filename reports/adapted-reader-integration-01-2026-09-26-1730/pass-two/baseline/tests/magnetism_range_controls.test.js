import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { resetStemLab, loadTool, renderTool, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const TOOL_RELATIVE_PATH = process.env.MAGNETISM_RANGE_TOOL || 'stem_lab/stem_tool_magnetism.js';
const TOOL_PATH = resolve(process.cwd(), TOOL_RELATIVE_PATH);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const axe = require(resolve(MODULES_DIR, 'axe-core'));
const physics = require(TOOL_PATH);
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function electroSeed(extra = {}) {
  return Object.assign({
    tab: 'electro', learningMode: 'guided', electroView: '2d',
    turns: 100, current: 2, core: false, currentDir: 1, windingDir: 1,
    electroBaseline: null, notebookOpen: false, notebookPrediction: '',
    notebookClaim: '', notebookTrials: [], missionId: 'power_path',
    missionStarted: false, missionPanelOpen: false, labFocus: false,
    magLastChange: null, magChangeSeq: 0,
  }, extra);
}

function forceSeed(extra = {}) {
  return Object.assign({
    tab: 'field', fieldView: '2d', learningMode: 'guided',
    pairDistance: 70, pairStrength1: 1, pairStrength2: 1, pairAttract: true,
    forceBenchBaseline: null, forceBenchPrediction: null, forceBenchResultSeen: false,
    forceBenchChallengeRuns: 0, forceBenchUsed: false, notebookOpen: false,
  }, extra);
}

function withStaticHost(seed, callback) {
  resetStemLab();
  loadTool(TOOL_RELATIVE_PATH, 'magnetism');
  const html = renderTool('magnetism', { magnetism: seed });
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

function mountInteractive(cfg, seed) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  function Harness() {
    const [toolData, setToolData] = React.useState({ magnetism: seed });
    return cfg.render({
      React, toolData, setToolData,
      addToast: () => {}, announceToSR: () => {}, awardXP: () => {},
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

describe('magnetism instrument-style range controls', () => {
  it('normalizes fills, decimal precision, negative ranges, and defensive inputs', () => {
    expect(physics.rangePresentationState(0, -10, 10, 0.5)).toMatchObject({
      value: 0, min: -10, max: 10, step: 0.5,
      valueDisplay: '0', minDisplay: '-10', maxDisplay: '10',
      percent: 50, percentCss: '50%', edge: 'middle',
    });
    expect(physics.rangePresentationState(0.30000000000000004, 0, 1, 0.1).valueDisplay).toBe('0.3');
    expect(physics.rangePresentationState(99, -2, 2, 0.1)).toMatchObject({
      value: 2, percent: 100, percentCss: '100%', edge: 'end',
    });
    expect(physics.rangePresentationState(5, 10, 0, 1)).toMatchObject({ min: 0, max: 10, value: 5, percent: 50 });
    expect(physics.rangePresentationState('bad', 'bad', 'bad', 0)).toMatchObject({
      value: 0, min: 0, max: 1, step: 1, percent: 0, edge: 'start',
    });
  });

  it('renders each shared slider as a labeled instrument with a live output and endpoints', () => {
    withStaticHost(electroSeed(), (host) => {
      const ranges = [...host.querySelectorAll('.mag-range')];
      expect(ranges).toHaveLength(2);
      ranges.forEach((range) => {
        const label = range.querySelector('.mag-range-label');
        const input = range.querySelector('.mag-range-input');
        const output = range.querySelector('.mag-range-value');
        const scale = range.querySelector('.mag-range-scale');
        const description = range.querySelector('.mag-sronly');
        expect(label).toBeTruthy();
        expect(input).toBeTruthy();
        expect(output).toBeTruthy();
        expect(scale.children).toHaveLength(3);
        expect(label.htmlFor).toBe(input.id);
        expect(output.getAttribute('for')).toBe(input.id);
        expect(input.getAttribute('aria-describedby')).toBe(description.id);
        expect(input.getAttribute('aria-valuetext')).toContain(label.textContent);
        expect(range.style.getPropertyValue('--mag-range-fill')).toMatch(/%$/);
      });

      const turnsLabel = ranges.map((range) => range.querySelector('label')).find((label) => label.textContent.includes('Turns of wire'));
      const turnsRange = turnsLabel.closest('.mag-range');
      expect(turnsRange.querySelector('.mag-range-value').textContent).toBe('100');
      expect(turnsRange.querySelector('.mag-range-scale').textContent).toContain('5Drag to test200');
      expect(turnsRange.style.getPropertyValue('--mag-range-fill')).toBe('48.72%');
      expect(Number(turnsRange.dataset.rangePercent)).toBeCloseTo(48.7179, 3);
    });
  });

  it('updates the readout, fill, and experiment evidence continuously through the existing callback', () => {
    resetStemLab();
    const cfg = loadTool(TOOL_RELATIVE_PATH, 'magnetism');
    const live = mountInteractive(cfg, electroSeed());
    try {
      const turnsLabel = [...live.host.querySelectorAll('label')].find((label) => label.textContent.includes('Turns of wire'));
      const turnsInput = live.host.querySelector('#' + turnsLabel.htmlFor);
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      act(() => {
        valueSetter.call(turnsInput, '160');
        turnsInput.dispatchEvent(new Event('input', { bubbles: true }));
        turnsInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      const updatedLabel = [...live.host.querySelectorAll('label')].find((label) => label.textContent.includes('Turns of wire'));
      const updatedRange = updatedLabel.closest('.mag-range');
      const updatedInput = updatedRange.querySelector('input[type="range"]');
      expect(updatedInput.value).toBe('160');
      expect(updatedInput.getAttribute('aria-valuetext')).toBe('Turns of wire (N): 160');
      expect(updatedRange.querySelector('output').textContent).toBe('160');
      expect(updatedRange.style.getPropertyValue('--mag-range-fill')).toBe('79.49%');
      expect(Number(updatedRange.dataset.rangePercent)).toBeCloseTo(79.4872, 3);
      expect(live.host.querySelector('[data-magnetism-signal-story="true"]').getAttribute('data-change')).toBe('turns');
      expect(live.host.textContent).toContain('4.02 mT');
    } finally {
      live.close();
    }
  });

  it('communicates the intentionally locked force-gap control without weakening its native disabled state', () => {
    withStaticHost(forceSeed(), (host) => {
      const gapInput = [...host.querySelectorAll('input[type="range"]')]
        .find((input) => input.getAttribute('aria-valuetext')?.startsWith('Gap between magnets'));
      const gapRange = gapInput.closest('.mag-range');
      expect(gapInput.disabled).toBe(true);
      expect(gapRange.dataset.disabled).toBe('true');
      expect(gapRange.dataset.edge).toBe('middle');
      expect(gapRange.querySelector('.mag-range-hint').textContent).toBe('Locked');
      expect(gapRange.querySelector('output').textContent).toBe('70');
      expect(gapRange.style.getPropertyValue('--mag-range-fill')).toBe('30%');
    });
  });

  it('includes touch, narrow-screen, motion, and forced-color treatments and passes WCAG A/AA checks', async () => {
    const source = readFileSync(TOOL_PATH, 'utf8');
    expect(source).toContain('.mag-root .mag-range-input::-webkit-slider-runnable-track');
    expect(source).toContain('@media(pointer:coarse){.mag-root .mag-range-input{height:38px}');
    expect(source).toContain('@media(max-width:420px){.mag-root .mag-range{padding:8px 9px 6px}');
    expect(source).toContain('@media(forced-colors:active){.mag-root .mag-range{box-shadow:none}');
    expect(source).toContain('@media(prefers-reduced-motion:reduce)');

    await withStaticHost(electroSeed(), async (host) => {
      const results = await axe.run(host.querySelector('#mag-panel-electro'), {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
        rules: { 'color-contrast': { enabled: false } },
      });
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    });
  }, 15000);
});
