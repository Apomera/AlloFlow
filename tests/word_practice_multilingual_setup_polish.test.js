import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { chromium } from 'playwright';

const read = file => readFileSync(file, 'utf8');
const availableLanes = [
  ['source', read('word_practice_core.js') + '\n' + read(process.env.WORD_PRACTICE_UI || 'word_practice_ui.js')],
  ['runtime', read('word_practice_module.js')],
];
const requestedLane = process.env.WORD_PRACTICE_UI_LANE;
if (requestedLane && !availableLanes.some(([lane]) => lane === requestedLane)) throw new Error('Unknown Word Practice UI lane');
const lanes = requestedLane ? availableLanes.filter(([lane]) => lane === requestedLane) : availableLanes;
const output = process.env.WORD_PRACTICE_UI_OUTPUT || 'tmp/card-bidi-polish-20261101/ui';
const windows = [];
let browser;
afterEach(() => { while (windows.length) windows.pop().close(); });
afterAll(async () => { await browser?.close(); }, 60_000);

const english = 'Compare the complete explanation before choosing a meaning. '.repeat(8);
const arabic = 'اقرأ الشرح الكامل للكلمة وقارنه بالجملة قبل اختيار المعنى المناسب. '.repeat(8);
const words = [
  { id: 'financial', word: 'bank', termLanguage: 'English', definitionLanguage: 'English', definition: english + '\nAn organization that keeps money.', translations: { French: 'banque', Arabic: 'مصرف', Nibi: 'Local name' } },
  { id: 'river', word: 'bank', termLanguage: 'French', definitionLanguage: 'Arabic', definition: arabic + '\nالضفة بجانب النهر.', translations: { French: 'rive', Arabic: 'ضفة' } },
  { id: 'eye', word: 'عين', termLanguage: 'Arabic', definitionLanguage: 'English', definition: english + '\nAn eye.' },
  { id: 'spring', word: 'عين', termLanguage: 'Arabic', definitionLanguage: 'Arabic', definition: arabic + '\nنبع ماء.' },
];
const translation = key => ({
  'word_practice.show_meaning': 'إظهار المعنى',
  'universal.translations': 'الترجمات',
}[key] || key);
function load(code, options = {}) {
  const { window } = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only' });
  windows.push(window);
  if (options.numberFormat === 'missing') window.Intl.NumberFormat = undefined;
  if (options.numberFormat === 'english-only') {
    const Real = window.Intl.NumberFormat;
    window.Intl.NumberFormat = class { constructor(locale, options) { if (locale !== 'en') throw new Error('Unavailable locale'); return new Real(locale, options); } };
  }
  window.eval(code);
  window.AlloModules.WordPractice.open({ words, currentUiLanguage: options.locale || 'Arabic', t: options.translatedMarker ? key => key === 'word_practice.meaning_number' ? 'المعنى {n}:' : translation(key) : translation,
    options: { mode: 'vocabulary', shuffle: false, repetitions: 1, includeAudio: false, includePictures: false } });
  return window;
}
const normalizedText = value => value.replace(/\s+/gu, ' ').trim();

describe.each(lanes)('multilingual setup polish (%s)', (lane, code) => {
  it.each([false, true])('separates multilingual headings from excerpts when the meaning marker is translated=%s', translatedMarker => {
    const win = load(code, { translatedMarker }), doc = win.document;
    const fieldset = doc.querySelector('.awp-meaning-choices');
    for (const [index, word] of words.entries()) {
      const checkbox = fieldset.querySelector('input[data-entry-id=' + word.id + ']');
      const label = checkbox.closest('label'), copy = label.querySelector('.awp-meaning-copy');
      const heading = copy.querySelector(':scope > .awp-meaning-heading');
      const marker = heading.querySelector('.awp-meaning-number'), term = heading.querySelector('.awp-meaning-term');
      const excerpt = copy.querySelector(':scope > .awp-meaning-excerpt');
      expect(heading.contains(excerpt)).toBe(false);
      expect([heading.lang, heading.dir, marker.lang, marker.dir]).toEqual(translatedMarker ? ['ar', 'rtl', 'ar', 'rtl'] : ['en', 'ltr', 'en', 'ltr']);
      expect(term.tagName).toBe('BDI'); expect(term.textContent).toBe(word.word);
      expect([term.lang, term.dir]).toEqual(word.termLanguage === 'Arabic' ? ['ar', 'rtl'] : word.termLanguage === 'French' ? ['fr', 'ltr'] : ['en', 'ltr']);
      expect([excerpt.lang, excerpt.dir]).toEqual(word.definitionLanguage === 'Arabic' ? ['ar', 'rtl'] : ['en', 'ltr']);
      expect(normalizedText(copy.textContent)).toContain((translatedMarker ? 'المعنى ' : 'Meaning ') + (index % 2 + 1) + ': ' + word.word);
      expect(copy.textContent.indexOf(word.word)).toBeLessThan(copy.textContent.indexOf(excerpt.textContent));
      const details = fieldset.querySelector('details[data-entry-id=' + word.id + ']');
      expect(details.closest('label')).toBeNull();
      expect(details.querySelector('summary').getAttribute('aria-describedby')).toBe(copy.id);
      expect(details.querySelector('[role=region]').getAttribute('aria-labelledby')).toContain(copy.id);
      expect(checkbox.checked).toBe(true);
    }
    const englishChip = fieldset.querySelector('input[data-entry-id=financial]').closest('label').querySelector('.awp-meaning-language');
    expect(englishChip.textContent).toBe(new Intl.DisplayNames(['ar'], { type: 'language', languageDisplay: 'standard' }).of('en'));
    expect([englishChip.lang, englishChip.dir]).toEqual(['ar', 'rtl']);
  });

  it.each(['Arabic', 'Nibi'])('localizes counters and keeps reorder announcement language metadata in %s UI', locale => {
    const win = load(code, { locale }), doc = win.document, menu = doc.querySelector('.awp-translation-menu');
    const numericLocale = locale === 'Arabic' ? 'ar' : 'en', number = new Intl.NumberFormat(numericLocale);
    const count = menu.querySelector('summary bdi');
    expect(count.textContent).toBe(' · ' + number.format(3) + '/' + number.format(3));
    expect([count.lang, count.dir]).toEqual([numericLocale, 'ltr']);
    const key = locale === 'Arabic' ? 'nibi' : 'fr', direction = locale === 'Arabic' ? 'up' : 'down';
    const row = menu.querySelector('[data-key=' + key + ']'), name = row.querySelector('label span');
    const original = [name.textContent, name.lang, name.dir];
    row.querySelector('button[data-action=' + direction + ']').focus();
    row.querySelector('button[data-action=' + direction + ']').click();
    const status = menu.querySelector('[role=status]');
    expect(status.firstElementChild.textContent).toBe(original[0]);
    expect([status.firstElementChild.lang, status.firstElementChild.dir]).toEqual(original.slice(1));
    expect([status.querySelector('bdi').lang, status.querySelector('bdi').dir]).toEqual([numericLocale, 'ltr']);
    expect(status.querySelector('bdi').textContent).toBe(number.format(2) + '/' + number.format(3));
    expect([doc.activeElement.closest('.awp-translation-row').dataset.key, doc.activeElement.dataset.action]).toEqual([key, direction]);
    expect([...menu.querySelectorAll('.awp-translation-row')].slice(0, 3).map(row => row.dataset.key)).toEqual(locale === 'Arabic' ? ['fr', 'nibi', 'ar'] : ['ar', 'fr', 'nibi']);
  });

  it.each(['missing', 'english-only'])('uses deterministic English counter fallback when number formatting is %s', numberFormat => {
    const win = load(code, { numberFormat }), menu = win.document.querySelector('.awp-translation-menu');
    expect(menu.querySelector('summary bdi').textContent).toBe(' · 3/3');
    expect(menu.querySelector('summary bdi').lang).toBe('en');
    menu.querySelector('[data-key=nibi] button[data-action=up]').click();
    const status = menu.querySelector('[role=status]');
    expect(status.firstElementChild.lang).toBe('und'); expect(status.firstElementChild.dir).toBe('auto');
    expect(status.querySelector('bdi').textContent).toBe('2/3'); expect(status.querySelector('bdi').lang).toBe('en');
  });

  it('retains keyboard selection, disclosures and reading position through typography and language changes at desktop and320px/200percent', async () => {
    browser ||= await chromium.launch({ headless: true }); mkdirSync(output, { recursive: true });
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
    const browserWords = words.map(word => word.id === 'river' ? { ...word, termLanguage: 'CommunityLanguage' + 'x'.repeat(60) } : word);
    try {
      await page.setContent('<!doctype html><html><body></body></html>'); await page.addScriptTag({ content: code });
      await page.evaluate(words => {
        URL.createObjectURL = blob => { window.lastDownload = blob.text(); return 'blob:polish'; };
        HTMLAnchorElement.prototype.click = () => {};
        AlloModules.WordPractice.open({ words, currentUiLanguage: 'Arabic', t: key => key === 'word_practice.show_meaning' ? 'إظهار المعنى' : key,
          options: { mode: 'vocabulary', shuffle: false, repetitions: 1, includeAudio: false, includePictures: false } });
      }, browserWords);
      const choices = page.locator('.awp-meaning-choices'), detail = id => choices.locator('details[data-entry-id=' + id + ']');
      const checkbox = id => choices.locator('input[data-entry-id=' + id + ']');
      const firstHeading = checkbox('financial').locator('..').locator('.awp-meaning-heading');
      const headingRect = await firstHeading.evaluate(heading => {
        const marker = heading.querySelector('.awp-meaning-number'), term = heading.querySelector('.awp-meaning-term');
        return { direction: getComputedStyle(heading).direction, markerLeft: marker.getBoundingClientRect().left, termLeft: term.getBoundingClientRect().left, isolated: getComputedStyle(term).unicodeBidi };
      });
      expect(headingRect.direction).toBe('ltr'); expect(headingRect.markerLeft).toBeLessThan(headingRect.termLeft); expect(headingRect.isolated).toBe('isolate');
      for (const id of ['financial', 'river']) { await detail(id).locator('summary').focus(); await page.keyboard.press('Enter'); }
      expect(await checkbox('river').isChecked()).toBe(true);
      for (const [id, direction] of [['financial', 'ltr'], ['river', 'rtl']]) {
        const excerpt = checkbox(id).locator('..').locator('.awp-meaning-excerpt');
        expect(await excerpt.evaluate(element => [getComputedStyle(element).direction, getComputedStyle(element).textAlign])).toEqual([direction, 'start']);
      }
      await choices.evaluate(element => element.scrollIntoView({ block: 'start' }));
      await page.screenshot({ path: output + '/' + lane + '-meaning-labels-desktop.png' });
      await firstHeading.screenshot({ path: output + '/' + lane + '-meaning-heading-desktop.png' });
      await page.setViewportSize({ width: 320, height: 900 }); await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      const body = detail('river').locator('.awp-meaning-definition'); await body.focus(); await page.keyboard.press('End');
      await page.waitForFunction(() => { const node = document.activeElement; return node.scrollTop + node.clientHeight >= node.scrollHeight - 2; });
      const scroll = await body.evaluate(element => element.scrollTop);
      await page.getByLabel('Card text style', { exact: true }).evaluate(select => { select.value = 'bold-italic'; select.dispatchEvent(new Event('change', { bubbles: true })); });
      expect(await body.evaluate(element => element === document.activeElement)).toBe(true);
      expect(await body.evaluate(element => element.scrollTop)).toBe(scroll);
      await page.getByLabel('Card font', { exact: true }).evaluate(select => { select.value = 'georgia'; select.dispatchEvent(new Event('change', { bubbles: true })); });
      const translations = page.locator('.awp-translation-menu'); await translations.locator('summary').click();
      await translations.getByRole('button', { name: 'Deselect All', exact: true }).click();
      expect(await detail('river').evaluate(element => element.open)).toBe(true);
      await translations.getByRole('button', { name: 'All languages', exact: true }).click();
      await checkbox('financial').focus(); await page.keyboard.press('Space'); expect(await checkbox('financial').isChecked()).toBe(false);
      await page.keyboard.press('Space'); expect(await checkbox('financial').isChecked()).toBe(true);
      expect(await checkbox('financial').evaluate(element => element === document.activeElement)).toBe(true);
      const fits = await choices.evaluate(element => ({ scroll: element.scrollWidth, client: element.clientWidth }));
      expect(fits.scroll).toBeLessThanOrEqual(fits.client + 1);
      expect(await page.locator('.awp-dialog').evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
      const longLanguage = checkbox('river').locator('..').locator('.awp-meaning-language');
      expect(await longLanguage.textContent()).toBe(browserWords[1].termLanguage);
      expect(await longLanguage.getAttribute('lang')).toBe('und');
      expect(await longLanguage.evaluate(element => ({ contained: element.getBoundingClientRect().width <= element.parentElement.clientWidth + 1, noOverflow: element.scrollWidth <= element.clientWidth + 1, boxSizing: getComputedStyle(element).boxSizing }))).toEqual({ contained: true, noOverflow: true, boxSizing: 'border-box' });
      await checkbox('financial').locator('..').scrollIntoViewIfNeeded();
      await page.screenshot({ path: output + '/' + lane + '-meaning-labels-320.png' });
      await page.getByRole('button', { name: 'Save word set', exact: true }).click();
      await page.waitForFunction(() => !!window.lastDownload);
      const saved = JSON.parse(await page.evaluate(() => lastDownload));
      expect(saved.items.map(item => [item.id, item.word, item.termLanguage, item.definitionLanguage, item.definition]).sort()).toEqual(browserWords.map(item => [item.id, item.word, item.termLanguage, item.definitionLanguage, item.definition]).sort());
      expect(saved.items.find(item => item.id === 'financial').translations).toEqual([{ language: 'French', text: 'banque' }, { language: 'Arabic', text: 'مصرف' }, { language: 'Nibi', text: 'Local name' }]);
      expect(saved.options.cardFont).toBe('georgia'); expect(saved.options.cardTextStyle).toBe('bold-italic'); expect(saved.options.translationLanguages).toBeNull();
      writeFileSync(output + '/' + lane + '-saved-values.json', JSON.stringify({ items: saved.items.map(item => ({ id: item.id, word: item.word, termLanguage: item.termLanguage, definitionLanguage: item.definitionLanguage, definition: item.definition, translations: item.translations })), options: saved.options, layout: fits }, null, 2));
    } finally { await page.close(); }
  }, 60_000);
});
