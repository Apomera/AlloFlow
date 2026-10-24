import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, renderTool, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

// Notes belong to a species and save through the host data contract. Writing
// observations must never count as a dive discovery or an identification answer.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const act = React.act;
const mounted = [];
let X;

beforeEach(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef;
});

afterEach(async () => {
  while (mounted.length) {
    const item = mounted.pop();
    await act(async () => item.root.unmount());
    item.host.remove();
  }
  vi.restoreAllMocks();
});

async function mountTool(seed = {}, extra = {}) {
  let data = { coralReef: { section: 'guide', guideSpeciesId: 'clownfish', ...seed } };
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  function Shell() {
    const [state, setState] = React.useState(data);
    data = state;
    return cfg.render({ React, toolData: state, setToolData: setState, t: (key, fallback) => fallback || key, ...extra });
  }
  const item = { host, root, get data() { return data; } };
  mounted.push(item);
  await act(async () => root.render(React.createElement(Shell)));
  return item;
}
async function write(element, value) {
  expect(element, 'the species has a notes textarea').toBeTruthy();
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function click(element) {
  expect(element, 'navigation control exists').toBeTruthy();
  await act(async () => { element.click(); await Promise.resolve(); });
}
const notes = (host, id) => host.querySelector('[data-species-field-notes="' + id + '"]');
const buttonText = (host, text) => [...host.querySelectorAll('button')].find((button) => button.textContent.trim() === text);

function expectDescribedTextarea(host, textarea) {
  expect(textarea.labels).toHaveLength(1);
  expect(textarea.labels[0].textContent).toBe('Your field notes');
  const ids = textarea.getAttribute('aria-describedby').split(/\s+/);
  expect(ids).toHaveLength(2);
  const descriptions = ids.map((id) => [...host.querySelectorAll('[id]')].find((element) => element.id === id));
  expect(descriptions.every(Boolean)).toBe(true);
  expect(descriptions[0].textContent).toBe('Your notes save automatically. Keep your own observations here, separate from dive discoveries.');
  expect(descriptions[1].textContent).toBe(textarea.value.length + ' / 600 characters');
  expect(textarea.maxLength).toBe(600);
}

describe('marine personal field notes', () => {
  it('accepts only own species strings, keeps whitespace, caps text and prevents inherited or prototype keys', () => {
    for (const bad of [undefined, null, [], 'wrong', 17, true]) expect(Object.keys(X.marineFieldNotes(bad))).toEqual([]);
    const raw = Object.create({ clownfish: 'Inherited text must not become a personal note.' });
    raw.blue_tang = '  Blue along the flank.\n\nSwam above the coral.  ';
    raw.green_turtle = 'x'.repeat(620);
    raw.hawksbill_turtle = '';
    raw.reef_star = 'A note about restoration equipment.';
    raw.giant_clam = ['not a note'];
    raw.brain_coral = { text: 'not a note' };
    raw.made_up = 'Unknown organism';
    Object.defineProperty(raw, '__proto__', { value: 'polluted', enumerable: true });
    const getter = vi.fn(() => 'Do not evaluate accessors in saved data.');
    Object.defineProperty(raw, 'lionfish', { get: getter, enumerable: true });
    const result = X.marineFieldNotes(raw);
    expect(Object.getPrototypeOf(result)).toBeNull();
    expect(Object.keys(result).sort()).toEqual(['blue_tang', 'green_turtle', 'reef_star']);
    expect(result.blue_tang).toBe(raw.blue_tang);
    expect(result.green_turtle).toHaveLength(600);
    expect(result.reef_star).toBe(raw.reef_star);
    expect(getter).not.toHaveBeenCalled();
    expect(raw.green_turtle).toHaveLength(620);
    expect({}.polluted).toBeUndefined();
    const all = Object.fromEntries(X.SPECIES_META.map((meta) => [meta.id, 'One personal observation.']));
    expect(Object.keys(X.marineFieldNotes(all))).toHaveLength(X.SPECIES_META.length);
  });

  it('auto-saves each edit immediately, keeps accessible IDs stable and restores notes after reopening', async () => {
    const t = await mountTool();
    const textarea = notes(t.host, 'clownfish'), id = textarea.id;
    expectDescribedTextarea(t.host, textarea);
    expect(t.data.coralReef.speciesFieldNotes).toBeUndefined();
    await write(textarea, '  Hovered beside the tentacles.\n');
    expect(t.data.coralReef.speciesFieldNotes.clownfish).toBe('  Hovered beside the tentacles.\n');
    expect(notes(t.host, 'clownfish')).toBe(textarea);
    expect(textarea.id).toBe(id);
    await write(textarea, '  Hovered beside the tentacles.\nThen hid.  ');
    expect(t.data.coralReef.speciesFieldNotes.clownfish).toBe(textarea.value);
    expectDescribedTextarea(t.host, textarea);
    const reopened = await mountTool(t.data.coralReef);
    expect(notes(reopened.host, 'clownfish').value).toBe('  Hovered beside the tentacles.\nThen hid.  ');
    expect(notes(reopened.host, 'clownfish').id).not.toBe(id);
    expectDescribedTextarea(reopened.host, notes(reopened.host, 'clownfish'));
  });

  it('keeps notes attached to each species while navigating profiles and deletes only an emptied note', async () => {
    const t = await mountTool({ speciesFieldNotes: { green_turtle: 'Already recorded.' } });
    await write(notes(t.host, 'clownfish'), 'Three white bands.');
    await click(buttonText(t.host, 'Next'));
    expect(t.data.coralReef.guideSpeciesId).toBe('blue_tang');
    expect(notes(t.host, 'blue_tang').value).toBe('');
    await write(notes(t.host, 'blue_tang'), 'Yellow tail, blue body.\n');
    await click(buttonText(t.host, 'Previous'));
    expect(notes(t.host, 'clownfish').value).toBe('Three white bands.');
    await write(notes(t.host, 'clownfish'), '');
    expect(Object.hasOwn(t.data.coralReef.speciesFieldNotes, 'clownfish')).toBe(false);
    expect(t.data.coralReef.speciesFieldNotes.blue_tang).toBe('Yellow tail, blue body.\n');
    expect(t.data.coralReef.speciesFieldNotes.green_turtle).toBe('Already recorded.');
    await click(buttonText(t.host, 'Next'));
    expect(notes(t.host, 'blue_tang').value).toBe('Yellow tail, blue body.\n');
  });

  it('caps pasted and malformed restored text at 600 without altering discoveries, bookmarks or practice', async () => {
    const records = {
      speciesLog: { green_turtle: { firstSeen: 123, site: 'healthy' } },
      speciesBookmarks: { clownfish: true },
      speciesPractice: { rounds: 2, answered: 8, correct: 5, missed: ['blue_tang'] },
      diveLog: [{ siteId: 'healthy', duration: 60 }],
      practice: { point_1: true }
    };
    const awards = vi.fn();
    const t = await mountTool({ ...records, speciesFieldNotes: { clownfish: 'a'.repeat(650), blue_tang: 'Keep this note.', made_up: 'Ignore this.' } }, { awardXP: awards, tryAward: awards });
    const textarea = notes(t.host, 'clownfish');
    expect(textarea.value).toHaveLength(600);
    await write(textarea, 'b'.repeat(700));
    expect(textarea.value).toBe('b'.repeat(600));
    expect(t.data.coralReef.speciesFieldNotes.clownfish).toHaveLength(600);
    expect(Object.keys(t.data.coralReef.speciesFieldNotes).sort()).toEqual(['blue_tang', 'clownfish']);
    expectDescribedTextarea(t.host, textarea);
    for (const key of Object.keys(records)) expect(t.data.coralReef[key], key).toBe(records[key]);
    expect(t.data.coralReef.speciesLog.clownfish).toBeUndefined();
    expect(awards).not.toHaveBeenCalled();
  });

  it('renders notes in each host theme with literal labels and no added completion status', () => {
    for (const theme of ['light', 'dark', 'contrast']) {
      const html = renderTool('coralReef', { coralReef: { section: 'guide', guideSpeciesId: 'reef_star', speciesFieldNotes: { reef_star: 'My own observation.' } } }, { theme, reduceMotion: true });
      expect(html, theme).toContain('data-field-notes="reef_star"');
      expect(html, theme).toContain('My own observation.');
      expect(html, theme).toContain('Your notes save automatically. Keep your own observations here, separate from dive discoveries.');
      expect(html, theme).not.toContain('undefined');
      expect(html, theme).not.toContain('NaN');
    }
  });
});
