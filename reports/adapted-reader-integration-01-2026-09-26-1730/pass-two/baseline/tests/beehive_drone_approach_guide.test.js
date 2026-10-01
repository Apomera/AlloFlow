import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let BH;
beforeAll(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool('stem_lab/stem_tool_beehive.js', 'beehive'); BH = window.__RR_TEST_EXPORTS__.beehive; });
const flight = (patch = {}) => ({ x: 0, y: 80, z: -500, reachedDca: false, reachedQueen: false, ...patch });

describe('DCA approach learning guide', () => {
  it('separates distance to the entry boundary from altitude and reads without changing the flight', () => {
    const s = Object.freeze(flight());
    expect(BH.bhDroneApproachGuide(s)).toMatchObject({ inRange: false, inBand: false, rangeText: '→ 28 model m closer', heightText: '↑ Climb 20 model ft', recorded: false });
  });
  it.each([[72, 100, true, true], [72.01, 115, false, true], [0, 130, true, true], [0, 130.01, true, false], [0, 99.99, true, false]])('keeps the exact simulation gate at x=%s and height=%s', (x, y, inRange, inBand) => {
    const r = BH.bhDroneApproachGuide(flight({ x, y, z: -600 }));
    expect(r).toMatchObject({ inRange, inBand, recorded: false });
    if (!inRange) expect(r.rangeText).toContain('<1');
    if (!inBand) expect(r.heightText).toContain('<1');
  });
  it('does not award DCA entry while paused at the target, then keeps the recorded milestone after leaving it', () => {
    const s = flight({ y: 115, z: -600, paused: true });
    expect(BH.bhDroneApproachGuide(s)).toMatchObject({ status: 'Entry conditions met', recorded: false });
    expect(BH.bhDroneApproachGuide(s).note).toContain('Advance flight');
    expect(BH.bhDroneApproachGuide({ ...s, reachedDca: true, x: 900, y: 10 })).toMatchObject({ status: 'DCA recorded', recorded: true });
    expect(BH.bhDroneApproachGuide({ ...s, reachedDca: true, reachedQueen: true }).status).toBe('Route complete');
  });
  it('does not suggest entry when telemetry is unavailable and clamps only the visual pointer', () => {
    expect(BH.bhDroneApproachGuide({})).toMatchObject({ known: false, inRange: false, inBand: false });
    expect(BH.bhDroneApproachGuide(flight({ y: NaN })).heightText).toBe('Height unavailable');
    const high = BH.bhDroneApproachGuide(flight({ y: 420 }));
    expect(high.markerPct).toBe(100); expect(high.heightText).toContain('290 model ft');
    expect(BH.bhDroneApproachGuide(flight({ y: -10 })).markerPct).toBe(0);
  });
});
