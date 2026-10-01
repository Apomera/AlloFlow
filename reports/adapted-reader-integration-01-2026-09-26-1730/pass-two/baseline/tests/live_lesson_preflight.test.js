import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(ROOT, 'view_live_lesson_run_source.jsx'), 'utf8');
const componentStart = source.indexOf('function LiveLessonRunPanel');
if (componentStart < 0) throw new Error('LiveLessonRunPanel source marker missing');

// The source prefix is plain JavaScript. Evaluating it here validates the
// canonical helper without requiring this focused test to regenerate mirrors.
// eslint-disable-next-line no-new-func
const api = new Function(
  source.slice(0, componentStart)
    + '\nreturn { buildLiveLessonReadiness, liveLessonReadinessStatusLabel, buildLivePollPresetFromCheckpoint };'
)();

describe('live run readiness preflight', () => {
  it('summarizes the full student-safe path without copying resource or response content', () => {
    const steps = [
      { id: 'read', type: 'simplified', title: 'Teacher-owned title' },
      {
        id: 'quiz',
        type: 'quiz',
        data: { questions: [{ question: 'Teacher-owned question' }] },
      },
    ];
    const cues = {
      read: {
        sayAsk: 'Teacher-only transition',
        checkpoint: { kind: 'word_cloud', prompt: 'Use SECRET_PROMPT as a privacy sentinel.' },
        studentResponse: 'SECRET_STUDENT_RESPONSE',
      },
      quiz: { checkpoint: { kind: 'live_quiz' } },
    };
    const stepsBefore = structuredClone(steps);
    const cuesBefore = structuredClone(cues);

    const readiness = api.buildLiveLessonReadiness(steps, cues, 3);

    expect(readiness).toMatchObject({
      status: 'ready',
      label: 'Ready',
      stepCount: 2,
      sourceCount: 3,
      filteredOutCount: 1,
      preparedCount: 2,
      presenterCueCount: 1,
      needsAttentionCount: 0,
      reviewCount: 0,
      issues: [],
    });
    expect(readiness.checks.map(check => [check.id, check.status])).toEqual([
      ['student_safe_path', 'ready'],
      ['prepared_interactions', 'ready'],
      ['presenter_cues', 'ready'],
    ]);
    expect(readiness.checks[0].detail).toContain('kept out by the shared safety filter');
    expect(JSON.stringify(readiness)).not.toContain('SECRET_PROMPT');
    expect(JSON.stringify(readiness)).not.toContain('SECRET_STUDENT_RESPONSE');
    expect(JSON.stringify(readiness)).not.toContain('Teacher-owned title');
    expect(steps).toEqual(stepsBefore);
    expect(cues).toEqual(cuesBefore);
  });

  it('separates blocking setup problems from runnable items that merit review', () => {
    const readiness = api.buildLiveLessonReadiness(
      [
        { id: 'feedback', type: 'simplified' },
        { id: 'cloud', type: 'faq' },
        { id: 'mismatch', type: 'faq' },
        { id: 'empty-quiz', type: 'quiz', data: { questions: [] } },
      ],
      {
        feedback: {
          checkpoint: {
            kind: 'feedback_response',
            prompt: 'Explain your evidence.',
            criteria: '',
          },
        },
        cloud: { checkpoint: { kind: 'word_cloud', prompt: '' } },
        mismatch: { checkpoint: { kind: 'live_quiz' } },
        'empty-quiz': { checkpoint: { kind: 'live_quiz' } },
      },
      4
    );

    expect(readiness).toMatchObject({
      status: 'needs_attention',
      label: 'Needs attention',
      preparedCount: 4,
      needsAttentionCount: 2,
      reviewCount: 2,
    });
    expect(readiness.issues.map(issue => issue.code)).toEqual([
      'missing_success_criterion',
      'suggested_prompt',
      'quiz_checkpoint_resource_mismatch',
      'empty_live_quiz',
    ]);
    expect(readiness.issues.every(issue => /^Step \d+:/.test(issue.label))).toBe(true);
    expect(readiness.checks.find(check => check.id === 'prepared_interactions').status)
      .toBe('needs_attention');
  });

  it('fails closed, with an explicit text label, when no student-facing step passes the shared filter', () => {
    const readiness = api.buildLiveLessonReadiness([], {}, 5);

    expect(readiness).toMatchObject({
      status: 'needs_attention',
      label: 'Needs attention',
      stepCount: 0,
      filteredOutCount: 5,
      needsAttentionCount: 1,
    });
    expect(readiness.issues).toEqual([
      expect.objectContaining({
        code: 'no_student_safe_steps',
        status: 'needs_attention',
        stepIndex: -1,
      }),
    ]);
    expect(api.liveLessonReadinessStatusLabel('optional')).toBe('Optional');
  });
});

describe('prepared polling audience contract', () => {
  it('carries a bounded selected audience on every polling format', () => {
    const oversizedId = 'group-'.padEnd(240, 'x');

    ['quick_check', 'word_cloud', 'open_response', 'feedback_response'].forEach(kind => {
      const preset = api.buildLivePollPresetFromCheckpoint(
        { kind, prompt: 'Check in.', criteria: 'Use evidence.' },
        { id: 'step-1' },
        { kind: 'group', id: oversizedId }
      );
      expect(preset).toMatchObject({
        audienceMode: 'group',
        audienceId: oversizedId.slice(0, 128),
      });
    });
  });

  it('maps the existing student kind to individual and preserves feedback compatibility fields', () => {
    const preset = api.buildLivePollPresetFromCheckpoint(
      { kind: 'feedback_response', prompt: 'Explain.', criteria: 'Use evidence.' },
      { id: 'step-2' },
      { kind: 'student', id: 'student-7' }
    );

    expect(preset).toMatchObject({
      audienceMode: 'individual',
      audienceId: 'student-7',
      feedbackAudienceMode: 'individual',
      feedbackAudienceId: 'student-7',
    });
    expect(api.buildLivePollPresetFromCheckpoint(
      { kind: 'word_cloud', prompt: 'One word.' },
      { id: 'step-3' },
      { kind: 'class', id: 'must-not-cross' }
    )).toMatchObject({ audienceMode: 'class', audienceId: '' });
  });
});

describe('preparation-only readiness UI', () => {
  const componentSource = source.slice(componentStart);

  it('is compact, collapsible, preparation-only, and labels status without relying on color', () => {
    expect(componentSource).toContain('data-live-run-readiness={liveRunReadiness.status}');
    expect(componentSource).toContain('open={liveRunReadiness.status !== \'ready\'}');
    expect(componentSource).toContain('Run readiness: {liveRunReadiness.label}');
    expect(componentSource).toContain('aria-label="Live run readiness checks"');
    expect(componentSource).toContain('{liveLessonReadinessStatusLabel(check.status)}: {check.label}.');
    expect(componentSource.indexOf('{preparationOnly && ('))
      .toBeLessThan(componentSource.indexOf('data-live-run-readiness={liveRunReadiness.status}'));
  });

  it('states and enforces the local resource-metadata-only privacy boundary', () => {
    expect(componentSource).toContain('data-live-run-readiness-privacy="resource-metadata-only"');
    expect(componentSource).toContain('It does not read or write student responses.');
    expect(source).toContain(
      'function buildLiveLessonReadiness(steps, presenterCuesByResourceId, historyItemCount = 0)'
    );
  });
});
