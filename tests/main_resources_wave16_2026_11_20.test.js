import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;

let host, root;

beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloModules = window.AlloModules || {};
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.sanitizeHtml = (v) => String(v || '');
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove();
  host = root = null;
  window.__alloFocusTrapStack = [];
  window.__alloScrollLockState = { count: 0, prev: '' };
  delete window.__alloMuted;
  delete window.AlloSpeechPlayer;
});

describe('Wave 16: Collaboration, Directions, Launch Pad, Seating & Misc Panels', () => {
  it('view_directions_result: decodes HTML entities for speech, toggles aria-pressed, respects mute, and stops on unmount', async () => {
    loadAlloModule('view_directions_result_module.js');
    const { DirectionsResultView } = window.AlloModules.DirectionsResult;

    const speak = vi.fn(() => Promise.resolve(true));
    const stop = vi.fn();
    window.AlloSpeechPlayer = { speak, stop, isPlaying: () => false };

    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);

    await act(async () => root.render(React.createElement(DirectionsResultView, {
      t: (k) => k === 'directions.listen_directions' ? 'Listen to directions' : '',
      title: 'Read & Reflect',
      bodyHtml: '<p>Compare &amp; contrast &ldquo;two&rdquo; sources.</p>',
      goalViews: [{ id: 'g1', label: 'Cite evidence', kind: 'manual', done: false }],
    })));

    const listenBtn = host.querySelector('[data-directions-listen="true"]');
    expect(listenBtn).not.toBeNull();
    expect(listenBtn.getAttribute('aria-pressed')).toBe('false');

    // Click Listen -> speaks decoded plain text (no &amp; or &ldquo;)
    await act(async () => listenBtn.click());
    expect(speak).toHaveBeenCalledTimes(1);
    const spokenText = speak.mock.calls[0][0];
    expect(spokenText).toContain('Compare & contrast');
    expect(spokenText).not.toContain('&amp;');
    expect(listenBtn.getAttribute('aria-pressed')).toBe('true');

    // Unmount while speaking -> stops speech player
    await act(async () => root.unmount());
    root = null;
    expect(stop).toHaveBeenCalledTimes(1);

    // Muted check -> does not speak when window.__alloMuted === true
    speak.mockClear();
    window.__alloMuted = true;
    root = createRoot(host);
    await act(async () => root.render(React.createElement(DirectionsResultView, {
      t: () => '',
      title: 'Quiet Directions',
      bodyHtml: '<p>Step one.</p>',
    })));
    await act(async () => host.querySelector('[data-directions-listen="true"]').click());
    expect(speak).not.toHaveBeenCalled();
  });

  it('view_directions_composer: guards drag-out backdrop dismissal and falls back cleanly on untranslated option keys', () => {
    const src = readFileSync(resolve('view_directions_composer_source.jsx'), 'utf8');
    expect(src).toContain('previewBackdropDownRef');
    expect(src).toContain('previewBackdropDownRef.current = (e.target === e.currentTarget)');
    expect(src).toContain('const allow = previewBackdropDownRef.current !== false;');
    expect(src).toContain('t(opt.labelKey, { title: (_res && _res.title) || \'\' })');
    expect(src).toContain('localized !== opt.labelKey');
  });

  it('shared_activity: prevents orphaned localStorage creds in anonymous mode, guards concurrent Start fresh, and provides Rating focus rings & 44px targets', () => {
    const src = readFileSync(resolve('shared_activity_source.jsx'), 'utf8');
    expect(src).toContain('if (!useSessionOnlyCredStore) return;');
    expect(src).toContain('localStorage.removeItem(storageKey)');
    expect(src).toContain('if (!transport || isTeacher || mutationRef.current) return;');
    expect(src).toContain('focus-within:ring-2 focus-within:ring-violet-600 focus-within:ring-offset-1');
    expect(src).toContain('min-h-11');
  });

  it('student_interaction: separates role="status" from interactive buttons & headings and associates draft textarea label', () => {
    const src = readFileSync(resolve('student_interaction_source.jsx'), 'utf8');
    expect(src).toContain('htmlFor="mastery-new-draft-textarea"');
    expect(src).toContain('id="mastery-new-draft-textarea"');
    expect(src).toContain('id="mastery-locked-draft-heading"');
    expect(src).toContain('aria-labelledby="mastery-locked-draft-heading"');
    // No heading element directly carrying role="status"
    expect(src).not.toMatch(/<h[1-6][^>]*role="status"/);
  });

  it('view_launch_pad: cleans up voice listener on unmount and coordinates language menu Escape via __alloFocusTrapStack', () => {
    const src = readFileSync(resolve('view_launch_pad_source.jsx'), 'utf8');
    expect(src).toContain('mountedRef');
    expect(src).toContain('activeVoiceUnsubRef');
    expect(src).toContain('window.__alloFocusTrapStack');
    expect(src).toContain('event.defaultPrevented');
  });

  it('seating_chart: clears stale lastSolve on manual edits, handles pointercancel, guards backdrops, and stacks responsively', () => {
    const src = readFileSync(resolve('seating_chart_source.jsx'), 'utf8');
    expect(src).toContain('onPointerCancel={endDrag}');
    expect(src).toContain('panelBackdropDownRef');
    expect(src).toContain('confirmBackdropDownRef');
    expect(src).toContain('flex-col md:flex-row');
    // setLastSolve(null) cleared across manual room/seat mutations
    const clearMatches = src.match(/setLastSolve\(null\)/g) || [];
    expect(clearMatches.length).toBeGreaterThanOrEqual(5);
  });

  it('view_misc_panels: renders FluencyModePanel with static tone classes & keyboard tooltips, VolumeBuilderView with non-passive wheel & status, and traps focus across modals', async () => {
    loadAlloModule('view_misc_panels_module.js');
    const { FluencyModePanel, VolumeBuilderView } = window.AlloModules;

    // 1. FluencyModePanel: static tone classes (no purged bg-${color}-50), AA contrast, focusable word tooltip
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);

    await act(async () => root.render(React.createElement(FluencyModePanel, {
      t: () => '',
      isFluencyMode: true,
      fluencyStatus: 'complete',
      FLUENCY_BENCHMARKS: {},
      fluencyBenchmarkGrade: '3',
      fluencyBenchmarkSeason: 'fall',
      fluencyCustomNorms: {},
      fluencyTimeLimit: 60,
      fluencyTimeRemaining: 0,
      fluencyTimerVisibility: 'visible',
      fluencyTranscript: 'quick box',
      generatedContent: { data: 'quick fox' },
      calculateRunningRecordMetrics: () => ({ accuracy: 92, wcpm: 115, errorCount: 1, selfCorrections: 0, totalWords: 2, wordsCorrect: 1, selfCorrectionRatio: '0:0' }),
      getBenchmarkComparison: () => ({ level: 'At Benchmark', label: 'At Benchmark', color: 'emerald', target: 100, percentile: '50th–75th' }),
      fluencyResult: {
        accuracy: 92,
        wcpm: 115,
        wpm: 115,
        wordsCorrect: 1,
        totalWords: 2,
        errorCount: 1,
        wordData: [
          { word: 'quick', status: 'correct' },
          { word: 'fox', status: 'mispronounced', said: 'box' },
        ],
      },
      setFluencyResult: () => {},
      setFluencyStatus: () => {},
      setFluencyTranscript: () => {},
      setIsFluencyMode: () => {},
      setFluencyBenchmarkGrade: () => {},
      setFluencyBenchmarkSeason: () => {},
      setFluencyCustomNorms: () => {},
      setFluencyFeedback: () => {},
      setFluencyTimeLimit: () => {},
      setFluencyTimeRemaining: () => {},
      setFluencyTimerVisibility: () => {},
      toggleFluencyRecording: () => {},
      exportFluencyCSV: () => {},
      generateFluencyScoreSheet: () => {},
    })));

    const mispronouncedSpan = [...host.querySelectorAll('span[tabindex="0"]')].find(s => s.textContent.includes('fox'));
    expect(mispronouncedSpan).toBeTruthy();
    expect(mispronouncedSpan.className).toContain('bg-red-100');
    expect(mispronouncedSpan.className).toContain('text-red-800');
    const correctSpan = [...host.querySelectorAll('span')].find(s => s.textContent.trim() === 'quick');
    expect(correctSpan?.className).toContain('text-green-700');

    // 2. VolumeBuilderView: non-passive wheel zooms scale & accessible status region
    const setCubeScale = vi.fn();
    await act(async () => root.render(React.createElement(VolumeBuilderView, {
      t: () => '',
      mathMode: 'Volume Builder',
      cubeAnswer: '12',
      cubeChallenge: { l: 3, w: 2, h: 2, answer: 12 },
      cubeDims: { l: 3, w: 2, h: 2 },
      cubeDragRef: { current: null },
      cubeFeedback: { correct: true, msg: 'Correct! 12 cubic units' },
      cubeNotch: { l: 1, w: 1, h: 1 },
      cubeRotation: { x: -25, y: -35 },
      cubeScale: 1,
      cubeShape: 'rect',
      cubeShowLayers: null,
      exploreDifficulty: 'medium',
      getAdaptiveDifficulty: () => 'medium',
      setCubeAnswer: () => {},
      setCubeChallenge: () => {},
      setCubeDims: () => {},
      setCubeFeedback: () => {},
      setCubeNotch: () => {},
      setCubeRotation: () => {},
      setCubeScale,
      setCubeShape: () => {},
      setCubeShowLayers: () => {},
      setExploreDifficulty: () => {},
    })));

    const stage = host.querySelector('[role="img"]');
    expect(stage).not.toBeNull();
    const wheelEvent = new WheelEvent('wheel', { deltaY: -100, cancelable: true });
    await act(async () => stage.dispatchEvent(wheelEvent));
    expect(wheelEvent.defaultPrevented).toBe(true);
    expect(setCubeScale).toHaveBeenCalledTimes(1);

    const feedbackRegion = host.querySelector('[role="status"][aria-live="polite"]');
    expect(feedbackRegion).not.toBeNull();
    expect(feedbackRegion.textContent).toContain('Correct! 12 cubic units');

    // 3. Source contracts for PdfDiffViewer, GroupSessionModal, SourceResearchDialog, TourOverlay, FluencyModePanel
    const src = readFileSync(resolve('view_misc_panels_source.jsx'), 'utf8');
    expect(src).not.toContain('bg-${color}-50');
    expect(src).toContain('diffBackdropDownRef');
    expect(src).toContain('groupBackdropDownRef');
    expect(src).toContain('addEventListener(\'wheel\', onStageWheel, { passive: false })');
    const trapMatches = src.match(/window\.__alloFocusTrapStack/g) || [];
    expect(trapMatches.length).toBeGreaterThanOrEqual(4);
  });
});
