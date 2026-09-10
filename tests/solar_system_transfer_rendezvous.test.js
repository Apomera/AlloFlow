import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const source=readFileSync('stem_lab/stem_tool_solarsystem.js','utf8');
const solver=source.slice(source.indexOf('  function solveKepler('),source.indexOf('  /** Human-readable orbital phase'));
const model=source.slice(source.indexOf('  function hohmann('),source.indexOf('  /** Synodic period'));
const animation=source.slice(source.indexOf('  function advanceTransferFlight('),source.indexOf('  function TransferFlight('));
const { rendezvous, burns, advance }=new Function('var PI=Math.PI,TAU=2*PI,AU_KM=1.496e8,G_SI=6.674e-11,M_SUN=1.989e30;'+solver+model+animation+';return {rendezvous:transferRendezvous,burns:hohmann,advance:advanceTransferFlight};')();
describe('Sun-centered transfer rendezvous',()=>{
  const radii=[0.387,0.723,1,1.524,5.203,9.537,19.19,30.07];
  it('meets the moving target for every directed planet pair',()=>{
    for(const a of radii)for(const b of radii){
      const departure=rendezvous(a,b,0,0),arrival=rendezvous(a,b,1,0);
      expect(departure.ship.x).toBeCloseTo(a,7);
      expect(departure.ship.y).toBeCloseTo(0,7);
      expect(arrival.separation).toBeLessThan(1e-8);
      if(a!==b)expect(arrival.ship.x).toBeCloseTo(-b,7);
      expect(arrival.elapsedDays).toBeCloseTo(burns(a,b).transitYrs*365.25,7);
    }
  });
  it('computes Sun-frame impulses with the correct signs in both directions',()=>{
    for(const a of radii)for(const b of radii){
      const result=burns(a,b);
      if(a!==b){expect(Math.sign(result.signedDv1)).toBe(Math.sign(b-a));expect(Math.sign(result.signedDv2)).toBe(Math.sign(b-a));}
      expect(result.dvTotal).toBeCloseTo(Math.abs(result.signedDv1)+Math.abs(result.signedDv2),10);
    }
    const mars=burns(1,1.524);
    expect(mars.dv1).toBeCloseTo(2.945,2);expect(mars.dv2).toBeCloseTo(2.649,2);
    expect(mars.transitYrs*365.25).toBeCloseTo(258.9,0);
  });
  it('moves the target through its launch phase and exposes an angular miss',()=>{
    const launch=rendezvous(1,1.524,0,0);
    expect(launch.idealPhase*180/Math.PI).toBeCloseTo(44.36,1);
    for(const offset of [-90,-30,30,90]) {
      const miss=rendezvous(1,1.524,1,offset);
      expect(miss.separation).toBeCloseTo(2*1.524*Math.abs(Math.sin(offset*Math.PI/360)),8);
    }
  });
  it('advances along the ellipse by time, preserving orbital energy geometry',()=>{
    for(const [a,b] of [[1,1.524],[1.524,1],[0.387,30.07],[30.07,0.387]]){
      let previousRadius=a;
      for(let k=1;k<=100;k++){
        const ship=rendezvous(a,b,k/100,0).ship;
        expect(Number.isFinite(ship.x+ship.y+ship.r)).toBe(true);
        expect(Math.hypot(ship.x,ship.y)).toBeCloseTo(ship.r,7);
        expect(ship.y).toBeGreaterThanOrEqual(-1e-7);
        expect((ship.r-previousRadius)*Math.sign(b-a)).toBeGreaterThanOrEqual(-1e-7);
        previousRadius=ship.r;
      }
    }
    const start=rendezvous(1,1.524,0,0).ship,p1=rendezvous(1,1.524,0.1,0).ship;
    const p9=rendezvous(1,1.524,0.9,0).ship,end=rendezvous(1,1.524,1,0).ship;
    expect(Math.hypot(p1.x-start.x,p1.y-start.y)).toBeGreaterThan(Math.hypot(end.x-p9.x,end.y-p9.y));
  });
  it('holds the craft and origin fixed across synchronized alignment experiments',()=>{
    for(const [a,b] of [[1,1.524],[1.524,1],[0.387,5.203]])for(const progress of [0,0.1,0.5,0.9,1])for(const offset of [-30,0,30]){
      const reference=rendezvous(a,b,progress,0),trial=rendezvous(a,b,progress,offset);
      expect(trial.ship).toEqual(reference.ship);expect(trial.origin).toEqual(reference.origin);expect(trial.elapsedDays).toBe(reference.elapsedDays);
      expect(Math.hypot(trial.destination.x-reference.destination.x,trial.destination.y-reference.destination.y)).toBeCloseTo(2*b*Math.abs(Math.sin(offset*Math.PI/360)),8);
    }
  });
  it('treats the same planet as no transfer',()=>{
    const result=rendezvous(1,1,0.5,30);
    expect(result.same).toBe(true);expect(result.transitDays).toBe(0);expect(result.separation).toBe(0);
    expect(burns(1,1).transitYrs).toBe(0);expect(burns(1,1).dvTotal).toBe(0);
  });
  it('plays at the same rate across frame rates and ignores suspended time',()=>{
    for(const hz of [20,30,60,120]){let progress=0;for(let i=0;i<hz*6;i++)progress=advance(progress,1000/hz);expect(progress).toBeCloseTo(0.5,8);}
    expect(advance(0.4,9000)).toBe(0.4);expect(advance(0.4,-5)).toBe(0.4);expect(advance(0.999,100)).toBe(1);
  });
});
