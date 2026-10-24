import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
import { runIsolatedAxe } from './helpers/isolated_axe_harness.js';
import { StubAudioContext, energy } from './helpers/reef_audio_stub.js';

// Lane I3: the opt-in Reef sounds soundscape in the dive controls, against a stub dive
// and a stub Web Audio context (jsdom plays no audio): off by default, the host's shared
// context, healthy louder than damaged, bites and breaths from the dive's onEvent hook,
// paused / hidden / unmounted means silent and disconnected.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const mounted = [];
let engines, shared, constructed, X, S;

beforeEach(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  window.THREE = { stub: true };
  window.Reef3DSpecies = { version: '1.0.0', create: () => ({}) };
  engines = []; constructed = 0;
  shared = new StubAudioContext('suspended');
  // A private context is a leak the host forbids; count any the tool makes.
  window.AudioContext = function () { constructed++; return new StubAudioContext(); };
  window.StemLab.audioContext = vi.fn(() => shared);
  window.Reef3DExplore = {
    version: '1.0.0',
    mount: vi.fn((canvas, options) => {
      let state = { ready: true, paused: false, view: 'third', light: false, diver: { depthM: 8, headingDeg: 90 }, focused: null, nearby: [] };
      const controller = {
        canvas, options, dispose: vi.fn(), setInput: vi.fn(), resize: vi.fn(), setLight: vi.fn(), getState: () => state,
        emit(patch) { state = { ...state, ...patch }; options.onState(state); },
        swimTo: vi.fn(), focusNext: vi.fn(), focusPrevious: vi.fn(), clearFocus: vi.fn(), focus: vi.fn(),
        setView: vi.fn((view) => controller.emit({ view })), setPaused: vi.fn((paused) => controller.emit({ paused }))
      };
      engines.push(controller);
      options.onState(state);
      return controller;
    })
  };
  loadTool(TOOL, 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef;
  S = window.__RR_TEST_EXPORTS__.coralReefSound;
});

afterEach(async () => {
  while (mounted.length) { const item = mounted.pop(); await act(async () => item.root.unmount()); item.host.remove(); }
  delete window.Reef3DExplore; delete window.Reef3DSpecies; delete window.THREE; delete window.AudioContext; delete window.webkitAudioContext;
  vi.restoreAllMocks();
});

async function mountTool(seed = {}, extra = {}) {
  let data = { coralReef: { section: 'explore', ...seed } };
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const cfg = window.StemLab._registry.coralReef;
  const announcements = [];
  let setData = null;
  function Shell() {
    const [toolData, setToolData] = React.useState(data);
    data = toolData; setData = setToolData;
    return cfg.render({ React, toolData, setToolData, t: (key, fallback) => fallback || key, announceToSR: (m) => announcements.push(m), ...extra });
  }
  const item = { host, root, announcements, get data() { return data; }, set: (patch) => act(async () => setData((p) => ({ ...p, coralReef: { ...p.coralReef, ...patch } }))) };
  mounted.push(item);
  await act(async () => root.render(React.createElement(Shell)));
  return item;
}
const buttons = (el, label) => [...el.querySelectorAll('button')].filter((b) => b.textContent.trim() === label);
async function click(node) { await act(async () => { node.click(); await Promise.resolve(); await Promise.resolve(); }); }
async function startDive(t) { await click(buttons(t.host, 'Start the dive')[0]); expect(engines.length).toBeGreaterThan(0); return engines[engines.length - 1]; }
const toggle = (t) => t.host.querySelector('.cr-dive-controls button[data-sound-toggle]');
const panel = (t) => t.host.querySelector('.cr-dive-controls .crs-sound');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// Snaps in the shrimp batches started so far.
const shrimpEnergy = (ctx) => ctx.started.filter((s) => s.kind === 'buffer' && s.buffer && s.buffer.duration === 1).reduce((e, s) => e + energy(s.buffer), 0);

describe('Reef sounds toggle', () => {
  it('is off by default: a real toggle in the dive controls, and no audio is touched until it is pressed', async () => {
    const t = await mountTool();
    expect(t.host.querySelector('[data-sound-toggle]'), 'nothing before the dive starts').toBeNull();
    await startDive(t);
    const btn = toggle(t);
    expect(btn, 'a Reef sounds button in the controls bar').toBeTruthy();
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.textContent.trim()).toBe('Reef sounds');
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    expect(btn.querySelector('svg').getAttribute('aria-hidden')).toBe('true');
    expect(panel(t).getAttribute('data-reef-sound')).toBe('off');
    expect(window.StemLab.audioContext).not.toHaveBeenCalled();
    expect(shared.nodes.length + shared.resumed + constructed).toBe(0);
    expect(t.host.querySelector('[data-sound-volume]'), 'no volume until it is on').toBeNull();
    expect(t.host.querySelector('[data-sound-note]')).toBeNull();
    // The dive's events reach nothing while it is off.
    engines[0].options.onEvent({ type: 'bite', distanceM: 2, pan: 0, speciesId: 'parrotfish' });
    expect(shared.nodes.length).toBe(0);
  });

  it('pressing it resumes the host\'s shared context inside the press, saves the choice, and starts a gentle limited mix', async () => {
    const t = await mountTool();
    await startDive(t);
    const seen = [];
    shared.onResume = () => seen.push(panel(t).getAttribute('data-reef-sound'));
    await click(toggle(t));
    expect(window.StemLab.audioContext).toHaveBeenCalled();
    expect(shared.resumed, 'resume() on the user gesture').toBeGreaterThanOrEqual(1);
    expect(seen[0], 'resumed inside the press itself, before React re-renders').toBe('off');
    expect(shared.state).toBe('running');
    expect(constructed, 'never a private AudioContext').toBe(0);
    expect(t.data.coralReef.reefSound).toBe(true);
    expect(t.announcements.at(-1)).toBe('Reef sounds on.');
    expect(toggle(t).getAttribute('aria-pressed')).toBe('true');
    expect(panel(t).getAttribute('data-reef-sound')).toBe('playing');
    // Output: bus -> volume -> limiter -> destination, with the volume fading in.
    const toDest = shared.connections.filter(([, dest]) => dest === shared.destination);
    expect(toDest.length).toBe(1);
    const limiter = toDest[0][0];
    expect(limiter.kind, 'a limiter, last before the speakers, keeps peaks gentle').toBe('limiter');
    const out = shared.connections.find(([, dest]) => dest === limiter)[0];
    expect(out.kind).toBe('gain');
    expect(limiter.threshold.value).toBeLessThanOrEqual(-6);
    expect(limiter.ratio.value).toBeGreaterThanOrEqual(12);
    const ramp = out.gain.events.find((e) => e[0] === 'lin');
    expect(ramp[1], 'default volume, well under full scale').toBeGreaterThan(0.1);
    expect(ramp[1]).toBeLessThan(0.5);
    expect(out.gain.value, 'starts silent and fades in').toBe(0);
    // Shrimp crackle and the surge start at once; the sourced line shows.
    expect(shared.started.some((s) => s.kind === 'buffer' && s.buffer && s.buffer.duration === 1)).toBe(true);
    expect(shared.started.some((s) => s.kind === 'buffer' && s.loop)).toBe(true);
    const note = t.host.querySelector('[data-sound-note]').textContent;
    expect(note).toContain('Listen: A healthy reef crackles with snapping shrimp and fish calls. Damaged reefs are often quieter, and young fish use reef sounds to find a home.');
    expect(note).toContain('Playing: snapping shrimp (lots), fish calls (often)');
    expect(note).toContain('not recordings');
    // Volume: a labelled slider that is saved and lowers the output.
    const slider = t.host.querySelector('input[data-sound-volume]');
    expect(slider.closest('label').textContent).toContain('Volume');
    expect(slider.value).toBe('60');
    expect(slider.getAttribute('aria-valuetext')).toBe('60 percent');
    await act(async () => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(slider, '20'); slider.dispatchEvent(new Event('input', { bubbles: true })); });
    expect(t.data.coralReef.reefSoundVolume).toBe(20);
    const target = out.gain.events.filter((e) => e[0] === 'target').at(-1);
    expect(target[1]).toBeLessThan(ramp[1] * 0.3);
    // Off again: announced, faded and let go.
    await click(toggle(t));
    expect(t.data.coralReef.reefSound).toBe(false);
    expect(t.announcements.at(-1)).toBe('Reef sounds off.');
    await act(async () => { await wait(450); });
    expect(shared.wired(), 'nothing left wired').toEqual([]);
    expect(shared.playing()).toEqual([]);
  });

  it('keeps the choice: a new dive with sound remembered asks the browser on the Start press and plays at the saved volume', async () => {
    const t = await mountTool({ reefSound: true, reefSoundVolume: 40 });
    expect(shared.resumed).toBe(0);
    const seen = [];
    shared.onResume = () => seen.push(!!t.host.querySelector('.crs-sound'));
    await startDive(t);
    expect(shared.resumed, 'the Start press resumes the context').toBeGreaterThanOrEqual(1);
    expect(seen[0], 'inside the Start press, before the dive and its sound panel exist').toBe(false);
    expect(panel(t).getAttribute('data-reef-sound')).toBe('playing');
    expect(t.host.querySelector('input[data-sound-volume]').value).toBe('40');
  });

  it('when the browser holds the sound back, says so and offers a button that asks again', async () => {
    shared.blockResume = true;
    const t = await mountTool();
    await startDive(t);
    await click(toggle(t));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(t.host.querySelector('.crs-sound').textContent).toContain('Your browser is holding the sound back.');
    const again = buttons(t.host, 'Play the sound')[0];
    expect(again).toBeTruthy();
    shared.blockResume = false;
    await click(again);
    await act(async () => { await Promise.resolve(); });
    expect(shared.state).toBe('running');
    expect(t.host.querySelector('.crs-sound').textContent).not.toContain('holding the sound back');
  });

  it('without Web Audio the toggle is disabled with an explanation, and pressing it does nothing', async () => {
    delete window.AudioContext; delete window.webkitAudioContext;
    const t = await mountTool();
    await startDive(t);
    const btn = toggle(t);
    expect(btn.getAttribute('aria-disabled')).toBe('true');
    const why = document.getElementById(btn.getAttribute('aria-describedby'));
    expect(why.textContent).toBe('Sound is not available in this browser.');
    await click(btn);
    expect(t.data.coralReef.reefSound).toBeUndefined();
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    expect(window.StemLab.audioContext).not.toHaveBeenCalled();
  });

  it('a context that cannot be made disables the toggle with its own explanation', async () => {
    window.StemLab.audioContext = vi.fn(() => { throw new Error('QuotaExceededError'); });
    const t = await mountTool();
    await startDive(t);
    await click(toggle(t));
    const btn = toggle(t);
    expect(btn.getAttribute('aria-disabled')).toBe('true');
    expect(document.getElementById(btn.getAttribute('aria-describedby')).textContent).toBe('Sound could not start on this device.');
  });
});

describe('Reef sounds follow the dive', () => {
  it('a bite from the dive schedules a crunch, nearer and on its side; breaths schedule the hiss and the bubbly exhale', async () => {
    const t = await mountTool();
    const dive = await startDive(t);
    await click(toggle(t));
    const before = shared.started.length;
    dive.options.onEvent({ type: 'bite', key: 1, t: 3, distanceM: 1.5, pan: 0.6, speciesId: 'parrotfish', school: false, lag: 0.01 });
    const crunch = shared.started.slice(before);
    expect(crunch.length).toBe(1);
    expect(crunch[0].kind).toBe('buffer');
    expect(crunch[0].buffer.duration).toBeLessThan(0.25);
    const chainOf = (n) => { const out = [n]; let c = n; while (c.outs && c.outs.size) { c = [...c.outs][0]; out.push(c); } return out; };
    const near = chainOf(crunch[0]);
    const bp = near.find((n) => n.kind === 'filter'), pan = near.find((n) => n.kind === 'panner'), g = near.find((n) => n.kind === 'gain');
    expect(bp.type).toBe('bandpass');
    expect(bp.frequency.value).toBeGreaterThanOrEqual(1300);
    expect(bp.frequency.value).toBeLessThanOrEqual(3400);
    expect(pan.pan.value).toBeCloseTo(0.6, 5);
    dive.options.onEvent({ type: 'bite', key: 2, t: 4, distanceM: 15, pan: -0.4, speciesId: 'parrotfish', school: false, lag: 0.01 });
    const far = chainOf(shared.started.at(-1));
    expect(far.find((n) => n.kind === 'gain').gain.value, 'a far bite is quieter').toBeLessThan(g.gain.value * 0.5);
    // Breaths.
    const b0 = shared.started.length;
    dive.options.onEvent({ type: 'inhale', lag: 0.01, duration: 1.45 });
    const hiss = shared.started.slice(b0);
    expect(hiss.length).toBe(1);
    expect(chainOf(hiss[0]).find((n) => n.kind === 'filter').type).toBe('bandpass');
    const b1 = shared.started.length;
    dive.options.onEvent({ type: 'exhale', lag: 0.01, duration: 1.28, clumps: [0, 0.04, 0.09, 0.15, 0.23, 0.33, 0.51, 0.57, 0.64, 0.72, 0.8, 0.88] });
    const exhale = shared.started.slice(b1);
    expect(exhale.filter((s) => s.kind === 'osc').length, 'a blub for each clump of bubbles').toBe(12);
    const rumble = exhale.find((s) => s.kind === 'buffer');
    expect(chainOf(rumble).find((n) => n.kind === 'filter').frequency.value).toBeLessThan(600);
    // Each blub lines up with its clump.
    const blubs = exhale.filter((s) => s.kind === 'osc').map((s) => s.startAt - rumble.startAt);
    expect(blubs[6]).toBeCloseTo(0.51, 5);
    // Unknown events are ignored.
    const b2 = shared.started.length;
    dive.options.onEvent({ type: 'wave' }); dive.options.onEvent(null);
    expect(shared.started.length).toBe(b2);
  });

  it('a healthy reef schedules far more shrimp crackle and fish calls than the damaged reef', async () => {
    function run(id) {
      const ctx = new StubAudioContext('running'), site = X.EXPLORE_SITES.find((s) => s.id === id);
      const engine = S.engine(ctx, { mix: S.mix(site), seed: site.seed, volume: 60 });
      engine.start();
      for (let i = 0; i < 240; i++) { ctx.advance(0.25); engine.step(0.8, false); }
      const out = { snaps: engine.stats.snaps, calls: engine.stats.calls, energy: shrimpEnergy(ctx), mix: engine.mix, ctx };
      engine.dispose();
      return out;
    }
    const healthy = run('healthy'), damaged = run('damaged'), restoration = run('restoration'), heatwave = run('heatwave');
    expect(healthy.snaps, 'snaps in a minute').toBeGreaterThan(15000);
    expect(healthy.snaps).toBeGreaterThan(damaged.snaps * 3);
    expect(healthy.energy, 'more crackle energy in the batches').toBeGreaterThan(damaged.energy * 3);
    // Loudness of the shrimp layer: energy times the layer gain squared.
    const loud = (r) => r.energy * r.mix.snapLevel ** 2;
    expect(10 * Math.log10(loud(healthy) / loud(damaged)), 'dB louder').toBeGreaterThan(10);
    expect(healthy.calls).toBeGreaterThan(damaged.calls * 2.5);
    expect(healthy.mix.kinds).toBeGreaterThan(damaged.mix.kinds);
    // In between: the restored and the bleaching reef.
    expect(restoration.snaps).toBeGreaterThan(damaged.snaps); expect(restoration.snaps).toBeLessThan(healthy.snaps);
    expect(heatwave.snaps).toBeGreaterThan(damaged.snaps);
    // Every kind of call shows up on the healthy reef; only the first kinds on the damaged one.
    const kindsOf = (ctx) => new Set(ctx.started.filter((s) => s.kind === 'osc').map((s) => s.type + ':' + (s.frequency.events.some((e) => e[0] === 'exp') ? 'glide' : 'flat')));
    expect(kindsOf(healthy.ctx).size).toBeGreaterThan(kindsOf(damaged.ctx).size);
    // Scheduled ahead in batches on the audio clock: about one shrimp buffer per second, not one node per snap.
    expect(healthy.ctx.started.filter((s) => s.buffer && s.buffer.duration === 1).length).toBeLessThanOrEqual(62);
  });

  it('the panel uses the site: the damaged reef plays a few shrimp and rare calls, with its own sourced line', async () => {
    const t = await mountTool({ diveSiteId: 'damaged', reefSound: true });
    await startDive(t);
    const note = t.host.querySelector('[data-sound-note]').textContent;
    expect(note).toContain('Playing: snapping shrimp (a few), fish calls (rarely)');
    expect(note).toContain('On this damaged reef you hear fewer shrimp snaps and fewer kinds of fish calls.');
    expect(note).toContain('twice as many young fish moved in');
  });

  it('goes quiet while the reef is paused or the page is hidden, and comes back after', async () => {
    const t = await mountTool({ reefSound: true });
    const dive = await startDive(t);
    expect(panel(t).getAttribute('data-reef-sound')).toBe('playing');
    await act(async () => dive.emit({ paused: true }));
    expect(panel(t).getAttribute('data-reef-sound')).toBe('waiting');
    expect(panel(t).textContent).toContain('The sounds wait while the reef is paused.');
    await act(async () => { await wait(450); });
    expect(shared.wired()).toEqual([]);
    expect(shared.playing()).toEqual([]);
    const n0 = shared.nodes.length;
    dive.options.onEvent({ type: 'bite', distanceM: 2, pan: 0, speciesId: 'parrotfish' });
    expect(shared.nodes.length, 'no crunch while paused').toBe(n0);
    await act(async () => dive.emit({ paused: false }));
    expect(panel(t).getAttribute('data-reef-sound')).toBe('playing');
    expect(shared.wired().length).toBeGreaterThan(0);
    // Hidden page.
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    try {
      await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
      expect(panel(t).getAttribute('data-reef-sound')).toBe('waiting');
      await act(async () => { await wait(450); });
      expect(shared.wired()).toEqual([]);
    } finally { delete document.hidden; }
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(panel(t).getAttribute('data-reef-sound')).toBe('playing');
  });

  it('leaving the section stops and disconnects every node at once, and the scheduler stops', async () => {
    const t = await mountTool({ reefSound: true });
    const dive = await startDive(t);
    dive.options.onEvent({ type: 'bite', distanceM: 2, pan: 0.2, speciesId: 'bumphead_parrotfish', school: true });
    dive.options.onEvent({ type: 'exhale', duration: 1.2, clumps: [0, 0.1, 0.2] });
    expect(shared.wired().length).toBeGreaterThan(10);
    await click(buttons(t.host, 'Species guide')[0] || [...t.host.querySelectorAll('.cr-nav button')].find((b) => b.textContent.includes('guide')));
    expect(t.data.coralReef.section).not.toBe('explore');
    expect(shared.wired(), 'disconnected right away, no fade timer needed').toEqual([]);
    expect(shared.nodes.every((n) => n.disconnected)).toBe(true);
    expect(shared.playing(), 'every source stopped').toEqual([]);
    const n0 = shared.nodes.length;
    shared.advance(3);
    await act(async () => { await wait(600); });
    expect(shared.nodes.length, 'the batch scheduler stopped').toBe(n0);
    dive.options.onEvent({ type: 'bite', distanceM: 2, pan: 0, speciesId: 'parrotfish' });
    expect(shared.nodes.length).toBe(n0);
  });

  it('ending the dive unmounts the panel and lets everything go; the shared context stays open', async () => {
    const t = await mountTool({ reefSound: true });
    await startDive(t);
    expect(shared.wired().length).toBeGreaterThan(0);
    await click(t.host.querySelector('button[data-end-dive]'));
    expect(t.host.querySelector('[data-sound-toggle]')).toBeNull();
    expect(shared.wired()).toEqual([]);
    expect(shared.state).toBe('running');
  });
});

describe('Reef sounds: accessibility and the shared-context rule', () => {
  it.each(['light', 'dark', 'contrast'])('the panel with sound on is axe-clean in the %s theme', { timeout: 60000 }, async (theme) => {
    const t = await mountTool({ reefSound: true }, { theme });
    await startDive(t);
    expect(panel(t)).toBeTruthy();
    const results = await runIsolatedAxe(t.host.innerHTML);
    expect(results.violations.map((v) => v.id + ': ' + v.nodes.map((n) => n.target.join(' ')).join(', '))).toEqual([]);
  });

  it('takes an AudioContext only through the host helper, never closes it, and all strings are literal keys without dashes', () => {
    const src = readFileSync(TOOL, 'utf8');
    const HELPER = 'window.StemLab.audioContext ? window.StemLab.audioContext() : new (window.AudioContext || window.webkitAudioContext)()';
    const creates = (src.match(/new\s*\(?\s*(?:window\.)?(?:webkit)?AudioContext/g) || []).length;
    expect(creates).toBe(1);
    expect(src.split(HELPER).length - 1).toBe(creates);
    expect(src).not.toMatch(/\.close\(\)/);
    expect(src).not.toMatch(/\.suspend\(/);
    const start = src.indexOf('// ── Reef sounds'), end = src.indexOf('  function ExploreSection(props) {');
    const block = src.slice(start, end);
    expect(block).not.toMatch(/Math\.random/);
    for (const m of block.matchAll(/__alloT\('stem\.coralreef\.([a-z0-9_]+)', '((?:[^'\\]|\\.)*)'\)/g)) expect(m[2], m[1]).not.toMatch(/[\u2013\u2014]/);
  });
});
