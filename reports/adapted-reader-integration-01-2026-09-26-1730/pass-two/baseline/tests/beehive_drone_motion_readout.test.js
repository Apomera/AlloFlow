import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let BH;
beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool('stem_lab/stem_tool_beehive.js', 'beehive'); BH = window.__RR_TEST_EXPORTS__.beehive; });
const flight = (patch = {}) => ({ x: 40, y: 85, z: -250, yaw: 0, pitch: 0, vx: 0, vy: 0, vz: -2, windNow: { x: 0, z: 0 }, ...patch });

describe('Drone heading and motion directions', () => {
  it('uses equal-length pointers from the bee and preserves direction as speed changes', () => {
    const s = Object.freeze(flight({ vx: 1, vy: 0.5 })), r = BH.bhDroneMotionReadout(s);
    for (const p of [r.heading, r.motion]) expect(Math.hypot(p.x-s.x, p.y-s.y, p.z-s.z)).toBeCloseTo(12);
    expect(BH.bhDroneMotionReadout({ ...s, vx: 4, vy: 2, vz: -8 }).motion).toEqual(r.motion);
    expect(r.explanation).toContain('do not predict a safe route');
  });
  it.each([[1,-1,0,45],[-1,-1,0,-45],[0,-2,Math.PI/2,-90],[0,2,0,180]])('separates heading from horizontal motion at velocity %s,%s yaw %s', (vx, vz, yaw, degrees) => {
    expect(BH.bhDroneMotionReadout(flight({ vx, vz, yaw })).degrees).toBe(degrees);
  });
  it('does not invent a flight path when stationary or velocity is unavailable', () => {
    expect(BH.bhDroneMotionReadout(flight({ vx: 0, vy: 0, vz: 0 }))).toMatchObject({ moving: false, motion: null });
    expect(BH.bhDroneMotionReadout(flight({ vx: NaN }))).toMatchObject({ known: false, motion: null });
    expect(BH.bhDroneMotionReadout(flight({ vz: 0.02 })).motion).toBeNull();
  });
  it('shows vertical motion independently of where the bee points', () => {
    const r = BH.bhDroneMotionReadout(flight({ pitch: .3, vx: 0, vy: -1, vz: 0 }));
    expect(r.heading.y).toBeGreaterThan(85); expect(r.motion.y).toBeLessThan(85);
    expect(r.motionText).toBe('Mostly vertical motion'); expect(r.vertical).toBe('Descending');
  });
  it('describes the current wind toward the bee-relative direction without assigning all drift to wind', () => {
    expect(BH.bhDroneMotionReadout(flight({ windNow: { x: 1, z: 0 } })).windText).toBe('Wind toward your right');
    expect(BH.bhDroneMotionReadout(flight({ yaw: Math.PI/2, windNow: { x: 1, z: 0 } })).windText).toBe('Wind toward your front');
    expect(BH.bhDroneMotionReadout(flight({ wind: { x: 1, z: 0 } })).windText).toContain('Very little');
    expect(BH.bhDroneMotionReadout(flight({ windNow: undefined, wind: { x: -1, z: 0 } })).windText).toBe('Wind toward your left');
  });
});
