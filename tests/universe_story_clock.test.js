// The cosmic timeline's story clock, the click-to-learn scene and the 3D flight's
// real-universe notes (2026-10-17).
//
// The slider gives each of the nine chapters equal space. Inside a chapter, time
// runs through that chapter's key moments on a log scale, so ten microseconds
// and four billion years both get room. Playback lingers on each moment and
// longer on each chapter, and can stop at every chapter. These tests pin the
// behaviour through window.__universePure and a live mount, not source spelling.
//
// UNIVERSE_TOOL_UNDER_TEST points the suite at another copy, for mutation checks.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const TOOL = process.env.UNIVERSE_TOOL_UNDER_TEST || 'stem_lab/stem_tool_universe.js';
const STOPS = [0, 0.00038, 0.001, 0.2, 0.4, 4.6, 9.2, 13.8, 13.81];
const SECOND = 1 / 3.15576e16;
let pure;

beforeAll(() => { resetStemLab(); loadTool(TOOL, 'universe'); pure = window.__universePure; });

describe('Universe story clock', () => {
  it('keeps every chapter stop on a whole slider position, in both directions', () => {
    expect(pure.UNIVERSE_STOP_AGES).toEqual(STOPS);
    const wrong = STOPS.filter((age, i) => pure.universeStoryPosition(age) !== i || pure.universeStoryAge(i) !== age);
    expect(wrong).toEqual([]);
  });

  it('only moves forward in time and round-trips between slider and age', () => {
    let previous = -1, backward = 0, worst = 0;
    for (let p = 0; p <= 8; p += 0.0007) {
      const age = pure.universeStoryAge(p);
      if (age < previous) backward++;
      previous = age;
      worst = Math.max(worst, Math.abs(pure.universeStoryPosition(age) - p));
    }
    expect(backward).toBe(0);
    expect(worst).toBeLessThan(1e-6);
  });

  it('gives the first second and recent Earth history real room on the slider', () => {
    // A linear chapter would squeeze the first second into 1e-13 of the Big Bang chapter.
    const firstSecond = pure.universeStoryPosition(SECOND);
    expect(firstSecond).toBeGreaterThan(0.4);
    expect(firstSecond).toBeLessThan(0.5);
    // Modern humans, 300,000 years ago, sit three quarters of the way through chapter 7.
    expect(pure.universeStoryPosition(13.7997)).toBeCloseTo(6.75, 6);
  });

  it('places each key moment inside its own chapter, in order, and finds it again', () => {
    const problems = [];
    pure.UNIVERSE_MOMENTS.forEach((moments, chapter) => {
      let previous = STOPS[chapter];
      moments.forEach((moment) => {
        if (!(moment.age > previous && moment.age < STOPS[chapter + 1])) problems.push('out of place: ' + moment.id);
        previous = moment.age;
        if (!moment.title || !moment.text) problems.push('no text: ' + moment.id);
        const found = pure.universeStoryMoment(pure.universeStoryPosition(moment.age));
        if (!found || found.id !== moment.id) problems.push('not found at its own position: ' + moment.id);
      });
    });
    expect(problems).toEqual([]);
    expect(pure.UNIVERSE_MOMENTS.flat().length).toBeGreaterThanOrEqual(15);
  });

  it('labels the chapter stops as before and reads tiny and recent times naturally', () => {
    expect(STOPS.map(pure.universeAgeLabel)).toEqual(['Big Bang', '380 thousand years', '1.0 Myr', '200 Myr', '400 Myr', '4.6 Gyr', '9.2 Gyr', '13.8 Gyr', 'Future fate preview']);
    expect(pure.universeAgeSentence(0.00038)).toBe('380 thousand years after the Big Bang');
    expect(pure.universeSpanLabel(1e-32 * SECOND)).toBe('10⁻³² seconds');
    expect(pure.universeSpanLabel(1e-5 * SECOND)).toBe('10 microseconds');
    expect(pure.universeSpanLabel(180 * SECOND)).toBe('3 minutes');
    expect(pure.universeAgeLabel(13.734)).toBe('66 million years ago');
    expect(pure.universeAgeSentence(13.734)).toContain('66 million years ago');
  });

  it('places cosmic history on one calendar year', () => {
    expect(pure.universeCalendarLabel(0.00038)).toBe('Jan 1, 12:14 AM');
    expect(pure.universeCalendarLabel(9.2)).toBe('Sep 1, 8:00 AM');
    expect(pure.universeCalendarLabel(13.7997)).toBe('Dec 31, 11:48 PM');
    expect(pure.universeCalendarLabel(1e-30)).toBe('Jan 1, within the first second');
    expect(pure.universeCalendarLabel(13.8)).toBe('Midnight, Dec 31: now');
    expect(pure.universeCalendarLabel(13.81)).toContain('possible future');
  });

  it('paces playback: lingers on moments, longer on chapters, never runs backward', () => {
    const legs = pure.UNIVERSE_PLAYBACK_LEGS;
    expect(legs.total).toBeGreaterThan(120);
    expect(legs.total).toBeLessThan(180);
    const dwells = legs.filter((leg) => leg.kind === 'dwell');
    const moment = dwells.filter((leg) => leg.chapter < 0), chapter = dwells.filter((leg) => leg.chapter >= 0);
    expect(chapter.map((leg) => leg.chapter)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(Math.max(...moment.map((leg) => leg.duration))).toBeLessThan(Math.min(...chapter.map((leg) => leg.duration)));
    let previous = -1, backward = 0;
    for (let clock = 0; clock <= legs.total + 1; clock += 0.05) {
      const at = pure.universePlaybackAt(clock);
      if (at.position < previous - 1e-12) backward++;
      previous = at.position;
    }
    expect(backward).toBe(0);
    // Starting on a stop skips its dwell; the present to future step stays short.
    expect(pure.universePlaybackAt(pure.universePlaybackClock(3)).leg.kind).toBe('travel');
    expect(legs.total - pure.universePlaybackClock(7)).toBeLessThan(2.6);
  });
});

describe('Universe time-lapse scene: click to learn', () => {
  it('describes every kind of object the scene can show', () => {
    const kinds = pure.UNIVERSE_SCENE_KINDS, problems = [];
    Object.entries(kinds).forEach(([id, kind]) => ['icon', 'name', 'what', 'when', 'size', 'model', 'think'].forEach((field) => { if (!kind[field]) problems.push(id + '.' + field); }));
    for (let i = 0; i <= 800; i++) {
      const age = pure.universeStoryAge(i / 100), clock = pure.universeSceneClock(age);
      [true, false].forEach((guides) => pure.universeSceneKinds(clock, guides, age).forEach((id) => { if (!kinds[id]) problems.push('unknown kind ' + id); }));
      const field = pure.universeSceneField(clock, age);
      if (!kinds[field] || !kinds[field].field) problems.push('bad field ' + field);
    }
    expect(problems).toEqual([]);
  });

  it('shows different things in different chapters', () => {
    const at = (age) => pure.universeSceneKinds(pure.universeSceneClock(age), true, age);
    expect(at(0)).toContain('plasma');
    expect(at(0)).not.toContain('spiral');
    expect(at(0.00038)).toContain('photon-free');
    expect(at(0.2)).toContain('first-star');
    expect(at(13.8)).toEqual(expect.arrayContaining(['spiral', 'milky-way', 'nebula', 'group']));
    expect(at(13.81)).toEqual(['fading', 'red-dwarf', 'black-hole']);
    expect(pure.universeSceneKinds(pure.universeSceneClock(13.8), false, 13.8)).not.toContain('filament');
  });

  it('picks the smallest object under the pointer, and a thread only where nothing solid is', () => {
    const spots = [
      { kind: 'first-star', id: 'star', x: 100, y: 100, r: 12 },
      { kind: 'bubble', id: 'bubble', x: 100, y: 100, r: 80 },
      { kind: 'filament', id: 'thread', x: 150, y: 100, r: 7, path: [100, 100, 150, 100, 200, 100] },
    ];
    expect(pure.universeSceneHit(spots, 100, 100, 6).id).toBe('star');
    expect(pure.universeSceneHit(spots, 140, 100, 6).id).toBe('bubble');
    expect(pure.universeSceneHit(spots, 195, 101, 6).id).toBe('thread');
    expect(pure.universeSceneHit(spots, 400, 400, 6)).toBe(null);
    // On a small canvas a star and the gas clump it formed in can share a hit size:
    // the star is drawn later, on top, so it wins.
    const tied = [{ kind: 'gas', id: 'gas', x: 50, y: 50, r: 12 }, { kind: 'first-star', id: 'star', x: 50, y: 50, r: 12 }];
    expect(pure.universeSceneHit(tied, 52, 50, 6).id).toBe('star');
  });

  it('shows the card for a chosen object, and drops it when the chapter no longer has it', () => {
    const shown = renderTool('universe', { universe: { tutorialDismissed: true, cosmicTime: 13.8, sceneInspect: { kind: 'spiral', id: 'spiral:3' } } });
    expect(shown.includes('id="universe-scene-card-title"'), 'card heading').toBe(true);
    expect(shown.includes('Spiral galaxy'), 'card name').toBe(true);
    const gone = renderTool('universe', { universe: { tutorialDismissed: true, cosmicTime: 0, sceneInspect: { kind: 'spiral', id: 'spiral:3' } } });
    expect(gone.includes('universe-scene-card-title'), 'card from another chapter').toBe(false);
  });

  it('keeps playback controls and the chapter guide inside the fullscreen stage', () => {
    const html = renderTool('universe', { universe: { tutorialDismissed: true, sceneGuideOpen: true } });
    const stage = html.indexOf('id="universe-scene"'), note = html.indexOf('id="universe-model-note"');
    ['class="uni-scene-transport', 'id="universe-scene-guide"', 'data-allo-fs-btn'].forEach((marker) => {
      const at = html.indexOf(marker);
      expect(at > stage && at < note, marker + ' must sit inside the fullscreen stage').toBe(true);
    });
  });

  it('lists only what the current chapter shows', () => {
    const html = renderTool('universe', { universe: { tutorialDismissed: true, cosmicTime: 0, sceneExplore: true } });
    expect(html.includes('Hot, glowing plasma'), 'plasma listed').toBe(true);
    expect(html.includes('Expanding grid'), 'grid listed').toBe(true);
    expect(html.includes('Spiral galaxy'), 'no galaxies at the Big Bang').toBe(false);
  });
});

describe('Universe time-lapse player', () => {
  const { act } = React;
  let host, root, config, state;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    Element.prototype.scrollIntoView = vi.fn();
    resetStemLab();
    config = loadTool(TOOL, 'universe');
    host = document.createElement('div'); document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => {
    if (window._universeTimeLapse) clearInterval(window._universeTimeLapse);
    window._universeTimeLapse = null;
    await act(async () => root.unmount());
    host.remove(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  });
  async function mount(initial) {
    function Harness() {
      const [toolData, setToolData] = React.useState({ universe: { tutorialDismissed: true, ...initial } });
      state = toolData.universe;
      return config.render(makeCtx({ toolData, setToolData }));
    }
    await act(async () => root.render(React.createElement(Harness)));
  }
  const click = async (el) => act(async () => el.click());
  const tick = async (ms) => act(async () => vi.advanceTimersByTime(ms));
  const play = () => host.querySelector('[aria-label="Play cosmic timeline playback"]');

  it('stops at the next chapter when asked, then carries on from it', async () => {
    await mount({ pauseAtChapters: true, speed: 5 });
    await click(play());
    for (let i = 0; i < 20 && window._universeTimeLapse; i++) await tick(1000);
    expect(window._universeTimeLapse).toBeNull();
    expect(state.isPlaying).toBe(false);
    expect(state.cosmicTime).toBe(0.00038);
    await click(play());
    await tick(300);
    expect(state.cosmicTime).toBeGreaterThan(0.00038);
    expect(state.cosmicTime).toBeLessThan(0.001);
  });

  it('pauses when a learner picks something in the scene, and offers to resume', async () => {
    await mount({ speed: 1 });
    await click(play());
    await tick(400);
    expect(state.isPlaying).toBe(true);
    await click(host.querySelector('.uni-scene-explore'));
    await click(host.querySelector('#universe-scene-finds button'));
    expect(state.isPlaying).toBe(false);
    expect(window._universeTimeLapse).toBeNull();
    expect(state.sceneResume).toBe(true);
    expect(state.sceneFound.length).toBe(1);
    const resume = [...host.querySelectorAll('.uni-scene-card button')].find((b) => /Resume time-lapse/.test(b.textContent));
    await click(resume);
    expect(state.isPlaying).toBe(true);
    expect(window._universeTimeLapse).not.toBeNull();
    expect(state.sceneInspect).toBe(null);
  });
});

describe('Universe time-lapse canvas sizing', () => {
  // Assigning canvas.width, even to the same number, clears the bitmap. The scene's
  // resize observer did that on its first callback, and a still scene (the default
  // under reduced motion) never redrew, so it opened blank until time changed.
  it('re-measures only when the size really changes', async () => {
    const { act } = React;
    const observers = [], restore = [];
    vi.stubGlobal('ResizeObserver', class { constructor(cb) { this.cb = cb; observers.push(this); } observe() {} disconnect() {} });
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    const ctx = new Proxy({}, { get: (_t, prop) => prop === 'createImageData' ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : prop === 'createLinearGradient' || prop === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {}, set: () => true });
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = () => ctx;
    let size = [640, 360];
    ['offsetWidth', 'offsetHeight'].forEach((prop, axis) => {
      const before = Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop);
      Object.defineProperty(HTMLElement.prototype, prop, { configurable: true, get() { return this.tagName === 'CANVAS' ? size[axis] : 0; } });
      restore.push(() => Object.defineProperty(HTMLElement.prototype, prop, before));
    });
    resetStemLab();
    const config = loadTool(TOOL, 'universe'), host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    try {
      function Harness() { const [toolData, setToolData] = React.useState({ universe: { tutorialDismissed: true, sceneMotion: 'still' } }); return config.render(makeCtx({ toolData, setToolData })); }
      await act(async () => root.render(React.createElement(Harness)));
      const canvas = host.querySelector('[data-universe-canvas]'), width = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'width');
      expect(canvas.width).toBe(640 * (window.devicePixelRatio || 1));
      let writes = 0;
      Object.defineProperty(canvas, 'width', { configurable: true, get() { return width.get.call(this); }, set(value) { writes++; width.set.call(this, value); } });
      observers.forEach((observer) => observer.cb([]));
      expect(writes, 'same size must not reassign width').toBe(0);
      size = [700, 360];
      observers.forEach((observer) => observer.cb([]));
      expect(writes).toBe(1);
    } finally {
      await act(async () => root.unmount()); host.remove();
      HTMLCanvasElement.prototype.getContext = getContext;
      restore.forEach((undo) => undo());
      vi.restoreAllMocks(); vi.unstubAllGlobals();
    }
  });
});

describe('Universe time-lapse canvas after a deferred start', () => {
  // A canvas that mounts before it has a size defers its set-up to the scene loop.
  // Restarting the loop used to clear the canvas's init flag, so every later render
  // rebuilt it: new textures, a cleared bitmap, several times a second in playback.
  it('initialises once, then leaves the canvas alone on later renders', async () => {
    const { act } = React;
    const frames = [], restore = [];
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => { frames.push(cb); return frames.length; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const ctx = new Proxy({}, { get: (_t, prop) => prop === 'createImageData' ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : prop === 'createLinearGradient' || prop === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {}, set: () => true });
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = () => ctx;
    let size = [0, 0];
    const box = () => ({ top: 0, left: 0, right: size[0], bottom: size[1], width: size[0], height: size[1] });
    [['offsetWidth', (el) => el.tagName === 'CANVAS' ? size[0] : 0], ['offsetHeight', (el) => el.tagName === 'CANVAS' ? size[1] : 0]].forEach(([prop, read]) => {
      const before = Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop);
      Object.defineProperty(HTMLElement.prototype, prop, { configurable: true, get() { return read(this); } });
      restore.push(() => Object.defineProperty(HTMLElement.prototype, prop, before));
    });
    const rects = Element.prototype.getClientRects, bounds = Element.prototype.getBoundingClientRect;
    Element.prototype.getClientRects = function () { return this.tagName === 'CANVAS' && size[0] ? [box()] : []; };
    Element.prototype.getBoundingClientRect = function () { return this.tagName === 'CANVAS' ? box() : bounds.call(this); };
    const flush = () => { for (let i = 0; i < 5 && frames.length; i++) frames.splice(0).forEach((cb) => cb(16)); };
    resetStemLab();
    const config = loadTool(TOOL, 'universe'), host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    let set;
    try {
      function Harness() { const [toolData, setToolData] = React.useState({ universe: { tutorialDismissed: true, sceneMotion: 'still' } }); set = setToolData; return config.render(makeCtx({ toolData, setToolData })); }
      await act(async () => root.render(React.createElement(Harness)));
      const canvas = host.querySelector('[data-universe-canvas]');
      expect(canvas._universeInit, 'no size yet, so set-up waits').toBe(false);
      size = [640, 360];
      await act(async () => flush());
      expect(canvas._universeInit, 'set up once it has a size').toBe(true);
      const width = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'width');
      let writes = 0;
      Object.defineProperty(canvas, 'width', { configurable: true, get() { return width.get.call(this); }, set(value) { writes++; width.set.call(this, value); } });
      for (const speed of [1.5, 2, 2.5]) await act(async () => set((prev) => ({ ...prev, universe: { ...prev.universe, speed } })));
      expect(writes, 'later renders must not rebuild the canvas').toBe(0);
      expect(canvas._universeInit).toBe(true);
    } finally {
      await act(async () => root.unmount()); host.remove();
      HTMLCanvasElement.prototype.getContext = getContext;
      Element.prototype.getClientRects = rects; Element.prototype.getBoundingClientRect = bounds;
      restore.forEach((undo) => undo());
      vi.restoreAllMocks(); vi.unstubAllGlobals();
    }
  });
});

describe('Universe 3D flight: real-universe notes and light speed', () => {
  it('has a real-universe note for every generated landmark', () => {
    if (!window.UniverseFlight) new Function(readFileSync(resolve(process.cwd(), 'stem_lab/universe_flight_scene.js'), 'utf8'))();
    const missing = ['neighborhood', 'galaxy', 'cosmic'].flatMap((region) => window.UniverseFlight.landmarks(region))
      .filter((landmark) => !(pure.universeLandmarkScience(landmark.id) || '').trim()).map((landmark) => landmark.id);
    expect(missing).toEqual([]);
  });

  it('compares the camera pace with the speed of light', () => {
    const label = (key, fallback) => fallback;
    expect(pure.universeFlightLightMultiple(50, label)).toContain('billion times the speed of light');
    expect(pure.universeFlightLightMultiple(1e-9, label)).toContain('% of the speed of light');
  });
});
