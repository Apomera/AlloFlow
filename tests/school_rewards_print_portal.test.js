import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash, webcrypto } from 'node:crypto';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(process.cwd());
const PORTAL = fs.readFileSync(path.join(ROOT, 'apps_script/school_rewards/Portal.html'), 'utf8');
const SCRIPT = PORTAL.match(/<script>([\s\S]*)<\/script>/)[1];

class FakeNode {
  constructor(id = '') {
    this.id = id;
    this.hidden = false;
    this.value = '';
    this.checked = false;
    this.files = [];
    this.dataset = {};
    this.attributes = {};
    this.className = '';
    this.textContent = '';
    this._queryCache = {};
    this.innerHTML = '';
    this.classList = { add: value => { this.className += ` ${value}`; }, remove: value => { this.className = this.className.replace(value, ''); } };
  }
  set innerHTML(value) { this._innerHTML = String(value); this._queryCache = {}; }
  get innerHTML() { return this._innerHTML; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  querySelectorAll(selector) {
    const attribute = selector.match(/^\[data-([a-z0-9-]+)\]$/i);
    if (!attribute) return [];
    if (!this._queryCache[selector]) {
      const name = attribute[1];
      const tags = [...this.innerHTML.matchAll(new RegExp(`<button[^>]*data-${name}(?:="[^"]*")?[^>]*>`, 'gi'))].map(match => match[0]);
      this._queryCache[selector] = tags.map((tag, index) => {
        const node = new FakeNode(`${name}-${index}`);
        for (const data of tag.matchAll(/data-([a-z0-9-]+)="([^"]*)"/gi)) {
          const property = data[1].replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
          node.dataset[property] = data[2];
        }
        node.disabled = /\sdisabled(?:\s|>)/i.test(tag);
        return node;
      });
    }
    return this._queryCache[selector];
  }
  querySelector() { return null; }
  reset() { this.value = ''; }
  focus() {}
}

function mainBootstrap(role = 'student') {
  return {
    actor: { role, email: `${role}@school.example` },
    config: { schoolName: 'Pilot School', academicYear: '2026-27', levelThresholds: [0, 25] },
    students: role === 'student' ? [{ id: 'student-1', firstName: 'Avery', lastInitial: 'R', grade: '5', homeroom: '5A', balance: 120, reservedPoints: 20, availableBalance: 100 }] : [],
    categories: [], progress: [], catalog: [],
    windows: [{ id: 'window-1', name: 'Trimester 1', status: 'OPEN' }],
    recentLedger: [], recentOrders: [], recentReceipts: [], recentMailRuns: [], unresolvedMailDeliveries: [], emailSchedule: {}, mailQuota: 100,
  };
}

function createDocument() {
  const ids = [...PORTAL.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  const nodes = Object.fromEntries(ids.map(id => [id, new FakeNode(id)]));
  const tabs = [...PORTAL.matchAll(/<button[^>]*data-tab="([^"]+)"[^>]*>/g)].map(match => {
    const node = new FakeNode(`tab-${match[1]}`);
    node.dataset.tab = match[1];
    if (/hidden/.test(match[0])) node.hidden = true;
    return node;
  });
  const markers = {
    '[data-tab]': tabs,
    '.panel': ids.filter(id => id.startsWith('panel-')).map(id => nodes[id]),
    '[data-admin]': [new FakeNode('admin-marker')],
    '[data-awarder]': [new FakeNode('awarder-marker')],
    '[data-checkout]': [new FakeNode('checkout-marker')],
    '[data-print-access]': [tabs.find(tab => tab.dataset.tab === 'print')],
    '[data-print-student]': [new FakeNode('student-print-marker')],
    '[data-print-staff]': [new FakeNode('staff-print-marker')],
  };
  return {
    nodes,
    printTab: tabs.find(tab => tab.dataset.tab === 'print'),
    document: {
      body: { appendChild() {} },
      getElementById: id => nodes[id],
      querySelectorAll: selector => markers[selector] || Object.values(nodes).flatMap(node => node.querySelectorAll(selector)),
      createElement: () => new FakeNode(),
    },
  };
}

function googleRunner(respond, calls) {
  const script = {};
  Object.defineProperty(script, 'run', { get() {
    let success = () => {};
    let failure = () => {};
    let proxy;
    proxy = new Proxy({}, { get(_target, property) {
      if (property === 'withSuccessHandler') return handler => { success = handler; return proxy; };
      if (property === 'withFailureHandler') return handler => { failure = handler; return proxy; };
      return argument => {
        calls.push({ name: property, argument });
        Promise.resolve().then(() => respond(property, argument)).then(success, failure);
      };
    } });
    return proxy;
  } });
  return { script };
}

async function flush(rounds = 8) {
  for (let index = 0; index < rounds; index += 1) await new Promise(resolve => setTimeout(resolve, 0));
}

function memorySessionStorage() {
  const values = new Map();
  return {
    values,
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
  };
}

async function runPortal({ role = 'student', printBootstrap, mainBootstrapData, rpcResponses = {}, sessionStore, confirm = () => true, prompt = () => 'Test reason' } = {}) {
  const dom = createDocument();
  const calls = [];
  const storage = sessionStore || memorySessionStorage();
  const defaultPrint = role === 'student'
    ? { actor: { role: 'student', studentId: 'student-1' }, balance: { balance: 120, reservedPoints: 20, availableBalance: 100 }, models: [], requests: [], holds: [], communityModels: [] }
    : { actor: { role }, models: [], requests: [], holds: [], communityModels: [] };
  const respond = (name, argument) => {
    if (Object.prototype.hasOwnProperty.call(rpcResponses, name)) return typeof rpcResponses[name] === 'function' ? rpcResponses[name](argument) : rpcResponses[name];
    if (name === 'getSchoolRewardsBootstrap') return mainBootstrapData || mainBootstrap(role);
    if (name === 'getSchoolRewardsPrintBootstrap') return printBootstrap || defaultPrint;
    if (name === 'createSchoolRewardsPrintModel') return { ok: true, model: { id: 'model-1', ...argument } };
    if (name === 'submitSchoolRewardsPrintRequest') return { ok: true, request: { id: 'request-1', status: 'SUBMITTED', ...argument } };
    return { ok: true };
  };
  const context = vm.createContext({
    console, Date, JSON, Math, Promise, setTimeout, clearTimeout,
    ArrayBuffer, Uint8Array, DataView, TextDecoder, crypto: webcrypto,
    btoa: value => Buffer.from(value, 'binary').toString('base64'),
    document: dom.document,
    google: googleRunner(respond, calls),
    sessionStorage: storage,
    window: { confirm, prompt },
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
    Blob: class {},
  });
  new vm.Script(SCRIPT, { filename: 'Portal.html' }).runInContext(context);
  await flush();
  return { ...dom, calls, context, sessionStorage: storage };
}

function printHandoff(sourceFormat = 'RECIPE', overrides = {}) {
  const binary = sourceFormat !== 'RECIPE';
  return {
    version: 'printable/1', title: 'Bridge Token', description: 'A tested model', sourceFormat,
    contentHash: binary ? 'a'.repeat(64) : '', unitDeclaration: binary ? 'millimeters' : '',
    aiUse: 'NONE', aiDisclosure: '', studentNote: 'Use the classroom-safe material.',
    ...(binary ? {} : { recipe: { version: 'p3d/1', name: 'Bridge Token', parts: [{ shape: 'box', size: [1, 1, 1], position: [0, 0, 0], rotation: [0, 0, 0], color: '#64748b' }], scale: 1, rotY: 0, tint: null } }),
    preflight: { status: 'PASS', sourceFormat, byteSize: binary ? 12 : 321, triangleCount: binary ? 0 : 12, meshCount: 1, dimensionsMm: { width: 30, depth: 20, height: 10 }, issues: [] },
    ...overrides,
  };
}

function mailRun(overrides = {}) {
  return {
    id: 'mail-run-1', kind: 'STUDENT_STATEMENT', periodKey: '2026-T1-week-1', requestedLimit: 100,
    attempted: 12, sent: 8, skipped: 2, failed: 1, uncertain: 1, pending: 0,
    status: 'RUNNING', createdAt: '2026-08-31T12:00:00.000Z', updatedAt: '2026-08-31T12:05:00.000Z', completedAt: '',
    remaining: 74, continuationScheduled: true, canResume: false,
    ...overrides,
  };
}

describe('School Rewards Print Lab portal', () => {
  it('shows the truly available student balance instead of reserved points as spendable', async () => {
    const app = await runPortal();
    expect(app.nodes['metric-students-label'].textContent).toBe('My available-to-spend balance');
    expect(app.nodes['metric-students'].textContent).toBe('100 pts');
    expect(app.nodes['metric-students-detail'].textContent).toBe('120 ledger total • 20 reserved');
  });

  it('shows student prize affordability and protects external catalog image requests', async () => {
    const main = mainBootstrap('student');
    main.catalog = [
      { id: 'prize-1', name: 'Sketch & Make Kit', description: 'Creative supplies', cost: 100, inventoryLimit: -1, remaining: -1, imageUrl: 'https://images.example/sketch-kit.jpg', active: true },
      { id: 'prize-2', name: 'Maker Lab Pass', description: 'A special lab session', cost: 135, inventoryLimit: 8, remaining: 3, imageUrl: '', active: true },
    ];
    const app = await runPortal({ mainBootstrapData: main });
    const preview = app.nodes['preview-catalog'].innerHTML;
    const store = app.nodes['store-catalog'].innerHTML;
    expect(preview).toContain('Within your balance');
    expect(preview).toContain('35 more points needed');
    expect(store).toContain('Within your balance');
    expect(store).toContain('35 more points needed');
    expect(preview).toContain('alt="Sketch &amp; Make Kit prize"');
    expect(preview).toContain('loading="lazy"');
    expect(preview).toContain('decoding="async"');
    expect(preview).toContain('referrerpolicy="no-referrer"');
  });

  it('preserves cashier add-to-cart controls without student affordability cues', async () => {
    const main = mainBootstrap('cashier');
    main.catalog = [{ id: 'prize-1', name: 'Sketchbook', description: 'Blank pages', cost: 20, inventoryLimit: 10, remaining: 5, imageUrl: '', active: true }];
    const app = await runPortal({ role: 'cashier', mainBootstrapData: main });
    const store = app.nodes['store-catalog'].innerHTML;
    expect(store).toContain('data-add="prize-1"');
    expect(store).toContain('aria-label="Add Sketchbook to cart"');
    expect(store).toContain('Add to cart');
    expect(store).not.toContain('Within your balance');
    expect(store).not.toContain('more points needed');
  });

  it('measures category progress within the current level interval', async () => {
    const main = mainBootstrap('student');
    main.progress = [{ categoryId: 'category-1', name: 'Perseverance', framework: 'HOWL', description: 'Keeps working through challenge.', color: '#b45309', points: 50, levelName: 'Growing', currentThreshold: 25, nextThreshold: 75, pointsToNext: 25 }];
    const app = await runPortal({ mainBootstrapData: main });
    expect(app.nodes['category-progress'].innerHTML).toContain('width:50%');
    expect(app.nodes['category-progress'].innerHTML).toContain('aria-valuenow="50"');
    expect(app.nodes['category-progress'].innerHTML).toContain('HOWL • Keeps working through challenge.');
  });

  it('submits a categorized award only once while the first request is pending', async () => {
    const main = mainBootstrap('student');
    main.actor = { role: 'staff', email: 'teacher@school.example' };
    main.categories = [{ id: 'category-1', name: 'Perseverance', framework: 'HOWL', description: 'Keeps working.', color: '#b45309' }];
    let releaseAward;
    const awardResponse = new Promise(resolve => { releaseAward = resolve; });
    const app = await runPortal({ role: 'staff', mainBootstrapData: main, rpcResponses: { awardSchoolRewardsPoints: () => awardResponse } });
    app.nodes['award-student'].value = 'student-1';
    app.nodes['award-amount'].value = '5';
    app.nodes['award-category'].value = 'category-1';
    app.nodes['award-reason'].value = 'Revised the design after testing.';
    const first = app.nodes['award-form'].onsubmit({ preventDefault() {}, target: app.nodes['award-form'] });
    const second = app.nodes['award-form'].onsubmit({ preventDefault() {}, target: app.nodes['award-form'] });
    await flush();
    expect(app.calls.filter(call => call.name === 'awardSchoolRewardsPoints')).toHaveLength(1);
    expect(app.nodes['award-submit'].disabled).toBe(true);
    releaseAward({ ok: true, balance: 125 });
    await Promise.all([first, second]);
    await flush();
    expect(app.nodes['award-submit'].disabled).toBe(false);
  });

  it('reuses a privacy-minimized award retry key after a lost response and same-tab reload', async () => {
    const main = mainBootstrap('student');
    main.actor = { role: 'staff', email: 'teacher@school.example' };
    main.categories = [{ id: 'category-1', name: 'Perseverance', framework: 'HOWL', description: 'Keeps working.', color: '#b45309' }];
    const storage = memorySessionStorage();
    let firstKey;
    const firstApp = await runPortal({
      role: 'staff',
      mainBootstrapData: main,
      sessionStore: storage,
      rpcResponses: { awardSchoolRewardsPoints: argument => { firstKey = argument.idempotencyKey; throw new Error('Response was lost'); } },
    });
    firstApp.nodes['award-student'].value = 'student-1';
    firstApp.nodes['award-amount'].value = '5';
    firstApp.nodes['award-category'].value = 'category-1';
    firstApp.nodes['award-reason'].value = 'Revised the design after testing.';
    await firstApp.nodes['award-form'].onsubmit({ preventDefault() {}, target: firstApp.nodes['award-form'] });

    const stored = [...storage.values.values()][0];
    expect(JSON.parse(stored)).toEqual({ key: firstKey, fingerprint: expect.stringMatching(/^[a-f0-9]{16,64}$/) });
    expect(stored).not.toContain('student-1');
    expect(stored).not.toContain('Revised the design');
    expect(stored).not.toContain('teacher@school.example');

    let retriedKey;
    const secondApp = await runPortal({
      role: 'staff',
      mainBootstrapData: main,
      sessionStore: storage,
      rpcResponses: { awardSchoolRewardsPoints: argument => { retriedKey = argument.idempotencyKey; return { ok: true }; } },
    });
    secondApp.nodes['award-student'].value = 'student-1';
    secondApp.nodes['award-amount'].value = '5';
    secondApp.nodes['award-category'].value = 'category-1';
    secondApp.nodes['award-reason'].value = 'Revised the design after testing.';
    await secondApp.nodes['award-form'].onsubmit({ preventDefault() {}, target: secondApp.nodes['award-form'] });
    expect(retriedKey).toBe(firstKey);
    expect(storage.values.size).toBe(0);
  });

  it('falls back to in-memory stable retry keys when session storage is unavailable', async () => {
    const main = mainBootstrap('student');
    main.actor = { role: 'staff', email: 'teacher@school.example' };
    main.categories = [{ id: 'category-1', name: 'Perseverance', framework: 'HOWL', description: 'Keeps working.', color: '#b45309' }];
    const unavailableStorage = {
      getItem() { throw new Error('storage blocked'); },
      setItem() { throw new Error('storage blocked'); },
      removeItem() { throw new Error('storage blocked'); },
    };
    const keys = [];
    let attempts = 0;
    const app = await runPortal({
      role: 'staff',
      mainBootstrapData: main,
      sessionStore: unavailableStorage,
      rpcResponses: { awardSchoolRewardsPoints: argument => { keys.push(argument.idempotencyKey); if (attempts++ === 0) throw new Error('Response was lost'); return { ok: true }; } },
    });
    const submit = async reason => {
      app.nodes['award-student'].value = 'student-1';
      app.nodes['award-amount'].value = '5';
      app.nodes['award-category'].value = 'category-1';
      app.nodes['award-reason'].value = reason;
      await app.nodes['award-form'].onsubmit({ preventDefault() {}, target: app.nodes['award-form'] });
    };
    await submit('Revised the design after testing.');
    await submit('Revised the design after testing.');
    expect(keys).toHaveLength(2);
    expect(keys[1]).toBe(keys[0]);
  });

  it('uses stable retry metadata for checkout, corrections, and ordinary refunds', () => {
    expect(SCRIPT).toContain("stableRetryKey('reverse',payload)");
    expect(SCRIPT).toContain("stableRetryKey('refund',payload)");
    expect(SCRIPT).toContain("stableRetryKey('checkout',{studentId:studentId,windowId:windowId,lines:lines})");
    expect(SCRIPT).toContain("clearRetryKey('reverse')");
    expect(SCRIPT).toContain("clearRetryKey('refund')");
    expect(SCRIPT).toContain("clearRetryKey('checkout')");
    expect(SCRIPT).not.toMatch(/sessionStorage\.setItem\([^\n]*(studentName|email|reason)/);
  });

  it('edits and deactivates categories without offering inactive ones for new awards', async () => {
    const main = mainBootstrap('admin');
    main.students = [{ id: 'student-1', firstName: 'Avery', lastInitial: 'R', grade: '5', homeroom: '5A', balance: 100, reservedPoints: 0, availableBalance: 100 }];
    main.categories = [
      { id: 'category-active', name: 'Collaboration', framework: 'HOWL', description: 'Helps the group learn.', color: '#0f766e', sortOrder: 10, active: true },
      { id: 'category-history', name: 'Legacy Habit', framework: 'CUSTOM', description: 'Preserved for historical growth.', color: '#6046b6', sortOrder: 20, active: false },
    ];
    const app = await runPortal({ role: 'admin', mainBootstrapData: main, rpcResponses: { adminUpsertRewardsCategory: { ok: true, category: main.categories[1] } } });
    expect(app.nodes['award-category'].innerHTML).toContain('Collaboration');
    expect(app.nodes['award-category'].innerHTML).not.toContain('Legacy Habit');
    expect(app.nodes['category-id'].innerHTML).toContain('Legacy Habit — INACTIVE');

    app.nodes['category-id'].value = 'category-history';
    app.nodes['category-id'].onchange();
    expect(app.nodes['category-name'].value).toBe('Legacy Habit');
    expect(app.nodes['category-active'].checked).toBe(false);
    expect(app.nodes['category-submit'].textContent).toBe('Save category changes');
    app.nodes['category-name'].value = 'Legacy Habit Updated';
    await app.nodes['category-form'].onsubmit({ preventDefault() {}, target: app.nodes['category-form'] });
    const save = app.calls.find(call => call.name === 'adminUpsertRewardsCategory');
    expect(save.argument).toMatchObject({ id: 'category-history', name: 'Legacy Habit Updated', active: false });
  });

  it('edits student roster status while keeping inactive students out of award, checkout, guardian, and active metrics', async () => {
    const main = mainBootstrap('admin');
    main.students = [
      { id: 'student-active', firstName: 'Avery', lastInitial: 'R', grade: '5', homeroom: '5A', email: 'avery@school.example', balance: 100, reservedPoints: 5, availableBalance: 95, active: true },
      { id: 'student-inactive', firstName: 'Jordan', lastInitial: 'K', grade: '6', homeroom: '6B', email: 'jordan@school.example', balance: 40, reservedPoints: 0, availableBalance: 40, active: false },
    ];
    main.members = [];
    const app = await runPortal({ role: 'admin', mainBootstrapData: main, rpcResponses: { adminUpsertRewardsStudent: argument => ({ ok: true, student: { ...main.students.find(student => student.id === argument.id), ...argument } }) } });

    expect(app.nodes['metric-students'].textContent).toBe(1);
    ['award-student', 'checkout-student', 'guardian-student'].forEach(id => {
      expect(app.nodes[id].innerHTML).toContain('Avery R.');
      expect(app.nodes[id].innerHTML).not.toContain('Jordan K.');
    });
    expect(app.nodes['student-balances'].innerHTML).not.toContain('Jordan K.');
    expect(app.nodes['student-id'].innerHTML).toContain('Jordan K. — INACTIVE');
    expect(app.nodes['student-list'].innerHTML).toContain('INACTIVE');

    app.nodes['student-id'].value = 'student-inactive';
    app.nodes['student-id'].onchange();
    expect(app.nodes['student-first'].value).toBe('Jordan');
    expect(app.nodes['student-active'].checked).toBe(false);
    expect(app.nodes['student-submit'].textContent).toBe('Save student changes');
    app.nodes['student-active'].checked = true;
    await app.nodes['student-form'].onsubmit({ preventDefault() {}, target: app.nodes['student-form'] });
    expect(app.calls.filter(call => call.name === 'adminUpsertRewardsStudent').at(-1).argument).toMatchObject({ id: 'student-inactive', email: 'jordan@school.example', active: true });

    app.nodes['student-id'].value = 'student-active';
    app.nodes['student-id'].onchange();
    app.nodes['student-active'].checked = false;
    await app.nodes['student-form'].onsubmit({ preventDefault() {}, target: app.nodes['student-form'] });
    expect(app.calls.filter(call => call.name === 'adminUpsertRewardsStudent').at(-1).argument).toMatchObject({ id: 'student-active', active: false });
  });

  it('edits staff access without changing its managed identity and surfaces the last-admin rejection', async () => {
    const main = mainBootstrap('admin');
    main.students = [{ id: 'student-1', firstName: 'Avery', lastInitial: 'R', email: 'avery@school.example', balance: 0, active: true }];
    main.members = [
      { email: 'admin@school.example', displayName: 'Administrator', role: 'admin', active: true },
      { email: 'cashier@school.example', displayName: 'Store Cashier', role: 'cashier', active: false },
    ];
    const app = await runPortal({
      role: 'admin',
      mainBootstrapData: main,
      rpcResponses: {
        adminUpsertRewardsMember: argument => {
          if (argument.email === 'admin@school.example' && argument.active === false) throw new Error('At least one active administrator is required.');
          return { ok: true };
        },
      },
    });

    expect(app.nodes['member-id'].innerHTML).toContain('Store Cashier — INACTIVE');
    app.nodes['member-id'].value = 'cashier@school.example';
    app.nodes['member-id'].onchange();
    expect(app.nodes['member-email'].value).toBe('cashier@school.example');
    expect(app.nodes['member-email'].readOnly).toBe(true);
    expect(app.nodes['member-active'].checked).toBe(false);
    app.nodes['member-role'].value = 'staff';
    app.nodes['member-active'].checked = true;
    await app.nodes['member-form'].onsubmit({ preventDefault() {}, target: app.nodes['member-form'] });
    expect(app.calls.filter(call => call.name === 'adminUpsertRewardsMember').at(-1).argument).toEqual({ email: 'cashier@school.example', displayName: 'Store Cashier', role: 'staff', active: true });

    app.nodes['member-id'].value = '';
    app.nodes['member-id'].onchange();
    expect(app.nodes['member-email'].value).toBe('');
    expect(app.nodes['member-email'].readOnly).toBe(false);
    expect(app.nodes['member-active'].checked).toBe(true);

    app.nodes['member-id'].value = 'admin@school.example';
    app.nodes['member-id'].onchange();
    app.nodes['member-active'].checked = false;
    await app.nodes['member-form'].onsubmit({ preventDefault() {}, target: app.nodes['member-form'] });
    expect(app.nodes.notice.textContent).toContain('At least one active administrator is required.');
    expect(app.nodes.notice.attributes.role).toBe('alert');
    expect(app.nodes['member-email'].value).toBe('admin@school.example');
    expect(app.nodes['member-email'].readOnly).toBe(true);
  });

  it('renders a bounded admin integrity report and resumes only an operator-reviewed pending journal from JS state', async () => {
    const main = mainBootstrap('admin');
    main.students = [];
    main.members = [];
    const pendingKey = 'checkout_pending_secret_key';
    const blocked = {
      ok: false,
      ready: false,
      readOnly: true,
      generatedAt: '2026-08-31T18:00:00.000Z',
      readiness: { ok: false, blockingIssues: 2, pendingOperations: 1 },
      summary: { errors: 2, warnings: 1, issues: 3, truncated: true, pendingOperations: 1 },
      issues: [
        { severity: 'ERROR', code: 'JOURNAL_OPERATION_PENDING', entityType: 'idempotency', entityId: pendingKey, message: 'Core operation journal is pending operator recovery.' },
        { severity: 'ERROR', code: 'ORDER_SPEND_DRIFT', entityType: 'order', entityId: 'raw-order-id-must-not-render', message: 'Order spending row does not match the student or total.' },
        { severity: 'WARNING', code: 'HOLD_STALE', entityType: 'point_hold', entityId: 'raw-hold-id-must-not-render', message: 'Active point hold is older than the review threshold.' },
      ],
    };
    const ready = {
      ok: true,
      ready: true,
      readOnly: true,
      generatedAt: '2026-08-31T18:02:00.000Z',
      readiness: { ok: true, blockingIssues: 0, pendingOperations: 0 },
      summary: { errors: 0, warnings: 0, issues: 0, truncated: false, pendingOperations: 0 },
      issues: [],
    };
    let scans = 0;
    let releaseRecovery;
    const recovery = new Promise(resolve => { releaseRecovery = resolve; });
    const app = await runPortal({
      role: 'admin',
      mainBootstrapData: main,
      rpcResponses: {
        getSchoolRewardsIntegrityReport: () => (scans++ === 0 ? blocked : ready),
        recoverSchoolRewardsOperation: () => recovery,
      },
    });

    await app.nodes['run-integrity'].onclick();
    expect(app.calls.find(call => call.name === 'getSchoolRewardsIntegrityReport').argument).toEqual({ holdAgeDays: 30, pendingAgeMinutes: 15 });
    expect(app.nodes['integrity-summary'].innerHTML).toContain('Blocked');
    expect(app.nodes['integrity-summary'].innerHTML).toContain('2 errors');
    expect(app.nodes['integrity-summary'].innerHTML).toContain('1 warnings');
    expect(app.nodes['integrity-summary'].innerHTML).toContain('1 pending operations');
    expect(app.nodes['integrity-summary'].innerHTML).toContain('Report truncated');
    expect(app.nodes['integrity-issues'].innerHTML).toContain('JOURNAL_OPERATION_PENDING');
    expect(app.nodes['integrity-issues'].innerHTML).toContain('Resume stored operation');
    expect(app.nodes['integrity-issues'].innerHTML).toContain('Ref ');
    expect(app.nodes['integrity-issues'].innerHTML).not.toContain(pendingKey);
    expect(app.nodes['integrity-issues'].innerHTML).not.toContain('raw-order-id-must-not-render');
    expect(app.nodes['integrity-issues'].innerHTML).not.toContain('raw-hold-id-must-not-render');
    expect((app.nodes['integrity-issues'].innerHTML.match(/data-recover-operation/g) || [])).toHaveLength(1);

    const recoverButton = app.nodes['integrity-issues'].querySelectorAll('[data-recover-operation]')[0];
    recoverButton.onclick();
    recoverButton.onclick();
    await flush();
    expect(app.calls.filter(call => call.name === 'recoverSchoolRewardsOperation')).toHaveLength(1);
    expect(app.calls.find(call => call.name === 'recoverSchoolRewardsOperation').argument).toEqual({ idempotencyKey: pendingKey });
    expect(recoverButton.disabled).toBe(true);
    releaseRecovery({ ok: true, recovered: true, kind: 'checkout', result: { ok: true } });
    await flush(20);
    expect(app.calls.filter(call => call.name === 'getSchoolRewardsIntegrityReport')).toHaveLength(2);
    expect(app.nodes['integrity-summary'].innerHTML).toContain('Ready');
    expect(app.nodes['integrity-summary'].innerHTML).toContain('0 errors');
    expect(app.nodes['integrity-issues'].innerHTML).not.toContain('Resume stored operation');
    expect(SCRIPT).toContain("rpc('verifySchoolRewardsAuditChain'");
    expect(SCRIPT).not.toMatch(/dataset\.(idempotencyKey|recoveryKey)|data-recover-operation="/);
  });

  it('bounds integrity issue rendering and leaves non-journal findings read-only', () => {
    expect(SCRIPT).toContain('allIssues.slice(0,100)');
    expect(SCRIPT).toContain("issue.code==='JOURNAL_OPERATION_PENDING'");
    expect(PORTAL).toContain('Most findings require operator review');
    expect(SCRIPT).toContain('does not edit the intent or roll back partial work');
    expect(SCRIPT).not.toContain('repairSchoolRewards');
  });

  it('fails closed for an invalid signed pending journal while leaving a different valid journal recoverable', async () => {
    const main = mainBootstrap('admin');
    main.students = [];
    main.members = [];
    const invalidKey = 'pending_invalid_signed_intent';
    const validKey = 'pending_valid_signed_intent';
    const report = {
      ok: false,
      ready: false,
      generatedAt: '2026-08-31T19:00:00.000Z',
      readiness: { ok: false, blockingIssues: 3, pendingOperations: 2 },
      summary: { errors: 3, warnings: 0, issues: 3, truncated: false, pendingOperations: 2 },
      issues: [
        { severity: 'ERROR', code: 'JOURNAL_OPERATION_PENDING', entityType: 'idempotency', entityId: invalidKey, message: 'Pending journal requires review.' },
        { severity: 'ERROR', code: 'JOURNAL_SIGNATURE_INVALID', entityType: 'idempotency', entityId: invalidKey, message: 'Stored intent signature validation failed.' },
        { severity: 'ERROR', code: 'JOURNAL_OPERATION_PENDING', entityType: 'idempotency', entityId: validKey, message: 'Valid signed journal is pending recovery.' },
      ],
    };
    let recoveredKey;
    const app = await runPortal({
      role: 'admin',
      mainBootstrapData: main,
      rpcResponses: {
        getSchoolRewardsIntegrityReport: report,
        recoverSchoolRewardsOperation: argument => {
          recoveredKey = argument.idempotencyKey;
          return { ok: true, recovered: true, kind: 'award', result: { ok: true } };
        },
      },
    });
    await app.nodes['run-integrity'].onclick();
    const issues = app.nodes['integrity-issues'].innerHTML;
    expect(issues).toContain('signed intent validation failed');
    expect(issues).toContain('Stop and review the school backup');
    expect(issues).toContain('do not resume this operation');
    expect(issues).not.toContain(invalidKey);
    expect(issues).not.toContain(validKey);
    expect((issues.match(/data-recover-operation/g) || [])).toHaveLength(1);

    app.nodes['integrity-issues'].querySelectorAll('[data-recover-operation]')[0].onclick();
    await flush(20);
    expect(recoveredKey).toBe(validKey);
    expect(SCRIPT).toContain("'JOURNAL_PENDING_INTENT_INVALID'");
    expect(SCRIPT).toContain("'JOURNAL_ENVELOPE_INVALID'");
  });

  it('shows failed receipt delivery and a cashier recovery action in order history', async () => {
    const main = mainBootstrap('cashier');
    main.students = [{ id: 'student-1', firstName: 'Avery', lastInitial: 'R', grade: '5', homeroom: '5A', balance: 100, reservedPoints: 0, availableBalance: 100 }];
    main.recentOrders = [{ id: 'order-1', studentId: 'student-1', total: 20, status: 'COMPLETED', at: '2026-08-25T12:00:00.000Z', lines: [{ quantity: 2, itemName: 'Sketchbook', lineTotal: 20 }] }];
    main.recentReceipts = [{ id: 'receipt-1', orderId: 'order-1', studentId: 'student-1', kind: 'PURCHASE', status: 'FAILED', sentAt: '2026-08-25T12:00:01.000Z' }];
    const app = await runPortal({ role: 'cashier', mainBootstrapData: main });
    const history = app.nodes['orders-body'].innerHTML;
    expect(history).toContain('FAILED');
    expect(history).toContain('data-resend="order-1"');
    expect(history).toContain('data-receipt-kind="PURCHASE"');
    expect(history).toContain('Send receipt');
  });

  it('requires an administrator to resolve uncertain receipt delivery before resend or refund', async () => {
    const main = mainBootstrap('admin');
    main.students = [{ id: 'student-1', firstName: 'Avery', lastInitial: 'R', grade: '5', homeroom: '5A', balance: 100, reservedPoints: 0, availableBalance: 100, active: true }];
    main.recentOrders = [{ id: 'order-uncertain', studentId: 'student-1', total: 20, status: 'COMPLETED', at: '2026-08-25T12:00:00.000Z', lines: [{ quantity: 2, itemName: 'Sketchbook', lineTotal: 20 }] }];
    main.recentReceipts = [{ id: 'receipt-uncertain', orderId: 'order-uncertain', studentId: 'student-1', kind: 'PURCHASE', status: 'PENDING', sentAt: '2026-08-25T12:00:01.000Z' }];
    const app = await runPortal({ role: 'admin', mainBootstrapData: main });
    const history = app.nodes['orders-body'].innerHTML;
    expect(history).toContain('PENDING');
    expect(history).toContain('data-resolve-receipt="SENT"');
    expect(history).toContain('data-resolve-receipt="FAILED"');
    expect(history).toContain('data-receipt-id="receipt-uncertain"');
    expect(history).not.toContain('data-resend="order-uncertain"');
    expect(history).not.toContain('data-refund="order-uncertain"');
  });

  it('searches active students by name, grade, or homeroom while keeping opaque IDs and balances out of the award picker', async () => {
    const main = mainBootstrap('staff');
    main.students = [
      { id: 'opaque-student-a', firstName: 'Avery', lastInitial: 'R', grade: '5', homeroom: '5A', balance: 900, availableBalance: 875, active: true },
      { id: 'opaque-student-b', firstName: 'Jordan', lastInitial: 'K', grade: '6', homeroom: '6B', balance: 40, availableBalance: 40, active: true },
    ];
    const app = await runPortal({ role: 'staff', mainBootstrapData: main });

    expect(app.nodes['award-student'].innerHTML).toContain('value="opaque-student-a"');
    expect(app.nodes['award-student'].innerHTML).toContain('Avery R. - Grade 5 | Homeroom 5A');
    expect(app.nodes['award-student'].innerHTML).not.toMatch(/875|900|available|balance/i);
    app.nodes['award-student-search'].value = '6b';
    app.nodes['award-student-search'].oninput();
    expect(app.nodes['award-student'].innerHTML).toContain('Jordan K.');
    expect(app.nodes['award-student'].innerHTML).not.toContain('Avery R.');
    app.nodes['award-student'].value = 'opaque-student-b';
    app.nodes['award-student'].onchange();
    expect(app.nodes['award-student-confirmation'].innerHTML).toContain('Jordan K.');
    expect(app.nodes['award-student-confirmation'].innerHTML).toContain('Grade 6 | Homeroom 6B');
    expect(app.nodes['award-student-confirmation'].innerHTML).not.toMatch(/40|balance/i);
  });

  it('shows and searches a stable non-secret student visual reference', async () => {
    const main = mainBootstrap('staff');
    main.students = [
      { id: 'opaque-student-a', firstName: 'Avery', lastInitial: 'R', grade: '5', homeroom: '5A', balance: 90, availableBalance: 90, active: true },
      { id: 'opaque-student-b', firstName: 'Avery', lastInitial: 'R', grade: '5', homeroom: '5A', balance: 40, availableBalance: 40, active: true },
    ];
    const app = await runPortal({ role: 'staff', mainBootstrapData: main });
    const refs = [...app.nodes['award-student'].innerHTML.matchAll(/Ref ([A-F0-9]{6})/g)].map(match => match[1]);
    expect(refs).toHaveLength(2);
    expect(new Set(refs).size).toBe(2);

    app.nodes['award-student-search'].value = refs[1].toLowerCase();
    app.nodes['award-student-search'].oninput();
    expect(app.nodes['award-student'].innerHTML).toContain('value="opaque-student-b"');
    expect(app.nodes['award-student'].innerHTML).not.toContain('value="opaque-student-a"');
    app.nodes['award-student'].value = 'opaque-student-b';
    app.nodes['award-student'].onchange();
    expect(app.nodes['award-student-confirmation'].innerHTML).toContain(`Ref ${refs[1]}`);
    expect(app.nodes['award-student-confirmation'].innerHTML).toContain('visual disambiguator only, not a PIN or sign-in code');
  });

  it('refreshes live cashier availability without losing the verified student and performs the refresh before confirmation', async () => {
    const initial = mainBootstrap('cashier');
    initial.students = [{ id: 'student-1', firstName: 'Avery', lastInitial: 'R', grade: '5', homeroom: '5A', balance: 100, reservedPoints: 0, availableBalance: 100, active: true }];
    initial.catalog = [{ id: 'prize-1', name: 'Sketchbook', cost: 20, inventoryLimit: 10, remaining: 5, active: true }];
    const live = structuredClone(initial);
    live.students[0].balance = 42;
    live.students[0].availableBalance = 42;
    live.catalog[0].remaining = 2;
    let loads = 0;
    const app = await runPortal({ role: 'cashier', rpcResponses: { getSchoolRewardsBootstrap: () => (++loads === 1 ? initial : live) } });
    app.nodes['checkout-student'].value = 'student-1';
    app.nodes['checkout-student'].onchange();
    await app.nodes['refresh-store-live'].onclick();

    expect(app.calls.filter(call => call.name === 'getSchoolRewardsBootstrap')).toHaveLength(2);
    expect(app.nodes['checkout-student'].value).toBe('student-1');
    expect(app.nodes['checkout-student-confirmation'].innerHTML).toContain('42 points available');
    expect(app.nodes.notice.textContent).toContain('cart was preserved');
    expect(SCRIPT.indexOf('await refreshStoreBootstrap();var review=cartReview()')).toBeLessThan(SCRIPT.indexOf("window.confirm('LIVE CHECK COMPLETE"));
    expect(SCRIPT).toContain('checkoutRequestKey(student.id,windowItem.id,lines)');
    expect(SCRIPT).toContain('The cart and retry key were preserved');
  });

  it('replays an exact stored checkout before any live refresh or preflight', () => {
    const start = SCRIPT.indexOf("$('checkout-form').onsubmit");
    const end = SCRIPT.indexOf("$('sis-snapshot-file').onchange", start);
    const checkout = SCRIPT.slice(start, end);
    const lookup = checkout.indexOf("existingRetryKey('checkout',replayPayload)");
    const replayRpc = checkout.indexOf("rpc('checkoutSchoolRewardsOrder'", lookup);
    const liveRefresh = checkout.indexOf("notice('Refreshing live availability before final confirmation");
    expect(lookup).toBeGreaterThan(-1);
    expect(replayRpc).toBeGreaterThan(lookup);
    expect(liveRefresh).toBeGreaterThan(replayRpc);
    expect(checkout.slice(lookup, liveRefresh)).not.toContain('refreshStoreBootstrap');
    expect(checkout).toContain('await finishCheckout(replayOut,replayStudent)');
    expect(checkout).toContain('The cart and retry key were preserved. Retry the same checkout');
  });

  it('offers persistent view and print actions and can focus the unresolved receipt queue', async () => {
    const main = mainBootstrap('admin');
    main.students = [{ id: 'student-1', firstName: 'Avery', lastInitial: 'R', grade: '5', homeroom: '5A', balance: 100, availableBalance: 100, active: true }];
    main.recentOrders = [
      { id: 'order-sent', studentId: 'student-1', total: 10, status: 'COMPLETED', at: '2026-08-25T12:00:00.000Z', lines: [{ quantity: 1, itemName: 'Pencil', lineTotal: 10 }] },
      { id: 'order-pending', studentId: 'student-1', total: 20, status: 'REFUNDED', at: '2026-08-26T12:00:00.000Z', lines: [{ quantity: 1, itemName: 'Sketchbook', lineTotal: 20 }] },
    ];
    main.recentReceipts = [
      { id: 'receipt-sent', orderId: 'order-sent', studentId: 'student-1', kind: 'PURCHASE', status: 'SENT', sentAt: '2026-08-25T12:00:01.000Z' },
      { id: 'receipt-pending', orderId: 'order-pending', studentId: 'student-1', kind: 'REFUND', status: 'PENDING', sentAt: '2026-08-26T12:00:01.000Z' },
    ];
    const app = await runPortal({ role: 'admin', mainBootstrapData: main });
    expect(app.nodes['orders-body'].innerHTML).toContain('data-view-receipt="order-sent"');
    expect(app.nodes['orders-body'].innerHTML).toContain('data-print-order-receipt="order-pending"');
    expect(app.nodes['show-unresolved-receipts'].textContent).toContain('(1)');
    app.nodes['show-unresolved-receipts'].onclick();
    expect(app.nodes['orders-body'].innerHTML).toContain('order-pending');
    expect(app.nodes['orders-body'].innerHTML).not.toContain('order-sent');
    expect(app.nodes['show-unresolved-receipts'].attributes['aria-pressed']).toBe('true');
    expect(SCRIPT).toContain("refunded?'Refund receipt':'Receipt'");
  });

  it('keeps all live inventory fields out of existing-prize metadata saves', async () => {
    const main = mainBootstrap('admin');
    main.students = [];
    main.members = [];
    main.catalog = [{ id: 'prize-1', name: 'Sketchbook', description: 'Blank pages', imageUrl: '', cost: 20, inventoryLimit: 10, remaining: 3, inventoryVersion: 7, active: true }];
    const app = await runPortal({ role: 'admin', mainBootstrapData: main, rpcResponses: { adminUpsertRewardsCatalogItem: argument => ({ ok: true, item: { ...main.catalog[0], ...argument } }) } });
    app.nodes['catalog-id'].value = 'prize-1';
    app.nodes['catalog-id'].onchange();
    expect(app.nodes['catalog-remaining'].value).toBe('');
    expect(app.nodes['catalog-new-inventory'].hidden).toBe(true);
    expect(app.nodes['catalog-live-inventory'].textContent).toContain('3 of 10 remaining • inventory version 7');
    expect(app.nodes['catalog-list'].innerHTML).toContain('inventory version 7');
    await app.nodes['catalog-form'].onsubmit({ preventDefault() {}, target: app.nodes['catalog-form'] });
    const save = app.calls.find(call => call.name === 'adminUpsertRewardsCatalogItem');
    expect(save.argument).toMatchObject({ id: 'prize-1', name: 'Sketchbook', cost: 20 });
    expect(save.argument.idempotencyKey).toMatch(/^catalog_save_/);
    expect(save.argument).not.toHaveProperty('inventoryLimit');
    expect(save.argument).not.toHaveProperty('remaining');
    expect(save.argument).not.toHaveProperty('expectedInventoryVersion');
    expect(save.argument).not.toHaveProperty('reason');
    expect(PORTAL).not.toContain('absolute stock correction');
  });

  it('creates unlimited or finite prizes atomically with explicit starting inventory', async () => {
    const unlimitedMain = mainBootstrap('admin');
    unlimitedMain.students = [];
    unlimitedMain.members = [];
    const unlimited = await runPortal({
      role: 'admin',
      mainBootstrapData: unlimitedMain,
      rpcResponses: { adminUpsertRewardsCatalogItem: argument => ({ ok: true, item: { id: 'prize-unlimited', inventoryVersion: 1, ...argument } }) },
    });
    unlimited.nodes['catalog-name'].value = 'Maker pass';
    unlimited.nodes['catalog-cost'].value = '40';
    unlimited.nodes['catalog-inventory-mode'].value = 'UNLIMITED';
    await unlimited.nodes['catalog-form'].onsubmit({ preventDefault() {} });
    const unlimitedSave = unlimited.calls.find(call => call.name === 'adminUpsertRewardsCatalogItem');
    expect(unlimitedSave.argument).toMatchObject({ name: 'Maker pass', cost: 40, inventoryLimit: -1, remaining: -1 });
    expect(unlimitedSave.argument).not.toHaveProperty('id');
    expect(unlimitedSave.argument.idempotencyKey).toMatch(/^catalog_save_/);

    const finiteMain = mainBootstrap('admin');
    finiteMain.students = [];
    finiteMain.members = [];
    const finite = await runPortal({
      role: 'admin',
      mainBootstrapData: finiteMain,
      rpcResponses: { adminUpsertRewardsCatalogItem: argument => ({ ok: true, item: { id: 'prize-finite', inventoryVersion: 1, remaining: argument.inventoryLimit, ...argument } }) },
    });
    finite.nodes['catalog-name'].value = 'Art kit';
    finite.nodes['catalog-cost'].value = '75';
    finite.nodes['catalog-inventory-mode'].value = 'FINITE';
    finite.nodes['catalog-inventory-mode'].onchange();
    finite.nodes['catalog-stock'].value = '24';
    finite.nodes['catalog-remaining'].value = '';
    expect(finite.nodes['catalog-stock-field'].hidden).toBe(false);
    await finite.nodes['catalog-form'].onsubmit({ preventDefault() {} });
    const finiteSave = finite.calls.find(call => call.name === 'adminUpsertRewardsCatalogItem');
    expect(finiteSave.argument).toMatchObject({ name: 'Art kit', cost: 75, inventoryLimit: 24 });
    expect(finiteSave.argument).not.toHaveProperty('remaining');
  });

  it('does not clamp invalid new-prize inventory', async () => {
    const main = mainBootstrap('admin');
    main.students = [];
    main.members = [];
    const app = await runPortal({ role: 'admin', mainBootstrapData: main });
    app.nodes['catalog-name'].value = 'Art kit';
    app.nodes['catalog-cost'].value = '75';
    app.nodes['catalog-inventory-mode'].value = 'FINITE';
    app.nodes['catalog-inventory-mode'].onchange();
    app.nodes['catalog-stock'].value = '10';
    app.nodes['catalog-remaining'].value = '11';
    await app.nodes['catalog-form'].onsubmit({ preventDefault() {} });
    expect(app.calls.filter(call => call.name === 'adminUpsertRewardsCatalogItem')).toHaveLength(0);
    expect(app.nodes.notice.textContent).toContain('no value was clamped');
  });

  it.each([
    { action: 'ADD', current: [10, 3], fields: { amount: '2' }, expected: [10, 5] },
    { action: 'REMOVE', current: [10, 3], fields: { amount: '2' }, expected: [10, 1] },
    { action: 'RECONCILE', current: [10, 3], fields: { remaining: '7' }, expected: [10, 7] },
    { action: 'CHANGE_LIMIT', current: [10, 3], fields: { limit: '20', remaining: '11' }, expected: [20, 11] },
    { action: 'TO_UNLIMITED', current: [10, 3], fields: {}, expected: [-1, -1], transition: 'TO_UNLIMITED' },
    { action: 'TO_FINITE', current: [-1, -1], fields: { limit: '8', remaining: '6' }, expected: [8, 6], transition: 'TO_FINITE' },
  ])('reviews $action without a write, then confirms explicit versioned targets', async ({ action, current, fields, expected, transition }) => {
    const main = mainBootstrap('admin');
    main.students = [];
    main.members = [];
    const item = { id: 'prize-1', name: 'Sketchbook', description: '', imageUrl: '', cost: 20, inventoryLimit: current[0], remaining: current[1], inventoryVersion: 4, active: true };
    main.catalog = [item];
    const app = await runPortal({
      role: 'admin',
      mainBootstrapData: main,
      rpcResponses: { adminUpsertRewardsCatalogItem: argument => ({ ok: true, item: { ...item, inventoryLimit: argument.inventoryLimit, remaining: argument.remaining, inventoryVersion: 5 } }) },
    });
    app.nodes['inventory-id'].value = item.id;
    app.nodes['inventory-id'].onchange();
    app.nodes['inventory-action'].value = action;
    app.nodes['inventory-action'].onchange();
    app.nodes['inventory-amount'].value = fields.amount || '';
    app.nodes['inventory-target-limit'].value = fields.limit || '';
    app.nodes['inventory-target-remaining'].value = fields.remaining || '';
    app.nodes['inventory-reason'].value = 'Verified physical stock count';

    app.nodes['inventory-form'].onsubmit({ preventDefault() {} });
    expect(app.calls.filter(call => call.name === 'adminUpsertRewardsCatalogItem')).toHaveLength(0);
    expect(app.nodes['inventory-review'].hidden).toBe(false);
    expect(app.nodes['inventory-review'].innerHTML).toContain('nothing has been saved yet');
    expect(app.nodes['inventory-review'].innerHTML).toContain('Old:');
    expect(app.nodes['inventory-review'].innerHTML).toContain('New:');

    await app.nodes['inventory-confirm'].onclick();
    const save = app.calls.find(call => call.name === 'adminUpsertRewardsCatalogItem');
    expect(save.argument).toMatchObject({
      id: item.id,
      inventoryLimit: expected[0],
      remaining: expected[1],
      expectedInventoryVersion: 4,
      reason: 'Verified physical stock count',
    });
    expect(save.argument.idempotencyKey).toMatch(/^inventory_adjust_/);
    if (transition) expect(save.argument.inventoryTransition).toBe(transition);
    else expect(save.argument).not.toHaveProperty('inventoryTransition');
  });

  it('supports edit and cancel before confirmation without writing inventory', async () => {
    const main = mainBootstrap('admin');
    main.students = [];
    main.members = [];
    main.catalog = [{ id: 'prize-1', name: 'Sketchbook', cost: 20, inventoryLimit: 10, remaining: 3, inventoryVersion: 2, active: true }];
    const app = await runPortal({ role: 'admin', mainBootstrapData: main });
    app.nodes['inventory-id'].value = 'prize-1';
    app.nodes['inventory-id'].onchange();
    app.nodes['inventory-action'].value = 'ADD';
    app.nodes['inventory-action'].onchange();
    app.nodes['inventory-amount'].value = '2';
    app.nodes['inventory-reason'].value = 'Received sealed supply box';
    app.nodes['inventory-form'].onsubmit({ preventDefault() {} });
    app.nodes['inventory-edit-review'].onclick();
    expect(app.nodes['inventory-review'].hidden).toBe(true);
    expect(app.nodes['inventory-draft-fields'].hidden).toBe(false);

    app.nodes['inventory-form'].onsubmit({ preventDefault() {} });
    app.nodes['inventory-cancel'].onclick();
    expect(app.nodes['inventory-review'].hidden).toBe(true);
    expect(app.nodes['inventory-reason'].value).toBe('');
    expect(app.calls.filter(call => call.name === 'adminUpsertRewardsCatalogItem')).toHaveLength(0);
  });

  it('refuses to clamp an adjustment outside finite inventory bounds', async () => {
    const main = mainBootstrap('admin');
    main.students = [];
    main.members = [];
    main.catalog = [{ id: 'prize-1', name: 'Sketchbook', cost: 20, inventoryLimit: 10, remaining: 9, inventoryVersion: 2, active: true }];
    const app = await runPortal({ role: 'admin', mainBootstrapData: main });
    app.nodes['inventory-id'].value = 'prize-1';
    app.nodes['inventory-id'].onchange();
    app.nodes['inventory-action'].value = 'ADD';
    app.nodes['inventory-action'].onchange();
    app.nodes['inventory-amount'].value = '2';
    app.nodes['inventory-reason'].value = 'Received sealed supply box';
    app.nodes['inventory-form'].onsubmit({ preventDefault() {} });
    expect(app.nodes['inventory-review'].hidden).toBe(true);
    expect(app.nodes.notice.textContent).toContain('no value was clamped');
    expect(app.calls.filter(call => call.name === 'adminUpsertRewardsCatalogItem')).toHaveLength(0);
  });

  it('preserves an ambiguous inventory draft and hashed retry key for an exact retry', async () => {
    const main = mainBootstrap('admin');
    main.students = [];
    main.members = [];
    const item = { id: 'prize-1', name: 'Sketchbook', cost: 20, inventoryLimit: 10, remaining: 3, inventoryVersion: 2, active: true };
    main.catalog = [item];
    let attempts = 0;
    const storage = memorySessionStorage();
    const app = await runPortal({
      role: 'admin',
      mainBootstrapData: main,
      sessionStore: storage,
      rpcResponses: { adminUpsertRewardsCatalogItem: argument => {
        if (attempts++ === 0) throw new Error('Network response was lost');
        return { ok: true, item: { ...item, inventoryLimit: argument.inventoryLimit, remaining: argument.remaining, inventoryVersion: 3 } };
      } },
    });
    app.nodes['inventory-id'].value = item.id;
    app.nodes['inventory-id'].onchange();
    app.nodes['inventory-action'].value = 'ADD';
    app.nodes['inventory-action'].onchange();
    app.nodes['inventory-amount'].value = '2';
    app.nodes['inventory-reason'].value = 'Received sealed supply box';
    app.nodes['inventory-form'].onsubmit({ preventDefault() {} });
    await app.nodes['inventory-confirm'].onclick();
    const first = app.calls.filter(call => call.name === 'adminUpsertRewardsCatalogItem')[0];
    expect(app.nodes['inventory-review'].innerHTML).toContain('Response uncertain');
    expect(app.nodes['inventory-edit-review'].disabled).toBe(true);
    expect(app.nodes['inventory-cancel'].disabled).toBe(true);
    expect(storage.values.size).toBe(1);
    const persisted = [...storage.values.values()][0];
    expect(persisted).toMatch(/^\{"key":"inventory_adjust_[^"]+","fingerprint":"[a-f0-9]+"\}$/);
    expect(persisted).not.toContain('prize-1');
    expect(persisted).not.toContain('Received sealed');

    await app.nodes['inventory-confirm'].onclick();
    const saves = app.calls.filter(call => call.name === 'adminUpsertRewardsCatalogItem');
    expect(saves).toHaveLength(2);
    expect(saves[1].argument).toEqual(saves[0].argument);
    expect(saves[1].argument.idempotencyKey).toBe(first.argument.idempotencyKey);
    expect(storage.values.size).toBe(0);
  });

  it('invalidates a stale review, clears its key, and reloads the current stock version', async () => {
    const initial = mainBootstrap('admin');
    initial.students = [];
    initial.members = [];
    initial.catalog = [{ id: 'prize-1', name: 'Sketchbook', cost: 20, inventoryLimit: 10, remaining: 3, inventoryVersion: 2, active: true }];
    const current = structuredClone(initial);
    current.catalog[0].remaining = 1;
    current.catalog[0].inventoryVersion = 6;
    let loads = 0;
    const storage = memorySessionStorage();
    const stale = Object.assign(new Error('Stock changed'), { code: 'inventory_stale' });
    const app = await runPortal({
      role: 'admin',
      sessionStore: storage,
      rpcResponses: {
        getSchoolRewardsBootstrap: () => (++loads === 1 ? initial : current),
        adminUpsertRewardsCatalogItem: () => { throw stale; },
      },
    });
    app.nodes['inventory-id'].value = 'prize-1';
    app.nodes['inventory-id'].onchange();
    app.nodes['inventory-action'].value = 'REMOVE';
    app.nodes['inventory-action'].onchange();
    app.nodes['inventory-amount'].value = '1';
    app.nodes['inventory-reason'].value = 'Removed damaged package';
    app.nodes['inventory-form'].onsubmit({ preventDefault() {} });
    await app.nodes['inventory-confirm'].onclick();
    expect(app.calls.filter(call => call.name === 'getSchoolRewardsBootstrap')).toHaveLength(2);
    expect(app.nodes['inventory-review'].hidden).toBe(true);
    expect(app.nodes['inventory-current'].textContent).toContain('1 of 10 remaining • inventory version 6');
    expect(app.nodes.notice.textContent).toContain('Inventory changed before confirmation');
    expect(storage.values.size).toBe(0);
  });

  it('guards inventory confirmation against a double submit', async () => {
    const main = mainBootstrap('admin');
    main.students = [];
    main.members = [];
    const item = { id: 'prize-1', name: 'Sketchbook', cost: 20, inventoryLimit: 10, remaining: 3, inventoryVersion: 2, active: true };
    main.catalog = [item];
    let release;
    const pending = new Promise(resolve => { release = resolve; });
    const app = await runPortal({ role: 'admin', mainBootstrapData: main, rpcResponses: { adminUpsertRewardsCatalogItem: () => pending } });
    app.nodes['inventory-id'].value = item.id;
    app.nodes['inventory-id'].onchange();
    app.nodes['inventory-action'].value = 'ADD';
    app.nodes['inventory-action'].onchange();
    app.nodes['inventory-amount'].value = '2';
    app.nodes['inventory-reason'].value = 'Received sealed supply box';
    app.nodes['inventory-form'].onsubmit({ preventDefault() {} });
    const first = app.nodes['inventory-confirm'].onclick();
    const second = app.nodes['inventory-confirm'].onclick();
    await flush();
    expect(app.calls.filter(call => call.name === 'adminUpsertRewardsCatalogItem')).toHaveLength(1);
    expect(app.nodes['inventory-confirm'].disabled).toBe(true);
    release({ ok: true, item: { ...item, inventoryLimit: 10, remaining: 5, inventoryVersion: 3 } });
    await Promise.all([first, second]);
  });

  it('freezes a server-completed create after its response is lost and permits only the exact-key retry', async () => {
    const main = mainBootstrap('admin');
    main.students = [];
    main.members = [];
    const storage = memorySessionStorage();
    let attempts = 0;
    let serverCompletedCreate;
    const app = await runPortal({
      role: 'admin',
      mainBootstrapData: main,
      sessionStore: storage,
      rpcResponses: { adminUpsertRewardsCatalogItem: argument => {
        if (attempts++ === 0) {
          serverCompletedCreate = structuredClone(argument);
          throw new Error('Response lost after the server completed the create');
        }
        return { ok: true, item: { id: 'prize-new', inventoryVersion: 1, ...argument } };
      } },
    });
    app.nodes['catalog-name'].value = 'Community art kit';
    app.nodes['catalog-cost'].value = '60';
    app.nodes['catalog-inventory-mode'].value = 'FINITE';
    app.nodes['catalog-stock'].value = '12';
    app.nodes['catalog-remaining'].value = '10';
    await app.nodes['catalog-form'].onsubmit({ preventDefault() {} });
    const stored = [...storage.values.values()][0];
    expect(stored).not.toContain('Community art kit');
    expect(stored).not.toContain('prize');
    expect(app.nodes['catalog-name'].value).toBe('Community art kit');
    expect(serverCompletedCreate).toBeTruthy();
    expect(app.nodes['catalog-name'].disabled).toBe(true);
    expect(app.nodes['catalog-id'].disabled).toBe(true);
    expect(app.nodes['catalog-inventory-mode'].disabled).toBe(true);
    expect(app.nodes['catalog-submit'].disabled).toBe(false);
    expect(app.nodes['catalog-submit'].textContent).toBe('Retry exact create');
    expect(app.nodes['catalog-save-status'].textContent).toContain('Fields are frozen to prevent a duplicate prize');

    app.nodes['catalog-name'].value = 'Different duplicate prize';
    app.nodes['catalog-cost'].value = '999';
    app.nodes['catalog-inventory-mode'].value = 'UNLIMITED';
    app.nodes['catalog-stock'].value = '500';
    app.nodes['catalog-remaining'].value = '500';
    app.nodes['catalog-description'].value = 'Changed after response loss';
    expect(app.calls.filter(call => call.name === 'adminUpsertRewardsCatalogItem')).toHaveLength(1);
    await app.nodes['catalog-form'].onsubmit({ preventDefault() {} });
    const saves = app.calls.filter(call => call.name === 'adminUpsertRewardsCatalogItem');
    expect(saves).toHaveLength(2);
    expect(saves[1].argument).toEqual(serverCompletedCreate);
    expect(saves[1].argument.idempotencyKey).toBe(saves[0].argument.idempotencyKey);
    expect(storage.values.size).toBe(0);
  });

  it('freezes an ambiguous metadata-only save without adding inventory or accepting field edits', async () => {
    const main = mainBootstrap('admin');
    main.students = [];
    main.members = [];
    const item = { id: 'prize-1', name: 'Sketchbook', description: 'Blank pages', imageUrl: '', cost: 20, inventoryLimit: 10, remaining: 3, inventoryVersion: 7, active: true };
    main.catalog = [item];
    let attempts = 0;
    const app = await runPortal({
      role: 'admin',
      mainBootstrapData: main,
      rpcResponses: { adminUpsertRewardsCatalogItem: argument => {
        if (attempts++ === 0) throw new Error('Metadata response unavailable');
        return { ok: true, item: { ...item, name: argument.name } };
      } },
    });
    app.nodes['catalog-id'].value = item.id;
    app.nodes['catalog-id'].onchange();
    app.nodes['catalog-name'].value = 'Updated sketchbook';
    await app.nodes['catalog-form'].onsubmit({ preventDefault() {} });
    const first = app.calls.filter(call => call.name === 'adminUpsertRewardsCatalogItem')[0].argument;
    expect(app.nodes['catalog-submit'].textContent).toBe('Retry exact prize-details save');
    expect(app.nodes['catalog-name'].disabled).toBe(true);
    expect(first).not.toHaveProperty('inventoryLimit');
    expect(first).not.toHaveProperty('remaining');
    app.nodes['catalog-name'].value = 'Unsafe changed metadata';
    await app.nodes['catalog-form'].onsubmit({ preventDefault() {} });
    const saves = app.calls.filter(call => call.name === 'adminUpsertRewardsCatalogItem');
    expect(saves).toHaveLength(2);
    expect(saves[1].argument).toEqual(first);
  });

  it('fails closed after reload when a catalog retry key exists without its exact in-memory draft', async () => {
    const main = mainBootstrap('admin');
    main.students = [];
    main.members = [];
    const storage = memorySessionStorage();
    storage.setItem('alloflow_school_rewards_retry_catalog_save', JSON.stringify({ key: 'catalog_save_prior_request', fingerprint: 'a'.repeat(64) }));
    const app = await runPortal({ role: 'admin', mainBootstrapData: main, sessionStore: storage });
    expect(app.nodes['catalog-submit'].disabled).toBe(true);
    expect(app.nodes['catalog-name'].disabled).toBe(true);
    expect(app.nodes['catalog-save-status'].textContent).toContain('no longer has its exact draft');
    expect(app.nodes['catalog-save-status'].textContent).toContain('Run repository integrity and signed-operation recovery');
    await app.nodes['catalog-form'].onsubmit({ preventDefault() {} });
    expect(app.calls.filter(call => call.name === 'adminUpsertRewardsCatalogItem')).toHaveLength(0);
    expect(app.nodes.notice.textContent).toContain('Do not reconstruct it');
  });

  it('unfreezes a catalog draft only for a coded, definite pre-write validation failure', async () => {
    const main = mainBootstrap('admin');
    main.students = [];
    main.members = [];
    const storage = memorySessionStorage();
    const definite = Object.assign(new Error('Rejected before journaling'), { code: 'bad_catalog' });
    const app = await runPortal({ role: 'admin', mainBootstrapData: main, sessionStore: storage, rpcResponses: { adminUpsertRewardsCatalogItem: () => { throw definite; } } });
    app.nodes['catalog-name'].value = 'Community art kit';
    app.nodes['catalog-cost'].value = '60';
    app.nodes['catalog-inventory-mode'].value = 'UNLIMITED';
    await app.nodes['catalog-form'].onsubmit({ preventDefault() {} });
    expect(app.nodes['catalog-name'].disabled).toBe(false);
    expect(app.nodes['catalog-submit'].textContent).toBe('Create prize');
    expect(app.nodes['catalog-save-status'].hidden).toBe(true);
    expect(storage.values.size).toBe(0);
  });

  it('guards guardian digest runs against confirmation bypass and double submission', async () => {
    const main = mainBootstrap('admin');
    main.students = [];
    main.members = [];
    let release;
    const pending = new Promise(resolve => { release = resolve; });
    const app = await runPortal({ role: 'admin', mainBootstrapData: main, rpcResponses: { sendSchoolRewardsGuardianDigests: () => pending } });
    app.nodes['guardian-period'].value = '2026-T1-week-10';
    app.nodes['guardian-limit'].value = '100';
    const first = app.nodes['guardian-digest-form'].onsubmit({ preventDefault() {} });
    const second = app.nodes['guardian-digest-form'].onsubmit({ preventDefault() {} });
    await flush();
    expect(app.calls.filter(call => call.name === 'sendSchoolRewardsGuardianDigests')).toHaveLength(1);
    expect(app.nodes['guardian-digest-submit'].disabled).toBe(true);
    release({ id: 'mail-run-guardian-1', kind: 'GUARDIAN_DIGEST', periodKey: '2026-T1-week-10', requestedLimit: 100, attempted: 1, sent: 1, skipped: 0, failed: 0, uncertain: 0, pending: 0, status: 'RUNNING', remaining: 99, continuationScheduled: true, canResume: false, updatedAt: '2026-08-31T12:00:00.000Z' });
    await Promise.all([first, second]);
    expect(app.nodes['guardian-digest-submit'].disabled).toBe(false);
  });

  it('renders every mail-run state with privacy-safe counters, quota reserve, and no recipient or raw-error data', async () => {
    const main = mainBootstrap('admin');
    main.students = [];
    main.members = [];
    const statuses = ['QUEUED', 'RUNNING', 'PAUSED_QUOTA', 'NEEDS_REVIEW', 'COMPLETED', 'FAILED'];
    main.recentMailRuns = statuses.map((status, index) => mailRun({
      id: `run-${status.toLowerCase()}`, kind: index % 2 ? 'GUARDIAN_DIGEST' : 'STUDENT_STATEMENT', status,
      periodKey: `2026-T1-${index + 1}`, updatedAt: `2026-08-31T12:0${index}:00.000Z`, continuationScheduled: status === 'RUNNING',
      canResume: status === 'PAUSED_QUOTA', recipientEmail: 'hidden-student@school.example', rawError: 'SMTP mailbox secret failure',
    }));
    main.unresolvedMailDeliveries = [
      { id: 'outbox-pending', runId: 'run-needs_review', kind: 'STUDENT_STATEMENT', status: 'PENDING', attemptedAt: '2026-08-31T12:00:00.000Z', errorCode: '', recipientEmail: 'hidden@school.example', studentName: 'Private Student', rawError: 'private SMTP response' },
      { id: 'outbox-unknown', runId: 'run-needs_review', kind: 'GUARDIAN_DIGEST', status: 'UNKNOWN', attemptedAt: '2026-08-31T12:02:00.000Z', errorCode: 'PROVIDER_UNCERTAIN', guardianEmail: 'hidden-family@example.org' },
      { id: 'outbox-failed-unconfirmed', runId: 'run-failed', kind: 'STUDENT_STATEMENT', status: 'FAILED', attemptedAt: '2026-08-31T12:03:00.000Z', errorCode: 'SEND_FAILED' },
      { id: 'outbox-failed-confirmed', runId: 'run-failed', kind: 'STUDENT_STATEMENT', status: 'FAILED', attemptedAt: '2026-08-31T12:03:30.000Z', resolvedAt: '2026-08-31T12:04:00.000Z', errorCode: 'ADMIN_CONFIRMED_FAILED', retryOfId: 'outbox-original' },
    ];
    const app = await runPortal({ role: 'admin', mainBootstrapData: main });
    const runs = app.nodes['recent-mail-runs'].innerHTML;
    const deliveries = app.nodes['unresolved-mail-deliveries'].innerHTML;
    statuses.forEach(status => expect(runs).toContain(status.replace(/_/g, ' ')));
    expect(runs).toContain('Requested 100');
    expect(runs).toContain('Attempted 12');
    expect(runs).toContain('Unknown 1');
    expect(runs).toContain('protected Google mail quota reserve');
    expect(runs).toContain('Recipients remaining in this run: 74');
    expect(runs).not.toContain('Google quota remaining: 74');
    expect(runs).toContain('A continuation is scheduled');
    expect(runs).toContain('server reports this run can continue');
    expect(runs).not.toMatch(/hidden-student|SMTP mailbox secret/i);
    expect(deliveries).not.toMatch(/hidden@|hidden-family|Private Student|private SMTP/i);
    expect(deliveries).toContain('code PROVIDER_UNCERTAIN');
    expect(deliveries).toContain('Delivery in progress');
    expect(deliveries).toContain('not server-confirmed as retry-eligible');
    expect(app.nodes['unresolved-mail-deliveries'].querySelectorAll('[data-mail-resolve]')).toHaveLength(2);
    expect(app.nodes['unresolved-mail-deliveries'].querySelectorAll('[data-mail-retry]')).toHaveLength(1);
    expect(SCRIPT).not.toMatch(/resumeSchoolRewardsMailRun|retrySchoolRewardsMailRun/);
  });

  it('blocks active same-kind and period runs instead of starting duplicates', async () => {
    const main = mainBootstrap('admin');
    main.students = [];
    main.members = [];
    const statementPeriod = `manual-${new Date().toISOString().slice(0, 10)}`;
    main.recentMailRuns = [
      mailRun({ id: 'active-guardian', kind: 'GUARDIAN_DIGEST', periodKey: '2026-T1-week-10', status: 'PAUSED_QUOTA', continuationScheduled: false, canResume: true }),
      mailRun({ id: 'active-statement', kind: 'STUDENT_STATEMENT', periodKey: statementPeriod, status: 'RUNNING' }),
    ];
    const app = await runPortal({ role: 'admin', mainBootstrapData: main });
    app.nodes['guardian-period'].value = '2026-T1-week-10';
    app.nodes['guardian-limit'].value = '100';
    await app.nodes['guardian-digest-form'].onsubmit({ preventDefault() {} });
    await app.nodes['send-now'].onclick();
    expect(app.calls.filter(call => call.name === 'sendSchoolRewardsGuardianDigests')).toHaveLength(0);
    expect(app.calls.filter(call => call.name === 'sendSchoolRewardsBalanceStatements')).toHaveLength(0);
    expect(app.nodes.notice.textContent).toContain('already RUNNING');
  });

  it('preserves a hashed exact start key after an ambiguous response and refreshes runs before another attempt', async () => {
    const initial = mainBootstrap('admin');
    initial.students = [];
    initial.members = [];
    const discovered = structuredClone(initial);
    discovered.recentMailRuns = [mailRun({ id: 'discovered-run', kind: 'GUARDIAN_DIGEST', periodKey: '2026-T1-week-10', status: 'QUEUED' })];
    const storage = memorySessionStorage();
    let loads = 0;
    const app = await runPortal({
      role: 'admin', sessionStore: storage,
      rpcResponses: {
        getSchoolRewardsBootstrap: () => (++loads === 1 ? initial : discovered),
        sendSchoolRewardsGuardianDigests: () => { throw new Error('Response lost after run creation'); },
      },
    });
    app.nodes['guardian-period'].value = '2026-T1-week-10';
    app.nodes['guardian-limit'].value = '100';
    await app.nodes['guardian-digest-form'].onsubmit({ preventDefault() {} });
    expect(app.calls.filter(call => call.name === 'sendSchoolRewardsGuardianDigests')).toHaveLength(1);
    expect(app.calls.filter(call => call.name === 'getSchoolRewardsBootstrap')).toHaveLength(2);
    expect(app.nodes['guardian-mail-run-status'].innerHTML).toContain('discovered-run'.includes('never-visible') ? 'never' : 'Ref');
    expect(app.nodes.notice.textContent).toContain('No duplicate run was started');
    expect(storage.values.size).toBe(0);
  });

  it('keeps the exact start key when an ambiguous run is not yet visible and stores no period data', async () => {
    const main = mainBootstrap('admin');
    main.students = [];
    main.members = [];
    const storage = memorySessionStorage();
    const app = await runPortal({ role: 'admin', mainBootstrapData: main, sessionStore: storage, rpcResponses: { sendSchoolRewardsGuardianDigests: () => { throw new Error('Response unavailable'); } } });
    app.nodes['guardian-period'].value = '2026-T1-week-secret';
    app.nodes['guardian-limit'].value = '100';
    await app.nodes['guardian-digest-form'].onsubmit({ preventDefault() {} });
    expect(storage.values.size).toBe(1);
    const stored = [...storage.values.values()][0];
    expect(stored).toMatch(/"key":"mail_run_guardian_/);
    expect(stored).not.toContain('2026-T1-week-secret');
    expect(app.nodes.notice.textContent).toContain('exact retry key was preserved');
  });

  it('refreshes one run by opaque runId and replaces its privacy-safe status', async () => {
    const main = mainBootstrap('admin');
    main.students = [];
    main.members = [];
    main.recentMailRuns = [mailRun({ id: 'run-refresh', status: 'QUEUED' })];
    const completed = mailRun({ id: 'run-refresh', status: 'COMPLETED', attempted: 10, sent: 10, failed: 0, uncertain: 0, pending: 0, completedAt: '2026-08-31T13:00:00.000Z', continuationScheduled: false });
    const app = await runPortal({ role: 'admin', mainBootstrapData: main, rpcResponses: { getSchoolRewardsMailRun: completed } });
    const button = app.nodes['recent-mail-runs'].querySelectorAll('[data-mail-refresh]')[0];
    await button.onclick();
    expect(app.calls.find(call => call.name === 'getSchoolRewardsMailRun').argument).toEqual({ runId: 'run-refresh' });
    expect(app.nodes['recent-mail-runs'].innerHTML).toContain('COMPLETED');
    expect(app.nodes['recent-mail-runs'].innerHTML).toContain('Sent 10');
  });

  it('keeps fresh pending delivery read-only and resolves only a complete unknown delivery', async () => {
    const main = mainBootstrap('admin');
    main.students = [];
    main.members = [];
    main.unresolvedMailDeliveries = [
      { id: 'outbox-pending', runId: 'run-1', kind: 'STUDENT_STATEMENT', status: 'PENDING', attemptedAt: '2026-08-31T12:00:00.000Z' },
      { id: 'outbox-unknown', runId: 'run-1', kind: 'STUDENT_STATEMENT', status: 'UNKNOWN', attemptedAt: '2026-08-31T12:01:00.000Z' },
      { id: 'outbox-unknown-malformed', runId: 'run-1', kind: 'STUDENT_STATEMENT', status: 'UNKNOWN', attemptedAt: 'not-a-timestamp' },
      { id: 'outbox-failed', runId: 'run-1', kind: 'STUDENT_STATEMENT', status: 'FAILED', attemptedAt: '2026-08-31T12:02:00.000Z', resolvedAt: '' },
    ];
    const app = await runPortal({
      role: 'admin', mainBootstrapData: main, prompt: () => 'Mailbox audit confirmed no delivery',
      rpcResponses: { resolveSchoolRewardsMailDelivery: { ok: true } },
    });
    const deliveryHtml = app.nodes['unresolved-mail-deliveries'].innerHTML;
    expect(deliveryHtml).toContain('Delivery in progress');
    expect(deliveryHtml).toContain('Refresh mail operations');
    expect(deliveryHtml).not.toContain('data-mail-resolve="outbox-pending"');
    expect(deliveryHtml).toContain('data-mail-resolve="outbox-unknown"');
    expect(deliveryHtml).not.toContain('data-mail-resolve="outbox-unknown-malformed"');
    expect(deliveryHtml).toContain('unknown delivery has incomplete server metadata');
    const resolutionButtons = app.nodes['unresolved-mail-deliveries'].querySelectorAll('[data-mail-resolve]');
    expect(resolutionButtons).toHaveLength(2);
    const resolveFailed = resolutionButtons.find(button => button.dataset.mailResolution === 'FAILED');
    await resolveFailed.onclick();
    const call = app.calls.find(item => item.name === 'resolveSchoolRewardsMailDelivery');
    expect(call.argument).toMatchObject({ outboxId: 'outbox-unknown', status: 'FAILED', note: 'Mailbox audit confirmed no delivery' });
    expect(call.argument.idempotencyKey).toMatch(/^mail_delivery_resolve_/);
    expect(call.argument).not.toHaveProperty('deliveryId');
    expect(app.calls.filter(item => item.name === 'retrySchoolRewardsMailDelivery')).toHaveLength(0);
  });

  it('rejects recipient information in delivery notes before any resolution RPC', async () => {
    const main = mainBootstrap('admin');
    main.students = [];
    main.members = [];
    main.unresolvedMailDeliveries = [{ id: 'outbox-unknown', runId: 'run-1', kind: 'GUARDIAN_DIGEST', status: 'UNKNOWN', attemptedAt: '2026-08-31T12:00:00.000Z' }];
    const app = await runPortal({ role: 'admin', mainBootstrapData: main, prompt: () => 'guardian@example.org did not receive it' });
    const button = app.nodes['unresolved-mail-deliveries'].querySelectorAll('[data-mail-resolve]')[0];
    await button.onclick();
    expect(app.calls.filter(call => call.name === 'resolveSchoolRewardsMailDelivery')).toHaveLength(0);
    expect(app.nodes.notice.textContent).toContain('Do not include an email address');
  });

  it('retries only an explicitly resolved failed outbox item and double-submit guards the retry', async () => {
    const main = mainBootstrap('admin');
    main.students = [];
    main.members = [];
    main.unresolvedMailDeliveries = [
      { id: 'outbox-pending', runId: 'run-1', kind: 'STUDENT_STATEMENT', status: 'PENDING', attemptedAt: '2026-08-31T11:55:00.000Z' },
      { id: 'outbox-unknown', runId: 'run-1', kind: 'STUDENT_STATEMENT', status: 'UNKNOWN', attemptedAt: '2026-08-31T11:56:00.000Z' },
      { id: 'outbox-failed-unconfirmed', runId: 'run-1', kind: 'STUDENT_STATEMENT', status: 'FAILED', attemptedAt: '2026-08-31T11:57:00.000Z', resolvedAt: '' },
      { id: 'outbox-failed-vetoed', runId: 'run-1', kind: 'STUDENT_STATEMENT', status: 'FAILED', attemptedAt: '2026-08-31T11:58:00.000Z', resolvedAt: '2026-08-31T12:00:00.000Z', canRetry: false },
      { id: 'outbox-failed-malformed', runId: 'run-1', kind: 'STUDENT_STATEMENT', status: 'FAILED', attemptedAt: 'not-a-timestamp', resolvedAt: '2026-08-31T12:00:00.000Z' },
      { id: 'outbox-failed-confirmed', runId: 'run-1', kind: 'STUDENT_STATEMENT', status: 'FAILED', attemptedAt: '2026-08-31T11:59:00.000Z', resolvedAt: '2026-08-31T12:00:00.000Z' },
    ];
    let release;
    const pending = new Promise(resolve => { release = resolve; });
    const app = await runPortal({ role: 'admin', mainBootstrapData: main, rpcResponses: { retrySchoolRewardsMailDelivery: () => pending } });
    const retries = app.nodes['unresolved-mail-deliveries'].querySelectorAll('[data-mail-retry]');
    expect(retries).toHaveLength(1);
    const first = retries[0].onclick();
    const second = retries[0].onclick();
    await flush();
    expect(app.calls.filter(call => call.name === 'retrySchoolRewardsMailDelivery')).toHaveLength(1);
    const call = app.calls.find(item => item.name === 'retrySchoolRewardsMailDelivery');
    expect(call.argument).toMatchObject({ outboxId: 'outbox-failed-confirmed' });
    expect(call.argument.idempotencyKey).toMatch(/^mail_delivery_retry_/);
    expect(call.argument).not.toHaveProperty('runId');
    release({ ok: true });
    await Promise.all([first, second]);
  });

  it('exposes accessible mail status regions without raw-error, address, or whole-batch retry controls', () => {
    expect(PORTAL).toContain('id="statement-mail-run-status" class="empty" role="status" aria-live="polite" tabindex="-1"');
    expect(PORTAL).toContain('id="guardian-mail-run-status" class="empty" role="status" aria-live="polite" tabindex="-1"');
    expect(PORTAL).toContain('id="unresolved-mail-deliveries" class="list" role="region" aria-live="polite"');
    expect(SCRIPT).not.toMatch(/\.recipientEmail|\.guardianEmail|\.studentName|\.rawError|retry.*whole.*batch/i);
    expect(SCRIPT).toContain("payload={outboxId:outboxId,status:status,note:note}");
    expect(SCRIPT).toContain("payload={outboxId:outboxId}");
  });

  it('executes student bootstrap and submits only sanitized handoff metadata', async () => {
    const app = await runPortal();
    expect(app.calls.slice(0, 2).map(call => call.name)).toEqual(['getSchoolRewardsBootstrap', 'getSchoolRewardsPrintBootstrap']);
    expect(app.printTab.hidden).toBe(false);
    expect(app.nodes['print-balance'].textContent).toBe(120);
    expect(app.nodes['print-reserved'].textContent).toBe(20);
    expect(app.nodes['print-available'].textContent).toBe(100);

    app.nodes['print-window'].value = 'window-1';
    const handoff = {
      version: 'printable/1', title: 'Bridge Token', description: 'A tested bridge model', sourceFormat: 'RECIPE',
      aiUse: 'ASSISTED', aiDisclosure: 'AI suggested a starting shape; I revised every dimension.', studentNote: 'Print in a visible color.',
      studentEmail: 'must-not-be-forwarded@school.example',
      recipe: { version: 'p3d/1', name: 'Bridge Token', studentEmail: 'nested@school.example', prompt: 'private prompt', parts: [{ shape: 'box', size: [1, 1, 1], position: [0, 0, 0], rotation: [0, 0, 0], color: '#64748b', studentNote: 'nested private note' }], scale: 1, rotY: 0, tint: null },
      preflight: { status: 'WARN', sourceFormat: 'RECIPE', byteSize: 321, triangleCount: 12, meshCount: 1, dimensionsMm: { width: 30, depth: 20, height: 10 }, issues: [{ code: 'ASSEMBLY', severity: 'WARNING', message: 'Staff should verify the assembled parts.' }] },
    };
    app.nodes['print-package-file'].files = [{ name: 'bridge-token.alloflow-print.json', size: 2048, text: async () => JSON.stringify(handoff) }];
    await app.nodes['print-package-file'].onchange();
    app.nodes['print-material'].value = 'PHA-NATURAL';
    await app.nodes['print-submit-form'].onsubmit({ preventDefault() {}, target: app.nodes['print-submit-form'] });
    await flush();

    const create = app.calls.find(call => call.name === 'createSchoolRewardsPrintModel');
    const submit = app.calls.find(call => call.name === 'submitSchoolRewardsPrintRequest');
    expect(create.argument).toMatchObject({ sourceFormat: 'RECIPE', byteSize: 321, triangleCount: 12, widthMm: 30, depthMm: 20, heightMm: 10, clientPreflightStatus: 'WARN', aiUse: 'ASSISTED' });
    expect(create.argument.recipe.parts).toHaveLength(1);
    expect(create.argument.recipe).not.toHaveProperty('studentEmail');
    expect(create.argument.recipe).not.toHaveProperty('prompt');
    expect(create.argument.recipe.parts[0]).not.toHaveProperty('studentNote');
    expect(create.argument).not.toHaveProperty('studentEmail');
    expect(create.argument.clientPreflight).not.toHaveProperty('studentEmail');
    expect(submit.argument).toMatchObject({ modelId: 'model-1', windowId: 'window-1', requestedMaterialId: 'PHA-NATURAL' });
  });

  it('renders the staff review controls and blocks a GLB quote pending asset handoff', async () => {
    const model = { id: 'model-1', title: 'Imported Castle', sourceFormat: 'GLB', contentHash: 'a'.repeat(64), triangleCount: 500, dimensionsMm: { width: 50, depth: 40, height: 30 }, clientPreflightStatus: 'PASS', assetStatus: 'HANDOFF_REQUIRED' };
    const request = { id: 'request-1', studentId: 'student-1', modelId: model.id, status: 'SUBMITTED', requestedMaterialId: 'PHA', studentNote: 'Class project', quotePoints: 0, estimatedGrams: 0, estimatedMinutes: 0, student: { firstName: 'Avery', lastInitial: 'R' } };
    const app = await runPortal({ role: 'staff', printBootstrap: { actor: { role: 'staff' }, models: [model], requests: [request], holds: [], communityModels: [] } });
    const queue = app.nodes['print-staff-requests'].innerHTML;
    expect(app.printTab.hidden).toBe(false);
    expect(queue).toContain('Request revision');
    expect(queue).toContain('Approve point quote');
    expect(queue).toContain('HANDOFF_REQUIRED');
    expect(queue).toMatch(/data-print-review-action="QUOTE" disabled/);
    expect(queue).not.toContain('@school.example');
  });

  it.each(['PENDING_REVIEW', 'REJECTED'])('blocks imported-file quotes while asset status is %s', async assetStatus => {
    const model = { id: 'model-1', title: 'Imported Castle', sourceFormat: 'GLB', contentHash: 'a'.repeat(64), triangleCount: 500, dimensionsMm: { width: 50, depth: 40, height: 30 }, clientPreflightStatus: 'PASS', assetStatus };
    const request = { id: 'request-1', studentId: 'student-1', modelId: model.id, status: 'SUBMITTED', requestedMaterialId: 'PHA', student: { firstName: 'Avery', lastInitial: 'R' } };
    const app = await runPortal({ role: 'staff', printBootstrap: { actor: { role: 'staff' }, models: [model], requests: [request], holds: [], assets: [], publications: [], communityModels: [] } });
    expect(app.nodes['print-staff-requests'].innerHTML).toMatch(/data-print-review-action="QUOTE" disabled/);
  });

  it('lets staff replace an expired quote without discarding the prior review details', async () => {
    const model = { id: 'model-1', title: 'Bridge Token', sourceFormat: 'RECIPE', triangleCount: 12, dimensionsMm: { width: 50, depth: 40, height: 30 }, clientPreflightStatus: 'WARN', assetStatus: 'READY' };
    const request = { id: 'request-1', modelId: model.id, status: 'QUOTED', requestedMaterialId: 'PLA', approvedMaterialId: 'PHA-NATURAL', printerProfileId: 'PRUSA-01', quotePoints: 25, estimatedGrams: 18, estimatedMinutes: 75, preflightSummary: 'Slicer reviewed by staff.', student: { firstName: 'Avery', lastInitial: 'R' } };
    const app = await runPortal({ role: 'staff', printBootstrap: { actor: { role: 'staff' }, models: [model], requests: [request], holds: [], communityModels: [] } });
    const queue = app.nodes['print-staff-requests'].innerHTML;

    expect(queue).toContain('data-print-review="request-1"');
    expect(queue).toContain('value="25"');
    expect(queue).toContain('value="PHA-NATURAL"');
    expect(queue).toContain('value="PRUSA-01"');
    expect(queue).toContain('Slicer reviewed by staff.');
  });

  it('routes fulfilled print refunds through Print Lab instead of the generic order action', async () => {
    const main = mainBootstrap('admin');
    main.recentOrders = [{ id: 'request-1', studentId: 'student-1', total: 25, status: 'COMPLETED', at: '2026-08-24T12:00:00.000Z', lines: [{ quantity: 1, itemName: '3D print: Bridge Token' }] }];
    const request = { id: 'request-1', orderId: 'request-1', modelId: 'model-1', status: 'FULFILLED', quotePoints: 25, student: { firstName: 'Avery', lastInitial: 'R' } };
    const app = await runPortal({ role: 'admin', mainBootstrapData: main, printBootstrap: { actor: { role: 'admin' }, models: [], requests: [request], holds: [], communityModels: [] } });

    expect(app.nodes['orders-body'].innerHTML).toContain('Refund from 3D Print Lab');
    expect(app.nodes['orders-body'].innerHTML).not.toContain('data-refund="request-1"');
  });

  it('hash-matches a bounded GLB before private upload and does not forward a file URL', async () => {
    const bytes = new Uint8Array(24);
    bytes.set([0x67, 0x6c, 0x54, 0x46]);
    new DataView(bytes.buffer).setUint32(4, 2, true);
    new DataView(bytes.buffer).setUint32(8, bytes.byteLength, true);
    new DataView(bytes.buffer).setUint32(12, 4, true);
    new DataView(bytes.buffer).setUint32(16, 0x4e4f534a, true);
    bytes.set([0x7b, 0x7d, 0x20, 0x20], 20);
    const hash = createHash('sha256').update(bytes).digest('hex');
    const app = await runPortal();
    app.nodes['print-window'].value = 'window-1';
    const handoff = printHandoff('GLB', { contentHash: hash });
    handoff.preflight.byteSize = bytes.byteLength;
    app.nodes['print-package-file'].files = [{ name: 'bridge.alloflow-print.json', size: 1024, text: async () => JSON.stringify(handoff) }];
    await app.nodes['print-package-file'].onchange();
    app.nodes['print-asset-file'].files = [{ name: 'bridge.glb', type: 'model/gltf-binary', size: bytes.byteLength, arrayBuffer: async () => bytes.buffer }];
    await app.nodes['print-asset-file'].onchange();
    expect(app.nodes['print-asset-summary'].innerHTML).toContain('SHA-256 matched');
    await app.nodes['print-submit-form'].onsubmit({ preventDefault() {}, target: app.nodes['print-submit-form'] });

    const names = app.calls.map(call => call.name);
    expect(names.indexOf('createSchoolRewardsPrintModel')).toBeLessThan(names.indexOf('uploadSchoolRewardsPrintAsset'));
    expect(names.indexOf('uploadSchoolRewardsPrintAsset')).toBeLessThan(names.indexOf('submitSchoolRewardsPrintRequest'));
    const upload = app.calls.find(call => call.name === 'uploadSchoolRewardsPrintAsset').argument;
    expect(upload).toMatchObject({ modelId: 'model-1', fileName: 'bridge.glb', mimeType: 'model/gltf-binary', contentHash: hash, base64: Buffer.from(bytes).toString('base64') });
    expect(upload).not.toHaveProperty('driveUrl');
    expect(upload).not.toHaveProperty('fileUrl');

    const oversized = await runPortal();
    oversized.nodes['print-package-file'].files = [{ name: 'bridge.alloflow-print.json', size: 1024, text: async () => JSON.stringify(handoff) }];
    await oversized.nodes['print-package-file'].onchange();
    oversized.nodes['print-asset-file'].files = [{ name: 'bridge.glb', size: 4 * 1024 * 1024 + 1, arrayBuffer: async () => { throw new Error('must not read'); } }];
    await oversized.nodes['print-asset-file'].onchange();
    expect(oversized.nodes.notice.textContent).toContain('4 MiB');
    expect(oversized.calls.some(call => call.name === 'uploadSchoolRewardsPrintAsset')).toBe(false);
  });

  it('creates a linked model version and resubmits a revision-requested request', async () => {
    const model = { id: 'model-old', title: 'Bridge v1', version: 1, sourceFormat: 'RECIPE', assetStatus: 'READY', triangleCount: 12, dimensionsMm: { width: 30, depth: 20, height: 10 } };
    const request = { id: 'request-old', modelId: model.id, status: 'REVISION_REQUESTED', revisionNumber: 1, requestedMaterialId: 'PHA', staffReason: 'Make the base wider.' };
    const app = await runPortal({ printBootstrap: { actor: { role: 'student', studentId: 'student-1' }, balance: { balance: 120, reservedPoints: 0, availableBalance: 120 }, models: [model], requests: [request], assets: [], publications: [], communityModels: [] } });
    app.nodes['print-window'].value = 'window-1';
    app.nodes['print-revision-request'].value = 'request-old';
    app.nodes['print-package-file'].files = [{ name: 'bridge-v2.alloflow-print.json', size: 1024, text: async () => JSON.stringify(printHandoff()) }];
    await app.nodes['print-package-file'].onchange();
    await app.nodes['print-submit-form'].onsubmit({ preventDefault() {}, target: app.nodes['print-submit-form'] });

    expect(app.calls.find(call => call.name === 'createSchoolRewardsPrintModel').argument.previousVersionId).toBe('model-old');
    expect(app.calls.find(call => call.name === 'resubmitSchoolRewardsPrintRequest').argument).toMatchObject({ requestId: 'request-old', modelId: 'model-1', windowId: 'window-1' });
  });

  it('requires explicit consent and sends only catalog metadata for publication', async () => {
    const model = { id: 'model-1', title: 'Bridge Token', version: 1, sourceFormat: 'RECIPE', assetStatus: 'READY', triangleCount: 12, dimensionsMm: { width: 30, depth: 20, height: 10 } };
    const app = await runPortal({ printBootstrap: { actor: { role: 'student', studentId: 'student-1' }, balance: {}, models: [model], requests: [], assets: [], publications: [], communityModels: [] } });
    app.nodes['publication-model'].value = model.id;
    app.nodes['publication-title'].value = 'Bridge Challenge Token';
    app.nodes['publication-description'].value = 'A student-tested bridge design.';
    app.nodes['publication-creator'].value = 'Grade 7 maker';
    app.nodes['publication-reuse'].value = 'SCHOOL_REMIX_PRINT';
    await app.nodes['publication-form'].onsubmit({ preventDefault() {}, target: app.nodes['publication-form'] });
    expect(app.calls.some(call => call.name === 'submitSchoolRewardsPrintPublication')).toBe(false);
    app.nodes['publication-consent'].checked = true;
    await app.nodes['publication-form'].onsubmit({ preventDefault() {}, target: app.nodes['publication-form'] });
    const publication = app.calls.find(call => call.name === 'submitSchoolRewardsPrintPublication').argument;
    expect(publication).toMatchObject({ modelId: model.id, catalogTitle: 'Bridge Challenge Token', reusePolicy: 'SCHOOL_REMIX_PRINT', consent: true });
    expect(publication).not.toHaveProperty('studentEmail');
  });

  it('renders private asset review, publication moderation, and an approved remixable catalog', async () => {
    const model = { id: 'model-1', title: 'Bridge Token', sourceFormat: 'RECIPE', assetStatus: 'PENDING_REVIEW', triangleCount: 12, dimensionsMm: { width: 30, depth: 20, height: 10 } };
    const pending = { id: 'publication-1', modelId: model.id, status: 'PENDING', catalogTitle: 'Bridge Token', catalogDescription: 'Tested bridge', creatorLabel: 'Student maker', reusePolicy: 'SCHOOL_REMIX_PRINT' };
    const app = await runPortal({ role: 'staff', printBootstrap: { actor: { role: 'staff' }, models: [model], requests: [], holds: [], assets: [{ id: 'asset-1', modelId: model.id, fileName: 'bridge.stl', sourceFormat: 'STL', contentHash: 'b'.repeat(64), byteSize: 840, status: 'PENDING_REVIEW' }], publications: [pending], communityModels: [{ publication: { ...pending, id: 'publication-live', status: 'PUBLISHED' }, model: { ...model, sourceFormat: 'RECIPE' } }] } });
    expect(app.nodes['print-assets'].innerHTML).toContain('Verify with offline evidence');
    expect(SCRIPT).toContain('Record meaningful offline-inspection evidence before verifying this asset.');
    expect(app.nodes['print-assets'].innerHTML).not.toMatch(/drive|https?:\/\//i);
    expect(app.nodes['print-publications'].innerHTML).toContain('Approve');
    expect(app.nodes['print-publications'].innerHTML).toContain('Reject');
    expect(app.nodes['print-community'].innerHTML).toContain('Make a private remix');
    expect(app.nodes['print-community'].innerHTML).toContain('Report for staff review');
  });

  it('does not populate staff moderation controls in the student DOM', async () => {
    const model = { id: 'model-1', title: 'Private model', sourceFormat: 'STL', assetStatus: 'PENDING_REVIEW', triangleCount: 10, dimensionsMm: { width: 10, depth: 10, height: 10 } };
    const app = await runPortal({ printBootstrap: { actor: { role: 'student', studentId: 'student-1' }, balance: {}, models: [model], requests: [], holds: [], assets: [{ id: 'asset-1', modelId: model.id, status: 'PENDING_REVIEW' }], publications: [{ id: 'publication-1', modelId: model.id, status: 'PENDING' }], communityModels: [] } });
    expect(app.nodes['print-assets'].innerHTML).toBe('');
    expect(app.nodes['print-publications'].innerHTML).toBe('');
  });

  it('supports consented guardian mappings, bounded digest runs, and aggregate-only district summaries', async () => {
    const main = mainBootstrap('admin');
    main.students = [{ id: 'student-1', firstName: 'Avery', lastInitial: 'R', grade: '5', balance: 120 }];
    const app = await runPortal({ role: 'admin', mainBootstrapData: main, rpcResponses: { sendSchoolRewardsGuardianDigests: { ok: true, sent: 1, skipped: 0, failed: 0, remainingQuota: 99 }, getSchoolRewardsDistrictSummary: { ok: true, generatedAt: '2026-08-25T12:00:00.000Z', school: { name: 'Pilot School', academicYear: '2026-27' }, counts: { students: 1 }, points: { issued: 120 }, printRequestsByStatus: { SUBMITTED: 1 }, publicationsByStatus: { PUBLISHED: 1 } } } });
    app.nodes['guardian-student'].value = 'student-1';
    app.nodes['guardian-email'].value = 'guardian@example.org';
    app.nodes['guardian-name'].value = 'Morgan R';
    app.nodes['guardian-relationship'].value = 'Guardian';
    app.nodes['guardian-active'].checked = true;
    app.nodes['guardian-consent'].checked = true;
    await app.nodes['guardian-form'].onsubmit({ preventDefault() {}, target: app.nodes['guardian-form'] });
    expect(app.calls.find(call => call.name === 'adminUpsertSchoolRewardsGuardian').argument).toMatchObject({ studentId: 'student-1', guardianEmail: 'guardian@example.org', active: true, consentConfirmed: true });
    app.nodes['guardian-active'].checked = false;
    app.nodes['guardian-consent'].checked = false;
    app.nodes['guardian-deactivation-reason'].value = 'Guardian requested that messages stop.';
    await app.nodes['guardian-form'].onsubmit({ preventDefault() {}, target: app.nodes['guardian-form'] });
    const guardianCalls = app.calls.filter(call => call.name === 'adminUpsertSchoolRewardsGuardian');
    expect(guardianCalls.at(-1).argument).toMatchObject({ active: false, consentConfirmed: false, deactivationReason: 'Guardian requested that messages stop.' });
    app.nodes['guardian-period'].value = '2026-T1-week-10';
    app.nodes['guardian-limit'].value = '100';
    await app.nodes['guardian-digest-form'].onsubmit({ preventDefault() {} });
    expect(app.calls.find(call => call.name === 'sendSchoolRewardsGuardianDigests').argument).toMatchObject({ periodKey: '2026-T1-week-10', limit: 100 });
    await app.nodes['load-district-summary'].onclick();
    expect(app.nodes['district-summary'].innerHTML).toContain('Count — students');
    expect(app.nodes['district-summary'].innerHTML).not.toContain('guardian@example.org');
  });

  it('previews a provider-neutral SIS snapshot before a separately confirmed idempotent apply', async () => {
    const preview = { ok: true, contractVersion: 'alloflow-sis-roster/1', snapshotId: 'district-export-42', contentHash: 'c'.repeat(43), rosterRevision: 'd'.repeat(43), counts: { created: 1, updated: 0, unchanged: 0, total: 1 }, changes: [{ action: 'CREATE', email: 'avery@school.example' }], deactivationSupported: false };
    const app = await runPortal({ role: 'admin', rpcResponses: { previewSchoolRewardsSisSnapshot: preview, applySchoolRewardsSisSnapshot: { ...preview, applied: 1, deactivated: 0 } } });
    const snapshot = { formatVersion: 'alloflow-sis-roster/1', snapshotId: 'district-export-42', students: [{ id: 'sis-1', firstName: 'Avery', lastInitial: 'R', grade: '5', homeroom: '5A', email: 'avery@school.example', active: true }] };
    app.nodes['sis-snapshot-file'].files = [{ name: 'roster.json', size: 512, text: async () => JSON.stringify(snapshot) }];
    await app.nodes['sis-snapshot-file'].onchange();
    expect(app.nodes['preview-sis-snapshot'].disabled).toBe(false);
    await app.nodes['preview-sis-snapshot'].onclick();
    expect(app.nodes['sis-snapshot-summary'].innerHTML).toContain('1 create');
    expect(app.calls.find(call => call.name === 'previewSchoolRewardsSisSnapshot').argument).toEqual(snapshot);
    await app.nodes['apply-sis-snapshot'].onclick();
    const applied = app.calls.find(call => call.name === 'applySchoolRewardsSisSnapshot').argument;
    expect(applied).toMatchObject(snapshot);
    expect(applied).toMatchObject({ expectedContentHash: preview.contentHash, expectedRosterRevision: preview.rosterRevision });
    expect(applied.idempotencyKey).toMatch(/^sis_apply_/);
    expect(applied.students[0]).not.toHaveProperty('vendor');
  });

  it('contains the v3 workflow and exact v4 RPC contracts without Drive or printer credentials', () => {
    ['createSchoolRewardsPrintModel', 'submitSchoolRewardsPrintRequest', 'reviewSchoolRewardsPrintRequest', 'confirmSchoolRewardsPrintQuote', 'advanceSchoolRewardsPrintRequest', 'cancelSchoolRewardsPrintRequest', 'fulfillSchoolRewardsPrintRequest', 'refundSchoolRewardsPrintRequest'].forEach(name => expect(SCRIPT).toContain(`rpc('${name}'`));
    ['uploadSchoolRewardsPrintAsset', 'reviewSchoolRewardsPrintAsset', 'resubmitSchoolRewardsPrintRequest', 'submitSchoolRewardsPrintPublication', 'reviewSchoolRewardsPrintPublication', 'remixSchoolRewardsPrintModel', 'adminUpsertSchoolRewardsGuardian', 'getSchoolRewardsDistrictSummary', 'previewSchoolRewardsSisSnapshot', 'applySchoolRewardsSisSnapshot'].forEach(name => expect(SCRIPT).toContain(`rpc('${name}'`));
    ['sendSchoolRewardsGuardianDigests', 'sendSchoolRewardsBalanceStatements'].forEach(name => expect(SCRIPT).toContain(`'${name}'`));
    ['getSchoolRewardsMailRun', 'resolveSchoolRewardsMailDelivery', 'retrySchoolRewardsMailDelivery'].forEach(name => expect(SCRIPT).toContain(`rpc('${name}'`));
    ['REQUEST_REVISION', 'REJECT', 'QUOTE', 'QUEUE', 'START_PRINT', 'MARK_READY', 'RETURN_TO_QUEUE'].forEach(action => expect(SCRIPT).toContain(action));
    expect(PORTAL).toContain('accept=".glb,.stl,model/gltf-binary,model/stl,application/sla"');
    expect(SCRIPT).toContain('MAX_PRINT_ASSET_BYTES=4*1024*1024');
    expect(SCRIPT).toContain('expectedContentHash:state.sisPreview.contentHash');
    expect(SCRIPT).toContain('expectedRosterRevision:state.sisPreview.rosterRevision');
    expect(SCRIPT).not.toMatch(/driveUrl|driveFileId|fileUrl|printerHost|apiKey|WebSocket|fetch\(/i);
  });
});
