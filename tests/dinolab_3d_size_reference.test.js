import { describe, it, expect } from 'vitest';
import { internals } from './helpers/dino_lab_harness.js';
const { dinoMeasurementTicks, DINOS } = internals();

describe('Dino Lab calibrated reference ticks', () => {
  for (const span of [0.025, 0.15, 0.5, 0.9, 1, 1.1, 3.7, 12.3, 22, 40]) {
    it('keeps exact, ordered, bounded marks for ' + span + ' metres', () => {
      const scale = dinoMeasurementTicks(span);
      expect(scale.span).toBe(span);
      expect(scale.ticks[0].meters).toBe(0);
      expect(scale.ticks.at(-1).meters).toBe(span);
      expect(scale.ticks.length).toBeGreaterThanOrEqual(4);
      expect(scale.ticks.length).toBeLessThanOrEqual(8);
      expect(scale.ticks.filter(t => t.endpoint)).toHaveLength(2);
      const normal = scale.step / Math.pow(10, Math.floor(Math.log10(scale.step)));
      expect([1, 2, 5, 10].some(n => Math.abs(n - normal) < 1e-9)).toBe(true);
      scale.ticks.forEach((t, i) => {
        if(i) expect(t.meters).toBeGreaterThan(scale.ticks[i-1].meters);
        expect(t.meters).toBeLessThanOrEqual(span);
        const [number, unit] = t.label.split(' ');
        expect(unit).toBe(span < 1 ? 'cm' : 'm');
        expect(Number(number) / (unit === 'cm' ? 100 : 1)).toBeCloseTo(t.meters, 9);
      });
    });
  }
  it('supports every catalog length and height without duplicate or excessive ticks', () => {
    for(const species of DINOS) for(const field of ['lengthM','heightM']) {
      const result = dinoMeasurementTicks(species[field]);
      if (!(species[field] > 0)) { expect(result).toBeNull(); continue; }
      expect(result, species.id + ':' + field).not.toBeNull();
      expect(result.ticks.at(-1).meters).toBe(species[field]);
      expect(new Set(result.ticks.map(t => t.meters)).size).toBe(result.ticks.length);
      expect(result.ticks.length).toBeLessThanOrEqual(8);
    }
  });
  it('rejects unusable spans', () => {
    for(const span of [0,-1,NaN,Infinity,undefined]) expect(dinoMeasurementTicks(span)).toBeNull();
  });
});
