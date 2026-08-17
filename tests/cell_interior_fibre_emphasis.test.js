// Cell interior — the cytoskeleton fibres, and where they must NOT be emphasised.
//
// In study-label mode the diagram draws a "Cytoskeleton" label with a leader line
// pointing at fibres that were rendered at globalAlpha 0.13. Measured against the
// brightest band of each cytoplasm — the hardest case for a light stroke:
//     cyan-300    animal 1.38  plant 1.34  bacterium 1.38
//     violet-400  animal 1.20  plant 1.17  bacterium 1.21
// A leader line pointing at something invisible is worse than no label at all. Even
// SELECTING the cytoskeleton (0.46) left violet at 1.79-2.04 and cyan at 2.69 on the
// plant cytoplasm, all under the 3:1 that WCAG 1.4.11 asks of a meaningful graphic.
//
// The first attempt at this raised the fibres whenever labels were on, and the
// PROKARYOTE screenshot immediately showed why that is wrong: a bold fibre network
// radiating from the nucleoid, with no label naming it, in a diagram whose whole point
// is that bacteria have no such network. The emphasis is therefore scoped to cell types
// whose catalogue actually lists a cytoskeleton — which is the case this file pins.
//
// Behavioural, not a spelling pin: it runs the real renderer against a recording
// context and reads back the alpha and stroke colours it actually used.
import fs from 'node:fs';
import { describe, it, expect, beforeAll } from 'vitest';

const SRC = 'stem_lab/stem_tool_cell.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_cell.js';

// Every stroke the renderer performs, with the alpha and colour in force at the time.
function recordingContext() {
  const strokes = [];
  const ctx = {
    globalAlpha: 1, strokeStyle: '#000', fillStyle: '#000', lineWidth: 1,
    shadowColor: '', shadowBlur: 0, font: '', textAlign: 'left', lineCap: 'butt',
    lineJoin: 'miter', globalCompositeOperation: 'source-over', filter: 'none',
    canvas: { width: 760, height: 440 },
    _stack: [],
    save() { this._stack.push({ a: this.globalAlpha, s: this.strokeStyle, w: this.lineWidth }); },
    restore() {
      const p = this._stack.pop();
      if (p) { this.globalAlpha = p.a; this.strokeStyle = p.s; this.lineWidth = p.w; }
    },
    _ops: [],
    stroke() {
      strokes.push({ alpha: this.globalAlpha, color: String(this.strokeStyle),
        width: this.lineWidth, shape: this._ops.join(',') });
    },
  };
  // Everything else the renderer touches is a no-op for this measurement.
  // Path ops are recorded per path so a stroke can be identified by its SHAPE. Colour
  // alone is not enough: #67e8f9 and #a78bfa are also used by the membrane, the ER and
  // the label leader lines, and filtering on them counted those too.
  ['moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'arc', 'ellipse', 'rect',
    'arcTo', 'roundRect'].forEach((fn) => { ctx[fn] = function () { this._ops.push(fn); }; });
  ctx.beginPath = function () { this._ops = []; };
  ['closePath', 'fill', 'fillRect', 'clearRect', 'strokeRect', 'fillText', 'strokeText',
    'clip', 'translate', 'rotate', 'scale', 'setTransform', 'resetTransform', 'setLineDash',
    'drawImage'].forEach((fn) => { ctx[fn] = () => {}; });
  ctx.createLinearGradient = ctx.createRadialGradient = () => ({ addColorStop() {} });
  ctx.measureText = () => ({ width: 40 });
  ctx.getLineDash = () => [];
  return { ctx, strokes };
}

let pure;

beforeAll(() => {
  // Booted the way the sibling interior test does: the real jsdom window, a minimal
  // StemLab shim, and read the pure-engine export. A hand-rolled document stub is not
  // enough — the tool builds a live region on load and calls setAttribute on it.
  window.StemLab = { registerTool() {}, isRegistered: () => false, getRegisteredTools: () => [] };
  delete window.__alloCellPure;
  // eslint-disable-next-line no-new-func
  new Function(fs.readFileSync(SRC, 'utf8'))();
  pure = window.__alloCellPure;
  if (!pure || typeof pure.drawCellInterior !== 'function') {
    throw new Error('__alloCellPure.drawCellInterior not exported — this test cannot measure anything');
  }
});

// Each cytoskeleton fibre is one moveTo followed by a single bezierCurveTo, and the
// nine of them are drawn consecutively at one alpha. Shape alone is not enough — the
// renderer draws three other bezier strokes (a flagellum and two details) at alpha 1 —
// and colour alone is not enough either, since #67e8f9 and #a78bfa are also used by the
// membrane, the ER and the label leader lines. Taking the longest consecutive run of
// bezier strokes sharing one alpha isolates the pass without pinning either.
const FIBRE_SHAPE = 'moveTo,bezierCurveTo';
function fibreStrokes(strokes) {
  const beziers = strokes.filter((s) => s.shape === FIBRE_SHAPE);
  let best = [];
  let run = [];
  for (const s of beziers) {
    if (run.length && Math.abs(run[0].alpha - s.alpha) < 1e-9) run.push(s);
    else run = [s];
    if (run.length > best.length) best = run.slice();
  }
  return best.length >= 8 ? best : [];
}

function draw(type, showLabels, sel) {
  const { ctx, strokes } = recordingContext();
  // (cx, W, H, type, t, sel, reduced, contrast, zoom, specialization, showLabels)
  pure.drawCellInterior(ctx, 760, 440, type, 0, sel || null, true, false, 1, null, showLabels);
  return fibreStrokes(strokes);
}

describe('cell interior — cytoskeleton fibre emphasis', () => {
  it('keeps the deployed mirror byte-identical', () => {
    expect(fs.readFileSync(MIRROR, 'utf8')).toBe(fs.readFileSync(SRC, 'utf8'));
  });

  it('draws the fibres faintly when nothing points at them', () => {
    for (const type of ['animal', 'plant', 'bacterium']) {
      const f = draw(type, false);
      expect(f.length, `${type}: no fibres drawn at all`).toBeGreaterThan(0);
      f.forEach((s) => expect(s.alpha, `${type} ambient fibre alpha`).toBeLessThan(0.2));
    }
  });

  it('raises them in study-label mode for cells that have a cytoskeleton', () => {
    for (const type of ['animal', 'plant']) {
      expect(pure.interiorHas(type, 'cytoskeleton'),
        `${type} is expected to list a cytoskeleton`).toBe(true);
      const f = draw(type, true);
      expect(f.length).toBeGreaterThan(0);
      // 0.68 was chosen by measurement: it is where cyan-300 and violet-300 clear 3:1
      // against the brightest band of every cytoplasm.
      f.forEach((s) => expect(s.alpha, `${type} labelled fibre alpha`).toBeGreaterThanOrEqual(0.6));
    }
  });

  it('never emphasises them in the prokaryote, which has no cytoskeleton to label', () => {
    expect(pure.interiorHas('bacterium', 'cytoskeleton'),
      'the catalogue is expected to keep the cytoskeleton out of bacteria').toBe(false);
    const f = draw('bacterium', true);
    expect(f.length).toBeGreaterThan(0);
    f.forEach((s) => expect(s.alpha,
      'a bold fibre network in the bacterial cell contradicts what this diagram teaches')
      .toBeLessThan(0.2));
  });

  it('uses a violet the background can actually carry when emphasised', () => {
    // violet-400 tops out at 2.85:1 on these cytoplasms even at full emphasis, so the
    // readable state has to step up a shade rather than only raising the alpha.
    const emphasised = draw('animal', true).map((s) => s.color.toLowerCase());
    expect(emphasised).toContain('#c4b5fd');
    expect(emphasised).not.toContain('#a78bfa');
    const ambient = draw('animal', false).map((s) => s.color.toLowerCase());
    expect(ambient, 'the ambient palette is deliberately unchanged').toContain('#a78bfa');
  });

  it('still emphasises them when the cytoskeleton itself is selected', () => {
    const f = draw('animal', false, 'cytoskeleton');
    expect(f.length).toBeGreaterThan(0);
    f.forEach((s) => expect(s.alpha).toBeGreaterThanOrEqual(0.6));
  });
});

// Study labels are ANNOTATION and must be drawn over the cell, not under it.
//
// They were painted before four passes of cell structure. The muscle-fibre
// specialization was the loudest: its sarcomere grid (#fecdd3 / #fb7185) struck a line
// through EVERY label in both columns — "Cell membrane" was literally struck out — and
// the neuron's neurite (#f0abfc) crossed the "Cytoskeleton" label and washed it with
// glow. Screenshotted before and after.
describe('cell interior — labels are drawn above the cell, not under it', () => {
  // Colours only the specialization overlay uses, so a stroke in one of them marks
  // exactly the pass that used to paint over the labels.
  const SPECIALIZATION_INK = {
    muscle: ['#fecdd3', '#fb7185'],
    neuron: ['#f0abfc'],
  };

  function opsFor(type, specialization) {
    const ops = [];
    const ctx = {
      globalAlpha: 1, strokeStyle: '#000', fillStyle: '#000', lineWidth: 1,
      shadowColor: '', shadowBlur: 0, font: '', textAlign: 'left', textBaseline: 'alphabetic',
      lineCap: 'butt', lineJoin: 'miter', globalCompositeOperation: 'source-over', filter: 'none',
      canvas: { width: 760, height: 440 }, _stack: [],
      save() { this._stack.push({ s: this.strokeStyle, f: this.fillStyle, a: this.globalAlpha }); },
      restore() { const p = this._stack.pop(); if (p) { this.strokeStyle = p.s; this.fillStyle = p.f; this.globalAlpha = p.a; } },
      stroke() { ops.push({ kind: 'stroke', colour: String(this.strokeStyle).toLowerCase() }); },
      fillText(text) { ops.push({ kind: 'text', text: String(text) }); },
    };
    ['beginPath', 'closePath', 'moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'arc',
      'ellipse', 'rect', 'arcTo', 'roundRect', 'fill', 'fillRect', 'clearRect', 'strokeRect',
      'strokeText', 'clip', 'translate', 'rotate', 'scale', 'setTransform', 'resetTransform',
      'setLineDash', 'drawImage'].forEach((fn) => { ctx[fn] = () => {}; });
    ctx.createLinearGradient = ctx.createRadialGradient = () => ({ addColorStop() {} });
    ctx.measureText = () => ({ width: 40 });
    ctx.getLineDash = () => [];
    // (ctx, W, H, type, t, sel, reduced, contrast, zoom, specialization, showLabels)
    pure.drawCellInterior(ctx, 760, 440, type, 0, null, true, false, 1, specialization, true);
    return ops;
  }

  for (const [specialization, inks] of Object.entries(SPECIALIZATION_INK)) {
    it(`draws every label after the ${specialization} overlay`, () => {
      const ops = opsFor('animal', specialization);
      const names = new Set(Object.values(pure.CELL_ORGANELLES).map((o) => o.name));

      const lastOverlay = ops.reduce((acc, op, i) =>
        (op.kind === 'stroke' && inks.includes(op.colour) ? i : acc), -1);
      const labelIdxs = ops.map((op, i) => (op.kind === 'text' && names.has(op.text) ? i : -1))
        .filter((i) => i >= 0);

      expect(lastOverlay, `no ${specialization} overlay strokes found — the colours this `
        + 'test keys on may have changed').toBeGreaterThan(-1);
      expect(labelIdxs.length, 'no organelle labels were drawn').toBeGreaterThanOrEqual(5);

      const covered = labelIdxs.filter((i) => i < lastOverlay);
      expect(covered.length,
        `${covered.length} of ${labelIdxs.length} labels are drawn BEFORE the `
        + `${specialization} overlay, so the overlay paints across them`).toBe(0);
    });
  }
});

// The selected-structure callout parks itself in whichever side gutter the focused
// organelle is NOT in. With study labels on, BOTH gutters are label columns, so it
// landed on top of them — screenshotted covering "Nucleus" and "Nucleolus", which then
// ghosted through its 94%-opaque panel and read as a rendering fault. It also repeated
// exactly what the ultrastructure inset below already showed: the same name and the
// same subtitle.
describe('cell interior — the selected-structure callout yields to the label columns', () => {
  function textsFor(showLabels) {
    const texts = [];
    const ctx = {
      globalAlpha: 1, strokeStyle: '#000', fillStyle: '#000', lineWidth: 1, shadowColor: '',
      shadowBlur: 0, font: '', textAlign: 'left', textBaseline: 'alphabetic', lineCap: 'butt',
      lineJoin: 'miter', globalCompositeOperation: 'source-over', filter: 'none',
      canvas: { width: 760, height: 440 },
      save() {}, restore() {}, stroke() {},
      fillText(text) { texts.push(String(text)); },
    };
    ['beginPath', 'closePath', 'moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'arc',
      'ellipse', 'rect', 'arcTo', 'roundRect', 'fill', 'fillRect', 'clearRect', 'strokeRect',
      'strokeText', 'clip', 'translate', 'rotate', 'scale', 'setTransform', 'resetTransform',
      'setLineDash', 'drawImage'].forEach((fn) => { ctx[fn] = () => {}; });
    ctx.createLinearGradient = ctx.createRadialGradient = () => ({ addColorStop() {} });
    ctx.measureText = () => ({ width: 40 });
    ctx.getLineDash = () => [];
    pure.drawCellInterior(ctx, 760, 440, 'animal', 0, 'roughER', true, false, 1, null, showLabels);
    return texts;
  }

  it('still shows the callout when there are no labels to collide with', () => {
    const texts = textsFor(false);
    expect(texts, 'the callout is the only thing naming the selection when labels are off')
      .toContain('SELECTED STRUCTURE');
  });

  it('stands down when the study labels own both gutters', () => {
    const texts = textsFor(true);
    expect(texts,
      'the callout is drawn over the label column it cannot avoid').not.toContain('SELECTED STRUCTURE');
    // The selection is still named twice over: once in the label column, once in the
    // ultrastructure inset — so nothing was lost by standing down.
    expect(texts, 'the label column should still name the selected structure')
      .toContain(pure.CELL_ORGANELLES.roughER.name);
    expect(texts, 'the ultrastructure inset should still be present')
      .toContain('ULTRASTRUCTURE INSET');
  });
});
