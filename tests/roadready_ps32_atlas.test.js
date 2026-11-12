import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';

// Round 32, lane persist. The STEAM Lab "Mastery Atlas" tile for Road Ready said "N / 185".
// The permit bank now has 261 questions, 4 retired: 257 live. The hub shows the number the tool
// publishes (window.__alloflowRoadReadyBank) once the tool has run, and 257 before that. This file
// pins that fallback against the tool's real bank, and mounts the REAL hub catalog to read the tile.

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
const HUB = process.env.STEM_HUB || 'stem_lab/stem_lab_module.js';
const HUB_SRC = readFileSync(HUB, 'utf8');
const TOOL_SRC = readFileSync(TOOL, 'utf8');
let H, React, ReactDOMClient, permit;
beforeAll(async () => {
  window.__RR_TEST_EXPORTS__ = {};
  H = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ React, ReactDOMClient } = H);
  H.resetStemLab();
  H.loadTool(TOOL, 'roadReady');
  permit = window.__RR_TEST_EXPORTS__.roadReadyPermit;
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const Icon = () => null;
let root, host, live;
function Harness({ tool }) {
  const [stemLabTool, setStemLabTool] = React.useState(tool || null);
  const [stemLabTab, setStemLabTab] = React.useState('explore');
  const [labToolData, setLabToolData] = React.useState({});
  live = { setStemLabTool, labToolData, setLabToolData };
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
const flush = async () => { for (let i = 0; i < 4; i++) await React.act(async () => { await sleep(0); }); };
async function openHub(tool) {
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
  await React.act(async () => root.render(React.createElement(Harness, { tool })));
  await flush();
}
const tile = () => [...host.querySelectorAll('button[aria-label]')].find((b) => /^Permit Mastery: /.test(b.getAttribute('aria-label')));
beforeEach(() => { localStorage.clear(); delete window.__alloflowRoadReady; delete window.__alloflowRoadReadyBank; vi.spyOn(console, 'log').mockImplementation(() => {}); vi.spyOn(console, 'warn').mockImplementation(() => {}); });
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  host?.remove(); root = host = null;
  localStorage.clear(); delete window.__alloflowRoadReady; delete window.__alloflowRoadReadyBank;
  vi.restoreAllMocks();
});

describe('Mastery Atlas: the Road Ready permit total (ps32)', () => {
  it('the hub no longer says 185, and its fallback is the number of live questions in the tool', () => {
    const entry = HUB_SRC.slice(HUB_SRC.indexOf("{ id: 'roadReady', icon: '🚗', label: t('stem.roadready.permit_mastery')"), HUB_SRC.indexOf("{ id: 'assessmentLiteracy'"));
    expect(entry).toContain("lsKey: 'roadReady.permitMastery.v1'");
    expect(entry).not.toMatch(/\b185\b/);
    const m = entry.match(/^\s+total: (\d+),$/m);
    expect(m, 'the fallback number').toBeTruthy();
    expect(Number(m[1])).toBe(permit.PERMIT_ACTIVE_COUNT);
    expect(permit.PERMIT_ACTIVE_COUNT).toBe(permit.rrPermitPool((k, fb) => fb).length);
    expect(permit.PERMIT_ACTIVE_COUNT).toBe(257);
  });

  it('before the tool has run: the tile reads the device copy and shows it against 257', async () => {
    const pool = permit.rrPermitPool((k, fb) => fb);
    const mastery = {}; pool.slice(0, 12).forEach((q) => { mastery[q.q] = true; });
    localStorage.setItem('roadReady.permitMastery.v1', JSON.stringify(mastery));
    await openHub(null);
    const t = tile();
    expect(t, 'Road Ready tile in the atlas').toBeTruthy();
    expect(t.getAttribute('aria-label')).toBe('Permit Mastery: 12 of 257 mastered. Click to open.');
    expect(t.textContent).toContain('12 / 257');
  });

  it('no mastery saved: no Road Ready tile; a damaged device copy: no tile and no crash', async () => {
    await openHub(null);
    expect(tile()).toBeUndefined();
    await React.act(async () => root.unmount()); host.remove(); root = host = null;
    for (const bad of ['"x"', '7', '[1,2,3]', '{not json', 'null']) {
      localStorage.setItem('roadReady.permitMastery.v1', bad);
      await openHub(null);
      expect(tile(), bad).toBeUndefined();
      expect(host.textContent.length).toBeGreaterThan(100);
      await React.act(async () => root.unmount()); host.remove(); root = host = null;
    }
  });

  it('after the tool has run: the tile uses the tool\'s live total and counts only answers that match a live question', async () => {
    const pool = permit.rrPermitPool((k, fb) => fb);
    const mastery = { 'An old question that was reworded?': true, 'Another stem that no longer exists:': true };
    pool.slice(0, 5).forEach((q) => { mastery[q.q] = true; });
    localStorage.setItem('roadReady.permitMastery.v1', JSON.stringify(mastery));
    localStorage.setItem('alloflow_stemlab_v2', JSON.stringify({ roadReady: { tourCompleted: true } }));
    await openHub('roadReady');
    await React.act(async () => { await sleep(50); });
    const bank = window.__alloflowRoadReadyBank;
    expect(bank, 'the tool publishes its bank').toBeTruthy();
    expect(bank.total).toBe(permit.PERMIT_ACTIVE_COUNT);
    expect(bank.mastered).toBe(5);
    expect(bank.of).toBe(window.__alloflowRoadReady.permitMastery);
    // back to the catalog
    await React.act(async () => { live.setStemLabTool(null); });
    await flush();
    const t = tile();
    expect(t, 'Road Ready tile in the atlas').toBeTruthy();
    expect(t.getAttribute('aria-label')).toBe('Permit Mastery: 5 of 257 mastered. Click to open.');
    // a different bank size in a later release shows without a hub change
    window.__alloflowRoadReadyBank = { total: 300, mastered: 5, of: window.__alloflowRoadReady.permitMastery };
    await React.act(async () => { live.setLabToolData((p) => Object.assign({}, p, { _tick: 1 })); });
    await flush();
    expect(tile().getAttribute('aria-label')).toBe('Permit Mastery: 5 of 300 mastered. Click to open.');
    // the tool's count belongs to one mastery map: a project load that swaps the map falls back to counting its keys
    window.__alloflowRoadReady = { permitMastery: { a: true, b: true, c: true } };
    await React.act(async () => { live.setLabToolData((p) => Object.assign({}, p, { _tick: 2 })); });
    await flush();
    expect(tile().getAttribute('aria-label')).toBe('Permit Mastery: 3 of 300 mastered. Click to open.');
    // a nonsense total never reaches the tile
    window.__alloflowRoadReadyBank = { total: 'lots', mastered: -4 };
    await React.act(async () => { live.setLabToolData((p) => Object.assign({}, p, { _tick: 3 })); });
    await flush();
    expect(tile().getAttribute('aria-label')).toBe('Permit Mastery: 3 of 257 mastered. Click to open.');
  });
});
