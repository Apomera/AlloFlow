import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

const read = file => readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const host = read(process.env.ALLO_RECOVERY_HOST || 'AlloFlowANTI.txt');
const client = read(process.env.ALLO_RECOVERY_CLIENT || 'allo_device_storage_module.js');
const bridge = read(process.env.ALLO_RECOVERY_BRIDGE || 'storage_bridge.html');
function section(source, start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  if (from < 0 || to <= from || source.indexOf(start, from + start.length) !== -1) {
    throw Error('Missing/ambiguous actual-source boundary: ' + start);
  }
  return source.slice(from, to);
}
const recovery = new Function('window', section(host,
  'const ALLO_WORKSPACE_RECOVERY = (() => {', '\n\nconst _alloGetCanvasDeviceStorage')
  + '\nreturn ALLO_WORKSPACE_RECOVERY;')({});
const nativeExports = '\nreturn { normalize: normalizeRecoveryStore, mutate: applyRecoveryMutation, strip: stripRecoveryMedia };';
const local = new Function(section(client, '  function storageError(code, message)',
  '  // Mirrors the monolith\'s _isCanvasEnv hostname heuristic') + nativeExports)();
const crossOrigin = new Function(section(bridge, "  var RECOVERY_NAMESPACE = 'workspace_recovery';",
  '  function kvSet(ns, key, value)') + nativeExports)();
const clone = value => JSON.parse(JSON.stringify(value));
const IMAGE = 'data:image/png;base64,AQ==', AUDIO = 'data:audio/wav;base64,Ag==';
const liveHistory = count => [{ id: 'lesson', type: 'simplified', title: 'Pond', data: {
  text: 'Keep the teacher text.', image: IMAGE, audio: AUDIO,
  remoteImage: 'https://school.example/pond.png',
  previews: Array.from({ length: count }, (_, index) => 'blob:session-preview-' + index),
} }];
function snapshot(count = 500) {
  return recovery.stripSessionOnlyAssets({ version: 1, id: 'intent-workspace',
    title: 'Pond', savedAt: '2026-10-03T12:00:00.000Z', pinned: true,
    workspace: { history: liveHistory(count), inputText: 'Keep this source text.', sourceTopic: 'Pond' },
  });
}
function stored(count = 500) {
  return recovery.upsert(recovery.emptyStore(), snapshot(count));
}
async function nextSnapshot(previousStore, count = 500) {
  const history = liveHistory(count), env = {
    window: {}, ALLO_WORKSPACE_RECOVERY: recovery, history, units: [], profiles: [],
    generatedContent: history[0], activeView: 'simplified', inputText: 'Keep this source text.', sourceTopic: 'Pond',
    canvasRecoveryCurrentIdRef: { current: 'intent-workspace' }, canvasRecoveryStoreRef: { current: previousStore },
    _alloCaptureCanvasSelAuthoringState: () => ({}), _alloNormalizeResearchSettings: value => value,
    _alloNormalizeStudentProjectSettings: value => value,
  };
  const scope = new Proxy(env, { has: () => true,
    get: (target, name) => name === Symbol.unscopables ? undefined : name in target ? target[name] : globalThis[name] });
  return new Function('scope', 'with(scope) {\n' + section(host,
    '  const buildCanvasWorkspaceSnapshot = async ', '  const restoreCanvasWorkspaceSnapshot')
    + '\nreturn buildCanvasWorkspaceSnapshot();\n}')(scope);
}
const adapters = [
  { name: 'host/vault helper', remove: store => recovery.removeMedia(store, 'intent-workspace'), strip: recovery.stripLargeAssets },
  { name: 'native local storage mutation', remove: store => {
    const result = local.mutate(store, { version: 1, action: 'removeMedia', snapshotId: 'intent-workspace' });
    expect(result).toMatchObject({ applied: true, reason: 'media-removed' }); return result.store;
  }, strip: local.strip },
  { name: 'native cross-origin bridge mutation', remove: store => {
    const result = crossOrigin.mutate(store, { version: 1, action: 'removeMedia', snapshotId: 'intent-workspace' });
    expect(result).toMatchObject({ applied: true, reason: 'media-removed' }); return result.store;
  }, strip: crossOrigin.strip },
];

describe.each(adapters)('$name explicit teacher media-removal intent', adapter => {
  it('retains an actual removal entry when 500 earlier session omissions fill the manifest', () => {
    const source = stored(), before = clone(source), removed = adapter.remove(source), saved = removed.snapshots[0];
    expect(saved.workspace.history[0].data).toMatchObject({ image: null, audio: null,
      text: 'Keep the teacher text.', remoteImage: 'https://school.example/pond.png' });
    expect(saved.pinned).toBe(true); expect(saved.omittedAssets).toBe(502);
    expect(saved.omittedAssetManifest).toHaveLength(500);
    expect(saved.omittedAssetManifest).toContainEqual(expect.objectContaining({
      path: 'snapshot.workspace.history[0].data.image', reason: 'user-remove-media', kind: 'image/png',
    }));
    expect(source).toEqual(before);
  });
  it('does not reinsert still-live media on the next actual host snapshot after removal and serialization', async () => {
    const removed = adapter.remove(stored()), serialized = recovery.normalizeStore(clone(removed));
    const next = await nextSnapshot(serialized);
    expect(next.workspace.history[0].data.image).toBeNull();
    expect(next.workspace.history[0].data.audio).toBeNull();
    expect(next.workspace.history[0].data.text).toBe('Keep the teacher text.');
    expect(next.omittedAssetManifest.some(entry => entry?.reason === 'user-remove-media')).toBe(true);
    expect(next.omittedAssetManifest).toHaveLength(500);
  });
  it('keeps the existing removal behavior below the manifest cap', async () => {
    const removed = adapter.remove(stored(3)), next = await nextSnapshot(recovery.normalizeStore(clone(removed)), 3);
    expect(next.workspace.history[0].data.image).toBeNull(); expect(next.workspace.history[0].data.audio).toBeNull();
    expect(next.omittedAssetManifest.some(entry => entry?.reason === 'user-remove-media')).toBe(true);
    expect(next.omittedAssetManifest).toHaveLength(5);
  });
  it('preserves an actual explicit entry beyond the imported cap when stripping again for quota', () => {
    const imported = snapshot(), oldManifest = clone(imported.omittedAssetManifest);
    const explicit = { path: 'snapshot.workspace.history[0].data.image', kind: 'image/png',
      approximateBytes: 20, reason: 'user-remove-media' };
    imported.omittedAssetManifest = [...oldManifest, explicit]; imported.omittedAssets = 501;
    const reduced = adapter.strip(imported, 'device-quota');
    expect(reduced.omittedAssetManifest).toHaveLength(500);
    expect(reduced.omittedAssetManifest).toContainEqual(explicit);
    expect(imported.omittedAssetManifest).toEqual([...oldManifest, explicit]);
  });
});

describe('host normalization, omission-only controls and quota behavior', () => {
  it('preserves a later explicit entry while normalizing an imported over-cap manifest', () => {
    const imported = snapshot(), explicit = { path: 'snapshot.workspace.history[0].data.audio',
      kind: 'audio/wav', approximateBytes: 20, reason: 'user-remove-media' };
    imported.omittedAssetManifest.push(explicit); imported.omittedAssets = 501;
    const before = clone(imported), normalized = recovery.normalizeSnapshot(imported);
    expect(normalized.omittedAssetManifest).toHaveLength(500);
    expect(normalized.omittedAssetManifest).toContainEqual(explicit); expect(imported).toEqual(before);
  });
  it('retains current media when a full manifest records only session omissions', async () => {
    const next = await nextSnapshot(stored());
    expect(next.workspace.history[0].data.image).toBe(IMAGE); expect(next.workspace.history[0].data.audio).toBe(AUDIO);
    expect(next.omittedAssetManifest).toHaveLength(500);
    expect(next.omittedAssetManifest.some(entry => entry?.reason === 'user-remove-media')).toBe(false);
  });
  it('retains current media when the full historical manifest records only quota omissions', async () => {
    const previous = stored(); previous.snapshots[0].omittedAssetManifest.forEach(entry => { entry.reason = 'device-quota'; });
    const next = await nextSnapshot(previous);
    expect(next.workspace.history[0].data.image).toBe(IMAGE); expect(next.workspace.history[0].data.audio).toBe(AUDIO);
    expect(next.omittedAssetManifest.some(entry => entry?.reason === 'user-remove-media')).toBe(false);
  });
  it('preserves explicit removal intent through the existing real quota fallback ladder', async () => {
    const removed = recovery.removeMedia(stored(), 'intent-workspace'), next = await nextSnapshot(removed);
    const writer = vi.fn(async candidate => ({ applied: true, store: recovery.upsert(recovery.emptyStore(), candidate) }));
    writer.mockRejectedValueOnce(Object.assign(Error('Device quota exceeded'), { name: 'QuotaExceededError' }));
    const saved = await recovery.saveWithQuotaFallback(next, writer);
    expect(writer).toHaveBeenCalledTimes(2); expect(saved).toMatchObject({ degraded: true, stage: 'media' });
    expect(saved.savedSnapshot.omittedAssetManifest).toHaveLength(500);
    expect(saved.savedSnapshot.omittedAssetManifest.some(entry => entry?.reason === 'user-remove-media')).toBe(true);
    expect(saved.savedSnapshot.workspace.history[0].data.image).toBeNull();
  });
});
