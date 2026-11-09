import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// Reading levels, round 27 lane rlG: thirty-five more Species guide passages (diet, habitat,
// behaviour, role and fact) have a simpler version. The text tables (speciesText, marineProfiles)
// get only __alloT, so they read the switch the lab set for this render. Checked here: every pair
// reaches its field in both tables, each key has one call and it is wrapped, the phrases older tests
// pin stay in both versions, the open profile and the look-alike comparison follow the switch, and
// the memoised food web panel follows it for the bumphead parrotfish diet (a food web node).

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const SRC = readFileSync(TOOL, 'utf8');
let loadTool, resetStemLab, React, ReactDOMClient, X, RL;
beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ loadTool, resetStemLab, React, ReactDOMClient } = mod);
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef;
  RL = window.__RR_TEST_EXPORTS__.coralReefRl21;
});
const mounted = [];
afterEach(async () => {
  while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); }
});
async function mount(seed, extra = {}) {
  let data = { coralReef: seed };
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const cfg = window.StemLab._registry.coralReef;
  function Shell() {
    const [toolData, setToolData] = React.useState(data);
    data = toolData;
    return cfg.render({ React, toolData, setToolData, t: (k, f) => f || k, announceToSR() {}, ...extra });
  }
  const out = { host, root, get data() { return data.coralReef; } };
  mounted.push(out);
  await React.act(async () => root.render(React.createElement(Shell)));
  return out;
}
const click = (el) => React.act(async () => { el.click(); await new Promise((r) => setTimeout(r, 5)); });
const has = (el, text) => el.textContent.includes(text);
const EN = new Map();
for (const m of SRC.matchAll(/__alloT\((['"])stem\.coralreef\.([A-Za-z0-9_]+)\1,\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g)) if (!EN.has(m[2])) EN.set(m[2], vm.runInNewContext(m[3]));
const en = (k) => EN.get(k);
const DASH = new RegExp('[' + String.fromCharCode(0x2010) + '-' + String.fromCharCode(0x2015) + String.fromCharCode(0x2212) + ']');

// key -> [table, species id, field]
const GUIDE = {
  dx_lionfish_behavior: ['pr', 'lionfish', 'behavior'], dx_varicose_phyllidia_diet: ['pr', 'varicose_phyllidia', 'diet'],
  dx_bigfin_reef_squid_behavior: ['pr', 'bigfin_reef_squid', 'behavior'], dx_blacktip_reef_shark_behavior: ['pr', 'blacktip_reef_shark', 'behavior'],
  dx_blue_sea_star_habitat: ['pr', 'blue_sea_star', 'habitat'], dx_dusky_farmerfish_habitat: ['pr', 'dusky_farmerfish', 'habitat'],
  dx_goldmouth_sea_squirt_diet: ['pr', 'goldmouth_sea_squirt', 'diet'], sp_day_octopus_fact: ['tx', 'day_octopus', 'fact'],
  sp_humphead_wrasse_role: ['tx', 'humphead_wrasse', 'role'], sp_spotted_seahorse_role: ['tx', 'spotted_seahorse', 'role'],
  dx_banded_pipefish_behavior: ['pr', 'banded_pipefish', 'behavior'], dx_boulder_coral_habitat: ['pr', 'boulder_coral', 'habitat'],
  dx_dusky_farmerfish_behavior: ['pr', 'dusky_farmerfish', 'behavior'], dx_peacock_mantis_shrimp_habitat: ['pr', 'peacock_mantis_shrimp', 'habitat'],
  dx_pipe_organ_coral_habitat: ['pr', 'pipe_organ_coral', 'habitat'], dx_ribbon_eel_behavior: ['pr', 'ribbon_eel', 'behavior'],
  sp_bluespotted_stingray_fact: ['tx', 'bluespotted_stingray', 'fact'], sp_foliose_coral_fact: ['tx', 'foliose_coral', 'fact'],
  sp_orange_cup_coral_fact: ['tx', 'orange_cup_coral', 'fact'], dx_blue_coral_diet: ['pr', 'blue_coral', 'diet'],
  dx_crown_of_thorns_behavior: ['pr', 'crown_of_thorns', 'behavior'], dx_hammer_coral_habitat: ['pr', 'hammer_coral', 'habitat'],
  dx_hawksbill_turtle_diet: ['pr', 'hawksbill_turtle', 'diet'], sp_blue_coral_role: ['tx', 'blue_coral', 'role'],
  sp_galaxy_coral_fact: ['tx', 'galaxy_coral', 'fact'], dx_drupella_snail_behavior: ['pr', 'drupella_snail', 'behavior'],
  dx_feather_duster_worm_diet: ['pr', 'feather_duster_worm', 'diet'], dx_peacock_mantis_shrimp_behavior: ['pr', 'peacock_mantis_shrimp', 'behavior'],
  sp_porcelain_anemone_crab_fact: ['tx', 'porcelain_anemone_crab', 'fact'], sp_threadfin_butterflyfish_fact: ['tx', 'threadfin_butterflyfish', 'fact'],
  dx_bedfords_flatworm_habitat: ['pr', 'bedfords_flatworm', 'habitat'], dx_bumphead_parrotfish_diet: ['pr', 'bumphead_parrotfish', 'diet'],
  dx_cleaner_shrimp_behavior: ['pr', 'cleaner_shrimp', 'behavior'], dx_crown_of_thorns_habitat: ['pr', 'crown_of_thorns', 'habitat'],
  dx_foxface_rabbitfish_behavior: ['pr', 'foxface_rabbitfish', 'behavior'],
};

describe('Species guide simpler words (round 27, lane rlG)', () => {
  it('gives every one of the 35 guide fields its simple text when the switch is on, and the full text when off', () => {
    expect(Object.keys(GUIDE)).toHaveLength(35);
    const t = (k, f) => f;
    const before = RL.now.on;
    try {
      for (const on of [false, true]) {
        RL.now.on = on;
        const TX = X.speciesText(t), PR = X.marineProfiles(t);
        for (const [key, [table, id, field]] of Object.entries(GUIDE)) {
          const want = en(on ? key + '_simple' : key);
          expect(typeof want, key + (on ? '_simple' : '') + ' English').toBe('string');
          expect((table === 'tx' ? TX : PR)[id][field], key + ' on=' + on).toBe(want);
        }
      }
    } finally { RL.now.on = before; }
  });

  it('wraps the one call of each key in rl21Text', () => {
    for (const key of Object.keys(GUIDE)) {
      const all = SRC.match(new RegExp("__alloT\\((['\"])stem\\.coralreef\\." + key + "\\1", 'g')) || [];
      const wrapped = SRC.match(new RegExp("rl21Text\\(null, __alloT\\('stem\\.coralreef\\." + key + "'", 'g')) || [];
      expect(all.length, key).toBe(1);
      expect(wrapped.length, key + ' wrapped').toBe(1);
    }
  });

  it('keeps the phrases older guide tests pin in both versions', () => {
    const pins = [['dx_lionfish_behavior', /not an exclusively nocturnal/], ['sp_day_octopus_fact', /Red Sea study/],
      ['sp_threadfin_butterflyfish_fact', /Red Sea individuals lack/], ['sp_porcelain_anemone_crab_fact', /fans are bristly mouthparts/],
      ['sp_porcelain_anemone_crab_fact', /bristly mouthparts.*compound eyes.*ommatidia/], ['dx_goldmouth_sea_squirt_diet', /filtering pharynx/],
      ['dx_hammer_coral_habitat', /0 to 40 m/], ['sp_blue_coral_role', /octocoral.*only octocoral known to build a massive skeleton/],
      ['dx_foxface_rabbitfish_behavior', /80 out of every 100 adults were in pairs/], ['dx_drupella_snail_behavior', /Ningaloo.*still working out/],
      ['dx_dusky_farmerfish_behavior', /corals growing inside the territory are protected/], ['sp_galaxy_coral_fact', /sweeper tentacles, up to 30 times longer/],
      ['dx_hawksbill_turtle_diet', /varies by place.*Hawaiian/], ['sp_orange_cup_coral_fact', /no photosynthetic algae/],
      // Numbers, names and hedges this lane keeps on purpose.
      ['dx_pipe_organ_coral_habitat', /about 3 to 15 m deep/], ['dx_dusky_farmerfish_habitat', /about 1 to 12 m deep/],
      ['sp_bluespotted_stingray_fact', /2016.*Taeniura lessoni/], ['dx_varicose_phyllidia_diet', /Axinyssa cf\. aculeata/],
      ['dx_bedfords_flatworm_habitat', /Great Barrier Reef, Papua New Guinea, Indonesia and Guam/], ['sp_humphead_wrasse_role', /one of the few predators/],
      ['dx_blacktip_reef_shark_behavior', /may nip/], ['dx_drupella_snail_behavior', /up to 75 percent/]];
    for (const [key, re] of pins) for (const k of [key, key + '_simple']) expect(re.test(en(k)), k + ' ' + re).toBe(true);
    // The search reading test counts 'filtering pharynx' once on the sea squirt card.
    for (const k of ['dx_goldmouth_sea_squirt_diet', 'dx_goldmouth_sea_squirt_diet_simple']) expect(en(k).match(/filtering pharynx/g)).toHaveLength(1);
    // The day octopus review keeps out 'keep them in line'; the sr23 search test expects only the crown-of-thorns diet to hold these words.
    for (const k of ['sp_day_octopus_fact', 'sp_day_octopus_fact_simple']) expect(en(k)).not.toMatch(/keep them in line/);
    for (const k of ['dx_crown_of_thorns_behavior', 'dx_crown_of_thorns_habitat']) for (const v of [k, k + '_simple']) expect(en(v), v).not.toMatch(/everted|inspected|stomach/i);
    // The simple texts follow the guide's own text rules: no special dashes, no double spaces, long enough for the profile tests.
    for (const key of Object.keys(GUIDE)) {
      const s = en(key + '_simple');
      expect(DASH.test(s), key + ' dash').toBe(false);
      expect(/\s{2}/.test(s), key + ' spaces').toBe(false);
      expect(s.length, key + ' length').toBeGreaterThan(60);
    }
  });

  it('swaps the open dusky farmerfish profile text when the switch changes, and keeps the profile open', async () => {
    const t = await mount({ section: 'guide' }, { gradeLevel: '8th Grade' });
    await click(t.host.querySelector('[data-open-profile="dusky_farmerfish"]'));
    const profile = () => t.host.querySelector('[data-marine-profile="dusky_farmerfish"]');
    expect(profile()).not.toBe(null);
    const keys = ['dx_dusky_farmerfish_habitat', 'dx_dusky_farmerfish_behavior'];
    for (const k of keys) expect(has(profile(), en(k)), k + ' full').toBe(true);
    await click(profile().querySelector('input[data-rl21-switch]'));
    expect(profile()).not.toBe(null);
    for (const k of keys) { expect(has(profile(), en(k + '_simple')), k + ' simple').toBe(true); expect(has(profile(), en(k)), k + ' full gone').toBe(false); }
    expect(t.data.simpleWords).toBe(true);
  });

  it('shows the simple hammer coral habitat in the look-alike comparison from the bubble coral when the switch is on', async () => {
    const t = await mount({ section: 'guide', simpleWords: true }, { gradeLevel: '8th Grade' });
    await click(t.host.querySelector('[data-open-profile="bubble_coral"]'));
    await click(t.host.querySelector('[data-marine-profile="bubble_coral"] [data-start-comparison]'));
    const box = t.host.querySelector('[data-marine-comparison]');
    expect(box).not.toBe(null);
    expect(box.getAttribute('data-marine-comparison').split(':')).toEqual(expect.arrayContaining(['bubble_coral', 'hammer_coral']));
    expect(has(box, en('dx_hammer_coral_habitat_simple'))).toBe(true);
    expect(has(box, en('dx_hammer_coral_habitat'))).toBe(false);
  });

  it('updates the food web diet panel for the bumphead parrotfish when the switch changes (its profiles are memoised)', async () => {
    const t = await mount({ section: 'science', sciTopic: 'web', sciWeb: { sel: 'bumphead_parrotfish' } }, { gradeLevel: '8th Grade' });
    const panel = () => t.host.querySelector('[data-fw-panel="bumphead_parrotfish"]');
    expect(panel()).not.toBe(null);
    expect(has(panel(), en('dx_bumphead_parrotfish_diet'))).toBe(true);
    await click(t.host.querySelector('input[data-rl21-switch]'));
    expect(t.data.simpleWords).toBe(true);
    expect(has(panel(), en('dx_bumphead_parrotfish_diet_simple'))).toBe(true);
    expect(has(panel(), en('dx_bumphead_parrotfish_diet'))).toBe(false);
  });
});
