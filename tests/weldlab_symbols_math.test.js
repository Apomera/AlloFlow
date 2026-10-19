import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const read = () => readFileSync(resolve(process.cwd(), SRC), 'utf8');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root = null;
// Live mounts run the tool's save-slot mirror effect; a leftover slot makes the
// next SSR render hydrate through the harness's two-argument update() and
// clobber its store, so every test starts from an empty slot.
beforeEach(() => {
  try { delete window.__alloflowWeldLab; localStorage.clear(); } catch (e) {}
  resetStemLab(); loadTool(SRC, 'weldLab');
});
afterEach(async () => { if (root) { await React.act(() => root.unmount()); root = null; } });

const S = () => window.__WeldLabCore.sym2;

// ── SVG parsing: read the DRAWN coordinates, never the model's own claims ──
function parseSvg(markup) {
  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
  return doc.documentElement;
}
function pathPoints(d) {
  const n = (d.match(/-?\d+(\.\d+)?/g) || []).map(Number);
  const pts = [];
  for (let i = 0; i + 1 < n.length; i += 2) pts.push([n[i], n[i + 1]]);
  return pts;
}
// Every y a group draws: line ends, path points (M/L/Q only), circle extremes, rect edges.
function groupYs(g) {
  const ys = [];
  g.querySelectorAll('line').forEach((l) => ys.push(+l.getAttribute('y1'), +l.getAttribute('y2')));
  g.querySelectorAll('path').forEach((p) => pathPoints(p.getAttribute('d')).forEach((pt) => ys.push(pt[1])));
  g.querySelectorAll('circle').forEach((c) => { const cy = +c.getAttribute('cy'), r = +c.getAttribute('r'); ys.push(cy - r, cy + r); });
  g.querySelectorAll('rect').forEach((r) => { const y = +r.getAttribute('y'); ys.push(y, y + +r.getAttribute('height')); });
  g.querySelectorAll('text').forEach((t) => ys.push(+t.getAttribute('y')));
  return ys;
}
function refY(svg) {
  const l = svg.querySelector('g[data-part="ref"] line');
  expect(l, 'no reference line drawn').toBeTruthy();
  expect(+l.getAttribute('y1')).toBe(+l.getAttribute('y2'));
  return +l.getAttribute('y1');
}
const symGroup = (svg, side) => svg.querySelector('g[data-part="sym"][data-side="' + side + '"]');

const TYPES = ['fillet', 'squareGroove', 'vGroove', 'bevel', 'uGroove', 'jGroove', 'plug', 'spot', 'seam', 'backing'];

describe('SYM renderer: AWS A2.4 placement', () => {
  it('draws every arrow-side symbol BELOW the reference line and every other-side symbol ABOVE it', () => {
    for (const type of TYPES) {
      for (const arrowAt of ['left', 'right']) {
        const a = parseSvg(S().svg({ type, side: 'arrow', size: '1/4', arrowAt }));
        const ra = refY(a), ga = symGroup(a, 'arrow');
        expect(ga, type + ' arrow group').toBeTruthy();
        const ya = groupYs(ga);
        expect(Math.min(...ya), type + ' arrow side pokes above the line').toBeGreaterThanOrEqual(ra - 1e-6);
        expect(Math.max(...ya), type + ' arrow side never leaves the line').toBeGreaterThan(ra + 5);
        const sizeA = a.querySelector('g[data-part="size"][data-side="arrow"] text');
        expect(+sizeA.getAttribute('y'), type + ' size text on the arrow side').toBeGreaterThan(ra);

        const o = parseSvg(S().svg({ type, side: 'other', size: '1/4', arrowAt }));
        const ro = refY(o), go = symGroup(o, 'other');
        expect(go, type + ' other group').toBeTruthy();
        const yo = groupYs(go);
        expect(Math.max(...yo), type + ' other side dips below the line').toBeLessThanOrEqual(ro + 1e-6);
        expect(Math.min(...yo), type + ' other side never leaves the line').toBeLessThan(ro - 5);
        expect(symGroup(o, 'arrow'), type + ' other-only spec drew an arrow-side symbol').toBeNull();
      }
    }
  });

  it('draws both groups for a both-sides groove and keeps the arrow at its own end', () => {
    const svg = parseSvg(S().svg({ type: 'vGroove', side: 'both', angle: 60 }));
    const r = refY(svg);
    expect(Math.min(...groupYs(symGroup(svg, 'arrow')))).toBeGreaterThanOrEqual(r);
    expect(Math.max(...groupYs(symGroup(svg, 'other')))).toBeLessThanOrEqual(r);
    // the angle is placed beyond each V, on its own side
    const angA = svg.querySelector('g[data-part="angle"][data-side="arrow"] text');
    const angO = svg.querySelector('g[data-part="angle"][data-side="other"] text');
    expect(+angA.getAttribute('y')).toBeGreaterThan(Math.max(...groupYs(symGroup(svg, 'arrow'))));
    expect(+angO.getAttribute('y')).toBeLessThan(Math.min(...groupYs(symGroup(svg, 'other'))));
  });

  it('puts the size LEFT of the symbol and length-pitch RIGHT of it', () => {
    const svg = parseSvg(S().svg({ type: 'fillet', side: 'arrow', size: '3/16', length: '2', pitch: '6' }));
    const xs = pathPoints(symGroup(svg, 'arrow').querySelector('path').getAttribute('d')).map((p) => p[0]);
    const size = svg.querySelector('g[data-part="size"] text');
    const lp = svg.querySelector('g[data-part="lp"] text');
    expect(size.getAttribute('text-anchor')).toBe('end');
    expect(+size.getAttribute('x')).toBeLessThan(Math.min(...xs));
    expect(lp.getAttribute('text-anchor')).toBe('start');
    expect(+lp.getAttribute('x')).toBeGreaterThan(Math.max(...xs));
    expect(lp.textContent).toBe('2-6');
  });

  it('keeps the fillet perpendicular leg on the LEFT, on both sides and with the arrow at either end', () => {
    for (const side of ['arrow', 'other']) {
      for (const arrowAt of ['left', 'right']) {
        const svg = parseSvg(S().svg({ type: 'fillet', side, arrowAt }));
        const r = refY(svg);
        const pts = pathPoints(symGroup(svg, side).querySelector('path').getAttribute('d'));
        expect(pts.length).toBe(3);
        const vertical = [];
        for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) if (pts[i][0] === pts[j][0]) vertical.push([pts[i], pts[j]]);
        expect(vertical.length, 'fillet has no vertical leg').toBe(1);
        const legX = vertical[0][0][0];
        expect(legX, side + '/' + arrowAt + ': vertical leg is not the leftmost edge').toBe(Math.min(...pts.map((p) => p[0])));
        expect(vertical[0].some((p) => p[1] === r), 'vertical leg must stand on the line').toBe(true);
        // the third point (the toe) lies ON the reference line
        const toe = pts.find((p) => p[0] !== legX);
        expect(toe[1]).toBe(r);
      }
    }
  });

  it('draws a square groove as two parallel vertical lines, never a closed box', () => {
    for (const side of ['arrow', 'other']) {
      const svg = parseSvg(S().svg({ type: 'squareGroove', side }));
      const g = symGroup(svg, side);
      expect(g.querySelectorAll('rect').length, 'square groove drawn as a rectangle').toBe(0);
      expect(g.querySelectorAll('path').length, 'square groove drawn as a path/box').toBe(0);
      const lines = [...g.querySelectorAll('line')];
      expect(lines.length).toBe(2);
      lines.forEach((l) => expect(+l.getAttribute('x1')).toBe(+l.getAttribute('x2')));
      expect(+lines[0].getAttribute('x1')).not.toBe(+lines[1].getAttribute('x1'));
      // open at the far end: nothing joins the two tops
      const r = refY(svg);
      lines.forEach((l) => expect([+l.getAttribute('y1'), +l.getAttribute('y2')]).toContain(r));
    }
  });

  it('draws the plug/slot symbol as an OPEN rectangle sitting on the line', () => {
    const a = parseSvg(S().svg({ type: 'plug', side: 'arrow' }));
    const ra = refY(a);
    const rect = symGroup(a, 'arrow').querySelector('rect');
    expect(rect, 'plug is not a rectangle').toBeTruthy();
    expect(rect.getAttribute('fill')).toBe('none');
    expect(+rect.getAttribute('y')).toBe(ra);
    const o = parseSvg(S().svg({ type: 'plug', side: 'other' }));
    const ro = refY(o), ro2 = symGroup(o, 'other').querySelector('rect');
    expect(ro2.getAttribute('fill')).toBe('none');
    expect(+ro2.getAttribute('y') + +ro2.getAttribute('height')).toBe(ro);
  });

  it('bulges a CONVEX contour away from the line and dishes a CONCAVE one toward it', () => {
    for (const side of ['arrow', 'other']) {
      for (const type of ['fillet', 'vGroove', 'plug']) {
        const cx = parseSvg(S().svg({ type, side, contour: 'convex' }));
        const r = refY(cx);
        const p = pathPoints(cx.querySelector('g[data-part="contour"] path').getAttribute('d'));
        const endD = Math.abs(p[0][1] - r), ctrlD = Math.abs(p[1][1] - r);
        expect(ctrlD, type + '/' + side + ' convex reads concave').toBeGreaterThan(endD);
        // and the contour sits beyond the symbol on its own side
        expect(Math.sign(p[0][1] - r)).toBe(side === 'arrow' ? 1 : -1);
        const cc = parseSvg(S().svg({ type, side, contour: 'concave' }));
        const q = pathPoints(cc.querySelector('g[data-part="contour"] path').getAttribute('d'));
        expect(Math.abs(q[1][1] - r), type + '/' + side + ' concave reads convex').toBeLessThan(Math.abs(q[0][1] - r));
      }
    }
  });

  it('touches the line at the ROOT of a groove: double-V reads as an X, double-bevel as a K', () => {
    const v = parseSvg(S().svg({ type: 'vGroove', side: 'both' }));
    const r = refY(v);
    const va = pathPoints(symGroup(v, 'arrow').querySelector('path').getAttribute('d'));
    const vo = pathPoints(symGroup(v, 'other').querySelector('path').getAttribute('d'));
    // the middle point of each V is its vertex, and it is ON the line; the arms leave it
    expect(va[1][1]).toBe(r); expect(vo[1][1]).toBe(r);
    expect(va[0][1]).toBeGreaterThan(r); expect(vo[0][1]).toBeLessThan(r);
    expect(va[1][0]).toBe(vo[1][0]);
    const k = parseSvg(S().svg({ type: 'bevel', side: 'both' }));
    const kr = refY(k);
    const legs = (side) => [...symGroup(k, side).querySelectorAll('line')].map((l) => [[+l.getAttribute('x1'), +l.getAttribute('y1')], [+l.getAttribute('x2'), +l.getAttribute('y2')]]);
    for (const side of ['arrow', 'other']) {
      const ls = legs(side);
      expect(ls.length).toBe(2);
      ls.forEach((l) => expect(l[0][1], 'bevel leg does not start on the line').toBe(kr));
      const vert = ls.filter((l) => l[0][0] === l[1][0]);
      const slant = ls.filter((l) => l[0][0] !== l[1][0]);
      expect(vert.length).toBe(1); expect(slant.length).toBe(1);
      expect(vert[0][0][0], 'bevel vertical leg must be on the left').toBeLessThan(Math.max(slant[0][0][0], slant[0][1][0]));
    }
    expect(legs('arrow').find((l) => l[0][0] === l[1][0])[0][0]).toBe(legs('other').find((l) => l[0][0] === l[1][0])[0][0]);
  });

  it('puts the junction flags where A2.4 puts them', () => {
    const svg = parseSvg(S().svg({ type: 'fillet', side: 'arrow', allAround: true, fieldWeld: true, tail: 'GMAW' }));
    const r = refY(svg);
    const arrowLine = svg.querySelector('g[data-part="arrow"] line');
    const jx = +arrowLine.getAttribute('x1');
    const circle = svg.querySelector('g[data-part="allround"] circle');
    expect(+circle.getAttribute('cx')).toBe(jx); expect(+circle.getAttribute('cy')).toBe(r);
    const flagYs = groupYs(svg.querySelector('g[data-part="field"]'));
    expect(Math.max(...flagYs)).toBeLessThanOrEqual(r);
    expect(svg.querySelector('g[data-part="tail"] text').textContent).toBe('GMAW');
    // no tail is drawn when nothing needs saying
    expect(parseSvg(S().svg({ type: 'fillet', side: 'arrow' })).querySelector('g[data-part="tail"]')).toBeNull();
  });

  it('keeps SVG text to numbers, single letters and tail codes', () => {
    const specs = [{ type: 'vGroove', side: 'both', size: '3/8', angle: 60, rootOpening: '1/8', contour: 'flush', finish: 'G', tail: 'GTAW-6G', length: '2', pitch: '6' }];
    for (const s of specs) {
      const svg = parseSvg(S().svg(s));
      [...svg.querySelectorAll('text')].forEach((t) => {
        const part = t.parentNode.getAttribute('data-part');
        if (part === 'tail') expect(t.textContent).toMatch(/^[A-Z0-9\-\.\/ ·]+$/);
        else expect(t.textContent, part).toMatch(/^([0-9\/\-\.°]+|[A-Z])$/);
      });
    }
  });

  it('normalises hostile specs instead of throwing', () => {
    const bad = [null, 7, 'x', [], { type: '__proto__', side: {}, size: '<script>', angle: 'NaN', tail: 'bad tail!!', leader: ['a', 2] }, { type: 'plug', side: 'both' }, { type: 'spot', side: 'none', angle: 400 }];
    bad.forEach((b) => {
      const s = S().normSpec(b);
      expect(S().TYPES.concat('none')).toContain(s.type);
      expect(['arrow', 'other', 'both', 'none']).toContain(s.side);
      expect(() => S().svg(b)).not.toThrow();
      expect(S().svg(b)).not.toMatch(/<script|NaN|undefined/);
    });
    expect(S().normSpec({ type: 'plug', side: 'both' }).side).toBe('arrow');
  });

  it('draws the React symbols from the same geometry as the markup twin', () => {
    const html = renderTool('weldLab', { weldLab: { view: 'symbolsReader', sr_view: 'library', sym2_lib_side: 'other' } });
    const doc = new DOMParser().parseFromString('<div>' + html + '</div>', 'text/html');
    const card = doc.querySelector('[data-sym2-card="fillet"] svg[data-weld-symbol]');
    expect(card).toBeTruthy();
    const twin = parseSvg(S().svg({ type: 'fillet', side: 'other', compact: true }));
    const dReact = card.querySelector('g[data-part="sym"][data-side="other"] path').getAttribute('d');
    expect(dReact).toBe(twin.querySelector('g[data-part="sym"][data-side="other"] path').getAttribute('d'));
    // every basic card honours the side toggle (or is one-sided by definition)
    doc.querySelectorAll('[data-sym2-card] svg[data-weld-symbol]').forEach((svg) => {
      const r = +svg.querySelector('g[data-part="ref"] line').getAttribute('y1');
      const g = svg.querySelector('g[data-part="sym"]');
      const ys = groupYs(g);
      if (g.getAttribute('data-side') === 'other') expect(Math.max(...ys)).toBeLessThanOrEqual(r);
      else expect(Math.min(...ys)).toBeGreaterThanOrEqual(r);
    });
  });

  it('draws challenge 4\'s convex contour so it bulges AWAY from the line (the audit bug)', () => {
    const html = renderTool('weldLab', { weldLab: { view: 'symbolsReader', sr_view: 'practice', sym2_pr_idx: 3 } });
    const doc = new DOMParser().parseFromString('<div>' + html + '</div>', 'text/html');
    const svg = doc.querySelector('svg[data-weld-symbol]');
    const r = +svg.querySelector('g[data-part="ref"] line').getAttribute('y1');
    const p = pathPoints(svg.querySelector('g[data-part="contour"] path').getAttribute('d'));
    expect(Math.abs(p[1][1] - r)).toBeGreaterThan(Math.abs(p[0][1] - r));
    expect(p[0][1]).toBeGreaterThan(r);
    // and challenge 3 is an X: V vertices on the line
    const html3 = renderTool('weldLab', { weldLab: { view: 'symbolsReader', sr_view: 'practice', sym2_pr_idx: 2 } });
    const d3 = new DOMParser().parseFromString('<div>' + html3 + '</div>', 'text/html');
    const s3 = d3.querySelector('svg[data-weld-symbol]');
    const r3 = +s3.querySelector('g[data-part="ref"] line').getAttribute('y1');
    ['arrow', 'other'].forEach((sd) => {
      const pts = pathPoints(s3.querySelector('g[data-part="sym"][data-side="' + sd + '"] path').getAttribute('d'));
      expect(pts[1][1]).toBe(r3);
    });
  });
});

describe('SYM mini blueprint', () => {
  function segDist(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
    const t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0;
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  }
  it('lands every leader arrow on the outline of the part it describes', () => {
    const html = renderTool('weldLab', { weldLab: { view: 'symbolsReader', sr_view: 'blueprint' } });
    const doc = new DOMParser().parseFromString('<div>' + html + '</div>', 'text/html');
    const bp = [...doc.querySelectorAll('svg')].find((s) => s.querySelector('g[data-callout]'));
    expect(bp).toBeTruthy();
    // part outline = every rect and polygon drawn outside the callouts
    const segs = [];
    bp.querySelectorAll('rect').forEach((r) => {
      if (r.closest('g[data-callout]') || r.getAttribute('stroke') === '#94a3b8' || !r.getAttribute('stroke')) return;
      const x = +r.getAttribute('x'), y = +r.getAttribute('y'), w = +r.getAttribute('width'), hh = +r.getAttribute('height');
      segs.push([[x, y], [x + w, y]], [[x + w, y], [x + w, y + hh]], [[x + w, y + hh], [x, y + hh]], [[x, y + hh], [x, y]]);
    });
    bp.querySelectorAll('path').forEach((p) => {
      if (p.closest('g[data-callout]')) return;
      const pts = pathPoints(p.getAttribute('d'));
      for (let i = 0; i < pts.length; i++) segs.push([pts[i], pts[(i + 1) % pts.length]]);
    });
    const callouts = [...bp.querySelectorAll('g[data-callout]')];
    expect(callouts.length).toBe(4);
    callouts.forEach((c) => {
      const g = c.querySelector('g[transform]');
      const m = /translate\(([-\d.]+) ([-\d.]+)\) scale\(([-\d.]+)\)/.exec(g.getAttribute('transform'));
      const head = pathPoints(g.querySelector('g[data-part="arrow"] path').getAttribute('d'))[0];
      const tip = [+m[1] + head[0] * +m[3], +m[2] + head[1] * +m[3]];
      const best = Math.min(...segs.map((s) => segDist(tip, s[0], s[1])));
      expect(best, c.getAttribute('data-callout') + ' arrow misses the part by ' + best.toFixed(2)).toBeLessThan(0.75);
    });
  });
});

describe('SYM builder checker', () => {
  const full = { type: 'vGroove', side: 'arrow', size: '1/2', length: '2', pitch: '6', angle: 60, rootOpening: '1/8', contour: 'convex', finish: 'G', fieldWeld: true, allAround: true, tail: 'GMAW' };
  const flip = {
    type: { type: 'bevel' }, side: { side: 'other' }, size: { size: '3/8' }, lp: { length: '3', pitch: '12' }, angle: { angle: 45 },
    rootOpening: { rootOpening: '1/16' }, contour: { contour: 'flush' }, finish: { finish: 'M' }, fieldWeld: { fieldWeld: false },
    allAround: { allAround: false }, tail: { tail: 'SMAW' }
  };
  it('accepts the exact spec', () => {
    const res = S().checkBuild(full, Object.assign({}, full));
    expect(res.ok).toBe(true);
    expect(res.wrong).toEqual([]);
    expect(res.fields.map((f) => f.field)).toEqual(S().FIELDS);
  });
  it('rejects every single-field mismatch and names exactly that field', () => {
    expect(Object.keys(flip).sort()).toEqual([...S().FIELDS].sort());
    for (const f of S().FIELDS) {
      const res = S().checkBuild(full, Object.assign({}, full, flip[f]));
      expect(res.ok, f + ' mismatch accepted').toBe(false);
      expect(res.wrong, f).toEqual([f]);
    }
  });
  it('rejects a build whose side was never chosen or whose type is empty', () => {
    expect(S().checkBuild({ type: 'fillet', side: 'arrow', size: '1/4' }, { type: 'fillet', side: '', size: '1/4' }).wrong).toEqual(['side']);
    expect(S().checkBuild({ type: 'fillet', side: 'arrow' }, { type: 'none', side: 'arrow' }).ok).toBe(false);
  });
});

// ── Math generators: an INDEPENDENT recomputation, not a call back into the tool ──
const STEEL = 0.2836, MM = 25.4, EFF = { gmaw: 0.95, fcaw: 0.85, smaw: 0.60 };
function recompute(k, p) {
  switch (k) {
    case 'frac2dec': return p.whole + p.num / p.den;
    case 'frac2mm': return (p.whole + p.num / p.den) * MM;
    case 'mm2frac': return Math.round(p.mm / MM * 16) / 16;
    case 'tape': return p.whole + p.six / 16;
    case 'plateWeight': return p.L * p.W * (p.tn / p.td) * STEEL;
    case 'brace': return p.rise / Math.sin(p.deg * Math.PI / 180);
    case 'square': return Math.hypot(p.a, p.b);
    case 'filler': { const leg = p.ln / p.ld; return (leg * leg / 2) * p.ft * 12 * STEEL / EFF[p.proc]; }
    case 'bid': return p.hours * p.rate + p.materials + p.overhead;
    default: throw new Error(k);
  }
}

describe('SYM math practice generators', () => {
  it('exposes the stated constants', () => {
    expect(S().STEEL).toBe(0.2836);
    expect(S().MM).toBe(25.4);
    expect(S().DEP_EFF).toEqual(EFF);
    expect(S().KINDS).toEqual(['frac2dec', 'frac2mm', 'mm2frac', 'tape', 'plateWeight', 'brace', 'square', 'filler', 'bid']);
  });

  it('produces answers that match an independent recomputation for 50 seeds of every kind', () => {
    for (const k of S().KINDS) {
      for (let i = 0; i < 50; i++) {
        const seed = S().mixSeed(1000 + i * 7919, S().KINDS.indexOf(k), i);
        const pr = S().gen(k, seed);
        expect(pr.kind).toBe(k);
        const want = recompute(k, pr.p);
        expect(Math.abs(pr.answer - want), k + ' seed ' + seed).toBeLessThan(1e-9);
        expect(isFinite(pr.answer) && pr.answer > 0).toBe(true);
        expect(pr.tol).toBeGreaterThan(0);
        // the checker accepts the exact answer and rejects anything well outside tolerance
        expect(S().checkMath(pr, String(pr.answer)).ok, k + ' exact rejected').toBe(true);
        expect(S().checkMath(pr, String(pr.answer + 4 * pr.tol)).ok, k + ' high accepted').toBe(false);
        expect(S().checkMath(pr, String(pr.answer - 4 * pr.tol)).ok, k + ' low accepted').toBe(false);
      }
    }
  });

  it('keeps generated numbers in sane shop ranges', () => {
    for (let i = 0; i < 200; i++) {
      const t = S().gen('tape', i + 1).p;
      expect(t.six).toBeGreaterThanOrEqual(1); expect(t.six).toBeLessThanOrEqual(15);
      expect(t.start).toBe(t.whole - 1);
      const f = S().gen('frac2dec', i + 1).p;
      expect(f.num % 2).toBe(1); expect(f.num).toBeLessThan(f.den);
      const b = S().gen('bid', i + 1).p;
      expect(b.rate).toBeGreaterThanOrEqual(65); expect(b.rate).toBeLessThanOrEqual(95);
      expect(b.materials).toBeGreaterThanOrEqual(40); expect(b.materials).toBeLessThanOrEqual(400);
      const fl = S().gen('filler', i + 1).p;
      expect(Object.keys(EFF)).toContain(fl.proc);
    }
  });

  it('accepts the answer formats a welder writes', () => {
    const P = S().parse;
    expect(P('0.4375')).toBeCloseTo(0.4375, 12);
    expect(P('.44')).toBeCloseTo(0.44, 12);
    expect(P('7/16')).toBeCloseTo(0.4375, 12);
    expect(P('1-3/8')).toBeCloseTo(1.375, 12);
    expect(P('1 3/8')).toBeCloseTo(1.375, 12);
    expect(P('3-7/16 in')).toBeCloseTo(3.4375, 12);
    expect(P('9,5')).toBeCloseTo(9.5, 12);
    expect(P('$1,234.50', true)).toBeCloseTo(1234.5, 12);
    expect(P('1,234', true)).toBe(1234);
    expect(P('0,375')).toBeCloseTo(0.375, 12);
    expect(Number.isNaN(P('abc'))).toBe(true);
    expect(Number.isNaN(P('1/0'))).toBe(true);
    expect(Number.isNaN(P(''))).toBe(true);
    // an unparseable entry is not an attempt
    const pr = S().gen('frac2dec', 5);
    expect(S().checkMath(pr, 'seven sixteenths').valid).toBe(false);
  });

  it('gives fresh numbers after a reset (new base seed) and on "New numbers" (next round)', () => {
    let differ = 0, differRound = 0;
    for (const k of S().KINDS) {
      const ki = S().KINDS.indexOf(k);
      const a = S().gen(k, S().mixSeed(111, ki, 0));
      const b = S().gen(k, S().mixSeed(98765, ki, 0));
      const c = S().gen(k, S().mixSeed(111, ki, 1));
      if (JSON.stringify(a.p) !== JSON.stringify(b.p)) differ++;
      if (JSON.stringify(a.p) !== JSON.stringify(c.p)) differRound++;
      // same seed, same problem
      expect(S().gen(k, S().mixSeed(111, ki, 0)).p).toEqual(a.p);
    }
    expect(differ).toBeGreaterThanOrEqual(7);
    expect(differRound).toBeGreaterThanOrEqual(7);
  });
});

describe('SYM first-attempt scoring', () => {
  it('commit is final: a second commit on the same key changes nothing', () => {
    const a1 = S().commit({}, '0_0', 2);
    const a2 = S().commit(a1, '0_0', 1);
    expect(a2).toBe(a1);
    expect(a2['0_0']).toBe(2);
    expect(S().commit(a1, '0_1', 1)).toEqual({ '0_0': 2, '0_1': 1 });
  });
});

// ── Live mounts: click like a student ──
async function mount(initial) {
  document.body.innerHTML = '<div id="root"></div>';
  let latest = null;
  function App() {
    const [state, setState] = React.useState({ weldLab: initial });
    latest = state;
    const ctx = makeCtx({
      toolData: state,
      setToolData: setState,
      update: (tool, key, val) => setState((p) => Object.assign({}, p, { [tool]: Object.assign({}, p[tool] || {}, { [key]: val }) }))
    });
    return window.StemLab._registry.weldLab.render(ctx);
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(() => root.render(React.createElement(App)));
  return () => latest.weldLab;
}
function btn(label, scope) {
  const all = [...(scope || document).querySelectorAll('button')];
  const el = all.find((b) => (b.textContent || '').trim().indexOf(label) === 0);
  expect(el, 'no button starting with: ' + label).toBeTruthy();
  return el;
}
async function click(el) { await React.act(() => { el.click(); }); }
const text = () => document.getElementById('root').textContent;

describe('SYM decoder practice cannot be gamed', () => {
  it('scores the first committed answer only, and locks the options', async () => {
    const st = await mount({ view: 'symbolsReader', sr_view: 'practice', sym2_pr_idx: 0 });
    const q1 = document.querySelectorAll('[role="radiogroup"]')[0];
    const opts = [...q1.querySelectorAll('[role="radio"]')];
    // nothing is revealed on a pick before Check
    await click(opts[0]);
    expect(q1.textContent).not.toContain('✓ correct');
    expect(st().sym2_pr_ans || {}).toEqual({});
    // change your mind before checking: allowed
    await click(opts[2]);
    await click(opts[0]);
    await click(btn('Check answer', q1.parentNode));
    expect(st().sym2_pr_ans['0_0']).toBe(0);
    expect(text()).toContain('First-try score: 0 / 19');
    // the right answer is now shown, but clicking it changes nothing
    const after = [...document.querySelectorAll('[role="radiogroup"]')[0].querySelectorAll('[role="radio"]')];
    expect(after.every((b) => b.disabled)).toBe(true);
    await click(after[1]);
    expect(st().sym2_pr_ans['0_0']).toBe(0);
    expect(text()).toContain('First-try score: 0 / 19');
    expect(text()).toContain('Why A is not it');
    expect(text()).toContain('Why B is right');
    // a right first answer scores
    const q2 = document.querySelectorAll('[role="radiogroup"]')[1];
    await click(q2.querySelectorAll('[role="radio"]')[2]);
    await click(btn('Check answer', q2.parentNode));
    expect(text()).toContain('First-try score: 1 / 19');
  });

  it('restart practice clears the score', async () => {
    const st = await mount({ view: 'symbolsReader', sr_view: 'practice', sym2_pr_ans: { '0_0': 1, '0_1': 2 } });
    expect(text()).toContain('First-try score: 2 / 19');
    await click(btn('↺ Restart practice'));
    expect(text()).toContain('First-try score: 0 / 19');
    expect(st().sym2_pr_ans).toEqual({});
  });
});

describe('SYM Symbol Match quiz', () => {
  it('restart resets the score (it used to announce a reset and keep counting past 10/10)', async () => {
    const st = await mount({ view: 'mathBlueprint', mb_mode: 'quiz', mb_q_idx: 9, mb_q_score: 7, mb_q_picked: 0 });
    expect(text()).toContain('Score: 7 / 10');
    await click(btn('See results'));
    expect(text()).toContain('Quiz finished: 7 of 10');
    await click(btn('↺ Restart quiz'));
    expect(text()).toContain('Question 1 of 10');
    expect(text()).toContain('Score: 0 / 10');
    expect(st().mb_q_score).toBe(0);
    expect(st().mb_q_idx).toBe(0);
  });

  it('needs a Check and then ignores later clicks', async () => {
    const st = await mount({ view: 'mathBlueprint', mb_mode: 'quiz' });
    const group = document.querySelector('[role="radiogroup"]');
    const opts = [...group.querySelectorAll('[role="radio"]')];
    await click(opts[0]);
    expect(st().mb_q_picked == null).toBe(true);
    await click(btn('Check answer'));
    expect(st().mb_q_picked).toBe(0);
    expect(text()).toContain('Score: 0 / 10');
    await click([...document.querySelector('[role="radiogroup"]').querySelectorAll('[role="radio"]')][3]);
    expect(st().mb_q_picked).toBe(0);
    expect(text()).toContain('Score: 0 / 10');
  });
});

describe('SYM checked math practice', () => {
  it('scores only the first check of each problem and reveals the worked solution after an attempt', async () => {
    const st = await mount({ view: 'mathBlueprint', mb_mode: 'practice', sym2_m_seed: 4242 });
    const card = document.querySelector('[data-sym2-math="frac2dec"]');
    const pr = S().gen('frac2dec', S().mixSeed(4242, 0, 0));
    const input = card.querySelector('input');
    const setVal = async (v) => React.act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, v);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(card.textContent).not.toContain('Worked solution');
    await setVal(String(pr.answer + 0.25));
    await click(btn('Check answer', card));
    expect(st().sym2_m_tries).toBe(1);
    expect(st().sym2_m_score || 0).toBe(0);
    await click(btn('Show the worked solution', document.querySelector('[data-sym2-math="frac2dec"]')));
    expect(document.querySelector('[data-sym2-math="frac2dec"]').textContent).toContain('Worked solution');
    // now the right answer: no score for a second try
    await setVal(String(pr.answer));
    await click(btn('Check answer', document.querySelector('[data-sym2-math="frac2dec"]')));
    expect(st().sym2_m_tries).toBe(1);
    expect(st().sym2_m_score || 0).toBe(0);
    expect(document.querySelector('[data-sym2-math="frac2dec"]').textContent).toContain('✓ Correct');
    // a fresh problem answered right first time scores and builds a streak
    const pr2 = S().gen('frac2mm', S().mixSeed(4242, 1, 0));
    const card2 = document.querySelector('[data-sym2-math="frac2mm"]');
    const in2 = card2.querySelector('input');
    await React.act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(in2, pr2.answer.toFixed(2));
      in2.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await click(btn('Check answer', card2));
    expect(st().sym2_m_score).toBe(1);
    expect(st().sym2_m_streak).toBe(1);
    expect(st().sym2_m_tries).toBe(2);
    // reset clears score and changes the numbers
    await click(btn('↺ New numbers + reset score'));
    expect(st().sym2_m_score).toBe(0);
    expect(st().sym2_m_tries).toBe(0);
    expect(st().sym2_m_seed).not.toBe(4242);
  });

  it('shows hints on request', async () => {
    await mount({ view: 'mathBlueprint', mb_mode: 'practice', sym2_m_seed: 9 });
    const card = () => document.querySelector('[data-sym2-math="plateWeight"]');
    await click(btn('Hint 1 of 2', card()));
    expect(card().textContent).toContain('Volume = length × width × thickness');
    await click(btn('Hint 2 of 2', card()));
    expect(card().textContent).toContain('Weight = volume × 0.2836');
  });
});

describe('SYM Symbol Builder', () => {
  it('checks a correct build on the first try and records it', async () => {
    const st = await mount({ view: 'symbolsReader', sr_view: 'builder', sym2_b_idx: 0 });
    await click(btn('Fillet weld'));
    await click(btn('Arrow side (below the line)'));
    await click(btn('1/4'));
    await click(btn('Check my symbol'));
    expect(text()).toContain('Matches the spec on the first check');
    expect(st().sym2_b_res).toEqual({ b1: 1 });
  });
  it('does not let an unchosen side default its way to a pass', async () => {
    const st = await mount({ view: 'symbolsReader', sr_view: 'builder', sym2_b_idx: 0 });
    await click(btn('Fillet weld'));
    await click(btn('1/4'));
    await click(btn('Check my symbol'));
    expect(document.getElementById('sym2-b-fb').textContent).toContain('Side: the order needs Arrow side (below the line); you have not chosen.');
    expect(st().sym2_b_res || {}).toEqual({});
  });
  it('names the wrong field and its fix', async () => {
    const st = await mount({ view: 'symbolsReader', sr_view: 'builder', sym2_b_idx: 1 });
    await click(btn('Fillet weld'));
    await click(btn('Arrow side (below the line)'));
    await click(btn('5/16'));
    await click(btn('Check my symbol'));
    const fb = document.getElementById('sym2-b-fb');
    expect(fb.textContent).toContain('1 fields do not match');
    expect(fb.textContent).toContain('Side: the order needs Other side (above the line); you have Arrow side (below the line).');
    expect(st().sym2_b_res || {}).toEqual({});
    await click(btn('Other side (above the line)'));
    await click(btn('Check my symbol'));
    expect(st().sym2_b_res).toEqual({ b2: 2 });
  });
});

describe('SYM quiz banks are balanced', () => {
  const BS = String.fromCharCode(92);
  function elements(s, start) {
    let d = 0, q = null, els = [], cur = '', began = false;
    for (let i = start; i < s.length; i++) {
      const c = s[i];
      if (q) { cur += c; if (c === BS) { cur += s[++i]; continue; } if (c === q) q = null; continue; }
      if (c === "'" || c === '"') { q = c; cur += c; continue; }
      if (c === '[' || c === '{' || c === '(') { d++; if (d === 1 && c === '[' && !began) { began = true; continue; } cur += c; continue; }
      if (c === ']' || c === '}' || c === ')') { d--; if (d === 0 && c === ']') { if (cur.trim()) els.push(cur); return { els, end: i }; } cur += c; continue; }
      if (c === ',' && d === 1) { els.push(cur); cur = ''; continue; }
      cur += c;
    }
    return null;
  }
  function bank(src, from, to) {
    const a = src.indexOf(from), b = src.indexOf(to, a);
    expect(a).toBeGreaterThan(-1); expect(b).toBeGreaterThan(a);
    const seg = src.slice(a, b);
    const re = /(opts|choices|options)(\s*:\s*)\[/g;
    const out = [];
    let m;
    while ((m = re.exec(seg))) {
      const p = elements(seg, m.index + m[0].length - 1);
      const k = /\b(correct|answer)(\s*:\s*)(\d+)/.exec(seg.slice(p.end, p.end + 260));
      if (!k) continue;
      const texts = p.els.map((e) => { const t = /'((?:[^'\\]|\\.)*)'\s*\)\s*$/.exec(e.trim()); return t ? t[1] : e.trim(); });
      out.push({ n: p.els.length, idx: Number(k[3]), texts });
    }
    return out;
  }
  const check = (qs, label) => {
    const four = qs.filter((q) => q.n === 4);
    expect(four.length, label).toBe(qs.length);
    const c = [0, 0, 0, 0];
    four.forEach((q) => c[q.idx]++);
    c.forEach((x, i) => expect(x, label + ' slot ' + 'ABCD'[i] + ' unused (' + c.join('/') + ')').toBeGreaterThan(0));
    expect(Math.max(...c) / four.length, label + ' ' + c.join('/')).toBeLessThanOrEqual(0.35);
    const longest = four.filter((q) => { const L = q.texts.map((t) => t.length); return L[q.idx] === Math.max(...L) && L.filter((x) => x === L[q.idx]).length === 1; }).length;
    expect(longest / four.length, label + ' correct option is the longest too often').toBeLessThanOrEqual(0.4);
    return c;
  };
  it('decoder practice + blueprint, and the Symbol Match quiz', () => {
    const src = read();
    const practice = bank(src, 'var SYMBOL_CHALLENGES = [', 'var SYM2_BUILD_ITEMS = [');
    const bp = bank(src, 'var SYM2_BP_CALLOUTS = [', 'function sym2PlaceCallout');
    expect(practice.length).toBe(19);
    expect(bp.length).toBe(4);
    check(practice.concat(bp), 'symbols reader');
    const quiz = bank(src, 'var symbolQuestions = [', 'function renderSymbolViz');
    expect(quiz.length).toBe(10);
    // The repo test (stem_position_bias_fixes_wave2) allows 60%; keep the authored 3/2/2/3 spread.
    const c = [0, 0, 0, 0];
    quiz.forEach((q) => c[q.idx]++);
    expect(c).toEqual([3, 2, 2, 3]);
  });
  it('every option list carries a per-option explanation', () => {
    const src = read();
    const seg = src.slice(src.indexOf('var SYMBOL_CHALLENGES = ['), src.indexOf('function sym2PlaceCallout'));
    expect((seg.match(/whyNot: \[/g) || []).length).toBe(23);
    const quiz = src.slice(src.indexOf('var symbolQuestions = ['), src.indexOf('function renderSymbolViz'));
    expect((quiz.match(/whyNot: \[/g) || []).length).toBe(10);
  });
});

describe('SYM treats saved state as untrusted', () => {
  const hostile = [
    { view: 'symbolsReader', sr_view: 42 },
    { view: 'symbolsReader', sr_view: { a: 1 } },
    { view: 'symbolsReader', sr_view: 'practice', sym2_pr_idx: 'abc', sym2_pr_ans: { '0_0': 99, '9_9': 1, x: 2, '0_1': 'b', '1_0': 1.5 } },
    { view: 'symbolsReader', sr_view: 'practice', sym2_pr_idx: 1e9, sym2_pr_ans: [1, 2, 3] },
    { view: 'symbolsReader', sr_view: 'practice', sym2_pr_ans: 'oops' },
    { view: 'symbolsReader', sr_view: 'builder', sym2_b_idx: -4, sym2_b_res: { b1: 'x', zz: 1, b2: 2 } },
    { view: 'symbolsReader', sr_view: 'builder', sym2_b_idx: 'NaN', sym2_b_res: null },
    { view: 'symbolsReader', sr_view: 'blueprint', sym2_bp_ans: { c1: 7, c2: -1, c9: 0 } },
    { view: 'symbolsReader', sr_view: 'library', sym2_lib_side: 7 },
    { view: 'mathBlueprint', mb_sect: { x: 1 }, mb_mode: 5 },
    { view: 'mathBlueprint', mb_mode: 'quiz', mb_q_idx: 'abc', mb_q_score: 'NaN', mb_q_picked: 'abc' },
    { view: 'mathBlueprint', mb_mode: 'quiz', mb_q_idx: 999, mb_q_score: 1e9, mb_q_picked: 9 },
    { view: 'mathBlueprint', mb_mode: 'quiz', mb_q_idx: -1, mb_q_picked: { a: 1 } },
    { view: 'mathBlueprint', mb_mode: 'practice', sym2_m_seed: 'x', sym2_m_rounds: 'x', sym2_m_score: 'lots', sym2_m_tries: -9, sym2_m_streak: {}, sym2_m_best: [] },
    { view: 'mathBlueprint', mb_mode: 'practice', sym2_m_seed: -1, sym2_m_rounds: { frac2dec: -3, bogus: 2, tape: 1.5, brace: 'z' } },
    { view: 'mathBlueprint', mb_sect: 'estimate', sym2_m_rounds: [1, 2] }
  ];
  hostile.forEach((st) => {
    it('mounts with ' + JSON.stringify(st), () => {
      const errs = [];
      const orig = console.error;
      console.error = (...a) => errs.push(a.map(String).join(' '));
      let html = '';
      try { html = renderTool('weldLab', { weldLab: st }); } finally { console.error = orig; }
      expect(errs.join('\n')).toBe('');
      expect(html.length).toBeGreaterThan(3000);
      expect(html).not.toMatch(/NaN|undefined/);
    });
  });
  it('clamps what a hostile file can make the quiz claim', () => {
    const html = renderTool('weldLab', { weldLab: { view: 'mathBlueprint', mb_mode: 'quiz', mb_q_idx: 999, mb_q_score: 1e9 } });
    expect(html).toContain('Question 1 of 10');
    expect(html).toContain('Score: 10 / 10');
    const html2 = renderTool('weldLab', { weldLab: { view: 'symbolsReader', sr_view: 'practice', sym2_pr_ans: { '0_0': 99, '0_1': 2, '__proto__': 1 } } });
    expect(html2).toContain('First-try score: 1 / 19');
    // an out-of-range saved answer must not lock question 1 as "answered wrong"
    expect(html2).toContain('Right on the first try');
    expect(html2).not.toContain('Not this time');
  });
});

describe('SYM new views render', () => {
  const views = [
    [{ view: 'symbolsReader', sr_view: 'library' }, ['Modifiers, dimensions and the tail', 'Memory hooks']],
    [{ view: 'symbolsReader', sr_view: 'builder' }, ['Work order 1 of 10', 'Check my symbol']],
    [{ view: 'symbolsReader', sr_view: 'practice' }, ['First-try score: 0 / 19', 'Check answer']],
    [{ view: 'symbolsReader', sr_view: 'blueprint' }, ['Mini blueprint: bracket BRKT-01', 'Symbol 4']],
    [{ view: 'mathBlueprint', mb_mode: 'practice' }, ['Checked practice: all nine problem types', 'Bid a small job']],
    [{ view: 'mathBlueprint', mb_sect: 'measure' }, ['about 1/64" (about 0.5 mm)', 'Read the tape']],
    [{ view: 'mathBlueprint', mb_sect: 'estimate' }, ['ft of weld per paid hour', 'Filler metal to buy']],
    [{ view: 'mathBlueprint', mb_sect: 'symbols' }, ['rectangle = plug/slot, circle = spot']]
  ];
  views.forEach(([st, want]) => {
    it(JSON.stringify(st), () => {
      const html = renderTool('weldLab', { weldLab: st });
      want.forEach((w) => expect(html).toContain(w.replace(/"/g, '&quot;')));
    });
  });
  it('drops the corrected facts', () => {
    const src = read();
    const m20 = src.slice(src.indexOf('function MathBlueprintLab()'), src.indexOf('MODULE 21:'));
    expect(m20).not.toContain('circle = plug/slot');
    expect(m20).not.toContain('in/min of weld per hour');
    expect(m20).not.toContain('beads side-by-side');
    expect(m20).not.toMatch(/Bridge cam gauge'[^}]*0\.001/);
    expect(m20).not.toContain('60° bevel angle');
    expect(m20).not.toContain('⌶');
    // the derived rate table is computed: 8 in/min at 35% = 14 ft per paid hour
    const html = renderTool('weldLab', { weldLab: { view: 'mathBlueprint', mb_sect: 'estimate' } });
    expect(html).toContain('Arc travel 8-15 in/min · operating factor about 35% · about 14-26 ft of weld per paid hour');
  });
});
