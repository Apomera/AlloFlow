import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js', 'utf8').replace(/\r\n/g, '\n');
const start = source.indexOf('        function layoutCLAnatomyLabels('), end = source.indexOf('        // End measured callout packing.', start);
assert.ok(start >= 0 && end > start, 'Execute the production inspection callout layout');
const layout = new Function(source.slice(start, end) + ';return layoutCLAnatomyLabels;')();
const names = ['Mantle', 'Eight arms', 'Eye', 'Feeding tentacles', 'Fin'];
const items = (x, y, heights = [24, 24, 24, 24, 24]) => names.map((name, index) => ({ name, index, x, y, width: [59.35, 78.91, 38.62, 120.46, 36.28][index], height: heights[index] }));

function readable(rows, expected, bounds) {
  assert.equal(rows.length, expected.length, 'Every physically eligible label remains readable');
  for (const row of rows) {
    const original = expected.find(item => item.index === row.index);
    assert.ok(original);
    assert.equal(row.anchorX, original.x); assert.equal(row.anchorY, original.y);
    assert.ok(Object.values(row).every(Number.isFinite), 'Positions, dimensions and leaders are finite');
    assert.ok(row.left >= bounds.left && row.top >= bounds.top, 'No title or left clipping');
    assert.ok(row.left + row.width <= bounds.right && row.top + row.height <= bounds.bottom, 'No toolbar or right clipping');
    assert.ok(row.endX >= row.left && row.endX <= row.left + row.width && row.endY >= row.top && row.endY <= row.top + row.height, 'Leader ends on its own label');
  }
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
    const a = rows[i], b = rows[j];
    assert.ok(a.left + a.width + 6.99 <= b.left || b.left + b.width + 6.99 <= a.left || a.top + a.height + 6.99 <= b.top || b.top + b.height + 6.99 <= a.top, 'Callouts retain a visible gap');
  }
}

describe('Cephalopod specimen inspection callouts', () => {
  it('separates Fin and Mantle even when all five anatomy anchors coincide on a phone', () => {
    const bounds = { left: 12, right: 308, top: 112, bottom: 350 }, inputs = items(165, 236), before = structuredClone(inputs);
    readable(layout(inputs, bounds), inputs, bounds); assert.deepEqual(inputs, before, 'The layout never moves anatomy anchors');
  });
  it('balances rail capacity for wrapped larger text in a short landscape safe region', () => {
    const bounds = { left: 12, right: 832, top: 105, bottom: 195 }, inputs = items(420, 180, [24.3, 24.3, 24.3, 44.6, 24.3]);
    readable(layout(inputs, bounds), inputs, bounds);
  });
  it('keeps edge anchors exact while clamping complete labels beneath the title and above the toolbar', () => {
    const bounds = { left: 12, right: 378, top: 106, bottom: 670 }, inputs = items(0, 844);
    readable(layout(inputs, bounds), inputs, bounds);
  });
  it('keeps a continuous clear center between both measured side rails on desktop', () => {
    const bounds = { left: 12, right: 1268, top: 108, bottom: 912 }, inputs = items(640, 460), rows = layout(inputs, bounds);
    readable(rows, inputs, bounds);
    for (const row of rows) assert.ok(row.left + row.width < 180 || row.left > 1100, 'Labels remain outside the centered specimen');
  });
  it('returns identical positions for repeated orbit frames and follows a changed title or toolbar extent', () => {
    const bounds = { left: 12, right: 308, top: 112, bottom: 350 }, inputs = items(165, 236), first = layout(inputs, bounds);
    assert.deepEqual(layout(inputs, bounds), first);
    const resized = { ...bounds, top: 152, bottom: 300 }; readable(layout(inputs, resized), inputs, resized);
  });
  it('avoids drawing clipped or colliding labels when the native safe region cannot fit them', () => {
    assert.deepEqual(layout(items(165, 236), { left: 12, right: 308, top: 112, bottom: 130 }), []);
    assert.deepEqual(layout(items(165, 236), { left: 12, right: 12, top: 112, bottom: 350 }), []);
    assert.deepEqual(layout([{ index: 0, x: NaN, y: 1, width: 40, height: 24 }], { left: 12, right: 308, top: 112, bottom: 350 }), []);
  });
});
