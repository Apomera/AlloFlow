// Development-only fixture: real Code.gs APIs, in-memory simulated services.
// Never import this helper into a deployed portal or use it with real accounts.
import { ADMIN, STAFF, STUDENT, DOMAIN } from '../tests/helpers/school_rewards_repository.js';

const attempted = new WeakSet();
const CLASS_ID = 'CLS-DEMO-KING';
const LINK_KEY = 'demo_unified_class_links_v1';
const fixtures = [
  { learnerId: 'LRN-00000000-0000-4000-8000-000000000001', codename: 'Calm Otter', email: STUDENT },
  { learnerId: 'LRN-00000000-0000-4000-8000-000000000002', codename: 'Brave Robin', email: 'blake@school.example', firstName: 'Blake', lastInitial: 'S' },
  { learnerId: 'LRN-00000000-0000-4000-8000-000000000003', codename: 'Bright Fox', email: 'casey@school.example', firstName: 'Casey', lastInitial: 'T' },
];
const notebookRequest = Object.freeze({ name: 'Notebook', description: 'Fictional store prize', cost: 10, inventoryLimit: 5, idempotencyKey: 'demo_notebook_catalog' });

function requireFixture(condition) {
  if (!condition) throw new Error('Unified demo requires a fresh, unchanged fictional demo seed. Reset the fictional repository and try again.');
}
function exactlyOne(rows, predicate) {
  const matches = rows.filter(predicate);
  requireFixture(matches.length === 1);
  return matches[0];
}
function freeze(value) {
  Object.values(value).forEach(child => { if (child && typeof child === 'object') freeze(child); });
  return Object.freeze(value);
}

/**
 * @typedef {Object} UnifiedDemoMetadata
 * @property {string} classId Existing deterministic fictional AlloFlow class ID.
 * @property {string} classLabel Public label: "Fictional demo class".
 * @property {{learnerId:string,codename:string,studentId:string}[]} learners
 *   Explicit fictional links; studentId is returned by the actual Store API.
 * @property {string} categoryId Category from the existing starting-award record.
 * @property {string} primaryStudentId Existing Avery fixture's canonical Store ID.
 * @property {string} notebookId Existing Notebook's signed catalog receipt ID.
 * @property {{format:'alloflow-store-roster',version:1,classId:string,learners:{learnerId:string,codename:string}[]}} manifest
 *   Strict stripped-export schema: no raw student names, emails or Store IDs.
 */

/**
 * Call once AFTER school_rewards_admin_demo.mjs seed() on its simulated repo.
 * This is fixture setup, not a shortcut around production administrator review.
 * Uses exact fixture email/receipt IDs, never fuzzy names or generated Store IDs.
 * Adds no awards, orders, purchases, Google configuration or external accounts.
 * A reset must construct a fresh repo; a failed partial setup must also be reset.
 * Runs as the fictional administrator and leaves the fictional staff actor active.
 * @param {Object} repo In-memory school_rewards_repository.js harness instance.
 * @returns {UnifiedDemoMetadata} Deeply frozen fictional UI metadata.
 */
export function prepareUnifiedDemo(repo) {
  requireFixture(repo && typeof repo.call === 'function' && typeof repo.setActive === 'function'
    && typeof repo.getProperty === 'function' && typeof repo.rows === 'function');
  requireFixture(repo.getProperty('SR_ALLOWED_DOMAIN') === DOMAIN && !attempted.has(repo));
  repo.setActive(ADMIN);
  try {
    const bootstrap = repo.call('getSchoolRewardsBootstrap');
    requireFixture(bootstrap.ok && bootstrap.actor.email === ADMIN && bootstrap.actor.role === 'admin'
      && bootstrap.students.length === 1 && bootstrap.recentOrders.length === 0);
    const primary = exactlyOne(bootstrap.students, student => student.email === STUDENT && student.active);
    requireFixture(primary.balance === 60 && primary.reservedPoints === 0 && primary.availableBalance === 60);
    const award = exactlyOne(bootstrap.recentLedger, entry => entry.idempotencyKey === 'demo_starting_points');
    requireFixture(bootstrap.recentLedger.length === 1 && award.studentId === primary.id && award.amount === 60 && award.kind === 'EARN');
    const category = exactlyOne(bootstrap.categories, item => item.id === award.categoryId && item.active);
    const notebook = exactlyOne(bootstrap.catalog, item => item.name === notebookRequest.name
      && item.description === notebookRequest.description && item.cost === 10 && item.inventoryLimit === 5 && item.remaining === 5 && item.active);
    exactlyOne(bootstrap.members, member => member.email === ADMIN && member.active && member.role === 'admin');
    exactlyOne(bootstrap.members, member => member.email === STAFF && member.active && member.role === 'staff');
    requireFixture(repo.call('getSchoolRewardsAlloFlowLinkContext').enabled === false);
    // The explicit seed operation must already exist. Replaying its identical
    // request reads the signed receipt; it must not create another catalog item.
    exactlyOne(repo.rows('Idempotency').slice(1), row => row[0] === notebookRequest.idempotencyKey);
    attempted.add(repo);
    const notebookReceipt = repo.call('adminUpsertRewardsCatalogItem', { ...notebookRequest });
    requireFixture(notebookReceipt.ok && notebookReceipt.item.id === notebook.id);

    const students = [primary, ...fixtures.slice(1).map(fixture => {
      const result = repo.call('adminUpsertRewardsStudent', {
        firstName: fixture.firstName, lastInitial: fixture.lastInitial,
        email: fixture.email, grade: '5', homeroom: '5A', active: true,
      });
      requireFixture(result.ok && result.student.active && result.student.email === fixture.email && result.student.id);
      return result.student;
    })];
    requireFixture(new Set(students.map(student => student.id)).size === 3);
    const learners = fixtures.map((fixture, index) => ({ learnerId: fixture.learnerId, codename: fixture.codename, studentId: students[index].id }));
    const manifest = { format: 'alloflow-store-roster', version: 1, classId: CLASS_ID,
      learners: learners.map(({ learnerId, codename }) => ({ learnerId, codename })) };

    requireFixture(repo.call('adminConfigureSchoolRewardsClassLinks', { enabled: true, reviewed: true }).enabled === true);
    const context = repo.call('getSchoolRewardsAlloFlowLinkContext');
    const proposal = { roster: manifest, bindings: learners.map(({ learnerId, studentId }) => ({ learnerId, studentId })),
      staffEmails: [ADMIN, STAFF], suspendedLearnerIds: [], expectedRepositoryId: context.repositoryId, expectedYearKey: context.yearKey };
    const preview = repo.call('previewSchoolRewardsAlloFlowLinks', proposal);
    requireFixture(preview.ok && preview.canApply && preview.conflicts.length === 0 && preview.counts.linked === 3);
    const receipt = repo.call('applySchoolRewardsAlloFlowLinks', { ...proposal, confirmed: true, idempotencyKey: LINK_KEY,
      expectedContentHash: preview.contentHash, expectedRosterRevision: preview.rosterRevision, expectedLinksRevision: preview.linksRevision });
    requireFixture(receipt.ok && receipt.classId === CLASS_ID && receipt.count === 3 && receipt.grantCount === 2
      && receipt.repositoryId === context.repositoryId && receipt.yearKey === context.yearKey
      && receipt.idempotencyKey === LINK_KEY && receipt.actorEmail === ADMIN && receipt.actorRole === 'admin');
    return freeze({ classId: CLASS_ID, classLabel: 'Fictional demo class', learners,
      categoryId: category.id, primaryStudentId: primary.id, notebookId: notebookReceipt.item.id, manifest });
  } finally {
    repo.setActive(STAFF);
  }
}
