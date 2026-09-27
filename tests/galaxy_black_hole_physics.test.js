import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Run the actual pure model from the standalone plugin, without a second copy
// of its equations or a WebGL stub pretending to verify their behavior.
const source = readFileSync('stem_lab/stem_tool_galaxy.js', 'utf8');
const kernel = source.split('// BEGIN BLACK HOLE EXPERIMENT MODEL')[1].split('// END BLACK HOLE EXPERIMENT MODEL')[0];
const { trajectory, sample, tides } = new Function(kernel + ';return {trajectory:blackHoleTrajectory,sample:blackHoleSample,tides:blackHoleTides};')();

describe('black hole experiment dynamics', () => {
  it.each([4,5,8])('radial release at %s Rs reaches the horizon in the analytical proper time', radius => {
    const run = trajectory({radius,sideways:0});
    const ratio = 1/radius;
    const expected = Math.sqrt(radius**3)*(Math.acos(Math.sqrt(ratio))+Math.sqrt(ratio*(1-ratio)))/2.5;
    expect(run.outcome).toBe('captured');
    expect(run.duration).toBeCloseTo(expected, 4);
    expect(run.samples.at(-1).radius).toBe(1);
    expect(run.samples.every((p,i,a) => p.radius>=1 && p.angle===0 && (!i || p.radius<=a[i-1].radius))).toBe(true);
  });

  it.each([4,5,8])('circular motion at %s Rs stays outside and completes an orbit', radius => {
    const run = trajectory({radius,sideways:1});
    expect(run.outcome).toBe('orbit');
    expect(Math.max(...run.samples.map(p => Math.abs(p.radius-radius)))).toBeLessThan(1e-8);
    expect(run.samples.at(-1).angle).toBeGreaterThanOrEqual(Math.PI*2);
  });

  it.each([4,5,8])('sufficient sideways motion at %s Rs escapes', radius => {
    const run = trajectory({radius,sideways:1.5});
    expect(run.outcome).toBe('escaped');
    expect(run.energySquared).toBeGreaterThan(1);
    expect(run.samples.at(-1).radialVelocity).toBeGreaterThan(0);
    expect(run.samples.at(-1).radius).toBeGreaterThanOrEqual(radius*1.8);
  });

  it('conserves geodesic energy through an angular infall', () => {
    const run = trajectory({radius:5,sideways:.65});
    expect(run.outcome).toBe('captured');
    for (const p of run.samples.slice(0,-1)) {
      const energy = p.radialVelocity**2+(1-1/p.radius)*(1+run.angularMomentum**2/p.radius**2);
      expect(Math.abs(energy-run.energySquared)).toBeLessThan(1e-7);
    }
  });

  it('replay and backwards scrubbing reproduce the same position', () => {
    const run = trajectory({radius:5,sideways:.65});
    const middle = sample(run,run.duration/2);
    sample(run,run.duration);
    expect(sample(run,run.duration/2)).toEqual(middle);
    expect(trajectory({radius:5,sideways:.65})).toEqual(run);
    expect(sample(run,-10).radius).toBe(5);
    expect(sample(run,Infinity).time).toBe(0);
    expect(sample(run,10000).radius).toBe(1);
  });

  it('tidal gradients follow inverse radius cubed and inverse mass squared at fixed r/Rs', () => {
    const small = tides(5,'stellar','probe');
    const large = tides(5,'supermassive','probe');
    expect(small.gradient/tides(10,'stellar','probe').gradient).toBeCloseTo(8,8);
    expect(small.gradient/large.gradient).toBeCloseTo((4000000/10)**2,0);
    expect(tides(1,'stellar','probe').disrupted).toBe(true);
    expect(tides(1,'supermassive','probe').disrupted).toBe(false);
    expect(tides(5,'supermassive','star').disrupted).toBe(true);
  });

  it('sanitizes saved nonfinite and out-of-range release values', () => {
    for(const options of [{radius:NaN,sideways:Infinity},{radius:-10,sideways:-5},{radius:999,sideways:999}]) {
      const run=trajectory(options);
      expect(run.releaseRadius).toBeGreaterThanOrEqual(4);
      expect(run.releaseRadius).toBeLessThanOrEqual(8);
      expect(run.samples.every(p=>Object.values(p).every(Number.isFinite))).toBe(true);
    }
  });
});
