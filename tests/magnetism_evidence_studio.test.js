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

function studioSeed(extra = {}) {
  return Object.assign({
    tab: 'field', fieldView: '2d', learningMode: 'guided',
    notebookOpen: true, notebookPrediction: '', notebookClaim: '', notebookTrials: [],
    missionId: 'power_path', missionStarted: false, missionPanelOpen: false,
    labFocus: false, analyzerMysteryWins: {}, xfmrMissionWins: {},
  }, extra);
}

function savedTrial(number, extra = {}) {
  return Object.assign({
    station: 'Saved station ' + number,
    setup: 'controlled setup ' + number,
    result: 'observed result ' + number,
    prediction: 'prediction ' + number,
    metrics: [],
  }, extra);
}

function withStudioHost(seed, callback) {
  resetStemLab();
  loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
  const html = renderTool('magnetism', { magnetism: studioSeed(seed) });
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

function click(element) {
  act(() => { element.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
}

function changeValue(element, value) {
  const prototype = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
  act(() => {
    setter.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function buttonContaining(host, text) {
  return Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes(text));
}

describe('magnetism Evidence Studio', () => {
  it('derives a three-stage workflow from the existing notebook fields', () => {
    const guided = physics.evidenceStudioState(studioSeed());
    expect(guided).toMatchObject({
      activeStage: 'capture', statusLabel: 'Ready to capture',
      mode: 'guided', modeLabel: 'Guided workflow',
      predictionDone: false, trialCount: 0, claimWritten: false,
      reportReady: false, canRecord: true,
      capacity: 8, remainingSlots: 8,
      progressValue: 0, progressMax: 3, progressPercent: 0,
    });
    expect(guided.station).toMatchObject({ id: 'field', label: 'Field Explorer' });
    expect(guided.chapter).toMatchObject({ id: 'fields', accent: '#38bdf8' });
    expect(guided.stages.map((stage) => [stage.key, stage.status])).toEqual([
      ['predict', 'optional'],
      ['capture', 'current'],
      ['claim', 'upcoming'],
    ]);

    const challenge = physics.evidenceStudioState(studioSeed({ learningMode: 'challenge' }));
    expect(challenge).toMatchObject({
      activeStage: 'predict', statusLabel: 'Prediction needed',
      mode: 'challenge', canRecord: false,
    });
    expect(challenge.stages.map((stage) => stage.status)).toEqual(['current', 'upcoming', 'upcoming']);
  });

  it('restores completed, drafted, and legacy-safe evidence states without migration', () => {
    const trials = [savedTrial(1), savedTrial(2)];
    const restored = physics.evidenceStudioState({
      magnetism: studioSeed({
        tab: 'transformer',
        learningMode: 'challenge',
        notebookPrediction: 'More secondary turns should raise AC output voltage.',
        notebookClaim: 'The turns ratio controls output voltage.',
        notebookTrials: trials,
      }),
    });
    expect(restored.station).toMatchObject({ id: 'transformer', chapterId: 'power' });
    expect(restored.chapter).toMatchObject({ id: 'power', accent: '#fbbf24' });
    expect(restored).toMatchObject({
      activeStage: 'complete', statusLabel: 'Claim ready',
      predictionDone: true, trialCount: 2, claimWritten: true,
      reportReady: true, progressValue: 3, progressPercent: 100,
      remainingSlots: 6,
    });
    expect(restored.stages.every((stage) => stage.status === 'complete')).toBe(true);
    expect(restored.latest).toEqual(trials[1]);

    const drafted = physics.evidenceStudioState(studioSeed({
      notebookClaim: 'A claim drafted before evidence.',
    }));
    expect(drafted).toMatchObject({ activeStage: 'capture', claimWritten: true, reportReady: false });
    expect(drafted.stages.find((stage) => stage.key === 'claim').status).toBe('drafted');

    const legacy = physics.evidenceStudioState({ magnetism: studioSeed({ notebookTrials: 'not-an-array' }) });
    expect(legacy.trials).toEqual([]);
    expect(legacy.trialCount).toBe(0);
  });

  it('renders a station-colored visual workflow, causal snapshot, and readable evidence trail', () => {
    withStudioHost({
      tab: 'motor',
      learningMode: 'challenge',
      notebookPrediction: 'Reversing current should reverse torque.',
      notebookClaim: 'Current direction controls torque direction.',
      notebookTrials: [savedTrial(1, {
        station: 'Motor forces',
        setup: 'current forward and field right',
        result: 'clockwise torque',
        prediction: 'Reversing current reverses rotation.',
      })],
    }, (host) => {
      const studio = host.querySelector('[data-magnetism-evidence-studio="true"]');
      expect(studio).toBeTruthy();
      expect(studio.tagName).toBe('SECTION');
      expect(studio.getAttribute('data-stage')).toBe('complete');
      expect(studio.getAttribute('data-status')).toBe('ready');
      expect(studio.style.getPropertyValue('--mag-studio-tone')).toBe('#f43f5e');
      expect(studio.querySelector('.mag-studio-visual svg')).toBeTruthy();
      expect(studio.querySelectorAll('.mag-studio-step')).toHaveLength(3);
      expect(studio.querySelectorAll('.mag-studio-step[data-state="complete"]')).toHaveLength(3);
      expect(studio.querySelector('.mag-studio-badge progress').value).toBe(3);
      expect(studio.querySelectorAll('.mag-studio-snapshot article')).toHaveLength(2);
      expect(studio.querySelectorAll('.mag-studio-trial')).toHaveLength(1);
      expect(studio.querySelector('.mag-studio-trial[data-latest="true"]')).toBeTruthy();
      expect(studio.textContent).toContain('Investigation notebook — claim, evidence, reasoning');
      expect(studio.textContent).toContain('Prediction before this trial');
      expect(studio.textContent).toContain('Recorded evidence trials');
      expect(studio.textContent).toContain('current forward and field right → clockwise torque');
      expect(studio.textContent).toContain('Claim supported by your evidence');
    });
  });

  it('supports the guided capture, claim, and close loop with clear state feedback', () => {
    resetStemLab();
    const cfg = loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const announcements = [];
    const live = mountInteractive(cfg, studioSeed({ tab: 'electro' }), (message) => announcements.push(message));
    try {
      let studio = live.host.querySelector('[data-magnetism-evidence-studio="true"]');
      expect(studio.getAttribute('data-stage')).toBe('capture');
      expect(buttonContaining(studio, 'Record current trial').disabled).toBe(false);

      click(buttonContaining(studio, 'Record current trial'));
      studio = live.host.querySelector('[data-magnetism-evidence-studio="true"]');
      expect(studio.getAttribute('data-stage')).toBe('claim');
      expect(studio.querySelectorAll('.mag-studio-trial')).toHaveLength(1);
      expect(studio.textContent).toContain('Prediction: No prediction recorded');
      expect(studio.querySelector('.mag-studio-badge').textContent).toContain('1/8 trials');

      changeValue(studio.querySelector('#mag-notebook-claim'), 'More coil turns increase the center field when current stays fixed.');
      studio = live.host.querySelector('[data-magnetism-evidence-studio="true"]');
      expect(studio.getAttribute('data-stage')).toBe('complete');
      expect(studio.getAttribute('data-status')).toBe('ready');
      expect(studio.querySelector('.mag-studio-claim').getAttribute('data-ready')).toBe('true');
      expect(studio.textContent).toContain('Ready for the mission report');

      click(buttonContaining(studio, 'Close notebook'));
      expect(live.host.querySelector('[data-magnetism-evidence-studio]')).toBeNull();
      expect(live.host.querySelector('[data-magnetism-evidence-pulse="true"]')).toBeTruthy();
      expect(announcements).toEqual([
        'Trial recorded in the lab notebook.',
        'Lab notebook closed. Live evidence pulse restored.',
      ]);
    } finally {
      live.close();
    }
  });

  it('requires a challenge prediction and keeps the rolling trail at eight trials', () => {
    resetStemLab();
    const cfg = loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const oldTrials = Array.from({ length: 8 }, (_item, index) => savedTrial(index + 1));
    const live = mountInteractive(cfg, studioSeed({
      learningMode: 'challenge',
      notebookTrials: oldTrials,
    }));
    try {
      let studio = live.host.querySelector('[data-magnetism-evidence-studio="true"]');
      expect(buttonContaining(studio, 'Write a prediction to record').disabled).toBe(true);
      expect(studio.querySelectorAll('.mag-studio-trial')).toHaveLength(8);
      expect(studio.textContent).toContain('Next capture replaces the oldest saved trial');

      changeValue(studio.querySelector('#mag-notebook-prediction'), 'A wider gap should reduce the magnetic force.');
      studio = live.host.querySelector('[data-magnetism-evidence-studio="true"]');
      expect(buttonContaining(studio, 'Record current trial').disabled).toBe(false);
      click(buttonContaining(studio, 'Record current trial'));

      studio = live.host.querySelector('[data-magnetism-evidence-studio="true"]');
      expect(studio.querySelectorAll('.mag-studio-trial')).toHaveLength(8);
      expect(studio.textContent).not.toContain('Saved station 1');
      expect(studio.textContent).toContain('Saved station 2');
      expect(studio.querySelector('.mag-studio-trial[data-latest="true"]').textContent).toContain('A wider gap should reduce the magnetic force.');
      expect(studio.querySelector('#mag-notebook-prediction').value).toBe('');
      expect(buttonContaining(studio, 'Write a prediction to record').disabled).toBe(true);
    } finally {
      live.close();
    }
  });

  it('adapts the workflow and trial trail on narrow screens with no automated WCAG A/AA violations', async () => {
    const source = readFileSync(TOOL_PATH, 'utf8');
    expect(source).toContain('@media(max-width:620px){.mag-root .mag-evidence-studio{padding:11px}');
    expect(source).toContain('@media(max-width:420px){.mag-root .mag-studio-head{grid-template-columns:1fr}');
    expect(source).toContain('.mag-root .mag-studio-trials{grid-auto-flow:row');
    expect(source).toContain('@keyframes mag-studio-flow');
    expect(source).toContain('@keyframes mag-studio-particle');
    expect(source).toContain('@media(forced-colors:active){.mag-root .mag-evidence-studio');
    expect(source).toContain('@media(prefers-reduced-motion:reduce)');

    await withStudioHost({
      tab: 'earth',
      learningMode: 'challenge',
      notebookPrediction: 'Stronger solar wind should compress the dayside boundary.',
      notebookClaim: 'Solar-wind pressure changes the magnetosphere shape.',
      notebookTrials: [savedTrial(1), savedTrial(2)],
      earthSolarWind: 8,
    }, async (host) => {
      const studio = host.querySelector('[data-magnetism-evidence-studio="true"]');
      const results = await axe.run(studio, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] },
        rules: { 'color-contrast': { enabled: false } },
      });
      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    });
  }, 15000);
});
