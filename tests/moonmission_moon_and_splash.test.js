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

// A 2D context that records the calls these tests read and accepts the rest.
function recordingCtx() {
  const frame = { text: [], arcs: [] };
  const grad = { addColorStop() {} };
  const known = {
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    fillText: (s, x, y) => frame.text.push({ s: String(s), x, y }),
    arc: (x, y, r) => frame.arcs.push({ x, y, r }),
    measureText: (s) => ({ width: String(s).length * 6 }),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
  };
  const ctx = new Proxy({}, {
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
  function run(state, pick, n, dt = 1000 / 60) {
    queue = [];
    document.body.innerHTML = '';
    const store = newStore({ moonMission: Object.assign({ animPaused: false, lunarSamples: [] }, state) });
    const tree = window.StemLab._registry[ID].render(makeCtx({ toolData: store.toolData }, store));
    const ref = findRef(tree, pick);
    expect(typeof ref, 'canvas ref').toBe('function');
    const rec = recordingCtx();
    const el = document.createElement('canvas');
    el.getContext = () => rec.ctx;
    document.body.appendChild(el);
    const frames = [];
    const snap = () => { frames.push({ text: rec.frame.text.slice(), arcs: rec.frame.arcs.slice(), mm: Object.assign({}, store.toolData.moonMission) }); rec.frame.text.length = 0; rec.frame.arcs.length = 0; };
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
  const reentryCanvas = (p) => /re-entry sequence/i.test(String(p['aria-label']));

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
    const ascentCanvas = (p) => /lunar ascent sequence/i.test(String(p['aria-label']));
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

  it('plays the recovery after splashdown, then rests, on the same clock at any frame rate', () => {
    const order = ['Splashdown, about 24 km', 'Stable 2', 'Uprighting bags', 'Stable 1', 'Recovery helicopter overhead'];
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
