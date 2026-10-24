function pulmonaryVisceralTargets(specimen) {
  return ({
    frog: [{ id: 'pancreas', x: .528, y: .5405 }, { id: 'spleen', x: .408, y: .565 }],
    pig: [{ id: 'lungs_p', x: .385, y: .425 }, { id: 'pancreas_p', x: .63175, y: .533 }],
    perch: [{ id: 'swim_bladder', x: .515, y: .407 }, { id: 'gonads_f', x: .595, y: .471 }]
  })[specimen] || [];
}

// Observe the real renderer without replacing, suppressing, or repainting artwork.
async function observePulmonaryVisceralPaint(canvas, specimen) {
  return canvas.evaluate((canvas, { specimen, candidates }) => {
    const ctx = canvas.getContext('2d'), originals = {};
    for (const method of ['beginPath', 'fill', 'save', 'arc', 'ellipse', 'moveTo']) originals[method] = ctx[method];
    const bodyFunction = { frog: 'traceFrogTorso', pig: 'tracePigBody', perch: 'tracePerchBody' }[specimen];
    let matrix = null, bodyPath = false, measuredBody = false, owner = null, samples = null, reticle = null;
    const contained = new Set(), organContained = new Set(); let lungInsideHeart = false, heartPathObserved = false;
    function mapped(target) { return new DOMPoint(target.x * canvas._logicalW, target.y * canvas._logicalH).matrixTransform(matrix); }
    ctx.beginPath = function () {
      const stack = new Error().stack || '';
      bodyPath = !measuredBody && stack.includes(bodyFunction);
      if (bodyPath) matrix = this.getTransform();
      owner = stack.includes('traceFrogPancreaticRegion') ? 'pancreas'
        : stack.includes('traceFrogSplenicRegion') ? 'spleen'
        : stack.includes('tracePigPancreaticRegion') ? 'pancreas_p'
        : stack.includes('tracePigPleuralSurface') ? 'lungs_p'
        : stack.includes('tracePigCardiacRegion') ? 'pig-heart'
        : stack.includes('tracePerchThinSac') ? 'perch-sac' : null;
      return originals.beginPath.call(this);
    };
    ctx.ellipse = function (x, y, rx, ry, ...args) {
      // The spleen is directly painted as an ellipse rather than a named trace.
      if (specimen === 'frog' && Math.abs(x / canvas._logicalW - .408) < .00001 && Math.abs(y / canvas._logicalH - .565) < .00001) owner = 'spleen';
      return originals.ellipse.call(this, x, y, rx, ry, ...args);
    };
    ctx.moveTo = function (x, y) { return originals.moveTo.call(this, x, y); };

    ctx.fill = function (...args) {
      if (matrix) for (const target of candidates) {
        const point = mapped(target), inside = this.isPointInPath(point.x, point.y);
        if (bodyPath && inside) contained.add(target.id);
        if (inside && (owner === target.id || owner === 'perch-sac')) organContained.add(target.id);
        if (target.id === 'lungs_p' && owner === 'pig-heart') { heartPathObserved = true; lungInsideHeart = inside; }
      }
      if (bodyPath) measuredBody = true;
      return originals.fill.apply(this, args);
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
    return { matrixObserved: !!matrix, reticle: reticle ? screen(reticle) : null, lungInsideHeart, heartPathObserved,
      targets: candidates.map(target => matrix ? { id: target.id, ...screen(mapped(target)), normalized: { x: target.x, y: target.y },
        source: 'actual ' + bodyFunction + ' paint transform', insidePaintedBody: contained.has(target.id),
        insidePaintedOrgan: organContained.has(target.id), beforeMarkersRGBA: samples && samples[target.id] } : { id: target.id, missing: true }) };
  }, { specimen, candidates: pulmonaryVisceralTargets(specimen) });
}

module.exports = { pulmonaryVisceralTargets, observePulmonaryVisceralPaint };
