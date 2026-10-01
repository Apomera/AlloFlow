import { describe, expect, it } from 'vitest';

import {
  repositoryFixture,
  EVALUATOR,
  TEACHER_ONE,
} from './helpers/educator_evaluation_gs_harness.js';

const FINALIZED_AT = '2026-08-13T12:00:00.000Z';

function finalizedFixture() {
  const harness = repositoryFixture();
  harness.setActiveEmail(EVALUATOR);
  const boot = harness.invoke('bootstrap');
  const educator = boot.workspace.teachers.find((item) => item.id === 't1');
  educator.cycleStatus = 'finalized';
  educator.finalizedAt = FINALIZED_AT;
  educator.finalScore = 2;
  educator.releasedDoc = {
    id: 'released-doc-t1',
    url: 'https://docs.google.com/document/d/released-doc-t1/edit',
    academicYear: '2026-27',
    at: FINALIZED_AT,
    by: 'Principal Rivera',
    sharedWith: TEACHER_ONE,
  };
  harness.replaceWorkspace(boot.workspace);
  return harness;
}

function cycleSlice(workspace) {
  return {
    educator: workspace.teachers.find((item) => item.id === 't1'),
    walkthroughs: workspace.walkthroughs.filter((item) => item.teacherId === 't1'),
    observations: workspace.observations.filter((item) => item.teacherId === 't1'),
    spms: workspace.spms.filter((item) => item.teacherId === 't1'),
    comments: workspace.comments.filter((item) => item.teacherId === 't1'),
  };
}

describe('finalized educator cycle closure', () => {
  it('rejects evaluator attempts to create, change, or discard current-cycle records', () => {
    const harness = finalizedFixture();
    harness.setActiveEmail(EVALUATOR);

    let boot = harness.invoke('bootstrap');
    boot.workspace.walkthroughs.push({
      id: 'walk-after-release',
      teacherId: 't1',
      date: '2026-08-14',
      evidence: 'Evidence added after release.',
      privacyChecked: true,
    });
    let error = harness.invokeError('saveWorkspace', {
      expectedVersion: boot.revision,
      workspace: boot.workspace,
      mutation: { teacherId: 't1', event: 'CREATED', entityType: 'walkthrough', entityId: 'walk-after-release' },
    });
    expect(error.code).toBe('immutable');

    boot = harness.invoke('bootstrap');
    boot.workspace.observations.find((item) => item.id === 'obs-t1').preConferenceNotes = 'Changed after release.';
    error = harness.invokeError('saveWorkspace', {
      expectedVersion: boot.revision,
      workspace: boot.workspace,
      mutation: { teacherId: 't1', event: 'DRAFT_SAVED', entityType: 'formal_observation', entityId: 'obs-t1' },
    });
    expect(error.code).toBe('immutable');

    boot = harness.invoke('bootstrap');
    boot.workspace.walkthroughs = boot.workspace.walkthroughs.filter((item) => item.id !== 'walk-t1-private');
    error = harness.invokeError('saveWorkspace', {
      expectedVersion: boot.revision,
      workspace: boot.workspace,
      mutation: { teacherId: 't1', event: 'DRAFT_DISCARDED', entityType: 'walkthrough', entityId: 'walk-t1-private' },
    });
    expect(error.code).toBe('immutable');
  });

  it('rejects teacher attempts to append comments or change current-cycle content', () => {
    const harness = finalizedFixture();
    harness.setActiveEmail(TEACHER_ONE);

    let boot = harness.invoke('bootstrap');
    boot.workspace.comments.push({
      id: 'comment-after-release',
      teacherId: 't1',
      recordType: 'walkthrough',
      recordId: 'walk-t1',
      text: 'A comment added after release.',
    });
    let error = harness.invokeError('saveWorkspace', {
      expectedVersion: boot.revision,
      workspace: boot.workspace,
      mutation: { teacherId: 't1', event: 'COMMENT_ADDED', entityType: 'walkthrough', entityId: 'walk-t1' },
    });
    expect(error.code).toBe('immutable');

    boot = harness.invoke('bootstrap');
    boot.workspace.observations.find((item) => item.id === 'obs-t1').prework.plan = 'Changed after release.';
    error = harness.invokeError('saveWorkspace', {
      expectedVersion: boot.revision,
      workspace: boot.workspace,
      mutation: { teacherId: 't1', event: 'DRAFT_SAVED', entityType: 'formal_observation', entityId: 'obs-t1' },
    });
    expect(error.code).toBe('immutable');
  });

  it('allows a read-equivalent save while preserving exact records and released metadata', () => {
    const harness = finalizedFixture();
    harness.setActiveEmail(EVALUATOR);
    const boot = harness.invoke('bootstrap');
    const before = JSON.parse(JSON.stringify(cycleSlice(boot.workspace)));
    const educator = boot.workspace.teachers.find((item) => item.id === 't1');
    educator.releasedDoc = {
      ...educator.releasedDoc,
      id: 'forged-released-doc',
      url: 'https://docs.google.com/document/d/forged-released-doc/edit',
    };
    harness.setClock('2026-08-20T12:00:00.000Z');

    const saved = harness.invoke('saveWorkspace', {
      expectedVersion: boot.revision,
      workspace: boot.workspace,
      mutation: { teacherId: 't1', event: 'DRAFT_SAVED', entityType: 'educator_cycle', entityId: 't1' },
    });

    expect(saved.ok).toBe(true);
    const after = cycleSlice(harness.invoke('bootstrap').workspace);
    expect(after).toEqual(before);
    expect(after.educator.releasedDoc.id).toBe('released-doc-t1');
  });
});
