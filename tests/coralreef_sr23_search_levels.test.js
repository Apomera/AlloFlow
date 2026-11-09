import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// Round 23, lane search. Thirty guide passages have a full and a simpler version (rl21), and the
// Species guide shows one of them. Description search must find a word in EITHER version. A match
// found only in the version not shown gets that version's excerpt, labelled "..., in the full text"
// (or "..., in simpler words"); a word in the shown version keeps the shown excerpt, unlabelled.

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
async function query(t, value) {
  const el = t.host.querySelector('input[type=search]');
  await React.act(async () => {
    el.focus();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const EN = new Map();
for (const m of SRC.matchAll(/__alloT\((['"])stem\.coralreef\.([A-Za-z0-9_]+)\1,\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g)) if (!EN.has(m[2])) EN.set(m[2], vm.runInNewContext(m[3]));
const en = (k) => EN.get(k);
const t = (k, f) => f;
const card = (host, id) => host.querySelector('[data-species="' + id + '"]');

describe('Species guide search reads both reading levels (sr23)', () => {
  it('the test words sit in one version only', () => {
    expect(en('dx_crown_of_thorns_diet')).toMatch(/everted/);
    expect(en('dx_crown_of_thorns_diet_simple')).not.toMatch(/everted/);
    expect(en('sp_cleaner_wrasse_fact')).toMatch(/inspected/);
    expect(en('sp_cleaner_wrasse_fact_simple')).not.toMatch(/inspected/);
    expect(en('dx_textile_cone_behavior_simple')).toMatch(/bendy/);
    expect(en('dx_textile_cone_behavior')).not.toMatch(/bendy/);
  });

  it('matches a full-only word with simpler words on, and a simple-only word with them off', () => {
    const before = RL.now.on;
    try {
      RL.now.on = true;
      let TX = X.speciesText(t), PR = X.marineProfiles(t), CX = X.marineGuideLearningContext(t, TX);
      const hit = (q, id) => X.marineGuideSearch(q, TX[id], { id, scientific: '', group: '' }, PR[id], 'description', CX[id]);
      expect(PR.crown_of_thorns.diet).toBe(en('dx_crown_of_thorns_diet_simple'));
      expect(hit('everted', 'crown_of_thorns')).toBe(true);
      expect(hit('inspected', 'cleaner_wrasse')).toBe(true);
      expect(hit('everted inspected', 'crown_of_thorns')).toBe(false);
      const ev = X.marineGuideSearchEvidence('everted', TX.crown_of_thorns, { id: 'crown_of_thorns' }, PR.crown_of_thorns, CX.crown_of_thorns);
      expect(ev).toEqual([{ field: 'diet', text: en('dx_crown_of_thorns_diet'), alt: 'full' }]);
      // A word in the version being read keeps that excerpt, with no label.
      const shown = X.marineGuideSearchEvidence('stomach', TX.crown_of_thorns, { id: 'crown_of_thorns' }, PR.crown_of_thorns, CX.crown_of_thorns);
      expect(shown).toEqual([{ field: 'diet', text: en('dx_crown_of_thorns_diet_simple') }]);

      RL.now.on = false;
      TX = X.speciesText(t); PR = X.marineProfiles(t); CX = X.marineGuideLearningContext(t, TX);
      expect(PR.textile_cone.behavior).toBe(en('dx_textile_cone_behavior'));
      expect(hit('bendy', 'textile_cone')).toBe(true);
      const ev2 = X.marineGuideSearchEvidence('bendy', TX.textile_cone, { id: 'textile_cone' }, PR.textile_cone, CX.textile_cone);
      expect(ev2).toEqual([{ field: 'behavior', text: en('dx_textile_cone_behavior_simple'), alt: 'simple' }]);
    } finally { RL.now.on = before; }
  });

  it('shows a full-only match in the guide with simpler words on, labelled as the full text', async () => {
    const g = await mount({ section: 'guide', guideSearchMode: 'description', simpleWords: true });
    await query(g, 'everted');
    const c = card(g.host, 'crown_of_thorns');
    expect(c, 'crown-of-thorns card shown').not.toBe(null);
    const match = c.querySelector('[data-guide-match-field="diet"]');
    expect(match.getAttribute('data-guide-match-alt')).toBe('full');
    expect(match.textContent).toContain(en('dx_diet') + ', in the full text: ' + en('dx_crown_of_thorns_diet'));
    expect(match.querySelector('[data-read-match="diet"]')).not.toBe(null);
    // The count line counts it like any other match.
    expect(g.host.querySelector('[data-guide-result-count]').textContent).not.toContain(en('ds_search_none'));
    // A word in the simple text the student reads: plain excerpt, no label.
    await query(g, 'stomach');
    const plain = card(g.host, 'crown_of_thorns').querySelector('[data-guide-match-field="diet"]');
    expect(plain.hasAttribute('data-guide-match-alt')).toBe(false);
    expect(plain.textContent).toContain(en('dx_diet') + ': ' + en('dx_crown_of_thorns_diet_simple'));
    expect(plain.textContent).not.toContain('in the full text');
  });

  it('shows a simple-only match with simpler words off, labelled as simpler words', async () => {
    const g = await mount({ section: 'guide', guideSearchMode: 'description', simpleWords: false });
    await query(g, 'bendy');
    const c = card(g.host, 'textile_cone');
    expect(c, 'textile cone card shown').not.toBe(null);
    const match = c.querySelector('[data-guide-match-field="behavior"]');
    expect(match.getAttribute('data-guide-match-alt')).toBe('simple');
    expect(match.textContent).toContain(en('dx_behavior') + ', in simpler words: ' + en('dx_textile_cone_behavior_simple'));
  });

  it('a search mixing a shown word and a full-only word still finds the entry', async () => {
    const g = await mount({ section: 'guide', guideSearchMode: 'description', simpleWords: true });
    await query(g, 'wrasse inspected');
    const c = card(g.host, 'cleaner_wrasse');
    expect(c, 'cleaner wrasse card shown').not.toBe(null);
    const alt = c.querySelector('[data-guide-match-alt="full"]');
    expect(alt).not.toBe(null);
    expect(alt.textContent).toContain(en('sp_cleaner_wrasse_fact'));
  });
});
