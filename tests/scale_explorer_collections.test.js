import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(process.env.SCALE_COLLECTION_SOURCE || 'stem_lab/stem_tool_scaleexplorer.js', 'utf8');
const sandbox = { window: { StemLab: { registerTool() {} } }, console: { log() {} } };
vm.runInNewContext(source.replace("  window.StemLab.registerTool('scaleExplorer', {",
  "  window.collection = { read: readDrawing, rows: drawingCollection, fit: fitDrawingPlan, model: drawingModel, svg: drawingSvg, measure: inquiryMeasurement, items: ITEMS };\n  window.StemLab.registerTool('scaleExplorer', {"), sandbox);
const { read, rows, fit, model, svg, measure, items } = sandbox.window.collection;
const by = Object.fromEntries(items.map(item => [item.id, item]));
const plan = { reference: { id: 'earth' }, target: { id: 'moon' }, size: '10', unit: 'cm', note: 'My collection plan.' };
const additions = ['jupiter', 'sun', 'human', 'rbc', 'dna', 'trex'].map(id => ({ id }));
function drawing(p) { return model(measure(p.reference), measure(p.target), p.size, p.unit); }
function labels(m, extras) {
  const measurements = rows(m, extras);
  return { title: 'Scale Explorer · model collection', description: '<b>Literal collection</b> & "notes"\u0000', scale: 'One shared model scale.',
    names: measurements.map(row => row.item.name), real: measurements.map(row => row.item.size + ' m · ' + row.item.dim),
    mapped: measurements.map(row => row.mm + ' mm'), calibration: '10 mm calibration ruler', print: 'Print at 100% scale.',
    scope: 'Each line represents its stated dimension. Dashed locators mark dimensions below 0.5 mm without enlarging them.', offPage: 'Continues beyond the page' };
}
function xml(p) { const m = drawing(p); return new DOMParser().parseFromString(svg(m, labels(m, p.extras), p.extras), 'image/svg+xml'); }

describe('Scale Explorer drawing collections', () => {
  it('keeps legacy two-measurement plans and their physical sheet dimensions compatible', () => {
    const legacy = read(plan, true);
    expect(legacy.extras).toEqual([]); expect(rows(drawing(legacy))).toHaveLength(2);
    const doc = xml(legacy);
    expect(doc.querySelector('parsererror')).toBeNull(); expect(doc.documentElement.getAttribute('width')).toBe('210mm');
    expect(doc.documentElement.getAttribute('height')).toBe('145mm'); expect(doc.documentElement.getAttribute('viewBox')).toBe('0 0 210 145');
    expect(doc.querySelector('[data-drawing-calibration]').getAttribute('d')).toBe('M15 103v4m0-2h10m0-2v4');
    expect(read(null, false).extras).toEqual([]); expect(read({ ...plan, size: '0' }, true)).toBeNull();
  });

  it('bounds damaged collections, removes duplicate measurements and reconstructs trusted dimensions', () => {
    const extras = [{ id: 'earth' }, { id: 'moon' }, null, [], { id: '__proto__' }, { id: 'jupiter', size: 999, dim: 'fake' },
      { id: 'jupiter' }, { id: 'human', size: 1.23, you: true }, { id: 'human', size: 1.23, you: true }, ...additions, { id: 'proton' }];
    const result = read({ ...plan, extras }, true);
    expect(result.extras.map(item => item.id)).toEqual(['jupiter', 'human', 'sun', 'human', 'rbc', 'dna']);
    expect(result.extras[0]).toEqual({ id: 'jupiter', size: by.jupiter.size, you: false });
    expect(result.extras[1]).toEqual({ id: 'human', size: 1.23, you: true });
    expect(result.extras[3]).toEqual({ id: 'human', size: 1.7, you: false });
    for (const invalid of [null, false, 'sun', { id: 'sun' }]) expect(read({ ...plan, extras: invalid }, true).extras).toEqual([]);
    expect(read({ ...plan, extras: Array(40).fill(null).concat([{ id: 'sun' }]) }, true).extras).toEqual([]);
    const snapshot = read({ ...plan, extras: additions }, true); extras[5].size = -1;
    expect(snapshot.extras).toHaveLength(6); expect(rows(null, additions)).toEqual([]);
  });

  it('maps all measurements at exactly one scale, retaining positive tiny lengths and overflowing distances', () => {
    const p = read({ ...plan, extras: [{ id: 'proton' }, { id: 'alpha-cen-dist' }, { id: 'human', size: 1.23, you: true }] }, true);
    const m = drawing(p), collection = rows(m, p.extras);
    expect(collection).toHaveLength(5);
    for (const row of collection) expect(row.mm / m.referenceMM / (row.item.size / m.reference.size)).toBeCloseTo(1, 12);
    expect(collection[2].mm).toBeGreaterThan(0); expect(collection[2].mm).toBeLessThan(1e-15);
    expect(collection[3].item.dim).toBe('distance'); expect(collection[3].mm).toBeGreaterThan(180);
    expect(collection[4].item.size).toBe(1.23);
  });

  it('fits all eight measurements without losing originals, mutating saved state or depending on a valid draft size', () => {
    const original = read({ ...plan, extras: additions, size: '0' }, false), before = JSON.stringify(original), result = fit(original);
    expect(JSON.stringify(original)).toBe(before); expect(result.reference.id).toBe('sun'); expect(result.target.id).toBe('moon');
    expect(result.size).toBe('16'); expect(result.unit).toBe('cm'); expect(result.note).toBe(plan.note);
    const collection = rows(drawing(result), result.extras);
    expect(collection).toHaveLength(8); expect(collection.map(row => row.item.id).sort()).toEqual(['earth', 'moon', ...additions.map(item => item.id)].sort());
    expect(Math.max(...collection.map(row => row.mm))).toBe(160);
    for (const row of collection) expect(row.mm / 160 / (row.item.size / by.sun.size)).toBeCloseTo(1, 12);
    const heights = read({ ...plan, reference: { id: 'human', size: 1.23, you: true }, target: { id: 'human', size: 1.65, you: true } }, true);
    const pair = fit(heights); expect(pair.reference.size).toBe(1.65); expect(pair.target.size).toBe(1.23);
    const group = fit({ ...heights, extras: [{ id: 'sun' }] });
    expect(rows(drawing(group), group.extras).filter(row => row.item.id === 'human').map(row => row.item.size).sort()).toEqual([1.23, 1.65]);
  });

  it('exports all eight exact dimensions on a calibrated sheet that fits A4 and describes every measurement safely', () => {
    const p = fit({ ...plan, extras: additions }), collection = rows(drawing(p), p.extras), doc = xml(p);
    expect(doc.querySelector('parsererror')).toBeNull(); expect(doc.documentElement.getAttribute('width')).toBe('210mm');
    expect(doc.documentElement.getAttribute('height')).toBe('283mm'); expect(doc.documentElement.getAttribute('viewBox')).toBe('0 0 210 283');
    const lines = Array.from(doc.querySelectorAll('[data-drawing-measure]')); expect(lines).toHaveLength(8);
    lines.forEach((line, index) => {
      expect(line.getAttribute('data-drawing-item')).toBe(collection[index].item.id); expect(line.getAttribute('transform')).toBe('translate(15 0)');
      expect(Number(line.getAttribute('x2')) - Number(line.getAttribute('x1'))).toBe(collection[index].mm);
      expect(doc.querySelector('desc').textContent).toContain(collection[index].item.name + ': ' + collection[index].item.size + ' m');
      const heading = Array.from(doc.querySelectorAll('text')).find(text => text.textContent.startsWith((index + 1) + '. '));
      expect(Number(heading.getAttribute('y'))).toBe(38 + index * 24);
      if (index > 0) expect(Number(heading.getAttribute('y')) - (Number(lines[index - 1].getAttribute('y1')) + 7)).toBeGreaterThanOrEqual(5);
    });
    expect(doc.querySelector('[data-drawing-calibration]').getAttribute('d')).toContain('h10');
    expect(doc.querySelector('desc').textContent).toContain('<b>Literal collection</b> & "notes"');
    expect(doc.querySelector('desc').textContent).toContain('Print at 100% scale');
    expect(doc.documentElement.getAttribute('aria-describedby')).toBe('drawing-description');
    expect(doc.querySelector('b, script, foreignObject, image')).toBeNull(); expect(doc.documentElement.textContent).not.toContain('undefined');
    expect(doc.querySelectorAll('[data-drawing-locator]').length).toBeGreaterThan(0);
  });

  it('preserves collection distances, page-edge markers, and independently captured saved heights', () => {
    const p = read({ ...plan, extras: [{ id: 'alpha-cen-dist' }, { id: 'proton' }, { id: 'human', size: 1.23, you: true }] }, true), saved = JSON.stringify(p);
    const draft = read(p, false); draft.extras.sort((a, b) => a.size - b.size); draft.extras[1].size = 1.65; draft.note = 'New draft.';
    expect(JSON.stringify(p)).toBe(saved);
    const doc = xml(p), distance = doc.querySelector('[data-drawing-item="alpha-cen-dist"]');
    expect(distance.getAttribute('stroke-dasharray')).toBe('2 2'); expect(distance.getAttribute('x2')).toBe('180');
    expect(Number(distance.getAttribute('data-model-mm'))).toBeGreaterThan(180); expect(doc.querySelector('[data-drawing-off-page="2"]')).not.toBeNull();
    const proton = doc.querySelector('[data-drawing-item="proton"]'); expect(Number(proton.getAttribute('x2'))).toBeGreaterThan(0);
    expect(doc.querySelector('[data-drawing-locator="3"]')).not.toBeNull(); expect(doc.querySelector('desc').textContent).toContain('1.23 m');
    expect(p.extras[2].size).toBe(1.23);
  });
});
