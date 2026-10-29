import { describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { resetStemLab, loadTool, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const physics = require(resolve('stem_lab/stem_tool_magnetism.js'));
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function mount(extra = {}) {
  resetStemLab();
  const cfg = loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  let latest;
  let setData;
  const initial = { tab: 'induce', induceMode: 'hand', induceX: -80, induceTurns: 50,
    lastEMF: 0, induceLastPulse: 0, induceStepSeconds: 0, emfTrace: [], peakEMF: 0,
    induceMotionStart: -80, induceMotionFinish: 80, induceMotionDuration: 2,
    induceMotion: null, induceMotionSelected: 0, induceCaptureMode: 'hand',
    learningMode: 'guided', notebookTrials: [], notebookPrediction: '',
    notebookClaim: 'Changing flux produces voltage.', notebookReasoning: 'The signed readings follow the change in flux.',
    notebookOpen: false, labShellPanel: '', missionId: 'power_path', ...extra };
  function Harness() {
    const [toolData, setToolData] = React.useState({ magnetism: initial });
    latest = toolData.magnetism;
    setData = setToolData;
    return cfg.render({ React, toolData, setToolData, addToast() {}, announceToSR() {}, awardXP() {},
      aiHintsEnabled: false, callGemini: null, t: (key, fallback) => fallback || key });
  }
  act(() => root.render(React.createElement(Harness)));
  return { host, state: () => latest,
    patch(patch) { act(() => setData((previous) => ({ ...previous, magnetism: { ...previous.magnetism, ...patch } }))); },
    click(name) {
      const button = [...host.querySelectorAll('button')].find((item) => item.textContent.trim() === name);
      expect(button, name).toBeTruthy();
      act(() => button.click());
    },
    close() { act(() => root.unmount()); host.remove(); }
  };
}

function inputFor(live, name) {
  const label = [...live.host.querySelectorAll('label')].find((item) => item.textContent.startsWith(name));
  expect(label, name).toBeTruthy();
  return live.host.querySelector('#' + label.htmlFor);
}

function change(input, value) {
  expect(input).toBeTruthy();
  const prototype = input.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
  act(() => {
    setter.call(input, String(value));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function event(input, type) {
  act(() => input.dispatchEvent(new Event(type, { bubbles: true })));
}

describe('hand generator measures motion without retaining a live voltage at rest', () => {
  it('uses elapsed pointer time on the common display scale and settles after 350 ms while retaining the reading', () => {
    vi.useFakeTimers();
    let now = 1000;
    vi.spyOn(window.performance, 'now').mockImplementation(() => now);
    const live = mount();
    try {
      const position = live.host.querySelector('#mag-hand-generator-position');
      event(position, 'pointerdown');
      now += 200;
      change(position, -40);
      const expected = physics.induceEMF(50, -80, -40, 0.2, 40) * 0.04;
      expect(live.state().lastEMF).toBeCloseTo(expected, 10);
      expect(live.state().induceStepSeconds).toBeCloseTo(0.2, 10);
      expect(live.host.querySelector('[data-hand-live-voltage]').textContent).toContain(expected.toFixed(2));
      act(() => vi.advanceTimersByTime(349));
      expect(live.state().lastEMF).toBeCloseTo(expected, 10);
      act(() => vi.advanceTimersByTime(1));
      expect(live.state().lastEMF).toBe(0);
      expect(live.state().induceLastPulse).toBeCloseTo(expected, 10);
      expect(live.state().peakEMF).toBeCloseTo(Math.abs(expected), 10);
      expect(live.state().emfTrace.at(-1)).toBe(0);
      expect(live.host.querySelector('[data-hand-last-pulse]').textContent).toContain(expected.toFixed(3));
    } finally { live.close(); vi.restoreAllMocks(); vi.useRealTimers(); }
  });

  it('uses a fixed 0.10 s keyboard step regardless of time between keystrokes', () => {
    vi.useFakeTimers();
    let now = 1000;
    vi.spyOn(window.performance, 'now').mockImplementation(() => now);
    const live = mount();
    try {
      const position = live.host.querySelector('#mag-hand-generator-position');
      event(position, 'keydown');
      change(position, -60);
      now += 3200;
      event(position, 'keydown');
      change(position, -40);
      expect(live.state().induceStepSeconds).toBe(0.1);
      expect(live.state().lastEMF).toBeCloseTo(physics.induceEMF(50, -60, -40, 0.1, 40) * 0.04, 10);
    } finally { live.close(); vi.restoreAllMocks(); vi.useRealTimers(); }
  });

  it('settles immediately on release, pointer cancellation, and blur, clearing each old idle callback', () => {
    vi.useFakeTimers();
    const live = mount();
    try {
      const position = live.host.querySelector('#mag-hand-generator-position');
      for (const [index, exitEvent] of ['pointerup', 'pointercancel', 'focusout'].entries()) {
        change(position, -60 + index * 20);
        const pulse = live.state().lastEMF;
        expect(pulse).not.toBe(0);
        event(position, exitEvent);
        expect(live.state().lastEMF).toBe(0);
        expect(live.state().induceLastPulse).toBe(pulse);
        // A later owner of this state must not be cleared by a cancelled callback.
        live.patch({ lastEMF: 123 });
        act(() => vi.advanceTimersByTime(500));
        expect(live.state().lastEMF).toBe(123);
      }
    } finally { live.close(); vi.useRealTimers(); }
  });

  it('cancels the pending hand callback when navigating to another generator mode or station', () => {
    vi.useFakeTimers();
    const live = mount();
    try {
      change(live.host.querySelector('#mag-hand-generator-position'), -40);
      const recordedPulse = live.state().induceLastPulse;
      live.click('〰️ Rotating coil · speed and phase');
      expect(live.state().lastEMF).toBe(0);
      expect(live.state().induceLastPulse).toBe(recordedPulse);
      live.patch({ lastEMF: 123 });
      act(() => vi.advanceTimersByTime(500));
      expect(live.state().lastEMF).toBe(123);
      live.click('🧲 Hand generator · move a magnet');
      change(live.host.querySelector('#mag-hand-generator-position'), -20);
      live.patch({ tab: 'electro' });
      expect(live.state().lastEMF).toBe(0);
      live.patch({ lastEMF: 456 });
      act(() => vi.advanceTimersByTime(500));
      expect(live.state().lastEMF).toBe(456);
    } finally { live.close(); vi.useRealTimers(); }
  });

  it('saves the signed retained movement with its original turns after settling and changing the live coil', () => {
    vi.useFakeTimers();
    const live = mount();
    try {
      change(live.host.querySelector('#mag-hand-generator-position'), -40);
      const emf = physics.induceEMF(50, -80, -40, 0.1, 40) * 0.04;
      const acquisition = { turns: 50, start: -80, finish: -40, duration: 0.1, emf };
      expect(live.state().induceLastMovement).toEqual(acquisition);
      act(() => vi.advanceTimersByTime(350));
      expect(live.state().lastEMF).toBe(0);
      change(inputFor(live, 'Turns on the coil (N)'), 100);
      expect(live.state().induceTurns).toBe(100);
      expect(live.state().induceLastMovement).toEqual(acquisition);
      live.patch({ notebookOpen: true, labShellPanel: 'evidence' });
      live.click('Record current trial');
      const saved = live.state().notebookTrials[0];
      expect(saved.inductionMovement).toEqual(acquisition);
      expect(saved.result).toContain('N 50');
      expect(saved.result).toContain('x -80 → -40');
      expect(saved.result).toContain(emf.toFixed(3));
      expect(saved.metrics.find((item) => item.key === 'last_movement_voltage').value).toBeCloseTo(emf, 10);
      expect(saved.metrics.find((item) => item.key === 'last_movement_duration').value).toBe(0.1);
      expect(saved.metrics.find((item) => item.key === 'last_movement_turns').value).toBe(50);
      const report = JSON.parse(JSON.stringify(physics.missionReportState('power_path', live.state())));
      expect(report.trials[0].inductionMovement).toEqual(acquisition);
      const frozen = JSON.stringify(saved);
      live.patch({ labShellPanel: '', notebookOpen: false });
      change(live.host.querySelector('#mag-hand-generator-position'), -20);
      expect(live.state().induceLastMovement.turns).toBe(100);
      expect(JSON.stringify(live.state().notebookTrials[0])).toBe(frozen);
    } finally { live.close(); vi.useRealTimers(); }
  });

  it('records the speed presets and zero-duration still control as explicit acquisition snapshots', () => {
    const live = mount();
    try {
      live.click('Slow · 1.00 s');
      expect(live.state().induceLastMovement).toEqual({ turns: 50, start: -60, finish: -20, duration: 1,
        emf: physics.induceEMF(50, -60, -20, 1, 40) * 0.04 });
      live.click('Fast · 0.25 s');
      expect(live.state().induceLastMovement).toEqual({ turns: 50, start: -60, finish: -20, duration: 0.25,
        emf: physics.induceEMF(50, -60, -20, 0.25, 40) * 0.04 });
      live.click('Hold still');
      const still = { turns: 50, start: -20, finish: -20, duration: 0, emf: 0 };
      expect(live.state().induceLastMovement).toEqual(still);
      live.click('Record evidence in notebook');
      live.click('Record current trial');
      const saved = live.state().notebookTrials[0];
      expect(saved.inductionMovement).toEqual(still);
      expect(saved.metrics.find((item) => item.key === 'last_movement_voltage').value).toBe(0);
      expect(saved.metrics.find((item) => item.key === 'last_movement_duration').value).toBe(0);
      expect(physics.missionReportState('power_path', live.state()).trials[0].inductionMovement).toEqual(still);
    } finally { live.close(); }
  });
});

describe('timed induction investigation keeps a reproducible evidence record', () => {
  it('records all 41 samples and inspects signed intervals without moving the live magnet', () => {
    const live = mount();
    try {
      live.click('Run timed motion');
      expect(live.state().induceMotion.samples).toHaveLength(41);
      expect(live.state()).toMatchObject({ induceX: 80, lastEMF: 0, induceCaptureMode: 'motion' });
      const studio = live.host.querySelector('[data-induction-motion-studio]');
      expect(studio.querySelectorAll('tbody tr')).toHaveLength(41);
      expect(studio.textContent).toContain('initial position.');
      live.click('Next motion sample');
      expect(live.state().induceMotionSelected).toBe(1);
      expect(studio.querySelector('[data-motion-reading]').textContent).toContain('increasing');
      change(live.host.querySelector('#mag-motion-sample'), 30);
      expect(live.host.querySelector('[data-motion-reading]').textContent).toContain('decreasing');
      expect(live.state()).toMatchObject({ induceX: 80, lastEMF: 0 });
      expect(live.state().induceMotion.meanEMF).toBeCloseTo(0, 10);
      expect(live.state().induceMotion.peakMagnitude).toBeGreaterThan(0);
    } finally { live.close(); }
  });

  it('keeps recorded samples and saved metrics tied to the run when next-run controls change', () => {
    const live = mount();
    try {
      live.click('Run timed motion');
      const recorded = JSON.stringify(live.state().induceMotion);
      change(inputFor(live, 'Motion duration (s)'), 0.5);
      change(inputFor(live, 'Turns on the coil (N)'), 100);
      live.click('Withdraw from coil');
      expect(JSON.stringify(live.state().induceMotion)).toBe(recorded);
      expect(live.host.textContent).toContain('Controls changed for the next run; these recorded samples stay fixed.');
      live.click('Save motion trial');
      const trial = live.state().notebookTrials[0];
      expect(trial.motionExperiment.controls).toEqual({ turns: 50, start: -80, finish: 80, duration: 2, steps: 41 });
      expect(trial.setup).toContain('50 turns, x -80 → 80, 2.00 s');
      expect(trial.metrics.find((item) => item.key === 'motion_duration')).toMatchObject({ value: 2, model: 'induce:motion' });
      expect(trial.metrics.find((item) => item.key === 'motion_peak').value).toBe(trial.motionExperiment.peakMagnitude);
      expect(trial.metrics.some((item) => item.key === 'voltage_V')).toBe(false);
      const frozenTrial = JSON.stringify(trial);
      live.click('Run timed motion');
      expect(live.state().induceMotion.controls).toMatchObject({ turns: 100, start: 0, finish: 80, duration: 0.5 });
      expect(JSON.stringify(live.state().notebookTrials[0])).toBe(frozenTrial);
      const report = JSON.parse(JSON.stringify(physics.missionReportState('power_path', live.state())));
      expect(report.rawMotionSampleCount).toBe(41);
      expect(report.trials[0].motionExperiment).toEqual(JSON.parse(recorded));
    } finally { live.close(); }
  });

  it('downloads the complete signed timeline in the mission JSON report', async () => {
    const live = mount();
    const createURL = window.URL.createObjectURL;
    const revokeURL = window.URL.revokeObjectURL;
    let exported;
    window.URL.createObjectURL = vi.fn((blob) => { exported = blob; return 'blob:induction-report'; });
    window.URL.revokeObjectURL = vi.fn();
    const download = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    try {
      live.click('Run timed motion');
      live.click('Save motion trial');
      live.patch({ labShellPanel: 'mission', missionPanelOpen: true });
      live.click('Save JSON report');
      expect(download).toHaveBeenCalledOnce();
      const text = await new Promise((resolveText, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolveText(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(exported);
      });
      const report = JSON.parse(text);
      expect(report.rawMotionSampleCount).toBe(41);
      expect(report.trials[0].motionExperiment).toEqual(live.state().notebookTrials[0].motionExperiment);
      expect(report.trials[0].motionExperiment.samples.some((sample) => sample.emf < 0)).toBe(true);
      expect(report.trials[0].motionExperiment.samples.some((sample) => sample.emf > 0)).toBe(true);
      await new Promise((done) => setTimeout(done, 0));
    } finally {
      live.close(); download.mockRestore();
      window.URL.createObjectURL = createURL; window.URL.revokeObjectURL = revokeURL;
    }
  });

  it('reopens saved settings and samples from another station while preserving notebook writing', () => {
    const live = mount();
    try {
      live.click('Run timed motion');
      live.click('Save motion trial');
      const trials = JSON.stringify(live.state().notebookTrials);
      live.patch({ tab: 'electro', induceTurns: 150, induceMotionDuration: 0.5, induceMotion: null,
        notebookPrediction: 'My next trial will double the speed.', notebookOpen: true, labShellPanel: 'evidence' });
      live.click('Reopen motion');
      expect(live.state()).toMatchObject({ tab: 'induce', induceMode: 'hand', induceTurns: 50,
        induceMotionStart: -80, induceMotionFinish: 80, induceMotionDuration: 2,
        induceMotionSelected: 0, induceCaptureMode: 'motion', lastEMF: 0, induceX: 80,
        notebookOpen: false, labShellPanel: '', notebookPrediction: 'My next trial will double the speed.',
        notebookClaim: 'Changing flux produces voltage.', notebookReasoning: 'The signed readings follow the change in flux.' });
      expect(live.state().induceMotion.samples).toHaveLength(41);
      expect(JSON.stringify(live.state().notebookTrials)).toBe(trials);
      live.click('Run timed motion');
      expect(live.state().induceMotion).toEqual(live.state().notebookTrials[0].motionExperiment);
      expect(JSON.stringify(live.state().notebookTrials)).toBe(trials);
    } finally { live.close(); }
  });

  it('opens the visible Evidence Studio after completing the controlled slow, fast, and still runs', () => {
    const live = mount();
    try {
      live.click('Slow · 1.00 s');
      live.click('Fast · 0.25 s');
      live.click('Hold still');
      const evidence = physics.inductionSpeedEvidenceState(live.state().induceSpeedTrials);
      expect(evidence.valid).toBe(true);
      expect(evidence.ratio).toBeCloseTo(4, 10);
      live.click('Record evidence in notebook');
      expect(live.state()).toMatchObject({ notebookOpen: true, labShellPanel: 'evidence' });
      expect(live.host.querySelector('[data-magnetism-shell-panel="evidence"]').hidden).toBe(false);
      expect(live.host.textContent).toContain('Evidence Studio');
    } finally { live.close(); }
  });

  it('preserves the recorded 81-sample acquisition grid when reopening and rerunning a valid saved experiment', () => {
    const motion = physics.inductionMotionExperiment({ turns: 70, start: -75, finish: 15, duration: 1.5, steps: 81 });
    const live = mount({ induceMotion: motion, induceCaptureMode: 'motion' });
    try {
      live.click('Save motion trial');
      const saved = JSON.stringify(live.state().notebookTrials[0]);
      live.patch({ tab: 'electro', induceMotion: null, induceMotionSteps: 41,
        notebookOpen: true, labShellPanel: 'evidence' });
      live.click('Reopen motion');
      expect(live.state().induceMotionSteps).toBe(81);
      live.click('Run timed motion');
      expect(live.state().induceMotion).toEqual(motion);
      expect(live.state().induceMotion.samples).toHaveLength(81);
      expect(live.host.querySelector('[data-induction-motion-studio]').querySelectorAll('tbody tr')).toHaveLength(81);
      expect(JSON.stringify(live.state().notebookTrials[0])).toBe(saved);
    } finally { live.close(); }
  });
});
