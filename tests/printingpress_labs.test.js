// Printing Press hands-on labs (2026-11-03, pass 5). Four modules that had no
// interaction at all now each carry a lab whose numbers come from a model:
// halftone screens (Color Printing), Petrucci's triple impression (Music
// Printing), Mercator's sec(latitude) stretch (Maps), and a counterfeit bench
// (Printing Money). PP_SRC points the suite at another copy.
import { describe, it, expect, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const MODULES_DIR = ['desktop/web-app/node_modules', 'node_modules']
  .map((p) => resolve(process.cwd(), p))
  .find((p) => existsSync(resolve(p, 'react')));
const React = require(resolve(MODULES_DIR, 'react'));
const ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require(resolve(MODULES_DIR, 'react-dom/test-utils'));

const SOURCE = process.env.PP_SRC || 'stem_lab/stem_tool_printingpress.js';
const noop = () => {};
let mounted = null;

function mount(initial) {
  const reg = {
    _registry: {}, _order: [],
    registerTool(id, config) { config.id = id; this._registry[id] = config; this._order.push(id); },
    isRegistered(id) { return !!this._registry[id]; },
    getRegisteredTools() { return this._order.map((id) => this._registry[id]); },
    renderTool(id, ctx) { const t = this._registry[id]; return t && t.render ? t.render(ctx) : null; },
  };
  window.StemLab = reg;
  globalThis.StemLab = reg;
  if (!window.React) window.React = React;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), SOURCE), 'utf8'))();
  const cfg = reg._registry.printingPress;
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  function Harness() {
    const [toolData, setToolData] = React.useState({ printingPress: initial || {} });
    const update = (toolId, key, val) => setToolData((prev) => ({ ...prev, [toolId]: { ...(prev[toolId] || {}), [key]: val } }));
    const updateMulti = (toolId, obj) => setToolData((prev) => ({ ...prev, [toolId]: { ...(prev[toolId] || {}), ...obj } }));
    return cfg.render({ React, toolData, setToolData, update, updateMulti, addToast: noop, announceToSR: noop,
      awardXP: noop, callGemini: null, gradeLevel: '7th Grade', t: (k, f) => f || k, icons: new Proxy({}, { get: () => () => null }) });
  }
  act(() => { root.render(React.createElement(Harness)); });
  mounted = { host, root };
  return host;
}
afterEach(() => { if (mounted) { act(() => mounted.root.unmount()); mounted.host.remove(); mounted = null; } });

const lab = (host) => {
  const el = host.querySelector('.printingpress-lab');
  expect(el, 'the module shows its lab').toBeTruthy();
  return el;
};
const btns = (scope) => Array.from(scope.querySelectorAll('button'));
const byText = (scope, text) => btns(scope).find((b) => b.textContent.includes(text));
const click = (el) => act(() => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); });
function slide(host, id, value) {
  const input = host.querySelector('#' + id);
  expect(input, id).toBeTruthy();
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  act(() => { setter.call(input, String(value)); input.dispatchEvent(new window.Event('input', { bubbles: true })); });
}

describe('Halftone lab', () => {
  it('sizes the dots from the ink sliders and describes them to screen readers', () => {
    const host = mount({ view: 'colorPrinting' });
    const l = lab(host);
    slide(host, 'pp-ht-c-range', 40);
    const svg = l.querySelector('svg[role="img"]');
    expect(svg.getAttribute('aria-label')).toContain('cyan 40%');
    expect(l.querySelectorAll('pattern').length).toBe(4);
  });

  it('switches to screens 6° apart, zoomed out, and explains the moiré', () => {
    const host = mount({ view: 'colorPrinting' });
    const l = lab(host);
    slide(host, 'pp-ht-zoom', 5);
    const toggle = byText(l, 'few degrees apart');
    click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(l.textContent).toContain('C 39°, M 51°');
    expect(l.textContent).toContain('1×');
    expect(l.textContent).toContain('moiré');
  });
});

describe('Petrucci lab', () => {
  it('prints in three passes, in order', () => {
    const l = lab(mount({ view: 'musicPrinting' }));
    expect(byText(l, 'Pass 2: notes').disabled).toBe(true);
    click(byText(l, 'Pass 1: staff lines'));
    expect(byText(l, 'Pass 2: notes').disabled).toBe(false);
  });

  it('shows that a half-space slip before the notes pass prints a different tune', () => {
    const host = mount({ view: 'musicPrinting' });
    const l = lab(host);
    slide(host, 'pp-pe-dy', 4);
    slide(host, 'pp-pe-dx', 32);
    ['Pass 1: staff lines', 'Pass 2: notes', 'Pass 3: words'].forEach((n) => click(byText(l, n)));
    expect(l.textContent).toContain('Composer wrote: G A B C D C B A');
    expect(l.textContent).toContain('Sheet says: F G A B C B A G');
    expect(l.textContent).toContain('every note 1 step(s) lower');
    expect(l.textContent).toContain('slid 1 note(s) along');
  });

  it('offers Attaingnant\'s single impression, which is always in register', () => {
    const host = mount({ view: 'musicPrinting' });
    const l = lab(host);
    slide(host, 'pp-pe-dy', 4);
    click(byText(l, 'single impression'));
    expect(host.querySelector('#pp-pe-dy')).toBeNull();
    click(byText(l, 'Pull the single impression'));
    expect(l.textContent).toContain('Sheet says: G A B C D C B A');
  });
});

describe('Mercator lab', () => {
  it('stretches by 1/cos(latitude) and areas by its square', () => {
    const host = mount({ view: 'mapsAtlases' });
    const l = lab(host);
    slide(host, 'pp-me-lat', 60);
    expect(l.textContent).toContain('stretches distances 2.00×');
    expect(l.textContent).toContain('areas look 4.0× too big');
    slide(host, 'pp-me-lat', 0);
    expect(l.textContent).toContain('1.00×');
    expect(l.textContent).toContain('Africa is about 14 times bigger');
  });
});

describe('Counterfeit bench', () => {
  it('lets the UV check expose the office-paper fake, and grades the verdict', () => {
    const host = mount({ view: 'printMoney' });
    const l = lab(host);
    const pickGroup = l.querySelector('[role="group"]');
    const seen = {};
    for (const n of ['A', 'B']) {
      click(byText(pickGroup, 'Note ' + n));
      click(byText(l, 'UV lamp'));
      seen[n] = l.querySelector('p[aria-live]').textContent;
      click(byText(l, 'UV lamp'));
    }
    const fake = /glows bright/.test(seen.A) ? 'A' : 'B';
    expect(seen[fake === 'A' ? 'B' : 'A']).toContain('paper stays dark');
    const verdict = l.querySelectorAll('[role="group"]')[1];
    click(byText(verdict, 'Note ' + (fake === 'A' ? 'B' : 'A')));
    expect(l.textContent).toContain('✗ Note');
    click(byText(verdict, 'Note ' + fake));
    expect(l.textContent).toContain('✓ Note ' + fake + ' is the fake');
  });
});

// Pass 6: six more labs.
describe('Ink kitchen', () => {
  it('names each fault the recipe causes, and passes a balanced ink', () => {
    const host = mount({ view: 'inkMaterials' });
    const l = lab(host);
    expect(l.textContent).toContain('A clean proof');
    click(byText(l, 'Thin (short boil)'));
    slide(host, 'pp-ink-amount', 5);
    expect(l.textContent).toContain('yellowish halo');
    expect(l.textContent).toContain('filling in');
    click(byText(l, 'Strong (long boil)'));
    slide(host, 'pp-ink-amount', 3);
    slide(host, 'pp-ink-black', 40);
    expect(l.textContent).toContain('picking');
    slide(host, 'pp-ink-black', 5);
    expect(l.textContent).toContain('Grey, weak letters');
  });
});

describe('Reformation bestseller', () => {
  it('counts quarto sheets and reaches Luther\'s formula with all four choices', () => {
    const l = lab(mount({ view: 'reformation' }));
    expect(l.textContent).toContain('6 sheet(s)');
    click(btns(l).find((b) => b.textContent === 'German'));
    click(btns(l).find((b) => b.textContent === '8 pages'));
    click(byText(l, 'Woodcut title border'));
    click(byText(l, 'name on the front'));
    expect(l.textContent).toContain('1 sheet(s)');
    expect(l.textContent).toContain('best-selling author of the 1520s');
  });
});

describe('Translate like Tyndale', () => {
  it('compares each choice with Tyndale and the King James Bible', () => {
    const l = lab(mount({ view: 'translation' }));
    ['congregation', 'elder', 'love', 'repent'].forEach((w) => click(btns(l).find((b) => b.textContent === w)));
    expect(l.textContent).toContain('agrees with Tyndale on 4 of 4 and with the King James Bible on 2 of 4');
  });
});

describe('Take apart a poster', () => {
  it('grades the five technique matches', () => {
    const host = mount({ view: 'propaganda' });
    const l = lab(host);
    const pick = (id, v) => act(() => { const sel = host.querySelector('#pp-po-' + id); sel.value = v; sel.dispatchEvent(new window.Event('change', { bubbles: true })); });
    pick('a', 'slogan'); pick('b', 'address'); pick('c', 'symbols'); pick('d', 'bandwagon'); pick('e', 'action');
    click(byText(l, 'Check my matches'));
    expect(l.textContent).toContain('3 of 5 matched');
    pick('d', 'action'); pick('e', 'bandwagon');
    click(byText(l, 'Check my matches'));
    expect(l.textContent).toContain('5 of 5 matched');
  });
});

describe('The gutter', () => {
  it('offers McCloud\'s six transitions and explains each', () => {
    const l = lab(mount({ view: 'comics' }));
    const group = l.querySelector('[role="group"]');
    expect(btns(group).length).toBe(6);
    click(byText(group, 'Scene to scene'));
    expect(byText(group, 'Scene to scene').getAttribute('aria-pressed')).toBe('true');
    expect(l.querySelector('svg').getAttribute('aria-label')).toContain('Scene to scene');
  });
});

describe('Shelve it', () => {
  it('only accepts decimal order (523.45 before 523.5)', () => {
    const host = mount({ view: 'libraryHistory' });
    const l = lab(host);
    const nums = () => Array.from(l.querySelectorAll('li > span:first-child')).map((s) => s.textContent);
    click(byText(l, 'Check the shelf'));
    expect(l.textContent).toMatch(/✗ .+ \(\d+(\.\d+)?\) is shelved before .+ \(\d+(\.\d+)?\), but/);
    for (let guard = 0; guard < 40; guard++) {
      const n = nums();
      const i = n.findIndex((x, j) => j < n.length - 1 && parseFloat(x) > parseFloat(n[j + 1]));
      if (i < 0) break;
      click(l.querySelectorAll('li')[i].querySelectorAll('button')[1]);
    }
    expect(nums()).toEqual(['508', '516.2', '523.4', '523.45', '523.5', '597.9', '599.75']);
    click(byText(l, 'Check the shelf'));
    expect(l.textContent).toContain('523.45 comes before 523.5');
  });
});

// Pass 7: five more labs.
const moveUntilSorted = (l, keyOf, rank, buttonIndex) => {
  for (let guard = 0; guard < 40; guard++) {
    const items = Array.from(l.querySelectorAll('li'));
    const r = items.map((li) => rank(keyOf(li)));
    const i = r.findIndex((v, j) => j < r.length - 1 && v > r[j + 1]);
    if (i < 0) return;
    click(items[i].querySelectorAll('button')[buttonIndex]);
  }
};

describe('Build the gag', () => {
  it('lands only as setup, build, beat, punchline', () => {
    const l = lab(mount({ view: 'comicStrips' }));
    click(byText(l, 'Read the strip'));
    expect(l.textContent).toContain('falls flat');
    const want = ['A man spreads', 'One small cloud', 'He looks up', 'Rain pours'];
    moveUntilSorted(l, (li) => li.querySelectorAll('span')[1].textContent, (t) => want.findIndex((w) => t.startsWith(w)), 1);
    click(byText(l, 'Read the strip'));
    expect(l.textContent).toContain('Setup, build, beat, punchline');
  });
});

describe('Sort knowledge like Diderot', () => {
  it('scores placements against the Encyclopédie\'s tree', () => {
    const host = mount({ view: 'encyclopedias' });
    const l = lab(host);
    const pick = (id, v) => act(() => { const sel = host.querySelector('#pp-tr-' + id); sel.value = v; sel.dispatchEvent(new window.Event('change', { bubbles: true })); });
    Object.entries({ geometry: 'reason', botany: 'reason', music: 'imagination', theology: 'reason', crafts: 'reason', painting: 'imagination', church: 'memory', ethics: 'reason' }).forEach(([k, v]) => pick(k, v));
    click(byText(l, 'Compare with the Encyclopédie'));
    expect(l.textContent).toContain('7 of 8 placed');   // botany sits under Reason
    expect(l.textContent).toContain('printing itself sat under memory');
  });
});

describe('Guess Johnson\'s word', () => {
  it('locks each answer and totals the score', () => {
    const l = lab(mount({ view: 'dictionaries' }));
    ['lexicographer', 'oats', 'lattice', 'patron', 'excise'].forEach((w) => click(btns(l).find((b) => b.textContent === w)));
    click(btns(l).find((b) => b.textContent === 'network'));   // locked after the first pick
    expect(l.textContent).toContain('Johnson was defining "network"');
    expect(l.textContent).toContain('4 of 5.');
  });
});

describe('The censor\'s pencil', () => {
  it('passes the letter only with every dangerous detail cut and nothing harmless', () => {
    const l = lab(mount({ view: 'printWar' }));
    const phrase = (p) => btns(l).find((b) => b.getAttribute('aria-label').startsWith(p));
    ['Albert', 'the 2nd Battalion', 'to the trenches by the river', 'the Aquitania'].forEach((p) => click(phrase(p)));
    click(phrase('Sergeant Price'));
    click(byText(l, 'Pass the letter'));
    expect(l.textContent).toContain('an attack date');
    expect(l.textContent).toContain('is harmless');
    click(phrase('Sergeant Price'));
    click(phrase('We go over the top'));
    expect(phrase('We go over the top').getAttribute('aria-pressed')).toBe('true');
    click(byText(l, 'Pass the letter'));
    expect(l.textContent).toContain('✓ Passed');
  });
});

describe('Measure the perforations', () => {
  it('accepts only the gauge whose dots line up with the holes', () => {
    const host = mount({ view: 'printPostage' });
    const l = lab(host);
    let found = null;
    for (let g = 8; g <= 18 && !found; g++) {
      slide(host, 'pp-pf-gauge', g);
      if (l.querySelector('svg').getAttribute('aria-label').includes('line up exactly')) found = g;
    }
    expect([11, 12, 13, 14, 16]).toContain(found);
    click(byText(l, 'This is my reading'));
    expect(l.textContent).toContain('Perf ' + found + ': ' + found + ' holes in every 2 cm');
    slide(host, 'pp-pf-gauge', found === 18 ? 8 : 18);
    click(byText(l, 'This is my reading'));
    expect(l.textContent).toContain('too high');
  });
});

// Pass 8: five more labs.
describe('Scale it like Fannie Farmer', () => {
  it('scales every amount and regroups it into cups, tablespoons and teaspoons', () => {
    const host = mount({ view: 'cookbooks' });
    const l = lab(host);
    slide(host, 'pp-rc-servings', 6);
    const row = (name) => Array.from(l.querySelectorAll('tbody tr')).find((tr) => tr.querySelector('th').textContent === name).querySelectorAll('td')[1].textContent;
    expect(row('flour')).toBe('3 cups');
    expect(row('baking powder')).toBe('2 tbsp');
    expect(row('melted butter')).toBe('¼ cup + 1 ½ tsp');
    slide(host, 'pp-rc-servings', 2);
    expect(row('flour')).toBe('1 cup');
    expect(row('sugar')).toBe('1 tbsp');
  });
});

describe('Which panel comes first?', () => {
  it('expects right-to-left order for manga and left-to-right for Western comics', () => {
    const l = lab(mount({ view: 'mangaDeep' }));
    const tap = (text) => click(btns(l).find((b) => b.getAttribute('aria-label') && b.getAttribute('aria-label').startsWith(text)));
    const story = ['A girl wakes up late', 'She sees the clock', 'She sprints down the street', 'The train doors are closing', 'She squeezes in just in time'];
    // the first beat sits in the top-right panel in manga mode
    const grid = Array.from(l.querySelectorAll('button[aria-pressed]')).filter((b) => /wakes|clock|sprints|doors|squeezes/.test(b.textContent));
    expect(grid.find((b) => b.textContent.includes('wakes up')).style.gridArea).toContain('1 / 2');
    story.forEach(tap);
    expect(l.textContent).toContain('Top right first');
    click(byText(l, 'Western comic'));
    story.forEach(tap);
    expect(l.textContent).toContain('Top left first');
  });
});

describe('Keep the box score', () => {
  it('does not count a walk as an at-bat', () => {
    const host = mount({ view: 'printSports' });
    const l = lab(host);
    const type = (id, v) => act(() => { const el = host.querySelector('#' + id); Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new window.Event('input', { bubbles: true })); });
    type('pp-bx-ab', '5'); type('pp-bx-h', '2');
    click(byText(l, 'Check my box score'));
    expect(l.textContent).toContain('a walk is a plate appearance');
    type('pp-bx-ab', '4');
    click(byText(l, 'Check my box score'));
    expect(l.textContent).toContain('2 for 4: a .500 average');
  });
});

describe('You are the peer reviewer', () => {
  it('reports found, missed and false flags, and favours major revisions', () => {
    const host = mount({ view: 'sciPublishing' });
    const l = lab(host);
    ['n', 'control', 'claim', 'percent'].forEach((id) => click(host.querySelector('#pp-pr-' + id)));
    click(byText(l, 'Major revisions'));
    expect(l.textContent).toContain('You found 3 of the 4 real problems and flagged 1 that are not real problems');
    expect(l.textContent).toContain('Missed: The app\'s maker paid for the study');
    expect(l.textContent).toContain('A fair call');
  });
});

describe('Life-size on the page', () => {
  it('fits small birds standing and bends the flamingo\'s neck', () => {
    const l = lab(mount({ view: 'printZoology' }));
    expect(l.textContent).toContain('The American flamingo stands about 135 cm tall, more than the plate');
    click(byText(l, 'Blue jay'));
    expect(l.textContent).toContain('The blue jay is about 28 cm tall: it fits');
    expect(l.querySelector('svg').getAttribute('aria-label')).toContain('it fits standing');
  });
});

// Pass 9: five more labs.
const typeInto = (el, v) => act(() => { Object.getOwnPropertyDescriptor(el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new window.Event('input', { bubbles: true })); });

describe('Solve a word square', () => {
  it('checks every cell and moves to the next square as you type', () => {
    const l = lab(mount({ view: 'spellingPuzzles' }));
    const cells = Array.from(l.querySelectorAll('input'));
    expect(cells.length).toBe(9);
    cells[0].focus();
    typeInto(cells[0], 'S');
    expect(document.activeElement).toBe(cells[1]);
    'SETERATAX'.split('').forEach((ch, i) => typeInto(cells[i], ch));
    click(byText(l, 'Check'));
    expect(l.textContent).toContain('not right yet');
    expect(cells[8].getAttribute('aria-label')).toContain('not right');
    typeInto(cells[8], 'N');
    click(byText(l, 'Check'));
    expect(l.textContent).toContain('SET, ERA, TAN, across and down');
  });
});

describe('Is this letter really from 1863?', () => {
  it('scores each clue and explains the anachronisms', () => {
    const l = lab(mount({ view: 'forgeries' }));
    const groups = l.querySelectorAll('[role="group"]');
    ['Fits 1863', 'Fits 1863', 'Too late for 1863', 'Fits 1863', 'Too late for 1863'].forEach((label, i) => click(byText(groups[i], label)));
    click(byText(l, 'Give my verdict'));
    expect(l.textContent).toContain('4 of 5 clues judged correctly');
    expect(l.textContent).toContain('patented in 1876');
  });
});

describe('Watch Jupiter like Galileo', () => {
  it('draws the moons from their real periods and writes Galileo-style notation', () => {
    const host = mount({ view: 'printAstronomy' });
    const l = lab(host);
    const label = () => l.querySelector('svg').getAttribute('aria-label');
    expect(label()).toContain('7 January 1610');
    slide(host, 'pp-ga-night', 1);
    expect(label()).toContain('8 January 1610');
    expect(label()).toMatch(/\*.*O|O.*\*/);
    click(byText(l, 'switch sides'));
    expect(l.textContent).toContain('travelling around Jupiter');
  });
});

describe('Euclid in colour', () => {
  it('shows a² + b² = c² and names whole-number triples', () => {
    const host = mount({ view: 'printMath' });
    const l = lab(host);
    expect(l.textContent).toContain('9 + 16 = 25');
    slide(host, 'pp-by-a', 6); slide(host, 'pp-by-b', 8);
    expect(l.textContent).toContain('36 + 64 = 100');
    expect(l.textContent).toContain('6, 8, 10 is a whole-number');
    slide(host, 'pp-by-b', 2);
    expect(l.textContent).toContain('√40 ≈ 6.32');
  });
});

describe('Write a classified ad', () => {
  it('prices the ad by the word and checks it still says what, where and when', () => {
    const host = mount({ view: 'printAdvert' });
    const l = lab(host);
    expect(l.textContent).toContain('Over budget');
    const ta = host.querySelector('#pp-ca-text');
    typeInto(ta, 'Warm house for rent.');
    expect(l.textContent).toContain('a reader needs the room');
    typeInto(ta, 'Rm to let, quiet house nr station, use of kitchen + laundry. No smoking. Call aft 5.');
    expect(l.textContent).toContain('17 words');
    expect(l.textContent).toContain('$0.85');
    expect(l.textContent).toContain('still says what, where and when');
  });
});

// Pass 10: five more labs.
describe('How hard is this to read?', () => {
  it('ranks the samples by Flesch-Kincaid grade and keeps the scores in range', () => {
    const l = lab(mount({ view: 'printEducation' }));
    const gradeOf = () => parseFloat(Array.from(l.querySelectorAll('[aria-live] > div')).find((d) => d.textContent.startsWith('Grade level')).lastChild.textContent);
    const easeOf = () => parseFloat(Array.from(l.querySelectorAll('[aria-live] > div')).find((d) => d.textContent.startsWith('Reading ease')).lastChild.textContent);
    click(byText(l, 'A first reader')); const g1 = gradeOf(); expect(easeOf()).toBeLessThanOrEqual(100);
    click(byText(l, 'A middle-school text')); const g2 = gradeOf();
    click(byText(l, 'A legal sentence')); const g3 = gradeOf(); expect(easeOf()).toBeGreaterThanOrEqual(0);
    expect(g1).toBeGreaterThanOrEqual(0);
    expect(g1).toBeLessThan(g2);
    expect(g2).toBeLessThan(g3);
  });
});

describe('Flip book', () => {
  it('steps by hand and only animates after Play, with a pause control', () => {
    const l = lab(mount({ view: 'printCinema' }));
    const label = () => l.querySelector('svg').getAttribute('aria-label');
    expect(label()).toContain('page 1 of 12');
    click(byText(l, 'Next page'));
    expect(label()).toContain('page 2 of 12');
    const play = byText(l, 'Flip the pages');
    click(play);
    expect(play.getAttribute('aria-pressed')).toBe('true');
    expect(play.textContent).toContain('Pause');
    click(play);
    expect(play.getAttribute('aria-pressed')).toBe('false');
  });
});

describe('When does a book become free to reprint?', () => {
  it('applies the US rules for old, 1927-1977 and post-1978 works', () => {
    const host = mount({ view: 'printLaw' });
    const l = lab(host);
    const type = (id, v) => act(() => { const el = host.querySelector('#' + id); Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new window.Event('input', { bubbles: true })); });
    expect(l.textContent).toContain('Public domain since 1 January 2021');   // Gatsby, 1925
    type('pp-pdl-pub', '1850');
    expect(l.textContent).toContain('ran out by 1998 at the latest');
    type('pp-pdl-pub', '1937');
    expect(l.textContent).toContain('enters the public domain on 1 January 2033');
    type('pp-pdl-pub', '1995');
    expect(l.textContent).toContain('Enter the year of death');
    type('pp-pdl-death', '2001');
    expect(l.textContent).toContain('1 January 2072');
  });
});

describe('Grade a used book', () => {
  it('lets the worst flaw set the grade', () => {
    const host = mount({ view: 'usedBooks' });
    const l = lab(host);
    const grade = () => l.querySelector('p[aria-live]').textContent;
    expect(grade()).toBe('Grade: Fine');
    click(host.querySelector('#pp-cd-name'));
    expect(grade()).toBe('Grade: Near Fine');
    click(host.querySelector('#pp-cd-exlib'));
    expect(grade()).toBe('Grade: Good');
    expect(l.textContent).toContain('"Good" is a well-worn copy');
    click(host.querySelector('#pp-cd-loose'));
    expect(grade()).toBe('Grade: Fair');
  });
});

describe('How many times can paper be recycled?', () => {
  it('shortens fibres 20% a cycle until they wash out after about six cycles', () => {
    const host = mount({ view: 'paperSustain' });
    const l = lab(host);
    slide(host, 'pp-rcy-n', 6);
    expect(l.textContent).toContain('0.79 mm');
    expect(l.textContent).toContain('Still makes paper');
    slide(host, 'pp-rcy-n', 7);
    expect(l.textContent).toContain('Too short to knit into a sheet');
  });
});

// Pass 11: five more labs.
describe('Fair play or foul?', () => {
  it('cites Knox\'s rule for each judgement', () => {
    const l = lab(mount({ view: 'genreMystery' }));
    const groups = l.querySelectorAll('[role="group"]');
    click(byText(groups[0], 'Fair play'));
    expect(l.textContent).toContain('Rule 2: all supernatural agencies');
    click(byText(groups[0], 'Foul play'));   // locked after the first pick
    expect(byText(groups[0], 'Fair play').getAttribute('aria-pressed')).toBe('true');
    ['Fair play', 'Foul play', 'Foul play', 'Fair play', 'Foul play'].forEach((p, i) => click(byText(groups[i + 1], p)));
    expect(l.textContent).toContain('5 of 6 right');
    expect(l.textContent).toContain('The Murder of Roger Ackroyd');
  });
});

describe('Design your bookplate', () => {
  it('puts the name, picture and motto on the plate and translates the motto', () => {
    const host = mount({ view: 'bookplates' });
    const l = lab(host);
    const name = host.querySelector('#pp-xl-name');
    act(() => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(name, 'Ada Lovelace'); name.dispatchEvent(new window.Event('input', { bubbles: true })); });
    click(byText(l, 'Tree (knowledge)'));
    click(byText(l, 'Tolle lege'));
    const aria = l.querySelector('svg').getAttribute('aria-label');
    expect(aria).toContain('Ex libris Ada Lovelace');
    expect(aria).toContain('with a tree');
    expect(l.textContent).toContain('Take up and read');
  });
});

describe('File the title cards', () => {
  it('ignores opening articles and files word by word', () => {
    const l = lab(mount({ view: 'cardCatalog' }));
    const key = (t) => t.toLowerCase().replace(/^(the|a|an)\s+/, '').replace(/['’]/g, '');
    const titles = () => Array.from(l.querySelectorAll('li > span:first-child')).map((s) => s.firstChild.textContent);
    for (let g = 0; g < 40; g++) {
      const t = titles();
      const i = t.findIndex((x, j) => j < t.length - 1 && key(x) > key(t[j + 1]));
      if (i < 0) break;
      click(l.querySelectorAll('li')[i].querySelectorAll('button')[1]);
    }
    expect(titles()).toEqual(['Black Beauty', 'Charlotte\'s Web', 'The Hobbit', 'Holes', 'New Moon', 'Newspaper Days', 'A Wrinkle in Time']);
    click(byText(l, 'Check the drawer'));
    expect(l.textContent).toContain('Filed like a librarian');
  });
});

describe('Hold still!', () => {
  it('makes walkers vanish, ghost or freeze with the exposure time', () => {
    const l = lab(mount({ view: 'photoBooks' }));
    expect(l.textContent).toContain('Boulevard du Temple');
    click(byText(l, 'Wet collodion, 1850s'));
    expect(l.querySelector('svg').getAttribute('aria-label')).toContain('faint smears');
    click(byText(l, 'Phone camera today'));
    expect(l.textContent).toContain('freeze people mid-stride');
  });
});

describe('Print in layers', () => {
  it('counts layers and time from height and layer thickness', () => {
    const host = mount({ view: 'futurePrint' });
    const l = lab(host);
    expect(l.textContent).toContain('40 mm ÷ 0.20 mm = 200 layers');
    slide(host, 'pp-3d-layer', 8);
    expect(l.textContent).toContain('= 500 layers');
    expect(l.textContent).toContain('6.3 h');
    expect(l.querySelector('svg').getAttribute('aria-label')).toContain('shows 25 ledges in 2 mm');
    slide(host, 'pp-3d-layer', 32);
    expect(l.querySelector('svg').getAttribute('aria-label')).toContain('shows 6 ledges in 2 mm');
  });
});

// Pass 12: five more labs.
describe('How many calves make a Bible?', () => {
  it('divides leaves by leaves per skin', () => {
    const host = mount({ view: 'manuscripts' });
    const l = lab(host);
    expect(l.textContent).toContain('1030 leaves ÷ 2 leaves per skin = 515 calfskins');
    click(byText(l, 'Pocket book'));
    expect(l.textContent).toContain('= 129 calfskins');
    slide(host, 'pp-pm-leaves', 400);
    expect(l.textContent).toContain('400 leaves ÷ 8 leaves per skin = 50 calfskins');
  });
});

describe('Why pulp paper turns brown', () => {
  it('browns ground-wood paper with age and light but not rag paper', () => {
    const host = mount({ view: 'pulpCovers' });
    const l = lab(host);
    const page = () => l.querySelector('[role="img"]').getAttribute('aria-label');
    slide(host, 'pp-yl-years', 0);
    expect(page()).toContain('still nearly white');
    slide(host, 'pp-yl-years', 60);
    expect(page()).toContain('deep yellow-brown');
    expect(page()).toContain('crumbling');
    click(byText(l, 'Linen rag'));
    expect(page()).toContain('still nearly white');
    expect(l.textContent).toContain('no lignin');
  });
});

describe('Set the margins like a fine press', () => {
  it('reports the margin ratio and recognises the 2:3:4:6 canon', () => {
    const l = lab(mount({ view: 'finePress' }));
    expect(l.textContent).toContain('3.0 : 3.0 : 3.0 : 3.0');
    click(byText(l, 'Show the canon'));
    expect(l.textContent).toContain('2.0 : 3.0 : 4.0 : 6.0');
    expect(l.textContent).toContain('Close to the canon');
  });
});

describe('Sound written on paper', () => {
  it('draws more waves for a higher pitch and names the note', () => {
    const host = mount({ view: 'printSound' });
    const l = lab(host);
    slide(host, 'pp-ph-f', 440);
    expect(l.querySelector('svg').getAttribute('aria-label')).toContain('4.4 waves in 10 milliseconds');
    expect(l.textContent).toContain('Nearest note: A4');
    slide(host, 'pp-ph-f', 880);
    expect(l.querySelector('svg').getAttribute('aria-label')).toContain('8.8 waves');
    // jsdom has no Web Audio: the button explains instead of throwing
    click(byText(l, 'Play 1 second'));
    expect(byText(l, 'Play 1 second')).toBeTruthy();
  });
});

describe('Plan a garden from the seed catalogue', () => {
  it('dates sowing and harvest from the last frost', () => {
    const l = lab(mount({ view: 'printGarden' }));
    click(byText(l, 'May 15'));
    const row = (name) => Array.from(l.querySelectorAll('tbody tr')).find((tr) => tr.querySelector('th').textContent === name).textContent;
    expect(row('Peas')).toContain('April 10');
    expect(row('Peas')).toContain('June 9');
    expect(row('Tomatoes')).toContain('May 29');
    expect(l.querySelector('caption').textContent).toContain('May 15');
  });
});

describe('Find the source, like John Snow', () => {
  it('tallies every death by its nearest pump, most at Broad Street', () => {
    const l = lab(mount({ view: 'printHealthcare' }));
    expect(l.textContent).toContain('Broad Street: ?');
    click(byText(l, 'nearest pump'));
    const counts = Array.from(l.querySelectorAll('li'), (li) => Number(li.textContent.split(': ')[1]));
    expect(counts).toHaveLength(4);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(73);
    expect(counts[0]).toBeGreaterThan(counts[1] + counts[2] + counts[3]);
    expect(l.textContent).toContain(counts[0] + ' of the 73 deaths');
    expect(l.textContent).toContain('8 September 1854');
  });
});

describe('Read the blueprint', () => {
  it('turns the drawn width into metres at either scale', () => {
    const host = mount({ view: 'printArch' });
    const l = lab(host);
    const input = l.querySelector('#pp-bp-ans');
    typeInto(input, '9');
    click(byText(l, 'Check'));
    expect(l.textContent).toContain('✗ Multiply the drawn width by the scale: 9 cm × 50');
    typeInto(input, '4,5');
    click(byText(l, 'Check'));
    expect(l.textContent).toContain('9 cm × 50 = 450 cm = 4.5 m');
    click(byText(l, '1:100'));
    expect(l.querySelector('svg').getAttribute('aria-label')).toContain('drawn 4.5 cm wide and 3.5 cm deep');
    expect(l.textContent).not.toContain('= 4.5 m');
  });
});

describe('Points and picas', () => {
  it('estimates characters per line and flags lines that are too short or long', () => {
    const host = mount({ view: 'letterpressToday' });
    const l = lab(host);
    expect(l.textContent).toContain('288 points of line');
    expect(l.textContent).toContain('roughly 48 characters');
    expect(l.textContent).toContain('comfortable line');
    slide(host, 'pp-pc-size', 20);
    slide(host, 'pp-pc-measure', 12);
    expect(l.textContent).toContain('roughly 14 characters');
    expect(l.textContent).toContain('eye jump back');
    slide(host, 'pp-pc-size', 8);
    slide(host, 'pp-pc-measure', 36);
    expect(l.textContent).toContain('roughly 108 characters');
    expect(l.textContent).toContain('hard to find the start');
  });
});

describe("Think like Asimov's robots", () => {
  it('ranks the Three Laws and locks each first answer', () => {
    const l = lab(mount({ view: 'genreSciFi' }));
    click(byText(l, 'Obey and stand aside'));
    expect(l.textContent).toContain('✗ The First Law');
    click(byText(l, 'Refuse and hold him back'));
    expect(l.textContent).toContain('1 of 4 decided');
    click(byText(l, 'Go in'));
    click(byText(l, 'Take the hit'));
    click(byText(l, 'Step out of the way'));
    expect(l.textContent).toContain('3 of 4. Asimov');
  });
});

describe('Raking light: read the missing page', () => {
  it('reveals the indented writing only when the lamp is low', () => {
    const host = mount({ view: 'forensicDocs' });
    const l = lab(host);
    expect(l.querySelector('svg').getAttribute('aria-label')).toContain('not visible');
    slide(host, 'pp-in-angle', 70);
    expect(l.textContent).toContain('page looks blank');
    slide(host, 'pp-in-angle', 40);
    expect(l.textContent).toContain('Faint shadows are starting to show');
    expect(l.querySelector('svg').getAttribute('aria-label')).toContain('too faint to read yet');
    slide(host, 'pp-in-angle', 10);
    expect(l.querySelector('svg').getAttribute('aria-label')).toContain('Meet at the pier, 9 pm Friday');
    expect(l.textContent).toContain('lit edge and a shadowed edge');
  });
});

describe('Lay out a one-sheet mini-zine', () => {
  const panels = (l) => Array.from(l.querySelector('[aria-label="The sheet: two rows of four panels"]').querySelectorAll('button'));
  const placeInOrder = (l, slots) => slots.forEach((i) => click(panels(l)[i]));
  it('accepts every layout that folds in page order and names the broken pair otherwise', () => {
    const l = lab(mount({ view: 'fanzines' }));
    // pages 1..8 go to these panels (0-3 top row, upside down; 4-7 bottom row)
    placeInOrder(l, [0, 4, 5, 6, 7, 3, 2, 1]);
    click(byText(l, 'Fold it'));
    expect(l.textContent).toContain('✓ It folds into a zine that reads 1 to 8');
    click(byText(l, 'Clear the sheet'));
    placeInOrder(l, [7, 3, 2, 1, 0, 4, 5, 6]);
    click(byText(l, 'Fold it'));
    expect(l.textContent).toContain('✓ It folds');
    click(byText(l, 'Clear the sheet'));
    placeInOrder(l, [0, 1, 2, 3, 4, 5, 6, 7]);
    expect(panels(l)[2].getAttribute('aria-label')).toBe('Top row, panel 3 (prints upside down): page 3');
    click(byText(l, 'Fold it'));
    expect(l.textContent).toContain('✗ After folding, pages 5 and 6');
    click(panels(l)[0]);
    expect(l.textContent).toContain('Next page to place: 1');
  });
});

describe('Scan a line of verse', () => {
  const syl = (l) => Array.from(l.querySelector('[aria-label="Syllables: press the ones that take the beat"]').querySelectorAll('button'));
  it('checks the marked stresses and names the metre', () => {
    const l = lab(mount({ view: 'poetryMags' }));
    [1, 3, 5, 7, 9].forEach((i) => click(syl(l)[i]));
    expect(syl(l)[1].getAttribute('aria-pressed')).toBe('true');
    click(byText(l, 'Check my scansion'));
    expect(l.textContent).toContain('✓ Iambic pentameter: five da-DUM feet');
    click(byText(l, 'Lord Byron'));
    expect(syl(l)).toHaveLength(12);
    [1, 3].forEach((i) => click(syl(l)[i]));
    click(byText(l, 'Check my scansion'));
    expect(l.textContent).toContain('✗ Marked differently from the usual scansion: ');
    expect(l.textContent.match(/" \(\d+\)/g)).toHaveLength(6);
  });
});

describe('Fold a printed sheet', () => {
  it('doubles leaves with each fold and counts the gatherings', () => {
    const host = mount({ view: 'libraryBindery' });
    const l = lab(host);
    expect(l.textContent).toContain('Octavo (8vo), 3 folds: 8 leaves, so 16 pages from one sheet. A 320-page book needs 20 gatherings.');
    slide(host, 'pp-fd-folds', 4);
    click(byText(l, '96 pp'));
    expect(l.textContent).toContain('Sextodecimo (16mo), 4 folds: 16 leaves, so 32 pages');
    expect(l.textContent).toContain('96-page book needs 3 gatherings');
    expect(l.querySelector('svg').querySelectorAll('line')).toHaveLength(6);
  });
});

describe('London to Edinburgh, then and now', () => {
  it('turns each journey time into an average speed', () => {
    const l = lab(mount({ view: 'travelLit' }));
    expect(l.textContent).toContain('about 1.3 miles an hour over the whole trip, spread over 13 days');
    click(byText(l, '1800'));
    expect(l.textContent).toContain('about 6.9 miles an hour');
    click(byText(l, 'Today'));
    expect(l.textContent).toContain('about 89 miles an hour over the whole trip.');
  });
});

describe('Set the oven for an old recipe', () => {
  it('converts the dial and checks it against the recipe word', () => {
    const host = mount({ view: 'cookbooksMore' });
    const l = lab(host);
    expect(l.textContent).toContain('250°F is about 120°C, gas mark ½.');
    click(byText(l, 'Bake it'));
    expect(l.textContent).toContain('You are too cool');
    slide(host, 'pp-ov-f', 375);
    click(byText(l, 'Bake it'));
    expect(l.textContent).toContain('✓ Modern charts put this at 350-375°F.');
    click(byText(l, 'very hot oven'));
    slide(host, 'pp-ov-f', 475);
    click(byText(l, 'Bake it'));
    expect(l.textContent).toContain('gas mark 9.');
    expect(l.textContent).toContain('✓ Modern charts put this at 450-475°F.');
  });
});

describe('Plan a 32-page picture book', () => {
  it('counts story spreads for separate- and self-ended books', () => {
    const l = lab(mount({ view: 'pictureBookDeep' }));
    expect(l.textContent).toContain('14 spreads for the story (pages 4 to 31).');
    click(byText(l, 'Self-ended'));
    expect(l.textContent).toContain('12 spreads for the story (pages 6 to 29).');
    click(byText(l, 'half-title'));
    expect(l.textContent).toContain('11 spreads for the story (pages 8 to 29).');
    expect(l.querySelector('svg').querySelectorAll('rect')).toHaveLength(32);
  });
});

describe('Build a pulp story the Lester Dent way', () => {
  const pick = (l, id, v) => act(() => { const s = l.querySelector('#pp-dn-' + id); Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(s, v); s.dispatchEvent(new window.Event('change', { bubbles: true })); });
  it('orders the four 1,500-word parts and prices the story', () => {
    const l = lab(mount({ view: 'pulpFiction' }));
    expect(byText(l, 'Check the plot').disabled).toBe(true);
    pick(l, 'p1', '2'); pick(l, 'p2', '1'); pick(l, 'p3', '3'); pick(l, 'p4', '4');
    click(byText(l, 'Check the plot'));
    expect(l.textContent).toContain('✗ 2 of 4 in the right place');
    pick(l, 'p1', '1'); pick(l, 'p2', '2');
    click(byText(l, 'Check the plot'));
    expect(l.textContent).toContain('✓ Trouble, more trouble, worse trouble, way out.');
    expect(l.textContent).toContain('6,000 words × 1¢ = $60');
    click(byText(l, '2¢ / word'));
    expect(l.textContent).toContain('= $120');
  });
});

describe('Print a chromolithograph card', () => {
  it('builds the card stone by stone and shows misregistration', () => {
    const host = mount({ view: 'greetingCards' });
    const l = lab(host);
    expect(l.textContent).toContain('1 of 6 stones printed');
    ['Light green', 'Dark green', 'Red', 'Gold', 'Black key'].forEach((n) => click(btns(l).find((b) => b.textContent === n)));
    expect(l.textContent).toContain('✓ Six stones');
    slide(host, 'pp-pr-reg', 4);
    expect(l.textContent).toContain('slipped off their outlines');
    expect(l.querySelector('svg').getAttribute('aria-label')).toContain('red stone is 4 units out of register');
  });
});

describe('Tune by the printed listings', () => {
  it('converts kHz to metres and recognises a tuned station', () => {
    const host = mount({ view: 'printRadio' });
    const l = lab(host);
    expect(l.textContent).toContain('300,000 ÷ 1000 kHz = 300.0 metres.');
    expect(l.textContent).toContain('You want 208 metres');
    slide(host, 'pp-wv-f', 1440);
    expect(l.textContent).toContain('✓ Tuned in: 208 metres is about 1442 kHz.');
    click(byText(l, 'BBC Radio 1'));
    expect(l.textContent).toContain('You want 247 metres');
    slide(host, 'pp-wv-f', 1214);
    expect(l.textContent).toContain('✓ Tuned in: 247 metres is about 1215 kHz.');
  });
});

describe('Fix an Old Style diary date', () => {
  it('scores first answers and explains the 10- and 11-day rules', () => {
    const l = lab(mount({ view: 'diaryTradition' }));
    click(byText(l, '15 December 1642'));
    expect(l.textContent).toContain('✗ 4 January 1643. Add 10 days');
    click(byText(l, '4 January 1643'));
    click(byText(l, '11 January 1660'));
    click(byText(l, '22 February 1732'));
    click(byText(l, '3 May 1616'));
    expect(l.textContent).toContain('3 of 4. This is why');
    expect(l.querySelector('svg').getAttribute('aria-label')).toContain('The 3rd to the 13th never happened');
  });
});

describe('How many sheets is a pamphlet?', () => {
  it('counts sheets, blank pages and reams for quarto and octavo', () => {
    const host = mount({ view: 'pamphlets' });
    const l = lab(host);
    expect(l.textContent).toContain('40 pages in quarto = 5 sheets a copy (40 pages), so 0 left blank.');
    expect(l.textContent).toContain('1,000 copies use 5,000 sheets, about 10.4 reams');
    expect(l.textContent).toContain('✓ No wasted pages');
    slide(host, 'pp-sc-pages', 47);
    expect(l.textContent).toContain('47 pages in quarto = 6 sheets a copy (48 pages), so 1 left blank.');
    expect(l.textContent).toContain('filled leftover pages with advertisements');
    click(byText(l, 'Octavo'));
    slide(host, 'pp-sc-copies', 3000);
    expect(l.textContent).toContain('47 pages in octavo = 3 sheets a copy (48 pages)');
    expect(l.textContent).toContain('3,000 copies use 9,000 sheets, about 18.8 reams');
    expect(l.textContent).toContain('8.3 times the paper');
    expect(l.querySelector('svg').querySelectorAll('rect')).toHaveLength(48);
  });
});

describe('Strip the unsold paperbacks', () => {
  it('strips mass-market covers but ships trade paperbacks back whole', () => {
    const host = mount({ view: 'genreRomance' });
    const l = lab(host);
    expect(l.textContent).toContain('30,000 copies sold. The 20,000 unsold copies are stripped: 20,000 covers go back');
    expect(l.querySelector('svg').getAttribute('aria-label')).toContain('6 sold, 4 unsold with their covers torn off');
    expect(l.textContent).toContain('this book is stolen property');
    slide(host, 'pp-sb-st', 85);
    expect(l.textContent).toContain('42,500 copies sold. The 7,500 unsold copies');
    click(byText(l, 'Trade paperback'));
    expect(l.textContent).toContain('boxed and shipped back whole');
    expect(l.querySelector('svg').getAttribute('aria-label')).toContain('9 sold, 1 unsold and sent back whole');
  });
});

describe('Page through Douglass\'s 1845 Narrative', () => {
  it('pages through the voices and locks the first answer', () => {
    const l = lab(mount({ view: 'theMemoir' }));
    expect(l.textContent).toContain('WRITTEN BY HIMSELF.');
    expect(byText(l, '← Previous part').getAttribute('aria-disabled')).toBe('true');
    click(byText(l, 'Next part →'));
    expect(l.textContent).toContain('William Lloyd Garrison, 1 May 1845');
    click(btns(l).find((b) => b.textContent === 'Narrative'));
    expect(l.textContent).toContain('I was born in Tuckahoe');
    expect(l.querySelector('svg').getAttribute('aria-label')).toContain('part 4 of 5: Frederick Douglass');
    click(byText(l, 'Douglass could not write'));
    expect(l.textContent).toContain('✗ The title page says "Written by Himself"');
    expect(l.textContent).toContain('British friends bought his freedom in 1846');
    expect(byText(l, 'Many readers doubted').disabled).toBe(true);
  });
});

describe('Design a cover for the newsstand', () => {
  it('counts what the rack hides and rewards left-third cover lines', () => {
    const host = mount({ view: 'fashionMags' });
    const l = lab(host);
    expect(l.textContent).toContain('3 of 5 masthead letters and 0 of 4 cover lines show.');
    expect(l.textContent).toContain('The rack is hiding your cover lines.');
    click(btns(l).find((b) => b.textContent === 'Left third'));
    expect(l.textContent).toContain('✓ Every cover line still shows.');
    click(byText(l, 'head in front of the masthead'));
    expect(l.textContent).toContain('2 of 5 masthead letters and 4 of 4 cover lines show.');
    slide(host, 'pp-cv-hide', 0);
    expect(l.querySelector('svg').getAttribute('aria-label')).toContain('0% hidden by the magazine in front. 4 of 5 masthead letters and 4 of 4 cover lines show.');
  });
});

describe('Who gets the joke? Alt text for a webcomic', () => {
  it('uses the chosen alt text as the comic\'s name and shows who misses hover text', () => {
    const l = lab(mount({ view: 'webcomics' }));
    const svg = () => l.querySelector('svg');
    expect(svg().getAttribute('aria-label')).toContain('No alt text chosen yet');
    expect(l.textContent).toContain('Gets the bonus joke.');
    expect(svg().textContent).toContain('printed comics have no hover text');
    click(btns(l).find((b) => b.textContent === 'Comic'));
    expect(l.textContent).toContain('✗ Too vague');
    click(byText(l, 'Three-panel comic. Mia'));
    expect(l.textContent).toContain('✓ Who is there, what they say');
    expect(svg().getAttribute('aria-label')).toMatch(/^Three-panel comic\. Mia, at her laptop/);
    click(btns(l).find((b) => b.textContent === 'Phone'));
    expect(l.textContent).toContain('Misses the bonus joke. A touchscreen has no hover');
    expect(svg().textContent).not.toContain('printed comics have no hover text');
  });
});

describe('Colour a sheet of cards through stencils', () => {
  it('prints the woodblock first, then each stencil colours all four cards', () => {
    const l = lab(mount({ view: 'tarotOracle' }));
    const lay = (c) => byText(l, 'Lay the ' + c + ' stencil');
    expect(lay('Yellow').disabled).toBe(true);
    expect(l.textContent).toContain('Print the black outlines first');
    click(byText(l, 'Print the woodblock'));
    click(lay('Yellow'));
    expect(l.textContent).toContain('The Yellow stencil is down.');
    expect(l.querySelector('mask')).toBeTruthy();
    click(byText(l, 'Brush it'));
    expect(l.textContent).toContain('1 of 4 colours brushed.');
    expect(l.querySelectorAll('svg [fill="#e8b923"]')).toHaveLength(4);
    ['Red', 'Blue', 'Flesh'].forEach((c) => { click(lay(c)); click(byText(l, 'Brush it')); });
    expect(l.textContent).toContain('✓ Four colours, four brush passes');
    expect(l.querySelector('svg').getAttribute('aria-label')).toContain('Black outlines printed. 4 of 4 colours brushed.');
  });
});

describe('Take down a sermon as it is preached', () => {
  it('compares writing speed with preaching speed', () => {
    const host = mount({ view: 'sermonsPrinted' });
    const l = lab(host);
    expect(l.textContent).toContain('A 40-minute sermon at 140 words a minute is about 5,600 words. This writer gets about 1,000 of them (18%).');
    expect(l.textContent).toContain('Most of the sermon is lost.');
    expect(l.textContent).toContain('…');
    click(byText(l, 'Shorthand reporter'));
    expect(l.textContent).toContain('about 5,600 of them (100%). ✓ Every word taken down.');
    expect(l.textContent).not.toContain('…');
    slide(host, 'pp-sm-speak', 200);
    expect(l.textContent).toContain('about 8,000 words. This writer gets about 7,000 of them (88%).');
  });
});

describe('Hands-on lab index in the module menu', () => {
  it('lists exactly the modules whose page mounts a lab', () => {
    const src = readFileSync(resolve(process.cwd(), SOURCE), 'utf8');
    const listed = JSON.parse('[' + /var PP_LAB_VIEWS = \[([\s\S]*?)\];/.exec(src)[1].replace(/'/g, '"') + ']');
    const fns = [...src.matchAll(/function (render[A-Z]\w*)\s*\(/g)];
    const withLab = new Set();
    fns.forEach((m, i) => { const body = src.slice(m.index, i + 1 < fns.length ? fns[i + 1].index : src.length); if (/stableType\('\w+Lab'/.test(body)) withLab.add(m[1]); });
    const views = [...src.matchAll(/view === '(\w+)'\)\s*content = h\(_ViewWrapper, \{ key: '\w+',\s*_render: (render\w+) \}/g)].filter((m) => withLab.has(m[2])).map((m) => m[1]);
    expect(views.length).toBeGreaterThanOrEqual(62);
    expect([...listed].sort()).toEqual([...views].sort());
  });
  it('marks lab modules on their tiles and filters the menu to them', () => {
    const host = mount({});
    const tiles = () => Array.from(host.querySelectorAll('.printingpress-tile'));
    const all = tiles().length;
    click(byText(host, 'Show all '));
    expect(host.querySelectorAll('.printingpress-lab-chip')).toHaveLength(62);
    click(byText(host, 'Show fewer modules'));
    expect(tiles()).toHaveLength(all);
    const toggle = byText(host, 'Only modules with a hands-on lab (62)');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    click(toggle);
    expect(tiles()).toHaveLength(62);
    tiles().forEach((t) => {
      expect(t.querySelector('.printingpress-lab-chip'), t.getAttribute('aria-label')).toBeTruthy();
      expect(t.getAttribute('aria-label')).toMatch(/has a hands-on lab(, lab tried)?$/);
    });
    expect(byText(host, 'Show all ')).toBeFalsy();
    click(byText(host, 'Only modules with a hands-on lab (62)'));
    expect(tiles()).toHaveLength(all);
  });
  it('counts the hero stats from the real module, lab and quiz lists', () => {
    const host = mount({});
    const src = readFileSync(resolve(process.cwd(), SOURCE), 'utf8');
    const start = src.indexOf('var MENU_TILES = [');
    const n = (src.slice(start, src.indexOf('\n      ];', start)).match(/section: '(start|modules)'/g) || []).length;
    expect(n).toBeGreaterThan(60);
    expect(host.textContent).toContain(n + ' modules');
    expect(host.textContent).toContain('0 / ' + n + ' modules');
    expect(host.textContent).toContain('62 hands-on labs');
    expect(host.textContent).toMatch(/\d+ cumulative-quiz questions/);
    expect(host.textContent).not.toContain('20+ scenarios');
  });
});

describe('Lab progress on the menu', () => {
  const back = (host) => click(host.querySelector('.printingpress-back-bar button'));
  const nine = ['musicPrinting', 'mapsAtlases', 'sciPublishing', 'letterpressToday', 'reformation', 'inkMaterials', 'translation', 'propaganda', 'comics'];
  it('marks a lab as tried once the student uses it', () => {
    const host = mount({ view: 'colorPrinting' });
    click(btns(lab(host))[0]);
    back(host);
    expect(host.textContent).toContain('1 of 62 tried so far.');
    click(byText(host, 'Only modules with a hands-on lab (62)'));
    const tile = Array.from(host.querySelectorAll('.printingpress-tile')).find((t) => t.getAttribute('aria-label').startsWith('Color Printing'));
    expect(tile.getAttribute('aria-label')).toMatch(/has a hands-on lab, lab tried$/);
    expect(tile.querySelector('.printingpress-lab-chip').textContent).toBe('✓ Lab tried');
  });
  it('offers the next untried lab and awards a badge at ten', () => {
    const host = mount({ labsTried: Object.fromEntries(nine.map((v) => [v, 'x'])) });
    expect(host.textContent).toContain('9 of 62 tried so far.');
    const next = byText(host, 'Next lab to try:');
    expect(next.textContent).toMatch(/^→ Next lab to try: Color Printing/);
    click(next);
    click(btns(lab(host))[0]);
    back(host);
    expect(host.textContent).toContain('10 of 62 tried so far.');
    expect(host.textContent).toContain('Lab Regular: 10 labs tried');
  });
});

// Pass 18: regressions for the two independent lab audits.
describe('Lab audit fixes', () => {
  const flush = () => act(() => new Promise((r) => setTimeout(r, 5)));
  it('scales the eggs with the recipe', () => {
    const host = mount({ view: 'cookbooks' });
    slide(host, 'pp-rc-servings', 8);
    const eggsRow = Array.from(lab(host).querySelectorAll('tr')).find((tr) => tr.textContent.startsWith('eggs'));
    expect(eggsRow.textContent).toBe('eggs24');
  });
  it('lands the flip-book ball on the ground only on the landing page', () => {
    const l = lab(mount({ view: 'printCinema' }));
    const ball = () => l.querySelector('ellipse');
    expect(l.querySelector('svg').getAttribute('aria-label')).toContain('squashed on the ground');
    expect(Number(ball().getAttribute('cy')) + Number(ball().getAttribute('ry'))).toBeCloseTo(107.25, 1);
    for (let i = 0; i < 11; i++) click(byText(l, 'Next page'));
    expect(l.querySelector('svg').getAttribute('aria-label')).not.toContain('squashed');
  });
  it('states the 1923-1977 rule the code applies', () => {
    const l = lab(mount({ view: 'printLaw' }));
    expect(l.textContent).toContain('works published from 1923 to 1977');
  });
  it('does not claim a colour shift under the UV lamp', () => {
    const host = mount({ view: 'printMoney' });
    const l = lab(host);
    click(btns(l).find((b) => b.textContent.includes('UV lamp')));
    slide(host, 'pp-bn-tilt', 30);
    expect(l.querySelector('svg').getAttribute('aria-label')).toContain('cannot be judged under the UV lamp');
    expect(l.querySelector('svg').getAttribute('aria-label')).not.toContain('shifted from copper to green');
  });
  it('keeps the standing-height line of a too-tall bird inside the picture', () => {
    const l = lab(mount({ view: 'printZoology' }));
    const line = l.querySelector('svg line[stroke-dasharray]');
    expect(Number(line.getAttribute('y1'))).toBeGreaterThanOrEqual(0);
  });
  it('treats equal slips up and down the same, and freezes ink once printed', () => {
    const host = mount({ view: 'musicPrinting' });
    const l = lab(host);
    slide(host, 'pp-pe-dy', -2);
    click(byText(l, 'Pass 1'));
    click(byText(l, 'Pass 2'));
    expect(l.textContent).toContain('every note 1 step(s) higher');
    slide(host, 'pp-pe-dy', 8);
    expect(l.textContent).toContain('every note 1 step(s) higher');
  });
  it('keeps focus on a moved item', async () => {
    const host = mount({ view: 'libraryHistory' });
    const down = lab(host).querySelectorAll('li')[0].querySelectorAll('button')[1];
    down.focus();
    const id = down.id;
    click(down);
    await flush();
    expect(id).toMatch(/^pp-dw-/);
    expect(document.activeElement && document.activeElement.id).toBe(id);
  });
  it('fixes the smaller wording and labelling slips', () => {
    let host = mount({ view: 'sermonsPrinted' });
    click(byText(lab(host), 'Shorthand reporter'));
    slide(host, 'pp-sm-speak', 200);
    expect(lab(host).textContent).toContain('Nearly all of it');
    act(() => mounted.root.unmount()); mounted.host.remove(); mounted = null;
    host = mount({ view: 'fashionMags' });
    slide(host, 'pp-cv-hide', 5);
    expect(lab(host).textContent).toContain('4 of 4 cover lines show. Every line shows for now');
    act(() => mounted.root.unmount()); mounted.host.remove(); mounted = null;
    host = mount({ view: 'printHealthcare' });
    expect(lab(host).querySelector('svg').getAttribute('aria-label')).not.toContain('Nearest pump counts');
    act(() => mounted.root.unmount()); mounted.host.remove(); mounted = null;
    host = mount({ view: 'webcomics' });
    expect(lab(host).textContent).toContain('It says: "Bonus: printed comics have no hover text at all."');
    act(() => mounted.root.unmount()); mounted.host.remove(); mounted = null;
    host = mount({ view: 'pamphlets' });
    slide(host, 'pp-sc-pages', 8);
    expect(lab(host).textContent).toContain('8 pages in quarto = 1 sheet a copy (8 pages)');
    act(() => mounted.root.unmount()); mounted.host.remove(); mounted = null;
    host = mount({ view: 'greetingCards' });
    expect(lab(host).querySelector('svg').getAttribute('aria-label')).toContain('the red stone is not printed yet');
    act(() => mounted.root.unmount()); mounted.host.remove(); mounted = null;
    host = mount({ view: 'printEducation' });
    typeInto(host.querySelector('#pp-rd-text'), '');
    expect(lab(host).textContent).toContain('Type or paste some text to measure it.');
  });
});
