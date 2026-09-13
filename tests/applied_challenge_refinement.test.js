import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';
let AC, H, boundary;
beforeAll(() => {
  window.React = window.React || {};
  loadAlloModule('applied_challenge_module.js');
  loadAlloModule('studio_response_module.js');
  AC = window.AlloModules.AppliedChallenge; H = AC._testing; boundary = window.AlloModules.StudioResponse;
});
const brief = () => ({ context: 'A fictional garden team compares watering plans.', drivingQuestion: 'Which plan should we try?', lockedLessonFacts: ['Water can infiltrate soil.', 'Water can evaporate.'], criteria: ['Explain a lesson connection.', 'Compare two options.'], constraints: ['Do not invent measurements.'], deliverable: 'A recommendation.', factVerified: true });
const data = () => AC.normalize({ family: 'decide', brief: brief(), workspace: {}, lessonRef: { gradeLevel: '6th Grade' } });

describe('Applied Problem Solving refinement', () => {
  it('does not turn template content or an intentional blank into learner progress', () => {
    const value = data();
    expect(value.workspace.workingQuestion).toBe('');
    expect(H.appliedChallengeWorkspaceProgress(value).started).toBe(0);
    value.workspace.workingQuestion = value.brief.drivingQuestion;
    expect(H.appliedChallengeWorkspaceProgress(value).started).toBe(0);
    value.workspace.questionAccepted = true;
    expect(H.appliedChallengeWorkspaceProgress(value).started).toBe(1);
    value.workspace.workingQuestion = '';
    expect(AC.normalize(value).workspace.workingQuestion).toBe('');
    expect(H.appliedChallengeFeedbackReady({ ...value, workspace: { response: 'A draft' } }).ok).toBe(false);
  });

  it('keeps checking and revision in every scope and has five navigable stages', () => {
    expect(AC.stages.map(stage => stage.id)).toEqual(['understand', 'explore', 'build', 'check', 'reflect']);
    for (const scope of ['compact', 'standard', 'extended']) {
      const ids = H.appliedChallengeVisiblePhases(scope).map(phase => phase.id);
      expect(ids).toEqual(expect.arrayContaining(['testReflection', 'revision', 'transferReflection']));
      expect(new Set(AC.stages.flatMap(stage => stage.phases)).size).toBe(10);
    }
  });

  it('requires a current source link before marking an evidence connection reviewed', () => {
    const value = data(), fact = value.brief.factSources[0];
    value.evidenceLedger = [{ id: 'e1', claim: 'A possible plan', evidence: 'My explanation', status: 'verified' }];
    expect(AC.normalize(value).evidenceLedger[0].status).toBe('needs-check');
    value.evidenceLedger[0] = { ...value.evidenceLedger[0], factId: fact.id, factRevision: fact.revision };
    expect(AC.normalize(value).evidenceLedger[0].status).toBe('verified');
    value.brief.lockedLessonFacts[0] = 'A revised source statement.';
    expect(AC.normalize(value).evidenceLedger[0].status).toBe('needs-check');
  });

  it('keeps criterion identity on reorder and retains notes for re-review when wording changes', () => {
    const value = data(), first = H.appliedChallengeSelfCheckItems(value.brief)[0];
    value.criteriaCheck = { [first.key]: { rating: 'met', revision: first.revision, note: 'My reasoning is in paragraph two.' } };
    value.brief.criteria.reverse();
    const reordered = AC.normalize(value);
    expect(H.appliedChallengeSelfCheckItems(reordered.brief)[1].key).toBe(first.key);
    expect(reordered.criteriaCheck[first.key].rating).toBe('met');
    reordered.brief.criteria[1] = 'Explain a different concept.';
    const changed = AC.normalize(reordered);
    expect(changed.criteriaCheck[first.key]).toMatchObject({ rating: 'pending', needsReview: true, previousRating: 'met', note: 'My reasoning is in paragraph two.' });
    expect(H.appliedChallengeSelfCheckItems(changed.brief)[1].revision).not.toBe(first.revision);
  });

  it('does not trust an old index-based rating as current evidence', () => {
    const value = AC.normalize({ brief: brief(), criteriaCheck: { 'criterion-0': { rating: 'met', note: 'Legacy note' } } });
    expect(Object.values(value.criteriaCheck)[0]).toMatchObject({ rating: 'pending', needsReview: true, note: 'Legacy note' });
  });

  it('retains feedback while marking edits and changed expectations as outdated', () => {
    const value = data(); value.workspace = { ...value.workspace, workingQuestion: 'My question', response: 'First response' };
    value.feedback = { strength: 'Useful reasoning', nextStep: 'Check a tradeoff', resourceId: 'r1', gradeLevel: '6th Grade', contextFingerprint: H.appliedChallengeHashText(H.appliedChallengeRequestFingerprint(value, 'feedback', { resourceId: 'r1', gradeLevel: '6th Grade' })) };
    expect(H.appliedChallengeFeedbackOutdated(value)).toBe(false);
    value.workspace.response = 'A response revised after feedback.';
    expect(H.appliedChallengeFeedbackOutdated(value)).toBe(true);
    expect(AC.normalize(value).feedback.nextStep).toBe('Check a tradeoff');
  });

  it('round-trips source connections, criterion revisions, and artifact explanations without teacher material', () => {
    const value = data(), fact = value.brief.factSources[0], criterion = H.appliedChallengeSelfCheckItems(value.brief)[0];
    value.workspace = { ...value.workspace, questionAccepted: true, artifactUrl: 'https://example.org/my-model', artifactDescription: 'How the model supports my reasoning.' };
    value.evidenceLedger = [{ id: 'e1', claim: 'A claim', evidence: 'Reasoning', status: 'verified', factId: fact.id, factRevision: fact.revision }];
    value.criteriaCheck = { [criterion.key]: { rating: 'met', revision: criterion.revision, note: 'See my model.' } };
    const resource = { id: 'r1', type: 'applied-challenge', data: { ...value, sourceExcerpt: 'PRIVATE SOURCE', visual: { image: 'PRIVATE IMAGE' } } };
    const submitted = boundary.toSubmission(resource, boundary.responseFromData(resource.type, value));
    const restored = AC.fromSubmission(resource.data, { r1: { studio: submitted.data } }, 'r1');
    expect(restored.data.evidenceLedger[0].factId).toBe(fact.id);
    expect(restored.data.criteriaCheck[criterion.key].rating).toBe('met');
    expect(restored.data.workspace.artifactDescription).toContain('my reasoning');
    expect(JSON.stringify(submitted)).not.toMatch(/PRIVATE|lockedLessonFacts|sourceExcerpt/);
  });

  it('rejects executable artifact URLs and unsafe imported reference identities', () => {
    expect(AC.normalize({ workspace: { artifactUrl: 'javascript:alert(1)' } }).workspace.artifactUrl).toBe('');
    const items = H.appliedChallengeReferenceItems(['Requirement'], [{ id: '__proto__', text: 'Requirement' }], 'criterion');
    expect(items[0].id).toMatch(/^criterion-/);
  });

  it('requires a usable generated product, constraints, criteria, and supports', () => {
    expect(AC.generationIssues({ brief: { lockedLessonFacts: ['One fact'], seedDirection: 'A direction' } }, 'progressive').length).toBeGreaterThan(3);
    expect(AC.generationIssues({ brief: brief(), supports: { frameStarter: 'Compare…', parallelExample: { context: 'A library', move: 'Use shared criteria.' } } }, 'progressive')).toEqual([]);
  });

  it('exports clean task and paper copies without learner answers, feedback, or private source', () => {
    const value = data();value.workspace.response = 'PRIVATE LEARNER DRAFT';value.feedback = { strength: 'PRIVATE FEEDBACK' };value.sourceExcerpt = 'PRIVATE SOURCE';
    for (const mode of ['task', 'paper']) {
      const html = AC.renderPreset(value, mode);
      expect(html).not.toContain('PRIVATE');
      expect(html).toContain('aps-copy-lines');
      expect(html).toContain('Check');
      expect(html).toContain('Reflect');
    }
    expect(AC.renderPreset(value, 'response')).toContain('PRIVATE LEARNER DRAFT');
    expect(AC.renderPreset(value, 'response')).not.toMatch(/PRIVATE FEEDBACK|PRIVATE SOURCE/);
    expect(AC.renderPreset(value, 'teacher')).toContain('PRIVATE FEEDBACK');
    expect(AC.renderPreset(value, 'teacher')).not.toContain('PRIVATE SOURCE');
  });
});
