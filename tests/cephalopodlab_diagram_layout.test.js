import { beforeEach, describe, expect, it } from 'vitest';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

// Two Biology diagrams, checked on what they draw. The jet schematic used to
// fire water out of the closed mantle tip like a rocket; the siphon opens under
// the head, so an escaping squid travels mantle-first with the jet blowing back
// past its arms. The life-cycle flow had a label wider than its box and arrows
// cutting through a stage box and a caption.
const SOURCE = 'stem_lab/stem_tool_cephalopodlab.js';
const RENDER_TIMEOUT_MS = 20000;

function render(data) {
  const container = document.createElement('div');
  container.innerHTML = renderTool('cephalopodLab', { cephalopodLab: data });
  return container;
}
const num = (el, name) => Number(el.getAttribute(name));

beforeEach(() => {
  window.localStorage.clear();
  resetStemLab();
  loadTool(SOURCE, 'cephalopodLab');
});

describe('Jet Propulsion schematic anatomy', () => {
  it('sends the jet out from the head end, behind the travelling animal, for every species', () => {
    for (const id of ['humboldt', 'commonOcto', 'cuttle', 'nautilus']) {
      const svg = render({ activeSection: 'jet', jetSpeciesId: id }).querySelector('svg[aria-label*="jet velocity"]');
      const mantle = svg.querySelector('ellipse.cl-jet-mantle');
      const cx = num(mantle, 'cx'), rx = num(mantle, 'rx');
      const plumeStart = Number(svg.querySelector('polygon.cl-jet-plume').getAttribute('points').split(' ')[0].split(',')[0]);
      expect(plumeStart, id + ': the jet leaves at the head, not the mantle tip').toBeGreaterThan(cx + rx * 0.8);
      // arms trail on the jet side, away from the direction of travel
      const armStarts = [...svg.querySelectorAll('path')].map((p) => /^M([\d.]+) /.exec(p.getAttribute('d') || '')).filter(Boolean).map((m) => Number(m[1]));
      if (id !== 'nautilus') expect(armStarts.filter((x) => x > cx + rx).length, id + ' arms').toBeGreaterThanOrEqual(5);
    }
  }, RENDER_TIMEOUT_MS);

  it('puts the squid fins on the leading mantle tip', () => {
    const svg = render({ activeSection: 'jet', jetSpeciesId: 'humboldt' }).querySelector('svg[aria-label*="jet velocity"]');
    const mantle = svg.querySelector('ellipse.cl-jet-mantle');
    const fin = [...svg.querySelectorAll('path')].find((p) => /Z$/.test(p.getAttribute('d') || ''));
    const xs = (fin.getAttribute('d').match(/[\d.]+(?= )/g) || []).map(Number).filter((_, i) => i % 2 === 0);
    expect(Math.min(...xs)).toBeLessThan(num(mantle, 'cx') - num(mantle, 'rx'));
  }, RENDER_TIMEOUT_MS);
});

// The counter-illumination sim said "Silhouette erased" over a solid black
// animal. What the predator sees has to follow the match it reports.
describe('Counter-illumination silhouette', () => {
  function silhouette(depth, belly) {
    const c = render({ activeSection: 'biolux', bioluxView: 'counter', bioluxDepthFactor: depth, bioluxBellyIntensity: belly });
    const svg = c.querySelector('svg[aria-label^="Counter-illumination simulation"]');
    const mantle = [...svg.querySelectorAll('ellipse')].find((e) => e.getAttribute('rx') === '46' && e.getAttribute('fill') !== 'none');
    return { svg, fill: mantle.getAttribute('fill'), opacity: Number(mantle.parentNode.getAttribute('opacity')) };
  }
  it('erases the animal at a match and shows a dark or bright silhouette as the gap grows', () => {
    const matched = silhouette(60, 60), close = silhouette(70, 45), under = silhouette(70, 10), over = silhouette(30, 95);
    expect(matched.opacity).toBeLessThan(0.1);
    expect(close.opacity).toBeGreaterThan(matched.opacity);
    expect(under.opacity).toBeGreaterThan(close.opacity);
    expect(under.opacity).toBeGreaterThan(0.9);
    expect(under.fill).toBe('#1c1410');
    expect(over.fill).toBe('#dbeafe');
    expect(over.opacity).toBeGreaterThan(0.9);
    // the animal stays findable as an outline even when it is erased
    expect(matched.svg.querySelectorAll('[stroke-dasharray="3 3"]').length).toBeGreaterThan(2);
  }, RENDER_TIMEOUT_MS);

  it('prints the whole verdict instead of cutting it off', () => {
    const { svg } = silhouette(60, 60);
    const verdict = [...svg.querySelectorAll('text')].find((t) => t.querySelector('tspan'));
    const lines = [...verdict.querySelectorAll('tspan')].map((t) => t.textContent);
    expect(lines.join(' ')).toBe('Silhouette erased — predator sees nothing.');
    expect(lines.length).toBeLessThanOrEqual(2);
  }, RENDER_TIMEOUT_MS);
});

describe('Life Cycle flow layout', () => {
  function layout() {
    const svg = render({ activeSection: 'lifecycle' }).querySelector('svg[aria-label^="Life cycle flow"]');
    const boxes = [...svg.querySelectorAll('rect[rx="8"]')].map((r) => ({ x: num(r, 'x'), y: num(r, 'y'), w: num(r, 'width'), h: num(r, 'height'), label: r.nextSibling }));
    const samples = [];
    for (const path of svg.querySelectorAll('path[marker-end]')) {
      const d = path.getAttribute('d');
      const cubic = /^M([\d.]+) ([\d.]+) C ([\d.]+) ([\d.]+), ([\d.]+) ([\d.]+), ([\d.]+) ([\d.]+)$/.exec(d);
      if (cubic) {
        const [x0, y0, x1, y1, x2, y2, x3, y3] = cubic.slice(1).map(Number);
        for (let t = 0; t <= 1; t += 0.02) { const u = 1 - t; samples.push({ d, x: u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, y: u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3 }); }
        continue;
      }
      const pts = d.match(/[ML] ?[\d.]+ [\d.]+/g).map((s) => s.slice(1).trim().split(' ').map(Number));
      expect(pts.length, d).toBeGreaterThan(1);
      for (let i = 1; i < pts.length; i++) for (let t = 0; t <= 1; t += 0.02) samples.push({ d, x: pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, y: pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t });
    }
    return { svg, boxes, samples };
  }

  it('keeps every arrow out of every stage box', () => {
    const { boxes, samples } = layout();
    expect(boxes).toHaveLength(8);
    expect(samples.length).toBeGreaterThan(300);
    const inside = samples.filter((p) => boxes.some((b) => p.x > b.x + 2 && p.x < b.x + b.w - 2 && p.y > b.y + 2 && p.y < b.y + b.h - 2));
    expect(inside.map((p) => p.d + ' @' + p.x.toFixed(0) + ',' + p.y.toFixed(0)).slice(0, 3)).toEqual([]);
    // and the boxes do not overlap each other
    for (const a of boxes) for (const b of boxes) if (a !== b) expect(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y).toBe(true);
  }, RENDER_TIMEOUT_MS);

  it('fits each stage name inside its box and keeps the captions off the arrows', () => {
    const { svg, boxes, samples } = layout();
    for (const b of boxes) {
      const size = num(b.label, 'font-size'), text = b.label.textContent;
      expect(text.length * size * 0.6, text).toBeLessThanOrEqual(b.w - 10);
    }
    const captions = [...svg.querySelectorAll(':scope > text')];
    expect(captions.length).toBe(3);
    for (const c of captions) {
      const size = num(c, 'font-size'), x = num(c, 'x'), y = num(c, 'y'), w = c.textContent.length * size * 0.6;
      const left = c.getAttribute('text-anchor') === 'end' ? x - w : c.getAttribute('text-anchor') === 'middle' ? x - w / 2 : x;
      const hits = samples.filter((p) => p.x > left && p.x < left + w && p.y > y - size && p.y < y + 2);
      expect(hits.map((p) => c.textContent.slice(0, 20) + ' x ' + p.d).slice(0, 2)).toEqual([]);
      expect(boxes.some((b) => left < b.x + b.w && left + w > b.x && y - size < b.y + b.h && y + 2 > b.y), c.textContent).toBe(false);
    }
  }, RENDER_TIMEOUT_MS);
});
