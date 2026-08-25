import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(process.cwd());
const SOURCE = fs.readFileSync(path.join(ROOT, 'apps_script/school_rewards/Code.gs'), 'utf8');
const DOMAIN = 'school.example';
const ADMIN = `admin@${DOMAIN}`;
const STAFF = `teacher@${DOMAIN}`;
const CASHIER = `store@${DOMAIN}`;
const STUDENT = `avery@${DOMAIN}`;

function harness() {
  let activeEmail = ADMIN;
  let nextId = 1;
  const properties = new Map();
  const books = new Map();
  const files = new Map();
  const folders = new Map();
  const mail = [];
  const uuid = prefix => `${prefix}-${String(nextId++).padStart(12, '0')}`;
  class Range {
    constructor(sheet, row, col, rowCount = 1, colCount = 1) { Object.assign(this, { sheet, row, col, rowCount, colCount }); }
    getValues() { return Array.from({ length: this.rowCount }, (_, r) => Array.from({ length: this.colCount }, (_, c) => (this.sheet.data[this.row - 1 + r] || [])[this.col - 1 + c] ?? '')); }
    setValues(values) { values.forEach((valuesRow, r) => { const index = this.row - 1 + r; this.sheet.data[index] ||= []; valuesRow.forEach((value, c) => { this.sheet.data[index][this.col - 1 + c] = value; }); }); return this; }
  }
  class Sheet {
    constructor(name) { this.name = name; this.data = []; this.maxColumns = 26; }
    setName(name) { this.name = name; return this; }
    getLastRow() { for (let i = this.data.length - 1; i >= 0; i -= 1) if ((this.data[i] || []).some(value => value !== '' && value != null)) return i + 1; return 0; }
    getRange(row, col, rowCount = 1, colCount = 1) { if (col + colCount - 1 > this.maxColumns) throw new Error('Range exceeds grid limits'); return new Range(this, row, col, rowCount, colCount); }
    getMaxColumns() { return this.maxColumns; }
    insertColumnsAfter(after, count) { if (after !== this.maxColumns || count < 1) throw new Error('Invalid column expansion'); this.maxColumns += count; return this; }
    appendRow(row) { if (row.length > this.maxColumns) throw new Error('Row exceeds grid limits'); this.data[this.getLastRow()] = [...row]; return this; }
    clearContents() { this.data = []; return this; }
    setFrozenRows() { return this; }
  }
  class Book {
    constructor(id) { this.id = id; this.sheets = [new Sheet('Sheet1')]; }
    getId() { return this.id; }
    getSheets() { return this.sheets; }
    getSheetByName(name) { return this.sheets.find(sheet => sheet.name === name) || null; }
    insertSheet(name) { const sheet = new Sheet(name); this.sheets.push(sheet); return sheet; }
  }
  class Blob {
    constructor(content = '', mimeType = '', name = '') { this.data = Buffer.isBuffer(content) ? Buffer.from(content) : Array.isArray(content) ? Buffer.from(content.map(value => (Number(value) + 256) % 256)) : Buffer.from(String(content)); this.mimeType = mimeType; this.name = name; }
    getBytes() { return [...this.data]; }
    getDataAsString() { return this.data.toString('utf8'); }
    getName() { return this.name; }
    getContentType() { return this.mimeType; }
  }
  class File {
    constructor(id, name = '', content = '', mimeType = '') { Object.assign(this, { id, name, content: Buffer.isBuffer(content) ? Buffer.from(content) : Buffer.from(String(content)), mimeType }); }
    getId() { return this.id; }
    getBlob() { return new Blob(this.content, this.mimeType, this.name); }
    moveTo() { return this; }
    setSharing() { return this; }
    setShareableByEditors() { return this; }
  }
  class Folder extends File {
    createFolder(name) { const folder = new Folder(uuid('folder'), name); folders.set(folder.id, folder); return folder; }
    createFile(nameOrBlob, content, mimeType) { const blob = nameOrBlob instanceof Blob ? nameOrBlob : new Blob(content, mimeType, nameOrBlob); const file = new File(uuid('file'), blob.getName(), blob.data, blob.getContentType()); files.set(file.id, file); return file; }
  }
  const props = {
    getProperty: key => properties.get(key) ?? null,
    setProperty: (key, value) => { properties.set(key, String(value)); return props; },
    setProperties: values => { Object.entries(values).forEach(([key, value]) => properties.set(key, String(value))); return props; },
  };
  const output = content => { const result = { content: String(content), setMimeType: () => result, setTitle: () => result, getContent: () => result.content }; return result; };
  const services = {
    Date,
    Session: { getActiveUser: () => ({ getEmail: () => activeEmail }), getEffectiveUser: () => ({ getEmail: () => ADMIN }) },
    PropertiesService: { getScriptProperties: () => props },
    SpreadsheetApp: {
      create: () => { const id = uuid('spreadsheet'); const book = new Book(id); books.set(id, book); files.set(id, new File(id)); return book; },
      openById: id => { if (!books.has(id)) throw new Error('Missing book'); return books.get(id); },
    },
    DriveApp: {
      Access: { PRIVATE: 'PRIVATE' }, Permission: { NONE: 'NONE' },
      createFolder: () => { const folder = new Folder(uuid('folder')); folders.set(folder.id, folder); return folder; },
      getFolderById: id => { if (!folders.has(id)) throw new Error('Missing folder'); return folders.get(id); },
      getFileById: id => files.get(id),
    },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF_8' },
      getUuid: () => uuid('entity'),
      computeDigest: (_algorithm, value) => [...createHash('sha256').update(Array.isArray(value) ? Buffer.from(value.map(byte => (Number(byte) + 256) % 256)) : String(value)).digest()],
      base64EncodeWebSafe: bytes => Buffer.from(bytes).toString('base64url'),
      base64Decode: value => [...Buffer.from(String(value), 'base64')],
      base64DecodeWebSafe: value => [...Buffer.from(String(value), 'base64url')],
      newBlob: (bytes, mimeType, name) => new Blob(bytes, mimeType, name),
    },
    MailApp: { getRemainingDailyQuota: () => 100, sendEmail: value => mail.push(structuredClone(value)) },
    ScriptApp: {
      WeekDay: { MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5 },
      getProjectTriggers: () => [], deleteTrigger() {},
      newTrigger: () => { const chain = { timeBased: () => chain, onWeekDay: () => chain, atHour: () => chain, everyWeeks: () => chain, create: () => ({}) }; return chain; },
    },
    ContentService: { MimeType: { JSON: 'JSON' }, createTextOutput: output },
    HtmlService: { createHtmlOutput: output, createHtmlOutputFromFile: () => output('<portal>'), createTemplateFromFile: () => ({ evaluate: () => output('<index>') }) },
    console: { log() {}, warn() {}, error() {} },
  };
  const context = vm.createContext(services);
  new vm.Script(SOURCE, { filename: 'apps_script/school_rewards/Code.gs' }).runInContext(context);
  function call(name, argument) {
    context.__arg = argument === undefined ? undefined : JSON.stringify(argument);
    const expression = argument === undefined ? `${name}()` : `${name}(JSON.parse(__arg))`;
    return JSON.parse(JSON.stringify(vm.runInContext(expression, context)));
  }
  function rows(name) { const book = books.get(properties.get('SR_SPREADSHEET_ID')); return book.getSheetByName(name).data.map(row => [...row]); }
  function maxColumns(name) { const book = books.get(properties.get('SR_SPREADSHEET_ID')); return book.getSheetByName(name).getMaxColumns(); }
  function simulateV3PrintRequests() { const book = books.get(properties.get('SR_SPREADSHEET_ID')); const sheet = book.getSheetByName('PrintRequests'); sheet.data[0] = sheet.data[0].slice(0, 31); sheet.maxColumns = 31; }
  return { call, rows, maxColumns, simulateV3PrintRequests, mail, setActive: email => { activeEmail = email; } };
}

function setup(h) {
  h.call('setupSchoolRewardsRepository', {
    allowedDomain: DOMAIN,
    schoolName: 'Pilot School',
    members: [
      { email: STAFF, displayName: 'Teacher', role: 'staff' },
      { email: CASHIER, displayName: 'Store Team', role: 'cashier' },
    ],
    students: [{ firstName: 'Avery', lastInitial: 'R', grade: '5', homeroom: '5A', email: STUDENT }],
  });
  return h.call('getSchoolRewardsBootstrap').students[0];
}

describe('School Rewards Apps Script repository', () => {
  it('uses managed identity and role checks instead of client-supplied actors', () => {
    const h = harness(); setup(h);
    h.setActive(`outsider@${DOMAIN}`);
    expect(() => h.call('getSchoolRewardsBootstrap')).toThrow(/not an active School Rewards member/i);
    h.setActive(CASHIER);
    expect(() => h.call('awardSchoolRewardsPoints', { studentId: 'entity-000000000001', amount: 5, reason: 'Kindness', idempotencyKey: 'award_role_01' })).toThrow(/role cannot perform/i);
    const cashierView = h.call('getSchoolRewardsBootstrap');
    expect(cashierView.students[0]).not.toHaveProperty('email');
    expect(cashierView.recentLedger).toEqual([]);
  });

  it('records an award once when the same request is retried', () => {
    const h = harness(); const student = setup(h); h.setActive(STAFF);
    const request = { studentId: student.id, amount: 25, reason: 'Helped a classmate', idempotencyKey: 'award_retry_01' };
    const first = h.call('awardSchoolRewardsPoints', request);
    const second = h.call('awardSchoolRewardsPoints', request);
    expect(first.entry.id).toBe(second.entry.id);
    expect(second.balance).toBe(25);
    expect(h.rows('Ledger')).toHaveLength(2);
    h.setActive(ADMIN);
    const corrected = h.call('reverseSchoolRewardsEntry', { entryId: first.entry.id, reason: 'Duplicate staff entry', idempotencyKey: 'reverse_award_01' });
    expect(corrected.balance).toBe(0);
    expect(h.rows('Balances')[1].slice(1, 4)).toEqual([0, 0, 0]);
  });

  it('checks live balance and inventory atomically at cashier checkout', () => {
    const h = harness(); const student = setup(h);
    h.setActive(STAFF); h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 25, reason: 'Recognition', idempotencyKey: 'award_checkout_01' });
    h.setActive(ADMIN);
    const prize = h.call('adminUpsertRewardsCatalogItem', { name: 'Notebook', cost: 10, inventoryLimit: 5, description: 'School notebook' }).item;
    const windowItem = h.call('adminUpsertRewardsWindow', { name: 'Trimester 1', status: 'OPEN' }).window;
    h.setActive(CASHIER);
    const request = { studentId: student.id, windowId: windowItem.id, lines: [{ catalogId: prize.id, quantity: 2 }], idempotencyKey: 'checkout_retry_01' };
    const first = h.call('checkoutSchoolRewardsOrder', request);
    const retry = h.call('checkoutSchoolRewardsOrder', request);
    expect(first.balance).toBe(5);
    expect(retry.order.id).toBe(first.order.id);
    expect(h.rows('Orders')).toHaveLength(2);
    expect(h.rows('Catalog')[1][5]).toBe(3);
    expect(() => h.call('checkoutSchoolRewardsOrder', { ...request, idempotencyKey: 'checkout_no_funds_02' })).toThrow(/enough points/i);
  });

  it('emails only the student total and current prize preview', () => {
    const h = harness(); const student = setup(h);
    h.setActive(STAFF); h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 12, reason: 'Private staff reason', idempotencyKey: 'award_email_01' });
    h.setActive(ADMIN);
    h.call('adminUpsertRewardsCatalogItem', { name: 'Art Kit', cost: 10, inventoryLimit: -1, description: 'Markers and paper' });
    h.call('adminUpsertRewardsWindow', { name: 'Trimester 1', status: 'PREVIEW' });
    const result = h.call('sendSchoolRewardsBalanceStatements', { periodKey: '2026-t1-week1', limit: 100 });
    expect(result.sent).toBe(1);
    expect(h.mail[0].to).toBe(STUDENT);
    expect(h.mail[0].htmlBody).toContain('12 points');
    expect(h.mail[0].htmlBody).toContain('Art Kit');
    expect(h.mail[0].htmlBody).not.toContain('Private staff reason');
    expect(h.call('verifySchoolRewardsAuditChain')).toMatchObject({ ok: true });
  });

  it('lets a rostered student see only their own categorized growth and reasons', () => {
    const h = harness(); const student = setup(h);
    const category = h.call('getSchoolRewardsBootstrap').categories[0];
    h.setActive(STAFF);
    h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 18, categoryId: category.id, reason: 'Revised a design after testing', idempotencyKey: 'award_growth_01' });
    h.setActive(ADMIN);
    h.call('adminUpsertRewardsCatalogItem', { name: 'Model print', cost: 12, inventoryLimit: 4, description: 'Approved student model' });
    h.call('adminUpsertRewardsWindow', { name: 'Trimester preview', status: 'PREVIEW' });
    h.setActive(STUDENT);
    const view = h.call('getSchoolRewardsBootstrap');
    expect(view.actor).toMatchObject({ role: 'student', studentId: student.id });
    expect(view.students).toHaveLength(1);
    expect(view.students[0]).not.toHaveProperty('email');
    expect(view.recentLedger[0]).toMatchObject({ reason: 'Revised a design after testing', categoryId: category.id });
    expect(view.recentLedger[0]).not.toHaveProperty('actorEmail');
    expect(view.progress.find(item => item.categoryId === category.id)).toMatchObject({ points: 18, level: 0 });
    expect(view).not.toHaveProperty('members');
    expect(view.catalog[0].name).toBe('Model print');
  });

  it('keeps a purchase and full refund reconciled and records both receipts', () => {
    const h = harness(); const student = setup(h);
    h.setActive(STAFF);
    h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 30, reason: 'Recognition', idempotencyKey: 'award_refund_01' });
    h.setActive(ADMIN);
    const prize = h.call('adminUpsertRewardsCatalogItem', { name: 'Notebook', cost: 10, inventoryLimit: 5, description: 'School notebook' }).item;
    const windowItem = h.call('adminUpsertRewardsWindow', { name: 'Trimester 1', status: 'OPEN' }).window;
    h.setActive(CASHIER);
    const checkout = h.call('checkoutSchoolRewardsOrder', { studentId: student.id, windowId: windowItem.id, lines: [{ catalogId: prize.id, quantity: 2 }], idempotencyKey: 'checkout_refund_01' });
    expect(checkout).toMatchObject({ balance: 10, receipt: { status: 'SENT', kind: 'PURCHASE' } });
    expect(h.mail.at(-1).body).toContain('2 x Notebook');
    h.setActive(ADMIN);
    const refund = h.call('refundSchoolRewardsOrder', { orderId: checkout.order.id, reason: 'Item unavailable', idempotencyKey: 'refund_order_01' });
    expect(refund).toMatchObject({ balance: 30, restoredPoints: 20, receipt: { status: 'SENT', kind: 'REFUND' } });
    expect(h.rows('Catalog')[1][5]).toBe(5);
    expect(h.rows('Orders')[1][4]).toBe('REFUNDED');
    expect(h.rows('Receipts')).toHaveLength(3);
    const report = h.call('getSchoolRewardsReconciliation', { windowId: windowItem.id });
    expect(report).toMatchObject({ orders: 1, completedOrders: 0, refundedOrders: 1, netPointsSpent: 0, refundedPoints: 20, pointsOutstanding: 30 });
    expect(report.audit.ok).toBe(true);
  });

  it('validates a bulk roster before committing the batch', () => {
    const h = harness(); setup(h);
    const result = h.call('adminBulkUpsertRewardsStudents', [
      { firstName: 'Jordan', lastInitial: 'K', grade: '6', homeroom: '6B', email: `jordan@${DOMAIN}` },
      { firstName: 'Morgan', lastInitial: 'T', grade: '6', homeroom: '6B', email: `morgan@${DOMAIN}` },
    ]);
    expect(result.imported).toBe(2);
    expect(h.rows('Students')).toHaveLength(4);
    expect(() => h.call('adminBulkUpsertRewardsStudents', [
      { firstName: 'Duplicate', email: `same@${DOMAIN}` },
      { firstName: 'Duplicate Again', email: `same@${DOMAIN}` },
    ])).toThrow(/duplicate student email/i);
    expect(h.rows('Students')).toHaveLength(4);
  });

  it('registers private recipe models while keeping GLB/STL as metadata-only handoffs', () => {
    const h = harness(); const student = setup(h); h.setActive(STUDENT);
    const recipeInput = {
      title: 'Bridge prototype', description: 'A small test bridge', sourceFormat: 'RECIPE',
      recipe: { name: 'Bridge', parts: [{ shape: 'box', size: [1.2, 0.2, 0.5], position: [0, 0.1, 0], rotation: [0, 0, 0], color: '#2563eb' }] },
      widthMm: 60, depthMm: 25, heightMm: 12, triangleCount: 12, unitDeclaration: '1 recipe unit = 50 mm', aiUse: 'ASSISTED', aiDisclosure: 'AI suggested the first primitive.',
      idempotencyKey: 'print_model_recipe_01',
    };
    const first = h.call('createSchoolRewardsPrintModel', recipeInput);
    const retry = h.call('createSchoolRewardsPrintModel', recipeInput);
    expect(retry.model.id).toBe(first.model.id);
    expect(first.model).toMatchObject({ sourceFormat: 'RECIPE', assetStatus: 'READY', publicationStatus: 'PRIVATE', unitDeclaration: '1 recipe unit = 50 mm' });
    expect(first.model).not.toHaveProperty('originalFileId');
    expect(h.rows('PrintModels')).toHaveLength(2);
    expect(() => h.call('createSchoolRewardsPrintModel', { ...recipeInput, title: 'Changed title' })).toThrow(/request key was already used/i);

    const glb = h.call('createSchoolRewardsPrintModel', {
      title: 'Minecraft structure', sourceFormat: 'GLB', contentHash: 'a'.repeat(64), byteSize: 2048,
      widthMm: 80, depthMm: 80, heightMm: 45, triangleCount: 500, unitDeclaration: 'GLB_METERS',
      idempotencyKey: 'print_model_glb_0001',
    }).model;
    expect(glb).toMatchObject({ sourceFormat: 'GLB', assetStatus: 'HANDOFF_REQUIRED', clientPreflightStatus: 'HANDOFF_REQUIRED' });
    const ownView = h.call('getSchoolRewardsPrintBootstrap');
    expect(ownView.models).toHaveLength(2);
    expect(ownView.models[0]).not.toHaveProperty('ownerStudentId');
    expect(ownView.models[0]).not.toHaveProperty('originalFileId');
    h.setActive(STAFF);
    const staffView = h.call('getSchoolRewardsPrintBootstrap');
    expect(staffView.models.find(model => model.id === first.model.id)).toMatchObject({ ownerStudentId: student.id });
    expect(staffView.models[0]).not.toHaveProperty('originalFileId');
    h.setActive(CASHIER);
    expect(() => h.call('getSchoolRewardsPrintBootstrap')).toThrow(/cannot access Print Lab/i);
  });

  it('reserves available points, fulfills one print spend, and refunds it once', () => {
    const h = harness(); const student = setup(h);
    h.setActive(STAFF);
    const award = h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 40, reason: 'Design iteration', idempotencyKey: 'award_print_flow_01' });
    h.setActive(ADMIN);
    const windowItem = h.call('adminUpsertRewardsWindow', { name: 'Trimester Print Store', status: 'OPEN' }).window;
    const expensive = h.call('adminUpsertRewardsCatalogItem', { name: 'Large prize', cost: 30, inventoryLimit: -1 }).item;
    h.setActive(STUDENT);
    const model = h.call('createSchoolRewardsPrintModel', {
      title: 'Gear stand', sourceFormat: 'RECIPE',
      recipe: { parts: [{ shape: 'cylinder', size: [0.5, 1], position: [0, 0.5, 0], rotation: [0, 0, 0], color: '#0f766e' }] },
      widthMm: 35, depthMm: 35, heightMm: 50, triangleCount: 96, aiUse: 'NONE', idempotencyKey: 'print_model_flow_001',
    }).model;
    const submitted = h.call('submitSchoolRewardsPrintRequest', { modelId: model.id, windowId: windowItem.id, requestedMaterialId: 'PLA', studentNote: 'For science class', idempotencyKey: 'print_submit_flow_01' }).request;
    h.setActive(STAFF);
    const quoted = h.call('reviewSchoolRewardsPrintRequest', {
      requestId: submitted.id, action: 'QUOTE', quotePoints: 15,
      quoteExpiresAt: new Date(Date.now() + 86400000).toISOString(), approvedMaterialId: 'PLA', printerProfileId: 'printer-01',
      estimatedGrams: 18, estimatedMinutes: 70, preflightDecision: 'APPROVED', preflightSummary: 'Fits the configured bed.', idempotencyKey: 'print_quote_flow_001',
    }).request;
    expect(quoted.status).toBe('QUOTED');
    h.setActive(STUDENT);
    const confirmation = { requestId: submitted.id, idempotencyKey: 'print_confirm_flow1' };
    const reserved = h.call('confirmSchoolRewardsPrintQuote', confirmation);
    const reservedRetry = h.call('confirmSchoolRewardsPrintQuote', confirmation);
    expect(reserved).toMatchObject({ balance: 40, reservedPoints: 15, availableBalance: 25, request: { status: 'RESERVED' }, hold: { status: 'ACTIVE', amount: 15 } });
    expect(reservedRetry.hold.id).toBe(reserved.hold.id);
    expect(h.rows('PointHolds')).toHaveLength(2);
    const studentView = h.call('getSchoolRewardsBootstrap');
    expect(studentView.students[0]).toMatchObject({ balance: 40, reservedPoints: 15, availableBalance: 25 });

    h.setActive(CASHIER);
    expect(() => h.call('checkoutSchoolRewardsOrder', { studentId: student.id, windowId: windowItem.id, lines: [{ catalogId: expensive.id, quantity: 1 }], idempotencyKey: 'checkout_held_points1' })).toThrow(/enough points/i);
    h.setActive(ADMIN);
    expect(() => h.call('reverseSchoolRewardsEntry', { entryId: award.entry.id, reason: 'Correction', idempotencyKey: 'reverse_reserved_01' })).toThrow(/reserved/i);

    h.setActive(STAFF);
    h.call('advanceSchoolRewardsPrintRequest', { requestId: submitted.id, action: 'QUEUE', idempotencyKey: 'print_queue_flow_001' });
    h.call('advanceSchoolRewardsPrintRequest', { requestId: submitted.id, action: 'START_PRINT', idempotencyKey: 'print_start_flow_001' });
    h.call('advanceSchoolRewardsPrintRequest', { requestId: submitted.id, action: 'MARK_READY', idempotencyKey: 'print_ready_flow_001' });
    const fulfillment = { requestId: submitted.id, idempotencyKey: 'print_fulfill_flow1' };
    const fulfilled = h.call('fulfillSchoolRewardsPrintRequest', fulfillment);
    const fulfilledRetry = h.call('fulfillSchoolRewardsPrintRequest', fulfillment);
    expect(fulfilled).toMatchObject({ balance: 25, reservedPoints: 0, availableBalance: 25, request: { status: 'FULFILLED', orderId: submitted.id }, receipt: { status: 'SENT', kind: 'PURCHASE' } });
    expect(fulfilledRetry.ledgerId).toBe(fulfilled.ledgerId);
    expect(h.rows('Ledger')).toHaveLength(3);
    expect(h.rows('Orders')).toHaveLength(2);
    expect(h.rows('OrderLines')).toHaveLength(2);
    expect(h.rows('Receipts')).toHaveLength(2);
    expect(h.mail.at(-1).body).toContain('3D print: Gear stand (v1)');

    h.setActive(ADMIN);
    expect(() => h.call('refundSchoolRewardsOrder', { orderId: submitted.id, reason: 'Wrong workflow', idempotencyKey: 'wrong_print_refund1' })).toThrow(/print-request refund/i);
    const refundInput = { requestId: submitted.id, reason: 'Print could not be delivered', idempotencyKey: 'print_refund_flow_1' };
    const refund = h.call('refundSchoolRewardsPrintRequest', refundInput);
    const refundRetry = h.call('refundSchoolRewardsPrintRequest', refundInput);
    expect(refund).toMatchObject({ restoredPoints: 15, balance: 40, reservedPoints: 0, availableBalance: 40, request: { status: 'REFUNDED' }, receipt: { kind: 'REFUND', status: 'SENT' } });
    expect(refundRetry.ledgerId).toBe(refund.ledgerId);
    expect(h.rows('Ledger')).toHaveLength(4);
    expect(h.rows('Receipts')).toHaveLength(3);
    expect(h.rows('Orders')[1][4]).toBe('REFUNDED');
  });

  it('releases a confirmed print reservation on student cancellation without spending', () => {
    const h = harness(); const student = setup(h);
    h.setActive(STAFF); h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 20, reason: 'Recognition', idempotencyKey: 'award_cancel_print1' });
    h.setActive(ADMIN); const windowItem = h.call('adminUpsertRewardsWindow', { name: 'Print window', status: 'OPEN' }).window;
    h.setActive(STUDENT);
    const model = h.call('createSchoolRewardsPrintModel', { title: 'Name tag', sourceFormat: 'RECIPE', recipe: { parts: [{ shape: 'box', size: [1, 0.2, 0.4], position: [0, 0, 0], rotation: [0, 0, 0], color: '#7c3aed' }] }, widthMm: 45, depthMm: 18, heightMm: 4, triangleCount: 12, idempotencyKey: 'print_model_cancel01' }).model;
    const item = h.call('submitSchoolRewardsPrintRequest', { modelId: model.id, windowId: windowItem.id, idempotencyKey: 'print_submit_cancel1' }).request;
    h.setActive(STAFF); h.call('reviewSchoolRewardsPrintRequest', { requestId: item.id, action: 'QUOTE', quotePoints: 10, quoteExpiresAt: new Date(Date.now() + 86400000).toISOString(), preflightDecision: 'APPROVED', idempotencyKey: 'print_quote_cancel01' });
    h.setActive(STUDENT); h.call('confirmSchoolRewardsPrintQuote', { requestId: item.id, idempotencyKey: 'print_confirm_cancel' });
    const cancelInput = { requestId: item.id, reason: 'Changed my mind', idempotencyKey: 'print_cancel_request' };
    const cancelled = h.call('cancelSchoolRewardsPrintRequest', cancelInput);
    const retry = h.call('cancelSchoolRewardsPrintRequest', cancelInput);
    expect(cancelled).toMatchObject({ request: { status: 'CANCELLED' }, balance: { balance: 20, reservedPoints: 0, availableBalance: 20 } });
    expect(retry.request.status).toBe('CANCELLED');
    expect(h.rows('PointHolds')[1][5]).toBe('RELEASED');
    expect(h.rows('Ledger')).toHaveLength(2);
  });

  it('does not quote metadata-only imported files before secure asset handoff', () => {
    const h = harness(); const student = setup(h);
    h.setActive(ADMIN); const windowItem = h.call('adminUpsertRewardsWindow', { name: 'Print preview', status: 'PREVIEW' }).window;
    h.setActive(STUDENT);
    const model = h.call('createSchoolRewardsPrintModel', { title: 'Imported castle', sourceFormat: 'STL', contentHash: 'b'.repeat(64), byteSize: 4096, widthMm: 70, depthMm: 70, heightMm: 80, triangleCount: 800, unitDeclaration: 'MM_CONFIRMED', idempotencyKey: 'print_model_stl_0001' }).model;
    const item = h.call('submitSchoolRewardsPrintRequest', { modelId: model.id, windowId: windowItem.id, idempotencyKey: 'print_submit_stl_01' }).request;
    h.setActive(STAFF);
    expect(() => h.call('reviewSchoolRewardsPrintRequest', { requestId: item.id, action: 'QUOTE', quotePoints: 20, quoteExpiresAt: new Date(Date.now() + 86400000).toISOString(), preflightDecision: 'APPROVED', idempotencyKey: 'print_quote_stl_001' })).toThrow(/school-managed printable asset/i);
  });

  it('expands real sheet grids and additively migrates the v3 request header', () => {
    const h = harness(); setup(h);
    expect(h.maxColumns('PrintModels')).toBeGreaterThanOrEqual(31);
    expect(h.maxColumns('PrintRequests')).toBeGreaterThanOrEqual(32);
    h.simulateV3PrintRequests();
    expect(h.maxColumns('PrintRequests')).toBe(31);
    expect(h.call('migrateSchoolRewardsRepositoryV4')).toMatchObject({ ok: true, version: 4 });
    expect(h.maxColumns('PrintRequests')).toBe(32);
    expect(h.rows('PrintRequests')[0][31]).toBe('PreviousRequestId');
  });

  it('keeps imported bytes private and requires staff verification before readiness', () => {
    const h = harness(); setup(h); h.setActive(STUDENT);
    const bytes = Buffer.alloc(12); bytes.write('glTF', 0, 'ascii'); bytes.writeUInt32LE(2, 4); bytes.writeUInt32LE(bytes.length, 8);
    const contentHash = createHash('sha256').update(bytes).digest('hex');
    const model = h.call('createSchoolRewardsPrintModel', { title: 'Private GLB', sourceFormat: 'GLB', contentHash, byteSize: bytes.length, widthMm: 20, depthMm: 20, heightMm: 20, triangleCount: 0, unitDeclaration: 'GLB_METERS', idempotencyKey: 'v4_asset_model_01' }).model;
    const uploadInput = { modelId: model.id, fileName: 'private-model.glb', mimeType: 'model/gltf-binary', base64: bytes.toString('base64'), contentHash, idempotencyKey: 'v4_asset_upload01' };
    const uploaded = h.call('uploadSchoolRewardsPrintAsset', uploadInput);
    const uploadRetry = h.call('uploadSchoolRewardsPrintAsset', uploadInput);
    expect(uploadRetry.asset.id).toBe(uploaded.asset.id);
    expect(uploaded).toMatchObject({ asset: { status: 'PENDING_REVIEW', byteSize: 12 }, model: { assetStatus: 'PENDING_REVIEW' } });
    expect(JSON.stringify(uploaded)).not.toContain(uploadInput.base64);
    expect(JSON.stringify(uploaded)).not.toMatch(/driveFileId|printableFileId|originalFileId|file-\d/);
    expect(h.rows('PrintAssets')).toHaveLength(2);
    h.setActive(STAFF);
    const verified = h.call('reviewSchoolRewardsPrintAsset', { assetId: uploaded.asset.id, action: 'VERIFY', reason: 'Container reviewed.', idempotencyKey: 'v4_asset_verify01' });
    expect(verified).toMatchObject({ asset: { status: 'VERIFIED' }, model: { assetStatus: 'READY' } });
    expect(JSON.stringify(verified)).not.toMatch(/driveFileId|printableFileId|originalFileId|file-\d/);
    h.setActive(STUDENT);
    expect(() => h.call('uploadSchoolRewardsPrintAsset', { ...uploadInput, idempotencyKey: 'v4_asset_wronghash', contentHash: 'f'.repeat(64) })).toThrow(/hash/i);
  });

  it('keeps immutable request lineage and moderates publication, reporting, and recipe remixing', () => {
    const h = harness(); setup(h);
    h.setActive(ADMIN); const windowItem = h.call('adminUpsertRewardsWindow', { name: 'Revision window', status: 'PREVIEW' }).window;
    h.setActive(STUDENT);
    const base = { sourceFormat: 'RECIPE', recipe: { parts: [{ shape: 'box', size: [1, 0.2, 0.4], position: [0, 0, 0], rotation: [0, 0, 0], color: '#2563eb' }] }, widthMm: 50, depthMm: 20, heightMm: 10, triangleCount: 12 };
    const v1 = h.call('createSchoolRewardsPrintModel', { ...base, title: 'Bridge v1', idempotencyKey: 'v4_revision_model1' }).model;
    const first = h.call('submitSchoolRewardsPrintRequest', { modelId: v1.id, windowId: windowItem.id, idempotencyKey: 'v4_revision_submit1' }).request;
    h.setActive(STAFF); h.call('reviewSchoolRewardsPrintRequest', { requestId: first.id, action: 'REQUEST_REVISION', reason: 'Make the base wider.', idempotencyKey: 'v4_revision_review1' });
    h.setActive(STUDENT);
    const v2 = h.call('createSchoolRewardsPrintModel', { ...base, title: 'Bridge v2', previousVersionId: v1.id, widthMm: 60, idempotencyKey: 'v4_revision_model2' }).model;
    const revised = h.call('resubmitSchoolRewardsPrintRequest', { requestId: first.id, modelId: v2.id, windowId: windowItem.id, requestedMaterialId: 'PLA', studentNote: 'Wider base added.', idempotencyKey: 'v4_revision_submit2' });
    expect(revised).toMatchObject({ previousRequest: { status: 'SUPERSEDED' }, request: { status: 'SUBMITTED', previousRequestId: first.id, revisionNumber: 2 } });
    const publication = h.call('submitSchoolRewardsPrintPublication', { modelId: v2.id, catalogTitle: 'Bridge challenge', catalogDescription: 'A remixable bridge.', creatorLabel: 'Grade 5 designer', reusePolicy: 'SCHOOL_REMIX_PRINT', consent: true, idempotencyKey: 'v4_publish_submit1' }).publication;
    h.setActive(STAFF);
    expect(h.call('reviewSchoolRewardsPrintPublication', { publicationId: publication.id, action: 'APPROVE', idempotencyKey: 'v4_publish_approve1' }).publication.status).toBe('PUBLISHED');
    h.setActive(STUDENT);
    const remix = h.call('remixSchoolRewardsPrintModel', { modelId: v2.id, title: 'My bridge remix', idempotencyKey: 'v4_remix_model001' }).model;
    expect(remix).toMatchObject({ version: 1, remixOfModelId: v2.id, publicationStatus: 'PRIVATE' });
    const reported = h.call('reviewSchoolRewardsPrintPublication', { publicationId: publication.id, action: 'REPORT', reason: 'Needs another safety review.', idempotencyKey: 'v4_publish_report1' });
    expect(reported.publication).toMatchObject({ status: 'REPORTED', reportCount: 1 });
    expect(h.call('getSchoolRewardsPrintBootstrap').communityModels).toHaveLength(0);
  });

  it('protects guardian digest privacy, audits deactivation, and exports only district aggregates', () => {
    const h = harness(); const student = setup(h);
    const guardianInput = { studentId: student.id, guardianEmail: 'guardian@family.example', guardianName: 'Family Member', relationship: 'Guardian', active: true, consentConfirmed: true, idempotencyKey: 'v4_guardian_map01' };
    const guardian = h.call('adminUpsertSchoolRewardsGuardian', guardianInput).guardian;
    h.setActive(STAFF); h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 14, reason: 'Private classroom observation', idempotencyKey: 'v4_guardian_award1' });
    h.setActive(ADMIN);
    const digest = h.call('sendSchoolRewardsGuardianDigests', { periodKey: '2026-t1-positive', limit: 20, idempotencyKey: 'v4_guardian_send01' });
    expect(digest).toMatchObject({ sent: 1, failed: 0 });
    expect(h.mail.at(-1).to).toBe('guardian@family.example');
    expect(h.mail.at(-1).body).toContain('14 points');
    expect(h.mail.at(-1).body).not.toContain('Private classroom observation');
    expect(h.mail.at(-1).body).not.toContain(STUDENT);
    expect(() => h.call('adminUpsertSchoolRewardsGuardian', { ...guardianInput, id: guardian.id, active: false, consentConfirmed: false, idempotencyKey: 'v4_guardian_disable_bad' })).toThrow(/why|explain/i);
    const disabled = h.call('adminUpsertSchoolRewardsGuardian', { ...guardianInput, id: guardian.id, active: false, consentConfirmed: false, deactivationReason: 'Family requested messages stop.', idempotencyKey: 'v4_guardian_disable01' }).guardian;
    expect(disabled).toMatchObject({ active: false, consentConfirmedAt: guardian.consentConfirmedAt });
    expect(h.rows('Audit').at(-1)[4]).toContain('Family requested messages stop.');
    expect(h.rows('Audit').at(-1)[4]).not.toContain('guardian@family.example');
    const afterDisable = h.call('sendSchoolRewardsGuardianDigests', { periodKey: '2026-t1-disabled', limit: 20, idempotencyKey: 'v4_guardian_send02' });
    expect(afterDisable.sent).toBe(0);
    const summary = h.call('getSchoolRewardsDistrictSummary', {});
    expect(summary).toMatchObject({ contractVersion: 'alloflow-district-rewards-summary/1', counts: { activeStudents: 1, consentedGuardianMappings: 0 }, points: { earned: 14, balance: 14 } });
    expect(JSON.stringify(summary)).not.toContain(STUDENT);
    expect(JSON.stringify(summary)).not.toContain(student.id);
    expect(JSON.stringify(summary)).not.toContain('Private classroom observation');
    expect(JSON.stringify(summary)).not.toContain('Family requested messages stop.');
  });

  it('binds SIS apply to previewed content and roster revision while allowing exact retries', () => {
    const h = harness(); setup(h);
    const snapshot = { formatVersion: 'alloflow-sis-roster/1', snapshotId: 'snapshot-2026-t1', students: [
      { firstName: 'Avery', lastInitial: 'R', grade: '5', homeroom: '5A', email: STUDENT },
      { firstName: 'Jordan', lastInitial: 'K', grade: '6', homeroom: '6B', email: `jordan@${DOMAIN}` },
    ] };
    const preview = h.call('previewSchoolRewardsSisSnapshot', snapshot);
    expect(preview).toMatchObject({ counts: { created: 1, unchanged: 1, total: 2 }, deactivationSupported: false });
    expect(() => h.call('applySchoolRewardsSisSnapshot', { ...snapshot, students: [snapshot.students[0], { ...snapshot.students[1], grade: '7' }], expectedContentHash: preview.contentHash, expectedRosterRevision: preview.rosterRevision, idempotencyKey: 'v4_sis_stale_content' })).toThrow(/content no longer matches/i);
    h.call('adminBulkUpsertRewardsStudents', [{ firstName: 'Morgan', lastInitial: 'T', grade: '6', homeroom: '6B', email: `morgan@${DOMAIN}` }]);
    expect(() => h.call('applySchoolRewardsSisSnapshot', { ...snapshot, expectedContentHash: preview.contentHash, expectedRosterRevision: preview.rosterRevision, idempotencyKey: 'v4_sis_stale_roster1' })).toThrow(/roster changed/i);
    const fresh = h.call('previewSchoolRewardsSisSnapshot', snapshot);
    const applyInput = { ...snapshot, expectedContentHash: fresh.contentHash, expectedRosterRevision: fresh.rosterRevision, idempotencyKey: 'v4_sis_apply_001' };
    const applied = h.call('applySchoolRewardsSisSnapshot', applyInput);
    const retry = h.call('applySchoolRewardsSisSnapshot', applyInput);
    expect(retry).toEqual(applied);
    expect(applied).toMatchObject({ applied: 2, deactivated: 0, previousRosterRevision: fresh.rosterRevision });
    expect(h.rows('Students')).toHaveLength(4);
    expect(() => h.call('previewSchoolRewardsSisSnapshot', { ...snapshot, snapshotId: 'snapshot-inactive', students: [{ ...snapshot.students[0], active: false }] })).toThrow(/does not deactivate/i);
  });
});
