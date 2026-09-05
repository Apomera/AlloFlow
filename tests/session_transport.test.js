// SessionTransport stage 1 (2026-07-20): one student-safe candidate rule for
// every live-session content channel + a dependency-injected Firebase adapter
// (the mailbox adapter is an orchestration shell until stage 2 lifts the pack
// cycle). Also pins the ANTI wiring so a sweep can't quietly restore the old
// per-channel filters.
import { describe, it, expect, beforeAll, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let ST;
const anti = fs.readFileSync(path.join(ROOT, 'AlloFlowANTI.txt'), 'utf8');
// The Live Dock was extracted from ANTI into its own CDN view module.
const liveDock = fs.readFileSync(path.join(ROOT, 'view_live_session_dock_source.jsx'), 'utf8');

beforeAll(() => {
  global.window = global.window || {};
  // eslint-disable-next-line no-new-func
  new Function('window', fs.readFileSync(path.join(ROOT, 'session_transport_module.js'), 'utf8'))(global.window);
  ST = global.window.AlloModules.SessionTransport;
});

const TEACHER_ONLY = ['lesson-plan', 'udl-advice', 'persona-session'];

const activitySource = fs.readFileSync(path.join(ROOT, 'view_brainstorm_source.jsx'), 'utf8');
const projectStudentActivityResource = new Function(activitySource.slice(activitySource.indexOf('function projectStudentActivityResource('), activitySource.indexOf('function ActivityStructuredEditor(')) + '\nreturn projectStudentActivityResource;')();
function makeStudentRule({ module = true, projector = projectStudentActivityResource } = {}) {
  const begin = anti.indexOf('const TEACHER_ONLY_TYPES = [');
  const end = anti.indexOf('const _alloIsStudentSafeResource =', begin);
  const modules = {};
  if (module) modules.SessionTransport = ST;
  if (projector) modules.BrainstormView = { projectStudentActivityResource: projector };
  return new Function('window', anti.slice(begin, end) + '\nreturn _alloStudentSafeResources;')({ AlloModules: modules });
}
function mixedActivities() {
  return {
    id: 'activities-a', type: 'brainstorm', unitId: 'unit-a', teacherNotes: 'PRIVATE resource notes',
    config: { grade: '5', language: 'English', apiKey: 'PRIVATE config', customInstructions: 'PRIVATE prompt' },
    data: [
      { kind: 'idea', title: 'PRIVATE teacher idea', guide: 'PRIVATE idea guide' },
      { kind: 'discussion', title: 'Talk about water', openingQuestion: 'Why does ice float?',
        protocol: 'think-pair-share', grouping: 'Pairs', guide: 'PRIVATE teacher guide', notes: 'PRIVATE notes',
        questionSets: [{ depth: 'literal', questions: ['What is ice?'], answer: 'PRIVATE key' }],
        talkStems: { agree: ['I agree because...'], teacherOnly: ['PRIVATE stem'] }, derivativeMeta: { guide: 'PRIVATE meta' } },
      { kind: 'jigsaw', title: 'Investigate water', groupSize: 4, guide: 'PRIVATE guide',
        chunks: [{ label: 'Ice', expertPacket: 'Read about frozen water.', answerKey: 'PRIVATE chunk key', teachBack: { keyPoints: ['Ice is solid.'], checkQuestions: ['What is solid?'], notes: 'PRIVATE teaching notes' } }],
        homeGroupTask: 'Share your findings.', synthesisOrganizer: 'Complete the chart.',
        accountabilityCheck: [{ q: 'Name a state of matter.', answer: 'PRIVATE answer' }] }
    ]
  };
}
function expectLearnerActivities(items) {
  expect(items).toHaveLength(1);
  expect(items[0]).toMatchObject({ id: 'activities-a', type: 'brainstorm', studentProjection: true, unitId: 'unit-a' });
  expect(items[0].data.map(item => item.kind)).toEqual(['discussion', 'jigsaw']);
  expect(items[0].data[0].openingQuestion).toBe('Why does ice float?');
  expect(items[0].data[1].chunks[0].expertPacket).toBe('Read about frozen water.');
  expect(JSON.stringify(items)).not.toContain('PRIVATE');
}


const liveFollowStart = anti.indexOf('const _alloFollowResourceLive = (item, options = {}) => {');
const liveFollowEnd = anti.indexOf('const handleRestoreView', liveFollowStart);
if (liveFollowStart < 0 || liveFollowEnd < 0) throw new Error('Live follow helper markers are missing');

function makeLiveFollowHarness(overrides = {}) {
  const deps = {
    isTeacherMode: true,
    activeSessionCode: 'LIVE-1',
    mbLive: null,
    mbMode: 'sync',
    TEACHER_ONLY_TYPES: TEACHER_ONLY,
    _alloStudentSafeResources: makeStudentRule(),
    addToast: vi.fn(),
    doc: vi.fn(() => ({ path: 'session' })),
    db: {},
    activeSessionAppId: 'host-app',
    appId: 'default-app',
    updateDoc: vi.fn(async () => {}),
    window: { AlloModules: { SessionTransport: ST } },
    _alloSessionSyncTrace: vi.fn(),
    warnLog: vi.fn(),
    pushResourceToMailbox: vi.fn(),
    _mbPushOneResource: vi.fn(async () => ({ rtcCount: 0 })),
    requestWordSoundsAudioConfirmation: vi.fn(() => false),
    ...overrides,
  };
  // eslint-disable-next-line no-new-func
  const follow = new Function(...Object.keys(deps), anti.slice(liveFollowStart, liveFollowEnd) + '\nreturn _alloFollowResourceLive;')(...Object.values(deps));
  return { follow, deps };
}

describe('studentSafeResources (the one candidate rule)', () => {
  it('keeps id-bearing student types, drops teacher-only and malformed items', () => {
    const history = [
      { id: 'a', type: 'simplified' },
      { id: 'b', type: 'analysis' },        // shareable when the teacher presents it
      { id: 'c', type: 'lesson-plan' },     // teacher-only
      { type: 'quiz' },                     // no id
      { id: 'd' },                          // no type
      null,
      { id: 'e', type: 'word-sounds' },
    ];
    const safe = ST.studentSafeResources(history, TEACHER_ONLY);
    expect(safe.map((item) => item.id)).toEqual(['a', 'b', 'e']);
  });

  it('tolerates non-array input', () => {
    expect(ST.studentSafeResources(null, TEACHER_ONLY)).toEqual([]);
  });
});

describe('firebase adapter', () => {
  function makeOps(overrides = {}) {
    return {
      teacherOnlyTypes: TEACHER_ONLY,
      uploadAssets: vi.fn(async (items) => items),
      prepareResources: vi.fn((items) => ({
        resources: items, keptCount: items.length, originalCount: items.length,
        droppedCount: 0, byteLength: 1234, overLimit: false,
      })),
      write: vi.fn(async () => ({ ok: true })),
      policy: vi.fn(() => ({ studentAi: 'off' })),
      onTrimmed: vi.fn(),
      ...overrides,
    };
  }

  it('publishResources filters, uploads, prepares, and writes ONE payload with the policy', async () => {
    const ops = makeOps();
    const transport = ST.createFirebaseTransport(ops);
    const history = [
      { id: 'a', type: 'simplified' },
      { id: 'b', type: 'analysis' },
    ];
    const result = await transport.publishResources(history);
    expect(ops.uploadAssets).toHaveBeenCalledWith([
      { id: 'a', type: 'simplified' },
      { id: 'b', type: 'analysis' },
    ]);
    expect(ops.write).toHaveBeenCalledTimes(1);
    const payload = ops.write.mock.calls[0][0];
    expect(payload.resources).toHaveLength(2);
    expect(payload.aiPolicy).toEqual({ studentAi: 'off' });
    expect(result).toMatchObject({ kind: 'firebase', candidates: 2, kept: 2, dropped: 0, publishedIds: ['a', 'b'] });
    expect(ops.onTrimmed).not.toHaveBeenCalled();
  });

  it('acknowledges only retained ids after the resource write succeeds', async () => {
    let releaseWrite;
    const ops = makeOps({
      prepareResources: vi.fn(items => ({
        resources: items.slice(1), keptCount: 1, originalCount: 2,
        droppedCount: 1, byteLength: 321, overLimit: false,
      })),
      write: vi.fn(() => new Promise(resolve => { releaseWrite = resolve; })),
    });
    const pending = ST.createFirebaseTransport(ops).publishResources([
      { id: 'trimmed', type: 'simplified' },
      { id: 'kept', type: 'quiz' },
    ]);
    await Promise.resolve();
    await Promise.resolve();
    expect(ops.write).toHaveBeenCalledTimes(1);
    let settled = false;
    pending.then(() => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false);
    releaseWrite({ ok: true });
    await expect(pending).resolves.toMatchObject({ publishedIds: ['kept'] });
  });

  it('fires onTrimmed only when preparation dropped or over-limit', async () => {
    const ops = makeOps({
      prepareResources: vi.fn((items) => ({
        resources: items, keptCount: items.length, originalCount: items.length + 2,
        droppedCount: 2, byteLength: 9, overLimit: false,
      })),
    });
    const transport = ST.createFirebaseTransport(ops);
    await transport.publishResources([{ id: 'a', type: 'simplified' }]);
    expect(ops.onTrimmed).toHaveBeenCalledTimes(1);
  });

  it('propagates a rejected write (the privacy-gate path) instead of swallowing it', async () => {
    const ops = makeOps({ write: vi.fn(async () => { throw new Error('Tier-2 sync refused: x'); }) });
    const transport = ST.createFirebaseTransport(ops);
    await expect(transport.publishResources([{ id: 'a', type: 'simplified' }])).rejects.toThrow('Tier-2');
  });

  it('publishPolicy writes the policy alone', async () => {
    const ops = makeOps();
    const transport = ST.createFirebaseTransport(ops);
    await transport.publishPolicy();
    expect(ops.write).toHaveBeenCalledWith({ aiPolicy: { studentAi: 'off' } });
  });

  it('requires its ops explicitly', () => {
    expect(() => ST.createFirebaseTransport({})).toThrow(/requires ops\.uploadAssets/);
  });
});

describe('mailbox adapter (stage-1 shell)', () => {
  it('applies the shared candidate rule before delegating to the pack cycle', async () => {
    const runPackCycle = vi.fn(async (candidates) => ({ pushed: candidates.length }));
    const transport = ST.createMailboxTransport({ teacherOnlyTypes: TEACHER_ONLY, runPackCycle });
    const result = await transport.publishResources([
      { id: 'a', type: 'simplified' },
      { id: 'b', type: 'analysis' },
    ]);
    expect(runPackCycle).toHaveBeenCalledWith([
      { id: 'a', type: 'simplified' },
      { id: 'b', type: 'analysis' },
    ]);
    expect(result).toMatchObject({ kind: 'mailbox', candidates: 2, pushed: 2 });
  });

  it('declares policy as join-URL capability, not a doc write', async () => {
    const transport = ST.createMailboxTransport({ runPackCycle: async () => ({}) });
    const result = await transport.publishPolicy();
    expect(result.published).toBe(false);
    expect(transport.capabilities().policyChannel).toBe('join-url');
  });
});

describe('mailbox pack cycle (stage 2 — the algorithm, module-owned)', () => {
  function cycleOps(overrides = {}) {
    return {
      seen: {},
      fingerprint: vi.fn((item) => 'fp-' + item.id + '-' + (item.rev || 1)),
      packFingerprint: vi.fn((items) => items.map((i) => i.id + ':' + (i.rev || 1)).join('|')),
      pushItem: vi.fn(async () => {}),
      sendRemovals: vi.fn(async () => {}),
      hostPack: vi.fn(async () => ({ id: 'PK-1', k: 'key' })),
      publishPackRef: vi.fn(async () => {}),
      getHostedFp: vi.fn(() => null),
      setHostedFp: vi.fn(),
      trace: vi.fn(),
      onItemError: vi.fn(),
      onPackRefError: vi.fn(),
      now: () => 1234,
      ...overrides,
    };
  }
  const items = (list) => list.map((id) => ({ id, type: 'simplified' }));

  it('pushes only new/changed fingerprints and records them on success', async () => {
    const ops = cycleOps({ seen: { a: 'fp-a-1' } });
    const result = await ST.runMailboxPackCycle(items(['a', 'b']), ops);
    expect(ops.pushItem).toHaveBeenCalledTimes(1);
    expect(ops.pushItem.mock.calls[0][0].id).toBe('b');
    expect(ops.seen.b).toBe('fp-b-1');
    expect(result).toMatchObject({ pushed: 1, failed: 0, removed: 0 });
  });

  it('isolates a failed push: others continue, fingerprint NOT recorded so it retries', async () => {
    const ops = cycleOps({
      pushItem: vi.fn(async (item) => { if (item.id === 'a') throw new Error('too big'); }),
    });
    const result = await ST.runMailboxPackCycle(items(['a', 'b']), ops);
    expect(result).toMatchObject({ pushed: 1, failed: 1 });
    expect(ops.seen.a).toBeUndefined(); // retried next cycle
    expect(ops.seen.b).toBe('fp-b-1');
    expect(ops.onItemError).toHaveBeenCalledTimes(1);
  });

  it('detects removals, prunes them from seen, and sends ONE removal message', async () => {
    const ops = cycleOps({ seen: { gone: 'fp-gone-1', a: 'fp-a-1' } });
    const result = await ST.runMailboxPackCycle(items(['a']), ops);
    expect(ops.sendRemovals).toHaveBeenCalledWith(['gone']);
    expect(ops.seen.gone).toBeUndefined();
    expect(result.removed).toBe(1);
  });

  it('re-hosts the pack only when the pack fingerprint changes', async () => {
    const ops = cycleOps({ getHostedFp: vi.fn(() => 'a:1|b:1') });
    await ST.runMailboxPackCycle(items(['a', 'b']), ops);
    expect(ops.hostPack).not.toHaveBeenCalled();
    const ops2 = cycleOps({ getHostedFp: vi.fn(() => 'stale') });
    const result = await ST.runMailboxPackCycle(items(['a', 'b']), ops2);
    expect(ops2.hostPack).toHaveBeenCalledTimes(1);
    expect(ops2.setHostedFp).toHaveBeenCalledWith('a:1|b:1');
    expect(ops2.publishPackRef).toHaveBeenCalledWith({ id: 'PK-1', k: 'key', n: 2, t: 1234 });
    expect(result.hosted).toBe(true);
  });

  it('a failed hostPack leaves the fingerprint unset (re-hosts next cycle)', async () => {
    const ops = cycleOps({ hostPack: vi.fn(async () => { throw new Error('putpack 500'); }) });
    await expect(ST.runMailboxPackCycle(items(['a']), ops)).rejects.toThrow('putpack 500');
    expect(ops.setHostedFp).not.toHaveBeenCalled();
  });

  it('a failed packRef publish stays retryable and routes the error to its handler', async () => {
    const ops = cycleOps({ publishPackRef: vi.fn(async () => { throw new Error('firestore down'); }) });
    const result = await ST.runMailboxPackCycle(items(['a']), ops);
    expect(ops.setHostedFp).not.toHaveBeenCalled();
    expect(ops.onPackRefError).toHaveBeenCalledTimes(1);
    expect(result.hosted).toBe(true);
  });


  it('retains removals until the send succeeds so a later cycle retries', async () => {
    const ops = cycleOps({ seen: { gone: 'old' }, sendRemovals: vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined) });
    await expect(ST.runMailboxPackCycle([], ops)).rejects.toThrow('offline');
    expect(ops.seen.gone).toBe('old');
    await ST.runMailboxPackCycle([], ops);
    expect(ops.sendRemovals).toHaveBeenCalledTimes(2);
    expect(ops.seen.gone).toBeUndefined();
  });

  it.each(['fingerprint', 'pushItem'])('isolates a synchronous %s failure and continues delivery', async operation => {
    const ops = cycleOps();
    ops[operation] = vi.fn(item => { if (item.id === 'a') throw new Error('bad resource'); return operation === 'fingerprint' ? 'fp-b-1' : undefined; });
    const result = await ST.runMailboxPackCycle(items(['a', 'b']), ops);
    expect(result).toMatchObject({ pushed: 1, failed: 1 });
    expect(ops.seen.a).toBeUndefined();
    expect(ops.seen.b).toBe('fp-b-1');
    expect(ops.onItemError).toHaveBeenCalledTimes(1);
  });

  it('replaces a formerly nonempty hosted pack with an empty assignment', async () => {
    const ops = cycleOps({ seen: { gone: 'old' }, getHostedFp: () => 'old-pack' });
    await ST.runMailboxPackCycle([], ops);
    expect(ops.hostPack).toHaveBeenCalledWith([]);
    expect(ops.publishPackRef).toHaveBeenCalledWith(expect.objectContaining({ n: 0 }));
    expect(ops.setHostedFp).toHaveBeenCalledWith('');
    const untouched = cycleOps();
    await ST.runMailboxPackCycle([], untouched);
    expect(untouched.hostPack).not.toHaveBeenCalled();
  });

  it('retries an unchanged hosted pack after its reference write fails', async () => {
    let fingerprint = null;
    const ops = cycleOps({ getHostedFp: () => fingerprint, setHostedFp: value => { fingerprint = value; }, publishPackRef: vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined) });
    await ST.runMailboxPackCycle(items(['a']), ops);
    expect(fingerprint).toBeNull();
    await ST.runMailboxPackCycle(items(['a']), ops);
    expect(ops.publishPackRef).toHaveBeenCalledTimes(2);
    expect(ops.pushItem).toHaveBeenCalledTimes(1);
    expect(fingerprint).toBe('a:1');
  });

  it('traces one pack-cycle event only when something actually happened', async () => {
    const quietOps = cycleOps({ seen: { a: 'fp-a-1' }, getHostedFp: vi.fn(() => 'a:1') });
    await ST.runMailboxPackCycle(items(['a']), quietOps);
    expect(quietOps.trace).not.toHaveBeenCalled();
    const busyOps = cycleOps();
    await ST.runMailboxPackCycle(items(['a']), busyOps);
    expect(busyOps.trace).toHaveBeenCalledWith('mailbox:pack-cycle', expect.objectContaining({ pushed: 1 }));
  });

  it('the granular mailbox adapter filters candidates then runs the module cycle', async () => {
    const ops = cycleOps({ teacherOnlyTypes: TEACHER_ONLY });
    const transport = ST.createMailboxTransport(ops);
    const result = await transport.publishResources([
      { id: 'a', type: 'simplified' },
      { id: 'b', type: 'analysis' },
    ]);
    expect(ops.pushItem).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ kind: 'mailbox', candidates: 2, pushed: 2 });
  });
});

describe('followResource (stage 3 — class-follow pointer)', () => {
  it('writes the pointer and traces a follow event', async () => {
    const write = vi.fn(async () => {});
    const trace = vi.fn();
    const ok = await ST.followResource({ id: 'res-1', type: 'simplified' }, { write, trace });
    expect(ok).toBe(true);
    expect(write).toHaveBeenCalledTimes(1);
    expect(trace).toHaveBeenCalledWith('sync:follow', { id: 'res-1', type: 'simplified' });
  });

  it('refuses malformed input without touching the write op', async () => {
    const write = vi.fn();
    expect(await ST.followResource(null, { write })).toBe(false);
    expect(await ST.followResource({ type: 'simplified' }, { write })).toBe(false);
    expect(write).not.toHaveBeenCalled();
  });
});

describe('_alloFollowResourceLive delivery acknowledgement', () => {
  it('preserves immediate booleans for legacy callers while awaitDelivery waits for the write', async () => {
    let releaseWrite;
    const updateDoc = vi.fn(() => new Promise(resolve => { releaseWrite = resolve; }));
    const { follow } = makeLiveFollowHarness({ updateDoc });
    expect(follow({ id: 'resource-1', type: 'quiz' })).toBe(true);
    const awaited = follow({ id: 'resource-2', type: 'quiz' }, { awaitDelivery: true });
    let settled = false;
    awaited.then(() => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false);
    releaseWrite();
    await expect(awaited).resolves.toBe(true);
  });

  it('resolves false when an awaited pointer write fails', async () => {
    const { follow, deps } = makeLiveFollowHarness({ updateDoc: vi.fn(async () => { throw new Error('write refused'); }) });
    await expect(follow({ id: 'resource-1', type: 'quiz' }, { awaitDelivery: true })).resolves.toBe(false);
    expect(deps.warnLog).toHaveBeenCalledWith('Live follow command failed:', 'write refused');
  });

  it('awaits the canonical mailbox push when no shared pointer is available', async () => {
    const _mbPushOneResource = vi.fn(async () => ({ rtcCount: 1 }));
    const { follow } = makeLiveFollowHarness({ activeSessionCode: null, mbLive: { code: 'MAIL-1' }, _mbPushOneResource });
    await expect(follow({ id: 'resource-1', type: 'quiz' }, { awaitDelivery: true })).resolves.toBe(true);
    expect(_mbPushOneResource).toHaveBeenCalledWith(expect.objectContaining({ id: 'resource-1' }), { open: true, quiet: true });
  });
});

describe('ANTI wiring pins', () => {
  it('all class-follow sites route through the ONE live-follow helper', () => {
    // 6 call sites (reading set, reading book, manipulative, restore-view tail, navigation, confirmed saved-plan presentation)
    // all continue through the same helper.
    // — the raw currentResourceId write survives ONLY inside the helper.
    // Five of the eight class-follow surfaces moved into misc_handlers with
    // the resource-open handlers (2026-08-22); the total contract is unchanged.
    const handlers = fs.readFileSync(path.resolve(process.cwd(), 'misc_handlers_source.jsx'), 'utf8');
    const calls = anti.split('_alloFollowResourceLive(').length - 1
      + handlers.split('_alloFollowResourceLive(').length - 1;
    expect(calls).toBe(8);
    expect(anti.split('currentResourceId: item.id').length - 1).toBe(1);
    expect(anti).toContain('const _alloFollowResourceLive = (item, options = {}) => {');
    expect(anti).toContain('options.awaitDelivery === true');
    expect(anti).toContain('await _alloFollowResourceLive(after.resource, { awaitDelivery: true })');
    expect(anti).toContain('firebasePublishedResourcesRef.current.sessionKey === publishSessionKey');
    expect(anti).toContain('enqueueLiveSessionResourcePublish({');
    expect(anti).toContain('publishedIds: result.publishedIds');
    expect(anti).toContain('firebasePublication.sessionKey === expectedFirebaseSessionKey');
    expect(anti).toContain('firebasePublication.fingerprints?.[resource.id] === fingerprint');
    expect(anti).toContain("publishedSessionResources.some(item => item && String(item.id || '') === String(resource.id || ''))");
  });

  it('the inline sync fallbacks are retired: transport-unavailable is surfaced, not duplicated', () => {
    expect(anti.includes("_alloSessionSyncTrace('sync:transport-unavailable', { channel: 'firebase', sessionPath:")).toBe(true);
    expect(anti.includes("traceSession('sync:transport-unavailable', { channel: 'mailbox' })")).toBe(true);
    // The retired inline bodies must be gone.
    expect(anti).not.toContain('// Module-not-loaded fallback: identical behavior, inline.');
    expect(anti).not.toContain('const seen = mbSentPacksRef.current;');
  });
  it('the Firebase resources effect routes through SessionTransport (fallback retired in stage 3)', () => {
    expect(anti).toContain('ST.createFirebaseTransport({');
    // The old unfiltered candidate rule and the inline fallback are both gone.
    expect(anti).not.toContain('const resourcesToUpload = history.filter(h => h.id);');
    expect(anti).not.toContain('const resourcesToUpload = _alloStudentSafeResources(history);');
  });

  it('the Live Dock surfaces session health (roster + transport + last sync) with a diagnostics deep link', () => {
    expect(anti).toContain("window.__alloOpenDiagnosticsLog('session')"); // deep link
    expect(liveDock).toMatch(/rosterCount \+ ' ' \+ \(rosterCount === 1/);
    expect(liveDock).toContain("/REFUSED|write-failed|transport-unavailable/.test(ev.event)");
    expect(liveDock.includes("problemIsCurrent ? '⚠️' : lastSync ? '🟢' : '○'")).toBe(true);
  });

  it('the mailbox pack effect routes through the module-owned cycle (stage 2)', () => {
    expect(anti).toContain('_stMb.createMailboxTransport({');
    expect(anti).toContain('typeof _stMb.runMailboxPackCycle === ');
    // Host supplies primitives, not semantics.
    expect(anti).toContain('packFingerprint: (items) =>');
    expect(anti).toContain('hostPack: async (items) =>');
  });

  it('every pack/push candidate site uses the shared rule', () => {
    const count = anti.split('_alloStudentSafeResources(history)').length - 1;
    expect(count).toBeGreaterThanOrEqual(6);
    expect(anti).not.toContain('!TEACHER_ONLY_TYPES.includes(h.type));');
  });
});


describe('student activity projection at real delivery boundaries', () => {
  it('allows discussion and jigsaw content while excluding teacher ideas, keys, guides and private metadata', () => {
    const original = mixedActivities(); const snapshot = JSON.stringify(original);
    expectLearnerActivities(ST.studentSafeResources([original], ['brainstorm'], projectStudentActivityResource));
    expect(JSON.stringify(original)).toBe(snapshot);
  });

  it('fails closed without the activity projector and for idea-only resources', () => {
    expect(ST.studentSafeResources([mixedActivities()], TEACHER_ONLY)).toEqual([]);
    const ideas = { id: 'ideas', type: 'brainstorm', data: [{ kind: 'idea', title: 'Teacher idea' }] };
    expect(ST.studentSafeResources([ideas], TEACHER_ONLY, projectStudentActivityResource)).toEqual([]);
  });

  it('rejects projector results that lose identity or the explicit student projection marker', () => {
    for (const projected of [null, { id: 'wrong', type: 'brainstorm', studentProjection: true },
      { id: 'activities-a', type: 'quiz', studentProjection: true },
      { id: 'activities-a', type: 'brainstorm', data: [] }]) {
      expect(ST.studentSafeResources([mixedActivities()], TEACHER_ONLY, () => projected)).toEqual([]);
    }
  });

  it('uses the same actual projection in the host module path and inline fallback', () => {
    const activity = mixedActivities();
    const moduleSafe = makeStudentRule()([activity]);
    const fallbackSafe = makeStudentRule({ module: false })([activity]);
    expectLearnerActivities(moduleSafe); expectLearnerActivities(fallbackSafe);
    expect(fallbackSafe).toEqual(moduleSafe);
  });

  it('keeps the host fallback closed while the activity projector is unavailable', () => {
    expect(makeStudentRule({ module: false, projector: null })([mixedActivities()])).toEqual([]);
    expect(makeStudentRule({ projector: null })([mixedActivities()])).toEqual([]);
    expect(makeStudentRule({ module: false })([{ id: 'ideas', type: 'brainstorm', data: [{ kind: 'idea' }] }])).toEqual([]);
  });

  it('sends only the projection to Firebase asset preparation and the outgoing payload', async () => {
    const uploadAssets = vi.fn(async items => items);
    const prepareResources = vi.fn(items => ({ resources: items, keptCount: items.length, droppedCount: 0, byteLength: 10 }));
    const write = vi.fn(async () => {});
    const transport = ST.createFirebaseTransport({ teacherOnlyTypes: ['brainstorm', 'lesson-plan'], projectStudentActivityResource, uploadAssets, prepareResources, write });
    await transport.publishResources([mixedActivities(), { id: 'lesson', type: 'lesson-plan', data: { guide: 'PRIVATE' } }]);
    expectLearnerActivities(uploadAssets.mock.calls[0][0]);
    expectLearnerActivities(prepareResources.mock.calls[0][0]);
    expectLearnerActivities(write.mock.calls[0][0].resources);
  });

  it('sends only the projection through both mailbox adapter modes', async () => {
    const runPackCycle = vi.fn(async () => ({}));
    await ST.createMailboxTransport({ teacherOnlyTypes: ['brainstorm'], projectStudentActivityResource, runPackCycle }).publishResources([mixedActivities()]);
    expectLearnerActivities(runPackCycle.mock.calls[0][0]);
    const pushItem = vi.fn(async () => {}); const hostPack = vi.fn(async () => ({ id: 'pack' }));
    await ST.createMailboxTransport({ teacherOnlyTypes: ['brainstorm'], projectStudentActivityResource,
      fingerprint: item => JSON.stringify(item), pushItem, hostPack, packFingerprint: items => JSON.stringify(items)
    }).publishResources([mixedActivities()]);
    expectLearnerActivities([pushItem.mock.calls[0][0]]);
    expectLearnerActivities(hostPack.mock.calls[0][0]);
  });

  it('projects a live mailbox follow before sending content', async () => {
    const { follow, deps } = makeLiveFollowHarness({ activeSessionCode: null, mbLive: { code: 'MAIL-1' } });
    await expect(follow(mixedActivities(), { awaitDelivery: true })).resolves.toBe(true);
    expectLearnerActivities([deps._mbPushOneResource.mock.calls[0][0]]);
  });

  it('projects an immediate mailbox follow and blocks idea-only follow commands', () => {
    const { follow, deps } = makeLiveFollowHarness({ activeSessionCode: null, mbLive: { code: 'MAIL-1' } });
    expect(follow(mixedActivities())).toBe(true);
    expectLearnerActivities([deps.pushResourceToMailbox.mock.calls[0][0]]);
    deps.pushResourceToMailbox.mockClear();
    expect(follow({ id: 'ideas', type: 'brainstorm', data: [{ kind: 'idea', title: 'Private idea' }] })).toBe(false);
    expect(deps.pushResourceToMailbox).not.toHaveBeenCalled();
  });

  it('writes a Firebase follow pointer only for projected learner activities', async () => {
    const { follow, deps } = makeLiveFollowHarness();
    await expect(follow(mixedActivities(), { awaitDelivery: true })).resolves.toBe(true);
    expect(deps.updateDoc).toHaveBeenCalledWith({ path: 'session' }, { currentResourceId: 'activities-a' });
    deps.updateDoc.mockClear();
    expect(follow({ id: 'ideas', type: 'brainstorm', data: [{ kind: 'idea' }] })).toBe(false);
    expect(deps.updateDoc).not.toHaveBeenCalled();
  });

  it('supplies the real projection to both root transport adapters', () => {
    for (const marker of ['ST.createFirebaseTransport({', '_stMb.createMailboxTransport({']) {
      const begin = anti.indexOf(marker);
      expect(begin).toBeGreaterThan(-1);
      expect(anti.slice(begin, begin + 1200)).toContain('projectStudentActivityResource: _alloProjectStudentActivityResource');
    }
  });
});
