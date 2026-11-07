import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
import { runIsolatedAxe } from './helpers/isolated_axe_harness.js';

// Who eats whom (lane foodweb, 2026-11-05): a sourced feeding table, an explorable
// web with a full text equivalent, and "what if it disappeared?" cases whose results
// come from running a simplified rule over the table, shown only after a prediction.

vi.setConfig({ testTimeout: 60000 });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const t = (k, f) => f || k;
const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => v[k]);
let W, X, W2;
const mounted = [];
beforeEach(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'coralReef');
  W = window.__RR_TEST_EXPORTS__.coralReefWeb;
  X = window.__RR_TEST_EXPORTS__.coralReef;
  W2 = window.__RR_TEST_EXPORTS__.coralReefW2;
});
afterEach(async () => {
  while (mounted.length) { const m = mounted.pop(); await act(async () => m.root.unmount()); m.host.remove(); }
  vi.restoreAllMocks();
  await new Promise((r) => setTimeout(r, 0));
});

async function mount(seed = {}) {
  let data = { coralReef: { section: 'science', sciTopic: 'web', ...seed } };
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const cfg = window.StemLab._registry.coralReef;
  const said = [];
  function Shell() {
    const [toolData, setToolData] = React.useState(data);
    data = toolData;
    return cfg.render({ React, toolData, setToolData, t, announceToSR: (m) => said.push(m) });
  }
  const item = { host, root, said, get d() { return data.coralReef; } };
  mounted.push(item);
  await act(async () => root.render(React.createElement(Shell)));
  return item;
}
async function click(node) { expect(node, 'button exists').toBeTruthy(); await act(async () => { node.click(); await Promise.resolve(); }); }
async function key(node, k) { await act(async () => { node.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); }); }
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 40)); });
const chip = (host, id) => host.querySelector(`.fw-chip[data-fw-id="${id}"]`);
const byText = (root, sel, re) => [...root.querySelectorAll(sel)].find((n) => re.test(n.textContent));
const webPanel = (host) => host.querySelector('[id="cr-scilab-panel-web"]'); // attribute form: jsdom's #id lookup misses a second mount
// Every string a student or a screen reader could get from the page: text, attributes, styles aside.
function everything(root) {
  const parts = [root.textContent];
  root.querySelectorAll('*').forEach((el) => {
    for (const a of el.attributes) if (a.name !== 'style' && a.name !== 'class' && a.name !== 'd') parts.push(a.value);
  });
  return parts.join(' \n ');
}
const nameMap = () => {
  const tx = X.speciesText(t), extra = W.extraNames(t), map = {};
  for (const id of W.allIds()) map[id] = id === 'sea_cucumber' ? 'Pink sea cucumber' : extra[id] || tx[id].name.replace(/\s*\([^)]*\)\s*$/, '');
  return map;
};

describe('the feeding table', () => {
  it('uses catalog species plus a few labelled non-catalog boxes, each placed once', () => {
    const ids = new Set(X.SPECIES_META.map((m) => m.id));
    const all = W.allIds();
    expect(new Set(all).size).toBe(all.length);
    const catalog = all.filter((id) => !W.EXTRA.includes(id));
    for (const id of catalog) expect(ids.has(id), id).toBe(true);
    for (const id of W.EXTRA) { expect(ids.has(id), id).toBe(false); expect(all).toContain(id); }
    expect(catalog.length).toBeGreaterThanOrEqual(20);
    expect(catalog.length).toBeLessThanOrEqual(30);
    for (const m of X.SPECIES_META.filter((x) => catalog.includes(x.id))) expect(m.group).not.toBe('structure');
    for (const [g, members] of Object.entries(W.GROUPS)) {
      expect(W.EXTRA).toContain(g);
      for (const m of members) expect(catalog, m).toContain(m);
    }
    expect(W.ROWS.map((r) => r.id)[0]).toBe('top');
    expect(W.ROWS.map((r) => r.id).at(-1)).toBe('base');
  });

  it('links only known nodes, and every link has a source that resolves through the existing lookup', () => {
    const all = W.allIds();
    const seen = new Set();
    expect(W.LINKS.length).toBeGreaterThan(30);
    for (const l of W.LINKS) {
      const id = `${l.from}>${l.to}:${l.kind}`;
      expect(all, id).toContain(l.from);
      expect(all, id).toContain(l.to);
      expect(seen.has(id), id).toBe(false);
      seen.add(id);
      expect(['eats', 'farms', 'weeds', 'guards', 'cleans', 'crowds'], id).toContain(l.kind);
      expect(l.sources.length, id).toBeGreaterThan(0);
      const got = X.marineEntrySources({ sources: l.sources });
      expect(got.map((s) => s.id), id).toEqual(l.sources);
      for (const s of got) expect(s.text.length, id).toBeGreaterThan(20);
    }
    for (const id of all) expect(W.LINKS.some((l) => l.from === id || l.to === id), `${id} has a link`).toBe(true);
    for (const c of W.CASES) expect(X.marineEntrySources({ sources: c.sources }).map((s) => s.id), c.id).toEqual(c.sources);
  });

  it('reuses each species\' own profile sources, or a new source with a real link', () => {
    const profiles = X.marineProfiles(t);
    const lib = X.marineProfileSources();
    for (const l of W.LINKS) {
      const p = profiles[l.from];
      // A tie between two non-catalog boxes (seaweed and coral) cites the tool's general sources.
      if (!p && !profiles[l.to]) continue;
      for (const src of l.sources) {
        if (src.startsWith('dx-fw-')) continue;
        const own = p && p.sources.includes(src);
        // A link about a prey species may cite the prey's own profile (urchin predators, for example).
        const prey = profiles[l.to] && profiles[l.to].sources.includes(src);
        expect(own || prey, `${l.from}>${l.to} cites ${src}`).toBeTruthy();
      }
    }
    const fresh = lib.filter((s) => s.id.startsWith('dx-fw-'));
    expect(fresh.length).toBeGreaterThan(5);
    for (const s of fresh) {
      expect(s.url, s.id).toMatch(/^https:\/\/[^ ]+\.[a-z]+\//);
      expect(s.text, s.id).toMatch(/\(?\d{4}\)?|accessed/);
    }
    expect(new Set(lib.map((s) => s.id)).size).toBe(lib.length);
  });

  it('keeps the clear stories asked for, and shows cleaning and farming as other kinds of link', () => {
    const has = (from, to, kind = 'eats') => W.LINKS.some((l) => l.from === from && l.to === to && l.kind === kind);
    for (const g of ['parrotfish', 'long_spined_urchin']) expect(has(g, 'algae'), g).toBe(true);
    for (const c of ['crown_of_thorns', 'drupella_snail', 'pincushion_sea_star']) expect(has(c, 'polyps'), c).toBe(true);
    for (const p of ['anthias', 'blue_green_chromis', 'reef_manta']) expect(has(p, 'plankton'), p).toBe(true);
    for (const h of ['peacock_grouper', 'whitetip_reef_shark', 'blacktip_reef_shark', 'giant_moray', 'blackfin_barracuda', 'bluefin_trevally']) expect(has(h, 'reef_fishes'), h).toBe(true);
    expect(has('giant_triton', 'crown_of_thorns')).toBe(true);
    expect(has('cleaner_wrasse', 'reef_fishes', 'cleans')).toBe(true);
    expect(has('cleaner_wrasse', 'reef_fishes')).toBe(false);
    expect(has('dusky_farmerfish', 'farm_turf', 'farms')).toBe(true);
    // The catalog's surgeonfish mostly eats plankton (its own diet text), so it must not be drawn as a grazer only.
    expect(has('blue_tang', 'plankton')).toBe(true);
    expect(X.marineProfiles(t).blue_tang.diet).toMatch(/plankton/);
  });

  it('marks links where the source names a kind of animal rather than this species', () => {
    for (const l of W.LINKS.filter((x) => x.to === 'long_spined_urchin')) expect(l.scope, l.from).toBe('kind');
    for (const l of W.LINKS.filter((x) => x.from === 'peacock_grouper' && ['parrotfish', 'blue_tang'].includes(x.to))) expect(l.scope).toBe('kind');
  });
});

describe('the simplified rule, run over the table', () => {
  const EXPECT = {
    grazers: { algae: 'more', polyps: 'fewer', clown_triggerfish: 'same' },
    triton: { crown_of_thorns: 'more', polyps: 'fewer', parrotfish: 'same' },
    sharks: { reef_fishes: 'more', peacock_grouper: 'more', algae: 'fewer' },
    cleaner: { parasites: 'more', reef_fishes: 'fewer', blackfin_barracuda: 'fewer' },
    farmer: { farm_turf: 'fewer', algae: 'more', polyps: 'fewer' }
  };
  it('gives each named group the expected direction, computed by running it', () => {
    expect(W.CASES.map((c) => c.id)).toEqual(Object.keys(EXPECT));
    for (const c of W.CASES) {
      const r = W.caseResult(c);
      const got = Object.fromEntries(r.groups.map((g) => [g.id, g.dir]));
      expect(got, c.id).toEqual(EXPECT[c.id]);
      expect(c.groups.length).toBeGreaterThanOrEqual(2);
      expect(c.groups.length).toBeLessThanOrEqual(3);
      for (const g of r.groups) expect(['more', 'fewer', 'same'], `${c.id} ${g.id} never mixed`).toContain(g.dir);
    }
  });

  it('explains each result with the link that caused it', () => {
    const by = (c, id) => W.caseResult(W.CASES.find((k) => k.id === c)).groups.find((g) => g.id === id);
    expect(by('grazers', 'algae')).toMatchObject({ reason: 'lost_eater', step: 1 });
    expect(by('grazers', 'algae').via.sort()).toEqual(['long_spined_urchin', 'parrotfish']);
    expect(by('grazers', 'polyps')).toMatchObject({ reason: 'crowded', step: 2, via: ['algae'] });
    expect(by('grazers', 'clown_triggerfish')).toMatchObject({ reason: 'other_food', step: 1 });
    expect(by('triton', 'parrotfish')).toMatchObject({ reason: 'no_path', via: [], step: null });
    expect(by('cleaner', 'reef_fishes').reason).toBe('lost_cleaner');
    expect(by('cleaner', 'blackfin_barracuda')).toMatchObject({ reason: 'less_food', via: ['reef_fishes'] });
    expect(by('farmer', 'farm_turf').reason).toBe('lost_farmer');
    expect(by('farmer', 'algae').reason).toBe('lost_weeder');
    expect(by('farmer', 'polyps').reason).toBe('lost_guard');
  });

  it('follows its stated rules for every species, not just the prepared cases', () => {
    for (const id of W.allIds()) {
      const e = W.effects([id]);
      expect(e[id], `${id} is gone, so it has no effect`).toBeUndefined();
      for (const skip of W.NO_RULE) expect(e[skip], `${skip} left out`).toBeUndefined();
      for (const l of W.LINKS.filter((x) => x.from === id && x.kind === 'eats' && !W.NO_RULE.includes(x.to))) expect(['more', 'mixed'], `${id} ate ${l.to}`).toContain(e[l.to].dir);
      for (const l of W.LINKS.filter((x) => x.to === id && x.kind === 'eats')) {
        const others = W.foods(l.from).filter((f) => f !== id);
        const dir = e[l.from].dir;
        if (others.length) expect(['same', 'more', 'fewer', 'mixed'], l.from).toContain(dir);
        else expect(['fewer', 'mixed'], `${l.from} lost its only food`).toContain(dir);
      }
      for (const v of Object.values(e)) { expect(v.step).toBeGreaterThanOrEqual(1); expect(v.step).toBeLessThanOrEqual(W.STEPS); }
    }
  });

  it('stops at its step limit, and members share a group change', () => {
    const one = W.effects(['giant_triton'], 1);
    expect(one.crown_of_thorns.dir).toBe('more');
    expect(one.polyps).toBeUndefined();
    expect(W.effects(['giant_triton'], 2).polyps.dir).toBe('fewer');
    expect(W.effects(['giant_triton'], 0)).toEqual({});
    const sharks = W.effects(['whitetip_reef_shark', 'blacktip_reef_shark']);
    for (const m of W.GROUPS.reef_fishes) expect(sharks[m]).toMatchObject({ dir: 'more', reason: 'in_group', via: ['reef_fishes'] });
  });

  it('writes every reason from the effect, and never types a result into a story', () => {
    const names = nameMap(), name = (id) => names[id];
    const texts = W.caseText(t);
    for (const c of W.CASES) {
      const r = W.caseResult(c);
      for (const g of r.groups) {
        const line = W.reasonText(t, fill, g, name);
        expect(line.length, g.reason).toBeGreaterThan(10);
        expect(line).not.toMatch(/\{/);
        for (const v of g.via) expect(line, g.reason).toContain(names[v]);
      }
      expect(texts[c.id].story, c.id).not.toMatch(/likely|fewer|more of|increase|decrease|overgrow|take over/i);
    }
  });

  it('labels itself a simplified rule, and says plainly where evidence is weak or disputed', () => {
    const texts = W.caseText(t);
    expect(texts.triton.strength).toMatch(/weak/i);
    expect(texts.sharks.strength).toMatch(/disputed/i);
    const triton = texts.triton.evidence.join(' ');
    expect(triton).toMatch(/0\.7/);
    expect(triton).toMatch(/not settled/);
    expect(triton).toMatch(/Cowan/);
    expect(texts.grazers.evidence.join(' ')).toMatch(/Hughes 1994/);
    expect(texts.grazers.helps).toMatch(/Mumby/);
    expect(texts.sharks.evidence.join(' ')).toMatch(/Desbiens/);
    expect(texts.sharks.evidence.join(' ')).toMatch(/Ruppert/);
    for (const c of W.CASES) expect(texts[c.id].helps.length, c.id).toBeGreaterThan(40);
    // A claim of IUCN status must agree with the catalog.
    expect(X.SPECIES_META.find((m) => m.id === 'dusky_farmerfish').iucn).toBe('LC');
    expect(texts.farmer.helps).toMatch(/Least Concern/);
  });
});

describe('predict first', () => {
  // Words that exist only in the rule's result or in the evidence block.
  const leaks = (c) => {
    const tx = W.caseText(t)[c.id];
    const out = [tx.strength, tx.helps, ...tx.evidence, 'The rule says', 'What real studies say', 'What helps here', 'Everything else the rule found', 'data-fw-dir', 'Step 1:', 'Step 2:', 'matched the rule'];
    for (const src of X.marineEntrySources({ sources: c.sources })) if (src.id.startsWith('dx-exclusion') || src.id.startsWith('dx-mutualism') || src.id.includes('grutter') || src.id.includes('waldie') || src.id.includes('desbiens') || src.id.includes('roff') || src.id.includes('ruppert') || src.id.includes('sweatman') || src.id.includes('macneil') || src.id.includes('frisch')) out.push(src.text);
    return out;
  };
  it('hides every result, label and citation until all predictions are in, in text and in attributes', async () => {
    for (const c of W.CASES) {
      const m = await mount({ sciWeb: { caseId: c.id } });
      // Also look with a species open, which shows its diet, links and sources.
      await click(chip(m.host, c.gone[0]));
      const check = () => { const all = everything(webPanel(m.host)); for (const l of leaks(c)) expect(all.includes(l), `${c.id} leaks: ${l.slice(0, 50)}`).toBe(false); };
      check();
      expect(m.host.querySelector('[data-fw-result]')).toBeNull();
      expect(m.host.querySelector('[data-fw-dir]')).toBeNull();
      const run = byText(m.host, 'button', /^Run the rule$/);
      expect(run.disabled).toBe(true);
      const groups = [...m.host.querySelectorAll('.fw-pred')];
      expect(groups.length).toBe(c.groups.length);
      // All but one prediction: still nothing.
      for (let i = 0; i < groups.length - 1; i++) { await click(byText([...m.host.querySelectorAll('.fw-pred')][i], 'button', /Likely more/)); check(); }
      expect(byText(m.host, 'button', /^Run the rule$/).disabled).toBe(true);
      expect(m.d.sciWeb.cases[c.id].revealed).toBe(false);
      await click(byText([...m.host.querySelectorAll('.fw-pred')].at(-1), 'button', /Likely more/));
      check();
      expect(byText(m.host, 'button', /^Run the rule$/).disabled).toBe(false);
      await act(async () => m.root.unmount());
      mounted.splice(mounted.indexOf(m), 1);
      m.host.remove();
    }
  });

  it('shows the options with none picked, each group labelled, and nothing announced', async () => {
    const m = await mount({ sciWeb: { caseId: 'cleaner' } });
    for (const g of m.host.querySelectorAll('.fw-pred [role="group"]')) {
      expect(m.host.querySelector('#' + g.getAttribute('aria-labelledby')).textContent.length).toBeGreaterThan(2);
      const opts = [...g.querySelectorAll('button')];
      expect(opts.map((b) => b.textContent)).toEqual(['Likely more', 'Likely fewer', 'About the same']);
      expect(opts.every((b) => b.getAttribute('aria-pressed') === 'false')).toBe(true);
    }
    expect(m.said.join(' ')).not.toMatch(/rule|matched/i);
  });

  it('does not trust a saved "revealed" flag with predictions missing', async () => {
    const m = await mount({ sciWeb: { caseId: 'triton', cases: { triton: { pred: { crown_of_thorns: 'more' }, revealed: true } } } });
    expect(m.host.querySelector('[data-fw-result]')).toBeNull();
    const all = everything(m.host);
    expect(all.includes('The rule says')).toBe(false);
    expect(W.state({ caseId: 'triton', cases: { triton: { pred: { crown_of_thorns: 'more' }, revealed: true } } }).cases.triton.revealed).toBe(false);
  });

  it('then shows the rule\'s own result, the evidence and what helps, and lets the student predict again', async () => {
    for (const c of W.CASES) {
      const m = await mount({ sciWeb: { caseId: c.id } });
      for (const row of [...m.host.querySelectorAll('.fw-pred')]) await click(byText(row, 'button', /About the same/));
      await click(byText(m.host, 'button', /^Run the rule$/));
      await settle();
      const box = m.host.querySelector(`[data-fw-result="${c.id}"]`);
      expect(box).toBeTruthy();
      const r = W.caseResult(c);
      const rows = [...box.querySelectorAll('.fw-result-row')];
      expect(rows.map((x) => x.getAttribute('data-fw-group'))).toEqual(c.groups);
      expect(rows.map((x) => x.getAttribute('data-fw-dir'))).toEqual(r.groups.map((g) => g.dir));
      const words = { more: 'Likely more', fewer: 'Likely fewer', same: 'About the same' };
      rows.forEach((row, i) => {
        expect(row.textContent).toContain('The rule says: ' + words[r.groups[i].dir]);
        expect(row.textContent).toContain('You predicted: About the same');
        expect(row.querySelector('svg')).toBeTruthy(); // an arrow shape as well as words, not color alone
      });
      const matched = r.groups.filter((g) => g.dir === 'same').length;
      expect(box.textContent).toContain(`matched the rule on ${matched} of ${r.groups.length}`);
      const tx = W.caseText(t)[c.id];
      expect(box.textContent).toContain(tx.strength);
      for (const p of tx.evidence) expect(box.textContent).toContain(p);
      expect(box.textContent).toContain(tx.helps);
      expect(box.textContent).toMatch(/simplified/);
      for (const src of X.marineEntrySources({ sources: c.sources })) expect(box.textContent, src.id).toContain(src.text);
      // Focus goes to the result, not to the page.
      expect(document.activeElement.id).toBe('cr-fw-result-title');
      expect(m.d.sciWeb.cases[c.id].revealed).toBe(true);
      await click(byText(box, 'button', /Predict this case again/));
      await settle();
      expect(m.host.querySelector('[data-fw-result]')).toBeNull();
      expect(document.activeElement).toBe(m.host.querySelector('.fw-pred button'));
      expect(m.d.sciWeb.cases[c.id]).toEqual({ pred: {}, revealed: false });
      await act(async () => m.root.unmount());
      mounted.splice(mounted.indexOf(m), 1);
      m.host.remove();
    }
  });

  it('keeps each case\'s predictions separate when switching cases', async () => {
    const m = await mount({ sciWeb: { caseId: 'grazers', cases: { grazers: { pred: { algae: 'more', polyps: 'fewer', clown_triggerfish: 'same' }, revealed: true } } } });
    expect(m.host.querySelector('[data-fw-result="grazers"]')).toBeTruthy();
    expect(byText(m.host, 'p', /Cases finished: 1 of 5/)).toBeTruthy();
    await click(byText(m.host, '.fw-case', /Reef sharks/));
    expect(m.host.querySelector('[data-fw-result]')).toBeNull();
    expect(everything(m.host).includes('The rule says')).toBe(false);
    expect(byText(m.host, '.fw-case', /Reef sharks/).getAttribute('aria-pressed')).toBe('true');
    await click(byText(m.host, '.fw-case', /Urchins/));
    expect(m.host.querySelector('[data-fw-result="grazers"]')).toBeTruthy();
  });

  it('loads old saves and bad data safely', async () => {
    expect(W.state(undefined)).toMatchObject({ sel: null, caseId: 'grazers', cases: {} });
    for (const junk of [null, 7, 'x', [], { sel: 'nobody', caseId: 'nope', cases: 3 }, { cases: { grazers: 'x', triton: { pred: { crown_of_thorns: 'lots' }, revealed: 'yes' } } }]) {
      const s = W.state(junk);
      expect(W.allIds().includes(s.sel) || s.sel === null).toBe(true);
      expect(W.CASES.some((c) => c.id === s.caseId)).toBe(true);
      for (const v of Object.values(s.cases)) expect(v.revealed).toBe(false);
    }
    const m = await mount({ sciWeb: { sel: 'nobody', caseId: 'nope', cases: { grazers: 5 } } });
    expect(webPanel(m.host).textContent).toMatch(/Investigate/);
    const old = await mount({ sciWeb: undefined, sciBleach: { pred: 'some' } });
    expect(webPanel(old.host).textContent).toMatch(/Explore/);
  });

  it('does not change Start progress: the science step still counts its three investigations', () => {
    const finished = { sciBleach: { revealed: true }, sciBudget: { revealed: true }, sciSeaweed: { revealed: true } };
    expect(W2.progress(finished).steps.science).toMatchObject({ state: 'done', ran: 3, total: 3 });
    const web = { sciWeb: { caseId: 'grazers', cases: { grazers: { pred: { algae: 'more', polyps: 'fewer', clown_triggerfish: 'same' }, revealed: true } } } };
    expect(W2.progress(web).steps.science).toMatchObject({ state: 'todo', ran: 0, total: 3 });
    expect(W2.progress({ ...finished, ...web }).steps.science.state).toBe('done');
  });
});

describe('explore: the text equivalent', () => {
  it('starts with no links, and no renderer at any point', async () => {
    const three = vi.fn(() => Promise.reject(new Error('no WebGL here')));
    window.StemLab.ensureThree = three;
    const getContext = vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext');
    const m = await mount();
    expect(m.host.querySelector('.fw-lines')).toBeNull();
    expect([...m.host.querySelectorAll('.fw-chip')].map((c) => c.getAttribute('data-fw-rel')).every((r) => r === 'all')).toBe(true);
    expect(m.host.querySelectorAll('.fw-tag').length).toBe(0);
    await click(chip(m.host, 'parrotfish'));
    // A missing portrait waits as an icon; it must not start drawing one.
    const img = chip(m.host, 'parrotfish').querySelector('img');
    expect(img.getAttribute('src')).toMatch(/assets\/coralreef\/species\/parrotfish\.webp/);
    await act(async () => { img.dispatchEvent(new Event('error')); await new Promise((r) => setTimeout(r, 10)); });
    expect(m.host.querySelectorAll('canvas').length).toBe(0);
    expect(getContext).not.toHaveBeenCalled();
    expect(three).not.toHaveBeenCalled();
  });

  it('lists exactly what the table says for every node, in words and on the chips', async () => {
    const names = nameMap();
    const m = await mount();
    for (const id of W.allIds()) {
      const on = chip(m.host, id);
      if (on.getAttribute('aria-pressed') !== 'true') await click(on);
      const panel = m.host.querySelector(`[data-fw-panel="${id}"]`);
      expect(panel, id).toBeTruthy();
      const rel = W.related(id);
      const heads = [...panel.querySelectorAll('h5')].map((x) => x.textContent);
      expect(heads, id).toContain(`It eats (${rel.eats.length})`);
      expect(heads, id).toContain(`Eaten by (${rel.eatenBy.length})`);
      const named = [...panel.querySelectorAll('.fw-link-btn')].map((b) => b.textContent);
      for (const e of rel.eats) expect(named, `${id} eats ${e.id}`).toContain(names[e.id]);
      for (const e of rel.eatenBy) expect(named, `${e.id} eats ${id}`).toContain(names[e.id]);
      for (const x of rel.ties) expect(named, `${id} tie ${x.id}`).toContain(names[x.id]);
      // Chips carry the same news in words.
      for (const e of rel.eats) expect(chip(m.host, e.id).textContent, e.id).toContain('Its food');
      for (const e of rel.eatenBy) expect(chip(m.host, e.id).textContent, e.id).toContain('Eats it');
      expect(on.textContent).toContain('Chosen');
      expect(on.getAttribute('aria-pressed')).toBe('true');
    }
  }, 240000);

  it('cites the sources of the links it shows', async () => {
    const m = await mount({ sciWeb: { sel: 'giant_triton' } });
    const panel = m.host.querySelector('[data-fw-panel="giant_triton"]');
    const srcs = X.marineEntrySources({ sources: ['dx-wa-giant_triton', 'dx-fw-cowan2017', 'dx-bose-giant_triton'] });
    for (const s of srcs) expect(panel.textContent, s.id).toContain(s.text);
    expect([...panel.querySelectorAll('a')].some((a) => a.href === 'https://doi.org/10.3390/d9010007')).toBe(true);
  });

  it('says so when a source names a kind of animal, or a whole group', async () => {
    const m = await mount({ sciWeb: { sel: 'long_spined_urchin' } });
    expect(m.host.querySelector('[data-fw-panel]').textContent).toMatch(/names this kind of animal, not this exact species/);
    const c = await mount({ sciWeb: { sel: 'blue_green_chromis' } });
    const p = c.host.querySelector('[data-fw-panel]');
    expect(p.textContent).toMatch(/Hunters of the group Smaller reef fishes/);
    expect(p.textContent).toMatch(/not this species/);
  });

  it('writes out every link as a sentence with its source', async () => {
    const names = nameMap();
    const m = await mount();
    const items = [...m.host.querySelectorAll('[data-fw-all] > li')];
    expect(items.length).toBe(W.LINKS.length);
    W.LINKS.forEach((l, i) => {
      expect(items[i].textContent).toContain(W.linkSentence(t, fill, l, (id) => names[id]));
      expect(items[i].textContent).toMatch(/Source:/);
    });
    const kinds = items.map((x) => x.textContent).join(' ');
    expect(kinds).toMatch(/cleans Smaller reef fishes/);
    expect(kinds).toMatch(/tends and eats Farmed turf algae/);
  });

  it('draws only the chosen species\' direct links on a wide screen, and puts the panel beside the chart', async () => {
    vi.spyOn(window.Element.prototype, 'getBoundingClientRect').mockImplementation(() => ({ width: 1100, height: 60, left: 0, top: 0, right: 1100, bottom: 60, x: 0, y: 0 }));
    const m = await mount();
    await settle();
    expect(m.host.querySelector('.fw-layout.fw-wide')).toBeTruthy();
    expect(m.host.querySelector('.fw-lines')).toBeNull();
    await click(chip(m.host, 'parrotfish'));
    await settle();
    const rel = W.related('parrotfish');
    const direct = rel.eats.length + rel.eatenBy.filter((e) => !e.viaGroup).length + rel.ties.filter((x) => !x.viaGroup).length + rel.groups.length + rel.members.length;
    expect(m.host.querySelectorAll('.fw-lines path[d^="M"][stroke]').length).toBe(direct);
    expect(direct).toBeLessThan(rel.eats.length + rel.eatenBy.length + rel.ties.length + rel.groups.length);
    expect(m.host.querySelector('.fw-lines').getAttribute('aria-hidden')).toBe('true');
    expect(m.host.querySelector('.fw-panel-wrap [data-fw-panel="parrotfish"]')).toBeTruthy();
    // Non-feeding ties are dashed, with no arrowhead.
    expect(m.host.querySelectorAll('.fw-lines path[stroke-dasharray]').length).toBeGreaterThan(0);
    await click(chip(m.host, 'parrotfish'));
    await settle();
    expect(m.host.querySelector('.fw-lines')).toBeNull();
  });

  it('on a narrow screen opens the panel right under the chosen row, with no lines', async () => {
    const m = await mount({ sciWeb: { sel: 'parrotfish' } });
    await settle();
    expect(m.host.querySelector('.fw-layout.fw-wide')).toBeNull();
    expect(m.host.querySelector('.fw-lines')).toBeNull();
    expect(m.host.querySelector('section.fw-band [data-fw-panel="parrotfish"]').closest('section.fw-band').querySelector('[data-fw-id="parrotfish"]')).toBeTruthy();
  });
});

describe('keyboard', () => {
  it('has one tab stop in the web, and arrow keys, Home and End move through it', async () => {
    const m = await mount();
    const tabStops = () => [...m.host.querySelectorAll('.fw-chip')].filter((c) => c.getAttribute('tabindex') === '0');
    const order = W.allIds();
    expect(tabStops().map((c) => c.getAttribute('data-fw-id'))).toEqual([order[0]]);
    const first = chip(m.host, order[0]);
    first.focus();
    await key(first, 'ArrowRight');
    expect(document.activeElement).toBe(chip(m.host, order[1]));
    expect(tabStops().length).toBe(1);
    await key(document.activeElement, 'ArrowLeft');
    expect(document.activeElement).toBe(first);
    await key(first, 'ArrowDown');
    expect(document.activeElement).toBe(chip(m.host, W.ROWS[1].ids[0]));
    await key(document.activeElement, 'ArrowUp');
    expect(document.activeElement).toBe(first);
    await key(first, 'End');
    expect(document.activeElement).toBe(chip(m.host, order.at(-1)));
    await key(document.activeElement, 'Home');
    expect(document.activeElement).toBe(first);
    expect(first.tagName).toBe('BUTTON'); // Enter and Space work natively
  });

  it('keeps focus on the chip when choosing, moves to the new title when following a link, and returns on clear', async () => {
    const m = await mount();
    const c = chip(m.host, 'parrotfish');
    c.focus();
    await click(c);
    await settle();
    expect(document.activeElement).toBe(c);
    expect(m.said.join(' ')).toMatch(/Bleeker's parrotfish chosen\. It eats 1\./);
    const hop = byText(m.host.querySelector('[data-fw-panel]'), '.fw-link-btn', /Algae and seaweed/);
    hop.focus();
    await click(hop);
    await settle();
    expect(document.activeElement.id).toBe('cr-fw-panel-title');
    expect(document.activeElement.textContent).toBe('Algae and seaweed');
    expect(document.activeElement).not.toBe(document.body);
    const clear = byText(m.host.querySelector('[data-fw-panel]'), 'button', /Clear this choice/);
    clear.focus();
    await click(clear);
    await settle();
    expect(document.activeElement).toBe(chip(m.host, 'algae'));
    expect(m.d.sciWeb.sel).toBe(null);
  });

  it('reaches the topic with the arrow keys like the other tabs', async () => {
    const m = await mount({ sciTopic: 'build' });
    const tab = (id) => m.host.querySelector('#cr-scilab-tab-' + id);
    tab('build').focus();
    await key(tab('build'), 'ArrowRight');
    expect(m.d.sciTopic).toBe('web');
    expect(document.activeElement).toBe(tab('web'));
    expect(webPanel(m.host).hasAttribute('hidden')).toBe(false);
  });
});

describe('source rules', () => {
  const src = readFileSync(TOOL, 'utf8');
  const a = src.indexOf('// ── Who eats whom'), b = src.indexOf('function ScienceSection(props)');
  const block = src.slice(a, b);
  it('stays ES5, plain English, and keyed under fw_', () => {
    expect(a).toBeGreaterThan(0);
    expect(block.length).toBeGreaterThan(5000);
    const code = block.replace(/\/\/.*$/gm, '');
    expect(code).not.toMatch(/=>/);
    expect(code).not.toMatch(/\b(let|const)\s+[A-Za-z_$][\w$]*\s*(=|,|;)/);
    expect(code).not.toMatch(/\bclass\s+[A-Z]/);
    expect(code).not.toContain('`');
    expect(block).not.toMatch(/[–—‑]/);
    const keys = [...block.matchAll(/__alloT\('stem\.coralreef\.([a-zA-Z0-9_]+)'/g)].map((m) => m[1]);
    expect(keys.length).toBeGreaterThan(100);
    for (const k of keys) expect(/^fw_/.test(k) || /^sciLab_/.test(k), k).toBe(true);
    // Results are computed: the only place a direction appears in a string is the label function.
    expect(block).not.toMatch(/'The rule says: (Likely|About)/);
  });
  it('honors reduced motion and forced colors', () => {
    expect(block).toMatch(/prefers-reduced-motion:reduce/);
    expect(block).toMatch(/forced-colors:active/);
    expect(block).toMatch(/\.fw-lines path\{stroke:CanvasText\}/);
  });
});

describe('accessibility', () => {
  const VIEWS = {
    start: { sciWeb: {} },
    chosen: { sciWeb: { sel: 'parrotfish' } },
    group: { sciWeb: { sel: 'reef_fishes' } },
    partial: { sciWeb: { caseId: 'cleaner', cases: { cleaner: { pred: { parasites: 'more' } } } } },
    result: { sciWeb: { caseId: 'sharks', cases: { sharks: { pred: { reef_fishes: 'more', peacock_grouper: 'fewer', algae: 'same' }, revealed: true } } } }
  };
  for (const [name, seed] of Object.entries(VIEWS)) {
    it(`has no axe violations: ${name}`, async () => {
      const m = await mount(seed);
      const html = webPanel(m.host).outerHTML;
      const result = await runIsolatedAxe(html);
      expect(result.violations.map((v) => v.id + ': ' + v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')), name).toEqual([]);
    }, 60000);
  }
});

describe('names in the web', () => {
  it('calls the sea cucumber a sea cucumber: its common name, Pinkfish, would read as a fish', async () => {
    const m = await mount({ sciWeb: { sel: 'sea_cucumber' } });
    expect(m.host.textContent.includes('Pink sea cucumber')).toBe(true);
    const labels = [...m.host.querySelectorAll('button')].map((b) => b.textContent).join(' | ');
    expect(labels.includes('Pink sea cucumber'), labels.slice(0, 300)).toBe(true);
    expect(/\bPinkfish\b/.test(labels)).toBe(false);
  });
});
