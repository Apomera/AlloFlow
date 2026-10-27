import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const SW = require('../sensitive_workspace_module.js');
const Crypto = require('../allo_crypto_module.js');
const Vault = require('../allo_device_vault_module.js');
const services = [];
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const daSource = readFileSync('dynamic_assessment_module.js', 'utf8');
const marker = 'onOpenAlloSheet: function (artifact) {';
const start = daSource.indexOf(marker), end = daSource.indexOf('\n      }\n    }, daBlockedParentCallbacks', start);
if (start < 0 || end < 0 || daSource.indexOf(marker, start + marker.length) !== -1) throw new Error('DA callback source anchors changed');
const callbackSource = daSource.slice(start + 'onOpenAlloSheet: '.length, end + '\n      }'.length);
const contextStart = daSource.indexOf('    function captureContextGuard() {');
const contextEnd = daSource.indexOf('    return { wrap:', contextStart);
if (contextStart < 0 || contextEnd < 0) throw new Error('DA context guard anchors changed');
const bridgeSource = readFileSync('allo_sheet/host_bridge.js', 'utf8');
const blSource = readFileSync('behavior_lens_module.js', 'utf8');
function sourceBetween(source, first, last) {
  const start = source.indexOf(first), end = source.indexOf(last, start);
  if (start < 0 || end <= start) throw new Error('Clinical transfer source anchors changed');
  return source.slice(start, end);
}
const blHelper = sourceBetween(blSource, '    function blOpenProtectedSheetTransfer(', '    function blCreateDownloadLink(');
const blCallback = sourceBetween(blSource, '        const handleAlloSheetHandoffTransfer = useCallback(', '\n        }, [\n            onOpenAlloSheet,') + '\n        });';
function bridgeHarness() {
  let listener, url, seed = 1, timer = 0;
  const popup = { closed: false, focus: vi.fn(), postMessage: vi.fn() };
  const fakeWindow = { location: new URL('https://synthetic-host.example/app/'), crypto: { getRandomValues(bytes) { bytes.fill(++seed); return bytes; } },
    document: { activeElement: null }, addEventListener(type, fn) { if (type === 'message') listener = fn; },
    open: vi.fn(value => { url = value; return popup; }), alert: vi.fn(), focus: vi.fn(),
    setTimeout: () => ++timer, clearTimeout() {}, setInterval: () => ++timer, clearInterval() {},
  };
  const bridge = new Function('window', bridgeSource + '\nreturn window.AlloSheetHostBridge;')(fakeWindow);
  return { bridge, fakeWindow, popup,
    emit(message) { const target = new URL(url); listener({ source: popup, origin: target.origin, data: { ...message, version: 1, bridgeToken: new URLSearchParams(target.hash.slice(1)).get('bridgeToken') } }); },
    imports() { return popup.postMessage.mock.calls.map(call => call[0]).filter(message => message.type === 'allosheet-import-artifact'); },
  };
}
async function fixture() {
  const policy = { version: 1, allowCanvasRecords: true, allowExternalAi: [] };
  const repo = { revision: 0, store: null, async read() { return { revision: this.revision, store: clone(this.store) }; },
    async compareAndSwap(expected, value) { if (this.revision !== expected) return false; this.store = clone(value); this.revision++; return true; } };
  const service = SW.createService({ repository: repo, vaultModule: Vault, crypto: Crypto, lifecycle: false, cryptoOptions: { iterations: Crypto.MIN_PBKDF2_ITERATIONS },
    getContext: () => ({ isCanvas: true, learner: false }), getPolicy: () => policy, confirmExport: () => true });
  services.push(service); await service.setup('synthetic-transfer-passphrase'); const recoveryInput = service.getStatus().setupRecoveryCode;
  await service.exportBackup(); await service.finishSetup({ recoveryInput, backupSaved: true });
  const workspace = service.getSession('dynamic-assessment'), epoch = workspace.captureEpoch(), h = bridgeHarness();
  const doc = { documentElement: { classList: { contains: () => false } }, body: { classList: { contains: () => false } } };
  const live = { mounted: true, version: 0 };
  const captureContextGuard = new Function('live', daSource.slice(contextStart, contextEnd) + '\nreturn captureContextGuard;')(live);
  const callback = new Function('workspace', 'epoch', 'window', 'document', 'host', 'aiReview', 'return (' + callbackSource + ');')(workspace, epoch, h.fakeWindow, doc, { addToast: vi.fn() }, { captureContextGuard });
  const artifact = { kind: 'alloflow.tabular.v1', version: 1, title: 'Synthetic clinical transfer', source: { tool: 'dynamic-assessment', label: 'Dynamic Assessment' },
    classification: { level: 'sensitive-education-record', studentIdentifierIncluded: true },
    tables: [{ id: 'summary', columns: [{ key: 'student', label: 'Student', type: 'text' }], rows: [{ id: 'row-1', values: { student: 'SYNTHETIC CLINICAL TRANSFER SENTINEL' } }] }] };
  return { service, workspace, epoch, policy, callback, artifact, live, ...h };
}

async function blFixture() {
  const h = await fixture(), workspace = h.service.getSession('behavior-lens');
  const selected = { current: { student: 'Synthetic Otter' } }, mounted = { current: { mounted: true } };
  const epoch = workspace.captureEpoch(), onOpenAlloSheet = vi.fn(), addToast = vi.fn(), feedback = vi.fn();
  const options = {
    window: h.fakeWindow, document: { documentElement: { classList: { contains: () => false } }, body: { classList: { contains: () => false } } },
    useCallback: callback => callback, onOpenAlloSheet, addToast, tt: (_key, fallback) => fallback,
    alloSheetHandoffDatasets: { abc: true }, alloSheetHandoffPreview: { tables: [{ rowCount: 1 }] },
    alloSheetHandoffBusyRef: { current: false }, alloSheetHandoffDialogRef: { current: null },
    setAlloSheetHandoffBusy: vi.fn(), setAlloSheetHandoffFeedback: feedback, blAnnounceToSR: vi.fn(), setShowAlloSheetHandoff: vi.fn(),
    buildBehaviorLensAlloSheetEnvelope: () => h.artifact, selectedStudent: 'Synthetic Otter', abcEntries: [], observationSessions: [], sessionHistory: [],
    alloSheetHandoffMode: 'summary', alloSheetHandoffDateRange: 'all', alloSheetIncludeIdentifier: false, alloSheetIncludeNotes: false,
    blExportGuard: kind => { workspace.assertCanExport(kind); workspace.assertCurrent(epoch); return () => workspace.assertCurrent(epoch); },
    workspaceSelectionRef: selected, aiRequestContextRef: mounted,
  };
  const callback = new Function(...Object.keys(options), blHelper + blCallback + '\nreturn handleAlloSheetHandoffTransfer;')(...Object.values(options));
  return { ...h, callback, workspace, selected, mounted, onOpenAlloSheet, addToast, feedback };
}
afterEach(() => services.splice(0).forEach(service => service.dispose()));
describe('actual DA callback and actual AlloSheet queued export', () => {
  it('delivers an approved current export after popup handshake', async () => {
    const h = await fixture(), result = h.callback(h.artifact);
    expect(h.imports()).toHaveLength(0); h.emit({ type: 'allosheet-hello' });
    const [message] = h.imports(); expect(message.artifact.tables[0].rows[0].values.student).toBe('SYNTHETIC CLINICAL TRANSFER SENTINEL');
    h.emit({ type: 'allosheet-transfer-receipt', transferId: message.transferId, status: 'received' });
    await expect(result).resolves.toBe(true);
  });
  it.each(['lock', 'canvas-policy', 'case', 'unmount'])('does not disclose queued clinical data after %s revocation', async kind => {
    const h = await fixture(), result = h.callback(h.artifact).then(value => ({ value }), error => ({ error }));
    expect(h.imports()).toHaveLength(0);
    if (kind === 'lock') await h.service.lock('synthetic-audit');
    else if (kind === 'canvas-policy') h.policy.allowCanvasRecords = false;
    else if (kind === 'case') h.live.version++;
    else h.live.mounted = false;
    h.emit({ type: 'allosheet-hello' });
    const imports = h.imports();
    if (imports[0]) h.emit({ type: 'allosheet-transfer-receipt', transferId: imports[0].transferId, status: 'received' });
    const outcome = await result;
    expect(outcome.error).toBeTruthy();
    expect(imports).toHaveLength(0);
  });
  it('refuses an older bridge that cannot enforce queued transfer controls', async () => {
    const h = await fixture(), legacyOpen = vi.fn(() => ({}));
    h.fakeWindow.AlloSheetHostBridge = { open: legacyOpen, openTransfer: legacyOpen, transferProtocolVersion: 1 };
    expect(() => h.callback(h.artifact)).toThrow('must finish updating'); expect(legacyOpen).not.toHaveBeenCalled();
  });
  it('rejects both denied receipts and advances to an independently approved queued transfer', async () => {
    const h = await fixture(); let allowed = true;
    const first = h.bridge.openTransfer({ artifact: h.artifact, transferControls: { beforeTransfer() { if (!allowed) throw new Error('synthetic revoked'); } } });
    const deniedDelivery = first.delivered.catch(error => error), deniedDecision = first.decision.catch(error => error);
    const second = h.bridge.openTransfer({ artifact: { ...h.artifact, title: 'Independent transfer' }, transferControls: { beforeTransfer: () => true } });
    allowed = false; h.emit({ type: 'allosheet-hello' });
    expect(await deniedDelivery).toMatchObject({ code: 'allosheet-transfer-not-approved' });
    expect(await deniedDecision).toMatchObject({ code: 'allosheet-transfer-not-approved' });
    expect(h.imports()).toHaveLength(1); expect(h.imports()[0].transferId).toBe(second.transferId);
  });
  it('retains the original control when the caller replaces or mutates its option bags', async () => {
    const h = await fixture(); let allowed = true;
    const options = { artifact: h.artifact, transferControls: { beforeTransfer() { return allowed; } } };
    const transfer = h.bridge.openTransfer(options), result = transfer.delivered.catch(error => error);
    options.transferControls.beforeTransfer = () => true; options.transferControls = null; allowed = false;
    h.emit({ type: 'allosheet-hello' });
    expect(await result).toMatchObject({ code: 'allosheet-transfer-not-approved' }); expect(h.imports()).toHaveLength(0);
  });
  it.each([{}, { beforeTransfer: false }, { beforeTransfer: () => false }, { beforeTransfer: async () => true }, { beforeTransfer: () => true, extra: true }, Object.create({ beforeTransfer: () => true })])('rejects malformed or asynchronous controls %# before opening a popup', async transferControls => {
    const h = await fixture();
    expect(() => h.bridge.openTransfer({ artifact: h.artifact, transferControls })).toThrow();
    expect(h.fakeWindow.open).not.toHaveBeenCalled(); expect(h.imports()).toHaveLength(0);
  });
  it('does not evaluate a controls accessor', async () => {
    const h = await fixture(), getter = vi.fn(() => ({ beforeTransfer: () => true }));
    const options = Object.defineProperty({ artifact: h.artifact }, 'transferControls', { get: getter });
    expect(() => h.bridge.openTransfer(options)).toThrow(); expect(getter).not.toHaveBeenCalled(); expect(h.fakeWindow.open).not.toHaveBeenCalled();
  });
  it('rechecks after popup creation before retaining the queued artifact', async () => {
    const h = await fixture(); let allowed = true;
    h.fakeWindow.open.mockImplementation(() => { allowed = false; return h.popup; });
    expect(() => h.bridge.openTransfer({ artifact: h.artifact, transferControls: { beforeTransfer: () => allowed } })).toThrow();
    expect(h.imports()).toHaveLength(0);
  });
  it('does not claim to retract data that was already posted before a later lock', async () => {
    const h = await fixture(), result = h.callback(h.artifact).catch(error => error);
    h.emit({ type: 'allosheet-hello' }); expect(h.imports()).toHaveLength(1);
    await h.service.lock('synthetic-audit'); const message = h.imports()[0];
    h.emit({ type: 'allosheet-transfer-receipt', transferId: message.transferId, status: 'received' });
    expect(await result).toBeInstanceOf(Error); expect(h.imports()).toHaveLength(1);
  });
});

describe('actual BehaviorLens callback and actual AlloSheet queued export', () => {
  it('delivers an approved current export through the protected bridge without invoking the legacy callback', async () => {
    const h = await blFixture(), result = h.callback();
    expect(h.imports()).toHaveLength(0); expect(h.onOpenAlloSheet).not.toHaveBeenCalled();
    h.emit({ type: 'allosheet-hello' });
    const [message] = h.imports(); expect(message.artifact.tables[0].rows[0].values.student).toBe('SYNTHETIC CLINICAL TRANSFER SENTINEL');
    h.emit({ type: 'allosheet-transfer-receipt', transferId: message.transferId, status: 'received' });
    await result;
    expect(h.addToast).toHaveBeenCalledWith(expect.stringContaining('received for destination review'), 'success');
  });
  it.each(['lock', 'canvas-policy', 'case', 'case-away-back', 'unmount'])('does not disclose queued clinical data after %s revocation', async kind => {
    const h = await blFixture(), result = h.callback();
    if (kind === 'lock') await h.service.lock('synthetic-audit');
    else if (kind === 'canvas-policy') h.policy.allowCanvasRecords = false;
    else if (kind === 'case') h.selected.current = { student: 'Synthetic Beaver' };
    else if (kind === 'case-away-back') { h.selected.current = { student: 'Synthetic Beaver' }; h.selected.current = { student: 'Synthetic Otter' }; }
    else h.mounted.current.mounted = false;
    h.emit({ type: 'allosheet-hello' }); await result;
    expect(h.imports()).toHaveLength(0); expect(h.onOpenAlloSheet).not.toHaveBeenCalled();
    expect(h.feedback).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'error' }));
    expect(h.addToast).not.toHaveBeenCalled();
  });
  it('refuses an older bridge without handing protected data to an unversioned callback', async () => {
    const h = await blFixture(), legacyOpen = vi.fn(() => ({}));
    h.fakeWindow.AlloSheetHostBridge = { open: legacyOpen, openTransfer: legacyOpen, transferProtocolVersion: 1 };
    await h.callback(); expect(legacyOpen).not.toHaveBeenCalled(); expect(h.onOpenAlloSheet).not.toHaveBeenCalled();
    expect(h.feedback).toHaveBeenLastCalledWith({ kind: 'error', text: expect.stringContaining('must finish updating') });
  });
});
