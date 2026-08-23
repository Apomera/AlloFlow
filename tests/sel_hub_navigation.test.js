// SEL Hub navigation — can a student actually find the right tool?
//
// The hub ships 71 tools. Before this suite, the catalog only matched a tool's
// own marketing copy: 43 of the 71 had no search synonyms at all, so realistic
// queries ("vaping", "adhd", "lgbtq", "nightmares", "bullied") returned ZERO
// results even though the tool existed. Worst case, "want to die" returned two
// unrelated regulation tools and no route to support.
//
// Layer 1 (always runs): the alias map and crisis vocabulary as data.
// Layer 2 (needs React/jsdom): the rendered catalog carries the affordances.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const src = readFileSync(resolve(ROOT, 'sel_hub/sel_hub_module.js'), 'utf8');

function block(startMark, endMark) {
  const i = src.indexOf(startMark);
  if (i < 0) return '';
  return src.slice(i, src.indexOf(endMark, i));
}

// ── catalog + alias data, parsed straight from source ──
const cards = [];
[
  block('var _allSelTools = [', '\n      var _dynamicTools'),
  block('var _dynamicTools = [', '\n      _dynamicTools.forEach'),
].forEach((b) => {
  b.split('\n').forEach((line) => {
    if (/category:\s*true/.test(line)) return;
    const id = /\{\s*id:\s*'([^']+)'/.exec(line);
    if (!id) return;
    const label = /label:\s*'((?:[^'\\]|\\.)*)'/.exec(line);
    const desc = /desc:\s*'((?:[^'\\]|\\.)*)'/.exec(line);
    const range = /recommendedRange:\s*'([^']+)'/.exec(line);
    cards.push({
      id: id[1],
      label: label ? label[1] : '',
      desc: desc ? desc[1] : '',
      range: range ? range[1] : '',
    });
  });
});

const aliases = {};
block('var _selSearchAliasMap = {', '\n      };').split('\n').forEach((line) => {
  const m = /^\s+(\w+):\s*'((?:[^'\\]|\\.)*)'/.exec(line);
  if (m) aliases[m[1]] = m[2];
});

const guidance = {};
block('var SEL_TOOL_GUIDANCE = {', '\n    };').split('\n').forEach((line) => {
  const m = /^\s{6}(\w+):\s*\{/.exec(line);
  if (!m) return;
  const grab = (k) => {
    const r = new RegExp(k + ":\\s*'((?:[^'\\\\]|\\\\.)*)'").exec(line);
    return r ? r[1] : '';
  };
  guidance[m[1]] = [grab('mode'), grab('note'), grab('boundary')].filter(Boolean).join(' ');
});

// mirrors _selToolMatchesSearch exactly
const searchText = (t) => [t.label, t.desc, t.range, guidance[t.id] || '', aliases[t.id] || ''].join(' ').toLowerCase();
function matches(t, query) {
  const q = String(query || '').toLowerCase().trim();
  if (!q) return true;
  const text = searchText(t);
  if (text.indexOf(q) !== -1) return true;
  const terms = q.split(/\s+/).filter((x) => x.length > 1);
  if (!terms.length) return true;
  let n = 0;
  terms.forEach((term) => { if (text.indexOf(term) !== -1) n++; });
  return n > 0 && n >= Math.ceil(Math.min(terms.length, 3) / 2);
}
const search = (q) => cards.filter((c) => matches(c, q)).map((c) => c.id);

describe('SEL Hub · a student can find the tool by typing what they feel', () => {
  it('every tool carries search synonyms', () => {
    const missing = cards.filter((c) => !aliases[c.id]).map((c) => c.id);
    expect(missing, `tools with no search aliases (they match only their own copy): ${missing.join(', ')}`).toEqual([]);
  });

  // The words a student types, not the words the tool is named.
  const QUERIES = [
    ['nightmares', 'sleep'], ['cant sleep', 'sleep'],
    ['vaping', 'substancePsychoed'], ['drugs', 'substancePsychoed'],
    ['adhd', 'execfunction'], ['procrastination', 'execfunction'],
    ['lgbtq', 'identitySupport'], ['gender', 'identitySupport'],
    ['bully', 'upstander'], ['being bullied', 'upstander'],
    ['iep', 'selfAdvocacy'], ['504', 'selfAdvocacy'], ['accommodations', 'selfAdvocacy'],
    ['my friend died', 'griefLoss'], ['grief', 'griefLoss'],
    ['gratitude', 'perma'], ['confidence', 'strengths'],
    ['depressed', 'behavioralActivation'], ['body image', 'bodyStory'],
    ['screen time', 'digitalWellbeing'], ['career', 'careerCompass'],
    ['left out', 'friendship'], ['trauma', 'traumaPsychoed'],
    ['dating', 'healthyRelationships'], ['consent', 'healthyRelationships'],
  ];
  it.each(QUERIES)('"%s" surfaces %s', (query, wanted) => {
    const got = search(query);
    expect(got, `"${query}" returned ${got.length} result(s) and did not include ${wanted}`).toContain(wanted);
  });

  it('no realistic query dead-ends with zero results', () => {
    const dead = QUERIES.map(([q]) => q).filter((q) => search(q).length === 0);
    expect(dead, `queries returning nothing at all: ${dead.join(', ')}`).toEqual([]);
  });
});

describe('SEL Hub · crisis vocabulary routes to support, not to a grid', () => {
  const terms = block('var _selCrisisTerms = [', '];');

  it.each([
    'want to die', 'wanna die', 'kill myself', 'suicide', 'suicidal',
    'self harm', 'hurt myself', 'cutting', 'hopeless', 'better off dead',
  ])('%s is in the crisis vocabulary', (phrase) => {
    expect(terms.toLowerCase()).toContain(phrase);
  });

  it('the crisis panel does not claim anyone is automatically told', () => {
    // Honest-copy rule: searching is not a disclosure to an adult, and the hub
    // must not imply it is. Guards the same promise/delivery gap as CRISIS-1.
    const panel = block("_selQueryIsCrisis(selToolSearch) && h('div'", 'Open Crisis Companion');
    expect(panel).toContain('does not tell anyone');
    expect(panel).not.toMatch(/an adult (will|has) be(en)? (told|notified)/i);
  });

  it('the panel routes to the Crisis Companion tool', () => {
    const panel = block("_selQueryIsCrisis(selToolSearch) && h('div'", 'Open Crisis Companion');
    expect(panel).toContain("openSelToolById('crisiscompanion'");
  });

  it('elementary gets a person, non-elementary also gets the hotlines', () => {
    const fn = block('function _selCrisisBandLines()', '\n        }');
    expect(fn).toContain("gradeBand(gradeLevel) === 'elementary'");
    expect(fn).toContain('988');
    expect(fn).toContain('741741');
  });
});

describe('SEL Hub · the catalog says what it is showing', () => {
  it('the empty state triggers on the count, not only on search', () => {
    // Gating it on the search string meant a grid emptied by a category chip, a
    // pathway or a station rendered nothing at all - no message, no way back.
    expect(src).toContain('_selVisibleCount === 0 && h(');
    expect(src).not.toMatch(/_searchLower && _filteredTools\.length === 0/);
  });

  it('the empty state offers a way back to the full catalog', () => {
    const panel = block('_selVisibleCount === 0 && h(', 'Filters cleared');
    expect(panel).toContain("setSelToolSearch('')");
    expect(panel).toContain('setSelCategoryFilter(null)');
    expect(panel).toContain('setActivePathway(null)');
    // The setter is setActiveStationId, not setActiveStation. This assertion
    // originally pinned the wrong name, so it passed against a call that would
    // have thrown ReferenceError the moment a student cleared filters while a
    // Station was active. check_free_vars caught it; this test did not. A
    // source-text assertion is only as good as the name it is given.
    expect(panel).toContain('setActiveStationId(null)');
    expect(panel).not.toContain('setActiveStation(null)');
  });

  it('category chips resolve by label, not by a fuzzy id match', () => {
    // '_cat_DecisionMaking' does not contain 'responsibledecisionmaking', so the
    // old id-substring match returned nothing and that chip filtered the grid to
    // an empty page. Both the chip counts and the filter now use one helper.
    expect(src).toContain('function _selCategoryHeaderFor(catId)');
    expect(src).toContain('var matchHeader = _selCategoryHeaderFor(selCategoryFilter);');
    expect(src).not.toMatch(/t2\.id\.toLowerCase\(\)\.indexOf\(selCategoryFilter/);
  });

  it('every category chip resolves to a section that actually holds tools', () => {
    const catBlock = block('var SEL_CATEGORIES = [', '\n    ];');
    const catLabels = [...catBlock.matchAll(/label:\s*'([^']+)'/g)].map((m) => m[1].toLowerCase());
    const headerBlock = block('var _allSelTools = [', '\n      var _dynamicTools');
    const headerLabels = [...headerBlock.matchAll(/category:\s*true/g)].length
      ? headerBlock.split('\n').filter((l) => /category:\s*true/.test(l))
          .map((l) => (/label:\s*'([^']+)'/.exec(l) || [])[1])
          .filter(Boolean).map((x) => x.toLowerCase())
      : [];
    const orphans = catLabels.filter((c) => headerLabels.indexOf(c) < 0);
    expect(orphans, `filter chips with no matching section: ${orphans.join(', ')}`).toEqual([]);
  });
});

// ── Layer 2: the rendered catalog ──
const MODULES = join(ROOT, 'desktop/web-app', 'node_modules');
let R = null;
try {
  const req = createRequire(join(ROOT, 'desktop', 'web-app', 'package.json'));
  R = { JSDOM: req('jsdom').JSDOM, React: req('react'), RDS: req('react-dom/server') };
} catch (e) { R = null; }

describe.skipIf(!R)('SEL Hub · rendered navigation affordances', () => {
  let doc;
  it('renders the catalog', () => {
    const dom = new R.JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
    const sg = (k, v) => { try { globalThis[k] = v; } catch { Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true }); } };
    sg('window', dom.window); sg('document', dom.window.document); sg('navigator', dom.window.navigator);
    sg('localStorage', dom.window.localStorage); sg('sessionStorage', dom.window.sessionStorage);
    sg('HTMLElement', dom.window.HTMLElement); sg('CustomEvent', dom.window.CustomEvent);
    const noop = () => {};
    const Icon = () => null;
    window.React = R.React; sg('React', R.React);
    window.AlloIcons = new Proxy({}, { get: () => Icon });
    window.AlloModules = {};
    window.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop });
    sg('Audio', function () { return { play: () => Promise.resolve() }; });
    const load = (f) => new Function('require', readFileSync(f, 'utf8'))(createRequire(import.meta.url));
    load(resolve(ROOT, 'sel_hub/sel_hub_module.js'));
    readdirSync(resolve(ROOT, 'sel_hub')).filter((f) => /\.js$/.test(f) && f !== 'sel_hub_module.js')
      .forEach((f) => { try { load(resolve(ROOT, 'sel_hub', f)); } catch { /* tool-local load issue, not this test's concern */ } });
    window.__alloflowSelSnapshots = []; window.__alloflowStudentArtifacts = [];
    const html = R.RDS.renderToStaticMarkup(R.React.createElement(window.AlloModules.SelHub, {
      showSelHub: true, setShowSelHub: noop, selHubTab: 'explore', setSelHubTab: noop,
      selHubTool: null, setSelHubTool: noop, addToast: noop, gradeLevel: '8th Grade',
      callGemini: null, onSafetyFlag: noop, studentCodename: 'test', t: (k) => k,
      ArrowLeft: Icon, X: Icon, Sparkles: Icon, Heart: Icon, GripVertical: Icon,
      onExportRequested: noop,
    }));
    doc = new R.JSDOM('<!doctype html><body>' + html + '</body>').window.document;
    expect(doc.querySelectorAll('[data-sel-tool-card-id]').length).toBeGreaterThan(60);
  });

  it('the search box has a live result summary tied to it', () => {
    const input = doc.querySelector('#sel-tool-search-input');
    const count = doc.querySelector('#sel-tool-search-count');
    expect(input.getAttribute('aria-describedby')).toBe('sel-tool-search-count');
    expect(count.getAttribute('aria-live')).toBe('polite');
    expect(count.textContent).toMatch(/Showing all \d+ tools/);
  });

  it('every category chip states its tool count, and none is empty', () => {
    const chips = [...doc.querySelectorAll('[aria-label^="Filter: "]')];
    expect(chips.length).toBeGreaterThan(0);
    const empty = chips.map((c) => c.getAttribute('aria-label')).filter((l) => /\(0 tools\)/.test(l));
    expect(empty, `category chips that would filter to an empty grid: ${empty.join(', ')}`).toEqual([]);
  });

  it('a card is named by its tool, not by a paragraph', () => {
    // The accessible name used to carry the description, the guidance mode and
    // note, the boundary and the teacher cue. Across the grid that was 17,132
    // characters, worst case 3,491 on one card, so the catalog could not be
    // skimmed by ear at all. Detail moved to aria-describedby.
    const cards = [...doc.querySelectorAll('[data-sel-tool-card-id]')];
    const lens = cards.map((c) => (c.getAttribute('aria-label') || '').length);
    const total = lens.reduce((a, b) => a + b, 0);
    const worst = Math.max(...lens);
    expect(worst, `longest card name is ${worst} characters`).toBeLessThan(120);
    expect(total, `hearing the whole grid costs ${total} characters`).toBeLessThan(6000);
  });

  it('every card points at a description that exists and is unique', () => {
    const cards = [...doc.querySelectorAll('[data-sel-tool-card-id]')];
    const ids = cards.map((c) => c.getAttribute('aria-describedby'));
    expect(ids.every(Boolean), 'every card must have aria-describedby').toBe(true);
    expect(new Set(ids).size, 'describedby ids must be unique').toBe(ids.length);
    const missing = ids.filter((id) => !doc.getElementById(id));
    expect(missing, `describedby targets absent from the DOM: ${missing.join(', ')}`).toEqual([]);
  });

  it('the detail survives the move into the description', () => {
    const desc = doc.getElementById('sel-card-desc-crisiscompanion');
    expect(desc).toBeTruthy();
    expect(desc.textContent).toMatch(/Best for:/);
    expect(desc.textContent.length).toBeGreaterThan(80);
  });

  it('a card that needs care still says so in its name', () => {
    // The boundary flag changes whether you should open the tool at all, so it
    // stays in the name rather than moving to the description.
    const card = doc.querySelector('[data-sel-tool-card-id="crisiscompanion"]');
    expect(card.getAttribute('aria-label')).toMatch(/Use with care/);
  });

  it('the chip counts account for every card in the catalog', () => {
    const chips = [...doc.querySelectorAll('[aria-label^="Filter: "]')];
    const sum = chips.reduce((n, c) => n + Number(/\((\d+) tools\)/.exec(c.getAttribute('aria-label'))[1]), 0);
    expect(sum).toBe(doc.querySelectorAll('[data-sel-tool-card-id]').length);
  });
});
