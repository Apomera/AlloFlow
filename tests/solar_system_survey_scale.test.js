import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const source = readFileSync('stem_lab/stem_tool_solarsystem.js','utf8');
const start = source.indexOf('function getDroneSurveyScale(');
const end = source.indexOf('var roverCameraBar =', start);
const scale = new Function(source.slice(start,end)+'; return getDroneSurveyScale;')();

describe('survey distance ruler', () => {
  it('matches a 90-degree view with an analytically known width', () => {
    // At a distance of 10, the view spans 20 world units vertically.
    // At 200 px and 50 m/unit, every pixel represents 5 m.
    const result = scale(10,90,200,50,100);
    expect(result.meters/result.pixels).toBeCloseTo(5,10);
    expect(result.pixels).toBeLessThanOrEqual(100.000001);
  });
  it('responds to camera distance, viewport height and model units', () => {
    const ratio = (...args) => { const r=scale(...args); return r.meters/r.pixels; };
    expect(ratio(20,90,200,50,100)).toBeCloseTo(10,10);
    expect(ratio(10,90,400,50,100)).toBeCloseTo(2.5,10);
    expect(ratio(10,90,200,100,100)).toBeCloseTo(10,10);
  });
  it('chooses readable 1/2/5 distances that fit the available ruler width', () => {
    for (const width of [25,54,90,150]) for (const distance of [7,22,40]) {
      const r=scale(distance,52,574,50,width);
      expect(r.pixels).toBeGreaterThan(0);
      expect(r.pixels).toBeLessThanOrEqual(width+0.000001);
      const leading=r.meters/10**Math.floor(Math.log10(r.meters));
      expect([1,2,5]).toContain(leading);
    }
  });
  it('does not publish a misleading scale for an invalid projection', () => {
    for(const args of [[0,52,574,50,100],[10,180,574,50,100],[10,52,0,50,100],[10,52,574,0,100],[10,52,574,50,0],[Infinity,52,574,50,100],[10,NaN,574,50,100]]) expect(scale(...args)).toBeNull();
  });
});
