// City Planning Lab, render smoke.
//
// The core suite proves the MODEL. This one proves the panel actually renders,
// which is the gap the design doc flagged: nothing in city_lab_core.test.js
// would notice a hook declared after a conditional, a helper called before it
// is defined, or a tab that throws on open.
//
// Real React 18 out of desktop/web-app/node_modules, rendered with
// renderToStaticMarkup. useEffect does not run under SSR, so this covers the
// render path only; pointer behaviour and the browser smoke are still owed.
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require(resolve(MODULES_DIR, 'react'));
const ReactDOMServer = require(resolve(MODULES_DIR, 'react-dom/server'));

let cfg;
let P;

beforeAll(() => {
  const captured = [];
  window.StemLab = {
    registerTool(id, c) { captured.push({ id, cfg: c }); },
    isRegistered() { return false; }
  };
  delete window.__alloCityLabPure;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_citylab.js'), 'utf8'))();
  P = window.__alloCityLabPure;
  cfg = captured[0].cfg;
  if (!cfg || typeof cfg.render !== 'function') throw new Error('cityLab did not register a render');
});

function makeCtx(overrides) {
  const announced = [];
  const ctx = Object.assign({
    React,
    t: (k, fb) => (fb != null ? fb : k),
    theme: 'dark',
    toolData: {},
    setToolData() {},
    setStemLabTool() {},
    announceToSR(msg) { announced.push(msg); },
    awardXP() {},
    celebrate() {},
    beep() {},
    icons: {}
  }, overrides || {});
  ctx._announced = announced;
  return ctx;
}

function renderPanel(ctx) {
  function Panel() { return cfg.render(ctx); }
  return ReactDOMServer.renderToStaticMarkup(React.createElement(Panel));
}

describe('City Planning Lab - the panel renders at all', () => {
  it('renders without throwing, in both themes', () => {
    expect(() => renderPanel(makeCtx({ theme: 'dark' }))).not.toThrow();
    expect(() => renderPanel(makeCtx({ theme: 'light' }))).not.toThrow();
  });

  it('follows the SUBSTRATE rather than the app theme, and still responds to contrast', () => {
    const dark = renderPanel(makeCtx({ theme: 'dark' }));
    const light = renderPanel(makeCtx({ theme: 'light' }));
    const contrast = renderPanel(makeCtx({ theme: 'contrast' }));
    // This used to assert dark !== light, on the reasoning that a tool rendering
    // identically in both themes must have hardcoded one of them. That premise does
    // not hold here. In dark theme the host wraps every tool in a WHITE card
    // (stem_lab_module.js ~1633), and cityLab paints only TRANSLUCENT panels over it,
    // so its substrate is white in BOTH themes. Driving its ink tokens off the app
    // theme put #e2e8f0/#94a3b8 on that white card: 143 failing nodes, the tool title
    // at 1.23:1. Rendering identically in light and dark is now the CORRECT outcome.
    // Contrast is the one theme whose substrate really changes -- the host keeps a
    // black surface there -- so that is where a difference must still appear, and
    // that is what catches a future hardcoded palette.
    expect(dark).toBe(light);
    expect(contrast).not.toBe(light);
    expect(dark).toMatch(/background:/);
    expect(light).toMatch(/background:/);
    expect(contrast).toMatch(/background:/);
  });

  it('draws all 144 parcels as real buttons with an id and a label', () => {
    const html = renderPanel(makeCtx());
    P.allParcelIds().forEach((id) => {
      expect(html, 'parcel ' + id + ' missing').toContain('id="citylab-parcel-' + id + '"');
    });
    const parcelButtons = html.match(/<button[^>]*id="citylab-parcel-/g) || [];
    expect(parcelButtons).toHaveLength(144);
  });

  it('gives every parcel an aria-label that names the land use, not just the id', () => {
    const html = renderPanel(makeCtx());
    expect(html).toMatch(/aria-label="D6, [^"]*Commercial/);
    expect(html).toMatch(/aria-label="E6, [^"]*River/);
    // The floodplain and the road-reach state are spoken, not colour-only.
    expect(html).toMatch(/in the floodplain/);
  });
});

describe('City Planning Lab - every tab opens', () => {
  // Tabs are chosen by internal state, so drive them the way a student would:
  // render once per tab id by pre-seeding through the exported tab list is not
  // available, so instead assert the tab controls exist and that the default
  // tab paints the pieces that matter. The remaining tabs are covered by
  // rendering with a stub that flips useState's initial value.
  const TAB_LABELS = ['Design', 'Parcel table', 'Assumption Lab', 'Memo', 'How this works'];

  it('offers every tab as a real tab control', () => {
    const html = renderPanel(makeCtx());
    TAB_LABELS.forEach((label) => {
      expect(html, 'tab missing: ' + label).toContain('>' + label + '</button>');
    });
    expect(html).toContain('role="tablist"');
  });

  it('renders each tab body without throwing', () => {
    // Swap React.useState so the FIRST string-valued state (the tab) starts on
    // the tab under test. The plan state initialises from a function, so it is
    // untouched by this.
    const realUseState = React.useState;
    const tabs = ['design', 'table', 'assume', 'memo', 'about'];
    try {
      tabs.forEach((want) => {
        let swapped = false;
        React.useState = function (init) {
          if (!swapped && init === 'design') { swapped = true; return realUseState(want); }
          return realUseState(init);
        };
        expect(() => renderPanel(makeCtx()), 'tab threw: ' + want).not.toThrow();
      });
    } finally {
      React.useState = realUseState;
    }
  });
});

describe('City Planning Lab - accessibility invariants in the markup', () => {
  it('uses no div with role and tabindex, the dead-control class', () => {
    const html = renderPanel(makeCtx());
    expect(html).not.toMatch(/<div[^>]*role="button"/);
    expect(html).not.toMatch(/<span[^>]*role="button"/);
    expect(html).not.toMatch(/<div[^>]*tabindex=/i);
  });

  it('labels every select, so the table path is usable by screen reader', () => {
    const realUseState = React.useState;
    try {
      let swapped = false;
      React.useState = function (init) {
        if (!swapped && init === 'design') { swapped = true; return realUseState('table'); }
        return realUseState(init);
      };
      const html = renderPanel(makeCtx());
      const selects = html.match(/<select[^>]*>/g) || [];
      expect(selects.length).toBeGreaterThan(100);
      selects.forEach((s) => expect(s, 'unlabelled select: ' + s).toMatch(/aria-label=|id=/));
      expect(html).toMatch(/aria-label="Land use for parcel A1"/);
    } finally {
      React.useState = realUseState;
    }
  });

  it('gives every data table a caption', () => {
    const realUseState = React.useState;
    try {
      let swapped = false;
      React.useState = function (init) {
        if (!swapped && init === 'design') { swapped = true; return realUseState('table'); }
        return realUseState(init);
      };
      const html = renderPanel(makeCtx());
      const tables = html.match(/<table/g) || [];
      const captions = html.match(/<caption/g) || [];
      expect(tables.length).toBeGreaterThan(0);
      expect(captions.length).toBe(tables.length);
    } finally {
      React.useState = realUseState;
    }
  });

  it('carries no timer, countdown or score language', () => {
    const html = renderPanel(makeCtx()).toLowerCase();
    expect(html).not.toMatch(/\bcountdown\b|\btime left\b|\bseconds remaining\b/);
    expect(html).not.toMatch(/\byour score\b|\bfinal score\b/);
  });
});

describe('City Planning Lab - the contested tier never reaches the markup', () => {
  // The tier test in the core suite guards the indicator ids. This guards the
  // rendered page, which is what a student actually reads. The wording below
  // is deliberately narrow: the About panel DISCUSSES rents by name, and that
  // is the point, so this looks for a contested quantity presented as a
  // value rather than for the mere mention of the word.
  it('never prints a contested quantity as a number with a label', () => {
    const html = renderPanel(makeCtx());
    const badPatterns = [
      /average rent[^<]{0,20}[$0-9]/i,
      /rent:\s*\$?[0-9]/i,
      /property value[^<]{0,20}[$0-9]/i,
      /jobs created[^<]{0,20}[0-9]/i,
      /displacement[^<]{0,20}[0-9]+%/i,
      /approval[^<]{0,20}[0-9]+%/i,
      /crime[^<]{0,20}[0-9]/i
    ];
    badPatterns.forEach((re) => expect(html, 'contested quantity rendered: ' + re).not.toMatch(re));
  });

  it('still says out loud that those things are missing on purpose', () => {
    const realUseState = React.useState;
    try {
      let swapped = false;
      React.useState = function (init) {
        if (!swapped && init === 'design') { swapped = true; return realUseState('about'); }
        return realUseState(init);
      };
      const html = renderPanel(makeCtx());
      expect(html).toMatch(/missing on purpose|deliberately not|not modelled/i);
      expect(html).toMatch(/contested/i);
    } finally {
      React.useState = realUseState;
    }
  });
});

// The panel initialises its plan from localStorage. Seeding a built-out plan
// is what makes the Assumption Lab show real deltas: on the untouched baseline
// the cost is $0 and the runoff ratio is 100% under every set, so nothing
// moves and the formatting under test never runs.
const STORE_KEY = 'allo_citylab_plan_v1';

function seedBuiltPlan() {
  const useAll = (p, ids, u) => ids.reduce((a, id) => P.setUse(a, id, u), p);
  const giAll = (p, ids) => ids.reduce((a, id) => P.toggleGreenInfra(a, id), p);
  const roadAll = (p, pairs) => pairs.reduce((a, e) => P.setEdge(a, e[0], e[1], 'local'), p);
  const homes = [];
  ['A', 'B', 'C'].forEach((c) => [9, 10, 11, 12].forEach((r) => homes.push(c + r)));
  ['A', 'B', 'C'].forEach((c) => [1, 2].forEach((r) => homes.push(c + r)));
  homes.push('A3', 'B3');
  let p = useAll(P.basePlan(), homes, 'mixed');
  p = giAll(p, homes);
  p = useAll(p, ['D10', 'D2', 'D12'], 'park');
  const pairs = [];
  for (let r = 8; r <= 11; r++) pairs.push(['C' + r, 'C' + (r + 1)]);
  [9, 10, 11, 12].forEach((r) => pairs.push(['A' + r, 'B' + r], ['B' + r, 'C' + r], ['C' + r, 'D' + r]));
  for (let r = 2; r <= 5; r++) pairs.push(['C' + r, 'C' + (r - 1)]);
  [1, 2, 3].forEach((r) => pairs.push(['A' + r, 'B' + r], ['B' + r, 'C' + r], ['C' + r, 'D' + r]));
  pairs.push(['D2', 'D1']);
  window.localStorage.setItem(STORE_KEY, JSON.stringify(roadAll(p, pairs)));
}

function clearPlan() { window.localStorage.removeItem(STORE_KEY); }

// Render on a chosen tab, optionally flipping the first false-initialised
// state (which is `compared`, so the Assumption Lab shows its results).
function renderOnTab(tab, flipFirstFalse) {
  const realUseState = React.useState;
  let tabDone = false, falseDone = false;
  React.useState = function (init) {
    if (!tabDone && init === 'design') { tabDone = true; return realUseState(tab); }
    if (flipFirstFalse && !falseDone && init === false) { falseDone = true; return realUseState(true); }
    return realUseState(init);
  };
  try {
    return renderPanel(makeCtx());
  } finally {
    React.useState = realUseState;
  }
}

// Three defects the screenshots caught that no assertion had. Each is cheap to
// guard and each was invisible to the model suite.
describe('City Planning Lab - regressions the screenshots caught', () => {
  beforeEach(() => seedBuiltPlan());
  afterEach(() => clearPlan());

  it('loads the seeded plan, so these assertions are not run against an empty board', () => {
    const html = renderOnTab('assume', true);
    expect(html).toMatch(/Moved when the assumptions moved \((?!0\))/);
  });

  it('never prints a raw negative currency value', () => {
    // A -7,420,000 delta fell past both magnitude thresholds and rendered as
    // the literal "$-7420000" in the Assumption Lab change column.
    const html = renderOnTab('assume', true);
    expect(html).not.toMatch(/\$-\d/);
    expect(html).toMatch(/-\$\d/);
  });

  it('renders a change in a ratio as points, not as a share of today', () => {
    const html = renderOnTab('assume', true);
    // "Runoff versus today" reads "124% of today" as a LEVEL. Its change is a
    // difference of percentage points, and calling that "-8% of today" would
    // be a different and wrong claim.
    expect(html).toMatch(/points/);
    expect(html).not.toMatch(/>-\d+% of today</);
  });

  it('does not colour the assumption deltas as good or bad', () => {
    // The tool states it does not judge whether a plan is good. Colouring a
    // delta green or orange ranks the two assumption sets, and the direction
    // of "better" is not the same for cost as for park land.
    const html = renderOnTab('assume', true);
    const changeCells = html.match(/<td class="text-right tabular-nums font-bold"[^>]*>/g) || [];
    expect(changeCells.length).toBeGreaterThan(0);
    changeCells.forEach((cell) => {
      expect(cell).not.toContain('#1baf7a');
      expect(cell).not.toContain('#eb6834');
    });
  });

  it('never lists an indicator the open town does not model', () => {
    // Harborlight has no aquifer. Its water indicators were both zero and
    // still appeared under "did not move at all", which is true and
    // completely meaningless.
    const realUseState = React.useState;
    try {
      let swapped = false;
      React.useState = function (init) {
        if (!swapped && init === 'design') { swapped = true; return realUseState('assume'); }
        return realUseState(init);
      };
      window.localStorage.setItem(STORE_KEY,
        JSON.stringify(Object.assign(P.basePlan('harborlight'), { assumptionSetId: 'central' })));
      const html = renderPanel(makeCtx());
      expect(html).toContain('Harborlight');
      expect(html, 'a water indicator leaked into a town with no water model')
        .not.toContain('Water left under the safe yield');
      expect(html).not.toContain('Water demand (cubic metres per day)');
    } finally {
      React.useState = realUseState;
      clearPlan();
    }
  });

  it('carries park access in the table as well as on the map', () => {
    // The map marks "no park within 5 minutes" with a star. If the table
    // omits it, the table is a summary rather than the peer path it claims.
    const html = renderOnTab('table', false);
    expect(html).toContain('Park');
    expect(html).toMatch(/Park . 5 min|Park &le; 5 min|Park ≤ 5 min/);
  });

  it('makes the destructive reset a two-step, visually distinct control', () => {
    const html = renderOnTab('memo', false);
    expect(html).toMatch(/>Start over<\/button>/);
    // Not armed on first render, so the confirming button must be absent.
    expect(html).not.toMatch(/Yes, clear the plan/);
  });

  it('shows the constraint standing inside the memo tab', () => {
    const html = renderOnTab('memo', false);
    expect(html).toContain('Where your plan stands');
    expect(html).toMatch(/of 4 required/);
  });
});

describe('City Planning Lab - the scorecard is legible in the markup', () => {
  it('separates measured from modelled on screen, not only in the data', () => {
    const html = renderPanel(makeCtx());
    // Match the section HEADERS specifically. The words also appear in prose
    // ("Modelled, not measured" sits in the runoff caveat, which renders
    // earlier), so a bare indexOf compares the wrong occurrences.
    const measuredAt = html.indexOf('>Measured</div>');
    const modelledAt = html.indexOf('>Modelled</div>');
    expect(measuredAt, 'no Measured section header').toBeGreaterThan(-1);
    expect(modelledAt, 'no Modelled section header').toBeGreaterThan(-1);
    expect(modelledAt).toBeGreaterThan(measuredAt);
    // and the contested tier is named as a third section, below both
    expect(html.indexOf('>Deliberately not modelled</div>')).toBeGreaterThan(modelledAt);
  });

  it('shows the baseline plan honestly: no new homes, nothing spent', () => {
    const html = renderPanel(makeCtx());
    expect(html).toContain('New homes a road reaches');
    expect(html).toContain('Public infrastructure cost');
    // 24 existing dwellings sit in the floodplain before the student does anything.
    expect(html).toContain('Existing homes in the floodplain');
  });

  it('offers the keyboard shortcut list as a real control', () => {
    const html = renderPanel(makeCtx());
    expect(html).toMatch(/Keyboard shortcuts<\/button>/);
    expect(html).toMatch(/>Undo<\/button>/);
    expect(html).toMatch(/>Redo<\/button>/);
  });
});
