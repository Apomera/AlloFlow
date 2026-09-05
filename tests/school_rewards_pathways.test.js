import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import { webcrypto } from 'node:crypto';
import { harness, setup, seededCategory, ADMIN, STAFF, CASHIER, STUDENT } from './helpers/school_rewards_repository.js';

const portal = readFileSync('apps_script/school_rewards/Portal.html', 'utf8');
const opened = [];
afterEach(() => { opened.splice(0).forEach(app => app.dom.window.close()); });

async function openPortal(repository, email, intercept, savedSession) {
  const errors = [], calls = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error.message));
  const dom = new JSDOM('<!doctype html><html><body>' + portal + '</body></html>', {
    url: 'https://school.example/portal', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole,
  });
  const window = dom.window;
  Object.defineProperty(window, 'crypto', { value: webcrypto });
  if (savedSession) Object.entries(savedSession).forEach(([key, value]) => window.sessionStorage.setItem(key, value));
  window.TextEncoder = TextEncoder;
  window.TextDecoder = TextDecoder;
  window.confirm = () => true;
  window.prompt = (_message, fallback) => fallback || 'Reviewed by school staff';
  window.print = () => {};
  let pending = 0;
  const script = {};
  Object.defineProperty(script, 'run', { get() {
    let success, failure, runner;
    runner = new Proxy({}, { get(_target, name) {
      if (name === 'withSuccessHandler') return fn => { success = fn; return runner; };
      if (name === 'withFailureHandler') return fn => { failure = fn; return runner; };
      return input => {
        const argument = input === undefined ? undefined : JSON.parse(JSON.stringify(input));
        calls.push({ name, argument }); pending++;
        Promise.resolve().then(async () => {
          if (intercept) await intercept(name, argument);
          repository.setActive(email);
          return repository.call(name, argument);
        }).then(result => success(JSON.parse(JSON.stringify(result))), error => failure(error)).finally(() => { pending--; });
      };
    } });
    return runner;
  } });
  window.google = { script };
  const app = { dom, calls, errors, $: selector => window.document.querySelector(selector),
    async settle() {
      for (let i = 0, idle = 0; i < 200; i++) {
        await new Promise(resolve => setTimeout(resolve, 5));
        if (!pending && !this.$('#notice').classList.contains('busy')) { if (++idle >= 3) return; } else idle = 0;
      }
      throw new Error('Portal RPCs did not settle');
    },
    async upload(selector, name, data) { const node = this.$(selector), text = JSON.stringify(data); Object.defineProperty(node, 'files', { configurable: true, value: [{ name, size: text.length, text: async () => text }] }); await node.onchange(); node.required = false; /* JSDOM has no native file chooser; the upload handler validates these bytes. */ await this.settle(); },
    async click(selector) { const node = this.$(selector); expect(node, selector).toBeTruthy(); node.click(); await this.settle(); },
    set(selector, value) { const node = this.$(selector); expect(node, selector).toBeTruthy(); node.value = value; node.dispatchEvent(new window.Event('change', { bubbles: true })); },
    async submit(selector) { const form = this.$(selector); expect(form.checkValidity(), selector).toBe(true); await form.onsubmit({ preventDefault() {}, target: form }); await this.settle(); },
  };
  opened.push(app);
  window.eval(portal.match(/<script>([\s\S]*)<\/script>/)[1]);
  await app.settle();
  return app;
}

function seedStore() {
  const h = harness(), student = setup(h), category = seededCategory(h);
  const prize = h.call('adminUpsertRewardsCatalogItem', { name: 'Notebook', cost: 10, inventoryLimit: 5, idempotencyKey: 'pathway_catalog_01' }).item;
  const window = h.call('adminUpsertRewardsWindow', { name: 'School store', status: 'OPEN' }).window;
  return { h, student, category, prize, window };
}

describe('School Rewards complete portal pathways', () => {

  it('preserves shopping-window instants across a portal transition and sends edited dates with a timezone', async () => {
    const { h, window } = seedStore();
    const startsAt = '2099-01-02T02:15:37.250Z', endsAt = '2099-01-03T02:15:48.500Z';
    h.call('adminUpsertRewardsWindow', { id: window.id, name: 'Timed store', status: 'DRAFT', startsAt, endsAt });
    const admin = await openPortal(h, ADMIN); await admin.click('[data-tab="admin"]');
    admin.set('#window-id', window.id); admin.set('#window-status', 'PREVIEW'); await admin.submit('#window-form');
    const first = admin.calls.find(call => call.name === 'adminUpsertRewardsWindow').argument;
    expect(first).toMatchObject({ startsAt, endsAt, status: 'PREVIEW' });
    h.setActive(ADMIN);
    expect(h.call('getSchoolRewardsBootstrap').windows.find(item => item.id === window.id)).toMatchObject({ startsAt, endsAt, status: 'PREVIEW' });
    admin.set('#window-start', '2099-01-04T10:30'); admin.set('#window-end', '2099-01-05T10:30'); await admin.submit('#window-form');
    const edited = admin.calls.filter(call => call.name === 'adminUpsertRewardsWindow').at(-1).argument;
    expect(edited.startsAt).toBe(new admin.dom.window.Date('2099-01-04T10:30').toISOString());
    expect(edited.endsAt).toBe(new admin.dom.window.Date('2099-01-05T10:30').toISOString());
    expect(edited.startsAt).toMatch(/Z$/); expect(admin.errors).toEqual([]);
  }, 60000);

  it('keeps a saved quote’s deadline and override explanation when staff change its price', async () => {
    const { h, window } = seedStore(); h.setActive(STUDENT);
    const model = h.call('createSchoolRewardsPrintModel', { title: 'Quoted token', sourceFormat: 'RECIPE', recipe: { parts: [{ shape: 'box', size: [1, 1, 1], position: [0, 0, 0], rotation: [0, 0, 0], color: '#64748b' }] }, widthMm: 30, depthMm: 20, heightMm: 10, triangleCount: 12, idempotencyKey: 'quote_preservation_model' }).model;
    const request = h.call('submitSchoolRewardsPrintRequest', { modelId: model.id, windowId: window.id, requestedMaterialId: 'PHA', quantity: 1, idempotencyKey: 'quote_preservation_request' }).request;
    const quoteExpiresAt = '2099-01-02T02:15:37.250Z', reason = 'Operator verified the thin-wall warning';
    h.setActive(STAFF);
    h.call('reviewSchoolRewardsPrintRequest', { requestId: request.id, action: 'QUOTE', quotePoints: 10, quoteExpiresAt, estimatedGrams: 18, estimatedMinutes: 75, preflightDecision: 'OVERRIDE', reason, preflightSummary: '', approvedMaterialId: '', idempotencyKey: 'quote_preservation_review' });
    const staff = await openPortal(h, STAFF); await staff.click('[data-tab="print"]');
    expect(staff.$('[name="preflightDecision"]').value).toBe('OVERRIDE'); expect(staff.$('[name="reason"]').value).toBe(reason);
    expect(staff.$('[name="approvedMaterialId"]').value).toBe(''); expect(staff.$('[name="preflightSummary"]').value).toBe('');
    staff.set('[name="quotePoints"]', '15'); await staff.click('[data-print-review-action="QUOTE"]');
    expect(staff.$('#notice').textContent).toContain('Point quote sent');
    h.setActive(STAFF);
    expect(h.call('getSchoolRewardsPrintBootstrap').requests.find(item => item.id === request.id)).toMatchObject({ quotePoints: 15, quoteExpiresAt, preflightDecision: 'OVERRIDE', staffReason: reason, estimatedGrams: 18, estimatedMinutes: 75, preflightSummary: '', approvedMaterialId: '' });
    expect(staff.errors).toEqual([]);
  }, 60000);



  it('recovers an interrupted student remix through the administrator integrity controls', async () => {
    const { h } = seedStore(); h.setActive(STUDENT);
    const source = h.call('createSchoolRewardsPrintModel', { title: 'Shared token', sourceFormat: 'RECIPE', recipe: { parts: [{ shape: 'box', size: [1, 1, 1], position: [0, 0, 0], rotation: [0, 0, 0], color: '#64748b' }] }, widthMm: 30, depthMm: 20, heightMm: 10, triangleCount: 12, idempotencyKey: 'pathway_recovery_model' }).model;
    const publication = h.call('submitSchoolRewardsPrintPublication', { modelId: source.id, catalogTitle: 'Shared token', reusePolicy: 'SCHOOL_REMIX_PRINT', consent: true, idempotencyKey: 'pathway_recovery_publish' }).publication;
    h.setActive(STAFF); h.call('reviewSchoolRewardsPrintPublication', { publicationId: publication.id, action: 'APPROVE', idempotencyKey: 'pathway_recovery_approve' });
    const pupil = await openPortal(h, STUDENT), files = h.fileCount(), ledger = h.rows('Ledger');
    h.setCoreFault('print_remix_after_file'); await pupil.click('[data-community-remix]');
    const original = pupil.calls.find(call => call.name === 'remixSchoolRewardsPrintModel').argument;
    const admin = await openPortal(h, ADMIN); await admin.click('[data-tab="admin"]'); await admin.click('#run-integrity');
    expect(admin.$('#integrity-summary').textContent).toContain('1 pending operations');
    expect(admin.$('#integrity-issues').textContent).toContain('Resume private remix');
    await admin.click('[data-recover-remix]');
    expect(admin.$('#integrity-summary').textContent).toContain('Ready');
    expect(admin.$('[data-recover-remix]')).toBeNull();
    expect(h.fileCount()).toBe(files + 1); expect(h.rows('Ledger')).toEqual(ledger);
    h.setActive(STUDENT);
    expect(h.call('remixSchoolRewardsPrintModel', original).model.publicationStatus).toBe('PRIVATE');
    expect(h.fileCount()).toBe(files + 1);
    expect(admin.errors).toEqual([]);
    const savedSession = { ...pupil.dom.window.sessionStorage };
    expect(Object.keys(savedSession).length).toBeGreaterThan(0);
    const refreshed = await openPortal(h, STUDENT, null, savedSession);
    expect(refreshed.dom.window.sessionStorage.length).toBe(0);
    expect(refreshed.calls.filter(call => call.name === 'remixSchoolRewardsPrintModel')).toHaveLength(0);
  }, 60000);



  it('publishes a consented recipe and lets another student make an allowed private remix', async () => {
    const { h } = seedStore();
    h.call('adminUpsertRewardsStudent', { firstName: 'Blake', email: 'blake@school.example' });
    h.setActive(STUDENT);
    h.call('createSchoolRewardsPrintModel', { title: 'Shared bridge', sourceFormat: 'RECIPE', recipe: { parts: [{ shape: 'box', size: [1, 1, 1], position: [0, 0, 0], rotation: [0, 0, 0], color: '#64748b' }] }, widthMm: 30, depthMm: 20, heightMm: 10, triangleCount: 12, idempotencyKey: 'pathway_publication_model' });
    const pupil = await openPortal(h, STUDENT);
    pupil.set('#publication-title', 'Shared bridge');
    pupil.set('#publication-description', 'A bridge for class design practice');
    pupil.set('#publication-reuse', 'SCHOOL_REMIX_PRINT');
    pupil.$('#publication-consent').checked = true;
    await pupil.submit('#publication-form');
    const staff = await openPortal(h, STAFF);
    await staff.click('[data-publication-action="APPROVE"]');
    const other = await openPortal(h, 'blake@school.example');
    expect(other.$('[data-community-remix]')).toBeTruthy();
    await other.click('[data-community-remix]');
    h.setActive('blake@school.example');
    const models = h.call('getSchoolRewardsPrintBootstrap').models;
    expect(models).toHaveLength(1);
    expect(models[0].remixOfModelId).toBeTruthy();
    expect(models[0].publicationStatus).toBe('PRIVATE');
  }, 60000);


  it('runs recipe import, staff quote, reservation, fulfillment, and print refund through the portal', async () => {
    const { h, student, category } = seedStore();
    h.call('awardSchoolRewardsPoints', { studentId: student.id, categoryId: category.id, amount: 50, reason: 'Design practice', idempotencyKey: 'pathway_print_award' });
    const pupil = await openPortal(h, STUDENT);
    await pupil.click('[data-tab="print"]');
    const handoff = { version: 'printable/1', title: 'Bridge token', sourceFormat: 'RECIPE', recipe: { version: 'p3d/1', name: 'Bridge token', parts: [{ shape: 'box', size: [1, 1, 1], position: [0, 0, 0], rotation: [0, 0, 0], color: '#64748b' }], scale: 1, rotY: 0, tint: null }, aiUse: 'NONE', preflight: { status: 'PASS', sourceFormat: 'RECIPE', byteSize: 300, triangleCount: 12, meshCount: 1, dimensionsMm: { width: 30, depth: 20, height: 10 }, issues: [] } };
    await pupil.upload('#print-package-file', 'bridge.alloflow-print.json', handoff);
    expect(pupil.$('#print-submit').disabled).toBe(false);
    await pupil.submit('#print-submit-form');
    expect(pupil.$('#notice').textContent).toContain('submitted for staff review');
    const staff = await openPortal(h, STAFF);
    await staff.click('[data-tab="print"]');
    staff.set('[name="quotePoints"]', '10');
    await staff.click('[data-print-review-action="QUOTE"]');
    expect(staff.$('#notice').textContent).toContain('Point quote sent');
    const confirmingPupil = await openPortal(h, STUDENT);
    await confirmingPupil.click('[data-print-confirm]');
    expect(confirmingPupil.$('#print-reserved').textContent).toBe('10');
    const queue = await openPortal(h, STAFF);
    await queue.click('[data-print-advance="QUEUE"]');
    await queue.click('[data-print-advance="START_PRINT"]');
    await queue.click('[data-print-advance="MARK_READY"]');
    await queue.click('[data-print-fulfill]');
    expect(queue.$('#notice').textContent).toContain('Print fulfilled');
    const admin = await openPortal(h, ADMIN);
    await admin.click('[data-print-refund]');
    h.setActive(ADMIN);
    const data = h.call('getSchoolRewardsBootstrap');
    expect(data.students[0]).toMatchObject({ balance: 50, reservedPoints: 0, availableBalance: 50 });
    expect(h.call('getSchoolRewardsIntegrityReport', {}).ready).toBe(true);
    expect(h.rows('PointHolds')).toHaveLength(2);
    expect(h.rows('Orders')[1][4]).toBe('REFUNDED');
    expect([pupil, staff, confirmingPupil, queue, admin].flatMap(app => app.errors)).toEqual([]);
  }, 60000);

  it('runs SIS preview/apply, guardian consent and mail, reports, storage, and year rollover through admin controls', async () => {
    const { h, student, window } = seedStore();
    const admin = await openPortal(h, ADMIN);
    await admin.click('[data-tab="admin"]');
    const snapshot = { formatVersion: 'alloflow-sis-roster/1', snapshotId: 'readiness-snapshot-01', students: [{ firstName: 'Blake', email: 'blake@school.example', grade: '5', homeroom: '5A', active: true }] };
    await admin.upload('#sis-snapshot-file', 'roster.json', snapshot);
    await admin.click('#preview-sis-snapshot');
    expect(h.rows('Students')).toHaveLength(2);
    await admin.click('#apply-sis-snapshot');
    expect(h.rows('Students')).toHaveLength(3);
    admin.set('#guardian-student', student.id);
    admin.set('#guardian-email', 'guardian@example.org');
    admin.set('#guardian-name', 'Morgan');
    admin.$('#guardian-consent').checked = true;
    await admin.submit('#guardian-form');
    expect(admin.$('#notice').textContent).toContain('Guardian connection saved');
    admin.set('#guardian-period', 'readiness-period');
    admin.set('#guardian-limit', '100');
    await admin.submit('#guardian-digest-form');
    expect(h.mail.some(mail => mail.to === 'guardian@example.org')).toBe(true);
    await admin.click('#send-now');
    expect(h.mail.some(mail => mail.to === STUDENT)).toBe(true);
    await admin.click('#load-district-summary');
    expect(admin.$('#district-summary').textContent).not.toContain(STUDENT);
    await admin.click('#capacity-check');
    expect(admin.$('#capacity-report').textContent).toContain('spreadsheet');
    admin.set('#window-id', window.id);
    admin.set('#window-status', 'CLOSED');
    await admin.submit('#window-form');
    await admin.click('#year-check');
    admin.set('#year-next', '2099-2100');
    admin.set('#year-carry', 'all');
    await admin.click('#year-start');
    expect(admin.$('#notice').textContent).toContain('new academic year');
    h.setActive(ADMIN);
    expect(h.call('getSchoolRewardsIntegrityReport', {}).ready).toBe(true);
    expect(admin.errors).toEqual([]);
  }, 60000);

  it('keeps core rewards usable and supports retry when only Print Lab loading fails', async () => {
    const { h } = seedStore();
    let offline = true;
    const admin = await openPortal(h, ADMIN, name => { if (name === 'getSchoolRewardsPrintBootstrap' && offline) throw new Error('Print service unavailable'); });
    expect(admin.$('#school-title').textContent).toBe('Pilot School Rewards');
    expect(admin.$('#notice').textContent).toContain('Print Lab');
    expect(admin.$('#print-load-error').hidden).toBe(false);
    expect(admin.$('#print-content').hidden).toBe(true);
    offline = false;
    await admin.click('#retry-print-load');
    expect(admin.$('#print-load-error').hidden).toBe(true);
    expect(admin.$('#print-content').hidden).toBe(false);
    expect(admin.errors).toEqual([]);
  });

  it.each([
    [STUDENT, ['dashboard', 'store', 'activity', 'print']],
    [STAFF, ['dashboard', 'award', 'store', 'activity', 'print']],
    [CASHIER, ['dashboard', 'store', 'activity']],
    [ADMIN, ['dashboard', 'award', 'store', 'activity', 'print', 'admin']],
  ])('loads permitted navigation for %s through the real backend', async (email, expected) => {
    const { h } = seedStore();
    const app = await openPortal(h, email);
    expect(app.$('#notice').textContent).toBe('Connected.');
    const tabs = [...app.dom.window.document.querySelectorAll('[data-tab]')].filter(tab => !tab.hidden).map(tab => tab.dataset.tab);
    expect(tabs.sort()).toEqual(expected.sort());
    expect(app.errors).toEqual([]);
  });

  it('runs staff recognition, student balance, cashier purchase, and admin refund from portal controls', async () => {
    const { h, student, category, prize } = seedStore();
    const staff = await openPortal(h, STAFF);
    await staff.click('[data-tab="award"]');
    await staff.click('[data-tile-student="' + student.id + '"]');
    staff.set('#award-category', category.id);
    staff.set('#award-amount', '30');
    staff.set('#award-reason', 'Helped prepare the shared materials');
    await staff.submit('#award-form');
    expect(staff.$('#notice').textContent).toContain('recorded');

    const pupil = await openPortal(h, STUDENT);
    expect(pupil.$('#metric-students').textContent).toBe('30 pts');
    expect(pupil.$('#recognition-card').textContent).toContain('Helped prepare');

    const cashier = await openPortal(h, CASHIER);
    await cashier.click('[data-tab="store"]');
    cashier.set('#checkout-student', student.id);
    await cashier.click('[data-add="' + prize.id + '"]');
    await cashier.submit('#checkout-form');
    expect(cashier.$('#checkout-receipt').hidden).toBe(false);
    expect(cashier.$('#checkout-receipt').textContent).toContain('Completed purchase');
    h.setActive(ADMIN);
    expect(h.call('getSchoolRewardsBootstrap').students[0].balance).toBe(20);
    const admin = await openPortal(h, ADMIN);
    await admin.click('[data-tab="activity"]');
    const refund = admin.$('[data-refund]');
    expect(refund).toBeTruthy();
    refund.click(); await admin.settle();
    h.setActive(ADMIN);
    expect(h.call('getSchoolRewardsBootstrap').students[0].balance).toBe(30);
    expect(h.call('getSchoolRewardsBootstrap').catalog[0].remaining).toBe(5);
    expect(h.call('getSchoolRewardsIntegrityReport', {}).ready).toBe(true);
    expect([...staff.errors, ...pupil.errors, ...cashier.errors, ...admin.errors]).toEqual([]);
  });
});
