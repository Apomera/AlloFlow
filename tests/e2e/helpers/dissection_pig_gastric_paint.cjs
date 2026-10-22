// Forward native canvas calls while measuring the anatomy actually painted.
async function observePigGastricPaint(canvas, anchor = { x: .562, y: .503 }) {
  return canvas.evaluate((node, anchor) => {
    const ctx = node.getContext('2d'), originals = {};
    for (const name of ['beginPath', 'moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'closePath', 'ellipse', 'rect', 'save', 'restore', 'fill', 'stroke', 'clip', 'arc']) originals[name] = ctx[name];
    let matrix = null, owner = null, starts = [], curves = [], closed = false, reticle = null, cavityContainsTarget = false, neck = null;
    const stomach = [], borders = [], clips = [], courses = new Map(), overpaints = [], jejunumStarts = new Map(), jejunumTangents = new Map();
    let recordedPath = null, pathMatrix = null, rectangles = 0, rootMaskActive = false;
    const maskStack = [], rootMaskRecords = [];
    const near = (a, b) => Math.abs(a - b) < .00001;
    const mapped = p => matrix && new DOMPoint(p.x * node._logicalW, p.y * node._logicalH).matrixTransform(matrix);
    const screen = p => { const b = node.getBoundingClientRect(); return { x: b.x + p.x / node.width * b.width, y: b.y + p.y / node.height * b.height }; };
    const inside = (context, args) => { const p = mapped(anchor); return args[0] instanceof Path2D ? context.isPointInPath(args[0], p.x, p.y) : context.isPointInPath(p.x, p.y); };
    ctx.beginPath = function () {
      const stack = new Error().stack || '';
      if (!matrix && stack.includes('tracePigBody')) matrix = this.getTransform();
      owner = stack.includes('tracePigCoelom') ? 'cavity' : stack.includes('tracePigGastricRegion') && stack.includes('drawPigGastricComplex') ? 'gastric'
        : stack.includes('tracePigPancreas') ? 'pancreas' : null;
      starts = []; curves = []; closed = false;
      recordedPath = new Path2D(); pathMatrix = this.getTransform(); rectangles = 0;
      return originals.beginPath.call(this);
    };
    ctx.moveTo = function (x, y) {
      const p = { x: x / node._logicalW, y: y / node._logicalH }; starts.push(p);
      if (recordedPath) recordedPath.moveTo(x, y);
      const stack = new Error().stack || '';
      if (!owner && near(p.x, .554) && near(p.y, .536)) owner = 'pancreas';
      if (!owner && near(p.x, .525) && near(p.y, .640)) owner = 'umbilical';
      if (!owner && near(p.x, .567) && near(p.y, .514) && !stack.includes('drawEntericBowel')) owner = 'mesentery';
      if (stack.includes('traceEntericCenterline') && stack.includes('drawEntericBowel') && near(p.x, .605) && near(p.y, .522)) jejunumStarts.set('jejunum', p);
      return originals.moveTo.call(this, x, y);
    };
    ctx.lineTo = function (...args) { if (recordedPath) recordedPath.lineTo(...args); return originals.lineTo.apply(this, args); };
    ctx.bezierCurveTo = function (...args) {
      const normalized = args.map((n, i) => n / (i % 2 ? node._logicalH : node._logicalW));
      if (recordedPath) recordedPath.bezierCurveTo(...args);
      if (!curves.length && starts[0] && near(starts[0].x, .605) && near(starts[0].y, .522) &&
        (new Error().stack || '').includes('traceEntericCenterline')) jejunumTangents.set('jejunum', { x: normalized[0] - starts[0].x, y: normalized[1] - starts[0].y });
      curves.push(normalized); return originals.bezierCurveTo.apply(this, args);
    };
    ctx.quadraticCurveTo = function (...args) { if (recordedPath) recordedPath.quadraticCurveTo(...args); return originals.quadraticCurveTo.apply(this, args); };
    ctx.closePath = function () { closed = true; if (recordedPath) recordedPath.closePath(); return originals.closePath.call(this); };
    ctx.rect = function (...args) { rectangles++; if (recordedPath) recordedPath.rect(...args); return originals.rect.apply(this, args); };
    ctx.save = function () { maskStack.push(rootMaskActive); return originals.save.call(this); };
    ctx.restore = function () { if (maskStack.length) rootMaskActive = maskStack.pop(); return originals.restore.call(this); };
    ctx.ellipse = function (x, y, rx, ry, ...args) {
      if (recordedPath) recordedPath.ellipse(x, y, rx, ry, ...args);
      if (near(x / node._logicalW, .517) && near(y / node._logicalH, .506)) owner = 'spleen';
      return originals.ellipse.call(this, x, y, rx, ry, ...args);
    };
    ctx.fill = function (...args) {
      if (matrix) {
        if (owner === 'cavity') cavityContainsTarget = inside(this, args);
        if (owner === 'gastric' && closed) {
          const root = mapped({ x: .576, y: .513 });
          stomach.push({ cubics: curves.length, containsTarget: inside(this, args), containsDuodenalRoot: this.isPointInPath(root.x, root.y), rootMaskActive });
        }
        if (['pancreas', 'spleen', 'mesentery'].includes(owner)) overpaints.push({ owner, paint: 'fill', containsTarget: inside(this, args) });
        if (args[0] instanceof Path2D && (new Error().stack || '').includes('drawEntericBowel')) overpaints.push({ owner: 'jejunum', paint: 'fill', containsTarget: inside(this, args) });
      }
      return originals.fill.apply(this, args);
    };
    ctx.stroke = function (...args) {
      if (matrix) {
        const p = mapped(anchor);
        if (owner === 'gastric' && !closed && curves.length === 1 && starts.length === 1) {
          const c = curves[0], t = .72, u = 1 - t, a = starts[0];
          neck = mapped({ x: u*u*u*a.x + 3*u*u*t*c[0] + 3*u*t*t*c[2] + t*t*t*c[4], y: u*u*u*a.y + 3*u*u*t*c[1] + 3*u*t*t*c[3] + t*t*t*c[5] });
        }
        if (owner === 'gastric' && !closed && curves.length === 1 && starts.length === 1) {
          const key = JSON.stringify([starts, curves]);
          if (!courses.has(key)) courses.set(key, { start: starts[0], curves: curves.map(c => c.slice()), containsTarget: this.isPointInStroke(p.x, p.y), containsNeck: !!neck && this.isPointInStroke(neck.x, neck.y), rootMaskActive });
        } else if (owner === 'gastric' && !closed && curves.length === 7) {
          borders.push({ cubics: curves.length, subpaths: starts.length, closesOutlet: !!neck && this.isPointInStroke(neck.x, neck.y) });
        }
        if (owner === 'umbilical' && String(this.strokeStyle) === '#a855f7') overpaints.push({ owner, paint: 'stroke', containsTarget: this.isPointInStroke(p.x, p.y) });
        if (owner === 'pancreas') overpaints.push({ owner, paint: 'stroke', containsTarget: this.isPointInStroke(p.x, p.y) });
        if (curves.length === 3 && (new Error().stack || '').includes('drawEntericBowel')) overpaints.push({ owner: 'jejunum', paint: 'stroke', containsTarget: this.isPointInStroke(p.x, p.y) });
      }
      return originals.stroke.apply(this, args);
    };
    ctx.clip = function (...args) {
      if (args[0] === 'evenodd' && recordedPath && (new Error().stack || '').includes('drawPigGastricComplex')) {
        rootMaskRecords.push({ path: recordedPath, matrix: pathMatrix, rectangles, cubics: curves.length, rule: 'evenodd' });
        rootMaskActive = true;
      } else if (matrix && owner === 'gastric' && closed) clips.push({ cubics: curves.length, containsTarget: inside(this, args) });
      return originals.clip.apply(this, args);
    };
    ctx.arc = function (x, y, radius, from, to, ...args) {
      if (!reticle && Math.abs(to - from - .58) < .0001) { const p = new DOMPoint(x, y).matrixTransform(this.getTransform()); reticle = { x: p.x, y: p.y }; }
      return originals.arc.call(this, x, y, radius, from, to, ...args);
    };
    try { node._drawDissectionNow(); } finally { for (const name of Object.keys(originals)) ctx[name] = originals[name]; }
    const course = Array.from(courses.values())[0];
    const visible = course && (() => { const a = course.start, c = course.curves[0], t = .95, u = 1 - t;
      return { x: u*u*u*a.x + 3*u*u*t*c[0] + 3*u*t*t*c[2] + t*t*t*c[4], y: u*u*u*a.y + 3*u*u*t*c[1] + 3*u*t*t*c[3] + t*t*t*c[5] }; })();
    const rootMasks = rootMaskRecords.map(record => {
      ctx.save();
      try {
        ctx.setTransform(record.matrix);
        const contains = normalized => { const p = new DOMPoint(normalized.x * node._logicalW, normalized.y * node._logicalH).matrixTransform(record.matrix); return ctx.isPointInPath(record.path, p.x, p.y, record.rule); };
        return { rule: record.rule, rectangles: record.rectangles, cubics: record.cubics, excludesRoot: !!course && !contains(course.start), excludesTarget: !contains(anchor), permitsVisibleCourse: !!visible && contains(visible) };
      } finally { ctx.restore(); }
    });
    const p = mapped(anchor);
    return { logicalWidth: node._logicalW, logicalHeight: node._logicalH, matrixObserved: !!matrix, cavityContainsTarget,
      stomach, borders, clips, rootMasks, courses: Array.from(courses.values()), jejunumStarts: Array.from(jejunumStarts.values()), jejunumTangents: Array.from(jejunumTangents.values()), overpaints,
      target: p ? screen(p) : null, reticle: reticle ? screen(reticle) : null };
  }, anchor);
}
async function observePigGastricCaption(canvas) {
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
      const hit = (node._hotspotLabelBoxes || []).find(box => box.id === 'stomach_p' &&
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
module.exports = { observePigGastricPaint, observePigGastricCaption };
