import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const lanes = [
  ['source', ['word_practice_core.js', 'word_practice_ui.js'].map(file => readFileSync(file, 'utf8')).join('\n')],
  ['runtime', readFileSync('word_practice_module.js', 'utf8')],
];
const translations = [
  { language: 'Arabic', text: 'ورقة النبات' }, { language: 'ja', text: '植物の葉' }, { language: 'ar', text: 'ورقة' },
  { language: 'zh-Hans', text: '植物的叶' }, { language: 'zh-Hant', text: '植物的葉' }, { language: '', text: 'The leaf on this branch.' },
];
const fixture = { title: 'Plant vocabulary', words: [{ id: 'leaf', word: 'leaf', translations, annotations: [{ id: 'n1', kind: 'note', text: 'Keep my note.' }] }],
  reviewItemIds: ['leaf'], options: { mode: 'vocabulary', shuffle: false, repetitions: 1 } };
let browser;
beforeAll(async () => { browser = await chromium.launch({ headless: true }); }, 60_000);
afterAll(async () => { await browser?.close(); }, 60_000);
async function start(page, code, input = fixture) {
  await page.setContent('<html lang="en"><body></body></html>'); await page.addScriptTag({ content: code });
  await page.evaluate(data => {
    URL.createObjectURL = blob => { window.exported = blob.text(); return 'blob:word-practice-test'; };
    HTMLAnchorElement.prototype.click = () => {};
    AlloModules.WordPractice.open(data);
  }, input);
}
const row = (menu, key) => menu.locator('.awp-translation-row[data-key="' + key + '"]');
const textRows = locator => locator.allTextContents();
const openDetails = async menu => { if (!await menu.evaluate(el => el.open)) await menu.locator(':scope > summary').click(); };
const authoredText = translations.map(entry => entry.text);
async function download(page, name) {
  await page.evaluate(() => { window.exported = null; });
  await page.getByRole('button', { name, exact: true }).click();
  await page.waitForFunction(() => !!window.exported);
  if (name === 'Save word set') await page.getByRole('button', { name: 'I saved the file', exact: true }).click();
  return page.evaluate(() => exported);
}

describe.each(lanes)('translation presentation choices (%s)', (_, code) => {
  it('orders aliases by language, keeps reveal and focus, and saves all entries with their original highlights', async () => {
    const page = await browser.newPage({ viewport: { width: 320, height: 900 } });
    try {
      await start(page, code);
      const setup = page.locator('.awp-appearance'), preview = page.locator('.awp-card-preview'), menu = setup.locator('.awp-translation-menu');
      await setup.getByRole('button', { name: 'Show meaning', exact: true }).click();
      expect(await textRows(preview.locator('.awp-preview-translation'))).toEqual(authoredText);
      await openDetails(menu);
      await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      const group = row(menu, 'ja');
      expect(await group.locator('label').evaluate(el => el.clientWidth >= el.parentElement.clientWidth - 1)).toBe(true);
      expect(await group.locator('button').first().evaluate(el => el.getBoundingClientRect().top >= el.parentElement.querySelector('label').getBoundingClientRect().bottom - 1)).toBe(true);
      expect(await menu.getByRole('checkbox').count()).toBe(5);
      expect(await row(menu, '').getByRole('checkbox').getAttribute('type')).toBe('checkbox');
      expect(await row(menu, '').textContent()).toContain('Unspecified');
      await row(menu, 'ja').getByRole('button', { name: 'Move up · Japanese', exact: true }).focus();
      await page.keyboard.press('Enter');
      expect(await page.locator(':focus').getAttribute('aria-disabled')).toBe('true');
      expect(await page.locator(':focus').evaluate(el => el.closest('.awp-translation-row').dataset.key)).toBe('ja');
      for (const key of ['zh-hans', 'zh-hant']) await row(menu, key).getByRole('checkbox').uncheck();
      const picked = [authoredText[1], authoredText[0], authoredText[2], authoredText[5]];
      expect(await textRows(preview.locator('.awp-preview-translation'))).toEqual(picked);
      const saved = JSON.parse(await download(page, 'Save word set'));
      expect(saved.options.translationLanguages).toEqual(['ja','ar','']);
      expect(saved.items[0].translations).toEqual(translations);
      expect(saved.reviewItemIds).toContain('leaf'); expect(saved.items[0].annotations[0].text).toBe('Keep my note.');
      await page.getByRole('button', { name: 'Present', exact: true }).click();
      const player = page.locator('.awp-player'), stage = player.locator('.awp-stage');
      await player.getByRole('button', { name: 'Show meaning', exact: true }).click();
      expect(await textRows(stage.locator('.awp-translation'))).toEqual(picked);
      expect(await textRows(player.locator('[aria-live] .awp-translation'))).toEqual(picked);
      expect(await stage.locator('.awp-translation').evaluateAll(rows => rows.map(el => el.parentElement.dataset.alloHighlightField))).toEqual(['translation:1','translation:0','translation:2','translation:5']);
      expect(await stage.locator('.awp-card').getAttribute('data-allo-highlight-complete')).toBe('false');
      await openDetails(player.locator('.awp-appearance-panel')); const liveMenu = player.locator('.awp-translation-menu'); await openDetails(liveMenu);
      await liveMenu.getByRole('button', { name: 'All languages', exact: true }).click();
      expect(await textRows(stage.locator('.awp-translation'))).toEqual(authoredText);
      expect(await stage.locator('.awp-card').getAttribute('data-allo-highlight-complete')).toBe('true');
      await liveMenu.getByRole('button', { name: 'Deselect All', exact: true }).click();
      expect(await stage.locator('.awp-translation').count()).toBe(0);
      expect(await stage.textContent()).not.toMatch(/No meaning or example/);
      expect(await stage.locator('.awp-word').textContent()).toBe('leaf');
      await player.getByRole('button', { name: 'Back to setup', exact: true }).click();
      expect(await menu.locator('input:checked').count()).toBe(0);
      expect(await page.locator('.awp-plan-note').textContent()).not.toContain('Add that content in the source glossary');
      expect(await page.locator('.awp-review-details').textContent()).not.toContain('No meaning, example or translation');
      expect(JSON.parse(await download(page, 'Save word set')).options.translationLanguages).toEqual([]);
      await page.locator('input[type=file][accept*=json]').setInputFiles({ name: 'garden.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(saved)) });
      await page.waitForFunction(() => document.querySelectorAll('.awp-appearance .awp-translation-menu input:checked').length === 3);
      expect(await menu.locator('input:checked').evaluateAll(nodes => nodes.map(n => n.closest('.awp-translation-row').dataset.key))).toEqual(['ja','ar','']);
    } finally { await page.close(); }
  }, 60_000);

  it('reselects hidden translations offline and falls back to the word when the selected languages offer no clue', async () => {
    const host = await browser.newPage(), offline = await browser.newPage({ viewport: { width: 320, height: 900 } });
    try {
      await start(host, code, { ...fixture, options: { ...fixture.options, vocabularyFirst: 'meaning', translationLanguages: [''] } });
      await offline.setContent(await download(host, 'Download HTML'));
      const player = offline.locator('.awp-player'), stage = player.locator('.awp-stage');
      expect(await stage.locator('.awp-word').count()).toBe(0);
      expect(await stage.locator('.awp-translation').textContent()).not.toMatch(/\bleaf\b/i);
      expect(await stage.locator('.awp-translation').evaluate(el => el.parentElement.dataset.alloHighlightField)).toBe('clue-translation:5');
      await openDetails(player.locator('.awp-appearance-panel')); const menu = player.locator('.awp-translation-menu'); await openDetails(menu);
      await menu.getByRole('button', { name: 'Deselect All', exact: true }).click();
      expect(await stage.locator('.awp-word').textContent()).toBe('leaf');
      expect(await stage.locator('.awp-meaning-prompt').count()).toBe(0);
      await row(menu, 'ar').getByRole('checkbox').check();
      expect(await textRows(stage.locator('.awp-translation'))).toEqual([authoredText[0], authoredText[2]]);
      expect(await stage.locator('.awp-translation').first().getAttribute('dir')).toBe('rtl');
      expect(await menu.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      await offline.evaluate(() => { URL.createObjectURL = blob => { window.saved = blob.text(); return 'blob:word-set'; }; HTMLAnchorElement.prototype.click = () => {}; });
      await player.getByRole('button', { name: 'Save word set', exact: true }).click();
      await offline.waitForFunction(() => !!window.saved);
      const pack = JSON.parse(await offline.evaluate(() => saved));
      expect(pack.options.translationLanguages).toEqual(['ar']); expect(pack.items[0].translations).toEqual(translations);
    } finally { await host.close(); await offline.close(); }
  }, 60_000);
});
