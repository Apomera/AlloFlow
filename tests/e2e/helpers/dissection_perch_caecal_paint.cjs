async function observePerchCaecalPaint(canvas, anchor) {
  return canvas.evaluate((node, anchor) => {
    const ctx = node.getContext('2d'), originals = {};
    for (const method of ['beginPath', 'moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'closePath', 'fill', 'stroke', 'clip', 'fillRect', 'arc']) originals[method] = ctx[method];
    const regions = [], courses = new Map(), clips = [], intestineStrokes = [];
    let matrix = null, owned = false, cavityPath = false, closed = false, start = null, cubics = [], quadratics = [], lines = [];
    let paints = 0, insideCavity = false, sawCaeca = false, reticle = null;
    const point = () => matrix && new DOMPoint(anchor.x * node._logicalW, anchor.y * node._logicalH).matrixTransform(matrix);
    const screen = p => { const box = node.getBoundingClientRect(); return { x: box.x + p.x / node.width * box.width, y: box.y + p.y / node.height * box.height }; };
    ctx.beginPath = function () {
      const stack = new Error().stack || '';
      if (!matrix && stack.includes('tracePerchBody')) matrix = this.getTransform();
      owned = stack.includes('tracePerchCaecalRegion') && stack.includes('drawPerchPyloricCaeca'); cavityPath = stack.includes('tracePerchCoelom');
      closed = false; start = null; cubics = []; quadratics = []; lines = [];
      return originals.beginPath.call(this);
    };
    ctx.moveTo = function (x, y) { if (!start) start = { x, y }; return originals.moveTo.call(this, x, y); };
    ctx.lineTo = function (...args) { lines.push(args); return originals.lineTo.apply(this, args); };
    ctx.bezierCurveTo = function (...args) { cubics.push(args); return originals.bezierCurveTo.apply(this, args); };
    ctx.quadraticCurveTo = function (...args) { quadratics.push(args); return originals.quadraticCurveTo.apply(this, args); };
    ctx.closePath = function () { closed = true; return originals.closePath.call(this); };
    const countPaint = () => { if ((new Error().stack || '').includes('drawPerchPyloricCaeca')) paints++; };
    ctx.fill = function (...args) {
      countPaint();
      if (owned && matrix) { const p = point(); regions.push({ closed, cubics: cubics.length, containsTarget: this.isPointInPath(p.x, p.y) }); sawCaeca = true; }
      return originals.fill.apply(this, args);
    };
    ctx.fillRect = function (...args) { countPaint(); return originals.fillRect.apply(this, args); };
    ctx.stroke = function (...args) {
      countPaint();
      if (owned && !closed && start && matrix) {
        const key = [start.x, start.y, ...cubics.flat(), ...quadratics.flat()].map(n => n.toFixed(5)).join(',');
        if (!courses.has(key)) { const p = point(); courses.set(key, { containsTarget: this.isPointInStroke(p.x, p.y), cubics: cubics.length, quadratics: quadratics.length }); }
        sawCaeca = true;
      } else if (sawCaeca && !owned && cubics.length === 3 && lines.length === 1 && matrix &&
        (new Error().stack || '').includes('strokeAnatomicalTube')) {
        // The later intact intestine has three cubics and one terminal line;
        // observe its actual stroke, rather than approximating it with a box.
        const p = point(); intestineStrokes.push({ containsTarget: this.isPointInStroke(p.x, p.y) });
      }
      return originals.stroke.apply(this, args);
    };
    ctx.clip = function (...args) {
      if (matrix) { const p = point();
        if (cavityPath) insideCavity = this.isPointInPath(p.x, p.y);
        if (owned) clips.push({ containsTarget: this.isPointInPath(p.x, p.y) });
      }
      return originals.clip.apply(this, args);
    };
    ctx.arc = function (x, y, radius, from, to, ...args) {
      if (!reticle && Math.abs(to - from - .58) < .0001) { const p = new DOMPoint(x, y).matrixTransform(this.getTransform()); reticle = { x: p.x, y: p.y }; }
      return originals.arc.call(this, x, y, radius, from, to, ...args);
    };
    try { node._drawDissectionNow(); } finally { for (const method of Object.keys(originals)) ctx[method] = originals[method]; }
    const target = point();
    return { logicalWidth: node._logicalW, logicalHeight: node._logicalH, matrixObserved: !!matrix,
      regions, courses: Array.from(courses.values()), clips, paints, insideCavity, intestineStrokes,
      normalizedTarget: anchor, target: target ? screen(target) : null, reticle: reticle ? screen(reticle) : null };
  }, anchor);
}
async function observeCaecalCaptionPaint(canvas) {
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
      const hit = (node._hotspotLabelBoxes || []).find(box => box.id === 'pyloric_ceca' &&
        Math.abs(box.x * node._logicalW - x) < .001 && Math.abs(box.y * node._logicalH - y) < .001 &&
        Math.abs(box.width * node._logicalW - width) < .001 && Math.abs(box.height * node._logicalH - height) < .001);
      if (hit) card = { ...lastRect, hit };
      return originals.roundRect.call(this, x, y, width, height, ...args);
    };
    ctx.fillText = function (text, ...args) {
      if (/^(DEEP|MID|SURFACE) \u00b7 POUCHES$/.test(String(text)) && lastRect) {
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
module.exports = { observePerchCaecalPaint, observeCaecalCaptionPaint };
