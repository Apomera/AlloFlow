import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { resetStemLab, loadTool, renderTool, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const TOOL_RELATIVE_PATH = process.env.MAGNETISM_SIGNAL_TOOL || 'stem_lab/stem_tool_magnetism.js';
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

describe('magnetism Signal Story', () => {
  it('derives a station-aware control-to-evidence path and rejects stale cross-station changes', () => {
    const active = physics.causalSignalState(electroSeed({
      magLastChange: 'turns', magChangeSeq: 4,
    }), 'electro');
    expect(active).toMatchObject({
      active: true, key: 'turns', changeSeq: 4, expectedTab: 'electro',
      tab: 'electro', status: 'baseline', trend: 'baseline',
      evidenceLabel: 'Center field',
    });
    expect(active.station).toMatchObject({ id: 'electro', label: 'Electromagnet' });
    expect(active.evidenceValue).toBe('2.51 mT');
    expect(active.evidenceDetail).toBe('Ready to capture as a baseline');

    const stale = physics.causalSignalState(electroSeed({
      tab: 'field', magLastChange: 'turns', magChangeSeq: 4,
    }), 'field');
    expect(stale).toMatchObject({
      active: false, key: 'turns', expectedTab: 'electro', tab: 'field',
    });

    const legacy = physics.causalSignalState({ magnetism: {
      tab: 'crane', magLastChange: 'cranePower',
    } });
    expect(legacy).toMatchObject({
      active: true, expectedTab: 'crane', tab: 'crane', changeSeq: 0,
    });
  });

  it('reconstructs a changed live signal from saved notebook measurements', () => {
    const baseline = electroSeed();
    const savedMetrics = physics.notebookMetricSnapshot(baseline);
    const changed = physics.causalSignalState(electroSeed({
      turns: 200, magLastChange: 'turns', magChangeSeq: 7,
      notebookTrials: [{ metrics: savedMetrics }],
    }), 'electro');
    expect(changed).toMatchObject({
      active: true, status: 'changed', statusLabel: 'New signal',
      trend: 'up', evidenceLabel: 'Center field', evidenceValue: '5.03 mT',
      evidenceDetail: '+2.51 mT vs saved trial',
    });
  });

  it('covers causal changes in every station, including the new discrete interactions', () => {
    const cases = [
      ['field', 'fieldMapStrength'], ['electro', 'core'], ['motor', 'motorLoad'],
      ['induce', 'eddyField'], ['materials', 'matRevealed'], ['crane', 'cranePower'],
      ['maze', 'mazePx'], ['transformer', 'xfmrLoad'], ['earth', 'earthSolarWind'],
      ['quiz', 'quizPicked'],
    ];
    cases.forEach(([tab, key]) => {
      const state = physics.causalSignalState({ tab, magLastChange: key, magChangeSeq: 1 }, tab);
      expect(state.active, tab + ' should activate ' + key).toBe(true);
      expect(state.expectedTab).toBe(tab);
    });
  });

  it('renders a clear three-node visual story while preserving the legacy feedback wording', () => {
    withStaticHost(electroSeed({
      magLastChange: 'turns', magChangeSeq: 2, labShellPanel: 'overview',
    }), (host, html) => {
      const story = host.querySelector('[data-magnetism-signal-story="true"]');
      expect(story).toBeTruthy();
      expect(story.getAttribute('data-change')).toBe('turns');
      expect(story.getAttribute('data-trend')).toBe('baseline');
      expect(story.querySelectorAll('.mag-causal-node')).toHaveLength(3);
      expect(story.querySelector('[data-node="control"]').textContent).toContain('What changed: Coil turns changed');
      expect(story.querySelector('[data-node="response"]').textContent).toContain('field strength and wire-length tradeoffs');
      expect(story.querySelector('[data-node="evidence"]').textContent).toContain('Center field: 2.51 mT');
      expect(story.textContent).toContain('Control → response → evidence');
      expect(story.getAttribute('aria-label')).toContain('Live evidence: Center field, 2.51 mT');
      expect(html).toContain('Now exploring · station');
      expect(html).not.toContain('Now exploring � station');
    });
  });

  it('appears after a live control change and clears when the learner changes stations', () => {
    resetStemLab();
    const cfg = loadTool(TOOL_RELATIVE_PATH, 'magnetism');
    const live = mountInteractive(cfg, electroSeed());
    try {
      expect(live.host.querySelector('[data-magnetism-signal-story="true"]')).toBeNull();
      const turnsLabel = [...live.host.querySelectorAll('label')].find((label) => label.textContent.includes('Turns of wire'));
      const turnsInput = live.host.querySelector('#' + turnsLabel.htmlFor);
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      act(() => {
        valueSetter.call(turnsInput, '160');
        turnsInput.dispatchEvent(new Event('input', { bubbles: true }));
        turnsInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      const story = live.host.querySelector('[data-magnetism-signal-story="true"]');
      expect(story).toBeTruthy();
      expect(story.getAttribute('data-change')).toBe('turns');
      expect(story.textContent).toContain('Coil turns changed');

      act(() => {
        live.host.querySelector('#mag-tab-motor').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      expect(live.host.querySelector('[data-magnetism-signal-story="true"]')).toBeNull();
      expect(live.host.querySelector('#mag-tab-motor').getAttribute('aria-selected')).toBe('true');
    } finally {
      live.close();
    }
  });

  it('stacks at narrow widths, respects motion/contrast preferences, and passes automated WCAG A/AA checks', async () => {
    const source = readFileSync(TOOL_PATH, 'utf8');
    expect(source).toContain('.mag-root .mag-causal-path{display:grid;grid-template-columns:minmax(0,1fr) 34px');
    expect(source).toContain('@keyframes mag-causal-flow');
    expect(source).toContain('@media(max-width:560px){.mag-root .mag-causal-path{grid-template-columns:1fr}');
    expect(source).toContain('@media(max-width:390px){.mag-root .mag-causal-node span{white-space:normal}');
    expect(source).toContain('@media(forced-colors:active){.mag-root .mag-causal-strip{box-shadow:none}');
    expect(source).toContain('@media(prefers-reduced-motion:reduce)');

    const savedMetrics = physics.notebookMetricSnapshot(electroSeed());
    await withStaticHost(electroSeed({
      turns: 200, magLastChange: 'turns', magChangeSeq: 8,
      notebookTrials: [{ metrics: savedMetrics }],
    }), async (host) => {
      const story = host.querySelector('[data-magnetism-signal-story="true"]');
      expect(story.getAttribute('data-trend')).toBe('up');
      const results = await axe.run(story, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
        rules: { 'color-contrast': { enabled: false } },
      });
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    });
  }, 15000);
});
