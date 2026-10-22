async function observePerchHeartPaint(canvas, anchor) {
  return canvas.evaluate((node, anchor) => {
    const ctx = node.getContext('2d'), originals = {};
    for (const method of ['beginPath', 'ellipse', 'fill', 'clip', 'arc']) originals[method] = ctx[method];
    let matrix = null, heartPath = false, cavityPath = false, reticle = null, insideCavity = false;
    const regions = [];
    const target = () => matrix && new DOMPoint(anchor.x * node._logicalW, anchor.y * node._logicalH).matrixTransform(matrix);
    const screen = point => { const box = node.getBoundingClientRect(); return { x: box.x + point.x / node.width * box.width, y: box.y + point.y / node.height * box.height }; };
    ctx.beginPath = function () {
      const stack = new Error().stack || '';
      if (!matrix && stack.includes('tracePerchBody')) matrix = this.getTransform();
      heartPath = stack.includes('tracePerchHeartRegion'); cavityPath = stack.includes('tracePerchCoelom');
      return originals.beginPath.call(this);
    };
    ctx.fill = function (...args) {
      if (heartPath && matrix) {
        const point = target();
        regions.push({ containsTarget: this.isPointInPath(point.x, point.y), style: String(this.fillStyle) });
      }
      return originals.fill.apply(this, args);
    };
    ctx.ellipse = function (...args) {
      // Clarity modes retain the original four ellipse teaching regions.
      if ((new Error().stack || '').includes('traceTeachingRegion')) heartPath = true;
      return originals.ellipse.apply(this, args);
    };
    ctx.clip = function (...args) {
      if (cavityPath && matrix) { const point = target(); insideCavity = this.isPointInPath(point.x, point.y); }
      return originals.clip.apply(this, args);
    };
    ctx.arc = function (x, y, radius, start, end, ...args) {
      if (!reticle && Math.abs(end - start - .58) < .0001) {
        const point = new DOMPoint(x, y).matrixTransform(this.getTransform()); reticle = { x: point.x, y: point.y };
      }
      return originals.arc.call(this, x, y, radius, start, end, ...args);
    };
    try { node._drawDissectionNow(); } finally { for (const method of Object.keys(originals)) ctx[method] = originals[method]; }
    const point = target();
    return { logicalWidth: node._logicalW, logicalHeight: node._logicalH, matrixObserved: !!matrix, insideCavity, regions,
      target: point ? screen(point) : null, reticle: reticle ? screen(reticle) : null };
  }, anchor);
}
module.exports = { observePerchHeartPaint };
