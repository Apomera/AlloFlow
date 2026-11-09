import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// Reading levels, round 26 lane rlE: twenty-seven more Species guide passages (diet, habitat,
// behaviour, role and fact) have a simpler version. The text tables (speciesText, marineProfiles)
// get only __alloT, so they read the switch the lab set for this render. Checked here: every pair
// reaches its field in both tables, each key has one call and it is wrapped, the phrases older tests
// pin stay in both versions, and the open profile and the look-alike comparison follow the switch.
// None of these diets is a food web node, so the memoised food web panel never shows these fields.

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
  dx_lionfish_habitat: ['pr', 'lionfish', 'habitat'], dx_longfin_bannerfish_habitat: ['pr', 'longfin_bannerfish', 'habitat'],
  dx_parrotfish_behavior: ['pr', 'parrotfish', 'behavior'], dx_regal_angelfish_habitat: ['pr', 'regal_angelfish', 'habitat'],
  dx_spotted_seahorse_diet: ['pr', 'spotted_seahorse', 'diet'], dx_white_spotted_hermit_crab_habitat: ['pr', 'white_spotted_hermit_crab', 'habitat'],
  dx_yellow_boxfish_habitat: ['pr', 'yellow_boxfish', 'habitat'], dx_yellow_longnose_butterflyfish_diet: ['pr', 'yellow_longnose_butterflyfish', 'diet'],
  sp_goldmouth_sea_squirt_role: ['tx', 'goldmouth_sea_squirt', 'role'], sp_green_turtle_role: ['tx', 'green_turtle', 'role'],
  dx_banded_coral_shrimp_habitat: ['pr', 'banded_coral_shrimp', 'habitat'], dx_birdsnest_coral_habitat: ['pr', 'birdsnest_coral', 'habitat'],
  dx_blue_velvet_headshield_slug_diet: ['pr', 'blue_velvet_headshield_slug', 'diet'], dx_bluefin_trevally_habitat: ['pr', 'bluefin_trevally', 'habitat'],
  dx_longnose_hawkfish_habitat: ['pr', 'longnose_hawkfish', 'habitat'], dx_moorish_idol_behavior: ['pr', 'moorish_idol', 'behavior'],
  sp_cleaner_shrimp_fact: ['tx', 'cleaner_shrimp', 'fact'], sp_emperor_angelfish_role: ['tx', 'emperor_angelfish', 'role'],
  sp_reef_manta_fact: ['tx', 'reef_manta', 'fact'], dx_nudibranch_behavior: ['pr', 'nudibranch', 'behavior'],
  dx_titan_triggerfish_habitat: ['pr', 'titan_triggerfish', 'habitat'], sp_hawksbill_turtle_fact: ['tx', 'hawksbill_turtle', 'fact'],
  sp_sea_fan_fact: ['tx', 'sea_fan', 'fact'], dx_brain_coral_behavior: ['pr', 'brain_coral', 'behavior'],
  dx_clownfish_diet: ['pr', 'clownfish', 'diet'], dx_peacock_grouper_habitat: ['pr', 'peacock_grouper', 'habitat'],
  sp_banded_coral_shrimp_role: ['tx', 'banded_coral_shrimp', 'role'],
};

describe('Species guide simpler words (round 26, lane rlE)', () => {
  it('gives every one of the 27 guide fields its simple text when the switch is on, and the full text when off', () => {
    expect(Object.keys(GUIDE)).toHaveLength(27);
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
    const pins = [['sp_cleaner_shrimp_fact', /reproductive phase is male/], ['sp_cleaner_shrimp_fact', /protandric simultaneous hermaphroditism/],
      ['dx_nudibranch_behavior', /muscular foot.*rhinophores.*chemicals/], ['sp_green_turtle_role', /seagrass/],
      ['sp_hawksbill_turtle_fact', /varies by place.*Hawaiian/], ['dx_clownfish_diet', /host anemone/],
      ['dx_banded_coral_shrimp_habitat', /2 to 4 m.*210 m/], ['dx_bluefin_trevally_habitat', /about 190 m/],
      ['dx_titan_triggerfish_habitat', /about 1 to 50 m deep/], ['dx_longfin_bannerfish_habitat', /about 2 (and|to) 75 m deep/],
      ['sp_sea_fan_fact', /Denise's pygmy seahorse on Annella mollis and other Annella sea fans/],
      ['dx_white_spotted_hermit_crab_habitat', /Raffles Bulletin of Zoology/], ['dx_brain_coral_behavior', /winding walls and valleys/]];
    for (const [key, re] of pins) for (const k of [key, key + '_simple']) expect(re.test(en(k)), k + ' ' + re).toBe(true);
    // The search reading test counts 'filtering pharynx' once on the sea squirt card: the role must not add a second one.
    for (const k of ['sp_goldmouth_sea_squirt_role', 'sp_goldmouth_sea_squirt_role_simple']) expect(en(k)).not.toMatch(/filtering pharynx/);
    // The simple texts follow the guide's own text rules: no special dashes, no double spaces, long enough for the profile tests.
    for (const key of Object.keys(GUIDE)) {
      const s = en(key + '_simple');
      expect(/[‐-―−]/.test(s), key + ' dash').toBe(false);
      expect(/\s{2}/.test(s), key + ' spaces').toBe(false);
      expect(s.length, key + ' length').toBeGreaterThan(60);
    }
  });

  it('swaps the open banded coral shrimp profile text when the switch changes, and keeps the profile open', async () => {
    const t = await mount({ section: 'guide' }, { gradeLevel: '8th Grade' });
    await click(t.host.querySelector('[data-open-profile="banded_coral_shrimp"]'));
    const profile = () => t.host.querySelector('[data-marine-profile="banded_coral_shrimp"]');
    expect(profile()).not.toBe(null);
    const keys = ['sp_banded_coral_shrimp_role', 'dx_banded_coral_shrimp_habitat'];
    for (const k of keys) expect(has(profile(), en(k)), k + ' full').toBe(true);
    await click(profile().querySelector('input[data-rl21-switch]'));
    expect(profile()).not.toBe(null);
    for (const k of keys) { expect(has(profile(), en(k + '_simple')), k + ' simple').toBe(true); expect(has(profile(), en(k)), k + ' full gone').toBe(false); }
    expect(t.data.simpleWords).toBe(true);
  });

  it('shows the simple nudibranch behaviour in the look-alike comparison from the Spanish dancer when the switch is on', async () => {
    const t = await mount({ section: 'guide', simpleWords: true }, { gradeLevel: '8th Grade' });
    await click(t.host.querySelector('[data-open-profile="spanish_dancer"]'));
    await click(t.host.querySelector('[data-marine-profile="spanish_dancer"] [data-start-comparison]'));
    const box = t.host.querySelector('[data-marine-comparison]');
    expect(box).not.toBe(null);
    expect(box.getAttribute('data-marine-comparison').split(':')).toEqual(expect.arrayContaining(['spanish_dancer', 'nudibranch']));
    expect(has(box, en('dx_nudibranch_behavior_simple'))).toBe(true);
    expect(has(box, en('dx_nudibranch_behavior'))).toBe(false);
  });
});
