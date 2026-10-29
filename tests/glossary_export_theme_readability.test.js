import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

let browser, pipeline;
const glossary = { type: 'glossary', id: 'theme-glossary', title: 'Science vocabulary', data: [
  { term: 'Photosynthesis', def: 'Plants use sunlight to make food.', translations: { Spanish: 'Fotosíntesis: Las plantas usan luz para producir alimento.', Arabic: 'التمثيل الضوئي: تستخدم النباتات الضوء لصنع الغذاء.' } },
  { term: 'PhotosynthesisAndCellularRespiration', def: 'Two processes move energy through ecosystems.', translations: { Spanish: 'Fotosíntesis y respiración celular' } },
] };
const ratios = async (page, selector, pseudo) => page.locator(selector).evaluateAll((elements, pseudo) => {
  const rgb = s => s.match(/[\d.]+/g).slice(0, 3).map(Number);
  const lum = c => c.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  return elements.filter(el => el.getBoundingClientRect().width && getComputedStyle(el).visibility !== 'hidden').map(el => {
    let node = el, background = 'rgb(255,255,255)';
    while (node) {
      const color = getComputedStyle(node).backgroundColor;
      if (color !== 'transparent' && color !== 'rgba(0, 0, 0, 0)') { background = color; break; }
      node = node.parentElement;
    }
    const style = getComputedStyle(el, pseudo || null), foreground = style.color;
    const a = lum(rgb(foreground)), b = lum(rgb(background));
    return { text: el.textContent.trim().slice(0, 60), foreground, background, ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
  });
}, pseudo);

function expectReadable(samples, context) {
  expect(samples.length, context + ': content rendered').toBeGreaterThan(0);
  expect(samples.filter(sample => sample.ratio < 4.5), context).toEqual([]);
}
async function openExport(mode) {
  const page = await browser.newPage({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' });
  await page.route('**/*', route => route.abort());
  await page.setContent(pipeline.generateFullPackHTML([glossary], 'Science words', false, {}, {
    includeGlossary: true, includeTeacherKey: false, glossaryDisplayMode: mode, annotations: [],
  }), { waitUntil: 'domcontentloaded' });
  const once = page.getByRole('button', { name: 'Use once without autosave' });
  if (await once.isVisible()) await once.click();
  return page;
}
async function switchTheme(page, theme) {
  // Run the real theme handler, including inkGuard. Attribute-only tests miss
  // the stale ink left when a reader switches from Dark to Sepia.
  await page.locator('[data-rt-theme="' + theme + '"]').evaluate(button => button.click());
  await page.mouse.move(0, 0);
  await page.waitForTimeout(400);
}

beforeAll(async () => {
  new Function(readFileSync(process.env.ALLO_DOC_PIPELINE_CANDIDATE || 'doc_pipeline_module.js', 'utf8'))();
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
    addToast: () => {}, t: key => key, isRtlLang: lang => lang === 'Arabic', updateExportPreview: () => {},
    getDefaultTitle: () => 'Vocabulary', state: {},
  });
  browser = await chromium.launch({ headless: true });
}, 60_000);
afterAll(async () => { await browser?.close(); }, 90_000);

describe('glossary export reading themes', () => {
  it.each(['flash-cards', 'language-cards'])('%s retain readable terms, answers and controls through theme changes and print', async mode => {
    const page = await openExport(mode);
    try {
      await page.locator('.alloflow-glossary-show-all').click();
      for (const theme of ['dark', 'sepia', 'hc', 'dark', 'light']) {
        await switchTheme(page, theme);
        expectReadable(await ratios(page, '.alloflow-glossary-card-front strong span, .alloflow-glossary-card-back span, .alloflow-glossary-card-back strong, .alloflow-glossary-card-fold, .alloflow-glossary-show-all, .alloflow-glossary-hide-all, .alloflow-glossary-shuffle'), mode + ': ' + theme);
      }
      await switchTheme(page, 'dark');
      await page.evaluate(() => { document.getElementById('main-export-content').style.fontSize = '1.75em'; });
      const overflow = await page.locator('.alloflow-glossary-card-front, .alloflow-glossary-card-back').evaluateAll(elements => elements.filter(el => el.scrollWidth > el.clientWidth + 1).map(el => el.textContent));
      expect(overflow).toEqual([]);
      await page.emulateMedia({ media: 'print' });
      expectReadable(await ratios(page, '.alloflow-glossary-card-front strong span, .alloflow-glossary-card-back span'), mode + ': print from dark');
    } finally { await page.close(); }
  }, 90_000);

  it('dark stacked labels and hovered desktop terms remain readable', async () => {
    const page = await openExport('table');
    try {
      await switchTheme(page, 'dark');
      expectReadable(await ratios(page, '[data-gloss-label]', '::before'), 'dark stacked labels');
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.locator('.alloflow-glossary-section tbody tr').first().hover();
      await page.waitForTimeout(200);
      expectReadable(await ratios(page, '.alloflow-glossary-section tbody tr:first-child .gloss-term'), 'dark hovered term');
      await page.emulateMedia({ media: 'print' });
      expectReadable(await ratios(page, '.alloflow-glossary-section .gloss-term'), 'table print from dark');
    } finally { await page.close(); }
  }, 60_000);
});
