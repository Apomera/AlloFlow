// @ts-nocheck
// Shared WCAG 1.4.3 probe for real-browser STEM specs (from astronomy-journey-a11y.spec.ts, 2026-10-25).
// Resolves every visible text run against what is painted behind it, including SVG shapes under SVG text,
// translucent layers and paint-order halos. Returns the runs below 4.5:1 (3:1 for large text).
// Disabled controls are skipped (WCAG exempts them). Switch transitions off before calling it.
export const PROBE = () => {
  const parse = c => { const m = /rgba?\(([^)]+)\)/.exec(c || ''); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (t, b) => { const a = t.a + b.a * (1 - t.a); if (!a) return { r: 0, g: 0, b: 0, a: 0 }; return { r: (t.r * t.a + b.r * b.a * (1 - t.a)) / a, g: (t.g * t.a + b.g * b.a * (1 - t.a)) / a, b: (t.b * t.a + b.b * b.a * (1 - t.a)) / a, a }; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const A = lum(a), B = lum(b); return (Math.max(A, B) + 0.05) / (Math.min(A, B) + 0.05); };
  const hex = c => '#' + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  const opacityChain = (el, stop) => { let o = 1; for (let n = el; n && n.nodeType === 1 && n !== stop; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity); return o; };
  function htmlBg(el) {
    const layers: any[] = [];
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (n !== el && ['CANVAS', 'VIDEO', 'IMG'].includes(n.tagName)) return { skip: true };
      const bi = cs.backgroundImage, bc = parse(cs.backgroundColor);
      if (bi && bi !== 'none') { const stops = (bi.match(/rgba?\([^)]+\)/g) || []).map(parse).filter(Boolean); if (!stops.length) return { skip: true }; layers.push({ stops }); }
      if (bc && bc.a > 0) layers.push({ solid: bc });
      if (layers.some(l => l.solid && l.solid.a === 1)) break;
    }
    let cands = [{ r: 255, g: 255, b: 255, a: 1 }];
    for (let i = layers.length - 1; i >= 0; i--) { const l = layers[i]; cands = l.solid ? cands.map(c => over(l.solid, c)) : l.stops.flatMap(s => cands.map(c => over(s, c))); }
    return { cands };
  }
  function svgBg(t) {
    const svg = t.ownerSVGElement, base = htmlBg(svg); if (base.skip) return base; let cands = base.cands;
    const bb = t.getBoundingClientRect(), sx = bb.left + bb.width / 2, sy = bb.top + bb.height / 2;
    const shapes = [...svg.querySelectorAll('circle,rect,ellipse,path,polygon,polyline')].filter(s => (s.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING) && !s.closest('defs,clipPath,mask,marker,pattern,symbol'));
    for (const s of shapes) {
      const cs = getComputedStyle(s); if (cs.visibility === 'hidden' || cs.display === 'none' || !cs.fill || cs.fill === 'none') continue;
      const m = s.getScreenCTM(); if (!m) continue; const pt = svg.createSVGPoint(); pt.x = sx; pt.y = sy; const lp = pt.matrixTransform(m.inverse());
      let inside = false; try { inside = s.isPointInFill(lp); } catch (e) {} if (!inside) continue;
      const op = parseFloat(cs.fillOpacity) * opacityChain(s, svg.parentElement);
      let stops;
      if (cs.fill.startsWith('url(')) { const id = /url\(["']?#([^"')]+)/.exec(cs.fill); const g = id && document.getElementById(id[1]); stops = g ? [...g.querySelectorAll('stop')].map(st => { const sc = getComputedStyle(st), c = parse(sc.stopColor); if (c) c.a *= parseFloat(sc.stopOpacity); return c; }).filter(Boolean) : null; }
      else stops = [parse(cs.fill)];
      if (!stops || !stops.length) return { skip: true };
      cands = stops.flatMap(st => cands.map(c => over({ ...st, a: st.a * op }, c)));
    }
    return { cands };
  }
  const root = document.getElementById('wrap'), out: any[] = [], seen = new Set();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const tn = walker.currentNode, txt = (tn.nodeValue || '').replace(/\s+/g, ' ').trim(); if (!txt) continue;
    const el = tn.parentElement; if (!el || seen.has(el) || ['SCRIPT', 'STYLE', 'OPTION', 'TITLE', 'DESC'].includes(el.tagName.toUpperCase())) continue;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || el.closest('.astr-sr-only')) continue;
    seen.add(el);
    const isSvg = !!el.closest('svg'), fg = parse(isSvg ? cs.fill : cs.color); if (!fg) continue;
    let bg = isSvg ? svgBg(el) : htmlBg(el); if (bg.skip) continue;
    // A halo painted under the glyphs (paint-order: stroke, >= 2 units) is the text's real background (WCAG 1.4.3 understanding).
    const halo = isSvg && /^stroke/.test(cs.paintOrder || '') && parseFloat(cs.strokeWidth) >= 2 ? parse(cs.stroke) : null;
    if (halo) { const o = opacityChain(el, root); bg = { cands: bg.cands.map(c => over({ ...halo, a: halo.a * o }, c)) }; }
    const disabled = !!el.closest('button:disabled,input:disabled,select:disabled,textarea:disabled,[aria-disabled=true]');
    if (disabled) continue; // WCAG exempts inactive components
    let size = parseFloat(cs.fontSize); if (isSvg) { const m = el.getScreenCTM(); if (m) size *= Math.hypot(m.a, m.b); }
    const weight = parseInt(cs.fontWeight) || 400, need = (size >= 24 || (size >= 18.66 && weight >= 700)) ? 3 : 4.5, op = opacityChain(el, root);
    let worst = 99;
    for (const b of bg.cands) { const f = (fg.a < 1 || op < 1) ? over({ ...fg, a: fg.a * op }, b) : fg; worst = Math.min(worst, ratio(f, b)); }
    if (worst < need) out.push(`${worst.toFixed(2)}:1 < ${need} ${hex(fg)} ${Math.round(size)}px "${txt.slice(0, 40)}"`);
  }
  return out;
};
