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

describe('ANTI wiring pins', () => {
  it('the Firebase resources effect routes through SessionTransport with an identical inline fallback', () => {
    expect(anti).toContain('ST.createFirebaseTransport({');
    expect(anti).toContain('const resourcesToUpload = _alloStudentSafeResources(history);');
    // The old unfiltered candidate rule must be gone.
    expect(anti).not.toContain('const resourcesToUpload = history.filter(h => h.id);');
  });

  it('every pack/push candidate site uses the shared rule', () => {
    const count = anti.split('_alloStudentSafeResources(history)').length - 1;
    expect(count).toBeGreaterThanOrEqual(6);
    expect(anti).not.toContain('!TEACHER_ONLY_TYPES.includes(h.type));');
  });
});
