import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const modelStart = source.indexOf('  var ISS_GM =');
const modelEnd = source.indexOf('  // Saved investigations');
const helperStart = source.indexOf('  var ISS_OPS_INPUTS =');
const helperEnd = source.indexOf('  // User-started clocks', helperStart);
if ([modelStart, modelEnd, helperStart, helperEnd].some(index => index < 0)) throw new Error('Station reserve planner not found');
const { planFor, alignmentFor, researchFor, model } = new Function(source.slice(modelStart, modelEnd) + source.slice(helperStart, helperEnd) +
  '\nreturn {planFor:issOpsReservePlan,alignmentFor:issOpsAlignmentPlan,researchFor:issOpsResearchPlan,model:issPowerState};')();

describe('space station starting reserve planner', () => {
  it('finds the first passing whole-percent slider setting in the default and longer eclipse', () => {
    const nominal = planFor();
    expect(nominal).toMatchObject({ target: 25, recommended: { startingPercent: 25, minimumPercent: 25 },
      lower: { startingPercent: 24, minimumPercent: 24 } });
    expect(nominal.current).toEqual({ startingPercent: 76, minimumPercent: model({}, 92).minimumPercent });
    const longer = planFor({ eclipse: 45 });
    expect(longer.recommended.startingPercent).toBe(36);
    expect(longer.recommended.minimumPercent).toBeCloseTo(25.080122776135124, 12);
    expect(longer.lower.startingPercent).toBe(35);
    expect(longer.lower.minimumPercent).toBeCloseTo(24.080122776135124, 12);
  });

  it('allows a fractional working setting to pass below the recommended whole-percent setting', () => {
    const settings = Object.freeze({ eclipse: 45, battery: 35.95 });
    const plan = planFor(settings);
    expect(plan.current.startingPercent).toBe(35.95);
    expect(plan.current.minimumPercent).toBeCloseTo(25.030122776135126, 12);
    expect(plan.recommended.startingPercent).toBe(36);
    expect(planFor({ ...settings, battery: 2 }).recommended).toEqual(plan.recommended);
  });

  it('uses the initial minimum even if zero starting reserve can supply every load', () => {
    const settings = { generation: 320, load: 20, eclipse: 20, battery: 0 };
    const end = model(settings, 92);
    expect(end.unservedKWh).toBe(0);
    expect(end.percent).toBeGreaterThan(90);
    const plan = planFor(settings);
    expect(plan.current).toEqual({ startingPercent: 0, minimumPercent: 0 });
    expect(plan.recommended).toEqual({ startingPercent: 25, minimumPercent: 25 });
    expect(plan.lower.minimumPercent).toBe(24);
  });

  it('includes equality when the start and end tie at the threshold', () => {
    const settings = { capacity: 100, generation: 46, load: 30, chargeEfficiency: 1, dischargeEfficiency: 1, eclipse: 32, battery: 25 };
    const plan = planFor(settings);
    expect(model(settings, 92).percent).toBe(25);
    expect(plan.current).toEqual({ startingPercent: 25, minimumPercent: 25 });
    expect(plan.recommended).toEqual(plan.current);
    expect(plan.lower).toEqual({ startingPercent: 24, minimumPercent: 24 });
  });

  it('returns 100 when only a full battery reaches exactly 25%', () => {
    const plan = planFor({ capacity: 92, generation: 0, load: 45, dischargeEfficiency: 1, eclipse: 45 });
    expect(plan.recommended).toEqual({ startingPercent: 100, minimumPercent: 25 });
    expect(plan.full).toEqual(plan.recommended);
    expect(plan.lower).toEqual({ startingPercent: 99, minimumPercent: 24 });
  });

  it('rejects values just below the target even when one-decimal display rounds to 25.0', () => {
    const settings = { capacity: 92, generation: 0, dischargeEfficiency: 1, eclipse: 45 };
    const marginal = planFor({ ...settings, load: 30.00000006 });
    expect(marginal.lower.startingPercent).toBe(75);
    expect(marginal.lower.minimumPercent.toFixed(1)).toBe('25.0');
    expect(marginal.lower.minimumPercent).toBeLessThan(25);
    expect(marginal.recommended.startingPercent).toBe(76);
    const impossible = planFor({ ...settings, load: 45.0000001 });
    expect(impossible.full.minimumPercent.toFixed(1)).toBe('25.0');
    expect(impossible.full.minimumPercent).toBeLessThan(25);
    expect(impossible.recommended).toBeNull();
    expect(impossible.lower).toBeNull();
  });

  it('distinguishes an impossible reserve rule from unmet demand at full charge', () => {
    const settings = { generation: 0, load: 107.6, eclipse: 45, battery: 100 };
    const plan = planFor(settings);
    expect(model(settings, 92).unservedKWh).toBe(0);
    expect(plan.full.minimumPercent).toBeCloseTo(17.299916457811197, 12);
    expect(plan.recommended).toBeNull();
    expect(plan.lower).toBeNull();
  });

  it('agrees with an exhaustive model sweep for full, depleted, capped and nondefault stores', () => {
    const cases = [{}, { eclipse: 45 }, { generation: 0, load: 107.6 }, { generation: 320, load: 0, battery: 0 },
      { generation: 65, load: 105, eclipse: 39.12345, capacity: 177, chargeEfficiency: .72, dischargeEfficiency: .81 },
      { generation: 167, load: 94, capacity: 111, chargeEfficiency: .53, dischargeEfficiency: .64 },
      { generation: 0, load: 200, capacity: 1 }, { generation: '150', capacity: '235', battery: 102, eclipse: 50 }];
    for (const settings of cases) {
      const plan = planFor(Object.freeze(settings));
      const all = Array.from({ length: 101 }, (_, battery) => ({
        startingPercent: battery, minimumPercent: model({ ...settings, battery }, 92).minimumPercent
      }));
      const first = all.find(entry => entry.minimumPercent >= 25);
      expect(plan.recommended).toEqual(first ?? null);
      expect(plan.lower).toEqual(first ? all[first.startingPercent - 1] : null);
      expect(plan.full).toEqual(all[100]);
      expect(plan.current).toEqual({ startingPercent: model(settings, 0).percent, minimumPercent: model(settings, 92).minimumPercent });
    }
  });
});

describe('space station research utilization planner', () => {
  const options = { battery: 35, eclipse: 45, generation: 160 };
  it('holds the current orbit fixed and shows the highest passing slider setting and the next step', () => {
    const settings = Object.freeze({ ...options, load: 101.2 });
    const plan = researchFor(settings, 55.1, 7);
    expect(plan.recommended.research).toBe(55);
    expect(plan.recommended.minimumPercent).toBeCloseTo(25.02157, 5);
    expect(plan.higher.research).toBe(60);
    expect(plan.higher.minimumPercent).toBeCloseTo(24.21824, 5);
    expect(plan.current.research).toBe(55.1);
    expect(plan.current.minimumPercent).toBeGreaterThan(25);
  });

  it('includes 0% and 100%, distinguishes an impossible orbit, and includes the starting minimum', () => {
    const onlyZero = researchFor({ ...options, battery: 25 }, 5, 6);
    expect(onlyZero.recommended).toEqual({ research: 0, minimumPercent: 25 });
    expect(onlyZero.higher.minimumPercent).toBeLessThan(25);
    const full = researchFor({ ...options, battery: 45 }, 5, 7);
    expect(full.recommended.research).toBe(100);
    expect(full.higher).toBeNull();
    const impossible = researchFor({ ...options, battery: 26 }, 5, 7);
    expect(impossible.recommended).toBeNull();
    expect(impossible.zero.minimumPercent).toBeCloseTo(24.85826, 5);
    const startsLow = researchFor({ ...options, battery: 24.999, eclipse: 20 }, 100, 3);
    expect(startsLow.recommended).toBeNull();
    expect(startsLow.zero.minimumPercent).toBeCloseTo(24.999, 10);
  });

  it('agrees with an exhaustive slider sweep across crew, shadow, capacity and conversion losses', () => {
    for (const settings of [options, {}, { generation: 0, battery: 100 }, { generation: 79.2, battery: 50.1, eclipse: 42.125 },
      { generation: 156, battery: 41.5, capacity: 190, chargeEfficiency: .65, dischargeEfficiency: .72 }]) {
      for (const crew of [3, 7, 11]) {
        const forecast = research => ({ research, minimumPercent: model({ ...settings, load: 68 + 1.6 * crew + .22 * research }, 92).minimumPercent });
        const sweep = Array.from({ length: 21 }, (_, i) => forecast(i * 5));
        const best = sweep.filter(entry => entry.minimumPercent >= 25).pop();
        const plan = researchFor(settings, 55.75, crew);
        expect(plan.current).toEqual(forecast(55.75));
        expect(plan.zero).toEqual(sweep[0]);
        expect(plan.recommended).toEqual(best ?? null);
        expect(plan.higher).toEqual(best && best.research < 100 ? sweep[best.research / 5 + 1] : null);
      }
    }
  });
});

describe('space station array alignment planner', () => {
  it('keeps the current charge fixed and uses unrounded minima at the 7°/8° boundary', () => {
    const settings = Object.freeze({ battery: 100, eclipse: 45, load: 107.6, generation: 12 });
    const plan = alignmentFor(settings, 7.999);
    expect(plan.recommended.angle).toBe(8);
    expect(plan.lower.angle).toBe(7);
    expect(plan.lower.minimumPercent).toBeCloseTo(24.956202693456213, 10);
    expect(plan.lower.minimumPercent.toFixed(1)).toBe('25.0');
    expect(plan.recommended.minimumPercent).toBeCloseTo(26.043289216538785, 10);
    expect(plan.current.angle).toBe(7.999);
    expect(plan.current.minimumPercent).toBeGreaterThan(25);
    expect(alignmentFor({ ...settings, battery: 96 }, 7.999).recommended.angle).toBeGreaterThan(8);
  });

  it('distinguishes zero-degree success, an initially low battery and an unreachable eclipse', () => {
    const zero = alignmentFor({ battery: 100, load: 50 }, 12);
    expect(zero.recommended.angle).toBe(0);
    expect(zero.lower).toBeNull();
    const low = alignmentFor({ battery: 24.999, load: 0 }, 90);
    expect(low.recommended).toBeNull();
    expect(low.maximum.angle).toBe(90);
    expect(low.maximum.minimumPercent).toBeCloseTo(24.999, 10);
    const eclipse = alignmentFor({ battery: 100, capacity: 60, load: 100, eclipse: 45 }, 45);
    expect(eclipse.maximum.minimumPercent).toBeLessThan(25);
    expect(eclipse.recommended).toBeNull();
    expect(eclipse.lower).toBeNull();
  });

  it('includes 90° when only maximum alignment reaches exactly 25%', () => {
    const settings = { battery: 85, capacity: 200, load: 160, eclipse: 45, dischargeEfficiency: 1 };
    const plan = alignmentFor(settings, 89);
    expect(plan.recommended).toEqual({ angle: 90, minimumPercent: 25 });
    expect(plan.maximum).toEqual(plan.recommended);
    expect(plan.lower).toEqual(plan.current);
    expect(plan.lower.minimumPercent).toBeLessThan(25);
  });

  it('matches all 91 whole-degree settings including equality, curtailment and best-angle failure', () => {
    for (const settings of [{}, { battery: 25, load: 0 }, { battery: 97.25, eclipse: 45, load: 107.6 },
      { battery: 100, load: 150, eclipse: 45, capacity: 150 }, { battery: 76, load: 90, chargeEfficiency: .57, dischargeEfficiency: .65 },
      { battery: 38, capacity: 43, eclipse: 40, load: 120 }]) {
      const forecast = angle => ({ angle, minimumPercent: model({ ...settings, generation: 160 * Math.sin(angle * Math.PI / 180) }, 92).minimumPercent });
      const sweep = Array.from({ length: 91 }, (_, angle) => forecast(angle));
      const first = sweep.find(entry => entry.minimumPercent >= 25);
      const plan = alignmentFor(Object.freeze(settings), 36.75);
      expect(plan.current).toEqual(forecast(36.75));
      expect(plan.recommended).toEqual(first ?? null);
      expect(plan.lower).toEqual(first?.angle > 0 ? sweep[first.angle - 1] : null);
      expect(plan.maximum).toEqual(sweep[90]);
    }
  });
});
