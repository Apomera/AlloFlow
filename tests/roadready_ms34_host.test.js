import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';

// Round 34, lane mastery (ms34). The STEAM Lab host and the new mastery shape.
// - The host's Road Ready allowlist keeps permit mastery keyed by question id (1-4 digits) with only a
//   count, and still refuses anything that could hold typed text: text keys, names, dates, whitespace.
// - A failed host write raises a flag, so Road Ready stops saying "this device keeps your progress".
// - The Mastery Atlas tile counts question ids in the device copy (old text keys left over are not counted).
// The host's real save code is cut from the hub (as tests/roadready_ps32_host_persist.test.js does), and
// the real hub catalog is mounted for the atlas.

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const HUB = process.env.STEM_HUB || 'stem_lab/stem_lab_module.js';
const KEY = 'alloflow_stemlab_v2';
const HUB_SRC = readFileSync(HUB, 'utf8');
const TOOL_SRC = readFileSync(TOOL, 'utf8');
const cut = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b); if (i === -1 || j === -1) throw new Error('marker missing: ' + a); return src.slice(i, j); };
function memoryStorage(failWrites) {
  const map = new Map();
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => { if (failWrites) throw new DOMException('quota', 'QuotaExceededError'); map.set(k, String(v)); }, removeItem: (k) => { map.delete(k); }, map };
}
function loadHub(storage) {
  const code = cut(HUB_SRC, '// BEEHIVE_PERSISTENCE_HELPER_START', '// BEEHIVE_PERSISTENCE_HELPER_END') + cut(HUB_SRC, '// STEM_AUTOSAVE_START', '// STEM_AUTOSAVE_END');
  const win = new EventTarget(), doc = new EventTarget();
  doc.hidden = false;
  const store = storage || memoryStorage();
  const api = Function('window', 'document', 'localStorage', 'JSON', code +
    '\nreturn { createSaver: _createStemAutosave, hydrate: _stemHydrateLabToolData, road: _ROAD_READY_SAVED };')(win, doc, store, JSON);
  api.storage = store; api.win = win;
  return api;
}
function written(toolData, storage) {
  const hub = loadHub(storage);
  const saver = hub.createSaver();
  saver.queue(Object.assign({ _persisted: true }, toolData));
  saver.flush();
  saver.dispose();
  return { raw: hub.storage.getItem(KEY) || '', win: hub.win };
}
function allStrings(v, out = []) {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => allStrings(x, out));
  else if (v && typeof v === 'object') Object.keys(v).forEach((k) => { out.push(k); allStrings(v[k], out); });
  return out;
}
let H, React, ReactDOMClient, BANK;
beforeAll(async () => {
  window.__RR_TEST_EXPORTS__ = {};
  H = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ React, ReactDOMClient } = H);
  H.resetStemLab();
  H.loadTool(TOOL, 'roadReady');
  BANK = window.__RR_TEST_EXPORTS__.roadReady.PERMIT_BANK;
});

const NAME = 'Maria Lopez-Ortiz';
const mastery = () => ({
  12: { firstCorrectAt: '2026-10-01T12:00:00.000Z', lastCorrectAt: '2026-10-02T12:00:00.000Z', correctCount: 3, category: 'general' },
  200: { correctCount: 1 },
  7: true,
  [NAME]: { correctCount: 2 }, Maria: true, 'What does a flashing red traffic light mean?': { correctCount: 1 },
  12345: { correctCount: 1 }, '-3': { correctCount: 1 }, ' 14': true, 15: 'Maria', 16: { correctCount: 'Maria' }, 17: { correctCount: 5, note: NAME },
});

describe('ms34 host: permit mastery by question id is kept, typed text never', () => {
  it('a save keeps ids and counts only: no question text, no name, no date, no whitespace', () => {
    const { raw } = written({ roadReady: { tourCompleted: true, permitMastery: mastery() } });
    const pm = JSON.parse(raw).roadReady.permitMastery;
    expect(pm, 'the host keeps permit mastery').toBeTruthy();
    expect(Object.keys(pm).sort()).toEqual(['12', '16', '17', '200', '7']);
    expect(pm['12']).toEqual({ correctCount: 3 });
    expect(pm['7']).toEqual({});
    expect(pm['17']).toEqual({ correctCount: 5 });
    expect(pm['16']).toEqual({});
    [NAME, 'Maria', 'flashing red', '2026-10-01', 'general', 'note'].forEach((s) => expect(raw.includes(s), s).toBe(false));
    allStrings(JSON.parse(raw).roadReady.permitMastery).forEach((s) => {
      expect(/\s/.test(s), JSON.stringify(s)).toBe(false);
      expect(/^\d{1,4}$/.test(s) || s === 'correctCount', JSON.stringify(s)).toBe(true);
    });
  });
  it('a hand-edited stored blob loses everything but ids and counts on the way back in', () => {
    const hub = loadHub();
    const state = hub.hydrate({}, JSON.parse(JSON.stringify({ roadReady: { tourCompleted: true, permitMastery: mastery() } })));
    const pm = state.roadReady.permitMastery;
    expect(Object.keys(pm).sort()).toEqual(['12', '16', '17', '200', '7']);
    expect(JSON.stringify(state).includes('Maria')).toBe(false);
  });
  it('an old map keyed only by question text writes no mastery at all; garbage never throws', () => {
    const textOnly = { [BANK[3].q]: { correctCount: 1 }, [BANK[9].q]: { correctCount: 1 } };
    const { raw } = written({ roadReady: { tourCompleted: true, permitMastery: textOnly } });
    expect('permitMastery' in JSON.parse(raw).roadReady).toBe(false);
    const hub = loadHub();
    for (const bad of [null, 'x', 7, [], [1, 2], { 1: null }, JSON.parse('{"__proto__": {"correctCount": 1}, "constructor": {"correctCount": 1}}'), { ['9'.repeat(5000)]: true }]) {
      expect(() => hub.road.permitMastery(bad), JSON.stringify(bad)).not.toThrow();
      const c = hub.road.permitMastery(bad);
      expect(c === undefined || Object.keys(c).length === 0, JSON.stringify(bad)).toBe(true);
    }
    expect(({}).correctCount).toBeUndefined();
  });
  it('at most 2000 ids are kept, and only 1-4 digit keys', () => {
    const many = {};
    for (let i = 0; i < 3000; i++) many[String(i)] = { correctCount: 1 };
    const c = loadHub().road.permitMastery(many);
    expect(Object.keys(c).length).toBe(2000);
    expect(Object.keys(c).every((k) => /^\d{1,4}$/.test(k))).toBe(true);
  });
});

describe('ms34 host: a failed write is reported', () => {
  it('the saver flags a write that throws (storage full or blocked), and a working write does not', () => {
    const ok = written({ roadReady: { tourCompleted: true } });
    expect(ok.win.__alloStemSaveWriteFailed).toBeUndefined();
    const bad = written({ roadReady: { tourCompleted: true } }, memoryStorage(true));
    expect(bad.win.__alloStemSaveWriteFailed).toBe(true);
  });
});

// ── the atlas tile, on the real hub catalog ──
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const Icon = () => null;
let root, host;
function Harness() {
  const [stemLabTool, setStemLabTool] = React.useState(null);
  const [stemLabTab, setStemLabTab] = React.useState('explore');
  const [labToolData, setLabToolData] = React.useState({});
  const base = {
    labToolData, setLabToolData, toolSnapshots: [], addToast: () => {}, t: () => undefined,
    stemLabTool, setStemLabTool, stemLabTab, setStemLabTab, setShowStemLab: () => {}, showStemLab: true,
    activeStation: null, callGemini: null, callTTS: () => new Promise(() => {}), isTeacherMode: false,
  };
  const props = new Proxy(base, {
    get(target, key) {
      if (key in target) return target[key];
      if (typeof key === 'string' && /^[A-Z]/.test(key)) return Icon;
      if (typeof key === 'string' && /^(set|handle|on)[A-Z]/.test(key)) return () => {};
      return undefined;
    },
  });
  return window.AlloModules.StemLab(props);
}
async function openHub() {
  global.React = window.React = React;
  window.AlloModules = {};
  window.__alloT = (k, fb) => fb || k;
  if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
  delete window.StemLab; delete window.__stemPluginComponents;
  new Function(HUB_SRC)();
  new Function(TOOL_SRC)();
  host = document.createElement('div');
  document.body.append(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(async () => root.render(React.createElement(Harness)));
  for (let i = 0; i < 4; i++) await React.act(async () => { await sleep(0); });
}
const tile = () => [...host.querySelectorAll('button[aria-label]')].find((b) => /^Permit Mastery: /.test(b.getAttribute('aria-label')));
describe('ms34 host: the Mastery Atlas counts question ids', () => {
  beforeEach(() => { localStorage.clear(); delete window.__alloflowRoadReady; delete window.__alloflowRoadReadyBank; vi.spyOn(console, 'log').mockImplementation(() => {}); vi.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(async () => { if (root) await React.act(async () => root.unmount()); host?.remove(); root = host = null; localStorage.clear(); vi.restoreAllMocks(); });
  it('a device copy with ids and leftover old text keys: the tile counts the ids', async () => {
    const m = { 3: { correctCount: 1 }, 40: { correctCount: 2 }, 250: { correctCount: 1 }, 'A question text from an old version, kept as it was:': { correctCount: 1 }, 'Another old one?': { correctCount: 1 } };
    localStorage.setItem('roadReady.permitMastery.v1', JSON.stringify(m));
    await openHub();
    expect(tile(), 'Road Ready tile').toBeTruthy();
    expect(tile().getAttribute('aria-label')).toBe('Permit Mastery: 3 of 257 mastered. Click to open.');
  });
});
