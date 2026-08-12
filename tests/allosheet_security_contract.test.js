import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const require = createRequire(import.meta.url);

const hostBridge = read('allo_sheet/host_bridge.js');
const companion = read('allo_sheet/allo_sheet.js');
const html = read('allo_sheet/allo_sheet.html');
const runtime = read('desktop/runtime/alloflow-desktop-runtime.cjs');
const electron = read('desktop/electron/main.cjs');
const build = read('build.js');
const engineManager = read('desktop/runtime/allosheet-engine-manager.cjs');
const gristBridge = read('desktop/runtime/allosheet-grist-bridge.cjs');
const gristBootstrap = read('desktop/runtime/allosheet-grist-bootstrap.cjs');
const requestAuth = read('desktop/electron/allosheet-request-auth.cjs');
const allosheetReadme = read('allo_sheet/README.md');
const dockerReadme = read('docker/allosheet-grist/README.md');
const electronBuilder = JSON.parse(read('desktop/electron-builder.json'));
const engineContract = require(path.join(
  root,
  'desktop/runtime/allosheet-engine-manager.cjs',
));

function behaviorLensArtifact(overrides = {}) {
  return {
    kind: 'alloflow.tabular.v1',
    version: 1,
    source: {
      tool: 'BehaviorLens',
      label: 'BehaviorLens',
      version: '1.0.0',
    },
    title: 'Behavior summary',
    createdAt: '2026-07-29T12:00:00.000Z',
    classification: {
      level: 'sensitive-education-record',
      studentIdentifierIncluded: true,
      freeTextNotesIncluded: false,
    },
    privacy: {
      scope: 'active-student',
      identifierIncluded: true,
      notesIncluded: false,
      reducedData: true,
      transferEnablesAI: true,
    },
    tables: [{
      id: 'summary',
      title: 'Weekly summary',
      columns: [
        { key: 'student', label: 'Student', type: 'category' },
        { key: 'count', label: 'Count', type: 'unsupported-input-type' },
      ],
      rows: [{
        id: 'row-1',
        values: { student: 'Learner A', count: 3 },
      }],
      sourceRowCount: 1,
      truncated: false,
    }],
    provenance: {
      dateRange: 'current-week',
      nested: { reviewed: true },
      ignoredFunction: () => 'must not cross the boundary',
    },
    capabilities: {
      writeBack: true,
      aiEnabled: true,
    },
    untrustedExtra: {
      shouldNotCross: true,
    },
    ...overrides,
  };
}

function loadHostBridgeHarness() {
  let messageListener;
  let openedUrl = '';
  let randomSeed = 6;
  let timerId = 0;
  const pendingTimers = new Map();
  const launcher = { focus: vi.fn() };
  const popup = {
    closed: false,
    focus: vi.fn(),
    postMessage: vi.fn(),
  };
  const fakeWindow = {
    location: new URL('http://localhost:32173/app/'),
    document: {
      activeElement: launcher,
      contains: (element) => element === launcher,
    },
    _isDesktopBundledApp: true,
    crypto: {
      getRandomValues(bytes) {
        randomSeed += 1;
        bytes.fill(randomSeed);
        return bytes;
      },
    },
    addEventListener(type, listener) {
      if (type === 'message') messageListener = listener;
    },
    open: vi.fn((url) => {
      openedUrl = url;
      return popup;
    }),
    alert: vi.fn(),
    focus: vi.fn(),
    setTimeout(callback, delay) {
      timerId += 1;
      if (!delay) callback();
      else pendingTimers.set(timerId, callback);
      return timerId;
    },
    clearTimeout(id) {
      pendingTimers.delete(id);
    },
    setInterval: () => 1,
    clearInterval: vi.fn(),
    callGemini: vi.fn(),
    get localStorage() {
      throw new Error('Artifact transfer must not access localStorage.');
    },
    get sessionStorage() {
      throw new Error('Artifact transfer must not access sessionStorage.');
    },
  };
  const load = new Function('window', `${hostBridge}\nreturn window.AlloSheetHostBridge;`);
  const bridge = load(fakeWindow);
  return {
    bridge,
    fakeWindow,
    launcher,
    popup,
    openedUrl: () => openedUrl,
    runPendingTimers() {
      const callbacks = Array.from(pendingTimers.values());
      pendingTimers.clear();
      callbacks.forEach((callback) => callback());
    },
    emit(data, { origin, source } = {}) {
      messageListener({
        source: source || popup,
        origin: origin || new URL(openedUrl).origin,
        data,
      });
    },
  };
}

describe('AlloSheet security and deployment contracts', () => {
  it('binds bridge messages to source, origin, protocol version, and a random capability', () => {
    expect(hostBridge).toContain('event.source !== popup');
    expect(hostBridge).toContain('event.origin !== pageOrigin');
    expect(hostBridge).toContain('data.version !== 1');
    expect(hostBridge).toContain('data.bridgeToken !== bridgeToken');
    expect(hostBridge).toContain('window.crypto.getRandomValues');
    expect(hostBridge).toContain('BRIDGE_TOKEN_TTL_MS');
    expect(hostBridge).toContain('isBridgeTokenFresh');
    expect(hostBridge).toContain('pairingExpiresAt');
    expect(hostBridge).toContain('allosheet-pairing-expired');
    expect(companion).toContain('event.source !== window.opener');
    expect(companion).toContain('allosheet-pairing-expired');
    expect(companion).toContain('event.origin !== state.hostOrigin');
    expect(companion).toContain('data.bridgeToken !== state.bridgeToken');
    expect(companion).not.toContain("state.hostOrigin || '*'");
    expect(hostBridge).not.toContain("pageOrigin : '*'");
  });

  it('trusts only HTTPS deployments or the exact same-port Desktop loopback pair', () => {
    const start = companion.indexOf('  function isCanvasOpenerOrigin');
    const end = companion.indexOf('  function readBridgeBootstrap');
    const trustSource = companion.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);

    const evaluate = (href) => new Function(
      'window',
      `${trustSource}
      return {
        trusted: isTrustedAlloFlowHostOrigin,
        allowed: isAllowedAlloSheetHostOrigin
      };`,
    )({ location: { href } });

    const desktop = evaluate('http://127.0.0.1:32173/app/allo_sheet/allo_sheet.html');
    expect(desktop.trusted('http://localhost:32173')).toBe(true);
    expect(desktop.trusted('http://localhost:32174')).toBe(false);
    expect(evaluate('http://127.0.0.1:32173/not-allosheet').trusted('http://localhost:32173')).toBe(false);

    const insecureRemote = evaluate('http://school.example/allo_sheet/allo_sheet.html');
    expect(insecureRemote.trusted('http://school.example')).toBe(false);

    const canvas = evaluate('https://alloflow-cdn.pages.dev/allo_sheet/allo_sheet.html');
    expect(canvas.allowed('https://canvas-host.googleusercontent.com')).toBe(true);
    expect(canvas.trusted('https://canvas-host.googleusercontent.com')).toBe(false);
    expect(canvas.allowed('https://attacker.example')).toBe(false);
  });

  it('rejects forged bridge handshakes in executable behavior', () => {
    let messageListener;
    let openedUrl = '';
    const launcher = {
      focus: vi.fn(),
    };
    const popup = {
      closed: false,
      focus: vi.fn(),
      postMessage: vi.fn(),
    };
    const fakeWindow = {
      location: new URL('http://localhost:32173/app/'),
      document: {
        activeElement: launcher,
        contains: (element) => element === launcher,
      },
      _isDesktopBundledApp: true,
      crypto: {
        getRandomValues(bytes) {
          bytes.fill(7);
          return bytes;
        },
      },
      addEventListener(type, listener) {
        if (type === 'message') messageListener = listener;
      },
      open(url) {
        openedUrl = url;
        return popup;
      },
      alert: vi.fn(),
      focus: vi.fn(),
      setTimeout: (callback) => { callback(); return 1; },
      callGemini: vi.fn(),
    };
    const load = new Function('window', `${hostBridge}\nreturn window.AlloSheetHostBridge;`);
    const bridge = load(fakeWindow);
    bridge.open({ theme: 'contrast' });

    const launch = new URL(openedUrl);
    const bootstrap = new URLSearchParams(launch.hash.slice(1));
    const token = bootstrap.get('bridgeToken');
    expect(launch.pathname).toBe('/app/allo_sheet/allo_sheet.html');
    expect(launch.origin).toBe('http://127.0.0.1:32173');
    expect(launch.searchParams.get('v')).toBe('7');
    expect(launch.searchParams.get('theme')).toBe('contrast');
    expect(token).toMatch(/^[a-f0-9]{32}$/);
    expect(bootstrap.get('hostOrigin')).toBe('http://localhost:32173');

    messageListener({
      source: popup,
      origin: launch.origin,
      data: { type: 'allosheet-hello', version: 1, bridgeToken: '0'.repeat(32) },
    });
    messageListener({
      source: popup,
      origin: 'https://attacker.example',
      data: { type: 'allosheet-hello', version: 1, bridgeToken: token },
    });
    expect(popup.postMessage).not.toHaveBeenCalled();

    messageListener({
      source: popup,
      origin: launch.origin,
      data: { type: 'allosheet-hello', version: 1, bridgeToken: token },
    });
    expect(popup.postMessage).toHaveBeenCalledTimes(1);
    expect(popup.postMessage.mock.calls[0][0]).toMatchObject({
      type: 'allosheet-ready',
      version: 1,
      bridgeToken: token,
      pairingExpiresAt: expect.any(Number),
    });
    expect(popup.postMessage.mock.calls[0][1]).toBe(launch.origin);

    messageListener({
      source: popup,
      origin: launch.origin,
      data: {
        type: 'allosheet-closed',
        version: 1,
        bridgeToken: token,
      },
    });
    expect(fakeWindow.focus).toHaveBeenCalledTimes(1);
    expect(launcher.focus).toHaveBeenCalledTimes(1);
  });

  it('expires a pairing token and rejects the stale companion connection', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    try {
      const harness = loadHostBridgeHarness();
      harness.bridge.open();
      const launch = new URL(harness.openedUrl());
      const token = new URLSearchParams(launch.hash.slice(1)).get('bridgeToken');
      harness.emit({ type: 'allosheet-hello', version: 1, bridgeToken: token });
      expect(harness.bridge.getPairingStatus().paired).toBe(true);
      now.mockReturnValue(1_000_000 + (15 * 60 * 1000) + 1);
      harness.emit({ type: 'allosheet-hello', version: 1, bridgeToken: token });
      expect(harness.bridge.getPairingStatus()).toEqual({ paired: false, expiresAt: null });
      expect(harness.popup.postMessage.mock.calls.at(-1)[0]).toMatchObject({
        type: 'allosheet-pairing-expired',
        bridgeToken: token,
      });
    } finally {
      now.mockRestore();
    }
  });

  it('sends a revalidated tabular artifact only over the authenticated postMessage channel', () => {
    const harness = loadHostBridgeHarness();
    const input = behaviorLensArtifact();
    harness.bridge.open({ theme: 'contrast', artifact: input });

    const launch = new URL(harness.openedUrl());
    const bootstrap = new URLSearchParams(launch.hash.slice(1));
    const token = bootstrap.get('bridgeToken');

    expect(Array.from(launch.searchParams.keys()).sort()).toEqual(['theme', 'v']);
    expect(Array.from(bootstrap.keys()).sort()).toEqual(['bridgeToken', 'hostOrigin']);
    expect(launch.href).not.toContain('BehaviorLens');
    expect(launch.href).not.toContain('Learner');
    expect(launch.href).not.toContain('artifact');
    expect(harness.popup.postMessage).not.toHaveBeenCalled();

    // Mutating the caller-owned object after open must not change what crosses
    // the boundary. The bridge has already rebuilt a constrained copy.
    input.tables[0].rows[0].values.count = 999;
    input.tables[0].rows[0].values.student = 'Mutated learner';

    harness.emit({
      type: 'allosheet-hello',
      version: 1,
      bridgeToken: token,
    }, { origin: 'https://attacker.example' });
    harness.emit({
      type: 'allosheet-hello',
      version: 1,
      bridgeToken: '0'.repeat(32),
    });
    expect(harness.popup.postMessage).not.toHaveBeenCalled();

    harness.emit({
      type: 'allosheet-hello',
      version: 1,
      bridgeToken: token,
    });

    expect(harness.popup.postMessage).toHaveBeenCalledTimes(2);
    const [readyCall, artifactCall] = harness.popup.postMessage.mock.calls;
    expect(readyCall[0]).toMatchObject({
      type: 'allosheet-ready',
      version: 1,
      bridgeToken: token,
    });
    expect(artifactCall[1]).toBe(launch.origin);
    expect(artifactCall[0]).toMatchObject({
      type: 'allosheet-import-artifact',
      transferId: expect.stringMatching(/^[a-f0-9]{32}$/),
      version: 1,
      bridgeToken: token,
      artifact: {
        kind: 'alloflow.tabular.v1',
        version: 1,
        source: {
          tool: 'behaviorlens',
          label: 'BehaviorLens',
        },
        privacy: {
          transferEnablesAI: false,
        },
        capabilities: {
          writeBack: false,
          aiEnabled: false,
        },
      },
    });
    expect(artifactCall[0].artifact.tables[0].columns[1].type).toBe('text');
    expect(artifactCall[0].artifact.tables[0].rows[0].values).toEqual({
      student: 'Learner A',
      count: 3,
    });
    expect(artifactCall[0].artifact).not.toHaveProperty('untrustedExtra');
    expect(artifactCall[0].artifact.provenance).not.toHaveProperty('ignoredFunction');
  });

  it('queues transfers until the destination acknowledges each reviewed decision', async () => {
    const harness = loadHostBridgeHarness();
    const first = harness.bridge.openTransfer({
      artifact: behaviorLensArtifact({ title: 'First transfer' }),
    });
    const second = harness.bridge.openTransfer({
      artifact: behaviorLensArtifact({ title: 'Second transfer' }),
    });
    expect(first.transferId).toMatch(/^[a-f0-9]{32}$/);
    expect(second.transferId).toMatch(/^[a-f0-9]{32}$/);
    expect(second.transferId).not.toBe(first.transferId);
    expect(harness.fakeWindow.open).toHaveBeenCalledTimes(1);

    const launch = new URL(harness.openedUrl());
    const token = new URLSearchParams(launch.hash.slice(1)).get('bridgeToken');
    harness.emit({ type: 'allosheet-hello', version: 1, bridgeToken: token });

    let imports = harness.popup.postMessage.mock.calls
      .map((call) => call[0])
      .filter((message) => message.type === 'allosheet-import-artifact');
    expect(imports).toHaveLength(1);
    expect(imports[0]).toMatchObject({
      transferId: first.transferId,
      artifact: { title: 'First transfer' },
    });

    harness.emit({
      type: 'allosheet-transfer-receipt',
      transferId: first.transferId,
      status: 'received',
      version: 1,
      bridgeToken: token,
    });
    await expect(first.delivered).resolves.toEqual({
      transferId: first.transferId,
      status: 'received',
    });
    imports = harness.popup.postMessage.mock.calls
      .map((call) => call[0])
      .filter((message) => message.type === 'allosheet-import-artifact');
    expect(imports).toHaveLength(1);

    harness.emit({
      type: 'allosheet-transfer-receipt',
      transferId: first.transferId,
      status: 'accepted',
      version: 1,
      bridgeToken: token,
    });
    await expect(first.decision).resolves.toEqual({
      transferId: first.transferId,
      status: 'accepted',
    });
    imports = harness.popup.postMessage.mock.calls
      .map((call) => call[0])
      .filter((message) => message.type === 'allosheet-import-artifact');
    expect(imports).toHaveLength(2);
    expect(imports[1]).toMatchObject({
      transferId: second.transferId,
      artifact: { title: 'Second transfer' },
    });

    harness.emit({
      type: 'allosheet-transfer-receipt',
      transferId: second.transferId,
      status: 'received',
      version: 1,
      bridgeToken: token,
    });
    harness.emit({
      type: 'allosheet-transfer-receipt',
      transferId: second.transferId,
      status: 'cancelled',
      version: 1,
      bridgeToken: token,
    });
    await expect(second.delivered).resolves.toMatchObject({ status: 'received' });
    await expect(second.decision).resolves.toMatchObject({ status: 'cancelled' });
  });

  it('rejects active and queued promises on close, advances after rejection, and ignores forged receipts', async () => {
    const harness = loadHostBridgeHarness();
    const first = harness.bridge.openTransfer({
      artifact: behaviorLensArtifact({ title: 'Rejected transfer' }),
    });
    const second = harness.bridge.openTransfer({
      artifact: behaviorLensArtifact({ title: 'Queued transfer' }),
    });
    const launch = new URL(harness.openedUrl());
    const token = new URLSearchParams(launch.hash.slice(1)).get('bridgeToken');
    harness.emit({ type: 'allosheet-hello', version: 1, bridgeToken: token });

    let firstSettled = false;
    first.delivered.finally(() => { firstSettled = true; }).catch(() => {});
    harness.emit({
      type: 'allosheet-transfer-receipt',
      transferId: second.transferId,
      status: 'received',
      version: 1,
      bridgeToken: token,
    });
    harness.emit({
      type: 'allosheet-transfer-receipt',
      transferId: first.transferId,
      status: 'received',
      version: 1,
      bridgeToken: token,
    }, { origin: 'https://attacker.example' });
    await Promise.resolve();
    expect(firstSettled).toBe(false);

    harness.emit({
      type: 'allosheet-transfer-receipt',
      transferId: first.transferId,
      status: 'rejected',
      reason: 'Destination validation rejected the table.',
      version: 1,
      bridgeToken: token,
    });
    await expect(first.delivered).rejects.toThrow(/destination validation/i);
    await expect(first.decision).rejects.toThrow(/destination validation/i);
    const imports = harness.popup.postMessage.mock.calls
      .map((call) => call[0])
      .filter((message) => message.type === 'allosheet-import-artifact');
    expect(imports.map((message) => message.transferId)).toEqual([
      first.transferId,
      second.transferId,
    ]);

    harness.emit({
      type: 'allosheet-closed',
      version: 1,
      bridgeToken: token,
    });
    await expect(second.delivered).rejects.toThrow(/closed/i);
    await expect(second.decision).rejects.toThrow(/closed/i);
    expect(harness.fakeWindow.focus).toHaveBeenCalled();
    expect(harness.launcher.focus).toHaveBeenCalled();
  });

  it('bounds how long a queued sender waits behind an unfinished destination review', async () => {
    const harness = loadHostBridgeHarness();
    const first = harness.bridge.openTransfer({
      artifact: behaviorLensArtifact({ title: 'Open destination review' }),
    });
    const second = harness.bridge.openTransfer({
      artifact: behaviorLensArtifact({ title: 'Waiting source review' }),
    });
    const launch = new URL(harness.openedUrl());
    const token = new URLSearchParams(launch.hash.slice(1)).get('bridgeToken');
    harness.emit({ type: 'allosheet-hello', version: 1, bridgeToken: token });
    harness.emit({
      type: 'allosheet-transfer-receipt',
      transferId: first.transferId,
      status: 'received',
      version: 1,
      bridgeToken: token,
    });
    await expect(first.delivered).resolves.toMatchObject({ status: 'received' });

    harness.runPendingTimers();
    await expect(second.delivered).rejects.toThrow(/waited too long behind another transfer review/i);
    await expect(second.decision).rejects.toThrow(/waited too long behind another transfer review/i);

    harness.emit({
      type: 'allosheet-transfer-receipt',
      transferId: first.transferId,
      status: 'cancelled',
      version: 1,
      bridgeToken: token,
    });
    await expect(first.decision).resolves.toMatchObject({ status: 'cancelled' });
  });

  it('times out an unacknowledged delivery and ignores a late receipt', async () => {
    const harness = loadHostBridgeHarness();
    const transfer = harness.bridge.openTransfer({
      artifact: behaviorLensArtifact({ title: 'Timeout transfer' }),
    });
    const launch = new URL(harness.openedUrl());
    const token = new URLSearchParams(launch.hash.slice(1)).get('bridgeToken');
    harness.emit({ type: 'allosheet-hello', version: 1, bridgeToken: token });
    harness.runPendingTimers();
    await expect(transfer.delivered).rejects.toThrow(/did not confirm receipt/i);
    await expect(transfer.decision).rejects.toThrow(/did not confirm receipt/i);

    harness.emit({
      type: 'allosheet-transfer-receipt',
      transferId: transfer.transferId,
      status: 'received',
      version: 1,
      bridgeToken: token,
    });
    await expect(transfer.delivered).rejects.toThrow(/did not confirm receipt/i);
  });

  it('rejects both promises when popup delivery throws synchronously', async () => {
    const harness = loadHostBridgeHarness();
    harness.popup.postMessage.mockImplementation((message) => {
      if (message && message.type === 'allosheet-import-artifact') {
        throw new Error('Synthetic postMessage failure');
      }
    });
    const transfer = harness.bridge.openTransfer({
      artifact: behaviorLensArtifact({ title: 'Post failure transfer' }),
    });
    const launch = new URL(harness.openedUrl());
    const token = new URLSearchParams(launch.hash.slice(1)).get('bridgeToken');
    harness.emit({ type: 'allosheet-hello', version: 1, bridgeToken: token });
    await expect(transfer.delivered).rejects.toThrow(/could not deliver this transfer/i);
    await expect(transfer.decision).rejects.toThrow(/could not deliver this transfer/i);
  });

  it('rejects invalid and oversized artifacts before opening a companion', () => {
    const invalidHarness = loadHostBridgeHarness();
    const invalid = behaviorLensArtifact({
      tables: [{
        id: 'summary',
        title: 'Weekly summary',
        columns: [{ key: 'count', label: 'Count', type: 'number' }],
        rows: [{
          id: 'row-1',
          values: { count: 3, injected: 'not a declared field' },
        }],
      }],
    });

    expect(invalidHarness.bridge.open({ artifact: invalid })).toBeNull();
    expect(invalidHarness.fakeWindow.open).not.toHaveBeenCalled();
    expect(invalidHarness.fakeWindow.alert).toHaveBeenCalledWith(
      expect.stringMatching(/field that is not in table/i),
    );

    const duplicateLabelHarness = loadHostBridgeHarness();
    const duplicateLabels = behaviorLensArtifact({
      tables: [{
        id: 'duplicate_labels',
        title: 'Duplicate labels',
        columns: [
          { key: 'first', label: 'Same label', type: 'text' },
          { key: 'second', label: 'Same label', type: 'text' },
        ],
        rows: [{ id: 'row-1', values: { first: 'a', second: 'b' } }],
      }],
    });
    expect(duplicateLabelHarness.bridge.open({ artifact: duplicateLabels })).toBeNull();
    expect(duplicateLabelHarness.fakeWindow.open).not.toHaveBeenCalled();
    expect(duplicateLabelHarness.fakeWindow.alert).toHaveBeenCalledWith(
      expect.stringMatching(/duplicate column labels/i),
    );

    const oversizedHarness = loadHostBridgeHarness();
    const columns = Array.from({ length: 40 }, (_, index) => ({
      key: `column_${index}`,
      label: `Column ${index}`,
      type: 'text',
    }));
    const largeValues = Object.fromEntries(
      columns.map((column) => [column.key, 'x'.repeat(1200)]),
    );
    const oversized = behaviorLensArtifact({
      tables: [{
        id: 'large',
        title: 'Large transfer',
        columns,
        rows: Array.from({ length: 50 }, (_, index) => ({
          id: `row-${index}`,
          values: largeValues,
        })),
      }],
    });

    expect(oversizedHarness.bridge.open({ artifact: oversized })).toBeNull();
    expect(oversizedHarness.fakeWindow.open).not.toHaveBeenCalled();
    expect(oversizedHarness.fakeWindow.alert).toHaveBeenCalledWith(
      expect.stringMatching(/larger than 2 MB/i),
    );

    const utf8Harness = loadHostBridgeHarness();
    const utf8Columns = Array.from({ length: 40 }, (_, index) => ({
      key: `utf8_${index}`,
      label: `UTF-8 ${index}`,
      type: 'text',
    }));
    const utf8Value = '😀'.repeat(600);
    const utf8Values = Object.fromEntries(
      utf8Columns.map((column) => [column.key, utf8Value]),
    );
    const utf8Oversized = behaviorLensArtifact({
      tables: [{
        id: 'utf8_large',
        title: 'UTF-8 byte limit',
        columns: utf8Columns,
        rows: Array.from({ length: 22 }, (_, index) => ({
          id: `utf8-row-${index}`,
          values: utf8Values,
        })),
      }],
    });
    expect(JSON.stringify(utf8Oversized).length).toBeLessThan(2 * 1024 * 1024);
    expect(utf8Harness.bridge.open({ artifact: utf8Oversized })).toBeNull();
    expect(utf8Harness.fakeWindow.open).not.toHaveBeenCalled();
    expect(utf8Harness.fakeWindow.alert).toHaveBeenCalledWith(
      expect.stringMatching(/larger than 2 MB/i),
    );
  });

  it('normalizes the identifierIncluded classification alias at the source boundary', () => {
    const harness = loadHostBridgeHarness();
    const artifact = behaviorLensArtifact({
      classification: {
        level: 'sensitive-education-record',
        identifierIncluded: true,
        freeTextNotesIncluded: false,
      },
      privacy: {
        scope: 'active-student',
        identifierIncluded: false,
        notesIncluded: false,
        reducedData: true,
        transferEnablesAI: false,
      },
    });
    harness.bridge.open({ artifact });
    const launch = new URL(harness.openedUrl());
    const token = new URLSearchParams(launch.hash.slice(1)).get('bridgeToken');
    harness.emit({
      type: 'allosheet-hello',
      version: 1,
      bridgeToken: token,
    });
    const transferred = harness.popup.postMessage.mock.calls
      .map((call) => call[0])
      .find((message) => message.type === 'allosheet-import-artifact')
      .artifact;
    expect(transferred.classification.studentIdentifierIncluded).toBe(true);
    expect(transferred.privacy.identifierIncluded).toBe(true);
  });

  it('keeps credentials server-side and exposes only fixed same-origin routes', () => {
    expect(runtime).toContain("'/api/allosheet/config'");
    expect(runtime).toContain("'/api/allosheet/grist'");
    expect(runtime).toContain('readRequestJson(req, 512 * 1024)');
    expect(runtime).toContain('bootstrapSession: true');
    expect(runtime).toContain('await alloSheetGristBridge.ensureManagedWorkbook()');
    expect(runtime).toContain('docId: workbook.docId');
    expect(runtime).not.toContain('allowUnauthenticated: true');
    expect(gristBridge).toContain('Cookie: cookie');
    expect(gristBridge).toContain('next.origin !== origin');
    expect(gristBridge).toContain('Unauthenticated managed Grist access is not supported.');
    expect(gristBridge).toContain('editorUrl.origin !== baseUrl.origin');
    expect(companion).not.toMatch(/Authorization\s*:|Bearer\s+/);
    expect(hostBridge).not.toMatch(/Authorization\s*:|Bearer\s+/);
    expect(html).not.toMatch(/name=["']apiKey["']/i);
  });

  it('allows only the exact tokenized AlloSheet child in packaged Electron', () => {
    expect(electron).toContain("parsed.pathname !== '/app/allo_sheet/allo_sheet.html'");
    expect(electron).toContain("parsed.searchParams.get('v') !== '7'");
    expect(electron).toContain("if (!/^[a-f0-9]{32}$/i.test(token)) return false;");
    expect(electron).toContain('if (isAllowedAlloSheetPopup(url))');
    expect(electron).toContain('contextIsolation: true');
    expect(electron).toContain('nodeIntegration: false');
    expect(electron).toContain('nodeIntegrationInSubFrames: false');
    expect(electron).toContain('sandbox: true');
    expect(electron).toContain("childWindow.webContents.on('will-navigate'");
    expect(electron).toContain('devTools: false');
    expect(electron).toContain('isAllowedPrivateApiRequest(details.url, privateApiOrigins)');
    expect(electron).toContain('isTrustedAlloSheetGristFrameRequest(');
    expect(electron).toContain("'https://127.0.0.1/*'");
    expect(electron).toContain("'wss://127.0.0.1/*'");
    expect(electron.match(/onBeforeSendHeaders/g)).toHaveLength(1);
    expect(requestAuth).toContain('target.pathname.startsWith(\'/api/\')');
    expect(requestAuth).toContain("resourceType === 'subFrame'");
    expect(hostBridge).toContain("'_blank'");
    expect(electron).toContain('app.requestSingleInstanceLock()');
    expect(electron).toContain("app.on('second-instance', focusMainWindow)");
    expect(electron).toContain('if (!hasSingleInstanceLock) return;');
    expect(electron).toContain('if (mainWindow.isMinimized()) mainWindow.restore()');
  });

  it('ships the companion folder and uses only external page scripts', () => {
    expect(build).toMatch(/COMPANION_ASSET_DIRS\s*=\s*\[[\s\S]*'allo_sheet'/);
    const document = new DOMParser().parseFromString(html, 'text/html');
    const scripts = Array.from(document.querySelectorAll('script'));
    expect(scripts).toHaveLength(4);
    expect(scripts.every((script) => Boolean(script.src))).toBe(true);
    expect(scripts.every((script) => script.src.includes('?v=8'))).toBe(true);
    expect(scripts.map((script) => new URL(script.src).pathname.split('/').pop())).toEqual([
      'allo_sheet_adapter.js',
      'allo_sheet_analysis.js',
      'allo_sheet_workspace.js',
      'allo_sheet.js',
    ]);
    expect(document.querySelector('link[rel="stylesheet"]').href).toContain('?v=8');
    expect(document.querySelector('iframe').getAttribute('sandbox')).toContain('allow-scripts');
    expect(document.querySelector('[role="tablist"]')).not.toBeNull();
    expect(document.querySelector('#artifactReview').getAttribute('role')).toBe('dialog');
    expect(document.querySelector('#artifactReview').getAttribute('aria-modal')).toBe('true');
    expect(document.querySelector('#artifactReviewBackdrop')).not.toBeNull();
  });

  it('pins, verifies, and isolates the managed local Grist sidecar', () => {
    const manifest = JSON.stringify(engineContract.DEFAULT_GRIST_DESKTOP_MANIFEST);
    expect(manifest).toContain('0.3.13');
    expect(manifest).toContain('Apache-2.0');
    expect(manifest).toContain('https://github.com/gristlabs/grist-desktop');
    expect(manifest).toContain('grist-desktop-0.3.13-win-x64.zip');
    expect(manifest).toContain('c85f49625cfd355b9c445a77bc5e4df6a8a6ea2e4c54597ccca3faa322a4b1cc');
    expect(() => engineContract.validateRelativeTarget('../escape.zip')).toThrow(/unsafe|relative/);
    const insecureManifest = JSON.parse(JSON.stringify(
      engineContract.DEFAULT_GRIST_DESKTOP_MANIFEST,
    ));
    insecureManifest.artifacts['win32-x64'].archiveUrl = 'http://downloads.example/grist.zip';
    expect(() => engineContract.validateManifest(insecureManifest, 'win32-x64'))
      .toThrow(/HTTPS/);
    expect(engineManager).toMatch(/createHash\(['"]sha256['"]\)/);
    expect(engineManager).toContain('GRIST_HOST');
    expect(engineManager).toContain('127.0.0.1');
    expect(engineManager).toContain('GRIST_SANDBOX_FLAVOR');
    expect(engineManager).toContain('pyodide');
    expect(engineManager).toContain('GRIST_DESKTOP_USE_UPDATE');
    expect(engineManager).toContain('GRIST_ALLOW_AUTOMATIC_VERSION_CHECKING');
    expect(engineManager).toContain('GRIST_TELEMETRY_LEVEL');
    expect(engineManager).toContain("GRIST_DESKTOP_AUTH: 'strict'");
    expect(engineManager).not.toContain("GRIST_DESKTOP_AUTH: 'none'");
    expect(engineManager).toContain('GRIST_SESSION_SECRET');
    expect(engineManager).toContain('GRIST_SESSION_COOKIE');
    expect(engineManager).toContain('selectChildEnvironment(baseEnv)');
    expect(engineManager).not.toContain('...baseEnv');
    expect(engineManager).toContain("stdio: ['ignore', 'pipe', 'pipe', 'ipc']");
    expect(engineManager).toContain('allosheet-grist-bootstrap.cjs');
    expect(gristBootstrap).toContain('ElectronLoginSystem.instance');
    expect(gristBootstrap).toContain('process.send({');
    expect(gristBootstrap).toContain("process.once('disconnect'");
    expect(gristBootstrap).not.toContain('process.env.ELECTRON_KEY');
    expect(engineManager).toContain('windowsHide: true');
    expect(engineManager).toContain('shell: false');
    expect(engineManager).toContain('isSymbolicLink()');
    expect(runtime).toMatch(/['"]\/api\/allosheet\/engine\/status['"]/);
    expect(runtime).toMatch(/['"]\/api\/allosheet\/engine\/start['"]/);
  });

  it('documents first-use local mode without assuming a packaged Grist binary', () => {
    expect(allosheetReadme).toContain('Default: local popup, no Docker');
    expect(allosheetReadme).toContain('Grist Desktop v0.3.13');
    expect(allosheetReadme).toContain('expected SHA-256 digest');
    expect(allosheetReadme).toContain('Windows import acceptance check');
    expect(dockerReadme).toMatch(/not required for the\s+normal AlloSheet desktop/);
    expect(electronBuilder.extraResources).toContainEqual({
      from: '../allo_sheet/THIRD_PARTY_NOTICES.md',
      to: 'ALLOSHEET_THIRD_PARTY_NOTICES.md',
    });
    const packagedGristBinaries = electronBuilder.extraResources.filter((entry) =>
      /grist-desktop.*\.(?:zip|exe|dmg|appimage)$/i.test(String(entry.from || '')),
    );
    expect(packagedGristBinaries).toEqual([]);
  });

  it('retains the attributed pinned Docker recipe as an optional server deployment', () => {
    const notices = read('allo_sheet/THIRD_PARTY_NOTICES.md');
    const compose = read('docker/allosheet-grist/docker-compose.yml');
    expect(notices).toContain('Grist Desktop');
    expect(notices).toContain('Version: 0.3.13');
    expect(notices).toContain('Copyright 2014-2022 Grist Labs Inc.');
    expect(notices).toContain('Apache License, Version 2.0');
    expect(dockerReadme).toContain('optional deployment recipe');
    expect(compose).toContain('gristlabs/grist-oss:1.7.13');
    expect(compose).toContain('127.0.0.1:8484:8484');
    expect(compose).toContain('GRIST_SANDBOX_FLAVOR: "gvisor"');
  });

  // hostOrigin is the address the companion posts every reply to
  // (allo_sheet.js reads it from the bootstrap hash and posts to it). It must
  // be the DOCUMENT's origin, not the URL's: a blob: document parses to the
  // origin embedded in its path, so new URL(href).origin can hand back a
  // real-looking https:// string for a document whose real origin is opaque.
  // That does not fail loudly; it produces a companion whose every reply the
  // browser silently drops. location.origin is the document's own answer and
  // reports 'null' when opaque, which the existing guard then catches.
  it('takes the host origin from the document, not from parsing its URL', () => {
    const source = read('allo_sheet/host_bridge.js');
    expect(source).toContain('hostOrigin = window.location.origin');
    expect(source).not.toContain('hostOrigin = new URL(window.location.href).origin');
    // The guard that refuses to launch without a usable origin stays.
    expect(source).toContain("!/^https?:\\/\\//i.test(hostOrigin)");
    // Deploy mirrors carry the same file.
    expect(read('desktop/web-app/public/allo_sheet/host_bridge.js')).toBe(source);
  });
});
