// Fire Ecology, sports-labs pass round 8 (2026-11-24): final source pass.
// 1. Plains and San cards keep only key practices a source supports (Roos and others 2018 PNAS; Humphrey 2018 UCT
//    thesis); Hoodia and "(appetite suppressant)" leave the San plant list; the Plains legacy drops "millions of acres"
//    and "practiced for millennia" and cites the National Park Service.
// 2. Longleaf legacy follows the US Fish and Wildlife Service fact sheet; tallgrass "primary force", boreal "primary
//    agent", giant sequoia "cannot reproduce without fire" / "only fire", and the morel "mycorrhizal networks" lines are
//    reworded to NPS / FEIS / USDA Forest Service sources; the Kalapuya Garry oak practice cites FEIS.
// 3. Scan follow-up: fireweed, grass tree, the Oklahoma red cedar rate, and Montecito / Yellowstone numbers.
// Fail-first: FE_FILE=C:/tmp/sports_labs_1123/fireecology/start_r7.js runs every block against the round-7 copy.
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
const unesc = (s) => s.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const nation = (id) => unesc(render({ tab: 'indigenous', selectedNation: id }));
const eco = (id) => unesc(render({ tab: 'ecosystems', selectedEcosystem: id }));
// The key-practice bullets of the open nation card, in order.
const practices = (html) => {
  const at = html.indexOf('Key Practices');
  expect(at, 'Key Practices heading').toBeGreaterThan(-1);
  const end = html.indexOf('Fire-Managed Plants', at);
  return [...html.slice(at, end).matchAll(/\u2022<\/span><span>([^<]+)<\/span>/g)].map((m) => m[1]);
};

describe('Plains card keeps only practices Roos and others 2018 supports', () => {
  it('drops signal fires, ring fires, rotation burns and the thatch / funnel lines', () => {
    const html = nation('plains_nations');
    for (const gone of ['Signal fires', 'Ring fires', 'Rotation burns', 'clear dead thatch', 'funnel bison herds']) {
      expect(html).not.toContain(gone);
    }
    const p = practices(html);
    expect(p).toHaveLength(2);
    expect(p[0]).toContain('Burn in spring for a fall hunt, or in fall for a spring hunt');
    expect(p[0]).toContain('Lightning fires came mostly in summer (Roos and others 2018)');
    expect(p[1]).toContain('near the start of bison drive lines');
    expect(p[1]).toContain('more likely than using fire to start the drive itself (Roos and others 2018)');
    // The description agrees with that practice: fire drew bison in, it did not drive them.
    expect(html).toContain('to draw bison toward hunting grounds');
    expect(html).not.toContain('to drive bison toward hunting grounds');
  });
  it('legacy drops "millions of acres" and "practiced for millennia" and cites NPS', () => {
    const html = nation('plains_nations');
    expect(html).not.toContain('woody encroachment across millions of acres');
    expect(html).not.toContain('practiced for millennia');
    expect(html).toContain('fewer than 1,000 animals, a loss that devastated Plains nations (National Park Service)');
    expect(html).toContain('shrubs, trees, and non-native grasses take over (National Park Service)');
    expect(html).toContain('Tallgrass Prairie National Preserve in Kansas uses prescribed fire to hold back woody plants');
  });
  it('keeps the source quotes in comments', () => {
    const s = src();
    expect(s).toContain('we think it more likely that\n      // strategic grassland burning was used to lure bison');
    expect(s).toContain('to fewer than 1,000 animals by the 1890s');
    expect(s).toContain('If fire was excluded, the tallgrass prairie would');
    expect(s).toContain('control woody\n      // vegetation and promote native plant and animal diversity');
  });
});

describe('San card keeps only practices Humphrey 2018 supports', () => {
  it('drops the unsourced practices and Hoodia', () => {
    const html = nation('san_bushmen');
    for (const gone of ['berry-producing shrublands', 'band territories', 'Burn in strips to drive game', 'late dry season', 'firebreaks around camps', 'Hoodia', 'appetite suppressant']) {
      expect(html).not.toContain(gone);
    }
    const p = practices(html);
    expect(p).toHaveLength(3);
    expect(p[0]).toBe('Burn grass early in the dry season, so a fresh flush of new grass draws game to graze (Humphrey 2018)');
    expect(p[1]).toContain('read animal tracks in the ash (Humphrey 2018)');
    expect(p[2]).toContain('cuts down late-season fires (Bwabwata National Park, Namibia; Humphrey 2018)');
    // Round 10: the four named plants had no source tying them to burning; the chips now follow Humphrey 2018.
    expect(html).not.toContain('Mongongo nut tree');
    expect(html).toContain('Veld foods (wild plant foods)');
  });
  it('quotes the thesis in a comment', () => {
    const s = src();
    expect(s).toContain('stimulating grass growth to attract wildlife to grazing');
    expect(s).toContain('reduced the late season fires');
  });
});

describe('Longleaf, Kalapuya, tallgrass and boreal lines follow their sources', () => {
  it('longleaf legacy follows the US Fish and Wildlife Service fact sheet', () => {
    const html = nation('southeast_nations');
    expect(html).not.toContain('one of the most endangered in North America');
    expect(html).not.toContain('Indigenous-led prescribed burn programs');
    expect(html).not.toContain('structure that Indigenous peoples created');
    expect(html).toContain('More than 30 plants and animals that live in it are threatened or endangered');
    expect(html).toContain('the gopher tortoise (US Fish and Wildlife Service)');
    expect(src()).toContain('Over 30 plant and animal species associated with longleaf');
  });
  it('Kalapuya Garry oak practice carries the FEIS citation', () => {
    const html = nation('coast_salish');
    expect(html).not.toContain('Maintain Garry oak savannas by burning out encroaching Douglas-fir');
    expect(practices(html)).toContain('Keep Garry oak savannas open with frequent fire. When the burning stopped, Willamette Valley oak woodlands turned into Douglas-fir forest (US Forest Service FEIS)');
    expect(src()).toContain('Oregon white oak woodlands became Douglas-fir-dominated forests');
  });
  it('tallgrass card drops "primary force" and cites NPS', () => {
    const html = eco('tallgrass');
    expect(html).not.toContain('Fire was the primary force');
    expect(html).toContain('Tallgrass prairie depends on fire: without it, shrubs and trees take over (National Park Service).');
  });
  it('boreal card drops "primary agent" and lynx, and cites NPS', () => {
    const html = eco('boreal');
    expect(html).not.toContain('primary agent of forest renewal');
    expect(html).not.toContain('lynx');
    expect(html).toContain('The largest forest habitat in the world.');
    expect(html).toContain('The older patches matter for caribou and many birds (National Park Service).');
  });
});

describe('giant sequoia: fire greatly helps, it is not the only way', () => {
  it('no shipped line says sequoias cannot reproduce without fire or that only fire supplies soil and light', () => {
    const c = code();
    expect(c).not.toContain('cannot reproduce without fire');
    expect(c).not.toContain('only fire provides');
    expect(c).not.toContain('only fire creates');
    expect(c).not.toContain('Seedlings cannot establish without fire');
    expect(c).toContain('Fire greatly helps giant sequoias start new trees. Its hot air opens old cones, it burns away litter so the tiny seeds land on bare mineral soil, and it clears plants that would shade the seedlings (National Park Service).');
    expect(c).toContain('Without regular fire, litter piles up and few seedlings take hold (US Forest Service FEIS).');
  });
  it('the quiz item is reworded, keeps its misconception notes, and the key is not the longest choice', () => {
    const c = code();
    const q = 'Fire helps giant sequoia seeds mainly because:';
    expect(c.split("'" + q + "'").length - 1).toBe(2); // question + its misconception map
    const line = c.split('\n').find((l) => l.includes("{ q: '" + q));
    const choices = JSON.parse(line.match(/choices: (\[[^\]]+\])/)[1].replace(/'/g, '"'));
    const answer = Number(line.match(/answer: (\d)/)[1]);
    expect(choices[answer]).toBe('It clears litter to bare soil and lets in sunlight');
    expect(Math.max(...choices.map((x) => x.length))).toBeGreaterThan(choices[answer].length);
  });
  it('quotes NPS and FEIS in a comment', () => {
    const s = src();
    expect(s).toContain('When fire burns through the forest the hot air dries out older');
    expect(s).toContain('In the absence of regular ground fires, litter accumulates');
  });
});

describe('morels: no unsourced "mycorrhizal networks" claim', () => {
  it('no shipped line mentions mycorrhizal networks; the fact cites Pilz and others 2007', () => {
    const c = code();
    expect(c).not.toMatch(/mycorrhiz/i);
    expect(c).toContain('often 1,000 or more per acre in the first year. Why fire sets them off is still an open question (US Forest Service, Pilz and others 2007).');
    expect(src()).toContain('it appears common to find 1,000 or more morels per acre the first year after a forest fire');
  });
});

describe('scan follow-up: fireweed, grass tree, red cedar, Montecito, Yellowstone', () => {
  it('fireweed and grass tree lose their unsourced claims', () => {
    const c = code();
    expect(c).not.toContain('colonize burns within weeks');
    expect(c).not.toContain('name reflects its role as the first plant');
    expect(c).not.toContain('Named for being one of the first plants');
    expect(c).not.toContain('One of the most recognizable fire-adapted plants on Earth');
    expect(eco('boreal')).toContain('it often arrives in the first year after a fire (US Forest Service FEIS)');
    expect(src()).toContain('establishes during the first postfire year');
  });
  it('red cedar rate follows the OSU Extension survey, not the 762-acres figure', () => {
    const c = code();
    expect(c).not.toContain('762 acres');
    expect(eco('tallgrass')).toContain('eastern red cedar and ashe juniper spreading over about 280,000 more acres of Oklahoma range and forest each year from 1985 to 1994');
    expect(c).toContain('In that survey, prescribed fire was the tool used most to hold them back.');
    expect(src()).toContain('More land is prescribed burned for control of eastern');
    expect(src()).toContain('was about 280,000 acres per year from 1985 to 1994');
  });
  it('Montecito and Yellowstone numbers name their sources in comments', () => {
    const s = src();
    expect(s).toContain('(including 23 fatalities, at least 167 injuries, and 408 damaged homes)');
    expect(s).toContain('36% (793,880 acres) of the park was');
    expect(s).toContain('Sixty-seven structures were destroyed');
  });
});
