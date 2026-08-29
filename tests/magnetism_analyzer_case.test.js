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

function analyzerSeed(extra = {}) {
  return Object.assign({
    tab: 'motor', motorMode: 'analyzer', learningMode: 'guided',
    analyzerE: 6, analyzerSelectorB: 3, analyzerSpeed: 2, analyzerB: 4,
    analyzerSpecies: 'deuteron', analyzerShowAll: true, analyzerUsed: false,
    analyzerMysteryRound: 0, analyzerMysteryScan: null,
    analyzerMysteryGuess: null, analyzerMysteryChecked: false,
    analyzerMysteryWins: {}, notebookOpen: false,
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

function withAnalyzerHost(seed, callback) {
  resetStemLab();
  loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
  const html = renderTool('magnetism', { magnetism: analyzerSeed(seed) });
  const host = document.createElement('main');
  host.innerHTML = html;
  document.body.appendChild(host);
  try {
    return callback(host, html);
  } finally {
    host.remove();
  }
}

describe('magnetism unknown-ion case file', () => {
  it('derives a defensive calibrate-scan-identify evidence sequence from r = mv/(|q|B)', () => {
    expect(physics.ANALYZER_MYSTERY_ROUNDS.map((round) => round.ratio)).toEqual([1, 2, 3]);
    expect(physics.ANALYZER_MYSTERY_OPTIONS.map((option) => option.ratio)).toEqual([1, 2, 3]);

    const blocked = physics.analyzerMysteryState(0, 6, 3, 5, 4, null, null, false, {});
    expect(blocked).toMatchObject({ phase: 'calibrate', scanCandidate: null, completedCount: 0, currentIndex: 0 });

    const ready = physics.analyzerMysteryState(1, 6, 3, 2, 4, null, null, false, {});
    expect(ready).toMatchObject({ phase: 'scan', completedCount: 1, currentIndex: 1 });
    expect(ready.scanCandidate).toMatchObject({ round: 1, caseId: 'overlap', selectedSpeed: 2, analyzerField: 4, radius: 1 });

    const scanned = physics.analyzerMysteryState(1, 6, 3, 2, 4, Object.assign({ radius: 999 }, ready.scanCandidate), null, false, {});
    expect(scanned).toMatchObject({ phase: 'identify', completedCount: 2, currentIndex: 2 });
    expect(scanned.scan.radius).toBe(1);
    expect(scanned.scan.inferredRatio).toBe(2);

    const revised = physics.analyzerMysteryState(1, 6, 3, 2, 4, ready.scanCandidate, 3, true, {});
    expect(revised).toMatchObject({ phase: 'revise', checked: true, correct: false, complete: false });
    expect(revised.options.find((option) => option.ratio === 2).state).toBe('model');
    expect(revised.options.find((option) => option.ratio === 3).state).toBe('revised');

    const solved = physics.analyzerMysteryState(1, 6, 3, 2, 4, ready.scanCandidate, 2, true, { overlap: true });
    expect(solved).toMatchObject({ phase: 'solved', correct: true, complete: true, completedCount: 3, solvedCount: 1 });
    expect(solved.feedback).toContain('cannot tell those two ions apart');
    expect(physics.analyzerMysteryState(-1, 6, 3, 2, 4, null, null, false, {}).index).toBe(2);
  });

  it('renders a compact visual case file without revealing the unknown before a scan', () => {
    withAnalyzerHost({}, (host) => {
      const caseFile = host.querySelector('[data-magnetism-ion-case="true"]');
      expect(caseFile).toBeTruthy();
      expect(caseFile.getAttribute('data-phase')).toBe('scan');
      expect(caseFile.querySelectorAll('.mag-ion-step')).toHaveLength(3);
      expect(caseFile.querySelectorAll('.mag-ion-step[data-state="done"]')).toHaveLength(1);
      expect(caseFile.querySelectorAll('.mag-ion-step[data-state="current"]')).toHaveLength(1);
      expect(caseFile.querySelector('.mag-ion-progress').value).toBe(1);
      expect(caseFile.querySelectorAll('.mag-ion-reading')).toHaveLength(3);
      expect(caseFile.querySelectorAll('.mag-ion-option')).toHaveLength(0);
      expect(caseFile.textContent).toContain('Scan unknown ion');
      expect(caseFile.textContent).toContain('waiting for radius evidence');
      expect(host.querySelector('svg[aria-label^="Velocity selector and mass analyzer"]')).toBeTruthy();
      expect(host.textContent).not.toContain('? trace');
    });
  });

  it('supports scan, useful revision, confirmed evidence, rewards, and the next case', () => {
    resetStemLab();
    const cfg = loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const announcements = [];
    const rewards = [];
    const toasts = [];
    const live = mountInteractive(cfg, analyzerSeed(), {
      announceToSR: (message) => announcements.push(message),
      awardXP: (amount) => rewards.push(amount),
      addToast: (message, type) => toasts.push({ message, type }),
    });
    const click = (element) => act(() => { element.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const button = (text) => [...live.host.querySelectorAll('button')].find((item) => item.textContent.includes(text));
    try {
      click(button('Scan unknown ion'));
      expect(live.host.querySelector('.mag-ion-case').getAttribute('data-phase')).toBe('identify');
      expect(live.host.querySelectorAll('.mag-ion-option')).toHaveLength(3);
      expect(live.host.querySelector('.mag-ion-reading:nth-child(2) b').textContent).toBe('0.50');
      expect(live.host.textContent).toContain('? trace');

      click(button('m/|q| = 3'));
      click(button('Check identification'));
      expect(live.host.querySelector('.mag-ion-case').getAttribute('data-phase')).toBe('revise');
      expect(live.host.querySelector('.mag-ion-option[data-state="model"]')).toBeTruthy();
      expect(live.host.querySelector('.mag-ion-option[data-state="revised"]')).toBeTruthy();
      expect(rewards).toEqual([]);

      click(button('Revise identification'));
      click(button('m/|q| = 1'));
      click(button('Check identification'));
      expect(live.host.querySelector('.mag-ion-case').getAttribute('data-phase')).toBe('solved');
      expect(live.host.querySelector('.mag-ion-progress').value).toBe(3);
      expect(live.host.textContent).toContain('Confirmed: rB/v = 1');
      expect(rewards).toEqual([5]);
      expect(toasts).toEqual([{ message: 'Ion case identified from detector evidence! +5 XP', type: 'success' }]);

      click(button('Open next unsolved case'));
      expect(live.host.querySelector('.mag-ion-case').getAttribute('data-phase')).toBe('scan');
      expect(live.host.textContent).toContain('Case 2');
      expect(live.host.querySelector('.mag-ion-count').textContent).toBe('1/3 cases solved');
      expect(announcements.some((message) => message.startsWith('Unknown ion scanned.'))).toBe(true);
      expect(announcements.at(-1)).toContain('Case 2');
    } finally {
      live.close();
    }
  });

  it('calibrates a blocked gate and records immutable structured notebook evidence', () => {
    resetStemLab();
    const cfg = loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const live = mountInteractive(cfg, analyzerSeed({ analyzerSpeed: 5 }));
    const click = (element) => act(() => { element.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    try {
      expect(live.host.querySelector('.mag-ion-case').getAttribute('data-phase')).toBe('calibrate');
      const calibrate = [...live.host.querySelectorAll('button')].find((item) => item.textContent.includes('Calibrate gate'));
      click(calibrate);
      expect(live.host.querySelector('.mag-ion-case').getAttribute('data-phase')).toBe('scan');
      expect(live.host.textContent).toContain('PASS — forces cancel at the slit');
    } finally {
      live.close();
    }

    const completed = analyzerSeed({
      analyzerMysteryRound: 1,
      analyzerMysteryScan: { round: 1, selectedSpeed: 2, analyzerField: 4, radius: 999 },
      analyzerMysteryGuess: 2, analyzerMysteryChecked: true,
      analyzerMysteryWins: { overlap: true }, notebookOpen: true,
    });
    const metrics = physics.notebookMetricSnapshot({ magnetism: completed });
    const keys = metrics.map((metric) => metric.key);
    expect(keys).toEqual([
      'selector_speed', 'beam_speed', 'analyzer_mq', 'analyzer_radius',
      'unknown_scan_speed', 'unknown_scan_field', 'unknown_scan_radius',
      'unknown_claim_mq', 'unknown_inferred_mq',
    ]);
    expect(metrics.find((metric) => metric.key === 'unknown_scan_radius')).toMatchObject({ value: 1, display: '1.00 relative r' });
    expect(metrics.find((metric) => metric.key === 'unknown_inferred_mq')).toMatchObject({ value: 2, display: '2 m/|q|' });

    withAnalyzerHost(completed, (_host, html) => {
      expect(html).toContain('unknown case radius 1.00');
      expect(html).toContain('claim m/|q| 2 confirmed');
    });
  });

  it('keeps the case file responsive, motion-safe, and free of automated WCAG violations', async () => {
    const source = readFileSync(TOOL_PATH, 'utf8');
    expect(source).toContain('.mag-ion-readings{grid-template-columns:1fr 1fr}');
    expect(source).toContain('.mag-ion-options{grid-template-columns:1fr}');
    expect(source).toContain('.mag-ion-readings{grid-template-columns:1fr}');
    expect(source).toContain('@media(prefers-reduced-motion:reduce)');

    resetStemLab();
    loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const html = renderTool('magnetism', { magnetism: analyzerSeed({
      analyzerMysteryRound: 1,
      analyzerMysteryScan: { round: 1, selectedSpeed: 2, analyzerField: 4 },
      analyzerMysteryGuess: 3, analyzerMysteryChecked: true,
    }) });
    const host = document.createElement('main');
    host.innerHTML = html;
    document.body.appendChild(host);
    try {
      expect(host.querySelector('.mag-ion-feedback').getAttribute('data-state')).toBe('revise');
      expect(host.querySelector('fieldset.mag-ion-options legend')).toBeTruthy();
      expect(host.querySelector('[role="status"][aria-live="polite"]')).toBeTruthy();
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
