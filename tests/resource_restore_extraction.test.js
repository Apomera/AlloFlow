import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

let restoreView;

beforeAll(() => {
  loadAlloModule('misc_handlers_module.js');
  restoreView = window.AlloModules.MiscHandlers.handleRestoreView;
});

function genericDeps(overrides = {}) {
  return {
    _alloFollowResourceLive: vi.fn(),
    isTeacherMode: true,
    isWide: true,
    setActiveView: vi.fn(),
    setGeneratedContent: vi.fn(),
    setIsMapLocked: vi.fn(),
    t: (key) => key,
    ...overrides,
  };
}

describe('resource restore handler extraction', () => {
  it('opens a standard saved resource and preserves live-follow suppression', () => {
    const item = {
      id: 'quiz-1',
      type: 'quiz',
      data: { questions: [] },
      lessonPlanConfig: { mode: 'review' },
      lessonPlanSequence: ['quiz'],
    };
    const deps = genericDeps();

    restoreView(item, {}, deps);
    expect(deps.setGeneratedContent).toHaveBeenCalledWith(expect.objectContaining({
      id: 'quiz-1',
      type: 'quiz',
      data: item.data,
      lessonPlanConfig: item.lessonPlanConfig,
      lessonPlanSequence: item.lessonPlanSequence,
    }));
    expect(deps.setActiveView).toHaveBeenCalledWith('quiz');
    expect(deps.setIsMapLocked).toHaveBeenCalledWith(false);
    expect(deps._alloFollowResourceLive).toHaveBeenCalledWith(item, {
      blockedToast: 'adventure.toasts.teacher_sync_warning',
    });

    deps._alloFollowResourceLive.mockClear();
    restoreView(item, { suppressLiveFollow: true }, deps);
    expect(deps._alloFollowResourceLive).not.toHaveBeenCalled();
  });

  it('restores AAC payload ownership and rejects invalid portable data', () => {
    const item = { id: 'aac-1', type: 'aac-board', data: { cells: [] } };
    const payload = { payloadId: 'payload-1', timestamp: 42 };
    const dismissed = new Set(['payload-1']);
    const deps = {
      _alloBuildLocalAacPayload: vi.fn(() => payload),
      _alloFollowResourceLive: vi.fn(),
      addToast: vi.fn(),
      setVisualSupportsPayload: vi.fn(),
      visualSupportsDismissedIdsRef: { current: dismissed },
      visualSupportsLastTimestampRef: { current: 12 },
    };

    restoreView(item, {}, deps);
    expect(dismissed.has('payload-1')).toBe(false);
    expect(deps.visualSupportsLastTimestampRef.current).toBe(42);
    expect(deps.setVisualSupportsPayload).toHaveBeenCalledWith(payload);
    expect(deps._alloFollowResourceLive).toHaveBeenCalledWith(item);

    deps._alloBuildLocalAacPayload.mockReturnValue(null);
    deps._alloFollowResourceLive.mockClear();
    expect(restoreView(item, {}, deps)).toBe(false);
    expect(deps.addToast).toHaveBeenCalledWith(
      'This AAC Board could not be opened because its portable data is invalid.',
      'error',
    );
    expect(deps._alloFollowResourceLive).not.toHaveBeenCalled();
  });

  it('preserves waiting homework after the real AAC validator rejects a manual open, then cancels it after a successful open', () => {
    const aacWindow = { React: {}, AlloModules: {} };
    new Function('window', readFileSync('live_aac_module.js', 'utf8'))(aacWindow);
    const invalid = { id: 'broken-aac', type: 'aac-board', data: {} };
    const waiting = { id: 'waiting-reading', type: 'simplified', data: 'Fair is foul.' };
    const deps = genericDeps({
      _alloBuildLocalAacPayload: aacWindow.AlloModules.LiveAac.buildLocal,
      addToast: vi.fn(),
    });
    expect(deps._alloBuildLocalAacPayload(invalid.data, invalid.id)).toBeNull();
    const host = readFileSync('AlloFlowANTI.txt', 'utf8');
    const wrapper = host.slice(
      host.indexOf('  const pendingQrAssignmentOpenGenerationRef = useRef(0);'),
      host.indexOf('  // BEGIN LEARNING_WEB_RESOURCE_OPEN_BRIDGE'),
    );
    let pending = waiting;
    const generationRef = { current: 0 };
    const setPending = vi.fn(value => { pending = typeof value === 'function' ? value(pending) : value; });
    const open = new Function('window', '_alloMiscHandlersDeps', 'useRef', 'setPendingQrAssignmentResource',
      wrapper + '\nreturn handleRestoreView;')(window, () => deps, () => generationRef, setPending);

    expect(open(invalid)).toBe(false);
    expect(deps.setGeneratedContent).not.toHaveBeenCalled();
    expect(deps.setActiveView).not.toHaveBeenCalled();
    expect(pending).toBe(waiting);
    expect(generationRef.current).toBe(0);
    expect(setPending).not.toHaveBeenCalled();

    expect(open({ id: 'valid-quiz', type: 'quiz', data: { questions: [] } })).toBeUndefined();
    expect(deps.setActiveView).toHaveBeenCalledWith('quiz');
    expect(pending).toBeNull();
    expect(generationRef.current).toBe(1);
  });

  it('recomputes portable Word Sounds audio readiness instead of trusting saved flags', () => {
    const setWsPreloadedWords = vi.fn();
    const deps = genericDeps({
      debugLog: vi.fn(),
      setIsWordSoundsMode: vi.fn(),
      setProbeTargetStudent: vi.fn(),
      setWordSoundsAutoReview: vi.fn(),
      setWsPreloadedWords,
    });
    const item = {
      id: 'words-1',
      type: 'word-sounds',
      data: [],
      wsPreloadedWords: [
        { targetWord: 'Cat', ttsReady: false, _ttsAssets: { cat: 'portable-audio' } },
        { targetWord: 'Dog', ttsReady: true, _ttsAssets: {} },
      ],
    };

    restoreView(item, { suppressLiveFollow: true }, deps);
    const restored = setWsPreloadedWords.mock.calls[0][0];
    expect(restored[0]).toMatchObject({ targetWord: 'Cat', ttsReady: true, _runtimeAudioReady: false, _audioRequested: false });
    expect(restored[1]).toMatchObject({ targetWord: 'Dog', ttsReady: false, _runtimeAudioReady: false, _audioRequested: false });
    expect(deps.setIsWordSoundsMode).toHaveBeenCalledWith(false);
    expect(deps.setWordSoundsAutoReview).toHaveBeenCalledWith(false);
  });

  it('prewarms lazy Directions before performing the normal resource swap', () => {
    const prewarm = vi.fn();
    window.__alloLazyDirectionsResult = prewarm;
    const deps = genericDeps();
    const item = { id: 'directions-1', type: 'directions', data: {} };

    restoreView(item, { suppressLiveFollow: true }, deps);
    expect(prewarm).toHaveBeenCalledOnce();
    expect(deps.setActiveView).toHaveBeenCalledWith('directions');
    delete window.__alloLazyDirectionsResult;
  });

  it('keeps the full body in MiscHandlers and only a dependency adapter in the host', () => {
    const host = readFileSync('AlloFlowANTI.txt', 'utf8');
    const owner = readFileSync('misc_handlers_source.jsx', 'utf8');
    const wrapper = host.slice(
      host.indexOf('const handleRestoreView = (item, options = {}) => {'),
      host.indexOf('// BEGIN LEARNING_WEB_RESOURCE_OPEN_BRIDGE'),
    );
    const implementation = owner.slice(
      owner.indexOf('function handleRestoreView(item, options = {}, deps = {}) {'),
      owner.indexOf('const detectClimaxArchetype'),
    );

    expect(wrapper).toContain('const { preservePendingAssignment, ...restoreOptions } = options || {}');
    expect(wrapper).toContain('moduleApi.handleRestoreView(item, restoreOptions, _alloMiscHandlersDeps())');
    expect(wrapper).not.toContain("item.type === 'word-sounds'");
    expect(implementation).toContain("item.type === 'word-sounds'");
    expect(implementation).toContain("item.type === 'manipulative-resource'");
    expect(implementation).toContain("item.type === 'video-transcript'");
    expect(owner).toContain('handleRestoreView,');
    expect(readFileSync('desktop/web-app/public/misc_handlers_module.js', 'utf8'))
      .toBe(readFileSync('misc_handlers_module.js', 'utf8'));
  });
});
