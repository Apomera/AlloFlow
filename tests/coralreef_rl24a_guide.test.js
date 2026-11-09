import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// Reading levels round 24, lane A: thirty more Species guide passages (habitat, diet, role, fact)
// have a simpler version. The text tables (speciesText, marineProfiles) get only __alloT, so they
// read the switch the lab set for this render. Checked here: every pair reaches its field in both
// tables, phrases older tests pin stay in both versions, an open profile and the look-alike
// comparison swap when the switch changes, and the memoised food web panel follows the switch.

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

// The thirty keys: sp_<id>_<field> lives in speciesText, dx_<id>_<field> in marineProfiles.
const KEYS = ['dx_banggai_cardinalfish_habitat', 'dx_longfin_bannerfish_diet', 'dx_harlequin_shrimp_habitat', 'dx_leaf_scorpionfish_habitat',
  'dx_mandarin_dragonet_diet', 'sp_blue_velvet_headshield_slug_role', 'dx_broadclub_cuttlefish_habitat', 'dx_longnose_hawkfish_diet',
  'dx_sixbar_wrasse_habitat', 'sp_ribbon_eel_fact', 'dx_reef_manta_habitat', 'dx_brain_coral_habitat', 'dx_humphead_wrasse_diet',
  'dx_spotted_garden_eel_habitat', 'dx_spotted_seahorse_habitat', 'dx_banggai_cardinalfish_diet', 'dx_pincushion_sea_star_habitat',
  'sp_mandarin_dragonet_role', 'dx_firefish_diet', 'dx_bennetts_feather_star_habitat', 'dx_humphead_wrasse_habitat',
  'dx_magnificent_anemone_diet', 'dx_barrel_sponge_diet', 'dx_threadfin_butterflyfish_habitat', 'dx_varicose_phyllidia_habitat',
  'dx_banded_coral_shrimp_diet', 'dx_giant_triton_habitat', 'dx_porcelain_anemone_crab_diet', 'dx_soft_coral_diet', 'dx_boulder_coral_diet'];
const where = (key) => { const m = /^(sp|dx)_(.+)_(fact|role|habitat|diet|behavior)$/.exec(key); return [m[1] === 'sp' ? 'tx' : 'pr', m[2], m[3]]; };

describe('Species guide simpler words (round 24, lane A)', () => {
  it('gives every one of the 30 fields its simple text when the switch is on, and the full text when off', () => {
    expect(KEYS.length).toBe(30);
    const t = (k, f) => f;
    const before = RL.now.on;
    try {
      for (const on of [false, true]) {
        RL.now.on = on;
        const TX = X.speciesText(t), PR = X.marineProfiles(t);
        for (const key of KEYS) {
          const [table, id, field] = where(key);
          const want = en(on ? key + '_simple' : key);
          expect(typeof want, key + (on ? '_simple' : '') + ' English').toBe('string');
          expect(en(key + '_simple'), key + ' simple differs').not.toBe(en(key));
          expect((table === 'tx' ? TX : PR)[id][field], key + ' on=' + on).toBe(want);
        }
      }
    } finally { RL.now.on = before; }
  });

  it('keeps the phrases older species tests pin, in both versions, with no dashes and enough words', () => {
    const pins = [['dx_broadclub_cuttlefish_habitat', /Indo-Pacific/], ['dx_varicose_phyllidia_habitat', /Indo-West Pacific/],
      ['dx_longnose_hawkfish_diet', /planktonic.*crustaceans/], ['dx_porcelain_anemone_crab_diet', /planktonic algae.*small crustaceans/],
      ['sp_ribbon_eel_fact', /unreliable sex label/], ['dx_reef_manta_habitat', /cleaning stations/]];
    for (const [key, re] of pins) for (const k of [key, key + '_simple']) expect(re.test(en(k)), k + ' ' + re).toBe(true);
    for (const key of KEYS) {
      const s = en(key + '_simple');
      expect(/[‐-―]/.test(s), key + ' dash').toBe(false);
      expect(s.length, key + ' length').toBeGreaterThan(40);
    }
  });

  it('swaps the open Banggai cardinalfish profile text when the switch changes, and keeps the profile open', async () => {
    const t = await mount({ section: 'guide' }, { gradeLevel: '8th Grade' });
    await click(t.host.querySelector('[data-open-profile="banggai_cardinalfish"]'));
    const profile = () => t.host.querySelector('[data-marine-profile="banggai_cardinalfish"]');
    const keys = ['dx_banggai_cardinalfish_habitat', 'dx_banggai_cardinalfish_diet'];
    for (const k of keys) expect(has(profile(), en(k)), k + ' full').toBe(true);
    await click(profile().querySelector('input[data-rl21-switch]'));
    expect(profile()).not.toBe(null);
    for (const k of keys) { expect(has(profile(), en(k + '_simple')), k + ' simple').toBe(true); expect(has(profile(), en(k)), k + ' full gone').toBe(false); }
    expect(t.data.simpleWords).toBe(true);
  });

  it('shows the simple habitat in the look-alike comparison when the switch is on', async () => {
    const t = await mount({ section: 'guide', simpleWords: true }, { gradeLevel: '8th Grade' });
    await click(t.host.querySelector('[data-open-profile="varicose_phyllidia"]'));
    await click(t.host.querySelector('[data-marine-profile="varicose_phyllidia"] [data-start-comparison]'));
    const box = t.host.querySelector('[data-marine-comparison]');
    expect(box).not.toBe(null);
    expect(box.getAttribute('data-marine-comparison').split(':')).toContain('varicose_phyllidia');
    expect(has(box, en('dx_varicose_phyllidia_habitat_simple'))).toBe(true);
    expect(has(box, en('dx_varicose_phyllidia_habitat'))).toBe(false);
  });

  it('updates the food web diet panel for the humphead wrasse when the switch changes', async () => {
    const t = await mount({ section: 'science', sciTopic: 'web', sciWeb: { sel: 'humphead_wrasse' } }, { gradeLevel: '8th Grade' });
    const panel = () => t.host.querySelector('[data-fw-panel="humphead_wrasse"]');
    expect(panel()).not.toBe(null);
    expect(has(panel(), en('dx_humphead_wrasse_diet'))).toBe(true);
    await click(t.host.querySelector('input[data-rl21-switch]'));
    expect(t.data.simpleWords).toBe(true);
    expect(has(panel(), en('dx_humphead_wrasse_diet_simple'))).toBe(true);
    expect(has(panel(), en('dx_humphead_wrasse_diet'))).toBe(false);
  });
});
