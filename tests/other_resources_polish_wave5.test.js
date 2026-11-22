import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;

let host, root;

beforeAll(() => {
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const Stub = () => null;
  window.AlloIcons = new Proxy({}, { get: () => Stub, has: () => true });
  ['MonitorPlay', 'X', 'PlayCircle', 'ExternalLink', 'AlertTriangle', 'ClipboardList', 'ArrowRight', 'CheckCircle2', 'BookOpen', 'Play'].forEach(name => {
    window[name] = Stub;
  });
  window.sanitizeHtml = (html) => String(html || '');
  window.AlloModules = window.AlloModules || {};

  for (const file of [
    'view_visual_supports_modal_module.js',
    'view_directions_result_module.js',
    'view_video_library_module.js',
    'view_word_sounds_preview_module.js',
  ]) {
    new Function(readFileSync(resolve(file), 'utf8'))();
  }
});

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  host?.remove();
  host = null;
  delete window.AlloSpeechPlayer;
  window.__alloFocusTrapStack = [];
  window.__alloScrollLockState = { count: 0, prev: '' };
  try { window.localStorage.clear(); } catch (_) {}
  try { window.sessionStorage.clear(); } catch (_) {}
  vi.restoreAllMocks();
});

function mount(element) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(element));
  return host;
}

describe('Other resources polish — Wave 5 (Visual Supports Modal, Directions Result, Video Library, Word Sounds Preview)', () => {
  it('VisualSupportsModal adds Board category filter + AAC Phrase Strip and Schedule First->Then focus mode + progress bar + Reset', async () => {
    const VisualSupportsModal = window.AlloModules.VisualSupportsModal.VisualSupportsModal;
    const speakCalls = [];
    window.AlloSpeechPlayer = {
      speak: vi.fn((text, opts) => {
        speakCalls.push({ text, opts });
        return Promise.resolve(1);
      }),
      stop: vi.fn(),
    };

    window.localStorage.setItem('alloSymbolBoards__default', JSON.stringify([
      {
        id: 'board-aac',
        title: 'Core Communication',
        cols: 3,
        words: [
          { id: 'w1', label: 'I want', category: 'verb', image: '' },
          { id: 'w2', label: 'water', category: 'noun', image: '' },
          { id: 'w3', label: 'please', category: 'other', image: '' },
        ],
      },
    ]));
    window.localStorage.setItem('alloSchedules__default', JSON.stringify([
      {
        id: 'sched-morning',
        title: 'Morning Routine',
        nowId: 's1',
        items: [
          { id: 's1', label: 'Unpack backpack', image: '', complete: false },
          { id: 's2', label: 'Read warm-up', image: '', complete: false },
          { id: 's3', label: 'Share with partner', image: '', complete: false },
        ],
      },
    ]));

    function Harness() {
      const [vsTab, setVsTab] = React.useState('boards');
      return React.createElement(VisualSupportsModal, {
        showVisualSupports: true,
        setShowVisualSupports: () => {},
        vsTab,
        setVsTab,
        t: () => '',
      });
    }

    mount(React.createElement(Harness));

    // Category filter pills render when board has multiple categories
    expect(host.querySelector('[data-vs-board-cat-filter]')).toBeTruthy();
    act(() => host.querySelector('[data-vs-cat-pill="noun"]').click());
    expect(host.querySelectorAll('[role="listitem"]')).toHaveLength(1);
    expect(host.textContent).toContain('water');
    act(() => host.querySelector('[data-vs-cat-pill="all"]').click());
    expect(host.querySelectorAll('[role="listitem"]')).toHaveLength(3);

    // Toggle AAC Phrase Strip, add words, speak combined phrase, undo & clear
    expect(host.querySelector('[data-vs-phrase-strip]')).toBeNull();
    act(() => host.querySelector('[data-vs-phrase-strip-toggle]').click());
    expect(host.querySelector('[data-vs-phrase-strip]')).toBeTruthy();

    act(() => host.querySelector('[data-vs-phrase-add="w1"]').click());
    act(() => host.querySelector('[data-vs-phrase-add="w2"]').click());
    expect(host.querySelectorAll('[data-vs-phrase-chip]')).toHaveLength(2);

    await act(async () => { host.querySelector('[data-vs-phrase-speak]').click(); });
    expect(speakCalls[0].text).toBe('I want water');

    act(() => host.querySelector('[data-vs-phrase-undo]').click());
    expect(host.querySelectorAll('[data-vs-phrase-chip]')).toHaveLength(1);
    act(() => host.querySelector('[data-vs-phrase-clear]').click());
    expect(host.querySelectorAll('[data-vs-phrase-chip]')).toHaveLength(0);

    // Switch to Schedules tab -> progress bar + First -> Then focus mode + Reset
    act(() => host.querySelector('#visual-supports-tab-schedules').click());
    const progress = host.querySelector('[data-vs-schedule-progress]');
    expect(progress).toBeTruthy();
    expect(progress.getAttribute('aria-valuenow')).toBe('0');
    expect(progress.getAttribute('aria-valuemax')).toBe('3');

    act(() => host.querySelector('[data-vs-first-then-toggle]').click());
    const firstThen = host.querySelector('[data-vs-first-then-view]');
    expect(firstThen).toBeTruthy();
    expect(firstThen.textContent).toContain('Unpack backpack');
    expect(firstThen.textContent).toContain('Read warm-up');

    await act(async () => { host.querySelector('[data-vs-read-now-next]').click(); });
    expect(speakCalls[1].text).toContain('Unpack backpack');
    expect(speakCalls[1].text).toContain('Read warm-up');

    // Complete current step in First -> Then mode -> advances to step 2 & shows Reset
    act(() => host.querySelector('[data-vs-complete-current]').click());
    expect(host.querySelector('[data-vs-schedule-progress]').getAttribute('aria-valuenow')).toBe('1');
    expect(host.querySelector('[data-vs-first-then-view]').textContent).toContain('Read warm-up');
    expect(host.querySelector('[data-vs-first-then-view]').textContent).toContain('Share with partner');

    const resetBtn = host.querySelector('[data-vs-schedule-reset]');
    expect(resetBtn).toBeTruthy();
    act(() => resetBtn.click());
    const confirmResetBtn = host.querySelector('[data-vs-schedule-reset-confirm]');
    if (confirmResetBtn) {
      act(() => confirmResetBtn.click());
    }
    expect(host.querySelector('[data-vs-schedule-progress]').getAttribute('aria-valuenow')).toBe('0');
    expect(host.querySelector('[data-vs-schedule-reset]')).toBeNull();
  });

  it('DirectionsResultView renders goal progress bar, To-do filter, direct goal-to-station Go links, and all-complete celebration', () => {
    const DirectionsResultView = window.AlloModules.DirectionsResult.DirectionsResultView;
    const onTravel = vi.fn();
    const stations = [
      { id: 'st-read', title: 'Cell Passage', typeLabel: 'Reading', icon: '📖', shape: 'circle', fill: '#f8fafc', stroke: '#64748b', visited: true },
      { id: 'st-quiz', title: 'Quick Check', typeLabel: 'Quiz', icon: '✅', shape: 'square', fill: '#f8fafc', stroke: '#64748b', visited: false },
    ];
    const partialGoals = [
      { id: 'g1', label: 'Read the cell passage', kind: 'auto', done: true, resourceRef: 'st-read' },
      { id: 'g2', label: 'Complete the quick check', kind: 'auto', done: false, resourceRef: 'st-quiz' },
      { id: 'g3', label: 'Write a 2-sentence reflection', kind: 'manual', done: false },
    ];

    mount(React.createElement(DirectionsResultView, {
      t: () => '',
      title: 'Cell Biology Mission',
      bodyHtml: '<p>Follow your goals below.</p>',
      stationViews: stations,
      goalViews: partialGoals,
      onTravel,
      onToggleManual: () => {},
    }));

    const bar = host.querySelector('[data-directions-progress-bar]');
    expect(bar).toBeTruthy();
    expect(bar.getAttribute('aria-valuenow')).toBe('1');
    expect(bar.getAttribute('aria-valuemax')).toBe('3');

    // Direct Go -> jump link on open goal linked to st-quiz
    const jumpBtn = host.querySelector('[data-directions-goal-jump="g2"]');
    expect(jumpBtn).toBeTruthy();
    act(() => jumpBtn.click());
    expect(onTravel).toHaveBeenCalledWith('st-quiz');
    expect(host.querySelector('[data-directions-goal-jump="g1"]')).toBeNull();

    // Filter goals to "To do" hides finished g1
    const openFilter = host.querySelector('[data-directions-goal-filter="open"]');
    expect(openFilter).toBeTruthy();
    act(() => openFilter.click());
    expect(host.textContent).not.toContain('Read the cell passage');
    expect(host.textContent).toContain('Complete the quick check');

    // When all goals are done, celebration pill renders
    act(() => root.render(React.createElement(DirectionsResultView, {
      t: () => '',
      title: 'Cell Biology Mission',
      bodyHtml: '<p>Follow your goals below.</p>',
      stationViews: stations,
      goalViews: partialGoals.map(g => ({ ...g, done: true })),
      onTravel,
      onToggleManual: () => {},
    })));
    expect(host.querySelector('[data-directions-all-goals-done]')).toBeTruthy();
    expect(host.querySelector('[data-directions-progress-bar]').getAttribute('aria-valuenow')).toBe('3');
  });

  it('VideoLibraryOverlay exposes UDL speed/skip controls plus transcript Listen and Copy actions', async () => {
    const VideoLibraryOverlay = window.AlloModules.VideoLibrary.VideoLibraryOverlay;
    const speakCalls = [];
    let resolveSpeech = null;
    window.AlloSpeechPlayer = {
      speak: vi.fn((text) => {
        speakCalls.push(text);
        return new Promise(res => { resolveSpeech = res; });
      }),
      stop: vi.fn(() => {
        window.dispatchEvent(new CustomEvent('allo-speech-state', { detail: { isPlaying: false, state: 'stopped' } }));
      }),
    };
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    mount(React.createElement(VideoLibraryOverlay, { onClose: () => {}, t: () => '' }));

    const video = host.querySelector('video');
    expect(video).toBeTruthy();
    expect(host.querySelector('[data-video-library-controls]')).toBeTruthy();

    act(() => host.querySelector('[data-video-library-speed="1.25"]').click());
    expect(video.playbackRate).toBe(1.25);

    video.currentTime = 18;
    act(() => host.querySelector('[data-video-library-forward]').click());
    expect(video.currentTime).toBe(28);
    act(() => host.querySelector('[data-video-library-rewind]').click());
    expect(video.currentTime).toBe(18);

    // Open text version transcript and test Listen + Copy
    const details = host.querySelector('details');
    details.open = true;
    const listenBtn = host.querySelector('[data-video-library-listen]');
    expect(listenBtn).toBeTruthy();
    act(() => listenBtn.click());
    expect(listenBtn.getAttribute('aria-pressed')).toBe('true');
    expect(speakCalls).toHaveLength(1);
    expect(speakCalls[0]).toContain('AlloBot introduces AlloFlow');

    act(() => listenBtn.click());
    expect(listenBtn.getAttribute('aria-pressed')).toBe('false');
    if (resolveSpeech) await act(async () => resolveSpeech());

    await act(async () => { host.querySelector('[data-video-library-copy]').click(); });
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toContain('AlloBot introduces AlloFlow');
  });

  it('WordSoundsPreviewView shows activity sequence & interactive word preview for practice, and hides them on assessment-locked lessons', async () => {
    const WordSoundsPreviewView = window.AlloModules.WordSoundsPreviewView;
    const speakCalls = [];
    window.AlloSpeechPlayer = {
      speak: vi.fn((text, opts) => {
        speakCalls.push({ text, opts });
        return Promise.resolve(1);
      }),
      stop: vi.fn(),
    };

    const practiceContent = {
      id: 'ws-wave5-1',
      type: 'word-sounds',
      title: 'Short A Practice',
      data: [{ word: 'cat' }, { word: 'map' }, { word: 'hat' }],
      sessionConfig: { language: 'English', fixedForm: false },
    };

    mount(React.createElement(WordSoundsPreviewView, {
      generatedContent: practiceContent,
      wsActivitySequence: ['counting', 'blending'],
      isTeacherMode: false,
      wordSoundsAudioCoverage: { complete: true, requiresTeacher: false, ready: 3, total: 3 },
      setWordSoundsActivity: () => {},
      setIsWordSoundsMode: () => {},
      setWordSoundsAutoReview: () => {},
      t: () => '',
    }));

    // Activity sequence pills + preview words disclosure render for practice lessons
    const seq = host.querySelector('[data-ws-preview-sequence]');
    expect(seq).toBeTruthy();
    expect(seq.textContent).toContain('1.');
    expect(seq.textContent).toContain('Counting');
    expect(seq.textContent).toContain('2.');
    expect(seq.textContent).toContain('Blending');

    const details = host.querySelector('[data-ws-preview-words]');
    expect(details).toBeTruthy();
    const firstWordBtn = host.querySelector('[data-ws-preview-word="0"]');
    expect(firstWordBtn.tagName).toBe('BUTTON');
    await act(async () => { firstWordBtn.click(); });
    expect(speakCalls).toHaveLength(1);
    expect(speakCalls[0].text).toBe('cat');

    // Assessment-locked (fixedForm: true) hides both sequence & word previews completely!
    act(() => root.render(React.createElement(WordSoundsPreviewView, {
      generatedContent: { ...practiceContent, id: 'ws-wave5-locked', sessionConfig: { language: 'English', fixedForm: true } },
      wsActivitySequence: ['counting', 'blending'],
      isTeacherMode: false,
      wordSoundsAudioCoverage: { complete: true, requiresTeacher: false, ready: 3, total: 3 },
      setWordSoundsActivity: () => {},
      setIsWordSoundsMode: () => {},
      setWordSoundsAutoReview: () => {},
      t: () => '',
    })));
    expect(host.querySelector('[data-ws-preview-sequence]')).toBeNull();
    expect(host.querySelector('[data-ws-preview-words]')).toBeNull();
  });
});
