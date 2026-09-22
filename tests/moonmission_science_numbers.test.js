// Moon Mission — the numbers a student reads must come from the physics taught.
//
// A science audit ran the tool's own code and found readouts contradicting the
// lesson around them:
//   • the launch HUD printed raw animation counters: ORBIT ACHIEVED at 20 km,
//     12,970 m/s (faster than Earth escape) and 11.4 g, beside a banner saying
//     185 km, and kept climbing to 49 km/s and 40 g after orbit;
//   • the return coast's distance fell linearly while its "closing speed" was an
//     unrelated curve: integrating the speed over the clock covered 2.9x the trip;
//   • the entry corridor gave 6.9 g at Apollo 11's own -6.5 deg, next to "Apollo 11
//     pulled roughly 6.5";
//   • the rocket-equation lab's third outcome was unreachable and its orbit
//     threshold ignored gravity and drag losses.
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_moonmission.js';
const ID = 'moonMission';
let pure;

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, ID);
  pure = window.MoonMissionPure;
});

describe('launch readouts follow an Apollo-like ascent', () => {
  it('reaches a 185 km orbit at 7.8 km/s and then reads 0 g', () => {
    const orbit = pure.launchDisplay(1);
    expect(orbit.altKm).toBe(185);
    expect(orbit.velMs).toBe(7800);
    expect(orbit.g).toBe(0);
    expect(pure.launchDisplay(3).velMs, 'kept accelerating after orbit').toBe(7800);
  });

  it('climbs monotonically, never past orbit, with g peaking under 4 and dropping at staging', () => {
    let prev = pure.launchDisplay(0);
    let peakG = 0;
    for (let i = 1; i <= 1000; i++) {
      const cur = pure.launchDisplay(i / 1000);
      expect(cur.altKm).toBeGreaterThanOrEqual(prev.altKm);
      expect(cur.velMs).toBeGreaterThanOrEqual(prev.velMs);
      expect(cur.altKm).toBeLessThanOrEqual(185);
      expect(cur.velMs).toBeLessThanOrEqual(7800);
      if (!cur.orbit) peakG = Math.max(peakG, cur.g);
      prev = cur;
    }
    expect(peakG).toBeGreaterThan(3.5);
    expect(peakG).toBeLessThanOrEqual(4.0);
    expect(pure.launchDisplay(0.0999).g - pure.launchDisplay(0.1001).g, 'no g drop at S-IC cutoff').toBeGreaterThan(2);
    expect(pure.launchDisplay(0.3999).g - pure.launchDisplay(0.4001).g, 'no g drop at S-II cutoff').toBeGreaterThan(1);
    expect(pure.launchDisplay(0.0999).altKm).toBeGreaterThan(60);   // S-IC cutoff ~67 km
  });
});

describe('the return coast is one model, not three', () => {
  it('takes about two and a half days and arrives at about 39,700 km/h', () => {
    const end = pure.returnCoast(1);
    expect(end.totalDays).toBeGreaterThan(2.3);
    expect(end.totalDays).toBeLessThan(2.7);
    expect(Math.abs(end.speedKmh - 39700)).toBeLessThan(300);
    expect(end.distKm).toBeLessThan(200);           // entry interface, ~122 km up
  });

  it('distance, speed and clock agree: the speed shown covers the distance shown', () => {
    const N = 2000;
    let covered = 0;
    let last = pure.returnCoast(0);
    for (let i = 1; i <= N; i++) {
      const cur = pure.returnCoast(i / N);
      expect(cur.distKm).toBeLessThanOrEqual(last.distKm);
      expect(cur.speedKmh).toBeGreaterThanOrEqual(last.speedKmh);
      const hours = (cur.days - last.days) * 24;
      covered += ((cur.speedKmh + last.speedKmh) / 2) * hours;
      last = cur;
    }
    const start = pure.returnCoast(0), end = pure.returnCoast(1);
    const travelled = start.distKm - end.distKm;
    expect(Math.abs(covered - travelled) / travelled, 'speed x time does not match the distance').toBeLessThan(0.03);
  });

  it('the coast canvas reads the model rather than its own formulas', () => {
    const src = fs.readFileSync(FILE, 'utf8');
    expect(src).not.toMatch(/3200 \+ progress \* progress \* 36700/);
    expect(src).toMatch(/var _rc = mmReturnCoast\(progress\)/);
  });
});

describe('re-entry and the rocket-equation lab', () => {
  it("Apollo 11's own entry angle gives Apollo 11's peak g", () => {
    expect(pure.entryPeakG(-6.5)).toBe(6.5);
    expect(pure.entryPeakG(-7.4)).toBeGreaterThan(pure.entryPeakG(-6.5));
    expect(pure.entryPeakG(-5.3)).toBe(4);
  });

  it('the best single-stage setting reaches orbit but not the Moon, and the lab says why', () => {
    const best = renderTool(ID, { moonMission: { missionPhase: 0, deltaVHunt: { massRatio: 12, burnDur: 180, isp: 450, log: [], stuckRevealed: true } } });
    expect(best).toContain('LEO / Earth orbit');
    expect(best).not.toContain('Enough for the Moon');
    expect(best).toMatch(/single-stage setting get there\? What did the Saturn V do instead/);
    const weak = renderTool(ID, { moonMission: { missionPhase: 0, deltaVHunt: { massRatio: 3, burnDur: 180, isp: 311, log: [] } } });
    expect(weak).toContain('Insufficient');
  });
});

describe('factual corrections stay corrected', () => {
  const src = fs.readFileSync(FILE, 'utf8');
  it.each([
    ['0.043 MHz', 'the Apollo Guidance Computer clock was 1.024 MHz'],
    ["Boyle\\'s Law", 'heating a sealed tank is Gay-Lussac, not Boyle'],
    ['By rotating Orion', 'this mission flies Apollo, not Orion'],
    ['fuel cells also generate your oxygen', 'fuel cells consume oxygen'],
    ['with the keys in it', 'the rover had no keys'],
    ['Ionized plasma at 2,760', '2,760 C is the heat shield, not the plasma'],
    ['Apollo 10 famously logged one', 'the Apollo 10 incident was not a vent failure'],
  ])('does not claim %s (%s)', (claim) => {
    expect(src).not.toContain(claim);
  });
});
