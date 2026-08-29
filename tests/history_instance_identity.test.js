import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), 'utf8').replace(/\r\n/g, '\n');
const hostPaths = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];

function identityBlock(source) {
  const startMarker = '// BEGIN ALLO_ARTIFACT_INSTANCE_IDENTITY';
  const endMarker = '// END ALLO_ARTIFACT_INSTANCE_IDENTITY';
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error('Artifact identity block is missing');
  return source.slice(start, end + endMarker.length);
}

function between(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error('Expected host block is missing: ' + startMarker);
  return source.slice(start, end);
}

function loadIdentityApi() {
  let sequence = 0;
  const sandboxWindow = {
    crypto: {
      randomUUID: () => {
        sequence += 1;
        return '00000000-0000-4000-8000-' + String(sequence).padStart(12, '0');
      },
    },
  };
  return new Function(
    'window',
    identityBlock(read('AlloFlowANTI.txt')) + '\nreturn window.AlloArtifactIdentity;'
  )(sandboxWindow);
}

describe('persistent history artifact instance identity', () => {
  it('assigns enumerable unique ids that survive JSON, deep clone, and reorder', () => {
    const api = loadIdentityApi();
    const first = { id: 'duplicate-public-id', type: 'quiz', title: 'First' };
    const second = { id: 'duplicate-public-id', type: 'quiz', title: 'Second' };
    const normalized = api.normalizeArtifactInstanceIds([first, second]);

    expect(api.getArtifactInstanceId(normalized[0])).toMatch(/^artifact-/);
    expect(api.getArtifactInstanceId(normalized[1])).toMatch(/^artifact-/);
    expect(api.getArtifactInstanceId(normalized[0])).not.toBe(api.getArtifactInstanceId(normalized[1]));
    expect(Object.keys(normalized[0])).toContain('_artifactInstanceId');

    const roundTrip = JSON.parse(JSON.stringify(normalized));
    const before = roundTrip.map(api.getArtifactInstanceId);
    const reordered = api.normalizeArtifactInstanceIds([roundTrip[1], roundTrip[0]]);
    expect(reordered.map(api.getArtifactInstanceId)).toEqual([before[1], before[0]]);
    expect(api.sameArtifactInstance(normalized[0], structuredClone(normalized[0]))).toBe(true);
  });

  it('reuses one id for a shared generated object and remaps cloned/imported collisions', () => {
    const api = loadIdentityApi();
    const generated = { id: 'generated', type: 'math', data: { problems: [] } };
    const active = api.ensureArtifactInstanceId(generated);
    const history = api.normalizeArtifactInstanceIds([generated]);
    expect(active).toBe(generated);
    expect(history[0]).toBe(generated);
    expect(api.getArtifactInstanceId(active)).toBe(api.getArtifactInstanceId(history[0]));

    const collidingClone = structuredClone(generated);
    const withCollision = api.normalizeArtifactInstanceIds([generated, collidingClone]);
    expect(api.getArtifactInstanceId(withCollision[0])).toBe(api.getArtifactInstanceId(generated));
    expect(api.getArtifactInstanceId(withCollision[1])).not.toBe(api.getArtifactInstanceId(generated));

    const imported = api.normalizeArtifactInstanceIds([
      { id: 'a', _artifactInstanceId: 'artifact-shared-instance' },
      { id: 'b', _artifactInstanceId: 'artifact-shared-instance' },
      { id: 'c', _artifactInstanceId: 'invalid' },
    ]);
    expect(new Set(imported.map(api.getArtifactInstanceId)).size).toBe(3);
    expect(imported.every(item => /^artifact-[A-Za-z0-9_-]{8,128}$/.test(item._artifactInstanceId))).toBe(true);
  });

  it('resolves a stale clicked row against a deep-cloned, reordered latest history', () => {
    const api = loadIdentityApi();
    const [first, second] = api.normalizeArtifactInstanceIds([
      { id: 'duplicate-public-id', type: 'quiz', title: 'First' },
      { id: 'duplicate-public-id', type: 'quiz', title: 'Second' },
    ]);
    const clickedFromOldRender = second;
    const activeClone = structuredClone(second);
    const latestHistory = structuredClone([second, first]);
    const requestedId = api.getArtifactInstanceId(clickedFromOldRender);
    expect(api.sameArtifactInstance(activeClone, latestHistory[0])).toBe(true);
    const afterDelete = api.removeArtifactInstanceFromList(
      latestHistory,
      requestedId,
      clickedFromOldRender.id
    );
    expect(afterDelete.map(item => item.title)).toEqual(['First']);
  });

  it('does not delete a duplicate sibling when a stale instance is already gone', () => {
    const api = loadIdentityApi();
    const [first, staleSecond] = api.normalizeArtifactInstanceIds([
      { id: 'duplicate-public-id', type: 'quiz', title: 'First' },
      { id: 'duplicate-public-id', type: 'quiz', title: 'Second' },
    ]);
    const latestHistory = structuredClone([first]);
    const result = api.removeArtifactInstanceFromList(
      latestHistory,
      api.getArtifactInstanceId(staleSecond),
      'duplicate-public-id'
    );

    expect(result).toBe(latestHistory);
    expect(result.map(item => item.title)).toEqual(['First']);
  });

  it('clones frozen rows and ignores hostile public-id coercion', () => {
    const api = loadIdentityApi();
    const frozen = Object.freeze({ id: 'frozen', type: 'quiz', title: 'Frozen' });
    const [normalized] = api.normalizeArtifactInstanceIds([frozen]);
    expect(normalized).not.toBe(frozen);
    expect(normalized.title).toBe('Frozen');
    expect(api.getArtifactInstanceId(normalized)).toMatch(/^artifact-/);

    const hostileId = { toString: null, valueOf: null };
    expect(() => api.getArtifactPublicId({ id: hostileId })).not.toThrow();
    expect(api.getArtifactPublicId({ id: hostileId })).toBe('');
  });

  it('contains revoked rows and strips spoofed array methods without invoking them', () => {
    const api = loadIdentityApi();
    const target = { id: 'revoked', title: 'Revoked' };
    const { proxy, revoke } = Proxy.revocable(target, {});
    revoke();
    expect(() => api.ensureArtifactInstanceId(proxy)).not.toThrow();
    expect(api.ensureArtifactInstanceId(proxy)).toBeNull();

    let mapReads = 0;
    const rows = [{ id: 'safe', _artifactInstanceId: 'artifact-safe-row' }];
    Object.defineProperty(rows, 'map', {
      configurable: true,
      get() {
        mapReads += 1;
        throw new Error('own map getter must not run');
      },
    });
    const normalized = api.normalizeArtifactInstanceIds(rows);
    expect(mapReads).toBe(0);
    expect(normalized).not.toBe(rows);
    expect(normalized.map).toBe(Array.prototype.map);
    expect(api.getArtifactInstanceId(normalized[0])).toBe('artifact-safe-row');
  });

  it('rejects invalid proxy lengths and caps huge reported history arrays', () => {
    const api = loadIdentityApi();
    const invalidLength = new Proxy([], {
      get(target, property, receiver) {
        if (property === 'length') return -1;
        return Reflect.get(target, property, receiver);
      },
    });
    expect(api.normalizeArtifactInstanceIds(invalidLength)).toEqual([]);

    let indexedReads = 0;
    const hugeLength = new Proxy([], {
      get(target, property, receiver) {
        if (property === 'length') return Number.MAX_SAFE_INTEGER;
        if (typeof property === 'string' && /^\d+$/.test(property)) indexedReads += 1;
        return Reflect.get(target, property, receiver);
      },
    });
    const bounded = api.normalizeArtifactInstanceIds(hugeLength);
    expect(bounded).toHaveLength(10000);
    expect(indexedReads).toBe(10000);
  });

  it('keeps the canonical helper and normalized setters identical in all host sources', () => {
    const rootHost = read(hostPaths[0]);
    const canonicalBlock = identityBlock(rootHost);
    const canonicalDuplicate = between(rootHost, 'const handleDuplicateResource', 'const handleDeleteHistoryItem');
    const canonicalDelete = between(rootHost, 'const handleDeleteHistoryItem', 'const handleStartEdit');
    const canonicalEdit = between(rootHost, 'const handleStartEdit', 'const handleSaveEdit');
    for (const path of hostPaths) {
      const host = read(path);
      expect(identityBlock(host), path).toBe(canonicalBlock);
      expect(between(host, 'const handleDuplicateResource', 'const handleDeleteHistoryItem'), path).toBe(canonicalDuplicate);
      expect(between(host, 'const handleDeleteHistoryItem', 'const handleStartEdit'), path).toBe(canonicalDelete);
      expect(between(host, 'const handleStartEdit', 'const handleSaveEdit'), path).toBe(canonicalEdit);
      expect(host, path).toContain('const [generatedContent, _setGeneratedContent] = useState(null)');
      expect(host, path).toContain('return ensureArtifactInstanceId(candidate)');
      expect(host, path).toContain('const [history, _setHistory] = useState([])');
      expect(host, path).toContain('return normalizeArtifactInstanceIds(candidate)');
      expect(host, path).toContain('const requestedInstanceId = getArtifactInstanceId(itemRef)');
      expect(host, path).toContain('removeArtifactInstanceFromList(prev, requestedInstanceId, safePublicId)');
      expect(host, path).toContain('sameArtifactInstance(generatedContent, deletedArtifact)');
      expect(host, path).toContain('_alloArtifactMatchesInstanceId(item, itemInstanceId)');
      expect(host, path).toContain("addToast(t('errors.invalid_resource') || 'This resource could not be duplicated.'");
    }
  });

  it('uses instance identity for HistoryPanel current, edit, move, reorder, and React keys', () => {
    const source = read('view_history_panel_source.jsx');
    expect(source).toContain('key={itemInstanceId}');
    expect(source).toContain('generatedArtifactInstanceId === persistedItemInstanceId');
    expect(source).toContain('editingId === itemInstanceId');
    expect(source).toContain('movingItemId === itemInstanceId');
    expect(source).toContain('handleMoveToUnit(itemInstanceId');
    expect(source).toContain('handleDragStart(e, itemInstanceId)');
    expect(source).toContain('handleDragEnter(e, itemInstanceId)');
    expect(source).toContain("moveItem(e, itemInstanceId, 'up', getHistoryRowInstanceId(filteredHistory[idx - 1]))");
    expect(source).not.toContain('key={item.id}');
    expect(source).not.toContain('generatedContent && generatedContent.id === item.id');
  });

  it('normalizes project history before restoring the active clone and bounds malformed row fields', () => {
    const misc = read('misc_handlers_source.jsx');
    const panel = read('view_history_panel_source.jsx');
    expect(misc).toContain("const hydratedHistory = typeof normalizeArtifactInstanceIds === 'function'");
    expect(misc.indexOf('normalizeArtifactInstanceIds(hydrated)')).toBeLessThan(misc.indexOf('setGeneratedContent({ ...lastItem })'));
    expect(panel).toContain('const getSafeRowText = (value, fallback');
    expect(panel).toContain('const getSafeRowDate = (value) =>');
    expect(panel).toContain('const getSafeArraySnapshot = (value, max = 10000) =>');
    expect(panel).toContain("const itemDate = getSafeRowDate(getSafeArtifactField(item, 'timestamp'))");
    expect(panel).not.toContain('String(item.title || getDefaultTitle(item.type))');
    expect(panel).not.toContain('new Date(item.timestamp)');
    expect(panel).not.toContain('handleDeleteHistoryItem(e, item.id, item)');
  });
});
