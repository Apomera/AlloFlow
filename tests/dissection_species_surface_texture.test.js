import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');

function productionFunction(name, bindings = {}) {
  const matches = [...source.matchAll(new RegExp('^([ \\t]*)function ' + name + '\\(', 'gm'))];
  if (matches.length !== 1) throw new Error('Expected one production function: ' + name);
  const start = matches[0].index + matches[0][1].length;
  const ending = '\n' + matches[0][1] + '}';
  const end = source.indexOf(ending, start);
  if (end < start) throw new Error('Missing production function ending: ' + name);
  return new Function(...Object.keys(bindings), 'return (' + source.slice(start, end + ending.length) + ');')(...Object.values(bindings));
}

function copyPath(path) { return path.map(operation => operation.slice()); }
function copyStyle(value) {
  return value && typeof value === 'object'
    ? { kind: value.kind, bounds: value.bounds.slice(), stops: value.stops.map(stop => stop.slice()) }
    : value;
}

// Record paths and paint state rather than pretending to rasterize Canvas2D.
// Browser screenshots verify appearance; these checks protect ownership,
// determinism, clipping, and the amount of work the renderer generates.
class RecordingContext {
  constructor() {
    this.events = [];
    this.currentPath = [];
    this.stack = [];
    this.clipDepth = 0;
    this.globalAlpha = 0.7;
    this.globalCompositeOperation = 'source-over';
    this.lineWidth = 3;
    this.fillStyle = '#123456';
    this.strokeStyle = '#654321';
    this.shadowBlur = 7;
    this.shadowColor = 'rgba(0,0,0,0.25)';
    this.shadowOffsetX = 2;
    this.shadowOffsetY = -3;
    this.matrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  }
  save() {
    this.stack.push(Object.fromEntries(['globalAlpha', 'globalCompositeOperation', 'lineWidth', 'fillStyle', 'strokeStyle', 'shadowBlur', 'shadowColor', 'shadowOffsetX', 'shadowOffsetY', 'lineCap', 'lineJoin', 'clipDepth'].map(key => [key, this[key]])));
    this.events.push({ operation: 'save' });
  }
  restore() { Object.assign(this, this.stack.pop()); this.events.push({ operation: 'restore' }); }
  beginPath() { this.currentPath = []; this.events.push({ operation: 'beginPath' }); }
  trace(operation, args) { this.currentPath.push([operation, ...args]); this.events.push({ operation, args }); }
  moveTo(...args) { this.trace('moveTo', args); }
  lineTo(...args) { this.trace('lineTo', args); }
  bezierCurveTo(...args) { this.trace('bezierCurveTo', args); }
  quadraticCurveTo(...args) { this.trace('quadraticCurveTo', args); }
  ellipse(...args) { this.trace('ellipse', args); }
  arc(...args) { this.trace('arc', args); }
  closePath() { this.trace('closePath', []); }
  scale(...args) { this.events.push({ operation: 'scale', args }); }
  translate(...args) { this.events.push({ operation: 'translate', args }); }
  rotate(...args) { this.events.push({ operation: 'rotate', args }); }
  getTransform() { return { ...this.matrix }; }
  clip() { this.clipDepth++; this.events.push({ operation: 'clip', path: copyPath(this.currentPath) }); }
  paint(operation, args = []) {
    this.events.push({ operation, args, path: copyPath(this.currentPath), clipped: this.clipDepth > 0,
      alpha: this.globalAlpha, composite: this.globalCompositeOperation, lineWidth: this.lineWidth,
      fill: copyStyle(this.fillStyle), stroke: copyStyle(this.strokeStyle),
      shadow: { color: this.shadowColor, blur: this.shadowBlur, x: this.shadowOffsetX, y: this.shadowOffsetY } });
  }
  fill() { this.paint('fill'); }
  stroke() { this.paint('stroke'); }
  fillRect(...args) { this.paint('fillRect', args); }
  drawImage(bitmap, ...args) { this.events.push({ operation: 'drawImage', bitmap, args, alpha: this.globalAlpha, composite: this.globalCompositeOperation }); }
  gradient(kind, bounds) {
    const gradient = { kind, bounds, stops: [], addColorStop(position, color) { this.stops.push([position, color]); } };
    this.events.push({ operation: kind, bounds });
    return gradient;
  }
  createRadialGradient(...args) { return this.gradient('radialGradient', args); }
  createLinearGradient(...args) { return this.gradient('linearGradient', args); }
}

const surfaceOptions = Object.freeze({
  specimen: 'pig', seed: 7, pattern: 'follicles', visualMode: 'realistic',
  sceneDetail: true, surfaceLayer: true, highContrast: false,
  lightDirection: 'left', lightIntensity: 68, moisture: 75,
  x: 25, y: 40, width: 250, height: 420, density: 38,
});

function surfaceFixture() {
  const bitmaps = [];
  const document = { createElement: vi.fn(tag => {
    if (tag !== 'canvas') throw new Error('Surface finish may allocate only its offscreen canvas');
    const context = new RecordingContext();
    const bitmap = { width: 0, height: 0, context, getContext: vi.fn(type => type === '2d' ? context : null) };
    bitmaps.push(bitmap);
    return bitmap;
  }) };
  const draw = productionFunction('drawDissectionSpeciesSurfaceTexture', { document });
  return { draw, bitmaps, document };
}

function paintEvents(context) { return context.events.filter(event => ['fill', 'stroke', 'fillRect'].includes(event.operation)); }

describe('dissection species surface texture', () => {
  it('generates the same offscreen marks for the same specimen and seed without ambient randomness', () => {
    const fixture = surfaceFixture();
    const ambientRandom = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Material appearance must use its seed'); });
    try {
      fixture.draw(new RecordingContext(), {}, surfaceOptions);
      fixture.draw(new RecordingContext(), {}, surfaceOptions);
      expect(fixture.bitmaps).toHaveLength(2);
      expect(fixture.bitmaps[0].context.events).toEqual(fixture.bitmaps[1].context.events);
      expect(paintEvents(fixture.bitmaps[0].context).length).toBeGreaterThan(30);
    } finally { ambientRandom.mockRestore(); }
  });

  it('reuses its bitmap while camera placement, moisture, and intensity change', () => {
    const fixture = surfaceFixture(), owner = {}, visible = new RecordingContext();
    visible.moveTo(3, 4); visible.lineTo(8, 9);
    const path = copyPath(visible.currentPath);
    fixture.draw(visible, owner, surfaceOptions);
    fixture.draw(visible, owner, { ...surfaceOptions, x: 45, y: 60, moisture: 0, lightIntensity: 20 });
    expect(fixture.bitmaps).toHaveLength(1);
    const images = visible.events.filter(event => event.operation === 'drawImage');
    expect(images).toHaveLength(2);
    expect(images[0].bitmap).toBe(images[1].bitmap);
    expect(images[1].args).toEqual([45, 60, surfaceOptions.width, surfaceOptions.height]);
    expect(images[1].alpha).toBeLessThan(images[0].alpha);
    expect(visible.currentPath).toEqual(path);
    expect(visible.globalAlpha).toBe(0.7);
    expect(visible.globalCompositeOperation).toBe('source-over');
    expect(visible.stack).toEqual([]);
  });

  it.each([
    ['seed', { seed: 8 }], ['lamp direction', { lightDirection: 'right' }],
    ['detail choice', { visualMode: 'guided' }], ['material', { pattern: 'facets' }],
  ])('rebuilds the cached appearance after a %s change', (_, patch) => {
    const fixture = surfaceFixture(), owner = {}, visible = new RecordingContext();
    fixture.draw(visible, owner, surfaceOptions);
    fixture.draw(visible, owner, { ...surfaceOptions, ...patch });
    expect(fixture.bitmaps).toHaveLength(2);
    const images = visible.events.filter(event => event.operation === 'drawImage');
    expect(images[0].bitmap).not.toBe(images[1].bitmap);
    expect(fixture.bitmaps[0].context.events).not.toEqual(fixture.bitmaps[1].context.events);
  });

  it.each([
    ['Accessible view', { visualMode: 'accessible' }], ['high contrast', { highContrast: true }],
    ['hidden detail', { sceneDetail: false }], ['deeper anatomy', { surfaceLayer: false }],
    ['unsupported material', { pattern: 'retired-pattern' }],
  ])('does no allocation or painting for %s', (_, patch) => {
    const fixture = surfaceFixture(), visible = new RecordingContext(), owner = {};
    fixture.draw(visible, owner, { ...surfaceOptions, ...patch });
    expect(fixture.document.createElement).not.toHaveBeenCalled();
    expect(visible.events).toEqual([]);
    expect(Object.keys(owner)).toEqual([]);
  });

  it.each(['chromatophores', 'follicles', 'scales', 'facets', 'segments'])('bounds the bitmap and generated %s marks even for a large requested surface', pattern => {
    const fixture = surfaceFixture();
    fixture.draw(new RecordingContext(), {}, { ...surfaceOptions, pattern, width: 10000, height: 20000 });
    expect(fixture.bitmaps).toHaveLength(1);
    const bitmap = fixture.bitmaps[0];
    expect(bitmap.width).toBeGreaterThan(0); expect(bitmap.height).toBeGreaterThan(0);
    expect(bitmap.width).toBeLessThanOrEqual(512); expect(bitmap.height).toBeLessThanOrEqual(512);
    expect(bitmap.width * bitmap.height).toBeLessThanOrEqual(512 * 512);
    expect(paintEvents(bitmap.context).length).toBeGreaterThan(30);
    expect(paintEvents(bitmap.context).length).toBeLessThanOrEqual(500);
  });
});

const hash = productionFunction('dissHash');
function tissueFixture(overrides = {}) {
  const ctx = new RecordingContext();
  ctx.moveTo(10, 15); ctx.bezierCurveTo(45, 12, 55, 65, 12, 50); ctx.closePath();
  const footprint = copyPath(ctx.currentPath);
  const bindings = { ctx, d: { visualRealism: 'realistic', variationSeed: 7 }, visualRealism: 'guided',
    sceneDetail: true, highContrastEnabled: false, specimen: 'frog', variationSeed: 1, lightDirection: 'left', dissHash: hash, W: 500, H: 600, ...overrides };
  const finish = productionFunction('finishCurrentTissuePath', bindings);
  return { ctx, footprint, finish, bindings, start: ctx.events.length };
}

describe('dissection organ material finish', () => {
  it.each(['capsule', 'spongy', 'lobular', 'muscle', 'serosa', 'collagen'])('clips all %s paint to the actual existing organ path and restores context state', material => {
    const fixture = tissueFixture();
    fixture.finish(120, 150, 20, 35, material, 'organ-one');
    const clips = fixture.ctx.events.filter(event => event.operation === 'clip');
    expect(clips).toHaveLength(1);
    expect(clips[0].path).toEqual(fixture.footprint);
    const painting = paintEvents(fixture.ctx);
    expect(painting.length).toBeGreaterThan(20);
    expect(painting.length).toBeLessThan(130);
    expect(painting.every(event => event.clipped)).toBe(true);
    expect(fixture.ctx.clipDepth).toBe(0);
    expect(fixture.ctx.globalAlpha).toBe(0.7);
    expect(fixture.ctx.globalCompositeOperation).toBe('source-over');
    expect(fixture.ctx.lineWidth).toBe(3);
    expect(fixture.ctx.shadowBlur).toBe(7);
    expect(fixture.ctx.stack).toEqual([]);
  });

  it.each(['capsule', 'spongy', 'lobular', 'muscle', 'serosa', 'collagen'])('keeps %s marks deterministic, with different stable detail for another organ or specimen variation', material => {
    const first = tissueFixture(), same = tissueFixture(), otherOrgan = tissueFixture();
    const otherSeed = tissueFixture({ d: { visualRealism: 'realistic', variationSeed: 8 } });
    first.finish(120, 150, 20, 35, material, 'organ-one');
    same.finish(120, 150, 20, 35, material, 'organ-one');
    otherOrgan.finish(120, 150, 20, 35, material, 'organ-two');
    otherSeed.finish(120, 150, 20, 35, material, 'organ-one');
    expect(same.ctx.events).toEqual(first.ctx.events);
    expect(otherOrgan.ctx.events).not.toEqual(first.ctx.events);
    expect(otherSeed.ctx.events).not.toEqual(first.ctx.events);
  });

  it('moves directional shading without moving the seeded material marks', () => {
    const left = tissueFixture({ lightDirection: 'left' }), right = tissueFixture({ lightDirection: 'right' });
    left.finish(120, 150, 20, 35, 'spongy', 'organ-one');
    right.finish(120, 150, 20, 35, 'spongy', 'organ-one');
    const operations = (fixture, operation) => fixture.ctx.events.filter(event => event.operation === operation);
    expect(operations(left, 'ellipse')).toEqual(operations(right, 'ellipse'));
    expect(operations(left, 'radialGradient')).not.toEqual(operations(right, 'radialGradient'));
  });

  it.each([
    ['Accessible view', { d: { visualRealism: 'accessible', variationSeed: 7 } }, 20, 35],
    ['high contrast', { highContrastEnabled: true }, 20, 35],
    ['hidden detail', { sceneDetail: false }, 20, 35],
    ['collapsed width', {}, 0.5, 35], ['collapsed height', {}, 20, 0.5],
    ['nonfinite width', {}, NaN, 35], ['nonfinite height', {}, 20, Infinity],
    ['nonfinite x position', {}, 20, 35, Infinity, 150], ['nonfinite y position', {}, 20, 35, 120, NaN],
  ])('leaves the current path untouched when skipped for %s', (_, overrides, rx, ry, x = 120, y = 150) => {
    const fixture = tissueFixture(overrides);
    fixture.finish(x, y, rx, ry, 'spongy', 'organ-one');
    expect(fixture.ctx.events.slice(fixture.start)).toEqual([]);
    expect(fixture.ctx.currentPath).toEqual(fixture.footprint);
    expect(fixture.ctx.stack).toEqual([]);
  });

  it('restores the caller context when a material paint fails', () => {
    const fixture = tissueFixture();
    fixture.ctx.stroke = vi.fn(() => { throw new Error('Injected material paint failure'); });
    expect(() => fixture.finish(120, 150, 20, 35, 'muscle', 'organ-one')).toThrow('Injected material paint failure');
    expect(fixture.ctx.stack).toEqual([]);
    expect(fixture.ctx.clipDepth).toBe(0);
    expect(fixture.ctx.globalCompositeOperation).toBe('source-over');
    expect(fixture.ctx.globalAlpha).toBe(0.7);
    expect(fixture.ctx.lineWidth).toBe(3);
    expect(fixture.ctx.shadowBlur).toBe(7);
  });

  it('reduces wet sheen on a dehydrated organ while retaining the same tissue geometry', () => {
    const normal = tissueFixture({ d: { visualRealism: 'realistic', variationSeed: 7, specimenCondition: 'standard' } });
    const dry = tissueFixture({ d: { visualRealism: 'realistic', variationSeed: 7, specimenCondition: 'dehydrated' } });
    normal.finish(120, 150, 20, 35, 'capsule', 'frog-liver');
    dry.finish(120, 150, 20, 35, 'capsule', 'frog-liver');
    function sheenOpacity(fixture) {
      return paintEvents(fixture.ctx).filter(event => event.composite === 'screen')
        .flatMap(event => event.fill?.stops || [])
        .reduce((sum, [, color]) => sum + Number(color.slice(color.lastIndexOf(',') + 1, -1)), 0);
    }
    expect(sheenOpacity(normal)).toBeGreaterThan(0);
    expect(sheenOpacity(dry)).toBeLessThan(sheenOpacity(normal));
    const geometry = fixture => paintEvents(fixture.ctx).map(event => ({ operation: event.operation, args: event.args, path: event.path }));
    expect(geometry(dry)).toEqual(geometry(normal));
  });
});

describe('dissection crayfish digestive-gland material', () => {
  function groups(fixture) {
    return paintEvents(fixture.ctx).filter(event => event.operation === 'fill' &&
      event.fill?.kind === 'radialGradient' && event.path.some(operation => operation[0] === 'ellipse'));
  }
  function outlinedGroups(fixture) {
    return paintEvents(fixture.ctx).filter(event => event.operation === 'stroke' &&
      event.path.some(operation => operation[0] === 'ellipse'));
  }
  function alpha(color) { return Number(color.slice(color.lastIndexOf(',') + 1, -1)); }

  it.each([['realistic', 12], ['guided', 8]])('keeps %s digestive-gland groups diffuse, clipped and deterministic without outlined cell-like rings', (visualRealism, count) => {
    function gland(overrides = {}, salt = 'cray-digestive-left') {
      const fixture = tissueFixture({ d: { visualRealism, variationSeed: 7 }, ...overrides });
      fixture.finish(120, 150, 20, 35, 'lobular', salt);
      return fixture;
    }
    const first = gland(), same = gland();
    const relit = gland({ lightDirection: 'right', liveTissueState: { moisture: 2 } });
    const otherSeed = gland({ d: { visualRealism, variationSeed: 8 } });
    const mottles = groups(first);
    expect(mottles).toHaveLength(count);
    expect(mottles.every(event => event.clipped)).toBe(true);
    expect(outlinedGroups(first)).toEqual([]);
    for (const event of mottles) {
      const opacities = event.fill.stops.map(([, color]) => alpha(color));
      expect(opacities[0]).toBeGreaterThan(0); expect(opacities[0]).toBeLessThanOrEqual(0.12);
      expect(opacities[1]).toBeGreaterThan(0); expect(opacities[1]).toBeLessThan(opacities[0]);
      expect(opacities.at(-1)).toBe(0);
    }
    expect(same.ctx.events).toEqual(first.ctx.events);
    expect(groups(relit).map(event => event.path)).toEqual(mottles.map(event => event.path));
    expect(groups(otherSeed).map(event => event.path)).not.toEqual(mottles.map(event => event.path));
    expect(first.ctx.events.find(event => event.operation === 'clip').path).toEqual(first.footprint);
    expect(paintEvents(first.ctx).length).toBeLessThan(60);
    expect(paintEvents(first.ctx).every(event => event.clipped)).toBe(true);
    expect(first.ctx.stack).toEqual([]); expect(first.ctx.clipDepth).toBe(0);
    expect(first.ctx.globalAlpha).toBe(0.7); expect(first.ctx.globalCompositeOperation).toBe('source-over');

    // A different lobular organ keeps raised groups and their shallow grooves;
    // the diffuse gland treatment must not silently flatten every lobular finish.
    const ordinary = gland({}, 'pig-thymus');
    expect(groups(ordinary)).toHaveLength(count);
    expect(outlinedGroups(ordinary)).toHaveLength(count);
    expect(outlinedGroups(ordinary).every(event => event.clipped)).toBe(true);
    expect(groups(ordinary).every(event => alpha(event.fill.stops[0][1]) > 0.2 && alpha(event.fill.stops.at(-1)[1]) > 0)).toBe(true);
    expect(ordinary.ctx.stack).toEqual([]);
  });

  it.each([['realistic', 12], ['guided', 8]])('keeps %s pancreatic and fat-body surfaces softly mottled without raised follicular rings', (visualRealism, count) => {
    const gland = (salt, overrides = {}) => {
      const fixture = tissueFixture({ d: { visualRealism, variationSeed: 7 }, ...overrides });
      fixture.finish(120, 150, 35, 8, 'lobular', salt);
      return fixture;
    };
    const patterns = [];
    for (const salt of ['frog-pancreas', 'pig-pancreas', 'frog-fat-body--1', 'frog-fat-body-1']) {
      const first = gland(salt), same = gland(salt);
      const relit = gland(salt, { lightDirection: 'right', liveTissueState: { moisture: 2 } });
      const mottles = groups(first);
      expect(mottles).toHaveLength(count);
      expect(outlinedGroups(first)).toEqual([]);
      expect(mottles.every(event => event.clipped && alpha(event.fill.stops[0][1]) > 0 &&
        alpha(event.fill.stops[0][1]) <= 0.12 && alpha(event.fill.stops.at(-1)[1]) === 0)).toBe(true);
      expect(first.ctx.events.find(event => event.operation === 'clip').path).toEqual(first.footprint);
      expect(same.ctx.events).toEqual(first.ctx.events);
      expect(groups(relit).map(event => event.path)).toEqual(mottles.map(event => event.path));
      expect(paintEvents(first.ctx).length).toBeLessThan(60);
      expect(paintEvents(first.ctx).every(event => event.clipped)).toBe(true);
      expect(first.ctx.stack).toEqual([]); expect(first.ctx.clipDepth).toBe(0);
      patterns.push(mottles.map(event => event.path));
    }
    // Species salts provide stable distinct mottling without changing the
    // registered ribbon footprint when the lamp or saline state changes.
    expect(patterns[0]).not.toEqual(patterns[1]);
    expect(patterns[2]).not.toEqual(patterns[3]);
  });
});

describe('dissection frog fat-body surfaces', () => {
  function contours(path) {
    const polygons = [];
    let polygon = [], cursor;
    for (const [operation, ...a] of path) {
      if (operation === 'moveTo') { polygon = [[a[0], a[1]]]; cursor = polygon[0]; }
      if (operation === 'quadraticCurveTo' || operation === 'bezierCurveTo') {
        const p = cursor;
        for (let i = 1; i <= 32; i++) {
          const t = i / 32, u = 1 - t;
          polygon.push(operation === 'quadraticCurveTo'
            ? [u * u * p[0] + 2 * u * t * a[0] + t * t * a[2], u * u * p[1] + 2 * u * t * a[1] + t * t * a[3]]
            : [u ** 3 * p[0] + 3 * u * u * t * a[0] + 3 * u * t * t * a[2] + t ** 3 * a[4],
              u ** 3 * p[1] + 3 * u * u * t * a[1] + 3 * u * t * t * a[3] + t ** 3 * a[5]]);
        }
        cursor = polygon.at(-1);
      }
      if (operation === 'closePath') polygons.push(polygon);
    }
    return polygons;
  }
  function contains(polygons, x, y) {
    return polygons.some(polygon => {
      let inside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [ax, ay] = polygon[i], [bx, by] = polygon[j];
        if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
      }
      return inside;
    });
  }
  function fixture(W = 500, H = 600) {
    const ctx = new RecordingContext(), bindings = { ctx, W, H, cx: W * .5, cy: H * .45 };
    const trace = productionFunction('traceFrogFatBodies', bindings);
    return { ctx, bindings, trace };
  }
  it.each([[500, 600, -1], [500, 600, 1], [1000, 600, -1], [1000, 600, 1], [320, 900, -1], [320, 900, 1]])(
    'keeps four closed fingers around their existing centerlines at %sx%s / side%s', (W, H, side) => {
      const f = fixture(W, H); f.trace(side);
      const polygons = contours(f.ctx.currentPath);
      expect(polygons).toHaveLength(4);
      for (let finger = 0; finger < 4; finger++) for (const t of [.1, .35, .65, .9]) {
        const u = 1 - t;
        const x = W * (.5 + side * (u * u * .04 + 2 * u * t * (.035 + finger * .013) + t * t * (.045 + finger * .013)));
        const y = H * (.45 - u * u * .045 + 2 * u * t * .005 + t * t * (.035 + finger * .012));
        expect(contains(polygons, x, y)).toBe(true);
      }
      for (const [x, y] of polygons.flat()) {
        expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
        expect(Math.abs(x / W - .5)).toBeLessThan(.092);
        expect(y / H).toBeGreaterThan(.398); expect(y / H).toBeLessThan(.53);
      }
      expect(f.ctx.stack).toEqual([]);
    });
  it.each([[500, 600], [1000, 600], [320, 900]])('retains the visible fat-body target inside actual tissue at %sx%s', (W, H) => {
    const f = fixture(W, H); f.trace(1);
    expect(contains(contours(f.ctx.currentPath), .581 * W, .508 * H)).toBe(true);
  });
  it.each([false, true])('passes the complete four-finger path to one bounded finish and restores context (throw=%s)', shouldThrow => {
    const f = fixture(), contactPaths = [], finishPaths = [];
    const finish = vi.fn((...args) => {
      finishPaths.push(copyPath(f.ctx.currentPath));
      expect(args.slice(-2)).toEqual(['lobular', 'frog-fat-body-1']);
      f.ctx.beginPath();
      if (shouldThrow) throw Error('injected finish failure');
    });
    const draw = productionFunction('drawFrogFatBodies', { ...f.bindings, traceFrogFatBodies: f.trace,
      lightDirection: 'left', finishCurrentTissuePath: finish,
      paintCurrentOrganContact: () => { contactPaths.push(copyPath(f.ctx.currentPath)); f.ctx.stroke(); } });
    const invoke = () => draw(1);
    if (shouldThrow) expect(invoke).toThrow('injected finish failure'); else invoke();
    expect(finish).toHaveBeenCalledTimes(1);
    expect(finishPaths[0]).toEqual(contactPaths[0]);
    expect(contours(finishPaths[0])).toHaveLength(4);
    expect(paintEvents(f.ctx)).toHaveLength(6);
    expect(f.ctx.globalAlpha).toBe(.7); expect(f.ctx.globalCompositeOperation).toBe('source-over');
    expect(f.ctx.fillStyle).toBe('#123456'); expect(f.ctx.strokeStyle).toBe('#654321'); expect(f.ctx.stack).toEqual([]);
  });
});

describe('dissection closed visceral surfaces', () => {
  function finishSerosa(overrides = {}, salt = 'frog-stomach') {
    const fixture = tissueFixture(overrides);
    fixture.finish(120, 150, 20, 35, 'serosa', salt);
    return fixture;
  }
  function strokes(fixture) { return paintEvents(fixture.ctx).filter(event => event.operation === 'stroke'); }
  function sheenStrength(fixture) {
    return paintEvents(fixture.ctx).filter(event => event.composite === 'screen')
      .flatMap(event => event.fill?.stops || [])
      .reduce((sum, [, color]) => sum + Number(color.slice(color.lastIndexOf(',') + 1, -1)), 0);
  }
  function geometry(fixture) {
    return paintEvents(fixture.ctx).map(event => ({ operation: event.operation, args: event.args, path: event.path }));
  }

  it('gives closed stomach serosa fine branching detail rather than full-width transverse folds', () => {
    const fixture = finishSerosa(), vascular = strokes(fixture);
    expect(vascular.length).toBeGreaterThan(3); expect(vascular.length).toBeLessThan(16);
    expect(vascular.every(event => event.clipped && event.lineWidth * 35 < 0.8)).toBe(true);
    expect(vascular.some(event => event.path.some(operation => operation[0] === 'bezierCurveTo'))).toBe(true);
    expect(vascular.filter(event => event.path.some(operation => operation[0] === 'quadraticCurveTo')).length).toBeGreaterThan(2);
    for (const event of vascular) {
      const coordinates = event.path.flatMap(operation => operation.slice(1).filter((_value, index) => index % 2 === 0));
      expect(Math.max(...coordinates) - Math.min(...coordinates)).toBeLessThan(1.2);
    }
    expect(paintEvents(fixture.ctx).length).toBeLessThan(70);
    expect(fixture.ctx.events.find(event => event.operation === 'clip').path).toEqual(fixture.footprint);
    expect(fixture.ctx.stack).toEqual([]); expect(fixture.ctx.clipDepth).toBe(0);
  });

  it('keeps superficial vessel placement seeded and stable as the lamp or moisture changes', () => {
    const ambient = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Vessels must use the specimen seed'); });
    try {
      const first = finishSerosa(), same = finishSerosa();
      const changedSeed = finishSerosa({ d: { visualRealism: 'realistic', variationSeed: 8 } });
      const changedLamp = finishSerosa({ d: { visualRealism: 'realistic', variationSeed: 7, lightIntensity: 20 }, lightDirection: 'right', liveTissueState: { moisture: 4 } });
      expect(geometry(same)).toEqual(geometry(first));
      expect(strokes(changedSeed).map(event => event.path)).not.toEqual(strokes(first).map(event => event.path));
      expect(geometry(changedLamp)).toEqual(geometry(first));
    } finally { ambient.mockRestore(); }
  });

  it('leaves urinary bladder, gallbladder, crop, atrium and swim-bladder surfaces free of stomach vessels or rugae', () => {
    for (const salt of ['pig-urinary-bladder', 'frog-gallbladder', 'worm-crop', 'frog-atrium-left', 'perch-swim-bladder', 'eye-chamber']) {
      const fixture = finishSerosa({}, salt);
      expect(strokes(fixture)).toEqual([]);
      expect(paintEvents(fixture.ctx).length).toBeGreaterThan(15);
      expect(paintEvents(fixture.ctx).every(event => event.clipped)).toBe(true);
    }
  });

  it('retains shallow fold cues on membrane material', () => {
    const fixture = finishSerosa({}, 'frog-mesentery');
    expect(strokes(fixture).length).toBeGreaterThan(0);
    expect(strokes(fixture).every(event => event.clipped)).toBe(true);
    expect(fixture.ctx.stack).toEqual([]);
  });

  it.each(['capsule', 'serosa'])('makes %s sheen respond to live saline moisture and lamp strength without changing organ detail', material => {
    function materialFixture(moisture, lightIntensity) {
      const fixture = tissueFixture({ d: { visualRealism: 'realistic', variationSeed: 7, specimenCondition: 'standard', lightIntensity }, liveTissueState: { moisture } });
      fixture.finish(120, 150, 20, 35, material, 'frog-stomach');
      return fixture;
    }
    const wet = materialFixture(100, 100), dry = materialFixture(0, 100), dim = materialFixture(100, 20);
    expect(sheenStrength(wet)).toBeGreaterThan(sheenStrength(dry));
    expect(sheenStrength(wet)).toBeGreaterThan(sheenStrength(dim));
    expect(geometry(dry)).toEqual(geometry(wet)); expect(geometry(dim)).toEqual(geometry(wet));
    for (const fixture of [wet, dry, dim]) {
      expect(fixture.ctx.globalAlpha).toBe(0.7); expect(fixture.ctx.globalCompositeOperation).toBe('source-over');
      expect(fixture.ctx.stack).toEqual([]); expect(fixture.ctx.clipDepth).toBe(0);
    }
  });

  it.each(['spongy', 'muscle', 'collagen', 'lobular'])('preserves the established %s finish during the smooth-surface enhancement', material => {
    const first = tissueFixture({ d: { visualRealism: 'realistic', variationSeed: 7, lightIntensity: 100 }, liveTissueState: { moisture: 100 } });
    const changed = tissueFixture({ d: { visualRealism: 'realistic', variationSeed: 7, lightIntensity: 20 }, liveTissueState: { moisture: 0 } });
    first.finish(120, 150, 20, 35, material, 'organ-one');
    changed.finish(120, 150, 20, 35, material, 'organ-one');
    expect(changed.ctx.events).toEqual(first.ctx.events);
  });

  it('keeps smooth-surface gradient inputs and opacity finite for absent or invalid live controls', () => {
    for (const overrides of [
      { liveTissueState: null }, { liveTissueState: { moisture: NaN } },
      { liveTissueState: { moisture: Infinity } }, { liveTissueState: { moisture: -20 } },
      { liveTissueState: { moisture: 200 } },
      { d: { visualRealism: 'realistic', variationSeed: 7, lightIntensity: Infinity } }
    ]) {
      const fixture = finishSerosa(overrides);
      const gradients = fixture.ctx.events.filter(event => ['radialGradient', 'linearGradient'].includes(event.operation));
      expect(gradients.length).toBeGreaterThan(0);
      expect(gradients.every(event => event.bounds.every(Number.isFinite))).toBe(true);
      const stops = paintEvents(fixture.ctx).flatMap(event => event.fill?.stops || []);
      for (const [, color] of stops) {
        const alpha = Number(color.slice(color.lastIndexOf(',') + 1, -1));
        expect(Number.isFinite(alpha)).toBe(true); expect(alpha).toBeGreaterThanOrEqual(0); expect(alpha).toBeLessThanOrEqual(1);
      }
      expect(fixture.ctx.stack).toEqual([]);
    }
  });
});

describe('dissection rounded anatomical tubes', () => {
  const base = '#a14e52', light = '#e0b0a2', dark = '#522c36';

  function drawTube(fixture, width = 4) {
    productionFunction('strokeAnatomicalTube', fixture.bindings)(width, base, light, dark);
    return paintEvents(fixture.ctx);
  }

  it('uses five bounded strokes of the unchanged authored path without moving geometry', () => {
    const fixture = tissueFixture();
    const matrix = { a: -2, b: 0.1, c: 0.15, d: 2, e: 30, f: 45 };
    fixture.ctx.matrix = { ...matrix };
    const painting = drawTube(fixture);
    expect(painting).toHaveLength(5);
    expect(painting.every(event => event.operation === 'stroke')).toBe(true);
    expect(painting.every(event => JSON.stringify(event.path) === JSON.stringify(fixture.footprint))).toBe(true);
    expect(fixture.ctx.currentPath).toEqual(fixture.footprint);
    expect(fixture.ctx.events.slice(fixture.start).filter(event => ['beginPath', 'translate', 'scale', 'rotate'].includes(event.operation))).toEqual([]);
    expect(fixture.ctx.getTransform()).toEqual(matrix);
    expect(painting.filter(event => event.stroke === base).length).toBeGreaterThan(0);
    expect(painting.every(event => event.lineWidth > 0 && event.lineWidth <= 4.7)).toBe(true);
    expect(fixture.ctx.stack).toEqual([]);
    expect(fixture.ctx.shadowBlur).toBe(7);
    expect(fixture.ctx.globalAlpha).toBe(0.7);
  });

  it.each([
    ['Accessible view', { d: { visualRealism: 'accessible' } }],
    ['high contrast', { highContrastEnabled: true }],
    ['hidden detail', { sceneDetail: false }],
  ])('uses one undecorated base-color stroke for %s', (_, overrides) => {
    const fixture = tissueFixture(overrides);
    const painting = drawTube(fixture);
    expect(painting).toHaveLength(1);
    expect(painting[0].path).toEqual(fixture.footprint);
    expect(painting[0].stroke).toBe(base);
    expect(painting[0].lineWidth).toBe(4);
    expect(painting[0].shadow).toEqual({ color: 'rgba(0,0,0,0)', blur: 0, x: 0, y: 0 });
    expect(fixture.ctx.globalAlpha).toBe(0.7);
    expect(fixture.ctx.stack).toEqual([]);
  });

  it.each([0, -4, NaN, Infinity, -Infinity, undefined, 'not-a-width'])('does no context work for invalid width %s', width => {
    const fixture = tissueFixture();
    productionFunction('strokeAnatomicalTube', fixture.bindings)(width, base, light, dark);
    expect(fixture.ctx.events.slice(fixture.start)).toEqual([]);
    expect(fixture.ctx.currentPath).toEqual(fixture.footprint);
  });

  it('moves opposite light and dark shoulders with the lamp and scales offsets for backing-pixel density', () => {
    const left = tissueFixture({ lightDirection: 'left' }), right = tissueFixture({ lightDirection: 'right' });
    const dense = tissueFixture({ lightDirection: 'left' });
    dense.ctx.matrix = { a: -2, b: 0, c: 0, d: 2, e: 0, f: 0 };
    const leftPaint = drawTube(left), rightPaint = drawTube(right), densePaint = drawTube(dense);
    const shoulder = (painting, color) => painting.find(event => event.shadow.color === color).shadow;
    const leftLight = shoulder(leftPaint, light), leftDark = shoulder(leftPaint, dark);
    const rightLight = shoulder(rightPaint, light), denseLight = shoulder(densePaint, light);
    expect(leftLight.x).toBeLessThan(0); expect(leftDark.x).toBeGreaterThan(0);
    expect(rightLight.x).toBeGreaterThan(0);
    expect(leftLight.x).toBeCloseTo(-rightLight.x);
    expect(denseLight.x).toBeCloseTo(leftLight.x * 2);
    expect(denseLight.y).toBeCloseTo(leftLight.y * 2);
    expect(denseLight.blur).toBeGreaterThanOrEqual(leftLight.blur);
    expect(denseLight.blur).toBeLessThanOrEqual(2.2);
    expect(densePaint.map(event => event.path)).toEqual(leftPaint.map(event => event.path));
  });

  it('restores caller opacity, shadows, and stroke settings after a failed tube paint', () => {
    const fixture = tissueFixture();
    fixture.ctx.stroke = vi.fn(() => { throw new Error('Injected tube paint failure'); });
    expect(() => drawTube(fixture)).toThrow('Injected tube paint failure');
    expect(fixture.ctx.stack).toEqual([]);
    expect(fixture.ctx.clipDepth).toBe(0);
    expect(fixture.ctx.globalAlpha).toBe(0.7);
    expect(fixture.ctx.shadowColor).toBe('rgba(0,0,0,0.25)');
    expect(fixture.ctx.shadowBlur).toBe(7);
    expect(fixture.ctx.shadowOffsetX).toBe(2); expect(fixture.ctx.shadowOffsetY).toBe(-3);
    expect(fixture.ctx.lineWidth).toBe(3);
    expect(fixture.ctx.strokeStyle).toBe('#654321');
    expect(fixture.ctx.currentPath).toEqual(fixture.footprint);
  });
});

describe('dissection organ contact, cavity, and membrane finishes', () => {
  it('paints contact shadow along the existing organ contour and restores shadow settings', () => {
    const fixture = tissueFixture();
    const contact = productionFunction('paintCurrentOrganContact', fixture.bindings);
    contact(20, 35);
    const painting = paintEvents(fixture.ctx);
    expect(painting.length).toBeGreaterThan(0);
    expect(painting.every(event => event.operation === 'stroke' && JSON.stringify(event.path) === JSON.stringify(fixture.footprint))).toBe(true);
    expect(fixture.ctx.currentPath).toEqual(fixture.footprint);
    expect(fixture.ctx.shadowBlur).toBe(7);
    expect(fixture.ctx.shadowColor).toBe('rgba(0,0,0,0.25)');
    expect(fixture.ctx.shadowOffsetX).toBe(2);
    expect(fixture.ctx.shadowOffsetY).toBe(-3);
    expect(fixture.ctx.lineWidth).toBe(3);
    expect(fixture.ctx.stack).toEqual([]);
  });

  it('keeps cavity shading within the existing opening while the cut rim follows its contour', () => {
    const fixture = tissueFixture();
    const cavity = productionFunction('finishCurrentCavityPath', fixture.bindings);
    cavity(120, 150, 20, 35);
    const painting = paintEvents(fixture.ctx);
    const fill = painting.filter(event => event.operation === 'fillRect');
    expect(fill.length).toBeGreaterThan(0);
    expect(fill.every(event => event.clipped)).toBe(true);
    expect(painting.filter(event => event.operation === 'stroke').map(event => event.path)).toContainEqual(fixture.footprint);
    expect(fixture.ctx.events.find(event => event.operation === 'clip').path).toEqual(fixture.footprint);
    expect(fixture.ctx.clipDepth).toBe(0);
    expect(fixture.ctx.shadowBlur).toBe(7);
    expect(fixture.ctx.lineWidth).toBe(3);
    expect(fixture.ctx.stack).toEqual([]);
  });

  it('restores cavity clipping and paint state after a failed fill while retaining the caller saved frame', () => {
    const fixture = tissueFixture();
    const cavity = productionFunction('finishCurrentCavityPath', fixture.bindings);
    fixture.ctx.save();
    const callerFrame = fixture.ctx.stack[0];
    fixture.ctx.fillRect = vi.fn(() => { throw new Error('Injected cavity fill failure'); });
    expect(() => cavity(120, 150, 20, 35)).toThrow('Injected cavity fill failure');
    expect(fixture.ctx.fillRect).toHaveBeenCalledOnce();
    expect(fixture.ctx.events.find(event => event.operation === 'clip').path).toEqual(fixture.footprint);
    expect(fixture.ctx.currentPath).toEqual(fixture.footprint);
    expect(fixture.ctx.stack).toEqual([callerFrame]);
    expect(fixture.ctx.clipDepth).toBe(0);
    expect(fixture.ctx.globalAlpha).toBe(0.7);
    expect(fixture.ctx.globalCompositeOperation).toBe('source-over');
    expect(fixture.ctx.fillStyle).toBe('#123456'); expect(fixture.ctx.strokeStyle).toBe('#654321');
    expect(fixture.ctx.shadowBlur).toBe(7); expect(fixture.ctx.lineWidth).toBe(3);
    fixture.ctx.restore();
    expect(fixture.ctx.stack).toEqual([]);
  });

  it('clips membrane folds to their authored path and retains the provided attachment points', () => {
    const fixture = tissueFixture();
    const folds = productionFunction('drawCurrentMembraneFolds', fixture.bindings);
    const edges = Object.freeze([Object.freeze({ x: 12, y: 30 }), Object.freeze({ x: 28, y: 45 }), Object.freeze({ x: 42, y: 32 })]);
    folds(24, 18, edges);
    const painting = paintEvents(fixture.ctx);
    expect(painting.length).toBeGreaterThan(0);
    expect(painting.length).toBeLessThanOrEqual(12);
    expect(painting.every(event => event.clipped)).toBe(true);
    expect(fixture.ctx.events.find(event => event.operation === 'clip').path).toEqual(fixture.footprint);
    expect(fixture.ctx.events.filter(event => event.operation === 'quadraticCurveTo').map(event => event.args.slice(-2))).toEqual(edges.map(edge => [edge.x, edge.y]));
    expect(fixture.ctx.clipDepth).toBe(0);
    expect(fixture.ctx.shadowBlur).toBe(7);
    expect(fixture.ctx.stack).toEqual([]);
  });

  it('skips all auxiliary finishes in Accessible, high contrast, and hidden-detail views', () => {
    const helpers = [
      ['paintCurrentOrganContact', [20, 35]],
      ['finishCurrentCavityPath', [120, 150, 20, 35]],
      ['drawCurrentMembraneFolds', [24, 18, [{ x: 12, y: 30 }]]],
    ];
    for (const overrides of [{ d: { visualRealism: 'accessible' } }, { highContrastEnabled: true }, { sceneDetail: false }]) {
      for (const [name, args] of helpers) {
        const fixture = tissueFixture(overrides);
        productionFunction(name, fixture.bindings)(...args);
        expect(fixture.ctx.events.slice(fixture.start), name).toEqual([]);
        expect(fixture.ctx.currentPath).toEqual(fixture.footprint);
        expect(fixture.ctx.stack).toEqual([]);
      }
    }
  });
});
