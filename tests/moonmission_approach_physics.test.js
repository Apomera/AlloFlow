import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let P;
beforeAll(() => { resetStemLab(); loadTool(process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js','moonMission'); P=window.MoonMissionPure; });
const state=(P,extra={})=>({time:0,radius:P.approachPhysics.radius+15000,theta:0,radialSpeed:0,tangentialSpeed:Math.sqrt(P.approachPhysics.mu/(P.approachPhysics.radius+15000)),mass:15200,throttle:0,...extra});
describe('powered lunar approach forces',()=>{
  it.each([600,720,900])('integrates the %s second plan to the measured 300 m boundary',duration=>{
    const p=P.approachProfile({duration}),s=p.samples.at(-1);
    expect(p.summary.outcome).toBe('handover'); expect(s.altitude).toBeCloseTo(300,6);
    expect(s.radialSpeed).toBeCloseTo(-9,2);expect(s.tangentialSpeed).toBeCloseTo(4,2);
    expect(p.summary.duration).toBeCloseTo(duration,1);expect(s.mass).toBeGreaterThan(P.approachPhysics.dryMass);
    expect(s.deltaV).toBeCloseTo(P.approachPhysics.exhaustVelocity*Math.log(15200/s.mass),10);
    expect(p.events.approach.tangentialSpeed).toBeLessThanOrEqual(200);expect(p.events.lowGate.altitude).toBeLessThanOrEqual(2000);
    for(const sample of p.samples){expect(sample.thrust).toBeLessThanOrEqual(46700);expect(sample.mass).toBeGreaterThanOrEqual(7000);expect(sample.altitude).toBeGreaterThanOrEqual(299.999999);}
  });
  it('longer flight spends fuel while the short plan reaches the thrust ceiling',()=>{
    const short=P.approachProfile({duration:600}),nominal=P.approachProfile(),long=P.approachProfile({duration:900});
    expect(short.summary.saturatedSeconds).toBeGreaterThan(100);expect(nominal.summary.saturatedSeconds).toBe(0);
    expect(short.summary.propellantUsed).toBeLessThan(nominal.summary.propellantUsed);expect(nominal.summary.propellantUsed).toBeLessThan(long.summary.propellantUsed);
    expect(nominal.summary.propellantUsed).toBeCloseTo(7225.85,1);expect(nominal.summary.downrange).toBeCloseTo(513668.5,0);
    expect(Math.max(...short.samples.map(s=>Math.abs(s.tangentialSpeed-P.approachReference(s.time,short.plan).tangentialSpeed)))).toBeGreaterThan(1);
  });
  it('conserves coast energy and angular momentum with an empty engine',()=>{
    const A=P.approachPhysics,st=state(P,{radialSpeed:-20,mass:A.dryMass,throttle:0});
    const energy=s=>(s.radialSpeed**2+s.tangentialSpeed**2)/2-A.mu/s.radius, momentum=s=>s.radius*s.tangentialSpeed;
    const e=energy(st),h=momentum(st);P.approachStep(st,{},100);
    expect(energy(st)/e).toBeCloseTo(1,11);expect(momentum(st)/h).toBeCloseTo(1,11);expect(st.mass).toBe(A.dryMass);
    expect(st.radialSpeed).toBeLessThan(-19);expect(st.tangentialSpeed).not.toBe(state(P).tangentialSpeed);
  });
  it('spends propellant according to measured force and torque changes angular momentum',()=>{
    const p=P.approachProfile(),s=P.approachSample(p,250),dt=0.01,st={time:s.time,radius:s.radius,theta:s.theta,radialSpeed:s.radialSpeed,tangentialSpeed:s.tangentialSpeed,mass:s.mass,throttle:s.throttle};
    P.approachStep(st,p.plan,dt);const A=P.approachPhysics,c=P.approachControl(st,p.plan),h0=s.radius*s.tangentialSpeed,h1=st.radius*st.tangentialSpeed;
    expect((s.mass-st.mass)/dt).toBeCloseTo(s.thrust/A.exhaustVelocity,2);
    expect((h1-h0)/dt).toBeCloseTo((s.radius*s.thrust/s.mass*Math.sin(s.pitch)+st.radius*st.throttle*46700/st.mass*Math.sin(c.pitch))/2,-1);
  });
  it('position derivatives match the physical radial and sideways velocities',()=>{
    const p=P.approachProfile();for(const t of [10.75,155.25,400.1,650.7]){
      const dt=0.005,a=P.approachSample(p,t-dt),s=P.approachSample(p,t),b=P.approachSample(p,t+dt);
      expect((b.x-a.x)/(2*dt)).toBeCloseTo(s.vx,2);expect((b.y-a.y)/(2*dt)).toBeCloseTo(s.vy,2);
      expect((b.altitude-a.altitude)/(2*dt)).toBeCloseTo(s.radialSpeed,2);
    }
  });
  it('does not award an impulse larger than a tiny remaining propellant supply',()=>{
    const A=P.approachPhysics,st=state(P,{mass:A.dryMass+0.00001,throttle:1,radialSpeed:0,tangentialSpeed:0,time:720});
    const allowed=A.exhaustVelocity*Math.log(st.mass/A.dryMass),g=A.mu/(st.radius*st.radius);P.approachStep(st,{},0.1);
    expect(st.mass).toBe(A.dryMass);expect(st.throttle).toBe(0);expect(st.radialSpeed+g*0.1).toBeLessThanOrEqual(allowed+1e-7);
  });
  it('ignores invalid clocks and integrates independently of rendering',()=>{
    const st=state(P),before={...st};for(const dt of [0,-1,NaN,Infinity])P.approachStep(st,{},dt);expect(st).toEqual(before);
    const a=state(P),b=state(P);for(let i=0;i<20;i++)P.approachStep(a,{},0.1);for(let i=0;i<40;i++)P.approachStep(b,{},0.05);
    for(const k of ['radius','radialSpeed','tangentialSpeed','mass'])expect(a[k]).toBeCloseTo(b[k],3);
  });
  it('returns immutable cached profiles and detached inspected samples',()=>{
    const p=P.approachProfile();expect(P.approachProfile()).toBe(p);expect(Object.isFrozen(p)).toBe(true);expect(Object.isFrozen(p.samples[0])).toBe(true);expect(Object.isFrozen(p.summary)).toBe(true);expect(Object.isFrozen(p.events)).toBe(true);
    const s=P.approachSample(p,100);s.mass=-1;expect(P.approachSample(p,100).mass).toBeGreaterThan(7000);
    for(const raw of [null,{}, {duration:NaN},{duration:Infinity},{duration:'600'},{duration:721}])expect(P.approachPlan(raw).duration).toBe(720);
  });
  it('agrees with an independent Cartesian midpoint integration',()=>{
    const p=P.approachProfile(),A=P.approachPhysics,dt=0.01,st={x:0,y:A.radius+15000,vx:p.samples[0].tangentialSpeed,vy:0,mass:15200,throttle:0};
    function derivative(s,t){const r=Math.hypot(s.x,s.y),theta=Math.atan2(s.x,s.y),vr=(s.x*s.vx+s.y*s.vy)/r,vt=(s.y*s.vx-s.x*s.vy)/r,c=P.approachControl({time:t,radius:r,radialSpeed:vr,tangentialSpeed:vt,mass:s.mass,throttle:s.throttle},p.plan),angle=theta+c.pitch,F=46700*s.throttle;return {x:s.vx,y:s.vy,vx:-A.mu*s.x/r**3+F*Math.sin(angle)/s.mass,vy:-A.mu*s.y/r**3+F*Math.cos(angle)/s.mass,mass:-F/A.exhaustVelocity,throttle:(c.throttle-s.throttle)/A.engineLag};}
    for(let i=0;i<72000;i++){const t=i*dt,k=derivative(st,t),mid={};for(const key in st)mid[key]=st[key]+k[key]*dt/2;const m=derivative(mid,t+dt/2);for(const key in st)st[key]+=m[key]*dt;}
    const end=P.approachSample(p,720);expect(Math.hypot(st.x-end.x,st.y-A.radius-end.y)).toBeLessThan(0.1);expect(st.mass).toBeCloseTo(end.mass,2);expect(Math.hypot(st.vx-end.vx,st.vy-end.vy)).toBeLessThan(0.001);
  });
});
