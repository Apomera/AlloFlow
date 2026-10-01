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
      frames.push({ text: rec.frame.text.slice(), arcs: rec.frame.arcs.slice(), rects: rec.frame.rects.slice(), grads: rec.frame.grads.slice(), rots: rec.frame.rots.slice(), lines: rec.frame.lines.slice(), fills: rec.frame.fills.slice(), mm: Object.assign({}, store.toolData.moonMission) });
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
  const orbitCanvas = (p) => p['aria-describedby'] === 'mm-lunar-orbit-description';
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
    // The loop: the night edge is drawn along that meridian, and the shadow callout
    // follows the model for the orbit it draws (1.2 radii, 0.012 rad a step).
    const { frames } = run({ missionPhase: 4 }, orbitCanvas, 420);
    let shadowFrames = 0;
    frames.forEach((f, i) => {
      if (i < 2) return;
      const moon = f.arcs.reduce((a, b) => (b.r > a.r ? b : a));
      expect(f.fills, 'frame ' + i + ': the night side').toContain('rgba(4,7,18,0.9)');
      const eq = P.moonProject(term, 0, moon.x, moon.y, moon.r);
      expect(f.lines.some(([x, y]) => Math.abs(x - eq[0]) < 0.01 && Math.abs(y - eq[1]) < 0.01), 'frame ' + i + ': terminator on the equator').toBe(true);
      const says = f.text.some((t) => /^IN THE MOON'S SHADOW$/.test(t.s));
      const model = [i - 1, i, i + 1].map((t) => P.craftInShadow(t * 0.012, 1.2, term));
      if (model.every((m) => m === model[0])) expect(says, 'frame ' + i + ' shadow callout').toBe(model[0]);
      if (says) shadowFrames++;
    });
    expect(shadowFrames, 'the stack does pass through the shadow').toBeGreaterThan(50);
  }, 60_000);

  it('marks Tranquility Base at the coordinates printed under the lunar-orbit view', () => {
    const html = renderTool(ID, { moonMission: { missionPhase: 4 } });
    const m = /([\d.]+)\u00B0N, ([\d.]+)\u00B0E/.exec(html);
    expect(m, 'the view states the landing coordinates').toBeTruthy();
    const { frames } = run({ missionPhase: 4 }, orbitCanvas, 3);
    const f = frames[frames.length - 1];
    const moon = f.arcs.reduce((a, b) => (b.r > a.r ? b : a));
    const label = f.text.find((t) => t.s === 'Tranquility Base');
    expect(label, 'the site is labelled').toBeTruthy();
    const want = P.moonProject(Number(m[2]), Number(m[1]), moon.x, moon.y, moon.r);
    // The label sits 6px left of the dot and 3px below its centre line.
    expect(Math.abs(label.x + 6 - want[0]), 'marker x vs 23.473 E').toBeLessThan(0.5);
    expect(Math.abs(label.y - 3 - want[1]), 'marker y vs 0.674 N').toBeLessThan(0.5);
  });

  it('names the seas and every Apollo site only when the student asks', () => {
    const on = run({ missionPhase: 4, moonLabels: true }, orbitCanvas, 3).frames.pop().text.map((t) => t.s);
    ['Sea of Tranquility', 'Ocean of Storms', '12', '17'].forEach((s) => expect(on, s).toContain(s));
    const off = run({ missionPhase: 4, moonLabels: false }, orbitCanvas, 3).frames.pop().text.map((t) => t.s);
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

  it('lunar ascent: docked means zero range, and Earth does not "rise" over the landing site', () => {
    // It read 35 km under "HARD DOCK CONFIRMED" (range was taken to a point 14px off
    // the docking port), and labelled Earth "Earthrise" on the horizon, which it never
    // is from the near side of a tidally locked Moon.
    const ascentCanvas = (p) => /lunar ascent and rendezvous/i.test(String(p['aria-label']));
    const { frames } = run({ missionPhase: 7 }, ascentCanvas, 1000);
    const docked = frames.filter((f) => f.text.some((t) => t.s.includes('HARD DOCK CONFIRMED')));
    expect(docked.length, 'the ascent should dock within the frames run').toBeGreaterThan(20);
    docked.forEach((f) => expect(f.text.map((t) => t.s), 'range once docked').toContain('0.0 km'));
    const all = frames.flatMap((f) => f.text.map((t) => t.s));
    expect(all).not.toContain('Earthrise');
    expect(all.some((s) => /never rises or sets/.test(s)), 'Earth is labelled as fixed in the sky').toBe(true);
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

  it('the coast view reports the model, marks where the Moon takes over, and draws true scale on request', () => {
    const coastCanvas = (p) => p['aria-describedby'] === 'mm-transit-description';
    const { frames } = run({ missionPhase: 3 }, coastCanvas, 2500);
    const speeds = frames.map((f) => { const t = f.text.find((x) => / km\/s /.test(x.s)); return t ? parseFloat(t.s) : NaN; }).filter(Number.isFinite);
    expect(speeds.length).toBeGreaterThan(2000);
    const min = Math.min(...speeds), iMin = speeds.indexOf(min);
    expect(speeds[0], 'leaves at TLI speed').toBeGreaterThan(8);
    expect(iMin, 'slows first').toBeGreaterThan(speeds.length * 0.5);
    expect(speeds[speeds.length - 1], 'then speeds up toward the Moon').toBeGreaterThan(min + 0.8);
    // Distance is not a straight function of time: it races off Earth.
    const fromEarth = (f) => { const i = f.text.findIndex((x) => x.s === 'FROM EARTH'); return i < 0 ? NaN : Number(f.text[i + 1].s.replace(/[^0-9]/g, '')); };
    expect(fromEarth(frames[240]) / 384400, 'a tenth of the way through the time').toBeGreaterThan(0.2);
    const all = frames.flatMap((f) => f.text.map((t) => t.s));
    expect(all).toContain('Moon\'s pull beats Earth\'s here');
    expect(all.some((s) => /Speeding up/.test(s)) && all.some((s) => /Slowing down/.test(s))).toBe(true);
    // True scale: Earth 6,371 km and the Moon 1,737 km in radius, 384,400 km apart.
    const ts = run({ missionPhase: 3, trueScale: true }, coastCanvas, 3).frames.pop();
    const at = (x) => ts.arcs.filter((a) => Math.abs(a.x - x) < 0.01 && Math.abs(a.y - 140) < 0.01).map((a) => a.r);
    const gap = 440 - 60;                                          // W 500 in jsdom: bodies at 60 and W - 60
    expect(Math.min(...at(60)), 'Earth radius at true scale').toBeCloseTo(gap * 6371 / 384400, 2);
    expect(Math.min(...at(440)), 'Moon radius at true scale').toBeCloseTo(gap * 1737.4 / 384400, 2);
    expect(ts.text.map((t) => t.s)).toContain('spacecraft not to scale');
    const d = document.createElement('div');
    d.innerHTML = renderTool(ID, { moonMission: { missionPhase: 3, trueScale: true } });
    expect(d.querySelector('[data-moonmission-true-scale]').getAttribute('aria-pressed')).toBe('true');
    expect(d.querySelector('[data-moonmission-true-scale-note]').textContent).toContain('30 Earths');
    d.innerHTML = renderTool(ID, { moonMission: { missionPhase: 3 } });
    expect(d.querySelector('[data-moonmission-true-scale]').getAttribute('aria-pressed')).toBe('false');
    expect(d.querySelector('[data-moonmission-true-scale-note]'), 'note only when asked for').toBeNull();
  }, 60_000);   // 2,500 real loop frames; slow under load, not wrong

  it('Earth orbit: the globe fills the view it has, and its shadow is drawn where the chip counts the craft as dark', () => {
    // Earth was capped at 42px on any screen; the shadow was only a counter.
    const leoCanvas = (p) => p['aria-describedby'] === 'mm-earth-orbit-description';
    for (const width of [500, 1014]) {
      const { frames } = run({ missionPhase: 2 }, leoCanvas, 5, 1000 / 60, width);
      const f = frames[frames.length - 1];
      const eR = Math.min(260 * 0.3, width * 0.1), eX = width * 0.34, eY = 260 * 0.52;
      expect(f.arcs.some((a) => Math.abs(a.x - eX) < 1e-6 && Math.abs(a.y - eY) < 1e-6 && Math.abs(a.r - eR) < 1e-6), width + 'px: Earth radius').toBe(true);
      // The band behind Earth is the region the loop tests for "in Earth's shadow".
      expect(f.rects.some((r) => r.x === 0 && Math.abs(r.y - (eY - eR)) < 1e-6 && Math.abs(r.w - eX) < 1e-6 && Math.abs(r.h - 2 * eR) < 1e-6), width + 'px: the shadow band').toBe(true);
      expect(f.text.some((t) => t.s === 'Earth\'s shadow')).toBe(true);
    }
  });

  it('Earth orbit: a sunrise every orbit, and the TLI window opens on the same clock at any frame rate', () => {
    // Earth used to be lit all the way round. Half of every orbit is now in its shadow,
    // and the craft counts the sunrises (the crews saw one every 90 minutes).
    const leoCanvas = (p) => p['aria-describedby'] === 'mm-earth-orbit-description';
    const { frames } = run({ missionPhase: 2 }, leoCanvas, 1800);   // 1800 steps x 0.0071 rad = just over 2 orbits
    const count = (f) => { const i = f.text.findIndex((x) => x.s === 'SUNRISES SEEN' || x.s === 'IN EARTH\'S SHADOW'); return i < 0 ? NaN : Number(f.text[i + 1].s); };
    const counts = frames.map(count).filter(Number.isFinite);
    expect(counts[0]).toBe(0);
    expect(counts[counts.length - 1], 'one sunrise per orbit, two orbits').toBe(2);
    for (let i = 1; i < counts.length; i++) expect(counts[i] - counts[i - 1]).toBeGreaterThanOrEqual(0);
    const shadowFrames = frames.filter((f) => f.text.some((x) => x.s === 'IN EARTH\'S SHADOW')).length;
    expect(shadowFrames / frames.length, 'part of each orbit is in shadow').toBeGreaterThan(0.1);
    expect(shadowFrames / frames.length).toBeLessThan(0.5);
    expect(frames.some((f) => f.text.some((x) => /Orbital sunrise/.test(x.s)))).toBe(true);
    // The window (and the whole orbit) used to run twice as fast on a 120 Hz screen.
    const goAt = {};
    for (const fps of [30, 60, 120]) {
      const dt = 1000 / fps;
      const r = run({ missionPhase: 2 }, leoCanvas, Math.ceil(30000 / dt), dt);
      const i = r.frames.findIndex((f) => f.mm.tliWindow && f.mm.tliWindow.state === 'go');
      expect(i, fps + ' fps: the window never opened').toBeGreaterThan(0);
      goAt[fps] = { t: i * dt, dt };
    }
    for (const fps of [30, 120]) expect(Math.abs(goAt[fps].t - goAt[60].t), fps + ' fps vs 60 fps').toBeLessThanOrEqual(2 * goAt[fps].dt + 1);
  }, 120_000);   // thousands of real loop frames; slow under load, not wrong

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
    expect(nominal.early, 'not before the coast closes in').not.toContain('ENTRY CORRIDOR');
    expect(nominal.late).toContain('ENTRY CORRIDOR');
    const verdict = (t) => t.find((s) => /\u00B0 (in the corridor|skips out|too steep)$/.test(s));
    expect(verdict(nominal.late)).toBe('-6.5\u00B0 in the corridor');
    expect(verdict(skip.late)).toBe('-4.5\u00B0 skips out');
    expect(verdict(steep.late)).toBe('-8.5\u00B0 too steep');
  }, 120_000);   // thousands of real loop frames; slow under load, not wrong

  it('trans-lunar coast: predict the speed first; the answer waits for the flight to show it', () => {
    // The fact list used to state the answer above the canvas, so a prediction could
    // not be asked honestly. It now arrives with the card, once the coast has passed
    // its slowest point.
    const page = (st) => { const d = document.createElement('div'); d.innerHTML = renderTool(ID, { moonMission: Object.assign({ missionPhase: 3 }, st) }); return d; };
    const before = page({});
    const card = before.querySelector('[data-moonmission-predict="coast_speed"]');
    expect(card, 'the prediction card').toBeTruthy();
    expect(card.querySelectorAll('[data-moonmission-predict-option]').length).toBe(3);
    expect(before.textContent, 'the answer is not on the page before the flight shows it').not.toMatch(/speed(s)? up again|a tenth as fast/i);
    // The loop reports the slowest point from the model once it gets there.
    const { frames } = run({ missionPhase: 3 }, (p) => p['aria-describedby'] === 'mm-transit-description', 2500);
    const seen = frames.find((f) => f.mm.coastSlowest);
    expect(seen, 'the coast publishes its slowest point').toBeTruthy();
    expect(seen.mm.coastSlowest.v).toBeCloseTo(P.coastSpeed(P.equalPull()), 2);
    expect(seen.mm.coastSlowest.toMoonKm).toBe(Math.round(384400 - P.equalPull()));
    expect(frames.indexOf(seen), 'not before the craft gets there').toBeGreaterThan(1500);
    // "About a tenth as fast as when you left", as the explanation says.
    expect(P.coastSpeed(P.equalPull()) / 10.84).toBeGreaterThan(0.08);
    expect(P.coastSpeed(P.equalPull()) / 10.84).toBeLessThan(0.13);
    const after = page({ coastSlowest: seen.mm.coastSlowest, predictions: { coast_speed: 'dip' } });
    const revealed = after.querySelector('[data-moonmission-predict="coast_speed"]').textContent;
    expect(revealed).toMatch(/matched the flight/);
    expect(revealed).toContain('Slowest point: ' + seen.mm.coastSlowest.v.toFixed(2) + ' km/s');
    expect(revealed).toMatch(/a tenth as fast/);
    const wrong = page({ coastSlowest: seen.mm.coastSlowest, predictions: { coast_speed: 'steady' } });
    expect(wrong.querySelector('[data-moonmission-predict="coast_speed"]').textContent).toMatch(/The flight showed: Slows down, then speeds up near the Moon/);
  }, 120_000);   // 2,500 real loop frames; slow under load, not wrong

  it('lunar ascent: Eagle catches Columbia from a lower, faster orbit, and the card waits for the dock', () => {
    // The readout used to jump straight to Columbia's 110 km, which teaches the
    // opposite of how a rendezvous works: Eagle gained on Columbia while BELOW it.
    const ascentCanvas = (p) => /lunar ascent and rendezvous/i.test(String(p['aria-label']));
    const { frames } = run({ missionPhase: 7 }, ascentCanvas, 1000);
    const hud = (f) => {
      const t = f.text.map((x) => x.s);
      const alt = parseFloat(t[t.indexOf('ALTITUDE') + 1]);
      const di = t.indexOf('DIST TO CSM');
      return { phase: t.find((x) => /^(PRE-LAUNCH|ASCENT|RENDEZVOUS|DOCKED)$/.test(x)), alt, dist: di < 0 ? NaN : parseFloat(t[di + 1]) };
    };
    const rdv = frames.map(hud).filter((h) => h.phase === 'RENDEZVOUS');
    expect(rdv.length).toBeGreaterThan(100);
    const early = rdv.slice(0, Math.floor(rdv.length * 0.7));
    early.forEach((h) => expect(h.alt, 'Eagle holds its low orbit while it closes').toBeCloseTo(83, 0));
    expect(early[early.length - 1].dist, 'and gains on Columbia while below it').toBeLessThan(early[0].dist * 0.75);
    const docked = frames.map(hud).filter((h) => h.phase === 'DOCKED');
    expect(docked.length).toBeGreaterThan(10);
    expect(docked[0].alt, 'up to Columbia only at the end').toBeCloseTo(110, 0);
    expect(frames.some((f) => f.text.some((t) => t.s === 'Eagle 17-83 km'))).toBe(true);
    // The card: options until the dock, and no giveaway in the status beside it.
    const page = (st) => { const d = document.createElement('div'); d.innerHTML = renderTool(ID, { moonMission: Object.assign({ missionPhase: 7 }, st) }); return d; };
    const closing = page({ ascentStatus: 'rendezvous' });
    expect(closing.querySelectorAll('[data-moonmission-predict="rendezvous_catch"] [data-moonmission-predict-option]').length).toBe(3);
    expect(closing.textContent, 'no answer while they close').not.toMatch(/lower orbits? (go(es)? around|laps) faster/i);
    const done = page({ ascentStatus: 'docked', predictions: { rendezvous_catch: 'chase' } });
    const card = done.querySelector('[data-moonmission-predict="rendezvous_catch"]').textContent;
    expect(card).toMatch(/The flight showed: Stay in a lower orbit, which goes around faster/);
    expect(card).toContain('17 to 83 km');
  }, 120_000);   // a thousand real loop frames; slow under load, not wrong

  it('launch: Max Q is asked in the briefing and answered by the flight, at the height the HUD shows', () => {
    const page = (st) => { const d = document.createElement('div'); d.innerHTML = renderTool(ID, { moonMission: st }); return d; };
    const briefing = page({ missionPhase: 0 });
    expect(briefing.querySelectorAll('[data-moonmission-predict="launch_maxq"] [data-moonmission-predict-option]').length, 'asked before launch').toBe(3);
    const { frames } = run({ missionPhase: 1 }, (p) => !!p['data-launch-canvas'], 700);
    const call = frames.findIndex((f) => f.text.some((t) => /^MAX Q/.test(t.s)));
    expect(call, 'a MAX Q call').toBeGreaterThan(0);
    const rec = frames[call].mm.launchMaxQ;
    expect(rec, 'the launch reports it').toBeTruthy();
    expect(frames[call - 1].mm.launchMaxQ, 'not before the call').toBeFalsy();
    const t = frames[call].text.map((x) => x.s);
    const hudKm = parseFloat(t[t.indexOf('ALTITUDE') + 1]);
    expect(Math.abs(rec.altKm - hudKm), 'reported height vs the HUD at the call').toBeLessThan(0.3);
    const card = page({ missionPhase: 1, launchMaxQ: rec, predictions: { launch_maxq: 'minute' } }).querySelector('[data-moonmission-predict="launch_maxq"]').textContent;
    expect(card).toMatch(/matched the flight/);
    expect(card).toContain('Max Q on this flight: ' + rec.altKm.toFixed(1) + ' km up');
  }, 60_000);

  it('launch: the air-push gauge is the HUD\'s own numbers, and "now" gives way to "passed" after the peak', () => {
    // The banner said "pushing hardest now" for the whole first stage, still at
    // 60 km with the push under 1% of its peak.
    const { frames } = run({ missionPhase: 1 }, (p) => !!p['data-launch-canvas'], 700);
    const hud = (f) => {
      const t = f.text.map((x) => x.s), a = t[t.indexOf('ALTITUDE') + 1], v = t[t.indexOf('VELOCITY') + 1];
      return { km: /km$/.test(a) ? parseFloat(a) : parseFloat(a) / 1000, ms: Number(String(v).replace(/[^0-9.]/g, '')) };
    };
    const bar = (f) => { const r = f.rects.find((x) => x.fill === '#fbbf24' && x.h === 8 && x.y === 84); return r ? r.w : null; };
    const peakTick = (f) => { const r = f.rects.find((x) => x.fill === '#ffffff' && x.w === 2 && x.h === 14); return r ? r.x + 1 : null; };
    const stage1 = (f) => f.text.some((t) => t.s === 'STAGE 1/3');
    const flying = frames.map((f, i) => i).filter((i) => stage1(frames[i]) && bar(frames[i]) != null && hud(frames[i]).ms > 0);
    expect(flying.length).toBeGreaterThan(100);
    // Half rho v squared of the height and speed printed beside it (60 kPa full scale).
    flying.forEach((i) => {
      const h = hud(frames[i]);
      expect(Math.abs(bar(frames[i]) - 130 * Math.min(1, P.dynamicPressure(h.km, h.ms) / 60000)), 'frame ' + i).toBeLessThan(2.5);
    });
    // It peaks at the MAX Q call and falls after; the white tick stays at the peak.
    const call = frames.findIndex((f) => f.text.some((t) => /^MAX Q/.test(t.s)));
    const widths = flying.map((i) => bar(frames[i])), top = Math.max(...widths);
    expect(Math.abs(flying[widths.indexOf(top)] - call), 'the bar tops out at the call').toBeLessThanOrEqual(1);
    const late = flying.filter((i) => i > call + 30);
    expect(late.length).toBeGreaterThan(20);
    late.forEach((i) => {
      expect(bar(frames[i]), 'falling').toBeLessThan(top * 0.6);
      expect(Math.abs(peakTick(frames[i]) - (500 - 148 + top)), 'the tick holds the peak').toBeLessThan(0.01);
    });
    // "now" only right at the peak, then "passed" at the height the card reports.
    const rec = frames[call].mm.launchMaxQ;
    const nowAt = frames.map((f, i) => (f.text.some((t) => /hardest now/.test(t.s)) ? i : -1)).filter((i) => i >= 0);
    expect(nowAt[0]).toBe(call);
    expect(nowAt.length, 'about half a second').toBeLessThanOrEqual(30);
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
    const { frames } = run({ missionPhase: 1 }, (p) => !!p['data-launch-canvas'], 1000);
    const hudKm = (f) => { const t = f.text.map((x) => x.s), a = t[t.indexOf('ALTITUDE') + 1]; return /km$/.test(a) ? parseFloat(a) : parseFloat(a) / 1000; };
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
      const { frames } = run({ missionPhase: 1 }, (p) => !!p['data-launch-canvas'], 560, 1000 / 60, width);
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
    const store = newStore({ moonMission: { missionPhase: 10, lunarSamples: [], coastSlowest: { v: 1.13, toMoonKm: 38376 }, launchMaxQ: { altKm: 10.9, velMs: 539 }, predictions: { coast_speed: 'dip' } } });
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

  it('entry: the shield heats in a pulse to 2,760 C and cools, and the path bends from the entry angle to vertical', () => {
    // The readout used to climb 15 C a step and sit at 2,760 until the chutes.
    const E = (t, o = 'nominal', a = -6.5) => P.entryState(t, o, a);
    expect(E(0).tempC, 'cold at entry interface').toBe(15);
    let peak = 0, peakAt = 0;
    for (let t = 0; t <= 360; t++) if (E(t).tempC > peak) { peak = E(t).tempC; peakAt = t; }
    expect(Math.abs(peak - 2760), "Apollo's peak").toBeLessThanOrEqual(3);
    expect(peakAt, 'peaks in the first half').toBeLessThan(180);
    for (let t = peakAt + 1; t <= 360; t++) expect(E(t).tempC, 'cooling after the peak').toBeLessThanOrEqual(E(t - 1).tempC);
    expect(E(360).tempC, 'well down by the drogues').toBeLessThan(peak * 0.5);
    // Radiative equilibrium: temperature (in kelvin) goes as the fourth root of the heating.
    [60, 150, 250].forEach((t) => expect(Math.abs((E(t).tempC + 273) - 3033 * Math.pow(E(t).heat, 0.25)), 't=' + t).toBeLessThanOrEqual(1));
    expect(E(0).gamma, 'the angle the student set').toBeCloseTo(6.5, 5);
    expect(E(0, 'nominal', -5.8).gamma).toBeCloseTo(5.8, 5);
    expect(E(360).gamma, 'falling straight down under the drogues').toBeCloseTo(90, 5);
    const skip = [...Array(361).keys()].map((t) => E(t, 'skip', -5.2));
    expect(Math.min(...skip.map((e) => e.gamma)), 'a skip-out climbs for a while').toBeLessThan(0);
    expect(E(170, 'skip', -5.2).heat, 'and cools while it is out').toBeLessThan(E(170).heat * 0.5);
    let steepAt = 0; for (let t = 0; t <= 360; t++) if (E(t, 'steep').heat > E(steepAt, 'steep').heat) steepAt = t;
    expect(steepAt, 'a steep entry peaks sooner').toBeLessThan(peakAt);
  });

  it('entry: the loop flies the capsule shield-first on that path, shows that temperature, and hands its horizon to the chutes', () => {
    const { frames } = run({ missionPhase: 9 }, reentryCanvas, 380);
    const temps = frames.map((f) => { const x = f.text.find((t) => /^\d+°C$/.test(t.s)); return x ? parseInt(x.s, 10) : null; });
    const shown = temps.filter((x) => x != null);
    expect(shown.length).toBeGreaterThan(300);
    expect(Math.max(...shown)).toBeGreaterThanOrEqual(2757);
    expect(shown[shown.length - 1], 'cooled by the drogues').toBeLessThan(1400);
    // Each frame is one step of the entry clock; its readout and attitude are the model's
    // for that step (the frame's tick is within one step of its index).
    let matched = 0;
    frames.forEach((f, i) => {
      if (temps[i] == null || i < 2) return;
      const near = [i - 1, i, i + 1].map((t) => P.entryState(t, 'nominal', -6.5));
      expect(near.some((e) => e.tempC === temps[i]), 'frame ' + i + ' temperature').toBe(true);
      const want = near.map((e) => (90 - e.gamma) * Math.PI / 180);
      expect(f.rots.some((a) => want.some((w) => Math.abs(a - w) < 1e-9)), 'frame ' + i + ': shield along the path').toBe(true);
      matched++;
    });
    expect(matched).toBeGreaterThan(300);
    // The last entry frame's horizon is where the chute view's sea begins.
    const lastEntry = frames.map((f, i) => (temps[i] != null ? i : -1)).filter((i) => i >= 0).pop();
    const sea = frames[lastEntry].arcs.filter((a) => a.r > 1000).reduce((a, b) => (!a || b.r < a.r ? b : a), null);
    expect(Math.abs(sea.y - sea.r - P.splashPose(361, 320).oceanTop), 'no jump at the drogues').toBeLessThan(3);
  }, 60_000);

  it('plays the recovery after splashdown, then rests, on the same clock at any frame rate', () => {
    const order = ['Splashdown just before sunrise', 'Stable 2', 'Uprighting bags', 'Stable 1', 'Recovery helicopter overhead'];
    const splashAt = {};
    for (const fps of [30, 60, 120]) {
      const dt = 1000 / fps;
      const { frames, stopped } = run({ missionPhase: 9 }, reentryCanvas, Math.ceil(24000 / dt), dt);
      expect(stopped, fps + ' fps: the loop should rest once the recovery is over').toBe(true);
      const first = order.map((k) => frames.findIndex((f) => f.text.some((t) => t.s.includes(k))));
      first.forEach((i, k) => expect(i, fps + ' fps: never showed "' + order[k] + '"').toBeGreaterThan(0));
      for (let k = 1; k < first.length; k++) expect(first[k], fps + ' fps: ' + order[k] + ' after ' + order[k - 1]).toBeGreaterThan(first[k - 1]);
      splashAt[fps] = { t: frames.findIndex((f) => f.text.some((t) => t.s === 'SPLASHDOWN!')) * dt, dt };
    }
    for (const fps of [30, 120]) {
      expect(Math.abs(splashAt[fps].t - splashAt[60].t), fps + ' fps splashdown at ' + Math.round(splashAt[fps].t) + ' ms vs 60 fps').toBeLessThanOrEqual(2 * splashAt[fps].dt + 1);
    }
    expect(Math.abs(splashAt[60].t - 10000), 'splashdown about 10 s in').toBeLessThanOrEqual(50);
  }, 60_000);   // thousands of real loop frames; slow under load, not wrong
});

describe('one scope, many models', () => {
  it('the trans-Earth coast still starts at the 1.0 km/s its own model states', () => {
    // The trans-lunar model once re-declared MM_R0 and MM_V0 in the same module scope;
    // the return coast then read 6,712 km and 10.84 km/s at call time. Its entry speed
    // came out within 0.1% by coincidence, so only the start gives it away.
    expect(P.returnCoast(0).speedKmh).toBeCloseTo(3600, -1);
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
  });
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
      2: [/shadow/, /sunrises/],
      3: [/free-return/, /pull becomes stronger/, /true-scale/],
      4: [/near side/, /Sea of Tranquility/, /Apollo landing site/, /sunrise line/, /earthshine/],
      7: [/Columbia's orbit/, /about 110 kilometers/],
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
    expect(label(7)).not.toMatch(/faster|lower orbit|below/i);
    expect(label(7)).not.toMatch(/60 kilometers/);
  });
});

