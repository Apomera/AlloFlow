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

beforeAll(() => {
  global.window = global.window || {};
  // eslint-disable-next-line no-new-func
  new Function('window', fs.readFileSync(path.join(ROOT, 'session_transport_module.js'), 'utf8'))(global.window);
  ST = global.window.AlloModules.SessionTransport;
});

const TEACHER_ONLY = ['lesson-plan', 'analysis', 'udl-advice', 'persona-session'];

describe('studentSafeResources (the one candidate rule)', () => {
  it('keeps id-bearing student types, drops teacher-only and malformed items', () => {
    const history = [
      { id: 'a', type: 'simplified' },
      { id: 'b', type: 'analysis' },        // teacher-only
      { id: 'c', type: 'lesson-plan' },     // teacher-only
      { type: 'quiz' },                     // no id
      { id: 'd' },                          // no type
      null,
      { id: 'e', type: 'word-sounds' },
    ];
    const safe = ST.studentSafeResources(history, TEACHER_ONLY);
    expect(safe.map((item) => item.id)).toEqual(['a', 'e']);
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
    expect(ops.uploadAssets).toHaveBeenCalledWith([{ id: 'a', type: 'simplified' }]);
    expect(ops.write).toHaveBeenCalledTimes(1);
    const payload = ops.write.mock.calls[0][0];
    expect(payload.resources).toHaveLength(1);
    expect(payload.aiPolicy).toEqual({ studentAi: 'off' });
    expect(result).toMatchObject({ kind: 'firebase', candidates: 1, kept: 1, dropped: 0 });
    expect(ops.onTrimmed).not.toHaveBeenCalled();
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
    expect(runPackCycle).toHaveBeenCalledWith([{ id: 'a', type: 'simplified' }]);
    expect(result).toMatchObject({ kind: 'mailbox', candidates: 1, pushed: 1 });
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

  it('a failed packRef publish is advisory: hosted fp records, error routed to handler', async () => {
    const ops = cycleOps({ publishPackRef: vi.fn(async () => { throw new Error('firestore down'); }) });
    const result = await ST.runMailboxPackCycle(items(['a']), ops);
    expect(ops.setHostedFp).toHaveBeenCalled();
    expect(ops.onPackRefError).toHaveBeenCalledTimes(1);
    expect(result.hosted).toBe(true);
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
    expect(ops.pushItem).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ kind: 'mailbox', candidates: 1, pushed: 1 });
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

describe('ANTI wiring pins', () => {
  it('all class-follow sites route through the ONE live-follow helper', () => {
    // 4 call sites (readingBook, manipulative, restore-view tail, navigation)
    // — the raw currentResourceId write survives ONLY inside the helper.
    const calls = anti.split('_alloFollowResourceLive(').length - 1;
    expect(calls).toBe(4);
    expect(anti.split('currentResourceId: item.id').length - 1).toBe(1);
    expect(anti).toContain('const _alloFollowResourceLive = (item, options = {}) => {');
  });

  it('the inline sync fallbacks are retired: transport-unavailable is surfaced, not duplicated', () => {
    expect(anti).toContain("_alloSessionSyncTrace('sync:transport-unavailable', { channel: 'firebase' })");
    expect(anti).toContain("_alloSessionSyncTrace('sync:transport-unavailable', { channel: 'mailbox' })");
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
    expect(anti).toMatch(/rosterCount \+ ' ' \+ \(rosterCount === 1/);
    expect(anti).toContain("/REFUSED|write-failed|transport-unavailable/.test(ev.event)");
    expect(anti).toContain("problemIsCurrent ? '⚠️' : '🟢'");
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
