import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// Reading levels, round 27 lane rlH: thirty-five more Species guide passages (role, fact, habitat, diet,
// behaviour, grades 8.5 to 8.1) have a simpler version. The text tables (speciesText, marineProfiles) get
// only __alloT, so they read the switch the lab set for this render. Checked here: every pair reaches its
// field in both tables, the phrases and lengths older tests pin stay in both versions, the open profile and
// the look-alike comparison follow the switch, and the food web panel (which keeps marineProfiles in a
// useMemo) shows the simple blacktip reef shark diet once the switch is on.

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
const KEYS = ['dx_hawksbill_turtle_habitat', 'sp_blacktip_reef_shark_role', 'sp_giant_triton_role', 'dx_anthias_habitat',
  'dx_bennetts_feather_star_behavior', 'dx_blacktip_reef_shark_diet', 'dx_cauliflower_coral_behavior', 'dx_feather_duster_worm_behavior',
  'dx_fire_coral_habitat', 'dx_firefish_habitat', 'dx_foxface_rabbitfish_diet', 'dx_galaxy_coral_habitat', 'dx_giant_moray_habitat',
  'dx_moorish_idol_habitat', 'dx_staghorn_coral_habitat', 'sp_banggai_cardinalfish_fact', 'sp_blue_green_chromis_role',
  'sp_blue_sea_star_fact', 'sp_broadclub_cuttlefish_fact', 'sp_clown_triggerfish_role', 'sp_giant_moray_fact',
  'sp_leaf_scorpionfish_fact', 'sp_leopard_coral_grouper_fact', 'sp_leopard_coral_grouper_role', 'sp_moorish_idol_role',
  'sp_pajama_cardinalfish_fact', 'sp_pajama_cardinalfish_role', 'sp_regal_angelfish_role', 'sp_threadfin_butterflyfish_role',
  'dx_bubble_coral_habitat', 'dx_pajama_cardinalfish_diet', 'sp_peacock_mantis_shrimp_role', 'dx_chocolate_chip_sea_star_behavior',
  'dx_goldmouth_sea_squirt_habitat', 'sp_fire_coral_role'];
const GUIDE = Object.fromEntries(KEYS.map((k) => { const m = /^(sp|dx)_(.+)_(fact|role|habitat|diet|behavior)$/.exec(k); return [k, [m[1] === 'sp' ? 'tx' : 'pr', m[2], m[3]]]; }));

describe('Species guide simpler words (round 27, lane rlH)', () => {
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
    // Each key has exactly one call, and it sits inside rl21Text.
    for (const key of Object.keys(GUIDE)) {
      const all = SRC.match(new RegExp("__alloT\\((['\"])stem\\.coralreef\\." + key + "\\1", 'g')) || [];
      const wrapped = SRC.match(new RegExp("rl21Text\\(null, __alloT\\('stem\\.coralreef\\." + key + "'", 'g')) || [];
      expect([all.length, wrapped.length], key).toEqual([1, 1]);
    }
  });

  it('keeps the phrases and lengths older tests pin in both versions', () => {
    const pins = [
      ['sp_giant_triton_role', /not enough to control/],
      ['dx_bennetts_feather_star_behavior', /grooves toward the mouth on the upper disc.*not animated/],
      ['dx_feather_duster_worm_behavior', /study model shows an extended crown/],
      ['dx_feather_duster_worm_behavior', /exchange gases.*extended crown.*not the microscopic beating/],
      ['dx_bubble_coral_habitat', /0 to 40 m/],
      ['sp_banggai_cardinalfish_fact', /fully formed juveniles.*no pelagic larval phase/],
      ['sp_broadclub_cuttlefish_fact', /single colour pattern is not a reliable identity check/],
      ['sp_leaf_scorpionfish_fact', /white, pink, red or green/],
      ['sp_leaf_scorpionfish_fact', /sheds.*skin.*colour alone is a poor guide/],
      ['sp_leopard_coral_grouper_fact', /closed to fishing.*more and bigger coral trout on the protected reefs/],
      ['dx_chocolate_chip_sea_star_behavior', /seafloor using many tube feet.*sediment and seagrass/],
      ['dx_chocolate_chip_sea_star_behavior', /water vascular system.*foot probes.*does not animate full crawling/],
      ['sp_fire_coral_role', /hydrozoan, related to jellyfish, not a true stony coral/],
      // my own checks: places, depths, sources and hedges stay
      ['dx_fire_coral_habitat', /Red Sea to Japan and the Marquesas Islands.*SeaLifeBase.*about 3 to 6 m deep.*often 2 to 3 m across/],
      ['dx_galaxy_coral_habitat', /Egypt to Japan, Australia and Tahiti.*about 3 to 25 m deep.*can/],
      ['dx_goldmouth_sea_squirt_habitat', /Indo-West Pacific.*SeaLifeBase.*about 3 to 20 m deep.*not a strict/],
      ['dx_foxface_rabbitfish_diet', /northern Great Barrier Reef.*Lizard Island.*mostly cyanobacteria/],
      ['sp_giant_moray_fact', /Red Sea.*roving coral groupers.*could/],
      ['sp_leopard_coral_grouper_fact', /Great Barrier Reef.*most important.*About ten years/],
      ['sp_leopard_coral_grouper_role', /mainly other fish/],
      ['dx_blacktip_reef_shark_diet', /Mostly small fishes|mostly eats small fishes/],
      ['dx_staghorn_coral_habitat', /Acropora/],
      ['dx_feather_duster_worm_behavior', /two/]
    ];
    for (const [key, re] of pins) for (const k of [key, key + '_simple']) expect(re.test(en(k)), k + ' ' + re).toBe(true);
    // search_reading counts "filtering pharynx" once on the sea squirt card: the habitat never says it.
    for (const k of ['dx_goldmouth_sea_squirt_habitat', 'dx_goldmouth_sea_squirt_habitat_simple']) expect(en(k)).not.toMatch(/filtering pharynx/);
    for (const key of Object.keys(GUIDE)) {
      const s = en(key + '_simple'), field = GUIDE[key][2];
      expect(/[‐-―−]/.test(s), key + ' dash').toBe(false);
      expect(s, key + ' double space').not.toMatch(/\s{2}/);
      // longest minimum any older test sets for this kind of field (fleshy corals: fact 60, role 40; profile fields 40)
      const min = field === 'fact' ? 60 : 40;
      expect(s.length, key + ' length').toBeGreaterThan(min);
    }
  });

  it('swaps the open pajama cardinalfish profile text when the switch changes, and keeps the profile open', async () => {
    const t = await mount({ section: 'guide' }, { gradeLevel: '8th Grade' });
    await click(t.host.querySelector('[data-open-profile="pajama_cardinalfish"]'));
    const profile = () => t.host.querySelector('[data-marine-profile="pajama_cardinalfish"]');
    expect(profile()).not.toBe(null);
    const keys = ['sp_pajama_cardinalfish_role', 'dx_pajama_cardinalfish_diet'];
    for (const k of keys) expect(has(profile(), en(k)), k + ' full').toBe(true);
    await click(profile().querySelector('input[data-rl21-switch]'));
    expect(profile()).not.toBe(null);
    for (const k of keys) { expect(has(profile(), en(k + '_simple')), k + ' simple').toBe(true); expect(has(profile(), en(k)), k + ' full gone').toBe(false); }
    expect(t.data.simpleWords).toBe(true);
  });

  it('shows the simple hawksbill turtle habitat in the look-alike comparison when the switch is on', async () => {
    const t = await mount({ section: 'guide', simpleWords: true }, { gradeLevel: '8th Grade' });
    await click(t.host.querySelector('[data-open-profile="green_turtle"]'));
    await click(t.host.querySelector('[data-marine-profile="green_turtle"] [data-start-comparison]'));
    const box = t.host.querySelector('[data-marine-comparison]');
    expect(box).not.toBe(null);
    expect(box.getAttribute('data-marine-comparison').split(':')).toContain('hawksbill_turtle');
    expect(has(box, en('dx_hawksbill_turtle_habitat_simple'))).toBe(true);
    expect(has(box, en('dx_hawksbill_turtle_habitat'))).toBe(false);
  });

  it('updates the food web diet panel for the blacktip reef shark when the switch changes (its profiles are memoised)', async () => {
    const t = await mount({ section: 'science', sciTopic: 'web', sciWeb: { sel: 'blacktip_reef_shark' } }, { gradeLevel: '8th Grade' });
    const panel = () => t.host.querySelector('[data-fw-panel="blacktip_reef_shark"]');
    expect(panel()).not.toBe(null);
    expect(has(panel(), en('dx_blacktip_reef_shark_diet'))).toBe(true);
    await click(t.host.querySelector('input[data-rl21-switch]'));
    expect(t.data.simpleWords).toBe(true);
    expect(has(panel(), en('dx_blacktip_reef_shark_diet_simple'))).toBe(true);
    expect(has(panel(), en('dx_blacktip_reef_shark_diet'))).toBe(false);
  });
});
