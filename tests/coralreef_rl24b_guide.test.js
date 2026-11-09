import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// Reading levels, round 24 lane rlB: thirty more Species guide passages (diet, habitat, behaviour,
// role and fact) have a simpler version. The text tables (speciesText, marineProfiles) get only
// __alloT, so they read the switch the lab set for this render. Checked here: every pair reaches its
// field in both tables, the one coral diet text that six other corals reuse swaps everywhere, the
// phrases older tests pin stay in both versions, and the open profile, the look-alike comparison and
// the food web panel (which keeps marineProfiles in a useMemo) follow the switch.

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
  dx_brain_coral_diet: ['pr', 'brain_coral', 'diet'], dx_cauliflower_coral_diet: ['pr', 'cauliflower_coral', 'diet'],
  dx_chocolate_chip_sea_star_diet: ['pr', 'chocolate_chip_sea_star', 'diet'], dx_foliose_coral_diet: ['pr', 'foliose_coral', 'diet'],
  dx_mushroom_coral_diet: ['pr', 'mushroom_coral', 'diet'], dx_staghorn_coral_diet: ['pr', 'staghorn_coral', 'diet'],
  dx_table_coral_diet: ['pr', 'table_coral', 'diet'], sp_blue_tang_fact: ['tx', 'blue_tang', 'fact'],
  dx_ribbon_eel_habitat: ['pr', 'ribbon_eel', 'habitat'], dx_clown_triggerfish_diet: ['pr', 'clown_triggerfish', 'diet'],
  dx_banded_pipefish_habitat: ['pr', 'banded_pipefish', 'habitat'], dx_copperband_butterflyfish_habitat: ['pr', 'copperband_butterflyfish', 'habitat'],
  dx_threadfin_butterflyfish_behavior: ['pr', 'threadfin_butterflyfish', 'behavior'], sp_barrel_sponge_role: ['tx', 'barrel_sponge', 'role'],
  sp_sixbar_wrasse_role: ['tx', 'sixbar_wrasse', 'role'], dx_giant_clam_diet: ['pr', 'giant_clam', 'diet'],
  sp_white_spotted_hermit_crab_role: ['tx', 'white_spotted_hermit_crab', 'role'], sp_yellow_longnose_butterflyfish_fact: ['tx', 'yellow_longnose_butterflyfish', 'fact'],
  dx_oriental_sweetlips_behavior: ['pr', 'oriental_sweetlips', 'behavior'], dx_chocolate_chip_sea_star_habitat: ['pr', 'chocolate_chip_sea_star', 'habitat'],
  dx_porcelain_anemone_crab_habitat: ['pr', 'porcelain_anemone_crab', 'habitat'], dx_yellow_longnose_butterflyfish_habitat: ['pr', 'yellow_longnose_butterflyfish', 'habitat'],
  sp_cleaner_wrasse_role: ['tx', 'cleaner_wrasse', 'role'], sp_hawksbill_turtle_role: ['tx', 'hawksbill_turtle', 'role'],
  dx_blackfin_barracuda_habitat: ['pr', 'blackfin_barracuda', 'habitat'], dx_emperor_angelfish_behavior: ['pr', 'emperor_angelfish', 'behavior'],
  dx_giant_triton_diet: ['pr', 'giant_triton', 'diet'], dx_green_turtle_behavior: ['pr', 'green_turtle', 'behavior'],
  dx_sixbar_wrasse_diet: ['pr', 'sixbar_wrasse', 'diet'], sp_banded_pipefish_role: ['tx', 'banded_pipefish', 'role'],
};
// Corals whose diet line reuses the staghorn coral diet key.
const STAGHORN_DIET_SHARED = ['birdsnest_coral', 'galaxy_coral', 'finger_coral', 'acropora_clathrata', 'acropora_humilis', 'acropora_millepora'];

describe('Species guide simpler words (round 24, lane rlB)', () => {
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

  it('swaps the shared staghorn coral diet in every coral that reuses it', () => {
    const t = (k, f) => f;
    const before = RL.now.on;
    try {
      for (const on of [false, true]) {
        RL.now.on = on;
        const PR = X.marineProfiles(t);
        for (const id of STAGHORN_DIET_SHARED) expect(PR[id].diet, id + ' on=' + on).toBe(en(on ? 'dx_staghorn_coral_diet_simple' : 'dx_staghorn_coral_diet'));
      }
    } finally { RL.now.on = before; }
    // No bare call of the key is left: each one sits inside rl21Text.
    const all = SRC.match(/__alloT\((['"])stem\.coralreef\.dx_staghorn_coral_diet\1/g) || [];
    const wrapped = SRC.match(/rl21Text\(null, __alloT\('stem\.coralreef\.dx_staghorn_coral_diet'/g) || [];
    expect(all.length).toBe(5); // staghorn, birdsnest, galaxy and finger coral, and acroporaLife (the 3 Acropora plates)
    expect(wrapped.length).toBe(all.length);
  });

  it('keeps the phrases older guide tests pin in both versions', () => {
    const pins = [['dx_chocolate_chip_sea_star_diet', /films, detritus.*tiny organisms/], ['dx_porcelain_anemone_crab_habitat', /large sea anemones/],
      ['dx_blackfin_barracuda_habitat', /from about 1 to 100 m deep/]];
    for (const [key, re] of pins) for (const k of [key, key + '_simple']) expect(re.test(en(k)), k + ' ' + re).toBe(true);
    // The simple texts follow the guide's own text rules: no dashes.
    for (const key of Object.keys(GUIDE)) expect(/[‐-―−]/.test(en(key + '_simple')), key).toBe(false);
  });

  it('swaps the open sixbar wrasse profile text when the switch changes, and keeps the profile open', async () => {
    const t = await mount({ section: 'guide' }, { gradeLevel: '8th Grade' });
    await click(t.host.querySelector('[data-open-profile="sixbar_wrasse"]'));
    const profile = () => t.host.querySelector('[data-marine-profile="sixbar_wrasse"]');
    expect(profile()).not.toBe(null);
    const keys = ['sp_sixbar_wrasse_role', 'dx_sixbar_wrasse_diet'];
    for (const k of keys) expect(has(profile(), en(k)), k + ' full').toBe(true);
    await click(profile().querySelector('input[data-rl21-switch]'));
    expect(profile()).not.toBe(null);
    for (const k of keys) { expect(has(profile(), en(k + '_simple')), k + ' simple').toBe(true); expect(has(profile(), en(k)), k + ' full gone').toBe(false); }
    expect(t.data.simpleWords).toBe(true);
  });

  it('shows the simple habitat and diet in the look-alike comparison when the switch is on', async () => {
    const t = await mount({ section: 'guide', simpleWords: true }, { gradeLevel: '8th Grade' });
    await click(t.host.querySelector('[data-open-profile="chocolate_chip_sea_star"]'));
    await click(t.host.querySelector('[data-marine-profile="chocolate_chip_sea_star"] [data-start-comparison]'));
    const box = t.host.querySelector('[data-marine-comparison]');
    expect(box).not.toBe(null);
    expect(box.getAttribute('data-marine-comparison').split(':')).toContain('chocolate_chip_sea_star');
    expect(has(box, en('dx_chocolate_chip_sea_star_habitat_simple'))).toBe(true);
    expect(has(box, en('dx_chocolate_chip_sea_star_diet_simple'))).toBe(true);
    expect(has(box, en('dx_chocolate_chip_sea_star_habitat'))).toBe(false);
  });

  it('updates the food web diet panel when the switch changes (its profiles are memoised)', async () => {
    const t = await mount({ section: 'science', sciTopic: 'web', sciWeb: { sel: 'giant_triton' } }, { gradeLevel: '8th Grade' });
    const panel = () => t.host.querySelector('[data-fw-panel="giant_triton"]');
    expect(panel()).not.toBe(null);
    expect(has(panel(), en('dx_giant_triton_diet'))).toBe(true);
    await click(t.host.querySelector('input[data-rl21-switch]'));
    expect(t.data.simpleWords).toBe(true);
    expect(has(panel(), en('dx_giant_triton_diet_simple'))).toBe(true);
    expect(has(panel(), en('dx_giant_triton_diet'))).toBe(false);
  });
});
