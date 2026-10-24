function invertebrateTargets(specimen) {
  if (specimen === 'earthworm') return [{ id: 'pharynx', t: .105 }, { id: 'crop', t: .315 }, { id: 'gizzard', t: .37 }].map(target => ({
    id: target.id, x: .5 + Math.sin(target.t * Math.PI * 2.15 + .32) * .026 + Math.sin(target.t * Math.PI * 5.1) * .005,
    y: .07 + .76 * target.t
  }));
  return [{ id: 'heart_c', x: .535, y: .415 }, { id: 'gills_c', x: .557, y: .358 },
    { id: 'gastric_mill', x: .380, y: .450 }, { id: 'green_gland', x: .295, y: .412 },
    { id: 'hepato', x: .485, y: .484 }, { id: 'gonads_c', x: .575, y: .450 }];
}

async function observeInvertebratePaint(canvas, specimen) {
  return canvas.evaluate((canvas, { specimen, candidates }) => {
    const ctx = canvas.getContext('2d'), begin = ctx.beginPath, fill = ctx.fill, save = ctx.save, arc = ctx.arc;
    const bodyFunction = specimen === 'earthworm' ? 'traceEarthwormBody' : 'traceCrayfishCarapace';
    let matrix = null, bodyPath = false, bodyMeasured = false, samples = null, reticle = null;
    const contained = new Set();
    ctx.beginPath = function () {
      bodyPath = !bodyMeasured && (new Error().stack || '').includes(bodyFunction);
      if (bodyPath) matrix = this.getTransform();
      return begin.call(this);
    };
    ctx.fill = function (...args) {
      if (bodyPath && matrix) {
        for (const target of candidates) {
          const point = new DOMPoint(target.x * canvas._logicalW, target.y * canvas._logicalH).matrixTransform(matrix);
          if (this.isPointInPath(point.x, point.y)) contained.add(target.id);
        }
        bodyMeasured = true;
      }
      return fill.apply(this, args);
    };
    ctx.save = function () {
      if (matrix && !samples && (new Error().stack || '').includes('drawSpecimenTissueRelief')) {
        samples = {};
        for (const target of candidates) {
          const point = new DOMPoint(target.x * canvas._logicalW, target.y * canvas._logicalH).matrixTransform(matrix);
          samples[target.id] = Array.from(this.getImageData(Math.round(point.x), Math.round(point.y), 1, 1).data);
        }
      }
      return save.call(this);
    };
    ctx.arc = function (x, y, radius, start, end, ...args) {
      if (!reticle && Math.abs(end - start - .58) < .0001 && /254,\s*240,\s*138/.test(this.strokeStyle)) {
        reticle = new DOMPoint(x, y).matrixTransform(this.getTransform());
      }
      return arc.call(this, x, y, radius, start, end, ...args);
    };
    try { canvas._drawDissectionNow(); } finally { ctx.beginPath = begin; ctx.fill = fill; ctx.save = save; ctx.arc = arc; }
    const box = canvas.getBoundingClientRect();
    return { matrixObserved: !!matrix, reticle: reticle ? { x: box.x + reticle.x / canvas.width * box.width, y: box.y + reticle.y / canvas.height * box.height } : null,
      targets: candidates.map(target => {
        if (!matrix) return { id: target.id, missing: true };
        const point = new DOMPoint(target.x * canvas._logicalW, target.y * canvas._logicalH).matrixTransform(matrix);
        return { id: target.id, x: box.x + point.x / canvas.width * box.width, y: box.y + point.y / canvas.height * box.height,
          normalized: { x: target.x, y: target.y }, insidePaintedBody: contained.has(target.id),
          beforeMarkersRGBA: samples && samples[target.id], source: 'actual ' + bodyFunction + ' paint transform' };
      }) };
  }, { specimen, candidates: invertebrateTargets(specimen) });
}

module.exports = { invertebrateTargets, observeInvertebratePaint };
