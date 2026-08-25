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
    this.innerHTML = '';
    this.classList = { add: value => { this.className += ` ${value}`; }, remove: value => { this.className = this.className.replace(value, ''); } };
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  querySelectorAll() { return []; }
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
    recentLedger: [], recentOrders: [], emailSchedule: {}, mailQuota: 100,
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
      querySelectorAll: selector => markers[selector] || [],
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

async function runPortal({ role = 'student', printBootstrap, mainBootstrapData, rpcResponses = {} } = {}) {
  const dom = createDocument();
  const calls = [];
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
    window: { confirm: () => true, prompt: () => 'Test reason' },
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
    Blob: class {},
  });
  new vm.Script(SCRIPT, { filename: 'Portal.html' }).runInContext(context);
  await flush();
  return { ...dom, calls, context };
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

describe('School Rewards Print Lab portal', () => {
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
    expect(app.nodes['print-assets'].innerHTML).toContain('Verify inspected asset');
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
    ['uploadSchoolRewardsPrintAsset', 'reviewSchoolRewardsPrintAsset', 'resubmitSchoolRewardsPrintRequest', 'submitSchoolRewardsPrintPublication', 'reviewSchoolRewardsPrintPublication', 'remixSchoolRewardsPrintModel', 'adminUpsertSchoolRewardsGuardian', 'sendSchoolRewardsGuardianDigests', 'getSchoolRewardsDistrictSummary', 'previewSchoolRewardsSisSnapshot', 'applySchoolRewardsSisSnapshot'].forEach(name => expect(SCRIPT).toContain(`rpc('${name}'`));
    ['REQUEST_REVISION', 'REJECT', 'QUOTE', 'QUEUE', 'START_PRINT', 'MARK_READY', 'RETURN_TO_QUEUE'].forEach(action => expect(SCRIPT).toContain(action));
    expect(PORTAL).toContain('accept=".glb,.stl,model/gltf-binary,model/stl,application/sla"');
    expect(SCRIPT).toContain('MAX_PRINT_ASSET_BYTES=4*1024*1024');
    expect(SCRIPT).toContain('expectedContentHash:state.sisPreview.contentHash');
    expect(SCRIPT).toContain('expectedRosterRevision:state.sisPreview.rosterRevision');
    expect(SCRIPT).not.toMatch(/driveUrl|driveFileId|fileUrl|printerHost|apiKey|WebSocket|fetch\(/i);
  });
});
