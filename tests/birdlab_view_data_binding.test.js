import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => resetStemLab());

const SOURCE = 'stem_lab/stem_tool_birdlab.js';

// Every view id the menu can reach, read from the source so a new view is
// covered the day it is added rather than the day someone remembers to list it
// here.
function menuViewIds() {
  const src = fs.readFileSync(SOURCE, 'utf8');
  const ids = new Set();
  const re = /^\s{12}id: '([A-Za-z][A-Za-z0-9]*)', title: __alloT\(/gm;
  let m;
  while ((m = re.exec(src))) ids.add(m[1]);
  return [...ids];
}

describe('BirdLab views bind to the data they think they do', () => {
  // REGRESSION. The Beak & Feet diagram array was declared `var FOOT_TYPES` in
  // the component scope, outside BeakFeetLab — so it shadowed the module-level
  // FOOT_TYPES prose array for every view in the component. Foot Types rendered
  // "undefined" as all eight headings, with Shape/Birds/Function blank, because
  // the diagram objects carry label/lifestyle rather than type/shape/birds.
  // Nothing caught it: the visual QA harness renders I-Spy scene states only,
  // so its 402 "exhaustive" states never touch a text view.
  it('renders no undefined field anywhere in a menu view', () => {
    loadTool(SOURCE, 'birdLab');
    const ids = menuViewIds();
    expect(ids.length).toBeGreaterThan(20);

    const broken = [];
    for (const view of ids) {
      const html = renderTool('birdLab', { birdLab: { view } });
      if (typeof html !== 'string' || html.length < 200) {
        broken.push(view + ': rendered ' + (html ? html.length : 0) + ' chars');
        continue;
      }
      // "undefined" reaching the DOM as text means a field name that does not
      // exist on the objects being mapped.
      const text = html.replace(/<[^>]*>/g, ' ');
      if (/\bundefined\b/.test(text)) {
        broken.push(view + ': renders the literal text "undefined"');
      }
    }
    expect(broken).toEqual([]);
  });

  it('keeps the foot prose array and the foot diagram array separately named', () => {
    const src = fs.readFileSync(SOURCE, 'utf8');
    const decls = src.match(/^\s*var FOOT_TYPES = \[/gm) || [];
    expect(decls.length).toBe(1);
    expect(src).toMatch(/var FOOT_DIAGRAMS = \[/);
  });

  // Every key in BEHAVIOR_GLYPH_FOR is a hand-typed glossary term. A typo does
  // not throw — the lookup just returns undefined and the card silently loses
  // its drawing, which is the kind of no-op nothing else would catch.
  it('maps every behaviour glyph to a term that actually exists', () => {
    const src = fs.readFileSync(SOURCE, 'utf8');
    const mapBlock = src.match(/var BEHAVIOR_GLYPH_FOR = \{([\s\S]*?)\};/);
    expect(mapBlock).toBeTruthy();
    const mapped = [...mapBlock[1].matchAll(/'([^']+)':\s*'[a-z]+'/g)].map((m) => m[1]);
    expect(mapped.length).toBeGreaterThan(10);

    const glossBlock = src.match(/var BEHAVIOR_GLOSSARY = \[([\s\S]*?)\n  \];/);
    expect(glossBlock).toBeTruthy();
    const terms = new Set([...glossBlock[1].matchAll(/term: '([^']+)'/g)].map((m) => m[1]));

    expect(mapped.filter((t) => !terms.has(t))).toEqual([]);
  });

  // Same silent-failure shape as the behaviour glyphs: SP_HEADS is keyed by
  // hand-typed species name, and a mismatch just means the bird quietly loses
  // its head plate.
  it('maps every sparrow head plate to a species that actually exists', () => {
    const src = fs.readFileSync(SOURCE, 'utf8');
    const block = src.match(/var SP_HEADS = \{([\s\S]*?)\n  \};/);
    expect(block).toBeTruthy();
    const keyed = [...block[1].matchAll(/^\s{4}'((?:[^'\\]|\\.)+)':\s*\{/gm)]
      .map((m) => m[1].replace(/\\'/g, "'"));
    expect(keyed.length).toBeGreaterThan(8);
    // Species names live across several family arrays; collect them all.
    const allNames = new Set([...src.matchAll(/name: '((?:[^'\\]|\\.)+)'/g)]
      .map((m) => m[1].replace(/\\'/g, "'")));
    expect(keyed.filter((n) => !allNames.has(n))).toEqual([]);
  });

  it('maps every warbler plate to a species that actually exists', () => {
    const src = fs.readFileSync(SOURCE, 'utf8');
    const block = src.match(/var WB = \{([\s\S]*?)\n  \};/);
    expect(block).toBeTruthy();
    const keyed = [...block[1].matchAll(/^\s{4}'((?:[^'\\]|\\.)+)':\s*\{/gm)]
      .map((m) => m[1].replace(/\\'/g, "'"));
    // All fifteen warblers in the view should be drawn, not just some.
    const warblerBlock = src.match(/var WARBLER_PROFILES = \[([\s\S]*?)\n  \];/);
    const species = [...warblerBlock[1].matchAll(/name: '((?:[^'\\]|\\.)+)'/g)]
      .map((m) => m[1].replace(/\\'/g, "'"));
    expect(keyed.filter((n) => !species.includes(n))).toEqual([]);
    expect(species.filter((n) => !keyed.includes(n))).toEqual([]);
  });

  it('renders a whole-bird plate in the warblers view', () => {
    loadTool(SOURCE, 'birdLab');
    const html = renderTool('birdLab', { birdLab: { view: 'warblers' } });
    expect(html).toContain('wbBody-');
    expect(html).toContain('Breeding male');
  });

  it('maps every woodpecker plate to a species that actually exists', () => {
    const src = fs.readFileSync(SOURCE, 'utf8');
    const block = src.match(/var WP = \{([\s\S]*?)\n  \};/);
    expect(block).toBeTruthy();
    const keyed = [...block[1].matchAll(/^\s{4}'((?:[^'\\]|\\.)+)':\s*\{/gm)]
      .map((m) => m[1].replace(/\\'/g, "'"));
    expect(keyed.length).toBe(8);
    const allNames = new Set([...src.matchAll(/name: '((?:[^'\\]|\\.)+)'/g)]
      .map((m) => m[1].replace(/\\'/g, "'")));
    expect(keyed.filter((n) => !allNames.has(n))).toEqual([]);
    // Only the forward direction here: the WOODPECKERS array also carries
    // finches, which are not woodpeckers and correctly have no trunk plate.
  });

  it('renders the Downy/Hairy bill comparison on both of those species', () => {
    loadTool(SOURCE, 'birdLab');
    const html = renderTool('birdLab', { birdLab: { view: 'woodpeckers' } });
    expect(html).toContain('wpBody-');
    expect(html).toContain('Measure the bill against the head');
  });

  it('draws every flycatcher and vireo, and warns on the Empidonax pair', () => {
    const src = fs.readFileSync(SOURCE, 'utf8');
    const block = src.match(/var FV = \{([\s\S]*?)\n  \};/);
    expect(block).toBeTruthy();
    const keyed = [...block[1].matchAll(/^\s{4}'((?:[^'\\]|\\.)+)':\s*\{/gm)]
      .map((m) => m[1].replace(/\\'/g, "'"));
    const arr = src.match(/var FLYCATCHERS_VIREOS = \[([\s\S]*?)\n  \];/);
    const species = [...arr[1].matchAll(/name: '((?:[^'\\]|\\.)+)'/g)]
      .map((m) => m[1].replace(/\\'/g, "'"));
    expect(keyed.filter((n) => !species.includes(n))).toEqual([]);
    expect(species.filter((n) => !keyed.includes(n))).toEqual([]);

    loadTool(SOURCE, 'birdLab');
    const html = renderTool('birdLab', { birdLab: { view: 'flyvireo' } });
    expect(html).toContain('wbBody-fv');

    // The honesty note must survive: silent Empidonax often cannot be named by
    // sight, and a confident drawing without that caveat teaches false
    // certainty. It is gated to the two Empidonax species, so it is not in the
    // default render (index 0 is Eastern Phoebe) — assert it statically, and
    // assert it is still gated to BOTH of them.
    expect(src).toMatch(/cannot be identified to species by sight/);
    expect(src).toMatch(/isEmpid = cur\.name === 'Least Flycatcher' \|\| cur\.name === 'Yellow-bellied Flycatcher'/);
  });

  it('draws both sexes for every waterfowl species', () => {
    const src = fs.readFileSync(SOURCE, 'utf8');
    const block = src.match(/var WF = \{([\s\S]*?)\n  \};/);
    expect(block).toBeTruthy();
    const keyed = [...block[1].matchAll(/^\s{4}'((?:[^'\\]|\\.)+)':\s*\{/gm)]
      .map((m) => m[1].replace(/\\'/g, "'"));
    const arr = src.match(/var WATERFOWL = \[([\s\S]*?)\n  \];/);
    const species = [...arr[1].matchAll(/name: '((?:[^'\\]|\\.)+)'/g)]
      .map((m) => m[1].replace(/\\'/g, "'"));
    expect(keyed.filter((n) => !species.includes(n))).toEqual([]);
    expect(species.filter((n) => !keyed.includes(n))).toEqual([]);
    // Every entry must carry BOTH sexes — drawing only the drake would
    // illustrate the easy half of the problem.
    // Slice each entry by the NEXT top-level key rather than by a closing
    // brace: entries end with "} }," on the f: line, so a brace-anchored regex
    // matches nothing and silently reports every species as broken.
    const starts = [...block[1].matchAll(/^\s{4}'((?:[^'\\]|\\.)+)':\s*\{/gm)];
    const missing = starts.filter((m, i) => {
      const from = m.index;
      const to = i + 1 < starts.length ? starts[i + 1].index : block[1].length;
      const body = block[1].slice(from, to);
      return !/\bm:\s*\{/.test(body) || !/\bf:\s*\{/.test(body);
    }).map((m) => m[1]);
    expect(missing).toEqual([]);

    loadTool(SOURCE, 'birdLab');
    const html = renderTool('birdLab', { birdLab: { view: 'waterfowl' } });
    expect(html).toContain('wfB-');
    expect((html.match(/wfB-/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it('draws every gull at all three plumage stages', () => {
    const src = fs.readFileSync(SOURCE, 'utf8');
    const block = src.match(/var GULLS = \{([\s\S]*?)\n  \};/);
    expect(block).toBeTruthy();
    const keyed = [...block[1].matchAll(/^\s{4}'((?:[^'\\]|\\.)+)':\s*\{/gm)]
      .map((m) => m[1].replace(/\\'/g, "'"));
    const arr = src.match(/var GULL_ID = \[([\s\S]*?)\n  \];/);
    const species = [...arr[1].matchAll(/name: '((?:[^'\\]|\\.)+)'/g)]
      .map((m) => m[1].replace(/\\'/g, "'"));
    expect(keyed.filter((n) => !species.includes(n))).toEqual([]);
    expect(species.filter((n) => !keyed.includes(n))).toEqual([]);
    // years-to-adult drives the caption; a gull without it would claim nothing.
    const starts = [...block[1].matchAll(/^\s{4}'((?:[^'\\]|\\.)+)':\s*\{/gm)];
    const noYears = starts.filter((m, i) => {
      const to = i + 1 < starts.length ? starts[i + 1].index : block[1].length;
      return !/\byears:\s*\d/.test(block[1].slice(m.index, to));
    }).map((m) => m[1]);
    expect(noYears).toEqual([]);

    loadTool(SOURCE, 'birdLab');
    const html = renderTool('birdLab', { birdLab: { view: 'gullId' } });
    // Three figures per species: first winter, adult winter, adult breeding.
    expect((html.match(/glB-/g) || []).length).toBeGreaterThanOrEqual(3);
    expect(html).toContain('First winter');
  });

  it('draws every shorebird with a bill and leg proportion', () => {
    const src = fs.readFileSync(SOURCE, 'utf8');
    const block = src.match(/var SB = \{([\s\S]*?)\n  \};/);
    expect(block).toBeTruthy();
    const starts = [...block[1].matchAll(/^\s{4}'((?:[^'\\]|\\.)+)':\s*\{/gm)];
    const keyed = starts.map((m) => m[1].replace(/\\'/g, "'"));
    const arr = src.match(/var SHOREBIRDS = \[([\s\S]*?)\n  \];/);
    const species = [...arr[1].matchAll(/name: '((?:[^'\\]|\\.)+)'/g)]
      .map((m) => m[1].replace(/\\'/g, "'"));
    expect(keyed.filter((n) => !species.includes(n))).toEqual([]);
    expect(species.filter((n) => !keyed.includes(n))).toEqual([]);
    // The whole point of this plate is that the proportions are to scale, so a
    // species missing either measurement would silently draw a default bird.
    const noMeasure = starts.filter((m, i) => {
      const to = i + 1 < starts.length ? starts[i + 1].index : block[1].length;
      const body = block[1].slice(m.index, to);
      return !/\bbill:\s*[\d.]+/.test(body) || !/\blegLen:\s*[\d.]+/.test(body) || !/\bcurve:\s*-?[\d.]+/.test(body);
    }).map((m) => m[1]);
    expect(noMeasure).toEqual([]);

    loadTool(SOURCE, 'birdLab');
    const html = renderTool('birdLab', { birdLab: { view: 'shorebirds' } });
    expect(html).toContain('sbB-');
    expect(html).toContain('head width');
  });

  // The arrival timeline parses prose dates. An entry that fails to parse does
  // not throw — the species just silently drops off the chart, so the chart
  // would look fine while being incomplete.
  it('plots every spring arrival on the timeline', () => {
    const src = fs.readFileSync(SOURCE, 'utf8');
    const arr = src.match(/var SPRING_ARRIVALS = \[([\s\S]*?)\n  \];/);
    expect(arr).toBeTruthy();
    const dates = [...arr[1].matchAll(/date: '((?:[^'\\]|\\.)+)'/g)].map((m) => m[1]);
    expect(dates.length).toBeGreaterThan(25);

    // Re-implement the same month/qualifier grammar the tool uses, so an entry
    // written in a NEW phrasing fails here rather than vanishing at runtime.
    const MONTHS = { march: 0, april: 31, may: 61 };
    const unparsed = dates.filter((d) => {
      const s = d.toLowerCase().replace(/\([^)]*\)/g, ' ');
      const parts = s.split(/\bto\b/);
      const last = parts[parts.length - 1];
      return !Object.keys(MONTHS).some((m) => last.indexOf(m) >= 0);
    });
    expect(unparsed).toEqual([]);

    loadTool(SOURCE, 'birdLab');
    const html = renderTool('birdLab', { birdLab: { view: 'springArr' } });
    // One bar per species, plus three month gridlines.
    const bars = (html.match(/<rect[^>]*rx="3"/g) || []).length;
    expect(bars).toBe(dates.length);
  });

  it('renders a head plate in the sparrows view', () => {
    loadTool(SOURCE, 'birdLab');
    const html = renderTool('birdLab', { birdLab: { view: 'sparrows' } });
    expect(html).toContain('clipPath');
    expect(html).toContain('Head pattern');
  });

  it('shows the corrected Osprey foot rather than the cranes-and-herons version', () => {
    loadTool(SOURCE, 'birdLab');
    const html = renderTool('birdLab', { birdLab: { view: 'footTypes' } });
    // Herons and cranes take prey with the bill; their foot is the wading foot
    // already listed. The real fish-grasping foot is the Osprey's.
    expect(html).toContain('Fish-grasping foot (Osprey)');
    expect(html).not.toContain('Grasping foot (large toes)');
    expect(html).toContain('spicules');
  });
});
