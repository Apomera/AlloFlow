import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadTool, resetStemLab, React } from './helpers/stem_widgets_smoke_harness.js';

const source=readFileSync('stem_lab/stem_tool_spacestation.js','utf8');
const numberFn=source.slice(source.indexOf('  function issFlightNumber('),source.indexOf('  function issTransferPlan('));
const modelFn=source.slice(source.indexOf('  function issDebrisModel('),source.indexOf('  var _issRefOrbit'));
const {model,inspect,snapshot,compare,probe,tracers,sweep,pair,detector,overlap,scan}=new Function(numberFn+modelFn+'\nreturn {model:issDebrisModel,inspect:issDebrisInspect,snapshot:issDebrisSnapshot,compare:issDebrisComparison,probe:issDebrisProbe,tracers:issDebrisTracers,sweep:issDebrisSweep,pair:issDebrisPair,detector:issDebrisDetector,overlap:issDebrisOverlap,scan:issDebrisScan};')();
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
        expect(p.reference).toBeNull();for(const v of Object.values(p.current))expect(Number.isFinite(v)).toBe(true);
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

let cleanups,frames,nextFrame,clock;
function advance(seconds){for(let i=0;i<=Math.round(seconds*50);i++){if(i)clock+=20;const callbacks=[...frames.values()];frames.clear();act(()=>callbacks.forEach(fn=>fn(clock)));}}
function mountDebris(seed={}){
  const cfg=window.StemLab._registry.spaceStation,host=document.createElement('div');document.body.appendChild(host);
  const root=createRoot(host);let data,setData;
  function Harness(){const [toolData,setToolData]=React.useState({spaceStation:{tab:'operations',opsMode:'debris',...seed}});data=toolData.spaceStation;setData=setToolData;return cfg.render({React,toolData,setToolData,update(){},updateMulti(){},addToast(){},announceToSR(){},awardXP(){},setStemLabTool(){},aiHintsEnabled:false,gradeLevel:'7th Grade',t:(key,fallback)=>fallback??key});}
  act(()=>root.render(React.createElement(Harness)));cleanups.push(()=>{act(()=>root.unmount());host.remove();});
  return {host,get time(){return data.opsDebrisTime||0;},get data(){return data;},get playing(){return host.querySelector('[data-iss-playback-toggle="debris"]').getAttribute('aria-pressed')==='true';},
    patch(patch){act(()=>setData(prev=>({...prev,spaceStation:{...prev.spaceStation,...patch}})));},
    click(selector){act(()=>host.querySelector(selector).click());},change(id,value){act(()=>Simulate.change(host.querySelector('#'+id),{target:{value:String(value)}}));},
    read(id){return host.querySelector('[data-debris-reading="'+id+'"] strong').textContent;}};
}

describe('space station interactive shield lab',()=>{
  beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_spacestation.js','spaceStation');cleanups=[];frames=new Map();nextFrame=0;clock=0;vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.stubGlobal('requestAnimationFrame',fn=>{const id=++nextFrame;frames.set(id,fn);return id;});vi.stubGlobal('cancelAnimationFrame',id=>frames.delete(id));vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);Object.defineProperty(document,'hidden',{configurable:true,value:false});});
  afterEach(()=>{cleanups.forEach(fn=>fn());vi.restoreAllMocks();vi.unstubAllGlobals();});

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

  it('loads valid saved references and handles damaged saved data without false reference labels',()=>{
    const saved=snapshot(model({diameter:3,gap:18,material:'glass'})),view=mountDebris({opsDebrisBaseline:saved});
    expect(view.host.querySelector('[data-debris-reference-status]').textContent).toContain('glass · 3.0 mm');
    view.patch({opsDebrisBaseline:{...saved,gap:NaN}});expect(view.host.querySelector('[data-debris-reference-kind]').getAttribute('data-debris-reference-kind')).toBe('compact');
    expect(view.host.querySelector('[data-debris-reference-reset]').disabled).toBe(true);
  });
});
