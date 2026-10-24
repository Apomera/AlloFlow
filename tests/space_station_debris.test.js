import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadTool, resetStemLab, React } from './helpers/stem_widgets_smoke_harness.js';

const source=readFileSync('stem_lab/stem_tool_spacestation.js','utf8');
const numberFn=source.slice(source.indexOf('  function issFlightNumber('),source.indexOf('  function issTransferPlan('));
const modelFn=source.slice(source.indexOf('  function issDebrisModel('),source.indexOf('  var _issRefOrbit'));
const {model,inspect,snapshot,compare,probe,tracers,sweep,pair,detector,overlap,scan,scanAxis,scanPosition,positionMark,positionSample,meanRadiusSquared,apertureStudy,apertureLayout,apertureView,flightSection,flightTime,velocity,budget,motion,materialPath,motionMark,motionReference,motionSteps}=new Function(numberFn+modelFn+'\nreturn {model:issDebrisModel,inspect:issDebrisInspect,snapshot:issDebrisSnapshot,compare:issDebrisComparison,probe:issDebrisProbe,tracers:issDebrisTracers,sweep:issDebrisSweep,pair:issDebrisPair,detector:issDebrisDetector,overlap:issDebrisOverlap,scan:issDebrisScan,scanAxis:issDebrisScanAxis,scanPosition:issDebrisScanPosition,positionMark:issDebrisPositionMark,positionSample:issDebrisPositionSample,meanRadiusSquared:issDebrisMeanRadiusSquared,apertureStudy:issDebrisApertureStudy,apertureLayout:issDebrisApertureLayout,apertureView:issDebrisApertureView,flightSection:issDebrisFlightSection,flightTime:issDebrisFlightTime,velocity:issDebrisVelocity,budget:issDebrisBudget,motion:issDebrisMotion,materialPath:issDebrisMaterialPath,motionMark:issDebrisMotionMark,motionReference:issDebrisMotionReference,motionSteps:issDebrisMotionSteps};')();
const require=createRequire(import.meta.url),modules=resolve(process.cwd(),'desktop/web-app/node_modules');
const {createRoot}=require(resolve(modules,'react-dom/client'));
const {Simulate}=require(resolve(modules,'react-dom/test-utils'));
const {act}=React;

describe('space station idealized impact conservation',()=>{
  it('uses SI spherical mass, cylindrical bumper mass and kinetic energy',()=>{
    const m=model({});
    expect(m.projectile).toBeCloseTo(2700*Math.PI*.001**3/6,14);
    expect(m.plug).toBeCloseTo(2700*Math.PI*.0005**2*.0005,14);
    expect(m.incoming).toBeCloseTo(101.7876019763,8);
    expect(m.impactUs).toBeCloseTo(.04/12000*1e6,12);
    expect(m.flightUs).toBeCloseTo(.1/m.axial*1e6,12);
  });

  it.each(['aluminum','glass','steel'])('conserves mass, forward momentum and all energy for %s',material=>{
    for(const diameter of [.2,1,12])for(const bumper of [.2,.5,2])for(const spread of [0,10,30]){
      const m=model({material,diameter,bumper,spread});
      expect(m.mass).toBe(m.projectile+m.plug);
      expect(m.mass*m.axial).toBeCloseTo(m.projectile*m.config.speed*1000,10);
      expect(m.translation+m.expansion+m.internal).toBeCloseTo(m.incoming,8);
      // Uniform disk: integrate radial kinetic energy with r = R sqrt(q).
      let expansion=0;const slices=100;
      for(let i=0;i<slices;i++)expansion+=.5*m.mass/slices*m.radial**2*((i+.5)/slices);
      expect(expansion).toBeCloseTo(m.expansion,8);
      for(const t of [0,m.impactUs,m.arrivalUs/2,m.arrivalUs]){
        const v=inspect(m,t);
        expect(v.incoming+v.translation+v.expansion+v.internal).toBeCloseTo(m.incoming,8);
      }
    }
  });

  it('obeys diameter-cubed, density and speed-squared scaling',()=>{
    const a=model({diameter:1,speed:7}),b=model({diameter:2,speed:7}),fast=model({diameter:1,speed:14}),steel=model({material:'steel',speed:7});
    expect(b.projectile/a.projectile).toBeCloseTo(8,12);
    expect(b.incoming/a.incoming).toBeCloseTo(8,12);
    expect(steel.projectile/a.projectile).toBeCloseTo(7800/2700,12);
    expect(fast.incoming/a.incoming).toBeCloseTo(4,12);
    expect(fast.axial/a.axial).toBeCloseTo(2,12);
    expect(fast.radial/a.radial).toBeCloseTo(2,12);
    expect(fast.arrivalUs/a.arrivalUs).toBeCloseTo(.5,12);
    // Fixed energy fraction gives a speed-independent cone, a model limit.
    expect(fast.wallRadius).toBeCloseTo(a.wallRadius,12);
    expect(fast.fluence/a.fluence).toBeCloseTo(4,12);
  });

  it('lets spacing reduce average loading without destroying energy or momentum',()=>{
    const compact=model({gap:2}),spaced=model({gap:20});
    for(const k of ['incoming','translation','expansion','internal','momentum','axial','radial'])expect(spaced[k]).toBe(compact[k]);
    expect(spaced.flightUs/compact.flightUs).toBeCloseTo(10,12);
    expect((spaced.wallRadius-spaced.radius)/(compact.wallRadius-compact.radius)).toBeCloseTo(10,12);
    expect(spaced.fluence*spaced.wallArea*1e4).toBeCloseTo(spaced.translation,10);
    expect(spaced.fluence/compact.fluence).toBeCloseTo(compact.wallArea/spaced.wallArea,12);
    expect(spaced.fluence).toBeLessThan(compact.fluence);
  });

  it('keeps the initial radius when no energy is assigned to spread',()=>{
    const m=model({spread:0,gap:20});
    expect(m.radial).toBe(0);expect(m.halfAngle).toBe(0);
    expect(m.wallRadius).toBe(m.radius);
    expect(inspect(m,m.arrivalUs).radius).toBe(m.radius);
    expect(m.internal).toBeCloseTo(m.incoming-m.translation,12);
    expect(m.fluence).toBe(model({spread:0,gap:2}).fluence);
  });

  it('shows the entrainment slowdown, earlier dense-particle arrival and a tunable expansion',()=>{
    const thin=model({bumper:.2}),thick=model({bumper:2}),dense=model({material:'steel',bumper:2}),spread=model({bumper:2,spread:30});
    expect(thick.plug/thin.plug).toBeCloseTo(10,12);
    expect(thick.axial).toBeLessThan(thin.axial);
    expect(thick.internal).toBeGreaterThan(thin.internal);
    expect(dense.axial).toBeGreaterThan(thick.axial);
    expect(dense.flightUs).toBeLessThan(thick.flightUs);
    expect(spread.radial/thick.radial).toBeCloseTo(Math.sqrt(3),12);
    expect(spread.translation).toBe(thick.translation);
    expect(spread.internal).toBeLessThan(thick.internal);
  });

  it('resolves contact instants and clamps to the wall without pretending to simulate penetration',()=>{
    const m=model({}),before=inspect(m,m.impactUs-1e-8),impact=inspect(m,m.impactUs),middle=inspect(m,m.impactUs+m.flightUs/2),wall=inspect(m,m.arrivalUs);
    expect(before.phase).toBe('approach');expect(before.x).toBeLessThan(0);
    expect(impact.phase).toBe('impact');expect(impact.x).toBe(0);expect(impact.radius).toBe(m.radius);
    expect(middle.phase).toBe('cloud');expect(middle.x).toBeCloseTo(.05,12);
    expect(middle.radius).toBeCloseTo((m.radius+m.wallRadius)/2,12);
    expect(wall.phase).toBe('contact');expect(wall.x).toBeCloseTo(.1,12);expect(wall.radius).toBeCloseTo(m.wallRadius,12);
    expect(inspect(m,1e9)).toEqual(wall);expect(inspect(m,-100)).toEqual(inspect(m,0));
    const snapshot=JSON.stringify(m);inspect(m,0);inspect(m,3);expect(inspect(m,m.arrivalUs)).toEqual(wall);expect(JSON.stringify(m)).toBe(snapshot);
  });

  it('rejects unknown material keys and bounds malformed persistent data',()=>{
    for(const value of [NaN,Infinity,null,'bad',-1e6,1e6]){
      const m=model({diameter:value,speed:value,gap:value,bumper:value,spread:value,material:value});
      for(const number of Object.values(m))if(typeof number==='number')expect(Number.isFinite(number)).toBe(true);
      for(const number of Object.values(inspect(m,value)))if(typeof number==='number')expect(Number.isFinite(number)).toBe(true);
      expect(m.wallRadius).toBeGreaterThan(0);expect(m.internal).toBeGreaterThanOrEqual(0);
    }
    for(const material of ['constructor','__proto__',{},null])expect(model({material}).config.material).toBe('aluminum');
  });

  it('integrates enclosed disk mass and kinetic energy independently of the sampling graphics',()=>{
    for(const settings of [{},{material:'steel',diameter:12,speed:15,bumper:2,spread:30},{diameter:.2,spread:0}]){
      const m=model(settings),original=JSON.stringify(m);
      for(const percent of [0,1,25,50,75,100]){
        const p=probe(m,m.arrivalUs,percent),a=percent/100;
        let mass=0,forward=0,sideways=0;
        // Integrate annuli of equal area, using the radial speed at each midpoint.
        for(let i=0;i<200;i++){
          const q=a*a*(i+.5)/200,dm=m.mass*a*a/200;
          mass+=dm;forward+=.5*dm*m.axial*m.axial;sideways+=.5*dm*m.radial*m.radial*q;
        }
        expect(p.mass).toBeCloseTo(mass,12);expect(p.forward).toBeCloseTo(forward,7);expect(p.expansion).toBeCloseTo(sideways,7);
        expect(p.edgeSpeed).toBeCloseTo(m.radial*a,10);
        if(a>0)expect(p.forward/(p.area*1e4)).toBeCloseTo(m.fluence,8);
      }
      const half=probe(m,m.arrivalUs,50),whole=probe(m,m.arrivalUs,100);
      expect(half.mass/whole.mass).toBeCloseTo(.25,12);
      if(m.expansion>0)expect(half.expansion/whole.expansion).toBeCloseTo(.0625,12);
      expect(whole.forward).toBeCloseTo(m.translation,10);expect(whole.expansion).toBeCloseTo(m.expansion,10);
      expect(JSON.stringify(m)).toBe(original);
    }
  });

  it('follows the same material through expansion while the energy per area falls',()=>{
    const m=model({}),impact=probe(m,m.impactUs,50),middle=probe(m,m.impactUs+m.flightUs/2,50),wall=probe(m,m.arrivalUs,50);
    for(const p of [middle,wall]){
      expect(p.mass).toBe(impact.mass);expect(p.forward).toBe(impact.forward);expect(p.expansion).toBe(impact.expansion);expect(p.edgeSpeed).toBe(impact.edgeSpeed);
      expect(p.normalDensity*p.area*1e4).toBeCloseTo(p.forward,12);
    }
    expect(impact.normalDensity).toBeGreaterThan(middle.normalDensity);expect(middle.normalDensity).toBeGreaterThan(wall.normalDensity);
    expect(wall.radius-impact.radius).toBeCloseTo(impact.edgeSpeed*m.flightUs*1e-6,12);
    expect(wall.normalDensity).toBeCloseTo(m.fluence,12);
    const rigid=model({spread:0});expect(probe(rigid,rigid.arrivalUs,50)).toEqual(probe(rigid,rigid.impactUs,50));
  });

  it('marks pre-contact probe measurements unavailable and bounds persisted probe data',()=>{
    const m=model({}),before=probe(m,m.impactUs-1e-8,50);
    expect(before.active).toBe(false);for(const field of ['mass','forward','expansion','edgeSpeed','normalDensity'])expect(before[field]).toBeNull();
    expect(probe(m,m.impactUs,50).active).toBe(true);expect(tracers(m,0)).toEqual([]);
    for(const value of [undefined,NaN,Infinity,null,'bad',-1e6,1e6]){
      const p=probe(m,m.arrivalUs,value);
      expect(p.fraction).toBeGreaterThanOrEqual(0);expect(p.fraction).toBeLessThanOrEqual(1);
      for(const n of Object.values(p))if(typeof n==='number')expect(Number.isFinite(n)).toBe(true);
    }
    expect(probe(m,m.arrivalUs,0).mass).toBe(0);expect(probe(m,m.arrivalUs,0).edgeSpeed).toBe(0);
  });

  it('moves equal-mass tracer samples ballistically with cancelling radial momenta and the correct energy',()=>{
    for(const settings of [{},{material:'steel',diameter:12,speed:15,spread:30},{spread:0}]){
      const m=model(settings),start=tracers(m,m.impactUs),end=tracers(m,m.arrivalUs);
      expect(start).toHaveLength(64);expect(end).toHaveLength(start.length);
      let mass=0,px=0,py=0,kinetic=0;
      end.forEach((p,i)=>{
        mass+=p.mass;px+=p.mass*p.vx;py+=p.mass*p.vy;kinetic+=.5*p.mass*(p.vx*p.vx+p.vy*p.vy);
        expect(p.mass).toBe(start[i].mass);
        expect(p.x-start[i].x).toBeCloseTo(p.vx*m.flightUs*1e-6,12);
        expect(p.y-start[i].y).toBeCloseTo(p.vy*m.flightUs*1e-6,12);
        expect(Math.hypot(p.x,p.y)).toBeLessThan(m.wallRadius);
      });
      expect(mass).toBeCloseTo(m.mass,12);expect(px).toBeCloseTo(0,10);expect(py).toBeCloseTo(0,10);expect(kinetic).toBeCloseTo(m.expansion,8);
    }
  });

  it('sweeps only standoff and agrees with independent full impact calculations at every point',()=>{
    for(const settings of [{},{material:'steel',diameter:12,speed:15,bumper:2,spread:30},{diameter:.2,bumper:2,spread:0}]){
      const m=model(settings),before=JSON.stringify(m);
      for(const metric of ['fluence','diameter','flight']){
        const chart=sweep(m,null,{metric});expect(chart.samples[0].gap).toBe(2);expect(chart.samples.at(-1).gap).toBe(20);
        for(const p of chart.samples){
          const independent=model({...m.config,gap:p.gap}),expected={fluence:independent.fluence,diameter:independent.wallRadius*2000,flight:independent.flightUs}[metric];
          expect(Math.abs(p.value-expected)/expected).toBeLessThan(1e-12);
          expect(p.y).toBeGreaterThan(0);expect(p.y).toBeLessThan(1);
          expect(independent.translation).toBe(m.translation);expect(independent.momentum).toBe(m.momentum);
        }
        expect(chart.selected.gap).toBe(m.config.gap);
      }
      expect(JSON.stringify(m)).toBe(before);
    }
  });

  it('uses honest log or linear coordinates and leaves zero-spread predictions flat',()=>{
    const m=model({}),log=sweep(m,null,{}),linear=sweep(m,null,{log:false});
    expect(log.log).toBe(true);expect(linear.log).toBe(false);expect(linear.ticks.at(-1).value).toBe(0);
    for(let i=1;i<log.ticks.length;i++)expect(log.ticks[i-1].value/log.ticks[i].value).toBeCloseTo(log.ticks[0].value/log.ticks[1].value,12);
    for(let i=1;i<linear.ticks.length;i++)expect(linear.ticks[i-1].value-linear.ticks[i].value).toBeCloseTo(linear.ticks[0].value-linear.ticks[1].value,12);
    expect(log.samples.map(p=>p.value)).toEqual(linear.samples.map(p=>p.value));
    for(const metric of ['fluence','diameter','flight']){
      const zero=sweep(model({spread:0}),null,{metric});
      expect(zero.ticks.every(t=>Number.isFinite(t.value))).toBe(true);
      expect(zero.samples.every(p=>Number.isFinite(p.y)&&p.y>0&&p.y<1)).toBe(true);
      if(metric!=='flight')expect(new Set(zero.samples.map(p=>p.value)).size).toBe(1);
      else expect(zero.samples.at(-1).value/zero.samples[0].value).toBeCloseTo(10,12);
      if(metric!=='fluence')expect(zero.log).toBe(false);
    }
    expect(sweep(m,null,{metric:'constructor'}).metric).toBe('fluence');
  });

  it('holds a saved design fixed while fitting distinct curves to one physical axis',()=>{
    const current=model({diameter:.2,speed:7,bumper:2,spread:30,gap:20}),reference=model({material:'steel',diameter:12,speed:15,spread:0,gap:2}),frozen=JSON.stringify(reference);
    for(const metric of ['fluence','diameter','flight']){
      const chart=sweep(current,reference,{metric});expect(chart.sharedCurve).toBe(false);expect(chart.referenceSamples).toHaveLength(73);
      expect(chart.reference.gap).toBe(2);expect(chart.selected.gap).toBe(20);
      for(const p of chart.samples.concat(chart.referenceSamples,[chart.selected,chart.reference]))expect(p.y>0&&p.y<1).toBe(true);
      const refAt2=chart.referenceSamples[0];expect(chart.reference).toEqual(refAt2);
    }
    expect(JSON.stringify(reference)).toBe(frozen);
    const match=sweep(current,model({...current.config,gap:2}),{});expect(match.sharedCurve).toBe(true);expect(match.referenceSamples).toEqual([]);expect(match.reference.gap).toBe(2);
    const hidden=sweep(current,null,{});expect(hidden.reference).toBeNull();expect(hidden.referenceSamples).toEqual([]);
  });

  it('compares physical elapsed time and holds a completed reference at first contact',()=>{
    const current=model({gap:20,speed:7}),reference=model({gap:2,speed:15}),frozen=JSON.stringify([current,reference]);
    const t=(current.impactUs+reference.impactUs)/2,early=pair(current,reference,t,'clock');
    expect(early.current.state.phase).toBe('approach');expect(early.reference.state.phase).toBe('cloud');
    expect(early.current.state.x).toBeCloseTo(-.04+7000*t*1e-6,14);
    expect(early.reference.state.x).toBeCloseTo(reference.axial*(t-reference.impactUs)*1e-6,14);
    const later=pair(current,reference,current.arrivalUs*.8,'clock');
    expect(later.current.state.phase).toBe('cloud');expect(later.current.held).toBe(false);
    expect(later.reference.held).toBe(true);expect(later.reference.state).toEqual(inspect(reference,reference.arrivalUs));
    expect(later.reference.state.x).toBeCloseTo(.02,14);expect(later.reference.state.radius).toBeCloseTo(reference.wallRadius,14);
    expect(JSON.stringify([current,reference])).toBe(frozen);
  });

  it('keeps a slower reference in flight and uses distinct event times for contact snapshots',()=>{
    const current=model({gap:2,speed:12}),reference=model({gap:20,speed:7});
    const elapsed=pair(current,reference,current.arrivalUs,'clock');
    expect(elapsed.current.state.phase).toBe('contact');expect(elapsed.reference.state.phase).toBe('cloud');
    expect(elapsed.reference.state.time).toBe(current.arrivalUs);expect(elapsed.reference.held).toBe(false);
    const fast=model({gap:2,speed:15});expect(pair(fast,reference,fast.arrivalUs,'clock').reference.state.phase).toBe('approach');
    const contacts=pair(current,reference,0,'contact');
    expect(contacts.clock).toBe(0);expect(contacts.current.state.time).toBe(current.arrivalUs);expect(contacts.reference.state.time).toBe(reference.arrivalUs);
    expect(contacts.current.state.x).toBeCloseTo(.02,14);expect(contacts.reference.state.x).toBeCloseTo(.2,14);
    expect(contacts.current.held).toBe(false);expect(contacts.reference.held).toBe(false);
  });

  it('fits both shots with one isotropic scale that stays fixed when spacing or time changes',()=>{
    for(const options of [{},{diameter:.2,bumper:2,spread:30},{diameter:12,material:'steel',spread:0}]){
      const current=model(options),reference=model({spread:30,material:'glass',gap:2}),base=pair(current,reference,0,'clock');
      for(const gap of [2,10,20]){
        const m=model({...options,gap}),r=model({...reference.config,gap:22-gap});
        for(const mode of ['clock','contact']){
          const p=pair(m,r,m.arrivalUs,mode);expect(p.scale).toBe(base.scale);
          for(const shot of [p.current,p.reference]){
            expect(shot.state.radius*p.scale).toBeLessThanOrEqual(84+1e-9);
            const x=100+shot.state.x*p.scale;expect(x).toBeGreaterThanOrEqual(36);expect(x).toBeLessThanOrEqual(420);
          }
        }
      }
    }
    const a=model({gap:10}),b=model({gap:2}),p=pair(a,b,0,'contact');
    expect((a.config.gap/100*p.scale)/(b.config.gap/100*p.scale)).toBeCloseTo(5,12);
    expect((p.current.state.radius*p.scale)/(p.reference.state.radius*p.scale)).toBeCloseTo(a.wallRadius/b.wallRadius,12);
  });

  it('bounds malformed pair preferences and clock values without mutating either setup',()=>{
    const m=model({}),r=model({gap:2});
    for(const t of [null,NaN,Infinity,'bad',-100,1e9]){
      const p=pair(m,r,t,'clock');expect(Number.isFinite(p.clock)).toBe(true);expect(p.clock).toBeGreaterThanOrEqual(0);expect(p.clock).toBeLessThanOrEqual(m.arrivalUs);
    }
    expect(pair(m,null,0,'bad').mode).toBe('contact');expect(pair(m,null,0,'clock').reference).toBeNull();
    expect(pair(m,r,-1,'clock').current.state.time).toBe(0);
    expect(pair(m,r,1e9,'clock').current.state.time).toBe(m.arrivalUs);
  });

  it('computes circular overlap against independent numerical area integration',()=>{
    function integrate(R,r,d){
      const lo=Math.max(-R,d-r),hi=Math.min(R,d+r),n=50000,dx=(hi-lo)/n;let area=0;
      for(let i=0;i<n;i++){const x=lo+(i+.5)*dx;area+=2*Math.min(Math.sqrt(Math.max(0,R*R-x*x)),Math.sqrt(Math.max(0,r*r-(x-d)**2)))*dx;}
      return area;
    }
    for(const [R,r,d] of [[1,1,1],[10,.5,10],[1,2,1.5],[600,.5,600.25],[600,.5,599.75],[.1,30,29.99],[.1,30,30.09]]){
      const expected=integrate(R,r,d),actual=overlap(R,r,d);
      expect(Math.abs(actual/expected-1)).toBeLessThan(1e-5);
      expect(overlap(r,R,d)).toBeCloseTo(actual,10);
      expect(overlap(R/1000,r/1000,d/1000)*1e6).toBeCloseTo(actual,9);
    }
    expect(overlap(1,1,1)).toBeCloseTo(2*Math.PI/3-Math.sqrt(3)/2,12);
  });

  it('handles containment and grazing limits without negative area or jumps',()=>{
    for(const [R,r] of [[.04,.01],[.0001,.03],[.6001,.0005],[.01,.01]]){
      const cap=Math.PI*Math.min(R,r)**2;
      expect(overlap(R,r,0)).toBeCloseTo(cap,14);expect(overlap(R,r,Math.abs(R-r))).toBeCloseTo(cap,14);
      expect(overlap(R,r,R+r)).toBe(0);expect(overlap(R,r,R+r+.1)).toBe(0);
      let prev=cap;
      for(let i=0;i<=100;i++){
        const area=overlap(R,r,(R+r)*i/100);expect(area).toBeGreaterThanOrEqual(0);expect(area).toBeLessThanOrEqual(cap+1e-14);expect(area).toBeLessThanOrEqual(prev+1e-14);prev=area;
      }
      expect(overlap(R,r,R+r-1e-12)).toBeGreaterThan(0);
      expect(overlap(R,r,R+r-1e-12)).toBeLessThan(cap*1e-8);
      expect(overlap(R,r,Math.abs(R-r)+1e-12)/cap).toBeCloseTo(1,7);
    }
  });

  it('integrates mass and forward energy over the same fixed physical aperture in both designs',()=>{
    const a=model({gap:10}),b=model({gap:2}),before=JSON.stringify([a,b]),p=detector(a,b,{radius:2,offset:0});
    expect(p.current.coverage).toBeCloseTo(1,12);expect(p.reference.coverage).toBeCloseTo(1,12);
    for(const [m,value] of [[a,p.current],[b,p.reference]]){
      const fraction=(.002/m.wallRadius)**2;
      expect(value.fraction).toBeCloseTo(fraction,12);expect(value.energy).toBeCloseTo(m.translation*fraction,10);expect(value.mass).toBeCloseTo(m.mass*fraction,14);
      expect(value.energy/(p.area*1e4)).toBeCloseTo(m.fluence,10);
    }
    expect(p.current.energy/p.reference.energy).toBeCloseTo(a.fluence/b.fluence,12);
    const huge=detector(model({spread:0,diameter:.2}),null,{radius:30});
    expect(huge.current.fraction).toBe(1);expect(huge.current.coverage).toBeLessThan(.001);
    expect(huge.current.energy).toBe(model({spread:0,diameter:.2}).translation);
    expect(JSON.stringify([a,b])).toBe(before);
  });

  it('distinguishes footprint share from aperture coverage at edges and outside both clouds',()=>{
    const a=model({gap:10}),b=model({gap:2}),p=detector(a,b,{radius:10,offset:a.wallRadius*1000});
    expect(p.current.coverage).toBeGreaterThan(0);expect(p.current.coverage).toBeLessThan(.5);
    expect(p.current.fraction).toBeLessThan(p.current.coverage);expect(p.reference.energy).toBe(0);
    expect(p.current.average).toBeCloseTo(a.fluence*p.current.coverage,12);
    const outside=detector(a,b,{radius:10,offset:p.maxOffset*1000});
    expect(outside.offset).toBe(outside.maxOffset);expect(outside.current.energy).toBe(0);expect(outside.reference.energy).toBe(0);
    for(const options of [{},{radius:.5,offset:1},{radius:30,offset:50}]){
      const same=detector(a,a,options);expect(same.current).toEqual(same.reference);
    }
  });

  it('bounds damaged aperture settings and fits tiny or extreme footprints on one physical scale',()=>{
    for(const a of [model({}),model({diameter:.2,bumper:2,spread:30,gap:20}),model({diameter:.2,spread:0})]){
      for(const value of [null,NaN,Infinity,'bad',-1e9,1e9]){
        const p=detector(a,null,{radius:value,offset:value});
        expect(p.radius).toBeGreaterThanOrEqual(.0005);expect(p.radius).toBeLessThanOrEqual(.03);
        expect(p.offset).toBeGreaterThanOrEqual(0);expect(p.offset).toBeLessThanOrEqual(p.maxOffset);
        expect(p.reference).toBeNull();for(const [key,v] of Object.entries(p.current)){if(key==='radialRms'&&p.current.overlap===0)expect(v).toBeNull();else expect(Number.isFinite(v)).toBe(true);}
        expect(180+(p.offset+p.radius)*p.scale).toBeLessThanOrEqual(440+1e-9);
        expect(a.wallRadius*p.scale).toBeLessThanOrEqual(130+1e-9);
        expect(p.ruler*p.scale).toBeGreaterThanOrEqual(24-1e-9);expect(p.ruler*p.scale).toBeLessThanOrEqual(60+1e-9);
      }
    }
  });

  it('keeps the radial plateau and exact edge limits for small and large apertures',()=>{
    for(const m of [model({}),model({spread:0,diameter:.2}),model({diameter:.2,bumper:2,spread:30,gap:20})])for(const radius of [.5,10,30]){
      const p=scan(m,null,{radius}),c=p.current;
      expect(c.start).toBe(Math.abs(m.wallRadius-radius/1000));expect(c.end).toBe(m.wallRadius+radius/1000);
      const flat=c.samples.filter(q=>q.offset<=c.start);expect(flat.length).toBeGreaterThanOrEqual(2);
      flat.forEach(q=>expect(q.value/c.peak).toBeCloseTo(1,12));
      expect(c.samples.find(q=>q.offset===c.end).value).toBe(0);
      expect(c.samples[0].offset).toBe(0);expect(c.samples.at(-1).offset).toBe(p.maxOffset);
      let previous=c.peak;for(const q of c.samples){expect(q.value).toBeGreaterThanOrEqual(0);expect(q.value).toBeLessThanOrEqual(previous+c.peak*1e-12);previous=q.value;}
    }
  });

  it('resolves narrow radial transitions next to vastly larger reference footprints',()=>{
    const a=model({diameter:.2,spread:0}),b=model({diameter:.2,bumper:2,spread:30,gap:20});
    for(const radius of [.5,10,30]){
      const p=scan(a,b,{radius});
      for(const [m,c] of [[a,p.current],[b,p.reference]]){
        expect(c.samples.filter(q=>q.offset>c.start&&q.offset<c.end).length).toBeGreaterThanOrEqual(63);
        for(let i=1;i<c.samples.length;i++){
          const lo=c.samples[i-1],hi=c.samples[i],mid=(lo.offset+hi.offset)/2;
          const actual=detector(m,null,{radius,offset:mid*1000}).current.energy;
          // Error is relative to that curve's own peak, never the large reference.
          expect(Math.abs((lo.value+hi.value)/2-actual)/c.peak).toBeLessThan(.001);
        }
      }
    }
  });

  it('uses absolute mass and forward-energy units on shared scales without moving saved state',()=>{
    const a=model({gap:10}),b=model({gap:2,diameter:3,material:'steel',speed:9}),before=JSON.stringify([a,b]);
    const energy=scan(a,b,{radius:10}),mass=scan(a,b,{radius:10,metric:'mass'});
    expect(energy.unit).toBe('J');expect(mass.unit).toBe('mg');expect(mass.maxOffset).toBe(energy.maxOffset);
    for(const [m,key] of [[a,'current'],[b,'reference']]){
      energy[key].samples.forEach((q,i)=>{const other=mass[key].samples[i];expect(other.offset).toBe(q.offset);expect(other.value*1e-6*.5*m.axial**2).toBeCloseTo(q.value,9);});
      expect(energy.high).toBeGreaterThanOrEqual(energy[key].peak);expect(mass.high).toBeGreaterThanOrEqual(mass[key].peak);
    }
    expect(JSON.stringify([a,b])).toBe(before);
    expect(scan(a,b,{radius:10,offset:35})).toEqual(energy);
  });

  it('keeps radial scales finite for malformed settings and coincident designs',()=>{
    const a=model({diameter:.2,spread:0});
    for(const metric of [null,undefined,'wrong','__proto__','mass'])for(const radius of [null,NaN,Infinity,'bad',-99,999]){
      const p=scan(a,a,{metric,radius});expect(p.current).toEqual(p.reference);
      expect(Number.isFinite(p.high)).toBe(true);expect(p.high).toBeGreaterThan(0);
      expect(p.metric).toBe(metric==='mass'?'mass':'energy');
      p.current.samples.forEach(q=>{expect(Number.isFinite(q.value)).toBe(true);expect(q.value).toBeLessThanOrEqual(p.high);});
    }
    expect(scan(a,null).reference).toBeNull();
  });

  it('integrates radial lens moments against independent Cartesian strip quadrature',()=>{
    function integrate(R,r,d){
      const lo=Math.max(-R,d-r),hi=Math.min(R,d+r),n=100000,dx=(hi-lo)/n;let area=0,moment=0;
      for(let i=0;i<n;i++){const x=lo+(i+.5)*dx,h=Math.min(Math.sqrt(Math.max(0,(R-x)*(R+x))),Math.sqrt(Math.max(0,(r-x+d)*(r+x-d))));const strip=2*h*dx;area+=strip;moment+=strip*(x*x+h*h/3);}
      return moment/area;
    }
    for(const [R,r,d] of [[1,1,1],[1,.2,.9],[1,.001,.9995],[1,300,300.5],[1,300,299.0001],[.0001,.03,.03009999],[.6001,.0005,.60059]]){
      const actual=meanRadiusSquared(R,r,d),expected=integrate(R,r,d);
      expect(Math.abs(actual-expected)/(R*R)).toBeLessThan(5e-7);
      expect(actual).toBeGreaterThanOrEqual(0);expect(actual).toBeLessThanOrEqual(R*R);
      expect(meanRadiusSquared(R*1000,r*1000,d*1000)/1e6).toBeCloseTo(actual,9);
    }
    expect(meanRadiusSquared(1,.2,0)).toBeCloseTo(.02,12);expect(meanRadiusSquared(1,.2,.4)).toBeCloseTo(.18,12);
    expect(meanRadiusSquared(1,2,.5)).toBe(.5);expect(meanRadiusSquared(1,.2,1.2)).toBe(0);
  });

  it('distinguishes fourth-power centered sideways energy from second-power sampled mass',()=>{
    const m=model({}),p=detector(m,null,{radius:m.wallRadius*500}).current;
    expect(p.fraction).toBeCloseTo(.25,12);expect(p.expansionFraction).toBeCloseTo(1/16,12);
    expect(p.expansion).toBeCloseTo(m.expansion/16,12);expect(p.radialRms).toBeCloseTo(m.radial/Math.sqrt(8),10);
    const a=2,center=detector(m,null,{radius:a}).current,rim=detector(m,null,{radius:a,offset:m.wallRadius*1000-a}).current;
    expect(rim.mass).toBeCloseTo(center.mass,14);expect(rim.energy).toBeCloseTo(center.energy,12);
    expect(rim.expansion).toBeGreaterThan(center.expansion*100);expect(rim.radialRms).toBeGreaterThan(center.radialRms);
    const small=model({diameter:.2,spread:1,gap:2}),all=detector(small,null,{radius:30}).current;
    expect(all.expansion).toBe(small.expansion);expect(all.expansionFraction).toBe(1);expect(all.radialRms).toBeCloseTo(small.radial/Math.sqrt(2),10);
  });

  it('preserves sideways energy budgets, RMS identity and tangency limits across setups',()=>{
    for(const m of [model({}),model({diameter:.2,bumper:2,spread:30,gap:20}),model({material:'steel',diameter:12,spread:30}),model({spread:0})])for(const radius of [.5,10,30]){
      const end=m.wallRadius*1000+radius;
      for(const offset of [0,end*.2,end*.5,end*.9,end*(1-1e-8),end]){
        const p=detector(m,null,{radius,offset}).current;
        expect(p.expansion).toBeGreaterThanOrEqual(0);expect(p.expansion).toBeLessThanOrEqual(m.expansion);
        if(p.overlap>0){expect(p.radialRms).toBeGreaterThanOrEqual(0);expect(p.radialRms).toBeLessThanOrEqual(m.radial);expect(.5*p.mass*p.radialRms**2).toBeCloseTo(p.expansion,8);}
        else{expect(p.expansion).toBe(0);expect(p.radialRms).toBeNull();}
      }
      const whole=detector(m,null,{radius,offset:end*(1-1e-8)}).current;expect(whole.expansion).toBeLessThan(Math.max(1,m.expansion)*1e-8);
    }
  });

  it('fits off-center sideways-energy peaks and zero-spread curves on finite shared axes',()=>{
    const m=model({}),r=model({gap:2}),p=scan(m,r,{radius:2,metric:'expansion'});
    expect(p.metric).toBe('expansion');expect(p.unit).toBe('J');expect(p.empty).toBe(false);
    expect(p.current.peak).toBeGreaterThan(p.current.samples[0].value*100);
    expect(p.current.samples.filter(q=>q.offset>0&&q.offset<p.current.start).length).toBeGreaterThanOrEqual(63);
    for(const base of [m,r])for(let i=0;i<=200;i++){
      const sample=detector(base,null,{radius:2,offset:p.maxOffset*i/200*1000}).current;
      expect(sample.expansion).toBeLessThanOrEqual(p.high);
    }
    const zero=scan(model({spread:0}),model({spread:0,gap:2}),{metric:'expansion'});
    expect(zero.empty).toBe(true);expect(zero.high).toBe(1);expect(zero.current.samples.every(q=>q.value===0)).toBe(true);
    expect(zero.reference.samples.every(q=>q.value===0)).toBe(true);
  });

  it('maps physical ticks onto a shared monotone scale with exact zero and a readable weak signal',()=>{
    for(const high of [1e-12,.0045,4.5,900000])for(const mode of ['linear','softlog']){
      const axis=scanAxis(high,mode);expect(axis.mode).toBe(mode);expect(axis.high).toBe(high);
      expect(scanPosition(0,axis)).toBe(0);expect(scanPosition(high,axis)).toBe(1);
      expect(axis.ticks[0].value).toBe(0);expect(axis.ticks.at(-1).value).toBe(high);
      for(const t of axis.ticks)expect(scanPosition(t.value,axis)).toBeCloseTo(t.position,12);
      let last=-1;for(const fraction of [0,1e-12,1e-6,.001,.01,.1,.5,1]){const y=scanPosition(high*fraction,axis);expect(y).toBeGreaterThan(last);last=y;}
      if(mode==='softlog')expect(scanPosition(high/1000,axis)*208).toBeGreaterThan(20);
      else expect(scanPosition(high/1000,axis)).toBeCloseTo(.001,12);
    }
    for(const mode of [undefined,null,'bad','__proto__'])expect(scanAxis(1,mode).mode).toBe('linear');
    for(const high of [0,-1,NaN,Infinity])expect(scanAxis(high,'softlog').high).toBe(1);
  });

  it('bounds soft-log curve error in display space through grazing overlap and unequal footprints',()=>{
    const normal=model({}),tiny=model({diameter:.2,spread:0}),wide=model({diameter:.2,bumper:2,spread:30,gap:20});
    for(const [a,b] of [[normal,normal],[tiny,wide],[normal,model({gap:2})]])for(const radius of [.5,10,30])for(const metric of ['energy','expansion','mass']){
      const result=scan(a,b,{radius,metric,scale:'softlog'}),linear=scan(a,b,{radius,metric});
      expect(result.high).toBe(linear.high);expect(result.maxOffset).toBe(linear.maxOffset);
      for(const [base,key] of [[a,'current'],[b,'reference']]){
        const c=result[key];let error=0;
        for(const p of linear[key].samples)expect(c.samples.find(q=>q.offset===p.offset).value).toBe(p.value);
        for(let i=1;i<c.samples.length;i++){
          const lo=c.samples[i-1],hi=c.samples[i],low=scanPosition(lo.value,result.axis),high=scanPosition(hi.value,result.axis);
          for(const t of [.125,.25,.5,.75,.875]){
            const sample=detector(base,null,{radius,offset:(lo.offset+(hi.offset-lo.offset)*t)*1000}).current;
            const value=metric==='mass'?sample.mass*1e6:metric==='expansion'?sample.expansion:sample.energy;
            error=Math.max(error,208*Math.abs(scanPosition(value,result.axis)-(low+(high-low)*t)));
          }
        }
        expect(error).toBeLessThan(.4);expect(c.samples.length).toBeLessThan(600);
        expect(c.samples.find(q=>q.offset===c.end).value).toBe(0);
      }
    }
  });

  it('keeps empty compressed scans finite without inventing sampled energy',()=>{
    const result=scan(model({spread:0}),model({spread:0,gap:2}),{metric:'expansion',scale:'softlog'});
    expect(result.empty).toBe(true);expect(result.axis.mode).toBe('softlog');expect(result.high).toBe(1);
    for(const key of ['current','reference'])expect(result[key].samples.every(p=>p.value===0&&scanPosition(p.value,result.axis)===0)).toBe(true);
  });

  it('marks a physical position and recovers exact aperture measurements after serialization',()=>{
    const m=model({}),r=model({gap:2}),aperture=detector(m,r,{radius:10,offset:0}),mark=positionMark(m,aperture),saved=JSON.parse(JSON.stringify(mark));
    expect(mark.offset).toBe(0);expect(mark.setup).toEqual(snapshot(m));expect(mark.setup).not.toBe(m.config);
    expect(Object.keys(mark).sort()).toEqual(['offset','radius','setup','version']);
    const center=positionSample(m,aperture,saved),f=aperture.radius/m.wallRadius;
    expect(center.current.mass).toBeCloseTo(m.mass*f*f,14);expect(center.current.expansion).toBeCloseTo(m.expansion*f**4,12);
    const live=detector(m,r,{radius:10,offset:(m.wallRadius-aperture.radius)*1000});
    expect(positionSample(m,live,saved)).toEqual(center);expect(live.current.mass).toBeCloseTo(center.current.mass,14);expect(live.current.expansion).toBeGreaterThan(center.current.expansion*10);
    const edge=detector(m,r,{radius:10,offset:aperture.maxOffset*1000}),outside=positionSample(m,edge,positionMark(m,edge));
    expect(outside.current.energy).toBe(0);expect(outside.current.expansion).toBe(0);expect(outside.current.radialRms).toBeNull();
  });

  it('rejects stale, malformed and out-of-view position marks without moving them',()=>{
    const m=model({}),aperture=detector(m,model({gap:20}),{offset:999}),mark=positionMark(m,aperture);
    expect(positionSample(m,aperture,mark)).not.toBeNull();
    for(const invalid of [null,{},[],{...mark,version:2},{...mark,offset:'0'},{...mark,offset:-1},{...mark,offset:NaN},{...mark,offset:Infinity},{...mark,offset:aperture.maxOffset+1e-10},{...mark,radius:NaN},{...mark,setup:null},{...mark,setup:{...mark.setup,version:2}},{...mark,setup:{...mark.setup,material:'bad'}}])expect(positionSample(m,aperture,invalid)).toBeNull();
    for(const patch of [{diameter:2},{speed:9},{gap:3},{bumper:1},{material:'glass'},{spread:0}])expect(positionSample(model(patch),aperture,mark)).toBeNull();
    expect(positionSample(m,detector(m,null,{radius:2}),mark)).toBeNull();expect(positionSample(m,detector(m,null,{radius:10}),mark)).toBeNull();
    expect(mark.offset).toBe(aperture.maxOffset);
  });

  it('distinguishes exact maximum plateaus, center maxima and zero scans',()=>{
    const m=model({gap:2});
    for(const radius of [2,10])for(const metric of ['energy','mass']){
      const r=scan(m,null,{radius,metric}),p=r.current.maximum,center=detector(m,null,{radius}).current;
      expect(p.kind).toBe('plateau');expect(p.offset).toBe(0);expect(p.from).toBe(0);expect(p.to).toBe(Math.abs(m.wallRadius-radius/1000));
      expect(p.value).toBe(metric==='mass'?center.mass*1e6:center.energy);
      for(const offset of [0,p.to/2,p.to]){const q=detector(m,null,{radius,offset:offset*1000}).current;expect((metric==='mass'?q.mass*1e6:q.energy)/p.value).toBeCloseTo(1,12);}
    }
    const whole=scan(m,null,{radius:10,metric:'expansion'}).current.maximum;expect(whole.kind).toBe('plateau');expect(whole.value).toBe(m.expansion);
    const equal=scan(m,null,{radius:m.wallRadius*1000,metric:'expansion'}).current.maximum;expect(equal.kind).toBe('center');expect(equal.offset).toBe(0);expect(equal.value).toBe(m.expansion);
    const zero=scan(model({spread:0}),m,{metric:'expansion'}).current.maximum;expect(zero.kind).toBe('zero');expect(zero.value).toBe(0);expect(zero.offset).toBe(0);
  });

  it('locates sideways-energy maxima against a dense independent offset search',()=>{
    const cases=[model({}),model({gap:2}),model({diameter:.2,bumper:2,spread:30,gap:20}),model({material:'steel',diameter:12,spread:30})];
    for(const m of cases)for(const radius of [.5,2,10,30]){
      const p=scan(m,null,{radius,metric:'expansion'}).current,maximum=p.maximum;
      let dense=0;for(let i=0;i<=3000;i++){const offset=(p.start+(p.end-p.start)*i/3000)*1000;dense=Math.max(dense,detector(m,null,{radius,offset}).current.expansion);}
      expect(maximum.value).toBeGreaterThanOrEqual(dense-m.expansion*1e-6);expect(maximum.value).toBeLessThanOrEqual(m.expansion);
      expect(maximum.offset).toBeGreaterThanOrEqual(0);expect(maximum.offset).toBeLessThan(p.end);expect(maximum.value).toBe(detector(m,null,{radius,offset:maximum.offset*1000}).current.expansion);
      expect(p.samples.some(q=>q.offset===maximum.offset&&q.value===maximum.value)).toBe(true);
    }
    const m=model({}),p=scan(m,null,{radius:10,metric:'expansion'}).current.maximum;
    const inner=detector(m,null,{radius:10,offset:(m.wallRadius-.01)*1000}).current.expansion;
    expect(p.offset).toBeGreaterThan(m.wallRadius-.01);expect(p.value).toBeGreaterThan(inner*1.02);
  });

  it('keeps maximum searches independent of display scale through near-equal radii',()=>{
    const m=model({gap:2}),ref=model({gap:20,diameter:3});
    for(const ratio of [.1,.5,.9,.99999999,1,1.1,2])for(const metric of ['energy','mass','expansion']){
      const radius=m.wallRadius*ratio*1000,a=scan(m,ref,{radius,metric}),b=scan(m,ref,{radius,metric,scale:'softlog'});
      expect(a.current.maximum).toEqual(b.current.maximum);expect(a.reference.maximum).toEqual(b.reference.maximum);expect(a.high).toBe(b.high);
      for(const key of ['current','reference']){const p=a[key].maximum;expect(Number.isFinite(p.value)).toBe(true);expect(Number.isFinite(p.offset)).toBe(true);expect(p.value).toBeLessThanOrEqual(a.high);}
    }
  });

  it('scales peak position with length and peak energy with sampled mass',()=>{
    const a=model({gap:4,diameter:1,bumper:.5}),b=model({gap:8,diameter:2,bumper:1});
    const p=scan(a,null,{radius:2,metric:'expansion'}).current.maximum,q=scan(b,null,{radius:4,metric:'expansion'}).current.maximum;
    expect(p.kind).toBe('peak');expect(q.kind).toBe('peak');expect(q.offset/p.offset).toBeCloseTo(2,7);expect(q.value/p.value).toBeCloseTo(8,9);
  });

  it('finds the inner half-maximum edge from the analytic contained-aperture energy law',()=>{
    const m=model({}),radius=10,a=radius/1000,c=scan(m,null,{radius,metric:'expansion'}).current,b=c.halfMaximum;
    expect(b.value).toBe(c.maximum.value*.5);expect(b.includesCenter).toBe(false);expect(b.from).toBeGreaterThan(0);expect(b.from).toBeLessThan(m.wallRadius-a);
    // In a fully contained aperture, integrating the squared radial speed gives
    // E(d) = Kr a² (2d² + a²) / R⁴; no lens quadrature is needed for this root.
    const analytic=Math.sqrt((b.value*m.wallRadius**4/(m.expansion*a*a)-a*a)/2);
    expect(b.from).toBeCloseTo(analytic,10);expect(b.to).toBeGreaterThan(c.maximum.offset);expect(b.span).toBe(b.to-b.from);
    expect(b.span).toBeLessThan(c.end);expect(c.samples.some(p=>p.offset===b.from)).toBe(true);expect(c.samples.some(p=>p.offset===b.to)).toBe(true);
  });

  it('gives uniform mass and forward energy the same half-maximum radial interval',()=>{
    for(const m of [model({}),model({gap:2}),model({spread:0,diameter:.2})])for(const radius of [.5,10,30]){
      const e=scan(m,null,{radius,metric:'energy'}).current,mass=scan(m,null,{radius,metric:'mass'}).current;
      for(const c of [e,mass]){const b=c.halfMaximum;expect(b.includesCenter).toBe(true);expect(b.from).toBe(0);expect(b.to).toBeGreaterThan(c.maximum.to);expect(b.to).toBeLessThan(c.end);expect(b.span).toBe(b.to);}
      expect(e.halfMaximum.to).toBeCloseTo(mass.halfMaximum.to,12);
      expect(e.halfMaximum.value/e.maximum.value).toBe(.5);expect(mass.halfMaximum.value/mass.maximum.value).toBe(.5);
    }
  });

  it('keeps half-maximum crossings physical across display scales and unrelated references',()=>{
    const m=model({gap:2}),ref=model({gap:20,diameter:12,bumper:2,spread:30});
    for(const ratio of [.1,.5,.9,.99999999,1,1.1,2])for(const metric of ['energy','mass','expansion']){
      const radius=m.wallRadius*ratio*1000,a=scan(m,ref,{radius,metric}),b=scan(m,ref,{radius,metric,scale:'softlog'}),alone=scan(m,null,{radius,metric});
      expect(a.current.halfMaximum).toEqual(b.current.halfMaximum);expect(a.reference.halfMaximum).toEqual(b.reference.halfMaximum);expect(a.current.halfMaximum).toEqual(alone.current.halfMaximum);
      for(const key of ['current','reference'])expect(a[key].halfMaximum.value).toBe(a[key].maximum.value*.5);
    }
    const b=scan(model({}),null,{radius:10,metric:'expansion',scale:'softlog'});
    expect(Math.abs(scanPosition(b.current.halfMaximum.value,b.axis)-scanPosition(b.current.maximum.value,b.axis)/2)).toBeGreaterThan(.3);
  });

  it('brackets physical half readings and all above-half offsets across extreme aperture ratios',()=>{
    const cases=[model({}),model({gap:2}),model({spread:0,diameter:.2}),model({diameter:.2,bumper:2,spread:30,gap:20}),model({material:'steel',diameter:12,spread:30})];
    for(const m of cases)for(const radius of [.5,10,30])for(const metric of ['energy','mass','expansion']){
      const c=scan(m,null,{radius,metric}).current,b=c.halfMaximum;if(!c.maximum.value){expect(b).toBeNull();continue;}
      const reading=offset=>{const p=detector(m,null,{radius,offset:offset*1000}).current;return metric==='mass'?p.mass*1e6:p[metric];};
      expect([b.value,b.from,b.to,b.span].every(Number.isFinite)).toBe(true);expect(b.from).toBeGreaterThanOrEqual(0);expect(b.to).toBeLessThan(c.end);expect(b.span).toBeGreaterThan(0);
      expect(b.from).toBeLessThanOrEqual(c.maximum.offset);expect(b.to).toBeGreaterThan(c.maximum.offset);expect(b.includesCenter).toBe(b.from===0);
      expect(reading(b.to)/b.value).toBeCloseTo(1,6);if(!b.includesCenter)expect(reading(b.from)/b.value).toBeCloseTo(1,6);
      const epsilon=Math.min(b.span*.001,(c.end-b.to)*.1);
      expect(reading(b.to-epsilon)).toBeGreaterThan(b.value);expect(reading(b.to+epsilon)).toBeLessThan(b.value);
      if(!b.includesCenter){expect(reading(Math.max(0,b.from-epsilon))).toBeLessThan(b.value);expect(reading(b.from+epsilon)).toBeGreaterThan(b.value);}
      for(let i=0;i<=64;i++){const offset=c.end*i/64;if(Math.min(Math.abs(offset-b.from),Math.abs(offset-b.to))>c.end*1e-7)expect(reading(offset)>=b.value).toBe(offset>=b.from&&offset<=b.to);}
      for(const edge of [b.from,b.to]){const p=c.samples.find(p=>p.offset===edge);expect(p).toBeDefined();expect(p.value/c.maximum.value).toBeCloseTo(reading(edge)/c.maximum.value,10);}
    }
  });

  it('has no fractional width for a zero scan even when its reference has a peak',()=>{
    const zero=model({spread:0}),active=model({}),a=scan(zero,active,{metric:'expansion'}),b=scan(active,zero,{metric:'expansion',scale:'softlog'});
    expect(a.current.halfMaximum).toBeNull();expect(a.reference.halfMaximum).not.toBeNull();expect(b.current.halfMaximum).not.toBeNull();expect(b.reference.halfMaximum).toBeNull();
    const empty=scan(zero,zero,{metric:'expansion'});expect(empty.current.halfMaximum).toBeNull();expect(empty.reference.halfMaximum).toBeNull();
  });

  it('scales the half-maximum interval with geometry without doubling the radial span',()=>{
    const a=model({gap:4,diameter:1,bumper:.5}),b=model({gap:8,diameter:2,bumper:1});
    const p=scan(a,null,{radius:2,metric:'expansion'}).current.halfMaximum,q=scan(b,null,{radius:4,metric:'expansion'}).current.halfMaximum;
    expect(q.from/p.from).toBeCloseTo(2,8);expect(q.to/p.to).toBeCloseTo(2,8);expect(q.span/p.span).toBeCloseTo(2,8);expect(q.value/p.value).toBeCloseTo(8,8);expect(p.span).toBe(p.to-p.from);
  });

  it('compares distinct aperture candidates on usable half-millimeter steps while retaining the current size',()=>{
    const m=model({});
    for(const [radius,radii,kinds] of [[.5,[.5,1],['current','larger']],[30,[15,30],['smaller','current']],[10.5,[5.5,10.5,21],['smaller','current','larger']],[7.25,[3.5,7.25,14.5],['smaller','current','larger']]]){
      const study=apertureStudy(m,{radius,metric:'energy'});
      expect(study.curves.map(c=>c.radius*1000)).toEqual(radii);expect(study.curves.map(c=>c.kind)).toEqual(kinds);
      expect(new Set(study.curves.map(c=>c.radius)).size).toBe(study.curves.length);
      for(const c of study.curves){expect(c.radius).toBeGreaterThanOrEqual(.0005);expect(c.radius).toBeLessThanOrEqual(.03);expect(c.areaRatio).toBeCloseTo((c.radius/(radius/1000))**2,12);if(c.kind!=='current')expect(c.radius*2000).toBeCloseTo(Math.round(c.radius*2000),12);}
    }
    for(const [radius,current] of [[undefined,10],[NaN,10],[-1,.5],[Infinity,10],[999,30]])expect(apertureStudy(m,{radius}).curves.find(c=>c.kind==='current').radius).toBe(current/1000);
  });

  it('gives aperture alternatives one physical linear axis and an exact shared zero endpoint',()=>{
    for(const metric of ['energy','mass','expansion'])for(const setup of [{},{diameter:.2,spread:0,gap:2},{diameter:12,spread:30,gap:20}]){
      const m=model(setup),study=apertureStudy(m,{radius:10,metric});
      expect(study.metric).toBe(metric);expect(study.unit).toBe(metric==='mass'?'mg':'J');expect(study.axis.mode).toBe('linear');expect(study.axis.high).toBe(study.high);
      expect(study.maxOffset).toBe(m.wallRadius+.02);
      expect(study.high).toBe(Math.max(...[5,10,20].map(radius=>scan(m,null,{radius,metric,scale:'linear'}).high)));
      for(const c of study.curves){
        const direct=scan(m,null,{radius:c.radius*1000,metric,scale:'linear'}).current;
        expect(c.maximum).toEqual(direct.maximum);expect(c.halfMaximum).toEqual(direct.halfMaximum);
        expect(c.samples[0].offset).toBe(0);expect(c.samples.at(-1)).toEqual({offset:study.maxOffset,value:0});
        for(let i=0;i<c.samples.length;i++){const p=c.samples[i];expect(Number.isFinite(p.offset)&&Number.isFinite(p.value)).toBe(true);expect(p.value).toBeGreaterThanOrEqual(0);expect(p.value).toBeLessThanOrEqual(study.high);if(i)expect(p.offset).toBeGreaterThan(c.samples[i-1].offset);}
      }
    }
  });

  it('keeps study readings physical as larger apertures collect nested regions at the same offset',()=>{
    for(const metric of ['energy','mass','expansion'])for(const radius of [.5,10.5,30]){
      const m=model({gap:20,material:'steel'}),study=apertureStudy(m,{radius,metric}),reading=p=>metric==='mass'?p.mass*1e6:metric==='expansion'?p.expansion:p.energy;
      for(const c of study.curves)for(const p of c.samples){const value=reading(detector(m,null,{radius:c.radius*1000,offset:p.offset*1000}).current);expect(p.value).toBeCloseTo(value,10);}
      for(const fraction of [0,.1,.5,.9,1]){
        const values=study.curves.map(c=>reading(detector(m,null,{radius:c.radius*1000,offset:study.maxOffset*fraction*1000}).current));
        for(let i=1;i<values.length;i++)expect(values[i]+Math.max(1,values[i])*1e-10).toBeGreaterThanOrEqual(values[i-1]);
      }
      for(let i=1;i<study.curves.length;i++)expect(study.curves[i].maximum.value+Math.max(1,study.curves[i].maximum.value)*1e-10).toBeGreaterThanOrEqual(study.curves[i-1].maximum.value);
    }
  });

  it('shows area and radial-energy weighting instead of normalizing every aperture curve',()=>{
    const m=model({}),mass=apertureStudy(m,{radius:2,metric:'mass'}),sideways=apertureStudy(m,{radius:2,metric:'expansion'});
    for(let i=1;i<3;i++){
      expect(mass.curves[i].samples[0].value/mass.curves[i-1].samples[0].value).toBeCloseTo(4,12);
      expect(sideways.curves[i].samples[0].value/sideways.curves[i-1].samples[0].value).toBeCloseTo(16,12);
      expect(mass.curves[i].areaRatio/mass.curves[i-1].areaRatio).toBe(4);
    }
    for(const c of sideways.curves){expect(c.halfMaximum.value).toBe(c.maximum.value/2);expect(c.halfMaximum.span).toBe(c.halfMaximum.to-c.halfMaximum.from);}
    expect(new Set(sideways.curves.map(c=>c.halfMaximum.value)).size).toBe(3);
  });

  it('keeps aperture studies independent of a saved design or scan compression and handles zero energy',()=>{
    const m=model({}),options={radius:10,metric:'expansion'},plain=apertureStudy(m,options),before=JSON.stringify(m);
    expect(apertureStudy(m,{...options,scale:'softlog',reference:model({diameter:12,gap:2})})).toEqual(plain);expect(JSON.stringify(m)).toBe(before);
    expect(apertureStudy(m,{radius:10,metric:'invalid'})).toEqual(apertureStudy(m,{radius:10,metric:'energy'}));
    const zero=apertureStudy(model({spread:0}),options);expect(zero.high).toBe(1);expect(zero.axis.mode).toBe('linear');
    for(const c of zero.curves){expect(c.maximum.kind).toBe('zero');expect(c.maximum.value).toBe(0);expect(c.halfMaximum).toBeNull();expect(c.samples.every(p=>p.value===0)).toBe(true);}
  });

  it('evaluates every aperture candidate at one physical comparison offset for all metrics and extreme setups',()=>{
    for(const setup of [{},{diameter:.2,spread:0,gap:2},{diameter:12,spread:30,gap:20,material:'steel'}])for(const radius of [.5,10.5,30])for(const metric of ['energy','mass','expansion']){
      const m=model(setup),base=apertureStudy(m,{radius,metric});
      for(const fraction of [0,.37,.9,1]){
        const study=apertureStudy(m,{radius,metric,offset:base.maxOffset*fraction*1000});
        expect(study.offset).toBeCloseTo(base.maxOffset*fraction,14);
        let previous=-Infinity;
        for(const c of study.curves){
          const exact=detector(m,null,{radius:c.radius*1000,offset:study.offset*1000}).current;
          const value=metric==='mass'?exact.mass*1e6:metric==='expansion'?exact.expansion:exact.energy;
          expect(c.reading).toBeCloseTo(value,10);expect(c.coverage).toBeCloseTo(exact.coverage,12);
          expect(Number.isFinite(c.reading)&&Number.isFinite(c.coverage)).toBe(true);expect(c.coverage).toBeGreaterThanOrEqual(0);expect(c.coverage).toBeLessThanOrEqual(1+1e-10);
          expect(c.reading+Math.max(1,c.reading)*1e-10).toBeGreaterThanOrEqual(previous);previous=c.reading;
          if(fraction===1){expect(c.reading).toBe(0);expect(c.coverage).toBe(0);}
        }
      }
    }
  });

  it('clamps comparison probes to their own complete domain with exact endpoints and finite defaults',()=>{
    const m=model({}),base=apertureStudy(m,{radius:10}),max=base.maxOffset*1000;
    for(const offset of [undefined,NaN,Infinity,-Infinity,'bad',-1])expect(apertureStudy(m,{radius:10,offset}).offset).toBe(0);
    for(const offset of [max,max+1,1e9])expect(apertureStudy(m,{radius:10,offset}).offset).toBe(base.maxOffset);
    const exact=12.3456789012345;expect(apertureStudy(m,{radius:10,offset:exact}).offset).toBe(exact/1000);
    const beyondMain=(m.wallRadius+.015)*1000,study=apertureStudy(m,{radius:10,offset:beyondMain});
    expect(study.offset).toBeGreaterThan(detector(m,null,{radius:10}).maxOffset);expect(study.curves.find(c=>c.kind==='current').reading).toBe(0);expect(study.curves.find(c=>c.kind==='larger').reading).toBeGreaterThan(0);
  });

  it('preserves comparison curves, peak measurements and scales when only its probe moves',()=>{
    const m=model({}),before=JSON.stringify(m),options={radius:10,metric:'expansion'};
    const geometry=study=>{const {offset,curves,...rest}=study;return {...rest,curves:curves.map(({reading,totalReading,coverage,...c})=>c)};};
    const base=apertureStudy(m,options);
    for(const offset of [0,7.123,base.maxOffset*400,base.maxOffset*1000]){
      const moved=apertureStudy(m,{...options,offset});expect(geometry(moved)).toEqual(geometry(base));
      expect(apertureStudy(m,{...options,offset,scale:'softlog',reference:model({diameter:12,gap:20})})).toEqual(moved);
    }
    expect(JSON.stringify(m)).toBe(before);
  });

  it('keeps zero sideways signal distinct from aperture coverage and preserves physical center weighting',()=>{
    const zero=apertureStudy(model({spread:0}),{radius:10,metric:'expansion',offset:0});
    for(const c of zero.curves){expect(c.reading).toBe(0);expect(c.coverage).toBeGreaterThan(0);expect(c.coverage).toBeLessThanOrEqual(1);}
    const m=model({}),mass=apertureStudy(m,{radius:2,metric:'mass',offset:0}),energy=apertureStudy(m,{radius:2,metric:'expansion',offset:0});
    for(let i=1;i<3;i++){expect(mass.curves[i].reading/mass.curves[i-1].reading).toBeCloseTo(4,12);expect(energy.curves[i].reading/energy.curves[i-1].reading).toBeCloseTo(16,12);expect(mass.curves[i].coverage).toBeCloseTo(1,12);}
  });

  it('averages forward energy and mass over the full aperture area inside a uniform cloud',()=>{
    const m=model({}),d=.007;
    for(const metric of ['energy','mass']){
      const study=apertureStudy(m,{radius:2,metric,basis:'area',offset:d*1000});
      const density=(metric==='mass'?m.mass*1e6:m.translation)/(Math.PI*m.wallRadius**2*1e4);
      expect(study.basis).toBe('area');expect(study.unit).toBe(metric==='mass'?'mg/cm²':'J/cm²');
      for(const c of study.curves){
        expect(c.radius+d).toBeLessThan(m.wallRadius);expect(c.coverage).toBeCloseTo(1,12);
        expect(c.areaCm2).toBeCloseTo(Math.PI*c.radius**2*1e4,14);expect(c.areaCm2).toBeGreaterThan(0);
        expect(c.reading/density).toBeCloseTo(1,12);expect(c.totalReading/(density*c.areaCm2)).toBeCloseTo(1,12);
      }
    }
  });

  it('retains the radial velocity weighting when averaging sideways energy over different aperture sizes',()=>{
    const m=model({}),R=m.wallRadius;
    for(const d of [0,.007]){
      const study=apertureStudy(m,{radius:2,metric:'expansion',basis:'area',offset:d*1000});
      for(const c of study.curves){
        const expected=m.expansion*(2*d*d+c.radius*c.radius)/(Math.PI*R**4*1e4);
        expect(c.radius+d).toBeLessThan(R);expect(c.reading/expected).toBeCloseTo(1,12);
      }
      if(d===0)for(let i=1;i<study.curves.length;i++)expect(study.curves[i].reading/study.curves[i-1].reading).toBeCloseTo(4,12);
    }
  });

  it('includes empty aperture area in averages for partial overlap and for apertures enclosing the cloud',()=>{
    const m=model({}),offset=m.wallRadius*1000;
    for(const metric of ['energy','mass']){
      const study=apertureStudy(m,{radius:10,metric,basis:'area',offset}),density=(metric==='mass'?m.mass*1e6:m.translation)/(m.wallArea*1e4);
      for(const c of study.curves){
        expect(c.coverage).toBeGreaterThan(0);expect(c.coverage).toBeLessThan(1);
        expect(c.reading/(density*c.coverage)).toBeCloseTo(1,12);expect(c.reading).toBeLessThan(density);
      }
    }
    const compact=model({gap:2});
    for(const metric of ['energy','mass','expansion']){
      const study=apertureStudy(compact,{radius:30,metric,basis:'area',offset:2}),whole=metric==='mass'?compact.mass*1e6:metric==='expansion'?compact.expansion:compact.translation;
      for(const c of study.curves){
        expect(c.radius).toBeGreaterThan(compact.wallRadius+.002);expect(c.coverage).toBeLessThan(1);
        expect(c.reading/(whole/(Math.PI*c.radius*c.radius*1e4))).toBeCloseTo(1,12);expect(c.totalReading/whole).toBeCloseTo(1,12);
      }
      expect(study.curves[1].reading/study.curves[0].reading).toBeCloseTo(.25,12);
    }
  });

  it('changes aperture-study ordinate units without moving physical maxima, half-height crossings or the probe',()=>{
    for(const metric of ['energy','mass','expansion'])for(const setup of [{},{diameter:.2,spread:0,gap:2},{diameter:12,spread:30,gap:20,material:'steel'}]){
      const m=model(setup),options={radius:10.5,metric,offset:17.123456789},before=JSON.stringify(m),total=apertureStudy(m,options),area=apertureStudy(m,{...options,basis:'area'});
      expect(total.basis).toBe('total');expect(area.offset).toBe(total.offset);expect(area.maxOffset).toBe(total.maxOffset);expect(area.axis.mode).toBe('linear');expect(area.axis.high).toBe(area.high);expect(area.high).toBeGreaterThan(0);
      for(let i=0;i<total.curves.length;i++){
        const a=area.curves[i],t=total.curves[i],factor=t.areaCm2;
        for(const key of ['radius','kind','coverage','areaRatio'])expect(a[key]).toBe(t[key]);
        expect(a.totalReading).toBe(t.reading);expect(a.reading).toBeCloseTo(t.reading/factor,12);
        expect(a.maximum).toEqual({...t.maximum,value:t.maximum.value/factor});
        expect(a.halfMaximum).toEqual(t.halfMaximum?{...t.halfMaximum,value:t.halfMaximum.value/factor}:null);
        expect(a.samples).toEqual(t.samples.map(p=>({...p,value:p.value/factor})));
        expect(a.maximum.value).toBeLessThanOrEqual(area.high);expect(a.reading).toBeLessThanOrEqual(area.high);
        expect(a.samples.every(p=>Number.isFinite(p.value)&&p.value>=0&&p.value<=area.high)).toBe(true);
      }
      expect(JSON.stringify(m)).toBe(before);expect(apertureStudy(m,{...options,basis:'area',scale:'softlog',reference:model({gap:20})})).toEqual(area);
    }
  });

  it('keeps per-area study readings finite at minimum radii, outside the cloud and at zero sideways energy',()=>{
    for(const radius of [.5,30])for(const metric of ['energy','mass','expansion']){
      const m=model({}),study=apertureStudy(m,{radius,metric,basis:'area',offset:1e9});
      for(const c of study.curves){expect(c.areaCm2).toBeGreaterThan(0);expect(c.reading).toBe(0);expect(c.totalReading).toBe(0);expect(c.coverage).toBe(0);expect(c.samples.at(-1).value).toBe(0);}
    }
    const m=model({spread:0}),zero=apertureStudy(m,{radius:.5,metric:'expansion',basis:'area'});
    expect(zero.high).toBe(1);expect(zero.unit).toBe('J/cm²');
    for(const c of zero.curves){expect(c.reading).toBe(0);expect(c.maximum.kind).toBe('zero');expect(c.maximum.value).toBe(0);expect(c.halfMaximum).toBeNull();expect(c.samples.every(p=>p.value===0)).toBe(true);}
    const options={radius:10,metric:'mass',offset:12},total=apertureStudy(m,options);
    for(const basis of [undefined,null,false,'AREA','overlap','',0,{}])expect(apertureStudy(m,{...options,basis})).toEqual(total);
  });

  it('fits the cloud and every aperture at all probe positions with one fixed physical map scale',()=>{
    for(const setup of [{},{diameter:.2,spread:0,gap:2},{diameter:12,spread:30,gap:20}])for(const radius of [.5,10.5,30]){
      const m=model(setup),base=apertureStudy(m,{radius}),initial=apertureLayout(m,base),maxRadius=Math.max(...base.curves.map(c=>c.radius)),left=Math.max(m.wallRadius,maxRadius);
      expect(initial.width).toBe(600);expect(initial.height).toBe(280);expect(initial.cy).toBe(140);expect(initial.maxRadius).toBe(maxRadius);expect(initial.scale).toBeGreaterThan(0);expect(Number.isFinite(initial.scale)).toBe(true);
      expect(initial.cloudRadius).toBe(m.wallRadius*initial.scale);
      expect(initial.cx-left*initial.scale).toBeGreaterThanOrEqual(24-1e-10);expect(initial.cx+(base.maxOffset+maxRadius)*initial.scale).toBeLessThanOrEqual(576+1e-10);
      expect(initial.cy-left*initial.scale).toBeGreaterThanOrEqual(24-1e-10);expect(initial.cy+left*initial.scale).toBeLessThanOrEqual(256+1e-10);
      for(const fraction of [0,.37,1]){
        const study=apertureStudy(m,{radius,offset:base.maxOffset*fraction*1000}),layout=apertureLayout(m,study);
        expect(layout.scale).toBe(initial.scale);expect(layout.cx).toBe(initial.cx);expect(layout.cy).toBe(initial.cy);expect(layout.cloudRadius).toBe(initial.cloudRadius);
        expect((layout.apertureX-layout.cx)/layout.scale).toBeCloseTo(study.offset,14);
        for(const c of study.curves){const r=c.radius*layout.scale;expect(layout.apertureX-r).toBeGreaterThanOrEqual(24-1e-10);expect(layout.apertureX+r).toBeLessThanOrEqual(576+1e-10);expect(layout.cy-r).toBeGreaterThanOrEqual(24-1e-10);expect(layout.cy+r).toBeLessThanOrEqual(256+1e-10);}
      }
    }
  });

  it('keeps comparison-map geometry independent of units, curve normalization and selected energy component',()=>{
    const m=model({}),before=JSON.stringify(m),options={radius:10.5,offset:17.123456789},expected=apertureLayout(m,apertureStudy(m,options));
    for(const metric of ['energy','mass','expansion'])for(const basis of ['total','area']){
      const study=apertureStudy(m,{...options,metric,basis}),snapshot=JSON.stringify(study);
      expect(apertureLayout(m,study)).toEqual(expected);expect(JSON.stringify(study)).toBe(snapshot);
    }
    expect(JSON.stringify(m)).toBe(before);
  });

  it('follows incoming and expanding transverse radii without reporting wall coverage before arrival',()=>{
    const m=model({}),study=apertureStudy(m,{radius:10,metric:'expansion',offset:12}),gap=m.config.gap/100;
    const cases=[[0,'approach',m.radius,gap+m.config.approach],[m.impactUs/2,'approach',m.radius,gap+m.config.approach/2],[m.impactUs,'impact',m.radius,gap],[m.impactUs+m.flightUs/2,'cloud',(m.radius+m.wallRadius)/2,gap/2],[m.arrivalUs,'contact',m.wallRadius,0]];
    for(const [time,phase,radius,distance] of cases){
      const frame=apertureView(m,study,time,'clock');expect(frame.mode).toBe('clock');expect(frame.state.time).toBe(time);expect(frame.state.phase).toBe(phase);expect(frame.radius).toBeCloseTo(radius,14);expect(frame.distanceToWall).toBeCloseTo(distance,14);expect(frame.remainingUs).toBeCloseTo(m.arrivalUs-time,12);
      expect(frame.field).toBe(phase==='approach'?'incoming':'radial');expect(frame.arrived).toBe(phase==='contact');
      if(phase==='contact'){expect(frame.radius).toBe(m.wallRadius);expect(frame.coverage).toBe(study.curves.find(c=>c.kind==='current').coverage);expect(frame.distanceToWall).toBe(0);expect(frame.remainingUs).toBe(0);}else expect(frame.coverage).toBeNull();
    }
  });

  it('keeps the default aperture view at first contact and clamps invalid follow-clock times without mutating predictions',()=>{
    const m=model({}),study=apertureStudy(m,{radius:10,metric:'mass',offset:14}),before=JSON.stringify({m,study}),expected=apertureView(m,study,m.arrivalUs,'clock');
    for(const mode of [undefined,null,'contact','invalid','CLOCK',false])for(const time of [0,m.impactUs,-1,NaN,Infinity]){
      const frame=apertureView(m,study,time,mode);expect(frame).toEqual({...expected,mode:'contact'});expect(frame.arrived).toBe(true);expect(frame.radius).toBe(m.wallRadius);
    }
    for(const time of [undefined,NaN,Infinity,-Infinity,-1]){const frame=apertureView(m,study,time,'clock');expect(frame.state.time).toBe(0);expect(frame.state.phase).toBe('approach');expect(frame.coverage).toBeNull();expect(Number.isFinite(frame.radius)&&Number.isFinite(frame.distanceToWall)&&Number.isFinite(frame.remainingUs)).toBe(true);}
    const after=apertureView(m,study,m.arrivalUs+100,'clock');expect(after).toEqual(expected);expect(JSON.stringify({m,study})).toBe(before);
  });

  it('distinguishes sideways spread from arrival and uses an incoming particle cue across all prediction metrics',()=>{
    for(const spread of [0,10])for(const metric of ['energy','mass','expansion']){
      const m=model({spread}),study=apertureStudy(m,{radius:.5,metric,basis:'area'}),incoming=apertureView(m,study,0,'clock'),flight=apertureView(m,study,m.impactUs+m.flightUs/2,'clock'),contact=apertureView(m,study,m.arrivalUs,'clock');
      expect(incoming.field).toBe('incoming');expect(incoming.radius).toBe(m.radius);expect(incoming.coverage).toBeNull();expect(flight.arrived).toBe(false);expect(flight.coverage).toBeNull();expect(flight.distanceToWall).toBeGreaterThan(0);expect(flight.remainingUs).toBeGreaterThan(0);
      expect(flight.field).toBe(metric==='expansion'?(spread===0?'zero':'radial'):'uniform');expect(contact.field).toBe(flight.field);expect(contact.arrived).toBe(true);expect(contact.coverage).toBe(study.curves.find(c=>c.kind==='current').coverage);
      if(spread===0){expect(flight.radius).toBe(m.radius);expect(contact.radius).toBe(m.radius);}else{expect(flight.radius).toBeGreaterThan(m.radius);expect(flight.radius).toBeLessThan(m.wallRadius);}
    }
  });

  it('inverts the two axial speeds continuously through bumper contact with exact flight endpoints',()=>{
    for(const setup of [{},{diameter:.2,speed:7,bumper:2,gap:2,spread:0},{diameter:12,speed:15,material:'steel',gap:20,spread:30}]){
      const m=model(setup),gap=m.config.gap/100;
      expect(flightTime(m,-m.config.approach)).toBe(0);expect(flightTime(m,0)).toBe(m.impactUs);expect(flightTime(m,gap)).toBe(m.arrivalUs);
      for(const time of [0,m.impactUs/2,m.impactUs,m.impactUs+m.flightUs/2,m.arrivalUs])expect(flightTime(m,inspect(m,time).x)).toBeCloseTo(time,11);
      expect(flightTime(m,-m.config.approach/2)).toBeCloseTo(m.impactUs/2,12);expect(flightTime(m,gap/2)).toBeCloseTo(m.impactUs+m.flightUs/2,12);
      const epsilon=1e-10,left=flightTime(m,-epsilon),right=flightTime(m,epsilon);
      expect(left).toBeLessThan(m.impactUs);expect(right).toBeGreaterThan(m.impactUs);expect(m.impactUs-left).toBeCloseTo(epsilon/(m.config.speed*1000)*1e6,12);expect(right-m.impactUs).toBeCloseTo(epsilon/m.axial*1e6,12);
      expect(flightTime(m,-1e6)).toBe(0);expect(flightTime(m,1e6)).toBe(m.arrivalUs);
      for(const invalid of [undefined,NaN,Infinity,-Infinity,'bad'])expect(flightTime(m,invalid)).toBe(m.impactUs);
    }
  });

  it('fits the side-view particle, cloud envelope and offset aperture slice at a fixed equal scale',()=>{
    for(const setup of [{},{diameter:.2,spread:0,gap:2},{diameter:12,spread:30,gap:20}])for(const radius of [.5,10.5,30]){
      const m=model(setup),base=apertureStudy(m,{radius}),initial=flightSection(m,base,apertureView(m,base,0,'clock'));
      expect(initial.width).toBe(600);expect(initial.height).toBe(260);expect(initial.scale).toBeGreaterThan(0);expect(Number.isFinite(initial.scale)).toBe(true);
      expect(initial.startX-m.radius*initial.scale).toBeGreaterThanOrEqual(24-1e-10);expect(initial.wallX+m.radius*initial.scale).toBeLessThanOrEqual(576+1e-10);
      expect((initial.wallX-initial.bx)/initial.scale).toBeCloseTo(m.config.gap/100,14);expect((initial.bx-initial.startX)/initial.scale).toBeCloseTo(m.config.approach,14);
      for(const fraction of [0,.37,1]){
        const study=apertureStudy(m,{radius,offset:base.maxOffset*fraction*1000});
        for(const time of [0,m.impactUs,m.impactUs+m.flightUs/2,m.arrivalUs]){
          const frame=apertureView(m,study,time,'clock'),layout=flightSection(m,study,frame);
          for(const key of ['scale','bx','cy','startX','wallX','wallRadius'])expect(layout[key]).toBe(initial[key]);
          expect(layout.cloudRadius).toBe(frame.radius*layout.scale);expect(layout.wallRadius).toBe(m.wallRadius*layout.scale);
          expect(layout.apertureRadius).toBe(radius/1000*layout.scale);expect((layout.cy-layout.apertureY)/layout.scale).toBeCloseTo(study.offset,14);
          expect(layout.apertureY-layout.apertureRadius).toBeGreaterThanOrEqual(28-1e-10);expect(layout.apertureY+layout.apertureRadius).toBeLessThanOrEqual(232+1e-10);
          expect(layout.cy-layout.cloudRadius).toBeGreaterThanOrEqual(28-1e-10);expect(layout.cy+layout.cloudRadius).toBeLessThanOrEqual(232+1e-10);
          expect((layout.cloudX-layout.bx)/layout.scale).toBeCloseTo(frame.arrived?m.config.gap/100:frame.state.x,14);
          if(frame.arrived)expect(layout.cloudX).toBe(layout.wallX);
        }
      }
    }
  });

  it('keeps flight-section geometry independent of prediction units and leaves every physical input unchanged',()=>{
    const m=model({}),options={radius:10.5,offset:17.123456789},time=m.impactUs+m.flightUs/2,base=apertureStudy(m,options),expected=flightSection(m,base,apertureView(m,base,time,'clock'));
    for(const metric of ['energy','mass','expansion'])for(const basis of ['total','area']){
      const study=apertureStudy(m,{...options,metric,basis}),frame=apertureView(m,study,time,'clock'),before=JSON.stringify({m,study,frame});
      expect(flightSection(m,study,frame)).toEqual(expected);expect(JSON.stringify({m,study,frame})).toBe(before);
    }
  });

  it('switches forward and radial edge speeds exactly at impact and preserves them through the model endpoint',()=>{
    for(const setup of [{},{diameter:.2,speed:7,bumper:2,gap:2,spread:0},{diameter:12,speed:15,material:'steel',gap:20,spread:30}]){
      const m=model(setup),before=JSON.stringify(m),incoming=m.config.speed*1000;
      for(const time of [0,m.impactUs/2,m.impactUs-1e-8,m.impactUs,m.impactUs+m.flightUs/2,m.arrivalUs]){
        const v=velocity(m,time),after=time>=m.impactUs;
        expect(v.time).toBe(time);expect(v.phase).toBe(inspect(m,time).phase);expect(v.impactUs).toBe(m.impactUs);expect(v.arrivalUs).toBe(m.arrivalUs);expect(v.pre).toEqual({axial:incoming,radial:0});expect(v.post).toEqual({axial:m.axial,radial:m.radial});
        expect(v.axial).toBe(after?m.axial:incoming);expect(v.radial).toBe(after?m.radial:0);expect(v.axial).toBeGreaterThan(0);
        expect(m.mass*v.post.axial/m.momentum).toBeCloseTo(1,12);expect(.25*m.mass*v.post.radial**2).toBeCloseTo(m.expansion,9);
      }
      const contact=velocity(m,m.arrivalUs);expect(contact.axial).toBe(m.axial);expect(contact.radial).toBe(m.radial);expect(JSON.stringify(m)).toBe(before);
    }
  });

  it('gives speed histories one finite rounded physical scale and clamps stale clock values without inventing wall braking',()=>{
    for(const setup of [{},{diameter:.2,speed:15,bumper:2,spread:30},{diameter:12,speed:7,spread:0}]){
      const m=model(setup),atStart=velocity(m,0),atWall=velocity(m,m.arrivalUs),largest=Math.max(m.config.speed*1000,m.radial);
      expect(atStart.high).toBeGreaterThanOrEqual(largest*1.04);expect(atStart.high).toBeLessThan(largest*1.04+2000);expect(atStart.high%2000).toBe(0);expect(atStart.high).toBe(atWall.high);expect(Number.isFinite(atStart.high)).toBe(true);
      for(const invalid of [undefined,NaN,Infinity,-Infinity,'bad',-1])expect(velocity(m,invalid)).toEqual(atStart);
      for(const time of [m.arrivalUs,m.arrivalUs+1,1e9])expect(velocity(m,time)).toEqual(atWall);
      if(m.config.spread===0){expect(atStart.radial).toBe(0);expect(atWall.radial).toBe(0);expect(atWall.axial).toBeGreaterThan(0);}
    }
  });

  it('balances the whole impact mass, forward momentum and kinetic-energy partition across physical extremes',()=>{
    for(const setup of [{},{diameter:.2,speed:7,bumper:2,gap:2,spread:0,material:'glass'},{diameter:12,speed:15,bumper:.2,gap:20,spread:30,material:'steel'}]){
      const m=model(setup),b=budget(m,m.impactUs),incomingSpeed=m.config.speed*1000,before=JSON.stringify(m);
      expect(b.mass).toEqual({projectile:m.projectile,plug:m.plug,total:m.mass});expect(b.mass.total).toBe(b.mass.projectile+b.mass.plug);
      expect(b.momentum.before/(b.mass.projectile*incomingSpeed)).toBeCloseTo(1,12);expect(b.momentum.after/(b.mass.total*m.axial)).toBeCloseTo(1,12);expect(b.momentum.after/b.momentum.before).toBeCloseTo(1,12);
      expect(b.energy.incoming/(.5*b.mass.projectile*incomingSpeed**2)).toBeCloseTo(1,12);expect(b.energy.forward/(.5*b.mass.total*m.axial**2)).toBeCloseTo(1,12);
      expect(b.energy.radial).toBeCloseTo(.25*b.mass.total*m.radial**2,9);expect(b.energy.total/b.energy.incoming).toBeCloseTo(1,12);expect(b.energy.available).toBe(b.energy.incoming-b.energy.forward);
      for(const component of ['forward','radial','internal']){expect(b.energy[component]).toBeGreaterThanOrEqual(0);expect(b.fractions[component]).toBe(b.energy[component]/b.energy.incoming);}
      expect(b.fractions.forward+b.fractions.radial+b.fractions.internal).toBeCloseTo(1,12);expect(b.retainedSpeed).toBe(m.axial/incomingSpeed);expect(b.retainedSpeed).toBeCloseTo(1/(1+b.addedMassRatio),12);expect(b.addedMassRatio).toBe(m.plug/m.projectile);expect(JSON.stringify(m)).toBe(before);
    }
  });

  it('applies the spread percentage to available collision energy while preserving literal zero radial energy',()=>{
    for(const spread of [0,10,30]){
      const m=model({spread}),b=budget(m,m.impactUs);
      expect(b.energy.radial/b.energy.available).toBeCloseTo(spread/100,12);expect(b.energy.internal/b.energy.available).toBeCloseTo(1-spread/100,12);
      expect(b.fractions.radial).toBeCloseTo((1-b.fractions.forward)*spread/100,12);expect(b.energy.internal+b.energy.radial).toBeCloseTo(b.energy.available,12);
      if(spread===0){expect(b.energy.radial).toBe(0);expect(b.fractions.radial).toBe(0);}else expect(b.fractions.radial).toBeLessThan(spread/100);
    }
  });

  it('changes only the budget phase at bumper contact and clamps invalid or out-of-range inspection times',()=>{
    const m=model({}),reference=budget(m,0),quantities=({time,phase,after,...rest})=>rest;
    for(const [time,phase,after] of [[0,'approach',false],[m.impactUs-1e-8,'approach',false],[m.impactUs,'impact',true],[m.impactUs+m.flightUs/2,'cloud',true],[m.arrivalUs,'contact',true]]){
      const b=budget(m,time);expect(b.time).toBe(time);expect(b.phase).toBe(phase);expect(b.after).toBe(after);expect(quantities(b)).toEqual(quantities(reference));
    }
    for(const time of [undefined,NaN,Infinity,-Infinity,'bad',-1])expect(budget(m,time)).toEqual(reference);expect(budget(m,m.arrivalUs+1)).toEqual(budget(m,m.arrivalUs));
  });

  it('tracks a material-following radius with orthogonal forward and radial velocity components',()=>{
    for(const setup of [{},{diameter:.2,speed:7,bumper:2,spread:30},{diameter:12,speed:15,material:'steel',spread:30}]){
      const m=model(setup),before=JSON.stringify(m);
      for(const percent of [0,25,50,100])for(const time of [m.impactUs,m.impactUs+m.flightUs/2,m.arrivalUs]){
        const p=motion(m,time,percent),f=percent/100,state=inspect(m,time);
        expect(p.time).toBe(time);expect(p.phase).toBe(state.phase);expect(p.after).toBe(true);expect(p.fraction).toBe(f);expect(p.cloudRadius).toBe(state.radius);expect(p.radius).toBe(state.radius*f);expect(p.forward).toBe(m.axial);expect(p.radial).toBe(m.radial*f);
        expect(p.speed*p.speed/(p.forward*p.forward+p.radial*p.radial)).toBeCloseTo(1,12);expect(p.angle).toBeCloseTo(Math.atan2(p.radial,p.forward)*180/Math.PI,12);expect(p.angle).toBeGreaterThanOrEqual(0);expect(p.angle).toBeLessThan(90);
        if(percent===0){expect(p.radius).toBe(0);expect(p.radial).toBe(0);expect(p.angle).toBe(0);expect(p.speed).toBe(p.forward);}
      }
      expect(JSON.stringify(m)).toBe(before);
    }
  });

  it('keeps incoming motion distinct from pending cloud samples and preserves zero-spread radial motion exactly',()=>{
    for(const spread of [0,10]){
      const m=model({spread});
      for(const percent of [0,50,100]){
        const incoming=motion(m,m.impactUs/2,percent),after=motion(m,m.impactUs,percent);
        expect(incoming.after).toBe(false);expect(incoming.radius).toBeNull();expect(incoming.cloudRadius).toBe(m.radius);expect(incoming.forward).toBe(m.config.speed*1000);expect(incoming.radial).toBe(0);expect(incoming.speed).toBe(incoming.forward);expect(incoming.angle).toBe(0);expect(incoming.fraction).toBe(percent/100);
        expect(after.after).toBe(true);expect(after.radius).toBe(m.radius*percent/100);expect(after.forward).toBe(m.axial);
        if(spread===0){const wall=motion(m,m.arrivalUs,percent);expect(wall.radial).toBe(0);expect(wall.angle).toBe(0);expect(wall.speed).toBe(m.axial);expect(wall.radius).toBe(m.radius*percent/100);}
      }
    }
  });

  it('sanitizes material-radius preferences and clock values while keeping one fixed velocity scale',()=>{
    const m=model({}),high=motion(m,0,50).high,maximum=Math.max(m.config.speed*1000,m.radial);
    expect(high).toBeGreaterThanOrEqual(maximum);expect(high).toBeLessThan(maximum+2000);expect(high%2000).toBe(0);
    for(const [percent,fraction] of [[undefined,.5],[NaN,.5],[Infinity,.5],[-Infinity,.5],['bad',.5],[-1,0],[101,1],[37.125,.37125]]){
      for(const time of [0,m.impactUs,m.arrivalUs]){const p=motion(m,time,percent);expect(p.fraction).toBe(fraction);expect(p.high).toBe(high);expect(Number.isFinite(p.forward)&&Number.isFinite(p.radial)&&Number.isFinite(p.speed)&&Number.isFinite(p.angle)).toBe(true);}
    }
    for(const time of [undefined,NaN,Infinity,-Infinity,'bad',-1])expect(motion(m,time,37)).toEqual(motion(m,0,37));expect(motion(m,m.arrivalUs+100,37)).toEqual(motion(m,m.arrivalUs,37));
  });

  it('projects material trajectories with equal spatial axes and a remaining distance consistent with sample velocity',()=>{
    for(const setup of [{},{diameter:.2,speed:7,gap:2,bumper:2,spread:30},{diameter:12,speed:15,material:'steel',gap:20,spread:30}]){
      const m=model(setup),original=JSON.stringify(m);
      for(const percent of [0,37,50,100])for(const time of [m.impactUs,m.impactUs+m.flightUs/2,m.arrivalUs]){
        const path=materialPath(m,time,percent),sample=motion(m,time,percent),f=percent/100;
        expect(path.time).toBe(time);expect(path.phase).toBe(sample.phase);expect(path.after).toBe(true);expect(path.fraction).toBe(f);expect(path.initialRadius).toBe(f*m.radius);expect(path.landingRadius).toBe(f*m.wallRadius);
        expect(path.sampleX).toBe(time===m.arrivalUs?(m.config.gap/100):inspect(m,time).x);expect(path.sampleRadius).toBe(time===m.arrivalUs?path.landingRadius:sample.radius);expect(path.remainingUs).toBe(m.arrivalUs-time);
        expect(path.totalDistance).toBeCloseTo(Math.hypot((m.config.gap/100),path.landingRadius-path.initialRadius),12);expect(path.remainingDistance).toBeCloseTo(Math.hypot((m.config.gap/100)-path.sampleX,path.landingRadius-path.sampleRadius),12);
        expect(path.remainingDistance).toBeCloseTo(sample.speed*path.remainingUs*1e-6,12);expect((path.landingRadius-path.initialRadius)/(m.config.gap/100)).toBeCloseTo(sample.radial/sample.forward,12);
        expect(path.scale).toBe(Math.min(220/(m.config.gap/100),160/(2*m.wallRadius)));expect(path.wallX-path.bumperX).toBeCloseTo((m.config.gap/100)*path.scale,12);expect(path.bumperX).toBeCloseTo((300-(m.config.gap/100)*path.scale)/2,12);expect(path.cy).toBe(120);
        if(time===m.arrivalUs){expect(path.remainingUs).toBe(0);expect(path.remainingDistance).toBe(0);}
      }
      expect(JSON.stringify(m)).toBe(original);
    }
  });

  it('keeps material arrival predictions separate from pending samples and preserves parallel zero-spread paths',()=>{
    const m=model({spread:0});
    for(const percent of [0,50,100]){
      const before=materialPath(m,m.impactUs/2,percent),impact=materialPath(m,m.impactUs,percent),wall=materialPath(m,m.arrivalUs,percent);
      expect(before.after).toBe(false);expect(before.phase).toBe('approach');for(const key of ['sampleX','sampleRadius','remainingUs','remainingDistance'])expect(before[key]).toBeNull();
      expect(before.initialRadius).toBe(m.radius*percent/100);expect(before.landingRadius).toBe(before.initialRadius);expect(before.totalDistance).toBe((m.config.gap/100));expect(impact.sampleX).toBe(0);expect(impact.sampleRadius).toBe(before.initialRadius);expect(wall.sampleRadius).toBe(before.landingRadius);expect(wall.remainingDistance).toBe(0);
    }
    for(const [percent,fraction] of [[undefined,.5],[NaN,.5],[Infinity,.5],['bad',.5],[-1,0],[101,1]])expect(materialPath(m,0,percent).fraction).toBe(fraction);
    for(const time of [undefined,NaN,Infinity,-Infinity,'bad',-1])expect(materialPath(m,time,37)).toEqual(materialPath(m,0,37));expect(materialPath(m,m.arrivalUs+10,37)).toEqual(materialPath(m,m.arrivalUs,37));
  });

  it('selects a bounded nice physical ruler that stays fixed across sample coordinates and inspection phases',()=>{
    for(const setup of [{},{diameter:.2,speed:7,gap:2,bumper:2,spread:30},{diameter:12,speed:15,gap:20,bumper:.2,spread:0,material:'steel'},{diameter:.2,gap:20,spread:0},{diameter:12,gap:2,spread:30}]){
      const m=model(setup),first=materialPath(m,0,0),target=80/first.scale;
      expect(first.rulerMeters).toBeGreaterThan(0);expect(first.rulerMeters).toBeLessThanOrEqual(target*(1+1e-12));expect(first.rulerPixels).toBeCloseTo(first.rulerMeters*first.scale,12);expect(first.rulerPixels).toBeGreaterThanOrEqual(32-1e-10);expect(first.rulerPixels).toBeLessThanOrEqual(80+1e-10);
      const power=Math.pow(10,Math.floor(Math.log10(first.rulerMeters))),digit=first.rulerMeters/power;expect(Math.min(...[1,2,5].map(n=>Math.abs(n-digit)))).toBeLessThan(1e-12);const next=(digit<1.5?2:digit<3.5?5:10)*power;expect(next).toBeGreaterThan(target*(1-1e-12));
      for(const percent of [0,37,100])for(const time of [0,m.impactUs,m.impactUs+m.flightUs/2,m.arrivalUs]){const ruler=materialPath(m,time,percent);expect(ruler.rulerMeters).toBe(first.rulerMeters);expect(ruler.rulerPixels).toBe(first.rulerPixels);expect(ruler.scale).toBe(first.scale);}
    }
  });

  it('marks only formed clouds and validates marked time against its exact physical setup',()=>{
    const m=model({}),time=m.impactUs+m.flightUs/2,mark=motionMark(m,time);
    for(const t of [0,m.impactUs-1e-8,undefined,NaN,Infinity,-Infinity,'bad',-1])expect(motionMark(m,t)).toBeNull();
    expect(mark).toEqual({version:1,time,setup:snapshot(m)});expect(mark.setup).not.toBe(m.config);expect(motionMark(m,m.impactUs).time).toBe(m.impactUs);expect(motionMark(m,m.arrivalUs+100).time).toBe(m.arrivalUs);
    const frozen=Object.freeze({...mark,setup:Object.freeze({...mark.setup})}),serialized=JSON.stringify(frozen);expect(motionReference(m,time,50,frozen)).not.toBeNull();expect(JSON.stringify(frozen)).toBe(serialized);
    const invalid=[null,undefined,[],{},false,{...mark,version:2},{...mark,version:'1'},{...mark,time:undefined},{...mark,time:NaN},{...mark,time:Infinity},{...mark,time:-Infinity},{...mark,time:String(time)},{...mark,time:m.impactUs-1e-8},{...mark,time:m.arrivalUs+1e-8},{...mark,setup:null},{...mark,setup:[]},{...mark,setup:{}},{...mark,setup:{...mark.setup,version:2}}];
    for(const key of ['diameter','speed','gap','bumper','spread']){invalid.push({...mark,setup:{...mark.setup,[key]:NaN}},{...mark,setup:{...mark.setup,[key]:String(mark.setup[key])}},{...mark,setup:{...mark.setup,[key]:mark.setup[key]+.1}});}
    invalid.push({...mark,setup:{...mark.setup,material:'glass'}});for(const bad of invalid)expect(motionReference(m,time,50,bad)).toBeNull();
    for(const setup of [{diameter:2},{speed:9},{gap:20},{bumper:1},{spread:0},{material:'steel'}])expect(motionReference(model(setup),time,50,mark)).toBeNull();
  });

  it('compares material geometry at a marked instant with signed displacement and pending preimpact deltas',()=>{
    for(const setup of [{},{spread:0},{diameter:.2,speed:7,gap:2,bumper:2,spread:30},{diameter:12,speed:15,gap:20,material:'steel',spread:30}]){
      const m=model(setup),marked=m.impactUs+m.flightUs/2,mark=motionMark(m,marked),original=JSON.stringify(mark);
      for(const percent of [0,37,100])for(const time of [0,m.impactUs,marked,m.arrivalUs]){
        const ref=motionReference(m,time,percent,mark),past=materialPath(m,marked,percent),current=materialPath(m,time,percent);
        expect(ref.time).toBe(marked);expect(ref.x).toBe(past.sampleX);expect(ref.cloudRadius).toBe(inspect(m,marked).radius);expect(ref.radius).toBe(past.sampleRadius);expect(ref.active).toBe(current.after);
        if(!current.after){for(const key of ['deltaUs','forward','outward','separation'])expect(ref[key]).toBeNull();}
        else{expect(ref.deltaUs).toBe(time-marked);expect(ref.forward).toBe(current.sampleX-past.sampleX);expect(ref.outward).toBe(current.sampleRadius-past.sampleRadius);expect(ref.forward).toBeCloseTo(m.axial*ref.deltaUs*1e-6,12);expect(ref.outward).toBeCloseTo(m.radial*percent/100*ref.deltaUs*1e-6,12);expect(ref.separation).toBeGreaterThanOrEqual(0);expect(ref.separation).toBeCloseTo(Math.hypot(ref.forward,ref.outward),12);expect(ref.separation).toBeCloseTo(motion(m,time,percent).speed*Math.abs(ref.deltaUs)*1e-6,12);if(time===marked){expect(ref.deltaUs).toBe(0);expect(ref.forward).toBe(0);expect(ref.outward).toBe(0);expect(ref.separation).toBe(0);}if(percent===0||setup.spread===0)expect(ref.outward).toBe(0);}
      }
      const wall=motionReference(m,m.arrivalUs,100,motionMark(m,m.arrivalUs));expect(wall.x).toBe(m.config.gap/100);expect(wall.cloudRadius).toBe(m.wallRadius);expect(wall.radius).toBe(m.wallRadius);expect(wall.forward).toBe(0);expect(wall.outward).toBe(0);expect(wall.separation).toBe(0);expect(JSON.stringify(mark)).toBe(original);
      for(const [percent,fraction] of [[undefined,.5],[NaN,.5],[Infinity,.5],['bad',.5],[-1,0],[101,1]])expect(motionReference(m,marked,percent,mark).radius).toBe(inspect(m,marked).radius*fraction);
    }
  });

  it('samples equal flight-time intervals with exact bumper and wall endpoints and constant material displacement per step',()=>{
    for(const setup of [{},{diameter:.2,speed:7,gap:2,bumper:2,spread:30},{diameter:12,speed:15,gap:20,material:'steel',spread:30}]){
      const m=model(setup),original=JSON.stringify(m);
      for(const percent of [0,37,100]){
        const steps=motionSteps(m,m.arrivalUs,percent),f=percent/100;expect(steps.intervalUs).toBe(m.flightUs/4);expect(steps.points).toHaveLength(5);
        for(const [index,point] of steps.points.entries()){
          const time=index===0?m.impactUs:index===4?m.arrivalUs:m.impactUs+m.flightUs*(index/4);expect(point.index).toBe(index);expect(point.fraction).toBe(index/4);expect(point.time).toBe(time);expect(point.reached).toBe(true);expect(point.selected).toBe(index===4);expect(point.x).toBeCloseTo(m.config.gap/100*index/4,12);expect(point.radius).toBeCloseTo((m.radius+(m.wallRadius-m.radius)*index/4)*f,12);
          if(index){const previous=steps.points[index-1];expect(point.time-previous.time).toBeCloseTo(steps.intervalUs,12);expect(point.x-previous.x).toBeCloseTo(m.axial*steps.intervalUs*1e-6,12);expect(point.radius-previous.radius).toBeCloseTo(m.radial*f*steps.intervalUs*1e-6,12);}
        }
        expect(steps.points[0].x).toBe(0);expect(steps.points[0].radius).toBe(m.radius*f);expect(steps.points[4].x).toBe(m.config.gap/100);expect(steps.points[4].radius).toBe(m.wallRadius*f);
      }
      expect(JSON.stringify(m)).toBe(original);
    }
  });

  it('keeps equal-time predictions pending before impact and handles exact selection, invalid inputs and zero outward motion',()=>{
    const m=model({spread:0}),all=motionSteps(m,0,37);for(const point of all.points){expect(point.reached).toBe(false);expect(point.selected).toBe(false);expect(point.radius).toBe(m.radius*.37);}
    for(const [index,point] of all.points.entries()){
      const at=motionSteps(m,point.time,37);expect(at.points.map(p=>p.reached)).toEqual(all.points.map((_,i)=>i<=index));expect(at.points.map(p=>p.selected)).toEqual(all.points.map((_,i)=>i===index));
      const justBefore=motionSteps(m,point.time-1e-8,37);expect(justBefore.points[index].reached).toBe(false);expect(justBefore.points.every(p=>!p.selected)).toBe(true);
    }
    for(const time of [undefined,NaN,Infinity,-Infinity,'bad',-1])expect(motionSteps(m,time,37)).toEqual(all);expect(motionSteps(m,m.arrivalUs+100,37)).toEqual(motionSteps(m,m.arrivalUs,37));
    for(const [percent,fraction] of [[undefined,.5],[NaN,.5],[Infinity,.5],['bad',.5],[-1,0],[101,1]])for(const point of motionSteps(m,0,percent).points)expect(point.radius).toBe(m.radius*fraction);
    expect(motionSteps(m,0,0).points.every(point=>point.radius===0)).toBe(true);
  });

  it('freezes a complete reference setup without sharing mutable model state',()=>{
    const baseline=model({material:'steel',diameter:2,speed:9,gap:16,bumper:1.2,spread:7});
    const saved=Object.freeze(snapshot(baseline)),before=JSON.stringify(saved);
    const current=model({material:'glass',diameter:.4,speed:14,gap:3,bumper:.2,spread:25}),comparison=compare(current,saved);
    expect(comparison.pinned).toBe(true);expect(comparison.reference).toEqual(baseline);
    expect(comparison.changed).toEqual(['diameter','speed','gap','bumper','spread','material']);
    expect(comparison.reference.config).not.toBe(baseline.config);expect(saved).not.toBe(baseline.config);
    expect(JSON.stringify(saved)).toBe(before);
    expect(compare(baseline,saved).changed).toEqual([]);
  });

  it('separates changes in forward energy from the footprint area, including extreme ratios',()=>{
    const saved=snapshot(model({diameter:12,speed:15,gap:20,bumper:.2,spread:30}));
    for(const settings of [{},{diameter:.2,speed:7,gap:2,bumper:2,spread:0},{material:'steel',diameter:12,speed:15,gap:20,spread:30}]){
      const current=model(settings),pinned=compare(current,saved),compact=compare(current,null);
      expect(pinned.fluenceRatio).toBeCloseTo(pinned.normalRatio/pinned.areaRatio,10);
      expect(pinned.energyRatio).toBe(current.incoming/pinned.reference.incoming);
      expect(pinned.footprintMax).toBeGreaterThanOrEqual(current.wallRadius);
      expect(pinned.footprintMax).toBeGreaterThanOrEqual(pinned.reference.wallRadius);
      expect(compact.pinned).toBe(false);expect(compact.reference.config.gap).toBe(2);
      expect(compact.normalRatio).toBe(1);expect(compact.energyRatio).toBe(1);
      expect(compact.fluenceRatio).toBeCloseTo(1/compact.areaRatio,12);
    }
  });

  it('falls back to a real compact comparison when a saved reference is incomplete or invalid',()=>{
    const current=model({material:'glass',diameter:4,gap:15}),saved=snapshot(current);
    for(const invalid of [null,{},[],true,'saved',{...saved,version:2},{...saved,speed:NaN},{...saved,diameter:0},{...saved,material:'constructor'},{...saved,gap:999},{...saved,bumper:undefined}]){
      const comparison=compare(current,invalid);
      expect(comparison.pinned).toBe(false);expect(comparison.reference.config).toEqual({...current.config,gap:2});
      expect(comparison.fluenceRatio).toBeGreaterThan(0);
    }
  });
});

// jsdom 29 keeps the sheet of a <style> removed inside an unmounted subtree; each mount
// left ~2,000 rules that every later getComputedStyle call matched. Detach styles first.
// Mounting re-parses ~250 KB of CSS; css-tree formats a source-mapped stack for every value it
// rejects (~45% of a mount, never read), so the first render captures no frames.
let cleanups,frames,nextFrame,clock,sheetsBefore;
function advance(seconds){for(let i=0;i<=Math.round(seconds*50);i++){if(i)clock+=20;const callbacks=[...frames.values()];frames.clear();act(()=>callbacks.forEach(fn=>fn(clock)));}}
function mountDebris(seed={}){
  const cfg=window.StemLab._registry.spaceStation,host=document.createElement('div');document.body.appendChild(host);
  const root=createRoot(host);let data,setData;
  function Harness(){const [toolData,setToolData]=React.useState({spaceStation:{tab:'operations',opsMode:'debris',...seed}});data=toolData.spaceStation;setData=setToolData;return cfg.render({React,toolData,setToolData,update(){},updateMulti(){},addToast(){},announceToSR(){},awardXP(){},setStemLabTool(){},aiHintsEnabled:false,gradeLevel:'7th Grade',t:(key,fallback)=>fallback??key});}
  const limit=Error.stackTraceLimit;Error.stackTraceLimit=0;try{act(()=>root.render(React.createElement(Harness)));}finally{Error.stackTraceLimit=limit;}cleanups.push(()=>{host.querySelectorAll('style').forEach(style=>style.remove());act(()=>root.unmount());host.remove();});
  return {host,get time(){return data.opsDebrisTime||0;},get data(){return data;},get playing(){return host.querySelector('[data-iss-playback-toggle="debris"]').getAttribute('aria-pressed')==='true';},
    patch(patch){act(()=>setData(prev=>({...prev,spaceStation:{...prev.spaceStation,...patch}})));},
    click(selector){act(()=>host.querySelector(selector).click());},change(id,value){act(()=>Simulate.change(host.querySelector('#'+id),{target:{value:String(value)}}));},
    read(id){return host.querySelector('[data-debris-reading="'+id+'"] strong').textContent;}};
}

describe('space station interactive shield lab',()=>{
  beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_spacestation.js','spaceStation');sheetsBefore=document.styleSheets.length;cleanups=[];frames=new Map();nextFrame=0;clock=0;vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.stubGlobal('requestAnimationFrame',fn=>{const id=++nextFrame;frames.set(id,fn);return id;});vi.stubGlobal('cancelAnimationFrame',id=>frames.delete(id));vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);Object.defineProperty(document,'hidden',{configurable:true,value:false});});
  afterEach(()=>{cleanups.forEach(fn=>fn());vi.restoreAllMocks();vi.unstubAllGlobals();expect(document.styleSheets.length,'stylesheets left behind by this test').toBe(sheetsBefore);});

  it('animates actual contact phases and reassigns the energy budget at the bumper',()=>{
    const view=mountDebris();expect(view.read('mass')).toBe('1.414 mg');expect(view.read('energy')).toBe('101.8 J');expect(view.read('incoming')).toBe('101.8 J');
    expect(view.host.querySelector('[data-debris-projectile]')).not.toBeNull();
    view.click('[data-debris-event="impact"]');expect(view.time).toBe(model({}).impactUs);
    expect(view.read('incoming')).toBe('0.000 J');expect(view.read('translation')).toBe('58.2 J');
    expect(view.host.querySelector('[data-debris-cloud]')).not.toBeNull();expect(view.host.querySelector('[data-debris-projectile]')).toBeNull();
    expect(view.host.querySelector('[data-debris-phase]').dataset.debrisPhase).toBe('impact');
    view.click('[data-debris-event="cloud"]');expect(view.host.querySelector('[data-debris-phase]').dataset.debrisPhase).toBe('cloud');
    view.click('[data-debris-event="wall"]');expect(view.time).toBe(model({}).arrivalUs);expect(view.playing).toBe(false);
    expect(view.host.querySelector('[data-iss-playback-toggle="debris"]').disabled).toBe(true);
    expect(view.host.querySelector('[data-iss-debris-lab]').textContent).not.toMatch(/BUMPER WORKS|WALL AT RISK|Shield capacity model/);
  });

  it('resets each setup control and changes geometry with standoff',()=>{
    const view=mountDebris();const before=view.host.querySelector('[data-debris-scene]').innerHTML;
    for(const [id,value] of [['iss-shield-gap',20],['iss-debris-size',2],['iss-debris-speed',8],['iss-debris-bumper',1],['iss-debris-spread',20],['iss-debris-material','steel']]){
      view.click('[data-debris-event="cloud"]');view.click('[data-iss-playback-toggle="debris"]');view.change(id,value);expect(view.time).toBe(0);expect(view.playing).toBe(false);
    }
    expect(view.host.querySelector('[data-debris-scene]').innerHTML).not.toBe(before);
    expect(view.data.opsDebrisMaterial).toBe('steel');
    expect(parseFloat(view.read('mass'))).toBeGreaterThan(30);
  });

  it('keeps inspectors and comparison independent of playback and preserves its rate',()=>{
    const view=mountDebris();view.change('iss-playback-speed-debris',20);view.click('[data-iss-playback-toggle="debris"]');advance(.4);
    expect(view.time).toBeCloseTo(8,8);const time=view.time;
    view.click('[data-debris-part="wall"]');view.click('[data-debris-compare]');expect(view.playing).toBe(true);expect(view.time).toBe(time);
    expect(view.host.querySelector('[data-debris-part-note]').textContent).toContain('impact-test data');
    expect(view.host.querySelector('[data-debris-reference-footprint]')).toBeNull();advance(.2);expect(view.time).toBeGreaterThan(time);
    view.click('[data-debris-event="start"]');expect(view.playing).toBe(false);expect(view.time).toBe(0);
    expect(view.host.querySelector('#iss-playback-speed-debris').value).toBe('20');
  });

  it('supports graph pointer capture, cancellation and precise keyboard time steps',()=>{
    const view=mountDebris(),plot=view.host.querySelector('[data-debris-plot]');vi.spyOn(plot,'getBoundingClientRect').mockReturnValue({left:20,width:400});
    let captured=false;plot.setPointerCapture=()=>{captured=true;};plot.hasPointerCapture=()=>captured;plot.releasePointerCapture=()=>{captured=false;};
    act(()=>Simulate.pointerDown(plot,{button:0,isPrimary:true,pointerId:1,clientX:220}));expect(view.time).toBeCloseTo(model({}).arrivalUs/2,10);
    act(()=>Simulate.pointerMove(plot,{pointerId:1,clientX:320}));const time=view.time;expect(time).toBeCloseTo(model({}).arrivalUs*.75,10);
    act(()=>Simulate.pointerCancel(plot,{pointerId:1}));act(()=>Simulate.pointerMove(plot,{pointerId:1,clientX:420}));expect(view.time).toBe(time);
    view.click('[data-iss-playback-toggle="debris"]');const slider=view.host.querySelector('#iss-debris-time');act(()=>Simulate.keyDown(slider,{key:'ArrowRight'}));expect(view.time).toBeCloseTo(time+.05,10);expect(view.playing).toBe(false);
    expect(slider.getAttribute('aria-valuetext')).toContain('microseconds');
  });

  it('stops at first wall contact and cancels playback when leaving the mode',()=>{
    const view=mountDebris({opsDebrisPlaying:true});expect(view.playing).toBe(false);
    view.change('iss-playback-speed-debris',80);view.click('[data-iss-playback-toggle="debris"]');advance(.5);expect(view.time).toBe(model({}).arrivalUs);expect(view.playing).toBe(false);
    view.click('[data-debris-event="start"]');view.click('[data-iss-playback-toggle="debris"]');advance(.1);view.patch({opsMode:'power'});const time=view.time;advance(.3);expect(view.time).toBe(time);
    view.patch({opsMode:'debris'});expect(view.playing).toBe(false);
  });

  it('loads coherent presets, a matching compact comparison and clean mission resets',()=>{
    const view=mountDebris();view.click('[data-debris-preset="dense"]');expect(view.data.opsDebrisMaterial).toBe('steel');expect(view.data.opsDebrisSize).toBe(2);
    view.click('[data-debris-preset="compact"]');expect(view.data.opsDebrisMaterial).toBe('aluminum');expect(view.data.opsShieldGap).toBe(2);
    expect(view.host.querySelector('[data-debris-comparison]').textContent).toContain('1.00× the area; 0.0%');
    view.change('iss-debris-spread',0);view.change('iss-debris-size',.2);expect(view.read('spread')).toBe('0.0°');
    expect(view.host.querySelector('.iss-debris-lab .iss-water-y-axis span').textContent).toBe('0.2 mm');
    view.click('[data-iss-scenario="nominal"]');view.patch({opsMode:'debris'});expect(view.data.opsDebrisSpread).toBe(10);expect(view.data.opsShieldGap).toBe(10);expect(view.time).toBe(0);
  });

  it('keeps a stable spatial scale and supports captured, bounded wall dragging',()=>{
    const view=mountDebris(),handle=view.host.querySelector('[data-debris-wall-handle]');
    const position=()=>parseFloat(handle.style.left)*6.8;
    view.change('iss-shield-gap',2);const near=position();view.change('iss-shield-gap',20);const far=position();
    view.change('iss-shield-gap',10);const middle=position();expect((middle-near)/(far-near)).toBeCloseTo(8/18,12);
    vi.spyOn(handle.parentNode,'getBoundingClientRect').mockReturnValue({left:0,width:680});
    let captured=false;handle.setPointerCapture=()=>{captured=true;};handle.hasPointerCapture=()=>captured;handle.releasePointerCapture=()=>{captured=false;};
    view.click('[data-debris-event="cloud"]');view.click('[data-iss-playback-toggle="debris"]');
    act(()=>Simulate.pointerDown(handle,{button:0,isPrimary:true,pointerId:1,clientX:100}));expect(view.time).toBe(0);expect(view.playing).toBe(false);
    act(()=>Simulate.pointerMove(handle,{pointerId:2,clientX:500}));expect(view.data.opsShieldGap).toBe(10);
    const delta=(far-near)/18*4;
    act(()=>Simulate.pointerMove(handle,{pointerId:1,clientX:100+delta}));expect(view.data.opsShieldGap).toBe(14);expect(position()-middle).toBeCloseTo(delta,10);
    expect(view.host.querySelector('#iss-shield-gap').value).toBe('14');expect(handle.getAttribute('aria-valuenow')).toBe('14');
    act(()=>Simulate.pointerMove(handle,{pointerId:1,clientX:1e6}));expect(view.data.opsShieldGap).toBe(20);
    act(()=>Simulate.pointerCancel(handle,{pointerId:1}));act(()=>Simulate.pointerMove(handle,{pointerId:1,clientX:-1e6}));expect(view.data.opsShieldGap).toBe(20);
    expect(handle.hasAttribute('data-dragging')).toBe(false);expect(captured).toBe(false);
  });

  it('supports wall keyboard limits and ignores non-primary or unmeasurable pointer gestures',()=>{
    const view=mountDebris(),handle=view.host.querySelector('[data-debris-wall-handle]');
    function key(key){act(()=>Simulate.keyDown(handle,{key}));}
    view.click('[data-debris-event="cloud"]');view.click('[data-iss-playback-toggle="debris"]');key('ArrowRight');
    expect(view.data.opsShieldGap).toBe(11);expect(view.time).toBe(0);expect(view.playing).toBe(false);
    key('PageDown');expect(view.data.opsShieldGap).toBe(6);key('Home');key('ArrowLeft');expect(view.data.opsShieldGap).toBe(2);
    key('PageUp');expect(view.data.opsShieldGap).toBe(7);key('End');key('ArrowUp');expect(view.data.opsShieldGap).toBe(20);
    view.click('[data-debris-event="cloud"]');const time=view.time;
    for(const props of [{button:2,isPrimary:true},{button:0,isPrimary:false},{button:0,isPrimary:true}])act(()=>Simulate.pointerDown(handle,{...props,pointerId:1,clientX:100}));
    expect(view.time).toBe(time);expect(handle._issDebrisDrag).toBeUndefined();
  });

  it('saves references without interrupting playback and preserves them across setup and mission changes',()=>{
    const view=mountDebris();view.click('[data-debris-event="cloud"]');view.click('[data-iss-playback-toggle="debris"]');
    const time=view.time;view.click('[data-debris-pin]');const saved=JSON.stringify(view.data.opsDebrisBaseline);
    expect(view.time).toBe(time);expect(view.playing).toBe(true);expect(view.data.opsDebrisBaseline).toEqual(snapshot(model({})));
    expect(view.host.querySelectorAll('[data-debris-setting][data-changed="true"]')).toHaveLength(0);
    view.change('iss-debris-speed',15);view.change('iss-debris-material','steel');
    expect(JSON.stringify(view.data.opsDebrisBaseline)).toBe(saved);
    expect(view.host.querySelector('[data-debris-setting="speed"] td:last-child').textContent).toBe('12 km/s');
    expect(view.host.querySelectorAll('[data-debris-setting][data-changed="true"]')).toHaveLength(2);
    view.click('[data-debris-preset="compact"]');expect(JSON.stringify(view.data.opsDebrisBaseline)).toBe(saved);
    view.click('[data-iss-scenario="nominal"]');view.patch({opsMode:'debris'});expect(JSON.stringify(view.data.opsDebrisBaseline)).toBe(saved);
    view.click('[data-debris-reference-reset]');expect(view.data.opsDebrisBaseline).toBeNull();expect(view.host.querySelector('.iss-debris-trial-table')).toBeNull();
  });

  it('compares both larger and smaller footprints on a shared scale without rounding tiny energy ratios to zero',()=>{
    const view=mountDebris({opsDebrisSize:12,opsDebrisSpeed:15,opsShieldGap:20});view.click('[data-debris-pin]');
    view.change('iss-debris-size',.2);view.change('iss-debris-speed',7);view.change('iss-shield-gap',2);view.change('iss-debris-spread',0);
    expect(view.host.querySelector('[data-debris-comparison-math] strong').textContent).toMatch(/e-\d+×/);
    const smallRadius=Number(view.host.querySelector('[data-debris-current-footprint]').getAttribute('r'));expect(smallRadius).toBeLessThan(1);
    expect(Number(view.host.querySelector('[data-debris-reference-footprint]').getAttribute('r'))).toBeCloseTo(130,10);
    view.click('[data-debris-compare]');expect(view.host.querySelector('[data-debris-reference-footprint]')).toBeNull();expect(view.host.querySelector('[data-debris-comparison-math]')).toBeNull();
    expect(Number(view.host.querySelector('[data-debris-current-footprint]').getAttribute('r'))).toBe(smallRadius);
    view.click('[data-debris-pin]');expect(view.data.opsDebrisCompare).toBe(true);
    expect(view.host.querySelector('[data-debris-comparison-math] strong').textContent).toBe('1.00×');
  });

  it('shows real forward speed and opposite radial velocities while keeping overlay controls independent of the clock',()=>{
    const view=mountDebris();const speed=key=>Number(view.host.querySelector('[data-debris-vector="'+key+'"]').getAttribute('data-speed'));
    const forwardLength=()=>Number(view.host.querySelector('[data-debris-vector="forward"]').getAttribute('d').match(/H([\d.]+)/)[1])-537;
    const incomingLength=forwardLength();
    expect(speed('forward')).toBe(12000);expect(view.host.querySelector('[data-debris-vector="radial-up"]')).toBeNull();
    view.click('[data-debris-event="cloud"]');expect(speed('forward')).toBe(model({}).axial);
    expect(forwardLength()/incomingLength).toBeCloseTo(model({}).axial/12000,12);
    expect(speed('radial-up')).toBe(-model({}).radial);expect(speed('radial-up')+speed('radial-down')).toBe(0);
    view.click('[data-iss-playback-toggle="debris"]');const time=view.time;view.click('[data-debris-vectors-toggle]');expect(view.time).toBe(time);expect(view.playing).toBe(true);expect(view.host.querySelector('[data-debris-vectors]')).toBeNull();
    view.click('[data-debris-vectors-toggle]');view.change('iss-debris-spread',0);view.click('[data-debris-event="cloud"]');expect(view.host.querySelector('[data-debris-vector="radial-up"]')).toBeNull();expect(speed('forward')).toBe(model({spread:0}).axial);
    view.change('iss-debris-speed',7);const slowerLength=forwardLength();view.change('iss-debris-speed',14);expect(forwardLength()/slowerLength).toBeCloseTo(2,12);
  });

  it('reveals live probe readings only after the bumper and links the sampling ring to the side view',()=>{
    const view=mountDebris(),stage=view.host.querySelector('[data-debris-probe-stage]');
    expect(view.read('probe-mass')).toBe('—');expect(view.host.querySelectorAll('[data-debris-tracer]')).toHaveLength(0);
    view.click('[data-debris-probe-event="cloud"]');expect(view.time).toBe(model({}).impactUs+model({}).flightUs/2);
    expect(view.host.querySelectorAll('[data-debris-tracer]')).toHaveLength(64);
    expect(stage.getAttribute('aria-valuenow')).toBe('50');
    expect(view.host.querySelector('[data-debris-probe-insight]').textContent).toContain('75.00% of the mass carries 93.75%');
    const core=view.host.querySelector('[data-debris-probe-band] line'),cloud=view.host.querySelector('[data-debris-front]');
    expect(Number(core.getAttribute('y2'))-Number(core.getAttribute('y1'))).toBeCloseTo(Number(cloud.getAttribute('ry')),12);
    const m=model({});expect(parseFloat(view.read('probe-forward'))).toBeCloseTo(m.translation*.25,2);
    view.click('[data-debris-probe-preset="all"]');expect(stage.getAttribute('aria-valuenow')).toBe('100');
    expect(parseFloat(view.read('probe-forward'))).toBeCloseTo(m.translation,2);
    view.change('iss-debris-spread',0);expect(view.read('probe-mass')).toBe('—');
    view.click('[data-debris-probe-event="wall"]');expect(view.read('probe-sideways')).toBe('0 J');expect(view.read('probe-edge')).toBe('0 km/s');
    expect(view.host.querySelector('[data-debris-probe-insight]').textContent).toContain('no sideways kinetic energy');
  });

  it('supports bounded radial pointer capture without disturbing the running experiment',()=>{
    const view=mountDebris(),stage=view.host.querySelector('[data-debris-probe-stage]');
    view.click('[data-debris-probe-magnify]');view.click('[data-debris-probe-event="cloud"]');view.click('[data-iss-playback-toggle="debris"]');
    const time=view.time;vi.spyOn(stage.querySelector('svg'),'getBoundingClientRect').mockReturnValue({left:20,top:40,width:320,height:320});
    let captured=false;stage.setPointerCapture=()=>{captured=true;};stage.hasPointerCapture=()=>captured;stage.releasePointerCapture=()=>{captured=false;};
    act(()=>Simulate.pointerDown(stage,{button:0,isPrimary:true,pointerId:8,clientX:235,clientY:200}));
    expect(view.data.opsDebrisProbe).toBe(50);expect(view.time).toBe(time);expect(view.playing).toBe(true);
    act(()=>Simulate.pointerMove(stage,{pointerId:9,clientX:180,clientY:200}));expect(view.data.opsDebrisProbe).toBe(50);
    act(()=>Simulate.pointerMove(stage,{pointerId:8,clientX:180,clientY:117.5}));expect(view.data.opsDebrisProbe).toBe(75);
    act(()=>Simulate.pointerMove(stage,{pointerId:8,clientX:180,clientY:200}));expect(view.data.opsDebrisProbe).toBe(0);
    expect(view.read('probe-mass')).toBe('0 mg');expect(view.read('probe-forward')).toBe('0 J');
    act(()=>Simulate.pointerMove(stage,{pointerId:8,clientX:1e5,clientY:1e5}));expect(view.data.opsDebrisProbe).toBe(100);
    act(()=>Simulate.pointerCancel(stage,{pointerId:8}));act(()=>Simulate.pointerMove(stage,{pointerId:8,clientX:180,clientY:200}));
    expect(view.data.opsDebrisProbe).toBe(100);expect(captured).toBe(false);expect(stage.hasAttribute('data-dragging')).toBe(false);
    expect(view.time).toBe(time);expect(view.playing).toBe(true);
  });

  it('supports accessible probe keys and view changes while preserving clock, reference and settings',()=>{
    const saved=snapshot(model({gap:18})),view=mountDebris({opsDebrisBaseline:saved}),stage=view.host.querySelector('[data-debris-probe-stage]');
    const key=key=>act(()=>Simulate.keyDown(stage,{key}));
    view.click('[data-debris-probe-event="cloud"]');view.click('[data-iss-playback-toggle="debris"]');const time=view.time;
    key('ArrowRight');expect(view.data.opsDebrisProbe).toBe(51);key('PageDown');expect(view.data.opsDebrisProbe).toBe(41);
    key('Home');key('ArrowLeft');expect(view.data.opsDebrisProbe).toBe(0);key('End');key('ArrowUp');expect(view.data.opsDebrisProbe).toBe(100);
    view.change('iss-debris-probe-radius',50);expect(stage.getAttribute('aria-valuetext')).toContain('25.00 percent');
    view.click('[data-debris-probe-magnify]');expect(view.playing).toBe(true);expect(view.time).toBe(time);expect(view.data.opsDebrisBaseline).toEqual(saved);
    view.patch({opsMode:'power'});view.patch({opsMode:'debris'});expect(view.data.opsDebrisProbe).toBe(50);expect(view.data.opsDebrisMagnify).toBe(true);
    view.patch({opsDebrisProbe:'corrupt',opsDebrisMagnify:'yes'});expect(view.host.querySelector('[data-debris-probe-stage]').getAttribute('aria-valuenow')).toBe('50');
    expect(view.host.querySelector('[data-debris-probe-magnify]').getAttribute('aria-pressed')).toBe('false');
  });

  it('keeps physical expansion visible at fixed scale and magnifies without changing measurements',()=>{
    const view=mountDebris(),radius=()=>Number(view.host.querySelector('[data-debris-probe-cloud]').getAttribute('r'));
    view.click('[data-debris-probe-event="impact"]');const initial=radius();view.click('[data-debris-probe-event="wall"]');expect(radius()).toBeCloseTo(110,12);expect(radius()).toBeGreaterThan(initial);
    view.click('[data-debris-probe-magnify]');view.click('[data-debris-probe-event="cloud"]');expect(radius()).toBeCloseTo(110,12);
    const mass=view.read('probe-mass'),time=view.time,edge=view.read('probe-edge');
    view.click('[data-debris-probe-magnify]');expect(radius()).toBeLessThan(110);expect(view.read('probe-mass')).toBe(mass);expect(view.read('probe-edge')).toBe(edge);expect(view.time).toBe(time);
    const stage=view.host.querySelector('[data-debris-probe-stage]');
    for(const props of [{button:2,isPrimary:true},{button:0,isPrimary:false},{button:0,isPrimary:true}])act(()=>Simulate.pointerDown(stage,{...props,pointerId:1,clientX:100,clientY:100}));
    expect(stage._issDebrisProbeDrag).toBeUndefined();expect(view.time).toBe(time);
  });

  it('changes sweep views without moving the shot clock and keeps predictions independent of playback',()=>{
    const view=mountDebris(),selected=()=>view.host.querySelector('[data-debris-sweep-selected] strong').textContent;
    const predicted=selected();view.click('[data-debris-event="cloud"]');expect(selected()).toBe(predicted);
    view.click('[data-iss-playback-toggle="debris"]');const time=view.time;
    view.click('[data-debris-sweep-metric="diameter"]');expect(view.playing).toBe(true);expect(view.time).toBe(time);
    expect(parseFloat(selected())).toBeCloseTo(model({}).wallRadius*2000,2);
    expect(view.host.querySelector('[data-debris-sweep-scale]')).toBeNull();
    view.click('[data-debris-sweep-metric="flight"]');expect(parseFloat(selected())).toBeCloseTo(model({}).flightUs,2);
    view.click('[data-debris-sweep-metric="fluence"]');view.click('[data-debris-sweep-scale]');
    expect(view.host.querySelector('[data-debris-sweep]').getAttribute('data-log')).toBe('false');expect(selected()).toBe(predicted);expect(view.time).toBe(time);expect(view.playing).toBe(true);
    view.change('iss-debris-sweep-gap',16);expect(view.time).toBe(0);expect(view.playing).toBe(false);expect(view.host.querySelector('#iss-shield-gap').value).toBe('16');
    expect(view.host.querySelector('[data-debris-wall-handle]').getAttribute('aria-valuenow')).toBe('16');
    expect(parseFloat(selected())).toBeCloseTo(model({gap:16}).fluence,3);
    view.change('iss-shield-gap',3);expect(view.host.querySelector('#iss-debris-sweep-gap').value).toBe('3');
  });

  it('maps chart pointer coordinates to real spacing with capture, cancellation and keyboard alternatives',()=>{
    const view=mountDebris(),plot=view.host.querySelector('[data-debris-sweep-plot]');
    vi.spyOn(plot.querySelector('svg'),'getBoundingClientRect').mockReturnValue({left:20,width:720});
    let captured=false;plot.setPointerCapture=()=>{captured=true;};plot.hasPointerCapture=()=>captured;plot.releasePointerCapture=()=>{captured=false;};
    const x=gap=>20+16+(gap-2)/18*688;
    view.click('[data-debris-event="cloud"]');view.click('[data-iss-playback-toggle="debris"]');
    act(()=>Simulate.pointerDown(plot,{button:0,isPrimary:true,pointerId:3,clientX:x(6)}));expect(view.data.opsShieldGap).toBe(6);expect(view.time).toBe(0);expect(view.playing).toBe(false);
    act(()=>Simulate.pointerMove(plot,{pointerId:4,clientX:x(9)}));expect(view.data.opsShieldGap).toBe(6);
    act(()=>Simulate.pointerMove(plot,{pointerId:3,clientX:x(14)}));expect(view.data.opsShieldGap).toBe(14);
    const marker=view.host.querySelector('[data-debris-sweep-current-point]');expect(parseFloat(marker.style.left)/100*720).toBeCloseTo(x(14)-20,10);
    act(()=>Simulate.pointerMove(plot,{pointerId:3,clientX:1e6}));expect(view.data.opsShieldGap).toBe(20);
    act(()=>Simulate.pointerCancel(plot,{pointerId:3}));act(()=>Simulate.pointerMove(plot,{pointerId:3,clientX:-1e6}));expect(view.data.opsShieldGap).toBe(20);expect(captured).toBe(false);
    expect(plot.hasAttribute('data-dragging')).toBe(false);
    const key=key=>act(()=>Simulate.keyDown(plot,{key}));key('ArrowLeft');expect(view.data.opsShieldGap).toBe(19);key('PageDown');expect(view.data.opsShieldGap).toBe(14);key('Home');key('ArrowDown');expect(view.data.opsShieldGap).toBe(2);key('End');key('ArrowUp');expect(view.data.opsShieldGap).toBe(20);
  });

  it('keeps saved comparison curves and their standoff markers fixed while changing the current wall',()=>{
    const view=mountDebris({opsShieldGap:14});view.click('[data-debris-pin]');const saved=JSON.stringify(view.data.opsDebrisBaseline);
    expect(view.host.querySelector('[data-debris-sweep-reference-curve]')).toBeNull();
    expect(view.host.querySelector('[data-debris-sweep-reference-point]').getAttribute('data-gap')).toBe('14');
    view.change('iss-debris-speed',15);expect(view.host.querySelector('[data-debris-sweep-reference-curve]')).not.toBeNull();
    const reference=view.host.querySelector('[data-debris-sweep-reference-curve]').getAttribute('d');
    view.change('iss-debris-sweep-gap',20);expect(JSON.stringify(view.data.opsDebrisBaseline)).toBe(saved);
    expect(view.host.querySelector('[data-debris-sweep-reference-curve]').getAttribute('d')).toBe(reference);expect(view.host.querySelector('[data-debris-sweep-reference-point]').getAttribute('data-gap')).toBe('14');
    view.click('[data-debris-event="cloud"]');const time=view.time;view.click('[data-debris-compare]');expect(view.time).toBe(time);
    expect(view.host.querySelector('[data-debris-sweep-reference-curve]')).toBeNull();expect(view.host.querySelector('[data-debris-sweep-reference-point]')).toBeNull();
    view.click('[data-debris-compare]');expect(view.host.querySelector('[data-debris-sweep-reference-curve]').getAttribute('d')).toBe(reference);
    view.click('[data-debris-reference-reset]');expect(view.host.querySelector('[data-debris-sweep-reference-curve]')).toBeNull();expect(view.host.querySelector('[data-debris-sweep-reference-point]').getAttribute('data-gap')).toBe('2');
  });

  it('handles zero spread, stale chart preferences and ignored pointer gestures without invalid paths',()=>{
    const view=mountDebris({opsDebrisSpread:0,opsDebrisSweepMetric:'bad'}),plot=view.host.querySelector('[data-debris-sweep-plot]');
    expect(view.host.querySelector('[data-debris-sweep]').getAttribute('data-metric')).toBe('fluence');
    const line=view.host.querySelector('[data-debris-sweep-curve]').getAttribute('d');expect(line).not.toMatch(/NaN|Infinity/);
    expect(view.host.querySelector('[data-debris-sweep-note]').textContent).toContain('leaves cloud diameter and energy per area unchanged');
    view.click('[data-debris-event="cloud"]');const time=view.time;
    for(const props of [{button:2,isPrimary:true},{button:0,isPrimary:false},{button:0,isPrimary:true}])act(()=>Simulate.pointerDown(plot,{...props,pointerId:2,clientX:100}));
    expect(plot._issDebrisSweepDrag).toBeUndefined();expect(view.time).toBe(time);
    view.click('[data-debris-sweep-metric="diameter"]');view.patch({opsMode:'power'});view.patch({opsMode:'debris'});expect(view.host.querySelector('[data-debris-sweep]').getAttribute('data-metric')).toBe('diameter');
  });

  it('switches pair timing without changing playback and synchronizes both diagrams to the shot',()=>{
    const view=mountDebris({opsShieldGap:20,opsDebrisSpeed:7,opsDebrisBaseline:snapshot(model({gap:2,speed:15}))});
    const shot=id=>view.host.querySelector('[data-debris-pair-shot="'+id+'"]');
    expect(shot('current').dataset.phase).toBe('contact');expect(shot('reference').dataset.phase).toBe('contact');expect(view.time).toBe(0);
    view.click('[data-debris-pair-mode="clock"]');expect(shot('current').dataset.phase).toBe('approach');expect(shot('reference').dataset.phase).toBe('approach');
    view.click('[data-iss-playback-toggle="debris"]');advance(.4);
    const time=view.time;expect(Number(shot('current').dataset.time)).toBe(time);expect(Number(shot('reference').dataset.time)).toBe(time);
    view.click('[data-debris-pair-mode="contact"]');expect(view.playing).toBe(true);expect(view.time).toBe(time);
    view.click('[data-debris-pair-mode="clock"]');expect(view.playing).toBe(true);
    view.click('[data-debris-event="cloud"]');expect(shot('reference').dataset.held).toBe('true');expect(shot('current').dataset.held).toBe('false');
    expect(view.host.querySelector('[data-debris-pair-phase="reference"]').textContent).toMatch(/held/);
    expect(Number(view.host.querySelector('[data-debris-pair-front="reference"]').dataset.position)).toBeCloseTo(.02,12);
    expect(view.host.querySelectorAll('[data-iss-playback-toggle="debris"]')).toHaveLength(1);
    const scales=[...view.host.querySelectorAll('[data-debris-pair-scene]')].map(n=>n.dataset.scale);expect(scales[0]).toBe(scales[1]);
  });

  it('scrubs the shared time from the comparison using ranges, keys and exact event controls',()=>{
    const m=model({}),view=mountDebris({opsDebrisPairMode:'clock'});
    view.click('[data-iss-playback-toggle="debris"]');advance(.1);view.change('iss-debris-pair-time',m.impactUs);
    expect(view.time).toBe(m.impactUs);expect(view.playing).toBe(false);expect(Number(view.host.querySelector('#iss-debris-time').value)).toBe(m.impactUs);
    const input=view.host.querySelector('#iss-debris-pair-time');act(()=>Simulate.keyDown(input,{key:'ArrowRight'}));expect(view.time).toBeCloseTo(m.impactUs+.05,12);
    view.click('[data-debris-pair-event="wall"]');expect(view.time).toBe(m.arrivalUs);
    act(()=>Simulate.keyDown(input,{key:'ArrowUp'}));expect(view.time).toBe(m.arrivalUs);
    view.click('[data-debris-pair-event="start"]');expect(view.time).toBe(0);
    act(()=>Simulate.keyDown(input,{key:'ArrowDown'}));expect(view.time).toBe(0);
    view.click('[data-debris-pair-event="impact"]');expect(view.time).toBe(m.impactUs);
    expect(view.host.querySelector('[data-debris-pair-help]').textContent).toMatch(/clock ends at the current design/);
  });

  it('keeps reference and view preferences across navigation while moving focus to each section',()=>{
    const saved=snapshot(model({gap:18})),view=mountDebris({opsDebrisBaseline:saved,opsDebrisPairMode:'clock'});
    view.click('[data-iss-playback-toggle="debris"]');advance(.2);const time=view.time;
    const links=[...view.host.querySelectorAll('[data-debris-nav] a')];expect(links).toHaveLength(4);
    for(const link of links){act(()=>link.click());expect(document.activeElement.id).toBe(link.hash.slice(1));expect(view.time).toBe(time);expect(view.playing).toBe(true);}
    view.click('[data-debris-compare]');expect(view.host.querySelector('[data-debris-pair-shot="reference"]')).toBeNull();
    view.click('[data-debris-compare]');expect(view.host.querySelector('[data-debris-pair-shot="reference"]')).not.toBeNull();expect(view.data.opsDebrisBaseline).toEqual(saved);
    view.click('[data-debris-pair-mode="contact"]');view.patch({opsMode:'power'});view.patch({opsMode:'debris'});
    expect(view.host.querySelector('[data-debris-pair]').dataset.mode).toBe('contact');expect(view.data.opsDebrisBaseline).toEqual(saved);
  });

  it('labels a later reference as still flying and never normalizes its time to the current shot',()=>{
    const current=model({gap:2,speed:12}),reference=model({gap:20,speed:7});
    const view=mountDebris({opsShieldGap:2,opsDebrisSpeed:12,opsDebrisBaseline:snapshot(reference),opsDebrisPairMode:'clock'});
    view.click('[data-debris-pair-event="wall"]');
    const shot=view.host.querySelector('[data-debris-pair-shot="reference"]');expect(shot.dataset.phase).toBe('cloud');expect(Number(shot.dataset.time)).toBe(current.arrivalUs);
    view.click('[data-debris-pair-mode="contact"]');expect(Number(shot.dataset.time)).toBe(reference.arrivalUs);expect(shot.dataset.phase).toBe('contact');expect(view.time).toBe(current.arrivalUs);
    view.patch({opsDebrisPairMode:'bad'});expect(view.host.querySelector('[data-debris-pair]').dataset.mode).toBe('contact');
    view.patch({opsDebrisBaseline:{version:2,gap:20}});expect(view.host.querySelector('[data-debris-pair-shot="reference"] h5').textContent).toBe('2 cm reference');
  });

  it('measures first-contact aperture readings without disturbing playback or saved designs',()=>{
    const saved=snapshot(model({gap:2})),view=mountDebris({opsDebrisBaseline:saved});
    const energy=id=>view.host.querySelector('[data-debris-detector-energy="'+id+'"]').textContent;
    const centered=energy('current');expect(parseFloat(centered)).toBeGreaterThan(0);
    view.click('[data-iss-playback-toggle="debris"]');advance(.2);const time=view.time;
    view.click('[data-debris-detector-preset="current"]');expect(parseFloat(energy('current'))).toBeLessThan(parseFloat(centered));expect(energy('reference')).toBe('0 J');
    expect(view.host.querySelector('[data-debris-detector-status="current"]').textContent).toBe('Partial overlap');
    view.change('iss-debris-detector-radius',2);expect(view.time).toBe(time);expect(view.playing).toBe(true);expect(view.data.opsDebrisBaseline).toEqual(saved);
    view.click('[data-debris-detector-preset="outside"]');expect(energy('current')).toBe('0 J');expect(energy('reference')).toBe('0 J');
    view.click('[data-debris-detector-preset="center"]');const value=energy('current');advance(.2);expect(energy('current')).toBe(value);
    view.click('[data-debris-event="wall"]');expect(energy('current')).toBe(value);expect(view.data.opsDebrisBaseline).toEqual(saved);
    view.click('[data-debris-detector-preset="reference"]');expect(view.data.opsDebrisDetectorOffset).toBe(model({gap:2}).wallRadius*1000);
  });

  it('captures horizontal aperture dragging using the rendered physical scale and ignores other pointers',()=>{
    const view=mountDebris(),stage=view.host.querySelector('[data-debris-detector-stage]'),svg=stage.querySelector('svg');
    vi.spyOn(svg,'getBoundingClientRect').mockReturnValue({left:20,width:550});let captured=false;
    stage.setPointerCapture=()=>{captured=true;};stage.hasPointerCapture=()=>captured;stage.releasePointerCapture=()=>{captured=false;};
    const k=Number(svg.dataset.debrisDetectorScale),x=mm=>20+180+mm/1000*k;
    view.click('[data-iss-playback-toggle="debris"]');advance(.1);const time=view.time;
    act(()=>Simulate.pointerDown(stage,{button:0,isPrimary:true,pointerId:5,clientX:x(12)}));expect(view.data.opsDebrisDetectorOffset).toBe(12);
    expect(document.activeElement).toBe(stage);expect(stage.hasAttribute('data-dragging')).toBe(true);
    act(()=>Simulate.pointerMove(stage,{pointerId:6,clientX:x(22)}));expect(view.data.opsDebrisDetectorOffset).toBe(12);
    act(()=>Simulate.pointerMove(stage,{pointerId:5,clientX:x(22)}));expect(view.data.opsDebrisDetectorOffset).toBe(22);
    expect(Number(view.host.querySelector('[data-debris-aperture]').getAttribute('cx'))).toBeCloseTo(180+.022*k,10);
    act(()=>Simulate.pointerCancel(stage,{pointerId:5}));act(()=>Simulate.pointerMove(stage,{pointerId:5,clientX:x(0)}));
    expect(view.data.opsDebrisDetectorOffset).toBe(22);expect(captured).toBe(false);expect(stage.hasAttribute('data-dragging')).toBe(false);
    expect(view.time).toBe(time);expect(view.playing).toBe(true);
  });

  it('supports bounded aperture keyboard controls and preserves scale when the reference is hidden',()=>{
    const view=mountDebris({opsDebrisBaseline:snapshot(model({gap:20}))}),stage=view.host.querySelector('[data-debris-detector-stage]');
    const key=key=>act(()=>Simulate.keyDown(stage,{key}));key('ArrowRight');expect(view.data.opsDebrisDetectorOffset).toBe(.5);key('PageUp');expect(view.data.opsDebrisDetectorOffset).toBe(5.5);key('PageDown');expect(view.data.opsDebrisDetectorOffset).toBe(.5);key('ArrowDown');expect(view.data.opsDebrisDetectorOffset).toBe(0);
    key('End');expect(Number(stage.getAttribute('aria-valuenow'))).toBe(Number(stage.getAttribute('aria-valuemax')));expect(view.host.querySelector('[data-debris-detector-energy="current"]').textContent).toBe('0 J');
    key('Home');key('ArrowLeft');expect(view.data.opsDebrisDetectorOffset).toBe(0);
    view.change('iss-debris-detector-offset',20);expect(Number(stage.getAttribute('aria-valuenow'))).toBe(20);
    const scale=view.host.querySelector('[data-debris-detector-scale]').dataset.debrisDetectorScale;
    view.click('[data-debris-compare]');expect(view.host.querySelector('[data-debris-detector-result="reference"]')).toBeNull();expect(view.host.querySelector('[data-debris-detector-scale]').dataset.debrisDetectorScale).toBe(scale);
    view.click('[data-debris-compare]');expect(view.data.opsDebrisDetectorOffset).toBe(20);expect(view.host.querySelector('[data-debris-detector-result="reference"]')).not.toBeNull();
    view.patch({opsMode:'power'});view.patch({opsMode:'debris'});expect(Number(view.host.querySelector('#iss-debris-detector-offset').value)).toBe(20);
  });

  it('ignores unsupported aperture gestures and clearly reports whole-footprint sampling at zero spread',()=>{
    const view=mountDebris({opsDebrisSpread:0,opsDebrisSize:.2,opsDebrisDetectorRadius:30}),stage=view.host.querySelector('[data-debris-detector-stage]');
    for(const props of [{button:2,isPrimary:true},{button:0,isPrimary:false},{button:0,isPrimary:true}])act(()=>Simulate.pointerDown(stage,{...props,pointerId:4,clientX:100}));
    expect(stage._issDebrisDetectorDrag).toBeUndefined();expect(view.time).toBe(0);
    expect(view.host.querySelector('[data-debris-detector-status="current"]').textContent).toBe('Entire footprint sampled');
    expect(view.host.querySelector('[data-debris-detector-fraction="current"]').textContent).toBe('100.00 %');
    view.patch({opsDebrisDetectorRadius:'bad',opsDebrisDetectorOffset:Infinity});expect(view.host.querySelector('#iss-debris-detector-radius').value).toBe('10');expect(view.host.querySelector('#iss-debris-detector-offset').value).toBe('0');
    expect(view.host.querySelector('[data-debris-detector]').textContent).not.toMatch(/NaN|Infinity/);
    view.change('iss-debris-detector-radius',.5);const ruler=Number(view.host.querySelector('[data-debris-detector-ruler]').dataset.length);
    const label=parseFloat(view.host.querySelector('.iss-debris-map-label.is-ruler').textContent);expect(label/1000).toBeCloseTo(ruler,12);expect(label).toBe(.2);
    expect(430+ruler*Number(view.host.querySelector('[data-debris-detector-scale]').dataset.debrisDetectorScale)).toBeLessThan(550);
  });

  it('links radial scan units, live measurements and map position without changing the experiment clock',()=>{
    const saved=snapshot(model({gap:2})),view=mountDebris({opsDebrisBaseline:saved});
    const root=view.host.querySelector('[data-debris-scan]'),stage=view.host.querySelector('[data-debris-scan-stage]');
    const point=id=>Number(view.host.querySelector('[data-debris-scan-point="'+id+'"]').dataset.value);
    const path=()=>view.host.querySelector('[data-debris-scan-curve="current"]').getAttribute('d');
    const high=root.dataset.high,curve=path();
    view.click('[data-iss-playback-toggle="debris"]');advance(.2);const time=view.time;
    view.change('iss-debris-detector-offset',35);expect(stage.getAttribute('aria-valuenow')).toBe('35');expect(path()).toBe(curve);expect(root.dataset.high).toBe(high);
    expect(point('current')).toBeCloseTo(detector(model({}),model({gap:2}),{offset:35}).current.energy,12);
    view.click('[data-debris-scan-metric="mass"]');expect(root.dataset.metric).toBe('mass');expect(stage.getAttribute('aria-valuetext')).toContain('mg');
    expect(point('current')).toBeCloseTo(detector(model({}),model({gap:2}),{offset:35}).current.mass*1e6,12);
    expect(view.time).toBe(time);expect(view.playing).toBe(true);expect(view.data.opsDebrisBaseline).toEqual(saved);
    const massHigh=root.dataset.high;view.click('[data-debris-compare]');expect(root.dataset.high).toBe(massHigh);expect(view.host.querySelector('[data-debris-scan-curve="reference"]')).toBeNull();expect(stage.getAttribute('aria-valuetext')).not.toContain('reference');
    view.click('[data-debris-compare]');expect(view.host.querySelector('[data-debris-scan-curve="reference"]')).not.toBeNull();
    view.patch({opsMode:'power'});view.patch({opsMode:'debris'});expect(view.host.querySelector('[data-debris-scan]').dataset.metric).toBe('mass');expect(view.data.opsDebrisDetectorOffset).toBe(35);
  });

  it('captures radial chart gestures in rendered plot coordinates and shares the aperture bounds',()=>{
    const view=mountDebris(),stage=view.host.querySelector('[data-debris-scan-stage]'),svg=stage.querySelector('svg');
    vi.spyOn(svg,'getBoundingClientRect').mockReturnValue({left:17,width:300});let captured=false;
    stage.setPointerCapture=()=>{captured=true;};stage.hasPointerCapture=()=>captured;stage.releasePointerCapture=()=>{captured=false;};
    const max=Number(stage.getAttribute('aria-valuemax')),x=mm=>17+(12+mm/max*576)/2;
    act(()=>Simulate.pointerDown(stage,{button:0,isPrimary:true,pointerId:8,clientX:x(12)}));expect(view.data.opsDebrisDetectorOffset).toBe(12);expect(document.activeElement).toBe(stage);
    act(()=>Simulate.pointerMove(stage,{pointerId:9,clientX:x(22)}));expect(view.data.opsDebrisDetectorOffset).toBe(12);
    act(()=>Simulate.pointerMove(stage,{pointerId:8,clientX:x(22)}));expect(view.host.querySelector('#iss-debris-detector-offset').value).toBe('22');expect(view.host.querySelector('[data-debris-detector-stage]').getAttribute('aria-valuenow')).toBe('22');
    act(()=>Simulate.pointerMove(stage,{pointerId:8,clientX:400}));expect(view.data.opsDebrisDetectorOffset).toBe(max);expect(view.host.querySelector('[data-debris-scan-point="current"]').dataset.value).toBe('0');
    act(()=>Simulate.pointerMove(stage,{pointerId:8,clientX:0}));expect(view.data.opsDebrisDetectorOffset).toBe(0);
    act(()=>Simulate.lostPointerCapture(stage,{pointerId:8}));act(()=>Simulate.pointerMove(stage,{pointerId:8,clientX:x(10)}));expect(view.data.opsDebrisDetectorOffset).toBe(0);expect(captured).toBe(false);expect(stage.hasAttribute('data-dragging')).toBe(false);
    for(const props of [{button:2,isPrimary:true},{button:0,isPrimary:false}])act(()=>Simulate.pointerDown(stage,{...props,pointerId:4,clientX:x(10)}));expect(stage._issDebrisDetectorDrag).toBeUndefined();
  });

  it('supports radial scan keyboard limits and preserves tiny signals on absolute axes',()=>{
    const view=mountDebris({opsDebrisSize:.2,opsDebrisSpread:0,opsDebrisScanMetric:'invalid'}),stage=view.host.querySelector('[data-debris-scan-stage]');
    const key=key=>act(()=>Simulate.keyDown(stage,{key}));
    expect(view.host.querySelector('[data-debris-scan]').dataset.metric).toBe('energy');key('ArrowRight');key('PageUp');expect(view.data.opsDebrisDetectorOffset).toBe(5.5);key('PageDown');key('ArrowDown');expect(view.data.opsDebrisDetectorOffset).toBe(0);
    key('End');expect(view.host.querySelector('[data-debris-scan-reading="current"]').textContent).toBe('0 J');expect(Number(stage.getAttribute('aria-valuenow'))).toBe(Number(stage.getAttribute('aria-valuemax')));
    key('Home');expect(view.host.querySelector('[data-debris-scan-reading="current"]').textContent).not.toBe('0 J');
    view.change('iss-debris-detector-radius',.5);view.click('[data-debris-scan-metric="mass"]');expect(stage.getAttribute('aria-valuetext')).toContain('mg');expect(view.host.querySelector('[data-debris-scan]').textContent).not.toMatch(/NaN|Infinity/);
    expect(view.time).toBe(0);expect(view.data.opsDebrisSize).toBe(.2);expect(view.data.opsDebrisSpread).toBe(0);
  });

  it('links sideways-energy scanning, motion arrows and an inner-rim experiment without stopping playback',()=>{
    const saved=snapshot(model({gap:2})),view=mountDebris({opsDebrisBaseline:saved});view.change('iss-debris-detector-radius',2);
    view.click('[data-iss-playback-toggle="debris"]');advance(.1);const time=view.time;
    view.click('[data-debris-scan-metric="expansion"]');const panel=view.host.querySelector('[data-debris-scan]');
    expect(panel.dataset.metric).toBe('expansion');expect(view.host.querySelector('[data-debris-scan-unit]').textContent).toBe('Sideways energy / J');
    const energy=()=>Number(view.host.querySelector('[data-debris-scan-point="current"]').dataset.value),mass=()=>view.host.querySelector('[data-debris-detector-mass="current"]').textContent;
    const atCenter=energy(),massAtCenter=mass();view.click('[data-debris-detector-preset="inner"]');expect(energy()).toBeGreaterThan(atCenter*100);expect(mass()).toBe(massAtCenter);
    expect(view.host.querySelector('[data-debris-scan-reading="current"]').textContent).toBe(view.host.querySelector('[data-debris-detector-expansion="current"]').textContent);
    const vectors=[...view.host.querySelectorAll('[data-debris-motion-vector]')];expect(vectors).toHaveLength(16);
    vectors.forEach(n=>{expect(Number(n.getAttribute('x2'))-Number(n.getAttribute('x1'))).toBeCloseTo(Number(n.dataset.vx)*.008,10);expect(Number(n.getAttribute('y2'))-Number(n.getAttribute('y1'))).toBeCloseTo(Number(n.dataset.vy)*.008,10);});
    expect(view.time).toBe(time);expect(view.playing).toBe(true);expect(view.data.opsDebrisBaseline).toEqual(saved);
    view.click('[data-debris-detector-preset="outside"]');expect(view.host.querySelector('[data-debris-detector-rms="current"]').textContent).toBe('—');expect(energy()).toBe(0);
    view.click('[data-debris-scan-metric="mass"]');expect(view.host.querySelector('[data-debris-velocity-field]')).toBeNull();
  });

  it('keeps sideways comparisons stable when hiding a reference and explains zero-spread states',()=>{
    const saved=snapshot(model({gap:2})),view=mountDebris({opsDebrisScanMetric:'expansion',opsDebrisBaseline:saved});
    const p=view.host.querySelector('[data-debris-scan]'),high=p.dataset.high;
    view.click('[data-debris-compare]');expect(p.dataset.high).toBe(high);view.click('[data-debris-compare]');
    view.patch({opsMode:'power'});view.patch({opsMode:'debris'});expect(view.host.querySelector('[data-debris-scan]').dataset.metric).toBe('expansion');
    view.change('iss-debris-spread',0);expect(view.host.querySelector('[data-debris-motion-legend]').textContent).toContain('No sideways motion');expect(view.host.querySelector('[data-debris-velocity-field]')).toBeNull();
    expect(view.host.querySelector('[data-debris-scan]').dataset.empty).toBe('false');expect(view.host.querySelector('#iss-debris-scan-help').textContent).toContain('current design has zero spread');
    view.click('[data-debris-pin]');expect(view.host.querySelector('[data-debris-scan]').dataset.empty).toBe('true');
    expect(view.host.querySelector('#iss-debris-scan-help').textContent).toContain('Both designs have zero sideways energy');
    expect(view.host.querySelector('[data-debris-detector-rms="current"]').textContent).toBe('0 km/s');expect(view.host.querySelector('[data-debris-scan]').textContent).not.toMatch(/NaN|Infinity/);
  });

  it('reveals weak signals without changing physical readings, axes, aperture or active playback',()=>{
    const saved=snapshot(model({gap:2})),view=mountDebris({opsDebrisBaseline:saved,opsDebrisScanMetric:'expansion'});
    const panel=()=>view.host.querySelector('[data-debris-scan]'),point=()=>view.host.querySelector('[data-debris-scan-point="current"]');
    const value=point().dataset.value,linearTop=parseFloat(point().style.top),high=panel().dataset.high;
    const readings=view.host.querySelector('.iss-debris-scan-readings').textContent,delta=view.host.querySelector('[data-debris-scan-delta]').textContent;
    view.click('[data-iss-playback-toggle="debris"]');advance(.1);const time=view.time;
    view.click('[data-debris-scan-scale="softlog"]');expect(panel().dataset.scale).toBe('softlog');expect(parseFloat(point().style.top)).toBeLessThan(linearTop-15);
    expect(point().dataset.value).toBe(value);expect(panel().dataset.high).toBe(high);expect(view.host.querySelector('.iss-debris-scan-readings').textContent).toBe(readings);expect(view.host.querySelector('[data-debris-scan-delta]').textContent).toBe(delta);
    expect(view.time).toBe(time);expect(view.playing).toBe(true);expect(view.data.opsDebrisBaseline).toEqual(saved);expect(view.data.opsDebrisDetectorOffset||0).toBe(0);
    const ticks=[...view.host.querySelectorAll('[data-debris-scan-tick]')].map(n=>n.dataset.debrisScanTick),path=view.host.querySelector('[data-debris-scan-curve="current"]').getAttribute('d');
    view.click('[data-debris-compare]');expect(panel().dataset.high).toBe(high);expect(view.host.querySelector('[data-debris-scan-difference]')).toBeNull();expect(view.host.querySelector('[data-debris-scan-curve="current"]').getAttribute('d')).toBe(path);expect([...view.host.querySelectorAll('[data-debris-scan-tick]')].map(n=>n.dataset.debrisScanTick)).toEqual(ticks);
    view.click('[data-debris-compare]');view.click('[data-debris-scan-metric="mass"]');expect(panel().dataset.scale).toBe('softlog');expect(view.host.querySelector('[data-debris-scan-delta]').textContent).toContain('mg');
    const stage=view.host.querySelector('[data-debris-scan-stage]');act(()=>Simulate.keyDown(stage,{key:'End'}));expect(point().dataset.value).toBe('0');expect(parseFloat(point().style.top)).toBeCloseTo(92.5,8);
    view.patch({opsMode:'power'});view.patch({opsMode:'debris'});expect(panel().dataset.scale).toBe('softlog');
    view.click('[data-debris-scan-scale="linear"]');expect(panel().dataset.scale).toBe('linear');view.patch({opsDebrisScanScale:'bad'});expect(panel().dataset.scale).toBe('linear');
  });

  it('reports signed physical differences and handles zero reference ratios honestly',()=>{
    const view=mountDebris({opsDebrisBaseline:snapshot(model({gap:2})),opsDebrisScanMetric:'expansion',opsDebrisScanScale:'softlog'});
    const point=id=>Number(view.host.querySelector('[data-debris-scan-point="'+id+'"]').dataset.value),delta=()=>view.host.querySelector('[data-debris-scan-difference]'),ratio=()=>view.host.querySelector('[data-debris-scan-ratio]');
    expect(Number(delta().dataset.debrisScanDifference)).toBe(point('current')-point('reference'));expect(Number(ratio().dataset.debrisScanRatio)).toBeCloseTo(point('current')/point('reference'),12);
    expect(view.host.querySelector('[data-debris-scan-delta]').textContent).toMatch(/^−/);
    view.click('[data-debris-detector-preset="inner"]');expect(point('reference')).toBe(0);expect(ratio().textContent).toContain('Reference is zero');expect(ratio().dataset.debrisScanRatio).toBe('');expect(view.host.querySelector('[data-debris-scan-delta]').textContent).toMatch(/^\+/);
    view.click('[data-debris-detector-preset="outside"]');expect(ratio().textContent).toBe('Both readings are zero here.');expect(view.host.querySelector('[data-debris-scan-delta]').textContent).toBe('0 J');
    view.click('[data-debris-detector-preset="center"]');view.change('iss-debris-spread',0);expect(ratio().textContent).toBe('0× of reference at this offset');
    view.click('[data-debris-pin]');expect(ratio().textContent).toBe('Both readings are zero here.');expect(view.host.querySelector('[data-debris-scan]').textContent).not.toMatch(/NaN|Infinity/);
  });

  it('compares marked A and live B with exact readings while preserving playback and reference',()=>{
    const saved=snapshot(model({gap:2})),view=mountDebris({opsDebrisBaseline:saved,opsDebrisScanMetric:'expansion',opsDebrisScanScale:'softlog'});
    const read=id=>Number(view.host.querySelector('[data-debris-position-reading="'+id+'"]').dataset.value);
    view.click('[data-iss-playback-toggle="debris"]');advance(.1);const time=view.time;
    view.click('[data-debris-position-mark]');const mark=JSON.stringify(view.data.opsDebrisPositionA),center=read('a');
    expect(view.data.opsDebrisPositionA.offset).toBe(0);expect(read('b')).toBe(center);expect(read('delta')).toBe(0);
    expect(view.host.querySelector('[data-debris-position-point]').dataset.debrisPositionPoint).toBe(String(center));
    view.click('[data-debris-detector-preset="inner"]');expect(read('a')).toBe(center);expect(read('b')).toBeGreaterThan(center*10);expect(read('delta')).toBe(read('b')-read('a'));
    const circle=view.host.querySelector('[data-debris-position-aperture]');expect(Number(circle.getAttribute('cx'))).toBe(180);expect(Number(circle.getAttribute('r'))).toBe(Number(view.host.querySelector('[data-debris-aperture]').getAttribute('r')));
    expect(Number(view.host.querySelector('[data-debris-position-distance]').dataset.debrisPositionDistance)).toBeCloseTo(view.data.opsDebrisDetectorOffset,12);
    view.click('[data-debris-scan-metric="mass"]');expect(read('delta')).toBeCloseTo(0,12);expect(view.host.querySelector('[data-debris-position-reading="a"]').textContent).toContain('mg');
    view.click('[data-debris-scan-scale="linear"]');view.click('[data-debris-compare]');expect(JSON.stringify(view.data.opsDebrisPositionA)).toBe(mark);expect(view.host.querySelector('[data-debris-position-bracket]')).not.toBeNull();
    view.click('[data-debris-position-return]');expect(view.data.opsDebrisDetectorOffset).toBe(0);expect(read('delta')).toBe(0);
    view.click('[data-debris-scan-metric="expansion"]');view.click('[data-debris-detector-preset="inner"]');view.click('[data-debris-position-mark]');view.click('[data-debris-detector-preset="center"]');expect(read('delta')).toBeLessThan(0);
    expect(view.time).toBe(time);expect(view.playing).toBe(true);expect(view.data.opsDebrisBaseline).toEqual(saved);
    view.click('[data-debris-position-clear]');expect(view.data.opsDebrisPositionA).toBeNull();expect(view.host.querySelector('[data-debris-position-aperture]')).toBeNull();expect(view.host.querySelector('[data-debris-position-point]')).toBeNull();expect(document.activeElement).toBe(view.host.querySelector('[data-debris-position-mark]'));
    expect(view.time).toBe(time);expect(view.playing).toBe(true);
  });

  it.each([['iss-debris-size',2],['iss-debris-speed',9],['iss-shield-gap',18],['iss-debris-bumper',1],['iss-debris-material','glass'],['iss-debris-spread',20],['iss-debris-detector-radius',2]])('clears A permanently when %s changes', (id,value)=>{
    const view=mountDebris(),original=view.host.querySelector('#'+id).value;view.click('[data-debris-position-mark]');view.change(id,value);
    expect(view.data.opsDebrisPositionA).toBeNull();expect(view.host.querySelector('[data-debris-position-aperture]')).toBeNull();expect(view.host.querySelector('[data-debris-position-notice]').textContent).toContain('setup or aperture size changed');
    view.change(id,original);expect(view.data.opsDebrisPositionA).toBeNull();expect(view.host.querySelector('[data-debris-position-reading="a"]')).toBeNull();
  });

  it('keeps A across reference and view changes but explicitly clears an out-of-range mark',()=>{
    const view=mountDebris({opsDebrisBaseline:snapshot(model({gap:20}))});view.click('[data-debris-position-mark]');
    view.click('[data-debris-pin]');expect(view.data.opsDebrisPositionA.offset).toBe(0);view.patch({opsMode:'power'});view.patch({opsMode:'debris'});expect(view.host.querySelector('[data-debris-position-reading="a"]')).not.toBeNull();
    view.patch({opsDebrisBaseline:snapshot(model({gap:20}))});view.click('[data-debris-detector-preset="outside"]');view.click('[data-debris-position-mark]');const old=view.data.opsDebrisPositionA.offset;
    view.click('[data-debris-pin]');expect(view.data.opsDebrisPositionA).toBeNull();expect(view.host.querySelector('[data-debris-position-notice]').textContent).toContain('outside the new scan range');
    view.patch({opsDebrisBaseline:snapshot(model({gap:20}))});expect(view.data.opsDebrisPositionA).toBeNull();expect(view.data.opsDebrisDetectorOffset).toBeCloseTo(old*1000,12);
  });

  it('loads valid position marks and handles malformed marks and zero-spread measurements',()=>{
    const m=model({spread:0}),aperture=detector(m,model({gap:2,spread:0}),{radius:10}),mark=positionMark(m,aperture);
    const view=mountDebris({opsDebrisSpread:0,opsDebrisPositionA:JSON.parse(JSON.stringify(mark)),opsDebrisScanMetric:'expansion',opsDebrisScanScale:'softlog'});
    expect(view.host.querySelector('[data-debris-position-reading="delta"]').textContent).toBe('0 J');view.click('[data-debris-detector-preset="outside"]');expect(view.host.querySelector('[data-debris-position-reading="delta"]').textContent).toBe('0 J');
    for(const invalid of [{...mark,offset:NaN},{...mark,radius:.002},{...mark,setup:{}}]){view.patch({opsDebrisPositionA:invalid});expect(view.host.querySelector('[data-debris-position-aperture]')).toBeNull();expect(view.host.querySelector('[data-debris-position-notice]').textContent).toContain('Saved position unavailable');}
    expect(view.host.querySelector('[data-debris-position]').textContent).not.toMatch(/NaN|Infinity/);view.click('[data-debris-position-mark]');expect(view.data.opsDebrisPositionA.offset).toBe(aperture.maxOffset);
  });

  it('inspects the computed peak at full precision without moving A or stopping playback',()=>{
    const saved=snapshot(model({gap:2})),view=mountDebris({opsDebrisBaseline:saved,opsDebrisScanMetric:'expansion',opsDebrisScanScale:'softlog'});
    view.click('[data-debris-position-mark]');const mark=JSON.stringify(view.data.opsDebrisPositionA),p=scan(model({}),model({gap:2}),{radius:10,metric:'expansion'}).current.maximum;
    view.click('[data-iss-playback-toggle="debris"]');advance(.1);const time=view.time;
    view.click('[data-debris-peak-inspect]');expect(view.data.opsDebrisDetectorOffset).toBe(p.offset*1000);
    expect(Math.abs(view.data.opsDebrisDetectorOffset-Math.round(view.data.opsDebrisDetectorOffset*2)/2)).toBeGreaterThan(.001);
    expect(Number(view.host.querySelector('[data-debris-scan-point="current"]').dataset.value)).toBeCloseTo(p.value,12);expect(Number(view.host.querySelector('[data-debris-position-reading="b"]').dataset.value)).toBeCloseTo(p.value,12);
    expect(Number(view.host.querySelector('[data-debris-peak-point]').dataset.debrisPeakPoint)).toBe(p.offset);expect(JSON.stringify(view.data.opsDebrisPositionA)).toBe(mark);expect(view.time).toBe(time);expect(view.playing).toBe(true);expect(view.data.opsDebrisBaseline).toEqual(saved);
    view.click('[data-debris-scan-scale="linear"]');view.click('[data-debris-compare]');expect(view.data.opsDebrisDetectorOffset).toBe(p.offset*1000);expect(Number(view.host.querySelector('[data-debris-peak]').dataset.value)).toBe(p.value);
  });

  it('shows maximum plateaus honestly and inspects their center in either unit',()=>{
    const view=mountDebris(),p=()=>view.host.querySelector('[data-debris-peak]');
    expect(p().dataset.debrisPeak).toBe('plateau');expect(view.host.querySelector('[data-debris-peak-range]')).not.toBeNull();expect(p().textContent).toContain('Same maximum from 0');
    view.click('[data-debris-detector-preset="outside"]');view.click('[data-debris-peak-inspect]');expect(view.data.opsDebrisDetectorOffset).toBe(0);
    view.click('[data-debris-scan-metric="mass"]');expect(p().textContent).toContain('mg');expect(Number(p().dataset.value)).toBe(detector(model({}),null,{radius:10}).current.mass*1e6);
    view.click('[data-debris-preset="compact"]');view.click('[data-debris-scan-metric="expansion"]');expect(p().dataset.debrisPeak).toBe('plateau');expect(Number(p().dataset.value)).toBe(model({gap:2}).expansion);
  });

  it('disables a meaningless peak action for zero energy and recovers when spread returns',()=>{
    const view=mountDebris({opsDebrisSpread:0,opsDebrisScanMetric:'expansion',opsDebrisBaseline:snapshot(model({}))});
    view.click('[data-debris-detector-preset="outside"]');const offset=view.data.opsDebrisDetectorOffset;
    expect(view.host.querySelector('[data-debris-peak]').dataset.debrisPeak).toBe('zero');expect(view.host.querySelector('[data-debris-peak-inspect]').disabled).toBe(true);expect(view.host.querySelector('[data-debris-peak-point]')).toBeNull();
    view.click('[data-debris-peak-inspect]');expect(view.data.opsDebrisDetectorOffset).toBe(offset);expect(view.host.querySelector('#iss-debris-peak-location').textContent).toContain('Zero sideways energy at every offset');
    view.change('iss-debris-spread',10);expect(view.host.querySelector('[data-debris-peak-inspect]').disabled).toBe(false);expect(view.host.querySelector('[data-debris-peak]').dataset.debrisPeak).toBe('peak');
  });

  it('inspects physical half-maximum edges without snapping or disturbing A, time or reference',()=>{
    const saved=snapshot(model({gap:2})),view=mountDebris({opsDebrisBaseline:saved,opsDebrisScanMetric:'expansion',opsDebrisScanScale:'softlog'});
    const p=scan(model({}),model({gap:2}),{radius:10,metric:'expansion'}).current.halfMaximum,panel=()=>view.host.querySelector('[data-debris-half]');
    expect(Number(panel().dataset.value)).toBe(p.value);expect(Number(panel().dataset.from)).toBe(p.from);expect(Number(panel().dataset.to)).toBe(p.to);expect(Number(panel().dataset.span)).toBe(p.span);
    expect(view.host.querySelector('[data-debris-half-inspect="inner"]').textContent).toBe('Inspect inner edge');expect(view.host.querySelector('[data-debris-half-range]')).not.toBeNull();
    view.click('[data-debris-position-mark]');const mark=JSON.stringify(view.data.opsDebrisPositionA);view.click('[data-iss-playback-toggle="debris"]');advance(.1);const time=view.time;
    for(const [side,offset] of [['inner',p.from],['outer',p.to]]){
      view.click('[data-debris-half-inspect="'+side+'"]');expect(view.data.opsDebrisDetectorOffset).toBe(offset*1000);
      expect(Math.abs(view.data.opsDebrisDetectorOffset-Math.round(view.data.opsDebrisDetectorOffset*2)/2)).toBeGreaterThan(.001);
      expect(Number(view.host.querySelector('[data-debris-scan-point="current"]').dataset.value)/p.value).toBeCloseTo(1,6);
      expect(JSON.stringify(view.data.opsDebrisPositionA)).toBe(mark);expect(view.time).toBe(time);expect(view.playing).toBe(true);expect(view.data.opsDebrisBaseline).toEqual(saved);
    }
    view.click('[data-debris-scan-scale="linear"]');view.click('[data-debris-compare]');expect(Number(panel().dataset.from)).toBe(p.from);expect(Number(panel().dataset.to)).toBe(p.to);expect(view.data.opsDebrisDetectorOffset).toBe(p.to*1000);
  });

  it('calls a centered half-maximum interval a center inspection and updates its units',()=>{
    const view=mountDebris(),button=()=>view.host.querySelector('[data-debris-half-inspect="inner"]'),panel=()=>view.host.querySelector('[data-debris-half]');
    expect(button().textContent).toBe('Inspect center');expect(Number(panel().dataset.from)).toBe(0);
    view.click('[data-debris-detector-preset="outside"]');view.click('[data-debris-half-inspect="inner"]');expect(view.data.opsDebrisDetectorOffset).toBe(0);
    const outer=Number(panel().dataset.to);view.click('[data-debris-scan-metric="mass"]');expect(panel().textContent).toContain('mg');expect(Number(panel().dataset.to)).toBeCloseTo(outer,12);expect(button().textContent).toBe('Inspect center');
    view.click('[data-debris-preset="compact"]');view.click('[data-debris-scan-metric="expansion"]');expect(button().textContent).toBe('Inspect center');expect(Number(panel().dataset.from)).toBe(0);
  });

  it('omits meaningless half-maximum controls at zero energy and restores them with spread',()=>{
    const view=mountDebris({opsDebrisSpread:0,opsDebrisScanMetric:'expansion',opsDebrisBaseline:snapshot(model({}))});
    expect(view.host.querySelector('[data-debris-half]').dataset.empty).toBe('true');expect(view.host.querySelector('[data-debris-half-inspect]')).toBeNull();expect(view.host.querySelector('[data-debris-half-range]')).toBeNull();
    expect(view.host.querySelector('[data-debris-half]').textContent).not.toMatch(/NaN|Infinity/);
    view.change('iss-debris-spread',10);expect(view.host.querySelector('[data-debris-half]').dataset.empty).toBe('false');expect(view.host.querySelectorAll('[data-debris-half-inspect]')).toHaveLength(2);expect(view.host.querySelector('[data-debris-half-range]')).not.toBeNull();
  });

  it('opens aperture comparisons on demand without changing A, offset, playback or the saved design',()=>{
    const saved=snapshot(model({gap:2})),view=mountDebris({opsDebrisBaseline:saved,opsDebrisScanMetric:'expansion'}),toggle=()=>view.host.querySelector('[data-debris-aperture-toggle]'),body=()=>view.host.querySelector('#iss-debris-aperture-study-content');
    expect(view.host.querySelector('[data-debris-aperture-study]')).not.toBeNull();expect(toggle().getAttribute('aria-expanded')).toBe('false');expect(body().hidden).toBe(true);expect(body().childElementCount).toBe(0);
    expect(toggle().getAttribute('aria-controls')).toBe(body().id);expect(view.host.querySelector('[data-debris-aperture-option]')).toBeNull();
    view.click('[data-debris-position-mark]');view.change('iss-debris-detector-offset',12);const mark=JSON.stringify(view.data.opsDebrisPositionA);
    view.click('[data-iss-playback-toggle="debris"]');advance(.1);const time=view.time;
    view.click('[data-debris-aperture-toggle]');expect(toggle().getAttribute('aria-expanded')).toBe('true');expect(body().hidden).toBe(false);expect(view.data.opsDebrisApertureStudy).toBe(true);expect(view.host.querySelectorAll('[data-debris-aperture-option]')).toHaveLength(3);expect(view.host.querySelectorAll('[data-debris-aperture-curve]')).toHaveLength(3);
    const current=view.host.querySelector('[data-debris-aperture-use="current"]');expect(current.disabled).toBe(true);view.click('[data-debris-aperture-use="current"]');
    view.click('[data-debris-aperture-toggle]');expect(body().hidden).toBe(true);expect(body().childElementCount).toBe(0);expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(view.data.opsDebrisDetectorOffset).toBe(12);expect(JSON.stringify(view.data.opsDebrisPositionA)).toBe(mark);expect(view.time).toBe(time);expect(view.playing).toBe(true);expect(view.data.opsDebrisBaseline).toEqual(saved);
  });

  it('applies a rounded aperture size and clears A while preserving a valid offset and active shot',()=>{
    const saved=snapshot(model({gap:2})),view=mountDebris({opsDebrisBaseline:saved,opsDebrisDetectorRadius:10.5,opsDebrisApertureStudy:true});
    expect(Number(view.host.querySelector('[data-debris-aperture-option="smaller"]').dataset.radius)).toBe(.0055);view.change('iss-debris-detector-offset',12);view.click('[data-debris-position-mark]');
    view.click('[data-iss-playback-toggle="debris"]');advance(.1);const time=view.time;
    view.click('[data-debris-aperture-use="smaller"]');expect(view.data.opsDebrisDetectorRadius).toBe(5.5);expect(Number(view.host.querySelector('#iss-debris-detector-radius').value)).toBe(5.5);expect(view.data.opsDebrisDetectorOffset).toBe(12);
    expect(view.data.opsDebrisPositionA).toBeNull();expect(view.host.querySelector('[data-debris-position-notice]').textContent).toContain('setup or aperture size changed');expect(view.host.querySelector('[data-debris-position-aperture]')).toBeNull();
    expect(Number(view.host.querySelector('[data-debris-aperture-option="current"]').dataset.radius)).toBe(.0055);expect(view.host.querySelector('[data-debris-aperture-use="current"]').disabled).toBe(true);
    expect(view.time).toBe(time);expect(view.playing).toBe(true);expect(view.data.opsDebrisBaseline).toEqual(saved);expect(view.data.opsDebrisApertureStudy).toBe(true);expect(view.data.opsDebrisSize||1).toBe(1);
  });

  it('clamps a reduced aperture offset against the main scan including a larger saved footprint',()=>{
    const m=model({}),reference=model({gap:20}),saved=snapshot(reference),view=mountDebris({opsDebrisBaseline:saved,opsDebrisDetectorRadius:30,opsDebrisApertureStudy:true});
    view.click('[data-debris-detector-preset="outside"]');const oldOffset=view.data.opsDebrisDetectorOffset;view.click('[data-debris-position-mark]');view.click('[data-debris-event="cloud"]');const time=view.time;
    view.click('[data-debris-aperture-use="smaller"]');const expected=(reference.wallRadius+.015)*1000;
    expect(view.data.opsDebrisDetectorRadius).toBe(15);expect(view.data.opsDebrisDetectorOffset).toBeCloseTo(expected,10);expect(view.data.opsDebrisDetectorOffset).toBeLessThan(oldOffset);expect(view.data.opsDebrisDetectorOffset).toBeGreaterThan((m.wallRadius+.015)*1000);
    expect(Number(view.host.querySelector('[data-debris-scan-stage]').getAttribute('aria-valuemax'))).toBeCloseTo(expected,10);expect(view.host.querySelector('[data-debris-scan-reading="current"]').textContent).toBe('0 J');
    expect(view.data.opsDebrisPositionA).toBeNull();expect(view.time).toBe(time);expect(view.data.opsDebrisBaseline).toEqual(saved);
  });

  it('updates aperture readings with the chosen metric while keeping current-only curves independent of reference and compression',()=>{
    const m=model({}),saved=snapshot(model({gap:2})),view=mountDebris({opsDebrisBaseline:saved,opsDebrisApertureStudy:true,opsDebrisScanMetric:'expansion'});
    const paths=()=>[...view.host.querySelectorAll('[data-debris-aperture-curve]')].map(n=>n.getAttribute('d'));
    view.click('[data-debris-position-mark]');const mark=JSON.stringify(view.data.opsDebrisPositionA);view.click('[data-iss-playback-toggle="debris"]');advance(.1);const time=view.time,original=paths();
    view.change('iss-debris-detector-offset',12);expect(paths()).toEqual(original);view.click('[data-debris-scan-scale="softlog"]');expect(paths()).toEqual(original);view.click('[data-debris-compare]');expect(paths()).toEqual(original);
    view.patch({opsDebrisBaseline:snapshot(model({diameter:12,gap:20}))});expect(paths()).toEqual(original);
    for(const metric of ['mass','energy','expansion']){
      view.click('[data-debris-scan-metric="'+metric+'"]');const expected=apertureStudy(m,{radius:10,metric});
      for(const c of expected.curves){const peak=view.host.querySelector('[data-debris-aperture-peak="'+c.kind+'"]'),span=view.host.querySelector('[data-debris-aperture-span="'+c.kind+'"]');expect(Number(peak.dataset.value)).toBe(c.maximum.value);expect(peak.textContent).toContain(expected.unit);expect(Number(span.dataset.value)).toBe(c.halfMaximum.span);}
    }
    expect(JSON.stringify(view.data.opsDebrisPositionA)).toBe(mark);expect(view.time).toBe(time);expect(view.playing).toBe(true);expect(view.data.opsDebrisDetectorOffset).toBe(12);
    view.patch({opsDebrisScanMetric:'bad'});const expected=apertureStudy(m,{radius:10,metric:'energy'});expect(Number(view.host.querySelector('[data-debris-aperture-peak="current"]').dataset.value)).toBe(expected.curves.find(c=>c.kind==='current').maximum.value);
  });

  it('deduplicates aperture limits and shows unavailable spans for zero sideways energy',()=>{
    const view=mountDebris({opsDebrisApertureStudy:true,opsDebrisDetectorRadius:.5,opsDebrisSpread:0,opsDebrisScanMetric:'expansion'});
    expect(view.host.querySelectorAll('[data-debris-aperture-option]')).toHaveLength(2);expect(view.host.querySelector('[data-debris-aperture-use="smaller"]')).toBeNull();expect(view.host.querySelector('[data-debris-aperture-use="current"]').disabled).toBe(true);
    for(const peak of view.host.querySelectorAll('[data-debris-aperture-peak]'))expect(peak.textContent).toBe('0 J');
    for(const span of view.host.querySelectorAll('[data-debris-aperture-span]')){expect(span.textContent).toBe('—');expect(span.hasAttribute('data-value')).toBe(false);}
    expect(view.host.querySelector('[data-debris-aperture-study]').textContent).not.toMatch(/NaN|Infinity/);
    view.change('iss-debris-detector-radius',30);expect(view.host.querySelectorAll('[data-debris-aperture-option]')).toHaveLength(2);expect(view.host.querySelector('[data-debris-aperture-use="larger"]')).toBeNull();
    view.change('iss-debris-spread',10);for(const span of view.host.querySelectorAll('[data-debris-aperture-span]')){expect(span.textContent).toContain('mm');expect(Number(span.dataset.value)).toBeGreaterThan(0);}
  });

  it('links exact comparison probe readings and markers without moving the main detector or interrupting its experiment',()=>{
    const saved=snapshot(model({gap:2})),view=mountDebris({opsDebrisBaseline:saved,opsDebrisApertureStudy:true,opsDebrisScanMetric:'expansion',opsDebrisScanScale:'softlog'});
    view.change('iss-debris-detector-offset',12.345678901);view.click('[data-debris-position-mark]');const mark=JSON.stringify(view.data.opsDebrisPositionA);
    const stage=()=>view.host.querySelector('[data-debris-aperture-stage]'),paths=()=>[...view.host.querySelectorAll('[data-debris-aperture-curve]')].map(n=>n.getAttribute('d'));
    view.click('[data-iss-playback-toggle="debris"]');advance(.1);const time=view.time,original=paths(),offset=30.123456789;
    view.change('iss-debris-aperture-offset',offset);expect(view.data.opsDebrisApertureOffset).toBe(offset);expect(Number(stage().getAttribute('aria-valuenow'))).toBe(offset);expect(paths()).toEqual(original);
    for(const metric of ['energy','mass','expansion']){
      view.click('[data-debris-scan-metric="'+metric+'"]');const expected=apertureStudy(model({}),{radius:10,metric,offset});
      for(const c of expected.curves){
        const reading=view.host.querySelector('[data-debris-aperture-reading="'+c.kind+'"]'),point=view.host.querySelector('[data-debris-aperture-point="'+c.kind+'"]');
        expect(Number(reading.dataset.value)).toBeCloseTo(c.reading,12);expect(Number(point.dataset.value)).toBeCloseTo(c.reading,12);expect(reading.textContent).toContain(expected.unit);
      }
      expect(stage().getAttribute('aria-valuetext')).toContain(expected.unit);
    }
    view.click('[data-debris-compare]');view.click('[data-debris-aperture-toggle]');view.click('[data-debris-aperture-toggle]');expect(Number(stage().getAttribute('aria-valuenow'))).toBe(offset);
    expect(view.data.opsDebrisDetectorOffset).toBe(12.345678901);expect(JSON.stringify(view.data.opsDebrisPositionA)).toBe(mark);expect(view.time).toBe(time);expect(view.playing).toBe(true);expect(view.data.opsDebrisBaseline).toEqual(saved);
    advance(.1);expect(view.time).toBeGreaterThan(time);
  });

  it('captures comparison-probe gestures across its whole curve domain and cleans up cancellation and pointer ownership',()=>{
    const view=mountDebris({opsDebrisApertureStudy:true,opsDebrisDetectorOffset:7}),stage=view.host.querySelector('[data-debris-aperture-stage]'),svg=stage.querySelector('svg');
    const rect=vi.spyOn(svg,'getBoundingClientRect').mockReturnValue({left:17,width:300});let captured=false;
    stage.setPointerCapture=()=>{captured=true;};stage.hasPointerCapture=()=>captured;stage.releasePointerCapture=()=>{captured=false;};
    const max=Number(stage.getAttribute('aria-valuemax')),mainMax=Number(view.host.querySelector('[data-debris-scan-stage]').getAttribute('aria-valuemax')),x=mm=>17+(12+mm/max*576)/2;
    expect(max).toBeGreaterThan(mainMax);
    act(()=>Simulate.pointerDown(stage,{button:0,isPrimary:true,pointerId:11,pointerType:'touch',clientX:x(12.2)}));expect(view.data.opsDebrisApertureOffset).toBe(12);expect(document.activeElement).toBe(stage);expect(captured).toBe(true);expect(stage.hasAttribute('data-dragging')).toBe(true);
    act(()=>Simulate.pointerDown(stage,{button:0,isPrimary:true,pointerId:12,pointerType:'pen',clientX:x(22)}));expect(view.data.opsDebrisApertureOffset).toBe(12);expect(stage._issApertureDrag.pointer).toBe(11);
    act(()=>Simulate.pointerMove(stage,{pointerId:12,clientX:x(22)}));expect(view.data.opsDebrisApertureOffset).toBe(12);
    act(()=>Simulate.pointerMove(stage,{pointerId:11,clientX:x(22.3)}));expect(view.data.opsDebrisApertureOffset).toBe(22.5);expect(Number(view.host.querySelector('#iss-debris-aperture-offset').value)).toBe(22.5);
    act(()=>Simulate.pointerMove(stage,{pointerId:11,clientX:1e6}));expect(view.data.opsDebrisApertureOffset).toBe(max);
    for(const point of view.host.querySelectorAll('[data-debris-aperture-point]'))expect(Number(point.dataset.value)).toBe(0);
    act(()=>Simulate.pointerCancel(stage,{pointerId:11}));act(()=>Simulate.pointerMove(stage,{pointerId:11,clientX:x(0)}));expect(view.data.opsDebrisApertureOffset).toBe(max);expect(captured).toBe(false);expect(stage.hasAttribute('data-dragging')).toBe(false);
    act(()=>Simulate.pointerDown(stage,{button:0,isPrimary:true,pointerId:13,clientX:-1e6}));expect(view.data.opsDebrisApertureOffset).toBe(0);
    act(()=>Simulate.lostPointerCapture(stage,{pointerId:13}));act(()=>Simulate.pointerMove(stage,{pointerId:13,clientX:x(5)}));expect(view.data.opsDebrisApertureOffset).toBe(0);expect(stage.hasAttribute('data-dragging')).toBe(false);
    for(const props of [{button:2,isPrimary:true},{button:0,isPrimary:false}])act(()=>Simulate.pointerDown(stage,{...props,pointerId:14,clientX:x(5)}));expect(view.data.opsDebrisApertureOffset).toBe(0);
    rect.mockReturnValue({left:17,width:0});act(()=>Simulate.pointerDown(stage,{button:0,isPrimary:true,pointerId:15,clientX:x(5)}));expect(view.data.opsDebrisApertureOffset).toBe(0);expect(view.data.opsDebrisDetectorOffset).toBe(7);
  });

  it('offers matching keyboard and native comparison-probe controls with exact limits and valid stale-state rendering',()=>{
    const view=mountDebris({opsDebrisApertureStudy:true,opsDebrisApertureOffset:Infinity,opsDebrisSpread:0,opsDebrisScanMetric:'expansion'}),stage=()=>view.host.querySelector('[data-debris-aperture-stage]'),input=()=>view.host.querySelector('#iss-debris-aperture-offset');
    const key=(key,node=stage())=>act(()=>Simulate.keyDown(node,{key})),max=Number(stage().getAttribute('aria-valuemax'));
    expect(stage().getAttribute('role')).toBe('slider');expect(stage().tabIndex).toBe(0);expect(Number(stage().getAttribute('aria-valuenow'))).toBe(0);expect(input().step).toBe('any');
    key('ArrowRight');key('PageUp');expect(view.data.opsDebrisApertureOffset).toBe(5.5);key('PageDown',input());key('ArrowDown',input());expect(view.data.opsDebrisApertureOffset).toBe(0);
    key('Home');key('ArrowLeft');expect(view.data.opsDebrisApertureOffset).toBe(0);key('End',input());expect(view.data.opsDebrisApertureOffset).toBe(max);expect(Number(input().value)).toBeCloseTo(max,11);key('ArrowUp');expect(view.data.opsDebrisApertureOffset).toBe(max);
    for(const reading of view.host.querySelectorAll('[data-debris-aperture-reading]'))expect(reading.textContent).toBe('0 J');expect(view.host.querySelectorAll('[data-debris-aperture-point]')).toHaveLength(3);
    view.change('iss-debris-aperture-offset',3.123456789);expect(Number(stage().getAttribute('aria-valuenow'))).toBe(3.123456789);
    view.patch({opsDebrisApertureOffset:1e9});expect(Number(stage().getAttribute('aria-valuenow'))).toBe(max);view.patch({opsDebrisApertureOffset:-1});expect(Number(stage().getAttribute('aria-valuenow'))).toBe(0);
    expect(view.host.querySelector('[data-debris-aperture-study]').textContent).not.toMatch(/NaN|Infinity/);expect(view.data.opsDebrisDetectorOffset||0).toBe(0);
  });

  it('matches the main detector exactly only when its offset lies within the independent comparison range',()=>{
    const saved=snapshot(model({gap:20})),view=mountDebris({opsDebrisBaseline:saved,opsDebrisApertureStudy:true,opsDebrisApertureOffset:8});
    const match=()=>view.host.querySelector('[data-debris-aperture-match]'),stage=()=>view.host.querySelector('[data-debris-aperture-stage]');
    view.click('[data-debris-detector-preset="outside"]');const outside=view.data.opsDebrisDetectorOffset;expect(outside).toBeGreaterThan(Number(stage().getAttribute('aria-valuemax')));expect(match().disabled).toBe(true);expect(view.host.querySelector('#'+match().getAttribute('aria-describedby')).textContent).toMatch(/beyond.*range/i);
    view.click('[data-debris-aperture-match]');expect(view.data.opsDebrisApertureOffset).toBe(8);expect(view.data.opsDebrisDetectorOffset).toBe(outside);
    const exact=12.3456789012345;view.change('iss-debris-detector-offset',exact);view.click('[data-debris-position-mark]');const mark=JSON.stringify(view.data.opsDebrisPositionA);view.click('[data-iss-playback-toggle="debris"]');advance(.1);const time=view.time;
    expect(match().disabled).toBe(false);view.click('[data-debris-aperture-match]');expect(view.data.opsDebrisApertureOffset).toBe(exact);expect(Number(stage().getAttribute('aria-valuenow'))).toBe(exact);expect(Number(view.host.querySelector('#iss-debris-aperture-offset').value)).toBeCloseTo(exact,11);
    expect(view.data.opsDebrisDetectorOffset).toBe(exact);expect(JSON.stringify(view.data.opsDebrisPositionA)).toBe(mark);expect(view.data.opsDebrisBaseline).toEqual(saved);expect(view.time).toBe(time);expect(view.playing).toBe(true);
  });

  it('preserves the comparison probe when applying an aperture and derives a safe display position after its range shrinks',()=>{
    const saved=snapshot(model({gap:2})),view=mountDebris({opsDebrisBaseline:saved,opsDebrisApertureStudy:true,opsDebrisDetectorRadius:10,opsDebrisDetectorOffset:12});
    const stage=()=>view.host.querySelector('[data-debris-aperture-stage]');act(()=>Simulate.keyDown(stage(),{key:'End'}));const original=view.data.opsDebrisApertureOffset;view.click('[data-debris-position-mark]');view.click('[data-iss-playback-toggle="debris"]');advance(.1);const time=view.time;
    view.click('[data-debris-aperture-use="smaller"]');const max=Number(stage().getAttribute('aria-valuemax'));
    expect(view.data.opsDebrisDetectorRadius).toBe(5);expect(view.data.opsDebrisDetectorOffset).toBe(12);expect(view.data.opsDebrisApertureOffset).toBe(original);expect(max).toBeLessThan(original);expect(Number(stage().getAttribute('aria-valuenow'))).toBe(max);expect(Number(view.host.querySelector('#iss-debris-aperture-offset').value)).toBeCloseTo(max,11);
    for(const point of view.host.querySelectorAll('[data-debris-aperture-point]'))expect(Number(point.dataset.value)).toBe(0);
    expect(view.data.opsDebrisPositionA).toBeNull();expect(view.data.opsDebrisBaseline).toEqual(saved);expect(view.time).toBe(time);expect(view.playing).toBe(true);
  });

  it('switches comparison units independently while preserving both probe positions, A, playback and the saved design',()=>{
    const saved=snapshot(model({gap:2})),view=mountDebris({opsDebrisBaseline:saved,opsDebrisApertureStudy:true,opsDebrisScanMetric:'expansion',opsDebrisScanScale:'softlog'});
    const section=()=>view.host.querySelector('[data-debris-aperture-study]'),button=b=>view.host.querySelector('[data-debris-aperture-basis="'+b+'"]');
    const paths=()=>[...view.host.querySelectorAll('[data-debris-aperture-curve]')].map(n=>n.getAttribute('d'));
    const main=()=>[...view.host.querySelectorAll('[data-debris-scan-curve]')].map(n=>n.getAttribute('d'));
    view.change('iss-debris-detector-offset',12.3456789);view.click('[data-debris-position-mark]');view.change('iss-debris-aperture-offset',30.123456789);
    const mark=JSON.stringify(view.data.opsDebrisPositionA),original=paths(),mainPaths=main(),mainReading=view.host.querySelector('[data-debris-scan-reading="current"]').textContent;
    const spans=[...view.host.querySelectorAll('[data-debris-aperture-span]')].map(n=>n.dataset.value);
    expect(section().dataset.basis).toBe('total');expect(button('total').getAttribute('aria-pressed')).toBe('true');expect(button('area').getAttribute('aria-pressed')).toBe('false');
    view.click('[data-iss-playback-toggle="debris"]');advance(.1);const time=view.time;
    view.click('[data-debris-aperture-basis="area"]');expect(section().dataset.basis).toBe('area');expect(view.data.opsDebrisApertureBasis).toBe('area');expect(button('area').getAttribute('aria-pressed')).toBe('true');expect(button('total').getAttribute('aria-pressed')).toBe('false');expect(paths()).not.toEqual(original);
    const expected=apertureStudy(model({}),{radius:10,metric:'expansion',offset:30.123456789,basis:'area'});
    for(const c of expected.curves){
      expect(Number(view.host.querySelector('[data-debris-aperture-reading="'+c.kind+'"]').dataset.value)).toBe(c.reading);
      expect(Number(view.host.querySelector('[data-debris-aperture-point="'+c.kind+'"]').dataset.value)).toBe(c.reading);
      expect(Number(view.host.querySelector('[data-debris-aperture-peak="'+c.kind+'"]').dataset.value)).toBe(c.maximum.value);
      expect(Number(view.host.querySelector('[data-debris-aperture-option="'+c.kind+'"]').dataset.areaCm2)).toBe(c.areaCm2);
    }
    expect([...view.host.querySelectorAll('[data-debris-aperture-span]')].map(n=>n.dataset.value)).toEqual(spans);expect(main()).toEqual(mainPaths);expect(view.host.querySelector('[data-debris-scan-reading="current"]').textContent).toBe(mainReading);
    for(const selector of ['[data-debris-aperture-stage]','#iss-debris-aperture-offset'])expect(view.host.querySelector(selector).getAttribute('aria-valuetext')).toContain('J/cm²');
    view.click('[data-debris-aperture-basis="total"]');expect(paths()).toEqual(original);expect(section().dataset.basis).toBe('total');expect(button('total').getAttribute('aria-pressed')).toBe('true');
    expect(view.data.opsDebrisDetectorOffset).toBe(12.3456789);expect(view.data.opsDebrisApertureOffset).toBe(30.123456789);expect(JSON.stringify(view.data.opsDebrisPositionA)).toBe(mark);expect(view.time).toBe(time);expect(view.playing).toBe(true);expect(view.data.opsDebrisBaseline).toEqual(saved);expect(view.data.opsDebrisScanScale).toBe('softlog');
    advance(.1);expect(view.time).toBeGreaterThan(time);
  });

  it('persists per-area comparisons through visibility and metric changes while keeping main scan units as totals',()=>{
    const view=mountDebris({opsDebrisApertureStudy:true,opsDebrisApertureOffset:18.7654321});
    view.click('[data-debris-aperture-basis="area"]');view.click('[data-debris-aperture-toggle]');expect(view.data.opsDebrisApertureBasis).toBe('area');view.click('[data-debris-aperture-toggle]');
    for(const metric of ['mass','energy','expansion']){
      view.click('[data-debris-scan-metric="'+metric+'"]');const unit=metric==='mass'?'mg':'J',expected=apertureStudy(model({}),{radius:10,metric,offset:18.7654321,basis:'area'});
      expect(view.host.querySelector('[data-debris-aperture-study]').dataset.basis).toBe('area');
      for(const c of expected.curves){
        const reading=view.host.querySelector('[data-debris-aperture-reading="'+c.kind+'"]'),peak=view.host.querySelector('[data-debris-aperture-peak="'+c.kind+'"]');
        expect(reading.textContent).toContain(unit+'/cm²');expect(peak.textContent).toContain(unit+'/cm²');expect(Number(reading.dataset.value)).toBe(c.reading);expect(Number(peak.dataset.value)).toBe(c.maximum.value);
      }
      expect(view.host.querySelector('[data-debris-aperture-stage]').getAttribute('aria-valuetext')).toContain(unit+'/cm²');
      const mainReading=view.host.querySelector('[data-debris-scan-reading="current"]').textContent;expect(mainReading).toContain(unit);expect(mainReading).not.toContain('/cm²');
    }
    const paths=[...view.host.querySelectorAll('[data-debris-aperture-curve]')].map(n=>n.getAttribute('d'));
    view.click('[data-debris-compare]');view.click('[data-debris-scan-scale="softlog"]');expect([...view.host.querySelectorAll('[data-debris-aperture-curve]')].map(n=>n.getAttribute('d'))).toEqual(paths);
    view.patch({opsMode:'power'});view.patch({opsMode:'debris'});expect(view.host.querySelector('[data-debris-aperture-study]').dataset.basis).toBe('area');expect(view.host.querySelector('[data-debris-aperture-basis="area"]').getAttribute('aria-pressed')).toBe('true');expect(view.data.opsDebrisApertureOffset).toBe(18.7654321);
  });

  it('rehydrates per-area preferences safely and presents zero or outside readings without false signal spans',()=>{
    const view=mountDebris({opsDebrisApertureStudy:true,opsDebrisApertureBasis:'area',opsDebrisSpread:0,opsDebrisScanMetric:'expansion',opsDebrisDetectorRadius:.5});
    expect(view.host.querySelector('[data-debris-aperture-basis="area"]').getAttribute('aria-pressed')).toBe('true');
    for(const selector of ['[data-debris-aperture-reading]','[data-debris-aperture-peak]'])for(const n of view.host.querySelectorAll(selector))expect(n.textContent).toBe('0 J/cm²');
    for(const n of view.host.querySelectorAll('[data-debris-aperture-span]')){expect(n.textContent).toBe('—');expect(n.hasAttribute('data-value')).toBe(false);}
    expect(view.host.querySelector('[data-debris-aperture-maximum]')).toBeNull();expect(view.host.querySelector('[data-debris-aperture-study]').textContent).not.toMatch(/NaN|Infinity/);
    view.click('[data-debris-scan-metric="mass"]');act(()=>Simulate.keyDown(view.host.querySelector('[data-debris-aperture-stage]'),{key:'End'}));
    for(const n of view.host.querySelectorAll('[data-debris-aperture-reading]'))expect(n.textContent).toBe('0 mg/cm²');
    for(const basis of [null,'invalid',false]){
      view.patch({opsDebrisApertureBasis:basis});expect(view.host.querySelector('[data-debris-aperture-study]').dataset.basis).toBe('total');expect(view.host.querySelector('[data-debris-aperture-basis="total"]').getAttribute('aria-pressed')).toBe('true');
      for(const n of view.host.querySelectorAll('[data-debris-aperture-reading]'))expect(n.textContent).toBe('0 mg');
    }
  });

  it('renders the comparison footprint and distinct aperture rings at their actual shared physical scale',()=>{
    const view=mountDebris({opsDebrisApertureStudy:true,opsDebrisApertureOffset:13.123456789,opsDebrisDetectorRadius:10.5});
    const stage=()=>view.host.querySelector('[data-debris-aperture-map]');
    for(const radius of [10.5,.5,30]){
      if(radius!==10.5)view.change('iss-debris-detector-radius',radius);
      const m=model({}),study=apertureStudy(m,{radius,offset:13.123456789}),layout=apertureLayout(m,study),cloud=stage().querySelector('[data-debris-aperture-cloud]');
      expect(stage().querySelector('svg').getAttribute('viewBox')).toBe('0 0 600 280');expect(Number(stage().querySelector('svg').dataset.debrisApertureMapScale)).toBe(layout.scale);expect(Number(stage().querySelector('svg').dataset.debrisApertureMapCx)).toBe(layout.cx);
      expect(Number(cloud.getAttribute('cx'))).toBe(layout.cx);expect(Number(cloud.getAttribute('cy'))).toBe(layout.cy);expect(Number(cloud.getAttribute('r'))).toBe(layout.cloudRadius);
      expect(stage().querySelectorAll('[data-debris-aperture-ring]')).toHaveLength(study.curves.length);
      for(const c of study.curves){const ring=stage().querySelector('[data-debris-aperture-ring="'+c.kind+'"]');expect(Number(ring.getAttribute('cx'))).toBe(layout.apertureX);expect(Number(ring.getAttribute('cy'))).toBe(layout.cy);expect(Number(ring.getAttribute('r'))).toBe(c.radius*layout.scale);}
      const overlaps=stage().querySelectorAll('[data-debris-aperture-overlap]');expect(overlaps).toHaveLength(1);expect(overlaps[0].getAttribute('clip-path')).toBe('url(#iss-debris-aperture-cloud-clip)');
      expect(stage().querySelector('#iss-debris-aperture-cloud-clip')).not.toBeNull();
    }
  });

  it('moves all comparison views to exact map landmarks without moving the main detector or interrupting playback',()=>{
    const saved=snapshot(model({gap:2})),view=mountDebris({opsDebrisApertureStudy:true,opsDebrisBaseline:saved,opsDebrisScanMetric:'expansion',opsDebrisApertureBasis:'area'});
    view.change('iss-debris-detector-offset',12.345678901);view.click('[data-debris-position-mark]');const mark=JSON.stringify(view.data.opsDebrisPositionA);view.click('[data-iss-playback-toggle="debris"]');advance(.1);const time=view.time;
    const m=model({}),base=apertureStudy(m,{radius:10,metric:'expansion',basis:'area'}),stage=()=>view.host.querySelector('[data-debris-aperture-map]');
    const scale=Number(stage().querySelector('svg').dataset.debrisApertureMapScale),cx=Number(stage().querySelector('svg').dataset.debrisApertureMapCx);
    for(const [preset,offset] of [['outside',base.maxOffset*1000],['rim',m.wallRadius*1000],['center',0]]){
      view.click('[data-debris-aperture-preset="'+preset+'"]');expect(view.data.opsDebrisApertureOffset).toBe(offset);
      expect(Number(stage().getAttribute('aria-valuenow'))).toBe(offset);expect(Number(view.host.querySelector('[data-debris-aperture-stage]').getAttribute('aria-valuenow'))).toBe(offset);expect(Number(view.host.querySelector('#iss-debris-aperture-offset').value)).toBeCloseTo(offset,11);
      expect(Number(stage().querySelector('svg').dataset.debrisApertureMapScale)).toBe(scale);expect(Number(stage().querySelector('svg').dataset.debrisApertureMapCx)).toBe(cx);
      const expected=apertureStudy(m,{radius:10,metric:'expansion',basis:'area',offset});
      for(const c of expected.curves){expect(Number(view.host.querySelector('[data-debris-aperture-reading="'+c.kind+'"]').dataset.value)).toBe(c.reading);expect(Number(view.host.querySelector('[data-debris-aperture-coverage="'+c.kind+'"]').dataset.value)).toBe(c.coverage);if(preset==='outside'){expect(c.reading).toBe(0);expect(c.coverage).toBe(0);}}
      expect(view.data.opsDebrisDetectorOffset).toBe(12.345678901);expect(JSON.stringify(view.data.opsDebrisPositionA)).toBe(mark);expect(view.time).toBe(time);expect(view.playing).toBe(true);expect(view.data.opsDebrisBaseline).toEqual(saved);
    }
    advance(.1);expect(view.time).toBeGreaterThan(time);
  });

  it('maps captured pointer gestures through SVG letterboxing and rejects secondary or cancelled gestures',()=>{
    const view=mountDebris({opsDebrisApertureStudy:true,opsDebrisDetectorOffset:7}),stage=view.host.querySelector('[data-debris-aperture-map]'),svg=stage.querySelector('svg');
    const rect=vi.spyOn(svg,'getBoundingClientRect').mockReturnValue({left:17,top:11,width:600,height:140});let captured=false;
    stage.setPointerCapture=()=>{captured=true;};stage.hasPointerCapture=()=>captured;stage.releasePointerCapture=()=>{captured=false;};
    const max=Number(stage.getAttribute('aria-valuemax')),scale=Number(svg.dataset.debrisApertureMapScale),cx=Number(svg.dataset.debrisApertureMapCx),x=mm=>17+150+(cx+mm/1000*scale)*.5;
    act(()=>Simulate.pointerDown(stage,{button:0,isPrimary:true,pointerId:21,pointerType:'touch',clientX:x(12.2),clientY:42}));expect(view.data.opsDebrisApertureOffset).toBe(12);expect(document.activeElement).toBe(stage);expect(captured).toBe(true);expect(stage.hasAttribute('data-dragging')).toBe(true);
    act(()=>Simulate.pointerDown(stage,{button:0,isPrimary:true,pointerId:22,pointerType:'pen',clientX:x(22)}));act(()=>Simulate.pointerMove(stage,{pointerId:22,clientX:x(22)}));expect(view.data.opsDebrisApertureOffset).toBe(12);
    act(()=>Simulate.pointerMove(stage,{pointerId:21,clientX:x(22.3),clientY:-1e6}));expect(view.data.opsDebrisApertureOffset).toBe(22.5);expect(Number(view.host.querySelector('#iss-debris-aperture-offset').value)).toBe(22.5);
    act(()=>Simulate.pointerMove(stage,{pointerId:21,clientX:1e6}));expect(view.data.opsDebrisApertureOffset).toBe(max);
    act(()=>Simulate.pointerCancel(stage,{pointerId:21}));act(()=>Simulate.pointerMove(stage,{pointerId:21,clientX:x(0)}));expect(view.data.opsDebrisApertureOffset).toBe(max);expect(captured).toBe(false);expect(stage.hasAttribute('data-dragging')).toBe(false);
    act(()=>Simulate.pointerDown(stage,{button:0,isPrimary:true,pointerId:23,clientX:-1e6}));expect(view.data.opsDebrisApertureOffset).toBe(0);act(()=>Simulate.lostPointerCapture(stage,{pointerId:23}));act(()=>Simulate.pointerMove(stage,{pointerId:23,clientX:x(8)}));expect(view.data.opsDebrisApertureOffset).toBe(0);expect(stage.hasAttribute('data-dragging')).toBe(false);
    for(const props of [{button:2,isPrimary:true},{button:0,isPrimary:false}])act(()=>Simulate.pointerDown(stage,{...props,pointerId:24,clientX:x(5)}));expect(view.data.opsDebrisApertureOffset).toBe(0);
    rect.mockReturnValue({left:17,top:11,width:0,height:140});act(()=>Simulate.pointerDown(stage,{button:0,isPrimary:true,pointerId:25,clientX:x(5)}));expect(view.data.opsDebrisApertureOffset).toBe(0);
    rect.mockReturnValue({left:17,top:11,width:600,height:0});act(()=>Simulate.pointerDown(stage,{button:0,isPrimary:true,pointerId:26,clientX:x(5)}));expect(view.data.opsDebrisApertureOffset).toBe(0);expect(view.data.opsDebrisDetectorOffset).toBe(7);
  });

  it('offers accessible map keyboard controls synchronized with the chart and native comparison slider',()=>{
    const view=mountDebris({opsDebrisApertureStudy:true,opsDebrisApertureBasis:'area'}),stage=()=>view.host.querySelector('[data-debris-aperture-map]'),input=()=>view.host.querySelector('#iss-debris-aperture-offset');
    expect(stage().getAttribute('role')).toBe('slider');expect(stage().tabIndex).toBe(0);expect(stage().getAttribute('aria-label')).toBeTruthy();expect(stage().getAttribute('aria-valuemin')).toBe('0');expect(stage().getAttribute('aria-orientation')).toBe('horizontal');
    const described=stage().getAttribute('aria-describedby');expect(described).toBeTruthy();for(const id of described.split(/\s+/))expect(view.host.querySelector('#'+id)).not.toBeNull();
    const key=key=>act(()=>Simulate.keyDown(stage(),{key})),max=Number(stage().getAttribute('aria-valuemax'));
    key('ArrowRight');key('PageUp');expect(view.data.opsDebrisApertureOffset).toBe(5.5);key('PageDown');key('ArrowDown');expect(view.data.opsDebrisApertureOffset).toBe(0);key('ArrowLeft');expect(view.data.opsDebrisApertureOffset).toBe(0);
    key('End');expect(view.data.opsDebrisApertureOffset).toBe(max);expect(Number(input().value)).toBeCloseTo(max,11);key('ArrowUp');expect(view.data.opsDebrisApertureOffset).toBe(max);key('Home');expect(view.data.opsDebrisApertureOffset).toBe(0);
    view.change('iss-debris-aperture-offset',3.123456789);expect(Number(stage().getAttribute('aria-valuenow'))).toBe(3.123456789);expect(stage().getAttribute('aria-valuetext')).toBe(input().getAttribute('aria-valuetext'));expect(stage().getAttribute('aria-valuetext')).toContain('J/cm²');
    view.click('[data-debris-scan-metric="mass"]');expect(stage().getAttribute('aria-valuetext')).toContain('mg/cm²');expect(stage().getAttribute('aria-valuetext')).toBe(view.host.querySelector('[data-debris-aperture-stage]').getAttribute('aria-valuetext'));
  });

  it('changes comparison field cues without distorting geometry when the metric or reading basis changes',()=>{
    const view=mountDebris({opsDebrisApertureStudy:true,opsDebrisApertureOffset:17.123456789}),stage=()=>view.host.querySelector('[data-debris-aperture-map]');
    const geometry=()=>({scale:stage().querySelector('svg').dataset.debrisApertureMapScale,cx:stage().querySelector('svg').dataset.debrisApertureMapCx,rings:[...stage().querySelectorAll('[data-debris-aperture-ring]')].map(n=>[n.dataset.debrisApertureRing,n.getAttribute('cx'),n.getAttribute('cy'),n.getAttribute('r')])});
    const initial=geometry();expect(stage().dataset.field).toBe('uniform');
    for(const metric of ['expansion','mass','energy']){
      view.click('[data-debris-scan-metric="'+metric+'"]');expect(stage().dataset.field).toBe(metric==='expansion'?'radial':'uniform');
      for(const basis of ['area','total']){view.click('[data-debris-aperture-basis="'+basis+'"]');expect(geometry()).toEqual(initial);expect(view.data.opsDebrisApertureOffset).toBe(17.123456789);}
    }
    view.click('[data-debris-scan-metric="expansion"]');view.change('iss-debris-spread',0);expect(stage().dataset.field).toBe('zero');expect(stage().textContent).not.toMatch(/NaN|Infinity/);
    view.click('[data-debris-scan-metric="mass"]');expect(stage().dataset.field).toBe('uniform');view.click('[data-debris-scan-metric="expansion"]');view.change('iss-debris-spread',10);expect(stage().dataset.field).toBe('radial');
  });

  it('switches between first-contact and shared-clock footprint views without changing predictions or active experiment state',()=>{
    const saved=snapshot(model({gap:2})),view=mountDebris({opsDebrisApertureStudy:true,opsDebrisBaseline:saved,opsDebrisScanMetric:'expansion',opsDebrisApertureBasis:'area'});
    const map=()=>view.host.querySelector('[data-debris-aperture-map]'),paths=()=>[...view.host.querySelectorAll('[data-debris-aperture-curve]')].map(n=>n.getAttribute('d')),cloud=()=>Number(map().querySelector('[data-debris-aperture-cloud]').getAttribute('r'));
    const original=paths(),finalRadius=cloud();expect(map().dataset.view).toBe('contact');expect(map().dataset.phase).toBe('contact');expect(view.host.querySelector('#iss-debris-aperture-time')).toBeNull();expect(view.host.querySelector('[data-debris-aperture-envelope]')).toBeNull();
    view.change('iss-debris-detector-offset',12.3456789);view.click('[data-debris-position-mark]');view.change('iss-debris-aperture-offset',17.123456789);const mark=JSON.stringify(view.data.opsDebrisPositionA);
    view.click('[data-iss-playback-toggle="debris"]');advance(.1);const time=view.time;expect(cloud()).toBe(finalRadius);
    view.click('[data-debris-aperture-view="clock"]');expect(view.data.opsDebrisApertureView).toBe('clock');expect(map().dataset.view).toBe('clock');expect(view.host.querySelector('[data-debris-aperture-view="clock"]').getAttribute('aria-pressed')).toBe('true');expect(view.host.querySelector('[data-debris-aperture-view="contact"]').getAttribute('aria-pressed')).toBe('false');expect(cloud()).toBeLessThan(finalRadius);
    expect(view.host.querySelector('[data-debris-aperture-flight]')).not.toBeNull();expect(map().getAttribute('aria-valuetext')).toMatch(/^First-contact predictions; /);expect(paths()).toEqual(original);
    view.click('[data-debris-aperture-view="contact"]');expect(map().dataset.phase).toBe('contact');expect(cloud()).toBe(finalRadius);expect(view.host.querySelector('#iss-debris-aperture-time')).toBeNull();expect(map().querySelector('[data-debris-aperture-overlap]')).not.toBeNull();
    expect(view.time).toBe(time);expect(view.playing).toBe(true);expect(view.data.opsDebrisDetectorOffset).toBe(12.3456789);expect(view.data.opsDebrisApertureOffset).toBe(17.123456789);expect(JSON.stringify(view.data.opsDebrisPositionA)).toBe(mark);expect(view.data.opsDebrisBaseline).toEqual(saved);expect(paths()).toEqual(original);expect(view.host.querySelectorAll('[data-iss-playback-toggle="debris"]')).toHaveLength(1);
    advance(.1);expect(view.time).toBeGreaterThan(time);expect(cloud()).toBe(finalRadius);
  });

  it('keeps wall overlap and coverage pending throughout incoming and expanding phases and reveals them only at first contact',()=>{
    const view=mountDebris({opsDebrisApertureStudy:true,opsDebrisApertureView:'clock',opsDebrisScanMetric:'expansion'}),m=model({}),map=()=>view.host.querySelector('[data-debris-aperture-map]');
    const scale=Number(map().querySelector('svg').dataset.debrisApertureMapScale),paths=[...view.host.querySelectorAll('[data-debris-aperture-curve]')].map(n=>n.getAttribute('d'));
    for(const [event,time,phase,radius] of [['start',0,'approach',m.radius],['impact',m.impactUs,'impact',m.radius],['cloud',m.impactUs+m.flightUs/2,'cloud',(m.radius+m.wallRadius)/2]]){
      view.click('[data-debris-aperture-event="'+event+'"]');expect(view.time).toBe(time);expect(map().dataset.phase).toBe(phase);expect(view.host.querySelector('[data-debris-aperture-phase]').getAttribute('data-debris-aperture-phase')).toBe(phase);
      expect(Number(map().querySelector('[data-debris-aperture-cloud]').getAttribute('r'))).toBeCloseTo(radius*scale,11);expect(map().querySelector('[data-debris-aperture-overlap]')).toBeNull();
      const envelope=map().querySelector('[data-debris-aperture-envelope]');expect(envelope).not.toBeNull();expect(Number(envelope.getAttribute('r'))).toBe(m.wallRadius*scale);expect(envelope.getAttribute('stroke-dasharray')).toBeTruthy();
      const coverage=view.host.querySelector('[data-debris-aperture-map-coverage]');expect(coverage.getAttribute('data-debris-aperture-map-coverage')).toBe('pending');expect(coverage.textContent).toMatch(/pending arrival/i);
      expect(view.host.querySelector('[data-debris-aperture-arrival-note]').textContent).toMatch(phase==='approach'?/cloud has not formed/i:/project/i);expect(map().getAttribute('aria-valuetext')).toMatch(/^First-contact predictions; /);expect(map().dataset.field).toBe(phase==='approach'?'incoming':'radial');
    }
    view.click('[data-debris-aperture-event="wall"]');expect(view.time).toBe(m.arrivalUs);expect(map().dataset.phase).toBe('contact');expect(map().querySelector('[data-debris-aperture-overlap]')).not.toBeNull();expect(map().querySelector('[data-debris-aperture-envelope]')).toBeNull();expect(Number(map().querySelector('[data-debris-aperture-cloud]').getAttribute('r'))).toBe(m.wallRadius*scale);
    expect(Number(view.host.querySelector('[data-debris-aperture-map-coverage]').getAttribute('data-debris-aperture-map-coverage'))).toBeCloseTo(1,12);expect([...view.host.querySelectorAll('[data-debris-aperture-curve]')].map(n=>n.getAttribute('d'))).toEqual(paths);
    view.change('iss-debris-spread',0);view.click('[data-debris-aperture-event="cloud"]');expect(map().dataset.field).toBe('zero');expect(map().querySelector('[data-debris-aperture-overlap]')).toBeNull();expect(view.host.querySelector('[data-debris-aperture-map-coverage]').textContent).toMatch(/pending arrival/i);
  });

  it('seeks the one experiment clock from local flight events, range changes and keyboard controls',()=>{
    const m=model({}),view=mountDebris({opsDebrisApertureStudy:true,opsDebrisApertureView:'clock'}),local=()=>view.host.querySelector('#iss-debris-aperture-time');
    expect(local().type).toBe('range');expect(local().min).toBe('0');expect(Number(local().max)).toBe(m.arrivalUs);expect(local().step).toBe('any');
    expect(view.host.querySelector('label[for="iss-debris-aperture-time"]')).not.toBeNull();expect(local().getAttribute('aria-valuetext')).toContain('microseconds');
    for(const [event,time] of [['impact',m.impactUs],['cloud',m.impactUs+m.flightUs/2],['wall',m.arrivalUs],['start',0]]){
      if(view.time===m.arrivalUs)view.click('[data-debris-event="start"]');view.click('[data-iss-playback-toggle="debris"]');expect(view.playing).toBe(true);const token=!!view.data.opsDebrisSeekToken;
      view.click('[data-debris-aperture-event="'+event+'"]');expect(view.time).toBe(time);expect(view.playing).toBe(false);expect(!!view.data.opsDebrisSeekToken).toBe(!token);expect(Number(local().value)).toBeCloseTo(time,12);expect(Number(view.host.querySelector('#iss-debris-time').value)).toBeCloseTo(time,12);
    }
    view.click('[data-iss-playback-toggle="debris"]');view.change('iss-debris-aperture-time',1.23456789);expect(view.time).toBe(1.23456789);expect(view.playing).toBe(false);expect(Number(view.host.querySelector('#iss-debris-time').value)).toBe(1.23456789);
    const key=key=>act(()=>Simulate.keyDown(local(),{key}));key('ArrowRight');expect(view.time).toBeCloseTo(1.28456789,12);key('PageUp');expect(view.time).toBeCloseTo(1.78456789,12);key('PageDown');key('ArrowDown');expect(view.time).toBeCloseTo(1.23456789,12);
    key('Home');expect(view.time).toBe(0);key('ArrowLeft');expect(view.time).toBe(0);key('End');expect(view.time).toBe(m.arrivalUs);key('ArrowUp');expect(view.time).toBe(m.arrivalUs);expect(view.playing).toBe(false);
    view.change('iss-debris-time',m.impactUs);expect(Number(local().value)).toBe(m.impactUs);expect(view.host.querySelector('[data-debris-aperture-map]').dataset.phase).toBe('impact');expect(local().getAttribute('aria-valuetext')).toMatch(/bumper contact/i);
  });

  it('advances the live transverse projection from existing playback while probe movements and prediction units remain independent',()=>{
    const saved=snapshot(model({gap:2})),view=mountDebris({opsDebrisApertureStudy:true,opsDebrisApertureView:'clock',opsDebrisBaseline:saved,opsDebrisScanMetric:'expansion'}),map=()=>view.host.querySelector('[data-debris-aperture-map]');
    view.change('iss-debris-detector-offset',12);view.click('[data-debris-position-mark]');const mark=JSON.stringify(view.data.opsDebrisPositionA);view.click('[data-debris-aperture-event="impact"]');
    const radius=()=>Number(map().querySelector('[data-debris-aperture-cloud]').getAttribute('r')),before=radius(),scale=Number(map().querySelector('svg').dataset.debrisApertureMapScale),paths=()=>[...view.host.querySelectorAll('[data-debris-aperture-curve]')].map(n=>n.getAttribute('d')),original=paths();
    view.click('[data-iss-playback-toggle="debris"]');advance(.1);expect(view.time).toBeGreaterThan(model({}).impactUs);expect(radius()).toBeGreaterThan(before);expect(map().dataset.phase).toBe('cloud');expect(paths()).toEqual(original);expect(Number(view.host.querySelector('#iss-debris-aperture-time').value)).toBeCloseTo(view.time,12);
    const time=view.time,r=radius();view.click('[data-debris-aperture-preset="rim"]');view.change('iss-debris-aperture-offset',11.123456789);view.click('[data-debris-aperture-basis="area"]');view.click('[data-debris-scan-metric="mass"]');
    expect(view.time).toBe(time);expect(view.playing).toBe(true);expect(radius()).toBe(r);expect(Number(map().querySelector('svg').dataset.debrisApertureMapScale)).toBe(scale);expect(map().dataset.field).toBe('uniform');expect(map().getAttribute('aria-valuetext')).toContain('mg/cm²');expect(map().querySelector('[data-debris-aperture-overlap]')).toBeNull();
    expect(view.data.opsDebrisDetectorOffset).toBe(12);expect(JSON.stringify(view.data.opsDebrisPositionA)).toBe(mark);expect(view.data.opsDebrisBaseline).toEqual(saved);
    view.click('[data-debris-aperture-toggle]');view.click('[data-debris-aperture-toggle]');expect(map().dataset.view).toBe('clock');expect(view.time).toBe(time);expect(view.playing).toBe(true);advance(.1);expect(radius()).toBeGreaterThan(r);
    view.patch({opsDebrisApertureView:'bad'});expect(map().dataset.view).toBe('contact');expect(map().dataset.phase).toBe('contact');expect(view.host.querySelector('#iss-debris-aperture-time')).toBeNull();
  });

  it('keeps the first-contact side view descriptive and noninteractive until following the experiment',()=>{
    const view=mountDebris({opsDebrisApertureStudy:true}),side=()=>view.host.querySelector('[data-debris-aperture-side]');
    expect(side().getAttribute('role')).toBe('img');expect(side().dataset.mode).toBe('contact');expect(side().dataset.phase).toBe('contact');expect(side().hasAttribute('tabindex')).toBe(false);expect(side().getAttribute('aria-label')).toBeTruthy();
    for(const attr of ['aria-valuemin','aria-valuemax','aria-valuenow','aria-valuetext'])expect(side().hasAttribute(attr)).toBe(false);
    expect(side().querySelector('[data-debris-side-particle]')).toBeNull();expect(side().querySelector('[data-debris-side-cloud]')).not.toBeNull();
    view.click('[data-iss-playback-toggle="debris"]');advance(.1);const time=view.time,token=view.data.opsDebrisSeekToken;
    act(()=>Simulate.keyDown(side(),{key:'End'}));act(()=>Simulate.pointerDown(side(),{button:0,isPrimary:true,pointerId:30,clientX:500}));expect(view.time).toBe(time);expect(view.data.opsDebrisSeekToken).toBe(token);expect(view.playing).toBe(true);expect(side().hasAttribute('data-dragging')).toBe(false);
    view.click('[data-debris-aperture-view="clock"]');expect(side().getAttribute('role')).toBe('slider');expect(side().tabIndex).toBe(0);expect(Number(side().getAttribute('aria-valuenow'))).toBe(time);expect(view.time).toBe(time);expect(view.playing).toBe(true);
  });

  it('renders physical particle and cloud sections along the axial flight path with one aperture slice at the wall',()=>{
    const m=model({}),view=mountDebris({opsDebrisApertureStudy:true,opsDebrisApertureView:'clock',opsDebrisApertureOffset:17.123456789}),side=()=>view.host.querySelector('[data-debris-aperture-side]');
    const study=apertureStudy(m,{radius:10,offset:17.123456789});
    for(const [event,time,phase] of [['start',0,'approach'],['impact',m.impactUs,'impact'],['cloud',m.impactUs+m.flightUs/2,'cloud'],['wall',m.arrivalUs,'contact']]){
      view.click('[data-debris-aperture-event="'+event+'"]');const frame=apertureView(m,study,time,'clock'),layout=flightSection(m,study,frame),svg=side().querySelector('svg');
      expect(side().dataset.phase).toBe(phase);expect(svg.getAttribute('viewBox')).toBe('0 0 600 260');expect(Number(svg.dataset.debrisSideScale)).toBe(layout.scale);expect(Number(svg.dataset.debrisSideBx)).toBe(layout.bx);expect(Number(svg.dataset.debrisSideCy)).toBe(layout.cy);
      for(const [selector,x] of [['bumper',layout.bx],['wall',layout.wallX]]){const line=side().querySelector('[data-debris-side-'+selector+']');expect(Number(line.getAttribute('x1'))).toBe(x);expect(Number(line.getAttribute('x2'))).toBe(x);expect(Number(line.getAttribute('y1'))).toBe(layout.cy-layout.wallRadius);expect(Number(line.getAttribute('y2'))).toBe(layout.cy+layout.wallRadius);}
      const apertures=side().querySelectorAll('[data-debris-side-aperture]');expect(apertures).toHaveLength(1);expect(Number(apertures[0].getAttribute('x1'))).toBe(layout.wallX);expect(Number(apertures[0].getAttribute('x2'))).toBe(layout.wallX);expect(Number(apertures[0].getAttribute('y1'))).toBe(layout.apertureY-layout.apertureRadius);expect(Number(apertures[0].getAttribute('y2'))).toBe(layout.apertureY+layout.apertureRadius);
      expect(side().querySelector('[data-debris-side-envelope]').getAttribute('stroke-dasharray')).toBeTruthy();
      if(phase==='approach'){
        const particle=side().querySelector('[data-debris-side-particle]');expect(particle).not.toBeNull();expect(Number(particle.getAttribute('cx'))).toBe(layout.cloudX);expect(Number(particle.getAttribute('cy'))).toBe(layout.cy);expect(Number(particle.getAttribute('r'))).toBe(layout.cloudRadius);expect(side().querySelector('[data-debris-side-cloud]')).toBeNull();
      }else{
        expect(side().querySelector('[data-debris-side-particle]')).toBeNull();const cloud=side().querySelector('[data-debris-side-cloud]');expect(Number(cloud.getAttribute('x1'))).toBe(layout.cloudX);expect(Number(cloud.getAttribute('x2'))).toBe(layout.cloudX);expect(Number(cloud.getAttribute('y1'))).toBe(layout.cy-layout.cloudRadius);expect(Number(cloud.getAttribute('y2'))).toBe(layout.cy+layout.cloudRadius);
      }
      expect(view.host.querySelector('[data-debris-aperture-map]').dataset.phase).toBe(phase);expect(Number(side().getAttribute('aria-valuenow'))).toBe(time);
    }
  });

  it('seeks the piecewise flight through a captured letterboxed side view without moving the comparison aperture',()=>{
    const saved=snapshot(model({gap:2})),m=model({}),view=mountDebris({opsDebrisApertureStudy:true,opsDebrisApertureView:'clock',opsDebrisBaseline:saved,opsDebrisApertureOffset:17.123456789,opsDebrisDetectorOffset:12});
    view.click('[data-debris-position-mark]');const mark=JSON.stringify(view.data.opsDebrisPositionA),paths=[...view.host.querySelectorAll('[data-debris-aperture-curve]')].map(n=>n.getAttribute('d'));
    const side=view.host.querySelector('[data-debris-aperture-side]'),svg=side.querySelector('svg'),rect=vi.spyOn(svg,'getBoundingClientRect').mockReturnValue({left:17,top:11,width:600,height:130});let captured=false;
    side.setPointerCapture=()=>{captured=true;};side.hasPointerCapture=()=>captured;side.releasePointerCapture=()=>{captured=false;};
    const scale=Number(svg.dataset.debrisSideScale),bx=Number(svg.dataset.debrisSideBx),x=meters=>17+150+(bx+meters*scale)*.5;
    view.click('[data-iss-playback-toggle="debris"]');expect(view.playing).toBe(true);
    act(()=>Simulate.pointerDown(side,{button:0,isPrimary:true,pointerId:31,pointerType:'touch',clientX:x(-m.config.approach/2)}));expect(view.time).toBeCloseTo(m.impactUs/2,10);expect(view.playing).toBe(false);expect(document.activeElement).toBe(side);expect(captured).toBe(true);expect(side.hasAttribute('data-dragging')).toBe(true);
    const first=view.time;act(()=>Simulate.pointerDown(side,{button:0,isPrimary:true,pointerId:32,clientX:x(.08)}));act(()=>Simulate.pointerMove(side,{pointerId:32,clientX:x(.08)}));expect(view.time).toBe(first);
    act(()=>Simulate.pointerMove(side,{pointerId:31,clientX:x(0)}));expect(view.time).toBeCloseTo(m.impactUs,10);
    const axial=.037123456789;act(()=>Simulate.pointerMove(side,{pointerId:31,clientX:x(axial),clientY:-1e6}));expect(view.time).toBeCloseTo(m.impactUs+axial/m.axial*1e6,10);expect(Math.abs(view.time/.05-Math.round(view.time/.05))).toBeGreaterThan(.001);
    act(()=>Simulate.pointerMove(side,{pointerId:31,clientX:1e6}));expect(view.time).toBe(m.arrivalUs);act(()=>Simulate.pointerCancel(side,{pointerId:31}));act(()=>Simulate.pointerMove(side,{pointerId:31,clientX:x(0)}));expect(view.time).toBe(m.arrivalUs);expect(captured).toBe(false);expect(side.hasAttribute('data-dragging')).toBe(false);
    act(()=>Simulate.pointerDown(side,{button:0,isPrimary:true,pointerId:33,clientX:-1e6}));expect(view.time).toBe(0);act(()=>Simulate.lostPointerCapture(side,{pointerId:33}));act(()=>Simulate.pointerMove(side,{pointerId:33,clientX:x(.08)}));expect(view.time).toBe(0);expect(side.hasAttribute('data-dragging')).toBe(false);
    for(const props of [{button:2,isPrimary:true},{button:0,isPrimary:false}])act(()=>Simulate.pointerDown(side,{...props,pointerId:34,clientX:x(.08)}));expect(view.time).toBe(0);
    rect.mockReturnValue({left:17,top:11,width:0,height:130});act(()=>Simulate.pointerDown(side,{button:0,isPrimary:true,pointerId:35,clientX:x(.08)}));expect(view.time).toBe(0);rect.mockReturnValue({left:17,top:11,width:600,height:0});act(()=>Simulate.pointerDown(side,{button:0,isPrimary:true,pointerId:36,clientX:x(.08)}));expect(view.time).toBe(0);
    expect(view.data.opsDebrisApertureView).toBe('clock');expect(view.data.opsDebrisApertureOffset).toBe(17.123456789);expect(view.data.opsDebrisDetectorOffset).toBe(12);expect(JSON.stringify(view.data.opsDebrisPositionA)).toBe(mark);expect(view.data.opsDebrisBaseline).toEqual(saved);expect([...view.host.querySelectorAll('[data-debris-aperture-curve]')].map(n=>n.getAttribute('d'))).toEqual(paths);
  });

  it('releases captured side-view gestures across mode switches so later flight drags remain usable',()=>{
    const m=model({}),view=mountDebris({opsDebrisApertureStudy:true,opsDebrisApertureView:'clock'}),side=()=>view.host.querySelector('[data-debris-aperture-side]');
    const svg=side().querySelector('svg');vi.spyOn(svg,'getBoundingClientRect').mockReturnValue({left:17,top:11,width:600,height:260});let captured=false;
    side().setPointerCapture=()=>{captured=true;};side().hasPointerCapture=()=>captured;side().releasePointerCapture=()=>{captured=false;};
    const bx=Number(svg.dataset.debrisSideBx),scale=Number(svg.dataset.debrisSideScale),x=meters=>17+bx+meters*scale;
    for(const [index,release] of ['pointerUp','pointerCancel','lostPointerCapture'].entries()){
      const pointerId=70+index;
      act(()=>Simulate.pointerDown(side(),{button:0,isPrimary:true,pointerId,clientX:x(-m.config.approach/2)}));expect(captured).toBe(true);expect(side()._issSideDrag.pointer).toBe(pointerId);expect(side().hasAttribute('data-dragging')).toBe(true);
      view.click('[data-debris-aperture-view="contact"]');const time=view.time,token=view.data.opsDebrisSeekToken;
      act(()=>Simulate.pointerMove(side(),{pointerId,clientX:x(.08)}));expect(view.time).toBe(time);expect(view.data.opsDebrisSeekToken).toBe(token);
      act(()=>Simulate[release](side(),{pointerId}));expect(side()._issSideDrag).toBeUndefined();expect(side().hasAttribute('data-dragging')).toBe(false);expect(captured).toBe(false);expect(view.time).toBe(time);expect(view.data.opsDebrisSeekToken).toBe(token);
      view.click('[data-debris-aperture-view="clock"]');act(()=>Simulate.pointerDown(side(),{button:0,isPrimary:true,pointerId:pointerId+10,clientX:x(.05)}));expect(side()._issSideDrag.pointer).toBe(pointerId+10);expect(view.time).toBeCloseTo(m.impactUs+.05/m.axial*1e6,10);expect(captured).toBe(true);act(()=>Simulate.pointerUp(side(),{pointerId:pointerId+10}));
    }
  });

  it('synchronizes side-view keyboard seeks with both time sliders, phase views and the sole playback clock',()=>{
    const m=model({}),view=mountDebris({opsDebrisApertureStudy:true,opsDebrisApertureView:'clock'}),side=()=>view.host.querySelector('[data-debris-aperture-side]'),key=key=>act(()=>Simulate.keyDown(side(),{key}));
    expect(side().getAttribute('role')).toBe('slider');expect(side().tabIndex).toBe(0);expect(side().getAttribute('aria-label')).toBeTruthy();expect(side().getAttribute('aria-valuemin')).toBe('0');expect(Number(side().getAttribute('aria-valuemax'))).toBe(m.arrivalUs);expect(side().getAttribute('aria-orientation')).toBe('horizontal');
    const described=side().getAttribute('aria-describedby');expect(described).toBeTruthy();for(const id of described.split(/\s+/))expect(view.host.querySelector('#'+id)).not.toBeNull();
    view.click('[data-iss-playback-toggle="debris"]');key('ArrowRight');expect(view.time).toBe(.05);expect(view.playing).toBe(false);key('PageUp');expect(view.time).toBe(.55);key('PageDown');key('ArrowDown');expect(view.time).toBeCloseTo(0,12);
    key('Home');key('ArrowLeft');expect(view.time).toBe(0);key('End');expect(view.time).toBe(m.arrivalUs);key('ArrowUp');expect(view.time).toBe(m.arrivalUs);
    for(const selector of ['#iss-debris-time','#iss-debris-aperture-time'])expect(Number(view.host.querySelector(selector).value)).toBeCloseTo(view.time,12);expect(view.host.querySelector('[data-debris-aperture-map]').dataset.phase).toBe('contact');expect(side().dataset.phase).toBe('contact');expect(side().getAttribute('aria-valuetext')).toContain('microseconds');
    view.click('[data-debris-aperture-event="impact"]');view.click('[data-iss-playback-toggle="debris"]');const before=Number(side().querySelector('[data-debris-side-cloud]').getAttribute('x1'));advance(.1);expect(view.time).toBeGreaterThan(m.impactUs);expect(Number(side().querySelector('[data-debris-side-cloud]').getAttribute('x1'))).toBeGreaterThan(before);expect(side().dataset.phase).toBe('cloud');expect(view.host.querySelector('[data-debris-aperture-map]').dataset.phase).toBe('cloud');expect(Number(side().getAttribute('aria-valuenow'))).toBe(view.time);expect(view.host.querySelectorAll('[data-iss-playback-toggle="debris"]')).toHaveLength(1);
  });

  it('switches between a single position or speed inspector without resetting the shared experiment or comparison state',()=>{
    const saved=snapshot(model({gap:2})),view=mountDebris({opsDebrisApertureStudy:true,opsDebrisApertureView:'clock',opsDebrisApertureOffset:17.123456789,opsDebrisDetectorOffset:12,opsDebrisBaseline:saved});
    const inspector=()=>view.host.querySelector('[data-debris-flight-inspector]'),button=panel=>view.host.querySelector('[data-debris-flight-panel="'+panel+'"]');
    expect(inspector()).not.toBeNull();expect(button('position').getAttribute('aria-pressed')).toBe('true');expect(view.host.querySelector('[data-debris-aperture-side]')).not.toBeNull();expect(view.host.querySelector('[data-debris-speed-panel]')).toBeNull();
    view.click('[data-debris-position-mark]');const mark=JSON.stringify(view.data.opsDebrisPositionA);view.click('[data-iss-playback-toggle="debris"]');advance(.1);const time=view.time;
    view.click('[data-debris-flight-panel="speed"]');expect(view.data.opsDebrisFlightPanel).toBe('speed');expect(button('speed').getAttribute('aria-pressed')).toBe('true');expect(button('position').getAttribute('aria-pressed')).toBe('false');expect(inspector().querySelector('[data-debris-speed-panel]')).not.toBeNull();expect(inspector().querySelector('[data-debris-aperture-side]')).toBeNull();
    view.click('[data-debris-flight-panel="position"]');expect(view.host.querySelector('[data-debris-speed-panel]')).toBeNull();expect(view.host.querySelector('[data-debris-aperture-side]')).not.toBeNull();view.click('[data-debris-flight-panel="speed"]');view.click('[data-debris-aperture-toggle]');view.click('[data-debris-aperture-toggle]');expect(button('speed').getAttribute('aria-pressed')).toBe('true');
    expect(view.time).toBe(time);expect(view.playing).toBe(true);expect(view.data.opsDebrisApertureOffset).toBe(17.123456789);expect(view.data.opsDebrisDetectorOffset).toBe(12);expect(JSON.stringify(view.data.opsDebrisPositionA)).toBe(mark);expect(view.data.opsDebrisBaseline).toEqual(saved);expect(view.host.querySelectorAll('[data-iss-playback-toggle="debris"]')).toHaveLength(1);
    view.patch({opsDebrisFlightPanel:'invalid'});expect(button('position').getAttribute('aria-pressed')).toBe('true');expect(view.host.querySelector('[data-debris-speed-panel]')).toBeNull();expect(view.time).toBe(time);expect(view.playing).toBe(true);
  });

  it('draws discontinuous speed plateaus with explicit pre-impact and post-impact endpoints and no wall-stop segment',()=>{
    const m=model({}),view=mountDebris({opsDebrisApertureStudy:true,opsDebrisFlightPanel:'speed'}),stage=()=>view.host.querySelector('[data-debris-speed-stage]'),v=velocity(m,m.arrivalUs),impactX=12+m.impactUs/m.arrivalUs*576;
    expect(stage().getAttribute('role')).toBe('img');expect(stage().hasAttribute('tabindex')).toBe(false);for(const attr of ['aria-valuemin','aria-valuemax','aria-valuenow','aria-valuetext'])expect(stage().hasAttribute(attr)).toBe(false);expect(Number(stage().getAttribute('data-debris-speed-high'))).toBe(v.high);expect(stage().querySelector('svg').getAttribute('viewBox')).toBe('0 0 600 190');
    for(const component of ['axial','radial']){
      const y=value=>170-value/v.high*156,path=stage().querySelector('[data-debris-speed-trace="'+component+'"]');expect(path.getAttribute('d')).toBe('M12 '+y(v.pre[component])+' H'+impactX+' M'+impactX+' '+y(v.post[component])+' H588');
      for(const [boundary,value] of [['before',v.pre[component]],['after',v.post[component]]]){
        const marker=stage().querySelector('[data-debris-speed-boundary="'+boundary+'"][data-speed-component="'+component+'"]');expect(marker).not.toBeNull();expect(Number(marker.dataset.value)).toBe(value);expect(parseFloat(marker.style.left)).toBeCloseTo(impactX/600*100,10);expect(parseFloat(marker.style.top)).toBeCloseTo(y(value)/190*100,10);
      }
      expect(Number(view.host.querySelector('[data-debris-speed-reading="'+component+'"]').dataset.value)).toBe(v.post[component]);expect(view.host.querySelector('[data-debris-speed-reading="'+component+'"]').textContent).toContain('km/s');expect(Number(stage().querySelector('[data-debris-speed-point="'+component+'"]').dataset.value)).toBe(v.post[component]);
    }
    expect(Number(stage().querySelector('[data-debris-speed-cursor]').getAttribute('data-debris-speed-cursor'))).toBe(m.arrivalUs);const initial=view.time;
    act(()=>Simulate.keyDown(stage(),{key:'End'}));act(()=>Simulate.pointerDown(stage(),{button:0,isPrimary:true,pointerId:90,clientX:200}));expect(view.time).toBe(initial);
    view.click('[data-debris-aperture-view="clock"]');view.click('[data-debris-aperture-event="start"]');expect(Number(view.host.querySelector('[data-debris-speed-reading="axial"]').dataset.value)).toBe(m.config.speed*1000);expect(Number(view.host.querySelector('[data-debris-speed-reading="radial"]').dataset.value)).toBe(0);
    view.click('[data-debris-aperture-event="impact"]');expect(Number(view.host.querySelector('[data-debris-speed-reading="axial"]').dataset.value)).toBe(m.axial);expect(Number(view.host.querySelector('[data-debris-speed-reading="radial"]').dataset.value)).toBe(m.radial);
    view.click('[data-debris-aperture-event="wall"]');expect(Number(view.host.querySelector('[data-debris-speed-reading="axial"]').dataset.value)).toBe(m.axial);view.change('iss-debris-spread',0);expect(Number(view.host.querySelector('[data-debris-speed-reading="radial"]').dataset.value)).toBe(0);expect(view.host.querySelector('[data-debris-speed-panel]').textContent).not.toMatch(/NaN|Infinity/);
  });

  it('scrubs the speed history through captured chart gestures with exact time endpoints and isolated probe state',()=>{
    const m=model({}),saved=snapshot(model({gap:2})),view=mountDebris({opsDebrisApertureStudy:true,opsDebrisApertureView:'clock',opsDebrisFlightPanel:'speed',opsDebrisApertureOffset:17.123456789,opsDebrisDetectorOffset:12,opsDebrisBaseline:saved});
    view.click('[data-debris-position-mark]');const mark=JSON.stringify(view.data.opsDebrisPositionA),stage=view.host.querySelector('[data-debris-speed-stage]'),svg=stage.querySelector('svg'),rect=vi.spyOn(svg,'getBoundingClientRect').mockReturnValue({left:17,width:300});let captured=false;
    stage.setPointerCapture=()=>{captured=true;};stage.hasPointerCapture=()=>captured;stage.releasePointerCapture=()=>{captured=false;};const x=t=>17+(12+t/m.arrivalUs*576)/2;
    view.click('[data-iss-playback-toggle="debris"]');act(()=>Simulate.pointerDown(stage,{button:0,isPrimary:true,pointerId:91,pointerType:'touch',clientX:x(m.impactUs/2)}));expect(view.time).toBeCloseTo(m.impactUs/2,10);expect(view.playing).toBe(false);expect(document.activeElement).toBe(stage);expect(captured).toBe(true);expect(stage.hasAttribute('data-dragging')).toBe(true);
    const first=view.time;act(()=>Simulate.pointerDown(stage,{button:0,isPrimary:true,pointerId:92,clientX:x(m.arrivalUs)}));act(()=>Simulate.pointerMove(stage,{pointerId:92,clientX:x(m.arrivalUs)}));expect(view.time).toBe(first);
    const precise=m.impactUs+1.23456789;act(()=>Simulate.pointerMove(stage,{pointerId:91,clientX:x(precise)}));expect(view.time).toBeCloseTo(precise,10);expect(stage.dataset.phase).toBe('cloud');
    act(()=>Simulate.pointerMove(stage,{pointerId:91,clientX:1e6}));expect(view.time).toBe(m.arrivalUs);act(()=>Simulate.pointerCancel(stage,{pointerId:91}));act(()=>Simulate.pointerMove(stage,{pointerId:91,clientX:x(0)}));expect(view.time).toBe(m.arrivalUs);expect(captured).toBe(false);expect(stage.hasAttribute('data-dragging')).toBe(false);
    act(()=>Simulate.pointerDown(stage,{button:0,isPrimary:true,pointerId:93,clientX:-1e6}));expect(view.time).toBe(0);act(()=>Simulate.lostPointerCapture(stage,{pointerId:93}));act(()=>Simulate.pointerMove(stage,{pointerId:93,clientX:x(m.arrivalUs)}));expect(view.time).toBe(0);expect(stage.hasAttribute('data-dragging')).toBe(false);
    for(const props of [{button:2,isPrimary:true},{button:0,isPrimary:false}])act(()=>Simulate.pointerDown(stage,{...props,pointerId:94,clientX:x(m.arrivalUs)}));expect(view.time).toBe(0);rect.mockReturnValue({left:17,width:0});act(()=>Simulate.pointerDown(stage,{button:0,isPrimary:true,pointerId:95,clientX:x(m.arrivalUs)}));expect(view.time).toBe(0);
    expect(view.data.opsDebrisApertureOffset).toBe(17.123456789);expect(view.data.opsDebrisDetectorOffset).toBe(12);expect(JSON.stringify(view.data.opsDebrisPositionA)).toBe(mark);expect(view.data.opsDebrisBaseline).toEqual(saved);expect(view.data.opsDebrisFlightPanel).toBe('speed');expect(view.data.opsDebrisApertureView).toBe('clock');
  });

  it('cleans up speed-history capture through mode and inspector changes so later gestures remain usable',()=>{
    const view=mountDebris({opsDebrisApertureStudy:true,opsDebrisApertureView:'clock',opsDebrisFlightPanel:'speed'}),stage=()=>view.host.querySelector('[data-debris-speed-stage]');let captured=false;
    const install=()=>{vi.spyOn(stage().querySelector('svg'),'getBoundingClientRect').mockReturnValue({left:0,width:600});stage().setPointerCapture=()=>{captured=true;};stage().hasPointerCapture=()=>captured;stage().releasePointerCapture=()=>{captured=false;};};install();
    for(const [index,release] of ['pointerUp','pointerCancel','lostPointerCapture'].entries()){
      const pointerId=100+index;act(()=>Simulate.pointerDown(stage(),{button:0,isPrimary:true,pointerId,clientX:200}));expect(stage()._issSpeedDrag.pointer).toBe(pointerId);view.click('[data-debris-aperture-view="contact"]');const time=view.time,token=view.data.opsDebrisSeekToken;
      act(()=>Simulate.pointerMove(stage(),{pointerId,clientX:500}));expect(view.time).toBe(time);act(()=>Simulate[release](stage(),{pointerId}));expect(stage()._issSpeedDrag).toBeUndefined();expect(stage().hasAttribute('data-dragging')).toBe(false);expect(captured).toBe(false);expect(view.time).toBe(time);expect(view.data.opsDebrisSeekToken).toBe(token);view.click('[data-debris-aperture-view="clock"]');
    }
    act(()=>Simulate.pointerDown(stage(),{button:0,isPrimary:true,pointerId:110,clientX:200}));const previous=stage();view.click('[data-debris-flight-panel="position"]');expect(view.host.querySelector('[data-debris-speed-stage]')).toBeNull();view.click('[data-debris-flight-panel="speed"]');expect(stage()).not.toBe(previous);expect(stage()._issSpeedDrag).toBeUndefined();install();
    act(()=>Simulate.pointerDown(stage(),{button:0,isPrimary:true,pointerId:111,clientX:400}));expect(stage()._issSpeedDrag.pointer).toBe(111);expect(stage().hasAttribute('data-dragging')).toBe(true);act(()=>Simulate.pointerUp(stage(),{pointerId:111}));expect(stage()._issSpeedDrag).toBeUndefined();
  });

  it('unmounts a captured position panel when opening speed history so returning accepts a new side drag',()=>{
    const view=mountDebris({opsDebrisApertureStudy:true,opsDebrisApertureView:'clock'}),side=()=>view.host.querySelector('[data-debris-aperture-side]');
    const original=side(),svg=original.querySelector('svg');vi.spyOn(svg,'getBoundingClientRect').mockReturnValue({left:0,top:0,width:600,height:260});original.setPointerCapture=()=>{};original.hasPointerCapture=()=>true;original.releasePointerCapture=()=>{};
    act(()=>Simulate.pointerDown(original,{button:0,isPrimary:true,pointerId:120,clientX:250}));expect(original._issSideDrag.pointer).toBe(120);expect(original.hasAttribute('data-dragging')).toBe(true);const time=view.time;
    view.click('[data-debris-flight-panel="speed"]');expect(side()).toBeNull();expect(original.isConnected).toBe(false);expect(view.time).toBe(time);view.click('[data-debris-flight-panel="position"]');expect(side()).not.toBe(original);expect(side()._issSideDrag).toBeUndefined();expect(side().hasAttribute('data-dragging')).toBe(false);
    vi.spyOn(side().querySelector('svg'),'getBoundingClientRect').mockReturnValue({left:0,top:0,width:600,height:260});side().setPointerCapture=()=>{};side().hasPointerCapture=()=>true;side().releasePointerCapture=()=>{};
    act(()=>Simulate.pointerDown(side(),{button:0,isPrimary:true,pointerId:121,clientX:400}));expect(side()._issSideDrag.pointer).toBe(121);expect(side().hasAttribute('data-dragging')).toBe(true);act(()=>Simulate.pointerUp(side(),{pointerId:121}));expect(side()._issSideDrag).toBeUndefined();expect(side().hasAttribute('data-dragging')).toBe(false);
  });

  it('shares accessible speed-history keyboard seeks and playback updates without changing its step traces',()=>{
    const m=model({}),view=mountDebris({opsDebrisApertureStudy:true,opsDebrisApertureView:'clock',opsDebrisFlightPanel:'speed'}),stage=()=>view.host.querySelector('[data-debris-speed-stage]'),key=key=>act(()=>Simulate.keyDown(stage(),{key})),paths=()=>[...stage().querySelectorAll('[data-debris-speed-trace]')].map(n=>n.getAttribute('d')),initial=paths();
    expect(stage().getAttribute('role')).toBe('slider');expect(stage().tabIndex).toBe(0);expect(stage().getAttribute('aria-label')).toBeTruthy();expect(stage().getAttribute('aria-valuemin')).toBe('0');expect(Number(stage().getAttribute('aria-valuemax'))).toBe(m.arrivalUs);expect(stage().getAttribute('aria-orientation')).toBe('horizontal');
    const described=stage().getAttribute('aria-describedby');expect(described).toBeTruthy();for(const id of described.split(/\s+/))expect(view.host.querySelector('#'+id)).not.toBeNull();
    view.click('[data-iss-playback-toggle="debris"]');key('ArrowRight');expect(view.time).toBe(.05);expect(view.playing).toBe(false);key('PageUp');expect(view.time).toBe(.55);key('PageDown');key('ArrowDown');expect(view.time).toBeCloseTo(0,12);key('Home');key('ArrowLeft');expect(view.time).toBe(0);key('End');expect(view.time).toBe(m.arrivalUs);key('ArrowUp');expect(view.time).toBe(m.arrivalUs);
    expect(stage().getAttribute('aria-valuetext')).toContain('microseconds');for(const selector of ['#iss-debris-time','#iss-debris-aperture-time'])expect(Number(view.host.querySelector(selector).value)).toBeCloseTo(view.time,12);expect(paths()).toEqual(initial);
    view.click('[data-debris-aperture-event="impact"]');view.click('[data-iss-playback-toggle="debris"]');advance(.1);const time=view.time;expect(time).toBeGreaterThan(m.impactUs);expect(Number(stage().querySelector('[data-debris-speed-cursor]').getAttribute('data-debris-speed-cursor'))).toBe(time);expect(Number(stage().getAttribute('aria-valuenow'))).toBe(time);expect(stage().dataset.phase).toBe('cloud');expect(view.host.querySelector('[data-debris-aperture-map]').dataset.phase).toBe('cloud');expect(paths()).toEqual(initial);
    view.click('[data-debris-aperture-basis="area"]');view.click('[data-debris-scan-metric="mass"]');view.click('[data-debris-aperture-preset="rim"]');expect(view.time).toBe(time);expect(view.playing).toBe(true);expect(paths()).toEqual(initial);expect(view.host.querySelectorAll('[data-iss-playback-toggle="debris"]')).toHaveLength(1);
  });

  it('shows whole-impact before and after budgets with exact conserved totals and proportional energy segments',()=>{
    const m=model({}),b=budget(m,m.arrivalUs),view=mountDebris({opsDebrisApertureStudy:true,opsDebrisFlightPanel:'balance'}),panel=()=>view.host.querySelector('[data-debris-budget-panel]');
    expect(panel()).not.toBeNull();expect(view.host.querySelector('[data-debris-speed-panel]')).toBeNull();expect(view.host.querySelector('[data-debris-aperture-side]')).toBeNull();expect(view.host.querySelector('[data-debris-flight-panel="balance"]').getAttribute('aria-pressed')).toBe('true');
    expect(panel().dataset.phase).toBe('contact');expect(panel().dataset.after).toBe('true');expect(panel().querySelector('[data-debris-budget-state="before"]').dataset.active).toBe('false');expect(panel().querySelector('[data-debris-budget-state="after"]').dataset.active).toBe('true');expect(panel().querySelector('[data-debris-budget-state="after"]').dataset.predicted).toBe('false');
    for(const [state,mass,speed,momentum] of [['before',m.projectile,m.config.speed*1000,b.momentum.before],['after',m.mass,m.axial,b.momentum.after]]){
      expect(Number(panel().querySelector('[data-debris-budget-mass="'+state+'"]').dataset.value)).toBe(mass);expect(Number(panel().querySelector('[data-debris-budget-speed="'+state+'"]').dataset.value)).toBe(speed);expect(Number(panel().querySelector('[data-debris-budget-momentum="'+state+'"]').dataset.value)).toBe(momentum);
    }
    for(const component of ['incoming','total','forward','radial','internal'])expect(Number(panel().querySelector('[data-debris-budget-energy="'+component+'"]').dataset.value)).toBe(b.energy[component]);
    expect(panel().querySelectorAll('[data-debris-budget-segment]')).toHaveLength(3);
    for(const component of ['forward','radial','internal']){
      const segment=panel().querySelector('[data-debris-budget-segment="'+component+'"]');expect(Number(segment.dataset.fraction)).toBe(b.fractions[component]);expect(Number(segment.dataset.value)).toBe(b.energy[component]);expect(parseFloat(segment.style.width)).toBeCloseTo(b.fractions[component]*100,12);
    }
    const before=[...panel().querySelectorAll('[data-debris-budget-energy]')].map(n=>n.dataset.value);view.change('iss-debris-detector-radius',.5);view.change('iss-debris-aperture-offset',1e6);view.click('[data-debris-aperture-basis="area"]');view.click('[data-debris-scan-metric="mass"]');expect([...panel().querySelectorAll('[data-debris-budget-energy]')].map(n=>n.dataset.value)).toEqual(before);
  });

  it('marks after-impact quantities as predictions until the shared clock reaches the bumper',()=>{
    const m=model({}),view=mountDebris({opsDebrisApertureStudy:true,opsDebrisApertureView:'clock',opsDebrisFlightPanel:'balance'}),panel=()=>view.host.querySelector('[data-debris-budget-panel]');
    const readings=()=>[...panel().querySelectorAll('[data-debris-budget-energy]')].map(n=>n.dataset.value),original=readings();
    for(const [event,time,phase,after] of [['start',0,'approach',false],['impact',m.impactUs,'impact',true],['cloud',m.impactUs+m.flightUs/2,'cloud',true],['wall',m.arrivalUs,'contact',true]]){
      view.click('[data-debris-aperture-event="'+event+'"]');expect(view.time).toBe(time);expect(panel().dataset.phase).toBe(phase);expect(panel().dataset.after).toBe(String(after));expect(panel().querySelector('[data-debris-budget-state="before"]').dataset.active).toBe(String(!after));expect(panel().querySelector('[data-debris-budget-state="after"]').dataset.active).toBe(String(after));expect(panel().querySelector('[data-debris-budget-state="after"]').dataset.predicted).toBe(String(!after));expect(readings()).toEqual(original);
    }
    view.click('[data-debris-aperture-event="start"]');view.click('[data-debris-aperture-view="contact"]');expect(view.time).toBe(0);expect(panel().dataset.phase).toBe('contact');expect(panel().dataset.after).toBe('true');view.click('[data-debris-aperture-view="clock"]');expect(panel().dataset.after).toBe('false');
    view.change('iss-debris-time',m.impactUs-.1);view.click('[data-iss-playback-toggle="debris"]');advance(.1);expect(view.time).toBeGreaterThan(m.impactUs);expect(view.playing).toBe(true);expect(panel().dataset.after).toBe('true');expect(panel().dataset.phase).toBe('cloud');expect(readings()).toEqual(original);expect(view.host.querySelectorAll('[data-iss-playback-toggle="debris"]')).toHaveLength(1);
  });

  it('lets native component buttons explain the impact budget without changing probes, predictions or active playback',()=>{
    const saved=snapshot(model({gap:2})),view=mountDebris({opsDebrisApertureStudy:true,opsDebrisApertureView:'clock',opsDebrisFlightPanel:'balance',opsDebrisBaseline:saved,opsDebrisDetectorOffset:12,opsDebrisApertureOffset:17.123456789}),panel=()=>view.host.querySelector('[data-debris-budget-panel]');
    view.click('[data-debris-position-mark]');const mark=JSON.stringify(view.data.opsDebrisPositionA),paths=[...view.host.querySelectorAll('[data-debris-aperture-curve]')].map(n=>n.getAttribute('d'));view.click('[data-iss-playback-toggle="debris"]');advance(.1);const time=view.time;
    expect(panel().querySelector('[data-debris-budget-focus="forward"]').getAttribute('aria-pressed')).toBe('true');
    for(const component of ['radial','internal','forward']){
      const button=panel().querySelector('[data-debris-budget-focus="'+component+'"]');expect(button.tagName).toBe('BUTTON');expect(button.type).toBe('button');expect(button.disabled).toBe(false);expect(button.tabIndex).toBe(0);button.focus();view.click('[data-debris-budget-focus="'+component+'"]');expect(document.activeElement).toBe(button);expect(button.getAttribute('aria-pressed')).toBe('true');
      expect(panel().querySelector('[data-debris-budget-detail]').getAttribute('data-debris-budget-detail')).toBe(component);for(const other of ['forward','radial','internal'].filter(c=>c!==component))expect(panel().querySelector('[data-debris-budget-focus="'+other+'"]').getAttribute('aria-pressed')).toBe('false');
      if(component==='radial')expect(panel().querySelector('[data-debris-budget-detail]').textContent).toMatch(/available/i);if(component==='internal')expect(panel().querySelector('[data-debris-budget-detail]').textContent).toMatch(/unresolved/i);
      expect(view.time).toBe(time);expect(view.playing).toBe(true);expect(view.data.opsDebrisDetectorOffset).toBe(12);expect(view.data.opsDebrisApertureOffset).toBe(17.123456789);expect(JSON.stringify(view.data.opsDebrisPositionA)).toBe(mark);expect(view.data.opsDebrisBaseline).toEqual(saved);expect([...view.host.querySelectorAll('[data-debris-aperture-curve]')].map(n=>n.getAttribute('d'))).toEqual(paths);
    }
    view.click('[data-debris-budget-focus="internal"]');view.click('[data-debris-flight-panel="speed"]');expect(panel()).toBeNull();view.click('[data-debris-flight-panel="balance"]');expect(panel().querySelector('[data-debris-budget-focus="internal"]').getAttribute('aria-pressed')).toBe('true');view.click('[data-debris-aperture-toggle]');view.click('[data-debris-aperture-toggle]');expect(panel().querySelector('[data-debris-budget-detail]').getAttribute('data-debris-budget-detail')).toBe('internal');expect(view.time).toBe(time);expect(view.playing).toBe(true);
  });

  it('keeps zero radial energy literally zero while preserving a focusable explanation and safe preference fallback',()=>{
    const view=mountDebris({opsDebrisApertureStudy:true,opsDebrisFlightPanel:'balance',opsDebrisSpread:0,opsDebrisBudgetFocus:'radial'}),panel=()=>view.host.querySelector('[data-debris-budget-panel]');
    const segment=panel().querySelector('[data-debris-budget-segment="radial"]'),button=panel().querySelector('[data-debris-budget-focus="radial"]');expect(Number(segment.dataset.fraction)).toBe(0);expect(Number(segment.dataset.value)).toBe(0);expect(parseFloat(segment.style.width)).toBe(0);expect(parseFloat(segment.style.minWidth)||0).toBe(0);expect(button.disabled).toBe(false);expect(button.getAttribute('aria-pressed')).toBe('true');expect(Number(panel().querySelector('[data-debris-budget-energy="radial"]').dataset.value)).toBe(0);expect(panel().textContent).not.toMatch(/NaN|Infinity/);
    for(const invalid of [undefined,null,false,'RADIAL','invalid']){view.patch({opsDebrisBudgetFocus:invalid});expect(panel().querySelector('[data-debris-budget-focus="forward"]').getAttribute('aria-pressed')).toBe('true');expect(panel().querySelector('[data-debris-budget-detail]').getAttribute('data-debris-budget-detail')).toBe('forward');}
    view.change('iss-debris-spread',30);expect(Number(panel().querySelector('[data-debris-budget-segment="radial"]').dataset.fraction)).toBeGreaterThan(0);view.patch({opsDebrisFlightPanel:'unknown'});expect(panel()).toBeNull();expect(view.host.querySelector('[data-debris-flight-panel="position"]').getAttribute('aria-pressed')).toBe('true');expect(view.host.querySelector('[data-debris-aperture-side]')).not.toBeNull();
  });

  it('renders symmetric material samples on a fixed physical disk with consistent velocity-component readings',()=>{
    const m=model({}),view=mountDebris({opsDebrisApertureStudy:true,opsDebrisFlightPanel:'motion'}),panel=()=>view.host.querySelector('[data-debris-motion-panel]'),scale=80/m.wallRadius;
    expect(panel()).not.toBeNull();expect(view.host.querySelector('[data-debris-speed-panel]')).toBeNull();expect(view.host.querySelector('[data-debris-aperture-side]')).toBeNull();expect(view.host.querySelector('[data-debris-budget-panel]')).toBeNull();expect(view.host.querySelector('[data-debris-flight-panel="motion"]').getAttribute('aria-pressed')).toBe('true');
    const field=panel().querySelector('[data-debris-motion-field]');expect(field.getAttribute('role')).toBe('slider');expect(field.getAttribute('aria-label')).toBeTruthy();expect(Number(field.querySelector('svg').getAttribute('data-debris-motion-scale'))).toBe(scale);
    for(const [preset,percent] of [['middle',50],['rim',100]]){
      view.click('[data-debris-motion-preset="'+preset+'"]');const p=motion(m,m.arrivalUs,percent),cloud=panel().querySelector('[data-debris-motion-cloud]');expect(panel().dataset.phase).toBe('contact');expect(panel().dataset.after).toBe('true');expect(Number(cloud.getAttribute('cx'))).toBe(150);expect(Number(cloud.getAttribute('cy'))).toBe(120);expect(Number(cloud.getAttribute('r'))).toBe(p.cloudRadius*scale);
      expect(panel().querySelectorAll('[data-debris-motion-sample]')).toHaveLength(2);
      for(const [side,sign] of [['positive',1],['negative',-1]]){const sample=panel().querySelector('[data-debris-motion-sample="'+side+'"]');expect(Number(sample.dataset.radius)).toBe(sign*p.radius);expect(parseFloat(sample.style.top)).toBeCloseTo((120-sign*p.radius*scale)/240*100,11);expect(panel().querySelector('[data-debris-motion-radial="'+side+'"]')).not.toBeNull();}
      for(const key of ['radius','forward','radial','speed','angle'])expect(Number(panel().querySelector('[data-debris-motion-reading="'+key+'"]').dataset.value)).toBe(p[key]);
      expect(Number(panel().querySelector('[data-debris-motion-vector-chart]').getAttribute('data-high'))).toBe(p.high);for(const component of ['forward','radial','resultant'])expect(panel().querySelector('[data-debris-motion-vector="'+component+'"]')).not.toBeNull();
    }
    view.click('[data-debris-motion-preset="center"]');expect(panel().querySelectorAll('[data-debris-motion-sample]')).toHaveLength(1);const center=panel().querySelector('[data-debris-motion-sample="center"]');expect(Number(center.dataset.radius)).toBe(0);expect(parseFloat(center.style.top)).toBe(50);expect(panel().querySelector('[data-debris-motion-radial]')).toBeNull();expect(panel().querySelector('[data-debris-motion-vector="radial"]')).toBeNull();expect(Number(panel().querySelector('[data-debris-motion-reading="radial"]').dataset.value)).toBe(0);expect(Number(panel().querySelector('[data-debris-motion-reading="angle"]').dataset.value)).toBe(0);
  });

  it('keeps cloud sampling pending before impact and follows material radius using the sole experiment clock',()=>{
    const m=model({}),view=mountDebris({opsDebrisApertureStudy:true,opsDebrisApertureView:'clock',opsDebrisFlightPanel:'motion',opsDebrisMotionRadius:75}),panel=()=>view.host.querySelector('[data-debris-motion-panel]');
    expect(panel().dataset.phase).toBe('approach');expect(panel().dataset.after).toBe('false');expect(panel().querySelector('[data-debris-motion-sample]')).toBeNull();expect(panel().querySelector('[data-debris-motion-radial]')).toBeNull();expect(panel().querySelector('[data-debris-motion-reading="radius"]').dataset.value).toBe('pending');expect(Number(panel().querySelector('[data-debris-motion-reading="forward"]').dataset.value)).toBe(m.config.speed*1000);expect(Number(panel().querySelector('[data-debris-motion-reading="radial"]').dataset.value)).toBe(0);
    const high=Number(panel().querySelector('[data-debris-motion-vector-chart]').getAttribute('data-high')),scale=Number(panel().querySelector('[data-debris-motion-field] svg').getAttribute('data-debris-motion-scale'));
    view.click('[data-debris-aperture-event="impact"]');expect(panel().dataset.after).toBe('true');expect(Number(panel().querySelector('[data-debris-motion-reading="radius"]').dataset.value)).toBe(m.radius*.75);expect(Number(panel().querySelector('[data-debris-motion-reading="forward"]').dataset.value)).toBe(m.axial);
    view.click('[data-iss-playback-toggle="debris"]');advance(.1);const time=view.time,p=motion(m,time,75);expect(panel().dataset.phase).toBe('cloud');expect(Number(panel().querySelector('[data-debris-motion-reading="radius"]').dataset.value)).toBe(p.radius);expect(p.radius).toBeGreaterThan(m.radius*.75);expect(Number(panel().querySelector('[data-debris-motion-cloud]').getAttribute('r'))).toBe(p.cloudRadius*scale);expect(Number(panel().querySelector('[data-debris-motion-vector-chart]').getAttribute('data-high'))).toBe(high);expect(view.data.opsDebrisMotionRadius).toBe(75);
    view.click('[data-debris-aperture-view="contact"]');expect(panel().dataset.phase).toBe('contact');expect(Number(panel().querySelector('[data-debris-motion-reading="radius"]').dataset.value)).toBe(motion(m,m.arrivalUs,75).radius);expect(view.time).toBe(time);expect(view.playing).toBe(true);view.click('[data-debris-aperture-view="clock"]');expect(Number(panel().querySelector('[data-debris-motion-reading="radius"]').dataset.value)).toBe(p.radius);expect(view.host.querySelectorAll('[data-iss-playback-toggle="debris"]')).toHaveLength(1);
  });

  it('offers labeled material-radius controls that preserve active playback, probes and saved experiment state',()=>{
    const saved=snapshot(model({gap:2})),view=mountDebris({opsDebrisApertureStudy:true,opsDebrisApertureView:'clock',opsDebrisFlightPanel:'motion',opsDebrisBaseline:saved,opsDebrisDetectorOffset:12,opsDebrisApertureOffset:17.123456789}),input=()=>view.host.querySelector('#iss-debris-motion-radius');
    expect(input().type).toBe('range');expect(input().min).toBe('0');expect(input().max).toBe('100');expect(input().step).toBe('1');expect(view.host.querySelector('label[for="iss-debris-motion-radius"]')).not.toBeNull();expect(input().getAttribute('aria-valuetext')).toBeTruthy();
    view.click('[data-debris-position-mark]');const mark=JSON.stringify(view.data.opsDebrisPositionA),paths=[...view.host.querySelectorAll('[data-debris-aperture-curve]')].map(n=>n.getAttribute('d'));view.click('[data-iss-playback-toggle="debris"]');advance(.1);const time=view.time,token=view.data.opsDebrisSeekToken;
    for(const [preset,value] of [['center',0],['middle',50],['rim',100]]){const button=view.host.querySelector('[data-debris-motion-preset="'+preset+'"]');expect(button.tagName).toBe('BUTTON');expect(button.type).toBe('button');view.click('[data-debris-motion-preset="'+preset+'"]');expect(view.data.opsDebrisMotionRadius).toBe(value);expect(Number(input().value)).toBe(value);}
    const key=key=>act(()=>Simulate.keyDown(input(),{key}));key('Home');expect(view.data.opsDebrisMotionRadius).toBe(0);key('ArrowRight');key('PageUp');expect(view.data.opsDebrisMotionRadius).toBe(11);key('ArrowDown');key('PageDown');expect(view.data.opsDebrisMotionRadius).toBe(0);key('ArrowLeft');expect(view.data.opsDebrisMotionRadius).toBe(0);key('End');key('ArrowUp');expect(view.data.opsDebrisMotionRadius).toBe(100);view.change('iss-debris-motion-radius',37);expect(view.data.opsDebrisMotionRadius).toBe(37);
    expect(view.time).toBe(time);expect(view.playing).toBe(true);expect(view.data.opsDebrisSeekToken).toBe(token);expect(view.data.opsDebrisDetectorOffset).toBe(12);expect(view.data.opsDebrisApertureOffset).toBe(17.123456789);expect(JSON.stringify(view.data.opsDebrisPositionA)).toBe(mark);expect(view.data.opsDebrisBaseline).toEqual(saved);expect([...view.host.querySelectorAll('[data-debris-aperture-curve]')].map(n=>n.getAttribute('d'))).toEqual(paths);
    view.click('[data-debris-flight-panel="speed"]');expect(view.host.querySelector('[data-debris-motion-panel]')).toBeNull();view.click('[data-debris-flight-panel="motion"]');expect(Number(input().value)).toBe(37);view.click('[data-debris-aperture-toggle]');view.click('[data-debris-aperture-toggle]');expect(Number(input().value)).toBe(37);expect(view.time).toBe(time);expect(view.playing).toBe(true);
  });

  it('handles zero spread and stale material-radius preferences without artificial radial arrows or invalid values',()=>{
    const view=mountDebris({opsDebrisApertureStudy:true,opsDebrisFlightPanel:'motion',opsDebrisSpread:0,opsDebrisMotionRadius:100}),panel=()=>view.host.querySelector('[data-debris-motion-panel]'),input=()=>view.host.querySelector('#iss-debris-motion-radius');
    expect(panel().querySelectorAll('[data-debris-motion-sample]')).toHaveLength(2);expect(panel().querySelector('[data-debris-motion-radial]')).toBeNull();expect(panel().querySelector('[data-debris-motion-vector="radial"]')).toBeNull();expect(Number(panel().querySelector('[data-debris-motion-reading="radial"]').dataset.value)).toBe(0);expect(Number(panel().querySelector('[data-debris-motion-reading="angle"]').dataset.value)).toBe(0);expect(panel().querySelector('[data-debris-motion-reading="speed"]').dataset.value).toBe(panel().querySelector('[data-debris-motion-reading="forward"]').dataset.value);
    for(const [value,expected] of [[undefined,50],[NaN,50],[Infinity,50],['bad',50],[-1,0],[101,100]]){view.patch({opsDebrisMotionRadius:value});expect(Number(input().value)).toBe(expected);expect(panel().textContent).not.toMatch(/NaN|Infinity/);}
    view.change('iss-debris-motion-radius',75);view.change('iss-debris-spread',30);expect(view.data.opsDebrisMotionRadius).toBe(75);expect(Number(input().value)).toBe(75);expect(panel().querySelectorAll('[data-debris-motion-radial]')).toHaveLength(2);view.click('[data-debris-aperture-view="clock"]');view.click('[data-debris-aperture-event="start"]');expect(view.data.opsDebrisMotionRadius).toBe(75);expect(panel().querySelector('[data-debris-motion-sample]')).toBeNull();view.click('[data-debris-aperture-event="wall"]');expect(panel().querySelectorAll('[data-debris-motion-sample]')).toHaveLength(2);
  });

  it('exposes a vertical material selector only after impact with the same accessible keyboard controls as the range',()=>{
    const m=model({}),view=mountDebris({opsDebrisApertureStudy:true,opsDebrisApertureView:'clock',opsDebrisFlightPanel:'motion',opsDebrisMotionRadius:50}),field=()=>view.host.querySelector('[data-debris-motion-field]');
    expect(field().getAttribute('role')).toBe('img');expect(field().hasAttribute('tabindex')).toBe(false);expect(field().getAttribute('aria-label')).toBeTruthy();for(const key of ['aria-valuemin','aria-valuemax','aria-valuenow','aria-valuetext','aria-orientation'])expect(field().hasAttribute(key)).toBe(false);
    act(()=>Simulate.keyDown(field(),{key:'End'}));act(()=>Simulate.pointerDown(field(),{button:0,isPrimary:true,pointerId:100,clientY:0}));expect(view.data.opsDebrisMotionRadius).toBe(50);expect(field().hasAttribute('data-dragging')).toBe(false);
    view.click('[data-debris-aperture-event="impact"]');expect(field().getAttribute('role')).toBe('slider');expect(field().tabIndex).toBe(0);expect(field().getAttribute('aria-orientation')).toBe('vertical');expect(field().getAttribute('aria-valuemin')).toBe('0');expect(field().getAttribute('aria-valuemax')).toBe('100');expect(field().getAttribute('aria-valuetext')).toBeTruthy();
    const key=key=>act(()=>Simulate.keyDown(field(),{key}));key('Home');key('ArrowUp');key('PageUp');expect(view.data.opsDebrisMotionRadius).toBe(11);key('ArrowDown');key('PageDown');key('ArrowLeft');expect(view.data.opsDebrisMotionRadius).toBe(0);key('End');key('ArrowRight');expect(view.data.opsDebrisMotionRadius).toBe(100);expect(field().getAttribute('aria-valuenow')).toBe('100');expect(Number(view.host.querySelector('#iss-debris-motion-radius').value)).toBe(100);expect(view.time).toBe(m.impactUs);
    view.click('[data-debris-aperture-event="start"]');expect(field().getAttribute('role')).toBe('img');expect(field().hasAttribute('aria-valuenow')).toBe(false);expect(view.data.opsDebrisMotionRadius).toBe(100);
  });

  it('selects mirrored material radii through a captured letterboxed field with one-percent rounding and primary-pointer ownership',()=>{
    const view=mountDebris({opsDebrisApertureStudy:true,opsDebrisFlightPanel:'motion'}),field=view.host.querySelector('[data-debris-motion-field]'),svg=field.querySelector('svg'),rect=vi.spyOn(svg,'getBoundingClientRect').mockReturnValue({left:17,top:11,width:300,height:480});let captured=false;
    field.setPointerCapture=()=>{captured=true;};field.hasPointerCapture=()=>captured;field.releasePointerCapture=()=>{captured=false;};const y=percent=>11+120+120-80*percent/100;
    act(()=>Simulate.pointerDown(field,{button:0,isPrimary:true,pointerId:101,pointerType:'touch',clientX:1e6,clientY:y(37.49)}));expect(view.data.opsDebrisMotionRadius).toBe(37);expect(captured).toBe(true);expect(field.hasAttribute('data-dragging')).toBe(true);expect(document.activeElement).toBe(field);
    act(()=>Simulate.pointerDown(field,{button:0,isPrimary:true,pointerId:102,clientY:y(90)}));act(()=>Simulate.pointerMove(field,{pointerId:102,clientY:y(90)}));expect(view.data.opsDebrisMotionRadius).toBe(37);
    act(()=>Simulate.pointerMove(field,{pointerId:101,clientX:-1e6,clientY:y(-37.51)}));expect(view.data.opsDebrisMotionRadius).toBe(38);act(()=>Simulate.pointerMove(field,{pointerId:101,clientY:y(0)}));expect(view.data.opsDebrisMotionRadius).toBe(0);act(()=>Simulate.pointerMove(field,{pointerId:101,clientY:-1e6}));expect(view.data.opsDebrisMotionRadius).toBe(100);
    act(()=>Simulate.pointerCancel(field,{pointerId:101}));expect(captured).toBe(false);expect(field.hasAttribute('data-dragging')).toBe(false);act(()=>Simulate.pointerMove(field,{pointerId:101,clientY:y(20)}));expect(view.data.opsDebrisMotionRadius).toBe(100);
    for(const props of [{button:2,isPrimary:true},{button:0,isPrimary:false}])act(()=>Simulate.pointerDown(field,{...props,pointerId:103,clientY:y(20)}));expect(view.data.opsDebrisMotionRadius).toBe(100);
    rect.mockReturnValue({left:17,top:11,width:0,height:480});act(()=>Simulate.pointerDown(field,{button:0,isPrimary:true,pointerId:104,clientY:y(20)}));expect(view.data.opsDebrisMotionRadius).toBe(100);rect.mockReturnValue({left:17,top:11,width:300,height:0});act(()=>Simulate.pointerDown(field,{button:0,isPrimary:true,pointerId:104,clientY:y(20)}));expect(view.data.opsDebrisMotionRadius).toBe(100);
    rect.mockReturnValue({left:17,top:11,width:600,height:240});act(()=>Simulate.pointerDown(field,{button:0,isPrimary:true,pointerId:105,clientY:11+120-80*.63}));expect(view.data.opsDebrisMotionRadius).toBe(63);act(()=>Simulate.lostPointerCapture(field,{pointerId:105}));expect(field.hasAttribute('data-dragging')).toBe(false);expect(captured).toBe(false);
  });

  it('remaps a held material pointer against the growing live radius without seeking, pausing or changing probe predictions',()=>{
    const saved=snapshot(model({gap:2})),m=model({}),view=mountDebris({opsDebrisApertureStudy:true,opsDebrisApertureView:'clock',opsDebrisFlightPanel:'motion',opsDebrisBaseline:saved,opsDebrisDetectorOffset:12,opsDebrisApertureOffset:17.123456789});
    view.click('[data-debris-position-mark]');view.click('[data-debris-aperture-event="cloud"]');const mark=JSON.stringify(view.data.opsDebrisPositionA),paths=[...view.host.querySelectorAll('[data-debris-aperture-curve]')].map(n=>n.getAttribute('d')),token=view.data.opsDebrisSeekToken;
    const field=view.host.querySelector('[data-debris-motion-field]'),svg=field.querySelector('svg');vi.spyOn(svg,'getBoundingClientRect').mockReturnValue({left:0,top:0,width:300,height:240});field.setPointerCapture=()=>{};field.hasPointerCapture=()=>true;field.releasePointerCapture=()=>{};
    const scale=80/m.wallRadius,y=percent=>120-motion(m,view.time,percent).cloudRadius*scale*percent/100;
    view.click('[data-iss-playback-toggle="debris"]');const start=view.time;act(()=>Simulate.pointerDown(field,{button:0,isPrimary:true,pointerId:110,clientY:y(50)}));expect(view.data.opsDebrisMotionRadius).toBe(50);expect(view.time).toBe(start);expect(view.playing).toBe(true);
    advance(.1);const time=view.time;expect(time).toBeGreaterThan(start);act(()=>Simulate.pointerMove(field,{pointerId:110,clientY:y(50)}));expect(view.data.opsDebrisMotionRadius).toBe(50);expect(view.time).toBe(time);expect(view.playing).toBe(true);act(()=>Simulate.pointerMove(field,{pointerId:110,clientY:y(-75)}));expect(view.data.opsDebrisMotionRadius).toBe(75);act(()=>Simulate.pointerUp(field,{pointerId:110}));
    expect(view.data.opsDebrisSeekToken).toBe(token);expect(view.data.opsDebrisDetectorOffset).toBe(12);expect(view.data.opsDebrisApertureOffset).toBe(17.123456789);expect(JSON.stringify(view.data.opsDebrisPositionA)).toBe(mark);expect(view.data.opsDebrisBaseline).toEqual(saved);expect([...view.host.querySelectorAll('[data-debris-aperture-curve]')].map(n=>n.getAttribute('d'))).toEqual(paths);expect(view.host.querySelectorAll('[data-iss-playback-toggle="debris"]')).toHaveLength(1);
  });

  it('ignores material capture after its view or setup changes and releases gestures for subsequent sampling',()=>{
    const view=mountDebris({opsDebrisApertureStudy:true,opsDebrisFlightPanel:'motion'}),field=()=>view.host.querySelector('[data-debris-motion-field]');
    function prepare(node){vi.spyOn(node.querySelector('svg'),'getBoundingClientRect').mockReturnValue({left:0,top:0,width:300,height:240});let captured=false;node.setPointerCapture=()=>{captured=true;};node.hasPointerCapture=()=>captured;node.releasePointerCapture=()=>{captured=false;};return ()=>captured;}
    let captured=prepare(field());
    for(const [i,release] of ['pointerUp','pointerCancel','lostPointerCapture'].entries()){
      const id=120+i;act(()=>Simulate.pointerDown(field(),{button:0,isPrimary:true,pointerId:id,clientY:120-80*.3}));expect(view.data.opsDebrisMotionRadius).toBe(30);expect(captured()).toBe(true);
      view.click('[data-debris-aperture-view="clock"]');const value=view.data.opsDebrisMotionRadius;act(()=>Simulate.pointerMove(field(),{pointerId:id,clientY:40}));expect(view.data.opsDebrisMotionRadius).toBe(value);act(()=>Simulate[release](field(),{pointerId:id}));expect(captured()).toBe(false);expect(field().hasAttribute('data-dragging')).toBe(false);view.click('[data-debris-aperture-view="contact"]');
    }
    act(()=>Simulate.pointerDown(field(),{button:0,isPrimary:true,pointerId:130,clientY:120-80*.4}));expect(view.data.opsDebrisMotionRadius).toBe(40);view.change('iss-debris-spread',30);act(()=>Simulate.pointerMove(field(),{pointerId:130,clientY:40}));expect(view.data.opsDebrisMotionRadius).toBe(40);act(()=>Simulate.pointerUp(field(),{pointerId:130}));expect(captured()).toBe(false);
    const previous=field();act(()=>Simulate.pointerDown(previous,{button:0,isPrimary:true,pointerId:131,clientY:120-80*.6}));view.click('[data-debris-flight-panel="speed"]');view.click('[data-debris-flight-panel="motion"]');expect(field()).not.toBe(previous);expect(field().hasAttribute('data-dragging')).toBe(false);captured=prepare(field());act(()=>Simulate.pointerDown(field(),{button:0,isPrimary:true,pointerId:132,clientY:120-80*.2}));expect(view.data.opsDebrisMotionRadius).toBe(20);expect(captured()).toBe(true);act(()=>Simulate.pointerUp(field(),{pointerId:132}));expect(captured()).toBe(false);
  });

  it('draws symmetric physical material paths and live sample positions only after impact including exact wall contact',()=>{
    const m=model({}),view=mountDebris({opsDebrisApertureStudy:true,opsDebrisApertureView:'clock',opsDebrisFlightPanel:'motion',opsDebrisMotionDiagram:'path',opsDebrisMotionRadius:75}),chart=()=>view.host.querySelector('[data-debris-motion-path]'),coords=node=>(node.getAttribute('d').match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi)||[]).map(Number);
    for(const [event,time] of [['start',0],['impact',m.impactUs],['cloud',m.impactUs+m.flightUs/2],['wall',m.arrivalUs]]){
      view.click('[data-debris-aperture-event="'+event+'"]');const p=materialPath(m,time,75),svg=chart().querySelector('svg');expect(chart().getAttribute('role')).toBe('slider');expect(chart().getAttribute('aria-label')).toBeTruthy();expect(chart().dataset.phase).toBe(p.phase);expect(svg.getAttribute('viewBox')).toBe('0 0 300 240');expect(Number(svg.dataset.debrisMaterialScale)).toBe(p.scale);expect(Number(svg.dataset.debrisMaterialBumperX)).toBe(p.bumperX);expect(Number(svg.dataset.debrisMaterialWallX)).toBe(p.wallX);
      expect(chart().querySelectorAll('[data-debris-material-track]')).toHaveLength(2);expect(chart().querySelectorAll('[data-debris-material-point]')).toHaveLength(p.after?2:0);expect(chart().querySelectorAll('[data-debris-material-travelled]')).toHaveLength(p.after?2:0);
      for(const [side,sign] of [['positive',1],['negative',-1]]){
        expect(coords(chart().querySelector('[data-debris-material-track="'+side+'"]'))).toEqual([p.bumperX,p.cy-sign*p.initialRadius*p.scale,p.wallX,p.cy-sign*p.landingRadius*p.scale]);const landing=chart().querySelector('[data-debris-material-landing="'+side+'"]');expect(Number(landing.dataset.radius)).toBe(sign*p.landingRadius);expect(parseFloat(landing.style.left)).toBeCloseTo(p.wallX/300*100,11);expect(parseFloat(landing.style.top)).toBeCloseTo((p.cy-sign*p.landingRadius*p.scale)/240*100,11);
        if(p.after){const point=chart().querySelector('[data-debris-material-point="'+side+'"]');expect(Number(point.dataset.x)).toBe(p.sampleX);expect(Number(point.dataset.radius)).toBe(sign*p.sampleRadius);expect(parseFloat(point.style.left)).toBeCloseTo((p.bumperX+p.sampleX*p.scale)/300*100,11);expect(parseFloat(point.style.top)).toBeCloseTo((p.cy-sign*p.sampleRadius*p.scale)/240*100,11);expect(coords(chart().querySelector('[data-debris-material-travelled="'+side+'"]'))).toEqual([p.bumperX,p.cy-sign*p.initialRadius*p.scale,p.bumperX+p.sampleX*p.scale,p.cy-sign*p.sampleRadius*p.scale]);}
      }
      for(const [key,value] of [['landing',p.landingRadius],['remainingTime',p.remainingUs],['remainingDistance',p.remainingDistance]]){const node=view.host.querySelector('[data-debris-material-reading="'+key+'"]');expect(node).not.toBeNull();expect(value===null?node.dataset.value:Number(node.dataset.value)).toBe(value===null?'pending':value);}
    }
    view.click('[data-debris-motion-preset="center"]');expect(chart().querySelectorAll('[data-debris-material-track]')).toHaveLength(1);expect(chart().querySelectorAll('[data-debris-material-point]')).toHaveLength(1);expect(chart().querySelector('[data-debris-material-track="center"]')).not.toBeNull();
    view.change('iss-debris-spread',0);view.click('[data-debris-motion-preset="rim"]');const zero=model({spread:0});view.click('[data-debris-aperture-event="wall"]');for(const side of ['positive','negative']){const path=coords(chart().querySelector('[data-debris-material-track="'+side+'"]'));expect(path[1]).toBe(path[3]);}expect(Number(view.host.querySelector('[data-debris-material-reading="landing"]').dataset.value)).toBe(zero.radius);expect(Number(view.host.querySelector('[data-debris-material-reading="remainingDistance"]').dataset.value)).toBe(0);
  });

  it('switches the second material diagram without changing active playback or saved sampling preferences',()=>{
    const saved=snapshot(model({gap:2})),view=mountDebris({opsDebrisApertureStudy:true,opsDebrisApertureView:'clock',opsDebrisFlightPanel:'motion',opsDebrisMotionRadius:37,opsDebrisBaseline:saved,opsDebrisDetectorOffset:12,opsDebrisApertureOffset:17.123456789});
    expect(view.host.querySelector('[data-debris-motion-diagram="velocity"]').getAttribute('aria-pressed')).toBe('true');expect(view.host.querySelector('[data-debris-motion-vector-chart]')).not.toBeNull();expect(view.host.querySelector('[data-debris-motion-path]')).toBeNull();view.click('[data-debris-position-mark]');view.click('[data-debris-aperture-event="impact"]');view.click('[data-iss-playback-toggle="debris"]');advance(.1);const time=view.time,token=view.data.opsDebrisSeekToken,mark=JSON.stringify(view.data.opsDebrisPositionA),paths=[...view.host.querySelectorAll('[data-debris-aperture-curve]')].map(n=>n.getAttribute('d'));
    for(const diagram of ['path','velocity','path']){const button=view.host.querySelector('[data-debris-motion-diagram="'+diagram+'"]');expect(button.tagName).toBe('BUTTON');expect(button.type).toBe('button');button.focus();view.click('[data-debris-motion-diagram="'+diagram+'"]');expect(document.activeElement).toBe(button);expect(button.getAttribute('aria-pressed')).toBe('true');expect(view.data.opsDebrisMotionDiagram).toBe(diagram);expect(!!view.host.querySelector('[data-debris-motion-vector-chart]')).toBe(diagram==='velocity');expect(!!view.host.querySelector('[data-debris-motion-path]')).toBe(diagram==='path');expect(view.host.querySelector('[data-debris-motion-field]')).not.toBeNull();expect(view.time).toBe(time);expect(view.playing).toBe(true);}
    expect(view.data.opsDebrisMotionRadius).toBe(37);expect(view.data.opsDebrisSeekToken).toBe(token);expect(view.data.opsDebrisDetectorOffset).toBe(12);expect(view.data.opsDebrisApertureOffset).toBe(17.123456789);expect(JSON.stringify(view.data.opsDebrisPositionA)).toBe(mark);expect(view.data.opsDebrisBaseline).toEqual(saved);expect([...view.host.querySelectorAll('[data-debris-aperture-curve]')].map(n=>n.getAttribute('d'))).toEqual(paths);
    view.click('[data-debris-flight-panel="balance"]');view.click('[data-debris-flight-panel="motion"]');expect(view.host.querySelector('[data-debris-motion-path]')).not.toBeNull();view.click('[data-debris-aperture-toggle]');view.click('[data-debris-aperture-toggle]');expect(view.host.querySelector('[data-debris-motion-path]')).not.toBeNull();expect(view.playing).toBe(true);advance(.1);expect(view.time).toBeGreaterThan(time);
    for(const value of [undefined,null,false,'PATH','invalid']){view.patch({opsDebrisMotionDiagram:value});expect(view.host.querySelector('[data-debris-motion-diagram="velocity"]').getAttribute('aria-pressed')).toBe('true');expect(view.host.querySelector('[data-debris-motion-vector-chart]')).not.toBeNull();expect(view.host.querySelector('[data-debris-motion-path]')).toBeNull();}
  });

  it('keeps the first-contact material path descriptive and inert while the experiment clock runs independently',()=>{
    const m=model({}),view=mountDebris({opsDebrisApertureStudy:true,opsDebrisFlightPanel:'motion',opsDebrisMotionDiagram:'path',opsDebrisMotionRadius:37}),path=()=>view.host.querySelector('[data-debris-motion-path]');
    expect(path().getAttribute('role')).toBe('img');expect(path().hasAttribute('tabindex')).toBe(false);expect(path().getAttribute('aria-label')).toBeTruthy();for(const attr of ['aria-valuemin','aria-valuemax','aria-valuenow','aria-valuetext'])expect(path().hasAttribute(attr)).toBe(false);
    expect(Number(view.host.querySelector('[data-debris-material-time]').dataset.value)).toBe(m.arrivalUs);view.click('[data-iss-playback-toggle="debris"]');advance(.1);const time=view.time,token=view.data.opsDebrisSeekToken;
    act(()=>Simulate.keyDown(path(),{key:'Home'}));act(()=>Simulate.pointerDown(path(),{button:0,isPrimary:true,pointerId:150,clientX:0}));act(()=>Simulate.pointerMove(path(),{pointerId:150,clientX:1e6}));expect(view.time).toBe(time);expect(view.playing).toBe(true);expect(view.data.opsDebrisSeekToken).toBe(token);expect(path().hasAttribute('data-dragging')).toBe(false);expect(view.data.opsDebrisMotionRadius).toBe(37);
    view.click('[data-debris-aperture-view="clock"]');expect(path().getAttribute('role')).toBe('slider');expect(path().tabIndex).toBe(0);expect(Number(path().getAttribute('aria-valuenow'))).toBe(time);expect(Number(view.host.querySelector('[data-debris-material-time]').dataset.value)).toBe(time);expect(view.playing).toBe(true);
  });

  it('seeks the path with accessible time keys and renders a physical ruler and cursor only after impact',()=>{
    const m=model({}),view=mountDebris({opsDebrisApertureStudy:true,opsDebrisApertureView:'clock',opsDebrisFlightPanel:'motion',opsDebrisMotionDiagram:'path',opsDebrisMotionRadius:37}),path=()=>view.host.querySelector('[data-debris-motion-path]'),key=key=>act(()=>Simulate.keyDown(path(),{key}));
    expect(path().getAttribute('role')).toBe('slider');expect(path().tabIndex).toBe(0);expect(Number(path().getAttribute('aria-valuemin'))).toBe(0);expect(Number(path().getAttribute('aria-valuemax'))).toBe(m.arrivalUs);expect(path().getAttribute('aria-valuetext')).toBeTruthy();expect(path().querySelector('[data-debris-material-cursor]')).toBeNull();expect(Number(view.host.querySelector('[data-debris-material-time]').dataset.value)).toBe(0);
    const layout=materialPath(m,0,37),ruler=path().querySelector('[data-debris-material-ruler]');expect(Number(ruler.dataset.meters)).toBe(layout.rulerMeters);expect(Number(ruler.getAttribute('x1'))).toBe(22);expect(Number(ruler.getAttribute('x2'))).toBe(22+layout.rulerPixels);expect(Number(ruler.getAttribute('y1'))).toBe(226);expect(Number(ruler.getAttribute('y2'))).toBe(226);expect(view.host.querySelector('[data-debris-material-ruler-label]').textContent).toMatch(/mm/);expect(view.host.querySelector('[data-debris-material-ruler-label]').textContent).toMatch(/both axes/i);
    view.click('[data-iss-playback-toggle="debris"]');key('ArrowRight');expect(view.time).toBeCloseTo(.05,12);expect(view.playing).toBe(false);key('PageUp');expect(view.time).toBeCloseTo(.55,12);key('ArrowLeft');key('PageDown');expect(view.time).toBe(0);key('ArrowDown');expect(view.time).toBe(0);key('End');expect(view.time).toBe(m.arrivalUs);key('ArrowUp');expect(view.time).toBe(m.arrivalUs);expect(Number(path().getAttribute('aria-valuenow'))).toBe(m.arrivalUs);
    const cursor=()=>path().querySelector('[data-debris-material-cursor]');expect(Number(cursor().getAttribute('x1'))).toBe(layout.wallX);expect(Number(cursor().getAttribute('x2'))).toBe(layout.wallX);view.click('[data-debris-aperture-event="cloud"]');const mid=materialPath(m,view.time,37);expect(Number(cursor().getAttribute('x1'))).toBe(mid.bumperX+mid.sampleX*mid.scale);expect(Number(view.host.querySelector('[data-debris-material-time]').dataset.value)).toBe(view.time);key('Home');expect(view.time).toBe(0);expect(cursor()).toBeNull();expect(view.data.opsDebrisMotionRadius).toBe(37);
  });

  it('seeks from bumper to wall through captured letterboxed material paths while preserving sampling and prediction state',()=>{
    const saved=snapshot(model({gap:2})),m=model({}),view=mountDebris({opsDebrisApertureStudy:true,opsDebrisApertureView:'clock',opsDebrisFlightPanel:'motion',opsDebrisMotionDiagram:'path',opsDebrisMotionRadius:37,opsDebrisBaseline:saved,opsDebrisDetectorOffset:12,opsDebrisApertureOffset:17.123456789});
    view.click('[data-debris-position-mark]');const mark=JSON.stringify(view.data.opsDebrisPositionA),predictions=[...view.host.querySelectorAll('[data-debris-aperture-curve]')].map(n=>n.getAttribute('d')),path=view.host.querySelector('[data-debris-motion-path]'),svg=path.querySelector('svg'),rect=vi.spyOn(svg,'getBoundingClientRect').mockReturnValue({left:17,top:11,width:600,height:240});let captured=false;
    path.setPointerCapture=()=>{captured=true;};path.hasPointerCapture=()=>captured;path.releasePointerCapture=()=>{captured=false;};const layout=materialPath(m,0,37),x=meters=>17+150+layout.bumperX+meters*layout.scale;
    view.click('[data-iss-playback-toggle="debris"]');act(()=>Simulate.pointerDown(path,{button:0,isPrimary:true,pointerId:151,pointerType:'touch',clientX:x(.037123456789),clientY:1e6}));expect(view.time).toBeCloseTo(m.impactUs+.037123456789/m.axial*1e6,11);expect(view.playing).toBe(false);expect(captured).toBe(true);expect(path.hasAttribute('data-dragging')).toBe(true);expect(document.activeElement).toBe(path);
    const time=view.time;act(()=>Simulate.pointerDown(path,{button:0,isPrimary:true,pointerId:152,clientX:x(.08)}));act(()=>Simulate.pointerMove(path,{pointerId:152,clientX:x(.08)}));expect(view.time).toBe(time);
    act(()=>Simulate.pointerMove(path,{pointerId:151,clientX:-1e6}));expect(view.time).toBe(m.impactUs);act(()=>Simulate.pointerMove(path,{pointerId:151,clientX:1e6,clientY:-1e6}));expect(view.time).toBe(m.arrivalUs);act(()=>Simulate.pointerCancel(path,{pointerId:151}));expect(captured).toBe(false);expect(path.hasAttribute('data-dragging')).toBe(false);act(()=>Simulate.pointerMove(path,{pointerId:151,clientX:x(0)}));expect(view.time).toBe(m.arrivalUs);
    for(const props of [{button:2,isPrimary:true},{button:0,isPrimary:false}])act(()=>Simulate.pointerDown(path,{...props,pointerId:153,clientX:x(0)}));expect(view.time).toBe(m.arrivalUs);
    for(const box of [{left:17,top:11,width:0,height:240},{left:17,top:11,width:600,height:0}]){rect.mockReturnValue(box);act(()=>Simulate.pointerDown(path,{button:0,isPrimary:true,pointerId:154,clientX:x(0)}));expect(view.time).toBe(m.arrivalUs);}
    rect.mockReturnValue({left:17,top:11,width:300,height:480});act(()=>Simulate.pointerDown(path,{button:0,isPrimary:true,pointerId:155,clientX:17+layout.bumperX+.05*layout.scale}));expect(view.time).toBeCloseTo(m.impactUs+.05/m.axial*1e6,11);act(()=>Simulate.lostPointerCapture(path,{pointerId:155}));expect(captured).toBe(false);expect(path.hasAttribute('data-dragging')).toBe(false);
    expect(view.data.opsDebrisMotionRadius).toBe(37);expect(view.data.opsDebrisDetectorOffset).toBe(12);expect(view.data.opsDebrisApertureOffset).toBe(17.123456789);expect(JSON.stringify(view.data.opsDebrisPositionA)).toBe(mark);expect(view.data.opsDebrisBaseline).toEqual(saved);expect([...view.host.querySelectorAll('[data-debris-aperture-curve]')].map(n=>n.getAttribute('d'))).toEqual(predictions);expect(view.host.querySelectorAll('[data-iss-playback-toggle="debris"]')).toHaveLength(1);
  });

  it('releases material-path gestures across mode and setup changes and mounts a fresh path after diagram switches',()=>{
    const m=model({}),view=mountDebris({opsDebrisApertureStudy:true,opsDebrisApertureView:'clock',opsDebrisFlightPanel:'motion',opsDebrisMotionDiagram:'path'}),path=()=>view.host.querySelector('[data-debris-motion-path]');
    function prepare(node){vi.spyOn(node.querySelector('svg'),'getBoundingClientRect').mockReturnValue({left:0,top:0,width:300,height:240});let captured=false;node.setPointerCapture=()=>{captured=true;};node.hasPointerCapture=()=>captured;node.releasePointerCapture=()=>{captured=false;};return ()=>captured;}
    let captured=prepare(path()),layout=materialPath(m,0,50);const x=meters=>layout.bumperX+meters*layout.scale;
    for(const [index,release] of ['pointerUp','pointerCancel','lostPointerCapture'].entries()){
      const id=160+index;act(()=>Simulate.pointerDown(path(),{button:0,isPrimary:true,pointerId:id,clientX:x(.03)}));expect(captured()).toBe(true);view.click('[data-debris-aperture-view="contact"]');const time=view.time,token=view.data.opsDebrisSeekToken;act(()=>Simulate.pointerMove(path(),{pointerId:id,clientX:x(.09)}));expect(view.time).toBe(time);expect(view.data.opsDebrisSeekToken).toBe(token);act(()=>Simulate[release](path(),{pointerId:id}));expect(captured()).toBe(false);expect(path().hasAttribute('data-dragging')).toBe(false);view.click('[data-debris-aperture-view="clock"]');
    }
    act(()=>Simulate.pointerDown(path(),{button:0,isPrimary:true,pointerId:170,clientX:x(.04)}));view.change('iss-debris-spread',30);const time=view.time,token=view.data.opsDebrisSeekToken;act(()=>Simulate.pointerMove(path(),{pointerId:170,clientX:x(.09)}));expect(view.time).toBe(time);expect(view.data.opsDebrisSeekToken).toBe(token);act(()=>Simulate.pointerUp(path(),{pointerId:170}));expect(captured()).toBe(false);
    const previous=path();act(()=>Simulate.pointerDown(previous,{button:0,isPrimary:true,pointerId:171,clientX:x(.04)}));view.click('[data-debris-motion-diagram="velocity"]');const vector=view.host.querySelector('[data-debris-motion-vector-chart]');expect(vector).not.toBe(previous);view.click('[data-debris-motion-diagram="path"]');expect(path()).not.toBe(previous);expect(path().hasAttribute('data-dragging')).toBe(false);captured=prepare(path());layout=materialPath(model({spread:30}),view.time,50);act(()=>Simulate.pointerDown(path(),{button:0,isPrimary:true,pointerId:172,clientX:x(.05)}));expect(captured()).toBe(true);expect(view.time).toBeCloseTo(m.impactUs+.05/m.axial*1e6,11);act(()=>Simulate.pointerUp(path(),{pointerId:172}));expect(captured()).toBe(false);
  });

  it('marks and replaces a live material instant without changing playback, probes or physical predictions and clears back to the radius control',()=>{
    const saved=snapshot(model({gap:2})),m=model({}),view=mountDebris({opsDebrisApertureStudy:true,opsDebrisApertureView:'clock',opsDebrisFlightPanel:'motion',opsDebrisMotionDiagram:'path',opsDebrisMotionRadius:37,opsDebrisBaseline:saved,opsDebrisDetectorOffset:12,opsDebrisApertureOffset:17.123456789}),button=key=>view.host.querySelector('[data-debris-motion-mark="'+key+'"]');
    expect(button('save').disabled).toBe(true);expect(button('return').disabled).toBe(true);expect(button('clear').disabled).toBe(true);expect(view.host.querySelector('[data-debris-motion-reference]')).toBeNull();
    view.click('[data-debris-position-mark]');view.click('[data-debris-aperture-event="impact"]');view.click('[data-iss-playback-toggle="debris"]');advance(.1);const time=view.time,token=view.data.opsDebrisSeekToken,position=JSON.stringify(view.data.opsDebrisPositionA),paths=[...view.host.querySelectorAll('[data-debris-aperture-curve]')].map(n=>n.getAttribute('d'));
    button('save').focus();view.click('[data-debris-motion-mark="save"]');expect(view.data.opsDebrisMotionMark).toEqual(motionMark(m,time));expect(document.activeElement).toBe(button('save'));expect(button('save').textContent).toMatch(/replace/i);expect(button('return').disabled).toBe(false);expect(button('clear').disabled).toBe(false);expect(view.time).toBe(time);expect(view.playing).toBe(true);
    advance(.1);const next=view.time;expect(next).toBeGreaterThan(time);view.click('[data-debris-motion-mark="save"]');expect(view.data.opsDebrisMotionMark).toEqual(motionMark(m,next));expect(view.time).toBe(next);expect(view.playing).toBe(true);button('clear').focus();view.click('[data-debris-motion-mark="clear"]');expect(view.data.opsDebrisMotionMark).toBeNull();expect(view.host.querySelector('[data-debris-motion-reference]')).toBeNull();expect(document.activeElement).toBe(view.host.querySelector('#iss-debris-motion-radius'));expect(button('return').disabled).toBe(true);expect(button('clear').disabled).toBe(true);expect(view.time).toBe(next);expect(view.playing).toBe(true);
    expect(view.data.opsDebrisSeekToken).toBe(token);expect(view.data.opsDebrisMotionRadius).toBe(37);expect(view.data.opsDebrisDetectorOffset).toBe(12);expect(view.data.opsDebrisApertureOffset).toBe(17.123456789);expect(JSON.stringify(view.data.opsDebrisPositionA)).toBe(position);expect(view.data.opsDebrisBaseline).toEqual(saved);expect([...view.host.querySelectorAll('[data-debris-aperture-curve]')].map(n=>n.getAttribute('d'))).toEqual(paths);expect(view.host.querySelectorAll('[data-iss-playback-toggle="debris"]')).toHaveLength(1);
  });

  it('renders marked material ghosts on both physical diagrams and reports signed, coincident and pending differences',()=>{
    const m=model({}),marked=m.impactUs+m.flightUs/2,mark=motionMark(m,marked),view=mountDebris({opsDebrisApertureStudy:true,opsDebrisApertureView:'clock',opsDebrisFlightPanel:'motion',opsDebrisMotionDiagram:'path',opsDebrisMotionMark:mark}),panel=()=>view.host.querySelector('[data-debris-motion-panel]');
    for(const percent of [37,0,100])for(const [event,time] of [['start',0],['impact',m.impactUs],['cloud',marked],['wall',m.arrivalUs]]){
      view.change('iss-debris-motion-radius',percent);view.click('[data-debris-aperture-event="'+event+'"]');const ref=motionReference(m,time,percent,mark),layout=materialPath(m,time,percent),reference=panel().querySelector('[data-debris-motion-reference]'),scale=80/m.wallRadius;expect(reference).not.toBeNull();expect(reference.dataset.active).toBe(String(ref.active));
      for(const [key,value] of [['time',ref.deltaUs],['forward',ref.forward],['outward',ref.outward],['separation',ref.separation]]){const node=panel().querySelector('[data-debris-motion-delta="'+key+'"]');expect(node).not.toBeNull();expect(value===null?node.dataset.value:Number(node.dataset.value)).toBe(value===null?'pending':value);}
      const cloud=panel().querySelector('[data-debris-motion-reference-cloud]'),cursor=panel().querySelector('[data-debris-material-reference-cursor]');
      if(!ref.active){expect(cloud).toBeNull();expect(cursor).toBeNull();expect(panel().querySelectorAll('[data-debris-motion-reference-point]')).toHaveLength(0);expect(panel().querySelectorAll('[data-debris-material-reference-point]')).toHaveLength(0);continue;}
      expect(Number(cloud.getAttribute('cx'))).toBe(150);expect(Number(cloud.getAttribute('cy'))).toBe(120);expect(Number(cloud.getAttribute('r'))).toBe(ref.cloudRadius*scale);expect(Number(cursor.getAttribute('x1'))).toBe(layout.bumperX+ref.x*layout.scale);expect(Number(cursor.getAttribute('x2'))).toBe(layout.bumperX+ref.x*layout.scale);
      const points=percent===0?[['center',0]]:[['positive',1],['negative',-1]];expect(panel().querySelectorAll('[data-debris-motion-reference-point]')).toHaveLength(points.length);expect(panel().querySelectorAll('[data-debris-material-reference-point]')).toHaveLength(points.length);
      for(const [side,sign] of points){const disk=panel().querySelector('[data-debris-motion-reference-point="'+side+'"]'),path=panel().querySelector('[data-debris-material-reference-point="'+side+'"]');expect(Number(disk.dataset.radius)).toBe(sign*ref.radius);expect(parseFloat(disk.style.left)).toBe(50);expect(parseFloat(disk.style.top)).toBeCloseTo((120-sign*ref.radius*scale)/240*100,11);expect(Number(path.dataset.x)).toBe(ref.x);expect(Number(path.dataset.radius)).toBe(sign*ref.radius);expect(parseFloat(path.style.left)).toBeCloseTo((layout.bumperX+ref.x*layout.scale)/300*100,11);expect(parseFloat(path.style.top)).toBeCloseTo((layout.cy-sign*ref.radius*layout.scale)/240*100,11);}
    }
    view.click('[data-debris-aperture-event="start"]');const clear=panel().querySelector('[data-debris-motion-mark="clear"]');expect(clear.disabled).toBe(false);clear.focus();view.click('[data-debris-motion-mark="clear"]');expect(document.activeElement).toBe(view.host.querySelector('#iss-debris-motion-radius'));expect(view.host.querySelector('[data-debris-motion-mark="save"]').disabled).toBe(true);
  });

  it('returns from a first-contact reference to the marked shared-clock instant and pauses without replacing the mark',()=>{
    const m=model({}),marked=m.impactUs+m.flightUs/2,mark=motionMark(m,marked),view=mountDebris({opsDebrisApertureStudy:true,opsDebrisFlightPanel:'motion',opsDebrisMotionDiagram:'path',opsDebrisMotionRadius:37,opsDebrisMotionMark:mark});
    view.click('[data-iss-playback-toggle="debris"]');advance(.1);const token=!!view.data.opsDebrisSeekToken;expect(view.data.opsDebrisApertureView).not.toBe('clock');const back=view.host.querySelector('[data-debris-motion-mark="return"]');back.focus();view.click('[data-debris-motion-mark="return"]');expect(view.data.opsDebrisApertureView).toBe('clock');expect(view.time).toBe(marked);expect(view.playing).toBe(false);expect(!!view.data.opsDebrisSeekToken).toBe(!token);expect(view.data.opsDebrisMotionMark).toEqual(mark);expect(view.data.opsDebrisMotionRadius).toBe(37);expect(document.activeElement).toBe(back);
    for(const key of ['time','forward','outward','separation'])expect(Number(view.host.querySelector('[data-debris-motion-delta="'+key+'"]').dataset.value)).toBe(0);expect(Number(view.host.querySelector('#iss-debris-time').value)).toBeCloseTo(marked,12);expect(Number(view.host.querySelector('#iss-debris-aperture-time').value)).toBeCloseTo(marked,12);expect(view.host.querySelectorAll('[data-iss-playback-toggle="debris"]')).toHaveLength(1);
    view.click('[data-debris-aperture-view="contact"]');view.click('[data-iss-playback-toggle="debris"]');const time=view.time;view.click('[data-debris-motion-mark="save"]');expect(view.data.opsDebrisMotionMark).toEqual(motionMark(m,m.arrivalUs));expect(view.time).toBe(time);expect(view.playing).toBe(true);view.click('[data-debris-motion-mark="return"]');expect(view.time).toBe(m.arrivalUs);expect(view.playing).toBe(false);
  });

  it('hides stale or malformed material marks and keeps valid marks through inspection preferences',()=>{
    const m=model({}),mark=motionMark(m,m.impactUs+m.flightUs/2),view=mountDebris({opsDebrisApertureStudy:true,opsDebrisFlightPanel:'motion',opsDebrisMotionDiagram:'path',opsDebrisMotionMark:mark}),reference=()=>view.host.querySelector('[data-debris-motion-reference]');
    expect(reference()).not.toBeNull();view.click('[data-debris-motion-diagram="velocity"]');expect(reference()).not.toBeNull();view.click('[data-debris-flight-panel="balance"]');view.click('[data-debris-flight-panel="motion"]');expect(reference()).not.toBeNull();view.click('[data-debris-aperture-toggle]');view.click('[data-debris-aperture-toggle]');expect(reference()).not.toBeNull();expect(view.data.opsDebrisMotionMark).toEqual(mark);
    for(const invalid of [null,{},[],{...mark,version:2},{...mark,time:NaN},{...mark,time:String(mark.time)},{...mark,time:m.impactUs-1},{...mark,setup:{...mark.setup,gap:20}}]){view.patch({opsDebrisMotionMark:invalid});expect(reference()).toBeNull();expect(view.host.querySelector('[data-debris-motion-reference-cloud]')).toBeNull();expect(view.host.querySelector('[data-debris-material-reference-cursor]')).toBeNull();expect(view.host.querySelector('[data-debris-motion-mark="return"]').disabled).toBe(true);expect(view.host.querySelector('[data-debris-motion-mark="clear"]').disabled).toBe(true);}
    view.patch({opsDebrisMotionMark:mark});view.change('iss-debris-spread',0);expect(reference()).toBeNull();expect(view.host.querySelector('[data-debris-motion-mark="return"]').disabled).toBe(true);expect(view.host.querySelector('[data-debris-motion-mark="clear"]').disabled).toBe(true);
  });

  it('opens the equal-time guide as a persistent view preference without changing active playback or saved experiment state',()=>{
    const m=model({}),mark=motionMark(m,m.impactUs+m.flightUs/2),saved=snapshot(model({gap:2})),view=mountDebris({opsDebrisApertureStudy:true,opsDebrisApertureView:'clock',opsDebrisFlightPanel:'motion',opsDebrisMotionDiagram:'path',opsDebrisMotionRadius:37,opsDebrisMotionMark:mark,opsDebrisBaseline:saved,opsDebrisDetectorOffset:12,opsDebrisApertureOffset:17.123456789}),toggle=()=>view.host.querySelector('[data-debris-material-steps-toggle]'),guide=()=>view.host.querySelector('[data-debris-material-steps]');
    expect(toggle().tagName).toBe('BUTTON');expect(toggle().type).toBe('button');expect(toggle().getAttribute('aria-expanded')).toBe('false');expect(toggle().getAttribute('aria-controls')).toBe('iss-debris-material-steps');expect(guide().id).toBe('iss-debris-material-steps');expect(guide().hidden).toBe(true);expect(guide().querySelector('[data-debris-material-step]')).toBeNull();expect(view.host.querySelector('[data-debris-material-step-point]')).toBeNull();
    view.click('[data-debris-position-mark]');view.click('[data-debris-aperture-event="impact"]');view.click('[data-iss-playback-toggle="debris"]');advance(.1);const time=view.time,token=view.data.opsDebrisSeekToken,position=JSON.stringify(view.data.opsDebrisPositionA),paths=[...view.host.querySelectorAll('[data-debris-aperture-curve]')].map(n=>n.getAttribute('d'));
    toggle().focus();view.click('[data-debris-material-steps-toggle]');expect(toggle().getAttribute('aria-expanded')).toBe('true');expect(guide().hidden).toBe(false);expect(guide().querySelectorAll('[data-debris-material-step]')).toHaveLength(5);expect(document.activeElement).toBe(toggle());expect(view.data.opsDebrisMotionSteps).toBe(true);expect(view.time).toBe(time);expect(view.playing).toBe(true);
    view.click('[data-debris-motion-diagram="velocity"]');expect(toggle()).toBeNull();expect(view.host.querySelector('[data-debris-material-step-point]')).toBeNull();view.click('[data-debris-motion-diagram="path"]');expect(toggle().getAttribute('aria-expanded')).toBe('true');view.click('[data-debris-flight-panel="balance"]');view.click('[data-debris-flight-panel="motion"]');expect(guide().hidden).toBe(false);view.click('[data-debris-aperture-toggle]');view.click('[data-debris-aperture-toggle]');expect(guide().hidden).toBe(false);
    toggle().focus();view.click('[data-debris-material-steps-toggle]');expect(document.activeElement).toBe(toggle());expect(guide().hidden).toBe(true);expect(guide().querySelector('[data-debris-material-step]')).toBeNull();expect(view.host.querySelector('[data-debris-material-step-point]')).toBeNull();expect(view.time).toBe(time);expect(view.playing).toBe(true);expect(view.data.opsDebrisSeekToken).toBe(token);expect(view.data.opsDebrisMotionRadius).toBe(37);expect(view.data.opsDebrisMotionMark).toEqual(mark);expect(view.data.opsDebrisDetectorOffset).toBe(12);expect(view.data.opsDebrisApertureOffset).toBe(17.123456789);expect(JSON.stringify(view.data.opsDebrisPositionA)).toBe(position);expect(view.data.opsDebrisBaseline).toEqual(saved);expect([...view.host.querySelectorAll('[data-debris-aperture-curve]')].map(n=>n.getAttribute('d'))).toEqual(paths);
    for(const invalid of [undefined,null,false,1,'true','invalid']){view.patch({opsDebrisMotionSteps:invalid});expect(toggle().getAttribute('aria-expanded')).toBe('false');expect(guide().hidden).toBe(true);expect(view.host.querySelector('[data-debris-material-step-point]')).toBeNull();}
  });

  it('seeks each equal-time guide button into the shared clock and pauses while preserving the marked instant and sample coordinate',()=>{
    const m=model({}),mark=motionMark(m,m.impactUs+m.flightUs/2),view=mountDebris({opsDebrisApertureStudy:true,opsDebrisFlightPanel:'motion',opsDebrisMotionDiagram:'path',opsDebrisMotionSteps:true,opsDebrisMotionRadius:37,opsDebrisMotionMark:mark}),steps=motionSteps(m,0,37);
    expect(Number(view.host.querySelector('[data-debris-material-step-interval]').dataset.value)).toBe(steps.intervalUs);
    for(const point of steps.points){
      if(view.time===m.arrivalUs)view.click('[data-debris-event="start"]');view.click('[data-debris-aperture-view="contact"]');view.click('[data-iss-playback-toggle="debris"]');expect(view.playing).toBe(true);const token=!!view.data.opsDebrisSeekToken,button=view.host.querySelector('[data-debris-material-step="'+point.index+'"]');expect(button.tagName).toBe('BUTTON');expect(button.type).toBe('button');expect(button.disabled).toBe(false);expect(Number(button.dataset.time)).toBe(point.time);button.focus();view.click('[data-debris-material-step="'+point.index+'"]');expect(view.data.opsDebrisApertureView).toBe('clock');expect(view.time).toBe(point.time);expect(view.playing).toBe(false);expect(!!view.data.opsDebrisSeekToken).toBe(!token);expect(document.activeElement).toBe(button);expect(button.getAttribute('aria-pressed')).toBe('true');
      for(const other of steps.points.filter(p=>p.index!==point.index))expect(view.host.querySelector('[data-debris-material-step="'+other.index+'"]').getAttribute('aria-pressed')).toBe('false');expect(Number(view.host.querySelector('#iss-debris-time').value)).toBeCloseTo(point.time,12);expect(Number(view.host.querySelector('#iss-debris-aperture-time').value)).toBeCloseTo(point.time,12);expect(view.data.opsDebrisMotionRadius).toBe(37);expect(view.data.opsDebrisMotionMark).toEqual(mark);
    }
    expect(view.host.querySelectorAll('[data-iss-playback-toggle="debris"]')).toHaveLength(1);view.click('[data-debris-aperture-event="start"]');for(const button of view.host.querySelectorAll('[data-debris-material-step]'))expect(button.getAttribute('aria-pressed')).toBe('false');
  });

  it('plots equal-time markers on the material paths before arrival and updates reached states without moving predictions',()=>{
    const m=model({}),view=mountDebris({opsDebrisApertureStudy:true,opsDebrisApertureView:'clock',opsDebrisFlightPanel:'motion',opsDebrisMotionDiagram:'path',opsDebrisMotionSteps:true}),chart=()=>view.host.querySelector('[data-debris-motion-path]');
    for(const percent of [37,0,100])for(const [event,time] of [['start',0],['impact',m.impactUs],['cloud',m.impactUs+m.flightUs/2],['wall',m.arrivalUs]]){
      view.change('iss-debris-motion-radius',percent);view.click('[data-debris-aperture-event="'+event+'"]');const steps=motionSteps(m,time,percent),layout=materialPath(m,time,percent),sides=percent===0?[['center',0]]:[['positive',1],['negative',-1]];expect(chart().querySelectorAll('[data-debris-material-step-point]')).toHaveLength(5*sides.length);
      for(const point of steps.points)for(const [side,sign] of sides){const marker=chart().querySelector('[data-debris-material-step-point="'+point.index+'"][data-side="'+side+'"]');expect(marker).not.toBeNull();expect(Number(marker.dataset.time)).toBe(point.time);expect(Number(marker.dataset.x)).toBe(point.x);expect(Number(marker.dataset.radius)).toBe(sign*point.radius);expect(marker.dataset.reached).toBe(String(point.reached));expect(parseFloat(marker.style.left)).toBeCloseTo((layout.bumperX+point.x*layout.scale)/300*100,11);expect(parseFloat(marker.style.top)).toBeCloseTo((layout.cy-sign*point.radius*layout.scale)/240*100,11);}
      for(const point of steps.points)expect(view.host.querySelector('[data-debris-material-step="'+point.index+'"]').getAttribute('aria-pressed')).toBe(String(point.selected));
    }
    view.change('iss-debris-spread',0);view.change('iss-debris-motion-radius',37);view.click('[data-debris-aperture-event="impact"]');const original=[...chart().querySelectorAll('[data-debris-material-step-point]')].map(n=>({time:n.dataset.time,x:n.dataset.x,radius:n.dataset.radius,left:n.style.left,top:n.style.top}));view.click('[data-iss-playback-toggle="debris"]');advance(.1);expect(view.playing).toBe(true);expect([...chart().querySelectorAll('[data-debris-material-step-point]')].map(n=>({time:n.dataset.time,x:n.dataset.x,radius:n.dataset.radius,left:n.style.left,top:n.style.top}))).toEqual(original);for(const marker of chart().querySelectorAll('[data-debris-material-step-point]'))expect(marker.dataset.reached).toBe(String(view.time>=Number(marker.dataset.time)));
    for(const side of ['positive','negative'])expect(new Set([...chart().querySelectorAll('[data-side="'+side+'"][data-debris-material-step-point]')].map(n=>n.style.top)).size).toBe(1);
  });

  it('draws signed material-displacement legs from the marked point to the current sample with an unsigned resultant',()=>{
    let m=model({}),mark=motionMark(m,m.impactUs+m.flightUs/2);const view=mountDebris({opsDebrisApertureStudy:true,opsDebrisApertureView:'clock',opsDebrisFlightPanel:'motion',opsDebrisMotionDiagram:'path',opsDebrisMotionSteps:true,opsDebrisMotionMark:mark}),chart=()=>view.host.querySelector('[data-debris-motion-path]'),coords=node=>(node.getAttribute('d').match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi)||[]).slice(0,4).map(Number);
    function check(percent,time){
      const ref=motionReference(m,time,percent,mark),p=materialPath(m,time,percent),arrows=chart().querySelectorAll('[data-debris-displacement]'),reading=view.host.querySelector('[data-debris-motion-delta="separation"]');
      expect(ref.separation===null?reading.dataset.value:Number(reading.dataset.value)).toBe(ref.separation===null?'pending':ref.separation);expect(reading.textContent).not.toMatch(/^[+−-]/);
      if(!ref.active||ref.separation===0){expect(arrows).toHaveLength(0);return;}
      const ax=p.bumperX+ref.x*p.scale,ay=p.cy-ref.radius*p.scale,bx=p.bumperX+p.sampleX*p.scale,by=p.cy-p.sampleRadius*p.scale;
      for(const [component,value,expected] of [['forward',ref.forward,[ax,ay,bx,ay]],['outward',ref.outward,[bx,ay,bx,by]],['resultant',ref.separation,[ax,ay,bx,by]]]){
        const arrow=chart().querySelector('[data-debris-displacement="'+component+'"]');if(value===0){expect(arrow).toBeNull();continue;}expect(arrow).not.toBeNull();expect(Number(arrow.dataset.value)).toBe(value);expect(coords(arrow)).toEqual(expected);
      }
      const resultant=chart().querySelector('[data-debris-displacement="resultant"]');expect(resultant.getAttribute('stroke-dasharray')).toBeTruthy();expect(Number(resultant.getAttribute('stroke-width'))).toBe(2.5);if(ref.outward===0)expect(Number(chart().querySelector('[data-debris-displacement="forward"]').getAttribute('stroke-width'))).toBe(5);
    }
    for(const percent of [37,0,100])for(const [event,time] of [['impact',m.impactUs],['cloud',mark.time],['wall',m.arrivalUs],['start',0]]){view.change('iss-debris-motion-radius',percent);view.click('[data-debris-aperture-event="'+event+'"]');check(percent,time);expect(view.data.opsDebrisMotionMark).toEqual(mark);expect(view.data.opsDebrisMotionSteps).toBe(true);}
    view.change('iss-debris-spread',0);m=model({spread:0});mark=motionMark(m,m.impactUs+m.flightUs/2);view.patch({opsDebrisMotionMark:mark});view.change('iss-debris-motion-radius',100);for(const [event,time] of [['impact',m.impactUs],['wall',m.arrivalUs]]){view.click('[data-debris-aperture-event="'+event+'"]');check(100,time);expect(chart().querySelector('[data-debris-displacement="outward"]')).toBeNull();}
    view.click('[data-debris-motion-diagram="velocity"]');expect(view.host.querySelector('[data-debris-displacement]')).toBeNull();view.click('[data-debris-motion-diagram="path"]');check(100,m.arrivalUs);view.patch({opsDebrisMotionMark:{...mark,version:2}});expect(chart().querySelector('[data-debris-displacement]')).toBeNull();view.patch({opsDebrisMotionMark:mark});expect(chart().querySelector('[data-debris-displacement="resultant"]')).not.toBeNull();view.click('[data-debris-motion-mark="clear"]');expect(chart().querySelector('[data-debris-displacement]')).toBeNull();expect(view.host.querySelector('[data-debris-motion-delta="separation"]')).toBeNull();expect(view.data.opsDebrisMotionSteps).toBe(true);expect(view.data.opsDebrisMotionRadius).toBe(100);
  });

  it('loads valid saved references and handles damaged saved data without false reference labels',()=>{
    const saved=snapshot(model({diameter:3,gap:18,material:'glass'})),view=mountDebris({opsDebrisBaseline:saved});
    expect(view.host.querySelector('[data-debris-reference-status]').textContent).toContain('glass · 3.0 mm');
    view.patch({opsDebrisBaseline:{...saved,gap:NaN}});expect(view.host.querySelector('[data-debris-reference-kind]').getAttribute('data-debris-reference-kind')).toBe('compact');
    expect(view.host.querySelector('[data-debris-reference-reset]').disabled).toBe(true);
  });
});
