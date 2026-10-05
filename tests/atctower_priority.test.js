import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const source = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_atctower.js'), 'utf8');
const helpers = source.slice(source.indexOf('  var toRad ='), source.indexOf('  // ── AIRPORT CONFIGURATIONS ──'));
const model = new Function(helpers + '\nreturn { sortedFlightStrips };')();
const runway = { hdg: 270, x: 150, y: 200, len: 40 };
const airport = { id: 'simple', runways: [runway] };

function aircraft(id, extra = {}) {
  return { id, callsign: id, x: 200, y: 200, heading: 270, speed: 120,
    altitude: 5000, fuel: 30, type: { cat: 'Medium' }, state: 'inbound',
    assignedRunway: runway, ...extra };
}

describe('ATC incident priority reflects the declared urgency', () => {
  it('keeps a nonpriority bird strike in estimated arrival order', () => {
    const nearer = aircraft('nearer');
    const birdStrike = aircraft('bird', {
      x: 260, emergency: { type: 'birdstrike', priority: false }
    });
    expect(model.sortedFlightStrips([birdStrike, nearer], airport)).toEqual([nearer, birdStrike]);
  });

  it('places a declared medical priority before an earlier ordinary arrival', () => {
    const nearer = aircraft('nearer');
    const medical = aircraft('medical', {
      x: 260, emergency: { type: 'medical', priority: true }
    });
    expect(model.sortedFlightStrips([nearer, medical], airport)).toEqual([medical, nearer]);
  });

  it('still prioritizes critical fuel independently of a nonpriority incident', () => {
    const nearer = aircraft('nearer');
    const critical = aircraft('critical', {
      x: 260, fuel: 4, emergency: { type: 'birdstrike', priority: false }
    });
    expect(model.sortedFlightStrips([nearer, critical], airport)).toEqual([critical, nearer]);
  });
});
