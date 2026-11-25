// Fire Ecology, sports-labs pass round 6 (2026-11-23; file named for the fifth Fire Ecology accuracy round).
// 1. Kalapuya card follows Boyd 1999's schedule: no burning while camas was dug (late spring, early summer),
//    dry prairies in late summer, oak openings in October.
// 2. "Elder Fire Keeper Visit" -> "Fire keeper visit". 3. Superlatives become plain claims.
// 4. Sweetgrass "does not tolerate hot fire" had no source (US Forest Service FEIS and Shebitz 2009 lean the
//    other way), so the claim is removed and the model keeps no riparian burn penalty.
// 5. A 0-ton carbon card reads "about even", not "carbon sink". 6. Two SVG charts use theme text colors in light mode.
// 7. Te Mana o te Taiao quote replaces "increasingly integrated"; slash-and-char is a modern test (Lehmann 2002).
// Fail-first: FE_FILE=C:/tmp/sports_labs_1123/fireecology/start_r5.js runs every block against the round-5 copy.
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
const svgBlock = (html, attr) => {
  const at = html.indexOf(attr);
  expect(at, attr).toBeGreaterThan(-1);
  return html.slice(at, html.indexOf('</svg>', at));
};

describe('Kalapuya card follows Boyd 1999', () => {
  it('drops annual fall camas burning and states the seasonal schedule', () => {
    const html = nation('coast_salish');
    expect(html).not.toContain('burned annually to maintain vast camas lily meadows');
    expect(html).not.toContain('Annual fall burning of camas prairies');
    expect(html).not.toContain('Fall burning killed Douglas-fir seedlings');
    expect(html).toContain('dug camas on the wet prairies in late spring and early summer, and did not burn then');
    expect(html).toContain('No burning in late spring and early summer, while camas was dug on the wet prairies (Boyd 1999)');
    expect(html).toContain('Burn the oak openings in October, after the acorns were gathered (Boyd 1999)');
    // the round-4 tarweed / deer-hunt line stays
    expect(html).toContain('led by a hunt leader (Boyd 1999)');
    expect(src()).toContain('There was no burning at this time.');
  });
});

describe('plain names and claims', () => {
  it('renames the Elder Fire Keeper game event', () => {
    const c = code();
    expect(c).not.toContain('Elder Fire Keeper Visit');
    expect(c).toContain("{ id: 'elderVisit', name: 'Fire keeper visit',");
  });

  it('replaces the two superlatives with plain claims', () => {
    const c = code();
    expect(c).not.toContain('rivals the greatest Indigenous fire practitioners');
    expect(c).not.toContain('the underlying logic is faithful');
    expect(c).toContain("desc: 'Top rank in this game: 300 points or more.");
    const html = render({ tab: 'mosaic', mosaic: { phase: 'setup' } });
    expect(html).toContain('It is a simple 8-year classroom model, so its numbers are the sim&#x27;s own, not measurements.');
    expect(src()).toContain("'stem.fireecology.this_sim_is_built_on_documented_wabana_v2'");
    expect(src()).not.toContain("'stem.fireecology.this_sim_is_built_on_documented_wabana'");
  });
});

describe('riparian sweetgrass claim checked against sources', () => {
  it('removes "does not tolerate hot fire" and cites the Forest Service review and Shebitz and James', () => {
    const html = render({ tab: 'mosaic', mosaic: { phase: 'setup', deepDiveZone: 'riparian' } });
    expect(html).not.toContain('does not tolerate hot fire');
    expect(html).not.toContain('It does not need fire');
    expect(html).toContain('underground stems can probably sprout again');
    expect(html).toContain('(Shebitz and James 2010)');
    expect(src()).toContain('fs.usda.gov/database/feis/plants/graminoid/hieodo/all.html');
    // sweetgrass spreads mainly by underground stems, so seed scatter no longer claims it
    expect(code()).not.toContain('big bluestem, sweetgrass establish');
  });

  it('keeps the burn model unchanged: no source supports a riparian burn penalty', () => {
    expect(code()).toContain("effects: { fuel: -16, health: 6, yield: 12 },\n      resetsBurn: true");
    expect(code()).not.toMatch(/riparianBurnPenalty|zoneId === 'riparian' && tech\.resetsBurn/);
  });
});

describe('carbon card wording at zero', () => {
  it('shows a 0-ton net as about even, with no down arrow and no "carbon sink"', () => {
    const html = render({ tab: 'carbon', carbonCalculated: true, carbonPrediction: 'wildfire' });
    const even = html.slice(html.indexOf('data-fe-net-carbon="even"'));
    expect(html).toContain('data-fe-net-carbon="even"');
    expect(even.slice(0, 600)).toContain('0 tons');
    expect(even.slice(0, 600)).toContain('(about even: stores as much as it releases)');
    expect(even.slice(0, 600)).not.toContain('carbon sink');
    expect(even.slice(0, 300)).not.toContain('\u2193');
    // the real sink and source still say so
    expect(html).toMatch(/data-fe-net-carbon="sink"[^>]*>\u2193 200 tons<span[^>]*>\(carbon sink\)/);
    expect(html).toMatch(/data-fe-net-carbon="source"[^>]*>\u2191 5,000 tons<span[^>]*>\(carbon source\)/);
  });
});

describe('light-mode chart labels', () => {
  const PALE = ['#94a3b8', '#cbd5e1', '#e2e8f0', '#86efac', '#fca5a5', '#4ade80'];
  const textFills = (svg) => [...svg.matchAll(/<text[^>]*fill="([^"]+)"/g)].map((m) => m[1]);
  it('uses theme colors (not fixed pale hex) for every text fill in both charts, light and dark', () => {
    for (const ctx of [{}, { isDark: true }]) {
      const eco = svgBlock(render({ tab: 'ecosystems' }, ctx), 'data-fe-interval-spectrum');
      const net = svgBlock(render({ tab: 'carbon', carbonCalculated: true, carbonPrediction: 'wildfire' }, ctx), 'data-fe-carbon-net');
      for (const svg of [eco, net]) {
        const fills = textFills(svg);
        expect(fills.length).toBeGreaterThan(4);
        if (!ctx.isDark) for (const f of fills) expect(PALE, f).not.toContain(f);
        expect(svg).not.toMatch(/<text[^>]*font-size="(10\.5|11|11\.5)"/);
      }
    }
  });
});

describe('nation-card wording with sources', () => {
  it('quotes the New Zealand biodiversity strategy instead of "increasingly integrated"', () => {
    const html = nation('maori_nz');
    expect(html).not.toContain('increasingly integrated into conservation');
    expect(html).toContain('an integral part of biodiversity research and management');
    expect(html).toContain('(Department of Conservation, Te Mana o te Taiao)');
    expect(html).toContain('(Wassilieff, Te Ara 2007)');
  });

  it('moves slash-and-char from ancient practice to a modern test', () => {
    const html = nation('amazon_terra_preta');
    expect(html).not.toContain('Use slash-and-char (not slash-and-burn)');
    expect(html).toContain('turning cleared plants into charcoal instead of burning them to ash (Lehmann and others 2002)');
  });
});
