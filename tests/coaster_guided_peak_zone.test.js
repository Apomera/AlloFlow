// Coaster Lab guided experiment: "where was the strongest vertical force?"
//
// The track's sampled arrays (y, s, Ty) are Float64Arrays. guidedPeakZone()
// guarded with Array.isArray(track.y), which is false for a typed array, so it
// returned 'track' on every run: a student who predicted valley, hill or turn
// was always told the evidence "differed", and the coach line never named a
// place. guidedEvidenceFocusPoint() had the same guard on track.s, so the
// "build a 20 m hill" goal never pointed at the hill.
// The zone is now read from the track's own bend at the peak (sideways vs.
// up-and-down), not from its height, so a flat banked turn is a turn.
// COASTER_ZONE_SRC points at another copy (mutation check against start.js).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const FILE = process.env.COASTER_ZONE_SRC || 'stem_lab/stem_tool_coasterlab.js';
const SRC = readFileSync(resolve(process.cwd(), FILE), 'utf8');
const M = 400;

// A closed loop of M samples. shape(u) gives the point at u in [0,1).
function makeTrack(shape) {
  const pos = [];
  for (let i = 0; i < M; i++) pos.push(shape(i / M));
  const s = new Float64Array(M + 1);
  for (let i = 1; i <= M; i++) {
    const a = pos[i % M], b = pos[i - 1];
    s[i] = s[i - 1] + Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  }
  const T = pos.map((_, i) => {
    const a = pos[(i + 1) % M], b = pos[(i - 1 + M) % M];
    const d = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
    const l = Math.hypot(d.x, d.y, d.z);
    return { x: d.x / l, y: d.y / l, z: d.z / l };
  });
  return { pos, s, L: s[M], T, y: Float64Array.from(pos.map((p) => p.y)), Ty: Float64Array.from(T.map((t) => t.y)) };
}
function loadZone(track) {
  const body = sliceBetween(SRC, 'function guidedPeakZone(tele){', '\nfunction guidedTraceSnapshot(', { file: FILE });
  const TMP = { i: 0 };
  const trackAt = (S) => {
    let sq = S % track.L; if (sq < 0) sq += track.L;
    let i = 0; while (i < M - 1 && track.s[i + 1] <= sq) i++;
    TMP.i = i; return { y: track.y[i] };
  };
  return new Function('track', 'trackAt', 'TMP', 'M', body + '\nreturn guidedPeakZone;')(track, trackAt, TMP, M);
}
// a run whose strongest seat force sits at distance sPeak
const teleAt = (sPeak) => ({ trace: [{ s: 1, g: 1 }, { s: sPeak, g: 3.2 }, { s: sPeak + 40, g: 1.1 }] });

describe('Coaster Lab guided peak-force zone', () => {
  // a 60 m-radius level circle with a 30 m dip-and-crest (bending more up-and-down than sideways) in its height
  const wavy = makeTrack((u) => ({ x: 60 * Math.cos(2 * Math.PI * u), z: 60 * Math.sin(2 * Math.PI * u), y: 35 + 30 * Math.cos(4 * Math.PI * u) }));
  // a flat circle: pure turn
  const flat = makeTrack((u) => ({ x: 25 * Math.cos(2 * Math.PI * u), z: 25 * Math.sin(2 * Math.PI * u), y: 6 }));

  it('a flat circle is a turn', () => {
    const zone = loadZone(flat);
    expect(zone(teleAt(flat.L * 0.3))).toBe('turn');
  });

  it('the bottom of a deep dip is a valley, the top of a crest is a hill', () => {
    const zone = loadZone(wavy);
    // y = 35 + 30 cos(4 pi u): lowest at u = 0.25, highest at u = 0.5
    expect(zone(teleAt(wavy.L * 0.25))).toBe('valley');
    expect(zone(teleAt(wavy.L * 0.5))).toBe('hill');
  });

  it('a typed-array track no longer falls through to "track"', () => {
    const zone = loadZone(wavy);
    expect(zone(teleAt(wavy.L * 0.25))).not.toBe('track');
  });
});

describe('Coaster Lab "build a 20 m hill" evidence points at the hill', () => {
  it('uses the highest design node even though track.s is a Float64Array', () => {
    const track = makeTrack((u) => ({ x: 50 * Math.cos(2 * Math.PI * u), z: 50 * Math.sin(2 * Math.PI * u), y: 10 + 10 * Math.sin(2 * Math.PI * u) }));
    const body = sliceBetween(SRC, '/* @clab-adaptive-evidence-start */', '/* @clab-evidence-story-model-start */', { file: FILE });
    const design = { points: [{ x: 50, y: 10, z: 0 }, { x: 0, y: 20, z: 50 }, { x: -50, y: 10, z: 0 }] };
    const focus = new Function('track', 'design', body + '\nreturn guidedEvidenceFocusPoint;')(track, design);
    const trace = [];
    for (let s = 0; s < track.L; s += 2) trace.push({ s, g: s > 200 && s < 210 ? 3 : 1, v: 10, gl: 0 });
    const point = focus({ trace }, 'hill20');
    expect(point.evidenceKind).toBe('hill');
    // the highest node sits a quarter of the way round
    expect(Math.abs(point.s - track.L / 4)).toBeLessThan(4);
  });
});
