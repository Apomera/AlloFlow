import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8'), bodies = new Map();
function production(name, bindings = {}) {
  if (!bodies.has(name)) {
    const matches = [...source.matchAll(new RegExp('^([ \\t]*)function ' + name + '\\(', 'gm'))];
    if (matches.length !== 1) throw Error('Expected one production function: ' + name);
    const m = matches[0], start = m.index + m[1].length, ending = new RegExp('^' + m[1] + '}[ \\t]*\\r?$', 'gm');
    ending.lastIndex = start;
    const end = ending.exec(source);
    if (!end) throw Error('Missing function ending: ' + name);
    bodies.set(name, source.slice(start, end.index + end[0].length));
  }
  return new Function(...Object.keys(bindings), 'return (' + bodies.get(name) + ');')(...Object.values(bindings));
}
function quadratic(curve, t) { const u = 1 - t; return {
  x: u * u * curve.start.x + 2 * u * t * curve.control.x + t * t * curve.end.x,
  y: u * u * curve.start.y + 2 * u * t * curve.control.y + t * t * curve.end.y,
}; }
function projected(p, m, dpr) { return { x: (m.a * p.x + m.c * p.y + m.e) / dpr, y: (m.b * p.x + m.d * p.y + m.f) / dpr }; }
function inside(p, box, padding = 0) { return p.x >= box.x - padding && p.x <= box.x + box.width + padding && p.y >= box.y - padding && p.y <= box.y + box.height + padding; }
function overlap(a, b, padding = 0) { return Math.max(0, Math.min(a.x + a.width + padding, b.x + b.width) - Math.max(a.x - padding, b.x)) *
  Math.max(0, Math.min(a.y + a.height + padding, b.y + b.height) - Math.max(a.y - padding, b.y)); }
const layout = { pointX: 212, pointY: 173, x: 38, y: 312, width: 124, height: 36, side: 'left', fullLabel: true, showCallout: true,
  visibility: 'visible', selected: false, hovered: true, related: false };
const identity = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
const transforms = [
  ['ordinary', identity, 1],
  ['DPR 2', { a: 2, b: 0, c: 0, d: 2, e: 0, f: 0 }, 2],
  ['mirrored zoom and pan', { a: -6, b: 0, c: 0, d: 6, e: 1600, f: -240 }, 2],
  ['fractional DPR and shear', { a: 3.125, b: .22, c: -.31, d: 2.5, e: -122.5, f: 83.75 }, 1.25],
];
function placement(W, H, extra, initial, existing = []) {
  const canvas = { _guidanceBoxes: existing, _canvasHudBoxes: [] };
  const place = production('placeCanvasHudPanel', { canvas, W, H });
  return place(initial.x, initial.y, initial.width, initial.height, extra);
}

class Context {
  constructor(matrix = { a: -4, b: .18, c: .24, d: 4, e: 950, f: -180 }) { this.matrix = { ...matrix }; this.stack = []; }
  getTransform() { return { ...this.matrix }; }
  save() { this.stack.push(this.getTransform()); }
  restore() { if (!this.stack.length) throw Error('Unbalanced restore'); this.matrix = this.stack.pop(); }
  translate(x, y) { const m = this.matrix; m.e += m.a * x + m.c * y; m.f += m.b * x + m.d * y; }
  scale(x, y) { const m = this.matrix; m.a *= x; m.b *= x; m.c *= y; m.d *= y; }
  rotate(t) { const m = this.matrix, c = Math.cos(t), s = Math.sin(t); this.matrix = {
    a: m.a * c + m.c * s, b: m.b * c + m.d * s, c: -m.a * s + m.c * c, d: -m.b * s + m.d * c, e: m.e, f: m.f,
  }; }
  measureText() { return { width: 108 }; }
  beginPath() {} moveTo() {} lineTo() {} setLineDash() {} stroke() {} roundRect() {} rect() {} fill() {} fillText() {}
}
function footprintFixture({ quizMode = false, showCallout = true, markerLayouts = [], compactCompass = false } = {}) {
  const ctx = new Context(), initialMatrix = ctx.getTransform(), canvas = { _dpr: 2, _guidanceBoxes: [], _canvasHudBoxes: [] }, observations = { screenCalls: [], placements: [] };
  const leader = production('dissectionCalloutLeader'), screenBoxes = production('dissectionLeaderScreenBoxes');
  const callout = { ...layout, showCallout }, uiScale = 1.4;
  const bindings = { ctx, canvas, W: 360, H: 432, spec: { bodyShape: 'fish' },
    d: { visualRealism: 'realistic', quizMode }, visualRealism: 'realistic',
    highContrastEnabled: false, focusEntryProgress: 1, specimenScale: { x: -1, y: 1 }, zoom: 2,
    canvasUiScale: uiScale, labelUiScale: 1.4, specimenTextScaleX: 2, specimenTextScaleY: 2, labelScreenBottom: 418,
    hudCompassLayout: { compact: compactCompass }, hudCompassBox: compactCompass ? { x: 14, y: 14, w: 319.50171995603176, h: 165.54398188468907 } : null,
    canvasCoarsePointer: false, depthAtlasEnabled: true, organs: markerLayouts.map(l => ({ id: l.id })),
    adaptiveHotspotById: Object.fromEntries(markerLayouts.map(l => [l.id, l])),
    structureInspectionFootprint: () => ({ rx: 18.36, ry: 16.15, rotation: 0, depth: 'deep', depthOffset: 12, morphologyLabel: 'POUCHES' }),
    fitTextToWidth: text => text, rememberCanvasGuidanceBox: () => {},
    dissectionCalloutLeader: leader,
    dissectionLeaderScreenBoxes: (curve, matrix, dpr, padding) => {
      const boxes = screenBoxes(curve, matrix, dpr, padding); observations.screenCalls.push({ curve, matrix, dpr, padding, boxes }); return boxes;
    },
    placeCanvasHudPanel: (x, y, width, height, reservations) => { observations.placements.push({ x, y, width, height, reservations }); return { x, y }; },
  };
  bindings.canvasScreenBox = production('canvasScreenBox', { ctx, canvas });
  bindings.adaptiveHotspotMarkerGeometry = production('adaptiveHotspotMarkerGeometry', { ...bindings,
    dissectionHotspotMarkerGeometry: production('dissectionHotspotMarkerGeometry') });
  const draw = production('drawStructureInspectionFootprint', bindings);
  return { ctx, canvas, initialMatrix, observations, callout, uiScale, draw: () => draw({ id: 'pyloric_ceca' }, callout.pointX, callout.pointY, false, true, 'visible', callout) };
}

describe('shared dissection callout leader and caption clearance', () => {
  it.each(['left', 'right'])('retains the exact prior leader route on the %s side', side => {
    const make = production('dissectionCalloutLeader'), l = { ...layout, side }, saved = structuredClone(l), ui = 1.4, textScale = 2.75;
    const c = make(l, ui, textScale), connector = side === 'right' ? l.x : l.x + l.width;
    const start = l.pointX + (side === 'right' ? 6 : -6) * ui / textScale;
    expect(c).toEqual({ start: { x: start, y: l.pointY }, control: { x: start + (connector - start) * .54, y: l.pointY },
      end: { x: connector, y: l.y + l.height / 2 } });
    expect(l).toEqual(saved); expect(make(l, ui, textScale)).toEqual(c);
  });

  it.each(transforms)('contains each exact subcurve with padding under %s', (_name, matrix, dpr) => {
    const c = production('dissectionCalloutLeader')(layout, 1.4, 2), make = production('dissectionLeaderScreenBoxes');
    const before = structuredClone({ c, matrix }), boxes = make(c, matrix, dpr, 2.8);
    expect(boxes).toHaveLength(8);
    for (let i = 0; i < 8; i++) {
      expect(boxes[i].priority).toBe(9); expect(boxes[i].keepClear).toBe(true);
      expect(boxes[i].width).toBeGreaterThanOrEqual(5.6); expect(boxes[i].height).toBeGreaterThanOrEqual(5.6);
      for (let j = 0; j <= 48; j++) {
        const p = projected(quadratic(c, (i + j / 48) / 8), matrix, dpr);
        expect(inside(p, { x: boxes[i].x + 2.8 - 1e-10, y: boxes[i].y + 2.8 - 1e-10,
          width: boxes[i].width - 5.6 + 2e-10, height: boxes[i].height - 5.6 + 2e-10 })).toBe(true);
      }
    }
    expect({ c, matrix }).toEqual(before); expect(make(c, matrix, dpr, 2.8)).toEqual(boxes);
  });

  it('matches canvasScreenBox viewport units across fractional and doubled backing densities', () => {
    const c = production('dissectionCalloutLeader')(layout, 1.4, 2), make = production('dissectionLeaderScreenBoxes');
    const m = { a: -2, b: .1, c: .2, d: 2, e: 700, f: -90 }, base = make(c, m, 1, 2);
    for (const dpr of [1.25, 2, 3]) {
      const scaled = Object.fromEntries(Object.entries(m).map(([key, value]) => [key, value * dpr]));
      const boxes = make(c, scaled, dpr, 2);
      for (let i = 0; i < 8; i++) for (const key of ['x', 'y', 'width', 'height']) expect(boxes[i][key]).toBeCloseTo(base[i][key], 10);
      const canvas = { _dpr: dpr }, ctx = { getTransform: () => scaled }, pointBox = production('canvasScreenBox', { ctx, canvas });
      const expected = pointBox(c.start.x, c.start.y, 0, 0);
      expect(inside({ x: expected.x, y: expected.y }, boxes[0])).toBe(true);
    }
  });

  it('reserves a narrow curved corridor rather than the large empty rectangle beside a diagonal', () => {
    const c = { start: { x: 30, y: 40 }, control: { x: 180, y: 40 }, end: { x: 250, y: 350 } };
    const boxes = production('dissectionLeaderScreenBoxes')(c, identity, 1, 2);
    const area = boxes.reduce((sum, b) => sum + b.width * b.height, 0);
    expect(area).toBeLessThan((250 - 30) * (350 - 40) * .25);
    expect(boxes.some(b => inside({ x: 235, y: 85 }, b))).toBe(false);
  });

  it('moves a colliding phone depth caption clear of its selected leader and card using the production placement function', () => {
    // Recorded pre-fix 390px phone/DPR2 scene with large text. The backing
    // density is adaptive; all placement rectangles use 500x600 logical units.
    const W = 500, H = 600, dpr = 1.43525, uiScale = 2.0554507185367976;
    const matrix = { a: 3.022666286291553, b: 0, c: 0, d: 2.9558166783303363, e: -441.4653795274859, f: -522.2417950113396 };
    const local = { start: { x: 259.6853747157209, y: 323.90918066625 }, control: { x: 253.36097342959948, y: 323.90918066625 },
      end: { x: 247.9735204821627, y: 391.5076771291607 } };
    const c = { start: { x: 239.31499576290733, y: 303.2045730473969 }, control: { x: 225.99567540161956, y: 303.2045730473969 },
      end: { x: 214.64958768644857, y: 442.4198757996181 } };
    for (const key of ['start', 'control', 'end']) {
      const p = projected(local[key], matrix, dpr); expect(p.x).toBeCloseTo(c[key].x, 10); expect(p.y).toBeCloseTo(c[key].y, 10);
    }
    const caption = { x: 167.04330751446284, y: 372.86809378973004, width: 169.20873592722975, height: 34.942661103362525 };
    const card = { x: 45.980947376135184, y: 417.754467474412, width: 168.66864031031335, height: 49.33081665041221, priority: 8 };
    const reservations = [{ x: 0, y: 0, width: W, height: 74, priority: 9 }, { x: 0, y: H - 14, width: W, height: 14, priority: 9 }, card];
    const positions = Array.from({ length: 257 }, (_, i) => quadratic(c, i / 256));
    const without = placement(W, H, reservations, caption);
    expect(positions.some(p => inside(p, { ...caption, ...without }))).toBe(true);
    const padding = 2 * uiScale, corridor = production('dissectionLeaderScreenBoxes')(local, matrix, dpr, padding), after = placement(W, H, reservations.concat(corridor), caption);
    const finalBox = { ...caption, ...after };
    expect(positions.every(p => !inside(p, finalBox, padding))).toBe(true);
    expect(finalBox.x).toBeGreaterThanOrEqual(14); expect(finalBox.x + finalBox.width).toBeLessThanOrEqual(W - 14);
    expect(finalBox.y).toBeGreaterThanOrEqual(82); expect(finalBox.y + finalBox.height).toBeLessThanOrEqual(H - 14);
    expect(finalBox.x + finalBox.width <= card.x || finalBox.x >= card.x + card.width || finalBox.y + finalBox.height <= card.y || finalBox.y >= card.y + card.height).toBe(true);
    expect({ x: after.x, y: after.y }).not.toEqual({ x: without.x, y: without.y });
  });

  it('leaves an already-clear caption at exactly its former position', () => {
    const caption = { x: 215, y: 205, width: 110, height: 24 };
    const c = { start: { x: 70, y: 160 }, control: { x: 60, y: 160 }, end: { x: 45, y: 330 } };
    const before = placement(500, 600, [], caption), corridor = production('dissectionLeaderScreenBoxes')(c, identity, 1, 2.8);
    const after = placement(500, 600, corridor, caption);
    expect({ x: after.x, y: after.y }).toEqual({ x: before.x, y: before.y });
    expect({ x: after.x, y: after.y }).toEqual({ x: caption.x, y: caption.y });
  });

  it.each([
    ['ordinary DPR2', { a: 4, b: 0, c: 0, d: 4, e: -180, f: -120 }, 2],
    ['mirrored fractional DPR with shear', { a: -3.6, b: .16, c: .24, d: 3.2, e: 940, f: -210 }, 1.43525],
  ])('publishes only active callout cards as keep-clear guidance under %s', (_name, matrix, dpr) => {
    const canvas = { _dpr: dpr, _guidanceBoxes: [] }, ctx = { getTransform: () => matrix };
    const screenBox = production('canvasScreenBox', { ctx, canvas });
    const remember = production('rememberCanvasGuidanceBox', { canvas, canvasScreenBox: screenBox });
    const args = [134.3265695677696, 379.8341069127671, 51.709651465537156, 24.500464147660274];
    const expected = screenBox(...args);
    remember(...args, 8, true); remember(...args, 8, false); remember(...args, 2);
    expect(canvas._guidanceBoxes).toHaveLength(3);
    expect(canvas._guidanceBoxes[0]).toEqual({ ...expected, priority: 8, keepClear: true });
    for (const box of canvas._guidanceBoxes.slice(1)) {
      expect(box.keepClear).not.toBe(true);
      expect({ x: box.x, y: box.y, width: box.width, height: box.height }).toEqual(expected);
    }
    expect(canvas._guidanceBoxes.slice(1).map(box => box.priority)).toEqual([8, 2]);
  });

  it('passes selected and hovered full-card state to the actual keep-clear publication call', () => {
    const match = /rememberCanvasGuidanceBox\(lx,\s*ly,\s*layout\.width,\s*layout\.height,[^;]+;/.exec(source);
    expect(match).not.toBeNull();
    for (const [isSel, isHov] of [[true, false], [false, true], [false, false]]) {
      const calls = [], l = { width: 52, height: 25 };
      new Function('rememberCanvasGuidanceBox', 'lx', 'ly', 'layout', 'isSel', 'isHov', match[0])(
        (...args) => calls.push(args), 134, 380, l, isSel, isHov);
      expect(calls).toEqual([[134, 380, 52, 25, isSel || isHov ? 8 : 2, isSel || isHov]]);
    }
  });

  it('reserves the planned compact compass only for phone caption placement and publishes its active caption as keep-clear', () => {
    const f = footprintFixture({ compactCompass: true }); f.draw();
    expect(f.observations.placements[0].reservations).toContainEqual({ x: 14, y: 14, width: 319.50171995603176, height: 165.54398188468907, priority: 9 });
    const desktop = footprintFixture(); desktop.draw();
    expect(desktop.observations.placements[0].reservations.some(box => box.width === 319.50171995603176)).toBe(false);
    const match = /rememberCanvasGuidanceBox\(-footprintCaptionW[^;]+;/.exec(source); expect(match).not.toBeNull();
    for (const [selected, hovered] of [[true, false], [false, true], [false, false]]) {
      const calls = [];
      new Function('rememberCanvasGuidanceBox', 'footprintCaptionW', 'canvasUiScale', 'selected', 'hovered', match[0])(
        (...args) => calls.push(args), 172, 2, selected, hovered);
      expect(calls).toEqual([[-86, 0, 172, 34, 8, selected || hovered]]);
    }
  });

  it('coordinates the recorded phone Spleen caption and orientation HUD without trading the collision for another active or fixed panel', () => {
    // Actual 390px/DPR2/large-text capture, converted to its 500x600 viewport.
    // Keep the fixture self-contained: it must not depend on temporary QA files.
    const W = 500, H = 600, ui = 2.0554507185367976;
    const preferred = { x: 14, y: 82, width: 319.50171995603176, height: 97.54398188468907 };
    const reticle = { x: 185.59511190068727, y: 239.26554658224723, width: 123.32704137478797, height: 123.32705234870853, priority: 10, keepClear: true };
    const oldCaption = { x: 160.7899030739353, y: 124.8730203310027, width: 172.9374590282918, height: 34.942664681365414, priority: 8 };
    const card = { x: 103.75957172392695, y: 383.14710765574046, width: 106.50094845171783, height: 49.3308209394836, priority: 8, keepClear: true };
    const huds = [
      { id: 'layer', x: 14, y: 543.2466250544346, width: 189.98890566870858, height: 42.7533749455654, priority: 9 },
      { id: 'specimen', x: 14, y: 13, width: 240.3043762207031, height: 39, priority: 9 },
      { id: 'scale', x: 249.21207722456091, y: 484.0496443605748, width: 236.78792277543909, height: 101.95035563942517, priority: 9 },
    ];
    const shared = [
      { x: 358, y: 417.0496443605748, width: 122, height: 57, priority: 9 },
      { id: 'procedure-handoff', x: 268, y: 10, width: 218, height: 95.37291334010742, priority: 9 },
    ];
    function placePanel(guidance, fixed = huds, initial = preferred, extra = shared) {
      const canvas = { _guidanceBoxes: guidance, _canvasHudBoxes: fixed };
      const p = production('placeCanvasHudPanel', { canvas, W, H })(initial.x, initial.y, initial.width, initial.height, extra);
      return { ...initial, x: p.x, y: p.y };
    }
    const legacy = placePanel([reticle, oldCaption, { ...card, keepClear: false }]);
    expect(overlap(legacy, card)).toBeGreaterThan(5000);
    expect(overlap(placePanel([reticle, oldCaption, card]), oldCaption)).toBeGreaterThan(4000);
    expect(overlap(placePanel([reticle, { ...oldCaption, keepClear: true }, card]), huds[2])).toBeGreaterThan(4000);
    const markerBoxes = [
      [181.66114340413202,183.05404462702373,58.35026252494622,58.38464974142961],
      [339.7221277322408,30.648156470455866,31.849198990495513,31.863606252751907],
      [176.54767826492633,321.1285897127736,58.35026252494622,58.38464974142961],
      [245.26640744275144,21.238571455418338,31.849198990495513,31.863606252751907],
      [368.1144413441621,200.85693050639398,58.35026252494622,58.38464974142961],
      [325.8967897827497,167.8456079490769,31.849198990495513,31.863606252751907],
      [411.5281230721152,145.5035191666177,58.35026252494622,58.38464974142961],
      [369.310455448622,152.6911667333217,31.849198990495513,31.863606252751907],
      [307.3881167688891,256.21034184617037,58.35026252494622,58.38464974142961],
      [265.1704652074766,242.7595701967589,31.849198990495513,31.863606252751907],
      [337.87993652384614,311.5637531859466,58.35026252494622,58.38464974142961],
      [295.66228496243366,338.6675347476818,31.849198990495513,31.863606252751907],
      [359.84018113545704,422.2705758654992,58.35026252494622,58.38464974142961],
      [317.6225378262149,406.16667590941,31.849198990495513,31.863606252751907],
      [379.60065066341946,366.9171645257229,58.35026252494622,58.38464974142961],
      [337.3829867187258,378.66175873344355,31.849198990495513,31.863606252751907],
      [409.2668286064298,216.1771806361562,31.849198990495513,31.863606252751907],
      [354.7160624625404,255.44658344440813,31.849198990495513,31.863606252751907],
      [312.7347790781009,475.934248009163,31.849198990495513,31.863606252751907],
    ].map(([x, y, width, height]) => ({ x, y, width, height, priority: 9, keepClear: true }));
    const localLeader = { start: { x: 198.0120736777689, y: 338.99999999999994 }, control: { x: 191.54511324975934, y: 338.99999999999994 },
      end: { x: 186.03622103330676, y: 392.08433898659723 } };
    const entry = { a: 2.956033969155669, b: 0, c: 0, d: 2.889825283581615, e: -248.15297728571295, f: -547.7423194602551 };
    const leaderBoxes = production('dissectionLeaderScreenBoxes')(localLeader, entry, 1.43525, 2 * ui);
    const initialCaption = { x: 160.78990380176282, y: 357.0544026850721, width: 172.93745757263687, height: 34.94266221512556 };
    const bindings = { W, H, labelScreenBottom: 476.0496443605748, plannedCallout: { ...card, keepClear: false },
      plannedLeaderBoxes: leaderBoxes, plannedMarkerBoxes: markerBoxes, hudCompassLayout: { compact: true },
      hudCompassBox: { x: 14, y: 14, w: preferred.width, h: 82 + preferred.height - 14 }, selected: true, hovered: false };
    const start = source.indexOf('var captionReservations = [', source.indexOf('function drawStructureInspectionFootprint('));
    const end = source.indexOf('var captionPlacement =', start); expect(start).toBeGreaterThan(0); expect(end).toBeGreaterThan(start);
    const reservations = new Function(...Object.keys(bindings), source.slice(start, end) + ';return captionReservations;')(...Object.values(bindings));
    const moved = { ...placePanel([reticle], [], initialCaption, reservations), priority: 8, keepClear: true };
    const orientation = placePanel([reticle, moved, card]);
    for (const obstacle of [reticle, moved, card, ...huds, ...shared]) expect(overlap(orientation, obstacle, 6)).toBe(0);
    for (const obstacle of [reticle, card, ...markerBoxes, ...huds, ...shared]) expect(overlap(moved, obstacle)).toBe(0);
    for (const panel of [moved, orientation]) {
      expect(panel.x).toBeGreaterThanOrEqual(14); expect(panel.y).toBeGreaterThanOrEqual(14);
      expect(panel.x + panel.width).toBeLessThanOrEqual(W - 14); expect(panel.y + panel.height).toBeLessThanOrEqual(H - 14);
    }
    expect(reservations.some(box => box.width === preferred.width && box.height === 82 + preferred.height - 14)).toBe(true);
  });

  it('paints the actual adaptive leader from the shared helper output', () => {
    const curve = { start: { x: 91, y: 92 }, control: { x: 93, y: 94 }, end: { x: 95, y: 96 } }, calls = [], moves = [];
    const stop = Error('Observed shared leader'), ctx = { save() {}, beginPath() {}, moveTo: (...args) => moves.push(args),
      quadraticCurveTo: (...args) => { calls.push(args); throw stop; } };
    const org = { id: 'pyloric_ceca' }, l = { ...layout }, helperCalls = [];
    const draw = production('drawAdaptiveHotspotGuidance', { organs: [org], adaptiveHotspotById: { [org.id]: l },
      focusMode: false, denseHotspotView: false, d: { quizMode: false }, ctx, canvasDisplayWidth: 500,
      drawStructureInspectionFootprint: () => {}, drawDepthAtlasMarker: () => {}, labelUiScale: 1.4, specimenTextScaleX: 2,
      dissectionCalloutLeader: (...args) => { helperCalls.push(args); return curve; } });
    expect(draw).toThrow(stop); expect(helperCalls).toEqual([[l, 1.4, 2]]);
    expect(moves.at(-1)).toEqual([91, 92]); expect(calls).toEqual([[93, 94, 95, 96]]);
  });

  it('captures the full entry transform before footprint scaling and keeps reservations local to the owning caption', () => {
    const f = footprintFixture(); f.draw(); expect(f.observations.screenCalls).toHaveLength(1);
    const call = f.observations.screenCalls[0], placementCall = f.observations.placements[0];
    expect(call.matrix).toEqual(f.initialMatrix); expect(call.dpr).toBe(2); expect(call.padding).toBe(2 * f.uiScale);
    expect(call.curve).toEqual(production('dissectionCalloutLeader')(f.callout, 1.4, 2));
    expect(call.boxes).toHaveLength(8);
    for (const box of call.boxes) expect(placementCall.reservations).toContainEqual(box);
    expect(f.canvas._guidanceBoxes).toEqual([]); expect(f.canvas._canvasHudBoxes).toEqual([]);
    expect(f.ctx.getTransform()).toEqual(f.initialMatrix); expect(f.ctx.stack).toEqual([]);
  });

  it('reserves all painted badges and point markers before the footprint transform without changing shared obstacles', () => {
    const markerLayouts = [
      { ...layout, id: 'one', fullLabel: false, selected: false, hovered: false, depth: 'deep' },
      { ...layout, id: 'two', x: 182, pointX: 253, visibility: 'obscured', fullLabel: false, selected: false, hovered: false, depth: 'structure' },
    ];
    const f = footprintFixture({ markerLayouts }); f.draw();
    const geometry = production('dissectionHotspotMarkerGeometry');
    const markerBoxes = markerLayouts.flatMap(l => {
      const g = geometry(l, { quizMode: false, coarsePointer: false, labelUiScale: 1.4,
        specimenTextScaleX: 2, specimenTextScaleY: 2, canvasUiScale: f.uiScale, zoom: 2,
        accessible: false, depthAtlasEnabled: true });
      return [g.badge, g.point];
    });
    expect(markerBoxes).toHaveLength(4); expect(markerBoxes.every(Boolean)).toBe(true);
    const reservations = f.observations.placements[0].reservations;
    const padding = 2 * f.uiScale;
    for (const g of markerBoxes) {
      const corners = [[g.cx - g.rx, g.cy - g.ry], [g.cx + g.rx, g.cy - g.ry],
        [g.cx - g.rx, g.cy + g.ry], [g.cx + g.rx, g.cy + g.ry]]
        .map(([x, y]) => projected({ x, y }, f.initialMatrix, 2));
      const minX = Math.min(...corners.map(p => p.x)), minY = Math.min(...corners.map(p => p.y));
      const expected = { x: minX - padding, y: minY - padding,
        width: Math.max(...corners.map(p => p.x)) - minX + padding * 2,
        height: Math.max(...corners.map(p => p.y)) - minY + padding * 2 };
      const actual = reservations.find(b => b.keepClear && ['x', 'y', 'width', 'height'].every(k => Math.abs(b[k] - expected[k]) < 1e-9));
      expect(actual).toBeDefined(); expect(actual.priority).toBe(9); expect(actual.keepClear).toBe(true);
      for (const key of ['x', 'y', 'width', 'height']) expect(actual[key]).toBeCloseTo(expected[key], 9);
    }
    expect(reservations.filter(b => b.keepClear)).toHaveLength(12); // Eight leader segments and four actual markers.
    expect(f.canvas._guidanceBoxes).toEqual([]); expect(f.canvas._canvasHudBoxes).toEqual([]);
    expect(f.ctx.getTransform()).toEqual(f.initialMatrix); expect(f.ctx.stack).toEqual([]);
  });

  it.each([{ quizMode: true }, { showCallout: false }])('does not reserve an unpainted leader when %j', overrides => {
    const f = footprintFixture(overrides); f.draw(); expect(f.observations.screenCalls).toEqual([]);
    expect(f.observations.placements[0].reservations.filter(box => box.keepClear)).toEqual([]);
  });

  it('returns no route for invalid callout geometry or scales', () => {
    const make = production('dissectionCalloutLeader');
    for (const l of [null, { ...layout, pointX: NaN }, { ...layout, x: Infinity }, { ...layout, width: 0 }, { ...layout, height: -1 }, { ...layout, pointY: '173' }, { ...layout, side: 'middle' }]) expect(make(l, 1.4, 2)).toBeNull();
    for (const value of [0, -1, NaN, Infinity, '2', undefined]) { expect(make(layout, value, 2)).toBeNull(); expect(make(layout, 1.4, value)).toBeNull(); }
  });

  it('rejects invalid transforms, coordinates, density and padding without emitting nonfinite reservations', () => {
    const make = production('dissectionLeaderScreenBoxes'), c = production('dissectionCalloutLeader')(layout, 1.4, 2);
    for (const matrix of [null, { ...identity, c: NaN }, { ...identity, f: Infinity }, { ...identity, a: '1' }, { ...identity, d: 0 }]) expect(make(c, matrix, 1, 2)).toEqual([]);
    for (const value of [0, -1, NaN, Infinity, '2']) expect(make(c, identity, value, 2)).toEqual([]);
    for (const value of [-1, NaN, Infinity, '2']) expect(make(c, identity, 1, value)).toEqual([]);
    for (const curve of [null, { ...c, start: null }, { ...c, control: { x: NaN, y: 1 } }, { ...c, end: { x: 1, y: '2' } }]) expect(make(curve, identity, 1, 2)).toEqual([]);
    expect(make({ start: { x: -1e308, y: 0 }, control: { x: 1e308, y: 0 }, end: { x: 1e308, y: 1 } }, identity, 1, 2).every(box => Object.values(box).every(value => typeof value !== 'number' || Number.isFinite(value)))).toBe(true);
    expect(make(c, identity, 1)).toEqual(make(c, identity, 1, 2)); expect(make(c, identity, 1, 0)).toHaveLength(8);
  });
});
