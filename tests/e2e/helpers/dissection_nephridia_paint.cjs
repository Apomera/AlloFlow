async function observeNephridiaPaint(canvas) {
  return canvas.evaluate(node => {
    const ctx = node.getContext('2d'), originals = {};
    for (const method of ['beginPath', 'moveTo', 'lineTo', 'bezierCurveTo', 'stroke', 'arc', 'fill', 'translate', 'ellipse']) originals[method] = ctx[method];
    const base = new Map(), overlay = [], vesicles = new Map();
    let owned = false, paths = [], active = null, reticle = null, vesiclePath = false, vesicleCenter = null;
    const normalized = point => ({ x: point.x / node._logicalW, y: point.y / node._logicalH });
    const screen = point => { const box = node.getBoundingClientRect(); return { x: box.x + point.x / node.width * box.width, y: box.y + point.y / node.height * box.height }; };
    ctx.beginPath = function () {
      const stack = new Error().stack || '';
      owned = stack.includes('drawEarthwormNephridia'); paths = []; active = null;
      vesiclePath = stack.includes('traceEarthwormSeminalVesicle'); vesicleCenter = null;
      return originals.beginPath.call(this);
    };
    ctx.moveTo = function (x, y) {
      if (owned) { active = { start: { x, y }, cubics: [], lines: [], matrix: this.getTransform() }; paths.push(active); }
      return originals.moveTo.call(this, x, y);
    };
    ctx.lineTo = function (x, y) { if (owned && active) active.lines.push([x, y]); return originals.lineTo.call(this, x, y); };
    ctx.bezierCurveTo = function (...args) { if (owned && active) active.cubics.push(args); return originals.bezierCurveTo.apply(this, args); };
    ctx.translate = function (x, y) {
      const result = originals.translate.call(this, x, y);
      if (vesiclePath && !vesicleCenter) { const point = new DOMPoint(0, 0).matrixTransform(this.getTransform()); vesicleCenter = { x: point.x, y: point.y }; }
      return result;
    };
    ctx.ellipse = function (x, y, ...args) {
      if (vesiclePath) { const point = new DOMPoint(x, y).matrixTransform(this.getTransform()); vesicleCenter = { x: point.x, y: point.y }; }
      return originals.ellipse.call(this, x, y, ...args);
    };
    ctx.fill = function (...args) {
      if (vesiclePath && vesicleCenter) {
        const key = vesicleCenter.x.toFixed(5) + ',' + vesicleCenter.y.toFixed(5);
        if (!vesicles.has(key)) vesicles.set(key, { point: vesicleCenter, insidePaintedOrgan: this.isPointInPath(vesicleCenter.x, vesicleCenter.y) });
      }
      return originals.fill.apply(this, args);
    };
    ctx.stroke = function (...args) {
      const tubular = paths.filter(path => path.cubics.length > 0);
      if (owned && tubular.length === 1) {
        const path = tubular[0], key = path.start.x.toFixed(6) + ',' + path.start.y.toFixed(6);
        const point = new DOMPoint(path.start.x, path.start.y).matrixTransform(path.matrix);
        if (!base.has(key)) base.set(key, { start: normalized(path.start), cubics: path.cubics,
          point: { x: point.x, y: point.y }, insideStroke: this.isPointInStroke(point.x, point.y) });
      } else if (owned && tubular.length === 32) {
        overlay.push(tubular.map(path => ({ start: normalized(path.start), cubics: path.cubics })));
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
    const tubules = Array.from(base.values());
    // Pair s=23 is the tenth representative pair; its side -1 is the authored
    // inspection target. This point comes from the actual painted moveTo.
    const target = tubules[18];
    const sacs = Array.from(vesicles.values()).map(sac => ({ ...sac, point: screen(sac.point) }));
    return { logicalWidth: node._logicalW, logicalHeight: node._logicalH, vesicles: sacs, seminalTarget: sacs[4] || null,
      tubules: tubules.map(path => ({ ...path, point: screen(path.point) })), overlay,
      target: target ? { ...target, point: screen(target.point) } : null, reticle: reticle ? screen(reticle) : null };
  });
}

module.exports = { observeNephridiaPaint };
