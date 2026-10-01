import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let model;
const reference = { transitPlanetR: .920, transitStarR: .1192, transitImpact: .191, transitOrbit: 'trappist' };
beforeAll(() => { resetStemLab(); loadTool('stem_lab/stem_tool_astronomy.js', 'astronomy'); model = window.__alloAstroPure.transitModel; });
const doc = state => new window.DOMParser().parseFromString(renderTool('astronomy', { astronomy: { tab: 'exoplanets', ...state } }), 'text/html');

// Independent Cartesian integral: exact vertical integral of the brightness,
// followed by fine integration in x. The production model integrates annuli.
function referenceFlux(k, d, u) {
  const left = Math.max(-1, d - k), right = Math.min(1, d + k);
  if (left >= right) return 0;
  const cuts = [left, right], intersection = d ? (1 + d * d - k * k) / (2 * d) : NaN;
  if (intersection > left && intersection < right) cuts.push(intersection);
  cuts.sort((a,b) => a-b);
  let total = 0;
  for (let segment = 1; segment < cuts.length; segment++) {
    const lo = cuts[segment-1], span = cuts[segment]-lo, n = 2048, step = Math.PI/(2*n);
    let sum = 0;
    for (let i = 1; i < n; i++) {
      const q = i * step, x = lo + span*Math.sin(q)**2, a = Math.max(0,1-x*x);
      const y = Math.sqrt(Math.max(0, Math.min(a,k*k-(x-d)**2)));
      const muIntegral = a > 0 ? y*Math.sqrt(Math.max(0,a-y*y)) + a*Math.asin(Math.min(1,y/Math.sqrt(a))) : 0;
      sum += (i%2 ? 4:2)*(2*(1-u)*y+u*muIntegral)*span*Math.sin(2*q);
    }
    total += sum*step/3;
  }
  return total / (Math.PI*(1-u/3));
}

describe('Transit surface brightness and flux', () => {
  it.each([undefined,null,false,true,'',{},[],NaN,Infinity].map(v=>[v]))('restores an invalid limb coefficient (%s)', value => {
    expect(model({transitLimb:value}).limb).toBe(0);
  });
  it('bounds finite coefficients while preserving numeric strings', () => {
    expect(model({transitLimb:-2}).limb).toBe(0);
    expect(model({transitLimb:3}).limb).toBe(1);
    expect(model({transitLimb:'0.6'}).limb).toBe(.6);
  });
  it('normalizes a central dim-edge transit against its analytic brightness integral', () => {
    const m=model({transitPlanetR:11.2,transitLimb:.6}), k=m.ratio, u=m.limb;
    const mu=2/3*(1-(1-k*k)**1.5);
    expect(m.depth).toBeCloseTo(((1-u)*k*k+u*mu)/(1-u/3),12);
    expect(m.depth).toBeGreaterThan(m.uniformDepth);
    expect(m.intensityAt(0)).toBe(1);expect(m.intensityAt(1)).toBeCloseTo(.4,12);
    expect(m.intensityAt(.8)).toBeCloseTo(.76,12);
  });
  it.each([
    [.3,3,0,.6],[1,1,.4,.6],[11.2,1,0,1],[11.2,1,.93,.6],
    [11.2,1,1,.6],[12,.1,.4,1],[12,.1,1.2,.6],[.92,.1192,.191,.6]
  ])('agrees with an independent flux integral for planet %s, star %s, path %s, u %s', (p,s,b,u) => {
    const m=model({transitPlanetR:p,transitStarR:s,transitImpact:b,transitLimb:u});
    for (const time of [.25,.4,.5]) {
      const f=m.at(time), expected=referenceFlux(m.ratio,Math.hypot(f.x,f.y),u);
      expect(Math.abs(f.blocked-expected)).toBeLessThan(2e-8);
    }
  });
  it('dims the grazing crossing compared with a uniformly bright limb', () => {
    const m=model({transitPlanetR:11.2,transitImpact:1,transitLimb:.6});
    expect(m.depth).toBeGreaterThan(0);expect(m.depth).toBeLessThan(m.uniformDepth);
    expect(m.contacts.second).toBeNull();
  });
  it('stays symmetric, continuous, bounded and monotone through supported extremes', () => {
    for(const p of [.3,12])for(const s of [.1,3])for(const b of [0,.8,1,1.2])for(const u of [.6,1]){
      const m=model({transitPlanetR:p,transitStarR:s,transitImpact:b,transitLimb:u});
      let previous=0;
      for(let i=0;i<=100;i++){
        const t=i/200,f=m.at(t);expect(Number.isFinite(f.blocked)).toBe(true);
        expect(f.blocked).toBeGreaterThanOrEqual(0);expect(f.blocked).toBeLessThanOrEqual(1);
        expect(f.blocked+2e-8).toBeGreaterThanOrEqual(previous);
        expect(f.blocked).toBeCloseTo(m.at(1-t).blocked,10);previous=f.blocked;
      }
      if(m.contacts){
        expect(m.at(m.contacts.first-1e-7).blocked).toBe(0);
        expect(m.at(m.contacts.first+1e-7).blocked).toBeLessThan(1e-7);
      }
    }
  });
  it('retains flat missed paths and zero brightness during a complete occultation', () => {
    expect(model({transitPlanetR:11.2,transitImpact:1.2,transitLimb:1}).depth).toBe(0);
    expect(model({transitPlanetR:12,transitStarR:.1,transitLimb:1}).current.brightness).toBe(0);
  });
});

describe('Published TRAPPIST-1 e geometry and clock', () => {
  it('uses the orbital period and scaled radius to place contacts in minutes', () => {
    const m=model(reference),a=52.855,b=.191,p=6.101013,k=.920*6378.1/(.1192*695700);
    const duration=p*1440/Math.PI*Math.asin(Math.sqrt(((1+k)**2-b*b)/(a*a-b*b)));
    expect(m.reference.periodDays).toBe(p);expect(m.durationMinutes).toBeCloseTo(duration,12);
    expect(m.durationMinutes).toBeCloseTo(.9293*60,1);
    expect(m.at(.5).minutes).toBe(0);expect(m.at(0).minutes).toBeCloseTo(-m.at(1).minutes,12);
    for(const [key,r]of [['first',1+k],['second',1-k],['third',1-k],['fourth',1+k]]){
      const f=m.at(m.contacts[key]);expect(Math.hypot(f.x,f.y)).toBeCloseTo(r,12);
    }
  });
  it('projects a circular orbit rather than treating physical time as a straight chord', () => {
    const m=model({...reference,transitTime:.2}),f=m.current;
    const angle=2*Math.PI*f.minutes/(6.101013*1440);
    expect(f.x).toBeCloseTo(52.855*Math.sin(angle),12);
    expect(f.y).toBeCloseTo(.191*Math.cos(angle),12);
    expect(f.y).toBeLessThan(.191);
    expect(m.at(0).blocked).toBe(0);expect(m.at(1).blocked).toBe(0);
  });
  it.each([{transitPlanetR:1},{transitStarR:.12},{transitImpact:.2},{transitOrbit:{}},{transitOrbit:undefined}])('removes the measured clock when the published setup changes (%s)', patch => {
    const m=model({...reference,...patch});expect(m.reference).toBeNull();expect(m.durationMinutes).toBeNull();expect(m.current.minutes).toBeNull();
  });
  it('preserves physical contacts when the brightness model changes without mutating saved state', () => {
    const saved=Object.freeze({...reference,transitLimb:.6}),m=model(saved),uniform=model(reference);
    expect(m.contacts).toEqual(uniform.contacts);expect(m.durationMinutes).toBe(uniform.durationMinutes);
    expect(m.depth).toBeGreaterThan(uniform.depth);
  });
});

describe('Transit visual and accessible explanations', () => {
  it('uses the same brightness profile in the shaded star and comparison curve', () => {
    const d=doc({transitLimb:.6});
    expect(d.querySelector('#astronomy-transit-scene').getAttribute('data-limb-coefficient')).toBe('0.6');
    const stops=d.querySelectorAll('[data-transit-intensity]');expect(stops[0].getAttribute('data-transit-intensity')).toBe('1');
    expect(Number(stops[stops.length-1].getAttribute('data-transit-intensity'))).toBeCloseTo(.4,12);
    expect(d.querySelector('[data-transit-uniform]')).not.toBeNull();
    expect(d.querySelector('[data-transit-line]').getAttribute('points')).not.toBe(d.querySelector('[data-transit-uniform]').getAttribute('points'));
    expect(d.querySelector('#astronomy-transit-profile-note').textContent).toContain('40%');
    expect(d.body.textContent).toContain('chosen teaching value');
    expect(d.querySelector('#astr-transitLimb').getAttribute('type')).toBe('range');
  });
  it('hides comparison for a uniform star or an explicitly disabled overlay', () => {
    expect(doc({}).querySelector('[data-transit-uniform]')).toBeNull();
    expect(doc({transitLimb:.6,transitCompare:false}).querySelector('[data-transit-uniform]')).toBeNull();
  });
  it('keeps the comparison curve inside the same axis even for a dim grazing limb', () => {
    const d=doc({transitPlanetR:11.2,transitImpact:1,transitLimb:1});
    const points=d.querySelector('[data-transit-uniform]').getAttribute('points').split(' ').map(p=>Number(p.split(',')[1]));
    expect(Math.max(...points)).toBeLessThanOrEqual(234);
  });
  it('explains measured timing, provenance and physical assumptions together', () => {
    const d=doc({...reference,transitLimb:.6});
    expect(d.querySelector('#astronomy-transit-reference').textContent).toContain('55.76 ± 0.26');
    expect(d.querySelector('#astronomy-transit-reference').textContent).toContain('circular-orbit approximation');
    expect(d.querySelector('[data-transit-duration]')).not.toBeNull();
    expect(d.querySelector('#astronomy-transit-curve').textContent).toContain('Minutes from midpoint');
    expect(d.querySelector('#astronomy-transit-help').textContent).toContain('illustrative speed');
    expect(d.body.textContent).toContain('does not predict future transit dates');
    for(const summary of d.querySelectorAll('#astronomy-transit-lab summary')){expect(summary.style.minHeight).toBe('44px');expect(summary.classList.contains('astr-focus')).toBe(true);}
    expect(doc({...reference,transitImpact:.2}).querySelector('[data-transit-duration]')).toBeNull();
  });
});
