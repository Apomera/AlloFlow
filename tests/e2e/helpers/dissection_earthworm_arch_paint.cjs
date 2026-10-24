async function observeEarthwormArchPaint(canvas) {
  return canvas.evaluate(node => {
    const ctx = node.getContext('2d'), originals = {};
    for (const method of ['beginPath', 'moveTo', 'lineTo', 'bezierCurveTo', 'closePath', 'stroke', 'fill', 'clip', 'arc']) originals[method] = ctx[method];
    const arms = new Map(), fields = [], vesicles = [];
    let owned = false, cavity = null, cavityMatrix = null, vesiclePath = false, paths = [], active = null;
    let target = null, reticle = null, paints = 0, dorsalPaths = 0;
    const normalized = p => ({ x: p.x / node._logicalW, y: p.y / node._logicalH });
    const screen = p => { const box = node.getBoundingClientRect(); return { x: box.x + p.x / node.width * box.width, y: box.y + p.y / node.height * box.height }; };
    ctx.beginPath = function () {
      const stack = new Error().stack || '';
      owned = stack.includes('drawEarthwormAorticArches'); paths = []; active = null;
      cavity = stack.includes('traceEarthwormNephridialField') ? new Path2D() : null;
      cavityMatrix = cavity ? this.getTransform() : null;
      vesiclePath = stack.includes('traceEarthwormSeminalVesicle');
      return originals.beginPath.call(this);
    };
    ctx.moveTo = function (x, y) {
      if (owned && !cavity) { active = { start: { x, y }, cubics: [], matrix: this.getTransform() }; paths.push(active); }
      if (cavity) cavity.moveTo(x, y);
      return originals.moveTo.call(this, x, y);
    };
    ctx.lineTo = function (x, y) { if (cavity) cavity.lineTo(x, y); return originals.lineTo.call(this, x, y); };
    ctx.bezierCurveTo = function (...args) {
      if (owned && active && !cavity) active.cubics.push(args);
      if (cavity) cavity.bezierCurveTo(...args);
      return originals.bezierCurveTo.apply(this, args);
    };
    ctx.closePath = function () { if (cavity) cavity.closePath(); return originals.closePath.call(this); };
    ctx.clip = function (...args) { if (cavity) fields.push({ path: cavity, matrix: cavityMatrix }); return originals.clip.apply(this, args); };
    ctx.stroke = function (...args) {
      if (owned && !cavity) {
        paints++;
        for (const path of paths) {
          if (path.cubics.length === 6) dorsalPaths++;
          if (path.cubics.length !== 1) continue;
          const curve = path.cubics[0], key = [path.start.x, path.start.y, ...curve].map(n => n.toFixed(6)).join(',');
          if (arms.has(key)) continue;
          const start = new DOMPoint(path.start.x, path.start.y).matrixTransform(path.matrix);
          const end = new DOMPoint(curve[4], curve[5]).matrixTransform(path.matrix);
          arms.set(key, { start: normalized(path.start), end: normalized({ x: curve[4], y: curve[5] }),
            startPoint: { x: start.x, y: start.y }, endPoint: { x: end.x, y: end.y },
            startInsideStroke: this.isPointInStroke(start.x, start.y), endInsideStroke: this.isPointInStroke(end.x, end.y) });
          if (!target) target = { x: start.x, y: start.y };
        }
      }
      return originals.stroke.apply(this, args);
    };
    ctx.fill = function (...args) {
      if (vesiclePath && target) vesicles.push({ containsTarget: this.isPointInPath(target.x, target.y) });
      return originals.fill.apply(this, args);
    };
    ctx.arc = function (x, y, radius, start, end, ...args) {
      if (!reticle && Math.abs(end - start - .58) < .0001) {
        const point = new DOMPoint(x, y).matrixTransform(this.getTransform()); reticle = { x: point.x, y: point.y };
      }
      return originals.arc.call(this, x, y, radius, start, end, ...args);
    };
    try { node._drawDissectionNow(); } finally { for (const method of Object.keys(originals)) ctx[method] = originals[method]; }
    const insideCavity = !!target && fields.length > 0 && fields.every(field => {
      ctx.save(); try { ctx.setTransform(field.matrix); return ctx.isPointInPath(field.path, target.x, target.y); } finally { ctx.restore(); }
    });
    const painted = Array.from(arms.values()), rear = painted.slice(0, 10), front = painted.slice(10);
    return { logicalWidth: node._logicalW, logicalHeight: node._logicalH, rear, front, dorsalPaths, paints, insideCavity, vesicles,
      target: rear[0] ? { normalized: rear[0].start, point: screen(rear[0].startPoint) } : null,
      reticle: reticle ? screen(reticle) : null };
  });
}
module.exports = { observeEarthwormArchPaint };
