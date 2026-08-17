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
