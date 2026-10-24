// This shared canvas selection observer accepts any specimen's organ id.
const { observeFrogAccessoryCaption: observeCrayfishAntennalCaption } = require('./dissection_frog_accessory_paint.cjs');
const antennalTarget = { x: .295, y: .412 };
const antennalCenters = [{ x: .295, y: .412 }, { x: .295, y: .488 }];
const antennalNeighbors = [{ id: 'gastric_mill', x: .380, y: .450 }, { id: 'hepato', x: .485, y: .484 }];

async function observeCrayfishAntennalPaint(canvas) {
  return canvas.evaluate((node, anchors) => {
    const ctx = node.getContext('2d'), originals = {};
    for (const method of ['beginPath', 'moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'closePath', 'ellipse', 'arc', 'fill', 'stroke', 'clip', 'fillRect', 'restore']) originals[method] = ctx[method];
    let matrix = null, owner = '', activeOrgan = '', traced = false, closed = false, cubics = 0, pathPoints = [], pathMatrix = null;
    let seenGlands = false, finishedAnatomy = false, reticle = null, paints = 0;
    const regions = [], clips = [], windowClips = [], laterPaint = [];
    const neighbors = anchors.neighbors.map(anchor => ({ ...anchor, ownPaintCount: 0, insideOwnPaint: false, coveredByGlands: false }));
    const near = (a, b) => Math.abs(a - b) < 1e-5;
    const point = anchor => matrix && new DOMPoint(anchor.x * node._logicalW, anchor.y * node._logicalH).matrixTransform(matrix);
    const screen = p => { const rect = node.getBoundingClientRect(); return { x: rect.x + p.x / node.width * rect.width, y: rect.y + p.y / node.height * rect.height }; };
    const pixels = () => anchors.centers.map(anchor => {
      const p = point(anchor); return p ? Array.from(ctx.getImageData(Math.max(0, Math.min(node.width - 1, Math.round(p.x))), Math.max(0, Math.min(node.height - 1, Math.round(p.y))), 1, 1).data) : null;
    });
    const containsCenters = stroke => anchors.centers.map(anchor => { const p = point(anchor); return !!p && (stroke ? ctx.isPointInStroke(p.x, p.y) : ctx.isPointInPath(p.x, p.y)); });
    const paintedBounds = () => {
      const rect = node.getBoundingClientRect();
      const points = pathPoints.map(p => new DOMPoint(p.x, p.y).matrixTransform(pathMatrix));
      const xs = points.map(p => p.x * rect.width / node.width), ys = points.map(p => p.y * rect.height / node.height);
      const x = Math.min(...xs), y = Math.min(...ys);
      return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
    };
    ctx.beginPath = function () {
      const stack = new Error().stack || '';
      if (!matrix && stack.includes('traceCrayfishCarapace')) matrix = this.getTransform();
      if (stack.includes('drawCrayfishAntennalGlands')) activeOrgan = 'antennal';
      else if (stack.includes('drawCrayfishGillPlumes')) activeOrgan = 'gills';
      else if (seenGlands && stack.includes('traceVisceralLobe')) activeOrgan = 'hepato';
      owner = stack.includes('traceCrayfishVisceralWindow') ? 'window' : activeOrgan;
      traced = stack.includes('traceCrayfishAntennalRegion'); closed = false; cubics = 0; pathPoints = []; pathMatrix = this.getTransform();
      return originals.beginPath.call(this);
    };
    ctx.moveTo = function (x, y) {
      if (traced) pathPoints.push({ x, y });
      if (!traced && !finishedAnatomy) {
        if (near(x, -.88) && near(y, -.25)) activeOrgan = owner = 'gastric_mill';
        if (seenGlands && near(x, -.94) && near(y, -.08)) activeOrgan = owner = 'hepato';
        if (seenGlands && near(x, -.58) && near(y, -.73)) activeOrgan = owner = 'heart';
      }
      return originals.moveTo.call(this, x, y);
    };
    ctx.lineTo = function (...args) { return originals.lineTo.apply(this, args); };
    ctx.bezierCurveTo = function (...args) { cubics++; if (traced) for (let i = 0; i < args.length; i += 2) pathPoints.push({ x: args[i], y: args[i + 1] }); return originals.bezierCurveTo.apply(this, args); };
    ctx.quadraticCurveTo = function (...args) { return originals.quadraticCurveTo.apply(this, args); };
    ctx.closePath = function () { closed = true; return originals.closePath.call(this); };
    ctx.ellipse = function (...args) {
      if (!finishedAnatomy && !traced) {
        if (near(args[0] / node._logicalW, .38) && near(args[1] / node._logicalH, .45) &&
          (near(args[2] / node._logicalW, .038) || near(args[2] / node._logicalW, .025))) activeOrgan = owner = 'gastric_mill';
        if (seenGlands && near(args[0] / node._logicalW, .535) && near(args[1] / node._logicalH, .415) && near(args[2] / node._logicalW, .027)) activeOrgan = owner = 'heart';
        if (seenGlands && near(args[0] / node._logicalW, .575) && near(args[1] / node._logicalH, .45) && near(args[2] / node._logicalW, .042)) activeOrgan = owner = 'gonad';
      }
      return originals.ellipse.apply(this, args);
    };
    const recordLater = (paint, callback, rect) => {
      const relevant = seenGlands && !finishedAnatomy && ['hepato', 'heart', 'gonad', 'gills'].includes(owner);
      const before = relevant ? pixels() : null;
      let contains = relevant ? containsCenters(paint === 'stroke') : [];
      if (relevant && rect) {
        const path = new Path2D(); path.rect(...rect);
        contains = anchors.centers.map(anchor => { const p = point(anchor); return ctx.isPointInPath(path, p.x, p.y); });
      }
      const result = callback();
      if (relevant) { const after = pixels(); laterPaint.push({ owner, paint, cubics, containsCenters: contains,
        centerPixelsBefore: before, centerPixelsAfter: after, centerPixelsUnchanged: before.map((pixel, i) => JSON.stringify(pixel) === JSON.stringify(after[i])) }); }
      return result;
    };
    ctx.fill = function (...args) {
      if ((new Error().stack || '').includes('drawCrayfishAntennalGlands')) paints++;
      if (owner === 'antennal' && traced && closed && matrix) {
        regions.push({ cubics, containsCenters: containsCenters(false), bounds: paintedBounds() }); seenGlands = true;
        for (const neighbor of neighbors) { const p = point(neighbor); neighbor.coveredByGlands ||= this.isPointInPath(p.x, p.y); }
      }
      if (!finishedAnatomy && matrix && (owner === 'gastric_mill' || owner === 'hepato')) {
        const neighbor = neighbors[owner === 'gastric_mill' ? 0 : 1], p = point(neighbor);
        neighbor.ownPaintCount++; neighbor.insideOwnPaint ||= this.isPointInPath(p.x, p.y);
      }
      return recordLater('fill', () => originals.fill.apply(this, args));
    };
    ctx.stroke = function (...args) {
      if ((new Error().stack || '').includes('drawCrayfishAntennalGlands')) paints++;
      return recordLater('stroke', () => originals.stroke.apply(this, args));
    };
    ctx.fillRect = function (...args) {
      if ((new Error().stack || '').includes('drawCrayfishAntennalGlands')) paints++;
      return recordLater('fillRect', () => originals.fillRect.apply(this, args), args);
    };
    ctx.clip = function (...args) {
      if (matrix && owner === 'window') windowClips.push({ containsCenters: containsCenters(false) });
      if (matrix && owner === 'antennal' && traced && closed) clips.push({ cubics, containsCenters: containsCenters(false) });
      return originals.clip.apply(this, args);
    };
    ctx.arc = function (x, y, radius, from, to, ...args) {
      if (!reticle && Math.abs(to - from - .58) < .0001) { const p = new DOMPoint(x, y).matrixTransform(this.getTransform()); reticle = { x: p.x, y: p.y }; }
      return originals.arc.call(this, x, y, radius, from, to, ...args);
    };
    ctx.restore = function (...args) {
      // The containing organs save is restored immediately after the final gill call.
      // Later screen guidance and teaching overlays are outside this native-art audit.
      if (activeOrgan === 'gills' && !(new Error().stack || '').includes('drawCrayfishGillPlumes')) finishedAnatomy = true;
      return originals.restore.apply(this, args);
    };
    try { node._drawDissectionNow(); } finally { for (const method of Object.keys(originals)) ctx[method] = originals[method]; }
    return { logicalWidth: node._logicalW, logicalHeight: node._logicalH, matrixObserved: !!matrix, regions, clips, windowClips, paints, laterPaint,
      finishedAnatomy, normalizedTarget: anchors.target, target: matrix ? screen(point(anchors.target)) : null,
      pairedCenters: anchors.centers.map(anchor => ({ normalized: anchor, target: matrix ? screen(point(anchor)) : null })),
      neighbors: neighbors.map(neighbor => ({ ...neighbor, target: matrix ? screen(point(neighbor)) : null })), reticle: reticle ? screen(reticle) : null };
  }, { target: antennalTarget, centers: antennalCenters, neighbors: antennalNeighbors });
}
module.exports = { antennalTarget, observeCrayfishAntennalPaint, observeCrayfishAntennalCaption };
