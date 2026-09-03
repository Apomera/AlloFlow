// School Rewards practice portal (2026-09-02).
//
// school-rewards-practice.html is the real Portal.html served with an
// in-browser fictional ledger in place of google.script.run, plus a role and
// scenario bar and an editable tour. The fictional repository is sliced out of
// the page between SR_PRACTICE_START/END markers and exercised here, so the
// rules a teacher or cashier meets in practice are the same ones they meet on
// a real day: one award per student, undo, window state at checkout, live
// inventory, receipts.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const PAGE = readFileSync(resolve(ROOT, 'school-rewards-practice.html'), 'utf8');
const STUB = PAGE.slice(PAGE.indexOf('/* SR_PRACTICE_START */'), PAGE.indexOf('/* SR_PRACTICE_END */'));

function boot(role = 'staff', settings) {
  localStorage.clear();
  localStorage.setItem('alloflow_school_rewards_practice_role', role);
  if (settings) localStorage.setItem('alloflow_school_rewards_practice_settings_v1', JSON.stringify(settings));
  // eslint-disable-next-line no-new-func
  new Function(STUB)();
  return window.srPractice;
}
beforeEach(() => { localStorage.clear(); });
afterEach(() => { delete window.srPractice; delete window.google; localStorage.clear(); });

describe('fictional repository', () => {
  it('boots a seeded school and answers the bootstrap for every role', () => {
    const P = boot('staff');
    const staff = P.call('getSchoolRewardsBootstrap');
    expect(staff.actor.role).toBe('staff');
    expect(staff.students.length).toBe(12);
    expect(staff.categories.length).toBe(4);
    expect(staff.catalog.length).toBe(4);
    expect(staff.windows[0].status).toBe('PREVIEW');
    expect(staff.config.printLabEnabled).toBe(false);
    expect(staff.recentLedger.length).toBeGreaterThan(0);
    boot('student');
    const student = window.srPractice.call('getSchoolRewardsBootstrap');
    expect(student.students).toHaveLength(1);
    expect(student.progress.length).toBe(4);
    expect(student.recentLedger.every((e) => e.studentId === student.actor.studentId)).toBe(true);
  });

  it('awards, undoes within the window, refuses another staff member, and records groups per student', () => {
    const P = boot('staff');
    const before = P.call('getSchoolRewardsBootstrap');
    const target = before.students[1];
    const category = before.categories[0];
    const out = P.call('awardSchoolRewardsPoints', { studentId: target.id, amount: 3, categoryId: category.id, reason: 'Helped reset the lab', idempotencyKey: 'practice_award_0001' });
    expect(out.ok).toBe(true);
    expect(out.balance).toBe(target.balance + 3);
    const again = P.call('awardSchoolRewardsPoints', { studentId: target.id, amount: 3, categoryId: category.id, reason: 'Helped reset the lab', idempotencyKey: 'practice_award_0001' });
    expect(again.entry.id).toBe(out.entry.id);
    expect(() => P.call('awardSchoolRewardsPoints', { studentId: target.id, amount: 0, categoryId: category.id, reason: 'x' })).toThrow(/1 to 1000/);
    expect(() => P.call('awardSchoolRewardsPoints', { studentId: target.id, amount: 2, categoryId: category.id, reason: '' })).toThrow(/Describe what the student did/);
    const undone = P.call('reverseSchoolRewardsEntry', { entryId: out.entry.id, reason: 'Undone', idempotencyKey: 'practice_undo_0001' });
    expect(undone.balance).toBe(target.balance);
    expect(() => P.call('reverseSchoolRewardsEntry', { entryId: out.entry.id, reason: 'x', idempotencyKey: 'practice_undo_0002' })).toThrow(/already been reversed/);
    const group = P.call('awardSchoolRewardsPointsBatch', { studentIds: before.students.slice(0, 3).map((s) => s.id).concat(['student_missing']), amount: 2, categoryId: category.id, reason: 'Class cleanup', idempotencyKey: 'practice_group_0001' });
    expect(group.recorded).toBe(3);
    expect(group.failed).toBe(1);
    // Persisted in the browser so a reload keeps the practice ledger.
    expect(JSON.parse(localStorage.getItem('alloflow_school_rewards_practice_v1')).ledger.length).toBeGreaterThan(before.recentLedger.length);
  });

  it('checks out only in an open window, against balance and stock, and refunds restore both', () => {
    let P = boot('cashier');
    const closed = P.call('getSchoolRewardsBootstrap');
    const rich = closed.students.slice().sort((a, b) => b.balance - a.balance)[0];
    const finite = closed.catalog.find((i) => i.inventoryLimit >= 0);
    expect(() => P.call('checkoutSchoolRewardsOrder', { studentId: rich.id, windowId: closed.windows[0].id, lines: [{ catalogId: finite.id, quantity: 1 }], idempotencyKey: 'practice_checkout_0001' })).toThrow(/No shopping window is open/);
    P = boot('cashier', { scenario: 'shopping' });
    const open = P.call('getSchoolRewardsBootstrap');
    const buyer = open.students.slice().sort((a, b) => b.balance - a.balance)[0];
    const item = open.catalog.find((i) => i.inventoryLimit >= 0);
    const remainingBefore = item.remaining;
    const result = P.call('checkoutSchoolRewardsOrder', { studentId: buyer.id, windowId: open.windows[0].id, lines: [{ catalogId: item.id, quantity: 1 }], idempotencyKey: 'practice_checkout_0002' });
    expect(result.order.status).toBe('COMPLETED');
    expect(result.receipt.status).toBe('SENT');
    expect(result.availableBalance).toBe(buyer.balance - item.cost);
    const afterItem = P.call('getSchoolRewardsBootstrap').catalog.find((i) => i.id === item.id);
    expect(afterItem.remaining).toBe(remainingBefore - 1);
    expect(() => P.call('checkoutSchoolRewardsOrder', { studentId: buyer.id, windowId: open.windows[0].id, lines: [{ catalogId: item.id, quantity: 999 }], idempotencyKey: 'practice_checkout_0003' })).toThrow(/Not enough/);
    expect(() => P.call('refundSchoolRewardsOrder', { orderId: result.order.id, idempotencyKey: 'practice_refund_0001' })).toThrow(/role cannot/);
    // Switching role re-runs the page script without clearing storage: the order survives.
    localStorage.setItem('alloflow_school_rewards_practice_role', 'admin');
    // eslint-disable-next-line no-new-func
    new Function(STUB)();
    const admin = window.srPractice.call('getSchoolRewardsBootstrap');
    expect(admin.recentOrders.some((o) => o.id === result.order.id)).toBe(true);
    const refund = window.srPractice.call('refundSchoolRewardsOrder', { orderId: result.order.id, idempotencyKey: 'practice_refund_0002' });
    expect(refund.order.status).toBe('REFUNDED');
    expect(refund.balance).toBe(buyer.balance);
    expect(window.srPractice.call('getSchoolRewardsBootstrap').catalog.find((i) => i.id === item.id).remaining).toBe(remainingBefore);
  });

  it('honours custom settings, rejects roles it should, and names practice-only limits plainly', () => {
    const P = boot('admin', { scenario: 'small', custom: true, school: 'Riverbend', students: 20, window: 'OPEN', points: 10, categories: 'Kind | Being kind.', prizes: 'Sticker | 5 | 2' });
    const boot1 = P.call('getSchoolRewardsBootstrap');
    expect(boot1.config.schoolName).toBe('Riverbend');
    expect(boot1.students).toHaveLength(20);
    expect(boot1.categories.map((c) => c.name)).toEqual(['Kind']);
    expect(boot1.catalog[0]).toMatchObject({ name: 'Sticker', cost: 5, inventoryLimit: 2, remaining: 2 });
    expect(P.call('adminUpdateRewardsSettings', { printLabEnabled: true }).printLabEnabled).toBe(true);
    expect(() => P.call('sendSchoolRewardsBalanceStatements', {})).toThrow(/not available in practice mode/);
    boot('student');
    expect(() => window.srPractice.call('awardSchoolRewardsPoints', { studentId: 'x', amount: 1, categoryId: 'y', reason: 'z' })).toThrow(/role cannot/);
  });
});

describe('statement language stub (2026-09-02)', () => {
  it('lets the practice student save a language that the next bootstrap reports, and refuses the roles the real repository refuses', () => {
    const P = boot('student');
    expect(P.call('getSchoolRewardsBootstrap').students[0].language).toBe('en');
    expect(P.call('setSchoolRewardsLanguage', { language: 'es' })).toEqual({ ok: true, language: 'es' });
    expect(P.call('getSchoolRewardsBootstrap').students[0].language).toBe('es');
    expect(() => P.call('setSchoolRewardsLanguage', { language: 'fr' })).toThrow(/supported language/);
    boot('staff');
    expect(() => window.srPractice.call('setSchoolRewardsLanguage', { language: 'es' })).toThrow(/role cannot/);
  });
});

describe('practice page', () => {
  it('is the real portal with the stub ahead of it, a role and scenario bar, an editable tour, and no indexing', () => {
    expect(PAGE).toContain('<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">');
    expect(PAGE).toContain('<meta name="robots" content="noindex">');
    expect(PAGE.indexOf('/* SR_PRACTICE_START */')).toBeLessThan(PAGE.indexOf('<main class="shell">'));
    expect(PAGE).toContain('id="practice-role"');
    expect(PAGE).toContain('id="practice-scenario"');
    expect(PAGE).toContain('id="practice-tour-list"');
    expect(PAGE).toContain('id="practice-add-step"');
    // No JSON is ever typed by a person: rows and step cards only.
    const ui = PAGE.slice(PAGE.indexOf('/* SR_PRACTICE_UI_START */'), PAGE.indexOf('/* SR_PRACTICE_UI_END */'));
    expect(ui).toContain('renderTour');
    expect(ui).not.toContain('practice-tour-steps');
    expect(ui).not.toContain('JSON.parse($(');
    expect(ui).not.toContain('window.alert(');
    expect(PAGE).not.toContain('not valid JSON');
    expect(PAGE).toContain('/* SR_PRACTICE_UI_START */');
    // The portal markup and script are embedded unchanged.
    const portal = readFileSync(resolve(ROOT, 'apps_script/school_rewards/Portal.html'), 'utf8').replace(/\r\n/g, '\n');
    expect(PAGE.replace(/\r\n/g, '\n')).toContain(portal.slice(portal.indexOf('<main class="shell">'), portal.indexOf('<script>')));
    expect(readFileSync(resolve(ROOT, 'desktop/web-app/public/school-rewards-practice.html'), 'utf8')).toBe(PAGE);
  });

  it('is one click away from the panel', () => {
    expect(readFileSync(resolve(ROOT, 'school_rewards_source.jsx'), 'utf8')).toContain('href="https://alloflow-cdn.pages.dev/school-rewards-practice"');
    expect(readFileSync(resolve(ROOT, 'school_rewards_module.js'), 'utf8')).toContain('schoolrewards_practice');
  });

  it('ships a default tour with a step for every role', () => {
    const literal = STUB.slice(STUB.indexOf('var DEFAULT_TOUR=') + 'var DEFAULT_TOUR='.length, STUB.indexOf(';\n', STUB.indexOf('var DEFAULT_TOUR=')));
    // eslint-disable-next-line no-new-func
    const tour = new Function('return ' + literal)();
    const roles = new Set(tour.map((s) => s.role));
    expect(Array.from(roles).sort()).toEqual(['admin', 'cashier', 'staff', 'student']);
    for (const step of tour) { expect(step.tab).toBeTruthy(); expect(step.title).toBeTruthy(); expect(step.text.length).toBeGreaterThan(20); }
  });
});
