import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Stage D pure models: the freezing lens counter, the passive house designer
// (UA, ventilation, degree-days, usable sunshine, heat-pump electricity) and
// the sonification / description helpers. House numbers are worked by hand
// below from the stated formulas and constants, never read back from the tool.
let M;

beforeEach(() => {
  resetStemLab();
  M = loadTool('stem_lab/stem_tool_heatlab.js', 'heatLab').models;
});

describe('particle lens counter', () => {
  it('counts bonds broken while heating and bonds formed while freezing', () => {
    expect(M.lensBondCounter({ kind: 'melt', frac: 0.3 }, 100)).toEqual({ word: 'broken', k: 30, n: 100 });
    // freezing: frac is the still-liquid share, so 30% liquid = 70 bonds formed
    expect(M.lensBondCounter({ kind: 'melt', frac: 0.3, dir: 'freeze' }, 100)).toEqual({ word: 'formed', k: 70, n: 100 });
    expect(M.lensBondCounter({ kind: 'melt', frac: 1, dir: 'freeze' }, 150).k).toBe(0);
    expect(M.lensBondCounter({ kind: 'melt', frac: 0, dir: 'freeze' }, 150).k).toBe(150);
    expect(M.lensBondCounter({ kind: 'boil', frac: 7 }, 10).k).toBe(10); // clamped
  });
});

describe('passive house designer', () => {
  // Hand calculation for one design in the cold climate (Portland, Maine).
  const DESIGN = { wall: 'filled', roofMm: 300, floor: 'pir100', glazing: 'triple', winS: 12, winE: 3, winW: 3, winN: 2, air: 'tight', mvhr: false };
  const PORTLAND = [-4.4, -3.2, 1.2, 7.0, 12.7, 17.9, 21.3, 20.7, 16.4, 10.2, 4.4, -0.9];
  const SOUTH = [85, 95, 100, 80, 75, 70, 75, 80, 90, 90, 65, 65];
  const DAYS = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  // walls: films 0.17 + brick 0.13 + mineral wool 2.50 + block 0.11 + plaster 0.06
  const Uwall = 1 / (0.17 + 0.13 + 2.50 + 0.11 + 0.06);
  const Uroof = 1 / (0.10 + 0.300 / 0.040);
  const Ufloor = 1 / (1 / 0.75 + 0.100 / 0.022);
  const winA = 12 + 3 + 3 + 2;
  const UA = Uwall * (104 - winA) + Uroof * 100 + Ufloor * 100 * 0.5 + 0.8 * winA;
  // airtight (0.3 /h) is below the 0.35 /h healthy minimum and there is no heat recovery,
  // so 0.35 /h is aired through windows: H = rho c V n = 0.335 x 260 x 0.35
  const Hv = 0.335 * 260 * 0.35;
  const H = UA + Hv;
  const gArea = (12 * 1 + 3 * 0.55 + 3 * 0.55 + 2 * 0.3) * 0.5 * 0.6;

  it('adds U x A per element and the ventilation loss, as worked by hand', () => {
    const m = M.houseModel(DESIGN, 'cold');
    expect(Uwall).toBeCloseTo(0.3367, 4);
    expect(m.U.wall).toBeCloseTo(Uwall, 10);
    expect(m.UA.wall).toBeCloseTo(Uwall * 84, 9);
    expect(m.UA.roof).toBeCloseTo(13.158, 3);
    expect(m.UA.floor).toBeCloseTo(8.505, 3);
    expect(m.UA.window).toBeCloseTo(16, 10);
    expect(m.UAsum).toBeCloseTo(UA, 9);
    expect(UA).toBeCloseTo(65.94, 1);
    expect(m.Hvent).toBeCloseTo(30.485, 3);
    expect(m.Htot).toBeCloseTo(H, 9);
  });

  it('computes each month from degree-days minus the usable share of sunshine (ISO 13790, a = 4)', () => {
    const m = M.houseModel(DESIGN, 'cold');
    let annual = 0;
    PORTLAND.forEach((T, i) => {
      const hdd = DAYS[i] * Math.max(0, 18.3 - T);
      const loss = H * hdd * 24 / 1000;
      const sun = gArea * SOUTH[i];
      let need = 0;
      if (loss > 0) {
        const y = sun / loss;
        const eta = Math.abs(y - 1) < 1e-9 ? 4 / 5 : (1 - y ** 4) / (1 - y ** 5);
        need = Math.max(0, loss - eta * sun);
      }
      expect(m.months[i].hdd, 'hdd ' + i).toBeCloseTo(hdd, 9);
      expect(m.months[i].lossKWh, 'loss ' + i).toBeCloseTo(loss, 6);
      expect(m.months[i].needKWh, 'need ' + i).toBeCloseTo(need, 6);
      annual += need;
    });
    // January by hand: 31 x 22.7 = 703.7 K.d; 96.43 W/K x 703.7 x 24 h = 1,628.5 kWh lost;
    // sun 4.77 m2 x 85 = 405.5 kWh, eta 0.997, so about 1,224 kWh needed.
    expect(m.months[0].hdd).toBeCloseTo(703.7, 6);
    expect(m.months[0].lossKWh).toBeCloseTo(1628.5, 0);
    expect(m.months[0].needKWh).toBeCloseTo(1224.3, 0);
    expect(m.demandKWh).toBeCloseTo(annual, 6);
    expect(m.kwhM2).toBeCloseTo(annual / 100, 8);
    // July is warmer than the 18.3 C base: no heating at all
    expect(m.months[6].needKWh).toBe(0);
  });

  it('uses the section 15 heat-pump model month by month for electricity and bills', () => {
    const m = M.houseModel(DESIGN, 'cold');
    let elec = 0;
    m.months.forEach((mo) => {
      const hp = M.heatPump(mo.meanC, 20);
      if (mo.needKWh > 0) {
        expect(mo.cop).toBeCloseTo(hp.realisticCOP, 12);
        elec += mo.needKWh / hp.realisticCOP;
      }
    });
    expect(m.elecKWh).toBeCloseTo(elec, 6);
    expect(m.billHP).toBeCloseTo(elec * 0.25, 6);
    expect(m.billResist).toBeCloseTo(m.demandKWh * 0.25, 6);
    expect(m.scop).toBeGreaterThan(2);
    expect(m.scop).toBeLessThan(5);
  });

  it('uses the cited 1991-2020 normals, and its degree-days sit near NOAA\'s own for Portland', () => {
    expect(M.climates.find((c) => c.id === 'cold').meanC).toEqual(PORTLAND);
    expect(M.climates.find((c) => c.id === 'temperate').meanC).toEqual([5.6, 5.8, 7.9, 10.5, 13.7, 16.8, 19.0, 18.7, 15.9, 12.3, 8.4, 5.9]);
    expect(M.climates.find((c) => c.id === 'mild').meanC).toEqual([11.2, 12.3, 13.1, 13.6, 14.3, 15.4, 15.7, 16.5, 17.2, 16.7, 14.0, 11.4]);
    const hdd = M.houseModel({}, 'cold').hdd;
    // NCEI MLY-HTDD-NORMAL for USW00014764 sums to 6,795 F.d = 3,775 K.d
    expect(Math.abs(hdd - 6795 * 5 / 9) / (6795 * 5 / 9)).toBeLessThan(0.03);
    // colder climate, more degree-days
    const t = M.houseModel({}, 'temperate').hdd, mild = M.houseModel({}, 'mild').hdd;
    expect(hdd).toBeGreaterThan(t);
    expect(t).toBeGreaterThan(mild);
  });

  it('only recovers heat from the fan\'s air, so heat recovery pays only in a tight house', () => {
    const leaky = M.houseModel({ air: 'leaky', mvhr: true }, 'cold');
    expect(leaky.ventAch).toBeCloseTo(1.0 + 0.35 * 0.2, 12);
    const tight = M.houseModel({ air: 'passive', mvhr: true }, 'cold');
    expect(tight.ventAch).toBeCloseTo(0.1 + 0.07, 12);
    expect(tight.freshAch).toBeCloseTo(0.45, 12);
    const noRec = M.houseModel({ air: 'passive', mvhr: false }, 'cold');
    expect(noRec.ventAch).toBeCloseTo(0.35, 12);       // aired through windows
    expect(noRec.freshOk).toBe(true);
    expect(M.houseModel({ air: 'leaky' }, 'cold').ventAch).toBe(1.0);
  });

  it('checks comfort at the coldest month\'s glass surface, T_in - U R_si (T_in - T_out)', () => {
    const tri = M.houseModel({ glazing: 'triple' }, 'cold');
    expect(tri.glassC).toBeCloseTo(20 - 0.8 * 0.13 * (20 + 4.4), 10);
    expect(tri.comfortOk).toBe(true);
    const lowe = M.houseModel({ glazing: 'lowe' }, 'cold');
    expect(lowe.glassC).toBeCloseTo(20 - 1.4 * 0.13 * 24.4, 10);
    expect(lowe.comfortOk).toBe(false);
  });

  it('caps the window total at 60 m2 by scaling each orientation', () => {
    const m = M.houseModel({ winS: 30, winE: 30, winW: 30, winN: 30 }, 'cold');
    expect(m.winA).toBeCloseTo(60, 10);
    expect(m.wallA).toBeCloseTo(44, 10);
  });

  it('starts at a failing default, and the brief has more than one way to pass', () => {
    const def = M.houseModel({}, 'cold');
    expect(def.meets).toBe(false);
    expect(def.kwhM2).toBeGreaterThan(150);
    const passes = [];
    for (const wall of ['filled', 'super']) for (const roofMm of [200, 300, 400]) for (const floor of ['pir100', 'pir200'])
      for (const air of ['tight', 'passive']) for (const mvhr of [false, true]) {
        const m = M.houseModel({ wall, roofMm, floor, glazing: 'triple', winS: 16, winE: 2, winW: 2, winN: 2, air, mvhr }, 'cold');
        if (m.meets) passes.push({ wall, air, mvhr, kwh: m.kwhM2, co2: m.co2Sum, cost: m.costSum });
      }
    expect(passes.length).toBeGreaterThan(3);
    // no dominant recipe: passing designs exist with and without heat recovery
    expect(passes.some((p) => p.mvhr)).toBe(true);
    expect(passes.some((p) => !p.mvhr)).toBe(true);
    // and the very lowest-demand build busts the carbon limit
    const best = M.houseModel({ wall: 'super', roofMm: 400, floor: 'pir200', glazing: 'triple', winS: 16, winE: 2, winW: 2, winN: 2, air: 'passive', mvhr: true }, 'cold');
    expect(best.kwhM2).toBeLessThan(def.kwhM2 / 5);
    expect(best.meetsCo2).toBe(false);
  });

  it('normalises designs: bad input falls back, "my wall" needs real layers', () => {
    expect(M.houseDesign({ wall: 'mine', mine: [] }).wall).toBe('cavity');
    const mine = M.houseDesign({ wall: 'mine', mine: ['brick', 'pir', 'bogus'] });
    expect(mine.wall).toBe('mine');
    expect(mine.mine).toEqual(['brick', 'pir']);
    expect(M.houseModel({ wall: 'mine', mine: ['brick', 'pir'] }).U.wall).toBeCloseTo(1 / (0.17 + 0.13 + 2.27), 12);
    expect(M.houseDesign({ roofMm: 250, glazing: 'x', winS: -4, winN: 99 })).toMatchObject({ roofMm: 100, glazing: 'single', winS: 0, winN: 30 });
  });
});

describe('sonification and described graphs', () => {
  const water = () => { const p = []; for (let e = 0; e <= 3100; e += 10) p.push([e, M.waterState(e).temp]); return p; };

  it('maps temperature to pitch on a log scale, so a plateau is one steady tone', () => {
    const plan = M.sonifyPlan(water(), { yMin: -20, yMax: 125 });
    expect(plan.duration).toBe(5);
    expect(plan.fAt(-20)).toBeCloseTo(220, 9);
    expect(plan.fAt(125)).toBeCloseTo(880, 9);
    // linear in temperature, exponential in frequency
    expect(plan.fAt(52.5)).toBeCloseTo(Math.sqrt(220 * 880), 6);
    // the two latent plateaus are found, and their samples share one frequency
    expect(plan.plateaus.length).toBe(2);
    expect(plan.plateaus[0].y).toBe(0);
    expect(plan.plateaus[1].y).toBe(100);
    const inMelt = plan.samples.filter((s) => s.t > plan.duration * 60 / 3100 && s.t < plan.duration * 370 / 3100);
    expect(new Set(inMelt.map((s) => s.freq.toFixed(9))).size).toBe(1);
    expect(plan.cues.filter((c) => c.kind === 'plateau')).toHaveLength(2);
    expect(plan.cues[0].kind).toBe('start');
    expect(plan.cues[plan.cues.length - 1].kind).toBe('end');
  });

  it('rejects unusable input', () => {
    expect(M.sonifyPlan(null)).toBeNull();
    expect(M.sonifyPlan([[0, 1]])).toBeNull();
    expect(M.sonifyPlan([[2, 1], [1, 3]])).toBeNull();
    expect(M.sonifyPlan([[0, NaN], [1, NaN]])).toBeNull();
  });

  it('schedules on a Web Audio context and stops cleanly, calling onEnd once', () => {
    const made = [];
    const param = () => ({ setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} });
    const ac = {
      currentTime: 0, destination: {},
      createOscillator() { const o = { type: '', frequency: param(), connect() {}, start() {}, stop() { o.stopped = true; }, disconnect() {} }; made.push(o); return o; },
      createGain() { return { gain: param(), connect() {} }; },
      createStereoPanner() { return { pan: param(), connect() {} }; },
    };
    let ended = 0;
    const plan = M.sonifyPlan(water(), { yMin: -20, yMax: 125 });
    const handle = M.sonifyPlay(plan, ac, () => { ended++; });
    expect(handle.duration).toBe(5);
    expect(made.length).toBe(1 + plan.cues.length);
    handle.stop();
    handle.stop();
    expect(ended).toBe(1);
    expect(made.every((o) => o.stopped)).toBe(true);
    expect(M.sonifyPlay(plan, null)).toBeNull();
  });

  it('ticks once a second when cold and ten times a second at the hot end', () => {
    expect(M.tickIntervalMs(20, 20, 200)).toBeCloseTo(1000, 9);
    expect(M.tickIntervalMs(200, 20, 200)).toBeCloseTo(100, 9);
    expect(M.tickIntervalMs(110, 20, 200)).toBeCloseTo(1000 * Math.pow(0.1, 0.5), 9);
    expect(M.tickIntervalMs(500, 20, 200)).toBeCloseTo(100, 9);
    const a = M.tickIntervalMs(60, 20, 200), b = M.tickIntervalMs(90, 20, 200);
    expect(b).toBeLessThan(a);
  });

  it('describes a Newton cooling curve with its true half-life, tau ln 2', () => {
    const tau = 600;
    const pts = [];
    for (let s = 0; s <= 3600; s += 5) pts.push([s, 20 + 70 * Math.exp(-s / tau)]);
    const d = M.describeSeries(pts, { towards: 20 });
    expect(d.y0).toBe(90);
    expect(d.halfX).toBeCloseTo(tau * Math.LN2, 0);
    expect(d.rising).toBe(false);
    expect(d.plateaus).toHaveLength(0);
    const flat = M.describeSeries([[0, 10], [1, 20], [2, 20], [3, 20], [4, 30]]);
    expect(flat.plateaus).toEqual([{ x0: 1, x1: 3, y: 20 }]);
    expect(M.describeSeries([[0, 1]])).toBeNull();
  });
});
