import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// Reading levels, round 26 lane rlF: the last twenty-six Species guide passages above grade 9 (role,
// fact, habitat, diet, behaviour) have a simpler version. The text tables (speciesText, marineProfiles)
// get only __alloT, so they read the switch the lab set for this render. Checked here: every pair reaches
// its field in both tables, the phrases and lengths older tests pin stay in both versions, and the open
// profile and the look-alike comparison follow the switch. (None of these diets is in the food web.)

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
const has = (el, text) => typeof text === 'string' && el.textContent.includes(text);
const EN = new Map();
for (const m of SRC.matchAll(/__alloT\((['"])stem\.coralreef\.([A-Za-z0-9_]+)\1,\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g)) if (!EN.has(m[2])) EN.set(m[2], vm.runInNewContext(m[3]));
const en = (k) => EN.get(k);

// key -> [table, species id, field]
const GUIDE = {
  sp_bumphead_parrotfish_fact: ['tx', 'bumphead_parrotfish', 'fact'], sp_giant_triton_fact: ['tx', 'giant_triton', 'fact'],
  sp_green_turtle_fact: ['tx', 'green_turtle', 'fact'], sp_longnose_hawkfish_role: ['tx', 'longnose_hawkfish', 'role'],
  sp_spotted_garden_eel_role: ['tx', 'spotted_garden_eel', 'role'], sp_yellow_boxfish_role: ['tx', 'yellow_boxfish', 'role'],
  dx_christmas_tree_worm_habitat: ['pr', 'christmas_tree_worm', 'habitat'], dx_reef_ball_habitat: ['pr', 'reef_ball', 'habitat'],
  sp_harlequin_shrimp_fact: ['tx', 'harlequin_shrimp', 'fact'], sp_lionfish_fact: ['tx', 'lionfish', 'fact'],
  dx_spotted_garden_eel_behavior: ['pr', 'spotted_garden_eel', 'behavior'], sp_sixbar_wrasse_fact: ['tx', 'sixbar_wrasse', 'fact'],
  dx_banggai_cardinalfish_behavior: ['pr', 'banggai_cardinalfish', 'behavior'], dx_blackspotted_puffer_diet: ['pr', 'blackspotted_puffer', 'diet'],
  dx_boulder_coral_behavior: ['pr', 'boulder_coral', 'behavior'], dx_clown_triggerfish_habitat: ['pr', 'clown_triggerfish', 'habitat'],
  dx_hammer_coral_behavior: ['pr', 'hammer_coral', 'behavior'], dx_orange_cup_coral_habitat: ['pr', 'orange_cup_coral', 'habitat'],
  sp_chocolate_chip_sea_star_role: ['tx', 'chocolate_chip_sea_star', 'role'], sp_clownfish_fact: ['tx', 'clownfish', 'fact'],
  sp_copperband_butterflyfish_role: ['tx', 'copperband_butterflyfish', 'role'], sp_foliose_coral_role: ['tx', 'foliose_coral', 'role'],
  sp_humphead_wrasse_fact: ['tx', 'humphead_wrasse', 'fact'], sp_peacock_mantis_shrimp_fact: ['tx', 'peacock_mantis_shrimp', 'fact'],
  sp_pipe_organ_coral_fact: ['tx', 'pipe_organ_coral', 'fact'], sp_reef_manta_role: ['tx', 'reef_manta', 'role']
};

describe('Species guide simpler words (round 26, lane rlF)', () => {
  it('gives every one of the 26 guide fields its simple text when the switch is on, and the full text when off', () => {
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
      ['sp_bumphead_parrotfish_fact', /large.*may consume/i],
      ['sp_green_turtle_fact', /global assessment published in 2025/],
      ['sp_green_turtle_fact', /regional populations remain threatened/],
      ['sp_giant_triton_fact', /not proof.*control.*outbreak/],
      ['sp_lionfish_fact', /native to the Indo-Pacific.*introduced in the western Atlantic/],
      ['dx_banggai_cardinalfish_behavior', /brooding is not animated/],
      ['dx_banggai_cardinalfish_behavior', /long-spined sea urchins/],
      ['dx_spotted_garden_eel_behavior', /current bending.*attachment remains fixed.*not animated/],
      ['sp_pipe_organ_coral_fact', /136 colonies found 15 separate lineages/],
      ['sp_sixbar_wrasse_fact', /up to 15 times more common than any other wrasse/],
      ['dx_christmas_tree_worm_habitat', /host coral surrounds it/],
      ['sp_humphead_wrasse_fact', /undulatus.*wavy.*large adults/],
      ['sp_peacock_mantis_shrimp_fact', /cavitation/],
      ['dx_hammer_coral_behavior', /by day and by night/],
      // my own checks: the depth, the places and the hedges stay
      ['dx_orange_cup_coral_habitat', /Smithsonian reports it at depths down to 60 m/],
      ['sp_reef_manta_role', /probably.*small fishes/],
      ['sp_bumphead_parrotfish_fact', /estimate/]
    ];
    for (const [key, re] of pins) for (const k of [key, key + '_simple']) expect(re.test(en(k)), k + ' ' + re).toBe(true);
    for (const k of ['sp_bumphead_parrotfish_fact', 'sp_bumphead_parrotfish_fact_simple']) expect(en(k)).not.toMatch(/Each .*over 5 tonnes/);
    for (const k of ['sp_peacock_mantis_shrimp_fact', 'sp_peacock_mantis_shrimp_fact_simple']) expect(en(k).toLowerCase()).not.toContain('more colours than humans');
    for (const key of Object.keys(GUIDE)) {
      const s = en(key + '_simple'), field = GUIDE[key][2];
      expect(/[‐-―−‑]/.test(s), key + ' dash').toBe(false);
      expect(s, key + ' double space').not.toMatch(/\s{2}/);
      // longest minimum any older test sets for this kind of field (fleshy corals: fact 60, role 40; profile fields 40)
      const min = field === 'fact' ? 60 : field === 'role' ? 40 : 40;
      expect(s.length, key + ' length').toBeGreaterThan(min);
    }
  });

  it('swaps the open spotted garden eel profile text when the switch changes, and keeps the profile open', async () => {
    const t = await mount({ section: 'guide' }, { gradeLevel: '8th Grade' });
    await click(t.host.querySelector('[data-open-profile="spotted_garden_eel"]'));
    const profile = () => t.host.querySelector('[data-marine-profile="spotted_garden_eel"]');
    expect(profile()).not.toBe(null);
    const keys = ['sp_spotted_garden_eel_role', 'dx_spotted_garden_eel_behavior'];
    for (const k of keys) expect(has(profile(), en(k)), k + ' full').toBe(true);
    await click(profile().querySelector('input[data-rl21-switch]'));
    expect(profile()).not.toBe(null);
    for (const k of keys) { expect(has(profile(), en(k + '_simple')), k + ' simple').toBe(true); expect(has(profile(), en(k)), k + ' full gone').toBe(false); }
    expect(t.data.simpleWords).toBe(true);
  });

  it('shows the simple orange cup coral habitat in the look-alike comparison when the switch is on', async () => {
    const t = await mount({ section: 'guide', simpleWords: true }, { gradeLevel: '8th Grade' });
    await click(t.host.querySelector('[data-open-profile="flowerpot_coral"]'));
    await click(t.host.querySelector('[data-marine-profile="flowerpot_coral"] [data-start-comparison]'));
    const box = t.host.querySelector('[data-marine-comparison]');
    expect(box).not.toBe(null);
    expect(box.getAttribute('data-marine-comparison').split(':')).toContain('orange_cup_coral');
    expect(has(box, en('dx_orange_cup_coral_habitat_simple'))).toBe(true);
    expect(has(box, en('dx_orange_cup_coral_habitat'))).toBe(false);
  });
});
