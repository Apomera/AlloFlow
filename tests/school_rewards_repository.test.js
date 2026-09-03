import { createHash, createHmac } from 'node:crypto';
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
  let effectiveEmail = ADMIN;
  let mailFailure = '';
  let receiptUpdateFailure = '';
  let mailOutboxUpdateFailure = '';
  let mailQuota = 100;
  let lockHeld = false;
  let flushCount = 0;
  let nextId = 1;
  let nextTriggerId = 1;
  let triggerCreateFailures = 0;
  let triggerDeleteFailures = 0;
  const properties = new Map();
  const books = new Map();
  const files = new Map();
  const folders = new Map();
  const mail = [];
  const mailObservations = [];
  const triggers = [];
  const rangeReads = {};
  const uuid = prefix => `${prefix}-${String(nextId++).padStart(12, '0')}`;
  class Range {
    constructor(sheet, row, col, rowCount = 1, colCount = 1) { Object.assign(this, { sheet, row, col, rowCount, colCount }); }
    getValues() { return Array.from({ length: this.rowCount }, (_, r) => Array.from({ length: this.colCount }, (_, c) => (this.sheet.data[this.row - 1 + r] || [])[this.col - 1 + c] ?? '')); }
    setValues(values) {
      if (receiptUpdateFailure && this.sheet.name === 'Receipts' && this.row > 1) throw new Error(receiptUpdateFailure);
      if (mailOutboxUpdateFailure && this.sheet.name === 'MailOutbox' && this.row > 1) throw new Error(mailOutboxUpdateFailure);
      values.forEach((valuesRow, r) => { const index = this.row - 1 + r; this.sheet.data[index] ||= []; valuesRow.forEach((value, c) => { this.sheet.data[index][this.col - 1 + c] = value; }); }); return this;
    }
  }
  class Sheet {
    constructor(name) { this.name = name; this.data = []; this.maxColumns = 26; }
    setName(name) { this.name = name; return this; }
    getLastRow() { for (let i = this.data.length - 1; i >= 0; i -= 1) if ((this.data[i] || []).some(value => value !== '' && value != null)) return i + 1; return 0; }
    getRange(row, col, rowCount = 1, colCount = 1) { if (col + colCount - 1 > this.maxColumns) throw new Error('Range exceeds grid limits'); rangeReads[this.name] = (rangeReads[this.name] || 0) + 1; return new Range(this, row, col, rowCount, colCount); }
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
    Session: { getActiveUser: () => ({ getEmail: () => activeEmail }), getEffectiveUser: () => ({ getEmail: () => effectiveEmail }) },
    PropertiesService: { getScriptProperties: () => props },
    SpreadsheetApp: {
      create: () => { const id = uuid('spreadsheet'); const book = new Book(id); books.set(id, book); files.set(id, new File(id)); return book; },
      openById: id => { if (!books.has(id)) throw new Error('Missing book'); return books.get(id); },
      flush: () => { flushCount += 1; },
    },
    DriveApp: {
      Access: { PRIVATE: 'PRIVATE' }, Permission: { NONE: 'NONE' },
      createFolder: () => { const folder = new Folder(uuid('folder')); folders.set(folder.id, folder); return folder; },
      getFolderById: id => { if (!folders.has(id)) throw new Error('Missing folder'); return folders.get(id); },
      getFileById: id => files.get(id),
    },
    LockService: { getScriptLock: () => ({ tryLock: () => { lockHeld = true; return true; }, releaseLock() { lockHeld = false; } }) },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF_8' },
      getUuid: () => uuid('entity'),
      computeDigest: (_algorithm, value) => [...createHash('sha256').update(Array.isArray(value) ? Buffer.from(value.map(byte => (Number(byte) + 256) % 256)) : String(value)).digest()],
      computeHmacSha256Signature: (value, key) => [...createHmac('sha256', String(key)).update(String(value)).digest()],
      base64EncodeWebSafe: bytes => Buffer.from(bytes).toString('base64url'),
      base64Decode: value => [...Buffer.from(String(value), 'base64')],
      base64DecodeWebSafe: value => [...Buffer.from(String(value), 'base64url')],
      newBlob: (bytes, mimeType, name) => new Blob(bytes, mimeType, name),
    },
    MailApp: {
      getRemainingDailyQuota: () => mailQuota,
      sendEmail: value => {
        const book = books.get(properties.get('SR_SPREADSHEET_ID'));
        const outbox = book && book.getSheetByName('MailOutbox');
        mailObservations.push({ lockHeld, flushCount, outbox: outbox ? outbox.data.map(row => [...row]) : [], triggers: triggers.map(trigger => ({ ...trigger.spec })) });
        if (mailFailure) throw new Error(mailFailure);
        mail.push(structuredClone(value));
      },
    },
    ScriptApp: {
      WeekDay: { MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5 },
      getProjectTriggers: () => [...triggers],
      deleteTrigger: trigger => { if (triggerDeleteFailures > 0) { triggerDeleteFailures--; throw new Error('Injected trigger delete failure'); } const index = triggers.indexOf(trigger); if (index >= 0) triggers.splice(index, 1); },
      newTrigger: handler => {
        const spec = { handler, uid: `trigger-${String(nextTriggerId++).padStart(6, '0')}`, afterMs: 0, weekday: '', hour: '', everyWeeks: 0, everyHours: 0 };
        const chain = {
          timeBased: () => chain, onWeekDay: value => { spec.weekday = value; return chain; },
          atHour: value => { spec.hour = value; return chain; }, everyWeeks: value => { spec.everyWeeks = value; return chain; },
          everyHours: value => { spec.everyHours = value; return chain; },
          after: value => { spec.afterMs = value; return chain; },
          create: () => { if (triggerCreateFailures > 0) { triggerCreateFailures--; throw new Error('Injected trigger create failure'); } const trigger = { spec, getHandlerFunction: () => handler, getUniqueId: () => spec.uid }; triggers.push(trigger); return trigger; },
        };
        return chain;
      },
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
  function simulateV4Inventory() {
    const book = books.get(properties.get('SR_SPREADSHEET_ID'));
    const catalog = book.getSheetByName('Catalog');
    catalog.data = catalog.data.map(row => row.slice(0, 10));
    book.sheets = book.sheets.filter(sheet => sheet.name !== 'InventoryMovements');
    const config = book.getSheetByName('Config');
    const row = config.data.findIndex(values => values[0] === 'schemaVersion');
    if (row >= 0) config.data[row][1] = '4';
  }
  return {
    call, rows, maxColumns, simulateV3PrintRequests, simulateV4Inventory, mail, mailObservations,
    flushCount: () => flushCount,
    fileCount: () => files.size,
    printLimits: () => ({
      models: context.SR_MAX_PRINT_MODELS_PER_STUDENT,
      assets: context.SR_MAX_PRINT_ASSETS_PER_STUDENT,
      bytes: context.SR_MAX_PRINT_ASSET_BYTES_PER_STUDENT,
      dailyUploads: context.SR_MAX_PRINT_ASSET_UPLOADS_PER_STUDENT_PER_DAY,
    }),
    setActive: email => { activeEmail = email; },
    setEffective: email => { effectiveEmail = email; },
    setMailFailure: message => { mailFailure = String(message || ''); },
    setMailQuota: value => { mailQuota = Number(value); },
    setNow: value => { context.now_ = () => String(value); },
    failNextTriggerCreates: count => { triggerCreateFailures = count == null ? 1 : Number(count); },
    failNextTriggerDeletes: count => { triggerDeleteFailures = count == null ? 1 : Number(count); },
    setMailOutboxUpdateFailure: message => { mailOutboxUpdateFailure = String(message || ''); },
    setReceiptUpdateFailure: message => { receiptUpdateFailure = String(message || ''); },
    triggers: () => triggers.filter(trigger => trigger.getHandlerFunction() !== 'sweepSchoolRewardsMailRuns').map(trigger => ({ ...trigger.spec })),
    allTriggers: () => triggers.map(trigger => ({ ...trigger.spec })),
    removeTrigger: uid => { const index = triggers.findIndex(trigger => trigger.getUniqueId() === uid); if (index >= 0) triggers.splice(index, 1); },
    setProperty: (key, value) => { properties.set(key, String(value)); },
    getProperty: key => properties.get(key),
    setCoreFault: stage => {
      let armed = true;
      context.SR_TEST_FAULT_HOOK = actual => {
        if (armed && actual === stage) { armed = false; throw new Error(`Injected core fault at ${stage}`); }
      };
    },
    clearCoreFault: () => { context.SR_TEST_FAULT_HOOK = null; },
    signCoreJournal: (key, operation, journal) => context.coreJournalSignature_(key, operation, journal.kind, journal.intent, context.coreJournalSecret_(false)),
    resignMailOutbox: dataRowIndex => {
      const delivery = context.mailOutbox_(context.book_())[dataRowIndex];
      const signature = context.mailOutboxSignature_(delivery, context.mailDeliverySecret_(false));
      const book = books.get(properties.get('SR_SPREADSHEET_ID'));
      book.getSheetByName('MailOutbox').data[dataRowIndex + 1][10] = signature;
    },
    installMailWorkerLease: (runId = 'external_worker') => {
      const lease = { token: 'lease_test_external_worker', runId, expiresAt: Date.now() + 300000, signature: '' };
      lease.signature = context.mailWorkerLeaseSignature_(lease, context.mailDeliverySecret_(false));
      properties.set('SR_MAIL_WORKER_LEASE', JSON.stringify(lease));
      return lease;
    },
    clearMailWorkerLease: () => { properties.set('SR_MAIL_WORKER_LEASE', ''); },
    setDataCell: (name, dataRowIndex, columnIndex, value) => {
      const book = books.get(properties.get('SR_SPREADSHEET_ID'));
      const sheet = book.getSheetByName(name);
      sheet.data[dataRowIndex + 1] ||= [];
      sheet.data[dataRowIndex + 1][columnIndex] = value;
    },
    appendRaw: (name, row) => {
      const book = books.get(properties.get('SR_SPREADSHEET_ID'));
      book.getSheetByName(name).appendRow([...row]);
    },
    simulateV5Mail: () => {
      const book = books.get(properties.get('SR_SPREADSHEET_ID'));
      book.sheets = book.sheets.filter(sheet => !['MailRuns', 'MailOutbox'].includes(sheet.name));
      const config = book.getSheetByName('Config');
      const row = config.data.findIndex(values => values[0] === 'schemaVersion');
      if (row >= 0) config.data[row][1] = '5';
    },
    rangeReads: name => rangeReads[name] || 0,
    resetRangeReads: () => { Object.keys(rangeReads).forEach(name => { delete rangeReads[name]; }); },
    configValue: key => {
      const book = books.get(properties.get('SR_SPREADSHEET_ID'));
      const row = book.getSheetByName('Config').data.find(values => values[0] === key);
      return row ? row[1] : undefined;
    },
  };
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

function seededCategory(h) {
  return h.call('getSchoolRewardsBootstrap').categories[0];
}

function printAssetUploadFixture(h, suffix) {
  const student = setup(h); h.setActive(STUDENT);
  const bytes = Buffer.alloc(12); bytes.write('glTF', 0, 'ascii'); bytes.writeUInt32LE(2, 4); bytes.writeUInt32LE(bytes.length, 8);
  const contentHash = createHash('sha256').update(bytes).digest('hex');
  const model = h.call('createSchoolRewardsPrintModel', {
    title: `Private GLB ${suffix}`, sourceFormat: 'GLB', contentHash, byteSize: bytes.length,
    widthMm: 20, depthMm: 20, heightMm: 20, triangleCount: 0, unitDeclaration: 'GLB_METERS',
    idempotencyKey: `quota_asset_model_${suffix}`,
  }).model;
  return {
    student,
    input: {
      modelId: model.id, fileName: `private-${suffix}.glb`, mimeType: 'model/gltf-binary',
      base64: bytes.toString('base64'), contentHash, idempotencyKey: `quota_asset_upload_${suffix}`,
    },
  };
}

describe('School Rewards Apps Script repository', () => {
  it('uses managed identity and role checks instead of client-supplied actors', () => {
    const h = harness(); setup(h);
    h.setActive(`outsider@${DOMAIN}`);
    expect(() => h.call('getSchoolRewardsBootstrap')).toThrow(/not on the School Rewards member list/i);
    h.setActive(CASHIER);
    expect(() => h.call('awardSchoolRewardsPoints', { studentId: 'entity-000000000001', amount: 5, reason: 'Kindness', idempotencyKey: 'award_role_01' })).toThrow(/role cannot perform/i);
    const cashierView = h.call('getSchoolRewardsBootstrap');
    expect(cashierView.students[0]).not.toHaveProperty('email');
    expect(cashierView.recentLedger).toEqual([]);
  });

  it('lets admins revoke access and manage inactive roster records without losing history', () => {
    const h = harness(); const student = setup(h); const category = seededCategory(h);
    h.setActive(STAFF);
    h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 10, categoryId: category.id, reason: 'Recognition before roster change', idempotencyKey: 'award_before_deactivate1' });
    h.setActive(ADMIN);
    h.call('adminUpsertRewardsStudent', { id: student.id, firstName: student.firstName, lastInitial: student.lastInitial, grade: student.grade, homeroom: student.homeroom, email: STUDENT, active: false });
    expect(h.call('getSchoolRewardsBootstrap').students.find(item => item.id === student.id)).toMatchObject({ active: false, balance: 10 });

    h.setActive(STAFF);
    expect(h.call('getSchoolRewardsBootstrap').students).toEqual([]);
    h.setActive(ADMIN);
    h.call('adminUpsertRewardsMember', { email: STAFF, displayName: 'Teacher', role: 'staff', active: false });
    expect(h.call('getSchoolRewardsBootstrap').members.find(member => member.email === STAFF)).toMatchObject({ role: 'staff', active: false });
    h.setActive(STAFF);
    expect(() => h.call('getSchoolRewardsBootstrap')).toThrow(/not on the School Rewards member list/i);

    h.setActive(ADMIN);
    expect(() => h.call('adminUpsertRewardsMember', { email: ADMIN, displayName: 'Administrator', role: 'admin', active: false })).toThrow(/needs at least one active administrator/i);
    expect(h.call('getSchoolRewardsBootstrap').members.find(member => member.email === ADMIN)).toMatchObject({ role: 'admin', active: true });
  });

  it('records an award once when the same request is retried', () => {
    const h = harness(); const student = setup(h); const category = seededCategory(h); h.setActive(STAFF);
    const request = { studentId: student.id, amount: 25, categoryId: category.id, reason: 'Helped a classmate', idempotencyKey: 'award_retry_01' };
    const first = h.call('awardSchoolRewardsPoints', request);
    const second = h.call('awardSchoolRewardsPoints', request);
    expect(first.entry.id).toBe(second.entry.id);
    expect(second.balance).toBe(25);
    expect(() => h.call('awardSchoolRewardsPoints', { ...request, amount: 24 })).toThrow(/already recorded once/i);
    expect(h.rows('Ledger')).toHaveLength(2);
    h.setActive(ADMIN);
    const corrected = h.call('reverseSchoolRewardsEntry', { entryId: first.entry.id, reason: 'Duplicate staff entry', idempotencyKey: 'reverse_award_01' });
    expect(corrected.balance).toBe(0);
    expect(h.rows('Balances')[1].slice(1, 4)).toEqual([0, 0, 0]);
  });

  it('requires both a recognition category and a student-facing reason for awards', () => {
    const h = harness(); const student = setup(h); const category = seededCategory(h); h.setActive(STAFF);
    expect(() => h.call('awardSchoolRewardsPoints', {
      studentId: student.id, amount: 5, categoryId: category.id, reason: '   ', idempotencyKey: 'award_blank_reason1',
    })).toThrow(/describe|reason|required|explain/i);
    expect(() => h.call('awardSchoolRewardsPoints', {
      studentId: student.id, amount: 5, reason: 'Helped prepare the shared materials', idempotencyKey: 'award_no_category1',
    })).toThrow(/category|required/i);
    const awarded = h.call('awardSchoolRewardsPoints', {
      studentId: student.id, amount: 5, categoryId: category.id, reason: 'Helped prepare the shared materials', idempotencyKey: 'award_valid_fields1',
    });
    expect(awarded).toMatchObject({ ok: true, balance: 5, entry: { categoryId: category.id, reason: 'Helped prepare the shared materials' } });
  });

  it('preserves inactive category names and earned growth while blocking new awards', () => {
    const h = harness(); const student = setup(h); const category = seededCategory(h);
    h.setActive(STAFF);
    h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 15, categoryId: category.id, reason: 'Followed through on a difficult task', idempotencyKey: 'award_category_history1' });
    h.setActive(ADMIN);
    h.call('adminUpsertRewardsCategory', { id: category.id, name: category.name, description: category.description, framework: category.framework, color: category.color, sortOrder: category.sortOrder, active: false });
    expect(h.call('getSchoolRewardsBootstrap').categories.find(item => item.id === category.id)).toMatchObject({ name: category.name, active: false });
    h.setActive(STAFF);
    expect(() => h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 5, categoryId: category.id, reason: 'New attempt', idempotencyKey: 'award_inactive_category1' })).toThrow(/recognition category is no longer active/i);
    expect(h.call('getSchoolRewardsBootstrap').categories.find(item => item.id === category.id)).toMatchObject({ name: category.name, active: false });
    h.setActive(STUDENT);
    expect(h.call('getSchoolRewardsBootstrap').progress.find(item => item.categoryId === category.id)).toMatchObject({ name: category.name, active: false, points: 15 });
  });

  it('checks live balance and inventory atomically at cashier checkout', () => {
    const h = harness(); const student = setup(h); const category = seededCategory(h);
    h.setActive(STAFF); h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 25, categoryId: category.id, reason: 'Recognition', idempotencyKey: 'award_checkout_01' });
    h.setActive(ADMIN);
    const prize = h.call('adminUpsertRewardsCatalogItem', { name: 'Notebook', cost: 10, inventoryLimit: 5, description: 'School notebook', idempotencyKey: 'catalog_notebook_01' }).item;
    const windowItem = h.call('adminUpsertRewardsWindow', { name: 'Trimester 1', status: 'OPEN' }).window;
    h.setActive(CASHIER);
    const request = { studentId: student.id, windowId: windowItem.id, lines: [{ catalogId: prize.id, quantity: 2 }], idempotencyKey: 'checkout_retry_01' };
    const first = h.call('checkoutSchoolRewardsOrder', request);
    const retry = h.call('checkoutSchoolRewardsOrder', request);
    expect(first.balance).toBe(5);
    expect(retry.order.id).toBe(first.order.id);
    expect(h.rows('Orders')).toHaveLength(2);
    expect(h.rows('Catalog')[1][5]).toBe(3);
    expect(() => h.call('checkoutSchoolRewardsOrder', { ...request, lines: [{ catalogId: prize.id, quantity: 1 }] })).toThrow(/already recorded once/i);
    expect(() => h.call('checkoutSchoolRewardsOrder', { ...request, idempotencyKey: 'checkout_no_funds_02' })).toThrow(/enough points/i);
  });

  it('recovers award and reversal journals after write-stage and response-loss faults', () => {
    const h = harness(); const student = setup(h); const category = seededCategory(h); h.setActive(STAFF);
    const firstInput = { studentId: student.id, amount: 12, categoryId: category.id, reason: 'Recovered recognition', idempotencyKey: 'award_fault_ledger1' };
    h.setCoreFault('award:after_ledger');
    expect(() => h.call('awardSchoolRewardsPoints', firstInput)).toThrow(/Injected core fault/);
    expect(JSON.parse(h.rows('Idempotency').find(row => row[0] === firstInput.idempotencyKey)[2])).toMatchObject({ journalVersion: 1, kind: 'award', state: 'INTENT' });
    const recovered = h.call('awardSchoolRewardsPoints', firstInput);
    expect(recovered).toMatchObject({ ok: true, balance: 12 });
    expect(h.rows('Ledger').filter(row => row[11] === firstInput.idempotencyKey)).toHaveLength(1);

    const secondInput = { studentId: student.id, amount: 3, categoryId: category.id, reason: 'Response-loss recognition', idempotencyKey: 'award_fault_response1' };
    h.setCoreFault('award:after_complete');
    expect(() => h.call('awardSchoolRewardsPoints', secondInput)).toThrow(/Injected core fault/);
    const responseRecovered = h.call('awardSchoolRewardsPoints', secondInput);
    expect(responseRecovered).toMatchObject({ ok: true, balance: 15 });
    expect(h.rows('Ledger').filter(row => row[11] === secondInput.idempotencyKey)).toHaveLength(1);

    h.setActive(ADMIN);
    const reverseInput = { entryId: recovered.entry.id, reason: 'Administrative correction', idempotencyKey: 'reverse_fault_ledger1' };
    h.setCoreFault('reverse:after_ledger');
    expect(() => h.call('reverseSchoolRewardsEntry', reverseInput)).toThrow(/Injected core fault/);
    const reversed = h.call('reverseSchoolRewardsEntry', reverseInput);
    expect(reversed).toMatchObject({ ok: true, balance: 3, availableBalance: 3 });
    expect(h.rows('Ledger').filter(row => row[11] === reverseInput.idempotencyKey)).toHaveLength(1);
  });

  it('resumes checkout and refund from exact inventory targets without duplicate rows or mail', () => {
    const h = harness(); const student = setup(h); const category = seededCategory(h);
    h.setActive(STAFF);
    h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 30, categoryId: category.id, reason: 'Store readiness', idempotencyKey: 'award_store_faults1' });
    h.setActive(ADMIN);
    const prize = h.call('adminUpsertRewardsCatalogItem', { name: 'Recovery notebook', cost: 10, inventoryLimit: 5, idempotencyKey: 'catalog_recovery_notebook1' }).item;
    const windowItem = h.call('adminUpsertRewardsWindow', { name: 'Recovery store', status: 'OPEN' }).window;
    h.setActive(CASHIER);
    const checkoutInput = { studentId: student.id, windowId: windowItem.id, lines: [{ catalogId: prize.id, quantity: 2 }], idempotencyKey: 'checkout_fault_stock1' };
    h.setCoreFault('checkout:after_inventory');
    expect(() => h.call('checkoutSchoolRewardsOrder', checkoutInput)).toThrow(/Injected core fault/);
    expect(h.rows('Catalog')[1][5]).toBe(3);
    expect(h.rows('Orders')[1][4]).toBe('PROCESSING');
    const checkout = h.call('checkoutSchoolRewardsOrder', checkoutInput);
    expect(checkout).toMatchObject({ balance: 10, order: { status: 'COMPLETED', total: 20 }, receipt: { status: 'SENT' } });
    expect(h.rows('Orders')).toHaveLength(2);
    expect(h.rows('OrderLines')).toHaveLength(2);
    expect(h.rows('Ledger').filter(row => row[11] === checkoutInput.idempotencyKey)).toHaveLength(1);
    expect(h.mail).toHaveLength(1);

    h.setActive(ADMIN);
    const refundInput = { orderId: checkout.order.id, reason: 'Recovered refund', idempotencyKey: 'refund_fault_stock01' };
    h.setCoreFault('refund:after_inventory');
    expect(() => h.call('refundSchoolRewardsOrder', refundInput)).toThrow(/Injected core fault/);
    expect(h.rows('Catalog')[1][5]).toBe(5);
    expect(h.rows('Orders')[1][4]).toBe('COMPLETED');
    const refund = h.call('refundSchoolRewardsOrder', refundInput);
    expect(refund).toMatchObject({ restoredPoints: 20, balance: 30, receipt: { status: 'SENT' } });
    expect(h.rows('Catalog')[1][5]).toBe(5);
    expect(h.rows('Ledger').filter(row => row[11] === refundInput.idempotencyKey)).toHaveLength(1);
    expect(h.rows('Receipts')).toHaveLength(3);
    expect(h.mail).toHaveLength(2);
  });

  it('lets an administrator recover a flushed pending checkout after the original actor is deactivated', () => {
    const h = harness(); const student = setup(h); const category = seededCategory(h);
    h.setActive(STAFF);
    h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 25, categoryId: category.id, reason: 'Recovery funding', idempotencyKey: 'award_admin_recovery1' });
    h.setActive(ADMIN);
    const prize = h.call('adminUpsertRewardsCatalogItem', { name: 'Recovery pencil case', cost: 10, inventoryLimit: 3, idempotencyKey: 'catalog_recovery_pencil1' }).item;
    const windowItem = h.call('adminUpsertRewardsWindow', { name: 'Admin recovery store', status: 'OPEN' }).window;
    const beforeFlush = h.flushCount();
    h.setActive(CASHIER);
    const input = { studentId: student.id, windowId: windowItem.id, lines: [{ catalogId: prize.id, quantity: 1 }], idempotencyKey: 'checkout_admin_recover1' };
    h.setCoreFault('checkout:after_order');
    expect(() => h.call('checkoutSchoolRewardsOrder', input)).toThrow(/Injected core fault/);
    expect(h.flushCount()).toBe(beforeFlush + 1);
    expect(h.rows('Orders')[1][4]).toBe('PROCESSING');
    h.setActive(STAFF);
    expect(() => h.call('recoverSchoolRewardsOperation', { idempotencyKey: input.idempotencyKey })).toThrow(/role cannot perform/i);
    h.setActive(ADMIN);
    h.call('adminUpsertRewardsMember', { email: CASHIER, displayName: 'Former Store Team', role: 'cashier', active: false });
    const recovered = h.call('recoverSchoolRewardsOperation', { idempotencyKey: input.idempotencyKey });
    expect(recovered).toMatchObject({ ok: true, recovered: true, kind: 'checkout', result: { balance: 15, order: { status: 'COMPLETED' } } });
    expect(recovered).not.toHaveProperty('idempotencyKey');
    const orderRow = h.rows('Orders')[1];
    const ledgerRow = h.rows('Ledger').find(row => row[11] === input.idempotencyKey);
    expect(orderRow[5]).toBe(CASHIER);
    expect(ledgerRow.slice(8, 10)).toEqual([CASHIER, 'cashier']);
    expect(h.rows('Audit').find(row => row[1] === 'ORDER_COMPLETED').slice(5, 7)).toEqual([CASHIER, 'cashier']);
    expect(h.rows('Audit').find(row => row[1] === 'CORE_OPERATION_ADMIN_RECOVERED').slice(5, 7)).toEqual([ADMIN, 'admin']);
    expect(h.rows('Ledger').filter(row => row[11] === input.idempotencyKey)).toHaveLength(1);
    expect(h.mail).toHaveLength(1);
    expect(h.call('recoverSchoolRewardsOperation', { idempotencyKey: input.idempotencyKey })).toMatchObject({ recovered: false, result: { order: { id: recovered.result.order.id } } });
    expect(h.rows('Ledger').filter(row => row[11] === input.idempotencyKey)).toHaveLength(1);
    expect(h.mail).toHaveLength(1);
  });

  it('blocks every Print Lab balance or hold mutation and readiness while a core journal is pending', () => {
    const h = harness(); const student = setup(h); const category = seededCategory(h);
    h.setActive(STAFF);
    const input = { studentId: student.id, amount: 10, categoryId: category.id, reason: 'Pending operation fixture', idempotencyKey: 'award_pending_print_gate1' };
    h.setCoreFault('award:after_intent');
    expect(() => h.call('awardSchoolRewardsPoints', input)).toThrow(/Injected core fault/);
    expect(h.rows('Ledger')).toHaveLength(1);
    expect(h.rows('PointHolds')).toHaveLength(1);
    h.setActive(STUDENT);
    expect(() => h.call('confirmSchoolRewardsPrintQuote', { requestId: 'missing-request-01', idempotencyKey: 'gate_confirm_print1' })).toThrow(/previous rewards transaction/i);
    expect(() => h.call('cancelSchoolRewardsPrintRequest', { requestId: 'missing-request-01', idempotencyKey: 'gate_cancel_print01' })).toThrow(/previous rewards transaction/i);
    h.setActive(STAFF);
    expect(() => h.call('fulfillSchoolRewardsPrintRequest', { requestId: 'missing-request-01', idempotencyKey: 'gate_fulfill_print1' })).toThrow(/previous rewards transaction/i);
    h.setActive(ADMIN);
    expect(() => h.call('refundSchoolRewardsPrintRequest', { requestId: 'missing-request-01', idempotencyKey: 'gate_refund_print01' })).toThrow(/previous rewards transaction/i);
    expect(h.rows('Ledger')).toHaveLength(1);
    expect(h.rows('PointHolds')).toHaveLength(1);
    const pendingReport = h.call('getSchoolRewardsIntegrityReport', {});
    expect(pendingReport).toMatchObject({ ok: false, ready: false, readiness: { ok: false, pendingOperations: 1 }, summary: { pendingOperations: 1 } });
    expect(pendingReport.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'JOURNAL_OPERATION_PENDING', severity: 'ERROR' })]));
    expect(h.call('recoverSchoolRewardsOperation', { idempotencyKey: input.idempotencyKey })).toMatchObject({ recovered: true, result: { balance: 10 } });
    expect(h.call('getSchoolRewardsIntegrityReport', {})).toMatchObject({ ok: true, ready: true, readiness: { ok: true, pendingOperations: 0 } });
  });

  it('keeps an ambiguous administrator recovery pending without destructive rollback', () => {
    const h = harness(); const student = setup(h); const category = seededCategory(h);
    h.setActive(STAFF);
    h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 20, categoryId: category.id, reason: 'Ambiguity funding', idempotencyKey: 'award_recovery_fail1' });
    h.setActive(ADMIN);
    const prize = h.call('adminUpsertRewardsCatalogItem', { name: 'Ambiguous stock', cost: 5, inventoryLimit: 5, idempotencyKey: 'catalog_ambiguous_stock1' }).item;
    const windowItem = h.call('adminUpsertRewardsWindow', { name: 'Ambiguous recovery', status: 'OPEN' }).window;
    h.setActive(CASHIER);
    const input = { studentId: student.id, windowId: windowItem.id, lines: [{ catalogId: prize.id, quantity: 1 }], idempotencyKey: 'checkout_recovery_fail1' };
    h.setCoreFault('checkout:after_intent');
    expect(() => h.call('checkoutSchoolRewardsOrder', input)).toThrow(/Injected core fault/);
    h.setDataCell('Catalog', 0, 5, 3);
    h.setActive(ADMIN);
    expect(() => h.call('recoverSchoolRewardsOperation', { idempotencyKey: input.idempotencyKey })).toThrow(/inventory changed|ambiguous|integrity report/i);
    expect(JSON.parse(h.rows('Idempotency').find(row => row[0] === input.idempotencyKey)[2])).toMatchObject({ state: 'INTENT' });
    expect(h.rows('Orders')).toHaveLength(1);
    expect(h.rows('Ledger').filter(row => row[11] === input.idempotencyKey)).toHaveLength(0);
    expect(h.call('getSchoolRewardsIntegrityReport', {})).toMatchObject({ ok: false, ready: false, summary: { pendingOperations: 1 } });
  });

  it('fails closed on missing, tampered, or non-canonical signed pending intent with zero business writes', () => {
    const h = harness(); const student = setup(h); const category = seededCategory(h);
    h.setActive(STAFF);
    const input = { studentId: student.id, amount: 9, categoryId: category.id, reason: 'Signed pending fixture', idempotencyKey: 'award_signed_tamper1' };
    h.setCoreFault('award:after_intent');
    expect(() => h.call('awardSchoolRewardsPoints', input)).toThrow(/Injected core fault/);
    const idemDataIndex = h.rows('Idempotency').slice(1).findIndex(row => row[0] === input.idempotencyKey);
    const operation = h.rows('Idempotency')[idemDataIndex + 1][1];
    const original = JSON.parse(h.rows('Idempotency')[idemDataIndex + 1][2]);
    expect(original.signature).toMatch(/^h1_/);
    const businessState = () => JSON.stringify({ ledger: h.rows('Ledger'), balances: h.rows('Balances'), orders: h.rows('Orders'), lines: h.rows('OrderLines'), catalog: h.rows('Catalog') });
    const before = businessState();
    h.setActive(ADMIN);
    const unsigned = structuredClone(original); delete unsigned.signature;
    h.setDataCell('Idempotency', idemDataIndex, 2, JSON.stringify(unsigned));
    expect(() => h.call('recoverSchoolRewardsOperation', { idempotencyKey: input.idempotencyKey })).toThrow(/signature/i);
    expect(businessState()).toBe(before);
    expect(h.call('getSchoolRewardsIntegrityReport', {}).issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'JOURNAL_SIGNATURE_INVALID' })]));
    const payloadTamper = structuredClone(original); payloadTamper.intent.amount = 10;
    h.setDataCell('Idempotency', idemDataIndex, 2, JSON.stringify(payloadTamper));
    expect(() => h.call('recoverSchoolRewardsOperation', { idempotencyKey: input.idempotencyKey })).toThrow(/signature/i);
    expect(businessState()).toBe(before);
    payloadTamper.signature = h.signCoreJournal(input.idempotencyKey, operation, payloadTamper);
    h.setDataCell('Idempotency', idemDataIndex, 2, JSON.stringify(payloadTamper));
    expect(() => h.call('recoverSchoolRewardsOperation', { idempotencyKey: input.idempotencyKey })).toThrow(/operation digest/i);
    expect(businessState()).toBe(before);
    const entityTamper = structuredClone(original); entityTamper.intent.ledgerId = 'ledger_tampered_entity';
    entityTamper.signature = h.signCoreJournal(input.idempotencyKey, operation, entityTamper);
    h.setDataCell('Idempotency', idemDataIndex, 2, JSON.stringify(entityTamper));
    expect(() => h.call('recoverSchoolRewardsOperation', { idempotencyKey: input.idempotencyKey })).toThrow(/deterministic/i);
    expect(businessState()).toBe(before);
    expect(h.call('getSchoolRewardsIntegrityReport', {}).issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'JOURNAL_PENDING_INTENT_INVALID' })]));
  });

  it('backfills administrator recovery success after a post-completion audit crash', () => {
    const h = harness(); const student = setup(h); const category = seededCategory(h);
    h.setActive(STAFF);
    const input = { studentId: student.id, amount: 7, categoryId: category.id, reason: 'Audit backfill fixture', idempotencyKey: 'award_admin_audit_backfill1' };
    h.setCoreFault('award:after_intent');
    expect(() => h.call('awardSchoolRewardsPoints', input)).toThrow(/Injected core fault/);
    h.setActive(ADMIN);
    h.setCoreFault('admin_recovery:after_complete');
    expect(() => h.call('recoverSchoolRewardsOperation', { idempotencyKey: input.idempotencyKey })).toThrow(/Injected core fault/);
    expect(h.rows('Audit').filter(row => row[1] === 'ADMIN_RECOVERY_STARTED')).toHaveLength(1);
    expect(h.rows('Audit').filter(row => row[1] === 'CORE_OPERATION_ADMIN_RECOVERED')).toHaveLength(0);
    expect(h.rows('Ledger').filter(row => row[11] === input.idempotencyKey)).toHaveLength(1);
    const retry = h.call('recoverSchoolRewardsOperation', { idempotencyKey: input.idempotencyKey });
    expect(retry).toMatchObject({ recovered: false, result: { balance: 7 } });
    expect(h.rows('Audit').filter(row => row[1] === 'ADMIN_RECOVERY_STARTED')).toHaveLength(1);
    expect(h.rows('Audit').filter(row => row[1] === 'CORE_OPERATION_ADMIN_RECOVERED')).toHaveLength(1);
    expect(h.rows('Ledger').filter(row => row[11] === input.idempotencyKey)).toHaveLength(1);
  });

  it('gates administrator catalog edits until the pending core operation is recovered', () => {
    const h = harness(); const student = setup(h); const category = seededCategory(h);
    h.setActive(STAFF);
    h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 15, categoryId: category.id, reason: 'Catalog gate funding', idempotencyKey: 'award_catalog_gate01' });
    h.setActive(ADMIN);
    const prize = h.call('adminUpsertRewardsCatalogItem', { name: 'Catalog gate prize', cost: 5, inventoryLimit: 4, idempotencyKey: 'catalog_gate_prize01' }).item;
    const windowItem = h.call('adminUpsertRewardsWindow', { name: 'Catalog gate store', status: 'OPEN' }).window;
    h.setActive(CASHIER);
    const checkout = { studentId: student.id, windowId: windowItem.id, lines: [{ catalogId: prize.id, quantity: 1 }], idempotencyKey: 'checkout_catalog_gate1' };
    h.setCoreFault('checkout:after_intent');
    expect(() => h.call('checkoutSchoolRewardsOrder', checkout)).toThrow(/Injected core fault/);
    const catalogBefore = JSON.stringify(h.rows('Catalog'));
    h.setActive(ADMIN);
    expect(() => h.call('adminUpsertRewardsCatalogItem', { ...prize, name: 'Blocked rename', idempotencyKey: 'catalog_blocked_rename1' })).toThrow(/previous rewards transaction/i);
    expect(JSON.stringify(h.rows('Catalog'))).toBe(catalogBefore);
    expect(h.call('recoverSchoolRewardsOperation', { idempotencyKey: checkout.idempotencyKey })).toMatchObject({ recovered: true, result: { order: { status: 'COMPLETED' } } });
    expect(h.call('adminUpsertRewardsCatalogItem', {
      id: prize.id, name: 'Allowed rename', description: prize.description, cost: prize.cost,
      active: prize.active, imageUrl: prize.imageUrl, idempotencyKey: 'catalog_allowed_rename1',
    }).item.name).toBe('Allowed rename');
  });

  it('reports clean state and detects cross-sheet integrity corruption without changing data', () => {
    const h = harness(); const student = setup(h); const category = seededCategory(h);
    h.setActive(STAFF);
    h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 20, categoryId: category.id, reason: 'Integrity fixture', idempotencyKey: 'award_integrity_01' });
    h.setActive(ADMIN);
    const prize = h.call('adminUpsertRewardsCatalogItem', { name: 'Integrity prize', cost: 10, inventoryLimit: 4, idempotencyKey: 'catalog_integrity_prize1' }).item;
    const windowItem = h.call('adminUpsertRewardsWindow', { name: 'Integrity window', status: 'OPEN' }).window;
    h.setActive(CASHIER);
    const order = h.call('checkoutSchoolRewardsOrder', { studentId: student.id, windowId: windowItem.id, lines: [{ catalogId: prize.id, quantity: 1 }], idempotencyKey: 'checkout_integrity1' }).order;
    h.setActive(STAFF);
    expect(() => h.call('getSchoolRewardsIntegrityReport', {})).toThrow(/role cannot perform/i);
    h.setActive(ADMIN);
    const clean = h.call('getSchoolRewardsIntegrityReport', {});
    expect(clean).toMatchObject({ ok: true, readOnly: true, summary: { errors: 0, pendingOperations: 0 }, checks: { ledgerAndBalances: true, receiptDelivery: true, operationJournals: true } });

    h.setDataCell('Balances', 0, 3, 999);
    h.setDataCell('Catalog', 0, 5, 99);
    h.setDataCell('Orders', 0, 3, 11);
    h.setDataCell('Orders', 0, 4, 'REFUNDED');
    h.setDataCell('Receipts', 0, 5, 'UNKNOWN');
    h.appendRaw('OrderLines', ['missing-order', 'missing-catalog', 'Dangling', 1, 1, 1]);
    h.appendRaw('PointHolds', ['hold-corrupt-01', student.id, 'PRINT_REQUEST', 'missing-request', 5, 'ACTIVE', '', 'hold_corrupt_key1', '', '2020-01-01T00:00:00.000Z', '2020-01-01T00:00:00.000Z', '', '', '']);
    const duplicateLedger = h.rows('Ledger')[1];
    h.appendRaw('Ledger', duplicateLedger);
    h.appendRaw('Idempotency', ['pending_corruption1', 'award:fixture', JSON.stringify({ journalVersion: 1, kind: 'award', state: 'INTENT', intent: { ledgerId: 'ledger-pending' }, createdAt: '2020-01-01T00:00:00.000Z', updatedAt: '2020-01-01T00:00:00.000Z' }), '2020-01-01T00:00:00.000Z']);
    const before = JSON.stringify({ ledger: h.rows('Ledger'), balances: h.rows('Balances'), orders: h.rows('Orders'), catalog: h.rows('Catalog') });
    const report = h.call('getSchoolRewardsIntegrityReport', { holdAgeDays: 1, pendingAgeMinutes: 1 });
    const codes = report.issues.map(issue => issue.code);
    expect(report).toMatchObject({ ok: false, readOnly: true, summary: { pendingOperations: 1 } });
    expect(codes).toEqual(expect.arrayContaining([
      'DUPLICATE_PRIMARY_KEY', 'DUPLICATE_LEDGER_REQUEST_KEY', 'BALANCE_DRIFT',
      'ORDER_TOTAL_DRIFT', 'ORDER_REFUND_COUNT_INVALID', 'INVENTORY_OUT_OF_BOUNDS',
      'ORDER_LINE_ORDER_MISSING', 'HOLD_PURPOSE_MISSING', 'HOLD_STALE',
      'RECEIPT_DELIVERY_AMBIGUOUS', 'REFUND_RECEIPT_RECORD_MISSING', 'JOURNAL_OPERATION_PENDING',
    ]));
    expect(JSON.stringify({ ledger: h.rows('Ledger'), balances: h.rows('Balances'), orders: h.rows('Orders'), catalog: h.rows('Catalog') })).toBe(before);
    expect(report.issues.every(issue => !JSON.stringify(issue).includes(STUDENT))).toBe(true);
    expect(order.id).toBeTruthy();
  });

  it('validates completed journal ledger, order, lines, status, and saved result against intent', () => {
    const h = harness(); const student = setup(h); const category = seededCategory(h);
    h.setActive(STAFF);
    h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 20, categoryId: category.id, reason: 'Deep journal fixture', idempotencyKey: 'award_journal_deep1' });
    h.setActive(ADMIN);
    const prize = h.call('adminUpsertRewardsCatalogItem', { name: 'Journal prize', cost: 10, inventoryLimit: 2, idempotencyKey: 'catalog_journal_prize1' }).item;
    const windowItem = h.call('adminUpsertRewardsWindow', { name: 'Journal store', status: 'OPEN' }).window;
    h.setActive(CASHIER);
    const checkoutKey = 'checkout_journal_deep1';
    h.call('checkoutSchoolRewardsOrder', { studentId: student.id, windowId: windowItem.id, lines: [{ catalogId: prize.id, quantity: 1 }], idempotencyKey: checkoutKey });
    h.setActive(ADMIN);
    expect(h.call('getSchoolRewardsIntegrityReport', {})).toMatchObject({ ok: true, ready: true });
    const idemDataIndex = h.rows('Idempotency').slice(1).findIndex(row => row[0] === checkoutKey);
    const envelope = JSON.parse(h.rows('Idempotency')[idemDataIndex + 1][2]);
    envelope.result.ledgerId = 'tampered-ledger-result';
    h.setDataCell('Idempotency', idemDataIndex, 2, JSON.stringify(envelope));
    const ledgerDataIndex = h.rows('Ledger').slice(1).findIndex(row => row[11] === checkoutKey);
    h.setDataCell('Ledger', ledgerDataIndex, 8, 'tampered@' + DOMAIN);
    h.setDataCell('Orders', 0, 2, 'missing-window');
    h.setDataCell('Orders', 0, 4, 'BROKEN');
    h.setDataCell('OrderLines', 0, 2, 'Tampered item name');
    const report = h.call('getSchoolRewardsIntegrityReport', {});
    const codes = report.issues.map(issue => issue.code);
    expect(report).toMatchObject({ ok: false, ready: false });
    expect(codes).toEqual(expect.arrayContaining([
      'JOURNAL_LEDGER_INTENT_MISMATCH', 'JOURNAL_ORDER_INTENT_MISMATCH',
      'JOURNAL_LINES_INTENT_MISMATCH', 'JOURNAL_ORDER_STATUS_MISMATCH',
      'JOURNAL_RESULT_INTENT_MISMATCH',
    ]));
  });

  it('emails only the student total and current prize preview', () => {
    const h = harness(); const student = setup(h); const category = seededCategory(h);
    h.setActive(STAFF); h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 12, categoryId: category.id, reason: 'Private staff reason', idempotencyKey: 'award_email_01' });
    h.setActive(ADMIN);
    h.call('adminUpsertRewardsCatalogItem', { name: 'Art Kit', cost: 10, inventoryLimit: -1, description: 'Markers and paper', idempotencyKey: 'catalog_art_kit_01' });
    h.call('adminUpsertRewardsWindow', { name: 'Trimester 1', status: 'PREVIEW' });
    const result = h.call('sendSchoolRewardsBalanceStatements', { periodKey: '2026-t1-week1', limit: 100 });
    expect(result.sent).toBe(1);
    expect(h.mail[0].to).toBe(STUDENT);
    expect(h.mail[0].htmlBody).toContain('12 points');
    expect(h.mail[0].htmlBody).toContain('Art Kit');
    expect(h.mail[0].htmlBody).not.toContain('Private staff reason');
    expect(h.call('verifySchoolRewardsAuditChain')).toMatchObject({ ok: true });
  });

  it('uses the verified effective admin for a non-interactive scheduled statement trigger', () => {
    const h = harness(); setup(h);
    h.call('configureSchoolRewardsEmailSchedule', { enabled: true, weekday: 'FRIDAY', hour: 16 });
    const trigger = h.triggers().find(item => item.handler === 'runScheduledSchoolRewardsStatements');
    h.setActive('');
    expect(() => h.call('runScheduledSchoolRewardsStatements')).toThrow(/valid installed project trigger/i);
    expect(() => h.call('runScheduledSchoolRewardsStatements', { triggerUid: 'trigger-forged' })).toThrow(/valid installed project trigger/i);
    const result = h.call('runScheduledSchoolRewardsStatements', { triggerUid: trigger.uid });
    expect(result).toMatchObject({ sent: 1, failed: 0 });
    expect(h.mail[0]).toMatchObject({ to: STUDENT, subject: 'Pilot School rewards update' });
  });

  it('denies interactive student calls to both scheduled mail handlers', () => {
    const h = harness(); setup(h); h.setActive(STUDENT);
    expect(() => h.call('runScheduledSchoolRewardsStatements')).toThrow(/administrator.*scheduled mail handler/i);
    expect(() => h.call('continueSchoolRewardsMailRuns')).toThrow(/administrator.*scheduled mail handler/i);
    expect(h.mail).toEqual([]);
    expect(h.rows('MailRuns')).toHaveLength(1);
  });

  it('lets a rostered student see only their own categorized growth and reasons', () => {
    const h = harness(); const student = setup(h);
    const category = h.call('getSchoolRewardsBootstrap').categories[0];
    h.setActive(STAFF);
    h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 18, categoryId: category.id, reason: 'Revised a design after testing', idempotencyKey: 'award_growth_01' });
    h.setActive(ADMIN);
    h.call('adminUpsertRewardsCatalogItem', { name: 'Model print', cost: 12, inventoryLimit: 4, description: 'Approved student model', idempotencyKey: 'catalog_model_print01' });
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

  it('reports the current growth threshold and points remaining at each category level', () => {
    const h = harness(); const student = setup(h); const category = seededCategory(h);
    h.call('adminSetRewardsLevelThresholds', [0, 25, 75]);
    h.setActive(STAFF);
    h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 50, categoryId: category.id, reason: 'Sustained collaboration across the project', idempotencyKey: 'award_threshold_progress1' });
    h.setActive(STUDENT);
    const progress = h.call('getSchoolRewardsBootstrap').progress.find(item => item.categoryId === category.id);
    expect(progress).toMatchObject({ points: 50, level: 1, currentThreshold: 25, nextThreshold: 75, pointsToNext: 25 });
  });

  it('names configured growth levels beyond the five default labels accurately', () => {
    const h = harness(); const student = setup(h); const category = seededCategory(h);
    h.call('adminSetRewardsLevelThresholds', [0, 10, 20, 30, 40, 50, 60]);
    h.setActive(STAFF);
    h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 55, categoryId: category.id, reason: 'Sustained leadership and reflection', idempotencyKey: 'award_extended_level1' });
    h.setActive(STUDENT);
    expect(h.call('getSchoolRewardsBootstrap').progress.find(item => item.categoryId === category.id)).toMatchObject({ points: 55, level: 5, levelName: 'Level 6', currentThreshold: 50, nextThreshold: 60, pointsToNext: 5 });
  });

  it('keeps a purchase and full refund reconciled and records both receipts', () => {
    const h = harness(); const student = setup(h); const category = seededCategory(h);
    h.setActive(STAFF);
    h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 30, categoryId: category.id, reason: 'Recognition', idempotencyKey: 'award_refund_01' });
    h.setActive(ADMIN);
    const prize = h.call('adminUpsertRewardsCatalogItem', { name: 'Notebook', cost: 10, inventoryLimit: 5, description: 'School notebook', idempotencyKey: 'catalog_refund_notebook1' }).item;
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
    expect(() => h.call('resendSchoolRewardsOrderReceipt', { orderId: checkout.order.id, kind: 'PURCHASE', idempotencyKey: 'receipt_purchase_after_refund1' })).toThrow(/purchase receipt.*completed/i);
    const report = h.call('getSchoolRewardsReconciliation', { windowId: windowItem.id });
    expect(report).toMatchObject({ orders: 1, completedOrders: 0, refundedOrders: 1, netPointsSpent: 0, refundedPoints: 20, pointsOutstanding: 30 });
    expect(report.audit.ok).toBe(true);
  });

  it('keeps checkout complete when email fails and lets a cashier recover the receipt once', () => {
    const h = harness(); const student = setup(h); const category = seededCategory(h);
    h.setActive(STAFF);
    h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 30, categoryId: category.id, reason: 'Store recognition', idempotencyKey: 'award_receipt_retry1' });
    h.setActive(ADMIN);
    const prize = h.call('adminUpsertRewardsCatalogItem', { name: 'Sketchbook', cost: 10, inventoryLimit: 5, description: 'Blank pages for new ideas', idempotencyKey: 'catalog_sketchbook_01' }).item;
    const windowItem = h.call('adminUpsertRewardsWindow', { name: 'Trimester store', status: 'OPEN' }).window;

    h.setActive(CASHIER);
    h.setMailFailure('Temporary mail outage');
    const checkout = h.call('checkoutSchoolRewardsOrder', {
      studentId: student.id, windowId: windowItem.id,
      lines: [{ catalogId: prize.id, quantity: 2 }], idempotencyKey: 'checkout_receipt_retry1',
    });
    expect(checkout).toMatchObject({ balance: 10, receipt: { status: 'FAILED', kind: 'PURCHASE' } });
    expect(h.rows('Orders')[1][4]).toBe('COMPLETED');
    expect(h.rows('Catalog')[1][5]).toBe(3);
    expect(h.rows('Ledger')).toHaveLength(3);
    expect(h.mail).toHaveLength(0);

    const failedView = h.call('getSchoolRewardsBootstrap');
    expect(failedView.recentReceipts[0]).toMatchObject({ orderId: checkout.order.id, kind: 'PURCHASE', status: 'FAILED' });
    expect(failedView.recentOrders[0].lines[0]).toMatchObject({ itemName: 'Sketchbook', quantity: 2, lineTotal: 20 });
    expect(failedView.recentOrders[0]).not.toHaveProperty('actorEmail');
    expect(failedView.recentOrders[0]).not.toHaveProperty('idempotencyKey');
    expect(failedView.recentReceipts[0]).not.toHaveProperty('recipientEmail');
    expect(failedView.recentReceipts[0]).not.toHaveProperty('error');

    h.setActive(STAFF);
    const staffView = h.call('getSchoolRewardsBootstrap');
    expect(staffView.recentLedger[0]).not.toHaveProperty('actorEmail');
    expect(staffView.recentLedger[0]).not.toHaveProperty('idempotencyKey');

    h.setActive(CASHIER);
    h.setMailFailure('');
    const resent = h.call('resendSchoolRewardsOrderReceipt', {
      orderId: checkout.order.id, kind: 'PURCHASE', idempotencyKey: 'receipt_resend_recovery1',
    });
    expect(resent).toMatchObject({ ok: true, alreadySent: false, receipt: { status: 'SENT', kind: 'PURCHASE' } });
    expect(h.mail).toHaveLength(1);
    expect(h.mail[0].body).toContain('2 x Sketchbook');
    expect(h.mail[0].body).toContain('Current available balance when this copy was sent: 10 points');

    const duplicate = h.call('resendSchoolRewardsOrderReceipt', {
      orderId: checkout.order.id, kind: 'PURCHASE', idempotencyKey: 'receipt_resend_after_sent1',
    });
    expect(duplicate).toMatchObject({ ok: true, alreadySent: true, receipt: { status: 'SENT' } });
    expect(h.mail).toHaveLength(1);

    h.setActive(STUDENT);
    const studentView = h.call('getSchoolRewardsBootstrap');
    expect(studentView.recentOrders[0].lines[0]).toMatchObject({ itemName: 'Sketchbook', quantity: 2, lineTotal: 20 });
    expect(studentView.recentOrders[0]).not.toHaveProperty('actorEmail');
    expect(studentView.recentOrders[0]).not.toHaveProperty('idempotencyKey');
    expect(studentView.recentReceipts[0]).toMatchObject({ orderId: checkout.order.id, status: 'SENT' });
    expect(studentView.recentReceipts[0]).not.toHaveProperty('recipientEmail');
    expect(studentView.recentReceipts[0]).not.toHaveProperty('error');
  });

  it('does not duplicate mail when receipt delivery becomes uncertain after sending', () => {
    const h = harness(); const student = setup(h); const category = seededCategory(h);
    h.setActive(STAFF);
    h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 20, categoryId: category.id, reason: 'Store recognition', idempotencyKey: 'award_uncertain_receipt1' });
    h.setActive(ADMIN);
    const prize = h.call('adminUpsertRewardsCatalogItem', { name: 'Bookmark', cost: 10, inventoryLimit: 3, idempotencyKey: 'catalog_bookmark_01' }).item;
    const windowItem = h.call('adminUpsertRewardsWindow', { name: 'Trimester store', status: 'OPEN' }).window;
    h.setActive(CASHIER);
    h.setReceiptUpdateFailure('Receipt status write unavailable');
    const request = { studentId: student.id, windowId: windowItem.id, lines: [{ catalogId: prize.id, quantity: 1 }], idempotencyKey: 'checkout_uncertain_receipt1' };
    const checkout = h.call('checkoutSchoolRewardsOrder', request);
    expect(checkout).toMatchObject({ balance: 10, receipt: { status: 'UNKNOWN' } });
    expect(h.mail).toHaveLength(1);
    expect(h.rows('Receipts')[1][5]).toBe('PENDING');

    const retry = h.call('checkoutSchoolRewardsOrder', request);
    expect(retry.order.id).toBe(checkout.order.id);
    expect(retry.receipt.status).toBe('UNKNOWN');
    expect(h.mail).toHaveLength(1);
    expect(h.rows('Orders')).toHaveLength(2);
    expect(() => h.call('resendSchoolRewardsOrderReceipt', { orderId: checkout.order.id, kind: 'PURCHASE', idempotencyKey: 'resend_uncertain_block1' })).toThrow(/delivery is uncertain|verify.*mailbox/i);
    expect(() => h.call('resolveSchoolRewardsReceiptDelivery', { receiptId: checkout.receipt.id, status: 'SENT', note: 'Verified in managed mailbox', idempotencyKey: 'resolve_wrong_role1' })).toThrow(/role cannot perform/i);

    h.setReceiptUpdateFailure('');
    h.setActive(ADMIN);
    const resolved = h.call('resolveSchoolRewardsReceiptDelivery', { receiptId: checkout.receipt.id, status: 'SENT', note: 'Verified in managed mailbox', idempotencyKey: 'resolve_uncertain_sent1' });
    expect(resolved).toMatchObject({ ok: true, receipt: { id: checkout.receipt.id, status: 'SENT' } });
    h.setActive(CASHIER);
    const duplicate = h.call('resendSchoolRewardsOrderReceipt', { orderId: checkout.order.id, kind: 'PURCHASE', idempotencyKey: 'resend_after_resolve1' });
    expect(duplicate).toMatchObject({ ok: true, alreadySent: true, receipt: { status: 'SENT' } });
    expect(h.mail).toHaveLength(1);
  });

  it('transitions one trimester window through preview, open, and closed without duplicating it', () => {
    const h = harness(); setup(h);
    const preview = h.call('adminUpsertRewardsWindow', { name: 'Trimester 1 store', status: 'PREVIEW' }).window;
    expect(h.rows('StoreWindows')).toHaveLength(2);

    h.setActive(STUDENT);
    expect(h.call('getSchoolRewardsBootstrap').windows).toEqual([expect.objectContaining({ id: preview.id, status: 'PREVIEW' })]);

    h.setActive(ADMIN);
    const opened = h.call('adminUpsertRewardsWindow', { id: preview.id, name: preview.name, status: 'OPEN' }).window;
    expect(opened.id).toBe(preview.id);
    expect(h.rows('StoreWindows')).toHaveLength(2);

    h.setActive(STUDENT);
    expect(h.call('getSchoolRewardsBootstrap').windows).toEqual([expect.objectContaining({ id: preview.id, status: 'OPEN' })]);

    h.setActive(ADMIN);
    const closed = h.call('adminUpsertRewardsWindow', { id: preview.id, name: preview.name, status: 'CLOSED' }).window;
    expect(closed.id).toBe(preview.id);
    expect(h.rows('StoreWindows')).toHaveLength(2);

    h.setActive(STUDENT);
    expect(h.call('getSchoolRewardsBootstrap').windows).toEqual([]);
  });

  it('rejects cashier checkout outside an open window\'s configured dates', () => {
    const h = harness(); const student = setup(h); const category = seededCategory(h);
    h.setActive(STAFF);
    h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 100, categoryId: category.id, reason: 'Trimester recognition', idempotencyKey: 'award_window_dates1' });
    h.setActive(ADMIN);
    const prize = h.call('adminUpsertRewardsCatalogItem', { name: 'Art set', cost: 10, inventoryLimit: 5, idempotencyKey: 'catalog_art_set_01' }).item;
    const now = Date.now();
    const future = h.call('adminUpsertRewardsWindow', {
      name: 'Future store', status: 'OPEN',
      startsAt: new Date(now + 60 * 60 * 1000).toISOString(),
      endsAt: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
    }).window;

    h.setActive(CASHIER);
    expect(() => h.call('checkoutSchoolRewardsOrder', {
      studentId: student.id, windowId: future.id, lines: [{ catalogId: prize.id, quantity: 1 }], idempotencyKey: 'checkout_future_window1',
    })).toThrow(/not started|has not started|opens at|before.*window starts/i);

    h.setActive(ADMIN);
    const ended = h.call('adminUpsertRewardsWindow', {
      name: 'Ended store', status: 'OPEN',
      startsAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      endsAt: new Date(now - 60 * 60 * 1000).toISOString(),
    }).window;

    h.setActive(CASHIER);
    expect(() => h.call('checkoutSchoolRewardsOrder', {
      studentId: student.id, windowId: ended.id, lines: [{ catalogId: prize.id, quantity: 1 }], idempotencyKey: 'checkout_ended_window1',
    })).toThrow(/ended|has ended|expired|after.*window ends/i);
    expect(h.rows('Orders')).toHaveLength(1);
    expect(h.rows('Catalog')[1][5]).toBe(5);
  });

  it('preserves sold inventory on metadata edits and applies an explicit stock change', () => {
    const h = harness(); const student = setup(h); const category = seededCategory(h);
    h.setActive(STAFF);
    h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 30, categoryId: category.id, reason: 'Store recognition', idempotencyKey: 'award_catalog_edit1' });
    h.setActive(ADMIN);
    const prize = h.call('adminUpsertRewardsCatalogItem', { name: 'Notebook', cost: 10, inventoryLimit: 5, description: 'Original description', idempotencyKey: 'catalog_edit_notebook1' }).item;
    const windowItem = h.call('adminUpsertRewardsWindow', { name: 'Trimester store', status: 'OPEN' }).window;
    h.setActive(CASHIER);
    h.call('checkoutSchoolRewardsOrder', { studentId: student.id, windowId: windowItem.id, lines: [{ catalogId: prize.id, quantity: 2 }], idempotencyKey: 'checkout_catalog_edit1' });

    h.setActive(ADMIN);
    const metadataEdit = h.call('adminUpsertRewardsCatalogItem', {
      id: prize.id, name: 'College-ruled notebook', cost: 12, description: 'Updated description', active: true, idempotencyKey: 'catalog_metadata_edit01',
    }).item;
    expect(metadataEdit).toMatchObject({ id: prize.id, cost: 12, inventoryLimit: 5, remaining: 3 });

    const stockEdit = h.call('adminUpsertRewardsCatalogItem', {
      id: prize.id, name: metadataEdit.name, cost: metadataEdit.cost, inventoryLimit: 5, remaining: 4,
      expectedInventoryVersion: metadataEdit.inventoryVersion, reason: 'Restocked after physical count',
      description: metadataEdit.description, active: true, idempotencyKey: 'catalog_stock_edit01',
    }).item;
    expect(stockEdit).toMatchObject({ id: prize.id, remaining: 4 });
    expect(h.rows('Catalog')).toHaveLength(2);
  });

  it('rejects an inventory-conflicting refund before changing points, stock, or order state', () => {
    const h = harness(); const student = setup(h); const category = seededCategory(h);
    h.setActive(STAFF);
    h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 30, categoryId: category.id, reason: 'Store recognition', idempotencyKey: 'award_refund_preflight1' });
    h.setActive(ADMIN);
    const prize = h.call('adminUpsertRewardsCatalogItem', { name: 'Notebook', cost: 10, inventoryLimit: 5, description: 'School notebook', idempotencyKey: 'catalog_preflight_notebook1' }).item;
    const windowItem = h.call('adminUpsertRewardsWindow', { name: 'Trimester store', status: 'OPEN' }).window;
    h.setActive(CASHIER);
    const checkout = h.call('checkoutSchoolRewardsOrder', { studentId: student.id, windowId: windowItem.id, lines: [{ catalogId: prize.id, quantity: 2 }], idempotencyKey: 'checkout_refund_preflight1' });

    h.setActive(ADMIN);
    h.call('adminUpsertRewardsCatalogItem', { id: prize.id, name: prize.name, cost: prize.cost, inventoryLimit: 5, remaining: 4, expectedInventoryVersion: 2, reason: 'Physical count correction', description: prize.description, active: true, idempotencyKey: 'catalog_preflight_adjust1' });
    const before = Object.fromEntries(['Ledger', 'Balances', 'Catalog', 'Orders', 'Receipts', 'Idempotency', 'Audit'].map(name => [name, h.rows(name)]));
    const mailCount = h.mail.length;
    const refundRequest = { orderId: checkout.order.id, reason: 'Item unavailable', idempotencyKey: 'refund_inventory_preflight1' };
    expect(() => h.call('refundSchoolRewardsOrder', refundRequest)).toThrow(/inventory exceed|exceed.*limit/i);
    Object.entries(before).forEach(([name, rows]) => expect(h.rows(name)).toEqual(rows));
    expect(h.mail).toHaveLength(mailCount);
    expect(h.rows('Orders')[1][4]).toBe('COMPLETED');
    expect(h.rows('Balances')[1].slice(1, 4)).toEqual([30, 20, 10]);

    h.call('adminUpsertRewardsCatalogItem', { id: prize.id, name: prize.name, cost: prize.cost, inventoryLimit: 5, remaining: 3, expectedInventoryVersion: 3, reason: 'Restore counted stock', description: prize.description, active: true, idempotencyKey: 'catalog_preflight_adjust2' });
    const recovered = h.call('refundSchoolRewardsOrder', refundRequest);
    expect(recovered).toMatchObject({ balance: 30, restoredPoints: 20, receipt: { status: 'SENT', kind: 'REFUND' } });
    expect(h.rows('Catalog')[1][5]).toBe(5);
    expect(h.rows('Orders')[1][4]).toBe('REFUNDED');
  });

  it('refunds a historical order safely after the student is deactivated', () => {
    const h = harness(); const student = setup(h); const category = seededCategory(h);
    h.setActive(STAFF);
    h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 20, categoryId: category.id, reason: 'Store recognition', idempotencyKey: 'award_inactive_refund1' });
    h.setActive(ADMIN);
    const prize = h.call('adminUpsertRewardsCatalogItem', { name: 'Pencil set', cost: 10, inventoryLimit: 2, idempotencyKey: 'catalog_pencil_set_01' }).item;
    const windowItem = h.call('adminUpsertRewardsWindow', { name: 'Trimester store', status: 'OPEN' }).window;
    h.setActive(CASHIER);
    const checkout = h.call('checkoutSchoolRewardsOrder', { studentId: student.id, windowId: windowItem.id, lines: [{ catalogId: prize.id, quantity: 1 }], idempotencyKey: 'checkout_inactive_refund1' });

    h.setActive(ADMIN);
    h.call('adminUpsertRewardsStudent', { id: student.id, firstName: student.firstName, lastInitial: student.lastInitial, grade: student.grade, homeroom: student.homeroom, email: STUDENT, active: false });
    const refund = h.call('refundSchoolRewardsOrder', { orderId: checkout.order.id, reason: 'Returned after roster change', idempotencyKey: 'refund_inactive_student1' });
    expect(refund).toMatchObject({ balance: 20, restoredPoints: 10, receipt: { kind: 'REFUND', status: 'SENT' } });
    expect(h.rows('Orders')[1][4]).toBe('REFUNDED');
    expect(h.rows('Catalog')[1][5]).toBe(2);
    expect(h.rows('Balances')[1].slice(1, 4)).toEqual([20, 0, 20]);
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

  it('updates CSV roster rows by managed email and rejects identity conflicts before writes', () => {
    const h = harness(); const student = setup(h); const category = seededCategory(h);
    h.setActive(STAFF);
    h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 25, categoryId: category.id, reason: 'Persistent roster reference', idempotencyKey: 'award_roster_update1' });
    h.setActive(ADMIN);
    const updated = h.call('adminBulkUpsertRewardsStudents', [{ firstName: 'Avery Updated', lastInitial: 'R', grade: '6', homeroom: '6B', email: STUDENT.toUpperCase() }]);
    expect(updated.students[0]).toMatchObject({ id: student.id, firstName: 'Avery Updated', grade: '6', homeroom: '6B', email: STUDENT });
    expect(h.rows('Students')).toHaveLength(2);
    expect(h.rows('Balances')).toHaveLength(2);
    expect(h.rows('Balances')[1].slice(0, 4)).toEqual([student.id, 25, 0, 25]);

    const before = Object.fromEntries(['Students', 'Balances', 'Audit'].map(name => [name, h.rows(name)]));
    expect(() => h.call('adminBulkUpsertRewardsStudents', [
      { firstName: 'Jordan', lastInitial: 'K', grade: '6', homeroom: '6B', email: `jordan@${DOMAIN}` },
      { id: 'different-student-id', firstName: 'Incorrect claim', email: STUDENT },
    ])).toThrow(/already belongs to another|already on the roster|two different students|duplicate student/i);
    Object.entries(before).forEach(([name, rows]) => expect(h.rows(name)).toEqual(rows));
    expect(() => h.call('adminBulkUpsertRewardsStudents', [{ firstName: '   ', email: `blankname@${DOMAIN}` }])).toThrow(/first name is required/i);
    Object.entries(before).forEach(([name, rows]) => expect(h.rows(name)).toEqual(rows));
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
    expect(() => h.call('createSchoolRewardsPrintModel', { ...recipeInput, title: 'Changed title' })).toThrow(/already recorded once/i);

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
    const h = harness(); const student = setup(h); const category = seededCategory(h);
    h.setActive(STAFF);
    const award = h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 40, categoryId: category.id, reason: 'Design iteration', idempotencyKey: 'award_print_flow_01' });
    h.setActive(ADMIN);
    const windowItem = h.call('adminUpsertRewardsWindow', { name: 'Trimester Print Store', status: 'OPEN' }).window;
    const expensive = h.call('adminUpsertRewardsCatalogItem', { name: 'Large prize', cost: 30, inventoryLimit: -1, idempotencyKey: 'catalog_large_prize01' }).item;
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

    h.setActive(ADMIN);
    const statementRun = h.call('sendSchoolRewardsBalanceStatements', { periodKey: '2026-t1-active-hold', limit: 100 });
    expect(statementRun).toMatchObject({ sent: 1, failed: 0 });
    const statement = h.mail.at(-1);
    expect(statement.subject).toMatch(/rewards.*update/i);
    expect(statement.subject).not.toMatch(/\d+\s*points?/i);
    expect(statement.body).toMatch(/ledger balance:\s*40 points/i);
    expect(statement.body).toMatch(/reserved(?: for active requests)?:\s*15 points/i);
    expect(statement.body).toMatch(/available(?: to spend)?:\s*25 points/i);
    expect(statement.body).not.toContain('Design iteration');

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
    expect(h.call('getSchoolRewardsIntegrityReport', {})).toMatchObject({ ok: true, ready: true });

    expect(() => h.call('refundSchoolRewardsOrder', { orderId: submitted.id, reason: 'Wrong workflow', idempotencyKey: 'wrong_print_refund1' })).toThrow(/print-request refund/i);
    const refundInput = { requestId: submitted.id, reason: 'Print could not be delivered', idempotencyKey: 'print_refund_flow_1' };
    const refund = h.call('refundSchoolRewardsPrintRequest', refundInput);
    const refundRetry = h.call('refundSchoolRewardsPrintRequest', refundInput);
    expect(refund).toMatchObject({ restoredPoints: 15, balance: 40, reservedPoints: 0, availableBalance: 40, request: { status: 'REFUNDED' }, receipt: { kind: 'REFUND', status: 'SENT' } });
    expect(refundRetry.ledgerId).toBe(refund.ledgerId);
    expect(h.rows('Ledger')).toHaveLength(4);
    expect(h.rows('Receipts')).toHaveLength(3);
    expect(h.rows('Orders')[1][4]).toBe('REFUNDED');
    expect(h.call('getSchoolRewardsIntegrityReport', {})).toMatchObject({ ok: true, ready: true });
  });

  it('releases a confirmed print reservation on student cancellation without spending', () => {
    const h = harness(); const student = setup(h); const category = seededCategory(h);
    h.setActive(STAFF); h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 20, categoryId: category.id, reason: 'Recognition', idempotencyKey: 'award_cancel_print1' });
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
    expect(() => h.call('reviewSchoolRewardsPrintAsset', { assetId: uploaded.asset.id, action: 'VERIFY', reason: '', idempotencyKey: 'v4_asset_verify_blank' })).toThrow(/meaningful.*review evidence/i);
    expect(() => h.call('reviewSchoolRewardsPrintAsset', { assetId: uploaded.asset.id, action: 'REJECT', reason: 'No', idempotencyKey: 'v4_asset_reject_short' })).toThrow(/meaningful.*review evidence/i);
    const verified = h.call('reviewSchoolRewardsPrintAsset', { assetId: uploaded.asset.id, action: 'VERIFY', reason: 'Container reviewed.', idempotencyKey: 'v4_asset_verify01' });
    expect(verified).toMatchObject({ asset: { status: 'VERIFIED' }, model: { assetStatus: 'READY' } });
    expect(JSON.stringify(verified)).not.toMatch(/driveFileId|printableFileId|originalFileId|file-\d/);
    h.setActive(STUDENT);
    expect(() => h.call('uploadSchoolRewardsPrintAsset', { ...uploadInput, idempotencyKey: 'v4_asset_wronghash', contentHash: 'f'.repeat(64) })).toThrow(/hash/i);
  });

  it('enforces community remix permission in the generic model path while preserving own versions', () => {
    const h = harness(); const student = setup(h); h.setActive(STUDENT);
    const recipe = { parts: [{ shape: 'box', size: [1, 0.2, 0.4], position: [0, 0, 0], rotation: [0, 0, 0], color: '#2563eb' }] };
    const source = h.call('createSchoolRewardsPrintModel', {
      title: 'Original bridge', sourceFormat: 'RECIPE', recipe,
      widthMm: 50, depthMm: 20, heightMm: 10, triangleCount: 12,
      idempotencyKey: 'generic_remix_source1',
    }).model;
    const ownVersion = h.call('createSchoolRewardsPrintModel', {
      title: 'Original bridge v2', sourceFormat: 'RECIPE', recipe, previousVersionId: source.id,
      widthMm: 55, depthMm: 20, heightMm: 10, triangleCount: 12,
      idempotencyKey: 'generic_own_version02',
    }).model;
    expect(ownVersion).toMatchObject({ familyId: source.familyId, version: 2, previousVersionId: source.id });

    h.setDataCell('PrintModels', 0, 23, 'PUBLISHED');
    h.setDataCell('PrintModels', 0, 27, 'SCHOOL_VIEW_PRINT');
    const secondEmail = `bailey@${DOMAIN}`;
    h.setActive(ADMIN);
    h.call('adminUpsertRewardsStudent', { firstName: 'Bailey', lastInitial: 'Q', grade: '5', homeroom: '5B', email: secondEmail, active: true });
    h.setActive(secondEmail);
    const remixInput = {
      title: 'Bailey remix', sourceFormat: 'RECIPE', recipe, remixOfModelId: source.id,
      widthMm: 50, depthMm: 20, heightMm: 10, triangleCount: 12,
      idempotencyKey: 'generic_remix_denied1',
    };
    expect(() => h.call('createSchoolRewardsPrintModel', remixInput)).toThrow(/published recipe.*remix permission/i);
    h.setDataCell('PrintModels', 0, 27, 'SCHOOL_REMIX_PRINT');
    const allowed = h.call('createSchoolRewardsPrintModel', { ...remixInput, idempotencyKey: 'generic_remix_allowed1' }).model;
    expect(allowed).toMatchObject({ remixOfModelId: source.id, version: 1, publicationStatus: 'PRIVATE' });
    h.setDataCell('PrintModels', 0, 8, 'GLB');
    expect(() => h.call('createSchoolRewardsPrintModel', { ...remixInput, idempotencyKey: 'generic_remix_glbdeny1' })).toThrow(/published recipe.*remix permission/i);
    expect(student.id).not.toBe(allowed.id);
  });

  it('enforces per-student Print Lab storage limits before creating Drive files', () => {
    const modelH = harness(); const modelStudent = setup(modelH); modelH.setActive(STUDENT);
    const limits = modelH.printLimits();
    expect(limits).toMatchObject({ models: 100, assets: 50, bytes: 64 * 1024 * 1024, dailyUploads: 10 });
    for (let index = 0; index < limits.models; index += 1) {
      const row = Array(31).fill(''); row[0] = `quota-model-${index}`; row[1] = modelStudent.id;
      modelH.appendRaw('PrintModels', row);
    }
    const modelFilesBefore = modelH.fileCount();
    expect(() => modelH.call('createSchoolRewardsPrintModel', {
      title: 'One model too many', sourceFormat: 'RECIPE',
      recipe: { parts: [{ shape: 'box', size: [1, 1, 1], position: [0, 0, 0], rotation: [0, 0, 0], color: '#2563eb' }] },
      widthMm: 20, depthMm: 20, heightMm: 20, triangleCount: 12,
      idempotencyKey: 'quota_model_blocked01',
    })).toThrow(/model limit/i);
    expect(modelH.fileCount()).toBe(modelFilesBefore);

    const addAssetRows = (h, fixture, count, byteSize, uploadedAt, prefix) => {
      for (let index = 0; index < count; index += 1) {
        h.appendRaw('PrintAssets', [
          `${prefix}-${index}`, fixture.input.modelId, fixture.student.id, `${prefix}.glb`, 'GLB',
          'model/gltf-binary', fixture.input.contentHash, byteSize, `private-drive-${prefix}-${index}`,
          'REJECTED', 'Historical review', uploadedAt, uploadedAt, 'reviewer-hash', uploadedAt,
        ]);
      }
    };

    const countH = harness(); const countFixture = printAssetUploadFixture(countH, 'count');
    addAssetRows(countH, countFixture, countH.printLimits().assets, 1, '2025-01-01T12:00:00.000Z', 'count');
    const countFilesBefore = countH.fileCount();
    expect(() => countH.call('uploadSchoolRewardsPrintAsset', countFixture.input)).toThrow(/asset limit/i);
    expect(countH.fileCount()).toBe(countFilesBefore);

    const bytesH = harness(); const bytesFixture = printAssetUploadFixture(bytesH, 'bytes');
    addAssetRows(bytesH, bytesFixture, 1, bytesH.printLimits().bytes,  '2025-01-01T12:00:00.000Z', 'bytes');
    const bytesFilesBefore = bytesH.fileCount();
    expect(() => bytesH.call('uploadSchoolRewardsPrintAsset', bytesFixture.input)).toThrow(/storage limit/i);
    expect(bytesH.fileCount()).toBe(bytesFilesBefore);

    const dailyH = harness(); const dailyFixture = printAssetUploadFixture(dailyH, 'daily');
    addAssetRows(dailyH, dailyFixture, dailyH.printLimits().dailyUploads, 1, new Date().toISOString(), 'daily');
    const dailyFilesBefore = dailyH.fileCount();
    expect(() => dailyH.call('uploadSchoolRewardsPrintAsset', dailyFixture.input)).toThrow(/today.*upload limit/i);
    expect(dailyH.fileCount()).toBe(dailyFilesBefore);
  });

  it('keeps immutable request lineage and moderates publication, reporting, and recipe remixing', () => {
    const h = harness(); setup(h);
    h.setActive(ADMIN); const windowItem = h.call('adminUpsertRewardsWindow', { name: 'Revision window', status: 'PREVIEW' }).window;
    h.setActive(STUDENT);
    const base = { sourceFormat: 'RECIPE', recipe: { parts: [{ shape: 'box', size: [1, 0.2, 0.4], position: [0, 0, 0], rotation: [0, 0, 0], color: '#2563eb' }] }, widthMm: 50, depthMm: 20, heightMm: 10, triangleCount: 12, aiUse: 'ASSISTED', aiDisclosure: 'Private drafting note: student-marker@example.test' };
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
    const community = h.call('getSchoolRewardsPrintBootstrap').communityModels[0];
    expect(community).not.toHaveProperty('aiDisclosure');
    expect(community).not.toHaveProperty('contentHash');
    expect(JSON.stringify(community)).not.toContain('student-marker@example.test');
    const remix = h.call('remixSchoolRewardsPrintModel', { modelId: v2.id, title: 'My bridge remix', idempotencyKey: 'v4_remix_model001' }).model;
    expect(remix).toMatchObject({ version: 1, remixOfModelId: v2.id, publicationStatus: 'PRIVATE' });
    const reported = h.call('reviewSchoolRewardsPrintPublication', { publicationId: publication.id, action: 'REPORT', reason: 'Needs another safety review.', idempotencyKey: 'v4_publish_report1' });
    expect(reported.publication).toMatchObject({ status: 'REPORTED', reportCount: 1 });
    expect(h.call('getSchoolRewardsPrintBootstrap').communityModels).toHaveLength(0);
  });

  it('protects guardian digest privacy, audits deactivation, and exports only district aggregates', () => {
    const h = harness(); const student = setup(h); const category = seededCategory(h);
    const guardianInput = { studentId: student.id, guardianEmail: 'guardian@family.example', guardianName: 'Family Member', relationship: 'Guardian', active: true, consentConfirmed: true, idempotencyKey: 'v4_guardian_map01' };
    const guardian = h.call('adminUpsertSchoolRewardsGuardian', guardianInput).guardian;
    h.setActive(STAFF); h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 14, categoryId: category.id, reason: 'Private classroom observation', idempotencyKey: 'v4_guardian_award1' });
    h.setActive(ADMIN);
    const digest = h.call('sendSchoolRewardsGuardianDigests', { periodKey: '2026-t1-positive', limit: 20, idempotencyKey: 'v4_guardian_send01' });
    expect(digest).toMatchObject({ sent: 1, failed: 0 });
    expect(h.mail.at(-1).to).toBe('guardian@family.example');
    expect(h.mail.at(-1).body).toContain('14 points');
    expect(h.mail.at(-1).body).not.toContain('Private classroom observation');
    expect(h.mail.at(-1).body).not.toContain(STUDENT);
    expect(() => h.call('adminUpsertSchoolRewardsGuardian', { ...guardianInput, id: guardian.id, active: false, consentConfirmed: false, idempotencyKey: 'v4_guardian_disable_bad' })).toThrow(/why|explain/i);
    const disabled = h.call('adminUpsertSchoolRewardsGuardian', { ...guardianInput, id: guardian.id, active: false, consentConfirmed: false, deactivationReason: 'Family requested messages stop.', idempotencyKey: 'v4_guardian_disable01' }).guardian;
    expect(disabled).toMatchObject({ active: false, consentConfirmedAt: '' });
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
    expect(() => h.call('adminUpsertSchoolRewardsGuardian', { ...guardianInput, id: guardian.id, active: true, consentConfirmed: false, idempotencyKey: 'v4_guardian_reenable_bad' })).toThrow(/current permission to email/i);
    const reenabled = h.call('adminUpsertSchoolRewardsGuardian', { ...guardianInput, id: guardian.id, active: true, consentConfirmed: true, idempotencyKey: 'v4_guardian_reenable01' }).guardian;
    expect(reenabled.active).toBe(true);
    expect(reenabled.consentConfirmedAt).toBeTruthy();
  });

  it('binds SIS apply to previewed content and roster revision while allowing exact retries', () => {
    const h = harness(); const existingStudent = setup(h);
    const snapshot = { formatVersion: 'alloflow-sis-roster/1', snapshotId: 'snapshot-2026-t1', students: [
      { firstName: 'Avery', lastInitial: 'R', grade: '5', homeroom: '5A', email: STUDENT },
      { firstName: 'Jordan', lastInitial: 'K', grade: '6', homeroom: '6B', email: `jordan@${DOMAIN}` },
    ] };
    const preview = h.call('previewSchoolRewardsSisSnapshot', snapshot);
    expect(preview).toMatchObject({ counts: { created: 1, unchanged: 1, total: 2 }, deactivationSupported: false });
    expect(() => h.call('applySchoolRewardsSisSnapshot', {
      ...snapshot,
      students: [snapshot.students[0], { ...snapshot.students[1], id: existingStudent.id }],
      expectedContentHash: preview.contentHash,
      expectedRosterRevision: preview.rosterRevision,
      idempotencyKey: 'v4_sis_retarget_create',
    })).toThrow(/content no longer matches/i);
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

  it('migrates legacy catalog snapshots to one deterministic v5 baseline and resumes after a crash', () => {
    const h = harness(); setup(h); h.simulateV4Inventory();
    const at = '2026-08-01T12:00:00.000Z';
    h.appendRaw('Catalog', ['legacy_item_01', 'Legacy notebook', 'Pre-v5 stock', 8, 12, 7, true, '', at, at]);
    h.setCoreFault('migration_v5:after_movement');
    expect(() => h.call('migrateSchoolRewardsRepositoryV5')).toThrow(/Injected core fault/);
    expect(h.configValue('schemaVersion')).toBe('4');
    expect(h.rows('Catalog')[0][10]).toBe('InventoryVersion');
    expect(h.rows('Catalog')[1][10] || 0).toBe(0);
    expect(h.rows('InventoryMovements')).toHaveLength(2);
    expect(h.rows('InventoryMovements')[1][0]).toMatch(/^inventory_/);

    const migrated = h.call('migrateSchoolRewardsRepositoryV5');
    expect(migrated).toMatchObject({ ok: true, version: 5, migratedCatalogItems: 1, baselineMovements: 0 });
    expect(h.configValue('schemaVersion')).toBe('5');
    expect(h.rows('Catalog')[1].slice(4, 6)).toEqual([12, 7]);
    expect(h.rows('Catalog')[1][10]).toBe(1);
    expect(h.rows('InventoryMovements')[1].slice(1, 9)).toEqual(['legacy_item_01', 1, 'MIGRATION_BASELINE', 0, 12, 7, 12, 7]);
    const retry = h.call('migrateSchoolRewardsRepositoryV5');
    expect(retry).toMatchObject({ ok: true, version: 5, migratedCatalogItems: 0, baselineMovements: 0 });
    expect(h.rows('InventoryMovements')).toHaveLength(2);
  });

  it('refuses the v5 migration before schema writes while a core journal is pending', () => {
    const h = harness(); const student = setup(h); const category = seededCategory(h);
    h.setActive(STAFF);
    h.setCoreFault('award:after_intent');
    expect(() => h.call('awardSchoolRewardsPoints', {
      studentId: student.id, amount: 4, categoryId: category.id, reason: 'Pending migration gate',
      idempotencyKey: 'award_migration_gate1',
    })).toThrow(/Injected core fault/);
    h.setActive(ADMIN); h.simulateV4Inventory();
    expect(() => h.call('migrateSchoolRewardsRepositoryV5')).toThrow(/previous rewards transaction/i);
    expect(h.rows('Catalog')[0]).toHaveLength(10);
    expect(h.configValue('schemaVersion')).toBe('4');
  });

  it('recovers catalog initialization and inventory adjustment without duplicate movement rows', () => {
    const h = harness(); setup(h);
    const createInput = { name: 'Crash-safe notebook', cost: 9, inventoryLimit: 6, idempotencyKey: 'catalog_crash_create1' };
    h.setCoreFault('catalog:after_movement');
    expect(() => h.call('adminUpsertRewardsCatalogItem', createInput)).toThrow(/Injected core fault/);
    expect(h.rows('Catalog')).toHaveLength(1);
    expect(h.rows('InventoryMovements')).toHaveLength(2);
    const created = h.call('adminUpsertRewardsCatalogItem', createInput).item;
    expect(created).toMatchObject({ name: 'Crash-safe notebook', remaining: 6, inventoryVersion: 1 });
    expect(h.rows('InventoryMovements')).toHaveLength(2);

    const adjustInput = {
      id: created.id, inventoryLimit: 8, remaining: 7, expectedInventoryVersion: 1,
      reason: 'Counted and added two units', idempotencyKey: 'catalog_crash_adjust1',
    };
    h.setCoreFault('catalog:after_movement');
    expect(() => h.call('adminUpsertRewardsCatalogItem', adjustInput)).toThrow(/Injected core fault/);
    expect(h.call('getSchoolRewardsBootstrap').catalog[0]).toMatchObject({ inventoryLimit: 6, remaining: 6, inventoryVersion: 1 });
    const adjusted = h.call('adminUpsertRewardsCatalogItem', adjustInput).item;
    expect(adjusted).toMatchObject({ name: created.name, cost: created.cost, inventoryLimit: 8, remaining: 7, inventoryVersion: 2 });
    expect(h.rows('InventoryMovements')).toHaveLength(3);
    expect(h.rows('InventoryMovements')[2].slice(2, 9)).toEqual([2, 'ADMIN_ADJUST', 1, 6, 6, 8, 7]);
    expect(h.call('getSchoolRewardsIntegrityReport', {})).toMatchObject({ ok: true, summary: { inventoryMovements: 2 } });
  });

  it('replays a multi-item checkout and tracks unlimited sale/refund movements without changing -1 markers', () => {
    const h = harness(); const student = setup(h); const category = seededCategory(h);
    h.setActive(STAFF);
    h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 100, categoryId: category.id, reason: 'Multi-item store funding', idempotencyKey: 'award_multi_inventory1' });
    h.setActive(ADMIN);
    const finite = h.call('adminUpsertRewardsCatalogItem', { name: 'Finite kit', cost: 10, inventoryLimit: 5, idempotencyKey: 'catalog_multi_finite1' }).item;
    const unlimited = h.call('adminUpsertRewardsCatalogItem', { name: 'Unlimited pass', cost: 5, inventoryLimit: -1, idempotencyKey: 'catalog_multi_unlimited1' }).item;
    const windowItem = h.call('adminUpsertRewardsWindow', { name: 'Movement store', status: 'OPEN' }).window;
    h.setActive(CASHIER);
    const checkoutInput = {
      studentId: student.id, windowId: windowItem.id,
      lines: [{ catalogId: finite.id, quantity: 2 }, { catalogId: unlimited.id, quantity: 3 }],
      idempotencyKey: 'checkout_multi_movement1',
    };
    h.setCoreFault('checkout:after_inventory_movement');
    expect(() => h.call('checkoutSchoolRewardsOrder', checkoutInput)).toThrow(/Injected core fault/);
    const checkout = h.call('checkoutSchoolRewardsOrder', checkoutInput);
    expect(checkout).toMatchObject({ balance: 65, order: { total: 35, status: 'COMPLETED' } });
    let catalog = h.call('getSchoolRewardsBootstrap').catalog;
    expect(catalog.find(item => item.id === finite.id)).toMatchObject({ remaining: 3, inventoryVersion: 2 });
    expect(catalog.find(item => item.id === unlimited.id)).toMatchObject({ remaining: -1, inventoryVersion: 2 });
    expect(h.rows('InventoryMovements').filter(row => row[3] === 'SALE')).toHaveLength(2);
    const unlimitedSale = h.rows('InventoryMovements').find(row => row[1] === unlimited.id && row[3] === 'SALE');
    expect(unlimitedSale.slice(4, 9)).toEqual([-3, -1, -1, -1, -1]);

    h.setActive(ADMIN);
    const refundInput = { orderId: checkout.order.id, reason: 'Whole order returned', idempotencyKey: 'refund_multi_movement1' };
    h.setCoreFault('refund:after_inventory_movement');
    expect(() => h.call('refundSchoolRewardsOrder', refundInput)).toThrow(/Injected core fault/);
    h.call('refundSchoolRewardsOrder', refundInput);
    catalog = h.call('getSchoolRewardsBootstrap').catalog;
    expect(catalog.find(item => item.id === finite.id)).toMatchObject({ remaining: 5, inventoryVersion: 3 });
    expect(catalog.find(item => item.id === unlimited.id)).toMatchObject({ remaining: -1, inventoryVersion: 3 });
    expect(h.rows('InventoryMovements').filter(row => row[3] === 'REFUND')).toHaveLength(2);
    expect(h.call('getSchoolRewardsIntegrityReport', {})).toMatchObject({ ok: true, checks: { inventoryMovementChain: true } });
  });

  it('fails stale inventory edits before journal writes and requires explicit finite/unlimited transitions', () => {
    const h = harness(); setup(h);
    const created = h.call('adminUpsertRewardsCatalogItem', {
      name: 'Transition prize', description: 'Metadata must survive inventory-only calls', cost: 11,
      inventoryLimit: 5, idempotencyKey: 'catalog_transition_create1',
    }).item;
    const beforeStale = { movements: h.rows('InventoryMovements'), idempotency: h.rows('Idempotency'), catalog: h.rows('Catalog') };
    expect(() => h.call('adminUpsertRewardsCatalogItem', {
      id: created.id, inventoryLimit: 5, remaining: 4, expectedInventoryVersion: 0,
      reason: 'Physical stock correction', idempotencyKey: 'catalog_stale_adjust01',
    })).toThrow(/changed after.*loaded|refresh.*catalog/i);
    expect(h.rows('InventoryMovements')).toEqual(beforeStale.movements);
    expect(h.rows('Idempotency')).toEqual(beforeStale.idempotency);
    expect(h.rows('Catalog')).toEqual(beforeStale.catalog);

    expect(() => h.call('adminUpsertRewardsCatalogItem', {
      id: created.id, inventoryLimit: -1, remaining: -1, expectedInventoryVersion: 1,
      reason: 'Prize is now made to order', idempotencyKey: 'catalog_transition_missing1',
    })).toThrow(/explicit.*TO_UNLIMITED|transition/i);
    expect(h.rows('InventoryMovements')).toHaveLength(2);

    const unlimited = h.call('adminUpsertRewardsCatalogItem', {
      id: created.id, inventoryLimit: -1, remaining: -1, expectedInventoryVersion: 1,
      inventoryTransition: 'TO_UNLIMITED', reason: 'Prize is now made to order',
      idempotencyKey: 'catalog_transition_unlimited1',
    }).item;
    expect(unlimited).toMatchObject({ name: created.name, description: created.description, cost: created.cost, inventoryLimit: -1, remaining: -1, inventoryVersion: 2 });

    const finite = h.call('adminUpsertRewardsCatalogItem', {
      id: created.id, inventoryLimit: 10, remaining: 7, expectedInventoryVersion: 2,
      inventoryTransition: 'TO_FINITE', reason: 'Seven physical prizes received',
      idempotencyKey: 'catalog_transition_finite1',
    }).item;
    expect(finite).toMatchObject({ inventoryLimit: 10, remaining: 7, inventoryVersion: 3 });
    const renamed = h.call('adminUpsertRewardsCatalogItem', {
      id: created.id, name: 'Renamed transition prize', idempotencyKey: 'catalog_metadata_partial1',
    }).item;
    expect(renamed).toMatchObject({ name: 'Renamed transition prize', cost: created.cost, inventoryLimit: 10, remaining: 7, inventoryVersion: 3 });
    expect(h.rows('InventoryMovements')).toHaveLength(4);
    expect(h.call('getSchoolRewardsIntegrityReport', {})).toMatchObject({ ok: true });
  });

  it('detects movement hash, version, continuity, snapshot, and signed-journal corruption read-only', () => {
    const h = harness(); const student = setup(h); const category = seededCategory(h);
    h.setActive(STAFF);
    h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 20, categoryId: category.id, reason: 'Integrity movement funding', idempotencyKey: 'award_movement_integrity1' });
    h.setActive(ADMIN);
    const prize = h.call('adminUpsertRewardsCatalogItem', { name: 'Integrity chain prize', cost: 5, inventoryLimit: 4, idempotencyKey: 'catalog_movement_integrity1' }).item;
    const windowItem = h.call('adminUpsertRewardsWindow', { name: 'Integrity movement store', status: 'OPEN' }).window;
    h.setActive(CASHIER);
    h.call('checkoutSchoolRewardsOrder', { studentId: student.id, windowId: windowItem.id, lines: [{ catalogId: prize.id, quantity: 1 }], idempotencyKey: 'checkout_movement_integrity1' });
    h.setActive(ADMIN);
    expect(h.call('getSchoolRewardsIntegrityReport', {})).toMatchObject({ ok: true, summary: { inventoryMovements: 2 } });
    const beforeReport = JSON.stringify({ catalog: h.rows('Catalog'), movements: h.rows('InventoryMovements'), idempotency: h.rows('Idempotency') });

    h.setDataCell('InventoryMovements', 1, 2, 4);
    h.setDataCell('InventoryMovements', 1, 16, 'i1_wrong_previous_hash');
    h.setDataCell('InventoryMovements', 1, 17, 'i1_wrong_hash');
    h.setDataCell('Catalog', 0, 5, 99);
    const corruptedState = JSON.stringify({ catalog: h.rows('Catalog'), movements: h.rows('InventoryMovements'), idempotency: h.rows('Idempotency') });
    expect(corruptedState).not.toBe(beforeReport);
    const report = h.call('getSchoolRewardsIntegrityReport', {});
    expect(report).toMatchObject({ ok: false, ready: false, checks: { inventoryMovementChain: true } });
    expect(report.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'INVENTORY_VERSION_GAP', severity: 'ERROR' }),
      expect.objectContaining({ code: 'INVENTORY_HASH_CHAIN_BROKEN', severity: 'ERROR' }),
      expect.objectContaining({ code: 'INVENTORY_HASH_INVALID', severity: 'ERROR' }),
      expect.objectContaining({ code: 'INVENTORY_CATALOG_SNAPSHOT_DRIFT', severity: 'ERROR' }),
      expect.objectContaining({ code: 'JOURNAL_INVENTORY_MOVEMENT_MISMATCH', severity: 'ERROR' }),
    ]));
    expect(JSON.stringify({ catalog: h.rows('Catalog'), movements: h.rows('InventoryMovements'), idempotency: h.rows('Idempotency') })).toBe(corruptedState);
  });

  it('keeps inventory and version writes inside movement materialization with an isolated legacy recovery guard', () => {
    expect(SOURCE).not.toMatch(/function (?:upsertCatalogRow_|decrementInventory_|incrementInventory_)\b/);
    expect((SOURCE.match(/upsert_\(sheet_\(book, 'Catalog'\)/g) || [])).toHaveLength(2);
    expect(SOURCE).toMatch(/function writeCatalogInventorySnapshot_[\s\S]*inventoryVersion/);
    expect(SOURCE).toMatch(/function reconcileInventoryPlan_[\s\S]*item\.inventoryVersion !== 0[\s\S]*legacy inventory plan/i);
    const metadataWriter = SOURCE.slice(SOURCE.indexOf('function writeCatalogMetadataOnly_'), SOURCE.indexOf('function applyInventoryMovement_'));
    expect(metadataWriter).not.toMatch(/getRange\(rowIndex, (?:5|6|11)\b/);
  });

  it('migrates v5 to v6 additively and keeps the explicit v4 through v5 through v6 path', () => {
    const h = harness(); setup(h); h.simulateV5Mail(); h.setProperty('SR_MAIL_DELIVERY_SECRET', '');
    expect(h.configValue('schemaVersion')).toBe('5');
    const migrated = h.call('migrateSchoolRewardsRepositoryV6');
    expect(migrated).toMatchObject({ ok: true, version: 6 });
    expect(h.rows('MailRuns')[0]).toEqual(['Id', 'Kind', 'PeriodKey', 'RequestedLimit', 'CursorKey', 'Attempted', 'Sent', 'Skipped', 'Failed', 'Uncertain', 'Status', 'ActorHash', 'OperationHash', 'CreatedAt', 'UpdatedAt', 'CompletedAt', 'LastError']);
    expect(h.rows('MailOutbox')[0]).toEqual(['Id', 'RunId', 'DeliveryKey', 'Kind', 'StudentId', 'GuardianId', 'RecipientHash', 'ConsentConfirmedAt', 'PeriodKey', 'PayloadJson', 'PayloadHash', 'Status', 'CreatedAt', 'AttemptedAt', 'SettledAt', 'ErrorCode', 'Error', 'RetryOfId', 'ResolvedAt', 'ResolvedByHash', 'ResolutionNote']);
    expect(h.getProperty('SR_MAIL_DELIVERY_SECRET')).toBeTruthy();
    expect(h.call('migrateSchoolRewardsRepositoryV6')).toEqual(migrated);
    expect(h.rows('MailRuns')).toHaveLength(1);
    expect(h.rows('MailOutbox')).toHaveLength(1);

    const old = harness(); setup(old); old.simulateV4Inventory();
    expect(() => old.call('migrateSchoolRewardsRepositoryV6')).toThrow(/schema v5 inventory migration/i);
    expect(old.configValue('schemaVersion')).toBe('4');
    expect(old.call('migrateSchoolRewardsRepositoryV5')).toMatchObject({ version: 5 });
    expect(old.call('migrateSchoolRewardsRepositoryV6')).toMatchObject({ version: 6 });
  });

  it('schedules recovery immediately after a durable run start', () => {
    const h = harness(); setup(h);
    const request = { periodKey: '2026-v6-start-watchdog', limit: 5, idempotencyKey: 'mail_v6_start_watchdog_1' };
    h.setCoreFault('mail:after_start');
    expect(() => h.call('sendSchoolRewardsBalanceStatements', request)).toThrow(/Injected core fault/);
    h.clearCoreFault();
    expect(h.rows('MailRuns')).toHaveLength(2);
    expect(h.rows('MailRuns')[1][10]).toBe('QUEUED');
    expect(h.triggers()).toEqual([expect.objectContaining({ handler: 'continueSchoolRewardsMailRuns', afterMs: 300000 })]);
    expect(h.call('continueSchoolRewardsMailRuns')).toMatchObject({ sent: 1, status: 'COMPLETED' });
    expect(h.call('sendSchoolRewardsBalanceStatements', request)).toMatchObject({ sent: 1, status: 'COMPLETED' });
    expect(h.mail).toHaveLength(1);
    expect(h.rows('MailRuns')).toHaveLength(2);
    expect(h.triggers()).toEqual([]);
    expect(h.rows('Audit').filter(row => row[1] === 'MAIL_RUN_CREATED' && row[3] === h.rows('MailRuns')[1][0])).toHaveLength(1);
    expect(h.rows('Audit').filter(row => row[1] === 'MAIL_RUN_COMPLETED' && row[3] === h.rows('MailRuns')[1][0])).toHaveLength(1);
  });

  it('flushes a signed PENDING attempt under lock before sending outside the lock', () => {
    const h = harness(); setup(h);
    const result = h.call('sendSchoolRewardsBalanceStatements', { periodKey: '2026-v6-flush', limit: 10, idempotencyKey: 'mail_v6_flush_001' });
    expect(result).toMatchObject({ sent: 1, failed: 0, uncertain: 0, pending: 0, status: 'COMPLETED', remaining: 0, canResume: false, continuationScheduled: false });
    expect(h.mailObservations).toHaveLength(1);
    expect(h.mailObservations[0]).toMatchObject({ lockHeld: false });
    expect(h.mailObservations[0].flushCount).toBeGreaterThan(0);
    expect(h.mailObservations[0].outbox[1][11]).toBe('PENDING');
    expect(h.rows('MailOutbox')[1][11]).toBe('SENT');
    expect(h.rows('MailOutbox')[1][9]).not.toContain(STUDENT);
    const view = h.call('getSchoolRewardsMailRun', { runId: result.runId });
    expect(view.run).toMatchObject({ runId: result.runId, pending: 0, remaining: 0, canResume: false });
    expect(Object.keys(view.deliveries[0]).sort()).toEqual(['attemptedAt', 'canRetry', 'errorCode', 'id', 'kind', 'resolvedAt', 'retryOfId', 'runId', 'status'].sort());
    expect(view.deliveries[0].canRetry).toBe(false);
    expect(JSON.stringify(view)).not.toContain(STUDENT);
    expect(h.call('sendSchoolRewardsBalanceStatements', { periodKey: '2026-v6-flush', limit: 10, idempotencyKey: 'mail_v6_flush_001' })).toMatchObject({ runId: result.runId, sent: 1, status: 'COMPLETED' });
    expect(h.mail).toHaveLength(1);
    expect(h.rows('MailOutbox')).toHaveLength(2);
  });

  it('never resends an attempt interrupted after PENDING and exposes one explicit failed-to-retry path', () => {
    const h = harness(); setup(h);
    const request = { periodKey: '2026-v6-pre-send-crash', limit: 10, idempotencyKey: 'mail_v6_pending_001' };
    h.setCoreFault('mail:after_pending');
    expect(() => h.call('sendSchoolRewardsBalanceStatements', request)).toThrow(/Injected core fault/);
    expect(h.mail).toHaveLength(0);
    expect(h.rows('MailOutbox')[1][11]).toBe('PENDING');
    h.clearCoreFault();
    const replay = h.call('sendSchoolRewardsBalanceStatements', request);
    expect(replay).toMatchObject({ sent: 0, uncertain: 0, pending: 1, status: 'RUNNING', canResume: false, continuationScheduled: true });
    expect(h.mail).toHaveLength(0);
    const outboxId = h.rows('MailOutbox')[1][0];
    expect(h.call('getSchoolRewardsBootstrap').unresolvedMailDeliveries).toEqual([]);
    expect(() => h.call('resolveSchoolRewardsMailDelivery', { outboxId, status: 'FAILED', note: 'Verified no message in the managed mailbox.', idempotencyKey: 'mail_v6_resolve_fresh' })).toThrow(/only an unknown delivery/i);
    h.setDataCell('MailOutbox', 0, 13, '2020-01-01T00:00:00.000Z'); h.resignMailOutbox(0);
    expect(h.call('continueSchoolRewardsMailRuns')).toMatchObject({ status: 'NEEDS_REVIEW', pending: 0, uncertain: 1 });
    expect(h.call('getSchoolRewardsBootstrap').unresolvedMailDeliveries[0]).toMatchObject({ id: outboxId, status: 'UNKNOWN' });
    const resolved = h.call('resolveSchoolRewardsMailDelivery', { outboxId, status: 'FAILED', note: 'Verified no message in the managed mailbox.', idempotencyKey: 'mail_v6_resolve_001' });
    expect(resolved.delivery).toMatchObject({ id: outboxId, status: 'FAILED' });
    expect(h.call('getSchoolRewardsBootstrap').unresolvedMailDeliveries[0]).toMatchObject({ id: outboxId, status: 'FAILED', canRetry: true });
    const retried = h.call('retrySchoolRewardsMailDelivery', { outboxId, idempotencyKey: 'mail_v6_retry_0001' });
    expect(retried).toMatchObject({ ok: true, delivery: { status: 'SENT', retryOfId: outboxId }, run: { status: 'COMPLETED' } });
    expect(h.call('retrySchoolRewardsMailDelivery', { outboxId, idempotencyKey: 'mail_v6_retry_0001' })).toEqual(retried);
    expect(h.rows('MailOutbox')).toHaveLength(3);
    expect(h.mail).toHaveLength(1);
    expect(h.call('getSchoolRewardsBootstrap').unresolvedMailDeliveries).toEqual([]);
    expect(h.call('resolveSchoolRewardsMailDelivery', { outboxId, status: 'FAILED', note: 'Verified no message in the managed mailbox.', idempotencyKey: 'mail_v6_resolve_001' }).delivery.canRetry).toBe(false);
    expect(() => h.call('retrySchoolRewardsMailDelivery', { outboxId, idempotencyKey: 'mail_v6_retry_0002' })).toThrow(/already has a retry/i);
  });

  it('does not duplicate sends after post-send or settlement persistence faults', () => {
    const afterSend = harness(); setup(afterSend);
    const sendRequest = { periodKey: '2026-v6-after-send', limit: 5, idempotencyKey: 'mail_v6_after_send1' };
    afterSend.setCoreFault('mail:after_send');
    expect(() => afterSend.call('sendSchoolRewardsBalanceStatements', sendRequest)).toThrow(/Injected core fault/);
    expect(afterSend.mail).toHaveLength(1);
    expect(afterSend.rows('MailOutbox')[1][11]).toBe('PENDING');
    afterSend.clearCoreFault();
    expect(afterSend.call('sendSchoolRewardsBalanceStatements', sendRequest)).toMatchObject({ status: 'RUNNING', uncertain: 0, pending: 1, continuationScheduled: true });
    expect(afterSend.mail).toHaveLength(1);

    const settle = harness(); setup(settle);
    const settleRequest = { periodKey: '2026-v6-settle-fault', limit: 5, idempotencyKey: 'mail_v6_settle_001' };
    settle.setMailOutboxUpdateFailure('Injected outbox settlement failure');
    expect(() => settle.call('sendSchoolRewardsBalanceStatements', settleRequest)).toThrow(/settlement failure/i);
    expect(settle.mail).toHaveLength(1);
    expect(settle.rows('MailOutbox')[1][11]).toBe('PENDING');
    settle.setMailOutboxUpdateFailure('');
    expect(settle.call('sendSchoolRewardsBalanceStatements', settleRequest)).toMatchObject({ status: 'RUNNING', uncertain: 0, pending: 1, continuationScheduled: true });
    expect(settle.mail).toHaveLength(1);
  });

  it('treats every MailApp exception as UNKNOWN until an administrator verifies it', () => {
    const h = harness(); setup(h); h.setMailFailure('transport returned an uncertain result for secret@example.test');
    const result = h.call('sendSchoolRewardsBalanceStatements', { periodKey: '2026-v6-mail-error', limit: 5, idempotencyKey: 'mail_v6_error_001' });
    expect(result).toMatchObject({ sent: 0, failed: 0, uncertain: 1, status: 'NEEDS_REVIEW' });
    expect(h.rows('MailOutbox')[1].slice(11, 17)).toEqual(expect.arrayContaining(['UNKNOWN', 'MAIL_SERVICE_AMBIGUOUS', 'Mail service outcome could not be confirmed.']));
    expect(JSON.stringify(h.call('getSchoolRewardsBootstrap'))).not.toContain('secret@example.test');
    expect(h.rows('Audit').flat().join('|')).not.toContain('secret@example.test');
  });

  it('promotes only stale PENDING attempts to UNKNOWN and refuses v6 migration around a pending core journal', () => {
    const h = harness(); setup(h);
    const request = { periodKey: '2026-v6-stale-pending', limit: 5, idempotencyKey: 'mail_v6_stale_001' };
    h.setCoreFault('mail:after_pending');
    expect(() => h.call('sendSchoolRewardsBalanceStatements', request)).toThrow(/Injected core fault/);
    h.clearCoreFault();
    h.setDataCell('MailOutbox', 0, 13, '2020-01-01T00:00:00.000Z');
    h.resignMailOutbox(0);
    expect(h.call('sendSchoolRewardsBalanceStatements', request)).toMatchObject({ status: 'NEEDS_REVIEW', pending: 0, uncertain: 1 });
    expect(h.rows('MailOutbox')[1][11]).toBe('UNKNOWN');
    expect(h.mail).toHaveLength(0);

    const blocked = harness(); const student = setup(blocked); const category = seededCategory(blocked);
    blocked.setActive(STAFF); blocked.setCoreFault('award:after_intent');
    expect(() => blocked.call('awardSchoolRewardsPoints', {
      studentId: student.id, amount: 3, categoryId: category.id, reason: 'Pending mail migration gate',
      idempotencyKey: 'mail_v6_migration_gate',
    })).toThrow(/Injected core fault/);
    blocked.setActive(ADMIN); blocked.simulateV5Mail();
    expect(() => blocked.call('migrateSchoolRewardsRepositoryV6')).toThrow(/previous rewards transaction/i);
    expect(blocked.configValue('schemaVersion')).toBe('5');
    expect(() => blocked.rows('MailRuns')).toThrow();
  });

  it('uses one deterministic weekly run key so a scheduled replay cannot duplicate mail', () => {
    const h = harness(); setup(h);
    h.call('configureSchoolRewardsEmailSchedule', { enabled: true, weekday: 'FRIDAY', hour: 16 });
    const trigger = h.triggers().find(item => item.handler === 'runScheduledSchoolRewardsStatements');
    h.setActive('');
    const first = h.call('runScheduledSchoolRewardsStatements', { triggerUid: trigger.uid });
    const second = h.call('runScheduledSchoolRewardsStatements', { triggerUid: trigger.uid });
    expect(first).toMatchObject({ sent: 1, status: 'COMPLETED' });
    expect(second).toMatchObject({ runId: first.runId, sent: 1, status: 'COMPLETED' });
    expect(first.periodKey).toMatch(/^weekly-\d{4}-\d{2}-\d{2}$/);
    expect(h.rows('MailRuns')).toHaveLength(2);
    expect(h.rows('MailOutbox')).toHaveLength(2);
    expect(h.mail).toHaveLength(1);
  });

  it('uses a stable opaque cursor in 25-recipient chunks and an effective-admin continuation', () => {
    const h = harness(); setup(h);
    h.call('adminBulkUpsertRewardsStudents', Array.from({ length: 29 }, (_, index) => ({
      firstName: `Student ${index}`, lastInitial: 'S', grade: '5', homeroom: '5B',
      email: `student${String(index).padStart(2, '0')}@${DOMAIN}`,
    })));
    h.setMailQuota(1000);
    const first = h.call('sendSchoolRewardsBalanceStatements', { periodKey: '2026-v6-chunks', limit: 30, idempotencyKey: 'mail_v6_chunks_001' });
    expect(first).toMatchObject({ sent: 25, attempted: 25, remaining: 5, status: 'RUNNING', canResume: true, continuationScheduled: true });
    expect(h.rows('MailOutbox')).toHaveLength(26);
    expect(new Set(h.rows('MailOutbox').slice(1).map(row => row[2])).size).toBe(25);
    expect(JSON.parse(h.rows('MailRuns')[1][4])).toMatchObject({ v: 1, i: 25, c: expect.any(Array) });
    expect(h.triggers()).toEqual([expect.objectContaining({ handler: 'continueSchoolRewardsMailRuns', afterMs: 300000 })]);
    const continuationTrigger = h.triggers()[0];
    h.setActive('');
    h.setEffective(STAFF);
    expect(() => h.call('continueSchoolRewardsMailRuns', { triggerUid: continuationTrigger.uid })).toThrow(/trigger owner.*administrator/i);
    h.setEffective(ADMIN);
    h.failNextTriggerCreates(1);
    const completed = h.call('continueSchoolRewardsMailRuns', { triggerUid: continuationTrigger.uid });
    expect(completed).toMatchObject({ sent: 30, attempted: 30, remaining: 0, status: 'COMPLETED', canResume: false, continuationScheduled: false });
    const firingObservation = h.mailObservations[25].triggers.find(item => item.handler === 'continueSchoolRewardsMailRuns');
    expect(firingObservation.uid).not.toBe(continuationTrigger.uid);
    expect(h.mail).toHaveLength(30);
    expect(h.triggers()).toEqual([]);
  });

  it('freezes the candidate set across chunks and timestamps payloads when prepared', () => {
    const h = harness(); setup(h);
    h.call('adminBulkUpsertRewardsStudents', Array.from({ length: 29 }, (_, index) => ({
      firstName: `Frozen ${index}`, lastInitial: 'F', grade: '5', homeroom: '5F',
      email: `frozen${String(index).padStart(2, '0')}@${DOMAIN}`,
    })));
    const firstAsOf = '2030-01-01T12:00:00.000Z', continuedAsOf = '2030-01-02T12:00:00.000Z';
    h.setNow(firstAsOf);
    const first = h.call('sendSchoolRewardsBalanceStatements', { periodKey: '2030-frozen', limit: 30, idempotencyKey: 'mail_v6_frozen_manifest' });
    expect(first).toMatchObject({ sent: 25, remaining: 5 });
    const manifest = JSON.parse(h.rows('MailRuns')[1][4]);
    const deferredStudent = h.call('getSchoolRewardsBootstrap').students.find(student => student.id === manifest.c[25][0]);
    h.call('adminUpsertRewardsStudent', {
      id: deferredStudent.id, firstName: deferredStudent.firstName, lastInitial: deferredStudent.lastInitial,
      grade: deferredStudent.grade, homeroom: deferredStudent.homeroom, email: deferredStudent.email, active: false,
    });
    const insertedEmail = `inserted-after-start@${DOMAIN}`;
    h.call('adminUpsertRewardsStudent', { firstName: 'Inserted', lastInitial: 'I', grade: '5', homeroom: '5F', email: insertedEmail, active: true });
    h.setNow(continuedAsOf);
    const completed = h.call('continueSchoolRewardsMailRuns');
    expect(completed).toMatchObject({ sent: 29, skipped: 1, attempted: 30, remaining: 0, status: 'COMPLETED' });
    expect(h.mail.map(message => message.to)).not.toContain(insertedEmail);
    expect(h.mail.map(message => message.to)).not.toContain(deferredStudent.email);
    const continuedPayloads = h.rows('MailOutbox').slice(1).filter(row => row[13] === continuedAsOf).map(row => JSON.parse(row[9]));
    expect(continuedPayloads).toHaveLength(4);
    expect(continuedPayloads.every(payload => payload.asOf === continuedAsOf)).toBe(true);
    expect(JSON.parse(h.rows('MailRuns')[1][4])).toMatchObject({ v: 1, i: 30 });
  });

  it('repairs a primary delivery persisted before manifest advancement', () => {
    const h = harness(); setup(h);
    h.call('adminUpsertRewardsStudent', { firstName: 'Second', lastInitial: 'S', grade: '5', homeroom: '5A', email: `second-progress@${DOMAIN}`, active: true });
    const request = { periodKey: '2026-v6-progress-window', limit: 2, idempotencyKey: 'mail_v6_progress_window' };
    h.setCoreFault('mail:after_pending_row');
    expect(() => h.call('sendSchoolRewardsBalanceStatements', request)).toThrow(/Injected core fault/);
    expect(h.rows('MailOutbox')).toHaveLength(2);
    expect(JSON.parse(h.rows('MailRuns')[1][4]).i).toBe(0);
    h.clearCoreFault();
    h.setDataCell('MailOutbox', 0, 13, '2020-01-01T00:00:00.000Z');
    h.resignMailOutbox(0);
    expect(h.call('continueSchoolRewardsMailRuns')).toMatchObject({ status: 'NEEDS_REVIEW', uncertain: 1 });
    const sourceId = h.rows('MailOutbox')[1][0];
    h.call('resolveSchoolRewardsMailDelivery', {
      outboxId: sourceId, status: 'FAILED', note: 'Mailbox review confirmed this interrupted attempt was not sent.',
      idempotencyKey: 'mail_v6_progress_resolve',
    });
    const completed = h.call('continueSchoolRewardsMailRuns');
    expect(completed).toMatchObject({ attempted: 2, sent: 1, failed: 1, skipped: 0, remaining: 0, status: 'COMPLETED' });
    expect(h.mail).toHaveLength(1);
    expect(new Set(h.rows('MailOutbox').slice(1).map(row => row[4])).size).toBe(2);
    expect(JSON.parse(h.rows('MailRuns')[1][4])).toMatchObject({ i: 2 });
  });

  it('honors the receipt reserve and schedules only one quota continuation trigger', () => {
    const paused = harness(); setup(paused);
    paused.call('adminBulkUpsertRewardsStudents', Array.from({ length: 9 }, (_, index) => ({
      firstName: `Quota ${index}`, lastInitial: 'Q', grade: '6', homeroom: '6A', email: `quota${index}@${DOMAIN}`,
    })));
    paused.setMailQuota(30);
    const first = paused.call('sendSchoolRewardsBalanceStatements', { periodKey: '2026-v6-quota-a', limit: 10, idempotencyKey: 'mail_v6_quota_0001' });
    expect(first).toMatchObject({ sent: 5, remaining: 5, status: 'PAUSED_QUOTA', continuationScheduled: true });
    expect(paused.triggers()).toEqual([expect.objectContaining({ handler: 'continueSchoolRewardsMailRuns', afterMs: 21600000 })]);
    const second = paused.call('sendSchoolRewardsBalanceStatements', { periodKey: '2026-v6-quota-b', limit: 10, idempotencyKey: 'mail_v6_quota_0002' });
    expect(second.sent).toBe(5);
    expect(paused.triggers()).toHaveLength(1);

    const exhausted = harness(); setup(exhausted);
    exhausted.setMailQuota(25);
    const zero = exhausted.call('sendSchoolRewardsBalanceStatements', { periodKey: '2026-v6-quota-zero', limit: 10, idempotencyKey: 'mail_v6_quota_zero' });
    expect(zero).toMatchObject({ sent: 0, attempted: 0, remaining: 1, status: 'PAUSED_QUOTA', continuationScheduled: true });
    expect(exhausted.rows('MailOutbox')).toHaveLength(1);
    expect(exhausted.triggers()).toEqual([expect.objectContaining({ afterMs: 21600000 })]);
  });

  it('keeps watchdog creation ahead of every durable PENDING write and self-heals trigger faults', () => {
    const pendingOrderings = SOURCE.match(/scheduleMailContinuationLocked_\(SR_MAIL_PENDING_STALE_MS\);\s*coreFault_\('mail:before_pending'\);\s*upsertMailOutbox_\(book, delivery\)/g) || [];
    expect(pendingOrderings).toHaveLength(2);

    const createFault = harness(); setup(createFault);
    createFault.failNextTriggerCreates(1);
    const createRequest = { periodKey: '2026-trigger-create-fault', limit: 1, idempotencyKey: 'mail_trigger_create_fault' };
    expect(() => createFault.call('sendSchoolRewardsBalanceStatements', createRequest)).toThrow(/trigger create failure/i);
    expect(createFault.rows('MailRuns')[1][10]).toBe('QUEUED');
    expect(createFault.rows('MailOutbox')).toHaveLength(1);
    expect(createFault.triggers()).toHaveLength(1);
    expect(createFault.call('continueSchoolRewardsMailRuns')).toMatchObject({ sent: 1, status: 'COMPLETED' });
    expect(createFault.mail).toHaveLength(1);

    const deleteFault = harness(); setup(deleteFault);
    deleteFault.failNextTriggerDeletes(1);
    expect(() => deleteFault.call('sendSchoolRewardsBalanceStatements', {
      periodKey: '2026-trigger-delete-fault', limit: 1, idempotencyKey: 'mail_trigger_delete_fault',
    })).toThrow(/trigger delete failure/i);
    expect(deleteFault.mail).toHaveLength(1);
    expect(deleteFault.rows('MailRuns')[1][10]).toBe('COMPLETED');
    expect(deleteFault.triggers()).toHaveLength(1);
    expect(deleteFault.call('continueSchoolRewardsMailRuns')).toMatchObject({ runId: '', status: 'COMPLETED' });
    expect(deleteFault.triggers()).toEqual([]);
    expect(deleteFault.mail).toHaveLength(1);
  });

  it('uses the authenticated recurring safety sweep after persistent one-shot creation failures', () => {
    const h = harness(); setup(h);
    h.call('adminBulkUpsertRewardsStudents', Array.from({ length: 29 }, (_, index) => ({
      firstName: `Sweep ${index}`, lastInitial: 'S', grade: '6', homeroom: '6S', email: `sweep${index}@${DOMAIN}`,
    })));
    const first = h.call('sendSchoolRewardsBalanceStatements', { periodKey: '2026-safety-sweep', limit: 30, idempotencyKey: 'mail_safety_sweep_run' });
    expect(first).toMatchObject({ sent: 25, remaining: 5, status: 'RUNNING' });
    const continuation = h.triggers().find(item => item.handler === 'continueSchoolRewardsMailRuns');
    const safety = h.allTriggers().find(item => item.handler === 'sweepSchoolRewardsMailRuns');
    expect(safety).toMatchObject({ everyHours: 1 });
    h.removeTrigger(continuation.uid);
    h.setActive('');
    h.failNextTriggerCreates(2);
    expect(() => h.call('continueSchoolRewardsMailRuns', { triggerUid: continuation.uid })).toThrow(/trigger create failure/i);
    expect(h.mail).toHaveLength(25);
    expect(h.triggers()).toEqual([]);
    expect(() => h.call('sweepSchoolRewardsMailRuns', { triggerUid: 'trigger-forged' })).toThrow(/valid installed project trigger/i);
    h.failNextTriggerCreates(2);
    expect(() => h.call('sweepSchoolRewardsMailRuns', { triggerUid: safety.uid })).toThrow(/trigger create failure/i);
    expect(h.mail).toHaveLength(25);
    expect(h.allTriggers().filter(item => item.handler === 'sweepSchoolRewardsMailRuns')).toHaveLength(1);
    h.failNextTriggerCreates(0);
    const completed = h.call('sweepSchoolRewardsMailRuns', { triggerUid: safety.uid });
    expect(completed).toMatchObject({ sent: 30, remaining: 0, status: 'COMPLETED' });
    expect(h.mail).toHaveLength(30);
    expect(h.triggers()).toEqual([]);
    expect(h.allTriggers().filter(item => item.handler === 'sweepSchoolRewardsMailRuns')).toHaveLength(1);
  });

  it('fails closed when the recurring safety sweep is missing and repairs it on reconfigure', () => {
    const h = harness(); setup(h);
    const safety = h.allTriggers().find(item => item.handler === 'sweepSchoolRewardsMailRuns');
    h.removeTrigger(safety.uid);
    const report = h.call('getSchoolRewardsIntegrityReport', {});
    expect(report).toMatchObject({ ok: false, ready: false });
    expect(report.issues).toContainEqual(expect.objectContaining({ code: 'MAIL_SAFETY_SWEEP_MISSING' }));
    expect(() => h.call('sendSchoolRewardsBalanceStatements', {
      periodKey: '2026-missing-sweep', limit: 1, idempotencyKey: 'mail_missing_sweep',
    })).toThrow(/recurring mail safety sweep is unavailable/i);
    expect(h.rows('MailRuns')).toHaveLength(1);
    expect(h.mail).toHaveLength(0);
    h.call('setupSchoolRewardsRepository', { allowedDomain: DOMAIN, schoolName: 'Pilot School' });
    expect(h.allTriggers().filter(item => item.handler === 'sweepSchoolRewardsMailRuns')).toHaveLength(1);
    expect(h.call('sendSchoolRewardsBalanceStatements', {
      periodKey: '2026-repaired-sweep', limit: 1, idempotencyKey: 'mail_repaired_sweep',
    })).toMatchObject({ sent: 1, status: 'COMPLETED' });
  });

  it('prioritizes a stale PENDING watchdog ahead of an older quota-paused run', () => {
    const h = harness(); setup(h);
    h.setMailQuota(25);
    const quotaRun = h.call('sendSchoolRewardsBalanceStatements', { periodKey: '2026-priority-quota', limit: 1, idempotencyKey: 'mail_priority_quota' });
    expect(quotaRun.status).toBe('PAUSED_QUOTA');
    h.setMailQuota(100);
    h.setCoreFault('mail:after_pending');
    expect(() => h.call('sendSchoolRewardsBalanceStatements', { periodKey: '2026-priority-pending', limit: 1, idempotencyKey: 'mail_priority_pending' })).toThrow(/Injected core fault/);
    h.clearCoreFault();
    h.setDataCell('MailOutbox', 0, 13, '2020-01-01T00:00:00.000Z');
    h.resignMailOutbox(0);
    h.setMailQuota(25);
    const reconciled = h.call('continueSchoolRewardsMailRuns');
    expect(reconciled).toMatchObject({ status: 'NEEDS_REVIEW', uncertain: 1, pending: 0 });
    expect(reconciled.runId).not.toBe(quotaRun.runId);
    expect(h.mail).toHaveLength(0);
    expect(h.rows('MailRuns').find(row => row[0] === quotaRun.runId)[10]).toBe('PAUSED_QUOTA');
    expect(h.triggers()).toEqual([expect.objectContaining({ handler: 'continueSchoolRewardsMailRuns', afterMs: 21600000 })]);
  });

  it('repairs terminal run and retry audits on exact replay without resending', () => {
    const terminal = harness(); setup(terminal);
    const terminalRequest = { periodKey: '2026-terminal-audit', limit: 1, idempotencyKey: 'mail_terminal_audit' };
    terminal.setCoreFault('mail:after_finalize');
    expect(() => terminal.call('sendSchoolRewardsBalanceStatements', terminalRequest)).toThrow(/Injected core fault/);
    const terminalRunId = terminal.rows('MailRuns')[1][0];
    expect(terminal.rows('MailRuns')[1][10]).toBe('COMPLETED');
    expect(terminal.rows('Audit').filter(row => row[1] === 'MAIL_RUN_COMPLETED' && row[3] === terminalRunId)).toHaveLength(0);
    terminal.clearCoreFault();
    expect(terminal.call('sendSchoolRewardsBalanceStatements', terminalRequest)).toMatchObject({ sent: 1, status: 'COMPLETED' });
    expect(terminal.mail).toHaveLength(1);
    expect(terminal.rows('Audit').filter(row => row[1] === 'MAIL_RUN_COMPLETED' && row[3] === terminalRunId)).toHaveLength(1);

    const retry = harness(); setup(retry); retry.setMailFailure('ambiguous');
    retry.call('sendSchoolRewardsBalanceStatements', { periodKey: '2026-retry-audit', limit: 1, idempotencyKey: 'mail_retry_audit_run' });
    retry.setMailFailure('');
    const sourceId = retry.rows('MailOutbox')[1][0];
    retry.call('resolveSchoolRewardsMailDelivery', {
      outboxId: sourceId, status: 'FAILED', note: 'Mailbox review confirmed the original message was not delivered.',
      idempotencyKey: 'mail_retry_audit_resolve',
    });
    const retryRequest = { outboxId: sourceId, idempotencyKey: 'mail_retry_audit_attempt' };
    retry.setCoreFault('mail:retry_before_audit');
    expect(() => retry.call('retrySchoolRewardsMailDelivery', retryRequest)).toThrow(/Injected core fault/);
    const retryId = retry.rows('MailOutbox')[2][0];
    expect(retry.rows('Audit').filter(row => row[1] === 'MAIL_DELIVERY_RETRIED' && row[3] === retryId)).toHaveLength(0);
    retry.clearCoreFault();
    expect(retry.call('retrySchoolRewardsMailDelivery', retryRequest)).toMatchObject({ ok: true, delivery: { id: retryId, status: 'SENT' } });
    expect(retry.mail).toHaveLength(1);
    expect(retry.rows('Audit').filter(row => row[1] === 'MAIL_DELIVERY_RETRIED' && row[3] === retryId)).toHaveLength(1);
  });

  it('runs student statements and guardian digests through the same signed worker', () => {
    const h = harness(); const student = setup(h); const category = seededCategory(h);
    const guardian = h.call('adminUpsertSchoolRewardsGuardian', {
      studentId: student.id, guardianEmail: 'caregiver@family.example', guardianName: 'Caregiver',
      active: true, consentConfirmed: true, idempotencyKey: 'mail_v6_guardian_map1',
    }).guardian;
    h.setActive(STAFF);
    h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 16, categoryId: category.id, reason: 'Private observation marker@example.test', idempotencyKey: 'mail_v6_shared_award' });
    h.setActive(ADMIN);
    const statement = h.call('sendSchoolRewardsBalanceStatements', { periodKey: '2026-v6-shared-student', limit: 5, idempotencyKey: 'mail_v6_shared_stmt' });
    const digest = h.call('sendSchoolRewardsGuardianDigests', { periodKey: '2026-v6-shared-guardian', limit: 5, idempotencyKey: 'mail_v6_shared_guard' });
    expect(statement).toMatchObject({ sent: 1, status: 'COMPLETED' });
    expect(digest).toMatchObject({ sent: 1, status: 'COMPLETED' });
    expect(h.rows('MailRuns').slice(1).map(row => row[1]).sort()).toEqual(['GUARDIAN_DIGEST', 'STUDENT_STATEMENT']);
    expect(h.rows('MailOutbox').slice(1).map(row => row[3]).sort()).toEqual(['GUARDIAN_DIGEST', 'STUDENT_STATEMENT']);
    expect(h.rows('Statements').at(-1)[4]).toBe('SENT');
    expect(h.rows('GuardianDigests').at(-1)[4]).toBe('SENT');
    expect(h.mail.map(message => message.to).sort()).toEqual([STUDENT, guardian.guardianEmail].sort());
    expect(h.rows('MailOutbox').slice(1).map(row => row[9]).join('|')).not.toContain('marker@example.test');
  });

  it('fails retries safely when a protected address, consent, or student state changes', () => {
    function confirmedFailed(kind) {
      const h = harness(); const student = setup(h); let guardian = null;
      if (kind === 'GUARDIAN_DIGEST') guardian = h.call('adminUpsertSchoolRewardsGuardian', {
        studentId: student.id, guardianEmail: 'authorized@family.example', active: true, consentConfirmed: true,
        idempotencyKey: `mail_v6_change_map_${Math.random().toString(36).slice(2)}`,
      }).guardian;
      h.setMailFailure('ambiguous');
      const request = { periodKey: `2026-v6-change-${kind}`, limit: 5, idempotencyKey: `mail_v6_change_${kind}` };
      const sent = kind === 'GUARDIAN_DIGEST' ? h.call('sendSchoolRewardsGuardianDigests', request) : h.call('sendSchoolRewardsBalanceStatements', request);
      h.setMailFailure('');
      const outboxId = h.rows('MailOutbox')[1][0];
      h.call('resolveSchoolRewardsMailDelivery', { outboxId, status: 'FAILED', note: 'Managed mailbox review confirmed no delivery.', idempotencyKey: `mail_v6_change_resolve_${kind}` });
      return { h, student, guardian, outboxId };
    }
    const address = confirmedFailed('GUARDIAN_DIGEST');
    address.h.setDataCell('Guardians', 0, 2, 'changed@family.example');
    expect(() => address.h.call('retrySchoolRewardsMailDelivery', { outboxId: address.outboxId, idempotencyKey: 'mail_v6_changed_address' })).toThrow(/address, consent, status, or student mapping changed/i);

    const consent = confirmedFailed('GUARDIAN_DIGEST');
    consent.h.setDataCell('Guardians', 0, 6, '');
    expect(() => consent.h.call('retrySchoolRewardsMailDelivery', { outboxId: consent.outboxId, idempotencyKey: 'mail_v6_changed_consent' })).toThrow(/authorization|consent|changed/i);

    const inactive = confirmedFailed('STUDENT_STATEMENT');
    inactive.h.setDataCell('Students', 0, 6, false);
    expect(() => inactive.h.call('retrySchoolRewardsMailDelivery', { outboxId: inactive.outboxId, idempotencyKey: 'mail_v6_changed_student' })).toThrow(/student is no longer active/i);
  });

  it('suppresses legacy SENT projections while allowing a legacy FAILED delivery to be attempted', () => {
    const h = harness(); const student = setup(h);
    h.appendRaw('Statements', ['legacy_statement_sent', student.id, '2026-v6-legacy-sent', 0, 'SENT', '2026-01-01T00:00:00.000Z', '']);
    const suppressed = h.call('sendSchoolRewardsBalanceStatements', { periodKey: '2026-v6-legacy-sent', limit: 5, idempotencyKey: 'mail_v6_legacy_sent' });
    expect(suppressed).toMatchObject({ sent: 0, skipped: 1, status: 'COMPLETED' });
    expect(h.rows('MailOutbox')).toHaveLength(1);
    h.appendRaw('Statements', ['legacy_statement_failed', student.id, '2026-v6-legacy-failed', 0, 'FAILED', '2026-01-01T00:00:00.000Z', 'legacy failure']);
    const attempted = h.call('sendSchoolRewardsBalanceStatements', { periodKey: '2026-v6-legacy-failed', limit: 5, idempotencyKey: 'mail_v6_legacy_fail' });
    expect(attempted).toMatchObject({ sent: 1, skipped: 0 });
    expect(h.rows('MailOutbox')).toHaveLength(2);

    const guardian = h.call('adminUpsertSchoolRewardsGuardian', {
      studentId: student.id, guardianEmail: 'legacy@family.example', active: true, consentConfirmed: true,
      idempotencyKey: 'mail_v6_legacy_guard_map',
    }).guardian;
    const guardianHash = createHash('sha256').update(guardian.guardianEmail).digest('base64url');
    h.appendRaw('GuardianDigests', ['legacy_guard_sent', student.id, guardianHash, '2026-v6-legacy-guard', 'SENT', '2026-01-01T00:00:00.000Z', '']);
    expect(h.call('sendSchoolRewardsGuardianDigests', { periodKey: '2026-v6-legacy-guard', limit: 5, idempotencyKey: 'mail_v6_legacy_guard' })).toMatchObject({ sent: 0, skipped: 1 });
  });

  it('detects mail payload, run-counter, delivery-key, and stale ambiguity corruption read-only', () => {
    const h = harness(); setup(h);
    const result = h.call('sendSchoolRewardsBalanceStatements', { periodKey: '2026-v6-integrity', limit: 5, idempotencyKey: 'mail_v6_integrity_1' });
    expect(h.call('getSchoolRewardsIntegrityReport', {})).toMatchObject({ ok: true, summary: { mailRuns: 1, mailDeliveries: 1 }, checks: { resilientMailDelivery: true } });
    h.setDataCell('MailRuns', 0, 6, 99);
    h.setDataCell('MailRuns', 0, 12, 'mo1_tampered');
    h.setDataCell('MailOutbox', 0, 2, 'unsafe@student.example');
    h.setDataCell('MailOutbox', 0, 9, JSON.stringify({ email: 'leak@example.test' }));
    h.setDataCell('MailOutbox', 0, 11, 'PENDING');
    h.setDataCell('MailOutbox', 0, 13, '2020-01-01T00:00:00.000Z');
    const before = JSON.stringify({ runs: h.rows('MailRuns'), outbox: h.rows('MailOutbox') });
    const report = h.call('getSchoolRewardsIntegrityReport', { pendingAgeMinutes: 1 });
    const codes = report.issues.map(issue => issue.code);
    expect(report).toMatchObject({ ok: false, ready: false });
    expect(codes).toEqual(expect.arrayContaining([
      'MAIL_RUN_COUNTER_MISMATCH', 'MAIL_RUN_HMAC_INVALID', 'MAIL_DELIVERY_KEY_UNSAFE',
      'MAIL_DELIVERY_HMAC_INVALID', 'MAIL_PRIVACY_LEAK', 'MAIL_DELIVERY_AMBIGUOUS',
      'MAIL_RUN_REVIEW_STATE_MISMATCH',
    ]));
    expect(JSON.stringify({ runs: h.rows('MailRuns'), outbox: h.rows('MailOutbox') })).toBe(before);
    expect(result.runId).toBeTruthy();
  });

  it('preserves a legacy schema on reconfigure and rejects unsigned pre-v6 mail rows', () => {
    const old = harness(); setup(old); old.simulateV4Inventory();
    const reconfigured = old.call('setupSchoolRewardsRepository', { allowedDomain: DOMAIN, schoolName: 'Reconfigured legacy school' });
    expect(reconfigured).toMatchObject({ version: 6, repositoryVersion: 4 });
    expect(old.configValue('schemaVersion')).toBe('4');
    expect(() => old.call('migrateSchoolRewardsRepositoryV6')).toThrow(/schema v5 inventory migration/i);

    const unsigned = harness(); setup(unsigned); unsigned.simulateV5Mail(); unsigned.setProperty('SR_MAIL_DELIVERY_SECRET', '');
    unsigned.call('setupSchoolRewardsRepository', { allowedDomain: DOMAIN, schoolName: 'Still schema five' });
    expect(unsigned.configValue('schemaVersion')).toBe('5');
    expect(unsigned.getProperty('SR_MAIL_DELIVERY_SECRET')).toBe('');
    unsigned.appendRaw('MailRuns', ['mailrun_unsigned_row', 'STUDENT_STATEMENT', 'legacy', 1, '', 0, 0, 0, 0, 0, 'QUEUED', 'ma1_fake', '', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', '', '']);
    expect(() => unsigned.call('migrateSchoolRewardsRepositoryV6')).toThrow(/unverifiable rows/i);
    expect(unsigned.configValue('schemaVersion')).toBe('5');
    expect(unsigned.getProperty('SR_MAIL_DELIVERY_SECRET')).toBe('');
  });

  it('fails closed without replacing a lost schema-v6 mail secret', () => {
    const h = harness(); setup(h);
    h.setProperty('SR_MAIL_DELIVERY_SECRET', '');
    const before = JSON.stringify({
      config: h.rows('Config'), members: h.rows('Members'), runs: h.rows('MailRuns'),
      outbox: h.rows('MailOutbox'), audit: h.rows('Audit'),
    });

    expect(() => h.call('setupSchoolRewardsRepository', { allowedDomain: DOMAIN, schoolName: 'Must not rewrite' })).toThrow(/mail delivery signing secret is unavailable/i);
    expect(() => h.call('sendSchoolRewardsBalanceStatements', { periodKey: '2026-secret-loss', limit: 5, idempotencyKey: 'mail_secret_loss_start_1' })).toThrow(/mail delivery signing secret is unavailable/i);
    expect(() => h.call('migrateSchoolRewardsRepositoryV6')).toThrow(/mail delivery signing secret is unavailable/i);

    expect(h.getProperty('SR_MAIL_DELIVERY_SECRET')).toBe('');
    expect(h.mail).toEqual([]);
    expect(JSON.stringify({
      config: h.rows('Config'), members: h.rows('Members'), runs: h.rows('MailRuns'),
      outbox: h.rows('MailOutbox'), audit: h.rows('Audit'),
    })).toBe(before);
  });

  it('hands a single continuation trigger from one runnable run to the next', () => {
    const h = harness(); setup(h);
    h.call('adminBulkUpsertRewardsStudents', Array.from({ length: 29 }, (_, index) => ({
      firstName: `Handoff ${index}`, lastInitial: 'H', grade: '5', homeroom: '5C', email: `handoff${index}@${DOMAIN}`,
    })));
    h.setMailQuota(1000);
    h.call('sendSchoolRewardsBalanceStatements', { periodKey: '2026-v6-handoff-a', limit: 30, idempotencyKey: 'mail_v6_handoff_a' });
    h.call('sendSchoolRewardsBalanceStatements', { periodKey: '2026-v6-handoff-b', limit: 30, idempotencyKey: 'mail_v6_handoff_b' });
    expect(h.triggers()).toHaveLength(1);
    const firstContinuation = h.call('continueSchoolRewardsMailRuns');
    expect(firstContinuation.status).toBe('COMPLETED');
    expect(h.rows('MailRuns').slice(1).filter(row => row[10] === 'RUNNING')).toHaveLength(1);
    expect(h.triggers()).toHaveLength(1);
    expect(h.triggers()[0]).toMatchObject({ handler: 'continueSchoolRewardsMailRuns', afterMs: 300000 });
    expect(h.call('continueSchoolRewardsMailRuns')).toMatchObject({ status: 'COMPLETED' });
    expect(h.rows('MailRuns').slice(1).every(row => row[10] === 'COMPLETED')).toBe(true);
    expect(h.triggers()).toEqual([]);
  });

  it('serializes bulk workers and refuses a retry when only the receipt reserve remains', () => {
    const leased = harness(); setup(leased); leased.installMailWorkerLease();
    const queued = leased.call('sendSchoolRewardsBalanceStatements', { periodKey: '2026-v6-lease', limit: 5, idempotencyKey: 'mail_v6_lease_001' });
    expect(queued).toMatchObject({ sent: 0, attempted: 0, status: 'QUEUED', continuationScheduled: true });
    expect(leased.mail).toHaveLength(0);
    expect(leased.rows('MailOutbox')).toHaveLength(1);
    leased.clearMailWorkerLease();
    expect(leased.call('continueSchoolRewardsMailRuns')).toMatchObject({ sent: 1, status: 'COMPLETED' });

    const retry = harness(); setup(retry); retry.setMailFailure('ambiguous');
    retry.call('sendSchoolRewardsBalanceStatements', { periodKey: '2026-v6-retry-quota', limit: 5, idempotencyKey: 'mail_v6_retry_quota_run' });
    retry.setMailFailure('');
    const sourceId = retry.rows('MailOutbox')[1][0];
    retry.call('resolveSchoolRewardsMailDelivery', { outboxId: sourceId, status: 'FAILED', note: 'Mailbox review confirmed the message was not delivered.', idempotencyKey: 'mail_v6_retry_quota_resolve' });
    retry.setMailQuota(25);
    expect(() => retry.call('retrySchoolRewardsMailDelivery', { outboxId: sourceId, idempotencyKey: 'mail_v6_retry_quota_key' })).toThrow(/reserved for immediate receipts/i);
    expect(retry.rows('MailOutbox')).toHaveLength(2);
    expect(retry.mail).toHaveLength(0);
    expect(retry.call('getSchoolRewardsBootstrap').unresolvedMailDeliveries[0]).toMatchObject({ id: sourceId, status: 'FAILED' });
    retry.setMailQuota(100);
    expect(retry.call('retrySchoolRewardsMailDelivery', { outboxId: sourceId, idempotencyKey: 'mail_v6_retry_quota_key' })).toMatchObject({ ok: true, delivery: { status: 'SENT' } });
  });

  it('blocks protected recipient mutations during a fresh PENDING send lease', () => {
    const studentMail = harness(); const student = setup(studentMail);
    studentMail.setCoreFault('mail:after_pending');
    expect(() => studentMail.call('sendSchoolRewardsBalanceStatements', { periodKey: '2026-v6-student-lease', limit: 5, idempotencyKey: 'mail_v6_student_lease' })).toThrow(/Injected core fault/);
    studentMail.clearCoreFault();
    expect(() => studentMail.call('adminUpsertRewardsStudent', {
      id: student.id, firstName: 'Avery', lastInitial: 'R', grade: '5', homeroom: '5A', email: `changed@${DOMAIN}`, active: true,
    })).toThrow(/mail attempt is in flight/i);
    expect(studentMail.rows('Students')[1][5]).toBe(STUDENT);
    expect(studentMail.mail).toHaveLength(0);

    const guardianMail = harness(); const guardianStudent = setup(guardianMail);
    const guardian = guardianMail.call('adminUpsertSchoolRewardsGuardian', {
      studentId: guardianStudent.id, guardianEmail: 'locked@family.example', active: true, consentConfirmed: true,
      idempotencyKey: 'mail_v6_guard_lease_map',
    }).guardian;
    guardianMail.setCoreFault('mail:after_pending');
    expect(() => guardianMail.call('sendSchoolRewardsGuardianDigests', { periodKey: '2026-v6-guard-lease', limit: 5, idempotencyKey: 'mail_v6_guard_lease_run' })).toThrow(/Injected core fault/);
    guardianMail.clearCoreFault();
    expect(() => guardianMail.call('adminUpsertSchoolRewardsGuardian', {
      id: guardian.id, studentId: guardianStudent.id, guardianEmail: 'changed@family.example', active: true,
      consentConfirmed: true, idempotencyKey: 'mail_v6_guard_lease_change',
    })).toThrow(/mail attempt is in flight/i);
    expect(guardianMail.rows('Guardians')[1][2]).toBe('locked@family.example');
    expect(guardianMail.mail).toHaveLength(0);
  });

  it('recovers an exact resolution after committed delivery state but before projection or idempotency', () => {
    const h = harness(); setup(h);
    h.call('adminUpsertRewardsStudent', { firstName: 'Second', lastInitial: 'S', grade: '5', homeroom: '5A', email: `second@${DOMAIN}`, active: true });
    h.setMailFailure('ambiguous');
    const run = h.call('sendSchoolRewardsBalanceStatements', { periodKey: '2026-v6-resolve-replay', limit: 2, idempotencyKey: 'mail_v6_resolve_run' });
    h.setMailFailure('');
    const sourceId = h.rows('MailOutbox')[1][0], resolveRequest = {
      outboxId: sourceId, status: 'FAILED', note: 'Mailbox review confirmed this delivery did not occur.',
      idempotencyKey: 'mail_v6_resolve_replay',
    };
    h.setCoreFault('mail:resolve_after_delivery');
    expect(() => h.call('resolveSchoolRewardsMailDelivery', resolveRequest)).toThrow(/Injected core fault/);
    expect(h.rows('MailOutbox')[1][11]).toBe('FAILED');
    h.clearCoreFault();
    const recovered = h.call('resolveSchoolRewardsMailDelivery', resolveRequest);
    expect(recovered).toMatchObject({ delivery: { status: 'FAILED' }, run: { status: 'RUNNING', remaining: 1, continuationScheduled: true } });
    expect(h.rows('Statements').find(row => row[0] === sourceId)[4]).toBe('FAILED');
    expect(h.rows('Idempotency').filter(row => row[0] === resolveRequest.idempotencyKey)).toHaveLength(1);
    expect(h.call('continueSchoolRewardsMailRuns')).toMatchObject({ sent: 1, failed: 1, status: 'COMPLETED' });
    expect(h.mail).toHaveLength(1);
    expect(run.runId).toBe(recovered.run.runId);
  });

  it('repairs a persisted SENT projection and finalizes without a duplicate send', () => {
    const h = harness(); setup(h);
    h.setCoreFault('mail:after_outbox_settle');
    const request = { periodKey: '2026-v6-projection-repair', limit: 1, idempotencyKey: 'mail_v6_projection_repair' };
    expect(() => h.call('sendSchoolRewardsBalanceStatements', request)).toThrow(/Injected core fault/);
    expect(h.mail).toHaveLength(1);
    expect(h.rows('MailOutbox')[1][11]).toBe('SENT');
    expect(h.rows('Statements')).toHaveLength(1);
    expect(h.rows('MailRuns')[1][10]).toBe('RUNNING');
    expect(h.triggers()).toHaveLength(1);
    h.clearCoreFault();
    expect(h.call('continueSchoolRewardsMailRuns')).toMatchObject({ sent: 1, status: 'COMPLETED' });
    expect(h.mail).toHaveLength(1);
    expect(h.rows('Statements')).toHaveLength(2);
    expect(h.rows('Statements')[1][4]).toBe('SENT');
  });

  it('repairs an exact retry whose SENT outbox committed before its projection', () => {
    const h = harness(); setup(h); h.setMailFailure('ambiguous');
    h.call('sendSchoolRewardsBalanceStatements', { periodKey: '2026-v6-retry-projection', limit: 1, idempotencyKey: 'mail_v6_retry_projection_run' });
    h.setMailFailure('');
    const sourceId = h.rows('MailOutbox')[1][0];
    h.call('resolveSchoolRewardsMailDelivery', { outboxId: sourceId, status: 'FAILED', note: 'Mailbox review confirmed the first attempt was not delivered.', idempotencyKey: 'mail_v6_retry_projection_resolve' });
    const request = { outboxId: sourceId, idempotencyKey: 'mail_v6_retry_projection_key' };
    h.setCoreFault('mail:after_outbox_settle');
    expect(() => h.call('retrySchoolRewardsMailDelivery', request)).toThrow(/Injected core fault/);
    const retryId = h.rows('MailOutbox')[2][0];
    expect(h.rows('MailOutbox')[2][11]).toBe('SENT');
    expect(h.rows('Statements').some(row => row[0] === retryId)).toBe(false);
    expect(h.mail).toHaveLength(1);
    h.clearCoreFault();
    expect(h.call('retrySchoolRewardsMailDelivery', request)).toMatchObject({ ok: true, delivery: { id: retryId, status: 'SENT' }, run: { status: 'COMPLETED' } });
    expect(h.mail).toHaveLength(1);
    expect(h.rows('Statements').find(row => row[0] === retryId)[4]).toBe('SENT');
  });

  it('rejects forged FAILED and tampered lifecycle state before any send or recipient mutation', () => {
    const failed = harness(); setup(failed); failed.setMailFailure('ambiguous');
    failed.call('sendSchoolRewardsBalanceStatements', { periodKey: '2026-v6-forged-failed', limit: 1, idempotencyKey: 'mail_v6_forged_run' });
    failed.setMailFailure('');
    const outboxId = failed.rows('MailOutbox')[1][0];
    failed.setDataCell('MailOutbox', 0, 11, 'FAILED');
    expect(() => failed.call('retrySchoolRewardsMailDelivery', { outboxId, idempotencyKey: 'mail_v6_forged_retry' })).toThrow(/signature|confirmed/i);
    expect(failed.mail).toHaveLength(0);

    const cursor = harness(); setup(cursor); cursor.setMailQuota(25);
    const queued = cursor.call('sendSchoolRewardsBalanceStatements', { periodKey: '2026-v6-run-tamper', limit: 1, idempotencyKey: 'mail_v6_run_tamper' });
    cursor.setDataCell('MailRuns', 0, 4, 'forged_cursor');
    cursor.setMailQuota(100);
    expect(() => cursor.call('continueSchoolRewardsMailRuns')).toThrow(/run signature/i);
    expect(cursor.mail).toHaveLength(0);
    expect(queued.status).toBe('PAUSED_QUOTA');
  });
});

// 2026-09-02: per-request sheet reads, group awards, and the status page.
describe('bootstrap cost at roster scale', () => {
  it('reads the PointHolds sheet once per bootstrap no matter how many students are enrolled', () => {
    const h = harness();
    setup(h);
    const students = Array.from({ length: 40 }, (_, index) => ({ firstName: `Student${index}`, lastInitial: 'S', grade: '4', homeroom: '4B', email: `student${index}@${DOMAIN}` }));
    h.call('adminBulkUpsertRewardsStudents', students);
    h.resetRangeReads();
    const bootstrap = h.call('getSchoolRewardsBootstrap');
    expect(bootstrap.students.length).toBe(41);
    // One read for the roster loop plus, at most, one for the actor's own row.
    expect(h.rangeReads('PointHolds')).toBeLessThanOrEqual(2);
    h.resetRangeReads();
    h.setActive(STUDENT);
    h.call('getSchoolRewardsBootstrap');
    expect(h.rangeReads('PointHolds')).toBeLessThanOrEqual(2);
    h.setActive(ADMIN);
    h.resetRangeReads();
    h.call('getSchoolRewardsDistrictSummary', {});
    expect(h.rangeReads('PointHolds')).toBeLessThanOrEqual(2);
  });
});

describe('group awards', () => {
  it('records one journaled award per student and is idempotent under an exact retry', () => {
    const h = harness();
    setup(h);
    h.call('adminBulkUpsertRewardsStudents', [
      { firstName: 'Blake', lastInitial: 'T', grade: '5', homeroom: '5A', email: `blake@${DOMAIN}` },
      { firstName: 'Casey', lastInitial: 'U', grade: '5', homeroom: '5A', email: `casey@${DOMAIN}` },
    ]);
    const category = seededCategory(h);
    const ids = h.call('getSchoolRewardsBootstrap').students.map(student => student.id);
    h.setActive(STAFF);
    const request = { studentIds: ids.concat([ids[0]]), amount: 3, categoryId: category.id, reason: 'Cleaned up the lab together', idempotencyKey: 'group_award_test_0001' };
    const first = h.call('awardSchoolRewardsPointsBatch', request);
    expect(first.ok).toBe(true);
    expect(first.recorded).toBe(3);
    expect(first.failed).toBe(0);
    const again = h.call('awardSchoolRewardsPointsBatch', request);
    expect(again.recorded).toBe(3);
    h.setActive(ADMIN);
    const after = h.call('getSchoolRewardsBootstrap');
    for (const student of after.students) expect(student.balance).toBe(3);
    const ledger = h.rows('Ledger').slice(1).filter(row => row[2] === 'EARN');
    expect(ledger.length).toBe(3);
    expect(h.rows('Audit').some(row => row[1] === 'GROUP_AWARD')).toBe(true);
  });

  it('reports the students it could not record without dropping the rest, and bounds the group', () => {
    const h = harness();
    const avery = setup(h);
    const category = seededCategory(h);
    h.setActive(STAFF);
    const out = h.call('awardSchoolRewardsPointsBatch', { studentIds: [avery.id, 'student_does_not_exist'], amount: 2, categoryId: category.id, reason: 'Helped a classmate', idempotencyKey: 'group_award_test_0002' });
    expect(out.ok).toBe(false);
    expect(out.recorded).toBe(1);
    expect(out.failed).toBe(1);
    expect(out.results.find(result => !result.ok).studentId).toBe('student_does_not_exist');
    expect(() => h.call('awardSchoolRewardsPointsBatch', { studentIds: Array.from({ length: 61 }, (_, i) => `student_${String(i).padStart(8, '0')}`), amount: 1, categoryId: category.id, reason: 'x', idempotencyKey: 'group_award_test_0003' })).toThrow(/60 students or fewer/);
    expect(() => h.call('awardSchoolRewardsPointsBatch', { studentIds: [avery.id], amount: 1, categoryId: category.id, reason: '', idempotencyKey: 'group_award_test_0004' })).toThrow(/Describe what/);
    h.setActive(CASHIER);
    expect(() => h.call('awardSchoolRewardsPointsBatch', { studentIds: [avery.id], amount: 1, categoryId: category.id, reason: 'x', idempotencyKey: 'group_award_test_0005' })).toThrow(/role cannot/);
  });
});

describe('deployment status page', () => {
  it('renders a plain-language pass for a signed-in member and escapes the config it prints', () => {
    const h = harness();
    h.call('setupSchoolRewardsRepository', { allowedDomain: DOMAIN, schoolName: 'Pilot <School> & "Co"', students: [] });
    const page = h.call('doGet', { parameter: { api: 'status' } }).content;
    expect(page).toContain('Deployment check passed');
    expect(page).toContain('Pilot &lt;School&gt; &amp; &quot;Co&quot;');
    expect(page).not.toContain('Pilot <School>');
    expect(page).toContain('<td>admin</td>');
    expect(page).toContain('alloflow-school-rewards');
    expect(page).toContain('prefers-color-scheme:dark');
  });

  it('fails plainly for an account that is not on the roster, and keeps the JSON health endpoint', () => {
    const h = harness();
    setup(h);
    h.setActive('stranger@elsewhere.example');
    const page = h.call('doGet', { parameter: { api: 'status' } }).content;
    expect(page).toContain('Deployment check failed');
    expect(page).not.toContain('Deployment check passed');
    const health = JSON.parse(h.call('doGet', { parameter: { api: 'health' } }).content);
    expect(health.ok).toBe(false);
  });
});

describe('staff undo (2026-09-02)', () => {
  function awardAs(h, email, key) {
    const category = seededCategory(h);
    const student = h.call('getSchoolRewardsBootstrap').students[0];
    h.setActive(email);
    const out = h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 4, categoryId: category.id, reason: 'Helped set up the lab', idempotencyKey: key });
    return { student, entryId: out.entry.id };
  }

  it('lets the awarding staff member reverse their own award right away, as an audited reversal', () => {
    const h = harness();
    setup(h);
    const { student, entryId } = awardAs(h, STAFF, 'undo_test_award_0001');
    const undone = h.call('reverseSchoolRewardsEntry', { entryId, reason: 'Undone right after recording', idempotencyKey: 'undo_test_reverse_001' });
    expect(undone.ok).toBe(true);
    const again = h.call('reverseSchoolRewardsEntry', { entryId, reason: 'Undone right after recording', idempotencyKey: 'undo_test_reverse_001' });
    expect(again.ok).toBe(true);
    h.setActive(ADMIN);
    const after = h.call('getSchoolRewardsBootstrap').students.find(item => item.id === student.id);
    expect(after.balance).toBe(0);
    expect(h.rows('Ledger').slice(1).filter(row => row[2] === 'REVERSAL').length).toBe(1);
    expect(() => h.call('reverseSchoolRewardsEntry', { entryId, reason: 'x', idempotencyKey: 'undo_test_reverse_002' })).toThrow(/already been reversed/);
  });

  it('refuses another staff member, and refuses after the fifteen-minute window, while admins still can', () => {
    const h = harness();
    setup(h);
    h.setActive(ADMIN);
    h.call('adminUpsertRewardsMember', { email: `other@${DOMAIN}`, displayName: 'Other Teacher', role: 'staff', active: true });
    const { entryId } = awardAs(h, STAFF, 'undo_test_award_0002');
    h.setActive(`other@${DOMAIN}`);
    expect(() => h.call('reverseSchoolRewardsEntry', { entryId, reason: 'x', idempotencyKey: 'undo_test_reverse_003' })).toThrow(/only their own awards/);
    // An award recorded twenty minutes ago is past the window for staff.
    h.setNow(new Date(Date.now() - 20 * 60 * 1000).toISOString());
    const old = awardAs(h, STAFF, 'undo_test_award_0003');
    h.setNow(new Date().toISOString());
    h.setActive(STAFF);
    expect(() => h.call('reverseSchoolRewardsEntry', { entryId: old.entryId, reason: 'x', idempotencyKey: 'undo_test_reverse_004' })).toThrow(/undo window has passed/);
    h.setActive(ADMIN);
    expect(h.call('reverseSchoolRewardsEntry', { entryId: old.entryId, reason: 'Administrative correction', idempotencyKey: 'undo_test_reverse_005' }).ok).toBe(true);
    h.setActive(CASHIER);
    expect(() => h.call('reverseSchoolRewardsEntry', { entryId, reason: 'x', idempotencyKey: 'undo_test_reverse_006' })).toThrow(/role cannot/);
  });
});

describe('school settings (2026-09-02)', () => {
  it('defaults the Print Lab tab on, lets an administrator hide it, and reports the flag to every role', () => {
    const h = harness();
    setup(h);
    expect(h.call('getSchoolRewardsBootstrap').config.printLabEnabled).toBe(true);
    h.setActive(STUDENT);
    expect(h.call('getSchoolRewardsBootstrap').config.printLabEnabled).toBe(true);
    h.setActive(ADMIN);
    expect(h.call('adminUpdateRewardsSettings', { printLabEnabled: false })).toEqual({ ok: true, printLabEnabled: false });
    expect(h.call('getSchoolRewardsBootstrap').config.printLabEnabled).toBe(false);
    h.setActive(STAFF);
    expect(h.call('getSchoolRewardsBootstrap').config.printLabEnabled).toBe(false);
    expect(() => h.call('adminUpdateRewardsSettings', { printLabEnabled: true })).toThrow(/role cannot/);
    h.setActive(ADMIN);
    h.call('adminUpdateRewardsSettings', { printLabEnabled: true });
    expect(h.call('getSchoolRewardsBootstrap').config.printLabEnabled).toBe(true);
    expect(h.rows('Audit').filter(row => row[1] === 'SETTINGS_UPDATED').length).toBe(2);
  });
});


describe('statement language (2026-09-02)', () => {
  it('lets a student save a language, reports it on sign-in, and sends their balance statement in it', () => {
    const h = harness(); const student = setup(h); const category = seededCategory(h);
    h.setActive(STAFF); h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 12, categoryId: category.id, reason: 'Helped a classmate', idempotencyKey: 'award_lang_01' });
    h.setActive(STUDENT);
    expect(h.call('getSchoolRewardsBootstrap').students[0].language).toBe('en');
    expect(h.call('setSchoolRewardsLanguage', { language: 'es' })).toEqual({ ok: true, studentId: student.id, language: 'es' });
    expect(h.call('getSchoolRewardsBootstrap').students[0].language).toBe('es');
    expect(() => h.call('setSchoolRewardsLanguage', { language: 'fr' })).toThrow(/supported language/);
    h.setActive(ADMIN);
    h.call('adminUpsertRewardsWindow', { name: 'Trimestre 1', status: 'PREVIEW' });
    const result = h.call('sendSchoolRewardsBalanceStatements', { periodKey: '2026-t1-lang', limit: 100 });
    expect(result.sent).toBe(1);
    expect(h.mail[0].subject).toContain('actualizaci');
    expect(h.mail[0].body).toContain('Saldo del registro: 12 puntos.');
    expect(h.mail[0].body).toContain('La vista previa de premios');
    expect(h.mail[0].htmlBody).toContain('Tu actualizaci');
    expect(h.mail[0].htmlBody).not.toContain('This message is informational');
    expect(h.mail[0].htmlBody).toContain('El registro en vivo en la caja');
    // Preferences sheet appeared on demand; a second save updates the same row.
    h.setActive(STUDENT);
    h.call('setSchoolRewardsLanguage', { language: 'en' });
    expect(h.rows('Preferences').slice(1)).toHaveLength(1);
    expect(h.rows('Preferences')[1][1]).toBe('en');
    expect(h.rows('Audit').filter(row => row[1] === 'LANGUAGE_SET').length).toBe(2);
  });

  it('admins can set a language for a student; staff and cashiers cannot; statements without a saved language stay English', () => {
    const h = harness(); const student = setup(h); const category = seededCategory(h);
    h.setActive(STAFF); h.call('awardSchoolRewardsPoints', { studentId: student.id, amount: 3, categoryId: category.id, reason: 'On time', idempotencyKey: 'award_lang_02' });
    expect(() => h.call('setSchoolRewardsLanguage', { studentId: student.id, language: 'es' })).toThrow(/role cannot/);
    h.setActive(CASHIER);
    expect(() => h.call('setSchoolRewardsLanguage', { studentId: student.id, language: 'es' })).toThrow(/role cannot/);
    h.setActive(ADMIN);
    expect(h.call('sendSchoolRewardsBalanceStatements', { periodKey: '2026-t1-lang-en', limit: 100 }).sent).toBe(1);
    expect(h.mail[0].subject).toContain('rewards update');
    expect(h.mail[0].body).toContain('Ledger balance: 3 points.');
    expect(h.call('setSchoolRewardsLanguage', { studentId: student.id, language: 'ES' }).language).toBe('es');
    expect(() => h.call('setSchoolRewardsLanguage', { studentId: 'missing', language: 'es' })).toThrow();
    h.setActive(STUDENT);
    expect(h.call('getSchoolRewardsBootstrap').students[0].language).toBe('es');
  });
});
