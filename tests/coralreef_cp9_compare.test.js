import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// Lane cp9: the Compare page and the top menu. Each picture is checked against
// the function that supplies its numbers.

const SOURCE = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
let X, S, C, renderTool;
beforeAll(async () => {
  const H = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  H.resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; H.loadTool(SOURCE, 'coralReef'); renderTool = H.renderTool;
  X = window.__RR_TEST_EXPORTS__.coralReef; S = window.__RR_TEST_EXPORTS__.coralReefSurvey; C = window.__RR_TEST_EXPORTS__.coralReefCp9;
});
const parse = (html) => new DOMParser().parseFromString('<!doctype html><body>' + html + '</body>', 'text/html');
const render = (data, theme) => parse(renderTool('coralReef', { coralReef: data }, theme ? { theme } : undefined));
const styles = (doc) => [...doc.querySelectorAll('style')].map((s) => s.textContent).join('\n');
function entry(siteId, n, upTo = 40) {
  const site = X.siteById(siteId), L = X.buildTransect(site, S.transectSeed(site, n));
  const records = Object.fromEntries(L.points.slice(0, upTo).map((p) => [p.index, p.category]));
  const score = X.scoreSurvey(L, records, X.fishInBelt(L)), fish = {};
  score.fish.forEach((f) => { fish[f.family] = f.density; });
  return { id: X.surveyEntryId(site, L.seed), siteId, seed: L.seed, transect: n, modelYear: null, at: 1, agreement: score.agreement, recorded: upTo, records, cover: score.cover, indicators: X.indicators(score.cover), fish };
}
const SPOT_KINDS = ['hard_coral', 'bleached_coral', 'recently_dead_coral', 'macroalgae', 'rock', 'rubble', 'sand', 'missing'];
function drawn(fig) {
  const out = {};
  SPOT_KINDS.forEach((k) => { out[k] = fig.querySelectorAll('svg[data-cp9-art] [data-cp9-spot="' + k + '"]').length; });
  return out;
}
const countOf = (doc, id) => doc.querySelector('[data-cp9-reef="' + id + '"]');

describe('spots for a reef picture', () => {
  it('matches the model picture for a complete cover, and always fills 24 spots', () => {
    const covers = [
      { hard_coral: 42.5, bleached_coral: 0, recently_dead_coral: 2.5, macroalgae: 5, rock: 22.5, rubble: 15, sand: 12.5 },
      { hard_coral: 10, bleached_coral: 25, recently_dead_coral: 5, macroalgae: 20, rock: 20, rubble: 10, sand: 10 },
      { hard_coral: 0, bleached_coral: 0, recently_dead_coral: 0, macroalgae: 50, rock: 25, rubble: 12.5, sand: 12.5 }
    ];
    for (const c of covers) {
      const mine = C.spots(c, 0), frac = {};
      Object.keys(c).forEach((k) => { frac[k] = c[k] / 100; });
      const theirs = C.yearSpots(frac);
      for (const k of Object.keys(c)) expect(mine.counts[k], k).toBe(theirs.counts[k]);
      expect(mine.counts.missing).toBe(0);
      expect(mine.spots.filter(Boolean)).toHaveLength(24);
      expect(mine.spots).toEqual(theirs.spots);
    }
  });

  it('never draws missing points as rock or a lower cover: they get their own spots', () => {
    const c = { hard_coral: 2.5, bleached_coral: 0, recently_dead_coral: 2.5, macroalgae: 0, rock: 22.5, rubble: 47.5, sand: 10 };
    const sp = C.spots(c, 15);
    expect(sp.spots.filter(Boolean)).toHaveLength(24);
    expect(sp.counts.missing).toBe(Math.ceil(0.15 * 24)); // 3.6 spots rounds up to 4
    expect(sp.counts.hard_coral).toBe(1);
    // yearSpots alone has nowhere to put them: its rock count would swallow them.
    const frac = {}; Object.keys(c).forEach((k) => { frac[k] = c[k] / 100; });
    expect(C.yearSpots(frac).counts.rock + C.yearSpots(frac).counts.rubble + C.yearSpots(frac).counts.sand).toBeGreaterThan(sp.counts.rock + sp.counts.rubble + sp.counts.sand);
  });

  it('keeps live coral within one spot of the number, and never rounds a reported kind to nothing', () => {
    for (let live = 0.8; live < 60; live += 3.7) {
      const rest = 100 - live, c = { hard_coral: live, bleached_coral: 0, recently_dead_coral: 0, macroalgae: rest * 0.1, rock: rest * 0.5, rubble: rest * 0.2, sand: rest * 0.2 };
      const n = C.spots(c, 0).counts.hard_coral;
      expect(n).toBeGreaterThan(0);
      expect(Math.abs(n * 100 / 24 - live), 'live ' + live).toBeLessThanOrEqual(100 / 24);
    }
    const tiny = C.spots({ hard_coral: 40, bleached_coral: 0.8, recently_dead_coral: 0, macroalgae: 0.8, rock: 58.4, rubble: 0, sand: 0 }, 0);
    expect(tiny.counts.bleached_coral).toBe(1); expect(tiny.counts.macroalgae).toBe(1);
  });
});

describe('Your reefs side by side: one drawn reef per saved reef', () => {
  const log = () => [entry('reserve', 1), entry('reserve', 2), entry('reserve', 3), entry('harbor', 1), entry('rubble', 1, 34)];

  it('draws exactly the spots its averaged cover gives and states the number of transects', () => {
    const l = log(), doc = render({ section: 'compare', surveyLog: l }), groups = X.summarizeLog(l);
    expect(doc.querySelectorAll('[data-cp9-gallery="own"] svg[data-cp9-art]')).toHaveLength(groups.length);
    for (const g of groups) {
      const fig = countOf(doc, g.key), want = C.spots(g.cover, g.missing);
      expect(drawn(fig)).toEqual(want.counts);
      expect(fig.querySelector('.cp9-howmany').getAttribute('data-cp9-n')).toBe(String(g.entries.length));
      expect(fig.textContent).toContain(g.entries.length === 1 ? 'From 1 transect' : 'Average of ' + g.entries.length + ' transects');
      expect(fig.querySelector('[data-cp9-live]').textContent).toBe(g.liveMean + '%');
      const svg = fig.querySelector('svg[data-cp9-art]');
      expect(svg.getAttribute('role')).toBe('img');
      expect(svg.getAttribute('aria-label')).toContain('live coral ' + g.liveMean + '%');
      expect(svg.getAttribute('aria-label')).toContain('seaweed ' + g.algaeMean + '%');
    }
  });

  it('marks an incomplete reef with not-recorded spots, states the share, and keeps the page note', () => {
    const l = log(), doc = render({ section: 'compare', surveyLog: l }), g = X.summarizeLog(l).find((x) => x.key === 'rubble');
    expect(g.missing).toBeGreaterThan(0);
    const fig = countOf(doc, 'rubble');
    expect(fig.querySelector('[data-cp9-stat-missing]').textContent).toBe('Not recorded ' + g.missing + '%');
    expect(fig.querySelectorAll('[data-cp9-spot="missing"]').length).toBe(C.spots(g.cover, g.missing).counts.missing);
    expect(fig.querySelectorAll('[data-cp9-spot="missing"]').length).toBeGreaterThan(0);
    expect(fig.querySelector('svg[data-cp9-art]').getAttribute('aria-label')).toContain('Not recorded: ' + g.missing + '%');
    // The complete reef has none.
    expect(countOf(doc, 'reserve').querySelector('[data-cp9-spot="missing"]')).toBeNull();
    expect(doc.querySelector('[data-survey-incomplete-note]')).toBeTruthy();
    // Numbers drawn match the chart bar's numbers.
    const bar = doc.querySelector('[data-bar="rubble"] [data-cat="missing"]');
    expect(+bar.getAttribute('data-pct')).toBe(g.missing);
  });

  it('draws bleached spots from the bleached share and states it', () => {
    const e = entry('reserve', 1); const c = Object.assign({}, e.cover); c.bleached_coral = c.hard_coral / 2; c.hard_coral = c.hard_coral / 2;
    const l = [Object.assign({}, e, { cover: c, indicators: X.indicators(c) })], g = X.summarizeLog(l)[0], doc = render({ section: 'compare', surveyLog: l }), fig = countOf(doc, g.key);
    expect(drawn(fig)).toEqual(C.spots(g.cover, g.missing).counts);
    expect(drawn(fig).bleached_coral).toBeGreaterThan(0);
    expect(+fig.querySelector('[data-cp9-stat-bleached]').getAttribute('data-cp9-stat-bleached')).toBe(g.cover.bleached_coral);
    expect(fig.querySelector('svg[data-cp9-art]').getAttribute('aria-label')).toContain('(' + g.cover.bleached_coral + '% bleached)');
  });

  it('does not average an old entry without cover in as zero coral', () => {
    const a = entry('reserve', 1), b = Object.assign({}, entry('reserve', 2), { cover: undefined }), c = Object.assign({}, entry('harbor', 1), { cover: undefined });
    const doc = render({ section: 'compare', surveyLog: [a, b, c] });
    const fig = countOf(doc, 'reserve');
    expect(fig.querySelector('.cp9-howmany').getAttribute('data-cp9-n')).toBe('1');
    expect(fig.querySelector('.cp9-howmany').textContent).toContain('1 of 2 transects');
    expect(fig.querySelector('[data-cp9-live]').textContent).toBe(a.indicators.liveCoral + '%');
    expect(drawn(fig)).toEqual(C.spots(a.cover, 0).counts);
    // Nothing to draw at all: text, not an empty reef.
    const none = countOf(doc, 'harbor');
    expect(none.querySelector('svg')).toBeNull();
    expect(none.querySelector('[data-cp9-nocover]')).toBeTruthy();
  });

  it('gives every gradient a unique id whose references resolve, for two pictures on a page', () => {
    for (const theme of ['light', 'dark', 'contrast']) {
      const doc = render({ section: 'compare', surveyLog: log() }, theme);
      const ids = [...doc.querySelectorAll('[data-cp9-gallery] [id]')].map((n) => n.id);
      expect(new Set(ids).size, theme).toBe(ids.length);
      [...doc.querySelectorAll('[data-cp9-gallery] [fill^="url(#"]')].forEach((n) => {
        expect(doc.getElementById(n.getAttribute('fill').slice(5, -1)), n.getAttribute('fill')).toBeTruthy();
      });
      expect(doc.querySelector('[data-cp9-gallery] filter')).toBeNull();
      expect(doc.querySelector('[data-cp9-gallery] .crb-sway')).toBeNull();
    }
  });

  it('keeps one table in the DOM whose cells carry their column name for the phone cards', () => {
    const l = log(), doc = render({ section: 'compare', surveyLog: l });
    const table = doc.querySelector('table.cp9-rtable');
    const heads = [...table.querySelectorAll('thead th')].map((th) => th.textContent);
    expect(heads).toEqual(['Reef', 'Transects', 'Live coral', 'Seaweed', 'Grazing fish', 'Butterflyfish', 'Grouper and snapper']);
    expect(table.getAttribute('role')).toBe('table');
    const groups = X.summarizeLog(l);
    [...table.querySelectorAll('tbody tr')].forEach((tr, i) => {
      expect(tr.getAttribute('role')).toBe('row');
      expect(tr.querySelector('th').getAttribute('role')).toBe('rowheader');
      const tds = [...tr.querySelectorAll('td')];
      expect(tds.map((td) => td.getAttribute('data-cp9-label'))).toEqual(heads.slice(1));
      tds.forEach((td) => expect(td.getAttribute('role')).toBe('cell'));
      const g = groups[i];
      expect(tds[0].textContent).toBe(String(g.entries.length));
      expect(tds[1].textContent.startsWith(g.liveMean + '%')).toBe(true);
      expect(tds[4].textContent).toBe(String(g.butterfly));
    });
    const css = styles(doc);
    expect(css).toContain('.cp9-rtable tbody td::before{content:attr(data-cp9-label)');
    expect(css).toMatch(/@container sv-cmp \(max-width:560px\)\{[^@]*\.cp9-rscroll\{overflow:visible\}/);
    // Survey log: an incomplete transect says so; a complete one does not.
    const items = [...doc.querySelectorAll('[data-sv-log] > li')];
    expect(items[4].querySelector('[data-cp9-log-incomplete]').textContent).toBe('Incomplete: 34 of 40 points recorded');
    expect(items[0].querySelector('[data-cp9-log-incomplete]')).toBeNull();
  });
});

describe('the example block', () => {
  it('draws the example reefs from their own averaged numbers, clearly marked, and only them', () => {
    const doc = render({ section: 'compare' }), ex = doc.querySelector('[data-srv-example]');
    const groups = X.summarizeLog(S.exampleLog());
    const figs = [...ex.querySelectorAll('[data-cp9-reef]')];
    expect(figs.map((f) => f.getAttribute('data-cp9-reef'))).toEqual(['srv_example_a', 'srv_example_b']);
    figs.forEach((fig, i) => {
      const g = groups[i];
      expect(fig.className).toContain('cp9-fig-ex');
      expect(drawn(fig)).toEqual(C.spots(g.cover, g.missing).counts);
      expect(fig.querySelector('[data-cp9-live]').textContent).toBe(g.liveMean + '%');
      expect(fig.querySelector('.cp9-ex-tag').textContent).toBe('Example, not your data');
      expect(fig.querySelector('[data-cp9-example-wash]')).toBeTruthy();
      expect(fig.querySelector('svg').getAttribute('aria-label').startsWith('Example, not your data.')).toBe(true);
    });
    // No picture outside the labelled block when nothing is saved.
    expect(doc.querySelectorAll('svg[data-cp9-art]').length).toBe(ex.querySelectorAll('svg[data-cp9-art]').length);
  });

  it('never marks the student reef as an example, and keeps both apart with one saved reef', () => {
    const doc = render({ section: 'compare', surveyLog: [entry('reserve', 1)] });
    const own = doc.querySelector('[data-cp9-gallery="own"]');
    expect(own.closest('[data-srv-example]')).toBeNull();
    expect(own.querySelector('.cp9-ex-tag')).toBeNull();
    expect(own.querySelector('[data-cp9-example-wash]')).toBeNull();
    expect(doc.querySelector('[data-cp9-gallery="example"]').closest('[data-srv-example]')).toBeTruthy();
  });
});

describe('transect dots', () => {
  it('never leaves two dots in one lane closer than a dot width', () => {
    const sets = [[45, 37.5, 45], [45, 42.5, 40, 45, 37.5, 42.5, 45, 40], [0, 0, 0, 0, 0, 100, 100], [12.5, 5]];
    for (const vals of sets) for (const sep of [C.SEP_NARROW, C.SEP_WIDE]) {
      const res = C.dotLanes(vals, 50, sep);
      expect(res.levels).toHaveLength(vals.length);
      for (let i = 0; i < vals.length; i++) for (let j = i + 1; j < vals.length; j++) {
        if (res.levels[i] !== res.levels[j]) continue;
        const gap = Math.abs(Math.min(vals[i] / 50 * 100, 100) - Math.min(vals[j] / 50 * 100, 100));
        expect(gap, vals.join() + ' i' + i + ' j' + j).toBeGreaterThanOrEqual(sep);
      }
      expect(Math.max(...res.levels.map(Math.abs))).toBe(res.top);
    }
  });

  it('draws one dot per transect at its own value, whatever the lane', () => {
    const l = [1, 2, 3, 4, 5, 6].map((n) => entry('reserve', n)), doc = render({ section: 'compare', surveyLog: l });
    const row = doc.querySelector('[data-srv-figure="spread"] [data-srv-row="reserve"]');
    const dots = [...row.querySelectorAll('[data-srv-dot]')];
    expect(dots.map((d) => +d.getAttribute('data-srv-dot'))).toEqual(l.map((e) => e.indicators.liveCoral));
    expect(dots.map((d) => d.textContent)).toEqual(['1', '2', '3', '4', '5', '6']);
    dots.forEach((d) => expect(d.getAttribute('style')).toContain('--cp9-n'));
  });
});

describe('claim builder steps', () => {
  const log = () => [entry('reserve', 1), entry('reserve', 2), entry('harbor', 1), entry('harbor', 2)];
  const state = (claim) => {
    const doc = render({ section: 'compare', surveyLog: log(), srvClaim: claim });
    const card = doc.querySelector('[data-srv-claim]');
    return { doc, card, prog: [...card.querySelectorAll('.cp9-prog li')], steps: [...card.querySelectorAll('[data-cp9-step]')] };
  };

  it('shows progress from what the learner has done', () => {
    let s = state(undefined);
    expect(s.prog.map((li) => li.getAttribute('data-done'))).toEqual(['false', 'false', 'false']);
    expect(s.prog[0].getAttribute('aria-current')).toBe('step');
    expect(s.steps[0].className).toContain('cp9-step-now');
    expect(s.prog.map((li) => li.textContent)).toEqual(['1ClaimTo do', '2EvidenceTo do', '3ReasoningTo do']);
    s = state({ type: 'own', own: '   ' });
    expect(s.prog[0].getAttribute('data-done')).toBe('false');
    s = state({ type: 'more_live', evidence: { live: false } });
    expect(s.prog.map((li) => li.getAttribute('data-done'))).toEqual(['true', 'false', 'false']);
    expect(s.prog[1].getAttribute('aria-current')).toBe('step');
    s = state({ type: 'more_live', evidence: { live: true }, reasoning: 'Fish eat seaweed.' });
    expect(s.prog.map((li) => li.getAttribute('data-done'))).toEqual(['true', 'true', 'true']);
    expect(s.card.querySelector('[aria-current="step"]')).toBeNull();
    expect(s.card.querySelector('.cp9-prog').getAttribute('data-cp9-progress')).toBe('3');
  });

  it('keeps the semantics and the check logic', () => {
    const l = log(), groups = X.summarizeLog(l);
    const claim = { type: 'more_live', a: groups[0].key, b: groups[1].key, evidence: { live: true }, checked: true, checks: 1 };
    const doc = render({ section: 'compare', surveyLog: l, srvClaim: claim }), card = doc.querySelector('[data-srv-claim]');
    expect(card.querySelectorAll('fieldset input[type="radio"]')).toHaveLength(S.CLAIM_IDS.length);
    expect(card.querySelectorAll('fieldset input[type="checkbox"]')).toHaveLength(S.EVIDENCE_IDS.length);
    expect([...card.querySelectorAll('legend')].map((x) => x.textContent)).toEqual(['1. Your claim', '2. Evidence from your saved surveys']);
    expect(card.querySelector('label[for$="-why"]').textContent).toBe('3. Your reasoning');
    expect(card.querySelectorAll('[role="status"]')).toHaveLength(1);
    const want = S.checkClaim(groups, claim);
    expect(card.querySelector('[data-srv-feedback]').getAttribute('data-srv-feedback')).toBe(want.status);
    expect(card.querySelector('[data-srv-summary]').getAttribute('data-srv-summary')).toBe(want.status);
    expect(card.querySelector('.cp9-fb [data-srv-summary]')).toBeTruthy();
  });
});

describe('top menu', () => {
  it('keeps every section, its order, names and aria-current', () => {
    const doc = render({ section: 'compare' });
    const btns = [...doc.querySelectorAll('nav.cr-nav > ul > li > button')];
    expect(btns.map((b) => b.textContent)).toEqual(['Start', 'Dive and explore', 'Species guide', 'Survey methods', 'Field survey', 'Compare reefs', 'Reef future', 'Reef science', 'For teachers']);
    expect(btns.filter((b) => b.getAttribute('aria-current') === 'page').map((b) => b.textContent)).toEqual(['Compare reefs']);
    expect(doc.querySelector('nav.cr-nav').getAttribute('aria-label')).toBe('Coral Reef Survey Lab sections');
  });

  it('has a compact three-column layout, not a scroller, with 44 px targets', () => {
    const css = styles(render({ section: 'hub' }));
    expect(css).toContain('@container cr-nav (max-width:520px){[data-coralreef-root] .cr-nav ul{grid-template-columns:repeat(3,minmax(0,1fr))');
    expect(css).toContain('@container cr-nav (max-width:1130px){[data-coralreef-root] .cr-nav ul{display:grid;grid-template-columns:repeat(5,minmax(0,1fr))}');
    expect(css).toContain('[data-coralreef-root] .cr-nav button{min-height:44px!important');
    expect(css).not.toMatch(/\.cr-nav[^{]*\{[^}]*overflow-x:(auto|scroll)/);
  });
});

describe('source rules', () => {
  it('uses no dashes in new English and keeps two-argument strings', () => {
    const src = readFileSync(SOURCE, 'utf8');
    const lines = src.split('\n').filter((line) => line.includes('cp9'));
    lines.forEach((line) => expect(/[–—]/.test(line), line.slice(0, 80)).toBe(false));
    expect(src.match(/__alloT\('stem\.coralreef\.cp9_[a-z_]+'\)/)).toBeNull();
  });
});
