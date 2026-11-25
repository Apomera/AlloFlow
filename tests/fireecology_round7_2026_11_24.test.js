// Fire Ecology, sports-labs pass round 7 (2026-11-24).
// 1. Source-or-remove: Kalapuya bracken / berry lines follow Boyd 1999 (bracken rhizomes; Tillamook salal and
//    huckleberry burning), "within decades" and Oregon grape go, the Garry oak loss and Grand Ronde restoration are
//    sourced; the San legacy and the "Paradigm Shift" card drop "increasingly recognize(s)"; the beaver intro drops
//    unsourced claims.
// 2. Carbon tab: the car comparison comes from one model function (saved tons / EPA 4.6 t per car per year).
// 3. Net-carbon chart: a phone / tablet layout of plain HTML rows (no sideways scroll), wide SVG kept for desktop.
// Fail-first: FE_FILE=C:/tmp/sports_labs_1123/fireecology/start_r6.js runs every block against the round-6 copy.
import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.FE_FILE || 'stem_lab/stem_tool_fireecology.js';
beforeEach(() => {
  resetStemLab();
  loadTool(FILE, 'fireEcology');
});
const render = (state = {}, ctx = {}) => renderTool('fireEcology', { fireEcology: state }, ctx);
const src = () => fs.readFileSync(FILE, 'utf8');
// Shipped code only: source comments quote what was removed and why.
const code = () => src().split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
const nation = (id) => render({ tab: 'indigenous', selectedNation: id });
const unesc = (s) => s.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const carbon = (acres, ctx) => unesc(render({ tab: 'carbon', carbonCalculated: true, carbonPrediction: 'wildfire', carbonAcres: acres }, ctx));
const block = (html, attr, end) => {
  const at = html.indexOf(attr);
  expect(at, attr).toBeGreaterThan(-1);
  return html.slice(at, end ? html.indexOf(end, at) : at + 6000);
};

describe('Kalapuya card: bracken, berries and Garry oak follow their sources', () => {
  it('drops the unsourced lines and states what Boyd 1999 and FEIS say', () => {
    const html = unesc(nation('coast_salish'));
    expect(html).not.toContain('edible fiddlehead production');
    expect(html).not.toContain('Create berry patches');
    expect(html).not.toContain('Oregon grape');
    expect(html).not.toContain('shades out the oaks within decades');
    expect(html).toContain('Burn open ground so bracken fern grows well; people ate its underground stems (Boyd 1999)');
    expect(html).toContain('no berries the next season, a much better crop the year after (Tillamook, in Boyd 1999)');
    expect(html).toContain('more than 95 percent of Garry oak habitat has been lost');
    expect(html).toContain('(US Forest Service FEIS)');
    expect(html).toContain('among the most endangered in Canada (Garry Oak Ecosystems Recovery Team)');
    expect(html).toContain('Confederated Tribes of Grand Ronde, which include Kalapuya bands');
    expect(html).not.toContain('the Kalapuya are working with conservation organizations');
  });
  it('keeps the source quotes in comments next to the data', () => {
    const s = src();
    expect(s).toContain('"the rhizome of bracken fern"');
    expect(s).toContain('Every few years the berry');
    expect(s).toContain('Oregon white oak habitat');
    expect(s).toContain('culturally prescribed fire and mowing');
  });
});

describe('San card and the suppression-era "Paradigm Shift" card', () => {
  it('San legacy is sourced and drops "increasingly recognizes"', () => {
    const html = unesc(nation('san_bushmen'));
    expect(html).not.toContain('Conservation biology increasingly recognizes');
    expect(html).not.toContain('bush encroachment has often followed');
    expect(html).toContain('mostly in 1997 and 2002');
    expect(html).toContain('had been wrongly evicted (Reuters, 2006)');
    expect(html).toContain("less fire is one of them (O'Connor and others 2014)");
  });
  it('the Paradigm Shift card names its sources', () => {
    const html = unesc(render({ tab: 'science', selectedScience: 'suppressionHistory' }));
    expect(html).toContain('The Paradigm Shift');
    expect(html).not.toContain('increasingly recognize');
    expect(html).not.toContain('co-management agreements are growing');
    expect(html).toContain('(Lake and others 2017)');
    expect(html).toContain('(Joint Secretarial Order 3403)');
  });
  it('no shipped string says "increasingly recogni..." or "groundbreaking"', () => {
    expect(code()).not.toMatch(/increasingly recogni/i);
    expect(code()).not.toMatch(/groundbreaking/i);
  });
  it('beaver intro keeps only what Fairfax and Whittle 2020 found', () => {
    const html = unesc(render({ tab: 'beavers' }));
    expect(html).not.toContain('one of the most important allies');
    expect(html).not.toContain('directly linked to increased wildfire vulnerability');
    expect(html).not.toContain('while everything around them burned');
    expect(html).toContain('(Fairfax and Whittle 2020)');
    expect(html).toContain('stayed much greener during wildfire than similar streams without dams');
  });
});

describe('final scan: two Did You Know facts reworded to their sources', () => {
  it('savanna and gopher tortoise facts carry sources and drop the unsourced parts', () => {
    const c = code();
    expect(c).not.toContain('Without fire, African savannas would be dense woodland');
    expect(c).not.toContain('greatest animal concentrations');
    expect(c).not.toContain('shelter more than 350 other species during fires');
    expect(c).toContain('Less fire is one of several causes working together (O\\u2019Connor and others 2014)');
    expect(c).toContain('Gopher tortoise burrows average about 15 feet long');
    expect(src()).toContain('protection from extreme temperatures, drought, and fire');
  });
});

describe('carbon tab car comparison is derived from the shown tons', () => {
  for (const acres of [10, 100, 2350, 10000]) {
    it('at ' + acres + ' acres the car count = shown saved tons / 4.6 (EPA)', () => {
      const html = carbon(acres);
      const box = block(html, 'data-fe-carbon-cars');
      const tons = Number(/saves <strong>([\d,]+) tons of CO/.exec(box)[1].replace(/,/g, ''));
      expect(tons).toBe((40 - 3) * acres);
      const cars = Math.round(tons / 4.6);
      expect(box).toContain('data-fe-carbon-cars="' + cars + '"');
      expect(box).toContain('<strong>' + cars.toLocaleString() + '</strong>');
      expect(box).toContain('typical cars give off in a year (US EPA: about 4.6 metric tons per car)');
      expect(box).toContain('in the first year compared to wildfire');
    });
  }
  it('names the EPA source in a comment and the 100-acre case reads 804', () => {
    expect(src()).toContain('A typical passenger vehicle emits about 4.6 metric tons of carbon');
    expect(block(carbon(100), 'data-fe-carbon-cars')).toContain('data-fe-carbon-cars="804"');
  });
});

describe('net-carbon chart has a phone layout with no sideways scroll', () => {
  const ROWS = ['culturalBurn', 'prescribedBurn', 'wildfire', 'suppression50yr'];
  const PALE = ['#94a3b8', '#cbd5e1', '#e2e8f0', '#86efac', '#fca5a5', '#4ade80'];
  const pct = (s, prop) => Number(new RegExp(prop + ':\\s*([\\d.]+)%').exec(s)[1]);
  it('wraps the wide SVG for desktop and adds a narrow list with every row', () => {
    const html = carbon(100);
    const net = block(html, 'data-fe-carbon-net="4"', 'Gray line = 0 tons');
    expect(net).toMatch(/class="fireecology-cyc-wide"/);
    expect(net).toContain('data-fe-carbon-net-narrow="4"');
    const narrow = net.slice(net.indexOf('data-fe-carbon-net-narrow'));
    expect(narrow).not.toContain('overflow-x');
    expect(narrow).not.toContain('<svg');
    for (const k of ROWS) expect(narrow).toContain('data-fe-carbon-net-row="' + k + '"');
    expect(narrow).toContain('-200 t');
    expect(narrow).toContain('about even');
    expect(narrow).toContain('+5,000 t');
    expect(narrow).toContain('+8,000 t');
    expect(narrow).toContain('aria-label="Net carbon after ten years for 100 acres.');
    for (const m of narrow.matchAll(/font-size:\s*([\d.]+)px/g)) expect(Number(m[1])).toBeGreaterThanOrEqual(12);
  });
  it('bars share one scale from one zero line: sink left, sources right, 50:80 lengths', () => {
    for (const acres of [10, 100, 10000]) {
      const narrow = block(carbon(acres), 'data-fe-carbon-net-narrow', 'Gray line = 0 tons');
      const bar = (k) => {
        const at = narrow.indexOf('data-fe-carbon-net-bar="' + k + '"');
        return narrow.slice(at, narrow.indexOf('>', at));
      };
      const zero = 30;
      const sink = bar('culturalBurn'), wf = bar('wildfire'), sup = bar('suppression50yr'), even = bar('prescribedBurn');
      expect(pct(sink, 'left') + pct(sink, 'width')).toBeCloseTo(zero, 5);
      expect(pct(wf, 'left')).toBe(zero);
      expect(pct(sup, 'left')).toBe(zero);
      expect(pct(even, 'width')).toBe(0);
      expect(pct(wf, 'width') / pct(sup, 'width')).toBeCloseTo(50 / 80, 5);
      expect(pct(sup, 'left') + pct(sup, 'width')).toBeLessThanOrEqual(100);
    }
  });
  it('uses theme-safe text colors in light mode and dark mode', () => {
    for (const ctx of [{}, { isDark: true }]) {
      const narrow = block(carbon(100, ctx), 'data-fe-carbon-net-narrow', 'Gray line = 0 tons');
      const colors = [...narrow.matchAll(/[^-]color:\s*(#[0-9a-f]{6})/gi)].map((m) => m[1].toLowerCase());
      expect(colors.length).toBeGreaterThan(2);
      if (!ctx.isDark) for (const c of colors) expect(PALE, c).not.toContain(c);
    }
  });
});
