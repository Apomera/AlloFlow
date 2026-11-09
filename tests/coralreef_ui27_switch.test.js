import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// Round 27, lane ui. The Simpler words switch sits where its text is read:
// - the Species guide search controls (the alt-excerpt hint names it, and the cards follow it);
// - the profile, ABOVE the role paragraph it changes, so flipping it does not move it;
// - the look-alike comparison, after its intro.
// Every switch is the same: a checkbox with role switch, named "Simpler words" by its label,
// described by its own note, with no duplicate ids. Guide card grids use auto-fill, so a lone
// result keeps the width of one column instead of filling the row.

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
const click = (el) => React.act(async () => { el.click(); await new Promise((r) => setTimeout(r, 5)); });
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
const has = (el, text) => el.textContent.includes(text);

// The same accessible switch wherever it is, and every id on the page used once.
function expectSwitch(host, input, where) {
  expect(input, where + ' switch').not.toBe(null);
  expect(input.closest('[data-rl21-toggle]').getAttribute('data-rl21-toggle')).toBe(where);
  expect(input.type).toBe('checkbox');
  expect(input.getAttribute('role')).toBe('switch');
  const label = input.closest('label');
  expect(label && label.textContent.trim()).toBe(en('rl21_simple'));
  const noteId = input.getAttribute('aria-describedby');
  expect(noteId).toBeTruthy();
  expect(host.querySelectorAll('[id="' + noteId + '"]').length).toBe(1);
  expect(document.getElementById(noteId).textContent).toBe(en('rl21_simple_note'));
  expect(input.closest('[hidden]')).toBe(null);
}
function expectNoDuplicateIds(host) {
  const seen = {};
  host.querySelectorAll('[id]').forEach((el) => { seen[el.id] = (seen[el.id] || 0) + 1; });
  expect(Object.keys(seen).filter((k) => seen[k] > 1)).toEqual([]);
}

describe('ui27: a Simpler words switch in the Species guide search controls', () => {
  it('is in the search controls, labelled and described like every other switch', async () => {
    const t = await mount({ section: 'guide' }, { gradeLevel: '8th Grade' });
    const all = t.host.querySelectorAll('input[data-rl21-switch]');
    expect(all.length).toBe(1);
    expectSwitch(t.host, t.host.querySelector('.crds-controls [data-rl21-toggle="search"] input[data-rl21-switch]'), 'search');
    expect(all[0].checked).toBe(false);
    expectNoDuplicateIds(t.host);
  });

  it('is beside the hint that names it: flipping it shows the excerpt in the reading level, keeps focus, and saves', async () => {
    const t = await mount({ section: 'guide', guideSearchMode: 'description', simpleWords: true });
    await query(t, 'everted');
    const row = () => t.host.querySelector('[data-species="crown_of_thorns"] [data-guide-match-field="diet"]');
    expect(row().getAttribute('data-guide-match-alt')).toBe('full');
    expect(row().querySelector('[data-guide-match-hint="full"]').textContent).toBe('Turn off ' + en('rl21_simple') + ' to read it there.');
    const input = t.host.querySelector('.crds-controls input[data-rl21-switch]');
    expectSwitch(t.host, input, 'search');
    expect(input.checked).toBe(true);
    // The switch comes before the results, so nothing it changes sits above it.
    expect(input.compareDocumentPosition(row()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await React.act(async () => { input.focus(); });
    await click(input);
    expect(t.data.simpleWords).toBe(false);
    expect(document.activeElement).toBe(input);
    expect(t.host.querySelector('.crds-controls input[data-rl21-switch]')).toBe(input);
    expect(input.checked).toBe(false);
    // The word is now in the shown text: a plain excerpt, no hint.
    expect(row().hasAttribute('data-guide-match-alt')).toBe(false);
    expect(row().textContent).toContain(en('dx_crown_of_thorns_diet'));
    expect(t.host.querySelectorAll('[data-guide-match-hint]').length).toBe(0);
    expectNoDuplicateIds(t.host);
  });

  it('the opened profile follows the level chosen on the guide', async () => {
    const t = await mount({ section: 'guide', guideSearchMode: 'description', simpleWords: true });
    await query(t, 'everted');
    await click(t.host.querySelector('.crds-controls input[data-rl21-switch]'));
    await React.act(async () => { t.host.querySelector('[data-species="crown_of_thorns"] [data-read-match="diet"]').click(); });
    const profile = t.host.querySelector('[data-marine-profile="crown_of_thorns"]');
    expect(profile).not.toBe(null);
    expect(t.host.querySelectorAll('input[data-rl21-switch]').length).toBe(1);
    expect(profile.querySelector('input[data-rl21-switch]').checked).toBe(false);
    expect(has(profile, en('dx_crown_of_thorns_diet'))).toBe(true);
    expect(has(profile, en('dx_crown_of_thorns_diet_simple'))).toBe(false);
  });
});

describe('ui27: the profile switch sits above the role paragraph it changes', () => {
  it('comes before the role, after the name and badges, and keeps focus when flipped', async () => {
    const t = await mount({ section: 'guide' }, { gradeLevel: '8th Grade' });
    await click(t.host.querySelector('[data-open-profile="clownfish"]'));
    const profile = t.host.querySelector('[data-marine-profile="clownfish"]');
    const inputs = profile.querySelectorAll('input[data-rl21-switch]');
    expect(inputs.length).toBe(1);
    const input = inputs[0];
    expectSwitch(t.host, input, 'guide');
    const role = profile.querySelector('[data-profile-reading="role"]');
    const title = profile.querySelector('.crdx-title');
    expect(input.compareDocumentPosition(role) & Node.DOCUMENT_POSITION_FOLLOWING, 'switch before role').toBeTruthy();
    expect(title.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING, 'switch after the name').toBeTruthy();
    // Nothing above the switch in the profile is a reading-level text.
    const before = Array.from(profile.querySelectorAll('[data-profile-reading]')).filter((el) => el.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(before.map((el) => el.getAttribute('data-profile-reading'))).toEqual([]);
    expect(has(role, en('sp_clownfish_role'))).toBe(true);
    await React.act(async () => { input.focus(); });
    await click(input);
    expect(document.activeElement).toBe(input);
    expect(t.data.simpleWords).toBe(true);
    expect(has(profile.querySelector('[data-profile-reading="role"]'), en('sp_clownfish_role_simple'))).toBe(true);
    expectNoDuplicateIds(t.host);
  });
});

describe('ui27: the look-alike comparison has its own switch', () => {
  it('flips the compared values in place, keeps focus and the comparison open', async () => {
    const t = await mount({ section: 'guide', simpleWords: true }, { gradeLevel: '8th Grade' });
    await click(t.host.querySelector('[data-open-profile="textile_cone"]'));
    await click(t.host.querySelector('[data-marine-profile="textile_cone"] [data-start-comparison]'));
    const box = () => t.host.querySelector('[data-marine-comparison]');
    expect(box()).not.toBe(null);
    const inputs = box().querySelectorAll('input[data-rl21-switch]');
    expect(inputs.length).toBe(1);
    const input = inputs[0];
    expectSwitch(t.host, input, 'compare');
    expect(input.checked).toBe(true);
    // After the intro, before the values it changes.
    expect(box().querySelector('.crcmp-intro').compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(input.compareDocumentPosition(box().querySelector('[data-comparison-row="habitat"]')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(has(box(), en('dx_textile_cone_habitat_simple'))).toBe(true);
    await React.act(async () => { input.focus(); });
    await click(input);
    expect(box()).not.toBe(null);
    expect(document.activeElement).toBe(input);
    expect(t.data.simpleWords).toBe(false);
    expect(has(box(), en('dx_textile_cone_habitat'))).toBe(true);
    expect(has(box(), en('dx_textile_cone_habitat_simple'))).toBe(false);
    expectNoDuplicateIds(t.host);
  });
});

describe('ui27: a lone guide result keeps the width of one column', () => {
  it('full and compact card grids use auto-fill, not auto-fit', () => {
    const line = SRC.split('\n').find((l) => l.includes("gridTemplateColumns: browseGrid ? 'repeat(auto-fill, minmax(min(100%, 124px), 1fr))'"));
    expect(line, 'guide card grid line').toBeTruthy();
    const cols = line.match(/gridTemplateColumns: (browseGrid[^}]*?), gap:/)[1];
    expect(cols).toContain("compact ? 'repeat(auto-fill, minmax(min(100%, 230px), 1fr))'");
    expect(cols).toContain(": 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))'");
    expect(cols).not.toContain('auto-fit');
  });
});
