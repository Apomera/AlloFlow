import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_fisherlab.js', 'fisherLab'); });
describe('Fisher Lab sea handling', () => {
  it('keeps presets detached and defaults unknown or legacy seas to calm', () => {
    const get = window.__FisherLabCore.getCoreSeaState;
    expect(get('unknown')).toEqual(get('calm'));
    expect(get('__proto__').windKnots).toBe(0);
    get('breeze').windKnots = 999;
    expect(get('breeze').windKnots).toBe(8);
    expect(get('chop').resistance).toBeGreaterThan(get('breeze').resistance);
  });
  it('separates heading from travel direction and drifts an unpowered boat downwind', () => {
    const motion = window.__FisherLabCore.getCoreSeaMotion;
    expect(motion({ heading: Math.PI, speed: 0, seaState: 'calm' })).toMatchObject({groundSpeed:0,course:null});
    const drift = motion({ heading: Math.PI, speed: 0, seaState: 'breeze' });
    expect(drift.groundX).toBeCloseTo(0.24);
    expect(drift.course).toBe(90);
    const north = motion({ heading: Math.PI, speed: 4, seaState: 'chop' });
    expect(north.groundX).toBeCloseTo(0.48);
    expect(north.groundZ).toBeCloseTo(-4);
    expect(north.course).toBeGreaterThan(0);
    expect(north.course).toBeLessThan(10);
    expect(motion({ heading: Math.PI, speed: -4, seaState: 'calm' }).course).toBeCloseTo(180);
    expect(motion({heading:Infinity,speed:NaN,seaState:'chop'}).groundSpeed).toBeCloseTo(0.48);
  });
  it('adds stronger resistance into oncoming waves, including reverse motion', () => {
    const motion = window.__FisherLabCore.getCoreSeaMotion;
    const west = motion({heading:Math.PI*1.5,speed:4,seaState:'chop'});
    const east = motion({heading:Math.PI*0.5,speed:4,seaState:'chop'});
    const reverseEast = motion({heading:Math.PI*0.5,speed:-4,seaState:'chop'});
    expect(west.resistance).toBeGreaterThan(east.resistance);
    expect(west.resistance).toBeCloseTo(reverseEast.resistance);
    expect(motion({heading:Math.PI,speed:4,seaState:'calm'}).resistance).toBe(0);
    // A constant wind velocity integrates identically at either cadence.
    const velocity = motion({seaState:'breeze',speed:0}).groundX;
    expect(Array.from({length:600},()=>velocity/60).reduce((a,b)=>a+b,0)).toBeCloseTo(velocity*10);
    expect(Array.from({length:200},()=>velocity/20).reduce((a,b)=>a+b,0)).toBeCloseTo(velocity*10);
  });
  it('uses consistent bounded wave heights and analytic surface slopes', () => {
    const sample = window.__FisherLabCore.sampleCoreSeaSurface;
    for(const id of ['calm','breeze','chop']) for(const [x,z,t] of [[0,0,0],[23,-47,2.5],[-90,120,43]]) {
      const wave=sample(x,z,t,id), epsilon=0.0001;
      expect(wave.slopeX).toBeCloseTo((sample(x+epsilon,z,t,id).height-sample(x-epsilon,z,t,id).height)/(epsilon*2),6);
      expect(wave.slopeZ).toBeCloseTo((sample(x,z+epsilon,t,id).height-sample(x,z-epsilon,t,id).height)/(epsilon*2),6);
      expect(Math.abs(wave.height)).toBeLessThanOrEqual(window.__FisherLabCore.getCoreSeaState(id).waveScale*0.245);
    }
    expect(sample(23,-47,2.5,'chop').height).toBeCloseTo(sample(23,-47,2.5,'breeze').height*2);
  });
  it('round-trips sea settings in recovery while old checkpoints remain calm', () => {
    const core=window.__FisherLabCore;
    const base={savedAt:1700000000000,region:'maine',mode:'guided',pose:{heading:Math.PI,x:0,z:5.5},environment:{weather:'foggy',timeOfDay:'day',seaState:'chop',cameraView:'chase'}};
    const checkpoint=core.createCoreVoyageCheckpoint(base);
    expect(checkpoint).not.toBeNull();
    expect(checkpoint.environment).toMatchObject({weather:'foggy',seaState:'chop'});
    expect(core.parseCoreVoyageRescue(core.serializeCoreVoyageRescue(checkpoint)).checkpoint.environment.seaState).toBe('chop');
    delete base.environment.seaState;
    expect(core.createCoreVoyageCheckpoint(base).environment.seaState).toBe('calm');
    base.environment.seaState='storm';
    expect(core.createCoreVoyageCheckpoint(base).environment.seaState).toBe('calm');
  });
});
