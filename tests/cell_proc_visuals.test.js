// Cell Processes mode (lane PROC): pathway maps + organelle deep dives.
// Gates measure the SVG the tool actually emits (SSR render through the smoke harness),
// so a label moved on top of another, out of the frame, or onto a low-contrast fill fails here.
import { beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const req = createRequire(resolve(process.cwd(), 'tests/_x.js'));
const React = req('../desktop/web-app/node_modules/react');
const { createRoot } = req('../desktop/web-app/node_modules/react-dom/client');
const { flushSync } = req('../desktop/web-app/node_modules/react-dom');

const PROCESS_IDS = ['respiration', 'krebs', 'etc', 'photosynthesis', 'transport', 'protein'];
let H;
let P;
const cache = new Map();

beforeAll(async () => {
  H = await import(pathToFileURL(resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js')).href);
  H.resetStemLab();
  H.loadTool('stem_lab/stem_tool_cell.js', 'cell');
  P = window.__alloCellProc;
}, 120000);

function renderProcesses(cell) {
  const key = JSON.stringify(cell);
  if (!cache.has(key)) {
    H.resetStemLab();
    H.loadTool('stem_lab/stem_tool_cell.js', 'cell');
    cache.set(key, H.renderTool('cell', { cell: Object.assign({ mode: 'processes' }, cell) }));
  }
  const host = document.createElement('div');
  host.innerHTML = cache.get(key);
  return host;
}

// Helvetica-Bold advance widths (per 1000 em) - a conservative stand-in for the app's bold UI font.
const W = { ' ': 278, '!': 333, '.': 278, ',': 278, '-': 333, '+': 584, '(': 333, ')': 333, '/': 278, ':': 333, '=': 584, '%': 889, '’': 278, '·': 278, '•': 350, '→': 1000, '≈': 584, '–': 556, '↔': 1000, '☀': 900, 'α': 600, '❚': 400 };
'ABCDHKNRUV'.split('').forEach((c) => { W[c] = 722; });
Object.assign(W, { E: 667, F: 611, G: 778, I: 278, J: 556, L: 611, M: 833, O: 778, P: 667, Q: 778, S: 667, T: 611, W: 944, X: 667, Y: 667, Z: 611 });
Object.assign(W, { a: 556, b: 611, c: 556, d: 611, e: 556, f: 333, g: 611, h: 611, i: 278, j: 278, k: 556, l: 278, m: 889, n: 611, o: 611, p: 611, q: 611, r: 389, s: 556, t: 333, u: 611, v: 556, w: 778, x: 556, y: 556, z: 500 });
'0123456789'.split('').forEach((c) => { W[c] = 556; });
'₂₆⁺⁻'.split('').forEach((c) => { W[c] = 420; });
function textWidth(str, fs, ls) {
  let w = 0;
  for (const ch of str) w += (W[ch] || 650);
  return (w / 1000) * fs * 1.04 + (ls || 0) * Math.max(0, [...str].length - 1);
}
function fontSize(el, emBase) {
  const raw = el.getAttribute('font-size');
  if (/em$/.test(raw)) return parseFloat(raw) * emBase;
  return parseFloat(raw);
}
function textBoxes(svg, emBase) {
  return [...svg.querySelectorAll('text')].map((t) => {
    const fs = fontSize(t, emBase);
    const w = textWidth(t.textContent, fs, parseFloat(t.getAttribute('letter-spacing') || '0'));
    const x = parseFloat(t.getAttribute('x'));
    const y = parseFloat(t.getAttribute('y'));
    const anchor = t.getAttribute('text-anchor') || 'start';
    const x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
    return { el: t, text: t.textContent, x0, x1: x0 + w, y0: y - 0.72 * fs, y1: y + 0.2 * fs };
  });
}
function viewBox(svg) { return svg.getAttribute('viewBox').split(/\s+/).map(Number); }
function layoutProblems(svg, emBase) {
  const [vx, vy, vw, vh] = viewBox(svg);
  const name = svg.getAttribute('aria-labelledby').split(' ')[0] + (emBase ? '@' + emBase : '');
  const boxes = textBoxes(svg, emBase);
  const out = [];
  boxes.forEach((b) => {
    if (b.x0 < vx - 0.5 || b.x1 > vx + vw + 0.5 || b.y0 < vy - 0.5 || b.y1 > vy + vh + 0.5) out.push(name + ' clipped: "' + b.text + '" ' + [b.x0, b.y0, b.x1, b.y1].map((v) => v.toFixed(1)).join(','));
  });
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]; const c = boxes[j];
      const ox = Math.min(a.x1, c.x1) - Math.max(a.x0, c.x0);
      const oy = Math.min(a.y1, c.y1) - Math.max(a.y0, c.y0);
      if (ox > 0.5 && oy > 0.5) out.push(name + ' overlap: "' + a.text + '" / "' + c.text + '"');
    }
  }
  svg.querySelectorAll('[data-cp-leader]').forEach((g) => {
    const v = g.getAttribute('data-cp-leader').split(' ').map(Number);
    for (let s = 0.15; s <= 0.951; s += 0.05) {
      const px = v[0] + (v[2] - v[0]) * s; const py = v[1] + (v[3] - v[1]) * s;
      boxes.forEach((b) => { if (px > b.x0 - 1 && px < b.x1 + 1 && py > b.y0 - 1 && py < b.y1 + 1) out.push(name + ' leader ' + v.join(',') + ' crosses "' + b.text + '"'); });
    }
  });
  return [...new Set(out)];
}
function diveFontBases() {
  const css = P.CELL_PROC_CSS;
  const desk = css.match(/\.cp-dd svg\{font-size:([\d.]+)px\}/);
  const phone = css.match(/max-width:\d+px\)\{[^{}]*\.cp-dd svg\{font-size:([\d.]+)px\}/);
  expect(desk, 'desktop label size rule').toBeTruthy();
  expect(phone, 'narrow-container label size rule').toBeTruthy();
  return [parseFloat(desk[1]), parseFloat(phone[1])];
}

// --- colour helpers (WCAG relative luminance, alpha compositing) ---
function hex(c) { const m = /^#([0-9a-f]{6})$/i.exec(c || ''); return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : null; }
function lum(rgb) { return rgb.map((v) => v / 255).map((v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0); }
function ratio(a, b) { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); }
function over(top, alpha, under) { return top.map((v, i) => v * alpha + under[i] * (1 - alpha)); }
function paintColours(svg, fill) {
  const ref = /^url\(#(.+)\)$/.exec(fill || '');
  if (!ref) { const c = hex(fill); return c ? [c] : []; }
  const def = svg.querySelector('[id="' + ref[1] + '"]');
  if (!def) return [];
  if (def.tagName.toLowerCase() === 'pattern') return [...def.querySelectorAll('rect,circle')].map((s) => hex(s.getAttribute('fill'))).filter(Boolean);
  return [...def.querySelectorAll('stop')].map((s) => hex(s.getAttribute('stop-color'))).filter(Boolean);
}
function contains(shape, x, y) {
  const tag = shape.tagName.toLowerCase();
  const n = (a) => parseFloat(shape.getAttribute(a) || '0');
  if (tag === 'rect') return x >= n('x') && x <= n('x') + n('width') && y >= n('y') && y <= n('y') + n('height');
  if (tag === 'circle') return Math.hypot(x - n('cx'), y - n('cy')) <= n('r');
  if (tag === 'ellipse') return Math.pow((x - n('cx')) / n('rx'), 2) + Math.pow((y - n('cy')) / n('ry'), 2) <= 1;
  return false;
}
function contrastProblems(svg, emBase) {
  const shapes = [...svg.querySelectorAll('rect,circle,ellipse')].filter((s) => !s.closest('defs,pattern,clipPath,marker,filter,mask') && s.getAttribute('fill') && s.getAttribute('fill') !== 'none' && !s.getAttribute('class'));
  const name = svg.getAttribute('aria-labelledby').split(' ')[0];
  const out = [];
  textBoxes(svg, emBase).forEach((b) => {
    const ink = hex(b.el.getAttribute('fill'));
    if (!ink) { out.push(name + ' text without a solid fill: "' + b.text + '"'); return; }
    const cx = (b.x0 + b.x1) / 2; const cy = (b.y0 + b.y1) / 2;
    let grounds = [[2, 6, 23]];
    shapes.forEach((s) => {
      if (!contains(s, cx, cy)) return;
      const cols = paintColours(svg, s.getAttribute('fill'));
      if (!cols.length) return;
      const alpha = parseFloat(s.getAttribute('fill-opacity') || '1') * parseFloat(s.getAttribute('opacity') || '1');
      const next = [];
      grounds.forEach((g) => cols.forEach((c) => next.push(over(c, alpha, g))));
      grounds = next.slice(0, 64);
    });
    const worst = Math.min(...grounds.map((g) => ratio(ink, g)));
    if (worst < 4.5) out.push(name + ' "' + b.text + '" ' + worst.toFixed(2) + ':1');
  });
  return out;
}

describe('Cell Processes pathway maps', () => {
  it('keeps every label inside the frame and apart from the others, at every Focus lens stage', () => {
    const problems = [];
    let checked = 0;
    PROCESS_IDS.forEach((id) => {
      for (let f = 0; f < 4; f++) {
        const svg = renderProcesses({ cellProcess: id, cellProcessStep: f }).querySelector('svg[data-cell-proc-map="' + id + '"]');
        expect(svg, id + ' map').toBeTruthy();
        checked += svg.querySelectorAll('text').length;
        problems.push(...layoutProblems(svg, 0));
      }
    });
    expect(checked).toBeGreaterThan(600);
    expect(problems).toEqual([]);
  });

  it('shows the Focus lens in the map: one filled badge and a halo for the focused stage only', () => {
    PROCESS_IDS.forEach((id) => {
      for (let f = 0; f < 4; f++) {
        const svg = renderProcesses({ cellProcess: id, cellProcessStep: f }).querySelector('svg[data-cell-proc-map="' + id + '"]');
        const badges = [...svg.querySelectorAll('[data-cp-badge]')];
        expect(badges.map((b) => b.getAttribute('data-cp-badge')), id).toEqual(['1', '2', '3', '4']);
        const lit = badges.filter((b) => b.querySelector('circle').getAttribute('fill') === '#fde047');
        expect(lit.map((b) => b.getAttribute('data-cp-badge')), id + ' stage ' + f).toEqual([String(f + 1)]);
        expect(svg.querySelectorAll('[data-cp-halo]').length, id + ' stage ' + f + ' halo').toBeGreaterThan(0);
        expect(svg.getAttribute('data-cell-proc-focus')).toBe(String(f));
      }
    });
  });

  it('keeps map text at 4.5:1 or better against the fills beneath it', () => {
    const problems = [];
    PROCESS_IDS.forEach((id) => {
      const svg = renderProcesses({ cellProcess: id, cellProcessStep: 1 }).querySelector('svg[data-cell-proc-map="' + id + '"]');
      problems.push(...contrastProblems(svg, 0));
    });
    expect(problems).toEqual([]);
  });

  it('shows numbers that agree with each other (Krebs per turn vs per glucose, ATP budget)', () => {
    const krebs = renderProcesses({ cellProcess: 'krebs' });
    const svg = krebs.querySelector('svg[data-cell-proc-map="krebs"]');
    const read = (pred) => {
      const out = {};
      [...svg.querySelectorAll('text')].filter((t) => pred(parseFloat(t.getAttribute('x')), parseFloat(t.getAttribute('y')))).forEach((t) => {
        const m = /^(\d+) (CO₂|NADH|FADH₂|ATP\/GTP)$/.exec(t.textContent);
        if (m) out[m[2]] = Number(m[1]);
      });
      return out;
    };
    const perGlucose = read((x, y) => x >= 570 && y <= 102);
    const perTurn = read((x, y) => x <= 152 && y >= 330);
    expect(Object.keys(perTurn).sort()).toEqual(['ATP/GTP', 'CO₂', 'FADH₂', 'NADH']);
    Object.keys(perTurn).forEach((k) => expect(perGlucose[k], k).toBe(perTurn[k] * 2));
    expect(krebs.textContent).toContain('2 acetyl-CoA → ' + perGlucose['CO₂'] + ' CO₂ + ' + perGlucose.NADH + ' NADH + ' + perGlucose['FADH₂'] + ' FADH₂ + ' + perGlucose['ATP/GTP'] + ' ATP/GTP (per glucose)');

    const resp = renderProcesses({ cellProcess: 'respiration' }).querySelector('svg[data-cell-proc-map="respiration"]');
    const chips = [...resp.querySelectorAll('text')].map((t) => t.textContent).filter((s) => /ATP$/.test(s) && /\d/.test(s));
    const ranges = chips.map((s) => { const m = /(\d+)(?:–(\d+))? ATP$/.exec(s); return [Number(m[1]), Number(m[2] || m[1])]; });
    expect(ranges.length).toBe(3);
    const lo = ranges.reduce((s, r) => s + r[0], 0); const hi = ranges.reduce((s, r) => s + r[1], 0);
    expect(resp.textContent).toContain('Total ≈ ' + lo + '–' + hi + ' ATP per glucose');
  });
});

describe('Cell Processes organelle deep dives', () => {
  it('keeps labels apart, inside the frame, and clear of leader lines at desktop and phone label sizes', () => {
    const bases = diveFontBases();
    expect(bases[1]).toBeGreaterThan(bases[0]);
    const page = renderProcesses({});
    const svgs = [...page.querySelectorAll('[data-cell-proc-dive] svg[role="img"]')];
    expect(svgs.length).toBe(6);
    const problems = [];
    bases.forEach((base) => svgs.forEach((svg) => problems.push(...layoutProblems(svg, base))));
    expect(problems).toEqual([]);
  });

  it('keeps deep-dive text at 4.5:1 or better against the fills beneath it', () => {
    const page = renderProcesses({});
    const problems = [];
    page.querySelectorAll('[data-cell-proc-dive] svg[role="img"]').forEach((svg) => problems.push(...contrastProblems(svg, 12)));
    expect(problems).toEqual([]);
  });

  it('gives every figure an accessible name and a substantive description with unique ids', () => {
    PROCESS_IDS.forEach((id) => {
      const page = renderProcesses({ cellProcess: id });
      const figs = [...page.querySelectorAll('svg[role="img"]')];
      expect(figs.length).toBe(7);
      const ids = [...page.querySelector('[data-cell-processes-workspace]').querySelectorAll('[id]')].map((el) => el.id);
      expect(ids.length, 'duplicate ids').toBe(new Set(ids).size);
      figs.forEach((svg) => {
        const [titleId, descId] = svg.getAttribute('aria-labelledby').split(' ');
        const title = page.querySelector('[id="' + titleId + '"]');
        const desc = page.querySelector('[id="' + descId + '"]');
        expect(title && title.tagName.toLowerCase(), titleId).toBe('title');
        expect(desc && desc.tagName.toLowerCase(), descId).toBe('desc');
        expect(title.parentNode).toBe(svg);
        expect(title.textContent.length, titleId).toBeGreaterThan(12);
        expect(desc.textContent.length, descId).toBeGreaterThan(160);
      });
    });
  });

  it('walks the stages with Back/Next/step buttons, pauses motion, and recovers malformed state', () => {
    const dive = P.CELL_PROC_DIVES.find((x) => x.id === 'mito');
    expect(P.cellProcDiveState({ mito: { step: 'x' } }, dive)).toEqual({ step: 0, paused: false });
    expect(P.cellProcDiveState({ mito: { step: 99, paused: 'yes' } }, dive)).toEqual({ step: 0, paused: false });
    expect(P.cellProcDiveState([], dive)).toEqual({ step: 0, paused: false });
    expect(P.cellProcDiveState(null, dive)).toEqual({ step: 0, paused: false });
    expect(P.cellProcDiveState({ mito: { step: 3, paused: true } }, dive)).toEqual({ step: 3, paused: true });

    let st = { step: 0, paused: false };
    let reduced = false;
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const act = {
      step: (id, n) => { expect(id).toBe('mito'); st = Object.assign({}, st, { step: n }); draw(); },
      pause: (id) => { expect(id).toBe('mito'); st = Object.assign({}, st, { paused: !st.paused }); draw(); }
    };
    function draw() { flushSync(() => root.render(P.renderCellProcDive(React.createElement, dive, st, act, reduced))); }
    draw();
    const q = (sel) => host.querySelector(sel);
    const article = () => q('[data-cell-proc-dive="mito"]');
    const last = dive.steps.length - 1;
    expect(q('[data-cell-proc-prev]').disabled).toBe(true);
    for (let i = 1; i <= last; i++) {
      q('[data-cell-proc-next]').click();
      expect(article().getAttribute('data-step')).toBe('s' + i);
      expect(q('[data-cell-proc-caption]').textContent).toContain('Step ' + i + ' of ' + last + ' · ' + dive.steps[i][0]);
      const pressed = [...host.querySelectorAll('[data-cell-proc-step-chip]')].filter((b) => b.getAttribute('aria-pressed') === 'true');
      expect(pressed.map((b) => b.getAttribute('data-cell-proc-step-chip'))).toEqual([String(i)]);
    }
    expect(q('[data-cell-proc-next]').disabled).toBe(true);
    q('[data-cell-proc-prev]').click();
    expect(article().getAttribute('data-step')).toBe('s' + (last - 1));
    [...host.querySelectorAll('[data-cell-proc-step-chip]')][0].click();
    expect(article().getAttribute('data-step')).toBe('s0');
    expect(q('[data-cell-proc-caption]').textContent).toContain('Whole process');
    expect(q('[data-cell-proc-caption]').getAttribute('aria-live')).toBe('polite');

    const pause = q('[data-cell-proc-pause]');
    expect(pause.getAttribute('aria-pressed')).toBe('false');
    expect(article().getAttribute('data-cell-proc-paused')).toBe('false');
    pause.click();
    expect(q('[data-cell-proc-pause]').getAttribute('aria-pressed')).toBe('true');
    expect(article().getAttribute('data-cell-proc-paused')).toBe('true');

    reduced = true; st = { step: 0, paused: false }; draw();
    expect(q('[data-cell-proc-pause]').disabled).toBe(true);
    expect(q('[data-cell-proc-pause]').textContent).toContain('Motion off');
    expect(article().getAttribute('data-cell-proc-paused')).toBe('true');
    [...host.querySelectorAll('button')].forEach((b) => expect(b.getAttribute('type')).toBe('button'));
    flushSync(() => root.unmount());
    host.remove();
  });

  it('wires saved deep-dive state into the tool render', () => {
    const page = renderProcesses({ cellProcDive: { chloro: { step: 3 }, endo: 'junk' } });
    const chloro = page.querySelector('[data-cell-proc-dive="chloro"]');
    expect(chloro.getAttribute('data-step')).toBe('s3');
    expect(chloro.querySelector('[data-cell-proc-caption]').textContent).toContain('Step 3 of 5 · Photosystem I makes NADPH');
    expect(page.querySelector('[data-cell-proc-dive="endo"]').getAttribute('data-step')).toBe('s0');
    expect(page.querySelector('[data-cell-proc-dive="mito"]').getAttribute('data-step')).toBe('s0');
    expect(page.textContent).not.toMatch(/undefined|NaN|\[object Object\]/);
  });
});

describe('Cell Processes motion', () => {
  it('animates only with CSS that a reduced-motion preference switches off (no SMIL)', () => {
    const css = P.CELL_PROC_CSS;
    const reducedBlock = /@media \(prefers-reduced-motion:reduce\)\{(.*)\}$/.exec(css);
    expect(reducedBlock, 'reduced-motion block').toBeTruthy();
    expect(reducedBlock[1]).toContain('.cpa{animation:none!important}');
    expect(reducedBlock[1]).toContain('.cpm{visibility:hidden!important}');
    // Every rule that starts an animation targets a class that also carries .cpa in the markup.
    const animatedClasses = new Set();
    for (const m of css.replace(/@keyframes [\w-]+\{(?:[^{}]*\{[^{}]*\})*\}/g, '').matchAll(/\.([\w-]+)\{[^}]*animation:(?!none)/g)) animatedClasses.add(m[1]);
    expect([...animatedClasses].length).toBeGreaterThan(8);
    expect(css).toContain('[data-cell-proc-paused=true] .cpa{animation-play-state:paused}');
    // SSR escapes quotes and angle brackets inside <style>; the sheet must not need them.
    expect(css).not.toMatch(/["'<>&]/);
    const pages = PROCESS_IDS.map((id) => renderProcesses({ cellProcess: id }));
    let animated = 0;
    pages.forEach((page) => {
      expect(page.querySelectorAll('animate, animateMotion, animateTransform, set').length).toBe(0);
      page.querySelectorAll('[class]').forEach((el) => {
        const cls = (el.getAttribute('class') || '').split(/\s+/);
        if (cls.some((c) => animatedClasses.has(c))) {
          animated++;
          expect(cls, 'animated element without .cpa: ' + el.outerHTML.slice(0, 120)).toContain('cpa');
        }
        if (cls.includes('cpm')) expect(cls).toContain('cpa');
      });
      const style = page.querySelector('style[data-cell-proc-style]');
      expect(style, 'scoped style element').toBeTruthy();
    });
    expect(animated).toBeGreaterThan(60);
  });

  it('pauses figure motion while the figure is scrolled out of view', () => {
    expect(P.CELL_PROC_CSS).toContain('[data-cp-offscreen=true] .cpa{animation-play-state:paused}');
    const page = renderProcesses({});
    expect(page.querySelectorAll('[data-cell-proc-dive]').length).toBe(3);
    const RealIO = window.IntersectionObserver;
    const observed = [];
    window.IntersectionObserver = function (cb) { this.cb = cb; this.observe = (el) => observed.push({ el, io: this }); this.unobserve = () => {}; };
    try {
      const el = document.createElement('article');
      document.body.appendChild(el);
      P.cpWatchOffscreen(el);
      P.cpWatchOffscreen(el);
      expect(observed.length, 'one observer per element').toBe(1);
      observed[0].io.cb([{ target: el, isIntersecting: false }]);
      expect(el.getAttribute('data-cp-offscreen')).toBe('true');
      observed[0].io.cb([{ target: el, isIntersecting: true }]);
      expect(el.getAttribute('data-cp-offscreen')).toBe('false');
      el.remove();
      P.cpWatchOffscreen(null);
    } finally {
      window.IntersectionObserver = RealIO;
    }
  });
});

describe('Cell Processes science text', () => {
  it('teaches the corrected content in the stage cards', () => {
    // Card and summary text only: the map's own <desc> must not satisfy these.
    const text = (id) => {
      const panel = renderProcesses({ cellProcess: id }).querySelector('#cell-process-panel').cloneNode(true);
      panel.querySelectorAll('svg').forEach((svg) => svg.remove());
      return panel.textContent;
    };
    const transport = text('transport');
    ['Simple diffusion', 'Facilitated diffusion', 'osmosis', 'Active transport', 'Bulk transport', 'Endocytosis', 'exocytosis'].forEach((s) => expect(transport).toContain(s));
    expect(text('etc')).toContain('Complex II does not pump');
    expect(text('etc')).toContain('O₂ + 4 e⁻ + 4 H⁺ → 2 H₂O');
    const protein = text('protein');
    expect(protein).toContain('signal sequence');
    const photo = text('photosynthesis');
    expect(photo.indexOf('Photosystem II')).toBeGreaterThan(-1);
    expect(photo.indexOf('Photosystem II')).toBeLessThan(photo.indexOf('Photosystem I re-energizes'));
    expect(photo).toContain('ATP + NADPH');
    expect(text('respiration')).toContain('≈30–32 ATP');
    expect(text('krebs')).toContain('Each turn releases 2 CO₂ and makes 3 NADH, 1 FADH₂, and 1 ATP or GTP');
  });
});
