// Concept Recall — the retrieval half of the loci loop for the 3D Concept Space.
//
// Furnishing a concept space produces memory cues; until now nothing consumed them,
// so the imagery was decorative. This game covers every node label and makes the
// generated art the only cue. It reuses the Memory Palace's pure recall helpers
// rather than growing a second, subtly-different scoring rule — those helpers only
// need {loci:[{id,label}]}, so a concept space shapes itself into that.
//
// What is pinned here: (1) the palace helpers genuinely accept the concept-space
// shape, (2) the label-covering seam exists in the renderer with its texture
// disposal intact, (3) art carries the mnemonic through normalization so the cue has
// an accessible text description, (4) the scoring contract the UI depends on.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let MP, CG3D;
beforeAll(() => {
  window.AlloModules = window.AlloModules || {};
  ['MemoryPalace', 'ConceptGraph3D'].forEach((k) => { delete window.AlloModules[k]; });
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'memory_palace_module.js'), 'utf8'))();
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'concept_graph_3d_module.js'), 'utf8'))();
  MP = window.AlloModules.MemoryPalace;
  CG3D = window.AlloModules.ConceptGraph3D;
  if (!MP || !CG3D) throw new Error('modules did not register (anchor changed?)');
});

// A concept space shaped into the palace's locus contract.
const SPACE = {
  loci: [
    { id: 'b0_i1', label: 'Evaporation' },
    { id: 'b0_i2', label: 'Condensation' },
    { id: 'b1_i1', label: 'Precipitation' },
    { id: 'b1_i2', label: 'Collection' },
  ],
};

describe('the palace recall helpers accept a concept space', () => {
  it('builds a bank covering every node exactly once', () => {
    const bank = MP.buildRecallBank(SPACE, 7);
    expect(bank.map((b) => b.id).sort()).toEqual(['b0_i1', 'b0_i2', 'b1_i1', 'b1_i2']);
  });

  it('is deterministic for a seed and varies between seeds', () => {
    const a = MP.buildRecallBank(SPACE, 7).map((b) => b.id);
    expect(MP.buildRecallBank(SPACE, 7).map((b) => b.id)).toEqual(a);
    // Not a guarantee for every pair of seeds, but these two must differ or the
    // shuffle is not doing anything across runs.
    const b = MP.buildRecallBank(SPACE, 991).map((b2) => b2.id);
    expect(b).not.toEqual(a);
  });

  it('offers a choice set that always contains the right answer', () => {
    SPACE.loci.forEach((l) => {
      const choices = MP.buildLocusChoices(SPACE, l.id, { seed: 5 });
      expect(choices.length).toBeGreaterThan(1);
      expect(choices.some((c) => c.label === l.label)).toBe(true);
    });
  });

  it('keeps the choice set the same size for the last node as the first', () => {
    // The bug this guards is a bank that shrinks as answers are used up, leaving the
    // final question a forced single choice that scores as a perfect recall.
    const first = MP.buildLocusChoices(SPACE, 'b0_i1', { seed: 5 }).length;
    const last = MP.buildLocusChoices(SPACE, 'b1_i2', { seed: 5 }).length;
    expect(last).toBe(first);
  });

  it('matches answers tolerantly but does not accept a different concept', () => {
    expect(MP.matchAnswer('Evaporation', 'evaporation')).toBe(true);
    expect(MP.matchAnswer('Evaporation', 'Evaporatoin')).toBe(true);   // transposition
    expect(MP.matchAnswer('Evaporation', 'Condensation')).toBe(false);
    expect(MP.matchAnswer('Evaporation', '')).toBe(false);
  });
});

describe('scoring contract the recall UI depends on', () => {
  it('separates first-try, eventual, and revealed', () => {
    const s = MP.scoreRecall({
      a: { correct: true, attempts: 1 },
      b: { correct: true, attempts: 2 },
      c: { correct: false, attempts: 3, revealed: true },
    });
    expect(s.total).toBe(3);
    expect(s.firstTry).toBe(1);
    expect(s.eventual).toBe(1);
    expect(s.revealed).toBe(1);
    expect(s.points).toBe(15);      // 10 + 5 + 0
    expect(s.perfect).toBe(false);
  });

  it('awards nothing for a run that was entirely revealed', () => {
    const s = MP.scoreRecall({ a: { revealed: true }, b: { revealed: true } });
    expect(s.points).toBe(0);
    expect(s.perfect).toBe(false);
  });

  it('only calls a run perfect when every node was named first try', () => {
    expect(MP.scoreRecall({ a: { correct: true, attempts: 1 } }).perfect).toBe(true);
    expect(MP.scoreRecall({ a: { correct: true, attempts: 2 } }).perfect).toBe(false);
    expect(MP.scoreRecall({}).perfect).toBe(false);   // an empty run is not a win
  });
});

describe('node art carries its description through normalization', () => {
  const norm = (m) => CG3D.normalizeNodeArt(m);
  const RECIPE = { parts: [{ kind: 'box' }] };

  it('keeps a mnemonic alongside a sculpture', () => {
    const out = norm({ a: { type: 'sculpture', recipe: RECIPE, mnemonic: 'A kettle screaming into a hot sky' } });
    expect(out.a.mnemonic).toBe('A kettle screaming into a hot sky');
    expect(out.a.recipe).toBeTruthy();
  });

  it('keeps a mnemonic alongside an image', () => {
    const out = norm({ a: { type: 'image', dataUrl: 'data:image/png;base64,AAAA', mnemonic: 'A cloud wringing itself out' } });
    expect(out.a.mnemonic).toBe('A cloud wringing itself out');
  });

  it('omits the field entirely for hand-made art rather than storing an empty one', () => {
    const out = norm({ a: { type: 'sculpture', recipe: RECIPE } });
    expect('mnemonic' in out.a).toBe(false);
    const blank = norm({ a: { type: 'sculpture', recipe: RECIPE, mnemonic: '   ' } });
    expect('mnemonic' in blank.a).toBe(false);
  });

  it('rejects a non-string mnemonic and caps a runaway one', () => {
    const hostile = norm({ a: { type: 'sculpture', recipe: RECIPE, mnemonic: { evil: true } } });
    expect('mnemonic' in hostile.a).toBe(false);
    const long = norm({ a: { type: 'sculpture', recipe: RECIPE, mnemonic: 'x'.repeat(500) } });
    expect(long.a.mnemonic.length).toBe(240);
  });

  it('still drops art that was invalid, mnemonic or not', () => {
    expect(norm({ a: { type: 'image', dataUrl: 'javascript:alert(1)', mnemonic: 'nice try' } })).toEqual({});
    expect(norm({ a: { type: 'sculpture', recipe: null, mnemonic: 'nice try' } })).toEqual({});
  });
});

describe('renderer label-covering seam', () => {
  const src = readFileSync(resolve(process.cwd(), 'concept_graph_3d_module.js'), 'utf8');

  it('exposes cover/reveal on the handle, including the WebGL-fallback handle', () => {
    // The fallback handle must carry the same keys or a recall run against a machine
    // without WebGL throws instead of degrading to the outline.
    expect(src).toContain('coverNodes: function () {}, revealNode: function () {}, uncoverAll: function () {}');
    expect(src).toContain('coverNodes: artApi.coverNodes, revealNode: artApi.revealNode, uncoverAll: artApi.uncoverAll');
  });

  it('disposes the outgoing label texture on every swap', () => {
    // A label restyle that leaks its CanvasTexture is a GPU leak this module has
    // already been bitten by once; covering swaps a label per node per run.
    const swap = src.slice(src.indexOf('function _swapLabel'), src.indexOf('function coverNodes'));
    expect(swap).toContain('old.material.map.dispose()');
    expect(swap).toContain('old.material.dispose()');
    expect(swap).toContain('group.remove(old)');
  });

  it('rebuilds the real label from the node rather than caching the covered one', () => {
    const reveal = src.slice(src.indexOf('function revealNode'), src.indexOf('function uncoverAll'));
    expect(reveal).toContain('_swapLabel(m, m.node.label)');
  });

  it('spotlights the asked node with a dedicated status', () => {
    expect(src).toContain("current: '#38bdf8'");
  });

  it('buffers cover/reveal calls made before GL mounts', () => {
    // A run can be armed while three.js is still loading; a dropped cover would
    // leave every answer on screen.
    expect(src).toContain('coverNodes: function (ids, txt) { _artCall(');
  });
});

describe('the view never shows an answer during a run', () => {
  const view = readFileSync(resolve(process.cwd(), 'view_renderers_source.jsx'), 'utf8');

  it('suppresses the per-node art panel, which renders the label', () => {
    expect(view).toContain('{!challenge && !recall && persist && selectedNode && !failed && (');
  });

  it('announces position without naming the concept', () => {
    const announce = view.slice(view.indexOf('const _recallAnnounce'), view.indexOf('const _spotlight'));
    expect(announce).toContain('{n}');
    expect(announce).toContain('{total}');
    expect(announce).not.toContain('.label');
  });

  it('guards the finish against a double score', () => {
    expect(view).toContain('if (recallFinishedRef.current) return;');
  });
});

describe('recall is playable without sight', () => {
  const view = readFileSync(resolve(process.cwd(), 'view_renderers_source.jsx'), 'utf8');

  it('moves focus to the panel heading on start, on each question, and on the summary', () => {
    // Answering unmounts the choice button that had focus, so without this the
    // user is dropped at <body> mid-game (WCAG 2.4.3).
    expect(view).toContain('const recallHeadingRef = React.useRef(null);');
    expect(view).toContain('}, [recall, recallIdx, recallScore]);');
    expect(view).toContain('ref={recallHeadingRef}');
    expect(view).toContain('tabIndex={-1}');
  });

  it('uses a real heading for the panel, not a styled span', () => {
    const panel = view.slice(view.indexOf("aria-label={t('concept_space.recall_panel_aria')"), view.indexOf('concept_space.recall_summary_detail'));
    expect(panel).toContain('<h3');
  });

  it('puts the position AND the cue description in the heading for AT', () => {
    // The complete question must be readable without seeing the canvas.
    const panel = view.slice(view.indexOf('ref={recallHeadingRef}'), view.indexOf('concept_space.recall_summary_detail'));
    expect(panel).toContain('_recallAnnounce(recall.order, recallIdx)');
    expect(panel).toContain('recall_cue_described');
    expect(panel).toContain('recall_cue_undescribed');
    expect(panel).toContain('sr-only');
  });

  it('hides the purely visual "glowing node" line from screen readers', () => {
    // It duplicates the heading's position text and describes a colour cue that
    // conveys nothing when read aloud.
    const idx = view.indexOf("t('concept_space.recall_look')");
    expect(idx).toBeGreaterThan(-1);
    expect(view.slice(idx - 260, idx)).toContain('aria-hidden="true"');
  });

  it('associates the description disclosure with what it controls', () => {
    expect(view).toContain('aria-controls="cg3d-recall-desc"');
    expect(view).toContain('id="cg3d-recall-desc"');
  });

  it('announces answer feedback atomically', () => {
    const start = view.indexOf('{recallFeedback && (');
    expect(start).toBeGreaterThan(-1);
    const fb = view.slice(start, start + 700);
    expect(fb).toContain('role="status"');
    expect(fb).toContain('aria-atomic="true"');
  });
});

describe('furnish panel accessibility', () => {
  const view = readFileSync(resolve(process.cwd(), 'view_renderers_source.jsx'), 'utf8');

  it('names the progressbar', () => {
    // role="progressbar" without an accessible name is a 4.1.2 failure.
    const pb = view.slice(view.indexOf('role="progressbar"'), view.indexOf('role="progressbar"') + 400);
    expect(pb).toContain("aria-label={t('concept_space.furnish_progress_aria')");
  });

  it('announces the destructive two-step confirm in a live region', () => {
    // Arming only rewrites the focused button's own label, which is not reliably
    // announced — and the action wipes art that cost image credits.
    expect(view).toContain('id="cg3d-clear-armed"');
    expect(view).toContain('aria-describedby={clearArmed ?');
    const armed = view.slice(view.indexOf('{clearArmed && !furnishing && ('), view.indexOf('{clearArmed && !furnishing && (') + 400);
    expect(armed).toContain('role="status"');
  });

  it('uses a real heading for the panel', () => {
    expect(view).toContain("<h3 className=\"text-xs font-extrabold text-fuchsia-700\">🎨 {t('concept_space.furnish_heading')");
  });
});
