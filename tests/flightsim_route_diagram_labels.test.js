import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * The briefing route diagram must not print an airport code on top of the two
 * fixed things in its frame: the heading/ETE readout (bottom-left) and the
 * north rose (top-right).
 *
 * The labels were clamped into the frame but never checked against that
 * furniture, and the clamps pushed them straight into it. 19 of the 90
 * selectable airport pairs (21%) collided — including EVERY route to or from
 * LHR and HND, the two long-haul legs a student is most likely to pick.
 * JFK -> LHR printed "JFK" across "051° / 1471 min" and clipped "LHR" against
 * the north arrow.
 *
 * This reimplements the component's placement over every ordered pair, because
 * the defect only appears for particular geometry: the default PWM -> JFK route
 * cleared the readout by 40px and looked perfectly fine throughout.
 */
const SRC = 'stem_lab/stem_tool_flightsim.js';
const src = readFileSync(SRC, 'utf8');

const arrayBlock = (name) => {
  const start = src.indexOf(`var ${name} = [`);
  if (start < 0) return '';
  let depth = 0;
  for (let i = src.indexOf('[', start); i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') { depth--; if (!depth) return src.slice(start, i + 1); }
  }
  return '';
};

const waypoints = () => {
  const block = arrayBlock('WAYPOINTS');
  const out = [];
  const re = /\{[^{}]*?code:\s*'([A-Z0-9]{3,4})'[^{}]*?\}/g;
  let m;
  while ((m = re.exec(block))) {
    const lat = /lat:\s*(-?[\d.]+)/.exec(m[0]);
    const lon = /lon:\s*(-?[\d.]+)/.exec(m[0]);
    if (lat && lon) out.push({ code: m[1], lat: +lat[1], lon: +lon[1] });
  }
  return out;
};

// Mirrors the component: great-circle samples, uniform scale, north up.
const endpoints = (dep, dest) => {
  const toRad = Math.PI / 180;
  const la1 = dep.lat * toRad, lo1 = dep.lon * toRad;
  const la2 = dest.lat * toRad, lo2 = dest.lon * toRad;
  const cosSig = Math.sin(la1) * Math.sin(la2) + Math.cos(la1) * Math.cos(la2) * Math.cos(lo2 - lo1);
  const sigma = Math.acos(Math.max(-1, Math.min(1, cosSig)));
  const S = 48;
  const lonScale = Math.max(0.15, Math.cos(la1));
  let prevLon = dep.lon;
  const pts = [];
  for (let gi = 0; gi <= S; gi++) {
    const f = gi / S;
    let A, B;
    if (sigma < 1e-6) { A = 1 - f; B = f; }
    else { A = Math.sin((1 - f) * sigma) / Math.sin(sigma); B = Math.sin(f * sigma) / Math.sin(sigma); }
    const gx = A * Math.cos(la1) * Math.cos(lo1) + B * Math.cos(la2) * Math.cos(lo2);
    const gy = A * Math.cos(la1) * Math.sin(lo1) + B * Math.cos(la2) * Math.sin(lo2);
    const gz = A * Math.sin(la1) + B * Math.sin(la2);
    const pLat = Math.atan2(gz, Math.sqrt(gx * gx + gy * gy)) / toRad;
    let pLon = Math.atan2(gy, gx) / toRad;
    while (pLon - prevLon > 180) pLon -= 360;
    while (pLon - prevLon < -180) pLon += 360;
    prevLon = pLon;
    pts.push([(pLon - dep.lon) * lonScale, pLat - dep.lat]);
  }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0];
    if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1];
  }
  const spanX = maxX - minX, spanY = maxY - minY;
  let scale = Math.min(spanX > 1e-6 ? 286 / spanX : Infinity, spanY > 1e-6 ? 92 / spanY : Infinity);
  if (!isFinite(scale)) scale = 1;
  const midX = (minX + maxX) / 2, midY = (minY + maxY) / 2;
  const px = (p) => 180 + (p[0] - midX) * scale;
  const py = (p) => 82 - (p[1] - midY) * scale;
  return { x1: px(pts[0]), y1: py(pts[0]), x2: px(pts[S]), y2: py(pts[S]) };
};

const HDG_BOX = { x0: 8, x1: 104, y0: 128, y1: 152 };
const ROSE_BOX = { x0: 318, x1: 350, y0: 14, y1: 52 };
const lab = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const halfWidth = (code) => code.length * 4.4 + 3;
const hitsBox = (cx, cy, code, box) => {
  const hw = halfWidth(code);
  return (cx - hw) < box.x1 && box.x0 < (cx + hw) && (cy - 11) < box.y1 && box.y0 < (cy + 4);
};
const place = (x, y, below, code) => {
  const cands = [
    { x: lab(x, 26, 334), y: lab(y + (below ? 21 : -11), 20, 146) },
    { x: lab(x, 26, 334), y: lab(y + (below ? -11 : 21), 20, 146) },
    { x: lab(x, 118, 334), y: lab(y + (below ? 21 : -11), 20, 146) },
    { x: lab(x, 26, 306), y: lab(y + (below ? 21 : -11), 20, 146) },
    { x: lab(x, 26, ROSE_BOX.x0 - halfWidth(code) - 2), y: lab(y + (below ? 21 : -11), 20, 146) },
    { x: lab(x, 26, ROSE_BOX.x0 - halfWidth(code) - 2), y: lab(y + (below ? -11 : 21), 20, 146) },
  ];
  for (const c of cands) {
    if (!hitsBox(c.x, c.y, code, HDG_BOX) && !hitsBox(c.x, c.y, code, ROSE_BOX)) return c;
  }
  return cands[0];
};

const boxOf = (p, code) => ({
  x0: p.x - halfWidth(code), x1: p.x + halfWidth(code), y0: p.y - 11, y1: p.y + 4,
});
const overlap = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

const allPairs = () => {
  const wps = waypoints();
  const out = [];
  for (const a of wps) for (const b of wps) {
    if (a === b) continue;
    const g = endpoints(a, b);
    out.push({
      a, b,
      dep: place(g.x1, g.y1, g.y1 >= g.y2, a.code),
      dest: place(g.x2, g.y2, g.y2 > g.y1, b.code),
    });
  }
  return out;
};

describe('flightsim briefing route diagram labels', () => {
  const wps = waypoints();
  const pairs = allPairs();

  it('reads the real airport list (an empty list would check nothing)', () => {
    expect(wps.length, 'WAYPOINTS did not parse — every assertion below is vacuous')
      .toBeGreaterThanOrEqual(10);
    expect(pairs.length).toBe(wps.length * (wps.length - 1));
  });

  it('never prints an airport code on the heading readout or the north rose', () => {
    const bad = [];
    for (const p of pairs) {
      for (const [who, pos, code] of [['dep', p.dep, p.a.code], ['dest', p.dest, p.b.code]]) {
        if (hitsBox(pos.x, pos.y, code, HDG_BOX)) bad.push(`${p.a.code}->${p.b.code}: ${who} ${code} on the heading/ETE readout`);
        if (hitsBox(pos.x, pos.y, code, ROSE_BOX)) bad.push(`${p.a.code}->${p.b.code}: ${who} ${code} on the north rose`);
      }
    }
    expect(bad, 'a code printed over the readout makes both unreadable').toEqual([]);
  });

  it('never stacks the two airport codes on each other', () => {
    // Moving a label off the readout and onto its partner relocates the defect
    // rather than fixing it.
    const bad = pairs
      .filter((p) => overlap(boxOf(p.dep, p.a.code), boxOf(p.dest, p.b.code)))
      .map((p) => `${p.a.code}->${p.b.code}`);
    expect(bad, 'the two codes overlap each other').toEqual([]);
  });

  it('keeps every label inside the frame', () => {
    const bad = [];
    for (const p of pairs) {
      for (const [pos, code] of [[p.dep, p.a.code], [p.dest, p.b.code]]) {
        const b = boxOf(pos, code);
        if (b.x0 < 8 || b.x1 > 352 || b.y0 < 8 || b.y1 > 152) {
          bad.push(`${p.a.code}->${p.b.code}: ${code} clipped at the frame edge`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
