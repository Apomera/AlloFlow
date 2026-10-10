import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync('stem_lab/stem_tool_atctower.js', 'utf8');
const helpers = source.slice(source.indexOf('  var toRad ='), source.indexOf('  // ── AIRPORT CONFIGURATIONS ──'));
const configurations = source.slice(source.indexOf('  var AIRPORTS ='), source.indexOf('  // ── CALLSIGNS ──'));
const model = new Function(helpers + configurations + '\nreturn {advanceAircraft,atcFlightPath,atcFlightMoment,atcFlightInstruments,AIRPORTS,AC_TYPES};')();
const runway = model.AIRPORTS[0].runways[0];
const flight = (extra = {}) => ({ id:101, callsign:'MOTION101', type:model.AC_TYPES[1], x:300, y:200, heading:270, speed:120, altitude:5000, fuel:60, state:'inbound', assignedRunway:runway, targetHeading:null, targetSpeed:null, targetAltitude:null, ...extra });
const row = (ac, id, frozen = false) => model.atcFlightInstruments(ac, frozen).rows.find(item => item.id === id);

describe('ATC exploration selects recorded forecast moments without inventing motion', () => {
  it('shows the actual initial position and zero distance at time zero', () => {
    const ac = flight(), path = model.atcFlightPath(ac, 60), moment = model.atcFlightMoment(path, 0);
    expect(moment).toMatchObject({ index:0, requestedSeconds:0, ended:false });
    expect(moment.point).toMatchObject({ seconds:0, x:ac.x, y:ac.y, heading:270, distanceNm:0 });
  });

  it('selects progressive turn samples before and after heading capture', () => {
    const path = model.atcFlightPath(flight({ targetHeading:0 }), 60);
    expect(model.atcFlightMoment(path, 10).point.heading).toBe(300);
    expect(model.atcFlightMoment(path, 30).point.heading).toBe(0);
    const end = model.atcFlightMoment(path, 60);
    expect(end.point.heading).toBe(0); expect(end.ended).toBe(true);
    expect(end.point.distanceNm).toBeGreaterThan(model.atcFlightMoment(path, 30).point.distanceNm);
  });

  it('rounds finite requests to five-second samples and bounds them to the horizon', () => {
    const path = model.atcFlightPath(flight(), 60);
    expect(model.atcFlightMoment(path, -100).requestedSeconds).toBe(0);
    expect(model.atcFlightMoment(path, 12.4).point.seconds).toBe(10);
    expect(model.atcFlightMoment(path, 12.5).point.seconds).toBe(15);
    expect(model.atcFlightMoment(path, 1000)).toMatchObject({ requestedSeconds:60, ended:true });
  });

  it('defaults invalid requests to the true non-five-second terminal time', () => {
    const path = model.atcFlightPath(flight({ fuel:0.05 }), 60);
    expect(path.elapsedSeconds).toBe(3);
    for (const requested of [undefined, null, '10', NaN, Infinity, -Infinity]) {
      expect(model.atcFlightMoment(path, requested)).toMatchObject({ requestedSeconds:3, ended:true, point:{ seconds:3, fuel:0 } });
    }
  });

  it('does not invent a sample before an early endpoint or extrapolate after it', () => {
    const path = model.atcFlightPath(flight({ fuel:0.05 }), 60);
    expect(path.points.map(point => point.seconds)).toEqual([0, 3]);
    expect(model.atcFlightMoment(path, 2)).toMatchObject({ requestedSeconds:0, ended:false, point:{ seconds:0 } });
    expect(model.atcFlightMoment(path, 5)).toMatchObject({ requestedSeconds:5, ended:true, point:{ seconds:3 } });
    expect(model.atcFlightMoment(path, 60).point).toEqual(path.end);
  });

  it('retains truthful zero-time fuel, boundary, and threshold endpoints', () => {
    for (const extra of [{ fuel:0 }, { x:420.5 }, { x:170, state:'approach', approachStage:'final', altitude:0 }]) {
      const path = model.atcFlightPath(flight(extra), 60), moment = model.atcFlightMoment(path, 30);
      expect(path.elapsedSeconds).toBe(0);
      expect(moment).toMatchObject({ index:0, requestedSeconds:30, ended:true, point:{ seconds:0, distanceNm:0 } });
    }
  });

  it('uses one requested time for current and draft paths with different exit times', () => {
    const ac = flight({ x:419.505, heading:90 });
    const current = model.atcFlightPath(ac, 60), draft = model.atcFlightPath(ac, 60, { kind:'heading', value:270 });
    expect(current.elapsedSeconds).toBe(5); expect(draft.elapsedSeconds).toBe(6);
    expect(model.atcFlightMoment(current, 5)).toMatchObject({ requestedSeconds:5, ended:true, point:{ seconds:5 } });
    expect(model.atcFlightMoment(draft, 5)).toMatchObject({ requestedSeconds:5, ended:false, point:{ seconds:5 } });
    expect(model.atcFlightMoment(draft, 10)).toMatchObject({ requestedSeconds:10, ended:true, point:{ seconds:6 } });
  });

  it('accumulates each actual integrator move rather than straight sample chords', () => {
    const ac = flight({ targetHeading:90, targetSpeed:80 }), path = model.atcFlightPath(ac, 60), live = structuredClone(ac);
    let distance = 0;
    for (let seconds = 1; seconds <= 60; seconds++) {
      const x = live.x, y = live.y;
      model.advanceAircraft(live, 1 / 120, false);
      distance += Math.hypot(live.x - x, live.y - y) / 3;
      if (seconds % 5 === 0) expect(model.atcFlightMoment(path, seconds).point.distanceNm).toBeCloseTo(distance, 9);
    }
    const point = model.atcFlightMoment(path, 30).point;
    expect(point.distanceNm).toBeGreaterThan(Math.hypot(point.x - ac.x, point.y - ac.y) / 3);
    expect(path.end.distanceNm).toBeCloseTo(distance, 9);
  });

  it('gives every sample monotonic cumulative distance and the exact endpoint total', () => {
    const path = model.atcFlightPath(flight({ state:'holding' }), 120);
    expect(path.points[0].distanceNm).toBe(0);
    for (let index = 1; index < path.points.length; index++) expect(path.points[index].distanceNm).toBeGreaterThan(path.points[index - 1].distanceNm);
    expect(path.end.distanceNm).toBe(path.distanceNm);
  });

  it('returns an independent snapshot and leaves forecast and live traffic unchanged', () => {
    const ac = flight({ targetHeading:0 }), path = model.atcFlightPath(ac, 60);
    const beforeAc = structuredClone(ac), beforePath = structuredClone(path), moment = model.atcFlightMoment(path, 30);
    expect(moment.point).not.toBe(path.points[moment.index]);
    moment.point.x = -999; moment.point.distanceNm = 999; moment.point.heading = 123;
    expect(path).toEqual(beforePath); expect(ac).toEqual(beforeAc);
  });

  it('rejects malformed path envelopes without a fallback forecast', () => {
    const valid = model.atcFlightPath(flight(), 60);
    for (const path of [null, {}, { ...valid, points:[] }, { ...valid, points:{} }, { ...valid, horizonSeconds:9 }, { ...valid, horizonSeconds:121 }, { ...valid, horizonSeconds:Infinity }, { ...valid, elapsedSeconds:-1 }, { ...valid, elapsedSeconds:61 }, { ...valid, elapsedSeconds:NaN }, { ...valid, distanceNm:-1 }, { ...valid, distanceNm:Infinity }]) expect(model.atcFlightMoment(path, 10)).toBeNull();
  });

  it('rejects non-finite point values and decreasing distance or time', () => {
    const valid = model.atcFlightPath(flight(), 60);
    for (const key of ['seconds','x','y','heading','altitude','speed','fuel','distanceNm']) {
      const path = structuredClone(valid); path.points[1][key] = Infinity;
      expect(model.atcFlightMoment(path, 10), key).toBeNull();
    }
    for (const mutate of [path => { path.points[2].seconds = path.points[1].seconds; }, path => { path.points[2].distanceNm = 0; }, path => { path.points[1].seconds = -1; }, path => { path.points[1] = null; }]) {
      const path = structuredClone(valid); mutate(path); expect(model.atcFlightMoment(path, 10)).toBeNull();
    }
  });

  it('rejects missing first, intermediate, and last array entries without throwing', () => {
    const valid = model.atcFlightPath(flight(), 60);
    for (const index of [0, 2, valid.points.length - 1]) {
      const path = structuredClone(valid); delete path.points[index];
      expect(model.atcFlightMoment(path, 10)).toBeNull();
    }
  });

  it('rejects missing initial or terminal evidence and disagreement with total distance', () => {
    const valid = model.atcFlightPath(flight(), 60);
    for (const mutate of [path => { path.points.shift(); }, path => { path.points.pop(); }, path => { path.points[0].distanceNm = 0.01; }, path => { path.distanceNm += 1; }, path => { path.points[1].seconds = path.elapsedSeconds + 1; }]) {
      const path = structuredClone(valid); mutate(path); expect(model.atcFlightMoment(path, 10)).toBeNull();
    }
  });
});

describe('ATC instruments distinguish actual state from active instructions', () => {
  it('shows shortest turns across north and normalizes compass values', () => {
    expect(row(flight({ heading:350, targetHeading:10 }), 'heading')).toMatchObject({ current:350, target:10, delta:20, remaining:20, direction:'right' });
    expect(row(flight({ heading:10, targetHeading:350 }), 'heading')).toMatchObject({ delta:-20, remaining:20, direction:'left' });
    expect(row(flight({ heading:360, targetHeading:720 }), 'heading')).toMatchObject({ current:0, target:0, direction:'on-target' });
  });

  it('resolves an exact half-turn consistently with live guidance', () => {
    const ac = flight({ heading:0, targetHeading:180 }), heading = row(ac, 'heading');
    expect(heading).toMatchObject({ delta:-180, remaining:180, direction:'left' });
    model.advanceAircraft(ac, 1 / 120, false);
    expect(ac.heading).toBe(357);
  });

  it('reports climb, descent, acceleration and slowing from measured differences', () => {
    expect(row(flight({ targetAltitude:6000 }), 'altitude')).toMatchObject({ delta:1000, remaining:1000, direction:'climbing' });
    expect(row(flight({ targetAltitude:4000 }), 'altitude')).toMatchObject({ delta:-1000, direction:'descending' });
    expect(row(flight({ targetSpeed:140 }), 'speed')).toMatchObject({ delta:20, direction:'accelerating' });
    expect(row(flight({ targetSpeed:80 }), 'speed')).toMatchObject({ delta:-40, remaining:40, direction:'slowing' });
  });

  it('labels null manual targets Maintain without inventing target positions', () => {
    const instruments = model.atcFlightInstruments(flight(), true);
    expect(instruments.mode).toBe('manual');
    for (const item of instruments.rows) expect(item).toMatchObject({ target:null, direction:'maintain', delta:null, remaining:null, targetPosition:null });
  });

  it('distinguishes captured manual values from automatic guidance at the same value', () => {
    expect(row(flight({ targetSpeed:120 }), 'speed')).toMatchObject({ direction:'on-target', remaining:0 });
    expect(row(flight({ state:'approach', targetHeading:270 }), 'heading')).toMatchObject({ direction:'guided', remaining:0, target:270 });
  });

  it('suppresses only frozen automatic approach rows and retains the manual speed target', () => {
    const ac = flight({ state:'approach', targetHeading:90, targetAltitude:0, targetSpeed:80 });
    for (const id of ['heading','altitude']) expect(row(ac, id, true)).toMatchObject({ automatic:true, target:null, targetPosition:null, direction:'guided', remaining:null });
    expect(row(ac, 'speed', true)).toMatchObject({ automatic:false, target:80, direction:'slowing' });
    expect(row(ac, 'heading', false).target).toBe(90);
    expect(row(ac, 'altitude', false)).toMatchObject({ target:0, direction:'descending' });
  });

  it('suppresses a frozen hold heading while preserving its manual altitude instruction', () => {
    const ac = flight({ state:'holding', targetHeading:180, targetAltitude:6000 });
    expect(model.atcFlightInstruments(ac, true).mode).toBe('hold');
    expect(row(ac, 'heading', true)).toMatchObject({ target:null, direction:'guided' });
    expect(row(ac, 'altitude', true)).toMatchObject({ automatic:false, target:6000, direction:'climbing' });
  });

  it('ignores invalid optional targets and keeps its rails finite', () => {
    for (const extra of [{ targetHeading:NaN, targetAltitude:Infinity, targetSpeed:'80' }, { targetAltitude:-1, targetSpeed:0 }, { targetAltitude:45001, targetSpeed:601 }]) {
      const instruments = model.atcFlightInstruments(flight(extra), false);
      for (const item of instruments.rows) {
        expect(item.target).toBeNull(); expect(item.direction).toBe('maintain');
        expect(Number.isFinite(item.currentPosition)).toBe(true);
        expect(item.maximum).toBeGreaterThan(item.minimum);
      }
    }
  });

  it('contains extreme valid current and instructed values within finite bounded rails', () => {
    for (const extra of [{ altitude:0, targetAltitude:45000, speed:1, targetSpeed:600 }, { altitude:45000, targetAltitude:0, speed:600, targetSpeed:1 }]) {
      for (const item of model.atcFlightInstruments(flight(extra), false).rows) {
        expect(Number.isFinite(item.minimum)).toBe(true); expect(Number.isFinite(item.maximum)).toBe(true);
        expect(item.maximum).toBeGreaterThan(item.minimum);
        expect(item.currentPosition).toBeGreaterThanOrEqual(0); expect(item.currentPosition).toBeLessThanOrEqual(1);
        if (item.targetPosition != null) { expect(item.targetPosition).toBeGreaterThanOrEqual(0); expect(item.targetPosition).toBeLessThanOrEqual(1); }
        if (item.id === 'altitude') expect(item.maximum).toBeLessThanOrEqual(45000);
        if (item.id === 'speed') expect(item.maximum).toBeLessThanOrEqual(600);
      }
    }
  });

  it('rejects invalid aircraft measurements and inactive traffic', () => {
    for (const ac of [null, flight({ heading:NaN }), flight({ altitude:-1 }), flight({ altitude:45001 }), flight({ speed:0 }), flight({ speed:601 }), flight({ state:'landed' })]) expect(model.atcFlightInstruments(ac, false)).toBeNull();
  });

  it('does not rewrite targets or live aircraft when creating or changing returned rows', () => {
    const ac = flight({ state:'approach', targetHeading:90, targetAltitude:0, targetSpeed:80 }), before = structuredClone(ac);
    const instruments = model.atcFlightInstruments(ac, true);
    expect(ac).toEqual(before);
    instruments.rows[0].current = 999; instruments.rows[2].target = 250;
    expect(ac).toEqual(before);
  });
});
