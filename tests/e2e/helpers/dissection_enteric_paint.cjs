function entericTargets(specimen) {
  return specimen === 'frog'
    ? [{ id: 'fat_bodies', x: .581, y: .508 }, { id: 'sm_intestine', x: .470625, y: .609375 }]
    : [{ id: 'sm_int_p', x: .559375, y: .540625 }];
}

async function observeEntericPaint(canvas, specimen) {
  return canvas.evaluate((canvas, { specimen, candidates }) => {
    const ctx = canvas.getContext('2d'), originals = {};
    for (const method of ['beginPath', 'fill', 'clip', 'save', 'arc']) originals[method] = ctx[method];
    const bodyFunction = specimen === 'frog' ? 'traceFrogTorso' : 'tracePigBody';
    let matrix = null, bodyPath = false, bodyMeasured = false, fatPath = false, samples = null, reticle = null;
    let bowelFillObserved = false, bowelClipObserved = false;
    const body = new Set(), organs = new Set(), clips = new Set();
    function mapped(target) { return new DOMPoint(target.x * canvas._logicalW, target.y * canvas._logicalH).matrixTransform(matrix); }
    function inside(target, path) {
      const point = mapped(target);
      return path ? ctx.isPointInPath(path, point.x, point.y) : ctx.isPointInPath(point.x, point.y);
    }
    ctx.beginPath = function () {
      const stack = new Error().stack || '';
      bodyPath = !bodyMeasured && stack.includes(bodyFunction);
      if (bodyPath) matrix = this.getTransform();
      fatPath = stack.includes('traceFrogFatBodies');
      return originals.beginPath.call(this);
    };
    ctx.fill = function (...args) {
      if (matrix && bodyPath) { for (const target of candidates) if (inside(target)) body.add(target.id); bodyMeasured = true; }
      if (matrix && fatPath) for (const target of candidates) if (target.id === 'fat_bodies' && inside(target)) organs.add(target.id);
      // The first explicit Path2D fill is the real bowel silhouette, before
      // material shading starts its smaller paths. Test that painted union.
      if (matrix && !bowelFillObserved && args[0] instanceof Path2D && (new Error().stack || '').includes('drawEntericBowel')) {
        bowelFillObserved = true;
        for (const target of candidates) if (target.id !== 'fat_bodies' && inside(target, args[0])) organs.add(target.id);
      }
      return originals.fill.apply(this, args);
    };
    ctx.clip = function (...args) {
      if (matrix && fatPath) for (const target of candidates) if (target.id === 'fat_bodies' && inside(target)) clips.add(target.id);
      if (matrix && !bowelClipObserved && args[0] instanceof Path2D && (new Error().stack || '').includes('drawEntericBowel')) {
        bowelClipObserved = true;
        for (const target of candidates) if (target.id !== 'fat_bodies' && inside(target, args[0])) clips.add(target.id);
      }
      return originals.clip.apply(this, args);
    };
    ctx.save = function () {
      if (matrix && !samples && (new Error().stack || '').includes('drawSpecimenTissueRelief')) {
        samples = {}; for (const target of candidates) { const point = mapped(target); samples[target.id] = Array.from(this.getImageData(Math.round(point.x), Math.round(point.y), 1, 1).data); }
      }
      return originals.save.call(this);
    };
    ctx.arc = function (x, y, radius, start, end, ...args) {
      if (!reticle && Math.abs(end - start - .58) < .0001 && /254,\s*240,\s*138/.test(this.strokeStyle)) reticle = new DOMPoint(x, y).matrixTransform(this.getTransform());
      return originals.arc.call(this, x, y, radius, start, end, ...args);
    };
    try { canvas._drawDissectionNow(); } finally { for (const method of Object.keys(originals)) ctx[method] = originals[method]; }
    const box = canvas.getBoundingClientRect(), screen = point => ({ x: box.x + point.x / canvas.width * box.width, y: box.y + point.y / canvas.height * box.height });
    return { matrixObserved: !!matrix, bowelFillObserved, bowelClipObserved, reticle: reticle ? screen(reticle) : null,
      targets: candidates.map(target => matrix ? { id: target.id, ...screen(mapped(target)), normalized: { x: target.x, y: target.y },
        source: 'actual ' + bodyFunction + ' paint transform', insidePaintedBody: body.has(target.id),
        insidePaintedOrgan: organs.has(target.id), insideMaterialClip: clips.has(target.id), beforeMarkersRGBA: samples && samples[target.id] } : { id: target.id, missing: true }) };
  }, { specimen, candidates: entericTargets(specimen) });
}

module.exports = { entericTargets, observeEntericPaint };
