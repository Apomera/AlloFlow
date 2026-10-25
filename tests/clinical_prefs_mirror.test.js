import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('utils_pure_source.jsx', 'utf8');
const prefsBlock = source.slice(source.indexOf('const _isPrivateClassroomStorageKey ='), source.indexOf('const storageDB ='));
const copy = value => value == null ? value : JSON.parse(JSON.stringify(value));
const prefixes = ['behaviorLens_', 'bl_', 'allo_behaviorlens_', 'alloflow_dynamic_assessment_', 'alloflow_da_', 'allo_rw_'];

function localStore(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    get length() { return values.size; },
    key: index => [...values.keys()][index] ?? null,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
}

async function harness({ initial, local, backend = 'bridge-iframe', connected = true, beforeCas, get } = {}) {
  let record = copy(initial);
  const listeners = new Map();
  let interval;
  const storage = localStore(local);
  const ds = {
    status: vi.fn(() => ({ backend, connected })),
    get: vi.fn(async () => get ? get(copy(record), ds) : copy(record)),
    set: vi.fn(),
    compareAndSwap: vi.fn(async (namespace, key, expected, next, options) => {
      expect(namespace).toBe('ls_prefs');
      expect(key).toBe('all');
      expect(options).toEqual({ queue: false });
      if (beforeCas) await beforeCas({ ds, get: () => copy(record), set: value => { record = copy(value); } });
      const matched = expected.mode === 'absent' ? record == null
        : typeof expected === 'number' ? record?.revision === expected
          : expected.mode === 'value' && record != null && record.revision === undefined && JSON.stringify(record) === JSON.stringify(expected.value);
      if (!matched) return { applied: false };
      record = { ...copy(next), revision: (record?.revision || 0) + 1 };
      return { applied: true, value: copy(record), revision: record.revision };
    })
  };
  const window = {
    addEventListener: (name, handler) => listeners.set(name, handler),
    dispatchEvent: vi.fn()
  };
  const document = { visibilityState: 'visible', addEventListener: (name, handler) => listeners.set(name, handler) };
  new Function('window', 'document', 'localStorage', '_dsBridgeWanted', '_dsBridge', 'setInterval', 'CustomEvent', prefsBlock)(
    window, document, storage, true, async () => ds, handler => { interval = handler; }, function (type, options) { this.type = type; this.detail = options.detail; }
  );
  await window.__alloRetryPrefsHydration();
  return { ds, window, storage, get: () => copy(record), snapshot: () => interval(), listeners };
}

describe('clinical records stay outside ordinary Canvas preference persistence', () => {
  it('never hydrates clinical values, including explicit replacement hydration', async () => {
    const clinical = Object.fromEntries(prefixes.map((prefix, index) => [`${prefix}private`, `legacy-${index}`]));
    const h = await harness({ initial: { ...clinical, allo_theme: 'dark', allo_font: 'large' }, local: { allo_theme: 'light' } });
    expect(h.storage.getItem('allo_theme')).toBe('light');
    expect(h.storage.getItem('allo_font')).toBe('large');
    for (const key of Object.keys(clinical)) expect(h.storage.getItem(key)).toBeNull();
    await h.window.__alloRetryPrefsHydration({ replaceExisting: true });
    expect(h.storage.getItem('allo_theme')).toBe('dark');
    for (const key of Object.keys(clinical)) expect(h.storage.getItem(key)).toBeNull();
    expect(h.get()).toMatchObject(clinical);
  });

  it('preserves every existing legacy clinical copy but never mirrors new clinical values', async () => {
    const h = await harness({
      initial: { behaviorLens_saved: 'older record', bl_bad_legacy: { retain: true }, alloflow_classroom_roster_state_v1: 'old roster' },
      local: { behaviorLens_saved: 'new record', allo_rw_draft: 'new report', alloflow_da_sessions: 'new assessment', allo_theme: 'light', alloflow_classroom_sync_keys: 'private' }
    });
    await h.snapshot();
    expect(h.ds.compareAndSwap).toHaveBeenCalledOnce();
    expect(h.ds.compareAndSwap.mock.calls[0][2]).toEqual({ mode: 'value', value: { behaviorLens_saved: 'older record', bl_bad_legacy: { retain: true }, alloflow_classroom_roster_state_v1: 'old roster' } });
    expect(h.get()).toEqual({ behaviorLens_saved: 'older record', bl_bad_legacy: { retain: true }, allo_theme: 'light', revision: 1 });
    expect(h.ds.set).not.toHaveBeenCalled();
  });

  it('cannot resurrect a copy removed by verified migration during an in-flight snapshot', async () => {
    let first = true;
    const h = await harness({
      initial: { allo_rw_draft: 'legacy report', allo_theme: 'dark', revision: 1 },
      local: { allo_rw_draft: 'stale plaintext local value', allo_theme: 'light' },
      beforeCas: ({ set }) => { if (first) { first = false; set({ allo_theme: 'dark', revision: 2 }); } }
    });
    await h.snapshot();
    expect(h.ds.compareAndSwap).toHaveBeenCalledTimes(2);
    expect(h.ds.compareAndSwap.mock.calls[0][3].allo_rw_draft).toBe('legacy report');
    expect(h.ds.compareAndSwap.mock.calls[1][3]).not.toHaveProperty('allo_rw_draft');
    expect(h.get()).toEqual({ allo_theme: 'light', revision: 3 });
  });

  it('retains a concurrently changed legacy copy when its first snapshot CAS loses', async () => {
    let first = true;
    const h = await harness({ initial: { bl_students: 'old', revision: 4 }, local: { allo_font: 'large' },
      beforeCas: ({ set }) => { if (first) { first = false; set({ bl_students: 'updated elsewhere', revision: 5 }); } }
    });
    await h.snapshot();
    expect(h.get()).toEqual({ bl_students: 'updated elsewhere', allo_font: 'large', revision: 6 });
  });

  it.each([
    { backend: 'memory', connected: true }, { backend: 'unset', connected: false },
    { backend: 'bridge-popup', connected: false }, { backend: 'unknown', connected: true }
  ])('skips preference writes for unavailable or nonpersistent storage: %j', async config => {
    const h = await harness({ ...config, initial: { bl_students: 'sole legacy copy' }, local: { allo_theme: 'light' } });
    await h.snapshot();
    expect(h.ds.compareAndSwap).not.toHaveBeenCalled();
    expect(h.ds.set).not.toHaveBeenCalled();
    expect(h.get()).toEqual({ bl_students: 'sole legacy copy' });
  });

  it('requires both the atomic API and an explicit durable status, then retries when available', async () => {
    const h = await harness({ local: { allo_theme: 'light' } });
    const cas = h.ds.compareAndSwap;
    const status = h.ds.status;
    delete h.ds.compareAndSwap;
    await h.snapshot();
    h.ds.compareAndSwap = cas;
    delete h.ds.status;
    await h.snapshot();
    expect(cas).not.toHaveBeenCalled();
    h.ds.status = status;
    await h.snapshot();
    expect(cas).toHaveBeenCalledOnce();
    expect(cas.mock.calls[0][2]).toEqual({ mode: 'absent' });
    expect(h.get()).toEqual({ allo_theme: 'light', revision: 1 });
  });

  it('checks persistence again after reading and does not write to a changed backend', async () => {
    let calls = 0;
    const h = await harness({ local: { allo_theme: 'light' }, get: (record, ds) => {
      calls++;
      if (calls > 1) ds.status.mockReturnValue({ backend: 'memory', connected: true });
      return record;
    } });
    await h.snapshot();
    expect(h.ds.compareAndSwap).not.toHaveBeenCalled();
    expect(h.get()).toBeUndefined();
  });

  it('bounds CAS contention and tries again on a later snapshot without reporting success', async () => {
    const h = await harness({ initial: { bl_students: 'retained', revision: 1 }, local: { allo_theme: 'light' } });
    h.ds.compareAndSwap.mockResolvedValue({ applied: false });
    await h.snapshot();
    expect(h.ds.compareAndSwap).toHaveBeenCalledTimes(5);
    await h.snapshot();
    expect(h.ds.compareAndSwap).toHaveBeenCalledTimes(10);
    expect(h.get()).toEqual({ bl_students: 'retained', revision: 1 });
  });

  it('keeps ordinary preference dirty checking and shipped mirrors synchronized', async () => {
    const h = await harness({ local: { allo_theme: 'light' } });
    await h.snapshot();
    await h.snapshot();
    expect(h.ds.compareAndSwap).toHaveBeenCalledOnce();
    h.storage.setItem('allo_theme', 'dark');
    await h.listeners.get('pagehide')();
    expect(h.ds.compareAndSwap).toHaveBeenCalledTimes(2);
    expect(h.get().allo_theme).toBe('dark');
    const built = readFileSync('utils_pure_module.js', 'utf8');
    expect(built).toContain(source);
    expect(readFileSync('desktop/web-app/public/utils_pure_module.js', 'utf8')).toBe(built);
  });
});
