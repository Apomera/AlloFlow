import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resetStemLab, renderTool, React, ReactDOMServer } from './helpers/stem_widgets_smoke_harness.js';
import { sliceBetween } from './helpers/anchored_slice.js';

// Lane A: the survey's reef pictures (PointArt), the method diagrams and the
// tape strip. PointArt is internal, so the tool is loaded with one extra line
// that hands it to the test; everything else runs the real render path.

const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const SRC = readFileSync(resolve(process.cwd(), TOOL), 'utf8');
const CORAL = ['hard_coral', 'bleached_coral', 'recently_dead_coral'];
const FORMS = ['branching', 'massive', 'plate', 'encrusting'];
const CATS = ['hard_coral', 'bleached_coral', 'recently_dead_coral', 'macroalgae', 'rock', 'rubble', 'sand'];
const NAMES = ['Live hard coral', 'Bleached coral', 'Recently dead coral', 'Fleshy seaweed', 'Rubble', 'Sand'];
let A, X;

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  const tail = SRC.lastIndexOf('})();');
  // eslint-disable-next-line no-new-func
  new Function(SRC.slice(0, tail) + 'window.__laneAArt = { PointArt: PointArt, STRIP_CODE: STRIP_CODE };\n' + SRC.slice(tail))();
  A = window.__laneAArt;
  X = window.__RR_TEST_EXPORTS__.coralReef;
});

function art(point, prefix) {
  const html = ReactDOMServer.renderToStaticMarkup(React.createElement(A.PointArt, { h: React.createElement, point, label: 'Close-up', idPrefix: prefix || 't' }));
  const div = document.createElement('div');
  div.innerHTML = html;
  return { html, svg: div.firstElementChild };
}
function cases() {
  const out = [];
  for (const category of CATS) {
    for (const coralForm of CORAL.includes(category) ? FORMS : [null]) {
      for (const variant of [0, 1, 2, 5, 13, 137, 999]) for (const colony of [undefined, 4]) out.push({ category, coralForm, variant, colony });
    }
  }
  return out;
}
const hex = /#[0-9a-fA-F]{6}\b/g;
function hsl(c) {
  const v = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255), mx = Math.max(...v), mn = Math.min(...v), l = (mx + mn) / 2;
  const s = mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1));
  let hue = 0;
  if (mx !== mn) { const [r, g, b] = v, dd = mx - mn; hue = mx === r ? ((g - b) / dd) % 6 : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4; hue = (hue * 60 + 360) % 360; }
  return { h: hue, s, l };
}
// Colors anywhere in the coral drawing, including its own gradients.
function coralColors(svg) {
  const g = svg.querySelector('[data-part="coral"]');
  return g ? (g.outerHTML.match(hex) || []).map((c) => c.toLowerCase()) : [];
}
const pigment = (c) => { const x = hsl(c); return x.s > 0.3 && x.l > 0.2 && x.l < 0.75; };
function refsResolve(root) {
  const ids = new Set([...root.querySelectorAll('[id]')].map((e) => e.id));
  const missing = [];
  for (const el of root.querySelectorAll('*')) {
    for (const attr of el.getAttributeNames()) {
      const v = el.getAttribute(attr);
      for (const m of v.matchAll(/url\(#([^)]+)\)/g)) if (!ids.has(m[1])) missing.push(attr + '->' + m[1]);
      if ((attr === 'href' || attr === 'xlink:href') && v.startsWith('#') && !ids.has(v.slice(1))) missing.push(attr + '->' + v);
    }
  }
  return missing;
}

describe('PointArt draws what pointFeatures() says, for every category, form and variant', () => {
  it('has one plumb tip inside the picture, sane size, and references that resolve', () => {
    const bad = [];
    for (const p of cases()) {
      const { svg, html } = art(p);
      const tag = JSON.stringify(p);
      const tips = svg.querySelectorAll('[data-part="plumb-tip"]');
      if (tips.length !== 1) { bad.push(tag + ' tips ' + tips.length); continue; }
      const cx = +tips[0].getAttribute('cx'), cy = +tips[0].getAttribute('cy');
      if (!(cx >= 8 && cx <= 312 && cy >= 20 && cy <= 214)) bad.push(tag + ' tip at ' + cx + ',' + cy);
      const line = svg.querySelector('[data-part="plumb"] line[stroke="#facc15"]');
      if (!line || +line.getAttribute('x1') !== cx || +line.getAttribute('y2') >= cy) bad.push(tag + ' line does not end at the tip');
      if (svg.getAttribute('role') !== 'img' || svg.getAttribute('aria-label') !== 'Close-up') bad.push(tag + ' label');
      const n = svg.querySelectorAll('*').length;
      if (n > 700) bad.push(tag + ' nodes ' + n);
      if (html.length > 160000) bad.push(tag + ' markup ' + html.length);
      const miss = refsResolve(svg);
      if (miss.length) bad.push(tag + ' missing ' + miss.slice(0, 3).join(','));
      const ids = [...svg.querySelectorAll('[id]')].map((e) => e.id);
      if (new Set(ids).size !== ids.length) bad.push(tag + ' duplicate ids');
    }
    expect(bad).toEqual([]);
  }, 60000);

  it('puts polyps with tentacles only on living coral, and cups with turf only on dead coral', () => {
    const bad = [];
    for (const p of cases()) {
      const { svg } = art(p);
      const has = (part) => !!svg.querySelector('[data-part="' + part + '"]');
      const live = p.category === 'hard_coral' || p.category === 'bleached_coral', dead = p.category === 'recently_dead_coral';
      const tag = p.category + '/' + p.coralForm + '/' + p.variant;
      if (has('polyps') !== live || has('tentacles') !== live) bad.push(tag + ' polyps ' + has('polyps') + ' tentacles ' + has('tentacles'));
      if (has('cups') !== dead || has('turf') !== dead) bad.push(tag + ' cups ' + has('cups') + ' turf ' + has('turf'));
      if (has('coral') !== CORAL.includes(p.category)) bad.push(tag + ' coral group');
      if (p.category === 'macroalgae' && !has('seaweed')) bad.push(tag + ' no seaweed');
      if (p.category === 'rock' && !(has('rock') && has('cca') && has('rock-turf'))) bad.push(tag + ' rock without crusts or turf');
      if (p.category === 'rubble' && !has('rubble')) bad.push(tag + ' no rubble');
      if (p.category === 'sand' && (!has('ripples') || has('rock') || has('rubble') || has('seaweed'))) bad.push(tag + ' sand is not bare ripples');
    }
    expect(bad).toEqual([]);
  }, 60000);

  it('keeps bleached coral free of tissue color, and live coral pigmented', () => {
    const bad = [];
    for (const p of cases()) {
      if (!CORAL.includes(p.category)) continue;
      const colors = coralColors(art(p).svg), tag = p.category + '/' + p.coralForm + '/' + p.variant + '/' + p.colony;
      const pig = colors.filter(pigment);
      if (p.category === 'bleached_coral' && pig.length) bad.push(tag + ' bleached has ' + [...new Set(pig)].join(' '));
      if (p.category === 'hard_coral' && !pig.length) bad.push(tag + ' live coral has no pigment');
    }
    expect(bad).toEqual([]);
  }, 60000);

  it('is deterministic, varies between points, and keeps one colony the same shape', () => {
    const p = { category: 'hard_coral', coralForm: 'branching', variant: 3, colony: 9 };
    expect(art(p).html).toBe(art(Object.assign({}, p)).html);
    const looks = new Set([0, 1, 2, 3].map((c) => art({ category: 'hard_coral', coralForm: 'massive', variant: 0, colony: c }).html));
    expect(looks.size).toBe(4);
    // Two points on one colony: same body, the plumb line may land elsewhere.
    const body = (q) => art(q).svg.querySelector('path[id$="-bp0"]').getAttribute('d');
    expect(body({ category: 'hard_coral', coralForm: 'branching', variant: 10, colony: 6 })).toBe(body({ category: 'hard_coral', coralForm: 'branching', variant: 803, colony: 6 }));
    expect(body({ category: 'hard_coral', coralForm: 'branching', variant: 10, colony: 6 })).not.toBe(body({ category: 'hard_coral', coralForm: 'branching', variant: 10, colony: 7 }));
    // The field guide shows one colony alive, bleached and dead.
    expect(body({ category: 'hard_coral', coralForm: 'branching', variant: 0 })).toBe(body({ category: 'recently_dead_coral', coralForm: 'branching', variant: 0 }));
  });

  it('uses no Math.random in the lane A drawing code', () => {
    const slice = (a, b) => sliceBetween(SRC, a, b, { label: 'stem_tool_coralreef.js' });
    const owned = slice('// ── Illustrations ──', '// Fish for the belt map, drawn side-on') + slice('// Practice points: the bleached', '// ── 3D dive loader') + slice('var STRIP_SWATCH', 'function BeltMap(');
    expect(owned.includes('Math.random')).toBe(false);
  });
});

describe('the pictures in the tool', () => {
  it('survey picture labels never name the category, and every point of every site renders a tip', () => {
    const bad = [];
    for (const site of X.SITES) {
      for (const idx of [0, 7, 13, 21, 33, 39]) {
        const html = renderTool('coralReef', { coralReef: { section: 'survey', surveySiteId: site.id, surveySeed: site.seed, pointIndex: idx } });
        const div = document.createElement('div');
        div.innerHTML = html;
        const svg = [...div.querySelectorAll('svg[role="img"]')].find((s) => (s.getAttribute('aria-label') || '').startsWith('Close-up under the point'));
        if (!svg) { bad.push(site.id + ' ' + idx + ' no picture'); continue; }
        const label = svg.getAttribute('aria-label');
        for (const n of NAMES) if (label.includes(n)) bad.push(site.id + ' ' + idx + ' label names ' + n);
        if (svg.querySelectorAll('[data-part="plumb-tip"]').length !== 1) bad.push(site.id + ' ' + idx + ' tip');
      }
    }
    expect(bad).toEqual([]);
  }, 60000);

  it('methods page: ids are unique and every gradient, clip and use reference resolves', () => {
    for (const theme of ['light', 'dark', 'contrast']) {
      const div = document.createElement('div');
      div.innerHTML = renderTool('coralReef', { coralReef: { section: 'methods' } }, { theme });
      const ids = [...div.querySelectorAll('[id]')].map((e) => e.id);
      const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
      expect(dup, theme).toEqual([]);
      expect(refsResolve(div), theme).toEqual([]);
      // 7 guide cards and 8 practice points, all drawn.
      expect(div.querySelectorAll('[data-part="plumb-tip"]').length).toBe(15);
    }
  });

  it('method diagrams: 40 marks on the side view, a belt with its widths, translated labels', () => {
    const div = document.createElement('div');
    div.innerHTML = renderTool('coralReef', { coralReef: { section: 'methods' } });
    const side = div.querySelector('svg[aria-label^="Diagram from the side"]');
    const above = div.querySelector('svg[aria-label^="Diagram from above"]');
    expect(side && above).toBeTruthy();
    const marks = side.querySelector('[data-part="point-marks"]').getAttribute('d').match(/M/g).length;
    expect(marks).toBe(40);
    expect(above.querySelector('[data-part="belt"]')).toBeTruthy();
    const text = div.textContent;
    for (const t of ['0 m', '20 m', '2.5 m', 'At 3 m the line touches live hard coral, so you record HC.', 'At 12.5 m it touches sand, so you record SD.']) expect(text.includes(t), t).toBe(true);
    // Every label in the diagrams goes through __alloT, so a translation reaches it.
    const tr = renderTool('coralReef', { coralReef: { section: 'methods' } }, { t: (k, f) => (k === 'stem.coralreef.m_dist_m' ? '{m} metros' : f) });
    // Both belt-width chips, and both ends of the tape on each diagram.
    expect((tr.match(/>2\.5 metros</g) || []).length).toBe(2);
    expect((tr.match(/>20 metros</g) || []).length).toBe(2);
    expect((tr.match(/>0 metros</g) || []).length).toBe(2);
  });
});

describe('the tape strip', () => {
  it('shows each recorded point\'s code over a swatch, keeps aria labels, and marks the current point', () => {
    const records = { 0: 'hard_coral', 1: 'bleached_coral', 2: 'recently_dead_coral', 3: 'macroalgae', 4: 'rock', 5: 'rubble', 6: 'sand' };
    const div = document.createElement('div');
    div.innerHTML = renderTool('coralReef', { coralReef: { section: 'survey', records, pointIndex: 8 } });
    const bar = div.querySelector('[role="toolbar"]');
    const buttons = [...bar.querySelectorAll('button')];
    expect(buttons.length).toBe(40);
    const codes = ['HC', 'BL', 'RKC', 'NIA', 'RC', 'RB', 'SD'];
    codes.forEach((code, i) => {
      expect(buttons[i].getAttribute('data-code')).toBe(code);
      expect(buttons[i].textContent).toBe(String(i + 1) + code);
      expect(buttons[i].getAttribute('aria-label').startsWith('Point ' + (i + 1) + ', at ')).toBe(true);
    });
    expect(buttons[7].getAttribute('data-code')).toBe(null);
    expect(buttons[7].textContent).toBe('8');
    expect(buttons[7].getAttribute('aria-label')).toBe('Point 8, at 3.5 m, not recorded');
    expect(buttons.filter((b) => b.getAttribute('aria-current') === 'true').map((b) => b.textContent)).toEqual(['9']);
    expect(buttons.filter((b) => b.getAttribute('tabindex') === '0').length).toBe(1);
    const overview = div.querySelector('[data-part="tape-overview"]');
    expect(overview && overview.getAttribute('aria-hidden')).toBe('true');
  });
});
