import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_atctower.js'), 'utf8');
const helpers = source.slice(source.indexOf('  var toRad ='), source.indexOf('  // ── AIRPORT CONFIGURATIONS ──'));
const model = new Function(helpers + '\nreturn { runwayScheduleHints, atcArrivalBoard };')();
const runway = { hdg: 270, x: 150, y: 200, len: 40 };
const other = { hdg: 180, x: 150, y: 200, len: 40 };
const airport = { id: 'simple', runways: [runway] };
function aircraft(id, eta, extra = {}) {
  return { id, callsign: id, x: 170 + eta * 6, y: 200, heading: 270, speed: 120, altitude: 5000, fuel: 30, type: { cat: 'Medium' }, state: 'inbound', assignedRunway: runway, ...extra };
}
function board(flights, apt = airport, busy = {}, time = 0) {
  return model.atcArrivalBoard(flights, apt, model.runwayScheduleHints(flights, apt, busy, time));
}

describe('ATC estimated arrival board', () => {
  it('combines crossing runways into one shared sequence without duplicate aircraft', () => {
    const crossing = { id: 'crossing', runways: [runway, other] };
    const flights = [aircraft('A', 5), aircraft('B', 0, { x: 150, y: 147, assignedRunway: other })];
    const result = board(flights, crossing);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].runways).toEqual([runway, other]);
    expect(result.groups[0].entries.map(item => item.aircraft.id)).toEqual(['A', 'B']);
    expect(result.groups[0].entries[1].etaMinutes).toBe(5.5);
    expect(result.pending).toEqual([]);
  });

  it('keeps independent runway sequences separate', () => {
    const parallel = { id: 'parallel', runways: [runway, other] };
    const result = board([aircraft('A', 5), aircraft('B', 0, { x: 150, y: 147, assignedRunway: other })], parallel);
    expect(result.groups.map(group => group.entries.map(item => item.aircraft.id))).toEqual([['A'], ['B']]);
    expect(result.groups.map(group => group.entries[0].gapMinutes)).toEqual([null, null]);
  });

  it('orders by actual estimate even when later traffic has priority', () => {
    const priority = aircraft('Priority', 15, { emergency: { priority: true }, fuel: 3 });
    const result = board([priority, aircraft('Earlier', 5)]);
    expect(result.groups[0].entries.map(item => [item.aircraft.id, item.order])).toEqual([['Earlier', 1], ['Priority', 2]]);
  });

  it('keeps tied estimates stable and marks their zero gap for review', () => {
    const result = board([aircraft('B', 5), aircraft('A', 5)]);
    expect(result.groups[0].entries.map(item => item.aircraft.id)).toEqual(['B', 'A']);
    expect(result.groups[0].entries[1]).toMatchObject({ gapMinutes: 0, requiredGapMinutes: 4, spacingConcern: true });
  });

  it('shows every adjacent gap while using the same target as runway planning', () => {
    const flights = [aircraft('C', 10), aircraft('A', 5), aircraft('B', 9)];
    const result = board(flights);
    expect(result.groups[0].entries.map(item => [item.gapMinutes, item.requiredGapMinutes, item.spacingConcern])).toEqual([[null, null, false], [4, 4, false], [1, 4, true]]);
    const plan = model.runwayScheduleHints(flights, airport)[0];
    expect(result.groups[0].entries[2].requiredGapMinutes).toBe(plan.requiredSpacingMinutes);
  });

  it('retains the heavier-aircraft and slower-speed spacing guide', () => {
    const flights = [aircraft('Heavy', 2.5, { speed: 60, type: { cat: 'Heavy' } }), aircraft('Follower', 5, { speed: 60 })];
    expect(board(flights).groups[0].entries[1]).toMatchObject({ gapMinutes: 5, requiredGapMinutes: 6, spacingConcern: true });
  });

  it('converts occupancy to flight minutes and treats the closing boundary consistently', () => {
    const result = board([aircraft('Inside', 1), aircraft('Boundary', 4)], airport, { 'runway-0': 12 }, 10);
    expect(result.groups[0]).toMatchObject({ occupied: true, occupancyMinutes: 4 });
    expect(result.groups[0].entries.map(item => item.occupancyConcern)).toEqual([true, false]);
    expect(result.groups[0].entries[1].spacingConcern).toBe(true);
  });

  it('explains held, recovering, unassigned, and unavailable estimates without ranking them', () => {
    const flights = [aircraft('Held', 3, { state: 'holding' }), aircraft('Recovering', 4, { state: 'goAround' }), aircraft('Unassigned', 5, { assignedRunway: null }), aircraft('Stopped', 6, { speed: 0 })];
    const result = board(flights);
    expect(result.groups[0].entries).toEqual([]);
    expect(result.pending.map(item => [item.aircraft.id, item.reason])).toEqual([['Held', 'holding'], ['Recovering', 'goAround'], ['Unassigned', 'unassigned'], ['Stopped', 'unavailable']]);
  });

  it('returns a released aircraft to the estimated sequence', () => {
    const held = aircraft('Held', 5, { state: 'holding' });
    expect(board([held]).pending).toHaveLength(1);
    const released = { ...held, state: 'inbound' };
    expect(board([released]).groups[0].entries[0].aircraft).toBe(released);
    expect(board([released]).pending).toEqual([]);
  });

  it('omits landed, departed, and crashed aircraft from both areas', () => {
    const flights = ['landed', 'departed', 'crashed'].map(state => aircraft(state, 5, { state }));
    const result = board(flights);
    expect(result.groups[0].entries).toEqual([]);
    expect(result.pending).toEqual([]);
  });

  it('uses a shared finite scale that contains every runway estimate and occupancy interval', () => {
    const result = board([aircraft('Far', 26)], airport, { 'runway-0': 30 }, 10);
    expect(result.horizonMinutes).toBe(40);
    expect(result.groups[0].entries[0].etaMinutes).toBe(26);
    expect(board([aircraft('Far', 26)]).horizonMinutes).toBe(30);
    expect(board([]).horizonMinutes).toBe(5);
  });

  it('does not turn a runway from another airport into an arrival estimate', () => {
    const result = board([aircraft('Foreign', 5, { assignedRunway: { ...runway } })]);
    expect(result.groups[0].entries).toEqual([]);
    expect(result.pending[0].reason).toBe('unassigned');
  });

  it('handles absent or non-finite planning data without displaying false ETAs', () => {
    expect(model.atcArrivalBoard(null, null, null)).toEqual({ groups: [], pending: [], horizonMinutes: 5 });
    const ac = aircraft('Missing', 5);
    const result = model.atcArrivalBoard([ac], airport, [{ group: 'runway-0', runway, occupancySeconds: Infinity, arrivals: [{ aircraft: ac, etaMinutes: NaN }] }]);
    expect(result.groups[0].entries).toEqual([]);
    expect(result.pending[0].reason).toBe('unavailable');
    expect(result.horizonMinutes).toBe(5);
  });

  it('leaves aircraft instructions, input order, and planning records unchanged', () => {
    const flights = [aircraft('B', 10, { targetSpeed: 90 }), aircraft('A', 5)];
    const plans = model.runwayScheduleHints(flights, airport);
    const before = structuredClone({ flights, plans });
    const result = model.atcArrivalBoard(flights, airport, plans);
    expect({ flights, plans }).toEqual(before);
    expect(result.groups[0].entries[0].aircraft).toBe(flights[1]);
  });
});
