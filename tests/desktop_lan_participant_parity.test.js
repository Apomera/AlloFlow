// Desktop LAN share parity with the Class Mailbox (apps_script/session_mailbox
// Code.gs participantCanPatchSession / projectSessionForParticipant) and
// firestore.rules, driven through the real runtime over HTTP:
//   1. Concept Quest own-slot writes (questVotes/VoteTurns/Actions/Roles)
//   2. escapeRoomState.teams join rules per mode
//   3. server-assigned participant identity (no self-declared uid)
//   4. participant-view redaction of per-student game records
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { startLanHarness } from './helpers/desktop_lan_harness.js';

const CODE = 'PARITY1';
let lan;
let U;
const patch = (name, updates) => lan.studentPatch(name, updates);
const ALL = 'escapeRoomState.teamProgress.All.';

beforeAll(async () => {
  lan = await startLanHarness({ code: CODE, students: ['A', 'B', 'C'] });
  U = lan.uids;
});
afterAll(async () => { if (lan) await lan.stop(); });

function roster(...names) {
  return Object.fromEntries(names.map((name) => [U[name], { name, status: 'active' }]));
}

describe('1. Concept Quest over LAN', () => {
  const quest = ({ phase = 'explore', actionSchema = 1, isPaused = false, isActive = true } = {}) => ({
    mode: 'sync',
    roster: roster('A', 'B'),
    escapeRoomState: {
      mode: 'concept-quest', isActive, isPaused, teams: { [U.A]: 'All', [U.B]: 'All' },
      conceptQuest: { actionSchema, phase, turnKey: 'turn_5' },
      teamProgress: { All: { questVotes: {}, questVoteTurns: {}, questActions: {}, questRoles: {} } },
    },
  });
  const vote = (name, room = 'room-3', turn = 'turn_5') => ({ [ALL + 'questVotes.' + U[name]]: room, [ALL + 'questVoteTurns.' + U[name]]: turn });
  const action = (extra = {}) => ({ abilityId: 'analyze', roleId: 'analyst', answerIndex: 2, submittedAt: 1700000000000, turnKey: 'turn_5', ...extra });
  const act = (name, value) => ({ [ALL + 'questActions.' + U[name]]: value });

  it('accepts a turn-scoped vote with its turn key and stores both', async () => {
    await lan.seed(quest());
    const result = await patch('A', vote('A'));
    expect(result.status, result.body.error).toBe(200);
    const progress = (await lan.stored()).escapeRoomState.teamProgress.All;
    expect(progress.questVotes[U.A]).toBe('room-3');
    expect(progress.questVoteTurns[U.A]).toBe('turn_5');
  });

  it('rejects turn-scoped votes without the current turn key, in the wrong phase, paused, or out of range', async () => {
    await lan.seed(quest());
    expect((await patch('A', { [ALL + 'questVotes.' + U.A]: 'room-3' })).status).toBe(403);
    expect((await patch('A', vote('A', 'room-3', 'turn_4'))).status).toBe(403);
    expect((await patch('A', vote('A', 'room-9'))).status).toBe(403);
    expect((await patch('A', { [ALL + 'questVoteTurns.' + U.A]: 'turn_4' })).status).toBe(403);
    await lan.seed(quest({ phase: 'battle' }));
    expect((await patch('A', vote('A'))).status).toBe(403);
    await lan.seed(quest({ isPaused: true }));
    expect((await patch('A', vote('A'))).status).toBe(403);
    expect((await lan.stored()).escapeRoomState.teamProgress.All.questVotes).toEqual({});
  });

  it("rejects another student's quest slots and nested quest paths", async () => {
    await lan.seed(quest());
    expect((await patch('A', vote('B'))).status).toBe(403);
    const own = { ['roster.' + U.A + '.lastSeen']: 1 };
    expect((await patch('A', { ...own, [ALL + 'questRoles.' + U.A + '.x']: 'analyst' })).status).toBe(403);
    expect((await patch('A', { ...own, [ALL + 'questRoles']: { [U.A]: 'analyst' } })).status).toBe(403);
    expect((await lan.stored()).escapeRoomState.teamProgress.All.questRoles).toEqual({});
  });

  it('accepts a battle action for the current turn and rejects stale or malformed ones', async () => {
    await lan.seed(quest({ phase: 'battle' }));
    for (const bad of [
      action({ turnKey: 'turn_4' }),
      action({ answerIndex: 6 }),
      action({ abilityId: 'cheat' }),
      action({ extra: 1 }),
      action({ supportId: 'guard', supportTargetUid: U.A }),
      action({ supportId: '', supportTargetUid: '' }),
      'analyze',
    ]) {
      expect((await patch('A', act('A', bad))).status, JSON.stringify(bad)).toBe(403);
    }
    expect((await lan.stored()).escapeRoomState.teamProgress.All.questActions).toEqual({});
    const ok = await patch('A', act('A', action({ supportId: 'guard', supportTargetUid: U.B })));
    expect(ok.status, ok.body.error).toBe(200);
    expect((await lan.stored()).escapeRoomState.teamProgress.All.questActions[U.A].supportTargetUid).toBe(U.B);
  });

  it('rejects a battle action outside the battle phase', async () => {
    await lan.seed(quest({ phase: 'explore' }));
    expect((await patch('A', act('A', action()))).status).toBe(403);
  });

  it('accepts a valid role and rejects an unknown one', async () => {
    await lan.seed(quest());
    expect((await patch('A', { [ALL + 'questRoles.' + U.A]: 'wizard' })).status).toBe(403);
    const ok = await patch('A', { [ALL + 'questRoles.' + U.A]: 'connector' });
    expect(ok.status, ok.body.error).toBe(200);
  });

  it('keeps legacy (unscoped) quests working without a turn key, like the Mailbox', async () => {
    await lan.seed(quest({ actionSchema: 0, phase: 'battle' }));
    const voteOnly = await patch('A', { [ALL + 'questVotes.' + U.A]: 'room-2' });
    expect(voteOnly.status, voteOnly.body.error).toBe(200);
    const legacyAction = await patch('A', act('A', action({ turnKey: undefined })));
    expect(legacyAction.status, legacyAction.body.error).toBe(200);
    expect((await patch('A', { [ALL + 'questVoteTurns.' + U.A]: 'turn_5' })).status).toBe(403);
  });

  it('still rejects shared team progress writes', async () => {
    await lan.seed(quest({ actionSchema: 0 }));
    const own = { ['roster.' + U.A + '.lastSeen']: 1 };
    expect((await patch('A', { ...own, [ALL + 'questBoss']: { hp: 0 } })).status).toBe(403);
    expect((await patch('A', { ...own, 'escapeRoomState.teamProgress.Red.solvedPuzzles': ['p1'] })).status).toBe(403);
  });
});

describe('2. LAN join parity for escapeRoomState.teams', () => {
  const session = (mode, { isActive = true, rosterNames = ['A', 'B'] } = {}) => ({
    mode: 'sync',
    roster: roster(...rosterNames),
    escapeRoomState: { mode, isActive, isPaused: false, teams: {}, teamProgress: { All: {} } },
  });
  const join = (name, value) => patch(name, { ['escapeRoomState.teams.' + U[name]]: value });
  const teams = async () => (await lan.stored()).escapeRoomState.teams;

  for (const mode of ['lesson-board', 'connected-room']) {
    it(`${mode}: only "All", only while active, only for rostered students`, async () => {
      await lan.seed(session(mode));
      expect((await join('A', 'Red')).status).toBe(403);
      expect((await join('A', { __op: 'deleteField' })).status).toBe(403);
      expect((await join('C', 'All')).status).toBe(403);
      expect((await patch('A', { ['roster.' + U.A + '.lastSeen']: 1, ['escapeRoomState.teams.' + U.A + '.x']: 'All' })).status).toBe(403);
      expect(await teams()).toEqual({});
      await lan.seed(session(mode, { isActive: false }));
      expect((await join('A', 'All')).status).toBe(403);
      await lan.seed(session(mode));
      const ok = await join('A', 'All');
      expect(ok.status, ok.body.error).toBe(200);
      expect(await teams()).toEqual({ [U.A]: 'All' });
    });
  }

  it('concept-quest: only "All"', async () => {
    await lan.seed(session('concept-quest'));
    expect((await join('A', 'Red')).status).toBe(403);
    expect((await join('A', 'All')).status).toBe(200);
  });

  it('team escape rooms: one of the four team colours or All, single leaf only', async () => {
    await lan.seed(session('escape-room', { isActive: false, rosterNames: [] }));
    expect((await join('A', 'Purple')).status).toBe(403);
    expect((await patch('A', { ['roster.' + U.A + '.lastSeen']: 1, ['escapeRoomState.teams.' + U.A + '.color']: 'Red' })).status).toBe(403);
    const ok = await join('A', 'Red');
    expect(ok.status, ok.body.error).toBe(200);
    expect(await teams()).toEqual({ [U.A]: 'Red' });
  });
});

describe('3. Server-assigned LAN identity', () => {
  it('lan-auth assigns a distinct, well-formed uid to every token', async () => {
    const one = await lan.auth();
    const two = await lan.auth();
    for (const grant of [one, two]) expect(grant.uid).toMatch(/^lan-student-[a-f0-9]{16}$/);
    expect(one.uid).not.toBe(two.uid);
    expect(new Set(Object.values(U)).size).toBe(3);
  });

  it("a token can only write its own uid's fields: not an existing student's, not a made-up one", async () => {
    await lan.seed({ mode: 'sync', roster: roster('A', 'B') });
    const fresh = await lan.auth();
    for (const target of [U.B, 'stuX', 'lan-student-0000000000000000']) {
      const result = await lan.patchWithToken(fresh.token, { ['roster.' + target + '.name']: 'Intruder' });
      expect(result.status, target).toBe(403);
      expect(result.body.error).toMatch(/another participant/);
    }
    expect((await lan.stored()).roster[U.B].name).toBe('B');
    const own = await lan.patchWithToken(fresh.token, { ['roster.' + fresh.uid + '.name']: 'New' });
    expect(own.status, own.body.error).toBe(200);
  });

  it('rejects a token whose signed uid was edited', async () => {
    const [v, body, sig] = lan.tokens.A.split('.');
    const claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    claims.uid = U.B;
    const forged = [v, Buffer.from(JSON.stringify(claims)).toString('base64url'), sig].join('.');
    const result = await lan.patchWithToken(forged, { ['roster.' + U.B + '.name']: 'Forged' });
    expect(result.status).toBe(401);
  });

  it('projects the own roster entry before the first write, on GET and on the event stream', async () => {
    await lan.seed({ mode: 'sync', roster: roster('A', 'B') });
    const view = await lan.studentRead('A');
    expect(Object.keys(view.roster)).toEqual([U.A]);
    const response = await fetch(lan.shareUrl + '/api/lan-sessions/' + CODE + '/events?token=' + encodeURIComponent(lan.tokens.A));
    const reader = response.body.getReader();
    let text = '';
    while (!text.includes('\n\n')) text += new TextDecoder().decode((await reader.read()).value);
    await reader.cancel();
    const event = JSON.parse(text.split('data: ')[1].split('\n\n')[0]);
    expect(Object.keys(event.data.roster)).toEqual([U.A]);
  });

  describe('join page', () => {
    async function joinPage() {
      const html = await fetch(lan.shareUrl + '/join/' + CODE + '?pin=' + encodeURIComponent(lan.pin)).then((response) => response.text());
      const script = html.split('<script>')[1].split('</script>')[0];
      return { html, script };
    }
    function runScript(script, { local = {}, session = {} } = {}) {
      const store = (initial) => {
        const data = { ...initial };
        return { data, getItem: (key) => (key in data ? data[key] : null), setItem: (key, value) => { data[key] = String(value); } };
      };
      const localStorage = store(local);
      const sessionStorage = store(session);
      const atob = (value) => Buffer.from(value, 'base64').toString('binary');
      // eslint-disable-next-line no-new-func
      new Function('localStorage', 'sessionStorage', 'atob', script)(localStorage, sessionStorage, atob);
      return { config: JSON.parse(localStorage.data.alloflow_live_session_config), tabUid: sessionStorage.data.alloflow_lan_participant_uid };
    }
    const fakeToken = (claims) => 'v1.' + Buffer.from(JSON.stringify(claims)).toString('base64url') + '.sig';

    it('hands the app a server-assigned uid that matches its working token', async () => {
      const { script } = await joinPage();
      const { config, tabUid } = runScript(script);
      expect(config.lanUid).toMatch(/^lan-student-[a-f0-9]{16}$/);
      expect(tabUid).toBe(config.lanUid);
      await lan.seed({ mode: 'sync', roster: {} });
      const own = await lan.patchWithToken(config.lanToken, { ['roster.' + config.lanUid + '.name']: 'Joined' });
      expect(own.status, own.body.error).toBe(200);
    });

    it('keeps the same identity when the join page is reopened in the same tab', async () => {
      const first = runScript((await joinPage()).script);
      const local = { alloflow_live_session_config: JSON.stringify(first.config) };
      const again = runScript((await joinPage()).script, { local, session: { alloflow_lan_participant_uid: first.tabUid } });
      expect(again.config.lanToken).toBe(first.config.lanToken);
      expect(again.tabUid).toBe(first.tabUid);
    });

    it('issues a fresh identity for a new tab, an expired token, or a token from an earlier share run', async () => {
      const first = runScript((await joinPage()).script);
      const reuse = (config, session) => runScript(lanPageScript, { local: { alloflow_live_session_config: JSON.stringify(config) }, session });
      const lanPageScript = (await joinPage()).script;
      const newTab = reuse(first.config, {});
      expect(newTab.config.lanUid).not.toBe(first.config.lanUid);
      const claims = JSON.parse(Buffer.from(first.config.lanToken.split('.')[1], 'base64url').toString('utf8'));
      for (const stale of [{ ...claims, exp: Date.now() + 1000 }, { ...claims, iat: 1 }, { ...claims, sid: 'OTHER1' }]) {
        const result = reuse({ ...first.config, lanToken: fakeToken(stale) }, { alloflow_lan_participant_uid: first.tabUid });
        expect(result.config.lanUid, JSON.stringify(stale)).not.toBe(first.tabUid);
        expect(result.tabUid).toBe(result.config.lanUid);
      }
    });

    it('never pairs a kept token with a different uid', async () => {
      const first = runScript((await joinPage()).script);
      const tampered = { ...first.config, lanUid: 'lan-student-ffffffffffffffff' };
      const result = runScript((await joinPage()).script, { local: { alloflow_live_session_config: JSON.stringify(tampered) }, session: { alloflow_lan_participant_uid: first.tabUid } });
      const claims = JSON.parse(Buffer.from(result.config.lanToken.split('.')[1], 'base64url').toString('utf8'));
      expect(claims.uid).toBe(result.config.lanUid);
      expect(result.tabUid).toBe(result.config.lanUid);
    });
  });
});

describe('4. Participant-view redaction', () => {
  const RUN = 'run_1';
  function fullSession() {
    const pair = (a, b) => ({ [U.A]: a, [U.B]: b });
    return {
      mode: 'sync',
      roster: roster('A', 'B'),
      quizState: { responseReceipts: pair({ q: 1 }, { q: 2 }), teams: pair('Red', 'Blue') },
      escapeRoomState: {
        mode: 'lesson-board', isActive: true, attemptId: RUN, teams: pair('All', 'All'),
        teamProgress: {
          All: {
            boardActions: pair({ value: '1' }, { value: '2' }),
            connectedActions: pair({ value: '3' }, { value: '4' }),
            questActions: pair({ answerIndex: 1 }, { answerIndex: 2 }),
            questVotes: pair('room-1', 'room-2'),
            boardRuns: {
              [RUN]: {
                turn: 1, members: [U.A, U.B], dice: [3, 4],
                steps: {
                  t0: {
                    phase: 'review', votes: pair('loc1', 'loc2'),
                    answers: pair({ value: '0', correct: true }, { value: '1', correct: false }),
                    seen: pair({ requestId: 'a' }, { requestId: 'b' }),
                    retryRound: 1, retryStats: pair({ answered: 1 }, { answered: 2 }),
                    responseRounds: { r1: { answers: pair({ value: '0' }, { value: '1' }), seen: pair({ requestId: 'r1_a' }, { requestId: 'r1_b' }) } },
                    result: { success: true, marks: pair(true, false), attempts: pair({ answered: 1 }, { answered: 2 }) },
                  },
                  t1: { phase: 'review', result: { success: false, mk: '10', ak: '1.1.1.1,1.0.0.0' } },
                },
              },
            },
          },
          Red: { solvedPuzzles: ['p1'] },
        },
      },
    };
  }

  it('shows each student only their own records, keeping public fields', async () => {
    await lan.seed(fullSession());
    const a = await lan.studentRead('A');
    const all = a.escapeRoomState.teamProgress.All;
    const run = all.boardRuns[RUN];
    const own = (map) => Object.keys(map);
    expect(own(a.quizState.responseReceipts)).toEqual([U.A]);
    expect(own(all.boardActions)).toEqual([U.A]);
    expect(own(all.connectedActions)).toEqual([U.A]);
    expect(own(all.questActions)).toEqual([U.A]);
    expect(own(all.questVotes)).toEqual([U.A, U.B]);
    const t0 = run.steps.t0;
    expect(own(t0.answers)).toEqual([U.A]);
    expect(own(t0.seen)).toEqual([U.A]);
    expect(own(t0.retryStats)).toEqual([U.A]);
    expect(own(t0.responseRounds.r1.answers)).toEqual([U.A]);
    expect(own(t0.responseRounds.r1.seen)).toEqual([U.A]);
    expect(own(t0.result.marks)).toEqual([U.A]);
    expect(own(t0.result.attempts)).toEqual([U.A]);
    expect(t0.result.success).toBe(true);
    expect(own(t0.votes)).toEqual([U.A, U.B]);
    expect(run.steps.t1.result).toEqual({ success: false, mk: '1-', ak: '1.1.1.1,' });
    expect(run.members).toEqual([U.A, U.B]);
    expect(run.dice).toEqual([3, 4]);
    expect(a.escapeRoomState.teamProgress.Red).toEqual({ solvedPuzzles: ['p1'] });
    const b = await lan.studentRead('B');
    expect(b.escapeRoomState.teamProgress.All.boardRuns[RUN].steps.t1.result).toEqual({ success: false, mk: '-0', ak: ',1.0.0.0' });
    expect(Object.keys(b.escapeRoomState.teamProgress.All.boardRuns[RUN].steps.t0.answers)).toEqual([U.B]);
  });

  it('a student who is not a run member sees no marks at all', async () => {
    await lan.seed(fullSession());
    const c = await lan.studentRead('C');
    const t1 = c.escapeRoomState.teamProgress.All.boardRuns[RUN].steps.t1;
    expect(t1.result).toEqual({ success: false, mk: '--', ak: ',' });
    expect(c.escapeRoomState.teamProgress.All.boardActions).toEqual({});
  });

  it('leaves the teacher view and the stored session untouched', async () => {
    await lan.seed(fullSession());
    await lan.studentRead('A');
    const teacher = await lan.teacherRead();
    expect(teacher).toEqual(fullSession());
  });

  it('the redaction helper is ES5 and never mutates its input', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'desktop', 'runtime', 'alloflow-desktop-runtime.cjs'), 'utf8');
    const start = source.indexOf('function redactTeamProgressAllForParticipant(');
    const end = source.indexOf('\nfunction projectLanSessionForParticipant(', start);
    expect(start).toBeGreaterThan(0);
    const fnSource = source.slice(start, end);
    expect(fnSource).not.toMatch(/=>|\.\.\.|\bconst\b|\blet\b|`/);
    // eslint-disable-next-line no-new-func
    const redact = new Function(fnSource + '\nreturn redactTeamProgressAllForParticipant;')();
    const input = fullSession().escapeRoomState.teamProgress.All;
    const before = JSON.stringify(input);
    const out = redact(input, U.A);
    expect(JSON.stringify(input)).toBe(before);
    expect(out.boardRuns.run_1.steps.t1.result.mk).toBe('1-');
    expect(redact(null, U.A)).toBe(null);
  });
});
