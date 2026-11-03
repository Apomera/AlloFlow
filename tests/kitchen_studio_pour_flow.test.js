import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const Flow=require('../stem_lab/kitchen_studio/kitchen_studio_pour_flow.js');

describe('Tilt-responsive visual stream width',()=>{
  it.each([-Number.MAX_VALUE,-1,0,.2,.4])('has no stream at or below its opening threshold: %s',tilt=>{
    expect(Flow.width(tilt)).toBe(0);
  });
  it.each([1,1.5,Number.MAX_VALUE])('keeps a full tip within the original stream radius: %s',tilt=>{
    expect(Flow.width(tilt)).toBe(1);
  });
  it('starts continuously just beyond the opening threshold',()=>{
    const justOpen=Flow.width(.4+1e-10);
    expect(justOpen).toBeGreaterThan(0);expect(justOpen).toBeLessThan(1e-8);
  });
  it('approaches full width continuously without exceeding it',()=>{
    const nearFull=Flow.width(1-1e-5);
    expect(nearFull).toBeLessThan(1);expect(1-nearFull).toBeLessThan(1e-8);
  });
  it('grows monotonically and stays finite across the whole controlled tilt',()=>{
    let previous=0;
    for(let step=0;step<=600;step++){
      const tilt=.4+step/1000,current=Flow.width(tilt);
      expect(Number.isFinite(current)).toBe(true);expect(current).toBeGreaterThanOrEqual(previous);
      expect(current).toBeGreaterThanOrEqual(0);expect(current).toBeLessThanOrEqual(1);previous=current;
    }
  });
  it('tapers along the identical width path when the carton returns upright',()=>{
    const tilt=[0,.4,.45,.55,.7,.85,1],out=tilt.map(Flow.width),back=[...tilt].reverse().map(Flow.width);
    expect(back).toEqual([...out].reverse());expect(out[2]).toBeGreaterThan(0);expect(out[5]).toBeLessThan(1);
  });
  it('scales the visual cross-section gently at partial and halfway tips',()=>{
    expect(Flow.width(.55)**2).toBeCloseTo(.15625,12);
    expect(Flow.width(.7)**2).toBeCloseTo(.5,12);
    expect(Flow.width(.85)**2).toBeCloseTo(.84375,12);
  });
  it('does not retain previous tips or accumulate repeated samples',()=>{
    const partial=Flow.width(.625);Flow.width(1);Flow.width(-1);Flow.width(NaN);
    for(let sample=0;sample<20;sample++)expect(Flow.width(.625)).toBe(partial);
    expect(Flow.width(1)).toBe(1);expect(Flow.width(.4)).toBe(0);
  });
  it.each([NaN,Infinity,-Infinity,undefined,null,true,false,'0.7',{},[],new Number(.7),1n])('does not coerce invalid tilt %s',tilt=>{
    expect(Flow.width(tilt)).toBe(0);
  });
  it('does not call valueOf or mutate an invalid input object',()=>{
    const value=Object.freeze({valueOf(){throw new Error('Tilt coercion is forbidden');}});
    expect(()=>Flow.width(value)).not.toThrow();expect(Flow.width(value)).toBe(0);
  });
  it('exposes the same scalar helper to the browser and CommonJS consumers',()=>{
    expect(window.KitchenStudioPourFlow.width).toBe(Flow.width);
    expect(typeof Flow.width(.625)).toBe('number');
  });
});
