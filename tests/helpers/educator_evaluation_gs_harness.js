// Shared Apps Script VM harness for the Educator Evaluation server tests.
// Extracted 2026-08-16 from educator_evaluation_apps_script.test.js so the
// extension suite (released-summary sharing, educator statement, era scoring)
// can exercise the SAME production Code.gs against the same mocks. Additive
// mocks for DocumentApp, per-file viewers, and sub-folders live here too.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const GS_SOURCE = fs.readFileSync(path.join(ROOT, 'apps_script', 'educator_evaluation', 'Code.gs'), 'utf8');
const DOMAIN = 'district.example';
const ADMIN = `admin@${DOMAIN}`;
const EVALUATOR = `principal@${DOMAIN}`;
const TEACHER_ONE = `teacher.one@${DOMAIN}`;
const TEACHER_TWO = `teacher.two@${DOMAIN}`;
const FIXED_NOW = '2026-08-13T17:15:30.000Z';

function makeAppsScriptHarness() {
  let activeEmail = ADMIN;
  let effectiveEmail = ADMIN;
  let clock = FIXED_NOW;
  let nextId = 1;
  let lockAvailable = true;
  let failAddViewer = false;
  let failTrash = false;
  const properties = new Map();
  const spreadsheets = new Map();
  const driveFiles = new Map();
  const driveFolders = new Map();
  const sentMail = [];
  const documents = [];
  const cacheStore = new Map();

  const allocateId = prefix => `${prefix}-${String(nextId++).padStart(5, '0')}`;
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [clock])); }
    static now() { return new Date(clock).getTime(); }
  }
  class MockRange {
    constructor(sheet, row, column, rowCount = 1, columnCount = 1) {
      Object.assign(this, { sheet, row, column, rowCount, columnCount });
    }
    getValues() {
      return Array.from({ length: this.rowCount }, (_, r) => Array.from({ length: this.columnCount }, (_, c) => {
        const row = this.sheet.rows[this.row - 1 + r] || [];
        const value = row[this.column - 1 + c];
        return value === undefined ? '' : value;
      }));
    }
    setValues(values) {
      for (let r = 0; r < this.rowCount; r += 1) {
        const rowIndex = this.row - 1 + r;
        if (!this.sheet.rows[rowIndex]) this.sheet.rows[rowIndex] = [];
        for (let c = 0; c < this.columnCount; c += 1) this.sheet.rows[rowIndex][this.column - 1 + c] = values[r][c];
      }
      return this;
    }
    getValue() { return this.getValues()[0][0]; }
  }
  class MockSheet {
    constructor(name) { this.name = name; this.rows = []; }
    setName(name) { this.name = name; return this; }
    getLastRow() {
      for (let i = this.rows.length - 1; i >= 0; i -= 1) {
        if ((this.rows[i] || []).some(value => value !== '' && value !== null && value !== undefined)) return i + 1;
      }
      return 0;
    }
    getRange(row, column, rowCount = 1, columnCount = 1) { return new MockRange(this, row, column, rowCount, columnCount); }
    appendRow(row) { this.rows[this.getLastRow()] = Array.from(row); return this; }
    clearContents() { this.rows = []; return this; }
    setFrozenRows() { return this; }
    hideSheet() { return this; }
    getProtections() { return []; }
    protect() {
      const protection = {
        setDescription: () => protection, setWarningOnly: () => protection, isWarningOnly: () => false, getEditors: () => [],
        addEditor: () => protection, removeEditors: () => protection, canDomainEdit: () => false, setDomainEdit: () => protection,
      };
      return protection;
    }
  }
  class MockSpreadsheet {
    constructor(id, name) { this.id = id; this.name = name; this.sheets = [new MockSheet('Sheet1')]; }
    getId() { return this.id; }
    getSheets() { return this.sheets; }
    getSheetByName(name) { return this.sheets.find(sheet => sheet.name === name) || null; }
    insertSheet(name) { const sheet = new MockSheet(name); this.sheets.push(sheet); return sheet; }
  }
  class MockFile {
    constructor(id, name, content = '') { this.id = id; this.name = name; this.content = String(content); this.sharingAccess = 'PRIVATE'; this.viewers = []; this.parentFolderId = null; this.createdAt = clock; }
    getId() { return this.id; }
    getName() { return this.name; }
    getUrl() { return `https://drive.google.com/file/d/${this.id}/view`; }
    getDateCreated() { return new FixedDate(this.createdAt); }
    getSize() { return Buffer.byteLength(this.content, 'utf8'); }
    getBlob() { return { getDataAsString: () => this.content }; }
    setContent(content) { this.content = String(content); return this; }
    setSharing(access, permission) { if (access === 'PRIVATE' && permission === 'NONE') throw new Error('Invalid PRIVATE+NONE'); this.sharingAccess = access; return this; }
    getSharingAccess() { return this.sharingAccess; }
    setShareableByEditors() { return this; }
    getEditors() { return []; }
    getViewers() { return this.viewers.map(email => ({ getEmail: () => email })); }
    addViewer(email) { if (failAddViewer) throw new Error('Injected Drive viewer failure'); this.viewers.push(String(email)); return this; }
    removeViewer(user) { const email = typeof user === 'string' ? user : (user && user.getEmail ? user.getEmail() : ''); this.viewers = this.viewers.filter(item => item !== String(email)); return this; }
    moveTo(folder) { this.parentFolderId = folder && folder.getId ? folder.getId() : null; return this; }
    setTrashed(value) { if (failTrash) throw new Error('Injected Drive trash failure'); this.trashed = !!value; return this; }
    isTrashed() { return !!this.trashed; }
  }
  class MockFolder {
    constructor(id, name) { this.id = id; this.name = name; this.sharingAccess = 'PRIVATE'; }
    getId() { return this.id; }
    setSharing(access, permission) { if (access === 'PRIVATE' && permission === 'NONE') throw new Error('Invalid PRIVATE+NONE'); this.sharingAccess = access; return this; }
    getSharingAccess() { return this.sharingAccess; }
    setShareableByEditors() { return this; }
    getEditors() { return []; }
    getViewers() { return []; }
    createFile(name, content) {
      const file = new MockFile(allocateId('file'), name, content);
      file.parentFolderId = this.id;
      driveFiles.set(file.id, file);
      return file;
    }
    createFolder(name) {
      const folder = new MockFolder(allocateId('folder'), name);
      driveFolders.set(folder.id, folder);
      return folder;
    }
    getFiles() {
      const items = [...driveFiles.values()].filter(file => file.parentFolderId === this.id && !file.trashed);
      let index = 0;
      return { hasNext: () => index < items.length, next: () => items[index++] };
    }
  }
  const scriptProperties = {
    getProperty: key => (properties.has(key) ? properties.get(key) : null),
    setProperty: (key, value) => { properties.set(key, String(value)); return scriptProperties; },
    setProperties: entries => { Object.entries(entries).forEach(([key, value]) => properties.set(key, String(value))); return scriptProperties; },
    deleteProperty: key => { properties.delete(key); return scriptProperties; },
    getProperties: () => Object.fromEntries(properties),
  };
  const output = content => {
    const value = { content: String(content), setMimeType: () => value, setTitle: () => value, setXFrameOptionsMode: () => value, getContent: () => value.content };
    return value;
  };
  const services = {
    Date: FixedDate,
    Session: { getActiveUser: () => ({ getEmail: () => activeEmail }), getEffectiveUser: () => ({ getEmail: () => effectiveEmail }) },
    PropertiesService: { getScriptProperties: () => scriptProperties },
    SpreadsheetApp: {
      ProtectionType: { SHEET: 'SHEET' },
      create: name => {
        const id = allocateId('spreadsheet');
        const spreadsheet = new MockSpreadsheet(id, name);
        spreadsheets.set(id, spreadsheet);
        driveFiles.set(id, new MockFile(id, name));
        return spreadsheet;
      },
      openById: id => {
        if (!spreadsheets.has(id)) throw new Error(`Spreadsheet not found: ${id}`);
        return spreadsheets.get(id);
      },
    },
    DriveApp: {
      Access: { PRIVATE: 'PRIVATE' }, Permission: { NONE: 'NONE', VIEW: 'VIEW' },
      createFolder: name => { const folder = new MockFolder(allocateId('folder'), name); driveFolders.set(folder.id, folder); return folder; },
      getFileById: id => { if (!driveFiles.has(id)) throw new Error(`File not found: ${id}`); return driveFiles.get(id); },
      getFolderById: id => { if (!driveFolders.has(id)) throw new Error(`Folder not found: ${id}`); return driveFolders.get(id); },
    },
    MimeType: { PLAIN_TEXT: 'text/plain' },
    LockService: { getScriptLock: () => ({ tryLock: () => lockAvailable, releaseLock() {} }) },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF_8' },
      getUuid: () => `00000000-0000-4000-8000-${String(nextId++).padStart(12, '0')}`,
      computeDigest: (_algorithm, text) => Array.from(createHash('sha256').update(String(text)).digest()),
      base64EncodeWebSafe: bytes => Buffer.from(bytes).toString('base64url'),
    },
    CacheService: { getScriptCache: () => ({
      get: key => (cacheStore.has(key) ? cacheStore.get(key) : null),
      put: (key, value) => cacheStore.set(key, String(value)),
      remove: key => cacheStore.delete(key),
    }) },
    MailApp: { sendEmail: message => sentMail.push(JSON.parse(JSON.stringify(message))) },
    DocumentApp: {
      ParagraphHeading: { HEADING1: 'H1', HEADING2: 'H2', NORMAL: 'NORMAL' },
      GlyphType: { BULLET: 'BULLET', HOLLOW_BULLET: 'HOLLOW_BULLET' },
      create: name => {
        const id = allocateId('doc');
        const record = { id, name, texts: [] };
        documents.push(record);
        driveFiles.set(id, new MockFile(id, name));
        const chainable = () => { const node = { setHeading: () => node, setGlyphType: () => node, setNestingLevel: () => node }; return node; };
        const body = {
          appendParagraph: text => { record.texts.push(String(text)); return chainable(); },
          appendListItem: text => { record.texts.push(String(text)); return chainable(); },
          appendTable: () => ({
            appendTableRow: () => ({
              appendTableCell: text => { record.texts.push(String(text)); const cell = { editAsText: () => ({ setBold: () => cell }) }; return cell; },
            }),
          }),
        };
        return { getId: () => id, getUrl: () => 'https://docs.google.com/document/d/' + id, getBody: () => body, saveAndClose: () => {} };
      },
    },
    ScriptApp: { getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/evaluation-deployment/exec' }) },
    ContentService: { MimeType: { JSON: 'application/json' }, createTextOutput: output },
    HtmlService: {
      XFrameOptionsMode: { SAMEORIGIN: 'SAMEORIGIN' }, createHtmlOutput: output,
      createHtmlOutputFromFile: () => output('<portal>'), createTemplateFromFile: () => ({ evaluate: () => output('<index>') }),
    },
    console: { log() {}, warn() {}, error() {} },
  };

  const context = vm.createContext(services);
  vm.runInContext(GS_SOURCE, context, { filename: 'apps_script/educator_evaluation/Code.gs' });
  function invoke(name, argument) {
    context.__argumentJson = argument === undefined ? '' : JSON.stringify(argument);
    const expression = argument === undefined ? `${name}()` : `${name}(JSON.parse(__argumentJson))`;
    const result = vm.runInContext(expression, context);
    return result === undefined ? undefined : JSON.parse(JSON.stringify(result));
  }
  function invokeError(name, argument) {
    try { invoke(name, argument); } catch (error) { return error; }
    throw new Error(`Expected ${name} to reject`);
  }
  function rows(name) {
    const spreadsheet = spreadsheets.get(properties.get('EE_SPREADSHEET_ID'));
    const sheet = spreadsheet && spreadsheet.getSheetByName(name);
    return sheet ? sheet.rows.map(row => Array.from(row || [])) : [];
  }
  function appendSheetRow(name, row) {
    const spreadsheet = spreadsheets.get(properties.get('EE_SPREADSHEET_ID'));
    const sheet = spreadsheet && spreadsheet.getSheetByName(name);
    if (!sheet) throw new Error('Sheet not found');
    sheet.appendRow(row);
  }
  function setSheetCell(name, rowIndex, columnIndex, value) {
    const spreadsheet = spreadsheets.get(properties.get('EE_SPREADSHEET_ID'));
    const sheet = spreadsheet && spreadsheet.getSheetByName(name);
    if (!sheet) throw new Error('Sheet not found');
    sheet.rows[rowIndex][columnIndex] = value;
  }
  return {
    invoke, invokeError, rows, appendSheetRow, setSheetCell, sentMail, properties, driveFiles, documents,
    setActiveEmail: email => { activeEmail = email; },
    setEffectiveEmail: email => { effectiveEmail = email; },
    setClock: iso => { clock = iso; },
    setLockAvailable: value => { lockAvailable = value; },
    setFailAddViewer: value => { failAddViewer = !!value; },
    setFailTrash: value => { failTrash = !!value; },
  };
}

function teacher(id, name, building = 'Main Building') {
  return {
    id, code: id.toUpperCase(), name, building, assignment: 'Classroom teacher', employeeType: 'professional',
    buildingData: true, teacherSpecificData: true, active: true, evaluator: 'Principal Rivera', dueDate: '2027-05-01',
    cycleStatus: 'in_progress', ratings: { domains: { d1: null, d2: null, d3: null, d4: null }, building: null, teacher: null, lea: null },
  };
}
function snapshot(id, teacherId, score, finalizedAt = '2026-06-01T12:00:00.000Z') {
  return {
    id, teacherId, staffCodeSnapshot: teacherId.toUpperCase(), academicYear: '2025-26', buildingSnapshot: 'Main Building',
    employeeTypeSnapshot: 'professional', finalizedAt, finalScore: score,
    domainRatings: { d1: Math.round(score), d2: Math.round(score), d3: Math.round(score), d4: Math.round(score) }, weightSnapshot: null,
    frameworkVersion: 'PA Act 13 / Danielson 2021',
  };
}

function repositoryFixture() {
  const harness = makeAppsScriptHarness();
  const peerIds = Array.from({ length: 10 }, (_, index) => `peer-${String(index + 1).padStart(2, '0')}`);
  const assignments = ['t1', ...peerIds].map(teacherId => ({ teacherId, evaluatorEmail: EVALUATOR, active: true }));
  assignments.push({ teacherId: 't2', evaluatorEmail: `other.principal@${DOMAIN}`, active: true });
  const declaredTeachers = [teacher('t1', 'Teacher One'), teacher('t2', 'Teacher Two'), ...peerIds.map((id, index) => teacher(id, `Peer ${index + 1}`))];
  harness.invoke('setupEvaluationRepository', {
    allowedDomain: DOMAIN, bootstrapAdmin: ADMIN, organization: 'Sample School District', building: 'Main Building',
    academicYear: '2026-27', webAppUrl: 'https://script.google.com/macros/s/evaluation-deployment/exec', adminDisplayName: 'Repository Administrator',
    members: [
      { email: EVALUATOR, displayName: 'Principal Rivera', role: 'evaluator', active: true },
      { email: `other.principal@${DOMAIN}`, displayName: 'Principal Morgan', role: 'evaluator', active: true },
      { email: TEACHER_ONE, displayName: 'Teacher One', role: 'teacher', teacherId: 't1', active: true },
      { email: TEACHER_TWO, displayName: 'Teacher Two', role: 'teacher', teacherId: 't2', active: true },
    ], assignments, teachers: declaredTeachers,
  });
  const workspace = {
    kind: 'alloflow-educator-evaluation-workspace', version: 1,
    config: { organization: 'Sample School District', building: 'Main Building', academicYear: '2026-27', evaluatorName: 'Principal Rivera', evaluatorInitials: 'PR', frameworkVersion: 'PA Act 13 / Danielson 2021', sampleMode: false },
    teachers: declaredTeachers,
    walkthroughs: [
      { id: 'walk-t1', teacherId: 't1', date: '2026-08-01', evidence: 'Students compared two solution strategies.', privacyChecked: true, publishedAt: '2026-08-02T12:00:00.000Z' },
      { id: 'walk-t1-private', teacherId: 't1', date: '2026-08-03', evidence: 'Private evaluator draft.', privacyChecked: true },
      { id: 'walk-t2', teacherId: 't2', date: '2026-08-01', evidence: 'Another teacher record.', privacyChecked: true, publishedAt: '2026-08-02T12:00:00.000Z' },
    ],
    observations: [
      { id: 'obs-t1', teacherId: 't1', frameworkVersion: 'PA Act 13 / Danielson 2021', prework: {}, ratings: {}, rationales: {} },
      { id: 'obs-t2', teacherId: 't2', frameworkVersion: 'PA Act 13 / Danielson 2021', prework: {}, ratings: {}, rationales: {} },
    ],
    spms: [], comments: [], audit: [
      { id: 'forged-audit', event: 'FORGED', summary: 'Client audit must not survive', actor: 'Client', role: 'Evaluator', at: '2000-01-01T00:00:00.000Z', entityType: 'workspace', entityId: 'workspace', teacherId: 't1', version: 1 },
    ],
    cycleSnapshots: [
      snapshot('selected-a', 't1', 2), snapshot('selected-b', 't1', 3),
      snapshot('peer-01-a', 'peer-01', 0), snapshot('peer-01-b', 'peer-01', 2),
      snapshot('peer-02-a', 'peer-02', 1.2), snapshot('peer-03-a', 'peer-03', 1.4),
      snapshot('peer-04-a', 'peer-04', 1.6), snapshot('peer-05-a', 'peer-05', 1.8),
      snapshot('peer-06-a', 'peer-06', 2), snapshot('peer-07-a', 'peer-07', 2.2),
      snapshot('peer-08-a', 'peer-08', 2.4), snapshot('peer-09-a', 'peer-09', 2.6),
      snapshot('peer-10-a', 'peer-10', 2.8, '2025-06-01T12:00:00.000Z'),
    ],
  };
  let seedBoot = harness.invoke('bootstrap');
  seedBoot.workspace.config = workspace.config;
  seedBoot.workspace.audit = workspace.audit;
  let seeded = harness.invoke('saveWorkspace', { expectedVersion: seedBoot.revision, workspace: seedBoot.workspace, mutation: { event: 'CONFIG_UPDATED' } });
  const seedRecord = (collection, record, event, entityType) => {
    seedBoot = harness.invoke('bootstrap');
    seedBoot.workspace[collection].push(record);
    seeded = harness.invoke('saveWorkspace', {
      expectedVersion: seedBoot.revision, workspace: seedBoot.workspace,
      mutation: { teacherId: record.teacherId, event, entityType, entityId: record.id, version: 1 },
    });
    if (!seeded.ok) throw new Error('Fixture record seed failed');
  };
  seedRecord('walkthroughs', workspace.walkthroughs[0], 'EVIDENCE_PUBLISHED', 'walkthrough');
  seedRecord('walkthroughs', workspace.walkthroughs[1], 'CREATED', 'walkthrough');
  seedRecord('walkthroughs', workspace.walkthroughs[2], 'EVIDENCE_PUBLISHED', 'walkthrough');
  seedRecord('observations', workspace.observations[0], 'ASSIGNED', 'formal_observation');
  seedRecord('observations', workspace.observations[1], 'ASSIGNED', 'formal_observation');
  // Model immutable snapshots produced by earlier server-finalized cycles. The
  // identical client collection above is intentionally ignored by saveWorkspace.
  const protectedSnapshots = [
    snapshot('selected-a', 't1', 2), snapshot('selected-b', 't1', 3),
    snapshot('peer-01-a', 'peer-01', 0), snapshot('peer-01-b', 'peer-01', 2),
    snapshot('peer-02-a', 'peer-02', 1.2), snapshot('peer-03-a', 'peer-03', 1.4),
    snapshot('peer-04-a', 'peer-04', 1.6), snapshot('peer-05-a', 'peer-05', 1.8),
    snapshot('peer-06-a', 'peer-06', 2), snapshot('peer-07-a', 'peer-07', 2.2),
    snapshot('peer-08-a', 'peer-08', 2.4), snapshot('peer-09-a', 'peer-09', 2.6),
    snapshot('peer-10-a', 'peer-10', 2.8, '2025-06-01T12:00:00.000Z'),
  ];
  protectedSnapshots.forEach(item => harness.appendSheetRow('Snapshots', [
    item.id, item.teacherId, item.staffCodeSnapshot, item.academicYear, item.buildingSnapshot,
    item.employeeTypeSnapshot, item.finalizedAt, item.finalScore, item.domainRatings.d1,
    item.domainRatings.d2, item.domainRatings.d3, item.domainRatings.d4, item.frameworkVersion,
  ]));
  return { ...harness, peerIds, revision: seeded.revision };
}


export { makeAppsScriptHarness, repositoryFixture, teacher, snapshot, GS_SOURCE, DOMAIN, ADMIN, EVALUATOR, TEACHER_ONE, TEACHER_TWO, FIXED_NOW };
