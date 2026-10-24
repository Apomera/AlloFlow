async function observePhoneHud(canvas, targetId) {
  return canvas.evaluate((node, targetId) => {
    const ctx = node.getContext('2d'), originals = {};
    for (const method of ['beginPath', 'roundRect', 'fillText', 'arc']) originals[method] = ctx[method];
    const rect = node.getBoundingClientRect(), sx = rect.width / node.width, sy = rect.height / node.height;
    const cards = [], glyphs = [], orientationGlyphs = []; let currentCard = null, reticle = null;
    const mappedBox = (x, y, w, h, matrix) => {
      const points = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([a, b]) => new DOMPoint(a, b).matrixTransform(matrix));
      const left = Math.min(...points.map(p => p.x)) * sx, top = Math.min(...points.map(p => p.y)) * sy;
      return { x: left, y: top, width: Math.max(...points.map(p => p.x)) * sx - left, height: Math.max(...points.map(p => p.y)) * sy - top };
    };
    ctx.beginPath = function () { currentCard = null; return originals.beginPath.call(this); };
    ctx.roundRect = function (x, y, w, h, ...args) {
      const hit = (node._hotspotLabelBoxes || []).find(box => box.id === targetId &&
        Math.abs(box.x * node._logicalW - x) < .001 && Math.abs(box.y * node._logicalH - y) < .001 &&
        Math.abs(box.width * node._logicalW - w) < .001 && Math.abs(box.height * node._logicalH - h) < .001);
      if (hit) { currentCard = { id: targetId, ...mappedBox(x, y, w, h, this.getTransform()), glyphs: [] }; cards.push(currentCard); }
      return originals.roundRect.call(this, x, y, w, h, ...args);
    };
    ctx.fillText = function (value, x, y, ...args) {
      const metrics = this.measureText(value), matrix = this.getTransform();
      const glyph = { text: String(value), ...mappedBox(x - metrics.actualBoundingBoxLeft, y - metrics.actualBoundingBoxAscent,
        metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight, metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent, matrix),
        fontCss: Number(/([\d.]+)px/.exec(this.font)?.[1] || 0) * Math.hypot(matrix.a, matrix.b) * sx };
      glyphs.push(glyph); if (currentCard) currentCard.glyphs.push(glyph);
      if ((new Error().stack || '').includes('drawAnatomicalOrientationCompass')) orientationGlyphs.push(glyph);
      return originals.fillText.call(this, value, x, y, ...args);
    };
    ctx.arc = function (x, y, radius, start, end, ...args) {
      if (!reticle && Math.abs(end - start - .58) < .0001) {
        const matrix = this.getTransform(), point = new DOMPoint(x, y).matrixTransform(matrix);
        reticle = { x: point.x * sx, y: point.y * sy,
          // The visible target includes the four radial ticks, five units beyond the arcs.
          bounds: mappedBox(x - radius - 5, y - radius - 5, (radius + 5) * 2, (radius + 5) * 2, matrix) };
      }
      return originals.arc.call(this, x, y, radius, start, end, ...args);
    };
    try { node._drawDissectionNow(); } finally { for (const method of Object.keys(originals)) ctx[method] = originals[method]; }
    const hud = (node._canvasHudBoxes || []).map(box => ({ id: box.id, x: box.x / node._logicalW * rect.width,
      y: box.y / node._logicalH * rect.height, width: box.width / node._logicalW * rect.width, height: box.height / node._logicalH * rect.height }));
    return { card: cards.at(-1) || null, reticle, hud, glyphs, orientationGlyphs,
      width: rect.width, height: rect.height, pageX: rect.x, pageY: rect.y, mode: node.dataset.dissectionHud };
  }, targetId);
}

module.exports = { observePhoneHud };
