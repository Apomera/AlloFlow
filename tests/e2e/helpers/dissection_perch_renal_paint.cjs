async function observePerchRenalPaint(canvas, anchor = { x: .515, y: .366 }) {
  return canvas.evaluate((node, anchor) => {
    const ctx = node.getContext('2d'), originals = {};
    for (const method of ['beginPath', 'moveTo', 'lineTo', 'bezierCurveTo', 'closePath', 'ellipse', 'fill', 'fillRect', 'stroke', 'clip', 'arc']) originals[method] = ctx[method];
    let owned = false, region = false, cavity = false, sac = false, aorta = false, recordedPath = null;
    let pathMatrix = null, matrix = null, target = null, reticle = null, paints = 0, cubics = 0;
    const regions = [], cavities = [], renalClips = [], sacs = [], aortaStrokes = [];
    const near = (a, b) => Math.abs(a - b) < .00001;
    const screen = p => { const box = node.getBoundingClientRect(); return { x: box.x + p.x / node.width * box.width, y: box.y + p.y / node.height * box.height }; };
    ctx.beginPath = function () {
      const stack = new Error().stack || '';
      owned = stack.includes('drawPerchRenalTissue'); region = stack.includes('tracePerchRenalRegion');
      cavity = stack.includes('tracePerchCoelom'); sac = stack.includes('tracePerchThinSac'); aorta = false; cubics = 0;
      recordedPath = region || cavity ? new Path2D() : null; pathMatrix = recordedPath ? this.getTransform() : null;
      return originals.beginPath.call(this);
    };
    ctx.moveTo = function (x, y) {
      if (recordedPath) recordedPath.moveTo(x, y);
      if (!owned && near(x / node._logicalW, .325) && near(y / node._logicalH, .392)) aorta = true;
      return originals.moveTo.call(this, x, y);
    };
    ctx.lineTo = function (x, y) { if (recordedPath) recordedPath.lineTo(x, y); return originals.lineTo.call(this, x, y); };
    ctx.bezierCurveTo = function (...args) { if (recordedPath) recordedPath.bezierCurveTo(...args); cubics++; return originals.bezierCurveTo.apply(this, args); };
    ctx.closePath = function () { if (recordedPath) recordedPath.closePath(); return originals.closePath.call(this); };
    ctx.ellipse = function (...args) {
      // The clarity bladder is authored directly rather than through the detailed sac tracer.
      if (near(args[0] / node._logicalW, .515) && near(args[1] / node._logicalH, .407) && near(args[2] / node._logicalW, .120)) sac = true;
      return originals.ellipse.apply(this, args);
    };
    ctx.fill = function (...args) {
      if (owned) paints++;
      if (owned && region) {
        matrix = this.getTransform();
        const p = new DOMPoint(anchor.x * node._logicalW, anchor.y * node._logicalH).matrixTransform(matrix);
        target = { x: p.x, y: p.y };
        regions.push({ cubics, containsTarget: this.isPointInPath(target.x, target.y) });
      }
      if (sac && target) sacs.push({ containsTarget: this.isPointInPath(target.x, target.y) });
      return originals.fill.apply(this, args);
    };
    ctx.fillRect = function (...args) { if (owned) paints++; return originals.fillRect.apply(this, args); };
    ctx.stroke = function (...args) {
      if (owned) paints++;
      if (aorta && target) aortaStrokes.push({ containsTarget: this.isPointInStroke(target.x, target.y) });
      return originals.stroke.apply(this, args);
    };
    ctx.clip = function (...args) {
      if (cavity && recordedPath) cavities.push({ path: recordedPath, matrix: pathMatrix });
      if (owned && region && recordedPath) renalClips.push({ path: recordedPath, matrix: pathMatrix });
      return originals.clip.apply(this, args);
    };
    ctx.arc = function (x, y, radius, start, end, ...args) {
      if (!reticle && Math.abs(end - start - .58) < .0001) {
        const p = new DOMPoint(x, y).matrixTransform(this.getTransform()); reticle = { x: p.x, y: p.y };
      }
      return originals.arc.call(this, x, y, radius, start, end, ...args);
    };
    try { node._drawDissectionNow(); } finally { for (const method of Object.keys(originals)) ctx[method] = originals[method]; }
    const contains = record => {
      if (!target) return false;
      ctx.save(); try { ctx.setTransform(record.matrix); return ctx.isPointInPath(record.path, target.x, target.y); } finally { ctx.restore(); }
    };
    return { logicalWidth: node._logicalW, logicalHeight: node._logicalH, matrixObserved: !!matrix, regions, paints,
      insideCavity: cavities.length > 0 && cavities.every(contains), renalClipCount: renalClips.length,
      renalClipContainsTarget: renalClips.length > 0 && renalClips.every(contains), sacs, aortaStrokes,
      target: target ? screen(target) : null, normalizedTarget: anchor, reticle: reticle ? screen(reticle) : null };
  }, anchor);
}
module.exports = { observePerchRenalPaint };
