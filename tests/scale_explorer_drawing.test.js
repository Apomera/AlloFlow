import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(process.env.SCALE_DRAWING_SOURCE || 'stem_lab/stem_tool_scaleexplorer.js', 'utf8');
const sandbox = { window: { StemLab: { registerTool() {} } }, console: { log() {} } };
vm.runInNewContext(source.replace("  window.StemLab.registerTool('scaleExplorer', {",
  "  window.drawing = { size: validDrawingSize, model: drawingModel, span: drawingSpan, read: readDrawing, svg: drawingSvg, items: ITEMS };\n  window.StemLab.registerTool('scaleExplorer', {"), sandbox);
const { size, model, span, read, svg, items } = sandbox.window.drawing;
const by = Object.fromEntries(items.map(item => [item.id, item]));
const labels = { title: 'Scale Explorer · scale drawing', description: '<b>Literal plan</b> & "notes"\u0000', scale: 'One model centimetre represents a real measurement.',
  names: ['Earth & reference', 'The Moon'], real: ['1.3 × 10⁷ m · across', '3.5 × 10⁶ m · across'], mapped: ['100 mm', '27.3 mm'],
  offPage: 'Continues beyond the page', calibration: '10 mm calibration ruler', print: 'Print at 100% scale.', scope: 'Lengths, not positions.' };

describe('Scale Explorer physical drawing model', () => {
  it('validates complete positive measurements and exact unit conversions within its supported physical range', () => {
    expect(size('10', 'cm')).toBe(100); expect(size(1, 'in')).toBe(25.4); expect(size('.001', 'm')).toBe(1);
    expect(size('1e-6', 'mm')).toBe(1e-6); expect(size('1e6', 'mm')).toBe(1e6);
    for (const value of ['', ' ', null, false, [], {}, '0x10', '2 cm', '-1', '0', '9e-7', '1e7', Infinity, NaN]) expect(size(value, 'mm')).toBeNull();
    for (const unit of ['__proto__', 'constructor', 'ft', null, [], ['cm'], {}]) expect(size(1, unit)).toBeNull();
  });

  it('uses one physical scale for the reference and target, including magnification, distance and every catalog pair', () => {
    const earthMoon = model(by.earth, by.moon, 10, 'cm');
    expect(earthMoon.referenceMM).toBe(100); expect(earthMoon.targetMM).toBeCloseTo(100 * 3475000 / 12742000, 12);
    expect(earthMoon.scale).toBeCloseTo(.1 / 12742000, 15);
    expect(model(by.human, by.human, 2, 'in').targetMM).toBe(50.8);
    expect(model(by.dna, by.rbc, 1, 'cm').scale).toBeGreaterThan(1);
    expect(model(by.sun, by['alpha-cen-dist'], 10, 'cm').targetMM).toBeGreaterThan(180);
    for (const a of items) for (const b of items) {
      const result = model(a, b, 10, 'cm');
      expect(result, a.id + '/' + b.id).not.toBeNull();
      expect(result.targetMM / result.referenceMM / (b.size / a.size)).toBeCloseTo(1, 12);
      expect(Number.isFinite(result.targetMM)).toBe(true);
    }
    for (const a of [null, { size: -1 }, { size: '1' }, { size: Infinity }]) expect(model(a, by.earth, 1, 'cm')).toBeNull();
    expect(model({ size: 1e-308 }, { size: 1e308 }, 1, 'cm')).toBeNull();
  });

  it('clips only the visible segment and marks unresolved lengths without expanding their dimensions', () => {
    expect(span(100)).toEqual({ length: 100, offPage: false, unresolved: false });
    expect(span(180)).toEqual({ length: 180, offPage: false, unresolved: false });
    expect(span(181)).toEqual({ length: 180, offPage: true, unresolved: false });
    expect(span(1e-40)).toEqual({ length: 1e-40, offPage: false, unresolved: true });
  });

  it('reconstructs catalog dimensions and personal height while rejecting invalid completed plans', () => {
    expect(read(null, true)).toBeNull(); expect(read([], true)).toBeNull();
    expect(read(null, false)).toMatchObject({ size: '10', unit: 'cm', reference: { id: 'earth' }, target: { id: 'moon' } });
    const plan = { reference: { id: 'human', size: 1.23, you: true }, target: { id: 'trex', size: 999 }, size: '2', unit: 'in', note: 'x'.repeat(1300) };
    const saved = read(plan, true);
    expect(saved.reference).toEqual({ id: 'human', size: 1.23, you: true }); expect(saved.target.size).toBe(by.trex.size);
    expect(saved.note).toHaveLength(1200); expect(model(saved.reference, saved.target, saved.size, saved.unit).referenceMM).toBe(50.8);
    for (const invalid of [{ ...plan, size: '' }, { ...plan, size: false }, { ...plan, unit: ['cm'] }, { ...plan, reference: { id: '__proto__' } }, { ...plan, target: null }]) expect(read(invalid, true)).toBeNull();
    expect(read({ ...plan, size: 'incomplete' }, false).size).toBe('incomplete');
  });

  it('exports standalone physical millimetres, exact dimension endpoints, calibration and literal safe descriptions', () => {
    const m = model(by.earth, by.moon, 10, 'cm'), xml = svg(m, labels), doc = new DOMParser().parseFromString(xml, 'image/svg+xml');
    expect(doc.querySelector('parsererror')).toBeNull(); expect(doc.querySelector('svg').getAttribute('width')).toBe('210mm');
    const dimension = doc.querySelector('[data-drawing-measure="1"]');
    expect(Number(dimension.getAttribute('x2')) - Number(dimension.getAttribute('x1'))).toBeCloseTo(m.targetMM, 12);
    expect(doc.querySelector('[data-drawing-calibration="10"]')).not.toBeNull();
    expect(doc.querySelector('desc').textContent).toContain('<b>Literal plan</b> & "notes"');
    expect(doc.querySelector('desc').textContent).toContain('The Moon: 3.5 × 10⁶ m · across → 27.3 mm');
    expect(doc.documentElement.getAttribute('aria-describedby')).toBe('drawing-description');
    expect(doc.querySelector('b, script, foreignObject, image')).toBeNull(); expect(xml).not.toContain('\u0000');
    expect(doc.documentElement.textContent).toContain('Earth & reference'); expect(svg(null, labels)).toBe('');
  });

  it('exports explicit overflow, tiny-length locators and dashed distance dimensions at the same scale', () => {
    const tiny = new DOMParser().parseFromString(svg(model(by.earth, by.proton, 10, 'cm'), labels), 'image/svg+xml');
    expect(tiny.querySelector('[data-drawing-locator="1"]')).not.toBeNull();
    expect(Number(tiny.querySelector('[data-drawing-measure="1"]').getAttribute('data-model-mm'))).toBeLessThan(1e-15);
    expect(Number(tiny.querySelector('[data-drawing-measure="1"]').getAttribute('x2'))).toBeGreaterThan(0);
    const distant = new DOMParser().parseFromString(svg(model(by.sun, by['alpha-cen-dist'], 10, 'cm'), labels), 'image/svg+xml');
    const line = distant.querySelector('[data-drawing-measure="1"]');
    expect(line.getAttribute('x2')).toBe('180'); expect(line.getAttribute('transform')).toBe('translate(15 0)'); expect(line.getAttribute('stroke-dasharray')).toBe('2 2');
    expect(distant.querySelector('[data-drawing-off-page="1"]')).not.toBeNull();
    expect(distant.documentElement.textContent).toContain('Continues beyond the page');
  });
});
