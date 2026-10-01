import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let BH;
beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool('stem_lab/stem_tool_beehive.js', 'beehive'); BH = window.__RR_TEST_EXPORTS__.beehive; });
const flight = (patch = {}) => ({ x: 0, y: 100, z: 0, phase: 'flight', reachedDca: false, ...patch });

describe('Optional approach frame guidance', () => {
  it('uses fixed approach locations without changing checkpoint evidence', () => {
    const s = Object.freeze(flight({ z: -140 })), r = BH.bhDroneApproachCues(s);
    expect(r.guides.map(g => [g.x, g.y, g.z, g.radius])).toEqual([[0,100,-140,30],[0,100,-300,30],[0,100,-460,30]]);
    expect(s.reachedDca).toBe(false); expect(r.next.number).toBe(2);
    expect(r.guides[0].visible).toBe(false);
  });
  it.each([[-50,1],[-250,2],[-400,3],[-500,null]])('emphasizes the next approach frame at depth %s', (z, number) => {
    const r = BH.bhDroneApproachCues(flight({ z }));
    expect(r.next?.number ?? null).toBe(number);
    expect(r.guides.filter(g => g.active)).toHaveLength(number ? 1 : 0);
  });
  it('fades near and passed frames instead of making them fill the view', () => {
    const near = BH.bhDroneApproachCues(flight({ z: -290 })).guides[1];
    const far = BH.bhDroneApproachCues(flight({ z: -200 })).guides[1];
    expect(near.opacity).toBeLessThan(far.opacity);
    expect(BH.bhDroneApproachCues(flight({ z: -335 })).guides[1].visible).toBe(false);
  });
  it('hides optional frames after recorded progress, completion, or unavailable position', () => {
    for (const patch of [{reachedDca:true},{reachedQueen:true},{phase:'mating'},{phase:'end'},{x:NaN},{z:undefined}]) {
      const r = BH.bhDroneApproachCues(flight(patch)); expect(r.next).toBeNull(); expect(r.guides.every(g => !g.visible)).toBe(true);
    }
    expect(BH.bhDroneApproachCues({}).available).toBe(false);
  });
  it('keeps guide presentation independent of altitude acceptance and clock animation', () => {
    const a = BH.bhDroneApproachCues(flight({ z:-250, y:20, simulationClock:0 }));
    expect(BH.bhDroneApproachCues(flight({ z:-250, y:200, simulationClock:100 }))).toEqual(a);
  });
});
