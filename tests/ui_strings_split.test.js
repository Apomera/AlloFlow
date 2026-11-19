// ui_strings split (2026-11-17): the app boots from ui_strings_core.js and loads
// ui_strings_stem.js with STEAM Lab. ui_strings.js stays the full source of truth.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { isDeepStrictEqual } from 'node:util';
const require = createRequire(import.meta.url);
const split = require('../dev-tools/build_ui_strings_split.cjs');

describe('derived files', () => {
  const sourceText = readFileSync('ui_strings.js', 'utf8');
  const full = JSON.parse(sourceText);
  const out = split.derive(sourceText);
  const core = JSON.parse(out.core), stem = JSON.parse(out.stem);
  const deepMerge = (a, b) => (b && typeof b === 'object' && !Array.isArray(b) && a && typeof a === 'object'
    ? Object.fromEntries([...new Set([...Object.keys(a), ...Object.keys(b)])].map(k => [k, k in b ? deepMerge(a[k], b[k]) : a[k]])) : (b === undefined ? a : b));

  it('core + stem is exactly the full file', () => {
    expect(isDeepStrictEqual({ ...core, stem: deepMerge(core.stem || {}, stem.stem) }, full)).toBe(true);
    expect(Object.keys(stem)).toEqual(['stem']);
  });
  it('core is small and has every top-level section except the bulk of stem', () => {
    expect(Buffer.byteLength(out.core)).toBeLessThan(Buffer.byteLength(sourceText) * 0.3);
    for (const key of Object.keys(full)) expect(core, key).toHaveProperty([key]);
  });
  it('every stem key read outside the STEM tools is in core (they have no other source at boot)', () => {
    const { exact } = split.stemLiterals(split.readerFiles());
    const get = (obj, key) => key.split('.').reduce((cur, part) => (cur && typeof cur === 'object' ? cur[part] : undefined), obj);
    const missing = [...exact].filter(key => get(full, key) !== undefined && get(core, key) === undefined);
    expect(missing).toEqual([]);
    expect(get(core, 'stem.assessment.title') ?? 'absent-in-source').toBe(get(full, 'stem.assessment.title') ?? 'absent-in-source');
  });
});

// ── runtime loader ─────────────────────────────────────────────────────────────
const anti = readFileSync('AlloFlowANTI.txt', 'utf8');
const slice = (from, to) => { const a = anti.indexOf(from), b = anti.indexOf(to, a); if (a < 0 || b < 0) throw Error('missing ' + from); return anti.slice(a, b); };
const SOURCE = slice('// __ALLO_UI_STRINGS_IDB_BEGIN__', 'const _scheduleRemoteStringsRefresh');

function fakeIndexedDB(initial) {
  const data = Object.assign({}, initial);
  return { data, api: { open() {
    const req = {};
    setTimeout(() => {
      req.result = { createObjectStore() {}, close() {}, transaction() {
        const tx = {}; const done = () => setTimeout(() => tx.oncomplete && tx.oncomplete());
        tx.objectStore = () => ({
          get(key) { const r = {}; setTimeout(() => { r.result = data[key]; done(); }); return r; },
          put(value, key) { const r = {}; setTimeout(() => { data[key] = value; done(); }); return r; },
          delete(key) { const r = {}; setTimeout(() => { delete data[key]; done(); }); return r; },
        });
        return tx;
      } };
      if (req.onsuccess) req.onsuccess();
    });
    return req;
  } } };
}
function makeLoader({ idb, files }) {
  const fetched = [];
  const window = { dispatchEvent() {}, __alloCdnBase: 'https://cdn.test/', __alloBuildStamp: { hash: 'abc' } };
  const env = {
    window, indexedDB: idb.api,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    fetch: async (url) => {
      fetched.push(String(url));
      const name = String(url).replace(/^https:\/\/[^/]+\/(Apomera\/AlloFlow\/main\/)?/, '').replace(/\?.*$/, '');
      const body = files[name];
      return body == null ? { ok: false, status: 404 } : { ok: true, text: async () => body };
    },
    setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms === 4000 ? 200 : ms),
    console: { log() {}, warn() {}, error() {} },
    _alloParseUntrustedObject: () => null,
    Event: class { constructor(type) { this.type = type; } },
  };
  const keys = Object.keys(env);
  const api = new Function(...keys, 'let UI_STRINGS = {}; let HELP_STRINGS = {};\n' + SOURCE
    + '\nreturn { get strings() { return UI_STRINGS; }, cacheRead: _alloUiStringsCacheRead, refresh: _refreshRemoteStrings };')(...keys.map(k => env[k]));
  return { api, window, fetched };
}
const FULL = JSON.stringify({ common: { save: 'Save' }, stem: { hub: { title: 'Lab' }, tool: { name: 'Tool' } } });
const CORE = JSON.stringify({ common: { save: 'Save' }, stem: { hub: { title: 'Lab' } } });
const STEM = JSON.stringify({ stem: { hub: { title: 'Lab' }, tool: { name: 'Tool' } } });
const HTML = '<!doctype html><html><body>AlloFlow</body></html>';

describe('strings loader', () => {
  it('boots from the core file and caches it under ui_strings_core, dropping the old full copy', async () => {
    const idb = fakeIndexedDB({ ui_strings: FULL });
    const s = makeLoader({ idb, files: { 'ui_strings_core.js': CORE, 'ui_strings.js': FULL } });
    await s.api.cacheRead;
    expect(s.api.strings.stem.tool.name, 'the old full cache still boots').toBe('Tool');
    await s.api.refresh();
    expect(idb.data.ui_strings_core).toBe(CORE);
    expect(idb.data.ui_strings).toBeUndefined();
    expect(s.api.strings.stem.tool.name, 'a core refresh never drops stem strings already shown').toBe('Tool');
  });
  it('an HTML page answered for a missing core file falls through to the full file', async () => {
    const idb = fakeIndexedDB({});
    const s = makeLoader({ idb, files: { 'ui_strings_core.js': HTML, 'ui_strings.js': FULL } });
    await s.api.cacheRead; await s.api.refresh();
    expect(s.api.strings.common.save).toBe('Save');
    expect(idb.data.ui_strings).toBe(FULL);
    expect(idb.data.ui_strings_core).toBeUndefined();
  });
  it('the STEM strings load once on demand and merge into the core', async () => {
    const idb = fakeIndexedDB({ ui_strings_core: CORE });
    const s = makeLoader({ idb, files: { 'ui_strings_core.js': CORE, 'ui_strings_stem.js': STEM } });
    await s.api.cacheRead; await s.api.refresh();
    expect(s.api.strings.stem.tool).toBeUndefined();
    expect(s.fetched.some(u => u.includes('ui_strings_stem'))).toBe(false);
    await Promise.all([s.window.__alloEnsureStemStrings(), s.window.__alloEnsureStemStrings()]);
    expect(s.api.strings.stem.tool.name).toBe('Tool');
    expect(s.api.strings.common.save).toBe('Save');
    expect(s.fetched.filter(u => u.includes('ui_strings_stem')).length).toBe(1);
    expect(idb.data.ui_strings_stem).toBe(STEM);
  });
  it('a later core refresh keeps the STEM strings', async () => {
    const idb = fakeIndexedDB({ ui_strings_core: CORE, ui_strings_stem: STEM });
    const CORE2 = JSON.stringify({ common: { save: 'Save work' }, stem: { hub: { title: 'Lab' } } });
    const s = makeLoader({ idb, files: { 'ui_strings_core.js': CORE2, 'ui_strings_stem.js': STEM } });
    await s.api.cacheRead;
    await s.window.__alloEnsureStemStrings();
    await s.api.refresh();
    expect(s.api.strings.common.save).toBe('Save work');
    expect(s.api.strings.stem.tool.name).toBe('Tool');
  });
  it('if the stem file is missing, the STEM strings come from the full file', async () => {
    const idb = fakeIndexedDB({ ui_strings_core: CORE });
    const s = makeLoader({ idb, files: { 'ui_strings_stem.js': HTML, 'ui_strings.js': FULL } });
    await s.api.cacheRead;
    await s.window.__alloEnsureStemStrings();
    expect(s.api.strings.stem.tool.name).toBe('Tool');
    expect(JSON.parse(idb.data.ui_strings_stem)).toEqual({ stem: JSON.parse(FULL).stem });
  });
});
