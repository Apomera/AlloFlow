// Cell Simulator — "Stem Cells & Specialization" mode (id 'stemcells').
//
// WHAT THIS PINS
//  1. The mode is reachable: every wiring site names it (activity search, category
//     hint, label maps, the Interactive category list, allModes, the hero band and
//     the render dispatch), and the hub / category / search UIs actually offer it.
//  2. It renders in every grade band and every section without throwing, without
//     printing "undefined"/"NaN", with real content (>800 chars, >3 buttons) —
//     the same floor tests/e2e/48-cell-every-mode-renders.spec.ts applies.
//  3. Clinical content (transplants, trials, clinics) never reaches K-2 or 3-5.
//  4. Predict-then-check answers are balanced across slots with no length cue,
//     and the gene switchboard logic matches the model it teaches.
//  5. Malformed saved state (old saves, hand edits) is tolerated.
//  6. Interactions update state, award XP once, and the canvas loop cleans up.
//
// Location-independent: every repo path is built from process.cwd() (the repo root),
// and the tool is read via stem_lab/stem_tool_cell.js so a redirect harness applies.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const req = createRequire(resolve(process.cwd(), 'tests/_stemcell_anchor.js'));
const React = req(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
const { createRoot } = req(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
const { flushSync } = req(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom'));

const SRC = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_cell.js'), 'utf8');
const BANDS = { k2: 'K', g35: '4', g68: '7', g912: '10' };
const TABS = ['landscape', 'ladder', 'genes', 'reprogram', 'uses', 'check'];
const CLINICAL = /transplant|leukemia|lymphoma|cancer|clinical trial|clinics?\b|FDA|Parkinson|retina|harm/i;
let H; let P;

beforeAll(async () => {
  H = await import(pathToFileURL(resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js')).href);
  H.resetStemLab();
  H.loadTool('stem_lab/stem_tool_cell.js', 'cell');
  P = window.__alloCellStemPure;
});

function section(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  const el = host.querySelector('[data-cell-stemcell]');
  if (el) el.querySelectorAll('style').forEach((s) => s.remove());
  return el;
}
function renderMode(stemState, band) {
  return H.renderTool('cell', { cell: { mode: 'stemcells', _cellPicked: true, _stemcell: stemState } }, { gradeLevel: BANDS[band || 'g35'] });
}
// The section alone (fast): same renderer the dispatch calls, with the band flags it passes.
function renderSection(stemState, band) {
  const b = band || 'g35';
  return H.ReactDOMServer.renderToStaticMarkup(P.renderStemCellLab(H.React.createElement, stemState, { band: b, clinical: b === 'g68' || b === 'g912' }));
}
function text(el) { return (el.textContent || '').replace(/\s+/g, ' ').trim(); }

describe('stem cell mode — reachable from every wiring site', () => {
  it('is named in every place the tool enumerates modes', () => {
    expect(SRC).toContain("stemcells: ['Stem Cells', ");
    expect(SRC).toContain("stemcells: 'interactive',");
    expect(SRC).toContain("stemcells: 'Stem Cells',");
    expect(SRC).toContain("modes: ['observe', 'interior', 'microdissection', 'processes', 'osmoHunt', 'play', 'quiz', 'stemcells'] },");
    expect(SRC).toContain("stemcells: '🌱 Stem Cells',");
    expect(SRC).toContain("'play','quiz','stemcells','encyclopedia'");
    expect(SRC).toContain("stemcells: { accent: '#0f766e'");
    expect(SRC).toContain("d.mode === 'stemcells' && renderStemCellLab(React.createElement, d._stemcell, {");
    // Neighbouring pins other suites rely on stay intact.
    expect(SRC).toContain("'glossary','library','finale'");
    expect(SRC).toContain("modes: ['glossary', 'library', 'finale'] }");
  });

  it('is found by activity search and offered by the category and search UIs', () => {
    const C = window.__alloCellPure;
    expect(C.CELL_ACTIVITY_META.stemcells[0]).toBe('Stem Cells');
    expect(C.cellActivitySearch('pluripotent')).toEqual(['stemcells']);
    expect(C.cellActivitySearch('differentiation')).toContain('stemcells');
    const cat = H.renderTool('cell', { cell: { mode: 'observe', _cellPicked: true, _cellCategory: 'interactive' } });
    expect(cat).toContain('🌱 Stem Cells');
    const search = H.renderTool('cell', { cell: { mode: 'observe', _cellSearch: 'stem cell' } });
    expect(search).toContain('🌱 Stem Cells');
    const hub = H.renderTool('cell', { cell: {} });
    expect(hub).toContain('8 modes');
  });

  it('labels the header and hero band for the mode', () => {
    const html = renderMode({}, 'g35');
    expect(html).toContain('data-cell-current-activity="true"');
    expect(html).toMatch(/data-cell-current-activity="true"[^>]*>Stem Cells</);
    expect(html).toContain('Stem Cells - one genome, many cell types');
  });
});

describe('stem cell mode — renders in every band and section', () => {
  for (const band of Object.keys(BANDS)) {
    for (const tab of TABS) {
      it(`${band} / ${tab}: real content, no raw values`, () => {
        const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
        const html = renderSection({ tab }, band);
        const calls = errors.mock.calls.map((c) => String(c[0]).slice(0, 200));
        errors.mockRestore();
        expect(calls, 'render logged an error').toEqual([]);
        const el = section(html);
        expect(el, 'stem cell section rendered').toBeTruthy();
        expect(el.getAttribute('data-sc-band')).toBe(band);
        expect(el.getAttribute('data-sc-active-tab')).toBe(tab);
        const t = text(el);
        expect(t.length, `${band}/${tab} chars`).toBeGreaterThan(800);
        expect(el.querySelectorAll('button').length).toBeGreaterThan(3);
        expect(t).not.toMatch(/undefined|\bNaN\b|\[object Object\]/);
        // Every control is a real button with a type, and every image has a name.
        el.querySelectorAll('button').forEach((b) => expect(b.getAttribute('type')).toBe('button'));
        el.querySelectorAll('[role="img"]').forEach((g) => expect((g.getAttribute('aria-label') || '').length).toBeGreaterThan(3));
      });
    }
  }

  it('renders through the real tool dispatch in every band, gating clinical content by grade', () => {
    for (const band of Object.keys(BANDS)) {
      const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
      const html = renderMode({ tab: 'uses' }, band);
      const logged = errors.mock.calls.length;
      errors.mockRestore();
      expect(logged, `${band}: tool render logged errors`).toBe(0);
      const el = section(html);
      expect(el, band).toBeTruthy();
      expect(el.getAttribute('data-sc-band')).toBe(band);
      const t = text(el);
      expect(t).not.toMatch(/undefined|\bNaN\b/);
      if (band === 'k2' || band === 'g35') expect(t).not.toMatch(CLINICAL);
      else expect(t).toMatch(/transplant/i);
    }
    // The dispatch must tolerate a corrupted bucket of any shape.
    for (const junk of ['oops', [1, 2], 7, null]) {
      const el = section(renderMode(junk, 'g68'));
      expect(el).toBeTruthy();
      expect(text(el)).not.toMatch(/undefined|\bNaN\b/);
    }
  });

  it('renders every landscape node (all 19) in every band', () => {
    for (const band of Object.keys(BANDS)) {
      for (const node of Object.keys(P.SC_NODES)) {
        const el = section(renderSection({ node }, band));
        expect(el, node).toBeTruthy();
        const t = text(el);
        expect(t, `${band}/${node}`).not.toMatch(/undefined|\bNaN\b/);
        expect(el.querySelector('[data-sc-now]').getAttribute('data-sc-now')).toBe(node);
        const kids = P.scChildren(node);
        expect(el.querySelectorAll('[data-sc-choice]').length).toBe(kids.length);
      }
    }
  });
});

describe('stem cell mode — grade gating', () => {
  it('keeps clinical content out of K-2 and 3-5, and shows it to 6-12', () => {
    for (const band of ['k2', 'g35']) {
      for (const tab of TABS) {
        const t = text(section(renderSection({ tab, from: 'rbc' }, band)));
        expect(t, `${band}/${tab}`).not.toMatch(CLINICAL);
      }
    }
    for (const band of ['g68', 'g912']) {
      const t = text(section(renderSection({ tab: 'uses' }, band)));
      expect(t).toMatch(/transplant/i);
      expect(t).toMatch(/Myth or fact/);
    }
  });

  it('gives the reprogramming detail (factor names) to grades 6-12 only', () => {
    expect(text(section(renderSection({ tab: 'reprogram' }, 'g35')))).not.toMatch(/Sox2|Klf4|c-Myc/);
    expect(text(section(renderSection({ tab: 'reprogram' }, 'g68')))).toMatch(/Oct4.*Sox2.*Klf4.*c-Myc/);
    const hs = text(section(renderSection({ tab: 'reprogram' }, 'g912')));
    expect(hs).toMatch(/Gurdon/);
    expect(hs).toMatch(/Thomson/);
  });

  it('keeps the ethics note to grades 9-12', () => {
    expect(text(section(renderSection({ tab: 'uses' }, 'g68')))).not.toMatch(/IVF/);
    expect(text(section(renderSection({ tab: 'uses' }, 'g912')))).toMatch(/IVF/);
  });
});

describe('stem cell mode — predict-then-check items', () => {
  const severe = (choices, k) => {
    const lens = choices.map((c) => c.length);
    const longestWrong = Math.max(...lens.filter((_, i) => i !== k));
    return lens[k] >= longestWrong + 20 && lens[k] >= longestWrong * 1.75;
  };
  for (const band of Object.keys(BANDS)) {
    it(`${band}: balanced answer slots and no length cue`, () => {
      const items = P.stemCellChecksFor(band);
      expect(items.length).toBeGreaterThanOrEqual(3);
      const slots = [0, 0, 0, 0];
      let longest = 0;
      items.forEach((it, k) => {
        expect(it.choices.length).toBe(4);
        const arr = P.stemCellArrangeChoices(it, k, band);
        const texts = arr.choices.map((c) => c.text);
        expect(new Set(texts).size).toBe(4);
        texts.forEach((x) => expect(x.length).toBeGreaterThan(2));
        expect(arr.choices[arr.correct].authored).toBe(0);
        expect(arr.choices.map((c) => c.authored).sort()).toEqual([0, 1, 2, 3]);
        slots[arr.correct]++;
        expect(severe(texts, arr.correct), `length cue: ${it.id}`).toBe(false);
        const lens = texts.map((x) => x.length);
        if (lens[arr.correct] > Math.max(...lens.filter((_, i) => i !== arr.correct))) longest++;
        expect(P.scT(it.why, band).length).toBeGreaterThan(30);
      });
      expect(Math.max(...slots) - Math.min(...slots), slots.join('/')).toBeLessThanOrEqual(1);
      expect(longest / items.length, 'correct answer is the longest too often').toBeLessThanOrEqual(0.34);
    });
  }

  it('does not deal answers in a guessable A-B-C-D cycle', () => {
    const items = P.stemCellChecksFor('g912');
    const slots = items.map((it, k) => P.stemCellArrangeChoices(it, k, 'g912').correct);
    const cyclic = slots.every((s, k) => k === 0 || s === (slots[k - 1] + 1) % 4);
    expect(cyclic, slots.join(',')).toBe(false);
    // Never the same slot three times running.
    for (let k = 2; k < slots.length; k++) expect(slots[k] === slots[k - 1] && slots[k] === slots[k - 2]).toBe(false);
  });

  it('balances the mystery-cell puzzles and keeps every choice distinct', () => {
    const slots = [0, 0, 0, 0];
    for (let i = 0; i < P.SC_TYPES.length; i++) {
      const p = P.stemCellSwitchPuzzle(i);
      expect(new Set(p.choices).size).toBe(4);
      expect(p.choices[p.correct]).toBe(p.target);
      expect(p.target).toBe(P.SC_TYPES[i]);
      slots[p.correct]++;
    }
    expect(Math.max(...slots) - Math.min(...slots)).toBeLessThanOrEqual(1);
    expect(P.stemCellSwitchPuzzle(-1).target).toBe(P.SC_TYPES[P.SC_TYPES.length - 1]);
    expect(P.stemCellSwitchPuzzle('junk').target).toBe(P.SC_TYPES[0]);
  });
});

describe('stem cell mode — gene switchboard logic', () => {
  it('derives one signature gene plus housekeeping genes for each type', () => {
    const seen = new Set();
    for (const t of P.SC_TYPES) {
      const p = P.stemCellPattern(t);
      expect(p).toContain('actin');
      expect(p).toContain('ribo');
      expect(p.length).toBe(3);
      const key = p.slice().sort().join(',');
      expect(seen.has(key), t).toBe(false);
      seen.add(key);
    }
    expect(P.stemCellPattern('rbc')).toContain('hb');
    expect(P.stemCellPattern('beta')).toContain('ins');
    expect(P.stemCellPattern('hepatocyte')).toContain('alb');
    expect(P.stemCellPattern('neuron')).toContain('nf');
    expect(P.stemCellPattern('es')).toContain('oct4');
    expect(P.stemCellPattern('nope')).toEqual([]);
  });

  it('matches an expression pattern to exactly one cell type', () => {
    for (const t of P.SC_TYPES) expect(P.stemCellGeneMatch(P.stemCellPattern(t)).exact).toBe(t);
    const noisy = P.stemCellGeneMatch(['actin', 'ribo', 'hb', 'ins']);
    expect(noisy.exact).toBeNull();
    expect(noisy.missing).toEqual([]);
    expect(noisy.extra.length).toBe(1);
    expect(P.stemCellGeneMatch(['hb', 'hb', 'bogus', 7]).exact).toBeNull();
  });

  it('explains which switches are wrong for a target', () => {
    expect(P.stemCellBuildCheck('rbc', ['actin', 'ribo', 'hb'])).toEqual({ correct: true, missing: [], extra: [] });
    const r = P.stemCellBuildCheck('rbc', ['ribo', 'hb', 'ins']);
    expect(r.correct).toBe(false);
    expect(r.missing).toEqual(['actin']);
    expect(r.extra).toEqual(['ins']);
    expect(P.stemCellBuildCheck('dragon', ['actin']).correct).toBe(false);
  });
});

describe('stem cell mode — landscape model', () => {
  it('deepens valleys downhill and separates every fate at the front', () => {
    expect(P.stemCellRidgeHeight(0.2)).toBeLessThan(P.stemCellRidgeHeight(0.5));
    expect(P.stemCellRidgeHeight(0.5)).toBeLessThan(P.stemCellRidgeHeight(0.95));
    const front = P.SC_LEAVES.map((id) => P.scValleyU(P.scChain(id), 1));
    for (let i = 1; i < front.length; i++) expect(front[i] - front[i - 1]).toBeGreaterThan(0.08);
    // Every leaf valley starts on the shared plateau.
    P.SC_LEAVES.forEach((id) => expect(P.scValleyU(P.scChain(id), 0.05)).toBeCloseTo(0.5, 6));
  });

  it('keeps a child valley on its parent until the branch point', () => {
    expect(P.scValleyU(P.scChain('rbc'), 0.6)).toBeCloseTo(P.scValleyU(P.scChain('blood'), 0.6), 6);
    expect(P.scValleyU(P.scChain('blood'), 0.4)).toBeCloseTo(P.scValleyU(P.scChain('meso'), 0.4), 6);
    expect(P.scChain('neuron')).toEqual(['root', 'ecto', 'neural', 'neuron']);
    expect(P.scLeavesUnder('blood')).toEqual(['rbc', 'neutrophil']);
    expect(P.scLeavesUnder('root').length).toBe(8);
  });

  it('only lets nucleated cells climb back to pluripotency', () => {
    expect(P.stemCellClimb(['oct4', 'sox2', 'klf4', 'cmyc'], 'fibroblast', 'g68')).toBe(1);
    expect(P.stemCellClimb(['oct4', 'sox2', 'klf4', 'cmyc'], 'rbc', 'g68')).toBe(0);
    expect(P.stemCellClimb(['oct4'], 'fibroblast', 'g68')).toBeGreaterThan(0);
    expect(P.stemCellClimb(['oct4'], 'fibroblast', 'g68')).toBeLessThan(P.stemCellClimb(['oct4', 'sox2'], 'fibroblast', 'g68'));
    expect(P.stemCellClimb(['oct4', 'sox2', 'klf4'], 'fibroblast', 'g912')).toBeLessThan(1);
  });
});

describe('stem cell mode — malformed saved state', () => {
  const junk = [null, 'string', 42, [], [1, 2], { node: 'toString', tab: 5, reached: 'all', answers: [1], xp: null, puzzle: -5 },
    { node: '__proto__', tab: 'constructor', reached: ['rbc', 'rbc', 'zzz', 3], renew: Infinity, nudge: 'x', factors: ['oct4', 'oct4', 'bad'], from: {}, answers: { 'dna-same': 9, epo: 1.5, fused: '2' }, myths: { clinic: 'maybe', transplant: 'fact' }, pick: 'toString', buildOn: 'hb', notice: { a: 1 } }];
  it('normalizes anything into a safe state', () => {
    for (const raw of junk) {
      const s = P.stemCellState(raw);
      expect(Object.keys(P.SC_NODES)).toContain(s.node);
      expect(TABS).toContain(s.tab);
      expect(Array.isArray(s.reached)).toBe(true);
      expect(Number.isInteger(s.renew)).toBe(true);
      expect(Number.isInteger(s.puzzle) && s.puzzle >= 0).toBe(true);
      expect(typeof s.notice).toBe('string');
    }
    const s = P.stemCellState(junk[junk.length - 1]);
    expect(s.reached).toEqual(['rbc']);
    expect(s.factors).toEqual(['oct4']);
    expect(s.answers).toEqual({ fused: 2 });
    expect(s.myths).toEqual({ transplant: 'fact' });
    expect(s.pick).toBeNull();
    expect(s.renew).toBe(0);
  });
  it('renders every section from malformed state without raw values', () => {
    for (const raw of junk) {
      for (const tab of TABS) {
        const state = raw && typeof raw === 'object' && !Array.isArray(raw) ? Object.assign({}, raw, { tab }) : raw;
        const el = section(renderSection(state, 'g912'));
        expect(el).toBeTruthy();
        expect(text(el)).not.toMatch(/undefined|\bNaN\b|\[object Object\]/);
      }
    }
  });
});

describe('stem cell mode — interactions (React DOM)', () => {
  let host; let root; let state; let api; let calls;
  function mount(band, initial) {
    state = initial || {};
    calls = { xp: [], sound: [], announce: [], interior: [] };
    api = {
      band, clinical: band === 'g68' || band === 'g912',
      update(mut) { state = mut(Object.assign({}, state)); draw(); },
      xp(id, n) { calls.xp.push([id, n]); }, sound(t) { calls.sound.push(t); }, announce(t) { calls.announce.push(t); },
      toast() {}, openInterior(type, spec) { calls.interior.push([type, spec]); }
    };
    host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); draw();
  }
  function draw() { flushSync(() => root.render(P.renderStemCellLab(React.createElement, state, api))); }
  function click(sel) { const b = host.querySelector(sel); expect(b, sel).toBeTruthy(); b.click(); }
  afterEach(() => { if (root) flushSync(() => root.unmount()); if (host) host.remove(); root = null; host = null; });
  beforeAll(() => { HTMLCanvasElement.prototype.getContext = function () { return null; }; });

  it('rolls a cell to a fate, awarding XP once and offering the Inside the Cell lens', () => {
    mount('g68');
    click('[data-sc-choice="ecto"]');
    expect(state.node).toBe('ecto');
    click('[data-sc-choice="neural"]');
    click('[data-sc-action="renew"]');
    click('[data-sc-action="renew"]');
    expect(state.renew).toBe(2);
    click('[data-sc-choice="neuron"]');
    expect(state.node).toBe('neuron');
    expect(state.reached).toEqual(['neuron']);
    expect(state.renew).toBe(0);
    expect(calls.xp).toEqual([['cell_stem_fate_neuron', 5]]);
    expect(host.querySelector('[data-sc-now]').textContent).toContain('dendrites');
    click('[data-sc-interior="neuron"]');
    expect(calls.interior).toEqual([['animal', 'neuron']]);
    click('[data-sc-action="restart"]');
    expect(state.node).toBe('root');
    ['ecto', 'neural', 'neuron'].forEach((id) => click(`[data-sc-choice="${id}"]`));
    expect(calls.xp.length).toBe(1);
    // Choices that are not children of the current node do nothing.
    click('[data-sc-action="back"]');
    expect(state.node).toBe('neural');
    click('[data-sc-action="nudge"]');
    expect(state.nudge).toBe(1);
  });

  it('awards the all-fates bonus once every valley has been reached', () => {
    mount('g35');
    for (const leaf of P.SC_LEAVES) {
      P.scChain(leaf).slice(1).forEach((id) => click(`[data-sc-choice="${id}"]`));
      click('[data-sc-action="restart"]');
    }
    expect(state.reached.length).toBe(8);
    expect(calls.xp.filter((x) => x[0] === 'cell_stem_allfates').length).toBe(1);
    expect(calls.sound).toContain('badge');
  });

  it('grades the mystery cell and fills the expression map', () => {
    mount('g35', { tab: 'genes', puzzle: 3 });
    const p = P.stemCellSwitchPuzzle(3);
    click(`[data-sc-pick="${p.target}"]`);
    expect(state.solved).toEqual([p.target]);
    expect(host.querySelector('.sc-feedback.is-right')).toBeTruthy();
    expect(host.querySelectorAll('.sc-matrix td.is-on').length).toBe(3);
    // Coming round to the same mystery cell again does not pay XP twice.
    state.puzzle = 3 + P.SC_TYPES.length; state.pick = null; draw();
    expect(P.stemCellSwitchPuzzle(state.puzzle).target).toBe(p.target);
    click(`[data-sc-pick="${p.target}"]`);
    expect(calls.xp.filter((x) => x[0] === 'cell_stem_gene_' + p.target).length).toBe(1);
    state.puzzle = 3; draw();
    click('[data-sc-action="next-puzzle"]');
    expect(state.puzzle).toBe(4);
    const q = P.stemCellSwitchPuzzle(4);
    const wrong = q.choices.find((c) => c !== q.target);
    click(`[data-sc-pick="${wrong}"]`);
    expect(state.solved).toEqual([p.target]);
    expect(host.querySelector('.sc-feedback.is-wrong').textContent).toContain('would have');
    // Build mode
    click('[data-sc-target="beta"]');
    ['actin', 'ribo', 'ins'].forEach((g) => click(`[data-sc-gene="${g}"]`));
    click('[data-sc-action="build-check"]');
    expect(state.built).toEqual(['beta']);
    click('[data-sc-gene="hb"]');
    click('[data-sc-action="build-check"]');
    expect(host.querySelector('.sc-build .sc-feedback').textContent).toContain('Switch OFF: Hemoglobin');
  });

  it('reprograms a fibroblast but not a red blood cell', () => {
    mount('g68', { tab: 'reprogram' });
    ['oct4', 'sox2', 'klf4'].forEach((f) => click(`[data-sc-factor="${f}"]`));
    expect(calls.xp).toEqual([]);
    click('[data-sc-factor="cmyc"]');
    expect(state.factors.length).toBe(4);
    expect(calls.xp).toEqual([['cell_stem_ips', 10]]);
    expect(host.querySelector('canvas[data-sc-mode="reprogram"]').getAttribute('data-sc-done')).toBe('1');
    click('[data-sc-from="rbc"]');
    expect(state.factors).toEqual([]);
    click('[data-sc-factor="oct4"]');
    expect(state.tremble).toBe(1);
    expect(host.querySelector('canvas[data-sc-mode="reprogram"]').getAttribute('data-sc-climb')).toBe('0.000');
    expect(host.querySelector('.sc-result').textContent).toMatch(/no nucleus/);
  });

  it('records predictions once and explains them', () => {
    mount('g68', { tab: 'check' });
    const first = host.querySelector('[data-sc-check]');
    const id = first.getAttribute('data-sc-check');
    first.querySelector('[data-sc-check-choice="2"]').click();
    expect(state.answers[id]).toBe(2);
    first.querySelector('[data-sc-check-choice="0"]').click();
    expect(state.answers[id]).toBe(2);
    expect(host.querySelector(`[data-sc-check="${id}"] .sc-feedback.is-wrong`)).toBeTruthy();
    const second = host.querySelectorAll('[data-sc-check]')[1];
    second.querySelector('[data-sc-check-choice="0"]').click();
    expect(calls.xp.length).toBe(1);
    mount('g68', { tab: 'uses' });
    click('[data-sc-myth="clinic"] [data-sc-myth-choice="myth"]');
    expect(state.myths).toEqual({ clinic: 'myth' });
    expect(host.querySelector('[data-sc-myth="clinic"] .sc-feedback.is-right')).toBeTruthy();
  });

  it('switches sections with pressed-state buttons', () => {
    mount('k2');
    TABS.forEach((t) => {
      click(`[data-sc-tab="${t}"]`);
      expect(state.tab).toBe(t);
      expect(host.querySelector(`[data-sc-tab="${t}"]`).getAttribute('aria-pressed')).toBe('true');
    });
  });
});

describe('stem cell mode — canvas loop lifecycle', () => {
  it('starts one loop per canvas, pauses when hidden, and cleans up on unmount', async () => {
    const ctx2d = new Proxy({}, { get: (t, k) => (k === 'measureText' ? () => ({ width: 40 }) : k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {}) });
    const realGet = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function () { return ctx2d; };
    const added = []; const removed = [];
    const realAdd = document.addEventListener.bind(document); const realRemove = document.removeEventListener.bind(document);
    document.addEventListener = (type, fn, o) => { if (type === 'visibilitychange') added.push(fn); return realAdd(type, fn, o); };
    document.removeEventListener = (type, fn, o) => { if (type === 'visibilitychange') removed.push(fn); return realRemove(type, fn, o); };
    const observers = [];
    const realIO = globalThis.IntersectionObserver;
    const fakeIO = function (cb) { const o = { cb, observe() {}, disconnect() { o.off = true; } }; observers.push(o); return o; };
    globalThis.IntersectionObserver = fakeIO; window.IntersectionObserver = fakeIO;
    const raf = []; const realRaf = globalThis.requestAnimationFrame; const realCaf = globalThis.cancelAnimationFrame;
    const fakeRaf = (fn) => { raf.push(fn); return raf.length; };
    globalThis.requestAnimationFrame = fakeRaf; window.requestAnimationFrame = fakeRaf;
    globalThis.cancelAnimationFrame = () => {}; window.cancelAnimationFrame = globalThis.cancelAnimationFrame;
    try {
      const host = document.createElement('div'); document.body.appendChild(host);
      const root = createRoot(host);
      flushSync(() => root.render(P.renderStemCellLab(React.createElement, { tab: 'landscape' }, { band: 'g35' })));
      const cv = host.querySelector('canvas[data-cell-stemcell-canvas]');
      expect(cv).toBeTruthy();
      expect(added.length).toBe(1);
      expect(observers.length).toBe(1);
      // Off-screen: the loop must not schedule frames.
      const before = raf.length;
      observers[0].cb([{ isIntersecting: false }]);
      cv.setAttribute('data-sc-node', 'ecto');
      await Promise.resolve();
      expect(raf.length).toBe(before);
      flushSync(() => root.unmount());
      await new Promise((r) => setTimeout(r, 5));
      expect(removed).toContain(added[0]);
      expect(observers[0].off).toBe(true);
      host.remove();
    } finally {
      HTMLCanvasElement.prototype.getContext = realGet;
      document.addEventListener = realAdd; document.removeEventListener = realRemove;
      globalThis.IntersectionObserver = realIO; window.IntersectionObserver = realIO;
      globalThis.requestAnimationFrame = realRaf; window.requestAnimationFrame = realRaf;
      globalThis.cancelAnimationFrame = realCaf; window.cancelAnimationFrame = realCaf;
    }
  });
});
