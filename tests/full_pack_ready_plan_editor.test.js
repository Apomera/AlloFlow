import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let FullPack;

const instructionalContext = (policy = 'preserve-primary', adaptedTextPolicy = 'omit') => ({
  schemaVersion: 1,
  instructionalGrade: '6th Grade',
  primaryTextPolicy: policy,
  primaryTextAccess: 'available',
  adaptedTextPolicy,
  adaptedTextPolicySource: 'educator',
  standardsFingerprint: 'standards-reviewed',
});

const makeRecord = (rows, policy = 'preserve-primary') => {
  const adaptedTextPolicy = rows.some(item => item && item.type === 'simplified') ? 'include' : 'omit';
  return ({
  status: 'ready',
  settingsSnapshot: {
    gradeLevel: '6th Grade',
    leveledTextLanguage: 'English',
    instructionalContext: instructionalContext(policy, adaptedTextPolicy),
  },
  planPayload: { instructionalContext: instructionalContext(policy, adaptedTextPolicy) },
  preflight: {
    selected: rows.map((row, index) => ({ ...row, index })),
    skipped: [],
    differentiation: { range: 'Custom', types: ['simplified', 'image'], levelCount: 3 },
    estimatedResourceGenerations: rows.length,
    capacity: {
      provider: 'openai', model: 'test-model', imageProvider: 'images', imageModel: 'test-image', isLocal: false,
    },
  },
  });
};

const row = (type, uiId, directive = '') => ({
  type,
  uiId,
  directive,
  instructionalText: {
    schemaVersion: 1,
    role: type === 'analysis' ? 'primary' : (type === 'simplified' ? 'supplemental' : 'unspecified'),
    form: type === 'simplified' ? 'adapted' : 'original',
    designationSource: 'workflow-default',
    replacementAuthorization: { authorized: false, source: 'none' },
  },
});

beforeAll(() => {
  const source = readFileSync(resolve(process.cwd(), 'generation_helpers_source.jsx'), 'utf8');
  new Function(source + '\n//# sourceURL=generation_helpers_source.jsx')();
  FullPack = window.AlloModules.GenerationHelpers;
});

describe('Full Pack ready-plan editor', () => {
  it('exposes a stable copy of supported resource types without workflow actions', () => {
    const first = FullPack.getFullPackEditableResourceTypes();
    const second = FullPack.getFullPackEditableResourceTypes();
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first).toContain('simplified');
    expect(first).toContain('quiz');
    expect(first).not.toContain('full-pack');
    expect(first).not.toContain('package-deliver');
    first.pop();
    expect(FullPack.getFullPackEditableResourceTypes()).toEqual(second);
  });

  it('immutably adds a resource with a stable unique uiId and recalculates differentiated capacity', () => {
    const original = makeRecord([row('quiz', 'quiz-0')]);
    const updated = FullPack.addFullPackPlanResource(original, {
      type: 'simplified', uiId: 'quiz-0', directive: 'Optional companion.',
      instructionalText: {
        role: 'primary', form: 'adapted', designationSource: 'educator',
        replacementAuthorization: { authorized: true, source: 'educator' },
      },
    });

    expect(updated).not.toBe(original);
    expect(original.preflight.selected).toHaveLength(1);
    expect(updated.status).toBe('ready');
    expect(updated.preflight.selected.map(item => item.uiId)).toEqual(['quiz-0', 'simplified-0']);
    expect(updated.preflight.selected[1]).toMatchObject({
      type: 'simplified', index: 1, directive: 'Optional companion.',
      instructionalText: {
        role: 'supplemental', form: 'adapted', designationSource: 'educator',
        replacementAuthorization: { authorized: false, source: 'none' },
      },
    });
    expect(updated.preflight.estimatedResourceGenerations).toBe(4);
    expect(updated.preflight.capacity).toMatchObject({ aiCalls: 4, textCalls: 4, imageCalls: 0 });
    expect(updated.planPayload.instructionalContext).toMatchObject({
      primaryTextPolicy: 'preserve-primary', adaptedTextPolicy: 'include',
    });
    expect(updated.settingsSnapshot.instructionalContext.adaptedTextPolicy).toBe('include');
  });

  it('changes type without changing uiId/directive and resets adapted metadata when moving away', () => {
    const original = makeRecord([
      row('simplified', 'stable-row', 'Keep this educator-authored direction.'),
      row('quiz', 'quiz-1'),
    ], 'educator-directed');
    const updated = FullPack.changeFullPackPlanResourceType(original, 'stable-row', 'image');
    const changed = updated.preflight.selected[0];

    expect(changed).toMatchObject({
      type: 'image', uiId: 'stable-row', directive: 'Keep this educator-authored direction.', index: 0,
      instructionalText: {
        role: 'unspecified', form: 'original', designationSource: 'workflow-default',
        replacementAuthorization: { authorized: false, source: 'none' },
      },
    });
    expect(updated.preflight.capacity).toMatchObject({ aiCalls: 4, imageCalls: 3 });
    expect(updated.planPayload.instructionalContext).toMatchObject({
      primaryTextPolicy: 'educator-directed', adaptedTextPolicy: 'omit',
    });
    expect(original.preflight.selected[0].type).toBe('simplified');
  });

  it('changing a row to simplified opts in but never creates replacement authorization', () => {
    const original = makeRecord([row('glossary', 'stable-row', 'Retain this direction.')]);
    const updated = FullPack.changeFullPackPlanResourceType(original, 'stable-row', 'simplified');
    expect(updated.preflight.selected[0]).toMatchObject({
      type: 'simplified', uiId: 'stable-row', directive: 'Retain this direction.',
      instructionalText: {
        role: 'supplemental', form: 'adapted', designationSource: 'educator',
        replacementAuthorization: { authorized: false, source: 'none' },
      },
    });
    expect(updated.preflight.estimatedResourceGenerations).toBe(3);
    expect(updated.planPayload.instructionalContext).toMatchObject({
      primaryTextPolicy: 'preserve-primary', adaptedTextPolicy: 'include',
    });
  });

  it('edits directives without changing identity and repairs unsafe adapted metadata', () => {
    const unsafe = row('simplified', 'simplified-4');
    unsafe.instructionalText = {
      role: 'primary', form: 'adapted', designationSource: 'educator',
      replacementAuthorization: { authorized: true, source: 'educator' },
    };
    const original = makeRecord([unsafe, row('quiz', 'quiz-2')], 'educator-directed');
    const updated = FullPack.editFullPackPlanResourceDirective(original, 'simplified-4', 'Use only as optional access support.');

    expect(updated.preflight.selected.map(item => item.uiId)).toEqual(['simplified-4', 'quiz-2']);
    expect(updated.preflight.selected[0]).toMatchObject({
      directive: 'Use only as optional access support.',
      instructionalText: {
        role: 'supplemental', form: 'adapted',
        replacementAuthorization: { authorized: false, source: 'none' },
      },
    });
    expect(original.preflight.selected[0].directive).toBe('');
    expect(original.preflight.selected[0].instructionalText.replacementAuthorization.authorized).toBe(true);
  });

  it('moves rows by index or direction while preserving stable ids and normalizing indices', () => {
    const original = makeRecord([
      row('analysis', 'analysis-stable'),
      row('quiz', 'quiz-stable'),
      row('lesson-plan', 'lesson-stable'),
    ]);
    const moved = FullPack.moveFullPackPlanResource(original, 'lesson-stable', 0);
    const movedAgain = FullPack.moveFullPackPlanResource(moved, 'lesson-stable', 'down');

    expect(moved.preflight.selected.map(item => item.uiId)).toEqual(['lesson-stable', 'analysis-stable', 'quiz-stable']);
    expect(moved.preflight.selected.map(item => item.index)).toEqual([0, 1, 2]);
    expect(movedAgain.preflight.selected.map(item => item.uiId)).toEqual(['analysis-stable', 'lesson-stable', 'quiz-stable']);
    expect(original.preflight.selected.map(item => item.uiId)).toEqual(['analysis-stable', 'quiz-stable', 'lesson-stable']);
  });

  it('keeps at least one ready row and rejects edits after the plan leaves ready status', () => {
    const single = makeRecord([row('quiz', 'quiz-only')]);
    expect(FullPack.removeFullPackPlanResource(single, 'quiz-only')).toBe(single);

    const running = { ...single, status: 'running' };
    expect(FullPack.addFullPackPlanResource(running, { type: 'glossary' })).toBe(running);
    expect(FullPack.editFullPackPlanResourceDirective(running, 'quiz-only', 'Changed')).toBe(running);
    expect(FullPack.changeFullPackPlanResourceType(running, 'quiz-only', 'glossary')).toBe(running);
    expect(FullPack.moveFullPackPlanResource(running, 'quiz-only', 0)).toBe(running);
    expect(FullPack.setFullPackPlanPrimaryTextPolicy(running, 'educator-directed')).toBe(running);
    expect(FullPack.setFullPackPlanAdaptedTextPolicy(running, 'include')).toBe(running);
  });

  it('makes the adapted-text toggle deterministic without changing the primary-text policy', () => {
    const original = makeRecord([row('quiz', 'quiz-0')]);
    const optedIn = FullPack.setFullPackPlanAdaptedTextPolicy(original, 'include');
    const adapted = optedIn.preflight.selected.filter(item => item.type === 'simplified');

    expect(adapted).toHaveLength(1);
    expect(adapted[0].instructionalText).toMatchObject({
      role: 'supplemental', form: 'adapted',
      replacementAuthorization: { authorized: false, source: 'none' },
    });
    expect(optedIn.planPayload.instructionalContext).toMatchObject({
      primaryTextPolicy: 'preserve-primary', adaptedTextPolicy: 'include',
    });
    expect(FullPack.setFullPackPlanAdaptedTextPolicy(optedIn, 'include')).toBe(optedIn);

    const optedOut = FullPack.setFullPackPlanAdaptedTextPolicy(optedIn, 'omit');
    expect(optedOut.preflight.selected.map(item => item.type)).toEqual(['quiz']);
    expect(optedOut.planPayload.instructionalContext.primaryTextPolicy).toBe('preserve-primary');
    expect(optedOut.planPayload.instructionalContext.adaptedTextPolicy).toBe('omit');
    expect(optedOut.preflight.skipped.at(-1).reason).toContain('educator choice');

    const adaptedOnly = makeRecord([row('simplified', 'only-adapted')], 'educator-directed');
    expect(FullPack.setFullPackPlanAdaptedTextPolicy(adaptedOnly, 'omit')).toBe(adaptedOnly);
  });

  it('scopes edits to one ready roster group without touching sibling or outer plan records', () => {
    const groupA = makeRecord([row('quiz', 'a-quiz')]);
    const groupB = makeRecord([row('glossary', 'b-glossary')]);
    const run = {
      status: 'ready', targetMode: 'all-groups',
      groups: { a: groupA, b: groupB },
    };
    const updated = FullPack.addFullPackPlanResource(run, { type: 'simplified' }, 'a');
    const edited = FullPack.editFullPackPlanResourceDirective(updated, 'a-quiz', 'Group A only.', 'a');

    expect(edited).not.toBe(run);
    expect(edited.groups).not.toBe(run.groups);
    expect(edited.groups.a).not.toBe(groupA);
    expect(edited.groups.b).toBe(groupB);
    expect(edited.groups.a.preflight.selected.map(item => item.type)).toEqual(['quiz', 'simplified']);
    expect(edited.groups.a.preflight.selected[0].directive).toBe('Group A only.');
    expect(edited.groups.b.preflight.selected).toEqual(groupB.preflight.selected);
    expect(edited.groups.a.planPayload.instructionalContext).toMatchObject({
      primaryTextPolicy: 'preserve-primary', adaptedTextPolicy: 'include',
    });
    expect(run.groups.a.preflight.selected).toHaveLength(1);
  });
});
