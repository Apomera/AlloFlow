import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sliceBetween } from './helpers/anchored_slice.js';

const source=readFileSync('stem_lab/stem_tool_birdlab.js','utf8');
const geometry=sliceBetween(source,'  function birdlabPupilOverlap(', '  function BirdlabPupilAlignmentStudy(',{file:'stem_tool_birdlab.js'});
const { overlap, sample }=new Function(geometry+'\nreturn {overlap:birdlabPupilOverlap,sample:birdlabPupilSample};')();

describe('BirdLab circular alignment geometry',()=>{
  it.each([
    [2,1,0,Math.PI],[1,2,0,Math.PI],[2,1,1,Math.PI],
    [2,1,3,0],[2,1,4,0],[1,1,0,Math.PI],
    [1,1,1,2*Math.PI/3-Math.sqrt(3)/2],
    [3,3,3,9*(2*Math.PI/3-Math.sqrt(3)/2)],
  ])('resolves containment, tangency and exact circular lenses (%s,%s,%s)',(beam,eye,distance,area)=>{
    expect(overlap(beam,eye,distance)).toBeCloseTo(area,12);
  });
  it.each([[0,1,0],[-1,1,0],[1,0,0],[1,-1,0],[NaN,1,0],[1,Infinity,0],[1,1,NaN],[1,1,Infinity]])('rejects nonfinite or empty disks (%s,%s,%s)',(beam,eye,distance)=>{
    expect(overlap(beam,eye,distance)).toBe(0);
  });
  it('is invariant under horizontal reflection and exchanging the two disks',()=>{
    for(const beam of [.8333333333,1.5,2.625,6.25])for(const eye of [1.5,3])for(let step=0;step<=120;step++){
      const distance=step/10,area=overlap(beam,eye,distance);
      expect(overlap(beam,eye,-distance)).toBe(area);
      expect(overlap(eye,beam,distance)).toBeCloseTo(area,11);
    }
  });
  it('scales as area while fractions stay invariant',()=>{
    const beam=2.625,eye=1.5,distance=2,area=overlap(beam,eye,distance);
    for(const factor of [.25,.5,2,10])expect(overlap(beam*factor,eye*factor,distance*factor)).toBeCloseTo(area*factor*factor,10);
  });
  it('stays bounded and decreases continuously across both tangencies',()=>{
    for(const beam of [20/12/2,1.5,2.625,6.25])for(const eye of [1.5,3]){
      let previous=Infinity;const maximum=Math.PI*Math.min(beam,eye)**2;
      for(let step=0;step<=1200;step++){
        const area=overlap(beam,eye,step/100);expect(area).toBeGreaterThanOrEqual(0);expect(area).toBeLessThanOrEqual(maximum+4*Number.EPSILON*Math.max(1,maximum));expect(area).toBeLessThanOrEqual(previous+1e-10);previous=area;
      }
      for(const tangent of [Math.abs(beam-eye),beam+eye]){
        expect(Math.abs(overlap(beam,eye,tangent-1e-8)-overlap(beam,eye,tangent+1e-8))).toBeLessThan(1e-6);
      }
    }
  });
  it('keeps beam admission and eye coverage as distinct ratios with physical area units',()=>{
    const centered=sample({objective:42,magnification:8,pupil:3},0);
    expect(centered.beam).toBe(2.625);expect(centered.eye).toBe(1.5);
    expect(centered.area).toBeCloseTo(2.25*Math.PI,12);expect(centered.eyeFill).toBe(1);
    expect(centered.admitted).toBeCloseTo((3/5.25)**2,12);
    const smallBeam=sample({objective:20,magnification:12,pupil:6},0);
    expect(smallBeam.admitted).toBe(1);expect(smallBeam.eyeFill).toBeCloseTo((20/12/6)**2,12);
  });
  it('matches the existing exit-pupil configuration and exact matched diameter',()=>{
    const matched={objective:24,magnification:8,pupil:3};
    const centered=sample(matched,0);expect(centered.admitted).toBe(1);expect(centered.eyeFill).toBe(1);
    expect(sample(matched,3).area).toBe(0);
    expect(sample({objective:42,magnification:12,pupil:3},0).beam*2).toBe(3.5);
  });
});
