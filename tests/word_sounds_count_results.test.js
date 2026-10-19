import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { setupWordSounds, baseProps, React } from './helpers/word_sounds_harness.js';
import { installCanvasStub } from './helpers/word_sounds_pack_fixture.js';
import { sliceBetween } from './helpers/anchored_slice.js';

const require = createRequire(import.meta.url);
const { renderToStaticMarkup } = require(resolve('desktop/web-app/node_modules/react-dom/server'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const act = React.act || require(resolve('desktop/web-app/node_modules/react-dom/test-utils')).act;
const source = readFileSync('word_sounds_module.js', 'utf8');
const helpers = sliceBetween(source, '// BEGIN WORD SOUNDS COUNT RESULTS', '// END WORD SOUNDS COUNT RESULTS', { file: 'word_sounds_module.js' });
const { rowsFor, summaryFor, Results } = new Function('React', helpers + '\nreturn { rowsFor: wordSoundsCountResultRows, summaryFor: wordSoundsCountResultSummary, Results: WordSoundsCountResults };')(React);
const countRow = (extra = {}) => ({ activity: 'syllable_counting', word: 'banana', correct: true, attempts: 2,
  submittedCount: 3, expectedCount: 3, deliveryMode: 'recorded_audio', countResponses: [
    { submittedCount: 4, expectedCount: 3, deliveryMode: 'recorded_audio', correct: false },
    { submittedCount: 3, expectedCount: 3, deliveryMode: 'recorded_audio', correct: true },
  ], ...extra });
const plain = markup => { const node = document.createElement('div'); node.innerHTML = markup; return node; };

describe('saved syllable-count result details', () => {
  it('retains each occurrence and actual response order without changing the source rows', () => {
    const rows = [countRow(), { activity: 'blending', word: 'sun' }, countRow({ attempts: 1, countResponses: [], deliveryMode: 'teacher_spoken' })];
    const before = JSON.stringify(rows);
    expect(rowsFor(rows).map(row => row.occurrence)).toEqual([1, 3]);
    expect(summaryFor(rows)).toBe('Syllable counting details\n' +
      'Item 1: banana — Expected 3; submitted 4 → 3; 2 attempts; recorded audio\n' +
      'Item 3: banana — Expected 3; submitted 3; 1 attempt; teacher-spoken');
    expect(JSON.stringify(rows)).toBe(before);
  });

  it('preserves legacy count occurrences without guessing counts or delivery', () => {
    expect(summaryFor([{ activity: 'syllable_counting', word: 'fire', correct: true, attempts: 1 }]))
      .toBe('Syllable counting details\nItem 1: fire — Count details were not recorded; 1 attempt');
    expect(summaryFor([{ activity: 'blending', word: 'fire' }])).toBe('');
    expect(rowsFor(null)).toEqual([]);
  });

  it('ignores malformed response values and retains only saved numeric evidence', () => {
    const rows = [null, 'banana', countRow({ word: { label: 'bad' }, attempts: -2, submittedCount: '3', expectedCount: 14,
      countResponses: [null, {}, { submittedCount: NaN, expectedCount: 2 }, { submittedCount: 0, expectedCount: 2 },
        { submittedCount: 3, expectedCount: 13 }, { submittedCount: 2, expectedCount: 2, deliveryMode: 'unknown' }] })];
    expect(rowsFor(rows)[0]).toEqual({ occurrence: 3, word: '', attempts: null,
      responses: [{ submittedCount: 2, expectedCount: 2, deliveryMode: null }] });
    expect(summaryFor(rows)).toContain('Item 3: Unnamed word — Expected 2; submitted 2; delivery not recorded');
  });

  it('shows per-response expected counts when legacy evidence contains different targets', () => {
    expect(summaryFor([countRow({ countResponses: [
      { submittedCount: 3, expectedCount: 2, deliveryMode: 'teacher_spoken' },
      { submittedCount: 3, expectedCount: 3, deliveryMode: 'recorded_audio' },
    ] })])).toContain('Responses: 3 (expected 2) → 3 (expected 3); 2 attempts; teacher-spoken / recorded audio');
  });

  it('uses translations with either placeholder convention and falls back from untranslated keys', () => {
    const translate = key => ({
      'word_sounds.count_results_heading': 'Detalles',
      'word_sounds.count_result_item': 'Elemento {{number}}: {word}',
      'word_sounds.count_result_counts': 'Esperado {expected}; respuestas {{submitted}}',
    })[key] || key;
    expect(summaryFor([countRow()], translate)).toContain('Elemento 1: banana — Esperado 3; respuestas 4 → 3; 2 attempts; recorded audio');
  });
});

describe('adult count-results UI', () => {
  it.each([{ isTeacherMode: true }, { isParentMode: true }])('shows separate accessible rows for adults: %j', role => {
    const node = plain(renderToStaticMarkup(React.createElement(Results, { ...role, results: [countRow(), countRow()] })));
    expect(node.querySelector('section')?.getAttribute('aria-label')).toBe('Syllable counting details');
    expect(node.querySelectorAll('li')).toHaveLength(2);
    expect(node.querySelectorAll('li')[1].textContent).toContain('Item 2: banana');
    expect(node.textContent).toContain('submitted 4 → 3');
  });

  it('does not expose count details to the ordinary learner or render an empty results section', () => {
    expect(renderToStaticMarkup(React.createElement(Results, { results: [countRow()] }))).toBe('');
    expect(renderToStaticMarkup(React.createElement(Results, { isTeacherMode: true, results: [{ activity: 'blending' }] }))).toBe('');
  });

  it('escapes word text instead of treating saved labels as markup', () => {
    const node = plain(renderToStaticMarkup(React.createElement(Results, { isParentMode: true,
      results: [countRow({ word: '<img src=x onerror=alert(1)>' })] })));
    expect(node.querySelector('img')).toBeNull();
    expect(node.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('includes the same adult-only detail component in the actual sequential probe result renderer', () => {
    const probe = sliceBetween(source, 'const renderProbeResults = () => {', 'React.useEffect(', { file: 'word_sounds_module.js', label: 'probe results renderer' });
    const render = new Function('React', 'WordSoundsCountResults', 'bindings', `
      const { probeStartTimeRef, probeEndTimeRef, wordSoundsScore, learnerScopedHistory, effectiveProbeGrade, wordSoundsActivity,
        probeResultsDialogRef, handleDialogKeyDown, t, ts, probeHiddenMs, PROBE_INTERRUPTION_MS,
        sessionWordResults, isTeacherMode, isParentMode } = bindings;
      ${probe}
      return renderProbeResults();
    `);
    const bindings = { probeStartTimeRef: { current: Date.now() - 2000 }, probeEndTimeRef: { current: null }, wordSoundsScore: { correct: 1, total: 1 },
      learnerScopedHistory: [], effectiveProbeGrade: 'K', wordSoundsActivity: 'syllable_counting',
      probeResultsDialogRef: { current: null }, handleDialogKeyDown() {}, t: key => key, ts: key => key,
      probeHiddenMs: () => 0, PROBE_INTERRUPTION_MS: 1000, sessionWordResults: { current: [countRow()] },
      isTeacherMode: true, isParentMode: false };
    expect(plain(renderToStaticMarkup(render(React, Results, bindings))).textContent).toContain('Expected 3; submitted 4 → 3');
    expect(plain(renderToStaticMarkup(render(React, Results, { ...bindings, isTeacherMode: false }))).textContent)
      .not.toContain('Syllable counting details');
  });
});

let root, container;
afterEach(() => {
  if (root) act(() => root.unmount());
  root = null; container?.remove();
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

it('shows recorded response details in the completed parent session and copies the same wording with the original summary', async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers(); installCanvasStub();
  const Modal = setupWordSounds().WordSoundsModal;
  const core = new Function(readFileSync('word_sounds_core.js', 'utf8') + '\nreturn createWordSoundsCore();')();
  const prepared = core.createReviewedSyllableCount({ targetWord: 'quuxzz', count: 2, language: 'en', reviewed: true, revision: 1,
    audioContext: core.createSyllableCountAudioContext({ language: 'en' }) });
  const pack = { word: 'quuxzz', targetWord: 'quuxzz', term: 'quuxzz', phonemes: ['k'], phonemeCount: 1,
    _preparedActivities: ['syllable_counting'], activityItems: { syllable_counting: prepared } };
  const copied = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', Object.assign(Object.create(navigator), { clipboard: { writeText: copied } }));
  const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
  function Host() {
    const [score, setScore] = React.useState({ correct: 0, total: 0, streak: 0 });
    const [history, setHistory] = React.useState([]);
    const [word, setWord] = React.useState(pack.word);
    const [current, setCurrent] = React.useState(pack);
    const [feedback, setFeedback] = React.useState(null);
    return React.createElement(Modal, { ...baseProps('syllable_counting'), isParentMode: true,
      initialActivitySequence: ['syllable_counting'], glossaryTerms: [{ term: pack.word }],
      currentWordSoundsWord: word, setCurrentWordSoundsWord: setWord, wordSoundsPhonemes: current,
      setWordSoundsPhonemes: setCurrent, wsPreloadedWords: [pack], wordSoundsSessionGoal: 1,
      wordSoundsScore: score, setWordSoundsScore: setScore, wordSoundsHistory: history, setWordSoundsHistory: setHistory,
      wordSoundsFeedback: feedback, setWordSoundsFeedback: setFeedback });
  }
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  const button = pattern => [...container.querySelectorAll('button')].find(node => pattern.test(node.textContent));
  const click = async node => { expect(node).toBeTruthy(); await act(async () => { node.click(); await flush(); }); };
  const tap = async count => { for (let i = 0; i < count; i++) await click(container.querySelector('[aria-label="Tap to count syllables"]')); };
  await act(async () => { root.render(React.createElement(Host)); await flush(); });
  await click(container.querySelector('[title="Instructions are ON"]'));
  await act(async () => { await vi.advanceTimersByTimeAsync(300); await flush(); });
  await click(button(/Teacher has said the word/)); await tap(3); await click(button(/^Submit/));
  await click(button(/Teacher has said the word/)); await tap(2); await click(button(/^Submit/));
  await act(async () => { await vi.advanceTimersByTimeAsync(2400); await flush(); });
  const detail = container.querySelector('section[aria-label="Syllable counting details"]');
  expect(detail?.textContent).toContain('Item 1: quuxzz — Expected 2; submitted 3 → 2; 2 attempts; teacher-spoken');
  await click(button(/Copy Summary for Teacher/));
  expect(copied).toHaveBeenCalledOnce();
  expect(copied.mock.calls[0][0]).toContain('Home Practice Summary');
  expect(copied.mock.calls[0][0]).toContain('Words practiced:');
  expect(copied.mock.calls[0][0]).toContain(detail.querySelector('li').textContent);
});
