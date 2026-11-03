import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const read = file => readFileSync(file, 'utf8');
const lanes = [
  ['source', read('word_practice_core.js') + '\n' + read('word_practice_ui.js')], ['runtime', read('word_practice_module.js')],
];
const appearance = { cardFont: 'georgia', cardTextStyle: 'bold-italic', cardTheme: 'cream', cardTextScale: 1.2,
  wordTextScale: 1.1, meaningTextScale: 1.13, translationTextScale: 1.4 };
const defaults = { cardFont: 'default', cardTextStyle: 'default', cardTheme: 'paper', cardTextScale: 1,
  wordTextScale: 1, meaningTextScale: 1, translationTextScale: 1 };
const fixture = { title: 'Garden vocabulary', currentUiLanguage: 'French', words: [
  { word: 'Leaf', definition: 'A plant part.', translations: { Arabic: 'ورقة', Japanese: '葉' } },
  { id: 'stem', word: 'Stem', definition: 'يدعم الأوراق.', definitionLanguage: 'Arabic', translations: { Arabic: 'ساق', Japanese: '茎' }, annotations: [{ id: 'note', kind: 'note', text: 'Keep my note.' }] },
], reviewItemIds: ['stem'], options: { mode: 'vocabulary', shuffle: false, repetitions: 1, autoAdvance: true, intervalSeconds: 30, translationLanguages: ['ja'], ...appearance } };
let browser;
beforeAll(async () => { browser = await chromium.launch({ headless: true }); }, 60_000);
afterAll(async () => { await browser?.close(); }, 60_000);

async function open(page, code) {
  await page.setContent('<html style="font-size:200%" lang="fr"><body class="font-andika-bold-italic"></body></html>');
  await page.addScriptTag({ content: code }); await page.addScriptTag({ content: read('ui_font_library_module.js') });
  await page.evaluate(input => {
    window.__alloReadingSettings = { get: () => ({ fontClass: 'font-andika-bold-italic', fontFamily: "'Andika', sans-serif", baseFontSize: 32, readingTheme: 'dark' }), set() {} };
    AlloModules.UIFontLibrary.exportFontFaceCss = async () => ({ css: '' });
    URL.createObjectURL = blob => { window.exported = blob.text(); return 'blob:style-test'; }; HTMLAnchorElement.prototype.click = () => {};
    input.t = key => ({ 'word_practice.card_text_style': 'Style du texte', 'word_practice.text_style_bold': 'Gras', 'common.reset': 'Réinitialiser' })[key] || key;
    AlloModules.WordPractice.open(input);
  }, fixture);
}
async function save(page, name) {
  await page.evaluate(() => { window.exported = null; });
  await page.getByRole('button', { name, exact: true }).click(); await page.waitForFunction(() => !!window.exported); if (name === 'Save word set') await page.getByRole('button', { name: 'I saved the file', exact: true }).click(); return page.evaluate(() => exported);
}
async function look(element) { return element.evaluate(el => { const css = getComputedStyle(el); return [css.fontStyle, css.fontWeight]; }); }
const style = scope => scope.getByLabel('Style du texte', { exact: true });
const reset = scope => scope.getByRole('button', { name: 'Réinitialiser · Card appearance', exact: true });
const openControls = player => player.locator('.awp-appearance-panel>summary').click();

describe.each(lanes)('explicit card text style (%s)', (_, code) => {
  it('applies style to terms, captions and passages, with localized labels and portable selection', async () => {
    const page = await browser.newPage({ viewport: { width: 320, height: 900 } }), offline = await browser.newPage();
    try {
      await open(page, code); const setup = page.locator('.awp-appearance'), preview = page.locator('.awp-card-preview');
      await setup.getByRole('button', { name: 'Show meaning', exact: true }).click();
      expect(await style(setup).locator('option[value=bold]').textContent()).toBe('Gras');
      expect(await style(setup).locator('option[value=bold]').getAttribute('lang')).toBe('fr');
      expect(await style(setup).locator('option[value=italic]').getAttribute('lang')).toBe('en');
      for (const [value, expected] of [['regular', ['normal','400']], ['bold', ['normal','700']], ['italic', ['italic','400']], ['bold-italic', ['italic','700']]]) {
        await style(setup).selectOption(value);
        for (const selector of ['.awp-preview-word', '.awp-preview-definition', '.awp-preview-language-name', '.awp-preview-translation']) expect(await look(preview.locator(selector))).toEqual(expected);
      }
      expect(await preview.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      const saved = JSON.parse(await save(page, 'Save word set')); expect(saved.options).toMatchObject(appearance);
      saved.options.cardTextStyle = 'italic';
      await page.locator('input[type=file][accept*=json]').setInputFiles({ name: 'garden.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(saved)) });
      await page.waitForFunction(() => document.querySelector('.awp-appearance select[id$=cardTextStyle]').value === 'italic');
      await page.getByLabel('Use my reading settings', { exact: true }).check();
      await offline.setContent(await save(page, 'Download HTML'));
      const player = offline.locator('.awp-player'), stage = player.locator('.awp-stage');
      await player.getByRole('button', { name: 'Show meaning', exact: true }).click(); await openControls(player);
      expect(await style(player).inputValue()).toBe('italic'); expect(await look(stage.locator('.awp-word'))).toEqual(['italic','400']);
      await style(player).selectOption('regular'); expect(await look(stage.locator('.awp-language-name'))).toEqual(['normal','400']);
      await reset(player).click(); expect(await style(player).inputValue()).toBe('default');
      expect(await look(stage.locator('.awp-definition'))).toEqual(['italic','700']);
      expect(await stage.locator('.awp-translation').allTextContents()).toEqual(['葉']);
    } finally { await offline.close(); await page.close(); }
  }, 60_000);

  it('resets only appearance without moving the live card, hiding its answer, or stopping its timer', async () => {
    const page = await browser.newPage();
    try {
      await open(page, code); await page.getByRole('button', { name: 'Present', exact: true }).click();
      const player = page.locator('.awp-player'), stage = player.locator('.awp-stage');
      await player.getByRole('button', { name: 'Next', exact: true }).click();
      await player.getByRole('button', { name: 'Show meaning', exact: true }).click();
      await player.getByRole('button', { name: 'Start timer', exact: true }).click();
      await openControls(player); const button = reset(player); await button.click();
      expect(await button.evaluate(el => el === document.activeElement)).toBe(true); expect(await button.getAttribute('aria-disabled')).toBe('true');
      expect(await player.getByRole('button', { name: 'Pause timer', exact: true }).getAttribute('aria-pressed')).toBe('true');
      expect(await stage.locator('.awp-word').textContent()).toBe('Stem'); expect(await stage.locator('.awp-definition').getAttribute('dir')).toBe('rtl');
      expect(await stage.locator('.awp-translation').allTextContents()).toEqual(['茎']); expect(await look(stage.locator('.awp-definition'))).toEqual(['italic','700']);
      await player.getByRole('button', { name: 'Back to setup', exact: true }).click();
      const setup = page.locator('.awp-appearance'); expect(await reset(setup).getAttribute('aria-disabled')).toBe('true');
      const saved = JSON.parse(await save(page, 'Save word set'));
      expect(saved.options).toMatchObject({ ...defaults, translationLanguages: ['ja'], autoAdvance: true, intervalSeconds: 30, repetitions: 1 });
      expect(saved.reviewItemIds).toContain('stem'); expect(saved.items[1].annotations[0].text).toBe('Keep my note.');
      await style(setup).selectOption('bold'); await reset(setup).click();
      expect(JSON.parse(await save(page, 'Save word set')).options).toMatchObject({ ...defaults, translationLanguages: ['ja'] });
    } finally { await page.close(); }
  }, 60_000);
});
