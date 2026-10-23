const { observeFrogAccessoryCaption: observeFrogNeuralCaption } = require('./dissection_frog_accessory_paint.cjs');
const neuralTargets = [{ id: 'brain', x: .5, y: .17 }, { id: 'optic_lobe', x: .522, y: .17 },
  { id: 'spinal_cord', x: .5, y: .44 }, { id: 'cranial_n', x: .56665, y: .16975 },
  { id: 'brachial_n', x: .371775, y: .3837875 }, { id: 'sciatic_n', x: .311199375, y: .6774775 }];

async function observeFrogNeuralPaint(canvas, obstacleBoxes = []) {
  return canvas.evaluate((node, { targets, obstacleBoxes }) => {
    const ctx = node.getContext('2d'), originals = {};
    for (const method of ['beginPath', 'moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'closePath', 'fill', 'stroke', 'clip', 'arc']) originals[method] = ctx[method];
    let matrix = null, owned = false, bodyPath = false, traced = false, closed = false, seenBrain = false;
    let owner = '', cubics = 0, quadratics = 0, lines = 0, moves = 0, pathPoints = [], pathMatrix = null, reticle = null;
    const bodyPaints = [], whole = [], regions = [], clips = [], nerves = [];
    const near = (a, b) => Math.abs(a - b) < 1e-5;
    const point = target => matrix && new DOMPoint(target.x * node._logicalW, target.y * node._logicalH).matrixTransform(matrix);
    const screen = p => { const rect = node.getBoundingClientRect(); return { x: rect.x + p.x / node.width * rect.width, y: rect.y + p.y / node.height * rect.height }; };
    const contains = (stroke, subset = targets) => subset.map(target => { const p = point(target); return !!p && (stroke ? ctx.isPointInStroke(p.x, p.y) : ctx.isPointInPath(p.x, p.y)); });
    const snapshots = () => targets.slice(0, 2).map(target => {
      const p = point(target); return p ? Array.from(ctx.getImageData(Math.max(0, Math.min(node.width - 1, Math.round(p.x))), Math.max(0, Math.min(node.height - 1, Math.round(p.y))), 1, 1).data) : null;
    });
    const paintedBounds = () => {
      const rect = node.getBoundingClientRect(), points = pathPoints.map(p => new DOMPoint(p.x, p.y).matrixTransform(pathMatrix));
      const xs = points.map(p => p.x * rect.width / node.width), ys = points.map(p => p.y * rect.height / node.height);
      const x = Math.min(...xs), y = Math.min(...ys);
      return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
    };
    const obstacleIntersections = bounds => obstacleBoxes.flatMap(box => {
      const rect = node.getBoundingClientRect(), left = Math.max(bounds.x, box.x), top = Math.max(bounds.y, box.y);
      const right = Math.min(bounds.x + bounds.width, box.x + box.width), bottom = Math.min(bounds.y + bounds.height, box.y + box.height);
      for (let y = top; y < bottom; y += .25) for (let x = left; x < right; x += .25) {
        if (ctx.isPointInPath(x * node.width / rect.width, y * node.height / rect.height)) return [{ id: box.id, x, y }];
      }
      return [];
    });
    ctx.beginPath = function () {
      const stack = new Error().stack || '';
      bodyPath = stack.includes('traceFrogTorso');
      if (!matrix && bodyPath) matrix = this.getTransform();
      owned = stack.includes('drawFrogNeuralComplex'); traced = stack.includes('traceFrogNeuralRegion');
      owner = ''; cubics = 0; quadratics = 0; lines = 0; moves = 0; closed = false; pathPoints = []; pathMatrix = this.getTransform();
      return originals.beginPath.call(this);
    };
    ctx.moveTo = function (x, y) {
      moves++; if (traced) pathPoints.push({ x, y });
      if (seenBrain && !owned && moves === 1) {
        const px = x / node._logicalW, py = y / node._logicalH;
        if ((near(px, .473) || near(px, .527)) && near(py, .16)) owner = 'cranial';
        else if (near(px, .5) && near(py, .195)) owner = 'cord';
        else if (near(px, .5) && Array.from({ length: 9 }, (_, i) => .26 + i * .046).some(y => near(py, y))) owner = 'radial';
        else if ((near(px, .465) || near(px, .535)) && near(py, .59)) owner = 'sciatic';
        else if ((near(px, .48) || near(px, .52)) && near(py, .33)) owner = 'brachial';
      }
      return originals.moveTo.call(this, x, y);
    };
    ctx.lineTo = function (x, y) { lines++; if (traced) pathPoints.push({ x, y }); return originals.lineTo.call(this, x, y); };
    ctx.bezierCurveTo = function (...args) { cubics++; if (traced) for (let i = 0; i < args.length; i += 2) pathPoints.push({ x: args[i], y: args[i + 1] }); return originals.bezierCurveTo.apply(this, args); };
    ctx.quadraticCurveTo = function (...args) { quadratics++; return originals.quadraticCurveTo.apply(this, args); };
    ctx.closePath = function () { closed = true; return originals.closePath.call(this); };
    ctx.fill = function (...args) {
      if (matrix && bodyPath) bodyPaints.push({ containsBrainTargets: contains(false, targets.slice(0, 2)) });
      if (matrix && owned && traced && closed) {
        const bounds = paintedBounds();
        const record = { cubics, containsTargets: contains(false), bounds, obstacleIntersections: obstacleIntersections(bounds) };
        if (cubics === 15) { whole.push(record); seenBrain = true; }
        else regions.push(record);
      }
      return originals.fill.apply(this, args);
    };
    ctx.stroke = function (...args) {
      if (matrix && seenBrain && owner && !owned) {
        const containsTargets = contains(true), before = snapshots();
        const result = originals.stroke.apply(this, args), after = snapshots();
        nerves.push({ owner, cubics, quadratics, lines, moves, containsTargets,
          brainPixelsBefore: before, brainPixelsAfter: after, brainPixelsUnchanged: before.map((pixel, i) => JSON.stringify(pixel) === JSON.stringify(after[i])) });
        return result;
      }
      return originals.stroke.apply(this, args);
    };
    ctx.clip = function (...args) {
      if (matrix && owned && traced && closed) clips.push({ cubics, containsTargets: contains(false) });
      return originals.clip.apply(this, args);
    };
    ctx.arc = function (x, y, radius, from, to, ...args) {
      if (!reticle && Math.abs(to - from - .58) < .0001) { const p = new DOMPoint(x, y).matrixTransform(this.getTransform()); reticle = { x: p.x, y: p.y }; }
      return originals.arc.call(this, x, y, radius, from, to, ...args);
    };
    try { node._drawDissectionNow(); } finally { for (const method of Object.keys(originals)) ctx[method] = originals[method]; }
    return { logicalWidth: node._logicalW, logicalHeight: node._logicalH, matrixObserved: !!matrix, bodyPaints, whole, regions, clips, nerves,
      activePins: (node._drawD.procedureByLayer[node._drawD.activeLayer].pins || []).length,
      targets: targets.map((target, i) => ({ ...target, target: matrix ? screen(point(target)) : null,
        ownPaint: i < 2 ? whole.some(record => record.containsTargets[i]) : nerves.some(record => record.containsTargets[i]) })),
      reticle: reticle ? screen(reticle) : null };
  }, { targets: neuralTargets, obstacleBoxes });
}
module.exports = { neuralTargets, observeFrogNeuralPaint, observeFrogNeuralCaption };
