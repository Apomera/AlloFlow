import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let P, p;
beforeAll(() => { resetStemLab(); loadTool(process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js', 'moonMission'); P=window.MoonMissionPure; p=P.lunarEnvironmentProfile({},45); });
const norm = s => Math.hypot(s.x,s.y);
// Independent Cartesian RK4 coast, with 0.5 s steps, for a quarter revolution.
function coast(initial,duration,mu) {
  let y=[initial.x,initial.y,initial.vx,initial.vy];
  const f=s=>{const r=Math.hypot(s[0],s[1]);return [s[2],s[3],-mu*s[0]/r**3,-mu*s[1]/r**3];};
  for(let t=0;t<duration;) {const dt=Math.min(.5,duration-t),a=f(y),b=f(y.map((v,i)=>v+a[i]*dt/2)),c=f(y.map((v,i)=>v+b[i]*dt/2)),d=f(y.map((v,i)=>v+c[i]*dt));y=y.map((v,i)=>v+dt*(a[i]+2*b[i]+2*c[i]+d[i])/6);t+=dt;}return y;
}
// Uniform solar-disc ray count using an independent 3D cone-sphere intersection.
function raySunFraction(s,C,R,angle) {
  const theta=angle*Math.PI/180,dx=C.sunDistance*Math.cos(theta)-s.x,dy=C.sunDistance*Math.sin(theta)-s.y,d=Math.hypot(dx,dy),ux=dx/d,uy=dy/d;
  const alpha=Math.asin(C.sunRadius/d),N=240;let clear=0,total=0;
  for(let i=0;i<N;i++)for(let j=0;j<N;j++){const a=2*(i+.5)/N-1,b=2*(j+.5)/N-1;if(a*a+b*b>1)continue;
    const bx=ux-uy*a*Math.tan(alpha),by=uy+ux*a*Math.tan(alpha),bz=b*Math.tan(alpha),mag=Math.hypot(bx,by,bz);
    const dot=(s.x*bx+s.y*by)/mag,disc=dot*dot-(s.x*s.x+s.y*s.y-R*R);total++;if(dot>=0||disc<0)clear++;
  }return clear/total;
}
describe('achieved lunar orbit and environment physics',()=>{
  it('begins at the actual integrated LOI endpoint and closes exactly one orbit',()=>{
    const end=P.loiProfile().samples.at(-1),a=P.lunarEnvironmentSample(p,0),b=P.lunarEnvironmentSample(p,p.orbit.period);
    for(const key of ['x','y','vx','vy','mass','propellant']){expect(a[key]).toBeCloseTo(end[key],6);expect(b[key]).toBeCloseTo(a[key],6);}
    expect(a.engineOn).toBe(false);expect(a.thrust).toBe(0);expect(p.summary.duration).toBeCloseTo(P.loiProfile().summary.period,8);
  });
  it('agrees with an independent Cartesian integration',()=>{
    const a=P.lunarEnvironmentSample(p,0),t=p.orbit.period/4,y=coast(a,t,P.loi.mu),b=P.lunarEnvironmentSample(p,t);
    [b.x,b.y,b.vx,b.vy].forEach((v,i)=>expect(v).toBeCloseTo(y[i],4));
  });
  it('conserves specific energy, angular momentum, mass and fuel over the whole coast',()=>{
    for(let t=0;t<=p.orbit.period;t+=p.orbit.period/31){const s=P.lunarEnvironmentSample(p,t);expect((s.vx*s.vx+s.vy*s.vy)/2-P.loi.mu/norm(s)).toBeCloseTo(p.orbit.energy,6);expect(s.x*s.vy-s.y*s.vx).toBeCloseTo(p.orbit.angularMomentum,4);expect(s.mass).toBe(p.orbit.mass);expect(s.propellant).toBe(p.orbit.propellant);}
  });
  it('computes velocity as the derivative of the elliptical position',()=>{
    for(const t of [100,1000,5000]){const a=P.lunarEnvironmentSample(p,t-.01),b=P.lunarEnvironmentSample(p,t+.01),s=P.lunarEnvironmentSample(p,t);expect((b.x-a.x)/.02).toBeCloseTo(s.vx,4);expect((b.y-a.y)/.02).toBeCloseTo(s.vy,4);}
  });
  it('uses achieved plan-dependent orbits and rejects flyby and hazardous plans',()=>{
    expect(P.lunarEnvironmentProfile({burnDuration:0},45)).toBeNull();expect(P.lunarEnvironmentProfile({burnDuration:600},45)).toBeNull();
    const q=P.lunarEnvironmentProfile({burnDuration:355},45);expect(q).not.toBeNull();expect(q.orbit.period).not.toBe(p.orbit.period);
    expect(q.summary.perilune).toBeCloseTo(P.loiProfile({burnDuration:355}).summary.perilune,6);
  });
  it('uses the nearest Earth surface for light time and blocks signals at the physical Moon limb',()=>{
    const R=P.loi.radius,C=P.lunarEnvironment,a=P.lunarEarthLink({x:-R-100000,y:0}),b=P.lunarEarthLink({x:R+100000,y:0});
    expect(a.visible).toBe(true);expect(a.range).toBe(C.earthDistance-R-100000-C.earthRadius);expect(a.oneWayDelay).toBe(a.range/299792458);expect(a.roundTripDelay).toBe(a.oneWayDelay*2);
    expect(b.visible).toBe(false);expect(b.oneWayDelay).toBeNull();expect(b.roundTripDelay).toBeNull();expect(norm(b.hit)).toBeCloseTo(R,5);expect(b.hit.x).toBeCloseTo(R,5);
  });
  it('handles finite-distance limb geometry and misses beyond the segment endpoint',()=>{
    const R=P.loi.radius;expect(P.segmentMoon(2*R,1.005*R,-1e9,1.01*R).blocked).toBe(false);
    expect(P.segmentMoon(2*R,1.005*R,-384400000,0).blocked).toBe(true);
    expect(P.segmentMoon(2*R,0,3*R,0).blocked).toBe(false);
    expect(P.segmentMoon(2*R,0,-3*R,0).hit.x).toBeCloseTo(R,6);
  });
  it('rejects invalid geometry and invalid clocks without producing NaNs',()=>{
    for(const s of [null,{x:NaN,y:0},{x:Infinity,y:0},{x:0,y:0}]){expect(P.lunarEarthLink(s)).toBeNull();expect(P.lunarSunlight(s,45)).toBeNull();}
    expect(P.segmentMoon(0,0,0,0)).toBeNull();expect(P.lunarEnvironmentSample(null,0)).toBeNull();
    expect(P.lunarEnvironmentSample(p,Infinity).time).toBe(0);expect(P.lunarEnvironmentSample(p,-1).time).toBe(0);expect(P.lunarEnvironmentSample(p,1e8).time).toBe(p.orbit.period);
  });
  it('distinguishes far-side radio loss from darkness and moves only Sun geometry with its preset',()=>{
    const q=P.lunarEnvironmentProfile({},135),a=P.lunarEnvironmentSample(p,0),b=P.lunarEnvironmentSample(q,0);
    expect(a.earth.visible).toBe(false);expect(a.sun.fraction).toBe(1);expect(b.sun.fraction).toBe(0);expect(b.earth).toEqual(a.earth);
    expect(q.summary.radioBlockedSeconds).toBe(p.summary.radioBlockedSeconds);expect(q.orbit).toEqual(p.orbit);
  });
  it.each([45,90,135])('finds radio and four solar contacts within the one-orbit interval at %s degrees',angle=>{
    const q=P.lunarEnvironmentProfile({},angle);expect(q.events).toHaveLength(6);
    for(const e of q.events){const a=P.lunarEnvironmentSample(q,e.time-.05),b=P.lunarEnvironmentSample(q,e.time+.05),margin=s=>e.kind==='radio'?s.earth.clearance:e.kind==='partial'?s.sun.partialMargin:s.sun.totalMargin;
      expect(margin(a)>0).not.toBe(margin(b)>0);expect(margin(b)<=0).toBe(e.entering);
    }
    const sum=q.summary;expect(sum.sunlitSeconds+sum.partialEclipseSeconds+sum.totalEclipseSeconds).toBeCloseTo(sum.duration,7);
    expect(sum.sunlitEquivalentSeconds).toBeGreaterThan(sum.sunlitSeconds);expect(sum.sunlitEquivalentSeconds).toBeLessThan(sum.sunlitSeconds+sum.partialEclipseSeconds);
    expect(sum.minimumLightTime).toBeGreaterThan(1.25);expect(sum.maximumLightTime).toBeLessThan(1.28);
  });
  it('agrees with independent solar-disc ray tracing during partial eclipse',()=>{
    const begin=p.events.find(e=>e.kind==='partial'&&e.entering).time,end=p.events.find(e=>e.kind==='total'&&e.entering).time;
    for(const f of [.15,.5,.85]){const s=P.lunarEnvironmentSample(p,begin+(end-begin)*f);expect(s.sun.phase).toBe('partial');expect(s.sun.fraction).toBeGreaterThan(0);expect(s.sun.fraction).toBeLessThan(1);expect(Math.abs(s.sun.fraction-raySunFraction(s,P.lunarEnvironment,P.loi.radius,45))).toBeLessThan(.004);}
  });
  it('has deterministic cached immutable profiles and detached sampled records',()=>{
    expect(P.lunarEnvironmentProfile({},45)).toBe(p);expect(Object.isFrozen(p)).toBe(true);expect(Object.isFrozen(p.events)).toBe(true);expect(Object.isFrozen(p.summary)).toBe(true);
    const a=P.lunarEnvironmentSample(p,0);a.x=0;a.earth.range=0;expect(P.lunarEnvironmentSample(p,0).x).not.toBe(0);expect(P.lunarEnvironmentSample(p,0).earth.range).toBeGreaterThan(0);
  });
});
