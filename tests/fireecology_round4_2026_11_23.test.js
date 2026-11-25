// Fire Ecology, sports-labs pass round 4 (2026-11-23).
// 1. Voice: the Cultural Mosaic no longer speaks in a first-person or quoted Wabanaki / Elder voice. Each zone's
//    "Key idea" is a third-person note from a named source or from the sim's own model, the year review shows
//    "Land notes" instead of quoted "Elder Guidance", and the Firekeeper game's "Elder Advisor" quotes became
//    plain "Fire-keeping note" lines whose numbers match gameAdvance.
// 2. Nation cards: unsourced cultural specifics (Maori, Amazon, Ojibwe, Kalapuya) are reworded to their sources.
// 3. Phone layout: the case-study timeline and the four-stage cycle get phone layouts; small labels reach 12 px.
// Fail-first: FE_FILE=C:/tmp/sports_labs_1123/fireecology/start_r4.js runs every block against the round-4
// reference copy, where each one fails.
import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.FE_FILE || 'stem_lab/stem_tool_fireecology.js';
beforeEach(() => {
  resetStemLab();
  loadTool(FILE, 'fireEcology');
});
const render = (state = {}) => renderTool('fireEcology', { fireEcology: state });
const src = () => fs.readFileSync(FILE, 'utf8');
// Shipped code only: source comments may quote what was removed and why.
const code = () => src().split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

const ZONES = ['blueberryBarren', 'oakSavanna', 'mixedConifer', 'riparian', 'whitePineGrove', 'intervaleMeadow', 'hardwoodStand'];
const deepDive = (zone) => render({ tab: 'mosaic', mosaic: { phase: 'setup', deepDiveZone: zone } });
const keyIdeaBlock = (html, zone) => {
  const at = html.indexOf('data-fe-key-idea="' + zone + '"');
  expect(at, zone).toBeGreaterThan(-1);
  return html.slice(at, at + 2400);
};
// The model the cycle line must agree with (the drift rule in endYear before round 4).
const refDrift = (fr, lastBurn) => {
  const pastDue = lastBurn - fr;
  return fr < 50 && pastDue > 0 ? -(4 + Math.min(8, pastDue)) : -1;
};

describe('mosaic voice: key ideas', () => {
  it('replaces every first-person or quoted teaching with a plain third-person key idea', () => {
    for (const zone of ZONES) {
      const block = keyIdeaBlock(deepDive(zone), zone);
      expect(block, zone).toContain('Key idea');
      expect(block, zone).not.toContain('\u201C');
      expect(block, zone).not.toContain('font-style:italic');
      expect(block, zone).toContain('They are not quotes from any person.');
    }
    const c = code();
    for (const gone of ['A Wabanaki teaching', 'We are inside that line', 'When the colonists arrived', 'They were already fields',
      'The fire is the harvest', 'Your job is to leave the beaver alone', 'The patience is daily', 'Paraphrased from documented Wabanaki',
      'teaching: ']) {
      expect(c, gone).not.toContain(gone);
    }
  });

  it('attributes the sourced key ideas to their sources', () => {
    expect(keyIdeaBlock(deepDive('hardwoodStand'), 'hardwoodStand')).toContain('passed from weaver to weaver, generation to generation (Hood Museum of Art)');
    expect(keyIdeaBlock(deepDive('hardwoodStand'), 'hardwoodStand')).toContain('(University of Maine Mitchell Center)');
    expect(keyIdeaBlock(deepDive('oakSavanna'), 'oakSavanna')).toContain('cannot grow up under a dense canopy');
    expect(keyIdeaBlock(deepDive('blueberryBarren'), 'blueberryBarren')).toContain('on a two-year cycle');
    const s = src();
    for (const ref of ['naaer.hoodmuseum.dartmouth.edu/essay-wabanaki-basket-weaving', 'umaine.edu/mitchellcenter/?p=2119',
      'fs.usda.gov/database/feis/plants/tree/quealb/all.html']) {
      expect(s, ref).toContain(ref);
    }
  });

  it('prints each zone fire cycle from the same drift rule the year uses', () => {
    const due = {};
    for (const zone of ZONES) {
      const block = keyIdeaBlock(deepDive(zone), zone);
      const line = (block.match(/data-fe-cycle-line="[^"]+"[^>]*>([^<]+)</) || [])[1];
      expect(line, zone).toBeTruthy();
      const m = line.match(/about every (\d+) years\. Until then, its yield slips (\d+) points? a year\. Once a burn is overdue, yield drops (\d+) points the first year, then (\d+), and so on, up to (\d+) a year\./);
      if (m) {
        const fr = Number(m[1]);
        due[zone] = fr;
        expect(Number(m[2]), zone).toBe(-refDrift(fr, fr));
        expect(Number(m[3]), zone).toBe(-refDrift(fr, fr + 1));
        expect(Number(m[4]), zone).toBe(-refDrift(fr, fr + 2));
        expect(Number(m[5]), zone).toBe(-refDrift(fr, fr + 1000));
      } else {
        expect(line, zone).toMatch(/never comes due for fire\. Each year its yield slips 1 point before events\./);
        due[zone] = Infinity;
      }
    }
    // The comparative key ideas must stay true of the zone table.
    const order = Object.keys(due).sort((a, b) => due[a] - due[b]);
    expect(order[0]).toBe('blueberryBarren');
    expect(order[1]).toBe('intervaleMeadow');
    expect(due.riparian).toBe(Infinity);
    expect(due.mixedConifer).toBeGreaterThanOrEqual(25);
    expect(due.whitePineGrove).toBeGreaterThanOrEqual(20);
    // endYear and the do-nothing baseline use the same helper.
    expect(code()).toContain('nz.yield = clamp(nz.yield + mosaicYieldDrift(def.fireReturn, nz.lastBurn), 0, 100);');
    expect(code()).toContain('var drift = mosaicYieldDrift(def.fireReturn, nz.lastBurn);');
  });
});

describe('mosaic voice: year review land notes', () => {
  const zones = [
    { id: 'blueberryBarren', fuel: 70, health: 60, yield: 30, lastBurn: 6 },
    { id: 'oakSavanna', fuel: 60, health: 60, yield: 40, lastBurn: 7 },
    { id: 'mixedConifer', fuel: 30, health: 50, yield: 30, lastBurn: 19 },
    { id: 'riparian', fuel: 40, health: 80, yield: 50, lastBurn: 99 },
    { id: 'whitePineGrove', fuel: 30, health: 70, yield: 40, lastBurn: 23 },
    { id: 'intervaleMeadow', fuel: 30, health: 80, yield: 60, lastBurn: 4 },
    { id: 'hardwoodStand', fuel: 30, health: 70, yield: 20, lastBurn: 39 }
  ];
  it('shows plain, unquoted land notes whose numbers match their tests', () => {
    const html = render({ tab: 'mosaic', mosaic: { phase: 'review', year: 2, zones } });
    expect(html).toContain('data-fe-land-notes="3"');
    expect(html).toContain('Land notes');
    expect(html).not.toContain('Elder Guidance');
    const block = html.slice(html.indexOf('data-fe-land-notes'), html.indexOf('data-fe-land-notes') + 1800);
    expect(block).not.toContain('\u201C');
    expect(block).not.toContain('font-style:italic');
    expect(block).toContain('Blueberry Barren: fuel is above 60.');
    expect(block).toContain('Blueberry Barren: more than 4 years since the last burn.');
    expect(block).toContain('White Oak Savanna: fuel is above 55.');
    const c = code();
    expect(c).not.toContain('MOSAIC_ELDER');
    expect(c).not.toContain('The pines are tired');
    expect(c).not.toContain('Something is not right by the water');
  });

  it('does not show a land note when no zone crosses its line', () => {
    const calm = zones.map((z) => Object.assign({}, z, { fuel: 20, health: 80, yield: 60, lastBurn: 1 }));
    const html = render({ tab: 'mosaic', mosaic: { phase: 'review', year: 2, zones: calm } });
    expect(html).not.toContain('data-fe-land-notes');
  });
});

describe('Firekeeper game advisor', () => {
  const gs = { year: 30, fuelLoad: 60, understoryDensity: 30, biodiversity: 60, soilHealth: 70, waterYield: 70, villageHealth: 80,
    canopyCover: 50, totalBurns: 0, wildfires: 0, yearsSinceLastBurn: 10, beaverDams: 0, species: [], decisionsWon: 0 };
  it('replaces the quoted Elder Advisor with plain fire-keeping notes', () => {
    const html = render({ tab: 'game', gameActive: true, gameState: gs, gameDifficulty: 'medium' });
    expect(html).toContain('Fire-keeping note: fuel is above 50.');
    expect(html).not.toContain('Elder Advisor');
    const c = code();
    expect(c).not.toContain('Elder Advisor');
    expect(c).not.toMatch(/[Oo]ur ancestors/);
    expect(c).toContain('Each decade you take no action adds 8 fuel and 12 understory');
    // The numbers in that note are the ones gameAdvance applies for "nothing".
    expect(c).toMatch(/action === 'nothing'\) \{\s*gs\.fuelLoad = clamp\(gs\.fuelLoad \+ 8, 0, 100\);\s*gs\.understoryDensity = clamp\(gs\.understoryDensity \+ 12, 0, 100\);/);
  });
});

describe('nation cards', () => {
  it('rewords the Maori card to Te Ara', () => {
    const html = render({ tab: 'indigenous', selectedNation: 'maori_nz' });
    expect(html).not.toContain('rongoaa');
    expect(html).not.toContain('food systems)');
    expect(html).not.toContain('legacy of Indigenous landscape management');
    expect(html).not.toContain('wetland edges');
    expect(html).toContain('flush out game birds such as moa (Peden, Te Ara 2008)');
    expect(html).toContain('every 3 to 5 years in parts of the North Island');
    expect(html).toContain('(Wassilieff, Te Ara 2007)');
  });

  it('rewords the terra preta card to Glaser 2007', () => {
    const html = render({ tab: 'indigenous', selectedNation: 'amazon_terra_preta' });
    expect(html).not.toContain('most fertile soil on Earth');
    expect(html).not.toContain('extraordinarily fertile');
    expect(html).not.toContain('most sophisticated');
    expect(html).toContain('about 70 times more charcoal (Glaser, Philosophical Transactions B 2007)');
    expect(src()).toContain('doi:10.1098/rstb.2006.1978');
  });

  it('drops the unsourced Ojibwe birch-bark claim', () => {
    const html = render({ tab: 'indigenous', selectedNation: 'ojibwe' });
    expect(html).not.toContain('superior bark');
    expect(html).not.toContain('birch bark quality');
    expect(html).toContain('seeds in fast after wildfire (US Forest Service Fire Effects Information System)');
    expect(html).toContain('made surface fires more frequent (Kipfmueller and others 2021)');
  });

  it('replaces the whole-valley Kalapuya claim with Boyd 1999', () => {
    const html = render({ tab: 'indigenous', selectedNation: 'coast_salish' });
    expect(html).not.toContain('entire Willamette Valley');
    expect(html).toContain('led by a hunt leader (Boyd 1999)');
  });
});

describe('phone layouts', () => {
  it('gives the case-study timeline a 340-unit phone layout with every case numbered', () => {
    const html = render({ tab: 'caseStudies' });
    expect(html).toContain('data-fe-case-timeline="5"');
    expect(html).toContain('data-fe-case-timeline-narrow="5"');
    const at = html.indexOf('data-fe-case-timeline-narrow');
    const svg = html.slice(at, html.indexOf('</svg>', at));
    expect(svg).toContain('viewBox="0 0 340 ');
    for (const name of ['Yellowstone Fires', 'Camp Fire', 'Montecito Debris Flow', 'Australian Black Summer', 'Oregon Labor Day Fires']) {
      expect(svg, name).toContain(name);
    }
    // Numbered badges above the axis sit at least 19 units apart and inside the drawing.
    const badges = [...svg.matchAll(/<circle cx="([\d.]+)" cy="16" r="9.5"/g)].map((m) => Number(m[1]));
    expect(badges.length).toBe(5);
    for (let i = 1; i < badges.length; i++) expect(badges[i] - badges[i - 1]).toBeGreaterThanOrEqual(19);
    expect(Math.min(...badges)).toBeGreaterThanOrEqual(9.5);
    expect(Math.max(...badges)).toBeLessThanOrEqual(340 - 9.5);
    // No text under 12 units in the phone drawing.
    for (const m of svg.matchAll(/font-size="([\d.]+)"/g)) expect(Number(m[1])).toBeGreaterThanOrEqual(12);
  });

  it('gives the four-stage cycle a phone list and swaps it in below 900 px', () => {
    const html = render({ tab: 'indigenous' });
    expect(html).toContain('data-fe-cycle-narrow="4"');
    expect(html).toContain('class="fireecology-cyc-wide"');
    const at = html.indexOf('data-fe-cycle-narrow');
    const list = html.slice(at, html.indexOf('</ol>', at));
    expect((list.match(/<li/g) || []).length).toBe(4);
    for (const m of list.matchAll(/font-size:(\d+)px/g)) expect(Number(m[1])).toBeGreaterThanOrEqual(12);
    expect(src()).toContain('.fireecology-cyc-narrow{display:none;}@media (max-width:900px){.fireecology-cyc-wide{display:none;}.fireecology-cyc-narrow{display:block;}}');
  });

  it('raises the biochar label to 12 px', () => {
    expect(code()).toContain("h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text-soft, #94a3b8)' } }, t('stem.fireecology.biochar_created_1000_yr_storage_v2'");
  });
});

describe('re-worded registered strings use new keys', () => {
  it('gives each changed t() label a new key and drops the old one', () => {
    const s = src();
    for (const [oldK, newK] of [['a_wabanaki_teaching', 'a_wabanaki_teaching_v2'], ['elder_guidance', 'elder_guidance_v2'],
      ['paraphrased_from_documented_wabanaki_s_v2', 'paraphrased_from_documented_wabanaki_s_v3']]) {
      expect(s).toContain("'stem.fireecology." + newK + "'");
      expect(s).not.toContain("'stem.fireecology." + oldK + "'");
    }
  });
});
