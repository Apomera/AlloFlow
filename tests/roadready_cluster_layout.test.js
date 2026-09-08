import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let RR;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_roadready.js', 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
});

describe('Road Ready driving cluster', () => {
  it.each([320, 360, 390, 560, 768, 1100, 1920])('keeps instruments separated and turn arrows visible at %i px', width => {
    const layout = RR.drivingClusterLayout(width, 780);
    const columns = [layout.speed, layout.gear, layout.fuel, layout.score];
    expect(layout.top).toBe(684);
    columns.forEach((column, index) => {
      expect(column.x).toBeGreaterThanOrEqual(12);
      expect(column.width).toBeGreaterThanOrEqual(44);
      expect(column.x + column.width).toBeLessThanOrEqual(width - 12);
      if (index) expect(column.x - columns[index - 1].x - columns[index - 1].width).toBeGreaterThanOrEqual(9.9);
    });
    expect(layout.leftSignalX - 8).toBeGreaterThan(0);
    expect(layout.rightSignalX + 8).toBeLessThan(width);
  });

  it('uses readable instrument labels and preserves zero fuel instead of painting a full bar', () => {
    const labels = [], rectangles = [];
    const gfx = {
      save() {}, restore() {}, beginPath() {}, rect() {}, roundRect() {}, fill() {},
      moveTo() {}, lineTo() {}, closePath() {},
      createLinearGradient() { return { addColorStop() {} }; },
      fillRect(x, y, width, height) { rectangles.push({ x, y, width, height }); },
      fillText(text) { labels.push(String(text)); },
    };
    const layout = RR.drawDrivingCluster(gfx, 390, 780, {
      speedMph: 105, limitMph: 65, gear: 'R', fuelFraction: 0,
      electric: true, safety: 82, eco: 70, elapsed: 65, distance: 1000,
      blinker: -1, blinkOn: true,
    });
    for (const text of ['105', 'LIMIT', '65', 'Reverse', 'BATTERY', '0%', 'SAFETY', 'LOW BATTERY']) {
      expect(labels).toContain(text);
    }
    expect(labels).not.toContain('ECO');
    labels.length = 0;
    RR.drawDrivingCluster(gfx, 390, 780, { fuelFraction: 0, warnings: ['HYDROPLANING', 'BRAKE'] });
    expect(labels).toContain('HYDROPLANING');
    expect(labels).not.toContain('LOW FUEL');
    expect(rectangles.find(rect => rect.x === layout.fuel.x && rect.width === 0)).toBeTruthy();
  });
});
