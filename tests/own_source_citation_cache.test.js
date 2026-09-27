import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const prefix = 'alloflow.research-evidence.v1.';
const candidate = 'reports/own-source-citation-durability-2026-09-26/cache-fragment.js';
const sourcePath = process.env.CITATION_CACHE_SOURCE || 'own_sources_module.js';
const source = fs.readFileSync(sourcePath, 'utf8');
const quota = () => Object.assign(new Error('full'), { name: 'QuotaExceededError' });
const denied = () => Object.assign(new Error('denied'), { name: 'SecurityError' });
const item = (id, extra = {}) => ({ id, sourceId: 'source-1', evidenceId: 'evidence-1',
  title: 'Water cycle', locatorLabel: 'page 4', version: 1,
  passage: 'Water vapor condenses into tiny drops.', suppliedAt: '2026-09-26T12:00:00.000Z', ...extra });

function storage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    data, writes: [], removals: [], maxBytes: Infinity, failWrite: null, failRead: null, beforeRead: null,
    get length() { return data.size; },
    key(index) { return [...data.keys()][index] ?? null; },
    getItem(key) {
      this.beforeRead?.(key, this);
      if (this.failRead) throw this.failRead();
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      this.writes.push(key);
      if (this.failWrite) throw this.failWrite();
      const copy = new Map(data); copy.set(key, value);
      if ([...copy].reduce((sum, [k, v]) => sum + (k.length + v.length) * 2, 0) > this.maxBytes) throw quota();
      data.set(key, value);
    },
    removeItem(key) { this.removals.push(key); data.delete(key); }
  };
}
function boot(localStorage = storage(), time = 1801000000000) {
  const root = { localStorage, addEventListener() {}, document: { addEventListener() {} } };
  class Clock extends Date { static now() { return time; } }
  const context = vm.createContext({ window: root, root, storagePrefix: prefix, Date: Clock, console,
    setTimeout() {}, clearTimeout() {} });
  if (source.includes('root.AlloResearchEvidence')) {
    // Evaluate just the evidence IIFE, independent of document-library adapters.
    const offset = source.indexOf('// Bundled with own_sources_module.js');
    vm.runInContext(source.slice(offset), context);
  } else {
    vm.runInContext(source + '\nroot.AlloResearchEvidence = { remember, lookup, normaliseSnapshot, cacheLimits };', context);
  }
  return { api: root.AlloResearchEvidence, root, advance(ms) { time += ms; } };
}
function owned(s) { return [...s.data].filter(([key]) => key.startsWith(prefix) && /^[a-z0-9-]{1,128}$/.test(key.slice(prefix.length))); }

describe('bounded immutable document citation cache', () => {
  it('retains a cloned exact snapshot across reloads and hides internal recency', () => {
    const s = storage(), { api } = boot(s), original = item('one', { passage: 'Line 1\n*exact* &not; \\ text' });
    expect(api.remember([original])).toBe(true);
    original.passage = 'caller mutation';
    const copy = api.lookup('one'); copy.title = 'another mutation';
    expect(boot(s).api.lookup('one')).toEqual(item('one', { passage: 'Line 1\n*exact* &not; \\ text' }));
    expect(api.lookup('one')).not.toHaveProperty('__cacheLastUsed');
    expect(JSON.parse(s.data.get(prefix + 'one')).__cacheLastUsed).toBeTypeOf('number');
  });

  it('accepts legacy raw snapshots without cache metadata', () => {
    const original = item('legacy', { version: null }), s = storage({ [prefix + 'legacy']: JSON.stringify(original) });
    expect(boot(s).api.lookup('legacy')).toEqual(original);
  });

  it.each([
    null, {}, [], item('UPPER'), item('x'.repeat(129)), item('x', { passage: '' }),
    item('x', { passage: 'p'.repeat(1201) }), item('x', { title: 't'.repeat(501) }),
    item('x', { locatorLabel: 'l'.repeat(201) }), item('x', { sourceId: 's'.repeat(201) }),
    item('x', { evidenceId: 'e'.repeat(201) }), item('x', { suppliedAt: 'd'.repeat(65) }),
    item('x', { version: 0 }), item('x', { version: 1.5 }), item('x', { version: '1' }),
    item('x', { version: undefined }), item('x', { title: undefined }), item('x', { passage: 42 }),
    item('x', { passage: '\u0000'.repeat(1200), title: '\u0000'.repeat(500) })
  ])('rejects invalid or oversized snapshot %# without writes or trimming', (invalid) => {
    const s = storage(), { api } = boot(s);
    expect(api.remember([invalid])).toBe(false);
    expect(s.writes).toHaveLength(0);
    expect(s.removals).toHaveLength(0);
  });

  it('does not partially accept an invalid batch', () => {
    const s = storage(), { api } = boot(s);
    expect(api.remember([item('valid'), item('invalid', { passage: '' })])).toBe(false);
    expect(api.lookup('valid')).toBe(null);
    expect(s.writes).toHaveLength(0);
  });

  it('rejects conflicting IDs in the same batch, memory, and after a cold reload', () => {
    const s = storage(), { api } = boot(s), original = item('immutable'), changed = item('immutable', { passage: 'Different evidence.' });
    expect(api.remember([original, changed])).toBe(false);
    expect(api.remember([original])).toBe(true);
    for (let i = 0; i < 3; i++) expect(api.remember([changed])).toBe(false);
    expect(boot(s).api.remember([changed])).toBe(false);
    expect(boot(s).api.lookup('immutable')).toEqual(original);
    expect(api.remember([original, { ...original }])).toBe(true);
  });

  it('will not replace a conflicting durable snapshot with a session snapshot', () => {
    const s = storage(), { api } = boot(s);
    s.failWrite = quota;
    expect(api.remember([item('same')])).toBe(false);
    s.failWrite = null;
    s.data.set(prefix + 'same', JSON.stringify(item('same', { passage: 'Other tab evidence.' })));
    expect(api.remember([item('same')])).toBe(false);
    expect(boot(s).api.lookup('same').passage).toBe('Other tab evidence.');
  });

  it('evicts old owned snapshots on quota and preserves the latest through reload', () => {
    const s = storage({ 'original-document-library': 'do not remove', [prefix + 'bad.suffix']: 'not an owned key' });
    const { api } = boot(s);
    expect(api.remember([item('old-1'), item('old-2'), item('old-3')])).toBe(true);
    s.maxBytes = [...s.data].reduce((sum, [k, v]) => sum + (k.length + v.length) * 2, 0) + 20;
    expect(api.remember([item('new-1'), item('new-2')])).toBe(true);
    const fresh = boot(s).api;
    expect(fresh.lookup('new-1')).toEqual(item('new-1'));
    expect(fresh.lookup('new-2')).toEqual(item('new-2'));
    expect(s.data.get('original-document-library')).toBe('do not remove');
    expect(s.data.get(prefix + 'bad.suffix')).toBe('not an owned key');
    expect(s.removals).toEqual([prefix + 'old-1', prefix + 'old-2']);
  });

  it('keeps current-batch members immovable even if quota cannot hold the batch', () => {
    const s = storage(), { api } = boot(s);
    expect(api.remember([item('old')])).toBe(true);
    s.maxBytes = [...s.data].reduce((sum, [k, v]) => sum + (k.length + v.length) * 2, 0) + 20;
    expect(api.remember([item('a'), item('b')])).toBe(false);
    expect(s.removals).toEqual([prefix + 'old']);
    expect(api.lookup('a')).toEqual(item('a'));
    expect(api.lookup('b')).toEqual(item('b'));
    expect(boot(s).api.lookup('a')).toEqual(item('a'));
  });

  it('retains bounded session copies and reports durable refusal truthfully', () => {
    const s = storage(); s.failWrite = quota;
    const { api } = boot(s);
    for (let i = 0; i < 70; i++) expect(api.remember([item('id-' + i)])).toBe(false);
    expect(api.lookup('id-0')).toBe(null);
    expect(api.lookup('id-5')).toBe(null);
    expect(api.lookup('id-6')).toEqual(item('id-6'));
    expect(api.lookup('id-69')).toEqual(item('id-69'));
    expect(boot(s).api.lookup('id-69')).toBe(null);
  });

  it('limits memory by bytes as well as entry count', () => {
    const s = storage(); s.failWrite = quota;
    const { api } = boot(s);
    const large = { passage: '\u0000'.repeat(900), title: '\u0000'.repeat(200) };
    for (let i = 0; i < 30; i++) expect(api.remember([item('large-' + i, large)])).toBe(false);
    expect(api.lookup('large-0')).toBe(null);
    expect(api.lookup('large-29')).toEqual(item('large-29', large));
  });

  it('counts retained raw JSON as well as normalized snapshots in the memory budget', () => {
    const s = storage(), large = { passage: '\u0000'.repeat(900), title: '\u0000'.repeat(200) };
    for (let i = 0; i < 20; i++) s.data.set(prefix + 'raw-' + i, JSON.stringify(item('raw-' + i, large)));
    const { api } = boot(s);
    for (let i = 0; i < 20; i++) expect(api.lookup('raw-' + i)).toEqual(item('raw-' + i, large));
    s.failRead = denied;
    expect(api.lookup('raw-0')).toBe(null);
    expect(api.lookup('raw-19')).toEqual(item('raw-19', large));
  });

  it('rejects an unretainable batch before writes or evictions', () => {
    const s = storage(), { api } = boot(s);
    expect(api.remember(Array.from({ length: 65 }, (_, i) => item('batch-' + i)))).toBe(false);
    expect(s.writes).toHaveLength(0);
  });

  it('bounds persistent count without touching original documents or other namespaces', () => {
    const s = storage({ 'alloflow_lumen_evidence_v1:library': 'full original library', 'saved-lessons': 'lesson data' });
    const { api } = boot(s);
    for (let i = 0; i < 210; i++) expect(api.remember([item('id-' + i)])).toBe(true);
    expect(owned(s)).toHaveLength(200);
    expect(boot(s).api.lookup('id-209')).toEqual(item('id-209'));
    expect(s.data.get('alloflow_lumen_evidence_v1:library')).toBe('full original library');
    expect(s.data.get('saved-lessons')).toBe('lesson data');
  });

  it('bounds persistent bytes independently of count', () => {
    const s = storage(), { api } = boot(s), large = { passage: '\u0000'.repeat(900), title: '\u0000'.repeat(200) };
    for (let i = 0; i < 50; i++) expect(api.remember([item('big-' + i, large)])).toBe(true);
    expect(owned(s).length).toBeLessThan(50);
    expect(owned(s).reduce((sum, [key, raw]) => sum + (key.length + raw.length) * 2, 0)).toBeLessThanOrEqual(512 * 1024);
    expect(boot(s).api.lookup('big-49')).toEqual(item('big-49', large));
  });

  it.each([denied, () => new Error('unexpected failure')])('does not clean up for nonquota write errors', (error) => {
    const s = storage({ [prefix + 'old']: JSON.stringify(item('old')) }), { api } = boot(s);
    s.failWrite = error;
    expect(api.remember([item('latest')])).toBe(false);
    expect(s.removals).toHaveLength(0);
    expect(api.lookup('latest')).toEqual(item('latest'));
  });

  it('handles inaccessible storage properties and reads without throwing or clearing', () => {
    const s = storage(), runtime = boot(s);
    Object.defineProperty(runtime.root, 'localStorage', { get() { throw denied(); } });
    expect(runtime.api.remember([item('local')])).toBe(false);
    expect(runtime.api.lookup('local')).toEqual(item('local'));
    expect(runtime.api.lookup('missing')).toBe(null);
    expect(s.removals).toHaveLength(0);
  });

  it('does not erase a candidate changed by another tab after the scan', () => {
    const s = storage(), { api } = boot(s);
    expect(api.remember([item('old')])).toBe(true);
    let reads = 0;
    const changed = JSON.stringify({ ...item('old'), __cacheLastUsed: 9999999999999 });
    s.beforeRead = (key) => { if (key === prefix + 'old' && ++reads === 2) s.data.set(key, changed); };
    s.failWrite = quota;
    expect(api.remember([item('new')])).toBe(false);
    expect(s.data.get(prefix + 'old')).toBe(changed);
    expect(s.removals).toHaveLength(0);
  });

  it('does not report durable success if another context removes a preceding batch member', () => {
    const s = storage(), originalSet = s.setItem;
    s.setItem = function(key, raw) {
      originalSet.call(this, key, raw);
      if (key === prefix + 'second') this.data.delete(prefix + 'first');
    };
    const { api } = boot(s);
    expect(api.remember([item('first'), item('second')])).toBe(false);
    expect(api.lookup('first')).toEqual(item('first'));
    expect(boot(s).api.lookup('first')).toBe(null);
  });

  it('retries after another tab already removed a candidate without deleting a second snapshot', () => {
    const s = storage(), { api } = boot(s);
    expect(api.remember([item('old-1'), item('old-2')])).toBe(true);
    s.maxBytes = [...s.data].reduce((sum, [k, v]) => sum + (k.length + v.length) * 2, 0) + 20;
    let reads = 0;
    s.beforeRead = (key) => { if (key === prefix + 'old-1' && ++reads === 2) s.data.delete(key); };
    expect(api.remember([item('new-1')])).toBe(true);
    expect(s.removals).toHaveLength(0);
    expect(boot(s).api.lookup('old-2')).toEqual(item('old-2'));
  });

  it('ranks a malformed owned entry behind valid snapshots despite forged recency', () => {
    const s = storage({ [prefix + 'broken']: JSON.stringify({ id: 'broken', __cacheLastUsed: 9999999999999 }),
      [prefix + 'valid']: JSON.stringify(item('valid')) });
    const { api } = boot(s);
    let refusals = 0;
    const originalSet = s.setItem;
    s.setItem = function(key, raw) {
      if (key === prefix + 'new' && !refusals++) throw quota();
      return originalSet.call(this, key, raw);
    };
    expect(api.remember([item('new')])).toBe(true);
    expect(s.removals).toEqual([prefix + 'broken']);
  });

  it('throttles recency writes and keeps reads usable when touching recency fails', () => {
    const s = storage({ [prefix + 'legacy']: JSON.stringify(item('legacy')) });
    const runtime = boot(s);
    expect(runtime.api.lookup('legacy')).toEqual(item('legacy'));
    expect(s.writes).toHaveLength(1);
    for (let i = 0; i < 10; i++) runtime.api.lookup('legacy');
    expect(s.writes).toHaveLength(1);
    runtime.advance(60001); s.failWrite = quota;
    expect(runtime.api.lookup('legacy')).toEqual(item('legacy'));
    expect(s.removals).toHaveLength(0);
    expect(boot(s).api.lookup('legacy')).toEqual(item('legacy'));
  });

  it('rejects corrupt and mismatched stored records without exposing arbitrary fields', () => {
    const s = storage({ [prefix + 'broken']: '{', [prefix + 'wrong']: JSON.stringify(item('different')),
      [prefix + 'extra']: JSON.stringify({ ...item('extra'), arbitrary: '<script>' }) });
    const { api } = boot(s);
    expect(api.lookup('broken')).toBe(null);
    expect(api.lookup('wrong')).toBe(null);
    expect(api.lookup('extra')).toEqual(item('extra'));
    expect(api.lookup('UPPER')).toBe(null);
  });
});
