import { describe, it, expect } from 'vitest';
import { harness, setup, seededCategory, ADMIN, CASHIER, STUDENT } from './helpers/school_rewards_repository.js';
import { captureReceiptMail, readReceiptMail } from '../dev-tools/school_store_demo_mail.mjs';

function fixture() {
  const repo = harness(), student = setup(repo), category = seededCategory(repo);
  repo.call('awardSchoolRewardsPoints', { studentId: student.id, categoryId: category.id, amount: 60, reason: 'Fictional test', idempotencyKey: 'mail_preview_award' });
  const item = repo.call('adminUpsertRewardsCatalogItem', { name: '<Notebook> & pencil', cost: 10, inventoryLimit: 5, idempotencyKey: 'mail_preview_catalog' }).item;
  const window = repo.call('adminUpsertRewardsWindow', { name: 'Test', status: 'OPEN' }).window;
  repo.setActive(CASHIER);
  const request = { studentId: student.id, windowId: window.id, lines: [{ catalogId: item.id, quantity: 1 }], idempotencyKey: 'mail_preview_checkout' };
  const before = repo.mail.length, result = repo.call('checkoutSchoolRewardsOrder', request), captured = new Map();
  captureReceiptMail(repo, result, before, captured);
  const input = { receiptId: result.receipt.id, orderId: result.order.id, role: 'cashier', demoGeneration: 'fixture' };
  return { repo, result, captured, input, request };
}
describe('captured fictional receipt email', () => {
  it('returns the exact actual generated email without sending or regenerating', () => {
    const f = fixture(), mailCount = f.repo.mail.length, ledger = JSON.stringify(f.repo.rows('Ledger'));
    const message = readReceiptMail(f.repo, f.input, f.captured), actual = f.repo.mail.at(-1);
    expect(message).toMatchObject({ to: actual.to, senderName: actual.name, subject: actual.subject, body: actual.body, htmlBody: actual.htmlBody, simulated: true });
    expect(message.htmlBody).toContain('&lt;Notebook&gt; &amp; pencil');
    expect(message.body).toContain('<Notebook> & pencil'); expect(message.body).toContain('50 points');
    expect(f.repo.mail).toHaveLength(mailCount); expect(JSON.stringify(f.repo.rows('Ledger'))).toBe(ledger);
    expect(readReceiptMail(f.repo, f.input, f.captured)).toEqual(message);
  });
  it.each([{ orderId: 'wrong' }, { receiptId: 'wrong' }, { to: 'personal@example.org' }, { htmlBody: 'replacement' }])('rejects mismatched identifiers or injected fields: %j', changes => {
    const f = fixture(); expect(readReceiptMail(f.repo, { ...f.input, ...changes }, f.captured)).toBeNull();
  });
  it('retains the original mail on exact checkout replay with no second send', () => {
    const f = fixture(), before = f.repo.mail.length, original = f.captured.get(f.input.receiptId);
    const replay = f.repo.call('checkoutSchoolRewardsOrder', f.request);
    captureReceiptMail(f.repo, replay, before, f.captured);
    expect(f.captured.get(f.input.receiptId)).toBe(original); expect(f.repo.mail).toHaveLength(before);
  });
  it('keeps purchase and refund emails separate', () => {
    const f = fixture(); f.repo.setActive(ADMIN); const before = f.repo.mail.length;
    const refund = f.repo.call('refundSchoolRewardsOrder', { orderId: f.input.orderId, reason: 'Fictional return', idempotencyKey: 'mail_preview_refund' });
    captureReceiptMail(f.repo, refund, before, f.captured);
    const message = readReceiptMail(f.repo, { ...f.input, receiptId: refund.receipt.id }, f.captured);
    expect(message.subject).toContain('refund'); expect(message.body).toContain('Points restored: +10');
    expect(readReceiptMail(f.repo, f.input, f.captured).subject).toContain('purchase');
  });
  it('returns no preview when mail was not captured or the actor cannot see its receipt', () => {
    const f = fixture(); expect(readReceiptMail(f.repo, f.input, new Map())).toBeNull();
    const realCall = f.repo.call; f.repo.call = () => ({ recentReceipts: [] });
    expect(readReceiptMail(f.repo, f.input, f.captured)).toBeNull(); f.repo.call = realCall;
    f.repo.setActive(STUDENT); expect(readReceiptMail(f.repo, f.input, f.captured).to).toBe(STUDENT);
  });
});
