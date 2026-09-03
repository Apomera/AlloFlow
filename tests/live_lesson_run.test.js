import { beforeAll, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const anti = fs.readFileSync(path.join(ROOT, 'AlloFlowANTI.txt'), 'utf8');
// Live Session dock was extracted from ANTI into its own CDN view module; pins follow the code.
const liveDock = fs.readFileSync(path.join(ROOT, 'view_live_session_dock_source.jsx'), 'utf8');
const liveLessonSource = fs.readFileSync(path.join(ROOT, 'view_live_lesson_run_source.jsx'), 'utf8');
let moduleApi;

beforeAll(() => {
  const windowStub = {
    React: {
      createElement: () => null,
      Fragment: Symbol('Fragment'),
    },
  };
  // eslint-disable-next-line no-new-func
  new Function('window', fs.readFileSync(path.join(ROOT, 'view_live_lesson_run_module.js'), 'utf8'))(windowStub);
  moduleApi = windowStub.AlloModules.LiveLessonRun;
});

describe('Live Lesson Run sequence helpers', () => {
  it('delegates eligibility to the existing student-safe filter and preserves History order', () => {
    const history = [
      { id: 'one', type: 'simplified' },
      { id: 'teacher', type: 'analysis' },
      { id: 'two', type: 'quiz' },
    ];
    const studentSafe = vi.fn(items => items.filter(item => item.type !== 'analysis'));

    const steps = moduleApi.buildLiveLessonSteps(history, studentSafe);

    expect(studentSafe).toHaveBeenCalledTimes(1);
    expect(studentSafe).toHaveBeenCalledWith(history);
    expect(steps.map(item => item.id)).toEqual(['one', 'two']);
    expect(steps[0]).toBe(history[0]);
  });

  it('fails closed when the shared student-safe filter is unavailable', () => {
    expect(moduleApi.buildLiveLessonSteps([{ id: 'one', type: 'quiz' }], null)).toEqual([]);
  });

  it('prefers the teacher-open item, then falls back to the session pointer', () => {
    const steps = [
      { id: 'one', type: 'simplified' },
      { id: 'two', type: 'quiz' },
      { id: 'three', type: 'faq' },
    ];
    expect(moduleApi.resolveLiveLessonIndex(steps, 'two', 'one')).toBe(1);
    expect(moduleApi.resolveLiveLessonIndex(steps, 'missing', 'three')).toBe(2);
    expect(moduleApi.resolveLiveLessonIndex(steps, 'missing', 'also-missing')).toBe(-1);
  });

  it('starts at the first item and stops cleanly at sequence boundaries', () => {
    expect(moduleApi.adjacentLiveLessonIndex(3, -1, 'next')).toBe(0);
    expect(moduleApi.adjacentLiveLessonIndex(3, 0, 'previous')).toBe(-1);
    expect(moduleApi.adjacentLiveLessonIndex(3, 0, 'next')).toBe(1);
    expect(moduleApi.adjacentLiveLessonIndex(3, 2, 'next')).toBe(-1);
  });
});

describe('prepared live checkpoints', () => {
  it('normalizes bounded recipes and stores them with the existing presenter-cue map', () => {
    const oversized = 'x'.repeat(900);
    const checkpoint = moduleApi.normalizeLivePreparedCheckpoint({
      kind: 'word_cloud',
      prompt: oversized,
      criteria: 'not used for this kind',
      ignored: 'drop me',
    });

    expect(checkpoint).toEqual({ kind: 'word_cloud', prompt: 'x'.repeat(600), criteria: '' });
    const saved = moduleApi.upsertLivePresenterCue({}, 'step-1', { checkpoint });
    expect(saved['step-1'].checkpoint).toEqual(checkpoint);
    expect(saved['step-1']).not.toHaveProperty('ignored');

    const removed = moduleApi.upsertLivePresenterCue(saved, 'step-1', {
      checkpoint: { kind: '', prompt: '', criteria: '' },
    });
    expect(removed).toEqual({});
  });

  it('maps attached recipes into the existing Live Polling preset contract', () => {
    expect(moduleApi.buildLivePollPresetFromCheckpoint(
      { kind: 'quick_check', prompt: '' },
      { id: 'step-1' },
      { kind: 'class' }
    )).toMatchObject({
      source: 'live-lesson-prepared-checkpoint',
      sourceResourceId: 'step-1',
      type: 'rating',
      ratingMin: 1,
      ratingMax: 3,
      afterSubmitMode: 'dismiss',
    });

    const targeted = moduleApi.buildLivePollPresetFromCheckpoint(
      { kind: 'feedback_response', prompt: 'Explain.', criteria: 'Use evidence.' },
      { id: 'step-2' },
      { kind: 'group', id: 'readers' }
    );
    expect(targeted).toMatchObject({
      type: 'freetext',
      feedbackEnabled: true,
      feedbackCriteria: 'Use evidence.',
      feedbackAudienceMode: 'group',
      feedbackAudienceId: 'readers',
    });
    expect(moduleApi.buildLivePollPresetFromCheckpoint(
      { kind: 'sketch_response', prompt: 'Draw it.' },
      { id: 'step-3' },
      { kind: 'class' }
    )).toBeNull();
  });

  it('dispatches prepared sketch responses to the existing Pictionary owner with bounded setup', () => {
    const descriptor = moduleApi.buildLivePreparedInteractionDescriptor(
      {
        kind: 'sketch_response',
        prompt: 'p'.repeat(700),
        criteria: 'c'.repeat(700),
      },
      { id: 'step-sketch', type: 'simplified' },
      { kind: 'group', id: 'group-a' }
    );

    expect(descriptor).toEqual({
      owner: 'concept-pictionary',
      kind: 'sketch_response',
      sourceResourceId: 'step-sketch',
      mode: 'sketch',
      prompt: 'p'.repeat(500),
      criterion: 'c'.repeat(400),
      audience: { kind: 'group', id: 'group-a' },
    });
  });

  it('offers a live quiz descriptor only for an existing quiz and never copies its questions', () => {
    const quizResource = {
      id: 'quiz-1',
      type: 'quiz',
      data: { questions: [{ question: 'Private authored question text' }] },
    };
    const descriptor = moduleApi.buildLivePreparedInteractionDescriptor(
      { kind: 'live_quiz', prompt: 'drop me', criteria: 'drop me too' },
      quizResource,
      { kind: 'class' }
    );

    expect(descriptor).toEqual({
      owner: 'quiz',
      kind: 'live_quiz',
      sourceResourceId: 'quiz-1',
    });
    expect(JSON.stringify(descriptor)).not.toContain('Private authored question text');
    expect(moduleApi.buildLivePreparedInteractionDescriptor(
      { kind: 'live_quiz' },
      { id: 'not-a-quiz', type: 'faq' },
      { kind: 'class' }
    )).toBeNull();
  });
});

describe('Live Session Center integration', () => {
  it('loads the component through the existing module loader', () => {
    expect(anti).toContain("loadModule('LiveLessonRun'");
    expect(anti).toContain('window.AlloModules.LiveLessonRun.LiveLessonRunPanel');
  });

  it('mounts the same lesson-path owner in a contextual pre-session preparation modal', () => {
    expect(anti).toContain("const ALLO_LIVE_LESSON_PREP_KEY = 'alloflow_live_lesson_preparation_v1'");
    expect(anti).toContain('setShowLiveLessonPrep(true)');
    expect(anti).toContain('{showLiveLessonPrep && (');
    expect(anti).toContain('preparationOnly: true');
    expect(liveDock).toContain('onLaunchPreparedInteraction: launchPreparedLiveInteraction');
    expect(anti).toContain('buildLivePreparedInteractionDescriptor(checkpoint, item, audience)');
  });

  it('reuses active-unit History order, the one safety filter, and handleRestoreView', () => {
    expect(anti).toContain('history: getFilteredHistory()');
    expect(anti).toContain('getStudentSafeResources: _alloStudentSafeResources');
    expect(anti).toContain('handleRestoreView(item);');
  });

  it('keeps new interactions inside the collapsed prepared UI and existing owners', () => {
    expect(liveLessonSource).toContain('<option value="sketch_response">');
    expect(liveLessonSource).toContain("focusItem.type === 'quiz'");
    expect(liveLessonSource).toContain('<option value="live_quiz">');
    expect(liveLessonSource).toContain('reuses the existing Live Polling, Sketch Response, or quiz owner');
    expect(anti).toContain("descriptor.owner === 'concept-pictionary'");
    expect(anti).toContain("descriptor.owner === 'quiz'");
    expect(anti).toContain('existing quick check, Word Cloud, open-response, feedback, Sketch Response, or live-quiz checkpoints');
    expect(anti).toContain('handleStartLiveSession(item)');
    expect(anti).toContain('const handleStartLiveSession = async (resourceOverride = null)');
  });
});
