// Throw Lab round 5 (2026-11-23, night).
// 1. Field-goal "doink" means the ball touches the frame: its center passes within ball radius (0.11 m,
//    BALLS.football) + half the upright (0.05 m, NFL uprights are 3-4 in across) = 0.16 m of the crossbar
//    or an upright. It used to be any center within 0.30 m, so a kick 25 cm under the bar was a "doink".
//    Headline, where-sentence, screen-reader line, toast and next-rep advice say which piece it hit.
// 2. A basketball bounce pass loses level speed by the impact rule mu·(1 + e)·|v_down| on its own
//    hardwood surface (mu 0.6, a model choice), up to the 40% grip limit, instead of a flat 22%.
//    The preset, its card, the drill tip, the advice and the shaded bounce zone come from that model.
// THROWLAB_FILE=C:/tmp/sports_labs_1123/throwlab/start_r6.js runs the checks against the earlier copy.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const FILE = process.env.THROWLAB_FILE || 'stem_lab/stem_tool_throwlab.js';
const source = readFileSync(FILE, 'utf8');

function loadModel() {
  const win = { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false }) };
  const doc = {
    getElementById: () => null,
    createElement: () => ({ setAttribute() {}, appendChild() {}, style: {} }),
    head: { appendChild() {} }, body: { appendChild() {} }, addEventListener() {},
  };
  win.document = doc; win.window = win;
  const ctx = vm.createContext({ window: win, document: doc, console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout, navigator: {} });
  vm.runInContext(source, ctx, { filename: 'stem_tool_throwlab.js' });
  return win.StemLab && win.StemLab.ThrowLabModel;
}

const M = loadModel();
const MPH = 2.23694;
const setupFor = (mode, id, over) => Object.assign(
  { mode, throwerHand: 'right', gravityId: 'earth', windMph: 0, windDirDeg: 0 },
  M.presetPatch(mode, id), over || {});
const run = (mode, id, over) => M.evaluateThrow(setupFor(mode, id, over));
const fg = M.MODES.fieldgoal;
const BAR = 3.05;
const FG_TOUCH = 0.11 + 0.05;
// Center of the ball to the crossbar or the nearer upright, worked out here (not with the tool's helper).
function fgGap(c) {
  const ox = Math.max(0, Math.abs(c.x) - fg.goalHalfWidth), oy = Math.max(0, fg.crossbarHeight - c.y);
  return Math.hypot(ox, oy);
}
function fgGrid(fn) {
  for (const id of ['chipshot', 'midrange', 'long', 'hailmary']) {
    const p = M.findPreset('fieldgoal', id);
    for (let s = p.speedMph - 6; s <= p.speedMph + 4; s += 0.5) for (let h = -8; h <= 8; h += 0.5) fn(id, s, h, run('fieldgoal', id, { speedMph: s, aimDegH: h }));
  }
}

describe('field-goal doink = the ball touches the bar or an upright', () => {
  it('the touch distance is the football radius plus half the upright, from the model', () => {
    expect(fg.frameHalf).toBe(0.05);
    expect(M.BALLS.football.radius + fg.frameHalf).toBeCloseTo(FG_TOUCH, 10);
    expect(source).toContain('NFL Rule 1: uprights 3-4 in across');
  });

  it('every doink passes within 0.16 m of the frame; every other miss at the posts passes farther', () => {
    let doinks = 0, misses = 0;
    fgGrid((id, s, h, r) => {
      const c = r.read.cross;
      if (!c) return;
      const tag = JSON.stringify({ id, s, h });
      const inside = c.y >= BAR && Math.abs(c.x) <= fg.goalHalfWidth;
      if (r.location === 'good') expect(inside, tag).toBe(true);
      if (r.location === 'doink') { doinks++; expect(inside, tag).toBe(false); expect(fgGap(c), tag).toBeLessThanOrEqual(FG_TOUCH + 1e-9); }
      if (['shortbar', 'wideclose', 'wide'].includes(r.location)) { misses++; expect(fgGap(c), tag).toBeGreaterThan(FG_TOUCH); }
    });
    expect(doinks).toBeGreaterThan(10);
    expect(misses).toBeGreaterThan(200);
  });

  it('a kick 20-30 cm under the bar is short, not a doink', () => {
    let found = null;
    for (let s = 36; s <= 41 && !found; s += 0.1) {
      const r = run('fieldgoal', 'chipshot', { speedMph: Math.round(s * 10) / 10 });
      const under = BAR - r.read.cross.y;
      if (under > 0.2 && under < 0.3) found = r;
    }
    expect(found).toBeTruthy();
    expect(found.location).toBe('shortbar');
  });

  it('a doink off the bar says so, with the gap from the same crossing, and so do the screen texts', () => {
    const r = run('fieldgoal', 'chipshot', { speedMph: 40 });
    expect(r.location).toBe('doink');
    expect(r.read.frame.part).toBe('bar');
    const gapCm = Math.round((BAR - r.read.cross.y) * 100);
    const gapText = gapCm < 1 ? 'less than 1 cm' : gapCm + ' cm';
    expect(r.whereText).toBe('It clipped the crossbar. The center of the ball passed ' + gapText + ' under the bar, and the ball touches the frame when that gap is 16 cm or less.');
    expect(source).toContain("'Doink! It hit the crossbar. No good, but very close.'");
    expect(source).toContain("'Doink! It hit the upright. No good, but very close.'");
    expect(source).toContain("'🥁 DOINK off the upright' : framePart === 'corner'");
    expect(source).not.toContain('Off the post or crossbar — inches from a make.');
    expect(source).not.toContain('wide by inches');
  });

  it('a doink off an upright names the side and the gap outside it', () => {
    let found = null;
    for (let h = -8; h <= 8 && !found; h += 0.05) {
      const r = run('fieldgoal', 'long', { aimDegH: Math.round(h * 100) / 100 });
      if (r.location === 'doink' && r.read.frame.part === 'upright') found = r;
    }
    expect(found).toBeTruthy();
    const c = found.read.cross;
    const cm = Math.round((Math.abs(c.x) - fg.goalHalfWidth) * 100);
    expect(found.whereText).toContain('It clipped the ' + (c.x > 0 ? 'left' : 'right') + ' upright. The center of the ball passed ' + (cm < 1 ? 'less than 1 cm' : cm + ' cm') + ' outside the upright');
  });

  it('the next-rep advice fixes the piece it hit: +1 mph for the bar, 0.4° in for an upright', () => {
    const tally = { bar: [0, 0], upright: [0, 0] };
    fgGrid((id, s, h, r) => {
      if (r.location !== 'doink') return;
      const part = r.read.frame.part;
      const next = part === 'bar' ? run('fieldgoal', id, { speedMph: s + 1, aimDegH: h })
        : run('fieldgoal', id, { speedMph: s, aimDegH: h + (r.read.cross.x >= 0 ? -0.4 : 0.4) });
      tally[part][0]++;
      if (next.location === 'good') tally[part][1]++;
    });
    expect(tally.bar[0]).toBeGreaterThan(5);
    expect(tally.upright[0]).toBeGreaterThan(5);
    expect(tally.bar[1]).toBe(tally.bar[0]);
    expect(tally.upright[1]).toBe(tally.upright[0]);
    expect(source).toContain("if (fgPiece === 'bar') return speed(1, 'Add a little power'");
  });

  it('the presets still clear by 0.9-1.7 m, and the cards are unchanged', () => {
    const over = {};
    for (const p of M.presetsFor('fieldgoal')) {
      const r = run('fieldgoal', p.id);
      expect(r.location, p.id).toBe('good');
      over[p.id] = Math.round((r.read.cross.y - BAR) * 10) / 10;
      expect(r.read.cross.y - BAR, p.id).toBeGreaterThan(0.9);
      expect(r.read.cross.y - BAR, p.id).toBeLessThan(1.7);
    }
    expect(over).toEqual({ chipshot: 1.4, midrange: 0.9, long: 1.3, hailmary: 1.7 });
    expect(M.slowestMake(setupFor('fieldgoal', 'chipshot'))).toBe(41);
  });
});

describe('the bounce pass bounces on its own hardwood surface', () => {
  const S = () => M.HARDWOOD_SURFACE;
  const e = () => M.BALLS.basketball.cor;

  it('the floor is its own surface, with mu stated as a model choice', () => {
    expect(S()).toBeTruthy();
    expect(S().mu).toBe(0.6);
    expect(S()).not.toBe(M.GRASS_SURFACE);
    expect(source).toContain('mu = 0.6 is a MODEL CHOICE, not a measured value');
  });

  it('each bounce loses mu·(1 + e)·|v_down| of level speed, up to the 40% grip limit', () => {
    let n = 0;
    for (const s of [18, 22, 25, 30]) for (const a of [-20, -14, -9, -5]) {
      const r = run('freethrow', 'bouncepass', { speedMph: s, aimDegV: a });
      for (const hp of r.read.hops) {
        n++;
        expect(hp.levelIn - hp.levelOut).toBeCloseTo(Math.min(S().mu * (1 + e()) * hp.vDown, 0.4 * hp.levelIn), 6);
      }
    }
    expect(n).toBeGreaterThan(10);
  });

  it('the preset is caught, bounces about two-thirds of the way, and its card quotes the model', () => {
    const p = M.findPreset('freethrow', 'bouncepass');
    const r = run('freethrow', 'bouncepass');
    expect(r.location).toBe('caught');
    expect(r.read.hops.length).toBe(1);
    const hp = r.read.hops[0];
    expect(hp.z / 6).toBeGreaterThan(0.6);
    expect(hp.z / 6).toBeLessThan(0.7);
    expect(p.teach).toContain('hits the floor ' + hp.z.toFixed(1) + ' m out');
    expect(p.teach).toContain(Math.round(100 * (1 - hp.levelOut / hp.levelIn)) + '% of its forward speed');
    expect(p.teach).toContain('(' + Math.round(hp.levelIn * MPH) + ' mph down to ' + Math.round(hp.levelOut * MPH) + ' mph)');
    // "arrives later than a chest pass and about waist high"
    expect(r.read.cross.t).toBeGreaterThan(run('freethrow', 'chestpass').read.cross.t);
    expect(r.read.cross.y).toBeGreaterThan(0.6);
    expect(r.read.cross.y).toBeLessThan(1.1);
    // the preset angle sits on the slider
    const vr = M.MODES.freethrow.verticalAimRange;
    expect(p.aimDegV).toBeGreaterThanOrEqual(vr[0]);
    // the where-sentence gives the same bounce
    expect(r.whereText).toBe('It reached your teammate ' + r.read.cross.y.toFixed(2) + ' m off the floor (catch zone 0.6 to 1.6 m). It bounced ' + hp.z.toFixed(1) + ' m out, and the floor slowed it from ' + Math.round(hp.levelIn * MPH) + ' to ' + Math.round(hp.levelOut * MPH) + ' mph going forward.');
    // the preset still needs its speed: a few mph slower is not caught at this angle
    expect(run('freethrow', 'bouncepass', { speedMph: p.speedMph - 5 }).location).not.toBe('caught');
  });

  it('the shaded bounce zone is where a pass at this speed can bounce once and be caught', () => {
    expect(source).not.toContain('worldToCanvas(passReceiverZ * 0.78, 0)');
    expect(source).toContain('bouncePassZone(d)');
    const z = M.bouncePassZone();
    const hp = run('freethrow', 'bouncepass').read.hops[0];
    expect(hp.z).toBeGreaterThanOrEqual(z.zMin - 1e-9);
    expect(hp.z).toBeLessThanOrEqual(z.zMax + 1e-9);
    // inside the zone is caught; a bounce well past its far end is not
    for (const a of [-20, -14, -9, -6.5]) {
      const r = run('freethrow', 'bouncepass', { aimDegV: a });
      expect(r.location, String(a)).toBe('caught');
      expect(r.read.hops[0].z).toBeLessThanOrEqual(z.zMax + 1e-9);
    }
    const past = run('freethrow', 'bouncepass', { aimDegV: -3 });
    expect(past.read.hops[0].z).toBeGreaterThan(z.zMax);
    expect(past.location).not.toBe('caught');
    // too slow for any angle: no zone
    expect(M.bouncePassZone({ speedMph: 16 })).toBe(null);
  });

  it('low and high bounce-pass advice moves the arrival the right way', () => {
    let far = 0, near = 0;
    for (let s = 18; s <= 34; s += 1) for (let a = -20; a <= -4; a += 1) {
      const r = run('freethrow', 'bouncepass', { speedMph: s, aimDegV: a });
      const y0 = r.read.cross && r.read.cross.y;
      if (r.location === 'lowpass' && r.read.hops.length === 1) {
        if (r.read.hops[0].z > 4) {
          far++;  // "Aim down a little more so it bounces closer to you."
          expect(run('freethrow', 'bouncepass', { speedMph: s, aimDegV: a - 1 }).read.cross.y, JSON.stringify({ s, a })).toBeGreaterThan(y0);
        } else {
          near++; // "Throw harder."
          expect(run('freethrow', 'bouncepass', { speedMph: s + 1, aimDegV: a }).read.cross.y, JSON.stringify({ s, a })).toBeGreaterThan(y0);
        }
      }
    }
    expect(far).toBeGreaterThan(5);
    expect(near).toBeGreaterThan(5);
    // No bounce pass on the sliders arrives high (checked over the full slider range), so only
    // the wording of that branch is checked: it must not say "aim lower".
    expect(source).toContain('Throw softer, or aim a little less down so it bounces farther away.');
    expect(source).not.toContain('Throw harder, or bounce it closer to your teammate.');
    expect(source).toContain("tip: 'Bounce it about ⅔ of the way to your teammate. The floor takes speed off, so it arrives later than a chest pass.' }");
  });
});
