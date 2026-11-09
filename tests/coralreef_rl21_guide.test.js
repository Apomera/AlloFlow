import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// Reading levels phase 2, Species guide (lane p2b). Thirty guide passages have a simpler version.
// The text tables (speciesText, marineProfiles) get only __alloT, so they read the switch the lab
// set for this render. Checked here: every pair reaches its field in both tables, the open profile
// and the look-alike comparison swap when the switch changes, and the food web panel, which keeps
// marineProfiles in a useMemo, follows the switch too.

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
  sp_coral_tree_nursery_fact: ['tx', 'coral_tree_nursery', 'fact'], sp_clownfish_role: ['tx', 'clownfish', 'role'],
  dx_clownfish_habitat: ['pr', 'clownfish', 'habitat'], sp_barrel_sponge_fact: ['tx', 'barrel_sponge', 'fact'],
  sp_bluestripe_snapper_fact: ['tx', 'bluestripe_snapper', 'fact'], sp_peacock_grouper_fact: ['tx', 'peacock_grouper', 'fact'],
  dx_bigfin_reef_squid_habitat: ['pr', 'bigfin_reef_squid', 'habitat'], sp_cauliflower_coral_fact: ['tx', 'cauliflower_coral', 'fact'],
  dx_blacktip_reef_shark_habitat: ['pr', 'blacktip_reef_shark', 'habitat'], dx_crown_of_thorns_diet: ['pr', 'crown_of_thorns', 'diet'],
  sp_soft_coral_fact: ['tx', 'soft_coral', 'fact'], dx_banded_sea_krait_habitat: ['pr', 'banded_sea_krait', 'habitat'],
  sp_regal_angelfish_fact: ['tx', 'regal_angelfish', 'fact'], sp_bluefin_trevally_fact: ['tx', 'bluefin_trevally', 'fact'],
  dx_dash_and_dot_goatfish_habitat: ['pr', 'dash_and_dot_goatfish', 'habitat'], dx_pincushion_sea_star_diet: ['pr', 'pincushion_sea_star', 'diet'],
  sp_magnificent_anemone_fact: ['tx', 'magnificent_anemone', 'fact'], sp_longfin_bannerfish_fact: ['tx', 'longfin_bannerfish', 'fact'],
  sp_staghorn_coral_fact: ['tx', 'staghorn_coral', 'fact'], sp_ocellated_eagle_ray_fact: ['tx', 'ocellated_eagle_ray', 'fact'],
  sp_bigfin_reef_squid_fact: ['tx', 'bigfin_reef_squid', 'fact'], dx_textile_cone_behavior: ['pr', 'textile_cone', 'behavior'],
  dx_clownfish_behavior: ['pr', 'clownfish', 'behavior'], dx_foxface_rabbitfish_habitat: ['pr', 'foxface_rabbitfish', 'habitat'],
  sp_nudibranch_fact: ['tx', 'nudibranch', 'fact'], dx_textile_cone_habitat: ['pr', 'textile_cone', 'habitat'],
  dx_drupella_snail_habitat: ['pr', 'drupella_snail', 'habitat'], sp_cleaner_wrasse_fact: ['tx', 'cleaner_wrasse', 'fact'],
  sp_boulder_coral_fact: ['tx', 'boulder_coral', 'fact'], sp_christmas_tree_worm_fact: ['tx', 'christmas_tree_worm', 'fact'],
};

describe('Species guide simpler words (rl21 phase 2)', () => {
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

  it('keeps the phrases older guide tests pin in both versions', () => {
    const pins = [['sp_peacock_grouper_fact', /1991 Gulf of Aqaba study/], ['sp_peacock_grouper_fact', /not a fixed territory/],
      ['sp_soft_coral_fact', /genus containing many species/], ['sp_longfin_bannerfish_fact', /beyond the corner of the anal fin/],
      ['dx_textile_cone_behavior', /respiration.*proboscis is a separate structure.*not animated/],
      ['sp_christmas_tree_worm_fact', /1996.*Okinawa/], ['sp_christmas_tree_worm_fact', /not the lifespan of every/]];
    for (const [key, re] of pins) for (const k of [key, key + '_simple']) expect(re.test(en(k)), k + ' ' + re).toBe(true);
    // Description search reads the shown text: the clownfish words the search test uses stay findable.
    for (const k of ['dx_clownfish_habitat', 'dx_clownfish_habitat_simple']) expect(/rocky reef/.test(en(k)) && /host/.test(en(k)), k).toBe(true);
  });

  it('swaps the open clownfish profile text when the switch changes, and keeps the profile open', async () => {
    const t = await mount({ section: 'guide' }, { gradeLevel: '8th Grade' });
    await click(t.host.querySelector('[data-open-profile="clownfish"]'));
    const profile = () => t.host.querySelector('[data-marine-profile="clownfish"]');
    const keys = ['sp_clownfish_role', 'dx_clownfish_habitat', 'dx_clownfish_behavior'];
    for (const k of keys) expect(has(profile(), en(k)), k + ' full').toBe(true);
    await click(profile().querySelector('input[data-rl21-switch]'));
    expect(profile()).not.toBe(null);
    for (const k of keys) { expect(has(profile(), en(k + '_simple')), k + ' simple').toBe(true); expect(has(profile(), en(k)), k + ' full gone').toBe(false); }
    expect(t.data.simpleWords).toBe(true);
  });

  it('shows the simple habitat and behaviour in the look-alike comparison when the switch is on', async () => {
    const t = await mount({ section: 'guide', simpleWords: true }, { gradeLevel: '8th Grade' });
    await click(t.host.querySelector('[data-open-profile="textile_cone"]'));
    await click(t.host.querySelector('[data-marine-profile="textile_cone"] [data-start-comparison]'));
    const box = t.host.querySelector('[data-marine-comparison]');
    expect(box).not.toBe(null);
    expect(box.getAttribute('data-marine-comparison').split(':')).toContain('textile_cone');
    expect(has(box, en('dx_textile_cone_habitat_simple'))).toBe(true);
    expect(has(box, en('dx_textile_cone_behavior_simple'))).toBe(true);
    expect(has(box, en('dx_textile_cone_habitat'))).toBe(false);
  });

  it('updates the food web diet panel when the switch changes (its profiles are memoised)', async () => {
    const t = await mount({ section: 'science', sciTopic: 'web', sciWeb: { sel: 'crown_of_thorns' } }, { gradeLevel: '8th Grade' });
    const panel = () => t.host.querySelector('[data-fw-panel="crown_of_thorns"]');
    expect(panel()).not.toBe(null);
    expect(has(panel(), en('dx_crown_of_thorns_diet'))).toBe(true);
    await click(t.host.querySelector('input[data-rl21-switch]'));
    expect(t.data.simpleWords).toBe(true);
    expect(has(panel(), en('dx_crown_of_thorns_diet_simple'))).toBe(true);
    expect(has(panel(), en('dx_crown_of_thorns_diet'))).toBe(false);
  });
});
