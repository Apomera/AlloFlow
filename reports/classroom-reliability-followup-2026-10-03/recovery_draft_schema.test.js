import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = file => readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const host = read(process.env.ALLO_DRAFT_HOST || 'AlloFlowANTI.txt');
const client = read(process.env.ALLO_DRAFT_CLIENT || 'allo_device_storage_module.js');
const bridge = read(process.env.ALLO_DRAFT_BRIDGE || 'storage_bridge.html');
function section(source, start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  if (from < 0 || to <= from || source.indexOf(start, from + start.length) !== -1) {
    throw Error('Missing/ambiguous actual-source boundary: ' + start);
  }
  return source.slice(from, to);
}
const recovery = new Function('window', section(host,
  'const ALLO_WORKSPACE_RECOVERY = (() => {', '\n\nconst _alloGetCanvasDeviceStorage')
  + '\nreturn ALLO_WORKSPACE_RECOVERY;')({});
const exports = '\nreturn { normalize: normalizeRecoveryStore, mutate: applyRecoveryMutation };';
const local = new Function(section(client, '  function storageError(code, message)',
  '  // Mirrors the monolith\'s _isCanvasEnv hostname heuristic') + exports)();
const crossOrigin = new Function(section(bridge, "  var RECOVERY_NAMESPACE = 'workspace_recovery';",
  '  function kvSet(ns, key, value)') + exports)();
const clone = value => JSON.parse(JSON.stringify(value));
const fields = [
  ['units', [{ id: 'unit', title: 'Teacher planning', resources: [] }]],
  ['profiles', [{ id: 'learner', name: 'Demo learner' }]],
  ['guidedProgress', { selectedIds: ['planned-activity'], completedIds: [], step: 1 }],
  ['projectState', { responses: { 'planned-activity': 'Keep this draft response.' }, progressLog: [] }],
  ['wordSoundsState', { history: [{ word: 'pond', activity: 'blend' }], phonemeMastery: {} }],
];
function draft(field, value, { savedAt = '2026-10-03T12:00:00.000Z', pinned = false, id = 'draft-' + field } = {}) {
  return { version: 1, id, title: 'Meaningful ' + field + ' draft', savedAt, pinned,
    workspace: { history: [], inputText: '', sourceTopic: '', builderDraft: null,
      units: [], profiles: [], guidedProgress: {}, projectState: {}, wordSoundsState: {},
      [field]: clone(value),
    },
  };
}
const adapters = [{ name: 'native local storage', api: local }, { name: 'native cross-origin bridge', api: crossOrigin }];

describe.each(adapters)('$name meaningful draft schema parity', ({ api }) => {
  for (const [field, value] of fields) {
    it('accepts the actual host ' + field + '-only snapshot through atomic upsert and normalization', () => {
      const source = draft(field, value), before = clone(source), hostSnapshot = recovery.normalizeSnapshot(source);
      expect(hostSnapshot).not.toBeNull(); expect(hostSnapshot.resourceCount).toBe(0);
      const result = api.mutate(recovery.emptyStore(), { version: 1, action: 'upsert', snapshot: clone(hostSnapshot) });
      expect(result).toMatchObject({ applied: true, reason: 'upserted' });
      const normalized = api.normalize(clone(result.store));
      expect(normalized.snapshots).toHaveLength(1);
      expect(normalized.snapshots[0].workspace).toEqual(hostSnapshot.workspace);
      expect(normalized.snapshots[0].resourceCount).toBe(0); expect(source).toEqual(before);
    });
  }
  it('does not discard host-accepted draft-only records when reading an existing store', () => {
    const store = { ...recovery.emptyStore(), legacyMigrationComplete: true,
      snapshots: fields.map(([field, value]) => recovery.normalizeSnapshot(draft(field, value))) };
    const before = clone(store), normalized = api.normalize(clone(store));
    expect(normalized.snapshots.map(item => item.id).sort()).toEqual(store.snapshots.map(item => item.id).sort());
    expect(normalized.snapshots.every(item => item.resourceCount === 0)).toBe(true);
    expect(normalized.legacyMigrationComplete).toBe(true); expect(store).toEqual(before);
  });
  it('preserves the existing source-text, topic and builder-draft acceptance paths', () => {
    const controls = [draft('inputText', 'Teacher source draft'), draft('sourceTopic', 'Pond habitats'),
      draft('builderDraft', { html: '<p>Keep this outline.</p>' })];
    for (const source of controls) {
      const hostSnapshot = recovery.normalizeSnapshot(source);
      expect(hostSnapshot).not.toBeNull();
      const result = api.mutate(recovery.emptyStore(), { version: 1, action: 'upsert', snapshot: hostSnapshot });
      expect(result.applied).toBe(true); expect(api.normalize(result.store).snapshots[0].workspace).toEqual(source.workspace);
    }
  });
  it('continues rejecting empty and metadata-only snapshots', () => {
    const source = draft('guidedProgress', { version: 1, savedAt: '2026-10-03T12:00:00.000Z', historySignature: 'metadata' });
    source.workspace.projectState = { responses: {}, progressLog: [], updatedAt: '2026-10-03T12:00:00.000Z' };
    source.workspace.wordSoundsState = { history: [], score: 0, savedAt: '2026-10-03T12:00:00.000Z' };
    expect(recovery.normalizeSnapshot(source)).toBeNull();
    expect(api.normalize({ ...recovery.emptyStore(), snapshots: [source] }).snapshots).toHaveLength(0);
    expect(() => api.mutate(recovery.emptyStore(), { version: 1, action: 'upsert', snapshot: source }))
      .toThrow('Recovery snapshot is empty.');
  });
  it('keeps unsupported-version payloads rejected', () => {
    const future = { ...draft('wordSoundsState', fields[4][1]), version: 99 };
    expect(recovery.normalizeSnapshot(future)).toBeNull();
    expect(() => api.mutate(recovery.emptyStore(), { version: 1, action: 'upsert', snapshot: future }))
      .toThrow('Recovery snapshot uses unsupported version 99.');
  });
  it('applies existing compact draft age limits while retaining pins and the newest draft', () => {
    const snapshots = [
      draft('inputText', 'Fresh teacher draft', { id: 'newest', savedAt: '2026-10-03T12:00:00.000Z' }),
      draft('units', fields[0][1], { id: 'fresh-unit', savedAt: '2026-10-02T12:00:00.000Z' }),
      draft('profiles', fields[1][1], { id: 'pinned-profile', savedAt: '2026-09-01T12:00:00.000Z', pinned: true }),
      draft('wordSoundsState', fields[4][1], { id: 'expired-phonics', savedAt: '2026-09-01T12:00:00.000Z' }),
    ];
    const store = { ...recovery.emptyStore(), retentionPolicy: 'compact', effectiveRetentionPolicy: 'compact', snapshots };
    const options = { nowMs: Date.parse('2026-10-03T12:00:00.000Z') };
    const expected = recovery.normalizeStore(clone(store), options), actual = api.normalize(clone(store), options);
    expect(expected.snapshots.map(item => item.id)).toEqual(['newest', 'fresh-unit', 'pinned-profile']);
    expect(actual.snapshots.map(item => item.id)).toEqual(expected.snapshots.map(item => item.id));
    expect(actual.snapshots.find(item => item.id === 'pinned-profile').pinned).toBe(true);
  });
});
