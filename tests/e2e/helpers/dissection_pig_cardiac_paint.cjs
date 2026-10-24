async function observePigCardiacPaint(canvas, anchor = { x: .432, y: .450 }) {
  return canvas.evaluate((node, anchor) => {
    const ctx = node.getContext('2d'), originals = {};
    for (const name of ['beginPath', 'moveTo', 'lineTo', 'bezierCurveTo', 'closePath', 'fill', 'stroke', 'clip', 'arc']) originals[name] = ctx[name];
    let matrix = null, heart = false, cavity = false, liver = false, diaphragm = false;
    let closed = false, cubics = 0, coronaryStrokes = 0, reticle = null, insideCavity = false;
    const regions = [], clips = [], liverFills = [], diaphragmFills = [];
    const near = (a, b) => Math.abs(a - b) < .00001;
    const target = () => matrix && new DOMPoint(anchor.x * node._logicalW, anchor.y * node._logicalH).matrixTransform(matrix);
    const screen = p => { const box = node.getBoundingClientRect(); return { x: box.x + p.x / node.width * box.width, y: box.y + p.y / node.height * box.height }; };
    ctx.beginPath = function () {
      const stack = new Error().stack || '';
      if (!matrix && stack.includes('tracePigBody')) matrix = this.getTransform();
      heart = stack.includes('tracePigCardiacRegion') && stack.includes('drawPigCardiacComplex');
      cavity = stack.includes('tracePigCoelom'); liver = stack.includes('traceHepaticLobe');
      diaphragm = false; closed = false; cubics = 0;
      return originals.beginPath.call(this);
    };
    ctx.moveTo = function (x, y) {
      if (!heart && !liver && near(x / node._logicalW, .478) && near(y / node._logicalH, .355)) diaphragm = true;
      return originals.moveTo.call(this, x, y);
    };
    ctx.lineTo = function (...args) { return originals.lineTo.apply(this, args); };
    ctx.bezierCurveTo = function (...args) { cubics++; return originals.bezierCurveTo.apply(this, args); };
    ctx.closePath = function () { closed = true; return originals.closePath.call(this); };
    ctx.fill = function (...args) {
      const p = target();
      if (p && cavity) insideCavity = this.isPointInPath(p.x, p.y);
      if (p && heart && closed) regions.push({ cubics, containsTarget: this.isPointInPath(p.x, p.y) });
      if (p && liver) liverFills.push({ containsTarget: this.isPointInPath(p.x, p.y) });
      if (p && diaphragm) diaphragmFills.push({ containsTarget: this.isPointInPath(p.x, p.y) });
      return originals.fill.apply(this, args);
    };
    ctx.stroke = function (...args) {
      if (heart && !closed && cubics === 1) coronaryStrokes++;
      return originals.stroke.apply(this, args);
    };
    ctx.clip = function (...args) {
      const p = target();
      if (p && cavity) insideCavity = this.isPointInPath(p.x, p.y);
      if (p && heart && closed) clips.push({ containsTarget: this.isPointInPath(p.x, p.y) });
      return originals.clip.apply(this, args);
    };
    ctx.arc = function (x, y, radius, from, to, ...args) {
      if (!reticle && Math.abs(to - from - .58) < .0001) {
        const p = new DOMPoint(x, y).matrixTransform(this.getTransform()); reticle = { x: p.x, y: p.y };
      }
      return originals.arc.call(this, x, y, radius, from, to, ...args);
    };
    try { node._drawDissectionNow(); } finally { for (const name of Object.keys(originals)) ctx[name] = originals[name]; }
    const p = target();
    return { logicalWidth: node._logicalW, logicalHeight: node._logicalH, matrixObserved: !!matrix, regions, clips,
      coronaryStrokes, insideCavity, liverFills, diaphragmFills, normalizedTarget: anchor,
      target: p ? screen(p) : null, reticle: reticle ? screen(reticle) : null };
  }, anchor);
}
async function observePigCardiacCaption(canvas) {
  return canvas.evaluate(node => {
    const ctx = node.getContext('2d'), originals = {};
    for (const method of ['beginPath', 'moveTo', 'quadraticCurveTo', 'stroke', 'roundRect', 'fillText']) originals[method] = ctx[method];
    const rect = node.getBoundingClientRect(), sx = rect.width / node.width, sy = rect.height / node.height;
    let path = null, lastRect = null, card = null, caption = null, leader = null;
    const matrixData = m => ({ a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f });
    const screen = (p, m) => { const q = new DOMPoint(p.x, p.y).matrixTransform(m); return { x: q.x * sx, y: q.y * sy }; };
    const mappedBox = (x, y, width, height, m) => {
      const ps = [[x, y], [x + width, y], [x, y + height], [x + width, y + height]].map(([x, y]) => screen({ x, y }, m));
      const left = Math.min(...ps.map(p => p.x)), top = Math.min(...ps.map(p => p.y));
      return { x: left, y: top, width: Math.max(...ps.map(p => p.x)) - left, height: Math.max(...ps.map(p => p.y)) - top };
    };
    ctx.beginPath = function () { path = null; lastRect = null; return originals.beginPath.call(this); };
    ctx.moveTo = function (x, y) { path = { start: { x, y }, curves: [], matrix: this.getTransform() }; return originals.moveTo.call(this, x, y); };
    ctx.quadraticCurveTo = function (...args) { if (path) path.curves.push(args); return originals.quadraticCurveTo.apply(this, args); };
    ctx.roundRect = function (x, y, width, height, ...args) {
      const matrix = this.getTransform(); lastRect = { local: { x, y, width, height }, matrix: matrixData(matrix), ...mappedBox(x, y, width, height, matrix) };
      const hit = (node._hotspotLabelBoxes || []).find(box => box.id === 'heart_p' &&
        Math.abs(box.x * node._logicalW - x) < .001 && Math.abs(box.y * node._logicalH - y) < .001 &&
        Math.abs(box.width * node._logicalW - width) < .001 && Math.abs(box.height * node._logicalH - height) < .001);
      if (hit) card = { ...lastRect, hit };
      return originals.roundRect.call(this, x, y, width, height, ...args);
    };
    ctx.fillText = function (text, ...args) {
      if (/^(DEEP|MID|SURFACE) \u00b7 .+$/.test(String(text)) && lastRect) {
        const matrix = this.getTransform();
        caption = { ...lastRect, text: String(text), fontCss: Number(/([\d.]+)px/.exec(this.font)?.[1] || 0) * Math.hypot(matrix.a, matrix.b) * sx };
      }
      return originals.fillText.call(this, text, ...args);
    };
    ctx.stroke = function (...args) {
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
    return { width: rect.width, height: rect.height, logicalWidth: node._logicalW, logicalHeight: node._logicalH,
      dpr: node._dpr, devicePixelRatio: window.devicePixelRatio, canvasUiScale: node._canvasUiScale,
      labelUiScale: node._canvasUiScale / (node._interactionZoom || 1), zoom: node._interactionZoom,
      card, caption, leader, crossesCaption };
  });
}
module.exports = { observePigCardiacPaint, observePigCardiacCaption };
