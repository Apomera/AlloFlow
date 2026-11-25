// Fire Ecology, sports-labs pass round 3 (2026-11-23): claims with no primary source found are removed or
// reworded to what a source supports (sources sit in code comments next to each string), a quotation with no
// source is no longer shown as a quotation, re-worded registered strings carry new _v2 keys, and the
// deep-time chart gets a phone layout that fits at 390 px.
// Fail-first: FE_FILE=C:/tmp/sports_labs_1123/fireecology/start_r3.js runs every block against the round-3
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

describe('Indigenous fire nations', () => {
  it('states the Martu history from the studies instead of an unsourced quotation', () => {
    const html = render({ tab: 'indigenous', selectedNation: 'martu' });
    expect(html).not.toContain('fire regime broke down');
    expect(html).not.toContain('Martu elders say');
    expect(html).toContain('1950s and 1960s');
    expect(html).toContain('four huge fires that had burned most of the area (Burrows and others 2006)');
    expect(html).toContain('(Bliege Bird and others 2012)');
    expect(html).toContain('Crabtree and others 2019');
  });

  it('matches the Sami wording and citation to Cogos and others 2019', () => {
    const html = render({ tab: 'indigenous', selectedNation: 'sami' });
    expect(html).toContain('little is known about the past relationship between Sami livelihoods and fire (Cogos and others, Human Ecology 2019)');
    expect(html).toContain('about 30 to 40 years after a fire');
    expect(html).not.toContain('has not been documented');
    expect(html).not.toContain('Cogos and others, 2021');
    expect(html).not.toContain('came to fear fire');
    const grid = render({ tab: 'indigenous' });
    expect(grid).toContain('little is known about how herders used fire in the past');
  });

  it('opens the tab with a supportable, sourced intro', () => {
    const html = render({ tab: 'indigenous' });
    expect(html).not.toContain('only now beginning to understand');
    expect(html).not.toContain('always known');
    expect(html).toContain('work with Indigenous fire practitioners');
    expect(html).toContain('(Lake and others, Journal of Forestry 2017)');
    expect(html).toContain('too little of the right kind of fire');
    expect(html).not.toContain('the absence of fire is.');
  });

  it('drops the unsourced Willamette quotation', () => {
    const html = render({ tab: 'indigenous', selectedNation: 'coast_salish' });
    expect(html).not.toContain('natural paradise');
    expect(html).toContain('Written accounts from 1826 to 1847 describe Kalapuya fires');
  });
});

describe('ecosystems and case studies', () => {
  it('rewrites the ecosystems intro without the unsourced superlatives', () => {
    const html = render({ tab: 'ecosystems' });
    expect(html).not.toContain('most biodiverse');
    expect(html).not.toContain('cannot survive without it');
    expect(html).not.toContain('as essential as rain');
    expect(html).toContain('more than 30 plant species in one square meter (University of Wisconsin');
  });

  it('no longer says every case is a century of banked fuel', () => {
    const html = render({ tab: 'caseStudies' });
    expect(html).toContain('data-fe-case-timeline="5"');
    expect(html).not.toContain('banked fuel');
    expect(html).toContain('A handful of cases cannot show a trend by itself');
    expect(html).toContain('(Abatzoglou and Williams, PNAS 2016)');
  });

  it('keeps the eucalyptus summary in step with its own "still debated" note', () => {
    const html = render({ tab: 'ecosystems', selectedEcosystem: 'eucalyptus' });
    expect(html).not.toContain('evolutionary strategy to eliminate competitors');
    // Round 10 cut the unsourced evolution hypothesis (and its "still debated" hedge); the card now cites Zimmer 2021.
    expect(html).not.toContain('still debated');
    expect(html).toContain('(Zimmer and others 2021)');
    expect(html).toContain('(about 100 m)');
  });
});

describe('the whole-file scan', () => {
  // Each of these was a number or historical claim with no source found; each is gone from shipped code.
  const REMOVED = [
    '2-3 year cycle', '3-5 year rotation', 'cranberry barrens', 'within 2 weeks', '(100m+)', '1000+ yr storage',
    'For over a century, Western governments', 'heat alone', '5+ years without fire', 'release the seeds',
    '3 to 5 year cycle', 'every 20 to 30 years', '50 to 80 years', '30 to 60 hours', 'organizations like Wabanaki Public Health',
    'first land taken', 'masting tree', 'southward push of red oak', 'oldest living cultures', 'oldest continuous cultures',
    'Annual fires maintain', 'greatest concentrations of large mammals', 'largest terrestrial biome',
    'for thousands of years to maintain the blueberry', 'same 2-year burn cycle', 'safe-burn window',
    'beyond any species', 'Soil sterilized to depth'
  ];
  it('removes each unsourced claim', () => {
    const c = code();
    for (const s of REMOVED) expect(c, s).not.toContain(s);
  });

  it('carries a source comment for each rewritten claim', () => {
    const s = src();
    for (const ref of ['doi:10.1073/pnas.1204585109', 'doi:10.1007/s10745-019-0053-z', 'doi:10.5849/jof.2016-043R2',
      'doi:10.1073/pnas.1607171113', 'news.wisc.edu/seed-strategy-can-help-restore-a-biodiversity-hotspot',
      'Earth Syst. Sci. Data 11:529-552', 'Science 305:977', 'GCB Bioenergy 8:512-523', 'extension.umaine.edu/blueberries/about',
      'The First Century (FS-650)', 'Indians, Fire and the Land in the Pacific Northwest']) {
      expect(s, ref).toContain(ref);
    }
  });

  it('shows the 1990 smoke discovery before the 2004 chemical', () => {
    const html = render({ tab: 'smokeSeeds' });
    expect(html).toContain('In 1990, scientists in South Africa showed that smoke alone');
    expect(html).toContain('(Flematti and others, Science 2004)');
  });
});

describe('re-worded registered strings use new keys', () => {
  it('gives each changed t() string a _v2 key and drops the old key', () => {
    const s = src();
    for (const k of ['for_tens_of_thousands_of_years_indigen', 'fire_is_not_the_enemy_of_healthy_ecosy',
      'many_of_earth_s_most_biodiverse_ecosys', 'they_evolved_with_fire_and_cannot_surv', 'biochar_created_1000_yr_storage']) {
      expect(s).toContain("'stem.fireecology." + k + "_v2'");
      expect(s).not.toContain("'stem.fireecology." + k + "'");
    }
  });
});

describe('deep-time chart on a phone', () => {
  it('adds a 340-unit phone layout beside the unchanged desktop chart, inside one scroll region', () => {
    const html = render({ tab: 'indigenous' });
    expect(html).toContain('data-fe-deeptime="6"');
    expect(html).toContain('data-fe-deeptime-narrow="6"');
    expect(html).toContain('class="fireecology-dt-wide"');
    expect(html).toContain('class="fireecology-dt-narrow"');
    expect(html).toContain('viewBox="0 0 340 ');
    expect(html).toContain('>Plains Nations<');
    expect(html).toContain('years ago (each line is 10 times older)');
    const block = html.slice(html.indexOf('data-fe-deeptime="6"'));
    const region = block.slice(0, block.indexOf('</svg></div></div>') + 1);
    expect((region.match(/role="region"/g) || []).length).toBe(1);
    // the card keeps the full name
    expect(html).toContain('Blackfeet, Lakota, Comanche &amp; Plains Nations');
  });

  it('switches layouts by viewport width in the tool stylesheet', () => {
    const style = document.getElementById('fire-ecology-workspace-css');
    expect(style && style.textContent).toContain('@media (max-width:560px){.fireecology-dt-wide{display:none;}.fireecology-dt-narrow{display:block;}}');
  });
});
