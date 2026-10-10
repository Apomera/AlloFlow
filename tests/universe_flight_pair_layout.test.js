import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync('stem_lab/stem_tool_universe.js', 'utf8');
const start = source.indexOf('  function universeFlightPairPanelLayout(');
const end = source.indexOf('  function UniverseFlightPairDepth(', start);
if (start < 0 || end < start) throw new Error('Paired landmark panel layout unavailable');
const layout = vm.runInNewContext(source.slice(start, end) + '\nuniverseFlightPairPanelLayout;', { Math, Number, Array });

function intersection(rect, obstacle) {
  const x1 = rect.left > obstacle.left ? rect.left : obstacle.left;
  const x2 = rect.right < obstacle.right ? rect.right : obstacle.right;
  const y1 = rect.top > obstacle.top ? rect.top : obstacle.top;
  const y2 = rect.bottom < obstacle.bottom ? rect.bottom : obstacle.bottom;
  return x2 <= x1 || y2 <= y1 ? 0 : (x2 - x1) * (y2 - y1);
}

describe('Paired landmark panel placement', () => {
  it('finds the clear center between diagonal landmark markers when both sides are obstructed', () => {
    const obstacles = [
      { left: 760, top: 145, right: 815, bottom: 200, weight: 20 },
      { left: 126, top: 480, right: 178, bottom: 534, weight: 20 },
    ];
    const result = layout(940, 680, 220, 430, obstacles, 'bottom-right', false);
    expect(result).toEqual({ key: 'bottom-center', left: 360, top: 156, score: 0 });
    const rect = { left: result.left, top: result.top, right: result.left + 220, bottom: result.top + 430 };
    expect(obstacles.map(obstacle => intersection(rect, obstacle))).toEqual([0, 0]);
  });

  it('uses the clear top corner when a broad lower landmark region obstructs every bottom dock', () => {
    const obstacles = [{ left: 0, top: 450, right: 940, bottom: 540, weight: 3 }];
    expect(layout(940, 680, 220, 200, obstacles, null, false))
      .toEqual({ key: 'top-right', left: 708, top: 120, score: 0 });
  });

  it('minimizes weighted overlap area when no dock is completely clear', () => {
    const obstacles = [
      { left: 0, top: 0, right: 400, bottom: 500, weight: 1 },
      { left: 288, top: 0, right: 388, bottom: 500, weight: 3 },
      { left: 150, top: 0, right: 250, bottom: 500, weight: 2 },
      { left: 12, top: 120, right: 112, bottom: 220, weight: 1 },
    ];
    const result = layout(400, 500, 100, 100, obstacles, 'top-left', false);
    expect(result).toEqual({ key: 'bottom-left', left: 12, top: 306, score: 10000 });
    const rect = { left: 12, top: 306, right: 112, bottom: 406 };
    expect(obstacles.reduce((sum, obstacle) => sum + intersection(rect, obstacle) * obstacle.weight, 0)).toBe(result.score);
  });

  it('retains each current dock on equal scores and otherwise starts at bottom-right', () => {
    for (const current of ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right']) {
      expect(layout(940, 680, 220, 200, [], current, false).key).toBe(current);
    }
    for (const current of [undefined, null, '', 'not-a-dock']) {
      expect(layout(940, 680, 220, 200, [], current, false).key).toBe('bottom-right');
    }
    const wholeStage = [{ left: 0, top: 0, right: 940, bottom: 680, weight: 1 }];
    expect(layout(940, 680, 220, 200, wholeStage, 'top-left', false).key).toBe('top-left');
  });

  it('stays finite and contained across tiny, phone, desktop and fullscreen sizes', () => {
    for (const width of [1, 12, 23, 120, 240, 320, 940, 2560]) {
      for (const height of [1, 32, 94, 200, 400, 680]) {
        for (const fullscreen of [false, true]) {
          for (const fraction of [.1, .5, 1]) {
            const panelWidth = Math.min(220, width * fraction), panelHeight = Math.min(300, height * fraction);
            const result = layout(width, height, panelWidth, panelHeight, [], null, fullscreen);
            expect(result).not.toBeNull();
            expect([result.left, result.top, result.score].every(Number.isFinite)).toBe(true);
            expect(result.left).toBeGreaterThanOrEqual(0);
            expect(result.top).toBeGreaterThanOrEqual(0);
            expect(result.left + panelWidth).toBeLessThanOrEqual(width + 1e-9);
            expect(result.top + panelHeight).toBeLessThanOrEqual(height + 1e-9);
            if (width - panelWidth >= 24) {
              expect(result.left).toBeGreaterThanOrEqual(12);
              expect(result.left + panelWidth).toBeLessThanOrEqual(width - 12 + 1e-9);
            }
            const bottomReserve = fullscreen ? 148 : 94;
            if (!(fullscreen && width >= 520 && height < 480) && height - panelHeight >= 120 + bottomReserve) {
              expect(result.top).toBeGreaterThanOrEqual(120);
              expect(result.top + panelHeight).toBeLessThanOrEqual(height - bottomReserve + 1e-9);
            }
          }
        }
      }
    }
    expect(layout(940, 680, 220, 200, [], null, false).top).toBe(386);
    expect(layout(940, 680, 220, 200, [], null, true).top).toBe(332);
  });

  it('keeps short landscape fullscreen cards centered away from side controls', () => {
    const bottom = layout(640, 320, 220, 200, [], null, true);
    expect(bottom).toEqual({ key: 'bottom-center', left: 210, top: 108, score: 0 });
    expect(layout(640, 320, 220, 200, [], 'bottom-right', true)).toEqual(bottom);
    const top = layout(640, 320, 220, 200, [], 'top-center', true);
    expect(top).toEqual({ key: 'top-center', left: 210, top: 12, score: 0 });
    const sideControls = [
      { left: 0, top: 0, right: 148, bottom: 320 },
      { left: 492, top: 0, right: 640, bottom: 320 },
    ];
    for (const result of [top, bottom]) {
      const rect = { left: result.left, top: result.top, right: result.left + 220, bottom: result.top + 200 };
      expect(sideControls.map(obstacle => intersection(rect, obstacle))).toEqual([0, 0]);
      expect(rect.top).toBeGreaterThanOrEqual(12);
      expect(rect.bottom).toBeLessThanOrEqual(308);
    }
    const highLandmark = [{ left: 210, top: 12, right: 430, bottom: 52, weight: 20 }];
    expect(layout(640, 320, 220, 200, highLandmark, 'top-center', true)).toEqual(bottom);
    expect(layout(520, 479, 220, 200, [], null, true).key).toBe('bottom-center');
    expect(layout(519, 320, 220, 200, [], null, true).key).toBe('bottom-right');
    expect(layout(640, 480, 220, 200, [], null, true).key).toBe('bottom-right');
    expect(layout(640, 320, 220, 200, [], null, false).key).toBe('bottom-right');
  });

  it('pins oversized cards to the origin on each overflowing axis and keeps extreme weights finite', () => {
    expect(layout(100, 80, 220, 300, [], null, false))
      .toEqual({ key: 'bottom-right', left: 0, top: 0, score: 0 });
    const result = layout(940, 680, 220, 200, [{ left: 0, top: 0, right: 940, bottom: 680, weight: Number.MAX_VALUE }], null, false);
    expect(result.score).toBe(Number.MAX_VALUE);
  });

  it('rejects unsafe dimensions and ignores malformed obstacles without mutating inputs', () => {
    const dimensions = [940, 680, 220, 200];
    for (const invalid of [undefined, null, '', '320', NaN, Infinity, -Infinity, 0, -1]) {
      for (let index = 0; index < dimensions.length; index++) {
        const args = dimensions.slice(); args[index] = invalid;
        expect(layout(...args, [], null, false)).toBeNull();
      }
    }
    expect(layout(1e308, 1e308, 220, 200, [], null, false)).toBeNull();
    expect(layout(940, 680, 1e308, 1e308, [], null, false)).toBeNull();
    const invalidBlocks = [null, {}, { left: 12, top: 120, right: 50, bottom: 150 },
      ...[0, -1, Infinity, NaN, '2'].map(weight => ({ left: 12, top: 120, right: 50, bottom: 150, weight })),
      { left: 50, top: 120, right: 12, bottom: 150, weight: 1 },
      { left: 12, top: 150, right: 50, bottom: 120, weight: 1 },
      { left: Infinity, top: 120, right: 50, bottom: 150, weight: 1 }];
    const frozen = Object.freeze(invalidBlocks.map(item => item && Object.freeze(item)));
    expect(() => layout(...dimensions, frozen, 'top-left', false)).not.toThrow();
    expect(layout(...dimensions, frozen, 'top-left', false)).toEqual(layout(...dimensions, [], 'top-left', false));
    expect(layout(...dimensions, null, 'top-left', false)).toEqual(layout(...dimensions, [], 'top-left', false));
    const valid = Object.freeze([{ left: 760, top: 145, right: 815, bottom: 200, weight: 20 }].map(Object.freeze));
    const before = JSON.stringify(valid);
    layout(...dimensions, valid, 'top-left', false);
    expect(JSON.stringify(valid)).toBe(before);
  });
});
