// Live Lesson Board over the desktop LAN share: students write only their own
// action slot (escapeRoomState.teamProgress.All.boardActions.<uid>, and
// connectedActions.<uid> for Connected Escape). The share server used to reject
// every such write as "not this device's own field", so answers never reached
// the teacher. These tests drive the real runtime over HTTP (see the harness):
// the teacher seeds the session privately, students PATCH through the LAN
// share with their own scoped tokens, and the stored document is read back.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startLanHarness } from './helpers/desktop_lan_harness.js';

const ATTEMPT = 'attempt_42';
let lan;
let U;

function lessonBoard({ phase = 'answer', turn = 2, retryRound = 0, isPaused = false, isActive = true, mode = 'lesson-board' } = {}) {
  return {
    mode: 'sync',
    roster: {
      [U.A]: { name: 'A', status: 'active' },
      [U.B]: { name: 'B', status: 'active' },
      [U.C]: { name: 'C', status: 'active' },
    },
    escapeRoomState: {
      mode,
      isActive,
      isPaused,
      attemptId: ATTEMPT,
      // C is on the roster but has not joined; D joined but is not on the roster.
      teams: { [U.A]: 'All', [U.B]: 'All', [U.D]: 'All' },
      teamProgress: {
        All: {
          boardRuns: { [ATTEMPT]: { turn, steps: { ['t' + turn]: { phase, targetId: 'loc1', retryRound } } } },
          boardActions: {},
          connectedActions: {},
        },
      },
      steps: { s1: { done: false } },
    },
  };
}

const answer = (extra = {}) => ({ attemptId: ATTEMPT, turn: 2, requestId: 'req_1', kind: 'answer', targetId: 'loc1', value: '0,2', ...extra });
const slot = (name, kind = 'boardActions') => 'escapeRoomState.teamProgress.All.' + kind + '.' + U[name];
const patch = (name, updates) => lan.studentPatch(name, updates);
const actions = async (kind = 'boardActions') => (await lan.stored()).escapeRoomState.teamProgress.All[kind];

beforeAll(async () => {
  lan = await startLanHarness({ code: 'LBOARD1', students: ['A', 'B', 'C', 'D'] });
  U = lan.uids;
});

afterAll(async () => { if (lan) await lan.stop(); });

describe('LAN share: Lesson Board action slots', () => {
  beforeEach(async () => { await lan.seed(lessonBoard()); });

  it('accepts a student answer in their own slot and stores it for the teacher', async () => {
    const result = await patch('A', { [slot('A')]: answer() });
    expect(result.status, result.body.error).toBe(200);
    expect((await actions())[U.A]).toEqual(answer());
  });

  it('accepts a vote during the choose phase', async () => {
    await lan.seed(lessonBoard({ phase: 'choose' }));
    const result = await patch('A', { [slot('A')]: answer({ kind: 'vote', value: '' }) });
    expect(result.status, result.body.error).toBe(200);
  });

  it("rejects writing another student's slot", async () => {
    const result = await patch('A', { [slot('B')]: answer() });
    expect(result.status).toBe(403);
    expect(await actions()).toEqual({});
  });

  it('rejects a stale attempt, a stale turn, and the wrong phase', async () => {
    for (const stale of [answer({ attemptId: 'attempt_41' }), answer({ turn: 1 }), answer({ turn: 3 }), answer({ kind: 'vote', value: '' })]) {
      const result = await patch('A', { [slot('A')]: stale });
      expect(result.status, JSON.stringify(stale)).toBe(403);
    }
    expect(await actions()).toEqual({});
  });

  it('requires the retry-round prefix on the request id', async () => {
    await lan.seed(lessonBoard({ retryRound: 2 }));
    expect((await patch('A', { [slot('A')]: answer({ requestId: 'req_1' }) })).status).toBe(403);
    expect((await patch('A', { [slot('A')]: answer({ requestId: 'r1_req' }) })).status).toBe(403);
    const ok = await patch('A', { [slot('A')]: answer({ requestId: 'r2_req' }) });
    expect(ok.status, ok.body.error).toBe(200);
  });

  it('rejects actions while the board is paused or not active', async () => {
    await lan.seed(lessonBoard({ isPaused: true }));
    expect((await patch('A', { [slot('A')]: answer() })).status).toBe(403);
    await lan.seed(lessonBoard({ isActive: false }));
    expect((await patch('A', { [slot('A')]: answer() })).status).toBe(403);
    expect(await actions()).toEqual({});
  });

  it('rejects a student who has not joined team All, or is not on the roster', async () => {
    expect((await patch('C', { [slot('C')]: answer() })).status).toBe(403);
    expect((await patch('D', { [slot('D')]: answer() })).status).toBe(403);
    expect(await actions()).toEqual({});
  });

  it('rejects oversized or malformed actions', async () => {
    const bad = [
      answer({ value: '1,'.repeat(13) }),
      answer({ value: 'B' }),
      answer({ requestId: 'x'.repeat(129) }),
      answer({ targetId: 'loc2' }),
      { ...answer(), extra: 'x' },
      'answer',
    ];
    for (const value of bad) {
      const result = await patch('A', { [slot('A')]: value });
      expect(result.status, JSON.stringify(value)).toBe(403);
    }
    expect(await actions()).toEqual({});
  });

  it('still lets a rostered student join the board team', async () => {
    const result = await patch('C', { ['escapeRoomState.teams.' + U.C]: 'All' });
    expect(result.status, result.body.error).toBe(200);
    expect((await lan.stored()).escapeRoomState.teams[U.C]).toBe('All');
  });

  it('still rejects world progress and other teamProgress fields', async () => {
    const attempts = [
      { 'escapeRoomState.steps': {} },
      { 'escapeRoomState.run': { turn: 9 } },
      { ['roster.' + U.A + '.lastSeen']: 1, 'escapeRoomState.teamProgress.All.boardRuns': answer() },
      { ['roster.' + U.A + '.lastSeen']: 1, 'escapeRoomState.teamProgress.All.boardActions': { [U.A]: answer() } },
      { ['roster.' + U.A + '.lastSeen']: 1, [slot('A') + '.value']: '0' },
      { [slot('A', 'connectedActions')]: answer() },
    ];
    for (const updates of attempts) {
      const result = await patch('A', updates);
      expect(result.status, JSON.stringify(updates)).toBe(403);
    }
    const data = await lan.stored();
    expect(data.escapeRoomState.steps).toEqual({ s1: { done: false } });
    expect(data.escapeRoomState.run).toBeUndefined();
    expect(data.escapeRoomState.teamProgress.All.boardRuns[ATTEMPT].turn).toBe(2);
    expect(data.escapeRoomState.teamProgress.All.boardActions).toEqual({});
  });

  it('rejects board actions when the session is not a live lesson board', async () => {
    await lan.seed(lessonBoard({ mode: 'escape-room' }));
    expect((await patch('A', { [slot('A')]: answer() })).status).toBe(403);
  });
});

describe('LAN share: Connected Escape action slots', () => {
  const connected = (extra = {}) => ({ attemptId: ATTEMPT, requestId: 'req_7', nodeId: 'door-1', kind: 'interact', value: '3,1', ...extra });
  beforeEach(async () => { await lan.seed(lessonBoard({ mode: 'connected-room' })); });

  it("accepts a valid action in the student's own slot", async () => {
    const result = await patch('A', { [slot('A', 'connectedActions')]: connected() });
    expect(result.status, result.body.error).toBe(200);
    expect((await actions('connectedActions'))[U.A]).toEqual(connected());
  });

  it('rejects a stale attempt, a bad kind, another slot, or a paused room', async () => {
    expect((await patch('A', { [slot('A', 'connectedActions')]: connected({ attemptId: 'old' }) })).status).toBe(403);
    expect((await patch('A', { [slot('A', 'connectedActions')]: connected({ kind: 'solve' }) })).status).toBe(403);
    expect((await patch('A', { [slot('B', 'connectedActions')]: connected() })).status).toBe(403);
    expect((await patch('A', { [slot('A')]: answer() })).status).toBe(403);
    await lan.seed(lessonBoard({ mode: 'connected-room', isPaused: true }));
    expect((await patch('A', { [slot('A', 'connectedActions')]: connected() })).status).toBe(403);
    expect(await actions('connectedActions')).toEqual({});
  });
});
