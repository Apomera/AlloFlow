import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// Reading levels, round 25 lane rlC: thirty more Species guide passages (diet, habitat, behaviour,
// role and fact) have a simpler version. The text tables (speciesText, marineProfiles) get only
// __alloT, so they read the switch the lab set for this render. Checked here: every pair reaches its
// field in both tables, each key has one call and it is wrapped, the phrases older tests pin stay in
// both versions, and the open profile, the look-alike comparison and the food web panel (which keeps
// marineProfiles in a useMemo) follow the switch.

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

// key -> [table, species id, field]
const GUIDE = {
  dx_moorish_idol_diet: ['pr', 'moorish_idol', 'diet'], dx_reef_ball_behavior: ['pr', 'reef_ball', 'behavior'],
  sp_reef_ball_fact: ['tx', 'reef_ball', 'fact'], dx_ocellated_eagle_ray_habitat: ['pr', 'ocellated_eagle_ray', 'habitat'],
  dx_blue_green_chromis_habitat: ['pr', 'blue_green_chromis', 'habitat'], dx_ocellated_eagle_ray_diet: ['pr', 'ocellated_eagle_ray', 'diet'],
  dx_sea_cucumber_diet: ['pr', 'sea_cucumber', 'diet'], dx_blue_ringed_octopus_habitat: ['pr', 'blue_ringed_octopus', 'habitat'],
  dx_feather_duster_worm_habitat: ['pr', 'feather_duster_worm', 'habitat'], sp_crown_of_thorns_role: ['tx', 'crown_of_thorns', 'role'],
  sp_giant_clam_role: ['tx', 'giant_clam', 'role'], sp_parrotfish_fact: ['tx', 'parrotfish', 'fact'],
  sp_peacock_grouper_role: ['tx', 'peacock_grouper', 'role'], sp_yellow_boxfish_fact: ['tx', 'yellow_boxfish', 'fact'],
  dx_barrel_sponge_habitat: ['pr', 'barrel_sponge', 'habitat'], dx_coral_tree_nursery_habitat: ['pr', 'coral_tree_nursery', 'habitat'],
  dx_pajama_cardinalfish_habitat: ['pr', 'pajama_cardinalfish', 'habitat'], sp_banggai_cardinalfish_role: ['tx', 'banggai_cardinalfish', 'role'],
  sp_ocellated_eagle_ray_role: ['tx', 'ocellated_eagle_ray', 'role'], sp_porcelain_anemone_crab_role: ['tx', 'porcelain_anemone_crab', 'role'],
  sp_ribbon_eel_role: ['tx', 'ribbon_eel', 'role'], dx_blackspotted_puffer_habitat: ['pr', 'blackspotted_puffer', 'habitat'],
  dx_blue_coral_behavior: ['pr', 'blue_coral', 'behavior'], dx_bluestripe_snapper_behavior: ['pr', 'bluestripe_snapper', 'behavior'],
  dx_dusky_farmerfish_diet: ['pr', 'dusky_farmerfish', 'diet'], dx_green_turtle_habitat: ['pr', 'green_turtle', 'habitat'],
  dx_orange_cup_coral_diet: ['pr', 'orange_cup_coral', 'diet'], dx_spanish_dancer_habitat: ['pr', 'spanish_dancer', 'habitat'],
  dx_white_spotted_hermit_crab_behavior: ['pr', 'white_spotted_hermit_crab', 'behavior'], sp_bennetts_feather_star_role: ['tx', 'bennetts_feather_star', 'role'],
};

describe('Species guide simpler words (round 25, lane rlC)', () => {
  it('gives every one of the 30 guide fields its simple text when the switch is on, and the full text when off', () => {
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
    const pins = [['sp_parrotfish_fact', /community/], ['sp_parrotfish_fact', /several parrotfish species/],
      ['sp_yellow_boxfish_fact', /represents a juvenile.*Ostracion cubicum/], ['dx_white_spotted_hermit_crab_behavior', /walking and retreat.*not animated there/],
      ['dx_blue_coral_behavior', /65%.*30%/], ['sp_crown_of_thorns_role', /native Indo-Pacific/], ['dx_orange_cup_coral_diet', /zooplankton/],
      ['dx_green_turtle_habitat', /seagrass/], ['sp_reef_ball_fact', /help young corals survive or grow better \(Hylkema et al\. 2023\)/],
      ['dx_spanish_dancer_habitat', /1 to 50 m.*10 to 20 m.*night dives/], ['dx_feather_duster_worm_habitat', /3 to 16 m/]];
    for (const [key, re] of pins) for (const k of [key, key + '_simple']) expect(re.test(en(k)), k + ' ' + re).toBe(true);
    // The simple texts follow the guide's own text rules: no special dashes, no double spaces, long enough for the profile tests.
    for (const key of Object.keys(GUIDE)) {
      const s = en(key + '_simple');
      expect(/[‐-―−]/.test(s), key + ' dash').toBe(false);
      expect(/\s{2}/.test(s), key + ' spaces').toBe(false);
      expect(s.length, key + ' length').toBeGreaterThan(60);
    }
  });

  it('swaps the open ocellated eagle ray profile text when the switch changes, and keeps the profile open', async () => {
    const t = await mount({ section: 'guide' }, { gradeLevel: '8th Grade' });
    await click(t.host.querySelector('[data-open-profile="ocellated_eagle_ray"]'));
    const profile = () => t.host.querySelector('[data-marine-profile="ocellated_eagle_ray"]');
    expect(profile()).not.toBe(null);
    const keys = ['sp_ocellated_eagle_ray_role', 'dx_ocellated_eagle_ray_habitat', 'dx_ocellated_eagle_ray_diet'];
    for (const k of keys) expect(has(profile(), en(k)), k + ' full').toBe(true);
    await click(profile().querySelector('input[data-rl21-switch]'));
    expect(profile()).not.toBe(null);
    for (const k of keys) { expect(has(profile(), en(k + '_simple')), k + ' simple').toBe(true); expect(has(profile(), en(k)), k + ' full gone').toBe(false); }
    expect(t.data.simpleWords).toBe(true);
  });

  it('shows the simple habitat in the look-alike comparison when the switch is on', async () => {
    const t = await mount({ section: 'guide', simpleWords: true }, { gradeLevel: '8th Grade' });
    await click(t.host.querySelector('[data-open-profile="spanish_dancer"]'));
    await click(t.host.querySelector('[data-marine-profile="spanish_dancer"] [data-start-comparison]'));
    const box = t.host.querySelector('[data-marine-comparison]');
    expect(box).not.toBe(null);
    expect(box.getAttribute('data-marine-comparison').split(':')).toContain('spanish_dancer');
    expect(has(box, en('dx_spanish_dancer_habitat_simple'))).toBe(true);
    expect(has(box, en('dx_spanish_dancer_habitat'))).toBe(false);
  });

  it('updates the food web diet panel when the switch changes (its profiles are memoised)', async () => {
    const t = await mount({ section: 'science', sciTopic: 'web', sciWeb: { sel: 'dusky_farmerfish' } }, { gradeLevel: '8th Grade' });
    const panel = () => t.host.querySelector('[data-fw-panel="dusky_farmerfish"]');
    expect(panel()).not.toBe(null);
    expect(has(panel(), en('dx_dusky_farmerfish_diet'))).toBe(true);
    await click(t.host.querySelector('input[data-rl21-switch]'));
    expect(t.data.simpleWords).toBe(true);
    expect(has(panel(), en('dx_dusky_farmerfish_diet_simple'))).toBe(true);
    expect(has(panel(), en('dx_dusky_farmerfish_diet'))).toBe(false);
  });
});
