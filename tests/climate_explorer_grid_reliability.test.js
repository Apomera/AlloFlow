import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, makeCtx, newStore, renderTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
import { indexOfOrThrow } from './helpers/anchored_slice.js';

function renderRenewables(state = {}) {
  return renderTool('climateExplorer', {
    climateExplorer: Object.assign({ tab: 'renewables' }, state)
  }, {});
}

// Drive a real range input's onChange, the way a student's drag does, and
// return the resulting mix. Pins BEHAVIOUR (what the handler does to state)
// rather than the spelling of the handler, so a refactor that keeps the
// invariant keeps the test green.
function dragSlider(label, value, seed) {
  const store = newStore({ climateExplorer: Object.assign({ tab: 'renewables' }, seed) });
  const ctx = makeCtx({}, store);
  const tool = window.StemLab._registry.climateExplorer;
  const tree = tool.render(Object.assign({}, ctx, { toolData: store.toolData }));
  let found = null;
  (function walk(n) {
    if (!n || typeof n !== 'object' || found) return;
    if (Array.isArray(n)) return n.forEach(walk);
    const p = n.props || {};
    if (p.type === 'range' && p['aria-label'] === label + ' slider') { found = n; return; }
    if (p.children) walk(p.children);
  })(tree);
  if (!found) throw new Error('no "' + label + '" slider rendered');
  found.props.onChange({ target: { value: String(value) } });
  const s = store.toolData.climateExplorer;
  return { s, cleanSum: s.rsSolar + s.rsWind + s.rsHydro + s.rsNuclear };
}

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_climateExplorer.js', 'climateExplorer');
});

describe('Renewables mix is a share of one grid', () => {
  const seed = { rsSolar: 30, rsWind: 30, rsHydro: 20, rsNuclear: 15 };

  it('never lets the clean sources exceed the whole grid', () => {
    // The defect this guards: the four sliders used to be independent, so
    // dragging every one to 100% produced a 400%-of-demand "mix" that still
    // reported 89% emissions reduction and earned the Net-Zero badge.
    for (const label of ['Solar', 'Wind', 'Hydro', 'Nuclear']) {
      const { cleanSum } = dragSlider(label, 100, seed);
      expect(cleanSum).toBeLessThanOrEqual(100);
    }
  });

  it('makes the other sources give way when one is raised', () => {
    const { s, cleanSum } = dragSlider('Solar', 100, seed);
    expect(s.rsSolar).toBe(100);
    expect(cleanSum).toBe(100);
    expect(s.rsWind + s.rsHydro + s.rsNuclear).toBe(0);
  });

  it('reopens fossil share when a clean source is lowered', () => {
    const { cleanSum } = dragSlider('Nuclear', 0, { rsSolar: 20, rsWind: 15, rsHydro: 10, rsNuclear: 55 });
    expect(cleanSum).toBe(45);
    expect(100 - cleanSum).toBe(55); // fossil fills the gap
  });
});

describe('Renewables mix has to keep the lights on', () => {
  it('flags a brownout for an all-variable grid with no storage', () => {
    const html = renderRenewables({ rsSolar: 100, rsWind: 0, rsHydro: 0, rsNuclear: 0, rsStorage: 0 });
    expect(html).toContain('Brownout risk');
    expect(html).not.toContain('real energy planners');
  });

  it('clears the brownout once storage firms the variable output', () => {
    const html = renderRenewables({ rsSolar: 100, rsWind: 0, rsHydro: 0, rsNuclear: 0, rsStorage: 100 });
    expect(html).not.toContain('Brownout risk');
    expect(html).toContain('serve demand around the clock');
  });

  it('treats hydro and nuclear as firm capacity without storage', () => {
    const html = renderRenewables({ rsSolar: 5, rsWind: 0, rsHydro: 40, rsNuclear: 55, rsStorage: 0 });
    expect(html).not.toContain('Brownout risk');
  });

  it('withholds the Paris-goals praise from a grid that cannot serve load', () => {
    const html = renderRenewables({ rsSolar: 60, rsWind: 40, rsHydro: 0, rsNuclear: 0, rsStorage: 0 });
    expect(html).toContain('cannot keep the lights on');
  });
});

describe('Renewables tab declares its model boundary', () => {
  // Every other teaching model in this tool states its limits
  // (see climate_explorer_science.test.js). This one now does too.
  it('says it is a teaching model and not a grid simulator', () => {
    const html = renderRenewables();
    expect(html).toContain('not a grid simulator');
    expect(html).toContain('capacity-credit values');
  });

  it('charges storage its own manufacturing emissions', () => {
    // Same generation mix, more storage => slightly LOWER headline reduction.
    const lean = renderRenewables({ rsSolar: 100, rsWind: 0, rsHydro: 0, rsNuclear: 0, rsStorage: 0 });
    const heavy = renderRenewables({ rsSolar: 100, rsWind: 0, rsHydro: 0, rsNuclear: 0, rsStorage: 100 });
    // indexOfOrThrow, not indexOf: a raw slice(indexOf) fails OPEN if the
    // label ever moves, and this assertion would then pass against nothing.
    const pct = (h) => {
      const i = indexOfOrThrow(h, 'Emissions Reduction', { label: 'reduction readout' });
      const matches = h.slice(0, i).match(/>(\d+)%</g);
      if (!matches) throw new Error('no percentage rendered before the reduction readout');
      return Number(matches.pop().match(/\d+/)[0]);
    };
    expect(pct(heavy)).toBeLessThan(pct(lean));
  });
});

describe('Reliability readout does not narrate the drag', () => {
  // feedback_live_region_narrates_simulation: a live region must carry state
  // TRANSITIONS, never a value that moves with every input tick. rsReliability
  // changes on each slider step, so it lives in plain content and only the
  // brownout crossing is spoken.
  it('announces the brownout crossing once across a 20-tick drag', () => {
    const said = [];
    const store = newStore({ climateExplorer: { tab: 'renewables', rsSolar: 5, rsWind: 0, rsHydro: 40, rsNuclear: 55, rsStorage: 0 } });
    const ctx = makeCtx({ announceToSR: (m) => said.push(m) }, store);
    const tool = window.StemLab._registry.climateExplorer;
    for (let v = 5; v <= 100; v += 5) {
      const tree = tool.render(Object.assign({}, ctx, { toolData: store.toolData }));
      let found = null;
      (function walk(n) {
        if (!n || typeof n !== 'object' || found) return;
        if (Array.isArray(n)) return n.forEach(walk);
        const p = n.props || {};
        if (p.type === 'range' && p['aria-label'] === 'Solar slider') { found = n; return; }
        if (p.children) walk(p.children);
      })(tree);
      found.props.onChange({ target: { value: String(v) } });
    }
    expect(said).toHaveLength(1);
    expect(said[0]).toContain('Brownout risk');
  });

  it('keeps the moving reliability number out of any live region', () => {
    const html = renderRenewables({ rsSolar: 100, rsWind: 0, rsHydro: 0, rsNuclear: 0, rsStorage: 0 });
    const live = html.match(/<div[^>]*role="status"[^>]*>[\s\S]{0,400}?<\/div>/g) || [];
    for (const region of live) {
      expect(region).not.toContain('reserve target');
    }
  });
});

// Shared: find a <button> whose rendered text contains `label` and click it.
function clickButton(store, ctx, label) {
  const textOf = (n) => {
    let out = '';
    (function w(x) {
      if (x == null || typeof x === 'boolean') return;
      if (typeof x === 'string' || typeof x === 'number') { out += ' ' + x; return; }
      if (Array.isArray(x)) return x.forEach(w);
      if (x.props) w(x.props.children);
    })(n);
    return out;
  };
  const tool = window.StemLab._registry.climateExplorer;
  const tree = tool.render(Object.assign({}, ctx, { toolData: store.toolData }));
  let found = null;
  (function walk(n) {
    if (!n || typeof n !== 'object' || found) return;
    if (Array.isArray(n)) return n.forEach(walk);
    const p = n.props || {};
    if (n.type === 'button' && typeof p.onClick === 'function' && textOf(n).includes(label)) { found = n; return; }
    if (p.children) walk(p.children);
  })(tree);
  if (!found) throw new Error('no button matching ' + label);
  found.props.onClick();
}

describe('Carbon calculator scores the click the student just made', () => {
  const highStart = { tab: 'carbon', ccTransport: 2, ccFood: 0, ccEnergy: 0, ccWaste: 0 };
  const badgesOf = (store) => Object.keys((store.toolData.climateExplorer || {}).badges || {});

  it('awards Low Footprint on the click that drops the total under 2,000', () => {
    // carbonTotal() reads render-time captures, so scoring it inside the
    // handler returned the total from BEFORE the click: the badge used to
    // arrive one click late, attached to whatever the student did next.
    const store = newStore({ climateExplorer: Object.assign({}, highStart) });
    const ctx = makeCtx({}, store);
    clickButton(store, ctx, 'Walk / Bike');
    expect(badgesOf(store)).toContain('lowFootprint');
  });

  it('does not lose a badge when one click earns two', () => {
    // earnBadge() built its copy from the render-time `badges`, so two calls
    // in one handler raced and the second upd() clobbered the first.
    const store = newStore({ climateExplorer: Object.assign({}, highStart) });
    const ctx = makeCtx({}, store);
    clickButton(store, ctx, 'Walk / Bike');
    expect(badgesOf(store)).toEqual(expect.arrayContaining(['firstCalc', 'lowFootprint']));
  });

  it('stays idempotent when the same choice is clicked again', () => {
    const store = newStore({ climateExplorer: Object.assign({}, highStart) });
    const ctx = makeCtx({}, store);
    clickButton(store, ctx, 'Walk / Bike');
    const after = badgesOf(store).sort();
    clickButton(store, ctx, 'Walk / Bike');
    expect(badgesOf(store).sort()).toEqual(after);
  });
});

describe('Badge awards survive real React batching', () => {
  // The SSR harness applies each setToolData immediately, which can hide a
  // lost update. This mounts the tool with the real React 18 client renderer
  // so both awards land inside ONE batched re-render, the way a student's
  // click actually behaves. Against the pre-fix tool this renders
  // ["firstCalc"] only -- lowFootprint was clobbered and never shown.
  it('keeps both badges when a single click earns two', async () => {
    const tool = window.StemLab._registry.climateExplorer;
    const seen = [];
    function Host() {
      const [toolData, setToolData] = React.useState({
        climateExplorer: { tab: 'carbon', ccTransport: 2, ccFood: 0, ccEnergy: 0, ccWaste: 0 }
      });
      seen.push(Object.keys((toolData.climateExplorer || {}).badges || {}));
      return tool.render({
        React, toolData, setToolData,
        setStemLabTool() {}, gradeLevel: '8th Grade',
        t: (k, fb) => (fb == null ? k : fb),
        icons: new Proxy({}, { get: () => () => null }),
        awardXP() {}, addToast() {}, announceToSR() {}
      });
    }
    const div = document.createElement('div');
    document.body.appendChild(div);
    const root = ReactDOMClient.createRoot(div);
    await React.act(async () => { root.render(React.createElement(Host)); });
    const target = Array.from(div.querySelectorAll('button'))
      .find((b) => (b.textContent || '').includes('Walk / Bike'));
    expect(target, 'Walk / Bike option button').toBeTruthy();
    await React.act(async () => { target.click(); });
    expect(seen[seen.length - 1]).toEqual(expect.arrayContaining(['firstCalc', 'lowFootprint']));
    await React.act(async () => { root.unmount(); });
    div.remove();
  });
});

describe('Canvas drawing survives a missing 2D context', () => {
  // getContext('2d') returns null when a browser has lost the context or hit
  // its canvas limit. Every draw helper here stamped its cache key BEFORE
  // touching the context, so the throw also poisoned the cache — the chart
  // would stay blank even after the context came back.
  it('guards every 2D context it acquires', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_climateExplorer.js', 'utf8');
    const acquisitions = source.split("getContext('2d')").length - 1;
    expect(acquisitions).toBeGreaterThan(0);
    // Each acquisition is followed within ~2 lines by a null check on the
    // variable it was assigned to.
    const guarded = source
      .split("getContext('2d')")
      .slice(1)
      .filter((tail) => /^[^\n]*\n?[^\n]*\n?[^\n]*if \(!(c|g)\)/.test(tail));
    expect(guarded.length).toBe(acquisitions);
  });

  it('renders tabs that draw charts even when getContext returns null', () => {
    const proto = window.HTMLCanvasElement.prototype;
    const orig = proto.getContext;
    proto.getContext = () => null;
    try {
      for (const tab of ['carbon', 'renewables', 'keeling']) {
        expect(() => renderTool('climateExplorer', { climateExplorer: { tab } }, {}), tab).not.toThrow();
      }
    } finally {
      proto.getContext = orig;
    }
  });
});

describe('A malformed saved project cannot blank the lab', () => {
  // A saved project file is INPUT: a student can hand-edit it, copy it, or
  // carry it between tool versions. The STEM shell's error boundary is
  // unkeyed, so ONE tool's throw blanks the whole lab — and the bad file need
  // not even belong to the tool on screen (a bad ccTransport crashed every
  // tab, including Keeling and Justice).
  // Pre-fix this found 233 crashing combinations across 6 keys:
  // ccTransport/ccFood/ccEnergy/ccWaste (option indexes), rsTimespan (drove an
  // empty timeline), pathway (non-object reached path.sectors.map).
  const TABS = ['carbon', 'renewables', 'keeling', 'tipping', 'justice', 'solutions', 'pathways', 'forceHunt'];
  const HOSTILE = { num: 9999, neg: -1, str: 'abc', frac: 1.5, arr: [], obj: {}, bool: true };

  // ~3,300 SSR renders (59 keys x 7 hostile values x 8 tabs). That legitimately
  // exceeds vitest's 5s default, and a timeout here would read as a crash when
  // it is only a budget. Raised deliberately rather than papered over with
  // retries, which would hide a real regression.
  it('renders every tab for every hostile value of every persisted key', { timeout: 30000 }, () => {
    const src = fs.readFileSync('stem_lab/stem_tool_climateExplorer.js', 'utf8');
    const keys = [...new Set((src.match(/\bd\.[a-zA-Z_][a-zA-Z0-9_]*/g) || []).map((s) => s.slice(2)))];
    // Guard the instrument itself: if key discovery breaks, this test must
    // fail rather than silently sweep nothing.
    expect(keys.length).toBeGreaterThan(40);
    expect(keys).toContain('ccTransport');
    expect(keys).toContain('pathway');

    const failures = [];
    for (const key of keys) {
      for (const [name, value] of Object.entries(HOSTILE)) {
        for (const tab of TABS) {
          const state = { tab };
          state[key] = value;
          try {
            renderTool('climateExplorer', { climateExplorer: state }, {});
          } catch (e) {
            failures.push(`${key}=${name} on ${tab}: ${e.message}`);
          }
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it('clamps an out-of-range option index to a real choice', () => {
    const html = renderTool('climateExplorer', { climateExplorer: { tab: 'carbon', ccTransport: 9999 } }, {});
    // Falls back to option 0 (Walk / Bike, 0 kg) rather than throwing.
    expect(html).toContain('Walk / Bike');
  });
});

describe('Charts of the student’s own work describe their data', () => {
  // Both canvases are tabbable, so a keyboard user LANDS on them. They used to
  // announce only "carbon footprint donut chart visualization" / "emissions
  // timeline visualization" — no numbers at all, while the Keeling chart right
  // below already carried its real values.
  const labelFor = (html, needle) => {
    const m = html.match(new RegExp('aria-label="([^"]*' + needle + '[^"]*)"'));
    return m ? m[1] : null;
  };

  it('names the footprint split, largest share first', () => {
    const html = renderTool('climateExplorer', {
      climateExplorer: { tab: 'carbon', ccTransport: 2, ccFood: 0, ccEnergy: 0, ccWaste: 0 }
    }, {});
    const label = labelFor(html, 'footprint breakdown');
    expect(label).toBeTruthy();
    expect(label).toContain('Total');
    expect(label).toContain('Transport');
    // Car-alone (1200) is the biggest slice in this state, so it leads.
    expect(label.indexOf('Transport')).toBeLessThan(label.indexOf('Waste'));
  });

  it('tracks the emissions trajectory and the 1.5 degree line', () => {
    const dirty = renderTool('climateExplorer', { climateExplorer: { tab: 'renewables' } }, {});
    const dirtyLabel = labelFor(dirty, 'Projected global energy');
    expect(dirtyLabel).toContain('above the 1.5 degree line');

    const clean = renderTool('climateExplorer', {
      climateExplorer: { tab: 'renewables', rsSolar: 40, rsWind: 35, rsHydro: 15, rsNuclear: 10, rsStorage: 80 }
    }, {});
    expect(labelFor(clean, 'Projected global energy')).toContain('at or below the 1.5 degree line');
  });

  it('moves the described numbers when the student changes the mix', () => {
    const a = labelFor(renderTool('climateExplorer', { climateExplorer: { tab: 'renewables' } }, {}), 'Projected');
    const b = labelFor(renderTool('climateExplorer', {
      climateExplorer: { tab: 'renewables', rsSolar: 60, rsWind: 30, rsHydro: 5, rsNuclear: 5, rsStorage: 90 }
    }, {}), 'Projected');
    expect(a).not.toBe(b);
  });
});

describe('Shared host resources, not private ones', () => {
  const SOURCES = ['stem_lab/stem_tool_climateExplorer.js',
                   'desktop/web-app/public/stem_lab/stem_tool_climateExplorer.js'];

  it('takes the host AudioContext instead of leaking a private one', () => {
    // WebKit refuses a fifth live AudioContext, and this tool never called
    // close(), so an iPad student who opened it plus three other sound tools
    // lost audio in the next one. Gated lab-wide by
    // tests/stem_audio_context_sharing_sweep.test.js; pinned here too because
    // this tool was the last one still holding a private context.
    for (const path of SOURCES) {
      const source = fs.readFileSync(path, 'utf8');
      expect(source, path).toContain('window.StemLab.audioContext ? window.StemLab.audioContext()');
      // Every creation goes through the helper — no bare `new AudioContext()`
      // left outside the guarded expression.
      const creations = (source.match(/new\s*\(?\s*(?:window\.)?(?:webkit)?AudioContext/g) || []).length;
      const guarded = source.split('window.StemLab.audioContext ? window.StemLab.audioContext() : new (window.AudioContext || window.webkitAudioContext)()').length - 1;
      expect(creations, path + ' creations all routed').toBe(guarded);
    }
  });

  it('copies the report through the host clipboard helper', () => {
    // In Canvas the raw Clipboard API is blocked and only alloCopyText's
    // execCommand fallback lands, so a direct writeText dropped the export
    // silently. Gated lab-wide by tests/stem_clipboard_route_sweep.test.js.
    for (const path of SOURCES) {
      const source = fs.readFileSync(path, 'utf8');
      expect(source, path).toContain('window.StemLab.writeClipboard || function (value) { return navigator.clipboard.writeText(value); })(');
    }
  });
});

describe('The export report carries the student’s own writing', () => {
  // The Radiative Forcing tab is the only place a student reasons in prose
  // (a hypothesis, then an explanation). The report is the artifact a teacher
  // actually reads, and it was dropping that writing entirely — footprint,
  // energy design, pledges and badges made it, the student's thinking did not.
  const exportWith = (forceHunt) => {
    const store = newStore({ climateExplorer: { tab: 'carbon', forceHunt } });
    const ctx = makeCtx({}, store);
    const tool = window.StemLab._registry.climateExplorer;
    const tree = tool.render(Object.assign({}, ctx, { toolData: store.toolData }));
    const textOf = (n) => {
      let out = '';
      (function w(x) {
        if (x == null || typeof x === 'boolean') return;
        if (typeof x === 'string' || typeof x === 'number') { out += ' ' + x; return; }
        if (Array.isArray(x)) return x.forEach(w);
        if (x.props) w(x.props.children);
      })(n);
      return out;
    };
    let button = null;
    (function walk(n) {
      if (!n || typeof n !== 'object' || button) return;
      if (Array.isArray(n)) return n.forEach(walk);
      const p = n.props || {};
      if (n.type === 'button' && typeof p.onClick === 'function' && textOf(n).includes('Export')) { button = n; return; }
      if (p.children) walk(p.children);
    })(tree);
    expect(button, 'Export button').toBeTruthy();
    button.props.onClick();
    return (store.toolData.climateExplorer || {}).exportedReport || '';
  };

  it('includes the hypothesis and the explanation', () => {
    const report = exportWith({ hypothesis: 'Albedo wins while ice cover is high.', explanation: 'Clouds cut both ways.' });
    expect(report).toContain('In My Own Words');
    expect(report).toContain('Albedo wins while ice cover is high.');
    expect(report).toContain('Clouds cut both ways.');
  });

  it('quotes every line of a multi-line answer', () => {
    const report = exportWith({ hypothesis: 'First line.\nSecond line.' });
    expect(report).toContain('> First line.');
    expect(report).toContain('> Second line.');
  });

  it('omits the section entirely when the student wrote nothing', () => {
    expect(exportWith({ hypothesis: '   ', explanation: '' })).not.toContain('In My Own Words');
    expect(exportWith(undefined)).not.toContain('In My Own Words');
  });
});

describe('Solution claims stay inside what the tool can support', () => {
  // feedback_misconception_pack_carries_one: the risky sentence is the
  // confident closer at the end of an otherwise-accurate paragraph -- the
  // "and this is why..." nobody checked separately. Three were here.
  const source = () => fs.readFileSync('stem_lab/stem_tool_climateExplorer.js', 'utf8');

  it('does not crown one solution the single highest-impact change', () => {
    // The 70% figure is the standard UN number and stands; the coda did not.
    // The tool's OWN sector chart contradicts it: Electricity & heat 25%,
    // Agriculture + land use 24%.
    const src = source();
    expect(src).not.toContain('Redesigning them is the highest-impact change');
    expect(src).toContain('Cities concentrate about 70% of energy-related emissions');
    expect(src).toContain('not that any single change tops the list');
  });

  it('keeps the forest sink and the land sink as separate figures', () => {
    // "2.6 billion tons — about 30% of human emissions" fused two numbers.
    // 2.6 Gt is 7% of this tool's own 37 Gt BASELINE_GT (4.8% of its ~54 Gt
    // CO2e total); the ~30% belongs to the whole land sink (~11 Gt).
    const src = source();
    expect(src).not.toContain('2.6 billion tons of CO\u2082/year \u2014 about 30% of human emissions');
    expect(src).toContain('Land ecosystems together absorb roughly 30%');
  });

  it('does not promise a numeric multiplier for outreach', () => {
    // Reaching 100 people is not 100 people acting, and students PLEDGE these.
    const src = source();
    expect(src).not.toContain('multiplies impact 100');
    expect(src).toContain('Reaches people no single household change can');
  });

  it('keeps the arithmetic self-consistent: 2.6 Gt is not 30% of the baseline', () => {
    // A live check rather than a spelling pin: whatever the baseline becomes,
    // 2.6 Gt must never be described as ~30% of it.
    const src = source();
    const baseline = Number((src.match(/BASELINE_GT = (\d+)/) || [])[1]);
    expect(baseline, 'BASELINE_GT parsed').toBeGreaterThan(0);
    expect(Math.round((2.6 / baseline) * 100), 'forest sink as % of baseline').toBeLessThan(15);
  });
});

describe('Sea Level Rise Explorer never mislabels its own scenario', () => {
  // feedback_label_asserts_an_outcome_the_model_never_computes: a label may name
  // a scenario, an index or a state -- never a result the code did not derive
  // for THAT input.
  //
  // SLR_IMPACTS is keyed 0,1,2,3,5,10 and the drag handler snaps to those, but
  // slrMeters is PERSISTED state. A saved file carrying 4/6/7/8/9 fell through
  // `|| SLR_IMPACTS[1]`, so the panel read "+9 m" directly above "150M people
  // displaced / most coastal adaptation still possible" -- the ONE-METRE
  // scenario, with IPCC citations attached to it.
  const panel = (slrMeters) => {
    const html = renderTool('climateExplorer', { climateExplorer: { tab: 'tipping', slrMeters } }, {});
    const at = indexOfOrThrow(html, 'Sea Level Rise Explorer', { label: 'SLR panel' });
    return html.slice(at, at + 2000).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  };
  // displaced count -> the metre key that scenario belongs to
  const OWNER = { '150': 1, '280': 2, '410': 3, '700': 5, '1100': 10 };

  it('shows the heading and the scenario for the SAME metre value', () => {
    for (let m = 0; m <= 10; m++) {
      const text = panel(m);
      const shown = Number((text.match(/\+(\d+) m/) || [])[1]);
      const displaced = (text.match(/(\d+)M people displaced/) || [])[1];
      if (m === 0) { expect(text, '0 m is the baseline').toContain('Baseline'); continue; }
      expect(Number.isFinite(shown), `heading rendered for persisted ${m}`).toBe(true);
      expect(OWNER[displaced], `persisted ${m} shows a real scenario`).toBeDefined();
      expect(OWNER[displaced], `persisted ${m}: heading says +${shown} m but the scenario is the ${OWNER[displaced]} m one`)
        .toBe(shown);
    }
  });

  it('never falls back to the 1 m scenario for a higher persisted value', () => {
    for (const m of [4, 6, 7, 8, 9]) {
      expect(panel(m), `persisted ${m} m must not show the 1 m text`)
        .not.toContain('Most coastal adaptation still possible');
    }
  });

  it('keeps one key list for the read snap, the write snap and the tick marks', () => {
    // Two lists would silently drift back apart.
    const src = fs.readFileSync('stem_lab/stem_tool_climateExplorer.js', 'utf8');
    expect(src).toContain('var SLR_KEYS = [0, 1, 2, 3, 5, 10]');
    expect((src.match(/\[0, 1, 2, 3, 5, 10\]/g) || []).length, 'only the one literal key list').toBe(1);
  });
});

describe('An unknown persisted tab falls back to a real tab, not an empty shell', () => {
  // Every render branch is `tab === '<id>'`, so an id this build does not know
  // matched none of them: the tool rendered its header, the route cards, the
  // tab strip and a "Carbon Calculator" banner with NO BODY -- a dead-end
  // screen that looks functional. `|| 'carbon'` only catches null/empty, and
  // `tab` is PERSISTED state (a saved file, a renamed tab, another version).
  const sizeOf = (tab) =>
    renderTool('climateExplorer', { climateExplorer: { tab } }, {}).length;

  it('renders the full carbon tab for an id this build does not know', () => {
    const carbon = sizeOf('carbon');
    for (const bad of ['nonsense', 'CARBON', 'Carbon', 'tipping ', '', 'forcehunt']) {
      expect(sizeOf(bad), `unknown tab ${JSON.stringify(bad)} renders a real tab`).toBe(carbon);
    }
  });

  it('still routes every id this build DOES know to its own body', () => {
    // Guards the fallback from swallowing real tabs: each known id must render
    // something distinct, or the allow-list has gone wrong.
    const TABS = ['carbon', 'renewables', 'keeling', 'tipping', 'justice', 'solutions', 'pathways', 'forceHunt'];
    const sizes = TABS.map(sizeOf);
    expect(new Set(sizes).size, `distinct renders across ${TABS.length} tabs`).toBeGreaterThan(5);
  });

  it('keeps the allow-list in step with the render branches', () => {
    // If someone adds a `tab === 'newTab'` branch without listing it, that tab
    // becomes unreachable from a saved file. Derive both from source.
    const src = fs.readFileSync('stem_lab/stem_tool_climateExplorer.js', 'utf8');
    const branches = [...new Set((src.match(/tab === '([a-zA-Z]+)'/g) || [])
      .map((s) => s.replace(/tab === '|'/g, '')))].sort();
    const listed = (src.match(/var CE_RENDERABLE_TABS = \[([^\]]+)\]/) || [])[1];
    expect(listed, 'CE_RENDERABLE_TABS declared').toBeTruthy();
    const allow = listed.split(',').map((s) => s.trim().replace(/'/g, '')).sort();
    expect(allow, 'allow-list matches the render branches').toEqual(branches);
  });
});

describe('Every persisted SELECTOR resolves to something a student could have chosen', () => {
  // The round 10-11 shape, swept across the rest of the tool: a persisted value
  // used to pick content, where an unknown id falls through to a silent default
  // that does not match what the controls show as selected.
  const render = (state) =>
    renderTool('climateExplorer', { climateExplorer: state }, {});

  it('an unknown scale does not silently multiply the footprint by 330 million', () => {
    // scaleLabel is a 3-way ternary: school / city / ELSE country. Anything
    // unknown meant "USA (330M)" with no scale button selected.
    const text = (v) => render({ tab: 'carbon', ccScale: v }).replace(/<[^>]+>/g, ' ');
    expect(text('country'), 'country still reaches the USA scale').toContain('USA (330M)');
    for (const bad of ['nonsense', 'SCHOOL', 'usa', '']) {
      expect(text(bad), `unknown scale ${JSON.stringify(bad)}`).not.toContain('USA (330M)');
    }
  });

  it('always highlights exactly the IPCC scenario it describes', () => {
    // scenarioPicked fell through to IPCC_SCENARIOS[2], so the panel described
    // SSP2-4.5 in full while NO button carried aria-pressed="true".
    for (const v of ['ssp119', 'ssp126', 'ssp245', 'ssp370', 'ssp585', 'zzz', 'SSP245', '']) {
      const html = render({ tab: 'tipping', scenarioPicked: v });
      const pressed = (html.match(/aria-pressed="true"/g) || []).length;
      expect(pressed, `scenario ${JSON.stringify(v)} highlights one button`).toBeGreaterThan(0);
    }
  });

  it('does not empty the solutions list for an unknown category', () => {
    // The filter is `ssCategory === 'all' || s.cat === ssCategory`, so an id
    // outside the chip row showed only the cat:'all' rows.
    const all = render({ tab: 'solutions', ssCategory: 'all' }).length;
    for (const bad of ['zzz', 'ALLCAPS', 'food', 'digital']) {
      expect(render({ tab: 'solutions', ssCategory: bad }).length, `unknown category ${bad}`).toBe(all);
    }
    // ...while the real chips still filter to something smaller.
    expect(render({ tab: 'solutions', ssCategory: 'energy' }).length).toBeLessThan(all);
  });

  it('keeps an unknown justice view on a view the tool can render', () => {
    const risk = render({ tab: 'justice', cjView: 'risk' }).length;
    for (const bad of ['zzz', 'responsibility', '']) {
      expect(render({ tab: 'justice', cjView: bad }).length, `unknown view ${bad}`).toBe(risk);
    }
  });
});
