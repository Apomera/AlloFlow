import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { chromium } from 'playwright';

const read = file => readFileSync(file, 'utf8');
const lanes = [
  ['source', read('word_practice_core.js') + '\n' + read(process.env.WORD_PRACTICE_UI || 'word_practice_ui.js')],
  ['runtime', read('word_practice_module.js')],
];
const output = 'tmp/card-language-details-20261101/ui';
const windows = [];
let browser;
beforeAll(async () => { mkdirSync(output, { recursive: true }); browser = await chromium.launch({ headless: true }); }, 60_000);
afterEach(() => { while (windows.length) windows.pop().close(); });
afterAll(async () => { await browser?.close(); }, 60_000);
const samples = [
  ['emoji', 'English', 'en', 'ltr', 'A'.repeat(156) + '👩🏽‍🌾 First meaning ends here.'],
  ['hindi', 'Hindi', 'hi', 'ltr', 'A'.repeat(155) + 'क्‍ष यह पूरा अर्थ है।'],
  ['arabic', 'Arabic', 'ar', 'rtl', 'ا'.repeat(156) + 'بَّ هذا هو المعنى الكامل.'],
  ['flags', 'English', 'en', 'ltr', 'A'.repeat(155) + '🇨🇦 The complete meaning continues.'],
  ['linebreak', 'English', 'en', 'ltr', 'A'.repeat(156) + '\r\nThe complete meaning continues.'],
  ['jamo', 'Korean', 'ko', 'ltr', 'A'.repeat(156) + '가 The complete meaning continues.'],
  ['hangul', 'Korean', 'ko', 'ltr', 'A'.repeat(156) + '각 The complete meaning continues.'],
];
const seed = samples.map(([id, definitionLanguage, , , definition]) => ({ id, word: 'bank', definitionLanguage, definition }));
function load(code, segmenter = 'native') {
  const { window } = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only' }); windows.push(window);
  if (segmenter === 'missing') window.Intl.Segmenter = undefined;
  if (segmenter === 'constructor') window.Intl.Segmenter = class { constructor() { throw new Error('Unavailable'); } };
  if (segmenter === 'segment') window.Intl.Segmenter = class { segment() { throw new Error('Unavailable'); } };
  window.eval(code); return window;
}

describe.each(lanes)('complete homograph meanings (%s)', (lane, code) => {
  it.each(['native', 'missing', 'constructor', 'segment'])('keeps compact excerpts on grapheme boundaries when segmentation is %s', segmenter => {
    const win = load(code, segmenter);
    win.AlloModules.WordPractice.open({ words: seed });
    const choices = win.document.querySelector('.awp-meaning-choices');
    for (const [id, , lang, dir, value] of samples) {
      const input = choices.querySelector('input[data-entry-id=' + id + ']');
      const excerpt = input.closest('label').querySelector('span').lastElementChild;
      const cut = excerpt.textContent.slice(0, -1);
      expect(excerpt.textContent.endsWith('…')).toBe(true);
      expect(value.startsWith(cut)).toBe(true); expect(cut.length).toBeLessThanOrEqual(157);
      const ends = [...new Intl.Segmenter(lang, { granularity: 'grapheme' }).segment(value)].map(part => part.index + part.segment.length);
      expect([0, ...ends]).toContain(cut.length);
      expect(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(cut)).toBe(false);
      const details = choices.querySelector('details[data-entry-id=' + id + ']'), body = details.querySelector('.awp-meaning-definition');
      expect(details.closest('label')).toBeNull(); expect(details.open).toBe(false);
      expect(body.textContent).toBe(value); expect(body.lang).toBe(lang); expect(body.dir).toBe(dir);
      expect(input.closest('label').textContent).not.toContain(value);
    }
  });

  it('keeps short definitions compact and preserves expansion and focused summary across a plan refresh', () => {
    const win = load(code), doc = win.document;
    win.AlloModules.WordPractice.open({ words: [...seed, { id: 'short', word: 'bank', definition: 'A short meaning.' }] });
    expect(doc.querySelector('input[data-entry-id=short]').closest('label').textContent).toContain('A short meaning.');
    expect(doc.querySelector('details[data-entry-id=short]')).toBeNull();
    const details = doc.querySelector('details[data-entry-id=hindi]'); details.open = true; details.querySelector('summary').focus();
    const style = doc.querySelector('select[id$=cardTextStyle]'); style.value = 'italic'; style.dispatchEvent(new win.Event('change', { bubbles: true }));
    expect(doc.activeElement.tagName).toBe('SUMMARY'); expect(doc.activeElement.dataset.entryId).toBe('hindi');
    expect(doc.querySelector('details[data-entry-id=hindi]').open).toBe(true);
    expect(doc.querySelector('input[data-entry-id=hindi]').checked).toBe(true);
  });

  it('opens full meanings with the keyboard, retains choices and reading position, and saves and exports exact text', async () => {
    const page = await browser.newPage({ viewport: { width: 320, height: 900 } }), offline = await browser.newPage();
    const common = 'This entry shares its opening explanation with another meaning. '.repeat(6);
    const words = [
      { id: 'financial', word: 'bank', definition: common + '\nA place that keeps money.', definitionLanguage: 'English', translations: { Arabic: 'مصرف' } },
      { id: 'river', word: 'bank', definition: common + '\nThe ground beside a river.', definitionLanguage: 'English', translations: { Arabic: 'ضفة' } },
      { id: 'arabic', word: 'bank', definition: 'هذا الشرح يوضح معنى مختلفاً للكلمة ويمكن قراءته كاملاً قبل الاختيار. '.repeat(8) + '\nنهاية المعنى العربي.', definitionLanguage: 'Arabic' },
    ];
    try {
      await page.setContent('<!doctype html><html style="font-size:200%"><body></body></html>'); await page.addScriptTag({ content: code });
      await page.evaluate(words => {
        URL.createObjectURL = blob => { window.exported = blob.text(); return 'blob:meaning'; }; HTMLAnchorElement.prototype.click = () => {};
        AlloModules.WordPractice.open({ words, currentUiLanguage: 'Arabic', t: key => key === 'word_practice.show_meaning' ? 'إظهار المعنى' : key, options: { mode: 'vocabulary', shuffle: false, repetitions: 1, includeAudio: false } });
      }, words);
      const choices = page.locator('.awp-meaning-choices');
      const details = id => choices.locator('details[data-entry-id=' + id + ']');
      const checkbox = id => choices.locator('input[data-entry-id=' + id + ']');
      expect(await details('financial').locator('summary').getAttribute('lang')).toBe('ar');
      await details('financial').locator('summary').focus(); await page.keyboard.press('Enter');
      expect(await checkbox('financial').isChecked()).toBe(true);
      await details('river').locator('summary').focus(); await page.keyboard.press('Space');
      expect(await checkbox('river').isChecked()).toBe(true);
      const body = details('river').locator('.awp-meaning-definition');
      expect(await page.getByRole('region', { name: /Meaning 2: bank/ }).count()).toBe(1);
      await page.keyboard.press('Tab'); expect(await body.evaluate(el => el === document.activeElement)).toBe(true);
      await page.keyboard.press('End');
      await page.waitForFunction(() => { const el = document.activeElement; return el.scrollTop + el.clientHeight >= el.scrollHeight - 2; });
      const scroll = await body.evaluate(el => el.scrollTop);
      await page.getByLabel('Card text style', { exact: true }).evaluate(select => { select.value = 'italic'; select.dispatchEvent(new Event('change', { bubbles: true })); });
      expect(await body.evaluate(el => el === document.activeElement)).toBe(true);
      expect(await body.evaluate(el => el.scrollTop)).toBe(scroll);
      expect(await details('financial').evaluate(el => el.open)).toBe(true);
      expect(await details('river').evaluate(el => el.open)).toBe(true);
      await page.locator('.awp-translation-menu').first().locator('summary').click();
      await page.locator('.awp-translation-menu').first().getByRole('button', { name: 'Deselect All', exact: true }).click();
      expect(await details('river').evaluate(el => el.open)).toBe(true);
      await checkbox('financial').focus(); await page.keyboard.press('Space');
      expect(await checkbox('financial').evaluate(el => el === document.activeElement)).toBe(true);
      expect(await checkbox('financial').isChecked()).toBe(false);
      await page.keyboard.press('Space'); expect(await checkbox('financial').isChecked()).toBe(true);
      await details('arabic').locator('summary').focus(); await page.keyboard.press('Enter');
      const arabic = details('arabic').locator('.awp-meaning-definition');
      expect(await arabic.evaluate(el => [getComputedStyle(el).direction, getComputedStyle(el).textAlign])).toEqual(['rtl', 'start']);
      for (const region of [choices, arabic, page.locator('.awp-dialog')]) expect(await region.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      await arabic.focus(); await page.keyboard.press('End');
      await page.waitForFunction(() => { const el = document.activeElement; return el.scrollTop + el.clientHeight >= el.scrollHeight - 2; });
      if (lane === 'runtime') {
        await details('arabic').screenshot({ path: output + '/meaning-details-rtl-320.png' });
        await page.setViewportSize({ width: 1100, height: 900 }); await page.evaluate(() => { document.documentElement.style.fontSize = '100%'; });
        await choices.evaluate(el => el.scrollIntoView({ block: 'start' }));
        await page.screenshot({ path: output + '/meaning-details-desktop-1100.png' });
      }
      const download = async name => {
        await page.evaluate(() => { window.exported = null; }); await page.getByRole('button', { name, exact: true }).click();
        await page.waitForFunction(() => !!window.exported); if (name === 'Save word set') await page.getByRole('button', { name: 'I saved the file', exact: true }).click(); return page.evaluate(() => exported);
      };
      const saved = JSON.parse(await download('Save word set'));
      expect(saved.items.map(item => [item.id, item.definition]).sort()).toEqual(words.map(item => [item.id, item.definition]).sort());
      expect(saved.options.translationLanguages).toEqual([]);
      await offline.setContent(await download('Download HTML'));
      for (const [index, item] of saved.items.entries()) {
        await offline.getByRole('button', { name: 'إظهار المعنى', exact: true }).click();
        expect(await offline.locator('.awp-stage .awp-definition').textContent()).toBe(item.definition);
        if (index < saved.items.length - 1) await offline.getByRole('button', { name: 'Next', exact: true }).click();
      }
    } finally { await offline.close(); await page.close(); }
  }, 60_000);
});
