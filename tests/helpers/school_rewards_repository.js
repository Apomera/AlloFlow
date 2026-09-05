import { createHash, createHmac } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

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
    getName() { return this.name; }
    moveTo() { return this; }
    setSharing() { return this; }
    setShareableByEditors() { return this; }
  }
  class Folder extends File {
    createFolder(name) { const folder = new Folder(uuid('folder'), name); folders.set(folder.id, folder); return folder; }
    createFile(nameOrBlob, content, mimeType) { const blob = nameOrBlob instanceof Blob ? nameOrBlob : new Blob(content, mimeType, nameOrBlob); const file = new File(uuid('file'), blob.getName(), blob.data, blob.getContentType()); files.set(file.id, file); file.parentId = this.id; return file; }
    getFilesByName(name) { const matches = [...files.values()].filter(file => file.parentId === this.id && file.name === name); let index = 0; return { hasNext: () => index < matches.length, next: () => matches[index++] }; }
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
    fileByName: name => [...files.values()].find(file => file.name === name),
    duplicateFileByName: name => { const file = [...files.values()].find(item => item.name === name); return folders.get(file.parentId).createFile(file.name, file.content, file.mimeType); },
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


export { harness, setup, seededCategory, SOURCE, DOMAIN, ADMIN, STAFF, CASHIER, STUDENT };
