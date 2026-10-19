import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');
function loadProductionFunction(name, bindings = {}) {
  const matches = [...source.matchAll(new RegExp('^([ \\t]*)function ' + name + '\\(', 'gm'))];
  if (matches.length !== 1) throw Error('Expected one production function: ' + name);
  const match = matches[0], start = match.index + match[1].length;
  const ending = '\n' + match[1] + '}';
  const end = source.indexOf(ending, start);
  if (end < start) throw Error('Missing function ending: ' + name);
  return new Function(...Object.keys(bindings), '"use strict"; return (' + source.slice(start, end + ending.length) + ');')(...Object.values(bindings));
}

const targets = [
  { shape: 'heart', id: 'aortic_v', region: [.46, .50, .34, .37] },
  { shape: 'heart', id: 'pulm_v', region: [.53, .58, .35, .38] },
  { shape: 'heart', id: 'mitral', region: [.415, .44, .432, .448] },
  { shape: 'eye', id: 'ciliary_body', region: [.34, .37, .35, .38] },
  { shape: 'eye', id: 'tapetum', region: [.65, .69, .28, .32] },
  { shape: 'eye', id: 'lens', region: [.38, .41, .44, .46] },
  { shape: 'eye', id: 'choroid', region: [.70, .73, .55, .58] },
  { shape: 'frog', id: 'liver', region: [.48, .52, .45, .49] },
  { shape: 'frog', id: 'stomach', region: [.42, .46, .51, .55] },
  { shape: 'frog', id: 'fat_bodies', region: [.575, .587, .500, .516] },
  { shape: 'frog', id: 'sm_intestine', region: [.463, .479, .601, .618] },
  { shape: 'frog', id: 'pancreas', region: [.52, .54, .53, .55] },
  { shape: 'frog', id: 'spleen', region: [.400, .416, .557, .573] },
  { shape: 'pig', id: 'liver_p', region: [.51, .54, .44, .47] },
  { shape: 'pig', id: 'stomach_p', region: [.54, .58, .49, .52] },
  { shape: 'pig', id: 'lungs_p', region: [.378, .392, .417, .433] },
  { shape: 'pig', id: 'pancreas_p', region: [.60, .62, .528, .544] },
  { shape: 'pig', id: 'sm_int_p', region: [.552, .567, .533, .548] },
  { shape: 'fish', id: 'liver_f', region: [.37, .40, .46, .49] },
  { shape: 'fish', id: 'stomach_f', region: [.46, .49, .49, .52] },
  { shape: 'fish', id: 'swim_bladder', region: [.505, .525, .397, .417] },
  { shape: 'fish', id: 'gonads_f', region: [.585, .605, .461, .481] },
  { shape: 'worm', id: 'pharynx', region: [.52, .535, .145, .155] },
  { shape: 'worm', id: 'crop', region: [.51, .53, .30, .32] },
  { shape: 'worm', id: 'gizzard', region: [.505, .525, .34, .36] },
  { shape: 'crayfish', id: 'heart_c', region: [.525, .545, .405, .425] },
  { shape: 'crayfish', id: 'gills_c', region: [.55, .565, .35, .365] },
  { shape: 'crayfish', id: 'gastric_mill', region: [.37, .39, .44, .46] },
  { shape: 'crayfish', id: 'green_gland', region: [.285, .305, .402, .422] },
  { shape: 'crayfish', id: 'hepato', region: [.475, .495, .474, .494] },
  { shape: 'crayfish', id: 'gonads_c', region: [.565, .585, .44, .46] },
];
function painted(shape, query = () => ({ _logicalW: 500, _logicalH: 600 })) {
  return loadProductionFunction('paintedSmallStructurePoint', {
    spec: { bodyShape: shape }, queryDissectionNode: query,
    earthwormCenterlinePoint: loadProductionFunction('earthwormCenterlinePoint'),
  });
}

describe('small painted anatomical landmarks', () => {
  it.each(targets)('places $id within its painted anatomical region', ({ shape, id, region }) => {
    const p = painted(shape)({ id, x: .9, y: .9 });
    expect(p.x).toBeGreaterThan(region[0]);
    expect(p.x).toBeLessThan(region[1]);
    expect(p.y).toBeGreaterThan(region[2]);
    expect(p.y).toBeLessThan(region[3]);
  });

  it('queries the originating canvas logical size and ignores DPR, CSS resizing, and unrelated canvases', () => {
    const canvas = { _logicalW: 500, _logicalH: 600, width: 1000, height: 1200,
      clientWidth: 650, clientHeight: 780, _dpr: 2 };
    const otherLabCanvas = { _logicalW: 1000, _logicalH: 600 };
    const query = vi.fn(selector => selector === '[data-diss-canvas]' ? canvas : otherLabCanvas);
    for (const target of targets) {
      const targetPoint = painted(target.shape, query);
      const original = targetPoint({ id: target.id });
      Object.assign(canvas, { width: 1500, height: 1800, clientWidth: 320, clientHeight: 384, _dpr: 3 });
      expect(targetPoint({ id: target.id })).toEqual(original);
      Object.assign(canvas, { _logicalW: 1000, _logicalH: 1200 });
      expect(targetPoint({ id: target.id })).toEqual(original);
      Object.assign(canvas, { _logicalW: 500, _logicalH: 600 });
    }
    expect(query.mock.calls.every(([selector]) => selector === '[data-diss-canvas]')).toBe(true);
  });

  it('uses the default logical anatomy before a canvas is available', () => {
    const missingQuery = loadProductionFunction('paintedSmallStructurePoint', { spec: { bodyShape: 'eye' } });
    const nullCanvas = painted('eye', () => null);
    for (const id of ['ciliary_body', 'tapetum', 'lens', 'choroid']) {
      expect(missingQuery({ id })).toEqual(painted('eye')({ id }));
      expect(nullCanvas({ id })).toEqual(painted('eye')({ id }));
    }
  });

  it('keeps the eye targets on their tissues when the logical globe becomes height limited', () => {
    const point = painted('eye', () => ({ _logicalW: 1000, _logicalH: 600 }));
    const lens = point({ id: 'lens' }), ciliary = point({ id: 'ciliary_body' }), tapetum = point({ id: 'tapetum' });
    expect(lens.x).toBeGreaterThan(.41); expect(lens.x).toBeLessThan(.44);
    expect(lens.y).toBe(.45);
    expect(ciliary.x).toBeLessThan(lens.x); expect(ciliary.x).toBeGreaterThan(.38);
    expect(ciliary.y).toBeGreaterThan(.30); expect(ciliary.y).toBeLessThan(.35);
    expect(tapetum.x).toBeGreaterThan(.61); expect(tapetum.x).toBeLessThan(.65);
    expect(tapetum.y).toBeGreaterThan(.20); expect(tapetum.y).toBeLessThan(.25);
    // All three remain within the globe, rather than keeping a coordinate
    // from the old canvas aspect and drifting outside the tissue silhouette.
    for (const p of [lens, ciliary, tapetum]) {
      const globeDistance = Math.hypot((p.x - .515) / .216, (p.y - .45) / .2988);
      expect(globeDistance).toBeLessThan(1);
    }
  });

  it('keeps the choroid target between the outer band and retinal lining at different canvas aspects', () => {
    for (const [width, height] of [[500, 600], [1000, 600], [1000, 1200]]) {
      const target = painted('eye', () => ({ _logicalW: width, _logicalH: height }))({ id: 'choroid' });
      const radius = Math.min(width * .285, height * .36), ry = radius * .83;
      const dx = target.x * width - width * .515, dy = target.y * height - height * .45;
      const localX = dx * Math.cos(.015) - dy * Math.sin(.015);
      const localY = dx * Math.sin(.015) + dy * Math.cos(.015);
      expect(Math.hypot(localX / (radius * .945), localY / (ry * .925))).toBeLessThan(1);
      expect(Math.hypot(localX / (radius * .89), localY / (ry * .865))).toBeGreaterThan(1);
    }
  });

  it.each([
    ['heart', 'lens'], ['eye', 'aortic_v'], ['eye', 'retina'], ['frog', 'heart'], ['pig', 'heart_p'],
  ])('leaves unrelated %s/%s anatomy in the normal model', (shape, id) => {
    const query = vi.fn(() => { throw Error('Unrelated organs must not query eye geometry'); });
    expect(painted(shape, query)({ id })).toBeNull();
    expect(query).not.toHaveBeenCalled();
    expect(painted(shape, query)(null)).toBeNull();
  });
});

describe('shared earthworm anatomy registration', () => {
  it.each([[500, 600], [1000, 600], [320, 900]])('uses the same centerline for painting and inspection at %s by %s logical pixels', (W, H) => {
    const centerline = loadProductionFunction('earthwormCenterlinePoint');
    const renderedPoint = loadProductionFunction('earthwormPoint', { earthwormCenterlinePoint: centerline, W, H });
    const landmarks = painted('worm');
    for (const [id, t] of [['pharynx', .105], ['crop', .315], ['gizzard', .37]]) {
      const actual = renderedPoint(t), target = landmarks({ id });
      expect(actual.x / W).toBeCloseTo(target.x, 12);
      expect(actual.y / H).toBeCloseTo(target.y, 12);
    }
  });

  it('clamps the body endpoints and keeps malformed inputs finite', () => {
    const centerline = loadProductionFunction('earthwormCenterlinePoint');
    expect(centerline(-1)).toEqual(centerline(0));
    expect(centerline(2)).toEqual(centerline(1));
    for (const value of [NaN, undefined, Infinity, -Infinity]) {
      const point = centerline(value);
      expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(true);
      expect(point.y).toBeGreaterThanOrEqual(.07);
      expect(point.y).toBeLessThanOrEqual(.83 + 1e-12);
    }
  });
});

describe('painted landmarks in the normal interaction pipeline', () => {
  it.each(targets)('keeps $id on its tissue through presentation changes', ({ shape, id }) => {
    const smallPoint = painted(shape), expected = smallPoint({ id });
    for (const mode of ['guided', 'realistic', 'accessible']) {
      const variation = vi.fn(() => { throw Error('A painted small landmark must not jitter away from its tissue'); });
      const transform = vi.fn(() => { throw Error('Do not inflate the painted landmark a second time'); });
      const presentation = { visualRealism: mode };
      const point = loadProductionFunction('variedOrganPoint', {
        paintedSmallStructurePoint: smallPoint, d: presentation, visualRealism: mode,
        specimenVariationValue: variation, viewSpecificOrganPoint: transform,
      });
      for (const variationSeed of [1, 19]) {
        for (const anatomicalView of ['dorsal', 'ventral', 'lateral', 'internal']) {
          Object.assign(presentation, { variationSeed, anatomicalView });
          expect(point({ id, x: .9, y: .9 })).toEqual(expected);
        }
      }
      expect(variation).not.toHaveBeenCalled(); expect(transform).not.toHaveBeenCalled();
    }
  });

  it.each([['guided', .007], ['realistic', .016], ['accessible', 0]])('retains %s variation and view transformation for other organs', (mode, amplitude) => {
    const organ = { id: 'kidneys', x: .54, y: .46 };
    const transform = vi.fn((_organ, point) => ({ ...point, transformed: true }));
    const variation = vi.fn(salt => salt.endsWith('|x') ? 1 : 0);
    const point = loadProductionFunction('variedOrganPoint', {
      paintedSmallStructurePoint: painted('frog'), d: { visualRealism: mode }, visualRealism: mode,
      specimenVariationValue: variation, viewSpecificOrganPoint: transform,
    });
    const result = point(organ);
    expect(transform).toHaveBeenCalledExactlyOnceWith(organ, { x: organ.x + amplitude, y: organ.y - amplitude });
    expect(result).toEqual({ x: organ.x + amplitude, y: organ.y - amplitude, transformed: true });
    expect(variation).toHaveBeenCalledWith('kidneys|x'); expect(variation).toHaveBeenCalledWith('kidneys|y');
  });

  it.each(targets)('resolves the painted $id point to that structure for pointer inspection', ({ shape, id }) => {
    const smallPoint = painted(shape);
    const point = loadProductionFunction('variedOrganPoint', {
      paintedSmallStructurePoint: smallPoint, d: { visualRealism: 'realistic' }, visualRealism: 'realistic',
      specimenVariationValue: () => .5, viewSpecificOrganPoint: (_organ, p) => p,
    });
    const organs = targets.filter(target => target.shape === shape).map(target => ({ id: target.id, x: .9, y: .9 }));
    const hit = loadProductionFunction('closestVisibleOrganAt', {
      organs, variedOrganPoint: point, currentProcedure: {}, structureExposureState: () => 'visible',
    });
    const p = smallPoint({ id });
    expect(hit(p.x, p.y, .008, null)?.id).toBe(id);
  });
});
