import { describe, expect, it } from 'vitest';
import { harness, setup, ADMIN, STAFF, CASHIER, STUDENT, DOMAIN } from './helpers/school_rewards_repository.js';

const classId = 'CLS-existing_reviewed_class';
const learnerId = 'LRN-existing_reviewed_learner';
const roster = () => ({ format: 'alloflow-store-roster', version: 1, classId, learners: [{ learnerId, codename: 'Brave Fox' }] });
function fixture() {
  const h = harness(), student = setup(h);
  h.call('adminConfigureSchoolRewardsClassLinks', { enabled: true, reviewed: true });
  return { h, student };
}
function proposal(h, student, changes = {}) {
  const context = h.call('getSchoolRewardsAlloFlowLinkContext');
  return { roster: roster(), bindings: [{ learnerId, studentId: student.id }], staffEmails: [STAFF], expectedRepositoryId: context.repositoryId, expectedYearKey: context.yearKey, ...changes };
}
function reviewed(h, p, key = 'class_link_review_key_001') {
  const preview = h.call('previewSchoolRewardsAlloFlowLinks', p);
  return { ...p, expectedContentHash: preview.contentHash, expectedRosterRevision: preview.rosterRevision, expectedLinksRevision: preview.linksRevision, confirmed: true, idempotencyKey: key };
}
function commit(h, student, changes = {}, key) {
  const request = reviewed(h, proposal(h, student, changes), key);
  return { request, receipt: h.call('applySchoolRewardsAlloFlowLinks', request) };
}
function resolveInput(receipt, id = learnerId) {
  return { repositoryId: receipt.repositoryId, yearKey: receipt.yearKey, classId: receipt.classId, learnerId: id, expectedClassRevision: receipt.revision };
}
function otherStudent(h, n = 2) {
  return h.call('adminUpsertRewardsStudent', { firstName: 'Fictional' + n, lastInitial: 'T', grade: '5', homeroom: '5B', email: 'fictional' + n + '@' + DOMAIN }).student;
}

describe('reviewed optional School Store class identity links', () => {
  it('keeps schema6 compatible and disabled without creating feature tables', () => {
    const h = harness(); setup(h);
    expect(h.configValue('schemaVersion')).toBe('6');
    expect(h.call('getSchoolRewardsAlloFlowLinkContext')).toMatchObject({ enabled: false, students: [], staff: [], classes: [] });
    expect(h.call('listSchoolRewardsAlloFlowLinkedClasses')).toMatchObject({ enabled: false, classes: [] });
    expect(() => h.rows('AlloFlowClassHeads')).toThrow();
    expect(h.call('getSchoolRewardsBootstrap').classLinksSupported).toBe(true);
    h.setActive(STAFF); expect(h.call('getSchoolRewardsBootstrap').classLinksSupported).toBe(true);
    h.setActive(CASHIER); expect(h.call('getSchoolRewardsBootstrap').classLinksSupported).toBeUndefined();
    h.setActive(STUDENT); expect(h.call('getSchoolRewardsBootstrap').classLinksSupported).toBeUndefined();
  });
  it('requires explicit administrator mapping/retention review and audits no-op configuration once', () => {
    const h = harness(); setup(h);
    expect(() => h.call('adminConfigureSchoolRewardsClassLinks', { enabled: true })).toThrow(/review/i);
    h.setActive(STAFF);
    expect(() => h.call('adminConfigureSchoolRewardsClassLinks', { enabled: true, reviewed: true })).toThrow(/role/i);
    expect(() => h.call('getSchoolRewardsAlloFlowLinkContext')).toThrow(/role/i);
    h.setActive(ADMIN);
    const enabled = h.call('adminConfigureSchoolRewardsClassLinks', { enabled: true, reviewed: true });
    expect(h.call('adminConfigureSchoolRewardsClassLinks', { enabled: true, reviewed: true })).toEqual(enabled);
    expect(h.rows('Audit').filter(r => r[1] === 'CLASS_LINK_SETTINGS_REVIEWED')).toHaveLength(1);
    h.call('adminConfigureSchoolRewardsClassLinks', { enabled: false });
    h.call('adminConfigureSchoolRewardsClassLinks', { enabled: false });
    expect(h.rows('Audit').filter(r => r[1] === 'CLASS_LINK_SETTINGS_REVIEWED')).toHaveLength(2);
    expect(h.configValue('schemaVersion')).toBe('6');
  });
  it('previews without writes, commits only confirmed manual links, and resolves one private recipient', () => {
    const { h, student } = fixture(), p = proposal(h, student);
    const before = JSON.stringify([h.rows('AlloFlowClassHeads'), h.rows('AlloFlowClassVersions'), h.rows('Audit')]);
    const preview = h.call('previewSchoolRewardsAlloFlowLinks', p);
    expect(preview).toMatchObject({ canApply: true, counts: { requested: 1, linked: 1, retained: 0 }, preview: [{ learnerId, codename: 'Brave Fox', studentId: student.id, status: 'LINKED' }] });
    expect(JSON.stringify([h.rows('AlloFlowClassHeads'), h.rows('AlloFlowClassVersions'), h.rows('Audit')])).toBe(before);
    const request = reviewed(h, p);
    expect(() => h.call('applySchoolRewardsAlloFlowLinks', { ...request, confirmed: false })).toThrow(/confirm/i);
    const receipt = h.call('applySchoolRewardsAlloFlowLinks', request);
    expect(receipt).toMatchObject({ classId, count: 1, grantCount: 1 });
    expect(JSON.stringify(receipt)).not.toContain(student.email);
    expect(JSON.stringify(receipt)).not.toContain('Brave Fox');
    h.setActive(STAFF);
    expect(h.call('listSchoolRewardsAlloFlowLinkedClasses').classes).toEqual([{ classId, revision: receipt.revision, learners: [{ learnerId, codename: 'Brave Fox' }] }]);
    const resolved = h.call('resolveSchoolRewardsAlloFlowLearner', resolveInput(receipt));
    expect(resolved.student.id).toBe(student.id);
    expect(resolved.student.email).toBeUndefined();
    expect(h.rows('Ledger')).toHaveLength(1);
  });
  it.each([CASHIER, STUDENT, 'unknown@school.example', 'outside@example.net'])('denies role/account %s', actor => {
    const { h, student } = fixture(), { receipt } = commit(h, student);
    h.setActive(actor);
    expect(() => h.call('listSchoolRewardsAlloFlowLinkedClasses')).toThrow();
    expect(() => h.call('resolveSchoolRewardsAlloFlowLearner', resolveInput(receipt))).toThrow();
  });
  it('does not expose classes to ungranted staff and honors grant replacement', () => {
    const { h, student } = fixture();
    h.call('adminUpsertRewardsMember', { email: 'other@' + DOMAIN, role: 'staff', displayName: 'Other', active: true });
    const { receipt } = commit(h, student);
    h.setActive('other@' + DOMAIN);
    expect(h.call('listSchoolRewardsAlloFlowLinkedClasses').classes).toEqual([]);
    expect(() => h.call('resolveSchoolRewardsAlloFlowLearner', resolveInput(receipt))).toThrow(/unavailable/i);
    h.setActive(ADMIN);
    commit(h, student, { staffEmails: [] }, 'class_links_revoke_grant_001');
    h.setActive(STAFF); expect(h.call('listSchoolRewardsAlloFlowLinkedClasses').classes).toEqual([]);
  });
  it('refuses malformed, unknown, duplicate and noncanonical fields before any writes', () => {
    const { h, student } = fixture(), p = proposal(h, student);
    const changes = [
      { secret: 'never-accepted' },
      { roster: { ...p.roster, groups: {} } },
      { roster: { ...p.roster, classId: '__proto__' } },
      { roster: { ...p.roster, learners: [{ learnerId, codename: '---' }] } },
      { roster: { ...p.roster, learners: [{ learnerId, codename: 'constructor' }] } },
      { roster: { ...p.roster, learners: [{ learnerId, codename: ' Fox ' }] } },
      { roster: { ...p.roster, learners: [{ learnerId, codename: 'Brave Fox' }, { learnerId: 'other', codename: 'Brave-Fox' }] } },
      { roster: { ...p.roster, learners: [{ learnerId, codename: 'Brave Fox', email: STUDENT }] } },
      { bindings: [{ learnerId, studentId: student.id }, { learnerId, studentId: student.id }] },
      { staffEmails: [STAFF, STAFF] },
    ];
    for (const change of changes) expect(() => h.call('previewSchoolRewardsAlloFlowLinks', { ...p, ...change })).toThrow();
    expect(h.rows('AlloFlowClassVersions')).toHaveLength(1);
    expect(h.rows('AlloFlowClassHeads')).toHaveLength(1);
  });
  it('keeps unlinked rows explicit and rejects inactive students or nonstaff grants', () => {
    const { h, student } = fixture();
    expect(h.call('previewSchoolRewardsAlloFlowLinks', proposal(h, student, { bindings: [] }))).toMatchObject({ canApply: true, counts: { linked: 0 }, preview: [{ status: 'UNLINKED' }] });
    const invalid = h.call('previewSchoolRewardsAlloFlowLinks', proposal(h, student, { staffEmails: [CASHIER] }));
    expect(invalid.canApply).toBe(false); expect(invalid.conflicts[0].code).toBe('STAFF_UNAVAILABLE');
    h.call('adminUpsertRewardsStudent', { ...student, active: false });
    const inactive = h.call('previewSchoolRewardsAlloFlowLinks', proposal(h, student));
    expect(inactive.canApply).toBe(false); expect(inactive.conflicts[0].code).toBe('STUDENT_UNAVAILABLE');
  });
  it('blocks stale content, roster, links and repository/year reviews before commit', () => {
    const { h, student } = fixture(), request = reviewed(h, proposal(h, student));
    expect(() => h.call('applySchoolRewardsAlloFlowLinks', { ...request, staffEmails: [] })).toThrow(/changed/i);
    otherStudent(h);
    expect(() => h.call('applySchoolRewardsAlloFlowLinks', request)).toThrow(/changed/i);
    const fresh = reviewed(h, proposal(h, student));
    commit(h, student, { roster: { ...roster(), classId: 'CLS_other' } }, 'class_links_other_class_001');
    expect(() => h.call('applySchoolRewardsAlloFlowLinks', fresh)).toThrow(/changed/i);
    expect(() => h.call('previewSchoolRewardsAlloFlowLinks', { ...proposal(h, student), expectedRepositoryId: 'other_repository' })).toThrow(/school|repository/i);
    expect(() => h.call('previewSchoolRewardsAlloFlowLinks', { ...proposal(h, student), expectedYearKey: 'other_year' })).toThrow(/year/i);
  });
  it('retains omitted learners disabled, never reassigns identities or reuses retained codenames', () => {
    const { h, student } = fixture(), other = otherStudent(h);
    const { receipt } = commit(h, student);
    const reassigned = h.call('previewSchoolRewardsAlloFlowLinks', proposal(h, other));
    expect(reassigned.conflicts.some(c => c.code === 'IDENTITY_REASSIGNMENT')).toBe(true);
    const changed = { roster: { ...roster(), learners: [{ learnerId: 'LRN_other', codename: 'Calm Owl' }] }, bindings: [{ learnerId: 'LRN_other', studentId: other.id }] };
    const p = proposal(h, student, changed), preview = h.call('previewSchoolRewardsAlloFlowLinks', p);
    expect(preview.counts).toMatchObject({ requested: 1, linked: 1, retained: 1 });
    h.call('applySchoolRewardsAlloFlowLinks', reviewed(h, p, 'class_links_retention_001'));
    h.setActive(STAFF);
    const listed = h.call('listSchoolRewardsAlloFlowLinkedClasses').classes[0];
    expect(listed.learners).toEqual([{ learnerId: 'LRN_other', codename: 'Calm Owl' }]);
    expect(() => h.call('resolveSchoolRewardsAlloFlowLearner', resolveInput(receipt))).toThrow();
    h.setActive(ADMIN);
    const collision = proposal(h, student, { roster: { ...roster(), learners: [{ learnerId: 'LRN_new', codename: 'Brave Fox' }] }, bindings: [{ learnerId: 'LRN_new', studentId: other.id }] });
    expect(h.call('previewSchoolRewardsAlloFlowLinks', collision).canApply).toBe(false);
  });
  it('requires same canonical identity for a learner reused across classes', () => {
    const { h, student } = fixture(), other = otherStudent(h); commit(h, student);
    const alternate = { roster: { ...roster(), classId: 'CLS_second' } };
    expect(h.call('previewSchoolRewardsAlloFlowLinks', proposal(h, student, alternate)).canApply).toBe(true);
    expect(h.call('previewSchoolRewardsAlloFlowLinks', proposal(h, other, alternate)).conflicts.some(c => c.code === 'IDENTITY_REASSIGNMENT')).toBe(true);
  });
  it.each(['class_links:after_snapshot', 'class_links:after_intent', 'class_links:after_head', 'class_links:after_audit', 'class_links:after_complete'])('recovers exact request after fault at %s', stage => {
    const { h, student } = fixture(), request = reviewed(h, proposal(h, student));
    h.setCoreFault(stage);
    expect(() => h.call('applySchoolRewardsAlloFlowLinks', request)).toThrow(/Injected/);
    const receipt = h.call('applySchoolRewardsAlloFlowLinks', request);
    expect(h.call('applySchoolRewardsAlloFlowLinks', request)).toEqual(receipt);
    expect(h.rows('AlloFlowClassHeads')).toHaveLength(2);
    expect(h.rows('AlloFlowClassVersions')).toHaveLength(2);
    expect(h.rows('Audit').filter(r => r[1] === 'CLASS_LINKS_REVIEWED')).toHaveLength(1);
    expect(h.call('getSchoolRewardsIntegrityReport', {}).readiness.ok).toBe(true);
    expect(h.rows('Ledger')).toHaveLength(1);
  });
  it('keeps a staged snapshot invisible and denies a changed payload under the same saved key', () => {
    const { h, student } = fixture(), request = reviewed(h, proposal(h, student));
    h.setCoreFault('class_links:after_snapshot');
    expect(() => h.call('applySchoolRewardsAlloFlowLinks', request)).toThrow(/Injected/);
    expect(h.call('listSchoolRewardsAlloFlowLinkedClasses').classes).toEqual([]);
    const different = reviewed(h, proposal(h, student, { staffEmails: [] }), request.idempotencyKey);
    expect(() => h.call('applySchoolRewardsAlloFlowLinks', different)).toThrow(/different reviewed content/);
    h.call('applySchoolRewardsAlloFlowLinks', request);
    expect(() => h.call('applySchoolRewardsAlloFlowLinks', different)).toThrow(/already recorded/i);
  });
  it('guards roster/member/year/settings mutations and ordinary awards during pending link recovery', () => {
    const { h, student } = fixture(), request = reviewed(h, proposal(h, student));
    h.setCoreFault('class_links:after_intent');
    expect(() => h.call('applySchoolRewardsAlloFlowLinks', request)).toThrow();
    expect(() => h.call('adminUpsertRewardsStudent', { ...student, active: false })).toThrow(/pending class-link/i);
    expect(() => h.call('adminUpsertRewardsMember', { email: STAFF, role: 'staff', active: false })).toThrow(/pending class-link/i);
    expect(() => h.call('adminConfigureSchoolRewardsClassLinks', { enabled: false })).toThrow(/previous rewards transaction/i);
    expect(() => h.call('startSchoolRewardsAcademicYear', { academicYear: '2027-28', confirm: true })).toThrow(/previous rewards transaction/i);
    expect(() => h.call('listSchoolRewardsAlloFlowLinkedClasses')).toThrow(/previous rewards transaction/i);
    const recovered = h.call('recoverSchoolRewardsOperation', { idempotencyKey: request.idempotencyKey });
    expect(recovered).toMatchObject({ recovered: true, kind: 'class_links', result: { count: 1 } });
  });
  it('fails closed for corrupted snapshot chunks and signed journals', () => {
    const { h, student } = fixture(), request = reviewed(h, proposal(h, student));
    h.setCoreFault('class_links:after_intent'); expect(() => h.call('applySchoolRewardsAlloFlowLinks', request)).toThrow();
    h.setDataCell('AlloFlowClassVersions', 0, 3, JSON.stringify('{}'));
    expect(() => h.call('applySchoolRewardsAlloFlowLinks', request)).toThrow(/verification|snapshot/i);
    expect(h.rows('AlloFlowClassHeads')).toHaveLength(1);
    expect(h.call('getSchoolRewardsIntegrityReport', {}).readiness.ok).toBe(false);
  });
  it('suspends lookups on email change, deactivation, redaction and academic-year rollover', () => {
    const { h, student } = fixture(), { request, receipt } = commit(h, student);
    h.call('adminUpsertRewardsStudent', { ...student, email: 'changed@' + DOMAIN });
    h.setActive(STAFF);
    expect(h.call('listSchoolRewardsAlloFlowLinkedClasses').classes[0].learners).toEqual([]);
    expect(() => h.call('resolveSchoolRewardsAlloFlowLearner', resolveInput(receipt))).toThrow();
    h.setActive(ADMIN);
    expect(h.call('applySchoolRewardsAlloFlowLinks', request)).toEqual(receipt);
    const refreshed = commit(h, { ...student, email: 'changed@' + DOMAIN }, {}, 'class_links_identity_review_002').receipt;
    h.call('redactSchoolRewardsStudent', { studentId: student.id, reason: 'District records request reference 123', confirm: true });
    h.setActive(STAFF);
    expect(h.call('listSchoolRewardsAlloFlowLinkedClasses').classes[0].learners).toEqual([]);
    expect(() => h.call('resolveSchoolRewardsAlloFlowLearner', resolveInput(refreshed))).toThrow();
    h.setActive(ADMIN);
    const exported = h.call('exportSchoolRewardsStudentRecord', { studentId: student.id });
    expect(exported.sections.AlloFlowClassLinks.length).toBe(2);
    h.call('startSchoolRewardsAcademicYear', { academicYear: '2027-28', confirm: true, carryOver: 'all' });
    expect(h.call('listSchoolRewardsAlloFlowLinkedClasses').classes).toEqual([]);
    expect(() => h.call('resolveSchoolRewardsAlloFlowLearner', resolveInput(refreshed))).toThrow(/year/i);
  });

  it('preserves omitted suspension, displays explicit reactivation and never allows reassignment', () => {
    const { h, student } = fixture(), other = otherStudent(h);
    const suspended = commit(h, student, { suspendedLearnerIds: [learnerId] });
    expect(suspended.receipt.count).toBe(0);
    expect(h.call('getSchoolRewardsAlloFlowLinkContext').classes[0].suspendedLearnerIds).toEqual([learnerId]);
    h.setActive(STAFF);
    expect(h.call('listSchoolRewardsAlloFlowLinkedClasses').classes[0].learners).toEqual([]);
    expect(() => h.call('resolveSchoolRewardsAlloFlowLearner', resolveInput(suspended.receipt))).toThrow();
    h.setActive(ADMIN);
    const preserve = proposal(h, student), preservedPreview = h.call('previewSchoolRewardsAlloFlowLinks', preserve);
    expect(preservedPreview).toMatchObject({ counts: { suspended: 1, linked: 0, reactivated: 0 }, preview: [{ status: 'SUSPENDED' }] });
    h.call('applySchoolRewardsAlloFlowLinks', reviewed(h, preserve, 'class_links_keep_suspended_002'));
    const clear = proposal(h, student, { suspendedLearnerIds: [] }), preview = h.call('previewSchoolRewardsAlloFlowLinks', clear);
    expect(preview).toMatchObject({ counts: { suspended: 0, linked: 1, reactivated: 1 }, preview: [{ status: 'REACTIVATED' }] });
    const wrong = h.call('previewSchoolRewardsAlloFlowLinks', proposal(h, other, { suspendedLearnerIds: [] }));
    expect(wrong.canApply).toBe(false);
    const receipt = h.call('applySchoolRewardsAlloFlowLinks', reviewed(h, clear, 'class_links_resume_same_003'));
    h.setActive(STAFF);
    expect(h.call('resolveSchoolRewardsAlloFlowLearner', resolveInput(receipt)).student.id).toBe(student.id);
  });
  it.each([['unknown'], [learnerId, learnerId], 'not-array'])('refuses invalid suspension selection %j', suspendedLearnerIds => {
    const { h, student } = fixture();
    expect(() => h.call('previewSchoolRewardsAlloFlowLinks', proposal(h, student, { suspendedLearnerIds }))).toThrow();
    expect(h.rows('AlloFlowClassVersions')).toHaveLength(1);
  });
  it('rejects a head pointed at a staged but unjournaled snapshot', () => {
    const { h, student } = fixture(), request = reviewed(h, proposal(h, student));
    h.setCoreFault('class_links:after_snapshot');
    expect(() => h.call('applySchoolRewardsAlloFlowLinks', request)).toThrow();
    const version = h.rows('AlloFlowClassVersions')[1][0];
    h.appendRaw('AlloFlowClassHeads', [classId, JSON.stringify({ versionId: version })]);
    expect(() => h.call('listSchoolRewardsAlloFlowLinkedClasses')).toThrow(/commit journal/i);
  });
  it('detects a committed-head rollback while preserving valid older retry receipts', () => {
    const { h, student } = fixture(), original = commit(h, student);
    commit(h, student, { suspendedLearnerIds: [learnerId] }, 'class_links_second_version_002');
    expect(h.call('applySchoolRewardsAlloFlowLinks', original.request)).toEqual(original.receipt);
    h.setDataCell('AlloFlowClassHeads', 0, 1, JSON.stringify({ versionId: original.receipt.revision }));
    expect(() => h.call('listSchoolRewardsAlloFlowLinkedClasses')).toThrow(/rolled back|diverged/i);
    expect(h.call('getSchoolRewardsIntegrityReport', {}).readiness.ok).toBe(false);
  });
  it('retains signed class-link provenance through request pruning and accounts for optional tables', () => {
    const { h, student } = fixture(); h.setNow('2020-01-01T00:00:00.000Z');
    const { receipt } = commit(h, student);
    const pruned = h.call('pruneSchoolRewardsRequestRecords', { olderThanDays: 180, confirm: true });
    expect(pruned.removed).toBe(0);
    expect(h.rows('Idempotency').some(row => String(row[2]).includes('class_links'))).toBe(true);
    expect(h.call('getSchoolRewardsCapacity').cells).toBeGreaterThan(0);
    expect(h.call('resolveSchoolRewardsAlloFlowLearner', resolveInput(receipt)).student.id).toBe(student.id);
  });
  it('reads canonical students once for a 500-learner staff list and bounds version sheet reads', () => {
    const { h, student } = fixture();
    const second = otherStudent(h);
    commit(h, student, { roster: { ...roster(), learners: [...roster().learners, { learnerId: 'LRN_second', codename: 'Calm Owl' }] }, bindings: [{ learnerId, studentId: student.id }, { learnerId: 'LRN_second', studentId: second.id }] });
    h.setActive(STAFF); h.resetRangeReads();
    expect(h.call('listSchoolRewardsAlloFlowLinkedClasses').classes[0].learners).toHaveLength(2);
    expect(h.rangeReads('Students')).toBe(1);
    expect(h.rangeReads('AlloFlowClassVersions')).toBeLessThanOrEqual(3);
  });

  it('exports complete relevant link provenance only to administrators and only for the requested student', () => {
    const { h, student } = fixture(), other = otherStudent(h);
    commit(h, student, { roster: { ...roster(), learners: [...roster().learners, { learnerId: 'LRN_second', codename: 'Calm Owl' }] }, bindings: [{ learnerId, studentId: student.id }, { learnerId: 'LRN_second', studentId: other.id }], suspendedLearnerIds: [learnerId] });
    const record = h.call('exportSchoolRewardsStudentRecord', { studentId: student.id });
    expect(record.sections.AlloFlowClassLinks).toHaveLength(1);
    expect(record.sections.AlloFlowClassLinks[0]).toMatchObject({ studentId: student.id, learnerId, suspended: true, active: false, staffEmails: [STAFF], actorEmail: ADMIN, actorRole: 'admin', at: expect.any(String) });
    expect(JSON.stringify(record.sections)).not.toContain(other.id);
    expect(JSON.stringify(record.sections)).not.toContain('Calm Owl');
    h.setActive(STAFF);
    expect(() => h.call('exportSchoolRewardsStudentRecord', { studentId: student.id })).toThrow(/role/i);
    const list = JSON.stringify(h.call('listSchoolRewardsAlloFlowLinkedClasses'));
    for (const privateValue of [student.id, other.id, ADMIN, STAFF, STUDENT, other.email]) expect(list).not.toContain(privateValue);
    h.setActive(STUDENT);
    expect(() => h.call('exportSchoolRewardsStudentRecord', { studentId: student.id })).toThrow(/role/i);
  });

  it.each([{ idempotencyKey: 'wrong_review_key_001' }, { actorEmail: 'other@school.example' }, { actorRole: 'staff' }])('rejects corrupted saved acknowledgement on exact and admin replay: %j', changed => {
    const { h, student } = fixture(), { request, receipt } = commit(h, student);
    expect(receipt).toMatchObject({ idempotencyKey: request.idempotencyKey, actorEmail: ADMIN, actorRole: 'admin' });
    const rows = h.rows('Idempotency'), index = rows.findIndex(row => row[0] === request.idempotencyKey), saved = JSON.parse(rows[index][2]);
    saved.result = { ...saved.result, ...changed }; h.setDataCell('Idempotency', index - 1, 2, JSON.stringify(saved));
    expect(() => h.call('applySchoolRewardsAlloFlowLinks', request)).toThrow(/receipt/i);
    expect(() => h.call('recoverSchoolRewardsOperation', { idempotencyKey: request.idempotencyKey })).toThrow(/receipt/i);
    expect(h.call('getSchoolRewardsIntegrityReport', {}).readiness.ok).toBe(false);
  });

  it('chunks a 500-learner snapshot and keeps the signed recovery journal small', () => {
    const { h, student } = fixture();
    const values = Array.from({ length: 499 }, (_, n) => ({ firstName: 'Fictional', lastInitial: 'T', grade: '5', homeroom: '5B', email: 'large' + n + '@' + DOMAIN }));
    const students = [student, ...h.call('adminBulkUpsertRewardsStudents', values).students];
    const learners = students.map((_, n) => ({ learnerId: 'LRN_' + String(n).padStart(4, '0') + '_'.repeat(112), codename: 'Learner ' + n }));
    const p = proposal(h, student, { roster: { ...roster(), learners }, bindings: students.map((s, n) => ({ learnerId: learners[n].learnerId, studentId: s.id })) });
    const request = reviewed(h, p), receipt = h.call('applySchoolRewardsAlloFlowLinks', request);
    expect(receipt.count).toBe(500);
    const version = h.rows('AlloFlowClassVersions')[1];
    expect(Number(version[2])).toBeGreaterThan(1);
    for (const cell of version.slice(3)) expect(String(cell).length).toBeLessThan(50000);
    const journal = h.rows('Idempotency').find(r => r[0] === request.idempotencyKey);
    expect(journal[2].length).toBeLessThan(4000);
  }, 60000);
});
