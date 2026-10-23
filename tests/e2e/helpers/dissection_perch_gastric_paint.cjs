// The shared canvas selection observer takes an organ id and is species independent.
const { observeFrogAccessoryCaption: observePerchGastricCaption } = require('./dissection_frog_accessory_paint.cjs');
const gastricTarget = { x: .472, y: .501 };
const gastricNeighbors = [{ id: 'liver_f', x: .385, y: .476 },
  { id: 'pyloric_ceca', x: .531082603665, y: .539848634444 }];

async function observePerchGastricPaint(canvas) {
  return canvas.evaluate((node, anchors) => {
    const ctx = node.getContext('2d'), originals = {};
    for (const method of ['beginPath', 'moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'closePath', 'ellipse', 'arc', 'fill', 'stroke', 'clip', 'fillRect']) originals[method] = ctx[method];
    let matrix = null, owner = '', traced = false, closed = false, cubics = [], quadratics = [], lines = [], start = null;
    let path = null, pathMatrix = null, gastricPath = null, gastricMatrix = null, seenGastric = false, paints = 0, reticle = null;
    const regions = [], clips = [], cavities = [], laterPaint = [], inletCourses = [], caecalRegions = [], caecalCourses = new Map();
    const neighbors = anchors.neighbors.map(anchor => ({ ...anchor, ownPaintCount: 0, insideOwnPaint: false, coveredByGastric: false }));
    const near = (a, b) => Math.abs(a - b) < 1e-5;
    const point = anchor => matrix && new DOMPoint(anchor.x * node._logicalW, anchor.y * node._logicalH).matrixTransform(matrix);
    const screen = p => { const box = node.getBoundingClientRect(); return { x: box.x + p.x / node.width * box.width, y: box.y + p.y / node.height * box.height }; };
    const snapshot = () => {
      const p = point(anchors.target);
      return p ? Array.from(ctx.getImageData(Math.max(0, Math.min(node.width - 1, Math.round(p.x))), Math.max(0, Math.min(node.height - 1, Math.round(p.y))), 1, 1).data) : null;
    };
    const ownerFromStack = stack => {
      if (stack.includes('drawPerchGastricSurface')) return 'stomach';
      if (stack.includes('drawPerchPyloricCaeca')) return 'caeca';
      if (stack.includes('tracePerchCaecalRegion')) return 'caecal-inlet';
      if (stack.includes('drawPerchGillArch')) return 'gills';
      if (stack.includes('drawPerchCardiacComplex')) return 'cardiac';
      if (stack.includes('traceHepaticLobe')) return 'liver';
      return '';
    };
    ctx.beginPath = function () {
      const stack = new Error().stack || '';
      if (!matrix && stack.includes('tracePerchBody')) matrix = this.getTransform();
      owner = ownerFromStack(stack); traced = stack.includes('tracePerchGastricRegion');
      closed = false; cubics = []; quadratics = []; lines = []; start = null;
      path = new Path2D(); pathMatrix = this.getTransform();
      if (stack.includes('tracePerchCoelom')) owner = 'cavity';
      return originals.beginPath.call(this);
    };
    ctx.moveTo = function (x, y) {
      if (!start) start = { x, y };
      if (path) path.moveTo(x, y);
      if (!owner && near(x / node._logicalW, .518) && near(y / node._logicalH, .521)) owner = 'intestine';
      return originals.moveTo.call(this, x, y);
    };
    ctx.lineTo = function (x, y) { if (path) path.lineTo(x, y); lines.push([x, y]); return originals.lineTo.call(this, x, y); };
    ctx.bezierCurveTo = function (...args) { if (path) path.bezierCurveTo(...args); cubics.push(args); return originals.bezierCurveTo.apply(this, args); };
    ctx.quadraticCurveTo = function (...args) { if (path) path.quadraticCurveTo(...args); quadratics.push(args); return originals.quadraticCurveTo.apply(this, args); };
    ctx.closePath = function () { if (path) path.closePath(); closed = true; return originals.closePath.call(this); };
    ctx.ellipse = function (...args) {
      if (path) path.ellipse(...args);
      if (!owner && near(args[0] / node._logicalW, .516) && near(args[1] / node._logicalH, .492) && near(args[2] / node._logicalW, .020)) owner = 'spleen';
      return originals.ellipse.apply(this, args);
    };
    const recordLater = (paint, callback, rect) => {
      const relevant = seenGastric && ['caecal-inlet', 'caeca', 'intestine', 'gills', 'cardiac', 'spleen'].includes(owner);
      const before = relevant ? snapshot() : null, p = point(anchors.target);
      let containsTarget = false;
      if (relevant && p) {
        if (rect) { const r = new Path2D(); r.rect(...rect); containsTarget = ctx.isPointInPath(r, p.x, p.y); }
        else containsTarget = paint === 'stroke' ? ctx.isPointInStroke(p.x, p.y) : ctx.isPointInPath(p.x, p.y);
      }
      const result = callback();
      if (relevant) { const after = snapshot(); laterPaint.push({ owner, paint, cubics: cubics.length, quadratics: quadratics.length,
        containsTarget, targetPixelBefore: before, targetPixelAfter: after, targetPixelUnchanged: JSON.stringify(before) === JSON.stringify(after) }); }
      return result;
    };
    ctx.fill = function (...args) {
      if ((new Error().stack || '').includes('drawPerchGastricSurface')) paints++;
      if (owner === 'stomach' && traced && closed && matrix) {
        const p = point(anchors.target); regions.push({ cubics: cubics.length, containsTarget: this.isPointInPath(p.x, p.y) });
        if (!gastricPath) { gastricPath = new Path2D(path); gastricMatrix = pathMatrix; }
        seenGastric = true;
        for (const neighbor of neighbors) { const q = point(neighbor); neighbor.coveredByGastric ||= this.isPointInPath(q.x, q.y); }
      }
      if (owner === 'liver' && matrix) { const neighbor = neighbors[0], p = point(neighbor); neighbor.ownPaintCount++; neighbor.insideOwnPaint ||= this.isPointInPath(p.x, p.y); }
      if (owner === 'caeca' && closed && cubics.length === 6 && matrix) {
        const neighbor = neighbors[1], p = point(neighbor); neighbor.ownPaintCount++; const containsNeighbor = this.isPointInPath(p.x, p.y);
        neighbor.insideOwnPaint ||= containsNeighbor; caecalRegions.push({ cubics: cubics.length, containsNeighbor });
      }
      return recordLater('fill', () => originals.fill.apply(this, args));
    };
    ctx.stroke = function (...args) {
      if ((new Error().stack || '').includes('drawPerchGastricSurface')) paints++;
      if (owner === 'caecal-inlet' && start && cubics.length && gastricPath) {
        const p = new DOMPoint(start.x, start.y).matrixTransform(pathMatrix);
        this.save(); let rootInsideGastric;
        try { this.setTransform(gastricMatrix); rootInsideGastric = this.isPointInPath(gastricPath, p.x, p.y); } finally { this.restore(); }
        inletCourses.push({ start: { x: start.x / node._logicalW, y: start.y / node._logicalH },
          curves: cubics.map(curve => curve.map((v, i) => v / (i % 2 ? node._logicalH : node._logicalW))), rootInsideGastric });
      }
      if (owner === 'caeca' && !closed && start && matrix) {
        const key = [start.x, start.y, ...cubics.flat(), ...quadratics.flat()].map(v => v.toFixed(5)).join(',');
        if (!caecalCourses.has(key)) {
          const neighbor = neighbors[1], p = point(neighbor), containsNeighbor = this.isPointInStroke(p.x, p.y);
          caecalCourses.set(key, { cubics: cubics.length, quadratics: quadratics.length, containsNeighbor });
          neighbor.ownPaintCount++; neighbor.insideOwnPaint ||= containsNeighbor;
        }
      }
      return recordLater('stroke', () => originals.stroke.apply(this, args));
    };
    ctx.fillRect = function (...args) {
      const stack = new Error().stack || '';
      if (stack.includes('drawPerchGastricSurface')) paints++;
      return recordLater('fillRect', () => originals.fillRect.apply(this, args), args);
    };
    ctx.clip = function (...args) {
      const p = point(anchors.target);
      if (p && owner === 'cavity') cavities.push({ containsTarget: this.isPointInPath(p.x, p.y) });
      if (p && owner === 'stomach' && traced && closed) clips.push({ cubics: cubics.length, containsTarget: this.isPointInPath(p.x, p.y) });
      return originals.clip.apply(this, args);
    };
    ctx.arc = function (x, y, radius, from, to, ...args) {
      if (path) path.arc(x, y, radius, from, to, ...args);
      if (!reticle && Math.abs(to - from - .58) < .0001) { const p = new DOMPoint(x, y).matrixTransform(this.getTransform()); reticle = { x: p.x, y: p.y }; }
      return originals.arc.call(this, x, y, radius, from, to, ...args);
    };
    try { node._drawDissectionNow(); } finally { for (const method of Object.keys(originals)) ctx[method] = originals[method]; }
    return { logicalWidth: node._logicalW, logicalHeight: node._logicalH, matrixObserved: !!matrix, regions, clips, paints, cavities,
      insideCavity: cavities.length > 0 && cavities.every(cavity => cavity.containsTarget), laterPaint, inletCourses, caecalRegions,
      caecalCourses: Array.from(caecalCourses.values()), neighbors: neighbors.map(neighbor => ({ ...neighbor, target: screen(point(neighbor)) })),
      normalizedTarget: anchors.target, target: matrix ? screen(point(anchors.target)) : null, reticle: reticle ? screen(reticle) : null };
  }, { target: gastricTarget, neighbors: gastricNeighbors });
}
module.exports = { gastricTarget, observePerchGastricPaint, observePerchGastricCaption };
