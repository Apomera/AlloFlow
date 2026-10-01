// Reload · resources restored before firestore_sync_module.js arrives are re-hydrated when it does.
//
// Found 2026-09-23 in Chromium: after a plain page reload every Crew pack showed its directions as
// raw JSON ({"body":"Crew slot: 40 minutes...) with no goal checklist. The offline autosave stores
// every resource's data as a JSON string; on reload the host read it back at ~1.4 s, but the module
// that parses it (firestore_sync_module.js, window.hydrateHistory) installed at ~7.1 s, and until
// then the host's shim passes items through untouched. The fix: the host announces the upgrade
// ('allo-firestore-sync-upgraded'), the app re-hydrates only the items still holding string data,
// and the directions normalizer accepts a JSON string of { body, objectives } in the meantime.
//
// This drives the host's own shim, upgrade and helper code (sliced from AlloFlowANTI.txt, as the
// other directions tests do) together with the REAL firestore_sync_module.js.
// ANTI_PATH points the suite at a copy of AlloFlowANTI.txt for mutation runs.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ANTI = readFileSync(process.env.ANTI_PATH ? resolve(process.env.ANTI_PATH) : resolve('AlloFlowANTI.txt'), 'utf8');
const APP = readFileSync(resolve('desktop/web-app/src/App.jsx'), 'utf8');
const SYNC = readFileSync(resolve('firestore_sync_module.js'), 'utf8');
const pack = JSON.parse(readFileSync(resolve('allopacks/crew_norms_grade6_8.allopack.json'), 'utf8'));
const directions = pack.history.find((r) => r.type === 'directions');
const glossary = pack.history.find((r) => r.type === 'glossary');

const slice = (src, from, to) => {
  const a = src.indexOf(from), b = src.indexOf(to, a + from.length);
  if (a < 0 || b < 0) throw new Error('marker not found: ' + (a < 0 ? from : to));
  return src.slice(a, b);
};
// The host's firestore-sync shims, its upgrade function, and (after the fix) the re-hydrate helper.
const SHIM = slice(ANTI, 'let stripUndefined = (obj) => obj;', '// Shim for safety_checker_module.js');
const NORMALIZE = slice(ANTI, 'function _alloNormalizeDirectionsData(data) {', '// ── Goal capability registry');

// What the host's offline autosave writes for each item (ANTI serializeItems): data JSON-stringified.
const stored = [
  { id: directions.id, type: 'directions', title: directions.title, meta: '', timestamp: '2026-09-13T18:00:00.000Z', data: JSON.stringify(directions.data) },
  { id: glossary.id, type: 'glossary', title: glossary.title, meta: '', timestamp: '2026-09-13T18:00:00.000Z', data: JSON.stringify(glossary.data) },
  { id: 'r1', type: 'simplified', title: 'Reading', meta: '', timestamp: '2026-09-13T18:00:00.000Z', data: JSON.stringify('## Norms\n\nA norm is an agreement.'), dataEncoding: 'json-text/v1' },
];

let host = null;
beforeAll(() => {
  window.warnLog = () => {};
  const upgrades = [];
  window.addEventListener('allo-firestore-sync-upgraded', () => upgrades.push(Date.now()));
  // The host defines its shims and upgrade function first; the module arrives later.
  const make = new Function(SHIM + ';\nreturn { hydrate: (x) => hydrateHistory(x), rehydrate: typeof _alloRehydrateShimHistory === "function" ? _alloRehydrateShimHistory : null };');
  host = make();
  host.upgrades = upgrades;
});

describe('reload: history restored before the sync module arrives', () => {
  it('the shim alone leaves every restored item as a JSON string (the bug the fix answers)', () => {
    const restored = host.hydrate(stored);
    expect(typeof restored[0].data).toBe('string');
    expect(restored[0].data.startsWith('{"body":')).toBe(true);
  });

  it('when the module arrives, the host announces it and the restored items are re-hydrated', () => {
    const restored = host.hydrate(stored);
    expect(host.rehydrate, 'the host has no re-hydrate helper').toBeTypeOf('function');
    new Function(SYNC)();
    expect(host.upgrades.length, 'the upgrade was not announced').toBe(1);
    const fixed = host.rehydrate(restored);
    expect(fixed[0].data.body).toBe(directions.data.body);
    expect(fixed[0].data.objectives.map((o) => o.id)).toEqual(directions.data.objectives.map((o) => o.id));
    expect(Array.isArray(fixed[1].data)).toBe(true);
    expect(fixed[1].data.length).toBe(glossary.data.length);
    expect(fixed[2].data).toBe('## Norms\n\nA norm is an agreement.');
    expect(fixed[2].dataEncoding).toBe('text/v1');
  });

  it('items that are already hydrated are left exactly as they are', () => {
    const good = [{ id: 'd', type: 'directions', data: directions.data }, { id: 't', type: 'simplified', data: 'Plain text.', dataEncoding: 'text/v1' }];
    expect(host.rehydrate(good)).toBe(good);
    expect(host.rehydrate([])).toEqual([]);
    expect(host.rehydrate(null)).toBe(null);
  });
});

describe('the directions normalizer reads a JSON string of { body, objectives }', () => {
  const normalize = new Function(NORMALIZE + ';\nreturn _alloNormalizeDirectionsData;')();
  it('a stringified directions object shows its body and goals, not raw JSON', () => {
    const out = normalize(JSON.stringify(directions.data));
    expect(out.body).toBe(directions.data.body);
    expect(out.objectives).toHaveLength(directions.data.objectives.length);
  });
  it('plain markdown and malformed JSON are still treated as the body', () => {
    expect(normalize('## Directions\n\nRead the text.')).toEqual({ body: '## Directions\n\nRead the text.', objectives: [], softGate: false });
    expect(normalize('{ not json').body).toBe('{ not json');
    expect(normalize('{"objectives":[]}').body).toBe('{"objectives":[]}');
  });
});

describe('the app wiring and the generated App.jsx carry the same fix', () => {
  it('the app subscribes to the upgrade and re-hydrates its history', () => {
    expect(ANTI).toMatch(/window\.addEventListener\('allo-firestore-sync-upgraded', onFirestoreSyncUpgraded\)/);
    expect(ANTI).toMatch(/setHistory\(prev => _alloRehydrateShimHistory\(prev\)\)/);
  });
  it('App.jsx matches AlloFlowANTI.txt in each of the three places', () => {
    for (const [from, to] of [
      ['function _alloNormalizeDirectionsData(data) {', "    if (data && typeof data === 'object' && !Array.isArray(data)) {"],
      ["    console.log('[FirestoreSync] Monolith shim upgraded from CDN module.');", '// Shim for safety_checker_module.js'],
      ['    const onFirestoreSyncUpgraded', '  }, []);'],
    ]) {
      if (!process.env.ANTI_PATH) expect(slice(APP, from, to)).toBe(slice(ANTI, from, to));
    }
  });
});
