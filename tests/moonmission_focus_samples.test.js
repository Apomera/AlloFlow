// Moon Mission — focus follows the mission, and a moonwalk sample is banked once.
//
//   • The tool has no hooks, so nothing moved focus when a click changed the phase:
//     the button pressed was gone a frame later and focus fell to <body>, sending a
//     keyboard or screen-reader student back to the top with no word about where
//     they were. The same happened when a mission event appeared, and after a
//     decision. These mount the tool for real, click the real buttons, and check
//     where document.activeElement ends up.
//   • Rebuilding the moonwalk scene (Retry 3D Mode) put every rock back, and the
//     collection was counted by list length: the same four pickups read as
//     "8 / 8 sample types", earned the collector badge and paid their XP twice, and
//     the geology-traverse specimen counted as one of the eight types.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Overridable so a mutation can run against a COPY; other sessions edit this file.
const FILE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';
const ID = 'moonMission';
const noop = () => {};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// A 2D context that accepts every call: the phase canvases draw their first frame
// synchronously in their ref, and none of that is under test here.
function looseContext() {
  const target = { canvas: { width: 300, height: 150 } };
  return new Proxy(target, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'measureText') return (s) => ({ width: String(s).length * 6 });
      if (typeof k !== 'string') return undefined;
      return () => ({ addColorStop: noop, setTransform: noop });
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}

describe('Moon Mission focus management', () => {
  let host, root, saved;

  async function mountLive(state) {
    loadTool(FILE, ID);
    const config = window.StemLab._registry[ID];
    function Host() {
      const [toolData, setToolData] = React.useState({ moonMission: state });
      window.__mmData = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    }
    root = ReactDOMClient.createRoot(host);
    await React.act(async () => { root.render(React.createElement(Host)); await Promise.resolve(); });
  }
  const buttonByText = (re) => Array.from(host.querySelectorAll('button')).find((b) => re.test(b.textContent || ''));
  async function click(el) {
    await React.act(async () => { el.click(); await Promise.resolve(); });
    await React.act(async () => { await wait(250); });   // the focus helper polls every 50 ms
  }

  beforeEach(() => {
    resetStemLab();
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    host = document.createElement('div');
    host.setAttribute('data-moonmission-tool', 'true');
    document.body.appendChild(host);
    saved = {
      getContext: window.HTMLCanvasElement.prototype.getContext,
      raf: globalThis.requestAnimationFrame,
      caf: globalThis.cancelAnimationFrame,
      ro: globalThis.ResizeObserver,
    };
    window.HTMLCanvasElement.prototype.getContext = () => looseContext();
    globalThis.requestAnimationFrame = window.requestAnimationFrame = () => 1;
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = noop;
    globalThis.ResizeObserver = window.ResizeObserver = class { observe() {} disconnect() {} };
  });

  afterEach(async () => {
    if (root) await React.act(async () => root.unmount());
    root = null;
    host.remove();
    window.HTMLCanvasElement.prototype.getContext = saved.getContext;
    globalThis.requestAnimationFrame = window.requestAnimationFrame = saved.raf;
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = saved.caf;
    globalThis.ResizeObserver = window.ResizeObserver = saved.ro;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    vi.restoreAllMocks();
  });

  it('after splashdown, focus lands on the debrief heading, not on <body>', async () => {
    await mountLive({ missionPhase: 9, reentryStatus: 4 });
    const done = buttonByText(/Splashdown|Complete Mission|Welcome home/i) ||
      Array.from(host.querySelectorAll('button')).find((b) => /Pacific Ocean splashdown/.test(b.title || ''));
    expect(done, 'splashdown button not found').toBeTruthy();
    done.focus();
    await click(done);
    expect(window.__mmData.moonMission.missionPhase).toBe(10);
    const ae = document.activeElement;
    expect(ae && ae.getAttribute('data-moonmission-phase-heading'), 'focus fell to ' + (ae && ae.tagName)).toBe('10');
  });

  it('Fly Another Mission puts focus on the briefing heading', async () => {
    await mountLive({ missionPhase: 10 });
    const again = buttonByText(/Fly Another Mission/);
    expect(again).toBeTruthy();
    again.focus();
    await click(again);
    expect(window.__mmData.moonMission.missionPhase).toBe(0);
    expect(document.activeElement.getAttribute('data-moonmission-phase-heading')).toBe('0');
  });

  it('a mission event takes focus, then its outcome, then the next phase', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);          // the descent events always fire
    await mountLive({ missionPhase: 4, difficulty: 'pilot', orbitStatus: 3 });
    const undock = Array.from(host.querySelectorAll('button')).find((b) => /Undock Lunar Module Eagle/.test(b.title || ''));
    expect(undock, 'undock button not found').toBeTruthy();
    expect(undock.disabled).toBe(false);
    undock.focus();
    await click(undock);
    const card = host.querySelector('[data-moonmission-event-card]');
    expect(card, 'no event fired').toBeTruthy();
    expect(document.activeElement).toBe(card);

    const option = card.querySelector('button');
    await click(option);
    const outcome = host.querySelector('[data-moonmission-event-outcome]');
    expect(outcome).toBeTruthy();
    expect(document.activeElement).toBe(outcome);

    await click(buttonByText(/Continue Mission/));
    expect(window.__mmData.moonMission.missionPhase).toBe(5);
    expect(document.activeElement.getAttribute('data-moonmission-phase-heading')).toBe('5');
  });

  it('never takes focus from a canvas the student has already moved to', async () => {
    await mountLive({ missionPhase: 9, reentryStatus: 4 });
    const cv = document.createElement('canvas');
    cv.tabIndex = 0;
    host.appendChild(cv);
    const done = Array.from(host.querySelectorAll('button')).find((b) => /Pacific Ocean splashdown/.test(b.title || ''));
    await React.act(async () => { done.click(); cv.focus(); await Promise.resolve(); });
    await React.act(async () => { await wait(250); });
    expect(document.activeElement).toBe(cv);
  });
});

describe('Moon Mission sample bag', () => {
  beforeEach(() => resetStemLab());
  const P = () => { loadTool(FILE, ID); return window.MoonMissionPure; };
  const rock = (i, name) => ({ key: 'sample:' + i, name, type: 'x', icon: '', fact: '' });

  it('counts distinct rock types: a re-collected rock and the traverse specimen do not count', () => {
    const pure = P();
    const four = [rock(0, 'Anorthosite'), rock(1, 'Basalt'), rock(2, 'Breccia'), rock(3, 'Regolith Core')];
    expect(pure.sampleTypeCount(four.concat(four))).toBe(4);
    expect(pure.distinctSamples(four.concat(four))).toHaveLength(4);
    const seven = four.concat([rock(4, 'Orange Soil'), rock(5, 'KREEP Basalt'), rock(6, 'Impact Glass')]);
    expect(pure.sampleTypeCount(seven.concat([{ key: 'traverse', name: 'Traverse Breccia' }]))).toBe(7);
    // Older saves carry no key: matched by name, and the traverse name is not a type.
    const legacy = [{ name: 'Basalt' }, { name: 'Basalt' }, { name: 'Traverse Breccia' }];
    expect(pure.sampleTypeCount(legacy)).toBe(1);
  });

  it('a save that banked the same four rocks twice shows 4 / 8 and no complete collection', () => {
    P();
    const four = [rock(0, 'Anorthosite'), rock(1, 'Basalt'), rock(2, 'Breccia'), rock(3, 'Regolith Core')];
    const html = renderTool(ID, { moonMission: { missionPhase: 10, lunarSamples: four.concat(four) } });
    expect(html).toContain('LUNAR SAMPLE COLLECTION (4/8)');
    expect(html, 'the dashboard Samples tile').not.toContain('>8/8<');
    expect(html).not.toContain('COMPLETE COLLECTION');
    expect(html).not.toMatch(/LUNAR SAMPLE COLLECTION \(8\/8\)/);
  });

  it('seven rock types plus the traverse specimen is 7 / 8 everywhere, not a complete set', () => {
    P();
    const seven = ['Anorthosite', 'Basalt', 'Breccia', 'Regolith Core', 'Orange Soil', 'KREEP Basalt', 'Impact Glass']
      .map((n, i) => rock(i, n));
    const bag = seven.concat([{ key: 'traverse', name: 'Traverse Breccia', type: 'Field Geology Sample', icon: '', fact: '' }]);
    const html = renderTool(ID, { moonMission: { missionPhase: 10, lunarSamples: bag } });
    expect(html).toContain('LUNAR SAMPLE COLLECTION (7/8)');
    expect(html, 'the dashboard Samples tile').toContain('>7/8<');
    expect(html).not.toContain('>8/8<');
    expect(html).not.toContain('COMPLETE COLLECTION');
  });

  it('the moonwalk scene leaves banked rocks collected and never banks one twice', () => {
    const src = require('node:fs').readFileSync(FILE, 'utf8');
    // Behaviour lives in the WebGL loop, which jsdom cannot run: pin the three hinges.
    expect(src).toMatch(/orbGroup\._collected = !!\(_evaBankedKeys\['sample:' \+ sdi\]/);
    expect(src).toMatch(/var evaSampleCount = lunarSampleOrbs\.filter\(function\(o\) \{ return o\._collected && !o\._isTraverseSample; \}\)\.length;/);
    expect(src).toMatch(/bag\.some\(function\(bs\) \{ return mmSampleKey\(bs\) === picked\.key; \}\) \? bag : bag\.concat\(\[picked\]\)/);
  });
});
