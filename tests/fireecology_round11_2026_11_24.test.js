// Fire Ecology, sports-labs pass round 11 (2026-11-24): close the round-10 LATER list.
// 1. Named claims: Plains "untouched wilderness" framing, Maori forest clearance (McWethy 2010; Te Ara), Coast Salish
//    plant chips (Boyd 1999), watershed cards (DeBano 2000), the hydrophobic-soil quiz, fuel classes (NWCG PMS 205),
//    succession stage years, the carbon cards (this tool's own Carbon Calculator), the burn-plan ranges (labelled as this
//    sim's classroom ranges) and the Wabanaki mosaic zone texts (each fire interval labelled as the sim's own).
// 2. Phones: the watershed, beaver and fire-behavior drawings keep their labels out of the shrunken SVG (HTML text
//    instead), and the selected fire-behavior button reads on light and dark.
// 3. Watershed: the prediction now comes before the cards and the table that hold its answer.
// Fail-first: FE_FILE=C:/tmp/sports_labs_1123/fireecology/start_r10.js runs every block against the round-10 copy.
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
const code = () => src().split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
// A failing toContain on the whole 9,000-line source prints (and diffs) all of it; report just the needle instead.
const expectIn = (hay, needle) => expect(hay.includes(needle), 'missing: ' + needle).toBe(true);
const expectOut = (hay, needle) => expect(hay.includes(needle), 'still present: ' + needle).toBe(false);
const unesc = (s) => s.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const nation = (id) => unesc(render({ tab: 'indigenous', selectedNation: id }));
const science = (id, extra = {}, ctx) => unesc(render(Object.assign({ tab: 'science', selectedScience: id }, extra), ctx));
const practices = (html) => {
  const at = html.indexOf('Key Practices');
  const end = html.indexOf('Fire-Managed Plants', at);
  return [...html.slice(at, end).matchAll(/\u2022<\/span><span>([^<]+)<\/span>/g)].map((m) => m[1]);
};
// Pull a top-level `var NAME = ...;` data block out of the source and evaluate it (data only, no functions needed).
const dataBlock = (name, endMarker) => {
  const s = src();
  const a = s.indexOf('var ' + name + ' = ');
  const b = s.indexOf(endMarker, a);
  expect(a, name).toBeGreaterThan(-1);
  expect(b, name + ' end').toBeGreaterThan(a);
  return new Function(s.slice(a, b) + '\nreturn ' + name + ';')();
};
const lum = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const l = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * l((n >> 16) & 255) + 0.7152 * l((n >> 8) & 255) + 0.0722 * l(n & 255);
};
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

describe('named claims follow their sources', () => {
  it('Plains: no "untouched wilderness" framing; cites Roos and others 2018', () => {
    const html = nation('plains_nations');
    expect(html).not.toContain('untouched wilderness');
    expect(html).toContain('Indigenous peoples shaped the great grasslands of North America with fire (Roos and others 2018).');
    expect(html).toContain('to draw bison toward hunting grounds');
  });
  it('Maori: forest clearance from McWethy 2010 and Te Ara, no "fernland and grassland"', () => {
    const html = nation('maori_nz');
    for (const gone of ['used fire extensively', 'convert dense forest', 'fernland and grassland', 'Clear forest edges']) expect(html).not.toContain(gone);
    expect(html).toContain('they used fire to clear forest. These forests had little or no history of fire before people came, so the change lasted (McWethy and others 2010).');
    expect(html).toContain('some of them were probably accidental');
    expect(practices(html)).toContain('Use fire to clear forest (McWethy and others 2010)');
    const s = src();
    expectIn(s, '"used fire as a tool for forest clearance"');
    expectIn(s, '"The fires caused widespread deforestation in the South Island east of the main');
  });
  it('Coast Salish: every plant chip ties to a Boyd 1999 / FEIS source note', () => {
    const html = nation('coast_salish');
    for (const p of ['Camas lily (staple food)', 'Garry oak', 'Salal', 'Huckleberry', 'Bracken fern']) expect(html).toContain(p);
    const s = src();
    expectIn(s, "Round 11: each chip ties to this card's sources.");
    expectIn(s, 'the generation of which\n      // was favored by burning');
  });
  it('watershed cards: DeBano 2000 mechanism; no "prevents this chain", water-holes or "waxy" lines', () => {
    const html = unesc(render({ tab: 'watershed' }));
    for (const gone of ['Counterintuitively', 'one of the best ways to protect clean water', 'prevents this chain of events', 'water holes',
      'waxy', 'Many Indigenous cultures connect', 'catastrophic surface runoff', 'Indigenous fire keepers understood']) expect(html).not.toContain(gone);
    expect(html).toContain('The gas moves down into the cooler soil and condenses there');
    expect(html).toContain('The effect is strongest in the first year after the fire (DeBano 2000, US Forest Service).');
    expect(html).toContain('Indigenous rangers care for important desert waterholes and also burn to keep their Country healthy');
    const s = src();
    expectIn(s, '"Hydrophobic organic compounds found in plant litter are vaporized\n    // during wildfires');
    expect(s.includes('which are important desert waterholes"')).toBe(true);
  });
  it('hydrophobic-soil quiz explanation follows DeBano 2000', () => {
    const q = window.StemLab._registry.fireEcology.model.quiz.find((x) => x.q === 'What is a hydrophobic soil layer?');
    expect(q.why).not.toContain('waxy');
    expect(q.why).toContain('condenses in the cooler soil just below the surface');
    expect(q.why).toContain('(DeBano 2000)');
  });
  it('fuel classes use the NWCG PMS 205 sizes and timelag meaning', () => {
    const html = science('fuelMoisture');
    for (const gone of ['Primary carrier of surface fire', 'Logs > 3 inches', 'Cultural burning rarely consumes', 'complicate control']) expect(html).not.toContain(gone);
    expect(html).toContain('less than about 1/4 inch thick, plus the top layer of leaves or needles on the ground (NWCG)');
    expect(html).toContain('Dead sticks 1/4 to 1 inch thick');
    expect(html).toContain('Dead branches 1 to 3 inches thick');
    expect(html).toContain('Dead logs 3 to 8 inches thick');
    expect(html).toContain('about 63 percent');
    expectIn(src(), '"Time needed under specified conditions for a fuel particle to lose about 63 percent of');
  });
  it('succession stages carry no year ranges or unsourced peaks', () => {
    const html = science('succession');
    for (const gone of ['0\u20132 years', '3\u201310 years', '10\u201350 years', '50\u2013200+ years', 'Berry production peaks', 'browse heavily', '\u201Cstuck\u201D', 'eliminates understory']) expect(html).not.toContain(gone);
    expect(html).toContain('no fixed number of years');
    expect(html).toContain('Stage 1: Pioneer plants');
  });
  it('carbon cards agree with the Carbon Calculator model and drop "massive" / "near carbon-neutral"', () => {
    const html = science('carbonCycle');
    for (const gone of ['massive carbon release', 'near carbon-neutral', 'sterilize soil microbes', 'ancient carbon']) expect(html).not.toContain(gone);
    const CD = dataBlock('CARBON_DATA', '// Car comparison');
    expect(CD.culturalBurn.netCarbon10yr).toBeLessThan(0);
    expect(CD.wildfire.netCarbon10yr).toBeGreaterThan(CD.prescribedBurn.netCarbon10yr);
    expect(html).toContain('a cultural burn comes out as a small carbon sink over 10 years');
    expect(html).toContain('it is a large carbon source over 10 years');
    expect(CD.culturalBurn.description).toContain('a small carbon sink');
    expect(CD.wildfire.description).toContain('a large carbon source');
  });
  it('burn-plan ranges are labelled as this sim\u2019s classroom ranges, not "ideal"', () => {
    const shown = unesc(render({ tab: 'burnPlan', burnRevealed: true }));
    expect(shown).toContain('This sim\u2019s classroom ranges (real burn plans set their own for each place):');
    expect(shown).toContain('Humidity: 30 to 55 percent');
    expect(shown).not.toContain('Ideal Humidity');
    const hidden = unesc(render({ tab: 'burnPlan' }));
    expect(hidden).toContain('This sim\u2019s classroom ranges are hidden until your first evaluation.');
    const c = code();
    expect(/in ideal range|not ideal|'Ideal /.test(c)).toBe(false);
    expectIn(c, "'stem.fireecology.ideal_humidity_30_to_55_percent_v2'");
  });
});

describe('Wabanaki mosaic zones say which numbers are the sim\u2019s own', () => {
  const ZONES = () => dataBlock('WABANAKI_ZONES', '  var MOSAIC_TECHNIQUES');
  it('every zone description names its model fire interval, under a new _desc_v2 key', () => {
    const zones = ZONES();
    expect(zones).toHaveLength(7);
    const html = unesc(render({ tab: 'mosaic' }));
    for (const z of zones) {
      expect(z.descKey, z.id).toBe(z.id + '_desc_v2');
      expect(z.desc, z.id).toContain('In this sim');
      if (z.fireReturn >= 50) expect(z.desc, z.id).toContain('never comes due for fire');
      else expect(z.desc, z.id).toContain('every ' + z.fireReturn + ' years');
      expect(html, z.id).toContain(z.desc);
      expect(html).toContain('data-fe-zone-return="' + z.id + '"');
    }
    expect(html).toContain('Fire return in this sim: never comes due');
    expect(html).toContain('Fire return in this sim: every 2 years');
    expect(html).not.toContain('Fire return: almost never');
    expect(html).toContain('In this sim, the blueberry barren comes due for fire every 2 years; the riparian corridor never does.');
    expect(html).toContain('Steward a model of a Maine territory across 8 years.');
    expect(html).toContain('zones, each with its own habitat and its own fire-return interval in this sim.');
    // The old keys are registered in ui_strings.js with "riparian almost never" / "its own cultural use", and a
    // registered value wins over the fallback, so the new wording needs new keys.
    const c = code();
    expectIn(c, "'stem.fireecology.a_real_indigenous_approach_is_patchwor_v2'");
    expectIn(c, "'stem.fireecology.your_land_is_divided_into_5_zones_each_v2'");
    expectOut(c, "'stem.fireecology.a_real_indigenous_approach_is_patchwor'");
  });
  it('drops the unsourced zone details and keeps the sourced ones', () => {
    const c = code();
    for (const gone of ['Almost never burned', 'frost-protect', 'single human lifetime', 'once-a-century', 'leached in days',
      'stubble each spring', 'Sun-dried into raisins', 'Burns once a generation', 'glacial outwash', 'white flint',
      'Tree felled in winter', 'budworm', 'agricultural drainage', 'Pine pitch (resin) was collected']) expectOut(c, gone);
    const zones = ZONES();
    const byId = Object.fromEntries(zones.map((z) => [z.id, z]));
    expect(byId.hardwoodStand.deepDive.knowledge).toContain('fine splints for fancy baskets, thicker ones for work baskets (Hood Museum of Art)');
    expect(byId.riparian.deepDive.preparation).toBe('Sweetgrass for Wabanaki baskets is collected from saltwater marshes, dried, and often braided (Hood Museum of Art).');
    expect(byId.whitePineGrove.deepDive.knowledge).toContain('low-severity fires came about every 36 years on average');
    const s = src();
    expectIn(s, '"Mature trees survive\n  // most surface fires because they have thick bark, branch-free boles"');
    expectIn(s, '"It is collected from saltwater marshes, dried, and often braided"');
  });
  it('a deep dive with no sourced use or modern note shows no empty box', () => {
    const oak = unesc(render({ tab: 'mosaic', mosaic: { deepDiveZone: 'oakSavanna' } }));
    expect(oak).toContain('White oak bark grows thicker with age');
    expect(oak).not.toContain('Traditional use and preparation');
    expect(oak).not.toContain('Modern context');
    const rip = unesc(render({ tab: 'mosaic', mosaic: { deepDiveZone: 'riparian' } }));
    expect(rip).toContain('Traditional use and preparation');
    expect(rip).toContain('collected from saltwater marshes');
  });
});

describe('phone layouts keep drawing labels at readable sizes', () => {
  const svgs = (html) => [...html.matchAll(/<svg[\s\S]*?<\/svg>/g)].map((m) => m[0]);
  it('watershed: stacked phone slopes with HTML captions; the wide drawing hides below 900 px', () => {
    const html = unesc(render({ tab: 'watershed' }));
    expect(html).toContain('data-fe-watershed-narrow="2"');
    expect(html).toContain('data-fe-watershed-slope="cultural"');
    expect(html).toContain('data-fe-watershed-slope="burned"');
    expect(html).toMatch(/class="fireecology-cyc-wide"><div[^>]*data-fe-watershed-diagram="true"/);
    const at = html.indexOf('data-fe-watershed-narrow');
    const narrow = html.slice(at, html.indexOf('data-fe-water-predict', at));
    const phoneSvgs = svgs(narrow);
    expect(phoneSvgs).toHaveLength(2);
    for (const sv of phoneSvgs) { expect(sv).not.toContain('<text'); expect(sv).toContain('aria-hidden="true"'); }
    expect(narrow).toContain('Rain SOAKS IN \u2192 litter, roots, open soil.');
    expect(narrow).toContain('Rain RUNS OFF \u2192 flash flood, debris flow.');
    expect(narrow).toContain('A water-repellent (hydrophobic) layer sits just under the surface.');
    expect(narrow).toMatch(/font-size:14px/);
  });
  it('beaver valley: every SVG word label is wide-only, the emoji grow on phones, an HTML legend shows instead', () => {
    for (const dam of [true, false]) {
      const html = unesc(render({ tab: 'beavers', beaverDam: dam }));
      const at = html.indexOf('data-fe-beaver-valley');
      const svg = svgs(html.slice(at))[0];
      const texts = [...svg.matchAll(/<text([^>]*)>([^<]*)<\/text>/g)];
      expect(texts.length).toBeGreaterThan(3);
      for (const [, attrs, body] of texts) {
        if (/^[\uD83D\uD83E]/.test(body)) expect(attrs).toContain('fireecology-svg-emoji-lg');
        else expect(attrs, body).toContain('class="fireecology-cyc-wide"');
      }
      expect(html).toContain('data-fe-beaver-legend="' + (dam ? 'dammed' : 'undammed') + '"');
      expect(html).toContain('Dashed blue line: the water table.');
      expect(html).toMatch(/data-fe-beaver-toggle="dammed"[^>]*min-height:44px/);
    }
    expectIn(src(), "'@media (max-width:900px){.fireecology-svg-emoji-lg{font-size:54px;}}',");
  });
  it('fire behavior: the label moves to HTML on phones, in US spelling', () => {
    for (const [zone, band, label] of [['Ground Fire', 'duff', 'smoldering below the surface'], ['Surface Fire', 'surface', 'flames knee-high in the litter'], ['Crown Fire', 'crown', 'fire in the canopy, carried up the shrub ladder']]) {
      const html = unesc(science('fireBehavior', { behaviorZone: zone }));
      expect(html).toContain('data-fe-behavior-label="' + band + '"');
      const at = html.indexOf('data-fe-behavior-diagram');
      const svg = svgs(html.slice(at))[0];
      expect(svg).toMatch(new RegExp('<text[^>]*class="fireecology-cyc-wide"[^>]*>' + label + '</text>'));
      expect(html).toMatch(new RegExp('data-fe-behavior-label="' + band + '"[^>]*>' + label + '<'));
    }
    expect(/smoulder/.test(code())).toBe(false);
    // No source ties ground fires to how terra preta was made (Glaser 2007: charcoal added "by chance or intentionally").
    expect(science('fireBehavior')).not.toContain('Used by Amazonian peoples to create biochar');
  });
  it('selected fire-behavior button: themed text, 2 px border at 4.5:1 on light and dark panels, 44 px', () => {
    for (const isDark of [false, true]) {
      const html = science('fireBehavior', { behaviorZone: 'Crown Fire' }, { isDark });
      const m = html.match(/<button[^>]*aria-pressed="true"[^>]*data-fe-behavior-zone="crown"[^>]*style="([^"]*)"/);
      expect(m, 'pressed crown button').toBeTruthy();
      const style = m[1];
      expect(style).not.toContain('#fdba74');
      expect(style).toContain('color:var(--allo-stem-text, #e2e8f0)');
      expect(style).toContain('min-height:44px');
      const bd = style.match(/border:2px solid (#[0-9a-f]{6})/);
      expect(bd, 'border color').toBeTruthy();
      expect(ratio(bd[1], isDark ? '#1e293b' : '#e2e8f0')).toBeGreaterThanOrEqual(4.5);
      expect(ratio(bd[1], isDark ? '#1e293b' : '#ffffff')).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('watershed prediction comes before its answer', () => {
  it('asks first and holds the sediment answer back until a pick', () => {
    const html = unesc(render({ tab: 'watershed' }));
    const ask = html.indexOf('data-fe-water-predict="none"');
    expect(ask).toBeGreaterThan(-1);
    expect(ask).toBeLessThan(html.indexOf('Hydrophobic Soil Layer'));
    expect(html).not.toContain('Many times higher for a few years');
    expect(html).not.toContain('rise many times over');
    expect(html).toContain('data-fe-water-sediment="hidden"');
    const after = unesc(render({ tab: 'watershed', waterPredict: 'twice' }));
    expect(after).toContain('data-fe-water-sediment="shown"');
    expect(after).toContain('Many times higher for a few years');
    expect(after).toContain('It is bigger than that.');
    expect(after).toContain('(DeBano 2000)');
  });
});
