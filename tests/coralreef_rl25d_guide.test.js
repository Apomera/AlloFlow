import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// Reading levels, round 25 lane rlD: thirty more Species guide passages (role, fact, habitat, diet,
// behaviour) have a simpler version. The text tables (speciesText, marineProfiles) get only __alloT,
// so they read the switch the lab set for this render. Checked here: every pair reaches its field in
// both tables, the phrases and lengths older tests pin stay in both versions, and the open profile,
// the look-alike comparison and the food web panel (marineProfiles in a useMemo) follow the switch.

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
  sp_dusky_farmerfish_role: ['tx', 'dusky_farmerfish', 'role'], sp_leaf_scorpionfish_role: ['tx', 'leaf_scorpionfish', 'role'],
  dx_leopard_coral_grouper_habitat: ['pr', 'leopard_coral_grouper', 'habitat'], dx_magnificent_anemone_habitat: ['pr', 'magnificent_anemone', 'habitat'],
  dx_reef_star_habitat: ['pr', 'reef_star', 'habitat'], dx_white_spotted_hermit_crab_diet: ['pr', 'white_spotted_hermit_crab', 'diet'],
  sp_blackspotted_puffer_role: ['tx', 'blackspotted_puffer', 'role'], dx_mandarin_dragonet_habitat: ['pr', 'mandarin_dragonet', 'habitat'],
  sp_blue_tang_role: ['tx', 'blue_tang', 'role'], sp_clown_triggerfish_fact: ['tx', 'clown_triggerfish', 'fact'],
  sp_crown_of_thorns_fact: ['tx', 'crown_of_thorns', 'fact'], sp_porcupinefish_role: ['tx', 'porcupinefish', 'role'],
  dx_blue_sea_star_diet: ['pr', 'blue_sea_star', 'diet'], dx_blue_velvet_headshield_slug_behavior: ['pr', 'blue_velvet_headshield_slug', 'behavior'],
  dx_porcelain_anemone_crab_behavior: ['pr', 'porcelain_anemone_crab', 'behavior'], sp_bennetts_feather_star_fact: ['tx', 'bennetts_feather_star', 'fact'],
  sp_blackspotted_puffer_fact: ['tx', 'blackspotted_puffer', 'fact'], sp_firefish_role: ['tx', 'firefish', 'role'],
  dx_banded_pipefish_diet: ['pr', 'banded_pipefish', 'diet'], dx_galaxy_coral_behavior: ['pr', 'galaxy_coral', 'behavior'],
  dx_giant_triton_behavior: ['pr', 'giant_triton', 'behavior'], dx_pipe_organ_coral_diet: ['pr', 'pipe_organ_coral', 'diet'],
  sp_blue_velvet_headshield_slug_fact: ['tx', 'blue_velvet_headshield_slug', 'fact'], sp_foxface_rabbitfish_role: ['tx', 'foxface_rabbitfish', 'role'],
  sp_giant_clam_fact: ['tx', 'giant_clam', 'fact'], sp_mandarin_dragonet_fact: ['tx', 'mandarin_dragonet', 'fact'],
  sp_moorish_idol_fact: ['tx', 'moorish_idol', 'fact'], sp_sea_cucumber_role: ['tx', 'sea_cucumber', 'role'],
  dx_blue_velvet_headshield_slug_habitat: ['pr', 'blue_velvet_headshield_slug', 'habitat'], dx_cauliflower_coral_habitat: ['pr', 'cauliflower_coral', 'habitat']
};

describe('Species guide simpler words (round 25, lane rlD)', () => {
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
    // Each key has exactly one call, and it sits inside rl21Text.
    for (const key of Object.keys(GUIDE)) {
      const all = SRC.match(new RegExp("__alloT\\((['\"])stem\\.coralreef\\." + key + "\\1", 'g')) || [];
      const wrapped = SRC.match(new RegExp("rl21Text\\(null, __alloT\\('stem\\.coralreef\\." + key + "'", 'g')) || [];
      expect([all.length, wrapped.length], key).toEqual([1, 1]);
    }
  });

  it('keeps the phrases and lengths older tests pin in both versions', () => {
    const pins = [
      ['sp_dusky_farmerfish_role', /weeds out algae it cannot digest and chases away/],
      ['sp_clown_triggerfish_fact', /three spines.*without simulating the internal locking/],
      ['sp_giant_clam_fact', /2003 study.*Tridacna maxima/],
      ['sp_moorish_idol_fact', /Adults develop.*above their eyes/],
      ['dx_porcelain_anemone_crab_behavior', /Spot size and colour vary/],
      ['sp_bennetts_feather_star_fact', /animal.*echinoderm/],
      ['sp_blue_velvet_headshield_slug_fact', /different sea-slug group/],
      ['sp_mandarin_dragonet_fact', /pigment|cyanophores/],
      // my own checks: the depth range and the place names stay
      ['dx_leopard_coral_grouper_habitat', /about 3 to 100 m deep/],
      ['dx_blue_velvet_headshield_slug_habitat', /Indo-West Pacific/]
    ];
    for (const [key, re] of pins) for (const k of [key, key + '_simple']) expect(re.test(en(k)), k + ' ' + re).toBe(true);
    for (const k of ['sp_mandarin_dragonet_fact', 'sp_mandarin_dragonet_fact_simple']) expect(en(k)).not.toMatch(/fluorescen|bioluminescen/);
    for (const key of Object.keys(GUIDE)) {
      const s = en(key + '_simple'), field = GUIDE[key][2];
      expect(/[‐-―−]/.test(s), key + ' dash').toBe(false);
      // longest minimum any older test sets for this kind of field (sp17i: 40 for galaxy coral profile fields)
      const min = field === 'fact' ? 30 : field === 'role' ? 10 : 40;
      expect(s.length, key + ' length').toBeGreaterThan(min);
    }
  });

  it('swaps the open blue velvet headshield slug profile text when the switch changes, and keeps the profile open', async () => {
    const t = await mount({ section: 'guide' }, { gradeLevel: '8th Grade' });
    await click(t.host.querySelector('[data-open-profile="blue_velvet_headshield_slug"]'));
    const profile = () => t.host.querySelector('[data-marine-profile="blue_velvet_headshield_slug"]');
    expect(profile()).not.toBe(null);
    const keys = ['sp_blue_velvet_headshield_slug_fact', 'dx_blue_velvet_headshield_slug_habitat', 'dx_blue_velvet_headshield_slug_behavior'];
    for (const k of keys) expect(has(profile(), en(k)), k + ' full').toBe(true);
    await click(profile().querySelector('input[data-rl21-switch]'));
    expect(profile()).not.toBe(null);
    for (const k of keys) { expect(has(profile(), en(k + '_simple')), k + ' simple').toBe(true); expect(has(profile(), en(k)), k + ' full gone').toBe(false); }
    expect(t.data.simpleWords).toBe(true);
  });

  it('shows the simple blue sea star diet in the look-alike comparison when the switch is on', async () => {
    const t = await mount({ section: 'guide', simpleWords: true }, { gradeLevel: '8th Grade' });
    await click(t.host.querySelector('[data-open-profile="chocolate_chip_sea_star"]'));
    await click(t.host.querySelector('[data-marine-profile="chocolate_chip_sea_star"] [data-start-comparison]'));
    const box = t.host.querySelector('[data-marine-comparison]');
    expect(box).not.toBe(null);
    expect(box.getAttribute('data-marine-comparison').split(':')).toContain('blue_sea_star');
    expect(has(box, en('dx_blue_sea_star_diet_simple'))).toBe(true);
    expect(has(box, en('dx_blue_sea_star_diet'))).toBe(false);
  });

  it('updates the food web diet panel when the switch changes (its profiles are memoised)', async () => {
    const t = await mount({ section: 'science', sciTopic: 'web', sciWeb: { sel: 'blue_sea_star' } }, { gradeLevel: '8th Grade' });
    const panel = () => t.host.querySelector('[data-fw-panel="blue_sea_star"]');
    expect(panel()).not.toBe(null);
    expect(has(panel(), en('dx_blue_sea_star_diet'))).toBe(true);
    await click(t.host.querySelector('input[data-rl21-switch]'));
    expect(t.data.simpleWords).toBe(true);
    expect(has(panel(), en('dx_blue_sea_star_diet_simple'))).toBe(true);
    expect(has(panel(), en('dx_blue_sea_star_diet'))).toBe(false);
  });
});
