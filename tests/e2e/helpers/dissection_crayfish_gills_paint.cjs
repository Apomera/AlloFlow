// Observe forwarded paint operations rather than deriving a click from a label.
async function observeCrayfishGillsPaint(canvas) {
  return canvas.evaluate(node => {
    const ctx = node.getContext('2d'), originals = {};
    for (const method of ['beginPath', 'moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'stroke', 'arc']) originals[method] = ctx[method];
    const shafts = new Map(); let owned = false, paths = [], active = null, reticle = null, paints = 0, cubicFilaments = 0, quadraticFilaments = 0;
    const screen = point => { const box = node.getBoundingClientRect(); return { x: box.x + point.x / node.width * box.width, y: box.y + point.y / node.height * box.height }; };
    ctx.beginPath = function () { owned = (new Error().stack || '').includes('drawCrayfishGillPlumes'); paths = []; active = null; return originals.beginPath.call(this); };
    ctx.moveTo = function (x, y) {
      if (owned) { active = { start: { x, y }, lines: [], cubics: [], quadratics: [], matrix: this.getTransform() }; paths.push(active); }
      return originals.moveTo.call(this, x, y);
    };
    ctx.lineTo = function (x, y) { if (owned && active) active.lines.push({ x, y }); return originals.lineTo.call(this, x, y); };
    ctx.bezierCurveTo = function (...args) { if (owned && active) active.cubics.push(args); return originals.bezierCurveTo.apply(this, args); };
    ctx.quadraticCurveTo = function (...args) { if (owned && active) active.quadratics.push(args); return originals.quadraticCurveTo.apply(this, args); };
    ctx.stroke = function (...args) {
      if (owned) {
        paints++;
        for (const path of paths) {
          const end = path.lines[0] || (path.cubics[0] && { x: path.cubics[0][4], y: path.cubics[0][5] });
          // A full-length central shaft is distinct from the shorter side branches.
          if (end && Math.abs(Math.abs(end.y - path.start.y) / node._logicalH - .04) < .00001) {
            const key = path.start.x.toFixed(5) + ',' + path.start.y.toFixed(5);
            if (!shafts.has(key)) {
              const c = path.cubics[0], local = c ? {
                x: (path.start.x + 3 * c[0] + 3 * c[2] + c[4]) / 8,
                y: (path.start.y + 3 * c[1] + 3 * c[3] + c[5]) / 8
              } : { x: (path.start.x + end.x) / 2, y: (path.start.y + end.y) / 2 };
              const point = new DOMPoint(local.x, local.y).matrixTransform(path.matrix);
              shafts.set(key, { start: { x: path.start.x / node._logicalW, y: path.start.y / node._logicalH },
                normalized: { x: local.x / node._logicalW, y: local.y / node._logicalH }, point: { x: point.x, y: point.y },
                insideStroke: this.isPointInStroke(point.x, point.y), curved: !!c });
            }
          } else { cubicFilaments += path.cubics.length; quadraticFilaments += path.quadratics.length; }
        }
      }
      return originals.stroke.apply(this, args);
    };
    ctx.arc = function (x, y, radius, start, end, ...args) {
      if (!reticle && Math.abs(end - start - .58) < .0001) {
        const point = new DOMPoint(x, y).matrixTransform(this.getTransform()); reticle = { x: point.x, y: point.y };
      }
      return originals.arc.call(this, x, y, radius, start, end, ...args);
    };
    try { node._drawDissectionNow(); } finally { for (const method of Object.keys(originals)) ctx[method] = originals[method]; }
    const plumes = Array.from(shafts.values()).map(shaft => ({ ...shaft, point: screen(shaft.point) }));
    return { logicalWidth: node._logicalW, logicalHeight: node._logicalH, plumes, target: plumes[2] || null,
      reticle: reticle ? screen(reticle) : null, paints, cubicFilaments, quadraticFilaments };
  });
}
module.exports = { observeCrayfishGillsPaint };
