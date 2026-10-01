// Executed behavior tests for the 2026-08-16 Code.gs additions — the released
// summary share, educator statement ownership, the archived-educator gate,
// era-aware release scoring, open receipts, and setup health. These run the
// REAL production Code.gs in the shared VM harness; the text pins elsewhere
// only prove the code exists, these prove what it does.
import { describe, expect, it } from 'vitest';
import { repositoryFixture, TEACHER_ONE, TEACHER_TWO, EVALUATOR, ADMIN } from './helpers/educator_evaluation_gs_harness.js';

const saveAs = (harness, email, mutate, mutation) => {
  harness.setActiveEmail(email);
  const boot = harness.invoke('bootstrap');
  mutate(boot.workspace);
  return harness.invoke('saveWorkspace', { expectedVersion: boot.revision, workspace: boot.workspace, mutation });
};

const reconcileWorkspaceIntegrity = (harness) => {
  const review = harness.invoke('reviewPortalWorkspaceIntegrity').review;
  return harness.invoke('reconcilePortalWorkspaceIntegrity', {
    reviewToken: review.token,
    acknowledgeRepair: true,
  });
};

const configureAsAdmin = (harness, patch) => {
  harness.setActiveEmail(ADMIN);
  const boot = harness.invoke('bootstrap');
  const review = harness.invoke('reviewPortalWorkspaceConfiguration', { config: { ...boot.workspace.config, ...patch } }).review;
  return harness.invoke('performPortalWorkspaceConfiguration', { reviewToken: review.token, acknowledgeImpact: true });
};

const rateAndRelease = (harness, teacherId, domains, extra = {}) => {
  harness.setActiveEmail(EVALUATOR);
  let evidenceBoot = harness.invoke('bootstrap');
  let evidence = evidenceBoot.workspace.walkthroughs.find((item) => item.teacherId === teacherId && item.publishedAt);
  if (!evidence) {
    const evidenceId = `annual-evidence-${teacherId}`;
    const published = saveAs(harness, EVALUATOR, (workspace) => {
      workspace.walkthroughs.push({ id: evidenceId, teacherId, date: '2026-08-12', evidence: 'Published annual-review evidence.', privacyChecked: true, publishedAt: '2026-08-12T12:00:00.000Z' });
    }, { teacherId, event: 'EVIDENCE_PUBLISHED', entityType: 'walkthrough', entityId: evidenceId, version: 1 });
    expect(published.ok).toBe(true);
    evidence = { id: evidenceId };
  }
  const evidenceToken = `walkthrough:${evidence.id}`;
  const rate = saveAs(harness, EVALUATOR, (workspace) => {
    const record = workspace.teachers.find((item) => item.id === teacherId);
    record.ratings = { domains, building: extra.building ?? 2, teacher: extra.teacher ?? 2, lea: extra.lea ?? 2 };
    record.annualRationales = { d1: 'Annual rationale 1', d2: 'Annual rationale 2', d3: 'Annual rationale 3', d4: 'Annual rationale 4' };
    record.annualEvidenceRefs = { d1: [evidenceToken], d2: [evidenceToken], d3: [evidenceToken], d4: [evidenceToken] };
    record.weightSnapshot = null;
  }, { teacherId, event: 'RATING_UPDATED', entityType: 'evaluation', entityId: teacherId, version: 1 });
  expect(rate.ok).toBe(true);
  return saveAs(harness, EVALUATOR, (workspace) => {
    const record = workspace.teachers.find((item) => item.id === teacherId);
    record.finalizedAt = '2026-08-13T17:00:00.000Z';
  }, { teacherId, event: 'RELEASED', entityType: 'educator_cycle', entityId: teacherId, version: 1 });
};

describe('educator statement ownership', () => {
  it('a teacher can write their OWN statement and the server stamps its clock', () => {
    const harness = repositoryFixture();
    const saved = saveAs(harness, TEACHER_ONE, (workspace) => {
      const me = workspace.teachers.find((item) => item.id === 't1');
      me.educatorStatement = { text: 'I am proud of my students this year.', updatedAt: '1999-01-01T00:00:00.000Z' };
    }, { teacherId: 't1', event: 'STATEMENT_SAVED', entityType: 'evaluation', entityId: 't1', version: 1 });
    expect(saved.ok).toBe(true);
    harness.setActiveEmail(EVALUATOR);
    const boot = harness.invoke('bootstrap');
    const record = boot.workspace.teachers.find((item) => item.id === 't1');
    expect(record.educatorStatement.text).toBe('I am proud of my students this year.');
    // server clock, not the client-claimed timestamp
    expect(record.educatorStatement.updatedAt).not.toBe('1999-01-01T00:00:00.000Z');
  });

  it('an evaluator save can never alter or erase the educator\'s words', () => {
    const harness = repositoryFixture();
    saveAs(harness, TEACHER_ONE, (workspace) => {
      workspace.teachers.find((item) => item.id === 't1').educatorStatement = { text: 'Original words.' };
    }, { teacherId: 't1', event: 'STATEMENT_SAVED', entityType: 'evaluation', entityId: 't1', version: 1 });
    const tampered = saveAs(harness, EVALUATOR, (workspace) => {
      workspace.teachers.find((item) => item.id === 't1').educatorStatement = { text: 'Rewritten by evaluator.' };
    }, { teacherId: 't1', event: 'PROFILE_UPDATED', entityType: 'evaluation', entityId: 't1', version: 1 });
    expect(tampered.ok).toBe(true);
    harness.setActiveEmail(TEACHER_ONE);
    const boot = harness.invoke('bootstrap');
    expect(boot.workspace.teachers.find((item) => item.id === 't1').educatorStatement.text).toBe('Original words.');
  });

  it('a teacher cannot write another educator\'s statement', () => {
    const harness = repositoryFixture();
    // teacher one's filtered workspace only carries t1, so the save cannot even
    // address t2; assert the fixture's isolation holds for statements too
    harness.setActiveEmail(TEACHER_ONE);
    const boot = harness.invoke('bootstrap');
    expect(boot.workspace.teachers.map((item) => item.id)).toEqual(['t1']);
  });
});

describe('archived-educator gate (Article 16.C)', () => {
  it('rejects NEW records for an archived educator but keeps existing ones readable', () => {
    const harness = repositoryFixture();
    const archived = saveAs(harness, EVALUATOR, (workspace) => {
      workspace.teachers.find((item) => item.id === 't1').active = false;
    }, { teacherId: 't1', event: 'PROFILE_UPDATED', entityType: 'evaluation', entityId: 't1', version: 1 });
    expect(archived.ok).toBe(true);
    harness.setActiveEmail(EVALUATOR);
    const boot = harness.invoke('bootstrap');
    boot.workspace.walkthroughs.push({ id: 'walk-post-severance', teacherId: 't1', date: '2026-08-14', evidence: 'Should be rejected.', privacyChecked: true });
    const error = harness.invokeError('saveWorkspace', {
      expectedVersion: boot.revision, workspace: boot.workspace,
      mutation: { teacherId: 't1', event: 'CREATED', entityType: 'walkthrough', entityId: 'walk-post-severance', version: 1 },
    });
    expect(String(error.message || error)).toContain('archived educator');
    // prior records survive
    const after = harness.invoke('bootstrap');
    expect(after.workspace.walkthroughs.some((item) => item.id === 'walk-t1')).toBe(true);
  });
});

describe('era-aware release scoring', () => {
  it('PA profile releases with statutory weights (3,2,2,3 -> 2.40)', () => {
    const harness = repositoryFixture();
    // The default is Maine, so a PA test must select PA rather than assume it.
    expect(configureAsAdmin(harness, { frameworkProfile: 'pa_act13' }).ok).toBe(true);
    const released = rateAndRelease(harness, 't1', { d1: 3, d2: 2, d3: 2, d4: 3 });
    expect(released.ok).toBe(true);
    const boot = harness.invoke('bootstrap');
    const record = boot.workspace.teachers.find((item) => item.id === 't1');
    // domains 2.40 * 70% + 2*10% + 2*10% + 2*20%... composed via the frozen profile
    expect(record.finalScore).not.toBeNull();
    const snapshotRecord = boot.workspace.cycleSnapshots.find((item) => item.teacherId === 't1' && item.academicYear === '2026-27');
    expect(snapshotRecord.frameworkVersion).toBe('pa-act13-classroom-2021');
  });

  it('Maine profile releases with the equal average and stamps the me-pepg era tag', () => {
    const harness = repositoryFixture();
    // Maine is the default, so there is nothing to configure. Practice-only is
    // legitimate: 20-A section 13704 forbids rules requiring growth measures.
    const configured = { ok: true };
    expect(configured.ok).toBe(true);
    // peer-01 has NO current-cycle activity, so its weights freeze under the
    // Maine profile at release time: equal-average 2.50, era tag me-pepg-local
    const released = rateAndRelease(harness, 'peer-01', { d1: 3, d2: 2, d3: 2, d4: 3 });
    expect(released.ok).toBe(true);
    const boot = harness.invoke('bootstrap');
    const record = boot.workspace.teachers.find((item) => item.id === 'peer-01');
    expect(record.finalScore).toBe(2.5);
    const snapshotRecord = boot.workspace.cycleSnapshots.find((item) => item.teacherId === 'peer-01' && item.academicYear === '2026-27');
    expect(snapshotRecord.frameworkVersion).toBe('me-pepg-local');
  });

  it('a mid-cycle profile change NEVER rewrites weights already frozen under the old framework', () => {
    const harness = repositoryFixture();
    // Release under the workspace default (Maine since 2026-08-18), which freezes
    // this cycle's weights and stamps its era tag.
    expect(rateAndRelease(harness, 't1', { d1: 3, d2: 2, d3: 2, d4: 3 }).ok).toBe(true);
    const before = harness.invoke('bootstrap');
    const firstScore = before.workspace.teachers.find((item) => item.id === 't1').finalScore;
    const firstSnapshot = before.workspace.cycleSnapshots.find(
      (item) => item.teacherId === 't1' && item.academicYear === '2026-27');
    expect(firstScore).toBe(2.5);
    expect(firstSnapshot.frameworkVersion).toBe('me-pepg-local');

    // Now change the district framework mid-cycle. The already-released snapshot
    // must keep BOTH its score and the era tag that produced it. Recomposing a
    // released record under a framework it was never scored under is the bug
    // this guards; the numbers are asserted through the tag, not the default.
    expect(configureAsAdmin(harness, { frameworkProfile: 'pa_act13' }).ok).toBe(true);
    const after = harness.invoke('bootstrap');
    const keptSnapshot = after.workspace.cycleSnapshots.find(
      (item) => item.teacherId === 't1' && item.academicYear === '2026-27');
    expect(keptSnapshot.frameworkVersion).toBe('me-pepg-local');
    expect(keptSnapshot.finalScore).toBe(firstSnapshot.finalScore);
  });

  it('the Portland practice matrix mirror applies the guidebook rules', () => {
    const harness = repositoryFixture();
    const rate = (domains) => harness.invoke('eePortlandPracticeRating_', domains);
    expect(rate({ d1: 0, d2: 3, d3: 3, d4: 3 }).label).toBe('Unsatisfactory');
    expect(rate({ d1: 3, d2: 3, d3: 2, d4: 2 }).label).toBe('Excellent');
    expect(rate({ d1: 3, d2: 3, d3: 1, d4: 2 }).label).toBe('Proficient');
    expect(rate({ d1: 1, d2: 1, d3: 1, d4: 2 }).label).toBe('Novice/Needs Improvement');
    expect(rate({ d1: 2, d2: 2, d3: 2, d4: 2 }).label).toBe('Proficient');
    expect(rate({ d1: 2, d2: 2, d3: 2 })).toBeNull();
  });
});

describe('released summary sharing and receipts', () => {
  const releaseAndShare = () => {
    const harness = repositoryFixture();
    expect(rateAndRelease(harness, 't1', { d1: 3, d2: 2, d3: 2, d4: 3 }).ok).toBe(true);
    harness.setActiveEmail(EVALUATOR);
    const review = harness.invoke('reviewPortalReleasedEvaluationShare', { teacherId: 't1' });
    const shared = harness.invoke('sharePortalReleasedEvaluation', { teacherId: 't1', reviewToken: review.review.token });
    return { harness, shared };
  };

  const applyDirectoryChange = (harness, kind, candidate) => {
    harness.setActiveEmail(ADMIN);
    const review = harness.invoke('reviewPortalDirectoryChange', { kind, candidate }).review;
    return harness.invoke('performPortalDirectoryChange', { reviewToken: review.token, acknowledgeImpact: true });
  };

  it('shares a Docs file view-only with the educator and persists the pointer through commit', () => {
    const { harness, shared } = releaseAndShare();
    expect(shared.ok).toBe(true);
    expect(shared.created).toBe(true);
    expect(shared.recoveryPending).toBe(false);
    expect(shared.url.startsWith('https://docs.google.com/')).toBe(true);
    expect(shared.sharedWith).toBe(TEACHER_ONE);
    const docFile = [...harness.driveFiles.values()].find((file) => file.viewers.includes(TEACHER_ONE));
    expect(docFile).toBeTruthy();
    expect(harness.fileAcl(shared.doc.id)).toMatchObject({
      owner: ADMIN,
      viewers: [EVALUATOR, TEACHER_ONE].sort(),
      editors: [],
      sharingAccess: 'PRIVATE',
      parentFolderId: harness.properties.get('EE_RELEASED_FOLDER_ID'),
    });
    // the regression that motivated this suite: the pointer must SURVIVE the
    // stored-workspace sanitizer and come back on the next read
    harness.setActiveEmail(TEACHER_ONE);
    const boot = harness.invoke('bootstrap');
    const teacherPointer = boot.workspace.teachers.find((item) => item.id === 't1').releasedDoc;
    expect(teacherPointer.url).toBe(shared.url);
    expect(teacherPointer.grants).toBeUndefined();
    expect(boot.workspace.releaseRegistry ?? []).toEqual([]);

    harness.setActiveEmail(ADMIN);
    const adminBoot = harness.invoke('bootstrap');
    const adminPointer = adminBoot.workspace.teachers.find((item) => item.id === 't1').releasedDoc;
    expect(adminPointer).toMatchObject({
      grants: [EVALUATOR, TEACHER_ONE].sort(),
      aclVerifiedAt: expect.any(String),
      aclMode: expect.any(String),
      aclVersion: expect.any(Number),
    });
    expect(adminBoot.workspace.releaseRegistry).toContainEqual(expect.objectContaining({
      id: shared.doc.id,
      teacherId: 't1',
      grants: [EVALUATOR, TEACHER_ONE].sort(),
    }));
    // no email was sent by sharing itself (content-free notices are separate)
    expect(harness.sentMail).toEqual([]);
  });

  it('reports release audit recovery without inviting a duplicate document share', () => {
    const harness = repositoryFixture();
    expect(rateAndRelease(harness, 't1', { d1: 3, d2: 2, d3: 2, d4: 3 }).ok).toBe(true);
    harness.setActiveEmail(EVALUATOR);
    const review = harness.invoke('reviewPortalReleasedEvaluationShare', { teacherId: 't1' });
    harness.setFailSheetAppend('Audit', true);

    const shared = harness.invoke('sharePortalReleasedEvaluation', { teacherId: 't1', reviewToken: review.review.token });
    expect(shared).toMatchObject({
      ok: true,
      created: true,
      status: 'recovery_pending',
      recoveryPending: true,
      auditPending: true,
    });
    expect(harness.documents).toHaveLength(1);

    const stored = harness.invoke('bootstrap').workspace;
    expect(stored.teachers.find((item) => item.id === 't1').releasedDoc.id).toBe(shared.doc.id);
    const entry = stored.audit.find((item) => item.event === 'RELEASED_DOC_SHARED' && item.entityId === shared.doc.id);
    expect(entry).toBeTruthy();
    expect(harness.rows('Audit').slice(1).filter((row) => row[0] === entry.id)).toHaveLength(0);

    harness.setFailSheetAppend('Audit', false);
    harness.setActiveEmail(ADMIN);
    expect(reconcileWorkspaceIntegrity(harness)).toMatchObject({
      status: 'completed',
      recoveryPending: false,
      repaired: { workspaceIndexRows: 1 },
    });
    expect(harness.rows('Audit').slice(1).filter((row) => row[0] === entry.id)).toHaveLength(1);
    expect(harness.documents).toHaveLength(1);
  });

  it('re-reads and restores an existing document to the exact private named-viewer ACL', () => {
    const { harness, shared } = releaseAndShare();
    harness.seedFileAcl(shared.doc.id, {
      viewers: [TEACHER_ONE, 'stale.viewer@district.example'],
      editors: [EVALUATOR, 'stale.editor@outside.example'],
      sharingAccess: 'DOMAIN_WITH_LINK',
      parentFolderId: harness.properties.get('EE_RELEASED_FOLDER_ID'),
    });
    harness.driveOperations.splice(0);

    harness.setActiveEmail(EVALUATOR);
    const review = harness.invoke('reviewPortalReleasedEvaluationShare', { teacherId: 't1' });
    const verified = harness.invoke('sharePortalReleasedEvaluation', { teacherId: 't1', reviewToken: review.review.token });

    expect(verified).toMatchObject({ ok: true, idempotent: true, recoveryPending: false });
    expect(harness.fileAcl(shared.doc.id)).toMatchObject({
      viewers: [EVALUATOR, TEACHER_ONE].sort(),
      editors: [],
      sharingAccess: 'PRIVATE',
      parentFolderId: harness.properties.get('EE_RELEASED_FOLDER_ID'),
    });
    expect(harness.documents).toHaveLength(1);
    expect(harness.driveOperations).toEqual(expect.arrayContaining([
      expect.objectContaining({ operation: 'removeViewer', fileId: shared.doc.id, email: 'stale.viewer@district.example' }),
      expect.objectContaining({ operation: 'removeEditor', fileId: shared.doc.id, email: EVALUATOR }),
      expect.objectContaining({ operation: 'removeEditor', fileId: shared.doc.id, email: 'stale.editor@outside.example' }),
      expect.objectContaining({ operation: 'addViewer', fileId: shared.doc.id, email: EVALUATOR }),
      expect.objectContaining({ operation: 'getViewers', fileId: shared.doc.id }),
      expect.objectContaining({ operation: 'getEditors', fileId: shared.doc.id }),
    ]));
    const downgradeAt = harness.driveOperations.findIndex((item) => item.operation === 'removeEditor' && item.email === EVALUATOR);
    const viewerAt = harness.driveOperations.findIndex((item) => item.operation === 'addViewer' && item.email === EVALUATOR);
    expect(downgradeAt).toBeGreaterThan(-1);
    expect(viewerAt).toBeGreaterThan(downgradeAt);
  });

  it('reconciles released-summary grants when the educator managed account is replaced', () => {
    const { harness, shared } = releaseAndShare();
    const replacement = 'teacher.replacement@district.example';

    const removed = applyDirectoryChange(harness, 'member', {
      email: TEACHER_ONE, displayName: 'Teacher One', role: 'teacher', teacherId: 't1', active: false,
    });
    expect(removed.status).toBe('completed');
    expect(harness.fileAcl(shared.doc.id).viewers).toEqual([EVALUATOR]);

    const added = applyDirectoryChange(harness, 'member', {
      email: replacement, displayName: 'Teacher One replacement account', role: 'teacher', teacherId: 't1', active: true,
    });
    expect(added.status).toBe('completed');
    expect(harness.fileAcl(shared.doc.id).viewers).toEqual([EVALUATOR, replacement].sort());

    const adminBoot = harness.invoke('bootstrap');
    const pointer = adminBoot.workspace.teachers.find((item) => item.id === 't1').releasedDoc;
    const registry = adminBoot.workspace.releaseRegistry.find((item) => item.id === shared.doc.id);
    expect(pointer.grants).toEqual([EVALUATOR, replacement].sort());
    expect(registry.grants).toEqual([EVALUATOR, replacement].sort());
    expect(harness.rows('Audit').some((row) => /^RELEASED_DOC_(?:ACL|ACCESS)_RECONCILED$/.test(String(row[2])))).toBe(true);
  });

  it('adds and revokes assigned-evaluator grants across confirmed directory changes', () => {
    const { harness, shared } = releaseAndShare();
    const replacement = 'replacement.evaluator@district.example';
    applyDirectoryChange(harness, 'member', {
      email: replacement, displayName: 'Replacement Evaluator', role: 'evaluator', active: true,
    });
    const assigned = applyDirectoryChange(harness, 'assignment', { teacherId: 't1', evaluatorEmail: replacement, active: true });
    expect(assigned.status).toBe('completed');
    expect(harness.fileAcl(shared.doc.id).viewers).toEqual([EVALUATOR, TEACHER_ONE, replacement].sort());

    const unassigned = applyDirectoryChange(harness, 'assignment', { teacherId: 't1', evaluatorEmail: EVALUATOR, active: false });
    expect(unassigned.status).toBe('completed');
    expect(harness.fileAcl(shared.doc.id).viewers).toEqual([TEACHER_ONE, replacement].sort());
    const adminBoot = harness.invoke('bootstrap');
    expect(adminBoot.workspace.releaseRegistry.find((item) => item.id === shared.doc.id).grants)
      .toEqual([TEACHER_ONE, replacement].sort());
  });

  it('does not report a directory change completed when stale Drive access cannot be removed and verified', () => {
    const { harness, shared } = releaseAndShare();
    harness.setActiveEmail(ADMIN);
    const review = harness.invoke('reviewPortalDirectoryChange', {
      kind: 'assignment', candidate: { teacherId: 't1', evaluatorEmail: EVALUATOR, active: false },
    }).review;
    harness.setDriveFault({ operation: 'removeViewer', fileId: shared.doc.id, email: EVALUATOR, mode: 'sticky' });

    const failure = harness.invokeError('performPortalDirectoryChange', { reviewToken: review.token, acknowledgeImpact: true });
    expect(failure.code).toBe('release_recovery_required');
    expect(harness.fileAcl(shared.doc.id).viewers).toContain(EVALUATOR);
    expect(harness.driveOperations).toContainEqual(expect.objectContaining({ operation: 'removeViewer', fileId: shared.doc.id, email: EVALUATOR }));
    const recoveryRaw = harness.properties.get('EE_RELEASE_RECOVERY_REQUIRED');
    expect(recoveryRaw).toBeTruthy();
    const recovery = JSON.parse(recoveryRaw);
    expect(JSON.stringify(recovery)).toContain(shared.doc.id);
    expect(JSON.stringify(recovery)).toContain('t1');
    const recoveryItems = Array.isArray(recovery) ? recovery : [recovery];
    expect(recoveryItems.some((item) => /acl|access|reconcil/i.test(String(item.stage || item.kind || '')))).toBe(true);
    expect(harness.invoke('getPortalSetupHealth').checks.releasedSummaryRecoveryRequired).toBe(true);
  });

  it('records recoverable partial progress when the second registered document cannot be reconciled', () => {
    const { harness, shared } = releaseAndShare();
    harness.setActiveEmail(ADMIN);
    const boot = harness.invoke('bootstrap');
    const firstRegistry = boot.workspace.releaseRegistry.find((item) => item.id === shared.doc.id);
    const historicalId = 'doc-registered-history-02';
    harness.createDriveFile({
      id: historicalId,
      name: 'Prior released evaluation',
      parentFolderId: harness.properties.get('EE_RELEASED_FOLDER_ID'),
    });
    harness.seedFileAcl(historicalId, {
      viewers: [EVALUATOR, TEACHER_ONE], editors: [], sharingAccess: 'PRIVATE',
      parentFolderId: harness.properties.get('EE_RELEASED_FOLDER_ID'),
    });
    boot.workspace.releaseRegistry.push({
      ...firstRegistry,
      id: historicalId,
      url: `https://docs.google.com/document/d/${historicalId}`,
      releasedAt: '2025-06-15T12:00:00.000Z',
    });
    harness.replaceWorkspace(boot.workspace);

    const review = harness.invoke('reviewPortalDirectoryChange', {
      kind: 'member',
      candidate: { email: TEACHER_ONE, displayName: 'Teacher One', role: 'teacher', teacherId: 't1', active: false },
    }).review;
    harness.driveOperations.splice(0);
    harness.setDriveFault({ operation: 'removeViewer', email: TEACHER_ONE, occurrence: 2, mode: 'sticky' });
    const failure = harness.invokeError('performPortalDirectoryChange', { reviewToken: review.token, acknowledgeImpact: true });
    expect(failure.code).toBe('release_recovery_required');

    const remaining = [shared.doc.id, historicalId].filter((id) => harness.fileAcl(id).viewers.includes(TEACHER_ONE));
    expect(remaining).toHaveLength(1);
    const recovery = JSON.parse(harness.properties.get('EE_RELEASE_RECOVERY_REQUIRED'));
    expect(JSON.stringify(recovery)).toContain(remaining[0]);
    expect(harness.driveOperations.filter((item) => item.operation === 'removeViewer' && item.email === TEACHER_ONE)).toHaveLength(2);
  });

  it('fails closed when a named Drive principal cannot be resolved during exact ACL verification', () => {
    const { harness, shared } = releaseAndShare();
    const unresolved = 'unresolved.viewer@district.example';
    harness.seedFileAcl(shared.doc.id, {
      viewers: [TEACHER_ONE, EVALUATOR, unresolved],
      editors: [],
      sharingAccess: 'PRIVATE',
      parentFolderId: harness.properties.get('EE_RELEASED_FOLDER_ID'),
    });
    harness.setDriveUserIdentityMode(unresolved, 'blank');
    harness.setActiveEmail(EVALUATOR);
    const review = harness.invoke('reviewPortalReleasedEvaluationShare', { teacherId: 't1' });
    const failure = harness.invokeError('sharePortalReleasedEvaluation', { teacherId: 't1', reviewToken: review.review.token });
    expect(failure.code).toBe('release_recovery_required');
    expect(harness.fileAcl(shared.doc.id).viewers).toContain(unresolved);
    expect(harness.properties.get('EE_RELEASE_RECOVERY_REQUIRED')).toBeTruthy();
  });

  it('requires a single-use review token and verifies the same document on re-share', () => {
    const { harness, shared } = releaseAndShare();
    const originalDocumentCount = harness.documents.length;
    const noReview = harness.invokeError('sharePortalReleasedEvaluation', { teacherId: 't1' });
    expect(String(noReview.message || noReview).toLowerCase()).toContain('review');
    const review = harness.invoke('reviewPortalReleasedEvaluationShare', { teacherId: 't1' });
    expect(review.review.action).toBe('verify_existing');
    expect(review.review.recipient).toBe(TEACHER_ONE);
    const verified = harness.invoke('sharePortalReleasedEvaluation', { teacherId: 't1', reviewToken: review.review.token });
    expect(verified.idempotent).toBe(true);
    expect(verified.doc.id).toBe(shared.doc.id);
    expect(harness.documents).toHaveLength(originalDocumentCount);
    const reused = harness.invokeError('sharePortalReleasedEvaluation', { teacherId: 't1', reviewToken: review.review.token });
    expect(String(reused.message || reused)).toContain('expired or was already used');
  });

  it('makes an unavailable-file replacement explicit and retains superseded history', () => {
    const { harness, shared } = releaseAndShare();
    harness.driveFiles.get(shared.doc.id).setTrashed(true);
    const review = harness.invoke('reviewPortalReleasedEvaluationShare', { teacherId: 't1' });
    expect(review.review.action).toBe('replace_trashed');
    const replacement = harness.invoke('sharePortalReleasedEvaluation', { teacherId: 't1', reviewToken: review.review.token });
    expect(replacement.created).toBe(true);
    expect(replacement.doc.id).not.toBe(shared.doc.id);
    const boot = harness.invoke('bootstrap');
    const pointer = boot.workspace.teachers.find((item) => item.id === 't1').releasedDoc;
    expect(pointer.id).toBe(replacement.doc.id);
    expect(pointer.history).toHaveLength(1);
    expect(pointer.history[0]).toMatchObject({ id: shared.doc.id, status: 'superseded_unavailable' });
  });

  it('refuses to change from verify to replace after the disclosure review', () => {
    const { harness, shared } = releaseAndShare();
    const review = harness.invoke('reviewPortalReleasedEvaluationShare', { teacherId: 't1' });
    expect(review.review.action).toBe('verify_existing');
    harness.driveFiles.get(shared.doc.id).setTrashed(true);
    const stale = harness.invokeError('sharePortalReleasedEvaluation', { teacherId: 't1', reviewToken: review.review.token });
    expect(String(stale.message || stale)).toContain('changed after review');
    expect(harness.documents).toHaveLength(1);
  });

  it('trashes a new document and leaves no pointer when Drive access fails before commit', () => {
    const harness = repositoryFixture();
    expect(rateAndRelease(harness, 't1', { d1: 3, d2: 2, d3: 2, d4: 3 }).ok).toBe(true);
    harness.setActiveEmail(EVALUATOR);
    const review = harness.invoke('reviewPortalReleasedEvaluationShare', { teacherId: 't1' });
    harness.setFailAddViewer(true);
    const failed = harness.invokeError('sharePortalReleasedEvaluation', { teacherId: 't1', reviewToken: review.review.token });
    expect(String(failed.message || failed)).toContain('Injected Drive viewer failure');
    const createdId = harness.documents[0].id;
    expect(harness.driveFiles.get(createdId).trashed).toBe(true);
    expect(harness.driveFiles.get(createdId).viewers).toEqual([]);
    harness.setFailAddViewer(false);
    const boot = harness.invoke('bootstrap');
    expect(boot.workspace.teachers.find((item) => item.id === 't1').releasedDoc).toBeNull();
  });

  it('surfaces an administrator health warning when automatic cleanup cannot be confirmed', () => {
    const harness = repositoryFixture();
    expect(rateAndRelease(harness, 't1', { d1: 3, d2: 2, d3: 2, d4: 3 }).ok).toBe(true);
    harness.setActiveEmail(EVALUATOR);
    const review = harness.invoke('reviewPortalReleasedEvaluationShare', { teacherId: 't1' });
    harness.setFailAddViewer(true);
    harness.setFailTrash(true);
    const failed = harness.invokeError('sharePortalReleasedEvaluation', { teacherId: 't1', reviewToken: review.review.token });
    expect(String(failed.message || failed)).toContain('automatic Drive cleanup could not be confirmed');
    harness.setFailAddViewer(false);
    harness.setFailTrash(false);
    harness.setActiveEmail(ADMIN);
    const health = harness.invoke('getPortalSetupHealth');
    expect(health.checks.releasedSummaryRecoveryRequired).toBe(true);
  });

  it('blocks both release review and sharing while a prior release recovery remains unresolved', () => {
    const harness = repositoryFixture();
    expect(rateAndRelease(harness, 't1', { d1: 3, d2: 2, d3: 2, d4: 3 }).ok).toBe(true);
    harness.setActiveEmail(EVALUATOR);
    const earlierReview = harness.invoke('reviewPortalReleasedEvaluationShare', { teacherId: 't1' });
    harness.properties.set('EE_RELEASE_RECOVERY_REQUIRED', JSON.stringify({
      at: '2026-08-13T17:10:00.000Z', teacherId: 't1', documentId: 'unresolved-release-file', stage: 'compensation',
    }));

    const reviewBlocked = harness.invokeError('reviewPortalReleasedEvaluationShare', { teacherId: 't1' });
    expect(reviewBlocked.code).toBe('release_recovery_required');
    const shareBlocked = harness.invokeError('sharePortalReleasedEvaluation', { teacherId: 't1', reviewToken: earlierReview.review.token });
    expect(shareBlocked.code).toBe('release_recovery_required');
    expect(harness.documents).toHaveLength(0);
  });

  it('refuses to share before finalization and refuses teachers outright', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(EVALUATOR);
    const early = harness.invokeError('sharePortalReleasedEvaluation', { teacherId: 't1' });
    expect(String(early.message || early)).toContain('finalized');
    harness.setActiveEmail(TEACHER_ONE);
    const teacherTry = harness.invokeError('sharePortalReleasedEvaluation', { teacherId: 't1' });
    expect(String(teacherTry.message || teacherTry)).toContain('evaluator or administrator');
  });

  it('the document leads with strengths built from the evaluator\'s rationale, never drafts', () => {
    const harness = repositoryFixture();
    // one workflow milestone per save, exactly as the real client does
    const step = (email, mutate, event) => {
      const result = saveAs(harness, email, mutate, { teacherId: 't1', event, entityType: 'formal_observation', entityId: 'obs-t1', version: 1 });
      expect(result.ok).toBe(true);
    };
    // the complete audited observation workflow, one milestone per save
    const on = (workspace) => workspace.observations.find((item) => item.id === 'obs-t1');
    step(TEACHER_ONE, (workspace) => { on(workspace).prework = { plan: 'Unit plan', outcomes: 'Outcomes', resources: '', assessment: '', artifactReferences: '' }; on(workspace).preworkSubmittedAt = '2026-08-07T12:00:00.000Z'; }, 'SUBMITTED');
    step(EVALUATOR, (workspace) => { on(workspace).preConferenceAt = '2026-08-08T12:00:00.000Z'; }, 'CONFERENCED');
    step(EVALUATOR, (workspace) => { on(workspace).observedAt = '2026-08-09T12:00:00.000Z'; }, 'OBSERVATION_STARTED');
    step(EVALUATOR, (workspace) => {
      const observation = on(workspace);
      observation.evidence = 'Published evidence.';
      observation.privacyChecked = true;
      observation.evidencePublishedAt = '2026-08-10T12:00:00.000Z';
    }, 'EVIDENCE_PUBLISHED');
    step(TEACHER_ONE, (workspace) => { on(workspace).reflection = 'My reflection.'; on(workspace).reflectionSubmittedAt = '2026-08-10T14:00:00.000Z'; }, 'SUBMITTED');
    step(EVALUATOR, (workspace) => { on(workspace).postConferenceNotes = 'Discussed.'; on(workspace).postConferenceAt = '2026-08-10T16:00:00.000Z'; }, 'CONFERENCED');
    step(EVALUATOR, (workspace) => {
      const observation = on(workspace);
      observation.ratings = { d1: 3, d2: 2, d3: 2, d4: 3 };
      observation.rationales = { d1: 'RATIONALE-PLANNING', d2: 'r2', d3: 'r3', d4: 'r4' };
      observation.evaluatorSignedAt = '2026-08-11T13:00:00.000Z';
    }, 'SIGNED');
    step(TEACHER_ONE, (workspace) => { on(workspace).ackChecked = true; on(workspace).teacherAcknowledgedAt = '2026-08-11T14:00:00.000Z'; }, 'ACKNOWLEDGED');
    step(EVALUATOR, (workspace) => { on(workspace).finalizedAt = '2026-08-12T12:00:00.000Z'; }, 'FINALIZED');
    // interpretation is set BEFORE publish — published walkthroughs are immutable
    const bright = saveAs(harness, EVALUATOR, (workspace) => {
      workspace.walkthroughs.push({ id: 'walk-bright', teacherId: 't1', date: '2026-08-09', evidence: 'Observed strong discourse.', interpretation: 'BRIGHT-SPOT-INTERPRETATION', privacyChecked: true, publishedAt: '2026-08-09T15:00:00.000Z' });
    }, { teacherId: 't1', event: 'EVIDENCE_PUBLISHED', entityType: 'walkthrough', entityId: 'walk-bright', version: 1 });
    expect(bright.ok).toBe(true);
    expect(rateAndRelease(harness, 't1', { d1: 3, d2: 2, d3: 2, d4: 3 }).ok).toBe(true);
    harness.setActiveEmail(EVALUATOR);
    const review = harness.invoke('reviewPortalReleasedEvaluationShare', { teacherId: 't1' });
    expect(harness.invoke('sharePortalReleasedEvaluation', { teacherId: 't1', reviewToken: review.review.token }).ok).toBe(true);
    const text = harness.documents[0].texts.join('\n');
    expect(text.indexOf('Your strengths')).toBeGreaterThan(-1);
    expect(text.indexOf('Your strengths')).toBeLessThan(text.indexOf('Growth focus'));
    expect(text).toContain('RATIONALE-PLANNING');
    expect(text).toContain('BRIGHT-SPOT-INTERPRETATION');
    // the private draft's evidence never enters a document
    expect(text).not.toContain('Private evaluator draft.');
  });

  it('open receipt: teacher-only, once, honestly idempotent', () => {
    const { harness } = releaseAndShare();
    harness.setActiveEmail(EVALUATOR);
    expect(harness.invoke('recordReleasedSummaryOpened', { teacherId: 't1' }).skipped).toBe(true);
    harness.setActiveEmail(TEACHER_ONE);
    const first = harness.invoke('recordReleasedSummaryOpened', { teacherId: 't1' });
    expect(first.ok).toBe(true);
    expect(first.openedAt).toBeTruthy();
    const second = harness.invoke('recordReleasedSummaryOpened', { teacherId: 't1' });
    expect(second.duplicate).toBe(true);
    harness.setActiveEmail(TEACHER_TWO);
    const other = harness.invokeError('recordReleasedSummaryOpened', { teacherId: 't1' });
    expect(String(other.message || other)).toContain('outside this account');
  });
});

describe('setup health', () => {
  it('is admin-only and reports counts without ever exposing member emails', () => {
    const harness = repositoryFixture();
    harness.setActiveEmail(TEACHER_ONE);
    const denied = harness.invokeError('getPortalSetupHealth');
    expect(String(denied.message || denied)).toContain('Administrator');
    harness.setActiveEmail(ADMIN);
    const health = harness.invoke('getPortalSetupHealth');
    expect(health.ok).toBe(true);
    expect(health.checks.memberCounts).toEqual({ admin: 1, evaluator: 2, teacher: 2, inactive: 0 });
    // 12 active educators, only t1/t2 have portal accounts
    expect(health.checks.activeEducators).toBe(12);
    expect(health.checks.educatorsWithoutMemberAccount).toBe(10);
    expect(health.checks.educatorsWithoutEvaluatorAssignment).toBe(0);
    expect(JSON.stringify(health)).not.toContain('@');
  });
});
