import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const read = file => readFileSync(file, 'utf8');
const source = read('word_practice_core.js') + '\n' + read(process.env.WORD_PRACTICE_UI || 'word_practice_ui.js');
const available = [['source', source], ['runtime', read('word_practice_module.js')]];
const lanes = process.env.WORD_PRACTICE_UI_LANE ? available.filter(([lane]) => lane === process.env.WORD_PRACTICE_UI_LANE) : available;
if (!lanes.length) throw new Error('Unknown appearance-caption test lane');
const output = process.env.WORD_PRACTICE_UI_OUTPUT || 'tmp/card-caption-refine-20261101/ui';
const cases = [
  ['fallback', {}, ['en', 'en', 'en'], ['en', 'en']],
  ['Arabic', { 'glossary.table_term': 'الكلمة', 'export.def_col': 'المعنى', 'universal.translations': 'الترجمات', 'common.reset': 'إعادة الضبط', 'word_practice.appearance': 'مظهر البطاقة' }, ['ar', 'ar', 'ar'], ['ar', 'ar']],
  ['mixed-English', { 'export.def_col': 'المعنى', 'universal.translations': 'الترجمات', 'word_practice.appearance': 'مظهر البطاقة' }, ['en', 'ar', 'ar'], ['en', 'ar']],
  ['mixed-Arabic', { 'glossary.table_term': 'الكلمة', 'common.reset': 'إعادة الضبط' }, ['ar', 'en', 'en'], ['ar', 'en']],
];
const appearance = { cardFont: 'georgia', cardTextStyle: 'bold-italic', cardTheme: 'cream', cardTextScale: 1.2, wordTextScale: 1.1, meaningTextScale: 1.13, translationTextScale: 1.4 };
const defaults = { cardFont: 'default', cardTextStyle: 'default', cardTheme: 'paper', cardTextScale: 1, wordTextScale: 1, meaningTextScale: 1, translationTextScale: 1 };
const fixture = { title: 'Plant words', language: 'English', currentUiLanguage: 'Arabic', words: [
  { id: 'leaf', word: 'Leaf', definition: 'A part of a plant.', translations: { Arabic: 'ورقة', Japanese: '葉' } },
  { id: 'stem', word: 'Stem', definition: 'يدعم الأوراق.', definitionLanguage: 'Arabic', translations: { Arabic: 'ساق', Japanese: '茎' }, annotations: [{ id: 'note', kind: 'note', text: 'Keep my note.' }] },
], reviewItemIds: ['stem'], options: { mode: 'vocabulary', shuffle: false, repetitions: 1, includeAudio: false, autoAdvance: true, intervalSeconds: 30, translationLanguages: ['ja'], ...appearance } };
let browser;
beforeAll(async () => { mkdirSync(output, { recursive: true }); browser = await chromium.launch({ headless: true }); }, 60_000);
afterAll(async () => { await browser?.close(); }, 60_000);

async function stubDownloads(page) {
  await page.evaluate(() => { URL.createObjectURL = blob => { window.exported = blob.text(); return 'blob:caption-test'; }; URL.revokeObjectURL = () => {}; HTMLAnchorElement.prototype.click = () => {}; });
}
async function open(page, code, labels = {}) {
  await page.setContent('<!doctype html><html lang="ar" dir="rtl"><body></body></html>');
  await page.addScriptTag({ content: code });
  await stubDownloads(page);
  await page.evaluate(({ fixture, labels }) => { window.__alloReadingSettings = { get: () => ({ readingTheme: 'default' }) }; fixture.t = key => labels[key] || key; AlloModules.WordPractice.open(fixture); }, { fixture, labels });
}
async function download(page, scope, name) {
  await page.evaluate(() => { window.exported = null; });
  await scope.getByRole('button', { name, exact: true }).click();
  await page.waitForFunction(() => !!window.exported);
  return page.evaluate(() => exported);
}
async function proof(scope, roleLanguages, resetLanguages, ordered) {
  const value = await scope.evaluate(root => {
    const summary = root.querySelector('.awp-size-details>summary'), reset = root.querySelector('.awp-appearance-reset');
    const parts = node => [...node.querySelectorAll('span')].map(element => { const box = element.getBoundingClientRect(); return { text: element.textContent, lang: element.lang, dir: element.dir, x: box.x + box.width / 2, y: box.y }; });
    const group = node => { const item = node.querySelector(':scope>bdi'); return item ? { lang: item.lang, dir: item.dir, text: item.textContent } : null; };
    return { roles: parts(summary), reset: parts(reset), roleGroup: group(summary), resetGroup: group(reset), display: getComputedStyle(summary).display, marker: getComputedStyle(summary).listStyleType };
  });
  // First assert the visible reading order so the retained baseline is a real
  // behavior failure rather than only a missing-wrapper failure.
  if (ordered) for (const [parts, expected] of [[value.roles, roleLanguages], [value.reset, resetLanguages]]) {
    expect(new Set(parts.map(part => Math.round(part.y))).size).toBe(1);
    for (let i = 1; i < parts.length; i++) expected[0] === 'ar' ? expect(parts[i - 1].x).toBeGreaterThan(parts[i].x) : expect(parts[i - 1].x).toBeLessThan(parts[i].x);
  }
  expect(value.roles.map(part => part.lang)).toEqual(roleLanguages); expect(value.reset.map(part => part.lang)).toEqual(resetLanguages);
  expect(value.roleGroup).toMatchObject({ lang: roleLanguages[0], dir: roleLanguages[0] === 'ar' ? 'rtl' : 'ltr' });
  expect(value.resetGroup).toMatchObject({ lang: resetLanguages[0], dir: resetLanguages[0] === 'ar' ? 'rtl' : 'ltr' });
  expect(value.roleGroup.text).toBe(value.roles.map(part => part.text).join(' · ')); expect(value.resetGroup.text).toBe(value.reset.map(part => part.text).join(' · '));
  expect(value.display).toBe('list-item'); expect(value.marker).not.toBe('none');
  return value;
}
async function widths(page, scope) {
  expect(await scope.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
}
async function inspect(page, scope, languages, resetLanguages, label) {
  await page.setViewportSize({ width: 1150, height: 950 }); await page.evaluate(() => { document.documentElement.style.fontSize = '100%'; });
  const wide = await proof(scope, languages, resetLanguages, true);
  const summary = scope.locator('.awp-size-details>summary');
  if (label.includes('fallback')) { await summary.screenshot({ path: path.join(output, label + '-summary-wide.png') }); await scope.locator('.awp-appearance-reset').screenshot({ path: path.join(output, label + '-reset-wide.png') }); }
  await summary.focus(); await page.keyboard.press('Enter');
  expect(await scope.locator('.awp-size-details').evaluate(node => node.open)).toBe(true);
  expect(await summary.evaluate(node => node === document.activeElement)).toBe(true);
  await page.keyboard.press('Enter'); expect(await scope.locator('.awp-size-details').evaluate(node => node.open)).toBe(false);
  await page.setViewportSize({ width: 320, height: 950 }); await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await proof(scope, languages, resetLanguages, false); await widths(page, scope);
  if (label.includes('fallback')) { await summary.screenshot({ path: path.join(output, label + '-summary-320.png') }); await scope.locator('.awp-appearance-reset').screenshot({ path: path.join(output, label + '-reset-320.png') }); }
  await page.setViewportSize({ width: 1150, height: 950 }); await page.evaluate(() => { document.documentElement.style.fontSize = '100%'; });
  return wide;
}

describe.each(lanes)('appearance caption reading order (%s)', (lane, code) => {
  it.each(cases)('keeps %s compound captions in their own reading direction through setup, presenter and offline HTML', async (name, labels, roleLanguages, resetLanguages) => {
    const page = await browser.newPage(), offline = await browser.newPage();
    try {
      await open(page, code, labels); const setup = page.locator('.awp-appearance');
      await inspect(page, setup, roleLanguages, resetLanguages, lane + '-' + name + '-setup');
      const html = await download(page, page, 'Download HTML');
      await page.getByRole('button', { name: 'Present', exact: true }).click(); const player = page.locator('.awp-player');
      await player.locator('.awp-appearance-panel>summary').click(); await inspect(page, player.locator('.awp-primary-appearance-controls'), roleLanguages, resetLanguages, lane + '-' + name + '-player');
      await offline.setContent(html); const portable = offline.locator('.awp-player');
      await portable.locator('.awp-appearance-panel>summary').click(); await inspect(offline, portable.locator('.awp-primary-appearance-controls'), roleLanguages, resetLanguages, lane + '-' + name + '-offline');
    } finally { await offline.close(); await page.close(); }
  }, 60_000);

  it.each(['presenter', 'offline'])('retains reset focus, learning state and all non-appearance values (%s)', async surface => {
    const page = await browser.newPage({ viewport: { width: 1150, height: 950 } });
    try {
      await open(page, code);
      if (surface === 'presenter') await page.getByRole('button', { name: 'Present', exact: true }).click();
      else { const html = await download(page, page, 'Download HTML'); await page.setContent(html); await stubDownloads(page); }
      const player = page.locator('.awp-player'), stage = player.locator('.awp-stage');
      await player.getByRole('button', { name: 'Next', exact: true }).click(); await player.getByRole('button', { name: 'Show meaning', exact: true }).click();
      const beforeStyle = await stage.evaluate(node => { const style = getComputedStyle(node.querySelector('.awp-word')); return { family: style.fontFamily, style: style.fontStyle, weight: style.fontWeight, size: parseFloat(style.fontSize), background: getComputedStyle(node).backgroundColor }; });
      expect(beforeStyle.family).toContain('Georgia'); expect(beforeStyle.style).toBe('italic'); expect(beforeStyle.weight).toBe('700'); expect(beforeStyle.background).toBe('rgb(255, 248, 232)');
      await page.clock.install(); await page.clock.pauseAt(new Date()); await player.getByRole('button', { name: 'Start timer', exact: true }).click();
      await player.locator('.awp-appearance-panel>summary').click(); const reset = player.locator('.awp-appearance-reset'); await reset.click();
      expect(await reset.evaluate(node => node === document.activeElement)).toBe(true); expect(await reset.getAttribute('aria-disabled')).toBe('true');
      expect(await player.getByRole('button', { name: 'Pause timer', exact: true }).getAttribute('aria-pressed')).toBe('true');
      expect(await stage.locator('.awp-word').textContent()).toBe('Stem'); expect(await stage.locator('.awp-definition').getAttribute('dir')).toBe('rtl');
      expect(await stage.locator('.awp-translation').allTextContents()).toEqual(['茎']); expect(await player.locator('.awp-review').getAttribute('aria-pressed')).toBe('true');
      for (const [name, value] of Object.entries(defaults)) expect(await player.locator('select[id$="' + name + '"]').inputValue()).toBe(String(value));
      const afterStyle = await stage.evaluate(node => { const style = getComputedStyle(node.querySelector('.awp-word')); return { family: style.fontFamily, style: style.fontStyle, size: parseFloat(style.fontSize), background: getComputedStyle(node).backgroundColor }; });
      expect(afterStyle.family).not.toContain('Georgia'); expect(afterStyle.style).toBe('normal'); expect(afterStyle.background).toBe('rgb(255, 255, 255)'); expect(beforeStyle.size / afterStyle.size).toBeCloseTo(1.32, 2);
      await page.clock.resume();
      if (surface === 'presenter') await player.getByRole('button', { name: 'Back to setup', exact: true }).click();
      const saved = JSON.parse(await download(page, surface === 'presenter' ? page : player, 'Save word set'));
      expect(saved.options).toMatchObject({ ...defaults, mode: 'vocabulary', shuffle: false, repetitions: 1, includeAudio: false, translationLanguages: ['ja'], autoAdvance: true, intervalSeconds: 30 });
      expect(saved.reviewItemIds).toContain('stem'); expect(saved.items[1].annotations[0].text).toBe('Keep my note.');
    } finally { await page.close(); }
  }, 60_000);
});
