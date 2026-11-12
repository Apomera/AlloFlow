import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';

// Round 30, lane robust: the running drive.
// - Free Explore "World" buttons (Night / Rain / Snow / Fog) run in a LATER render than the one whose
//   scenario object the simulation loop captured, so they changed their own highlight and the saved
//   setting but never the drive. The loop now copies the saved setting onto its own object each frame.
// - One exception anywhere in a frame used to stop the drive for good (the frame re-armed itself on
//   its last line). The frame is now guarded: always re-armed, error kept for tests, logged once, and
//   after 3 failed frames in a row the drive pauses and shows a card (Resume / Back to menu).
// - Badges earned inside the loop were each built from an old copy of the badge map, so two awards
//   between two renders kept only the second.
// - A `keyup` without a string key (some autofill / IME events) threw inside the key handler.

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.ROADREADY_SOURCE || 'stem_lab/stem_tool_roadready.js';
let loadTool, resetStemLab, makeCtx, React, ReactDOMClient;
beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ loadTool, resetStemLab, makeCtx, React, ReactDOMClient } = mod);
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let mounted = [];
let restore = [];

// A 2D context that accepts every call: the HUD draws ~2,000 lines of canvas code per frame.
function fake2d() {
  const store = { canvas: { width: 800, height: 600 } };
  return new Proxy(store, {
    get(t, p) {
      if (p in t) return t[p];
      if (p === 'measureText') return () => ({ width: 10 });
      if (p === 'getImageData' || p === 'createImageData') return () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 });
      if (typeof p === 'string' && /^create/.test(p)) return () => ({ addColorStop() {} });
      if (p === 'getLineDash') return () => [];
      if (p === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      return () => {};
    },
    set(t, p, v) { t[p] = v; return true; },
  });
}

async function mount(roadReady, extraCtx) {
  window.__testHooks = {};
  resetStemLab();
  const config = loadTool(TOOL, 'roadReady');
  const state = { toolData: { roadReady } };
  const toasts = [];
  function Host() {
    const [toolData, setToolData] = React.useState(state.toolData);
    state.toolData = toolData;
    state.setKey = (key, value) => setToolData((p) => ({ ...p, roadReady: { ...(p.roadReady || {}), [key]: value } }));
    const ctx = makeCtx(Object.assign({
      toolData,
      addToast: (msg) => { toasts.push(String(msg)); },
      update: (tool, key, value) => setToolData((p) => ({ ...p, [tool]: { ...(p[tool] || {}), [key]: value } })),
      updateMulti: (tool, values) => setToolData((p) => ({ ...p, [tool]: { ...(p[tool] || {}), ...(values || {}) } })),
    }, extraCtx || {}));
    return config.render(ctx);
  }
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  await React.act(async () => { root.render(React.createElement(Host)); });
  const m = { host, root, state, toasts, setKey: (k, v) => state.setKey(k, v) };
  mounted.push(m);
  return m;
}

async function startDrive(roadReady) {
  const proto = window.HTMLCanvasElement.prototype;
  const prevGetContext = proto.getContext;
  proto.getContext = function () { return fake2d(); };
  restore.push(() => { proto.getContext = prevGetContext; });
  // jsdom has a real requestAnimationFrame: once one frame has run, the loop would keep running by
  // itself in real time. Hold it still so every frame in these tests is one the test stepped.
  const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 77);
  const m = await mount(Object.assign({ view: 'driving', scenario: 'residential', vehicle: 'sedan', reducedMotion: true, tourCompleted: true, instructorVoice: false }, roadReady || {}));
  await React.act(async () => { window.__testHooks.roadReady.startDriving('residential', 'sedan'); });
  await React.act(async () => { await sleep(30); });
  m.raf = raf;
  return m;
}
const loop = () => window.__testHooks.roadReady.driveLoop;
// Other code also uses requestAnimationFrame (confetti, focus). Count only the drive frame being re-armed.
const rearms = (raf) => raf.mock.calls.filter((c) => typeof c[0] === 'function' && String(c[0]).indexOf('stepFrame(now)') !== -1).length;
let clock = 1000;
async function frames(n) {
  for (let i = 0; i < n; i++) { clock += 16; await React.act(async () => { loop().step(performance.now() + clock); }); }
}

afterEach(async () => {
  for (const m of mounted) { try { await React.act(async () => { m.root.unmount(); }); } catch (e) {} m.host.remove(); }
  mounted = [];
  restore.forEach((fn) => { try { fn(); } catch (e) {} });
  restore = [];
  delete window.__testHooks;
  delete window.__alloRoadReadyLastDriveError;
  vi.restoreAllMocks();
});

describe('Free Explore World controls change the running drive (rb30)', () => {
  const FREE = { freeExplore: true, freeExploreScenario: { id: 'residential', weather: 'clear', time: 'day', traffic: 'light', speedLimit: 30 } };
  async function openWorldPanel(m) {
    let worldBtn = m.host.querySelector('button[aria-controls="rr-world-controls"]');
    if (!worldBtn) {
      for (const b of [...m.host.querySelectorAll('button[aria-expanded="false"]')]) {
        await React.act(async () => { b.click(); });
        worldBtn = m.host.querySelector('button[aria-controls="rr-world-controls"]');
        if (worldBtn) break;
      }
    }
    expect(worldBtn, 'World button').toBeTruthy();
    await React.act(async () => { worldBtn.click(); });
    const panel = m.host.querySelector('#rr-world-controls');
    expect(panel, 'World panel').toBeTruthy();
    return panel;
  }

  it('the loop exposes the scenario object it really reads, and it starts as the saved setting', async () => {
    await startDrive(FREE);
    expect(loop(), 'drive loop test seam').toBeTruthy();
    await frames(2);
    expect(loop().fault().total, 'frames run clean in this harness: ' + String(loop().fault().lastError && loop().fault().lastError.stack)).toBe(0);
    expect(loop().scenario().time).toBe('day');
    expect(loop().scenario().weather).toBe('clear');
  });

  it('Night: the object the loop reads becomes night on the next frame', async () => {
    const m = await startDrive(FREE);
    await frames(1);
    const loopScenario = loop().scenario();
    const panel = await openWorldPanel(m);
    const nightBtn = [...panel.querySelectorAll('button')].find((b) => /Night/.test(b.textContent));
    await React.act(async () => { nightBtn.click(); });
    expect(m.state.toolData.roadReady.freeExploreScenario.time).toBe('night');
    await frames(1);
    expect(loop().scenario(), 'same loop instance: the drive was not restarted').toBe(loopScenario);
    expect(loopScenario.time).toBe('night');
    const dayBtn = [...m.host.querySelectorAll('#rr-world-controls button')].find((b) => /Day/.test(b.textContent));
    await React.act(async () => { dayBtn.click(); });
    await frames(1);
    expect(loopScenario.time).toBe('day');
  });

  it('Rain, Snow, Fog and Clear each reach the loop; grip is read from that same object', async () => {
    const m = await startDrive(FREE);
    await frames(1);
    const loopScenario = loop().scenario();
    await openWorldPanel(m);
    const weatherButtons = () => [...m.host.querySelectorAll('#rr-world-controls > div')][1].querySelectorAll('button');
    const order = ['clear', 'rain', 'snow', 'fog'];
    for (const w of ['rain', 'snow', 'fog', 'clear']) {
      await React.act(async () => { weatherButtons()[order.indexOf(w)].click(); });
      expect(m.state.toolData.roadReady.freeExploreScenario.weather).toBe(w);
      await frames(1);
      expect(loopScenario.weather, w).toBe(w);
    }
    expect(loop().fault().total).toBe(0);
  });

  it('Traffic still works and reaches the loop object; a click does not restart the drive', async () => {
    const m = await startDrive(FREE);
    await frames(1);
    const loopScenario = loop().scenario();
    await openWorldPanel(m);
    const many = [...m.host.querySelectorAll('#rr-world-controls button')].find((b) => b.textContent.trim() === 'Many');
    await React.act(async () => { many.click(); });
    expect(m.state.toolData.roadReady.freeExploreScenario.traffic).toBe('heavy');
    await frames(1);
    expect(loop().scenario()).toBe(loopScenario);
    expect(loopScenario.traffic).toBe('heavy');
  });

  it('Dynamic weather is not undone: a change the loop made itself survives the frames before React re-renders', async () => {
    await startDrive(FREE);
    await frames(1);
    // What the dynamic-weather tick does: write the loop object now, persist through React later.
    loop().scenario().weather = 'rain';
    await frames(3);
    expect(loop().scenario().weather).toBe('rain');
  });

  it('outside Free Explore the saved Free Explore setting is ignored', async () => {
    await startDrive({ freeExplore: false, freeExploreScenario: { weather: 'snow', time: 'night' } });
    await frames(2);
    expect(loop().scenario().weather).not.toBe('snow');
    expect(loop().scenario().time).not.toBe('night');
  });
});

describe('A failing frame does not stop the drive (rb30)', () => {
  function breakFrames() {
    const boom = new Error('rb30 frame boom');
    const prevStemInput = window.StemInput;
    const prevGet = navigator.getGamepads;
    if (window.StemInput) window.StemInput = Object.assign({}, window.StemInput, { gamepad() { throw boom; } });
    else Object.defineProperty(navigator, 'getGamepads', { configurable: true, writable: true, value: () => { throw boom; } });
    const heal = () => {
      if (prevStemInput) window.StemInput = prevStemInput;
      else if (prevGet) Object.defineProperty(navigator, 'getGamepads', { configurable: true, writable: true, value: prevGet });
      else delete navigator.getGamepads;
    };
    restore.push(heal);
    return { boom, heal };
  }

  it('the frame is re-armed, the error is kept and logged once, and after 3 in a row a card pauses the drive', async () => {
    const m = await startDrive();
    await frames(2);
    expect(loop().fault().total).toBe(0);
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const raf = m.raf; raf.mockClear();
    const { boom } = breakFrames();

    await frames(1);
    expect(rearms(raf), 'frame 1 re-armed').toBe(1);
    expect(loop().fault().streak).toBe(1);
    expect(loop().fault().lastError).toBe(boom);
    expect(window.__alloRoadReadyLastDriveError).toBe(boom);
    expect(m.host.querySelector('[data-rr-drive-fault]'), 'one bad frame: no card').toBeNull();

    await frames(2);
    expect(rearms(raf), 'every failed frame re-armed').toBe(3);
    expect(loop().fault().total).toBe(3);
    const logged = errSpy.mock.calls.filter((c) => c.indexOf(boom) !== -1);
    expect(logged, 'logged once, not once per frame').toHaveLength(1);

    const card = m.host.querySelector('[data-rr-drive-fault]');
    expect(card, 'card after 3 failed frames in a row').toBeTruthy();
    expect(card.getAttribute('role')).toBe('alertdialog');
    expect(card.textContent).toContain('Something went wrong in the drive. You can keep going or go back to the menu.');
    expect(card.textContent).not.toContain('rb30 frame boom');
    expect(m.host.querySelectorAll('[role="dialog"]').length, 'the pause screen does not stack under the card').toBe(0);
    expect(document.activeElement).toBe(card.querySelector('[data-rr-drive-fault-resume]'));
  });

  it('Resume closes the card and the drive carries on; a healthy frame resets the count', async () => {
    const m = await startDrive();
    await frames(1);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { heal } = breakFrames();
    await frames(3);
    expect(m.host.querySelector('[data-rr-drive-fault]')).toBeTruthy();
    heal();
    await React.act(async () => { m.host.querySelector('[data-rr-drive-fault-resume]').click(); });
    expect(m.host.querySelector('[data-rr-drive-fault]')).toBeNull();
    const raf = m.raf; raf.mockClear();
    await frames(2);
    expect(rearms(raf), 'healthy frames re-arm themselves').toBe(2);
    expect(loop().fault().streak).toBe(0);
    expect(m.host.querySelector('[data-rr-drive-fault]')).toBeNull();
    expect(m.state.toolData.roadReady.view).toBe('driving');
  });

  it('still failing after Resume: the card comes back', async () => {
    const m = await startDrive();
    await frames(1);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    breakFrames();
    await frames(3);
    await React.act(async () => { m.host.querySelector('[data-rr-drive-fault-resume]').click(); });
    expect(m.host.querySelector('[data-rr-drive-fault]')).toBeNull();
    await frames(3);
    expect(m.host.querySelector('[data-rr-drive-fault]')).toBeTruthy();
  });

  it('two failures then a good frame: no card (the count is for failures in a row)', async () => {
    const m = await startDrive();
    await frames(1);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { heal } = breakFrames();
    await frames(2);
    heal();
    await frames(1);
    expect(loop().fault().streak).toBe(0);
    breakFrames();
    await frames(2);
    expect(m.host.querySelector('[data-rr-drive-fault]')).toBeNull();
    expect(loop().fault().total).toBe(4);
  });

  it('Back to menu leaves the drive', async () => {
    const m = await startDrive();
    await frames(1);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    breakFrames();
    await frames(3);
    await React.act(async () => { m.host.querySelector('[data-rr-drive-fault-menu]').click(); });
    expect(m.state.toolData.roadReady.view).toBe('menu');
    expect(m.host.querySelector('[data-rr-drive-fault]')).toBeNull();
  });

  it('a keyup with no string key does not throw in the key handler', async () => {
    await startDrive();
    const errors = [];
    const onErr = (e) => { errors.push(e.error || e.message); e.preventDefault(); };
    window.addEventListener('error', onErr);
    try {
      window.dispatchEvent(new window.Event('keyup'));
      window.dispatchEvent(new window.KeyboardEvent('keyup', { key: 'W' }));
    } finally { window.removeEventListener('error', onErr); }
    expect(errors).toEqual([]);
  });
});

describe('Badges earned inside the drive loop (rb30)', () => {
  it('two awards before React re-renders are both kept, with the badges saved earlier', async () => {
    const m = await startDrive({ badges: { first_drive: true } });
    await frames(1);
    await React.act(async () => {
      // What two in-loop award sites do in the same tick.
      const a = loop().liveBadges(); a.bus_respect = true; loop().awardBadges(a);
      const b = loop().liveBadges(); b.moose_avoided = true; loop().awardBadges(b);
    });
    expect(m.state.toolData.roadReady.badges).toEqual({ first_drive: true, bus_respect: true, moose_avoided: true });
  });

  it('an award built from an OLD copy of the map (the loop closure) cannot erase newer badges', async () => {
    const m = await startDrive({ badges: { first_drive: true } });
    const staleCopy = Object.assign({}, m.state.toolData.roadReady.badges);
    await React.act(async () => { const a = loop().liveBadges(); a.school_hero = true; loop().awardBadges(a); });
    await React.act(async () => { staleCopy.emergency_response = true; loop().awardBadges(staleCopy); });
    expect(m.state.toolData.roadReady.badges).toEqual({ first_drive: true, school_hero: true, emergency_response: true });
  });

  it('a badge map replaced from outside (Load Progress, Start fresh) is not brought back by the next award', async () => {
    const m = await startDrive({ badges: { first_drive: true } });
    await React.act(async () => { const a = loop().liveBadges(); a.school_hero = true; loop().awardBadges(a); });
    expect(m.state.toolData.roadReady.badges.school_hero).toBe(true);
    await React.act(async () => { m.setKey('badges', { imported: true }); });
    await React.act(async () => { const b = loop().liveBadges(); b.bus_respect = true; loop().awardBadges(b); });
    expect(m.state.toolData.roadReady.badges).toEqual({ imported: true, bus_respect: true });
  });

  it('all seven in-loop award sites go through the merged helpers', () => {
    const src = readFileSync(TOOL, 'utf8');
    const from = src.indexOf('var stepFrame = function(now) {');
    const to = src.indexOf('function initThreeScene() {');
    expect(from).toBeGreaterThan(0);
    expect(to).toBeGreaterThan(from);
    const loopSrc = src.slice(from, to);
    expect(loopSrc).not.toContain("upd('badges'");
    expect(loopSrc).not.toMatch(/Object\.assign\(\{\}, \(?d\.badges/);
    expect((loopSrc.match(/updBadges\(/g) || []).length).toBe(7);
    expect((loopSrc.match(/= rrLiveBadges\(\);/g) || []).length).toBe(7);
  });
});
