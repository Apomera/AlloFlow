// Executes the exact proposed host delta in memory until integrator 01 lands it.
// Once integrated, the same tests execute the live host without applying a patch.
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { applyPatch } from 'diff';
import { loadAlloModule } from './setup.js';
import { validAudioBase64 } from './lib/audio_fixtures.js';

const require = createRequire(import.meta.url);
const originalHost = readFileSync('AlloFlowANTI.txt', 'utf8').replace(/\r\n/g, '\n');
const firstHost = originalHost.includes('const receivedResourceId = resource && resource.id;') && originalHost.includes('const deliveryResources = await hydrateSessionAssets(appId, resources);')
  ? originalHost : applyPatch(originalHost, readFileSync('reports/connected-delivery-track13/host-integration.patch', 'utf8'));
if (!firstHost) throw new Error('Track 13 initial host patch no longer applies.');
const host = firstHost.includes('function ReceivedReadingDeliveryStatus(props)') ? firstHost
  : applyPatch(firstHost, readFileSync('reports/connected-delivery-track13/recipient-integration.patch', 'utf8'));
if (!host) throw new Error('Track 13 recipient integration patch no longer applies.');
function callback(start, end, name, deps) {
  const from = host.indexOf(start), to = host.indexOf(end, from);
  if (from < 0 || to <= from) throw new Error('Missing host callback: ' + name);
  return new Function(...Object.keys(deps), host.slice(from, to) + '\nreturn ' + name + ';')(...Object.values(deps));
}
const docs = new Map();
const clone = value => JSON.parse(JSON.stringify(value));
let contract, shared, live, transport;
function readings() {
  const original = contract.createSupportedReading('Fair is foul.\r\n', { id: 'original-a', sourceFamilyId: 'family-a', unitId: 'unit-a' });
  original.readingSupports = contract.validateReadingSupports(original, {
    annotations: [{ id: 'curated', start: 0, end: 4, quote: 'Fair', text: 'Teacher meaning', origin: 'educator', pinned: true }]
  });
  const adapted = { id: 'adapted-a', type: 'simplified', title: 'Companion', data: 'Good seems bad.', sourceSnapshot: original.sourceSnapshot,
    sourceFamilyId: original.sourceFamilyId, unitId: original.unitId, instructionalText: { form: 'adapted', role: 'supplemental' },
    karaokeAudio: { version: 4, entries: { a: { audio: 'TEACHER_CLIP', mime: 'audio/mpeg' } } },
    karaokeStudentAudio: { entries: { a: { audio: 'PRIVATE_CLIP' } } }
  };
  return [adapted, original];
}
beforeAll(() => {
  window.React = require('../desktop/web-app/node_modules/react');
  window.AlloLanguageContext = {};
  window.doc = (_db, ...parts) => parts.join('/');
  window.db = {};
  window.setDoc = async (ref, data) => { docs.set(ref, clone(data)); };
  window.getDoc = async ref => ({ exists: () => docs.has(ref), data: () => clone(docs.get(ref)) });
  window.__alloFirebase = { auth: { currentUser: { uid: 'teacher-fixture' } } };
  for (const file of ['instructional_context_module.js', 'firestore_sync_module.js', 'session_transport_module.js', 'live_aac_module.js', 'shared_activity_module.js', 'module_scope_extras_module.js', 'karaoke_audio_store_module.js']) loadAlloModule(file);
  contract = window.AlloModules.InstructionalContext;
  shared = window.AlloModules.SharedActivity;
  live = window.AlloModules.LiveAac;
  transport = window.AlloModules.SessionTransport;
});
beforeEach(() => docs.clear());
const serialize = item => live.serializeResourceForStudentPack(item, { sanitizeHistoryForCloud: window.sanitizeHistoryForCloud, stripUndefined: window.stripUndefined });

function assignmentLoader(packet, hydrate) {
  const deps = {
    _alloEnsureAuthenticatedUser: async () => ({ uid: 'student-fixture' }), setUser: vi.fn(), doc: window.doc, db: {}, hostId: 'app-test', assignmentId: 'HW-fixture',
    getDoc: async () => ({ exists: () => true, data: () => clone(packet) }), _alloApplyAuthoritativeStudentAiPolicy: vi.fn(), _alloAssignmentIsExpired: () => false,
    hydrateSessionAssets: hydrate, cancelled: false, setHistory: vi.fn(), setReceivedDeliveryResources: vi.fn(), setPendingQrAssignmentResource: vi.fn(), addToast: vi.fn(), warnLog: vi.fn()
  };
  return { deps, load: callback('          const loadAssignment = async () => {', '          loadAssignment();', 'loadAssignment', deps) };
}

describe('track 13 isolated host integration', () => {
  it('receives an adapted resource without replacing it or its curated original', async () => {
    const [adapted, original] = readings();
    let history = [original], receivedBundle = [];
    const deps = {
      useCallback: fn => fn, addToast: vi.fn(), mbChunkStoreRef: { current: null }, hydratedHistoryRef: { current: history },
      _alloCollectResChunk: (_store, value) => value.data, _alloDecodeAlloPack: async data => data,
      _alloStudentSafeResources: items => transport.studentSafeResources(items, ['analysis']),
      setReceivedDeliveryResources: update => { receivedBundle = update(receivedBundle); },
      setHistory: update => { history = update(history); }, setPendingQrAssignmentResource: vi.fn(),
      _alloFinishResChunk: vi.fn(), setMbResourceReceiveError: vi.fn(), mbStudentCursorRef: { current: 0 }, warnLog: vi.fn()
    };
    const receive = callback('  const applyMbDownPayload = useCallback(', '  const createHomeworkAssignmentLink = useCallback(', 'applyMbDownPayload', deps);
    await receive({ kind: 'res', rid: 'fixture-message', data: JSON.stringify(serialize(adapted)) });
    expect(history.map(item => item.id)).toEqual([original.id, adapted.id]);
    expect(receivedBundle.map(item => item.id)).toEqual([adapted.id]);
    expect(history[0].readingSupports.annotations[0].pinned).toBe(true);
    expect(deps.setPendingQrAssignmentResource).toHaveBeenCalledWith(expect.objectContaining({ id: adapted.id, data: adapted.data }));
    expect(deps._alloFinishResChunk).toHaveBeenCalledWith(deps.mbChunkStoreRef.current, 'fixture-message', true);
  });

  it.each(['offline', 'unresolved'])('does not open reference-only resources or claim success after %s hydration', async mode => {
    const packet = { resources: [{ id: 'adapted-a', type: 'simplified', __alloResourceRef: 'missing-asset' }] };
    const h = assignmentLoader(packet, async (_app, resources) => { if (mode === 'offline') throw new Error('offline'); return resources; });
    await h.load();
    expect(h.deps.setHistory).not.toHaveBeenCalled();
    expect(h.deps.setReceivedDeliveryResources).not.toHaveBeenCalled();
    expect(h.deps.setPendingQrAssignmentResource).not.toHaveBeenCalled();
    expect(h.deps.addToast).toHaveBeenCalledWith(expect.stringContaining('Could not load'), 'error');
    expect(h.deps.addToast.mock.calls.some(call => call[1] === 'success')).toBe(false);
  });

  it('describes and reopens the actual Firestore assignment body without teacher audio caches', async () => {
    const resources = readings();
    const deps = {
      useCallback: fn => fn, resolveAssignmentResources: () => resources, addToast: vi.fn(), sharedAssignmentActivity: { enabled: false },
      hostPackOnMailbox: vi.fn(), _isCanvasEnv: false, _alloFirebaseIsPlaceholder: false, mbConfig: null,
      createSelfContainedHomeworkLink: vi.fn(), _alloSerializeResourceForStudentPack: serialize,
      prepareSessionResourcesForWrite: window.prepareSessionResourcesForWrite, generateUUID: () => 'fixture', sourceTopic: '', generatedContent: null,
      buildAlloShareUrl: () => 'https://example.invalid/homework', appId: 'app-test', studentAiPolicyForShare: 'off',
      uploadSessionAssets: window.uploadSessionAssets, hydrateSessionAssets: window.hydrateSessionAssets,
      _alloSharedActivityModule: () => shared, doc: window.doc, db: {}, setDoc: window.setDoc,
      stripUndefined: window.stripUndefined, user: { uid: 'teacher-fixture' }, homeworkExpiryDays: 7,
      studentProjectSettings: {}, copyToClipboard: vi.fn(), openQrShareModal: vi.fn(), warnLog: vi.fn()
    };
    const create = callback('  const createHomeworkAssignmentLink = useCallback(', '  const savePortableAacResourceToHistory', 'createHomeworkAssignmentLink', deps);
    expect(await create(['adapted-a'])).toBe('https://example.invalid/homework');
    expect(deps.createSelfContainedHomeworkLink).not.toHaveBeenCalled();
    const packet = docs.get('artifacts/app-test/public/data/sessions/HW-fixture');
    expect(packet.resources[0].__alloResourceRef).toBeTruthy();
    expect(packet.deliverySummary.readings[0]).toMatchObject({ originalStatus: 'included', supportsCount: 1 });
    expect(deps.openQrShareModal.mock.calls[0][0].deliverySummary).toEqual(packet.deliverySummary);
    const reopened = assignmentLoader(packet, window.hydrateSessionAssets);
    await reopened.load();
    const received = reopened.deps.setHistory.mock.calls[0][0];
    expect(received[0].id).toBe('adapted-a');
    expect(reopened.deps.setReceivedDeliveryResources).toHaveBeenCalledWith(received);
    const observed = shared.describeAssignmentDelivery(received, packet.currentResourceId, null, { received: true });
    expect(observed.readings[0].capabilities.referenceAudio).toMatchObject({ inclusion: 'omitted', reason: 'route-unsupported' });
    expect(JSON.stringify(received)).not.toContain('PRIVATE_CLIP');
    expect(JSON.stringify(observed)).not.toContain('TEACHER_CLIP');
    expect(reopened.deps.addToast).toHaveBeenCalledWith(expect.stringContaining('Homework loaded'), 'success');
  });

  it('serializes the pack preview and recomputes receiver evidence instead of trusting a sender ready flag', async () => {
    const resources = readings();
    const built = await shared.buildAssignmentPackEncoded({ resourceIds: ['adapted-a'] }, {
      resolveAssignmentResources: () => resources, serializeResourceForStudentPack: serialize,
      stripUndefined: window.stripUndefined, generateUUID: () => 'fixture', encodeAlloPack: async text => text
    });
    const packet = JSON.parse(built.encoded);
    expect(packet.deliverySummary).toEqual(built.deliverySummary);
    packet.deliverySummary.readings[0].capabilities.referenceAudio = { inclusion: 'included', availability: 'ready' };
    const received = transport.studentSafeResources(packet.resources, ['analysis']);
    expect(shared.describeAssignmentDelivery(received, packet.currentResourceId, null, { received: true }).readings[0].capabilities.referenceAudio.inclusion).toBe('omitted');
  });

  it('distinguishes Firebase live reference bytes from pack omission using a fresh audio store', async () => {
    const create = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
    const revoke = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:recipient-fixture') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    try {
      const [adapted] = readings();
      const storeApi = window.AlloModules.KaraokeAudioStore;
      const writer = storeApi.createStore();
      const identity = { identityVersion: 4, adapterId: 'alloflow.simplified.read-aloud', adapterVersion: 1,
        scopeId: 'main', segmentId: 'body/0/sentence/0', spokenFingerprint: 'fixture-good-seems-bad', spokenText: adapted.data };
      expect(writer.put(identity, validAudioBase64(), 'audio/wav', 'ai-generated')).toBeTruthy();
      adapted.karaokeAudio = writer.serialize();
      writer.clear();
      let manifest;
      const sender = transport.createFirebaseTransport({ teacherOnlyTypes: ['analysis'],
        uploadAssets: items => window.uploadSessionAssets('app-test', items, 'LIVEFIXTURE'),
        prepareResources: window.prepareSessionResourcesForWrite, write: async payload => { manifest = clone(payload.resources); }
      });
      await sender.publishResources([adapted]);
      const received = await window.hydrateSessionAssets('app-test', manifest);
      const reading = received.find(item => item.id === adapted.id);
      expect(reading.karaokeStudentAudio).toBeUndefined();
      const reader = storeApi.createStore();
      expect(reader.hydrate(reading.karaokeAudio)).toBe(1);
      expect(reader.get(identity)).toBe('blob:recipient-fixture');
      expect(shared.describeAssignmentDelivery(received, reading.id, null, { received: true }).readings.find(item => item.id === reading.id).capabilities.referenceAudio)
        .toMatchObject({ inclusion: 'included', availability: 'unverified', reason: 'playback-not-checked' });
      expect(serialize(reading).karaokeAudio).toBeNull();
      reader.clear();
    } finally {
      if (create) Object.defineProperty(URL, 'createObjectURL', create); else delete URL.createObjectURL;
      if (revoke) Object.defineProperty(URL, 'revokeObjectURL', revoke); else delete URL.revokeObjectURL;
    }
  });
});
