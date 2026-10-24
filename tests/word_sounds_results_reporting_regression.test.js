import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {Blob as NodeBlob} from 'node:buffer';
import {parse} from '@babel/parser';
import {React, baseProps, setupWordSounds} from './helpers/word_sounds_harness.js';
import {installCanvasStub, makePackItem} from './helpers/word_sounds_pack_fixture.js';

const require = createRequire(import.meta.url);
const {createRoot} = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const {act} = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const runtime = readFileSync('word_sounds_module.js', 'utf8');
const analytics = readFileSync('student_analytics_module.js', 'utf8');
function initializer(source, name) {
  let found;
  function visit(node) {
    if (!node || typeof node !== 'object' || found) return;
    if (node.type === 'VariableDeclarator' && node.id?.name === name) {found = source.slice(node.init.start, node.init.end); return;}
    if (node.type === 'AssignmentExpression' && node.left?.property?.name === name) {found = source.slice(node.right.start, node.right.end); return;}
    Object.values(node).forEach(value => Array.isArray(value) ? value.forEach(visit) : visit(value));
  }
  visit(parse(source, {sourceType: 'script', plugins: ['jsx']}));
  if (!found) throw Error('Missing source function ' + name);
  return found;
}
const statsFor = Function('return (' + initializer(analytics, 'calculateStudentStats') + ')')();
const classify = Function('rtiThresholds', 'return (' + initializer(analytics, 'classifyRTITier') + ')')(null);
const rows = (correct = false, activity = 'counting') => Array.from({length: 10}, (_, i) => ({word: 'word' + i, activity, correct}));
const dataFor = (history, score = {correct: 0, total: history.length}) => ({responses: {quiz: {score: 95}}, wordSoundsState: {
  history, sessionScore: score, dailyProgress: {one: {}, two: {}, three: {}}}});

describe('Word Sounds zero accuracy remains measured evidence', () => {
  it.each([0, 1])('retains %s correct out of ten and prioritizes Word Sounds review', count => {
    const history = rows().map((row, i) => ({...row, correct: i < count}));
    const stats = statsFor(dataFor(history, {correct: count, total: 10}));
    expect(stats).toMatchObject({wsAccuracy: count * 10, wsGradedAttempts: 10, wsWordsCompleted: 10});
    expect(classify(stats)).toMatchObject({tier: 3});
    expect(classify(stats).reasons.join(' ')).toContain('Word Sounds accuracy below');
  });
  it.each([[], rows(true, 'letter_tracing'), rows(true).map(row => ({...row, practiceOnly: true}))].map(history => [history]))('does not turn absent or practice-only evidence into a measured zero', history => {
    const stats = statsFor(dataFor(history));
    expect(stats.wsAccuracy).toBeNull(); expect(stats.wsGradedAttempts).toBe(0);
    expect(classify(stats).reasons.join(' ')).not.toContain('Word Sounds');
  });
  it('uses a legacy aggregate zero when graded responses were not retained', () => {
    expect(statsFor(dataFor([], {correct: 0, total: 10}))).toMatchObject({wsAccuracy: 0, wsGradedAttempts: 10});
  });
  it('retains legacy isCorrect response evidence', () => {
    const history = rows().map(({correct, ...row}) => ({...row, isCorrect: true}));
    expect(statsFor(dataFor(history))).toMatchObject({wsAccuracy: 100, wsGradedAttempts: 10});
  });
  it('does not resurrect a stale aggregate when the saved summary explicitly has no graded evidence', () => {
    const data = dataFor([], {correct: 0, total: 5});
    data.studentProgressSummary = {academic: {wordSoundsWords: 5, wordSoundsGradedAttempts: 0, wordSoundsAccuracy: null}};
    expect(statsFor(data)).toMatchObject({wsAccuracy: null, wsGradedAttempts: 0});
  });
  it('does not let a summary overwrite a practice-only raw history', () => {
    const data = dataFor(rows(true, 'letter_tracing'), {correct: 10, total: 10});
    data.studentProgressSummary = {academic: {wordSoundsWords: 10, wordSoundsAccuracy: 100}};
    expect(statsFor(data)).toMatchObject({wsAccuracy: null, wsGradedAttempts: 0});
  });
  it('accepts a measured summary zero but keeps a zero-item summary unavailable', () => {
    expect(statsFor({studentProgressSummary: {academic: {wordSoundsWords: 10, wordSoundsGradedAttempts: 10, wordSoundsAccuracy: 0}}}))
      .toMatchObject({wsAccuracy: 0, wsGradedAttempts: 10});
    expect(statsFor({studentProgressSummary: {academic: {wordSoundsWords: 10, wordSoundsGradedAttempts: 0, wordSoundsAccuracy: 0}}}))
      .toMatchObject({wsAccuracy: null, wsGradedAttempts: 0});
  });
  it('retains graded evidence counts and observed zeros in the saved project summary', () => {
    const phaseSource = readFileSync('phase_k_helpers_source.jsx', 'utf8');
    const summarize = Function('return (' + initializer(phaseSource, 'buildStudentProgressSummary') + ')')();
    const measured = summarize({wordSoundsHistory: rows(), wordSoundsScore: {correct: 0, total: 10}});
    expect(measured.academic).toMatchObject({wordSoundsWords: 10, wordSoundsGradedAttempts: 10, wordSoundsAccuracy: 0});
    const practice = summarize({wordSoundsHistory: rows(true, 'letter_tracing'), wordSoundsScore: {correct: 10, total: 10}});
    expect(practice.academic).toMatchObject({wordSoundsWords: 10, wordSoundsGradedAttempts: 0, wordSoundsAccuracy: null});
    expect(statsFor({studentProgressSummary: practice})).toMatchObject({wsAccuracy: null, wsGradedAttempts: 0});
  });
  it('exports a genuine zero as 0% and unavailable evidence as N/A', async () => {
    const importedStudents = [
      {name: 'Zero', stats: statsFor(dataFor(rows())), safetyFlags: [], lastSession: 1700000000000},
      {name: 'No evidence', stats: statsFor(dataFor([])), safetyFlags: [], lastSession: 1700000000000},
    ];
    const blobs = [], oldCreate = URL.createObjectURL, oldRevoke = URL.revokeObjectURL;
    vi.stubGlobal('Blob', NodeBlob);
    URL.createObjectURL = blob => {blobs.push(blob); return 'blob:analytics';}; URL.revokeObjectURL = () => {};
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    try {
      Function('importedStudents', 't', 'return (' + initializer(analytics, 'handleExportCSV') + ')')(importedStudents, key => key)();
      const csv = await blobs[0].text(), rows = csv.split('\n');
      const column = rows[0].split(',').indexOf('Word Sounds %');
      expect(rows[1].split(',')[column]).toBe('0%'); expect(rows[2].split(',')[column]).toBe('N/A');
    } finally {URL.createObjectURL = oldCreate; URL.revokeObjectURL = oldRevoke; click.mockRestore(); vi.unstubAllGlobals();}
  });
});

const treeReact = {createElement: (type, props, ...children) => ({type, props: props || {}, children})};
const allNodes = node => Array.isArray(node) ? node.flatMap(allNodes) : node && typeof node === 'object'
  ? [node, ...(node.children || []).flatMap(allNodes)] : [];
const textOf = node => Array.isArray(node) ? node.map(textOf).join('') : node && typeof node === 'object'
  ? (node.children || []).map(textOf).join('') : node == null || typeof node === 'boolean' ? '' : String(node);
function probeHarness() {
  const context = {
    probeStartTimeRef: {current: 1000}, probeEndTimeRef: {current: null}, probeResultRef: {current: null},
    probeCompletionSentRef: {current: false}, probeHiddenMsRef: {current: 0}, probeHiddenSinceRef: {current: null},
    wordSoundsScore: {correct: 2, total: 3}, learnerScopedHistory: [], effectiveProbeGrade: 'K', wordSoundsActivity: 'counting',
    probeResultsDialogRef: {current: null}, handleDialogKeyDown() {}, t: key => key, ts: key => key,
    PROBE_INTERRUPTION_MS: 2000, sessionWordResults: {current: []}, isTeacherMode: true, isParentMode: false,
    effectiveProbeForm: 'A', effectiveProbeFormId: 'form-a', runtimeSessionConfig: {}, historyLearnerId: 'learner-a',
    activeHistorySessionIdRef: {current: 'run-a'}, historyResourceId: 'resource-a', sessionConfigVersion: 1,
    isFixedForm: true, probeItemGoal: 3, computeProbeByBand: vi.fn(() => ({easy: {c: 2, t: 3}, medium: {c: 0, t: 0}, hard: {c: 0, t: 0}})),
    resetRuntimeSession: vi.fn(), onClose: vi.fn(), onProbeComplete: vi.fn(),
  };
  const definitions = ['probeHiddenMs', 'buildProbePayload', 'freezeProbeResult', 'emitProbeComplete', 'renderProbeResults']
    .map(name => 'const ' + name + ' = ' + initializer(runtime, name) + ';').join('\n');
  const methods = Function('React', 'WordSoundsCountResults', 'context', `const {${Object.keys(context).join(',')}} = context;
    ${definitions}
    return {buildProbePayload,freezeProbeResult,emitProbeComplete,renderProbeResults};`)(treeReact, () => null, context);
  return {...methods, context};
}
describe('completed probe result snapshots', () => {
  beforeEach(() => vi.useFakeTimers({now: 61000}));
  afterEach(() => {vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();});
  it.each([false, true])('keeps renderer, CSV, and Done identical after waiting (already emitted: %s)', emitted => {
    const probe = probeHarness(); const {context} = probe;
    const completed = probe.freezeProbeResult(context.wordSoundsScore);
    if (emitted) probe.emitProbeComplete(context.wordSoundsScore);
    expect(completed).toMatchObject({duration: 60, itemsPerMin: 2, correct: 2, total: 3});
    vi.setSystemTime(181000);
    context.wordSoundsScore.correct = 99;
    const result = probe.renderProbeResults();
    const blobs = []; vi.stubGlobal('Blob', NodeBlob);
    const oldCreate = URL.createObjectURL, oldRevoke = URL.revokeObjectURL;
    URL.createObjectURL = blob => {blobs.push(blob); return 'blob:probe';}; URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    try {
      const buttons = allNodes(result).filter(node => node.type === 'button');
      buttons.find(node => textOf(node).includes('word_sounds.download_csv')).props.onClick();
      buttons.find(node => textOf(node) === 'common.done').props.onClick();
      expect(context.onProbeComplete).toHaveBeenCalledExactlyOnceWith(completed);
      expect(context.computeProbeByBand).toHaveBeenCalledTimes(1);
      expect(probe.buildProbePayload({correct: 99, total: 99})).toBe(completed);
      return blobs[0].text().then(csv => {
        const cells = csv.split('\r\n')[1].split(',');
        expect(cells.slice(3, 8)).toEqual(['3', '2', '67', '2', '60']);
      });
    } finally {URL.createObjectURL = oldCreate; URL.revokeObjectURL = oldRevoke;}
  });
  it('includes an active hidden interval and caps it at completion', () => {
    const probe = probeHarness(); probe.context.probeHiddenSinceRef.current = 56000;
    const completed = probe.freezeProbeResult(probe.context.wordSoundsScore);
    expect(completed).toMatchObject({hiddenMs: 5000, interrupted: true});
    vi.setSystemTime(181000);
    expect(probe.buildProbePayload(probe.context.wordSoundsScore)).toMatchObject({hiddenMs: 5000, duration: 60});
  });
});

let Modal, root, container, current, props;
const completion = vi.fn();
beforeAll(() => {installCanvasStub(); ({WordSoundsModal: Modal} = setupWordSounds());});
class CompleteAudio {
  constructor(src = '') {this.src = src; this.paused = true; this.listeners = new Map(); queueMicrotask(() => this.emit('canplaythrough'));}
  addEventListener(name, fn) {if (!this.listeners.has(name)) this.listeners.set(name, new Set()); this.listeners.get(name).add(fn);}
  removeEventListener(name, fn) {this.listeners.get(name)?.delete(fn);}
  emit(name) {this['on' + name]?.(); for (const fn of this.listeners.get(name) || []) fn();}
  canPlayType() {return 'probably';} load() {queueMicrotask(() => this.emit('canplaythrough'));}
  removeAttribute() {} pause() {this.paused = true;}
  play() {this.paused = false; setTimeout(() => {if (!this.paused) this.emit('ended');}, 1); return Promise.resolve();}
}
const pack = [makePackItem()];
function Host(overrides) {
  const [word, setWord] = React.useState(null), [data, setData] = React.useState(null);
  const [score, setScore] = React.useState({correct: 0, total: 0, streak: 0});
  const [history, setHistory] = React.useState([]), [feedback, setFeedback] = React.useState(null);
  current = {word, score, history, setScore, setHistory};
  return React.createElement(Modal, {...baseProps('counting'), allowRuntimeAi: false, isTeacherMode: false,
    disableAnimations: true, sessionId: 'clock-a', wsPreloadedWords: pack, isProbeMode: true,
    sessionConfig: {fixedForm: true, probeItemCount: 1}, onProbeComplete: completion, ...overrides,
    currentWordSoundsWord: word, setCurrentWordSoundsWord: setWord, wordSoundsPhonemes: data, setWordSoundsPhonemes: setData,
    wordSoundsScore: score, setWordSoundsScore: setScore, wordSoundsHistory: history, setWordSoundsHistory: setHistory,
    wordSoundsFeedback: feedback, setWordSoundsFeedback: setFeedback});
}
async function render(next = {}) {props = {...props, ...next}; await act(async () => root.render(React.createElement(Host, props)));}
async function tick(ms) {await act(async () => vi.advanceTimersByTimeAsync(ms));}
describe('actual probe clock ownership', () => {
  beforeEach(() => {
    vi.useFakeTimers({now: 1700000000000}); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('Audio', CompleteAudio); completion.mockClear();
    container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); props = {};
  });
  afterEach(async () => {
    if (root) await act(async () => root.unmount()); root = null; container?.remove();
    vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  });
  it.each([1, 3])('records initial hidden time and freezes the final response when the configured goal is %s', async goal => {
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    await render({sessionConfig: {fixedForm: true, probeItemCount: goal}}); await tick(5000);
    hidden.mockReturnValue(false); await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    const answer = container.querySelector('[role="button"][aria-label="Number 3"]'); expect(answer).toBeTruthy();
    await act(async () => answer.click()); await tick(801);
    expect(completion).toHaveBeenCalledOnce(); const result = completion.mock.calls[0][0];
    expect(result).toMatchObject({correct: 1, total: 1, hiddenMs: 5000, duration: 5, interrupted: true});
    const summaryBefore = container.querySelector('[aria-labelledby="word-sounds-session-complete-title"]')?.textContent;
    expect(summaryBefore).toBeTruthy();
    hidden.mockReturnValue(true); await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    await act(async () => {current.setScore({correct: 0, total: 10, streak: 0}); current.setHistory([]);});
    await tick(120000); await render({wordSoundsTtsSpeed: 1.1});
    expect(completion).toHaveBeenCalledOnce(); expect(result).toMatchObject({hiddenMs: 5000, duration: 5});
    const summary = container.querySelector('[aria-labelledby="word-sounds-session-complete-title"]');
    expect(summary?.textContent).toBe(summaryBefore);
  });
  it('resets timing and interruption evidence on a new session', async () => {
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    await render(); await tick(5000);
    hidden.mockReturnValue(false); await render({sessionId: 'clock-b'}); await tick(2000);
    await act(async () => container.querySelector('[role="button"][aria-label="Number 3"]').click()); await tick(801);
    expect(completion).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({duration: 2, hiddenMs: 0, interrupted: false}));
  });
  it.each(['close', 'escape'])('banks a completed snapshot exactly once when %s interrupts final feedback', async exit => {
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    const closed = vi.fn(); await render({onClose: closed}); await tick(5000);
    await act(async () => container.querySelector('[role="button"][aria-label="Number 3"]').click());
    expect(completion).not.toHaveBeenCalled();
    await act(async () => {
      if (exit === 'close') container.querySelector('button[aria-label="common.close"]').click();
      else container.querySelector('[aria-labelledby="word-sounds-dialog-title"]').dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    });
    expect(closed).toHaveBeenCalledOnce();
    expect(completion).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({correct: 1, total: 1, duration: 5}));
    await tick(2000); expect(completion).toHaveBeenCalledOnce();
  });
  it('does not bank a partial probe when it is closed', async () => {
    const closed = vi.fn(); await render({onClose: closed}); await tick(1000);
    await act(async () => container.querySelector('button[aria-label="common.close"]').click());
    await tick(2000); expect(closed).toHaveBeenCalledOnce(); expect(completion).not.toHaveBeenCalled();
  });
});
