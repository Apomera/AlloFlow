// Coaster Lab missions are earned by designing, not by loading a template.
//
// Measured in a browser on the pre-fix file (2026-11-23): loading each starting
// layout and pressing Test run once stamped 7 of 15 missions (Loop the loop,
// Ejector seat, Rocket start, Lap-bar licence, Floater, Even keel, plus First
// ride) - more than the 6 the host quest asks for - without moving a node.
// COASTER_MISSION_SRC points at another copy (mutation check against start.js).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const FILE = process.env.COASTER_MISSION_SRC || 'stem_lab/stem_tool_coasterlab.js';
const SRC = readFileSync(resolve(process.cwd(), FILE), 'utf8');

function setup() {
  const missions = sliceBetween(SRC, 'const MISSIONS = [', '\nfunction renderMissions(){', { file: FILE });
  const event = sliceBetween(SRC, 'function missionEvent(ev, ctx){', '\n/* run-trace strip charts', { file: FILE });
  const store = {};
  const banners = [];
  const design = { points: [{ x: 0, y: 3, z: 0, bank: 0 }, { x: 30, y: 28, z: 0, bank: 0 }], propulsion: { mode: 'chain' } };
  const markFallback = SRC.includes('function markDesignOrigin(') ? '' : 'function markDesignOrigin(){}';
  const api = new Function('localStorage', 'design', 'banner', 'renderMissions', 'jingle', 'bridgeReport', 'analysis',
    missions + '\n' + markFallback + '\n' + event + '\nreturn { missionEvent, markDesignOrigin, done: () => Object.keys(missionsDone) };')(
    { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
    design, (msg) => banners.push(msg), () => {}, () => {}, () => {}, null);
  return { api, design, banners };
}
// a clean looping run: satisfies "First ride" and "Loop the loop"
const loopRun = () => ({
  tele: { status: 'complete', inversions: 1, violations: [], airtime: 0.2, maxGV: 4.5 },
  sc: { excitement: 6, nausea: 3, payback: 40 },
  seats: { n: 2, rows: [{ minGV: 0.4, airtime: 0 }, { minGV: 0.3, airtime: 0 }], gSpread: 0.1 },
});

describe('Coaster Lab design missions need the student\'s own track', () => {
  it('an unchanged starting layout earns First ride only, and says why', () => {
    const t = setup();
    t.api.markDesignOrigin();
    t.api.missionEvent('run', loopRun());
    expect(t.api.done()).toEqual(['first']);
    // nothing new was stamped besides "first", so no "make it yours" nudge yet
    t.api.missionEvent('run', loopRun());
    expect(t.api.done()).toEqual(['first']);
    expect(t.banners.join(' ')).toContain('Loop the loop');
    expect(t.banners.join(' ')).toContain('change the starting layout');
  });

  it('after one node is changed the same run earns the mission', () => {
    const t = setup();
    t.api.markDesignOrigin();
    t.api.missionEvent('run', loopRun());
    t.design.points[1].y = 26;
    t.api.missionEvent('run', loopRun());
    expect(t.api.done()).toContain('loop');
  });

  it('a design never loaded from a template is the student\'s own', () => {
    const t = setup();
    t.api.missionEvent('run', loopRun());
    expect(t.api.done()).toEqual(expect.arrayContaining(['first', 'loop']));
  });
});
