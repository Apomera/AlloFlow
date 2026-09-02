// Mineral Workbench: the learner classifies the evidence.
//
// The bench used to READ each property to the student: the lens overlay
// printed "Vitreous", the notebook wrote "Streak: Greenish-black", the balance
// printed ρ. Nothing had to be looked at. Now every instrument shows evidence
// only (a highlight, a powder colour, a groove, two readings) and the learner
// records the classification. A misread is allowed and recoverable.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  React,
  ReactDOMServer,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const ROCKS_FILE = 'stem_lab/stem_tool_rocks.js';
const PATHS = [
  'stem_lab/stem_tool_rocks.js',
  'desktop/web-app/public/stem_lab/stem_tool_rocks.js',
];
const POOL = ['quartz', 'feldspar', 'mica', 'calcite', 'halite', 'pyrite',
  'talc', 'gypsum', 'magnetite', 'hematite', 'galena', 'fluorite'];

function base(wb) {
  return {
    mode: 'workbench',
    wb: Object.assign({
      spId: 'calcite', order: POOL, scratch: {}, streakDone: false, fizz: null,
      magnet: null, density: false, lens: false, guessedWrong: [], solvedId: null, guided: false,
    }, wb),
  };
}
function tree(wb) {
  const store = { rocks: base(wb), rockCycle: {} };
  const ctx = makeCtx({
    toolData: store,
    setToolData: (fnOrObj) => {
      const next = typeof fnOrObj === 'function' ? fnOrObj(store) : fnOrObj;
      Object.assign(store, next);
    },
  });
  return { store, node: window.StemLab._registry.rocks.render(ctx) };
}
function markupOf(wb) {
  const { node } = tree(wb);
  return ReactDOMServer.renderToStaticMarkup(React.createElement(() => node));
}
function findAll(node, predicate, acc = []) {
  if (node == null || typeof node !== 'object') return acc;
  if (Array.isArray(node)) { node.forEach((n) => findAll(n, predicate, acc)); return acc; }
  if (predicate(node)) acc.push(node);
  const kids = node.props && node.props.children;
  if (kids != null) findAll(kids, predicate, acc);
  return acc;
}
const choiceButton = (node, id) => findAll(node, (n) => n.type === 'button' && n.props['data-wb-observe-choice'] === id)[0];

beforeEach(() => {
  resetStemLab();
  loadTool(ROCKS_FILE, 'rocks');
  vi.useFakeTimers();
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('the bench shows evidence, never the property name', () => {
  it('never prints a composite luster string for any pool specimen before the learner records one', () => {
    const src = readFileSync(ROCKS_FILE, 'utf8');
    POOL.forEach((id) => {
      const m = new RegExp(`id: '${id}',[^\\n]*luster: '([^']+)'`).exec(src);
      expect(m, id).toBeTruthy();
      const luster = m[1];
      if (!luster.includes('/')) return; // single words also appear as class labels
      const fresh = markupOf({ spId: id });
      expect(fresh, `${id} fresh bench leaks "${luster}"`).not.toContain(luster);
      const lensOpen = markupOf({ spId: id, pending: { tool: 'lens' } });
      expect(lensOpen, `${id} lens porthole leaks "${luster}"`).not.toContain(luster);
    });
  });

  it('draws the unknown as a hand specimen, not the answer-key crystal used on the candidate cards', () => {
    const markup = markupOf({ spId: 'pyrite' });
    expect(markup).toContain('data-wb-specimen="hand-specimen"');
    expect(markup).toContain('Unknown hand specimen: an irregular broken fragment.');
    const bench = markup.slice(markup.indexOf('FIELD STATION'), markup.indexOf('UNKNOWN SPECIMEN'));
    expect(bench).not.toContain('rkvault-pyrite');
  });

  it('opens a luster observation card with four reference sheens on a neutral surface', () => {
    const markup = markupOf({ spId: 'pyrite', pending: { tool: 'lens' } });
    expect(markup).toContain('data-wb-observation-card="lens"');
    expect(markup).toContain('data-wb-bench-observation="lens"');
    ['metallic', 'glassy', 'pearly', 'dull'].forEach((cls) => {
      expect(markup).toContain(`data-wb-observe-choice="${cls}"`);
      expect(markup).toContain(`data-wb-luster-reference="${cls}"`);
    });
    expect(markup).toContain('What does the surface do with light?');
    expect(markup).not.toContain('Lens: luster');
    expect(markup).toContain('data-wb-view3d="off"');
  });

  it('records no evidence while a trial is pending and parks the instruments', () => {
    const { node } = tree({ spId: 'calcite', streakDone: true, pending: { tool: 'streak' } });
    const markup = ReactDOMServer.renderToStaticMarkup(React.createElement(() => node));
    expect(markup).toContain('data-wb-observation-card="streak"');
    expect(markup).toContain('No observations yet');
    expect(markup).toContain('data-wb-action-tool="record"');
    expect(markup).toContain('data-wb-open-observation="streak"');
    ['powder-white', 'powder-greenish-black', 'powder-black', 'powder-red-brown', 'powder-lead-gray', 'plate-scratched']
      .forEach((id) => expect(markup).toContain(`data-wb-observe-choice="${id}"`));
    const lens = findAll(node, (n) => n.type === 'button' && n.props['data-wb-tool'] === 'lens')[0];
    expect(lens.props['aria-disabled']).toBe(true);
  });
});

describe('recording, misreading and looking again', () => {
  it('stores the learner’s luster class and files it as their classification', () => {
    const { store, node } = tree({ spId: 'calcite', pending: { tool: 'lens' } });
    choiceButton(node, 'glassy').props.onClick();
    expect(store.rocks.wb.lens).toBe('glassy');
    expect(store.rocks.wb.pending).toBeNull();
    const after = markupOf(store.rocks.wb);
    expect(after).toContain('Lens: luster glassy (vitreous) (your classification)');
    expect(after).toContain('data-wb-candidate="calcite"');
    expect(after).toContain('data-wb-reexamine="lens"');
  });

  it('lets a misread empty the shortlist and offers a look-again route instead of correcting it', () => {
    // A misread does not blank the board: it leaves the WRONG minerals on it.
    const wrong = markupOf({ spId: 'calcite', lens: 'metallic' });
    expect(wrong).toContain('4 still fit');
    expect(wrong).not.toContain('data-wb-candidate="calcite"');
    expect(wrong).toContain('data-wb-candidate="pyrite"');
    expect(wrong).not.toContain('Incorrect');
    const { store, node } = tree({ spId: 'calcite', lens: 'metallic' });
    const again = findAll(node, (n) => n.type === 'button' && n.props['data-wb-reexamine'] === 'lens')[0];
    expect(again, 'look again control').toBeTruthy();
    again.props.onClick();
    expect(store.rocks.wb.pending).toEqual({ tool: 'lens' });
    expect(store.rocks.wb.lens).toBe('metallic'); // kept until replaced
    choiceButton(tree(store.rocks.wb).node, 'glassy').props.onClick();
  });

  it('checks a prediction against the learner’s record, not the specimen', () => {
    const matched = markupOf({ spId: 'calcite', lens: 'metallic', predictionTool: 'lens', predictionValue: 'metallic' });
    expect(matched).toContain('data-wb-prediction-reflection="matched"');
    const differed = markupOf({ spId: 'calcite', lens: 'metallic', predictionTool: 'lens', predictionValue: 'glassy' });
    expect(differed).toContain('data-wb-prediction-reflection="updated"');
  });

  it('shows the scratch mark without captioning the outcome and records the learner’s reading', () => {
    const { store, node } = tree({ spId: 'magnetite', pending: { tool: 'scratch', ref: 'steel_nail' } });
    const markup = ReactDOMServer.renderToStaticMarkup(React.createElement(() => node));
    expect(markup).toContain('data-wb-bench-observation="scratch"');
    expect(markup).toContain('data-wb-observation-card="scratch"');
    expect(markup).toContain('data-wb-observation-ref="steel_nail"');
    expect(markup).not.toContain('NEAR-MATCH');
    expect(markup).not.toContain('NO MARK');
    choiceButton(node, 'borderline').props.onClick();
    expect(store.rocks.wb.scratch.steel_nail).toBe('borderline');
    expect(store.rocks.wb.pending).toBeNull();
  });

  it('gives two readings for density and makes the learner choose the band', () => {
    const pending = markupOf({ spId: 'galena', density: true, pending: { tool: 'density' } });
    expect(pending).toContain('data-wb-density-readings="shown"');
    expect(pending).toContain('m = 75.0 g');
    expect(pending).toContain('V = 10.0 cm³');
    expect(pending).not.toContain('7.50 g/cm³');
    expect(pending).toContain('data-wb-observe-choice="density-7-5"');
    expect(pending).toContain('data-wb-observe-choice="density-2-5"');
    const wrongBand = markupOf({ spId: 'galena', density: true, densityObs: 'density-2-5' });
    expect(wrongBand).toContain('check your division');
    expect(wrongBand).not.toContain('data-wb-candidate="galena"');
    const rightBand = markupOf({ spId: 'galena', density: true, densityObs: 'density-7-5' });
    expect(rightBand).not.toContain('check your division');
    expect(rightBand).toContain('data-wb-candidate="galena"');
  });

  it('discards a pending trial without recording anything', () => {
    const { store, node } = tree({ spId: 'calcite', streakDone: true, pending: { tool: 'streak' } });
    const discard = findAll(node, (n) => n.type === 'button' && n.props['data-wb-observe-discard'] === 'streak')[0];
    discard.props.onClick();
    expect(store.rocks.wb.pending).toBeNull();
    expect(store.rocks.wb.streakDone).toBe(false);
    expect(store.rocks.wb.streakObs).toBeUndefined();
  });

  it('runs every instrument into a pending observation rather than an auto-recorded fact', () => {
    const cases = [['lens', 'lens'], ['streak', 'streak'], ['magnet', 'magnet'], ['acid', 'acid'], ['balance', 'density'], ['penny', 'scratch']];
    cases.forEach(([tool, pendingTool]) => {
      const { store, node } = tree({ spId: 'pyrite', guided: false, toolsExpanded: true });
      const btn = findAll(node, (n) => n.type === 'button' && n.props['data-wb-tool'] === tool)[0];
      expect(btn, tool).toBeTruthy();
      btn.props.onClick();
      vi.advanceTimersByTime(2000);
      expect(store.rocks.wb.pending && store.rocks.wb.pending.tool, tool).toBe(pendingTool);
      expect(store.rocks.wb.lens).toBe(false);
      expect(store.rocks.wb.streakObs == null).toBe(true);
      expect(store.rocks.wb.fizz == null).toBe(true);
      expect(store.rocks.wb.magnet == null).toBe(true);
      expect(Object.keys(store.rocks.wb.scratch || {})).toHaveLength(0);
    });
  });
});

describe('3D specimen option', () => {
  it('offers a 3D view from the lens card and renders a container or an honest fallback', () => {
    const on = markupOf({ spId: 'pyrite', pending: { tool: 'lens' }, view3d: true });
    expect(on).toContain('data-wb-view3d="on"');
    expect(on).toMatch(/data-wb-specimen-3d="(open|unavailable)"/);
  });

  it('builds the specimen scene on the host viewer shell with luster-driven materials', () => {
    PATHS.forEach((p) => {
      const src = readFileSync(p, 'utf8');
      expect(src).toContain('function rkBuildSpecimenScene(THREE, api)');
      expect(src).toContain("buildScene: rkBuildSpecimenScene");
      expect(src).toContain("metalness: 1.0, roughness: 0.28");
      expect(src).toContain("if ('transmission' in mat) mat.transmission");
      expect(src).toContain('function rkSpecimenRef(node)');
    });
  });

  it('keeps both served copies byte-identical', () => {
    expect(readFileSync(PATHS[0])).toEqual(readFileSync(PATHS[1]));
  });
});

describe('choice evidence icons', () => {
  it('draws a decorative icon of the mark each scratch, acid and magnet option names', () => {
    const scratch = markupOf({ spId: 'magnetite', pending: { tool: 'scratch', ref: 'steel_nail' } });
    ['scratched', 'no', 'borderline'].forEach((k) => expect(scratch).toContain(`data-wb-choice-tile="${k}"`));
    const acid = markupOf({ spId: 'calcite', pending: { tool: 'acid' } });
    expect(acid).toContain('data-wb-choice-tile="fizz"');
    expect(acid).toContain('data-wb-choice-tile="nofizz"');
    const magnet = markupOf({ spId: 'magnetite', pending: { tool: 'magnet' } });
    expect(magnet).toContain('data-wb-choice-tile="pull"');
    expect(magnet).toContain('data-wb-choice-tile="nopull"');
    expect(magnet).toMatch(/<svg[^>]*aria-hidden="true"[^>]*data-wb-choice-tile="pull"/);
  });
});

describe('form: the seventh evidence type, one derivation', () => {
  it('drives the drawing, the 3D geometry, the bench description and the filter from rkFormClass', () => {
    const src = readFileSync(ROCKS_FILE, 'utf8');
    const hand = src.slice(src.indexOf('function rkHandSpecimenSvg('), src.indexOf('function rkLensViewSvg('));
    const geo = src.slice(src.indexOf('function rkSpecimenGeometry('), src.indexOf('function rkSpecimenMaterial('));
    expect(hand).toContain('rkFormClass(mineral)');
    expect(hand).not.toMatch(/sys\.indexOf\('cubic'\)/);
    expect(geo).toContain('rkFormClass(m)');
    expect(src).toContain("return __alloT('stem.rocks.wb_form_' + rkFormClass(m) + '_sr', rkFormClassInfo(rkFormClass(m)).sr);");
    expect(src).toContain('test: function (m) { return rkFormClass(m) === wb.formObs; }');
  });

  it('offers seven form choices with icons and records the learner’s call', () => {
    const { store, node } = tree({ spId: 'calcite', pending: { tool: 'form' } });
    const markup = ReactDOMServer.renderToStaticMarkup(React.createElement(() => node));
    expect(markup).toContain('data-wb-observation-card="form"');
    ['blocky', 'rhombs', 'sheets', 'prism', 'pyramids', 'blades', 'ball', 'massive'].forEach((k) => {
      expect(markup).toContain(`data-wb-observe-choice="${k}"`);
      expect(markup).toContain(`data-wb-choice-tile="form-${k}"`);
    });
    expect(markup).toContain('data-wb-form-specimen="large"');
    choiceButton(node, 'rhombs').props.onClick();
    expect(store.rocks.wb.formObs).toBe('rhombs');
    const after = markupOf(store.rocks.wb);
    expect(after).toContain('Form: leaning blocks (rhombs) (your classification)');
    expect(after).toContain('data-wb-evidence-type="form" data-wb-evidence-state="measured"');
    expect(after).toContain('data-wb-candidate="calcite"');
    expect(after).not.toContain('data-wb-candidate="halite"'); // blocky, not rhombs
  });

  it('describes hematite as massive, talc as sheets and gypsum as a blade despite their crystal systems', () => {
    const massive = markupOf({ spId: 'hematite' });
    expect(massive).toContain('lumpy mass without flat faces');
    const sheets = markupOf({ spId: 'talc' });
    expect(sheets).toContain('stack of thin sheets');
    const blade = markupOf({ spId: 'gypsum' });
    expect(blade).toContain('thin, flat slab');
    // and the old system-name leak is gone
    expect(markupOf({ spId: 'halite' })).not.toContain('Cubic (Isometric) reference form');
  });

  it('keeps form out of the expected-split ranking so it never becomes a forced first move', () => {
    const fresh = markupOf({ spId: 'calcite', lens: 'glassy' });
    expect(fresh).toContain('data-wb-action-tool="balance"');
    expect(fresh).not.toContain('data-wb-action-tool="form"');
    expect(fresh).toContain('data-wb-tool="form"');
  });
});

describe('challenge set', () => {
  const CHALLENGE = POOL.concat(['diamond', 'garnet', 'olivine', 'sulfur', 'corundum', 'topaz']);

  it('every catalogue mineral now carries a density, so the balance works for all eighteen', () => {
    const src = readFileSync(ROCKS_FILE, 'utf8');
    CHALLENGE.forEach((id) => {
      const line = new RegExp(`\{ id: '${id}',[^\n]*`).exec(src)[0];
      expect(line, id).toMatch(/density: \d/);
    });
  });

  it('draws from the eighteen-mineral pool when the challenge set is chosen', () => {
    const { store, node } = tree({ spId: null, pool: 'challenge' });
    const open = findAll(node, (n) => n.type === 'button' && /Put a specimen/.test(JSON.stringify(n.props.children || '')))[0];
    expect(open, 'open button').toBeTruthy();
    open.props.onClick();
    expect(store.rocks.wb.order).toHaveLength(18);
    expect(CHALLENGE).toContain(store.rocks.wb.spId);
    const standard = tree({ spId: null });
    findAll(standard.node, (n) => n.type === 'button' && /Put a specimen/.test(JSON.stringify(n.props.children || '')))[0].props.onClick();
    expect(standard.store.rocks.wb.order).toHaveLength(12);
  });

  it('gives sulfur a pale-yellow streak choice and garnet a many-faced ball form, and keeps both identifiable', () => {
    const sulfur = markupOf({ spId: 'sulfur', order: CHALLENGE, streakDone: true, pending: { tool: 'streak' } });
    expect(sulfur).toContain('data-wb-observe-choice="powder-white-yellow"');
    const sulfurKept = markupOf({ spId: 'sulfur', order: CHALLENGE, streakDone: true, streakObs: 'powder-white-yellow' });
    expect(sulfurKept).toContain('data-wb-candidate="sulfur"');
    expect(sulfurKept).toContain('1 still fit');
    const garnet = markupOf({ spId: 'garnet', order: CHALLENGE, formObs: 'ball' });
    expect(garnet).toContain('data-wb-candidate="garnet"');
    expect(garnet).toContain('1 still fit');
  });

  it('makes the plate alone insufficient: four challenge minerals groove it, so hardness references must split them', () => {
    const grooved = markupOf({ spId: 'topaz', order: CHALLENGE, streakDone: true, streakObs: 'plate-scratched' });
    expect(grooved).toContain('5 still fit'); // quartz, garnet, diamond, corundum, topaz
    const bracketed = markupOf({ spId: 'topaz', order: CHALLENGE, streakDone: true, streakObs: 'plate-scratched', scratch: { drill_bit: 'scratched' } });
    expect(bracketed).toContain('3 still fit'); // softer than the 8.5 point: quartz, garnet, topaz
  });

  it('exposes the set picker on the intro and a next-draw toggle in the notebook', () => {
    const intro = markupOf({ spId: null });
    expect(intro).toContain('data-wb-pool="standard"');
    expect(intro).toContain('data-wb-pool="challenge"');
    const bench = markupOf({ spId: 'calcite' });
    expect(bench).toContain('data-wb-pool-toggle="standard"');
  });
});

describe('candidate portholes and canvas i18n', () => {
  it('shows each candidate under the same lens once luster is recorded, and not before', () => {
    expect(markupOf({ spId: 'calcite' })).not.toContain('data-wb-candidate-porthole=');
    const after = markupOf({ spId: 'calcite', lens: 'glassy' });
    expect(after).toContain('data-wb-candidate-porthole="calcite"');
    expect(after).toContain('data-wb-candidate-porthole="quartz"');
    expect(after).not.toContain('data-wb-candidate-porthole="pyrite"'); // eliminated, not on the shortlist
  });

  it('routes every label painted on the landscape canvas through the translation wrapper', () => {
    const src = readFileSync(ROCKS_FILE, 'utf8');
    const scene = src.slice(src.indexOf('function drawLandscape() {'), src.indexOf('let animId = null;'));
    const bare = [...scene.matchAll(/(?:fillText|rkLsPill)\(\s*'([^']+)'/g)].map((m) => m[1]).filter((t) => !/^🪨 $/.test(t));
    expect(bare, 'canvas text without __alloT:\n  ' + bare.join('\n  ')).toEqual([]);
    const tour = src.slice(src.indexOf('var RK_LS_TOUR = ['), src.indexOf('function rkLsTourPaths'));
    expect(tour).not.toMatch(/cap: '/);
  });
});
