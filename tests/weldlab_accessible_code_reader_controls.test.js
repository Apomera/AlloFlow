import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { node, freshTool, mountState, unmountState, click, change } from './helpers/weldlab_interaction_mount.js';

let outside;
beforeEach(() => freshTool());
afterEach(async () => { await unmountState(); outside?.remove(); outside = null; });
const base = { view: 'codes', insp2_codesTab: 'read', codes_pick: 'd1_1' };
const retained = { insp2_sort: { thick: 'req' }, insp2_sortIdx: 2, insp2_clause: { 0: 1, 1: 0 }, car2_reflect: 'Retain my notes.', weldBadges: { ppeSafety: true } };
const q = selector => node().querySelector(selector);
const panel = () => q('[data-code-reader]');
const search = () => q('#code3-reader-search');
const clear = () => q('[data-code-reader-clear]');
const count = () => q('[data-code-reader-count]');
const tiles = () => [...node().querySelectorAll('[data-code-reader-section]')];
const selected = () => q('[data-code-reader-section][aria-pressed="true"]');
const nav = direction => q('[data-code-reader-nav="' + direction + '"]');
const button = text => [...node().querySelectorAll('button')].find(el => el.textContent.trim() === text);
function outsideFocus() { outside ||= document.createElement('button'); if (!outside.isConnected) document.body.append(outside); outside.focus(); }
async function activate(element) { expect(element).toBeTruthy(); element.focus(); await click(element); }
function expectSelected(index) {
  const expected = tiles()[index];
  expect(selected()).toBe(expected);
  expect(q('[data-code-reader-reading]').dataset.number).toBe(expected.dataset.codeReaderSection);
  expect(expected.tagName).toBe('BUTTON'); expect(expected.disabled).toBe(false);
  expect(expected.getAttribute('aria-controls')).toBe('code3-reader-summary');
  return expected;
}

describe('Code Section Reader keyboard focus recovery', () => {
  it.each([false, true])('retains active navigation inside the full outline, then focuses each selected endpoint, contrast=%s', async contrast => {
    const app = await mountState({ ...retained, ...base }, contrast), saved = structuredClone(app.latest());
    const next = nav('next'); await activate(next);
    expectSelected(1); expect(document.activeElement).toBe(next); expect(next.disabled).toBe(false);
    await activate(tiles().at(-2)); await activate(next);
    expect(document.activeElement).toBe(expectSelected(tiles().length - 1)); expect(next.disabled).toBe(true);
    const previous = nav('previous'); await activate(previous);
    expect(document.activeElement).toBe(previous); expect(previous.disabled).toBe(false);
    await activate(tiles()[1]); await activate(previous);
    expect(document.activeElement).toBe(expectSelected(0)); expect(previous.disabled).toBe(true);
    expect(app.latest()).toEqual(saved); expect(app.writes).toHaveLength(0);
  });

  it.each([false, true])('recovers focus at filtered endpoints and leaves the search and reference outline intact, contrast=%s', async contrast => {
    const app = await mountState({ ...retained, ...base }, contrast), saved = structuredClone(app.latest());
    search().focus(); await change(search(), 'qualification');
    expect(tiles().length).toBeGreaterThan(1); expect(tiles().length).toBeLessThan(11);
    const ids = tiles().map(el => el.dataset.codeReaderSection), resultCount = count();
    await activate(tiles().at(-2)); await activate(nav('next'));
    expect(document.activeElement).toBe(expectSelected(ids.length - 1)); expect(nav('next').disabled).toBe(true);
    await activate(tiles()[1]); await activate(nav('previous'));
    expect(document.activeElement).toBe(expectSelected(0)); expect(nav('previous').disabled).toBe(true);
    expect(search().value).toBe('qualification'); expect(tiles().map(el => el.dataset.codeReaderSection)).toEqual(ids);
    expect(count()).toBe(resultCount); expect(count().textContent).toBe(ids.length + ' of 11 section summaries shown.');
    expect(node().querySelectorAll('[data-code-reader-reference]')).toHaveLength(11);
    expect(app.latest()).toEqual(saved); expect(app.writes).toHaveLength(0);
  });

  it.each([false, true])('uses list order for nonnumeric ASME section identifiers, contrast=%s', async contrast => {
    const app = await mountState({ ...retained, ...base, codes_pick: 'asme9' }, contrast), saved = structuredClone(app.latest());
    expect(tiles().at(-1).dataset.codeReaderSection).toBe('QW-500');
    await activate(tiles().at(-2)); await activate(nav('next'));
    expect(document.activeElement).toBe(expectSelected(tiles().length - 1)); expect(nav('next').disabled).toBe(true);
    await activate(tiles()[1]); await activate(nav('previous'));
    expect(document.activeElement).toBe(expectSelected(0)); expect(nav('previous').disabled).toBe(true);
    expect(app.latest()).toEqual(saved); expect(app.writes).toHaveLength(0);
  });

  it.each([false, true])('returns explicit Clear search to its editable search field for matching and empty results, contrast=%s', async contrast => {
    const app = await mountState({ ...retained, ...base }, contrast), saved = structuredClone(app.latest()), resultCount = count();
    for (const query of ['qualification', 'not-a-section-xyz']) {
      search().focus(); await change(search(), query);
      expect(document.activeElement).toBe(search()); expect(clear().disabled).toBe(false);
      if (query === 'not-a-section-xyz') expect(q('[data-code-reader-reading]')).toBeNull();
      await activate(clear());
      expect(document.activeElement).toBe(search()); expect(search().value).toBe(''); expect(clear().disabled).toBe(true);
      expect(tiles()).toHaveLength(11); expectSelected(0); expect(count()).toBe(resultCount);
      expect(resultCount.textContent).toBe('11 of 11 section summaries shown.');
      expect(resultCount.getAttribute('aria-live')).toBe('polite'); expect(resultCount.getAttribute('aria-atomic')).toBe('true');
    }
    expect(app.latest()).toEqual(saved); expect(app.writes).toHaveLength(0);
  });

  it.each([false, true])('does not autofocus on mount or replay an endpoint request on direct choice and search, contrast=%s', async contrast => {
    outsideFocus(); const app = await mountState({ ...retained, ...base }, contrast), saved = structuredClone(app.latest());
    expect(document.activeElement).toBe(outside);
    await activate(tiles()[1]); expect(document.activeElement).toBe(tiles()[1]);
    await activate(nav('previous')); expect(document.activeElement).toBe(expectSelected(0));
    outside.focus(); await click(tiles()[2]); expectSelected(2); expect(document.activeElement).toBe(outside);
    search().focus(); await change(search(), 'qualification'); expect(document.activeElement).toBe(search());
    outside.focus(); await change(search(), 'not-a-section-xyz'); expect(document.activeElement).toBe(outside);
    expect(app.latest()).toEqual(saved); expect(app.writes).toHaveLength(0);
  });

  it.each([false, true])('consumes Clear focus once and keeps disabled controls inert for a one-result search, contrast=%s', async contrast => {
    const app = await mountState({ ...retained, ...base }, contrast), saved = structuredClone(app.latest());
    await change(search(), 'Clause 8'); expect(tiles()).toHaveLength(1);
    expect(nav('previous').disabled).toBe(true); expect(nav('next').disabled).toBe(true);
    outsideFocus(); await click(nav('previous')); await click(nav('next')); expect(document.activeElement).toBe(outside);
    await activate(clear()); expect(document.activeElement).toBe(search());
    outside.focus(); await click(clear()); expect(document.activeElement).toBe(outside);
    await change(search(), 'qualification'); expect(document.activeElement).toBe(outside);
    expect(app.latest()).toEqual(saved); expect(app.writes).toHaveLength(0);
  });

  it.each([false, true])('does not replay reader requests when changing code or leaving and reopening the reader, contrast=%s', async contrast => {
    const app = await mountState({ ...retained, ...base }, contrast);
    await activate(tiles()[1]); await activate(nav('previous'));
    const asme = button('ASME Section IX'); await activate(asme); expect(document.activeElement).toBe(asme);
    expect(panel().dataset.code).toBe('asme9'); expect(search().value).toBe(''); expectSelected(0);
    await change(search(), 'qualification'); await activate(clear()); expect(document.activeElement).toBe(search());
    const sorter = button('🗂 Essential Variable Sorter'); await activate(sorter); expect(document.activeElement).toBe(sorter); expect(panel()).toBeNull();
    const reader = button('📖 Code reader'); await activate(reader); expect(document.activeElement).toBe(reader); expectSelected(0);
    expect(app.latest()).toMatchObject({ ...retained, ...base, codes_pick: 'asme9' });
    expect(app.writes.map(([key]) => key)).toEqual(['codes_pick', 'insp2_codesTab', 'insp2_codesTab']);
  });
});
