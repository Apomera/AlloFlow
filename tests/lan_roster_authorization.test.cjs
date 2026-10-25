'use strict';
const { before, after, test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

let lan, uid;
const own = field => 'roster.' + uid + (field ? '.' + field : '');
const clone = value => JSON.parse(JSON.stringify(value));
const joinEntry = extra => ({ uid, name: 'Calm Fox', status: 'active', joinedAt: '2026-10-24', ...extra });
const assignedEntry = extra => joinEntry({ groupId: 'teacher-group', resourceId: 'teacher-resource',
  hiddenResourceIds: ['hidden-1'], role: 'guesser', readingThemeDefault: 'warm',
  havenRewards: [{ id: 'teacher-award' }], futureHostMetadata: { owner: 'teacher', nested: { a: 1, b: 2 } }, ...extra });
const patch = updates => lan.studentPatch('A', updates);
const seed = entry => lan.seed({ mode: 'sync', roster: { [uid]: clone(entry), [lan.uids.B]: { name: 'Other learner' } } });
const entry = async () => (await lan.stored()).roster[uid];
async function teacherPatch(updates) {
  const response = await fetch(lan.privateUrl + '/api/lan-sessions/' + lan.code, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updates }),
  });
  assert.equal(response.status, 200);
}

before(async () => {
  const { startLanHarness } = await import('./helpers/desktop_lan_harness.js');
  lan = await startLanHarness({ code: 'ROSTERAUTH', students: ['A', 'B'] });
  uid = lan.uids.A;
}, { timeout: 30000 });
after(async () => { if (lan) await lan.stop(); });

test('whole-entry replacement cannot silently omit teacher-owned or unknown legacy fields', async () => {
  const original = assignedEntry(); await seed(original);
  const result = await patch({ [own()]: joinEntry({ name: 'New name' }) });
  assert.equal(result.status, 403);
  assert.deepEqual(await entry(), original);
});

test('compatible whole-entry reconnect preserves protected values structurally regardless of key order', async () => {
  const original = assignedEntry(); await seed(original);
  const replacement = { ...original, name: 'Rejoined Fox',
    futureHostMetadata: { nested: { b: 2, a: 1 }, owner: 'teacher' } };
  const result = await patch({ [own()]: replacement });
  assert.equal(result.status, 200, result.body.error);
  assert.deepEqual(await entry(), replacement);
});

test('protected fields cannot be added, changed, removed or nulled by whole-entry or dotted writes', async () => {
  const original = assignedEntry(); await seed(original);
  for (const replacement of [
    { ...original, groupId: 'forged' }, { ...original, role: null },
    { ...original, futureTeacherControl: true },
  ]) assert.equal((await patch({ [own()]: replacement })).status, 403);
  assert.equal((await patch({ [own('groupId')]: 'forged' })).status, 403);
  assert.equal((await patch({ [own('readingThemeDefault')]: 'dark' })).status, 403);
  assert.deepEqual(await entry(), original);
});

test('whole replacements validate only changed student-owned values, retaining unchanged malformed legacy data', async () => {
  const original = assignedEntry({ xp: 'legacy-score', signal: 'legacy-signal', uid: 'legacy-uid' });
  await seed(original);
  const compatible = { ...original, name: 'Still here' };
  assert.equal((await patch({ [own()]: compatible })).status, 200);
  assert.deepEqual(await entry(), compatible);
  assert.equal((await patch({ [own()]: { ...compatible, xp: 'new-invalid-score' } })).status, 403);
  assert.equal((await patch({ [own('xp')]: 'legacy-score' })).status, 200);
  assert.equal((await patch({ [own('xp')]: 4 })).status, 200);
});

test('uid cannot be spoofed or deleted while first join and legacy reconnect still work', async () => {
  await lan.seed({ mode: 'sync', roster: {} });
  assert.equal((await patch({ [own()]: joinEntry() })).status, 200);
  const original = await entry();
  const withoutUid = { ...original }; delete withoutUid.uid;
  for (const updates of [
    { [own()]: withoutUid }, { [own()]: { ...original, uid: lan.uids.B } },
    { [own('uid')]: { __op: 'deleteField' } }, { [own('uid')]: lan.uids.B },
  ]) assert.equal((await patch(updates)).status, 403);
  assert.deepEqual(await entry(), original);
});

test('optional own fields support explicit leaf deletion and omission without deleting the roster entry', async () => {
  const original = assignedEntry({ signal: 'ready', wsProgress: { kind: 'practice', activity: 'sort' } });
  await seed(original);
  assert.equal((await patch({ [own('signal')]: { __op: 'deleteField' } })).status, 200);
  const replacement = await entry(); delete replacement.wsProgress;
  assert.equal((await patch({ [own()]: replacement })).status, 200);
  assert.deepEqual(await entry(), replacement);
  assert.equal((await patch({ [own()]: { __op: 'deleteField' } })).status, 403);
});

test('delete operators must be exact direct leaves and cannot be stored inside replacement entries', async () => {
  const original = assignedEntry({ signal: 'ready' }); await seed(original);
  for (const updates of [
    { [own('signal')]: { __op: 'deleteField', extra: true } },
    { [own()]: { ...original, signal: { __op: 'deleteField' } } },
  ]) assert.equal((await patch(updates)).status, 403);
  assert.deepEqual(await entry(), original);
});

test('overlapping, noncanonical and prototype-related participant paths reject the whole batch', async () => {
  const original = joinEntry(); await seed(original);
  for (const updates of [
    { [own()]: original, [own('name')]: 'conflicting' },
    { [own('name')]: 'valid', ['quizState.responses.' + uid]: {}, ['quizState.responses.' + uid + '.score']: 1 },
    { [own() + '.']: original },
    { ['quizState.responses.' + uid + '..score']: 1 },
    { [own('name')]: 'valid', [own('__proto__.polluted')]: true },
    JSON.parse('{"' + own() + '":{"uid":"' + uid + '","__proto__":{"polluted":true}}}'),
  ]) assert.equal((await patch(updates)).status, 403);
  assert.deepEqual(await entry(), original);
  assert.equal({}.polluted, undefined);
});

test('present malformed roster containers require teacher repair, while absent roster permits first join', async () => {
  for (const roster of [null, [], 'legacy-roster', { [uid]: null }, { [uid]: [] }, { [uid]: 'legacy-entry' }]) {
    await lan.seed({ mode: 'sync', roster });
    assert.equal((await patch({ [own('name')]: 'New name' })).status, 403);
    assert.deepEqual((await lan.stored()).roster, roster);
  }
  await lan.seed({ mode: 'sync' });
  assert.equal((await patch({ [own()]: joinEntry() })).status, 200);
});

test('current server assignments added while a participant request is pending cannot be overwritten', async t => {
  const original = joinEntry(); await seed(original);
  const body = JSON.stringify({ updates: { [own()]: { ...original, name: 'Late reconnect' } } });
  const split = Math.floor(body.length / 2);
  let request;
  const result = new Promise((resolve, reject) => {
    request = http.request(lan.shareUrl + '/api/lan-sessions/' + lan.code, {
      method: 'PATCH', headers: { Authorization: 'Bearer ' + lan.tokens.A,
        'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, response => {
      let text = ''; response.on('data', chunk => { text += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, body: JSON.parse(text) }));
    });
    request.on('error', reject); request.write(body.slice(0, split));
  });
  t.after(() => request.destroy());
  await teacherPatch({ [own('groupId')]: 'new-server-assignment' });
  request.end(body.slice(split));
  assert.equal((await result).status, 403);
  assert.deepEqual(await entry(), { ...original, groupId: 'new-server-assignment' });
});

test('invalid mixed batches are atomic and teacher/private updates remain unrestricted', async () => {
  const original = assignedEntry(); await seed(original);
  assert.equal((await patch({ [own('name')]: 'Changed', [own('xp')]: -1 })).status, 403);
  assert.deepEqual(await entry(), original);
  await teacherPatch({ [own('groupId')]: 'teacher-new-group', [own('futureHostMetadata')]: { updated: true } });
  assert.deepEqual((await entry()).futureHostMetadata, { updated: true });
});

test('bounded live reading preferences, image delivery and Word Sounds audio telemetry remain available', async () => {
  await seed(assignedEntry());
  const telemetry = {
    readingTheme: 'highContrast', readingThemeFavorites: ['warm', 'dyslexia'], readingPreferenceAt: 1700000000000,
    imageDelivery: { version: 1, resourceId: 'resource-1', status: 'ready', loaded: 2, total: 2, omitted: 0, assignmentAt: 0, at: 1 },
    wsProgress: { kind: 'practice', activity: 'sort', correct: null, audioStatus: 'ready', audioReady: 2,
      audioTotal: 2, audioRequestAt: 0, audioDeliveryAt: 1700000000000, at: null },
  };
  const updates = Object.fromEntries(Object.entries(telemetry).map(([field, value]) => [own(field), value]));
  const result = await patch(updates); assert.equal(result.status, 200, result.body.error);
  for (const [field, value] of Object.entries(telemetry)) assert.deepEqual((await entry())[field], value);
  assert.equal((await patch({ [own('readingTheme')]: null, [own('readingThemeFavorites')]: null, [own('readingPreferenceAt')]: null,
    [own('wsProgress')]: { kind: null, activity: null, done: null, audioStatus: null, audioReady: null, audioTotal: null, audioRequestAt: null, audioDeliveryAt: null } })).status, 200);
});

test('new preference, delivery and audio telemetry fields retain strict bounds and reject unknown controls', async () => {
  await seed(assignedEntry());
  const image = { version: 1, resourceId: 'r1', status: 'ready', loaded: 2, total: 2, omitted: 0, assignmentAt: 0, at: 1 };
  for (const [field, value] of [
    ['readingTheme', 'custom'], ['readingThemeFavorites', ['warm', 'warm']], ['readingThemeFavorites', Array(11).fill('dark')],
    ['readingPreferenceAt', -1], ['readingPreferenceAt', 1000000000000000],
    ['imageDelivery', { ...image, loaded: 1 }], ['imageDelivery', { ...image, omitted: 1 }],
    ['imageDelivery', { ...image, extra: true }], ['imageDelivery', { ...image, total: 0 }],
    ['wsProgress', { audioStatus: 'forged' }], ['wsProgress', { audioReady: -1 }],
    ['wsProgress', { audioTotal: 100001 }], ['wsProgress', { audioRequestAt: 1000000000000000 }],
    ['wsProgress', { audioStatus: 'ready', teacherControl: true }],
  ]) assert.equal((await patch({ [own(field)]: value })).status, 403, field + ': ' + JSON.stringify(value));
});

test('normal own quiz, reaction, vote and progress writes still work without exposing other participants', async () => {
  await seed(assignedEntry());
  const result = await patch({ ['quizState.responses.' + uid]: { answer: 2 }, ['bridgeReactions.' + uid]: 'ready',
    ['democracy.votes.' + uid]: 'choice-1', [own('lastSeen')]: 123, [own('xp')]: 10 });
  assert.equal(result.status, 200, result.body.error);
  assert.equal((await entry()).xp, 10);
  const before = await lan.stored();
  assert.equal((await patch({ ['roster.' + lan.uids.B + '.name']: 'Imposter' })).status, 403);
  assert.deepEqual(await lan.stored(), before);
});
