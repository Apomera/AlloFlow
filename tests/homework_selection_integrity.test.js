import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
let contract, transport, shared, serialize;

const quiz = id => ({ id, type: 'quiz', title: id, data: [] });
const excluded = () => ({ ...quiz('excluded'), artifactType: 'persona-summary' });
function shellRegion(start, end) {
  const shell = readFileSync('AlloFlowANTI.txt', 'utf8');
  const from = shell.indexOf(start), to = shell.indexOf(end, from);
  if (from < 0 || to < 0) throw new Error('Missing assignment callback');
  return shell.slice(from, to);
}
function resolver(history) {
  return new Function('useCallback', 'history', 'generatedContent', '_alloStudentSafeResources', 'window',
    shellRegion('  const resolveAssignmentResources = useCallback(', '  // Shared packet builder') + '\nreturn resolveAssignmentResources;')(
    fn => fn, history, null, items => transport.studentSafeResources(items, ['analysis', 'lesson-plan']), window);
}
function packHarness(history, overrides = {}) {
  const toasts = [], encode = vi.fn(async json => json);
  const deps = {
    resolveAssignmentResources: resolver(history),
    serializeResourceForStudentPack: item => serialize(item, { sanitizeHistoryForCloud: window.sanitizeHistoryForCloud, stripUndefined: window.stripUndefined }),
    stripUndefined: window.stripUndefined, generateUUID: () => 'local-test', encodeAlloPack: encode,
    addToast: (...args) => toasts.push(args), ...overrides,
  };
  return { toasts, encode, deps, build: options => shared.buildAssignmentPackEncoded(options, deps) };
}
function cloudHarness(history, overrides = {}) {
  const pack = packHarness(history);
  const writes = [], previews = [], toasts = [], fallbackPackets = [];
  const fallback = vi.fn(async resourceIds => {
    const built = await pack.build({ resourceIds });
    if (!built) return null;
    fallbackPackets.push(JSON.parse(built.encoded));
    return 'full-pack';
  });
  const hosted = vi.fn(async () => 'hosted-activity');
  const upload = vi.fn(async (_app, items) => items);
  const deps = {
    useCallback: fn => fn, resolveAssignmentResources: resolver(history),
    _alloSerializeResourceForStudentPack: pack.deps.serializeResourceForStudentPack,
    sharedAssignmentActivity: { enabled: false }, _isCanvasEnv: false, _alloFirebaseIsPlaceholder: false,
    mbConfig: null, appId: 'local-test', sourceTopic: '', generatedContent: null,
    homeworkExpiryDays: 7, studentAiPolicyForShare: 'off', studentProjectSettings: {}, user: { uid: 'local-test' }, db: {},
    generateUUID: () => 'local-test', buildAlloShareUrl: () => 'https://example.invalid/assignment',
    uploadSessionAssets: upload, prepareSessionResourcesForWrite: window.prepareSessionResourcesForWrite,
    doc: (...args) => args, setDoc: async (_ref, value) => writes.push(value), stripUndefined: window.stripUndefined,
    copyToClipboard: () => {}, openQrShareModal: value => previews.push(value),
    _alloSharedActivityModule: () => shared, addToast: (...args) => toasts.push(args), warnLog: () => {},
    hostPackOnMailbox: hosted, createSelfContainedHomeworkLink: fallback, ...overrides,
  };
  const create = new Function(...Object.keys(deps),
    shellRegion('  const createHomeworkAssignmentLink = useCallback(', '  const savePortableAacResourceToHistory') + '\nreturn createHomeworkAssignmentLink;')(...Object.values(deps));
  return { create, writes, previews, toasts, upload, fallback, fallbackPackets, hosted };
}
function readingPair(size = 90000) {
  const original = contract.createSupportedReading('Fair '.repeat(Math.ceil(size / 5)), { id: 'original', sourceFamilyId: 'family', unitId: 'unit' });
  original.readingSupports = contract.validateReadingSupports(original, {
    schemaVersion: 1, sourceFingerprint: original.sourceSnapshot.fingerprint, sourceFamilyId: 'family', unitId: 'unit',
    annotations: [{ id: 'pinned', start: 0, end: 4, quote: 'Fair', text: 'Teacher curated meaning', origin: 'educator', pinned: true, priority: 'essential' }],
  });
  const adapted = {
    id: 'adapted', type: 'simplified', title: 'Selected companion', data: 'Adapted '.repeat(9000),
    sourceSnapshot: original.sourceSnapshot, sourceFamilyId: original.sourceFamilyId, unitId: original.unitId,
    instructionalText: { role: 'supplemental', form: 'adapted' }, sourceInstructionalText: original.sourceInstructionalText,
  };
  return { original, adapted };
}
beforeAll(() => {
  window.React = React;
  for (const name of ['instructional_context_module.js', 'firestore_sync_module.js', 'session_transport_module.js', 'shared_activity_module.js']) loadAlloModule(name);
  contract = window.AlloModules.InstructionalContext;
  transport = window.AlloModules.SessionTransport;
  shared = window.AlloModules.SharedActivity;
  const source = readFileSync('live_aac_source.jsx', 'utf8');
  const start = source.indexOf('const _alloSerializeResourceForStudentPack =');
  const end = source.indexOf('const LiveAacBoardDialog =', start);
  serialize = new Function('window', source.slice(start, end) + '\nreturn _alloSerializeResourceForStudentPack;')(window);
});

describe('homework selection integrity through production callbacks and serializers', () => {
  it('keeps explicit ordering and opening even after History is reordered', async () => {
    const history = [quiz('second'), quiz('first')];
    const ids = ['first', 'second', 'first'];
    const built = await packHarness(history).build({ resourceIds: ids });
    const packet = JSON.parse(built.encoded);
    expect(packet.resources.map(item => item.id)).toEqual(['first', 'second']);
    expect(packet.currentResourceId).toBe('first');
    expect(packet.title).toBe('first');
    const cloud = cloudHarness(history);
    await cloud.create(ids);
    expect(cloud.writes[0].resources.map(item => item.id)).toEqual(['first', 'second']);
    expect(cloud.writes[0].currentResourceId).toBe('first');
  });

  it.each([false, true])('rejects partially missing selections before encoding even with activity=%s', async includeSharedActivity => {
    const pack = packHarness([quiz('kept')], { sharedAssignmentActivity: { enabled: true, type: 'word_cloud', prompt: 'Share an idea', identityMode: 'anonymous' } });
    expect(await pack.build({ resourceIds: ['kept', 'deleted'], includeSharedActivity })).toBeNull();
    expect(pack.encode).not.toHaveBeenCalled();
    expect(pack.toasts[0][0]).toMatch(/no longer available/);
  });

  it('rejects 26 explicit resources, without truncating a request to 25', async () => {
    const history = Array.from({ length: 26 }, (_, index) => quiz('item-' + index));
    const ids = history.map(item => item.id), pack = packHarness(history), cloud = cloudHarness(history);
    expect(resolver(history)(ids)).toEqual([]);
    expect(await pack.build({ resourceIds: ids })).toBeNull();
    expect(pack.encode).not.toHaveBeenCalled();
    expect(pack.toasts[0][0]).toMatch(/at most 25/);
    expect(await cloud.create(ids)).toBeNull();
    expect(cloud.upload).not.toHaveBeenCalled();
    expect(cloud.writes).toEqual([]);
    expect(cloud.fallback).not.toHaveBeenCalled();
  });

  it('does not publish a surviving cloud subset when a selected resource is missing', async () => {
    const cloud = cloudHarness([quiz('kept')]);
    expect(await cloud.create(['kept', 'deleted'])).toBeNull();
    expect(cloud.upload).not.toHaveBeenCalled();
    expect(cloud.writes).toEqual([]);
    expect(cloud.previews).toEqual([]);
    expect(cloud.fallback).not.toHaveBeenCalled();
  });

  it('rejects a requested item removed by the real privacy serializer', async () => {
    const history = [excluded(), quiz('kept')], ids = history.map(item => item.id);
    const pack = packHarness(history), cloud = cloudHarness(history);
    expect(await pack.build({ resourceIds: ids })).toBeNull();
    expect(pack.encode).not.toHaveBeenCalled();
    expect(pack.toasts[0][0]).toMatch(/cannot be shared/);
    expect(await cloud.create(ids)).toBeNull();
    expect(cloud.upload).not.toHaveBeenCalled();
    expect(cloud.writes).toEqual([]);
    expect(cloud.previews).toEqual([]);
  });

  it('also rejects serialization loss of an automatically paired original', async () => {
    const { original, adapted } = readingPair(30);
    const pack = packHarness([original, adapted]);
    const actualSerialize = pack.deps.serializeResourceForStudentPack;
    pack.deps.serializeResourceForStudentPack = item => item.id === original.id ? null : actualSerialize(item);
    expect(await pack.build({ resourceIds: [adapted.id] })).toBeNull();
    expect(pack.encode).not.toHaveBeenCalled();
  });

  it('refuses empty cloud resources after privacy filtering, including default selection', async () => {
    const cloud = cloudHarness([excluded()]);
    expect(await cloud.create()).toBeNull();
    expect(cloud.upload).not.toHaveBeenCalled();
    expect(cloud.writes).toEqual([]);
    expect(cloud.toasts[0][0]).toMatch(/cannot be shared/);
  });

  it('routes explicit empty selections to hosted activity-only authoring', async () => {
    const cloud = cloudHarness([quiz('unrelated')], { sharedAssignmentActivity: { enabled: true } });
    expect(await cloud.create([])).toBe('hosted-activity');
    expect(cloud.hosted).toHaveBeenCalledWith([]);
    expect(cloud.upload).not.toHaveBeenCalled();
    expect(cloud.writes).toEqual([]);
  });

  it('round-trips a cloud reading pair through pack serialization, Firestore sanitization and student hydration', async () => {
    const { original, adapted } = readingPair(30);
    adapted.data = '["Alternate reading stays text"]';
    const cloud = cloudHarness([original, quiz('unrelated'), adapted]);
    expect(await cloud.create([adapted.id])).toBe('https://example.invalid/assignment');
    expect(cloud.writes).toHaveLength(1);
    expect(cloud.fallback).not.toHaveBeenCalled();
    const saved = cloud.writes[0];
    expect(saved.resources.map(item => item.id)).toEqual([adapted.id, original.id]);
    const received = window.hydrateHistory(saved.resources);
    expect(received[0].data).toBe(adapted.data);
    expect(received[1].data).toBe(original.data);
    expect(received[1].sourceSnapshot).toEqual(original.sourceSnapshot);
    expect(contract.isSupportedOriginal(received[1])).toBe(true);
    expect(received[1].readingSupports.annotations).toEqual([expect.objectContaining({ id: 'pinned', pinned: true, text: 'Teacher curated meaning' })]);
    expect(cloud.previews[0].resourceTitles).toEqual(saved.resources.map(item => item.title));
    expect(saved.currentResourceId).toBe(adapted.id);
  });

  it('reroutes an oversized original/adaptation pair before writes and retains exact reading and curated support', async () => {
    const { original, adapted } = readingPair();
    const history = [original, quiz('unrelated'), adapted];
    const resolved = resolver(history)([adapted.id]);
    expect(window.prepareSessionResourcesForWrite(resolved).droppedCount).toBeGreaterThan(0);
    const cloud = cloudHarness(history);
    expect(await cloud.create([adapted.id])).toBe('full-pack');
    expect(cloud.upload).not.toHaveBeenCalled();
    expect(cloud.writes).toEqual([]);
    const packet = cloud.fallbackPackets[0];
    expect(packet.resources.map(item => item.id)).toEqual([adapted.id, original.id]);
    expect(packet.currentResourceId).toBe(adapted.id);
    const received = window.hydrateHistory(packet.resources).find(item => item.id === original.id);
    expect(received.data).toBe(original.data);
    expect(received.sourceSnapshot).toEqual(original.sourceSnapshot);
    expect(received.readingSupports.annotations).toEqual([expect.objectContaining({ id: 'pinned', pinned: true, origin: 'educator', text: 'Teacher curated meaning' })]);
    expect(packet.resources[0].data).toBe(adapted.data);
  });

  it('reroutes single-resource cloud compaction before an upload or placeholder is published', async () => {
    const { original } = readingPair(300000);
    expect(window.prepareSessionResourcesForWrite([original]).resources[0].syncTruncated).toBe(true);
    const cloud = cloudHarness([original]);
    expect(await cloud.create([original.id])).toBe('full-pack');
    expect(cloud.upload).not.toHaveBeenCalled();
    expect(cloud.writes).toEqual([]);
    expect(cloud.fallbackPackets[0].resources[0].data).toBe(original.data);
  });

  it('refuses an empty transport preparation result without publishing a dead opening id', async () => {
    const cloud = cloudHarness([quiz('kept')], { uploadSessionAssets: async () => [] });
    expect(await cloud.create(['kept'])).toBeNull();
    expect(cloud.writes).toEqual([]);
    expect(cloud.previews).toEqual([]);
  });
});
