import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const uiFile = process.env.WORD_PRACTICE_TEST_UI || 'word_practice_ui.js';
const source = ['word_practice_core.js', uiFile].map(file => readFileSync(file, 'utf8')).join('\n');
const fixture = { title: 'Garden words', language: 'English', currentUiLanguage: 'French', words: [{
  word: 'Leaf', definition: 'A part of a plant.', example: 'Green leaves turn toward the sun.', translations: { Arabic: 'ورقة النبات', Japanese: '植物の葉' },
}], options: { mode: 'vocabulary', shuffle: false, repetitions: 1, cardTextScale: 1.2 } };
const terms = { 'glossary.table_term': 'Terme', 'export.def_col': 'Définition', 'universal.translations': 'Traductions', 'settings.text.size': 'Taille' };
let browser;
beforeAll(async () => { browser = await chromium.launch({ headless: true }); }, 60_000);
afterAll(async () => { await browser?.close(); }, 60_000);
async function open(page, input = fixture) {
  await page.setContent('<html lang="fr"><body></body></html>'); await page.addScriptTag({ content: source });
  await page.evaluate(({ input, terms }) => {
    input.t = key => terms[key] || key;
    window.__alloReadingSettings = { get: () => ({ readingTheme: 'dark' }) };
    URL.createObjectURL = blob => { window.exported = blob.text(); return 'blob:practice-test'; };
    HTMLAnchorElement.prototype.click = () => {};
    AlloModules.WordPractice.open(input);
  }, { input, terms });
}
const size = locator => locator.evaluate(el => parseFloat(getComputedStyle(el).fontSize));
const role = (scope, name) => scope.getByLabel(name + ' · Taille', { exact: true });
const expand = scope => scope.locator('.awp-size-details>summary').click();
async function checkAlignment(surface, prefix = '') {
  for (const [language, direction, side] of [['ar', 'rtl', 'right'], ['ja', 'ltr', 'left']]) {
    const content = surface.locator('.awp-' + prefix + 'translation[lang="' + language + '"]');
    const layout = await content.evaluate(el => ({ dir: el.dir, labelLang: el.previousElementSibling.lang, align: getComputedStyle(el.previousElementSibling).textAlign,
      ratio: parseFloat(getComputedStyle(el.previousElementSibling).fontSize) / parseFloat(getComputedStyle(el).fontSize) }));
    expect(layout.dir).toBe(direction); expect(layout.labelLang).toBe('fr'); expect(layout.align).toBe(side); expect(layout.ratio).toBeCloseTo(.7, 2);
  }
}

describe('field-specific card sizes', () => {
  it('keeps each multiplier independent through preview, Present, Save, Open and offline HTML', async () => {
    const page = await browser.newPage({ viewport: { width: 1150, height: 900 } }), offline = await browser.newPage({ viewport: { width: 320, height: 900 } });
    try {
      await open(page);
      const setup = page.locator('.awp-appearance'), preview = page.locator('.awp-card-preview');
      await setup.getByRole('button', { name: 'Show meaning', exact: true }).click(); await expand(setup);
      const word = preview.locator('.awp-preview-word'), meaning = preview.locator('.awp-preview-definition'), translation = preview.locator('.awp-preview-translation').first();
      const initial = await Promise.all([size(word), size(meaning), size(translation)]);
      await role(setup, 'Terme').selectOption('1.4'); await role(setup, 'Définition').selectOption('0.85'); await role(setup, 'Traductions').selectOption('1.2');
      expect(await size(word) / initial[0]).toBeCloseTo(1.4); expect(await size(meaning) / initial[1]).toBeCloseTo(.85); expect(await size(translation) / initial[2]).toBeCloseTo(1.2);
      expect(await size(preview.locator('.awp-preview-example'))).toBeCloseTo(await size(meaning)); await checkAlignment(preview, 'preview-');
      await page.getByRole('button', { name: 'Present', exact: true }).click();
      const player = page.locator('.awp-player'), stage = player.locator('.awp-stage');
      await player.getByRole('button', { name: 'Show meaning', exact: true }).click();
      expect(await size(stage.locator('.awp-word'))).toBeCloseTo(await size(word));
      await checkAlignment(stage);
      await player.locator('.awp-appearance-panel>summary').click(); await expand(player);
      const liveMeaning = role(player, 'Définition'); await liveMeaning.focus(); await liveMeaning.selectOption('1.4');
      expect(await liveMeaning.evaluate(el => document.activeElement === el)).toBe(true);
      expect(await size(stage.locator('.awp-definition')) / initial[1]).toBeCloseTo(1.4);
      await player.getByRole('button', { name: 'Back to setup', exact: true }).click();
      expect(await role(setup, 'Définition').inputValue()).toBe('1.4');
      await page.getByRole('button', { name: 'Save word set', exact: true }).click();
      const saved = await page.evaluate(() => exported); await page.getByRole('button', { name: 'I saved the file', exact: true }).click(); const data = JSON.parse(saved);
      expect(data.options).toMatchObject({ cardTextScale: 1.2, wordTextScale: 1.4, meaningTextScale: 1.4, translationTextScale: 1.2 });
      data.options.translationTextScale = 1.13;
      await page.locator('input[type=file][accept*=json]').setInputFiles({ name: 'garden.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) });
      await page.waitForFunction(() => document.querySelector('.awp-appearance select[id$=translationTextScale]').value === '1.13');
      await page.getByRole('button', { name: 'Download HTML', exact: true }).click();
      await offline.setContent(await page.evaluate(() => exported));
      await offline.getByRole('button', { name: 'Show meaning', exact: true }).click();
      const exportedPlayer = offline.locator('.awp-player'), exportedStage = exportedPlayer.locator('.awp-stage');
      await exportedPlayer.locator('.awp-appearance-panel>summary').click(); await expand(exportedPlayer);
      expect(await role(exportedPlayer, 'Traductions').inputValue()).toBe('1.13');
      await checkAlignment(exportedStage);
      await offline.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      await role(exportedPlayer, 'Traductions').selectOption('1.4');
      expect(await exportedStage.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    } finally { await offline.close(); await page.close(); }
  }, 60_000);

  it.each(['presenter', 'offline'])('gives a timed prepared blend a sounds-only prompt and a full reveal interval (%s)', async surface => {
    const page = await browser.newPage();
    try {
      const wav = 'data:audio/wav;base64,' + Buffer.from('RIFF' + '\0'.repeat(4) + 'WAVE' + '\0'.repeat(44)).toString('base64');
      const blend = { words: [{ word: 'ship', wordAudio: wav, phonemes: ['sh','i','p'].map(label => ({ label, audio: wav })) }, { word: 'rain', wordAudio: wav }], options: { mode: 'blend', includeAudio: true, repetitions: 1, shuffle: false, autoAdvance: true, intervalSeconds: 3 } };
      await open(page, blend);
      if (surface === 'presenter') await page.getByRole('button', { name: 'Present', exact: true }).click();
      else await page.setContent(await page.evaluate(data => AlloModules.WordPractice.buildHtml(data), blend));
      const player = page.locator('.awp-player'), stage = player.locator('.awp-stage');
      const hearWord = player.getByRole('button', { name: 'Hear word', exact: true, includeHidden: true });
      expect(await stage.locator('.awp-phonemes').textContent()).toContain('sh'); expect(await hearWord.isVisible()).toBe(false);
      expect(await player.getByRole('button', { name: 'Hear sounds', exact: true }).isEnabled()).toBe(true);
      await page.clock.install(); await player.getByRole('button', { name: 'Start timer', exact: true }).click();
      await page.clock.fastForward(3000);
      expect(await stage.locator('.awp-word').textContent()).toBe('ship'); expect(await hearWord.isVisible()).toBe(true);
      await page.clock.fastForward(3000);
      expect(await stage.locator('.awp-word').textContent()).toBe('rain'); expect(await hearWord.isVisible()).toBe(true);
    } finally { await page.close(); }
  }, 30_000);
});
