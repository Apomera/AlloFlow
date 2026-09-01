// Mineral test-bench visuals: streak plate, Mohs scratch, acid fizz.
//
// All three are classic hands-on identification tests whose whole point is that
// you LOOK at what happens. Each was a button, a progress bar and a sentence of
// result text — the tool described an observation instead of letting a student
// make one.

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

function render(rocksState) {
  const store = { rocks: Object.assign({ mode: 'minerals' }, rocksState), rockCycle: {} };
  const ctx = makeCtx({
    toolData: store,
    setToolData: (fnOrObj) => {
      const next = typeof fnOrObj === 'function' ? fnOrObj(store) : fnOrObj;
      Object.assign(store, next);
    },
  });
  const markup = ReactDOMServer.renderToStaticMarkup(
    React.createElement(() => window.StemLab._registry.rocks.render(ctx))
  );
  return { store, markup };
}

function tree(rocksState) {
  const store = { rocks: Object.assign({ mode: 'minerals' }, rocksState), rockCycle: {} };
  const ctx = makeCtx({
    toolData: store,
    setToolData: (fnOrObj) => {
      const next = typeof fnOrObj === 'function' ? fnOrObj(store) : fnOrObj;
      Object.assign(store, next);
    },
  });
  return { store, node: window.StemLab._registry.rocks.render(ctx) };
}

function findAll(node, predicate, acc = []) {
  if (node == null || typeof node !== 'object') return acc;
  if (Array.isArray(node)) { node.forEach((n) => findAll(n, predicate, acc)); return acc; }
  if (predicate(node)) acc.push(node);
  const kids = node.props && node.props.children;
  if (kids != null) findAll(kids, predicate, acc);
  return acc;
}

function mountWorkbench(markup) {
  const host = document.createElement('div');
  host.setAttribute('data-wb-test-host', 'true');
  host.innerHTML = markup;
  document.body.appendChild(host);
  return host;
}

beforeEach(() => {
  resetStemLab();
  loadTool(ROCKS_FILE, 'rocks');
  vi.useFakeTimers();
});
afterEach(() => {
  document.querySelectorAll('[data-wb-test-host]').forEach((host) => host.remove());
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('streak plate', () => {
  it('draws an empty porcelain plate before the test runs', () => {
    const { markup } = render({ selectedMineral: 'pyrite' });
    expect(markup).toContain('unglazed porcelain');
    expect(markup).toContain('ready for testing');
  });

  it('shows the specimen colour beside the streak colour once revealed', () => {
    // Pyrite is the classic case the test exists to teach: brassy gold
    // specimen, greenish-black powder.
    const { markup } = render({ selectedMineral: 'pyrite', streakResult: 'Powder Streak Result: Greenish-black' });
    expect(markup).toContain('looks like');
    expect(markup).toContain('streak');
    expect(markup).toContain('#16301c');           // greenish-black powder
    expect(markup).toContain('greenish-black streak'); // in the aria description
    expect(markup).toContain('the powder colour is the reliable identifier');
  });

  it('shows a scratched plate, not a powder smear, when the mineral is harder', () => {
    // Diamond/corundum/topaz are harder than porcelain: the plate loses.
    const { markup } = render({ selectedMineral: 'diamond', streakResult: 'Powder Streak Result: None (too hard)' });
    expect(markup).toContain('plate scratched');
    expect(markup).toContain('no powder');
    expect(markup).toContain('scratches the plate instead');
    // No side-by-side chips, because there is no powder to compare.
    expect(markup).not.toContain('looks like');
  });

  it('makes a hard-mineral streak inconclusive while preserving powder at the plate boundary', () => {
    // Quartz (7) is harder than an ordinary porcelain plate (~6.5), so a
    // white powder result would be false precision: the observable result is
    // a damaged plate. Pyrite (6.5) remains a valid boundary case and should
    // still reveal its diagnostic greenish-black powder.
    const quartz = render({ selectedMineral: 'quartz', streakResult: 'Streak test complete' }).markup;
    expect(quartz).toContain('plate scratched');
    expect(quartz).toContain('no reliable powder streak');
    expect(quartz).not.toContain('looks like');

    const pyrite = render({ selectedMineral: 'pyrite', streakResult: 'Streak test complete' }).markup;
    expect(pyrite).toContain('greenish-black streak');
    expect(pyrite).toContain('looks like');
    expect(pyrite).not.toContain('inconclusive');
  });
});

describe('Mohs scratch test', () => {
  function runScratch(mineralId, toolId) {
    const { store, node } = tree({ selectedMineral: mineralId, scratchTool: toolId });
    const run = findAll(node, (n) =>
      n.type === 'button' && JSON.stringify(n.props.children || '').includes('Run Scratch Test'))[0];
    expect(run, 'Run Scratch Test button').toBeTruthy();
    run.props.onClick();
    vi.advanceTimersByTime(2000);
    return render({ selectedMineral: mineralId, scratchTool: toolId, scratchAnimProgress: 100, scratchResult: store.rocks.scratchResult });
  }

  it('cuts a visible groove when the tool is hard enough', () => {
    // Steel nail (5.5) vs calcite (3) — the nail wins.
    const { markup } = runScratch('calcite', 'steel_nail');
    expect(markup).toContain('cut a groove into');
    expect(markup).toContain('Scratch created!');
  });

  it('leaves only the tool smear when the tool is softer', () => {
    // Fingernail (2.5) vs quartz (7) — the fingernail loses. Showing the tool
    // rubbing off is the observation students are told about but never saw.
    const { markup } = runScratch('quartz', 'fingernail');
    expect(markup).toContain('left only its own smear');
    expect(markup).toContain('No scratch!');
    expect(markup).not.toContain('cut a groove into');
  });

  it('reports equal hardness as a borderline observation instead of a certain pass or fail', () => {
    // A steel nail and magnetite are both represented as Mohs 5.5. At this
    // resolution an equal-value trial is not evidence for either strict side
    // of the bracket, so the learner should be invited to refine the test.
    const { markup } = runScratch('magnetite', 'steel_nail');
    expect(markup.toLowerCase()).toContain('borderline');
    expect(markup.toLowerCase()).toContain('same modeled mohs value');
    expect((markup.match(/stroke-dasharray="4 4"/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(markup).not.toContain('Scratch created!');
    expect(markup).not.toContain('No scratch!');
  });

  it('plots both hardnesses on one Mohs strip so the result has a reason', () => {
    const { markup } = runScratch('quartz', 'fingernail');
    expect(markup).toContain('mineral 7');
    expect(markup).toContain('tool 2.5');
  });

  it('offers a retest instead of hiding the button after a run', () => {
    // The old condition was `animProgress === 0`, so a finished run left no way
    // to re-run without re-picking a tool.
    const { node } = tree({ selectedMineral: 'quartz', scratchTool: 'steel_nail', scratchAnimProgress: 100 });
    const again = findAll(node, (n) =>
      n.type === 'button' && JSON.stringify(n.props.children || '').includes('Test again'));
    expect(again.length).toBe(1);
  });
});

describe('acid fizz test', () => {
  it('shows the pipette staged before the drop', () => {
    const { markup } = render({ selectedMineral: 'calcite' });
    expect(markup).toContain('ready to test');
  });

  it('animates rising bubbles while the reaction runs', () => {
    const { markup } = render({ selectedMineral: 'calcite', fizzAnimActive: true });
    expect(markup).toContain('rk-bubble');
    expect(markup).toContain('releases a stream of carbon dioxide bubbles');
  });

  it('leaves the bubbles and labels the gas once the reaction settles', () => {
    const { markup } = render({ selectedMineral: 'calcite', fizzResult: 'Fizz!' });
    expect(markup).toContain('releases a stream of carbon dioxide bubbles');
    expect(markup).toContain('CO₂');
    // Bubbles are drawn but no longer animating — the class is only applied
    // while the reaction is live.
    expect(markup).toContain('#0ea5e9');
    expect(markup).not.toContain('rk-bubble');
  });

  it('shows the drop beading with no bubbles on a non-carbonate', () => {
    const { markup } = render({ selectedMineral: 'quartz', fizzResult: 'No reaction.' });
    expect(markup).toContain('no gas released');
    expect(markup).toContain('with no bubbles');
    expect(markup).not.toContain('rk-bubble');
  });
});

describe('test-bench implementation', () => {
  it('animates with CSS keyframes, not new JS timers', () => {
    PATHS.forEach((p) => {
      const src = readFileSync(p, 'utf8');
      const bench = src.slice(src.indexOf('function rkEnsureBenchCss'), src.indexOf('// ═══ 🔬 rocks'));
      expect(bench).toContain('@keyframes rkBubbleRise');
      expect(bench).toContain('@keyframes rkSmear');
      // No timers inside the renderers — the reduced-motion block already
      // installed above collapses CSS animations to 0.01ms for free.
      expect(bench).not.toContain('setInterval');
      expect(bench).not.toContain('setTimeout');
      // Deterministic placement, same as the specimen swatches.
      expect(bench).not.toContain('Math.random');
      expect(bench).toContain('rkSeed(');
    });
  });

  it('names the carbonate set instead of comparing an id inline', () => {
    PATHS.forEach((p) => {
      const src = readFileSync(p, 'utf8');
      expect(src).toContain("var RK_CARBONATES = ['calcite'];");
      expect(src).not.toContain("if (targetId === 'calcite') {");
    });
  });

  it('gives every test-bench figure an accessible description', () => {
    // Each figure must explain the observation, not just be decoration.
    const cases = [
      [{ selectedMineral: 'pyrite', streakResult: 'x' }, 'streak, next to its outward colour'],
      [{ selectedMineral: 'calcite', fizzResult: 'x' }, 'carbon dioxide bubbles'],
      [{ selectedMineral: 'quartz', fizzResult: 'x' }, 'no bubbles'],
    ];
    cases.forEach(([state, phrase]) => {
      const { markup } = render(state);
      expect(markup, phrase).toContain(phrase);
    });
  });
});

describe('evidence-first Mineral Workbench learning flow', () => {
  const order = ['quartz', 'feldspar', 'mica', 'calcite', 'halite', 'pyrite',
    'talc', 'gypsum', 'magnetite', 'hematite', 'galena', 'fluorite'];

  function workbench(wb) {
    return render({
      mode: 'workbench',
      wb: Object.assign({
        spId: 'calcite', order, scratch: {}, streakDone: false, fizz: null,
        magnet: null, density: false, lens: false, guessedWrong: [], solvedId: null, guided: false,
      }, wb),
    }).markup;
  }

  function workbenchTree(wb) {
    return tree({
      mode: 'workbench',
      wb: Object.assign({
        spId: 'calcite', order, scratch: {}, streakDone: false, fizz: null,
        magnet: null, density: false, lens: false, guessedWrong: [], solvedId: null, guided: false,
      }, wb),
    });
  }

  it('orients a novice with a visible observe-compare-claim sequence', () => {
    const markup = workbench({});
    expect(markup).toContain('Observe &amp; test');
    expect(markup).toContain('Compare evidence');
    expect(markup).toContain('Make a claim');
    expect(markup).toContain('data-wb-step="observe"');
    expect(markup).toContain('data-wb-step-state="current"');
    expect(markup).toContain('Next scientific move');
    expect(markup).toContain('Start with the hand lens');
  });

  it('uses guided focus to quiet later-stage controls during the first observation', () => {
    const markup = workbench({ guided: true });
    expect(markup).toContain('data-wb-guided-focus="active"');
    expect(markup).toContain('data-wb-guided-toggle="active"');
    expect(markup).toContain('Show full workbench');
    expect(markup).toContain('data-wb-action-hub="unified"');
    expect(markup).toContain('data-wb-action-tool="lens"');
    expect(markup).toContain('data-wb-forecast-disclosure="progressive"');
    expect(markup).toContain('data-wb-tools-state="open"');
    expect(markup).toContain('data-wb-candidates-state="quiet"');
    expect(markup).toContain('Candidate references are waiting for your first observation.');
    expect(markup).toContain('Preview candidates');
    expect(markup).not.toContain('data-wb-candidate="');
  });

  it('keeps the next scientific move above supporting reference panels in guided focus', () => {
    const guided = workbench({ guided: true });
    expect(guided.indexOf('data-wb-action-hub="unified"')).toBeLessThan(guided.indexOf('data-wb-evidence-rail="persistent"'));

    const full = workbench({ guided: false });
    expect(full.indexOf('data-wb-evidence-rail="persistent"')).toBeLessThan(full.indexOf('data-wb-action-hub="unified"'));
  });

  it('wraps the Rock header and gives every top-level navigation action a coarse-touch target', () => {
    const markup = workbench({});
    expect(markup).toContain('data-rocks-header="responsive"');
    expect(markup).toContain('data-rocks-mode-nav="responsive"');
    expect(markup).toContain('order-3 flex w-full flex-wrap');
    expect(markup).toContain('data-rocks-header-action="back"');
    expect(markup).toContain('data-rocks-header-action="geology-3d"');
    expect((markup.match(/min-h-\[44px\]/g) || []).length).toBeGreaterThanOrEqual(9);
  });

  it('moves visual focus from instruments to comparison after evidence is captured', () => {
    const markup = workbench({ guided: true, lens: true });
    const recommended = /data-wb-action-tool="([^"]+)"/.exec(markup)?.[1];
    expect(markup).toContain('data-wb-step="observe" data-wb-step-state="in-progress"');
    expect(markup).toContain('data-wb-step="compare" data-wb-step-state="current"');
    expect(markup).toContain('data-wb-tools-state="focused"');
    expect(markup).toContain('data-wb-tools-summary="quiet"');
    expect(markup).toContain('Instrument choices are tucked away while you compare evidence.');
    expect(recommended).toBeTruthy();
    expect(recommended).not.toBe('claim');
    expect(markup).toContain(`data-wb-open-recommended="${recommended}"`);
    expect(markup).toContain('data-wb-candidates-state="open"');
    expect(markup).toContain('data-wb-candidate="calcite"');

    const twoProperties = workbench({ guided: true, lens: true, streakDone: true });
    expect(twoProperties).toContain('data-wb-step="observe" data-wb-step-state="complete"');
    expect(twoProperties).toContain('data-wb-step="compare" data-wb-step-state="current"');
  });

  it('keeps the initiating instrument mounted after its async observation completes', () => {
    const { store, node } = workbenchTree({ guided: true });
    const lens = findAll(node, (n) => n.type === 'button' && n.props['data-wb-tool'] === 'lens')[0];
    expect(lens, 'hand lens control').toBeTruthy();
    lens.props.onClick();
    expect(store.rocks.wb.toolsExpanded).toBe(true);
    vi.advanceTimersByTime(1700);
    expect(store.rocks.wb.lens).toBe(true);
    expect(store.rocks.wb.toolsExpanded).toBe(true);
    expect(workbench(store.rocks.wb)).toContain('data-wb-tools-state="open"');
  });

  it('keeps instrument and candidate controls natively focusable while observations are busy', () => {
    const started = workbenchTree({ guided: true });
    const lens = findAll(started.node, (n) =>
      n.type === 'button' && n.props['data-wb-tool'] === 'lens')[0];
    expect(lens.props.disabled).toBeUndefined();
    expect(lens.props['aria-disabled']).toBe(false);
    lens.props.onClick();

    const busyTools = workbenchTree(started.store.rocks.wb);
    const busyLens = findAll(busyTools.node, (n) =>
      n.type === 'button' && n.props['data-wb-tool'] === 'lens')[0];
    const prevented = vi.fn();
    expect(busyLens.props.disabled).toBeUndefined();
    expect(busyLens.props['aria-disabled']).toBe(true);
    busyLens.props.onClick({ preventDefault: prevented });
    expect(prevented).toHaveBeenCalledOnce();

    const busyCandidates = workbenchTree({ guided: true, lens: true, anim: 'wrong' });
    const calcite = findAll(busyCandidates.node, (n) =>
      n.type === 'button' && n.props['data-wb-candidate'] === 'calcite')[0];
    expect(calcite, 'busy candidate control').toBeTruthy();
    expect(calcite.props.disabled).toBeUndefined();
    expect(calcite.props['aria-disabled']).toBe(true);
    calcite.props.onClick();
    expect(busyCandidates.store.rocks.wb.selectedId).toBeUndefined();
    expect(workbench(busyCandidates.store.rocks.wb)).toContain('aria-busy="true"');
  });

  it('opens a hidden instrument tray before focusing hardness recovery', () => {
    const recovery = workbenchTree({
      guided: true,
      lens: true,
      toolsExpanded: false,
      scratch: { fingernail: 'scratched', diamond_scribe: 'no' },
      claimEvidence: ['luster', 'hardness'],
      claimConfidence: 'very',
    });
    expect(workbench(recovery.store.rocks.wb)).toContain('data-wb-tools-state="focused"');
    const clearHardness = findAll(recovery.node, (n) =>
      n.type === 'button' && n.props['data-wb-recovery-action'] === 'hardness')[0];
    expect(clearHardness, 'hardness recovery action').toBeTruthy();
    clearHardness.props.onClick();

    expect(recovery.store.rocks.wb.scratch).toEqual({});
    expect(recovery.store.rocks.wb.toolsExpanded).toBe(true);
    expect(recovery.store.rocks.wb.claimEvidence).toEqual(['luster']);
    expect(recovery.store.rocks.wb.claimConfidence).toBeNull();
    const host = mountWorkbench(workbench(recovery.store.rocks.wb));
    expect(host.innerHTML).toContain('data-wb-tools-state="open"');
    vi.advanceTimersByTime(0);
    expect(document.activeElement?.getAttribute('data-wb-tool')).toBe('steel_nail');
  });

  it('returns focus to a rejected candidate when its review closes during wrong-claim feedback', () => {
    const review = workbenchTree({
      guided: true,
      lens: true,
      scratch: { penny: 'scratched' },
      guessedWrong: ['halite'],
      lastRejectedId: 'halite',
      candidateView: 'setaside',
      reviewId: 'halite',
      anim: 'wrong',
    });
    const close = findAll(review.node, (n) =>
      n.type === 'button' && n.props['data-wb-review-close'] === 'halite')[0];
    expect(close, 'rejected-claim review close').toBeTruthy();
    expect(close.props.disabled).toBeUndefined();
    close.props.onClick();
    expect(review.store.rocks.wb.reviewId).toBeNull();
    expect(review.store.rocks.wb.anim).toBe('wrong');

    const host = mountWorkbench(workbench(review.store.rocks.wb));
    const rejected = host.querySelector('[data-wb-candidate="halite"]');
    expect(rejected).toBeTruthy();
    expect(rejected.disabled).toBe(false);
    expect(rejected.getAttribute('aria-disabled')).toBe('true');
    vi.advanceTimersByTime(0);
    expect(document.activeElement).toBe(rejected);
  });

  it('lets learners reopen instruments or switch to the full workbench', () => {
    const guided = workbenchTree({ guided: true, lens: true });
    const openRecommended = findAll(guided.node, (n) =>
      n.type === 'button' && typeof n.props['data-wb-open-recommended'] === 'string')[0];
    expect(openRecommended, 'open recommended instrument control').toBeTruthy();
    const recommended = openRecommended.props['data-wb-open-recommended'];
    expect(openRecommended.props['aria-expanded']).toBe(false);
    openRecommended.props.onClick();
    expect(guided.store.rocks.wb.toolsExpanded).toBe(true);
    expect(workbench(guided.store.rocks.wb)).toContain(`data-wb-tool="${recommended}"`);

    const toggle = findAll(guided.node, (n) => n.type === 'button' && n.props['data-wb-guided-toggle'] === 'active')[0];
    expect(toggle, 'guided focus toggle').toBeTruthy();
    expect(toggle.props['aria-pressed']).toBe(true);
    toggle.props.onClick();
    expect(guided.store.rocks.wb.guided).toBe(false);
  });

  it('returns focus to claim-building when a supported candidate is selected', () => {
    const { store, node } = workbenchTree({ guided: true, lens: true, streakDone: true, toolsExpanded: true });
    const calcite = findAll(node, (n) => n.type === 'button' && n.props['data-wb-candidate'] === 'calcite')[0];
    expect(calcite, 'supported calcite candidate').toBeTruthy();
    calcite.props.onClick();
    expect(store.rocks.wb.selectedId).toBe('calcite');
    expect(store.rocks.wb.toolsExpanded).toBe(false);
  });

  it('uses the diagnostic crystal renderer for both the unknown and candidates', () => {
    const markup = workbench({});
    // The bench specimen is large; candidate references are compact. Both use
    // rkMineralSwatch, so habit and luster—not color alone—are visible.
    expect(markup).toContain('viewBox="0 0 130 130"');
    expect(markup).toContain('viewBox="0 0 50 50"');
    expect(markup).toContain('UNKNOWN SPECIMEN');
    expect(markup).toContain('Trigonal (Rhombohedral) reference form');
  });

  it('recommends a discriminating next test without revealing the answer', () => {
    const markup = workbench({ lens: true });
    const recommended = /data-wb-action-tool="([^"]+)"/.exec(markup)?.[1];
    expect(recommended).toBeTruthy();
    expect(markup).not.toContain('data-wb-open-recommended=');
    expect(markup).toContain(`data-wb-test-forecast="${recommended}"`);
    expect(markup).toContain(`data-wb-tool="${recommended}"`);
    expect(markup).toContain('Best expected split: about ');
    expect(markup).toContain('Estimate assumes each remaining candidate is equally likely.');
    // The notebook records the observation, while the coach never names calcite.
    const coach = markup.slice(markup.indexOf('Next scientific move'), markup.indexOf('Instrument tray'));
    expect(coach).not.toContain('Calcite');
  });

  it('ranks every useful available test by expected shortlist reduction', () => {
    const markup = workbench({ lens: true });
    const actionTool = /data-wb-action-tool="([^"]+)"/.exec(markup)?.[1];
    const informationGain = /data-wb-information-gain="([\d.]+)"/.exec(markup);
    const rankedCount = markup.match(/data-wb-ranked-tests="(\d+)"/);
    expect(actionTool).toBeTruthy();
    expect(informationGain).toBeTruthy();
    expect(Number(informationGain[1])).toBeGreaterThan(0);
    expect(Number(informationGain[1])).toBeLessThan(5);
    expect(rankedCount).toBeTruthy();
    expect(Number(rankedCount[1])).toBeGreaterThanOrEqual(4);
    expect(markup).toContain(`Best expected split: about ${informationGain[1]} candidates would remain after a typical result.`);
    expect(markup).toContain('Compared across ' + rankedCount[1] + ' useful available tests.');
    expect(markup).toContain(`data-wb-test-forecast="${actionTool}"`);
    expect(Number(/data-wb-forecast-outcomes="(\d+)"/.exec(markup)?.[1])).toBeGreaterThanOrEqual(2);
  });

  it('shows the current hardness uncertainty and only marks a reference when hardness is recommended', () => {
    const initial = workbench({ lens: true });
    expect(initial).toContain('data-wb-mohs-interval="unmeasured"');
    expect(initial).toContain('data-wb-mohs-low="1"');
    expect(initial).toContain('data-wb-mohs-high="10"');
    expect(initial).toContain('data-wb-mohs-recommended="none"');
    expect(initial).not.toContain('data-wb-mohs-next-marker=');
    expect(initial).toContain('Mohs ordinal hardness ranking from 1 to 10.');
    expect(initial).toContain('ordinal ranking');
    expect(initial).toContain('equal spacing does not mean equal increases');
    expect(initial).toContain('1 candidate at Mohs');
    expect(workbench({})).toContain('candidates at Mohs');
    expect(initial).not.toContain('Recommended next reference:');

    const bracketed = workbench({ lens: true, scratch: { penny: 'scratched' } });
    expect(bracketed).toContain('data-wb-mohs-interval="narrow"');
    expect(bracketed).toContain('data-wb-mohs-low="1"');
    expect(bracketed).toContain('data-wb-mohs-high="3.5"');
    expect(bracketed).toContain('Hardness constraint: H &lt; 3.5');
    expect(bracketed).toContain('Narrow bracket');

    const conflicting = workbench({ scratch: { fingernail: 'scratched', diamond_scribe: 'no' } });
    expect(conflicting).toContain('data-wb-mohs-interval="conflict"');
    expect(conflicting).toContain('data-wb-evidence-type="hardness" data-wb-evidence-state="not-measured"');
    expect(conflicting).not.toContain('data-wb-cer-evidence="hardness"');
    expect(conflicting).toContain('No candidates match the current scratch results.');
  });

  it('recommends the most informative follow-up after a no-mark result changes the bracket', () => {
    const markup = workbench({ lens: true, scratch: { penny: 'no' } });
    expect(markup).toContain('data-wb-action-tool="streak"');
    expect(markup).toContain('data-wb-information-gain="1.7"');
    expect(markup).toContain('data-wb-mohs-low="3.5"');
    expect(markup).toContain('data-wb-mohs-high="10"');
    expect(markup).toContain('data-wb-mohs-recommended="none"');
    expect(markup).not.toContain('data-wb-mohs-next-marker=');
    expect(markup).toContain('Hardness constraint: H &gt; 3.5');
  });

  it('records an equal-value scratch trial as a borderline constraint', () => {
    const { store, node } = workbenchTree({ spId: 'magnetite' });
    const nail = findAll(node, (n) => n.type === 'button' && n.props['data-wb-tool'] === 'steel_nail')[0];
    expect(nail, 'steel nail workbench control').toBeTruthy();
    nail.props.onClick();
    vi.advanceTimersByTime(1000);

    expect(store.rocks.wb.scratch.steel_nail).toBe('borderline');
    const markup = workbench(store.rocks.wb);
    expect(markup).toContain('Hardness constraint: H ≈ 5.5');
    expect(markup).toContain('Modeled near-match');
  });

  it('keeps a modeled equality provisional until a strict reference confirms hardness', () => {
    const provisional = workbench({
      spId: 'magnetite', scratch: { steel_nail: 'borderline' }, selectedId: 'magnetite',
    });
    expect(provisional).toContain('data-wb-evidence-type="hardness" data-wb-evidence-state="provisional"');
    expect(provisional).toContain('data-wb-rail-property="hardness" data-wb-rail-state="provisional"');
    expect(provisional).toContain('data-wb-mohs-interval="provisional"');
    expect(provisional).toContain('data-wb-measurement-ready="false"');
    expect(provisional).toContain('data-wb-provisional-hardness="true"');
    expect(provisional).toContain('data-wb-match-property="hardness" data-wb-match-state="provisional"');
    expect(provisional).toContain('3 / 12 measurement matches');
    expect(provisional).toContain('Active shortlist · 3');
    expect(provisional).toContain('Provisional model clue—confirm before using hardness in a claim');
    expect(provisional).not.toContain('data-wb-cer-evidence="hardness"');

    const distantReference = workbench({
      spId: 'magnetite', lens: true,
      scratch: { steel_nail: 'borderline', diamond_scribe: 'scratched' },
      selectedId: 'magnetite',
    });
    expect(distantReference).toContain('data-wb-evidence-type="hardness" data-wb-evidence-state="provisional"');
    expect(distantReference).toContain('data-wb-provisional-hardness="true"');
    expect(distantReference).not.toContain('data-wb-cer-evidence="hardness"');

    const confirmed = workbench({
      spId: 'magnetite', lens: true,
      scratch: { steel_nail: 'borderline', streak_plate: 'scratched' },
      selectedId: 'magnetite',
    });
    expect(confirmed).toContain('data-wb-evidence-type="hardness" data-wb-evidence-state="measured"');
    expect(confirmed).toContain('data-wb-measurement-ready="true"');
    expect(confirmed).toContain('data-wb-provisional-hardness="false"');
    expect(confirmed).toContain('data-wb-claim-strength="strong"');
  });

  it('uses a plate scratch as hardness evidence without inventing a powder color', () => {
    const quartz = workbench({ spId: 'quartz', streakDone: true });
    expect(quartz).toContain('Plate scratched');
    expect(quartz).toContain('no reliable powder streak');
    expect(quartz).toContain('data-wb-evidence-impact="11"');
    expect(quartz).toContain('Hardness constraint: H &gt; 6.5');
    expect(quartz).toContain('data-wb-evidence-type="streak" data-wb-evidence-state="not-measured"');
    expect(quartz).toContain('data-wb-evidence-type="hardness" data-wb-evidence-state="measured"');
    expect(quartz).toContain('1 / 6 confirmed');
    expect(quartz).toContain('Active shortlist · 1');
    expect((quartz.match(/data-wb-candidate="/g) || []).length).toBe(1);
    expect(quartz).toContain('data-wb-candidate="quartz"');

    const pyrite = workbench({ spId: 'pyrite', streakDone: true });
    expect(pyrite).toContain('Greenish-black');
    expect(pyrite).not.toContain('Plate scratched');
  });

  it('shows the streak and scratch observations at the station while each test runs', () => {
    const streakRun = workbenchTree({ spId: 'quartz', guided: true });
    const streak = findAll(streakRun.node, (n) => n.type === 'button' && n.props['data-wb-tool'] === 'streak')[0];
    streak.props.onClick();
    const streakMarkup = workbench(streakRun.store.rocks.wb);
    expect(streakMarkup).toContain('class="rk-smear"');
    expect(streakMarkup).toContain('NO POWDER STREAK');

    const scratchRun = workbenchTree({ spId: 'magnetite', guided: true });
    const glass = findAll(scratchRun.node, (n) => n.type === 'button' && n.props['data-wb-tool'] === 'steel_nail')[0];
    glass.props.onClick();
    const scratchMarkup = workbench(scratchRun.store.rocks.wb);
    expect(scratchRun.store.rocks.wb.activeScratchRef).toBe('steel_nail');
    expect(scratchMarkup).toContain('NEAR-MATCH · RETEST');
    expect((scratchMarkup.match(/stroke-dasharray="4 4"/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it('shows density arithmetic and filters with the same half-unit measurement band', () => {
    const run = workbenchTree({
      spId: 'calcite',
      guided: true,
      lens: true,
      toolsExpanded: true,
      claimConfidence: 'very',
    });
    const balance = findAll(run.node, (n) =>
      n.type === 'button' && n.props['data-wb-tool'] === 'balance')[0];
    expect(balance, 'balance and beaker control').toBeTruthy();
    balance.props.onClick();
    expect(run.store.rocks.wb.anim).toBe('density');
    expect(run.store.rocks.wb.claimConfidence).toBeNull();

    const measuring = workbench(run.store.rocks.wb);
    expect(measuring).toContain('data-wb-bench-observation="density"');
    expect(measuring).toContain('m = 27.1 g');
    expect(measuring).toContain('ΔV = 10.0 cm³');
    expect(measuring).toContain('ρ = 2.71 g/cm³');

    vi.advanceTimersByTime(1900);
    expect(run.store.rocks.wb.density).toBe(true);
    const recorded = workbench(run.store.rocks.wb);
    expect(recorded).toContain('Density calculation: 27.1 g ÷ 10.0 cm³ = 2.71 g/cm³ — 2.5–&lt;3.0 g/cm³ measurement band');
  });

  it('does not stack scratch, density, and settled streak graphics in one bench station', () => {
    const settled = workbench({ spId: 'quartz', streakDone: true });
    expect(settled).toContain('data-wb-bench-observation="streak"');

    const scratching = workbench({
      spId: 'quartz',
      streakDone: true,
      anim: 'scratch',
      activeScratchRef: 'steel_nail',
    });
    expect(scratching).toContain('data-wb-bench-observation="scratch"');
    expect(scratching).not.toContain('data-wb-bench-observation="streak"');
    expect(scratching).not.toContain('data-wb-bench-observation="density"');

    const weighing = workbench({ spId: 'quartz', streakDone: true, anim: 'density' });
    expect(weighing).toContain('data-wb-bench-observation="density"');
    expect(weighing).not.toContain('data-wb-bench-observation="streak"');
    expect(weighing).not.toContain('data-wb-bench-observation="scratch"');
  });

  it('records a streak-plate groove only once when the same plate is also in scratch state', () => {
    const state = {
      spId: 'quartz',
      streakDone: true,
      scratch: { streak_plate: 'no' },
      selectedId: 'quartz',
    };
    const { node } = workbenchTree(state);
    const notebookRows = findAll(node, (n) =>
      n.type === 'li' && n.props['data-wb-evidence-impact'] !== undefined);
    const hardnessChoices = findAll(node, (n) =>
      n.type === 'button' && n.props['data-wb-cer-evidence'] === 'hardness');
    expect(notebookRows).toHaveLength(1);
    expect(hardnessChoices).toHaveLength(1);

    const markup = workbench(state);
    expect(markup).toContain('1 / 6 confirmed');
    expect(markup).toContain('data-wb-evidence-type="streak" data-wb-evidence-state="not-measured"');
    expect(markup).toContain('data-wb-evidence-type="hardness" data-wb-evidence-state="measured"');
  });

  it('visualizes why the recommended test can split the current candidates', () => {
    const markup = workbench({});
    expect(markup).toContain('data-wb-test-forecast="lens"');
    expect(markup).toContain('data-wb-forecast-outcomes=');
    expect(markup).toContain('Plan before you test');
    expect(markup).toContain('How could luster split the shortlist?');
    expect(markup).toContain('Possible reference outcomes');
    expect(markup).toContain('Optional prediction: what do you think you will observe?');
    expect(markup).toContain('A prediction is a hypothesis, not a grade.');
    const forecast = markup.slice(markup.indexOf('Plan before you test'), markup.indexOf('Instrument tray'));
    // Conditional branches may name reference candidates, but never identify
    // which branch the unknown will actually follow before the test runs.
    expect(forecast).not.toContain('The unknown is');
    expect(forecast).not.toContain('The answer is');
  });

  it('turns possible outcomes into conditional candidate branches', () => {
    const markup = workbench({ lens: true });
    expect(markup).toContain('data-wb-action-tool="balance"');
    expect(markup).toContain('data-wb-information-gain="2.2"');
    expect(markup).toContain('data-wb-test-forecast="balance"');
    expect(markup).toContain('data-wb-forecast-branch="density-2-5"');
    expect(markup).toContain('data-wb-branch-count="3"');
    expect(markup).toContain('data-wb-forecast-candidates="quartz,feldspar,calcite"');
    expect(markup).toContain('data-wb-branch-remaining="3"');
    expect(markup).toContain('data-wb-forecast-retained="quartz,feldspar,calcite"');
    expect(markup).toContain('data-wb-forecast-branch="density-2-0"');
    expect(markup).toContain('data-wb-forecast-candidates="halite"');
    expect(markup).toContain('data-wb-forecast-branch="density-3-0"');
    expect(markup).toContain('data-wb-forecast-candidates="fluorite"');
    expect(markup).toContain('2.5–&lt;3.0 g/cm³ measurement band');
    expect(markup).toContain('Would keep:');
    expect(markup).toContain('Would leave 3 candidates');
    expect(markup).toContain('This branch would leave 3 candidates.');
  });

  it('uses the wider provisional band for projected shortlists without changing outcome probabilities', () => {
    PATHS.forEach((p) => {
      const src = readFileSync(p, 'utf8');
      expect(src).toContain('group.count * group.remainingCount');
      expect(src).toContain('group.remainingCandidates');
      expect(src).toContain('"data-wb-branch-remaining": group.remainingCount');
      expect(src).toContain('"data-wb-prediction-branch-size": group.remainingCount');
    });
  });

  it('explains when Mohs tolerance makes the projected shortlist wider than an outcome bar', () => {
    const src = readFileSync(ROCKS_FILE, 'utf8');
    expect(src).toContain('group.count !== group.remainingCount');
    expect(src).toContain('"data-wb-forecast-tolerance-note": "visible"');
    expect(src).toContain('Bar widths show exact modeled outcomes.');
    expect(src).toContain('near-match candidates retained by the ±0.5 Mohs tolerance');
  });

  it('connects a saved prediction to its projected shortlist', () => {
    const markup = workbench({ lens: true, predictionTool: 'balance', predictionValue: 'density-2-5' });
    expect(markup).toContain('data-wb-prediction-branch="density-2-5"');
    expect(markup).toContain('data-wb-prediction-remaining="3"');
    expect(markup).toContain('Working hypothesis');
    expect(markup).toContain('3 candidates would remain:');
    expect(markup).not.toContain('data-wb-prediction-reflection=');
  });

  it('lets the learner record an optional prediction without running the test', () => {
    const { store, node } = workbenchTree({});
    const vitreous = findAll(node, (n) => n.type === 'button' && n.props['data-wb-prediction-outcome'] === 'vitreous')[0];
    expect(vitreous, 'vitreous prediction option').toBeTruthy();
    expect(vitreous.props['aria-pressed']).toBe(false);
    vitreous.props.onClick();
    expect(store.rocks.wb.predictionTool).toBe('lens');
    expect(store.rocks.wb.predictionValue).toBe('vitreous');
    expect(store.rocks.wb.lens).toBe(false);
  });

  it('reflects on both matching and surprising predictions without grading surprise as failure', () => {
    const matched = workbench({ lens: true, predictionTool: 'lens', predictionValue: 'vitreous' });
    const updated = workbench({ lens: true, predictionTool: 'lens', predictionValue: 'metallic' });
    expect(matched).toContain('data-wb-prediction-reflection="matched"');
    expect(matched).toContain('Your prediction matched the observation.');
    expect(matched).toContain('You predicted');
    expect(matched).toContain('You observed');
    expect(updated).toContain('data-wb-prediction-reflection="updated"');
    expect(updated).toContain('The observation differed from your prediction');
    expect(updated).toContain('Scientists do not erase surprising evidence.');
    expect(updated).not.toContain('Incorrect prediction');
  });

  it('keeps eliminated candidates readable and explains the conflicting property', () => {
    const markup = workbench({ fizz: 'fizz', scratch: { penny: 'scratched' }, candidateView: 'setaside' });
    expect(markup).toContain('Evidence comparison board');
    expect(markup).toContain('data-wb-candidate-state="eliminated"');
    expect(markup).toContain('Review why set aside');
    expect(markup).toContain('Mohs: ');
    expect(markup).toContain('Acid: no fizz');
    // A strikethrough made the very information students needed to compare
    // harder to read; state is now carried by text, icon, border and color.
    const candidateBoard = markup.slice(markup.indexOf('Evidence comparison board'));
    expect(candidateBoard).not.toContain('line-through');
  });

  it('turns an eliminated card into an evidence-review control instead of a disabled dead end', () => {
    const { store, node } = workbenchTree({ lens: true, streakDone: true, fizz: 'fizz', candidateView: 'setaside' });
    const quartz = findAll(node, (n) => n.type === 'button' && n.props['data-wb-candidate'] === 'quartz')[0];
    expect(quartz, 'eliminated quartz candidate').toBeTruthy();
    expect(quartz.props.disabled).toBeUndefined();
    expect(quartz.props['aria-disabled']).toBeUndefined();
    expect(quartz.props['aria-pressed']).toBeUndefined();
    expect(quartz.props['aria-expanded']).toBe(false);
    expect(quartz.props['data-wb-reviewing']).toBe('false');
    quartz.props.onClick();
    expect(store.rocks.wb.reviewId).toBe('quartz');
    expect(store.rocks.wb.selectedId).toBeUndefined();
  });

  it('shows all measured matches and conflicts for a set-aside candidate', () => {
    const markup = workbench({
      lens: true, streakDone: true, fizz: 'fizz', scratch: { penny: 'scratched' },
      candidateView: 'setaside', reviewId: 'quartz',
    });
    expect(markup).toContain('data-wb-setaside-inspector="conflict"');
    expect(markup).toContain('data-wb-reviewing="true"');
    expect(markup).toContain('Set-aside evidence inspector');
    expect(markup).toContain('data-wb-review-property="acid" data-wb-review-state="conflict"');
    expect(markup).toContain('data-wb-review-property="hardness" data-wb-review-state="conflict"');
    expect(markup).toContain('data-wb-review-property="luster" data-wb-review-state="match"');
    expect(markup).toContain('Fizzes');
    expect(markup).toContain('No reaction');
    expect(markup).toContain('Evidence rule: one diagnostic conflict is enough.');
  });

  it('places the set-aside inspector before the candidate grid it explains', () => {
    const markup = workbench({
      lens: true,
      streakDone: true,
      fizz: 'fizz',
      scratch: { penny: 'scratched' },
      candidateView: 'setaside',
      reviewId: 'quartz',
    });
    const inspector = markup.indexOf('data-wb-setaside-inspector="conflict"');
    const firstCandidate = markup.indexOf('data-wb-candidate="');
    const claimBuilder = markup.indexOf('data-wb-claim-ready=');
    expect(inspector).toBeGreaterThan(-1);
    expect(firstCandidate).toBeGreaterThan(-1);
    expect(inspector).toBeLessThan(firstCandidate);
    expect(inspector).toBeLessThan(claimBuilder);
  });

  it('explains when a rejected claim still matches and recommends a new distinction', () => {
    const markup = workbench({
      lens: true, streakDone: true, guessedWrong: ['feldspar'], lastRejectedId: 'feldspar',
      candidateView: 'setaside', reviewId: 'feldspar',
    });
    expect(markup).toContain('data-wb-candidate-state="rejected"');
    expect(markup).toContain('data-wb-setaside-inspector="unresolved"');
    expect(markup).toContain('Every current observation still matches');
    expect(markup).toContain('Best next distinction:');
    expect(markup).toContain('data-wb-action-tool=');
    expect((markup.match(/data-wb-review-state="match"/g) || []).length).toBe(2);
    expect(markup).not.toContain('data-wb-review-state="conflict"');
  });

  it('explains Mohs bracketing and physical-lab safety in plain language', () => {
    const markup = workbench({});
    expect(markup).toContain('Find one reference that leaves no mark and the next harder reference that scratches');
    expect(markup).toContain('wear eye protection');
    expect(markup).toContain('Acid tests require teacher supervision and a tiny test area.');
    expect(markup).toContain('Mohs 5.5');
  });

  it('tracks six property types separately from the number of observations', () => {
    const markup = workbench({
      lens: true,
      streakDone: true,
      scratch: { fingernail: 'no', penny: 'no', steel_nail: 'scratched' },
    });
    // Three scratch trials are three observations of one property—not three
    // different kinds of evidence. The coverage display must stay meaningful.
    expect(markup).toContain('3 / 6 confirmed');
    expect(markup).toContain('3 of 6 confirmed property types');
    expect(markup).toContain('data-wb-evidence-type="hardness"');
    expect(markup).toContain('data-wb-evidence-state="measured"');
    expect(markup).not.toContain('5 / 6 confirmed');
  });

  it('keeps every instrument result visible in a persistent evidence rail', () => {
    const markup = workbench({
      lens: true, streakDone: true,
      scratch: { fingernail: 'no', penny: 'scratched' },
      fizz: 'fizz', magnet: 'none', density: true,
    });
    expect(markup).toContain('data-wb-evidence-rail="persistent"');
    expect(markup).toContain('Specimen evidence rail');
    expect(markup).toContain('6 / 6 confirmed');
    expect(markup).toContain('grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6');
    ['luster', 'streak', 'hardness', 'acid', 'magnetism', 'density'].forEach((property) => {
      expect(markup).toContain(`data-wb-rail-property="${property}"`);
    });
    expect((markup.match(/data-wb-rail-state="captured"/g) || []).length).toBe(6);
    expect(markup).toContain('2.5 &lt; H &lt; 3.5');
    expect(markup).toContain('2.71 g/cm³');
    expect(markup).toContain('No attraction');
  });

  it('offers a collapsed visual property guide without interrupting the main workflow', () => {
    const markup = workbench({});
    expect(markup).toContain('data-wb-property-guide="progressive"');
    expect(markup).toContain('<summary');
    expect(markup).toContain('Need a property refresher? Open the visual guide.');
    expect(markup).toContain('Six quick definitions, diagnostic uses, and common mix-ups.');
    expect(markup).toContain('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3');
    ['luster', 'streak', 'hardness', 'acid', 'magnetism', 'density'].forEach((property) => {
      expect(markup).toContain(`data-wb-property-guide-card="${property}"`);
      expect(markup).toContain(`data-wb-guide-graphic="${property}"`);
    });
    expect((markup.match(/data-wb-guide-state="available"/g) || []).length).toBe(6);
    const guide = markup.slice(markup.indexOf('data-wb-property-guide="progressive"'), markup.indexOf('Next scientific move'));
    expect(guide).not.toContain(' open=""');
  });

  it('explains each property with a diagnostic use and a misconception guard', () => {
    const markup = workbench({});
    expect(markup).toContain('Luster is reflection, not the specimen’s color.');
    expect(markup).toContain('Powder color may differ from the outside surface color; a groove is hardness evidence');
    expect(markup).toContain('Hardness is not toughness or resistance to breaking.');
    expect(markup).toContain('No immediate visible fizz argues against calcite here');
    expect(markup).toContain('it does not prove that every carbonate is absent.');
    expect(markup).toContain('Dark color or heavy feel cannot prove magnetism.');
    expect(markup).toContain('Density is not mass alone');
    expect((markup.match(/Diagnostic use:/g) || []).length).toBe(6);
    expect((markup.match(/Do not mix it up:/g) || []).length).toBe(6);
  });

  it('marks property-guide cards from the live evidence state', () => {
    const markup = workbench({ lens: true, fizz: 'fizz' });
    expect(markup).toContain('2 of 6 confirmed');
    expect((markup.match(/data-wb-guide-state="measured"/g) || []).length).toBe(2);
    expect((markup.match(/data-wb-guide-state="available"/g) || []).length).toBe(4);
    expect(markup).toContain('data-wb-property-guide-card="luster" data-wb-guide-state="measured"');
    expect(markup).toContain('data-wb-property-guide-card="acid" data-wb-guide-state="measured"');
  });

  it('pins the unknown beside a candidate and distinguishes tentative from strong support', () => {
    const comparing = workbench({ lens: true, streakDone: true });
    const tentative = workbench({ lens: true, streakDone: true, selectedId: 'calcite' });
    const strong = workbench({ lens: true, streakDone: true, fizz: 'fizz', selectedId: 'calcite' });

    expect(comparing).toContain('data-wb-comparison-dock="empty"');
    expect(comparing).toContain('data-wb-claim-strength="choose"');
    expect(comparing).toMatch(/data-wb-step="compare" data-wb-step-state="current"/);
    expect(comparing).toMatch(/data-wb-step="claim" data-wb-step-state="upcoming"/);

    expect(tentative).toContain('data-wb-comparison-dock="selected"');
    expect(tentative).toContain('data-wb-claim-strength="tentative"');
    expect(tentative).toContain('sm:sticky sm:top-2');
    expect(tentative).toContain('Tentative claim permitted');
    expect(tentative).toContain('Unknown compared with stem.rocks.calcite');
    expect(tentative).toMatch(/data-wb-step="claim" data-wb-step-state="current"/);

    expect(strong).toContain('data-wb-claim-strength="strong"');
    expect(strong).toContain('Strong evidence support');
    expect(strong).toContain('Only one candidate remains after confirmed measurements.');
  });

  it('names the claim-stage action as strengthening until evidence is ready', () => {
    const refining = workbench({ lens: true, streakDone: true, selectedId: 'calcite' });
    const refiningTool = /data-wb-action-tool="([^"]+)"/.exec(refining)?.[1];
    expect(refiningTool).toBeTruthy();
    expect(refiningTool).not.toBe('claim');
    expect(refining).toContain('Next scientific move · Strengthen your claim');
    expect(refining).toContain('data-wb-step="claim" data-wb-step-state="current"');

    const ready = workbench({
      lens: true,
      streakDone: true,
      fizz: 'fizz',
      selectedId: 'calcite',
    });
    expect(ready).toContain('data-wb-action-tool="claim"');
    expect(ready).toContain('Next scientific move · Make a claim');
  });

  it('does not turn provisional narrowing into strong support', () => {
    const markup = workbench({
      spId: 'halite', lens: true, fizz: 'none',
      scratch: { fingernail: 'borderline' }, selectedId: 'halite',
    });
    expect(markup).toContain('data-wb-measurement-ready="true"');
    expect(markup).toContain('data-wb-provisional-hardness="true"');
    expect(markup).toContain('data-wb-claim-strength="tentative"');
    expect(markup).toContain('A modeled near-match narrows the list, but confirm hardness before treating that narrowing as strong support.');
    expect(markup).not.toContain('data-wb-claim-strength="strong"');
  });

  it('bases claim strength on measured fits rather than rejected-guess feedback', () => {
    // Lens + a penny scratch leave calcite and halite compatible with the
    // measurements. Rejecting halite tells the learner the answer was wrong,
    // but that feedback is not a new physical-property observation.
    const markup = workbench({
      lens: true,
      scratch: { penny: 'scratched' },
      guessedWrong: ['halite'],
      selectedId: 'calcite',
    });
    expect(markup).toContain('data-wb-claim-strength="tentative"');
    expect(markup).toContain('2 candidates still fit');
    expect(markup).not.toContain('Strong evidence support');
    expect(markup).not.toContain('Only one shortlist candidate still fits every measured property');
  });

  it('separates measurement matches from the active shortlist after a compatible rejection', () => {
    const markup = workbench({
      lens: true, scratch: { penny: 'scratched' },
      guessedWrong: ['halite'], selectedId: 'calcite',
    });
    expect(markup).toContain('data-wb-count="measurement-matches"');
    expect(markup).toContain('2 / 12 measurement matches');
    expect(markup).toContain('Active shortlist · 1');
    expect(markup).toContain('Set aside · 11');
    expect(markup).toContain('data-wb-compatible-rejected="1"');
    expect(markup).toContain('1 rejected claim still matches the measurements.');
    expect(markup).toContain('Rejection feedback is not physical evidence');
  });

  it('turns tentative support into a visual faceoff with the closest remaining look-alike', () => {
    const markup = workbench({ lens: true, streakDone: true, selectedId: 'calcite' });
    expect(markup).toContain('data-wb-lookalike-faceoff=');
    expect(markup).toContain('Closest look-alike still supported');
    expect(markup).toContain('data-wb-faceoff-side="selected"');
    expect(markup).toContain('data-wb-faceoff-side="rival"');
    expect(markup).toContain('Your claim');
    expect(markup).toContain('Closest alternative');
    expect(markup).toContain('Properties that can distinguish this pair');
    const faceoff = markup.slice(markup.indexOf('data-wb-lookalike-faceoff='), markup.indexOf('data-wb-claim-ready='));
    expect(faceoff).toContain('data-wb-faceoff-separator="hardness"');
    expect(faceoff).toContain('data-wb-faceoff-separator="acid"');
    expect(faceoff).not.toContain('data-wb-faceoff-separator="luster"');
    expect(faceoff).not.toContain('data-wb-faceoff-separator="streak"');
    expect(faceoff).toContain('Not tested yet');
  });

  it('labels a partially measured distinguishing property as a refinement', () => {
    const markup = workbench({
      lens: true, streakDone: true, scratch: { steel_nail: 'scratched' }, selectedId: 'calcite',
    });
    expect(markup).toContain('data-wb-lookalike-faceoff=');
    expect(markup).toContain('data-wb-faceoff-separator="hardness" data-wb-faceoff-test-state="refine"');
    expect(markup).toContain('Refine this test');
    expect(markup).toContain('Choose a Mohs reference between their values');
  });

  it('removes the look-alike faceoff once only one supported candidate remains', () => {
    const strong = workbench({ lens: true, streakDone: true, fizz: 'fizz', selectedId: 'calcite' });
    expect(strong).toContain('data-wb-claim-strength="strong"');
    expect(strong).not.toContain('data-wb-lookalike-faceoff=');
  });

  it('shows the diagnostic impact of each observation in the notebook', () => {
    const markup = workbench({ lens: true, streakDone: true });
    expect(markup).toContain('data-wb-evidence-impact="7"');
    expect(markup).toContain('Rules out 7 on its own');
    expect(markup).toContain('data-wb-diagnostic-leader="luster"');
    expect(markup).toContain('Most diagnostic so far');
    expect(markup).toContain('luster rules out 7 candidates by itself');
  });

  it('focuses the board on a shortlist while preserving set-aside evidence', () => {
    const shortlist = workbench({ lens: true, streakDone: true });
    expect(shortlist).toContain('data-wb-candidate-view="shortlist"');
    expect(shortlist).toContain('data-wb-candidate-filter="shortlist"');
    expect(shortlist).toContain('Active shortlist · 4');
    expect(shortlist).toContain('Set aside · 8');
    expect(shortlist).toContain('aria-pressed="true"');
    expect((shortlist.match(/data-wb-candidate="/g) || []).length).toBe(4);
    expect(shortlist).not.toContain('data-wb-candidate-state="eliminated"');

    const setAside = workbench({ lens: true, streakDone: true, candidateView: 'setaside' });
    expect(setAside).toContain('data-wb-candidate-view="setaside"');
    expect((setAside.match(/data-wb-candidate="/g) || []).length).toBe(8);
    expect(setAside).toContain('data-wb-candidate-state="eliminated"');
    expect(setAside).toContain('Switch to Active shortlist to select a supported claim');
  });

  it('uses a deliberate claim builder instead of grading a candidate-card click', () => {
    const building = workbench({ lens: true, streakDone: true, selectedId: 'calcite' });
    const markup = workbench({
      lens: true, streakDone: true, selectedId: 'calcite',
      claimEvidence: ['luster', 'streak'], claimReasoning: 'both', claimConfidence: 'somewhat',
    });
    const unselected = workbench({ lens: true, streakDone: true });
    expect(markup).toContain('Claim · Evidence · Reasoning');
    expect(markup).toContain('My claim: the unknown is stem.rocks.calcite');
    expect(markup).toContain('data-wb-candidate-state="selected"');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('data-wb-claim-ready="true"');
    expect(markup).toContain('data-wb-cer-ready="true"');
    expect(markup).toContain('Submit evidence-based claim');
    expect(building).toContain('data-wb-measurement-ready="true"');
    expect(building).toContain('data-wb-claim-ready="false"');
    expect(building).toContain('0 / 2 evidence choices needed');
    expect(unselected).toContain('Selecting a card does not submit it');
  });

  it('requires a confidence reflection before the CER claim can be submitted', () => {
    const state = {
      lens: true, streakDone: true, selectedId: 'calcite',
      claimEvidence: ['luster', 'streak'], claimReasoning: 'both',
    };
    const incomplete = workbench(state);
    expect(incomplete).toContain('data-wb-claim-ready="false"');
    expect(incomplete).toContain('data-wb-cer-ready="false"');
    expect(incomplete).toContain('Record your confidence');

    const incompleteTree = workbenchTree(state);
    const submit = findAll(incompleteTree.node, (n) =>
      n.type === 'button' && JSON.stringify(n.props.children || '').includes('Submit evidence-based claim'))[0];
    expect(submit, 'CER submit button').toBeTruthy();
    expect(submit.props.disabled).toBe(true);

    const complete = workbench(Object.assign({}, state, { claimConfidence: 'unsure' }));
    expect(complete).toContain('data-wb-claim-ready="true"');
    expect(complete).toContain('data-wb-cer-ready="true"');
  });

  it('clears confidence but preserves the working CER draft when new evidence starts', () => {
    const run = workbenchTree({
      lens: true,
      streakDone: true,
      selectedId: 'calcite',
      claimEvidence: ['luster', 'streak'],
      claimReasoning: 'both',
      claimConfidence: 'very',
      toolsExpanded: true,
    });
    const balance = findAll(run.node, (n) =>
      n.type === 'button' && n.props['data-wb-tool'] === 'balance')[0];
    expect(balance, 'available new measurement').toBeTruthy();
    balance.props.onClick();
    expect(run.store.rocks.wb.anim).toBe('density');
    expect(run.store.rocks.wb.selectedId).toBe('calcite');
    expect(run.store.rocks.wb.claimEvidence).toEqual(['luster', 'streak']);
    expect(run.store.rocks.wb.claimReasoning).toBe('both');
    expect(run.store.rocks.wb.claimConfidence).toBeNull();
    expect(workbench(run.store.rocks.wb)).toContain('data-wb-confidence="not-recorded"');
  });

  it('clears candidate-dependent CER choices when the working claim changes', () => {
    const state = {
      lens: true, scratch: { penny: 'scratched' }, selectedId: 'calcite',
      claimEvidence: ['luster', 'hardness'], claimReasoning: 'both', claimConfidence: 'very',
    };
    expect(workbench(state)).toContain('data-wb-cer-ready="true"');

    const { store, node } = workbenchTree(state);
    const halite = findAll(node, (n) => n.type === 'button' && n.props['data-wb-candidate'] === 'halite')[0];
    expect(halite, 'compatible halite candidate').toBeTruthy();
    halite.props.onClick();
    expect(store.rocks.wb.selectedId).toBe('halite');
    expect(store.rocks.wb.claimEvidence).toEqual([]);
    expect(store.rocks.wb.claimReasoning).toBeNull();
    expect(store.rocks.wb.claimConfidence).toBeNull();
    expect(workbench(store.rocks.wb)).toContain('data-wb-cer-ready="false"');
  });

  it('clears the old CER draft after a rejected submission', () => {
    const { store, node } = workbenchTree({
      lens: true, scratch: { penny: 'scratched' }, selectedId: 'halite',
      claimEvidence: ['luster', 'hardness'], claimReasoning: 'both', claimConfidence: 'very',
    });
    const submit = findAll(node, (n) =>
      n.type === 'button' && JSON.stringify(n.props.children || '').includes('Submit evidence-based claim'))[0];
    expect(submit, 'enabled claim submit').toBeTruthy();
    expect(submit.props.disabled).toBe(false);
    submit.props.onClick();
    expect(store.rocks.wb.selectedId).toBeNull();
    expect(store.rocks.wb.claimEvidence).toEqual([]);
    expect(store.rocks.wb.claimReasoning).toBeNull();
    expect(store.rocks.wb.claimConfidence).toBeNull();
  });

  it('asks the learner to choose evidence, reasoning, and confidence', () => {
    const markup = workbench({
      lens: true, streakDone: true, fizz: 'fizz', selectedId: 'calcite',
      claimEvidence: ['luster', 'acid'], claimReasoning: 'both', claimConfidence: 'very',
    });
    expect(markup).toContain('data-wb-cer-builder="active"');
    expect(markup).toContain('1 · Choose your strongest evidence');
    expect(markup).toContain('data-wb-cer-evidence="luster"');
    expect(markup).toContain('data-wb-cer-evidence="acid"');
    expect((markup.match(/data-wb-cer-evidence-state="chosen"/g) || []).length).toBe(2);
    expect(markup).toContain('data-wb-cer-reasoning="both"');
    expect(markup).toContain('data-wb-confidence="very"');
    expect(markup).toContain('data-wb-cer-confidence="very"');
    expect(markup).toContain('data-wb-reasoning-frame="complete"');
    expect(markup).toContain('The unknown matches stem.rocks.calcite on luster and acid reaction');
  });

  it('labels CER evidence by whether it is shared with or can refine a look-alike', () => {
    const shared = workbench({
      lens: true,
      streakDone: true,
      selectedId: 'calcite',
    });
    expect(shared).toContain('data-wb-cer-evidence="luster" data-wb-cer-evidence-state="available" data-wb-cer-context="shared"');
    expect(shared).toContain('data-wb-cer-evidence="streak" data-wb-cer-evidence-state="available" data-wb-cer-context="shared"');
    expect(shared).toContain('Shared with look-alike');

    const refine = workbench({
      lens: true,
      streakDone: true,
      scratch: { steel_nail: 'scratched' },
      selectedId: 'calcite',
    });
    expect(refine).toContain('data-wb-cer-evidence="hardness" data-wb-cer-evidence-state="available" data-wb-cer-context="refine"');
    expect(refine).toContain('Refine vs look-alike');
  });

  it('maps every measured property from the unknown to the selected candidate', () => {
    const markup = workbench({
      lens: true,
      streakDone: true,
      scratch: { fingernail: 'no', penny: 'scratched' },
      fizz: 'fizz',
      selectedId: 'calcite',
    });
    expect(markup).toContain('data-wb-match-map="claim"');
    expect(markup).toContain('data-wb-match-map-state="collapsed-by-default"');
    expect(markup).toContain('Review all measured matches');
    expect(markup).toContain('data-wb-match-property="luster"');
    expect(markup).toContain('data-wb-match-property="streak"');
    expect(markup).toContain('data-wb-match-property="hardness"');
    expect(markup).toContain('data-wb-match-property="acid"');
    expect(markup).toContain('Unknown observation');
    expect(markup).toContain('Candidate reference');
    expect((markup.match(/Matches evidence/g) || []).length).toBe(4);
  });

  it('uses the same half-unit density band in filtering and the evidence match map', () => {
    // Calcite (2.71) and quartz (2.65) share the modeled 2.5–<3.0 g/cm³
    // balance band, so a selectable quartz card must also show a density match.
    const markup = workbench({ spId: 'calcite', lens: true, density: true, selectedId: 'quartz' });
    expect(markup).toContain('data-wb-comparison-dock="selected"');
    expect(markup).toContain('data-wb-match-property="density" data-wb-match-state="match"');
    expect(markup).toContain('2.71 g/cm³ — 2.5–&lt;3.0 g/cm³ measurement band');
    expect(markup).toContain('2.65 g/cm³ — 2.5–&lt;3.0 g/cm³ measurement band');
    expect(markup).not.toContain('data-wb-match-property="density" data-wb-match-state="conflict"');
  });

  it('closes a solved investigation with evidence reflection and a misconception guard', () => {
    const markup = workbench({
      lens: true,
      streakDone: true,
      fizz: 'fizz',
      selectedId: 'calcite',
      solvedId: 'calcite',
      solved: 1,
      claimEvidence: ['luster', 'acid'], claimReasoning: 'both', claimConfidence: 'very',
    });
    expect(markup).toContain('data-wb-investigation-debrief="complete"');
    expect(markup).toContain('Investigation debrief');
    expect(markup).toContain('Strongest discriminator');
    expect(markup).toContain('observations across 3 property types');
    expect(markup).toContain('data-wb-match-map="debrief"');
    expect(markup).toContain('Evidence match map');
    expect(markup).not.toContain('data-wb-match-map-state="collapsed-by-default"');
    expect(markup).toContain('data-wb-confidence-calibration="very"');
    expect(markup).toContain('Very confident. Evidence level: Strong evidence support.');
    expect(markup).toContain('Surface color alone is not enough');
    expect(markup).toContain('Next specimen');
  });

  it('gates early guesses and provides a revise-and-retest recovery path', () => {
    const early = workbench({ lens: true, selectedId: 'calcite' });
    expect(early).toContain('data-wb-claim-ready="false"');
    expect(early).toContain('1 / 2 property types needed');

    const revise = workbench({ lens: true, streakDone: true, guessedWrong: ['quartz'], lastRejectedId: 'quartz' });
    expect(revise).toContain('data-wb-revision="needed"');
    expect(revise).toContain('Revise the claim—do not restart.');
    expect(revise).toContain('Clear evidence');
    expect(revise).toContain('New unknown');
  });

  it('explains when new evidence invalidates a selected candidate and opens its conflict review', () => {
    const state = {
      spId: 'halite', lens: true, fizz: 'none', selectedId: 'calcite',
      claimEvidence: ['luster', 'acid'], claimReasoning: 'both', claimConfidence: 'very',
    };
    const markup = workbench(state);
    expect(markup).toContain('data-wb-revision="measurement-conflict"');
    expect(markup).toContain('data-wb-invalidated-candidate="calcite"');
    expect(markup).toContain('New evidence changed your working claim.');
    expect(markup).toContain('stem.rocks.calcite no longer fits the acid reaction observation.');
    expect(markup).toContain('Review conflict');
    expect(markup).not.toContain('data-wb-candidate-state="selected"');

    const { store, node } = workbenchTree(state);
    const review = findAll(node, (n) => n.type === 'button' && n.props['data-wb-review-conflict'] === 'calcite')[0];
    expect(review, 'review-conflict action').toBeTruthy();
    review.props.onClick();
    expect(store.rocks.wb.selectedId).toBeNull();
    expect(store.rocks.wb.reviewId).toBe('calcite');
    expect(store.rocks.wb.candidateView).toBe('setaside');
    expect(store.rocks.wb.claimEvidence).toEqual([]);
    expect(store.rocks.wb.claimReasoning).toBeNull();
    expect(store.rocks.wb.claimConfidence).toBeNull();
  });

  it('names notebook grouping, coverage states, and elimination progress accessibly', () => {
    const markup = workbench({ lens: true });
    expect(markup).toContain('aria-label="Recorded evidence grouped by property"');
    expect(markup).toContain('data-wb-evidence-type="luster" data-wb-evidence-state="measured" role="listitem" aria-label="Luster. confirmed."');
    expect(markup).toContain('data-wb-evidence-type="hardness" data-wb-evidence-state="not-measured" role="listitem" aria-label="Hardness. Not measured."');
    expect(markup).toContain('aria-valuetext="7 eliminated; 5 still fit."');
  });
});

// ── The streak has to be visible on the plate ───────────────────────────────
//
// The whole premise of the streak test is that you LOOK at the powder. The
// plate was drawn at #fbfbfa — all but white — and ELEVEN of the tool's
// eighteen minerals have a White streak, painted at #f1f5f9. That is a
// luminance difference of about 0.01, so for the majority of minerals there
// was nothing to see and the student had to read the answer instead of
// observing it.
//
// Fixing it by tinting white streaks grey would have been a lie about the
// mineral. Unglazed porcelain biscuit really is an off-white grey, and a pale
// powder really does read as a deposit sitting ON the plate, so the plate is
// now the colour it actually is and the smear carries the faint shadow a real
// one has.
describe('streak plate — the powder is visible for every mineral', () => {
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  // Separation, not brightness. Sulfur's pale yellow sits only 0.079 from the
  // plate in luminance but is obvious on it, because the difference is hue —
  // demanding luminance alone would have forced "white-yellow" to pure white
  // and thrown away a true fact about the mineral. Straight RGB distance
  // captures both, and still fails the state this fixed: the original
  // #f1f5f9 streak on the original #fbfbfa plate scores 0.045.
  const separation = (a, b) => {
    const [x, y, z] = rgb(a), [p, q, r] = rgb(b);
    return Math.sqrt((x - p) ** 2 + (y - q) ** 2 + (z - r) ** 2);
  };

  function minerals() {
    const src = readFileSync(ROCKS_FILE, 'utf8');
    return src.split('\n')
      .filter((l) => /\{\s*id:\s*'/.test(l) && /streak:/.test(l) && /luster:/.test(l))
      .map((l) => ({
        id: /\{\s*id:\s*'(\w+)'/.exec(l)[1],
        hardness: parseFloat(/hardness:\s*([\d.]+)/.exec(l)[1]),
        streak: /streak:\s*'([^']*)'/.exec(l)[1],
      }));
  }

  /** The streak plate svg for one mineral, found by its own viewBox. */
  function plate(id) {
    // This file's render() hands back { store, markup }, not a bare string.
    const { markup } = render({ selectedMineral: id, streakResult: true });
    const anchor = markup.indexOf('viewBox="0 0 168 80"');
    expect(anchor, `no streak plate rendered for ${id}`).toBeGreaterThan(-1);
    const start = markup.lastIndexOf('<svg', anchor);
    return markup.slice(start, markup.indexOf('</svg>', anchor) + 6);
  }

  it('separates every streak colour from the plate it is drawn on', () => {
    const mins = minerals();
    expect(mins.length).toBe(18);
    let checked = 0;
    mins.forEach((m) => {
      const svg = plate(m.id);
      const plateFill = /<rect[^>]*width="116"[^>]*fill="(#[0-9a-fA-F]{6})"/.exec(svg);
      expect(plateFill, `${m.id}: no plate`).toBeTruthy();
      const smear = /<path[^>]*class="rk-smear"[^>]*stroke="(#[0-9a-fA-F]{6})"/.exec(svg)
        || /<path[^>]*stroke="(#[0-9a-fA-F]{6})"[^>]*class="rk-smear"/.exec(svg);
      expect(smear, `${m.id}: nothing drawn on the plate at all`).toBeTruthy();
      checked++;
      // Diamond is harder than the porcelain, so what has to be visible is the
      // GROOVE it cuts rather than a powder — it carries the same class, and
      // it has the same job of being seen.
      if (m.hardness > 6.5) expect(svg).toContain('plate scratched');
      const d = separation(smear[1], plateFill[1]);
      expect(d, `${m.id}: streak ${smear[1]} is invisible on plate ${plateFill[1]}`)
        .toBeGreaterThan(0.10);
    });
    // Guard against the assertion quietly covering nothing.
    expect(checked).toBe(18);
  });

  it('keeps a pale powder legible as a deposit, not as a hue', () => {
    // Hue alone cannot carry a white streak whatever colour the plate is, so
    // the smear sits on the faint shadow a real powder deposit casts.
    // Assert on what RENDERS. A React key never reaches the DOM, so keying the
    // shadow 'smearShadow' and looking for that string passes against nothing.
    const svg = plate('calcite');
    const shadow = /<path[^>]*\bd="M18,53\.4[^"]*"[^>]*stroke="([^"]+)"/.exec(svg);
    expect(shadow, 'no shadow under the smear').toBeTruthy();
    expect(shadow[1]).toMatch(/^rgba\(/);
  });

  it('does not tint a white streak to make it show up', () => {
    // The mineral's answer must stay true: quartz streaks white, and the plate
    // is what changed.
    const src = readFileSync(ROCKS_FILE, 'utf8');
    const table = src.slice(src.indexOf('var RK_STREAK_HEX = {'), src.indexOf('};', src.indexOf('var RK_STREAK_HEX = {')));
    expect(table).toContain("'White': '#ffffff'");
    // And the plate is no longer paper white.
    expect(src).not.toContain("key: 'plate', x: 4, y: 8, width: 116, height: 62, rx: 5, fill: '#fbfbfa'");
  });

  it('still shows the classic pyrite contrast', () => {
    // Brassy gold specimen, greenish-black powder — the case the whole test
    // exists to teach.
    const svg = plate('pyrite');
    expect(svg).toContain('#16301c');
    expect(svg).toContain('looks like');
    expect(svg).toContain('streak');
  });

  it('ships the same bench in both copies', () => {
    const [a, b] = PATHS.map((p) => readFileSync(p, 'utf8'));
    expect(a).toBe(b);
  });
});

// ── The scratch result has to be visible on the specimen ────────────────────
//
// Fourth appearance of the same bug. The groove was a flat #1f2937, which is
// magnetite's body colour EXACTLY, so scratching magnetite cut a groove with
// zero separation from the rock it was cut into. The softer-tool smear was a
// flat #e2e8f0, invisible on quartz, halite, calcite, talc, gypsum and diamond.
// Ten of the eighteen minerals had an unreadable result in a test whose whole
// output is the mark left behind.
describe('scratch bench — the mark is visible on every specimen', () => {
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const separation = (a, b) => {
    const [x, y, z] = rgb(a), [p, q, r] = rgb(b);
    return Math.sqrt((x - p) ** 2 + (y - q) ** 2 + (z - r) ** 2);
  };

  function minerals() {
    const src = readFileSync(ROCKS_FILE, 'utf8');
    return src.split('\n')
      .filter((l) => /\{\s*id:\s*'/.test(l) && /streak:/.test(l) && /luster:/.test(l))
      .map((l) => ({
        id: /\{\s*id:\s*'(\w+)'/.exec(l)[1],
        hardness: parseFloat(/hardness:\s*([\d.]+)/.exec(l)[1]),
        colour: /\bcolor:\s*'([^']+)'/.exec(l)[1],
      }));
  }

  function bench(mineralId, toolId) {
    const { markup } = render({ selectedMineral: mineralId, scratchTool: toolId, scratchAnimProgress: 100 });
    const anchor = markup.indexOf('viewBox="0 0 168 118"');
    expect(anchor, `no scratch bench for ${mineralId}/${toolId}`).toBeGreaterThan(-1);
    const start = markup.lastIndexOf('<svg', anchor);
    return markup.slice(start, markup.indexOf('</svg>', anchor) + 6);
  }

  it('separates both the groove and the smear from the body they are drawn on', () => {
    const mins = minerals();
    expect(mins.length).toBe(18);
    let checked = 0;
    // A diamond scribe cuts everything; a fingernail cuts almost nothing. Between
    // them every mineral gets tested for both marks.
    const toolHardness = { diamond_scribe: 10, fingernail: 2.5 };
    ['diamond_scribe', 'fingernail'].forEach((tool) => {
      mins.forEach((m) => {
        const svg = bench(m.id, tool);
        const body = /<rect[^>]*width="144"[^>]*fill="(#[0-9a-fA-F]{6})"/.exec(svg);
        expect(body, `${m.id}: no specimen body`).toBeTruthy();
        if (m.hardness === toolHardness[tool]) {
          const borderline = /<line[^>]*stroke="#b45309"[^>]*stroke-width="2\.8"[^>]*stroke-dasharray="4 4"/.exec(svg)
            || /<line[^>]*stroke-dasharray="4 4"[^>]*stroke="#b45309"[^>]*stroke-width="2\.8"/.exec(svg);
          expect(borderline, `${m.id}/${tool}: no dotted borderline trace`).toBeTruthy();
          expect(separation('#b45309', body[1]),
            `${m.id}/${tool}: borderline trace is invisible on body ${body[1]}`).toBeGreaterThan(0.10);
          checked++;
          return;
        }
        // The groove is 2.6 wide, the smear 3.4 — whichever this case produced.
        const mark = /<line[^>]*stroke="(#[0-9a-fA-F]{6})"[^>]*stroke-width="(?:2\.6|3\.4)"/.exec(svg)
          || /<line[^>]*stroke-width="(?:2\.6|3\.4)"[^>]*stroke="(#[0-9a-fA-F]{6})"/.exec(svg);
        expect(mark, `${m.id}/${tool}: no mark drawn at all`).toBeTruthy();
        checked++;
        expect(separation(mark[1], body[1]),
          `${m.id}/${tool}: mark ${mark[1]} is invisible on body ${body[1]}`).toBeGreaterThan(0.10);
      });
    });
    expect(checked).toBe(36);
  });

  it('was genuinely broken before — magnetite scored exactly zero', () => {
    // Guards the guard: a threshold that everything passes proves nothing.
    // #1f2937 was the literal groove colour AND magnetite's literal body.
    const magnetite = minerals().find((m) => m.id === 'magnetite');
    expect(magnetite.colour).toBe('#1f2937');
    expect(separation('#1f2937', magnetite.colour)).toBe(0);
  });

  it('keeps the Mohs captions inside the frame at both ends of the scale', () => {
    // At hardness 10 the marker lands at x=156 of a 168-wide viewBox, so
    // "mineral 10" ran off the right edge and rendered as "mineral " — on
    // diamond, whose hardness is the entire point of it.
    const texts = (svg) => [...svg.matchAll(/<text[^>]*\bx="([-\d.]+)"[^>]*>([^<]*)</g)]
      .map((m) => ({ x: parseFloat(m[1]), label: m[2] }));

    const hardest = bench('diamond', 'diamond_scribe');
    const mineralCap = texts(hardest).find((t) => t.label.startsWith('mineral'));
    expect(mineralCap.label).toBe('mineral 10');
    // Centred, ~7.5px font: half-width of "mineral 10" is about 20 units.
    expect(mineralCap.x + 20).toBeLessThanOrEqual(168);
    expect(mineralCap.x - 20).toBeGreaterThanOrEqual(0);

    const softest = bench('talc', 'fingernail');
    const talcCap = texts(softest).find((t) => t.label.startsWith('mineral'));
    expect(talcCap.label).toBe('mineral 1');
    expect(talcCap.x - 20).toBeGreaterThanOrEqual(0);
  });

  it('keeps the marker itself at the true hardness even when the caption moves', () => {
    // Clamping the caption must not lie about where the value sits.
    const svg = bench('diamond', 'diamond_scribe');
    // Mineral marker triangle is filled #7c3aed; its apex x is the true position.
    const marker = /<polygon[^>]*points="([\d.]+),[\d.]+ [^"]*"[^>]*fill="#7c3aed"/.exec(svg);
    expect(marker, 'no mineral marker').toBeTruthy();
    expect(parseFloat(marker[1])).toBeCloseTo(12 + (10 / 10) * 144, 1);
  });

  it('does not print the caption on top of the specimen', () => {
    // The specimen bar ends at y=70. At the old scaleY the caption's glyphs
    // started around y=68.5, so dark purple text sat on magnetite's near-black
    // body.
    const svg = bench('magnetite', 'diamond_scribe');
    const cap = /<text[^>]*\by="([\d.]+)"[^>]*>mineral/.exec(svg);
    expect(cap, 'no mineral caption').toBeTruthy();
    const baseline = parseFloat(cap[1]);
    // Glyph top for a 7.5px font sits roughly 5.5 above the baseline.
    expect(baseline - 5.5).toBeGreaterThan(70);
  });

  it('shares one implementation of the keep-it-visible rule', () => {
    // This bug has appeared four times. The rule lives in one place now, and
    // the rock swatch delegates to it rather than keeping a second copy.
    const src = readFileSync(ROCKS_FILE, 'utf8');
    expect(src).toContain('function rkMarkOn(mark, base, minRatio)');
    // It targets a WCAG RATIO now, not a luminance gap. The first version made
    // marks visible but left the scratch groove as low as 1.07:1 against its
    // specimen — visible, and nowhere near SC 1.4.11's 3:1.
    expect(src).toContain('function rkContrast(a, b)');
    expect(src).toContain("var grooveInk = rkMarkOn('#1f2937', body, 3.0);");
    expect(src).toContain("var edge = rkMarkOn('#0f172a', cols[0], MIN_RATIO);");
    // Still exactly one implementation — the whole point of hoisting it.
    expect([...src.matchAll(/function rkMarkOn\(/g)].length).toBe(1);
    expect([...src.matchAll(/function rkContrast\(/g)].length).toBe(1);
  });
});
