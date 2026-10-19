function ocularCardiacTargets(specimen, width = 500, height = 600) {
  if (specimen === 'sheepHeart') return [{ id: 'mitral', x: .427, y: .441 }, { id: 'aortic_v', x: .478, y: .355 }, { id: 'pulm_v', x: .552, y: .365 }];
  const radius = Math.min(width * .285, height * .36), rx = radius, ry = radius * .83, cx = width * .515, cy = height * .45;
  const tapetalAngle = -1.03, tapetalRotation = -.02, choroidAngle = .70, choroidRotation = -.015;
  return [{ id: 'lens', x: (cx - .43 * rx) / width, y: cy / height },
    { id: 'ciliary_body', x: (cx - .57 * rx) / width, y: (cy - .43 * ry) / height },
    { id: 'tapetum', x: (cx + .19 * rx + .71 * rx * Math.cos(tapetalAngle) * Math.cos(tapetalRotation) - .79 * ry * Math.sin(tapetalAngle) * Math.sin(tapetalRotation)) / width,
      y: (cy - .08 * ry + .71 * rx * Math.cos(tapetalAngle) * Math.sin(tapetalRotation) + .79 * ry * Math.sin(tapetalAngle) * Math.cos(tapetalRotation)) / height },
    { id: 'choroid', x: (cx + .918 * rx * Math.cos(choroidAngle) * Math.cos(choroidRotation) - .895 * ry * Math.sin(choroidAngle) * Math.sin(choroidRotation)) / width,
      y: (cy + .918 * rx * Math.cos(choroidAngle) * Math.sin(choroidRotation) + .895 * ry * Math.sin(choroidAngle) * Math.cos(choroidRotation)) / height }];
}

async function observeOcularCardiacPaint(canvas, specimen) {
  const dimensions = await canvas.evaluate(canvas => ({ width: canvas._logicalW, height: canvas._logicalH }));
  return canvas.evaluate((canvas, { specimen, candidates }) => {
    const ctx = canvas.getContext('2d'), originals = {};
    for (const method of ['beginPath', 'fill', 'save', 'arc', 'ellipse', 'moveTo', 'fillText', 'stroke']) originals[method] = ctx[method];
    const bodyFunction = specimen === 'sheepEye' ? 'traceSheepEyeGlobe' : 'traceSheepHeartBody';
    const radius = Math.min(canvas._logicalW * .285, canvas._logicalH * .36);
    let matrix = null, bodyPath = false, measuredBody = false, globeScale = null, samples = null, reticle = null;
    let retinalVessels = 0, simpleVessels = 0, incomingRays = 0, mitralInsideLeaflet = false, choroidOuter = false, choroidInsideRetina = false;
    const contained = new Set(), labels = [];
    function mapped(target) { return new DOMPoint(target.x * canvas._logicalW, target.y * canvas._logicalH).matrixTransform(matrix); }
    ctx.beginPath = function () {
      globeScale = null; bodyPath = !measuredBody && (new Error().stack || '').includes(bodyFunction);
      if (bodyPath) matrix = this.getTransform();
      return originals.beginPath.call(this);
    };
    ctx.ellipse = function (x, y, rx, ry, ...args) {
      if (specimen === 'sheepEye' && (new Error().stack || '').includes('traceSheepEyeGlobe')) globeScale = { x: rx / radius, y: ry / (radius * .83) };
      return originals.ellipse.call(this, x, y, rx, ry, ...args);
    };
    ctx.fill = function (...args) {
      const stack = new Error().stack || '';
      if (bodyPath && matrix) { for (const target of candidates) { const point = mapped(target); if (this.isPointInPath(point.x, point.y)) contained.add(target.id); } measuredBody = true; }
      if (stack.includes('paintRetinalVessel')) retinalVessels++;
      if (matrix && globeScale && Math.abs(globeScale.x - .945) < .001 && Math.abs(globeScale.y - .925) < .001) {
        const point = mapped(candidates.find(target => target.id === 'choroid')); choroidOuter = this.isPointInPath(point.x, point.y);
      }
      if (matrix && globeScale && Math.abs(globeScale.x - .89) < .001 && Math.abs(globeScale.y - .865) < .001) {
        const point = mapped(candidates.find(target => target.id === 'choroid')); choroidInsideRetina = this.isPointInPath(point.x, point.y);
      }
      if (matrix && specimen === 'sheepHeart' && stack.includes('drawHeartValveLeaflet')) {
        const point = mapped(candidates.find(target => target.id === 'mitral')); if (this.isPointInPath(point.x, point.y)) mitralInsideLeaflet = true;
      }
      return originals.fill.apply(this, args);
    };
    ctx.stroke = function (...args) { if (specimen === 'sheepEye' && this.strokeStyle === '#dc2626') simpleVessels++; return originals.stroke.apply(this, args); };
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
    ctx.moveTo = function (x, y) {
      if (specimen === 'sheepEye' && Math.abs(x - (canvas._logicalW * .515 - radius * 1.47)) < .001 && Math.abs(y - (canvas._logicalH * .45 - radius * .83 * .24)) < .001 && this.strokeStyle === '#fbbf24') incomingRays++;
      return originals.moveTo.call(this, x, y);
    };
    ctx.fillText = function (value, ...args) { labels.push(String(value)); return originals.fillText.call(this, value, ...args); };
    try { canvas._drawDissectionNow(); } finally { for (const method of Object.keys(originals)) ctx[method] = originals[method]; }
    const box = canvas.getBoundingClientRect(), screen = point => ({ x: box.x + point.x / canvas.width * box.width, y: box.y + point.y / canvas.height * box.height });
    return { matrixObserved: !!matrix, retinalVessels, simpleVessels, incomingRays, labels, mitralInsideLeaflet,
      choroidInsideBand: choroidOuter && !choroidInsideRetina, reticle: reticle ? screen(reticle) : null,
      targets: candidates.map(target => matrix ? { id: target.id, ...screen(mapped(target)), normalized: { x: target.x, y: target.y },
        source: 'actual ' + bodyFunction + ' paint transform', insidePaintedBody: contained.has(target.id), beforeMarkersRGBA: samples && samples[target.id],
        ...(target.id === 'choroid' ? { insidePaintedChoroidBand: choroidOuter && !choroidInsideRetina } : {}),
        ...(target.id === 'mitral' ? { insidePaintedLeaflet: mitralInsideLeaflet } : {}) } : { id: target.id, missing: true }) };
  }, { specimen, candidates: ocularCardiacTargets(specimen, dimensions.width, dimensions.height) });
}

module.exports = { ocularCardiacTargets, observeOcularCardiacPaint };
