import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync('stem_lab/stem_tool_atctower.js', 'utf8');
const helpers = source.slice(source.indexOf('  var toRad ='), source.indexOf('  // ── AIRPORT CONFIGURATIONS ──'));
const configurations = source.slice(source.indexOf('  var AIRPORTS ='), source.indexOf('  // ── CALLSIGNS ──'));
const model = new Function(helpers + configurations + '\nreturn {advanceAircraft,atcFlightPath,atcTrackHistory,atcCanStepTraffic,AIRPORTS,AC_TYPES,serializeAtcShift,restoreAtcShift};')();
const runway = model.AIRPORTS[0].runways[0];
const flight = (extra = {}) => ({id:101,callsign:'TRACK101',type:model.AC_TYPES[1],x:300,y:200,heading:270,speed:120,altitude:5000,fuel:60,state:'inbound',assignedRunway:runway,targetHeading:null,targetSpeed:null,targetAltitude:null,...extra});
function simulate(ac, seconds, fps = 120) { for(let i=0;i<Math.round(seconds/120*fps);i++) model.advanceAircraft(ac,1/fps); return ac; }

describe('ATC flight paths follow actual guidance without changing live traffic', () => {
  it('projects a straight flight with knots, nautical miles, and flight seconds', () => {
    const ac=flight(),before=structuredClone(ac),path=model.atcFlightPath(ac,60);
    expect(path.end.x).toBeCloseTo(294,8); expect(path.end.y).toBeCloseTo(200,8);
    expect(path.distanceNm).toBeCloseTo(2,8); expect(path.end.fuel).toBeCloseTo(59,8);
    expect(path.points.map(p=>p.seconds)).toEqual(Array.from({length:13},(_,i)=>i*5));
    expect(ac).toEqual(before);
  });
  it('follows a progressive shortest turn rather than jumping to the instructed heading', () => {
    const path=model.atcFlightPath(flight({targetHeading:0}),60);
    expect(path.points.find(p=>p.seconds===10).heading).toBe(300);
    expect(path.points.find(p=>p.seconds===30).heading).toBe(0);
    expect(path.end.heading).toBe(0); expect(path.end.x).toBeLessThan(300); expect(path.end.y).toBeLessThan(200);
  });
  it('agrees with actual ten-second movement for vector, speed, and altitude instructions', () => {
    for(const extra of [{targetHeading:0},{targetSpeed:80},{targetAltitude:6000},{state:'approach',approachStage:'entry'},{state:'holding'},{state:'goAround',targetHeading:270,targetAltitude:6000}]) {
      const ac=flight(extra),path=model.atcFlightPath(ac,10),live=structuredClone(ac);
      model.advanceAircraft(live,10/120);
      for(const key of ['x','y','heading','speed','altitude','fuel']) expect(path.end[key],key).toBeCloseTo(live[key],8);
    }
  });
  it('captures speed and altitude targets progressively and retains them after capture', () => {
    const path=model.atcFlightPath(flight({targetSpeed:60,targetAltitude:6000}),60);
    expect(path.points.find(p=>p.seconds===10)).toMatchObject({speed:100,altitude:5200});
    expect(path.end).toMatchObject({speed:60,altitude:6000});
    expect(path.distanceNm).toBeGreaterThan(1.2); expect(path.distanceNm).toBeLessThan(1.3);
  });
  it('keeps a hold center and runway unchanged while projecting automatic turns', () => {
    const center={x:300,y:224},ac=flight({state:'holding',heading:90,holdCenter:center}),before=structuredClone(ac);
    const path=model.atcFlightPath(ac,120);
    expect(new Set(path.points.map(p=>Math.round(p.heading))).size).toBeGreaterThan(5);
    expect(ac).toEqual(before); expect(ac.holdCenter).toBe(center); expect(ac.assignedRunway).toBe(runway);
  });
  it('previews a heading draft by ending approach guidance and maintaining the current altitude', () => {
    const ac=flight({state:'approach',approachStage:'final',altitude:2000,targetAltitude:0}),before=structuredClone(ac);
    const path=model.atcFlightPath(ac,60,{kind:'heading',value:'000'});
    expect(path.end.heading).toBe(0); expect(path.end.altitude).toBe(2000); expect(ac).toEqual(before);
  });
  it('previews a heading draft releasing a hold without changing the existing hold', () => {
    const ac=flight({state:'holding',holdCenter:{x:300,y:224}}),before=structuredClone(ac);
    expect(model.atcFlightPath(ac,60,{kind:'heading',value:270}).end.y).toBeCloseTo(200,8);
    expect(ac).toEqual(before);
  });
  it('keeps automatic approach guidance for a speed draft', () => {
    const ac=flight({state:'approach',approachStage:'entry'});
    const path=model.atcFlightPath(ac,60,{kind:'speed',value:80});
    expect(path.end.speed).toBe(80); expect(path.end.altitude).toBe(3800);
    expect(ac.speed).toBe(120); expect(ac.targetSpeed).toBeNull();
  });
  it('rejects invalid drafts and malformed aircraft instead of drawing invented paths', () => {
    for(const draft of [{kind:'heading',value:''},{kind:'heading',value:361},{kind:'heading',value:'NaN'},{kind:'speed',value:59},{kind:'unknown',value:90}]) expect(model.atcFlightPath(flight(),60,draft)).toBeNull();
    for(const ac of [null,flight({speed:0}),flight({x:NaN}),flight({fuel:Infinity}),flight({state:'landed'}),flight({assignedRunway:{...runway,len:NaN}})]) expect(model.atcFlightPath(ac,60)).toBeNull();
  });
  it('bounds look-ahead and ignores unsupported optional targets', () => {
    expect(model.atcFlightPath(flight(),10000).horizonSeconds).toBe(120);
    expect(model.atcFlightPath(flight(),Infinity).horizonSeconds).toBe(60);
    expect(model.atcFlightPath(flight(),-1).horizonSeconds).toBe(10);
    const path=model.atcFlightPath(flight({targetHeading:'bad',targetAltitude:Infinity,targetSpeed:NaN}),120);
    expect(path.points.every(p=>Object.values(p).every(Number.isFinite))).toBe(true);
    expect(path.points.length).toBeLessThanOrEqual(25);
  });
  it('stops at the threshold without claiming a landing or reserving a runway', () => {
    const ac=flight({x:170,state:'approach',approachStage:'final',altitude:0});
    expect(model.atcFlightPath(ac,120)).toMatchObject({reason:'threshold',elapsedSeconds:0});
    expect(ac.state).toBe('approach'); expect(ac.touchdownReady).toBeUndefined();
  });
  it('stops when airspace or fuel ends rather than extending a misleading path', () => {
    expect(model.atcFlightPath(flight({x:419,heading:90,speed:600}),120)).toMatchObject({reason:'airspace'});
    const fuel=model.atcFlightPath(flight({fuel:0.05}),120);
    expect(fuel.reason).toBe('fuel'); expect(fuel.elapsedSeconds).toBeLessThan(10); expect(fuel.end.fuel).toBe(0);
  });
  it('ends at zero elapsed flight seconds when fuel is already exhausted and does not move live traffic', () => {
    const ac=flight({fuel:0}),before=structuredClone(ac),path=model.atcFlightPath(ac,60);
    expect(path).toMatchObject({reason:'fuel',elapsedSeconds:0,distanceNm:0});
    expect(path.points).toHaveLength(1);
    expect(path.end).toMatchObject({seconds:0,x:ac.x,y:ac.y,fuel:0});
    model.advanceAircraft(ac,10/120,false);
    expect(ac).toEqual(before);
  });
  it('stops live movement and its projection at the same low-fuel position', () => {
    const ac=flight({fuel:0.05}),path=model.atcFlightPath(ac,10),live=structuredClone(ac);
    model.advanceAircraft(live,10/120);
    expect(path.reason).toBe('fuel');
    expect(path.elapsedSeconds).toBe(3);
    expect(live.trackClock).toBeCloseTo(path.elapsedSeconds,8);
    for(const key of ['x','y','heading','speed','altitude','fuel']) expect(path.end[key],key).toBeCloseTo(live[key],8);
    expect(live.fuel).toBe(0);
    expect(live.x).toBeCloseTo(299.7,8);
  });
  it('stops live movement and its projection at the same first airspace exit', () => {
    const ac=flight({x:419.55,heading:90}),path=model.atcFlightPath(ac,10),live=structuredClone(ac);
    model.advanceAircraft(live,10/120);
    expect(path).toMatchObject({reason:'airspace',elapsedSeconds:5});
    expect(live.trackClock).toBe(path.elapsedSeconds);
    expect(live.x).toBeCloseTo(420.05,8);
    for(const key of ['x','y','heading','speed','altitude','fuel']) expect(path.end[key],key).toBeCloseTo(live[key],8);
  });
  it('retains an airspace exit even when the continuing turn would bring the aircraft back inside', () => {
    const ac=flight({x:419.995,heading:10,targetHeading:350}),path=model.atcFlightPath(ac,10),live=structuredClone(ac);
    model.advanceAircraft(live,10/120);
    expect(path).toMatchObject({reason:'airspace',elapsedSeconds:1});
    expect(live.trackClock).toBe(1);
    expect(live.heading).toBe(7);
    expect(live.x).toBeGreaterThan(420);
    for(const key of ['x','y','heading','speed','altitude','fuel']) expect(path.end[key],key).toBeCloseTo(live[key],8);
  });
  it('keeps an already-exited aircraft stationary at zero projected flight seconds', () => {
    const ac=flight({x:420.5,heading:270}),before=structuredClone(ac),path=model.atcFlightPath(ac,10);
    expect(path).toMatchObject({reason:'airspace',elapsedSeconds:0,distanceNm:0});
    expect(path.points).toHaveLength(1);
    model.advanceAircraft(ac,10/120,false);
    for(const key of ['x','y','heading','speed','altitude','fuel']) expect(ac[key],key).toBe(before[key]);
  });
});

describe('ATC recorded tracks and paused stepping', () => {
  it('records actual positions every five flight seconds, starting when movement begins', () => {
    const ac=flight(); model.advanceAircraft(ac,10/120);
    expect(ac.trackClock).toBe(10); expect(ac.trackHistory.map(p=>p.time)).toEqual([0,5,10]);
    expect(ac.trackHistory[1].x).toBeCloseTo(299.5,8); expect(ac.trackHistory[2].x).toBeCloseTo(ac.x,8);
  });
  it('records the curve actually flown instead of placing past blips behind the current heading', () => {
    const ac=simulate(flight({targetHeading:0}),60);
    expect(ac.heading).toBe(0);
    expect(Math.max(...ac.trackHistory.map(p=>p.x))-Math.min(...ac.trackHistory.map(p=>p.x))).toBeGreaterThan(1);
    expect(ac.trackHistory[0]).toMatchObject({x:300,y:200,time:0});
  });
  it('keeps only two flight minutes and twenty-five records per aircraft', () => {
    const ac=simulate(flight({state:'holding'}),600);
    expect(ac.trackHistory).toHaveLength(25); expect(ac.trackHistory[0].time).toBeCloseTo(480,6);
    expect(ac.trackHistory[24].time).toBeCloseTo(600,6);
  });
  it('maintains the sample clock and positions across 30, 60, and 144 FPS', () => {
    const flights=[30,60,144].map(fps=>simulate(flight({targetHeading:0}),120,fps));
    for(const ac of flights) { expect(ac.trackHistory).toHaveLength(25); expect(ac.trackHistory[24].time).toBeCloseTo(120,6); }
    for(const ac of flights.slice(1)) for(let i=0;i<25;i++) expect(Math.hypot(ac.trackHistory[i].x-flights[0].trackHistory[i].x,ac.trackHistory[i].y-flights[0].trackHistory[i].y)).toBeLessThan(0.3);
  });
  it('does not change motion or record a trail for zero or invalid elapsed time', () => {
    for(const time of [0,-1,Infinity,NaN]) { const ac=flight(),before=structuredClone(ac); model.advanceAircraft(ac,time); expect(ac).toEqual(before); }
  });
  it('never gives a projected aircraft a recorded trail', () => {
    const ac=flight(); model.advanceAircraft(ac,10/120,false);
    expect(ac.trackHistory).toBeUndefined(); expect(ac.trackClock).toBeUndefined();
  });
  it('filters malformed, future, stale, and out-of-order saved track points without mutation', () => {
    const points=[{x:1,y:2,time:0},{x:1,y:2,time:5},null,{x:NaN,y:2,time:10},{x:1,y:2,time:15},{x:1,y:2,time:14},{x:1,y:2,time:1000}];
    const before=structuredClone(points),valid=model.atcTrackHistory(points,130);
    expect(valid).toEqual([]);
    expect(model.atcTrackHistory(points,20)).toEqual([{x:1,y:2,time:0},{x:1,y:2,time:5},{x:1,y:2,time:15}]);
    expect(points).toEqual(before);
  });
  it('reseeds stale recovered history without backdating newly flown positions', () => {
    const ac=flight({trackClock:120,trackHistory:[{x:312,y:200,time:0}]});
    model.advanceAircraft(ac,10/120);
    expect(ac.trackClock).toBe(130);
    expect(ac.trackHistory.map(p=>p.time)).toEqual([120,125,130]);
    expect(ac.trackHistory[0]).toEqual({x:300,y:200,time:120});
    expect(ac.trackHistory[1].x).toBeCloseTo(299.5,8);
    expect(ac.trackHistory[2].x).toBeCloseTo(ac.x,8);
  });
  it('saves real tracks and restores legacy shifts with an empty history', () => {
    const ac=flight(); model.advanceAircraft(ac,30/120);
    const game={shiftId:'atc-track-test',airport:model.AIRPORTS[0],aircraft:[ac],time:0.25,selected:101,paused:true,score:0,landed:0,conflicts:0,wind:{dir:270,speed:10},messages:[]};
    const saved=model.serializeAtcShift(game),restored=model.restoreAtcShift(JSON.parse(JSON.stringify(saved)));
    expect(restored.aircraft[0].trackHistory).toEqual(ac.trackHistory); expect(restored.aircraft[0].trackClock).toBe(30);
    delete saved.aircraft[0].trackHistory; delete saved.aircraft[0].trackClock;
    expect(model.restoreAtcShift(saved).aircraft[0]).toMatchObject({trackClock:0,trackHistory:[]});
  });
  it('permits one deliberate step only in a paused, open shift', () => {
    expect(model.atcCanStepTraffic({airport:model.AIRPORTS[0],paused:true},false)).toBe(true);
    expect(model.atcCanStepTraffic({airport:model.AIRPORTS[0],paused:true},true)).toBe(false);
    expect(model.atcCanStepTraffic(null,false)).toBe(false);
  });
  it.each([{paused:false},{gameOver:true},{committed:true},{showHelp:true},{commandEntry:true},{mathChallenge:{}},{practice:{completed:true}},{airport:null}])('blocks stepping when a modal, lifecycle state, or active clock requires freezing', extra => {
    expect(model.atcCanStepTraffic({airport:model.AIRPORTS[0],paused:true,...extra},false)).toBe(false);
  });
});
