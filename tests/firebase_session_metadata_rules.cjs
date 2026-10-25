#!/usr/bin/env node
'use strict';

// Execute the actual rules engine against an isolated local demo project only.
// Legacy mode is a negative control: these exact injection writes were allowed
// before hardening, so a disconnected emulator cannot manufacture a clean pass.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('../desktop/web-app/node_modules/@firebase/rules-unit-testing');
const { doc, setDoc, updateDoc, getDoc, deleteField } = require('../desktop/web-app/node_modules/firebase/firestore');

const address = /^(127\.0\.0\.1|localhost):(\d{1,5})$/.exec(process.env.FIRESTORE_EMULATOR_HOST || '');
const projectId = process.env.GCLOUD_PROJECT || process.env.PROJECT_ID || 'demo-alloflow-session-metadata';
if (!address || Number(address[2]) < 1 || Number(address[2]) > 65535 || projectId !== 'demo-alloflow-session-metadata') {
  console.error('Use the isolated localhost Firestore emulator and demo-alloflow-session-metadata project.');
  process.exit(2);
}
const legacy = process.env.SESSION_METADATA_EXPECT_LEGACY === '1';
const mode = legacy ? 'legacy negative control' : 'candidate';
const rulesPath = path.resolve(process.env.FIRESTORE_RULES_PATH || path.join(__dirname, '..', 'firestore.rules'));
const rules = fs.readFileSync(rulesPath, 'utf8');
const uid = 'learner';
const otherUid = 'other-learner';
const now = 1792857600123;
const iso = new Date(now).toISOString();
const themes = ['default', 'warm', 'sepia', 'dark', 'highContrast', 'blue', 'green', 'rose', 'dyslexia', 'dim'];
const audioStates = ['ready', 'missing', 'runtime', 'unknown', 'checking', 'unsupported', 'damaged', 'blocked', 'requested', 'resending'];
const identity = { uid, name: 'Calm Otter', joinedAt: iso, status: 'active' };
const wsProgress = { kind: 'practice', activity: 'phoneme_blend', correct: 2, total: 4, goal: 4, done: false, at: now, audioStatus: 'ready', audioReady: 4, audioTotal: 4, audioRequestAt: now - 1, audioDeliveryAt: now };
const wsProbe = { activity: 'phoneme_blend', correct: 2, total: 4, accuracy: 50, itemsPerMin: 12.5, elapsed: 9.75, grade: 'Grade 2', form: 'A-1', at: now };
const organizer = { activityId: 'org:12345678', type: 'venn', gameType: 'vennDiagram', status: 'working', score: 50, correct: 2, total: 4, attempts: 1, at: now };
const activity = { version: 1, activityId: 'resource:123', kind: 'visual_organizer', status: 'submitted', completed: 2, total: 4, at: now };
const delivery = { version: 1, resourceId: 'resource:123', status: 'ready', loaded: 4, total: 4, omitted: 0, assignmentAt: now - 1, at: now };
let checks = 0;

(async () => {
  const env = await initializeTestEnvironment({ projectId, firestore: { host: address[1], port: Number(address[2]), rules } });
  try {
    await env.clearFirestore();
    const documentPath = 'artifacts/metadata-test/public/data/sessions/BOUNDARIES';
    const host = doc(env.authenticatedContext('host').firestore(), documentPath);
    const learner = doc(env.authenticatedContext(uid).firestore(), documentPath);
    const stranger = doc(env.authenticatedContext('stranger').firestore(), documentPath);
    const unauthenticated = doc(env.unauthenticatedContext().firestore(), documentPath);
    async function seed(entry = identity, reactions = {}, extra = {}) {
      await assertSucceeds(setDoc(host, { hostId: 'host', mode: 'sync', roster: { [uid]: entry, [otherUid]: { uid: otherUid, name: 'Blue Fox' } }, bridgeReactions: reactions, ...extra }));
    }
    async function check(label, operation, allowed = true) {
      try {
        if (allowed) await assertSucceeds(operation()); else await assertFails(operation());
      } catch (error) {
        throw new Error(label + ': ' + error.message, { cause: error });
      }
      checks++;
      console.log('PASS [' + mode + '] ' + label);
    }
    const patch = value => updateDoc(learner, value);
    const roster = (field, value) => patch({ ['roster.' + uid + '.' + field]: value });
    const allFields = { ...identity, xp: 12.5, signal: 'ready', signalAt: now, viewingAt: now, viewingResourceId: 'Imported ID: section 1/a.b', viewingResourceAt: now, viewingResourceStatus: 'ready', lastSeen: now, wsProgress, wsProbeResult: wsProbe, organizerProgress: organizer, activityProgress: activity, imageDelivery: delivery, readingTheme: 'highContrast', readingThemeFavorites: themes, readingPreferenceAt: now };
    assert.equal(Object.keys(allFields).length, 20);
    if (!legacy) {
      await seed({});
      await check('valid-value 20-field bulk patch is intentionally denied before value checks', () => patch(Object.fromEntries(Object.entries(allFields).map(([field, value]) => ['roster.' + uid + '.' + field, value]))), false);
      const emitterGroups = [
        ['identity join', identity],
        ['XP and name', { xp: allFields.xp, name: allFields.name }],
        ['signal', { signal: allFields.signal, signalAt: now }],
        ['five-field viewing acknowledgment with activity', { viewingResourceId: allFields.viewingResourceId, viewingResourceAt: now, viewingResourceStatus: 'ready', viewingAt: now, activityProgress: activity }],
        ['presence heartbeat', { lastSeen: now }],
        ['Word Sounds practice and activity', { wsProgress, activityProgress: activity }],
        ['Word Sounds probe', { wsProbeResult: wsProbe }],
        ['organizer and activity', { organizerProgress: organizer, activityProgress: activity }],
        ['image delivery', { imageDelivery: delivery }],
        ['reading preferences', { readingTheme: allFields.readingTheme, readingThemeFavorites: themes, readingPreferenceAt: now }],
      ];
      assert.equal(new Set(emitterGroups.flatMap(([, fields]) => Object.keys(fields))).size, 20);
      for (const [label, fields] of emitterGroups) await check('actual atomic emitter group: ' + label, () => patch(Object.fromEntries(Object.entries(fields).map(([field, value]) => ['roster.' + uid + '.' + field, value]))));
      assert.deepEqual((await getDoc(host)).data().roster[uid], allFields);
      await seed({});
      await check('six valid identity/presence leaves are intentionally denied', () => patch(Object.fromEntries(Object.entries({ ...identity, xp: 1, lastSeen: now }).map(([field, value]) => ['roster.' + uid + '.' + field, value]))), false);
      const specialized = { wsProgress, wsProbeResult: wsProbe, organizerProgress: organizer, imageDelivery: delivery };
      for (const [field, value] of Object.entries(specialized)) {
        await seed({});
        await check('maximum five-leaf batch with ' + field + ' and four metadata leaves', () => patch(Object.fromEntries(Object.entries({ [field]: value, xp: 1, signalAt: now, lastSeen: now, viewingAt: now }).map(([key, entry]) => ['roster.' + uid + '.' + key, entry]))));
        await seed({});
        await check('maximum five-leaf batch with ' + field + ', activity and three timestamps', () => patch(Object.fromEntries(Object.entries({ [field]: value, activityProgress: activity, signalAt: now, lastSeen: now, viewingAt: now }).map(([key, entry]) => ['roster.' + uid + '.' + key, entry]))));
      }
      const families = Object.keys(specialized);
      for (let first = 0; first < families.length; first++) for (let second = first + 1; second < families.length; second++) {
        await seed({});
        await check('unrelated valid specialized families denied: ' + families[first] + ' and ' + families[second], () => patch({ ['roster.' + uid + '.' + families[first]]: specialized[families[first]], ['roster.' + uid + '.' + families[second]]: specialized[families[second]] }), false);
      }
    }

    // All of these valid Firestore writes previously passed own-UID-only rules.
    const attacks = [
      ['new arbitrary own text', 'studentNarrative', 'Synthetic confidential narrative'],
      ['new arbitrary own nested map', 'privateNotes', { nested: { narrative: 'Synthetic confidential narrative' } }],
      ['oversized own name', 'name', 'x'.repeat(41)],
      ['forged payload UID', 'uid', otherUid],
      ['negative XP', 'xp', -1],
      ['forged host assignment', 'groupId', 'forged-group'],
      ['unknown Word Sounds text', 'wsProgress', { activity: 'phoneme_blend', narrative: 'Synthetic private note' }],
      ['unknown probe nested map', 'wsProbeResult', { privateNotes: { narrative: 'Synthetic private note' } }],
    ];
    for (const [label, field, value] of attacks) {
      await seed();
      await check(label, () => roster(field, value), legacy);
    }
    for (const [label, value] of [
      ['reaction arbitrary text', { emoji: 'Synthetic private note', timestamp: now }],
      ['reaction extra nested map', { emoji: '👍', timestamp: now, privateNotes: { narrative: 'Synthetic private note' } }],
      ['reaction timestamp text', { emoji: '👍', timestamp: 'Synthetic private note' }],
      ['reaction explicit null', null],
    ]) {
      await seed();
      await check(label, () => patch({ ['bridgeReactions.' + uid]: value }), legacy);
    }
    if (legacy) {
      console.log('Session metadata legacy negative control: ' + checks + ' vulnerable writes reproduced.');
      return;
    }

    await seed({});
    await check('dotted first join', () => patch(Object.fromEntries(Object.entries(identity).map(([field, value]) => ['roster.' + uid + '.' + field, value]))));
    await seed(identity, {}, { roster: { [otherUid]: { uid: otherUid, name: 'Blue Fox' } } });
    await check('dotted first join with own UID absent', () => patch(Object.fromEntries(Object.entries(identity).map(([field, value]) => ['roster.' + uid + '.' + field, value]))));
    await seed();
    await assertSucceeds(updateDoc(host, { roster: deleteField() }));
    await check('dotted first join with entire roster absent', () => patch(Object.fromEntries(Object.entries(identity).map(([field, value]) => ['roster.' + uid + '.' + field, value]))));
    await seed({}, {});
    await check('whole known entry on an empty first join', () => patch({ ['roster.' + uid]: identity }));
    const hostFields = { groupId: 'group-1', resourceId: 'host-resource', resourceAt: now, hiddenResourceIds: ['hidden-1'], role: 'drawer', havenRewards: { points: 2 }, futureHostMetadata: { privateFlag: true } };
    await seed({ ...identity, ...hostFields });
    await check('dotted rejoin preserves host assignments', () => patch({ ['roster.' + uid + '.uid']: uid, ['roster.' + uid + '.name']: 'Blue Otter', ['roster.' + uid + '.joinedAt']: iso, ['roster.' + uid + '.status']: 'active' }));
    assert.deepEqual((await getDoc(host)).data().roster[uid].futureHostMetadata, hostFields.futureHostMetadata);
    for (const field of Object.keys(hostFields)) {
      await seed({ ...identity, ...hostFields });
      await check('cannot edit host field ' + field, () => roster(field, 'forged'), false);
      await check('cannot delete host field ' + field, () => roster(field, deleteField()), false);
    }
    await seed({ ...identity, ...hostFields });
    await check('cannot replace entry to remove host metadata', () => patch({ ['roster.' + uid]: identity }), false);
    await check('cannot delete entire own entry', () => patch({ ['roster.' + uid]: deleteField() }), false);
    await check('cannot clear entire roster', () => patch({ roster: {} }), false);

    await seed({ ...identity, wsProgress: { oldVersion: true }, organizerProgress: 'legacy-invalid', futureHostMetadata: { privateFlag: true } });
    await check('untouched malformed and unknown legacy fields survive heartbeat', () => roster('lastSeen', now));
    await check('cannot modify an unknown legacy nested field', () => patch({ ['roster.' + uid + '.futureHostMetadata.privateFlag']: false }), false);
    await check('cannot change malformed legacy progress to another malformed value', () => roster('wsProgress', { oldVersion: false }), false);
    await check('can replace malformed legacy progress with valid progress', () => roster('wsProgress', wsProgress));
    await seed({ name: 'Legacy entry without UID', futureHostMetadata: true });
    await check('unchanged missing UID is tolerated on legacy entry', () => roster('xp', 1));
    await check('new own UID is self-bound', () => roster('uid', uid));
    await check('cannot alter own UID', () => roster('uid', otherUid), false);
    await check('cannot delete own UID', () => roster('uid', deleteField()), false);

    await seed(allFields);
    for (const signal of ['stuck', 'slow', 'repeat', 'ready', null]) await check('signal ' + signal, () => roster('signal', signal));
    for (const status of ['loading', 'ready', 'failed', null]) await check('viewing delivery status ' + status, () => roster('viewingResourceStatus', status));
    for (const field of ['signalAt', 'viewingAt', 'viewingResourceAt', 'lastSeen', 'viewingResourceId', 'viewingResourceStatus', 'wsProgress', 'wsProbeResult', 'readingTheme', 'readingThemeFavorites', 'readingPreferenceAt']) await check('known nullable reset ' + field, () => roster(field, null));
    for (const field of ['xp', 'signal', 'signalAt', 'viewingAt', 'viewingResourceId', 'viewingResourceAt', 'viewingResourceStatus', 'lastSeen', 'wsProgress', 'wsProbeResult', 'organizerProgress', 'activityProgress', 'imageDelivery', 'readingTheme', 'readingThemeFavorites', 'readingPreferenceAt']) {
      await seed(allFields);
      await check('known optional leaf deletion ' + field, () => roster(field, deleteField()));
    }
    for (const theme of themes) await check('reading theme enum ' + theme, () => roster('readingTheme', theme));
    for (const favorites of [[], ['dark'], themes]) await check('reading favorite list length ' + favorites.length, () => roster('readingThemeFavorites', favorites));

    await seed();
    for (const [label, field, value] of [
      ['UID null', 'uid', null], ['UID map', 'uid', { nested: true }],
      ['name null', 'name', null], ['name nested map', 'name', { name: 'Synthetic' }],
      ['joinedAt arbitrary text', 'joinedAt', 'Synthetic private note'], ['joinedAt oversized', 'joinedAt', '2'.repeat(41)],
      ['status forged staff', 'status', 'teacher'], ['XP excessive', 'xp', 10000001], ['XP text', 'xp', '100'],
      ['negative timestamp', 'lastSeen', -1], ['oversized timestamp', 'signalAt', 1000000000000000],
      ['timestamp map', 'viewingAt', { at: now }], ['timestamp text', 'viewingResourceAt', 'Synthetic text'],
      ['oversized raw resource ID', 'viewingResourceId', 'x'.repeat(101)], ['raw resource ID nested map', 'viewingResourceId', { id: 'x' }],
      ['unknown resource status', 'viewingResourceStatus', 'administrator'],
      ['unknown reading theme', 'readingTheme', 'Synthetic private note'],
      ['favorite duplicate', 'readingThemeFavorites', ['dark', 'dark']], ['favorite unknown', 'readingThemeFavorites', ['Synthetic private note']],
      ['favorite nested map', 'readingThemeFavorites', [{ private: 'Synthetic text' }]], ['favorite oversized array', 'readingThemeFavorites', themes.concat('dark')],
    ]) await check(label, () => roster(field, value), false);

    for (const value of [null, {}, { activity: null, correct: null, done: null, audioStatus: null }, { correct: 1.5, total: 4.5, goal: 5, at: 0 }, wsProgress, { ...wsProgress, kind: 'probe' }]) await check('valid partial/null Word Sounds progress ' + JSON.stringify(value), () => roster('wsProgress', value));
    for (const audioStatus of audioStates) await check('Word Sounds audio state ' + audioStatus, () => roster('wsProgress', { ...wsProgress, audioStatus }));
    for (const [field, value] of [['activity', 'Name With Spaces'], ['kind', 'private'], ['done', 'yes'], ['audioStatus', 'private'], ['correct', -1], ['total', 100001], ['audioReady', '4'], ['audioRequestAt', 1000000000000000], ['privateText', 'Synthetic note']]) await check('invalid WS progress ' + field, () => roster('wsProgress', { ...wsProgress, [field]: value }), false);
    await check('unknown nested WS progress injection', () => patch({ ['roster.' + uid + '.wsProgress.privateText']: 'Synthetic note' }), false);
    for (const value of [null, {}, { activity: null, form: null, grade: null, itemsPerMin: null }, { itemsPerMin: 12.5, elapsed: 9.75 }, wsProbe]) await check('valid partial/null Word Sounds probe ' + JSON.stringify(value), () => roster('wsProbeResult', value));
    for (const [field, value] of [['activity', 'Name With Spaces'], ['grade', 'x'.repeat(17)], ['form', 'x'.repeat(9)], ['correct', -1], ['accuracy', 100001], ['elapsed', '4'], ['itemsPerMin', { score: 1 }], ['privateText', 'Synthetic note']]) await check('invalid WS probe ' + field, () => roster('wsProbeResult', { ...wsProbe, [field]: value }), false);

    await check('valid organizer progress', () => roster('organizerProgress', organizer));
    await check('valid activity progress', () => roster('activityProgress', activity));
    await check('valid image delivery', () => roster('imageDelivery', delivery));
    for (const [field, original] of [['organizerProgress', organizer], ['activityProgress', activity], ['imageDelivery', delivery]]) await check('extra nested text rejected in ' + field, () => roster(field, { ...original, privateText: { text: 'Synthetic note' } }), false);
    for (const [field, original] of [['organizerProgress', organizer], ['activityProgress', activity], ['imageDelivery', delivery]]) {
      for (const required of Object.keys(original)) {
        const incomplete = { ...original };
        delete incomplete[required];
        await check('missing required ' + field + '.' + required, () => roster(field, incomplete), false);
      }
    }
    await check('activity completion cannot exceed total', () => roster('activityProgress', { ...activity, completed: 5 }), false);
    await check('ready image receipt requires all images loaded', () => roster('imageDelivery', { ...delivery, loaded: 3 }), false);
    await check('invalid organizer status', () => roster('organizerProgress', { ...organizer, status: 'private note' }), false);

    await seed();
    for (const value of [null, 'Synthetic note', []]) await check('invalid own roster entry shape ' + JSON.stringify(value), () => patch({ ['roster.' + uid]: value }), false);
    await check('cannot mutate another learner roster entry', () => patch({ ['roster.' + otherUid + '.name']: 'Forged' }), false);
    await check('cannot update own and other roster entries together', () => patch({ ['roster.' + uid + '.xp']: 1, ['roster.' + otherUid + '.xp']: 1 }), false);
    await check('stranger cannot mutate learner metadata', () => updateDoc(stranger, { ['roster.' + uid + '.xp']: 2 }), false);
    await check('unauthenticated metadata write denied', () => updateDoc(unauthenticated, { ['roster.' + uid + '.xp']: 2 }), false);
    await check('student cannot forge host presence', () => patch({ hostPresence: { state: 'online', heartbeatAt: now } }), false);
    for (const emoji of ['👍', '🤔', '❓']) await check('valid bridge reaction ' + emoji, () => patch({ ['bridgeReactions.' + uid]: { emoji, timestamp: now } }));
    for (const value of [{ emoji: '👍' }, { timestamp: now }, { emoji: '👍', timestamp: -1 }, { emoji: '👍', timestamp: 0 }, { emoji: '👍', timestamp: 1.5 }, { emoji: '👍', timestamp: 1000000000000000 }, [], 'Synthetic note']) await check('invalid reaction schema ' + JSON.stringify(value), () => patch({ ['bridgeReactions.' + uid]: value }), false);
    await check('cannot delete own reaction', () => patch({ ['bridgeReactions.' + uid]: deleteField() }), false);
    await check('cannot mutate another learner reaction', () => patch({ ['bridgeReactions.' + otherUid]: { emoji: '👍', timestamp: now } }), false);
    await seed(identity, { [uid]: { emoji: '👍', timestamp: now, futureHostMetadata: { flag: true } } });
    await check('unchanged host reaction metadata survives enum update', () => patch({ ['bridgeReactions.' + uid + '.emoji']: '🤔' }));
    await check('cannot delete host reaction metadata via replacement', () => patch({ ['bridgeReactions.' + uid]: { emoji: '❓', timestamp: now } }), false);
    await check('cannot mutate host reaction metadata', () => patch({ ['bridgeReactions.' + uid + '.futureHostMetadata.flag']: false }), false);
    for (const priorReaction of [null, 'legacy malformed', [], 7, false]) {
      await seed(identity, { [uid]: priorReaction });
      await check('repair legacy non-map reaction ' + JSON.stringify(priorReaction), () => patch({ ['bridgeReactions.' + uid]: { emoji: '👍', timestamp: now } }));
    }

    await check('host may maintain arbitrary roster metadata and reset nullable progress', () => updateDoc(host, { ['roster.' + uid + '.futureHostMetadata']: { nextVersion: true }, ['roster.' + uid + '.organizerProgress']: null, ['roster.' + uid + '.imageDelivery']: null }));
    await check('host may clear bridge reactions', () => updateDoc(host, { bridgeReactions: deleteField() }));
    await check('host may remove learner roster entry', () => updateDoc(host, { ['roster.' + uid]: deleteField() }));
    console.log('Session metadata rules: ' + checks + ' candidate permission checks passed.');
  } finally {
    await env.cleanup();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
