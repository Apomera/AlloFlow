import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('apps_script/session_mailbox/Code.gs', 'utf8');
const UID = 'mb-student001', OTHER = 'mb-student002', CODE = 'ABC23';
const rootPath = 'roster.' + UID;
const clone = value => JSON.parse(JSON.stringify(value));
const deletion = () => ({ __op: 'deleteField' });
function session(entry = {}) {
  return { mode: 'sync', teacherSetting: 'host-only', roster: {
    [UID]: { uid: UID, name: 'Ada', status: 'active', xp: 3, signal: 'ready',
      groupId: 'teacher-group', hostMetadata: { award: 'silver', flags: { protected: true, level: 2 } }, ...entry },
    [OTHER]: { uid: OTHER, name: 'Other', groupId: 'other-group' },
  } };
}

function fixture(initial = session()) {
  const documentKey = 'd:' + CODE + ':s', versionKey = 'dw:' + CODE;
  const store = new Map([[documentKey, JSON.stringify({ w: 7, d: initial })], [versionKey, '7']]);
  const peerPath = 'g:signaling:' + UID, peerKey = 'd:' + CODE + ':' + peerPath;
  store.set(peerKey, JSON.stringify({ w: 1, d: { codename: 'Ada', offer: { type: 'offer', sdp: 'synthetic' } } }));
  const events = []; let locked = false, acquire = null, available = true;
  const cache = {
    get(key) {
      if (key === documentKey || key === versionKey) { expect(locked).toBe(true); events.push('read:' + key); }
      return store.get(key) ?? null;
    },
    put(key, value) {
      expect(locked).toBe(true);
      if (key === documentKey || key === versionKey) events.push('write:' + key);
      store.set(key, String(value));
    },
    remove(key) { expect(locked).toBe(true); store.delete(key); },
  };
  const context = {
    LockService: { getScriptLock: () => ({
      tryLock() { events.push('lock'); if (!available) return false; locked = true; if (acquire) { const fn = acquire; acquire = null; fn(); } return true; },
      releaseLock() { expect(locked).toBe(true); events.push('release'); locked = false; },
    }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ setMimeType() { return this; }, getContent: () => text }) },
  };
  vm.runInNewContext(source, context);
  const read = () => JSON.parse(store.get(documentKey));
  return { context, events, read,
    allowed: updates => context.participantCanPatchSession(updates, UID, clone(read().d)),
    write(updates, teacher = false) {
      return JSON.parse(context.docWrite(cache, CODE, 'dpatch', { p: 's', u: updates },
        { role: teacher ? 'teacher' : 'participant', uid: teacher ? 'teacher' : UID }).getContent());
    },
    hostReplace(data) {
      return JSON.parse(context.docWrite(cache, CODE, 'dset', { p: 's', d: data }, { role: 'teacher', uid: 'teacher' }).getContent());
    },
    readPeer: () => JSON.parse(store.get(peerKey)),
    writePeer(updates) {
      return JSON.parse(context.docWrite(cache, CODE, 'dpatch', { p: peerPath, u: updates },
        { role: 'participant', uid: UID }).getContent());
    },
    onAcquire(fn) { acquire = () => { const current = read(); fn(current); store.set(documentKey, JSON.stringify(current)); store.set(versionKey, String(current.w)); }; },
    unavailable() { available = false; },
  };
}

describe('mailbox participant roster replacement authorization', () => {
  it('rejects a reconnect payload that drops all teacher-owned and unknown legacy fields', () => {
    const f = fixture(), before = f.read();
    expect(f.write({ [rootPath]: { uid: UID, name: 'Reconnected', status: 'active', xp: 3 } })).toMatchObject({ ok: false, e: 'denied' });
    expect(f.read()).toEqual(before);
  });
  it.each(['groupId', 'hostMetadata'])('rejects removal/change of protected %s and leaves document/version unchanged', field => {
    for (const change of ['remove', 'replace']) {
      const f = fixture(), before = f.read(), entry = clone(before.d.roster[UID]);
      if (change === 'remove') delete entry[field]; else entry[field] = 'attacker';
      expect(f.write({ [rootPath]: entry })).toMatchObject({ ok: false, e: 'denied' });
      expect(f.read()).toEqual(before);
      expect(f.events.filter(event => event.startsWith('write:'))).toEqual([]);
      expect(f.events.at(-1)).toBe('release');
    }
  });

  it('rejects adding unknown fields and direct deletion of inherited-name protected fields', () => {
    const f = fixture(), entry = clone(f.read().d.roster[UID]); entry.newHostFlag = true;
    expect(f.allowed({ [rootPath]: entry })).toBe(false);
    for (const field of ['groupId', 'hostMetadata', 'toString', 'hasOwnProperty']) {
      expect(f.write({ [rootPath + '.' + field]: deletion() })).toMatchObject({ ok: false, e: 'denied' });
    }
  });

  it.each(['toString', 'hasOwnProperty', 'valueOf'])('preserves actual host metadata named %s', field => {
    const f = fixture(session({ [field]: { hostOnly: true }, legacyNull: null })), before = f.read();
    expect(f.write({ [rootPath + '.' + field]: deletion() })).toMatchObject({ ok: false, e: 'denied' });
    const entry = clone(before.d.roster[UID]); delete entry[field];
    expect(f.write({ [rootPath]: entry })).toMatchObject({ ok: false, e: 'denied' });
    const withoutNull = clone(before.d.roster[UID]); delete withoutNull.legacyNull;
    expect(f.write({ [rootPath]: withoutNull })).toMatchObject({ ok: false, e: 'denied' });
    expect(f.read()).toEqual(before);
  });

  it('accepts unchanged protected metadata independent of key order and malformed legacy leaves', () => {
    const f = fixture(session({ uid: 'legacy-identity', xp: 'legacy-xp', wsProgress: { legacyFormat: true } }));
    const entry = clone(f.read().d.roster[UID]);
    entry.hostMetadata = { flags: { level: 2, protected: true }, award: 'silver' };
    entry.name = 'Reconnected';
    expect(f.write({ [rootPath]: entry }).ok).toBe(true);
    expect(f.read().d.roster[UID]).toEqual(entry);
    expect(f.write({ [rootPath + '.uid']: 'legacy-identity' }).ok).toBe(true);
  });

  it('preserves first joins and UID-free legacy rejoin compatibility', () => {
    for (const state of [{ mode: 'sync' }, { mode: 'sync', roster: {} }]) {
      const f = fixture(state);
      expect(f.write({ [rootPath]: { uid: UID, name: 'First join', status: 'active' } }).ok).toBe(true);
    }
    const state = session(); delete state.roster[UID].uid;
    const legacy = fixture(state), entry = clone(state.roster[UID]); entry.name = 'Legacy rejoin';
    expect(legacy.write({ [rootPath]: entry }).ok).toBe(true);
  });

  it('rejects UID changes, removal and whole-entry delete markers', () => {
    const f = fixture();
    for (const entry of [{ ...f.read().d.roster[UID], uid: OTHER }, deletion(), null, []]) {
      expect(f.write({ [rootPath]: entry }).ok).toBe(false);
    }
    const entry = clone(f.read().d.roster[UID]); delete entry.uid;
    expect(f.write({ [rootPath]: entry })).toMatchObject({ ok: false, e: 'denied' });
    expect(f.write({ [rootPath + '.uid']: deletion() })).toMatchObject({ ok: false, e: 'denied' });
    const minimal = fixture({ roster: { [UID]: { uid: UID, name: 'Ada' } } });
    expect(minimal.write({ [rootPath]: { name: 'Ada' } })).toMatchObject({ ok: false, e: 'denied' });
  });

  it('allows optional own leaf deletion but rejects literal sentinels inside replacement objects', () => {
    const f = fixture();
    expect(f.write({ [rootPath + '.signal']: deletion() }).ok).toBe(true);
    expect(f.read().d.roster[UID]).not.toHaveProperty('signal');
    const replacement = clone(f.read().d.roster[UID]); delete replacement.xp;
    expect(f.write({ [rootPath]: replacement }).ok).toBe(true);
    expect(f.write({ [rootPath]: { ...replacement, name: deletion() } }).ok).toBe(false);
    expect(f.write({ [rootPath + '.name']: { __op: 'deleteField', extra: true } })).toMatchObject({ ok: false, e: 'bad-data' });
  });

  it.each([{ malformed: null }, { malformed: [] }, { malformed: 'legacy-scalar' }])('fails closed on malformed stored roster or own entry: $malformed', ({ malformed }) => {
    for (const data of [{ roster: malformed }, { roster: { [UID]: malformed } }]) {
      const f = fixture(data), before = f.read();
      expect(f.write({ [rootPath + '.name']: 'Overwrite' }).ok).toBe(false);
      expect(f.write({ [rootPath]: { uid: UID, name: 'Overwrite' } }).ok).toBe(false);
      expect(f.read()).toEqual(before);
    }
  });

  it.each([{ data: null }, { data: [] }, { data: 'legacy-session' }, { data: 42 }, { data: false }])(
    'rejects participant coercion of malformed stored session data: $data', ({ data }) => {
      const f = fixture(data), before = f.read();
      expect(f.write({ [rootPath + '.name']: 'Repair attempt' })).toMatchObject({ ok: false, e: 'denied' });
      expect(f.read()).toEqual(before);
      expect(f.events.filter(event => event.startsWith('write:'))).toEqual([]);
      expect(f.hostReplace(session()).ok).toBe(true);
      expect(f.read().d).toEqual(session());
    });

  it('rejects ambiguous root/leaf overlaps, other participants and invalid changed leaves', () => {
    const f = fixture(), entry = clone(f.read().d.roster[UID]);
    for (const updates of [{ [rootPath]: entry, [rootPath + '.name']: 'Overlap' },
      { [rootPath + '.name']: 'Overlap', [rootPath]: entry },
      { ['roster.' + OTHER + '.name']: 'Spoof' }, { roster: { [UID]: entry } },
      { [rootPath + '.xp']: -1 }, { [rootPath + '.activityProgress']: { invalid: true } }]) {
      expect(f.write(updates).ok).toBe(false);
    }
    expect(f.write({ [rootPath + '.activityProgress']: { version: 1, activityId: 'activity-1', kind: 'practice', status: 'working', completed: 1, total: 3, at: 1000 } }).ok).toBe(true);
  });

  it('validates against the latest host state after taking ScriptLock', () => {
    const f = fixture(), stale = clone(f.read().d.roster[UID]);
    f.onAcquire(current => { current.w = 8; current.d.roster[UID].groupId = 'latest-host-group'; });
    expect(f.write({ [rootPath]: stale })).toMatchObject({ ok: false, e: 'denied' });
    expect(f.read().w).toBe(8); expect(f.read().d.roster[UID].groupId).toBe('latest-host-group');
    expect(f.events[0]).toBe('lock'); expect(f.events.filter(event => event.startsWith('write:'))).toEqual([]);
  });

  it('keeps host writes authorized and a failed lock leaves documents untouched', () => {
    const f = fixture();
    expect(f.write({ [rootPath + '.groupId']: 'host-update', teacherSetting: 'new' }, true).ok).toBe(true);
    expect(f.read().d.roster[UID].groupId).toBe('host-update');
    const before = f.read(); f.unavailable();
    expect(f.write({ [rootPath + '.name']: 'Blocked' })).toMatchObject({ ok: false, e: 'busy' });
    expect(f.read()).toEqual(before);
  });

  it('accepts the actual three-field client reading preference payload', () => {
    const f = fixture();
    expect(f.write({ [rootPath + '.readingTheme']: 'sepia', [rootPath + '.readingThemeFavorites']: ['sepia', 'dark'],
      [rootPath + '.readingPreferenceAt']: 1000 }).ok).toBe(true);
    const entry = clone(f.read().d.roster[UID]); entry.readingTheme = 'warm';
    expect(f.write({ [rootPath]: entry }).ok).toBe(true);
    expect(f.write({ [rootPath + '.readingThemeFavorites']: ['default', 'warm', 'sepia', 'dark', 'highContrast', 'blue', 'green', 'rose', 'dyslexia', 'dim'] }).ok).toBe(true);
    expect(f.write({ [rootPath + '.readingTheme']: null, [rootPath + '.readingThemeFavorites']: null,
      [rootPath + '.readingPreferenceAt']: null }).ok).toBe(true);
  });

  it.each([['readingTheme', 'unrecognized'], ['readingTheme', {}], ['readingThemeFavorites', 'dark'],
    ['readingThemeFavorites', ['dark', 'dark']], ['readingThemeFavorites', ['dark', 'unrecognized']],
    ['readingThemeFavorites', Array(11).fill('dark')], ['readingPreferenceAt', -1],
    ['readingPreferenceAt', 1000000000000000], ['readingPreferenceAt', '1000'], ['readingThemeDefault', 'warm']])(
    'rejects invalid/protected reading preference %s=%j in leaf and whole entry writes', (field, value) => {
      const f = fixture(), entry = clone(f.read().d.roster[UID]); entry[field] = value;
      expect(f.write({ [rootPath + '.' + field]: value }).ok).toBe(false);
      expect(f.write({ [rootPath]: entry }).ok).toBe(false);
    });
});

const metadataSchemas = [
  { label: 'wsProgress', key: rootPath + '.wsProgress', field: 'wsProgress', value: { kind: 'practice', activity: 'blending', correct: 1, total: 2, at: 1000 } },
  { label: 'wsProbeResult', key: rootPath + '.wsProbeResult', field: 'wsProbeResult', value: { activity: 'blending', correct: 1, total: 2, accuracy: 50, at: 1000 } },
  { label: 'organizerProgress', key: rootPath + '.organizerProgress', field: 'organizerProgress', value: { activityId: 'organizer-001', type: 'venn', gameType: 'vennDiagram', status: 'working', score: 0, correct: 1, total: 3, attempts: 1, at: 1000 } },
  { label: 'activityProgress', key: rootPath + '.activityProgress', field: 'activityProgress', value: { version: 1, activityId: 'activity-1', kind: 'practice', status: 'working', completed: 1, total: 3, at: 1000 } },
  { label: 'quizReceipt', key: 'quizState.responseReceipts.' + UID, value: { activityId: 'quiz-1', questionIndex: 0, submittedAt: 1000, flow: 'assessment' } },
  { label: 'questAction', key: 'escapeRoomState.teamProgress.All.questActions.' + UID, value: { abilityId: 'analyze', answerIndex: 0, submittedAt: 1000, turnKey: 'turn-1' } },
];
const inheritedNames = ['toString', 'valueOf', 'hasOwnProperty'];
describe('mailbox fixed-schema own membership', () => {
  it.each(metadataSchemas.flatMap(schema => inheritedNames.map(inherited => ({ ...schema, inherited }))))(
    'rejects inherited-name extra $inherited in participant $label while valid reports still work', ({ key, field, value, inherited }) => {
      const data = session();
      data.escapeRoomState = { mode: 'concept-quest', isActive: true, conceptQuest: { actionSchema: 1, phase: 'battle', turnKey: 'turn-1' } };
      const f = fixture(data);
      expect(f.write({ [key]: clone(value) }).ok).toBe(true);
      const before = f.read(), invalid = { ...value, [inherited]: 'synthetic-extra-text' };
      expect(f.write({ [key]: invalid })).toMatchObject({ ok: false, e: 'denied' });
      expect(f.read()).toEqual(before);
      if (field) {
        const replacement = clone(before.d.roster[UID]); replacement[field] = invalid;
        expect(f.write({ [rootPath]: replacement })).toMatchObject({ ok: false, e: 'denied' });
        expect(f.read()).toEqual(before);
      }
    });

  it.each(inheritedNames)('rejects inherited-name signaling field %s before changing the peer document', inherited => {
    const f = fixture();
    expect(f.writePeer({ codename: 'Reconnected' }).ok).toBe(true);
    const before = f.readPeer(), version = f.read().w;
    expect(f.writePeer({ [inherited]: 'synthetic-extra-text' })).toMatchObject({ ok: false, e: 'denied' });
    expect(f.readPeer()).toEqual(before); expect(f.read().w).toBe(version);
    expect(f.context.participantCanWritePeer('g:signaling:' + UID, { role: 'participant', uid: UID },
      'dset', { d: { codename: 'Ada', [inherited]: 'synthetic-extra-text' } })).toBe(false);
  });

  it.each(inheritedNames)('rejects inherited-name host-presence metadata %s', inherited => {
    const f = fixture(); f.context.LIVE_HOST_LEASE_TTL_MS = 60000;
    const valid = { state: 'online', heartbeatAt: 1000, expiresAt: 61000, leaseId: null };
    expect(f.context.validLiveHostPresenceValue(valid)).toBe(true);
    expect(f.context.validLiveHostPresenceValue({ ...valid, [inherited]: 'synthetic-extra-text' })).toBe(false);
  });
});
