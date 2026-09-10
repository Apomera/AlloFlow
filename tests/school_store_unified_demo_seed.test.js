import { describe, expect, it, vi } from 'vitest';
import { prepareUnifiedDemo } from '../dev-tools/school_store_unified_demo_seed.mjs';
import { harness, setup, seededCategory, ADMIN, STAFF, CASHIER } from './helpers/school_rewards_repository.js';

// The unchanged core of school_rewards_admin_demo.mjs seed(): no network/server.
function seededRepo({ amount = 60, notebook = true } = {}) {
  const repo = harness(), primary = setup(repo), category = seededCategory(repo);
  repo.call('adminUpdateRewardsSettings', { printLabEnabled: true });
  repo.call('awardSchoolRewardsPoints', { studentId: primary.id, categoryId: category.id,
    amount, reason: 'Fictional design-project recognition', idempotencyKey: 'demo_starting_points' });
  let item;
  if (notebook) item = repo.call('adminUpsertRewardsCatalogItem', { name: 'Notebook', description: 'Fictional store prize',
    cost: 10, inventoryLimit: 5, idempotencyKey: 'demo_notebook_catalog' }).item;
  repo.call('adminUpsertRewardsWindow', { name: 'Admin demo shopping window', status: 'OPEN' });
  return { repo, primary, category, item };
}
function dataRows(repo) {
  return JSON.stringify(['Students', 'Ledger', 'Orders', 'Catalog', 'Audit'].map(name => repo.rows(name)));
}
function resolveClass(repo, metadata) {
  const listed = repo.call('listSchoolRewardsAlloFlowLinkedClasses');
  expect(listed).toMatchObject({ ok: true, enabled: true, classes: [{ classId: metadata.classId, learners: metadata.manifest.learners }] });
  expect(listed.classes).toHaveLength(1);
  return metadata.learners.map(learner => repo.call('resolveSchoolRewardsAlloFlowLearner', {
    repositoryId: listed.repositoryId, yearKey: listed.yearKey, classId: metadata.classId,
    learnerId: learner.learnerId, expectedClassRevision: listed.classes[0].revision,
  }));
}

describe('fictional unified School Store demo seed', () => {
  it('links explicit real Store IDs to the three stable codenames and grants both administrator and staff', () => {
    const { repo, primary, category, item } = seededRepo();
    repo.setActive(CASHIER);
    const metadata = prepareUnifiedDemo(repo);
    expect(metadata).toMatchObject({ classId: 'CLS-DEMO-KING', classLabel: 'Fictional demo class',
      primaryStudentId: primary.id, categoryId: category.id, notebookId: item.id });
    expect(metadata.learners.map(item => item.codename)).toEqual(['Calm Otter', 'Brave Robin', 'Bright Fox']);
    expect(new Set(metadata.learners.map(item => item.learnerId)).size).toBe(3);
    expect(new Set(metadata.learners.map(item => item.studentId)).size).toBe(3);
    expect(repo.call('getSchoolRewardsBootstrap').actor).toMatchObject({ email: STAFF, role: 'staff' });
    for (const actor of [STAFF, ADMIN]) {
      repo.setActive(actor);
      const resolved = resolveClass(repo, metadata);
      expect(resolved.map(item => item.student.id)).toEqual(metadata.learners.map(item => item.studentId));
      expect(resolved.map(item => item.student.firstName)).toEqual(['Avery', 'Blake', 'Casey']);
      if (actor === STAFF) resolved.forEach(item => expect(item.student.email).toBeUndefined());
    }
    expect(repo.call('getSchoolRewardsAlloFlowLinkContext').classes).toMatchObject([{ count: 3, grantCount: 2, suspendedLearnerIds: [] }]);
    repo.setActive(CASHIER);
    expect(() => repo.call('listSchoolRewardsAlloFlowLinkedClasses')).toThrow();
  });

  it('preserves Avery at 60 and Notebook at 10 points/5 stock, without new ledger, order or catalog mutations', () => {
    const { repo, item } = seededRepo();
    const before = ['Ledger', 'Orders', 'Catalog'].map(name => repo.rows(name));
    const call = vi.spyOn(repo, 'call');
    const metadata = prepareUnifiedDemo(repo);
    expect(['Ledger', 'Orders', 'Catalog'].map(name => repo.rows(name))).toEqual(before);
    const bootstrap = repo.call('getSchoolRewardsBootstrap');
    expect(bootstrap.students.map(student => [student.id, student.balance, student.reservedPoints, student.availableBalance])).toEqual([
      [metadata.primaryStudentId, 60, 0, 60], [metadata.learners[1].studentId, 0, 0, 0], [metadata.learners[2].studentId, 0, 0, 0],
    ]);
    expect(bootstrap.catalog).toEqual([item]);
    expect(call.mock.calls.some(([name]) => /^(award|checkout|refund|reverse|createSchoolRewardsPrint)/.test(name))).toBe(false);
    expect(repo.mail).toHaveLength(0);
  });

  it('uses actual reviewed enable/preview/apply APIs with exact optimistic revisions and explicit bindings', () => {
    const { repo } = seededRepo();
    const call = vi.spyOn(repo, 'call');
    const metadata = prepareUnifiedDemo(repo);
    const calls = call.mock.calls;
    expect(calls.find(([name]) => name === 'adminConfigureSchoolRewardsClassLinks')[1]).toEqual({ enabled: true, reviewed: true });
    const previewIndex = calls.findIndex(([name]) => name === 'previewSchoolRewardsAlloFlowLinks');
    const applyIndex = calls.findIndex(([name]) => name === 'applySchoolRewardsAlloFlowLinks');
    const preview = call.mock.results[previewIndex].value;
    const proposal = calls[previewIndex][1], applied = calls[applyIndex][1];
    expect(applyIndex).toBeGreaterThan(previewIndex);
    expect(proposal.bindings).toEqual(metadata.learners.map(({ learnerId, studentId }) => ({ learnerId, studentId })));
    expect(proposal.staffEmails).toEqual([ADMIN, STAFF]);
    expect(applied).toEqual({ ...proposal, confirmed: true, idempotencyKey: 'demo_unified_class_links_v1',
      expectedContentHash: preview.contentHash, expectedRosterRevision: preview.rosterRevision, expectedLinksRevision: preview.linksRevision });
    expect(repo.rows('AlloFlowClassHeads')).toHaveLength(2);
    expect(repo.rows('AlloFlowClassVersions')).toHaveLength(2);
  });

  it('returns a deeply frozen strict codename-only manifest with no Google/OAuth/raw-name or canonical-ID fields', () => {
    const { repo } = seededRepo(), metadata = prepareUnifiedDemo(repo);
    expect(Object.keys(metadata).sort()).toEqual(['categoryId', 'classId', 'classLabel', 'learners', 'manifest', 'notebookId', 'primaryStudentId']);
    expect(Object.keys(metadata.manifest).sort()).toEqual(['classId', 'format', 'learners', 'version']);
    expect(metadata.manifest).toEqual({ format: 'alloflow-store-roster', version: 1, classId: metadata.classId,
      learners: metadata.learners.map(({ learnerId, codename }) => ({ learnerId, codename })) });
    const serialized = JSON.stringify(metadata.manifest);
    expect(serialized).not.toMatch(/Avery|Blake|Casey|@|studentId|email|firstName|Google|OAuth|clientId|token/i);
    metadata.learners.forEach(learner => {
      expect(serialized).not.toContain(learner.studentId);
      expect(learner.learnerId).toMatch(/^LRN-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });
    const checkFrozen = value => {
      expect(Object.isFrozen(value)).toBe(true);
      Object.values(value).forEach(child => { if (child && typeof child === 'object') checkFrozen(child); });
    };
    checkFrozen(metadata);
    expect(() => { metadata.manifest.learners[0].codename = 'Changed'; }).toThrow(TypeError);
    expect(() => metadata.learners.push({})).toThrow(TypeError);
  });

  it('reconstructs deterministic clean metadata on every fresh reset, with exactly one starting award', () => {
    const first = seededRepo(), second = seededRepo();
    const a = prepareUnifiedDemo(first.repo), b = prepareUnifiedDemo(second.repo);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
    for (const repo of [first.repo, second.repo]) {
      expect(repo.rows('Students')).toHaveLength(4);
      expect(repo.rows('Ledger')).toHaveLength(2);
      expect(repo.rows('Orders')).toHaveLength(1);
      expect(repo.call('getSchoolRewardsBootstrap').students.map(student => student.balance)).toEqual([60, 0, 0]);
    }
  });

  it('refuses blind repeat calls without changing the prepared repository', () => {
    const { repo } = seededRepo(); prepareUnifiedDemo(repo);
    const before = dataRows(repo);
    expect(() => prepareUnifiedDemo(repo)).toThrow(/fresh, unchanged fictional demo seed/);
    expect(dataRows(repo)).toBe(before);
    expect(repo.call('getSchoolRewardsBootstrap').actor.email).toBe(STAFF);
  });

  it.each([{ amount: 61 }, { notebook: false }])('rejects an incomplete or changed baseline before fixture writes: %j', options => {
    const { repo } = seededRepo(options), before = dataRows(repo);
    expect(() => prepareUnifiedDemo(repo)).toThrow(/fresh, unchanged fictional demo seed/);
    expect(dataRows(repo)).toBe(before);
  });

  it('refuses a non-fictional domain without calling Store APIs or switching accounts', () => {
    const { repo } = seededRepo();
    repo.setProperty('SR_ALLOWED_DOMAIN', 'not-the-fictional-domain.invalid');
    const call = vi.spyOn(repo, 'call'), setActive = vi.spyOn(repo, 'setActive');
    expect(() => prepareUnifiedDemo(repo)).toThrow(/fictional demo seed/);
    expect(call).not.toHaveBeenCalled();
    expect(setActive).not.toHaveBeenCalled();
  });
});
