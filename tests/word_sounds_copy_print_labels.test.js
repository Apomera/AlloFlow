// Word Sounds copy, print, close and control names, on the mounted components.
//
// Gemini Canvas ignores window.print() on the app and blocks the Clipboard API,
// so the lesson script's Print and Copy buttons and the parent's "Copy Summary
// for Teacher" did nothing there, silently or with advice ("long-press the
// summary") about a summary that was never on screen. Escape closed the player
// around the unsaved-recordings guard and the session reset that the X button
// runs. Screen readers heard every blending answer as "Volume" and the Edit
// toggle as "Confirm". A student-voice pack (a child's recordings) exported with
// no warning at all.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { transformSync } from '@babel/core';
import { setupWordSounds, baseProps, React } from './helpers/word_sounds_harness.js';
import { studentProps, installCanvasStub } from './helpers/word_sounds_pack_fixture.js';
import { sliceBetween } from './helpers/anchored_slice.js';

const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let WordSoundsModal;
let root = null;
let host = null;
const originalExec = document.execCommand;

beforeAll(() => {
  installCanvasStub();
  ({ WordSoundsModal } = setupWordSounds());
  window.AlloWordSoundsDI = require(resolve(process.cwd(), 'word_sounds_di_loader.js'));
});

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  host?.remove();
  host = null;
  document.execCommand = originalExec;
  delete window.alloCopyText;
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
function mount(element) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(element));
  return host;
}
const buttonByText = (pattern) => [...host.querySelectorAll('button')].find((b) => pattern.test(b.textContent.trim())) || null;
const click = async (node) => {
  expect(node, 'control to click').toBeTruthy();
  await act(async () => { node.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); await flush(); });
};
// Simulates the Canvas iframe: the Clipboard API rejects, as its permissions
// policy makes it, and execCommand('copy') answers as the test says.
function blockClipboardApi(execResult) {
  vi.stubGlobal('navigator', Object.assign(Object.create(navigator), {
    clipboard: { writeText: vi.fn().mockRejectedValue(new Error('blocked by permissions policy')) },
  }));
  const exec = vi.fn(() => execResult);
  document.execCommand = exec;
  return exec;
}

describe('the lesson script', () => {
  const PACK = [
    { word: 'corn', targetWord: 'corn', phonemes: ['k', 'or', 'n'], graphemes: ['c', 'or', 'n'], syllables: ['corn'], rhymeWord: 'horn', familyEnding: '-orn' },
    { word: 'horn', targetWord: 'horn', phonemes: ['h', 'or', 'n'], graphemes: ['h', 'or', 'n'], syllables: ['horn'], rhymeWord: 'corn', familyEnding: '-orn' },
  ];
  async function openScript(extra = {}) {
    mount(React.createElement(WordSoundsModal, Object.assign(baseProps('counting'), {
      isTeacherMode: true, isProbeMode: false, wsPreloadedWords: PACK, wordSoundsLanguage: 'en',
      lessonPlanConfig: { masteryMode: 'consecutive', masteryThreshold: 3, activities: [{ id: 'counting', count: 2 }], order: ['counting'], totalItems: 2, estimatedMinutes: 2 },
    }, extra)));
    await click(host.querySelector('[aria-label="Open the lesson script"]'));
    expect(host.querySelector('#ws-di-print'), 'the script panel opened').toBeTruthy();
  }
  const printButton = () => buttonByText(/^Print or save as PDF$/);
  const copyButton = () => buttonByText(/^(Copy text|Copy)$/);

  it('prints from a window of its own with its own stylesheet, never the app', async () => {
    const written = [];
    const win = { document: { open: vi.fn(), write: (html) => written.push(html), close: vi.fn() }, focus: vi.fn(), print: vi.fn() };
    const open = vi.spyOn(window, 'open').mockReturnValue(win);
    const appPrint = vi.spyOn(window, 'print').mockImplementation(() => {});
    await openScript();
    await click(printButton());
    expect(open).toHaveBeenCalledOnce();
    const html = written.join('');
    expect(html.startsWith('<!DOCTYPE html>'), 'a complete page').toBe(true);
    expect(html.includes('id="ws-di-print"'), 'the printable sheet itself').toBe(true);
    expect(html.includes('/k/ /or/ /n/'), 'the word list with its sounds').toBe(true);
    expect(html.includes('Correction procedure'), 'the teaching sections').toBe(true);
    expect(html.includes('.border-l-4{'), 'plain CSS: the window has no Tailwind').toBe(true);
    expect(html.includes('onclick="window.print()"'), 'a Print button in case the dialog is refused').toBe(true);
    expect(win.print).toHaveBeenCalledOnce();
    expect(appPrint, 'window.print() on the app is what Canvas ignores').not.toHaveBeenCalled();
  });

  it('says printing is blocked when no window opens and the app cannot print', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    vi.spyOn(window, 'print').mockImplementation(() => {}); // refused: no beforeprint
    const toasts = [];
    await openScript({ addToast: (message, kind) => toasts.push({ message, kind }) });
    await click(printButton());
    expect(toasts.some((x) => x.kind === 'error' && /Printing is blocked here/.test(x.message)), JSON.stringify(toasts)).toBe(true);
  });

  it('prints the app itself when no window opens but the browser allows it, without a false warning', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    const appPrint = vi.spyOn(window, 'print').mockImplementation(() => window.dispatchEvent(new window.Event('beforeprint')));
    const toasts = [];
    await openScript({ addToast: (message, kind) => toasts.push({ message, kind }) });
    await click(printButton());
    expect(appPrint).toHaveBeenCalledOnce();
    expect(toasts.filter((x) => x.kind === 'error')).toEqual([]);
  });

  it('copies through execCommand where the Clipboard API is blocked', async () => {
    const exec = blockClipboardApi(true);
    await openScript();
    await click(copyButton());
    expect(exec).toHaveBeenCalledWith('copy');
    expect(buttonByText(/^Copied$/), 'the button confirms the copy').toBeTruthy();
  });

  it('prefers the host copy helper when the host provides one', async () => {
    const helper = vi.fn().mockResolvedValue(true);
    window.alloCopyText = helper;
    await openScript();
    await click(copyButton());
    expect(helper).toHaveBeenCalledOnce();
    expect(helper.mock.calls[0][0]).toContain('/k/ /or/ /n/');
  });

  it('tells the teacher when every copy path fails', async () => {
    blockClipboardApi(false);
    const toasts = [];
    await openScript({ addToast: (message, kind) => toasts.push({ message, kind }) });
    await click(copyButton());
    expect(toasts.some((x) => x.kind === 'error' && /Copying is blocked here/.test(x.message)), JSON.stringify(toasts)).toBe(true);
    expect(copyButton(), 'no false "Copied"').toBeTruthy();
  });
});

describe('closing the player', () => {
  async function mountPlayer(onClose, setWordSoundsScore) {
    mount(React.createElement(WordSoundsModal, { ...studentProps('blending', []), onClose, setWordSoundsScore }));
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    setWordSoundsScore.mockClear();
  }

  it('Escape takes the X button path: session reset first, then close', async () => {
    const onClose = vi.fn();
    const setScore = vi.fn();
    await mountPlayer(onClose, setScore);
    const dialog = host.querySelector('[role="dialog"]');
    act(() => dialog.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(setScore, 'Escape skipped the session reset').toHaveBeenCalledWith({ correct: 0, total: 0, streak: 0 });
    expect(setScore.mock.invocationCallOrder[0]).toBeLessThan(onClose.mock.invocationCallOrder[0]);
  });

  it('the X button does the same (the path Escape now shares)', async () => {
    const onClose = vi.fn();
    const setScore = vi.fn();
    await mountPlayer(onClose, setScore);
    await click(host.querySelector('button[aria-label="common.close"]'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(setScore).toHaveBeenCalledWith({ correct: 0, total: 0, streak: 0 });
  });
});

describe('control names', () => {
  it('names the Edit toggle by its tooltip, before and after toggling', async () => {
    mount(React.createElement(WordSoundsModal, { ...studentProps('counting', []), isTeacherMode: true }));
    const byTitle = (title) => [...host.querySelectorAll('button')].find((b) => b.getAttribute('title') === title);
    expect(byTitle('Edit')?.getAttribute('aria-label'), 'was "common.confirm"').toBe('Edit');
    await click(byTitle('Edit'));
    expect(byTitle('Done')?.getAttribute('aria-label')).toBe('Done');
  });
});

describe('the parent summary', () => {
  // The completed parent session from word_sounds_count_results.test.js:
  // two teacher-spoken syllable-count items.
  async function finishParentSession(extra = {}) {
    vi.useFakeTimers();
    const core = new Function(readFileSync('word_sounds_core.js', 'utf8') + '\nreturn createWordSoundsCore();')();
    const prepared = core.createReviewedSyllableCount({ targetWord: 'quuxzz', count: 2, language: 'en', reviewed: true, revision: 1,
      audioContext: core.createSyllableCountAudioContext({ language: 'en' }) });
    const pack = { word: 'quuxzz', targetWord: 'quuxzz', term: 'quuxzz', phonemes: ['k'], phonemeCount: 1,
      _preparedActivities: ['syllable_counting'], activityItems: { syllable_counting: prepared } };
    function Host() {
      const [score, setScore] = React.useState({ correct: 0, total: 0, streak: 0 });
      const [history, setHistory] = React.useState([]);
      const [word, setWord] = React.useState(pack.word);
      const [current, setCurrent] = React.useState(pack);
      const [feedback, setFeedback] = React.useState(null);
      return React.createElement(WordSoundsModal, { ...baseProps('syllable_counting'), isParentMode: true,
        initialActivitySequence: ['syllable_counting'], glossaryTerms: [{ term: pack.word }],
        currentWordSoundsWord: word, setCurrentWordSoundsWord: setWord, wordSoundsPhonemes: current,
        setWordSoundsPhonemes: setCurrent, wsPreloadedWords: [pack], wordSoundsSessionGoal: 1,
        wordSoundsScore: score, setWordSoundsScore: setScore, wordSoundsHistory: history, setWordSoundsHistory: setHistory,
        wordSoundsFeedback: feedback, setWordSoundsFeedback: setFeedback, ...extra });
    }
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    await act(async () => { root.render(React.createElement(Host)); await flush(); });
    const tap = async (n) => { for (let i = 0; i < n; i++) await click(host.querySelector('[aria-label="Tap to count syllables"]')); };
    await click(host.querySelector('[title="Instructions are ON"]'));
    await act(async () => { await vi.advanceTimersByTimeAsync(300); await flush(); });
    await click(buttonByText(/Teacher has said the word/)); await tap(3); await click(buttonByText(/^Submit/));
    await click(buttonByText(/Teacher has said the word/)); await tap(2); await click(buttonByText(/^Submit/));
    await act(async () => { await vi.advanceTimersByTimeAsync(2400); await flush(); });
    expect(buttonByText(/Copy Summary for Teacher/), 'the completed parent session').toBeTruthy();
  }

  it('names the activity, not its id', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', Object.assign(Object.create(navigator), { clipboard: { writeText } }));
    await finishParentSession();
    await click(buttonByText(/Copy Summary for Teacher/));
    const summary = writeText.mock.calls[0][0];
    expect(summary.includes('Activity: Syllable Claps'), summary).toBe(true);
    expect(summary.includes('Syllable_counting'), summary).toBe(false);
    expect(host.querySelector('[data-ws-parent-summary-text]'), 'nothing to select by hand after a good copy').toBeNull();
  });

  it('shows the summary to select by hand when copying is blocked everywhere', async () => {
    blockClipboardApi(false);
    const toasts = [];
    await finishParentSession({ addToast: (message, kind) => toasts.push({ message, kind }) });
    await click(buttonByText(/Copy Summary for Teacher/));
    const text = host.querySelector('textarea[data-ws-parent-summary-text]');
    expect(text, 'the summary the message tells the parent to select').toBeTruthy();
    expect(text.readOnly).toBe(true);
    expect(text.value.includes('Home Practice Summary'), text.value).toBe(true);
    expect(text.value.includes('Words practiced:'), text.value).toBe(true);
    expect(text.getAttribute('aria-label')).toBe('Practice summary for the teacher');
    expect(toasts.some((x) => x.kind === 'error' && /shown below/.test(x.message)), JSON.stringify(toasts)).toBe(true);
  });

  it('copies through execCommand where the Clipboard API is blocked, with no fallback box', async () => {
    const exec = blockClipboardApi(true);
    await finishParentSession();
    await click(buttonByText(/Copy Summary for Teacher/));
    expect(exec).toHaveBeenCalledWith('copy');
    expect(host.querySelector('[data-ws-parent-summary-text]')).toBeNull();
  });
});

describe('student-voice pack export', () => {
  let Editor;
  beforeAll(() => {
    const setup = readFileSync('word_sounds_setup_source.jsx', 'utf8');
    const slice = sliceBetween(setup, 'const PHONEME_PACK_STORAGE_KEY =', 'const PACK_COMMON_WORDS', { label: 'voice pack editor' });
    const code = transformSync(slice, { plugins: [require.resolve('@babel/plugin-transform-react-jsx')], configFile: false, babelrc: false }).code;
    Editor = new Function('React', code + '\nreturn PhonemeVoicePackEditor;')(React);
  });

  function openEditor(kind) {
    localStorage.setItem('allo_phoneme_voice_packs_v1', JSON.stringify({ activeId: 'p1', packs: [
      { id: 'p1', name: 'Sara', kind, consent: true, clips: {}, history: {}, studentName: kind === 'student-voice' ? 'Sara' : '', studentId: null },
    ] }));
    const downloads = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function record() { downloads.push(this.download); });
    URL.createObjectURL = vi.fn(() => 'blob:pack');
    URL.revokeObjectURL = vi.fn();
    mount(React.createElement(Editor, { onClose: () => {}, t: (key, fallback) => fallback }));
    return downloads;
  }
  const createUrl = URL.createObjectURL;
  const revokeUrl = URL.revokeObjectURL;
  afterEach(() => {
    localStorage.removeItem('allo_phoneme_voice_packs_v1');
    URL.createObjectURL = createUrl;
    URL.revokeObjectURL = revokeUrl;
  });
  const exportButton = () => buttonByText(/Export$/);

  it('asks before exporting a child\'s recordings, in the page (confirm() is dead in Canvas)', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    const downloads = openEditor('student-voice');
    await click(exportButton());
    const notice = host.querySelector('[data-voice-pack-student-export-confirm]');
    expect(notice, 'a warning before the file is written').toBeTruthy();
    expect(notice.getAttribute('role')).toBe('alert');
    expect(notice.textContent.includes('school-approved location'), notice.textContent).toBe(true);
    expect(downloads, 'nothing downloads until the teacher confirms').toEqual([]);
    expect(confirmSpy).not.toHaveBeenCalled();
    await click(buttonByText(/^Export file$/));
    expect(downloads).toEqual(['phoneme_pack_CONFIDENTIAL_Sara.json']);
    expect(host.querySelector('[data-voice-pack-student-export-confirm]')).toBeNull();
  });

  it('can be cancelled without writing a file', async () => {
    const downloads = openEditor('student-voice');
    await click(exportButton());
    await click(buttonByText(/^Cancel$/));
    expect(host.querySelector('[data-voice-pack-student-export-confirm]')).toBeNull();
    expect(downloads).toEqual([]);
  });

  it('exports a teacher model pack straight away', async () => {
    const downloads = openEditor('teacher-model');
    await click(exportButton());
    expect(host.querySelector('[data-voice-pack-student-export-confirm]')).toBeNull();
    expect(downloads).toEqual(['phoneme_pack_Sara.json']);
  });
});

describe('blending answers in the source', () => {
  // The mounted check lives in word_sounds_session_item_lifecycle.test.js
  // (it renders a full blending board); this keeps every replay button named.
  it('leaves no Word Sounds control named "Volume"', () => {
    const source = readFileSync('word_sounds_module.js', 'utf8');
    expect(source.includes('"aria-label": t("common.volume")'), 'a play or answer button announced as "Volume"').toBe(false);
  });
});
