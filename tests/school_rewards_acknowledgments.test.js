// Tier 1 acknowledgment report (2026-09-28).
//
// The MTSS link for School Rewards: the school's PBIS team sees how often and
// where students are acknowledged, and the students acknowledged least export
// as "code, score" rows for MTSS Triage. The Store stays tier-blind, so the
// report reads the ledger and never stores or accepts a tier.
import { describe, expect, it } from 'vitest';
import { harness, setup, seededCategory, ADMIN, STAFF, STUDENT, DOMAIN } from './helpers/school_rewards_repository.js';

let seq = 0;
const key = () => 'ack_test_' + String(++seq).padStart(6, '0');
function addStudent(h, first, last, grade, homeroom) {
  h.setActive(ADMIN);
  return h.call('adminUpsertRewardsStudent', { firstName: first, lastInitial: last, grade, homeroom, email: first.toLowerCase() + '@' + DOMAIN }).student;
}
function award(h, at, studentId, amount, categoryId, actor = STAFF) {
  h.setNow(at); h.setActive(actor);
  return h.call('awardSchoolRewardsPoints', { studentId, amount, categoryId, reason: 'Followed the hallway expectation', idempotencyKey: key() }).entry;
}
function report(h, range) { h.setActive(ADMIN); return h.call('getSchoolRewardsAcknowledgmentReport', range); }

function school() {
  const h = harness(); const avery = setup(h);
  const categories = h.call('getSchoolRewardsBootstrap').categories;
  const blake = addStudent(h, 'Blake', 'S', '5', '5B');
  const casey = addStudent(h, 'Casey', 'M', '6', '6A');
  return { h, avery, blake, casey, first: categories[0], second: categories[1] };
}

describe('counting acknowledgments', () => {
  it('counts awards and claim codes in range, net of reversals, and ignores spends and out-of-range entries', () => {
    const { h, avery, blake, first, second } = school();
    award(h, '2026-09-14T14:00:00.000Z', avery.id, 5, first.id);
    award(h, '2026-09-15T14:00:00.000Z', avery.id, 3, second.id);
    const undone = award(h, '2026-09-16T14:00:00.000Z', blake.id, 10, first.id);
    award(h, '2026-09-01T14:00:00.000Z', blake.id, 7, first.id); // before the range
    h.setActive(ADMIN);
    h.call('reverseSchoolRewardsEntry', { entryId: undone.id, reason: 'Entered for the wrong student', idempotencyKey: key() });
    h.setNow('2026-09-17T14:00:00.000Z'); h.setActive(STAFF);
    const token = h.call('mintSchoolRewardsClaimTokens', { count: 1, points: 4, categoryId: first.id, reason: 'Reading log' }).tokens[0];
    h.setActive(STUDENT); h.call('claimSchoolRewardsToken', { tokenId: token.id });

    const out = report(h, { from: '2026-09-14', to: '2026-09-20' });
    expect(out).toMatchObject({ ok: true, contractVersion: 'alloflow-rewards-acknowledgments/1', scope: 'SCHOOL_INTERNAL', from: '2026-09-14', to: '2026-09-20', days: 7 });
    expect(out.totals).toMatchObject({ acknowledgments: 3, points: 12, activeStudents: 3, studentsAcknowledged: 1, staffAcknowledging: 1 });
    expect(out.bySource).toEqual({ award: 2, claim_token: 1 });
    expect(out.byWeek).toEqual([{ weekStart: '2026-09-14', count: 3, points: 12 }]);
    expect(out.byCategory.map(c => [c.name, c.count, c.points])).toEqual([[first.name, 2, 9], [second.name, 1, 3]]);
    expect(out.byStaff).toEqual([{ name: 'Teacher', count: 2, points: 8 }]);
  });

  it('lists every week in the range, Monday-first, including empty ones', () => {
    const { h, avery, first } = school();
    award(h, '2026-09-10T14:00:00.000Z', avery.id, 2, first.id); // Thursday
    const out = report(h, { from: '2026-09-09', to: '2026-09-22' });
    expect(out.byWeek).toEqual([
      { weekStart: '2026-09-07', count: 1, points: 2 },
      { weekStart: '2026-09-14', count: 0, points: 0 },
      { weekStart: '2026-09-21', count: 0, points: 0 },
    ]);
  });

  it('reports reach by grade and homeroom, including groups nobody acknowledged', () => {
    const { h, avery, blake, first } = school();
    award(h, '2026-09-14T14:00:00.000Z', avery.id, 5, first.id);
    award(h, '2026-09-14T15:00:00.000Z', avery.id, 5, first.id);
    award(h, '2026-09-15T14:00:00.000Z', blake.id, 1, first.id);
    const out = report(h, { from: '2026-09-14', to: '2026-09-20' });
    expect(out.byGrade).toEqual([
      { grade: '5', count: 3, points: 11, activeStudents: 2, studentsAcknowledged: 2 },
      { grade: '6', count: 0, points: 0, activeStudents: 1, studentsAcknowledged: 0 },
    ]);
    expect(out.byHomeroom.map(r => [r.homeroom, r.count, r.activeStudents, r.studentsAcknowledged])).toEqual([['5A', 2, 1, 1], ['5B', 1, 1, 1], ['6A', 0, 1, 0]]);
  });
});

describe('students acknowledged least (the MTSS screening export)', () => {
  it('lists active students fewest-first with a stable pseudonymous code and no email', () => {
    const { h, avery, blake, casey, first } = school();
    award(h, '2026-09-14T14:00:00.000Z', avery.id, 5, first.id);
    award(h, '2026-09-15T14:00:00.000Z', avery.id, 5, first.id);
    award(h, '2026-09-16T14:00:00.000Z', blake.id, 5, first.id);
    const out = report(h, { from: '2026-09-14', to: '2026-09-20' });
    expect(out.students.map(s => [s.name, s.count, s.lastDate])).toEqual([['Casey M.', 0, ''], ['Blake S.', 1, '2026-09-16'], ['Avery R.', 2, '2026-09-15']]);
    expect(out.students.map(s => s.studentId)).toEqual([casey.id, blake.id, avery.id]);
    for (const s of out.students) expect(s.code).toMatch(/^[A-Z]{1,2}-[A-Z0-9]{5}$/);
    expect(out.students[0].code.startsWith('CM-')).toBe(true);
    expect(new Set(out.students.map(s => s.code)).size).toBe(3);
    expect(JSON.stringify(out)).not.toContain('@' + DOMAIN.split('.')[0]);
    const again = report(h, { from: '2026-08-01', to: '2026-09-30' });
    expect(again.students.find(s => s.studentId === casey.id).code).toBe(out.students[0].code);
  });

  it('leaves deactivated students out of the list but keeps their acknowledgments in the totals', () => {
    const { h, blake, first } = school();
    award(h, '2026-09-14T14:00:00.000Z', blake.id, 5, first.id);
    h.setActive(ADMIN);
    h.call('adminUpsertRewardsStudent', { id: blake.id, firstName: 'Blake', lastInitial: 'S', grade: '5', homeroom: '5B', email: 'blake@' + DOMAIN, active: false });
    const out = report(h, { from: '2026-09-14', to: '2026-09-20' });
    expect(out.totals).toMatchObject({ acknowledgments: 1, activeStudents: 2, studentsAcknowledged: 0 });
    expect(out.students.map(s => s.studentId)).not.toContain(blake.id);
  });
});

describe('access and input', () => {
  it('is administrator-only', () => {
    const { h } = school();
    for (const who of [STAFF, STUDENT]) { h.setActive(who); expect(() => h.call('getSchoolRewardsAcknowledgmentReport', {})).toThrow(/role cannot perform/i); }
  });

  it('defaults to the last 28 days and rejects bad or oversized ranges', () => {
    const { h } = school();
    h.setNow('2026-09-28T15:00:00.000Z');
    expect(report(h, {})).toMatchObject({ from: '2026-09-01', to: '2026-09-28', days: 28 });
    expect(() => report(h, { from: '2026-09-20', to: '2026-09-10' })).toThrow(/on or after/);
    expect(() => report(h, { from: '2026-02-30' })).toThrow(/date like/);
    expect(() => report(h, { from: 'last week' })).toThrow(/date like/);
    expect(() => report(h, { from: '2025-01-01', to: '2026-09-28' })).toThrow(/400 days/);
  });

  it('never writes to the repository', () => {
    const { h, avery, first } = school();
    award(h, '2026-09-14T14:00:00.000Z', avery.id, 5, first.id);
    const before = ['Ledger', 'Balances', 'Audit', 'Idempotency', 'Students'].map(name => JSON.stringify(h.rows(name)));
    report(h, { from: '2026-09-14', to: '2026-09-20' });
    expect(['Ledger', 'Balances', 'Audit', 'Idempotency', 'Students'].map(name => JSON.stringify(h.rows(name)))).toEqual(before);
  });
});
