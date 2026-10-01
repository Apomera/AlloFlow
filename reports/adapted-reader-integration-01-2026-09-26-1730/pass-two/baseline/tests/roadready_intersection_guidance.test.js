import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let RR;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
});

describe('Road Ready intersection guidance', () => {
  it('keeps the current signal at the stop line in either travel direction', () => {
    for (const sign of [-1, 1]) {
      const car = { x: 48, y: 50, heading: sign * Math.PI / 2, speed: 0 };
      const signal = { type: 'stop', x: 48, y: 50 + sign * (4.1 + 2) };
      const further = { type: 'stop', x: 48, y: signal.y + sign * 30 };
      const preview = RR.drivingSignalPreview(null, [further, signal], car, 4, 'clear');
      expect(preview.signal).toBe(signal);
      expect(preview.distanceMeters).toBeCloseTo(0, 10);
      car.y += sign * 0.03;
      expect(RR.drivingSignalPreview(null, [signal], car, 4, 'clear').distanceMeters).toBe(0);
      car.y += sign;
      expect(RR.drivingSignalPreview(null, [signal], car, 4, 'clear').signal).toBeNull();
    }
  });
  it('changes from approach guidance to hold or scan only when stopped near the line', () => {
    expect(RR.rrRuleCueFor({ signalState: 'red', signalDistanceFt: 0, speedMph: 0 }).title).toBe('HOLD AT RED');
    expect(RR.rrRuleCueFor({ signalState: 'stop', signalDistanceFt: 2, speedMph: 0 }).title).toBe('SCAN AND YIELD');
    for (const input of [
      { signalDistanceFt: 2, speedMph: 0.5 },
      { signalDistanceFt: 30, speedMph: 0 },
      { signalDistanceFt: null, speedMph: 0 },
      { signalDistanceFt: -2, speedMph: 0 },
    ]) {
      expect(RR.rrRuleCueFor({ signalState: 'stop', ...input }).title).toBe('STOP AHEAD');
    }
  });
  it('distinguishes a permitted left turn from a protected arrow', () => {
    expect(RR.rrRuleCueFor({ signalState: 'green', turnIntent: 'left' }).title).toBe('YIELD BEFORE TURNING');
    expect(RR.rrRuleCueFor({ signalState: 'green', turnIntent: 'straight' }).title).toBe('CHECK BEFORE PROCEEDING');
    expect(RR.rrRuleCueFor({ signalState: 'green_arrow', turnIntent: 'left' }).title).toBe('PROTECTED TURN');
    expect(RR.rrRuleCueFor({ signalState: 'green_arrow' }).detail).toContain('path is clear');
    expect(RR.rrRuleCueFor({ signalState: 'green', gapSeconds: 1, turnIntent: 'left' }).title).toBe('ADD FOLLOWING SPACE');
  });
  it('draws a direction-specific arrow instead of an illuminated round lamp', () => {
    const draw = (state, intent, flashOn) => {
      const lines = [], lamps = [];
      const gfx = {
        save() {}, restore() {}, fillRect() {}, strokeRect() {}, beginPath() {}, stroke() {},
        arc(x, y) { this.lastY = y; },
        fill() { lamps.push({ y: this.lastY, color: this.fillStyle }); },
        moveTo(x, y) { lines.push([x, y]); }, lineTo(x, y) { lines.push([x, y]); },
      };
      RR.drawDrivingSignalLamps(gfx, state, 100, 100, intent, flashOn);
      return { lines, lamps, gfx };
    };
    expect(draw('flashing_yellow', 'left', false).lines).toHaveLength(0);
    expect(draw('green_arrow', 'left', false).lines).toHaveLength(5);
    const round = draw('green', 'straight');
    expect(round.lines).toHaveLength(0);
    expect(round.lamps.filter(lamp => lamp.color === '#22c55e')).toHaveLength(1);
    for (const state of ['green_arrow', 'flashing_yellow']) {
      const left = draw(state, 'left'), right = draw(state, 'right');
      expect(left.lines).toHaveLength(5);
      expect(left.lines[0][0]).toBeGreaterThan(left.lines[1][0]);
      expect(right.lines[0][0]).toBeLessThan(right.lines[1][0]);
      expect(left.lamps.every(lamp => lamp.color === '#1e293b')).toBe(true);
    }
  });
});
