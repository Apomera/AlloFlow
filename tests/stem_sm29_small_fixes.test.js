// Round 29, lane small: small STEAM Lab defects.
// 1) No global speechSynthesis.cancel() on AUTOMATIC paths (tool close, phase / scene / mode change)
//    unless the tool's own utterance is queued: cancel() is global, so it cut off Listen mode and
//    AlloBot even when the tool never spoke. Heat Lab, Skate Lab, Moon Mission, Geology Explorer.
// 2) Duplicate object keys (esbuild warns; Gemini Canvas refuses ANTI with warnings): Cell frame
//    style (position:relative was lost, so the absolute fullscreen button was placed against an
//    outer element), Cell canvas aria-keyshortcuts, Dissection aria-labels, Data Plot style, and
//    same-value duplicates in Aquaculture, Aquarium, Print Lab, Road Ready, Singing (class member).
// 3) Rocks: label lookups pass the English name explicitly (raw keys never show).
// Tools load from process.env.STEM_TOOL_DIR || 'stem_lab'.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const require = createRequire(import.meta.url);
const DIR = process.env.STEM_TOOL_DIR || 'stem_lab';
const file = (n) => path.join(DIR, 'stem_tool_' + n + '.js');
const src = (n) => fs.readFileSync(path.resolve(process.cwd(), file(n)), 'utf8');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flush = async () => { for (let i = 0; i < 4; i++) await React.act(async () => { await sleep(0); }); };

let synth, mounted = [], restore = [];
beforeEach(() => {
  resetStemLab();
  synth = { spoken: [], speak: vi.fn((u) => synth.spoken.push(u)), cancel: vi.fn() };
  window.speechSynthesis = synth;
  window.SpeechSynthesisUtterance = function (text) { this.text = text; };
  const gc = HTMLCanvasElement.prototype.getContext;
  const ctx2d = () => new Proxy({ measureText: (t) => ({ width: String(t).length * 7 }), createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), getImageData: () => ({ data: new Uint8ClampedArray(4) }) },
    { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
  HTMLCanvasElement.prototype.getContext = function (kind) { return kind === '2d' ? ctx2d() : null; };
  const mm = window.matchMedia;
  window.matchMedia = (q) => ({ matches: /reduce/.test(q), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
  restore = [() => { HTMLCanvasElement.prototype.getContext = gc; }, () => { window.matchMedia = mm; }];
});
afterEach(async () => {
  for (const m of mounted.splice(0)) { try { await React.act(async () => { m.root.unmount(); }); } catch (e) {} m.host.remove(); }
  restore.forEach((f) => f());
  delete window.speechSynthesis; delete window.SpeechSynthesisUtterance;
  vi.restoreAllMocks();
});

async function mount(name, id, initial, overrides = {}) {
  const cfg = loadTool(file(name), id);
  const box = { data: null };
  function Host() {
    const [toolData, setToolData] = React.useState(initial || {});
    box.data = toolData;
    return cfg.render(makeCtx(Object.assign({ toolData, setToolData }, overrides)));
  }
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  await React.act(async () => { root.render(React.createElement(Host)); });
  const m = { host, root, box, cfg };
  mounted.push(m);
  return m;
}
async function unmount(m) { await React.act(async () => { m.root.unmount(); }); m.host.remove(); mounted = mounted.filter((x) => x !== m); }
const click = async (el) => { await React.act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); await flush(); };

describe('1. automatic paths leave other speech alone (cancel only the tool\'s own utterance)', () => {
  it('Heat Lab: closing without having spoken does not cancel; after its own Read aloud it does', async () => {
    const m = await mount('heatlab', 'heatLab', {});
    await unmount(m);
    expect(synth.cancel, 'closed without speaking: global cancel would cut off AlloBot / Listen mode').not.toHaveBeenCalled();
    const m2 = await mount('heatlab', 'heatLab', {}, { callTTS: null });
    await click(m2.host.querySelector('[data-ht-read="curve"]'));
    expect(synth.speak).toHaveBeenCalledTimes(1);
    synth.cancel.mockClear();
    await unmount(m2);
    expect(synth.cancel, 'its own utterance is stopped on close').toHaveBeenCalledTimes(1);
  });

  it('Heat Lab: an utterance that already ended is not cancelled on close', async () => {
    const m = await mount('heatlab', 'heatLab', {}, { callTTS: null });
    await click(m.host.querySelector('[data-ht-read="curve"]'));
    synth.spoken[0].onend();
    synth.cancel.mockClear();
    await unmount(m);
    expect(synth.cancel).not.toHaveBeenCalled();
  });

  it('Skate Lab: closing without having spoken does not cancel', async () => {
    const m = await mount('skatelab', 'skatelab', { skatelab: { mode: 'halfpipe', viewMode: '2d' } });
    synth.cancel.mockClear();
    await unmount(m);
    expect(synth.cancel).not.toHaveBeenCalled();
  });

  it('Skate Lab: closing while its own browser voice reads a line cancels it', async () => {
    resetStemLab(); loadTool(file('skatelab'), 'skatelab');
    const physics = window.__alloSkatePhysicsPure;
    const m = await mount('skatelab', 'skatelab', { skatelab: { mode: 'halfpipe', viewMode: '2d', vehicle: 'skate', gravity: 9.81, pumps: 3, rotationTarget: 180, spinRate: 210, lastResult: physics.simHalfpipe({ pumps: 3, rotationTarget: 180, spinRate: 210 }) } }, { callTTS: null });
    const read = [...m.host.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Read the result aloud');
    expect(read, 'Read the result aloud button').toBeTruthy();
    await click(read);
    expect(synth.speak).toHaveBeenCalledTimes(1);
    synth.cancel.mockClear();
    await unmount(m);
    expect(synth.cancel).toHaveBeenCalledTimes(1);
  });

  // Moon Mission renders through hooks-free render(): drive the returned tree like moonmission_read_aloud.test.js.
  const mmTree = (ctxOver = {}, state = { missionPhase: 0 }) => {
    const store = newStore({ moonMission: Object.assign({ lunarSamples: [] }, state) });
    return window.StemLab._registry.moonMission.render(makeCtx(Object.assign({ toolData: store.toolData }, ctxOver), store));
  };
  const walk = (n, test, out = []) => {
    if (n == null || typeof n !== 'object') return out;
    if (Array.isArray(n)) { n.forEach((c) => walk(c, test, out)); return out; }
    if (n.props && test(n)) out.push(n.props);
    walk(n.props && n.props.children, test, out);
    return out;
  };
  const textOf = (n) => (n == null || typeof n === 'boolean' ? '' : typeof n !== 'object' ? String(n) : Array.isArray(n) ? n.map(textOf).join('') : textOf(n.props && n.props.children));

  it('Moon Mission: a phase change without its own speech does not cancel; it calls ctx.stopTTS (feature-detected)', () => {
    loadTool(file('moonmission'), 'moonMission');
    const stopTTS = vi.fn();
    const begin = walk(mmTree({ stopTTS }), (n) => n.type === 'button' && /Begin Mission/.test(textOf(n.props.children)))[0];
    expect(begin, 'Begin Mission button').toBeTruthy();
    synth.cancel.mockClear();
    begin.onClick();
    expect(synth.cancel, 'nothing of ours was speaking').not.toHaveBeenCalled();
    expect(stopTTS, 'host speech this tool asked for is stopped through the host').toHaveBeenCalledTimes(1);
    // Older host without stopTTS: no throw.
    const begin2 = walk(mmTree({ stopTTS: undefined }), (n) => n.type === 'button' && /Begin Mission/.test(textOf(n.props.children)))[0];
    expect(() => begin2.onClick()).not.toThrow();
  });

  it('Moon Mission: a phase change while its own read-aloud plays cancels it', () => {
    loadTool(file('moonmission'), 'moonMission');
    const tree = mmTree();
    const read = walk(tree, (n) => n.type === 'button' && n.props['data-moonmission-read-aloud'] === 'phase')[0];
    read.onClick();
    expect(synth.speak).toHaveBeenCalledTimes(1);
    synth.cancel.mockClear();
    walk(tree, (n) => n.type === 'button' && /Begin Mission/.test(textOf(n.props.children)))[0].onClick();
    expect(synth.cancel).toHaveBeenCalledTimes(1);
    // ...and only once: the next phase change has nothing of ours left to stop.
    walk(mmTree({}, { missionPhase: 1 }), (n) => n.type === 'button' && /Begin Mission/.test(textOf(n.props.children)));
    expect(window.MoonMissionPure.stopSpeech()).toBe(false);
  });

  const modeButton = (host, label) => [...host.querySelectorAll('[role="group"][aria-label="Investigation mode"] button')].find((b) => b.textContent.includes(label));

  it('Geology Explorer: a mode change or close without its own speech does not cancel', async () => {
    const m = await mount('geologyexplorer', 'geologyExplorer', { geologyExplorer: { scene: 'crust', mode: 'explore' } });
    synth.cancel.mockClear();
    await click(modeButton(m.host, 'Investigate'));
    expect(modeButton(m.host, 'Investigate').getAttribute('aria-pressed')).toBe('true');
    expect(synth.cancel, 'mode change').not.toHaveBeenCalled();
    await unmount(m);
    expect(synth.cancel, 'close').not.toHaveBeenCalled();
  });

  it('Geology Explorer: a mode change while its own browser read-aloud plays cancels it', async () => {
    const m = await mount('geologyexplorer', 'geologyExplorer', { geologyExplorer: { scene: 'crust', mode: 'explore' } }, { callTTS: null });
    await click(m.host.querySelector('[data-geology-read-aloud]'));
    expect(synth.speak).toHaveBeenCalledTimes(1);
    synth.cancel.mockClear();
    await click(modeButton(m.host, 'Investigate'));
    expect(synth.cancel).toHaveBeenCalledTimes(1);
    synth.cancel.mockClear();
    await unmount(m);
    expect(synth.cancel, 'already stopped: nothing of ours left').not.toHaveBeenCalled();
  });
});

describe('2. duplicate keys', () => {
  it('Cell: the fullscreen stage frame keeps position:relative, so the absolute button sits in its corner', () => {
    loadTool(file('cell'), 'cell');
    const html = renderTool('cell', { cell: { mode: 'interior', interiorCellType: 'animal', interiorPaused: true, _cellPicked: true, _cellCategory: 'interactive' } });
    const page = document.createElement('div');
    page.innerHTML = html;
    const frame = page.querySelector('[data-cell-canvas-frame]');
    expect(frame, 'frame rendered').toBeTruthy();
    expect(frame.getAttribute('data-allo-fs-stage')).toBe('true');
    expect(frame.style.position, 'frame is the containing block').toBe('relative');
    expect(frame.style.background, 'the dish background is kept').toMatch(/radial-gradient/);
    const btn = frame.querySelector('[data-allo-fs-btn]');
    expect(btn, 'fullscreen button inside the frame').toBeTruthy();
    expect(btn.closest('[data-allo-fs-stage]')).toBe(frame);
    expect(btn.style.position).toBe('absolute');
    expect(btn.style.top).toBe('8px');
    expect(btn.style.right).toBe('8px');
    // Now that the button really sits in the frame's corner, the diagram heading must leave room for it
    // (8px inset + up to 44px wide in touch mode), or it covers "EUKARYOTE" / "PROKARYOTE".
    // Inline, so it beats both stylesheet paddings (14px 16px, and 10px 12px on narrow screens).
    const heading = frame.querySelector('[data-cell-diagram-heading]');
    expect(heading, 'diagram heading').toBeTruthy();
    expect(parseFloat(heading.style.paddingRight), 'heading padding-right').toBeGreaterThanOrEqual(56);
  });

  it('Cell: the sim canvas has ONE aria-keyshortcuts carrying both the play keys and the anatomy keys', () => {
    const s = src('cell');
    const start = s.indexOf('"data-cell-sim-canvas": ""');
    const block = s.slice(start, s.indexOf('tabIndex: 0', start) + 400);
    const keys = block.match(/"aria-keyshortcuts":/g) || [];
    expect(keys.length).toBe(1);
    expect(block).toContain('"ArrowUp ArrowDown ArrowLeft ArrowRight W A S D"');
    expect(block).toContain('"ArrowLeft ArrowRight ArrowUp ArrowDown Home End Enter Escape"');
  });

  it('Dissection: each copy button has one aria-label, and it contains the visible label (label in name)', () => {
    const s = src('dissection');
    const report = s.slice(s.lastIndexOf('React.createElement("button"', s.indexOf("}, 'Copy lab report')")), s.indexOf("}, 'Copy lab report')"));
    expect((report.match(/"aria-label"/g) || []).length).toBe(1);
    expect(report).toContain("'Copy lab report to clipboard'");
    const endLog = s.indexOf("}, masteryComplete ? '\\uD83C\\uDF93 Copy verified summary' : 'Copy practice log')");
    expect(endLog).toBeGreaterThan(0);
    const log = s.slice(s.lastIndexOf('React.createElement("button"', endLog), endLog);
    expect((log.match(/"aria-label"/g) || []).length).toBe(1);
    expect(log).toContain('"Copy practice log to clipboard"');
  });

  it('Data Plot: the Log this draw button has one style, and it still carries chipStyle', () => {
    const s = src('dataplot');
    const end = s.indexOf("t('stem.dataplot.log_this_draw'");
    const btn = s.slice(s.lastIndexOf("h('button'", end), end);
    expect((btn.match(/\bstyle:/g) || []).length).toBe(1);
    expect(btn).toContain('}, chipStyle)');
  });

  it('Singing: ScorePlayer.seek still moves the play head (one definition)', () => {
    const s = src('singing');
    expect((s.match(/^\s*seek\(sec\) \{\s*$/gm) || []).length).toBe(1);
  });

  it('Print Lab keeps readPendingLocalHandoff on its pure API; Road Ready parking modes still get t', () => {
    const pl = src('printlab');
    expect((pl.match(/readPendingLocalHandoff: readPendingLocalHandoff/g) || []).length).toBe(1);
    const rr = src('roadready');
    expect(rr).toContain("return h(ParkingMode, { key: 'parking-mode', ctx: ctx, h: h, React: React, t: __alloT,");
    expect(rr).toContain("return h(ThreePointMode, { key: 'threepoint-mode', h: h, React: React, t: __alloT,");
  });

  it('every touched file parses and compiles with 0 esbuild warnings', () => {
    const names = ['heatlab', 'skatelab', 'moonmission', 'geologyexplorer', 'cell', 'dissection', 'dataplot', 'aquaculture', 'aquarium', 'printlab', 'roadready', 'singing', 'rocks'];
    for (const n of names) { const code = src(n); expect(() => new Function(code), n + ' parses').not.toThrow(); }
    // esbuild refuses to run inside jsdom (TextEncoder realm check), so it runs in a plain node child.
    const script = "const e=require(process.argv[1]),fs=require('fs'),o={};for(const [n,f] of JSON.parse(process.argv[2]))o[n]=e.transformSync(fs.readFileSync(f,'utf8'),{loader:'js',logLevel:'silent'}).warnings.map(w=>(w.location?w.location.line:'?')+': '+w.text);process.stdout.write(JSON.stringify(o));";
    const pairs = names.map((n) => [n, path.resolve(process.cwd(), file(n))]);
    const out = JSON.parse(require('node:child_process').execFileSync(process.execPath, ['-e', script, path.resolve(process.cwd(), 'node_modules/esbuild'), JSON.stringify(pairs)], { encoding: 'utf8', maxBuffer: 1 << 24 }));
    expect(out).toEqual({ heatlab: [], skatelab: [], moonmission: [], geologyexplorer: [], cell: [], dissection: [], dataplot: [], aquaculture: [], aquarium: [], printlab: [], roadready: [], singing: [], rocks: [] });
  });
});

describe('3. Rocks: English names when the translator returns the key', () => {
  const keyT = { t: (k) => k };
  // Rock Cycle's own t() (rockCycle render) already maps every one of its labelKeys to English when ctx.t
  // returns the key; passing a fallback there would change what ctx.t receives, so it is left as it is.
  it('the Rocks label lookups pass an explicit English fallback', () => {
    const s = src('rocks');
    expect(s).not.toMatch(/label: t\(r\.labelKey\),/);
    expect(s).not.toMatch(/t\('stem\.rocks\.' \+ entry\.rk\)/);
    expect(s).toContain("label: t(r.labelKey, rkFallbackLabels[r.labelKey]),");
    expect(s).toContain("t('stem.rocks.' + entry.rk, rkFallbackLabels['stem.rocks.' + entry.rk])");
  });
  it('Rocks and Rock Cycle show English rock and process names, never stem.* keys', () => {
    loadTool(file('rocks'), 'rocks');
    const rocks = renderTool('rocks', { rocks: { mode: 'rocks', selectedRock: 'granite' }, rockCycle: {} }, keyT);
    expect(rocks).toMatch(/Granite/);
    expect(rocks).toMatch(/Conglomerate/);
    expect(rocks).not.toMatch(/>stem\.rocks\.[a-z_]+</);
    const cycle = renderTool('rockCycle', {}, keyT);
    expect(cycle).toMatch(/Igneous/);
    expect(cycle).toMatch(/Weathering &amp; Erosion|Weathering & Erosion/);
    expect(cycle).not.toMatch(/>stem\.(rocks|rock_cycle)\.[a-z_]+</);
  });
});
