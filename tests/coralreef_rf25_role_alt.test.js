import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// Round 25, lane role. With a reef role chosen, diet matches move out of the excerpt list into the
// role note (which shows the diet in the student's level). When the search word is only in the OTHER
// version of the diet, the role note now also shows that version's excerpt with the sr23 label and the
// hn24 hint, and its "Read matching section" button is described by the hint. Shown-level words: unchanged.

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
async function select(el, value) {
  expect(el).toBeTruthy();
  await React.act(async () => { el.focus(); el.value = value; el.dispatchEvent(new Event('change', { bubbles: true })); });
}
const EN = new Map();
for (const m of SRC.matchAll(/__alloT\((['"])stem\.coralreef\.([A-Za-z0-9_]+)\1,\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g)) if (!EN.has(m[2])) EN.set(m[2], vm.runInNewContext(m[3]));
const en = (k) => EN.get(k);
const card = (host, id) => host.querySelector('[data-species="' + id + '"]');
const has = (s, w) => s.toLowerCase().includes(w);

async function roleSearch(simpleWords, words, extra) {
  const g = await mount({ section: 'guide', guideSearchMode: 'description', simpleWords }, extra);
  await select(g.host.querySelector('[data-guide-role]'), 'coral_eaters');
  await query(g, words);
  return g;
}

describe('Species guide: role note shows an excerpt from the other reading level (rf25)', () => {
  it('test words are in one diet version only (data precondition)', () => {
    const full = en('dx_crown_of_thorns_diet'), simple = en('dx_crown_of_thorns_diet_simple');
    expect(full && simple).toBeTruthy();
    expect(has(full, 'everted') && !has(simple, 'everted')).toBe(true);
    expect(has(simple, 'crusty') && !has(full, 'crusty')).toBe(true);
    expect(has(simple, 'stomach') && has(full, 'stomach')).toBe(true);
  });

  it('simpler words on, role chosen, word only in the full diet: full excerpt, label, hint, describedby', async () => {
    const g = await roleSearch(true, 'everted');
    const c = card(g.host, 'crown_of_thorns');
    expect(c, 'card listed').not.toBe(null);
    const note = c.querySelector('[data-guide-role-note="crown_of_thorns"]');
    expect(note, 'role note').not.toBe(null);
    // The note still starts with the diet the student is reading.
    expect(note.querySelector('p').textContent).toBe('What it eats: ' + en('dx_crown_of_thorns_diet_simple'));
    const alt = note.querySelector('[data-guide-match-alt="full"]');
    expect(alt, 'alt excerpt in the role note').not.toBe(null);
    expect(alt.textContent).toBe('What it eats, in the full text: ' + en('dx_crown_of_thorns_diet'));
    const hint = note.querySelector('[data-guide-match-hint="full"]');
    expect(hint, 'hint').not.toBe(null);
    expect(hint.textContent).toBe('Turn off Simpler words to read it there.');
    expect(hint.id).toBeTruthy();
    expect(g.host.querySelectorAll('[id="' + hint.id + '"]').length).toBe(1);
    const btn = note.querySelector('[data-read-match="diet"]');
    expect(btn.getAttribute('aria-describedby')).toBe(hint.id);
    expect(alt.compareDocumentPosition(hint) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(hint.compareDocumentPosition(btn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // No second diet row in the excerpt list, and one hint per alt excerpt on the card.
    expect(c.querySelector('[data-guide-match-field="diet"]')).toBe(null);
    expect(c.querySelectorAll('[data-guide-match-hint]').length).toBe(c.querySelectorAll('[data-guide-match-alt]').length);
  });

  it('simpler words off, role chosen, word only in the simple diet: "Turn on Simpler words"', async () => {
    const g = await roleSearch(false, 'crusty');
    const note = card(g.host, 'crown_of_thorns').querySelector('[data-guide-role-note]');
    expect(note.querySelector('p').textContent).toBe('What it eats: ' + en('dx_crown_of_thorns_diet'));
    const alt = note.querySelector('[data-guide-match-alt="simple"]');
    expect(alt, 'alt excerpt').not.toBe(null);
    expect(alt.textContent).toBe('What it eats, in simpler words: ' + en('dx_crown_of_thorns_diet_simple'));
    const hint = note.querySelector('[data-guide-match-hint="simple"]');
    expect(hint.textContent).toBe('Turn on Simpler words to read it there.');
    expect(note.querySelector('[data-read-match="diet"]').getAttribute('aria-describedby')).toBe(hint.id);
  });

  it('word in the shown diet: role note unchanged (no alt, no hint, no describedby)', async () => {
    const g = await roleSearch(true, 'stomach');
    const note = card(g.host, 'crown_of_thorns').querySelector('[data-guide-role-note]');
    expect(note.querySelector('[data-guide-match-alt]')).toBe(null);
    expect(note.querySelector('[data-guide-match-hint]')).toBe(null);
    const btn = note.querySelector('[data-read-match="diet"]');
    expect(btn, 'read matching section').not.toBe(null);
    expect(btn.hasAttribute('aria-describedby')).toBe(false);
    expect(note.textContent).toBe('What it eats: ' + en('dx_crown_of_thorns_diet_simple') + 'Read matching section');
    expect(g.host.querySelectorAll('[data-guide-match-hint]').length).toBe(0);
  });

  it('no role chosen: the normal alt excerpt row is still used (no role note)', async () => {
    const g = await mount({ section: 'guide', guideSearchMode: 'description', simpleWords: true });
    await query(g, 'everted');
    const c = card(g.host, 'crown_of_thorns');
    expect(c.querySelector('[data-guide-role-note]')).toBe(null);
    expect(c.querySelector('[data-guide-match-field="diet"]').getAttribute('data-guide-match-alt')).toBe('full');
    expect(c.querySelectorAll('[data-guide-match-hint]').length).toBe(1);
  });

  it('the role note button still opens the diet in the chosen level, and focus comes back to it', async () => {
    const g = await roleSearch(true, 'everted');
    const sel = '[data-guide-role-note="crown_of_thorns"] [data-read-match="diet"]';
    await React.act(async () => { g.host.querySelector(sel).click(); });
    expect(g.data.simpleWords).toBe(true);
    expect(g.host.textContent).toContain(en('dx_crown_of_thorns_diet_simple'));
    expect(g.host.textContent).not.toContain(en('dx_crown_of_thorns_diet'));
    const close = g.host.querySelector('[data-close-profile]');
    expect(close, 'close profile').not.toBe(null);
    await React.act(async () => { close.click(); });
    await React.act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(document.activeElement).toBe(g.host.querySelector(sel));
    expect(document.activeElement.getAttribute('aria-describedby')).toBe(g.host.querySelector('[data-guide-role-note] [data-guide-match-hint]').id);
  });

  it('hint uses the muted theme colour in light, dark and contrast', async () => {
    const want = { light: '#476366', dark: '#b3cecc', contrast: '#f1f5f9' };
    for (const theme of Object.keys(want)) {
      const g = await roleSearch(true, 'everted', { theme });
      const hint = g.host.querySelector('[data-guide-role-note] [data-guide-match-hint]');
      expect(hint, theme).not.toBe(null);
      const rgb = hint.style.color.match(/\d+/g).map(Number);
      expect('#' + rgb.map((n) => n.toString(16).padStart(2, '0')).join(''), theme).toBe(want[theme]);
    }
  });
});
