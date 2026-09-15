// Vision-reported figure boxes for the fallback crop (2026-09-14, NCES tables pilot observation 7).
//
// A vector chart has no image XObject, so the only crop path left was a blind band chosen by
// "top/middle/bottom"; its 24x24 near-uniform gate then rejected sparse line and bar charts on
// white as solid fills and shipped text placeholders ("Skipped near-uniform fallback crop on
// page 20 (middle)"). The image inventory now asks the model for each figure's bounding box as
// page fractions; a sane box is cropped with a 1% margin and judged with the non-strict gate,
// and the blind band with its strict gate remains the last resort.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const start = source.indexOf('var _alloImageBbox = function (img) {');
const end = source.indexOf('\n};', start);
if (start < 0 || end < 0) throw new Error('_alloImageBbox not found');
const bbox = new Function(source.slice(start, end + 3) + '\nreturn _alloImageBbox;')();

describe('_alloImageBbox', () => {
  it('accepts a fractional [left, top, right, bottom] array', () => {
    expect(bbox({ bbox: [0.08, 0.34, 0.92, 0.62] })).toEqual({ x0: 0.08, y0: 0.34, x1: 0.92, y1: 0.62 });
  });
  it('accepts object spellings, numeric strings, swapped corners and 0-100 percentages', () => {
    expect(bbox({ bbox: { left: 0.1, top: 0.2, right: 0.9, bottom: 0.7 } })).toEqual({ x0: 0.1, y0: 0.2, x1: 0.9, y1: 0.7 });
    expect(bbox({ boundingBox: { x0: '0.1', y0: '0.2', x1: '0.9', y1: '0.7' } })).toEqual({ x0: 0.1, y0: 0.2, x1: 0.9, y1: 0.7 });
    expect(bbox({ bbox: [0.9, 0.7, 0.1, 0.2] })).toEqual({ x0: 0.1, y0: 0.2, x1: 0.9, y1: 0.7 });
    expect(bbox({ bbox: [10, 20, 90, 70] })).toEqual({ x0: 0.1, y0: 0.2, x1: 0.9, y1: 0.7 });
  });
  it('clamps a box that barely leaves the page and rejects one that is clearly outside', () => {
    expect(bbox({ bbox: [-0.005, 0.3, 1.005, 0.6] })).toEqual({ x0: 0, y0: 0.3, x1: 1, y1: 0.6 });
    expect(bbox({ bbox: [0.2, 0.3, 1.3, 0.6] })).toBeNull();
    expect(bbox({ bbox: [-0.2, 0.3, 0.8, 0.6] })).toBeNull();
  });
  it('rejects slivers, whole-page boxes, malformed values and missing boxes', () => {
    expect(bbox({ bbox: [0.1, 0.5, 0.14, 0.9] })).toBeNull(); // 4% wide
    expect(bbox({ bbox: [0.1, 0.5, 0.9, 0.53] })).toBeNull(); // 3% tall
    expect(bbox({ bbox: [0.1, 0.5, 0.2, 0.6] })).toBeNull(); // 1% of the page
    expect(bbox({ bbox: [0.01, 0.01, 0.99, 0.99] })).toBeNull(); // 96% of the page
    expect(bbox({ bbox: [0.1, 0.2, 0.9] })).toBeNull();
    expect(bbox({ bbox: [0.1, 'wide', 0.9, 0.7] })).toBeNull();
    expect(bbox({ bbox: null })).toBeNull();
    expect(bbox({ position: 'middle' })).toBeNull();
    expect(bbox(null)).toBeNull();
  });
});

describe('the image inventory asks for the box and the fallback crop uses it', () => {
  it('prompt requests bbox as page fractions and shows it in the JSON contract', () => {
    expect(source).toContain('"bbox" is [left, top, right, bottom] as fractions of the page width and height measured from the top-left corner');
    expect(source).toContain('"position": "top/middle/bottom", "bbox": [0.08, 0.34, 0.92, 0.62], "type":');
  });
  it('crops the reported box with a margin, keeps the strict gate only for the blind band, and records crop geometry', () => {
    const at = source.indexOf('const _box = _alloImageBbox(img);');
    expect(at).toBeGreaterThan(0);
    const block = source.slice(at, at + 2600);
    expect(block).toContain('const _pad = 0.01;');
    expect(block).toContain("else if (pos.includes('bottom')) { y = canvas.height * 0.7; h = canvas.height * 0.3; }");
    expect(block).toContain('crop.getContext(\'2d\').drawImage(canvas, x, y, w, h, 0, 0, w, h);');
    expect(block).toContain('if (_cropIsNearUniform(crop, !_box)) {');
    expect(block).toContain('if (_box) extractedImages[img.idx].cropData = { page: pg, x: x, y: y, w: w, h: h, canvasW: canvas.width, canvasH: canvas.height };');
    // the non-strict gate is the one with the distinct-colour escape
    expect(source).toContain('return _cropPixelsAreFill(data, strict !== false);');
    expect(source).toContain('if (distinct >= 4) return false;');
  });
});
