import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab, renderTool } from './helpers/stem_widgets_smoke_harness.js';
import { runIsolatedAxe } from './helpers/isolated_axe_harness.js';

// Lane surveyvis: the Start page step pictures, the fish tally in the count
// step, the fish picture in Results, the Compare table note and the survey
// log bars. Each picture is decorative or repeats numbers that stay in text,
// so every one is checked for aria-hidden and against the numbers it draws.

const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const FAMILIES = ['parrotfish', 'surgeonfish', 'butterflyfish', 'grouper', 'snapper'];
let X, S;
beforeAll(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef; S = window.__RR_TEST_EXPORTS__.coralReefSurvey;
});
const parse = (html) => new DOMParser().parseFromString('<!doctype html><body>' + html + '</body>', 'text/html');
const render = (data, theme) => parse(renderTool('coralReef', { coralReef: data }, theme ? { theme } : undefined));
const transect = (siteId, n) => { const site = X.siteById(siteId); return X.buildTransect(site, S.transectSeed(site, n)); };
const recordsOf = (L, upTo = 40) => Object.fromEntries(L.points.slice(0, upTo).map((p) => [p.index, p.category]));
function entry(siteId, n) {
  const site = X.siteById(siteId), L = transect(siteId, n), records = recordsOf(L);
  const score = X.scoreSurvey(L, records, X.fishInBelt(L)), fish = {};
  score.fish.forEach((f) => { fish[f.family] = f.density; });
  return { id: X.surveyEntryId(site, L.seed), siteId, seed: L.seed, transect: n, modelYear: null, at: 1, agreement: score.agreement, recorded: 40, records, cover: score.cover, indicators: X.indicators(score.cover), fish, modelRun: null };
}
const fullLog = () => [entry('reserve', 1), entry('reserve', 2), entry('harbor', 1), entry('heatwave', 1)];
const hiddenByAncestor = (el) => { for (let n = el; n; n = n.parentElement) if (n.getAttribute && n.getAttribute('aria-hidden') === 'true') return true; return false; };
const styles = (doc) => [...doc.querySelectorAll('style')].map((s) => s.textContent).join('\n');

describe('Start page step pictures', () => {
  it('gives every step card one decorative scene, numbered like the card', () => {
    for (const theme of ['light', 'dark', 'contrast']) {
      const doc = render({ section: 'hub' }, theme);
      const steps = [...doc.querySelectorAll('[data-w2-step]')];
      expect(steps.length, theme).toBe(7);
      steps.forEach((li, i) => {
        const arts = li.querySelectorAll('[data-sv-step-art]');
        expect(arts.length, li.dataset.w2Step).toBe(1);
        const art = arts[0];
        expect(art.getAttribute('data-sv-step-art')).toBe(li.dataset.w2Step);
        expect(art.getAttribute('aria-hidden')).toBe('true');
        expect(art.querySelector('svg').getAttribute('focusable')).toBe('false');
        expect(art.querySelector('.w2-sv-num').textContent).toBe(String(i + 1).padStart(2, '0'));
        // Small scenes: a modest node count per picture.
        expect(art.querySelectorAll('svg *').length, li.dataset.w2Step).toBeLessThan(45);
        // The card's own accessible text and its Open button are unchanged.
        expect(li.querySelector('button').getAttribute('aria-label')).toMatch(/^Open: /);
      });
      // Gradient ids are unique and every url() reference resolves.
      const ids = [...doc.querySelectorAll('[data-sv-step-art] [id]')].map((n) => n.id);
      expect(new Set(ids).size).toBe(ids.length);
      [...doc.querySelectorAll('[data-sv-step-art] [fill^="url(#"]')].forEach((n) => {
        expect(doc.getElementById(n.getAttribute('fill').slice(5, -1)), n.getAttribute('fill')).toBeTruthy();
      });
    }
  });

  it('keeps the hub CSS free of animation and hides the pictures in forced colors', () => {
    const css = styles(render({ section: 'hub' }));
    const mine = css.split('\n').filter((l) => /w2-step-art|w2-sv-num/.test(l)).join('\n');
    expect(mine).toMatch(/forced-colors:active\)\{\[data-coralreef-root\] \.w2-step-art\{display:none!important\}/);
    expect(/animation|@keyframes|transition/.test(mine)).toBe(false);
  });
});

describe('fish tally in the count step', () => {
  it('draws one small fish per fish counted, hidden from screen readers', () => {
    const L = transect('reserve', 1), counts = { parrotfish: 7, surgeonfish: 0, butterflyfish: 12, grouper: 35, snapper: 1 };
    const doc = render({ section: 'survey', surveySiteId: 'reserve', surveySeed: L.seed, records: recordsOf(L), fishCounts: counts, surveyStage: 'fish' });
    const rows = [...doc.querySelectorAll('[data-sv-count]')];
    expect(rows.map((r) => r.dataset.svCount)).toEqual(FAMILIES);
    rows.forEach((li) => {
      const fam = li.dataset.svCount, n = counts[fam];
      const tally = li.querySelector('.sv-tally');
      expect(tally.getAttribute('aria-hidden')).toBe('true');
      const run = tally.querySelector('svg[data-sv-run]');
      if (!n) { expect(run, fam).toBeNull(); return; }
      expect(run.getAttribute('data-sv-run')).toBe(fam);
      expect(+run.getAttribute('data-filled') + +run.getAttribute('data-more'), fam).toBe(n);
      expect(+run.getAttribute('data-filled')).toBe(Math.min(n, 30));
      expect(+run.getAttribute('data-missed') + +run.getAttribute('data-extra')).toBe(0);
      // Each fish is its own subpath: body, tail and eye, three per fish.
      expect((run.querySelector('path').getAttribute('d').match(/M/g) || []).length).toBe(3 * Math.min(n, 30));
      // The controls keep their names.
      expect(li.querySelector('input').getAttribute('aria-label')).toMatch(/ count$/);
      expect(li.querySelector('.sv-chip').getAttribute('aria-hidden')).toBe('true');
    });
    expect(doc.querySelector('[data-sv-count="grouper"] text').textContent).toBe('+5');
  });
});

describe('fish picture in Results', () => {
  let L, off;
  beforeAll(() => {
    L = transect('reserve', 1);
    const belt = X.fishInBelt(L);
    off = Object.assign({}, belt, { parrotfish: Math.max(0, belt.parrotfish - 2), surgeonfish: belt.surgeonfish + 3 });
  });

  it('after the belt check, matched + extra = your count and matched + missed = the belt', () => {
    const doc = render({ section: 'survey', surveySiteId: 'reserve', surveySeed: L.seed, records: recordsOf(L), fishCounts: off, surveyStage: 'results', srvFishDone: true });
    const fig = doc.querySelector('[data-sv-fish-figure]');
    expect(fig.getAttribute('aria-hidden')).toBe('true');
    expect(fig.getAttribute('data-sv-fish-figure')).toBe('checked');
    const table = fig.parentElement.querySelector('table');
    const cells = Object.fromEntries([...table.querySelectorAll('tbody tr')].map((tr) => [tr.querySelector('th').textContent, [...tr.querySelectorAll('td')].map((td) => +td.textContent)]));
    const score = X.scoreSurvey(L, recordsOf(L), off);
    for (const f of score.fish) {
      const row = fig.querySelector('[data-sv-fish="' + f.family + '"]');
      expect(+row.getAttribute('data-counted')).toBe(f.counted);
      expect(+row.getAttribute('data-in-belt')).toBe(f.inBelt);
      const name = row.querySelector('.sv-fishname').textContent;
      expect(cells[name]).toEqual([f.counted, f.inBelt]);
      const run = row.querySelector('svg[data-sv-run]');
      const filled = +run.getAttribute('data-filled'), extra = +run.getAttribute('data-extra'), missed = +run.getAttribute('data-missed');
      expect(filled + extra, f.family).toBe(f.counted);
      expect(filled + missed, f.family).toBe(f.inBelt);
    }
    expect(fig.textContent).toContain('In the belt, not in your count');
    expect(fig.textContent).toContain('Counted, but more than the belt holds');
  });

  it('before the belt check it shows only your own count, never the belt numbers', () => {
    for (const st of [
      { records: recordsOf(L), surveyStage: 'results' },
      { records: recordsOf(L, 39), fishCounts: off, surveyStage: 'results', srvFishDone: true }
    ]) {
      const doc = render(Object.assign({ section: 'survey', surveySiteId: 'reserve', surveySeed: L.seed }, st));
      const fig = doc.querySelector('[data-sv-fish-figure]');
      expect(fig.getAttribute('data-sv-fish-figure')).toBe('counted');
      fig.querySelectorAll('[data-sv-fish]').forEach((row) => {
        expect(row.hasAttribute('data-in-belt')).toBe(false);
        const run = row.querySelector('svg[data-sv-run]');
        if (run) expect(+run.getAttribute('data-missed') + +run.getAttribute('data-extra')).toBe(0);
      });
      expect(fig.textContent.includes('In the belt')).toBe(false);
      if (Object.keys(st.records).length < 40) expect(doc.querySelector('[data-strip="key"]')).toBeNull();
    }
  });
});

describe('Compare table and survey log', () => {
  it('keeps the long table note outside the scroller, so it wraps instead of being clipped', () => {
    const doc = render({ section: 'compare', surveyLog: fullLog() });
    const table = doc.querySelector('table.sv-cmp');
    const note = doc.getElementById(table.getAttribute('aria-labelledby'));
    expect(note.textContent).toMatch(/^Averages over every saved transect/);
    expect(note.closest('.sv-cmp-scroll')).toBeNull();
    expect(table.closest('.sv-cmp-scroll')).toBeTruthy();
    expect(table.querySelector('caption')).toBeNull();
    const css = styles(doc);
    expect(css).toContain('.sv-cmp-note{margin:0 0 6px;overflow-wrap:anywhere;white-space:normal}');
    expect(css).toContain('.sv-cmp-scroll{overflow-x:auto}');
    expect(doc.querySelector('.sv-cmp-hint').getAttribute('aria-hidden')).toBe('true');
    // Header names are unchanged; the marks beside them are hidden.
    expect([...table.querySelectorAll('thead th')].map((th) => th.textContent)).toEqual(['Reef', 'Transects', 'Live coral', 'Seaweed', 'Grazing fish', 'Butterflyfish', 'Grouper and snapper']);
    table.querySelectorAll('thead svg, thead .crb-swatch').forEach((m) => expect(hiddenByAncestor(m)).toBe(true));
    // Ranges sit on their own line and match the transects.
    const groups = X.summarizeLog(fullLog());
    const reserve = groups.find((g) => g.key === 'reserve');
    const liveCell = [...table.querySelectorAll('tbody tr')][0].querySelectorAll('td')[1];
    expect(liveCell.querySelector('.sv-range').textContent).toBe('(' + reserve.liveMin + ' to ' + reserve.liveMax + ')');
    expect(liveCell.textContent).toBe(reserve.liveMean + '%(' + reserve.liveMin + ' to ' + reserve.liveMax + ')');
    const single = [...table.querySelectorAll('tbody tr')].find((tr) => tr.querySelector('th').textContent.startsWith('Reef during'));
    expect(single.querySelector('.sv-range')).toBeNull();
  });

  it('draws one cover bar per saved transect from its own cover, numbered like the spread dots', () => {
    const log = fullLog();
    const legacy = Object.assign({}, entry('rubble', 1), { id: 'legacy', cover: undefined });
    const doc = render({ section: 'compare', surveyLog: log.concat([legacy]) });
    const items = [...doc.querySelectorAll('[data-sv-log] > li')];
    expect(items).toHaveLength(5);
    items.slice(0, 4).forEach((li, i) => {
      const e = log[i];
      expect(li.querySelector('.sv-log-n').textContent).toBe(String(e.transect));
      expect(li.querySelector('.sv-log-n').getAttribute('aria-hidden')).toBe('true');
      const bar = li.querySelector('[data-sv-logbar]');
      expect(bar.getAttribute('aria-hidden')).toBe('true');
      const segs = [...bar.querySelectorAll('[data-cat]')];
      expect(segs.map((s) => s.getAttribute('data-cat'))).toEqual(X.CATEGORY_IDS.filter((id) => e.cover[id] > 0));
      segs.forEach((s) => expect(+s.getAttribute('data-pct')).toBe(e.cover[s.getAttribute('data-cat')]));
      expect(li.textContent).toContain('transect ' + e.transect + ': live coral ' + e.indicators.liveCoral + '%');
    });
    expect(items[4].querySelector('[data-sv-logbar]')).toBeNull();
    // The log bars are not the comparison chart's bars.
    expect(doc.querySelectorAll('[data-compare-chart] [data-reef]')).toHaveLength(X.summarizeLog(log.concat([legacy])).length);
  });

  it('adds no animation in the survey styles', () => {
    const css = styles(render({ section: 'compare', surveyLog: fullLog() }));
    const mine = css.split(/(?=\[data-coralreef-root\] )/).filter((r) => /\.sv-/.test(r)).join('');
    expect(mine.length).toBeGreaterThan(200);
    expect(/animation|@keyframes|transition/.test(mine)).toBe(false);
  });
});

describe('accessibility', () => {
  it('passes axe on the count step, Results and Compare, in light and contrast', async () => {
    const L = transect('reserve', 1), belt = X.fishInBelt(L);
    const views = [
      ['hub', { section: 'hub' }],
      ['fish', { section: 'survey', surveySiteId: 'reserve', surveySeed: L.seed, records: recordsOf(L), fishCounts: belt, surveyStage: 'fish' }],
      ['results', { section: 'survey', surveySiteId: 'reserve', surveySeed: L.seed, records: recordsOf(L), fishCounts: Object.assign({}, belt, { snapper: belt.snapper + 2 }), surveyStage: 'results', srvFishDone: true }],
      ['compare', { section: 'compare', surveyLog: fullLog() }]
    ];
    for (const theme of ['light', 'contrast']) {
      for (const [name, data] of views) {
        const result = await runIsolatedAxe(renderTool('coralReef', { coralReef: data }, { theme }));
        expect(result.violations.map((v) => v.id + ': ' + v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', ')), theme + ' ' + name).toEqual([]);
      }
    }
  }, 120000);
});

describe('source rules', () => {
  it('new strings use stem.coralreef.sv_ keys and plain hyphens', () => {
    const src = readFileSync(TOOL, 'utf8');
    const keys = [...src.matchAll(/__alloT\('stem\.coralreef\.(sv_[a-z0-9_]+)', '([^']*)'\)/g)];
    // sv_back and sv_open belong to an earlier pass; this lane adds the five below.
    const mine = ['sv_fish_extra', 'sv_fish_match', 'sv_fish_missed', 'sv_fish_one', 'sv_table_scroll_hint'];
    mine.forEach((k) => expect(keys.filter((m) => m[1] === k), k).toHaveLength(1));
    keys.filter((m) => mine.includes(m[1])).forEach((m) => expect(/[‐-―]/.test(m[2]), m[1]).toBe(false));
  });
});
