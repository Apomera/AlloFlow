import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

// First clicks while tools are still loading.
//
// 1. The background pump used to load nothing while the Launch Pad was up, then drain ~145
//    modules in source order once a door was chosen. The helpers that the first clicks wait on
//    (Load Project, Quick Start, Generate) sat at the END of that order, behind STEM Lab, SEL Hub,
//    Games and AlloBot, so an early click always waited. Now that small tier goes first, and it
//    alone trickles in behind the Launch Pad: one at a time, never under input, never hidden.
// 2. ui_strings.js (~11 MB) never fit the ~5 MB localStorage quota, so its cache never saved and
//    every visit showed blank labels until the network copy arrived. It is cached in IndexedDB,
//    and the language provider re-renders when strings land.
const ANTI_PATH = resolve(process.cwd(), process.env.FIRST_CLICK_ANTI || 'AlloFlowANTI.txt');
const ANTI = readFileSync(ANTI_PATH, 'utf8');

const slice = (from, to) => sliceBetween(ANTI, from, to, { file: 'AlloFlowANTI.txt' });

const PUMP_SOURCE = slice('    (function startDeferredModulePump() {', '\n    })();') + '\n    })();';
const FIRST_ACTION = (PUMP_SOURCE.match(/var FIRST_ACTION_MODULES = \[([\s\S]*?)\];/) || [, ''])[1]
  .split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean);

function makePump(options) {
  const settings = options || {};
  const timers = [];
  const listeners = {};
  const dispatched = [];
  const registry = Object.create(null);
  const queue = [];
  const names = Object.create(null);
  let clock = 0;
  let order = 0;
  const env = {
    performance: { now: () => clock },
    navigator: {},
    document: {
      get hidden() { return !!settings.hidden; },
      body: { classList: { contains: (name) => (settings.classes || new Set()).has(name) } },
    },
    window: { addEventListener: (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); }, requestIdleCallback: undefined },
    setTimeout: (fn, delay) => { timers.push({ fn, at: clock + (delay || 0), order: order++ }); return order; },
    __alloDeferredModuleQueue: queue,
    __alloDeferredModuleNames: names,
    __alloModuleRegistry: registry,
    __alloLoadModuleNow: (name) => { dispatched.push(name); registry[name] = { status: 'pending' }; },
  };
  const keys = Object.keys(env);
  // eslint-disable-next-line no-new-func
  new Function(...keys, PUMP_SOURCE)(...keys.map((key) => env[key]));
  return {
    dispatched, registry, settings,
    enqueue(list) { for (const name of list) { const entry = { name, url: './' + name + '.js' }; names[name] = entry; queue.push(entry); } },
    fire(type) { for (const fn of listeners[type] || []) fn(); },
    settle() { for (const key of Object.keys(registry)) registry[key].status = 'loaded'; },
    inFlight() { return Object.values(registry).filter((entry) => entry.status === 'pending').length; },
    runUntil(until, eachTick) {
      for (let guard = 0; guard < 20000; guard++) {
        let next = -1;
        for (let i = 0; i < timers.length; i++) {
          if (next === -1 || timers[i].at < timers[next].at || (timers[i].at === timers[next].at && timers[i].order < timers[next].order)) next = i;
        }
        if (next === -1 || timers[next].at > until) break;
        const timer = timers.splice(next, 1)[0];
        clock = timer.at;
        if (eachTick) eachTick(clock);
        timer.fn();
      }
      clock = Math.max(clock, until);
    },
  };
}

// Source order as boot queues it: big hubs first, the first-action helpers last.
const SOURCE_ORDER = ['StemLab', 'StudentAnalytics', 'SelHub', 'GamesBundle', 'AlloBot', 'TeacherModule',
  'MiscHandlersModule', 'PhaseOHandlersModule', 'GenDispatcherModule', 'PhaseKHelpersModule'];
const LAUNCH_PAD = new Set(['alloflow-launchpad-active', 'alloflow-workspace-concealed']);

describe('first-action modules load first', () => {
  it('names a real tier the host actually queues at boot', () => {
    expect(FIRST_ACTION.length, 'FIRST_ACTION_MODULES list not found in the pump').toBeGreaterThan(8);
    const bootCritical = slice('const __alloBootCriticalModules = new Set([', ']);');
    for (const name of FIRST_ACTION) {
      expect(bootCritical.includes("'" + name + "'"), name + ' is boot-critical already; listing it does nothing').toBe(false);
      const lines = ANTI.split('\n').filter((line) => line.includes("loadModule('" + name + "', "));
      const queuedAtBoot = lines.some((line) => {
        if (line.startsWith("    loadModule('" + name + "', ")) return true;
        const loader = (line.match(/^ {4}window\.(__allo\w+) = /) || [])[1];
        return !!loader && ANTI.includes('\n    window.' + loader + '();');
      });
      expect(queuedAtBoot, name + ' is not a module boot queues (typo, rename or lazy-only)').toBe(true);
    }
  });

  it('behind the launch pad, only the tier loads, one at a time', () => {
    const pump = makePump({ classes: LAUNCH_PAD });
    pump.enqueue(SOURCE_ORDER);
    let maxInFlight = 0;
    pump.runUntil(20000, () => { maxInFlight = Math.max(maxInFlight, pump.inFlight()); if (pump.inFlight()) pump.settle(); });
    expect(pump.dispatched.sort(), 'the tier did not load behind the launch pad, or something else did')
      .toEqual(['GenDispatcherModule', 'MiscHandlersModule', 'PhaseKHelpersModule', 'PhaseOHandlersModule']);
    expect(maxInFlight, 'behind the launch pad the trickle is one module at a time').toBe(1);
  });

  it('behind the launch pad, input stops the trickle outright', () => {
    const pump = makePump({ classes: LAUNCH_PAD });
    pump.enqueue(SOURCE_ORDER);
    pump.runUntil(30000, () => pump.fire('pointerdown'));
    expect(pump.dispatched, 'modules loaded behind the launch pad while someone was clicking').toEqual([]);
  });

  it('a hidden tab stays parked, tier or not', () => {
    const pump = makePump({ classes: LAUNCH_PAD, hidden: true });
    pump.enqueue(SOURCE_ORDER);
    pump.runUntil(20000);
    expect(pump.dispatched).toEqual([]);
  });

  it('the splash (workspace concealed, no launch pad) stays parked', () => {
    const pump = makePump({ classes: new Set(['alloflow-workspace-concealed']) });
    pump.enqueue(SOURCE_ORDER);
    pump.runUntil(20000);
    expect(pump.dispatched).toEqual([]);
  });

  it('once a door opens the workspace, the tier goes before source order', () => {
    const pump = makePump();
    pump.enqueue(SOURCE_ORDER);
    pump.runUntil(60000, () => { if (pump.inFlight()) pump.settle(); });
    expect(pump.dispatched.length).toBe(SOURCE_ORDER.length);
    const lastTier = Math.max(...['MiscHandlersModule', 'PhaseOHandlersModule', 'GenDispatcherModule', 'PhaseKHelpersModule'].map((n) => pump.dispatched.indexOf(n)));
    const firstOther = Math.min(...['StemLab', 'StudentAnalytics', 'SelHub', 'GamesBundle', 'AlloBot', 'TeacherModule'].map((n) => pump.dispatched.indexOf(n)));
    expect(lastTier, 'a hub loaded before the helpers the first clicks wait on').toBeLessThan(firstOther);
    expect(pump.dispatched.indexOf('MiscHandlersModule'), 'Load Project waits on MiscHandlers: it goes first').toBe(0);
  });

  it('leaving the launch pad mid-trickle resumes the full queue', () => {
    const pump = makePump({ classes: new Set(LAUNCH_PAD) });
    pump.enqueue(SOURCE_ORDER);
    pump.runUntil(3000, () => { if (pump.inFlight()) pump.settle(); });
    pump.settings.classes = new Set();
    pump.runUntil(60000, () => { if (pump.inFlight()) pump.settle(); });
    expect(new Set(pump.dispatched).size).toBe(SOURCE_ORDER.length);
    expect(pump.dispatched.length).toBe(SOURCE_ORDER.length);
  });
});

// ── strings cache ──────────────────────────────────────────────────────────────────────────────
const STRINGS_SOURCE = slice('// __ALLO_UI_STRINGS_IDB_BEGIN__', 'const _scheduleRemoteStringsRefresh');

function fakeIndexedDB(initial, opts) {
  const data = Object.assign({}, initial || {});
  const settings = opts || {};
  let created = Object.keys(data).length > 0;
  const log = { puts: 0, gets: 0 };
  const api = {
    open() {
      const req = {};
      if (settings.hang) return req;
      setTimeout(() => {
        if (settings.failOpen) { if (req.onerror) req.onerror(); return; }
        const db = {
          createObjectStore() {},
          close() {},
          transaction() {
            const tx = {};
            const done = () => setTimeout(() => tx.oncomplete && tx.oncomplete());
            tx.objectStore = () => ({
              get(key) { log.gets++; const r = {}; setTimeout(() => { r.result = data[key]; done(); }); return r; },
              put(value, key) { log.puts++; const r = {}; setTimeout(() => { data[key] = value; done(); }); return r; },
            });
            return tx;
          },
        };
        req.result = db;
        if (!created) { created = true; if (req.onupgradeneeded) req.onupgradeneeded(); }
        if (req.onsuccess) req.onsuccess();
      });
      return req;
    },
  };
  return { api, data, log };
}

function makeStrings({ idb, fetchText, legacy }) {
  const events = [];
  const fetched = [];
  const store = new Map(legacy ? [['alloflow_ui_strings_cache', legacy]] : []);
  const env = {
    window: { dispatchEvent: (event) => events.push(event.type), __alloCdnBase: 'https://cdn.test/', __alloBuildStamp: { hash: 'abc' } },
    indexedDB: idb ? idb.api : undefined,
    localStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      // Quota: anything past 2,000 characters throws, like an 11 MB ui_strings did.
      setItem: (key, value) => { if (String(value).length > 2000) throw new Error('QuotaExceededError'); store.set(key, String(value)); },
      removeItem: (key) => store.delete(key),
    },
    fetch: async (url) => {
      fetched.push(String(url));
      if (fetchText == null || !String(url).includes('ui_strings')) return { ok: false, status: 404 };
      return { ok: true, text: async () => fetchText };
    },
    // The 4 s IndexedDB give-up, shortened so the hang case stays quick.
    setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms === 4000 ? 200 : ms),
    console: { log() {}, warn() {}, error() {} },
    _alloParseUntrustedObject: () => null,
    Event: class { constructor(type) { this.type = type; } },
  };
  const keys = Object.keys(env);
  const body = 'let UI_STRINGS = {}; let HELP_STRINGS = {};\n' + STRINGS_SOURCE
    + '\nreturn { get strings() { return UI_STRINGS; }, get revision() { return _alloUiStringsRevision; },'
    + ' cacheRead: _alloUiStringsCacheRead, refresh: _refreshRemoteStrings };';
  // eslint-disable-next-line no-new-func
  const api = new Function(...keys, body)(...keys.map((key) => env[key]));
  return { api, events, store, fetched };
}

const V1 = JSON.stringify({ common: { save: 'Save' }, stem: { tool: 'Tool' } });
const V2 = JSON.stringify({ common: { save: 'Save work' }, stem: { tool: 'Tool' } });
const UPDATED = 'alloflow:ui-strings-updated';

describe('ui_strings cache in IndexedDB', () => {
  it('a cached copy applies at boot, before the network, and announces itself', async () => {
    const idb = fakeIndexedDB({ ui_strings: V1 });
    const s = makeStrings({ idb, fetchText: null });
    await s.api.cacheRead;
    expect(s.api.strings.common.save).toBe('Save');
    expect(s.events, 'the provider is never told the strings arrived').toContain(UPDATED);
    expect(s.api.revision).toBe(1);
    expect(s.fetched, 'the cache read must not wait on the network').toEqual([]);
  });

  it('a first visit stores the network copy and drops the stale localStorage one', async () => {
    const idb = fakeIndexedDB({});
    const s = makeStrings({ idb, fetchText: V1, legacy: JSON.stringify({ common: { save: 'Old' } }) });
    await s.api.cacheRead;
    await s.api.refresh();
    expect(s.api.strings.common.save).toBe('Save');
    expect(idb.data.ui_strings, 'the network copy was not cached').toBe(V1);
    expect(s.store.has('alloflow_ui_strings_cache'), 'the stale localStorage copy still eats quota').toBe(false);
    expect(s.events).toContain(UPDATED);
  });

  it('an unchanged network copy is not parsed, applied or written again', async () => {
    const idb = fakeIndexedDB({ ui_strings: V1 });
    const s = makeStrings({ idb, fetchText: V1 });
    await s.api.cacheRead;
    await s.api.refresh();
    expect(idb.log.puts, 'rewrote 11 MB to IndexedDB on every visit').toBe(0);
    expect(s.api.revision, 'unchanged strings re-rendered the app').toBe(1);
  });

  it('a refresh that starts before the cache read finishes still waits for it', async () => {
    const idb = fakeIndexedDB({ ui_strings: V1 });
    const s = makeStrings({ idb, fetchText: V1 });
    await s.api.refresh();
    expect(idb.log.puts, 'the refresh raced the cache read and rewrote an unchanged copy').toBe(0);
    expect(s.api.revision).toBe(1);
  });

  it('a changed network copy replaces the cached one', async () => {
    const idb = fakeIndexedDB({ ui_strings: V1 });
    const s = makeStrings({ idb, fetchText: V2 });
    await s.api.cacheRead;
    await s.api.refresh();
    expect(s.api.strings.common.save).toBe('Save work');
    expect(idb.data.ui_strings).toBe(V2);
    expect(s.api.revision).toBe(2);
  });

  it('a corrupt cached copy is ignored and then repaired', async () => {
    const idb = fakeIndexedDB({ ui_strings: '{"common": ' });
    const s = makeStrings({ idb, fetchText: V1 });
    await s.api.cacheRead;
    expect(s.api.revision).toBe(0);
    await s.api.refresh();
    expect(s.api.strings.common.save).toBe('Save');
    expect(idb.data.ui_strings).toBe(V1);
  });

  it('without IndexedDB (sandboxed frame) it still loads and falls back to localStorage', async () => {
    const s = makeStrings({ idb: null, fetchText: V1 });
    await s.api.cacheRead;
    await s.api.refresh();
    expect(s.api.strings.common.save).toBe('Save');
    expect(s.store.get('alloflow_ui_strings_cache')).toBe(V1);
  });

  it('an IndexedDB that never answers cannot hold the strings back', async () => {
    const s = makeStrings({ idb: fakeIndexedDB({}, { hang: true }), fetchText: V1 });
    await s.api.cacheRead;
    await s.api.refresh();
    expect(s.api.strings.common.save).toBe('Save');
  });

  it('the language provider re-renders on arrival without changing t', () => {
    const hook = slice('const useTranslation = (targetLanguage, apiKey) => {', '  return { t, isTranslating');
    expect(hook).toMatch(/addEventListener\('alloflow:ui-strings-updated', sync\)/);
    expect(hook, 'a missed event before mount must still sync').toMatch(/sync\(\);\s*\n\s*return \(\) => window\.removeEventListener\('alloflow:ui-strings-updated', sync\)/);
    // Effects keyed on t announce and narrate; a new t on arrival would repeat them at boot.
    expect(hook).toMatch(/\}, \[languagePack\]\);\s*$/);
  });
});
