import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { setupDinoLab, internals, renderTab } from './helpers/dino_lab_harness.js';
const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
let api, root, host, data;
beforeAll(() => { api = setupDinoLab(); globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
afterEach(async () => { if (root) await api.React.act(async () => root.unmount()); root = null; host?.remove(); });
async function mount(initial) {
  document.body.innerHTML = ''; data = initial; host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  const render = () => root.render(api.tool.cfg.render({ React: api.React, toolData: { dinoLab: data }, updateMulti: (_, patch) => { data = { ...data, ...patch }; render(); }, announceToSR() {} }));
  await api.React.act(async () => render());
}
const button = text => [...host.querySelectorAll('button')].find(n => n.textContent === text);
async function click(node) { expect(node).toBeTruthy(); await api.React.act(async () => node.click()); }
const allCells = Array.from({ length: 24 }, (_, i) => i);
function ambiguousSite() {
  const I = internals();
  for (let seed = 1; seed <= 100; seed++) {
    const site = I.digSiteFor(seed);
    const state = { digRevealed: allCells, digGuess: site.chosen.id, digCitedClues: ['period', 'diet'] };
    if (I.digEvidenceCheck(site, state).kind === 'ambiguous') return site;
  }
  throw new Error('Expected an early ambiguous case');
}
describe('bounded evidence-based excavation', () => {
  it('offers six unique, deterministic candidates and every site can be resolved', () => {
    const I = internals(), positions = new Set();
    for (let seed = 1; seed <= 100; seed++) {
      const site = I.digSiteFor(seed);
      expect(site.candidates).toHaveLength(6);
      expect(new Set(site.candidates.map(d => d.id)).size).toBe(6);
      expect(site.candidates.every(d => d.group !== 'other')).toBe(true);
      expect(I.digSiteFor(seed)).toEqual(site);
      positions.add(site.candidates.findIndex(d => d.id === site.chosen.id));
      expect(Math.max(...site.clues.map(c => c.at))).toBeLessThanOrEqual(Object.keys(site.boneCells).length);
      const result = I.digEvidenceCheck(site, { digRevealed: allCells, digGuess: site.chosen.id, digCitedClues: site.clues.map(c => c.id) });
      expect(result.kind).toBe('match'); expect(result.matches.map(d => d.id)).toEqual([site.chosen.id]);
    }
    expect(positions.size).toBe(6);
  });
  it('does not reveal the hidden answer when cited clues fit several candidates', () => {
    const I = internals(), site = ambiguousSite();
    const state = { digRevealed: allCells, digGuess: site.chosen.id, digCitedClues: ['period', 'diet'] };
    const result = I.digEvidenceCheck(site, state);
    expect(result.kind).toBe('ambiguous'); expect(result.matches.length).toBeGreaterThan(1);
    const alternative = result.matches.find(d => d.id !== site.chosen.id);
    const other = I.digEvidenceCheck(site, { ...state, digGuess: alternative.id });
    expect(other.kind).toBe('ambiguous'); expect(other.matches).toEqual(result.matches);
  });
  it('rejects conflicting clues without awarding completion', () => {
    const I = internals(), site = I.digSiteFor(7), wrong = site.candidates.find(d => d.id !== site.chosen.id);
    const result = I.digEvidenceCheck(site, { digRevealed: allCells, digGuess: wrong.id, digCitedClues: site.clues.map(c => c.id) });
    expect(result.kind).toBe('conflict'); expect(result.conflicts.length).toBeGreaterThan(0);
    expect(result.conflicts.every(c => result.used.includes(c))).toBe(true);
  });
  it('cannot unlock or cite evidence through duplicate, invalid, or unrevealed state', () => {
    const I = internals(), site = I.digSiteFor(1), bone = Number(Object.keys(site.boneCells)[0]);
    expect(I.digRevealedCells([bone, bone, -1, 24, '1', {}, null])).toEqual([bone]);
    const result = I.digEvidenceCheck(site, { digRevealed: Array(50).fill(bone), digGuess: site.chosen.id, digCitedClues: site.clues.map(c => c.id) });
    expect(result.kind).toBe('missing'); expect(result.used).toHaveLength(1);
    expect(I.digEvidenceCheck(site, { digRevealed: allCells, digGuess: 'not_a_candidate', digCitedClues: ['period', 'period'] }).kind).toBe('missing');
    for (const value of [Infinity, NaN, -6, {}, 'bad']) expect(I.digSiteFor(value).seed).toBe(1);
  });
  it('translates clue labels without changing the evidence or candidate set', () => {
    const I = internals(), original = I.digSiteFor(3), translated = I.digSiteFor(3, key => 'Translated ' + key);
    expect(translated.candidates.map(d => d.id)).toEqual(original.candidates.map(d => d.id));
    expect(translated.clues.map(c => c.value)).toEqual(original.clues.map(c => c.value));
    expect(translated.clues.every(c => c.label.startsWith('Translated stem.dinolab.dig_clue_'))).toBe(true);
  });
  it('preserves legacy completions without inventing a record of cited evidence', () => {
    const html = renderTab({ tab: 'dig', digSeed: 3, digSolvedFor: 3 });
    expect(html).toContain('Previously identified in this activity:');
    expect(html).not.toContain('Your cited clues identify');
    expect(html).toContain('Review the five alternatives');
  });
  it('requires evidence, handles ambiguity and conflict, records once, and preserves notebook writing', async () => {
    const site = ambiguousSite(), other = site.candidates.find(d => d.id !== site.chosen.id);
    const notes = { [site.chosen.id]: { question: 'My earlier question', inference: 'My earlier explanation' }, microraptor: { question: 'Wings?' } };
    await mount({ tab: 'dig', digSeed: site.seed, notebook: notes });
    expect(host.querySelectorAll('[data-dig-candidate]')).toHaveLength(6);
    await click(host.querySelector('[data-dig-candidate="' + site.chosen.id + '"] button'));
    expect(data.digSolvedFor).toBeUndefined(); expect(button('Check my evidence').disabled).toBe(true);
    await click(button('Use a prepared sample'));
    expect(host.textContent).toContain('🦴');
    expect(host.querySelectorAll('[data-dig-clue]')).toHaveLength(6);
    for (const key of ['period', 'diet']) await click(host.querySelector('[data-dig-clue=' + key + ']'));
    await click(button('Check my evidence'));
    expect(host.querySelector('#dino-dig-feedback').textContent).toContain('still fit several candidates');
    expect(data.digSolvedFor).toBeUndefined();
    for (const key of ['group', 'length', 'region', 'trait']) await click(host.querySelector('[data-dig-clue=' + key + ']'));
    await click(host.querySelector('[data-dig-candidate="' + other.id + '"] button'));
    await click(button('Check my evidence'));
    expect(host.querySelector('#dino-dig-feedback').textContent).toContain('conflicts with');
    await click(host.querySelector('[data-dig-candidate="' + site.chosen.id + '"] button'));
    await click(button('Check my evidence')); await click(button('Check my evidence'));
    expect(data.digsSolved).toBe(1); expect(data.digSolvedFor).toBe(site.seed);
    await click(button('Explain in my notebook'));
    expect(data.notebook).toEqual(notes);
    expect(host.querySelector('#dino-note-inference').value).toBe('My earlier explanation');
    expect(host.textContent).toContain('Your catalog excavation evidence');
    await click(host.querySelector('#dinotab-dig')); await click(button('New dig'));
    expect(data.digCitedClues).toEqual([]); expect(data.digGuess).toBeNull(); expect(data.digSolvedFor).toBeNull();
    expect(data.digsSolved).toBe(1); expect(data.notebook).toEqual(notes);
  });
  it('restores saved clues and candidate after leaving the section', async () => {
    const site = ambiguousSite();
    await mount({ tab: 'dig', digSeed: site.seed, digRevealed: allCells, digCitedClues: ['period', 'diet'], digGuess: site.chosen.id });
    await click(host.querySelector('#dinotab-compare')); await click(host.querySelector('#dinotab-dig'));
    expect(host.querySelectorAll('[data-dig-clue]:checked')).toHaveLength(2);
    expect(host.querySelector('[data-dig-candidate="' + site.chosen.id + '"] button').getAttribute('aria-pressed')).toBe('true');
  });
  it('exposes every section in four jump-menu groups without changing notebook data', async () => {
    await mount({ tab: 'explore', notebook: { microraptor: { question: 'Wings?' } } });
    const select = host.querySelector('#dino-section-picker');
    expect(select.querySelectorAll('optgroup')).toHaveLength(4); expect(select.querySelectorAll('option')).toHaveLength(18);
    await api.React.act(async () => { select.value = 'dig'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(data.tab).toBe('dig'); expect(host.querySelector('[role=tab][aria-selected=true]').id).toBe('dinotab-dig');
    expect(data.notebook.microraptor.question).toBe('Wings?');
  });
  it('retains accessible grid state for existing saved sites and bounds the choice DOM', () => {
    document.body.innerHTML = renderTab('dig');
    expect(document.querySelector('#dino-dig-cell-0').getAttribute('aria-label')).toContain('bone fragment uncovered');
    expect(document.querySelectorAll('[data-dig-candidate]')).toHaveLength(6);
    expect(document.querySelectorAll('[id^=dino-dig-cell-][tabindex="0"]')).toHaveLength(1);
    expect(document.querySelectorAll('#dinopanel button').length).toBeLessThan(40);
  });
});
