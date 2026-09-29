/**
 * The Moon and the splashdown.
 *
 * The Moon was random polka-dot craters over four faint ovals, and the lunar-orbit
 * view put "Tranquility Base" at a fixed offset nowhere near the 0.674 N, 23.473 E
 * printed underneath it. It is now the real near side, so these pin its geography
 * against where the Apollo crews actually landed, and the marker against the
 * coordinates the student is shown.
 *
 * The splashdown hopped the capsule between three fixed heights, "splashed" it in
 * mid-air well above the sea, and froze on that frame. These pin the waterline, the
 * Apollo 11 recovery that now follows, and that it runs on real time.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadTool, makeCtx, newStore, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { readFileSync } from 'node:fs';
import * as acorn from 'acorn';

// Overridable so a mutation can run against a COPY; other sessions edit this file.
const FILE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';
const ID = 'moonMission';
let P;

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, ID);
  P = window.MoonMissionPure;
});

const inside = (pt, poly) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};

describe('Moon map', () => {
  it('puts each Apollo landing on the terrain it really landed on', () => {
    const maria = P.moonMaria(0, 0, 100);
    const seaOf = (m) => {
      const s = P.moonSites().find((x) => x.m === m);
      const p = P.moonProject(s.lon, s.lat, 0, 0, 100);
      return maria.filter((sea) => inside(p, sea.pts)).map((sea) => sea.name);
    };
    expect(seaOf(11), 'Apollo 11 landed in the Sea of Tranquility').toEqual(['Mare Tranquillitatis']);
    expect(seaOf(12), 'Apollo 12 landed in the Ocean of Storms').toEqual(['Oceanus Procellarum']);
    expect(seaOf(14), 'Fra Mauro is highland, not mare').toEqual([]);
    expect(seaOf(16), 'Descartes is highland, not mare').toEqual([]);
  });

  it('draws every sea on the near side, inside the disc', () => {
    let worst = 0;
    for (const sea of P.moonMaria(0, 0, 100)) for (const [x, y] of sea.pts) worst = Math.max(worst, Math.hypot(x, y));
    expect(worst).toBeGreaterThan(60);
    expect(worst).toBeLessThanOrEqual(100);
  });
});

describe('launch sky', () => {
  it('darkens with the air overhead: blue at the pad, black by 50 km, the horizon never darker than the zenith', () => {
    expect(P.airAbove(0)).toBeCloseTo(1, 5);
    expect(P.airAbove(5), 'ISA: 54,048 Pa').toBeCloseTo(0.5334, 3);   // the troposphere branch
    expect(P.airAbove(10.999), 'no step where the branches meet').toBeCloseTo(0.2234, 3);
    expect(P.airAbove(11), 'ISA: 22,632 of 101,325 Pa').toBeCloseTo(0.2234, 3);
    expect(P.airAbove(20), 'ISA: 5,475 Pa').toBeCloseTo(0.0540, 3);
    const rgb = (s) => s.match(/\d+/g).map(Number);
    const lum = (s) => { const [r, g, b] = rgb(s); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
    const [r, g, b] = rgb(P.skyAt(0).top);
    expect(b > g && g > r, 'blue overhead at the pad').toBe(true);
    let above = Infinity;
    for (const km of [0, 5, 10, 20, 30, 40, 50, 80, 185]) {
      const s = P.skyAt(km);
      expect(lum(s.top), km + ' km: no brighter than lower down').toBeLessThanOrEqual(above);
      expect(lum(s.bottom), km + ' km: horizon vs zenith').toBeGreaterThanOrEqual(lum(s.top));
      above = lum(s.top);
    }
    expect(lum(P.skyAt(20).top), 'dark blue by 20 km').toBeLessThan(0.15);
    expect(lum(P.skyAt(50).top), 'black by 50 km').toBeLessThan(0.03);
    expect(P.skyAt(10).stars, 'no stars in a blue sky').toBe(0);
    expect(P.skyAt(60).stars).toBe(1);
    // A plume spreads to the pressure around it: no wider at the pad, twice by Max Q.
    expect(P.plumeGrow(0)).toBe(1);
    expect(P.plumeGrow(11)).toBeGreaterThan(2);
    expect(P.plumeGrow(185)).toBeGreaterThan(3.3);
  });
});

// A 2D context that records the calls these tests read and accepts the rest.
function recordingCtx() {
  const frame = { text: [], arcs: [], rects: [], grads: [], rots: [], lines: [], fills: [] };
  const grad = () => { const g = { stops: [], addColorStop: (o, c) => g.stops.push(String(c)) }; frame.grads.push(g); return g; };
  const state = {};
  const known = {
    createLinearGradient: grad,
    createRadialGradient: grad,
    fillText: (s, x, y) => frame.text.push({ s: String(s), x, y }),
    fillRect: (x, y, w, h) => frame.rects.push({ x, y, w, h, fill: state.fillStyle }),
    rotate: (a) => frame.rots.push(a),
    lineTo: (x, y) => frame.lines.push([x, y]),
    fill: () => frame.fills.push(state.fillStyle),
    arc: (x, y, r) => frame.arcs.push({ x, y, r }),
    measureText: (s) => ({ width: String(s).length * 6 }),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
  };
  const ctx = new Proxy(state, {
    get: (t, k) => (k in known ? known[k] : k in t ? t[k] : () => {}),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  return { ctx, frame };
}

function findRef(node, test) {
  if (node == null || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const n of node) { const hit = findRef(n, test); if (hit) return hit; } return null; }
  if (node.type === 'canvas' && node.props && test(node.props)) return node.ref || node.props.ref;   // React keeps ref off props
  return findRef(node.props && node.props.children, test);
}

describe('Moon Mission loops', () => {
  let queue;
  beforeEach(() => {
    queue = [];
    vi.stubGlobal('requestAnimationFrame', (cb) => { queue.push(cb); return queue.length; });
  });
  afterEach(() => { vi.unstubAllGlobals(); document.body.innerHTML = ''; });

  // Run a phase's real canvas loop for `n` frames painted `dt` ms apart.
  function run(state, pick, n, dt = 1000 / 60, width) {
    queue = [];
    document.body.innerHTML = '';
    const store = newStore({ moonMission: Object.assign({ animPaused: false, lunarSamples: [] }, state) });
    const tree = window.StemLab._registry[ID].render(makeCtx({ toolData: store.toolData }, store));
    const ref = findRef(tree, pick);
    expect(typeof ref, 'canvas ref').toBe('function');
    const rec = recordingCtx();
    const el = document.createElement('canvas');
    if (width) Object.defineProperty(el, 'offsetWidth', { value: width });   // jsdom lays nothing out
    el.getContext = () => rec.ctx;
    document.body.appendChild(el);
    const frames = [];
    const snap = () => {
      frames.push({ text: rec.frame.text.slice(), arcs: rec.frame.arcs.slice(), rects: rec.frame.rects.slice(), grads: rec.frame.grads.slice(), rots: rec.frame.rots.slice(), lines: rec.frame.lines.slice(), fills: rec.frame.fills.slice(), dataset: Object.assign({}, el.dataset), mm: Object.assign({}, store.toolData.moonMission) });
      rec.frame.text.length = 0; rec.frame.arcs.length = 0; rec.frame.rects.length = 0; rec.frame.grads.length = 0; rec.frame.rots.length = 0; rec.frame.lines.length = 0; rec.frame.fills.length = 0;
    };
    ref(el);
    snap();
    for (let i = 1; i < n && queue.length; i++) {
      const q = queue; queue = [];
      q.forEach((cb) => cb(i * dt));
      snap();
    }
    return { frames, stopped: queue.length === 0 };
  }
  const orbitCanvas = (p) => !!p['data-lunar-atlas'];
  const reentryCanvas = (p) => /re-entry and recovery/i.test(String(p['aria-label']));

  it('lights the Moon as on landing day: sunrise just west of the site, a six-day crescent from Earth', () => {
    // The Moon was drawn full. Apollo 11 landed with the Sun 10.8 degrees up.
    const site = P.moonSites()[0], term = P.terminatorLon();
    expect(site.lon - term, 'Sun elevation at the site').toBeCloseTo(10.8, 5);
    expect((1 - Math.sin(term * Math.PI / 180)) / 2, 'fraction lit, seen from Earth (six-day Moon ~38%)').toBeCloseTo(0.38, 1);
    const note = document.createElement('div');
    note.innerHTML = renderTool(ID, { moonMission: { missionPhase: 4 } });
    const text = note.querySelector('[data-moonmission-lunar-morning]').textContent;
    expect(text).toContain('about ' + Math.round(site.lon - term) + ' degrees');
    // The shadow falls west (left), the Sun is east (right); in a real 110 km orbit
    // about 39% of each 2 h orbit is dark, Apollo's ~47 minutes of lunar night.
    expect(P.craftInShadow(Math.PI, 1.2, term), 'west of the Moon').toBe(true);
    expect(P.craftInShadow(0, 1.2, term), 'east of the Moon').toBe(false);
    const k = (1737.4 + 110) / 1737.4, n = 3600;
    let dark = 0;
    for (let i = 0; i < n; i++) if (P.craftInShadow((i / n) * 2 * Math.PI, k, term)) dark++;
    expect(dark / n * 120, 'minutes of darkness per 2 h orbit').toBeGreaterThan(44);
    expect(dark / n * 120).toBeLessThan(50);
    // The geographic atlas keeps the landing-day terminator while the separate
    // insertion diagram uses measured Cartesian positions for its trajectory.
    const { frames } = run({ missionPhase: 4 }, orbitCanvas, 3);
    const f = frames.find(frame => frame.text.some(t => t.s === 'Tranquility Base'));
    const moon = f.arcs.reduce((a, b) => (b.r > a.r ? b : a));
    expect(f.fills, 'the night side remains shaded').toContain('rgba(4,7,18,0.9)');
    const eq = P.moonProject(term, 0, moon.x, moon.y, moon.r);
    expect(f.lines.some(([x, y]) => Math.abs(x - eq[0]) < 0.01 && Math.abs(y - eq[1]) < 0.01), 'terminator on the equator').toBe(true);
  }, 60_000);

  it('marks Tranquility Base at the coordinates printed under the lunar-orbit view', () => {
    const html = renderTool(ID, { moonMission: { missionPhase: 4 } });
    const m = /([\d.]+)\u00B0N, ([\d.]+)\u00B0E/.exec(html);
    expect(m, 'the view states the landing coordinates').toBeTruthy();
    const { frames } = run({ missionPhase: 4 }, orbitCanvas, 3);
    const f = frames.find(frame => frame.text.some(t => t.s === 'Tranquility Base'));
    const moon = f.arcs.reduce((a, b) => (b.r > a.r ? b : a));
    const label = f.text.find((t) => t.s === 'Tranquility Base');
    expect(label, 'the site is labelled').toBeTruthy();
    const want = P.moonProject(Number(m[2]), Number(m[1]), moon.x, moon.y, moon.r);
    // The label sits 6px left of the dot and 4px below its centre line.
    expect(Math.abs(label.x + 6 - want[0]), 'marker x vs 23.473 E').toBeLessThan(0.5);
    expect(Math.abs(label.y - 4 - want[1]), 'marker y vs 0.674 N').toBeLessThan(0.5);
  });

  it('names the seas and every Apollo site only when the student asks', () => {
    const on = run({ missionPhase: 4, moonLabels: true }, orbitCanvas, 3).frames.flatMap(f => f.text.map((t) => t.s));
    ['Sea of Tranquility', 'Ocean of Storms', '12', '17'].forEach((s) => expect(on, s).toContain(s));
    const off = run({ missionPhase: 4, moonLabels: false }, orbitCanvas, 3).frames.flatMap(f => f.text.map((t) => t.s));
    expect(off).not.toContain('Sea of Tranquility');
    expect(off).not.toContain('17');
    const d = document.createElement('div');
    d.innerHTML = renderTool(ID, { moonMission: { missionPhase: 4, moonLabels: true } });
    expect(d.querySelector('[data-moonmission-moon-labels]').getAttribute('aria-pressed')).toBe('true');
    expect(d.querySelectorAll('[data-moonmission-moon-sites] li').length).toBe(6);
    d.innerHTML = renderTool(ID, { moonMission: { missionPhase: 4 } });
    expect(d.querySelector('[data-moonmission-moon-labels]').getAttribute('aria-pressed')).toBe('false');
    expect(d.querySelector('[data-moonmission-moon-sites]')).toBeNull();
  });

  it('lunar ascent reaches computed insertion without claiming a docking or Earthrise', () => {
    const ascentCanvas = (p) => !!p['data-ascent-canvas'];
    const { frames } = run({ missionPhase: 7 }, ascentCanvas, 1000);
    const inserted = frames.filter((f) => f.dataset.ascentPhase === 'orbit');
    expect(inserted.length, 'the integrated ascent should reach insertion within the frames run').toBeGreaterThan(20);
    inserted.forEach((f) => {
      expect(f.dataset.ascentEngine).toBe('off');
      expect(Number(f.dataset.ascentThrust)).toBe(0);
      expect(f.mm.ascentResult.outcome).toBe('orbit');
      expect(f.mm.dockingResult).toBeFalsy();
    });
    const all = frames.flatMap((f) => f.text.map((t) => t.s));
    expect(all).not.toContain('Earthrise');
    expect(all).not.toContain('HARD DOCK CONFIRMED');
  }, 60_000);   // a thousand real loop frames; slow under load, not wrong

  it('trans-lunar coast: fast off Earth, slowest where the Moon takes over, faster again after', () => {
    // The craft used to slide across at one steady speed with distance a straight
    // function of time. The model it now flies is the energy equation.
    const at = (f) => P.coastAt(f);
    expect(at(0).v).toBeCloseTo(10.84, 2);                        // the TLI burn
    expect(at(1).r, 'arrives 110 km above the Moon').toBeCloseTo(384400 - 1737.4 - 110, 0);
    expect(at(0.1).r / 384400, 'a quarter of the way in the first tenth of the time').toBeGreaterThan(0.2);
    let vmin = Infinity, rAtMin = 0;
    for (let i = 0; i <= 400; i++) { const c = at(i / 400); if (c.v < vmin) { vmin = c.v; rAtMin = c.r; } }
    expect(Math.abs(rAtMin - P.equalPull()) / 384400, 'slowest where the pulls balance').toBeLessThan(0.01);
    expect(vmin).toBeGreaterThan(0.8);
    expect(vmin).toBeLessThan(1.5);                                // Apollo 11 was near 1 km/s there
    expect(Math.round(384400 / 12742), 'the true-scale note says 30 Earths fit in the gap').toBe(30);
  });

  it('the live coast uses the same measured trajectory at every viewport and scale', () => {
    const coastCanvas = (p) => !!p['data-transit-canvas'], profile = P.transitProfile(), time = 36 * 3600;
    const expected = P.transitSample(profile, time);
    for (const width of [300, 1014]) for (const trueScale of [false, true]) {
      const { frames } = run({ missionPhase: 3, animPaused: true, trueScale,
        transitRun: { version: 1, time, recorded: false } }, coastCanvas, 3, 1000 / 60, width);
      const frame = frames.at(-1), data = frame.dataset;
      expect(Number(data.transitTime)).toBe(time);
      for (const [key, field] of [['EarthDistance', 'earthDistance'], ['MoonDistance', 'moonDistance'], ['EarthSpeed', 'earthSpeed'], ['MoonSpeed', 'moonSpeed']]) {
        expect(Number(data['transit' + key]), width + 'px / ' + trueScale).toBeCloseTo(expected[field], 6);
      }
      expect(data.transitEngine).toBe('off'); expect(data.transitPlume).toBe('off');
      expect(frame.text.length).toBeGreaterThan(0);
    }
    const d = document.createElement('div'); d.innerHTML = renderTool(ID, { moonMission: { missionPhase: 3, trueScale: true } });
    expect(d.querySelector('[data-moonmission-true-scale]').getAttribute('aria-pressed')).toBe('true');
    expect(d.querySelector('[data-moonmission-true-scale-note]').textContent).toContain('one distance scale');
    expect(d.querySelector('[data-transit-readouts]').textContent).toContain('Earth-relative speed');
    expect(d.querySelector('[data-transit-readouts]').textContent).toContain('Moon-relative speed');
    expect(d.querySelector('[data-coast-model-note]').textContent).toContain('does not simulate capture or guarantee a return');
  });

  it('Earth orbit: the globe fits the new diagram and physical illumination is independent of viewport size', () => {
    const leoCanvas = (p) => p['aria-describedby'] === 'mm-earth-orbit-description';
    const time = P.orbitSnapshot(0, 360).period * 0.75;
    for (const width of [500, 1014]) {
      const state = { missionPhase: 2, animPaused: true, orbitRun: { version: 1, time } };
      const { frames } = run(state, leoCanvas, 1, 1000 / 60, width);
      const f = frames[frames.length - 1];
      const eR = Math.min(320 * 0.22, width * 0.17), eX = width * (width < 520 ? 0.40 : 0.34), eY = 320 * 0.53;
      expect(f.arcs.some((a) => Math.abs(a.x - eX) < 1e-6 && Math.abs(a.y - eY) < 1e-6 && Math.abs(a.r - eR) < 1e-6), width + 'px: Earth radius').toBe(true);
      expect(f.dataset.orbitShadow, width + 'px: far-side craft is in shadow').toBe('true');
      expect(Number(f.dataset.orbitTime)).toBe(time);
      expect(f.dataset.orbitEngine, 'being near the burn window does not ignite the engine').toBe('off');
      const page = document.createElement('div'); page.innerHTML = renderTool(ID, { moonMission: state });
      expect(page.querySelector('[data-orbit-value="light"]').textContent).toBe('Earth shadow');
      expect(page.querySelector('[data-orbit-value="engine"]').textContent).toBe('Coasting — engine off');
    }
  });

  it('Earth orbit: a sunrise every orbit, and the TLI window opens on the same clock at any frame rate', () => {
    // The sunrise and shadow state follow the physical orbital angle, not the
    // enlarged ellipse on screen or the number of frames that were painted.
    const leoCanvas = (p) => p['aria-describedby'] === 'mm-earth-orbit-description';
    const first = P.orbitSnapshot(0, 360), period = first.period, omega = 2 * Math.PI / period;
    const shadowHalf = Math.asin(P.orbit.radius / (P.orbit.radius + P.orbit.altitude));
    const sunrise = (1.5 * Math.PI + shadowHalf) / omega;
    // Restore immediately before two successive sunrises, then cross each one
    // using the actual renderer's clock. Pure tests cover the intervening orbit.
    for (const lap of [0, 1]) {
      const time = sunrise + lap * period - 15;
      const { frames } = run({ missionPhase: 2, orbitPlaybackRate: 30, orbitRun: { version: 1, time } }, leoCanvas, 64);
      const counts = frames.map(f => Number(f.dataset.orbitSunrises));
      expect(counts[0]).toBe(lap);
      expect(counts.at(-1), 'one sunrise is counted at this crossing').toBe(lap + 1);
      expect(frames[0].dataset.orbitShadow).toBe('true');
      expect(frames.at(-1).dataset.orbitShadow).toBe('false');
      for (let i = 1; i < counts.length; i++) expect(counts[i] - counts[i - 1]).toBeGreaterThanOrEqual(0);
      frames.forEach(f => {
        const expected = P.orbitSnapshot(Number(f.dataset.orbitTime), 30);
        expect(Number(f.dataset.orbitSunrises)).toBe(expected.sunrises);
        expect(f.dataset.orbitShadow).toBe(String(expected.inShadow));
      });
    }
    const orbitSamples = Array.from({ length: 16 }, (_, i) => run({ missionPhase: 2, animPaused: true, orbitRun: { version: 1, time: i * period / 16 } }, leoCanvas, 1).frames[0]);
    const shadowFraction = orbitSamples.filter(f => f.dataset.orbitShadow === 'true').length / orbitSamples.length;
    expect(shadowFraction, 'part of each orbit is in shadow').toBeGreaterThan(0.1);
    expect(shadowFraction).toBeLessThan(0.5);
    // The window (and the whole orbit) used to run twice as fast on a 120 Hz screen.
    const opening = first.nextWindowTime - P.orbit.windowHalfWidth / omega;
    const goAt = {};
    for (const fps of [30, 60, 120]) {
      const dt = 1000 / fps;
      const r = run({ missionPhase: 2, orbitPlaybackRate: 360, orbitRun: { version: 1, time: opening - 180 } }, leoCanvas, Math.ceil(1200 / dt), dt);
      const i = r.frames.findIndex((f) => f.dataset.orbitWindow === 'go');
      expect(i, fps + ' fps: the window never opened').toBeGreaterThan(0);
      goAt[fps] = { t: i * dt, dt };
      expect(Math.abs(goAt[fps].t - 500), fps + ' fps: opens after half a real second').toBeLessThanOrEqual(2 * dt + 1);
    }
    for (const fps of [30, 120]) expect(Math.abs(goAt[fps].t - goAt[60].t), fps + ' fps vs 60 fps').toBeLessThanOrEqual(2 * goAt[fps].dt + 1);
  }, 60_000);

  it('trans-Earth coast: the entry corridor on the canvas follows the slider', () => {
    // The corridor was a slider and a bar below the canvas; the coast itself never
    // showed the angle being chosen. The inset appears late in the coast and reads
    // the same live value the slider sets.
    const teiCanvas = (p) => p['data-teicoast-canvas'] === 'true';
    const late = (angle) => {
      const st = { missionPhase: 8 };
      if (angle != null) st.entryAngle = angle;
      const fr = run(st, teiCanvas, 1700).frames;
      return { early: fr[200].text.map((t) => t.s), late: fr[fr.length - 1].text.map((t) => t.s) };
    };
    const nominal = late(null), skip = late(-4.5), steep = late(-8.5);
    expect(nominal.early, 'not before the coast closes in').not.toContain('ENTRY PREVIEW');
    expect(nominal.late).toContain('ENTRY PREVIEW');
    const verdict = (t) => t.find((s) => /\u00B0 (splashdown|skip-out|high load)$/.test(s));
    expect(verdict(nominal.late)).toBe('-6.5\u00B0 splashdown');
    expect(verdict(skip.late)).toBe('-4.5\u00B0 skip-out');
    expect(verdict(steep.late)).toBe('-8.5\u00B0 high load');
    expect(nominal.late).toContain('reference sketch; angles x4');
  }, 120_000);   // thousands of real loop frames; slow under load, not wrong

  it('trans-lunar prediction waits for a recorded nominal trajectory and uses its measured speed minimum', () => {
    const page = (st) => { const d = document.createElement('div'); d.innerHTML = renderTool(ID, { moonMission: Object.assign({ missionPhase: 3 }, st) }); return d; };
    const before = page({});
    const card = before.querySelector('[data-moonmission-predict="coast_speed"]');
    expect(card, 'the prediction card').toBeTruthy();
    expect(card.querySelectorAll('[data-moonmission-predict-option]').length).toBe(3);
    expect(before.textContent, 'the answer is not on the page before the flight shows it').not.toMatch(/speed(s)? up again|a tenth as fast/i);
    const p = P.transitProfile(), coastCanvas = (props) => !!props['data-transit-canvas'];
    const { frames } = run({ missionPhase: 3, transitRun: { version: 1, time: p.summary.duration - 120, recorded: false } }, coastCanvas, 8);
    expect(frames[0].mm.transitResult).toBeNull();
    const seen = frames.find(frame => frame.mm.transitRun && frame.mm.transitRun.recorded);
    expect(seen, 'the completed coast publishes its measured result').toBeTruthy();
    expect(seen.mm.transitResult.minimumEarthSpeed).toBe(p.events.minimumEarthSpeed.earthSpeed);
    expect(seen.mm.transitResult.minimumEarthSpeedTime).toBe(p.events.minimumEarthSpeed.time);
    const after = page({ ...seen.mm, predictions: { coast_speed: 'dip' } });
    const revealed = after.querySelector('[data-moonmission-predict="coast_speed"]').textContent;
    expect(revealed).toMatch(/matched the flight/);
    expect(revealed).toContain('Measured minimum Earth-relative speed: ' + (p.summary.minimumEarthSpeed / 1000).toFixed(3) + ' km/s');
    expect(revealed).toContain('equal gravitational pulls do not define a universal speed minimum');
    const wrong = page({ ...seen.mm, predictions: { coast_speed: 'steady' } });
    expect(wrong.querySelector('[data-moonmission-predict="coast_speed"]').textContent).toMatch(/The flight showed: Slows down, then speeds up near the Moon/);
    const legacy = page({ coastSlowest: { v: 1, toMoonKm: 38000 }, predictions: { coast_speed: 'dip' } });
    expect(legacy.querySelector('[data-moonmission-predict="coast_speed"]').textContent).not.toContain('matched the flight');
    const changed = P.transitProfile({ speedError: 1 });
    const other = page({ transitPlan: changed.controls, transitRun: { version: 1, time: changed.summary.duration, recorded: true },
      transitResult: { version: 1, ...changed.summary }, predictions: { coast_speed: 'dip' } });
    expect(other.querySelector('[data-moonmission-predict="coast_speed"]').textContent).not.toContain('matched the flight');
  });

  it('ascent altitude and velocity stay identical across narrow and wide views', () => {
    const ascentCanvas = (p) => !!p['data-ascent-canvas'];
    const observations = [300, 1014].map((width) => {
      const { frames } = run({ missionPhase: 7 }, ascentCanvas, 550, 1000 / 60, width);
      return [1, 89, 150, 449, 520].map((index) => {
        const data = frames[index].dataset;
        return { altitude: data.ascentAltitude, speed: data.ascentSpeed, mass: data.ascentMass };
      });
    });
    expect(observations[0]).toEqual(observations[1]);
    expect(new Set(observations[0].map((frame) => frame.speed)).size).toBeGreaterThan(3);
  });

  it('a restored entry without an outcome uses the default angle to calculate peak g', () => {
    const { frames } = run({ missionPhase: 9 }, reentryCanvas, 4);
    const labels = frames.flatMap((frame) => frame.text.map((item) => item.s));
    const peakG = P.entryPeakG(-6.5).toFixed(1);
    expect(labels.some((label) => label.includes('ENTRY -6.5°') && label.includes('PEAK ' + peakG + ' g'))).toBe(true);
    expect(labels).toContain('HEAT FLUX');
    expect(labels.some((label) => /°C$/.test(label))).toBe(false);
    expect(Number(frames[0].dataset.entryTime)).toBe(0);
  });

  it('lunar ascent inserts below Columbia and the prediction waits for a validated docking exercise', () => {
    const ascentCanvas = (p) => !!p['data-ascent-canvas'];
    const { frames } = run({ missionPhase: 7 }, ascentCanvas, 1000);
    const last = frames[frames.length - 1], result = last.mm.ascentResult;
    expect(result.outcome).toBe('orbit');
    expect(result.perilune).toBeGreaterThan(0);
    expect(result.apolune).toBeLessThan(110000);
    expect(Number(last.dataset.ascentAltitude)).toBeCloseTo(result.cutoffAltitude, 6);
    expect(last.mm.dockingRun).toBeFalsy();
    const page = (st) => { const d = document.createElement('div'); d.innerHTML = renderTool(ID, { moonMission: Object.assign({ missionPhase: 7 }, st) }); return d; };
    const closing = page({ ascentStatus: 'rendezvous' });
    expect(closing.querySelectorAll('[data-moonmission-predict="rendezvous_catch"] [data-moonmission-predict-option]').length).toBe(3);
    let docking = P.dockingState();
    for (let i = 0; i < 200 && docking.status === 'flying'; i++) docking = P.dockingStep(docking, 10, 'guided');
    expect(docking.status).toBe('docked');
    const done = page({ ascentRun: last.mm.ascentRun, ascentResult: result, dockingRun: docking, predictions: { rendezvous_catch: 'chase' } });
    const card = done.querySelector('[data-moonmission-predict="rendezvous_catch"]').textContent;
    expect(card).toMatch(/The flight showed: Stay in a lower orbit, which goes around faster/);
    expect(card).toContain('final approach was a separate 110 km exercise');
  }, 120_000);   // a thousand real loop frames; slow under load, not wrong

  it('launch: Max Q is asked in the briefing and answered by the flight, at the height the HUD shows', () => {
    const page = (st) => { const d = document.createElement('div'); d.innerHTML = renderTool(ID, { moonMission: st }); return d; };
    const briefing = page({ missionPhase: 0 });
    expect(briefing.querySelectorAll('[data-moonmission-predict="launch_maxq"] [data-moonmission-predict-option]').length, 'asked before launch').toBe(3);
    const profile = P.launchProfile();
    const count = Math.ceil((5 + (profile.events.maxQ.time + 20) / 30) * 60) + 2;
    const { frames } = run({ missionPhase: 1 }, (p) => !!p['data-launch-canvas'], count);
    const call = frames.findIndex((f) => f.text.some((t) => /^MAX Q/.test(t.s)));
    expect(call, 'a MAX Q call').toBeGreaterThan(0);
    const rec = frames[call].mm.launchMaxQ;
    expect(rec, 'the launch reports it').toBeTruthy();
    expect(frames[call - 1].mm.launchMaxQ, 'not before the call').toBeFalsy();
    const callTime = Number(frames[call].dataset.launchTime);
    expect(callTime, 'the event is observed before revealing the answer').toBeGreaterThanOrEqual(profile.events.maxQ.time - 1e-6);
    expect(callTime - profile.events.maxQ.time).toBeLessThanOrEqual(0.51);
    expect(rec.altKm, 'the record stores the true pressure peak, not the first falling sample').toBeCloseTo(profile.events.maxQ.altitude / 1000, 1);
    expect(rec.velMs, 'Max Q uses air-relative speed').toBeCloseTo(profile.events.maxQ.airSpeed, 0);
    const card = page({ missionPhase: 1, launchMaxQ: rec, predictions: { launch_maxq: 'minute' } }).querySelector('[data-moonmission-predict="launch_maxq"]').textContent;
    expect(card).toMatch(/matched the flight/);
    expect(card).toContain('Max Q on this flight: ' + rec.altKm.toFixed(1) + ' km up');
  }, 60_000);

  it('launch: the air-push gauge uses air-relative speed, and "now" gives way to "passed" after the peak', () => {
    // The banner said "pushing hardest now" for the whole first stage, still at
    // 60 km with the push under 1% of its peak.
    const profile = P.launchProfile();
    const count = Math.ceil((5 + profile.events.stage1.time / 30) * 60) + 2;
    const { frames } = run({ missionPhase: 1 }, (p) => !!p['data-launch-canvas'], count);
    const hud = (f) => {
      return { km: Number(f.dataset.launchAltitude) / 1000, ms: Number(f.dataset.launchAirSpeed) };
    };
    const bar = (f) => { const r = f.rects.find((x) => x.fill === '#fbbf24' && x.h === 8 && x.y === 84); return r ? r.w : null; };
    const peakTick = (f) => { const r = f.rects.find((x) => x.fill === '#ffffff' && x.w === 2 && x.h === 14); return r ? r.x + 1 : null; };
    const stage1 = (f) => f.text.some((t) => t.s === 'STAGE 1/3');
    const flying = frames.map((f, i) => i).filter((i) => stage1(frames[i]) && bar(frames[i]) != null && hud(frames[i]).ms > 0);
    expect(flying.length).toBeGreaterThan(100);
    // Air rotates with Earth: the inertial speed is already about 408 m/s on the
    // pad, while aerodynamic pressure must start from zero air-relative speed.
    // The gauge is half rho times air speed squared, with a 60 kPa full scale.
    flying.forEach((i) => {
      const h = hud(frames[i]);
      expect(Math.abs(bar(frames[i]) - 130 * Math.min(1, P.dynamicPressure(h.km, h.ms) / 60000)), 'frame ' + i).toBeLessThan(2.5);
    });
    // It peaks at the MAX Q call and falls after; the white tick stays at the peak.
    const call = frames.findIndex((f) => f.text.some((t) => /^MAX Q/.test(t.s)));
    const widths = flying.map((i) => bar(frames[i])), top = Math.max(...widths);
    expect(Math.abs(flying[widths.indexOf(top)] - call), 'the bar tops out at the call').toBeLessThanOrEqual(1);
    const late = flying.filter((i) => Number(frames[i].dataset.launchTime) > profile.events.maxQ.time + 20 && Number(frames[i].dataset.launchPressure) < profile.summary.peakQ * 0.6);
    expect(late.length).toBeGreaterThan(20);
    late.forEach((i) => {
      expect(bar(frames[i]), 'falling').toBeLessThan(top * 0.6);
      expect(Math.abs(peakTick(frames[i]) - (500 - 148 + 130 * Math.min(1, profile.summary.peakQ / 60000))), 'the tick holds the physical peak').toBeLessThan(0.01);
    });
    // "now" only right at the peak, then "passed" at the height the card reports.
    const rec = frames[call].mm.launchMaxQ;
    const nowAt = frames.map((f, i) => (f.text.some((t) => /hardest now/.test(t.s)) ? i : -1)).filter((i) => i >= 0);
    expect(nowAt[0]).toBe(call);
    expect(nowAt.length, 'the peak notice lasts briefly, not the rest of the stage').toBeLessThanOrEqual(60);
    late.forEach((i) => {
      const t = frames[i].text.map((x) => x.s);
      expect(t).toContain('MAX Q passed at ' + rec.altKm.toFixed(1) + ' km');
      expect(t).toContain('peak at ' + rec.altKm.toFixed(1) + ' km');
    });
    // Before the peak nothing on the canvas says where it will be.
    frames.slice(0, call).forEach((f) => expect(f.text.some((t) => /^peak at|^MAX Q/.test(t.s))).toBe(false));
  }, 60_000);

  it('launch: the loop paints the sky for the height on the HUD, sinks the horizon by the dip angle, and swells the plume', () => {
    // The sky was three fixed gradients switched on a raw counter: still mid-blue
    // at 160 km, with no horizon at all from 4 km to over 100 km.
    const count = Math.ceil((5 + P.launchProfile().summary.duration / 30) * 60) + 2;
    const { frames } = run({ missionPhase: 1 }, (p) => !!p['data-launch-canvas'], count);
    const hudKm = (f) => Number(f.dataset.launchAltitude) / 1000;
    const rgb = (s) => s.match(/\d+/g).map(Number);
    const flying = frames.filter((f) => f.text.some((t) => t.s === 'ALTITUDE'));
    expect(flying.length).toBeGreaterThan(300);
    let checked = 0;
    flying.forEach((f, i) => {
      if (i % 20) return;
      const km = hudKm(f), want = P.skyAt(km);
      const sky = f.grads.find((g) => g.stops.length === 2 && g.stops.every((c) => /^rgb\(/.test(c)));
      expect(sky, km + ' km: a sky').toBeTruthy();
      rgb(sky.stops[0]).forEach((c, k) => expect(Math.abs(c - rgb(want.top)[k]), km + ' km zenith').toBeLessThanOrEqual(3));
      // The Earth is the smallest huge circle (the limb glow is a larger one); its top
      // sits acos(R / (R + h)) below eye level (0.6 H), at 0.87 H per radian.
      const earth = f.arcs.filter((a) => a.r > 1000).reduce((a, b) => (!a || b.r < a.r ? b : a), null);
      expect(earth, km + ' km: the Earth is in view').toBeTruthy();
      expect(Math.abs(earth.y - earth.r - (400 * 0.6 + 400 * 0.87 * Math.acos(6371 / (6371 + km)))), km + ' km horizon').toBeLessThan(2);
      // The Vehicle Assembly Building is on the pad view, not seen from 6 km up.
      const vab = f.rects.some((r) => r.fill === '#d6d3ce');
      if (km > 6.5) expect(vab, km + ' km: no VAB').toBe(false);
      checked++;
    });
    expect(checked).toBeGreaterThan(15);
    expect(frames[0].rects.some((r) => r.fill === '#d6d3ce'), 'the VAB stands on the horizon at the pad').toBe(true);
    // The kerosene plume fades as it spreads, by mmPlumeGrow at the height on the HUD.
    const plume = flying.filter((f) => f.text.some((t) => t.s === 'STAGE 1/3'))
      .map((f) => ({ km: hudKm(f), g: f.grads.find((g) => /^rgba\(255,120,0,/.test(g.stops[0])) })).filter((x) => x.g);
    expect(plume.length).toBeGreaterThan(80);
    const alpha = (g) => Number(g.stops[0].split(',')[3].replace(')', ''));
    plume.forEach(({ km, g }) => expect(Math.abs(alpha(g) - 0.8 / Math.sqrt(P.plumeGrow(km))), km + ' km plume').toBeLessThan(0.02));
    expect(alpha(plume[0].g) - alpha(plume[plume.length - 1].g), 'thinner by staging').toBeGreaterThan(0.3);
  }, 120_000);

  it('launch: on a narrow canvas the Mach / Max Q banner sits clear of both HUD boxes', () => {
    for (const width of [300, 500]) {
      const time = P.launchProfile().events.maxQ.time + 20;
      const state = { missionPhase: 1, animPaused: true, launchRun: { version: 1, time, recorded: false } };
      const { frames } = run(state, (p) => !!p['data-launch-canvas'], 1, 1000 / 60, width);
      const f = frames.find((x) => x.text.some((t) => /^MAX Q passed/.test(t.s)));
      expect(f, width + 'px: the banner is up').toBeTruthy();
      const banner = f.rects.find((r) => r.fill === 'rgba(15,23,42,0.55)');
      const boxes = f.rects.filter((r) => r.fill === 'rgba(0,0,0,0.5)');
      expect(boxes.length).toBe(2);
      boxes.forEach((b) => {
        const apart = banner.y >= b.y + b.h || b.y >= banner.y + banner.h || banner.x >= b.x + b.w || b.x >= banner.x + banner.w;
        expect(apart, width + 'px: banner ' + JSON.stringify(banner) + ' vs box ' + JSON.stringify(b)).toBe(true);
      });
    }
  }, 60_000);

  it('Fly Another Mission clears what revealed the coast and launch cards', () => {
    // Reset only needs a valid compact save. Reintegrating the entire launch here
    // adds cost without testing any further reset behavior.
    const result = { version: 1, outcome: 'orbit', duration: 648.4, cutoffAltitude: 185000, cutoffSpeed: 7800,
      perigee: 180000, apogee: 190000, eccentricity: 0.0008, period: 5300,
      peakG: 4, peakQ: 35000, propellantRemaining: 74000 };
    const store = newStore({ moonMission: { missionPhase: 10, lunarSamples: [], coastSlowest: { v: 1.13, toMoonKm: 38376 }, launchMaxQ: { altKm: 10.9, velMs: 539 }, launchRun: { version: 1, time: result.duration, recorded: true }, launchResult: result, predictions: { coast_speed: 'dip' } } });
    const tree = window.StemLab._registry[ID].render(makeCtx({ toolData: store.toolData }, store));
    const btns = [];
    const walk = (n) => { if (n == null || typeof n !== 'object') return; if (Array.isArray(n)) { n.forEach(walk); return; } if (n.type === 'button') btns.push(n.props); walk(n.props && n.props.children); };
    walk(tree);
    const again = btns.find((b) => /Reset and start a new Moon mission/.test(String(b.title || '')));
    expect(again, 'Fly Another Mission').toBeTruthy();
    again.onClick();
    const mm = store.toolData.moonMission;
    expect(mm.coastSlowest, 'coast record cleared').toBeNull();
    expect(mm.launchMaxQ, 'launch record cleared').toBeNull();
    expect(mm.launchRun, 'launch playback clock cleared').toBeNull();
    expect(mm.launchResult, 'insertion result cleared').toBeNull();
    expect(mm.predictions).toBeNull();
  });

  it('splashes down in the water, not above it, and is righted after capsizing', () => {
    const HR = 300;
    const pose = (t) => P.splashPose(t, HR);
    // The body runs from 10.5 px above its centre (apex) to 10 px below (heat shield).
    expect(pose(560).capsuleY + 10, 'still in the air 40 steps out').toBeLessThan(pose(560).waterY);
    const splash = pose(601);
    expect(splash.afloat).toBe(true);
    expect(splash.capsuleY + 10, 'heat shield in the water at splashdown').toBeGreaterThan(splash.waterY);
    expect(splash.capsuleY - 10.5, 'apex above the water at splashdown').toBeLessThan(splash.waterY);
    expect(splash.oceanTop, 'the sea is up to the waterline by then').toBeLessThanOrEqual(splash.waterY + 1e-9);
    for (let t = 361; t <= 600; t++) expect(pose(t).capsuleY, 'descends steadily').toBeGreaterThanOrEqual(pose(t - 1).capsuleY);
    expect(Math.abs(pose(700).angle - Math.PI), 'Stable 2: nose down').toBeLessThan(0.01);
    expect(pose(750).bags, 'bags full before it rolls back').toBeGreaterThan(0.99);
    expect(Math.abs(pose(860).angle), 'Stable 1: upright again').toBeLessThan(0.01);
  });

  it('trans-Earth coast: the crew window shows Earth at the phase the model gives for the distance on the HUD', () => {
    const teiCanvas = (p) => /trans-Earth coast/i.test(String(p['aria-label']));
    const { frames } = run({ missionPhase: 8 }, teiCanvas, 1960);
    const read = (f) => {
      const t = f.text.map((x) => x.s), i = t.indexOf('TO EARTH');
      const lit = t.find((s) => /^Earth \d+% lit$/.test(s));
      return i < 0 || !lit ? null : { km: Number(t[i + 1].replace(/[^0-9]/g, '')), pct: parseInt(lit.slice(6), 10) };
    };
    const seen = frames.map(read).filter(Boolean);
    expect(seen.length).toBeGreaterThan(1500);
    seen.forEach((s, i) => { if (i % 25 === 0) expect(s.pct, s.km + ' km').toBe(Math.round(P.returnView(s.km).lit * 100)); });
    expect(seen[0].pct, 'about half lit as the coast begins').toBeGreaterThanOrEqual(44);
    expect(seen[seen.length - 1].pct, 'a crescent by the end').toBeLessThan(seen[0].pct - 20);
    expect(frames[10].fills, 'the Moon behind is lit by the same Sun as Earth').toContain('rgba(1,1,8,0.86)');
  }, 120_000);

  it('entry: the compatibility helper samples physical heating and motion without forcing a saved outcome', () => {
    const profile = P.entryProfile(-6.5), drogue = profile.events.drogue;
    for (const tick of [0, 60, 150, 250, 360]) {
      const legacy = P.entryState(tick, 'nominal', -6.5);
      const physical = P.entrySample(profile, tick / 360 * drogue.time);
      expect(legacy.h).toBeCloseTo(physical.altitude / 1000, 9);
      expect(legacy.gamma).toBeCloseTo(-physical.gamma * 180 / Math.PI, 9);
      expect(legacy.speed).toBe(physical.speed);
      expect(legacy.heatFlux).toBe(physical.heatFlux);
      expect(legacy.tempC, 'no unsupported heat-shield temperature prediction').toBeUndefined();
      expect(P.entryState(tick, 'skip', -6.5), 'a stale saved label cannot change the trajectory').toEqual(legacy);
    }
    expect(P.entryState(0, 'nominal', -5.8).gamma).toBeCloseTo(5.8, 5);
    const skip = P.entryState(360, 'nominal', -4.5);
    expect(skip.stage).toBe('skip');
    expect(skip.gamma, 'positive physical gamma means climbing out').toBeLessThan(0);
    expect(skip.h).toBe(P.entry.interfaceAltitude / 1000);
    const steep = P.entryProfile(-8.5);
    expect(steep.summary.peakHeatFlux).toBeGreaterThan(profile.summary.peakHeatFlux);
    expect(steep.summary.peakHeatTime).toBeLessThan(profile.summary.peakHeatTime);
  });

  it('entry: the canvas heat flux, shield-first attitude and chute timing follow its physical playhead', () => {
    const profile = P.entryProfile(-6.5), dt = 1000 / 60;
    const { frames } = run({ missionPhase: 9 }, reentryCanvas, Math.ceil(profile.events.drogue.time / 30 * 60) + 5, dt);
    let matched = 0;
    for (const frame of frames) {
      const seconds = Number(frame.dataset.entryTime), physical = P.entrySample(profile, seconds);
      if (physical.stage !== 'entry') continue;
      const flux = frame.text.find((text) => /^\d+\.\d{2} MW\/m²$/.test(text.s));
      expect(flux, seconds + ' s: flux readout').toBeTruthy();
      expect(Math.abs(parseFloat(flux.s) - physical.heatFlux / 1e6)).toBeLessThanOrEqual(0.0051);
      expect(frame.rots.some((angle) => Math.abs(angle - (Math.PI / 2 + physical.gamma)) < 0.0001),
        seconds + ' s: shield faces the relative flow').toBe(true);
      matched++;
    }
    expect(matched).toBeGreaterThan(800);
    const firstDrogue = frames.find((frame) => frame.mm.reentryStatus === 2);
    expect(firstDrogue, 'drogues become visible at the model deployment event').toBeTruthy();
    expect(Number(firstDrogue.dataset.entryTime)).toBeGreaterThanOrEqual(profile.events.drogue.time);
    expect(Number(firstDrogue.dataset.entryTime) - profile.events.drogue.time).toBeLessThanOrEqual(30 * dt / 1000 + 0.001);
  }, 60_000);

  it('entry: 30x playback advances in real time at different frame rates and preserves a paused playhead', () => {
    const finalTimes = [];
    for (const fps of [20, 60, 120]) {
      const { frames } = run({ missionPhase: 9 }, reentryCanvas, fps * 5 + 2, 1000 / fps);
      expect(Number(frames[0].dataset.entryTime)).toBe(0);
      const time = Number(frames.at(-1).dataset.entryTime);
      expect(Math.abs(time - 150)).toBeLessThanOrEqual(30 / fps + 0.001);
      expect(Math.abs(frames.at(-1).mm.entryRun.time - time), '4 Hz persistence stays close to the visible playhead').toBeLessThanOrEqual(7.5 + 30 / fps);
      finalTimes.push(time);
    }
    expect(Math.max(...finalTimes) - Math.min(...finalTimes)).toBeLessThanOrEqual(1.5);
    const paused = run({ missionPhase: 9, animPaused: true,
      entryRun: { version: 1, angle: -6.5, time: 123, recovery: 0, recorded: false } }, reentryCanvas, 20);
    expect(paused.stopped, 'paused view remains available for resize and review').toBe(false);
    for (const frame of paused.frames) expect(Number(frame.dataset.entryTime)).toBe(123);
  }, 60_000);

  it('entry: splashdown follows the model duration, then recovery finishes while repaint stays available', () => {
    const profile = P.entryProfile(-6.5), fps = 30, dt = 1000 / fps;
    const order = ['Splashdown in the Pacific.', 'Stable 2:', 'Three uprighting bags', 'Stable 1:', 'Recovery swimmers'];
    const { frames, stopped } = run({ missionPhase: 9 }, reentryCanvas, Math.ceil((profile.summary.duration / 30 + 12) * fps), dt);
    expect(stopped, 'the finished view still responds to resize and timeline review').toBe(false);
    const first = order.map((caption) => frames.findIndex((frame) => frame.text.some((text) => text.s.includes(caption))));
    first.forEach((index, i) => expect(index, 'never showed ' + order[i]).toBeGreaterThan(0));
    for (let i = 1; i < first.length; i++) expect(first[i], order[i] + ' follows ' + order[i - 1]).toBeGreaterThan(first[i - 1]);
    const splashIndex = frames.findIndex((frame) => frame.mm.reentryStatus === 4);
    expect(Math.abs(splashIndex * dt / 1000 - profile.summary.duration / 30)).toBeLessThanOrEqual(2 / fps + 0.001);
    for (const frame of frames.slice(splashIndex)) {
      expect(Number(frame.dataset.entryTime)).toBeCloseTo(profile.summary.duration, 3);
      expect(frame.mm.entryOutcome.terminal).toBe('splash');
      expect(frame.mm.entryOutcome.completed).toBe(true);
    }
    expect(frames.at(-1).mm.entryRun.recovery).toBeGreaterThanOrEqual(580 / 60 - 0.01);
  }, 60_000);

});

describe('one scope, many models', () => {
  it('the trans-Earth coast keeps its calibrated start speed separate from the outbound model', () => {
    // The trans-lunar model once re-declared MM_R0 and MM_V0 in the same module scope;
    // the return coast then read 6,712 km and 10.84 km/s at call time. Its entry speed
    // came out within 0.1% by coincidence, so only the start gives it away.
    const initialSpeed = Math.sqrt(11.03 ** 2 - 2 * 398600 * (1 / 6500 - 1 / 384400));
    expect(P.returnCoast(0).speedKmh).toBeCloseTo(initialSpeed * 3600, 7);
  });

  it('declares no variable twice in one function scope', () => {
    // A second `var` of the same name in the same scope silently overwrites the first
    // for everything that reads it later, which is how the clash above happened.
    const dupsIn = (src) => {
      const ast = acorn.parse(src, { ecmaVersion: 2020, locations: true });
      const dups = [];
      let scopes = 0;
      const scan = (fn, label) => {
        scopes++;
        const seen = new Map();
        const walk = (n) => {
          if (Array.isArray(n)) { n.forEach(walk); return; }
          if (!n || typeof n.type !== 'string') return;
          if (n !== fn && /Function/.test(n.type)) { scan(n, (n.id && n.id.name) || 'function@' + n.loc.start.line); return; }
          if (n.type === 'VariableDeclaration' && n.kind === 'var') {
            n.declarations.forEach((d) => { if (d.id.type === 'Identifier') seen.set(d.id.name, (seen.get(d.id.name) || []).concat(d.loc.start.line)); });
          }
          for (const k of Object.keys(n)) if (k !== 'loc') walk(n[k]);
        };
        walk(fn.body);
        seen.forEach((lines, name) => { if (lines.length > 1) dups.push(label + ': ' + name + ' at lines ' + lines.join(', ')); });
      };
      scan(ast, 'top level');
      return { dups, scopes };
    };
    // The scan must be able to fail: an early version read nothing and reported clean.
    expect(dupsIn('(function(){ var a = 1; function g(){ var b; } var a = 2; })();').dups).toEqual(['function@1: a at lines 1, 1']);
    const tool = dupsIn(readFileSync(FILE, 'utf8'));
    expect(tool.scopes, 'function scopes scanned in the tool').toBeGreaterThan(200);
    expect(tool.dups).toEqual([]);
  }, 30_000);   // parses the complete mission source; allow for concurrent browser QA
});

describe('canvas text alternatives', () => {
  it('describe what is drawn now, and never state an answer a prediction is still waiting for', () => {
    // A blind student hears only this. The labels had fallen behind the pictures
    // (the ascent one still said "over 60 kilometers"), and a label is also the
    // easiest place for a prediction's answer to leak.
    const tree = (phase) => window.StemLab._registry[ID].render(makeCtx({ toolData: newStore({ moonMission: { missionPhase: phase } }).toolData }, newStore({ moonMission: { missionPhase: phase } })));
    const label = (phase) => {
      const found = [];
      const walk = (n) => {
        if (n == null || typeof n !== 'object') return;
        if (Array.isArray(n)) { n.forEach(walk); return; }
        if (n.type === 'canvas' && n.props && n.props['aria-label']) found.push(String(n.props['aria-label']));
        walk(n.props && n.props.children);
      };
      walk(tree(phase));
      return found.join(' | ');
    };
    const must = {
      1: [/real proportions/, /Mach 1/, /Max Q/, /stages each drop away/],
      2: [/shadow/, /sunrises/, /S-IVB/, /gravity toward Earth/, /engine stays off/],
      3: [/moving Moon/, /Earth-centered/, /Moon-relative/, /engine status/],
      4: [/Near-side lunar atlas/, /Tranquility Base/, /Apollo landing sites/, /sunrise/, /measured spacecraft path/, /geometric radio contact/],
      7: [/computed altitude/, /downrange/, /engine burn/, /insertion orbit/, /Measurements are listed/],
      8: [/entry corridor/, /night side/],
      9: [/just before sunrise/, /uprighting bags/, /flotation collar/],
    };
    Object.entries(must).forEach(([phase, pats]) => {
      const l = label(Number(phase));
      expect(l, 'phase ' + phase + ' has a canvas label').not.toBe('');
      pats.forEach((re) => expect(l, 'phase ' + phase).toMatch(re));
    });
    // Open predictions: TLI (fire on the far side), coast (slows then speeds up),
    // rendezvous (a lower orbit is faster).
    expect(label(1)).not.toMatch(/then Max Q|minute|still thick|rises and falls|rising and falling/i);
    expect(label(2)).not.toMatch(/far side|opposite/i);
    expect(label(3)).not.toMatch(/slow|speeds? up|a tenth/i);
    expect(label(7)).not.toMatch(/faster|lower orbit|below Columbia/i);
    expect(label(7)).not.toMatch(/60 kilometers/);
  });
});
