// Printing Press: everything a student reads can be translated, and translating it changes nothing else.
//
// 7,364 strings were hard-coded in English with no key at all, and the i18n gates could not see them because
// they only look at strings that already have keys. So this renders every view through a marking t(): any text
// that arrives without the marker skipped translation. Set PP_SRC to run against another copy.
import { describe, expect, it, afterEach } from 'vitest';
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
const CODE = readFileSync(resolve(process.cwd(), SOURCE), 'utf8');
const VIEWS = [...CODE.matchAll(/view === '([A-Za-z0-9]+)'\)\s+content = h\(_ViewWrapper/g)].map((m) => m[1]);
const OPEN = '⟦', CLOSE = '⟧';
const marking = (k, f) => OPEN + (f === undefined ? k : f) + CLOSE;
const plain = (k, f) => (f === undefined ? k : f);
const noop = () => {};

// Text that must stay as it is: originals in other languages, type specimens, and English that a lab measures or sorts.
const KEEP = [
  /^(AD FONTES|FIAT LUX|IN PRINT|VERITAS|IN|PRINT,|IDEAS|LIVE|FORVER\.|Verbum Domini|Festina lente)$/,
  /^(De |Der |Das |Les |Le |L'|Index Librorum|Société|Relation aller|Histoire Naturelle|Romain du Roi|Atelier du|Grand dictionnaire|Boulevard du|Très Riches|Au clair|Ex libris|ex libris)/,
  /^(Labore et|Veritas vincit|Per aspera|Lux ex tenebris|Vincit qui|Sapere aude|Tolle lege|Carpe diem|Sermo|de indulgentiis|et gratia)/,
  /^(Georgia|Times New Roman|Courier New|Helvetica Neue|Helvetica|Verdana|48px|\d+px)$/,
  /^(BAKE|AKE|SALE|Friday, May 14|King Middle Cafeteria|Proceeds support|the 7th-grade Crew)/,
  /^(congregation|church|elder|priest|love|charity|repent|mystery)$/,
  /^(The Hobbit|Newspaper Days|Black Beauty|A Wrinkle in Time|Holes|New Moon|Charlotte's Web)$/,
  /^(The quick brown fox|The printing press made books much cheaper|Room available for rent|IMAGINARIA)/,
  /^(The|cur|few|tolls|the|knell|of|part|ing|day)$/,
  /^, Hébert's$/,
];
KEEP.push(/\((ekklesia|presbyteros|agape|metanoeo)\)|^\(ekklesia\)|^, 1 Cor\. 13/);
const keep = (s) => KEEP.some((re) => re.test(s));

let mounted = null;
function mount(initial, t) {
  const reg = {
    _registry: {}, _order: [],
    registerTool(id, config) { config.id = id; this._registry[id] = config; this._order.push(id); },
    isRegistered(id) { return !!this._registry[id]; },
    getRegisteredTools() { return this._order.map((id) => this._registry[id]); },
    renderTool(id, ctx) { const x = this._registry[id]; return x && x.render ? x.render(ctx) : null; },
  };
  window.StemLab = reg;
  globalThis.StemLab = reg;
  if (!window.React) window.React = React;
  // eslint-disable-next-line no-new-func
  new Function(CODE)();
  const cfg = reg._registry.printingPress;
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  let setView = null;
  function Harness() {
    const [toolData, setToolData] = React.useState({ printingPress: initial || {} });
    setView = (v) => setToolData({ printingPress: { view: v } });
    const update = (id, key, val) => setToolData((p) => ({ ...p, [id]: { ...(p[id] || {}), [key]: val } }));
    const updateMulti = (id, obj) => setToolData((p) => ({ ...p, [id]: { ...(p[id] || {}), ...obj } }));
    return cfg.render({ React, toolData, setToolData, update, updateMulti, addToast: noop, announceToSR: noop, awardXP: noop, callGemini: null, gradeLevel: '7th Grade', t, icons: new Proxy({}, { get: () => () => null }) });
  }
  act(() => { root.render(React.createElement(Harness)); });
  mounted = { host, root };
  return { host, go: (v) => act(() => { setView(v); }) };
}
afterEach(() => { if (mounted) { act(() => mounted.root.unmount()); mounted.host.remove(); mounted = null; } });

const btns = (scope) => Array.from(scope.querySelectorAll('button'));
const click = (el) => act(() => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); });

function unmarked(host) {
  const out = new Set();
  const tw = document.createTreeWalker(host, window.NodeFilter.SHOW_TEXT);
  let n;
  while ((n = tw.nextNode())) {
    const s = (n.nodeValue || '').replace(/\s+/g, ' ').trim();
    if (!/\p{L}{2}/u.test(s) || s.includes(OPEN) || s.includes(CLOSE)) continue;
    const pe = n.parentElement;
    if (!pe || pe.closest('style,script')) continue;
    if (keep(s)) continue;
    if (pe.closest('[lang]')) continue; // marked as another language on purpose
    // A phrase split out for its lang attribute sits inside a marked parent
    if (pe.parentElement && pe.parentElement.textContent.includes(OPEN) && pe.closest('[lang]')) continue;
    out.add(s.slice(0, 90));
  }
  host.querySelectorAll('[aria-label],[placeholder],[alt]').forEach((el) => {
    for (const a of ['aria-label', 'placeholder', 'alt']) {
      const v = el.getAttribute(a);
      if (v && /\p{L}{2}/u.test(v) && !v.includes(OPEN) && !v.includes(CLOSE) && !keep(v) && !/\((ekklesia|presbyteros|agape|metanoeo)\)/.test(v)) out.add(a + ': ' + v.slice(0, 80));
    }
  });
  return [...out];
}

describe('Everything a student reads can be translated', () => {
  it('sends every visible string in every view through t()', () => {
    expect(VIEWS.length).toBeGreaterThanOrEqual(100);
    const { host, go } = mount({ view: 'menu' }, marking);
    const bad = {};
    for (const v of VIEWS) {
      go(v);
      const u = unmarked(host);
      if (u.length) bad[v] = u.slice(0, 6);
    }
    expect(bad).toEqual({});
  }, 240000);

  it('shows the bookbinding stats correctly when their labels are translated', () => {
    const { host } = mount({ view: 'bookbinding' }, marking);
    for (const b of btns(host)) {
      if (host.textContent.includes('Durability')) break;
      if (/Binding|Build|Choose|Materials|Styles|Types/i.test(b.textContent)) click(b);
    }
    expect(host.textContent, 'the stat rows rendered').toContain('Durability');
    expect(host.textContent).toMatch(/\d\/100/);
  });
});

describe('Grammar is not assembled from English pieces', () => {
  it('gives translators the whole Day in the Shop sentence, with no bare English article', () => {
    expect(CODE.includes("__alloT('stem.printingpress.an', 'an ')")).toBe(false);
    expect(CODE.includes('You worked as a {value1}.')).toBe(true);
    expect(CODE.includes('You worked as an {value1}.')).toBe(true);
    expect(CODE.includes('/^[AEIOU]/i.test(ppEn(roleObj.label))')).toBe(true);
  });
});

describe('Answer positions are the same in every language', () => {
  const firstOptions = (t) => {
    const { host, go } = mount({ view: 'menu' }, t);
    const res = {};
    for (const v of ['bookbinding', 'paperMaking', 'firstNews', 'typeFoundry', 'globalPrinting']) {
      go(v);
      res[v] = btns(host).map((b) => b.textContent.replace(/[⟦⟧]/g, '')).filter((x) => x.length > 8);
    }
    act(() => mounted.root.unmount()); mounted.host.remove(); mounted = null;
    return res;
  };
  it('deals the same order whatever the translated text says', () => {
    expect(firstOptions(marking)).toEqual(firstOptions(plain));
  }, 120000);
});

describe('Foreign phrases are marked for screen readers', () => {
  it('marks a French song title inside an English sentence without changing the text', () => {
    const { host } = mount({ view: 'printSound' }, plain);
    const fr = [...host.querySelectorAll('[lang="fr"]')].map((e) => e.textContent);
    expect(fr).toContain('Au clair de la lune');
    expect(host.textContent).toContain('Au clair de la lune');
  });
  it('marks Latin and German titles', () => {
    const { host, go } = mount({ view: 'broadside' }, plain);
    go('beforeAfter');
    const la = [...host.querySelectorAll('[lang="la"]')].map((e) => e.textContent);
    expect(la.length).toBeGreaterThan(0);
    const de = [...host.querySelectorAll('[lang="de"]')].map((e) => e.textContent);
    expect(de).toContain('Der Edelstein');
  });
  it('still marks a phrase inside translated text', () => {
    const { host } = mount({ view: 'printSound' }, (k, f) => (typeof f === 'string' && f.includes('Au clair de la lune') ? 'Texto traducido: Au clair de la lune.' : plain(k, f)));
    expect([...host.querySelectorAll('[lang="fr"]')].map((e) => e.textContent)).toContain('Au clair de la lune');
  });
});

describe('Apprentice journey dates fit each master', () => {
  const start = (name) => {
    const { host } = mount({ view: 'apprenticeJourney' }, plain);
    click(btns(host).find((b) => b.textContent.includes('Apprentice to ' + name)));
    return host;
  };
  it('shows the years with each master on the cards', () => {
    const { host } = mount({ view: 'apprenticeJourney' }, plain);
    expect(host.textContent).toContain('Mainz · 1480–1487');
    expect(host.textContent).toContain('Augsburg · 1484–1491');
    expect(host.textContent).toContain('Venice · 1495–1502');
  });
  it('says plainly what is real and what is invented', () => {
    const { host } = mount({ view: 'apprenticeJourney' }, plain);
    expect(host.querySelector('[data-pp-aj-record="schmidt"]').textContent).toMatch(/invented/);
    expect(host.querySelector('[data-pp-aj-record="rugerin"]').textContent).toMatch(/Two books.*1484.*imagined/);
    expect(host.querySelector('[data-pp-aj-record="manutius"]').textContent).toMatch(/were real/);
  });
  it('starts Rügerin in 1484 and Aldus in 1495, with what happened that year', () => {
    let host = start('Anna');
    expect(host.querySelector('[data-pp-aj-calendar]').textContent).toContain('1484');
    expect(host.querySelector('[data-pp-aj-event]').textContent).toMatch(/Sachsenspiegel/);
    act(() => mounted.root.unmount()); mounted.host.remove(); mounted = null;
    host = start('Aldus');
    expect(host.querySelector('[data-pp-aj-calendar]').textContent).toContain('1495');
    expect(host.querySelector('[data-pp-aj-event]').textContent).toMatch(/Lascaris/);
  });
  it('no longer places every apprentice in 1480', () => {
    expect(CODE.includes('About apprenticeship in 1480')).toBe(false);
  });
});
