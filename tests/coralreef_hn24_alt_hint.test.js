import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// Round 24, lane hint. When a Species guide search word is only in the reading level the student is
// NOT reading (sr23 "alt" excerpt), "Read matching section" still opens the profile in their chosen
// level. One plain sentence under the alt excerpt says which way to turn the Simpler words switch,
// and the button is described by it. Normal excerpts get no hint. The button and the level are unchanged.

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const SRC = readFileSync(TOOL, 'utf8');
let loadTool, resetStemLab, React, ReactDOMClient;
beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ loadTool, resetStemLab, React, ReactDOMClient } = mod);
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'coralReef');
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
const card = (host, id) => host.querySelector('[data-species="' + id + '"]');
const TOGGLE = () => en('rl21_simple');

describe('Species guide: hint on an excerpt from the other reading level (hn24)', () => {
  it('uses the real switch label, and the hint keys exist', () => {
    expect(TOGGLE()).toBe('Simpler words');
    expect(SRC).toContain("__alloT('stem.coralreef.rl21_simple', 'Simpler words')");
    expect(en('hn24_turn_off')).toBe('Turn off {toggle} to read it there.');
    expect(en('hn24_turn_on')).toBe('Turn on {toggle} to read it there.');
  });

  it('simpler words on, word only in the full text: "Turn off Simpler words", linked to the button', async () => {
    const g = await mount({ section: 'guide', guideSearchMode: 'description', simpleWords: true });
    await query(g, 'everted');
    const row = card(g.host, 'crown_of_thorns').querySelector('[data-guide-match-field="diet"]');
    expect(row.getAttribute('data-guide-match-alt')).toBe('full');
    const hint = row.querySelector('[data-guide-match-hint]');
    expect(hint, 'hint shown').not.toBe(null);
    expect(hint.getAttribute('data-guide-match-hint')).toBe('full');
    expect(hint.textContent).toBe('Turn off ' + TOGGLE() + ' to read it there.');
    const btn = row.querySelector('[data-read-match="diet"]');
    expect(hint.id).toBeTruthy();
    expect(btn.getAttribute('aria-describedby')).toBe(hint.id);
    expect(g.host.querySelectorAll('[id="' + hint.id + '"]').length).toBe(1);
    // The hint sits between the excerpt and the button.
    expect(hint.compareDocumentPosition(btn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(row.querySelector('p').textContent).toContain(en('dx_crown_of_thorns_diet'));
  });

  it('simpler words off, word only in the simple text: "Turn on Simpler words"', async () => {
    const g = await mount({ section: 'guide', guideSearchMode: 'description', simpleWords: false });
    await query(g, 'bendy');
    const row = card(g.host, 'textile_cone').querySelector('[data-guide-match-field="behavior"]');
    expect(row.getAttribute('data-guide-match-alt')).toBe('simple');
    const hint = row.querySelector('[data-guide-match-hint="simple"]');
    expect(hint, 'hint shown').not.toBe(null);
    expect(hint.textContent).toBe('Turn on ' + TOGGLE() + ' to read it there.');
    expect(row.querySelector('[data-read-match="behavior"]').getAttribute('aria-describedby')).toBe(hint.id);
  });

  it('no hint on a normal excerpt, and no aria-describedby on its button', async () => {
    const g = await mount({ section: 'guide', guideSearchMode: 'description', simpleWords: true });
    await query(g, 'stomach');
    const row = card(g.host, 'crown_of_thorns').querySelector('[data-guide-match-field="diet"]');
    expect(row.hasAttribute('data-guide-match-alt')).toBe(false);
    expect(row.querySelector('[data-guide-match-hint]')).toBe(null);
    expect(row.querySelector('[data-read-match="diet"]').hasAttribute('aria-describedby')).toBe(false);
    expect(row.textContent).not.toContain('to read it there');
    // No hint anywhere on the page for this search.
    expect(g.host.querySelectorAll('[data-guide-match-hint]').length).toBe(0);
  });

  it('a mixed card: only the alt row has the hint', async () => {
    const g = await mount({ section: 'guide', guideSearchMode: 'description', simpleWords: true });
    await query(g, 'wrasse inspected');
    const c = card(g.host, 'cleaner_wrasse');
    const rows = Array.from(c.querySelectorAll('[data-guide-match-field]'));
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const hint = row.querySelector('[data-guide-match-hint]');
      if (row.hasAttribute('data-guide-match-alt')) expect(hint, 'alt row has a hint').not.toBe(null);
      else expect(hint, 'plain row has no hint').toBe(null);
    }
    expect(c.querySelectorAll('[data-guide-match-hint]').length).toBe(c.querySelectorAll('[data-guide-match-alt]').length);
  });

  it('the button still opens the profile at that section, in the chosen level', async () => {
    const g = await mount({ section: 'guide', guideSearchMode: 'description', simpleWords: true });
    await query(g, 'everted');
    const btn = card(g.host, 'crown_of_thorns').querySelector('[data-guide-match-alt="full"] [data-read-match="diet"]');
    expect(btn.querySelector('[data-guide-match-hint]')).toBe(null);
    await React.act(async () => { btn.click(); });
    expect(g.data.simpleWords).toBe(true);
    const sw = g.host.querySelector('[data-rl21-toggle] input[data-rl21-switch]');
    expect(sw, 'Simpler words switch in the profile').not.toBe(null);
    expect(sw.checked).toBe(true);
    // The profile shows the simple diet (the level was not switched for the student).
    expect(g.host.textContent).toContain(en('dx_crown_of_thorns_diet_simple'));
    expect(g.host.textContent).not.toContain(en('dx_crown_of_thorns_diet'));
  });

  it('uses theme text colours: the hint is the muted colour, readable on the excerpt box', async () => {
    const want = { light: '#476366', dark: '#b3cecc', contrast: '#f1f5f9' };
    for (const theme of Object.keys(want)) {
      const g = await mount({ section: 'guide', guideSearchMode: 'description', simpleWords: true }, { theme });
      await query(g, 'everted');
      const hint = g.host.querySelector('[data-guide-match-hint]');
      const rgb = hint.style.color.match(/\d+/g).map(Number);
      const hex = '#' + rgb.map((n) => n.toString(16).padStart(2, '0')).join('');
      expect(hex, theme).toBe(want[theme]);
    }
  });
});
