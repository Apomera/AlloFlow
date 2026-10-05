import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync('stem_lab/stem_tool_bridgelab.js', 'utf8');
const sandbox = { window: { StemLab: { registerTool() {} } }, console };
vm.runInNewContext(source.replace("window.StemLab.registerTool('bridgeLab', {", `
  window.seismicModel = { bridgeSeismicPowerHistory, bridgeComparisonPercentText, bridgeRecordedNumberText, bridgeSeismicResponse, bridgeSeismicSample, bridgeSeismicEnergyInterval, bridgeSeismicEnergyQuestions, bridgeSeismicEnergyQuestionId, bridgeSeismicIntervalBudget, bridgeSeismicForces, bridgeSeismicForceFrame, bridgeSeismicOrbitFrame, bridgeSeismicOrbitLimit, bridgeSeismicOrbitChart, bridgeSeismicOrbitTrail, bridgeSeismicTrials, bridgeSeismicInvestigation, bridgeSeismicTimeline, bridgeSeismicComparison, bridgeSeismicScanPoint, bridgeSeismicScanSummary, BRIDGE_RESPONSE_ARCHETYPES };
  window.StemLab.registerTool('bridgeLab', {`), sandbox);
const { bridgeSeismicResponse: response, bridgeSeismicSample: sample, BRIDGE_RESPONSE_ARCHETYPES: archetypes } = sandbox.window.seismicModel;

describe('Bridge Lab illustrative seismic response', () => {
  it('rate history clips fractional endpoints, orders shading chronologically and preserves recorded totals',()=>{
    const h=sandbox.window.seismicModel,r=response(),before=JSON.stringify(r),a=h.bridgeSeismicPowerHistory(r,6.123,10.456),b=h.bridgeSeismicPowerHistory(r,10.456,6.123),q=h.bridgeSeismicEnergyInterval(r,6.123,10.456);
    expect(a.interval.startTimeS).toBe(6.123);expect(a.interval.endTimeS).toBe(10.456);expect(a.rangeWPerKg).toBe(b.rangeWPerKg);expect(a.curves.map(c=>c.line)).toEqual(b.curves.map(c=>c.line));expect(a.curves.map(c=>c.areas)).toEqual(b.curves.map(c=>c.areas));
    expect(a.curves.map(c=>c.totalJPerKg)).toEqual([q.inputJPerKg,q.dissipatedJPerKg]);for(const curve of a.curves){expect(curve.pinValueWPerKg).toBe(sample(r,6.123)[curve.field]);expect(curve.inspectedValueWPerKg).toBe(sample(r,10.456)[curve.field]);expect(curve.pinValueWPerKg).toBe(b.curves.find(c=>c.id===curve.id).inspectedValueWPerKg);for(const area of curve.areas){expect(area.startTimeS).toBeGreaterThanOrEqual(6.123);expect(area.endTimeS).toBeLessThanOrEqual(10.456);expect(area.endTimeS).toBeGreaterThan(area.startTimeS);expect(area.vertices.every(p=>area.sign*p.value>=0)).toBe(true);expect(area.path).not.toMatch(/NaN|Infinity/);}}
    expect(JSON.stringify(r)).toBe(before);expect(h.bridgeSeismicPowerHistory(null,0,1)).toBeNull();
  });
  it('rate history detail fits fractional and short windows on a shared A/B scale without changing totals',()=>{
    const h=sandbox.window.seismicModel,a=response(),b=response({dampingRatio:0.2}),q=h.bridgeSeismicPowerHistory(a,6.123,10.456,b,true),other=h.bridgeSeismicPowerHistory(b,10.456,6.123,a,true),event=h.bridgeSeismicPowerHistory(a,6.123,10.456,b);
    expect(q.detail).toBe(true);expect(q.plotStartTimeS).toBe(6.123);expect(q.plotEndTimeS).toBe(10.456);expect(q.startX).toBe(12);expect(q.endX).toBe(288);expect(q.shakingEndX).toBeNull();expect(q.rangeWPerKg).toBe(other.rangeWPerKg);expect(q.curves.map(c=>c.totalJPerKg)).toEqual(event.curves.map(c=>c.totalJPerKg));for(const curve of q.curves){expect(curve.plottedPoints[0].timeS).toBe(6.123);expect(curve.plottedPoints.at(-1).timeS).toBe(10.456);expect(curve.plottedPoints.length).toBeLessThan(curve.points.length);for(const coordinate of curve.line.split(' ')){const [x,y]=coordinate.split(',').map(Number);expect(x).toBeGreaterThanOrEqual(12);expect(x).toBeLessThanOrEqual(288);expect(y).toBeGreaterThanOrEqual(12);expect(y).toBeLessThanOrEqual(124);}}
    const window=h.bridgeSeismicEnergyQuestions(a).returning,small=h.bridgeSeismicPowerHistory(a,window.startTimeS,window.endTimeS,null,true);expect(small.rangeWPerKg).toBeLessThan(event.rangeWPerKg);expect(Math.abs(small.curves[0].pinX-small.curves[0].inspectedX)).toBe(276);expect(small.curves[0].areas.some(area=>area.sign<0)).toBe(true);
    const zero=h.bridgeSeismicPowerHistory(a,7.217,7.217,b,true);expect(zero.detail).toBe(false);expect(zero.plotStartTimeS).toBe(0);expect(zero.plotEndTimeS).toBe(24);expect(zero.curves.every(c=>c.areas.length===0)).toBe(true);
  });
  it('rate history splits signed shading at an interpolated zero without converting net work into gross input',()=>{
    const point=(timeS,inputPowerWPerKg,inputJPerKg)=>({timeS,inputPowerWPerKg,dampingPowerWPerKg:1,inputJPerKg,dissipatedJPerKg:timeS,kineticJPerKg:0,strainJPerKg:0,storedJPerKg:0});
    const synthetic={durationS:24,shakingDurationS:16,samples:[point(0,2,0),point(24,-2,0)]},q=sandbox.window.seismicModel.bridgeSeismicPowerHistory(synthetic,6,18),input=q.curves[0],loss=q.curves[1];
    expect(input.areas.map(a=>a.sign)).toEqual([1,-1]);expect(input.areas.map(a=>[a.startTimeS,a.endTimeS])).toEqual([[6,12],[12,18]]);expect(input.areas[0].vertices.at(-1)).toEqual({timeS:12,value:0});expect(input.totalJPerKg).toBe(0);expect(loss.areas.map(a=>a.sign)).toEqual([1]);expect(loss.totalJPerKg).toBe(12);
    // A zero crossing can round to either endpoint. Keep every positive span,
    // while excluding zero-duration polygons without a numerical cutoff.
    for (const [start, end, expectedSign] of [[1e-30, -1, -1], [1, -1e-30, 1]]) {
      const fixture={durationS:24,shakingDurationS:16,samples:[point(1,start,0),point(2,end,0)]};
      for(const detail of [false,true]) {
        const curve=sandbox.window.seismicModel.bridgeSeismicPowerHistory(fixture,1,2,null,detail).curves[0];
        expect(curve.areas).toHaveLength(1);expect(curve.areas[0].sign).toBe(expectedSign);
        expect(curve.areas[0].startTimeS).toBe(1);expect(curve.areas[0].endTimeS).toBe(2);
        expect(curve.intervalPoints.map(p=>p.value)).toEqual([start,end]);
        expect(curve.totalJPerKg).toBe(0);
      }
    }
  });
  it('rate history uses event bounds from both trials before a zero fallback and scales power quadratically',()=>{
    const h=sandbox.window.seismicModel,a=response({intensityG:0.12}),tiny=response({intensityG:0.000001}),zero=response({intensityG:0}),ratio=0.000001/0.12,ordinary=h.bridgeSeismicPowerHistory(a,7.217,12.319),small=h.bridgeSeismicPowerHistory(tiny,7.217,12.319);
    expect(small.rangeWPerKg/ordinary.rangeWPerKg).toBeCloseTo(ratio*ratio,18);expect(small.rangeWPerKg).toBeLessThan(0.001);for(const [index,curve] of small.curves.entries())for(let i=0;i<curve.points.length;i+=37)expect(curve.points[i].value/small.rangeWPerKg).toBeCloseTo(ordinary.curves[index].points[i].value/ordinary.rangeWPerKg,10);
    for(const [selected,other] of [[zero,tiny],[tiny,zero]])expect(h.bridgeSeismicPowerHistory(selected,0,24,other).rangeWPerKg).toBe(small.rangeWPerKg);for(const [selected,other] of [[a,tiny],[tiny,a]]){const q=h.bridgeSeismicPowerHistory(selected,16,24,other);expect(q.rangeWPerKg).toBe(ordinary.rangeWPerKg);expect(q.curves.every(c=>c.points.every(p=>Math.abs(p.value)<=q.rangeWPerKg))).toBe(true);}
    const empty=h.bridgeSeismicPowerHistory(zero,0,24,zero);expect(empty.maximumWPerKg).toBe(0);expect(empty.rangeWPerKg).toBeGreaterThan(0);expect(empty.curves.every(c=>c.areas.length===0&&c.totalJPerKg===0)).toBe(true);
  });
  it('rate history distinguishes coincident endpoints from a nonzero instantaneous rate',()=>{
    const q=sandbox.window.seismicModel.bridgeSeismicPowerHistory(response(),7.217,7.217);expect(q.interval.durationS).toBe(0);expect(q.startX).toBe(q.endX);expect(q.curves.every(c=>c.areas.length===0&&c.totalJPerKg===0)).toBe(true);expect(q.curves.some(c=>c.pinValueWPerKg!==0)).toBe(true);for(const c of q.curves){expect(c.pinValueWPerKg).toBe(c.inspectedValueWPerKg);expect(c.pinX).toBe(c.inspectedX);expect(c.pinY).toBe(c.inspectedY);}
  });
  it('rate history keeps settling, negative net work and zero damping consistent with accumulated history',()=>{
    const h=sandbox.window.seismicModel,r=response(),settling=h.bridgeSeismicPowerHistory(r,16,24),returning=h.bridgeSeismicEnergyQuestions(r).returning,negative=h.bridgeSeismicPowerHistory(r,returning.startTimeS,returning.endTimeS);
    expect(settling.curves[0].totalJPerKg).toBe(0);expect(settling.curves[0].areas).toHaveLength(0);expect(settling.curves[1].totalJPerKg).toBeGreaterThan(0);expect(settling.curves[1].areas.every(a=>a.sign===1)).toBe(true);expect(negative.curves[0].totalJPerKg).toBeLessThan(0);expect(negative.curves[0].areas.some(a=>a.sign===-1)).toBe(true);
    const undamped=h.bridgeSeismicPowerHistory(response({dampingRatio:0}),0,24);expect(undamped.curves[1].totalJPerKg).toBe(0);expect(undamped.curves[1].areas).toHaveLength(0);expect(undamped.curves[1].points.every(p=>p.value===0)).toBe(true);
  });
  it('comparison percent text preserves tiny signed changes while retaining true-zero and ordinary formatting',()=>{
    const f=sandbox.window.seismicModel.bridgeComparisonPercentText;expect(f(0)).toBe('0.0%');expect(f(-0)).toBe('0.0%');expect(f(0.0000025)).toBe('+2.50e-6%');expect(f(-0.0000025)).toBe('-2.50e-6%');expect(f(0.075)).toBe('+7.50e-2%');expect(f(-0.1)).toBe('-0.1%');expect(f(25)).toBe('+25.0%');
  });
  it('recorded number formatting preserves tiny signed values and distinguishes true zero',()=>{
    const format=sandbox.window.seismicModel.bridgeRecordedNumberText;
    expect(format(0)).toBe('0.000');expect(format(-0)).toBe('0.000');expect(format(0.0000025)).toBe('2.50e-6');expect(format(-0.0000025)).toBe('-2.50e-6');expect(format(1e-15)).toBe('1.00e-15');expect(format(-1e-15)).toBe('-1.00e-15');expect(format(0.001)).toBe('0.001');expect(format(-0.001)).toBe('-0.001');expect(format(2.37)).toBe('2.370');
  });
  it('notebook inspection metadata accepts only supported numeric pins and excludes cached answers',()=>{
    const validate=sandbox.window.seismicModel.bridgeSeismicInvestigation;
    const source=Object.freeze({version:'bridge-energy-investigation-v1',pinTimeS:7.217,answers:{input:999999},question:'fake'}),copy=validate(source);
    expect(copy).toEqual({version:'bridge-energy-investigation-v1',pinTimeS:7.217});expect(copy).not.toBe(source);expect(source.answers.input).toBe(999999);
    for(const pinTimeS of [0,24])expect(validate({version:source.version,pinTimeS})).toEqual({version:source.version,pinTimeS});
    for(const pinTimeS of [undefined,null,'16',true,-1,24.001,NaN,Infinity])expect(validate({version:source.version,pinTimeS})).toBeNull();
    for(const value of [null,undefined,{},[],{version:'future',pinTimeS:16}])expect(validate(value)).toBeNull();
  });
  it('guided energy windows retain the physical inputs and locate real exchange and removal intervals',()=>{
    const questions=sandbox.window.seismicModel.bridgeSeismicEnergyQuestions,id=sandbox.window.seismicModel.bridgeSeismicEnergyQuestionId;
    for(const mode of archetypes)for(const dampingRatio of [0,0.05,0.4]){
      const r=response({archetype:mode.id,dampingRatio}),settings=JSON.stringify(r.settings),q=questions(r);
      expect(q.shaking).toMatchObject({startTimeS:0,endTimeS:16});expect(q.settling).toMatchObject({startTimeS:16,endTimeS:24});
      expect(q.exchange.startTimeS).toBeGreaterThanOrEqual(16);expect(q.exchange.endTimeS).toBeGreaterThan(q.exchange.startTimeS);
      expect(Math.abs(sample(r,q.exchange.startTimeS).velocityMps)).toBeLessThan(1e-10);expect(Math.abs(sample(r,q.exchange.endTimeS).relativeM)).toBeLessThan(1e-10);
      if(q.returning)expect(sandbox.window.seismicModel.bridgeSeismicEnergyInterval(r,q.returning.startTimeS,q.returning.endTimeS).inputJPerKg).toBeLessThan(0);
      for(const [name,window] of Object.entries(q))if(window){expect(id(q,window.startTimeS,window.endTimeS)).toBe(name);expect(id(q,window.endTimeS,window.startTimeS)).toBe(name);}
      expect(id(q,7.217,12.319)).toBe('');expect(JSON.stringify(r.settings)).toBe(settings);
    }
    expect(questions(response()).returning).not.toBeNull();
  });
  it('zero shaking provides boundary questions while keeping nonexistent cycle and ground-removal windows unavailable',()=>{
    const q=sandbox.window.seismicModel.bridgeSeismicEnergyQuestions(response({intensityG:0}));
    expect(q.shaking.endTimeS).toBe(16);expect(q.settling.endTimeS).toBe(24);expect(q.exchange).toBeNull();expect(q.returning).toBeNull();
    expect(Object.values(sandbox.window.seismicModel.bridgeSeismicEnergyQuestions(null)).every(value=>value===null)).toBe(true);
  });
  it('signed energy budget accounts for initial energy, additions, dissipation and energy removed by ground on a shared scale',()=>{
    const helpers=sandbox.window.seismicModel,r=response(),other=response({dampingRatio:0.2});
    for(const window of Object.values(helpers.bridgeSeismicEnergyQuestions(r)).filter(Boolean)){
      const q=helpers.bridgeSeismicEnergyInterval(r,window.startTimeS,window.endTimeS),b=helpers.bridgeSeismicIntervalBudget(q);
      expect(b.availableJPerKg).toBeCloseTo(q.earlier.storedJPerKg+Math.max(0,q.inputJPerKg),12);
      expect(b.accountedJPerKg).toBeCloseTo(q.later.storedJPerKg+q.dissipatedJPerKg+Math.max(0,-q.inputJPerKg),12);
      expect(b.availableJPerKg-b.accountedJPerKg).toBeCloseTo(q.balanceErrorJPerKg,10);
      expect(b.addedJPerKg*b.returnedJPerKg).toBe(0);expect(b.returnedJPerKg).toBe(Math.max(0,-q.inputJPerKg));
      expect(b.scaleJPerKg).toBeGreaterThanOrEqual(Math.max(b.availableJPerKg,b.accountedJPerKg));
      const p=helpers.bridgeSeismicEnergyInterval(other,window.startTimeS,window.endTimeS);
      expect(helpers.bridgeSeismicIntervalBudget(q,p).scaleJPerKg).toBe(helpers.bridgeSeismicIntervalBudget(p,q).scaleJPerKg);
    }
    const zero=helpers.bridgeSeismicIntervalBudget(helpers.bridgeSeismicEnergyInterval(response({intensityG:0}),16,24));
    expect(zero.availableJPerKg+zero.accountedJPerKg).toBe(0);expect(zero.scaleJPerKg).toBeGreaterThan(0);
  });
  const interval=sandbox.window.seismicModel.bridgeSeismicEnergyInterval;
  it('interval accounting preserves work-energy balance for interpolated endpoints across modes and damping',()=>{
    for(const mode of archetypes)for(const dampingRatio of [0,0.05,0.4]){
      const r=response({archetype:mode.id,dampingRatio,intensityG:0.5,groundFrequencyHz:mode.naturalFrequencyHz});
      for(const [a,b] of [[0,7.217],[7.217,12.319],[15.913,16.127],[16,23.817]]){
        const q=interval(r,a,b), first=sample(r,a),last=sample(r,b);
        expect(q.inputJPerKg).toBeCloseTo(last.inputJPerKg-first.inputJPerKg,12);
        expect(q.dissipatedJPerKg).toBeGreaterThanOrEqual(0);
        expect(q.kineticChangeJPerKg+q.elasticChangeJPerKg).toBeCloseTo(q.storedChangeJPerKg,10);
        expect(q.balanceErrorJPerKg).toBeCloseTo(last.energyBalanceErrorJPerKg-first.energyBalanceErrorJPerKg,9);
        expect(Math.abs(q.balanceErrorJPerKg)).toBeLessThan(1e-5*Math.max(1,r.peaks.storedJPerKg));
      }
    }
  });
  it('free-vibration intervals transfer stored energy into damping loss with no further input',()=>{
    const r=response({dampingRatio:0.2});const q=interval(r,16,21.317);
    expect(q.inputJPerKg).toBe(0);expect(q.storedChangeJPerKg).toBeLessThan(0);expect(q.dissipatedJPerKg).toBeGreaterThan(0);
    expect(q.dissipatedJPerKg).toBeCloseTo(-q.storedChangeJPerKg,8);
  });
  it('undamped free vibration exchanges kinetic and elastic energy without damping loss',()=>{
    const r=response({dampingRatio:0}),q=interval(r,16.137,16.419);
    expect(q.inputJPerKg).toBe(0);expect(q.dissipatedJPerKg).toBe(0);
    expect(Math.abs(q.kineticChangeJPerKg)).toBeGreaterThan(0.01);
    expect(q.kineticChangeJPerKg).toBeCloseTo(-q.elasticChangeJPerKg,6);
  });
  it('intervals order time chronologically and return no changes for equal frames',()=>{
    const r=response(),forward=interval(r,7.217,18.319),reverse=interval(r,18.319,7.217);
    for(const key of ['startTimeS','endTimeS','durationS','inputJPerKg','dissipatedJPerKg','storedChangeJPerKg','balanceErrorJPerKg'])expect(reverse[key]).toBe(forward[key]);
    expect(reverse.pinTimeS).toBe(18.319);expect(reverse.frameTimeS).toBe(7.217);
    const zero=interval(r,7.217,7.217);for(const key of ['durationS','inputJPerKg','dissipatedJPerKg','kineticChangeJPerKg','elasticChangeJPerKg','storedChangeJPerKg','balanceErrorJPerKg'])expect(zero[key]).toBe(0);
  });
  it('intervals clamp or reject malformed times consistently with replay sampling and support zero shaking',()=>{
    const r=response({intensityG:0});expect(interval(null,0,1)).toBeNull();
    const q=interval(r,-4,99);expect(q.startTimeS).toBe(0);expect(q.endTimeS).toBe(24);
    expect(q.inputJPerKg+q.dissipatedJPerKg+q.storedChangeJPerKg).toBe(0);
    for(const bad of [NaN,Infinity,undefined,null,'',{},[]])expect(interval(r,bad,7.217).pinTimeS).toBe(0);
  });
  it('negative interval input work is retained rather than converted into energy added',()=>{
    const r=response({dampingRatio:0.05});let negative=null;
    for(let i=1;i<r.samples.length && r.samples[i].timeS<16;i++){
      const q=interval(r,r.samples[i-1].timeS,r.samples[i].timeS);if(q.inputJPerKg < -1e-5){negative=q;break;}
    }
    expect(negative).not.toBeNull();expect(negative.storedChangeJPerKg).toBeLessThan(0);
    expect(negative.inputJPerKg-negative.dissipatedJPerKg).toBeCloseTo(negative.storedChangeJPerKg,7);
  });
  it('force lens preserves Newton balance and bounds every force across the complete event', () => {
    const frame = sandbox.window.seismicModel.bridgeSeismicForceFrame;
    for (const mode of archetypes) for (const dampingRatio of [0, 0.05, 0.4]) {
      const r = response({archetype:mode.id, dampingRatio, intensityG:0.5, groundFrequencyHz:mode.naturalFrequencyHz});
      const limit = frame(r, sample(r,0)).limitNPerKg;
      for (let time=0; time<=24; time+=0.137) {
        const p=sample(r,time), f=frame(r,p);
        expect(f.netNPerKg).toBeCloseTo(p.absoluteAccelerationMps2,9);
        expect(f.limitNPerKg).toBe(limit);
        for (const value of [f.springNPerKg,f.dampingNPerKg,f.netNPerKg]) expect(Math.abs(value)).toBeLessThanOrEqual(limit);
        expect(f.springNPerKg*p.relativeM).toBeLessThanOrEqual(0);
        expect(f.dampingNPerKg*p.velocityMps).toBeLessThanOrEqual(0);
        expect(f.dampingPowerWPerKg).toBeCloseTo(2*dampingRatio*2*Math.PI*r.naturalFrequencyHz*p.velocityMps**2,10);
      }
      for (const p of r.samples.filter((_,i)=>i%37===0)) expect(frame(r,p).dampingPowerWPerKg).toBeCloseTo(p.dampingPowerWPerKg,10);
    }
  });
  it('force lens shares the same scale when exchanging A/B and inspecting different moments', () => {
    const frame=sandbox.window.seismicModel.bridgeSeismicForceFrame;
    const a=response({archetype:'flexible',dampingRatio:0.05}), b=response({archetype:'stiff',dampingRatio:0.2});
    const limit=frame(a,sample(a,0),b).limitNPerKg;
    for (const time of [0,7.217,16,24]) {
      expect(frame(a,sample(a,time),b).limitNPerKg).toBe(limit);
      expect(frame(b,sample(b,time),a).limitNPerKg).toBe(limit);
    }
  });
  it('force lens separates a stretched spring at rest from viscous damping and supports no shaking', () => {
    const frame=sandbox.window.seismicModel.bridgeSeismicForceFrame, r=response({dampingRatio:0.2});
    const f=frame(r,{relativeM:0.03,velocityMps:0});
    expect(f.springNPerKg).toBeLessThan(0); expect(Math.abs(f.dampingNPerKg)).toBe(0); expect(Math.abs(f.dampingPowerWPerKg)).toBe(0);
    const zero=response({intensityG:0});
    for (const time of [0,7.217,16,24]) {
      const p=frame(zero,sample(zero,time));
      expect(Math.abs(p.springNPerKg)+Math.abs(p.dampingNPerKg)+Math.abs(p.netNPerKg)).toBe(0);
      expect(p.limitNPerKg).toBeGreaterThan(0);
    }
  });
  it('reports power consistent with the equation of motion across modes and damping settings', () => {
    for (const archetype of archetypes) for (const dampingRatio of [0, 0.05, 0.4]) {
      const result = response({ archetype: archetype.id, dampingRatio, intensityG: 0.5, groundFrequencyHz: 3 });
      const omega = 2 * Math.PI * result.naturalFrequencyHz;
      for (const p of result.samples.filter((_, i) => i % 37 === 0)) {
        expect(p.inputPowerWPerKg).toBeCloseTo(-p.groundAccelerationMps2 * p.velocityMps, 10);
        expect(p.dampingPowerWPerKg).toBeCloseTo(2 * dampingRatio * omega * p.velocityMps ** 2, 10);
        expect(p.elasticPowerWPerKg).toBeCloseTo(omega ** 2 * p.relativeM * p.velocityMps, 10);
        expect(p.kineticPowerWPerKg).toBeCloseTo(p.velocityMps * p.relativeAccelerationMps2, 10);
        expect(p.kineticPowerWPerKg + p.elasticPowerWPerKg).toBeCloseTo(p.storedPowerWPerKg, 10);
        expect(p.inputPowerWPerKg - p.dampingPowerWPerKg).toBeCloseTo(p.storedPowerWPerKg, 10);
        expect(p.dampingPowerWPerKg).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('matches power to independently differenced energy histories', () => {
    const r = response({ dampingRatio: 0.05, groundFrequencyHz: 1.1 });
    for (const time of [5, 7, 12, 17]) {
      const i = Math.round(time / r.sampleStepS);
      for (const [energy, rate] of [['kineticJPerKg', 'kineticPowerWPerKg'], ['strainJPerKg', 'elasticPowerWPerKg'],
        ['storedJPerKg', 'storedPowerWPerKg'], ['dissipatedJPerKg', 'dampingPowerWPerKg'], ['inputJPerKg', 'inputPowerWPerKg']]) {
        const slope = (r.samples[i-2][energy] - 8*r.samples[i-1][energy] + 8*r.samples[i+1][energy] - r.samples[i+2][energy]) / (12*r.sampleStepS);
        expect(Math.abs(slope - r.samples[i][rate]), energy + ' at ' + time).toBeLessThan(0.0002 * Math.max(1, Math.abs(r.samples[i][rate])));
      }
    }
  });

  it('preserves the power balance between stored samples and during negative input work', () => {
    const r = response({ dampingRatio: 0.05 });
    const returning = r.samples.find(p => p.inputPowerWPerKg < -0.001);
    expect(returning).toBeTruthy();
    expect(returning.storedPowerWPerKg).toBeLessThan(0);
    for (const time of [0.0123, 7.217, 15.99, 16.01, 23.999]) {
      const p = sample(r, time);
      expect(p.kineticPowerWPerKg + p.elasticPowerWPerKg).toBeCloseTo(p.storedPowerWPerKg, 12);
      expect(p.inputPowerWPerKg - p.dampingPowerWPerKg).toBeCloseTo(p.storedPowerWPerKg, 12);
      expect(p.dampingPowerWPerKg).toBeGreaterThanOrEqual(0);
    }
  });

  it('retains internal energy exchange with no damping after input work ends', () => {
    const points = response({ dampingRatio: 0 }).samples.filter(p => p.timeS >= 16);
    expect(points.some(p => p.elasticPowerWPerKg > 0.001)).toBe(true);
    expect(points.some(p => p.elasticPowerWPerKg < -0.001)).toBe(true);
    for (const p of points) {
      expect(p.inputPowerWPerKg).toBe(0);
      expect(p.dampingPowerWPerKg).toBe(0);
      expect(p.storedPowerWPerKg).toBe(0);
      expect(p.kineticPowerWPerKg).toBe(-p.elasticPowerWPerKg);
    }
  });

  it('keeps zero-input power exactly zero and scales rates quadratically with shaking amplitude', () => {
    const a=response({ intensityG: 0.1 }), b=response({ intensityG: 0.2 }), zero=response({ intensityG: 0 });
    const fields=['inputPowerWPerKg','dampingPowerWPerKg','elasticPowerWPerKg','kineticPowerWPerKg','storedPowerWPerKg'];
    for (const p of zero.samples) for (const key of fields) expect(p[key]).toBe(0);
    for (const i of [301, 487, 799, 1103]) for (const key of fields) expect(b.samples[i][key]).toBeCloseTo(a.samples[i][key] * 4, 12);
  });

  it('scans the same complete response model without mutating fixed inputs or retaining histories', () => {
    const settings = { archetype: 'balanced', intensityG: 0.12, dampingRatio: 0.05 };
    for (const frequencyHz of [0.2, 1.1, 3]) {
      const point = sandbox.window.seismicModel.bridgeSeismicScanPoint(settings, frequencyHz);
      const full = response({ ...settings, groundFrequencyHz: frequencyHz });
      expect(point).toEqual({ frequencyHz, relativeCm: full.peaks.relativeM * 100,
        accelerationG: full.peaks.absoluteAccelerationMps2 / 9.80665,
        motionTimeS: full.milestones.peakMotionS, accelerationTimeS: full.milestones.peakAccelerationS });
      expect(full.peaks.groundAccelerationMps2 / 9.80665).toBeCloseTo(0.12, 3);
      expect(Object.values(point).every(Number.isFinite)).toBe(true);
      expect(point.motionTimeS).toBeGreaterThanOrEqual(0);
      expect(point.accelerationTimeS).toBeLessThanOrEqual(24);
    }
    expect(settings).toEqual({ archetype: 'balanced', intensityG: 0.12, dampingRatio: 0.05 });
  });

  it('distinguishes frequency and damping effects under the same ground acceleration', () => {
    const point = (frequencyHz, dampingRatio = 0.05) => sandbox.window.seismicModel.bridgeSeismicScanPoint({
      archetype: 'balanced', intensityG: 0.12, dampingRatio }, frequencyHz);
    const near = point(1.1), far = point(3), damped = point(1.1, 0.2);
    expect(near.relativeCm).toBeGreaterThan(far.relativeCm);
    expect(near.accelerationG).toBeGreaterThan(far.accelerationG);
    expect(damped.relativeCm).toBeLessThan(near.relativeCm);
    expect(damped.accelerationG).toBeLessThan(near.accelerationG);
  });

  it('selects maxima by measure, maps actual frequency spacing, and keeps zero-input curves finite', () => {
    const summary = sandbox.window.seismicModel.bridgeSeismicScanSummary;
    const rows = [{ frequencyHz: 0.2, relativeCm: 2, accelerationG: 0.8 },
      { frequencyHz: 1.1, relativeCm: 4, accelerationG: 0.5 }, { frequencyHz: 3, relativeCm: 1, accelerationG: 0.2 }];
    const motion = summary(rows, 'relative'), acceleration = summary(rows, 'acceleration');
    expect(motion.bestIndex).toBe(1);
    expect(acceleration.bestIndex).toBe(0);
    expect(motion.unit).toBe('cm');
    expect(acceleration.unit).toBe('g');
    expect(motion.x(0.2)).toBe(0);
    expect(motion.x(3)).toBe(600);
    expect(motion.x(1.1)).toBeCloseTo(600 * 0.9 / 2.8);
    expect(motion.y(0)).toBe(172);
    expect(motion.y(4)).toBeGreaterThan(8);
    for (const input of [[], rows.map(row => ({ ...row, relativeCm: 0, accelerationG: 0 }))]) {
      for (const measure of ['relative', 'acceleration', 'constructor']) {
        const chart = summary(input, measure);
        expect(chart.maximum).toBe(0);
        expect(chart.bestIndex).toBe(0);
        expect(chart.scale).toBeGreaterThan(0);
        expect(chart.points).not.toMatch(/NaN|Infinity/);
      }
    }
  });

  it('compares both histories on one scale with correct displacement, acceleration, and energy units', () => {
    const reference = response({ intensityG: 0.1 }), current = response({ intensityG: 0.2 });
    for (const [measure, factor, unit, field] of [
      ['relative', 2, 'cm', 'relativeM'], ['acceleration', 2, 'g', 'absoluteAccelerationMps2'], ['stored', 4, 'J/kg', 'storedJPerKg']
    ]) {
      const chart = sandbox.window.seismicModel.bridgeSeismicComparison(reference, current, measure);
      const reversed = sandbox.window.seismicModel.bridgeSeismicComparison(current, reference, measure);
      expect(chart.limit).toBe(reversed.limit);
      expect(chart.reference).toBe(reversed.current);
      expect(chart.current).toBe(reversed.reference);
      expect(chart.metric.unit).toBe(unit);
      const index = 480, origin = chart.metric.positive ? 172 : 90;
      const a = chart.reference.split(' ')[index].split(',').map(Number);
      const b = chart.current.split(' ')[index].split(',').map(Number);
      expect(a[0]).toBe(b[0]);
      expect(b[1] - origin).toBeCloseTo((a[1] - origin) * factor, 1);
      expect(b[1]).toBeCloseTo(chart.y(current.samples[index][field] * (unit === 'g' ? 1 / 9.80665 : unit === 'cm' ? 100 : 1)), 2);
      expect(chart.current.split(' ').at(-1).split(',')[0]).toBe('600.00');
    }
  });

  it('keeps zero-input comparisons finite and uses a supported measure for malformed chart settings', () => {
    const zero = response({ intensityG: 0 });
    for (const measure of ['relative', 'acceleration', 'stored', '__proto__', 'constructor', null]) {
      const chart = sandbox.window.seismicModel.bridgeSeismicComparison(zero, zero, measure);
      expect(chart.limit).toBeGreaterThan(0);
      expect(chart.reference).toBe(chart.current);
      expect(chart.current).not.toMatch(/NaN|Infinity/);
    }
  });

  it('draws energy bands with thickness proportional to each contribution and a matching work boundary', () => {
    const result = response();
    const chart = sandbox.window.seismicModel.bridgeSeismicTimeline(result, 'energy');
    const points = value => value.split(' ').map(pair => pair.split(',').map(Number));
    const kinetic = points(chart.kinetic), elastic = points(chart.elastic), dissipated = points(chart.dissipated), input = points(chart.input);
    const count = result.samples.length;
    for (const index of [0, 321, 600, 960, count - 1]) {
      const point = result.samples[index], bottom = count * 2 - 1 - index;
      expect(kinetic[index][0]).toBeCloseTo(point.timeS / 24 * 600, 2);
      expect(kinetic[bottom][1] - kinetic[index][1]).toBeCloseTo(point.kineticJPerKg / chart.limit * 164, 1);
      expect(elastic[bottom][1] - elastic[index][1]).toBeCloseTo(point.strainJPerKg / chart.limit * 164, 1);
      expect(dissipated[bottom][1] - dissipated[index][1]).toBeCloseTo(point.dissipatedJPerKg / chart.limit * 164, 1);
      expect(input[index][1]).toBeCloseTo(dissipated[index][1], 1);
    }
    expect(input.at(-1)[0]).toBe(600);
    expect([...kinetic, ...elastic, ...dissipated, ...input].every(([x, y]) => x >= 0 && x <= 600 && y >= 0 && y <= 180)).toBe(true);
  });

  it('keeps both timeline scales finite at zero input and plots ground and deck on the same motion scale', () => {
    const zero = response({ intensityG: 0 });
    for (const kind of ['motion', 'energy']) {
      const chart = sandbox.window.seismicModel.bridgeSeismicTimeline(zero, kind);
      expect(chart.limit).toBeGreaterThan(0);
      expect(JSON.stringify(chart)).not.toMatch(/NaN|Infinity/);
    }
    const result = response({ archetype: 'flexible', groundFrequencyHz: 0.65 });
    const chart = sandbox.window.seismicModel.bridgeSeismicTimeline(result, 'motion');
    const index = 400, point = result.samples[index];
    const ground = chart.ground.split(' ')[index].split(',').map(Number);
    const deck = chart.deck.split(' ')[index].split(',').map(Number);
    expect(ground[0]).toBe(deck[0]);
    expect(deck[1] - ground[1]).toBeCloseTo(-point.relativeM * 100 / chart.limit * 82, 1);
  });

  it('locates inspectable peak frames and keeps force directions consistent with the motion equation', () => {
    const result = response();
    const peak = sample(result, result.milestones.peakMotionS);
    expect(Math.abs(peak.relativeM)).toBeGreaterThan(result.peaks.relativeM * 0.999);
    const acceleration = sample(result, result.milestones.peakAccelerationS);
    expect(Math.abs(acceleration.absoluteAccelerationMps2)).toBeGreaterThan(result.peaks.absoluteAccelerationMps2 * 0.999);
    expect(result.milestones.freeVibrationS).toBe(16);
    for (const time of [0, 3.4, 7.2, 12, 16, 20]) {
      const point = sample(result, time);
      const forces = sandbox.window.seismicModel.bridgeSeismicForces(result, point);
      expect(forces.springNPerKg + forces.dampingNPerKg).toBeCloseTo(point.absoluteAccelerationMps2, 10);
      expect(forces.springNPerKg * point.relativeM).toBeLessThanOrEqual(0);
      expect(forces.dampingNPerKg * point.velocityMps).toBeLessThanOrEqual(0);
    }
    const zero = response({ intensityG: 0 });
    expect(zero.milestones).toEqual({ peakMotionS: 0, peakAccelerationS: 0, freeVibrationS: 16 });
    const undamped = response({ dampingRatio: 0 });
    expect(Math.abs(sandbox.window.seismicModel.bridgeSeismicForces(undamped, sample(undamped, 7)).dampingNPerKg)).toBe(0);
  });

  it('accepts only complete supported saved inputs without replacing corrupt values with defaults', () => {
    const valid = { version: 'bridge-seismic-v1', inputs: response().settings, timeS: 7.2 };
    const records = [valid, { ...valid, version: 'future' }, { ...valid, inputs: {} },
      { ...valid, timeS: Infinity }, { ...valid, inputs: { ...valid.inputs, intensityG: -1 } }, null];
    expect(sandbox.window.seismicModel.bridgeSeismicTrials(records)).toEqual([valid]);
    expect(records).toHaveLength(6);
    expect(sandbox.window.seismicModel.bridgeSeismicTrials(Array(8).fill(valid))).toHaveLength(4);
    expect(sandbox.window.seismicModel.bridgeSeismicTrials('damaged')).toEqual([]);
  });

  it('starts at rest, uses a finite coherent ground packet, and continues through free decay', () => {
    const result = response();
    expect(result.settings).toEqual({ archetype: 'balanced', groundFrequencyHz: 1.1, intensityG: 0.12, dampingRatio: 0.05 });
    expect(result).toMatchObject({ durationS: 24, shakingDurationS: 16, sampleStepS: 1 / 60, integrationStepS: 1 / 240 });
    expect(result.samples).toHaveLength(1441);
    expect(result.samples[0]).toMatchObject({ timeS: 0, relativeM: 0, velocityMps: 0, groundM: 0,
      groundAccelerationMps2: 0, inputJPerKg: 0, dissipatedJPerKg: 0 });
    for (const point of result.samples.filter(point => point.timeS >= 16)) {
      expect(point.groundM).toBe(0);
      expect(point.groundVelocityMps).toBe(0);
      expect(point.groundAccelerationMps2).toBe(0);
    }
    expect(result.peaks.groundAccelerationMps2).toBeCloseTo(0.12 * 9.80665, 10);
    expect(Math.abs(sample(result, 16).relativeM)).toBeGreaterThan(0);
    expect(result.energyConvention).toContain('Relative modal energy');
    expect(result.model).toContain('synthetic');
  });

  it('preserves exact zero motion and zero energy at zero intensity', () => {
    const result = response({ intensityG: 0 });
    for (const point of result.samples) {
      for (const [key, value] of Object.entries(point)) if (key !== 'timeS') expect(value, key).toBe(0);
    }
    expect(Object.values(result.peaks).every(value => value === 0)).toBe(true);
    expect(result.energyBalanceError).toBe(0);
  });

  it('scales displacement and acceleration linearly and energies quadratically with intensity', () => {
    const single = response({ groundFrequencyHz: 0.75, intensityG: 0.1, dampingRatio: 0.08 });
    const double = response({ groundFrequencyHz: 0.75, intensityG: 0.2, dampingRatio: 0.08 });
    for (let index = 0; index < single.samples.length; index += 17) {
      for (const key of ['groundM', 'relativeM', 'velocityMps', 'absoluteM', 'absoluteAccelerationMps2']) {
        expect(double.samples[index][key], key).toBeCloseTo(2 * single.samples[index][key], 10);
      }
      for (const key of ['kineticJPerKg', 'strainJPerKg', 'storedJPerKg', 'dissipatedJPerKg', 'inputJPerKg']) {
        expect(double.samples[index][key], key).toBeCloseTo(4 * single.samples[index][key], 10);
      }
    }
  });

  it.each([0, 0.05, 0.4])('balances independently integrated work and energy with damping ratio %s', dampingRatio => {
    const result = response({ archetype: 'stiff', groundFrequencyHz: 1.8, intensityG: 0.3, dampingRatio });
    let priorDissipation = 0;
    for (const point of result.samples) {
      expect(point.kineticJPerKg).toBeGreaterThanOrEqual(0);
      expect(point.strainJPerKg).toBeGreaterThanOrEqual(0);
      expect(point.dissipatedJPerKg).toBeGreaterThanOrEqual(priorDissipation);
      expect(Math.abs(point.inputJPerKg - point.kineticJPerKg - point.strainJPerKg - point.dissipatedJPerKg))
        .toBeLessThan(2e-6 * Math.max(1, result.peaks.inputJPerKg));
      priorDissipation = point.dissipatedJPerKg;
    }
    if (dampingRatio === 0) {
      expect(result.peaks.dissipatedJPerKg).toBe(0);
      const stopped = sample(result, 16), final = sample(result, 24);
      expect(final.storedJPerKg / stopped.storedJPerKg).toBeCloseTo(1, 5);
    }
  });

  it('matches the analytical damped free-vibration solution after the shaking stops', () => {
    const result = response({ dampingRatio: 0.07, groundFrequencyHz: 1.1 });
    const initial = sample(result, 16);
    const omega = 2 * Math.PI * result.naturalFrequencyHz;
    const zeta = result.settings.dampingRatio;
    const omegaD = omega * Math.sqrt(1 - zeta ** 2);
    for (const elapsed of [0.5, 1, 2.5, 4, 8]) {
      const expected = Math.exp(-zeta * omega * elapsed) * (initial.relativeM * Math.cos(omegaD * elapsed)
        + (initial.velocityMps + zeta * omega * initial.relativeM) / omegaD * Math.sin(omegaD * elapsed));
      expect(sample(result, 16 + elapsed).relativeM).toBeCloseTo(expected, 7);
    }
  });

  it('shows stronger response near the assumed mode frequency for equal peak ground acceleration', () => {
    const low = response({ groundFrequencyHz: 0.45, dampingRatio: 0.03 });
    const matched = response({ groundFrequencyHz: 1.1, dampingRatio: 0.03 });
    const high = response({ groundFrequencyHz: 2.4, dampingRatio: 0.03 });
    expect(matched.frequencyRatio).toBe(1);
    expect(matched.peaks.relativeM).toBeGreaterThan(3 * low.peaks.relativeM);
    expect(matched.peaks.relativeM).toBeGreaterThan(3 * high.peaks.relativeM);
    expect(matched.peaks.groundAccelerationMps2).toBeCloseTo(low.peaks.groundAccelerationMps2, 10);
    expect(matched.peaks.groundAccelerationMps2).toBeCloseTo(high.peaks.groundAccelerationMps2, 10);
  });

  it('reduces resonant motion and remaining stored energy when damping is increased', () => {
    const low = response({ groundFrequencyHz: 1.1, dampingRatio: 0.02 });
    const high = response({ groundFrequencyHz: 1.1, dampingRatio: 0.25 });
    expect(high.peaks.relativeM).toBeLessThan(low.peaks.relativeM / 2);
    expect(sample(high, 24).storedJPerKg).toBeLessThan(sample(low, 24).storedJPerKg / 100);
    expect(sample(high, 24).dissipatedJPerKg / sample(high, 24).inputJPerKg).toBeGreaterThan(0.999);
  });

  it('uses consistent reference frames and differentiates the displayed ground displacement correctly', () => {
    const result = response({ groundFrequencyHz: 1.1 });
    const omega = 2 * Math.PI * result.naturalFrequencyHz;
    for (let index = 1; index < 960; index += 11) {
      const before = result.samples[index - 1], point = result.samples[index], after = result.samples[index + 1];
      const accelerationFromDisplacement = (after.groundM - 2 * point.groundM + before.groundM) / result.sampleStepS ** 2;
      expect(Math.abs(accelerationFromDisplacement - point.groundAccelerationMps2)).toBeLessThan(0.002 * result.peaks.groundAccelerationMps2);
      expect(point.absoluteM).toBeCloseTo(point.groundM + point.relativeM, 12);
      expect(point.absoluteVelocityMps).toBeCloseTo(point.groundVelocityMps + point.velocityMps, 12);
      expect(point.relativeAccelerationMps2 + point.groundAccelerationMps2).toBeCloseTo(point.absoluteAccelerationMps2, 12);
      expect(point.relativeAccelerationMps2 + 2 * result.settings.dampingRatio * omega * point.velocityMps
        + omega ** 2 * point.relativeM + point.groundAccelerationMps2).toBeCloseTo(0, 10);
    }
    expect(result.samples.some(point => point.inputPowerWPerKg < 0)).toBe(true);
  });

  it('normalizes corrupt inputs without mutation and remains finite at every control boundary', () => {
    const input = { archetype: 'suspension', groundFrequencyHz: Infinity, intensityG: -10, dampingRatio: '0.2' };
    const result = response(input);
    expect(result.settings).toEqual({ archetype: 'balanced', groundFrequencyHz: 1.1, intensityG: 0, dampingRatio: 0.2 });
    expect(input.groundFrequencyHz).toBe(Infinity);
    for (const archetype of archetypes) {
      for (const frequency of [0.2, 3]) {
        const bounded = response({ archetype: archetype.id, groundFrequencyHz: frequency, intensityG: 2, dampingRatio: 2 });
        expect(bounded.settings).toMatchObject({ intensityG: 0.5, dampingRatio: 0.4 });
        expect(bounded.naturalFrequencyHz).toBe(archetype.naturalFrequencyHz);
        expect(bounded.samples.every(point => Object.values(point).every(Number.isFinite))).toBe(true);
        expect(JSON.parse(JSON.stringify(bounded)).samples).toHaveLength(1441);
      }
    }
  });

  it('interpolates shared scene/readout samples and clamps invalid or out-of-range times', () => {
    const result = response();
    const first = result.samples[123], second = result.samples[124];
    const interpolated = sample(result, (first.timeS + second.timeS) / 2);
    for (const key of Object.keys(first)) expect(interpolated[key], key).toBeCloseTo((first[key] + second[key]) / 2, 12);
    expect(sample(result, -20)).toEqual(result.samples[0]);
    expect(sample(result, NaN)).toEqual(result.samples[0]);
    expect(sample(result, Infinity)).toEqual(result.samples[0]);
    expect(sample(result, 999)).toEqual(result.samples.at(-1));
    expect(sample(result, '8').timeS).toBe(8);
    expect(sample(null, 4)).toBeNull();
    expect(sample({ samples: [] }, 4)).toBeNull();
    expect(sample(result, 0)).not.toBe(result.samples[0]);
  });
});


describe('Bridge Lab energy orbit physics',()=>{
  const {bridgeSeismicOrbitFrame:frame,bridgeSeismicOrbitLimit:limit,bridgeSeismicOrbitChart:chart}=sandbox.window.seismicModel;
  it('maps the phase radius to relative modal kinetic plus elastic energy at stored samples',()=>{
    for(const mode of archetypes){const r=response({archetype:mode.id,dampingRatio:0.2});
      for(const p of r.samples.filter((_,i)=>i%23===0)){const f=frame(r,p);
        expect(f.kineticJPerKg).toBeCloseTo(p.kineticJPerKg,12);expect(f.elasticJPerKg).toBeCloseTo(p.strainJPerKg,12);
        expect(f.radiusMps**2/2).toBeCloseTo(p.storedJPerKg,12);expect(f.storedJPerKg).toBeCloseTo(f.kineticJPerKg+f.elasticJPerKg,12);
      }
    }
  });
  it('keeps a common finite scale for A/B and bounds every interpolated cursor',()=>{
    const a=response({archetype:'flexible',intensityG:0.5,dampingRatio:0}),b=response({archetype:'stiff',intensityG:0.5,dampingRatio:0.4});
    const range=limit(a,b);expect(limit(b,a)).toBe(range);
    for(const r of [a,b])for(let time=0;time<=24;time+=0.113){const f=frame(r,sample(r,time));expect(f.radiusMps).toBeLessThan(range);expect(f.storedJPerKg).toBeGreaterThanOrEqual(0);}
    const c=chart(a,range);expect(c.shaking).not.toMatch(/NaN|Infinity/);expect(c.free).not.toMatch(/NaN|Infinity/);
  });
  it('retains energy in the undamped free orbit and contracts with damping at integration samples',()=>{
    for(const dampingRatio of [0,0.05,0.2]){const r=response({dampingRatio});const start=frame(r,sample(r,16)).storedJPerKg;
      const points=r.samples.filter(p=>p.timeS>=16);
      for(let i=1;i<points.length;i++){const energy=frame(r,points[i]).storedJPerKg;
        if(dampingRatio===0)expect(Math.abs(energy-start)/Math.max(1,start)).toBeLessThan(1e-7);
        else expect(energy).toBeLessThanOrEqual(frame(r,points[i-1]).storedJPerKg+1e-10);
      }
      if(dampingRatio>0)expect(frame(r,sample(r,24)).storedJPerKg).toBeLessThan(start);
    }
  });
  it('locates sampled turning points and center crossings near an independent analytic free-vibration solution',()=>{
    for(const mode of archetypes)for(const dampingRatio of [0,0.05,0.4]){
      const r=response({archetype:mode.id,dampingRatio}),start=sample(r,16),w=2*Math.PI*r.naturalFrequencyHz,wd=w*Math.sqrt(1-dampingRatio**2),decay=dampingRatio*w;
      const a=start.relativeM,b=(start.velocityMps+decay*a)/wd,c=start.velocityMps,d=-decay*b-wd*a;
      const orbit=chart(r,limit(r));
      for(const [kind,first,second,field] of [['crossing',a,b,'relativeM'],['turning',c,d,'velocityMps']]){
        const rootAngle=(Math.atan2(-first,second)+Math.PI*4)%Math.PI;
        const expected=[];for(let angle=rootAngle;angle/wd<=8;angle+=Math.PI)expected.push(16+angle/wd);
        expect(orbit[kind]).toHaveLength(expected.length);
        orbit[kind].forEach((time,i)=>{expect(Math.abs(time-expected[i])).toBeLessThan(0.001);expect(Math.abs(sample(r,time)[field])).toBeLessThan(1e-10);expect(time).toBeGreaterThanOrEqual(16);expect(time).toBeLessThanOrEqual(24);});
      }
    }
  });
  it('has no fabricated cycle or energy with zero applied shaking',()=>{
    const r=response({intensityG:0}),c=chart(r,limit(r));expect(c.turning).toEqual([]);expect(c.crossing).toEqual([]);
    for(const time of [0,7.217,16,24]){const f=frame(r,sample(r,time));expect(f.radiusMps+f.storedJPerKg).toBe(0);}
    expect(c.free).not.toMatch(/NaN|Infinity/);expect(c.shaking).not.toMatch(/NaN|Infinity/);expect(limit(r)).toBeGreaterThan(0);
  });
});


describe('Bridge Lab recent orbit motion', () => {
  const { bridgeSeismicOrbitFrame: frame, bridgeSeismicOrbitLimit: limit,
    bridgeSeismicOrbitChart: chart, bridgeSeismicOrbitTrail: trail } = sandbox.window.seismicModel;
  it('uses only past recorded motion and ends at the exact interpolated replay point', () => {
    for (const mode of archetypes) {
      const r=response({archetype:mode.id,dampingRatio:0.2}), scale=limit(r), mapping=chart(r,scale);
      for (const time of [-5,0,0.003,7.217,16,24,99,NaN]) {
        const recent=trail(r,time,scale), p=sample(r,time);
        expect(recent.timeS).toBeCloseTo(p.timeS,12);
        expect(recent.startTimeS).toBeCloseTo(Math.max(0,p.timeS-1/r.naturalFrequencyHz),12);
        expect(recent.points.length).toBeLessThanOrEqual(95);
        for (let i=0;i<recent.points.length;i++) {
          const point=recent.points[i], actual=sample(r,point.timeS);
          expect(point.timeS).toBeGreaterThanOrEqual(recent.startTimeS-1e-12);
          expect(point.timeS).toBeLessThanOrEqual(p.timeS+1e-12);
          if(i)expect(point.timeS).toBeGreaterThanOrEqual(recent.points[i-1].timeS);
          expect(point.x).toBeCloseTo(mapping.x(2*Math.PI*r.naturalFrequencyHz*actual.relativeM),10);
          expect(point.y).toBeCloseTo(mapping.y(actual.velocityMps),10);
        }
        if(recent.points.length){expect(recent.points.at(-1).x).toBeCloseTo(mapping.x(frame(r,p).elasticMps),10);expect(recent.points.at(-1).y).toBeCloseTo(mapping.y(p.velocityMps),10);}
      }
    }
  });
  it('stitches the fading segments without a break or an invalid coordinate', () => {
    const r=response({dampingRatio:0.05}), recent=trail(r,7.217,limit(r));
    expect(recent.segments).toHaveLength(4);
    recent.segments.forEach((segment,i)=>{
      expect(segment.path).not.toMatch(/NaN|Infinity/);
      if(i){expect(segment.path.split(' ')[0]).toBe(recent.segments[i-1].path.split(' ').at(-1));expect(segment.opacity).toBeGreaterThan(recent.segments[i-1].opacity);}
    });
    const [first,last]=[recent.points[0],recent.points.at(-1)];
    expect(recent.segments[0].path.split(' ')[0]).toBe(first.x.toFixed(3)+','+first.y.toFixed(3));
    expect(recent.segments.at(-1).path.split(' ').at(-1)).toBe(last.x.toFixed(3)+','+last.y.toFixed(3));
  });
  it('points along the physical free-vibration phase direction using two past frames', () => {
    for(const mode of archetypes){const r=response({archetype:mode.id,groundFrequencyHz:mode.naturalFrequencyHz,dampingRatio:0});
      for(const time of [16.2,17.7,20.3,24]){
        const recent=trail(r,time,limit(r)), cue=recent.direction;
        expect(cue).not.toBeNull();expect(cue.timeS).toBeLessThan(recent.timeS);expect(cue.timeS).toBeGreaterThan(recent.startTimeS);
        const p=sample(r,cue.timeS-1/120), w=2*Math.PI*r.naturalFrequencyHz;
        const dx=w*p.velocityMps, dy=w*w*p.relativeM, norm=Math.hypot(dx,dy);
        expect((Math.cos(cue.angleRad)*dx+Math.sin(cue.angleRad)*dy)/norm).toBeGreaterThan(0.999);
        expect(cue.path).not.toMatch(/NaN|Infinity/);
      }
    }
  });
  it('shows no trail or direction at the start or with zero shaking', () => {
    const r=response(), zero=response({intensityG:0});
    expect(trail(r,0,limit(r))).toMatchObject({points:[],segments:[],direction:null});
    for(const time of [0,7.217,16,24])expect(trail(zero,time,limit(zero))).toMatchObject({points:[],segments:[],direction:null});
  });
  it('expresses composition as fractions of current stored energy with empty zero-energy fractions', () => {
    const r=response(), w=2*Math.PI*r.naturalFrequencyHz;
    for(const p of [{relativeM:0.02,velocityMps:0.4},{relativeM:0.02,velocityMps:0},{relativeM:0,velocityMps:0.4},{relativeM:0,velocityMps:0}]){
      const f=frame(r,p), kinetic=p.velocityMps**2/2, elastic=(w*p.relativeM)**2/2, stored=kinetic+elastic;
      expect(f.kineticFraction).toBeCloseTo(stored?kinetic/stored:0,12);
      expect(f.elasticFraction).toBeCloseTo(stored?elastic/stored:0,12);
      expect(f.kineticFraction+f.elasticFraction).toBeCloseTo(stored?1:0,12);
    }
  });
  it('leaves response samples immutable during repeated forward and backward inspection', () => {
    const r=response();r.samples.forEach(Object.freeze);Object.freeze(r.samples);Object.freeze(r.peaks);Object.freeze(r);
    const first=trail(r,7.217,limit(r));trail(r,20.7,limit(r));trail(r,0.05,limit(r));
    expect(trail(r,7.217,limit(r))).toEqual(first);
  });
});
