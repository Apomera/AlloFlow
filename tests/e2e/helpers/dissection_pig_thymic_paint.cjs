async function observePigThymicPaint(canvas, anchor) {
  return canvas.evaluate((node, anchor) => {
    const ctx = node.getContext('2d'), originals = {};
    for (const name of ['beginPath', 'moveTo', 'lineTo', 'bezierCurveTo', 'closePath', 'fill', 'stroke', 'clip', 'arc', 'ellipse']) originals[name] = ctx[name];
    const neighbors = [{ id: 'lungs_p', x: .385, y: .425 }, { id: 'heart_p', x: .432, y: .450 }];
    let matrix = null, owner = null, cubics = 0, closed = false, reticle = null, cavityContainsTarget = false;
    const regions = [], clips = [], laterPaint = [], lungClips = [], ownPaint = new Set();
    const near = (a, b) => Math.abs(a - b) < .00001;
    const mapped = p => matrix && new DOMPoint(p.x * node._logicalW, p.y * node._logicalH).matrixTransform(matrix);
    const screen = p => { const b = node.getBoundingClientRect(); return { x: b.x + p.x / node.width * b.width, y: b.y + p.y / node.height * b.height }; };
    const contains = (context, args, normalized) => { const p = mapped(normalized); return args[0] instanceof Path2D ? context.isPointInPath(args[0], p.x, p.y) : context.isPointInPath(p.x, p.y); };
    const pixel = context => { const p = mapped(anchor); return Array.from(context.getImageData(Math.floor(p.x), Math.floor(p.y), 1, 1).data); };
    ctx.beginPath = function () {
      const stack = new Error().stack || '';
      if (!matrix && stack.includes('tracePigBody')) matrix = this.getTransform();
      owner = stack.includes('tracePigThymicRegion') ? 'thymus_p'
        : stack.includes('tracePigPleuralSurface') ? 'lungs_p'
        : stack.includes('tracePigCardiacRegion') ? 'heart_p'
        : stack.includes('tracePigCoelom') ? 'cavity'
        : stack.includes('traceHepaticLobe') || stack.includes('traceVisceralLobe') ? 'liver'
        : stack.includes('tracePigGastricRegion') ? 'stomach'
        : stack.includes('tracePigSplenicRegion') ? 'spleen'
        : stack.includes('tracePigPancreaticRegion') ? 'pancreas'
        : stack.includes('drawCurrentMembraneFolds') ? 'membrane-fold'
        : stack.includes('traceVisceralFluidSac') ? 'bladder' : null;
      cubics = 0; closed = false; return originals.beginPath.call(this);
    };
    ctx.moveTo = function (x, y) {
      const px = x / node._logicalW, py = y / node._logicalH;
      if (!owner && near(px, .478) && near(py, .355)) owner = 'diaphragm';
      if (!owner && near(px, .567) && near(py, .514)) owner = 'membrane';
      if (!owner && near(px, .696) && near(py, .525)) owner = 'colon';
      if (!owner && near(px, .525) && near(py, .640)) owner = 'umbilical';
      return originals.moveTo.call(this, x, y);
    };
    ctx.lineTo = function (...args) { return originals.lineTo.apply(this, args); };
    ctx.bezierCurveTo = function (...args) { cubics++; return originals.bezierCurveTo.apply(this, args); };
    ctx.closePath = function () { closed = true; return originals.closePath.call(this); };
    ctx.ellipse = function (...args) { return originals.ellipse.apply(this, args); };
    for (const paint of ['fill', 'stroke']) ctx[paint] = function (...args) {
      let record = null, before = null;
      if (matrix) {
        const p = mapped(anchor), stack = new Error().stack || '';
        if (paint === 'fill') {
          if (owner === 'cavity') cavityContainsTarget = contains(this, args, anchor);
          if (owner === 'thymus_p' && closed) regions.push({ cubics, containsTarget: contains(this, args, anchor) });
          for (const neighbor of neighbors) if (owner === neighbor.id && contains(this, args, neighbor)) ownPaint.add(neighbor.id);
        }
        const later = owner && !['thymus_p', 'cavity'].includes(owner) ? owner : stack.includes('drawEntericBowel') ? 'jejunum' : null;
        if (later) {
          record = { owner: later, paint, cubics, containsTarget: paint === 'fill' ? contains(this, args, anchor) : this.isPointInStroke(p.x, p.y) };
          if (['lungs_p', 'heart_p'].includes(later)) before = pixel(this);
          laterPaint.push(record);
        }
      }
      const result = originals[paint].apply(this, args);
      if (record && before) { const after = pixel(this); record.targetPixelBefore = before; record.targetPixelAfter = after; record.targetPixelUnchanged = after.every((value, index) => value === before[index]); }
      return result;
    };
    ctx.clip = function (...args) {
      if (matrix && owner === 'thymus_p' && closed) clips.push({ cubics, containsTarget: contains(this, args, anchor) });
      if (matrix && owner === 'lungs_p') lungClips.push({ containsTarget: contains(this, args, anchor) });
      return originals.clip.apply(this, args);
    };
    ctx.arc = function (x, y, radius, from, to, ...args) {
      if (!reticle && Math.abs(to - from - .58) < .0001) { const p = new DOMPoint(x, y).matrixTransform(this.getTransform()); reticle = { x: p.x, y: p.y }; }
      return originals.arc.call(this, x, y, radius, from, to, ...args);
    };
    try { node._drawDissectionNow(); } finally { for (const name of Object.keys(originals)) ctx[name] = originals[name]; }
    const p = mapped(anchor);
    return { logicalWidth: node._logicalW, logicalHeight: node._logicalH, matrixObserved: !!matrix, cavityContainsTarget, regions, clips, lungClips, laterPaint,
      neighbors: neighbors.map(neighbor => ({ id: neighbor.id, insideOwnPaint: ownPaint.has(neighbor.id), target: matrix ? screen(mapped(neighbor)) : null })),
      target: p ? screen(p) : null, reticle: reticle ? screen(reticle) : null };
  }, anchor);
}
async function observePigThymicCaption(canvas) {
  return canvas.evaluate(node => {
    const ctx = node.getContext('2d'), originals = {};
    for (const method of ['beginPath', 'moveTo', 'quadraticCurveTo', 'stroke', 'roundRect', 'fillText', 'ellipse', 'arc', 'fill']) originals[method] = ctx[method];
    const rect = node.getBoundingClientRect(), sx = rect.width / node.width, sy = rect.height / node.height;
    let path = null, lastRect = null, card = null, caption = null, leader = null;
    let markerShape = null, lastBadge = null, paintedMarker = null;
    const markers = [];
    const matrixData = m => ({ a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f });
    const screen = (p, m) => { const q = new DOMPoint(p.x, p.y).matrixTransform(m); return { x: q.x * sx, y: q.y * sy }; };
    const mappedBox = (x, y, width, height, m) => {
      const ps = [[x, y], [x + width, y], [x, y + height], [x + width, y + height]].map(([x, y]) => screen({ x, y }, m));
      const left = Math.min(...ps.map(p => p.x)), top = Math.min(...ps.map(p => p.y));
      return { x: left, y: top, width: Math.max(...ps.map(p => p.x)) - left, height: Math.max(...ps.map(p => p.y)) - top };
    };
    const markerEllipse = (kind, x, y, rx, ry, angle, matrix) => {
      const center = screen({ x, y }, matrix), cosine = Math.cos(angle), sine = Math.sin(angle);
      const horizontal = Math.hypot(matrix.a * rx * cosine + matrix.c * rx * sine, -matrix.a * ry * sine + matrix.c * ry * cosine) * sx;
      const vertical = Math.hypot(matrix.b * rx * cosine + matrix.d * rx * sine, -matrix.b * ry * sine + matrix.d * ry * cosine) * sy;
      return { kind, local: { x, y, rx, ry, angle }, matrix: matrixData(matrix), x: center.x - horizontal, y: center.y - vertical, width: horizontal * 2, height: vertical * 2 };
    };
    ctx.beginPath = function () { path = null; lastRect = null; markerShape = null; paintedMarker = null; return originals.beginPath.call(this); };
    ctx.moveTo = function (x, y) { path = { start: { x, y }, curves: [], matrix: this.getTransform() }; return originals.moveTo.call(this, x, y); };
    ctx.quadraticCurveTo = function (...args) { if (path) path.curves.push(args); return originals.quadraticCurveTo.apply(this, args); };
    ctx.ellipse = function (x, y, rx, ry, rotation, start, end, ...args) {
      const stack = new Error().stack || '';
      if (stack.includes('drawAdaptiveHotspotGuidance') && !stack.includes('drawStructureInspectionFootprint') && Math.abs(end - start - Math.PI * 2) < .00001) {
        markerShape = markerEllipse('badge', x, y, rx, ry, rotation, this.getTransform());
      }
      return originals.ellipse.call(this, x, y, rx, ry, rotation, start, end, ...args);
    };
    ctx.arc = function (x, y, radius, start, end, ...args) {
      const stack = new Error().stack || '';
      if (stack.includes('drawAdaptiveHotspotGuidance') && !stack.includes('drawStructureInspectionFootprint') && Math.abs(radius - 5) < .00001 && Math.abs(end - start - Math.PI * 2) < .00001) {
        markerShape = markerEllipse('point', x, y, radius, radius, 0, this.getTransform());
      }
      return originals.arc.call(this, x, y, radius, start, end, ...args);
    };
    ctx.fill = function (...args) {
      if (markerShape) {
        markers.push(markerShape);
        paintedMarker = markerShape;
        if (markerShape.kind === 'badge') lastBadge = markerShape;
        markerShape = null;
      }
      return originals.fill.apply(this, args);
    };
    ctx.roundRect = function (x, y, width, height, ...args) {
      const matrix = this.getTransform(); lastRect = { local: { x, y, width, height }, matrix: matrixData(matrix), ...mappedBox(x, y, width, height, matrix) };
      const hit = (node._hotspotLabelBoxes || []).find(box => box.id === 'thymus_p' &&
        Math.abs(box.x * node._logicalW - x) < .001 && Math.abs(box.y * node._logicalH - y) < .001 &&
        Math.abs(box.width * node._logicalW - width) < .001 && Math.abs(box.height * node._logicalH - height) < .001);
      if (hit) card = { ...lastRect, hit };
      return originals.roundRect.call(this, x, y, width, height, ...args);
    };
    ctx.fillText = function (text, ...args) {
      if (lastBadge && /^\d+$/.test(String(text)) && (new Error().stack || '').includes('drawAdaptiveHotspotGuidance')) lastBadge.number = String(text);
      if (/^(DEEP|MID|SURFACE) \u00b7 .+$/.test(String(text)) && lastRect) {
        const matrix = this.getTransform();
        caption = { ...lastRect, text: String(text), fontCss: Number(/([\d.]+)px/.exec(this.font)?.[1] || 0) * Math.hypot(matrix.a, matrix.b) * sx };
      }
      return originals.fillText.call(this, text, ...args);
    };
    ctx.stroke = function (...args) {
      if (paintedMarker && (new Error().stack || '').includes('drawAdaptiveHotspotGuidance')) {
        const matrix = this.getTransform(), padding = this.lineWidth / 2 * Math.max(Math.hypot(matrix.a, matrix.c) * sx, Math.hypot(matrix.b, matrix.d) * sy);
        paintedMarker.x -= padding; paintedMarker.y -= padding; paintedMarker.width += padding * 2; paintedMarker.height += padding * 2;
        paintedMarker.strokePadding = padding; paintedMarker = null;
      }
      if (path && path.curves.length === 1 && /rgba\(251,\s*191,\s*36,\s*0\.92\)/.test(String(this.strokeStyle))) {
        const q = path.curves[0], matrix = path.matrix;
        leader = { local: { start: path.start, control: { x: q[0], y: q[1] }, end: { x: q[2], y: q[3] } }, matrix: matrixData(matrix),
          start: screen(path.start, matrix), control: screen({ x: q[0], y: q[1] }, matrix), end: screen({ x: q[2], y: q[3] }, matrix),
          strokeRadius: this.lineWidth / 2 * Math.max(Math.hypot(matrix.a, matrix.b) * sx, Math.hypot(matrix.c, matrix.d) * sy) };
      }
      return originals.stroke.apply(this, args);
    };
    try { node._drawDissectionNow(); } finally { for (const method of Object.keys(originals)) ctx[method] = originals[method]; }
    let crossesCaption = null;
    if (leader && caption) {
      const padding = leader.strokeRadius + 1, left = caption.x - padding, right = caption.x + caption.width + padding;
      const top = caption.y - padding, bottom = caption.y + caption.height + padding;
      const intersects = (a, b) => {
        let t0 = 0, t1 = 1;
        for (const [p, q] of [[a.x - b.x, a.x - left], [b.x - a.x, right - a.x], [a.y - b.y, a.y - top], [b.y - a.y, bottom - a.y]]) {
          if (Math.abs(p) < 1e-12) { if (q < 0) return false; continue; }
          const r = q / p; if (p < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r);
          if (t0 > t1) return false;
        }
        return true;
      };
      let previous = leader.start; crossesCaption = false;
      for (let i = 1; i <= 128; i++) {
        const t = i / 128, u = 1 - t;
        const next = { x: u * u * leader.start.x + 2 * u * t * leader.control.x + t * t * leader.end.x,
          y: u * u * leader.start.y + 2 * u * t * leader.control.y + t * t * leader.end.y };
        if (intersects(previous, next)) crossesCaption = true; previous = next;
      }
    }
    const markerIntersections = caption ? markers.filter(marker => marker.x < caption.x + caption.width && marker.x + marker.width > caption.x && marker.y < caption.y + caption.height && marker.y + marker.height > caption.y).map(marker => ({ kind: marker.kind, number: marker.number || null })) : null;
    return { width: rect.width, height: rect.height, logicalWidth: node._logicalW, logicalHeight: node._logicalH,
      dpr: node._dpr, devicePixelRatio: window.devicePixelRatio, canvasUiScale: node._canvasUiScale,
      labelUiScale: node._canvasUiScale / (node._interactionZoom || 1), zoom: node._interactionZoom,
      card, caption, leader, crossesCaption, markers, markerIntersections };
  });
}
module.exports = { observePigThymicPaint, observePigThymicCaption };
