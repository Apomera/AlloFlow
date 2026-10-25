import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { sliceBetween } from './helpers/anchored_slice.js';

const files = ['AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx', 'desktop/web-app/src/AlloFlowANTI.txt'];
const clone = value => JSON.parse(JSON.stringify(value));
const teacherFields = {
  groupId: 'teacher-group', resourceId: 'resource-2', resourceAt: 123,
  hiddenResourceIds: ['teacher-only-1'], role: 'guesser',
  havenRewards: [{ id: 'teacher-reward' }], futureHostMetadata: { owned: 'teacher' }
};

function harness(source, options = {}) {
  const stored = { hostId: 'host', roster: { learner: { uid: 'learner', name: 'Old codename', ...clone(teacherFields) } }, ...options.session };
  const updateDoc = vi.fn(async (_ref, patch) => {
    if (options.beforeUpdate) options.beforeUpdate(stored);
    // Firestore update semantics: a top-level roster.{uid} value replaces that
    // map; dotted leaves preserve unrelated fields, including concurrent writes.
    for (const [path, value] of Object.entries(patch)) {
      const pieces = path.split('.');
      let node = stored;
      for (const piece of pieces.slice(0, -1)) node = node[piece] || (node[piece] = {});
      node[pieces.at(-1)] = clone(value);
    }
  });
  const deps = {
    _alloCleanLiveSessionCode: value => value === 'ABCDE' ? value : '',
    _alloCleanFirestoreDocId: value => value,
    _alloEnsureAuthenticatedUser: vi.fn(async () => ({ uid: 'learner' })),
    _alloHasAnyStudentEntry: () => false,
    _alloApplyAuthoritativeStudentAiPolicy: vi.fn(),
    _alloMbBridgeActive: () => true,
    _alloDisconnectStudentAi: vi.fn(),
    addToast: vi.fn(), t: key => key, sessionUnsubscribeRef: { current: null },
    joinAppIdInput: '', appId: 'test-app', db: {}, studentNickname: 'Calm Fox',
    setIsJoinPopoverOpen: vi.fn(), setUser: vi.fn(), setActiveSessionCode: vi.fn(), setActiveSessionAppId: vi.fn(),
    doc: (...parts) => parts.slice(1).join('/'),
    getDoc: vi.fn(async () => ({ exists: () => true, data: () => clone(stored) })),
    updateDoc, warnLog: vi.fn()
  };
  const block = sliceBetween(source, '  const joinClassSession = async ', '  useEffect(() => {\n      if (!pendingJoinCode', { file: 'AlloFlowANTI.txt' });
  const join = new Function(...Object.keys(deps), block + '\nreturn joinClassSession;')(...Object.values(deps));
  return { join, stored, deps };
}

for (const file of files) describe(file + ' roster reconnect boundary', () => {
  const source = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

  it('preserves all teacher-owned fields on rejoin and writes only join leaves', async () => {
    const h = harness(source);
    await expect(h.join('ABCDE')).resolves.toBe(true);
    expect(h.stored.roster.learner).toMatchObject(teacherFields);
    expect(h.stored.roster.learner).toMatchObject({ uid: 'learner', name: 'Calm Fox', status: 'active' });
    expect(Object.keys(h.deps.updateDoc.mock.calls[0][1]).sort()).toEqual([
      'roster.learner.joinedAt', 'roster.learner.name', 'roster.learner.status', 'roster.learner.uid'
    ]);
  });

  it('does not replay stale assignments if the teacher changes them after the session read', async () => {
    const h = harness(source, { beforeUpdate: stored => {
      stored.roster.learner.groupId = 'new-teacher-group';
      stored.roster.learner.resourceId = 'new-teacher-resource';
      stored.roster.learner.futureHostMetadata = { owned: 'new teacher value' };
    } });
    await expect(h.join('ABCDE')).resolves.toBe(true);
    expect(h.stored.roster.learner).toMatchObject({ groupId: 'new-teacher-group', resourceId: 'new-teacher-resource', futureHostMetadata: { owned: 'new teacher value' } });
  });

  it('still creates a first-time learner entry and respects ended or invalid sessions', async () => {
    const fresh = harness(source, { session: { roster: {} } });
    await expect(fresh.join('ABCDE')).resolves.toBe(true);
    expect(fresh.stored.roster.learner).toMatchObject({ uid: 'learner', name: 'Calm Fox', status: 'active' });
    const ended = harness(source, { session: { isActive: false } });
    await expect(ended.join('ABCDE')).resolves.toBe(false);
    expect(ended.deps.updateDoc).not.toHaveBeenCalled();
    await expect(ended.join('INVALID')).resolves.toBe(false);
    expect(ended.deps._alloEnsureAuthenticatedUser).toHaveBeenCalledTimes(1);
  });

  it('self-heals a missing mailbox snapshot without deleting assignments added since that snapshot', async () => {
    const h = harness(source);
    const block = sliceBetween(source, '// Mailbox-bridge roster self-heal', '// Delivery acknowledgment', { file });
    const deps = { ...h.deps, useEffect: callback => callback(), isTeacherMode: false,
      activeSessionCode: 'ABCDE', user: { uid: 'learner' }, sessionData: { roster: {} }, activeSessionAppId: 'test-app' };
    new Function(...Object.keys(deps), block)(...Object.values(deps));
    await Promise.resolve();
    expect(h.deps.updateDoc).toHaveBeenCalledOnce();
    expect(h.stored.roster.learner).toMatchObject(teacherFields);
    expect(Object.keys(h.deps.updateDoc.mock.calls[0][1]).every(path => path.startsWith('roster.learner.'))).toBe(true);
  });
});
