// Partner-scored running record (student AI-off sweep, wave 2, 2026-11-04).
// "Record my reading" sends the student's voice to Gemini, so it is hidden when
// student AI is off. The replacement is the way people measure oral reading
// fluency: a partner taps misread/skipped words and marks the last word read;
// WCPM = (words attempted - errors) / minutes, computed on the device. These
// tests pin the math, the tap interaction, the save hand-off to PhaseK, and that
// this mode never touches the network or the microphone.
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(__dirname, '..');
const React = require(path.resolve(ROOT, 'desktop/web-app/node_modules/react'));
const { createRoot } = require(path.resolve(ROOT, 'desktop/web-app/node_modules/react-dom/client'));

let F;
let Panel;
let K;
beforeAll(() => {
  globalThis.React = React;
  window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('fluency_module.js');
  loadAlloModule('view_misc_panels_module.js');
  loadAlloModule('phase_k_helpers_module.js');
  F = window.AlloModules.Fluency;
  Panel = window.AlloModules.FluencyModePanel;
  K = window.AlloModules.PhaseKHelpers;
});

const words = (n) => Array.from({ length: n }, (_, i) => 'w' + (i + 1));

describe('partner check math', () => {
  it('scores words attempted minus errors per minute, ignoring errors past the last word', () => {
    const r = F.buildPartnerFluencyResult({
      words: words(100), errorIndexes: [3, 10, 99], lastWordIndex: 59, durationSeconds: 60, timeLimitSeconds: 60,
      recordId: 'p1', timestamp: '2026-11-04T12:00:00.000Z',
    });
    expect(r).toMatchObject({
      recordId: 'p1', scoringMethod: 'partner', audioCaptured: false,
      wordsAttempted: 60, errorCount: 2, correctWords: 58, wcpm: 58, accuracy: 97, durationSeconds: 60,
      totalReferenceWordCount: 60, passageWordCount: 100, insertions: [], review: { status: 'unreviewed' },
    });
    expect(r.wordData).toHaveLength(60);
    expect(r.wordData[3]).toEqual({ word: 'w4', status: 'mispronounced' });
    expect(r.wordData[4]).toEqual({ word: 'w5', status: 'correct' });
    expect(r.passageMetadata.calibrated).toBe(false);
  });

  it('uses the elapsed time for a whole-passage read and caps a timed read at the limit', () => {
    const whole = F.buildPartnerFluencyResult({ words: words(20), errorIndexes: [3], lastWordIndex: 19, durationSeconds: 30, timeLimitSeconds: 0 });
    expect(whole).toMatchObject({ wcpm: 38, accuracy: 95, correctWords: 19, durationSeconds: 30, timeLimitSeconds: 0 });
    const capped = F.buildPartnerFluencyResult({ words: words(70), errorIndexes: [], lastWordIndex: 69, durationSeconds: 75, timeLimitSeconds: 60 });
    expect(capped).toMatchObject({ durationSeconds: 60, wcpm: 70, accuracy: 100 });
  });

  it('agrees with the shared WCPM math, so a teacher review recomputes the same numbers', () => {
    const r = F.buildPartnerFluencyResult({ words: words(40), errorIndexes: [0, 1, 2, 3], lastWordIndex: 39, durationSeconds: 45 });
    expect(F.calculateLocalFluencyMetrics(r.wordData, 45, 40, [])).toEqual({ accuracy: r.accuracy, wcpm: r.wcpm, correctWords: r.correctWords });
    expect(r).toMatchObject({ correctWords: 36, wcpm: 48, accuracy: 90 });
    const reviewed = F.applyFluencyReview(r, { wordData: r.wordData }, { reviewedAt: '2026-11-04T12:05:00.000Z' });
    expect(reviewed).toMatchObject({ wcpm: r.wcpm, accuracy: r.accuracy, scoringMethod: 'partner' });
  });

  it('tokenizes like the AI path: punctuation-only tokens are not words', () => {
    expect(F.tokenizeFluencyPassage('The cat — sat.\n\nOn the "mat"!')).toEqual(['The', 'cat', 'sat.', 'On', 'the', '"mat"!']);
    expect(F.buildPartnerFluencyResult({ passageText: '', lastWordIndex: 0, durationSeconds: 10 })).toMatchObject({ wordsAttempted: 0, wcpm: 0, accuracy: 0 });
  });
});

const PASSAGE = 'One two three four five six seven eight nine ten.';

function mountPanel({ teacher = false, recordingSpy, initialResult = null } = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const state = {};
  const t = () => undefined;
  function Host() {
    const [fluencyStatus, setFluencyStatus] = React.useState(initialResult ? 'complete' : 'idle');
    const [fluencyResult, setFluencyResult] = React.useState(initialResult);
    const [fluencyFeedback, setFluencyFeedback] = React.useState('');
    const [fluencyTranscript, setFluencyTranscript] = React.useState('');
    Object.assign(state, { fluencyStatus, fluencyResult });
    return React.createElement(Panel, {
      ConfettiExplosion: () => null, FLUENCY_BENCHMARKS: { 3: {} }, calculateRunningRecordMetrics: F.calculateRunningRecordMetrics,
      exportFluencyCSV: () => {}, generateFluencyScoreSheet: () => {}, getBenchmarkComparison: () => ({ level: 'at', target: 90 }),
      fluencyBenchmarkGrade: '3', fluencyBenchmarkSeason: 'winter', fluencyCustomNorms: { fall: 0, winter: 0, spring: 0 },
      fluencyFeedback, fluencyModalRef: { current: null }, fluencyResult, fluencyStatus, fluencyTimeLimit: 0, fluencyTimeRemaining: 0,
      fluencyTimerVisibility: 'visible', fluencyTranscript, generatedContent: { id: 'res-1', title: 'Counting', data: PASSAGE },
      isFluencyMode: true, setFluencyBenchmarkGrade() {}, setFluencyBenchmarkSeason() {}, setFluencyCustomNorms() {},
      setFluencyFeedback, setFluencyResult, setFluencyStatus, setFluencyTimeLimit() {}, setFluencyTimeRemaining() {},
      setFluencyTimerVisibility() {}, setFluencyTranscript, setIsFluencyMode() {}, showFluencyConfetti: false, t,
      toggleFluencyRecording: recordingSpy, applyFluencyReview: F.applyFluencyReview, fluencyAssessments: [], isTeacherMode: teacher,
      saveFluencyReview: null, summarizeFluencyEvidence: F.summarizeFluencyEvidence,
    });
  }
  React.act(() => root.render(React.createElement(Host)));
  return { container, root, state };
}
const buttons = (c) => Array.from(c.querySelectorAll('button'));
const byText = (c, text) => buttons(c).find((b) => b.textContent.trim() === text);
const wordButton = (c, word) => c.querySelector('[data-fluency-partner-words]') && Array.from(c.querySelectorAll('[data-fluency-partner-words] button')).find((b) => b.textContent === word);
const click = (el) => React.act(() => { el.click(); });

describe('partner check in the fluency panel', () => {
  let now;
  let fetchSpy;
  let gumSpy;
  let mounted;
  beforeEach(() => {
    now = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    fetchSpy = vi.fn(() => Promise.reject(new Error('no network in partner check')));
    window.fetch = fetchSpy;
    gumSpy = vi.fn(() => Promise.reject(new Error('no microphone in partner check')));
    Object.defineProperty(window.navigator, 'mediaDevices', { value: { getUserMedia: gumSpy }, configurable: true });
    window.startFluencyRecording = vi.fn();
  });
  afterEach(() => {
    if (mounted) React.act(() => mounted.root.unmount());
    mounted = null;
    delete window.__alloStudentAiDisabled;
    delete window.__alloFluencyPartnerResult;
    delete window.startFluencyRecording;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('with student AI off: no recorder, partner taps errors, results and save hand-off without audio', async () => {
    window.__alloStudentAiDisabled = true;
    const deps = {
      fluencyStatus: 'idle', generatedContent: { id: 'res-1' },
      setFluencyAssessments: vi.fn(), setHistory: vi.fn(), setFluencyResult: vi.fn(), setFluencyFeedback: vi.fn(), setFluencyStatus: vi.fn(),
      setFluencyTranscript: vi.fn(), handleScoreUpdate: vi.fn(() => 50), playSound: vi.fn(), addToast: vi.fn(), t: () => undefined, warnLog: () => {},
    };
    const recordingSpy = vi.fn(() => K.toggleFluencyRecording(deps));
    mounted = mountPanel({ recordingSpy });
    const c = mounted.container;
    expect(c.querySelector('[data-help-key="fluency_mode_record_btn"]')).toBeNull();
    expect(byText(c, 'Record my reading')).toBeUndefined();
    expect(window.__alloFluencyPartnerActive).toBe(true);

    React.act(() => {
      const select = c.querySelector('[data-fluency-partner-setup] select');
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
      setter.call(select, '0');
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    click(byText(c, 'Start reading'));
    const three = wordButton(c, 'three');
    expect(three.getAttribute('aria-pressed')).toBe('false');
    click(three);
    expect(wordButton(c, 'three').getAttribute('aria-pressed')).toBe('true');
    click(wordButton(c, 'five'));
    click(wordButton(c, 'five'));
    expect(wordButton(c, 'five').getAttribute('aria-pressed')).toBe('false');

    now += 30_000;
    click(byText(c, 'Stop reading'));
    // Stopping by hand marks the final word as the last word read.
    expect(wordButton(c, 'ten.').getAttribute('aria-pressed')).toBe('true');
    click(byText(c, 'Show results'));

    expect(mounted.state.fluencyStatus).toBe('complete');
    expect(mounted.state.fluencyResult).toMatchObject({ scoringMethod: 'partner', wordsAttempted: 10, errorCount: 1, wcpm: 18, accuracy: 90, durationSeconds: 30 });
    expect(c.textContent).toContain('90%');
    expect(c.textContent).toContain('Practice score from a partner check');
    // Benchmark labels belong to the teacher; a partner tap does not say substitution vs omission.
    expect(c.textContent).not.toContain('Target WCPM');
    expect(c.querySelector('.grid.grid-cols-2.sm\\:grid-cols-4')).toBeNull();

    // Saved the way the AI path saves, through PhaseK, with no audio.
    expect(recordingSpy).toHaveBeenCalledTimes(1);
    expect(window.__alloFluencyPartnerResult).toBeNull();
    expect(deps.setFluencyAssessments).toHaveBeenCalledTimes(1);
    expect(deps.setFluencyAssessments.mock.calls[0][0]([])).toEqual([expect.objectContaining({ scoringMethod: 'partner', wcpm: 18 })]);
    const history = deps.setHistory.mock.calls[0][0]([]);
    expect(history).toEqual([expect.objectContaining({ type: 'fluency-record', config: expect.objectContaining({ scoringMethod: 'partner', benchmarkEligible: false }) })]);
    expect(history[0].data.audioRecording).toBe('');
    expect(history[0].data.sourceText).toBe(PASSAGE);
    expect(deps.handleScoreUpdate).toHaveBeenCalledWith(50, 'Partner Reading Check', 'res-1');
    expect(deps.setFluencyTranscript).not.toHaveBeenCalled();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(gumSpy).not.toHaveBeenCalled();
    expect(window.startFluencyRecording).not.toHaveBeenCalled();
  });

  it('timed read: time up asks for the last word, then scores only the words read', () => {
    window.__alloStudentAiDisabled = true;
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    mounted = mountPanel({ recordingSpy: vi.fn() });
    const c = mounted.container;
    click(byText(c, 'Start reading'));
    click(wordButton(c, 'two'));
    now += 61_000;
    React.act(() => { vi.advanceTimersByTime(300); });
    expect(c.textContent).toContain('Tap the last word read.');
    expect(byText(c, 'Show results').disabled).toBe(true);
    click(wordButton(c, 'six'));
    expect(byText(c, 'Show results').disabled).toBe(false);
    click(byText(c, 'Show results'));
    expect(mounted.state.fluencyResult).toMatchObject({ wordsAttempted: 6, errorCount: 1, correctWords: 5, wcpm: 5, accuracy: 83, durationSeconds: 60 });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(gumSpy).not.toHaveBeenCalled();
  });

  it('with AI available, teachers keep the recorder and can choose the partner check; the mic stays shut while it is open', async () => {
    const recordingSpy = vi.fn();
    mounted = mountPanel({ teacher: true, recordingSpy });
    const c = mounted.container;
    expect(c.querySelector('[data-help-key="fluency_mode_record_btn"]')).not.toBeNull();
    expect(byText(c, 'Partner check').getAttribute('aria-pressed')).toBe('false');
    expect(window.__alloFluencyPartnerActive).not.toBe(true);
    click(byText(c, 'Partner check'));
    expect(byText(c, 'Partner check').getAttribute('aria-pressed')).toBe('true');
    expect(c.querySelector('[data-help-key="fluency_mode_record_btn"]')).toBeNull();
    expect(window.__alloFluencyPartnerActive).toBe(true);
    // The host Space shortcut calls toggleFluencyRecording; PhaseK must not open the mic.
    const deps = { fluencyStatus: 'idle', setFluencyTranscript: vi.fn(), setFluencyResult: vi.fn(), setFluencyFeedback: vi.fn(), setShowFluencyConfetti: vi.fn(), t: () => '', warnLog: () => {} };
    await K.toggleFluencyRecording(deps);
    expect(window.startFluencyRecording).not.toHaveBeenCalled();
    expect(deps.setFluencyTranscript).not.toHaveBeenCalled();
    React.act(() => mounted.root.unmount());
    mounted = null;
    expect(window.__alloFluencyPartnerActive).toBe(false);
  });
});

describe('partner check reading label', () => {
  const result = () => F.buildPartnerFluencyResult({ words: PASSAGE.split(' '), errorIndexes: [0, 1, 2, 3, 4], lastWordIndex: 9, durationSeconds: 20 });
  const chip = (c) => c.querySelector('.bg-red-100.text-red-700.border-red-300');
  it('a student never sees the band on an AI-scored reading; a teacher does', () => {
    const scored = { ...result(), scoringMethod: 'ai' };
    const student = mountPanel({ initialResult: scored });
    expect(student.container.textContent).toContain('50%');
    expect(chip(student.container)).toBeNull();
    React.act(() => student.root.unmount());
    student.container.remove();
    const teacher = mountPanel({ teacher: true, initialResult: scored });
    expect(chip(teacher.container)).not.toBeNull();
    React.act(() => teacher.root.unmount());
    teacher.container.remove();
  });

  it('a student partner score carries no Frustrational label; a teacher still sees it', () => {
    const student = mountPanel({ initialResult: result() });
    expect(student.container.textContent).toContain('50%');
    expect(chip(student.container)).toBeNull();
    React.act(() => student.root.unmount());
    student.container.remove();
    const teacher = mountPanel({ teacher: true, initialResult: result() });
    expect(chip(teacher.container)).not.toBeNull();
    React.act(() => teacher.root.unmount());
    teacher.container.remove();
  });
});
