/**
 * The Saturn V in the launch phase. It used to stand ~3.6:1 on the pad and fly as a
 * fixed 18x50 block that never shed a stage, while the separation banner keyed off
 * an altitude window the vehicle crossed in a few frames (and could name the wrong
 * stage). These pin the model against the height the tool itself states, the
 * shedding, and the launch loop's wiring of both.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Overridable so a mutation can run against a COPY; other sessions edit this file.
const FILE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';
const ID = 'moonMission';

// A 2D context that keeps what these tests read (gradient stops, text) and accepts
// every other call.
function recordingCtx() {
  const frame = { text: [], grads: [] };
  const grad = () => { const g = { stops: [], addColorStop: (o, c) => g.stops.push(c) }; frame.grads.push(g); return g; };
  const known = {
    createLinearGradient: grad,
    createRadialGradient: grad,
    fillText: (s) => frame.text.push(String(s)),
    measureText: (s) => ({ width: String(s).length * 6 }),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
  };
  const ctx = new Proxy({}, {
    get: (t, k) => (k in known ? known[k] : k in t ? t[k] : () => {}),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  return { ctx, frame };
}

let P;
beforeEach(() => {
  resetStemLab();
  loadTool(FILE, ID);
  P = window.MoonMissionPure;
});

describe('Saturn V model', () => {
  const draw = (stage, opts, fullH = 221) => P.saturnV(recordingCtx().ctx, 0, 0, fullH, stage, opts);
  const ids = (g) => g.sections.map((s) => s.id);

  it('stands as tall as the fact card says it did', () => {
    const fact = /The Saturn V rocket stood ([\d.]+) meters tall/.exec(readFileSync(FILE, 'utf8'));
    expect(fact, 'the fact card should state the height').toBeTruthy();
    const stated = Number(fact[1]);
    expect(Math.abs(P.saturnVHeight() - stated) / stated, 'model height vs the stated ' + stated + ' m').toBeLessThan(0.01);
  });

  it('is drawn about 11 times taller than it is wide', () => {
    const g = draw(1);
    const widest = Math.max(...g.sections.map((s) => Math.max(s.w0, s.w1)));
    const ratio = g.nozzle / widest;   // drawn from y = 0
    expect(g.nozzle, 'the full stack should be the height asked for').toBeCloseTo(221, 6);
    expect(ratio).toBeGreaterThan(10.5);
    expect(ratio).toBeLessThan(11.5);
  });

  it('sheds stages from the bottom and keeps the spacecraft where it was', () => {
    const s1 = draw(1), s2 = draw(2), s3 = draw(3);
    expect(ids(s1)).toEqual(['les', 'cm', 'sm', 'sla', 'iu', 's4b', 's4bis', 's2', 's1is', 's1']);
    expect(ids(s2)).toEqual(['les', 'cm', 'sm', 'sla', 'iu', 's4b', 's4bis', 's2']);
    expect(ids(s3)).toEqual(['les', 'cm', 'sm', 'sla', 'iu', 's4b']);
    const cmY = (g) => g.sections.find((s) => s.id === 'cm').y0;
    expect(cmY(s2)).toBe(cmY(s1));
    expect(cmY(s3)).toBe(cmY(s1));
    expect(s2.nozzle).toBeLessThan(s1.nozzle);
    expect(s3.nozzle).toBeLessThan(s2.nozzle);
    // Engines hang below whatever is now the bottom stage.
    [s1, s2, s3].forEach((g) => expect(g.nozzle).toBeGreaterThan(g.sections[g.sections.length - 1].y1));
  });

  it('drops the escape tower without moving the command module', () => {
    const withLes = draw(2), without = draw(2, { les: false });
    expect(ids(without)).not.toContain('les');
    expect(without.sections.find((s) => s.id === 'cm').y0).toBe(withLes.sections.find((s) => s.id === 'cm').y0);
  });

  it('draws a spent stage on its own, engines and all', () => {
    const spent = draw(1, { only: ['s1is', 's1'] });
    expect(ids(spent)).toEqual(['s1is', 's1']);
    expect(spent.nozzle).toBeGreaterThan(spent.sections[1].y1);
  });
});

describe('Moon Mission launch loop', () => {
  let queue;
  beforeEach(() => {
    queue = [];
    vi.stubGlobal('requestAnimationFrame', (cb) => { queue.push(cb); return queue.length; });
  });
  afterEach(() => { vi.unstubAllGlobals(); document.body.innerHTML = ''; });

  function findLaunchCanvas(node) {
    if (node == null || typeof node !== 'object') return null;
    if (Array.isArray(node)) { for (const n of node) { const hit = findLaunchCanvas(n); if (hit) return hit; } return null; }
    if (node.type === 'canvas' && node.props && node.props['data-launch-canvas']) return node.ref || node.props.ref;   // React keeps ref off props
    return findLaunchCanvas(node.props && node.props.children);
  }

  // Run the real loop for `n` frames painted `dt` ms apart; returns what each drew.
  function flyLaunch(n, dt = 1000 / 60) {
    queue = [];
    document.body.innerHTML = '';   // stops any earlier loop: it only re-arms while its canvas is attached
    const store = newStore({ moonMission: { missionPhase: 1, animPaused: false } });
    const tree = window.StemLab._registry[ID].render(makeCtx({ toolData: store.toolData }, store));
    const ref = findLaunchCanvas(tree);
    expect(typeof ref, 'launch canvas with a ref').toBe('function');
    const rec = recordingCtx();
    const el = document.createElement('canvas');
    el.getContext = () => rec.ctx;
    document.body.appendChild(el);
    const frames = [];
    const snap = () => { frames.push({ text: rec.frame.text.slice(), grads: rec.frame.grads.slice() }); rec.frame.text.length = 0; rec.frame.grads.length = 0; };
    ref(el);   // draws the first frame itself
    snap();
    for (let i = 1; i < n && queue.length; i++) {
      const q = queue; queue = [];
      q.forEach((cb) => cb(i * dt));
      snap();
    }
    return frames;
  }

  const stageOf = (f) => { const t = f.text.find((s) => /^STAGE \d\/3$/.test(s)); return t ? Number(t[6]) : 0; };
  // Stage-body sections are shaded white to grey; count them to see what is drawn.
  const whiteSections = (f) => f.grads.filter((g) => g.stops.join() === '#ffffff,#ffffff,#9ca3af').length;
  const kerosene = (f) => f.grads.some((g) => g.stops[0] === 'rgba(255,120,0,0.8)');

  it('flies the stack in pieces, burns kerosene only on the first stage, and names each separation long enough to read', () => {
    const frames = flyLaunch(1300);
    const last = frames[frames.length - 1];
    expect(last.text.some((s) => /ORBIT ACHIEVED/.test(s)), 'the ascent should reach orbit within the frames run').toBe(true);

    // On the pad: S-IVB, adapter, S-II, interstage, S-IC. In orbit: the S-IVB alone.
    expect(whiteSections(frames[10])).toBe(5);
    expect(whiteSections(last)).toBe(1);
    // Mid stage 2, once the spent S-IC has gone: S-IVB, adapter, S-II.
    const s2 = frames.map((f, i) => (stageOf(f) === 2 ? i : -1)).filter((i) => i >= 0);
    expect(s2.length).toBeGreaterThan(160);
    expect(whiteSections(frames[s2[s2.length - 1]])).toBe(3);

    // Each notice stays up for over a second and never names the wrong stage.
    const notice = (k) => frames.map((f, i) => (f.text.some((s) => s.includes('STAGE ' + k + ' SEPARATION')) ? i : -1)).filter((i) => i >= 0);
    expect(notice(0)).toEqual([]);
    const n1 = notice(1), n2 = notice(2);
    expect(n1.length, 'frames showing the first separation').toBeGreaterThan(60);
    expect(n2.length, 'frames showing the second separation').toBeGreaterThan(60);
    expect(Math.max(...n1), 'the first notice must be gone before the second').toBeLessThan(Math.min(...n2));
    n1.forEach((i) => expect(stageOf(frames[i])).toBe(2));
    n2.forEach((i) => expect(stageOf(frames[i])).toBe(3));

    // Orange kerosene exhaust while the S-IC burns, none once the hydrogen stages fly.
    const flight1 = frames.filter((f) => stageOf(f) === 1);
    expect(flight1.length).toBeGreaterThan(100);
    expect(flight1.filter(kerosene).length).toBeGreaterThan(flight1.length * 0.9);
    expect(frames.filter((f) => stageOf(f) >= 2 && kerosene(f)).length).toBe(0);
  }, 60_000);   // thousands of real loop frames; slow under load, not wrong

  it('counts down five seconds and reaches orbit on the same clock at 30, 60 or 120 frames a second', () => {
    // It stepped once per painted frame, so a 120 Hz screen ran the "5-second
    // countdown" in 2.5 s and a school laptop painting 30 frames took 10 s.
    const at = {};
    for (const fps of [30, 60, 120]) {
      const dt = 1000 / fps;
      const frames = flyLaunch(Math.ceil(20000 / dt), dt);
      const liftoff = frames.findIndex((f) => stageOf(f) === 1);
      const orbit = frames.findIndex((f) => f.text.some((s) => /ORBIT ACHIEVED/.test(s)));
      expect(liftoff, fps + ' fps: never lifted off').toBeGreaterThan(0);
      expect(orbit, fps + ' fps: never reached orbit').toBeGreaterThan(liftoff);
      at[fps] = { dt, liftoff: liftoff * dt, orbit: orbit * dt };
    }
    for (const fps of [30, 60, 120]) {
      expect(Math.abs(at[fps].liftoff - 5000), fps + ' fps liftoff at ' + Math.round(at[fps].liftoff) + ' ms').toBeLessThanOrEqual(2 * at[fps].dt + 1);
      expect(Math.abs(at[fps].orbit - at[60].orbit), fps + ' fps orbit vs 60 fps').toBeLessThanOrEqual(2 * at[fps].dt + 1);
    }
  }, 60_000);   // thousands of real loop frames; slow under load, not wrong
});
