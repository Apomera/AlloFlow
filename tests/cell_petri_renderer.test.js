// The petri specimen renderer (cellPetriDrawSpecimen) draws every organism in the live
// dish, the chooser portraits and the anatomy figure. The dish repaints it dozens of
// times a frame, so these tests pin what keeps it cheap and stable:
//   - level of detail: tiny specimens cost a handful of calls, detail grows with size;
//   - gradients are built once per type and mode (unit space), never per frame or size;
//   - output is a pure function of its inputs (portraits must not change between renders);
//   - every coordinate is finite and save/restore is balanced, in all modes and sizes;
//   - the anatomy figure's numbered badges never overlap and stay inside the frame.
// A recording 2-D context stands in for the canvas.
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = resolve(process.cwd(), 'stem_lab/stem_tool_cell.js');
let PETRI;
let ORGS;

const PATH_OPS = ['moveTo', 'lineTo', 'quadraticCurveTo', 'bezierCurveTo', 'arc', 'ellipse', 'rect', 'arcTo'];
function recorder() {
  const log = { ops: [], gradients: 0, nonFinite: [], depth: 0, minDepth: 0 };
  const ctx = {
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, globalAlpha: 1, lineCap: 'butt', lineJoin: 'miter',
    shadowBlur: 0, shadowColor: 'transparent', font: '10px sans-serif', textAlign: 'left', textBaseline: 'alphabetic',
  };
  const gradient = (kind) => function () {
    log.gradients++;
    const g = { kind, stops: [], addColorStop(o, c) { g.stops.push([o, c]); } };
    log.ops.push([kind + 'Gradient', Array.from(arguments)]);
    return g;
  };
  ctx.createRadialGradient = gradient('radial');
  ctx.createLinearGradient = gradient('linear');
  PATH_OPS.concat(['translate', 'rotate', 'scale', 'setTransform', 'beginPath', 'closePath', 'clearRect', 'fillRect', 'strokeRect', 'setLineDash', 'fillText']).forEach((name) => {
    ctx[name] = function () {
      const args = Array.from(arguments);
      args.forEach((v) => { if (typeof v === 'number' && !Number.isFinite(v)) log.nonFinite.push(name); });
      log.ops.push([name, args]);
    };
  });
  ctx.save = () => { log.depth++; log.ops.push(['save', []]); };
  ctx.restore = () => { log.depth--; log.minDepth = Math.min(log.minDepth, log.depth); log.ops.push(['restore', []]); };
  ctx.fill = () => log.ops.push(['fill', [typeof ctx.fillStyle === 'string' ? ctx.fillStyle : 'gradient']]);
  ctx.stroke = () => log.ops.push(['stroke', [typeof ctx.strokeStyle === 'string' ? ctx.strokeStyle : 'gradient', ctx.lineWidth]]);
  ctx.measureText = (t) => ({ width: String(t).length * 6 });
  return { ctx, log };
}
const count = (log, names) => log.ops.filter((o) => names.indexOf(o[0]) !== -1).length;
function draw(id, opts, rec) {
  const def = ORGS.find((o) => o.id === id);
  const r = rec || recorder();
  PETRI.cellPetriDrawSpecimen(r.ctx, def, Object.assign({ sz: 40, dpr: 1, lod: 3, mode: 'brightfield', t: 0, angle: 0.3, phase: 0.7 }, opts || {}));
  return r;
}

beforeAll(() => {
  window.StemLab = { registerTool() {}, isRegistered() { return false; }, getRegisteredTools() { return []; } };
  delete window.__alloCellPetri;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(SRC, 'utf8'))();
  PETRI = window.__alloCellPetri;
  if (!PETRI) throw new Error('petri helpers not exposed (window.__alloCellPetri)');
  const src = readFileSync(SRC, 'utf8');
  ORGS = [];
  const re = /id: '([a-z_]+)', label: '([^']*)', icon: '[^']*', color: '(#[0-9a-fA-F]{6})', bodyColor: '([^']*)'/g;
  let m;
  while ((m = re.exec(src))) ORGS.push({ id: m[1], label: m[2], color: m[3], bodyColor: m[4] });
});

describe('petri renderer: every specimen draws cleanly', () => {
  it('knows all eleven organisms', () => {
    expect(ORGS.map((o) => o.id).sort()).toEqual(['amoeba', 'bacterium', 'diatom', 'euglena', 'paramecium', 'plantcell', 'spirillum', 'stentor', 'tardigrade', 'volvox', 'wbc']);
    ORGS.forEach((o) => expect(PETRI.CELL_PETRI_BOX[o.id], o.id).toHaveLength(4));
  });

  it('draws every organism in every mode at every detail level with finite geometry', () => {
    for (const o of ORGS) {
      for (const mode of ['brightfield', 'darkfield', 'phase']) {
        for (const lod of [0, 1, 2, 3]) {
          const { log } = draw(o.id, { mode, lod, t: 137, sz: [6, 15, 40, 160][lod] });
          const tag = `${o.id}/${mode}/lod${lod}`;
          expect(log.nonFinite, tag).toEqual([]);
          expect(log.depth, tag + ' save/restore unbalanced').toBe(0);
          expect(log.minDepth, tag + ' restored more than saved').toBe(0);
          expect(count(log, ['fill', 'stroke']), tag + ' painted nothing').toBeGreaterThan(1);
          expect(count(log, ['stroke']), tag + ' has no outline').toBeGreaterThan(0);
          log.ops.filter((op) => op[0] === 'fill' || op[0] === 'stroke').forEach((op) => {
            expect(String(op[1][0]), tag).not.toMatch(/undefined|NaN/);
          });
        }
      }
    }
  });

  it('ignores unusable input instead of throwing', () => {
    const { ctx, log } = recorder();
    expect(() => PETRI.cellPetriDrawSpecimen(ctx, null, { sz: 30 })).not.toThrow();
    expect(() => PETRI.cellPetriDrawSpecimen(ctx, ORGS[0], { sz: 0 })).not.toThrow();
    expect(() => PETRI.cellPetriDrawSpecimen(ctx, ORGS[0], { sz: NaN })).not.toThrow();
    expect(() => PETRI.cellPetriDrawSpecimen(ctx, { id: 'unknown', color: '#123456', bodyColor: 'rgba(1,2,3,0.4)' }, { sz: 30, lod: 3 })).not.toThrow();
    expect(log.depth).toBe(0);
  });
});

describe('petri renderer: detail follows on-screen size', () => {
  it('maps CSS pixels per unit to four levels', () => {
    expect([0, 5, 8.9, 9, 21.9, 22, 54.9, 55, 400, NaN, -3].map(PETRI.cellPetriLod)).toEqual([0, 0, 0, 1, 1, 2, 2, 3, 3, 0, 0]);
  });

  it('keeps a specimen seen at 40x down to a few calls and grows detail with size', () => {
    for (const o of ORGS) {
      const calls = [0, 1, 2, 3].map((lod) => {
        const { log } = draw(o.id, { lod, t: 50 });
        return { paint: count(log, ['fill', 'stroke']), path: count(log, PATH_OPS) };
      });
      expect(calls[0].paint, o.id + ' lod0 paint calls').toBeLessThanOrEqual(10);
      expect(calls[0].path, o.id + ' lod0 is no cheaper than lod3').toBeLessThan(calls[3].path);
      for (let k = 1; k < 4; k++) expect(calls[k].path, `${o.id} lod${k} path ops`).toBeGreaterThanOrEqual(calls[k - 1].path);
    }
  });
});

describe('petri renderer: gradients are cached per type and mode', () => {
  it('builds each gradient once per context, whatever the size or position', () => {
    const rec = recorder();
    ORGS.forEach((o) => draw(o.id, { lod: 3 }, rec));
    const first = rec.log.gradients;
    expect(first, 'the renderer uses gradients at all').toBeGreaterThan(5);
    ORGS.forEach((o) => [12, 40, 300].forEach((sz) => draw(o.id, { lod: 3, sz, t: 99, angle: 2 }, rec)));
    expect(rec.log.gradients - first, 'gradients were rebuilt on a repeat draw').toBe(0);
  });

  it('keeps separate gradients for each illumination mode', () => {
    const rec = recorder();
    draw('paramecium', { mode: 'brightfield' }, rec);
    const bf = rec.log.gradients;
    draw('paramecium', { mode: 'darkfield' }, rec);
    expect(rec.log.gradients, 'darkfield reused brightfield gradients').toBeGreaterThan(bf);
    const df = rec.log.gradients;
    draw('paramecium', { mode: 'phase' }, rec);
    expect(rec.log.gradients).toBeGreaterThan(df);
    const all = rec.log.gradients;
    ['brightfield', 'darkfield', 'phase'].forEach((mode) => draw('paramecium', { mode }, rec));
    expect(rec.log.gradients).toBe(all);
  });
});

describe('petri renderer: output depends only on its inputs', () => {
  it('draws identically twice (portraits and the gallery stay stable)', () => {
    ORGS.forEach((o) => {
      const a = JSON.stringify(draw(o.id, { t: 0 }).log.ops);
      const b = JSON.stringify(draw(o.id, { t: 0 }).log.ops);
      expect(a, o.id).toBe(b);
    });
  });

  it('animates only through its clock (the dish pins it to 0 for reduced motion)', () => {
    ['paramecium', 'amoeba', 'euglena', 'bacterium', 'volvox', 'spirillum', 'tardigrade', 'stentor', 'plantcell'].forEach((id) => {
      const still = JSON.stringify(draw(id, { t: 0 }).log.ops);
      expect(JSON.stringify(draw(id, { t: 240 }).log.ops), id + ' never moves').not.toBe(still);
    });
  });
});

describe('petri anatomy figure: numbered callouts', () => {
  const anatomy = (n) => Array.from({ length: n }, (_, i) => ({ name: 'S' + i, lx: Math.cos(i) * 1.2, ly: Math.sin(i * 1.7) * 0.9 }));

  it('places one badge per structure, inside the frame, never overlapping', () => {
    [1, 4, 5, 7, 9].forEach((n) => {
      const items = PETRI.cellPetriFigureLayout({ anatomy: anatomy(n) }, { width: 320, height: 180, sz: 40, cx: 160, cy: 90, angle: -0.12, badge: 10 });
      expect(items.map((it) => it.index).sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, i) => i));
      items.forEach((it) => {
        expect(it.by, 'badge above the frame').toBeGreaterThanOrEqual(10);
        expect(it.by, 'badge below the frame').toBeLessThanOrEqual(170);
        expect(it.bx === 16 || it.bx === 304, 'badge outside its column').toBe(true);
      });
      for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
        if (items[i].bx !== items[j].bx) continue;
        expect(Math.abs(items[i].by - items[j].by), `badges ${i}/${j} overlap (n=${n})`).toBeGreaterThanOrEqual(20);
      }
    });
  });

  it('survives an organism with malformed anatomy entries', () => {
    const items = PETRI.cellPetriFigureLayout({ anatomy: [null, { name: 'Cilia' }, { lx: 'x', ly: {} }] }, { width: 320, height: 180, sz: 40, cx: 160, cy: 90, badge: 10 });
    expect(items).toHaveLength(3);
    items.forEach((it) => { expect(Number.isFinite(it.ax) && Number.isFinite(it.by)).toBe(true); expect(it.name).not.toMatch(/undefined/); });
  });
});
