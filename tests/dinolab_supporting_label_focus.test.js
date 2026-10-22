import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.env.DINO_PAIR_LABEL_SOURCE || 'stem_lab/stem_tool_dinolab.js'), 'utf8').replace(/\r\n/g, '\n');
const start = source.indexOf('  function dinoBodyLabelLayout('), end = source.indexOf('  function dinoStudyBounds(', start);
const layout = new Function(source.slice(start, end) + '\nreturn dinoBodyLabelLayout;')();
function verify(items, points, width, height, top, bottom) {
  for (const item of items) {
    const actual = points.find(point => point.id === item.id);
    expect([item.anchorX, item.anchorY]).toEqual([actual.x, actual.y]);
    expect(item.x).toBeGreaterThanOrEqual(8); expect(item.x + item.width).toBeLessThanOrEqual(width - 8);
    expect(item.y).toBeGreaterThanOrEqual(top); expect(item.y + item.height).toBeLessThanOrEqual(height - bottom);
    for (const point of points) expect(point.x > item.x && point.x < item.x + item.width && point.y > item.y && point.y < item.y + item.height).toBe(false);
  }
  for (let a = 0; a < items.length; a++) for (let b = a + 1; b < items.length; b++) {
    const one = items[a], two = items[b];
    expect(one.x + one.width <= two.x || two.x + two.width <= one.x || one.y + one.height <= two.y || two.y + two.height <= one.y).toBe(true);
  }
}

describe('Both endpoints receive a safe supporting-trace callout', () => {
  it('keeps an unselected partner near the readouts without changing its real projected position or selected style', () => {
    const points = [{ id: 'knee', x: 180, y: 50, width: 110, height: 44 }, { id: 'ankle', x: 200, y: 180, width: 114, height: 44 }];
    const plain = layout(points, 390, 520, 100, 18, 'ankle'); expect(plain.map(item => item.id)).toEqual(['ankle']);
    const pair = layout(points, 390, 520, 100, 18, 'ankle', [], ['knee', 'ankle'], ['knee', 'ankle']);
    expect(pair.map(item => item.id).sort()).toEqual(['ankle', 'knee']);
    expect(pair.find(item => item.id === 'knee').selected).toBe(false); expect(pair.find(item => item.id === 'ankle').selected).toBe(true);
    verify(pair, points, 390, 520, 100, 18);
  });

  it('keeps two closely spaced endpoints readable across selection changes and phone/desktop sizes', () => {
    for (const [width, height, top] of [[320, 420, 96], [390, 520, 100], [1280, 720, 90]]) {
      const points = [{ id: 'knee', x: width * .48, y: top + 85, width: 110, height: 44 }, { id: 'ankle', x: width * .48 + 5, y: top + 90, width: 114, height: 44 }];
      const snapshot = JSON.stringify(points); let previous = [];
      for (const selected of ['knee', 'ankle', 'knee']) {
        const pair = layout(points, width, height, top, 18, selected, previous, ['knee', 'ankle'], ['knee', 'ankle']);
        expect(pair).toHaveLength(2); expect(pair.filter(item => item.selected).map(item => item.id)).toEqual([selected]);
        verify(pair, points, width, height, top, 18); previous = pair;
      }
      expect(JSON.stringify(points)).toBe(snapshot);
    }
  });

  it('still omits genuine offscreen or impossible anchors and keeps default layout behavior opt-in', () => {
    const points = [{ id: 'knee', x: -5, y: 70 }, { id: 'ankle', x: 200, y: 180 }];
    const pair = layout(points, 390, 520, 100, 18, 'ankle', [], null, ['knee', 'ankle']);
    expect(pair.map(item => item.id)).toEqual(['ankle']);
    expect(layout(points, 90, 150, 80, 80, 'ankle', [], null, ['knee', 'ankle'])).toEqual([]);
    const visible = [{ id: 'knee', x: 180, y: 160 }, { id: 'ankle', x: 220, y: 230 }];
    expect(layout(visible, 390, 520, 100, 18, 'ankle')).toEqual(layout(visible, 390, 520, 100, 18, 'ankle', undefined, undefined, undefined));
  });

  it('passes pair focus to the actual renderer call and leaves ordinary views without a focus list', () => {
    const call = source.split('\n').find(line => line.startsWith('              var layouts = dinoBodyLabelLayout('));
    const run = new Function('dinoBodyLabelLayout', 'points', 'width', 'height', 'top', 'bottom', 'selectedBodyPartRef', 'previousBodyLabels', 'pairVisible', 'relation', 'cameraStudy', 'dinoInitialBodyLabelPriority', 'shapeLensVisible', 'shapeLensIds', call + '\nreturn layouts;');
    const mock = vi.fn(() => []), relation = { ids: ['knee', 'ankle'] };
    run(mock, [], 390, 520, 100, 18, { current: 'ankle' }, [], true, relation, 'body', () => [], false, []);
    expect(mock.mock.calls.at(-1)).toHaveLength(9); expect(mock.mock.calls.at(-1).at(-1)).toBe(relation.ids);
    run(mock, [], 390, 520, 100, 18, { current: 'ankle' }, [], false, null, 'body', () => [], false, []);
    expect(mock.mock.calls.at(-1).at(-1)).toBeNull();
  });
});
