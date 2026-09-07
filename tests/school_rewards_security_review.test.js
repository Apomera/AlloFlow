import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { harness, setup, seededCategory, ADMIN, STAFF, CASHIER, STUDENT } from './helpers/school_rewards_repository.js';

function quotedPrint() {
  const h = harness(), student = setup(h), category = seededCategory(h);
  h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 80, categoryId: category.id, reason: 'Design practice', idempotencyKey: 'review_award_0001' });
  const window = h.call('adminUpsertRewardsWindow', { name: 'Print store', status: 'OPEN' }).window;
  h.setActive(STUDENT);
  const model = h.call('createSchoolRewardsPrintModel', {
    title: 'Practice token', sourceFormat: 'RECIPE',
    recipe: { parts: [{ shape: 'box', size: [1, 1, 1], position: [0, 0, 0], rotation: [0, 0, 0], color: '#64748b' }] },
    widthMm: 20, depthMm: 20, heightMm: 20, triangleCount: 12, idempotencyKey: 'review_model_0001',
  }).model;
  const request = h.call('submitSchoolRewardsPrintRequest', { modelId: model.id, windowId: window.id, idempotencyKey: 'review_request_0001' }).request;
  const quote = { requestId: request.id, action: 'QUOTE', quotePoints: 10, quoteExpiresAt: new Date(Date.now() + 86400000).toISOString(), preflightDecision: 'APPROVED', approvedMaterialId: 'PLA', idempotencyKey: 'review_quote_0001' };
  h.setActive(STAFF);
  const quoted = h.call('reviewSchoolRewardsPrintRequest', quote).request;
  return { h, student, model, quote, quoted };
}

describe('School Rewards security review', () => {
  it.each([{ quotePoints: 25 }, { approvedMaterialId: 'PETG' }])('rejects confirmation of a changed quote: %j', change => {
    const { h, quote, quoted } = quotedPrint();
    h.call('reviewSchoolRewardsPrintRequest', { ...quote, ...change, idempotencyKey: 'review_quote_0002' });
    h.setActive(STUDENT);
    expect(() => h.call('confirmSchoolRewardsPrintQuote', { requestId: quoted.id, quoteToken: quoted.quoteToken, idempotencyKey: 'review_confirm_0001' })).toThrow(/quote has changed/i);
    expect(h.rows('PointHolds')).toHaveLength(1);
    expect(h.call('getSchoolRewardsPrintBootstrap').balance.availableBalance).toBe(80);
  });

  it('requires the reviewed quote token and accepts the current quote only once', () => {
    const { h, quoted } = quotedPrint();
    expect(quoted.quoteToken).toMatch(/^q1_[A-Za-z0-9_-]+$/);
    h.setActive(STUDENT);
    expect(() => h.call('confirmSchoolRewardsPrintQuote', { requestId: quoted.id, idempotencyKey: 'review_confirm_missing' })).toThrow(/refresh.*quote/i);
    const input = { requestId: quoted.id, quoteToken: quoted.quoteToken, idempotencyKey: 'review_confirm_valid' };
    const first = h.call('confirmSchoolRewardsPrintQuote', input);
    expect(h.call('confirmSchoolRewardsPrintQuote', input)).toEqual(first);
    expect(first).toMatchObject({ reservedPoints: 10, availableBalance: 70 });
    expect(h.rows('PointHolds')).toHaveLength(2);
  });
});

function uploadedAsset() {
  const h = harness(); setup(h); h.setActive(STUDENT);
  const bytes = Buffer.from(`solid token
facet normal 0 0 1
outer loop
vertex 0 0 0
vertex 1 0 0
vertex 0 1 0
endloop
endfacet
endsolid token`);
  const contentHash = createHash('sha256').update(bytes).digest('hex');
  const model = h.call('createSchoolRewardsPrintModel', { title: 'Review token', sourceFormat: 'STL', contentHash, byteSize: bytes.length, widthMm: 1, depthMm: 1, heightMm: 1, triangleCount: 1, unitDeclaration: 'MM_CONFIRMED', idempotencyKey: 'review_asset_model01' }).model;
  const asset = h.call('uploadSchoolRewardsPrintAsset', { modelId: model.id, fileName: 'student-private.stl', mimeType: 'model/stl', contentHash, base64: bytes.toString('base64'), idempotencyKey: 'review_asset_upload01' }).asset;
  return { h, bytes, model, asset };
}

describe('private school storage and transaction boundaries', () => {
  it.each(['sharing', 'editors', 'verify'])('fails setup closed when Drive privacy cannot be established: %s', stage => {
    const h = harness(); h.setPrivacyFailure(stage);
    expect(() => setup(h)).toThrow(/Private school storage/);
    expect(h.getProperty('SR_SETUP_STATE')).not.toBe('ready');
  });

  it('refuses new print files in a folder with an explicit viewer', () => {
    const { h, model } = quotedPrint(), count = h.fileCount();
    h.folderById(h.getProperty('SR_PRINT_FOLDER_ID')).viewers = ['viewer@school.example'];
    h.setActive(STUDENT);
    expect(() => h.call('createSchoolRewardsPrintModel', { title: 'New version', sourceFormat: 'RECIPE', previousVersionId: model.id, recipe: { parts: [{ shape: 'box', size: [1, 1, 1], position: [0, 0, 0], rotation: [0, 0, 0], color: '#64748b' }] }, widthMm: 20, depthMm: 20, heightMm: 20, triangleCount: 12, idempotencyKey: 'review_shared_folder' })).toThrow(/Private school storage/);
    expect(h.fileCount()).toBe(count);
  });

  it('downloads exact model bytes for staff while denying students and cashiers', () => {
    const { h, bytes, asset } = uploadedAsset();
    for (const email of [STUDENT, CASHIER]) {
      h.setActive(email);
      expect(() => h.call('getSchoolRewardsPrintAssetForReview', { assetId: asset.id })).toThrow(/role cannot/i);
    }
    h.setActive(STAFF);
    const out = h.call('getSchoolRewardsPrintAssetForReview', { assetId: asset.id });
    expect(Buffer.from(out.base64, 'base64url')).toEqual(bytes);
    expect(out.fileName).toBe('school-print-model.stl');
    expect(JSON.stringify(out)).not.toMatch(/driveFileId|student-private/);
  });

  it.each(['download', 'verify'])('rejects modified stored bytes before %s', action => {
    const { h, asset } = uploadedAsset();
    const file = h.fileByName(asset.id + '-student-private.stl');
    file.content[10] ^= 1;
    h.setActive(STAFF);
    expect(() => action === 'download'
      ? h.call('getSchoolRewardsPrintAssetForReview', { assetId: asset.id })
      : h.call('reviewSchoolRewardsPrintAsset', { assetId: asset.id, action: 'VERIFY', reason: 'Reviewed offline with original bytes', idempotencyKey: 'review_verify_tampered' })).toThrow(/SHA-256/);
    expect(h.call('getSchoolRewardsPrintBootstrap').assets[0].status).toBe('PENDING_REVIEW');
  });

  it('blocks redaction and year rollover while an award is awaiting recovery', () => {
    const h = harness(), student = setup(h), category = seededCategory(h);
    const award = { studentId: student.id, amount: 10, categoryId: category.id, reason: 'Recognition pending recovery', idempotencyKey: 'review_pending_award' };
    h.setCoreFault('award:after_intent');
    expect(() => h.call('awardSchoolRewardsPoints', award)).toThrow(/Injected/);
    const ledger = h.rows('Ledger'), students = h.rows('Students');
    expect(() => h.call('redactSchoolRewardsStudent', { studentId: student.id, reason: 'Records request review', confirm: true })).toThrow(/previous rewards transaction/);
    expect(() => h.call('startSchoolRewardsAcademicYear', { academicYear: '2027-28', confirm: true })).toThrow(/previous rewards transaction/);
    expect(h.rows('Ledger')).toEqual(ledger); expect(h.rows('Students')).toEqual(students);
    h.clearCoreFault();
    expect(h.call('awardSchoolRewardsPoints', award).ok).toBe(true);
  });

  it('does not consume a reservation belonging to another print request', () => {
    const { h, quoted } = quotedPrint(); h.setActive(STUDENT);
    h.call('confirmSchoolRewardsPrintQuote', { requestId: quoted.id, quoteToken: quoted.quoteToken, idempotencyKey: 'review_hold_confirm' });
    h.setActive(STAFF);
    for (const action of ['QUEUE', 'START_PRINT', 'MARK_READY']) h.call('advanceSchoolRewardsPrintRequest', { requestId: quoted.id, action, idempotencyKey: 'review_advance_' + action });
    h.setDataCell('PointHolds', 0, 3, 'other-print-request');
    const ledger = h.rows('Ledger');
    expect(() => h.call('fulfillSchoolRewardsPrintRequest', { requestId: quoted.id, idempotencyKey: 'review_hold_fulfill' })).toThrow(/reservation does not reconcile/);
    expect(h.rows('Ledger')).toEqual(ledger);
  });
});
